const { Event, Task, Case } = require('../models');
const { createNotification } = require('./notification.controller');
const CustomException = require('../utils/CustomException');

// Create event
const createEvent = async (request, response) => {
    try {
        const {
            title,
            type,
            description,
            startDate,
            endDate,
            allDay,
            location,
            caseId,
            taskId,
            attendees,
            reminders,
            notes,
            color,
            recurrence
        } = request.body;

        // Validate required fields
        if (!title || !type || !startDate) {
            throw new CustomException('Title, type, and start date are required', 400);
        }

        // If caseId provided, validate access
        if (caseId) {
            const caseDoc = await Case.findById(caseId);
            if (!caseDoc) {
                throw new CustomException('Case not found', 404);
            }
            
            const hasAccess = caseDoc.lawyerID.toString() === request.userID ||
                            caseDoc.clientID.toString() === request.userID;
            
            if (!hasAccess) {
                throw new CustomException('No access to this case', 403);
            }
        }

        // Create event
        const event = new Event({
            title,
            type,
            description,
            startDate,
            endDate,
            allDay,
            location,
            caseId,
            taskId,
            attendees: attendees || [],
            reminders: reminders || [],
            notes,
            color,
            createdBy: request.userID,
            recurrence
        });

        await event.save();

        // Create default reminders if none provided
        if (!reminders || reminders.length === 0) {
            const oneDayBefore = new Date(startDate);
            oneDayBefore.setDate(oneDayBefore.getDate() - 1);
            
            const oneHourBefore = new Date(startDate);
            oneHourBefore.setHours(oneHourBefore.getHours() - 1);

            if (oneDayBefore > new Date()) {
                event.reminders.push({
                    type: 'notification',
                    time: oneDayBefore,
                    sent: false
                });
            }

            if (oneHourBefore > new Date()) {
                event.reminders.push({
                    type: 'notification',
                    time: oneHourBefore,
                    sent: false
                });
            }

            await event.save();
        }

        // Populate references
        await event.populate([
            { path: 'createdBy', select: 'username image' },
            { path: 'attendees', select: 'username image' },
            { path: 'caseId', select: 'title category' },
            { path: 'taskId', select: 'title dueDate' }
        ]);

        return response.status(201).send(event);
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get events
const getEvents = async (request, response) => {
    try {
        const { startDate, endDate, type, caseId, status } = request.query;

        const query = {
            $or: [
                { createdBy: request.userID },
                { attendees: request.userID }
            ]
        };

        // Filter by date range
        if (startDate && endDate) {
            query.startDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Filter by type
        if (type) {
            query.type = type;
        }

        // Filter by case
        if (caseId) {
            query.caseId = caseId;
        }

        // Filter by status
        if (status) {
            query.status = status;
        }

        const events = await Event.find(query)
            .populate('createdBy', 'username image')
            .populate('attendees', 'username image')
            .populate('caseId', 'title category')
            .populate('taskId', 'title dueDate')
            .sort({ startDate: 1 });

        // Also get tasks due in this date range (if date range provided)
        let tasks = [];
        if (startDate && endDate) {
            tasks = await Task.find({
                $or: [
                    { assignedTo: request.userID },
                    { createdBy: request.userID }
                ],
                dueDate: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                },
                status: { $ne: 'done' }
            })
            .populate('assignedTo', 'username image')
            .populate('caseId', 'title')
            .sort({ dueDate: 1 });
        }

        return response.status(200).send({
            events,
            tasks
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get single event
const getEvent = async (request, response) => {
    try {
        const { id } = request.params;

        const event = await Event.findById(id)
            .populate('createdBy', 'username image email')
            .populate('attendees', 'username image email')
            .populate('caseId')
            .populate('taskId');

        if (!event) {
            throw new CustomException('Event not found', 404);
        }

        // Check access
        const hasAccess = event.createdBy._id.toString() === request.userID ||
                         event.isUserAttendee(request.userID);

        if (!hasAccess) {
            throw new CustomException('No access to this event', 403);
        }

        return response.status(200).send(event);
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Update event
const updateEvent = async (request, response) => {
    try {
        const { id } = request.params;

        const event = await Event.findById(id);

        if (!event) {
            throw new CustomException('Event not found', 404);
        }

        // Only creator can update
        if (event.createdBy.toString() !== request.userID) {
            throw new CustomException('Only event creator can update', 403);
        }

        // Update fields
        Object.keys(request.body).forEach(key => {
            event[key] = request.body[key];
        });

        await event.save();

        // Populate references
        await event.populate([
            { path: 'createdBy', select: 'username image' },
            { path: 'attendees', select: 'username image' },
            { path: 'caseId', select: 'title category' },
            { path: 'taskId', select: 'title dueDate' }
        ]);

        return response.status(200).send(event);
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Delete event
const deleteEvent = async (request, response) => {
    try {
        const { id } = request.params;

        const event = await Event.findById(id);

        if (!event) {
            throw new CustomException('Event not found', 404);
        }

        // Only creator can delete
        if (event.createdBy.toString() !== request.userID) {
            throw new CustomException('Only event creator can delete', 403);
        }

        await Event.findByIdAndDelete(id);

        return response.status(200).send({
            success: true,
            message: 'Event deleted successfully'
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get upcoming events (next 7 days)
const getUpcomingEvents = async (request, response) => {
    try {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        const events = await Event.find({
            $or: [
                { createdBy: request.userID },
                { attendees: request.userID }
            ],
            startDate: {
                $gte: today,
                $lte: nextWeek
            },
            status: { $ne: 'cancelled' }
        })
        .populate('createdBy', 'username image')
        .populate('caseId', 'title')
        .sort({ startDate: 1 })
        .limit(10);

        return response.status(200).send(events);
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get events by specific date
const getEventsByDate = async (request, response) => {
    try {
        const { date } = request.params;
        
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const events = await Event.find({
            $or: [
                { createdBy: request.userID },
                { attendees: request.userID }
            ],
            startDate: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        })
        .populate('createdBy', 'username image')
        .populate('caseId', 'title')
        .sort({ startDate: 1 });

        // Get tasks due on this date
        const tasks = await Task.find({
            $or: [
                { assignedTo: request.userID },
                { createdBy: request.userID }
            ],
            dueDate: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            status: { $ne: 'done' }
        })
        .populate('assignedTo', 'username image')
        .populate('caseId', 'title');

        return response.status(200).send({ events, tasks });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get events by month
const getEventsByMonth = async (request, response) => {
    try {
        const { year, month } = request.params;
        
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const events = await Event.find({
            $or: [
                { createdBy: request.userID },
                { attendees: request.userID }
            ],
            startDate: {
                $gte: startDate,
                $lte: endDate
            }
        })
        .populate('createdBy', 'username image')
        .populate('caseId', 'title')
        .sort({ startDate: 1 });

        // Group by date
        const groupedEvents = {};
        events.forEach(event => {
            const dateKey = event.startDate.toISOString().split('T')[0];
            if (!groupedEvents[dateKey]) {
                groupedEvents[dateKey] = [];
            }
            groupedEvents[dateKey].push(event);
        });

        return response.status(200).send(groupedEvents);
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Mark event as completed
const markEventCompleted = async (request, response) => {
    try {
        const { id } = request.params;

        const event = await Event.findById(id);

        if (!event) {
            throw new CustomException('Event not found', 404);
        }

        const hasAccess = event.createdBy.toString() === request.userID ||
                         event.isUserAttendee(request.userID);

        if (!hasAccess) {
            throw new CustomException('No access to this event', 403);
        }

        event.status = 'completed';
        await event.save();

        await event.populate([
            { path: 'createdBy', select: 'username image' },
            { path: 'caseId', select: 'title' }
        ]);

        return response.status(200).send(event);
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Helper: Sync task to calendar
const syncTaskToCalendar = async (taskId) => {
    try {
        const task = await Task.findById(taskId);
        if (!task) return;

        // Check if event already exists
        const existingEvent = await Event.findOne({ taskId: task._id });

        if (existingEvent) {
            // Update existing event
            existingEvent.title = task.title;
            existingEvent.description = task.description;
            existingEvent.startDate = task.dueDate;
            existingEvent.status = task.status === 'done' ? 'completed' : 'scheduled';
            await existingEvent.save();
        } else {
            // Create new event
            await Event.create({
                title: task.title,
                type: 'task',
                description: task.description,
                startDate: task.dueDate,
                allDay: true,
                taskId: task._id,
                caseId: task.caseId,
                createdBy: task.createdBy,
                attendees: [task.assignedTo],
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
    getUpcomingEvents,
    getEventsByDate,
    getEventsByMonth,
    markEventCompleted,
    syncTaskToCalendar
};
