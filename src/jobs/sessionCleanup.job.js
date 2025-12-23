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

/**
 * Clean up expired sessions
 * Marks expired sessions as inactive
 */
async function cleanupExpiredSessions() {
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
