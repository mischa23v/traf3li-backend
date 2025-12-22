/**
 * Field Tracking Utility - Odoo-style Change Tracking
 *
 * Provides utilities for tracking field changes on documents and logging them
 * to the chatter/message system. Supports multiple field types, bilingual labels,
 * and automatic tracking through Mongoose plugins.
 *
 * Features:
 * - Compare document states and detect changes
 * - Format values based on field type
 * - Bilingual field labels (English/Arabic)
 * - Integration with ThreadMessage service
 * - Mongoose plugin for automatic tracking
 *
 * Usage:
 * const { trackChanges, createTrackingMessage, setupModelTracking } = require('./fieldTracking');
 *
 * // Manual tracking
 * const changes = trackChanges(oldDoc, newDoc, ['status', 'priority']);
 * await createTrackingMessage(changes, 'Case', caseId, context);
 *
 * // Automatic tracking via plugin
 * caseSchema.plugin(setupModelTracking, { modelName: 'Case' });
 */

const mongoose = require('mongoose');
const logger = require('./logger');

// ThreadMessage service for creating chatter messages
let ThreadMessageService;
try {
  ThreadMessageService = require('../services/threadMessage.service');
} catch (error) {
  logger.warn('ThreadMessage service not found. Field tracking will not create messages.');
}

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION: TRACKED MODELS
// ═══════════════════════════════════════════════════════════════

/**
 * Configuration of tracked fields per model
 * Each model defines which fields should be tracked and their metadata
 */
const TRACKED_MODELS = {
  Case: [
    { name: 'status', type: 'selection', label: { en: 'Status', ar: 'الحالة' } },
    { name: 'priority', type: 'selection', label: { en: 'Priority', ar: 'الأولوية' } },
    { name: 'category', type: 'selection', label: { en: 'Category', ar: 'الفئة' } },
    { name: 'lawyerId', type: 'many2one', label: { en: 'Assigned Lawyer', ar: 'المحامي المكلف' }, ref: 'User' },
    { name: 'stage', type: 'selection', label: { en: 'Stage', ar: 'المرحلة' } },
    { name: 'caseNumber', type: 'char', label: { en: 'Case Number', ar: 'رقم القضية' } },
    { name: 'nextHearingDate', type: 'datetime', label: { en: 'Next Hearing Date', ar: 'موعد الجلسة القادمة' } },
    { name: 'estimatedValue', type: 'monetary', label: { en: 'Estimated Value', ar: 'القيمة المقدرة' } },
    { name: 'title', type: 'char', label: { en: 'Title', ar: 'العنوان' } }
  ],
  Client: [
    { name: 'status', type: 'selection', label: { en: 'Status', ar: 'الحالة' } },
    { name: 'email', type: 'char', label: { en: 'Email', ar: 'البريد الإلكتروني' } },
    { name: 'phone', type: 'char', label: { en: 'Phone', ar: 'الهاتف' } },
    { name: 'clientType', type: 'selection', label: { en: 'Client Type', ar: 'نوع العميل' } },
    { name: 'assignedTo', type: 'many2one', label: { en: 'Assigned To', ar: 'مسند إلى' }, ref: 'User' },
    { name: 'trustAccountBalance', type: 'monetary', label: { en: 'Trust Balance', ar: 'رصيد الثقة' } },
    { name: 'riskLevel', type: 'selection', label: { en: 'Risk Level', ar: 'مستوى المخاطر' } }
  ],
  Invoice: [
    { name: 'status', type: 'selection', label: { en: 'Status', ar: 'الحالة' } },
    { name: 'amount', type: 'monetary', label: { en: 'Amount', ar: 'المبلغ' } },
    { name: 'dueDate', type: 'datetime', label: { en: 'Due Date', ar: 'تاريخ الاستحقاق' } },
    { name: 'paid', type: 'boolean', label: { en: 'Paid', ar: 'مدفوع' } },
    { name: 'paidAmount', type: 'monetary', label: { en: 'Paid Amount', ar: 'المبلغ المدفوع' } },
    { name: 'paymentMethod', type: 'selection', label: { en: 'Payment Method', ar: 'طريقة الدفع' } }
  ],
  Lead: [
    { name: 'status', type: 'selection', label: { en: 'Status', ar: 'الحالة' } },
    { name: 'stage', type: 'selection', label: { en: 'Stage', ar: 'المرحلة' } },
    { name: 'assignedTo', type: 'many2one', label: { en: 'Assigned To', ar: 'مسند إلى' }, ref: 'User' },
    { name: 'source', type: 'selection', label: { en: 'Source', ar: 'المصدر' } },
    { name: 'score', type: 'integer', label: { en: 'Lead Score', ar: 'نقاط العميل المحتمل' } },
    { name: 'expectedRevenue', type: 'monetary', label: { en: 'Expected Revenue', ar: 'الإيرادات المتوقعة' } }
  ],
  Task: [
    { name: 'status', type: 'selection', label: { en: 'Status', ar: 'الحالة' } },
    { name: 'priority', type: 'selection', label: { en: 'Priority', ar: 'الأولوية' } },
    { name: 'assignedTo', type: 'many2one', label: { en: 'Assigned To', ar: 'مسند إلى' }, ref: 'User' },
    { name: 'dueDate', type: 'datetime', label: { en: 'Due Date', ar: 'تاريخ الاستحقاق' } },
    { name: 'completed', type: 'boolean', label: { en: 'Completed', ar: 'مكتمل' } }
  ],
  Expense: [
    { name: 'status', type: 'selection', label: { en: 'Status', ar: 'الحالة' } },
    { name: 'amount', type: 'monetary', label: { en: 'Amount', ar: 'المبلغ' } },
    { name: 'category', type: 'selection', label: { en: 'Category', ar: 'الفئة' } },
    { name: 'approvedBy', type: 'many2one', label: { en: 'Approved By', ar: 'تمت الموافقة من قبل' }, ref: 'User' },
    { name: 'reimbursed', type: 'boolean', label: { en: 'Reimbursed', ar: 'مسترد' } }
  ],
  Employee: [
    { name: 'status', type: 'selection', label: { en: 'Status', ar: 'الحالة' } },
    { name: 'position', type: 'char', label: { en: 'Position', ar: 'المنصب' } },
    { name: 'department', type: 'char', label: { en: 'Department', ar: 'القسم' } },
    { name: 'salary', type: 'monetary', label: { en: 'Salary', ar: 'الراتب' } },
    { name: 'manager', type: 'many2one', label: { en: 'Manager', ar: 'المدير' }, ref: 'User' }
  ],
  LeaveRequest: [
    { name: 'status', type: 'selection', label: { en: 'Status', ar: 'الحالة' } },
    { name: 'leaveType', type: 'selection', label: { en: 'Leave Type', ar: 'نوع الإجازة' } },
    { name: 'startDate', type: 'datetime', label: { en: 'Start Date', ar: 'تاريخ البداية' } },
    { name: 'endDate', type: 'datetime', label: { en: 'End Date', ar: 'تاريخ النهاية' } },
    { name: 'approvedBy', type: 'many2one', label: { en: 'Approved By', ar: 'تمت الموافقة من قبل' }, ref: 'User' }
  ],
  Payment: [
    { name: 'status', type: 'selection', label: { en: 'Status', ar: 'الحالة' } },
    { name: 'amount', type: 'monetary', label: { en: 'Amount', ar: 'المبلغ' } },
    { name: 'method', type: 'selection', label: { en: 'Payment Method', ar: 'طريقة الدفع' } },
    { name: 'transactionId', type: 'char', label: { en: 'Transaction ID', ar: 'رقم المعاملة' } },
    { name: 'completedAt', type: 'datetime', label: { en: 'Completed At', ar: 'تم في' } }
  ]
};

// ═══════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Track changes between two document states
 * @param {Object} oldDoc - Previous document state (plain object or Mongoose doc)
 * @param {Object} newDoc - New document state (plain object or Mongoose doc)
 * @param {Array<String>|String} trackedFields - Array of field names to track, or 'all' for all fields
 * @returns {Array<Object>} Array of changes with format:
 *   [{
 *     field: 'status',
 *     field_desc: 'Status',
 *     field_type: 'selection',
 *     old_value: 'draft',
 *     new_value: 'posted',
 *     old_value_char: 'Draft',
 *     new_value_char: 'Posted'
 *   }]
 */
function trackChanges(oldDoc, newDoc, trackedFields = 'all') {
  try {
    // Convert Mongoose documents to plain objects
    const oldObj = oldDoc?.toObject ? oldDoc.toObject() : oldDoc || {};
    const newObj = newDoc?.toObject ? newDoc.toObject() : newDoc || {};

    // Determine which fields to track
    let fieldsToCheck = [];

    if (trackedFields === 'all') {
      // Track all fields that differ
      fieldsToCheck = Object.keys(newObj).filter(key =>
        !key.startsWith('_') && // Skip internal fields
        key !== 'createdAt' &&
        key !== 'updatedAt' &&
        key !== '__v'
      );
    } else if (Array.isArray(trackedFields)) {
      fieldsToCheck = trackedFields;
    } else if (typeof trackedFields === 'string') {
      fieldsToCheck = [trackedFields];
    }

    const changes = [];

    for (const field of fieldsToCheck) {
      const oldValue = oldObj[field];
      const newValue = newObj[field];

      // Check if value actually changed
      if (!_valuesEqual(oldValue, newValue)) {
        const fieldConfig = _getFieldConfig(newDoc.constructor.modelName, field);

        changes.push({
          field: field,
          field_desc: fieldConfig?.label?.en || _humanizeFieldName(field),
          field_desc_ar: fieldConfig?.label?.ar || _humanizeFieldName(field),
          field_type: fieldConfig?.type || _inferFieldType(newValue),
          old_value: oldValue,
          new_value: newValue,
          old_value_char: formatValue(oldValue, fieldConfig?.type, fieldConfig),
          new_value_char: formatValue(newValue, fieldConfig?.type, fieldConfig)
        });
      }
    }

    return changes;
  } catch (error) {
    logger.error('trackChanges failed:', { error: error.message });
    return [];
  }
}

/**
 * Get human-readable field description with bilingual support
 * @param {String} modelName - Model name (e.g., 'Case', 'Client')
 * @param {String} fieldName - Field name (e.g., 'status', 'assignedTo')
 * @returns {Object} Bilingual labels { en: 'Status', ar: 'الحالة' }
 */
function getFieldDescription(modelName, fieldName) {
  try {
    const fieldConfig = _getFieldConfig(modelName, fieldName);

    if (fieldConfig?.label) {
      return fieldConfig.label;
    }

    // Fallback to humanized field name
    const humanized = _humanizeFieldName(fieldName);
    return { en: humanized, ar: humanized };
  } catch (error) {
    logger.error('getFieldDescription failed:', { error: error.message, modelName, fieldName });
    return { en: fieldName, ar: fieldName };
  }
}

/**
 * Format value for display based on field type
 * @param {*} value - Value to format
 * @param {String} fieldType - Field type (char, integer, datetime, boolean, monetary, many2one, etc.)
 * @param {Object} fieldConfig - Optional field configuration
 * @returns {String} Formatted value
 */
function formatValue(value, fieldType = 'char', fieldConfig = {}) {
  try {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return '';
    }

    switch (fieldType) {
      case 'char':
      case 'text':
      case 'selection':
        return String(value);

      case 'integer':
        return typeof value === 'number' ? value.toString() : String(value);

      case 'float':
      case 'monetary':
        if (typeof value === 'number') {
          const formatted = value.toFixed(2);
          return fieldType === 'monetary' ? `${formatted} SAR` : formatted;
        }
        return String(value);

      case 'boolean':
        return value ? 'Yes' : 'No';

      case 'date':
      case 'datetime':
        if (value instanceof Date) {
          return fieldType === 'date'
            ? value.toISOString().split('T')[0]
            : value.toISOString();
        }
        if (typeof value === 'string' || typeof value === 'number') {
          const date = new Date(value);
          return isNaN(date.getTime()) ? String(value) : date.toISOString();
        }
        return String(value);

      case 'many2one':
        // Handle ObjectId references
        if (value?._id) {
          return value.name || value.firstName
            ? `${value.firstName || ''} ${value.lastName || ''}`.trim()
            : value._id.toString();
        }
        if (mongoose.Types.ObjectId.isValid(value)) {
          return value.toString();
        }
        return String(value);

      case 'many2many':
      case 'one2many':
        if (Array.isArray(value)) {
          return value.map(v => formatValue(v, 'many2one', fieldConfig)).join(', ');
        }
        return String(value);

      default:
        return String(value);
    }
  } catch (error) {
    logger.error('formatValue failed:', { error: error.message, fieldType, value });
    return String(value || '');
  }
}

/**
 * Get tracked fields configuration for a model
 * @param {String} modelName - Model name (e.g., 'Case', 'Client')
 * @returns {Array<Object>} Array of field configurations
 */
function getTrackedFields(modelName) {
  try {
    return TRACKED_MODELS[modelName] || [];
  } catch (error) {
    logger.error('getTrackedFields failed:', { error: error.message, modelName });
    return [];
  }
}

/**
 * Create a tracking message in the chatter system
 * @param {Array<Object>} changes - Array of changes from trackChanges()
 * @param {String} modelName - Model name (e.g., 'Case', 'Client')
 * @param {String|ObjectId} recordId - Record ID
 * @param {Object} context - Request context with userId, firmId, etc.
 * @returns {Promise<Object|null>} Created message or null
 */
async function createTrackingMessage(changes, modelName, recordId, context = {}) {
  try {
    if (!changes || changes.length === 0) {
      logger.debug('No changes to track');
      return null;
    }

    if (!ThreadMessageService) {
      logger.warn('ThreadMessageService not available. Cannot create tracking message.');
      return null;
    }

    // Use ThreadMessageService.logFieldChanges
    const message = await ThreadMessageService.logFieldChanges(
      modelName,
      recordId,
      changes,
      context
    );

    if (message) {
      logger.debug('Field tracking message created', {
        modelName,
        recordId,
        changeCount: changes.length,
        messageId: message._id
      });
    }

    return message;
  } catch (error) {
    logger.error('createTrackingMessage failed:', {
      error: error.message,
      modelName,
      recordId,
      changes
    });
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// MONGOOSE PLUGIN
// ═══════════════════════════════════════════════════════════════

/**
 * Mongoose plugin to automatically track field changes
 * Adds pre/post save hooks to detect and log changes
 *
 * Usage:
 * const { setupModelTracking } = require('../utils/fieldTracking');
 * caseSchema.plugin(setupModelTracking, { modelName: 'Case' });
 *
 * @param {Schema} schema - Mongoose schema
 * @param {Object} options - Plugin options
 * @param {String} options.modelName - Model name for tracking configuration
 * @param {Array<String>} options.trackedFields - Optional: specific fields to track
 * @param {Boolean} options.enabled - Whether tracking is enabled (default: true)
 */
function setupModelTracking(schema, options = {}) {
  const {
    modelName,
    trackedFields = null,
    enabled = true
  } = options;

  if (!enabled) {
    return;
  }

  if (!modelName) {
    throw new Error('modelName is required for setupModelTracking plugin');
  }

  // Store original document before update
  schema.pre('save', function(next) {
    // Only track on updates, not on creation
    if (this.isNew) {
      return next();
    }

    // Store the original document state
    this.constructor.findById(this._id)
      .then(originalDoc => {
        this._originalDoc = originalDoc;
        next();
      })
      .catch(err => {
        logger.error('setupModelTracking pre-save hook failed:', { error: err.message });
        next(); // Continue even if we can't fetch original
      });
  });

  // Track changes after save
  schema.post('save', async function(doc) {
    try {
      // Skip if this is a new document
      if (!doc._originalDoc) {
        return;
      }

      // Determine which fields to track
      const fieldsToTrack = trackedFields || getTrackedFields(modelName).map(f => f.name);

      if (fieldsToTrack.length === 0) {
        return;
      }

      // Track changes
      const changes = trackChanges(doc._originalDoc, doc, fieldsToTrack);

      if (changes.length > 0) {
        // Create context from document
        const context = {
          userId: doc.updatedBy || doc.modifiedBy || doc.userId,
          firmId: doc.firmId
        };

        // Create tracking message
        await createTrackingMessage(changes, modelName, doc._id, context);
      }

      // Clean up
      delete doc._originalDoc;
    } catch (error) {
      logger.error('setupModelTracking post-save hook failed:', {
        error: error.message,
        modelName,
        docId: doc._id
      });
      // Don't throw - tracking errors shouldn't break saves
    }
  });

  // Track changes on findOneAndUpdate, updateOne, etc.
  schema.pre('findOneAndUpdate', async function(next) {
    try {
      const query = this.getQuery();
      const update = this.getUpdate();

      // Fetch the original document
      const originalDoc = await this.model.findOne(query);

      if (originalDoc) {
        // Store original doc in the update context
        this._originalDoc = originalDoc;
      }

      next();
    } catch (error) {
      logger.error('setupModelTracking findOneAndUpdate pre-hook failed:', { error: error.message });
      next();
    }
  });

  schema.post('findOneAndUpdate', async function(doc) {
    try {
      if (!doc || !this._originalDoc) {
        return;
      }

      const fieldsToTrack = trackedFields || getTrackedFields(modelName).map(f => f.name);

      if (fieldsToTrack.length === 0) {
        return;
      }

      const changes = trackChanges(this._originalDoc, doc, fieldsToTrack);

      if (changes.length > 0) {
        const context = {
          userId: doc.updatedBy || doc.modifiedBy || doc.userId,
          firmId: doc.firmId
        };

        await createTrackingMessage(changes, modelName, doc._id, context);
      }
    } catch (error) {
      logger.error('setupModelTracking findOneAndUpdate post-hook failed:', {
        error: error.message,
        modelName
      });
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get field configuration from TRACKED_MODELS
 * @private
 */
function _getFieldConfig(modelName, fieldName) {
  const modelConfig = TRACKED_MODELS[modelName];
  if (!modelConfig) return null;

  return modelConfig.find(f => f.name === fieldName);
}

/**
 * Check if two values are equal (handles ObjectIds, arrays, etc.)
 * @private
 */
function _valuesEqual(val1, val2) {
  // Strict equality
  if (val1 === val2) return true;

  // Both null/undefined
  if ((val1 == null) && (val2 == null)) return true;

  // One is null/undefined
  if ((val1 == null) || (val2 == null)) return false;

  // ObjectIds
  if (mongoose.Types.ObjectId.isValid(val1) && mongoose.Types.ObjectId.isValid(val2)) {
    return val1.toString() === val2.toString();
  }

  // Dates
  if (val1 instanceof Date && val2 instanceof Date) {
    return val1.getTime() === val2.getTime();
  }

  // Arrays
  if (Array.isArray(val1) && Array.isArray(val2)) {
    if (val1.length !== val2.length) return false;
    return val1.every((item, index) => _valuesEqual(item, val2[index]));
  }

  // Objects (shallow comparison)
  if (typeof val1 === 'object' && typeof val2 === 'object') {
    const keys1 = Object.keys(val1);
    const keys2 = Object.keys(val2);

    if (keys1.length !== keys2.length) return false;

    return keys1.every(key => _valuesEqual(val1[key], val2[key]));
  }

  // Default: not equal
  return false;
}

/**
 * Infer field type from value
 * @private
 */
function _inferFieldType(value) {
  if (value === null || value === undefined) return 'char';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'float';
  if (value instanceof Date) return 'datetime';
  if (mongoose.Types.ObjectId.isValid(value)) return 'many2one';
  if (Array.isArray(value)) return 'many2many';
  return 'char';
}

/**
 * Convert camelCase field name to human-readable format
 * @private
 */
function _humanizeFieldName(fieldName) {
  return fieldName
    // Insert space before capital letters
    .replace(/([A-Z])/g, ' $1')
    // Capitalize first letter
    .replace(/^./, str => str.toUpperCase())
    // Trim extra spaces
    .trim();
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // Core functions
  trackChanges,
  getFieldDescription,
  formatValue,
  getTrackedFields,
  createTrackingMessage,

  // Mongoose plugin
  setupModelTracking,

  // Configuration
  TRACKED_MODELS
};
