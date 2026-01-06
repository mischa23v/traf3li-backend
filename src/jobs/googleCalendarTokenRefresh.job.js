/**
 * Google Calendar Token Refresh Job
 *
 * Gold Standard: Proactive token refresh before expiry
 * Same pattern used by Calendly, Cal.com, Acuity Scheduling
 *
 * Features:
 * - Runs hourly to find tokens expiring within 24 hours
 * - Refreshes tokens proactively to prevent sync failures
 * - Handles refresh failures gracefully with disconnect
 * - Logs statistics for monitoring
 */

const cron = require('node-cron');
const GoogleCalendarIntegration = require('../models/googleCalendarIntegration.model');
const googleCalendarService = require('../services/googleCalendar.service');
const logger = require('../utils/logger');
const { acquireLock } = require('../services/distributedLock.service');

// Distributed lock name for this job
const LOCK_NAME = 'token_refresh_google';

/**
 * Refresh tokens that are expiring soon
 * Gold Standard: Proactive refresh 24 hours before expiry
 *
 * @param {number} hoursAhead - Hours ahead to check for expiring tokens (default: 24)
 * @returns {Object} Result with counts
 */
async function refreshExpiringTokens(hoursAhead = 24) {
    const startTime = Date.now();
    const results = {
        success: true,
        checked: 0,
        refreshed: 0,
        failed: 0,
        disconnected: 0,
        errors: []
    };

    try {
        logger.info(`[GoogleCalendarTokenRefresh] Starting proactive token refresh (${hoursAhead}h window)...`);

        // Find tokens expiring within the specified window
        const expiringSoon = await GoogleCalendarIntegration.findTokensExpiringSoon(hoursAhead);
        results.checked = expiringSoon.length;

        if (expiringSoon.length === 0) {
            logger.info('[GoogleCalendarTokenRefresh] No tokens expiring soon');
            return results;
        }

        logger.info(`[GoogleCalendarTokenRefresh] Found ${expiringSoon.length} token(s) expiring soon`);

        // Process each integration
        for (const integration of expiringSoon) {
            try {
                // Attempt to refresh the token
                await googleCalendarService.refreshToken(integration.userId, integration.firmId);
                results.refreshed++;

                logger.info(`[GoogleCalendarTokenRefresh] Refreshed token for user ${integration.userId}`);

            } catch (error) {
                results.failed++;
                results.errors.push({
                    userId: integration.userId,
                    firmId: integration.firmId,
                    error: error.message
                });

                logger.error(`[GoogleCalendarTokenRefresh] Failed to refresh token for user ${integration.userId}:`, error.message);

                // Check if we should disconnect (e.g., refresh token revoked)
                if (error.message.includes('invalid_grant') ||
                    error.message.includes('Token has been revoked') ||
                    error.message.includes('Token has expired')) {

                    try {
                        await integration.disconnect(null, 'Token refresh failed - reauthorization required');
                        results.disconnected++;

                        logger.warn(`[GoogleCalendarTokenRefresh] Disconnected integration for user ${integration.userId} due to invalid refresh token`);
                    } catch (disconnectError) {
                        logger.error(`[GoogleCalendarTokenRefresh] Failed to disconnect user ${integration.userId}:`, disconnectError.message);
                    }
                }
            }
        }

        const duration = Date.now() - startTime;
        logger.info(`[GoogleCalendarTokenRefresh] Completed in ${duration}ms - Refreshed: ${results.refreshed}, Failed: ${results.failed}, Disconnected: ${results.disconnected}`);

        results.success = results.failed === 0;
        return results;

    } catch (error) {
        logger.error('[GoogleCalendarTokenRefresh] Job error:', error.message);
        results.success = false;
        results.errors.push({ error: error.message });
        return results;
    }
}

/**
 * Also refresh already expired tokens (cleanup)
 * These tokens need refresh before they can be used again
 *
 * @returns {Object} Result with counts
 */
async function refreshExpiredTokens() {
    const results = {
        success: true,
        checked: 0,
        refreshed: 0,
        failed: 0,
        disconnected: 0
    };

    try {
        logger.info('[GoogleCalendarTokenRefresh] Checking for expired tokens...');

        const expired = await GoogleCalendarIntegration.findExpiredTokens();
        results.checked = expired.length;

        if (expired.length === 0) {
            logger.info('[GoogleCalendarTokenRefresh] No expired tokens found');
            return results;
        }

        logger.info(`[GoogleCalendarTokenRefresh] Found ${expired.length} expired token(s)`);

        for (const integration of expired) {
            try {
                await googleCalendarService.refreshToken(integration.userId, integration.firmId);
                results.refreshed++;
            } catch (error) {
                results.failed++;

                // Disconnect if refresh fails for expired tokens
                try {
                    await integration.disconnect(null, 'Expired token refresh failed');
                    results.disconnected++;
                } catch (disconnectError) {
                    logger.error(`[GoogleCalendarTokenRefresh] Failed to disconnect expired user ${integration.userId}`);
                }
            }
        }

        logger.info(`[GoogleCalendarTokenRefresh] Expired tokens - Refreshed: ${results.refreshed}, Disconnected: ${results.disconnected}`);
        return results;

    } catch (error) {
        logger.error('[GoogleCalendarTokenRefresh] Expired token check error:', error.message);
        results.success = false;
        return results;
    }
}

/**
 * Run the full token refresh job
 * 1. Refresh tokens expiring soon (proactive)
 * 2. Handle already expired tokens (cleanup)
 * Uses distributed locking to prevent concurrent execution across server instances
 */
async function runTokenRefreshJob() {
    // Acquire distributed lock
    const lock = await acquireLock(LOCK_NAME);

    if (!lock.acquired) {
        logger.info(`[GoogleCalendarTokenRefresh] Job already running on another instance (TTL: ${lock.ttlRemaining}s), skipping...`);
        return { skipped: true, reason: 'already_running_distributed' };
    }

    try {
        logger.info('[GoogleCalendarTokenRefresh] ═══════════════════════════════════════');
        logger.info('[GoogleCalendarTokenRefresh] Starting scheduled token refresh job');

        // Step 1: Proactive refresh of tokens expiring within 24 hours
        const proactiveResults = await refreshExpiringTokens(24);

        // Step 2: Handle any already expired tokens
        const expiredResults = await refreshExpiredTokens();

        // Combined summary
        const summary = {
            proactive: {
                checked: proactiveResults.checked,
                refreshed: proactiveResults.refreshed,
                failed: proactiveResults.failed
            },
            expired: {
                checked: expiredResults.checked,
                refreshed: expiredResults.refreshed,
                disconnected: expiredResults.disconnected
            }
        };

        logger.info('[GoogleCalendarTokenRefresh] Job summary:', JSON.stringify(summary));
        logger.info('[GoogleCalendarTokenRefresh] ═══════════════════════════════════════');

        return summary;
    } finally {
        await lock.release();
    }
}

/**
 * Schedule the token refresh job
 * Runs every hour at minute 30 (offset from other jobs)
 */
function scheduleTokenRefreshJob() {
    // Run every hour at minute 30
    cron.schedule('30 * * * *', async () => {
        await runTokenRefreshJob();
    });

    logger.info('[GoogleCalendarTokenRefresh] Job scheduled: Every hour at minute 30');
}

/**
 * Start the job immediately (for server startup)
 * Runs the job once, then schedules for recurring
 */
async function initializeTokenRefreshJob() {
    logger.info('[GoogleCalendarTokenRefresh] Initializing token refresh job...');

    // Run once on startup (after a delay to let DB connect)
    setTimeout(async () => {
        try {
            await runTokenRefreshJob();
        } catch (error) {
            logger.error('[GoogleCalendarTokenRefresh] Initial run failed:', error.message);
        }
    }, 60000); // 1 minute delay after startup

    // Schedule recurring job
    scheduleTokenRefreshJob();
}

module.exports = {
    refreshExpiringTokens,
    refreshExpiredTokens,
    runTokenRefreshJob,
    scheduleTokenRefreshJob,
    initializeTokenRefreshJob
};
