const mongoose = require('mongoose');
const { Event, Task, Reminder, Case } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const cache = require('../services/cache.service');
const { pickAllowedFields, sanitizeObjectId, sanitizeString } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// Helper to convert userId to ObjectId for aggregation pipelines
const toObjectId = (id) => {
    if (id instanceof mongoose.Types.ObjectId) return id;
    // Use sanitizeObjectId for security
    const sanitized = sanitizeObjectId(id);
    if (!sanitized) {
        throw CustomException('Invalid ObjectId format', 400);
    }
    try {
        return new mongoose.Types.ObjectId(sanitized);
    } catch {
        throw CustomException('Invalid ObjectId format', 400);
    }
};

// ============================================
// DATE VALIDATION HELPERS
// ============================================

/**
 * Validate and sanitize date input
 * Prevents invalid dates and date manipulation attacks
 * @param {string|Date} dateInput - Date to validate
 * @param {string} fieldName - Field name for error messages
 * @returns {Date} - Valid Date object
 */
const validateDate = (dateInput, fieldName = 'date') => {
    if (!dateInput) {
        throw CustomException(`${fieldName} is required`, 400);
    }

    const date = new Date(dateInput);

    // Check if date is valid
    if (isNaN(date.getTime())) {
        throw CustomException(`Invalid ${fieldName} format`, 400);
    }

    // Reasonable date range validation (1900 - 2100)
    const minDate = new Date('1900-01-01');
    const maxDate = new Date('2100-12-31');

    if (date < minDate || date > maxDate) {
        throw CustomException(`${fieldName} must be between 1900 and 2100`, 400);
    }

    return date;
};

/**
 * Validate date range
 * Ensures start date is before end date and range is reasonable
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {number} maxRangeDays - Maximum allowed range in days (default 365)
 */
const validateDateRange = (startDate, endDate, maxRangeDays = 365) => {
    if (startDate > endDate) {
        throw CustomException('Start date must be before end date', 400);
    }

    const rangeDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (rangeDays > maxRangeDays) {
        throw CustomException(`Date range cannot exceed ${maxRangeDays} days`, 400);
    }
};

/**
 * Validate attendees array
 * Ensures proper structure and valid user IDs
 * @param {Array} attendees - Array of attendee objects
 * @returns {Array} - Validated attendees
 */
const validateAttendees = (attendees) => {
    if (!Array.isArray(attendees)) {
        throw CustomException('Attendees must be an array', 400);
    }

    if (attendees.length > 100) {
        throw CustomException('Cannot have more than 100 attendees', 400);
    }

    return attendees.map((attendee, index) => {
        if (!attendee || typeof attendee !== 'object') {
            throw CustomException(`Attendee at index ${index} must be an object`, 400);
        }

        // Validate userId
        const userId = sanitizeObjectId(attendee.userId);
        if (!userId) {
            throw CustomException(`Invalid userId for attendee at index ${index}`, 400);
        }

        // Only allow specific fields for attendees
        const allowedFields = ['userId', 'status', 'response', 'role'];
        return pickAllowedFields({ ...attendee, userId }, allowedFields);
    });
};

// Valid filter types as Set for O(1) lookup
const VALID_CALENDAR_TYPES = new Set(['event', 'task', 'reminder', 'case-document']);
const VALID_PRIORITIES = new Set(['low', 'medium', 'high', 'critical', 'urgent']);
const VALID_STATUSES = new Set(['pending', 'in_progress', 'done', 'cancelled', 'completed', 'scheduled', 'confirmed']);

// Cache TTL constants (in seconds)
const CACHE_TTL = {
    GRID_SUMMARY: 60,      // 1 minute - counts change frequently
    GRID_ITEMS: 120,       // 2 minutes - items list
    ITEM_DETAILS: 300,     // 5 minutes - individual item details
    LIST_VIEW: 60,         // 1 minute - paginated list
    STATS: 180             // 3 minutes - statistics
};

// Cache key generators
const cacheKeys = {
    gridSummary: (userId, start, end, types) =>
        `calendar:summary:${userId}:${start}:${end}:${types || 'all'}`,
    gridItems: (userId, start, end, types, caseId) =>
        `calendar:items:${userId}:${start}:${end}:${types || 'all'}:${caseId || 'none'}`,
    itemDetails: (type, id) =>
        `calendar:item:${type}:${id}`,
    listView: (userId, cursor, types, start, end, priority, status) =>
        `calendar:list:${userId}:${cursor || 'start'}:${types || 'all'}:${start}:${end}:${priority || 'any'}:${status || 'any'}`,
    userPattern: (userId) =>
        `calendar:*:${userId}:*`
};

/**
 * Invalidate all calendar cache for a user
 * Call this when events/tasks/reminders are created/updated/deleted
 */
const invalidateUserCalendarCache = async (userId) => {
    try {
        await cache.delPattern(`calendar:*:${userId}:*`);
    } catch (error) {
        logger.error('Error invalidating calendar cache:', error.message);
    }
};

/**
 * Invalidate specific item cache
 */
const invalidateItemCache = async (type, id) => {
    try {
        await cache.del(cacheKeys.itemDetails(type, id));
    } catch (error) {
        logger.error('Error invalidating item cache:', error.message);
    }
};

/**
 * Get unified calendar view (events + tasks + reminders)
 * GET /api/calendar
 * Query params: startDate, endDate, type (event|task|reminder), caseId
 */
const getCalendarView = asyncHandler(async (req, res) => {
    const { startDate, endDate, type, caseId } = req.query;
    const userId = req.userID;

    // Date validation with security checks
    let start, end;
    if (startDate && endDate) {
        start = validateDate(startDate, 'startDate');
        end = validateDate(endDate, 'endDate');
        validateDateRange(start, end, 365); // Max 1 year range
    } else {
        // Default to current month if no dates provided
        start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);
    }

    // Validate type parameter if provided
    if (type && !VALID_CALENDAR_TYPES.has(type)) {
        throw CustomException('Invalid calendar type. Must be: event, task, reminder, or case-document', 400);
    }

    // Sanitize caseId if provided (IDOR protection)
    const sanitizedCaseId = caseId ? sanitizeObjectId(caseId) : null;
    if (caseId && !sanitizedCaseId) {
        throw CustomException('Invalid caseId format', 400);
    }

    const result = {
        events: [],
        tasks: [],
        reminders: [],
        caseDocuments: [],
        summary: {
            totalItems: 0,
            eventCount: 0,
            taskCount: 0,
            reminderCount: 0,
            caseDocumentCount: 0
        }
    };

    // Build base query for case filtering with sanitized ID
    const caseFilter = sanitizedCaseId ? { caseId: sanitizedCaseId } : {};

    // Fetch events (with firm/lawyer isolation)
    if (!type || type === 'event') {
        const eventQuery = {
            ...req.firmQuery, // Tenant isolation
            $or: [
                { createdBy: userId },
                { 'attendees.userId': userId }
            ],
            startDateTime: { $gte: start, $lte: end },
            ...caseFilter
        };

        const events = await Event.find(eventQuery)
            .populate('createdBy', 'username image email')
            .populate('attendees', 'username image email')
            .populate('caseId', 'title caseNumber category')
            .populate('taskId', 'title')
            .sort({ startDate: 1 })
            .lean();

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

    // Fetch tasks (with firm/lawyer isolation)
    if (!type || type === 'task') {
        const taskQuery = {
            ...req.firmQuery, // Tenant isolation
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
            .sort({ dueDate: 1 })
            .lean();

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

    // Fetch reminders - use req.firmQuery for proper tenant isolation
    if (!type || type === 'reminder') {
        const reminderQuery = {
            ...req.firmQuery,
            reminderDateTime: { $gte: start, $lte: end }
        };

        if (caseId) {
            reminderQuery.relatedCase = caseId;
        }

        const reminders = await Reminder.find(reminderQuery)
            .populate('relatedCase', 'title caseNumber category')
            .populate('relatedTask', 'title')
            .populate('relatedEvent', 'title')
            .sort({ reminderDate: 1 })
            .lean();

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

    // Fetch case rich documents with calendar dates
    if (!type || type === 'case-document') {
        const caseQuery = {
            lawyerId: userId,
            'richDocuments.showOnCalendar': true
        };

        if (caseId) {
            caseQuery._id = caseId;
        }

        const cases = await Case.find(caseQuery)
            .populate('richDocuments.createdBy', 'firstName lastName')
            .select('_id title caseNumber richDocuments')
            .lean();

        // Extract rich documents that match the date range
        const caseDocuments = [];
        cases.forEach(caseDoc => {
            if (caseDoc.richDocuments) {
                caseDoc.richDocuments.forEach(doc => {
                    if (doc.showOnCalendar && doc.calendarDate) {
                        const docDate = new Date(doc.calendarDate);
                        if (docDate >= start && docDate <= end) {
                            caseDocuments.push({
                                id: doc._id,
                                type: 'case-document',
                                title: doc.title,
                                titleAr: doc.titleAr,
                                description: doc.contentPlainText?.substring(0, 200),
                                startDate: doc.calendarDate,
                                endDate: doc.calendarDate,
                                allDay: true,
                                documentType: doc.documentType,
                                status: doc.status,
                                color: doc.calendarColor || '#3b82f6',
                                caseId: caseDoc._id,
                                caseName: caseDoc.title,
                                caseNumber: caseDoc.caseNumber,
                                createdBy: doc.createdBy,
                                version: doc.version,
                                priority: 'normal'
                            });
                        }
                    }
                });
            }
        });

        result.caseDocuments = caseDocuments.sort((a, b) =>
            new Date(a.startDate) - new Date(b.startDate)
        );
        result.summary.caseDocumentCount = caseDocuments.length;
    }

    // Calculate total items
    result.summary.totalItems = result.summary.eventCount + result.summary.taskCount + result.summary.reminderCount + result.summary.caseDocumentCount;

    // Combine and sort all items chronologically
    const allItems = [...result.events, ...result.tasks, ...result.reminders, ...result.caseDocuments]
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

    // Validate date parameter with security checks
    const validatedDate = validateDate(date, 'date');

    const startOfDay = new Date(validatedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(validatedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch events - use req.firmQuery for proper tenant isolation
    const events = await Event.find({
        ...req.firmQuery,
        startDateTime: { $gte: startOfDay, $lte: endOfDay }
    })
        .populate('createdBy', 'username image')
        .populate('caseId', 'title caseNumber')
        .sort({ startDateTime: 1 })
        .lean();

    // Fetch tasks - use req.firmQuery for proper tenant isolation
    const tasks = await Task.find({
        ...req.firmQuery,
        dueDate: { $gte: startOfDay, $lte: endOfDay }
    })
        .populate('assignedTo', 'username image')
        .populate('caseId', 'title caseNumber')
        .sort({ dueDate: 1 })
        .lean();

    // Fetch reminders - use req.firmQuery for proper tenant isolation
    const reminders = await Reminder.find({
        ...req.firmQuery,
        reminderDateTime: { $gte: startOfDay, $lte: endOfDay }
    })
        .populate('relatedCase', 'title caseNumber')
        .populate('relatedTask', 'title')
        .populate('relatedEvent', 'title')
        .sort({ reminderDateTime: 1 })
        .lean();

    // Fetch case rich documents
    // SECURITY: Include firmId check to prevent cross-firm data access
    const firmId = req.firmId || req.user?.firmId;
    const caseFilter = {
        lawyerId: userId,
        'richDocuments.showOnCalendar': true
    };
    // Add firm scope if user has firmId
    if (firmId) {
        caseFilter.firmId = firmId;
    }
    const cases = await Case.find(caseFilter).select('_id title caseNumber richDocuments').lean();

    const caseDocuments = [];
    cases.forEach(caseDoc => {
        if (caseDoc.richDocuments) {
            caseDoc.richDocuments.forEach(doc => {
                if (doc.showOnCalendar && doc.calendarDate) {
                    const docDate = new Date(doc.calendarDate);
                    if (docDate >= startOfDay && docDate <= endOfDay) {
                        caseDocuments.push({
                            ...doc.toObject(),
                            type: 'case-document',
                            caseId: caseDoc._id,
                            caseName: caseDoc.title,
                            caseNumber: caseDoc.caseNumber
                        });
                    }
                }
            });
        }
    });

    res.status(200).json({
        success: true,
        data: {
            date: startOfDay,
            events: events.map(e => ({ ...e.toObject(), type: 'event' })),
            tasks: tasks.map(t => ({ ...t.toObject(), type: 'task' })),
            reminders: reminders.map(r => ({ ...r.toObject(), type: 'reminder' })),
            caseDocuments,
            summary: {
                total: events.length + tasks.length + reminders.length + caseDocuments.length,
                eventCount: events.length,
                taskCount: tasks.length,
                reminderCount: reminders.length,
                caseDocumentCount: caseDocuments.length
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

    // Validate year and month parameters
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
        throw CustomException('Invalid year. Must be between 1900 and 2100', 400);
    }

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        throw CustomException('Invalid month. Must be between 1 and 12', 400);
    }

    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);

    // Fetch events - use req.firmQuery for proper tenant isolation
    const events = await Event.find({
        ...req.firmQuery,
        startDateTime: { $gte: startDate, $lte: endDate }
    })
        .populate('createdBy', 'username image')
        .populate('caseId', 'title caseNumber')
        .sort({ startDateTime: 1 })
        .lean();

    // Fetch tasks - use req.firmQuery for proper tenant isolation
    const tasks = await Task.find({
        ...req.firmQuery,
        dueDate: { $gte: startDate, $lte: endDate }
    })
        .populate('assignedTo', 'username image')
        .populate('caseId', 'title caseNumber')
        .sort({ dueDate: 1 })
        .lean();

    // Fetch reminders - use req.firmQuery for proper tenant isolation
    const reminders = await Reminder.find({
        ...req.firmQuery,
        reminderDateTime: { $gte: startDate, $lte: endDate }
    })
        .populate('relatedCase', 'title caseNumber')
        .sort({ reminderDateTime: 1 })
        .lean();

    // Fetch case rich documents
    // SECURITY: Include firmId check to prevent cross-firm data access
    const firmId = req.firmId || req.user?.firmId;
    const caseFilter = {
        lawyerId: userId,
        'richDocuments.showOnCalendar': true
    };
    if (firmId) {
        caseFilter.firmId = firmId;
    }
    const casesWithDocs = await Case.find(caseFilter).select('_id title caseNumber richDocuments').lean();

    const caseDocuments = [];
    casesWithDocs.forEach(caseDoc => {
        if (caseDoc.richDocuments) {
            caseDoc.richDocuments.forEach(doc => {
                if (doc.showOnCalendar && doc.calendarDate) {
                    const docDate = new Date(doc.calendarDate);
                    if (docDate >= startDate && docDate <= endDate) {
                        caseDocuments.push({
                            ...doc.toObject(),
                            _caseId: caseDoc._id,
                            _caseName: caseDoc.title,
                            _caseNumber: caseDoc.caseNumber,
                            _type: 'CaseDocument'
                        });
                    }
                }
            });
        }
    });

    // Group by date
    const groupedByDate = {};

    [...events, ...tasks, ...reminders, ...caseDocuments].forEach(item => {
        let itemDate;
        if (item.startDate) itemDate = item.startDate;
        else if (item.dueDate) itemDate = item.dueDate;
        else if (item.reminderDate) itemDate = item.reminderDate;
        else if (item.calendarDate) itemDate = item.calendarDate;

        if (!itemDate) return;

        const dateKey = itemDate.toISOString().split('T')[0];

        if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = {
                date: dateKey,
                events: [],
                tasks: [],
                reminders: [],
                caseDocuments: [],
                count: 0
            };
        }

        if (item.constructor?.modelName === 'Event') {
            groupedByDate[dateKey].events.push(item);
        } else if (item.constructor?.modelName === 'Task') {
            groupedByDate[dateKey].tasks.push(item);
        } else if (item.constructor?.modelName === 'Reminder') {
            groupedByDate[dateKey].reminders.push(item);
        } else if (item._type === 'CaseDocument') {
            groupedByDate[dateKey].caseDocuments.push(item);
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
                totalItems: events.length + tasks.length + reminders.length + caseDocuments.length,
                eventCount: events.length,
                taskCount: tasks.length,
                reminderCount: reminders.length,
                caseDocumentCount: caseDocuments.length
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

    // Validate days parameter
    const daysNum = parseInt(days, 10);
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
        throw CustomException('Days parameter must be between 1 and 365', 400);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysNum);
    futureDate.setHours(23, 59, 59, 999);

    // Fetch upcoming events
    // Fetch upcoming events - use req.firmQuery for proper tenant isolation
    const events = await Event.find({
        ...req.firmQuery,
        startDateTime: { $gte: today, $lte: futureDate },
        status: { $ne: 'cancelled' }
    })
        .populate('createdBy', 'username image')
        .populate('caseId', 'title caseNumber')
        .sort({ startDateTime: 1 })
        .limit(20)
        .lean();

    // Fetch upcoming tasks - use req.firmQuery for proper tenant isolation
    const tasks = await Task.find({
        ...req.firmQuery,
        dueDate: { $gte: today, $lte: futureDate },
        status: { $ne: 'done' }
    })
        .populate('assignedTo', 'username image')
        .populate('caseId', 'title caseNumber')
        .sort({ dueDate: 1 })
        .limit(20)
        .lean();

    // Fetch upcoming reminders - use req.firmQuery for proper tenant isolation
    const reminders = await Reminder.find({
        ...req.firmQuery,
        reminderDateTime: { $gte: today, $lte: futureDate },
        status: 'pending'
    })
        .populate('relatedCase', 'title caseNumber')
        .populate('relatedTask', 'title')
        .populate('relatedEvent', 'title')
        .sort({ reminderDateTime: 1 })
        .limit(20)
        .lean();

    // Fetch upcoming case rich documents
    // SECURITY: Include firmId check to prevent cross-firm data access
    const firmId = req.firmId || req.user?.firmId;
    const caseFilter = {
        lawyerId: userId,
        'richDocuments.showOnCalendar': true
    };
    if (firmId) {
        caseFilter.firmId = firmId;
    }
    const casesWithUpcomingDocs = await Case.find(caseFilter).select('_id title caseNumber richDocuments').lean();

    const caseDocuments = [];
    casesWithUpcomingDocs.forEach(caseDoc => {
        if (caseDoc.richDocuments) {
            caseDoc.richDocuments.forEach(doc => {
                if (doc.showOnCalendar && doc.calendarDate) {
                    const docDate = new Date(doc.calendarDate);
                    if (docDate >= today && docDate <= futureDate) {
                        caseDocuments.push({
                            ...doc.toObject(),
                            type: 'case-document',
                            date: doc.calendarDate,
                            caseId: caseDoc._id,
                            caseName: caseDoc.title,
                            caseNumber: caseDoc.caseNumber
                        });
                    }
                }
            });
        }
    });

    // Combine and sort
    const allItems = [
        ...events.map(e => ({ ...e.toObject(), type: 'event', date: e.startDateTime })),
        ...tasks.map(t => ({ ...t.toObject(), type: 'task', date: t.dueDate })),
        ...reminders.map(r => ({ ...r.toObject(), type: 'reminder', date: r.reminderDateTime })),
        ...caseDocuments
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    res.status(200).json({
        success: true,
        data: {
            upcoming: allItems,
            summary: {
                total: allItems.length,
                eventCount: events.length,
                taskCount: tasks.length,
                reminderCount: reminders.length,
                caseDocumentCount: caseDocuments.length
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

    // Overdue tasks - use req.firmQuery for proper tenant isolation
    const tasks = await Task.find({
        ...req.firmQuery,
        dueDate: { $lt: now },
        status: { $ne: 'done' }
    })
        .populate('assignedTo', 'username image')
        .populate('caseId', 'title caseNumber')
        .sort({ dueDate: 1 })
        .lean();

    // Overdue reminders - use req.firmQuery for proper tenant isolation
    const reminders = await Reminder.find({
        ...req.firmQuery,
        reminderDateTime: { $lt: now },
        status: 'pending'
    })
        .populate('relatedCase', 'title caseNumber')
        .populate('relatedTask', 'title')
        .populate('relatedEvent', 'title')
        .sort({ reminderDateTime: -1 })
        .lean();

    // Past events (for reference) - use req.firmQuery for proper tenant isolation
    const pastEvents = await Event.find({
        ...req.firmQuery,
        startDateTime: { $lt: now },
        status: { $in: ['scheduled', 'confirmed'] }
    })
        .populate('createdBy', 'username image')
        .populate('caseId', 'title caseNumber')
        .sort({ startDateTime: -1 })
        .limit(10)
        .lean();

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

    // Date validation with security checks
    let start, end;
    if (startDate && endDate) {
        start = validateDate(startDate, 'startDate');
        end = validateDate(endDate, 'endDate');
        validateDateRange(start, end, 730); // Max 2 years for stats
    } else {
        // Default to current month
        start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);
    }
    const now = new Date();

    // Get total counts - use req.firmQuery for proper tenant isolation
    const totalEvents = await Event.countDocuments({
        ...req.firmQuery,
        startDateTime: { $gte: start, $lte: end }
    });

    const totalTasks = await Task.countDocuments({
        ...req.firmQuery,
        dueDate: { $gte: start, $lte: end }
    });

    const totalReminders = await Reminder.countDocuments({
        ...req.firmQuery,
        reminderDateTime: { $gte: start, $lte: end }
    });

    // Upcoming hearings (next 30 days) - use req.firmQuery for proper tenant isolation
    const upcomingHearings = await Event.countDocuments({
        ...req.firmQuery,
        type: 'hearing',
        startDateTime: { $gte: now, $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
        status: { $nin: ['cancelled', 'completed'] }
    });

    // Overdue items (tasks + reminders) - use req.firmQuery for proper tenant isolation
    const overdueTasks = await Task.countDocuments({
        ...req.firmQuery,
        dueDate: { $lt: now },
        status: { $nin: ['done', 'canceled'] }
    });

    const overdueReminders = await Reminder.countDocuments({
        ...req.firmQuery,
        reminderDateTime: { $lt: now },
        status: 'pending'
    });

    const overdueItems = overdueTasks + overdueReminders;

    // Completed this month - use req.firmQuery for proper tenant isolation
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const completedTasksThisMonth = await Task.countDocuments({
        ...req.firmQuery,
        completedAt: { $gte: monthStart, $lte: monthEnd },
        status: 'done'
    });

    const completedEventsThisMonth = await Event.countDocuments({
        ...req.firmQuery,
        completedAt: { $gte: monthStart, $lte: monthEnd },
        status: 'completed'
    });

    const completedThisMonth = completedTasksThisMonth + completedEventsThisMonth;

    // Convert firmQuery to ObjectIds for aggregate queries
    const eventMatch = { ...req.firmQuery, startDateTime: { $gte: start, $lte: end } };
    if (eventMatch.firmId) {
        eventMatch.firmId = new mongoose.Types.ObjectId(eventMatch.firmId);
    }
    if (eventMatch.lawyerId) {
        eventMatch.lawyerId = new mongoose.Types.ObjectId(eventMatch.lawyerId);
    }

    const eventsByType = await Event.aggregate([
        { $match: eventMatch },
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 }
            }
        }
    ]);

    const byType = {};
    eventsByType.forEach(item => {
        byType[item._id || 'other'] = item.count;
    });

    // Tasks by priority - use req.firmQuery for proper tenant isolation
    const taskMatch = { ...req.firmQuery, dueDate: { $gte: start, $lte: end }, status: { $nin: ['done', 'canceled'] } };
    if (taskMatch.firmId) {
        taskMatch.firmId = new mongoose.Types.ObjectId(taskMatch.firmId);
    }
    if (taskMatch.lawyerId) {
        taskMatch.lawyerId = new mongoose.Types.ObjectId(taskMatch.lawyerId);
    }

    const tasksByPriority = await Task.aggregate([
        { $match: taskMatch },
        {
            $group: {
                _id: '$priority',
                count: { $sum: 1 }
            }
        }
    ]);

    const byPriority = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
    };
    tasksByPriority.forEach(item => {
        if (byPriority.hasOwnProperty(item._id)) {
            byPriority[item._id] = item.count;
        }
    });

    res.status(200).json({
        success: true,
        data: {
            totalEvents,
            totalTasks,
            totalReminders,
            upcomingHearings,
            overdueItems,
            completedThisMonth,
            byType,
            byPriority
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

/**
 * Get calendar grid summary (counts only - optimized for calendar cells)
 * GET /api/calendar/grid-summary
 * Returns only counts per day, no full event objects
 * Query params: startDate, endDate, types (comma-separated)
 */
const getCalendarGridSummary = asyncHandler(async (req, res) => {
    const { startDate, endDate, types } = req.query;
    const userId = req.userID;

    // Date validation with security checks
    let start, end;
    if (startDate && endDate) {
        start = validateDate(startDate, 'startDate');
        end = validateDate(endDate, 'endDate');
        validateDateRange(start, end, 365); // Max 1 year range
    } else {
        // Default to current month if no dates provided
        start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);
    }

    // Validate types parameter if provided
    if (types) {
        const typeArray = types.split(',');
        const invalidTypes = typeArray.filter(t => !VALID_CALENDAR_TYPES.has(t.trim()));
        if (invalidTypes.length > 0) {
            throw CustomException(`Invalid calendar types: ${invalidTypes.join(', ')}`, 400);
        }
    }

    // Generate cache key
    const cacheKey = cacheKeys.gridSummary(userId, start.toISOString().split('T')[0], end.toISOString().split('T')[0], types);

    // Try to get from cache first
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
        return res.status(200).json({
            success: true,
            data: cachedData,
            cached: true
        });
    }

    // Parse and validate types using Set for O(1) lookup
    const requestedTypes = types
        ? new Set(types.split(',').filter(t => VALID_CALENDAR_TYPES.has(t.trim())))
        : VALID_CALENDAR_TYPES;

    const daySummary = {};

    // Initialize all days in range
    const currentDate = new Date(start);
    while (currentDate <= end) {
        const dateKey = currentDate.toISOString().split('T')[0];
        daySummary[dateKey] = {
            date: dateKey,
            total: 0,
            events: 0,
            tasks: 0,
            reminders: 0,
            caseDocuments: 0,
            hasHighPriority: false,
            hasOverdue: false
        };
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // Use aggregation pipeline for efficient counting
    const promises = [];
    const userObjectId = toObjectId(userId);

    // Count events by day
    if (requestedTypes.has('event')) {
        promises.push(
            Event.aggregate([
                {
                    $match: {
                        $or: [
                            { createdBy: userObjectId },
                            { 'attendees.userId': userObjectId }
                        ],
                        startDateTime: { $gte: start, $lte: end }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$startDateTime' } },
                        count: { $sum: 1 },
                        hasHighPriority: { $max: { $in: ['$priority', ['high', 'critical', 'urgent']] } }
                    }
                }
            ]).then(results => {
                results.forEach(r => {
                    if (daySummary[r._id]) {
                        daySummary[r._id].events = r.count;
                        daySummary[r._id].total += r.count;
                        if (r.hasHighPriority) daySummary[r._id].hasHighPriority = true;
                    }
                });
            })
        );
    }

    // Count tasks by day
    if (requestedTypes.has('task')) {
        const now = new Date();
        promises.push(
            Task.aggregate([
                {
                    $match: {
                        $or: [
                            { assignedTo: userObjectId },
                            { createdBy: userObjectId }
                        ],
                        dueDate: { $gte: start, $lte: end }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$dueDate' } },
                        count: { $sum: 1 },
                        hasHighPriority: { $max: { $in: ['$priority', ['high', 'critical', 'urgent']] } },
                        overdueCount: {
                            $sum: {
                                $cond: [
                                    { $and: [{ $lt: ['$dueDate', now] }, { $ne: ['$status', 'done'] }] },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]).then(results => {
                results.forEach(r => {
                    if (daySummary[r._id]) {
                        daySummary[r._id].tasks = r.count;
                        daySummary[r._id].total += r.count;
                        if (r.hasHighPriority) daySummary[r._id].hasHighPriority = true;
                        if (r.overdueCount > 0) daySummary[r._id].hasOverdue = true;
                    }
                });
            })
        );
    }

    // Count reminders by day
    if (requestedTypes.has('reminder')) {
        promises.push(
            Reminder.aggregate([
                {
                    $match: {
                        userId: userObjectId,
                        reminderDateTime: { $gte: start, $lte: end }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$reminderDateTime' } },
                        count: { $sum: 1 },
                        hasHighPriority: { $max: { $in: ['$priority', ['high', 'critical', 'urgent']] } }
                    }
                }
            ]).then(results => {
                results.forEach(r => {
                    if (daySummary[r._id]) {
                        daySummary[r._id].reminders = r.count;
                        daySummary[r._id].total += r.count;
                        if (r.hasHighPriority) daySummary[r._id].hasHighPriority = true;
                    }
                });
            })
        );
    }

    // Count case documents
    if (requestedTypes.has('case-document')) {
        promises.push(
            Case.aggregate([
                {
                    $match: {
                        lawyerId: userObjectId,
                        'richDocuments.showOnCalendar': true
                    }
                },
                { $unwind: '$richDocuments' },
                {
                    $match: {
                        'richDocuments.showOnCalendar': true,
                        'richDocuments.calendarDate': { $gte: start, $lte: end }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$richDocuments.calendarDate' } },
                        count: { $sum: 1 }
                    }
                }
            ]).then(results => {
                results.forEach(r => {
                    if (daySummary[r._id]) {
                        daySummary[r._id].caseDocuments = r.count;
                        daySummary[r._id].total += r.count;
                    }
                });
            })
        );
    }

    await Promise.all(promises);

    // Filter out empty days for efficiency
    const nonEmptyDays = Object.values(daySummary).filter(day => day.total > 0);

    // Prepare response data
    const responseData = {
        days: nonEmptyDays,
        totalDays: nonEmptyDays.length,
        dateRange: { start, end }
    };

    // Cache the result
    await cache.set(cacheKey, responseData, CACHE_TTL.GRID_SUMMARY);

    res.status(200).json({
        success: true,
        data: responseData
    });
});

/**
 * Get minimal event list for calendar grid (lazy-load optimization)
 * GET /api/calendar/grid-items
 * Returns only id, title, startDate, type, color, priority for grid display
 * Full details fetched on demand via /api/calendar/item/:type/:id
 */
const getCalendarGridItems = asyncHandler(async (req, res) => {
    const { startDate, endDate, types, caseId } = req.query;
    const userId = req.userID;

    if (!startDate || !endDate) {
        throw CustomException('Start date and end date are required', 400);
    }

    // Validate dates with security checks
    const start = validateDate(startDate, 'startDate');
    const end = validateDate(endDate, 'endDate');
    validateDateRange(start, end, 365); // Max 1 year range

    // Validate types parameter if provided
    if (types) {
        const typeArray = types.split(',');
        const invalidTypes = typeArray.filter(t => !VALID_CALENDAR_TYPES.has(t.trim()));
        if (invalidTypes.length > 0) {
            throw CustomException(`Invalid calendar types: ${invalidTypes.join(', ')}`, 400);
        }
    }

    // Sanitize caseId if provided (IDOR protection)
    const sanitizedCaseId = caseId ? sanitizeObjectId(caseId) : null;
    if (caseId && !sanitizedCaseId) {
        throw CustomException('Invalid caseId format', 400);
    }

    // Generate cache key
    const cacheKey = cacheKeys.gridItems(userId, start.toISOString().split('T')[0], end.toISOString().split('T')[0], types, caseId);

    // Try to get from cache first
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
        return res.status(200).json({
            success: true,
            data: cachedData.data,
            count: cachedData.count,
            dateRange: cachedData.dateRange,
            cached: true
        });
    }

    // Parse types using Set for O(1) lookup
    const requestedTypes = types
        ? new Set(types.split(',').filter(t => VALID_CALENDAR_TYPES.has(t.trim())))
        : VALID_CALENDAR_TYPES;

    const caseFilter = sanitizedCaseId ? { caseId: sanitizedCaseId } : {};
    const items = [];

    const promises = [];

    // Fetch minimal event data - use req.firmQuery for proper tenant isolation
    if (requestedTypes.has('event')) {
        promises.push(
            Event.find({
                ...req.firmQuery,
                startDateTime: { $gte: start, $lte: end },
                ...caseFilter
            })
                .select('_id title startDateTime endDateTime allDay type status priority color')
                .lean()
                .then(events => {
                    events.forEach(e => {
                        items.push({
                            id: e._id,
                            type: 'event',
                            title: e.title,
                            startDate: e.startDateTime,
                            endDate: e.endDateTime,
                            allDay: e.allDay,
                            eventType: e.type,
                            status: e.status,
                            priority: e.priority || 'medium',
                            color: e.color || '#3b82f6'
                        });
                    });
                })
        );
    }

    // Fetch minimal task data - use req.firmQuery for proper tenant isolation
    if (requestedTypes.has('task')) {
        promises.push(
            Task.find({
                ...req.firmQuery,
                dueDate: { $gte: start, $lte: end },
                ...caseFilter
            })
                .select('_id title dueDate status priority')
                .lean()
                .then(tasks => {
                    const now = new Date();
                    tasks.forEach(t => {
                        items.push({
                            id: t._id,
                            type: 'task',
                            title: t.title,
                            startDate: t.dueDate,
                            endDate: t.dueDate,
                            allDay: true,
                            status: t.status,
                            priority: t.priority || 'medium',
                            color: getTaskColor(t.status, t.priority),
                            isOverdue: t.status !== 'done' && new Date(t.dueDate) < now
                        });
                    });
                })
        );
    }

    // Fetch minimal reminder data - use req.firmQuery for proper tenant isolation
    if (requestedTypes.has('reminder')) {
        const reminderQuery = {
            ...req.firmQuery,
            reminderDateTime: { $gte: start, $lte: end }
        };
        if (caseId) reminderQuery.relatedCase = caseId;

        promises.push(
            Reminder.find(reminderQuery)
                .select('_id title reminderDateTime reminderTime status priority type')
                .lean()
                .then(reminders => {
                    reminders.forEach(r => {
                        items.push({
                            id: r._id,
                            type: 'reminder',
                            title: r.title,
                            startDate: r.reminderDateTime,
                            endDate: r.reminderDateTime,
                            allDay: false,
                            reminderTime: r.reminderTime,
                            status: r.status,
                            priority: r.priority || 'medium',
                            reminderType: r.type,
                            color: getReminderColor(r.priority, r.status)
                        });
                    });
                })
        );
    }

    // Fetch minimal case document data
    if (requestedTypes.has('case-document')) {
        const caseQuery = {
            lawyerId: userId,
            'richDocuments.showOnCalendar': true
        };
        if (sanitizedCaseId) caseQuery._id = sanitizedCaseId;

        promises.push(
            Case.find(caseQuery)
                .select('_id title caseNumber richDocuments._id richDocuments.title richDocuments.calendarDate richDocuments.calendarColor richDocuments.showOnCalendar richDocuments.documentType')
                .lean()
                .then(cases => {
                    cases.forEach(caseDoc => {
                        if (caseDoc.richDocuments) {
                            caseDoc.richDocuments.forEach(doc => {
                                if (doc.showOnCalendar && doc.calendarDate) {
                                    const docDate = new Date(doc.calendarDate);
                                    if (docDate >= start && docDate <= end) {
                                        items.push({
                                            id: doc._id,
                                            type: 'case-document',
                                            title: doc.title,
                                            startDate: doc.calendarDate,
                                            endDate: doc.calendarDate,
                                            allDay: true,
                                            documentType: doc.documentType,
                                            color: doc.calendarColor || '#3b82f6',
                                            caseId: caseDoc._id,
                                            caseNumber: caseDoc.caseNumber
                                        });
                                    }
                                }
                            });
                        }
                    });
                })
        );
    }

    await Promise.all(promises);

    // Sort by start date
    items.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    // Prepare response data for caching
    const responseData = {
        data: items,
        count: items.length,
        dateRange: { start, end }
    };

    // Cache the result
    await cache.set(cacheKey, responseData, CACHE_TTL.GRID_ITEMS);

    res.status(200).json({
        success: true,
        data: items,
        count: items.length,
        dateRange: { start, end }
    });
});

/**
 * Get full details for a single calendar item (lazy-load on click)
 * GET /api/calendar/item/:type/:id
 * Fetches complete details including relations, attendees, etc.
 */
const getCalendarItemDetails = asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    const userId = req.userID;

    // Validate type using Set for O(1) lookup
    if (!VALID_CALENDAR_TYPES.has(type)) {
        throw CustomException('Invalid item type. Must be: event, task, reminder, or case-document', 400);
    }

    // Sanitize and validate ID (IDOR protection)
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid item ID format', 400);
    }

    // Get firmId for multi-tenant isolation
    const firmId = req.firmId || req.user?.firmId;

    // Generate cache key
    const cacheKey = cacheKeys.itemDetails(type, id);

    // Try to get from cache first (but skip for case-document as access check is complex)
    if (type !== 'case-document') {
        const cachedData = await cache.get(cacheKey);
        if (cachedData) {
            return res.status(200).json({
                success: true,
                data: cachedData,
                type,
                cached: true
            });
        }
    }

    let item = null;

    switch (type) {
        case 'event':
            // SECURITY: Include firmId in query to prevent cross-firm IDOR
            const eventQuery = { _id: sanitizedId };
            if (firmId) {
                eventQuery.firmId = firmId;
            }

            item = await Event.findOne(eventQuery)
                .populate('createdBy', 'username firstName lastName image email')
                .populate('organizer', 'username firstName lastName image email')
                .populate('attendees.userId', 'username firstName lastName image email')
                .populate('caseId', 'title caseNumber category')
                .populate('clientId', 'firstName lastName email phone')
                .populate('taskId', 'title status dueDate')
                .populate('agenda.presenter', 'firstName lastName')
                .populate('actionItems.assignedTo', 'firstName lastName')
                .lean();

            // SECURITY: Return 404 (not 403) to prevent information leakage
            if (!item) {
                throw CustomException('Event not found', 404);
            }

            // Enhanced IDOR protection - verify ownership/access
            const isAttendee = item.attendees?.some(attendee => {
                const attendeeId = attendee.userId?._id || attendee.userId;
                return attendeeId?.toString() === userId;
            });

            const hasEventAccess = item.createdBy?._id?.toString() === userId ||
                item.organizer?._id?.toString() === userId ||
                isAttendee;

            // SECURITY: Return 404 (not 403) to prevent information leakage
            if (!hasEventAccess) {
                throw CustomException('Event not found', 404);
            }
            break;

        case 'task':
            // SECURITY: Include firmId in query to prevent cross-firm IDOR
            const taskQuery = { _id: sanitizedId };
            if (firmId) {
                taskQuery.firmId = firmId;
            }

            item = await Task.findOne(taskQuery)
                .populate('assignedTo', 'username firstName lastName image email')
                .populate('createdBy', 'username firstName lastName image email')
                .populate('caseId', 'title caseNumber category')
                .populate('clientId', 'firstName lastName email phone')
                .populate('linkedEventId', 'title startDateTime')
                .lean();

            // SECURITY: Return 404 (not 403) to prevent information leakage
            if (!item) {
                throw CustomException('Task not found', 404);
            }

            // Enhanced IDOR protection - verify ownership/access
            const hasTaskAccess = item.assignedTo?._id?.toString() === userId ||
                item.createdBy?._id?.toString() === userId;

            // SECURITY: Return 404 (not 403) to prevent information leakage
            if (!hasTaskAccess) {
                throw CustomException('Task not found', 404);
            }
            break;

        case 'reminder':
            // SECURITY: Include firmId in query to prevent cross-firm IDOR
            const reminderQuery = { _id: sanitizedId, userId };
            if (firmId) {
                reminderQuery.firmId = firmId;
            }

            item = await Reminder.findOne(reminderQuery)
                .populate('relatedCase', 'title caseNumber category')
                .populate('relatedTask', 'title status dueDate')
                .populate('relatedEvent', 'title startDateTime')
                .lean();

            // SECURITY: Return 404 (not 403) to prevent information leakage
            // Note: Reminder already includes userId in query, so if not found it's a 404
            if (!item) {
                throw CustomException('Reminder not found', 404);
            }
            break;

        case 'case-document':
            // Enhanced IDOR protection - only return documents from user's cases
            const caseDocQuery = {
                lawyerId: userId,
                'richDocuments._id': sanitizedId
            };
            // Add firmId for multi-tenant isolation
            if (firmId) {
                caseDocQuery.firmId = firmId;
            }

            const caseDoc = await Case.findOne(caseDocQuery)
                .populate('richDocuments.createdBy', 'firstName lastName')
                .select('_id title caseNumber category richDocuments.$')
                .lean();

            // SECURITY: Return 404 (not 403) to prevent information leakage
            if (!caseDoc || !caseDoc.richDocuments || caseDoc.richDocuments.length === 0) {
                throw CustomException('Document not found', 404);
            }

            item = {
                ...caseDoc.richDocuments[0].toObject(),
                caseId: caseDoc._id,
                caseName: caseDoc.title,
                caseNumber: caseDoc.caseNumber,
                caseCategory: caseDoc.category
            };
            break;
    }

    // Cache the result (convert Mongoose doc to plain object for caching)
    const itemToCache = item.toObject ? item.toObject() : item;
    await cache.set(cacheKey, itemToCache, CACHE_TTL.ITEM_DETAILS);

    res.status(200).json({
        success: true,
        data: item,
        type
    });
});

/**
 * Get virtualized list view with cursor-based pagination
 * GET /api/calendar/list
 * Optimized for list view with heavy usage - supports infinite scroll
 * Query params: cursor, limit, types, startDate, endDate, sortBy, sortOrder
 */
const getCalendarListView = asyncHandler(async (req, res) => {
    const {
        cursor,
        limit = 20,
        types,
        startDate,
        endDate,
        sortBy = 'startDate',
        sortOrder = 'asc',
        caseId,
        priority,
        status
    } = req.query;
    const userId = req.userID;

    // Validate limit parameter
    const parsedLimit = Math.min(parseInt(limit) || 20, 100); // Max 100 items per request
    if (parsedLimit < 1) {
        throw CustomException('Limit must be at least 1', 400);
    }

    // Date validation with security checks
    let start, end;
    if (startDate && endDate) {
        start = validateDate(startDate, 'startDate');
        end = validateDate(endDate, 'endDate');
        validateDateRange(start, end, 730); // Max 2 years range for list view
    } else {
        // Default date range if not provided
        start = startDate ? validateDate(startDate, 'startDate') : new Date(new Date().setHours(0, 0, 0, 0));
        end = endDate ? validateDate(endDate, 'endDate') : new Date(new Date().setFullYear(new Date().getFullYear() + 1));
    }

    // Validate sortOrder
    if (sortOrder !== 'asc' && sortOrder !== 'desc') {
        throw CustomException('Sort order must be "asc" or "desc"', 400);
    }

    // Sanitize caseId if provided (IDOR protection)
    const sanitizedCaseId = caseId ? sanitizeObjectId(caseId) : null;
    if (caseId && !sanitizedCaseId) {
        throw CustomException('Invalid caseId format', 400);
    }

    // Parse filters using Sets for O(1) lookup
    const requestedTypes = types
        ? new Set(types.split(',').filter(t => VALID_CALENDAR_TYPES.has(t.trim())))
        : VALID_CALENDAR_TYPES;

    // Validate priority and status filters
    const priorityFilter = priority && VALID_PRIORITIES.has(priority) ? priority : null;
    const statusFilter = status && VALID_STATUSES.has(status) ? status : null;

    // Validate types if provided
    if (types) {
        const typeArray = types.split(',');
        const invalidTypes = typeArray.filter(t => !VALID_CALENDAR_TYPES.has(t.trim()));
        if (invalidTypes.length > 0) {
            throw CustomException(`Invalid calendar types: ${invalidTypes.join(', ')}`, 400);
        }
    }

    // Decode cursor for pagination
    let cursorDate = null;
    let cursorId = null;
    if (cursor) {
        try {
            const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
            cursorDate = new Date(decoded.date);
            cursorId = decoded.id;
        } catch (e) {
            // Invalid cursor, start from beginning
        }
    }

    const items = [];
    const caseFilter = sanitizedCaseId ? { caseId: sanitizedCaseId } : {};

    // Build cursor condition for each type
    const buildCursorCondition = (dateField, cursorDate, cursorId, sortOrder) => {
        if (!cursorDate) return {};
        const op = sortOrder === 'asc' ? '$gt' : '$lt';
        return {
            $or: [
                { [dateField]: { [op]: cursorDate } },
                { [dateField]: cursorDate, _id: { [op]: cursorId } }
            ]
        };
    };

    const promises = [];

    // Fetch events - use req.firmQuery for proper tenant isolation
    if (requestedTypes.has('event')) {
        const eventQuery = {
            ...req.firmQuery,
            startDateTime: { $gte: start, $lte: end },
            ...caseFilter,
            ...(priorityFilter && { priority: priorityFilter }),
            ...(statusFilter && { status: statusFilter }),
            ...buildCursorCondition('startDateTime', cursorDate, cursorId, sortOrder)
        };

        promises.push(
            Event.find(eventQuery)
                .select('_id title startDateTime endDateTime allDay type status priority color caseId')
                .populate('caseId', 'title caseNumber')
                .sort({ startDateTime: sortOrder === 'asc' ? 1 : -1, _id: 1 })
                .limit(parsedLimit + 1)
                .lean()
                .then(events => {
                    events.forEach(e => {
                        items.push({
                            id: e._id,
                            type: 'event',
                            title: e.title,
                            startDate: e.startDateTime,
                            endDate: e.endDateTime,
                            allDay: e.allDay,
                            eventType: e.type,
                            status: e.status,
                            priority: e.priority || 'medium',
                            color: e.color || '#3b82f6',
                            caseId: e.caseId?._id,
                            caseName: e.caseId?.title,
                            caseNumber: e.caseId?.caseNumber,
                            _sortDate: e.startDateTime
                        });
                    });
                })
        );
    }

    // Fetch tasks - use req.firmQuery for proper tenant isolation
    if (requestedTypes.has('task')) {
        const taskQuery = {
            ...req.firmQuery,
            dueDate: { $gte: start, $lte: end },
            ...caseFilter,
            ...(priorityFilter && { priority: priorityFilter }),
            ...(statusFilter && { status: statusFilter }),
            ...buildCursorCondition('dueDate', cursorDate, cursorId, sortOrder)
        };

        promises.push(
            Task.find(taskQuery)
                .select('_id title dueDate status priority caseId')
                .populate('caseId', 'title caseNumber')
                .sort({ dueDate: sortOrder === 'asc' ? 1 : -1, _id: 1 })
                .limit(parsedLimit + 1)
                .lean()
                .then(tasks => {
                    const now = new Date();
                    tasks.forEach(t => {
                        items.push({
                            id: t._id,
                            type: 'task',
                            title: t.title,
                            startDate: t.dueDate,
                            endDate: t.dueDate,
                            allDay: true,
                            status: t.status,
                            priority: t.priority || 'medium',
                            color: getTaskColor(t.status, t.priority),
                            isOverdue: t.status !== 'done' && new Date(t.dueDate) < now,
                            caseId: t.caseId?._id,
                            caseName: t.caseId?.title,
                            caseNumber: t.caseId?.caseNumber,
                            _sortDate: t.dueDate
                        });
                    });
                })
        );
    }

    // Fetch reminders - use req.firmQuery for proper tenant isolation
    if (requestedTypes.has('reminder')) {
        const reminderQuery = {
            ...req.firmQuery,
            reminderDateTime: { $gte: start, $lte: end },
            ...(sanitizedCaseId && { relatedCase: sanitizedCaseId }),
            ...(priorityFilter && { priority: priorityFilter }),
            ...(statusFilter && { status: statusFilter }),
            ...buildCursorCondition('reminderDateTime', cursorDate, cursorId, sortOrder)
        };

        promises.push(
            Reminder.find(reminderQuery)
                .select('_id title reminderDateTime status priority type relatedCase')
                .populate('relatedCase', 'title caseNumber')
                .sort({ reminderDateTime: sortOrder === 'asc' ? 1 : -1, _id: 1 })
                .limit(parsedLimit + 1)
                .lean()
                .then(reminders => {
                    reminders.forEach(r => {
                        items.push({
                            id: r._id,
                            type: 'reminder',
                            title: r.title,
                            startDate: r.reminderDateTime,
                            endDate: r.reminderDateTime,
                            allDay: false,
                            status: r.status,
                            priority: r.priority || 'medium',
                            reminderType: r.type,
                            color: getReminderColor(r.priority, r.status),
                            caseId: r.relatedCase?._id,
                            caseName: r.relatedCase?.title,
                            caseNumber: r.relatedCase?.caseNumber,
                            _sortDate: r.reminderDateTime
                        });
                    });
                })
        );
    }

    await Promise.all(promises);

    // Sort all items by date
    items.sort((a, b) => {
        const dateA = new Date(a._sortDate);
        const dateB = new Date(b._sortDate);
        const diff = sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        if (diff !== 0) return diff;
        return a.id.toString().localeCompare(b.id.toString());
    });

    // Check if there are more items
    const hasMore = items.length > parsedLimit;
    const resultItems = items.slice(0, parsedLimit);

    // Generate next cursor
    let nextCursor = null;
    if (hasMore && resultItems.length > 0) {
        const lastItem = resultItems[resultItems.length - 1];
        nextCursor = Buffer.from(JSON.stringify({
            date: lastItem._sortDate,
            id: lastItem.id
        })).toString('base64');
    }

    // Remove internal _sortDate field from response
    resultItems.forEach(item => delete item._sortDate);

    res.status(200).json({
        success: true,
        data: resultItems,
        pagination: {
            cursor: nextCursor,
            hasMore,
            limit: parsedLimit,
            count: resultItems.length
        },
        filters: {
            types: Array.from(requestedTypes),
            priority: priorityFilter,
            status: statusFilter,
            dateRange: { start, end }
        }
    });
});

/**
 * Validate if a type is valid calendar type
 * Helper function exported for use in other controllers
 */
const isValidCalendarType = (type) => VALID_CALENDAR_TYPES.has(type);

/**
 * Get sidebar data - Combined calendar events and upcoming reminders
 * GET /api/calendar/sidebar-data
 * Query params: startDate, endDate, reminderDays (default: 7)
 *
 * OPTIMIZED: Replaces 2 separate API calls with 1 parallel query
 */
const getSidebarData = asyncHandler(async (req, res) => {
    const { startDate, endDate, reminderDays = 7 } = req.query;
    const userId = req.userID;

    // Validate reminderDays parameter
    const reminderDaysNum = parseInt(reminderDays, 10);
    if (isNaN(reminderDaysNum) || reminderDaysNum < 1 || reminderDaysNum > 365) {
        throw CustomException('Reminder days must be between 1 and 365', 400);
    }

    // Date validation with security checks
    let start, end;
    if (startDate && endDate) {
        start = validateDate(startDate, 'startDate');
        end = validateDate(endDate, 'endDate');
        validateDateRange(start, end, 365);
    } else {
        // Default date range: today + 5 days for events
        const now = new Date();
        start = startDate ? validateDate(startDate, 'startDate') : new Date(now.setHours(0, 0, 0, 0));
        end = endDate ? validateDate(endDate, 'endDate') : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    }

    // Convert userId to ObjectId with validation
    const userObjectId = toObjectId(userId);

    // Reminder date range: next N days
    const reminderEnd = new Date(Date.now() + reminderDaysNum * 24 * 60 * 60 * 1000);

    // Execute both queries in parallel
    const [calendarEvents, upcomingReminders] = await Promise.all([
        // Calendar events in date range
        Event.find({
            $or: [
                { createdBy: userObjectId },
                { 'attendees.userId': userObjectId }
            ],
            startDateTime: { $gte: start, $lte: end },
            status: { $nin: ['cancelled', 'completed'] }
        })
        .select('_id title startDateTime endDateTime allDay type status priority color location')
        .sort({ startDateTime: 1 })
        .limit(10)
        .lean(),

        // Upcoming reminders (pending only)
        Reminder.find({
            userId: userObjectId,
            status: 'pending',
            reminderDateTime: { $gte: new Date(), $lte: reminderEnd }
        })
        .select('_id title reminderDateTime priority type status relatedCase relatedTask')
        .populate('relatedCase', 'title caseNumber')
        .populate('relatedTask', 'title')
        .sort({ reminderDateTime: 1 })
        .limit(10)
        .lean()
    ]);

    res.status(200).json({
        success: true,
        calendarEvents: calendarEvents.map(event => ({
            _id: event._id,
            title: event.title,
            startDate: event.startDateTime,
            endDate: event.endDateTime,
            allDay: event.allDay,
            type: event.type,
            status: event.status,
            priority: event.priority,
            color: event.color,
            location: event.location
        })),
        upcomingReminders: upcomingReminders.map(reminder => ({
            _id: reminder._id,
            title: reminder.title,
            dueDate: reminder.reminderDateTime,
            priority: reminder.priority,
            type: reminder.type,
            status: reminder.status,
            relatedCase: reminder.relatedCase,
            relatedTask: reminder.relatedTask
        }))
    });
});

module.exports = {
    getCalendarView,
    getCalendarByDate,
    getCalendarByMonth,
    getUpcomingItems,
    getOverdueItems,
    getCalendarStats,
    // Optimized endpoints
    getCalendarGridSummary,
    getCalendarGridItems,
    getCalendarItemDetails,
    getCalendarListView,
    // Aggregated endpoints (GOLD STANDARD)
    getSidebarData,
    // Cache invalidation helpers (call when events/tasks/reminders are modified)
    invalidateUserCalendarCache,
    invalidateItemCache,
    // Helper exports
    isValidCalendarType,
    VALID_CALENDAR_TYPES,
    VALID_PRIORITIES,
    VALID_STATUSES,
    CACHE_TTL,
    // Security validation helpers (exported for use in other controllers)
    validateDate,
    validateDateRange,
    validateAttendees
};
