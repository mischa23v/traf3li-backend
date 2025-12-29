/**
 * Security Incident Model
 *
 * Tracks and manages security incidents and threats detected by the security monitoring system.
 * Supports incident lifecycle management from detection to resolution.
 *
 * Features:
 * - Multi-tenant isolation (firmId)
 * - Comprehensive incident types (brute force, account takeover, suspicious login, etc.)
 * - Severity levels (low, medium, high, critical)
 * - Status tracking (open, investigating, resolved, false_positive)
 * - Detailed incident information and resolution tracking
 * - Automatic timestamps
 */

const mongoose = require('mongoose');

const securityIncidentSchema = new mongoose.Schema({
  // ═══════════════════════════════════════════════════════════════
  // TENANT ISOLATION (Multi-Tenancy)
  // ═══════════════════════════════════════════════════════════════
  firmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Firm',
    required: true,
    index: true,
   },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
  // ═══════════════════════════════════════════════════════════════
  // INCIDENT CLASSIFICATION
  // ═══════════════════════════════════════════════════════════════
  type: {
    type: String,
    enum: [
      'brute_force',           // Multiple failed login attempts
      'account_takeover',      // Suspicious account access pattern
      'suspicious_login',      // Login from unusual location/device
      'permission_escalation', // Unauthorized privilege change attempt
      'data_exfiltration',     // Bulk data export or suspicious data access
      'unauthorized_access',   // Access to resources without permission
      'multiple_sessions',     // Multiple concurrent sessions from different locations
      'password_change',       // Suspicious password change
      'mfa_bypass',           // MFA bypass attempt
      'session_hijacking',    // Session token manipulation detected
      'api_abuse',            // Unusual API usage patterns
      'rate_limit_exceeded',  // Rate limiting threshold exceeded
    ],
    required: true,
    index: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // SEVERITY LEVEL
  // ═══════════════════════════════════════════════════════════════
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
    index: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // INCIDENT STATUS
  // ═══════════════════════════════════════════════════════════════
  status: {
    type: String,
    enum: ['open', 'investigating', 'resolved', 'false_positive'],
    default: 'open',
    required: true,
    index: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // AFFECTED USER/RESOURCE
  // ═══════════════════════════════════════════════════════════════
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true,
  },
  userEmail: {
    type: String,
    required: false,
    index: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // SOURCE INFORMATION
  // ═══════════════════════════════════════════════════════════════
  ip: {
    type: String,
    required: false,
    index: true,
  },
  userAgent: {
    type: String,
    required: false,
  },
  location: {
    country: { type: String },
    region: { type: String },
    city: { type: String },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
  },
  device: {
    type: { type: String }, // mobile, desktop, tablet
    os: { type: String },
    browser: { type: String },
  },

  // ═══════════════════════════════════════════════════════════════
  // INCIDENT DETAILS
  // ═══════════════════════════════════════════════════════════════
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },

  // Description of the incident
  description: {
    type: String,
    required: false,
  },

  // Risk score (0-100)
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },

  // Related entities
  relatedEntities: [{
    entityType: { type: String },
    entityId: { type: mongoose.Schema.Types.ObjectId },
  }],

  // ═══════════════════════════════════════════════════════════════
  // DETECTION INFORMATION
  // ═══════════════════════════════════════════════════════════════
  detectionMethod: {
    type: String,
    enum: ['automatic', 'manual', 'third_party'],
    default: 'automatic',
  },

  detectedAt: {
    type: Date,
    default: Date.now,
    required: true,
    index: true,
  },

  detectedBy: {
    type: String, // 'system', 'admin:userId', 'integration:name'
    default: 'system',
  },

  // ═══════════════════════════════════════════════════════════════
  // RESOLUTION INFORMATION
  // ═══════════════════════════════════════════════════════════════
  resolvedAt: {
    type: Date,
    required: false,
  },

  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },

  resolution: {
    type: String,
    required: false,
  },

  // Actions taken to resolve the incident
  actions: [{
    action: { type: String, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    performedAt: { type: Date, default: Date.now },
    notes: { type: String },
  }],

  // ═══════════════════════════════════════════════════════════════
  // NOTIFICATION TRACKING
  // ═══════════════════════════════════════════════════════════════
  notificationsSent: {
    email: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
      recipients: [{ type: String }],
    },
    webhook: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
      webhookIds: [{ type: mongoose.Schema.Types.ObjectId }],
    },
    websocket: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
    },
    sms: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════
  tags: [{ type: String }],

  notes: [{
    note: { type: String },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now },
  }],

  // Flag for incidents that need immediate attention
  requiresAttention: {
    type: Boolean,
    default: false,
  },

  // Flag for incidents that have been acknowledged
  acknowledged: {
    type: Boolean,
    default: false,
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  acknowledgedAt: {
    type: Date,
  },

}, {
  timestamps: true,
  versionKey: false,
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
securityIncidentSchema.index({ firmId: 1, status: 1, detectedAt: -1 });
securityIncidentSchema.index({ firmId: 1, type: 1, severity: 1 });
securityIncidentSchema.index({ firmId: 1, userId: 1, detectedAt: -1 });
securityIncidentSchema.index({ ip: 1, detectedAt: -1 });
securityIncidentSchema.index({ status: 1, severity: 1, detectedAt: -1 });

// TTL index: auto-delete resolved incidents older than 2 years
securityIncidentSchema.index(
  { resolvedAt: 1 },
  {
    expireAfterSeconds: 63072000, // 2 years
    partialFilterExpression: { status: 'resolved' }
  }
);

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new security incident
 */
securityIncidentSchema.statics.createIncident = async function(incidentData) {
  const incident = new this(incidentData);
  await incident.save();
  return incident;
};

/**
 * Get incidents with filters
 */
securityIncidentSchema.statics.getIncidents = async function(firmId, filters = {}) {
  const query = { firmId };

  if (filters.type) query.type = filters.type;
  if (filters.severity) query.severity = filters.severity;
  if (filters.status) query.status = filters.status;
  if (filters.userId) query.userId = filters.userId;
  if (filters.ip) query.ip = filters.ip;

  if (filters.startDate || filters.endDate) {
    query.detectedAt = {};
    if (filters.startDate) query.detectedAt.$gte = new Date(filters.startDate);
    if (filters.endDate) query.detectedAt.$lte = new Date(filters.endDate);
  }

  const limit = Math.min(filters.limit || 100, 1000);
  const skip = filters.skip || 0;
  const sort = filters.sort || { detectedAt: -1 };

  const incidents = await this.find(query)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .populate('userId', 'firstName lastName email')
    .populate('resolvedBy', 'firstName lastName email')
    .lean();

  const total = await this.countDocuments(query);

  return {
    incidents,
    total,
    page: Math.floor(skip / limit) + 1,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Get incident statistics
 */
securityIncidentSchema.statics.getStats = async function(firmId, dateRange = {}) {
  const matchQuery = { firmId };

  if (dateRange.startDate || dateRange.endDate) {
    matchQuery.detectedAt = {};
    if (dateRange.startDate) matchQuery.detectedAt.$gte = new Date(dateRange.startDate);
    if (dateRange.endDate) matchQuery.detectedAt.$lte = new Date(dateRange.endDate);
  }

  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $facet: {
        byType: [
          { $group: { _id: '$type', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        bySeverity: [
          { $group: { _id: '$severity', count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ],
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ],
        total: [
          { $count: 'count' }
        ],
        criticalOpen: [
          { $match: { severity: 'critical', status: { $in: ['open', 'investigating'] } } },
          { $count: 'count' }
        ],
        recentIncidents: [
          { $sort: { detectedAt: -1 } },
          { $limit: 10 },
          {
            $project: {
              type: 1,
              severity: 1,
              status: 1,
              detectedAt: 1,
              userId: 1,
              ip: 1,
            }
          }
        ],
        avgResolutionTime: [
          { $match: { status: 'resolved', resolvedAt: { $exists: true } } },
          {
            $project: {
              resolutionTime: {
                $subtract: ['$resolvedAt', '$detectedAt']
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
    criticalOpen: result.criticalOpen[0]?.count || 0,
    byType: result.byType,
    bySeverity: result.bySeverity,
    byStatus: result.byStatus,
    recentIncidents: result.recentIncidents,
    avgResolutionTimeMs: result.avgResolutionTime[0]?.avgResolutionTime || null,
  };
};

/**
 * Get open incidents requiring attention
 */
securityIncidentSchema.statics.getOpenIncidents = async function(firmId, options = {}) {
  const query = {
    firmId,
    status: { $in: ['open', 'investigating'] },
  };

  if (options.severity) {
    query.severity = options.severity;
  }

  const limit = Math.min(options.limit || 50, 500);

  return await this.find(query)
    .sort({ severity: -1, detectedAt: -1 })
    .limit(limit)
    .populate('userId', 'firstName lastName email')
    .lean();
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Update incident status
 */
securityIncidentSchema.methods.updateStatus = async function(status, userId = null, notes = null) {
  this.status = status;

  if (status === 'resolved') {
    this.resolvedAt = new Date();
    this.resolvedBy = userId;
  }

  if (notes) {
    this.actions.push({
      action: `Status changed to ${status}`,
      performedBy: userId,
      notes,
    });
  }

  await this.save();
  return this;
};

/**
 * Add action to incident
 */
securityIncidentSchema.methods.addAction = async function(action, performedBy, notes = null) {
  this.actions.push({
    action,
    performedBy,
    notes,
  });

  await this.save();
  return this;
};

/**
 * Acknowledge incident
 */
securityIncidentSchema.methods.acknowledge = async function(userId) {
  this.acknowledged = true;
  this.acknowledgedBy = userId;
  this.acknowledgedAt = new Date();

  await this.save();
  return this;
};

/**
 * Add note to incident
 */
securityIncidentSchema.methods.addNote = async function(note, userId) {
  this.notes.push({
    note,
    addedBy: userId,
  });

  await this.save();
  return this;
};

/**
 * Mark notification as sent
 */
securityIncidentSchema.methods.markNotificationSent = async function(channel, metadata = {}) {
  if (this.notificationsSent[channel]) {
    this.notificationsSent[channel].sent = true;
    this.notificationsSent[channel].sentAt = new Date();

    if (metadata.recipients) {
      this.notificationsSent[channel].recipients = metadata.recipients;
    }
    if (metadata.webhookIds) {
      this.notificationsSent[channel].webhookIds = metadata.webhookIds;
    }
  }

  await this.save();
  return this;
};

module.exports = mongoose.model('SecurityIncident', securityIncidentSchema);
