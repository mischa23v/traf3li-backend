/**
 * Session Cleanup Job
 *
 * Scheduled job to clean up expired and inactive sessions.
 * Runs periodically to maintain session hygiene and database performance.
 *
 * Tasks:
 * - Mark expired sessions as inactive
 * - Clean up old terminated sessions (after 30 days, handled by TTL index)
 * - Log cleanup statistics for monitoring
 */

const cron = require('node-cron');
const sessionManager = require('../services/sessionManager.service');
const logger = require('../utils/logger');
const { acquireLock } = require('../services/distributedLock.service');

// Distributed lock name for this job
const LOCK_NAME = 'session_cleanup';

/**
 * Clean up expired sessions
 * Marks expired sessions as inactive
 * Uses distributed locking to prevent concurrent execution across server instances
 */
async function cleanupExpiredSessions() {
    // Acquire distributed lock
    const lock = await acquireLock(LOCK_NAME);

    if (!lock.acquired) {
        logger.info(`[SessionCleanup] Job already running on another instance (TTL: ${lock.ttlRemaining}s), skipping...`);
        return { skipped: true, reason: 'already_running_distributed' };
    }

    try {
        logger.info('[SessionCleanup] Starting expired sessions cleanup...');

        const count = await sessionManager.cleanupExpired();

        logger.info(`[SessionCleanup] Cleaned up ${count} expired session(s)`);

        return {
            success: true,
            count
        };
    } catch (error) {
        logger.error('[SessionCleanup] Error cleaning up sessions:', error.message);
        return {
            success: false,
            error: error.message
        };
    } finally {
        await lock.release();
    }
}

/**
 * Schedule session cleanup job
 * Runs every hour to clean up expired sessions
 */
function scheduleSessionCleanup() {
    // Run every hour at minute 0
    cron.schedule('0 * * * *', async () => {
        logger.info('[SessionCleanup] Running scheduled cleanup job');
        await cleanupExpiredSessions();
    });

    logger.info('[SessionCleanup] Job scheduled: Every hour at minute 0');
}

// Export functions for manual execution and testing
module.exports = {
    cleanupExpiredSessions,
    scheduleSessionCleanup
};
