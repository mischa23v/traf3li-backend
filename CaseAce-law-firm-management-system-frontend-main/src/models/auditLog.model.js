const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    // Who performed the action
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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

    // What action was performed
    action: {
      type: String,
      required: true,
      enum: [
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
        
        // User actions
        'view_profile',
        'update_profile',
        'delete_user',
        'ban_user',
        'unban_user',
        'verify_lawyer',
        
        // Payment actions
        'create_payment',
        'refund_payment',
        'view_invoice',
        'generate_invoice',
        
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
        'token_refresh',
        
        // Sensitive data access
        'access_sensitive_data',
        'export_data',
      ],
    },

    // What resource was affected
    resourceType: {
      type: String,
      enum: [
        'User',
        'Case',
        'Document',
        'Judgment',
        'Invoice',
        'Payment',
        'Order',
        'Message',
        'System',
      ],
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    resourceName: {
      type: String, // Human-readable name
    },

    // Additional details
    details: {
      type: mongoose.Schema.Types.Mixed, // Flexible for different action types
    },

    // Request metadata
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
    },
    
    // Request details
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    },
    endpoint: {
      type: String,
    },

    // Status
    status: {
      type: String,
      enum: ['success', 'failed', 'suspicious'],
      default: 'success',
    },
    errorMessage: {
      type: String,
    },

    // Timestamp
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast querying (important for audit reports)
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });
auditLogSchema.index({ status: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 }); // For date range queries

// TTL index: Auto-delete logs older than 7 years (PDPL retention requirement)
// Saudi PDPL requires keeping logs for regulatory period
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 365 * 24 * 60 * 60 });

// Static method to create audit log
auditLogSchema.statics.log = async function (logData) {
  try {
    const log = new this(logData);
    await log.save();
    return log;
  } catch (error) {
    // Don't let audit log failure break the main operation
    console.error('❌ Audit log creation failed:', error.message);
    return null;
  }
};

// Static method to get user activity
auditLogSchema.statics.getUserActivity = async function (userId, limit = 50) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .select('-__v');
};

// Static method to get suspicious activity
auditLogSchema.statics.getSuspiciousActivity = async function (limit = 100) {
  return this.find({ status: 'suspicious' })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'name email role');
};

// Static method to get failed login attempts
auditLogSchema.statics.getFailedLogins = async function (timeWindow = 3600000) {
  // Default: last 1 hour
  const since = new Date(Date.now() - timeWindow);
  return this.find({
    action: 'login_failed',
    timestamp: { $gte: since },
  })
    .sort({ timestamp: -1 })
    .select('userEmail ipAddress timestamp');
};

// Static method to check for brute force attempts
auditLogSchema.statics.checkBruteForce = async function (identifier, timeWindow = 900000) {
  // identifier can be email or IP
  // Default: 15 minutes
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
