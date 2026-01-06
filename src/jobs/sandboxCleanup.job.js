/**
 * Sandbox Cleanup Job
 *
 * Scheduled job to manage sandbox lifecycle:
 * - Mark expired sandboxes
 * - Delete sandboxes after grace period
 * - Send expiration warnings
 *
 * Runs daily at 2:00 AM
 */

const cron = require('node-cron');
const sandboxService = require('../services/sandbox.service');
const logger = require('../utils/logger');
const { acquireLock } = require('../services/distributedLock.service');

/**
 * Cleanup expired sandboxes
 * Marks sandboxes as expired and deletes them after grace period
 */
async function cleanupExpiredSandboxes() {
    try {
        logger.info('[SandboxCleanup] Starting expired sandboxes cleanup...');

        const result = await sandboxService.cleanupExpiredSandboxes();

        logger.info(`[SandboxCleanup] Cleanup complete:`, result);

        return {
            success: true,
            ...result
        };
    } catch (error) {
        logger.error('[SandboxCleanup] Error cleaning up sandboxes:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Send expiration warnings
 * Sends email notifications before sandbox expiration
 */
async function sendExpirationWarnings() {
    // Acquire distributed lock
    const lock = await acquireLock('sandbox_expiration_warnings');

    if (!lock.acquired) {
        logger.info(`[SandboxCleanup] Expiration warnings already running on another instance (TTL: ${lock.ttlRemaining}s), skipping...`);
        return { skipped: true, reason: 'already_running_distributed' };
    }

    try {
        logger.info('[SandboxCleanup] Sending expiration warnings...');

        // Send warnings for different time periods
        const warnings = await Promise.all([
            sandboxService.sendExpirationWarnings(7),  // 7 days before
            sandboxService.sendExpirationWarnings(3),  // 3 days before
            sandboxService.sendExpirationWarnings(1)   // 1 day before
        ]);

        const totalSent = warnings.reduce((sum, w) => sum + w.sent, 0);
        logger.info(`[SandboxCleanup] Sent ${totalSent} expiration warnings`);

        return {
            success: true,
            warnings
        };
    } catch (error) {
        logger.error('[SandboxCleanup] Error sending expiration warnings:', error.message);
        return {
            success: false,
            error: error.message
        };
    } finally {
        await lock.release();
    }
}

/**
 * Run all cleanup tasks
 */
async function runAllCleanupTasks() {
    // Acquire distributed lock
    const lock = await acquireLock('sandbox_cleanup_all_tasks');

    if (!lock.acquired) {
        logger.info(`[SandboxCleanup] Cleanup already running on another instance (TTL: ${lock.ttlRemaining}s), skipping...`);
        return { skipped: true, reason: 'already_running_distributed' };
    }

    try {
        logger.info('[SandboxCleanup] ========================================');
        logger.info('[SandboxCleanup] Running all sandbox cleanup tasks');
        logger.info('[SandboxCleanup] ========================================');

        // Send warnings first
        const warningResult = await sendExpirationWarnings();

        // Then cleanup expired sandboxes
        const cleanupResult = await cleanupExpiredSandboxes();

        logger.info('[SandboxCleanup] ========================================');
        logger.info('[SandboxCleanup] All cleanup tasks complete');
        logger.info('[SandboxCleanup] ========================================');

        return {
            success: true,
            warnings: warningResult,
            cleanup: cleanupResult
        };
    } catch (error) {
        logger.error('[SandboxCleanup] Error running cleanup tasks:', error.message);
        return {
            success: false,
            error: error.message
        };
    } finally {
        await lock.release();
    }
}

/**
 * Schedule sandbox cleanup job
 * Runs daily at 2:00 AM
 */
function scheduleSandboxCleanup() {
    // Run every day at 2:10 AM (staggered to avoid 2 AM thundering herd)
    cron.schedule('10 2 * * *', async () => {
        logger.info('[SandboxCleanup] Running scheduled cleanup job');
        await runAllCleanupTasks();
    });

    // Also send warnings at 10:00 AM (better for email engagement)
    cron.schedule('0 10 * * *', async () => {
        logger.info('[SandboxCleanup] Running scheduled warning notifications');
        await sendExpirationWarnings();
    });

    logger.info('[SandboxCleanup] Job scheduled:');
    logger.info('  - Full cleanup: Daily at 2:00 AM');
    logger.info('  - Warning emails: Daily at 10:00 AM');
}

// Export functions for manual execution and testing
module.exports = {
    cleanupExpiredSandboxes,
    sendExpirationWarnings,
    runAllCleanupTasks,
    scheduleSandboxCleanup
};
