/**
 * Pricing Rule Model - Enterprise Gold Standard
 *
 * Comprehensive pricing rules engine with:
 * - Discount/Markup rules
 * - Tiered/Quantity-based pricing
 * - Buy X Get Y promotions
 * - Customer/Territory-specific pricing
 * - Time-based/Promotional pricing
 * - Promo code support
 * - Stacking rules
 *
 * Multi-tenant: firmId for firms, lawyerId for solo lawyers
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ═══════════════════════════════════════════════════════════════════════════════
// CONDITION SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const ConditionSchema = new Schema({
    field: {
        type: String,
        required: true,
        enum: [
            'quantity',
            'amount',
            'customer',
            'customer_group',
            'territory',
            'campaign',
            'source_channel',
            'payment_terms',
            'date',
            'day_of_week',
            'time_of_day',
            'warehouse',
            'sales_person',
            'order_type'
        ]
    },
    operator: {
        type: String,
        required: true,
        enum: [
            'equals',
            'not_equals',
            'greater_than',
            'greater_than_or_equal',
            'less_than',
            'less_than_or_equal',
            'between',
            'in',
            'not_in',
            'contains',
            'starts_with'
        ]
    },
    value: { type: Schema.Types.Mixed, required: true },
    value2: { type: Schema.Types.Mixed } // For 'between' operator
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// TIER SUB-SCHEMA (for tiered pricing)
// ═══════════════════════════════════════════════════════════════════════════════
const TierSchema = new Schema({
    minValue: { type: Number, required: true, min: 0 },
    maxValue: { type: Number }, // null = unlimited
    discountType: {
        type: String,
        enum: ['percentage', 'fixed_amount', 'fixed_price'],
        default: 'percentage'
    },
    discountValue: { type: Number, required: true, min: 0 },
    label: { type: String, maxlength: 100 },
    labelAr: { type: String, maxlength: 100 }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT RATE SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const ProductRateSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    productCode: { type: String, maxlength: 100 },
    productName: { type: String, maxlength: 200 },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed_amount', 'fixed_price'],
        default: 'percentage'
    },
    discountValue: { type: Number, required: true, min: 0 }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY RATE SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const CategoryRateSchema = new Schema({
    categoryId: { type: Schema.Types.ObjectId, ref: 'ProductCategory' },
    categoryCode: { type: String, maxlength: 100 },
    categoryName: { type: String, maxlength: 200 },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed_amount', 'fixed_price'],
        default: 'percentage'
    },
    discountValue: { type: Number, required: true, min: 0 }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// USAGE TRACKING SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const UsageRecordSchema = new Schema({
    usedAt: { type: Date, default: Date.now },
    orderId: { type: Schema.Types.ObjectId, ref: 'SalesOrder' },
    orderNumber: { type: String, maxlength: 50 },
    customerId: { type: Schema.Types.ObjectId, ref: 'Client' },
    customerName: { type: String, maxlength: 200 },
    discountApplied: { type: Number, min: 0 },
    orderAmount: { type: Number, min: 0 }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PRICING RULE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const pricingRuleSchema = new Schema({
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
        maxlength: 1000
    },
    descriptionAr: {
        type: String,
        maxlength: 1000
    },

    // ═══════════════════════════════════════════════════════════════
    // RULE TYPE
    // ═══════════════════════════════════════════════════════════════
    ruleType: {
        type: String,
        enum: [
            'discount',           // Standard discount
            'price_override',     // Fixed price override
            'markup',             // Markup/surcharge
            'promotional',        // Time-limited promotion
            'tiered',            // Quantity/Amount tiers
            'buy_x_get_y',       // Buy X Get Y free/discount
            'bundle',            // Bundle pricing
            'loyalty',           // Loyalty program discount
            'first_order',       // First order discount
            'referral'           // Referral discount
        ],
        required: true,
        default: 'discount'
    },

    isActive: { type: Boolean, default: true, index: true },
    priority: { type: Number, default: 10, min: 1, max: 100 },

    // ═══════════════════════════════════════════════════════════════
    // WHAT IT APPLIES TO
    // ═══════════════════════════════════════════════════════════════
    applyOn: {
        type: String,
        enum: [
            'all_items',          // All products
            'item_code',          // Specific products
            'item_group',         // Product categories
            'brand',              // Product brands
            'price_list',         // Specific price lists
            'transaction'         // Entire order
        ],
        default: 'all_items'
    },

    // Specific items/groups this applies to
    itemCodes: [{ type: String, maxlength: 100 }],
    itemIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    itemGroups: [{ type: String, maxlength: 100 }],
    itemGroupIds: [{ type: Schema.Types.ObjectId, ref: 'ProductCategory' }],
    brands: [{ type: String, maxlength: 100 }],
    priceListIds: [{ type: Schema.Types.ObjectId, ref: 'PriceList' }],

    // Exclusions
    excludeItemCodes: [{ type: String, maxlength: 100 }],
    excludeItemIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    excludeItemGroups: [{ type: String, maxlength: 100 }],
    excludeBrands: [{ type: String, maxlength: 100 }],

    // ═══════════════════════════════════════════════════════════════
    // CONDITIONS
    // ═══════════════════════════════════════════════════════════════
    conditions: [ConditionSchema],
    matchAllConditions: { type: Boolean, default: true }, // AND vs OR

    // ═══════════════════════════════════════════════════════════════
    // DISCOUNT/MARKUP CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    discountType: {
        type: String,
        enum: ['percentage', 'fixed_amount', 'fixed_price'],
        default: 'percentage'
    },
    discountValue: { type: Number, min: 0 },

    // Caps
    maxDiscountAmount: { type: Number, min: 0 },
    minOrderAmount: { type: Number, min: 0 },
    maxOrderAmount: { type: Number, min: 0 },

    // Margin protection
    minMarginPercent: { type: Number, min: 0, max: 100 },
    protectMargin: { type: Boolean, default: false },

    // ═══════════════════════════════════════════════════════════════
    // TIERED PRICING
    // ═══════════════════════════════════════════════════════════════
    tierBasis: {
        type: String,
        enum: ['quantity', 'amount'],
        default: 'quantity'
    },
    tiers: [TierSchema],
    tierApplication: {
        type: String,
        enum: ['all_units', 'marginal'], // Apply to all units or just units in tier
        default: 'all_units'
    },

    // ═══════════════════════════════════════════════════════════════
    // PRODUCT-SPECIFIC RATES
    // ═══════════════════════════════════════════════════════════════
    productRates: [ProductRateSchema],
    categoryRates: [CategoryRateSchema],

    // ═══════════════════════════════════════════════════════════════
    // BUY X GET Y CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    buyXGetY: {
        buyQuantity: { type: Number, min: 1 },
        buyProductIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
        buyProductCodes: [{ type: String, maxlength: 100 }],
        buyFromCategory: { type: Schema.Types.ObjectId, ref: 'ProductCategory' },

        getQuantity: { type: Number, min: 1 },
        getProductIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
        getProductCodes: [{ type: String, maxlength: 100 }],
        getFromCategory: { type: Schema.Types.ObjectId, ref: 'ProductCategory' },
        getSameProduct: { type: Boolean, default: true },

        rewardType: {
            type: String,
            enum: ['free', 'discount_percent', 'discount_amount', 'fixed_price'],
            default: 'free'
        },
        rewardValue: { type: Number, min: 0 },

        maxApplications: { type: Number }, // Max times to apply per order
        recurringApplication: { type: Boolean, default: true } // Apply multiple times
    },

    // ═══════════════════════════════════════════════════════════════
    // BUNDLE PRICING
    // ═══════════════════════════════════════════════════════════════
    bundle: {
        bundlePrice: { type: Number, min: 0 },
        bundleDiscount: { type: Number, min: 0, max: 100 },
        requiredProducts: [{
            productId: { type: Schema.Types.ObjectId, ref: 'Product' },
            productCode: { type: String, maxlength: 100 },
            quantity: { type: Number, min: 1, default: 1 }
        }],
        minBundleQuantity: { type: Number, default: 1 }
    },

    // ═══════════════════════════════════════════════════════════════
    // PROMO CODE
    // ═══════════════════════════════════════════════════════════════
    requiresPromoCode: { type: Boolean, default: false },
    promoCode: {
        type: String,
        maxlength: 50,
        uppercase: true,
        trim: true,
        sparse: true
    },
    promoCodeCaseSensitive: { type: Boolean, default: false },

    // ═══════════════════════════════════════════════════════════════
    // VALIDITY PERIOD
    // ═══════════════════════════════════════════════════════════════
    validFrom: { type: Date, index: true },
    validTo: { type: Date, index: true },
    validDaysOfWeek: [{
        type: Number,
        min: 0,
        max: 6 // 0 = Sunday, 6 = Saturday
    }],
    validTimeStart: { type: String, maxlength: 10 }, // "09:00"
    validTimeEnd: { type: String, maxlength: 10 },   // "18:00"

    // ═══════════════════════════════════════════════════════════════
    // APPLICABILITY RESTRICTIONS
    // ═══════════════════════════════════════════════════════════════
    applicableToCustomerIds: [{ type: Schema.Types.ObjectId, ref: 'Client' }],
    applicableToCustomerGroups: [{ type: String, maxlength: 100 }],
    applicableToTerritoryIds: [{ type: Schema.Types.ObjectId, ref: 'Territory' }],
    applicableToSalesPersonIds: [{ type: Schema.Types.ObjectId, ref: 'SalesPerson' }],
    applicableToCampaignIds: [{ type: Schema.Types.ObjectId, ref: 'Campaign' }],
    applicableToChannels: [{
        type: String,
        enum: ['pos', 'ecommerce', 'api', 'manual', 'all']
    }],

    // Exclusions
    excludeCustomerIds: [{ type: Schema.Types.ObjectId, ref: 'Client' }],
    excludeCustomerGroups: [{ type: String, maxlength: 100 }],

    // New customer only
    newCustomerOnly: { type: Boolean, default: false },
    newCustomerDays: { type: Number, default: 30 }, // Within X days of first order

    // ═══════════════════════════════════════════════════════════════
    // USAGE LIMITS
    // ═══════════════════════════════════════════════════════════════
    usageLimit: { type: Number, min: 0 }, // Total usage limit
    usageCount: { type: Number, default: 0, min: 0 },
    usageLimitPerCustomer: { type: Number, min: 0 },
    usageLimitPerOrder: { type: Number, min: 0 },
    budgetLimit: { type: Number, min: 0 }, // Total discount budget
    budgetUsed: { type: Number, default: 0, min: 0 },

    // ═══════════════════════════════════════════════════════════════
    // STACKING / COMBINATION
    // ═══════════════════════════════════════════════════════════════
    canStackWithOtherRules: { type: Boolean, default: true },
    stackingGroup: { type: String, maxlength: 50 }, // Rules in same group don't stack
    isExclusive: { type: Boolean, default: false }, // If true, only this rule applies
    excludeFromStacking: [{ type: Schema.Types.ObjectId, ref: 'PricingRule' }],

    // ═══════════════════════════════════════════════════════════════
    // USAGE HISTORY (Sample - full history in separate collection)
    // ═══════════════════════════════════════════════════════════════
    recentUsage: [UsageRecordSchema],
    maxRecentUsageRecords: { type: Number, default: 100 },

    // ═══════════════════════════════════════════════════════════════
    // MESSAGES
    // ═══════════════════════════════════════════════════════════════
    displayMessage: { type: String, maxlength: 500 },
    displayMessageAr: { type: String, maxlength: 500 },
    internalNotes: { type: String, maxlength: 2000 },

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
pricingRuleSchema.index({ firmId: 1, code: 1 }, { unique: true });
pricingRuleSchema.index({ firmId: 1, isActive: 1, priority: -1 });
pricingRuleSchema.index({ firmId: 1, ruleType: 1, isActive: 1 });
pricingRuleSchema.index({ firmId: 1, promoCode: 1 }, { sparse: true });
pricingRuleSchema.index({ firmId: 1, validFrom: 1, validTo: 1 });
pricingRuleSchema.index({ lawyerId: 1, isActive: 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════════════════════
pricingRuleSchema.virtual('isValid').get(function() {
    const now = new Date();
    if (this.validFrom && now < this.validFrom) return false;
    if (this.validTo && now > this.validTo) return false;
    return this.isActive;
});

pricingRuleSchema.virtual('isExpired').get(function() {
    if (!this.validTo) return false;
    return new Date() > this.validTo;
});

pricingRuleSchema.virtual('usageRemaining').get(function() {
    if (!this.usageLimit) return null;
    return Math.max(0, this.usageLimit - this.usageCount);
});

pricingRuleSchema.virtual('budgetRemaining').get(function() {
    if (!this.budgetLimit) return null;
    return Math.max(0, this.budgetLimit - this.budgetUsed);
});

// ═══════════════════════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if rule applies to given context
 */
pricingRuleSchema.methods.appliesTo = function(context) {
    // Check if active and valid
    if (!this.isActive) return { applies: false, reason: 'Rule is inactive' };
    if (!this.isValid) return { applies: false, reason: 'Rule is not valid for current date' };

    // Check usage limits
    if (this.usageLimit && this.usageCount >= this.usageLimit) {
        return { applies: false, reason: 'Usage limit reached' };
    }

    // Check budget limit
    if (this.budgetLimit && this.budgetUsed >= this.budgetLimit) {
        return { applies: false, reason: 'Budget limit reached' };
    }

    // Check promo code
    if (this.requiresPromoCode) {
        if (!context.promoCode) {
            return { applies: false, reason: 'Promo code required' };
        }
        const ruleCode = this.promoCodeCaseSensitive ? this.promoCode : this.promoCode.toUpperCase();
        const inputCode = this.promoCodeCaseSensitive ? context.promoCode : context.promoCode.toUpperCase();
        if (ruleCode !== inputCode) {
            return { applies: false, reason: 'Invalid promo code' };
        }
    }

    // Check customer restrictions
    if (this.applicableToCustomerIds.length > 0) {
        if (!context.customerId || !this.applicableToCustomerIds.includes(context.customerId.toString())) {
            return { applies: false, reason: 'Not applicable to this customer' };
        }
    }

    // Check exclusions
    if (this.excludeCustomerIds.length > 0 && context.customerId) {
        if (this.excludeCustomerIds.includes(context.customerId.toString())) {
            return { applies: false, reason: 'Customer is excluded' };
        }
    }

    // Check minimum order amount
    if (this.minOrderAmount && context.orderAmount < this.minOrderAmount) {
        return { applies: false, reason: `Minimum order amount is ${this.minOrderAmount}` };
    }

    // Check maximum order amount
    if (this.maxOrderAmount && context.orderAmount > this.maxOrderAmount) {
        return { applies: false, reason: `Maximum order amount is ${this.maxOrderAmount}` };
    }

    // Check day of week
    if (this.validDaysOfWeek.length > 0) {
        const today = new Date().getDay();
        if (!this.validDaysOfWeek.includes(today)) {
            return { applies: false, reason: 'Not valid on this day' };
        }
    }

    return { applies: true };
};

/**
 * Calculate discount for given amount/quantity
 */
pricingRuleSchema.methods.calculateDiscount = function(basePrice, quantity = 1, context = {}) {
    const applicability = this.appliesTo(context);
    if (!applicability.applies) {
        return { discount: 0, reason: applicability.reason };
    }

    let discount = 0;
    const lineTotal = basePrice * quantity;

    // Handle tiered pricing
    if (this.ruleType === 'tiered' && this.tiers.length > 0) {
        const basisValue = this.tierBasis === 'quantity' ? quantity : lineTotal;
        const applicableTier = this.tiers
            .filter(t => basisValue >= t.minValue && (!t.maxValue || basisValue <= t.maxValue))
            .sort((a, b) => b.minValue - a.minValue)[0];

        if (applicableTier) {
            if (applicableTier.discountType === 'percentage') {
                discount = lineTotal * (applicableTier.discountValue / 100);
            } else if (applicableTier.discountType === 'fixed_amount') {
                discount = applicableTier.discountValue * quantity;
            } else if (applicableTier.discountType === 'fixed_price') {
                discount = lineTotal - (applicableTier.discountValue * quantity);
            }
        }
    } else {
        // Standard discount calculation
        if (this.discountType === 'percentage') {
            discount = lineTotal * (this.discountValue / 100);
        } else if (this.discountType === 'fixed_amount') {
            discount = this.discountValue * quantity;
        } else if (this.discountType === 'fixed_price') {
            discount = lineTotal - (this.discountValue * quantity);
        }
    }

    // Apply max discount cap
    if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
        discount = this.maxDiscountAmount;
    }

    // Protect margin if configured
    if (this.protectMargin && context.costPrice) {
        const minPrice = context.costPrice * (1 + this.minMarginPercent / 100);
        const priceAfterDiscount = lineTotal - discount;
        if (priceAfterDiscount < minPrice * quantity) {
            discount = lineTotal - (minPrice * quantity);
        }
    }

    return {
        discount: Math.round(discount * 100) / 100,
        discountPercent: lineTotal > 0 ? Math.round((discount / lineTotal) * 10000) / 100 : 0,
        finalPrice: Math.round((lineTotal - discount) * 100) / 100,
        ruleApplied: this.name
    };
};

/**
 * Record usage of this rule
 */
pricingRuleSchema.methods.recordUsage = async function(order, discountApplied) {
    this.usageCount += 1;
    this.budgetUsed += discountApplied;

    // Add to recent usage
    this.recentUsage.unshift({
        usedAt: new Date(),
        orderId: order._id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.customerName,
        discountApplied,
        orderAmount: order.grandTotal
    });

    // Trim usage history
    if (this.recentUsage.length > this.maxRecentUsageRecords) {
        this.recentUsage = this.recentUsage.slice(0, this.maxRecentUsageRecords);
    }

    return this.save();
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get applicable rules for context
 */
pricingRuleSchema.statics.getApplicableRules = async function(firmQuery, context = {}) {
    const now = new Date();

    const query = {
        ...firmQuery,
        isActive: true,
        $or: [
            { validFrom: null },
            { validFrom: { $lte: now } }
        ]
    };

    // Add validTo condition
    query.$and = [
        {
            $or: [
                { validTo: null },
                { validTo: { $gte: now } }
            ]
        }
    ];

    // Filter by promo code if provided
    if (context.promoCode) {
        query.promoCode = context.promoCode.toUpperCase();
    } else {
        query.requiresPromoCode = { $ne: true };
    }

    const rules = await this.find(query)
        .sort({ priority: -1, createdAt: 1 })
        .lean();

    // Filter by additional context
    return rules.filter(rule => {
        // Customer restrictions
        if (rule.applicableToCustomerIds?.length > 0 && context.customerId) {
            if (!rule.applicableToCustomerIds.some(id => id.toString() === context.customerId.toString())) {
                return false;
            }
        }

        // Exclusions
        if (rule.excludeCustomerIds?.length > 0 && context.customerId) {
            if (rule.excludeCustomerIds.some(id => id.toString() === context.customerId.toString())) {
                return false;
            }
        }

        // Usage limits
        if (rule.usageLimit && rule.usageCount >= rule.usageLimit) {
            return false;
        }

        // Budget limits
        if (rule.budgetLimit && rule.budgetUsed >= rule.budgetLimit) {
            return false;
        }

        return true;
    });
};

/**
 * Validate promo code
 */
pricingRuleSchema.statics.validatePromoCode = async function(firmQuery, promoCode, context = {}) {
    const rule = await this.findOne({
        ...firmQuery,
        promoCode: promoCode.toUpperCase(),
        isActive: true
    });

    if (!rule) {
        return { valid: false, message: 'Invalid promo code' };
    }

    const applicability = rule.appliesTo({ ...context, promoCode });
    if (!applicability.applies) {
        return { valid: false, message: applicability.reason };
    }

    return {
        valid: true,
        rule: {
            _id: rule._id,
            code: rule.code,
            name: rule.name,
            discountType: rule.discountType,
            discountValue: rule.discountValue,
            displayMessage: rule.displayMessage
        }
    };
};

module.exports = mongoose.model('PricingRule', pricingRuleSchema);
