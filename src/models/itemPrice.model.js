const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Item Price Model - Item-specific Pricing
 *
 * Defines specific prices for items in different price lists.
 */

const itemPriceSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
     },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ============ ITEM & PRICE LIST ============
    itemId: {
        type: Schema.Types.ObjectId,
        ref: 'Item',
        required: true,
        index: true
    },
    priceListId: {
        type: Schema.Types.ObjectId,
        ref: 'PriceList',
        required: true,
        index: true
    },

    // ============ PRICING ============
    rate: {
        type: Number,
        required: [true, 'Rate is required'],
        min: 0
    },
    currency: {
        type: String,
        default: 'SAR',
        uppercase: true
    },

    // ============ VALIDITY ============
    validFrom: {
        type: Date,
        index: true
    },
    validTo: {
        type: Date,
        index: true
    },

    // ============ QUANTITY DISCOUNT ============
    minQty: {
        type: Number,
        default: 0,
        min: 0
    },

    // ============ UOM ============
    uom: {
        type: String,
        trim: true
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
itemPriceSchema.index({ firmId: 1, itemId: 1, priceListId: 1, validFrom: 1, minQty: 1 });
itemPriceSchema.index({ firmId: 1, priceListId: 1 });
itemPriceSchema.index({ validFrom: 1, validTo: 1 });

// ============ VIRTUALS ============
itemPriceSchema.virtual('isValid').get(function() {
    const now = new Date();
    const validFrom = !this.validFrom || now >= this.validFrom;
    const validTo = !this.validTo || now <= this.validTo;
    return validFrom && validTo;
});

// ============ STATICS ============
/**
 * Get price for item in price list
 */
itemPriceSchema.statics.getPrice = async function(itemId, priceListId, qty = 1, date = new Date()) {
    const query = {
        itemId,
        priceListId,
        minQty: { $lte: qty }
    };

    // Add validity date filters
    query.$or = [
        { validFrom: { $exists: false } },
        { validFrom: null },
        { validFrom: { $lte: date } }
    ];

    query.$and = [
        {
            $or: [
                { validTo: { $exists: false } },
                { validTo: null },
                { validTo: { $gte: date } }
            ]
        }
    ];

    // Get highest matching quantity tier
    const price = await this.findOne(query)
        .sort({ minQty: -1 })
        .lean();

    return price ? price.rate : null;
};

/**
 * Get all prices for item
 */
itemPriceSchema.statics.getPricesForItem = function(itemId, firmId = null) {
    const query = { itemId };
    if (firmId) {
        query.firmId = firmId;
    }

    return this.find(query)
        .populate('priceListId', 'name isBuying isSelling')
        .sort({ priceListId: 1, minQty: 1 });
};

/**
 * Bulk update prices
 */
itemPriceSchema.statics.bulkUpdatePrices = async function(updates) {
    const bulkOps = updates.map(update => ({
        updateOne: {
            filter: {
                itemId: update.itemId,
                priceListId: update.priceListId,
                minQty: update.minQty || 0
            },
            update: {
                $set: {
                    rate: update.rate,
                    validFrom: update.validFrom,
                    validTo: update.validTo,
                    uom: update.uom,
                    updatedBy: update.updatedBy
                }
            },
            upsert: true
        }
    }));

    return await this.bulkWrite(bulkOps);
};

// ============ PRE-SAVE MIDDLEWARE ============
itemPriceSchema.pre('save', function(next) {
    // Validate date range
    if (this.validFrom && this.validTo && this.validFrom > this.validTo) {
        const error = new Error('Valid From date must be before Valid To date');
        error.statusCode = 400;
        return next(error);
    }

    next();
});

module.exports = mongoose.model('ItemPrice', itemPriceSchema);
