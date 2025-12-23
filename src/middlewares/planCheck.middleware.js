/**
 * Plan Check Middleware
 *
 * Middleware functions for checking plan features and limits.
 * Used to gate features based on subscription tier.
 */

const logger = require('../utils/logger');
const { Firm, User } = require('../models');
const {
    getPlanConfig,
    hasFeature,
    checkLimit,
    isPlanAtLeast,
    getRequiredPlanForFeature,
    hasApiAccess
} = require('../config/plans.config');

/**
 * Get effective plan for the request
 * @param {object} req - Express request
 * @returns {Promise<string>} Plan name
 */
const getEffectivePlan = async (req) => {
    // If firmId is available, get plan from firm
    if (req.firmId) {
        const firm = await Firm.findById(req.firmId).select('subscription').lean();
        if (firm?.subscription?.plan) {
            // Check if plan is expired
            if (firm.subscription.status === 'expired') {
                return 'free';
            }
            // Check if trial has ended
            if (firm.subscription.status === 'trial' && firm.subscription.trialEndsAt) {
                if (new Date() > firm.subscription.trialEndsAt) {
                    return 'free';
                }
            }
            return firm.subscription.plan;
        }
    }

    // Fallback to free plan
    return 'free';
};

/**
 * Middleware to check if user's plan has a specific feature
 * @param {string} feature - Feature name to check
 * @returns {Function} Express middleware
 */
const requireFeature = (feature) => {
    return async (req, res, next) => {
        try {
            const plan = await getEffectivePlan(req);

            if (!hasFeature(plan, feature)) {
                const requiredPlan = getRequiredPlanForFeature(feature);
                return res.status(403).json({
                    success: false,
                    error: 'Feature not available',
                    message: `الميزة "${feature}" تتطلب ترقية الباقة`,
                    messageEn: `The "${feature}" feature requires a higher plan`,
                    requiredPlan,
                    currentPlan: plan,
                    upgradeUrl: '/settings/billing'
                });
            }

            // Attach plan info to request
            req.plan = plan;
            req.planConfig = getPlanConfig(plan);
            next();
        } catch (error) {
            logger.error('Plan feature check error:', error);
            next(error);
        }
    };
};

/**
 * Middleware to check if user's plan is at least a certain level
 * @param {string} minPlan - Minimum required plan
 * @returns {Function} Express middleware
 */
const requirePlan = (minPlan) => {
    return async (req, res, next) => {
        try {
            const plan = await getEffectivePlan(req);

            if (!isPlanAtLeast(plan, minPlan)) {
                return res.status(403).json({
                    success: false,
                    error: 'Plan upgrade required',
                    message: `هذه الميزة تتطلب باقة ${minPlan} على الأقل`,
                    messageEn: `This feature requires at least the ${minPlan} plan`,
                    requiredPlan: minPlan,
                    currentPlan: plan,
                    upgradeUrl: '/settings/billing'
                });
            }

            req.plan = plan;
            req.planConfig = getPlanConfig(plan);
            next();
        } catch (error) {
            logger.error('Plan level check error:', error);
            next(error);
        }
    };
};

/**
 * Middleware to check resource limits
 * @param {string} resource - Resource name (users, cases, clients, etc.)
 * @returns {Function} Express middleware
 */
const checkResourceLimit = (resource) => {
    return async (req, res, next) => {
        try {
            const plan = await getEffectivePlan(req);

            if (!req.firmId) {
                // Solo lawyers don't have limits enforced
                return next();
            }

            const firm = await Firm.findById(req.firmId).select('usage').lean();
            const currentUsage = firm?.usage?.[resource] || 0;

            const limitCheck = checkLimit(plan, resource, currentUsage);

            if (!limitCheck.allowed) {
                return res.status(403).json({
                    success: false,
                    error: 'Limit reached',
                    message: `لقد وصلت إلى الحد الأقصى لـ ${resource} في باقتك الحالية`,
                    messageEn: `You have reached the ${resource} limit for your plan`,
                    ...limitCheck,
                    upgradeUrl: '/settings/billing'
                });
            }

            req.limitCheck = limitCheck;
            req.plan = plan;
            next();
        } catch (error) {
            logger.error('Resource limit check error:', error);
            next(error);
        }
    };
};

/**
 * Middleware to check API access
 * @returns {Function} Express middleware
 */
const requireApiAccess = () => {
    return async (req, res, next) => {
        try {
            const plan = await getEffectivePlan(req);

            if (!hasApiAccess(plan)) {
                return res.status(403).json({
                    success: false,
                    error: 'API access not available',
                    message: 'الوصول إلى API يتطلب باقة Professional أو Enterprise',
                    messageEn: 'API access requires Professional or Enterprise plan',
                    requiredPlan: 'professional',
                    currentPlan: plan,
                    upgradeUrl: '/settings/billing'
                });
            }

            req.plan = plan;
            next();
        } catch (error) {
            logger.error('API access check error:', error);
            next(error);
        }
    };
};

/**
 * Middleware to attach plan info without blocking
 * Useful for routes that need plan info but don't need to block access
 */
const attachPlanInfo = async (req, res, next) => {
    try {
        const plan = await getEffectivePlan(req);
        req.plan = plan;
        req.planConfig = getPlanConfig(plan);
        next();
    } catch (error) {
        // Don't block on error, just continue without plan info
        next();
    }
};

/**
 * Middleware to check multiple features (OR logic)
 * @param {Array<string>} features - Array of feature names
 * @returns {Function} Express middleware
 */
const requireAnyFeature = (features) => {
    return async (req, res, next) => {
        try {
            const plan = await getEffectivePlan(req);

            const hasAnyFeature = features.some(feature => hasFeature(plan, feature));

            if (!hasAnyFeature) {
                return res.status(403).json({
                    success: false,
                    error: 'Feature not available',
                    message: 'هذه الميزة غير متاحة في باقتك الحالية',
                    messageEn: 'This feature is not available in your current plan',
                    requiredFeatures: features,
                    currentPlan: plan,
                    upgradeUrl: '/settings/billing'
                });
            }

            req.plan = plan;
            req.planConfig = getPlanConfig(plan);
            next();
        } catch (error) {
            logger.error('Feature check error:', error);
            next(error);
        }
    };
};

/**
 * Middleware to check multiple features (AND logic)
 * @param {Array<string>} features - Array of feature names
 * @returns {Function} Express middleware
 */
const requireAllFeatures = (features) => {
    return async (req, res, next) => {
        try {
            const plan = await getEffectivePlan(req);

            const missingFeatures = features.filter(feature => !hasFeature(plan, feature));

            if (missingFeatures.length > 0) {
                return res.status(403).json({
                    success: false,
                    error: 'Features not available',
                    message: 'بعض الميزات غير متاحة في باقتك الحالية',
                    messageEn: 'Some features are not available in your current plan',
                    missingFeatures,
                    currentPlan: plan,
                    upgradeUrl: '/settings/billing'
                });
            }

            req.plan = plan;
            req.planConfig = getPlanConfig(plan);
            next();
        } catch (error) {
            logger.error('Feature check error:', error);
            next(error);
        }
    };
};

/**
 * Middleware to check storage limit
 * @param {number} additionalMB - Additional storage being requested
 * @returns {Function} Express middleware
 */
const checkStorageLimit = (additionalMB = 0) => {
    return async (req, res, next) => {
        try {
            const plan = await getEffectivePlan(req);

            if (!req.firmId) {
                return next();
            }

            const firm = await Firm.findById(req.firmId).select('usage').lean();
            const currentUsage = (firm?.usage?.storageUsedMB || 0) + additionalMB;

            const limitCheck = checkLimit(plan, 'storage', currentUsage);

            if (!limitCheck.allowed) {
                return res.status(403).json({
                    success: false,
                    error: 'Storage limit reached',
                    message: 'لقد وصلت إلى الحد الأقصى للتخزين في باقتك الحالية',
                    messageEn: 'You have reached the storage limit for your plan',
                    ...limitCheck,
                    upgradeUrl: '/settings/billing'
                });
            }

            req.storageCheck = limitCheck;
            req.plan = plan;
            next();
        } catch (error) {
            logger.error('Storage limit check error:', error);
            next(error);
        }
    };
};

module.exports = {
    getEffectivePlan,
    requireFeature,
    requirePlan,
    checkResourceLimit,
    requireApiAccess,
    attachPlanInfo,
    requireAnyFeature,
    requireAllFeatures,
    checkStorageLimit
};
