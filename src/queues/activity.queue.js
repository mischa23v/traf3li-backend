/**
 * Activity Queue Processor (Gold Standard)
 *
 * Handles asynchronous CRM activity logging.
 * Activity logging is a non-critical operation that should never
 * block or fail the primary business operation (create, update, delete, etc.)
 *
 * Benefits:
 * - Faster API responses (2ms queue push vs 30ms DB write)
 * - Guaranteed delivery with retry logic
 * - Dead Letter Queue for failed jobs
 * - Non-blocking - primary operations always succeed
 *
 * @see https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
 */

const { createQueue } = require('../configs/queue');
const logger = require('../utils/logger');

// Create activity queue with optimized settings for logging
const activityQueue = createQueue('activity', {
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000 // Start with 1 second delay
        },
        removeOnComplete: {
            age: 3600,   // Keep completed jobs for 1 hour
            count: 500   // Keep last 500 completed jobs
        },
        removeOnFail: {
            age: 86400,  // Keep failed jobs for 24 hours
            count: 100   // Keep last 100 failed jobs
        }
    }
});

/**
 * Process activity jobs
 */
activityQueue.process(async (job) => {
    const { type, data } = job.data;

    logger.info(`📊 Processing activity job ${job.id} of type: ${type}`);

    try {
        switch (type) {
            case 'log':
                return await logActivity(data, job);

            case 'bulk':
                return await logBulkActivities(data, job);

            default:
                throw new Error(`Unknown activity type: ${type}`);
        }
    } catch (error) {
        logger.error(`❌ Activity job ${job.id} failed:`, error.message);
        throw error;
    }
});

/**
 * Log a single CRM activity
 */
async function logActivity(data, job) {
    const {
        lawyerId,
        firmId,
        type,
        entityType,
        entityId,
        entityName,
        title,
        description,
        performedBy,
        metadata
    } = data;

    await job.progress(30);

    // Import model dynamically to avoid circular dependencies
    const CrmActivity = require('../models/crmActivity.model');

    await job.progress(60);

    // Build activity data
    const activityData = {
        lawyerId,
        type,
        entityType,
        entityId,
        entityName,
        title,
        description,
        performedBy: performedBy || lawyerId,
        status: 'completed',
        completedAt: new Date()
    };

    // Include firmId if provided (for firm members)
    if (firmId) {
        activityData.firmId = firmId;
    }

    // Include any additional metadata
    if (metadata) {
        activityData.metadata = metadata;
    }

    // Create activity record
    const activity = await CrmActivity.create(activityData);

    await job.progress(100);

    logger.info(`✅ Activity logged: ${type} for ${entityType}/${entityId}`);
    return {
        success: true,
        activityId: activity._id,
        activityNumber: activity.activityId
    };
}

/**
 * Log multiple activities in bulk (for batch operations)
 */
async function logBulkActivities(data, job) {
    const { activities } = data;

    const CrmActivity = require('../models/crmActivity.model');
    const results = [];
    const total = activities.length;

    for (let i = 0; i < activities.length; i++) {
        const activity = activities[i];

        try {
            const activityData = {
                lawyerId: activity.lawyerId,
                type: activity.type,
                entityType: activity.entityType,
                entityId: activity.entityId,
                entityName: activity.entityName,
                title: activity.title,
                description: activity.description,
                performedBy: activity.performedBy || activity.lawyerId,
                status: 'completed',
                completedAt: new Date()
            };

            if (activity.firmId) {
                activityData.firmId = activity.firmId;
            }

            const record = await CrmActivity.create(activityData);
            results.push({
                entityId: activity.entityId,
                success: true,
                activityId: record._id
            });
        } catch (error) {
            logger.error(`Failed to log activity for ${activity.entityId}:`, error.message);
            results.push({
                entityId: activity.entityId,
                success: false,
                error: error.message
            });
        }

        // Update progress
        await job.progress(Math.floor(((i + 1) / total) * 100));
    }

    const successCount = results.filter(r => r.success).length;
    logger.info(`✅ Bulk activities logged: ${successCount}/${total}`);

    return {
        success: true,
        total,
        successCount,
        failedCount: total - successCount,
        results
    };
}

/**
 * Helper function to add activity to queue (fire-and-forget)
 * This is the main function controllers should use
 *
 * @param {Object} data - Activity data
 * @param {string} data.lawyerId - User ID
 * @param {string} data.firmId - Firm ID (optional, for firm members)
 * @param {string} data.type - Activity type (e.g., 'appointment_deleted')
 * @param {string} data.entityType - Entity type (e.g., 'appointment')
 * @param {string} data.entityId - Entity ID
 * @param {string} data.entityName - Entity name for display
 * @param {string} data.title - Activity title
 * @param {string} data.description - Activity description (optional)
 * @param {string} data.performedBy - User who performed action (optional)
 * @param {Object} options - Job options (optional)
 * @returns {Promise<Object>} Job info
 */
activityQueue.addActivity = async function(data, options = {}) {
    return this.add({
        type: 'log',
        data
    }, {
        ...options,
        jobId: `activity-${data.entityType}-${data.entityId}-${Date.now()}`
    });
};

/**
 * Helper function to add multiple activities to queue
 *
 * @param {Array} activities - Array of activity data objects
 * @param {Object} options - Job options (optional)
 * @returns {Promise<Object>} Job info
 */
activityQueue.addBulkActivities = async function(activities, options = {}) {
    return this.add({
        type: 'bulk',
        data: { activities }
    }, {
        ...options,
        jobId: `bulk-activity-${Date.now()}`
    });
};

module.exports = activityQueue;
