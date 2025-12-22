/**
 * Temporary IP Allowance Model
 * Stores temporary IP whitelisting with expiration
 *
 * Use cases:
 * - Remote work from temporary locations (24h, 7d, 30d)
 * - Business travel access
 * - Emergency access from new locations
 */

const mongoose = require('mongoose');

const temporaryIPAllowanceSchema = new mongoose.Schema(
  {
    // Firm this allowance belongs to
    firmId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Firm',
      required: true,
      index: true
    },

    // IP address (normalized)
    ipAddress: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    // Description/reason for temporary access
    description: {
      type: String,
      trim: true,
      default: null
    },

    // Expiration date/time
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },

    // Duration in hours (for reference)
    durationHours: {
      type: Number,
      required: true,
      enum: [24, 168, 720] // 1 day, 7 days, 30 days
    },

    // Who created this allowance
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Active status (can be manually revoked)
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    // Revocation details (if manually revoked)
    revokedAt: {
      type: Date,
      default: null
    },

    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    revocationReason: {
      type: String,
      default: null
    },

    // Usage tracking
    lastUsedAt: {
      type: Date,
      default: null
    },

    usageCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

// Compound index for quick lookups
temporaryIPAllowanceSchema.index({ firmId: 1, ipAddress: 1, expiresAt: 1 });

// Index for cleanup of expired allowances
temporaryIPAllowanceSchema.index({ expiresAt: 1, isActive: 1 });

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if allowance is still valid
 */
temporaryIPAllowanceSchema.methods.isValid = function() {
  return this.isActive && this.expiresAt > new Date();
};

/**
 * Revoke the allowance
 */
temporaryIPAllowanceSchema.methods.revoke = async function(userId, reason = null) {
  this.isActive = false;
  this.revokedAt = new Date();
  this.revokedBy = userId;
  this.revocationReason = reason;
  await this.save();
  return this;
};

/**
 * Record usage of this allowance
 */
temporaryIPAllowanceSchema.methods.recordUsage = async function() {
  this.lastUsedAt = new Date();
  this.usageCount += 1;
  await this.save();
  return this;
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Find active allowances for a firm
 */
temporaryIPAllowanceSchema.statics.findActiveFirmAllowances = async function(firmId) {
  return this.find({
    firmId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  })
    .populate('createdBy', 'firstName lastName email')
    .populate('revokedBy', 'firstName lastName email')
    .sort({ createdAt: -1 });
};

/**
 * Find allowance for specific IP and firm
 */
temporaryIPAllowanceSchema.statics.findForIP = async function(firmId, ipAddress) {
  return this.findOne({
    firmId,
    ipAddress,
    isActive: true,
    expiresAt: { $gt: new Date() }
  });
};

/**
 * Cleanup expired allowances (for cron job)
 */
temporaryIPAllowanceSchema.statics.cleanupExpired = async function() {
  const result = await this.updateMany(
    {
      isActive: true,
      expiresAt: { $lt: new Date() }
    },
    {
      $set: { isActive: false }
    }
  );

  console.log(`Cleaned up ${result.modifiedCount} expired IP allowances`);
  return result;
};

/**
 * Get expiring soon allowances (for notifications)
 */
temporaryIPAllowanceSchema.statics.findExpiringSoon = async function(hoursAhead = 24) {
  const now = new Date();
  const threshold = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  return this.find({
    isActive: true,
    expiresAt: { $gt: now, $lt: threshold }
  })
    .populate('firmId', 'name')
    .populate('createdBy', 'firstName lastName email');
};

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

// Auto-deactivate on expiration (pre-find middleware)
temporaryIPAllowanceSchema.pre(/^find/, function(next) {
  // Automatically exclude expired allowances unless explicitly querying for them
  if (!this.getQuery().includeExpired) {
    this.where({
      $or: [
        { expiresAt: { $gt: new Date() } },
        { isActive: false }
      ]
    });
  }
  next();
});

module.exports = mongoose.model('TemporaryIPAllowance', temporaryIPAllowanceSchema);
