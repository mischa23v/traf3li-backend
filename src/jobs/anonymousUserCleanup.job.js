/**
 * Anonymous User Cleanup Job
 *
 * Scheduled job to clean up inactive anonymous/guest users.
 * Follows Supabase Auth pattern for anonymous user lifecycle management.
 *
 * Tasks:
 * - Delete anonymous users inactive for 30+ days
 * - Clean up associated data (sessions, activity logs, etc.)
 * - Log cleanup statistics for monitoring
 *
 * Security:
 * - Only runs if ENABLE_ANONYMOUS_AUTH is true
 * - Preserves converted users (isAnonymous: false)
 * - Logs all deletions for audit trail
 */

const cron = require('node-cron');
const { User } = require('../models');
const sessionManager = require('../services/sessionManager.service');
const auditLogService = require('../services/auditLog.service');
const logger = require('../utils/logger');
const { acquireLock } = require('../services/distributedLock.service');

/**
 * Clean up inactive anonymous users
 * Deletes anonymous users with no activity for 30+ days
 */
async function cleanupInactiveAnonymousUsers() {
    // Acquire distributed lock
    const lock = await acquireLock('anonymous_user_cleanup');

    if (!lock.acquired) {
        logger.info(`[AnonymousCleanup] Cleanup already running on another instance (TTL: ${lock.ttlRemaining}s), skipping...`);
        return { skipped: true, reason: 'already_running_distributed' };
    }

    try {
        // Check if anonymous auth is enabled
        const ENABLE_ANONYMOUS_AUTH = process.env.ENABLE_ANONYMOUS_AUTH === 'true';

        if (!ENABLE_ANONYMOUS_AUTH) {
            logger.debug('[AnonymousCleanup] Anonymous authentication is disabled. Skipping cleanup.');
            return {
                success: true,
                skipped: true,
                reason: 'Anonymous authentication disabled'
            };
        }

        logger.info('[AnonymousCleanup] Starting inactive anonymous users cleanup...');

        // Calculate cutoff date (30 days ago)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Find inactive anonymous users
        // SYSTEM JOB: bypassFirmFilter - cleans up inactive anonymous users across all firms
        const inactiveUsers = await User.find({
            isAnonymous: true,
            lastActivityAt: { $lt: thirtyDaysAgo }
        })
            .select('_id username lastActivityAt createdAt')
            .setOptions({ bypassFirmFilter: true });

        if (inactiveUsers.length === 0) {
            logger.info('[AnonymousCleanup] No inactive anonymous users found');
            return {
                success: true,
                count: 0
            };
        }

        logger.info(`[AnonymousCleanup] Found ${inactiveUsers.length} inactive anonymous user(s) to delete`);

        // Track deletion stats
        let deletedCount = 0;
        const errors = [];

        // Delete each user and associated data
        for (const user of inactiveUsers) {
            try {
                const userId = user._id;

                // Log deletion for audit trail
                await auditLogService.log(
                    'anonymous_user_cleanup',
                    'system',
                    null,
                    null,
                    {
                        deletedUserId: userId,
                        username: user.username,
                        lastActivityAt: user.lastActivityAt,
                        createdAt: user.createdAt,
                        inactiveDays: Math.floor((Date.now() - user.lastActivityAt) / (1000 * 60 * 60 * 24)),
                        severity: 'low'
                    }
                );

                // Delete user's sessions
                try {
                    await sessionManager.terminateAllSessions(userId, null, 'anonymous_cleanup', null);
                } catch (sessionError) {
                    logger.warn(`[AnonymousCleanup] Failed to delete sessions for user ${userId}:`, sessionError.message);
                }

                // Delete the user
                await User.findByIdAndDelete(userId);

                deletedCount++;
                logger.debug(`[AnonymousCleanup] Deleted anonymous user ${userId} (${user.username})`);
            } catch (userError) {
                logger.error(`[AnonymousCleanup] Error deleting user ${user._id}:`, userError.message);
                errors.push({
                    userId: user._id,
                    error: userError.message
                });
            }
        }

        logger.info(`[AnonymousCleanup] Cleanup complete. Deleted ${deletedCount} user(s), ${errors.length} error(s)`);

        return {
            success: true,
            count: deletedCount,
            errors: errors.length > 0 ? errors : undefined
        };
    } catch (error) {
        logger.error('[AnonymousCleanup] Error cleaning up anonymous users:', error.message);
        return {
            success: false,
            error: error.message
        };
    } finally {
        await lock.release();
    }
}

/**
 * Schedule anonymous user cleanup job
 * Runs daily at 2 AM (low traffic time)
 */
function scheduleAnonymousUserCleanup() {
    // Run daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
        logger.info('[AnonymousCleanup] Running scheduled cleanup job');
        await cleanupInactiveAnonymousUsers();
    });

    logger.info('[AnonymousCleanup] Job scheduled: Daily at 2:00 AM');
}

// Export functions for manual execution and testing
module.exports = {
    cleanupInactiveAnonymousUsers,
    scheduleAnonymousUserCleanup
};
