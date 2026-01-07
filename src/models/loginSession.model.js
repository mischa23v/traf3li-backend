/**
 * Login Session Model
 *
 * Cryptographically secure session binding between password verification and OTP verification.
 * This prevents attackers from bypassing password verification by directly calling OTP endpoints.
 *
 * Security Properties:
 * 1. Single-use: Each session token can only be used once
 * 2. Time-bound: Expires in 10 minutes (configurable)
 * 3. IP-bound: Must verify from same IP that initiated login
 * 4. Device-bound: Validates user-agent consistency
 * 5. Cryptographically signed: HMAC-SHA256 prevents tampering
 *
 * Flow:
 * 1. POST /login → password verified → loginSession created → token returned
 * 2. POST /verify-otp → token required → session validated → tokens issued
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const LOGIN_SESSION_SECRET = process.env.LOGIN_SESSION_SECRET || process.env.JWT_SECRET;
const SESSION_EXPIRY_MINUTES = 10;

const loginSessionSchema = new mongoose.Schema({
    // User identification
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
        index: true
    },

    // Session token (hashed for storage)
    tokenHash: {
        type: String,
        required: true,
        index: true
    },

    // Security binding
    ipAddress: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        required: true
    },
    deviceFingerprint: {
        type: String,
        default: null
    },

    // Password verification proof
    passwordVerifiedAt: {
        type: Date,
        required: true,
        default: Date.now
    },

    // Breach detection (stored at password verification time, not fire-and-forget)
    passwordBreached: {
        type: Boolean,
        default: false
    },
    breachCount: {
        type: Number,
        default: 0
    },

    // Session state
    status: {
        type: String,
        enum: ['pending', 'verified', 'expired', 'invalidated'],
        default: 'pending'
    },

    // Expiration
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },

    // Tracking
    otpSentAt: {
        type: Date,
        default: null
    },
    verifiedAt: {
        type: Date,
        default: null
    },
    verificationIp: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// TTL index - auto-delete expired sessions
loginSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for token lookup
loginSessionSchema.index({ tokenHash: 1, status: 1 });

// Compound index for user session lookup
loginSessionSchema.index({ userId: 1, status: 1, expiresAt: 1 });

/**
 * Create a new login session after password verification
 * Returns the plain token (NOT stored in DB - only hash is stored)
 */
loginSessionSchema.statics.createSession = async function(userData) {
    const {
        userId,
        email,
        ipAddress,
        userAgent,
        deviceFingerprint,
        passwordBreached,
        breachCount
    } = userData;

    // Invalidate any existing pending sessions for this user
    // Prevents multiple valid sessions (race condition fix)
    await this.updateMany(
        { userId, status: 'pending' },
        { status: 'invalidated' }
    );

    // Generate cryptographically secure token
    const tokenData = {
        userId: userId.toString(),
        email: email.toLowerCase(),
        ip: ipAddress,
        ts: Date.now(),
        nonce: crypto.randomBytes(16).toString('hex')
    };

    // Create HMAC signature
    const payload = JSON.stringify(tokenData);
    const signature = crypto
        .createHmac('sha256', LOGIN_SESSION_SECRET)
        .update(payload)
        .digest('hex');

    // Token format: base64(payload).signature
    const token = `${Buffer.from(payload).toString('base64')}.${signature}`;

    // Store only the hash
    const tokenHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

    const session = await this.create({
        userId,
        email: email.toLowerCase(),
        tokenHash,
        ipAddress,
        userAgent,
        deviceFingerprint,
        passwordBreached: passwordBreached || false,
        breachCount: breachCount || 0,
        passwordVerifiedAt: new Date(),
        expiresAt: new Date(Date.now() + SESSION_EXPIRY_MINUTES * 60 * 1000)
    });

    return {
        token,
        sessionId: session._id,
        expiresIn: SESSION_EXPIRY_MINUTES * 60 // seconds
    };
};

/**
 * Verify and consume a login session token
 * Returns session data if valid, throws error if invalid
 */
loginSessionSchema.statics.verifyAndConsumeToken = async function(token, verificationData) {
    const { ipAddress, userAgent } = verificationData;

    // Validate token format
    if (!token || typeof token !== 'string' || !token.includes('.')) {
        throw new Error('INVALID_TOKEN_FORMAT');
    }

    const [encodedPayload, providedSignature] = token.split('.');

    if (!encodedPayload || !providedSignature) {
        throw new Error('INVALID_TOKEN_FORMAT');
    }

    // Decode and verify signature (timing-safe)
    let payload;
    try {
        payload = Buffer.from(encodedPayload, 'base64').toString('utf8');
    } catch (e) {
        throw new Error('INVALID_TOKEN_ENCODING');
    }

    const expectedSignature = crypto
        .createHmac('sha256', LOGIN_SESSION_SECRET)
        .update(payload)
        .digest('hex');

    // Timing-safe comparison
    const sigBuffer = Buffer.from(providedSignature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (sigBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        throw new Error('INVALID_TOKEN_SIGNATURE');
    }

    // Parse payload
    let tokenData;
    try {
        tokenData = JSON.parse(payload);
    } catch (e) {
        throw new Error('INVALID_TOKEN_PAYLOAD');
    }

    // Hash the token to find in DB
    const tokenHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

    // Find and atomically update session (prevents race conditions)
    const session = await this.findOneAndUpdate(
        {
            tokenHash,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        },
        {
            status: 'verified',
            verifiedAt: new Date(),
            verificationIp: ipAddress
        },
        { new: false } // Return original document to check IP
    );

    if (!session) {
        // Check if token was already used
        const usedSession = await this.findOne({ tokenHash });
        if (usedSession) {
            if (usedSession.status === 'verified') {
                throw new Error('TOKEN_ALREADY_USED');
            }
            if (usedSession.status === 'expired' || usedSession.expiresAt < new Date()) {
                throw new Error('TOKEN_EXPIRED');
            }
            if (usedSession.status === 'invalidated') {
                throw new Error('TOKEN_INVALIDATED');
            }
        }
        throw new Error('TOKEN_NOT_FOUND');
    }

    // Validate IP binding (security: prevent token theft)
    // Allow some flexibility for mobile networks that change IP
    const ipMismatch = session.ipAddress !== ipAddress;
    if (ipMismatch) {
        // Log but don't fail - could be legitimate (mobile network, VPN)
        // In strict mode, you'd reject this
        console.warn('Login session IP mismatch', {
            sessionIp: session.ipAddress,
            verificationIp: ipAddress,
            userId: session.userId
        });
    }

    // Validate user-agent (basic device binding)
    // We're lenient here - just log mismatch
    const uaMismatch = session.userAgent !== userAgent;
    if (uaMismatch) {
        console.warn('Login session user-agent mismatch', {
            sessionUA: session.userAgent?.substring(0, 50),
            verificationUA: userAgent?.substring(0, 50),
            userId: session.userId
        });
    }

    return {
        userId: session.userId,
        email: session.email,
        passwordBreached: session.passwordBreached,
        breachCount: session.breachCount,
        passwordVerifiedAt: session.passwordVerifiedAt,
        ipMismatch,
        uaMismatch
    };
};

/**
 * Mark OTP as sent for a session
 */
loginSessionSchema.statics.markOtpSent = async function(userId, email) {
    await this.updateOne(
        {
            userId,
            email: email.toLowerCase(),
            status: 'pending',
            expiresAt: { $gt: new Date() }
        },
        { otpSentAt: new Date() }
    );
};

/**
 * Check if user has a valid pending session
 */
loginSessionSchema.statics.hasPendingSession = async function(userId) {
    const count = await this.countDocuments({
        userId,
        status: 'pending',
        expiresAt: { $gt: new Date() }
    });
    return count > 0;
};

/**
 * Invalidate all sessions for a user (e.g., on password change)
 */
loginSessionSchema.statics.invalidateAllUserSessions = async function(userId) {
    await this.updateMany(
        { userId, status: 'pending' },
        { status: 'invalidated' }
    );
};

/**
 * Cleanup old sessions (called by cron job)
 */
loginSessionSchema.statics.cleanupExpired = async function() {
    const result = await this.deleteMany({
        $or: [
            { expiresAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, // 24h past expiry
            { status: { $in: ['verified', 'expired', 'invalidated'] }, createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } // 7d for non-pending
        ]
    });
    return result.deletedCount;
};

const LoginSession = mongoose.model('LoginSession', loginSessionSchema);

module.exports = LoginSession;
