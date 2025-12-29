const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// BROKER TYPES
// ═══════════════════════════════════════════════════════════════
const BROKER_TYPES = [
    'stock_broker',     // Stock/equity broker
    'forex_broker',     // Forex broker
    'crypto_exchange',  // Cryptocurrency exchange
    'futures_broker',   // Futures broker
    'multi_asset',      // Multi-asset broker
    'prop_firm',        // Proprietary trading firm
    'other'
];

// ═══════════════════════════════════════════════════════════════
// BROKER STATUSES
// ═══════════════════════════════════════════════════════════════
const BROKER_STATUSES = [
    'active',
    'inactive',
    'pending_verification'
];

// ═══════════════════════════════════════════════════════════════
// COMMISSION TYPES
// ═══════════════════════════════════════════════════════════════
const COMMISSION_TYPES = [
    'per_trade',
    'per_share',
    'percentage',
    'tiered'
];

// ═══════════════════════════════════════════════════════════════
// COMMISSION STRUCTURE SCHEMA
// ═══════════════════════════════════════════════════════════════
const CommissionStructureSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: COMMISSION_TYPES,
        default: 'per_trade'
    },
    value: {
        type: Number,
        default: 0,
        min: 0
    },
    minimumCommission: {
        type: Number,
        min: 0
    },
    maximumCommission: {
        type: Number,
        min: 0
    }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// BROKER SCHEMA
// ═══════════════════════════════════════════════════════════════
const brokerSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
     },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // Owner
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // BASIC INFO
    // ═══════════════════════════════════════════════════════════════
    brokerId: {
        type: String,
        unique: true,
        index: true
    },

    name: {
        type: String,
        required: true,
        trim: true
    },

    displayName: {
        type: String,
        trim: true
    },

    type: {
        type: String,
        enum: BROKER_TYPES,
        required: true,
        default: 'multi_asset'
    },

    // ═══════════════════════════════════════════════════════════════
    // CONNECTION
    // ═══════════════════════════════════════════════════════════════
    apiSupported: {
        type: Boolean,
        default: false
    },

    apiConnected: {
        type: Boolean,
        default: false
    },

    lastSyncAt: {
        type: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // CREDENTIALS (encrypted at application level)
    // ═══════════════════════════════════════════════════════════════
    apiKey: {
        type: String,
        select: false  // Never return in queries by default
    },

    apiSecret: {
        type: String,
        select: false
    },

    accessToken: {
        type: String,
        select: false
    },

    // ═══════════════════════════════════════════════════════════════
    // SETTINGS
    // ═══════════════════════════════════════════════════════════════
    timezone: {
        type: String,
        default: 'Asia/Riyadh'
    },

    defaultCurrency: {
        type: String,
        default: 'SAR'
    },

    commissionStructure: CommissionStructureSchema,

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: BROKER_STATUSES,
        default: 'active',
        index: true
    },

    isDefault: {
        type: Boolean,
        default: false
    },

    // ═══════════════════════════════════════════════════════════════
    // ADDITIONAL INFO
    // ═══════════════════════════════════════════════════════════════
    website: {
        type: String,
        trim: true
    },

    supportEmail: {
        type: String,
        trim: true
    },

    supportPhone: {
        type: String,
        trim: true
    },

    notes: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }

}, { timestamps: true });

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
brokerSchema.index({ firmId: 1, userId: 1 });
brokerSchema.index({ userId: 1, status: 1 });
brokerSchema.index({ firmId: 1, status: 1 });
brokerSchema.index({ userId: 1, isDefault: 1 });
brokerSchema.index({ createdAt: -1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
brokerSchema.pre('save', async function(next) {
    // Generate broker ID if not present
    if (!this.brokerId) {
        const count = await mongoose.model('Broker').countDocuments();
        this.brokerId = `BRK-${Date.now()}-${count + 1}`;
    }

    // If setting as default, unset other defaults for this user
    if (this.isDefault && this.isModified('isDefault')) {
        await mongoose.model('Broker').updateMany(
            {
                userId: this.userId,
                _id: { $ne: this._id },
                isDefault: true
            },
            { isDefault: false }
        );
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATICS
// ═══════════════════════════════════════════════════════════════
brokerSchema.statics.getByUser = async function(userId, filters = {}) {
    return this.find({ userId, ...filters }).sort({ isDefault: -1, name: 1 });
};

brokerSchema.statics.getByFirm = async function(firmId, filters = {}) {
    return this.find({ firmId, ...filters })
        .populate('userId', 'firstName lastName email')
        .sort({ isDefault: -1, name: 1 });
};

brokerSchema.statics.getDefault = async function(userId) {
    return this.findOne({ userId, isDefault: true, status: 'active' });
};

// Export enums
brokerSchema.statics.BROKER_TYPES = BROKER_TYPES;
brokerSchema.statics.BROKER_STATUSES = BROKER_STATUSES;
brokerSchema.statics.COMMISSION_TYPES = COMMISSION_TYPES;

module.exports = mongoose.model('Broker', brokerSchema);
