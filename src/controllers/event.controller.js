const { Event, Task, Case, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const nlpService = require('../services/nlp.service');
const voiceToTaskService = require('../services/voiceToTask.service');
const { pickAllowedFields } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// ============================================
// DATE/TIME VALIDATION
// ============================================

/**
 * Validate and parse ISO date string
 * @param {string} dateString - ISO date string
 * @returns {Date|null} - Valid Date object or null
 */
const parseAndValidateDate = (dateString) => {
    if (!dateString) return null;

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        throw CustomException('Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss)', 400);
    }

    return date;
};

/**
 * Validate date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {boolean} - True if valid
 */
const validateDateRange = (startDate, endDate) => {
    if (!startDate) {
        throw CustomException('Start date is required', 400);
    }

    if (endDate && startDate >= endDate) {
        throw CustomException('End date must be after start date', 400);
    }

    return true;
};

/**
 * Validate that date is not in the past (for new events)
 * @param {Date} date - Date to validate
 * @param {boolean} allowPast - Whether to allow past dates
 */
const validateFutureDate = (date, allowPast = false) => {
    if (!date) return;

    const now = new Date();
    if (!allowPast && date < now) {
        throw CustomException('Event date cannot be in the past', 400);
    }
};

/**
 * Create event
 * POST /api/events
 */
const createEvent = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    // Block departed users from creating events
    if (req.isDeparted) {
        throw CustomException('لم يعد لديك صلاحية إنشاء مواعيد جديدة', 403);
    }

    // Mass assignment protection: only allow specific fields
    const allowedFields = [
        'title', 'type', 'description', 'startDateTime', 'endDateTime',
        'allDay', 'timezone', 'location', 'caseId', 'clientId',
        'attendees', 'agenda', 'reminders', 'recurrence',
        'priority', 'visibility', 'color', 'tags', 'notes'
    ];

    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    const {
        title = 'Untitled Event',
        type = 'other',
        description,
        startDateTime,
        endDateTime,
        allDay = false,
        timezone = 'Asia/Riyadh',
        location,
        caseId,
        clientId,
        attendees = [],
        agenda = [],
        reminders = [],
        recurrence = { enabled: false },
        priority = 'medium',
        visibility = 'private',
        color = '#3b82f6',
        tags = [],
        notes
    } = sanitizedData;

    // IDOR Protection: Validate case access if provided
    if (caseId) {
        const caseDoc = await Case.findById(caseId);
        if (!caseDoc || (caseDoc.firmId && caseDoc.firmId.toString() !== firmId.toString())) {
            throw CustomException('Case not found or you do not have access', 404);
        }
    }

    // IDOR Protection: Validate client access if provided
    if (clientId) {
        const clientDoc = await User.findById(clientId);
        if (!clientDoc || (clientDoc.firmId && clientDoc.firmId.toString() !== firmId.toString())) {
            throw CustomException('Client not found or you do not have access', 404);
        }
    }

    // Date/Time Validation
    const parsedStartDateTime = parseAndValidateDate(startDateTime) || new Date();
    const parsedEndDateTime = endDateTime ? parseAndValidateDate(endDateTime) : null;
    validateDateRange(parsedStartDateTime, parsedEndDateTime);
    validateFutureDate(parsedStartDateTime, false); // Prevent past dates for new events

    // Create event with defaults for optional fields
    const event = await Event.create({
        title,
        type,
        description,
        startDateTime: parsedStartDateTime,
        endDateTime: parsedEndDateTime,
        allDay,
        timezone,
        location,
        caseId,
        clientId,
        organizer: userId,
        firmId, // Add firmId for multi-tenancy
        attendees,
        agenda,
        reminders,
        recurrence,
        priority,
        visibility,
        color,
        tags,
        notes,
        createdBy: userId
    });

    // Create default reminders if none provided
    if (!reminders || reminders.length === 0) {
        const start = parsedStartDateTime;

        // 1 day before
        if (start.getTime() - Date.now() > 24 * 60 * 60 * 1000) {
            event.reminders.push({
                type: 'notification',
                beforeMinutes: 24 * 60,
                sent: false
            });
        }

        // 1 hour before
        if (start.getTime() - Date.now() > 60 * 60 * 1000) {
            event.reminders.push({
                type: 'notification',
                beforeMinutes: 60,
                sent: false
            });
        }

        await event.save();
    }

    // Create linked task if event type is 'task' and no taskId was provided
    if (type === 'task') {
        try {
            // Extract due time from startDateTime if not all day
            let dueTime = null;
            if (!allDay) {
                const start = parsedStartDateTime;
                dueTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
            }

            // Find assignedTo from first attendee
            const assignedUserId = attendees && attendees.length > 0 && attendees[0].userId
                ? attendees[0].userId
                : userId;

            const linkedTask = await Task.create({
                title,
                description,
                dueDate: parsedStartDateTime,
                dueTime,
                assignedTo: assignedUserId,
                createdBy: userId,
                firmId,
                caseId,
                clientId,
                priority,
                status: 'todo',
                tags,
                notes,
                linkedEventId: event._id
            });

            // Link the task back to the event
            event.taskId = linkedTask._id;
            await event.save();
        } catch (error) {
            logger.error('Error creating linked task from event', { error: error.message });
            // Don't fail event creation if task creation fails
        }
    }

    await event.populate([
        { path: 'organizer', select: 'firstName lastName image email' },
        { path: 'attendees.userId', select: 'firstName lastName image email' },
        { path: 'caseId', select: 'title caseNumber' },
        { path: 'clientId', select: 'firstName lastName' },
        { path: 'taskId', select: 'title status dueDate' }
    ]);

    res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: event
    });
});

/**
 * Get events with filters
 * GET /api/events
 */
const getEvents = asyncHandler(async (req, res) => {
    const {
        startDate,
        endDate,
        type,
        caseId,
        clientId,
        status,
        page = 1,
        limit = 50,
        sortBy = 'startDateTime',
        sortOrder = 'asc',
        includeStats = 'false' // NEW: Include stats in response (GOLD STANDARD)
    } = req.query;

    const userId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware
    const isDeparted = req.isDeparted; // From firmFilter middleware

    // Build base query - firmId first, then user-based
    let baseQuery;
    if (firmId) {
        if (isDeparted) {
            // Departed users can only see events they organized or attended
            baseQuery = {
                firmId,
                $or: [
                    { createdBy: userId },
                    { organizer: userId },
                    { 'attendees.userId': userId }
                ]
            };
        } else {
            // Active firm members see all firm events
            baseQuery = { firmId };
        }
    } else {
        baseQuery = {
            $or: [
                { createdBy: userId },
                { organizer: userId },
                { 'attendees.userId': userId }
            ]
        };
    }

    // Copy base query for filtering
    const query = { ...baseQuery };

    // Date range filter
    if (startDate || endDate) {
        query.startDateTime = {};
        if (startDate) query.startDateTime.$gte = new Date(startDate);
        if (endDate) query.startDateTime.$lte = new Date(endDate);
    }

    if (type) query.type = type;
    if (caseId) query.caseId = caseId;
    if (clientId) query.clientId = clientId;
    if (status) query.status = status;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Build promises array
    const promises = [
        Event.find(query)
            .populate('organizer', 'firstName lastName image')
            .populate('attendees.userId', 'firstName lastName image')
            .populate('caseId', 'title caseNumber')
            .populate('clientId', 'firstName lastName')
            .sort(sortOptions)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit)),
        Event.countDocuments(query)
    ];

    // If includeStats=true, add stats aggregation (runs in parallel)
    if (includeStats === 'true') {
        const now = new Date();
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));

        promises.push(
            Event.aggregate([
                { $match: baseQuery },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        upcoming: { $sum: { $cond: [{ $gt: ['$startDateTime', new Date()] }, 1, 0] } },
                        past: { $sum: { $cond: [{ $lt: ['$endDateTime', new Date()] }, 1, 0] } },
                        today: {
                            $sum: {
                                $cond: [
                                    { $and: [
                                        { $gte: ['$startDateTime', todayStart] },
                                        { $lte: ['$startDateTime', todayEnd] }
                                    ]},
                                    1,
                                    0
                                ]
                            }
                        },
                        meeting: { $sum: { $cond: [{ $eq: ['$type', 'meeting'] }, 1, 0] } },
                        session: { $sum: { $cond: [{ $eq: ['$type', 'session'] }, 1, 0] } },
                        hearing: { $sum: { $cond: [{ $eq: ['$type', 'hearing'] }, 1, 0] } },
                        deadline: { $sum: { $cond: [{ $eq: ['$type', 'deadline'] }, 1, 0] } }
                    }
                }
            ])
        );
    }

    const results = await Promise.all(promises);
    const [events, total] = results;

    // Also get tasks due in this date range
    let tasks = [];
    if (startDate && endDate) {
        tasks = await Task.find({
            $or: [
                { assignedTo: userId },
                { createdBy: userId }
            ],
            dueDate: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            },
            status: { $nin: ['done', 'canceled'] }
        })
            .populate('assignedTo', 'firstName lastName image')
            .populate('caseId', 'title caseNumber')
            .sort({ dueDate: 1 });
    }

    const response = {
        success: true,
        events: events || [],
        tasks: tasks || [],
        data: { events: events || [], tasks: tasks || [] }, // backwards compatibility
        total: total,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit)),
            pages: Math.ceil(total / parseInt(limit)),
            hasMore: (parseInt(page) * parseInt(limit)) < total
        }
    };

    // Add stats if requested
    if (includeStats === 'true') {
        const statsResult = results[2];
        const stats = statsResult[0] || {
            total: 0, upcoming: 0, past: 0, today: 0,
            meeting: 0, session: 0, hearing: 0, deadline: 0
        };
        response.stats = {
            total: stats.total,
            upcoming: stats.upcoming,
            past: stats.past,
            today: stats.today,
            byType: {
                meeting: stats.meeting,
                session: stats.session,
                hearing: stats.hearing,
                deadline: stats.deadline
            }
        };
    }

    res.status(200).json(response);
});

/**
 * Get single event
 * GET /api/events/:id
 */
const getEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    // IDOR Protection: Validate ID format before query
    if (!id || id.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(id)) {
        throw CustomException('Invalid event ID format', 400);
    }

    const event = await Event.findById(id)
        .populate('organizer', 'firstName lastName image email')
        .populate('attendees.userId', 'firstName lastName image email')
        .populate('caseId', 'title caseNumber category')
        .populate('clientId', 'firstName lastName email')
        .populate('taskId', 'title status dueDate')
        .populate('agenda.presenter', 'firstName lastName')
        .populate('actionItems.assignedTo', 'firstName lastName')
        .populate('createdBy', 'firstName lastName')
        .populate('completedBy', 'firstName lastName')
        .populate('cancelledBy', 'firstName lastName');

    if (!event) {
        throw CustomException('Event not found', 404);
    }

    // IDOR Protection: Check access - firmId first, then user-based
    const hasAccess = firmId
        ? event.firmId && event.firmId.toString() === firmId.toString()
        : (event.createdBy._id.toString() === userId ||
           event.organizer._id.toString() === userId ||
           event.isUserAttendee(userId));

    if (!hasAccess) {
        throw CustomException('You do not have access to this event', 403);
    }

    res.status(200).json({
        success: true,
        data: event
    });
});

/**
 * Update event
 * PUT /api/events/:id
 */
const updateEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    // Block departed users from updating
    if (req.isDeparted) {
        throw CustomException('لم يعد لديك صلاحية تعديل المواعيد', 403);
    }

    const event = await Event.findById(id);

    if (!event) {
        throw CustomException('Event not found', 404);
    }

    // IDOR Protection: Check access - firmId first, then organizer/creator
    const canUpdate = firmId
        ? event.firmId && event.firmId.toString() === firmId.toString()
        : (event.organizer.toString() === userId || event.createdBy.toString() === userId);

    if (!canUpdate) {
        throw CustomException('Only the organizer can update this event', 403);
    }

    // Mass assignment protection: only allow specific fields
    const allowedFields = [
        'title', 'type', 'description', 'startDateTime', 'endDateTime',
        'allDay', 'timezone', 'location', 'caseId', 'clientId',
        'attendees', 'agenda', 'actionItems', 'reminders', 'recurrence',
        'priority', 'visibility', 'color', 'tags', 'notes', 'minutesNotes'
    ];

    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Date/Time Validation for updated dates
    if (sanitizedData.startDateTime) {
        sanitizedData.startDateTime = parseAndValidateDate(sanitizedData.startDateTime);
    }
    if (sanitizedData.endDateTime) {
        sanitizedData.endDateTime = parseAndValidateDate(sanitizedData.endDateTime);
    }
    if (sanitizedData.startDateTime || sanitizedData.endDateTime) {
        const startDate = sanitizedData.startDateTime || event.startDateTime;
        const endDate = sanitizedData.endDateTime || event.endDateTime;
        validateDateRange(startDate, endDate);
    }

    // IDOR Protection: Validate case access if provided
    if (sanitizedData.caseId && sanitizedData.caseId !== event.caseId.toString()) {
        const caseDoc = await Case.findById(sanitizedData.caseId);
        if (!caseDoc || (caseDoc.firmId && caseDoc.firmId.toString() !== firmId.toString())) {
            throw CustomException('Case not found or you do not have access', 404);
        }
    }

    // IDOR Protection: Validate client access if provided
    if (sanitizedData.clientId && sanitizedData.clientId !== event.clientId.toString()) {
        const clientDoc = await User.findById(sanitizedData.clientId);
        if (!clientDoc || (clientDoc.firmId && clientDoc.firmId.toString() !== firmId.toString())) {
            throw CustomException('Client not found or you do not have access', 404);
        }
    }

    // Apply sanitized updates
    Object.assign(event, sanitizedData);
    event.lastModifiedBy = userId;
    await event.save();

    // Sync with linked task if exists
    if (event.taskId) {
        try {
            const linkedTask = await Task.findById(event.taskId);

            if (linkedTask) {
                // Update task fields
                if (req.body.title !== undefined) linkedTask.title = event.title;
                if (req.body.description !== undefined) linkedTask.description = event.description;

                // Update due date and time if startDateTime changed
                if (req.body.startDateTime !== undefined) {
                    linkedTask.dueDate = event.startDateTime;

                    // Extract time if not all day
                    if (!event.allDay) {
                        const start = new Date(event.startDateTime);
                        linkedTask.dueTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
                    } else {
                        linkedTask.dueTime = null;
                    }
                }

                // Update other fields
                if (req.body.caseId !== undefined) linkedTask.caseId = event.caseId;
                if (req.body.clientId !== undefined) linkedTask.clientId = event.clientId;
                if (req.body.priority !== undefined) linkedTask.priority = event.priority;
                if (req.body.tags !== undefined) linkedTask.tags = event.tags;
                if (req.body.notes !== undefined) linkedTask.notes = event.notes;

                // Update status based on event status
                if (event.status === 'completed') {
                    linkedTask.status = 'done';
                    linkedTask.completedAt = event.completedAt;
                    linkedTask.completedBy = event.completedBy;
                } else if (event.status === 'cancelled') {
                    linkedTask.status = 'canceled';
                } else if (linkedTask.status === 'done' || linkedTask.status === 'canceled') {
                    // If event is not completed/cancelled but task was, reset to in_progress
                    linkedTask.status = 'in_progress';
                }

                // Update assignedTo from first attendee if attendees changed
                if (req.body.attendees !== undefined) {
                    linkedTask.assignedTo = event.attendees && event.attendees.length > 0 && event.attendees[0].userId
                        ? event.attendees[0].userId
                        : linkedTask.createdBy;
                }

                await linkedTask.save();
            }
        } catch (error) {
            logger.error('Error syncing event with linked task', { error: error.message });
            // Don't fail event update if task sync fails
        }
    }

    await event.populate([
        { path: 'organizer', select: 'firstName lastName image' },
        { path: 'attendees.userId', select: 'firstName lastName image' },
        { path: 'caseId', select: 'title caseNumber' },
        { path: 'taskId', select: 'title status dueDate' }
    ]);

    res.status(200).json({
        success: true,
        message: 'Event updated successfully',
        data: event
    });
});

/**
 * Delete event
 * DELETE /api/events/:id
 */
const deleteEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    const event = await Event.findById(id);

    if (!event) {
        throw CustomException('Event not found', 404);
    }

    // Check access - firmId first, then organizer/creator
    const canDelete = firmId
        ? event.firmId && event.firmId.toString() === firmId.toString()
        : (event.organizer.toString() === userId || event.createdBy.toString() === userId);

    if (!canDelete) {
        throw CustomException('Only the organizer can delete this event', 403);
    }

    // Handle linked task - unlink it instead of deleting to preserve task data
    if (event.taskId) {
        try {
            const linkedTask = await Task.findById(event.taskId);
            if (linkedTask) {
                linkedTask.linkedEventId = null;
                await linkedTask.save();
            }
        } catch (error) {
            logger.error('Error unlinking task from deleted event', { error: error.message });
            // Continue with event deletion even if unlinking fails
        }
    }

    await Event.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: 'Event deleted successfully'
    });
});

/**
 * Cancel event
 * POST /api/events/:id/cancel
 */
const cancelEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.userID;
    const firmId = req.firmId;

    const event = await Event.findById(id);

    if (!event) {
        throw CustomException('Event not found', 404);
    }

    // IDOR Protection: Check access
    const canUpdate = firmId
        ? event.firmId && event.firmId.toString() === firmId.toString()
        : (event.organizer.toString() === userId || event.createdBy.toString() === userId);

    if (!canUpdate) {
        throw CustomException('Only the organizer can cancel this event', 403);
    }

    event.status = 'cancelled';
    event.cancelledAt = new Date();
    event.cancelledBy = userId;
    event.cancellationReason = reason;

    await event.save();

    res.status(200).json({
        success: true,
        message: 'Event cancelled successfully',
        data: event
    });
});

/**
 * Postpone event
 * POST /api/events/:id/postpone
 */
const postponeEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { newDateTime, reason } = req.body;
    const userId = req.userID;
    const firmId = req.firmId;

    if (!newDateTime) {
        throw CustomException('New date/time is required', 400);
    }

    const event = await Event.findById(id);

    if (!event) {
        throw CustomException('Event not found', 404);
    }

    // IDOR Protection: Check access
    const canUpdate = firmId
        ? event.firmId && event.firmId.toString() === firmId.toString()
        : (event.organizer.toString() === userId || event.createdBy.toString() === userId);

    if (!canUpdate) {
        throw CustomException('Only the organizer can postpone this event', 403);
    }

    // Date/Time Validation: postponed date must be after current event start
    const parsedNewDateTime = parseAndValidateDate(newDateTime);
    if (parsedNewDateTime <= event.startDateTime) {
        throw CustomException('New date must be after the current event start date', 400);
    }

    event.status = 'postponed';
    event.postponedTo = parsedNewDateTime;
    event.postponementReason = reason;

    await event.save();

    res.status(200).json({
        success: true,
        message: 'Event postponed successfully',
        data: event
    });
});

/**
 * Complete event
 * POST /api/events/:id/complete
 */
const completeEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { minutesNotes } = req.body;
    const userId = req.userID;
    const firmId = req.firmId; // SECURITY: Added firmId for multi-tenant isolation

    const event = await Event.findById(id);

    if (!event) {
        throw CustomException('Event not found', 404);
    }

    // SECURITY: Check firmId first for multi-tenant isolation
    const firmAccess = firmId
        ? event.firmId && event.firmId.toString() === firmId.toString()
        : true; // Solo lawyers don't have firmId requirement

    if (!firmAccess) {
        throw CustomException('Event not found', 404);
    }

    const hasAccess = event.organizer.toString() === userId ||
                      event.createdBy.toString() === userId ||
                      event.isUserAttendee(userId);

    if (!hasAccess) {
        throw CustomException('You cannot complete this event', 403);
    }

    event.status = 'completed';
    event.completedAt = new Date();
    event.completedBy = userId;

    if (minutesNotes) {
        event.minutesNotes = minutesNotes;
        event.minutesRecordedBy = userId;
        event.minutesRecordedAt = new Date();
    }

    await event.save();

    res.status(200).json({
        success: true,
        message: 'Event completed successfully',
        data: event
    });
});

// === ATTENDEE MANAGEMENT ===

/**
 * Add attendee
 * POST /api/events/:id/attendees
 */
const addAttendee = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId: attendeeUserId, email, name, role, isRequired } = req.body;
    const userId = req.userID;
    const firmId = req.firmId; // SECURITY: Added firmId for multi-tenant isolation

    const event = await Event.findById(id);

    if (!event) {
        throw CustomException('Event not found', 404);
    }

    // SECURITY: Check firmId first for multi-tenant isolation
    const firmAccess = firmId
        ? event.firmId && event.firmId.toString() === firmId.toString()
        : true;

    if (!firmAccess) {
        throw CustomException('Event not found', 404);
    }

    if (event.organizer.toString() !== userId && event.createdBy.toString() !== userId) {
        throw CustomException('Only the organizer can add attendees', 403);
    }

    // Check if attendee already exists
    if (attendeeUserId) {
        const exists = event.attendees.some(a => a.userId?.toString() === attendeeUserId);
        if (exists) {
            throw CustomException('Attendee already added to this event', 400);
        }
    }

    event.attendees.push({
        userId: attendeeUserId,
        email,
        name,
        role: role || 'required',
        isRequired: isRequired !== false,
        status: 'invited'
    });

    await event.save();

    await event.populate('attendees.userId', 'firstName lastName image email');

    res.status(201).json({
        success: true,
        message: 'Attendee added successfully',
        data: event.attendees
    });
});

/**
 * Remove attendee
 * DELETE /api/events/:id/attendees/:attendeeId
 */
const removeAttendee = asyncHandler(async (req, res) => {
    const { id, attendeeId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId; // SECURITY: Added firmId for multi-tenant isolation

    const event = await Event.findById(id);

    if (!event) {
        throw CustomException('Event not found', 404);
    }

    // SECURITY: Check firmId first for multi-tenant isolation
    const firmAccess = firmId
        ? event.firmId && event.firmId.toString() === firmId.toString()
        : true;

    if (!firmAccess) {
        throw CustomException('Event not found', 404);
    }

    if (event.organizer.toString() !== userId && event.createdBy.toString() !== userId) {
        throw CustomException('Only the organizer can remove attendees', 403);
    }

    event.attendees.pull(attendeeId);
    await event.save();

    res.status(200).json({
        success: true,
        message: 'Attendee removed successfully'
    });
});

/**
 * RSVP to event
 * POST /api/events/:id/rsvp
 */
const rsvpEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, responseNote } = req.body;
    const userId = req.userID;
    const firmId = req.firmId; // SECURITY: Added firmId for multi-tenant isolation

    if (!status || !['confirmed', 'declined', 'tentative'].includes(status)) {
        throw CustomException('Valid RSVP status is required (confirmed, declined, tentative)', 400);
    }

    const event = await Event.findById(id);

    if (!event) {
        throw CustomException('Event not found', 404);
    }

    // SECURITY: Check firmId first for multi-tenant isolation
    const firmAccess = firmId
        ? event.firmId && event.firmId.toString() === firmId.toString()
        : true;

    if (!firmAccess) {
        throw CustomException('Event not found', 404);
    }

    // Find attendee entry for this user
    const attendee = event.attendees.find(a => a.userId?.toString() === userId);

    if (!attendee) {
        throw CustomException('You are not invited to this event', 403);
    }

    attendee.status = status;
    attendee.responseNote = responseNote;
    attendee.respondedAt = new Date();

    await event.save();

    res.status(200).json({
        success: true,
        message: `RSVP updated to: ${status}`,
        data: event
    });
});

// === AGENDA MANAGEMENT ===

/**
 * Add agenda item
 * POST /api/events/:id/agenda
 */
const addAgendaItem = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, duration, presenter, notes } = req.body;
    const userId = req.userID;
    const firmId = req.firmId; // SECURITY: Added firmId for multi-tenant isolation

    const event = await Event.findById(id);

    if (!event) {
        throw CustomException('Event not found', 404);
    }

    // SECURITY: Check firmId first for multi-tenant isolation
    const firmAccess = firmId
        ? event.firmId && event.firmId.toString() === firmId.toString()
        : true;

    if (!firmAccess) {
        throw CustomException('Event not found', 404);
    }

    if (event.organizer.toString() !== userId && event.createdBy.toString() !== userId) {
        throw CustomException('Only the organizer can manage agenda', 403);
    }

    event.agenda.push({
        title,
        description,
        duration,
        presenter,
        notes,
        order: event.agenda.length + 1
    });

    await event.save();

    await event.populate('agenda.presenter', 'firstName lastName');

    res.status(201).json({
        success: true,
        message: 'Agenda item added',
        data: event.agenda
    });
});

/**
 * Update agenda item
 * PUT /api/events/:id/agenda/:agendaId
 */
const updateAgendaItem = asyncHandler(async (req, res) => {
    const { id, agendaId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId; // SECURITY: Added firmId for multi-tenant isolation

    const event = await Event.findById(id);

    if (!event) {
        throw CustomException('Event not found', 404);
    }

    // SECURITY: Check firmId first for multi-tenant isolation
    const firmAccess = firmId
        ? event.firmId && event.firmId.toString() === firmId.toString()
        : true;

    if (!firmAccess) {
        throw CustomException('Event not found', 404);
    }

    if (event.organizer.toString() !== userId && event.createdBy.toString() !== userId) {
        throw CustomException('Only the organizer can manage agenda', 403);
    }

    const agendaItem = event.agenda.id(agendaId);
    if (!agendaItem) {
        throw CustomException('Agenda item not found', 404);
    }

    const allowedFields = ['title', 'description', 'duration', 'presenter', 'notes', 'order', 'completed'];
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            agendaItem[field] = req.body[field];
        }
    });

    await event.save();

    res.status(200).json({
        success: true,
        message: 'Agenda item updated',
        data: event.agenda
    });
});

/**
 * Delete agenda item
 * DELETE /api/events/:id/agenda/:agendaId
 */
const deleteAgendaItem = asyncHandler(async (req, res) => {
    const { id, agendaId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId; // SECURITY: Added firmId for multi-tenant isolation

    const event = await Event.findById(id);

    if (!event) {
        throw CustomException('Event not found', 404);
    }

    // SECURITY: Check firmId first for multi-tenant isolation
    const firmAccess = firmId
        ? event.firmId && event.firmId.toString() === firmId.toString()
        : true;

    if (!firmAccess) {
        throw CustomException('Event not found', 404);
    }

    if (event.organizer.toString() !== userId && event.createdBy.toString() !== userId) {
        throw CustomException('Only the organizer can manage agenda', 403);
    }

    event.agenda.pull(agendaId);
    await event.save();

    res.status(200).json({
        success: true,
        message: 'Agenda item deleted'
    });
});

// === ACTION ITEMS ===

/**
 * Add action item
 * POST /api/events/:id/action-items
 */
const addActionItem = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { description, assignedTo, dueDate, priority } = req.body;
    const userId = req.userID;
    const firmId = req.firmId;

    const event = await Event.findById(id);

    if (!event) {
        throw CustomException('Event not found', 404);
    }

    // IDOR Protection: Check access
    const hasAccess = firmId
        ? event.firmId && event.firmId.toString() === firmId.toString()
        : (event.organizer.toString() === userId ||
           event.createdBy.toString() === userId ||
           event.isUserAttendee(userId));

    if (!hasAccess) {
        throw CustomException('You cannot add action items to this event', 403);
    }

    // Date/Time Validation: action item dueDate validation
    let validatedDueDate = null;
    if (dueDate) {
        validatedDueDate = parseAndValidateDate(dueDate);
        if (validatedDueDate < event.startDateTime) {
            throw CustomException('Action item due date cannot be before the event start date', 400);
        }
    }

    event.actionItems.push({
        description,
        assignedTo,
        dueDate: validatedDueDate,
        priority: priority || 'medium',
        status: 'pending'
    });

    await event.save();

    await event.populate('actionItems.assignedTo', 'firstName lastName');

    res.status(201).json({
        success: true,
        message: 'Action item added',
        data: event.actionItems
    });
});

/**
 * Update action item
 * PUT /api/events/:id/action-items/:itemId
 */
const updateActionItem = asyncHandler(async (req, res) => {
    const { id, itemId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    const event = await Event.findById(id);

    if (!event) {
        throw CustomException('Event not found', 404);
    }

    // IDOR Protection: Check access
    const hasAccess = firmId
        ? event.firmId && event.firmId.toString() === firmId.toString()
        : (event.organizer.toString() === userId ||
           event.createdBy.toString() === userId ||
           event.isUserAttendee(userId));

    if (!hasAccess) {
        throw CustomException('You cannot update action items in this event', 403);
    }

    const item = event.actionItems.id(itemId);
    if (!item) {
        throw CustomException('Action item not found', 404);
    }

    // Mass assignment protection: only allow specific fields
    const allowedFields = ['description', 'assignedTo', 'dueDate', 'status', 'priority'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Date/Time Validation: action item dueDate validation
    if (sanitizedData.dueDate) {
        const validatedDueDate = parseAndValidateDate(sanitizedData.dueDate);
        if (validatedDueDate < event.startDateTime) {
            throw CustomException('Action item due date cannot be before the event start date', 400);
        }
        sanitizedData.dueDate = validatedDueDate;
    }

    Object.assign(item, sanitizedData);

    if (req.body.status === 'completed' && item.status !== 'completed') {
        item.completedAt = new Date();
    }

    await event.save();

    res.status(200).json({
        success: true,
        message: 'Action item updated',
        data: event.actionItems
    });
});

// === CALENDAR & STATS ===

/**
 * Get calendar view
 * GET /api/events/calendar
 */
const getCalendarEvents = asyncHandler(async (req, res) => {
    const { startDate, endDate, caseId, type, status } = req.query;
    const userId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    if (!startDate || !endDate) {
        throw CustomException('Start date and end date are required', 400);
    }

    const events = await Event.getCalendarEvents(
        userId,
        new Date(startDate),
        new Date(endDate),
        { caseId, type, status, firmId }
    );

    res.status(200).json({
        success: true,
        data: events,
        count: events.length
    });
});

/**
 * Get upcoming events
 * GET /api/events/upcoming
 */
const getUpcomingEvents = asyncHandler(async (req, res) => {
    const { days = 7 } = req.query;
    const userId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    const events = await Event.getUpcoming(userId, parseInt(days), firmId);

    res.status(200).json({
        success: true,
        data: events,
        count: events.length
    });
});

/**
 * Get events by date
 * GET /api/events/date/:date
 */
const getEventsByDate = asyncHandler(async (req, res) => {
    const { date } = req.params;
    const userId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Build query - firmId first, then user-based
    const eventQuery = firmId
        ? { firmId }
        : {
            $or: [
                { createdBy: userId },
                { organizer: userId },
                { 'attendees.userId': userId }
            ]
        };

    const events = await Event.find({
        ...eventQuery,
        startDateTime: { $gte: startOfDay, $lte: endOfDay }
    })
        .populate('organizer', 'firstName lastName image')
        .populate('caseId', 'title caseNumber')
        .sort({ startDateTime: 1 });

    // Build task query - firmId first, then user-based
    const taskQuery = firmId
        ? { firmId }
        : {
            $or: [
                { assignedTo: userId },
                { createdBy: userId }
            ]
        };

    // Get tasks due on this date
    const tasks = await Task.find({
        ...taskQuery,
        dueDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $nin: ['done', 'canceled'] }
    })
        .populate('assignedTo', 'firstName lastName image')
        .populate('caseId', 'title caseNumber');

    res.status(200).json({
        success: true,
        data: { events, tasks }
    });
});

/**
 * Get events by month
 * GET /api/events/month/:year/:month
 */
const getEventsByMonth = asyncHandler(async (req, res) => {
    const { year, month } = req.params;
    const userId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Build query - firmId first, then user-based
    const baseQuery = firmId
        ? { firmId }
        : {
            $or: [
                { createdBy: userId },
                { organizer: userId },
                { 'attendees.userId': userId }
            ]
        };

    const events = await Event.find({
        ...baseQuery,
        startDateTime: { $gte: startDate, $lte: endDate }
    })
        .populate('organizer', 'firstName lastName image')
        .populate('caseId', 'title caseNumber')
        .sort({ startDateTime: 1 });

    // Group by date
    const groupedEvents = {};
    events.forEach(event => {
        const dateKey = event.startDateTime.toISOString().split('T')[0];
        if (!groupedEvents[dateKey]) {
            groupedEvents[dateKey] = [];
        }
        groupedEvents[dateKey].push(event);
    });

    res.status(200).json({
        success: true,
        data: groupedEvents
    });
});

/**
 * Get event stats
 * GET /api/events/stats
 */
const getEventStats = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const userId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    const stats = await Event.getStats(userId, { startDate, endDate, firmId });

    res.status(200).json({
        success: true,
        data: stats
    });
});

/**
 * Check availability
 * POST /api/events/availability
 */
const checkAvailability = asyncHandler(async (req, res) => {
    const { userIds, startDateTime, endDateTime, excludeEventId } = req.body;
    const firmId = req.firmId; // SECURITY: Added firmId for multi-tenant isolation

    if (!userIds || !startDateTime || !endDateTime) {
        throw CustomException('User IDs, start time, and end time are required', 400);
    }

    // SECURITY: Verify requested users belong to same firm
    if (firmId && userIds && userIds.length > 0) {
        const User = require('../models/user.model');
        const validUsers = await User.countDocuments({
            _id: { $in: userIds },
            firmId: firmId
        });
        if (validUsers !== userIds.length) {
            throw CustomException('Cannot check availability for users outside your firm', 403);
        }
    }

    // Date/Time Validation
    const parsedStartDateTime = parseAndValidateDate(startDateTime);
    const parsedEndDateTime = parseAndValidateDate(endDateTime);
    validateDateRange(parsedStartDateTime, parsedEndDateTime);

    const result = await Event.checkAvailability(
        userIds,
        parsedStartDateTime,
        parsedEndDateTime,
        excludeEventId,
        firmId // Pass firmId to model method
    );

    res.status(200).json({
        success: true,
        data: result
    });
});

/**
 * Sync task to calendar (helper)
 */
const syncTaskToCalendar = async (taskId, firmId = null) => {
    try {
        const task = await Task.findById(taskId);
        if (!task || !task.dueDate) return;

        // SECURITY: Include firmId in query for multi-tenant isolation
        const eventQuery = { taskId: task._id };
        if (task.firmId) {
            eventQuery.firmId = task.firmId;
        }
        const existingEvent = await Event.findOne(eventQuery);

        if (existingEvent) {
            existingEvent.title = task.title;
            existingEvent.description = task.description;
            existingEvent.startDateTime = task.dueDate;
            existingEvent.status = task.status === 'done' ? 'completed' : 'scheduled';
            await existingEvent.save();
        } else {
            await Event.create({
                title: task.title,
                type: 'task',
                description: task.description,
                startDateTime: task.dueDate,
                allDay: true,
                taskId: task._id,
                caseId: task.caseId,
                organizer: task.createdBy,
                createdBy: task.createdBy,
                attendees: task.assignedTo ? [{ userId: task.assignedTo, status: 'confirmed', isRequired: true }] : [],
                color: '#10b981'
            });
        }
    } catch (error) {
        logger.error('Error syncing task to calendar', { error: error.message });
    }
};

// === ICS EXPORT/IMPORT ===

/**
 * Export event to ICS format
 * GET /api/events/:id/export/ics
 */
const exportEventToICS = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId; // SECURITY: Added firmId for multi-tenant isolation

    const event = await Event.findById(id)
        .populate('organizer', 'firstName lastName email')
        .populate('attendees.userId', 'firstName lastName email')
        .populate('caseId', 'title caseNumber');

    if (!event) {
        throw CustomException('Event not found', 404);
    }

    // SECURITY: Check firmId first for multi-tenant isolation
    const firmAccess = firmId
        ? event.firmId && event.firmId.toString() === firmId.toString()
        : true;

    if (!firmAccess) {
        throw CustomException('Event not found', 404);
    }

    // Check access
    const hasAccess = event.createdBy.toString() === userId ||
                      event.organizer._id.toString() === userId ||
                      event.isUserAttendee(userId);

    if (!hasAccess) {
        throw CustomException('You do not have access to this event', 403);
    }

    // Generate ICS content
    const icsContent = generateICS(event);

    // Set headers for file download
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(event.title)}.ics"`);

    res.send(icsContent);
});

/**
 * Import events from ICS file
 * POST /api/events/import/ics
 */
const importEventsFromICS = asyncHandler(async (req, res) => {
    const userId = req.userID;

    if (!req.file) {
        throw CustomException('ICS file is required', 400);
    }

    const icsContent = req.file.buffer.toString('utf-8');
    const parsedEvents = parseICS(icsContent);

    if (parsedEvents.length === 0) {
        throw CustomException('No valid events found in ICS file', 400);
    }

    const createdEvents = [];
    const errors = [];

    for (const eventData of parsedEvents) {
        try {
            const event = await Event.create({
                title: eventData.title || 'Imported Event',
                description: eventData.description,
                type: 'meeting',
                startDateTime: eventData.startDate,
                endDateTime: eventData.endDate,
                allDay: eventData.allDay || false,
                location: eventData.location ? { type: 'physical', address: eventData.location } : undefined,
                organizer: userId,
                createdBy: userId,
                status: 'scheduled',
                priority: 'medium',
                importedFrom: 'ics',
                importedAt: new Date(),
                externalId: eventData.uid
            });
            createdEvents.push(event);
        } catch (error) {
            errors.push({
                event: eventData.title,
                error: error.message
            });
        }
    }

    res.status(201).json({
        success: true,
        message: `${createdEvents.length} event(s) imported successfully`,
        data: {
            imported: createdEvents.length,
            failed: errors.length,
            events: createdEvents,
            errors: errors.length > 0 ? errors : undefined
        }
    });
});

// Helper function to generate ICS content
function generateICS(event) {
    const formatDate = (date, allDay = false) => {
        const d = new Date(date);
        if (allDay) {
            return d.toISOString().replace(/[-:]/g, '').split('T')[0];
        }
        return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const escapeText = (text) => {
        if (!text) return '';
        return text
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n');
    };

    const foldLine = (line) => {
        const result = [];
        while (line.length > 75) {
            result.push(line.substring(0, 75));
            line = ' ' + line.substring(75);
        }
        result.push(line);
        return result.join('\r\n');
    };

    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Traf3li//Calendar//AR',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT'
    ];

    // UID
    lines.push(`UID:${event._id}@traf3li.com`);

    // Timestamps
    lines.push(`DTSTAMP:${formatDate(new Date())}`);
    lines.push(`CREATED:${formatDate(event.createdAt)}`);
    lines.push(`LAST-MODIFIED:${formatDate(event.updatedAt || event.createdAt)}`);

    // Date/Time
    if (event.allDay) {
        lines.push(`DTSTART;VALUE=DATE:${formatDate(event.startDateTime, true)}`);
        if (event.endDateTime) {
            lines.push(`DTEND;VALUE=DATE:${formatDate(event.endDateTime, true)}`);
        }
    } else {
        lines.push(`DTSTART:${formatDate(event.startDateTime)}`);
        if (event.endDateTime) {
            lines.push(`DTEND:${formatDate(event.endDateTime)}`);
        }
    }

    // Summary (Title)
    lines.push(foldLine(`SUMMARY:${escapeText(event.title)}`));

    // Description
    if (event.description) {
        lines.push(foldLine(`DESCRIPTION:${escapeText(event.description)}`));
    }

    // Location
    if (event.location) {
        const locationStr = event.location.address ||
                           (event.location.type === 'virtual' ? event.location.meetingUrl : '');
        if (locationStr) {
            lines.push(foldLine(`LOCATION:${escapeText(locationStr)}`));
        }
    }

    // Organizer
    if (event.organizer) {
        const orgEmail = event.organizer.email || 'noreply@traf3li.com';
        const orgName = `${event.organizer.firstName || ''} ${event.organizer.lastName || ''}`.trim();
        lines.push(`ORGANIZER;CN=${escapeText(orgName)}:mailto:${orgEmail}`);
    }

    // Attendees
    if (event.attendees && event.attendees.length > 0) {
        event.attendees.forEach(attendee => {
            if (attendee.userId && attendee.userId.email) {
                const attendeeName = `${attendee.userId.firstName || ''} ${attendee.userId.lastName || ''}`.trim();
                const partstat = attendee.status === 'confirmed' ? 'ACCEPTED' :
                                attendee.status === 'declined' ? 'DECLINED' :
                                attendee.status === 'tentative' ? 'TENTATIVE' : 'NEEDS-ACTION';
                lines.push(`ATTENDEE;CN=${escapeText(attendeeName)};PARTSTAT=${partstat}:mailto:${attendee.userId.email}`);
            }
        });
    }

    // Priority
    const priorityMap = { 'critical': 1, 'high': 3, 'medium': 5, 'low': 7 };
    if (event.priority && priorityMap[event.priority]) {
        lines.push(`PRIORITY:${priorityMap[event.priority]}`);
    }

    // Status
    const statusMap = {
        'scheduled': 'CONFIRMED',
        'confirmed': 'CONFIRMED',
        'cancelled': 'CANCELLED',
        'tentative': 'TENTATIVE'
    };
    lines.push(`STATUS:${statusMap[event.status] || 'CONFIRMED'}`);

    // Categories (based on type)
    if (event.type) {
        lines.push(`CATEGORIES:${event.type.toUpperCase()}`);
    }

    // Case reference in X-property
    if (event.caseId) {
        lines.push(`X-TRAF3LI-CASE-ID:${event.caseId._id || event.caseId}`);
        if (event.caseId.caseNumber) {
            lines.push(`X-TRAF3LI-CASE-NUMBER:${event.caseId.caseNumber}`);
        }
    }

    lines.push('END:VEVENT');
    lines.push('END:VCALENDAR');

    return lines.join('\r\n');
}

// Helper function to parse ICS content
function parseICS(icsContent) {
    const events = [];
    const lines = icsContent.replace(/\r\n /g, '').split(/\r?\n/);

    let currentEvent = null;
    let inEvent = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line === 'BEGIN:VEVENT') {
            inEvent = true;
            currentEvent = {};
            continue;
        }

        if (line === 'END:VEVENT') {
            if (currentEvent && currentEvent.startDate) {
                events.push(currentEvent);
            }
            currentEvent = null;
            inEvent = false;
            continue;
        }

        if (!inEvent || !currentEvent) continue;

        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;

        const keyPart = line.substring(0, colonIndex);
        const value = line.substring(colonIndex + 1);
        const key = keyPart.split(';')[0];

        switch (key) {
            case 'UID':
                currentEvent.uid = value;
                break;
            case 'SUMMARY':
                currentEvent.title = unescapeICS(value);
                break;
            case 'DESCRIPTION':
                currentEvent.description = unescapeICS(value);
                break;
            case 'LOCATION':
                currentEvent.location = unescapeICS(value);
                break;
            case 'DTSTART':
                currentEvent.startDate = parseICSDate(value, keyPart);
                currentEvent.allDay = keyPart.includes('VALUE=DATE') && !keyPart.includes('DATE-TIME');
                break;
            case 'DTEND':
                currentEvent.endDate = parseICSDate(value, keyPart);
                break;
        }
    }

    return events;
}

// Helper function to parse ICS date
function parseICSDate(value, keyPart) {
    // Check if it's a date-only value
    if (keyPart.includes('VALUE=DATE') && value.length === 8) {
        const year = value.substring(0, 4);
        const month = value.substring(4, 6);
        const day = value.substring(6, 8);
        return new Date(`${year}-${month}-${day}T00:00:00Z`);
    }

    // Full datetime value
    const cleanValue = value.replace('Z', '');
    if (cleanValue.length >= 15) {
        const year = cleanValue.substring(0, 4);
        const month = cleanValue.substring(4, 6);
        const day = cleanValue.substring(6, 8);
        const hour = cleanValue.substring(9, 11);
        const minute = cleanValue.substring(11, 13);
        const second = cleanValue.substring(13, 15);
        return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
    }

    return new Date(value);
}

// Helper function to unescape ICS text
function unescapeICS(text) {
    return text
        .replace(/\\n/g, '\n')
        .replace(/\\,/g, ',')
        .replace(/\\;/g, ';')
        .replace(/\\\\/g, '\\');
}

// Helper function to sanitize filename
function sanitizeFilename(filename) {
    return filename
        .replace(/[^a-zA-Z0-9\u0600-\u06FF\s-_]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50) || 'event';
}

// === NLP & VOICE ENDPOINTS ===

/**
 * Create event from natural language
 * POST /api/events/parse
 */
const createEventFromNaturalLanguage = asyncHandler(async (req, res) => {
    const { text } = req.body;
    const userId = req.userID;
    const firmId = req.firmId;

    // Block departed users from creating events
    if (req.isDeparted) {
        throw CustomException('لم يعد لديك صلاحية إنشاء مواعيد جديدة', 403);
    }

    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw CustomException('Natural language text is required', 400);
    }

    // Parse the natural language input using NLP service
    const parseResult = await nlpService.parseEventFromText(text, {
        timezone: req.body.timezone || 'Asia/Riyadh',
        currentDateTime: new Date()
    });

    if (!parseResult.success) {
        throw CustomException('Failed to parse event from text', 400);
    }

    const { eventData, confidence } = parseResult;

    // IDOR Protection: Validate case access if provided
    if (eventData.caseId) {
        const caseDoc = await Case.findById(eventData.caseId);
        if (!caseDoc || (caseDoc.firmId && caseDoc.firmId.toString() !== firmId.toString())) {
            throw CustomException('Case not found or you do not have access', 404);
        }
    }

    // IDOR Protection: Validate client access if provided
    if (eventData.clientId) {
        const clientDoc = await User.findById(eventData.clientId);
        if (!clientDoc || (clientDoc.firmId && clientDoc.firmId.toString() !== firmId.toString())) {
            throw CustomException('Client not found or you do not have access', 404);
        }
    }

    // Date/Time Validation
    const parsedStartDateTime = parseAndValidateDate(eventData.startDateTime);
    const parsedEndDateTime = eventData.endDateTime ? parseAndValidateDate(eventData.endDateTime) : null;
    validateDateRange(parsedStartDateTime, parsedEndDateTime);
    validateFutureDate(parsedStartDateTime, false);

    // Prepare attendees array for event creation
    const attendeesArray = [];
    if (eventData.attendees && Array.isArray(eventData.attendees)) {
        for (const attendee of eventData.attendees) {
            // Try to find user by name or email
            // SECURITY: Only match users within the same firm to prevent cross-firm data exposure
            let attendeeUserId = null;
            if (attendee.email) {
                const userFilter = { email: attendee.email };
                // Scope to same firm for multi-tenancy security
                if (firmId) {
                    userFilter.firmId = firmId;
                }
                const user = await User.findOne(userFilter);
                if (user) attendeeUserId = user._id;
            }

            attendeesArray.push({
                userId: attendeeUserId,
                email: attendee.email || null,
                name: attendee.name || null,
                role: attendee.role || 'required',
                isRequired: attendee.role !== 'optional',
                status: 'invited'
            });
        }
    }

    // Prepare location data with validation
    let locationData = null;
    if (eventData.location && typeof eventData.location === 'object') {
        locationData = {
            name: eventData.location.name || null,
            address: eventData.location.address || null,
            virtualLink: eventData.location.virtualLink || null,
            virtualPlatform: eventData.location.virtualPlatform || null
        };
    }

    // Create the event
    const event = await Event.create({
        title: eventData.title,
        type: eventData.type || 'meeting',
        description: eventData.description || null,
        startDateTime: parsedStartDateTime,
        endDateTime: parsedEndDateTime,
        allDay: eventData.allDay || false,
        timezone: req.body.timezone || 'Asia/Riyadh',
        location: locationData,
        caseId: eventData.caseId || null,
        clientId: eventData.clientId || null,
        organizer: userId,
        firmId,
        attendees: attendeesArray,
        reminders: [],
        recurrence: { enabled: false },
        priority: eventData.priority || 'medium',
        visibility: 'private',
        color: '#3b82f6',
        tags: eventData.tags || [],
        notes: eventData.notes || null,
        createdBy: userId,
        metadata: {
            createdVia: 'nlp',
            originalText: text,
            parsingConfidence: confidence,
            tokensUsed: parseResult.tokensUsed
        }
    });

    // Create default reminders
    const start = parsedStartDateTime;

    if (start.getTime() - Date.now() > 24 * 60 * 60 * 1000) {
        event.reminders.push({
            type: 'notification',
            beforeMinutes: 24 * 60,
            sent: false
        });
    }

    if (start.getTime() - Date.now() > 60 * 60 * 1000) {
        event.reminders.push({
            type: 'notification',
            beforeMinutes: 60,
            sent: false
        });
    }

    await event.save();

    await event.populate([
        { path: 'organizer', select: 'firstName lastName image email' },
        { path: 'attendees.userId', select: 'firstName lastName image email' },
        { path: 'caseId', select: 'title caseNumber' },
        { path: 'clientId', select: 'firstName lastName' }
    ]);

    res.status(201).json({
        success: true,
        message: 'Event created successfully from natural language',
        data: event,
        parsing: {
            confidence: confidence,
            originalText: text,
            tokensUsed: parseResult.tokensUsed
        }
    });
});

/**
 * Create event from voice transcription
 * POST /api/events/voice
 */
const createEventFromVoice = asyncHandler(async (req, res) => {
    const { transcription } = req.body;
    const userId = req.userID;
    const firmId = req.firmId;

    // Block departed users from creating events
    if (req.isDeparted) {
        throw CustomException('لم يعد لديك صلاحية إنشاء مواعيد جديدة', 403);
    }

    // Validate input
    if (!transcription || typeof transcription !== 'string' || transcription.trim().length === 0) {
        throw CustomException('Voice transcription is required', 400);
    }

    // Validate transcription quality
    const validation = voiceToTaskService.validateTranscription(transcription);
    if (!validation.isValid) {
        throw CustomException(
            `Invalid transcription: ${validation.warnings.join(', ')}`,
            400
        );
    }

    // Process voice transcription
    const voiceResult = await voiceToTaskService.processVoiceTranscription(transcription, {
        timezone: req.body.timezone || 'Asia/Riyadh',
        currentDateTime: new Date()
    });

    if (!voiceResult.success) {
        throw CustomException('Failed to process voice transcription', 400);
    }

    const { eventData, confidence } = voiceResult;

    // Formalize the event data (clean up casual speech)
    const formalizedData = voiceToTaskService.formalizeEventData(eventData);

    // IDOR Protection: Validate case access if provided
    if (formalizedData.caseId) {
        const caseDoc = await Case.findById(formalizedData.caseId);
        if (!caseDoc || (caseDoc.firmId && caseDoc.firmId.toString() !== firmId.toString())) {
            throw CustomException('Case not found or you do not have access', 404);
        }
    }

    // IDOR Protection: Validate client access if provided
    if (formalizedData.clientId) {
        const clientDoc = await User.findById(formalizedData.clientId);
        if (!clientDoc || (clientDoc.firmId && clientDoc.firmId.toString() !== firmId.toString())) {
            throw CustomException('Client not found or you do not have access', 404);
        }
    }

    // Date/Time Validation
    const parsedStartDateTime = parseAndValidateDate(formalizedData.startDateTime);
    const parsedEndDateTime = formalizedData.endDateTime ? parseAndValidateDate(formalizedData.endDateTime) : null;
    validateDateRange(parsedStartDateTime, parsedEndDateTime);
    validateFutureDate(parsedStartDateTime, false);

    // Prepare attendees array
    const attendeesArray = [];
    if (formalizedData.attendees && Array.isArray(formalizedData.attendees)) {
        for (const attendee of formalizedData.attendees) {
            // SECURITY: Only match users within the same firm to prevent cross-firm data exposure
            let attendeeUserId = null;
            if (attendee.email) {
                const userFilter = { email: attendee.email };
                // Scope to same firm for multi-tenancy security
                if (firmId) {
                    userFilter.firmId = firmId;
                }
                const user = await User.findOne(userFilter);
                if (user) attendeeUserId = user._id;
            }

            attendeesArray.push({
                userId: attendeeUserId,
                email: attendee.email || null,
                name: attendee.name || null,
                role: attendee.role || 'required',
                isRequired: attendee.role !== 'optional',
                status: 'invited'
            });
        }
    }

    // Prepare location data with validation
    let locationData = null;
    if (formalizedData.location && typeof formalizedData.location === 'object') {
        locationData = {
            name: formalizedData.location.name || null,
            address: formalizedData.location.address || null,
            virtualLink: formalizedData.location.virtualLink || null,
            virtualPlatform: formalizedData.location.virtualPlatform || null
        };
    }

    // Create the event
    const event = await Event.create({
        title: formalizedData.title,
        type: formalizedData.type || 'meeting',
        description: formalizedData.description || null,
        startDateTime: parsedStartDateTime,
        endDateTime: parsedEndDateTime,
        allDay: formalizedData.allDay || false,
        timezone: req.body.timezone || 'Asia/Riyadh',
        location: locationData,
        caseId: formalizedData.caseId || null,
        clientId: formalizedData.clientId || null,
        organizer: userId,
        firmId,
        attendees: attendeesArray,
        reminders: [],
        recurrence: { enabled: false },
        priority: formalizedData.priority || 'medium',
        visibility: 'private',
        color: '#3b82f6',
        tags: formalizedData.tags || [],
        notes: formalizedData.notes || null,
        createdBy: userId,
        metadata: {
            createdVia: 'voice',
            originalTranscription: transcription,
            cleanedTranscription: voiceResult.metadata?.cleanedTranscription,
            parsingConfidence: confidence,
            validationWarnings: validation.warnings
        }
    });

    // Create default reminders
    const start = parsedStartDateTime;

    if (start.getTime() - Date.now() > 24 * 60 * 60 * 1000) {
        event.reminders.push({
            type: 'notification',
            beforeMinutes: 24 * 60,
            sent: false
        });
    }

    if (start.getTime() - Date.now() > 60 * 60 * 1000) {
        event.reminders.push({
            type: 'notification',
            beforeMinutes: 60,
            sent: false
        });
    }

    await event.save();

    await event.populate([
        { path: 'organizer', select: 'firstName lastName image email' },
        { path: 'attendees.userId', select: 'firstName lastName image email' },
        { path: 'caseId', select: 'title caseNumber' },
        { path: 'clientId', select: 'firstName lastName' }
    ]);

    res.status(201).json({
        success: true,
        message: 'Event created successfully from voice transcription',
        data: event,
        parsing: {
            confidence: confidence,
            validationConfidence: validation.confidence,
            warnings: validation.warnings,
            suggestions: voiceToTaskService.generateSuggestions(transcription),
            originalTranscription: transcription,
            cleanedTranscription: voiceResult.metadata?.cleanedTranscription
        }
    });
});

module.exports = {
    createEvent,
    getEvents,
    getEvent,
    updateEvent,
    deleteEvent,
    cancelEvent,
    postponeEvent,
    completeEvent,
    addAttendee,
    removeAttendee,
    rsvpEvent,
    addAgendaItem,
    updateAgendaItem,
    deleteAgendaItem,
    addActionItem,
    updateActionItem,
    getCalendarEvents,
    getUpcomingEvents,
    getEventsByDate,
    getEventsByMonth,
    getEventStats,
    checkAvailability,
    syncTaskToCalendar,
    exportEventToICS,
    importEventsFromICS,
    createEventFromNaturalLanguage,
    createEventFromVoice
};
