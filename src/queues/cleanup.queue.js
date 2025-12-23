/**
 * Cleanup Queue Processor
 *
 * Handles scheduled data cleanup tasks including:
 * - Old logs cleanup
 * - Temporary files removal
 * - Session cleanup
 * - Expired tokens removal
 * - Archive old records
 */

const { createQueue } = require('../configs/queue');
const logger = require('../utils/logger');

// Create cleanup queue
const cleanupQueue = createQueue('cleanup', {
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 30000
    },
    removeOnComplete: {
      age: 172800, // 48 hours
      count: 50
    }
  }
});

/**
 * Process cleanup jobs
 */
cleanupQueue.process(async (job) => {
  const { type, data } = job.data;

  logger.info(`🧹 Processing cleanup job ${job.id} of type: ${type}`);

  try {
    switch (type) {
      case 'old-logs':
        return await cleanupOldLogs(data, job);

      case 'temp-files':
        return await cleanupTempFiles(data, job);

      case 'sessions':
        return await cleanupExpiredSessions(data, job);

      case 'tokens':
        return await cleanupExpiredTokens(data, job);

      case 'notifications':
        return await cleanupOldNotifications(data, job);

      case 'audit-logs':
        return await archiveOldAuditLogs(data, job);

      case 'failed-jobs':
        return await cleanupFailedJobs(data, job);

      default:
        throw new Error(`Unknown cleanup type: ${type}`);
    }
  } catch (error) {
    logger.error(`❌ Cleanup job ${job.id} failed:`, error.message);
    throw error;
  }
});

/**
 * Cleanup old logs
 */
async function cleanupOldLogs(data, job) {
  const { retentionDays = 30 } = data;

  await job.progress(10);

  const fs = require('fs').promises;
  const path = require('path');

  const logsDir = path.join(__dirname, '../../logs');
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  await job.progress(30);

  try {
    const files = await fs.readdir(logsDir);
    let deletedCount = 0;

    await job.progress(50);

    for (const file of files) {
      const filePath = path.join(logsDir, file);
      const stats = await fs.stat(filePath);

      if (stats.mtime < cutoffDate) {
        await fs.unlink(filePath);
        deletedCount++;
      }
    }

    await job.progress(100);

    logger.info(`✅ Cleaned up ${deletedCount} old log files`);
    return {
      success: true,
      deletedCount,
      retentionDays
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: true, deletedCount: 0, message: 'Logs directory not found' };
    }
    throw error;
  }
}

/**
 * Cleanup temporary files
 */
async function cleanupTempFiles(data, job) {
  const { maxAgeHours = 24 } = data;

  await job.progress(10);

  const fs = require('fs').promises;
  const path = require('path');

  const tempDirs = [
    path.join(__dirname, '../../uploads/temp'),
    path.join(__dirname, '../../tmp')
  ];

  const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
  let totalDeleted = 0;

  await job.progress(30);

  for (const tempDir of tempDirs) {
    try {
      const files = await fs.readdir(tempDir);

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtimeMs < cutoffTime) {
          await fs.unlink(filePath);
          totalDeleted++;
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error(`Error cleaning ${tempDir}:`, error.message);
      }
    }

    await job.progress(30 + (tempDirs.indexOf(tempDir) + 1) * 30);
  }

  await job.progress(100);

  logger.info(`✅ Cleaned up ${totalDeleted} temporary files`);
  return {
    success: true,
    deletedCount: totalDeleted,
    maxAgeHours
  };
}

/**
 * Cleanup expired sessions
 */
async function cleanupExpiredSessions(data, job) {
  await job.progress(10);

  const { getRedisClient } = require('../configs/redis');
  const redis = getRedisClient();

  await job.progress(30);

  // Get all session keys
  const sessionKeys = await redis.keys('sess:*');

  await job.progress(50);

  let expiredCount = 0;

  for (const key of sessionKeys) {
    const ttl = await redis.ttl(key);

    // If TTL is -1 (no expiry) or -2 (key doesn't exist)
    if (ttl === -1) {
      // Set default expiry of 30 days
      await redis.expire(key, 30 * 24 * 60 * 60);
    } else if (ttl === -2) {
      expiredCount++;
    }
  }

  await job.progress(100);

  logger.info(`✅ Cleaned up ${expiredCount} expired sessions`);
  return {
    success: true,
    expiredCount,
    totalSessions: sessionKeys.length
  };
}

/**
 * Cleanup expired tokens
 */
async function cleanupExpiredTokens(data, job) {
  await job.progress(10);

  const mongoose = require('mongoose');

  await job.progress(20);

  // Clean up email OTP tokens
  try {
    const EmailOtp = require('../models/emailOtp.model');
    const expiredOtps = await EmailOtp.deleteMany({
      expiresAt: { $lt: new Date() }
    });

    await job.progress(50);

    logger.info(`✅ Cleaned up ${expiredOtps.deletedCount} expired OTP tokens`);
  } catch (error) {
    logger.error('Error cleaning OTP tokens:', error.message);
  }

  await job.progress(70);

  // Clean up password reset tokens (if you have a model for them)
  // Clean up refresh tokens (if stored in DB)

  await job.progress(100);

  return {
    success: true
  };
}

/**
 * Cleanup old notifications
 */
async function cleanupOldNotifications(data, job) {
  const { retentionDays = 90 } = data;

  await job.progress(10);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  await job.progress(30);

  try {
    const Notification = require('../models/notification.model');

    const result = await Notification.deleteMany({
      isRead: true,
      createdAt: { $lt: cutoffDate }
    });

    await job.progress(100);

    logger.info(`✅ Cleaned up ${result.deletedCount} old notifications`);
    return {
      success: true,
      deletedCount: result.deletedCount,
      retentionDays
    };
  } catch (error) {
    logger.error('Error cleaning notifications:', error.message);
    return { success: true, deletedCount: 0, error: error.message };
  }
}

/**
 * Archive old audit logs
 */
async function archiveOldAuditLogs(data, job) {
  const { archiveAfterDays = 180 } = data;

  await job.progress(10);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - archiveAfterDays);

  await job.progress(20);

  try {
    const AuditLog = require('../models/auditLog.model');

    // Find old audit logs
    const oldLogs = await AuditLog.find({
      createdAt: { $lt: cutoffDate }
    }).lean();

    await job.progress(50);

    if (oldLogs.length > 0) {
      // Save to archive file
      const fs = require('fs').promises;
      const path = require('path');

      const archiveDir = path.join(__dirname, '../../archives/audit-logs');
      await fs.mkdir(archiveDir, { recursive: true });

      const archiveFile = path.join(
        archiveDir,
        `audit-logs-${cutoffDate.toISOString().split('T')[0]}.json`
      );

      await fs.writeFile(archiveFile, JSON.stringify(oldLogs, null, 2));

      await job.progress(80);

      // Delete archived logs from database
      const result = await AuditLog.deleteMany({
        createdAt: { $lt: cutoffDate }
      });

      await job.progress(100);

      logger.info(`✅ Archived ${result.deletedCount} audit logs to ${archiveFile}`);
      return {
        success: true,
        archivedCount: result.deletedCount,
        archiveFile
      };
    }

    await job.progress(100);

    return {
      success: true,
      archivedCount: 0,
      message: 'No logs to archive'
    };
  } catch (error) {
    logger.error('Error archiving audit logs:', error.message);
    throw error;
  }
}

/**
 * Cleanup failed jobs from queues
 */
async function cleanupFailedJobs(data, job) {
  const { olderThanDays = 7 } = data;

  await job.progress(10);

  const { getAllQueues } = require('../configs/queue');
  const queues = getAllQueues();

  await job.progress(20);

  let totalCleaned = 0;
  const grace = olderThanDays * 24 * 60 * 60 * 1000; // Convert to milliseconds

  for (const [name, queue] of queues.entries()) {
    try {
      const cleaned = await queue.clean(grace, 'failed');
      totalCleaned += cleaned.length;
      logger.info(`   Cleaned ${cleaned.length} failed jobs from ${name} queue`);
    } catch (error) {
      logger.error(`   Error cleaning ${name} queue:`, error.message);
    }
  }

  await job.progress(100);

  logger.info(`✅ Cleaned up ${totalCleaned} failed jobs across all queues`);
  return {
    success: true,
    totalCleaned,
    olderThanDays
  };
}

module.exports = cleanupQueue;
