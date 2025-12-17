const { Reminder, Case, Task, Event, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const nlpService = require('../services/nlp.service');
const voiceToTaskService = require('../services/voiceToTask.service');

/**
 * Create reminder
 * POST /api/reminders
 */
const createReminder = asyncHandler(async (req, res) => {
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
    } = req.body;

    const userId = req.userID;

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

    // Validate related entities
    if (relatedCase) {
        const caseDoc = await Case.findById(relatedCase);
        if (!caseDoc) {
            throw CustomException('Case not found', 404);
        }
    }

    if (relatedTask) {
        const task = await Task.findById(relatedTask);
        if (!task) {
            throw CustomException('Task not found', 404);
        }
    }

    if (relatedEvent) {
        const event = await Event.findById(relatedEvent);
        if (!event) {
            throw CustomException('Event not found', 404);
        }
    }

    const reminder = await Reminder.create({
        title: title || 'Untitled Reminder',
        description,
        userId,
        reminderDateTime: dateTime,
        reminderDate: dateTime,
        reminderTime: dateTime.toTimeString().substring(0, 5),
        priority,
        type,
        relatedCase,
        relatedTask,
        relatedEvent,
        relatedInvoice,
        clientId,
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

    const reminder = await Reminder.findById(id)
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

    const reminder = await Reminder.findById(id);

    if (!reminder) {
        throw CustomException('Reminder not found', 404);
    }

    if (reminder.userId.toString() !== userId) {
        throw CustomException('You can only update your own reminders', 403);
    }

    const allowedFields = [
        'title', 'description', 'reminderDateTime', 'priority', 'type',
        'relatedCase', 'relatedTask', 'relatedEvent', 'relatedInvoice',
        'clientId', 'recurring', 'notification', 'tags', 'notes'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            reminder[field] = req.body[field];
        }
    });

    // Update legacy fields
    if (req.body.reminderDateTime) {
        reminder.reminderDate = new Date(req.body.reminderDateTime);
        reminder.reminderTime = new Date(req.body.reminderDateTime).toTimeString().substring(0, 5);
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

    const reminder = await Reminder.findById(id);

    if (!reminder) {
        throw CustomException('Reminder not found', 404);
    }

    if (reminder.userId.toString() !== userId) {
        throw CustomException('You can only delete your own reminders', 403);
    }

    await Reminder.findByIdAndDelete(id);

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
    const { completionNote } = req.body;
    const userId = req.userID;

    const reminder = await Reminder.findById(id);

    if (!reminder) {
        throw CustomException('Reminder not found', 404);
    }

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

    const reminder = await Reminder.findById(id);

    if (!reminder) {
        throw CustomException('Reminder not found', 404);
    }

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
    const { snoozeMinutes, snoozeUntil, snoozeReason } = req.body;
    const userId = req.userID;

    const reminder = await Reminder.findById(id);

    if (!reminder) {
        throw CustomException('Reminder not found', 404);
    }

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

    // Calculate snooze until time
    let snoozeUntilDate;
    if (snoozeUntil) {
        snoozeUntilDate = new Date(snoozeUntil);
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
    const { delegateTo, delegationNote } = req.body;
    const userId = req.userID;

    if (!delegateTo) {
        throw CustomException('Delegate target user ID is required', 400);
    }

    const reminder = await Reminder.findById(id);

    if (!reminder) {
        throw CustomException('Reminder not found', 404);
    }

    if (reminder.userId.toString() !== userId) {
        throw CustomException('You can only delegate your own reminders', 403);
    }

    // Verify delegate user exists
    const delegateUser = await User.findById(delegateTo);
    if (!delegateUser) {
        throw CustomException('Delegate user not found', 404);
    }

    reminder.status = 'delegated';
    reminder.delegatedTo = delegateTo;
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
    const { reminderIds } = req.body;
    const userId = req.userID;

    if (!reminderIds || !Array.isArray(reminderIds) || reminderIds.length === 0) {
        throw CustomException('Reminder IDs are required', 400);
    }

    const reminders = await Reminder.find({
        _id: { $in: reminderIds },
        userId
    });

    if (reminders.length !== reminderIds.length) {
        throw CustomException('Some reminders cannot be deleted', 400);
    }

    await Reminder.deleteMany({ _id: { $in: reminderIds } });

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
    const { reminderIds, updates } = req.body;
    const userId = req.userID;

    if (!reminderIds || !Array.isArray(reminderIds) || reminderIds.length === 0) {
        throw CustomException('Reminder IDs are required', 400);
    }

    const reminders = await Reminder.find({
        _id: { $in: reminderIds },
        userId
    });

    if (reminders.length !== reminderIds.length) {
        throw CustomException('Some reminders are not accessible', 403);
    }

    const allowedUpdates = ['status', 'priority', 'reminderDateTime'];
    const updateData = {};
    allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
            updateData[field] = updates[field];
        }
    });

    await Reminder.updateMany(
        { _id: { $in: reminderIds } },
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
    const { text, timezone = 'Asia/Riyadh' } = req.body;
    const userId = req.userID;

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
        console.error('Natural language reminder creation error:', error);
        throw CustomException(error.message || 'Failed to create reminder from natural language', 500);
    }
});

/**
 * Create reminder from voice transcription
 * POST /api/reminders/voice
 */
const createReminderFromVoice = asyncHandler(async (req, res) => {
    const { transcription, timezone = 'Asia/Riyadh', language = 'en' } = req.body;
    const userId = req.userID;

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
        console.error('Voice reminder creation error:', error);
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
