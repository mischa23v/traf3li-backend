/**
 * Events Extended Routes
 *
 * Extended routes for events at /api/events
 *
 * Security:
 * - Multi-tenant isolation via req.firmQuery
 * - Mass assignment protection via pickAllowedFields
 * - ID sanitization via sanitizeObjectId
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Event = require('../models/event.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

const ALLOWED_NOTE_FIELDS = ['content', 'isPrivate'];
const ALLOWED_COMMENT_FIELDS = ['content', 'parentId'];
const ALLOWED_ACTION_ITEM_FIELDS = ['title', 'assignedTo', 'dueDate', 'completed'];

/**
 * POST /api/events/:id/start
 * Start an event
 */
router.post('/:id/start', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid event ID format', 400);
        }

        const event = await Event.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            {
                $set: {
                    status: 'in_progress',
                    startedAt: new Date(),
                    startedBy: req.userID
                }
            },
            { new: true }
        );

        if (!event) {
            throw CustomException('Event not found', 404);
        }

        return res.json({
            success: true,
            message: 'Event started',
            data: event
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/events/:eventId/send-invitations
 * Send invitations to attendees
 */
router.post('/:eventId/send-invitations', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.eventId);
        if (!sanitizedId) {
            throw CustomException('Invalid event ID format', 400);
        }

        const { attendeeIds } = req.body;

        const event = await Event.findOne({ _id: sanitizedId, ...req.firmQuery });
        if (!event) {
            throw CustomException('Event not found', 404);
        }

        // Mark invitations as sent
        const updateQuery = attendeeIds && Array.isArray(attendeeIds)
            ? { 'attendees.userId': { $in: attendeeIds.map(id => sanitizeObjectId(id)).filter(Boolean) } }
            : {};

        await Event.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery, ...updateQuery },
            {
                $set: {
                    'attendees.$[].invitationSentAt': new Date(),
                    'attendees.$[].invitationSentBy': req.userID
                }
            }
        );

        return res.json({
            success: true,
            message: 'Invitations sent',
            data: { sentCount: attendeeIds?.length || event.attendees?.length || 0 }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/events/:eventId/attendees/:attendeeId/check-in
 * Check in an attendee
 */
router.post('/:eventId/attendees/:attendeeId/check-in', async (req, res) => {
    try {
        const eventId = sanitizeObjectId(req.params.eventId);
        const attendeeId = sanitizeObjectId(req.params.attendeeId);

        if (!eventId || !attendeeId) {
            throw CustomException('Invalid ID format', 400);
        }

        const event = await Event.findOneAndUpdate(
            {
                _id: eventId,
                ...req.firmQuery,
                'attendees.userId': attendeeId
            },
            {
                $set: {
                    'attendees.$.checkedInAt': new Date(),
                    'attendees.$.checkedInBy': req.userID,
                    'attendees.$.status': 'checked_in'
                }
            },
            { new: true }
        );

        if (!event) {
            throw CustomException('Event or attendee not found', 404);
        }

        return res.json({
            success: true,
            message: 'Attendee checked in',
            data: { checkedInAt: new Date() }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/events/:eventId/attendees/:attendeeId/check-out
 * Check out an attendee
 */
router.post('/:eventId/attendees/:attendeeId/check-out', async (req, res) => {
    try {
        const eventId = sanitizeObjectId(req.params.eventId);
        const attendeeId = sanitizeObjectId(req.params.attendeeId);

        if (!eventId || !attendeeId) {
            throw CustomException('Invalid ID format', 400);
        }

        const event = await Event.findOneAndUpdate(
            {
                _id: eventId,
                ...req.firmQuery,
                'attendees.userId': attendeeId
            },
            {
                $set: {
                    'attendees.$.checkedOutAt': new Date(),
                    'attendees.$.status': 'checked_out'
                }
            },
            { new: true }
        );

        if (!event) {
            throw CustomException('Event or attendee not found', 404);
        }

        return res.json({
            success: true,
            message: 'Attendee checked out',
            data: { checkedOutAt: new Date() }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/events/:eventId/notes
 * Update event notes
 */
router.patch('/:eventId/notes', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.eventId);
        if (!sanitizedId) {
            throw CustomException('Invalid event ID format', 400);
        }

        const allowedFields = pickAllowedFields(req.body, ALLOWED_NOTE_FIELDS);

        const event = await Event.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            {
                $set: {
                    notes: allowedFields.content,
                    notesUpdatedAt: new Date(),
                    notesUpdatedBy: req.userID
                }
            },
            { new: true }
        );

        if (!event) {
            throw CustomException('Event not found', 404);
        }

        return res.json({
            success: true,
            message: 'Notes updated',
            data: event
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/events/:eventId/action-items/:actionItemId/toggle
 * Toggle action item completion
 */
router.post('/:eventId/action-items/:actionItemId/toggle', async (req, res) => {
    try {
        const eventId = sanitizeObjectId(req.params.eventId);
        const actionItemId = sanitizeObjectId(req.params.actionItemId);

        if (!eventId || !actionItemId) {
            throw CustomException('Invalid ID format', 400);
        }

        const event = await Event.findOne({
            _id: eventId,
            ...req.firmQuery,
            'actionItems._id': actionItemId
        });

        if (!event) {
            throw CustomException('Event or action item not found', 404);
        }

        const actionItem = event.actionItems?.id(actionItemId);
        const newStatus = !actionItem?.completed;

        await Event.findOneAndUpdate(
            {
                _id: eventId,
                ...req.firmQuery,
                'actionItems._id': actionItemId
            },
            {
                $set: {
                    'actionItems.$.completed': newStatus,
                    'actionItems.$.completedAt': newStatus ? new Date() : null,
                    'actionItems.$.completedBy': newStatus ? req.userID : null
                }
            }
        );

        return res.json({
            success: true,
            message: `Action item ${newStatus ? 'completed' : 'reopened'}`,
            data: { completed: newStatus }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/events/:eventId/attachments
 * Add attachment to event
 */
router.post('/:eventId/attachments', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.eventId);
        if (!sanitizedId) {
            throw CustomException('Invalid event ID format', 400);
        }

        const { name, url, type, size } = req.body;
        if (!name || !url) {
            throw CustomException('Attachment name and URL are required', 400);
        }

        const attachmentId = new mongoose.Types.ObjectId();
        const attachment = {
            _id: attachmentId,
            name,
            url,
            type,
            size,
            uploadedAt: new Date(),
            uploadedBy: req.userID
        };

        const event = await Event.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            { $push: { attachments: attachment } },
            { new: true }
        );

        if (!event) {
            throw CustomException('Event not found', 404);
        }

        return res.status(201).json({
            success: true,
            message: 'Attachment added',
            data: attachment
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * DELETE /api/events/:eventId/attachments/:attachmentId
 * Remove attachment from event
 */
router.delete('/:eventId/attachments/:attachmentId', async (req, res) => {
    try {
        const eventId = sanitizeObjectId(req.params.eventId);
        const attachmentId = sanitizeObjectId(req.params.attachmentId);

        if (!eventId || !attachmentId) {
            throw CustomException('Invalid ID format', 400);
        }

        await Event.findOneAndUpdate(
            { _id: eventId, ...req.firmQuery },
            { $pull: { attachments: { _id: attachmentId } } }
        );

        return res.json({
            success: true,
            message: 'Attachment removed'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/events/:eventId/comments
 * Add comment to event
 */
router.post('/:eventId/comments', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.eventId);
        if (!sanitizedId) {
            throw CustomException('Invalid event ID format', 400);
        }

        const allowedFields = pickAllowedFields(req.body, ALLOWED_COMMENT_FIELDS);
        if (!allowedFields.content) {
            throw CustomException('Comment content is required', 400);
        }

        const commentId = new mongoose.Types.ObjectId();
        const comment = {
            _id: commentId,
            content: allowedFields.content,
            parentId: allowedFields.parentId ? sanitizeObjectId(allowedFields.parentId) : null,
            createdAt: new Date(),
            createdBy: req.userID
        };

        const event = await Event.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            { $push: { comments: comment } },
            { new: true }
        );

        if (!event) {
            throw CustomException('Event not found', 404);
        }

        return res.status(201).json({
            success: true,
            message: 'Comment added',
            data: comment
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/events/:eventId/comments/:commentId
 * Update comment
 */
router.patch('/:eventId/comments/:commentId', async (req, res) => {
    try {
        const eventId = sanitizeObjectId(req.params.eventId);
        const commentId = sanitizeObjectId(req.params.commentId);

        if (!eventId || !commentId) {
            throw CustomException('Invalid ID format', 400);
        }

        const { content } = req.body;
        if (!content) {
            throw CustomException('Comment content is required', 400);
        }

        const event = await Event.findOneAndUpdate(
            {
                _id: eventId,
                ...req.firmQuery,
                'comments._id': commentId,
                'comments.createdBy': req.userID
            },
            {
                $set: {
                    'comments.$.content': content,
                    'comments.$.updatedAt': new Date()
                }
            },
            { new: true }
        );

        if (!event) {
            throw CustomException('Event or comment not found', 404);
        }

        return res.json({
            success: true,
            message: 'Comment updated'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * DELETE /api/events/:eventId/comments/:commentId
 * Delete comment
 */
router.delete('/:eventId/comments/:commentId', async (req, res) => {
    try {
        const eventId = sanitizeObjectId(req.params.eventId);
        const commentId = sanitizeObjectId(req.params.commentId);

        if (!eventId || !commentId) {
            throw CustomException('Invalid ID format', 400);
        }

        await Event.findOneAndUpdate(
            {
                _id: eventId,
                ...req.firmQuery,
                'comments._id': commentId,
                'comments.createdBy': req.userID
            },
            { $pull: { comments: { _id: commentId } } }
        );

        return res.json({
            success: true,
            message: 'Comment deleted'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/events/today
 * Get today's events
 */
router.get('/today', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const events = await Event.find({
            ...req.firmQuery,
            startDate: { $gte: today, $lt: tomorrow }
        }).sort({ startDate: 1 });

        return res.json({
            success: true,
            count: events.length,
            data: events
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/events/my-events
 * Get events for current user
 */
router.get('/my-events', async (req, res) => {
    try {
        const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 100 });

        const events = await Event.find({
            ...req.firmQuery,
            $or: [
                { createdBy: req.userID },
                { organizer: req.userID },
                { 'attendees.userId': req.userID }
            ]
        })
            .sort({ startDate: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Event.countDocuments({
            ...req.firmQuery,
            $or: [
                { createdBy: req.userID },
                { organizer: req.userID },
                { 'attendees.userId': req.userID }
            ]
        });

        return res.json({
            success: true,
            count: events.length,
            data: events,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/events/pending-rsvp
 * Get events pending RSVP
 */
router.get('/pending-rsvp', async (req, res) => {
    try {
        const events = await Event.find({
            ...req.firmQuery,
            'attendees.userId': req.userID,
            'attendees.rsvpStatus': 'pending',
            startDate: { $gte: new Date() }
        }).sort({ startDate: 1 });

        return res.json({
            success: true,
            count: events.length,
            data: events
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/events/:eventId/recurring/skip
 * Skip a recurring event instance
 */
router.post('/:eventId/recurring/skip', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.eventId);
        if (!sanitizedId) {
            throw CustomException('Invalid event ID format', 400);
        }

        const { instanceDate } = req.body;
        if (!instanceDate) {
            throw CustomException('Instance date is required', 400);
        }

        const event = await Event.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            {
                $push: {
                    'recurrence.exceptions': {
                        date: new Date(instanceDate),
                        type: 'skip',
                        createdAt: new Date(),
                        createdBy: req.userID
                    }
                }
            },
            { new: true }
        );

        if (!event) {
            throw CustomException('Event not found', 404);
        }

        return res.json({
            success: true,
            message: 'Instance skipped'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/events/:eventId/recurring/stop
 * Stop recurring event
 */
router.post('/:eventId/recurring/stop', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.eventId);
        if (!sanitizedId) {
            throw CustomException('Invalid event ID format', 400);
        }

        const event = await Event.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            {
                $set: {
                    'recurrence.endDate': new Date(),
                    'recurrence.stoppedAt': new Date(),
                    'recurrence.stoppedBy': req.userID
                }
            },
            { new: true }
        );

        if (!event) {
            throw CustomException('Event not found', 404);
        }

        return res.json({
            success: true,
            message: 'Recurring event stopped'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/events/:eventId/recurring/instances
 * Get recurring event instances
 */
router.get('/:eventId/recurring/instances', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.eventId);
        if (!sanitizedId) {
            throw CustomException('Invalid event ID format', 400);
        }

        const { startDate, endDate } = req.query;

        const event = await Event.findOne({ _id: sanitizedId, ...req.firmQuery });
        if (!event) {
            throw CustomException('Event not found', 404);
        }

        // Generate instances based on recurrence pattern
        const instances = [];
        if (event.recurrence?.pattern) {
            const start = startDate ? new Date(startDate) : new Date();
            const end = endDate ? new Date(endDate) : new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000);

            // Simple instance generation (actual logic would be more complex)
            let currentDate = new Date(event.startDate);
            while (currentDate <= end && instances.length < 100) {
                if (currentDate >= start) {
                    const isException = event.recurrence.exceptions?.some(
                        e => e.date.toDateString() === currentDate.toDateString()
                    );
                    if (!isException) {
                        instances.push({
                            date: new Date(currentDate),
                            status: 'scheduled'
                        });
                    }
                }
                // Advance based on pattern
                switch (event.recurrence.pattern) {
                    case 'daily':
                        currentDate.setDate(currentDate.getDate() + 1);
                        break;
                    case 'weekly':
                        currentDate.setDate(currentDate.getDate() + 7);
                        break;
                    case 'monthly':
                        currentDate.setMonth(currentDate.getMonth() + 1);
                        break;
                    default:
                        currentDate = new Date(end.getTime() + 1);
                }
            }
        }

        return res.json({
            success: true,
            count: instances.length,
            data: instances
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PUT /api/events/:eventId/recurring/instance/:instanceDate
 * Update specific recurring instance
 */
router.put('/:eventId/recurring/instance/:instanceDate', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.eventId);
        if (!sanitizedId) {
            throw CustomException('Invalid event ID format', 400);
        }

        const instanceDate = new Date(req.params.instanceDate);
        const updates = req.body;

        const event = await Event.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            {
                $push: {
                    'recurrence.exceptions': {
                        date: instanceDate,
                        type: 'modified',
                        modifications: updates,
                        createdAt: new Date(),
                        createdBy: req.userID
                    }
                }
            },
            { new: true }
        );

        if (!event) {
            throw CustomException('Event not found', 404);
        }

        return res.json({
            success: true,
            message: 'Instance updated'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/events/:eventId/calendar-sync
 * Sync event to external calendar
 */
router.post('/:eventId/calendar-sync', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.eventId);
        if (!sanitizedId) {
            throw CustomException('Invalid event ID format', 400);
        }

        const { provider } = req.body;

        const event = await Event.findOne({ _id: sanitizedId, ...req.firmQuery });
        if (!event) {
            throw CustomException('Event not found', 404);
        }

        // Mark as sync requested
        await Event.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            {
                $set: {
                    [`calendarSync.${provider || 'google'}.syncRequestedAt`]: new Date(),
                    [`calendarSync.${provider || 'google'}.syncRequestedBy`]: req.userID
                }
            }
        );

        return res.json({
            success: true,
            message: 'Calendar sync initiated'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/events/bulk/cancel
 * Bulk cancel events
 */
router.post('/bulk/cancel', async (req, res) => {
    try {
        const { eventIds, reason } = req.body;

        if (!Array.isArray(eventIds) || eventIds.length === 0) {
            throw CustomException('Array of event IDs is required', 400);
        }

        if (eventIds.length > 50) {
            throw CustomException('Maximum 50 events per bulk cancel', 400);
        }

        const sanitizedIds = eventIds.map(id => sanitizeObjectId(id)).filter(Boolean);

        const result = await Event.updateMany(
            { _id: { $in: sanitizedIds }, ...req.firmQuery },
            {
                $set: {
                    status: 'cancelled',
                    cancelledAt: new Date(),
                    cancelledBy: req.userID,
                    cancelReason: reason
                }
            }
        );

        return res.json({
            success: true,
            message: `Cancelled ${result.modifiedCount} events`,
            data: { cancelledCount: result.modifiedCount }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/events/templates
 * Get event templates
 */
router.get('/templates', async (req, res) => {
    try {
        const events = await Event.find({
            ...req.firmQuery,
            isTemplate: true
        }).sort({ name: 1 });

        return res.json({
            success: true,
            count: events.length,
            data: events
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/events/templates/:templateId/create
 * Create event from template
 */
router.post('/templates/:templateId/create', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.templateId);
        if (!sanitizedId) {
            throw CustomException('Invalid template ID format', 400);
        }

        const template = await Event.findOne({
            _id: sanitizedId,
            ...req.firmQuery,
            isTemplate: true
        });

        if (!template) {
            throw CustomException('Template not found', 404);
        }

        const { startDate, endDate, ...overrides } = req.body;

        const newEvent = new Event(req.addFirmId({
            ...template.toObject(),
            _id: new mongoose.Types.ObjectId(),
            isTemplate: false,
            startDate: startDate ? new Date(startDate) : new Date(),
            endDate: endDate ? new Date(endDate) : null,
            ...overrides,
            createdFromTemplate: template._id,
            createdAt: new Date(),
            createdBy: req.userID
        }));

        await newEvent.save();

        return res.status(201).json({
            success: true,
            message: 'Event created from template',
            data: newEvent
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/events/:eventId/save-as-template
 * Save event as template
 */
router.post('/:eventId/save-as-template', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.eventId);
        if (!sanitizedId) {
            throw CustomException('Invalid event ID format', 400);
        }

        const event = await Event.findOne({ _id: sanitizedId, ...req.firmQuery });
        if (!event) {
            throw CustomException('Event not found', 404);
        }

        const { templateName } = req.body;

        const template = new Event(req.addFirmId({
            ...event.toObject(),
            _id: new mongoose.Types.ObjectId(),
            name: templateName || `${event.name} (Template)`,
            isTemplate: true,
            startDate: null,
            endDate: null,
            status: 'template',
            createdAt: new Date(),
            createdBy: req.userID
        }));

        await template.save();

        return res.status(201).json({
            success: true,
            message: 'Template created',
            data: template
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/events/check-availability
 * Check attendee availability
 */
router.post('/check-availability', async (req, res) => {
    try {
        const { attendeeIds, startDate, endDate } = req.body;

        if (!Array.isArray(attendeeIds) || !startDate || !endDate) {
            throw CustomException('Attendee IDs, start date, and end date are required', 400);
        }

        const sanitizedIds = attendeeIds.map(id => sanitizeObjectId(id)).filter(Boolean);

        const conflicts = await Event.find({
            ...req.firmQuery,
            $or: [
                { organizer: { $in: sanitizedIds } },
                { 'attendees.userId': { $in: sanitizedIds } }
            ],
            status: { $nin: ['cancelled', 'canceled'] },
            $or: [
                { startDate: { $lt: new Date(endDate), $gte: new Date(startDate) } },
                { endDate: { $gt: new Date(startDate), $lte: new Date(endDate) } }
            ]
        });

        const availability = sanitizedIds.map(id => {
            const userConflicts = conflicts.filter(e =>
                e.organizer?.toString() === id ||
                e.attendees?.some(a => a.userId?.toString() === id)
            );
            return {
                userId: id,
                available: userConflicts.length === 0,
                conflicts: userConflicts.map(c => ({
                    eventId: c._id,
                    title: c.name,
                    startDate: c.startDate,
                    endDate: c.endDate
                }))
            };
        });

        return res.json({
            success: true,
            data: availability
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/events/find-slots
 * Find available time slots
 */
router.post('/find-slots', async (req, res) => {
    try {
        const { attendeeIds, dateRange, duration, workingHours } = req.body;

        if (!Array.isArray(attendeeIds) || !dateRange || !duration) {
            throw CustomException('Attendee IDs, date range, and duration are required', 400);
        }

        const sanitizedIds = attendeeIds.map(id => sanitizeObjectId(id)).filter(Boolean);

        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);

        // Get existing events for these attendees
        const events = await Event.find({
            ...req.firmQuery,
            $or: [
                { organizer: { $in: sanitizedIds } },
                { 'attendees.userId': { $in: sanitizedIds } }
            ],
            status: { $nin: ['cancelled', 'canceled'] },
            startDate: { $gte: startDate },
            endDate: { $lte: endDate }
        });

        // Simple slot finding (actual logic would be more complex)
        const slots = [];
        const currentDate = new Date(startDate);
        const defaultWorkingHours = workingHours || { start: 9, end: 17 };

        while (currentDate <= endDate && slots.length < 10) {
            const dayStart = new Date(currentDate);
            dayStart.setHours(defaultWorkingHours.start, 0, 0, 0);

            const dayEnd = new Date(currentDate);
            dayEnd.setHours(defaultWorkingHours.end, 0, 0, 0);

            let slotStart = new Date(dayStart);
            while (slotStart.getTime() + duration * 60 * 1000 <= dayEnd.getTime()) {
                const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);

                const hasConflict = events.some(e =>
                    e.startDate < slotEnd && e.endDate > slotStart
                );

                if (!hasConflict) {
                    slots.push({
                        start: new Date(slotStart),
                        end: slotEnd
                    });
                    if (slots.length >= 10) break;
                }

                slotStart = new Date(slotStart.getTime() + 30 * 60 * 1000);
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return res.json({
            success: true,
            count: slots.length,
            data: slots
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

module.exports = router;
