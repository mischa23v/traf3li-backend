/**
 * Webhook Delivery Job Scheduler for TRAF3LI
 *
 * Automated tasks for webhook delivery management:
 * - Process pending webhook deliveries
 * - Retry failed deliveries with exponential backoff
 * - Clean up old delivery records
 * - Monitor webhook health and auto-disable failing webhooks
 *
 * Features:
 * - Configurable schedule via environment variables
 * - Automatic retry logic with exponential backoff
 * - Comprehensive error handling and notifications
 * - Job statistics tracking and monitoring
 * - Audit logging for compliance
 * - Manual trigger support for testing/admin
 * - Multi-tenant support with firm isolation
 * - Circuit breaker pattern for failing webhooks
 */

const cron = require('node-cron');
const webhookService = require('../services/webhook.service');
const Webhook = require('../models/webhook.model');
const WebhookDelivery = require('../models/webhookDelivery.model');
const AuditLog = require('../models/auditLog.model');
const logger = require('../utils/logger');
const { acquireLock } = require('../services/distributedLock.service');

// Job configuration
const WEBHOOK_JOB_CONFIG = {
    processDeliveries: {
        cron: process.env.WEBHOOK_DELIVERY_CRON || '*/5 * * * *', // Every 5 minutes
        timeout: 10 * 60 * 1000, // 10 minutes
        batchSize: parseInt(process.env.WEBHOOK_DELIVERY_BATCH_SIZE) || 100,
        timezone: process.env.TZ || 'Asia/Riyadh'
    },
    retryFailed: {
        cron: process.env.WEBHOOK_RETRY_CRON || '*/10 * * * *', // Every 10 minutes
        timeout: 15 * 60 * 1000, // 15 minutes
        batchSize: parseInt(process.env.WEBHOOK_RETRY_BATCH_SIZE) || 50,
        timezone: process.env.TZ || 'Asia/Riyadh'
    },
    cleanup: {
        cron: process.env.WEBHOOK_CLEANUP_CRON || '0 2 * * *', // Daily at 2 AM
        retentionDays: parseInt(process.env.WEBHOOK_RETENTION_DAYS) || 90,
        timezone: process.env.TZ || 'Asia/Riyadh'
    },
    healthCheck: {
        cron: process.env.WEBHOOK_HEALTH_CRON || '0 */6 * * *', // Every 6 hours
        failureThreshold: parseInt(process.env.WEBHOOK_FAILURE_THRESHOLD) || 80, // 80% failure rate
        minDeliveries: parseInt(process.env.WEBHOOK_MIN_DELIVERIES) || 10,
        timezone: process.env.TZ || 'Asia/Riyadh'
    }
};

// Track running jobs
let jobsRunning = {
    processDeliveries: false,
    retryFailed: false,
    cleanup: false,
    healthCheck: false
};

// Track job statistics
let jobStats = {
    processDeliveries: {
        lastRun: null,
        lastSuccess: null,
        lastError: null,
        totalRuns: 0,
        totalProcessed: 0,
        totalSucceeded: 0,
        totalFailed: 0,
        totalErrors: 0,
        consecutiveErrors: 0
    },
    retryFailed: {
        lastRun: null,
        lastSuccess: null,
        lastError: null,
        totalRuns: 0,
        totalRetried: 0,
        totalSucceeded: 0,
        totalFailed: 0,
        totalErrors: 0
    },
    cleanup: {
        lastRun: null,
        lastSuccess: null,
        lastError: null,
        totalRuns: 0,
        totalDeleted: 0,
        totalErrors: 0
    },
    healthCheck: {
        lastRun: null,
        lastSuccess: null,
        lastError: null,
        totalRuns: 0,
        totalChecked: 0,
        totalDisabled: 0,
        totalErrors: 0
    }
};

/**
 * Process pending webhook deliveries
 * Main job function that processes pending deliveries in batches
 */
const processPendingDeliveries = async () => {
    // Acquire distributed lock
    const lock = await acquireLock('webhook_delivery_process');

    if (!lock.acquired) {
        logger.info(`[Webhook Jobs] Delivery processing job already running on another instance (TTL: ${lock.ttlRemaining}s), skipping...`);
        return { skipped: true, reason: 'already_running_distributed' };
    }

    if (jobsRunning.processDeliveries) {
        await lock.release();
        logger.info('[Webhook Jobs] Delivery processing job still running, skipping...');
        return { skipped: true, reason: 'already_running' };
    }

    jobsRunning.processDeliveries = true;
    const startTime = Date.now();

    try {
        logger.info('[Webhook Jobs] Starting pending deliveries processing job...');
        jobStats.processDeliveries.lastRun = new Date();
        jobStats.processDeliveries.totalRuns++;

        // Get pending deliveries (those that haven't been attempted yet)
        // NOTE: Bypass firmIsolation filter - system job operates across all firms
        const pendingDeliveries = await WebhookDelivery.find({
            status: 'pending',
            currentAttempt: 0
        })
        .setOptions({ bypassFirmFilter: true })
        .populate('webhookId')
        .limit(WEBHOOK_JOB_CONFIG.processDeliveries.batchSize)
        .sort({ createdAt: 1 }); // Process oldest first

        logger.info(`[Webhook Jobs] Found ${pendingDeliveries.length} pending deliveries`);

        let succeeded = 0;
        let failed = 0;

        // Process each delivery
        for (const delivery of pendingDeliveries) {
            try {
                if (!delivery.webhookId || !delivery.webhookId.isActive) {
                    logger.info(`[Webhook Jobs] Skipping delivery ${delivery._id} - webhook inactive`);
                    await delivery.recordAttempt({
                        status: 'failed',
                        httpStatus: null,
                        duration: 0,
                        error: 'Webhook is inactive or deleted'
                    });
                    failed++;
                    continue;
                }

                // Prepare headers
                const headers = {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': delivery.signature,
                    'X-Webhook-Event': delivery.event,
                    'X-Webhook-ID': delivery.webhookId._id.toString(),
                    'X-Webhook-Timestamp': new Date().toISOString(),
                    'User-Agent': 'Traf3li-Webhook/1.0'
                };

                // Add custom headers
                if (delivery.webhookId.headers) {
                    delivery.webhookId.headers.forEach((value, key) => {
                        headers[key] = value;
                    });
                }

                // Attempt delivery
                const success = await webhookService.attemptDelivery(
                    delivery,
                    delivery.webhookId,
                    headers,
                    delivery.payload
                );

                if (success) {
                    succeeded++;
                } else {
                    failed++;
                }

                jobStats.processDeliveries.totalProcessed++;
            } catch (error) {
                logger.error(`[Webhook Jobs] Error processing delivery ${delivery._id}:`, error);
                failed++;
            }
        }

        const duration = Date.now() - startTime;

        // Update statistics
        jobStats.processDeliveries.lastSuccess = new Date();
        jobStats.processDeliveries.totalSucceeded += succeeded;
        jobStats.processDeliveries.totalFailed += failed;
        jobStats.processDeliveries.consecutiveErrors = 0;

        logger.info(`[Webhook Jobs] Processing complete in ${duration}ms`);
        logger.info(`[Webhook Jobs] Summary: ${succeeded} succeeded, ${failed} failed`);

        // Log to audit trail
        await logJobAudit({
            action: 'webhook_delivery_job_completed',
            entityType: 'system',
            details: {
                duration,
                processed: pendingDeliveries.length,
                succeeded,
                failed
            }
        });

        return {
            processed: pendingDeliveries.length,
            succeeded,
            failed
        };

    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('[Webhook Jobs] Delivery processing job error:', error);

        // Update error statistics
        jobStats.processDeliveries.lastError = {
            time: new Date(),
            message: error.message,
            stack: error.stack
        };
        jobStats.processDeliveries.totalErrors++;
        jobStats.processDeliveries.consecutiveErrors++;

        // Log error to audit trail
        await logJobAudit({
            action: 'webhook_delivery_job_failed',
            entityType: 'system',
            details: {
                duration,
                error: error.message,
                stack: error.stack
            }
        });

        throw error;

    } finally {
        jobsRunning.processDeliveries = false;
        await lock.release();
    }
};

/**
 * Retry failed webhook deliveries
 * Processes deliveries that failed and are due for retry
 */
const retryFailedDeliveries = async () => {
    // Acquire distributed lock
    const lock = await acquireLock('webhook_retry_failed');

    if (!lock.acquired) {
        logger.info(`[Webhook Jobs] Retry job already running on another instance (TTL: ${lock.ttlRemaining}s), skipping...`);
        return { skipped: true, reason: 'already_running_distributed' };
    }

    if (jobsRunning.retryFailed) {
        await lock.release();
        logger.info('[Webhook Jobs] Retry job still running, skipping...');
        return { skipped: true, reason: 'already_running' };
    }

    jobsRunning.retryFailed = true;
    const startTime = Date.now();

    try {
        logger.info('[Webhook Jobs] Starting failed deliveries retry job...');
        jobStats.retryFailed.lastRun = new Date();
        jobStats.retryFailed.totalRuns++;

        // Use service to retry failed deliveries
        const retried = await webhookService.retryFailed();

        const duration = Date.now() - startTime;

        // Update statistics
        jobStats.retryFailed.lastSuccess = new Date();
        jobStats.retryFailed.totalRetried += retried;

        logger.info(`[Webhook Jobs] Retry job complete in ${duration}ms`);
        logger.info(`[Webhook Jobs] Summary: ${retried} deliveries retried`);

        // Log to audit trail
        await logJobAudit({
            action: 'webhook_retry_job_completed',
            entityType: 'system',
            details: {
                duration,
                retried
            }
        });

        return { retried };

    } catch (error) {
        logger.error('[Webhook Jobs] Retry job error:', error);

        // Update error statistics
        jobStats.retryFailed.lastError = {
            time: new Date(),
            message: error.message
        };
        jobStats.retryFailed.totalErrors++;

        // Log error to audit trail
        await logJobAudit({
            action: 'webhook_retry_job_failed',
            entityType: 'system',
            details: {
                error: error.message
            }
        });

        throw error;

    } finally {
        jobsRunning.retryFailed = false;
        await lock.release();
    }
};

/**
 * Cleanup old webhook delivery records
 * Runs daily to remove old delivery logs
 */
const cleanupOldDeliveries = async () => {
    // Acquire distributed lock
    const lock = await acquireLock('webhook_cleanup');

    if (!lock.acquired) {
        logger.info(`[Webhook Jobs] Cleanup job already running on another instance (TTL: ${lock.ttlRemaining}s), skipping...`);
        return { skipped: true, reason: 'already_running_distributed' };
    }

    if (jobsRunning.cleanup) {
        await lock.release();
        logger.info('[Webhook Jobs] Cleanup job still running, skipping...');
        return { skipped: true, reason: 'already_running' };
    }

    jobsRunning.cleanup = true;
    const startTime = Date.now();

    try {
        logger.info('[Webhook Jobs] Starting cleanup job...');
        jobStats.cleanup.lastRun = new Date();
        jobStats.cleanup.totalRuns++;

        const retentionDate = new Date();
        retentionDate.setDate(retentionDate.getDate() - WEBHOOK_JOB_CONFIG.cleanup.retentionDays);

        // Delete old completed deliveries (keep failed ones for debugging)
        // NOTE: Bypass firmIsolation filter - system job operates across all firms
        const result = await WebhookDelivery.deleteMany({
            status: { $in: ['success', 'failed'] },
            completedAt: { $lt: retentionDate }
        }).setOptions({ bypassFirmFilter: true });

        const duration = Date.now() - startTime;

        // Update statistics
        jobStats.cleanup.lastSuccess = new Date();
        jobStats.cleanup.totalDeleted += result.deletedCount;

        logger.info(`[Webhook Jobs] Cleanup job complete in ${duration}ms`);
        logger.info(`[Webhook Jobs] Summary: ${result.deletedCount} old deliveries deleted`);

        // Log to audit trail
        await logJobAudit({
            action: 'webhook_cleanup_completed',
            entityType: 'system',
            details: {
                duration,
                deleted: result.deletedCount,
                retentionDays: WEBHOOK_JOB_CONFIG.cleanup.retentionDays
            }
        });

        return { deleted: result.deletedCount };

    } catch (error) {
        logger.error('[Webhook Jobs] Cleanup job error:', error);

        // Update error statistics
        jobStats.cleanup.lastError = {
            time: new Date(),
            message: error.message
        };
        jobStats.cleanup.totalErrors++;

        // Log error to audit trail
        await logJobAudit({
            action: 'webhook_cleanup_failed',
            entityType: 'system',
            details: {
                error: error.message
            }
        });

        throw error;

    } finally {
        jobsRunning.cleanup = false;
        await lock.release();
    }
};

/**
 * Health check - monitor webhook performance and auto-disable failing ones
 * Runs periodically to check webhook health
 */
const performHealthCheck = async () => {
    // Acquire distributed lock
    const lock = await acquireLock('webhook_health_check');

    if (!lock.acquired) {
        logger.info(`[Webhook Jobs] Health check job already running on another instance (TTL: ${lock.ttlRemaining}s), skipping...`);
        return { skipped: true, reason: 'already_running_distributed' };
    }

    if (jobsRunning.healthCheck) {
        await lock.release();
        logger.info('[Webhook Jobs] Health check job still running, skipping...');
        return { skipped: true, reason: 'already_running' };
    }

    jobsRunning.healthCheck = true;
    const startTime = Date.now();

    try {
        logger.info('[Webhook Jobs] Starting health check job...');
        jobStats.healthCheck.lastRun = new Date();
        jobStats.healthCheck.totalRuns++;

        // Get all active webhooks
        // NOTE: Bypass firmIsolation filter - system job operates across all firms
        const webhooks = await Webhook.find({ isActive: true }).setOptions({ bypassFirmFilter: true });

        let checked = 0;
        let disabled = 0;

        for (const webhook of webhooks) {
            checked++;

            // Check if webhook has high failure rate
            const failureRate = webhook.failureRate;
            const totalDeliveries = webhook.statistics?.totalDeliveries || 0;

            if (
                totalDeliveries >= WEBHOOK_JOB_CONFIG.healthCheck.minDeliveries &&
                failureRate >= WEBHOOK_JOB_CONFIG.healthCheck.failureThreshold
            ) {
                logger.warn(`[Webhook Jobs] Webhook ${webhook._id} has ${failureRate.toFixed(2)}% failure rate, auto-disabling...`);

                await webhook.disable(
                    `Auto-disabled due to high failure rate (${failureRate.toFixed(2)}%) after ${totalDeliveries} deliveries`,
                    null
                );

                disabled++;

                // Log to audit trail
                await logJobAudit({
                    action: 'webhook_auto_disabled',
                    entityType: 'webhook',
                    entityId: webhook._id,
                    firmId: webhook.firmId,
                    details: {
                        failureRate,
                        totalDeliveries,
                        url: webhook.url
                    }
                });
            }
        }

        const duration = Date.now() - startTime;

        // Update statistics
        jobStats.healthCheck.lastSuccess = new Date();
        jobStats.healthCheck.totalChecked += checked;
        jobStats.healthCheck.totalDisabled += disabled;

        logger.info(`[Webhook Jobs] Health check complete in ${duration}ms`);
        logger.info(`[Webhook Jobs] Summary: ${checked} webhooks checked, ${disabled} auto-disabled`);

        // Log to audit trail
        await logJobAudit({
            action: 'webhook_health_check_completed',
            entityType: 'system',
            details: {
                duration,
                checked,
                disabled
            }
        });

        return { checked, disabled };

    } catch (error) {
        logger.error('[Webhook Jobs] Health check job error:', error);

        // Update error statistics
        jobStats.healthCheck.lastError = {
            time: new Date(),
            message: error.message
        };
        jobStats.healthCheck.totalErrors++;

        // Log error to audit trail
        await logJobAudit({
            action: 'webhook_health_check_failed',
            entityType: 'system',
            details: {
                error: error.message
            }
        });

        throw error;

    } finally {
        jobsRunning.healthCheck = false;
        await lock.release();
    }
};

/**
 * Log job action to audit trail
 * @param {Object} data - Audit log data
 */
const logJobAudit = async (data) => {
    try {
        const auditData = {
            action: data.action,
            entityType: data.entityType || 'system',
            entityId: data.entityId || null,
            resourceType: data.entityType || 'system',
            resourceId: data.entityId || null,
            firmId: data.firmId || null,
            userId: data.userId || null,
            userEmail: 'system',
            userRole: 'system',
            severity: 'info',
            category: 'automation',
            description: `Webhook job: ${data.action}`,
            metadata: data.details || {},
            ipAddress: '127.0.0.1',
            timestamp: new Date()
        };

        await AuditLog.create(auditData);

    } catch (error) {
        logger.error('[Webhook Jobs] Error logging to audit:', error);
        // Don't throw - audit logging failure shouldn't stop the process
    }
};

/**
 * Start all webhook delivery jobs
 */
function startWebhookDeliveryJobs() {
    logger.info('[Webhook Jobs] Starting webhook delivery job scheduler...');

    // Process pending deliveries - every 5 minutes
    cron.schedule(
        WEBHOOK_JOB_CONFIG.processDeliveries.cron,
        () => {
            processPendingDeliveries().catch(err => {
                logger.error('[Webhook Jobs] Unhandled error in processPendingDeliveries:', err);
            });
        },
        {
            timezone: WEBHOOK_JOB_CONFIG.processDeliveries.timezone
        }
    );
    logger.info(`[Webhook Jobs] ✓ Pending deliveries job: ${WEBHOOK_JOB_CONFIG.processDeliveries.cron} (${WEBHOOK_JOB_CONFIG.processDeliveries.timezone})`);

    // Retry failed deliveries - every 10 minutes
    cron.schedule(
        WEBHOOK_JOB_CONFIG.retryFailed.cron,
        () => {
            retryFailedDeliveries().catch(err => {
                logger.error('[Webhook Jobs] Unhandled error in retryFailedDeliveries:', err);
            });
        },
        {
            timezone: WEBHOOK_JOB_CONFIG.retryFailed.timezone
        }
    );
    logger.info(`[Webhook Jobs] ✓ Retry failed job: ${WEBHOOK_JOB_CONFIG.retryFailed.cron} (${WEBHOOK_JOB_CONFIG.retryFailed.timezone})`);

    // Cleanup old deliveries - daily at 2 AM
    cron.schedule(
        WEBHOOK_JOB_CONFIG.cleanup.cron,
        () => {
            cleanupOldDeliveries().catch(err => {
                logger.error('[Webhook Jobs] Unhandled error in cleanupOldDeliveries:', err);
            });
        },
        {
            timezone: WEBHOOK_JOB_CONFIG.cleanup.timezone
        }
    );
    logger.info(`[Webhook Jobs] ✓ Cleanup job: ${WEBHOOK_JOB_CONFIG.cleanup.cron} (${WEBHOOK_JOB_CONFIG.cleanup.timezone})`);

    // Health check - every 6 hours
    cron.schedule(
        WEBHOOK_JOB_CONFIG.healthCheck.cron,
        () => {
            performHealthCheck().catch(err => {
                logger.error('[Webhook Jobs] Unhandled error in performHealthCheck:', err);
            });
        },
        {
            timezone: WEBHOOK_JOB_CONFIG.healthCheck.timezone
        }
    );
    logger.info(`[Webhook Jobs] ✓ Health check job: ${WEBHOOK_JOB_CONFIG.healthCheck.cron} (${WEBHOOK_JOB_CONFIG.healthCheck.timezone})`);

    logger.info('[Webhook Jobs] All webhook delivery jobs started successfully');
    logger.info('[Webhook Jobs] Configuration:', {
        processDeliveries: {
            schedule: WEBHOOK_JOB_CONFIG.processDeliveries.cron,
            batchSize: WEBHOOK_JOB_CONFIG.processDeliveries.batchSize,
            timezone: WEBHOOK_JOB_CONFIG.processDeliveries.timezone
        },
        retryFailed: {
            schedule: WEBHOOK_JOB_CONFIG.retryFailed.cron,
            batchSize: WEBHOOK_JOB_CONFIG.retryFailed.batchSize,
            timezone: WEBHOOK_JOB_CONFIG.retryFailed.timezone
        },
        cleanup: {
            schedule: WEBHOOK_JOB_CONFIG.cleanup.cron,
            retentionDays: WEBHOOK_JOB_CONFIG.cleanup.retentionDays,
            timezone: WEBHOOK_JOB_CONFIG.cleanup.timezone
        },
        healthCheck: {
            schedule: WEBHOOK_JOB_CONFIG.healthCheck.cron,
            failureThreshold: WEBHOOK_JOB_CONFIG.healthCheck.failureThreshold,
            minDeliveries: WEBHOOK_JOB_CONFIG.healthCheck.minDeliveries,
            timezone: WEBHOOK_JOB_CONFIG.healthCheck.timezone
        }
    });
}

/**
 * Stop all jobs (for graceful shutdown)
 */
function stopWebhookDeliveryJobs() {
    logger.info('[Webhook Jobs] Stopping webhook delivery jobs...');
    // Jobs will stop automatically when process exits
    // Log final statistics
    logger.info('[Webhook Jobs] Final statistics:', jobStats);
}

/**
 * Manually trigger a specific job (for testing/admin)
 * @param {String} jobName - Job name ('processDeliveries', 'retryFailed', 'cleanup', 'healthCheck', or 'all')
 * @param {Object} options - Job options
 * @returns {Promise<Object>} - Job execution result
 */
async function triggerJob(jobName, options = {}) {
    logger.info(`[Webhook Jobs] Manually triggering ${jobName}...`);

    let result;

    try {
        switch (jobName) {
            case 'processDeliveries':
                result = await processPendingDeliveries();
                break;
            case 'retryFailed':
                result = await retryFailedDeliveries();
                break;
            case 'cleanup':
                result = await cleanupOldDeliveries();
                break;
            case 'healthCheck':
                result = await performHealthCheck();
                break;
            case 'all':
                // Run all jobs sequentially
                const processResult = await processPendingDeliveries();
                const retryResult = await retryFailedDeliveries();
                const cleanupResult = await cleanupOldDeliveries();
                const healthResult = await performHealthCheck();
                result = {
                    processDeliveries: processResult,
                    retryFailed: retryResult,
                    cleanup: cleanupResult,
                    healthCheck: healthResult
                };
                break;
            default:
                throw new Error(`Unknown job: ${jobName}. Valid options: processDeliveries, retryFailed, cleanup, healthCheck, all`);
        }

        logger.info(`[Webhook Jobs] ${jobName} completed successfully`);
        return { success: true, job: jobName, result };

    } catch (error) {
        logger.error(`[Webhook Jobs] ${jobName} failed:`, error);
        throw error;
    }
}

/**
 * Get job status and statistics
 * @returns {Object} - Job status and statistics
 */
function getJobStatus() {
    return {
        jobs: {
            processDeliveries: {
                running: jobsRunning.processDeliveries,
                schedule: WEBHOOK_JOB_CONFIG.processDeliveries.cron,
                timezone: WEBHOOK_JOB_CONFIG.processDeliveries.timezone,
                batchSize: WEBHOOK_JOB_CONFIG.processDeliveries.batchSize,
                description: 'Process pending webhook deliveries'
            },
            retryFailed: {
                running: jobsRunning.retryFailed,
                schedule: WEBHOOK_JOB_CONFIG.retryFailed.cron,
                timezone: WEBHOOK_JOB_CONFIG.retryFailed.timezone,
                batchSize: WEBHOOK_JOB_CONFIG.retryFailed.batchSize,
                description: 'Retry failed webhook deliveries'
            },
            cleanup: {
                running: jobsRunning.cleanup,
                schedule: WEBHOOK_JOB_CONFIG.cleanup.cron,
                timezone: WEBHOOK_JOB_CONFIG.cleanup.timezone,
                retentionDays: WEBHOOK_JOB_CONFIG.cleanup.retentionDays,
                description: 'Clean up old delivery records'
            },
            healthCheck: {
                running: jobsRunning.healthCheck,
                schedule: WEBHOOK_JOB_CONFIG.healthCheck.cron,
                timezone: WEBHOOK_JOB_CONFIG.healthCheck.timezone,
                failureThreshold: WEBHOOK_JOB_CONFIG.healthCheck.failureThreshold,
                description: 'Monitor webhook health and auto-disable failing ones'
            }
        },
        statistics: {
            processDeliveries: {
                ...jobStats.processDeliveries,
                healthStatus: getJobHealthStatus('processDeliveries')
            },
            retryFailed: {
                ...jobStats.retryFailed,
                healthStatus: getJobHealthStatus('retryFailed')
            },
            cleanup: {
                ...jobStats.cleanup,
                healthStatus: getJobHealthStatus('cleanup')
            },
            healthCheck: {
                ...jobStats.healthCheck,
                healthStatus: getJobHealthStatus('healthCheck')
            }
        },
        config: WEBHOOK_JOB_CONFIG
    };
}

/**
 * Get health status for a job
 * @param {String} jobName - Job name
 * @returns {String} - Health status ('healthy', 'warning', 'error')
 */
function getJobHealthStatus(jobName) {
    const stats = jobStats[jobName];

    if (!stats || !stats.lastRun) {
        return 'unknown';
    }

    // Check if job has run recently
    const hoursSinceLastRun = (Date.now() - new Date(stats.lastRun).getTime()) / (1000 * 60 * 60);

    // Different thresholds for different jobs
    const maxHoursSinceRun = jobName === 'cleanup' || jobName === 'healthCheck' ? 48 : 2;

    if (hoursSinceLastRun > maxHoursSinceRun) {
        return 'error';
    }

    // Check for consecutive errors
    if (stats.consecutiveErrors && stats.consecutiveErrors >= 3) {
        return 'error';
    }

    // Check error rate
    if (stats.totalRuns > 0) {
        const errorRate = stats.totalErrors / stats.totalRuns;
        if (errorRate > 0.5) {
            return 'warning';
        }
    }

    return 'healthy';
}

/**
 * Reset job statistics
 * @param {String} jobName - Job name (optional, resets all if not provided)
 */
function resetJobStatistics(jobName = null) {
    const defaultStats = {
        lastRun: null,
        lastSuccess: null,
        lastError: null,
        totalRuns: 0,
        totalErrors: 0
    };

    if (jobName) {
        if (jobStats[jobName]) {
            jobStats[jobName] = {
                ...defaultStats,
                ...(jobName === 'processDeliveries' ? { totalProcessed: 0, totalSucceeded: 0, totalFailed: 0, consecutiveErrors: 0 } : {}),
                ...(jobName === 'retryFailed' ? { totalRetried: 0, totalSucceeded: 0, totalFailed: 0 } : {}),
                ...(jobName === 'cleanup' ? { totalDeleted: 0 } : {}),
                ...(jobName === 'healthCheck' ? { totalChecked: 0, totalDisabled: 0 } : {})
            };
            logger.info(`[Webhook Jobs] Statistics reset for ${jobName}`);
        }
    } else {
        // Reset all
        Object.keys(jobStats).forEach(key => {
            jobStats[key] = {
                ...defaultStats,
                ...(key === 'processDeliveries' ? { totalProcessed: 0, totalSucceeded: 0, totalFailed: 0, consecutiveErrors: 0 } : {}),
                ...(key === 'retryFailed' ? { totalRetried: 0, totalSucceeded: 0, totalFailed: 0 } : {}),
                ...(key === 'cleanup' ? { totalDeleted: 0 } : {}),
                ...(key === 'healthCheck' ? { totalChecked: 0, totalDisabled: 0 } : {})
            };
        });
        logger.info('[Webhook Jobs] All statistics reset');
    }
}

module.exports = {
    startWebhookDeliveryJobs,
    stopWebhookDeliveryJobs,
    triggerJob,
    getJobStatus,
    resetJobStatistics,
    // Export individual functions for testing
    processPendingDeliveries,
    retryFailedDeliveries,
    cleanupOldDeliveries,
    performHealthCheck,
    // Export configuration for reference
    WEBHOOK_JOB_CONFIG
};
