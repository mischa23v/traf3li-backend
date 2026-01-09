/**
 * Reminders Extended Routes
 *
 * Extended reminder management with snooze, recurring, and bulk operations.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - POST /:id/reopen                - Reopen completed reminder
 * - POST /:id/cancel-snooze         - Cancel snooze
 * - POST /:id/recurring/skip        - Skip next occurrence
 * - POST /:id/recurring/stop        - Stop recurring
 * - POST /:id/recurring/resume      - Resume recurring
 * - GET /:id/occurrences            - Get occurrence history
 * - POST /:id/duplicate             - Duplicate reminder
 * - POST /bulk-snooze               - Bulk snooze reminders
 * - POST /bulk-complete             - Bulk complete reminders
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Reminder = require('../models/reminder.model');
const { CustomException } = require('../utils');
const { sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

/**
 * POST /:id/reopen - Reopen completed reminder
 */
router.post('/:id/reopen', async (req, res, next) => {
    try {
        const reminderId = sanitizeObjectId(req.params.id, 'id');
        const { newDueDate } = req.body;

        const reminder = await Reminder.findOne({ _id: reminderId, ...req.firmQuery });
        if (!reminder) {
            throw CustomException('Reminder not found', 404);
        }

        if (reminder.status !== 'completed' && reminder.status !== 'dismissed') {
            throw CustomException('Reminder is not completed or dismissed', 400);
        }

        reminder.status = 'pending';
        reminder.completedAt = null;
        reminder.completedBy = null;

        if (newDueDate) {
            reminder.dueDate = new Date(newDueDate);
        } else {
            // Set to tomorrow if no date provided
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            reminder.dueDate = tomorrow;
        }

        reminder.updatedBy = req.userID;
        await reminder.save();

        res.json({
            success: true,
            message: 'Reminder reopened',
            data: reminder
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/cancel-snooze - Cancel snooze
 */
router.post('/:id/cancel-snooze', async (req, res, next) => {
    try {
        const reminderId = sanitizeObjectId(req.params.id, 'id');

        const reminder = await Reminder.findOne({ _id: reminderId, ...req.firmQuery });
        if (!reminder) {
            throw CustomException('Reminder not found', 404);
        }

        if (!reminder.snoozedUntil) {
            throw CustomException('Reminder is not snoozed', 400);
        }

        // Restore original due date if we saved it
        if (reminder.originalDueDate) {
            reminder.dueDate = reminder.originalDueDate;
            reminder.originalDueDate = null;
        }

        reminder.snoozedUntil = null;
        reminder.snoozedAt = null;
        reminder.status = 'pending';
        reminder.updatedBy = req.userID;
        await reminder.save();

        res.json({
            success: true,
            message: 'Snooze cancelled',
            data: reminder
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/recurring/skip - Skip next occurrence
 */
router.post('/:id/recurring/skip', async (req, res, next) => {
    try {
        const reminderId = sanitizeObjectId(req.params.id, 'id');

        const reminder = await Reminder.findOne({ _id: reminderId, ...req.firmQuery });
        if (!reminder) {
            throw CustomException('Reminder not found', 404);
        }

        if (!reminder.recurring || !reminder.recurring.isActive) {
            throw CustomException('Reminder is not recurring', 400);
        }

        // Calculate next occurrence and skip to the one after
        const nextOccurrence = calculateNextOccurrence(reminder.recurring, reminder.dueDate);
        const skipToOccurrence = calculateNextOccurrence(reminder.recurring, nextOccurrence);

        // Log the skip
        if (!reminder.recurring.skippedOccurrences) {
            reminder.recurring.skippedOccurrences = [];
        }
        reminder.recurring.skippedOccurrences.push({
            date: nextOccurrence,
            skippedAt: new Date(),
            skippedBy: req.userID
        });

        reminder.dueDate = skipToOccurrence;
        reminder.recurring.nextOccurrence = skipToOccurrence;
        reminder.updatedBy = req.userID;
        await reminder.save();

        res.json({
            success: true,
            message: 'Next occurrence skipped',
            data: {
                skippedDate: nextOccurrence,
                newDueDate: skipToOccurrence
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/recurring/stop - Stop recurring
 */
router.post('/:id/recurring/stop', async (req, res, next) => {
    try {
        const reminderId = sanitizeObjectId(req.params.id, 'id');

        const reminder = await Reminder.findOne({ _id: reminderId, ...req.firmQuery });
        if (!reminder) {
            throw CustomException('Reminder not found', 404);
        }

        if (!reminder.recurring) {
            throw CustomException('Reminder is not recurring', 400);
        }

        reminder.recurring.isActive = false;
        reminder.recurring.stoppedAt = new Date();
        reminder.recurring.stoppedBy = req.userID;
        reminder.updatedBy = req.userID;
        await reminder.save();

        res.json({
            success: true,
            message: 'Recurring stopped',
            data: reminder
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/recurring/resume - Resume recurring
 */
router.post('/:id/recurring/resume', async (req, res, next) => {
    try {
        const reminderId = sanitizeObjectId(req.params.id, 'id');

        const reminder = await Reminder.findOne({ _id: reminderId, ...req.firmQuery });
        if (!reminder) {
            throw CustomException('Reminder not found', 404);
        }

        if (!reminder.recurring) {
            throw CustomException('Reminder is not recurring', 400);
        }

        if (reminder.recurring.isActive) {
            throw CustomException('Recurring is already active', 400);
        }

        reminder.recurring.isActive = true;
        reminder.recurring.stoppedAt = null;
        reminder.recurring.stoppedBy = null;
        reminder.recurring.resumedAt = new Date();
        reminder.recurring.resumedBy = req.userID;

        // Calculate next occurrence from now
        reminder.recurring.nextOccurrence = calculateNextOccurrence(reminder.recurring, new Date());
        reminder.dueDate = reminder.recurring.nextOccurrence;

        reminder.updatedBy = req.userID;
        await reminder.save();

        res.json({
            success: true,
            message: 'Recurring resumed',
            data: reminder
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:id/occurrences - Get occurrence history
 */
router.get('/:id/occurrences', async (req, res, next) => {
    try {
        const reminderId = sanitizeObjectId(req.params.id, 'id');
        const { page, limit, skip } = sanitizePagination(req.query.page, req.query.limit);

        const reminder = await Reminder.findOne({ _id: reminderId, ...req.firmQuery })
            .select('title recurring occurrenceHistory')
            .lean();

        if (!reminder) {
            throw CustomException('Reminder not found', 404);
        }

        const history = reminder.occurrenceHistory || [];
        history.sort((a, b) => new Date(b.date) - new Date(a.date));

        const total = history.length;
        const paginatedHistory = history.slice(skip, skip + limit);

        res.json({
            success: true,
            data: {
                reminderId: reminder._id,
                title: reminder.title,
                isRecurring: !!reminder.recurring?.isActive,
                occurrences: paginatedHistory,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/duplicate - Duplicate reminder
 */
router.post('/:id/duplicate', async (req, res, next) => {
    try {
        const reminderId = sanitizeObjectId(req.params.id, 'id');
        const { newTitle, newDueDate } = req.body;

        const original = await Reminder.findOne({ _id: reminderId, ...req.firmQuery }).lean();
        if (!original) {
            throw CustomException('Reminder not found', 404);
        }

        // Create duplicate
        const duplicateData = {
            ...original,
            _id: undefined,
            title: newTitle || `${original.title} (Copy)`,
            dueDate: newDueDate ? new Date(newDueDate) : original.dueDate,
            status: 'pending',
            completedAt: null,
            completedBy: null,
            createdBy: req.userID,
            createdAt: new Date(),
            updatedAt: null,
            updatedBy: null,
            occurrenceHistory: [],
            snoozedUntil: null,
            snoozedAt: null
        };

        // Reset recurring if present
        if (duplicateData.recurring) {
            duplicateData.recurring = {
                ...duplicateData.recurring,
                skippedOccurrences: [],
                stoppedAt: null,
                stoppedBy: null
            };
        }

        const duplicate = await Reminder.create(req.addFirmId(duplicateData));

        res.status(201).json({
            success: true,
            message: 'Reminder duplicated',
            data: duplicate
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /bulk-snooze - Bulk snooze reminders
 */
router.post('/bulk-snooze', async (req, res, next) => {
    try {
        const { reminderIds, snoozeUntil, snoozeDuration } = req.body;

        if (!Array.isArray(reminderIds) || reminderIds.length === 0) {
            throw CustomException('Reminder IDs array is required', 400);
        }

        if (reminderIds.length > 50) {
            throw CustomException('Maximum 50 reminders per request', 400);
        }

        if (!snoozeUntil && !snoozeDuration) {
            throw CustomException('snoozeUntil or snoozeDuration is required', 400);
        }

        const sanitizedIds = reminderIds.map(id => sanitizeObjectId(id, 'reminderId'));

        let snoozeDate;
        if (snoozeUntil) {
            snoozeDate = new Date(snoozeUntil);
        } else {
            snoozeDate = new Date();
            const duration = parseInt(snoozeDuration) || 60;
            snoozeDate.setMinutes(snoozeDate.getMinutes() + duration);
        }

        const result = await Reminder.updateMany(
            {
                _id: { $in: sanitizedIds },
                ...req.firmQuery,
                status: { $ne: 'completed' }
            },
            {
                $set: {
                    snoozedUntil: snoozeDate,
                    snoozedAt: new Date(),
                    status: 'snoozed',
                    updatedBy: req.userID,
                    updatedAt: new Date()
                }
            }
        );

        res.json({
            success: true,
            message: `Snoozed ${result.modifiedCount} reminders`,
            data: {
                snoozed: result.modifiedCount,
                snoozeUntil: snoozeDate
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /bulk-complete - Bulk complete reminders
 */
router.post('/bulk-complete', async (req, res, next) => {
    try {
        const { reminderIds, completionNote } = req.body;

        if (!Array.isArray(reminderIds) || reminderIds.length === 0) {
            throw CustomException('Reminder IDs array is required', 400);
        }

        if (reminderIds.length > 50) {
            throw CustomException('Maximum 50 reminders per request', 400);
        }

        const sanitizedIds = reminderIds.map(id => sanitizeObjectId(id, 'reminderId'));

        const result = await Reminder.updateMany(
            {
                _id: { $in: sanitizedIds },
                ...req.firmQuery,
                status: { $ne: 'completed' }
            },
            {
                $set: {
                    status: 'completed',
                    completedAt: new Date(),
                    completedBy: req.userID,
                    completionNote,
                    updatedBy: req.userID,
                    updatedAt: new Date()
                }
            }
        );

        res.json({
            success: true,
            message: `Completed ${result.modifiedCount} reminders`,
            data: {
                completed: result.modifiedCount
            }
        });
    } catch (error) {
        next(error);
    }
});

// Helper function to calculate next occurrence
function calculateNextOccurrence(recurring, fromDate) {
    const from = new Date(fromDate);
    const interval = recurring.interval || 1;

    switch (recurring.frequency) {
        case 'daily':
            from.setDate(from.getDate() + interval);
            break;
        case 'weekly':
            from.setDate(from.getDate() + (7 * interval));
            break;
        case 'monthly':
            from.setMonth(from.getMonth() + interval);
            break;
        case 'yearly':
            from.setFullYear(from.getFullYear() + interval);
            break;
        default:
            from.setDate(from.getDate() + 1);
    }

    return from;
}

module.exports = router;
