const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Session Model - Concurrent Session Management
 *
 * Tracks active user sessions for security and concurrent session control.
 * Features:
 * - Token hash storage (secure, no plaintext tokens)
 * - Device fingerprinting (user agent, IP, device info)
 * - Location tracking (country, city, IP)
 * - Session lifecycle (created, last activity, expires, terminated)
 * - Concurrent session limits
 */

const sessionSchema = new mongoose.Schema({
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

    // Token hash (SHA-256) - never store plaintext tokens
    tokenHash: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Device information
    deviceInfo: {
        userAgent: {
            type: String,
            required: true
        },
        ip: {
            type: String,
            required: true
        },
        device: {
            type: String,  // 'desktop', 'mobile', 'tablet', 'unknown'
            default: 'unknown'
        },
        browser: {
            type: String,  // 'Chrome', 'Firefox', 'Safari', etc.
        },
        os: {
            type: String,  // 'Windows', 'macOS', 'Linux', 'iOS', 'Android', etc.
        },
        platform: {
            type: String   // Additional platform info
        }
    },

    // Location information (GeoIP lookup)
    location: {
        country: {
            type: String
        },
        city: {
            type: String
        },
        region: {
            type: String
        },
        ip: {
            type: String,
            required: true,
            index: true
        },
        timezone: {
            type: String
        }
    },

    // Session lifecycle
    createdAt: {
        type: Date,
        default: Date.now,
        required: true,
        index: true
    },
    lastActivityAt: {
        type: Date,
        default: Date.now,
        required: true,
        index: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },

    // Session status
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    terminatedAt: {
        type: Date,
        index: true
    },
    terminatedReason: {
        type: String,
        enum: [
            'logout',           // User logged out
            'expired',          // Session expired naturally
            'user_terminated',  // User manually ended session
            'admin_terminated', // Admin terminated session
            'limit_exceeded',   // Session limit exceeded, oldest terminated
            'security',         // Security concern (password change, suspicious activity)
            'forced',           // System forced termination
            null
        ],
        default: null
    },
    terminatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Remember Me flag (extended session)
    rememberMe: {
        type: Boolean,
        default: false,
        index: true
    },

    // Security flags
    isNewDevice: {
        type: Boolean,
        default: false
    },
    notificationSent: {
        type: Boolean,
        default: false
    },
    isSuspicious: {
        type: Boolean,
        default: false,
        index: true
    },
    suspiciousReasons: {
        type: [String],
        default: [],
        enum: [
            'ip_mismatch',
            'user_agent_mismatch',
            'impossible_travel',
            'location_change',
            'multiple_locations',
            'abnormal_activity_pattern',
            null
        ]
    },
    suspiciousDetectedAt: {
        type: Date
    },

    // Metadata
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

// Compound indexes for efficient queries
sessionSchema.index({ userId: 1, isActive: 1, expiresAt: -1 });
sessionSchema.index({ userId: 1, createdAt: -1 });
sessionSchema.index({ firmId: 1, isActive: 1 });
sessionSchema.index({ tokenHash: 1, isActive: 1 });
sessionSchema.index({ 'location.ip': 1, userId: 1 });

// TTL index to auto-delete expired sessions after 30 days
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Hash a JWT token for secure storage
 */
sessionSchema.statics.hashToken = function(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Find session by token
 */
sessionSchema.statics.findByToken = async function(token) {
    const tokenHash = this.hashToken(token);
    return await this.findOne({
        tokenHash,
        isActive: true,
        expiresAt: { $gt: new Date() }
    }).populate('userId', 'firstName lastName email role');
};

/**
 * Get active sessions for a user
 */
sessionSchema.statics.getActiveSessions = async function(userId) {
    return await this.find({
        userId,
        isActive: true,
        expiresAt: { $gt: new Date() }
    }).sort({ lastActivityAt: -1 });
};

/**
 * Get session count for a user
 */
sessionSchema.statics.getActiveSessionCount = async function(userId) {
    return await this.countDocuments({
        userId,
        isActive: true,
        expiresAt: { $gt: new Date() }
    });
};

/**
 * Check if device/IP has been used before by this user
 */
sessionSchema.statics.isKnownDevice = async function(userId, deviceInfo) {
    const count = await this.countDocuments({
        userId,
        $or: [
            { 'location.ip': deviceInfo.ip },
            {
                'deviceInfo.userAgent': deviceInfo.userAgent,
                'deviceInfo.browser': deviceInfo.browser,
                'deviceInfo.os': deviceInfo.os
            }
        ]
    });

    return count > 0;
};

/**
 * Terminate session
 */
sessionSchema.statics.terminateSession = async function(sessionId, reason, terminatedBy = null) {
    return await this.findByIdAndUpdate(
        sessionId,
        {
            $set: {
                isActive: false,
                terminatedAt: new Date(),
                terminatedReason: reason,
                terminatedBy
            }
        },
        { new: true }
    );
};

/**
 * Terminate all sessions for a user except current
 */
sessionSchema.statics.terminateAllExcept = async function(userId, exceptSessionId, reason = 'user_terminated', terminatedBy = null) {
    const query = {
        userId,
        isActive: true,
        _id: { $ne: exceptSessionId }
    };

    return await this.updateMany(query, {
        $set: {
            isActive: false,
            terminatedAt: new Date(),
            terminatedReason: reason,
            terminatedBy
        }
    });
};

/**
 * Terminate all sessions for a user
 */
sessionSchema.statics.terminateAll = async function(userId, reason = 'security', terminatedBy = null) {
    return await this.updateMany(
        { userId, isActive: true },
        {
            $set: {
                isActive: false,
                terminatedAt: new Date(),
                terminatedReason: reason,
                terminatedBy
            }
        }
    );
};

/**
 * Clean up expired sessions (mark as inactive)
 */
sessionSchema.statics.cleanupExpired = async function() {
    const result = await this.updateMany(
        {
            isActive: true,
            expiresAt: { $lte: new Date() }
        },
        {
            $set: {
                isActive: false,
                terminatedAt: new Date(),
                terminatedReason: 'expired'
            }
        }
    );

    return result.modifiedCount;
};

/**
 * Get sessions by IP address (for security monitoring)
 */
sessionSchema.statics.getSessionsByIP = async function(ipAddress, limit = 100) {
    return await this.find({
        'location.ip': ipAddress,
        isActive: true
    })
    .populate('userId', 'firstName lastName email')
    .limit(limit)
    .sort({ createdAt: -1 });
};

/**
 * Get session statistics for a user
 */
sessionSchema.statics.getUserStats = async function(userId) {
    const [activeCount, totalCount, recentSessions] = await Promise.all([
        this.countDocuments({ userId, isActive: true }),
        this.countDocuments({ userId }),
        this.find({ userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .select('deviceInfo location createdAt lastActivityAt isActive')
    ]);

    return {
        activeCount,
        totalCount,
        recentSessions
    };
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Update last activity timestamp
 */
sessionSchema.methods.updateActivity = function() {
    this.lastActivityAt = new Date();
    return this.save();
};

/**
 * Terminate this session
 */
sessionSchema.methods.terminate = function(reason, terminatedBy = null) {
    this.isActive = false;
    this.terminatedAt = new Date();
    this.terminatedReason = reason;
    this.terminatedBy = terminatedBy;
    return this.save();
};

/**
 * Check if session is still valid
 */
sessionSchema.methods.isValid = function() {
    return this.isActive && this.expiresAt > new Date();
};

/**
 * Get session age in milliseconds
 */
sessionSchema.methods.getAge = function() {
    return Date.now() - this.createdAt.getTime();
};

/**
 * Get time until expiration in milliseconds
 */
sessionSchema.methods.getTimeUntilExpiration = function() {
    return this.expiresAt.getTime() - Date.now();
};

/**
 * Get idle time in milliseconds
 */
sessionSchema.methods.getIdleTime = function() {
    return Date.now() - this.lastActivityAt.getTime();
};

/**
 * Mark session as suspicious
 * @param {Array<String>} reasons - Array of reason codes
 */
sessionSchema.methods.markAsSuspicious = function(reasons = []) {
    this.isSuspicious = true;
    this.suspiciousReasons = [...new Set([...this.suspiciousReasons, ...reasons])]; // Merge and deduplicate
    this.suspiciousDetectedAt = new Date();
    return this.save();
};

/**
 * Clear suspicious flag
 */
sessionSchema.methods.clearSuspicious = function() {
    this.isSuspicious = false;
    this.suspiciousReasons = [];
    this.suspiciousDetectedAt = undefined;
    return this.save();
};

module.exports = mongoose.model('Session', sessionSchema);
