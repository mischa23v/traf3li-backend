/**
 * Audit Log Archiving Service
 *
 * Handles archiving of audit logs older than 90 days to:
 * 1. Improve performance of the main audit log collection
 * 2. Maintain compliance requirements (7-year retention)
 * 3. Generate and store summary statistics
 * 4. Enable cost-effective long-term storage
 *
 * This service should be run as a scheduled job (e.g., daily via cron).
 */

const AuditLog = require('../models/auditLog.model');
const ArchivedAuditLog = require('../models/archivedAuditLog.model');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

class AuditLogArchivingService {
  constructor() {
    // Archive logs older than 90 days by default
    this.archiveThresholdDays = 90;
    this.batchSize = 1000; // Archive in batches to avoid memory issues
  }

  /**
   * Archive logs older than the threshold
   * @param {Object} options - Archiving options
   * @returns {Promise<Object>} - Archiving result
   */
  async archiveOldLogs(options = {}) {
    const startTime = Date.now();
    const {
      thresholdDays = this.archiveThresholdDays,
      batchSize = this.batchSize,
      dryRun = false,
      firmId = null,
    } = options;

    logger.info(`Starting audit log archiving process...`);
    logger.info(`Threshold: ${thresholdDays} days, Batch size: ${batchSize}, Dry run: ${dryRun}`);

    try {
      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);

      // Build query
      const query = {
        timestamp: { $lt: cutoffDate },
      };

      if (firmId) {
        query.firmId = firmId;
      }

      // Count total logs to archive
      const totalToArchive = await AuditLog.countDocuments(query);

      if (totalToArchive === 0) {
        logger.info('No logs found to archive.');
        return {
          success: true,
          archived: 0,
          deleted: 0,
          duration: Date.now() - startTime,
          message: 'No logs to archive',
        };
      }

      logger.info(`Found ${totalToArchive} logs to archive (older than ${cutoffDate.toISOString()})`);

      if (dryRun) {
        logger.info('Dry run mode - no changes will be made.');
        return {
          success: true,
          archived: 0,
          deleted: 0,
          totalFound: totalToArchive,
          dryRun: true,
          duration: Date.now() - startTime,
        };
      }

      // Archive and delete in batches
      let totalArchived = 0;
      let totalDeleted = 0;
      let batchNumber = 0;
      let hasMore = true;

      while (hasMore) {
        batchNumber++;
        logger.info(`Processing batch ${batchNumber}...`);

        // Fetch batch
        const logs = await AuditLog.find(query)
          .limit(batchSize)
          .lean();

        if (logs.length === 0) {
          hasMore = false;
          break;
        }

        // Archive batch
        const archiveResult = await ArchivedAuditLog.archiveLogs(logs);

        if (archiveResult.success) {
          totalArchived += archiveResult.archived;

          // Delete archived logs from main collection
          const logIds = logs.map(log => log._id);
          const deleteResult = await AuditLog.deleteMany({ _id: { $in: logIds } });
          totalDeleted += deleteResult.deletedCount;

          logger.info(`Batch ${batchNumber}: Archived ${archiveResult.archived}, Deleted ${deleteResult.deletedCount}`);
        } else {
          logger.error(`Batch ${batchNumber}: Archive failed - ${archiveResult.error}`);
        }

        // Check if we've processed all logs
        if (logs.length < batchSize) {
          hasMore = false;
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`Archiving completed: ${totalArchived} archived, ${totalDeleted} deleted in ${duration}ms`);

      return {
        success: true,
        archived: totalArchived,
        deleted: totalDeleted,
        batches: batchNumber,
        duration,
        cutoffDate,
      };
    } catch (error) {
      logger.error('Audit log archiving failed:', error);
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Generate and store summary statistics for archived logs
   * @param {Object} options - Summary options
   * @returns {Promise<Object>} - Summary statistics
   */
  async generateArchiveSummary(options = {}) {
    const { firmId = null, startDate = null, endDate = null } = options;

    try {
      const filters = {};
      if (firmId) filters.firmId = firmId;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const stats = await ArchivedAuditLog.getArchiveStats(filters);

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      logger.error('Failed to generate archive summary:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify archive integrity
   * Checks if archived logs match their original counterparts
   * @param {Number} sampleSize - Number of logs to verify (default: 100)
   * @returns {Promise<Object>} - Verification result
   */
  async verifyArchiveIntegrity(sampleSize = 100) {
    try {
      logger.info(`Verifying archive integrity (sample size: ${sampleSize})...`);

      // Get random sample of archived logs
      const archivedSample = await ArchivedAuditLog.aggregate([
        { $sample: { size: sampleSize } },
      ]);

      let verified = 0;
      let failed = 0;
      const errors = [];

      for (const archivedLog of archivedSample) {
        // Check if essential fields are present
        if (!archivedLog.originalLogId || !archivedLog.timestamp || !archivedLog.action) {
          failed++;
          errors.push({
            archivedLogId: archivedLog._id,
            reason: 'Missing essential fields',
          });
          continue;
        }

        // Verify archive metadata
        if (!archivedLog.archivedAt || !archivedLog.archivedBy) {
          failed++;
          errors.push({
            archivedLogId: archivedLog._id,
            reason: 'Missing archiving metadata',
          });
          continue;
        }

        verified++;
      }

      const result = {
        success: true,
        sampleSize: archivedSample.length,
        verified,
        failed,
        integrityScore: archivedSample.length > 0 ? (verified / archivedSample.length * 100).toFixed(2) : 100,
      };

      if (errors.length > 0) {
        result.errors = errors.slice(0, 10); // Return first 10 errors
      }

      logger.info(`Integrity verification complete: ${result.integrityScore}% integrity`);

      return result;
    } catch (error) {
      logger.error('Archive integrity verification failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get archiving statistics
   * @returns {Promise<Object>} - Archiving statistics
   */
  async getArchivingStats() {
    try {
      const [
        totalActive,
        totalArchived,
        oldestActive,
        oldestArchived,
        recentArchiveActivity,
      ] = await Promise.all([
        AuditLog.countDocuments(),
        ArchivedAuditLog.countDocuments(),
        AuditLog.findOne().sort({ timestamp: 1 }).select('timestamp').lean(),
        ArchivedAuditLog.findOne().sort({ timestamp: 1 }).select('timestamp archivedAt').lean(),
        ArchivedAuditLog.aggregate([
          {
            $group: {
              _id: {
                year: { $year: '$archivedAt' },
                month: { $month: '$archivedAt' },
                day: { $dayOfMonth: '$archivedAt' },
              },
              count: { $sum: 1 },
            }
          },
          { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
          { $limit: 30 },
        ]),
      ]);

      // Calculate logs eligible for archiving
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.archiveThresholdDays);
      const eligibleForArchiving = await AuditLog.countDocuments({
        timestamp: { $lt: cutoffDate },
      });

      return {
        success: true,
        data: {
          activeLogs: totalActive,
          archivedLogs: totalArchived,
          totalLogs: totalActive + totalArchived,
          eligibleForArchiving,
          archiveThresholdDays: this.archiveThresholdDays,
          oldestActiveLog: oldestActive?.timestamp,
          oldestArchivedLog: oldestArchived?.timestamp,
          archiveActivity: recentArchiveActivity.map(item => ({
            date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
            count: item.count,
          })),
        },
      };
    } catch (error) {
      logger.error('Failed to get archiving stats:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Restore archived logs back to main collection
   * Use with caution - typically for compliance or investigation purposes
   * @param {Object} query - Query to find archived logs to restore
   * @param {Number} limit - Maximum number of logs to restore
   * @returns {Promise<Object>} - Restore result
   */
  async restoreArchivedLogs(query = {}, limit = 100) {
    try {
      logger.info(`Restoring archived logs (limit: ${limit})...`);

      // Find archived logs matching query
      const archivedLogs = await ArchivedAuditLog.find(query)
        .limit(limit)
        .lean();

      if (archivedLogs.length === 0) {
        return {
          success: true,
          restored: 0,
          message: 'No archived logs found matching query',
        };
      }

      // Prepare logs for restoration (remove archive metadata)
      const logsToRestore = archivedLogs.map(log => {
        const restored = { ...log };
        delete restored._id;
        delete restored.__v;
        delete restored.archivedAt;
        delete restored.archivedBy;
        delete restored.originalLogId;
        delete restored.archiveReason;
        delete restored.compressed;
        delete restored.compressionAlgorithm;
        delete restored.createdAt;
        delete restored.updatedAt;

        return restored;
      });

      // Insert back into main collection
      const result = await AuditLog.insertMany(logsToRestore, { ordered: false });

      logger.info(`Restored ${result.length} archived logs to main collection`);

      return {
        success: true,
        restored: result.length,
      };
    } catch (error) {
      logger.error('Failed to restore archived logs:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete archived logs older than retention period (7 years for PDPL compliance)
   * This is handled automatically by MongoDB TTL index, but can be triggered manually
   * @param {Number} retentionYears - Number of years to retain (default: 7)
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteOldArchivedLogs(retentionYears = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - retentionYears);

      logger.info(`Deleting archived logs older than ${cutoffDate.toISOString()}...`);

      const result = await ArchivedAuditLog.deleteMany({
        timestamp: { $lt: cutoffDate },
      });

      logger.info(`Deleted ${result.deletedCount} old archived logs`);

      return {
        success: true,
        deleted: result.deletedCount,
        cutoffDate,
      };
    } catch (error) {
      logger.error('Failed to delete old archived logs:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Export singleton instance
module.exports = new AuditLogArchivingService();
