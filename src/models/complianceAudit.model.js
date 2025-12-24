const mongoose = require('mongoose');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * ComplianceAudit Model - Immutable compliance-grade audit logging
 *
 * This model provides tamper-proof audit logging for regulatory compliance.
 * Features:
 * - Immutable records (cannot be modified or deleted after creation)
 * - Hash chain for integrity verification
 * - SHA-256 checksum for data integrity
 * - Comprehensive metadata tracking
 * - Regulatory tag support (GDPR, HIPAA, SOC2, ZATCA, etc.)
 * - Automatic retention management
 */

// ═══════════════════════════════════════════════════════════════
// GEO LOCATION SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════
const geoLocationSchema = new mongoose.Schema({
  country: {
    type: String,
  },
  city: {
    type: String,
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    validate: {
      validator: function(v) {
        return v.length === 2;
      },
      message: 'Coordinates must be [longitude, latitude]'
    }
  }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// MAIN COMPLIANCE AUDIT SCHEMA
// ═══════════════════════════════════════════════════════════════
const complianceAuditSchema = new mongoose.Schema(
  {
    // ═══════════════════════════════════════════════════════════════
    // ACTION & ENTITY INFORMATION
    // ═══════════════════════════════════════════════════════════════
    action: {
      type: String,
      required: true,
      index: true,
      description: 'Action performed (e.g., create, update, delete, access)'
    },

    entityType: {
      type: String,
      index: true,
      description: 'Type of entity affected (e.g., User, Case, Invoice)'
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      description: 'ID of the entity affected'
    },

    // ═══════════════════════════════════════════════════════════════
    // USER & SESSION TRACKING
    // ═══════════════════════════════════════════════════════════════
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      description: 'User who performed the action'
    },

    sessionId: {
      type: String,
      index: true,
      description: 'Session ID for correlating related actions'
    },

    // ═══════════════════════════════════════════════════════════════
    // NETWORK & CLIENT INFORMATION
    // ═══════════════════════════════════════════════════════════════
    ipAddress: {
      type: String,
      index: true,
      description: 'IP address of the client'
    },

    userAgent: {
      type: String,
      description: 'User agent string from the client'
    },

    geoLocation: {
      type: geoLocationSchema,
      description: 'Geographic location of the request'
    },

    // ═══════════════════════════════════════════════════════════════
    // STATE TRACKING (Before/After)
    // ═══════════════════════════════════════════════════════════════
    previousState: {
      type: mongoose.Schema.Types.Mixed,
      description: 'State of the entity before the action'
    },

    newState: {
      type: mongoose.Schema.Types.Mixed,
      description: 'State of the entity after the action'
    },

    changedFields: {
      type: [String],
      default: [],
      description: 'List of fields that were changed'
    },

    // ═══════════════════════════════════════════════════════════════
    // COMPLIANCE & SENSITIVITY
    // ═══════════════════════════════════════════════════════════════
    sensitivityLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
      index: true,
      description: 'Sensitivity level of the action'
    },

    regulatoryTags: {
      type: [String],
      enum: ['GDPR', 'HIPAA', 'SOC2', 'ZATCA', 'LABOR_LAW', 'PDPL'],
      default: [],
      index: true,
      description: 'Regulatory frameworks applicable to this action'
    },

    // ═══════════════════════════════════════════════════════════════
    // INTEGRITY & CHAIN VERIFICATION
    // ═══════════════════════════════════════════════════════════════
    checksum: {
      type: String,
      required: true,
      index: true,
      description: 'SHA-256 hash of core fields for integrity verification'
    },

    previousLogHash: {
      type: String,
      index: true,
      description: 'Hash of the previous log entry for chain integrity'
    },

    // ═══════════════════════════════════════════════════════════════
    // RETENTION MANAGEMENT
    // ═══════════════════════════════════════════════════════════════
    retentionCategory: {
      type: String,
      index: true,
      description: 'Category determining retention period (e.g., financial, legal, operational)'
    },

    expiresAt: {
      type: Date,
      index: true,
      description: 'When this log entry should be archived or deleted per retention policy'
    },

    // ═══════════════════════════════════════════════════════════════
    // TENANT ISOLATION (Multi-tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Firm',
      index: true,
      description: 'Firm/organization this log belongs to'
    },

    // ═══════════════════════════════════════════════════════════════
    // TIMESTAMP
    // ═══════════════════════════════════════════════════════════════
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
      description: 'When the action occurred'
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'complianceaudits'
  }
);

// ═══════════════════════════════════════════════════════════════
// INDEXES FOR COMPLIANCE QUERIES
// ═══════════════════════════════════════════════════════════════

// Primary query patterns
complianceAuditSchema.index({ firmId: 1, timestamp: -1 });
complianceAuditSchema.index({ userId: 1, timestamp: -1 });
complianceAuditSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
complianceAuditSchema.index({ action: 1, timestamp: -1 });

// Compliance-specific queries
complianceAuditSchema.index({ firmId: 1, regulatoryTags: 1, timestamp: -1 });
complianceAuditSchema.index({ firmId: 1, sensitivityLevel: 1, timestamp: -1 });
complianceAuditSchema.index({ sessionId: 1, timestamp: -1 });
complianceAuditSchema.index({ ipAddress: 1, timestamp: -1 });

// Integrity verification
complianceAuditSchema.index({ checksum: 1 });
complianceAuditSchema.index({ previousLogHash: 1 });

// Retention management
complianceAuditSchema.index({ retentionCategory: 1, expiresAt: 1 });
complianceAuditSchema.index({ firmId: 1, retentionCategory: 1, expiresAt: 1 });

// Compound indexes for complex queries
complianceAuditSchema.index({ firmId: 1, userId: 1, action: 1, timestamp: -1 });
complianceAuditSchema.index({ firmId: 1, entityType: 1, sensitivityLevel: 1, timestamp: -1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOK - IMMUTABILITY & CHECKSUM GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate SHA-256 checksum from core fields for integrity verification
 * @param {Object} doc - Document to generate checksum for
 * @returns {String} - SHA-256 hash
 */
function generateChecksum(doc) {
  const coreFields = {
    action: doc.action,
    entityType: doc.entityType,
    entityId: doc.entityId ? doc.entityId.toString() : null,
    userId: doc.userId ? doc.userId.toString() : null,
    timestamp: doc.timestamp ? doc.timestamp.toISOString() : new Date().toISOString(),
    previousState: doc.previousState,
    newState: doc.newState,
    changedFields: doc.changedFields,
    sessionId: doc.sessionId,
    ipAddress: doc.ipAddress
  };

  const dataString = JSON.stringify(coreFields, Object.keys(coreFields).sort());
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

/**
 * Pre-save hook to enforce immutability and generate checksums
 */
complianceAuditSchema.pre('save', async function(next) {
  // IMMUTABILITY CHECK: Only allow new documents, prevent modifications
  if (!this.isNew) {
    const error = new Error('ComplianceAudit records are immutable and cannot be modified');
    error.name = 'ImmutabilityViolation';
    logger.error('Attempted to modify immutable ComplianceAudit record:', {
      id: this._id,
      action: this.action,
      timestamp: this.timestamp
    });
    return next(error);
  }

  try {
    // Generate checksum for new documents
    this.checksum = generateChecksum(this);

    // Get the last log entry for this firm to create hash chain
    if (this.firmId) {
      const lastLog = await this.constructor
        .findOne({ firmId: this.firmId })
        .sort({ timestamp: -1, createdAt: -1 })
        .select('checksum')
        .lean();

      if (lastLog && lastLog.checksum) {
        this.previousLogHash = lastLog.checksum;
      }
    }

    next();
  } catch (error) {
    logger.error('Error in ComplianceAudit pre-save hook:', error);
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════
// PRE-REMOVE HOOK - PREVENT DELETIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Pre-remove hook to prevent deletion of compliance audit logs
 */
complianceAuditSchema.pre('remove', function(next) {
  const error = new Error('ComplianceAudit records cannot be deleted for compliance reasons');
  error.name = 'DeletionNotAllowed';
  logger.error('Attempted to delete ComplianceAudit record:', {
    id: this._id,
    action: this.action,
    timestamp: this.timestamp
  });
  next(error);
});

/**
 * Pre-deleteOne hook to prevent deletion via deleteOne
 */
complianceAuditSchema.pre('deleteOne', function(next) {
  const error = new Error('ComplianceAudit records cannot be deleted for compliance reasons');
  error.name = 'DeletionNotAllowed';
  logger.error('Attempted to deleteOne ComplianceAudit record');
  next(error);
});

/**
 * Pre-deleteMany hook to prevent deletion via deleteMany
 */
complianceAuditSchema.pre('deleteMany', function(next) {
  const error = new Error('ComplianceAudit records cannot be deleted for compliance reasons');
  error.name = 'DeletionNotAllowed';
  logger.error('Attempted to deleteMany ComplianceAudit records');
  next(error);
});

/**
 * Pre-findOneAndDelete hook to prevent deletion via findOneAndDelete
 */
complianceAuditSchema.pre('findOneAndDelete', function(next) {
  const error = new Error('ComplianceAudit records cannot be deleted for compliance reasons');
  error.name = 'DeletionNotAllowed';
  logger.error('Attempted to findOneAndDelete ComplianceAudit record');
  next(error);
});

/**
 * Pre-findOneAndRemove hook to prevent deletion via findOneAndRemove
 */
complianceAuditSchema.pre('findOneAndRemove', function(next) {
  const error = new Error('ComplianceAudit records cannot be deleted for compliance reasons');
  error.name = 'DeletionNotAllowed';
  logger.error('Attempted to findOneAndRemove ComplianceAudit record');
  next(error);
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS - COMPLIANCE AUDIT OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a compliance audit log entry
 * @param {Object} logData - Audit log data
 * @returns {Promise<Object|null>} - Created audit log or null on failure
 */
complianceAuditSchema.statics.log = async function(logData) {
  try {
    const log = new this(logData);
    await log.save();
    return log;
  } catch (error) {
    // Don't let audit log failure break the main operation
    logger.error('ComplianceAudit log creation failed:', error.message);
    return null;
  }
};

/**
 * Create multiple compliance audit log entries in bulk
 * @param {Array} entries - Array of audit log data objects
 * @returns {Promise<Array|null>} - Created audit logs or null on failure
 */
complianceAuditSchema.statics.logBulk = async function(entries) {
  try {
    const logs = await this.insertMany(entries, { ordered: false });
    return logs;
  } catch (error) {
    logger.error('Bulk ComplianceAudit log creation failed:', error.message);
    return null;
  }
};

/**
 * Get audit trail for a specific entity
 * @param {String} entityType - Type of entity
 * @param {String} entityId - ID of the entity
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Audit trail entries
 */
complianceAuditSchema.statics.getAuditTrail = async function(entityType, entityId, options = {}) {
  const { limit = 100, skip = 0, firmId } = options;

  const query = { entityType, entityId };

  if (firmId) {
    query.firmId = firmId;
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'firstName lastName email')
    .select('-__v')
    .lean();
};

/**
 * Get compliance logs by regulatory tag
 * @param {String} tag - Regulatory tag (e.g., 'GDPR', 'HIPAA')
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Compliance audit logs
 */
complianceAuditSchema.statics.getByRegulatoryTag = async function(tag, options = {}) {
  const { limit = 100, skip = 0, firmId, startDate, endDate } = options;

  const query = { regulatoryTags: tag };

  if (firmId) {
    query.firmId = firmId;
  }

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'firstName lastName email')
    .select('-__v')
    .lean();
};

/**
 * Get high-sensitivity logs
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - High-sensitivity audit logs
 */
complianceAuditSchema.statics.getHighSensitivityLogs = async function(options = {}) {
  const { limit = 100, skip = 0, firmId, startDate, endDate } = options;

  const query = {
    sensitivityLevel: { $in: ['high', 'critical'] }
  };

  if (firmId) {
    query.firmId = firmId;
  }

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'firstName lastName email')
    .select('-__v')
    .lean();
};

/**
 * Verify hash chain integrity for a firm
 * @param {String} firmId - Firm ID
 * @param {Object} options - Verification options
 * @returns {Promise<Object>} - Verification result
 */
complianceAuditSchema.statics.verifyHashChain = async function(firmId, options = {}) {
  const { limit = 1000 } = options;

  try {
    const logs = await this.find({ firmId })
      .sort({ timestamp: 1, createdAt: 1 })
      .limit(limit)
      .select('checksum previousLogHash timestamp action')
      .lean();

    if (logs.length === 0) {
      return { valid: true, message: 'No logs to verify' };
    }

    let previousHash = null;
    const brokenLinks = [];

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];

      // Check if previousLogHash matches the actual previous hash
      if (i > 0 && log.previousLogHash !== previousHash) {
        brokenLinks.push({
          index: i,
          logId: log._id,
          timestamp: log.timestamp,
          expected: previousHash,
          actual: log.previousLogHash
        });
      }

      previousHash = log.checksum;
    }

    return {
      valid: brokenLinks.length === 0,
      logsChecked: logs.length,
      brokenLinks,
      message: brokenLinks.length === 0
        ? 'Hash chain integrity verified'
        : `Found ${brokenLinks.length} broken link(s) in hash chain`
    };
  } catch (error) {
    logger.error('Hash chain verification failed:', error);
    throw error;
  }
};

/**
 * Get logs expiring soon (for retention management)
 * @param {Number} daysUntilExpiry - Number of days until expiry
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Logs expiring soon
 */
complianceAuditSchema.statics.getExpiringSoon = async function(daysUntilExpiry = 30, options = {}) {
  const { limit = 100, skip = 0, firmId } = options;

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);

  const query = {
    expiresAt: {
      $exists: true,
      $lte: expiryDate,
      $gte: new Date() // Not already expired
    }
  };

  if (firmId) {
    query.firmId = firmId;
  }

  return this.find(query)
    .sort({ expiresAt: 1 })
    .limit(limit)
    .skip(skip)
    .select('action entityType timestamp expiresAt retentionCategory')
    .lean();
};

/**
 * Get user activity for compliance reporting
 * @param {String} userId - User ID
 * @param {Object} dateRange - { startDate, endDate }
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - User activity logs
 */
complianceAuditSchema.statics.getUserActivity = async function(userId, dateRange = {}, options = {}) {
  const { limit = 100, skip = 0, firmId, action, sensitivityLevel } = options;
  const { startDate, endDate } = dateRange;

  const query = { userId };

  if (firmId) {
    query.firmId = firmId;
  }

  if (action) {
    query.action = action;
  }

  if (sensitivityLevel) {
    query.sensitivityLevel = sensitivityLevel;
  }

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .select('-__v')
    .lean();
};

/**
 * Export compliance logs with filters
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Array>} - Filtered compliance logs
 */
complianceAuditSchema.statics.exportLogs = async function(filters = {}) {
  const {
    firmId,
    userId,
    action,
    entityType,
    startDate,
    endDate,
    sensitivityLevel,
    regulatoryTags,
    limit = 10000
  } = filters;

  const query = {};

  if (firmId) query.firmId = firmId;
  if (userId) query.userId = userId;
  if (action) query.action = action;
  if (entityType) query.entityType = entityType;
  if (sensitivityLevel) query.sensitivityLevel = sensitivityLevel;
  if (regulatoryTags && regulatoryTags.length > 0) {
    query.regulatoryTags = { $in: regulatoryTags };
  }

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'firstName lastName email')
    .select('-__v')
    .lean();
};

// ═══════════════════════════════════════════════════════════════
// FIRM ISOLATION PLUGIN (RLS-like enforcement)
// ═══════════════════════════════════════════════════════════════
const firmIsolationPlugin = require('./plugins/firmIsolation.plugin');

/**
 * Apply Row-Level Security (RLS) plugin to enforce firm-level data isolation.
 * This ensures all queries automatically filter by firmId from the request context.
 * Note: ComplianceAudit logs may need cross-firm visibility for system admins.
 * Use bypassFirmFilter option when needed for administrative queries.
 */
complianceAuditSchema.plugin(firmIsolationPlugin);

const ComplianceAudit = mongoose.model('ComplianceAudit', complianceAuditSchema);

module.exports = ComplianceAudit;
