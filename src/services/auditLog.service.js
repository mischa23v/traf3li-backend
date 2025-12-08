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
      console.error('AuditLogService.log failed:', error.message);
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
      console.error('AuditLogService.logBulk failed:', error.message);
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
      console.error('AuditLogService.getAuditTrail failed:', error.message);
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
      console.error('AuditLogService.getUserActivity failed:', error.message);
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
      console.error('AuditLogService.getSecurityEvents failed:', error.message);
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
      console.error('AuditLogService.exportAuditLog failed:', error.message);
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
      console.error('AuditLogService.getFailedLogins failed:', error.message);
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
      console.error('AuditLogService.checkBruteForce failed:', error.message);
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
      console.error('AuditLogService.getSuspiciousActivity failed:', error.message);
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
      log.timestamp?.toISOString() || '',
      log.userEmail || '',
      log.userName || (log.userId?.firstName ? `${log.userId.firstName} ${log.userId.lastName || ''}` : ''),
      log.action || '',
      log.entityType || log.resourceType || '',
      log.entityId || log.resourceId || '',
      log.status || '',
      log.ipAddress || '',
      log.userAgent || '',
      log.severity || '',
      JSON.stringify(log.details || {}).replace(/"/g, '""')
    ]);

    const csv = [
      headers.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csv;
  }
}

// Export singleton instance
module.exports = new AuditLogService();
