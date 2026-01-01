/**
 * Workflow Job Scheduler for TRAF3LI
 *
 * Automated tasks for workflow processing and management:
 * - Process scheduled workflows (configurable, default: every 15 minutes)
 * - Handle delay steps (every minute)
 * - Check conditions for event-triggered workflows (every 5 minutes)
 * - Cleanup stale workflow instances (daily at 2 AM)
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
const workflowService = require('../services/workflow.service');
const WorkflowInstance = require('../models/workflowInstance.model');
const QueueService = require('../services/queue.service');
const logger = require('../utils/logger');

// Job configuration
const WORKFLOW_JOB_CONFIG = {
    processScheduled: {
        cron: process.env.WORKFLOW_SCHEDULED_CRON || '*/15 * * * *', // Every 15 minutes
        timeout: 30 * 60 * 1000, // 30 minutes
        retries: parseInt(process.env.WORKFLOW_MAX_RETRIES) || 3,
        timezone: process.env.TZ || 'Asia/Riyadh'
    },
    processDelays: {
        cron: process.env.WORKFLOW_DELAY_CRON || '* * * * *', // Every minute
        timeout: 5 * 60 * 1000, // 5 minutes
        timezone: process.env.TZ || 'Asia/Riyadh'
    },
    processConditions: {
        cron: process.env.WORKFLOW_CONDITION_CRON || '*/5 * * * *', // Every 5 minutes
        timeout: 10 * 60 * 1000, // 10 minutes
        timezone: process.env.TZ || 'Asia/Riyadh'
    },
    cleanup: {
        cron: process.env.WORKFLOW_CLEANUP_CRON || '0 2 * * *', // Daily at 2 AM
        retentionDays: parseInt(process.env.WORKFLOW_CLEANUP_DAYS) || 90,
        timezone: process.env.TZ || 'Asia/Riyadh'
    }
};

// Track running jobs
let jobsRunning = {
    processScheduled: false,
    processDelays: false,
    processConditions: false,
    cleanup: false
};

// Track job statistics
let jobStats = {
    processScheduled: {
        lastRun: null,
        lastSuccess: null,
        lastError: null,
        totalRuns: 0,
        totalProcessed: 0,
        totalStarted: 0,
        totalErrors: 0,
        consecutiveErrors: 0
    },
    processDelays: {
        lastRun: null,
        lastSuccess: null,
        lastError: null,
        totalRuns: 0,
        totalProcessed: 0,
        totalResumed: 0,
        totalErrors: 0
    },
    processConditions: {
        lastRun: null,
        lastSuccess: null,
        lastError: null,
        totalRuns: 0,
        totalProcessed: 0,
        totalTriggered: 0,
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
 * Process scheduled workflows
 * Main job function that processes all due scheduled workflows
 */
const processScheduledWorkflows = async (retryCount = 0) => {
    if (jobsRunning.processScheduled) {
        logger.info('[Workflow Jobs] Scheduled workflow job still running, skipping...');
        return { skipped: true, reason: 'already_running' };
    }

    jobsRunning.processScheduled = true;
    const startTime = Date.now();

    try {
        logger.info('[Workflow Jobs] Starting scheduled workflow processing job...');
        jobStats.processScheduled.lastRun = new Date();
        jobStats.processScheduled.totalRuns++;

        // Use service to process scheduled workflows
        const result = await workflowService.processScheduledWorkflows();

        const duration = Date.now() - startTime;

        // Update statistics
        jobStats.processScheduled.lastSuccess = new Date();
        jobStats.processScheduled.totalProcessed += result.processed;
        jobStats.processScheduled.totalStarted += result.started;
        jobStats.processScheduled.consecutiveErrors = 0;

        logger.info(`[Workflow Jobs] Scheduled processing complete in ${duration}ms`);
        logger.info(`[Workflow Jobs] Summary: ${result.processed} processed, ${result.started} started, ${result.errors} errors`);

        // Log to audit trail
        await logJobAudit({
            action: 'workflow_scheduled_job_completed',
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
        logger.error('[Workflow Jobs] Scheduled workflow job error:', error);

        // Update error statistics
        jobStats.processScheduled.lastError = {
            time: new Date(),
            message: error.message,
            stack: error.stack
        };
        jobStats.processScheduled.totalErrors++;
        jobStats.processScheduled.consecutiveErrors++;

        // Retry logic with exponential backoff
        if (retryCount < WORKFLOW_JOB_CONFIG.processScheduled.retries) {
            const backoffMs = Math.pow(2, retryCount) * 1000;
            logger.info(`[Workflow Jobs] Retrying in ${backoffMs}ms (attempt ${retryCount + 1}/${WORKFLOW_JOB_CONFIG.processScheduled.retries})...`);

            await new Promise(resolve => setTimeout(resolve, backoffMs));

            jobsRunning.processScheduled = false;
            return await processScheduledWorkflows(retryCount + 1);
        }

        // Log error to audit trail
        await logJobAudit({
            action: 'workflow_scheduled_job_failed',
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
        jobsRunning.processScheduled = false;
    }
};

/**
 * Process delay steps
 * Resumes workflows that have completed their delay period
 */
const processDelaySteps = async () => {
    if (jobsRunning.processDelays) {
        logger.debug('[Workflow Jobs] Delay processing job still running, skipping...');
        return { skipped: true, reason: 'already_running' };
    }

    jobsRunning.processDelays = true;
    const startTime = Date.now();

    try {
        logger.debug('[Workflow Jobs] Starting delay step processing job...');
        jobStats.processDelays.lastRun = new Date();
        jobStats.processDelays.totalRuns++;

        const now = new Date();
        let processed = 0;
        let resumed = 0;
        let errors = 0;

        // Find workflow instances waiting for delay completion
        // NOTE: Bypass firmIsolation filter - system job operates across all firms
        const delayedInstances = await WorkflowInstance.find({
            status: 'running',
            'stepHistory.status': 'delayed'
        }).setOptions({ bypassFirmFilter: true }).lean();

        for (const instance of delayedInstances) {
            try {
                processed++;

                // Check if delay has completed
                const currentStep = instance.stepHistory.find(
                    h => h.stepOrder === instance.currentStep && h.status === 'delayed'
                );

                if (currentStep && currentStep.result && currentStep.result.resumeAt) {
                    if (new Date(currentStep.result.resumeAt) <= now) {
                        // Delay completed, advance step
                        await workflowService.advanceStep(
                            instance._id.toString(),
                            { status: 'completed', completedBy: instance.startedBy }
                        );
                        resumed++;
                    }
                }
            } catch (error) {
                logger.error(`Failed to process delayed instance ${instance._id}:`, error.message);
                errors++;
            }
        }

        const duration = Date.now() - startTime;

        // Update statistics
        jobStats.processDelays.lastSuccess = new Date();
        jobStats.processDelays.totalProcessed += processed;
        jobStats.processDelays.totalResumed += resumed;

        logger.debug(`[Workflow Jobs] Delay processing complete in ${duration}ms (${processed} processed, ${resumed} resumed, ${errors} errors)`);

        return { processed, resumed, errors };

    } catch (error) {
        logger.error('[Workflow Jobs] Delay processing job error:', error);

        // Update error statistics
        jobStats.processDelays.lastError = {
            time: new Date(),
            message: error.message
        };
        jobStats.processDelays.totalErrors++;

        throw error;

    } finally {
        jobsRunning.processDelays = false;
    }
};

/**
 * Process condition checks
 * Checks conditions for event-triggered workflows
 */
const processConditionChecks = async () => {
    if (jobsRunning.processConditions) {
        logger.debug('[Workflow Jobs] Condition check job still running, skipping...');
        return { skipped: true, reason: 'already_running' };
    }

    jobsRunning.processConditions = true;
    const startTime = Date.now();

    try {
        logger.debug('[Workflow Jobs] Starting condition check job...');
        jobStats.processConditions.lastRun = new Date();
        jobStats.processConditions.totalRuns++;

        // Placeholder for condition checking logic
        // This would check if any event-triggered workflows should start
        // based on data changes or conditions

        const duration = Date.now() - startTime;

        // Update statistics
        jobStats.processConditions.lastSuccess = new Date();

        logger.debug(`[Workflow Jobs] Condition check complete in ${duration}ms`);

        return { processed: 0, triggered: 0 };

    } catch (error) {
        logger.error('[Workflow Jobs] Condition check job error:', error);

        // Update error statistics
        jobStats.processConditions.lastError = {
            time: new Date(),
            message: error.message
        };
        jobStats.processConditions.totalErrors++;

        throw error;

    } finally {
        jobsRunning.processConditions = false;
    }
};

/**
 * Cleanup stale workflow instances
 * Removes old completed/failed/cancelled workflow instances
 */
const cleanupStaleInstances = async () => {
    if (jobsRunning.cleanup) {
        logger.info('[Workflow Jobs] Cleanup job still running, skipping...');
        return { skipped: true, reason: 'already_running' };
    }

    jobsRunning.cleanup = true;
    const startTime = Date.now();

    try {
        logger.info('[Workflow Jobs] Starting cleanup job...');
        jobStats.cleanup.lastRun = new Date();
        jobStats.cleanup.totalRuns++;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - WORKFLOW_JOB_CONFIG.cleanup.retentionDays);

        // Delete old completed/failed/cancelled instances
        // NOTE: Bypass firmIsolation filter - system job operates across all firms
        const result = await WorkflowInstance.deleteMany({
            status: { $in: ['completed', 'failed', 'cancelled'] },
            completedAt: { $lt: cutoffDate }
        }).setOptions({ bypassFirmFilter: true });

        const duration = Date.now() - startTime;

        // Update statistics
        jobStats.cleanup.lastSuccess = new Date();
        jobStats.cleanup.totalDeleted += result.deletedCount;

        logger.info(`[Workflow Jobs] Cleanup job complete in ${duration}ms`);
        logger.info(`[Workflow Jobs] Summary: ${result.deletedCount} deleted`);

        // Log to audit trail
        await logJobAudit({
            action: 'workflow_cleanup_completed',
            entityType: 'system',
            details: {
                duration,
                deleted: result.deletedCount,
                retentionDays: WORKFLOW_JOB_CONFIG.cleanup.retentionDays
            }
        });

        return { deleted: result.deletedCount };

    } catch (error) {
        logger.error('[Workflow Jobs] Cleanup job error:', error);

        // Update error statistics
        jobStats.cleanup.lastError = {
            time: new Date(),
            message: error.message
        };
        jobStats.cleanup.totalErrors++;

        // Log error to audit trail
        await logJobAudit({
            action: 'workflow_cleanup_failed',
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
            description: `Workflow job: ${data.action}`,
            metadata: data.details || {},
            ipAddress: '127.0.0.1',
            timestamp: new Date()
        };

        QueueService.logAudit(auditData);

    } catch (error) {
        logger.error('[Workflow Jobs] Error logging to audit:', error);
        // Don't throw - audit logging failure shouldn't stop the process
    }
};

/**
 * Start all workflow jobs
 */
function startWorkflowJobs() {
    logger.info('[Workflow Jobs] Starting workflow job scheduler...');

    // Process scheduled workflows - configurable (default: every 15 minutes)
    cron.schedule(
        WORKFLOW_JOB_CONFIG.processScheduled.cron,
        () => {
            processScheduledWorkflows().catch(err => {
                logger.error('[Workflow Jobs] Unhandled error in processScheduledWorkflows:', err);
            });
        },
        {
            timezone: WORKFLOW_JOB_CONFIG.processScheduled.timezone
        }
    );
    logger.info(`[Workflow Jobs]  Scheduled workflow job: ${WORKFLOW_JOB_CONFIG.processScheduled.cron} (${WORKFLOW_JOB_CONFIG.processScheduled.timezone})`);

    // Process delay steps - configurable (default: every minute)
    cron.schedule(
        WORKFLOW_JOB_CONFIG.processDelays.cron,
        () => {
            processDelaySteps().catch(err => {
                logger.error('[Workflow Jobs] Unhandled error in processDelaySteps:', err);
            });
        },
        {
            timezone: WORKFLOW_JOB_CONFIG.processDelays.timezone
        }
    );
    logger.info(`[Workflow Jobs]  Delay processing job: ${WORKFLOW_JOB_CONFIG.processDelays.cron} (${WORKFLOW_JOB_CONFIG.processDelays.timezone})`);

    // Process condition checks - configurable (default: every 5 minutes)
    cron.schedule(
        WORKFLOW_JOB_CONFIG.processConditions.cron,
        () => {
            processConditionChecks().catch(err => {
                logger.error('[Workflow Jobs] Unhandled error in processConditionChecks:', err);
            });
        },
        {
            timezone: WORKFLOW_JOB_CONFIG.processConditions.timezone
        }
    );
    logger.info(`[Workflow Jobs]  Condition check job: ${WORKFLOW_JOB_CONFIG.processConditions.cron} (${WORKFLOW_JOB_CONFIG.processConditions.timezone})`);

    // Cleanup - configurable (default: daily at 2 AM)
    cron.schedule(
        WORKFLOW_JOB_CONFIG.cleanup.cron,
        () => {
            cleanupStaleInstances().catch(err => {
                logger.error('[Workflow Jobs] Unhandled error in cleanupStaleInstances:', err);
            });
        },
        {
            timezone: WORKFLOW_JOB_CONFIG.cleanup.timezone
        }
    );
    logger.info(`[Workflow Jobs]  Cleanup job: ${WORKFLOW_JOB_CONFIG.cleanup.cron} (${WORKFLOW_JOB_CONFIG.cleanup.timezone})`);

    logger.info('[Workflow Jobs] All workflow jobs started successfully');
    logger.info('[Workflow Jobs] Configuration:', {
        processScheduled: {
            schedule: WORKFLOW_JOB_CONFIG.processScheduled.cron,
            retries: WORKFLOW_JOB_CONFIG.processScheduled.retries,
            timezone: WORKFLOW_JOB_CONFIG.processScheduled.timezone
        },
        processDelays: {
            schedule: WORKFLOW_JOB_CONFIG.processDelays.cron,
            timezone: WORKFLOW_JOB_CONFIG.processDelays.timezone
        },
        processConditions: {
            schedule: WORKFLOW_JOB_CONFIG.processConditions.cron,
            timezone: WORKFLOW_JOB_CONFIG.processConditions.timezone
        },
        cleanup: {
            schedule: WORKFLOW_JOB_CONFIG.cleanup.cron,
            retentionDays: WORKFLOW_JOB_CONFIG.cleanup.retentionDays,
            timezone: WORKFLOW_JOB_CONFIG.cleanup.timezone
        }
    });
}

/**
 * Stop all jobs (for graceful shutdown)
 */
function stopWorkflowJobs() {
    logger.info('[Workflow Jobs] Stopping workflow jobs...');
    // Jobs will stop automatically when process exits
    // Log final statistics
    logger.info('[Workflow Jobs] Final statistics:', jobStats);
}

/**
 * Manually trigger a specific job (for testing/admin)
 * @param {String} jobName - Job name
 * @param {Object} options - Job options
 * @returns {Promise<Object>} - Job execution result
 */
async function triggerJob(jobName, options = {}) {
    logger.info(`[Workflow Jobs] Manually triggering ${jobName}...`);

    let result;

    try {
        switch (jobName) {
            case 'processScheduled':
                result = await processScheduledWorkflows();
                break;
            case 'processDelays':
                result = await processDelaySteps();
                break;
            case 'processConditions':
                result = await processConditionChecks();
                break;
            case 'cleanup':
                result = await cleanupStaleInstances();
                break;
            case 'all':
                // Run all jobs sequentially
                const scheduledResult = await processScheduledWorkflows();
                const delayResult = await processDelaySteps();
                const conditionResult = await processConditionChecks();
                const cleanupResult = await cleanupStaleInstances();
                result = {
                    processScheduled: scheduledResult,
                    processDelays: delayResult,
                    processConditions: conditionResult,
                    cleanup: cleanupResult
                };
                break;
            default:
                throw new Error(`Unknown job: ${jobName}. Valid options: processScheduled, processDelays, processConditions, cleanup, all`);
        }

        logger.info(`[Workflow Jobs] ${jobName} completed successfully`);
        return { success: true, job: jobName, result };

    } catch (error) {
        logger.error(`[Workflow Jobs] ${jobName} failed:`, error);
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
            processScheduled: {
                running: jobsRunning.processScheduled,
                schedule: WORKFLOW_JOB_CONFIG.processScheduled.cron,
                timezone: WORKFLOW_JOB_CONFIG.processScheduled.timezone,
                retries: WORKFLOW_JOB_CONFIG.processScheduled.retries,
                description: 'Process scheduled workflow templates'
            },
            processDelays: {
                running: jobsRunning.processDelays,
                schedule: WORKFLOW_JOB_CONFIG.processDelays.cron,
                timezone: WORKFLOW_JOB_CONFIG.processDelays.timezone,
                description: 'Resume workflows after delay steps'
            },
            processConditions: {
                running: jobsRunning.processConditions,
                schedule: WORKFLOW_JOB_CONFIG.processConditions.cron,
                timezone: WORKFLOW_JOB_CONFIG.processConditions.timezone,
                description: 'Check conditions for event-triggered workflows'
            },
            cleanup: {
                running: jobsRunning.cleanup,
                schedule: WORKFLOW_JOB_CONFIG.cleanup.cron,
                timezone: WORKFLOW_JOB_CONFIG.cleanup.timezone,
                retentionDays: WORKFLOW_JOB_CONFIG.cleanup.retentionDays,
                description: 'Clean up old workflow instances'
            }
        },
        statistics: jobStats,
        config: WORKFLOW_JOB_CONFIG
    };
}

module.exports = {
    startWorkflowJobs,
    stopWorkflowJobs,
    triggerJob,
    getJobStatus,
    // Export individual functions for testing
    processScheduledWorkflows,
    processDelaySteps,
    processConditionChecks,
    cleanupStaleInstances,
    // Export configuration for reference
    WORKFLOW_JOB_CONFIG
};
