const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Archived Audit Log Model
 *
 * Stores audit logs older than 90 days in a separate collection for:
 * - Performance optimization (keep main audit log collection smaller)
 * - Cost optimization (can be stored in cheaper storage tier)
 * - Compliance requirements (retain logs for 7 years)
 * - Summary statistics (pre-aggregated data for faster queries)
 *
 * Logs are automatically archived by the audit log archiving service.
 */

// Reuse the same structure as AuditLog but with additional archiving metadata
const changeSchema = new mongoose.Schema({
  field: {
    type: String,
    required: true,
  },
  oldValue: {
    type: mongoose.Schema.Types.Mixed,
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed,
  },
}, { _id: false });

const archivedAuditLogSchema = new mongoose.Schema(
  {
    // ═══════════════════════════════════════════════════════════════
    // ORIGINAL AUDIT LOG FIELDS (copied from AuditLog model)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Firm',
      index: true,
      required: false,
     },

    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      enum: ['client', 'lawyer', 'admin'],
      required: true,
    },
    userName: {
      type: String,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      index: true,
    },
    resourceType: {
      type: String,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    resourceName: {
      type: String,
    },
    changes: [changeSchema],
    beforeState: {
      type: mongoose.Schema.Types.Mixed,
    },
    afterState: {
      type: mongoose.Schema.Types.Mixed,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      required: true,
      index: true,
    },
    userAgent: {
      type: String,
    },
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    },
    endpoint: {
      type: String,
    },
    sessionId: {
      type: String,
      index: true,
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'suspicious', 'pending'],
      default: 'success',
      index: true,
    },
    errorMessage: {
      type: String,
    },
    statusCode: {
      type: Number,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
      index: true,
    },
    complianceTags: [{
      type: String,
      enum: ['PDPL', 'GDPR', 'SOX', 'HIPAA', 'PCI-DSS', 'ISO27001', 'NCA-ECC', 'session-security', 'data-retention', 'data-deletion', 'data-portability'],
    }],
    integrity: {
      previousHash: {
        type: String,
      },
      hash: {
        type: String,
        index: true,
      },
      signature: {
        type: String,
      },
      algorithm: {
        type: String,
        default: 'sha256',
      },
      version: {
        type: String,
        default: '1.0',
      },
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },

    // ═══════════════════════════════════════════════════════════════
    // ARCHIVING METADATA (additional fields for archived logs)
    // ═══════════════════════════════════════════════════════════════
    archivedAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    archivedBy: {
      type: String,
      default: 'system',
      enum: ['system', 'admin', 'scheduled-job'],
    },
    originalLogId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    archiveReason: {
      type: String,
      default: 'aged-out',
      enum: ['aged-out', 'manual-archive', 'compliance-requirement'],
    },
    compressed: {
      type: Boolean,
      default: false,
    },
    compressionAlgorithm: {
      type: String,
      enum: ['none', 'gzip', 'zlib'],
      default: 'none',
    },
  },
  {
    timestamps: true,
    // Store in a separate collection for better performance
    collection: 'archived_audit_logs',
  }
);

// ═══════════════════════════════════════════════════════════════
// INDEXES FOR FAST QUERYING
// ═══════════════════════════════════════════════════════════════
archivedAuditLogSchema.index({ userId: 1, timestamp: -1 });
archivedAuditLogSchema.index({ action: 1, timestamp: -1 });
archivedAuditLogSchema.index({ entityType: 1, entityId: 1 });
archivedAuditLogSchema.index({ firmId: 1, createdAt: -1 });
archivedAuditLogSchema.index({ firmId: 1, timestamp: -1 });
archivedAuditLogSchema.index({ firmId: 1, userId: 1, timestamp: -1 });
archivedAuditLogSchema.index({ firmId: 1, action: 1, timestamp: -1 });
archivedAuditLogSchema.index({ severity: 1, timestamp: -1 });
archivedAuditLogSchema.index({ archivedAt: 1 });
archivedAuditLogSchema.index({ originalLogId: 1 }, { unique: true });

// TTL index: Auto-delete archived logs older than 7 years (PDPL retention requirement)
// This ensures compliance with Saudi Arabia's PDPL data retention requirements
archivedAuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 365 * 24 * 60 * 60 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Archive a batch of audit logs
 * @param {Array} auditLogs - Array of audit log documents to archive
 * @returns {Promise<Object>} - Archive result with count
 */
archivedAuditLogSchema.statics.archiveLogs = async function (auditLogs) {
  try {
    // Transform logs for archiving
    const archivedLogs = auditLogs.map(log => ({
      ...log.toObject ? log.toObject() : log,
      originalLogId: log._id,
      archivedAt: new Date(),
      archivedBy: 'system',
      archiveReason: 'aged-out',
    }));

    // Remove _id to let MongoDB generate new ones
    archivedLogs.forEach(log => {
      delete log._id;
      delete log.__v;
      delete log.createdAt;
      delete log.updatedAt;
    });

    // Insert into archived collection
    const result = await this.insertMany(archivedLogs, { ordered: false });

    return {
      success: true,
      archived: result.length,
      timestamp: new Date(),
    };
  } catch (error) {
    logger.error('Failed to archive audit logs:', error.message);
    return {
      success: false,
      archived: 0,
      error: error.message,
    };
  }
};

/**
 * Get archived audit trail for a specific entity
 * @param {String} entityType - Type of entity
 * @param {String} entityId - ID of the entity
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Archived audit trail entries
 */
archivedAuditLogSchema.statics.getArchivedAuditTrail = async function (entityType, entityId, options = {}) {
  const { limit = 100, skip = 0, firmId } = options;

  const query = {
    $or: [
      { entityType, entityId },
      { resourceType: entityType, resourceId: entityId }
    ]
  };

  if (firmId) {
    query.firmId = firmId;
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .select('-__v')
    .lean();
};

/**
 * Get archive statistics
 * @param {Object} filters - Optional filters (firmId, startDate, endDate)
 * @returns {Promise<Object>} - Archive statistics
 */
archivedAuditLogSchema.statics.getArchiveStats = async function (filters = {}) {
  const { firmId, startDate, endDate } = filters;

  const query = {};
  if (firmId) query.firmId = firmId;
  if (startDate || endDate) {
    query.archivedAt = {};
    if (startDate) query.archivedAt.$gte = new Date(startDate);
    if (endDate) query.archivedAt.$lte = new Date(endDate);
  }

  const [
    totalArchived,
    bySeverity,
    byMonth,
    oldestLog,
    newestLog,
  ] = await Promise.all([
    this.countDocuments(query),
    this.aggregate([
      { $match: query },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]),
    this.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
          },
          count: { $sum: 1 },
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 },
    ]),
    this.findOne(query).sort({ timestamp: 1 }).select('timestamp').lean(),
    this.findOne(query).sort({ timestamp: -1 }).select('timestamp').lean(),
  ]);

  return {
    totalArchived,
    bySeverity: bySeverity.reduce((acc, item) => {
      acc[item._id || 'unknown'] = item.count;
      return acc;
    }, {}),
    byMonth: byMonth.map(item => ({
      year: item._id.year,
      month: item._id.month,
      count: item.count,
    })),
    dateRange: {
      oldest: oldestLog?.timestamp,
      newest: newestLog?.timestamp,
    },
  };
};

// ═══════════════════════════════════════════════════════════════
// HASH CHAIN VERIFICATION FOR ARCHIVED LOGS
// ═══════════════════════════════════════════════════════════════

/**
 * Verify hash chain integrity across archive
 * Ensures archived logs maintain tamper-evident hash chain
 * @param {String} firmId - Firm ID
 * @param {Object} dateRange - Optional date range
 * @returns {Promise<Object>} - Verification result
 */
archivedAuditLogSchema.statics.verifyArchiveHashChain = async function (firmId, dateRange = {}) {
  const query = { firmId };

  if (dateRange.start || dateRange.end) {
    query.timestamp = {};
    if (dateRange.start) query.timestamp.$gte = new Date(dateRange.start);
    if (dateRange.end) query.timestamp.$lte = new Date(dateRange.end);
  }

  const logs = await this.find(query)
    .sort({ timestamp: 1 })
    .select('integrity timestamp action')
    .lean();

  let verified = 0;
  let failed = 0;
  const errors = [];

  for (let i = 1; i < logs.length; i++) {
    const currentLog = logs[i];
    const previousLog = logs[i - 1];

    // Verify hash chain linkage
    if (currentLog.integrity?.previousHash === previousLog.integrity?.hash) {
      verified++;
    } else {
      failed++;
      errors.push({
        logId: currentLog._id,
        timestamp: currentLog.timestamp,
        reason: 'Hash chain broken in archive',
        expected: previousLog.integrity?.hash,
        actual: currentLog.integrity?.previousHash,
      });
    }
  }

  return {
    success: true,
    verified,
    failed,
    total: logs.length,
    isIntact: failed === 0,
    errors: errors.slice(0, 10),
  };
};

/**
 * Ensure hash chain continuity when archiving
 * Verifies that the first archived log links to the last active log
 * @param {String} firmId - Firm ID
 * @returns {Promise<Object>} - Continuity check result
 */
archivedAuditLogSchema.statics.verifyArchiveContinuity = async function (firmId) {
  const AuditLog = require('./auditLog.model');

  // Get newest active log
  const newestActive = await AuditLog.findOne({ firmId })
    .sort({ timestamp: -1 })
    .select('integrity timestamp')
    .lean();

  // Get oldest archived log
  const oldestArchived = await this.findOne({ firmId })
    .sort({ timestamp: 1 })
    .select('integrity timestamp')
    .lean();

  if (!newestActive || !oldestArchived) {
    return {
      success: true,
      hasContinuity: true,
      message: 'Insufficient data to verify continuity',
    };
  }

  // Check if there's a gap between active and archived logs
  const hasContinuity = newestActive.timestamp <= oldestArchived.timestamp;

  return {
    success: true,
    hasContinuity,
    newestActiveTimestamp: newestActive.timestamp,
    oldestArchivedTimestamp: oldestArchived.timestamp,
    message: hasContinuity
      ? 'Hash chain continuity maintained'
      : 'Warning: Potential gap between active and archived logs',
  };
};

const ArchivedAuditLog = mongoose.model('ArchivedAuditLog', archivedAuditLogSchema);

module.exports = ArchivedAuditLog;
