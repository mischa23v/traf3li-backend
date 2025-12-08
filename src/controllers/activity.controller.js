const { BillingActivity } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const apiResponse = require('../utils/apiResponse');

/**
 * Get financial activities with filters
 * GET /api/activities
 */
const getActivities = asyncHandler(async (req, res) => {
    const {
        type,
        entityType,
        clientId,
        startDate,
        endDate,
        page = 1,
        limit = 50
    } = req.query;

    const lawyerId = req.userID;
    const query = { userId: lawyerId };

    // Filter by activity type
    if (type) {
        query.activityType = type;
    }

    // Filter by entity type (relatedModel)
    if (entityType) {
        query.relatedModel = entityType;
    }

    // Filter by client
    if (clientId) {
        query.clientId = clientId;
    }

    // Date range filter
    if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const activities = await BillingActivity.find(query)
        .populate('userId', 'firstName lastName username')
        .populate('clientId', 'firstName lastName username email')
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await BillingActivity.countDocuments(query);

    // Using standardized paginated response
    return apiResponse.paginated(
        res,
        activities,
        {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit)),
            hasNextPage: parseInt(page) < Math.ceil(total / parseInt(limit)),
            hasPrevPage: parseInt(page) > 1
        },
        'Activities retrieved successfully'
    );
});

/**
 * Get single activity
 * GET /api/activities/:id
 */
const getActivity = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const activity = await BillingActivity.findById(id)
        .populate('userId', 'firstName lastName username email')
        .populate('clientId', 'firstName lastName username email');

    if (!activity) {
        return apiResponse.notFound(res, 'Activity not found');
    }

    if (activity.userId._id.toString() !== lawyerId) {
        return apiResponse.forbidden(res, 'You do not have access to this activity');
    }

    // Using standardized success response
    return apiResponse.success(
        res,
        { activity },
        'Activity retrieved successfully'
    );
});

/**
 * Get activity summary/stats
 * GET /api/activities/summary
 */
const getActivitySummary = asyncHandler(async (req, res) => {
    const { startDate, endDate, clientId } = req.query;
    const lawyerId = req.userID;

    const matchQuery = { userId: lawyerId };

    if (clientId) matchQuery.clientId = clientId;
    if (startDate || endDate) {
        matchQuery.timestamp = {};
        if (startDate) matchQuery.timestamp.$gte = new Date(startDate);
        if (endDate) matchQuery.timestamp.$lte = new Date(endDate);
    }

    // Count by activity type
    const byType = await BillingActivity.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$activityType',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } }
    ]);

    // Count by entity type
    const byEntity = await BillingActivity.aggregate([
        { $match: { ...matchQuery, relatedModel: { $exists: true } } },
        {
            $group: {
                _id: '$relatedModel',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } }
    ]);

    // Recent activity count (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentCount = await BillingActivity.countDocuments({
        ...matchQuery,
        timestamp: { $gte: sevenDaysAgo }
    });

    // Total count
    const totalCount = await BillingActivity.countDocuments(matchQuery);

    // Using standardized success response
    return apiResponse.success(
        res,
        {
            summary: {
                total: totalCount,
                lastSevenDays: recentCount,
                byType: byType.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                byEntity: byEntity.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {})
            }
        },
        'Activity summary retrieved successfully'
    );
});

/**
 * Get activities for a specific entity
 * GET /api/activities/entity/:entityType/:entityId
 */
const getEntityActivities = asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const lawyerId = req.userID;

    const validEntityTypes = ['Invoice', 'Payment', 'TimeEntry', 'Expense', 'Retainer', 'Statement', 'BillingRate'];

    if (!validEntityTypes.includes(entityType)) {
        return apiResponse.badRequest(
            res,
            'Invalid entity type',
            { validTypes: validEntityTypes }
        );
    }

    const query = {
        userId: lawyerId,
        relatedModel: entityType,
        relatedId: entityId
    };

    const activities = await BillingActivity.find(query)
        .populate('userId', 'firstName lastName username')
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await BillingActivity.countDocuments(query);

    // Using standardized paginated response
    return apiResponse.paginated(
        res,
        activities,
        {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit)),
            hasNextPage: parseInt(page) < Math.ceil(total / parseInt(limit)),
            hasPrevPage: parseInt(page) > 1
        },
        'Entity activities retrieved successfully'
    );
});

module.exports = {
    getActivities,
    getActivity,
    getActivitySummary,
    getEntityActivities
};
