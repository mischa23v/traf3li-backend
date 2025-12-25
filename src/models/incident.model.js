/**
 * Incident Model
 *
 * Tracks system incidents and outages for the status page.
 * Manages incident lifecycle from investigation to resolution.
 *
 * Features:
 * - Multi-tenant isolation (firmId)
 * - Bilingual support (English and Arabic)
 * - Status tracking (investigating, identified, monitoring, resolved)
 * - Impact levels (none, minor, major, critical)
 * - Affected components tracking
 * - Incident updates timeline
 * - Public visibility control
 * - Postmortem documentation
 */

const mongoose = require('mongoose');

const incidentUpdateSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
    trim: true
  },

  messageAr: {
    type: String,
    trim: true
  },

  status: {
    type: String,
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { _id: true, versionKey: false });

const incidentSchema = new mongoose.Schema({
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
  // INCIDENT IDENTIFICATION
  // ═══════════════════════════════════════════════════════════════
  title: {
    type: String,
    required: true,
    trim: true
  },

  titleAr: {
    type: String,
    trim: true
  },

  description: {
    type: String,
    trim: true
  },

  descriptionAr: {
    type: String,
    trim: true
  },

  // ═══════════════════════════════════════════════════════════════
  // INCIDENT STATUS
  // ═══════════════════════════════════════════════════════════════
  status: {
    type: String,
    enum: ['investigating', 'identified', 'monitoring', 'resolved'],
    default: 'investigating',
    required: true,
    index: true
  },

  // ═══════════════════════════════════════════════════════════════
  // IMPACT LEVEL
  // ═══════════════════════════════════════════════════════════════
  impact: {
    type: String,
    enum: ['none', 'minor', 'major', 'critical'],
    default: 'minor',
    required: true,
    index: true
  },

  // ═══════════════════════════════════════════════════════════════
  // AFFECTED COMPONENTS
  // ═══════════════════════════════════════════════════════════════
  affectedComponents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SystemComponent'
  }],

  // ═══════════════════════════════════════════════════════════════
  // TIMELINE
  // ═══════════════════════════════════════════════════════════════
  startedAt: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },

  resolvedAt: {
    type: Date,
    index: true
  },

  // ═══════════════════════════════════════════════════════════════
  // INCIDENT UPDATES
  // ═══════════════════════════════════════════════════════════════
  updates: [incidentUpdateSchema],

  // ═══════════════════════════════════════════════════════════════
  // VISIBILITY
  // ═══════════════════════════════════════════════════════════════
  isPublic: {
    type: Boolean,
    default: true,
    index: true
  },

  // ═══════════════════════════════════════════════════════════════
  // POST-INCIDENT DOCUMENTATION
  // ═══════════════════════════════════════════════════════════════
  postmortemUrl: {
    type: String,
    trim: true
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
incidentSchema.index({ firmId: 1, status: 1, startedAt: -1 });
incidentSchema.index({ firmId: 1, impact: 1, startedAt: -1 });
incidentSchema.index({ firmId: 1, isPublic: 1, startedAt: -1 });
incidentSchema.index({ isPublic: 1, status: 1, startedAt: -1 });
incidentSchema.index({ affectedComponents: 1, startedAt: -1 });
incidentSchema.index({ status: 1, resolvedAt: 1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUAL FIELDS
// ═══════════════════════════════════════════════════════════════
incidentSchema.virtual('duration').get(function() {
  if (this.resolvedAt) {
    return this.resolvedAt - this.startedAt;
  }
  return Date.now() - this.startedAt;
});

incidentSchema.virtual('isActive').get(function() {
  return this.status !== 'resolved';
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get active incidents
 */
incidentSchema.statics.getActiveIncidents = async function(firmId = null) {
  const query = {
    status: { $ne: 'resolved' },
    isPublic: true
  };
  if (firmId) query.firmId = firmId;

  return await this.find(query)
    .sort({ impact: -1, startedAt: -1 })
    .populate('affectedComponents', 'name category status')
    .populate('createdBy', 'firstName lastName')
    .lean();
};

/**
 * Get recent incidents
 */
incidentSchema.statics.getRecentIncidents = async function(firmId = null, limit = 10) {
  const query = { isPublic: true };
  if (firmId) query.firmId = firmId;

  return await this.find(query)
    .sort({ startedAt: -1 })
    .limit(limit)
    .populate('affectedComponents', 'name category')
    .lean();
};

/**
 * Get incidents by component
 */
incidentSchema.statics.getByComponent = async function(componentId, firmId = null) {
  const query = { affectedComponents: componentId };
  if (firmId) query.firmId = firmId;

  return await this.find(query)
    .sort({ startedAt: -1 })
    .lean();
};

/**
 * Get incident statistics
 */
incidentSchema.statics.getStats = async function(firmId = null, dateRange = {}) {
  const matchQuery = {};
  if (firmId) matchQuery.firmId = firmId;

  if (dateRange.startDate || dateRange.endDate) {
    matchQuery.startedAt = {};
    if (dateRange.startDate) matchQuery.startedAt.$gte = new Date(dateRange.startDate);
    if (dateRange.endDate) matchQuery.startedAt.$lte = new Date(dateRange.endDate);
  }

  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $facet: {
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ],
        byImpact: [
          { $group: { _id: '$impact', count: { $sum: 1 } } }
        ],
        total: [
          { $count: 'count' }
        ],
        avgResolutionTime: [
          { $match: { status: 'resolved', resolvedAt: { $exists: true } } },
          {
            $project: {
              resolutionTime: {
                $subtract: ['$resolvedAt', '$startedAt']
              }
            }
          },
          {
            $group: {
              _id: null,
              avgResolutionTime: { $avg: '$resolutionTime' }
            }
          }
        ]
      }
    }
  ]);

  const result = stats[0];

  return {
    total: result.total[0]?.count || 0,
    byStatus: result.byStatus,
    byImpact: result.byImpact,
    avgResolutionTimeMs: result.avgResolutionTime[0]?.avgResolutionTime || null
  };
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Add update to incident
 */
incidentSchema.methods.addUpdate = async function(updateData, userId = null) {
  this.updates.push({
    message: updateData.message,
    messageAr: updateData.messageAr,
    status: updateData.status || this.status,
    createdBy: userId,
    createdAt: new Date()
  });

  if (updateData.status) {
    this.status = updateData.status;
  }

  this.updatedBy = userId;
  await this.save();
  return this;
};

/**
 * Resolve incident
 */
incidentSchema.methods.resolve = async function(resolutionMessage, userId = null) {
  this.status = 'resolved';
  this.resolvedAt = new Date();

  if (resolutionMessage) {
    await this.addUpdate({
      message: resolutionMessage,
      status: 'resolved'
    }, userId);
  }

  this.updatedBy = userId;
  await this.save();
  return this;
};

/**
 * Add affected component
 */
incidentSchema.methods.addAffectedComponent = async function(componentId, userId = null) {
  if (!this.affectedComponents.includes(componentId)) {
    this.affectedComponents.push(componentId);
    this.updatedBy = userId;
    await this.save();
  }
  return this;
};

/**
 * Remove affected component
 */
incidentSchema.methods.removeAffectedComponent = async function(componentId, userId = null) {
  this.affectedComponents = this.affectedComponents.filter(
    id => id.toString() !== componentId.toString()
  );
  this.updatedBy = userId;
  await this.save();
  return this;
};

incidentSchema.set('toJSON', { virtuals: true });
incidentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Incident', incidentSchema);
