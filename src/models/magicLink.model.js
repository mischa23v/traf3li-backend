const mongoose = require('mongoose');

const magicLinkSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },
    isUsed: {
        type: Boolean,
        default: false,
        required: true
    },
    usedAt: {
        type: Date,
        required: false
    },
    purpose: {
        type: String,
        enum: ['login', 'register', 'verify_email'],
        default: 'login',
        required: true
    },
    metadata: {
        ip: {
            type: String,
            required: false
        },
        userAgent: {
            type: String,
            required: false
        },
        redirectUrl: {
            type: String,
            required: false
        }
    }
}, {
    timestamps: true,
    versionKey: false
});

// Index for cleanup queries
magicLinkSchema.index({ expiresAt: 1, isUsed: 1 });

// Index for verification queries
magicLinkSchema.index({ token: 1, isUsed: 1, expiresAt: 1 });

// TTL index to auto-delete expired magic links
// Delete immediately after expiration as they're single-use and short-lived
magicLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to find valid magic link by token
magicLinkSchema.statics.findValidByToken = async function(token) {
    return await this.findOne({
        token,
        isUsed: false,
        expiresAt: { $gt: new Date() }
    });
};

// Static method to cleanup expired links
magicLinkSchema.statics.cleanupExpired = async function() {
    const result = await this.deleteMany({
        $or: [
            { expiresAt: { $lt: new Date() } },
            { isUsed: true, usedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // Delete used links older than 24 hours
        ]
    });
    return result.deletedCount;
};

// Instance method to mark as used
magicLinkSchema.methods.markAsUsed = async function() {
    this.isUsed = true;
    this.usedAt = new Date();
    await this.save();
};

module.exports = mongoose.model('MagicLink', magicLinkSchema);
