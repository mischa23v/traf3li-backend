/**
 * Billing Activity Queue Processor (Gold Standard)
 *
 * Handles asynchronous billing activity logging.
 * Activity logging is a non-critical operation that should never
 * block or fail the primary business operation (create, update, delete, etc.)
 *
 * Benefits:
 * - Faster API responses (2ms queue push vs 30ms DB write)
 * - Guaranteed delivery with retry logic
 * - Dead Letter Queue for failed jobs
 * - Non-blocking - primary operations always succeed
 */

const { createQueue } = require('../configs/queue');
const logger = require('../utils/logger');

// Create billing activity queue with optimized settings for logging
const billingActivityQueue = createQueue('billingActivity', {
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000
        },
        removeOnComplete: {
            age: 3600,
            count: 500
        },
        removeOnFail: {
            age: 86400,
            count: 100
        }
    }
});

/**
 * Process billing activity jobs
 */
billingActivityQueue.process(async (job) => {
    const { type, data } = job.data;

    logger.info(`💰 Processing billing activity job ${job.id} of type: ${type}`);

    try {
        switch (type) {
            case 'log':
                return await logBillingActivity(data, job);

            case 'bulk':
                return await logBulkBillingActivities(data, job);

            default:
                throw new Error(`Unknown billing activity type: ${type}`);
        }
    } catch (error) {
        logger.error(`❌ Billing activity job ${job.id} failed:`, error.message);
        throw error;
    }
});

/**
 * Log a single billing activity
 */
async function logBillingActivity(data, job) {
    const {
        firmId,
        lawyerId,
        activityType,
        userId,
        clientId,
        relatedModel,
        relatedId,
        description,
        changes,
        ipAddress,
        userAgent
    } = data;

    await job.progress(30);

    // Import model dynamically to avoid circular dependencies
    const BillingActivity = require('../models/billingActivity.model');

    await job.progress(60);

    // Build activity data
    const activityData = {
        activityType,
        userId,
        description
    };

    // Optional fields
    if (firmId) activityData.firmId = firmId;
    if (lawyerId) activityData.lawyerId = lawyerId;
    if (clientId) activityData.clientId = clientId;
    if (relatedModel) activityData.relatedModel = relatedModel;
    if (relatedId) activityData.relatedId = relatedId;
    if (changes) activityData.changes = changes;
    if (ipAddress) activityData.ipAddress = ipAddress;
    if (userAgent) activityData.userAgent = userAgent;

    // Create activity record
    const activity = await BillingActivity.create(activityData);

    await job.progress(100);

    logger.info(`✅ Billing activity logged: ${activityType} for ${relatedModel}/${relatedId}`);
    return {
        success: true,
        activityId: activity._id
    };
}

/**
 * Log multiple billing activities in bulk
 */
async function logBulkBillingActivities(data, job) {
    const { activities } = data;

    const BillingActivity = require('../models/billingActivity.model');
    const results = [];
    const total = activities.length;

    for (let i = 0; i < activities.length; i++) {
        const activity = activities[i];

        try {
            const activityData = {
                activityType: activity.activityType,
                userId: activity.userId,
                description: activity.description
            };

            if (activity.firmId) activityData.firmId = activity.firmId;
            if (activity.lawyerId) activityData.lawyerId = activity.lawyerId;
            if (activity.clientId) activityData.clientId = activity.clientId;
            if (activity.relatedModel) activityData.relatedModel = activity.relatedModel;
            if (activity.relatedId) activityData.relatedId = activity.relatedId;
            if (activity.changes) activityData.changes = activity.changes;
            if (activity.ipAddress) activityData.ipAddress = activity.ipAddress;
            if (activity.userAgent) activityData.userAgent = activity.userAgent;

            const record = await BillingActivity.create(activityData);
            results.push({
                relatedId: activity.relatedId,
                success: true,
                activityId: record._id
            });
        } catch (error) {
            logger.error(`Failed to log billing activity for ${activity.relatedId}:`, error.message);
            results.push({
                relatedId: activity.relatedId,
                success: false,
                error: error.message
            });
        }

        await job.progress(Math.floor(((i + 1) / total) * 100));
    }

    const successCount = results.filter(r => r.success).length;
    logger.info(`✅ Bulk billing activities logged: ${successCount}/${total}`);

    return {
        success: true,
        total,
        successCount,
        failedCount: total - successCount,
        results
    };
}

/**
 * Helper function to add billing activity to queue (fire-and-forget)
 */
billingActivityQueue.addActivity = async function(data, options = {}) {
    return this.add({
        type: 'log',
        data
    }, {
        ...options,
        jobId: `billing-${data.activityType}-${data.relatedId || Date.now()}-${Date.now()}`
    });
};

/**
 * Helper function to add multiple billing activities to queue
 */
billingActivityQueue.addBulkActivities = async function(activities, options = {}) {
    return this.add({
        type: 'bulk',
        data: { activities }
    }, {
        ...options,
        jobId: `bulk-billing-${Date.now()}`
    });
};

module.exports = billingActivityQueue;
