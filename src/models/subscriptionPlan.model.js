/**
 * Subscription Plan Model
 *
 * Manages subscription plans and their features, limits, and pricing.
 * Used for firm subscription management and feature gating.
 */

const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
    planId: {
        type: String,
        required: true,
        unique: true,
        trim: true
        // e.g., 'free', 'starter', 'professional', 'enterprise'
    },

    name: {
        type: String,
        required: true,
        trim: true
    },
    nameAr: String,

    description: String,
    descriptionAr: String,

    // Pricing
    priceMonthly: {
        type: Number,
        default: 0
    },
    priceYearly: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        default: 'USD'
    },

    // Features list for display
    features: [{
        name: String,
        nameAr: String,
        included: { type: Boolean, default: true }
    }],

    // Actual limits
    limits: {
        users: { type: Number, default: -1 }, // -1 = unlimited
        cases: { type: Number, default: -1 },
        clients: { type: Number, default: -1 },
        storageGB: { type: Number, default: 5 },
        apiCallsPerMonth: { type: Number, default: 1000 },
        documentsPerMonth: { type: Number, default: -1 }
    },

    // Feature flags
    featureFlags: {
        zatcaIntegration: { type: Boolean, default: false },
        advancedReports: { type: Boolean, default: false },
        multiCurrency: { type: Boolean, default: false },
        apiAccess: { type: Boolean, default: false },
        customBranding: { type: Boolean, default: false },
        ssoSaml: { type: Boolean, default: false },
        prioritySupport: { type: Boolean, default: false },
        auditLog: { type: Boolean, default: true },
        webhooks: { type: Boolean, default: false }
    },

    // Stripe
    stripePriceIdMonthly: String,
    stripePriceIdYearly: String,
    stripeProductId: String,

    // Status
    isActive: { type: Boolean, default: true, index: true },
    isPublic: { type: Boolean, default: true }, // Show on pricing page

    sortOrder: { type: Number, default: 0 },

    // Trial
    trialDays: { type: Number, default: 14 },

    // Metadata
    metadata: mongoose.Schema.Types.Mixed
}, {
    timestamps: true,
    versionKey: false
});

// ============ INDEXES ============
subscriptionPlanSchema.index({ isActive: 1, sortOrder: 1 });
subscriptionPlanSchema.index({ planId: 1, isActive: 1 });
subscriptionPlanSchema.index({ isPublic: 1, isActive: 1, sortOrder: 1 });

// ============ STATICS ============

/**
 * Get all public and active subscription plans
 * @returns {Promise<Array>} Public plans sorted by sortOrder
 */
subscriptionPlanSchema.statics.getPublicPlans = async function() {
    return this.find({
        isActive: true,
        isPublic: true
    })
    .sort({ sortOrder: 1 })
    .lean();
};

/**
 * Get a specific plan by its planId
 * @param {string} planId - Plan identifier (e.g., 'free', 'starter', 'professional', 'enterprise')
 * @returns {Promise<object|null>} Subscription plan or null
 */
subscriptionPlanSchema.statics.getPlanById = async function(planId) {
    return this.findOne({
        planId,
        isActive: true
    }).lean();
};

/**
 * Get all active plans (including non-public)
 * @returns {Promise<Array>} All active plans sorted by sortOrder
 */
subscriptionPlanSchema.statics.getActivePlans = async function() {
    return this.find({
        isActive: true
    })
    .sort({ sortOrder: 1 })
    .lean();
};

/**
 * Check if a plan has a specific feature
 * @param {string} planId - Plan identifier
 * @param {string} featureName - Feature flag name
 * @returns {Promise<boolean>} Whether the feature is enabled
 */
subscriptionPlanSchema.statics.hasFeature = async function(planId, featureName) {
    const plan = await this.findOne({
        planId,
        isActive: true
    }).lean();

    if (!plan) return false;
    return plan.featureFlags && plan.featureFlags[featureName] === true;
};

/**
 * Get plan limits
 * @param {string} planId - Plan identifier
 * @returns {Promise<object|null>} Plan limits or null
 */
subscriptionPlanSchema.statics.getPlanLimits = async function(planId) {
    const plan = await this.findOne({
        planId,
        isActive: true
    })
    .select('limits')
    .lean();

    return plan ? plan.limits : null;
};

/**
 * Compare two plans
 * @param {string} fromPlanId - Current plan ID
 * @param {string} toPlanId - Target plan ID
 * @returns {Promise<object>} Comparison result with upgrade/downgrade info
 */
subscriptionPlanSchema.statics.comparePlans = async function(fromPlanId, toPlanId) {
    const [fromPlan, toPlan] = await Promise.all([
        this.getPlanById(fromPlanId),
        this.getPlanById(toPlanId)
    ]);

    if (!fromPlan || !toPlan) {
        return {
            valid: false,
            error: 'One or both plans not found'
        };
    }

    const isUpgrade = toPlan.priceMonthly > fromPlan.priceMonthly;
    const priceDifference = {
        monthly: toPlan.priceMonthly - fromPlan.priceMonthly,
        yearly: toPlan.priceYearly - fromPlan.priceYearly
    };

    // Compare limits
    const limitChanges = {};
    if (fromPlan.limits && toPlan.limits) {
        for (const key in toPlan.limits) {
            if (fromPlan.limits[key] !== toPlan.limits[key]) {
                limitChanges[key] = {
                    from: fromPlan.limits[key],
                    to: toPlan.limits[key],
                    change: toPlan.limits[key] === -1 ? 'unlimited' :
                            (toPlan.limits[key] > fromPlan.limits[key] ? 'increased' : 'decreased')
                };
            }
        }
    }

    // Compare features
    const featureChanges = {};
    if (fromPlan.featureFlags && toPlan.featureFlags) {
        for (const key in toPlan.featureFlags) {
            if (fromPlan.featureFlags[key] !== toPlan.featureFlags[key]) {
                featureChanges[key] = {
                    from: fromPlan.featureFlags[key],
                    to: toPlan.featureFlags[key],
                    change: toPlan.featureFlags[key] ? 'enabled' : 'disabled'
                };
            }
        }
    }

    return {
        valid: true,
        isUpgrade,
        isDowngrade: !isUpgrade,
        priceDifference,
        limitChanges,
        featureChanges,
        fromPlan: {
            planId: fromPlan.planId,
            name: fromPlan.name,
            priceMonthly: fromPlan.priceMonthly
        },
        toPlan: {
            planId: toPlan.planId,
            name: toPlan.name,
            priceMonthly: toPlan.priceMonthly
        }
    };
};

/**
 * Get plan by Stripe product ID
 * @param {string} stripeProductId - Stripe product ID
 * @returns {Promise<object|null>} Subscription plan or null
 */
subscriptionPlanSchema.statics.getByStripeProductId = async function(stripeProductId) {
    return this.findOne({
        stripeProductId,
        isActive: true
    }).lean();
};

/**
 * Get plan by Stripe price ID
 * @param {string} stripePriceId - Stripe price ID (monthly or yearly)
 * @returns {Promise<object|null>} Subscription plan or null
 */
subscriptionPlanSchema.statics.getByStripePriceId = async function(stripePriceId) {
    return this.findOne({
        $or: [
            { stripePriceIdMonthly: stripePriceId },
            { stripePriceIdYearly: stripePriceId }
        ],
        isActive: true
    }).lean();
};

// ============ METHODS ============

/**
 * Check if this plan has a specific feature
 * @param {string} featureName - Feature flag name
 * @returns {boolean}
 */
subscriptionPlanSchema.methods.hasFeatureFlag = function(featureName) {
    return this.featureFlags && this.featureFlags[featureName] === true;
};

/**
 * Check if limit is unlimited
 * @param {string} limitName - Limit name (e.g., 'users', 'cases')
 * @returns {boolean}
 */
subscriptionPlanSchema.methods.isUnlimited = function(limitName) {
    return this.limits && this.limits[limitName] === -1;
};

/**
 * Get limit value
 * @param {string} limitName - Limit name
 * @returns {number} Limit value (-1 for unlimited)
 */
subscriptionPlanSchema.methods.getLimit = function(limitName) {
    return this.limits && this.limits[limitName] !== undefined ? this.limits[limitName] : 0;
};

/**
 * Get yearly price with discount percentage
 * @returns {object} Yearly pricing info
 */
subscriptionPlanSchema.methods.getYearlyDiscount = function() {
    if (this.priceMonthly === 0 || this.priceYearly === 0) {
        return {
            hasDiscount: false,
            discount: 0,
            savingsAmount: 0,
            savingsPercentage: 0
        };
    }

    const monthlyTotal = this.priceMonthly * 12;
    const savingsAmount = monthlyTotal - this.priceYearly;
    const savingsPercentage = Math.round((savingsAmount / monthlyTotal) * 100);

    return {
        hasDiscount: savingsAmount > 0,
        discount: savingsPercentage,
        savingsAmount,
        savingsPercentage,
        monthlyTotal,
        yearlyTotal: this.priceYearly
    };
};

/**
 * Check if plan is free
 * @returns {boolean}
 */
subscriptionPlanSchema.methods.isFree = function() {
    return this.priceMonthly === 0 && this.priceYearly === 0;
};

/**
 * Get plan summary for display
 * @returns {object} Plan summary
 */
subscriptionPlanSchema.methods.getSummary = function() {
    return {
        planId: this.planId,
        name: this.name,
        nameAr: this.nameAr,
        description: this.description,
        descriptionAr: this.descriptionAr,
        pricing: {
            monthly: this.priceMonthly,
            yearly: this.priceYearly,
            currency: this.currency,
            yearlyDiscount: this.getYearlyDiscount()
        },
        features: this.features,
        limits: this.limits,
        featureFlags: this.featureFlags,
        trialDays: this.trialDays,
        isFree: this.isFree()
    };
};

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
