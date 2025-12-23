const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Refresh Token Model - Token Rotation & Security
 *
 * Features:
 * - Token rotation on each refresh
 * - Token family tracking for reuse attack detection
 * - Device fingerprinting
 * - Automatic revocation on security events
 */

const refreshTokenSchema = new mongoose.Schema({
    // Token (hashed for security)
    token: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // User reference
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Multi-tenancy
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },

    // Token lifecycle
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },

    // Token status
    isRevoked: {
        type: Boolean,
        default: false,
        index: true
    },
    revokedAt: {
        type: Date
    },
    revokedReason: {
        type: String,
        enum: [
            'logout',              // User logged out
            'refresh',             // Token rotated on refresh
            'security',            // Security concern (password change, etc.)
            'reuse_detected',      // Token reuse attack detected
            'expired',             // Token expired
            'revoke_all',          // All tokens revoked
            'admin',               // Admin revoked
            null
        ]
    },

    // Device information for security
    deviceInfo: {
        userAgent: String,
        ip: String,
        deviceId: String,      // Optional client-generated device ID
        browser: String,
        os: String,
        device: String         // 'mobile', 'desktop', 'tablet'
    },

    // Token rotation tracking
    rotatedFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RefreshToken',
        index: true
    },

    // Token family for detecting reuse attacks
    // All tokens in a rotation chain share the same family ID
    family: {
        type: String,
        required: true,
        index: true
    },

    // Last used timestamp (updated on each refresh)
    lastUsedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

// Compound indexes for efficient queries
refreshTokenSchema.index({ userId: 1, isRevoked: 0, expiresAt: -1 });
refreshTokenSchema.index({ family: 1, isRevoked: 0 });
refreshTokenSchema.index({ token: 1, isRevoked: 0 });

// TTL index to auto-delete expired tokens after 30 days
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Hash a refresh token for secure storage
 */
refreshTokenSchema.statics.hashToken = function(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate a token family ID (for rotation tracking)
 */
refreshTokenSchema.statics.generateFamily = function() {
    return crypto.randomBytes(16).toString('hex');
};

/**
 * Find token by value (hashed lookup)
 */
refreshTokenSchema.statics.findByToken = async function(token) {
    const tokenHash = this.hashToken(token);
    return await this.findOne({
        token: tokenHash,
        isRevoked: false,
        expiresAt: { $gt: new Date() }
    });
};

/**
 * Get active refresh tokens for a user
 */
refreshTokenSchema.statics.getActiveTokens = async function(userId) {
    return await this.find({
        userId,
        isRevoked: false,
        expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });
};

/**
 * Get token count for a user
 */
refreshTokenSchema.statics.getActiveTokenCount = async function(userId) {
    return await this.countDocuments({
        userId,
        isRevoked: false,
        expiresAt: { $gt: new Date() }
    });
};

/**
 * Revoke all tokens in a family (reuse attack response)
 */
refreshTokenSchema.statics.revokeFamily = async function(family, reason = 'reuse_detected') {
    const result = await this.updateMany(
        { family, isRevoked: false },
        {
            $set: {
                isRevoked: true,
                revokedAt: new Date(),
                revokedReason: reason
            }
        }
    );
    return result.modifiedCount;
};

/**
 * Revoke all tokens for a user
 */
refreshTokenSchema.statics.revokeAllUserTokens = async function(userId, reason = 'security') {
    const result = await this.updateMany(
        { userId, isRevoked: false },
        {
            $set: {
                isRevoked: true,
                revokedAt: new Date(),
                revokedReason: reason
            }
        }
    );
    return result.modifiedCount;
};

/**
 * Revoke specific token
 */
refreshTokenSchema.statics.revokeToken = async function(token, reason = 'logout') {
    const tokenHash = this.hashToken(token);
    const result = await this.findOneAndUpdate(
        { token: tokenHash, isRevoked: false },
        {
            $set: {
                isRevoked: true,
                revokedAt: new Date(),
                revokedReason: reason
            }
        },
        { new: true }
    );
    return result;
};

/**
 * Clean up expired tokens (mark as revoked)
 */
refreshTokenSchema.statics.cleanupExpired = async function() {
    const result = await this.updateMany(
        {
            isRevoked: false,
            expiresAt: { $lte: new Date() }
        },
        {
            $set: {
                isRevoked: true,
                revokedAt: new Date(),
                revokedReason: 'expired'
            }
        }
    );
    return result.modifiedCount;
};

/**
 * Check if token has been used (for reuse detection)
 */
refreshTokenSchema.statics.checkReuse = async function(token) {
    const tokenHash = this.hashToken(token);

    // Check if token exists and is revoked
    const revokedToken = await this.findOne({
        token: tokenHash,
        isRevoked: true
    });

    if (revokedToken) {
        return {
            isReuse: true,
            family: revokedToken.family,
            userId: revokedToken.userId
        };
    }

    return {
        isReuse: false
    };
};

/**
 * Get tokens by device
 */
refreshTokenSchema.statics.getTokensByDevice = async function(userId, deviceId) {
    return await this.find({
        userId,
        'deviceInfo.deviceId': deviceId,
        isRevoked: false,
        expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Revoke this token
 */
refreshTokenSchema.methods.revoke = function(reason = 'logout') {
    this.isRevoked = true;
    this.revokedAt = new Date();
    this.revokedReason = reason;
    return this.save();
};

/**
 * Check if token is valid (not revoked and not expired)
 */
refreshTokenSchema.methods.isValid = function() {
    return !this.isRevoked && this.expiresAt > new Date();
};

/**
 * Update last used timestamp
 */
refreshTokenSchema.methods.updateLastUsed = function() {
    this.lastUsedAt = new Date();
    return this.save();
};

/**
 * Get token age in milliseconds
 */
refreshTokenSchema.methods.getAge = function() {
    return Date.now() - this.createdAt.getTime();
};

/**
 * Get time until expiration in milliseconds
 */
refreshTokenSchema.methods.getTimeUntilExpiration = function() {
    return this.expiresAt.getTime() - Date.now();
};

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
