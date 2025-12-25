/**
 * Bulk Actions Queue Processor
 *
 * Handles asynchronous bulk operations across different entity types.
 * Processes large bulk actions in the background with progress tracking
 * and comprehensive error handling.
 */

const { createQueue } = require('../configs/queue');
const BulkActionsService = require('../services/bulkActions.service');
const logger = require('../utils/logger');

// Create bulk-actions queue
const bulkActionsQueue = createQueue('bulk-actions', {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: {
      age: 172800, // Keep completed jobs for 48 hours
      count: 100
    },
    removeOnFail: {
      age: 604800 // Keep failed jobs for 7 days
    },
    timeout: 600000 // 10 minutes timeout
  }
});

/**
 * Process bulk action jobs
 */
bulkActionsQueue.process(async (job) => {
  const { jobId, actionType, entityType, entityIds, userId, firmId } = job.data;

  logger.info(
    `🔄 Processing bulk action job ${jobId}: ${actionType} on ${entityIds.length} ${entityType}`,
    {
      jobId,
      actionType,
      entityType,
      totalEntities: entityIds.length,
      firmId,
      userId
    }
  );

  try {
    // Update job progress to indicate processing has started
    await job.progress(1);

    // Execute the bulk action via service
    const result = await BulkActionsService.processBulkActionJob(job.data);

    // Job completed successfully
    logger.info(
      `✅ Bulk action job ${jobId} completed: ${result.successCount} succeeded, ${result.failureCount} failed`,
      {
        jobId,
        actionType,
        entityType,
        successCount: result.successCount,
        failureCount: result.failureCount,
        totalEntities: entityIds.length
      }
    );

    return {
      success: true,
      jobId,
      actionType,
      entityType,
      totalEntities: entityIds.length,
      successCount: result.successCount,
      failureCount: result.failureCount,
      errors: result.errors,
      completedAt: new Date()
    };
  } catch (error) {
    logger.error(`❌ Bulk action job ${jobId} failed:`, {
      jobId,
      actionType,
      entityType,
      error: error.message,
      stack: error.stack
    });

    throw error;
  }
});

/**
 * Job event listeners
 */

bulkActionsQueue.on('completed', (job, result) => {
  logger.info(`✅ Bulk action job ${job.id} completed successfully`, {
    jobId: job.id,
    actionType: job.data.actionType,
    entityType: job.data.entityType,
    successCount: result.successCount,
    failureCount: result.failureCount
  });
});

bulkActionsQueue.on('failed', (job, error) => {
  logger.error(`❌ Bulk action job ${job.id} failed:`, {
    jobId: job.id,
    actionType: job.data.actionType,
    entityType: job.data.entityType,
    error: error.message,
    attemptsMade: job.attemptsMade
  });
});

bulkActionsQueue.on('stalled', (job) => {
  logger.warn(`⚠️ Bulk action job ${job.id} stalled`, {
    jobId: job.id,
    actionType: job.data.actionType,
    entityType: job.data.entityType,
    attemptsMade: job.attemptsMade
  });
});

bulkActionsQueue.on('progress', (job, progress) => {
  // Only log progress at certain milestones to avoid spam
  if (progress % 25 === 0 || progress === 100) {
    logger.info(`📊 Bulk action job ${job.id} progress: ${progress}%`, {
      jobId: job.id,
      actionType: job.data.actionType,
      entityType: job.data.entityType,
      progress
    });
  }
});

bulkActionsQueue.on('error', (error) => {
  logger.error('❌ Bulk actions queue error:', error);
});

bulkActionsQueue.on('waiting', (jobId) => {
  logger.debug(`⏳ Bulk action job ${jobId} is waiting to be processed`);
});

bulkActionsQueue.on('active', (job) => {
  logger.info(`🚀 Bulk action job ${job.id} started processing`, {
    jobId: job.id,
    actionType: job.data.actionType,
    entityType: job.data.entityType,
    totalEntities: job.data.entityIds?.length || 0
  });
});

bulkActionsQueue.on('removed', (job) => {
  logger.debug(`🗑️ Bulk action job ${job.id} removed from queue`, {
    jobId: job.id,
    actionType: job.data.actionType,
    entityType: job.data.entityType
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing bulk actions queue gracefully...');
  await bulkActionsQueue.close();
  logger.info('Bulk actions queue closed');
});

module.exports = bulkActionsQueue;
