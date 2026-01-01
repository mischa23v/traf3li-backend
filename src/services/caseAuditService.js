const CaseAuditLog = require('../models/caseAuditLog.model');
const QueueService = require('../services/queue.service');
const logger = require('../utils/logger');

/**
 * Case Audit Service
 * Provides methods for logging and retrieving case-specific audit entries
 */
class CaseAuditService {
  /**
   * Log an audit entry for a case
   * @param {Object} params - Audit log parameters
   * @param {ObjectId} params.userId - The user performing the action
   * @param {string} params.action - The action type (create, update, delete, view)
   * @param {string} params.resource - The resource type (case, document, hearing, note, claim, timeline)
   * @param {ObjectId} params.resourceId - The ID of the affected resource
   * @param {ObjectId} params.caseId - The case ID
   * @param {Object} params.changes - The changes made (before/after)
   * @param {Object} params.metadata - Request metadata (ip, userAgent)
   * @returns {Promise<Object>} - The created audit entry
   */
  static async log({ userId, action, resource, resourceId, caseId, changes, metadata }) {
    // Fire-and-forget: Queue the audit log without awaiting
    QueueService.logCaseAudit({
      userId,
      action,
      resource,
      resourceId,
      caseId,
      changes,
      metadata
    });
    return null;
  }

  /**
   * Get audit history for a case
   * @param {ObjectId} caseId - The case ID
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.limit - Items per page (default: 50)
   * @param {string} options.resource - Filter by resource type
   * @param {string} options.action - Filter by action type
   * @returns {Promise<Object>} - Logs and pagination info
   */
  static async getCaseAuditHistory(caseId, options = {}) {
    const { page = 1, limit = 50, resource, action } = options;

    const result = await CaseAuditLog.getCaseHistory(caseId, {
      page: parseInt(page),
      limit: parseInt(limit),
      resource,
      action
    });

    return result;
  }

  /**
   * Calculate changes between two objects
   * @param {Object} before - The object state before the change
   * @param {Object} after - The object state after the change
   * @param {Array<string>} fieldsToTrack - Optional list of fields to track (null = all fields)
   * @returns {Object|null} - The changes object with before/after states, or null if no changes
   */
  static calculateChanges(before, after, fieldsToTrack = null) {
    const changes = { before: {}, after: {} };
    const allKeys = new Set([
      ...Object.keys(before || {}),
      ...Object.keys(after || {})
    ]);

    for (const key of allKeys) {
      // Skip internal fields
      if (['_id', '__v', 'createdAt', 'updatedAt', 'id'].includes(key)) continue;

      // If fieldsToTrack specified, only track those
      if (fieldsToTrack && !fieldsToTrack.includes(key)) continue;

      const beforeVal = before?.[key];
      const afterVal = after?.[key];

      // Handle ObjectId comparison
      const beforeStr = beforeVal?.toString ? beforeVal.toString() : JSON.stringify(beforeVal);
      const afterStr = afterVal?.toString ? afterVal.toString() : JSON.stringify(afterVal);

      if (beforeStr !== afterStr) {
        if (beforeVal !== undefined) changes.before[key] = beforeVal;
        if (afterVal !== undefined) changes.after[key] = afterVal;
      }
    }

    // Return null if no changes
    return Object.keys(changes.before).length || Object.keys(changes.after).length
      ? changes
      : null;
  }

  /**
   * Log a create action
   * @param {Object} params - Parameters
   * @returns {Promise<Object>} - The created audit entry
   */
  static async logCreate({ userId, resource, resourceId, caseId, data, metadata }) {
    return this.log({
      userId,
      action: 'create',
      resource,
      resourceId,
      caseId,
      changes: { after: data },
      metadata
    });
  }

  /**
   * Log an update action
   * @param {Object} params - Parameters
   * @returns {Promise<Object>} - The created audit entry
   */
  static async logUpdate({ userId, resource, resourceId, caseId, before, after, fieldsToTrack, metadata }) {
    const changes = this.calculateChanges(before, after, fieldsToTrack);

    // Only log if there are actual changes
    if (!changes) return null;

    return this.log({
      userId,
      action: 'update',
      resource,
      resourceId,
      caseId,
      changes,
      metadata
    });
  }

  /**
   * Log a delete action
   * @param {Object} params - Parameters
   * @returns {Promise<Object>} - The created audit entry
   */
  static async logDelete({ userId, resource, resourceId, caseId, data, metadata }) {
    return this.log({
      userId,
      action: 'delete',
      resource,
      resourceId,
      caseId,
      changes: { before: data },
      metadata
    });
  }

  /**
   * Log a view action
   * @param {Object} params - Parameters
   * @returns {Promise<Object>} - The created audit entry
   */
  static async logView({ userId, resource, resourceId, caseId, metadata }) {
    return this.log({
      userId,
      action: 'view',
      resource,
      resourceId,
      caseId,
      changes: null,
      metadata
    });
  }

  /**
   * Get user's recent activity across all cases
   * @param {ObjectId} userId - The user ID
   * @param {number} limit - Number of entries to return
   * @returns {Promise<Array>} - Recent activity entries
   */
  static async getUserActivity(userId, limit = 50) {
    return CaseAuditLog.getUserActivity(userId, limit);
  }
}

module.exports = CaseAuditService;
