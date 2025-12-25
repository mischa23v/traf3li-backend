/**
 * Field History Service - Granular Field-Level Change Tracking
 *
 * This service provides comprehensive field-level history tracking with support for:
 * - Automatic change detection and tracking
 * - Version comparison
 * - Field-specific timelines
 * - Revert functionality
 * - User activity tracking
 *
 * Unlike audit logs which track high-level actions, this service tracks individual
 * field changes for detailed version control and compliance.
 */

const FieldHistory = require('../models/fieldHistory.model');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

class FieldHistoryService {
  /**
   * Track changes between old and new document versions
   * @param {String} entityType - Type of entity (e.g., 'Invoice', 'Client')
   * @param {String} entityId - ID of the entity
   * @param {Object} oldDoc - Previous document state
   * @param {Object} newDoc - New document state
   * @param {String} userId - User making the change
   * @param {String} firmId - Firm ID (optional)
   * @param {Object} metadata - Request metadata (IP, user agent, etc.)
   * @returns {Promise<Array>} - Created history entries
   */
  async trackChanges(entityType, entityId, oldDoc, newDoc, userId, firmId = null, metadata = {}) {
    try {
      const changes = [];
      const fieldsToTrack = this._getTrackableFields(entityType);
      const excludedFields = this._getExcludedFields();

      // Handle creation (no oldDoc)
      if (!oldDoc && newDoc) {
        for (const field of fieldsToTrack) {
          if (excludedFields.includes(field)) continue;

          const value = this._getNestedValue(newDoc, field);
          if (value !== undefined && value !== null) {
            changes.push({
              entityType,
              entityId: new mongoose.Types.ObjectId(entityId),
              firmId: firmId ? new mongoose.Types.ObjectId(firmId) : null,
              fieldName: field,
              fieldPath: field,
              oldValue: null,
              newValue: value,
              valueType: this._getValueType(value),
              changeType: 'created',
              changedBy: new mongoose.Types.ObjectId(userId),
              changedAt: new Date(),
              metadata: this._sanitizeMetadata(metadata),
            });
          }
        }
      }
      // Handle update
      else if (oldDoc && newDoc) {
        for (const field of fieldsToTrack) {
          if (excludedFields.includes(field)) continue;

          const oldValue = this._getNestedValue(oldDoc, field);
          const newValue = this._getNestedValue(newDoc, field);

          // Detect change
          if (!this._areValuesEqual(oldValue, newValue)) {
            changes.push({
              entityType,
              entityId: new mongoose.Types.ObjectId(entityId),
              firmId: firmId ? new mongoose.Types.ObjectId(firmId) : null,
              fieldName: field,
              fieldPath: field,
              oldValue,
              newValue,
              valueType: this._getValueType(newValue),
              changeType: 'updated',
              changedBy: new mongoose.Types.ObjectId(userId),
              changedAt: new Date(),
              metadata: this._sanitizeMetadata(metadata),
            });
          }
        }
      }
      // Handle deletion
      else if (oldDoc && !newDoc) {
        for (const field of fieldsToTrack) {
          if (excludedFields.includes(field)) continue;

          const value = this._getNestedValue(oldDoc, field);
          if (value !== undefined && value !== null) {
            changes.push({
              entityType,
              entityId: new mongoose.Types.ObjectId(entityId),
              firmId: firmId ? new mongoose.Types.ObjectId(firmId) : null,
              fieldName: field,
              fieldPath: field,
              oldValue: value,
              newValue: null,
              valueType: this._getValueType(value),
              changeType: 'deleted',
              changedBy: new mongoose.Types.ObjectId(userId),
              changedAt: new Date(),
              metadata: this._sanitizeMetadata(metadata),
            });
          }
        }
      }

      // Save changes if any detected
      if (changes.length > 0) {
        return await FieldHistory.trackChanges(changes);
      }

      return [];
    } catch (error) {
      logger.error('FieldHistoryService.trackChanges failed:', error.message);
      return [];
    }
  }

  /**
   * Get history for a specific field
   * @param {String} entityType - Type of entity
   * @param {String} entityId - ID of the entity
   * @param {String} fieldName - Name of the field
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Field history
   */
  async getFieldHistory(entityType, entityId, fieldName, options = {}) {
    try {
      return await FieldHistory.getFieldHistory(entityType, entityId, fieldName, options);
    } catch (error) {
      logger.error('FieldHistoryService.getFieldHistory failed:', error.message);
      return [];
    }
  }

  /**
   * Get all field changes for an entity
   * @param {String} entityType - Type of entity
   * @param {String} entityId - ID of the entity
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - All field history entries
   */
  async getEntityHistory(entityType, entityId, options = {}) {
    try {
      return await FieldHistory.getEntityHistory(entityType, entityId, options);
    } catch (error) {
      logger.error('FieldHistoryService.getEntityHistory failed:', error.message);
      return [];
    }
  }

  /**
   * Revert a field to its previous value
   * @param {String} historyId - History entry ID
   * @param {String} userId - User performing the revert
   * @returns {Promise<Object>} - Revert result
   */
  async revertField(historyId, userId) {
    try {
      const result = await FieldHistory.revertField(historyId, userId);

      // Note: The actual document update must be handled by the caller
      // This only creates the history record
      return result;
    } catch (error) {
      logger.error('FieldHistoryService.revertField failed:', error.message);
      throw error;
    }
  }

  /**
   * Compare two versions of an entity
   * @param {String} entityType - Type of entity
   * @param {String} entityId - ID of the entity
   * @param {Date} version1 - First version timestamp
   * @param {Date} version2 - Second version timestamp
   * @returns {Promise<Object>} - Comparison result
   */
  async compareVersions(entityType, entityId, version1, version2) {
    try {
      return await FieldHistory.compareVersions(entityType, entityId, version1, version2);
    } catch (error) {
      logger.error('FieldHistoryService.compareVersions failed:', error.message);
      throw error;
    }
  }

  /**
   * Get timeline visualization data for a field
   * @param {String} entityType - Type of entity
   * @param {String} entityId - ID of the entity
   * @param {String} fieldName - Name of the field
   * @returns {Promise<Array>} - Timeline data
   */
  async getFieldTimeline(entityType, entityId, fieldName) {
    try {
      return await FieldHistory.getFieldTimeline(entityType, entityId, fieldName);
    } catch (error) {
      logger.error('FieldHistoryService.getFieldTimeline failed:', error.message);
      return [];
    }
  }

  /**
   * Get all changes made by a user
   * @param {String} userId - User ID
   * @param {Object} dateRange - { startDate, endDate }
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - User's change history
   */
  async getUserChanges(userId, dateRange = {}, options = {}) {
    try {
      return await FieldHistory.getUserChanges(userId, dateRange, options);
    } catch (error) {
      logger.error('FieldHistoryService.getUserChanges failed:', error.message);
      return [];
    }
  }

  /**
   * Get recent changes across a firm
   * @param {String} firmId - Firm ID
   * @param {Number} limit - Number of records to return
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} - Recent changes
   */
  async getRecentChanges(firmId, limit = 50, options = {}) {
    try {
      return await FieldHistory.getRecentChanges(firmId, limit, options);
    } catch (error) {
      logger.error('FieldHistoryService.getRecentChanges failed:', error.message);
      return [];
    }
  }

  /**
   * Get summary statistics for entity history
   * @param {String} entityType - Type of entity
   * @param {String} entityId - ID of the entity
   * @returns {Promise<Object>} - Statistics
   */
  async getEntityHistoryStats(entityType, entityId) {
    try {
      const history = await FieldHistory.find({
        entityType,
        entityId: new mongoose.Types.ObjectId(entityId),
        isReverted: false,
      }).lean();

      const fieldsChanged = new Set(history.map((h) => h.fieldName));
      const contributors = new Set(history.map((h) => h.changedBy.toString()));

      const changesByType = history.reduce((acc, h) => {
        acc[h.changeType] = (acc[h.changeType] || 0) + 1;
        return acc;
      }, {});

      return {
        totalChanges: history.length,
        fieldsChanged: fieldsChanged.size,
        contributors: contributors.size,
        changesByType,
        firstChange: history.length > 0 ? history[history.length - 1].changedAt : null,
        lastChange: history.length > 0 ? history[0].changedAt : null,
      };
    } catch (error) {
      logger.error('FieldHistoryService.getEntityHistoryStats failed:', error.message);
      return {
        totalChanges: 0,
        fieldsChanged: 0,
        contributors: 0,
        changesByType: {},
        firstChange: null,
        lastChange: null,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get trackable fields for an entity type
   * @private
   */
  _getTrackableFields(entityType) {
    // Define which fields to track per entity type
    // This can be customized or loaded from configuration
    const defaultFields = [
      'name',
      'title',
      'status',
      'amount',
      'total',
      'description',
      'notes',
      'date',
      'dueDate',
      'assignedTo',
      'priority',
      'tags',
    ];

    const entitySpecificFields = {
      Invoice: ['invoiceNumber', 'status', 'total', 'dueDate', 'clientId', 'items', 'taxAmount'],
      Client: ['name', 'email', 'phone', 'address', 'status', 'industry', 'contactPerson'],
      Case: ['caseNumber', 'title', 'status', 'priority', 'assignedTo', 'clientId', 'courtDate'],
      Employee: ['firstName', 'lastName', 'email', 'phone', 'position', 'department', 'salary'],
      Expense: ['amount', 'category', 'description', 'date', 'status', 'approvedBy'],
      Payment: ['amount', 'method', 'status', 'date', 'reference', 'invoiceId'],
    };

    return entitySpecificFields[entityType] || defaultFields;
  }

  /**
   * Get fields that should never be tracked
   * @private
   */
  _getExcludedFields() {
    return [
      '_id',
      '__v',
      'password',
      'passwordHash',
      'salt',
      'token',
      'refreshToken',
      'accessToken',
      'apiKey',
      'secret',
      'privateKey',
      'createdAt',
      'updatedAt',
      'deletedAt',
    ];
  }

  /**
   * Get nested value from object using dot notation
   * @private
   */
  _getNestedValue(obj, path) {
    if (!obj) return undefined;

    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[key];
    }

    return value;
  }

  /**
   * Determine the type of a value
   * @private
   */
  _getValueType(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'null';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    return 'string';
  }

  /**
   * Check if two values are equal (deep comparison for objects/arrays)
   * @private
   */
  _areValuesEqual(val1, val2) {
    // Handle null/undefined
    if (val1 === val2) return true;
    if (val1 === null || val1 === undefined || val2 === null || val2 === undefined) {
      return val1 === val2;
    }

    // Handle dates
    if (val1 instanceof Date && val2 instanceof Date) {
      return val1.getTime() === val2.getTime();
    }

    // Handle ObjectIds
    if (val1 instanceof mongoose.Types.ObjectId && val2 instanceof mongoose.Types.ObjectId) {
      return val1.toString() === val2.toString();
    }

    // Handle primitives
    if (typeof val1 !== 'object' && typeof val2 !== 'object') {
      return val1 === val2;
    }

    // Handle arrays
    if (Array.isArray(val1) && Array.isArray(val2)) {
      if (val1.length !== val2.length) return false;
      return JSON.stringify(val1) === JSON.stringify(val2);
    }

    // Handle objects
    if (typeof val1 === 'object' && typeof val2 === 'object') {
      return JSON.stringify(val1) === JSON.stringify(val2);
    }

    return false;
  }

  /**
   * Sanitize metadata to remove sensitive information
   * @private
   */
  _sanitizeMetadata(metadata) {
    const sanitized = {
      ipAddress: metadata.ipAddress || metadata.ip || null,
      userAgent: metadata.userAgent || null,
      sessionId: metadata.sessionId || null,
      method: metadata.method || null,
      endpoint: metadata.endpoint || metadata.url || null,
    };

    // Remove null values
    Object.keys(sanitized).forEach((key) => {
      if (sanitized[key] === null || sanitized[key] === undefined) {
        delete sanitized[key];
      }
    });

    return sanitized;
  }
}

// Export singleton instance
module.exports = new FieldHistoryService();
