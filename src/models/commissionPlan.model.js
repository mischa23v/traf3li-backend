/**
 * Commission Plan & Settlement Models - Enterprise Gold Standard
 *
 * Complete commission management with:
 * - Multiple plan types (flat, tiered, product-based)
 * - Target-based vs achievement-based plans
 * - Team commission splitting
 * - Manager overrides
 * - Settlement/payout tracking
 * - Clawback support
 *
 * Multi-tenant: firmId for firms, lawyerId for solo lawyers
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ═══════════════════════════════════════════════════════════════════════════════
// TIER SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const CommissionTierSchema = new Schema({
    minValue: { type: Number, required: true, min: 0 },
    maxValue: { type: Number }, // null = unlimited
    rate: { type: Number, required: true, min: 0, max: 100 },
    flatAmount: { type: Number, min: 0 }, // Alternative to rate
    label: { type: String, maxlength: 100 },
    labelAr: { type: String, maxlength: 100 }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT RATE SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const ProductCommissionSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    productCode: { type: String, maxlength: 100 },
    productName: { type: String, maxlength: 200 },
    rate: { type: Number, required: true, min: 0, max: 100 }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY RATE SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const CategoryCommissionSchema = new Schema({
    categoryId: { type: Schema.Types.ObjectId, ref: 'ProductCategory' },
    categoryCode: { type: String, maxlength: 100 },
    categoryName: { type: String, maxlength: 200 },
    rate: { type: Number, required: true, min: 0, max: 100 }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// ACCELERATOR SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const AcceleratorSchema = new Schema({
    achievementPercent: { type: Number, required: true, min: 0 }, // Above this %
    multiplier: { type: Number, required: true, min: 1 }, // Commission multiplier
    bonusAmount: { type: Number, min: 0 }, // Additional fixed bonus
    label: { type: String, maxlength: 100 }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMMISSION PLAN SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const commissionPlanSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANCY (REQUIRED)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    code: {
        type: String,
        required: true,
        maxlength: 50,
        uppercase: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        maxlength: 200,
        trim: true
    },
    nameAr: {
        type: String,
        maxlength: 200,
        trim: true
    },
    description: {
        type: String,
        maxlength: 2000
    },
    descriptionAr: {
        type: String,
        maxlength: 2000
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS & CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    isActive: { type: Boolean, default: true, index: true },
    isDefault: { type: Boolean, default: false },
    priority: { type: Number, default: 10, min: 1, max: 100 },

    // ═══════════════════════════════════════════════════════════════
    // PLAN TYPE
    // ═══════════════════════════════════════════════════════════════
    planType: {
        type: String,
        enum: [
            'flat',              // Fixed percentage on all sales
            'tiered',            // Tiered based on amount/achievement
            'product_based',     // Different rates per product/category
            'target_based',      // Based on target achievement
            'margin_based',      // Based on gross margin
            'hybrid'             // Combination
        ],
        required: true,
        default: 'flat'
    },

    // ═══════════════════════════════════════════════════════════════
    // COMMISSION BASIS
    // ═══════════════════════════════════════════════════════════════
    commissionBasis: {
        type: String,
        enum: [
            'invoice_amount',     // Commission on invoiced amount
            'payment_received',   // Commission when payment received
            'order_amount',       // Commission on order confirmation
            'gross_profit',       // Commission on margin
            'net_profit'          // Commission after all costs
        ],
        default: 'invoice_amount'
    },

    // Include/Exclude from commission calculation
    includeShipping: { type: Boolean, default: false },
    includeTax: { type: Boolean, default: false },
    includeDiscounts: { type: Boolean, default: true }, // Calculate on discounted amount

    // ═══════════════════════════════════════════════════════════════
    // FLAT RATE CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    flatRate: { type: Number, min: 0, max: 100 },

    // ═══════════════════════════════════════════════════════════════
    // TIERED RATE CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    tierBasis: {
        type: String,
        enum: ['sales_amount', 'units_sold', 'achievement_percent'],
        default: 'sales_amount'
    },
    tiers: [CommissionTierSchema],

    // ═══════════════════════════════════════════════════════════════
    // PRODUCT-BASED CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    productRates: [ProductCommissionSchema],
    categoryRates: [CategoryCommissionSchema],
    defaultProductRate: { type: Number, default: 0, min: 0, max: 100 },

    // ═══════════════════════════════════════════════════════════════
    // TARGET-BASED CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    targetPeriod: {
        type: String,
        enum: ['monthly', 'quarterly', 'semi_annual', 'annual'],
        default: 'monthly'
    },
    baseCommissionRate: { type: Number, min: 0, max: 100 }, // Rate at 100% achievement
    minimumAchievementPercent: { type: Number, default: 0 }, // Below this, no commission

    // Achievement thresholds with different rates
    achievementTiers: [CommissionTierSchema],

    // Accelerators (bonus multipliers above target)
    accelerators: [AcceleratorSchema],

    // ═══════════════════════════════════════════════════════════════
    // MARGIN-BASED CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    marginRate: { type: Number, min: 0, max: 100 }, // % of margin as commission
    minimumMarginPercent: { type: Number, default: 0 }, // No commission below this margin

    // ═══════════════════════════════════════════════════════════════
    // CAPS & LIMITS
    // ═══════════════════════════════════════════════════════════════
    minCommissionAmount: { type: Number, min: 0 }, // Guaranteed minimum
    maxCommissionAmount: { type: Number, min: 0 }, // Cap per period
    maxCommissionPerDeal: { type: Number, min: 0 }, // Cap per transaction

    // ═══════════════════════════════════════════════════════════════
    // TEAM SPLITTING
    // ═══════════════════════════════════════════════════════════════
    enableTeamSplit: { type: Boolean, default: false },
    teamSplitRules: [{
        role: { type: String, required: true, maxlength: 50 },
        sharePercent: { type: Number, required: true, min: 0, max: 100 }
    }],

    // Manager Override
    enableManagerOverride: { type: Boolean, default: false },
    managerOverridePercent: { type: Number, min: 0, max: 100 },

    // ═══════════════════════════════════════════════════════════════
    // CLAWBACK RULES
    // ═══════════════════════════════════════════════════════════════
    enableClawback: { type: Boolean, default: true },
    clawbackPeriodDays: { type: Number, default: 90 }, // Days after which no clawback
    clawbackOnReturn: { type: Boolean, default: true },
    clawbackOnNonPayment: { type: Boolean, default: true },
    clawbackOnCancellation: { type: Boolean, default: true },

    // ═══════════════════════════════════════════════════════════════
    // PAYMENT CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    paymentTiming: {
        type: String,
        enum: [
            'on_invoice',         // When invoice is created
            'on_payment',         // When customer pays
            'on_full_payment',    // When fully paid
            'end_of_period'       // Settlement at period end
        ],
        default: 'on_payment'
    },

    holdPeriodDays: { type: Number, default: 0 }, // Days to hold before eligible
    settlementFrequency: {
        type: String,
        enum: ['weekly', 'bi_weekly', 'monthly', 'quarterly'],
        default: 'monthly'
    },

    // ═══════════════════════════════════════════════════════════════
    // APPLICABILITY
    // ═══════════════════════════════════════════════════════════════
    applicableToSalesPersonIds: [{ type: Schema.Types.ObjectId, ref: 'SalesPerson' }],
    applicableToTeamIds: [{ type: Schema.Types.ObjectId, ref: 'SalesTeam' }],
    applicableToTerritoryIds: [{ type: Schema.Types.ObjectId, ref: 'Territory' }],
    applicableToRoles: [{ type: String, maxlength: 50 }],

    // Validity
    validFrom: { type: Date },
    validTo: { type: Date },

    // ═══════════════════════════════════════════════════════════════
    // CURRENCY
    // ═══════════════════════════════════════════════════════════════
    currency: { type: String, default: 'SAR', maxlength: 3 },

    // ═══════════════════════════════════════════════════════════════
    // NOTES
    // ═══════════════════════════════════════════════════════════════
    notes: { type: String, maxlength: 2000 },
    termsAndConditions: { type: String, maxlength: 5000 },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════════════════════
commissionPlanSchema.index({ firmId: 1, code: 1 }, { unique: true });
commissionPlanSchema.index({ firmId: 1, isActive: 1, isDefault: 1 });
commissionPlanSchema.index({ firmId: 1, planType: 1 });
commissionPlanSchema.index({ lawyerId: 1, isActive: 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════════════════════
commissionPlanSchema.virtual('isValid').get(function() {
    const now = new Date();
    if (this.validFrom && now < this.validFrom) return false;
    if (this.validTo && now > this.validTo) return false;
    return this.isActive;
});

// ═══════════════════════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate commission for a transaction
 */
commissionPlanSchema.methods.calculateCommission = function(transaction) {
    let commissionableAmount = transaction.amount;

    // Adjust for inclusions/exclusions
    if (!this.includeShipping) {
        commissionableAmount -= (transaction.shippingCost || 0);
    }
    if (!this.includeTax) {
        commissionableAmount -= (transaction.taxAmount || 0);
    }

    let commission = 0;

    switch (this.planType) {
        case 'flat':
            commission = commissionableAmount * (this.flatRate / 100);
            break;

        case 'tiered':
            commission = this.calculateTieredCommission(commissionableAmount);
            break;

        case 'product_based':
            commission = this.calculateProductBasedCommission(transaction.items);
            break;

        case 'margin_based':
            const margin = transaction.margin || 0;
            if (transaction.marginPercent >= this.minimumMarginPercent) {
                commission = margin * (this.marginRate / 100);
            }
            break;

        case 'target_based':
            commission = this.calculateTargetBasedCommission(
                commissionableAmount,
                transaction.achievementPercent || 0
            );
            break;

        default:
            commission = commissionableAmount * (this.flatRate / 100);
    }

    // Apply caps
    if (this.maxCommissionPerDeal && commission > this.maxCommissionPerDeal) {
        commission = this.maxCommissionPerDeal;
    }

    // Apply minimum
    if (this.minCommissionAmount && commission < this.minCommissionAmount) {
        commission = this.minCommissionAmount;
    }

    return Math.round(commission * 100) / 100;
};

/**
 * Calculate tiered commission
 */
commissionPlanSchema.methods.calculateTieredCommission = function(amount) {
    if (!this.tiers.length) return 0;

    // Find applicable tier
    const applicableTier = this.tiers
        .filter(t => amount >= t.minValue && (!t.maxValue || amount <= t.maxValue))
        .sort((a, b) => b.minValue - a.minValue)[0];

    if (!applicableTier) return 0;

    if (applicableTier.flatAmount) {
        return applicableTier.flatAmount;
    }

    return amount * (applicableTier.rate / 100);
};

/**
 * Calculate product-based commission
 */
commissionPlanSchema.methods.calculateProductBasedCommission = function(items = []) {
    let totalCommission = 0;

    items.forEach(item => {
        let rate = this.defaultProductRate;

        // Check for product-specific rate
        const productRate = this.productRates.find(
            pr => pr.productId?.toString() === item.productId?.toString() ||
                  pr.productCode === item.productCode
        );
        if (productRate) {
            rate = productRate.rate;
        } else {
            // Check for category rate
            const categoryRate = this.categoryRates.find(
                cr => cr.categoryId?.toString() === item.categoryId?.toString()
            );
            if (categoryRate) {
                rate = categoryRate.rate;
            }
        }

        totalCommission += (item.amount || 0) * (rate / 100);
    });

    return totalCommission;
};

/**
 * Calculate target-based commission
 */
commissionPlanSchema.methods.calculateTargetBasedCommission = function(amount, achievementPercent) {
    if (achievementPercent < this.minimumAchievementPercent) {
        return 0;
    }

    let baseCommission = amount * (this.baseCommissionRate / 100);

    // Find applicable achievement tier
    if (this.achievementTiers.length) {
        const tier = this.achievementTiers
            .filter(t => achievementPercent >= t.minValue && (!t.maxValue || achievementPercent <= t.maxValue))
            .sort((a, b) => b.minValue - a.minValue)[0];

        if (tier) {
            baseCommission = amount * (tier.rate / 100);
        }
    }

    // Apply accelerators
    if (this.accelerators.length) {
        const accelerator = this.accelerators
            .filter(a => achievementPercent >= a.achievementPercent)
            .sort((a, b) => b.achievementPercent - a.achievementPercent)[0];

        if (accelerator) {
            baseCommission *= accelerator.multiplier;
            if (accelerator.bonusAmount) {
                baseCommission += accelerator.bonusAmount;
            }
        }
    }

    return baseCommission;
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get active plan for sales person
 */
commissionPlanSchema.statics.getActivePlan = async function(firmQuery, salesPersonId = null) {
    const now = new Date();

    const query = {
        ...firmQuery,
        isActive: true,
        $or: [
            { validFrom: null },
            { validFrom: { $lte: now } }
        ]
    };

    if (salesPersonId) {
        query.$or = [
            { applicableToSalesPersonIds: { $size: 0 } },
            { applicableToSalesPersonIds: salesPersonId }
        ];
    }

    // Add validTo condition
    const plans = await this.find(query)
        .sort({ isDefault: -1, priority: -1 })
        .lean();

    // Filter by validTo
    return plans.find(p => !p.validTo || p.validTo >= now);
};

module.exports = mongoose.model('CommissionPlan', commissionPlanSchema);
