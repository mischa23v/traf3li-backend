const mongoose = require('mongoose');

const emailVerificationSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    email: {
        type: String,
        required: true
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
    sentCount: {
        type: Number,
        default: 1
    },
    lastSentAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for efficient cleanup of expired tokens
emailVerificationSchema.index({ expiresAt: 1, isUsed: 1 });

// Index for finding tokens by userId
emailVerificationSchema.index({ userId: 1, isUsed: 1 });

// Static method to create a verification token
emailVerificationSchema.statics.createToken = async function(userId, email) {
    const crypto = require('crypto');

    // Generate a unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Token expires in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create verification record
    const verification = await this.create({
        token,
        userId,
        email,
        expiresAt
    });

    return verification;
};

// Static method to verify a token
emailVerificationSchema.statics.verifyToken = async function(token) {
    const verification = await this.findOne({
        token,
        isUsed: false,
        expiresAt: { $gt: new Date() }
    });

    if (!verification) {
        return { valid: false, error: 'TOKEN_INVALID_OR_EXPIRED' };
    }

    // Mark token as used
    verification.isUsed = true;
    verification.usedAt = new Date();
    await verification.save();

    return { valid: true, userId: verification.userId, email: verification.email };
};

// Static method to find active token by userId
emailVerificationSchema.statics.findActiveByUserId = async function(userId) {
    return await this.findOne({
        userId,
        isUsed: false,
        expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });
};

// Static method to cleanup expired tokens
emailVerificationSchema.statics.cleanupExpired = async function() {
    const result = await this.deleteMany({
        $or: [
            { expiresAt: { $lt: new Date() } },
            { isUsed: true, usedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } // Used tokens older than 30 days
        ]
    });

    return result.deletedCount;
};

// Instance method to check if token is expired
emailVerificationSchema.methods.isExpired = function() {
    return this.expiresAt < new Date();
};

// Instance method to check if token can be resent
emailVerificationSchema.methods.canResend = function() {
    // Allow resend if last sent was more than 5 minutes ago
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.lastSentAt < fiveMinutesAgo;
};

module.exports = mongoose.model('EmailVerification', emailVerificationSchema);
