/**
 * System Component Model
 *
 * Represents individual system components for the status page monitoring system.
 * Tracks operational status, health checks, and uptime metrics for each component.
 *
 * Features:
 * - Multi-tenant isolation (firmId)
 * - Component categorization (core, api, integration, database, storage, third_party)
 * - Real-time status tracking (operational, degraded, partial_outage, major_outage, maintenance)
 * - Health check monitoring with response time tracking
 * - Uptime percentage calculation
 * - Public visibility control
 * - Display ordering
 */

const mongoose = require('mongoose');

const systemComponentSchema = new mongoose.Schema({
  // ═══════════════════════════════════════════════════════════════
  // TENANT ISOLATION (Multi-Tenancy)
  // ═══════════════════════════════════════════════════════════════
  firmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Firm',
    required: false,
    index: true
  },

  // ═══════════════════════════════════════════════════════════════
  // COMPONENT IDENTIFICATION
  // ═══════════════════════════════════════════════════════════════
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },

  description: {
    type: String,
    trim: true
  },

  // ═══════════════════════════════════════════════════════════════
  // COMPONENT CLASSIFICATION
  // ═══════════════════════════════════════════════════════════════
  category: {
    type: String,
    enum: ['core', 'api', 'integration', 'database', 'storage', 'third_party'],
    required: true,
    index: true
  },

  // ═══════════════════════════════════════════════════════════════
  // STATUS TRACKING
  // ═══════════════════════════════════════════════════════════════
  status: {
    type: String,
    enum: ['operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance'],
    default: 'operational',
    required: true,
    index: true
  },

  // ═══════════════════════════════════════════════════════════════
  // VISIBILITY
  // ═══════════════════════════════════════════════════════════════
  isPublic: {
    type: Boolean,
    default: true,
    index: true
  },

  // ═══════════════════════════════════════════════════════════════
  // HEALTH CHECK CONFIGURATION
  // ═══════════════════════════════════════════════════════════════
  healthCheckUrl: {
    type: String,
    trim: true
  },

  lastCheckedAt: {
    type: Date,
    index: true
  },

  // ═══════════════════════════════════════════════════════════════
  // PERFORMANCE METRICS
  // ═══════════════════════════════════════════════════════════════
  responseTime: {
    type: Number,
    default: 0,
    min: 0
  },

  uptimePercent: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },

  // ═══════════════════════════════════════════════════════════════
  // DISPLAY CONFIGURATION
  // ═══════════════════════════════════════════════════════════════
  order: {
    type: Number,
    default: 0,
    index: true
  },

  // ═══════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
systemComponentSchema.index({ firmId: 1, category: 1, order: 1 });
systemComponentSchema.index({ firmId: 1, status: 1 });
systemComponentSchema.index({ firmId: 1, isPublic: 1, order: 1 });
systemComponentSchema.index({ isPublic: 1, status: 1, order: 1 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all public components
 */
systemComponentSchema.statics.getPublicComponents = async function(firmId = null) {
  const query = { isPublic: true };
  if (firmId) query.firmId = firmId;

  return await this.find(query)
    .sort({ order: 1, name: 1 })
    .select('-createdBy -updatedBy')
    .lean();
};

/**
 * Get components by category
 */
systemComponentSchema.statics.getByCategory = async function(category, firmId = null) {
  const query = { category };
  if (firmId) query.firmId = firmId;

  return await this.find(query)
    .sort({ order: 1, name: 1 })
    .lean();
};

/**
 * Get components by status
 */
systemComponentSchema.statics.getByStatus = async function(status, firmId = null) {
  const query = { status };
  if (firmId) query.firmId = firmId;

  return await this.find(query)
    .sort({ order: 1, name: 1 })
    .lean();
};

/**
 * Get system health summary
 */
systemComponentSchema.statics.getHealthSummary = async function(firmId = null) {
  const matchQuery = {};
  if (firmId) matchQuery.firmId = firmId;

  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgUptime: { $avg: '$uptimePercent' },
        avgResponseTime: { $avg: '$responseTime' }
      }
    }
  ]);

  const total = await this.countDocuments(matchQuery);

  return {
    total,
    byStatus: stats,
    overallUptime: stats.reduce((sum, s) => sum + (s.avgUptime || 0), 0) / (stats.length || 1)
  };
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Update component status
 */
systemComponentSchema.methods.updateStatus = async function(status, userId = null) {
  this.status = status;
  this.updatedBy = userId;
  await this.save();
  return this;
};

/**
 * Record health check result
 */
systemComponentSchema.methods.recordHealthCheck = async function(responseTime, success = true) {
  this.lastCheckedAt = new Date();
  this.responseTime = responseTime;

  // Update uptime percentage (simple rolling calculation)
  // In production, you'd want a more sophisticated uptime calculation
  if (success) {
    this.uptimePercent = Math.min(100, this.uptimePercent + 0.1);
  } else {
    this.uptimePercent = Math.max(0, this.uptimePercent - 1);
  }

  await this.save();
  return this;
};

module.exports = mongoose.model('SystemComponent', systemComponentSchema);
