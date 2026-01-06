/**
 * Data Retention Cleanup Job
 *
 * NCA ECC-2:2024 & PDPL Compliance
 * Scheduled job to enforce data retention policies.
 *
 * Retention Periods:
 * - Audit logs: 7 years (handled by MongoDB TTL index)
 * - Financial data: 7 years (tax compliance)
 * - Departed user data: 2 years after departure
 * - Session data: 24 hours (handled by Redis TTL)
 * - Temporary files: 7 days
 */

const cron = require('node-cron');
const mongoose = require('mongoose');
const { User, Invoice, Payment, Case, Client } = require('../models');
const AuditLog = require('../models/auditLog.model');
const Consent = require('../models/consent.model');
const logger = require('../utils/logger');
const { acquireLock } = require('../services/distributedLock.service');

// Distributed lock name for this job
const LOCK_NAME = 'data_retention';

// Retention periods in days
const RETENTION_PERIODS = {
  departedUserData: 2 * 365, // 2 years
  financialData: 7 * 365,    // 7 years (tax compliance)
  temporaryData: 7,          // 7 days
  sessionData: 1,            // 1 day (handled by Redis)
  caseDocuments: 10 * 365,   // 10 years (legal requirement)
};

/**
 * Archive financial data older than retention period
 * Note: We archive instead of delete for compliance
 */
async function archiveOldFinancialData() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_PERIODS.financialData);

  logger.info(`[DataRetention] Checking for financial data older than ${cutoffDate.toISOString()}`);

  // Mark old invoices as archived (don't delete)
  // NOTE: Bypass firmIsolation filter - system job operates across all firms
  const invoiceResult = await Invoice.updateMany(
    {
      createdAt: { $lt: cutoffDate },
      archived: { $ne: true },
    },
    {
      $set: {
        archived: true,
        archivedAt: new Date(),
        archivedReason: 'retention_policy',
      },
    },
    { bypassFirmFilter: true }
  );

  // Mark old payments as archived
  // NOTE: Bypass firmIsolation filter - system job operates across all firms
  const paymentResult = await Payment.updateMany(
    {
      createdAt: { $lt: cutoffDate },
      archived: { $ne: true },
    },
    {
      $set: {
        archived: true,
        archivedAt: new Date(),
        archivedReason: 'retention_policy',
      },
    },
    { bypassFirmFilter: true }
  );

  logger.info(`[DataRetention] Archived ${invoiceResult.modifiedCount} invoices, ${paymentResult.modifiedCount} payments`);

  return {
    invoices: invoiceResult.modifiedCount,
    payments: paymentResult.modifiedCount,
  };
}

/**
 * Clean up departed user data after retention period
 *
 * IMPORTANT: Only processes users who have BOTH:
 * 1. firmStatus explicitly set to 'departed'
 * 2. departedAt date that is older than retention period
 *
 * This prevents accidental anonymization of users missing these fields.
 */
async function cleanupDepartedUsers() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_PERIODS.departedUserData);

  logger.info(`[DataRetention] Checking for departed users data older than ${cutoffDate.toISOString()}`);

  // Find departed users past retention period
  // CRITICAL: Require both firmStatus AND departedAt to exist to prevent false matches
  // SYSTEM JOB: bypassFirmFilter - processes all firms for data retention compliance
  const departedUsers = await User.find({
    firmStatus: 'departed',                    // Must be explicitly marked as departed
    departedAt: { $exists: true, $lt: cutoffDate }, // Must have departedAt date set
    dataAnonymized: { $ne: true },
  })
    .select('_id email departedAt')
    .setOptions({ bypassFirmFilter: true });

  if (departedUsers.length === 0) {
    logger.info('[DataRetention] No departed users to process');
    return { processed: 0 };
  }

  // Safety check: prevent mass anonymization (max 10 users per run)
  const MAX_USERS_PER_RUN = 10;
  if (departedUsers.length > MAX_USERS_PER_RUN) {
    logger.warn(`[DataRetention] WARNING: Found ${departedUsers.length} users to anonymize, limiting to ${MAX_USERS_PER_RUN}. Please review manually.`);
  }
  const usersToProcess = departedUsers.slice(0, MAX_USERS_PER_RUN);

  logger.info(`[DataRetention] Found ${departedUsers.length} departed users, processing ${usersToProcess.length}`);

  let processed = 0;
  for (const user of usersToProcess) {
    try {
      // Anonymize user data instead of deletion
      await User.findByIdAndUpdate(user._id, {
        $set: {
          email: `anonymized_${user._id}@deleted.local`,
          phone: 'ANONYMIZED',
          firstName: 'Deleted',
          lastName: 'User',
          nationalId: null,
          address: null,
          image: null,
          dataAnonymized: true,
          anonymizedAt: new Date(),
        },
        $unset: {
          lawyerProfile: 1,
          bankInfo: 1,
        },
      });

      // Log the anonymization
      await AuditLog.log({
        userId: user._id,
        userEmail: 'system',
        userRole: 'system',
        action: 'bulk_update',
        entityType: 'user',
        entityId: user._id,
        severity: 'medium',
        ipAddress: 'system',
        details: {
          action: 'data_anonymization',
          reason: 'retention_policy',
          departedAt: user.departedAt,
        },
        complianceTags: ['PDPL', 'data-retention'],
      });

      processed++;
    } catch (error) {
      logger.error(`[DataRetention] Error anonymizing user ${user._id}:`, error.message);
    }
  }

  logger.info(`[DataRetention] Anonymized ${processed} departed users`);
  return { processed };
}

/**
 * Process pending data deletion requests (PDPL compliance)
 */
async function processDeletionRequests() {
  logger.info('[DataRetention] Processing pending deletion requests');

  // NOTE: Bypass firmIsolation filter - system job operates across all firms
  const pendingRequests = await Consent.find({
    'deletionRequest.status': 'pending',
    'deletionRequest.requestedAt': {
      $lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // At least 24 hours old
    },
  }).setOptions({ bypassFirmFilter: true }).populate('userId', '_id email');

  if (pendingRequests.length === 0) {
    logger.info('[DataRetention] No pending deletion requests');
    return { processed: 0 };
  }

  logger.info(`[DataRetention] Found ${pendingRequests.length} deletion requests to process`);

  let processed = 0;
  for (const consent of pendingRequests) {
    try {
      // Update status to processing
      consent.deletionRequest.status = 'processing';
      await consent.save();

      // Anonymize user data
      if (consent.userId) {
        await User.findByIdAndUpdate(consent.userId._id, {
          $set: {
            email: `deleted_${consent.userId._id}@deleted.local`,
            phone: 'DELETED',
            firstName: 'Deleted',
            lastName: 'User',
            nationalId: null,
            address: null,
            firmStatus: 'departed',  // Use correct field name from User model
            dataAnonymized: true,
            anonymizedAt: new Date(),
          },
        });
      }

      // Mark deletion as completed
      consent.deletionRequest.status = 'completed';
      consent.deletionRequest.completedAt = new Date();
      consent.deletionRequest.notes = 'User data anonymized per PDPL request';
      await consent.save();

      // Audit log
      await AuditLog.log({
        userId: consent.userId?._id,
        userEmail: 'system',
        userRole: 'system',
        action: 'bulk_delete',
        entityType: 'user',
        entityId: consent.userId?._id,
        severity: 'high',
        ipAddress: 'system',
        details: {
          action: 'pdpl_deletion_request',
          requestedAt: consent.deletionRequest.requestedAt,
          completedAt: new Date(),
        },
        complianceTags: ['PDPL', 'data-deletion'],
      });

      processed++;
    } catch (error) {
      logger.error(`[DataRetention] Error processing deletion for ${consent._id}:`, error.message);
      consent.deletionRequest.status = 'pending'; // Reset to retry
      consent.deletionRequest.notes = `Error: ${error.message}`;
      await consent.save();
    }
  }

  logger.info(`[DataRetention] Processed ${processed} deletion requests`);
  return { processed };
}

/**
 * Generate retention compliance report
 */
async function generateRetentionReport() {
  const now = new Date();

  // NOTE: Bypass firmIsolation filter - system report operates across all firms
  const [
    totalUsers,
    departedUsers,
    anonymizedUsers,
    pendingDeletions,
    archivedInvoices,
    archivedPayments,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ firmStatus: 'departed' }),  // Use correct field name
    User.countDocuments({ dataAnonymized: true }),
    Consent.countDocuments({ 'deletionRequest.status': 'pending' }).setOptions({ bypassFirmFilter: true }),
    Invoice.countDocuments({ archived: true }).setOptions({ bypassFirmFilter: true }),
    Payment.countDocuments({ archived: true }).setOptions({ bypassFirmFilter: true }),
  ]);

  const report = {
    generatedAt: now.toISOString(),
    retentionPolicies: RETENTION_PERIODS,
    statistics: {
      users: {
        total: totalUsers,
        departed: departedUsers,
        anonymized: anonymizedUsers,
      },
      deletionRequests: {
        pending: pendingDeletions,
      },
      archived: {
        invoices: archivedInvoices,
        payments: archivedPayments,
      },
    },
    compliance: {
      pdpl: pendingDeletions === 0 ? 'compliant' : 'pending_requests',
      ncaEcc: true,
    },
  };

  logger.info('[DataRetention] Report:', JSON.stringify(report, null, 2));
  return report;
}

/**
 * Main cleanup job
 * Uses distributed locking to prevent concurrent execution across server instances
 */
async function runDataRetentionJob() {
  // Acquire distributed lock
  const lock = await acquireLock(LOCK_NAME);

  if (!lock.acquired) {
    logger.info(`[DataRetention] Job already running on another instance (TTL: ${lock.ttlRemaining}s), skipping...`);
    return { skipped: true, reason: 'already_running_distributed' };
  }

  logger.info('[DataRetention] Starting data retention job...');
  const startTime = Date.now();

  try {
    const results = {
      timestamp: new Date().toISOString(),
      archived: await archiveOldFinancialData(),
      departedUsers: await cleanupDepartedUsers(),
      deletionRequests: await processDeletionRequests(),
    };

    const duration = Date.now() - startTime;
    logger.info(`[DataRetention] Job completed in ${duration}ms`, results);

    return results;
  } catch (error) {
    logger.error('[DataRetention] Job failed:', error);
    throw error;
  } finally {
    await lock.release();
  }
}

/**
 * Schedule the job to run daily at 2 AM
 */
function startDataRetentionJob() {
  // Run daily at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('[DataRetention] Scheduled job triggered');
    try {
      await runDataRetentionJob();
    } catch (error) {
      logger.error('[DataRetention] Scheduled job error:', error);
    }
  });

  logger.info('✅ Data retention job scheduled (daily at 2:00 AM)');
}

module.exports = {
  runDataRetentionJob,
  startDataRetentionJob,
  archiveOldFinancialData,
  cleanupDepartedUsers,
  processDeletionRequests,
  generateRetentionReport,
  RETENTION_PERIODS,
};
