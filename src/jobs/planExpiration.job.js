/**
 * Plan Expiration Jobs
 *
 * Cron jobs for handling plan-related scheduled tasks:
 * - Expire trials
 * - Expire paid plans
 * - Reset monthly API call counters
 * - Send expiration warnings
 */

const cron = require('node-cron');
const mongoose = require('mongoose');
const { Firm, User, Notification } = require('../models');

/**
 * Check and process expired trials
 * Runs daily at midnight
 */
const processExpiredTrials = async () => {
    console.log('[Plan Job] Checking for expired trials...');

    try {
        const expiredTrials = await Firm.find({
            'subscription.status': 'trial',
            'subscription.trialEndsAt': { $lt: new Date() },
            'subscription.plan': { $ne: 'free' }
        });

        console.log(`[Plan Job] Found ${expiredTrials.length} expired trials`);

        for (const firm of expiredTrials) {
            try {
                // Downgrade to free plan
                firm.subscription.plan = 'free';
                firm.subscription.status = 'expired';
                await firm.save();

                // Notify firm owner
                const owner = await User.findById(firm.ownerId);
                if (owner) {
                    await Notification.create({
                        userId: owner._id,
                        firmId: firm._id,
                        type: 'system',
                        title: 'انتهت النسخة التجريبية',
                        titleEn: 'Trial Period Ended',
                        message: 'انتهت فترة التجربة المجانية. تم تحويل حسابك إلى الباقة المجانية.',
                        messageEn: 'Your free trial has ended. Your account has been downgraded to the free plan.',
                        priority: 'high',
                        link: '/settings/billing'
                    }).catch(() => {});
                }

                console.log(`[Plan Job] Downgraded firm ${firm._id} from trial`);
            } catch (error) {
                console.error(`[Plan Job] Error processing firm ${firm._id}:`, error.message);
            }
        }
    } catch (error) {
        console.error('[Plan Job] Error processing expired trials:', error.message);
    }
};

/**
 * Check and process expired paid plans
 * Runs daily at midnight
 */
const processExpiredPlans = async () => {
    console.log('[Plan Job] Checking for expired paid plans...');

    try {
        const expiredPlans = await Firm.find({
            'subscription.status': 'active',
            'subscription.currentPeriodEnd': { $lt: new Date() },
            'subscription.plan': { $ne: 'free' },
            'billing.autoRenew': false
        });

        console.log(`[Plan Job] Found ${expiredPlans.length} expired plans`);

        for (const firm of expiredPlans) {
            try {
                // Mark as expired (will downgrade after grace period)
                firm.subscription.status = 'expired';
                await firm.save();

                // Notify firm owner
                const owner = await User.findById(firm.ownerId);
                if (owner) {
                    await Notification.create({
                        userId: owner._id,
                        firmId: firm._id,
                        type: 'system',
                        title: 'انتهى اشتراكك',
                        titleEn: 'Subscription Expired',
                        message: 'انتهت صلاحية اشتراكك. يرجى تجديد الاشتراك للاستمرار في استخدام جميع الميزات.',
                        messageEn: 'Your subscription has expired. Please renew to continue using all features.',
                        priority: 'high',
                        link: '/settings/billing'
                    }).catch(() => {});
                }

                console.log(`[Plan Job] Marked firm ${firm._id} as expired`);
            } catch (error) {
                console.error(`[Plan Job] Error processing firm ${firm._id}:`, error.message);
            }
        }
    } catch (error) {
        console.error('[Plan Job] Error processing expired plans:', error.message);
    }
};

/**
 * Downgrade expired plans after grace period (7 days)
 * Runs daily at 1 AM
 */
const downgradeExpiredPlans = async () => {
    console.log('[Plan Job] Downgrading expired plans after grace period...');

    try {
        const gracePeriodDays = 7;
        const gracePeriodEnd = new Date();
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() - gracePeriodDays);

        const expiredPlans = await Firm.find({
            'subscription.status': 'expired',
            'subscription.currentPeriodEnd': { $lt: gracePeriodEnd },
            'subscription.plan': { $ne: 'free' }
        });

        console.log(`[Plan Job] Found ${expiredPlans.length} plans to downgrade`);

        for (const firm of expiredPlans) {
            try {
                firm.subscription.plan = 'free';
                await firm.save();

                console.log(`[Plan Job] Downgraded firm ${firm._id} to free plan`);
            } catch (error) {
                console.error(`[Plan Job] Error downgrading firm ${firm._id}:`, error.message);
            }
        }
    } catch (error) {
        console.error('[Plan Job] Error downgrading expired plans:', error.message);
    }
};

/**
 * Reset monthly API call counters
 * Runs on 1st of each month at midnight
 */
const resetMonthlyApiCounters = async () => {
    console.log('[Plan Job] Resetting monthly API call counters...');

    try {
        const result = await Firm.updateMany(
            {},
            {
                $set: {
                    'usage.apiCallsThisMonth': 0,
                    'usage.lastResetDate': new Date()
                }
            }
        );

        console.log(`[Plan Job] Reset API counters for ${result.modifiedCount} firms`);
    } catch (error) {
        console.error('[Plan Job] Error resetting API counters:', error.message);
    }
};

/**
 * Send trial expiration warnings
 * Runs daily at 9 AM
 */
const sendTrialWarnings = async () => {
    console.log('[Plan Job] Sending trial expiration warnings...');

    try {
        // Find trials expiring in 3 days
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        const expiringTrials = await Firm.find({
            'subscription.status': 'trial',
            'subscription.trialEndsAt': {
                $gte: new Date(),
                $lte: threeDaysFromNow
            }
        });

        console.log(`[Plan Job] Found ${expiringTrials.length} trials expiring soon`);

        for (const firm of expiringTrials) {
            try {
                const owner = await User.findById(firm.ownerId);
                if (owner) {
                    const daysRemaining = Math.ceil(
                        (new Date(firm.subscription.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24)
                    );

                    await Notification.create({
                        userId: owner._id,
                        firmId: firm._id,
                        type: 'system',
                        title: `ستنتهي النسخة التجريبية خلال ${daysRemaining} أيام`,
                        titleEn: `Trial expires in ${daysRemaining} days`,
                        message: 'قم بالترقية الآن للاستمرار في استخدام جميع الميزات بدون انقطاع.',
                        messageEn: 'Upgrade now to continue using all features without interruption.',
                        priority: 'medium',
                        link: '/settings/billing'
                    }).catch(() => {});
                }
            } catch (error) {
                console.error(`[Plan Job] Error sending warning to firm ${firm._id}:`, error.message);
            }
        }
    } catch (error) {
        console.error('[Plan Job] Error sending trial warnings:', error.message);
    }
};

/**
 * Send usage limit warnings
 * Runs daily at 10 AM
 */
const sendUsageLimitWarnings = async () => {
    console.log('[Plan Job] Checking for usage limit warnings...');

    try {
        const firms = await Firm.find({
            'subscription.plan': { $ne: 'enterprise' }
        }).select('_id ownerId usage subscription');

        for (const firm of firms) {
            try {
                const plan = firm.subscription?.plan || 'free';
                const usage = firm.usage || {};

                // Check if any usage is at 80% or above
                const warnings = [];

                if (plan !== 'enterprise') {
                    const limits = {
                        free: { cases: 10, clients: 20, users: 2 },
                        starter: { cases: 50, clients: 100, users: 5 },
                        professional: { cases: 500, clients: 1000, users: 20 }
                    };

                    const planLimits = limits[plan] || limits.free;

                    if (usage.cases && usage.cases >= planLimits.cases * 0.8) {
                        warnings.push(`cases (${usage.cases}/${planLimits.cases})`);
                    }
                    if (usage.clients && usage.clients >= planLimits.clients * 0.8) {
                        warnings.push(`clients (${usage.clients}/${planLimits.clients})`);
                    }
                    if (usage.users && usage.users >= planLimits.users * 0.8) {
                        warnings.push(`users (${usage.users}/${planLimits.users})`);
                    }
                }

                if (warnings.length > 0) {
                    const owner = await User.findById(firm.ownerId);
                    if (owner) {
                        await Notification.create({
                            userId: owner._id,
                            firmId: firm._id,
                            type: 'system',
                            title: 'اقتراب من حد الاستخدام',
                            titleEn: 'Approaching Usage Limit',
                            message: `أنت تقترب من حد الاستخدام لـ: ${warnings.join(', ')}`,
                            messageEn: `You are approaching the usage limit for: ${warnings.join(', ')}`,
                            priority: 'medium',
                            link: '/settings/billing'
                        }).catch(() => {});
                    }
                }
            } catch (error) {
                console.error(`[Plan Job] Error checking usage for firm ${firm._id}:`, error.message);
            }
        }
    } catch (error) {
        console.error('[Plan Job] Error sending usage warnings:', error.message);
    }
};

/**
 * Start all plan-related cron jobs
 */
const startPlanJobs = () => {
    console.log('[Plan Job] Starting plan expiration jobs...');

    // Check for expired trials - daily at midnight
    cron.schedule('0 0 * * *', () => {
        processExpiredTrials();
        processExpiredPlans();
    }, {
        timezone: 'Asia/Riyadh'
    });

    // Downgrade expired plans after grace period - daily at 1 AM
    cron.schedule('0 1 * * *', downgradeExpiredPlans, {
        timezone: 'Asia/Riyadh'
    });

    // Reset monthly API counters - 1st of each month at midnight
    cron.schedule('0 0 1 * *', resetMonthlyApiCounters, {
        timezone: 'Asia/Riyadh'
    });

    // Send trial warnings - daily at 9 AM
    cron.schedule('0 9 * * *', sendTrialWarnings, {
        timezone: 'Asia/Riyadh'
    });

    // Send usage limit warnings - daily at 10 AM
    cron.schedule('0 10 * * *', sendUsageLimitWarnings, {
        timezone: 'Asia/Riyadh'
    });

    console.log('[Plan Job] Plan expiration jobs scheduled');
};

module.exports = {
    startPlanJobs,
    processExpiredTrials,
    processExpiredPlans,
    downgradeExpiredPlans,
    resetMonthlyApiCounters,
    sendTrialWarnings,
    sendUsageLimitWarnings
};
