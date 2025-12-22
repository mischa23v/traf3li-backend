/**
 * Revoked Token Model
 *
 * Tracks blacklisted JWT tokens for token revocation mechanism.
 * Supports Redis-first approach with MongoDB as persistent backup.
 *
 * Use Cases:
 * - User logout (single device)
 * - Logout all devices
 * - Password change (revoke all existing tokens)
 * - Security incidents (admin/system revocation)
 * - Account suspension
 *
 * Security Features:
 * - SHA-256 hashed tokens (never store plaintext tokens)
 * - TTL index for automatic cleanup
 * - Audit trail integration
 */

const mongoose = require('mongoose');

const revokedTokenSchema = new mongoose.Schema(
  {
    // ═══════════════════════════════════════════════════════════════
    // TOKEN IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════

    // SHA-256 hash of the token (never store plaintext tokens)
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    // Token family ID (optional - for refresh token rotation)
    tokenFamily: {
      type: String,
      index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // USER CONTEXT
    // ═══════════════════════════════════════════════════════════════

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    userEmail: {
      type: String,
      required: true
    },

    // ═══════════════════════════════════════════════════════════════
    // TENANT ISOLATION (Multi-tenancy)
    // ═══════════════════════════════════════════════════════════════

    firmId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Firm',
      index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // REVOCATION DETAILS
    // ═══════════════════════════════════════════════════════════════

    // Reason for revocation
    reason: {
      type: String,
      enum: [
        'logout',              // Normal user logout (single device)
        'logout_all',          // User logged out from all devices
        'password_change',     // Password was changed
        'security_incident',   // Security breach detected
        'admin_revoke',        // Admin manually revoked
        'account_suspended',   // Account was suspended
        'account_deleted',     // Account was deleted
        'token_expired',       // Token expired (manual revocation)
        'session_timeout',     // Session timeout
        'role_change',         // User role changed
        'permissions_change'   // User permissions changed
      ],
      required: true,
      index: true
    },

    // Who revoked the token
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    // Revocation timestamp
    revokedAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // TOKEN EXPIRY (for TTL cleanup)
    // ═══════════════════════════════════════════════════════════════

    // Original token expiration date
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // REQUEST METADATA (for security audit)
    // ═══════════════════════════════════════════════════════════════

    ipAddress: {
      type: String
    },

    userAgent: {
      type: String
    },

    // Device/session identifier
    deviceId: {
      type: String
    },

    // ═══════════════════════════════════════════════════════════════
    // ADDITIONAL CONTEXT
    // ═══════════════════════════════════════════════════════════════

    metadata: {
      type: mongoose.Schema.Types.Mixed
    },

    notes: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// ═══════════════════════════════════════════════════════════════
// INDEXES FOR PERFORMANCE
// ═══════════════════════════════════════════════════════════════

// Primary lookup index - check if token is revoked (CRITICAL for performance)
revokedTokenSchema.index({ tokenHash: 1 }, { unique: true });

// User-based queries
revokedTokenSchema.index({ userId: 1, revokedAt: -1 });
revokedTokenSchema.index({ userId: 1, reason: 1 });

// Firm-based queries (multi-tenancy)
revokedTokenSchema.index({ firmId: 1, revokedAt: -1 });

// Reason-based queries
revokedTokenSchema.index({ reason: 1, revokedAt: -1 });

// TTL index - auto-delete revoked tokens after they expire
// This keeps the blacklist clean and performant
revokedTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

// Compound index for admin queries
revokedTokenSchema.index({ revokedAt: -1, reason: 1 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a token hash is revoked
 * @param {String} tokenHash - SHA-256 hash of the token
 * @returns {Promise<Boolean>} - True if revoked
 */
revokedTokenSchema.statics.isRevoked = async function(tokenHash) {
  try {
    const exists = await this.exists({ tokenHash });
    return !!exists;
  } catch (error) {
    console.error('RevokedToken.isRevoked error:', error.message);
    // On error, fail open (don't block valid tokens due to DB issues)
    // But log this as it's a security concern
    return false;
  }
};

/**
 * Revoke a token
 * @param {Object} data - Revocation data
 * @returns {Promise<Object>} - Created revoked token document
 */
revokedTokenSchema.statics.revokeToken = async function(data) {
  try {
    const revokedToken = new this(data);
    await revokedToken.save();
    return revokedToken;
  } catch (error) {
    // If duplicate (already revoked), that's fine
    if (error.code === 11000) {
      console.log('Token already revoked:', data.tokenHash);
      return null;
    }
    console.error('RevokedToken.revokeToken error:', error.message);
    throw error;
  }
};

/**
 * Revoke all tokens for a user
 * @param {String} userId - User ID
 * @param {String} reason - Revocation reason
 * @param {Object} context - Additional context
 * @returns {Promise<Array>} - Array of revoked tokens
 */
revokedTokenSchema.statics.revokeAllUserTokens = async function(userId, reason, context = {}) {
  try {
    // Note: This doesn't automatically revoke tokens from Redis
    // The tokenRevocation.service handles both MongoDB + Redis
    // This method is mainly for MongoDB record-keeping

    const revokedAt = new Date();
    const expiresAt = context.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default

    // Create a marker document for "all tokens revoked"
    const marker = await this.create({
      tokenHash: `user:${userId}:all:${revokedAt.getTime()}`,
      userId,
      userEmail: context.userEmail || 'unknown',
      firmId: context.firmId,
      reason,
      revokedBy: context.revokedBy,
      revokedAt,
      expiresAt,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        bulkRevocation: true,
        ...context.metadata
      }
    });

    return [marker];
  } catch (error) {
    console.error('RevokedToken.revokeAllUserTokens error:', error.message);
    throw error;
  }
};

/**
 * Get revocation history for a user
 * @param {String} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Revoked tokens
 */
revokedTokenSchema.statics.getUserRevocations = async function(userId, options = {}) {
  const { limit = 50, skip = 0, reason } = options;

  const query = { userId };
  if (reason) {
    query.reason = reason;
  }

  return this.find(query)
    .sort({ revokedAt: -1 })
    .limit(limit)
    .skip(skip)
    .select('-tokenHash') // Don't expose token hashes
    .lean();
};

/**
 * Get recent revocations (admin view)
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Array>} - Recent revocations
 */
revokedTokenSchema.statics.getRecentRevocations = async function(filters = {}) {
  const {
    limit = 100,
    skip = 0,
    reason,
    userId,
    firmId,
    startDate,
    endDate
  } = filters;

  const query = {};

  if (reason) query.reason = reason;
  if (userId) query.userId = userId;
  if (firmId) query.firmId = firmId;

  if (startDate || endDate) {
    query.revokedAt = {};
    if (startDate) query.revokedAt.$gte = new Date(startDate);
    if (endDate) query.revokedAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ revokedAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'firstName lastName email')
    .populate('revokedBy', 'firstName lastName email')
    .select('-tokenHash') // Don't expose token hashes
    .lean();
};

/**
 * Clean up expired tokens (manual cleanup)
 * Note: TTL index handles this automatically, but this can be used for manual cleanup
 * @returns {Promise<Number>} - Number of deleted documents
 */
revokedTokenSchema.statics.cleanupExpired = async function() {
  try {
    const result = await this.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    console.log(`Cleaned up ${result.deletedCount} expired revoked tokens`);
    return result.deletedCount;
  } catch (error) {
    console.error('RevokedToken.cleanupExpired error:', error.message);
    return 0;
  }
};

/**
 * Get revocation statistics
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Object>} - Statistics
 */
revokedTokenSchema.statics.getStats = async function(filters = {}) {
  const { firmId, startDate, endDate } = filters;

  const query = {};
  if (firmId) query.firmId = firmId;

  if (startDate || endDate) {
    query.revokedAt = {};
    if (startDate) query.revokedAt.$gte = new Date(startDate);
    if (endDate) query.revokedAt.$lte = new Date(endDate);
  }

  const [total, byReason] = await Promise.all([
    this.countDocuments(query),
    this.aggregate([
      { $match: query },
      { $group: { _id: '$reason', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
  ]);

  return {
    total,
    byReason: byReason.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {})
  };
};

const RevokedToken = mongoose.model('RevokedToken', revokedTokenSchema);

module.exports = RevokedToken;
