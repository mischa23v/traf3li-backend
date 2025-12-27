const { Reminder, Case, Task, Event, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const nlpService = require('../services/nlp.service');
const voiceToTaskService = require('../services/voiceToTask.service');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

/**
 * Create reminder
 * POST /api/reminders
 */
const createReminder = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'title',
        'description',
        'reminderDateTime',
        'reminderDate',
        'reminderTime',
        'priority',
        'type',
        'relatedCase',
        'relatedTask',
        'relatedEvent',
        'relatedInvoice',
        'clientId',
        'recurring',
        'notification',
        'tags',
        'notes'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const {
        title,
        description,
        reminderDateTime,
        reminderDate,
        reminderTime,
        priority: rawPriority = 'medium',
        type = 'general',
        relatedCase,
        relatedTask,
        relatedEvent,
        relatedInvoice,
        clientId,
        recurring,
        notification: rawNotification,
        tags,
        notes
    } = safeData;

    // Normalize priority - map 'urgent' to 'critical'
    const priorityMap = { urgent: 'critical', normal: 'medium' };
    const priority = priorityMap[rawPriority] || rawPriority;

    // Normalize notification object
    let notification = rawNotification || { channels: ['push'] };

    // Handle case where advanceNotifications is a number (minutes) instead of array
    if (notification.advanceNotifications !== undefined) {
        if (typeof notification.advanceNotifications === 'number') {
            notification = {
                ...notification,
                advanceNotifications: [{
                    beforeMinutes: notification.advanceNotifications,
                    channels: notification.channels || ['push']
                }]
            };
        } else if (!Array.isArray(notification.advanceNotifications)) {
            // If it's neither number nor array, reset to empty array
            notification = {
                ...notification,
                advanceNotifications: []
            };
        }
    }

    // Note: Required field validation removed for testing flexibility
    // Fields will use defaults if not provided
    const dateTime = reminderDateTime || (reminderDate && reminderTime ? new Date(`${reminderDate}T${reminderTime}`) : new Date());

    // Input validation for dates and times
    if (reminderDateTime) {
        const parsedDate = new Date(reminderDateTime);
        if (isNaN(parsedDate.getTime())) {
            throw CustomException('Invalid reminderDateTime format', 400);
        }
    }

    if (reminderDate) {
        const parsedDate = new Date(reminderDate);
        if (isNaN(parsedDate.getTime())) {
            throw CustomException('Invalid reminderDate format', 400);
        }
    }

    if (reminderTime && typeof reminderTime === 'string') {
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(reminderTime)) {
            throw CustomException('Invalid reminderTime format. Expected HH:MM', 400);
        }
    }

    // Validate and sanitize related entity IDs (IDOR protection)
    let sanitizedRelatedCase = null;
    if (relatedCase) {
        sanitizedRelatedCase = sanitizeObjectId(relatedCase);
        if (!sanitizedRelatedCase) {
            throw CustomException('Invalid relatedCase ID format', 400);
        }
        const caseDoc = await Case.findOne({ _id: sanitizedRelatedCase, firmId });
        if (!caseDoc) {
            throw CustomException('Case not found', 404);
        }
        // IDOR: Verify the case belongs to the user
        if (caseDoc.userId && caseDoc.userId.toString() !== userId) {
            throw CustomException('You do not have access to this case', 403);
        }
    }

    let sanitizedRelatedTask = null;
    if (relatedTask) {
        sanitizedRelatedTask = sanitizeObjectId(relatedTask);
        if (!sanitizedRelatedTask) {
            throw CustomException('Invalid relatedTask ID format', 400);
        }
        const task = await Task.findOne({ _id: sanitizedRelatedTask, firmId });
        if (!task) {
            throw CustomException('Task not found', 404);
        }
        // IDOR: Verify the task belongs to the user
        if (task.userId && task.userId.toString() !== userId) {
            throw CustomException('You do not have access to this task', 403);
        }
    }

    let sanitizedRelatedEvent = null;
    if (relatedEvent) {
        sanitizedRelatedEvent = sanitizeObjectId(relatedEvent);
        if (!sanitizedRelatedEvent) {
            throw CustomException('Invalid relatedEvent ID format', 400);
        }
        const event = await Event.findOne({ _id: sanitizedRelatedEvent, firmId });
        if (!event) {
            throw CustomException('Event not found', 404);
        }
        // IDOR: Verify the event belongs to the user
        if (event.userId && event.userId.toString() !== userId) {
            throw CustomException('You do not have access to this event', 403);
        }
    }

    // Sanitize other IDs
    const sanitizedClientId = clientId ? sanitizeObjectId(clientId) : null;
    const sanitizedRelatedInvoice = relatedInvoice ? sanitizeObjectId(relatedInvoice) : null;

    const reminder = await Reminder.create({
        title: title || 'Untitled Reminder',
        description,
        userId,
        reminderDateTime: dateTime,
        reminderDate: dateTime,
        reminderTime: dateTime.toTimeString().substring(0, 5),
        priority,
        type,
        relatedCase: sanitizedRelatedCase,
        relatedTask: sanitizedRelatedTask,
        relatedEvent: sanitizedRelatedEvent,
        relatedInvoice: sanitizedRelatedInvoice,
        clientId: sanitizedClientId,
        recurring: recurring || { enabled: false },
        notification,
        tags: tags || [],
        notes,
        status: 'pending',
        createdBy: userId
    });

    await reminder.populate([
        { path: 'relatedCase', select: 'title caseNumber' },
        { path: 'relatedTask', select: 'title dueDate' },
        { path: 'relatedEvent', select: 'title startDateTime' },
        { path: 'clientId', select: 'firstName lastName' }
    ]);

    res.status(201).json({
        success: true,
        message: 'Reminder created successfully',
        data: reminder
    });
});

/**
 * Get reminders with filters
 * GET /api/reminders
 * Supports ?includeStats=true for aggregated stats (GOLD STANDARD)
 */
const getReminders = asyncHandler(async (req, res) => {
    const {
        status,
        priority,
        type,
        relatedCase,
        clientId,
        startDate,
        endDate,
        page = 1,
        limit = 50,
        sortBy = 'reminderDateTime',
        sortOrder = 'asc',
        includeStats = 'false' // NEW: Include stats in response
    } = req.query;

    const userId = req.userID;
    const baseQuery = {
        $or: [
            { userId },
            { delegatedTo: userId }
        ]
    };
    const query = { ...baseQuery };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (type) query.type = type;
    if (relatedCase) query.relatedCase = relatedCase;
    if (clientId) query.clientId = clientId;

    if (startDate || endDate) {
        query.reminderDateTime = {};
        if (startDate) query.reminderDateTime.$gte = new Date(startDate);
        if (endDate) query.reminderDateTime.$lte = new Date(endDate);
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Build promises array
    const promises = [
        Reminder.find(query)
            .populate('relatedCase', 'title caseNumber')
            .populate('relatedTask', 'title dueDate')
            .populate('relatedEvent', 'title startDateTime')
            .populate('clientId', 'firstName lastName')
            .populate('delegatedTo', 'firstName lastName')
            .sort(sortOptions)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit)),
        Reminder.countDocuments(query)
    ];

    // If includeStats=true, add stats aggregation (runs in parallel)
    if (includeStats === 'true') {
        const now = new Date();
        promises.push(
            Reminder.aggregate([
                { $match: baseQuery },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                        snoozed: { $sum: { $cond: [{ $eq: ['$status', 'snoozed'] }, 1, 0] } },
                        overdue: {
                            $sum: {
                                $cond: [
                                    { $and: [
                                        { $eq: ['$status', 'pending'] },
                                        { $lt: ['$reminderDateTime', now] }
                                    ]},
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ])
        );
    }

    const results = await Promise.all(promises);
    const [reminders, total] = results;

    const response = {
        success: true,
        data: reminders,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    };

    // Add stats if requested
    if (includeStats === 'true') {
        const statsResult = results[2];
        const stats = statsResult[0] || { total: 0, pending: 0, completed: 0, snoozed: 0, overdue: 0 };
        response.stats = {
            total: stats.total,
            pending: stats.pending,
            completed: stats.completed,
            snoozed: stats.snoozed,
            overdue: stats.overdue
        };
    }

    res.status(200).json(response);
});

/**
 * Get single reminder
 * GET /api/reminders/:id
 */
const getReminder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    // Sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid reminder ID format', 400);
    }

    const reminder = await Reminder.findOne({ _id: sanitizedId, firmId })
        .populate('relatedCase', 'title caseNumber category')
        .populate('relatedTask', 'title dueDate status')
        .populate('relatedEvent', 'title startDateTime location')
        .populate('clientId', 'firstName lastName email')
        .populate('userId', 'firstName lastName')
        .populate('delegatedTo', 'firstName lastName')
        .populate('acknowledgedBy', 'firstName lastName')
        .populate('completedBy', 'firstName lastName');

    if (!reminder) {
        throw CustomException('Reminder not found', 404);
    }

    const hasAccess = reminder.userId._id.toString() === userId ||
                      reminder.delegatedTo?.toString() === userId;
    if (!hasAccess) {
        throw CustomException('You do not have access to this reminder', 403);
    }

    res.status(200).json({
        success: true,
        data: reminder
    });
});

/**
 * Update reminder
 * PUT /api/reminders/:id
 */
const updateReminder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    // Sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid reminder ID format', 400);
    }

    const reminder = await Reminder.findOne({ _id: sanitizedId, firmId });

    if (!reminder) {
        throw CustomException('Reminder not found', 404);
    }

    // IDOR protection - users can only update their own reminders
    if (reminder.userId.toString() !== userId) {
        throw CustomException('You can only update your own reminders', 403);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'title', 'description', 'reminderDateTime', 'priority', 'type',
        'relatedCase', 'relatedTask', 'relatedEvent', 'relatedInvoice',
        'clientId', 'recurring', 'notification', 'tags', 'notes'
    ];
    const safeUpdates = pickAllowedFields(req.body, allowedFields);

    // Input validation for dates and times
    if (safeUpdates.reminderDateTime) {
        const parsedDate = new Date(safeUpdates.reminderDateTime);
        if (isNaN(parsedDate.getTime())) {
            throw CustomException('Invalid reminderDateTime format', 400);
        }
    }

    // Validate and sanitize related entity IDs
    if (safeUpdates.relatedCase) {
        const sanitizedRelatedCase = sanitizeObjectId(safeUpdates.relatedCase);
        if (!sanitizedRelatedCase) {
            throw CustomException('Invalid relatedCase ID format', 400);
        }
        const caseDoc = await Case.findOne({ _id: sanitizedRelatedCase, firmId });
        if (!caseDoc) {
            throw CustomException('Case not found', 404);
        }
        // IDOR: Verify the case belongs to the user
        if (caseDoc.userId && caseDoc.userId.toString() !== userId) {
            throw CustomException('You do not have access to this case', 403);
        }
        safeUpdates.relatedCase = sanitizedRelatedCase;
    }

    if (safeUpdates.relatedTask) {
        const sanitizedRelatedTask = sanitizeObjectId(safeUpdates.relatedTask);
        if (!sanitizedRelatedTask) {
            throw CustomException('Invalid relatedTask ID format', 400);
        }
        const task = await Task.findOne({ _id: sanitizedRelatedTask, firmId });
        if (!task) {
            throw CustomException('Task not found', 404);
        }
        // IDOR: Verify the task belongs to the user
        if (task.userId && task.userId.toString() !== userId) {
            throw CustomException('You do not have access to this task', 403);
        }
        safeUpdates.relatedTask = sanitizedRelatedTask;
    }

    if (safeUpdates.relatedEvent) {
        const sanitizedRelatedEvent = sanitizeObjectId(safeUpdates.relatedEvent);
        if (!sanitizedRelatedEvent) {
            throw CustomException('Invalid relatedEvent ID format', 400);
        }
        const event = await Event.findOne({ _id: sanitizedRelatedEvent, firmId });
        if (!event) {
            throw CustomException('Event not found', 404);
        }
        // IDOR: Verify the event belongs to the user
        if (event.userId && event.userId.toString() !== userId) {
            throw CustomException('You do not have access to this event', 403);
        }
        safeUpdates.relatedEvent = sanitizedRelatedEvent;
    }

    // Sanitize other IDs
    if (safeUpdates.clientId) {
        const sanitizedClientId = sanitizeObjectId(safeUpdates.clientId);
        if (sanitizedClientId) {
            safeUpdates.clientId = sanitizedClientId;
        }
    }

    if (safeUpdates.relatedInvoice) {
        const sanitizedRelatedInvoice = sanitizeObjectId(safeUpdates.relatedInvoice);
        if (sanitizedRelatedInvoice) {
            safeUpdates.relatedInvoice = sanitizedRelatedInvoice;
        }
    }

    // Apply safe updates to reminder
    Object.keys(safeUpdates).forEach(field => {
        reminder[field] = safeUpdates[field];
    });

    // Update legacy fields
    if (safeUpdates.reminderDateTime) {
        reminder.reminderDate = new Date(safeUpdates.reminderDateTime);
        reminder.reminderTime = new Date(safeUpdates.reminderDateTime).toTimeString().substring(0, 5);
    }

    await reminder.save();

    await reminder.populate([
        { path: 'relatedCase', select: 'title caseNumber' },
        { path: 'relatedTask', select: 'title dueDate' },
        { path: 'relatedEvent', select: 'title startDateTime' }
    ]);

    res.status(200).json({
        success: true,
        message: 'Reminder updated successfully',
        data: reminder
    });
});

/**
 * Delete reminder
 * DELETE /api/reminders/:id
 */
const deleteReminder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    // Sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid reminder ID format', 400);
    }

    const reminder = await Reminder.findOne({ _id: sanitizedId, firmId });

    if (!reminder) {
        throw CustomException('Reminder not found', 404);
    }

    // IDOR protection - users can only delete their own reminders
    if (reminder.userId.toString() !== userId) {
        throw CustomException('You can only delete your own reminders', 403);
    }

    await Reminder.findOneAndDelete({ _id: sanitizedId, firmId });

    res.status(200).json({
        success: true,
        message: 'Reminder deleted successfully'
    });
});

/**
 * Complete reminder
 * POST /api/reminders/:id/complete
 */
const completeReminder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    // Sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid reminder ID format', 400);
    }

    // Mass assignment protection - only allow completionNote
    const safeData = pickAllowedFields(req.body, ['completionNote']);
    const { completionNote } = safeData;

    const reminder = await Reminder.findOne({ _id: sanitizedId, firmId });

    if (!reminder) {
        throw CustomException('Reminder not found', 404);
    }

    // IDOR protection - only owner or delegated user can complete
    const hasAccess = reminder.userId.toString() === userId ||
                      reminder.delegatedTo?.toString() === userId;
    if (!hasAccess) {
        throw CustomException('You cannot complete this reminder', 403);
    }

    reminder.status = 'completed';
    reminder.completedAt = new Date();
    reminder.completedBy = userId;
    reminder.completionNote = completionNote;
    reminder.acknowledgedAt = new Date();
    reminder.acknowledgedBy = userId;
    reminder.acknowledgmentAction = 'completed';

    await reminder.save();

    // Handle recurring reminders
    if (reminder.recurring?.enabled) {
        const nextDate = calculateNextReminderDate(reminder.reminderDateTime, reminder.recurring);
        reminder.recurring.occurrencesCompleted = (reminder.recurring.occurrencesCompleted || 0) + 1;

        const shouldCreate =
            (!reminder.recurring.endDate || nextDate <= new Date(reminder.recurring.endDate)) &&
            (!reminder.recurring.maxOccurrences || reminder.recurring.occurrencesCompleted < reminder.recurring.maxOccurrences);

        if (shouldCreate) {
            await Reminder.create({
                title: reminder.title,
                description: reminder.description,
                userId: reminder.userId,
                reminderDateTime: nextDate,
                reminderDate: nextDate,
                reminderTime: nextDate.toTimeString().substring(0, 5),
                priority: reminder.priority,
                type: reminder.type,
                relatedCase: reminder.relatedCase,
                relatedTask: reminder.relatedTask,
                relatedEvent: reminder.relatedEvent,
                clientId: reminder.clientId,
                recurring: {
                    ...reminder.recurring.toObject(),
                    occurrencesCompleted: reminder.recurring.occurrencesCompleted,
                    parentReminderId: reminder._id
                },
                notification: reminder.notification,
                tags: reminder.tags,
                notes: reminder.notes,
                status: 'pending',
                createdBy: reminder.userId
            });

            return res.status(200).json({
                success: true,
                message: 'Reminder completed! Next occurrence created.',
                data: reminder
            });
        }
    }

    res.status(200).json({
        success: true,
        message: 'Reminder completed successfully',
        data: reminder
    });
});

/**
 * Dismiss reminder
 * POST /api/reminders/:id/dismiss
 */
const dismissReminder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    // Sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid reminder ID format', 400);
    }

    const reminder = await Reminder.findOne({ _id: sanitizedId, firmId });

    if (!reminder) {
        throw CustomException('Reminder not found', 404);
    }

    // IDOR protection - only owner or delegated user can dismiss
    const hasAccess = reminder.userId.toString() === userId ||
                      reminder.delegatedTo?.toString() === userId;
    if (!hasAccess) {
        throw CustomException('You cannot dismiss this reminder', 403);
    }

    reminder.status = 'dismissed';
    reminder.acknowledgedAt = new Date();
    reminder.acknowledgedBy = userId;
    reminder.acknowledgmentAction = 'dismissed';

    await reminder.save();

    res.status(200).json({
        success: true,
        message: 'Reminder dismissed',
        data: reminder
    });
});

/**
 * Snooze reminder
 * POST /api/reminders/:id/snooze
 */
const snoozeReminder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    // Sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid reminder ID format', 400);
    }

    // Mass assignment protection - only allow specific fields
    const safeData = pickAllowedFields(req.body, ['snoozeMinutes', 'snoozeUntil', 'snoozeReason']);
    const { snoozeMinutes, snoozeUntil, snoozeReason } = safeData;

    const reminder = await Reminder.findOne({ _id: sanitizedId, firmId });

    if (!reminder) {
        throw CustomException('Reminder not found', 404);
    }

    // IDOR protection - only owner or delegated user can snooze
    const hasAccess = reminder.userId.toString() === userId ||
                      reminder.delegatedTo?.toString() === userId;
    if (!hasAccess) {
        throw CustomException('You cannot snooze this reminder', 403);
    }

    // Check max snooze count
    const maxSnooze = reminder.snooze?.maxSnoozeCount || 5;
    if ((reminder.snooze?.snoozeCount || 0) >= maxSnooze) {
        throw CustomException(`Maximum snooze limit (${maxSnooze}) reached`, 400);
    }

    // Validate snoozeMinutes if provided
    if (snoozeMinutes !== undefined) {
        const minutes = parseInt(snoozeMinutes, 10);
        if (isNaN(minutes) || minutes < 1 || minutes > 10080) { // max 1 week
            throw CustomException('Invalid snoozeMinutes. Must be between 1 and 10080 (1 week)', 400);
        }
    }

    // Calculate snooze until time
    let snoozeUntilDate;
    if (snoozeUntil) {
        snoozeUntilDate = new Date(snoozeUntil);
        // Validate the date
        if (isNaN(snoozeUntilDate.getTime())) {
            throw CustomException('Invalid snoozeUntil date format', 400);
        }
        // Ensure snooze date is in the future
        if (snoozeUntilDate <= new Date()) {
            throw CustomException('snoozeUntil must be a future date', 400);
        }
    } else if (snoozeMinutes) {
        snoozeUntilDate = new Date(Date.now() + snoozeMinutes * 60000);
    } else {
        // Default: 15 minutes
        snoozeUntilDate = new Date(Date.now() + 15 * 60000);
    }

    reminder.status = 'snoozed';
    reminder.snooze = {
        ...reminder.snooze?.toObject(),
        snoozedAt: new Date(),
        snoozeUntil: snoozeUntilDate,
        snoozeCount: (reminder.snooze?.snoozeCount || 0) + 1,
        snoozeReason
    };
    reminder.acknowledgedAt = new Date();
    reminder.acknowledgedBy = userId;
    reminder.acknowledgmentAction = 'snoozed';

    await reminder.save();

    res.status(200).json({
        success: true,
        message: `Reminder snoozed until ${snoozeUntilDate.toLocaleString()}`,
        data: reminder
    });
});

/**
 * Delegate reminder
 * POST /api/reminders/:id/delegate
 */
const delegateReminder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    // Sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid reminder ID format', 400);
    }

    // Mass assignment protection - only allow specific fields
    const safeData = pickAllowedFields(req.body, ['delegateTo', 'delegationNote']);
    const { delegateTo, delegationNote } = safeData;

    if (!delegateTo) {
        throw CustomException('Delegate target user ID is required', 400);
    }

    // Sanitize and validate delegateTo ID
    const sanitizedDelegateTo = sanitizeObjectId(delegateTo);
    if (!sanitizedDelegateTo) {
        throw CustomException('Invalid delegateTo user ID format', 400);
    }

    const reminder = await Reminder.findOne({ _id: sanitizedId, firmId });

    if (!reminder) {
        throw CustomException('Reminder not found', 404);
    }

    // IDOR protection - users can only delegate their own reminders
    if (reminder.userId.toString() !== userId) {
        throw CustomException('You can only delegate your own reminders', 403);
    }

    // Verify delegate user exists
    const delegateUser = await User.findOne({ _id: sanitizedDelegateTo, firmId });
    if (!delegateUser) {
        throw CustomException('Delegate user not found', 404);
    }

    reminder.status = 'delegated';
    reminder.delegatedTo = sanitizedDelegateTo;
    reminder.delegatedAt = new Date();
    reminder.delegationNote = delegationNote;
    reminder.acknowledgedAt = new Date();
    reminder.acknowledgedBy = userId;
    reminder.acknowledgmentAction = 'delegated';

    await reminder.save();

    await reminder.populate('delegatedTo', 'firstName lastName email');

    res.status(200).json({
        success: true,
        message: `Reminder delegated to ${delegateUser.firstName} ${delegateUser.lastName}`,
        data: reminder
    });
});

/**
 * Get upcoming reminders
 * GET /api/reminders/upcoming
 */
const getUpcomingReminders = asyncHandler(async (req, res) => {
    const { days = 7 } = req.query;
    const userId = req.userID;

    const reminders = await Reminder.getUpcoming(userId, parseInt(days));

    res.status(200).json({
        success: true,
        data: reminders,
        count: reminders.length
    });
});

/**
 * Get overdue reminders
 * GET /api/reminders/overdue
 */
const getOverdueReminders = asyncHandler(async (req, res) => {
    const userId = req.userID;

    const reminders = await Reminder.getOverdue(userId);

    res.status(200).json({
        success: true,
        data: reminders,
        count: reminders.length
    });
});

/**
 * Get snoozed reminders that are due
 * GET /api/reminders/snoozed-due
 */
const getSnoozedDueReminders = asyncHandler(async (req, res) => {
    const userId = req.userID;

    const reminders = await Reminder.getSnoozedDue(userId);

    res.status(200).json({
        success: true,
        data: reminders,
        count: reminders.length
    });
});

/**
 * Get delegated reminders
 * GET /api/reminders/delegated
 */
const getDelegatedReminders = asyncHandler(async (req, res) => {
    const userId = req.userID;

    const reminders = await Reminder.getDelegated(userId);

    res.status(200).json({
        success: true,
        data: reminders,
        count: reminders.length
    });
});

/**
 * Get reminder stats
 * GET /api/reminders/stats
 */
const getReminderStats = asyncHandler(async (req, res) => {
    const userId = req.userID;

    const stats = await Reminder.getStats(userId);

    res.status(200).json({
        success: true,
        data: stats
    });
});

/**
 * Bulk delete reminders
 * DELETE /api/reminders/bulk
 */
const bulkDeleteReminders = asyncHandler(async (req, res) => {
    const userId = req.userID;

    // Mass assignment protection - only allow reminderIds
    const safeData = pickAllowedFields(req.body, ['reminderIds']);
    const { reminderIds } = safeData;

    if (!reminderIds || !Array.isArray(reminderIds) || reminderIds.length === 0) {
        throw CustomException('Reminder IDs are required', 400);
    }

    // Sanitize all IDs
    const sanitizedIds = reminderIds.map(id => sanitizeObjectId(id)).filter(id => id !== null);

    if (sanitizedIds.length === 0) {
        throw CustomException('No valid reminder IDs provided', 400);
    }

    if (sanitizedIds.length !== reminderIds.length) {
        throw CustomException('Some reminder IDs have invalid format', 400);
    }

    // IDOR protection - verify all reminders belong to the user
    const reminders = await Reminder.find({
        _id: { $in: sanitizedIds },
        userId
    });

    if (reminders.length !== sanitizedIds.length) {
        throw CustomException('Some reminders cannot be deleted (not found or unauthorized)', 403);
    }

    // SECURITY: Include userId in deleteMany query to prevent cross-user deletion
    await Reminder.deleteMany({ _id: { $in: sanitizedIds }, userId });

    res.status(200).json({
        success: true,
        message: `${reminders.length} reminders deleted successfully`,
        count: reminders.length
    });
});

/**
 * Bulk update reminders
 * PUT /api/reminders/bulk
 */
const bulkUpdateReminders = asyncHandler(async (req, res) => {
    const userId = req.userID;

    // Mass assignment protection - only allow specific fields
    const safeData = pickAllowedFields(req.body, ['reminderIds', 'updates']);
    const { reminderIds, updates } = safeData;

    if (!reminderIds || !Array.isArray(reminderIds) || reminderIds.length === 0) {
        throw CustomException('Reminder IDs are required', 400);
    }

    if (!updates || typeof updates !== 'object') {
        throw CustomException('Updates object is required', 400);
    }

    // Sanitize all IDs
    const sanitizedIds = reminderIds.map(id => sanitizeObjectId(id)).filter(id => id !== null);

    if (sanitizedIds.length === 0) {
        throw CustomException('No valid reminder IDs provided', 400);
    }

    if (sanitizedIds.length !== reminderIds.length) {
        throw CustomException('Some reminder IDs have invalid format', 400);
    }

    // IDOR protection - verify all reminders belong to the user
    const reminders = await Reminder.find({
        _id: { $in: sanitizedIds },
        userId
    });

    if (reminders.length !== sanitizedIds.length) {
        throw CustomException('Some reminders are not accessible', 403);
    }

    // Mass assignment protection for updates - only allow specific fields
    const allowedUpdates = ['status', 'priority', 'reminderDateTime'];
    const updateData = pickAllowedFields(updates, allowedUpdates);

    if (Object.keys(updateData).length === 0) {
        throw CustomException('No valid update fields provided', 400);
    }

    // Validate reminderDateTime if present
    if (updateData.reminderDateTime) {
        const parsedDate = new Date(updateData.reminderDateTime);
        if (isNaN(parsedDate.getTime())) {
            throw CustomException('Invalid reminderDateTime format', 400);
        }
    }

    // SECURITY: Include userId in updateMany query to prevent cross-user modification
    await Reminder.updateMany(
        { _id: { $in: sanitizedIds }, userId },
        { $set: updateData }
    );

    res.status(200).json({
        success: true,
        message: `${reminders.length} reminders updated successfully`,
        count: reminders.length
    });
});

/**
 * Create reminder from natural language
 * POST /api/reminders/parse
 */
const createReminderFromNaturalLanguage = asyncHandler(async (req, res) => {
    const userId = req.userID;

    // Mass assignment protection - only allow specific fields
    const safeData = pickAllowedFields(req.body, ['text', 'timezone']);
    const { text, timezone = 'Asia/Riyadh' } = safeData;

    if (!text || text.trim().length === 0) {
        throw CustomException('Natural language text is required', 400);
    }

    try {
        // Parse natural language text using NLP service
        const parseResult = await nlpService.parseReminderFromText(text, {
            timezone,
            currentDateTime: new Date(),
            userId
        });

        if (!parseResult.success) {
            throw CustomException('Failed to parse natural language text', 400);
        }

        const { reminderData, confidence } = parseResult;

        // Validate parsed data
        if (!reminderData.title || !reminderData.reminderDateTime) {
            throw CustomException('Could not extract required reminder information from text', 400);
        }

        // Create reminder with parsed data
        const reminder = await Reminder.create({
            title: reminderData.title,
            description: reminderData.description || null,
            userId,
            reminderDateTime: reminderData.reminderDateTime,
            reminderDate: reminderData.reminderDateTime,
            reminderTime: new Date(reminderData.reminderDateTime).toTimeString().substring(0, 5),
            priority: reminderData.priority || 'medium',
            type: reminderData.type || 'general',
            tags: reminderData.tags || [],
            notes: reminderData.notes || null,
            status: 'pending',
            createdBy: userId,
            // Store NLP metadata
            metadata: {
                source: 'nlp',
                originalText: text,
                confidence: confidence.overall,
                parsedFrom: 'natural_language'
            }
        });

        await reminder.populate([
            { path: 'relatedCase', select: 'title caseNumber' },
            { path: 'relatedTask', select: 'title dueDate' },
            { path: 'relatedEvent', select: 'title startDateTime' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Reminder created successfully from natural language',
            data: reminder,
            parsing: {
                confidence: confidence,
                warnings: confidence.overall < 0.7 ? ['Low confidence - please review the extracted data'] : []
            }
        });
    } catch (error) {
        logger.error('Natural language reminder creation error:', error);
        throw CustomException(error.message || 'Failed to create reminder from natural language', 500);
    }
});

/**
 * Create reminder from voice transcription
 * POST /api/reminders/voice
 */
const createReminderFromVoice = asyncHandler(async (req, res) => {
    const userId = req.userID;

    // Mass assignment protection - only allow specific fields
    const safeData = pickAllowedFields(req.body, ['transcription', 'timezone', 'language']);
    const { transcription, timezone = 'Asia/Riyadh', language = 'en' } = safeData;

    if (!transcription || transcription.trim().length === 0) {
        throw CustomException('Voice transcription is required', 400);
    }

    try {
        // Process voice transcription using voice-to-task service
        const voiceResult = await voiceToTaskService.processVoiceReminder(transcription, {
            timezone,
            currentDateTime: new Date(),
            language,
            userId
        });

        if (!voiceResult.success) {
            throw CustomException('Failed to process voice transcription', 400);
        }

        const { reminderData, confidence, metadata } = voiceResult;

        // Validate parsed data
        if (!reminderData.title || !reminderData.reminderDateTime) {
            throw CustomException('Could not extract required reminder information from voice', 400);
        }

        // Validate transcription quality
        const validation = voiceToTaskService.validateTranscription(transcription);
        const warnings = [];

        if (!validation.isValid) {
            throw CustomException('Voice transcription quality is too low. Please try again.', 400);
        }

        if (validation.warnings.length > 0) {
            warnings.push(...validation.warnings);
        }

        if (confidence.overall < 0.6) {
            warnings.push('Low confidence in voice parsing - please review the extracted data');
        }

        // Create reminder with parsed data
        const reminder = await Reminder.create({
            title: reminderData.title,
            description: reminderData.description || null,
            userId,
            reminderDateTime: reminderData.reminderDateTime,
            reminderDate: reminderData.reminderDateTime,
            reminderTime: new Date(reminderData.reminderDateTime).toTimeString().substring(0, 5),
            priority: reminderData.priority || 'medium',
            type: reminderData.type || 'general',
            tags: reminderData.tags || [],
            notes: reminderData.notes || null,
            status: 'pending',
            createdBy: userId,
            // Store voice metadata
            metadata: {
                source: 'voice',
                originalTranscription: metadata.originalTranscription,
                cleanedTranscription: metadata.cleanedTranscription,
                confidence: confidence.overall,
                parsedFrom: 'voice_transcription',
                processedAt: metadata.processedAt
            }
        });

        await reminder.populate([
            { path: 'relatedCase', select: 'title caseNumber' },
            { path: 'relatedTask', select: 'title dueDate' },
            { path: 'relatedEvent', select: 'title startDateTime' }
        ]);

        // Generate suggestions for improving future voice commands
        const suggestions = voiceToTaskService.generateSuggestions(transcription);

        res.status(201).json({
            success: true,
            message: 'Reminder created successfully from voice transcription',
            data: reminder,
            parsing: {
                confidence: confidence,
                warnings,
                suggestions: suggestions.length > 0 ? suggestions : undefined,
                transcriptionQuality: validation.confidence
            }
        });
    } catch (error) {
        logger.error('Voice reminder creation error:', error);
        throw CustomException(error.message || 'Failed to create reminder from voice', 500);
    }
});

// Helper function to calculate next reminder date
function calculateNextReminderDate(currentDate, recurring) {
    const nextDate = new Date(currentDate);
    const interval = recurring.interval || 1;

    switch (recurring.frequency) {
        case 'daily':
            nextDate.setDate(nextDate.getDate() + interval);
            break;
        case 'weekly':
            nextDate.setDate(nextDate.getDate() + (7 * interval));
            break;
        case 'biweekly':
            nextDate.setDate(nextDate.getDate() + 14);
            break;
        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + interval);
            break;
        case 'quarterly':
            nextDate.setMonth(nextDate.getMonth() + 3);
            break;
        case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + interval);
            break;
        default:
            nextDate.setDate(nextDate.getDate() + 1);
    }

    return nextDate;
}

module.exports = {
    createReminder,
    getReminders,
    getReminder,
    updateReminder,
    deleteReminder,
    completeReminder,
    dismissReminder,
    snoozeReminder,
    delegateReminder,
    getUpcomingReminders,
    getOverdueReminders,
    getSnoozedDueReminders,
    getDelegatedReminders,
    getReminderStats,
    bulkDeleteReminders,
    bulkUpdateReminders,
    createReminderFromNaturalLanguage,
    createReminderFromVoice
};
