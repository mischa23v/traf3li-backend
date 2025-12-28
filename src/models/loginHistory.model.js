/**
 * Login History Model
 *
 * Tracks user login history for security monitoring and geographic anomaly detection.
 * Used to detect impossible travel scenarios and suspicious login patterns.
 *
 * Features:
 * - Multi-tenant isolation (firmId)
 * - Geographic location tracking (country, city, lat/lng)
 * - Device fingerprinting
 * - Anomaly detection flags
 * - TTL for automatic cleanup of old records
 */

const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema({
  // ═══════════════════════════════════════════════════════════════
  // USER IDENTIFICATION
  // ═══════════════════════════════════════════════════════════════
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // TENANT ISOLATION (Multi-Tenancy)
  // ═══════════════════════════════════════════════════════════════
  firmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Firm',
    required: false,
    index: true,
  },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
  // ═══════════════════════════════════════════════════════════════
  // NETWORK INFORMATION
  // ═══════════════════════════════════════════════════════════════
  ip: {
    type: String,
    required: true,
    index: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // GEOGRAPHIC LOCATION
  // ═══════════════════════════════════════════════════════════════
  location: {
    country: {
      type: String,
      required: false,
      index: true,
    },
    region: {
      type: String,
      required: false,
    },
    city: {
      type: String,
      required: false,
    },
    lat: {
      type: Number,
      required: false,
    },
    lng: {
      type: Number,
      required: false,
    },
    timezone: {
      type: String,
      required: false,
    },
    // Additional geolocation info
    countryCode: {
      type: String,
      required: false,
    },
    regionCode: {
      type: String,
      required: false,
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // DEVICE INFORMATION
  // ═══════════════════════════════════════════════════════════════
  device: {
    userAgent: {
      type: String,
      required: false,
    },
    deviceType: {
      type: String, // 'mobile', 'desktop', 'tablet', 'unknown'
      required: false,
    },
    os: {
      type: String,
      required: false,
    },
    browser: {
      type: String,
      required: false,
    },
    deviceId: {
      type: String,
      required: false,
    },
    // Device fingerprint for tracking
    fingerprint: {
      type: String,
      required: false,
      index: true,
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // TIMESTAMP
  // ═══════════════════════════════════════════════════════════════
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // SECURITY & ANOMALY DETECTION
  // ═══════════════════════════════════════════════════════════════
  isAnomalous: {
    type: Boolean,
    default: false,
    index: true,
  },

  anomalyDetails: {
    type: {
      type: String, // 'impossible_travel', 'new_country', 'vpn_detected', 'unusual_time'
      required: false,
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      required: false,
    },
    travelSpeed: {
      type: Number, // km/h
      required: false,
    },
    distance: {
      type: Number, // km
      required: false,
    },
    timeDelta: {
      type: Number, // seconds
      required: false,
    },
    previousLocation: {
      country: String,
      city: String,
      lat: Number,
      lng: Number,
    },
    factors: [{
      type: String, // Risk factors like 'impossible_travel', 'new_device', etc.
    }],
  },

  // ═══════════════════════════════════════════════════════════════
  // LOGIN STATUS
  // ═══════════════════════════════════════════════════════════════
  loginStatus: {
    type: String,
    enum: ['success', 'failed', 'blocked', 'mfa_required', 'verification_required'],
    default: 'success',
    required: true,
    index: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // ADDITIONAL SECURITY FLAGS
  // ═══════════════════════════════════════════════════════════════
  isVPN: {
    type: Boolean,
    default: false,
  },

  isProxy: {
    type: Boolean,
    default: false,
  },

  isTor: {
    type: Boolean,
    default: false,
  },

  // ═══════════════════════════════════════════════════════════════
  // VERIFICATION STATUS
  // ═══════════════════════════════════════════════════════════════
  requiresVerification: {
    type: Boolean,
    default: false,
  },

  verificationMethod: {
    type: String,
    enum: ['none', 'email', 'mfa', 'sms'],
    default: 'none',
  },

  verified: {
    type: Boolean,
    default: false,
  },

  verifiedAt: {
    type: Date,
    required: false,
  },

  // ═══════════════════════════════════════════════════════════════
  // RELATED SECURITY INCIDENT
  // ═══════════════════════════════════════════════════════════════
  securityIncidentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SecurityIncident',
    required: false,
  },

}, {
  timestamps: true,
  versionKey: false,
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

// Compound indexes for efficient queries
loginHistorySchema.index({ userId: 1, timestamp: -1 });
loginHistorySchema.index({ userId: 1, isAnomalous: 1, timestamp: -1 });
loginHistorySchema.index({ firmId: 1, timestamp: -1 });
loginHistorySchema.index({ ip: 1, timestamp: -1 });
loginHistorySchema.index({ 'location.country': 1, timestamp: -1 });
loginHistorySchema.index({ loginStatus: 1, timestamp: -1 });

// TTL index: auto-delete login history older than 90 days
loginHistorySchema.index(
  { timestamp: 1 },
  {
    expireAfterSeconds: 7776000, // 90 days
  }
);

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Record a new login attempt
 */
loginHistorySchema.statics.recordLogin = async function(loginData) {
  const loginRecord = new this(loginData);
  await loginRecord.save();
  return loginRecord;
};

/**
 * Get user's recent login history
 */
loginHistorySchema.statics.getUserLoginHistory = async function(userId, limit = 10) {
  return await this.find({
    userId,
    loginStatus: 'success',
    'location.lat': { $exists: true },
    'location.lng': { $exists: true },
  })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

/**
 * Get user's last successful login
 */
loginHistorySchema.statics.getLastSuccessfulLogin = async function(userId) {
  return await this.findOne({
    userId,
    loginStatus: 'success',
  })
    .sort({ timestamp: -1 })
    .lean();
};

/**
 * Get anomalous logins for a user
 */
loginHistorySchema.statics.getAnomalousLogins = async function(userId, options = {}) {
  const query = {
    userId,
    isAnomalous: true,
  };

  if (options.startDate) {
    query.timestamp = { $gte: new Date(options.startDate) };
  }

  const limit = Math.min(options.limit || 50, 500);

  return await this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

/**
 * Get login statistics for a user
 */
loginHistorySchema.statics.getLoginStats = async function(userId, dateRange = {}) {
  const matchQuery = { userId };

  if (dateRange.startDate || dateRange.endDate) {
    matchQuery.timestamp = {};
    if (dateRange.startDate) matchQuery.timestamp.$gte = new Date(dateRange.startDate);
    if (dateRange.endDate) matchQuery.timestamp.$lte = new Date(dateRange.endDate);
  }

  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $facet: {
        total: [{ $count: 'count' }],
        byStatus: [
          { $group: { _id: '$loginStatus', count: { $sum: 1 } } },
        ],
        byCountry: [
          { $group: { _id: '$location.country', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ],
        anomalous: [
          { $match: { isAnomalous: true } },
          { $count: 'count' },
        ],
        uniqueCountries: [
          { $group: { _id: '$location.country' } },
          { $count: 'count' },
        ],
        recentLogins: [
          { $sort: { timestamp: -1 } },
          { $limit: 10 },
        ],
      },
    },
  ]);

  const result = stats[0];

  return {
    total: result.total[0]?.count || 0,
    anomalous: result.anomalous[0]?.count || 0,
    uniqueCountries: result.uniqueCountries[0]?.count || 0,
    byStatus: result.byStatus,
    byCountry: result.byCountry,
    recentLogins: result.recentLogins,
  };
};

/**
 * Get logins from a specific IP
 */
loginHistorySchema.statics.getLoginsByIP = async function(ip, options = {}) {
  const query = { ip };

  if (options.startDate) {
    query.timestamp = { $gte: new Date(options.startDate) };
  }

  const limit = Math.min(options.limit || 100, 1000);

  return await this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'firstName lastName email')
    .lean();
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Mark login as anomalous
 */
loginHistorySchema.methods.markAsAnomalous = async function(anomalyDetails) {
  this.isAnomalous = true;
  this.anomalyDetails = anomalyDetails;
  await this.save();
  return this;
};

/**
 * Mark verification as required
 */
loginHistorySchema.methods.requireVerification = async function(method = 'email') {
  this.requiresVerification = true;
  this.verificationMethod = method;
  await this.save();
  return this;
};

/**
 * Mark as verified
 */
loginHistorySchema.methods.markVerified = async function() {
  this.verified = true;
  this.verifiedAt = new Date();
  await this.save();
  return this;
};

/**
 * Link to security incident
 */
loginHistorySchema.methods.linkToIncident = async function(incidentId) {
  this.securityIncidentId = incidentId;
  await this.save();
  return this;
};

module.exports = mongoose.model('LoginHistory', loginHistorySchema);
