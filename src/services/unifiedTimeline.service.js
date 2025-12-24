/**
 * Unified Timeline Service
 *
 * Aggregates activities from multiple sources into a unified 360° customer timeline.
 * Provides a comprehensive view of all customer interactions, activities, cases,
 * invoices, and communications in chronological order.
 *
 * Features:
 * - Multi-source aggregation (Activity, CrmActivity, Case, Invoice, Conversation)
 * - Cursor-based pagination for efficient loading
 * - Flexible filtering (date range, activity types, entity types)
 * - Consistent timeline item format across all sources
 * - Timeline summary and statistics
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Import models
const Activity = require('../models/activity.model');
const CrmActivity = require('../models/crmActivity.model');
const Case = require('../models/case.model');
const Invoice = require('../models/invoice.model');
const Conversation = require('../models/conversation.model');

class UnifiedTimelineService {
  constructor() {
    // Define sources with their models and mappers
    this.sources = [
      {
        name: 'Activity',
        model: Activity,
        mapper: this.mapActivity.bind(this),
        enabled: true
      },
      {
        name: 'CrmActivity',
        model: CrmActivity,
        mapper: this.mapCrmActivity.bind(this),
        enabled: true
      },
      {
        name: 'Case',
        model: Case,
        mapper: this.mapCase.bind(this),
        enabled: true
      },
      {
        name: 'Invoice',
        model: Invoice,
        mapper: this.mapInvoice.bind(this),
        enabled: true
      },
      {
        name: 'Conversation',
        model: Conversation,
        mapper: this.mapConversation.bind(this),
        enabled: true
      }
    ];
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN TIMELINE METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get unified timeline for an entity
   * @param {String} entityType - Entity type (client, contact, lead, case, etc.)
   * @param {String} entityId - Entity ID
   * @param {Object} options - Query options
   * @param {Number} options.limit - Items per page (default: 50)
   * @param {Date} options.cursor - Cursor for pagination (timestamp)
   * @param {Date} options.dateFrom - Filter from date
   * @param {Date} options.dateTo - Filter to date
   * @param {Array<String>} options.types - Filter by activity types (e.g., ['call', 'email', 'meeting'])
   * @param {Array<String>} options.includeTypes - Include only these types
   * @param {Array<String>} options.excludeTypes - Exclude these types
   * @param {String} options.firmId - Firm ID for multi-tenancy
   * @returns {Promise<Object>} { items, nextCursor, hasMore }
   */
  async getTimeline(entityType, entityId, options = {}) {
    try {
      logger.info(`Getting unified timeline for ${entityType}:${entityId}`, { options });

      const limit = options.limit || 50;
      const cursor = options.cursor ? new Date(options.cursor) : null;

      // Query each enabled source
      const sourceQueries = this.sources
        .filter(source => source.enabled)
        .map(source => this._querySource(source, entityType, entityId, cursor, options));

      // Execute all queries in parallel
      const sourceResults = await Promise.all(sourceQueries);

      // Flatten and map all items
      let allItems = [];
      sourceResults.forEach((items, index) => {
        const source = this.sources[index];
        const mappedItems = items.map(item => source.mapper(item));
        allItems = allItems.concat(mappedItems);
      });

      // Sort by timestamp descending (newest first)
      allItems.sort((a, b) => b.timestamp - a.timestamp);

      // Apply pagination
      const paginatedItems = allItems.slice(0, limit);
      const hasMore = allItems.length > limit;
      const nextCursor = hasMore ? paginatedItems[paginatedItems.length - 1].timestamp : null;

      logger.info(`Timeline retrieved: ${paginatedItems.length} items`, {
        entityType,
        entityId,
        total: allItems.length,
        hasMore
      });

      return {
        items: paginatedItems,
        nextCursor,
        hasMore,
        total: allItems.length
      };
    } catch (error) {
      logger.error('UnifiedTimelineService.getTimeline failed:', error);
      throw error;
    }
  }

  /**
   * Get timeline summary/stats for an entity
   * @param {String} entityType - Entity type
   * @param {String} entityId - Entity ID
   * @param {String} firmId - Firm ID
   * @param {Object} options - Query options (dateFrom, dateTo)
   * @returns {Promise<Object>} Timeline summary
   */
  async getTimelineSummary(entityType, entityId, firmId, options = {}) {
    try {
      logger.info(`Getting timeline summary for ${entityType}:${entityId}`);

      const dateFilter = {};
      if (options.dateFrom) dateFilter.dateFrom = new Date(options.dateFrom);
      if (options.dateTo) dateFilter.dateTo = new Date(options.dateTo);

      // Count activities by type from each source
      const countPromises = this.sources
        .filter(source => source.enabled)
        .map(async source => {
          const items = await this._querySource(
            source,
            entityType,
            entityId,
            null,
            { firmId, ...dateFilter, limit: 1000 }
          );
          return {
            source: source.name,
            count: items.length,
            types: this._groupByType(items, source)
          };
        });

      const counts = await Promise.all(countPromises);

      // Calculate totals
      const totalCount = counts.reduce((sum, c) => sum + c.count, 0);
      const bySource = counts.reduce((acc, c) => {
        acc[c.source] = c.count;
        return acc;
      }, {});

      // Get all type counts
      const byType = {};
      counts.forEach(c => {
        Object.entries(c.types).forEach(([type, count]) => {
          byType[type] = (byType[type] || 0) + count;
        });
      });

      // Get last activity date
      const recentItems = await this.getTimeline(entityType, entityId, {
        limit: 1,
        firmId
      });
      const lastActivityDate = recentItems.items[0]?.timestamp || null;

      // Calculate activity frequency (items per day over last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentActivity = await this.getTimeline(entityType, entityId, {
        limit: 1000,
        dateFrom: thirtyDaysAgo,
        firmId
      });
      const frequency = recentActivity.items.length / 30;

      return {
        totalCount,
        bySource,
        byType,
        lastActivityDate,
        activityFrequency: Math.round(frequency * 10) / 10, // Round to 1 decimal
        period: {
          from: options.dateFrom || null,
          to: options.dateTo || null
        }
      };
    } catch (error) {
      logger.error('UnifiedTimelineService.getTimelineSummary failed:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERY BUILDING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Query a specific source model
   * @private
   * @param {Object} source - Source configuration
   * @param {String} entityType - Entity type
   * @param {String} entityId - Entity ID
   * @param {Date} cursor - Pagination cursor
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Query results
   */
  async _querySource(source, entityType, entityId, cursor, options = {}) {
    try {
      const query = this._buildQuery(source.name, entityType, entityId, cursor, options);

      if (!query) {
        // Source doesn't support this entity type
        return [];
      }

      const limit = options.limit || 50;
      const items = await source.model
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 2) // Query more to account for filtering
        .lean();

      return items;
    } catch (error) {
      logger.error(`Failed to query source ${source.name}:`, error);
      return [];
    }
  }

  /**
   * Build query for each source model based on entity type
   * @private
   * @param {String} modelName - Model name
   * @param {String} entityType - Entity type
   * @param {String} entityId - Entity ID
   * @param {Date} cursor - Pagination cursor
   * @param {Object} filters - Additional filters
   * @returns {Object|null} MongoDB query or null if not applicable
   */
  _buildQuery(modelName, entityType, entityId, cursor, filters = {}) {
    const query = {};
    const oid = new mongoose.Types.ObjectId(entityId);

    // Add firm filter if provided
    if (filters.firmId) {
      query.firmId = new mongoose.Types.ObjectId(filters.firmId);
    }

    // Add cursor filter
    if (cursor) {
      query.createdAt = { $lt: cursor };
    }

    // Add date range filters
    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = query.createdAt || {};
      if (filters.dateFrom) {
        query.createdAt.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        query.createdAt.$lte = new Date(filters.dateTo);
      }
    }

    // Model-specific query building
    switch (modelName) {
      case 'Activity':
        // Activity uses polymorphic res_model/res_id
        query.res_model = this._normalizeEntityType(entityType);
        query.res_id = oid;
        break;

      case 'CrmActivity':
        // CrmActivity uses entityType/entityId
        query.entityType = entityType;
        query.entityId = oid;

        // Apply type filters if provided
        if (filters.types && filters.types.length > 0) {
          query.type = { $in: filters.types };
        }
        break;

      case 'Case':
        // Case can be filtered by clientId or contactId
        if (entityType === 'client') {
          query.clientId = oid;
        } else if (entityType === 'contact') {
          query.contactId = oid;
        } else {
          return null; // Case doesn't support this entity type
        }
        break;

      case 'Invoice':
        // Invoice references customer (client)
        if (entityType === 'client') {
          query.customerId = oid;
        } else {
          return null; // Invoice doesn't support this entity type
        }
        break;

      case 'Conversation':
        // Conversation references contactId
        if (entityType === 'contact') {
          query.contactId = oid;
        } else if (entityType === 'client') {
          // Could also query by client's contacts if needed
          return null;
        } else {
          return null;
        }
        break;

      default:
        return null;
    }

    return query;
  }

  /**
   * Normalize entity type for Activity model
   * @private
   */
  _normalizeEntityType(entityType) {
    // Activity model uses capitalized model names
    const mapping = {
      'client': 'Client',
      'contact': 'Contact',
      'lead': 'Lead',
      'case': 'Case',
      'organization': 'Organization'
    };
    return mapping[entityType] || entityType;
  }

  /**
   * Group items by type for statistics
   * @private
   */
  _groupByType(items, source) {
    const counts = {};

    items.forEach(item => {
      let type;
      switch (source.name) {
        case 'Activity':
          type = 'activity';
          break;
        case 'CrmActivity':
          type = item.type;
          break;
        case 'Case':
          type = 'case';
          break;
        case 'Invoice':
          type = 'invoice';
          break;
        case 'Conversation':
          type = 'conversation';
          break;
        default:
          type = 'other';
      }
      counts[type] = (counts[type] || 0) + 1;
    });

    return counts;
  }

  // ═══════════════════════════════════════════════════════════════
  // MAPPERS - Convert each model to unified timeline format
  // ═══════════════════════════════════════════════════════════════

  /**
   * Map Activity to timeline item
   * @param {Object} item - Activity document
   * @returns {Object} Timeline item
   */
  mapActivity(item) {
    return {
      id: item._id.toString(),
      type: 'activity',
      subtype: item.activity_type_id?.name || 'activity',
      timestamp: item.createdAt || item.date_deadline,
      title: item.summary,
      description: item.note,
      user: item.user_id ? {
        id: item.user_id._id || item.user_id,
        name: item.user_id.firstName && item.user_id.lastName
          ? `${item.user_id.firstName} ${item.user_id.lastName}`
          : null
      } : null,
      icon: this.getActivityIcon('activity'),
      metadata: {
        dueDate: item.date_deadline,
        completed: item.state === 'done',
        state: item.state,
        res_model: item.res_model,
        res_id: item.res_id
      },
      source: 'Activity'
    };
  }

  /**
   * Map CrmActivity to timeline item
   * @param {Object} item - CrmActivity document
   * @returns {Object} Timeline item
   */
  mapCrmActivity(item) {
    return {
      id: item._id.toString(),
      type: 'crm_activity',
      subtype: item.type,
      timestamp: item.createdAt,
      title: item.title,
      description: item.description,
      user: item.performedBy ? {
        id: item.performedBy._id || item.performedBy,
        name: item.performedBy.firstName && item.performedBy.lastName
          ? `${item.performedBy.firstName} ${item.performedBy.lastName}`
          : null
      } : null,
      icon: this.getActivityIcon(item.type),
      metadata: {
        status: item.status,
        outcome: item.outcome,
        scheduledAt: item.scheduledAt,
        completedAt: item.completedAt,
        duration: item.duration,
        entityType: item.entityType,
        entityId: item.entityId,
        emailData: item.emailData,
        callData: item.callData,
        meetingData: item.meetingData,
        taskData: item.taskData
      },
      source: 'CrmActivity'
    };
  }

  /**
   * Map Case to timeline item
   * @param {Object} item - Case document
   * @returns {Object} Timeline item
   */
  mapCase(item) {
    return {
      id: item._id.toString(),
      type: 'case',
      subtype: item.status || 'created',
      timestamp: item.createdAt,
      title: item.title || `Case #${item.caseNumber || item._id.toString().slice(-6)}`,
      description: item.description,
      user: item.lawyerId ? {
        id: item.lawyerId._id || item.lawyerId,
        name: null
      } : null,
      icon: this.getActivityIcon('case'),
      metadata: {
        caseNumber: item.caseNumber,
        category: item.category,
        status: item.status,
        priority: item.priority,
        resolvedAt: item.resolvedAt,
        clientId: item.clientId,
        contractId: item.contractId
      },
      source: 'Case'
    };
  }

  /**
   * Map Invoice to timeline item
   * @param {Object} item - Invoice document
   * @returns {Object} Timeline item
   */
  mapInvoice(item) {
    return {
      id: item._id.toString(),
      type: 'invoice',
      subtype: item.status || 'created',
      timestamp: item.createdAt,
      title: `Invoice #${item.invoiceNumber || item._id.toString().slice(-6)}`,
      description: `Amount: ${item.total || 0} ${item.currency || 'SAR'}`,
      user: item.createdBy ? {
        id: item.createdBy._id || item.createdBy,
        name: null
      } : null,
      icon: this.getActivityIcon('invoice'),
      metadata: {
        invoiceNumber: item.invoiceNumber,
        amount: item.total,
        currency: item.currency,
        status: item.status,
        dueDate: item.dueDate,
        paidDate: item.paidDate,
        customerId: item.customerId
      },
      source: 'Invoice'
    };
  }

  /**
   * Map Conversation to timeline item
   * @param {Object} item - Conversation document
   * @returns {Object} Timeline item
   */
  mapConversation(item) {
    const lastMessage = item.messages?.[item.messages.length - 1];
    const messagePreview = lastMessage?.content?.substring(0, 100) || '';

    return {
      id: item._id.toString(),
      type: 'conversation',
      subtype: item.channel || 'message',
      timestamp: item.lastMessageAt || item.createdAt,
      title: `${item.channel || 'Message'} conversation`,
      description: messagePreview,
      user: lastMessage?.sentBy ? {
        id: lastMessage.sentBy._id || lastMessage.sentBy,
        name: null
      } : null,
      icon: this.getActivityIcon(item.channel || 'conversation'),
      metadata: {
        channel: item.channel,
        messageCount: item.messages?.length || 0,
        status: item.status,
        assignedTo: item.assignedTo,
        contactId: item.contactId,
        lastMessageAt: item.lastMessageAt
      },
      source: 'Conversation'
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get icon for activity type
   * @param {String} type - Activity type
   * @returns {String} Icon name
   */
  getActivityIcon(type) {
    const iconMap = {
      // Communication
      call: 'phone',
      email: 'envelope',
      sms: 'message',
      whatsapp: 'whatsapp',
      meeting: 'calendar',

      // Actions
      note: 'file-text',
      task: 'check-square',
      document: 'file',
      proposal: 'file-invoice',

      // Entities
      case: 'briefcase',
      invoice: 'file-invoice-dollar',
      conversation: 'message-circle',
      activity: 'activity',

      // Status
      status_change: 'refresh-cw',
      stage_change: 'arrow-right',
      assignment: 'user-plus',

      // Conversions
      lead_created: 'user-plus',
      lead_converted: 'user-check',
      case_created: 'briefcase',
      case_updated: 'edit',

      // Default
      other: 'circle'
    };

    return iconMap[type] || 'circle';
  }

  /**
   * Get timeline item color based on type
   * @param {String} type - Timeline item type
   * @returns {String} Color code
   */
  getTimelineColor(type) {
    const colorMap = {
      call: '#3B82F6',      // blue
      email: '#8B5CF6',     // purple
      meeting: '#10B981',   // green
      note: '#6B7280',      // gray
      task: '#F59E0B',      // amber
      case: '#EF4444',      // red
      invoice: '#14B8A6',   // teal
      conversation: '#8B5CF6' // purple
    };

    return colorMap[type] || '#6B7280';
  }
}

// Export singleton instance
module.exports = new UnifiedTimelineService();
