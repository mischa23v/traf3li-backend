/**
 * Thread Message Service - Odoo-style Message/Chatter System
 *
 * This service provides a high-level API for creating and querying thread messages.
 * It implements an Odoo-inspired messaging system with support for @mentions,
 * field tracking, activity logging, and stage transitions.
 *
 * Features:
 * - Post messages and internal notes
 * - Field change tracking with before/after values
 * - Stage transition logging
 * - Activity completion tracking
 * - @mention notifications
 * - Message starring
 * - Full-text search
 */

const mongoose = require('mongoose');

// Note: Assumes ThreadMessage model exists at ../models/threadMessage.model.js
// If not, this import will need to be adjusted based on your actual model location
let ThreadMessage;
try {
  ThreadMessage = require('../models/threadMessage.model');
} catch (error) {
  console.warn('ThreadMessage model not found. Service methods will fail until model is created.');
}

class ThreadMessageService {
  /**
   * Post a new message to a record's chatter
   * @param {Object} data - Message data
   * @param {String} data.res_model - Model name (e.g., 'case', 'lead', 'invoice')
   * @param {String} data.res_id - Record ID
   * @param {String} data.body - Message body (supports HTML and @mentions)
   * @param {String} data.message_type - Type: 'comment', 'notification', 'email'
   * @param {String} data.subtype - Subtype: 'discussion', 'tracking', 'stage_change', etc.
   * @param {Array<String>} data.partner_ids - User IDs to notify
   * @param {Array<String>} data.attachment_ids - Attachment IDs
   * @param {Boolean} data.is_internal - Whether this is an internal note
   * @param {Object} context - Request context
   * @param {String} context.firmId - Firm ID (multi-tenancy)
   * @param {String} context.userId - User ID of the author
   * @returns {Promise<Object|null>} - Created message or null
   */
  async postMessage(data, context = {}) {
    try {
      if (!ThreadMessage) {
        throw new Error('ThreadMessage model not loaded');
      }

      // Parse @mentions from body
      const mentionedUserIds = await this._parseMentions(data.body || '');

      // Combine explicit partner_ids with mentioned users
      const allPartnerIds = [
        ...(data.partner_ids || []),
        ...mentionedUserIds
      ].filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates

      const messageData = {
        // Record reference
        res_model: data.res_model,
        res_id: data.res_id ? new mongoose.Types.ObjectId(data.res_id) : null,

        // Message content
        body: data.body || '',
        subject: data.subject || null,

        // Message classification
        message_type: data.message_type || 'comment',
        subtype: data.subtype || 'discussion',
        is_internal: data.is_internal || false,

        // Author info
        author_id: context.userId ? new mongoose.Types.ObjectId(context.userId) : null,
        firmId: context.firmId ? new mongoose.Types.ObjectId(context.firmId) : null,

        // Recipients and notifications
        partner_ids: allPartnerIds.map(id => new mongoose.Types.ObjectId(id)),
        notified_partner_ids: [], // Will be populated after notifications are sent

        // Attachments
        attachment_ids: (data.attachment_ids || []).map(id => new mongoose.Types.ObjectId(id)),

        // Tracking values (for field changes)
        tracking_value_ids: data.tracking_value_ids || [],

        // Metadata
        email_from: context.user?.email || null,
        reply_to: data.reply_to || null,
        message_id: data.message_id || null, // For email threading

        // Timestamps
        date: data.date || new Date(),
      };

      // Remove null/undefined fields to keep documents clean
      Object.keys(messageData).forEach(key => {
        if (messageData[key] === null || messageData[key] === undefined) {
          delete messageData[key];
        }
      });

      const message = await ThreadMessage.create(messageData);

      // Send notifications to mentioned/tagged users
      if (allPartnerIds.length > 0) {
        await this._notifyPartners(message);
      }

      // Populate before returning
      await message.populate([
        { path: 'author_id', select: 'firstName lastName email image' },
        { path: 'partner_ids', select: 'firstName lastName email' },
        { path: 'attachment_ids', select: 'filename originalName mimetype size url' }
      ]);

      return message;
    } catch (error) {
      console.error('ThreadMessageService.postMessage failed:', error.message);
      return null;
    }
  }

  /**
   * Post an internal note
   * Shorthand for postMessage with message_type='comment' and is_internal=true
   * @param {String} res_model - Model name
   * @param {String} res_id - Record ID
   * @param {String} body - Note content
   * @param {Object} context - Request context
   * @returns {Promise<Object|null>} - Created message or null
   */
  async logNote(res_model, res_id, body, context = {}) {
    try {
      return await this.postMessage({
        res_model,
        res_id,
        body,
        message_type: 'comment',
        subtype: 'note',
        is_internal: true
      }, context);
    } catch (error) {
      console.error('ThreadMessageService.logNote failed:', error.message);
      return null;
    }
  }

  /**
   * Log field changes with tracking
   * @param {String} res_model - Model name
   * @param {String} res_id - Record ID
   * @param {Array} changes - Array of field changes
   * @param {String} changes[].field - Field name
   * @param {String} changes[].field_desc - Human-readable field description
   * @param {*} changes[].old_value - Previous value
   * @param {*} changes[].new_value - New value
   * @param {String} changes[].field_type - Field type (char, integer, many2one, selection, etc.)
   * @param {Object} context - Request context
   * @returns {Promise<Object|null>} - Created message or null
   */
  async logFieldChanges(res_model, res_id, changes, context = {}) {
    try {
      // Build tracking values
      const tracking_value_ids = changes.map(change => ({
        field: change.field,
        field_desc: change.field_desc || change.field,
        field_type: change.field_type || 'char',
        old_value: this._formatTrackingValue(change.old_value, change.field_type),
        new_value: this._formatTrackingValue(change.new_value, change.field_type),
        old_value_text: String(change.old_value || ''),
        new_value_text: String(change.new_value || ''),
      }));

      // Generate a user-friendly message body
      const fieldDescriptions = changes.map(change => {
        const oldVal = change.old_value || '(empty)';
        const newVal = change.new_value || '(empty)';
        return `<li><strong>${change.field_desc || change.field}:</strong> ${oldVal} → ${newVal}</li>`;
      }).join('');

      const body = `<ul class="o_mail_thread_message_tracking">${fieldDescriptions}</ul>`;

      return await this.postMessage({
        res_model,
        res_id,
        body,
        message_type: 'notification',
        subtype: 'tracking',
        tracking_value_ids,
        is_internal: false
      }, context);
    } catch (error) {
      console.error('ThreadMessageService.logFieldChanges failed:', error.message);
      return null;
    }
  }

  /**
   * Log a stage transition
   * @param {String} res_model - Model name
   * @param {String} res_id - Record ID
   * @param {Object} fromStage - Previous stage { id, name }
   * @param {Object} toStage - New stage { id, name }
   * @param {Object} context - Request context
   * @returns {Promise<Object|null>} - Created message or null
   */
  async logStageChange(res_model, res_id, fromStage, toStage, context = {}) {
    try {
      const body = `<p>Stage changed from <strong>${fromStage.name}</strong> to <strong>${toStage.name}</strong></p>`;

      const tracking_value_ids = [{
        field: 'stage_id',
        field_desc: 'Stage',
        field_type: 'many2one',
        old_value: fromStage.id,
        new_value: toStage.id,
        old_value_text: fromStage.name,
        new_value_text: toStage.name
      }];

      return await this.postMessage({
        res_model,
        res_id,
        body,
        message_type: 'notification',
        subtype: 'stage_change',
        tracking_value_ids,
        is_internal: false
      }, context);
    } catch (error) {
      console.error('ThreadMessageService.logStageChange failed:', error.message);
      return null;
    }
  }

  /**
   * Log activity completion
   * @param {String} res_model - Model name
   * @param {String} res_id - Record ID
   * @param {Object} activity - Activity details { type, summary, note, user }
   * @param {Object} context - Request context
   * @returns {Promise<Object|null>} - Created message or null
   */
  async logActivityDone(res_model, res_id, activity, context = {}) {
    try {
      const userName = activity.user?.firstName
        ? `${activity.user.firstName} ${activity.user.lastName || ''}`.trim()
        : 'User';

      const body = `
        <p><strong>${userName}</strong> completed activity: <em>${activity.type || 'Activity'}</em></p>
        ${activity.summary ? `<p><strong>Summary:</strong> ${activity.summary}</p>` : ''}
        ${activity.note ? `<p><strong>Note:</strong> ${activity.note}</p>` : ''}
      `;

      return await this.postMessage({
        res_model,
        res_id,
        body,
        message_type: 'notification',
        subtype: 'activity_done',
        is_internal: false
      }, context);
    } catch (error) {
      console.error('ThreadMessageService.logActivityDone failed:', error.message);
      return null;
    }
  }

  /**
   * Get messages for a specific record
   * @param {String} res_model - Model name
   * @param {String} res_id - Record ID
   * @param {Object} options - Query options
   * @param {Number} options.limit - Limit results
   * @param {Number} options.skip - Skip results
   * @param {String} options.message_type - Filter by message type
   * @param {Boolean} options.include_internal - Include internal notes
   * @returns {Promise<Array>} - Messages
   */
  async getMessages(res_model, res_id, options = {}) {
    try {
      if (!ThreadMessage) {
        throw new Error('ThreadMessage model not loaded');
      }

      const query = {
        res_model,
        res_id: new mongoose.Types.ObjectId(res_id)
      };

      // Filter by message type
      if (options.message_type) {
        query.message_type = options.message_type;
      }

      // Filter internal notes
      if (!options.include_internal) {
        query.is_internal = { $ne: true };
      }

      const messages = await ThreadMessage.find(query)
        .populate('author_id', 'firstName lastName email image')
        .populate('partner_ids', 'firstName lastName email')
        .populate('attachment_ids', 'filename originalName mimetype size url')
        .sort({ date: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0);

      return messages;
    } catch (error) {
      console.error('ThreadMessageService.getMessages failed:', error.message);
      return [];
    }
  }

  /**
   * Get messages where a user is mentioned
   * @param {String} userId - User ID
   * @param {String} firmId - Firm ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Messages where user is mentioned
   */
  async getMessagesForUser(userId, firmId, options = {}) {
    try {
      if (!ThreadMessage) {
        throw new Error('ThreadMessage model not loaded');
      }

      const query = {
        firmId: new mongoose.Types.ObjectId(firmId),
        partner_ids: new mongoose.Types.ObjectId(userId)
      };

      // Filter by read status
      if (options.unread_only) {
        query.notified_partner_ids = { $ne: new mongoose.Types.ObjectId(userId) };
      }

      const messages = await ThreadMessage.find(query)
        .populate('author_id', 'firstName lastName email image')
        .populate('res_id') // Populate the referenced record
        .sort({ date: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0);

      return messages;
    } catch (error) {
      console.error('ThreadMessageService.getMessagesForUser failed:', error.message);
      return [];
    }
  }

  /**
   * Toggle star on a message
   * @param {String} messageId - Message ID
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} - Updated message or null
   */
  async starMessage(messageId, userId) {
    try {
      if (!ThreadMessage) {
        throw new Error('ThreadMessage model not loaded');
      }

      const message = await ThreadMessage.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      const userObjectId = new mongoose.Types.ObjectId(userId);
      const starredIndex = message.starred_partner_ids?.findIndex(
        id => id.toString() === userObjectId.toString()
      );

      if (starredIndex !== undefined && starredIndex > -1) {
        // Unstar - remove user from starred_partner_ids
        message.starred_partner_ids.splice(starredIndex, 1);
      } else {
        // Star - add user to starred_partner_ids
        if (!message.starred_partner_ids) {
          message.starred_partner_ids = [];
        }
        message.starred_partner_ids.push(userObjectId);
      }

      await message.save();

      return message;
    } catch (error) {
      console.error('ThreadMessageService.starMessage failed:', error.message);
      return null;
    }
  }

  /**
   * Get starred messages for a user
   * @param {String} userId - User ID
   * @param {String} firmId - Firm ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Starred messages
   */
  async getStarredMessages(userId, firmId, options = {}) {
    try {
      if (!ThreadMessage) {
        throw new Error('ThreadMessage model not loaded');
      }

      const query = {
        firmId: new mongoose.Types.ObjectId(firmId),
        starred_partner_ids: new mongoose.Types.ObjectId(userId)
      };

      const messages = await ThreadMessage.find(query)
        .populate('author_id', 'firstName lastName email image')
        .populate('res_id') // Populate the referenced record
        .sort({ date: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0);

      return messages;
    } catch (error) {
      console.error('ThreadMessageService.getStarredMessages failed:', error.message);
      return [];
    }
  }

  /**
   * Full-text search in messages
   * @param {String} firmId - Firm ID
   * @param {String} query - Search query
   * @param {Object} options - Search options
   * @param {String} options.res_model - Filter by model
   * @param {Boolean} options.include_internal - Include internal notes
   * @returns {Promise<Array>} - Matching messages
   */
  async searchMessages(firmId, query, options = {}) {
    try {
      if (!ThreadMessage) {
        throw new Error('ThreadMessage model not loaded');
      }

      const searchQuery = {
        firmId: new mongoose.Types.ObjectId(firmId),
        $text: { $search: query }
      };

      // Filter by model
      if (options.res_model) {
        searchQuery.res_model = options.res_model;
      }

      // Filter internal notes
      if (!options.include_internal) {
        searchQuery.is_internal = { $ne: true };
      }

      const messages = await ThreadMessage.find(searchQuery)
        .populate('author_id', 'firstName lastName email image')
        .populate('res_id') // Populate the referenced record
        .sort({ score: { $meta: 'textScore' }, date: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0);

      return messages;
    } catch (error) {
      console.error('ThreadMessageService.searchMessages failed:', error.message);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Parse @mentions from message body
   * Extracts user IDs from @mention tags in HTML content
   * @private
   * @param {String} body - Message body (HTML)
   * @returns {Promise<Array<String>>} - Array of user IDs
   */
  async _parseMentions(body) {
    try {
      if (!body) return [];

      // Match @mention patterns:
      // - @[User Name](user:USER_ID)
      // - data-mention-id="USER_ID"
      // - @user:USER_ID
      const mentionPatterns = [
        /@\[.+?\]\(user:([a-f0-9]{24})\)/gi,  // Markdown-style: @[Name](user:ID)
        /data-mention-id="([a-f0-9]{24})"/gi,  // HTML attribute: data-mention-id="ID"
        /@user:([a-f0-9]{24})/gi                // Simple: @user:ID
      ];

      const userIds = new Set();

      mentionPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(body)) !== null) {
          if (match[1]) {
            userIds.add(match[1]);
          }
        }
      });

      return Array.from(userIds);
    } catch (error) {
      console.error('ThreadMessageService._parseMentions failed:', error.message);
      return [];
    }
  }

  /**
   * Send notifications to mentioned/tagged users
   * @private
   * @param {Object} message - Message document
   * @returns {Promise<void>}
   */
  async _notifyPartners(message) {
    try {
      if (!message.partner_ids || message.partner_ids.length === 0) {
        return;
      }

      // Load notification service if available
      let notificationService;
      try {
        notificationService = require('./notificationDelivery.service');
      } catch (error) {
        console.warn('NotificationDelivery service not found. Skipping notifications.');
        return;
      }

      // Create notifications for each mentioned user
      const notificationPromises = message.partner_ids.map(async (partnerId) => {
        // Don't notify the author
        if (partnerId.toString() === message.author_id?.toString()) {
          return;
        }

        const notificationData = {
          userId: partnerId,
          firmId: message.firmId,
          type: message.is_internal ? 'internal_note' : 'mention',
          title: 'You were mentioned in a message',
          message: message.subject || message.body?.substring(0, 100) || 'New message',
          metadata: {
            message_id: message._id,
            res_model: message.res_model,
            res_id: message.res_id,
            author_id: message.author_id
          },
          priority: 'medium',
          channels: ['in_app', 'email']
        };

        return notificationService.createNotification(notificationData);
      });

      await Promise.all(notificationPromises);

      // Update message with notified partners
      if (ThreadMessage) {
        await ThreadMessage.findByIdAndUpdate(message._id, {
          $addToSet: { notified_partner_ids: { $each: message.partner_ids } }
        });
      }
    } catch (error) {
      console.error('ThreadMessageService._notifyPartners failed:', error.message);
    }
  }

  /**
   * Format tracking value based on field type
   * @private
   * @param {*} value - Value to format
   * @param {String} fieldType - Field type
   * @returns {String} - Formatted value
   */
  _formatTrackingValue(value, fieldType) {
    if (value === null || value === undefined) return '';

    switch (fieldType) {
      case 'many2one':
        return value?.name || value?.toString() || '';

      case 'many2many':
      case 'one2many':
        if (Array.isArray(value)) {
          return value.map(v => v?.name || v?.toString()).join(', ');
        }
        return value?.toString() || '';

      case 'boolean':
        return value ? 'Yes' : 'No';

      case 'date':
      case 'datetime':
        return value instanceof Date ? value.toISOString() : value;

      case 'float':
      case 'monetary':
        return typeof value === 'number' ? value.toFixed(2) : value?.toString() || '';

      default:
        return value?.toString() || '';
    }
  }
}

// Export singleton instance
module.exports = new ThreadMessageService();
