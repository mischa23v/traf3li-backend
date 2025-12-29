/**
 * Consent Model
 *
 * PDPL (Personal Data Protection Law) Compliance
 * Stores user consent records for data processing activities.
 *
 * Features:
 * - Category-based consent tracking
 * - Consent history for audit trail
 * - Version tracking for policy updates
 * - Withdrawal support with data deletion requests
 */

const mongoose = require('mongoose');

// Consent history entry schema
const consentHistorySchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
  },
  granted: {
    type: Boolean,
    required: true,
  },
  version: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  ipAddress: String,
  userAgent: String,
  method: {
    type: String,
    enum: ['explicit', 'implicit', 'withdrawal', 'policy_update'],
    default: 'explicit',
  },
}, { _id: false });

// Main consent schema
const consentSchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Firm reference (for multi-tenancy)
  firmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Firm',
    index: true,
   },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
  // Current consent state by category
  consents: {
    // Essential - always required, cannot be withdrawn
    essential: {
      granted: { type: Boolean, default: true },
      timestamp: { type: Date, default: Date.now },
      version: { type: String, default: '1.0.0' },
    },
    // Analytics - optional
    analytics: {
      granted: { type: Boolean, default: false },
      timestamp: Date,
      version: String,
    },
    // Marketing - optional
    marketing: {
      granted: { type: Boolean, default: false },
      timestamp: Date,
      version: String,
    },
    // Third-party sharing - optional
    thirdParty: {
      granted: { type: Boolean, default: false },
      timestamp: Date,
      version: String,
    },
    // AI/ML processing - optional
    aiProcessing: {
      granted: { type: Boolean, default: false },
      timestamp: Date,
      version: String,
    },
    // Communications preferences
    communications: {
      granted: { type: Boolean, default: true },
      timestamp: { type: Date, default: Date.now },
      version: { type: String, default: '1.0.0' },
    },
  },

  // Consent history for audit trail
  history: [consentHistorySchema],

  // Policy version user has agreed to
  policyVersion: {
    type: String,
    default: '1.0.0',
  },

  // Data deletion request
  deletionRequest: {
    requested: { type: Boolean, default: false },
    requestedAt: Date,
    reason: String,
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'denied'],
    },
    completedAt: Date,
    notes: String,
  },

  // Data export request
  exportRequest: {
    requested: { type: Boolean, default: false },
    requestedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'denied'],
    },
    completedAt: Date,
    downloadUrl: String,
    expiresAt: Date,
  },

  // Last review date
  lastReviewedAt: Date,

  // Next required review (for compliance)
  nextReviewDue: Date,
}, {
  timestamps: true,
});

// Indexes
consentSchema.index({ userId: 1 }, { unique: true });
consentSchema.index({ firmId: 1, updatedAt: -1 });
consentSchema.index({ 'deletionRequest.status': 1 });
consentSchema.index({ 'exportRequest.status': 1 });

// Static methods
consentSchema.statics.getOrCreate = async function(userId, firmId = null) {
  let consent = await this.findOne({ userId });

  if (!consent) {
    consent = await this.create({
      userId,
      firmId,
      consents: {
        essential: { granted: true, timestamp: new Date(), version: '1.0.0' },
        communications: { granted: true, timestamp: new Date(), version: '1.0.0' },
      },
    });
  }

  return consent;
};

consentSchema.statics.updateConsent = async function(userId, category, granted, metadata = {}) {
  const { version = '1.0.0', ipAddress, userAgent } = metadata;

  // Cannot withdraw essential consent
  if (category === 'essential' && !granted) {
    throw new Error('Essential consent cannot be withdrawn');
  }

  const consent = await this.findOne({ userId });
  if (!consent) {
    throw new Error('Consent record not found');
  }

  // Update current consent
  consent.consents[category] = {
    granted,
    timestamp: new Date(),
    version,
  };

  // Add to history
  consent.history.push({
    category,
    granted,
    version,
    timestamp: new Date(),
    ipAddress,
    userAgent,
    method: granted ? 'explicit' : 'withdrawal',
  });

  await consent.save();
  return consent;
};

consentSchema.statics.withdrawAll = async function(userId, metadata = {}) {
  const { ipAddress, userAgent, reason } = metadata;

  const consent = await this.findOne({ userId });
  if (!consent) {
    throw new Error('Consent record not found');
  }

  // Withdraw all non-essential consents
  const categories = ['analytics', 'marketing', 'thirdParty', 'aiProcessing'];
  const timestamp = new Date();

  for (const category of categories) {
    if (consent.consents[category]?.granted) {
      consent.consents[category] = {
        granted: false,
        timestamp,
        version: consent.consents[category].version,
      };

      consent.history.push({
        category,
        granted: false,
        version: consent.consents[category].version || '1.0.0',
        timestamp,
        ipAddress,
        userAgent,
        method: 'withdrawal',
      });
    }
  }

  // Request data deletion
  consent.deletionRequest = {
    requested: true,
    requestedAt: timestamp,
    reason,
    status: 'pending',
  };

  await consent.save();
  return consent;
};

const Consent = mongoose.model('Consent', consentSchema);

module.exports = Consent;
