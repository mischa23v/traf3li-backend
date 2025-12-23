const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Case-specific Audit Log Model
 * Tracks all changes to cases and their related resources (documents, hearings, notes, claims, timeline)
 * Designed for legal practice management audit trail requirements
 */
const caseAuditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['create', 'update', 'delete', 'view'],
    required: true
  },
  resource: {
    type: String,
    enum: ['case', 'document', 'hearing', 'note', 'claim', 'timeline'],
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  caseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: true,
    index: true
  },
  changes: {
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed }
  },
  metadata: {
    ip: String,
    userAgent: String
  }
}, {
  timestamps: true
});

// Index for efficient querying by case
caseAuditLogSchema.index({ caseId: 1, createdAt: -1 });

// Index for user activity
caseAuditLogSchema.index({ userId: 1, createdAt: -1 });

// Index for resource type queries
caseAuditLogSchema.index({ resource: 1, createdAt: -1 });

// Compound index for case + resource type
caseAuditLogSchema.index({ caseId: 1, resource: 1, createdAt: -1 });

// TTL index: Auto-delete logs older than 7 years (legal retention requirement)
caseAuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 365 * 24 * 60 * 60 });

// Virtual for timestamp (frontend expects 'timestamp')
caseAuditLogSchema.virtual('timestamp').get(function() {
  return this.createdAt;
});

caseAuditLogSchema.set('toJSON', { virtuals: true });
caseAuditLogSchema.set('toObject', { virtuals: true });

/**
 * Static method to create audit log entry
 * @param {Object} logData - The audit log data
 * @returns {Promise<Object>} - The created log entry
 */
caseAuditLogSchema.statics.log = async function(logData) {
  try {
    const entry = new this(logData);
    await entry.save();
    return entry;
  } catch (error) {
    logger.error('❌ Case audit log error:', error.message);
    // Don't throw - audit logging shouldn't break main operations
    return null;
  }
};

/**
 * Static method to get audit history for a case
 * @param {ObjectId} caseId - The case ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Logs and pagination info
 */
caseAuditLogSchema.statics.getCaseHistory = async function(caseId, options = {}) {
  const { page = 1, limit = 50, resource = null, action = null } = options;

  const query = { caseId };
  if (resource) query.resource = resource;
  if (action) query.action = action;

  const [logs, total] = await Promise.all([
    this.find(query)
      .populate('userId', 'firstName lastName username email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    this.countDocuments(query)
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Static method to get recent activity for a user across all their cases
 * @param {ObjectId} userId - The user ID
 * @param {number} limit - Number of entries to return
 * @returns {Promise<Array>} - Recent activity entries
 */
caseAuditLogSchema.statics.getUserActivity = async function(userId, limit = 50) {
  return this.find({ userId })
    .populate('caseId', 'title caseNumber')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

module.exports = mongoose.model('CaseAuditLog', caseAuditLogSchema);
