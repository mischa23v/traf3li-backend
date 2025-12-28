const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Price List Model - Pricing Schemes
 *
 * Manages different price lists for buying and selling (retail, wholesale, etc.)
 */

const priceListSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ============ IDENTIFICATION ============
    priceListId: {
        type: String,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: [true, 'Price list name is required'],
        trim: true,
        maxlength: [200, 'Name cannot exceed 200 characters'],
        index: true
    },
    nameAr: {
        type: String,
        trim: true,
        maxlength: [200, 'Arabic name cannot exceed 200 characters']
    },

    // ============ SETTINGS ============
    currency: {
        type: String,
        default: 'SAR',
        uppercase: true
    },
    isBuying: {
        type: Boolean,
        default: false,
        index: true
    },
    isSelling: {
        type: Boolean,
        default: true,
        index: true
    },
    enabled: {
        type: Boolean,
        default: true,
        index: true
    },

    // ============ PRICING RULES ============
    priceNotUOMDependent: {
        type: Boolean,
        default: false
    },

    // ============ AUDIT ============
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }

}, {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ============ INDEXES ============
priceListSchema.index({ firmId: 1, name: 1 }, { unique: true });
priceListSchema.index({ firmId: 1, enabled: 1, isSelling: 1 });
priceListSchema.index({ firmId: 1, enabled: 1, isBuying: 1 });

// ============ STATICS ============
/**
 * Generate unique price list ID
 */
priceListSchema.statics.generatePriceListId = async function() {
    const Counter = require('./counter.model');
    const seq = await Counter.getNextSequence('pricelist');
    return `PL-${String(seq).padStart(6, '0')}`;
};

/**
 * Get active selling price lists
 */
priceListSchema.statics.getSellingPriceLists = function(firmId = null) {
    const query = { enabled: true, isSelling: true };
    if (firmId) {
        query.firmId = firmId;
    }
    return this.find(query).sort({ name: 1 });
};

/**
 * Get active buying price lists
 */
priceListSchema.statics.getBuyingPriceLists = function(firmId = null) {
    const query = { enabled: true, isBuying: true };
    if (firmId) {
        query.firmId = firmId;
    }
    return this.find(query).sort({ name: 1 });
};

// ============ PRE-SAVE MIDDLEWARE ============
priceListSchema.pre('save', async function(next) {
    try {
        // Auto-generate price list ID if not provided
        if (this.isNew && !this.priceListId) {
            this.priceListId = await this.constructor.generatePriceListId();
        }

        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('PriceList', priceListSchema);
