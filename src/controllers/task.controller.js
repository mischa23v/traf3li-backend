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

// Valid enum values for validation
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const VALID_STATUSES = ['todo', 'pending', 'in_progress', 'done', 'canceled'];

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
    PROGRESS: ['progress', 'autoCalculate']
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

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (label) query.label = label;
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
    if (search) {
        query.$text = { $search: search };
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const tasks = await Task.find(query)
        .populate('assignedTo', 'firstName lastName username email image')
        .populate('createdBy', 'firstName lastName username email image')
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

            const linkedEvent = await Event.create({
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
                firmId,
                createdBy: task.createdBy,
                attendees: task.assignedTo ? [{ userId: task.assignedTo, status: 'confirmed', role: 'required' }] : [],
                priority: task.priority,
                color: '#10b981',
                tags: task.tags,
                status: task.status === 'done' ? 'completed' : 'scheduled'
            });

            task.linkedEventId = linkedEvent._id;
            await task.save();

        } else if (!hasDueDate && task.linkedEventId) {
            // Task no longer has due date → delete linked event
            await Event.findOneAndDelete({ _id: task.linkedEventId, firmId });
            task.linkedEventId = null;
            await task.save();

        } else if (hasDueDate && task.linkedEventId) {
            // Task still has due date and linked event → update event
            const linkedEvent = await Event.findOne({ _id: task.linkedEventId, firmId });

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
    const userId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Build query with firmId to prevent IDOR
    const query = { _id: taskId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        // Solo lawyer - only tasks they created
        query.createdBy = userId;
    }

    const task = await Task.findOne(query);

    if (!task) {
        throw CustomException('Task not found', 404);
    }

    // Delete linked calendar event if exists
    if (task.linkedEventId) {
        try {
            // IDOR protection: Include firmId/userId in delete query
            const eventQuery = { _id: task.linkedEventId };
            if (firmId) {
                eventQuery.firmId = firmId;
            } else {
                eventQuery.createdBy = userId;
            }
            await Event.findOneAndDelete(eventQuery);
        } catch (error) {
            logger.error('Error deleting linked calendar event', { error: error.message });
            // Continue with task deletion even if event deletion fails
        }
    }

    await Task.findOneAndDelete(query);

    res.status(200).json({
        success: true,
        message: 'Task deleted successfully'
    });
});

// Complete task
const completeTask = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.COMPLETE);
    const { completionNote } = data;

    // Build query with firmId to prevent IDOR
    const query = { _id: taskId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        // Solo lawyer - only their own tasks
        query.$or = [
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }

    const task = await Task.findOne(query);

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
    const firmId = req.firmId;

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.SUBTASK);
    const { title, autoReset } = data;

    // Input validation
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
        throw CustomException('Subtask title is required', 400);
    }

    // Build query with firmId to prevent IDOR
    const query = { _id: taskId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        // Solo lawyer - only their own tasks
        query.$or = [
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }

    const task = await Task.findOne(query);
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
    const firmId = req.firmId;

    // IDOR protection
    const taskId = sanitizeObjectId(id);
    const sanitizedSubtaskId = sanitizeObjectId(subtaskId);

    // Build query with firmId to prevent IDOR
    const query = { _id: taskId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        // Solo lawyer - only their own tasks
        query.$or = [
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }

    const task = await Task.findOne(query);
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
    const firmId = req.firmId;

    // IDOR protection
    const taskId = sanitizeObjectId(id);
    const sanitizedSubtaskId = sanitizeObjectId(subtaskId);

    // Build query with firmId to prevent IDOR
    const query = { _id: taskId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        // Solo lawyer - only their own tasks
        query.$or = [
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }

    const task = await Task.findOne(query);
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
    const firmId = req.firmId;

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.TIMER_START);
    const { notes } = data;

    // Build query with firmId to prevent IDOR
    const query = { _id: taskId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        // Solo lawyer - only their own tasks
        query.$or = [
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }

    const task = await Task.findOne(query);
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
    const firmId = req.firmId;

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.TIMER_STOP);
    const { notes, isBillable } = data;

    // Build query with firmId to prevent IDOR
    const query = { _id: taskId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        // Solo lawyer - only their own tasks
        query.$or = [
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }

    const task = await Task.findOne(query);
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
    const firmId = req.firmId;

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

    // Build query with firmId to prevent IDOR
    const query = { _id: taskId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        // Solo lawyer - only their own tasks
        query.$or = [
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }

    const task = await Task.findOne(query);
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
    const firmId = req.firmId;

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

    // Build query with firmId to prevent IDOR
    const query = { _id: taskId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        // Solo lawyer - only their own tasks
        query.$or = [
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }

    const task = await Task.findOne(query);
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
    const firmId = req.firmId;

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

    // Build query with firmId to prevent IDOR
    const query = { _id: taskId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        // Solo lawyer - only their own tasks
        query.$or = [
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }

    const task = await Task.findOne(query);
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
    const firmId = req.firmId;

    // IDOR protection
    const taskId = sanitizeObjectId(id);
    const sanitizedCommentId = sanitizeObjectId(commentId);

    // Build query with firmId to prevent IDOR
    const query = { _id: taskId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        // Solo lawyer - only their own tasks
        query.$or = [
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }

    const task = await Task.findOne(query);
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
    const userId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

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

    // Convert firmId to ObjectId for proper MongoDB matching
    const firmObjectId = firmId ? new mongoose.Types.ObjectId(firmId) : null;

    // Verify access to all tasks - use req.firmQuery for proper tenant isolation
    const accessQuery = { _id: { $in: sanitizedTaskIds }, ...req.firmQuery };

    const tasks = await Task.find(accessQuery);

    if (tasks.length !== sanitizedTaskIds.length) {
        throw CustomException('Some tasks are not accessible', 403);
    }

    await Task.updateMany(
        { _id: { $in: sanitizedTaskIds } },
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
    const userId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

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

    // Convert firmId to ObjectId for proper MongoDB matching
    const firmObjectId = firmId ? new mongoose.Types.ObjectId(firmId) : null;

    // Verify ownership of all tasks - firmId first, then creator-only
    const accessQuery = firmObjectId
        ? { _id: { $in: sanitizedTaskIds }, firmId: firmObjectId }
        : { _id: { $in: sanitizedTaskIds }, createdBy: userId };

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

    // SECURITY: Use accessQuery to ensure firmId/createdBy filter is applied
    // This prevents cross-firm task deletion even if IDs are known
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
    const userId = req.userID;
    const firmId = req.firmId;

    // IDOR protection
    const sanitizedCaseId = sanitizeObjectId(caseId);

    // Convert firmId to ObjectId for proper MongoDB matching
    const firmObjectId = firmId ? new mongoose.Types.ObjectId(firmId) : null;

    // Verify case exists and user has access
    const caseDoc = await Case.findOne({ _id: sanitizedCaseId, firmId: firmObjectId });
    if (!caseDoc) {
        throw CustomException('Case not found', 404);
    }

    const tasks = await Task.find({ caseId: sanitizedCaseId, firmId: firmObjectId })
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

    const userId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Build query - use req.firmQuery for proper tenant isolation
    const baseQuery = { ...req.firmQuery };

    const tasks = await Task.find({
        ...baseQuery,
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
    const firmId = req.firmId;

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
    const userId = req.userID;
    const firmId = req.firmId;

    // Build query with firmId to prevent IDOR
    const query = { _id: id };
    if (firmId) {
        query.firmId = firmId;
    } else {
        // Solo lawyer - only their own tasks
        query.$or = [
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }

    const task = await Task.findOne(query);
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
    const firmId = req.firmId;

    // Build query with firmId to prevent IDOR
    const query = { _id: id };
    if (firmId) {
        query.firmId = firmId;
    } else {
        // Solo lawyer - only their own tasks
        query.$or = [
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }

    const task = await Task.findOne(query);
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    task.outcome = outcome;
    task.outcomeNotes = outcomeNotes;
    task.outcomeDate = new Date();

    const user = await User.findOne({ _id: userId, firmId }).select('firstName lastName');

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
    const userId = req.userID;
    const firmId = req.firmId;

    // Build query with firmId to prevent IDOR
    const query = { _id: id };
    if (firmId) {
        query.firmId = firmId;
    } else {
        // Solo lawyer - only their own tasks
        query.$or = [
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }

    const task = await Task.findOne(query)
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
    const userId = req.userID;
    const firmId = req.firmId;

    // Build query with firmId to prevent IDOR
    const query = { _id: id };
    if (firmId) {
        query.firmId = firmId;
    } else {
        // Solo lawyer - only their own tasks
        query.$or = [
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }

    // Fetch task with full population
    const task = await Task.findOne(query)
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
    const userId = req.userID;
    const firmId = req.firmId;

    // Build base query
    const baseQuery = { isDeleted: { $ne: true } };
    if (firmId) {
        baseQuery.firmId = firmId;
    } else {
        baseQuery.$or = [
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }

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
    getTasksOverview
};

