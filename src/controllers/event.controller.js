const { Event, Task, Case, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Create event
 * POST /api/events
 */
const createEvent = asyncHandler(async (req, res) => {
    const {
        title,
        type,
        description,
        startDateTime,
        endDateTime,
        allDay,
        timezone,
        location,
        caseId,
        clientId,
        taskId,
        attendees,
        agenda,
        reminders,
        recurrence,
        priority,
        visibility,
        color,
        tags,
        notes
    } = req.body;

    const userId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    // Block departed users from creating events
    if (req.isDeparted) {
        throw CustomException('لم يعد لديك صلاحية إنشاء مواعيد جديدة', 403);
    }

    // Validate required fields
    if (!title || !type || !startDateTime) {
        throw CustomException('Title, type, and start date/time are required', 400);
    }

    // Validate case access if provided
    if (caseId) {
        const caseDoc = await Case.findById(caseId);
        if (!caseDoc) {
            throw CustomException('Case not found', 404);
        }
    }

    // Create event
    const event = await Event.create({
        title,
        type,
        description,
        startDateTime: new Date(startDateTime),
        endDateTime: endDateTime ? new Date(endDateTime) : null,
        allDay: allDay || false,
        timezone: timezone || 'Asia/Riyadh',
        location,
        caseId,
        clientId,
        taskId,
        organizer: userId,
        firmId, // Add firmId for multi-tenancy
        attendees: attendees || [],
        agenda: agenda || [],
        reminders: reminders || [],
        recurrence: recurrence || { enabled: false },
        priority: priority || 'medium',
        visibility: visibility || 'private',
        color: color || '#3b82f6',
        tags: tags || [],
        notes,
        createdBy: userId
    });

    // Create default reminders if none provided
    if (!reminders || reminders.length === 0) {
        const start = new Date(startDateTime);

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

    await event.populate([
        { path: 'organizer', select: 'firstName lastName image email' },
        { path: 'attendees.userId', select: 'firstName lastName image email' },
        { path: 'caseId', select: 'title caseNumber' },
        { path: 'clientId', select: 'firstName lastName' }
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
        sortOrder = 'asc'
    } = req.query;

    const userId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware
    const isDeparted = req.isDeparted; // From firmFilter middleware

    // Build query - firmId first, then user-based
    let query;
    if (firmId) {
        if (isDeparted) {
            // Departed users can only see events they organized or attended
            query = {
                firmId,
                $or: [
                    { createdBy: userId },
                    { organizer: userId },
                    { 'attendees.userId': userId }
                ]
            };
        } else {
            // Active firm members see all firm events
            query = { firmId };
        }
    } else {
        query = {
            $or: [
                { createdBy: userId },
                { organizer: userId },
                { 'attendees.userId': userId }
            ]
        };
    }

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

    const events = await Event.find(query)
        .populate('organizer', 'firstName lastName image')
        .populate('attendees.userId', 'firstName lastName image')
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'firstName lastName')
        .sort(sortOptions)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Event.countDocuments(query);

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

    res.status(200).json({
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
    });
});

/**
 * Get single event
 * GET /api/events/:id
 */
const getEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

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

    // Check access - firmId first, then user-based
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

    // Check access - firmId first, then organizer/creator
    const canUpdate = firmId
        ? event.firmId && event.firmId.toString() === firmId.toString()
        : (event.organizer.toString() === userId || event.createdBy.toString() === userId);

    if (!canUpdate) {
        throw CustomException('Only the organizer can update this event', 403);
    }

    const allowedFields = [
        'title', 'type', 'description', 'startDateTime', 'endDateTime',
        'allDay', 'timezone', 'location', 'caseId', 'clientId', 'taskId',
        'attendees', 'agenda', 'actionItems', 'reminders', 'recurrence',
        'priority', 'visibility', 'color', 'tags', 'notes', 'minutesNotes'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            event[field] = req.body[field];
        }
    });

    event.lastModifiedBy = userId;
    await event.save();

    await event.populate([
        { path: 'organizer', select: 'firstName lastName image' },
        { path: 'attendees.userId', select: 'firstName lastName image' },
        { path: 'caseId', select: 'title caseNumber' }
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

    const event = await Event.findById(id);

    if (!event) {
        throw CustomException('Event not found', 404);
    }

    if (event.organizer.toString() !== userId && event.createdBy.toString() !== userId) {
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

    if (!newDateTime) {
        throw CustomException('New date/time is required', 400);
    }

    const event = await Event.findById(id);

    if (!event) {
        throw CustomException('Event not found', 404);
    }

    if (event.organizer.toString() !== userId && event.createdBy.toString() !== userId) {
        throw CustomException('Only the organizer can postpone this event', 403);
    }

    event.status = 'postponed';
    event.postponedTo = new Date(newDateTime);
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

    const event = await Event.findById(id);

    if (!event) {
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

    const event = await Event.findById(id);

    if (!event) {
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

    const event = await Event.findById(id);

    if (!event) {
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

    if (!status || !['confirmed', 'declined', 'tentative'].includes(status)) {
        throw CustomException('Valid RSVP status is required (confirmed, declined, tentative)', 400);
    }

    const event = await Event.findById(id);

    if (!event) {
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

    const event = await Event.findById(id);

    if (!event) {
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

    const event = await Event.findById(id);

    if (!event) {
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

    const event = await Event.findById(id);

    if (!event) {
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

    const event = await Event.findById(id);

    if (!event) {
        throw CustomException('Event not found', 404);
    }

    const hasAccess = event.organizer.toString() === userId ||
                      event.createdBy.toString() === userId ||
                      event.isUserAttendee(userId);

    if (!hasAccess) {
        throw CustomException('You cannot add action items to this event', 403);
    }

    event.actionItems.push({
        description,
        assignedTo,
        dueDate,
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

    const event = await Event.findById(id);

    if (!event) {
        throw CustomException('Event not found', 404);
    }

    const item = event.actionItems.id(itemId);
    if (!item) {
        throw CustomException('Action item not found', 404);
    }

    const allowedFields = ['description', 'assignedTo', 'dueDate', 'status', 'priority'];
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            item[field] = req.body[field];
        }
    });

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

    if (!userIds || !startDateTime || !endDateTime) {
        throw CustomException('User IDs, start time, and end time are required', 400);
    }

    const result = await Event.checkAvailability(
        userIds,
        new Date(startDateTime),
        new Date(endDateTime),
        excludeEventId
    );

    res.status(200).json({
        success: true,
        data: result
    });
});

/**
 * Sync task to calendar (helper)
 */
const syncTaskToCalendar = async (taskId) => {
    try {
        const task = await Task.findById(taskId);
        if (!task || !task.dueDate) return;

        const existingEvent = await Event.findOne({ taskId: task._id });

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
        console.error('Error syncing task to calendar:', error);
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

    const event = await Event.findById(id)
        .populate('organizer', 'firstName lastName email')
        .populate('attendees.userId', 'firstName lastName email')
        .populate('caseId', 'title caseNumber');

    if (!event) {
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
    importEventsFromICS
};
