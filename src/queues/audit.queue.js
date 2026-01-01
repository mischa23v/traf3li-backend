/**
 * Audit Log Queue Processor
 *
 * Gold Standard: Non-blocking audit logging
 *
 * Handles asynchronous audit log creation with retry logic.
 * Uses the same pattern as activity.queue.js for consistency.
 *
 * COMPLIANCE NOTE: For strict compliance requirements (NCA ECC-2:2024),
 * some audit logs may need synchronous writing. Use AuditLog.log() directly
 * for those cases. This queue is for general audit logging where eventual
 * consistency is acceptable.
 */

const { createQueue } = require('../configs/queue');
const logger = require('../utils/logger');

// Create audit queue with retry configuration
const auditQueue = createQueue('audit', {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: {
      age: 3600,    // Keep completed jobs for 1 hour
      count: 1000   // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 86400,   // Keep failed jobs for 24 hours
      count: 500    // Keep last 500 failed jobs
    }
  }
});

/**
 * Process audit log jobs
 */
auditQueue.process(async (job) => {
  const { type, data } = job.data;

  try {
    switch (type) {
      case 'log':
        return await createAuditLog(data, job);

      case 'bulk':
        return await createBulkAuditLogs(data, job);

      default:
        throw new Error(`Unknown audit job type: ${type}`);
    }
  } catch (error) {
    logger.error(`Audit job ${job.id} failed:`, error.message);
    throw error;
  }
});

/**
 * Create single audit log entry
 */
async function createAuditLog(data, job) {
  await job.progress(20);

  // Import model dynamically to avoid circular dependencies
  const AuditLog = require('../models/auditLog.model');

  await job.progress(50);

  // Use the model's static log method which handles hash chains
  const log = await AuditLog.log(data);

  await job.progress(100);

  if (log) {
    logger.debug(`Audit log created: ${data.action} on ${data.entityType || data.resourceType}`);
    return {
      success: true,
      logId: log._id,
      action: data.action
    };
  }

  // AuditLog.log() returns null on failure but doesn't throw
  return {
    success: false,
    action: data.action,
    error: 'Audit log creation returned null'
  };
}

/**
 * Create multiple audit log entries
 */
async function createBulkAuditLogs(data, job) {
  const { entries } = data;

  await job.progress(20);

  const AuditLog = require('../models/auditLog.model');

  await job.progress(50);

  const logs = await AuditLog.logBulk(entries);

  await job.progress(100);

  if (logs) {
    logger.debug(`Bulk audit logs created: ${logs.length} entries`);
    return {
      success: true,
      count: logs.length
    };
  }

  return {
    success: false,
    error: 'Bulk audit log creation returned null'
  };
}

// Event handlers for monitoring
auditQueue.on('completed', (job, result) => {
  // Removed verbose logging for performance
});

auditQueue.on('failed', (job, err) => {
  logger.error(`Audit job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);

  // Move to dead letter queue after max retries
  if (job.attemptsMade >= job.opts.attempts) {
    logger.error('Audit job moved to DLQ:', {
      jobId: job.id,
      data: job.data,
      error: err.message
    });
  }
});

/**
 * Convenience method to add audit log job
 * @param {Object} auditData - Audit log data
 * @param {Object} options - Job options
 */
auditQueue.addAuditLog = async function(auditData, options = {}) {
  return this.add(
    { type: 'log', data: auditData },
    {
      ...options,
      jobId: options.jobId || `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
  );
};

/**
 * Convenience method to add bulk audit logs job
 * @param {Array} entries - Array of audit log entries
 * @param {Object} options - Job options
 */
auditQueue.addBulkAuditLogs = async function(entries, options = {}) {
  return this.add(
    { type: 'bulk', data: { entries } },
    {
      ...options,
      jobId: options.jobId || `audit-bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
  );
};

module.exports = auditQueue;
