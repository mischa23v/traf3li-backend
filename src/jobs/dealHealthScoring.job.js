/**
 * Deal Health Scoring Job
 *
 * Automated deal health calculation:
 * - Daily at 5 AM: Update health scores for all active deals
 * - Calculate comprehensive health metrics
 * - Track deal quality and engagement
 */

const cron = require('node-cron');
const DealHealthService = require('../services/dealHealth.service');
const Firm = require('../models/firm.model');
const logger = require('../utils/logger');
const { acquireLock } = require('../services/distributedLock.service');

// Track running jobs
let jobRunning = false;

/**
 * Update deal health scores for all firms
 * Runs daily at 5 AM
 */
const updateDealHealthScores = async () => {
    // Acquire distributed lock
    const lock = await acquireLock('deal_health_scoring');

    if (!lock.acquired) {
        logger.info(`[Deal Health Job] Job already running on another instance (TTL: ${lock.ttlRemaining}s), skipping...`);
        return { skipped: true, reason: 'already_running_distributed' };
    }

    if (jobRunning) {
        await lock.release();
        logger.info('[Deal Health Job] Job still running, skipping...');
        return;
    }

    jobRunning = true;

    try {
        const now = new Date();
        logger.info(`[Deal Health Job] Starting deal health scoring at ${now.toISOString()}`);

        // Get all firms with active subscriptions
        const firms = await Firm.find({
            'subscription.status': { $in: ['active', 'trial'] }
        }).select('_id name').lean();

        if (firms.length === 0) {
            logger.info('[Deal Health Job] No active firms found');
            return;
        }

        logger.info(`[Deal Health Job] Updating deal health scores for ${firms.length} firms`);

        let totalDealsProcessed = 0;
        let totalDealsSucceeded = 0;
        let totalDealsFailed = 0;
        let firmsFailed = 0;

        for (const firm of firms) {
            try {
                // Batch update health for all deals in this firm
                const results = await DealHealthService.batchUpdateHealth(firm._id.toString());

                totalDealsProcessed += results.total;
                totalDealsSucceeded += results.succeeded;
                totalDealsFailed += results.failed;

                logger.info(
                    `[Deal Health Job] Firm ${firm.name}: ${results.succeeded}/${results.total} deals updated successfully`
                );

                if (results.failed > 0) {
                    logger.warn(
                        `[Deal Health Job] Firm ${firm.name}: ${results.failed} deals failed to update`
                    );
                }
            } catch (error) {
                firmsFailed++;
                logger.error(
                    `[Deal Health Job] Failed to update health scores for firm ${firm._id}:`,
                    error.message
                );
            }
        }

        logger.info(
            `[Deal Health Job] Scoring complete: ${totalDealsSucceeded}/${totalDealsProcessed} deals updated successfully, ` +
            `${totalDealsFailed} failed (${firmsFailed} firms failed)`
        );

    } catch (error) {
        logger.error('[Deal Health Job] Job error:', error);
    } finally {
        jobRunning = false;
        await lock.release();
    }
};

/**
 * Start deal health scoring job
 */
function startDealHealthJob() {
    logger.info('[Deal Health Job] Starting deal health scoring scheduler...');

    // Daily at 5 AM: Update deal health scores
    cron.schedule('0 5 * * *', () => {
        updateDealHealthScores();
    }, {
        timezone: 'Asia/Riyadh'
    });

    logger.info('[Deal Health Job] ✓ Deal health scoring job: daily at 5:00 AM');
    logger.info('[Deal Health Job] Deal health job started successfully');
}

/**
 * Stop job (for graceful shutdown)
 */
function stopDealHealthJob() {
    logger.info('[Deal Health Job] Stopping deal health job...');
    // Jobs will stop automatically when process exits
}

/**
 * Manually trigger job (for testing/admin)
 */
async function triggerJob() {
    logger.info('[Deal Health Job] Manually triggering deal health scoring...');
    await updateDealHealthScores();
    logger.info('[Deal Health Job] Manual trigger completed');
}

/**
 * Get job status
 */
function getJobStatus() {
    return {
        running: jobRunning,
        schedule: 'Daily at 5:00 AM (Asia/Riyadh)'
    };
}

module.exports = {
    startDealHealthJob,
    stopDealHealthJob,
    triggerJob,
    getJobStatus,
    // Export function for testing
    updateDealHealthScores
};
