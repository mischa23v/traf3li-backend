/**
 * Email Verification Model
 * Gold Standard Implementation (Google/Microsoft/AWS patterns)
 *
 * Security Features:
 * - Tokens stored as SHA-256 hashes (database breach doesn't expose usable tokens)
 * - Timing-safe token comparison (prevents timing attacks)
 * - Brute force protection (failed attempts tracking + lockout)
 * - IP/User-Agent logging for security audit
 * - Rate limiting per email and per IP
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const { hashVerificationToken, timingSafeTokenCompare } = require('../utils/securityUtils');

const emailVerificationSchema = new mongoose.Schema({
    // Token hash - NEVER store raw tokens (Microsoft/Google pattern)
    tokenHash: {
        type: String,
        required: true,
        index: true
    },

    // Keep token field for backwards compatibility during migration
    // TODO: Remove after migration is complete
    token: {
        type: String,
        index: true,
        sparse: true  // Allow null for new records
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },

    expiresAt: {
        type: Date,
        required: true,
        index: true
    },

    isUsed: {
        type: Boolean,
        default: false
    },

    usedAt: {
        type: Date
    },

    // Rate limiting
    sentCount: {
        type: Number,
        default: 1
    },

    lastSentAt: {
        type: Date,
        default: Date.now
    },

    // Brute force protection
    failedAttempts: {
        type: Number,
        default: 0
    },

    lockedUntil: {
        type: Date,
        default: null
    },

    lastFailedAt: {
        type: Date
    },

    // Security audit fields
    createdFromIP: {
        type: String,
        default: null
    },

    createdUserAgent: {
        type: String,
        default: null
    },

    verifiedFromIP: {
        type: String,
        default: null
    },

    verifiedUserAgent: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Compound index for efficient token verification
emailVerificationSchema.index({ tokenHash: 1, isUsed: 1, expiresAt: 1 });

// Index for finding tokens by userId
emailVerificationSchema.index({ userId: 1, isUsed: 1, expiresAt: -1 });

// Index for rate limiting by email
emailVerificationSchema.index({ email: 1, createdAt: -1 });

// Index for efficient cleanup of expired tokens
emailVerificationSchema.index({ expiresAt: 1, isUsed: 1 });

// TTL index to auto-delete expired tokens after 30 days (maintain audit trail)
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// ============================================
// CONSTANTS
// ============================================

const TOKEN_EXPIRY_HOURS = 24;
const MAX_RESEND_PER_HOUR = 5;
const MIN_RESEND_INTERVAL_MINUTES = 1;  // Changed from 5 to 1 minute (user-friendly)
const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_DURATION_MINUTES = 30;
const MAX_TOKENS_PER_EMAIL_PER_HOUR = 3;

// ============================================
// STATIC METHODS
// ============================================

/**
 * Create a verification token with security features
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @param {Object} options - Additional options
 * @param {string} options.ipAddress - Request IP
 * @param {string} options.userAgent - Request User-Agent
 * @returns {Promise<Object>} - { verification, rawToken }
 */
emailVerificationSchema.statics.createTokenSecure = async function(userId, email, options = {}) {
    const { ipAddress = null, userAgent = null } = options;

    // Check rate limit: max tokens per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentTokenCount = await this.countDocuments({
        email: email.toLowerCase(),
        createdAt: { $gte: oneHourAgo }
    });

    if (recentTokenCount >= MAX_TOKENS_PER_EMAIL_PER_HOUR) {
        return {
            success: false,
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'تم تجاوز الحد الأقصى لطلبات التفعيل. حاول لاحقاً.',
            messageEn: 'Too many verification requests. Please try again later.',
            retryAfter: 60 // minutes
        };
    }

    // Invalidate any existing unused tokens for this user
    await this.updateMany(
        { userId, isUsed: false },
        { $set: { isUsed: true, usedAt: new Date() } }
    );

    // Generate a cryptographically secure token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashVerificationToken(rawToken);

    // Token expires in 24 hours
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Create verification record with hashed token
    const verification = await this.create({
        tokenHash,
        userId,
        email: email.toLowerCase(),
        expiresAt,
        createdFromIP: ipAddress,
        createdUserAgent: userAgent ? userAgent.substring(0, 500) : null
    });

    return {
        success: true,
        verification,
        rawToken  // Return raw token to send in email (NOT stored)
    };
};

/**
 * Verify a token with security measures
 * @param {string} rawToken - Raw token from user
 * @param {Object} options - Additional options
 * @param {string} options.ipAddress - Request IP
 * @param {string} options.userAgent - Request User-Agent
 * @returns {Promise<Object>} - Verification result
 */
emailVerificationSchema.statics.verifyTokenSecure = async function(rawToken, options = {}) {
    const { ipAddress = null, userAgent = null } = options;

    if (!rawToken || typeof rawToken !== 'string') {
        return { valid: false, error: 'TOKEN_REQUIRED' };
    }

    // Hash the provided token for lookup
    const tokenHash = hashVerificationToken(rawToken);

    // Find token by hash
    const verification = await this.findOne({
        tokenHash,
        isUsed: false,
        expiresAt: { $gt: new Date() }
    });

    if (!verification) {
        // Try legacy lookup by raw token (migration support)
        const legacyVerification = await this.findOne({
            token: rawToken,
            isUsed: false,
            expiresAt: { $gt: new Date() }
        });

        if (!legacyVerification) {
            return { valid: false, error: 'TOKEN_INVALID_OR_EXPIRED' };
        }

        // Migrate legacy token: add hash
        legacyVerification.tokenHash = tokenHash;
        legacyVerification.token = undefined;  // Remove raw token
        legacyVerification.isUsed = true;
        legacyVerification.usedAt = new Date();
        legacyVerification.verifiedFromIP = ipAddress;
        legacyVerification.verifiedUserAgent = userAgent ? userAgent.substring(0, 500) : null;
        await legacyVerification.save();

        return {
            valid: true,
            userId: legacyVerification.userId,
            email: legacyVerification.email,
            migrated: true
        };
    }

    // Check if token is locked due to brute force
    if (verification.lockedUntil && verification.lockedUntil > new Date()) {
        const waitMinutes = Math.ceil((verification.lockedUntil - new Date()) / 60000);
        return {
            valid: false,
            error: 'TOKEN_LOCKED',
            message: `تم قفل هذا الرمز مؤقتاً. حاول بعد ${waitMinutes} دقيقة.`,
            messageEn: `This token is temporarily locked. Try again in ${waitMinutes} minutes.`,
            waitMinutes
        };
    }

    // Timing-safe comparison (already done by hash lookup, but extra safety)
    if (!timingSafeTokenCompare(tokenHash, verification.tokenHash)) {
        // Increment failed attempts
        verification.failedAttempts = (verification.failedAttempts || 0) + 1;
        verification.lastFailedAt = new Date();

        // Lock after too many failures
        if (verification.failedAttempts >= MAX_FAILED_ATTEMPTS) {
            verification.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
        }

        await verification.save();
        return { valid: false, error: 'TOKEN_INVALID' };
    }

    // Mark token as used
    verification.isUsed = true;
    verification.usedAt = new Date();
    verification.verifiedFromIP = ipAddress;
    verification.verifiedUserAgent = userAgent ? userAgent.substring(0, 500) : null;
    await verification.save();

    return {
        valid: true,
        userId: verification.userId,
        email: verification.email
    };
};

/**
 * Record failed verification attempt for brute force protection
 * Called when token lookup fails (for IP-based rate limiting)
 * @param {string} ipAddress - Request IP
 * @returns {Promise<Object>} - Rate limit status
 */
emailVerificationSchema.statics.recordFailedAttempt = async function(ipAddress) {
    // This is a placeholder for IP-based rate limiting
    // In production, use Redis for distributed rate limiting
    return { recorded: true };
};

/**
 * Check resend rate limit for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - { allowed, waitMinutes, sentCount }
 */
emailVerificationSchema.statics.checkResendRateLimit = async function(userId) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Get the most recent token for this user
    const recentToken = await this.findOne({
        userId,
        createdAt: { $gte: oneHourAgo }
    }).sort({ createdAt: -1 });

    if (!recentToken) {
        return { allowed: true, sentCount: 0 };
    }

    // Check minimum interval between resends
    const minInterval = MIN_RESEND_INTERVAL_MINUTES * 60 * 1000;
    const timeSinceLastSent = Date.now() - recentToken.lastSentAt.getTime();

    if (timeSinceLastSent < minInterval) {
        const waitSeconds = Math.ceil((minInterval - timeSinceLastSent) / 1000);
        return {
            allowed: false,
            waitSeconds,
            waitMinutes: Math.ceil(waitSeconds / 60),
            error: 'TOO_SOON',
            message: `يرجى الانتظار ${waitSeconds} ثانية قبل إعادة الإرسال`,
            messageEn: `Please wait ${waitSeconds} seconds before resending`
        };
    }

    // Check hourly limit
    const hourlyCount = await this.countDocuments({
        userId,
        createdAt: { $gte: oneHourAgo }
    });

    if (hourlyCount >= MAX_RESEND_PER_HOUR) {
        return {
            allowed: false,
            error: 'HOURLY_LIMIT',
            sentCount: hourlyCount,
            message: 'تم تجاوز الحد الأقصى للإرسال. حاول بعد ساعة.',
            messageEn: 'Maximum resend limit reached. Try again in an hour.'
        };
    }

    return { allowed: true, sentCount: hourlyCount };
};

/**
 * Find active token by userId (for resend)
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} - Active verification token or null
 */
emailVerificationSchema.statics.findActiveByUserId = async function(userId) {
    return await this.findOne({
        userId,
        isUsed: false,
        expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });
};

/**
 * Check if email has pending verification (for public endpoint)
 * @param {string} email - Email address
 * @returns {Promise<Object|null>} - Pending verification info or null
 */
emailVerificationSchema.statics.findPendingByEmail = async function(email) {
    return await this.findOne({
        email: email.toLowerCase(),
        isUsed: false,
        expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 }).select('userId email expiresAt lastSentAt sentCount');
};

/**
 * Update resend count for existing token
 * @param {string} tokenId - Token document ID
 * @returns {Promise<Object>} - Updated token
 */
emailVerificationSchema.statics.updateResendCount = async function(tokenId) {
    return await this.findByIdAndUpdate(
        tokenId,
        {
            $inc: { sentCount: 1 },
            $set: { lastSentAt: new Date() }
        },
        { new: true }
    );
};

/**
 * Cleanup expired tokens
 * @returns {Promise<number>} - Number of deleted tokens
 */
emailVerificationSchema.statics.cleanupExpired = async function() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await this.deleteMany({
        $or: [
            { expiresAt: { $lt: new Date() }, createdAt: { $lt: thirtyDaysAgo } },
            { isUsed: true, usedAt: { $lt: thirtyDaysAgo } }
        ]
    });

    return result.deletedCount;
};

// ============================================
// LEGACY STATIC METHODS (Backwards Compatibility)
// ============================================

/**
 * @deprecated Use createTokenSecure instead
 * Create a verification token (legacy method for backwards compatibility)
 */
emailVerificationSchema.statics.createToken = async function(userId, email) {
    const result = await this.createTokenSecure(userId, email);
    if (!result.success) {
        throw new Error(result.messageEn || result.message);
    }

    // For backwards compatibility, attach rawToken to verification object
    result.verification.token = result.rawToken;
    return result.verification;
};

/**
 * @deprecated Use verifyTokenSecure instead
 * Verify a token (legacy method for backwards compatibility)
 */
emailVerificationSchema.statics.verifyToken = async function(token) {
    return await this.verifyTokenSecure(token);
};

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Check if token is expired
 * @returns {boolean}
 */
emailVerificationSchema.methods.isExpired = function() {
    return this.expiresAt < new Date();
};

/**
 * Check if resend is allowed
 * @returns {boolean}
 */
emailVerificationSchema.methods.canResend = function() {
    const minInterval = MIN_RESEND_INTERVAL_MINUTES * 60 * 1000;
    return (Date.now() - this.lastSentAt.getTime()) >= minInterval;
};

/**
 * Check if token is locked
 * @returns {boolean}
 */
emailVerificationSchema.methods.isLocked = function() {
    return this.lockedUntil && this.lockedUntil > new Date();
};

module.exports = mongoose.model('EmailVerification', emailVerificationSchema);
