/**
 * Price Level Model
 *
 * Tiered pricing for different client categories
 * Integrates with BillingRate for service pricing
 */

const mongoose = require('mongoose');

const priceLevelSchema = new mongoose.Schema({
    // Identification
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        maxlength: 20
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    nameAr: {
        type: String,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    descriptionAr: {
        type: String,
        trim: true,
        maxlength: 500
    },

    // Pricing type
    pricingType: {
        type: String,
        enum: ['percentage', 'fixed_markup', 'fixed_discount', 'custom_rates'],
        required: true,
        default: 'percentage'
    },

    // For percentage-based pricing
    percentageAdjustment: {
        type: Number,
        default: 0, // e.g., -10 for 10% discount, +20 for 20% markup
        min: -100,
        max: 1000
    },

    // For fixed markup/discount
    fixedAdjustment: {
        type: Number,
        default: 0 // In halalas (positive = markup, negative = discount)
    },

    // Custom rates per service type (for custom_rates pricing type)
    customRates: [{
        serviceType: {
            type: String,
            enum: [
                'consultation',
                'court_appearance',
                'document_preparation',
                'contract_review',
                'research',
                'negotiation',
                'mediation',
                'arbitration',
                'litigation',
                'corporate',
                'real_estate',
                'family_law',
                'criminal',
                'immigration',
                'labor_law',
                'intellectual_property',
                'tax',
                'other'
            ]
        },
        hourlyRate: Number, // In halalas
        flatFee: Number,    // In halalas (optional, for fixed-fee services)
        minimumFee: Number  // In halalas (optional, minimum charge)
    }],

    // Priority (higher = evaluated first)
    priority: {
        type: Number,
        default: 0
    },

    // Applicability conditions
    minimumRevenue: {
        type: Number,
        default: 0 // In halalas - client must have this lifetime revenue to qualify
    },
    minimumCases: {
        type: Number,
        default: 0 // Minimum number of cases
    },

    // Validity period
    effectiveDate: {
        type: Date,
        default: Date.now
    },
    expiryDate: {
        type: Date
    },

    // Status
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    isDefault: {
        type: Boolean,
        default: false // Only one should be default
    },

    // Ownership
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Linked income account for revenue tracking
    incomeAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
priceLevelSchema.index({ lawyerId: 1, isActive: 1 });
priceLevelSchema.index({ lawyerId: 1, priority: -1 });
priceLevelSchema.index({ code: 1, lawyerId: 1 }, { unique: true });

// Ensure only one default per lawyer
priceLevelSchema.pre('save', async function(next) {
    if (this.isDefault && this.isModified('isDefault')) {
        await this.constructor.updateMany(
            { lawyerId: this.lawyerId, _id: { $ne: this._id } },
            { isDefault: false }
        );
    }
    next();
});

/**
 * Calculate adjusted rate based on base rate
 * @param {Number} baseRate - Base hourly rate in halalas
 * @param {String} serviceType - Optional service type for custom rates
 * @returns {Number} - Adjusted rate in halalas
 */
priceLevelSchema.methods.calculateRate = function(baseRate, serviceType = null) {
    // Check if custom rate exists for this service type
    if (this.pricingType === 'custom_rates' && serviceType) {
        const customRate = this.customRates.find(r => r.serviceType === serviceType);
        if (customRate && customRate.hourlyRate) {
            return customRate.hourlyRate;
        }
    }

    switch (this.pricingType) {
        case 'percentage':
            // Apply percentage adjustment
            const multiplier = 1 + (this.percentageAdjustment / 100);
            return Math.round(baseRate * multiplier);

        case 'fixed_markup':
            return baseRate + this.fixedAdjustment;

        case 'fixed_discount':
            return Math.max(0, baseRate - Math.abs(this.fixedAdjustment));

        case 'custom_rates':
            // No custom rate found, return base rate
            return baseRate;

        default:
            return baseRate;
    }
};

/**
 * Get flat fee for a service if available
 * @param {String} serviceType - Service type
 * @returns {Number|null} - Flat fee in halalas or null
 */
priceLevelSchema.methods.getFlatFee = function(serviceType) {
    if (this.pricingType !== 'custom_rates') return null;

    const customRate = this.customRates.find(r => r.serviceType === serviceType);
    return customRate?.flatFee || null;
};

/**
 * Get minimum fee for a service if available
 * @param {String} serviceType - Service type
 * @returns {Number} - Minimum fee in halalas (0 if not set)
 */
priceLevelSchema.methods.getMinimumFee = function(serviceType) {
    if (this.pricingType !== 'custom_rates') return 0;

    const customRate = this.customRates.find(r => r.serviceType === serviceType);
    return customRate?.minimumFee || 0;
};

/**
 * Check if a client qualifies for this price level
 * @param {ObjectId} clientId - Client ID
 * @returns {Boolean}
 */
priceLevelSchema.methods.clientQualifies = async function(clientId) {
    // Check validity period
    const now = new Date();
    if (now < this.effectiveDate) return false;
    if (this.expiryDate && now > this.expiryDate) return false;

    // If no minimum requirements, client qualifies
    if (this.minimumRevenue <= 0 && this.minimumCases <= 0) return true;

    const Invoice = mongoose.model('Invoice');
    const Case = mongoose.model('Case');

    // Check minimum revenue
    if (this.minimumRevenue > 0) {
        const result = await Invoice.aggregate([
            {
                $match: {
                    clientId: new mongoose.Types.ObjectId(clientId),
                    status: 'paid'
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalAmount' }
                }
            }
        ]);

        const totalRevenue = result[0]?.totalRevenue || 0;
        if (totalRevenue < this.minimumRevenue) return false;
    }

    // Check minimum cases
    if (this.minimumCases > 0) {
        const caseCount = await Case.countDocuments({
            clientId,
            status: { $in: ['active', 'closed', 'won'] }
        });

        if (caseCount < this.minimumCases) return false;
    }

    return true;
};

/**
 * Static: Get best price level for a client
 */
priceLevelSchema.statics.getBestPriceLevel = async function(lawyerId, clientId) {
    const priceLevels = await this.find({
        lawyerId,
        isActive: true
    }).sort({ priority: -1 });

    // Find the first (highest priority) level the client qualifies for
    for (const level of priceLevels) {
        if (await level.clientQualifies(clientId)) {
            return level;
        }
    }

    // Return default if no specific level matches
    return this.findOne({
        lawyerId,
        isActive: true,
        isDefault: true
    });
};

/**
 * Static: Get effective rate for client
 */
priceLevelSchema.statics.getEffectiveRate = async function(lawyerId, clientId, baseRate, serviceType = null) {
    const priceLevel = await this.getBestPriceLevel(lawyerId, clientId);

    if (!priceLevel) {
        return baseRate;
    }

    return priceLevel.calculateRate(baseRate, serviceType);
};

module.exports = mongoose.model('PriceLevel', priceLevelSchema);
