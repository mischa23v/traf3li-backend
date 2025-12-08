const mongoose = require('mongoose');

// Change tracking sub-schema for update operations
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

const auditLogSchema = new mongoose.Schema(
  {
    // ═══════════════════════════════════════════════════════════════
    // TENANT ISOLATION (for multi-tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Firm',
      index: true,
    },

    // ═══════════════════════════════════════════════════════════════
    // WHO PERFORMED THE ACTION
    // ═══════════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════════
    // WHAT ACTION WAS PERFORMED
    // ═══════════════════════════════════════════════════════════════
    action: {
      type: String,
      required: true,
      index: true,
      // Extended comprehensive action types
      enum: [
        // CRUD operations
        'create',
        'read',
        'update',
        'delete',

        // Document actions
        'view_judgment',
        'download_judgment',
        'view_document',
        'download_document',
        'upload_document',
        'delete_document',

        // Case actions
        'view_case',
        'create_case',
        'update_case',
        'delete_case',

        // Client actions
        'create_client',
        'update_client',
        'delete_client',
        'view_client',

        // User actions
        'view_profile',
        'update_profile',
        'delete_user',
        'ban_user',
        'unban_user',
        'verify_lawyer',

        // Payment/Invoice actions
        'create_payment',
        'update_payment',
        'delete_payment',
        'refund_payment',
        'view_invoice',
        'create_invoice',
        'update_invoice',
        'delete_invoice',
        'generate_invoice',
        'send_invoice',
        'approve_invoice',

        // Admin actions
        'view_all_users',
        'view_audit_logs',
        'system_settings',
        'data_export',

        // Authentication
        'login_success',
        'login_failed',
        'logout',
        'password_reset',
        'password_change',
        'token_refresh',
        'two_factor_enable',
        'two_factor_disable',

        // Permission changes
        'update_permissions',
        'update_role',
        'grant_access',
        'revoke_access',

        // Sensitive data access
        'access_sensitive_data',
        'export_data',
        'bulk_export',
        'bulk_delete',
        'bulk_update',

        // Trust account operations
        'trust_deposit',
        'trust_withdrawal',
        'trust_transfer',

        // Other operations
        'share',
        'import',
        'approve',
        'reject',
      ],
    },

    // ═══════════════════════════════════════════════════════════════
    // WHAT RESOURCE WAS AFFECTED
    // ═══════════════════════════════════════════════════════════════
    // Support both old naming (resourceType) and new naming (entityType)
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

    // ═══════════════════════════════════════════════════════════════
    // CHANGE TRACKING (Before/After for updates)
    // ═══════════════════════════════════════════════════════════════
    changes: [changeSchema],

    // Before state (for updates/deletes)
    beforeState: {
      type: mongoose.Schema.Types.Mixed,
    },

    // After state (for creates/updates)
    afterState: {
      type: mongoose.Schema.Types.Mixed,
    },

    // ═══════════════════════════════════════════════════════════════
    // ADDITIONAL CONTEXT & METADATA
    // ═══════════════════════════════════════════════════════════════
    details: {
      type: mongoose.Schema.Types.Mixed,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },

    // ═══════════════════════════════════════════════════════════════
    // REQUEST METADATA
    // ═══════════════════════════════════════════════════════════════
    ipAddress: {
      type: String,
      required: true,
      index: true,
    },
    userAgent: {
      type: String,
    },

    // Request details
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    },
    endpoint: {
      type: String,
    },

    // Session tracking
    sessionId: {
      type: String,
      index: true,
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS & ERROR TRACKING
    // ═══════════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════════
    // COMPLIANCE & RETENTION
    // ═══════════════════════════════════════════════════════════════
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
      index: true,
    },

    // Compliance tags for easier filtering
    complianceTags: [{
      type: String,
      enum: ['PDPL', 'GDPR', 'SOX', 'HIPAA', 'PCI-DSS', 'ISO27001'],
    }],

    // ═══════════════════════════════════════════════════════════════
    // TIMESTAMP
    // ═══════════════════════════════════════════════════════════════
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ═══════════════════════════════════════════════════════════════
// INDEXES FOR FAST QUERYING (CRITICAL FOR PERFORMANCE)
// ═══════════════════════════════════════════════════════════════
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });
auditLogSchema.index({ status: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ firmId: 1, timestamp: -1 });
auditLogSchema.index({ firmId: 1, userId: 1, timestamp: -1 });
auditLogSchema.index({ firmId: 1, entityType: 1, entityId: 1 });
auditLogSchema.index({ firmId: 1, action: 1, timestamp: -1 });
auditLogSchema.index({ severity: 1, timestamp: -1 });
auditLogSchema.index({ sessionId: 1, timestamp: -1 });

// TTL index: Auto-delete logs older than 7 years (PDPL retention requirement)
// Saudi PDPL requires keeping logs for regulatory period
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 365 * 24 * 60 * 60 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS - COMPREHENSIVE AUDIT OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create audit log entry (single)
 * @param {Object} logData - Audit log data
 * @returns {Promise<Object|null>} - Created audit log or null on failure
 */
auditLogSchema.statics.log = async function (logData) {
  try {
    // Support both entityType and resourceType naming
    if (logData.entityType && !logData.resourceType) {
      logData.resourceType = logData.entityType;
    }
    if (logData.entityId && !logData.resourceId) {
      logData.resourceId = logData.entityId;
    }

    const log = new this(logData);
    await log.save();
    return log;
  } catch (error) {
    // Don't let audit log failure break the main operation
    console.error('Audit log creation failed:', error.message);
    return null;
  }
};

/**
 * Create multiple audit log entries in bulk
 * @param {Array} entries - Array of audit log data objects
 * @returns {Promise<Array|null>} - Created audit logs or null on failure
 */
auditLogSchema.statics.logBulk = async function (entries) {
  try {
    // Support both naming conventions
    const processedEntries = entries.map(entry => {
      if (entry.entityType && !entry.resourceType) {
        entry.resourceType = entry.entityType;
      }
      if (entry.entityId && !entry.resourceId) {
        entry.resourceId = entry.entityId;
      }
      return entry;
    });

    const logs = await this.insertMany(processedEntries, { ordered: false });
    return logs;
  } catch (error) {
    console.error('Bulk audit log creation failed:', error.message);
    return null;
  }
};

/**
 * Get audit trail for a specific entity
 * @param {String} entityType - Type of entity (e.g., 'client', 'case', 'invoice')
 * @param {String} entityId - ID of the entity
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Audit trail entries
 */
auditLogSchema.statics.getAuditTrail = async function (entityType, entityId, options = {}) {
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
    .populate('userId', 'firstName lastName email')
    .select('-__v')
    .lean();
};

/**
 * Get user activity within a date range
 * @param {String} userId - User ID
 * @param {Object} dateRange - { startDate, endDate }
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - User activity logs
 */
auditLogSchema.statics.getUserActivity = async function (userId, dateRange = {}, options = {}) {
  const { limit = 50, skip = 0, firmId, action, entityType } = options;
  const { startDate, endDate } = dateRange;

  const query = { userId };

  if (firmId) {
    query.firmId = firmId;
  }

  if (action) {
    query.action = action;
  }

  if (entityType) {
    query.$or = [
      { entityType },
      { resourceType: entityType }
    ];
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
 * Get security events (failed logins, suspicious activity, etc.)
 * @param {String} firmId - Firm ID (optional for multi-tenancy)
 * @param {Object} dateRange - { startDate, endDate }
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Security event logs
 */
auditLogSchema.statics.getSecurityEvents = async function (firmId, dateRange = {}, options = {}) {
  const { limit = 100, skip = 0, severity } = options;
  const { startDate, endDate } = dateRange;

  const query = {
    $or: [
      { status: 'suspicious' },
      { status: 'failed' },
      { action: 'login_failed' },
      { action: { $in: ['update_permissions', 'update_role', 'grant_access', 'revoke_access'] } },
      { severity: { $in: ['high', 'critical'] } }
    ]
  };

  if (firmId) {
    query.firmId = firmId;
  }

  if (severity) {
    query.severity = severity;
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
 * Export audit logs with filters
 * @param {Object} filters - Filter criteria
 * @param {String} format - Export format (not implemented here, just returns data)
 * @returns {Promise<Array>} - Filtered audit logs
 */
auditLogSchema.statics.exportAuditLog = async function (filters = {}, format = 'json') {
  const {
    firmId,
    userId,
    action,
    entityType,
    startDate,
    endDate,
    status,
    severity,
    limit = 10000
  } = filters;

  const query = {};

  if (firmId) query.firmId = firmId;
  if (userId) query.userId = userId;
  if (action) query.action = action;
  if (status) query.status = status;
  if (severity) query.severity = severity;

  if (entityType) {
    query.$or = [
      { entityType },
      { resourceType: entityType }
    ];
  }

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'firstName lastName email userName')
    .select('-__v')
    .lean();
};

/**
 * Get suspicious activity
 * @param {Number} limit - Limit results
 * @returns {Promise<Array>} - Suspicious activity logs
 */
auditLogSchema.statics.getSuspiciousActivity = async function (limit = 100) {
  return this.find({ status: 'suspicious' })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'firstName lastName email')
    .select('-__v')
    .lean();
};

/**
 * Get failed login attempts
 * @param {Number} timeWindow - Time window in milliseconds
 * @returns {Promise<Array>} - Failed login attempts
 */
auditLogSchema.statics.getFailedLogins = async function (timeWindow = 3600000) {
  const since = new Date(Date.now() - timeWindow);
  return this.find({
    action: 'login_failed',
    timestamp: { $gte: since },
  })
    .sort({ timestamp: -1 })
    .select('userEmail ipAddress timestamp errorMessage')
    .lean();
};

/**
 * Check for brute force attempts
 * @param {String} identifier - Email or IP address
 * @param {Number} timeWindow - Time window in milliseconds
 * @returns {Promise<Number>} - Number of failed attempts
 */
auditLogSchema.statics.checkBruteForce = async function (identifier, timeWindow = 900000) {
  const since = new Date(Date.now() - timeWindow);

  const query = {
    action: 'login_failed',
    timestamp: { $gte: since },
    $or: [
      { userEmail: identifier },
      { ipAddress: identifier },
    ],
  };

  const failedAttempts = await this.countDocuments(query);
  return failedAttempts;
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
