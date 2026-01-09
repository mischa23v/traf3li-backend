/**
 * Activities Extended Routes
 *
 * Provides comprehensive activity management for the CRM system.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - POST /                     - Create activity
 * - GET /                      - List activities
 * - GET /:id                   - Get activity by ID
 * - PUT /:id                   - Update activity
 * - DELETE /:id                - Delete activity
 * - POST /:id/done             - Mark activity as done
 * - POST /:id/cancel           - Cancel activity
 * - POST /:id/reschedule       - Reschedule activity
 * - POST /:id/reassign         - Reassign activity
 * - GET /summary               - Get activity summary
 * - GET /overview              - Get activity overview
 * - GET /stats                 - Get activity statistics
 * - GET /my                    - Get my activities
 * - GET /types                 - Get activity types
 * - POST /types                - Create activity type
 * - GET /types/:id             - Get activity type by ID
 * - PUT /types/:id             - Update activity type
 * - DELETE /types/:id          - Delete activity type
 * - GET /entity/:entityType/:entityId - Get activities for entity
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const CrmActivity = require('../models/crmActivity.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Allowed fields for activity creation/update
const ALLOWED_ACTIVITY_FIELDS = [
    'type', 'subject', 'description', 'dueDate', 'duration',
    'priority', 'status', 'assignedTo', 'relatedTo', 'relatedModel',
    'location', 'reminder', 'notes', 'outcome', 'isRecurring',
    'recurrencePattern', 'tags', 'participants', 'linkedEntities'
];

const ALLOWED_TYPE_FIELDS = [
    'name', 'description', 'icon', 'color', 'defaultDuration',
    'requiresOutcome', 'isActive', 'category', 'sortOrder'
];

// Valid activity statuses
const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled', 'overdue'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const VALID_ENTITY_TYPES = ['lead', 'contact', 'client', 'case', 'deal', 'opportunity', 'task'];

/**
 * POST / - Create new activity
 */
router.post('/', async (req, res, next) => {
    try {
        const safeData = pickAllowedFields(req.body, ALLOWED_ACTIVITY_FIELDS);

        // Validate required fields
        if (!safeData.type) {
            throw CustomException('Activity type is required', 400);
        }
        if (!safeData.subject) {
            throw CustomException('Activity subject is required', 400);
        }

        // Sanitize ObjectIds
        if (safeData.assignedTo) {
            safeData.assignedTo = sanitizeObjectId(safeData.assignedTo, 'assignedTo');
        }
        if (safeData.relatedTo) {
            safeData.relatedTo = sanitizeObjectId(safeData.relatedTo, 'relatedTo');
        }

        // Validate priority
        if (safeData.priority && !VALID_PRIORITIES.includes(safeData.priority)) {
            throw CustomException(`Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`, 400);
        }

        // Validate status
        if (safeData.status && !VALID_STATUSES.includes(safeData.status)) {
            throw CustomException(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, 400);
        }

        // Set defaults
        safeData.status = safeData.status || 'pending';
        safeData.priority = safeData.priority || 'medium';
        safeData.createdBy = req.userID;

        const activity = await CrmActivity.create(req.addFirmId(safeData));

        res.status(201).json({
            success: true,
            message: 'Activity created successfully',
            data: activity
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET / - List activities with filtering and pagination
 */
router.get('/', async (req, res, next) => {
    try {
        const { page, limit, skip } = sanitizePagination(req.query.page, req.query.limit);
        const { type, status, priority, assignedTo, relatedTo, search, dateFrom, dateTo, sortBy, sortOrder } = req.query;

        const query = { ...req.firmQuery };

        if (type) {
            query.type = escapeRegex(type);
        }
        if (status) {
            if (!VALID_STATUSES.includes(status)) {
                throw CustomException(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, 400);
            }
            query.status = status;
        }
        if (priority) {
            if (!VALID_PRIORITIES.includes(priority)) {
                throw CustomException(`Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`, 400);
            }
            query.priority = priority;
        }
        if (assignedTo) {
            query.assignedTo = sanitizeObjectId(assignedTo, 'assignedTo');
        }
        if (relatedTo) {
            query.relatedTo = sanitizeObjectId(relatedTo, 'relatedTo');
        }
        if (search) {
            const searchPattern = escapeRegex(search);
            query.$or = [
                { subject: { $regex: searchPattern, $options: 'i' } },
                { description: { $regex: searchPattern, $options: 'i' } }
            ];
        }
        if (dateFrom || dateTo) {
            query.dueDate = {};
            if (dateFrom) query.dueDate.$gte = new Date(dateFrom);
            if (dateTo) query.dueDate.$lte = new Date(dateTo);
        }

        // Build sort
        const validSortFields = ['createdAt', 'dueDate', 'subject', 'priority', 'status'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

        const [activities, total] = await Promise.all([
            CrmActivity.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate('assignedTo', 'firstName lastName email')
                .populate('createdBy', 'firstName lastName')
                .lean(),
            CrmActivity.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: activities,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /summary - Get activity summary
 */
router.get('/summary', async (req, res, next) => {
    try {
        const [statusCounts, typeCounts, priorityCounts, overdueTasks] = await Promise.all([
            CrmActivity.aggregate([
                { $match: req.firmQuery },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            CrmActivity.aggregate([
                { $match: req.firmQuery },
                { $group: { _id: '$type', count: { $sum: 1 } } }
            ]),
            CrmActivity.aggregate([
                { $match: req.firmQuery },
                { $group: { _id: '$priority', count: { $sum: 1 } } }
            ]),
            CrmActivity.countDocuments({
                ...req.firmQuery,
                status: { $nin: ['completed', 'cancelled'] },
                dueDate: { $lt: new Date() }
            })
        ]);

        res.json({
            success: true,
            data: {
                byStatus: statusCounts.reduce((acc, item) => {
                    acc[item._id || 'unknown'] = item.count;
                    return acc;
                }, {}),
                byType: typeCounts.reduce((acc, item) => {
                    acc[item._id || 'unknown'] = item.count;
                    return acc;
                }, {}),
                byPriority: priorityCounts.reduce((acc, item) => {
                    acc[item._id || 'unknown'] = item.count;
                    return acc;
                }, {}),
                overdue: overdueTasks
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /overview - Get activity overview (upcoming, today, overdue)
 */
router.get('/overview', async (req, res, next) => {
    try {
        const now = new Date();
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));
        const endOfDay = new Date(now.setHours(23, 59, 59, 999));
        const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const [overdue, today, upcoming, recent] = await Promise.all([
            CrmActivity.find({
                ...req.firmQuery,
                status: { $nin: ['completed', 'cancelled'] },
                dueDate: { $lt: startOfDay }
            })
                .sort({ dueDate: 1 })
                .limit(10)
                .populate('assignedTo', 'firstName lastName')
                .lean(),
            CrmActivity.find({
                ...req.firmQuery,
                status: { $nin: ['completed', 'cancelled'] },
                dueDate: { $gte: startOfDay, $lte: endOfDay }
            })
                .sort({ dueDate: 1 })
                .populate('assignedTo', 'firstName lastName')
                .lean(),
            CrmActivity.find({
                ...req.firmQuery,
                status: { $nin: ['completed', 'cancelled'] },
                dueDate: { $gt: endOfDay, $lte: weekFromNow }
            })
                .sort({ dueDate: 1 })
                .limit(10)
                .populate('assignedTo', 'firstName lastName')
                .lean(),
            CrmActivity.find({
                ...req.firmQuery,
                status: 'completed'
            })
                .sort({ completedAt: -1 })
                .limit(5)
                .populate('assignedTo', 'firstName lastName')
                .lean()
        ]);

        res.json({
            success: true,
            data: {
                overdue,
                today,
                upcoming,
                recentlyCompleted: recent
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /stats - Get activity statistics
 */
router.get('/stats', async (req, res, next) => {
    try {
        const { dateFrom, dateTo } = req.query;
        const matchQuery = { ...req.firmQuery };

        if (dateFrom || dateTo) {
            matchQuery.createdAt = {};
            if (dateFrom) matchQuery.createdAt.$gte = new Date(dateFrom);
            if (dateTo) matchQuery.createdAt.$lte = new Date(dateTo);
        }

        const [total, completed, completionRate, avgDuration, byAssignee] = await Promise.all([
            CrmActivity.countDocuments(matchQuery),
            CrmActivity.countDocuments({ ...matchQuery, status: 'completed' }),
            CrmActivity.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
                    }
                },
                {
                    $project: {
                        rate: { $cond: [{ $eq: ['$total', 0] }, 0, { $multiply: [{ $divide: ['$completed', '$total'] }, 100] }] }
                    }
                }
            ]),
            CrmActivity.aggregate([
                { $match: { ...matchQuery, status: 'completed', completedAt: { $exists: true } } },
                {
                    $project: {
                        duration: { $subtract: ['$completedAt', '$createdAt'] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgDuration: { $avg: '$duration' }
                    }
                }
            ]),
            CrmActivity.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: '$assignedTo',
                        total: { $sum: 1 },
                        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'assignee'
                    }
                },
                { $unwind: { path: '$assignee', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        assigneeName: { $concat: ['$assignee.firstName', ' ', '$assignee.lastName'] },
                        total: 1,
                        completed: 1,
                        completionRate: { $cond: [{ $eq: ['$total', 0] }, 0, { $multiply: [{ $divide: ['$completed', '$total'] }, 100] }] }
                    }
                },
                { $sort: { total: -1 } },
                { $limit: 10 }
            ])
        ]);

        res.json({
            success: true,
            data: {
                total,
                completed,
                completionRate: completionRate[0]?.rate || 0,
                averageDurationMs: avgDuration[0]?.avgDuration || 0,
                byAssignee
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /my - Get current user's activities
 */
router.get('/my', async (req, res, next) => {
    try {
        const { page, limit, skip } = sanitizePagination(req.query.page, req.query.limit);
        const { status, priority } = req.query;

        const query = {
            ...req.firmQuery,
            assignedTo: new mongoose.Types.ObjectId(req.userID)
        };

        if (status) {
            if (!VALID_STATUSES.includes(status)) {
                throw CustomException(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, 400);
            }
            query.status = status;
        }
        if (priority) {
            if (!VALID_PRIORITIES.includes(priority)) {
                throw CustomException(`Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`, 400);
            }
            query.priority = priority;
        }

        const [activities, total] = await Promise.all([
            CrmActivity.find(query)
                .sort({ dueDate: 1 })
                .skip(skip)
                .limit(limit)
                .populate('relatedTo')
                .lean(),
            CrmActivity.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: activities,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /types - Get activity types
 */
router.get('/types', async (req, res, next) => {
    try {
        const firm = await Firm.findOne(req.firmQuery).select('settings.activityTypes').lean();

        const defaultTypes = [
            { id: 'call', name: 'Call', icon: 'phone', color: '#4CAF50', defaultDuration: 30 },
            { id: 'meeting', name: 'Meeting', icon: 'users', color: '#2196F3', defaultDuration: 60 },
            { id: 'email', name: 'Email', icon: 'mail', color: '#9C27B0', defaultDuration: 15 },
            { id: 'task', name: 'Task', icon: 'check-circle', color: '#FF9800', defaultDuration: 60 },
            { id: 'follow-up', name: 'Follow-up', icon: 'arrow-right', color: '#607D8B', defaultDuration: 30 }
        ];

        const types = firm?.settings?.activityTypes || defaultTypes;

        res.json({
            success: true,
            data: types
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /types - Create activity type
 */
router.post('/types', async (req, res, next) => {
    try {
        const safeData = pickAllowedFields(req.body, ALLOWED_TYPE_FIELDS);

        if (!safeData.name) {
            throw CustomException('Activity type name is required', 400);
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        // Initialize settings if not exists
        if (!firm.settings) firm.settings = {};
        if (!firm.settings.activityTypes) firm.settings.activityTypes = [];

        // Check for duplicate
        const existing = firm.settings.activityTypes.find(
            t => t.name.toLowerCase() === safeData.name.toLowerCase()
        );
        if (existing) {
            throw CustomException('Activity type with this name already exists', 400);
        }

        const newType = {
            id: safeData.name.toLowerCase().replace(/\s+/g, '-'),
            ...safeData,
            isActive: safeData.isActive !== false,
            createdAt: new Date()
        };

        firm.settings.activityTypes.push(newType);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Activity type created successfully',
            data: newType
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /types/:id - Get activity type by ID
 */
router.get('/types/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const firm = await Firm.findOne(req.firmQuery).select('settings.activityTypes').lean();

        const type = firm?.settings?.activityTypes?.find(t => t.id === id);
        if (!type) {
            throw CustomException('Activity type not found', 404);
        }

        res.json({
            success: true,
            data: type
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /types/:id - Update activity type
 */
router.put('/types/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const safeData = pickAllowedFields(req.body, ALLOWED_TYPE_FIELDS);

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const typeIndex = firm.settings?.activityTypes?.findIndex(t => t.id === id);
        if (typeIndex === -1 || typeIndex === undefined) {
            throw CustomException('Activity type not found', 404);
        }

        // Check for duplicate name if name is being changed
        if (safeData.name && safeData.name !== firm.settings.activityTypes[typeIndex].name) {
            const existing = firm.settings.activityTypes.find(
                (t, i) => i !== typeIndex && t.name.toLowerCase() === safeData.name.toLowerCase()
            );
            if (existing) {
                throw CustomException('Activity type with this name already exists', 400);
            }
        }

        Object.assign(firm.settings.activityTypes[typeIndex], safeData, { updatedAt: new Date() });
        await firm.save();

        res.json({
            success: true,
            message: 'Activity type updated successfully',
            data: firm.settings.activityTypes[typeIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /types/:id - Delete activity type
 */
router.delete('/types/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const typeIndex = firm.settings?.activityTypes?.findIndex(t => t.id === id);
        if (typeIndex === -1 || typeIndex === undefined) {
            throw CustomException('Activity type not found', 404);
        }

        // Check if type is in use
        const activitiesUsingType = await CrmActivity.countDocuments({
            ...req.firmQuery,
            type: firm.settings.activityTypes[typeIndex].name
        });

        if (activitiesUsingType > 0) {
            throw CustomException(`Cannot delete activity type. ${activitiesUsingType} activities are using this type.`, 400);
        }

        firm.settings.activityTypes.splice(typeIndex, 1);
        await firm.save();

        res.json({
            success: true,
            message: 'Activity type deleted successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /entity/:entityType/:entityId - Get activities for a specific entity
 */
router.get('/entity/:entityType/:entityId', async (req, res, next) => {
    try {
        const { entityType, entityId } = req.params;
        const { limit = 20 } = req.query;

        if (!VALID_ENTITY_TYPES.includes(entityType)) {
            throw CustomException(`Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`, 400);
        }

        const sanitizedEntityId = sanitizeObjectId(entityId, 'entityId');
        const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);

        const activities = await CrmActivity.find({
            ...req.firmQuery,
            relatedTo: sanitizedEntityId,
            relatedModel: entityType.charAt(0).toUpperCase() + entityType.slice(1)
        })
            .sort({ createdAt: -1 })
            .limit(parsedLimit)
            .populate('assignedTo', 'firstName lastName')
            .populate('createdBy', 'firstName lastName')
            .lean();

        res.json({
            success: true,
            data: activities
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:id - Get activity by ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');

        const activity = await CrmActivity.findOne({ _id: id, ...req.firmQuery })
            .populate('assignedTo', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName')
            .populate('relatedTo')
            .lean();

        if (!activity) {
            throw CustomException('Activity not found', 404);
        }

        res.json({
            success: true,
            data: activity
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /:id - Update activity
 */
router.put('/:id', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');
        const safeData = pickAllowedFields(req.body, ALLOWED_ACTIVITY_FIELDS);

        // Sanitize ObjectIds
        if (safeData.assignedTo) {
            safeData.assignedTo = sanitizeObjectId(safeData.assignedTo, 'assignedTo');
        }
        if (safeData.relatedTo) {
            safeData.relatedTo = sanitizeObjectId(safeData.relatedTo, 'relatedTo');
        }

        // Validate priority
        if (safeData.priority && !VALID_PRIORITIES.includes(safeData.priority)) {
            throw CustomException(`Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`, 400);
        }

        // Validate status
        if (safeData.status && !VALID_STATUSES.includes(safeData.status)) {
            throw CustomException(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, 400);
        }

        safeData.updatedBy = req.userID;
        safeData.updatedAt = new Date();

        const activity = await CrmActivity.findOneAndUpdate(
            { _id: id, ...req.firmQuery },
            { $set: safeData },
            { new: true, runValidators: true }
        )
            .populate('assignedTo', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName');

        if (!activity) {
            throw CustomException('Activity not found', 404);
        }

        res.json({
            success: true,
            message: 'Activity updated successfully',
            data: activity
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:id - Delete activity
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');

        const activity = await CrmActivity.findOneAndDelete({ _id: id, ...req.firmQuery });

        if (!activity) {
            throw CustomException('Activity not found', 404);
        }

        res.json({
            success: true,
            message: 'Activity deleted successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/done - Mark activity as done
 */
router.post('/:id/done', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');
        const { outcome, notes } = req.body;

        const activity = await CrmActivity.findOne({ _id: id, ...req.firmQuery });

        if (!activity) {
            throw CustomException('Activity not found', 404);
        }

        if (activity.status === 'completed') {
            throw CustomException('Activity is already completed', 400);
        }
        if (activity.status === 'cancelled') {
            throw CustomException('Cannot complete a cancelled activity', 400);
        }

        activity.status = 'completed';
        activity.completedAt = new Date();
        activity.completedBy = req.userID;
        if (outcome) activity.outcome = outcome;
        if (notes) activity.notes = notes;

        await activity.save();

        res.json({
            success: true,
            message: 'Activity marked as done',
            data: activity
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/cancel - Cancel activity
 */
router.post('/:id/cancel', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');
        const { reason } = req.body;

        const activity = await CrmActivity.findOne({ _id: id, ...req.firmQuery });

        if (!activity) {
            throw CustomException('Activity not found', 404);
        }

        if (activity.status === 'completed') {
            throw CustomException('Cannot cancel a completed activity', 400);
        }
        if (activity.status === 'cancelled') {
            throw CustomException('Activity is already cancelled', 400);
        }

        activity.status = 'cancelled';
        activity.cancelledAt = new Date();
        activity.cancelledBy = req.userID;
        if (reason) activity.cancellationReason = reason;

        await activity.save();

        res.json({
            success: true,
            message: 'Activity cancelled',
            data: activity
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/reschedule - Reschedule activity
 */
router.post('/:id/reschedule', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');
        const { dueDate, reason } = req.body;

        if (!dueDate) {
            throw CustomException('New due date is required', 400);
        }

        const newDueDate = new Date(dueDate);
        if (isNaN(newDueDate.getTime())) {
            throw CustomException('Invalid date format', 400);
        }

        const activity = await CrmActivity.findOne({ _id: id, ...req.firmQuery });

        if (!activity) {
            throw CustomException('Activity not found', 404);
        }

        if (activity.status === 'completed') {
            throw CustomException('Cannot reschedule a completed activity', 400);
        }
        if (activity.status === 'cancelled') {
            throw CustomException('Cannot reschedule a cancelled activity', 400);
        }

        const previousDueDate = activity.dueDate;
        activity.dueDate = newDueDate;
        activity.status = 'pending'; // Reset status if it was overdue

        // Track reschedule history
        if (!activity.rescheduleHistory) activity.rescheduleHistory = [];
        activity.rescheduleHistory.push({
            previousDate: previousDueDate,
            newDate: newDueDate,
            reason,
            rescheduledBy: req.userID,
            rescheduledAt: new Date()
        });

        await activity.save();

        res.json({
            success: true,
            message: 'Activity rescheduled',
            data: activity
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/reassign - Reassign activity
 */
router.post('/:id/reassign', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');
        const { assignedTo, reason } = req.body;

        if (!assignedTo) {
            throw CustomException('New assignee is required', 400);
        }

        const newAssignee = sanitizeObjectId(assignedTo, 'assignedTo');

        const activity = await CrmActivity.findOne({ _id: id, ...req.firmQuery });

        if (!activity) {
            throw CustomException('Activity not found', 404);
        }

        if (activity.status === 'completed') {
            throw CustomException('Cannot reassign a completed activity', 400);
        }
        if (activity.status === 'cancelled') {
            throw CustomException('Cannot reassign a cancelled activity', 400);
        }

        const previousAssignee = activity.assignedTo;
        activity.assignedTo = newAssignee;

        // Track reassignment history
        if (!activity.reassignmentHistory) activity.reassignmentHistory = [];
        activity.reassignmentHistory.push({
            previousAssignee,
            newAssignee,
            reason,
            reassignedBy: req.userID,
            reassignedAt: new Date()
        });

        await activity.save();
        await activity.populate('assignedTo', 'firstName lastName email');

        res.json({
            success: true,
            message: 'Activity reassigned',
            data: activity
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
