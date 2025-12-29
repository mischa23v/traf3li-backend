/**
 * API Key Model
 *
 * Manages API keys for external integrations.
 * Available for Professional and Enterprise plans.
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema({
    // ============ TENANT ISOLATION ============
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
     },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ============ AUDIT ============
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // ============ KEY INFO ============
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },

    // Key is hashed, prefix is stored for identification
    keyPrefix: {
        type: String,
        required: true,
        index: true
    },
    keyHash: {
        type: String,
        required: true
    },

    // ============ PERMISSIONS ============
    scopes: [{
        type: String,
        enum: [
            'read:cases',
            'write:cases',
            'read:clients',
            'write:clients',
            'read:invoices',
            'write:invoices',
            'read:documents',
            'write:documents',
            'read:reports',
            'read:contacts',
            'write:contacts',
            'read:tasks',
            'write:tasks',
            'read:time_entries',
            'write:time_entries',
            'admin'
        ]
    }],

    // ============ USAGE TRACKING ============
    lastUsedAt: {
        type: Date,
        index: true
    },
    usageCount: {
        type: Number,
        default: 0
    },
    lastUsedIp: {
        type: String
    },

    // ============ RATE LIMITING ============
    rateLimit: {
        type: Number,
        default: 1000, // requests per hour
        min: 1,
        max: 10000
    },

    // ============ STATUS ============
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    expiresAt: {
        type: Date,
        index: true
    },

    // ============ REVOCATION ============
    revokedAt: {
        type: Date
    },
    revokedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    revocationReason: {
        type: String,
        maxlength: 500
    },

    // ============ IP RESTRICTIONS ============
    allowedIps: [{
        type: String
    }],

    // ============ METADATA ============
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }

}, {
    timestamps: true,
    versionKey: false
});

// ============ INDEXES ============
apiKeySchema.index({ firmId: 1, isActive: 1 });
apiKeySchema.index({ keyPrefix: 1, keyHash: 1 });
apiKeySchema.index({ firmId: 1, createdAt: -1 });
apiKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $exists: true } } });

// ============ STATICS ============

/**
 * Generate a new API key
 * @returns {object} { key, prefix, hash }
 */
apiKeySchema.statics.generateKey = function() {
    const key = `traf_${crypto.randomBytes(32).toString('hex')}`;
    const prefix = key.substring(0, 12);
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    return { key, prefix, hash };
};

/**
 * Verify and retrieve API key
 * @param {string} key - Full API key
 * @returns {Promise<object|null>} API key document or null
 */
apiKeySchema.statics.verifyKey = async function(key) {
    if (!key || !key.startsWith('traf_')) {
        return null;
    }

    const prefix = key.substring(0, 12);
    const hash = crypto.createHash('sha256').update(key).digest('hex');

    const apiKey = await this.findOne({
        keyPrefix: prefix,
        keyHash: hash,
        isActive: true,
        $or: [
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
        ]
    }).populate('firmId', 'name subscription');

    if (apiKey) {
        // Update usage stats
        apiKey.lastUsedAt = new Date();
        apiKey.usageCount += 1;
        await apiKey.save();
    }

    return apiKey;
};

/**
 * Get active API keys for a firm
 * @param {string} firmId - Firm ID
 * @returns {Promise<Array>} API keys
 */
apiKeySchema.statics.getActiveKeys = async function(firmId) {
    return this.find({
        firmId,
        isActive: true,
        $or: [
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
        ]
    })
    .select('-keyHash')
    .populate('createdBy', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Revoke an API key
 * @param {string} keyId - API key ID
 * @param {string} userId - User revoking the key
 * @param {string} reason - Reason for revocation
 * @returns {Promise<object>} Updated API key
 */
apiKeySchema.statics.revokeKey = async function(keyId, userId, reason = null) {
    return this.findByIdAndUpdate(
        keyId,
        {
            isActive: false,
            revokedAt: new Date(),
            revokedBy: userId,
            revocationReason: reason
        },
        { new: true }
    );
};

/**
 * Get API key statistics for a firm
 * @param {string} firmId - Firm ID
 * @returns {Promise<object>} Statistics
 */
apiKeySchema.statics.getStats = async function(firmId) {
    const stats = await this.aggregate([
        { $match: { firmId: new mongoose.Types.ObjectId(firmId) } },
        {
            $group: {
                _id: null,
                totalKeys: { $sum: 1 },
                activeKeys: {
                    $sum: { $cond: ['$isActive', 1, 0] }
                },
                revokedKeys: {
                    $sum: { $cond: [{ $not: '$isActive' }, 1, 0] }
                },
                totalUsage: { $sum: '$usageCount' }
            }
        }
    ]);

    return stats[0] || {
        totalKeys: 0,
        activeKeys: 0,
        revokedKeys: 0,
        totalUsage: 0
    };
};

// ============ METHODS ============

/**
 * Check if API key has a specific scope
 * @param {string} scope - Required scope
 * @returns {boolean}
 */
apiKeySchema.methods.hasScope = function(scope) {
    if (this.scopes.includes('admin')) return true;
    return this.scopes.includes(scope);
};

/**
 * Check if API key is expired
 * @returns {boolean}
 */
apiKeySchema.methods.isExpired = function() {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
};

/**
 * Check if IP is allowed
 * @param {string} ip - IP address to check
 * @returns {boolean}
 */
apiKeySchema.methods.isIpAllowed = function(ip) {
    if (!this.allowedIps || this.allowedIps.length === 0) return true;
    return this.allowedIps.includes(ip);
};

/**
 * Update last used info
 * @param {string} ip - IP address
 */
apiKeySchema.methods.recordUsage = async function(ip) {
    this.lastUsedAt = new Date();
    this.usageCount += 1;
    this.lastUsedIp = ip;
    await this.save();
};

module.exports = mongoose.model('ApiKey', apiKeySchema);
