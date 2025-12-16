/**
 * Plan Controller
 *
 * Handles plan-related operations including:
 * - Getting available plans
 * - Getting current plan and usage
 * - Starting trials
 * - Upgrading/downgrading plans
 */

const asyncHandler = require('../utils/asyncHandler');
const { Firm, User, Case, Client, Document } = require('../models');
const CustomException = require('../utils/CustomException');
const {
    PLANS,
    getPlanConfig,
    checkLimit,
    getAllPlans,
    getNextPlan,
    isPlanAtLeast
} = require('../config/plans.config');

/**
 * GET /api/plans
 * Get all available plans with pricing and features
 */
const getPlans = asyncHandler(async (req, res) => {
    const plans = getAllPlans();

    // Format plans for frontend
    const formattedPlans = Object.entries(plans).map(([key, plan]) => ({
        id: key,
        ...plan,
        isCurrent: false, // Will be set by frontend
        isPopular: key === 'professional'
    }));

    res.status(200).json({
        success: true,
        data: formattedPlans
    });
});

/**
 * GET /api/plans/current
 * Get current plan details for the firm
 */
const getCurrentPlan = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        // Solo lawyers are on free plan by default
        return res.status(200).json({
            success: true,
            data: {
                plan: 'free',
                config: getPlanConfig('free'),
                usage: {},
                billing: null,
                trial: { isOnTrial: false }
            }
        });
    }

    const firm = await Firm.findById(firmId)
        .select('subscription usage billing')
        .lean();

    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    const plan = firm.subscription?.plan || 'free';
    const config = getPlanConfig(plan);

    // Check trial status
    const isOnTrial = firm.subscription?.status === 'trial' &&
        firm.subscription?.trialEndsAt &&
        new Date() < new Date(firm.subscription.trialEndsAt);

    // Check if plan is expired
    const isExpired = firm.subscription?.status === 'expired' ||
        (firm.subscription?.currentPeriodEnd && new Date() > new Date(firm.subscription.currentPeriodEnd));

    res.status(200).json({
        success: true,
        data: {
            plan: isExpired ? 'free' : plan,
            config,
            usage: firm.usage || {},
            billing: {
                cycle: firm.subscription?.billingCycle,
                nextBillingDate: firm.billing?.nextBillingDate,
                expiresAt: firm.subscription?.currentPeriodEnd,
                autoRenew: firm.billing?.autoRenew
            },
            trial: {
                isOnTrial,
                trialEndsAt: firm.subscription?.trialEndsAt,
                daysRemaining: isOnTrial
                    ? Math.ceil((new Date(firm.subscription.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24))
                    : 0
            },
            status: firm.subscription?.status || 'trial'
        }
    });
});

/**
 * GET /api/plans/usage
 * Get detailed usage statistics
 */
const getUsage = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        return res.status(200).json({
            success: true,
            data: {
                message: 'Solo lawyers have unlimited usage'
            }
        });
    }

    const firm = await Firm.findById(firmId)
        .select('subscription usage')
        .lean();

    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    const plan = firm.subscription?.plan || 'free';
    const config = getPlanConfig(plan);

    // Get actual counts from database
    const [casesCount, clientsCount, usersCount, documentsCount] = await Promise.all([
        Case.countDocuments({ firmId }),
        Client.countDocuments({ firmId }),
        User.countDocuments({ firmId }),
        Document.countDocuments({ firmId })
    ]);

    // Build usage response with limit checks
    const usage = {
        cases: {
            current: casesCount,
            limit: config.limits.maxCases,
            unlimited: config.limits.maxCases === -1,
            ...(!config.limits.maxCases === -1 && {
                percentage: Math.round((casesCount / config.limits.maxCases) * 100),
                remaining: Math.max(0, config.limits.maxCases - casesCount),
                isNearLimit: casesCount >= config.limits.maxCases * 0.8,
                isAtLimit: casesCount >= config.limits.maxCases
            })
        },
        clients: {
            current: clientsCount,
            limit: config.limits.maxClients,
            unlimited: config.limits.maxClients === -1,
            ...(!config.limits.maxClients === -1 && {
                percentage: Math.round((clientsCount / config.limits.maxClients) * 100),
                remaining: Math.max(0, config.limits.maxClients - clientsCount),
                isNearLimit: clientsCount >= config.limits.maxClients * 0.8,
                isAtLimit: clientsCount >= config.limits.maxClients
            })
        },
        users: {
            current: usersCount,
            limit: config.limits.maxUsers,
            unlimited: config.limits.maxUsers === -1,
            ...(!config.limits.maxUsers === -1 && {
                percentage: Math.round((usersCount / config.limits.maxUsers) * 100),
                remaining: Math.max(0, config.limits.maxUsers - usersCount),
                isNearLimit: usersCount >= config.limits.maxUsers * 0.8,
                isAtLimit: usersCount >= config.limits.maxUsers
            })
        },
        storage: {
            current: firm.usage?.storageUsedMB || 0,
            limit: config.limits.maxStorageMB,
            unlimited: config.limits.maxStorageMB === -1,
            unit: 'MB'
        },
        documents: {
            current: documentsCount,
            limit: null,
            unlimited: true
        },
        apiCalls: {
            current: firm.usage?.apiCallsThisMonth || 0,
            limit: config.limits.apiCallsPerMonth,
            unlimited: config.limits.apiCallsPerMonth === -1,
            resetDate: firm.usage?.lastResetDate
        }
    };

    // Calculate percentages for non-unlimited resources
    for (const key in usage) {
        if (!usage[key].unlimited && usage[key].limit) {
            usage[key].percentage = Math.round((usage[key].current / usage[key].limit) * 100);
            usage[key].isNearLimit = usage[key].percentage >= 80;
            usage[key].isAtLimit = usage[key].current >= usage[key].limit;
        }
    }

    res.status(200).json({
        success: true,
        data: usage
    });
});

/**
 * POST /api/plans/start-trial
 * Start a trial for a specific plan
 */
const startTrial = asyncHandler(async (req, res) => {
    const { plan } = req.body;
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب لبدء النسخة التجريبية', 403);
    }

    // Validate plan
    if (!['starter', 'professional'].includes(plan)) {
        throw CustomException('لا يمكن بدء نسخة تجريبية لهذه الباقة', 400);
    }

    const firm = await Firm.findById(firmId);

    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    // Check if already had a trial
    if (firm.subscription?.trialEndsAt) {
        throw CustomException('لقد استخدمت النسخة التجريبية مسبقاً', 400);
    }

    // Set 14-day trial
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    firm.subscription = {
        ...firm.subscription,
        plan,
        status: 'trial',
        trialEndsAt: trialEnd,
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEnd
    };

    await firm.save();

    res.status(200).json({
        success: true,
        message: 'تم بدء النسخة التجريبية بنجاح',
        data: {
            plan,
            trialEndsAt: trialEnd,
            daysRemaining: 14
        }
    });
});

/**
 * POST /api/plans/upgrade
 * Upgrade to a new plan (placeholder for Stripe integration)
 */
const upgradePlan = asyncHandler(async (req, res) => {
    const { plan, billingCycle } = req.body;
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب لترقية الباقة', 403);
    }

    // Validate plan
    if (!['starter', 'professional', 'enterprise'].includes(plan)) {
        throw CustomException('باقة غير صالحة', 400);
    }

    // Validate billing cycle
    if (!['monthly', 'annual'].includes(billingCycle)) {
        throw CustomException('دورة الفوترة غير صالحة', 400);
    }

    const firm = await Firm.findById(firmId);

    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    // In production, this would integrate with Stripe:
    // 1. Create/update Stripe subscription
    // 2. Handle payment
    // 3. Set webhook to handle payment success/failure

    // For now, just update the plan (demo mode)
    const periodEnd = new Date();
    if (billingCycle === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    firm.subscription = {
        ...firm.subscription,
        plan,
        status: 'active',
        billingCycle,
        trialEndsAt: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd
    };

    firm.billing = {
        ...firm.billing,
        nextBillingDate: periodEnd,
        autoRenew: true
    };

    await firm.save();

    res.status(200).json({
        success: true,
        message: 'تم ترقية الباقة بنجاح',
        data: {
            plan,
            billingCycle,
            currentPeriodEnd: periodEnd
        }
    });
});

/**
 * POST /api/plans/cancel
 * Cancel the current subscription
 */
const cancelPlan = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب', 403);
    }

    const firm = await Firm.findById(firmId);

    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    // In production, cancel Stripe subscription
    firm.subscription.status = 'cancelled';
    firm.billing.autoRenew = false;

    await firm.save();

    res.status(200).json({
        success: true,
        message: 'تم إلغاء الاشتراك. ستبقى باقتك الحالية فعالة حتى نهاية الفترة الحالية.',
        data: {
            cancelledAt: new Date(),
            activeUntil: firm.subscription.currentPeriodEnd
        }
    });
});

/**
 * GET /api/plans/features
 * Get features comparison for all plans
 */
const getFeaturesComparison = asyncHandler(async (req, res) => {
    const plans = getAllPlans();

    // Build feature comparison matrix
    const allFeatures = new Set();
    Object.values(plans).forEach(plan => {
        plan.features.forEach(f => allFeatures.add(f));
    });

    const comparison = Array.from(allFeatures).map(feature => ({
        feature,
        free: plans.free.features.includes(feature),
        starter: plans.starter.features.includes(feature),
        professional: plans.professional.features.includes(feature),
        enterprise: plans.enterprise.features.includes(feature)
    }));

    res.status(200).json({
        success: true,
        data: comparison
    });
});

/**
 * GET /api/plans/limits
 * Get limits for a specific plan or current plan
 */
const getLimits = asyncHandler(async (req, res) => {
    const { plan: queryPlan } = req.query;
    let plan = queryPlan;

    if (!plan && req.firmId) {
        const firm = await Firm.findById(req.firmId).select('subscription').lean();
        plan = firm?.subscription?.plan || 'free';
    }

    plan = plan || 'free';
    const config = getPlanConfig(plan);

    res.status(200).json({
        success: true,
        data: {
            plan,
            limits: config.limits
        }
    });
});

module.exports = {
    getPlans,
    getCurrentPlan,
    getUsage,
    startTrial,
    upgradePlan,
    cancelPlan,
    getFeaturesComparison,
    getLimits
};
