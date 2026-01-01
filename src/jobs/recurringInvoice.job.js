/**
 * Recurring Invoice Job Scheduler for TRAF3LI
 *
 * Automated tasks for recurring invoice generation and management:
 * - Process due recurring invoices (configurable, default: daily at 9 AM)
 * - Send upcoming invoice notifications (daily at midnight)
 * - Clean up cancelled recurring invoices (daily at 1 AM)
 *
 * Features:
 * - Configurable schedule via environment variables
 * - Automatic retry logic with exponential backoff
 * - Comprehensive error handling and notifications
 * - Job statistics tracking and monitoring
 * - Audit logging for compliance
 * - Manual trigger support for testing/admin
 * - Multi-tenant support with firm isolation
 */

const cron = require('node-cron');
const RecurringInvoiceService = require('../services/recurringInvoice.service');
const Notification = require('../models/notification.model');
const QueueService = require('../services/queue.service');
const logger = require('../utils/logger');

// Job configuration
const RECURRING_INVOICE_JOB_CONFIG = {
    generateInvoices: {
        cron: process.env.RECURRING_INVOICE_CRON_SCHEDULE || '0 9 * * *', // Daily at 9 AM (configurable)
        timeout: 60 * 60 * 1000, // 60 minutes
        retries: parseInt(process.env.RECURRING_INVOICE_MAX_RETRIES) || 3,
        timezone: process.env.TZ || 'Asia/Riyadh'
    },
    sendNotifications: {
        cron: process.env.RECURRING_INVOICE_NOTIFICATION_CRON || '0 0 * * *', // Daily at midnight
        daysAhead: parseInt(process.env.RECURRING_INVOICE_NOTIFICATION_DAYS) || 3,
        timezone: process.env.TZ || 'Asia/Riyadh'
    },
    cleanup: {
        cron: process.env.RECURRING_INVOICE_CLEANUP_CRON || '0 1 * * *', // Daily at 1 AM
        retentionDays: parseInt(process.env.RECURRING_INVOICE_CLEANUP_DAYS) || 30,
        timezone: process.env.TZ || 'Asia/Riyadh'
    }
};

// Track running jobs
let jobsRunning = {
    generateInvoices: false,
    sendNotifications: false,
    cleanup: false
};

// Track job statistics
let jobStats = {
    generateInvoices: {
        lastRun: null,
        lastSuccess: null,
        lastError: null,
        totalRuns: 0,
        totalProcessed: 0,
        totalGenerated: 0,
        totalFailed: 0,
        totalErrors: 0,
        consecutiveErrors: 0
    },
    sendNotifications: {
        lastRun: null,
        lastSuccess: null,
        lastError: null,
        totalRuns: 0,
        totalSent: 0,
        totalErrors: 0
    },
    cleanup: {
        lastRun: null,
        lastSuccess: null,
        lastError: null,
        totalRuns: 0,
        totalDeleted: 0,
        totalErrors: 0
    }
};

/**
 * Generate invoices from recurring templates
 * Main job function that processes all due recurring invoices
 */
const generateRecurringInvoices = async (retryCount = 0) => {
    if (jobsRunning.generateInvoices) {
        logger.info('[Recurring Invoice Jobs] Invoice generation job still running, skipping...');
        return { skipped: true, reason: 'already_running' };
    }

    jobsRunning.generateInvoices = true;
    const startTime = Date.now();

    try {
        logger.info('[Recurring Invoice Jobs] Starting recurring invoice generation job...');
        jobStats.generateInvoices.lastRun = new Date();
        jobStats.generateInvoices.totalRuns++;

        // Use service to process recurring invoices
        const result = await RecurringInvoiceService.processDueRecurringInvoices(null, {
            maxRetries: RECURRING_INVOICE_JOB_CONFIG.generateInvoices.retries
        });

        const duration = Date.now() - startTime;

        // Update statistics
        jobStats.generateInvoices.lastSuccess = new Date();
        jobStats.generateInvoices.totalProcessed += result.processed;
        jobStats.generateInvoices.totalGenerated += result.generated;
        jobStats.generateInvoices.totalFailed += result.failed;
        jobStats.generateInvoices.consecutiveErrors = 0;

        logger.info(`[Recurring Invoice Jobs] Generation complete in ${duration}ms`);
        logger.info(`[Recurring Invoice Jobs] Summary: ${result.generated} generated, ${result.completed} completed, ${result.failed} failed, ${result.paused} paused`);

        // Send success notification if there were any issues
        if (result.failed > 0 || result.paused > 0) {
            await sendJobSummaryNotification('warning', result, duration);
        }

        // Log to audit trail
        await logJobAudit({
            action: 'recurring_invoice_job_completed',
            entityType: 'system',
            details: {
                duration,
                ...result,
                retryCount
            }
        });

        return result;

    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('[Recurring Invoice Jobs] Invoice generation job error:', error);

        // Update error statistics
        jobStats.generateInvoices.lastError = {
            time: new Date(),
            message: error.message,
            stack: error.stack
        };
        jobStats.generateInvoices.totalErrors++;
        jobStats.generateInvoices.consecutiveErrors++;

        // Retry logic with exponential backoff
        if (retryCount < RECURRING_INVOICE_JOB_CONFIG.generateInvoices.retries) {
            const backoffMs = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s, etc.
            logger.info(`[Recurring Invoice Jobs] Retrying in ${backoffMs}ms (attempt ${retryCount + 1}/${RECURRING_INVOICE_JOB_CONFIG.generateInvoices.retries})...`);

            await new Promise(resolve => setTimeout(resolve, backoffMs));

            jobsRunning.generateInvoices = false;
            return await generateRecurringInvoices(retryCount + 1);
        }

        // Send failure notification after all retries exhausted
        await sendJobErrorNotification(error, duration, retryCount);

        // Log error to audit trail
        await logJobAudit({
            action: 'recurring_invoice_job_failed',
            entityType: 'system',
            details: {
                duration,
                error: error.message,
                stack: error.stack,
                retryCount
            }
        });

        throw error;

    } finally {
        jobsRunning.generateInvoices = false;
    }
};

/**
 * Send job summary notification to system admins
 * @param {String} type - Notification type ('success', 'warning', 'error')
 * @param {Object} result - Job execution result
 * @param {Number} duration - Job duration in ms
 */
const sendJobSummaryNotification = async (type, result, duration) => {
    try {
        const priority = type === 'error' ? 'high' : type === 'warning' ? 'medium' : 'low';

        // This would typically go to system admins or monitoring
        logger.info(`[Recurring Invoice Jobs] Job summary notification (${type}):`, {
            type,
            priority,
            result,
            duration
        });

        // You can implement actual notification sending here
        // For example, send to admin users or monitoring system

    } catch (error) {
        logger.error('[Recurring Invoice Jobs] Failed to send job summary notification:', error.message);
    }
};

/**
 * Send job error notification
 * @param {Error} error - Error object
 * @param {Number} duration - Job duration in ms
 * @param {Number} retryCount - Number of retries attempted
 */
const sendJobErrorNotification = async (error, duration, retryCount) => {
    try {
        logger.error(`[Recurring Invoice Jobs] Job error notification:`, {
            error: error.message,
            stack: error.stack,
            duration,
            retryCount
        });

        // Send to system admins or monitoring system
        // Example: Send to Slack, email, or monitoring dashboard

    } catch (err) {
        logger.error('[Recurring Invoice Jobs] Failed to send job error notification:', err.message);
    }
};

/**
 * Send notifications for upcoming recurring invoices
 * Runs daily at midnight
 */
const sendUpcomingNotifications = async () => {
    if (jobsRunning.sendNotifications) {
        logger.info('[Recurring Invoice Jobs] Notification job still running, skipping...');
        return { skipped: true, reason: 'already_running' };
    }

    jobsRunning.sendNotifications = true;
    const startTime = Date.now();

    try {
        logger.info('[Recurring Invoice Jobs] Starting upcoming notifications job...');
        jobStats.sendNotifications.lastRun = new Date();
        jobStats.sendNotifications.totalRuns++;

        // Use service to send notifications
        const result = await RecurringInvoiceService.sendUpcomingNotifications(
            RECURRING_INVOICE_JOB_CONFIG.sendNotifications.daysAhead
        );

        const duration = Date.now() - startTime;

        // Update statistics
        jobStats.sendNotifications.lastSuccess = new Date();
        jobStats.sendNotifications.totalSent += result.sent;

        logger.info(`[Recurring Invoice Jobs] Notification job complete in ${duration}ms`);
        logger.info(`[Recurring Invoice Jobs] Summary: ${result.sent} sent, ${result.failed} failed`);

        // Log to audit trail
        await logJobAudit({
            action: 'recurring_invoice_notifications_sent',
            entityType: 'system',
            details: {
                duration,
                ...result
            }
        });

        return result;

    } catch (error) {
        logger.error('[Recurring Invoice Jobs] Notification job error:', error);

        // Update error statistics
        jobStats.sendNotifications.lastError = {
            time: new Date(),
            message: error.message
        };
        jobStats.sendNotifications.totalErrors++;

        // Log error to audit trail
        await logJobAudit({
            action: 'recurring_invoice_notifications_failed',
            entityType: 'system',
            details: {
                error: error.message
            }
        });

        throw error;

    } finally {
        jobsRunning.sendNotifications = false;
    }
};

/**
 * Cleanup cancelled recurring invoices with no generated invoices
 * Runs daily at 1 AM
 */
const cleanupCancelledRecurring = async () => {
    if (jobsRunning.cleanup) {
        logger.info('[Recurring Invoice Jobs] Cleanup job still running, skipping...');
        return { skipped: true, reason: 'already_running' };
    }

    jobsRunning.cleanup = true;
    const startTime = Date.now();

    try {
        logger.info('[Recurring Invoice Jobs] Starting cleanup job...');
        jobStats.cleanup.lastRun = new Date();
        jobStats.cleanup.totalRuns++;

        // Use service to cleanup
        const result = await RecurringInvoiceService.cleanupCancelledRecurring(
            RECURRING_INVOICE_JOB_CONFIG.cleanup.retentionDays
        );

        const duration = Date.now() - startTime;

        // Update statistics
        jobStats.cleanup.lastSuccess = new Date();
        jobStats.cleanup.totalDeleted += result.deleted;

        logger.info(`[Recurring Invoice Jobs] Cleanup job complete in ${duration}ms`);
        logger.info(`[Recurring Invoice Jobs] Summary: ${result.deleted} deleted`);

        // Log to audit trail
        await logJobAudit({
            action: 'recurring_invoice_cleanup_completed',
            entityType: 'system',
            details: {
                duration,
                ...result,
                retentionDays: RECURRING_INVOICE_JOB_CONFIG.cleanup.retentionDays
            }
        });

        return result;

    } catch (error) {
        logger.error('[Recurring Invoice Jobs] Cleanup job error:', error);

        // Update error statistics
        jobStats.cleanup.lastError = {
            time: new Date(),
            message: error.message
        };
        jobStats.cleanup.totalErrors++;

        // Log error to audit trail
        await logJobAudit({
            action: 'recurring_invoice_cleanup_failed',
            entityType: 'system',
            details: {
                error: error.message
            }
        });

        throw error;

    } finally {
        jobsRunning.cleanup = false;
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
            description: `Recurring invoice job: ${data.action}`,
            metadata: data.details || {},
            ipAddress: '127.0.0.1',
            timestamp: new Date()
        };

        QueueService.logAudit(auditData);

    } catch (error) {
        logger.error('[Recurring Invoice Jobs] Error logging to audit:', error);
        // Don't throw - audit logging failure shouldn't stop the process
    }
};

/**
 * Start all recurring invoice jobs
 */
function startRecurringInvoiceJobs() {
    logger.info('[Recurring Invoice Jobs] Starting recurring invoice job scheduler...');

    // Generate due invoices - configurable schedule (default: daily at 9 AM)
    cron.schedule(
        RECURRING_INVOICE_JOB_CONFIG.generateInvoices.cron,
        () => {
            generateRecurringInvoices().catch(err => {
                logger.error('[Recurring Invoice Jobs] Unhandled error in generateRecurringInvoices:', err);
            });
        },
        {
            timezone: RECURRING_INVOICE_JOB_CONFIG.generateInvoices.timezone
        }
    );
    logger.info(`[Recurring Invoice Jobs] ✓ Invoice generation job: ${RECURRING_INVOICE_JOB_CONFIG.generateInvoices.cron} (${RECURRING_INVOICE_JOB_CONFIG.generateInvoices.timezone})`);

    // Send upcoming notifications - configurable schedule (default: daily at midnight)
    cron.schedule(
        RECURRING_INVOICE_JOB_CONFIG.sendNotifications.cron,
        () => {
            sendUpcomingNotifications().catch(err => {
                logger.error('[Recurring Invoice Jobs] Unhandled error in sendUpcomingNotifications:', err);
            });
        },
        {
            timezone: RECURRING_INVOICE_JOB_CONFIG.sendNotifications.timezone
        }
    );
    logger.info(`[Recurring Invoice Jobs] ✓ Upcoming notifications job: ${RECURRING_INVOICE_JOB_CONFIG.sendNotifications.cron} (${RECURRING_INVOICE_JOB_CONFIG.sendNotifications.timezone})`);

    // Cleanup - configurable schedule (default: daily at 1 AM)
    cron.schedule(
        RECURRING_INVOICE_JOB_CONFIG.cleanup.cron,
        () => {
            cleanupCancelledRecurring().catch(err => {
                logger.error('[Recurring Invoice Jobs] Unhandled error in cleanupCancelledRecurring:', err);
            });
        },
        {
            timezone: RECURRING_INVOICE_JOB_CONFIG.cleanup.timezone
        }
    );
    logger.info(`[Recurring Invoice Jobs] ✓ Cleanup job: ${RECURRING_INVOICE_JOB_CONFIG.cleanup.cron} (${RECURRING_INVOICE_JOB_CONFIG.cleanup.timezone})`);

    logger.info('[Recurring Invoice Jobs] All recurring invoice jobs started successfully');
    logger.info('[Recurring Invoice Jobs] Configuration:', {
        generateInvoices: {
            schedule: RECURRING_INVOICE_JOB_CONFIG.generateInvoices.cron,
            retries: RECURRING_INVOICE_JOB_CONFIG.generateInvoices.retries,
            timezone: RECURRING_INVOICE_JOB_CONFIG.generateInvoices.timezone
        },
        sendNotifications: {
            schedule: RECURRING_INVOICE_JOB_CONFIG.sendNotifications.cron,
            daysAhead: RECURRING_INVOICE_JOB_CONFIG.sendNotifications.daysAhead,
            timezone: RECURRING_INVOICE_JOB_CONFIG.sendNotifications.timezone
        },
        cleanup: {
            schedule: RECURRING_INVOICE_JOB_CONFIG.cleanup.cron,
            retentionDays: RECURRING_INVOICE_JOB_CONFIG.cleanup.retentionDays,
            timezone: RECURRING_INVOICE_JOB_CONFIG.cleanup.timezone
        }
    });
}

/**
 * Stop all jobs (for graceful shutdown)
 */
function stopRecurringInvoiceJobs() {
    logger.info('[Recurring Invoice Jobs] Stopping recurring invoice jobs...');
    // Jobs will stop automatically when process exits
    // Log final statistics
    logger.info('[Recurring Invoice Jobs] Final statistics:', jobStats);
}

/**
 * Manually trigger a specific job (for testing/admin)
 * @param {String} jobName - Job name ('generateInvoices', 'sendNotifications', 'cleanup', or 'all')
 * @param {Object} options - Job options
 * @returns {Promise<Object>} - Job execution result
 */
async function triggerJob(jobName, options = {}) {
    logger.info(`[Recurring Invoice Jobs] Manually triggering ${jobName}...`);

    let result;

    try {
        switch (jobName) {
            case 'generateInvoices':
                result = await generateRecurringInvoices();
                break;
            case 'sendNotifications':
                result = await sendUpcomingNotifications();
                break;
            case 'cleanup':
                result = await cleanupCancelledRecurring();
                break;
            case 'all':
                // Run all jobs sequentially
                const generateResult = await generateRecurringInvoices();
                const notificationResult = await sendUpcomingNotifications();
                const cleanupResult = await cleanupCancelledRecurring();
                result = {
                    generateInvoices: generateResult,
                    sendNotifications: notificationResult,
                    cleanup: cleanupResult
                };
                break;
            default:
                throw new Error(`Unknown job: ${jobName}. Valid options: generateInvoices, sendNotifications, cleanup, all`);
        }

        logger.info(`[Recurring Invoice Jobs] ${jobName} completed successfully`);
        return { success: true, job: jobName, result };

    } catch (error) {
        logger.error(`[Recurring Invoice Jobs] ${jobName} failed:`, error);
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
            generateInvoices: {
                running: jobsRunning.generateInvoices,
                schedule: RECURRING_INVOICE_JOB_CONFIG.generateInvoices.cron,
                timezone: RECURRING_INVOICE_JOB_CONFIG.generateInvoices.timezone,
                retries: RECURRING_INVOICE_JOB_CONFIG.generateInvoices.retries,
                description: 'Process due recurring invoices and generate new invoices'
            },
            sendNotifications: {
                running: jobsRunning.sendNotifications,
                schedule: RECURRING_INVOICE_JOB_CONFIG.sendNotifications.cron,
                timezone: RECURRING_INVOICE_JOB_CONFIG.sendNotifications.timezone,
                daysAhead: RECURRING_INVOICE_JOB_CONFIG.sendNotifications.daysAhead,
                description: 'Send notifications for upcoming recurring invoices'
            },
            cleanup: {
                running: jobsRunning.cleanup,
                schedule: RECURRING_INVOICE_JOB_CONFIG.cleanup.cron,
                timezone: RECURRING_INVOICE_JOB_CONFIG.cleanup.timezone,
                retentionDays: RECURRING_INVOICE_JOB_CONFIG.cleanup.retentionDays,
                description: 'Clean up cancelled recurring invoices'
            }
        },
        statistics: {
            generateInvoices: {
                ...jobStats.generateInvoices,
                healthStatus: getJobHealthStatus('generateInvoices')
            },
            sendNotifications: {
                ...jobStats.sendNotifications,
                healthStatus: getJobHealthStatus('sendNotifications')
            },
            cleanup: {
                ...jobStats.cleanup,
                healthStatus: getJobHealthStatus('cleanup')
            }
        },
        config: RECURRING_INVOICE_JOB_CONFIG
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

    // Check if job has run in the last 48 hours
    const hoursSinceLastRun = (Date.now() - new Date(stats.lastRun).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastRun > 48) {
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
    if (jobName) {
        if (jobStats[jobName]) {
            jobStats[jobName] = {
                lastRun: null,
                lastSuccess: null,
                lastError: null,
                totalRuns: 0,
                totalProcessed: 0,
                totalGenerated: 0,
                totalFailed: 0,
                totalErrors: 0,
                consecutiveErrors: 0
            };
            logger.info(`[Recurring Invoice Jobs] Statistics reset for ${jobName}`);
        }
    } else {
        // Reset all
        for (const key in jobStats) {
            jobStats[key] = {
                lastRun: null,
                lastSuccess: null,
                lastError: null,
                totalRuns: 0,
                totalProcessed: 0,
                totalGenerated: 0,
                totalFailed: 0,
                totalErrors: 0,
                consecutiveErrors: 0
            };
        }
        logger.info('[Recurring Invoice Jobs] All statistics reset');
    }
}

module.exports = {
    startRecurringInvoiceJobs,
    stopRecurringInvoiceJobs,
    triggerJob,
    getJobStatus,
    resetJobStatistics,
    // Export individual functions for testing
    generateRecurringInvoices,
    sendUpcomingNotifications,
    cleanupCancelledRecurring,
    // Export configuration for reference
    RECURRING_INVOICE_JOB_CONFIG
};
