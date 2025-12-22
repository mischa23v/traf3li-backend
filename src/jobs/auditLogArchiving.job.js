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

/**
 * Execute audit log archiving job
 * @returns {Promise<void>}
 */
async function runAuditLogArchiving() {
  console.log('='.repeat(80));
  console.log('AUDIT LOG ARCHIVING JOB STARTED');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('='.repeat(80));

  try {
    // Step 1: Get current stats before archiving
    console.log('\n[1/4] Getting current archiving statistics...');
    const statsBefore = await auditLogArchivingService.getArchivingStats();

    if (statsBefore.success) {
      console.log(`Active logs: ${statsBefore.data.activeLogs}`);
      console.log(`Archived logs: ${statsBefore.data.archivedLogs}`);
      console.log(`Eligible for archiving: ${statsBefore.data.eligibleForArchiving}`);
    }

    // Step 2: Archive old logs
    console.log('\n[2/4] Archiving logs older than 90 days...');
    const archiveResult = await auditLogArchivingService.archiveOldLogs({
      thresholdDays: 90,
      batchSize: 1000,
      dryRun: false,
    });

    if (archiveResult.success) {
      console.log(`Archived: ${archiveResult.archived} logs`);
      console.log(`Deleted from main collection: ${archiveResult.deleted} logs`);
      console.log(`Duration: ${archiveResult.duration}ms`);
    } else {
      console.error(`Archiving failed: ${archiveResult.error}`);
    }

    // Step 3: Verify archive integrity (sample check)
    console.log('\n[3/4] Verifying archive integrity...');
    const verifyResult = await auditLogArchivingService.verifyArchiveIntegrity(100);

    if (verifyResult.success) {
      console.log(`Integrity score: ${verifyResult.integrityScore}%`);
      console.log(`Verified: ${verifyResult.verified}, Failed: ${verifyResult.failed}`);

      if (verifyResult.integrityScore < 95) {
        console.warn('WARNING: Archive integrity below 95%!');
      }
    }

    // Step 4: Get final stats
    console.log('\n[4/4] Getting final statistics...');
    const statsAfter = await auditLogArchivingService.getArchivingStats();

    if (statsAfter.success) {
      console.log(`Active logs: ${statsAfter.data.activeLogs}`);
      console.log(`Archived logs: ${statsAfter.data.archivedLogs}`);
      console.log(`Total logs: ${statsAfter.data.totalLogs}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('AUDIT LOG ARCHIVING JOB COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));

    return {
      success: true,
      archived: archiveResult.archived || 0,
      duration: archiveResult.duration || 0,
      integrityScore: verifyResult.integrityScore || 100,
    };
  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('AUDIT LOG ARCHIVING JOB FAILED');
    console.error(`Error: ${error.message}`);
    console.error('='.repeat(80));
    console.error(error.stack);

    return {
      success: false,
      error: error.message,
    };
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
      console.log('Connected to MongoDB');
      return runAuditLogArchiving();
    })
    .then((result) => {
      console.log('\nJob result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Job failed:', error);
      process.exit(1);
    });
}
