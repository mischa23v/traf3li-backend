/**
 * Audit Log Archiving Job
 *
 * Scheduled job to automatically archive audit logs older than 90 days.
 * This job should run daily during low-traffic hours (e.g., 2 AM).
 *
 * Setup with node-cron:
 * const cron = require('node-cron');
 * const auditArchiveJob = require('./jobs/auditLogArchiving.job');
 *
 * // Run daily at 2 AM
 * cron.schedule('0 2 * * *', auditArchiveJob);
 */

const auditLogArchivingService = require('../services/auditLogArchiving.service');
const logger = require('../utils/logger');
const { acquireLock } = require('../services/distributedLock.service');

/**
 * Execute audit log archiving job
 * @returns {Promise<void>}
 */
async function runAuditLogArchiving() {
  // Acquire distributed lock
  const lock = await acquireLock('audit_log_archiving');

  if (!lock.acquired) {
    logger.info(`[AuditLogArchiving] Archiving already running on another instance (TTL: ${lock.ttlRemaining}s), skipping...`);
    return { skipped: true, reason: 'already_running_distributed' };
  }

  try {
    logger.info('='.repeat(80));
    logger.info('AUDIT LOG ARCHIVING JOB STARTED');
    logger.info(`Timestamp: ${new Date().toISOString()}`);
    logger.info('='.repeat(80));

    try {
    // Step 1: Get current stats before archiving
    logger.info('\n[1/4] Getting current archiving statistics...');
    const statsBefore = await auditLogArchivingService.getArchivingStats();

    if (statsBefore.success) {
      logger.info(`Active logs: ${statsBefore.data.activeLogs}`);
      logger.info(`Archived logs: ${statsBefore.data.archivedLogs}`);
      logger.info(`Eligible for archiving: ${statsBefore.data.eligibleForArchiving}`);
    }

    // Step 2: Archive old logs
    logger.info('\n[2/4] Archiving logs older than 90 days...');
    const archiveResult = await auditLogArchivingService.archiveOldLogs({
      thresholdDays: 90,
      batchSize: 1000,
      dryRun: false,
    });

    if (archiveResult.success) {
      logger.info(`Archived: ${archiveResult.archived} logs`);
      logger.info(`Deleted from main collection: ${archiveResult.deleted} logs`);
      logger.info(`Duration: ${archiveResult.duration}ms`);
    } else {
      logger.error(`Archiving failed: ${archiveResult.error}`);
    }

    // Step 3: Verify archive integrity (sample check)
    logger.info('\n[3/4] Verifying archive integrity...');
    const verifyResult = await auditLogArchivingService.verifyArchiveIntegrity(100);

    if (verifyResult.success) {
      logger.info(`Integrity score: ${verifyResult.integrityScore}%`);
      logger.info(`Verified: ${verifyResult.verified}, Failed: ${verifyResult.failed}`);

      if (verifyResult.integrityScore < 95) {
        logger.warn('WARNING: Archive integrity below 95%!');
      }
    }

    // Step 4: Get final stats
    logger.info('\n[4/4] Getting final statistics...');
    const statsAfter = await auditLogArchivingService.getArchivingStats();

    if (statsAfter.success) {
      logger.info(`Active logs: ${statsAfter.data.activeLogs}`);
      logger.info(`Archived logs: ${statsAfter.data.archivedLogs}`);
      logger.info(`Total logs: ${statsAfter.data.totalLogs}`);
    }

      logger.info('\n' + '='.repeat(80));
      logger.info('AUDIT LOG ARCHIVING JOB COMPLETED SUCCESSFULLY');
      logger.info('='.repeat(80));

      return {
        success: true,
        archived: archiveResult.archived || 0,
        duration: archiveResult.duration || 0,
        integrityScore: verifyResult.integrityScore || 100,
      };
    } catch (error) {
      logger.error('\n' + '='.repeat(80));
      logger.error('AUDIT LOG ARCHIVING JOB FAILED');
      logger.error(`Error: ${error.message}`);
      logger.error('='.repeat(80));
      logger.error(error.stack);

      return {
        success: false,
        error: error.message,
      };
    }
  } finally {
    await lock.release();
  }
}

// Export the job function
module.exports = runAuditLogArchiving;

// Allow running directly from command line
if (require.main === module) {
  const mongoose = require('mongoose');
  const config = require('../configs/database.config');

  mongoose
    .connect(config.mongoURI || process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      logger.info('Connected to MongoDB');
      return runAuditLogArchiving();
    })
    .then((result) => {
      logger.info('\nStandalone job completed:', result);
      // Delay exit to allow async operations to complete
      setTimeout(() => process.exit(result.success ? 0 : 1), 100);
    })
    .catch((error) => {
      logger.error('Standalone job failed:', error);
      // Delay exit to allow async operations to complete
      setTimeout(() => process.exit(1), 100);
    });
}
