/**
 * Chatter Activities Extended Routes
 *
 * Activity management for Odoo-style chatter functionality.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - GET /:resModel/:resId        - Get activities for a record
 * - GET /me                      - Get my activities
 * - POST /                       - Create activity
 * - PATCH /:activityId           - Update activity
 * - DELETE /:activityId          - Delete activity
 * - POST /:activityId/complete   - Mark activity complete
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const User = require('../models/user.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

// Valid resource models
const VALID_RESOURCE_MODELS = [
    'case', 'task', 'lead', 'contact', 'invoice', 'document',
    'opportunity', 'ticket', 'project', 'appointment'
];

// Valid activity types
const VALID_ACTIVITY_TYPES = [
    'call', 'email', 'meeting', 'task', 'note', 'reminder',
    'follow_up', 'deadline', 'review', 'approval'
];

// Allowed activity fields
const ALLOWED_ACTIVITY_FIELDS = [
    'type', 'summary', 'note', 'dueDate', 'assignedTo',
    'priority', 'isAutomated', 'metadata'
];

/**
 * GET /:resModel/:resId - Get activities for a record
 */
router.get('/:resModel/:resId', async (req, res, next) => {
    try {
        const { resModel, resId } = req.params;
        const { page, limit } = sanitizePagination(req.query);
        const { type, status, assignedTo } = req.query;

        if (!VALID_RESOURCE_MODELS.includes(resModel)) {
            throw CustomException(`Invalid resource model. Must be one of: ${VALID_RESOURCE_MODELS.join(', ')}`, 400);
        }

        const safeResId = sanitizeObjectId(resId, 'resId');

        const firm = await Firm.findOne(req.firmQuery).select('chatter.activities').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        // Filter activities for this resource
        let activities = (firm.chatter?.activities || []).filter(
            a => a.resModel === resModel && a.resId?.toString() === safeResId.toString()
        );

        // Apply filters
        if (type) {
            activities = activities.filter(a => a.type === type);
        }

        if (status) {
            if (status === 'completed') {
                activities = activities.filter(a => a.completedAt);
            } else if (status === 'pending') {
                activities = activities.filter(a => !a.completedAt);
            } else if (status === 'overdue') {
                const now = new Date();
                activities = activities.filter(a => !a.completedAt && a.dueDate && new Date(a.dueDate) < now);
            }
        }

        if (assignedTo) {
            const safeAssignedTo = sanitizeObjectId(assignedTo, 'assignedTo');
            activities = activities.filter(a => a.assignedTo?.toString() === safeAssignedTo.toString());
        }

        // Sort by due date (oldest first), then by created date
        activities.sort((a, b) => {
            if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate) - new Date(b.dueDate);
            }
            if (a.dueDate && !b.dueDate) return -1;
            if (!a.dueDate && b.dueDate) return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        const total = activities.length;
        activities = activities.slice((page - 1) * limit, page * limit);

        // Get user details
        const userIds = new Set();
        activities.forEach(a => {
            if (a.assignedTo) userIds.add(a.assignedTo.toString());
            if (a.createdBy) userIds.add(a.createdBy.toString());
            if (a.completedBy) userIds.add(a.completedBy.toString());
        });

        const users = await User.find({ _id: { $in: Array.from(userIds) } })
            .select('firstName lastName email avatar')
            .lean();

        const usersMap = {};
        users.forEach(u => {
            usersMap[u._id.toString()] = u;
        });

        // Enrich activities
        const enrichedActivities = activities.map(a => ({
            ...a,
            assignedToUser: usersMap[a.assignedTo?.toString()] || null,
            createdByUser: usersMap[a.createdBy?.toString()] || null,
            completedByUser: usersMap[a.completedBy?.toString()] || null,
            isOverdue: !a.completedAt && a.dueDate && new Date(a.dueDate) < new Date()
        }));

        res.json({
            success: true,
            data: enrichedActivities,
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
 * GET /me - Get my activities
 */
router.get('/me', async (req, res, next) => {
    try {
        const { page, limit } = sanitizePagination(req.query);
        const { type, status, resModel } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('chatter.activities').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        // Filter activities assigned to current user
        let activities = (firm.chatter?.activities || []).filter(
            a => a.assignedTo?.toString() === req.userID
        );

        // Apply filters
        if (type) {
            activities = activities.filter(a => a.type === type);
        }

        if (resModel) {
            activities = activities.filter(a => a.resModel === resModel);
        }

        if (status) {
            if (status === 'completed') {
                activities = activities.filter(a => a.completedAt);
            } else if (status === 'pending') {
                activities = activities.filter(a => !a.completedAt);
            } else if (status === 'overdue') {
                const now = new Date();
                activities = activities.filter(a => !a.completedAt && a.dueDate && new Date(a.dueDate) < now);
            }
        }

        // Sort: overdue first, then by due date
        const now = new Date();
        activities.sort((a, b) => {
            const aOverdue = !a.completedAt && a.dueDate && new Date(a.dueDate) < now;
            const bOverdue = !b.completedAt && b.dueDate && new Date(b.dueDate) < now;

            if (aOverdue && !bOverdue) return -1;
            if (!aOverdue && bOverdue) return 1;

            if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate) - new Date(b.dueDate);
            }
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        const total = activities.length;
        activities = activities.slice((page - 1) * limit, page * limit);

        // Calculate summary
        const allMyActivities = (firm.chatter?.activities || []).filter(
            a => a.assignedTo?.toString() === req.userID
        );

        const summary = {
            total: allMyActivities.length,
            pending: allMyActivities.filter(a => !a.completedAt).length,
            completed: allMyActivities.filter(a => a.completedAt).length,
            overdue: allMyActivities.filter(a => !a.completedAt && a.dueDate && new Date(a.dueDate) < now).length,
            dueToday: allMyActivities.filter(a => {
                if (a.completedAt || !a.dueDate) return false;
                const due = new Date(a.dueDate);
                return due.toDateString() === now.toDateString();
            }).length
        };

        // Enrich with overdue flag
        const enrichedActivities = activities.map(a => ({
            ...a,
            isOverdue: !a.completedAt && a.dueDate && new Date(a.dueDate) < now
        }));

        res.json({
            success: true,
            data: enrichedActivities,
            summary,
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
 * POST / - Create activity
 */
router.post('/', async (req, res, next) => {
    try {
        const { resModel, resId } = req.body;
        const safeData = pickAllowedFields(req.body, ALLOWED_ACTIVITY_FIELDS);

        if (!resModel || !resId) {
            throw CustomException('Resource model and ID are required', 400);
        }

        if (!VALID_RESOURCE_MODELS.includes(resModel)) {
            throw CustomException(`Invalid resource model. Must be one of: ${VALID_RESOURCE_MODELS.join(', ')}`, 400);
        }

        if (!safeData.type) {
            throw CustomException('Activity type is required', 400);
        }

        if (!VALID_ACTIVITY_TYPES.includes(safeData.type)) {
            throw CustomException(`Invalid activity type. Must be one of: ${VALID_ACTIVITY_TYPES.join(', ')}`, 400);
        }

        const safeResId = sanitizeObjectId(resId, 'resId');

        // Validate assignedTo if provided
        if (safeData.assignedTo) {
            safeData.assignedTo = sanitizeObjectId(safeData.assignedTo, 'assignedTo');
        } else {
            safeData.assignedTo = req.userID; // Default to self
        }

        const firm = await Firm.findOne(req.firmQuery).select('chatter.activities');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.chatter) firm.chatter = {};
        if (!firm.chatter.activities) firm.chatter.activities = [];

        const activity = {
            _id: new mongoose.Types.ObjectId(),
            resModel,
            resId: safeResId,
            ...safeData,
            dueDate: safeData.dueDate ? new Date(safeData.dueDate) : null,
            priority: safeData.priority || 'normal',
            createdBy: req.userID,
            createdAt: new Date()
        };

        firm.chatter.activities.push(activity);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Activity created',
            data: activity
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /:activityId - Update activity
 */
router.patch('/:activityId', async (req, res, next) => {
    try {
        const activityId = sanitizeObjectId(req.params.activityId, 'activityId');
        const safeData = pickAllowedFields(req.body, ALLOWED_ACTIVITY_FIELDS);

        // Validate type if changing
        if (safeData.type && !VALID_ACTIVITY_TYPES.includes(safeData.type)) {
            throw CustomException(`Invalid activity type. Must be one of: ${VALID_ACTIVITY_TYPES.join(', ')}`, 400);
        }

        // Validate assignedTo if changing
        if (safeData.assignedTo) {
            safeData.assignedTo = sanitizeObjectId(safeData.assignedTo, 'assignedTo');
        }

        const firm = await Firm.findOne(req.firmQuery).select('chatter.activities');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const activity = (firm.chatter?.activities || []).find(
            a => a._id?.toString() === activityId.toString()
        );

        if (!activity) {
            throw CustomException('Activity not found', 404);
        }

        // Check if already completed
        if (activity.completedAt) {
            throw CustomException('Cannot update completed activity', 400);
        }

        // Apply updates
        Object.assign(activity, safeData);
        if (safeData.dueDate) {
            activity.dueDate = new Date(safeData.dueDate);
        }
        activity.updatedBy = req.userID;
        activity.updatedAt = new Date();

        await firm.save();

        res.json({
            success: true,
            message: 'Activity updated',
            data: activity
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:activityId - Delete activity
 */
router.delete('/:activityId', async (req, res, next) => {
    try {
        const activityId = sanitizeObjectId(req.params.activityId, 'activityId');

        const firm = await Firm.findOne(req.firmQuery).select('chatter.activities');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const activityIndex = (firm.chatter?.activities || []).findIndex(
            a => a._id?.toString() === activityId.toString()
        );

        if (activityIndex === -1) {
            throw CustomException('Activity not found', 404);
        }

        firm.chatter.activities.splice(activityIndex, 1);
        await firm.save();

        res.json({
            success: true,
            message: 'Activity deleted'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:activityId/complete - Mark activity complete
 */
router.post('/:activityId/complete', async (req, res, next) => {
    try {
        const activityId = sanitizeObjectId(req.params.activityId, 'activityId');
        const { feedback, outcome } = req.body;

        const firm = await Firm.findOne(req.firmQuery).select('chatter.activities');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const activity = (firm.chatter?.activities || []).find(
            a => a._id?.toString() === activityId.toString()
        );

        if (!activity) {
            throw CustomException('Activity not found', 404);
        }

        if (activity.completedAt) {
            throw CustomException('Activity is already completed', 400);
        }

        activity.completedAt = new Date();
        activity.completedBy = req.userID;
        activity.feedback = feedback;
        activity.outcome = outcome;

        await firm.save();

        res.json({
            success: true,
            message: 'Activity marked as complete',
            data: {
                activityId,
                completedAt: activity.completedAt,
                outcome
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
