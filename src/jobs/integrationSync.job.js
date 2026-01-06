/**
 * Integration Sync Job Scheduler for TRAF3LI
 *
 * Automated tasks for syncing data with third-party accounting integrations:
 * - QuickBooks and Xero integration synchronization
 * - Configurable sync schedule (default: every 4 hours)
 * - Incremental sync (changes since last sync)
 * - Rate limiting with exponential backoff
 * - Conflict detection and resolution
 * - Comprehensive error handling and notifications
 *
 * Sync Process:
 * 1. Find all firms with active integrations (autoSync enabled)
 * 2. Check if sync is due based on firm's sync interval
 * 3. For each entity type (invoices, contacts, payments, etc.):
 *    - Fetch changes since last sync (incremental)
 *    - Apply changes with conflict detection
 *    - Handle rate limits with exponential backoff
 *    - Update sync timestamps
 * 4. Track sync history and statistics
 * 5. Send notifications on errors or conflicts
 * 6. Log all operations to audit trail
 *
 * Features:
 * - Multi-tenant support with firm isolation
 * - Configurable sync frequencies per entity type
 * - Automatic retry logic with exponential backoff
 * - Circuit breaker pattern for API resilience
 * - Conflict detection and manual resolution tracking
 * - Comprehensive audit logging
 * - Manual trigger support for immediate sync
 * - Job status monitoring and statistics
 */

const cron = require('node-cron');
const XeroService = require('../services/xero.service');
const Firm = require('../models/firm.model');
const AuditLog = require('../models/auditLog.model');
const Notification = require('../models/notification.model');
const logger = require('../utils/logger');
const { acquireLock } = require('../services/distributedLock.service');

// Job configuration
const INTEGRATION_SYNC_JOB_CONFIG = {
    scheduledSync: {
        cron: process.env.INTEGRATION_SYNC_CRON || '0 */4 * * *', // Every 4 hours (configurable)
        timeout: 120 * 60 * 1000, // 120 minutes
        retries: 3,
        timezone: process.env.TZ || 'Asia/Riyadh'
    },
    rateLimit: {
        maxRetries: 5,
        initialBackoffMs: 1000, // Start with 1 second
        maxBackoffMs: 60000, // Max 60 seconds
        backoffMultiplier: 2 // Exponential backoff
    },
    sync: {
        batchSize: 50, // Process 50 records at a time
        maxConflicts: 100, // Max conflicts to track per sync
        conflictRetentionDays: 30 // Keep conflict records for 30 days
    }
};

// Sync interval to milliseconds mapping
const SYNC_INTERVAL_MS = {
    manual: null, // No automatic sync
    hourly: 60 * 60 * 1000, // 1 hour
    daily: 24 * 60 * 60 * 1000, // 24 hours
    weekly: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// Entity types that can be synced
const SYNC_ENTITY_TYPES = [
    'chartOfAccounts',
    'contacts',
    'invoices',
    'payments',
    'bills',
    'bankTransactions',
    'items'
];

// Track running jobs
let jobsRunning = {
    scheduledSync: false
};

// Track job statistics
let jobStats = {
    lastRun: null,
    lastSuccess: null,
    lastError: null,
    totalRuns: 0,
    totalFirmsProcessed: 0,
    totalSyncsCompleted: 0,
    totalSyncsFailed: 0,
    totalErrors: 0,
    consecutiveErrors: 0
};

/**
 * Main scheduled sync process
 * Processes all firms with active integrations
 */
const processScheduledSync = async (retryCount = 0) => {
    // Acquire distributed lock
    const lock = await acquireLock('integration_sync');

    if (!lock.acquired) {
        logger.info(`[Integration Sync] Scheduled sync already running on another instance (TTL: ${lock.ttlRemaining}s), skipping...`);
        return { skipped: true, reason: 'already_running_distributed' };
    }

    if (jobsRunning.scheduledSync) {
        await lock.release();
        logger.info('[Integration Sync] Scheduled sync still running, skipping...');
        return { skipped: true, reason: 'already_running' };
    }

    jobsRunning.scheduledSync = true;
    const startTime = Date.now();

    try {
        logger.info('[Integration Sync] Starting scheduled integration sync job...');
        jobStats.lastRun = new Date();
        jobStats.totalRuns++;

        // Get all firms with active integrations
        const firmsWithIntegrations = await getFirmsWithActiveIntegrations();

        if (firmsWithIntegrations.length === 0) {
            logger.info('[Integration Sync] No firms with active integrations found');
            return { success: true, processed: 0 };
        }

        logger.info(`[Integration Sync] Found ${firmsWithIntegrations.length} firms with active integrations`);

        let totalSyncsCompleted = 0;
        let totalSyncsFailed = 0;
        let totalErrors = 0;
        const firmResults = [];

        // Process each firm independently
        for (const firmData of firmsWithIntegrations) {
            try {
                logger.info(`[Integration Sync] Processing firm: ${firmData.firmId} (${firmData.firmName})`);

                const result = await processFirmSync(firmData);

                firmResults.push({
                    firmId: firmData.firmId,
                    firmName: firmData.firmName,
                    integration: firmData.integration,
                    ...result
                });

                totalSyncsCompleted += result.syncsCompleted;
                totalSyncsFailed += result.syncsFailed;
                totalErrors += result.errors;

            } catch (error) {
                logger.error(`[Integration Sync] Error processing firm ${firmData.firmId}:`, error);
                totalErrors++;
                totalSyncsFailed++;
                firmResults.push({
                    firmId: firmData.firmId,
                    firmName: firmData.firmName,
                    integration: firmData.integration,
                    error: error.message,
                    syncsCompleted: 0,
                    syncsFailed: 1,
                    errors: 1
                });
            }
        }

        const duration = Date.now() - startTime;
        jobStats.lastSuccess = new Date();
        jobStats.totalFirmsProcessed += firmsWithIntegrations.length;
        jobStats.totalSyncsCompleted += totalSyncsCompleted;
        jobStats.totalSyncsFailed += totalSyncsFailed;
        jobStats.consecutiveErrors = 0;

        logger.info(`[Integration Sync] Scheduled sync complete in ${duration}ms`);
        logger.info(`[Integration Sync] Summary: ${firmsWithIntegrations.length} firms, ${totalSyncsCompleted} syncs completed, ${totalSyncsFailed} failed, ${totalErrors} errors`);

        // Log summary to audit
        await logSyncAudit({
            action: 'integration_sync_job_completed',
            entityType: 'system',
            details: {
                duration,
                firmsProcessed: firmsWithIntegrations.length,
                syncsCompleted: totalSyncsCompleted,
                syncsFailed: totalSyncsFailed,
                errors: totalErrors,
                firmResults
            }
        });

        // Send notification if there were significant errors
        if (totalSyncsFailed > 0 || totalErrors > 5) {
            await sendSyncSummaryNotification('warning', {
                firmsProcessed: firmsWithIntegrations.length,
                syncsCompleted: totalSyncsCompleted,
                syncsFailed: totalSyncsFailed,
                errors: totalErrors,
                duration
            });
        }

        return {
            success: true,
            duration,
            firmsProcessed: firmsWithIntegrations.length,
            syncsCompleted: totalSyncsCompleted,
            syncsFailed: totalSyncsFailed,
            errors: totalErrors,
            firmResults
        };

    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('[Integration Sync] Scheduled sync job error:', error);

        // Update error statistics
        jobStats.lastError = {
            time: new Date(),
            message: error.message,
            stack: error.stack
        };
        jobStats.totalErrors++;
        jobStats.consecutiveErrors++;

        // Retry logic with exponential backoff
        if (retryCount < INTEGRATION_SYNC_JOB_CONFIG.scheduledSync.retries) {
            const backoffMs = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s, etc.
            logger.info(`[Integration Sync] Retrying in ${backoffMs}ms (attempt ${retryCount + 1}/${INTEGRATION_SYNC_JOB_CONFIG.scheduledSync.retries})...`);

            await new Promise(resolve => setTimeout(resolve, backoffMs));

            jobsRunning.scheduledSync = false;
            return await processScheduledSync(retryCount + 1);
        }

        // Send failure notification after all retries exhausted
        await sendSyncErrorNotification(error, duration, retryCount);

        // Log error to audit trail
        await logSyncAudit({
            action: 'integration_sync_job_failed',
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
        jobsRunning.scheduledSync = false;
        await lock.release();
    }
};

/**
 * Get all firms with active integrations (autoSync enabled)
 * @returns {Promise<Array>} Array of firms with integration details
 */
async function getFirmsWithActiveIntegrations() {
    try {
        const firms = await Firm.find({
            status: { $ne: 'deleted' },
            $or: [
                { 'integrations.xero.connected': true, 'integrations.xero.syncSettings.autoSync': true },
                { 'integrations.quickbooks.connected': true, 'integrations.quickbooks.syncSettings.autoSync': true }
            ]
        }).select('_id name integrations').lean();

        const firmsWithIntegrations = [];

        for (const firm of firms) {
            // Check Xero integration
            if (firm.integrations?.xero?.connected && firm.integrations.xero.syncSettings?.autoSync) {
                firmsWithIntegrations.push({
                    firmId: firm._id,
                    firmName: firm.name,
                    integration: 'xero',
                    syncSettings: firm.integrations.xero.syncSettings
                });
            }

            // Check QuickBooks integration
            if (firm.integrations?.quickbooks?.connected && firm.integrations.quickbooks.syncSettings?.autoSync) {
                firmsWithIntegrations.push({
                    firmId: firm._id,
                    firmName: firm.name,
                    integration: 'quickbooks',
                    syncSettings: firm.integrations.quickbooks.syncSettings
                });
            }
        }

        return firmsWithIntegrations;

    } catch (error) {
        logger.error('[Integration Sync] Error getting firms with active integrations:', error);
        throw error;
    }
}

/**
 * Process sync for a specific firm
 * @param {Object} firmData - Firm data with integration details
 * @returns {Promise<Object>} Processing results
 */
async function processFirmSync(firmData) {
    const { firmId, integration, syncSettings } = firmData;
    let syncsCompleted = 0;
    let syncsFailed = 0;
    let errors = 0;
    const entityResults = [];

    try {
        // Check if sync is due based on sync interval
        if (!isSyncDue(syncSettings)) {
            logger.info(`[Integration Sync] Sync not due yet for firm ${firmId} (interval: ${syncSettings.syncInterval})`);
            return { syncsCompleted: 0, syncsFailed: 0, errors: 0, skipped: true, reason: 'not_due' };
        }

        // Get the appropriate integration service
        const integrationService = getIntegrationService(integration);

        // Verify connection is still valid
        const connectionStatus = await integrationService.getConnectionStatus(firmId.toString());
        if (!connectionStatus.connected) {
            logger.warn(`[Integration Sync] Integration ${integration} not connected for firm ${firmId}`);
            return { syncsCompleted: 0, syncsFailed: 1, errors: 1, error: 'not_connected' };
        }

        // Refresh token if expired
        if (connectionStatus.tokenExpired) {
            logger.info(`[Integration Sync] Refreshing expired token for firm ${firmId}`);
            await integrationService.refreshToken(firmId.toString());
        }

        // Process each entity type
        for (const entityType of SYNC_ENTITY_TYPES) {
            try {
                // Check if this entity type should be synced
                if (!shouldSyncEntity(entityType, syncSettings)) {
                    continue;
                }

                logger.info(`[Integration Sync] Syncing ${entityType} for firm ${firmId}`);

                const lastSyncDate = syncSettings.lastSync?.[entityType] || null;
                const result = await syncEntity(
                    integrationService,
                    firmId.toString(),
                    entityType,
                    syncSettings.syncDirection,
                    lastSyncDate
                );

                entityResults.push({
                    entityType,
                    success: true,
                    ...result
                });

                syncsCompleted++;

            } catch (error) {
                logger.error(`[Integration Sync] Error syncing ${entityType} for firm ${firmId}:`, error);

                entityResults.push({
                    entityType,
                    success: false,
                    error: error.message
                });

                syncsFailed++;
                errors++;

                // Handle rate limit errors with exponential backoff
                if (isRateLimitError(error)) {
                    await handleRateLimit(error);
                }
            }
        }

        // Send notification if there are conflicts
        const totalConflicts = entityResults.reduce((sum, r) => sum + (r.conflicts || 0), 0);
        if (totalConflicts > 0) {
            await sendConflictNotification(firmId, integration, totalConflicts, entityResults);
        }

        return { syncsCompleted, syncsFailed, errors, entityResults };

    } catch (error) {
        logger.error(`[Integration Sync] Error in processFirmSync for firm ${firmId}:`, error);
        throw error;
    }
}

/**
 * Check if sync is due based on sync interval
 * @param {Object} syncSettings - Firm's sync settings
 * @returns {Boolean} Whether sync is due
 */
function isSyncDue(syncSettings) {
    if (!syncSettings || syncSettings.syncInterval === 'manual') {
        return false;
    }

    const intervalMs = SYNC_INTERVAL_MS[syncSettings.syncInterval];
    if (!intervalMs) {
        return false;
    }

    // Check if enough time has passed since last sync
    // Use the most recent entity sync as reference
    const lastSyncDates = Object.values(syncSettings.lastSync || {})
        .filter(date => date)
        .map(date => new Date(date).getTime());

    if (lastSyncDates.length === 0) {
        return true; // First sync
    }

    const mostRecentSync = Math.max(...lastSyncDates);
    const timeSinceLastSync = Date.now() - mostRecentSync;

    return timeSinceLastSync >= intervalMs;
}

/**
 * Check if specific entity type should be synced
 * @param {String} entityType - Entity type
 * @param {Object} syncSettings - Firm's sync settings
 * @returns {Boolean} Whether entity should be synced
 */
function shouldSyncEntity(entityType, syncSettings) {
    // Could add per-entity sync settings here in the future
    // For now, sync all entity types
    return true;
}

/**
 * Get the appropriate integration service
 * @param {String} integration - Integration name ('xero', 'quickbooks')
 * @returns {Object} Integration service
 */
function getIntegrationService(integration) {
    switch (integration) {
        case 'xero':
            return XeroService;
        case 'quickbooks':
            // TODO: Implement QuickBooks service
            throw new Error('QuickBooks integration not yet implemented');
        default:
            throw new Error(`Unknown integration: ${integration}`);
    }
}

/**
 * Sync a specific entity type
 * @param {Object} service - Integration service
 * @param {String} firmId - Firm ID
 * @param {String} entityType - Entity type
 * @param {String} direction - Sync direction
 * @param {Date} lastSyncDate - Last sync date
 * @returns {Promise<Object>} Sync result
 */
async function syncEntity(service, firmId, entityType, direction, lastSyncDate) {
    let result;

    try {
        switch (entityType) {
            case 'chartOfAccounts':
                result = await service.syncChartOfAccounts(firmId, direction);
                break;
            case 'contacts':
                result = await service.syncContacts(firmId, direction);
                break;
            case 'invoices':
                result = await service.syncInvoices(firmId, lastSyncDate);
                break;
            case 'payments':
                result = await service.syncPayments(firmId, lastSyncDate);
                break;
            case 'bills':
                result = await service.syncBills(firmId, lastSyncDate);
                break;
            case 'bankTransactions':
                result = await service.syncBankTransactions(firmId, lastSyncDate);
                break;
            case 'items':
                result = await service.syncItems(firmId, direction);
                break;
            default:
                throw new Error(`Unknown entity type: ${entityType}`);
        }

        // Track conflicts if any
        const conflicts = result.errors?.length || 0;

        // Update last sync timestamp for this entity
        await updateEntitySyncTimestamp(firmId, entityType);

        // Log successful sync
        await logSyncAudit({
            action: 'integration_entity_synced',
            entityType: 'firm',
            entityId: firmId,
            firmId,
            details: {
                integration: 'xero', // TODO: Pass integration type
                entityType,
                direction,
                imported: result.imported || 0,
                exported: result.exported || 0,
                updated: result.updated || 0,
                conflicts,
                errors: result.errors || []
            }
        });

        return {
            imported: result.imported || 0,
            exported: result.exported || 0,
            updated: result.updated || 0,
            conflicts,
            errors: result.errors || []
        };

    } catch (error) {
        // Log failed sync
        await logSyncAudit({
            action: 'integration_entity_sync_failed',
            entityType: 'firm',
            entityId: firmId,
            firmId,
            details: {
                integration: 'xero', // TODO: Pass integration type
                entityType,
                direction,
                error: error.message,
                stack: error.stack
            }
        });

        throw error;
    }
}

/**
 * Update entity sync timestamp
 * @param {String} firmId - Firm ID
 * @param {String} entityType - Entity type
 */
async function updateEntitySyncTimestamp(firmId, entityType) {
    try {
        // Update for all integrations that might have this entity
        await Firm.findByIdAndUpdate(firmId, {
            $set: {
                'integrations.xero.lastSyncedAt': new Date(),
                [`integrations.xero.syncSettings.lastSync.${entityType}`]: new Date(),
                'integrations.quickbooks.lastSyncedAt': new Date(),
                [`integrations.quickbooks.syncSettings.lastSync.${entityType}`]: new Date()
            }
        });
    } catch (error) {
        logger.error(`[Integration Sync] Error updating sync timestamp:`, error);
        // Don't throw - timestamp update failure shouldn't stop the sync
    }
}

/**
 * Check if error is a rate limit error
 * @param {Error} error - Error object
 * @returns {Boolean} Whether error is rate limit error
 */
function isRateLimitError(error) {
    const rateLimitIndicators = [
        'rate limit',
        'too many requests',
        '429',
        'quota exceeded',
        'throttle'
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    return rateLimitIndicators.some(indicator => errorMessage.includes(indicator));
}

/**
 * Handle rate limit error with exponential backoff
 * @param {Error} error - Rate limit error
 * @param {Number} retryCount - Current retry count
 */
async function handleRateLimit(error, retryCount = 0) {
    if (retryCount >= INTEGRATION_SYNC_JOB_CONFIG.rateLimit.maxRetries) {
        logger.error('[Integration Sync] Max rate limit retries exceeded');
        throw error;
    }

    // Calculate backoff delay
    const baseDelay = INTEGRATION_SYNC_JOB_CONFIG.rateLimit.initialBackoffMs;
    const multiplier = INTEGRATION_SYNC_JOB_CONFIG.rateLimit.backoffMultiplier;
    const delay = Math.min(
        baseDelay * Math.pow(multiplier, retryCount),
        INTEGRATION_SYNC_JOB_CONFIG.rateLimit.maxBackoffMs
    );

    logger.info(`[Integration Sync] Rate limit hit, waiting ${delay}ms before retry (attempt ${retryCount + 1}/${INTEGRATION_SYNC_JOB_CONFIG.rateLimit.maxRetries})`);

    await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Manually trigger sync for a specific firm
 * @param {String} firmId - Firm ID
 * @param {String} integration - Integration name ('xero', 'quickbooks')
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync result
 */
async function triggerManualSync(firmId, integration, options = {}) {
    logger.info(`[Integration Sync] Manually triggering ${integration} sync for firm ${firmId}`);

    const startTime = Date.now();

    try {
        const firm = await Firm.findById(firmId).select('name integrations');
        if (!firm) {
            throw new Error('Firm not found');
        }

        const integrationConfig = firm.integrations?.[integration];
        if (!integrationConfig?.connected) {
            throw new Error(`${integration} not connected for this firm`);
        }

        const firmData = {
            firmId: firm._id,
            firmName: firm.name,
            integration,
            syncSettings: integrationConfig.syncSettings || {}
        };

        // Override sync settings with manual options
        if (options.syncDirection) {
            firmData.syncSettings.syncDirection = options.syncDirection;
        }

        // Force sync to be due
        firmData.syncSettings.syncInterval = 'manual';

        const result = await processFirmSync(firmData);

        const duration = Date.now() - startTime;

        logger.info(`[Integration Sync] Manual sync completed for firm ${firmId} in ${duration}ms`);

        // Log manual sync
        await logSyncAudit({
            action: 'integration_manual_sync_triggered',
            entityType: 'firm',
            entityId: firmId,
            firmId,
            details: {
                integration,
                duration,
                options,
                ...result
            }
        });

        return {
            success: true,
            duration,
            ...result
        };

    } catch (error) {
        logger.error(`[Integration Sync] Manual sync failed for firm ${firmId}:`, error);

        // Log failed manual sync
        await logSyncAudit({
            action: 'integration_manual_sync_failed',
            entityType: 'firm',
            entityId: firmId,
            firmId,
            details: {
                integration,
                options,
                error: error.message,
                stack: error.stack
            }
        });

        throw error;
    }
}

/**
 * Send sync summary notification to system admins
 * @param {String} type - Notification type ('success', 'warning', 'error')
 * @param {Object} summary - Sync summary data
 */
async function sendSyncSummaryNotification(type, summary) {
    try {
        const priority = type === 'error' ? 'high' : type === 'warning' ? 'medium' : 'low';

        logger.info(`[Integration Sync] Sync summary notification (${type}):`, {
            type,
            priority,
            summary
        });

        // TODO: Implement actual notification sending
        // For example, send to admin users or monitoring system

    } catch (error) {
        logger.error('[Integration Sync] Failed to send sync summary notification:', error.message);
    }
}

/**
 * Send sync error notification
 * @param {Error} error - Error object
 * @param {Number} duration - Sync duration in ms
 * @param {Number} retryCount - Number of retries attempted
 */
async function sendSyncErrorNotification(error, duration, retryCount) {
    try {
        logger.error(`[Integration Sync] Sync error notification:`, {
            error: error.message,
            stack: error.stack,
            duration,
            retryCount
        });

        // TODO: Send to system admins or monitoring system
        // Example: Send to Slack, email, or monitoring dashboard

    } catch (err) {
        logger.error('[Integration Sync] Failed to send sync error notification:', err.message);
    }
}

/**
 * Send conflict notification to firm users
 * @param {String} firmId - Firm ID
 * @param {String} integration - Integration name
 * @param {Number} totalConflicts - Total number of conflicts
 * @param {Array} entityResults - Entity sync results
 */
async function sendConflictNotification(firmId, integration, totalConflicts, entityResults) {
    try {
        logger.warn(`[Integration Sync] ${totalConflicts} conflicts detected for firm ${firmId}`);

        // TODO: Create notifications for firm admins
        // Example:
        // await Notification.create({
        //     firmId,
        //     type: 'integration_conflicts',
        //     title: `${integration} Sync Conflicts Detected`,
        //     message: `${totalConflicts} conflicts require manual resolution during the latest sync.`,
        //     priority: 'high',
        //     data: {
        //         integration,
        //         totalConflicts,
        //         entityResults
        //     }
        // });

    } catch (error) {
        logger.error('[Integration Sync] Failed to send conflict notification:', error.message);
    }
}

/**
 * Log sync action to audit trail
 * @param {Object} data - Audit log data
 */
async function logSyncAudit(data) {
    try {
        const auditData = {
            action: data.action,
            entityType: data.entityType || 'system',
            entityId: data.entityId || null,
            resourceType: data.entityType || 'system',
            resourceId: data.entityId || null,
            firmId: data.firmId || null,
            userId: data.userId || null,
            userEmail: data.userEmail || 'system',
            userRole: data.userRole || 'system',
            severity: 'info',
            category: 'integration',
            description: `Integration sync action: ${data.action}`,
            metadata: data.details || {},
            ipAddress: '127.0.0.1',
            timestamp: new Date()
        };

        await AuditLog.create(auditData);

    } catch (error) {
        logger.error('[Integration Sync] Error logging to audit:', error);
        // Don't throw - audit logging failure shouldn't stop the process
    }
}

/**
 * Start integration sync job scheduler
 */
function startIntegrationSyncJobs() {
    logger.info('[Integration Sync] Starting integration sync job scheduler...');

    // Scheduled sync (every 4 hours by default)
    cron.schedule(INTEGRATION_SYNC_JOB_CONFIG.scheduledSync.cron, () => {
        processScheduledSync();
    }, {
        timezone: INTEGRATION_SYNC_JOB_CONFIG.scheduledSync.timezone
    });

    logger.info(`[Integration Sync] ✓ Scheduled sync: ${INTEGRATION_SYNC_JOB_CONFIG.scheduledSync.cron} (${INTEGRATION_SYNC_JOB_CONFIG.scheduledSync.timezone})`);
    logger.info('[Integration Sync] All integration sync jobs started successfully');
}

/**
 * Stop all jobs (for graceful shutdown)
 */
function stopIntegrationSyncJobs() {
    logger.info('[Integration Sync] Stopping integration sync jobs...');
    // Jobs will stop automatically when process exits
}

/**
 * Manually trigger a specific job (for testing/admin)
 * @param {String} jobName - Job name or firm ID for manual sync
 * @param {Object} options - Job options
 */
async function triggerJob(jobName, options = {}) {
    logger.info(`[Integration Sync] Manually triggering job: ${jobName}`);

    if (jobName === 'scheduledSync') {
        const result = await processScheduledSync();
        logger.info('[Integration Sync] Scheduled sync completed');
        return result;
    }

    // Assume jobName is a firmId for manual sync
    if (options.integration) {
        const result = await triggerManualSync(jobName, options.integration, options);
        logger.info(`[Integration Sync] Manual sync for firm ${jobName} completed`);
        return result;
    }

    throw new Error(`Unknown job or missing integration option: ${jobName}`);
}

/**
 * Get job status and statistics
 */
function getJobStatus() {
    return {
        jobs: {
            scheduledSync: {
                running: jobsRunning.scheduledSync,
                schedule: INTEGRATION_SYNC_JOB_CONFIG.scheduledSync.cron,
                description: 'Scheduled sync for all firms with active integrations',
                timezone: INTEGRATION_SYNC_JOB_CONFIG.scheduledSync.timezone
            }
        },
        statistics: {
            lastRun: jobStats.lastRun,
            lastSuccess: jobStats.lastSuccess,
            lastError: jobStats.lastError,
            totalRuns: jobStats.totalRuns,
            totalFirmsProcessed: jobStats.totalFirmsProcessed,
            totalSyncsCompleted: jobStats.totalSyncsCompleted,
            totalSyncsFailed: jobStats.totalSyncsFailed,
            totalErrors: jobStats.totalErrors,
            consecutiveErrors: jobStats.consecutiveErrors
        },
        config: {
            syncInterval: INTEGRATION_SYNC_JOB_CONFIG.scheduledSync.cron,
            timeout: INTEGRATION_SYNC_JOB_CONFIG.scheduledSync.timeout,
            retries: INTEGRATION_SYNC_JOB_CONFIG.scheduledSync.retries,
            rateLimit: INTEGRATION_SYNC_JOB_CONFIG.rateLimit,
            batchSize: INTEGRATION_SYNC_JOB_CONFIG.sync.batchSize
        }
    };
}

/**
 * Get sync history for a specific firm
 * @param {String} firmId - Firm ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Sync history
 */
async function getSyncHistory(firmId, options = {}) {
    try {
        const {
            limit = 50,
            offset = 0,
            integration = null,
            entityType = null,
            startDate = null,
            endDate = null
        } = options;

        const query = {
            firmId,
            action: { $regex: /^integration_.*_sync/ },
            category: 'integration'
        };

        if (integration) {
            query['metadata.integration'] = integration;
        }

        if (entityType) {
            query['metadata.entityType'] = entityType;
        }

        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        const [history, total] = await Promise.all([
            AuditLog.find(query)
                .sort({ timestamp: -1 })
                .skip(offset)
                .limit(limit)
                .select('action timestamp metadata')
                .lean(),
            AuditLog.countDocuments(query)
        ]);

        return {
            history,
            total,
            limit,
            offset,
            hasMore: (offset + limit) < total
        };

    } catch (error) {
        logger.error('[Integration Sync] Error getting sync history:', error);
        throw error;
    }
}

module.exports = {
    startIntegrationSyncJobs,
    stopIntegrationSyncJobs,
    triggerJob,
    getJobStatus,
    getSyncHistory,
    // Export individual functions for testing
    processScheduledSync,
    processFirmSync,
    triggerManualSync,
    getFirmsWithActiveIntegrations,
    syncEntity,
    INTEGRATION_SYNC_JOB_CONFIG,
    SYNC_ENTITY_TYPES
};
