const mongoose = require('mongoose');
const { Task, User, Case, TaskDocumentVersion, Event } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { deleteFile, listFileVersions, logFileAccess } = require('../configs/s3');
const { isS3Configured, getTaskFilePresignedUrl, isS3Url, extractS3Key } = require('../configs/taskUpload');
const { sanitizeRichText, sanitizeComment, stripHtml, hasDangerousContent } = require('../utils/sanitize');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Service layer - extracted helper functions
const {
    calculateNextDueDate,
    hasCircularDependency,
    evaluateWorkflowRules,
    executeWorkflowAction
} = require('../services/task.service');

// =============================================================================
// CONSTANTS - Centralized validation and allowed fields
// =============================================================================

// Valid enum values for validation (must match Task model schema)
const VALID_PRIORITIES = ['none', 'low', 'medium', 'high', 'critical'];
const VALID_STATUSES = ['backlog', 'todo', 'in_progress', 'done', 'canceled'];

// Allowed fields for mass assignment protection
const ALLOWED_FIELDS = {
    // Core task operations
    CREATE: [
        'title', 'description', 'priority', 'status', 'label', 'tags',
        'dueDate', 'dueTime', 'startDate', 'assignedTo', 'caseId', 'clientId',
        'parentTaskId', 'subtasks', 'checklists', 'timeTracking', 'recurring',
        'reminders', 'notes', 'points'
    ],
    UPDATE: [
        'title', 'description', 'status', 'priority', 'label', 'tags',
        'dueDate', 'dueTime', 'startDate', 'assignedTo', 'caseId', 'clientId',
        'subtasks', 'checklists', 'timeTracking', 'recurring', 'reminders',
        'notes', 'points', 'progress'
    ],
    // Subtask operations
    SUBTASK: ['title', 'autoReset'],
    SUBTASK_UPDATE: ['title', 'completed'],
    // Time tracking
    TIMER_START: ['notes'],
    TIMER_STOP: ['notes', 'isBillable'],
    MANUAL_TIME: ['minutes', 'notes', 'date', 'isBillable'],
    // Comments
    COMMENT_CREATE: ['content', 'text', 'mentions'],
    COMMENT_UPDATE: ['content', 'text'],
    // Bulk operations
    BULK_UPDATE: ['taskIds', 'updates'],
    BULK_DELETE: ['taskIds'],
    BULK_UPDATE_FIELDS: ['status', 'priority', 'assignedTo', 'dueDate', 'label', 'tags'],
    // Template operations
    TEMPLATE_CREATE: [
        'title', 'templateName', 'description', 'priority', 'label', 'tags',
        'subtasks', 'checklists', 'timeTracking', 'reminders', 'notes', 'isPublic'
    ],
    TEMPLATE_UPDATE: [
        'title', 'templateName', 'description', 'priority', 'label', 'tags',
        'subtasks', 'checklists', 'timeTracking', 'reminders', 'notes', 'isPublic'
    ],
    TEMPLATE_CREATE_TASK: ['title', 'dueDate', 'dueTime', 'assignedTo', 'caseId', 'clientId', 'notes'],
    SAVE_AS_TEMPLATE: ['templateName', 'isPublic'],
    // Other operations
    COMPLETE: ['completionNote'],
    DEPENDENCY: ['dependsOn', 'type'],
    STATUS_UPDATE: ['status'],
    PROGRESS: ['progress', 'autoCalculate'],
    // New missing endpoints
    CLONE: ['title', 'resetDueDate', 'includeSubtasks', 'includeChecklists', 'includeAttachments'],
    CONVERT_TO_EVENT: ['eventType', 'duration', 'attendees', 'location'],
    TIMER_PAUSE: ['reason'],
    TIMER_RESUME: ['notes'],
    // NEW: Bulk operations for select all/bulk edit features
    BULK_COMPLETE: ['taskIds', 'completionNote'],
    BULK_ASSIGN: ['taskIds', 'assignedTo'],
    BULK_ARCHIVE: ['taskIds'],
    BULK_UNARCHIVE: ['taskIds'],
    REORDER: ['taskId', 'newSortOrder', 'reorderItems'],
    RESCHEDULE: ['newDueDate', 'newDueTime', 'reason']
};

// =============================================================================
// CONTROLLER FUNCTIONS
// =============================================================================

// Create task
const createTask = asyncHandler(async (req, res) => {
    // Centralized middleware handles tenant validation - req.firmQuery is guaranteed

    const userId = req.userID;
    // Note: Use req.firmQuery for queries, req.addFirmId() for creates

    // Block departed users from creating tasks
    if (req.isDeparted) {
        throw CustomException('لم يعد لديك صلاحية إنشاء مهام جديدة', 403);
    }

    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.CREATE);

    const {
        title,
        description,
        priority,
        status,
        label,
        tags,
        dueDate,
        dueTime,
        startDate,
        assignedTo,
        caseId,
        clientId,
        parentTaskId,
        subtasks,
        checklists,
        timeTracking,
        recurring,
        reminders,
        notes,
        points
    } = data;

    // Input validation
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
        throw CustomException('Task title is required', 400);
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
        throw CustomException('Invalid priority value', 400);
    }

    if (status && !VALID_STATUSES.includes(status)) {
        throw CustomException('Invalid status value', 400);
    }

    // Validate timeTracking.estimatedMinutes - must be non-negative
    if (timeTracking?.estimatedMinutes !== undefined) {
        if (typeof timeTracking.estimatedMinutes !== 'number' || timeTracking.estimatedMinutes < 0) {
            throw CustomException('Estimated minutes must be a non-negative number', 400);
        }
        if (timeTracking.estimatedMinutes > 525600) { // Max 1 year in minutes
            throw CustomException('Estimated minutes cannot exceed 525600 (1 year)', 400);
        }
    }

    // Sanitize user input to prevent XSS
    const sanitizedTitle = title ? stripHtml(title) : '';
    const sanitizedDescription = description ? sanitizeRichText(description) : '';
    const sanitizedNotes = notes ? sanitizeRichText(notes) : '';

    // Check for dangerous content
    if (hasDangerousContent(description) || hasDangerousContent(notes)) {
        throw CustomException('Invalid content detected', 400);
    }

    // IDOR protection - sanitize ObjectIds
    const sanitizedAssignedTo = assignedTo ? sanitizeObjectId(assignedTo) : null;
    const sanitizedCaseId = caseId ? sanitizeObjectId(caseId) : null;
    const sanitizedClientId = clientId ? sanitizeObjectId(clientId) : null;
    const sanitizedParentTaskId = parentTaskId ? sanitizeObjectId(parentTaskId) : null;

    // Validate assignedTo user if provided (User lookups by ID are safe per CLAUDE.md)
    if (sanitizedAssignedTo) {
        const assignedUser = await User.findById(sanitizedAssignedTo);
        if (!assignedUser) {
            throw CustomException('Assigned user not found', 404);
        }
    }

    // If caseId provided, validate it exists and belongs to tenant
    if (sanitizedCaseId) {
        const caseDoc = await Case.findOne({ _id: sanitizedCaseId, ...req.firmQuery });
        if (!caseDoc) {
            throw CustomException('Case not found', 404);
        }
    }

    // Use req.addFirmId() for proper tenant isolation (sets firmId OR lawyerId)
    const task = await Task.create(req.addFirmId({
        title: sanitizedTitle,
        description: sanitizedDescription,
        priority: priority || 'medium',
        status: status || 'todo',
        label,
        tags,
        dueDate,
        dueTime,
        startDate,
        assignedTo: sanitizedAssignedTo || userId,
        createdBy: userId,
        caseId: sanitizedCaseId,
        clientId: sanitizedClientId,
        parentTaskId: sanitizedParentTaskId,
        subtasks: subtasks || [],
        checklists: checklists || [],
        timeTracking: timeTracking || { estimatedMinutes: 0, actualMinutes: 0, sessions: [] },
        recurring,
        reminders: reminders || [],
        notes: sanitizedNotes,
        points: points || 0
    }));

    // Add history entry
    task.history.push({
        action: 'created',
        userId,
        changes: { title, status: task.status },
        timestamp: new Date()
    });
    await task.save();

    // Create linked calendar event if task has a due date
    if (dueDate) {
        try {
            const eventStartDateTime = new Date(dueDate);

            // If dueTime is provided, set the time; otherwise make it all-day
            let isAllDay = true;
            if (dueTime) {
                const [hours, minutes] = dueTime.split(':');
                eventStartDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                isAllDay = false;
            }

            const linkedEvent = await Event.create(req.addFirmId({
                title: task.title,
                type: 'task',
                description: task.description,
                startDateTime: eventStartDateTime,
                endDateTime: isAllDay ? null : new Date(eventStartDateTime.getTime() + 60 * 60 * 1000), // 1 hour duration if not all-day
                allDay: isAllDay,
                taskId: task._id,
                caseId: task.caseId,
                clientId: task.clientId,
                organizer: userId,
                createdBy: userId,
                attendees: task.assignedTo ? [{ userId: task.assignedTo, status: 'confirmed', role: 'required' }] : [],
                priority: task.priority,
                color: '#10b981', // Green color for task events
                tags: task.tags
            }));

            // Link the event back to the task
            task.linkedEventId = linkedEvent._id;
            await task.save();
        } catch (error) {
            logger.error('Error creating linked calendar event', { error: error.message });
            // Don't fail task creation if event creation fails
        }
    }

    // Use req.firmQuery for proper tenant isolation (solo lawyers + firm members)
    const populatedTask = await Task.findOne({ _id: task._id, ...req.firmQuery })
        .populate('assignedTo', 'firstName lastName username email image')
        .populate('createdBy', 'firstName lastName username email image')
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'firstName lastName')
        .populate('linkedEventId', 'eventId title startDateTime');

    res.status(201).json({
        success: true,
        message: 'Task created successfully',
        data: populatedTask
    });
});

// Get all tasks with filters
const getTasks = asyncHandler(async (req, res) => {
    // Centralized middleware handles tenant validation - req.firmQuery is guaranteed

    const {
        status,
        priority,
        label,
        assignedTo,
        caseId,
        clientId,
        overdue,
        search,
        startDate,
        endDate,
        page = 1,
        limit = 50,
        sortBy = 'dueDate',
        sortOrder = 'asc'
    } = req.query;

    const userId = req.userID;
    const isDeparted = req.isDeparted; // From firmFilter middleware

    // IDOR protection - sanitize ObjectIds in query parameters
    const sanitizedAssignedTo = assignedTo ? sanitizeObjectId(assignedTo) : null;
    const sanitizedCaseId = caseId ? sanitizeObjectId(caseId) : null;
    const sanitizedClientId = clientId ? sanitizeObjectId(clientId) : null;

    // Build query using req.firmQuery for proper tenant isolation
    let query = { ...req.firmQuery };

    // Departed users can only see their own tasks
    if (isDeparted) {
        query.$or = [
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }

    // Handle array filters (frontend may send status[]=todo&status[]=pending)
    if (status) {
        query.status = Array.isArray(status) ? { $in: status } : status;
    }
    if (priority) {
        query.priority = Array.isArray(priority) ? { $in: priority } : priority;
    }
    if (label) {
        query.label = Array.isArray(label) ? { $in: label } : label;
    }
    if (sanitizedAssignedTo) query.assignedTo = sanitizedAssignedTo;
    if (sanitizedCaseId) query.caseId = sanitizedCaseId;
    if (sanitizedClientId) query.clientId = sanitizedClientId;

    // Date range filter
    if (startDate || endDate) {
        query.dueDate = {};
        if (startDate) query.dueDate.$gte = new Date(startDate);
        if (endDate) query.dueDate.$lte = new Date(endDate);
    }

    // Overdue filter
    if (overdue === 'true') {
        query.dueDate = { $lt: new Date() };
        query.status = { $nin: ['done', 'canceled'] };
    }

    // Gold Standard: MongoDB $text search with indexed performance (Elasticsearch/Algolia pattern)
    // Uses idx_task_textsearch: { title: 'text', description: 'text', notes: 'text' }
    // Graceful fallback to regex if text index doesn't exist
    let useTextSearch = false;
    if (search && search.trim()) {
        const searchTerm = search.trim();

        // MongoDB $text cannot coexist with $or at top level
        // Solution: Use $and to wrap existing $or (e.g., for departed users)
        if (query.$or) {
            query.$and = [
                { $or: query.$or },
                { $text: { $search: searchTerm } }
            ];
            delete query.$or;
        } else {
            query.$text = { $search: searchTerm };
        }
        useTextSearch = true;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Gold Standard: Try $text search first, fallback to regex if index missing
    let tasks;
    let total;
    try {
        tasks = await Task.find(query)
            .populate('assignedTo', 'firstName lastName username email image')
            .populate('createdBy', 'firstName lastName username email image')
            .populate('caseId', 'title caseNumber')
            .populate('clientId', 'firstName lastName')
            .sort(sortOptions)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .lean();

        total = await Task.countDocuments(query);
    } catch (textSearchError) {
        // Graceful degradation: Fall back to regex if text index missing
        // Error code 27 = IndexNotFound, 17007 = text index required
        if (useTextSearch && (textSearchError.code === 27 || textSearchError.code === 17007 ||
            textSearchError.message?.includes('text index'))) {
            // Remove $text from query and use regex fallback
            const fallbackQuery = { ...req.firmQuery };

            // Rebuild non-search filters
            if (isDeparted) {
                fallbackQuery.$or = [
                    { assignedTo: userId },
                    { createdBy: userId }
                ];
            }
            if (status) fallbackQuery.status = Array.isArray(status) ? { $in: status } : status;
            if (priority) fallbackQuery.priority = Array.isArray(priority) ? { $in: priority } : priority;
            if (label) fallbackQuery.label = Array.isArray(label) ? { $in: label } : label;
            if (sanitizedAssignedTo) fallbackQuery.assignedTo = sanitizedAssignedTo;
            if (sanitizedCaseId) fallbackQuery.caseId = sanitizedCaseId;
            if (sanitizedClientId) fallbackQuery.clientId = sanitizedClientId;
            if (startDate || endDate) {
                fallbackQuery.dueDate = {};
                if (startDate) fallbackQuery.dueDate.$gte = new Date(startDate);
                if (endDate) fallbackQuery.dueDate.$lte = new Date(endDate);
            }
            if (overdue === 'true') {
                fallbackQuery.dueDate = { $lt: new Date() };
                fallbackQuery.status = { $nin: ['done', 'canceled'] };
            }

            // Add regex search
            const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
            if (fallbackQuery.$or) {
                fallbackQuery.$and = [
                    { $or: fallbackQuery.$or },
                    { $or: [
                        { title: searchRegex },
                        { description: searchRegex },
                        { notes: searchRegex },
                        { tags: searchRegex }
                    ]}
                ];
                delete fallbackQuery.$or;
            } else {
                fallbackQuery.$or = [
                    { title: searchRegex },
                    { description: searchRegex },
                    { notes: searchRegex },
                    { tags: searchRegex }
                ];
            }

            tasks = await Task.find(fallbackQuery)
                .populate('assignedTo', 'firstName lastName username email image')
                .populate('createdBy', 'firstName lastName username email image')
                .populate('caseId', 'title caseNumber')
                .populate('clientId', 'firstName lastName')
                .sort(sortOptions)
                .limit(parseInt(limit))
                .skip((parseInt(page) - 1) * parseInt(limit))
                .lean();

            total = await Task.countDocuments(fallbackQuery);
        } else {
            throw textSearchError;
        }
    }

    res.status(200).json({
        success: true,
        data: tasks,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

// Get single task
const getTask = asyncHandler(async (req, res) => {
    // Centralized middleware handles tenant validation

    const { id } = req.params;

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Use req.firmQuery for proper tenant isolation
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery })
        .populate('assignedTo', 'firstName lastName username email image')
        .populate('createdBy', 'firstName lastName username email image')
        .populate('caseId', 'title caseNumber category')
        .populate('clientId', 'firstName lastName email')
        .populate('completedBy', 'firstName lastName')
        .populate('comments.userId', 'firstName lastName image')
        .populate('timeTracking.sessions.userId', 'firstName lastName')
        .populate('linkedEventId', 'eventId title startDateTime status')
        .lean();

    if (!task) {
        throw CustomException('Task not found', 404);
    }

    res.status(200).json({
        success: true,
        data: task
    });
});

// Update task
const updateTask = asyncHandler(async (req, res) => {
    // Centralized middleware handles tenant validation

    const { id } = req.params;
    const userId = req.userID;

    // Block departed users from updating
    if (req.isDeparted) {
        throw CustomException('لم يعد لديك صلاحية تعديل المهام', 403);
    }

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Use req.firmQuery for proper tenant isolation
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery });

    if (!task) {
        throw CustomException('Task not found', 404);
    }

    // Mass assignment protection
    const updates = pickAllowedFields(req.body, ALLOWED_FIELDS.UPDATE);

    // Input validation
    if (updates.priority && !VALID_PRIORITIES.includes(updates.priority)) {
        throw CustomException('Invalid priority value', 400);
    }

    if (updates.status && !VALID_STATUSES.includes(updates.status)) {
        throw CustomException('Invalid status value', 400);
    }

    // Validate timeTracking.estimatedMinutes - must be non-negative
    if (updates.timeTracking?.estimatedMinutes !== undefined) {
        if (typeof updates.timeTracking.estimatedMinutes !== 'number' || updates.timeTracking.estimatedMinutes < 0) {
            throw CustomException('Estimated minutes must be a non-negative number', 400);
        }
        if (updates.timeTracking.estimatedMinutes > 525600) { // Max 1 year in minutes
            throw CustomException('Estimated minutes cannot exceed 525600 (1 year)', 400);
        }
    }

    // Sanitize text fields
    if (updates.title) updates.title = stripHtml(updates.title);
    if (updates.description) updates.description = sanitizeRichText(updates.description);
    if (updates.notes) updates.notes = sanitizeRichText(updates.notes);

    // Check for dangerous content
    if (hasDangerousContent(updates.description) || hasDangerousContent(updates.notes)) {
        throw CustomException('Invalid content detected', 400);
    }

    // IDOR protection for reference IDs
    if (updates.assignedTo) updates.assignedTo = sanitizeObjectId(updates.assignedTo);
    if (updates.caseId) updates.caseId = sanitizeObjectId(updates.caseId);
    if (updates.clientId) updates.clientId = sanitizeObjectId(updates.clientId);

    // Track changes for history
    const changes = {};

    ALLOWED_FIELDS.UPDATE.forEach(field => {
        if (updates[field] !== undefined && JSON.stringify(task[field]) !== JSON.stringify(updates[field])) {
            changes[field] = { from: task[field], to: updates[field] };
            task[field] = updates[field];
        }
    });

    // Handle completion
    if (updates.status === 'done' && task.status !== 'done') {
        task.completedAt = new Date();
        task.completedBy = userId;
    }

    // Add history entry
    if (Object.keys(changes).length > 0) {
        task.history.push({
            action: 'updated',
            userId,
            changes,
            timestamp: new Date()
        });
    }

    await task.save();

    // Sync with linked calendar event
    try {
        const hadDueDate = changes.dueDate?.from;
        const hasDueDate = task.dueDate;

        if (hasDueDate && !task.linkedEventId) {
            // Task now has a due date but no linked event → create event
            const eventStartDateTime = new Date(task.dueDate);
            let isAllDay = true;
            if (task.dueTime) {
                const [hours, minutes] = task.dueTime.split(':');
                eventStartDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                isAllDay = false;
            }

            // Use req.addFirmId for proper tenant context when creating Event
            const linkedEvent = await Event.create(req.addFirmId({
                title: task.title,
                type: 'task',
                description: task.description,
                startDateTime: eventStartDateTime,
                endDateTime: isAllDay ? null : new Date(eventStartDateTime.getTime() + 60 * 60 * 1000),
                allDay: isAllDay,
                taskId: task._id,
                caseId: task.caseId,
                clientId: task.clientId,
                organizer: task.createdBy,
                createdBy: task.createdBy,
                attendees: task.assignedTo ? [{ userId: task.assignedTo, status: 'confirmed', role: 'required' }] : [],
                priority: task.priority,
                color: '#10b981',
                tags: task.tags,
                status: task.status === 'done' ? 'completed' : 'scheduled'
            }));

            task.linkedEventId = linkedEvent._id;
            await task.save();

        } else if (!hasDueDate && task.linkedEventId) {
            // Task no longer has due date → delete linked event
            await Event.findOneAndDelete({ _id: task.linkedEventId, ...req.firmQuery });
            task.linkedEventId = null;
            await task.save();

        } else if (hasDueDate && task.linkedEventId) {
            // Task still has due date and linked event → update event
            const linkedEvent = await Event.findOne({ _id: task.linkedEventId, ...req.firmQuery });

            if (linkedEvent) {
                // Update event fields
                linkedEvent.title = task.title;
                linkedEvent.description = task.description;

                // Update start date/time if due date or time changed
                if (changes.dueDate || changes.dueTime) {
                    const eventStartDateTime = new Date(task.dueDate);
                    let isAllDay = true;
                    if (task.dueTime) {
                        const [hours, minutes] = task.dueTime.split(':');
                        eventStartDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                        isAllDay = false;
                    }
                    linkedEvent.startDateTime = eventStartDateTime;
                    linkedEvent.endDateTime = isAllDay ? null : new Date(eventStartDateTime.getTime() + 60 * 60 * 1000);
                    linkedEvent.allDay = isAllDay;
                }

                // Update other fields
                linkedEvent.caseId = task.caseId;
                linkedEvent.clientId = task.clientId;
                linkedEvent.priority = task.priority;
                linkedEvent.tags = task.tags;

                // Update status based on task status
                if (task.status === 'done') {
                    linkedEvent.status = 'completed';
                    linkedEvent.completedAt = task.completedAt;
                    linkedEvent.completedBy = task.completedBy;
                } else if (task.status === 'canceled') {
                    linkedEvent.status = 'cancelled';
                } else {
                    linkedEvent.status = 'scheduled';
                }

                // Update attendees if assignedTo changed
                if (changes.assignedTo) {
                    linkedEvent.attendees = task.assignedTo ? [{ userId: task.assignedTo, status: 'confirmed', role: 'required' }] : [];
                }

                linkedEvent.lastModifiedBy = userId;
                await linkedEvent.save();
            }
        }
    } catch (error) {
        logger.error('Error syncing task with calendar event', { error: error.message });
        // Don't fail task update if event sync fails
    }

    // Use req.firmQuery for proper tenant isolation (solo lawyers + firm members)
    const populatedTask = await Task.findOne({ _id: task._id, ...req.firmQuery })
        .populate('assignedTo', 'firstName lastName username email image')
        .populate('createdBy', 'firstName lastName username email image')
        .populate('caseId', 'title caseNumber')
        .populate('linkedEventId', 'eventId title startDateTime');

    res.status(200).json({
        success: true,
        message: 'Task updated successfully',
        data: populatedTask
    });
});

// Delete task
const deleteTask = asyncHandler(async (req, res) => {
    // Validate tenant context first
    // Centralized middleware handles tenant validation

    const { id } = req.params;

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Build query with req.firmQuery for proper tenant isolation (solo + firm)
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery });

    if (!task) {
        throw CustomException('Task not found', 404);
    }

    // Delete linked calendar event if exists
    if (task.linkedEventId) {
        try {
            // IDOR protection: Include req.firmQuery in delete query
            await Event.findOneAndDelete({ _id: task.linkedEventId, ...req.firmQuery });
        } catch (error) {
            logger.error('Error deleting linked calendar event', { error: error.message });
            // Continue with task deletion even if event deletion fails
        }
    }

    await Task.findOneAndDelete({ _id: taskId, ...req.firmQuery });

    res.status(200).json({
        success: true,
        message: 'Task deleted successfully'
    });
});

// Complete task
const completeTask = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.COMPLETE);
    const { completionNote } = data;

    // Use req.firmQuery for proper tenant isolation (solo + firm)
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery });

    if (!task) {
        throw CustomException('Task not found', 404);
    }

    task.status = 'done';
    task.completedAt = new Date();
    task.completedBy = userId;
    task.progress = 100;

    if (completionNote) {
        task.notes = (task.notes ? task.notes + '\n\n' : '') + `[Completion Note]: ${completionNote}`;
    }

    task.history.push({
        action: 'completed',
        userId,
        timestamp: new Date()
    });

    await task.save();

    // Handle recurring tasks
    if (task.recurring?.enabled) {
        const nextDueDate = calculateNextDueDate(task.dueDate, task.recurring);
        task.recurring.occurrencesCompleted = (task.recurring.occurrencesCompleted || 0) + 1;

        // Check if we should create next occurrence
        const shouldCreate =
            (!task.recurring.endDate || nextDueDate <= new Date(task.recurring.endDate)) &&
            (!task.recurring.maxOccurrences || task.recurring.occurrencesCompleted < task.recurring.maxOccurrences);

        if (shouldCreate) {
            // Determine assignee based on strategy
            let nextAssignee = task.assignedTo;
            if (task.recurring.assigneeStrategy === 'round_robin' && task.recurring.assigneePool?.length > 0) {
                const poolIndex = task.recurring.occurrencesCompleted % task.recurring.assigneePool.length;
                nextAssignee = task.recurring.assigneePool[poolIndex];
            } else if (task.recurring.assigneeStrategy === 'random' && task.recurring.assigneePool?.length > 0) {
                const randomIndex = Math.floor(Math.random() * task.recurring.assigneePool.length);
                nextAssignee = task.recurring.assigneePool[randomIndex];
            }

            // Use req.addFirmId() for proper tenant isolation
            const nextTask = await Task.create(req.addFirmId({
                title: task.title,
                description: task.description,
                priority: task.priority,
                label: task.label,
                tags: task.tags,
                status: 'todo',
                dueDate: nextDueDate,
                dueTime: task.dueTime,
                assignedTo: nextAssignee,
                createdBy: task.createdBy,
                caseId: task.caseId,
                clientId: task.clientId,
                recurring: task.recurring,
                reminders: task.reminders,
                notes: task.notes,
                points: task.points
            }));

            return res.status(200).json({
                success: true,
                message: 'Task completed! Next occurrence created.',
                data: task,
                nextTask
            });
        }
    }

    // Use req.firmQuery for proper tenant isolation (solo lawyers + firm members)
    const populatedTask = await Task.findOne({ _id: task._id, ...req.firmQuery })
        .populate('assignedTo', 'firstName lastName username email image')
        .populate('createdBy', 'firstName lastName username email image')
        .populate('completedBy', 'firstName lastName');

    res.status(200).json({
        success: true,
        message: 'Task completed successfully',
        data: populatedTask
    });
});

// === SUBTASK MANAGEMENT ===

// Add subtask
const addSubtask = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.SUBTASK);
    const { title, autoReset } = data;

    // Input validation
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
        throw CustomException('Subtask title is required', 400);
    }

    // Use req.firmQuery for proper tenant isolation (solo + firm)
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    task.subtasks.push({
        title,
        completed: false,
        autoReset: autoReset || false
    });

    task.history.push({
        action: 'subtask_added',
        userId,
        changes: { subtaskTitle: title },
        timestamp: new Date()
    });

    await task.save();

    res.status(201).json({
        success: true,
        message: 'Subtask added successfully',
        data: task.subtasks
    });
});

// Toggle subtask
const toggleSubtask = asyncHandler(async (req, res) => {
    const { id, subtaskId } = req.params;
    const userId = req.userID;

    // IDOR protection
    const taskId = sanitizeObjectId(id);
    const sanitizedSubtaskId = sanitizeObjectId(subtaskId);

    // Use req.firmQuery for proper tenant isolation (solo + firm)
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const subtask = task.subtasks.id(sanitizedSubtaskId);
    if (!subtask) {
        throw CustomException('Subtask not found', 404);
    }

    subtask.completed = !subtask.completed;
    subtask.completedAt = subtask.completed ? new Date() : null;

    task.history.push({
        action: subtask.completed ? 'subtask_completed' : 'subtask_uncompleted',
        userId,
        changes: { subtaskId: sanitizedSubtaskId, subtaskTitle: subtask.title },
        timestamp: new Date()
    });

    await task.save();

    res.status(200).json({
        success: true,
        message: `Subtask ${subtask.completed ? 'completed' : 'uncompleted'}`,
        data: task.subtasks
    });
});

// Delete subtask
const deleteSubtask = asyncHandler(async (req, res) => {
    const { id, subtaskId } = req.params;
    const userId = req.userID;

    // IDOR protection
    const taskId = sanitizeObjectId(id);
    const sanitizedSubtaskId = sanitizeObjectId(subtaskId);

    // Use req.firmQuery for proper tenant isolation (solo + firm)
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    task.subtasks.pull(sanitizedSubtaskId);
    await task.save();

    res.status(200).json({
        success: true,
        message: 'Subtask deleted successfully',
        data: task.subtasks
    });
});

// === TIME TRACKING ===

// Start timer
const startTimer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.TIMER_START);
    const { notes } = data;

    // Use req.firmQuery for proper tenant isolation (solo + firm)
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    // Check for active session
    if (task.timeTracking.isTracking) {
        throw CustomException('A timer is already running for this task', 400);
    }

    const now = new Date();
    task.timeTracking.sessions.push({
        startedAt: now,
        userId,
        notes,
        isBillable: true
    });

    task.timeTracking.isTracking = true;
    task.timeTracking.currentSessionStart = now;

    await task.save();

    res.status(200).json({
        success: true,
        message: 'Timer started',
        data: task.timeTracking
    });
});

// Stop timer
const stopTimer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.TIMER_STOP);
    const { notes, isBillable } = data;

    // Use req.firmQuery for proper tenant isolation (solo + firm)
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    if (!task.timeTracking.isTracking) {
        throw CustomException('No active timer found', 400);
    }

    const activeSession = task.timeTracking.sessions.find(s => !s.endedAt);
    if (!activeSession) {
        throw CustomException('No active timer found', 400);
    }

    activeSession.endedAt = new Date();
    activeSession.duration = Math.round((activeSession.endedAt - activeSession.startedAt) / 60000);

    // Update notes and billable status if provided
    if (notes !== undefined) {
        activeSession.notes = notes;
    }
    if (isBillable !== undefined) {
        activeSession.isBillable = isBillable;
    }

    // Update tracking state
    task.timeTracking.isTracking = false;
    task.timeTracking.currentSessionStart = null;

    // Update total actual minutes
    task.timeTracking.actualMinutes = task.timeTracking.sessions
        .filter(s => s.endedAt)
        .reduce((total, s) => total + (s.duration || 0), 0);

    await task.save();

    res.status(200).json({
        success: true,
        message: 'Timer stopped',
        data: task.timeTracking,
        task: {
            timeTracking: task.timeTracking,
            budget: task.budget
        }
    });
});

// Add manual time
const addManualTime = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.MANUAL_TIME);
    const { minutes, notes, date, isBillable = true } = data;

    // Input validation
    if (!minutes || typeof minutes !== 'number' || minutes <= 0) {
        throw CustomException('Minutes must be a positive number', 400);
    }

    if (minutes > 1440) { // More than 24 hours
        throw CustomException('Minutes cannot exceed 1440 (24 hours)', 400);
    }

    // Use req.firmQuery for proper tenant isolation (solo + firm)
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const sessionDate = date ? new Date(date) : new Date();
    task.timeTracking.sessions.push({
        startedAt: sessionDate,
        endedAt: new Date(sessionDate.getTime() + minutes * 60000),
        duration: minutes,
        userId,
        notes,
        isBillable
    });

    task.timeTracking.actualMinutes = (task.timeTracking.actualMinutes || 0) + minutes;

    await task.save();

    res.status(200).json({
        success: true,
        message: 'Time entry added',
        data: task.timeTracking,
        task: {
            timeTracking: task.timeTracking,
            budget: task.budget
        }
    });
});

// === COMMENTS ===

// Add comment
const addComment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.COMMENT_CREATE);
    const { content, text, mentions } = data;
    const rawContent = content || text;

    // Input validation
    if (!rawContent || typeof rawContent !== 'string' || rawContent.trim().length === 0) {
        throw CustomException('Comment content is required', 400);
    }

    // Sanitize comment content (more restrictive than rich text)
    const sanitizedContent = sanitizeComment(rawContent);

    if (hasDangerousContent(rawContent)) {
        throw CustomException('Invalid content detected', 400);
    }

    // Use req.firmQuery for proper tenant isolation (solo + firm)
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    task.comments.push({
        userId,
        content: sanitizedContent,
        mentions: mentions || [],
        createdAt: new Date()
    });

    await task.save();

    // Use req.firmQuery for proper tenant isolation (solo lawyers + firm members)
    const populatedTask = await Task.findOne({ _id: taskId, ...req.firmQuery })
        .populate('comments.userId', 'firstName lastName image')
        .lean();

    res.status(201).json({
        success: true,
        message: 'Comment added',
        data: populatedTask.comments
    });
});

// Update comment
const updateComment = asyncHandler(async (req, res) => {
    const { id, commentId } = req.params;
    const userId = req.userID;

    // IDOR protection
    const taskId = sanitizeObjectId(id);
    const sanitizedCommentId = sanitizeObjectId(commentId);

    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.COMMENT_UPDATE);
    const { content, text } = data;
    const rawContent = content || text;

    // Input validation
    if (!rawContent || typeof rawContent !== 'string' || rawContent.trim().length === 0) {
        throw CustomException('Comment content is required', 400);
    }

    // Sanitize comment content
    const sanitizedContent = sanitizeComment(rawContent);

    if (hasDangerousContent(rawContent)) {
        throw CustomException('Invalid content detected', 400);
    }

    // Use req.firmQuery for proper tenant isolation (solo + firm)
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const comment = task.comments.id(sanitizedCommentId);
    if (!comment) {
        throw CustomException('Comment not found', 404);
    }

    if (comment.userId.toString() !== userId) {
        throw CustomException('You can only edit your own comments', 403);
    }

    comment.content = sanitizedContent;
    comment.updatedAt = new Date();

    await task.save();

    res.status(200).json({
        success: true,
        message: 'Comment updated',
        data: task.comments
    });
});

// Delete comment
const deleteComment = asyncHandler(async (req, res) => {
    const { id, commentId } = req.params;
    const userId = req.userID;

    // IDOR protection
    const taskId = sanitizeObjectId(id);
    const sanitizedCommentId = sanitizeObjectId(commentId);

    // Use req.firmQuery for proper tenant isolation (solo + firm)
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const comment = task.comments.id(sanitizedCommentId);
    if (!comment) {
        throw CustomException('Comment not found', 404);
    }

    if (comment.userId.toString() !== userId && task.createdBy.toString() !== userId) {
        throw CustomException('You cannot delete this comment', 403);
    }

    task.comments.pull(sanitizedCommentId);
    await task.save();

    res.status(200).json({
        success: true,
        message: 'Comment deleted'
    });
});

// === BULK OPERATIONS ===

// Bulk update tasks
const bulkUpdateTasks = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.BULK_UPDATE);
    const { taskIds, updates } = data;

    // Input validation
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        throw CustomException('Task IDs are required', 400);
    }

    if (taskIds.length > 100) {
        throw CustomException('Cannot update more than 100 tasks at once', 400);
    }

    // IDOR protection - sanitize all task IDs
    const sanitizedTaskIds = taskIds.map(id => sanitizeObjectId(id));

    // Mass assignment protection for updates
    const updateData = pickAllowedFields(updates || {}, ALLOWED_FIELDS.BULK_UPDATE_FIELDS);

    // Input validation for update values
    if (updateData.priority && !VALID_PRIORITIES.includes(updateData.priority)) {
        throw CustomException('Invalid priority value', 400);
    }

    if (updateData.status && !VALID_STATUSES.includes(updateData.status)) {
        throw CustomException('Invalid status value', 400);
    }

    // IDOR protection for reference IDs in updates
    if (updateData.assignedTo) {
        updateData.assignedTo = sanitizeObjectId(updateData.assignedTo);
    }

    // Verify access to all tasks - use req.firmQuery for proper tenant isolation
    const accessQuery = { _id: { $in: sanitizedTaskIds }, ...req.firmQuery };

    const tasks = await Task.find(accessQuery);

    if (tasks.length !== sanitizedTaskIds.length) {
        throw CustomException('Some tasks are not accessible', 403);
    }

    // Use req.firmQuery in updateMany for tenant isolation
    await Task.updateMany(
        { _id: { $in: sanitizedTaskIds }, ...req.firmQuery },
        { $set: updateData }
    );

    res.status(200).json({
        success: true,
        message: `${tasks.length} tasks updated successfully`,
        count: tasks.length
    });
});

// Bulk delete tasks
const bulkDeleteTasks = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.BULK_DELETE);
    const { taskIds } = data;

    // Input validation
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        throw CustomException('Task IDs are required', 400);
    }

    if (taskIds.length > 100) {
        throw CustomException('Cannot delete more than 100 tasks at once', 400);
    }

    // IDOR protection - sanitize all task IDs
    const sanitizedTaskIds = taskIds.map(id => sanitizeObjectId(id));

    // Use req.firmQuery for proper tenant isolation (solo + firm)
    const accessQuery = { _id: { $in: sanitizedTaskIds }, ...req.firmQuery };

    const tasks = await Task.find(accessQuery).select('_id');
    const foundTaskIds = tasks.map(t => t._id.toString());

    // Find which IDs failed authorization
    const failedIds = sanitizedTaskIds.filter(id => !foundTaskIds.includes(id.toString()));

    if (failedIds.length > 0) {
        return res.status(403).json({
            success: false,
            message: `Cannot delete ${failedIds.length} task(s): not found or no permission`,
            failedCount: failedIds.length,
            validCount: foundTaskIds.length,
            requestedCount: sanitizedTaskIds.length
        });
    }

    // SECURITY: Use accessQuery with req.firmQuery to ensure tenant isolation
    await Task.deleteMany(accessQuery);

    res.status(200).json({
        success: true,
        message: `${tasks.length} tasks deleted successfully`,
        count: tasks.length
    });
});

// === STATS & ANALYTICS ===

// Get task stats
const getTaskStats = asyncHandler(async (req, res) => {
    // Validate tenant context first
    // Centralized middleware handles tenant validation

    const userId = req.userID;
    const firmId = req.firmId;

    // Get stats with proper firm/lawyer isolation
    const stats = await Task.getStats(userId, firmId, req.firmQuery);

    res.status(200).json({
        success: true,
        data: stats
    });
});

// Get upcoming tasks
const getUpcomingTasks = asyncHandler(async (req, res) => {
    // Validate tenant context first
    // Centralized middleware handles tenant validation

    const { days = 7 } = req.query;

    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + parseInt(days));

    // Use req.firmQuery for proper firm/lawyer isolation (set by firmFilter middleware)
    const tasks = await Task.find({
        ...req.firmQuery,
        dueDate: { $gte: today, $lte: future },
        status: { $nin: ['done', 'canceled'] }
    })
        .populate('assignedTo', 'firstName lastName image')
        .populate('caseId', 'title caseNumber')
        .sort({ dueDate: 1 })
        .lean();

    res.status(200).json({
        success: true,
        data: tasks,
        count: tasks.length
    });
});

// Get overdue tasks
const getOverdueTasks = asyncHandler(async (req, res) => {
    // Validate tenant context first
    // Centralized middleware handles tenant validation

    // Use req.firmQuery for proper firm/lawyer isolation (set by firmFilter middleware)
    const tasks = await Task.find({
        ...req.firmQuery,
        dueDate: { $lt: new Date() },
        status: { $nin: ['done', 'canceled'] }
    })
        .populate('assignedTo', 'firstName lastName image')
        .populate('caseId', 'title caseNumber')
        .lean()
        .sort({ dueDate: 1 });

    res.status(200).json({
        success: true,
        data: tasks,
        count: tasks.length
    });
});

// Get tasks by case
const getTasksByCase = asyncHandler(async (req, res) => {
    // Validate tenant context first
    // Centralized middleware handles tenant validation

    const { caseId } = req.params;

    // IDOR protection
    const sanitizedCaseId = sanitizeObjectId(caseId);

    // Verify case exists and user has access using req.firmQuery
    const caseDoc = await Case.findOne({ _id: sanitizedCaseId, ...req.firmQuery });
    if (!caseDoc) {
        throw CustomException('Case not found', 404);
    }

    // Use req.firmQuery for proper tenant isolation (solo + firm)
    const tasks = await Task.find({ caseId: sanitizedCaseId, ...req.firmQuery })
        .populate('assignedTo', 'firstName lastName image')
        .populate('createdBy', 'firstName lastName')
        .sort({ dueDate: 1, priority: -1 })
        .lean();

    res.status(200).json({
        success: true,
        data: tasks,
        count: tasks.length
    });
});

// Get tasks due today
const getTasksDueToday = asyncHandler(async (req, res) => {
    // Validate tenant context first
    // Centralized middleware handles tenant validation

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Use req.firmQuery for proper tenant isolation (solo + firm)
    const tasks = await Task.find({
        ...req.firmQuery,
        dueDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $nin: ['done', 'canceled'] }
    })
        .populate('assignedTo', 'firstName lastName image')
        .populate('createdBy', 'firstName lastName image')
        .populate('caseId', 'title caseNumber')
        .sort({ dueTime: 1, priority: -1 })
        .lean();

    res.status(200).json({
        success: true,
        data: tasks,
        count: tasks.length,
        date: startOfDay.toISOString().split('T')[0]
    });
});


// ============================================
// TEMPLATE FUNCTIONS - MOVED TO:
// - taskTemplate.controller.js
// ============================================

// ============================================
// ATTACHMENT FUNCTIONS - MOVED TO:
// - taskAttachment.controller.js (addAttachment, deleteAttachment)
// ============================================

// ============================================
// DEPENDENCY FUNCTIONS
// ============================================

/**
 * Add dependency to task
 * POST /api/tasks/:id/dependencies
 */
const addDependency = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.DEPENDENCY);
    const { dependsOn, type = 'blocked_by' } = data;

    // Input validation
    if (!dependsOn) {
        throw CustomException('dependsOn task ID is required', 400);
    }

    // IDOR protection
    const sanitizedDependsOn = sanitizeObjectId(dependsOn);

    // Use req.firmQuery for proper tenant isolation (solo lawyers + firm members)
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const dependentTask = await Task.findOne({ _id: sanitizedDependsOn, ...req.firmQuery });
    if (!dependentTask) {
        throw CustomException('المهمة المحددة غير موجودة', 404);
    }

    // Prevent self-reference
    if (taskId.toString() === sanitizedDependsOn.toString()) {
        throw CustomException('لا يمكن للمهمة أن تعتمد على نفسها', 400);
    }

    // Check if dependency already exists
    if (task.blockedBy.some(t => t.toString() === sanitizedDependsOn.toString())) {
        throw CustomException('هذه التبعية موجودة بالفعل', 400);
    }

    // Check for circular dependency - pass firmQuery for proper isolation
    if (await hasCircularDependency(taskId, sanitizedDependsOn, req.firmQuery)) {
        throw CustomException('لا يمكن إنشاء تبعية دائرية', 400);
    }

    // Get user name for history (bypass firm filter - user lookup by ID is safe)
    const user = await User.findById(userId).select('firstName lastName');

    // Add to blockedBy array
    task.blockedBy.push(sanitizedDependsOn);
    task.dependencies.push({ taskId: sanitizedDependsOn, type });

    // Add to dependent task's blocks array
    dependentTask.blocks.push(taskId);

    // Add history entries
    task.history.push({
        action: 'dependency_added',
        userId,
        userName: user ? `${user.firstName} ${user.lastName}` : undefined,
        details: `تمت إضافة تبعية على المهمة: ${dependentTask.title}`,
        timestamp: new Date()
    });

    await task.save();
    await dependentTask.save();

    // Populate for response
    await task.populate('blockedBy', 'title status priority dueDate');

    res.status(201).json({
        success: true,
        message: 'لا يمكن بدء هذه المهمة حتى اكتمال المهمة المحددة',
        task
    });
});

/**
 * Remove dependency from task
 * DELETE /api/tasks/:id/dependencies/:dependencyTaskId
 */
const removeDependency = asyncHandler(async (req, res) => {
    const { id, dependencyTaskId } = req.params;
    const userId = req.userID;

    // IDOR protection
    const taskId = sanitizeObjectId(id);
    const sanitizedDependencyTaskId = sanitizeObjectId(dependencyTaskId);

    // Use req.firmQuery for proper tenant isolation (solo lawyers + firm members)
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const dependentTask = await Task.findOne({ _id: sanitizedDependencyTaskId, ...req.firmQuery });

    // Remove from blockedBy
    task.blockedBy = task.blockedBy.filter(t => t.toString() !== sanitizedDependencyTaskId.toString());
    task.dependencies = task.dependencies.filter(d => d.taskId.toString() !== sanitizedDependencyTaskId.toString());

    // Remove from dependent task's blocks array
    if (dependentTask) {
        dependentTask.blocks = dependentTask.blocks.filter(t => t.toString() !== taskId.toString());
        await dependentTask.save();
    }

    // Get user name for history (user lookup by ID is safe)
    const user = await User.findById(userId).select('firstName lastName');

    task.history.push({
        action: 'dependency_removed',
        userId,
        userName: user ? `${user.firstName} ${user.lastName}` : undefined,
        details: 'تمت إزالة التبعية',
        timestamp: new Date()
    });

    await task.save();

    res.status(200).json({
        success: true,
        message: 'تمت إزالة التبعية',
        task
    });
});

/**
 * Update task status with dependency check
 * PATCH /api/tasks/:id/status
 */
const updateTaskStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.STATUS_UPDATE);
    const { status } = data;

    // Input validation
    if (!status) {
        throw CustomException('Status is required', 400);
    }

    if (!VALID_STATUSES.includes(status)) {
        throw CustomException('Invalid status value', 400);
    }

    // Use req.firmQuery for proper tenant isolation (solo lawyers + firm members)
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery }).populate('blockedBy', 'title status');

    if (!task) {
        throw CustomException('Task not found', 404);
    }

    // Check dependencies when moving to in_progress
    if (status === 'in_progress' && task.blockedBy && task.blockedBy.length > 0) {
        const incompleteBlockers = task.blockedBy.filter(t => t.status !== 'done');

        if (incompleteBlockers.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'BLOCKED_BY_DEPENDENCIES',
                message: 'لا يمكن بدء هذه المهمة حتى اكتمال المهام التالية',
                blockingTasks: incompleteBlockers.map(t => ({
                    _id: t._id,
                    title: t.title,
                    status: t.status
                }))
            });
        }
    }

    const oldStatus = task.status;
    task.status = status;

    // Get user name for history (user lookup by ID is safe)
    const user = await User.findById(userId).select('firstName lastName');

    // Add history entry
    task.history.push({
        action: 'status_changed',
        userId,
        userName: user ? `${user.firstName} ${user.lastName}` : undefined,
        oldValue: oldStatus,
        newValue: status,
        details: `تم تغيير الحالة من ${oldStatus} إلى ${status}`,
        timestamp: new Date()
    });

    // Handle completion
    if (status === 'done') {
        task.completedAt = new Date();
        task.completedBy = userId;
        task.progress = 100;

        // Evaluate workflow rules
        await evaluateWorkflowRules(task, 'completion', { userId, userName: user ? `${user.firstName} ${user.lastName}` : '' });
    }

    await task.save();

    // Use req.firmQuery for proper tenant isolation (solo lawyers + firm members)
    const populatedTask = await Task.findOne({ _id: taskId, ...req.firmQuery })
        .populate('assignedTo', 'firstName lastName email image')
        .populate('blockedBy', 'title status');

    res.status(200).json({
        success: true,
        task: populatedTask
    });
});

/**
 * Update task progress manually
 * PATCH /api/tasks/:id/progress
 */
const updateProgress = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.PROGRESS);
    const { progress, autoCalculate } = data;

    // Use req.firmQuery for proper tenant isolation (solo lawyers + firm members)
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery });

    if (!task) {
        throw CustomException('Task not found', 404);
    }

    // Check permission
    const hasAccess = task.assignedTo?.toString() === userId ||
                      task.createdBy.toString() === userId;
    if (!hasAccess) {
        throw CustomException('You do not have permission to update this task', 403);
    }

    // If autoCalculate is true, switch back to automatic progress calculation
    if (autoCalculate === true) {
        task.manualProgress = false;
        // Recalculate from subtasks if any
        if (task.subtasks && task.subtasks.length > 0) {
            const completed = task.subtasks.filter(s => s.completed).length;
            task.progress = Math.round((completed / task.subtasks.length) * 100);
        }
    } else if (progress !== undefined) {
        // Validate progress value
        if (typeof progress !== 'number' || progress < 0 || progress > 100) {
            throw CustomException('Progress must be a number between 0 and 100', 400);
        }

        task.manualProgress = true;
        task.progress = progress;

        // If progress is 100, auto-complete the task
        if (progress === 100 && task.status !== 'done') {
            task.status = 'done';
            task.completedAt = new Date();
            task.completedBy = userId;
        }
    }

    // Add history entry
    task.history.push({
        action: 'updated',
        userId,
        changes: { progress: { from: task.progress, to: progress || task.progress } },
        timestamp: new Date()
    });

    await task.save();

    // Use req.firmQuery for proper tenant isolation (solo lawyers + firm members)
    const populatedTask = await Task.findOne({ _id: taskId, ...req.firmQuery })
        .populate('assignedTo', 'firstName lastName email image')
        .populate('createdBy', 'firstName lastName email image');

    res.status(200).json({
        success: true,
        message: 'Progress updated successfully',
        data: populatedTask
    });
});

// ============================================
// WORKFLOW FUNCTIONS
// ============================================

/**
 * Add workflow rule to task
 * POST /api/tasks/:id/workflow-rules
 */
const addWorkflowRule = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, trigger, conditions, actions } = req.body;

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Use req.firmQuery for proper tenant isolation (solo + firm)
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    if (!name || !trigger || !actions) {
        throw CustomException('name, trigger, and actions are required', 400);
    }

    task.workflowRules.push({
        name,
        trigger,
        conditions: conditions || [],
        actions,
        isActive: true
    });

    await task.save();

    res.status(201).json({
        success: true,
        message: 'تمت إضافة قاعدة سير العمل',
        workflowRules: task.workflowRules
    });
});

/**
 * Update task outcome and trigger workflows
 * PATCH /api/tasks/:id/outcome
 */
const updateOutcome = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { outcome, outcomeNotes } = req.body;
    const userId = req.userID;

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Use req.firmQuery for proper tenant isolation (solo + firm)
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    task.outcome = outcome;
    task.outcomeNotes = outcomeNotes;
    task.outcomeDate = new Date();

    // User lookup by ID is safe (users are global)
    const user = await User.findById(userId).select('firstName lastName');

    task.history.push({
        action: 'updated',
        userId,
        userName: user ? `${user.firstName} ${user.lastName}` : undefined,
        details: `تم تحديد النتيجة: ${outcome}`,
        newValue: outcome,
        timestamp: new Date()
    });

    await task.save();

    // Evaluate workflow rules based on outcome
    await evaluateWorkflowRules(task, 'completion', {
        userId,
        userName: user ? `${user.firstName} ${user.lastName}` : ''
    });

    res.status(200).json({
        success: true,
        message: 'تم تحديث النتيجة',
        task
    });
});

// ============================================
// BUDGET/ESTIMATE FUNCTIONS
// ============================================

/**
 * Update task estimate
 * PATCH /api/tasks/:id/estimate
 */
const updateEstimate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { estimatedMinutes, hourlyRate } = req.body;

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Validate estimatedMinutes - must be non-negative number
    if (estimatedMinutes !== undefined) {
        if (typeof estimatedMinutes !== 'number' || estimatedMinutes < 0) {
            throw CustomException('Estimated minutes must be a non-negative number', 400);
        }
        if (estimatedMinutes > 525600) { // Max 1 year in minutes
            throw CustomException('Estimated minutes cannot exceed 525600 (1 year)', 400);
        }
    }

    // Validate hourlyRate - must be non-negative number
    if (hourlyRate !== undefined) {
        if (typeof hourlyRate !== 'number' || hourlyRate < 0) {
            throw CustomException('Hourly rate must be a non-negative number', 400);
        }
    }

    // Use req.firmQuery for proper tenant isolation (solo lawyers + firm members)
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    if (estimatedMinutes !== undefined) {
        task.timeTracking.estimatedMinutes = estimatedMinutes;
    }

    if (hourlyRate !== undefined) {
        task.budget.hourlyRate = hourlyRate;
    }

    await task.save();

    res.status(200).json({
        success: true,
        task: {
            timeTracking: task.timeTracking,
            budget: task.budget
        }
    });
});

/**
 * Get time tracking summary
 * GET /api/tasks/:id/time-tracking/summary
 */
const getTimeTrackingSummary = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Use req.firmQuery for proper tenant isolation (solo + firm)
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery })
        .populate('timeTracking.sessions.userId', 'firstName lastName');

    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const estimatedMinutes = task.timeTracking?.estimatedMinutes || 0;
    const actualMinutes = task.timeTracking?.actualMinutes || 0;
    const remainingMinutes = Math.max(0, estimatedMinutes - actualMinutes);
    const percentComplete = estimatedMinutes > 0
        ? Math.round((actualMinutes / estimatedMinutes) * 100)
        : 0;

    // Group by user
    const byUser = {};
    if (task.timeTracking?.sessions) {
        for (const session of task.timeTracking.sessions) {
            if (session.endedAt && session.userId) {
                const oderId = session.userId._id?.toString() || session.userId.toString();
                if (!byUser[oderId]) {
                    byUser[oderId] = {
                        userId: oderId,
                        name: session.userId.firstName
                            ? `${session.userId.firstName} ${session.userId.lastName}`
                            : 'Unknown',
                        minutes: 0,
                        cost: 0
                    };
                }
                byUser[oderId].minutes += session.duration || 0;
                byUser[oderId].cost = (byUser[oderId].minutes / 60) * (task.budget?.hourlyRate || 0);
            }
        }
    }

    res.status(200).json({
        estimatedMinutes,
        actualMinutes,
        remainingMinutes,
        percentComplete,
        isOverBudget: actualMinutes > estimatedMinutes,
        sessions: task.timeTracking?.sessions || [],
        budget: {
            estimated: task.budget?.estimatedCost || 0,
            actual: task.budget?.actualCost || 0,
            remaining: Math.max(0, (task.budget?.estimatedCost || 0) - (task.budget?.actualCost || 0)),
            variance: task.budget?.variance || 0,
            variancePercent: task.budget?.variancePercent || 0
        },
        byUser: Object.values(byUser)
    });
});

// ============================================
// ENHANCED SUBTASK FUNCTION
// ============================================

/**
 * Update subtask
 * PATCH /api/tasks/:id/subtasks/:subtaskId
 */
const updateSubtask = asyncHandler(async (req, res) => {
    const { id, subtaskId } = req.params;

    // IDOR protection
    const taskId = sanitizeObjectId(id);
    const sanitizedSubtaskId = sanitizeObjectId(subtaskId);

    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.SUBTASK_UPDATE);
    const { title, completed } = data;

    // Use req.firmQuery for proper tenant isolation (solo lawyers + firm members)
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const subtask = task.subtasks.id(sanitizedSubtaskId);
    if (!subtask) {
        throw CustomException('Subtask not found', 404);
    }

    if (title !== undefined) {
        subtask.title = title;
    }

    if (completed !== undefined) {
        subtask.completed = completed;
        subtask.completedAt = completed ? new Date() : null;
    }

    await task.save();

    res.status(200).json({
        success: true,
        task
    });
});

// ============================================
// ATTACHMENT DOWNLOAD FUNCTIONS - MOVED TO:
// - taskAttachment.controller.js (getAttachmentDownloadUrl, getAttachmentVersions)
// ============================================

// ============================================
// DOCUMENT & VOICE FUNCTIONS - MOVED TO:
// - taskDocument.controller.js
// - taskVoice.controller.js
// ============================================

/**
 * Get task with all related data (GOLD STANDARD - single API call)
 * GET /api/tasks/:id/full
 * Replaces 3-4 separate API calls with 1 parallel query
 */
const getTaskFull = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Use req.firmQuery for proper tenant isolation (solo + firm)
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery })
        .populate('assignedTo', 'username firstName lastName image email')
        .populate('createdBy', 'username firstName lastName image email')
        .populate('caseId', 'title caseNumber category')
        .populate('clientId', 'firstName lastName email phone')
        .populate('attachments.uploadedBy', 'firstName lastName')
        .populate('attachments.lastEditedBy', 'firstName lastName')
        .populate('timeTracking.sessions.userId', 'firstName lastName');

    if (!task) {
        throw CustomException('Task not found', 404);
    }

    // Calculate time tracking summary
    const estimatedMinutes = task.timeTracking?.estimatedMinutes || 0;
    const actualMinutes = task.timeTracking?.actualMinutes || 0;
    const sessions = task.timeTracking?.sessions || [];

    // Calculate time by user
    const timeByUser = {};
    for (const session of sessions) {
        if (session.endedAt && session.userId) {
            const oderId = session.userId._id?.toString() || session.userId.toString();
            if (!timeByUser[oderId]) {
                timeByUser[oderId] = {
                    userId: oderId,
                    name: session.userId.firstName
                        ? `${session.userId.firstName} ${session.userId.lastName}`
                        : 'Unknown',
                    minutes: 0
                };
            }
            timeByUser[oderId].minutes += session.duration || 0;
        }
    }

    // Get related tasks (subtasks and blocked tasks)
    const relatedTaskIds = [
        ...(task.subtasks?.map(s => s._id) || []),
        ...(task.blockedBy || []),
        ...(task.blocking || [])
    ];

    // Build response with all data
    const fullTask = {
        ...task.toObject(),
        timeTrackingSummary: {
            estimatedMinutes,
            actualMinutes,
            remainingMinutes: Math.max(0, estimatedMinutes - actualMinutes),
            percentComplete: estimatedMinutes > 0 ? Math.min(100, Math.round((actualMinutes / estimatedMinutes) * 100)) : 0,
            isOvertime: actualMinutes > estimatedMinutes,
            overtimeMinutes: Math.max(0, actualMinutes - estimatedMinutes),
            timeByUser: Object.values(timeByUser),
            sessionsCount: sessions.length,
            billableSessions: sessions.filter(s => s.isBillable).length
        },
        attachmentsSummary: {
            total: task.attachments?.length || 0,
            documents: task.attachments?.filter(a => a.isEditable).length || 0,
            voiceMemos: task.attachments?.filter(a => a.isVoiceMemo).length || 0,
            files: task.attachments?.filter(a => !a.isEditable && !a.isVoiceMemo).length || 0
        },
        commentCount: task.comments?.length || 0,
        historyCount: task.history?.length || 0
    };

    res.status(200).json({
        success: true,
        task: fullTask
    });
});

/**
 * Get tasks overview with aggregated data
 * GET /api/tasks/overview
 */
const getTasksOverview = asyncHandler(async (req, res) => {
    // Build base query with tenant isolation from middleware
    const baseQuery = { isDeleted: { $ne: true }, ...req.firmQuery };

    // Get counts by status
    const statusCounts = await Task.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const byStatus = {};
    statusCounts.forEach(s => {
        byStatus[s._id] = s.count;
    });

    // Get counts by priority
    const priorityCounts = await Task.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    const byPriority = {};
    priorityCounts.forEach(p => {
        byPriority[p._id] = p.count;
    });

    // Get overdue count
    const now = new Date();
    const overdueCount = await Task.countDocuments({
        ...baseQuery,
        dueDate: { $lt: now },
        status: { $nin: ['done', 'canceled'] }
    });

    // Get due today count
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const dueTodayCount = await Task.countDocuments({
        ...baseQuery,
        dueDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $nin: ['done', 'canceled'] }
    });

    // Get upcoming tasks (next 7 days)
    const next7Days = new Date(now);
    next7Days.setDate(next7Days.getDate() + 7);

    const upcomingTasks = await Task.find({
        ...baseQuery,
        dueDate: { $gte: now, $lte: next7Days },
        status: { $nin: ['done', 'canceled'] }
    })
        .select('title dueDate dueTime priority status assignedTo')
        .populate('assignedTo', 'firstName lastName image')
        .sort({ dueDate: 1 })
        .limit(10)
        .lean();

    res.status(200).json({
        success: true,
        overview: {
            total: Object.values(byStatus).reduce((a, b) => a + b, 0),
            overdue: overdueCount,
            dueToday: dueTodayCount,
            byStatus: {
                todo: byStatus.todo || 0,
                pending: byStatus.pending || 0,
                in_progress: byStatus.in_progress || 0,
                done: byStatus.done || 0,
                canceled: byStatus.canceled || 0
            },
            byPriority: {
                urgent: byPriority.urgent || 0,
                high: byPriority.high || 0,
                medium: byPriority.medium || 0,
                low: byPriority.low || 0
            },
            upcoming: upcomingTasks
        }
    });
});

// =============================================================================
// TEMPLATE & ATTACHMENT FUNCTIONS - MOVED TO:
// - taskTemplate.controller.js (getTemplates, getTemplate, createTemplate, etc.)
// - taskAttachment.controller.js (addAttachment, deleteAttachment, etc.)
// =============================================================================

// =============================================================================
// NEW MISSING ENDPOINTS (Gold Standard Implementation)
// =============================================================================

/**
 * Get all active timers across tasks
 * GET /api/tasks/timers/active
 */
const getActiveTimers = asyncHandler(async (req, res) => {
    // Use req.firmQuery for proper tenant isolation (solo + firm)
    const tasks = await Task.find({
        ...req.firmQuery,
        'timeTracking.isTracking': true
    })
        .select('title timeTracking.currentSessionStart timeTracking.sessions assignedTo caseId')
        .populate('assignedTo', 'firstName lastName image')
        .populate('caseId', 'title caseNumber')
        .lean();

    // Calculate elapsed time for each active timer
    const now = new Date();
    const activeTimers = tasks.map(task => {
        const activeSession = task.timeTracking?.sessions?.find(s => !s.endedAt);
        const startTime = task.timeTracking?.currentSessionStart || activeSession?.startedAt;
        const elapsedMinutes = startTime
            ? Math.round((now - new Date(startTime)) / 60000)
            : 0;

        return {
            taskId: task._id,
            title: task.title,
            startedAt: startTime,
            elapsedMinutes,
            assignedTo: task.assignedTo,
            caseId: task.caseId,
            isPaused: task.timeTracking?.isPaused || false,
            pausedMinutes: task.timeTracking?.pausedMinutes || 0
        };
    });

    res.status(200).json({
        success: true,
        data: activeTimers,
        count: activeTimers.length
    });
});

/**
 * Pause a running timer
 * PATCH /api/tasks/:id/timer/pause
 */
const pauseTimer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.TIMER_PAUSE);
    const { reason } = data;

    // Use req.firmQuery for proper tenant isolation
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    if (!task.timeTracking.isTracking) {
        throw CustomException('No active timer to pause', 400);
    }

    if (task.timeTracking.isPaused) {
        throw CustomException('Timer is already paused', 400);
    }

    const now = new Date();
    const startTime = task.timeTracking.currentSessionStart;

    // Calculate elapsed time before pause
    const elapsedBeforePause = Math.round((now - new Date(startTime)) / 60000);

    // Mark as paused
    task.timeTracking.isPaused = true;
    task.timeTracking.pausedAt = now;
    task.timeTracking.elapsedBeforePause = (task.timeTracking.elapsedBeforePause || 0) + elapsedBeforePause;

    // Add to active session
    const activeSession = task.timeTracking.sessions.find(s => !s.endedAt);
    if (activeSession) {
        activeSession.pausedAt = now;
        activeSession.pauseReason = reason;
    }

    task.history.push({
        action: 'timer_paused',
        userId,
        changes: { reason, elapsedMinutes: elapsedBeforePause },
        timestamp: now
    });

    await task.save();

    res.status(200).json({
        success: true,
        message: 'Timer paused',
        data: {
            isPaused: true,
            pausedAt: now,
            elapsedMinutes: task.timeTracking.elapsedBeforePause
        }
    });
});

/**
 * Resume a paused timer
 * PATCH /api/tasks/:id/timer/resume
 */
const resumeTimer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.TIMER_RESUME);
    const { notes } = data;

    // Use req.firmQuery for proper tenant isolation
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    if (!task.timeTracking.isTracking) {
        throw CustomException('No active timer to resume', 400);
    }

    if (!task.timeTracking.isPaused) {
        throw CustomException('Timer is not paused', 400);
    }

    const now = new Date();
    const pausedAt = task.timeTracking.pausedAt;
    const pauseDuration = pausedAt ? Math.round((now - new Date(pausedAt)) / 60000) : 0;

    // Update pause tracking
    task.timeTracking.isPaused = false;
    task.timeTracking.pausedAt = null;
    task.timeTracking.pausedMinutes = (task.timeTracking.pausedMinutes || 0) + pauseDuration;
    task.timeTracking.currentSessionStart = now; // Reset session start for accurate tracking

    // Update active session
    const activeSession = task.timeTracking.sessions.find(s => !s.endedAt);
    if (activeSession) {
        activeSession.resumedAt = now;
        activeSession.totalPausedMinutes = (activeSession.totalPausedMinutes || 0) + pauseDuration;
        if (notes) {
            activeSession.notes = (activeSession.notes ? activeSession.notes + '\n' : '') + notes;
        }
    }

    task.history.push({
        action: 'timer_resumed',
        userId,
        changes: { pauseDuration },
        timestamp: now
    });

    await task.save();

    res.status(200).json({
        success: true,
        message: 'Timer resumed',
        data: {
            isPaused: false,
            resumedAt: now,
            pauseDurationMinutes: pauseDuration,
            totalPausedMinutes: task.timeTracking.pausedMinutes
        }
    });
});

/**
 * Clone a task
 * POST /api/tasks/:id/clone
 */
const cloneTask = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('لم يعد لديك صلاحية إنشاء مهام جديدة', 403);
    }

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.CLONE);
    const {
        title: newTitle,
        resetDueDate = true,
        includeSubtasks = true,
        includeChecklists = true,
        includeAttachments = false
    } = data;

    // Use req.firmQuery for proper tenant isolation
    const originalTask = await Task.findOne({ _id: taskId, ...req.firmQuery });
    if (!originalTask) {
        throw CustomException('Task not found', 404);
    }

    // Prepare clone data
    const cloneData = {
        title: newTitle || `${originalTask.title} (Copy)`,
        description: originalTask.description,
        priority: originalTask.priority,
        label: originalTask.label,
        tags: [...(originalTask.tags || [])],
        status: 'todo', // Always reset to todo
        progress: 0,    // Always reset progress
        assignedTo: originalTask.assignedTo,
        caseId: originalTask.caseId,
        clientId: originalTask.clientId,
        notes: originalTask.notes,
        points: originalTask.points,
        createdBy: userId,
        // Reset time tracking
        timeTracking: {
            estimatedMinutes: originalTask.timeTracking?.estimatedMinutes || 0,
            actualMinutes: 0,
            sessions: [],
            isTracking: false
        },
        // Handle subtasks
        subtasks: includeSubtasks
            ? originalTask.subtasks.map(s => ({ title: s.title, completed: false, autoReset: s.autoReset }))
            : [],
        // Handle checklists
        checklists: includeChecklists
            ? originalTask.checklists.map(c => ({
                title: c.title,
                items: c.items?.map(i => ({ text: i.text, completed: false })) || []
            }))
            : [],
        // Copy reminders
        reminders: originalTask.reminders?.map(r => ({
            ...r.toObject(),
            _id: undefined,
            sent: false,
            sentAt: null
        })) || [],
        // Copy recurring settings if any
        recurring: originalTask.recurring?.enabled ? { ...originalTask.recurring.toObject(), occurrencesCompleted: 0 } : undefined,
        // Empty history for clone
        history: [{
            action: 'cloned',
            userId,
            changes: { clonedFrom: originalTask._id },
            timestamp: new Date()
        }],
        // Empty comments
        comments: []
    };

    // Handle due date
    if (!resetDueDate && originalTask.dueDate) {
        cloneData.dueDate = originalTask.dueDate;
        cloneData.dueTime = originalTask.dueTime;
    }

    // Copy attachments if requested (metadata only, not files)
    if (includeAttachments && originalTask.attachments?.length > 0) {
        cloneData.attachments = originalTask.attachments
            .filter(a => !a.isVoiceMemo) // Exclude voice memos
            .map(a => ({
                fileName: a.fileName,
                originalName: a.originalName,
                mimeType: a.mimeType,
                size: a.size,
                uploadedBy: userId,
                uploadedAt: new Date(),
                // Note: S3 file URL is shared, actual file not duplicated
                url: a.url,
                isCloned: true
            }));
    }

    // Use req.addFirmId for proper tenant isolation
    const clonedTask = await Task.create(req.addFirmId(cloneData));

    // Populate for response
    const populatedTask = await Task.findOne({ _id: clonedTask._id, ...req.firmQuery })
        .populate('assignedTo', 'firstName lastName email image')
        .populate('createdBy', 'firstName lastName email image')
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'firstName lastName');

    res.status(201).json({
        success: true,
        message: 'Task cloned successfully',
        data: populatedTask,
        clonedFrom: originalTask._id
    });
});

/**
 * Get task activity/history
 * GET /api/tasks/:id/activity
 */
const getTaskActivity = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Use req.firmQuery for proper tenant isolation
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery })
        .select('history title')
        .lean();

    if (!task) {
        throw CustomException('Task not found', 404);
    }

    // Get history entries with pagination
    const history = task.history || [];
    const total = history.length;
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const paginatedHistory = history
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(startIndex, startIndex + parseInt(limit));

    // Populate user info for each history entry
    const userIds = [...new Set(paginatedHistory.map(h => h.userId).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } }).select('firstName lastName image').lean();
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    const enrichedHistory = paginatedHistory.map(h => ({
        ...h,
        user: h.userId ? userMap[h.userId.toString()] : null
    }));

    res.status(200).json({
        success: true,
        data: enrichedHistory,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get tasks by client
 * GET /api/tasks/client/:clientId
 */
const getTasksByClient = asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    const { page = 1, limit = 50, status, priority } = req.query;

    // IDOR protection
    const sanitizedClientId = sanitizeObjectId(clientId);

    // Build query with tenant isolation
    const query = {
        clientId: sanitizedClientId,
        ...req.firmQuery
    };

    if (status) query.status = status;
    if (priority) query.priority = priority;

    const tasks = await Task.find(query)
        .populate('assignedTo', 'firstName lastName image')
        .populate('createdBy', 'firstName lastName')
        .populate('caseId', 'title caseNumber')
        .sort({ dueDate: 1, priority: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean();

    const total = await Task.countDocuments(query);

    res.status(200).json({
        success: true,
        data: tasks,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Convert task to event
 * POST /api/tasks/:id/convert-to-event
 */
const convertTaskToEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.CONVERT_TO_EVENT);
    const { eventType = 'task', duration = 60, attendees = [], location } = data;

    // Use req.firmQuery for proper tenant isolation
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    // Determine start date/time
    let startDateTime;
    if (task.dueDate) {
        startDateTime = new Date(task.dueDate);
        if (task.dueTime) {
            const [hours, minutes] = task.dueTime.split(':');
            startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
    } else {
        // Default to tomorrow 9am if no due date
        startDateTime = new Date();
        startDateTime.setDate(startDateTime.getDate() + 1);
        startDateTime.setHours(9, 0, 0, 0);
    }

    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

    // Create event using req.addFirmId
    const event = await Event.create(req.addFirmId({
        title: task.title,
        type: eventType,
        description: task.description,
        startDateTime,
        endDateTime,
        allDay: !task.dueTime,
        taskId: task._id,
        caseId: task.caseId,
        clientId: task.clientId,
        organizer: userId,
        createdBy: userId,
        attendees: [
            { userId: task.assignedTo || userId, status: 'confirmed', role: 'required' },
            ...attendees.map(a => ({ userId: sanitizeObjectId(a), status: 'invited', role: 'optional' }))
        ],
        priority: task.priority,
        location: location || {},
        color: '#10b981',
        tags: task.tags,
        notes: task.notes
    }));

    // Link event to task
    task.linkedEventId = event._id;
    task.history.push({
        action: 'converted_to_event',
        userId,
        changes: { eventId: event._id },
        timestamp: new Date()
    });
    await task.save();

    // Populate for response
    const populatedEvent = await Event.findOne({ _id: event._id, ...req.firmQuery })
        .populate('organizer', 'firstName lastName image')
        .populate('attendees.userId', 'firstName lastName email');

    res.status(201).json({
        success: true,
        message: 'Task converted to event',
        data: {
            event: populatedEvent,
            task: {
                _id: task._id,
                title: task.title,
                linkedEventId: task.linkedEventId
            }
        }
    });
});

/**
 * Advanced task search
 * GET /api/tasks/search
 */
const searchTasks = asyncHandler(async (req, res) => {
    const {
        q,           // Search query
        status,
        priority,
        assignedTo,
        caseId,
        clientId,
        startDate,
        endDate,
        overdue,
        hasAttachments,
        hasComments,
        page = 1,
        limit = 50,
        sortBy = 'relevance',
        sortOrder = 'desc'
    } = req.query;

    // Build query with tenant isolation
    const query = { ...req.firmQuery };

    // Text search - escape regex for security
    if (q && q.trim()) {
        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(escapeRegex(q.trim()), 'i');
        query.$or = [
            { title: searchRegex },
            { description: searchRegex },
            { notes: searchRegex },
            { tags: searchRegex }
        ];
    }

    // Filters
    if (status) {
        query.status = Array.isArray(status) ? { $in: status } : status;
    }
    if (priority) {
        query.priority = Array.isArray(priority) ? { $in: priority } : priority;
    }
    if (assignedTo) {
        query.assignedTo = sanitizeObjectId(assignedTo);
    }
    if (caseId) {
        query.caseId = sanitizeObjectId(caseId);
    }
    if (clientId) {
        query.clientId = sanitizeObjectId(clientId);
    }

    // Date range
    if (startDate || endDate) {
        query.dueDate = {};
        if (startDate) query.dueDate.$gte = new Date(startDate);
        if (endDate) query.dueDate.$lte = new Date(endDate);
    }

    // Overdue filter
    if (overdue === 'true') {
        query.dueDate = { ...(query.dueDate || {}), $lt: new Date() };
        query.status = { $nin: ['done', 'canceled'] };
    }

    // Has attachments
    if (hasAttachments === 'true') {
        query['attachments.0'] = { $exists: true };
    }

    // Has comments
    if (hasComments === 'true') {
        query['comments.0'] = { $exists: true };
    }

    // Build sort - use updatedAt for relevance since we use regex (not $text index)
    let sortOptions = {};
    const effectiveSortBy = sortBy === 'relevance' ? 'updatedAt' : sortBy;
    sortOptions[effectiveSortBy] = sortOrder === 'desc' ? -1 : 1;

    const tasks = await Task.find(query)
        .populate('assignedTo', 'firstName lastName image')
        .populate('createdBy', 'firstName lastName')
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'firstName lastName')
        .sort(sortOptions)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean();

    const total = await Task.countDocuments(query);

    res.status(200).json({
        success: true,
        data: tasks,
        query: q,
        filters: { status, priority, assignedTo, caseId, clientId, startDate, endDate, overdue },
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Bulk create tasks
 * POST /api/tasks/bulk
 * Gold Standard: Netflix pattern - max 50 items, per-item error handling
 */
const bulkCreateTasks = asyncHandler(async (req, res) => {
    const userId = req.userID;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('لم يعد لديك صلاحية إنشاء مهام جديدة', 403);
    }

    // Mass assignment protection
    const safeData = pickAllowedFields(req.body, ['tasks']);
    const { tasks } = safeData;

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
        throw CustomException('Tasks array is required', 400);
    }

    if (tasks.length > 50) {
        throw CustomException('Maximum 50 tasks can be created at once', 400);
    }

    const createdTasks = [];
    const errors = [];

    for (let i = 0; i < tasks.length; i++) {
        try {
            // Mass assignment protection per task
            const taskData = pickAllowedFields(tasks[i], ALLOWED_FIELDS.CREATE);

            // Validate required field
            if (!taskData.title || typeof taskData.title !== 'string' || taskData.title.trim().length === 0) {
                throw new Error('Task title is required');
            }

            // Validate enums
            if (taskData.priority && !VALID_PRIORITIES.includes(taskData.priority)) {
                throw new Error('Invalid priority value');
            }
            if (taskData.status && !VALID_STATUSES.includes(taskData.status)) {
                throw new Error('Invalid status value');
            }

            // Sanitize input
            const sanitizedTitle = stripHtml(taskData.title);
            const sanitizedDescription = taskData.description ? sanitizeRichText(taskData.description) : '';
            const sanitizedNotes = taskData.notes ? sanitizeRichText(taskData.notes) : '';

            // Dangerous content check
            if (hasDangerousContent(taskData.description) || hasDangerousContent(taskData.notes)) {
                throw new Error('Invalid content detected');
            }

            // IDOR protection - sanitize IDs
            const sanitizedAssignedTo = taskData.assignedTo ? sanitizeObjectId(taskData.assignedTo) : null;
            const sanitizedCaseId = taskData.caseId ? sanitizeObjectId(taskData.caseId) : null;
            const sanitizedClientId = taskData.clientId ? sanitizeObjectId(taskData.clientId) : null;

            // Validate case access if provided
            if (sanitizedCaseId) {
                const caseDoc = await Case.findOne({ _id: sanitizedCaseId, ...req.firmQuery });
                if (!caseDoc) {
                    throw new Error('Case not found or access denied');
                }
            }

            // Validate assignedTo if provided (User lookups are safe per CLAUDE.md)
            if (sanitizedAssignedTo) {
                const assignedUser = await User.findById(sanitizedAssignedTo);
                if (!assignedUser) {
                    throw new Error('Assigned user not found');
                }
            }

            // Use req.addFirmId() for proper tenant isolation
            const task = await Task.create(req.addFirmId({
                title: sanitizedTitle,
                description: sanitizedDescription,
                priority: taskData.priority || 'medium',
                status: taskData.status || 'todo',
                label: taskData.label,
                tags: taskData.tags,
                dueDate: taskData.dueDate,
                dueTime: taskData.dueTime,
                startDate: taskData.startDate,
                assignedTo: sanitizedAssignedTo || userId,
                createdBy: userId,
                caseId: sanitizedCaseId,
                clientId: sanitizedClientId,
                subtasks: taskData.subtasks || [],
                checklists: taskData.checklists || [],
                timeTracking: taskData.timeTracking || { estimatedMinutes: 0, actualMinutes: 0, sessions: [] },
                recurring: taskData.recurring,
                reminders: taskData.reminders || [],
                notes: sanitizedNotes,
                points: taskData.points || 0
            }));

            createdTasks.push(task);
        } catch (error) {
            errors.push({
                index: i,
                title: tasks[i].title,
                error: error.message
            });
        }
    }

    res.status(201).json({
        success: true,
        message: `${createdTasks.length} task(s) created successfully`,
        data: {
            created: createdTasks.length,
            failed: errors.length,
            tasks: createdTasks,
            errors: errors.length > 0 ? errors : undefined
        }
    });
});

/**
 * Reschedule task with reason
 * POST /api/tasks/:id/reschedule
 * Gold Standard: Same pattern as rescheduleReminder/rescheduleEvent
 */
const rescheduleTask = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    // IDOR protection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid task ID format', 400);
    }

    // Mass assignment protection
    const safeData = pickAllowedFields(req.body, ['newDueDate', 'newDueTime', 'reason']);
    const { newDueDate, newDueTime, reason } = safeData;

    if (!newDueDate) {
        throw CustomException('newDueDate is required', 400);
    }

    const parsedDate = new Date(newDueDate);
    if (isNaN(parsedDate.getTime())) {
        throw CustomException('Invalid newDueDate format', 400);
    }

    // Use req.firmQuery for proper tenant isolation
    const task = await Task.findOne({ _id: sanitizedId, ...req.firmQuery });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    // Store previous date for history
    const previousDueDate = task.dueDate;
    const previousDueTime = task.dueTime;

    // Update task
    task.dueDate = parsedDate;
    if (newDueTime) {
        task.dueTime = newDueTime;
    }

    // Track reschedule in history (use 'updated' action which is valid enum)
    if (!task.history) {
        task.history = [];
    }
    task.history.push({
        action: 'updated',
        userId,
        timestamp: new Date(),
        changes: {
            dueDate: { from: previousDueDate, to: parsedDate },
            dueTime: newDueTime ? { from: previousDueTime, to: newDueTime } : undefined,
            rescheduleReason: reason
        }
    });

    await task.save();

    await task.populate([
        { path: 'assignedTo', select: 'firstName lastName image' },
        { path: 'caseId', select: 'title caseNumber' },
        { path: 'clientId', select: 'firstName lastName' }
    ]);

    res.status(200).json({
        success: true,
        message: 'Task rescheduled successfully',
        data: task,
        previousDueDate,
        previousDueTime
    });
});

/**
 * Get task conflicts (overlapping due dates for same assignee)
 * GET /api/tasks/conflicts
 * Gold Standard: Same pattern as getConflicts for events
 */
const getTaskConflicts = asyncHandler(async (req, res) => {
    const { userIds, dueDate, dueDateStart, dueDateEnd } = req.query;

    // Parse userIds
    const userIdArray = userIds ? (Array.isArray(userIds) ? userIds : userIds.split(',')) : [req.userID];

    // Validate users belong to same tenant
    if (userIdArray.length > 0) {
        const validUsers = await User.countDocuments({
            _id: { $in: userIdArray },
            ...req.firmQuery
        });
        if (validUsers !== userIdArray.length) {
            throw CustomException('Cannot check conflicts for users outside your organization', 403);
        }
    }

    // Build query with tenant isolation
    const query = {
        ...req.firmQuery,
        assignedTo: { $in: userIdArray },
        status: { $nin: ['done', 'canceled'] }
    };

    // Date filter
    if (dueDate) {
        const date = new Date(dueDate);
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        query.dueDate = { $gte: startOfDay, $lte: endOfDay };
    } else if (dueDateStart || dueDateEnd) {
        query.dueDate = {};
        if (dueDateStart) query.dueDate.$gte = new Date(dueDateStart);
        if (dueDateEnd) query.dueDate.$lte = new Date(dueDateEnd);
    }

    const tasks = await Task.find(query)
        .populate('assignedTo', 'firstName lastName image')
        .populate('caseId', 'title caseNumber')
        .sort({ dueDate: 1, priority: -1 })
        .lean();

    // Group by assignee and date to find conflicts
    const conflictsByUser = {};
    userIdArray.forEach(uid => { conflictsByUser[uid] = []; });

    tasks.forEach(task => {
        const assigneeId = task.assignedTo?._id?.toString();
        if (assigneeId && conflictsByUser[assigneeId]) {
            conflictsByUser[assigneeId].push(task);
        }
    });

    // Find dates with multiple high-priority tasks
    const overloadedDates = {};
    Object.entries(conflictsByUser).forEach(([uid, userTasks]) => {
        const byDate = {};
        userTasks.forEach(t => {
            if (t.dueDate) {
                const dateKey = t.dueDate.toISOString().split('T')[0];
                if (!byDate[dateKey]) byDate[dateKey] = [];
                byDate[dateKey].push(t);
            }
        });
        Object.entries(byDate).forEach(([date, dateTasks]) => {
            if (dateTasks.length > 3 || dateTasks.filter(t => t.priority === 'critical' || t.priority === 'high').length > 2) {
                if (!overloadedDates[date]) overloadedDates[date] = {};
                overloadedDates[date][uid] = dateTasks;
            }
        });
    });

    res.status(200).json({
        success: true,
        data: {
            hasConflicts: Object.keys(overloadedDates).length > 0,
            totalTasks: tasks.length,
            tasksByUser: conflictsByUser,
            overloadedDates,
            filters: { userIds: userIdArray, dueDate, dueDateStart, dueDateEnd }
        }
    });
});

// =============================================================================
// NEW: BULK OPERATIONS (Gold Standard - AWS/Google/Microsoft pattern)
// =============================================================================

/**
 * Bulk Complete Tasks
 * POST /api/tasks/bulk/complete
 *
 * Gold Standard: AWS batch operations pattern - atomic, with partial failure reporting
 */
const bulkCompleteTasks = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.BULK_COMPLETE);
    const { taskIds, completionNote } = data;

    // Input validation
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        throw CustomException('Task IDs are required', 400);
    }

    if (taskIds.length > 100) {
        throw CustomException('Cannot complete more than 100 tasks at once', 400);
    }

    const userId = req.userID;

    // IDOR protection - sanitize all task IDs
    const sanitizedTaskIds = taskIds.map(id => sanitizeObjectId(id));

    // Use req.firmQuery for proper tenant isolation
    const accessQuery = { _id: { $in: sanitizedTaskIds }, ...req.firmQuery };

    const tasks = await Task.find(accessQuery).select('_id status');
    const foundTaskIds = tasks.map(t => t._id.toString());

    // Find which IDs failed authorization
    const failedIds = sanitizedTaskIds.filter(id => !foundTaskIds.includes(id.toString()));

    if (failedIds.length > 0 && foundTaskIds.length === 0) {
        return res.status(403).json({
            success: false,
            message: 'No tasks accessible',
            failedCount: failedIds.length
        });
    }

    // Complete all accessible tasks
    const now = new Date();
    const updateResult = await Task.updateMany(
        { _id: { $in: foundTaskIds }, ...req.firmQuery },
        {
            $set: {
                status: 'done',
                completedAt: now,
                completedBy: userId,
                progress: 100
            },
            $push: {
                history: {
                    action: 'completed',
                    userId,
                    changes: { status: { from: 'various', to: 'done' } },
                    details: completionNote || 'Bulk completed',
                    timestamp: now
                }
            }
        }
    );

    res.status(200).json({
        success: true,
        message: `${updateResult.modifiedCount} task(s) completed successfully`,
        data: {
            completed: updateResult.modifiedCount,
            failed: failedIds.length,
            failedIds: failedIds.length > 0 ? failedIds : undefined
        }
    });
});

/**
 * Bulk Assign Tasks
 * POST /api/tasks/bulk/assign
 *
 * Gold Standard: Microsoft Planner / Asana pattern - reassign multiple tasks
 */
const bulkAssignTasks = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.BULK_ASSIGN);
    const { taskIds, assignedTo } = data;

    // Input validation
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        throw CustomException('Task IDs are required', 400);
    }

    if (!assignedTo) {
        throw CustomException('Assignee is required', 400);
    }

    if (taskIds.length > 100) {
        throw CustomException('Cannot assign more than 100 tasks at once', 400);
    }

    const userId = req.userID;

    // IDOR protection - sanitize all IDs
    const sanitizedTaskIds = taskIds.map(id => sanitizeObjectId(id));
    const sanitizedAssignedTo = sanitizeObjectId(assignedTo);

    // Validate assignee exists (User lookups by ID are safe per CLAUDE.md)
    const assignedUser = await User.findById(sanitizedAssignedTo).select('firstName lastName email');
    if (!assignedUser) {
        throw CustomException('Assigned user not found', 404);
    }

    // Use req.firmQuery for proper tenant isolation
    const accessQuery = { _id: { $in: sanitizedTaskIds }, ...req.firmQuery };

    const tasks = await Task.find(accessQuery).select('_id assignedTo');
    const foundTaskIds = tasks.map(t => t._id.toString());

    // Find which IDs failed authorization
    const failedIds = sanitizedTaskIds.filter(id => !foundTaskIds.includes(id.toString()));

    if (failedIds.length > 0 && foundTaskIds.length === 0) {
        return res.status(403).json({
            success: false,
            message: 'No tasks accessible',
            failedCount: failedIds.length
        });
    }

    // Assign all accessible tasks
    const now = new Date();
    const updateResult = await Task.updateMany(
        { _id: { $in: foundTaskIds }, ...req.firmQuery },
        {
            $set: { assignedTo: sanitizedAssignedTo },
            $push: {
                history: {
                    action: 'assigned',
                    userId,
                    changes: { assignedTo: { to: sanitizedAssignedTo } },
                    details: `Bulk assigned to ${assignedUser.firstName} ${assignedUser.lastName}`,
                    timestamp: now
                }
            }
        }
    );

    res.status(200).json({
        success: true,
        message: `${updateResult.modifiedCount} task(s) assigned successfully`,
        data: {
            assigned: updateResult.modifiedCount,
            assignedTo: {
                _id: assignedUser._id,
                firstName: assignedUser.firstName,
                lastName: assignedUser.lastName,
                email: assignedUser.email
            },
            failed: failedIds.length,
            failedIds: failedIds.length > 0 ? failedIds : undefined
        }
    });
});

/**
 * Bulk Archive Tasks
 * POST /api/tasks/bulk/archive
 *
 * Gold Standard: SAP/Salesforce soft-delete pattern - never lose data
 */
const bulkArchiveTasks = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.BULK_ARCHIVE);
    const { taskIds } = data;

    // Input validation
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        throw CustomException('Task IDs are required', 400);
    }

    if (taskIds.length > 100) {
        throw CustomException('Cannot archive more than 100 tasks at once', 400);
    }

    const userId = req.userID;

    // IDOR protection - sanitize all task IDs
    const sanitizedTaskIds = taskIds.map(id => sanitizeObjectId(id));

    // Use req.firmQuery for proper tenant isolation
    const accessQuery = {
        _id: { $in: sanitizedTaskIds },
        ...req.firmQuery,
        isArchived: { $ne: true } // Only archive non-archived tasks
    };

    const tasks = await Task.find(accessQuery).select('_id');
    const foundTaskIds = tasks.map(t => t._id.toString());

    // Find which IDs failed authorization or already archived
    const failedIds = sanitizedTaskIds.filter(id => !foundTaskIds.includes(id.toString()));

    if (foundTaskIds.length === 0) {
        return res.status(200).json({
            success: true,
            message: 'No tasks to archive (already archived or not accessible)',
            data: { archived: 0, failed: failedIds.length }
        });
    }

    // Archive all accessible tasks
    const now = new Date();
    const updateResult = await Task.updateMany(
        { _id: { $in: foundTaskIds }, ...req.firmQuery },
        {
            $set: {
                isArchived: true,
                archivedAt: now,
                archivedBy: userId
            },
            $push: {
                history: {
                    action: 'archived',
                    userId,
                    details: 'Bulk archived',
                    timestamp: now
                }
            }
        }
    );

    res.status(200).json({
        success: true,
        message: `${updateResult.modifiedCount} task(s) archived successfully`,
        data: {
            archived: updateResult.modifiedCount,
            failed: failedIds.length,
            failedIds: failedIds.length > 0 ? failedIds : undefined
        }
    });
});

/**
 * Bulk Unarchive Tasks
 * POST /api/tasks/bulk/unarchive
 *
 * Gold Standard: Restore archived items
 */
const bulkUnarchiveTasks = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.BULK_UNARCHIVE);
    const { taskIds } = data;

    // Input validation
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        throw CustomException('Task IDs are required', 400);
    }

    if (taskIds.length > 100) {
        throw CustomException('Cannot unarchive more than 100 tasks at once', 400);
    }

    const userId = req.userID;

    // IDOR protection - sanitize all task IDs
    const sanitizedTaskIds = taskIds.map(id => sanitizeObjectId(id));

    // Use req.firmQuery for proper tenant isolation
    const accessQuery = {
        _id: { $in: sanitizedTaskIds },
        ...req.firmQuery,
        isArchived: true // Only unarchive archived tasks
    };

    const tasks = await Task.find(accessQuery).select('_id');
    const foundTaskIds = tasks.map(t => t._id.toString());

    if (foundTaskIds.length === 0) {
        return res.status(200).json({
            success: true,
            message: 'No tasks to unarchive (not archived or not accessible)',
            data: { unarchived: 0, failed: sanitizedTaskIds.length }
        });
    }

    // Unarchive all accessible tasks
    const now = new Date();
    const updateResult = await Task.updateMany(
        { _id: { $in: foundTaskIds }, ...req.firmQuery },
        {
            $set: {
                isArchived: false,
                archivedAt: null,
                archivedBy: null
            },
            $push: {
                history: {
                    action: 'unarchived',
                    userId,
                    details: 'Bulk unarchived',
                    timestamp: now
                }
            }
        }
    );

    res.status(200).json({
        success: true,
        message: `${updateResult.modifiedCount} task(s) unarchived successfully`,
        data: {
            unarchived: updateResult.modifiedCount,
            failed: sanitizedTaskIds.length - foundTaskIds.length
        }
    });
});

/**
 * Archive Single Task
 * POST /api/tasks/:id/archive
 */
const archiveTask = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Use req.firmQuery for proper tenant isolation
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    if (task.isArchived) {
        return res.status(200).json({
            success: true,
            message: 'Task is already archived',
            data: task
        });
    }

    // Archive the task
    task.isArchived = true;
    task.archivedAt = new Date();
    task.archivedBy = userId;
    task.history.push({
        action: 'archived',
        userId,
        timestamp: new Date()
    });

    await task.save();

    res.status(200).json({
        success: true,
        message: 'Task archived successfully',
        data: task
    });
});

/**
 * Unarchive Single Task
 * POST /api/tasks/:id/unarchive
 */
const unarchiveTask = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Use req.firmQuery for proper tenant isolation
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    if (!task.isArchived) {
        return res.status(200).json({
            success: true,
            message: 'Task is not archived',
            data: task
        });
    }

    // Unarchive the task
    task.isArchived = false;
    task.archivedAt = null;
    task.archivedBy = null;
    task.history.push({
        action: 'unarchived',
        userId,
        timestamp: new Date()
    });

    await task.save();

    res.status(200).json({
        success: true,
        message: 'Task unarchived successfully',
        data: task
    });
});

/**
 * Reorder Tasks (Drag & Drop)
 * PATCH /api/tasks/reorder
 *
 * Gold Standard: Notion/Linear fractional indexing pattern for O(1) reorder
 */
const reorderTasks = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.REORDER);
    const { reorderItems } = data;

    // Input validation
    if (!reorderItems || !Array.isArray(reorderItems) || reorderItems.length === 0) {
        throw CustomException('Reorder items are required. Format: [{ taskId, sortOrder }]', 400);
    }

    if (reorderItems.length > 100) {
        throw CustomException('Cannot reorder more than 100 tasks at once', 400);
    }

    // Validate each item has taskId and sortOrder
    for (const item of reorderItems) {
        if (!item.taskId || typeof item.sortOrder !== 'number') {
            throw CustomException('Each item must have taskId and sortOrder (number)', 400);
        }
    }

    // IDOR protection - sanitize all task IDs
    const sanitizedItems = reorderItems.map(item => ({
        taskId: sanitizeObjectId(item.taskId),
        sortOrder: item.sortOrder
    }));

    const taskIds = sanitizedItems.map(item => item.taskId);

    // Verify all tasks belong to current tenant
    const tasks = await Task.find({
        _id: { $in: taskIds },
        ...req.firmQuery
    }).select('_id');

    const foundTaskIds = new Set(tasks.map(t => t._id.toString()));
    const invalidIds = taskIds.filter(id => !foundTaskIds.has(id.toString()));

    if (invalidIds.length > 0) {
        return res.status(403).json({
            success: false,
            message: `${invalidIds.length} task(s) not found or not accessible`,
            invalidIds
        });
    }

    // Update sort orders using bulkWrite for efficiency
    const bulkOps = sanitizedItems.map(item => ({
        updateOne: {
            filter: { _id: item.taskId, ...req.firmQuery },
            update: { $set: { sortOrder: item.sortOrder } }
        }
    }));

    const result = await Task.bulkWrite(bulkOps);

    res.status(200).json({
        success: true,
        message: `${result.modifiedCount} task(s) reordered successfully`,
        data: {
            modified: result.modifiedCount,
            matched: result.matchedCount
        }
    });
});

/**
 * Get All Task IDs (for "Select All" feature)
 * GET /api/tasks/ids
 *
 * Gold Standard: Returns only IDs with same filters as getTasks
 * Allows frontend to implement efficient "Select All" without loading full task data
 */
const getAllTaskIds = asyncHandler(async (req, res) => {
    const {
        status,
        priority,
        label,
        assignedTo,
        caseId,
        clientId,
        overdue,
        search,
        startDate,
        endDate,
        isArchived
    } = req.query;

    const userId = req.userID;
    const isDeparted = req.isDeparted;

    // IDOR protection - sanitize ObjectIds in query parameters
    const sanitizedAssignedTo = assignedTo ? sanitizeObjectId(assignedTo) : null;
    const sanitizedCaseId = caseId ? sanitizeObjectId(caseId) : null;
    const sanitizedClientId = clientId ? sanitizeObjectId(clientId) : null;

    // Build query using req.firmQuery for proper tenant isolation
    let query = { ...req.firmQuery };

    // Default: exclude archived unless explicitly requested
    if (isArchived === 'true') {
        query.isArchived = true;
    } else if (isArchived === 'only') {
        query.isArchived = true;
    } else {
        query.isArchived = { $ne: true };
    }

    // Departed users can only see their own tasks
    if (isDeparted) {
        query.$or = [
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }

    // Apply filters
    if (status) {
        query.status = Array.isArray(status) ? { $in: status } : status;
    }
    if (priority) {
        query.priority = Array.isArray(priority) ? { $in: priority } : priority;
    }
    if (label) {
        query.label = Array.isArray(label) ? { $in: label } : label;
    }
    if (sanitizedAssignedTo) query.assignedTo = sanitizedAssignedTo;
    if (sanitizedCaseId) query.caseId = sanitizedCaseId;
    if (sanitizedClientId) query.clientId = sanitizedClientId;

    // Date range filter
    if (startDate || endDate) {
        query.dueDate = {};
        if (startDate) query.dueDate.$gte = new Date(startDate);
        if (endDate) query.dueDate.$lte = new Date(endDate);
    }

    // Overdue filter
    if (overdue === 'true') {
        query.dueDate = { $lt: new Date() };
        query.status = { $nin: ['done', 'canceled'] };
    }

    // Text search
    if (search && search.trim()) {
        const searchTerm = search.trim();
        if (query.$or) {
            query.$and = [
                { $or: query.$or },
                { $text: { $search: searchTerm } }
            ];
            delete query.$or;
        } else {
            query.$text = { $search: searchTerm };
        }
    }

    // Only return IDs (highly efficient query)
    const tasks = await Task.find(query).select('_id').lean();
    const taskIds = tasks.map(t => t._id);

    res.status(200).json({
        success: true,
        message: `Found ${taskIds.length} task(s)`,
        data: {
            taskIds,
            count: taskIds.length
        }
    });
});

/**
 * Export Tasks (CSV, Excel, PDF)
 * GET /api/tasks/export
 *
 * Gold Standard: AWS S3 export pattern with async generation for large datasets
 */
const exportTasks = asyncHandler(async (req, res) => {
    const {
        format = 'csv', // csv, xlsx, pdf
        status,
        priority,
        label,
        assignedTo,
        caseId,
        clientId,
        overdue,
        search,
        startDate,
        endDate,
        isArchived,
        fields // Optional: comma-separated list of fields to include
    } = req.query;

    // Validate format
    const validFormats = ['csv', 'xlsx', 'pdf', 'json'];
    if (!validFormats.includes(format)) {
        throw CustomException(`Invalid format. Valid formats: ${validFormats.join(', ')}`, 400);
    }

    const userId = req.userID;
    const isDeparted = req.isDeparted;

    // IDOR protection - sanitize ObjectIds in query parameters
    const sanitizedAssignedTo = assignedTo ? sanitizeObjectId(assignedTo) : null;
    const sanitizedCaseId = caseId ? sanitizeObjectId(caseId) : null;
    const sanitizedClientId = clientId ? sanitizeObjectId(clientId) : null;

    // Build query using req.firmQuery for proper tenant isolation
    let query = { ...req.firmQuery };

    // Default: exclude archived unless explicitly requested
    if (isArchived === 'true' || isArchived === 'only') {
        query.isArchived = true;
    } else {
        query.isArchived = { $ne: true };
    }

    // Departed users can only see their own tasks
    if (isDeparted) {
        query.$or = [
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }

    // Apply filters
    if (status) {
        query.status = Array.isArray(status) ? { $in: status } : status;
    }
    if (priority) {
        query.priority = Array.isArray(priority) ? { $in: priority } : priority;
    }
    if (label) {
        query.label = Array.isArray(label) ? { $in: label } : label;
    }
    if (sanitizedAssignedTo) query.assignedTo = sanitizedAssignedTo;
    if (sanitizedCaseId) query.caseId = sanitizedCaseId;
    if (sanitizedClientId) query.clientId = sanitizedClientId;

    // Date range filter
    if (startDate || endDate) {
        query.dueDate = {};
        if (startDate) query.dueDate.$gte = new Date(startDate);
        if (endDate) query.dueDate.$lte = new Date(endDate);
    }

    // Overdue filter
    if (overdue === 'true') {
        query.dueDate = { $lt: new Date() };
        query.status = { $nin: ['done', 'canceled'] };
    }

    // Text search
    if (search && search.trim()) {
        const searchTerm = search.trim();
        if (query.$or) {
            query.$and = [
                { $or: query.$or },
                { $text: { $search: searchTerm } }
            ];
            delete query.$or;
        } else {
            query.$text = { $search: searchTerm };
        }
    }

    // Fetch tasks with populated fields
    const tasks = await Task.find(query)
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'firstName lastName')
        .sort({ dueDate: 1 })
        .limit(10000) // Safety limit
        .lean();

    // Define exportable fields
    const defaultFields = [
        'title', 'description', 'status', 'priority', 'label', 'tags',
        'dueDate', 'dueTime', 'startDate', 'assignedTo', 'createdBy',
        'caseId', 'clientId', 'progress', 'completedAt', 'createdAt'
    ];

    const selectedFields = fields
        ? fields.split(',').filter(f => defaultFields.includes(f.trim()))
        : defaultFields;

    // Transform tasks for export
    const exportData = tasks.map(task => {
        const row = {};
        selectedFields.forEach(field => {
            switch (field) {
                case 'assignedTo':
                    row['Assigned To'] = task.assignedTo
                        ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
                        : '';
                    break;
                case 'createdBy':
                    row['Created By'] = task.createdBy
                        ? `${task.createdBy.firstName} ${task.createdBy.lastName}`
                        : '';
                    break;
                case 'caseId':
                    row['Case'] = task.caseId
                        ? `${task.caseId.caseNumber || ''} - ${task.caseId.title || ''}`
                        : '';
                    break;
                case 'clientId':
                    row['Client'] = task.clientId
                        ? `${task.clientId.firstName} ${task.clientId.lastName}`
                        : '';
                    break;
                case 'tags':
                    row['Tags'] = (task.tags || []).join(', ');
                    break;
                case 'dueDate':
                    row['Due Date'] = task.dueDate
                        ? new Date(task.dueDate).toISOString().split('T')[0]
                        : '';
                    break;
                case 'startDate':
                    row['Start Date'] = task.startDate
                        ? new Date(task.startDate).toISOString().split('T')[0]
                        : '';
                    break;
                case 'completedAt':
                    row['Completed At'] = task.completedAt
                        ? new Date(task.completedAt).toISOString()
                        : '';
                    break;
                case 'createdAt':
                    row['Created At'] = task.createdAt
                        ? new Date(task.createdAt).toISOString()
                        : '';
                    break;
                case 'description':
                    // Strip HTML for export
                    row['Description'] = task.description
                        ? task.description.replace(/<[^>]*>/g, '').substring(0, 500)
                        : '';
                    break;
                default:
                    row[field.charAt(0).toUpperCase() + field.slice(1)] = task[field] || '';
            }
        });
        return row;
    });

    // Generate export based on format
    if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="tasks-export-${Date.now()}.json"`);
        return res.json({
            success: true,
            exportDate: new Date().toISOString(),
            totalRecords: exportData.length,
            data: exportData
        });
    }

    if (format === 'csv') {
        // Generate CSV
        const headers = Object.keys(exportData[0] || {});
        const csvRows = [
            headers.join(','),
            ...exportData.map(row =>
                headers.map(h => {
                    const value = String(row[h] || '');
                    // Escape quotes and wrap in quotes if contains comma, newline, or quote
                    if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',')
            )
        ];

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="tasks-export-${Date.now()}.csv"`);
        return res.send(csvRows.join('\n'));
    }

    if (format === 'xlsx') {
        // For Excel, return JSON with instructions to use xlsx library on frontend
        // Or integrate with a server-side xlsx library if available
        res.setHeader('Content-Type', 'application/json');
        return res.json({
            success: true,
            format: 'xlsx',
            message: 'Excel export data ready. Use xlsx library to generate file.',
            exportDate: new Date().toISOString(),
            totalRecords: exportData.length,
            headers: Object.keys(exportData[0] || {}),
            data: exportData
        });
    }

    if (format === 'pdf') {
        // For PDF, return JSON with formatting instructions
        // Frontend can use libraries like jsPDF or pdfmake
        res.setHeader('Content-Type', 'application/json');
        return res.json({
            success: true,
            format: 'pdf',
            message: 'PDF export data ready. Use pdfmake or jsPDF to generate file.',
            exportDate: new Date().toISOString(),
            totalRecords: exportData.length,
            headers: Object.keys(exportData[0] || {}),
            data: exportData
        });
    }
});

/**
 * Get Archived Tasks
 * GET /api/tasks/archived
 *
 * Convenience endpoint for viewing archived tasks
 */
const getArchivedTasks = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 50,
        sortBy = 'archivedAt',
        sortOrder = 'desc'
    } = req.query;

    const userId = req.userID;
    const isDeparted = req.isDeparted;

    // Build query using req.firmQuery for proper tenant isolation
    let query = { ...req.firmQuery, isArchived: true };

    // Departed users can only see their own tasks
    if (isDeparted) {
        query.$or = [
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [tasks, total] = await Promise.all([
        Task.find(query)
            .populate('assignedTo', 'firstName lastName email image')
            .populate('createdBy', 'firstName lastName email image')
            .populate('caseId', 'title caseNumber')
            .populate('clientId', 'firstName lastName')
            .populate('archivedBy', 'firstName lastName')
            .sort(sortOptions)
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit)),
        Task.countDocuments(query)
    ]);

    res.status(200).json({
        success: true,
        data: tasks,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

module.exports = {
    createTask,
    getTasks,
    getTask,
    updateTask,
    deleteTask,
    completeTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    updateSubtask,
    startTimer,
    stopTimer,
    addManualTime,
    addComment,
    updateComment,
    deleteComment,
    bulkUpdateTasks,
    bulkDeleteTasks,
    getTaskStats,
    getUpcomingTasks,
    getOverdueTasks,
    getTasksByCase,
    getTasksDueToday,
    // Dependency functions
    addDependency,
    removeDependency,
    updateTaskStatus,
    // Progress functions
    updateProgress,
    // Workflow functions
    addWorkflowRule,
    updateOutcome,
    // Budget functions
    updateEstimate,
    getTimeTrackingSummary,
    // Aggregated endpoints (GOLD STANDARD)
    getTaskFull,
    getTasksOverview,
    // NEW: Missing endpoints
    getActiveTimers,
    pauseTimer,
    resumeTimer,
    cloneTask,
    getTaskActivity,
    getTasksByClient,
    convertTaskToEvent,
    searchTasks,
    bulkCreateTasks,
    rescheduleTask,
    getTaskConflicts,
    // NEW: Bulk operations & additional features
    bulkCompleteTasks,
    bulkAssignTasks,
    bulkArchiveTasks,
    bulkUnarchiveTasks,
    archiveTask,
    unarchiveTask,
    reorderTasks,
    getAllTaskIds,
    exportTasks,
    getArchivedTasks
};

