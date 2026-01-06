/**
 * Time Entry Locking Job Scheduler
 *
 * Automated tasks:
 * - Daily at midnight: Lock entries for closed fiscal periods
 * - Weekly: Clean up rejected/draft entries older than 90 days
 */

const cron = require('node-cron');
const TimeEntry = require('../models/timeEntry.model');
const FiscalPeriod = require('../models/fiscalPeriod.model');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { acquireLock } = require('../services/distributedLock.service');

// Track running jobs (kept for local status reporting, but actual locking is done via Redis)
let jobsRunning = {
    lockPeriods: false,
    cleanup: false
};

// Distributed lock names for this job module
const LOCK_NAMES = {
    lockPeriods: 'time_entry_lock_periods',
    cleanup: 'time_entry_cleanup',
    pendingApprovals: 'time_entry_pending_approvals'
};

/**
 * Lock time entries for closed fiscal periods
 * Runs daily at midnight
 * Uses distributed locking to prevent concurrent execution across server instances
 */
const lockEntriesForClosedPeriods = async () => {
    // Acquire distributed lock
    const lock = await acquireLock(LOCK_NAMES.lockPeriods);

    if (!lock.acquired) {
        logger.info(`[Time Entry Jobs] Lock periods job already running on another instance (TTL: ${lock.ttlRemaining}s), skipping...`);
        return { skipped: true, reason: 'already_running_distributed' };
    }

    jobsRunning.lockPeriods = true;

    try {
        logger.info('[Time Entry Jobs] Checking for entries to lock...');

        // Find all closed fiscal periods
        const closedPeriods = await FiscalPeriod.find({ status: 'closed' });

        if (closedPeriods.length === 0) {
            logger.info('[Time Entry Jobs] No closed fiscal periods found');
            return;
        }

        logger.info(`[Time Entry Jobs] Found ${closedPeriods.length} closed periods`);

        let totalLocked = 0;

        for (const period of closedPeriods) {
            try {
                // Lock all approved/billed entries in this period that aren't already locked
                const result = await TimeEntry.updateMany(
                    {
                        firmId: period.firmId,
                        date: { $gte: period.startDate, $lte: period.endDate },
                        status: { $in: ['approved', 'billed'] },
                        lockedAt: { $exists: false }
                    },
                    {
                        $set: {
                            status: 'locked',
                            lockedAt: new Date(),
                            lockReason: `Fiscal period closed: ${period.name}`
                        },
                        $push: {
                            history: {
                                action: 'locked',
                                timestamp: new Date(),
                                details: {
                                    reason: `Fiscal period closed: ${period.name}`,
                                    periodId: period._id,
                                    automated: true
                                }
                            }
                        }
                    }
                );

                if (result.modifiedCount > 0) {
                    logger.info(`[Time Entry Jobs] Locked ${result.modifiedCount} entries for period ${period.name}`);
                    totalLocked += result.modifiedCount;
                }
            } catch (error) {
                logger.error(`[Time Entry Jobs] Error locking entries for period ${period._id}:`, error.message);
            }
        }

        logger.info(`[Time Entry Jobs] Total entries locked: ${totalLocked}`);

    } catch (error) {
        logger.error('[Time Entry Jobs] Lock periods job error:', error);
    } finally {
        await lock.release();
        jobsRunning.lockPeriods = false;
    }
};

/**
 * Clean up old rejected and draft entries
 * Runs weekly on Sunday at 2 AM
 * Uses distributed locking to prevent concurrent execution across server instances
 */
const cleanupOldEntries = async () => {
    // Acquire distributed lock
    const lock = await acquireLock(LOCK_NAMES.cleanup);

    if (!lock.acquired) {
        logger.info(`[Time Entry Jobs] Cleanup job already running on another instance (TTL: ${lock.ttlRemaining}s), skipping...`);
        return { skipped: true, reason: 'already_running_distributed' };
    }

    jobsRunning.cleanup = true;

    try {
        logger.info('[Time Entry Jobs] Running cleanup...');

        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        // Delete rejected entries older than 90 days
        // NOTE: Bypass firmIsolation filter - system job operates across all firms
        const rejectedResult = await TimeEntry.deleteMany({
            status: 'rejected',
            rejectedAt: { $lt: ninetyDaysAgo }
        }).setOptions({ bypassFirmFilter: true });

        if (rejectedResult.deletedCount > 0) {
            logger.info(`[Time Entry Jobs] Deleted ${rejectedResult.deletedCount} old rejected entries`);
        }

        // Delete draft entries older than 90 days with no activity
        // NOTE: Bypass firmIsolation filter - system job operates across all firms
        const draftResult = await TimeEntry.deleteMany({
            status: 'draft',
            updatedAt: { $lt: ninetyDaysAgo },
            isBilled: false
        }).setOptions({ bypassFirmFilter: true });

        if (draftResult.deletedCount > 0) {
            logger.info(`[Time Entry Jobs] Deleted ${draftResult.deletedCount} old draft entries`);
        }

        logger.info('[Time Entry Jobs] Cleanup complete');

    } catch (error) {
        logger.error('[Time Entry Jobs] Cleanup job error:', error);
    } finally {
        await lock.release();
        jobsRunning.cleanup = false;
    }
};

/**
 * Check for entries pending approval for too long
 * Runs daily at 9 AM to send reminder notifications
 * Uses distributed locking to prevent concurrent execution across server instances
 */
const checkPendingApprovals = async () => {
    // Acquire distributed lock
    const lock = await acquireLock(LOCK_NAMES.pendingApprovals);

    if (!lock.acquired) {
        logger.info(`[Time Entry Jobs] Pending approvals check already running on another instance (TTL: ${lock.ttlRemaining}s), skipping...`);
        return { skipped: true, reason: 'already_running_distributed' };
    }

    try {
        logger.info('[Time Entry Jobs] Checking for stale pending approvals...');

        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        // Find entries submitted more than 3 days ago
        // NOTE: Bypass firmIsolation filter - system job operates across all firms
        const staleEntries = await TimeEntry.aggregate([
            {
                $match: {
                    status: 'submitted',
                    submittedAt: { $lt: threeDaysAgo }
                }
            },
            {
                $group: {
                    _id: '$assignedManager',
                    count: { $sum: 1 },
                    firmId: { $first: '$firmId' }
                }
            }
        ]).option({ bypassFirmFilter: true });

        if (staleEntries.length > 0) {
            logger.info(`[Time Entry Jobs] Found ${staleEntries.length} managers with stale approvals`);

            const Notification = mongoose.model('Notification');

            for (const item of staleEntries) {
                if (item._id) {
                    try {
                        await Notification.createNotification({
                            firmId: item.firmId,
                            userId: item._id,
                            type: 'reminder',
                            title: 'Pending Time Entry Approvals',
                            titleAr: 'إدخالات وقت معلقة للموافقة',
                            message: `You have ${item.count} time entries waiting for approval for more than 3 days`,
                            messageAr: `لديك ${item.count} إدخال وقت في انتظار الموافقة لأكثر من 3 أيام`,
                            priority: 'high',
                            actionRequired: true,
                            link: '/time-entries?status=pending-approval'
                        });
                    } catch (notifError) {
                        logger.error(`[Time Entry Jobs] Failed to send reminder to ${item._id}:`, notifError.message);
                    }
                }
            }
        } else {
            logger.info('[Time Entry Jobs] No stale pending approvals found');
        }

    } catch (error) {
        logger.error('[Time Entry Jobs] Pending approvals check error:', error);
    } finally {
        await lock.release();
    }
};

/**
 * Start all time entry jobs
 */
function startTimeEntryJobs() {
    logger.info('[Time Entry Jobs] Starting time entry job scheduler...');

    // Daily at midnight: Lock entries for closed periods
    cron.schedule('0 0 * * *', () => {
        lockEntriesForClosedPeriods();
    });
    logger.info('[Time Entry Jobs] ✓ Period locking job: daily at midnight');

    // Daily at 9 AM: Check for stale pending approvals
    cron.schedule('0 9 * * *', () => {
        checkPendingApprovals();
    });
    logger.info('[Time Entry Jobs] ✓ Pending approvals check: daily at 9:00 AM');

    // Weekly on Sunday at 2 AM: Cleanup old entries
    cron.schedule('0 2 * * 0', () => {
        cleanupOldEntries();
    });
    logger.info('[Time Entry Jobs] ✓ Cleanup job: weekly on Sunday at 2:00 AM');

    logger.info('[Time Entry Jobs] All time entry jobs started successfully');
}

/**
 * Stop all jobs (for graceful shutdown)
 */
function stopTimeEntryJobs() {
    logger.info('[Time Entry Jobs] Stopping time entry jobs...');
}

/**
 * Manually trigger a specific job (for testing/admin)
 */
async function triggerJob(jobName) {
    logger.info(`[Time Entry Jobs] Manually triggering ${jobName}...`);

    switch (jobName) {
        case 'lockPeriods':
            await lockEntriesForClosedPeriods();
            break;
        case 'cleanup':
            await cleanupOldEntries();
            break;
        case 'pendingApprovals':
            await checkPendingApprovals();
            break;
        default:
            throw new Error(`Unknown job: ${jobName}`);
    }

    logger.info(`[Time Entry Jobs] ${jobName} completed`);
}

/**
 * Get job status
 */
function getJobStatus() {
    return {
        jobs: {
            lockPeriods: {
                running: jobsRunning.lockPeriods,
                schedule: 'Daily at midnight'
            },
            pendingApprovals: {
                running: false,
                schedule: 'Daily at 9:00 AM'
            },
            cleanup: {
                running: jobsRunning.cleanup,
                schedule: 'Weekly on Sunday at 2:00 AM'
            }
        }
    };
}

module.exports = {
    startTimeEntryJobs,
    stopTimeEntryJobs,
    triggerJob,
    getJobStatus,
    // Export individual functions for testing
    lockEntriesForClosedPeriods,
    cleanupOldEntries,
    checkPendingApprovals
};
