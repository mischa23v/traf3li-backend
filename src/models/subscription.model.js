/**
 * Subscription Model
 *
 * Manages firm subscriptions, billing cycles, trials, and usage tracking.
 * Integrates with Stripe for payment processing and plan management.
 */

const mongoose = require('mongoose');
const { getPlanConfig, hasFeature: planHasFeature, checkLimit: planCheckLimit } = require('../config/plans.config');

const subscriptionSchema = new mongoose.Schema({
    // ============ TENANT ISOLATION ============
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        unique: true,
        index: true
    },

    // ============ PLAN INFORMATION ============
    planId: {
        type: String,
        enum: ['free', 'starter', 'professional', 'enterprise'],
        required: true,
        default: 'free'
    },

    // ============ SUBSCRIPTION STATUS ============
    status: {
        type: String,
        enum: ['active', 'past_due', 'canceled', 'trialing', 'paused', 'incomplete'],
        default: 'trialing',
        index: true
    },

    // ============ BILLING ============
    billingCycle: {
        type: String,
        enum: ['monthly', 'yearly'],
        default: 'monthly'
    },

    // ============ PERIOD ============
    currentPeriodStart: Date,
    currentPeriodEnd: Date,

    // ============ TRIAL ============
    trialStart: Date,
    trialEnd: Date,

    // ============ CANCELLATION ============
    cancelAtPeriodEnd: { type: Boolean, default: false },
    canceledAt: Date,
    cancellationReason: String,

    // ============ STRIPE INTEGRATION ============
    stripeCustomerId: String,
    stripeSubscriptionId: String,

    // ============ USAGE TRACKING ============
    usage: {
        users: { type: Number, default: 0 },
        cases: { type: Number, default: 0 },
        clients: { type: Number, default: 0 },
        storageUsedMB: { type: Number, default: 0 },
        apiCallsThisMonth: { type: Number, default: 0 },
        lastUsageReset: Date
    },

    // ============ AUDIT ============
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true,
    versionKey: false
});

// ============ INDEXES ============
subscriptionSchema.index({ firmId: 1, status: 1 });
subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });
subscriptionSchema.index({ stripeSubscriptionId: 1 });
subscriptionSchema.index({ trialEnd: 1 }, { partialFilterExpression: { status: 'trialing' } });

// ============ INSTANCE METHODS ============

/**
 * Check if subscription is active
 * @returns {boolean}
 */
subscriptionSchema.methods.isActive = function() {
    // Active means the subscription is in 'active' status
    // and not scheduled for cancellation, or is currently in trial
    if (this.status === 'active') {
        return true;
    }

    // Trialing subscriptions are also considered active
    if (this.status === 'trialing' && this.isTrialing()) {
        return true;
    }

    return false;
};

/**
 * Check if subscription is in trial period
 * @returns {boolean}
 */
subscriptionSchema.methods.isTrialing = function() {
    if (this.status !== 'trialing') {
        return false;
    }

    // Check if trial end date exists and hasn't passed
    if (this.trialEnd) {
        return new Date() < this.trialEnd;
    }

    // If no trial end date is set but status is trialing, consider it as trialing
    return true;
};

/**
 * Check if subscription has a specific feature
 * @param {string} feature - Feature name to check
 * @returns {Promise<boolean>}
 */
subscriptionSchema.methods.hasFeature = async function(feature) {
    // Only active or trialing subscriptions have features
    if (!this.isActive()) {
        return false;
    }

    // Get plan configuration
    const planConfig = getPlanConfig(this.planId);

    // Check if plan has the feature
    return planHasFeature(this.planId, feature);
};

/**
 * Check usage limits for a specific resource
 * @param {string} limitType - Type of limit to check ('users', 'cases', 'clients', 'storage', 'apiCalls')
 * @returns {Promise<object>} Limit check result with details
 */
subscriptionSchema.methods.checkLimit = async function(limitType) {
    // Map limitType to usage field
    const usageMap = {
        'users': 'users',
        'cases': 'cases',
        'clients': 'clients',
        'storage': 'storageUsedMB',
        'apiCalls': 'apiCallsThisMonth'
    };

    const usageField = usageMap[limitType] || limitType;
    const currentUsage = this.usage[usageField] || 0;

    // Use the plan's checkLimit function
    const limitCheck = planCheckLimit(this.planId, limitType, currentUsage);

    return {
        ...limitCheck,
        canAdd: limitCheck.allowed,
        subscriptionStatus: this.status,
        planId: this.planId
    };
};

/**
 * Check if subscription is expired
 * @returns {boolean}
 */
subscriptionSchema.methods.isExpired = function() {
    if (this.status === 'canceled') {
        return true;
    }

    // Check if trial has expired
    if (this.status === 'trialing' && this.trialEnd && new Date() > this.trialEnd) {
        return true;
    }

    // Check if current period has expired and subscription is past due
    if (this.status === 'past_due' && this.currentPeriodEnd && new Date() > this.currentPeriodEnd) {
        return true;
    }

    return false;
};

/**
 * Get days remaining in trial
 * @returns {number|null} Days remaining or null if not in trial
 */
subscriptionSchema.methods.getTrialDaysRemaining = function() {
    if (!this.isTrialing() || !this.trialEnd) {
        return null;
    }

    const now = new Date();
    const diffTime = this.trialEnd - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
};

/**
 * Get subscription summary
 * @returns {object} Subscription summary with status and details
 */
subscriptionSchema.methods.getSummary = function() {
    const planConfig = getPlanConfig(this.planId);

    return {
        subscriptionId: this._id,
        firmId: this.firmId,
        plan: {
            id: this.planId,
            name: planConfig.name,
            nameAr: planConfig.nameAr
        },
        status: this.status,
        isActive: this.isActive(),
        isTrialing: this.isTrialing(),
        billingCycle: this.billingCycle,
        currentPeriod: {
            start: this.currentPeriodStart,
            end: this.currentPeriodEnd
        },
        trial: this.isTrialing() ? {
            start: this.trialStart,
            end: this.trialEnd,
            daysRemaining: this.getTrialDaysRemaining()
        } : null,
        usage: this.usage,
        limits: planConfig.limits,
        features: planConfig.features,
        cancelAtPeriodEnd: this.cancelAtPeriodEnd,
        canceledAt: this.canceledAt
    };
};

/**
 * Update usage statistics
 * @param {object} usageUpdates - Usage updates { users: 5, cases: 10, etc. }
 * @returns {Promise<object>} Updated subscription
 */
subscriptionSchema.methods.updateUsage = async function(usageUpdates) {
    Object.keys(usageUpdates).forEach(key => {
        if (this.usage[key] !== undefined) {
            this.usage[key] = usageUpdates[key];
        }
    });

    return this.save();
};

/**
 * Reset monthly usage counters
 * @returns {Promise<object>} Updated subscription
 */
subscriptionSchema.methods.resetMonthlyUsage = async function() {
    this.usage.apiCallsThisMonth = 0;
    this.usage.lastUsageReset = new Date();

    return this.save();
};

// ============ STATIC METHODS ============

/**
 * Get subscription by firm ID
 * @param {string} firmId - Firm ID
 * @returns {Promise<object|null>} Subscription document or null
 */
subscriptionSchema.statics.getByFirmId = async function(firmId) {
    return this.findOne({ firmId })
        .populate('firmId', 'name nameArabic')
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email')
        .lean();
};

/**
 * Create a trial subscription for a firm
 * @param {string} firmId - Firm ID
 * @param {string} planId - Plan ID (default: 'starter')
 * @param {object} options - Additional options { trialDays: 14, createdBy: userId }
 * @returns {Promise<object>} Created subscription
 */
subscriptionSchema.statics.createTrialSubscription = async function(firmId, planId = 'starter', options = {}) {
    const trialDays = options.trialDays || 14;
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + trialDays);

    const subscription = new this({
        firmId,
        planId,
        status: 'trialing',
        billingCycle: 'monthly',
        trialStart: now,
        trialEnd: trialEnd,
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        usage: {
            users: 0,
            cases: 0,
            clients: 0,
            storageUsedMB: 0,
            apiCallsThisMonth: 0,
            lastUsageReset: now
        },
        createdBy: options.createdBy || null
    });

    return subscription.save();
};

/**
 * Get subscriptions expiring soon
 * @param {number} days - Number of days to look ahead (default: 7)
 * @returns {Promise<Array>} Subscriptions expiring soon
 */
subscriptionSchema.statics.getExpiringSoon = async function(days = 7) {
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + days);

    return this.find({
        status: { $in: ['active', 'trialing'] },
        $or: [
            {
                status: 'trialing',
                trialEnd: { $gte: now, $lte: futureDate }
            },
            {
                status: 'active',
                currentPeriodEnd: { $gte: now, $lte: futureDate },
                cancelAtPeriodEnd: true
            }
        ]
    })
    .populate('firmId', 'name email')
    .sort({ trialEnd: 1, currentPeriodEnd: 1 })
    .lean();
};

/**
 * Get expired subscriptions that need to be updated
 * @returns {Promise<Array>} Expired subscriptions
 */
subscriptionSchema.statics.getExpired = async function() {
    const now = new Date();

    return this.find({
        $or: [
            {
                status: 'trialing',
                trialEnd: { $lt: now }
            },
            {
                status: 'past_due',
                currentPeriodEnd: { $lt: now }
            }
        ]
    })
    .populate('firmId', 'name email')
    .lean();
};

/**
 * Update subscription status
 * @param {string} subscriptionId - Subscription ID
 * @param {string} status - New status
 * @param {string} updatedBy - User ID making the update
 * @returns {Promise<object>} Updated subscription
 */
subscriptionSchema.statics.updateStatus = async function(subscriptionId, status, updatedBy = null) {
    const update = {
        status,
        updatedBy
    };

    // If canceling, set cancellation date
    if (status === 'canceled') {
        update.canceledAt = new Date();
    }

    return this.findByIdAndUpdate(
        subscriptionId,
        update,
        { new: true, runValidators: true }
    );
};

/**
 * Cancel subscription at period end
 * @param {string} subscriptionId - Subscription ID
 * @param {string} reason - Cancellation reason
 * @param {string} updatedBy - User ID making the cancellation
 * @returns {Promise<object>} Updated subscription
 */
subscriptionSchema.statics.cancelAtPeriodEnd = async function(subscriptionId, reason = null, updatedBy = null) {
    return this.findByIdAndUpdate(
        subscriptionId,
        {
            cancelAtPeriodEnd: true,
            cancellationReason: reason,
            updatedBy
        },
        { new: true, runValidators: true }
    );
};

/**
 * Reactivate a canceled subscription
 * @param {string} subscriptionId - Subscription ID
 * @param {string} updatedBy - User ID making the reactivation
 * @returns {Promise<object>} Updated subscription
 */
subscriptionSchema.statics.reactivate = async function(subscriptionId, updatedBy = null) {
    return this.findByIdAndUpdate(
        subscriptionId,
        {
            cancelAtPeriodEnd: false,
            cancellationReason: null,
            status: 'active',
            updatedBy
        },
        { new: true, runValidators: true }
    );
};

/**
 * Get subscription statistics
 * @returns {Promise<object>} Statistics
 */
subscriptionSchema.statics.getStats = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                active: {
                    $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                },
                trialing: {
                    $sum: { $cond: [{ $eq: ['$status', 'trialing'] }, 1, 0] }
                },
                canceled: {
                    $sum: { $cond: [{ $eq: ['$status', 'canceled'] }, 1, 0] }
                },
                past_due: {
                    $sum: { $cond: [{ $eq: ['$status', 'past_due'] }, 1, 0] }
                },
                paused: {
                    $sum: { $cond: [{ $eq: ['$status', 'paused'] }, 1, 0] }
                }
            }
        },
        {
            $project: {
                _id: 0,
                total: 1,
                active: 1,
                trialing: 1,
                canceled: 1,
                past_due: 1,
                paused: 1
            }
        }
    ]);

    return stats[0] || {
        total: 0,
        active: 0,
        trialing: 0,
        canceled: 0,
        past_due: 0,
        paused: 0
    };
};

/**
 * Get subscription statistics by plan
 * @returns {Promise<Array>} Statistics by plan
 */
subscriptionSchema.statics.getStatsByPlan = async function() {
    return this.aggregate([
        {
            $group: {
                _id: '$planId',
                count: { $sum: 1 },
                active: {
                    $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                },
                trialing: {
                    $sum: { $cond: [{ $eq: ['$status', 'trialing'] }, 1, 0] }
                }
            }
        },
        {
            $project: {
                _id: 0,
                plan: '$_id',
                count: 1,
                active: 1,
                trialing: 1
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
