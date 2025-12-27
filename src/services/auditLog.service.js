/**
 * Audit Log Service - Comprehensive Compliance & Security Logging
 *
 * This service provides a high-level API for creating and querying audit logs.
 * It abstracts the complexity of audit logging and provides consistent interfaces
 * for compliance tracking across the application.
 *
 * Features:
 * - Single and bulk audit log creation
 * - Entity-specific audit trails
 * - User activity tracking
 * - Security event monitoring
 * - Export functionality for compliance
 */

const AuditLog = require('../models/auditLog.model');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

class AuditLogService {
  /**
   * Create a single audit log entry
   * @param {String} action - Action performed (e.g., 'create', 'update', 'delete')
   * @param {String} entityType - Type of entity (e.g., 'client', 'case', 'invoice')
   * @param {String} entityId - ID of the entity
   * @param {Object} changes - Before/after changes (for updates)
   * @param {Object} context - Request context (user, ip, etc.)
   * @returns {Promise<Object|null>} - Created audit log or null
   */
  async log(action, entityType, entityId, changes = null, context = {}) {
    try {
      const logData = {
        // Action details
        action,
        entityType,
        entityId: entityId ? new mongoose.Types.ObjectId(entityId) : null,
        resourceType: entityType, // Support old naming
        resourceId: entityId ? new mongoose.Types.ObjectId(entityId) : null,

        // User context
        userId: context.userId || context.user?._id || context.user?.id,
        userEmail: context.userEmail || context.user?.email || 'system',
        userRole: context.userRole || context.user?.role || 'unknown',
        userName: context.userName || context.user?.firstName
          ? `${context.user.firstName} ${context.user.lastName || ''}`.trim()
          : null,

        // Firm context (multi-tenancy)
        firmId: context.firmId || context.user?.firmId,

        // Changes tracking
        changes: changes?.changes || null,
        beforeState: changes?.before || null,
        afterState: changes?.after || null,

        // Request metadata
        ipAddress: context.ipAddress || context.ip || 'unknown',
        userAgent: context.userAgent || 'unknown',
        method: context.method || 'POST',
        endpoint: context.endpoint || context.url || null,
        sessionId: context.sessionId || null,

        // Additional context
        details: context.details || {},
        metadata: context.metadata || {},

        // Status
        status: context.status || 'success',
        errorMessage: context.errorMessage || null,
        statusCode: context.statusCode || null,

        // Security
        severity: context.severity || this._determineSeverity(action, entityType),
        complianceTags: context.complianceTags || this._determineComplianceTags(action, entityType),

        // Timestamp
        timestamp: context.timestamp || new Date(),
      };

      // Remove null/undefined fields to keep logs clean
      Object.keys(logData).forEach(key => {
        if (logData[key] === null || logData[key] === undefined) {
          delete logData[key];
        }
      });

      return await AuditLog.log(logData);
    } catch (error) {
      logger.error('AuditLogService.log failed:', error.message);
      return null;
    }
  }

  /**
   * Create multiple audit log entries in bulk
   * @param {Array} entries - Array of audit log entry objects
   * @returns {Promise<Array|null>} - Created audit logs or null
   */
  async logBulk(entries) {
    try {
      const processedEntries = entries.map(entry => {
        const logData = {
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId ? new mongoose.Types.ObjectId(entry.entityId) : null,
          resourceType: entry.entityType,
          resourceId: entry.entityId ? new mongoose.Types.ObjectId(entry.entityId) : null,
          userId: entry.userId || entry.context?.userId,
          userEmail: entry.userEmail || entry.context?.userEmail || 'system',
          userRole: entry.userRole || entry.context?.userRole || 'unknown',
          firmId: entry.firmId || entry.context?.firmId,
          changes: entry.changes?.changes || null,
          beforeState: entry.changes?.before || null,
          afterState: entry.changes?.after || null,
          ipAddress: entry.context?.ipAddress || 'unknown',
          userAgent: entry.context?.userAgent || 'unknown',
          method: entry.context?.method || 'POST',
          details: entry.context?.details || {},
          metadata: entry.context?.metadata || {},
          status: entry.context?.status || 'success',
          severity: entry.context?.severity || this._determineSeverity(entry.action, entry.entityType),
          timestamp: entry.context?.timestamp || new Date(),
        };

        // Remove null/undefined fields
        Object.keys(logData).forEach(key => {
          if (logData[key] === null || logData[key] === undefined) {
            delete logData[key];
          }
        });

        return logData;
      });

      return await AuditLog.logBulk(processedEntries);
    } catch (error) {
      logger.error('AuditLogService.logBulk failed:', error.message);
      return null;
    }
  }

  /**
   * Get audit trail for a specific entity
   * @param {String} entityType - Type of entity
   * @param {String} entityId - ID of the entity
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Audit trail entries
   */
  async getAuditTrail(entityType, entityId, options = {}) {
    try {
      return await AuditLog.getAuditTrail(entityType, entityId, options);
    } catch (error) {
      logger.error('AuditLogService.getAuditTrail failed:', error.message);
      return [];
    }
  }

  /**
   * Get user activity within a date range
   * @param {String} userId - User ID
   * @param {Object} dateRange - { startDate, endDate }
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - User activity logs
   */
  async getUserActivity(userId, dateRange = {}, options = {}) {
    try {
      return await AuditLog.getUserActivity(userId, dateRange, options);
    } catch (error) {
      logger.error('AuditLogService.getUserActivity failed:', error.message);
      return [];
    }
  }

  /**
   * Get security events for a firm
   * @param {String} firmId - Firm ID
   * @param {Object} dateRange - { startDate, endDate }
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Security event logs
   */
  async getSecurityEvents(firmId, dateRange = {}, options = {}) {
    try {
      return await AuditLog.getSecurityEvents(firmId, dateRange, options);
    } catch (error) {
      logger.error('AuditLogService.getSecurityEvents failed:', error.message);
      return [];
    }
  }

  /**
   * Export audit logs with filters
   * @param {Object} filters - Filter criteria
   * @param {String} format - Export format ('json' or 'csv')
   * @returns {Promise<Object>} - { data, format }
   */
  async exportAuditLog(filters = {}, format = 'json') {
    try {
      const logs = await AuditLog.exportAuditLog(filters, format);

      if (format === 'csv') {
        return {
          data: this._convertToCSV(logs),
          format: 'csv',
          filename: `audit-log-${new Date().toISOString().split('T')[0]}.csv`
        };
      }

      return {
        data: logs,
        format: 'json',
        filename: `audit-log-${new Date().toISOString().split('T')[0]}.json`
      };
    } catch (error) {
      logger.error('AuditLogService.exportAuditLog failed:', error.message);
      return { data: [], format };
    }
  }

  /**
   * Get failed login attempts
   * @param {Number} timeWindow - Time window in milliseconds
   * @returns {Promise<Array>} - Failed login attempts
   */
  async getFailedLogins(timeWindow = 3600000) {
    try {
      return await AuditLog.getFailedLogins(timeWindow);
    } catch (error) {
      logger.error('AuditLogService.getFailedLogins failed:', error.message);
      return [];
    }
  }

  /**
   * Check for brute force attempts
   * @param {String} identifier - Email or IP address
   * @param {Number} timeWindow - Time window in milliseconds
   * @returns {Promise<Number>} - Number of failed attempts
   */
  async checkBruteForce(identifier, timeWindow = 900000) {
    try {
      return await AuditLog.checkBruteForce(identifier, timeWindow);
    } catch (error) {
      logger.error('AuditLogService.checkBruteForce failed:', error.message);
      return 0;
    }
  }

  /**
   * Get suspicious activity
   * @param {Number} limit - Limit results
   * @returns {Promise<Array>} - Suspicious activity logs
   */
  async getSuspiciousActivity(limit = 100) {
    try {
      return await AuditLog.getSuspiciousActivity(limit);
    } catch (error) {
      logger.error('AuditLogService.getSuspiciousActivity failed:', error.message);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Determine severity based on action and entity type
   * @private
   */
  _determineSeverity(action, entityType) {
    // Critical severity for security-sensitive operations
    const criticalActions = [
      'delete_user',
      'update_permissions',
      'update_role',
      'bulk_delete',
      'trust_withdrawal',
      'grant_access',
      'revoke_access'
    ];

    // High severity for sensitive data operations
    const highActions = [
      'delete',
      'bulk_update',
      'export_data',
      'bulk_export',
      'refund_payment',
      'trust_transfer'
    ];

    // Medium severity for modification operations
    const mediumActions = [
      'update',
      'create_payment',
      'create_invoice',
      'approve_invoice'
    ];

    if (criticalActions.includes(action)) return 'critical';
    if (highActions.includes(action)) return 'high';
    if (mediumActions.includes(action)) return 'medium';

    return 'low';
  }

  /**
   * Determine compliance tags based on action and entity type
   * @private
   */
  _determineComplianceTags(action, entityType) {
    const tags = [];

    // PDPL (Saudi Personal Data Protection Law) - applies to all personal data
    const pdplEntities = ['client', 'user', 'employee', 'contact'];
    if (pdplEntities.includes(entityType)) {
      tags.push('PDPL');
    }

    // Financial compliance for payment/invoice operations
    const financialEntities = ['payment', 'invoice', 'trust_account', 'transaction'];
    if (financialEntities.includes(entityType)) {
      tags.push('SOX');
    }

    // ISO27001 for security events
    const securityActions = [
      'login_failed',
      'update_permissions',
      'update_role',
      'grant_access',
      'revoke_access'
    ];
    if (securityActions.includes(action)) {
      tags.push('ISO27001');
    }

    return tags;
  }

  /**
   * Convert audit logs to CSV format
   * @private
   */
  _convertToCSV(logs) {
    if (!logs || logs.length === 0) {
      return '';
    }

    // SECURITY: Import sanitization function to prevent CSV injection
    const { sanitizeForCSV } = require('../utils/securityUtils');

    const headers = [
      'Timestamp',
      'User Email',
      'User Name',
      'Action',
      'Entity Type',
      'Entity ID',
      'Status',
      'IP Address',
      'User Agent',
      'Severity',
      'Details'
    ];

    const csvRows = logs.map(log => [
      sanitizeForCSV(log.timestamp?.toISOString() || ''),
      sanitizeForCSV(log.userEmail || ''),
      sanitizeForCSV(log.userName || (log.userId?.firstName ? `${log.userId.firstName} ${log.userId.lastName || ''}` : '')),
      sanitizeForCSV(log.action || ''),
      sanitizeForCSV(log.entityType || log.resourceType || ''),
      sanitizeForCSV(log.entityId || log.resourceId || ''),
      sanitizeForCSV(log.status || ''),
      sanitizeForCSV(log.ipAddress || ''),
      sanitizeForCSV(log.userAgent || ''),
      sanitizeForCSV(log.severity || ''),
      sanitizeForCSV(JSON.stringify(log.details || {}).replace(/"/g, '""'))
    ]);

    const csv = [
      headers.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csv;
  }

  // ═══════════════════════════════════════════════════════════════
  // ENHANCED LOGGING METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Log with automatic diff calculation between old and new data
   * @param {String} action - Action performed
   * @param {String} entityType - Type of entity
   * @param {String} entityId - ID of the entity
   * @param {Object} oldData - Previous state of the entity
   * @param {Object} newData - New state of the entity
   * @param {String} userId - User who performed the action
   * @param {String} firmId - Firm ID
   * @param {Object} metadata - Additional metadata (ip, userAgent, etc.)
   * @returns {Promise<Object|null>} - Created audit log or null
   */
  async logWithDiff(action, entityType, entityId, oldData, newData, userId, firmId, metadata = {}) {
    try {
      // Calculate diff between old and new data
      const changes = this._calculateDiff(oldData, newData);

      const context = {
        userId,
        firmId,
        ipAddress: metadata.ip || metadata.ipAddress || 'unknown',
        userAgent: metadata.userAgent || 'unknown',
        method: metadata.method || 'POST',
        endpoint: metadata.endpoint || metadata.url || null,
        sessionId: metadata.sessionId || null,
        details: metadata.details || {},
        metadata: metadata.metadata || {},
        status: metadata.status || 'success',
        severity: metadata.severity || this._determineSeverity(action, entityType),
      };

      return await this.log(action, entityType, entityId, {
        changes,
        before: oldData,
        after: newData
      }, context);
    } catch (error) {
      logger.error('AuditLogService.logWithDiff failed:', error.message);
      return null;
    }
  }

  /**
   * Log a bulk action affecting multiple entities
   * @param {String} action - Action performed
   * @param {Array} entities - Array of affected entities [{type, id, name}]
   * @param {String} userId - User who performed the action
   * @param {String} firmId - Firm ID
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object|null>} - Created audit log or null
   */
  async logBulkAction(action, entities, userId, firmId, metadata = {}) {
    try {
      const context = {
        userId,
        firmId,
        ipAddress: metadata.ip || metadata.ipAddress || 'unknown',
        userAgent: metadata.userAgent || 'unknown',
        method: metadata.method || 'POST',
        endpoint: metadata.endpoint || metadata.url || null,
        details: {
          ...metadata.details,
          affectedEntities: entities,
          totalAffected: entities.length,
        },
        metadata: metadata.metadata || {},
        status: metadata.status || 'success',
        severity: action.includes('delete') ? 'high' : 'medium',
      };

      // Log the bulk action
      return await this.log(
        action,
        'bulk_operation',
        null,
        null,
        context
      );
    } catch (error) {
      logger.error('AuditLogService.logBulkAction failed:', error.message);
      return null;
    }
  }

  /**
   * Log a security event
   * @param {String} eventType - Type of security event
   * @param {Object} details - Event details
   * @param {String} userId - User ID (if applicable)
   * @param {String} ip - IP address
   * @param {Object} additionalContext - Additional context
   * @returns {Promise<Object|null>} - Created audit log or null
   */
  async logSecurityEvent(eventType, details, userId, ip, additionalContext = {}) {
    try {
      const context = {
        userId: userId || null,
        firmId: additionalContext.firmId || null,
        ipAddress: ip || 'unknown',
        userAgent: additionalContext.userAgent || 'unknown',
        method: additionalContext.method || 'POST',
        endpoint: additionalContext.endpoint || additionalContext.url || null,
        sessionId: additionalContext.sessionId || null,
        details: {
          ...details,
          eventType,
          timestamp: new Date(),
        },
        status: 'suspicious',
        severity: 'critical',
        complianceTags: ['ISO27001', 'NCA-ECC'],
      };

      return await this.log(
        eventType,
        'security_event',
        null,
        null,
        context
      );
    } catch (error) {
      logger.error('AuditLogService.logSecurityEvent failed:', error.message);
      return null;
    }
  }

  /**
   * Log a data export operation
   * @param {String} exportType - Type of export (e.g., 'csv', 'pdf', 'json')
   * @param {Object} filters - Export filters applied
   * @param {String} userId - User who performed the export
   * @param {String} firmId - Firm ID
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object|null>} - Created audit log or null
   */
  async logDataExport(exportType, filters, userId, firmId, metadata = {}) {
    try {
      const context = {
        userId,
        firmId,
        ipAddress: metadata.ip || metadata.ipAddress || 'unknown',
        userAgent: metadata.userAgent || 'unknown',
        method: metadata.method || 'GET',
        endpoint: metadata.endpoint || metadata.url || null,
        details: {
          exportType,
          filters,
          recordCount: metadata.recordCount || 0,
          fileSize: metadata.fileSize || null,
          exportedAt: new Date(),
        },
        severity: 'high',
        complianceTags: ['PDPL', 'data-portability'],
      };

      return await this.log(
        'export_data',
        'data_export',
        null,
        null,
        context
      );
    } catch (error) {
      logger.error('AuditLogService.logDataExport failed:', error.message);
      return null;
    }
  }

  /**
   * Log a data deletion operation
   * @param {String} entityType - Type of entity deleted
   * @param {String} entityId - ID of the entity
   * @param {String} reason - Reason for deletion
   * @param {String} userId - User who performed the deletion
   * @param {String} firmId - Firm ID
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object|null>} - Created audit log or null
   */
  async logDataDeletion(entityType, entityId, reason, userId, firmId, metadata = {}) {
    try {
      const context = {
        userId,
        firmId,
        ipAddress: metadata.ip || metadata.ipAddress || 'unknown',
        userAgent: metadata.userAgent || 'unknown',
        method: metadata.method || 'DELETE',
        endpoint: metadata.endpoint || metadata.url || null,
        details: {
          reason,
          deletedData: metadata.deletedData || null,
          deletedAt: new Date(),
        },
        severity: 'critical',
        complianceTags: ['PDPL', 'data-deletion'],
      };

      return await this.log(
        'delete',
        entityType,
        entityId,
        { before: metadata.deletedData || null },
        context
      );
    } catch (error) {
      logger.error('AuditLogService.logDataDeletion failed:', error.message);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERY & SEARCH METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Full-text search across audit logs
   * @param {String} query - Search query
   * @param {Object} filters - Additional filters
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} - Search results with pagination
   */
  async searchLogs(query, filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 50 } = pagination;
      const skip = (page - 1) * limit;

      // Build search query
      const searchQuery = {
        $or: [
          { userEmail: { $regex: query, $options: 'i' } },
          { userName: { $regex: query, $options: 'i' } },
          { action: { $regex: query, $options: 'i' } },
          { entityType: { $regex: query, $options: 'i' } },
          { resourceType: { $regex: query, $options: 'i' } },
          { 'details.description': { $regex: query, $options: 'i' } },
        ],
      };

      // Apply additional filters
      if (filters.firmId) searchQuery.firmId = filters.firmId;
      if (filters.userId) searchQuery.userId = filters.userId;
      if (filters.action) searchQuery.action = filters.action;
      if (filters.severity) searchQuery.severity = filters.severity;
      if (filters.status) searchQuery.status = filters.status;
      if (filters.startDate || filters.endDate) {
        searchQuery.timestamp = {};
        if (filters.startDate) searchQuery.timestamp.$gte = new Date(filters.startDate);
        if (filters.endDate) searchQuery.timestamp.$lte = new Date(filters.endDate);
      }

      const [logs, total] = await Promise.all([
        AuditLog.find(searchQuery)
          .sort({ timestamp: -1 })
          .limit(limit)
          .skip(skip)
          .populate('userId', 'firstName lastName email')
          .select('-__v')
          .lean(),
        AuditLog.countDocuments(searchQuery),
      ]);

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('AuditLogService.searchLogs failed:', error.message);
      return { logs: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } };
    }
  }

  /**
   * Get logs by action type
   * @param {String} action - Action type
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} - Audit logs
   */
  async getLogsByAction(action, filters = {}) {
    try {
      const { limit = 100, skip = 0, firmId, startDate, endDate } = filters;

      const query = { action };
      if (firmId) query.firmId = firmId;
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      return await AuditLog.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .populate('userId', 'firstName lastName email')
        .select('-__v')
        .lean();
    } catch (error) {
      logger.error('AuditLogService.getLogsByAction failed:', error.message);
      return [];
    }
  }

  /**
   * Get logs within a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {String} firmId - Firm ID (optional)
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} - Audit logs
   */
  async getLogsByDateRange(startDate, endDate, firmId = null, options = {}) {
    try {
      const { limit = 100, skip = 0, action, entityType, severity } = options;

      const query = {
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };

      if (firmId) query.firmId = firmId;
      if (action) query.action = action;
      if (severity) query.severity = severity;
      if (entityType) {
        query.$or = [
          { entityType },
          { resourceType: entityType },
        ];
      }

      return await AuditLog.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .populate('userId', 'firstName lastName email')
        .select('-__v')
        .lean();
    } catch (error) {
      logger.error('AuditLogService.getLogsByDateRange failed:', error.message);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get activity summary for a firm
   * @param {String} firmId - Firm ID
   * @param {String} period - Period ('daily', 'weekly', 'monthly', 'yearly')
   * @returns {Promise<Object>} - Activity summary
   */
  async getActivitySummary(firmId, period = 'weekly') {
    try {
      const now = new Date();
      let startDate;

      switch (period) {
        case 'daily':
          startDate = new Date(now.setDate(now.getDate() - 1));
          break;
        case 'weekly':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'monthly':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'yearly':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          startDate = new Date(now.setDate(now.getDate() - 7));
      }

      const query = {
        firmId,
        timestamp: { $gte: startDate },
      };

      const [
        totalActions,
        actionBreakdown,
        severityBreakdown,
        entityBreakdown,
        failedActions,
        timeline,
      ] = await Promise.all([
        AuditLog.countDocuments(query),
        AuditLog.aggregate([
          { $match: query },
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        AuditLog.aggregate([
          { $match: query },
          { $group: { _id: '$severity', count: { $sum: 1 } } },
        ]),
        AuditLog.aggregate([
          { $match: query },
          { $group: { _id: { $ifNull: ['$entityType', '$resourceType'] }, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        AuditLog.countDocuments({ ...query, status: 'failed' }),
        AuditLog.aggregate([
          { $match: query },
          {
            $group: {
              _id: {
                year: { $year: '$timestamp' },
                month: { $month: '$timestamp' },
                day: { $dayOfMonth: '$timestamp' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        ]),
      ]);

      return {
        period,
        dateRange: {
          start: startDate,
          end: new Date(),
        },
        summary: {
          totalActions,
          failedActions,
          successRate: totalActions > 0 ? ((totalActions - failedActions) / totalActions * 100).toFixed(2) : 100,
        },
        breakdown: {
          byAction: actionBreakdown.map(item => ({
            action: item._id,
            count: item.count,
            percentage: ((item.count / totalActions) * 100).toFixed(2),
          })),
          bySeverity: severityBreakdown.reduce((acc, item) => {
            acc[item._id || 'unknown'] = item.count;
            return acc;
          }, {}),
          byEntity: entityBreakdown.map(item => ({
            entityType: item._id,
            count: item.count,
          })),
        },
        timeline: timeline.map(item => ({
          date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
          count: item.count,
        })),
      };
    } catch (error) {
      logger.error('AuditLogService.getActivitySummary failed:', error.message);
      return null;
    }
  }

  /**
   * Get most active users
   * @param {String} firmId - Firm ID
   * @param {String} period - Period ('daily', 'weekly', 'monthly')
   * @param {Number} limit - Number of top users to return
   * @returns {Promise<Array>} - Top users by activity
   */
  async getTopUsers(firmId, period = 'weekly', limit = 10) {
    try {
      const now = new Date();
      let startDate;

      switch (period) {
        case 'daily':
          startDate = new Date(now.setDate(now.getDate() - 1));
          break;
        case 'weekly':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'monthly':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          startDate = new Date(now.setDate(now.getDate() - 7));
      }

      const topUsers = await AuditLog.aggregate([
        {
          $match: {
            firmId: new mongoose.Types.ObjectId(firmId),
            timestamp: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: '$userId',
            userEmail: { $first: '$userEmail' },
            userName: { $first: '$userName' },
            totalActions: { $sum: 1 },
            failedActions: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
            },
            actions: { $push: '$action' },
          },
        },
        { $sort: { totalActions: -1 } },
        { $limit: limit },
        {
          $project: {
            userId: '$_id',
            userEmail: 1,
            userName: 1,
            totalActions: 1,
            failedActions: 1,
            successRate: {
              $multiply: [
                { $divide: [{ $subtract: ['$totalActions', '$failedActions'] }, '$totalActions'] },
                100,
              ],
            },
          },
        },
      ]);

      return topUsers;
    } catch (error) {
      logger.error('AuditLogService.getTopUsers failed:', error.message);
      return [];
    }
  }

  /**
   * Get most common actions
   * @param {String} firmId - Firm ID
   * @param {String} period - Period ('daily', 'weekly', 'monthly')
   * @param {Number} limit - Number of top actions to return
   * @returns {Promise<Array>} - Top actions
   */
  async getTopActions(firmId, period = 'weekly', limit = 10) {
    try {
      const now = new Date();
      let startDate;

      switch (period) {
        case 'daily':
          startDate = new Date(now.setDate(now.getDate() - 1));
          break;
        case 'weekly':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'monthly':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          startDate = new Date(now.setDate(now.getDate() - 7));
      }

      const topActions = await AuditLog.aggregate([
        {
          $match: {
            firmId: new mongoose.Types.ObjectId(firmId),
            timestamp: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
            failedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
            },
            uniqueUsers: { $addToSet: '$userId' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: limit },
        {
          $project: {
            action: '$_id',
            count: 1,
            failedCount: 1,
            successCount: { $subtract: ['$count', '$failedCount'] },
            uniqueUsers: { $size: '$uniqueUsers' },
            successRate: {
              $multiply: [
                { $divide: [{ $subtract: ['$count', '$failedCount'] }, '$count'] },
                100,
              ],
            },
          },
        },
      ]);

      return topActions;
    } catch (error) {
      logger.error('AuditLogService.getTopActions failed:', error.message);
      return [];
    }
  }

  /**
   * Detect anomalies in audit log patterns
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object>} - Detected anomalies
   */
  async getAnomalies(firmId) {
    try {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        suspiciousActivity,
        unusualVolumeUsers,
        offHoursActivity,
        multipleFailed,
        bulkDeletes,
      ] = await Promise.all([
        // Suspicious flagged actions
        AuditLog.find({
          firmId,
          status: 'suspicious',
          timestamp: { $gte: last7d },
        })
          .sort({ timestamp: -1 })
          .limit(50)
          .select('action entityType userEmail timestamp details')
          .lean(),

        // Users with unusually high activity
        AuditLog.aggregate([
          {
            $match: {
              firmId: new mongoose.Types.ObjectId(firmId),
              timestamp: { $gte: last24h },
            },
          },
          {
            $group: {
              _id: '$userId',
              userEmail: { $first: '$userEmail' },
              count: { $sum: 1 },
            },
          },
          { $match: { count: { $gte: 100 } } }, // More than 100 actions in 24h
          { $sort: { count: -1 } },
        ]),

        // Off-hours activity (10 PM - 6 AM)
        AuditLog.find({
          firmId,
          timestamp: { $gte: last7d },
          $expr: {
            $or: [
              { $gte: [{ $hour: '$timestamp' }, 22] },
              { $lt: [{ $hour: '$timestamp' }, 6] },
            ],
          },
        })
          .sort({ timestamp: -1 })
          .limit(50)
          .select('action entityType userEmail timestamp')
          .lean(),

        // Multiple failed login attempts
        AuditLog.aggregate([
          {
            $match: {
              firmId: new mongoose.Types.ObjectId(firmId),
              action: 'login_failed',
              timestamp: { $gte: last24h },
            },
          },
          {
            $group: {
              _id: '$ipAddress',
              count: { $sum: 1 },
              emails: { $addToSet: '$userEmail' },
            },
          },
          { $match: { count: { $gte: 5 } } }, // 5+ failed attempts
          { $sort: { count: -1 } },
        ]),

        // Bulk delete operations
        AuditLog.find({
          firmId,
          action: { $in: ['bulk_delete', 'delete'] },
          severity: { $in: ['high', 'critical'] },
          timestamp: { $gte: last7d },
        })
          .sort({ timestamp: -1 })
          .limit(20)
          .select('action entityType userEmail timestamp details')
          .lean(),
      ]);

      return {
        suspiciousActivity: {
          count: suspiciousActivity.length,
          items: suspiciousActivity,
        },
        unusualVolumeUsers: {
          count: unusualVolumeUsers.length,
          items: unusualVolumeUsers,
        },
        offHoursActivity: {
          count: offHoursActivity.length,
          items: offHoursActivity,
        },
        multipleFailed: {
          count: multipleFailed.length,
          items: multipleFailed,
        },
        bulkDeletes: {
          count: bulkDeletes.length,
          items: bulkDeletes,
        },
        riskScore: this._calculateRiskScore({
          suspicious: suspiciousActivity.length,
          unusualVolume: unusualVolumeUsers.length,
          offHours: offHoursActivity.length,
          failedLogins: multipleFailed.length,
          bulkDeletes: bulkDeletes.length,
        }),
      };
    } catch (error) {
      logger.error('AuditLogService.getAnomalies failed:', error.message);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPLIANCE METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Generate comprehensive compliance report
   * @param {String} firmId - Firm ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {String} standard - Compliance standard ('PDPL', 'SOX', 'ISO27001', 'ALL')
   * @returns {Promise<Object>} - Compliance report
   */
  async generateComplianceReport(firmId, startDate, endDate, standard = 'ALL') {
    try {
      const query = {
        firmId,
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };

      if (standard !== 'ALL') {
        query.complianceTags = standard;
      }

      const [
        totalLogs,
        byComplianceTag,
        bySeverity,
        criticalEvents,
        dataAccess,
        permissionChanges,
        dataExports,
        dataDeletions,
        failedAttempts,
      ] = await Promise.all([
        AuditLog.countDocuments(query),
        AuditLog.aggregate([
          { $match: query },
          { $unwind: { path: '$complianceTags', preserveNullAndEmptyArrays: true } },
          { $group: { _id: '$complianceTags', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        AuditLog.aggregate([
          { $match: query },
          { $group: { _id: '$severity', count: { $sum: 1 } } },
        ]),
        AuditLog.find({ ...query, severity: 'critical' })
          .sort({ timestamp: -1 })
          .limit(100)
          .select('action entityType userEmail timestamp status details')
          .lean(),
        AuditLog.countDocuments({
          ...query,
          action: { $in: ['view_document', 'download_document', 'access_sensitive_data', 'view_client'] },
        }),
        AuditLog.countDocuments({
          ...query,
          action: { $in: ['update_permissions', 'update_role', 'grant_access', 'revoke_access'] },
        }),
        AuditLog.countDocuments({
          ...query,
          action: { $in: ['export_data', 'bulk_export'] },
        }),
        AuditLog.countDocuments({
          ...query,
          action: { $in: ['delete', 'bulk_delete'] },
          severity: { $in: ['high', 'critical'] },
        }),
        AuditLog.countDocuments({ ...query, status: 'failed' }),
      ]);

      const report = {
        generatedAt: new Date(),
        standard,
        dateRange: { start: new Date(startDate), end: new Date(endDate) },
        firmId,
        summary: {
          totalAuditLogs: totalLogs,
          criticalEvents: criticalEvents.length,
          dataAccessAttempts: dataAccess,
          permissionChanges,
          dataExports,
          dataDeletions,
          failedAttempts,
          complianceScore: this._calculateComplianceScore({
            total: totalLogs,
            failed: failedAttempts,
            critical: criticalEvents.length,
          }),
        },
        breakdown: {
          byComplianceTag: byComplianceTag.map(item => ({
            tag: item._id || 'untagged',
            count: item.count,
          })),
          bySeverity: bySeverity.reduce((acc, item) => {
            acc[item._id || 'unknown'] = item.count;
            return acc;
          }, {}),
        },
        criticalEvents: criticalEvents.map(event => ({
          action: event.action,
          entityType: event.entityType,
          userEmail: event.userEmail,
          timestamp: event.timestamp,
          status: event.status,
          details: event.details,
        })),
        recommendations: this._generateComplianceRecommendations({
          failed: failedAttempts,
          total: totalLogs,
          permissionChanges,
          dataExports,
          dataDeletions,
          critical: criticalEvents.length,
        }),
      };

      return report;
    } catch (error) {
      logger.error('AuditLogService.generateComplianceReport failed:', error.message);
      return null;
    }
  }

  /**
   * Verify audit log integrity using hash chain
   * @param {String} firmId - Firm ID
   * @param {Object} dateRange - Date range to verify
   * @returns {Promise<Object>} - Integrity verification result
   */
  async verifyLogIntegrity(firmId, dateRange = {}) {
    try {
      const query = { firmId };

      if (dateRange.start || dateRange.end) {
        query.timestamp = {};
        if (dateRange.start) query.timestamp.$gte = new Date(dateRange.start);
        if (dateRange.end) query.timestamp.$lte = new Date(dateRange.end);
      }

      const logs = await AuditLog.find(query)
        .sort({ timestamp: 1 })
        .select('integrity timestamp action entityType')
        .lean();

      let verified = 0;
      let failed = 0;
      const errors = [];

      for (let i = 1; i < logs.length; i++) {
        const currentLog = logs[i];
        const previousLog = logs[i - 1];

        // Verify hash chain
        if (currentLog.integrity?.previousHash === previousLog.integrity?.hash) {
          verified++;
        } else {
          failed++;
          errors.push({
            logId: currentLog._id,
            timestamp: currentLog.timestamp,
            reason: 'Hash chain broken',
            expected: previousLog.integrity?.hash,
            actual: currentLog.integrity?.previousHash,
          });
        }
      }

      const integrityScore = logs.length > 1 ? (verified / (logs.length - 1) * 100).toFixed(2) : 100;

      return {
        success: true,
        verified,
        failed,
        total: logs.length,
        integrityScore: parseFloat(integrityScore),
        dateRange: {
          start: logs[0]?.timestamp,
          end: logs[logs.length - 1]?.timestamp,
        },
        errors: errors.slice(0, 10), // Return first 10 errors
        isIntact: failed === 0,
      };
    } catch (error) {
      logger.error('AuditLogService.verifyLogIntegrity failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Export audit logs for external auditors
   * @param {String} firmId - Firm ID
   * @param {Object} dateRange - Date range
   * @param {String} format - Export format ('json', 'csv', 'pdf')
   * @returns {Promise<Object>} - Export data
   */
  async exportForAudit(firmId, dateRange, format = 'json') {
    try {
      const filters = {
        firmId,
        startDate: dateRange.start,
        endDate: dateRange.end,
        limit: 50000, // Increased limit for audit exports
      };

      const logs = await this.exportAuditLog(filters, format);

      // Add integrity verification
      const integrityCheck = await this.verifyLogIntegrity(firmId, dateRange);

      return {
        ...logs,
        audit: {
          exportedAt: new Date(),
          exportedBy: 'system',
          totalRecords: Array.isArray(logs.data) ? logs.data.length : 0,
          dateRange,
          integrityVerification: {
            verified: integrityCheck.verified,
            failed: integrityCheck.failed,
            integrityScore: integrityCheck.integrityScore,
            isIntact: integrityCheck.isIntact,
          },
        },
      };
    } catch (error) {
      logger.error('AuditLogService.exportForAudit failed:', error.message);
      return null;
    }
  }

  /**
   * Get retention compliance status
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object>} - Retention status
   */
  async getRetentionStatus(firmId) {
    try {
      const ArchivedAuditLog = require('../models/archivedAuditLog.model');
      const now = new Date();
      const retentionYears = 7; // PDPL requirement
      const retentionDate = new Date(now.getFullYear() - retentionYears, now.getMonth(), now.getDate());
      const archiveThresholdDays = 90;
      const archiveDate = new Date(now.getTime() - archiveThresholdDays * 24 * 60 * 60 * 1000);

      const [
        activeLogs,
        archivedLogs,
        logsNeedingArchive,
        logsNeedingDeletion,
        oldestActiveLog,
        oldestArchivedLog,
      ] = await Promise.all([
        AuditLog.countDocuments({ firmId }),
        ArchivedAuditLog.countDocuments({ firmId }),
        AuditLog.countDocuments({
          firmId,
          timestamp: { $lt: archiveDate },
        }),
        ArchivedAuditLog.countDocuments({
          firmId,
          timestamp: { $lt: retentionDate },
        }),
        AuditLog.findOne({ firmId }).sort({ timestamp: 1 }).select('timestamp').lean(),
        ArchivedAuditLog.findOne({ firmId }).sort({ timestamp: 1 }).select('timestamp').lean(),
      ]);

      return {
        firmId,
        retentionPolicy: {
          years: retentionYears,
          archiveThresholdDays,
        },
        statistics: {
          activeLogs,
          archivedLogs,
          totalLogs: activeLogs + archivedLogs,
          logsNeedingArchive,
          logsNeedingDeletion,
        },
        oldestLogs: {
          active: oldestActiveLog?.timestamp,
          archived: oldestArchivedLog?.timestamp,
        },
        compliance: {
          archivingNeeded: logsNeedingArchive > 0,
          deletionNeeded: logsNeedingDeletion > 0,
          isCompliant: logsNeedingArchive === 0 && logsNeedingDeletion === 0,
        },
        recommendations: [],
      };
    } catch (error) {
      logger.error('AuditLogService.getRetentionStatus failed:', error.message);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Calculate diff between two objects
   * @private
   */
  _calculateDiff(oldData, newData) {
    if (!oldData || !newData) return [];

    const changes = [];
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const key of allKeys) {
      const oldValue = oldData[key];
      const newValue = newData[key];

      // Skip internal MongoDB fields
      if (key === '_id' || key === '__v' || key === 'updatedAt' || key === 'createdAt') {
        continue;
      }

      // Compare values
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field: key,
          oldValue,
          newValue,
        });
      }
    }

    return changes;
  }

  /**
   * Calculate risk score from anomaly data
   * @private
   */
  _calculateRiskScore(anomalies) {
    let score = 0;

    // Weight different anomaly types
    score += anomalies.suspicious * 10;
    score += anomalies.unusualVolume * 5;
    score += anomalies.offHours * 3;
    score += anomalies.failedLogins * 8;
    score += anomalies.bulkDeletes * 7;

    // Normalize to 0-100 scale
    const maxScore = 500; // Theoretical max
    const normalizedScore = Math.min((score / maxScore) * 100, 100);

    return {
      raw: score,
      normalized: normalizedScore.toFixed(2),
      level: normalizedScore > 70 ? 'critical' : normalizedScore > 40 ? 'high' : normalizedScore > 20 ? 'medium' : 'low',
    };
  }

  /**
   * Calculate compliance score
   * @private
   */
  _calculateComplianceScore(data) {
    const { total, failed, critical } = data;

    if (total === 0) return 100;

    const failureRate = (failed / total) * 100;
    const criticalRate = (critical / total) * 100;

    // Base score
    let score = 100;

    // Deduct for failures
    score -= failureRate * 2;

    // Deduct for critical events
    score -= criticalRate * 3;

    return Math.max(0, score).toFixed(2);
  }

  /**
   * Generate compliance recommendations
   * @private
   */
  _generateComplianceRecommendations(data) {
    const recommendations = [];

    if (data.failed > data.total * 0.1) {
      recommendations.push({
        severity: 'high',
        category: 'failure_rate',
        message: `High failure rate detected (${((data.failed / data.total) * 100).toFixed(1)}%). Review failed actions and implement additional security measures.`,
      });
    }

    if (data.permissionChanges > 50) {
      recommendations.push({
        severity: 'medium',
        category: 'permission_changes',
        message: `${data.permissionChanges} permission changes detected. Ensure all changes are properly authorized and documented.`,
      });
    }

    if (data.dataExports > 20) {
      recommendations.push({
        severity: 'medium',
        category: 'data_exports',
        message: `${data.dataExports} data exports detected. Verify all exports comply with data protection regulations.`,
      });
    }

    if (data.dataDeletions > 10) {
      recommendations.push({
        severity: 'high',
        category: 'data_deletions',
        message: `${data.dataDeletions} data deletions detected. Ensure all deletions are properly justified and documented.`,
      });
    }

    if (data.critical > data.total * 0.05) {
      recommendations.push({
        severity: 'critical',
        category: 'critical_events',
        message: `High number of critical events (${data.critical}). Immediate review recommended.`,
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        severity: 'low',
        category: 'compliance',
        message: 'No significant compliance issues detected. Continue monitoring.',
      });
    }

    return recommendations;
  }
}

// Export singleton instance
module.exports = new AuditLogService();
