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

    // Validate required fields
    if (!title || !type || !startDateTime) {
        throw new CustomException('Title, type, and start date/time are required', 400);
    }

    // Validate case access if provided
    if (caseId) {
        const caseDoc = await Case.findById(caseId);
        if (!caseDoc) {
            throw new CustomException('Case not found', 404);
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
    const query = {
        $or: [
            { createdBy: userId },
            { organizer: userId },
            { 'attendees.userId': userId }
        ]
    };

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
        data: { events, tasks },
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
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
        throw new CustomException('Event not found', 404);
    }

    // Check access
    const hasAccess = event.createdBy._id.toString() === userId ||
                      event.organizer._id.toString() === userId ||
                      event.isUserAttendee(userId);

    if (!hasAccess) {
        throw new CustomException('You do not have access to this event', 403);
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

    const event = await Event.findById(id);

    if (!event) {
        throw new CustomException('Event not found', 404);
    }

    // Only organizer or creator can update
    if (event.organizer.toString() !== userId && event.createdBy.toString() !== userId) {
        throw new CustomException('Only the organizer can update this event', 403);
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

    const event = await Event.findById(id);

    if (!event) {
        throw new CustomException('Event not found', 404);
    }

    // Only organizer or creator can delete
    if (event.organizer.toString() !== userId && event.createdBy.toString() !== userId) {
        throw new CustomException('Only the organizer can delete this event', 403);
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
        throw new CustomException('Event not found', 404);
    }

    if (event.organizer.toString() !== userId && event.createdBy.toString() !== userId) {
        throw new CustomException('Only the organizer can cancel this event', 403);
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
        throw new CustomException('New date/time is required', 400);
    }

    const event = await Event.findById(id);

    if (!event) {
        throw new CustomException('Event not found', 404);
    }

    if (event.organizer.toString() !== userId && event.createdBy.toString() !== userId) {
        throw new CustomException('Only the organizer can postpone this event', 403);
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
        throw new CustomException('Event not found', 404);
    }

    const hasAccess = event.organizer.toString() === userId ||
                      event.createdBy.toString() === userId ||
                      event.isUserAttendee(userId);

    if (!hasAccess) {
        throw new CustomException('You cannot complete this event', 403);
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
        throw new CustomException('Event not found', 404);
    }

    if (event.organizer.toString() !== userId && event.createdBy.toString() !== userId) {
        throw new CustomException('Only the organizer can add attendees', 403);
    }

    // Check if attendee already exists
    if (attendeeUserId) {
        const exists = event.attendees.some(a => a.userId?.toString() === attendeeUserId);
        if (exists) {
            throw new CustomException('Attendee already added to this event', 400);
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
        throw new CustomException('Event not found', 404);
    }

    if (event.organizer.toString() !== userId && event.createdBy.toString() !== userId) {
        throw new CustomException('Only the organizer can remove attendees', 403);
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
        throw new CustomException('Valid RSVP status is required (confirmed, declined, tentative)', 400);
    }

    const event = await Event.findById(id);

    if (!event) {
        throw new CustomException('Event not found', 404);
    }

    // Find attendee entry for this user
    const attendee = event.attendees.find(a => a.userId?.toString() === userId);

    if (!attendee) {
        throw new CustomException('You are not invited to this event', 403);
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
        throw new CustomException('Event not found', 404);
    }

    if (event.organizer.toString() !== userId && event.createdBy.toString() !== userId) {
        throw new CustomException('Only the organizer can manage agenda', 403);
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
        throw new CustomException('Event not found', 404);
    }

    if (event.organizer.toString() !== userId && event.createdBy.toString() !== userId) {
        throw new CustomException('Only the organizer can manage agenda', 403);
    }

    const agendaItem = event.agenda.id(agendaId);
    if (!agendaItem) {
        throw new CustomException('Agenda item not found', 404);
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
        throw new CustomException('Event not found', 404);
    }

    if (event.organizer.toString() !== userId && event.createdBy.toString() !== userId) {
        throw new CustomException('Only the organizer can manage agenda', 403);
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
        throw new CustomException('Event not found', 404);
    }

    const hasAccess = event.organizer.toString() === userId ||
                      event.createdBy.toString() === userId ||
                      event.isUserAttendee(userId);

    if (!hasAccess) {
        throw new CustomException('You cannot add action items to this event', 403);
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
        throw new CustomException('Event not found', 404);
    }

    const item = event.actionItems.id(itemId);
    if (!item) {
        throw new CustomException('Action item not found', 404);
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

    if (!startDate || !endDate) {
        throw new CustomException('Start date and end date are required', 400);
    }

    const events = await Event.getCalendarEvents(
        userId,
        new Date(startDate),
        new Date(endDate),
        { caseId, type, status }
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

    const events = await Event.getUpcoming(userId, parseInt(days));

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

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const events = await Event.find({
        $or: [
            { createdBy: userId },
            { organizer: userId },
            { 'attendees.userId': userId }
        ],
        startDateTime: { $gte: startOfDay, $lte: endOfDay }
    })
        .populate('organizer', 'firstName lastName image')
        .populate('caseId', 'title caseNumber')
        .sort({ startDateTime: 1 });

    // Get tasks due on this date
    const tasks = await Task.find({
        $or: [
            { assignedTo: userId },
            { createdBy: userId }
        ],
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

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const events = await Event.find({
        $or: [
            { createdBy: userId },
            { organizer: userId },
            { 'attendees.userId': userId }
        ],
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

    const stats = await Event.getStats(userId, { startDate, endDate });

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
        throw new CustomException('User IDs, start time, and end time are required', 400);
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
    syncTaskToCalendar
};
