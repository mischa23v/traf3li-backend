/**
 * Cycle Auto-Complete Job
 *
 * Automated cycle management:
 * - Daily at midnight: Auto-complete cycles that have passed their end date
 * - Handle task rollovers for incomplete work
 * - Create next cycle if auto-start is enabled
 * - Calculate final metrics and velocity
 */

const cron = require('node-cron');
const CycleService = require('../services/cycle.service');
const Cycle = require('../models/cycle.model');
const QueueService = require('../services/queue.service');
const logger = require('../utils/logger');

// Track running jobs
let jobRunning = false;

/**
 * Auto-complete cycles that have passed their end date
 * Runs daily at midnight
 */
const autoCompleteCycles = async () => {
    if (jobRunning) {
        logger.info('[Cycle Auto-Complete Job] Job still running, skipping...');
        return;
    }

    jobRunning = true;

    try {
        const now = new Date();
        logger.info(`[Cycle Auto-Complete Job] Starting cycle auto-completion at ${now.toISOString()}`);

        // Find cycles where endDate has passed and status is still 'active'
        const expiredCycles = await Cycle.find({
            status: 'active',
            endDate: { $lt: now }
        })
        .setOptions({ bypassFirmFilter: true })
        .populate('teamId', 'name')
        .populate('firmId', 'name ownerId');

        if (expiredCycles.length === 0) {
            logger.info('[Cycle Auto-Complete Job] No expired cycles found');
            return;
        }

        logger.info(`[Cycle Auto-Complete Job] Found ${expiredCycles.length} cycles to auto-complete`);

        let successCount = 0;
        let failureCount = 0;
        let totalRolledOver = 0;

        for (const cycle of expiredCycles) {
            try {
                logger.info(
                    `[Cycle Auto-Complete Job] Completing cycle "${cycle.name}" (ID: ${cycle._id}) - ` +
                    `Team: ${cycle.teamId?.name || 'Unknown'}`
                );

                // Complete the cycle using the service
                // This will handle metrics calculation and rollover
                const result = await CycleService.completeCycle(cycle._id, null);

                if (result) {
                    successCount++;

                    const metrics = result.metrics;
                    const rolledOver = metrics?.rolledOver || 0;
                    totalRolledOver += rolledOver;

                    logger.info(
                        `[Cycle Auto-Complete Job] Cycle "${cycle.name}" completed: ` +
                        `${metrics.completedItems}/${metrics.plannedItems + metrics.addedMidCycle} items completed, ` +
                        `${rolledOver} tasks rolled over, velocity: ${metrics.velocity}`
                    );

                    // Send notification to firm owner about cycle completion
                    if (cycle.firmId && cycle.firmId.ownerId) {
                        try {
                            QueueService.createNotification({
                                firmId: cycle.firmId._id,
                                userId: cycle.firmId.ownerId,
                                type: 'system',
                                title: 'Cycle Completed',
                                titleAr: 'اكتملت الدورة',
                                message: `Cycle "${cycle.name}" has been automatically completed. ${metrics.completedItems} items completed with velocity of ${metrics.velocity} items/day.`,
                                messageAr: `تم إكمال الدورة "${cycle.name}" تلقائياً. تم إكمال ${metrics.completedItems} عنصر بسرعة ${metrics.velocity} عنصر/يوم.`,
                                priority: 'medium',
                                link: `/cycles/${cycle._id}`,
                                data: {
                                    cycleId: cycle._id,
                                    metrics: {
                                        completedItems: metrics.completedItems,
                                        totalItems: metrics.plannedItems + metrics.addedMidCycle,
                                        velocity: metrics.velocity,
                                        rolledOver: rolledOver
                                    },
                                    nextCycleId: result.nextCycle?._id
                                }
                            });
                        } catch (notifError) {
                            logger.error(
                                `[Cycle Auto-Complete Job] Failed to send notification for cycle ${cycle._id}:`,
                                notifError.message
                            );
                        }
                    }

                    // Log if next cycle was created
                    if (result.nextCycle) {
                        logger.info(
                            `[Cycle Auto-Complete Job] Next cycle "${result.nextCycle.name}" created ` +
                            `(starts: ${result.nextCycle.startDate.toISOString().split('T')[0]})`
                        );
                    }
                } else {
                    failureCount++;
                    logger.error(`[Cycle Auto-Complete Job] Failed to complete cycle ${cycle._id}`);
                }
            } catch (error) {
                failureCount++;
                logger.error(
                    `[Cycle Auto-Complete Job] Error completing cycle ${cycle._id}:`,
                    error.message
                );
            }
        }

        logger.info(
            `[Cycle Auto-Complete Job] Completion summary: ${successCount} succeeded, ${failureCount} failed, ` +
            `${totalRolledOver} total tasks rolled over`
        );

    } catch (error) {
        logger.error('[Cycle Auto-Complete Job] Job error:', error);
    } finally {
        jobRunning = false;
    }
};

/**
 * Start cycle auto-complete job
 */
function startCycleAutoCompleteJob() {
    logger.info('[Cycle Auto-Complete Job] Starting cycle auto-completion scheduler...');

    // Daily at midnight: Auto-complete expired cycles
    cron.schedule('0 0 * * *', () => {
        autoCompleteCycles();
    }, {
        timezone: 'Asia/Riyadh'
    });

    logger.info('[Cycle Auto-Complete Job] ✓ Cycle auto-complete job: daily at midnight');
    logger.info('[Cycle Auto-Complete Job] Cycle auto-complete job started successfully');
}

/**
 * Stop job (for graceful shutdown)
 */
function stopCycleAutoCompleteJob() {
    logger.info('[Cycle Auto-Complete Job] Stopping cycle auto-complete job...');
    // Jobs will stop automatically when process exits
}

/**
 * Manually trigger job (for testing/admin)
 */
async function triggerJob() {
    logger.info('[Cycle Auto-Complete Job] Manually triggering cycle auto-completion...');
    await autoCompleteCycles();
    logger.info('[Cycle Auto-Complete Job] Manual trigger completed');
}

/**
 * Get job status
 */
function getJobStatus() {
    return {
        running: jobRunning,
        schedule: 'Daily at midnight (Asia/Riyadh)'
    };
}

module.exports = {
    startCycleAutoCompleteJob,
    stopCycleAutoCompleteJob,
    triggerJob,
    getJobStatus,
    // Export function for testing
    autoCompleteCycles
};
