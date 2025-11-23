const { Event, Task, Reminder, Case } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Get unified calendar view (events + tasks + reminders)
 * GET /api/calendar
 * Query params: startDate, endDate, type (event|task|reminder), caseId
 */
const getCalendarView = asyncHandler(async (req, res) => {
    const { startDate, endDate, type, caseId } = req.query;
    const userId = req.userID;

    // Default to current month if no dates provided
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

    const result = {
        events: [],
        tasks: [],
        reminders: [],
        summary: {
            totalItems: 0,
            eventCount: 0,
            taskCount: 0,
            reminderCount: 0
        }
    };

    // Build base query for case filtering
    const caseFilter = caseId ? { caseId } : {};

    // Fetch events
    if (!type || type === 'event') {
        const eventQuery = {
            $or: [
                { createdBy: userId },
                { attendees: userId }
            ],
            startDate: { $gte: start, $lte: end },
            ...caseFilter
        };

        const events = await Event.find(eventQuery)
            .populate('createdBy', 'username image email')
            .populate('attendees', 'username image email')
            .populate('caseId', 'title caseNumber category')
            .populate('taskId', 'title')
            .sort({ startDate: 1 });

        result.events = events.map(event => ({
            id: event._id,
            type: 'event',
            title: event.title,
            description: event.description,
            startDate: event.startDate,
            endDate: event.endDate,
            allDay: event.allDay,
            eventType: event.type,
            location: event.location,
            status: event.status,
            color: event.color || '#3b82f6',
            caseId: event.caseId?._id,
            caseName: event.caseId?.title,
            caseNumber: event.caseId?.caseNumber,
            createdBy: event.createdBy,
            attendees: event.attendees,
            priority: 'normal'
        }));

        result.summary.eventCount = events.length;
    }

    // Fetch tasks
    if (!type || type === 'task') {
        const taskQuery = {
            $or: [
                { assignedTo: userId },
                { createdBy: userId }
            ],
            dueDate: { $gte: start, $lte: end },
            ...caseFilter
        };

        const tasks = await Task.find(taskQuery)
            .populate('assignedTo', 'username image email')
            .populate('createdBy', 'username image email')
            .populate('caseId', 'title caseNumber category')
            .sort({ dueDate: 1 });

        result.tasks = tasks.map(task => ({
            id: task._id,
            type: 'task',
            title: task.title,
            description: task.description,
            startDate: task.dueDate,
            endDate: task.dueDate,
            allDay: true,
            status: task.status,
            priority: task.priority,
            color: getTaskColor(task.status, task.priority),
            caseId: task.caseId?._id,
            caseName: task.caseId?.title,
            caseNumber: task.caseId?.caseNumber,
            assignedTo: task.assignedTo,
            createdBy: task.createdBy,
            isOverdue: task.status !== 'done' && new Date(task.dueDate) < new Date()
        }));

        result.summary.taskCount = tasks.length;
    }

    // Fetch reminders
    if (!type || type === 'reminder') {
        const reminderQuery = {
            userId,
            reminderDate: { $gte: start, $lte: end }
        };

        if (caseId) {
            reminderQuery.relatedCase = caseId;
        }

        const reminders = await Reminder.find(reminderQuery)
            .populate('relatedCase', 'title caseNumber category')
            .populate('relatedTask', 'title')
            .populate('relatedEvent', 'title')
            .sort({ reminderDate: 1 });

        result.reminders = reminders.map(reminder => ({
            id: reminder._id,
            type: 'reminder',
            title: reminder.title,
            description: reminder.description,
            startDate: reminder.reminderDate,
            endDate: reminder.reminderDate,
            allDay: false,
            reminderTime: reminder.reminderTime,
            status: reminder.status,
            priority: reminder.priority,
            reminderType: reminder.type,
            color: getReminderColor(reminder.priority, reminder.status),
            caseId: reminder.relatedCase?._id,
            caseName: reminder.relatedCase?.title,
            caseNumber: reminder.relatedCase?.caseNumber,
            relatedTask: reminder.relatedTask,
            relatedEvent: reminder.relatedEvent,
            notificationSent: reminder.notificationSent
        }));

        result.summary.reminderCount = reminders.length;
    }

    // Calculate total items
    result.summary.totalItems = result.summary.eventCount + result.summary.taskCount + result.summary.reminderCount;

    // Combine and sort all items chronologically
    const allItems = [...result.events, ...result.tasks, ...result.reminders]
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    res.status(200).json({
        success: true,
        data: {
            ...result,
            combined: allItems
        },
        dateRange: {
            start,
            end
        }
    });
});

/**
 * Get calendar items for a specific date
 * GET /api/calendar/date/:date
 */
const getCalendarByDate = asyncHandler(async (req, res) => {
    const { date } = req.params;
    const userId = req.userID;

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch events
    const events = await Event.find({
        $or: [
            { createdBy: userId },
            { attendees: userId }
        ],
        startDate: { $gte: startOfDay, $lte: endOfDay }
    })
        .populate('createdBy', 'username image')
        .populate('caseId', 'title caseNumber')
        .sort({ startDate: 1 });

    // Fetch tasks
    const tasks = await Task.find({
        $or: [
            { assignedTo: userId },
            { createdBy: userId }
        ],
        dueDate: { $gte: startOfDay, $lte: endOfDay }
    })
        .populate('assignedTo', 'username image')
        .populate('caseId', 'title caseNumber')
        .sort({ dueDate: 1 });

    // Fetch reminders
    const reminders = await Reminder.find({
        userId,
        reminderDate: { $gte: startOfDay, $lte: endOfDay }
    })
        .populate('relatedCase', 'title caseNumber')
        .populate('relatedTask', 'title')
        .populate('relatedEvent', 'title')
        .sort({ reminderDate: 1 });

    res.status(200).json({
        success: true,
        data: {
            date: startOfDay,
            events: events.map(e => ({ ...e.toObject(), type: 'event' })),
            tasks: tasks.map(t => ({ ...t.toObject(), type: 'task' })),
            reminders: reminders.map(r => ({ ...r.toObject(), type: 'reminder' })),
            summary: {
                total: events.length + tasks.length + reminders.length,
                eventCount: events.length,
                taskCount: tasks.length,
                reminderCount: reminders.length
            }
        }
    });
});

/**
 * Get calendar items for a specific month
 * GET /api/calendar/month/:year/:month
 */
const getCalendarByMonth = asyncHandler(async (req, res) => {
    const { year, month } = req.params;
    const userId = req.userID;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Fetch events
    const events = await Event.find({
        $or: [
            { createdBy: userId },
            { attendees: userId }
        ],
        startDate: { $gte: startDate, $lte: endDate }
    })
        .populate('createdBy', 'username image')
        .populate('caseId', 'title caseNumber')
        .sort({ startDate: 1 });

    // Fetch tasks
    const tasks = await Task.find({
        $or: [
            { assignedTo: userId },
            { createdBy: userId }
        ],
        dueDate: { $gte: startDate, $lte: endDate }
    })
        .populate('assignedTo', 'username image')
        .populate('caseId', 'title caseNumber')
        .sort({ dueDate: 1 });

    // Fetch reminders
    const reminders = await Reminder.find({
        userId,
        reminderDate: { $gte: startDate, $lte: endDate }
    })
        .populate('relatedCase', 'title caseNumber')
        .sort({ reminderDate: 1 });

    // Group by date
    const groupedByDate = {};

    [...events, ...tasks, ...reminders].forEach(item => {
        let itemDate;
        if (item.startDate) itemDate = item.startDate;
        else if (item.dueDate) itemDate = item.dueDate;
        else if (item.reminderDate) itemDate = item.reminderDate;

        const dateKey = itemDate.toISOString().split('T')[0];

        if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = {
                date: dateKey,
                events: [],
                tasks: [],
                reminders: [],
                count: 0
            };
        }

        if (item.constructor.modelName === 'Event') {
            groupedByDate[dateKey].events.push(item);
        } else if (item.constructor.modelName === 'Task') {
            groupedByDate[dateKey].tasks.push(item);
        } else if (item.constructor.modelName === 'Reminder') {
            groupedByDate[dateKey].reminders.push(item);
        }

        groupedByDate[dateKey].count++;
    });

    res.status(200).json({
        success: true,
        data: {
            month: { year: parseInt(year), month: parseInt(month) },
            groupedByDate,
            summary: {
                totalDays: Object.keys(groupedByDate).length,
                totalItems: events.length + tasks.length + reminders.length,
                eventCount: events.length,
                taskCount: tasks.length,
                reminderCount: reminders.length
            }
        }
    });
});

/**
 * Get upcoming calendar items (next 7 days)
 * GET /api/calendar/upcoming
 */
const getUpcomingItems = asyncHandler(async (req, res) => {
    const { days = 7 } = req.query;
    const userId = req.userID;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date();
    futureDate.setDate(today.getDate() + parseInt(days));
    futureDate.setHours(23, 59, 59, 999);

    // Fetch upcoming events
    const events = await Event.find({
        $or: [
            { createdBy: userId },
            { attendees: userId }
        ],
        startDate: { $gte: today, $lte: futureDate },
        status: { $ne: 'cancelled' }
    })
        .populate('createdBy', 'username image')
        .populate('caseId', 'title caseNumber')
        .sort({ startDate: 1 })
        .limit(20);

    // Fetch upcoming tasks
    const tasks = await Task.find({
        $or: [
            { assignedTo: userId },
            { createdBy: userId }
        ],
        dueDate: { $gte: today, $lte: futureDate },
        status: { $ne: 'done' }
    })
        .populate('assignedTo', 'username image')
        .populate('caseId', 'title caseNumber')
        .sort({ dueDate: 1 })
        .limit(20);

    // Fetch upcoming reminders
    const reminders = await Reminder.find({
        userId,
        reminderDate: { $gte: today, $lte: futureDate },
        status: 'pending'
    })
        .populate('relatedCase', 'title caseNumber')
        .populate('relatedTask', 'title')
        .populate('relatedEvent', 'title')
        .sort({ reminderDate: 1 })
        .limit(20);

    // Combine and sort
    const allItems = [
        ...events.map(e => ({ ...e.toObject(), type: 'event', date: e.startDate })),
        ...tasks.map(t => ({ ...t.toObject(), type: 'task', date: t.dueDate })),
        ...reminders.map(r => ({ ...r.toObject(), type: 'reminder', date: r.reminderDate }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    res.status(200).json({
        success: true,
        data: {
            upcoming: allItems,
            summary: {
                total: allItems.length,
                eventCount: events.length,
                taskCount: tasks.length,
                reminderCount: reminders.length
            },
            dateRange: {
                start: today,
                end: futureDate
            }
        }
    });
});

/**
 * Get overdue items
 * GET /api/calendar/overdue
 */
const getOverdueItems = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const now = new Date();

    // Overdue tasks
    const tasks = await Task.find({
        $or: [
            { assignedTo: userId },
            { createdBy: userId }
        ],
        dueDate: { $lt: now },
        status: { $ne: 'done' }
    })
        .populate('assignedTo', 'username image')
        .populate('caseId', 'title caseNumber')
        .sort({ dueDate: 1 });

    // Overdue reminders
    const reminders = await Reminder.find({
        userId,
        reminderDate: { $lt: now },
        status: 'pending'
    })
        .populate('relatedCase', 'title caseNumber')
        .populate('relatedTask', 'title')
        .populate('relatedEvent', 'title')
        .sort({ reminderDate: -1 });

    // Past events (for reference)
    const pastEvents = await Event.find({
        $or: [
            { createdBy: userId },
            { attendees: userId }
        ],
        startDate: { $lt: now },
        status: { $in: ['scheduled', 'confirmed'] }
    })
        .populate('createdBy', 'username image')
        .populate('caseId', 'title caseNumber')
        .sort({ startDate: -1 })
        .limit(10);

    res.status(200).json({
        success: true,
        data: {
            tasks,
            reminders,
            pastEvents,
            summary: {
                overdueTaskCount: tasks.length,
                overdueReminderCount: reminders.length,
                pastEventCount: pastEvents.length,
                total: tasks.length + reminders.length + pastEvents.length
            }
        }
    });
});

/**
 * Get calendar statistics
 * GET /api/calendar/stats
 */
const getCalendarStats = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const userId = req.userID;

    // Default to current month
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

    // Event stats
    const eventStats = await Event.aggregate([
        {
            $match: {
                $or: [
                    { createdBy: userId },
                    { attendees: userId }
                ],
                startDate: { $gte: start, $lte: end }
            }
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    // Task stats
    const taskStats = await Task.aggregate([
        {
            $match: {
                $or: [
                    { assignedTo: userId },
                    { createdBy: userId }
                ],
                dueDate: { $gte: start, $lte: end }
            }
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    // Reminder stats
    const reminderStats = await Reminder.aggregate([
        {
            $match: {
                userId,
                reminderDate: { $gte: start, $lte: end }
            }
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    // Count overdue tasks
    const overdueTasks = await Task.countDocuments({
        $or: [
            { assignedTo: userId },
            { createdBy: userId }
        ],
        dueDate: { $lt: new Date() },
        status: { $ne: 'done' }
    });

    res.status(200).json({
        success: true,
        data: {
            events: eventStats,
            tasks: taskStats,
            reminders: reminderStats,
            overdueTasks,
            dateRange: {
                start,
                end
            }
        }
    });
});

// Helper function to get task color based on status and priority
function getTaskColor(status, priority) {
    if (status === 'done') return '#10b981'; // green
    if (status === 'canceled') return '#6b7280'; // gray

    switch (priority) {
        case 'urgent':
            return '#ef4444'; // red
        case 'high':
            return '#f59e0b'; // amber
        case 'medium':
            return '#3b82f6'; // blue
        case 'low':
            return '#8b5cf6'; // purple
        default:
            return '#6b7280'; // gray
    }
}

// Helper function to get reminder color based on priority and status
function getReminderColor(priority, status) {
    if (status === 'completed') return '#10b981'; // green
    if (status === 'dismissed') return '#6b7280'; // gray

    switch (priority) {
        case 'urgent':
            return '#dc2626'; // dark red
        case 'high':
            return '#ea580c'; // orange
        case 'medium':
            return '#0284c7'; // sky blue
        case 'low':
            return '#7c3aed'; // violet
        default:
            return '#64748b'; // slate
    }
}

module.exports = {
    getCalendarView,
    getCalendarByDate,
    getCalendarByMonth,
    getUpcomingItems,
    getOverdueItems,
    getCalendarStats
};
