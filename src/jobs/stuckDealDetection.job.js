/**
 * Stuck Deal Detection Job
 *
 * Automated stuck deal monitoring:
 * - Daily at 6 AM: Detect deals that are stuck in stages
 * - Send notifications for newly stuck deals
 * - Track deals with no recent activity
 */

const cron = require('node-cron');
const DealHealthService = require('../services/dealHealth.service');
const Firm = require('../models/firm.model');
const Notification = require('../models/notification.model');
const logger = require('../utils/logger');
const { acquireLock } = require('../services/distributedLock.service');

// Track running jobs
let jobRunning = false;

/**
 * Detect stuck deals across all firms
 * Runs daily at 6 AM
 */
const detectStuckDeals = async () => {
    // Acquire distributed lock
    const lock = await acquireLock('stuck_deal_detection');

    if (!lock.acquired) {
        logger.info(`[Stuck Deal Job] Job already running on another instance (TTL: ${lock.ttlRemaining}s), skipping...`);
        return { skipped: true, reason: 'already_running_distributed' };
    }

    if (jobRunning) {
        await lock.release();
        logger.info('[Stuck Deal Job] Job still running, skipping...');
        return;
    }

    jobRunning = true;

    try {
        const now = new Date();
        logger.info(`[Stuck Deal Job] Starting stuck deal detection at ${now.toISOString()}`);

        // Get all firms
        const firms = await Firm.find({
            'subscription.status': { $in: ['active', 'trial'] }
        }).select('_id name ownerId').lean();

        if (firms.length === 0) {
            logger.info('[Stuck Deal Job] No active firms found');
            return;
        }

        logger.info(`[Stuck Deal Job] Checking stuck deals for ${firms.length} firms`);

        let totalStuckDeals = 0;
        let totalNotifications = 0;
        let firmsFailed = 0;

        for (const firm of firms) {
            try {
                // Detect stuck deals for this firm
                const stuckDeals = await DealHealthService.detectStuckDeals(
                    firm._id.toString(),
                    {
                        stageStuckDays: 30,     // Stage hasn't changed in 30 days
                        noActivityDays: 14,      // No activity in 14 days
                        markAsStuck: true        // Mark deals as stuck
                    }
                );

                if (stuckDeals.length > 0) {
                    totalStuckDeals += stuckDeals.length;

                    logger.info(`[Stuck Deal Job] Firm ${firm.name}: ${stuckDeals.length} stuck deals detected`);

                    // Send notifications for newly stuck deals
                    for (const deal of stuckDeals) {
                        try {
                            // Check if this is a newly stuck deal (stuck within last day)
                            const stuckSince = deal.dealHealth?.stuckSince;
                            if (stuckSince) {
                                const daysSinceStuck = Math.floor(
                                    (Date.now() - new Date(stuckSince).getTime()) / (1000 * 60 * 60 * 24)
                                );

                                // Only notify for deals that became stuck today
                                if (daysSinceStuck <= 1) {
                                    // Notify assigned user
                                    if (deal.assignedTo) {
                                        await Notification.create({
                                            firmId: firm._id,
                                            userId: deal.assignedTo._id,
                                            type: 'alert',
                                            title: 'Deal Stuck - Action Required',
                                            titleAr: 'صفقة عالقة - مطلوب إجراء',
                                            message: `Deal "${deal.companyName || deal.contactName || 'Untitled'}" has been stuck in ${deal.status} stage with no recent activity`,
                                            messageAr: `الصفقة "${deal.companyName || deal.contactName || 'بدون عنوان'}" عالقة في مرحلة ${deal.status} بدون نشاط حديث`,
                                            priority: 'high',
                                            link: `/leads/${deal._id}`,
                                            entityType: 'case',
                                            entityId: deal._id,
                                            data: {
                                                dealId: deal._id,
                                                stage: deal.status,
                                                stuckSince: stuckSince
                                            }
                                        });

                                        totalNotifications++;
                                    }
                                }
                            }
                        } catch (notifError) {
                            logger.error(
                                `[Stuck Deal Job] Failed to send notification for deal ${deal._id}:`,
                                notifError.message
                            );
                        }
                    }
                }
            } catch (error) {
                firmsFailed++;
                logger.error(
                    `[Stuck Deal Job] Failed to detect stuck deals for firm ${firm._id}:`,
                    error.message
                );
            }
        }

        logger.info(
            `[Stuck Deal Job] Detection complete: ${totalStuckDeals} stuck deals found, ` +
            `${totalNotifications} notifications sent (${firmsFailed} firms failed)`
        );

    } catch (error) {
        logger.error('[Stuck Deal Job] Job error:', error);
    } finally {
        jobRunning = false;
        await lock.release();
    }
};

/**
 * Start stuck deal detection job
 */
function startStuckDealJob() {
    logger.info('[Stuck Deal Job] Starting stuck deal detection scheduler...');

    // Daily at 6 AM: Detect stuck deals
    cron.schedule('0 6 * * *', () => {
        detectStuckDeals();
    }, {
        timezone: 'Asia/Riyadh'
    });

    logger.info('[Stuck Deal Job] ✓ Stuck deal detection job: daily at 6:00 AM');
    logger.info('[Stuck Deal Job] Stuck deal job started successfully');
}

/**
 * Stop job (for graceful shutdown)
 */
function stopStuckDealJob() {
    logger.info('[Stuck Deal Job] Stopping stuck deal job...');
    // Jobs will stop automatically when process exits
}

/**
 * Manually trigger job (for testing/admin)
 */
async function triggerJob() {
    logger.info('[Stuck Deal Job] Manually triggering stuck deal detection...');
    await detectStuckDeals();
    logger.info('[Stuck Deal Job] Manual trigger completed');
}

/**
 * Get job status
 */
function getJobStatus() {
    return {
        running: jobRunning,
        schedule: 'Daily at 6:00 AM (Asia/Riyadh)'
    };
}

module.exports = {
    startStuckDealJob,
    stopStuckDealJob,
    triggerJob,
    getJobStatus,
    // Export function for testing
    detectStuckDeals
};
