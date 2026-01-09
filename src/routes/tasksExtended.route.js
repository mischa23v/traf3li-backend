/**
 * Tasks Extended Routes
 *
 * Extended task management with subtasks, time tracking, and bulk operations.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - PATCH /:taskId/subtasks/reorder   - Reorder subtasks
 * - POST /:taskId/time-tracking/start - Start time tracking
 * - POST /:taskId/time-tracking/stop  - Stop time tracking
 * - POST /:taskId/time-tracking/manual - Add manual time entry
 * - GET /:taskId/time-tracking        - Get time entries
 * - DELETE /:taskId/time-tracking/:entryId - Delete time entry
 * - POST /:taskId/watchers            - Add watcher
 * - DELETE /:taskId/watchers/:userId  - Remove watcher
 * - POST /:taskId/dependencies        - Add dependency
 * - DELETE /:taskId/dependencies/:depId - Remove dependency
 * - POST /:taskId/recurring           - Set recurring schedule
 * - DELETE /:taskId/recurring         - Remove recurring schedule
 * - POST /:taskId/convert-to-case     - Convert task to case
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Task = require('../models/task.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

// Allowed fields for time tracking
const ALLOWED_TIME_ENTRY_FIELDS = [
    'description', 'startTime', 'endTime', 'duration',
    'billable', 'rate', 'notes'
];

// Allowed fields for recurring
const ALLOWED_RECURRING_FIELDS = [
    'frequency', 'interval', 'daysOfWeek', 'dayOfMonth',
    'endDate', 'occurrences', 'skipWeekends'
];

/**
 * PATCH /:taskId/subtasks/reorder - Reorder subtasks
 */
router.patch('/:taskId/subtasks/reorder', async (req, res, next) => {
    try {
        const taskId = sanitizeObjectId(req.params.taskId, 'taskId');
        const { subtaskOrder } = req.body;

        if (!Array.isArray(subtaskOrder)) {
            throw CustomException('Subtask order array is required', 400);
        }

        const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
        if (!task) {
            throw CustomException('Task not found', 404);
        }

        // Validate all subtask IDs exist
        const existingSubtaskIds = (task.subtasks || []).map(s => s._id?.toString());
        const sanitizedOrder = subtaskOrder.map(id => sanitizeObjectId(id, 'subtaskId').toString());

        for (const id of sanitizedOrder) {
            if (!existingSubtaskIds.includes(id)) {
                throw CustomException(`Subtask ${id} not found`, 404);
            }
        }

        // Reorder subtasks
        const reorderedSubtasks = [];
        for (const id of sanitizedOrder) {
            const subtask = task.subtasks.find(s => s._id?.toString() === id);
            if (subtask) {
                reorderedSubtasks.push(subtask);
            }
        }

        // Add any subtasks not in the order array at the end
        for (const subtask of task.subtasks) {
            if (!sanitizedOrder.includes(subtask._id?.toString())) {
                reorderedSubtasks.push(subtask);
            }
        }

        task.subtasks = reorderedSubtasks;
        task.updatedBy = req.userID;
        await task.save();

        res.json({
            success: true,
            message: 'Subtasks reordered',
            data: task.subtasks
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:taskId/time-tracking/start - Start time tracking
 */
router.post('/:taskId/time-tracking/start', async (req, res, next) => {
    try {
        const taskId = sanitizeObjectId(req.params.taskId, 'taskId');
        const { description } = req.body;

        const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
        if (!task) {
            throw CustomException('Task not found', 404);
        }

        // Check for active time entry
        if (!task.timeEntries) task.timeEntries = [];
        const activeEntry = task.timeEntries.find(e => e.isActive && e.userId?.toString() === req.userID);

        if (activeEntry) {
            throw CustomException('You already have an active time tracking session', 400);
        }

        const timeEntry = {
            _id: new mongoose.Types.ObjectId(),
            userId: req.userID,
            startTime: new Date(),
            description,
            isActive: true,
            createdAt: new Date()
        };

        task.timeEntries.push(timeEntry);
        task.updatedBy = req.userID;
        await task.save();

        res.status(201).json({
            success: true,
            message: 'Time tracking started',
            data: timeEntry
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:taskId/time-tracking/stop - Stop time tracking
 */
router.post('/:taskId/time-tracking/stop', async (req, res, next) => {
    try {
        const taskId = sanitizeObjectId(req.params.taskId, 'taskId');
        const { notes } = req.body;

        const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
        if (!task) {
            throw CustomException('Task not found', 404);
        }

        const activeEntry = (task.timeEntries || []).find(
            e => e.isActive && e.userId?.toString() === req.userID
        );

        if (!activeEntry) {
            throw CustomException('No active time tracking session found', 400);
        }

        activeEntry.endTime = new Date();
        activeEntry.isActive = false;
        activeEntry.duration = Math.round((activeEntry.endTime - new Date(activeEntry.startTime)) / 1000 / 60); // minutes
        if (notes) activeEntry.notes = notes;
        activeEntry.updatedAt = new Date();

        task.updatedBy = req.userID;
        await task.save();

        res.json({
            success: true,
            message: 'Time tracking stopped',
            data: activeEntry
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:taskId/time-tracking/manual - Add manual time entry
 */
router.post('/:taskId/time-tracking/manual', async (req, res, next) => {
    try {
        const taskId = sanitizeObjectId(req.params.taskId, 'taskId');
        const safeData = pickAllowedFields(req.body, ALLOWED_TIME_ENTRY_FIELDS);

        if (!safeData.duration && (!safeData.startTime || !safeData.endTime)) {
            throw CustomException('Either duration or start/end time is required', 400);
        }

        const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
        if (!task) {
            throw CustomException('Task not found', 404);
        }

        let duration = safeData.duration;
        if (!duration && safeData.startTime && safeData.endTime) {
            duration = Math.round((new Date(safeData.endTime) - new Date(safeData.startTime)) / 1000 / 60);
        }

        const timeEntry = {
            _id: new mongoose.Types.ObjectId(),
            userId: req.userID,
            ...safeData,
            startTime: safeData.startTime ? new Date(safeData.startTime) : new Date(),
            endTime: safeData.endTime ? new Date(safeData.endTime) : null,
            duration,
            isActive: false,
            isManual: true,
            createdAt: new Date()
        };

        if (!task.timeEntries) task.timeEntries = [];
        task.timeEntries.push(timeEntry);
        task.updatedBy = req.userID;
        await task.save();

        res.status(201).json({
            success: true,
            message: 'Time entry added',
            data: timeEntry
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:taskId/time-tracking - Get time entries
 */
router.get('/:taskId/time-tracking', async (req, res, next) => {
    try {
        const taskId = sanitizeObjectId(req.params.taskId, 'taskId');

        const task = await Task.findOne({ _id: taskId, ...req.firmQuery })
            .select('timeEntries')
            .lean();

        if (!task) {
            throw CustomException('Task not found', 404);
        }

        const timeEntries = task.timeEntries || [];
        timeEntries.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

        const totalDuration = timeEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
        const billableDuration = timeEntries
            .filter(e => e.billable)
            .reduce((sum, e) => sum + (e.duration || 0), 0);

        res.json({
            success: true,
            data: {
                entries: timeEntries,
                summary: {
                    totalEntries: timeEntries.length,
                    totalDuration, // minutes
                    totalHours: Math.round((totalDuration / 60) * 100) / 100,
                    billableDuration,
                    billableHours: Math.round((billableDuration / 60) * 100) / 100
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:taskId/time-tracking/:entryId - Delete time entry
 */
router.delete('/:taskId/time-tracking/:entryId', async (req, res, next) => {
    try {
        const taskId = sanitizeObjectId(req.params.taskId, 'taskId');
        const entryId = sanitizeObjectId(req.params.entryId, 'entryId');

        const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
        if (!task) {
            throw CustomException('Task not found', 404);
        }

        const entryIndex = (task.timeEntries || []).findIndex(
            e => e._id?.toString() === entryId.toString()
        );

        if (entryIndex === -1) {
            throw CustomException('Time entry not found', 404);
        }

        task.timeEntries.splice(entryIndex, 1);
        task.updatedBy = req.userID;
        await task.save();

        res.json({
            success: true,
            message: 'Time entry deleted'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:taskId/watchers - Add watcher
 */
router.post('/:taskId/watchers', async (req, res, next) => {
    try {
        const taskId = sanitizeObjectId(req.params.taskId, 'taskId');
        const { userId } = req.body;

        if (!userId) {
            throw CustomException('User ID is required', 400);
        }

        const watcherUserId = sanitizeObjectId(userId, 'userId');

        const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
        if (!task) {
            throw CustomException('Task not found', 404);
        }

        if (!task.watchers) task.watchers = [];

        // Check if already watching
        if (task.watchers.some(w => w.toString() === watcherUserId.toString())) {
            throw CustomException('User is already watching this task', 400);
        }

        task.watchers.push(watcherUserId);
        task.updatedBy = req.userID;
        await task.save();

        res.status(201).json({
            success: true,
            message: 'Watcher added',
            data: { userId: watcherUserId }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:taskId/watchers/:userId - Remove watcher
 */
router.delete('/:taskId/watchers/:userId', async (req, res, next) => {
    try {
        const taskId = sanitizeObjectId(req.params.taskId, 'taskId');
        const userId = sanitizeObjectId(req.params.userId, 'userId');

        const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
        if (!task) {
            throw CustomException('Task not found', 404);
        }

        const watcherIndex = (task.watchers || []).findIndex(
            w => w?.toString() === userId.toString()
        );

        if (watcherIndex === -1) {
            throw CustomException('Watcher not found', 404);
        }

        task.watchers.splice(watcherIndex, 1);
        task.updatedBy = req.userID;
        await task.save();

        res.json({
            success: true,
            message: 'Watcher removed'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:taskId/dependencies - Add dependency
 */
router.post('/:taskId/dependencies', async (req, res, next) => {
    try {
        const taskId = sanitizeObjectId(req.params.taskId, 'taskId');
        const { dependsOnTaskId, type = 'blocks' } = req.body;

        if (!dependsOnTaskId) {
            throw CustomException('Dependency task ID is required', 400);
        }

        const depTaskId = sanitizeObjectId(dependsOnTaskId, 'dependsOnTaskId');

        // Prevent self-dependency
        if (taskId.toString() === depTaskId.toString()) {
            throw CustomException('A task cannot depend on itself', 400);
        }

        const [task, dependsOnTask] = await Promise.all([
            Task.findOne({ _id: taskId, ...req.firmQuery }),
            Task.findOne({ _id: depTaskId, ...req.firmQuery })
        ]);

        if (!task) {
            throw CustomException('Task not found', 404);
        }
        if (!dependsOnTask) {
            throw CustomException('Dependency task not found', 404);
        }

        if (!task.dependencies) task.dependencies = [];

        // Check if dependency already exists
        if (task.dependencies.some(d => d.taskId?.toString() === depTaskId.toString())) {
            throw CustomException('This dependency already exists', 400);
        }

        const dependency = {
            _id: new mongoose.Types.ObjectId(),
            taskId: depTaskId,
            type, // 'blocks', 'blockedBy', 'relatesTo'
            createdAt: new Date(),
            createdBy: req.userID
        };

        task.dependencies.push(dependency);
        task.updatedBy = req.userID;
        await task.save();

        res.status(201).json({
            success: true,
            message: 'Dependency added',
            data: dependency
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:taskId/dependencies/:depId - Remove dependency
 */
router.delete('/:taskId/dependencies/:depId', async (req, res, next) => {
    try {
        const taskId = sanitizeObjectId(req.params.taskId, 'taskId');
        const depId = sanitizeObjectId(req.params.depId, 'depId');

        const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
        if (!task) {
            throw CustomException('Task not found', 404);
        }

        const depIndex = (task.dependencies || []).findIndex(
            d => d._id?.toString() === depId.toString()
        );

        if (depIndex === -1) {
            throw CustomException('Dependency not found', 404);
        }

        task.dependencies.splice(depIndex, 1);
        task.updatedBy = req.userID;
        await task.save();

        res.json({
            success: true,
            message: 'Dependency removed'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:taskId/recurring - Set recurring schedule
 */
router.post('/:taskId/recurring', async (req, res, next) => {
    try {
        const taskId = sanitizeObjectId(req.params.taskId, 'taskId');
        const safeData = pickAllowedFields(req.body, ALLOWED_RECURRING_FIELDS);

        if (!safeData.frequency) {
            throw CustomException('Frequency is required (daily, weekly, monthly, yearly)', 400);
        }

        const validFrequencies = ['daily', 'weekly', 'monthly', 'yearly'];
        if (!validFrequencies.includes(safeData.frequency)) {
            throw CustomException(`Invalid frequency. Must be one of: ${validFrequencies.join(', ')}`, 400);
        }

        const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
        if (!task) {
            throw CustomException('Task not found', 404);
        }

        task.recurring = {
            ...safeData,
            interval: safeData.interval || 1,
            isActive: true,
            nextOccurrence: calculateNextOccurrence(safeData),
            createdAt: new Date(),
            createdBy: req.userID
        };

        task.updatedBy = req.userID;
        await task.save();

        res.json({
            success: true,
            message: 'Recurring schedule set',
            data: task.recurring
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:taskId/recurring - Remove recurring schedule
 */
router.delete('/:taskId/recurring', async (req, res, next) => {
    try {
        const taskId = sanitizeObjectId(req.params.taskId, 'taskId');

        const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
        if (!task) {
            throw CustomException('Task not found', 404);
        }

        task.recurring = null;
        task.updatedBy = req.userID;
        await task.save();

        res.json({
            success: true,
            message: 'Recurring schedule removed'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:taskId/convert-to-case - Convert task to case
 */
router.post('/:taskId/convert-to-case', async (req, res, next) => {
    try {
        const taskId = sanitizeObjectId(req.params.taskId, 'taskId');
        const { caseType, clientId, additionalData } = req.body;

        const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
        if (!task) {
            throw CustomException('Task not found', 404);
        }

        // Create case data from task
        const Case = require('../models/case.model');

        const caseData = req.addFirmId({
            title: task.title,
            description: task.description,
            type: caseType || 'general',
            status: 'open',
            client: clientId ? sanitizeObjectId(clientId, 'clientId') : null,
            assignedTo: task.assignedTo,
            priority: task.priority,
            dueDate: task.dueDate,
            tags: task.tags,
            convertedFromTask: taskId,
            createdBy: req.userID,
            ...additionalData
        });

        const newCase = await Case.create(caseData);

        // Update task to mark as converted
        task.status = 'completed';
        task.convertedToCase = newCase._id;
        task.completedAt = new Date();
        task.updatedBy = req.userID;
        await task.save();

        res.status(201).json({
            success: true,
            message: 'Task converted to case',
            data: {
                taskId: task._id,
                caseId: newCase._id,
                caseNumber: newCase.caseNumber
            }
        });
    } catch (error) {
        next(error);
    }
});

// Helper function to calculate next occurrence
function calculateNextOccurrence(recurring) {
    const now = new Date();
    const interval = recurring.interval || 1;

    switch (recurring.frequency) {
        case 'daily':
            now.setDate(now.getDate() + interval);
            break;
        case 'weekly':
            now.setDate(now.getDate() + (7 * interval));
            break;
        case 'monthly':
            now.setMonth(now.getMonth() + interval);
            break;
        case 'yearly':
            now.setFullYear(now.getFullYear() + interval);
            break;
    }

    return now;
}

module.exports = router;
