/**
 * Omnichannel Inbox Service - Unified OmnichannelConversation Management
 *
 * This service provides a high-level API for managing omnichannel conversations
 * across email, WhatsApp, SMS, live chat, and social media channels.
 *
 * Features:
 * - Unified inbox with advanced filtering
 * - Intelligent conversation routing
 * - SLA tracking and management
 * - Real-time updates via WebSocket
 * - OmnichannelConversation assignment and team management
 * - Snooze and priority management
 * - Comprehensive statistics and analytics
 */

const mongoose = require('mongoose');
const OmnichannelConversation = require('../models/omnichannelConversation.model');
const AuditLogService = require('./auditLog.service');
const { getIO } = require('../configs/socket');

/**
 * Escape special regex characters to prevent ReDoS attacks
 */
const escapeRegex = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
const logger = require('../utils/logger');

class OmnichannelInboxService {
  /**
   * Get unified inbox with filters
   * @param {Object} firmQuery - Firm isolation query (e.g., { firmId: X } or { lawyerId: Y })
   * @param {String|ObjectId} agentId - Agent/User ID (optional)
   * @param {Object} filters - Filter options
   * @param {String|Array} filters.assignedTo - Filter by assigned user(s)
   * @param {String|Array} filters.channels - Filter by channel(s)
   * @param {String|Array} filters.priority - Filter by priority level(s)
   * @param {String|Array} filters.status - Filter by status(es)
   * @param {String} filters.search - Search in messages content
   * @param {String} filters.contactId - Filter by specific contact
   * @param {String} filters.team - Filter by team
   * @param {Array} filters.tags - Filter by tags
   * @param {Number} filters.page - Page number (default: 1)
   * @param {Number} filters.limit - Items per page (default: 20)
   * @returns {Promise<Object>} - Paginated conversations with metadata
   */
  async getUnifiedInbox(firmQuery, agentId = null, filters = {}) {
    try {
      // Build query with firm isolation (supports both firm members and solo lawyers)
      const query = { ...firmQuery };

      // Apply agent filter if provided
      if (agentId) {
        query.assignedTo = new mongoose.Types.ObjectId(agentId);
      }

      // Apply status filter
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query.status = { $in: filters.status };
        } else {
          query.status = filters.status;
        }
      }

      // Apply channel filter
      if (filters.channels) {
        if (Array.isArray(filters.channels)) {
          query.channel = { $in: filters.channels };
        } else {
          query.channel = filters.channels;
        }
      }

      // Apply priority filter
      if (filters.priority) {
        if (Array.isArray(filters.priority)) {
          query.priority = { $in: filters.priority };
        } else {
          query.priority = filters.priority;
        }
      }

      // Apply assignedTo filter
      if (filters.assignedTo) {
        if (Array.isArray(filters.assignedTo)) {
          query.assignedTo = { $in: filters.assignedTo.map(id => new mongoose.Types.ObjectId(id)) };
        } else if (filters.assignedTo === 'unassigned') {
          query.assignedTo = null;
        } else {
          query.assignedTo = new mongoose.Types.ObjectId(filters.assignedTo);
        }
      }

      // Apply contact filter
      if (filters.contactId) {
        query.contactId = new mongoose.Types.ObjectId(filters.contactId);
      }

      // Apply team filter
      if (filters.team) {
        query.team = new mongoose.Types.ObjectId(filters.team);
      }

      // Apply tags filter
      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      // Apply search filter (search in message content)
      if (filters.search) {
        query['messages.content'] = { $regex: escapeRegex(filters.search), $options: 'i' };
      }

      // Pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const skip = (page - 1) * limit;

      // Execute query with population
      const [conversations, total] = await Promise.all([
        OmnichannelConversation.find(query)
          .populate('contactId', 'firstName lastName email phone avatar')
          .populate('assignedTo', 'firstName lastName email avatar')
          .sort({ lastMessageAt: -1 })
          .limit(limit)
          .skip(skip)
          .lean(),
        OmnichannelConversation.countDocuments(query)
      ]);

      return {
        conversations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('OmnichannelInboxService.getUnifiedInbox failed:', error.message);
      throw error;
    }
  }

  /**
   * Route conversation based on routing rules
   * @param {String|ObjectId} conversationId - OmnichannelConversation ID
   * @param {String|ObjectId} firmId - Firm ID for IDOR protection
   * @param {Object} rules - Routing rules configuration
   * @param {Object} rules.conditions - Conditions to match (channel, customer tier, language, keywords)
   * @param {Object} rules.action - Routing action (assign to user, team, or queue)
   * @returns {Promise<Object>} - Updated conversation
   */
  async routeOmnichannelConversation(conversationId, firmId, rules) {
    try {
      const conversation = await OmnichannelConversation.findOne({
        _id: conversationId,
        firmId: new mongoose.Types.ObjectId(firmId)
      });

      if (!conversation) {
        throw new Error('OmnichannelConversation not found');
      }

      // Match conditions
      let shouldRoute = true;

      // Check channel condition
      if (rules.conditions?.channel && rules.conditions.channel !== conversation.channel) {
        shouldRoute = false;
      }

      // Check keywords in messages
      if (rules.conditions?.keywords && rules.conditions.keywords.length > 0) {
        const hasKeyword = conversation.messages.some(msg =>
          rules.conditions.keywords.some(keyword =>
            msg.content.toLowerCase().includes(keyword.toLowerCase())
          )
        );
        if (!hasKeyword) {
          shouldRoute = false;
        }
      }

      // Apply routing action if conditions match
      if (shouldRoute && rules.action) {
        if (rules.action.assignTo) {
          conversation.assignedTo = new mongoose.Types.ObjectId(rules.action.assignTo);
        }

        if (rules.action.team) {
          conversation.team = new mongoose.Types.ObjectId(rules.action.team);
        }

        if (rules.action.priority) {
          conversation.priority = rules.action.priority;
        }

        await conversation.save();

        // Log routing action
        await AuditLogService.log(
          'route_conversation',
          'conversation',
          conversationId.toString(),
          {
            before: { assignedTo: conversation.assignedTo },
            after: { assignedTo: rules.action.assignTo }
          },
          {
            firmId: conversation.firmId,
            details: { rules, matched: shouldRoute }
          }
        );

        // Broadcast update
        this._broadcastOmnichannelConversationUpdate(conversationId, {
          type: 'routed',
          assignedTo: conversation.assignedTo,
          team: conversation.team
        });
      }

      return conversation;
    } catch (error) {
      logger.error('OmnichannelInboxService.routeOmnichannelConversation failed:', error.message);
      throw error;
    }
  }

  /**
   * Get conversation with full history
   * @param {String|ObjectId} conversationId - OmnichannelConversation ID
   * @param {Object} firmQuery - Firm isolation query (e.g., { firmId: X } or { lawyerId: Y })
   * @param {String|ObjectId} viewingAgentId - Agent viewing the conversation (optional)
   * @returns {Promise<Object>} - OmnichannelConversation with messages
   */
  async getOmnichannelConversation(conversationId, firmQuery, viewingAgentId = null) {
    try {
      const conversation = await OmnichannelConversation.findOne({
        _id: conversationId,
        ...firmQuery
      })
        .populate('contactId', 'firstName lastName email phone avatar')
        .populate('assignedTo', 'firstName lastName email avatar')
        .populate('messages.sentBy', 'firstName lastName email avatar')
        .lean();

      if (!conversation) {
        throw new Error('OmnichannelConversation not found');
      }

      // Mark messages as read for viewing agent
      if (viewingAgentId) {
        await this._markMessagesAsRead(conversationId, viewingAgentId);
      }

      return conversation;
    } catch (error) {
      logger.error('OmnichannelInboxService.getOmnichannelConversation failed:', error.message);
      throw error;
    }
  }

  /**
   * Add message to conversation
   * @param {String|ObjectId} conversationId - OmnichannelConversation ID
   * @param {Object} firmQuery - Firm isolation query (e.g., { firmId: X } or { lawyerId: Y })
   * @param {Object} messageData - Message data
   * @param {String} messageData.content - Message content
   * @param {String} messageData.direction - 'inbound' or 'outbound'
   * @param {String} messageData.contentType - 'text', 'html', or 'attachment'
   * @param {Array} messageData.attachments - Attachments array
   * @param {String|ObjectId} userId - User ID (for outbound messages)
   * @returns {Promise<Object>} - Updated conversation with new message
   */
  async addMessage(conversationId, firmQuery, messageData, userId = null) {
    try {
      const conversation = await OmnichannelConversation.findOne({
        _id: conversationId,
        ...firmQuery
      });

      if (!conversation) {
        throw new Error('OmnichannelConversation not found');
      }

      // Prepare message object
      const message = {
        direction: messageData.direction,
        content: messageData.content,
        contentType: messageData.contentType || 'text',
        attachments: messageData.attachments || [],
        sentAt: new Date(),
        sentBy: userId ? new mongoose.Types.ObjectId(userId) : null,
        metadata: messageData.metadata || {}
      };

      // Add message using model method
      conversation.addMessage(message);

      // Check if this is the first response for SLA tracking
      if (messageData.direction === 'outbound' && !conversation.firstResponseAt) {
        conversation.firstResponseAt = new Date();
      }

      // Save conversation
      await conversation.save();

      // Log activity
      await AuditLogService.log(
        'add_message',
        'conversation',
        conversationId.toString(),
        null,
        {
          firmId: conversation.firmId,
          userId: userId,
          details: {
            direction: messageData.direction,
            contentType: messageData.contentType
          }
        }
      );

      // Broadcast to WebSocket
      this._broadcastOmnichannelConversationUpdate(conversationId, {
        type: 'new_message',
        message: message,
        conversationId: conversationId
      });

      return conversation;
    } catch (error) {
      logger.error('OmnichannelInboxService.addMessage failed:', error.message);
      throw error;
    }
  }

  /**
   * Assign conversation to a user
   * @param {String|ObjectId} conversationId - OmnichannelConversation ID
   * @param {Object} firmQuery - Firm isolation query (e.g., { firmId: X } or { lawyerId: Y })
   * @param {String|ObjectId} assigneeId - User ID to assign to
   * @param {String|ObjectId} assignedBy - User ID who is assigning
   * @returns {Promise<Object>} - Updated conversation
   */
  async assignOmnichannelConversation(conversationId, firmQuery, assigneeId, assignedBy) {
    try {
      const conversation = await OmnichannelConversation.findOne({
        _id: conversationId,
        ...firmQuery
      });

      if (!conversation) {
        throw new Error('OmnichannelConversation not found');
      }

      const previousAssignee = conversation.assignedTo;

      // Update assignment
      conversation.assignedTo = assigneeId ? new mongoose.Types.ObjectId(assigneeId) : null;
      await conversation.save();

      // Log activity
      await AuditLogService.log(
        'assign_conversation',
        'conversation',
        conversationId.toString(),
        {
          before: { assignedTo: previousAssignee },
          after: { assignedTo: assigneeId }
        },
        {
          firmId: conversation.firmId,
          userId: assignedBy,
          details: {
            previousAssignee: previousAssignee?.toString(),
            newAssignee: assigneeId?.toString()
          }
        }
      );

      // Broadcast update
      this._broadcastOmnichannelConversationUpdate(conversationId, {
        type: 'assigned',
        assignedTo: conversation.assignedTo,
        assignedBy: assignedBy
      });

      // TODO: Notify assignee via notification service
      // NotificationService.notifyAssignment(assigneeId, conversationId);

      return conversation;
    } catch (error) {
      logger.error('OmnichannelInboxService.assignOmnichannelConversation failed:', error.message);
      throw error;
    }
  }

  /**
   * Snooze conversation until a specific date
   * @param {String|ObjectId} conversationId - OmnichannelConversation ID
   * @param {Object} firmQuery - Firm isolation query (e.g., { firmId: X } or { lawyerId: Y })
   * @param {Date} until - Date to snooze until
   * @param {String|ObjectId} userId - User ID who is snoozing
   * @returns {Promise<Object>} - Updated conversation
   */
  async snoozeOmnichannelConversation(conversationId, firmQuery, until, userId) {
    try {
      const conversation = await OmnichannelConversation.findOne({
        _id: conversationId,
        ...firmQuery
      });

      if (!conversation) {
        throw new Error('OmnichannelConversation not found');
      }

      // Set snooze
      conversation.snooze(new Date(until));
      await conversation.save();

      // Log activity
      await AuditLogService.log(
        'snooze_conversation',
        'conversation',
        conversationId.toString(),
        {
          before: { status: 'open', snoozeUntil: null },
          after: { status: 'snoozed', snoozeUntil: until }
        },
        {
          firmId: conversation.firmId,
          userId: userId,
          details: { snoozeUntil: until }
        }
      );

      // Broadcast update
      this._broadcastOmnichannelConversationUpdate(conversationId, {
        type: 'snoozed',
        snoozeUntil: until,
        status: 'snoozed'
      });

      // TODO: Schedule wake-up job
      // QueueService.scheduleWakeUp(conversationId, until);

      return conversation;
    } catch (error) {
      logger.error('OmnichannelInboxService.snoozeOmnichannelConversation failed:', error.message);
      throw error;
    }
  }

  /**
   * Close conversation
   * @param {String|ObjectId} conversationId - OmnichannelConversation ID
   * @param {Object} firmQuery - Firm isolation query (e.g., { firmId: X } or { lawyerId: Y })
   * @param {String|ObjectId} userId - User ID who is closing
   * @param {Object} resolution - Resolution details (optional)
   * @returns {Promise<Object>} - Updated conversation
   */
  async closeOmnichannelConversation(conversationId, firmQuery, userId, resolution = {}) {
    try {
      const conversation = await OmnichannelConversation.findOne({
        _id: conversationId,
        ...firmQuery
      });

      if (!conversation) {
        throw new Error('OmnichannelConversation not found');
      }

      // Close conversation
      conversation.close();

      // Store resolution details in custom fields
      if (resolution) {
        conversation.customFields = {
          ...conversation.customFields,
          resolution: {
            ...resolution,
            closedBy: userId,
            closedAt: new Date()
          }
        };
      }

      await conversation.save();

      // Log activity
      await AuditLogService.log(
        'close_conversation',
        'conversation',
        conversationId.toString(),
        {
          before: { status: conversation.status },
          after: { status: 'closed' }
        },
        {
          firmId: conversation.firmId,
          userId: userId,
          details: { resolution }
        }
      );

      // Broadcast update
      this._broadcastOmnichannelConversationUpdate(conversationId, {
        type: 'closed',
        status: 'closed',
        resolution
      });

      // TODO: Update SLA if applicable
      // SLAService.updateSLA(conversation.slaInstanceId, { closedAt: new Date() });

      return conversation;
    } catch (error) {
      logger.error('OmnichannelInboxService.closeOmnichannelConversation failed:', error.message);
      throw error;
    }
  }

  /**
   * Reopen a closed conversation
   * @param {String|ObjectId} conversationId - OmnichannelConversation ID
   * @param {Object} firmQuery - Firm isolation query (e.g., { firmId: X } or { lawyerId: Y })
   * @param {String|ObjectId} userId - User ID who is reopening
   * @returns {Promise<Object>} - Updated conversation
   */
  async reopenOmnichannelConversation(conversationId, firmQuery, userId) {
    try {
      const conversation = await OmnichannelConversation.findOne({
        _id: conversationId,
        ...firmQuery
      });

      if (!conversation) {
        throw new Error('OmnichannelConversation not found');
      }

      // Reopen conversation
      conversation.reopen();
      await conversation.save();

      // Log activity
      await AuditLogService.log(
        'reopen_conversation',
        'conversation',
        conversationId.toString(),
        {
          before: { status: 'closed' },
          after: { status: 'open' }
        },
        {
          firmId: conversation.firmId,
          userId: userId,
          details: { reopenedAt: new Date() }
        }
      );

      // Broadcast update
      this._broadcastOmnichannelConversationUpdate(conversationId, {
        type: 'reopened',
        status: 'open'
      });

      return conversation;
    } catch (error) {
      logger.error('OmnichannelInboxService.reopenOmnichannelConversation failed:', error.message);
      throw error;
    }
  }

  /**
   * Get conversation statistics for dashboard
   * @param {Object} firmQuery - Firm isolation query (e.g., { firmId: X } or { lawyerId: Y })
   * @param {String|ObjectId} agentId - Agent ID (optional, for agent-specific stats)
   * @returns {Promise<Object>} - OmnichannelConversation statistics
   */
  async getStats(firmQuery, agentId = null) {
    try {
      const matchQuery = { ...firmQuery };

      if (agentId) {
        matchQuery.assignedTo = new mongoose.Types.ObjectId(agentId);
      }

      // Get counts by status
      const statusCounts = await OmnichannelConversation.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // Get counts by channel
      const channelCounts = await OmnichannelConversation.aggregate([
        { $match: { ...matchQuery, status: 'open' } },
        {
          $group: {
            _id: '$channel',
            count: { $sum: 1 }
          }
        }
      ]);

      // Get counts by priority
      const priorityCounts = await OmnichannelConversation.aggregate([
        { $match: { ...matchQuery, status: 'open' } },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        }
      ]);

      // Calculate average response time (in minutes)
      const avgResponseTimeResult = await OmnichannelConversation.aggregate([
        {
          $match: {
            ...matchQuery,
            firstResponseAt: { $exists: true },
            createdAt: { $exists: true }
          }
        },
        {
          $project: {
            responseTime: {
              $divide: [
                { $subtract: ['$firstResponseAt', '$createdAt'] },
                60000 // Convert to minutes
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgResponseTime: { $avg: '$responseTime' }
          }
        }
      ]);

      // Get unassigned count
      const unassignedCount = await OmnichannelConversation.countDocuments({
        ...matchQuery,
        assignedTo: null,
        status: 'open'
      });

      // Format response
      const stats = {
        byStatus: statusCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, { open: 0, snoozed: 0, closed: 0 }),
        byChannel: channelCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byPriority: priorityCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, { urgent: 0, high: 0, normal: 0, low: 0 }),
        avgResponseTime: avgResponseTimeResult[0]?.avgResponseTime || 0,
        unassignedCount,
        totalOpen: statusCounts.find(s => s._id === 'open')?.count || 0
      };

      return stats;
    } catch (error) {
      logger.error('OmnichannelInboxService.getStats failed:', error.message);
      throw error;
    }
  }

  /**
   * Find or create conversation for incoming message
   * @param {String|ObjectId} firmId - Firm ID
   * @param {String|ObjectId} contactId - Contact ID
   * @param {String} channel - Channel type
   * @param {String} channelIdentifier - Channel-specific identifier
   * @returns {Promise<Object>} - OmnichannelConversation (existing or newly created)
   */
  async findOrCreateOmnichannelConversation(firmId, contactId, channel, channelIdentifier) {
    try {
      // Use the model's static method
      const conversation = await OmnichannelConversation.findOrCreate({
        firmId: new mongoose.Types.ObjectId(firmId),
        contactId: new mongoose.Types.ObjectId(contactId),
        channel,
        channelIdentifier
      });

      // Log if new conversation was created
      if (conversation.messages.length === 0) {
        await AuditLogService.log(
          'create_conversation',
          'conversation',
          conversation._id.toString(),
          null,
          {
            firmId: firmId,
            details: {
              contactId: contactId,
              channel,
              channelIdentifier
            }
          }
        );
      }

      return conversation;
    } catch (error) {
      logger.error('OmnichannelInboxService.findOrCreateOmnichannelConversation failed:', error.message);
      throw error;
    }
  }

  /**
   * Update conversation tags
   * @param {String|ObjectId} conversationId - OmnichannelConversation ID
   * @param {Object} firmQuery - Firm query object for multi-tenant isolation (firmId or lawyerId)
   * @param {Array<String>} tags - Array of tags
   * @param {String|ObjectId} userId - User ID
   * @returns {Promise<Object>} - Updated conversation
   */
  async updateTags(conversationId, firmQuery, tags, userId) {
    try {
      const conversation = await OmnichannelConversation.findOne({
        _id: conversationId,
        ...firmQuery
      });

      if (!conversation) {
        throw new Error('OmnichannelConversation not found');
      }

      const previousTags = conversation.tags || [];
      conversation.tags = tags;
      await conversation.save();

      // Log activity
      await AuditLogService.log(
        'update_conversation_tags',
        'conversation',
        conversationId.toString(),
        {
          before: { tags: previousTags },
          after: { tags }
        },
        {
          firmId: conversation.firmId,
          userId: userId,
          details: { tags }
        }
      );

      // Broadcast update
      this._broadcastOmnichannelConversationUpdate(conversationId, {
        type: 'tags_updated',
        tags
      });

      return conversation;
    } catch (error) {
      logger.error('OmnichannelInboxService.updateTags failed:', error.message);
      throw error;
    }
  }

  /**
   * Update conversation priority
   * @param {String|ObjectId} conversationId - OmnichannelConversation ID
   * @param {Object} firmQuery - Firm query object for multi-tenant isolation (firmId or lawyerId)
   * @param {String} priority - Priority level ('urgent', 'high', 'normal', 'low')
   * @param {String|ObjectId} userId - User ID
   * @returns {Promise<Object>} - Updated conversation
   */
  async updatePriority(conversationId, firmQuery, priority, userId) {
    try {
      const conversation = await OmnichannelConversation.findOne({
        _id: conversationId,
        ...firmQuery
      });

      if (!conversation) {
        throw new Error('OmnichannelConversation not found');
      }

      const previousPriority = conversation.priority;
      conversation.priority = priority;
      await conversation.save();

      // Log activity
      await AuditLogService.log(
        'update_conversation_priority',
        'conversation',
        conversationId.toString(),
        {
          before: { priority: previousPriority },
          after: { priority }
        },
        {
          firmId: conversation.firmId,
          userId: userId,
          details: { priority }
        }
      );

      // Broadcast update
      this._broadcastOmnichannelConversationUpdate(conversationId, {
        type: 'priority_updated',
        priority
      });

      return conversation;
    } catch (error) {
      logger.error('OmnichannelInboxService.updatePriority failed:', error.message);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Mark messages as read for a specific user
   * @private
   * @param {String|ObjectId} conversationId - OmnichannelConversation ID
   * @param {String|ObjectId} userId - User ID
   */
  async _markMessagesAsRead(conversationId, userId) {
    try {
      const now = new Date();

      // Update all unread messages in the conversation
      await OmnichannelConversation.updateOne(
        { _id: conversationId },
        {
          $set: {
            'messages.$[elem].readAt': now
          }
        },
        {
          arrayFilters: [
            {
              'elem.readAt': null,
              'elem.direction': 'inbound'
            }
          ]
        }
      );
    } catch (error) {
      logger.error('OmnichannelInboxService._markMessagesAsRead failed:', error.message);
      // Don't throw - marking as read is not critical
    }
  }

  /**
   * Broadcast conversation update via WebSocket
   * @private
   * @param {String|ObjectId} conversationId - OmnichannelConversation ID
   * @param {Object} updateData - Update data to broadcast
   */
  _broadcastOmnichannelConversationUpdate(conversationId, updateData) {
    try {
      const io = getIO();

      if (!io) {
        logger.warn('Socket.io instance not available for broadcasting');
        return;
      }

      const roomId = `conversation:${conversationId}`;

      io.to(roomId).emit('conversation:updated', {
        conversationId: conversationId.toString(),
        ...updateData,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('OmnichannelInboxService._broadcastOmnichannelConversationUpdate failed:', error.message);
      // Don't throw - broadcasting failure shouldn't break the operation
    }
  }
}

// Export singleton instance
module.exports = new OmnichannelInboxService();
