const mongoose = require('mongoose');
const { Task, User, Case, TaskDocumentVersion, Event } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { deleteFile, listFileVersions, logFileAccess } = require('../configs/s3');
const { isS3Configured, getTaskFilePresignedUrl, isS3Url, extractS3Key } = require('../configs/taskUpload');
const { sanitizeRichText, sanitizeComment, stripHtml, hasDangerousContent } = require('../utils/sanitize');
const fs = require('fs');
const path = require('path');

// Create task
const createTask = asyncHandler(async (req, res) => {
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
    } = req.body;

    const userId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    // Block departed users from creating tasks
    if (req.isDeparted) {
        throw CustomException('لم يعد لديك صلاحية إنشاء مهام جديدة', 403);
    }

    // Sanitize user input to prevent XSS
    const sanitizedTitle = title ? stripHtml(title) : '';
    const sanitizedDescription = description ? sanitizeRichText(description) : '';
    const sanitizedNotes = notes ? sanitizeRichText(notes) : '';

    // Check for dangerous content
    if (hasDangerousContent(description) || hasDangerousContent(notes)) {
        throw CustomException('Invalid content detected', 400);
    }

    // Validate assignedTo user if provided
    if (assignedTo) {
        const assignedUser = await User.findById(assignedTo);
        if (!assignedUser) {
            throw CustomException('Assigned user not found', 404);
        }
    }

    // If caseId provided, validate it exists
    if (caseId) {
        const caseDoc = await Case.findById(caseId);
        if (!caseDoc) {
            throw CustomException('Case not found', 404);
        }
    }

    const task = await Task.create({
        title: sanitizedTitle,
        description: sanitizedDescription,
        priority: priority || 'medium',
        status: status || 'todo',
        label,
        tags,
        dueDate,
        dueTime,
        startDate,
        assignedTo: assignedTo || userId,
        createdBy: userId,
        firmId, // Add firmId for multi-tenancy
        caseId,
        clientId,
        parentTaskId,
        subtasks: subtasks || [],
        checklists: checklists || [],
        timeTracking: timeTracking || { estimatedMinutes: 0, actualMinutes: 0, sessions: [] },
        recurring,
        reminders: reminders || [],
        notes: sanitizedNotes,
        points: points || 0
    });

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

            const linkedEvent = await Event.create({
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
                firmId,
                createdBy: userId,
                attendees: task.assignedTo ? [{ userId: task.assignedTo, status: 'confirmed', role: 'required' }] : [],
                priority: task.priority,
                color: '#10b981', // Green color for task events
                tags: task.tags
            });

            // Link the event back to the task
            task.linkedEventId = linkedEvent._id;
            await task.save();
        } catch (error) {
            console.error('Error creating linked calendar event:', error);
            // Don't fail task creation if event creation fails
        }
    }

    const populatedTask = await Task.findById(task._id)
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
    const firmId = req.firmId; // From firmFilter middleware
    const isDeparted = req.isDeparted; // From firmFilter middleware

    // Build query - if firmId exists, filter by firm; otherwise by user
    let query;
    if (firmId) {
        if (isDeparted) {
            // Departed users can only see their own tasks
            query = {
                firmId,
                $or: [
                    { assignedTo: userId },
                    { createdBy: userId }
                ]
            };
        } else {
            // Active firm members see all firm tasks
            query = { firmId };
        }
    } else {
        query = {
            $or: [
                { assignedTo: userId },
                { createdBy: userId }
            ]
        };
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (label) query.label = label;
    if (assignedTo) query.assignedTo = assignedTo;
    if (caseId) query.caseId = caseId;
    if (clientId) query.clientId = clientId;

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
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    const task = await Task.findById(id)
        .populate('assignedTo', 'firstName lastName username email image')
        .populate('createdBy', 'firstName lastName username email image')
        .populate('caseId', 'title caseNumber category')
        .populate('clientId', 'firstName lastName email')
        .populate('completedBy', 'firstName lastName')
        .populate('comments.userId', 'firstName lastName image')
        .populate('timeTracking.sessions.userId', 'firstName lastName')
        .populate('linkedEventId', 'eventId title startDateTime status');

    if (!task) {
        throw CustomException('Task not found', 404);
    }

    // Check access - firmId first, then user-based
    const hasAccess = firmId
        ? task.firmId && task.firmId.toString() === firmId.toString()
        : (task.assignedTo?._id.toString() === userId ||
           task.createdBy._id.toString() === userId);

    if (!hasAccess) {
        throw CustomException('You do not have access to this task', 403);
    }

    res.status(200).json({
        success: true,
        data: task
    });
});

// Update task
const updateTask = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    // Block departed users from updating
    if (req.isDeparted) {
        throw CustomException('لم يعد لديك صلاحية تعديل المهام', 403);
    }

    const task = await Task.findById(id);

    if (!task) {
        throw CustomException('Task not found', 404);
    }

    // Check permission - firmId first, then user-based
    const canUpdate = firmId
        ? task.firmId && task.firmId.toString() === firmId.toString()
        : (task.createdBy.toString() === userId ||
           task.assignedTo?.toString() === userId);

    if (!canUpdate) {
        throw CustomException('You do not have permission to update this task', 403);
    }

    // Sanitize text fields
    if (req.body.title) req.body.title = stripHtml(req.body.title);
    if (req.body.description) req.body.description = sanitizeRichText(req.body.description);
    if (req.body.notes) req.body.notes = sanitizeRichText(req.body.notes);

    // Check for dangerous content
    if (hasDangerousContent(req.body.description) || hasDangerousContent(req.body.notes)) {
        throw CustomException('Invalid content detected', 400);
    }

    // Track changes for history
    const changes = {};
    const allowedFields = [
        'title', 'description', 'status', 'priority', 'label', 'tags',
        'dueDate', 'dueTime', 'startDate', 'assignedTo', 'caseId', 'clientId',
        'subtasks', 'checklists', 'timeTracking', 'recurring', 'reminders',
        'notes', 'points', 'progress'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined && JSON.stringify(task[field]) !== JSON.stringify(req.body[field])) {
            changes[field] = { from: task[field], to: req.body[field] };
            task[field] = req.body[field];
        }
    });

    // Handle completion
    if (req.body.status === 'done' && task.status !== 'done') {
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
            await Event.findByIdAndDelete(task.linkedEventId);
            task.linkedEventId = null;
            await task.save();

        } else if (hasDueDate && task.linkedEventId) {
            // Task still has due date and linked event → update event
            const linkedEvent = await Event.findById(task.linkedEventId);

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
        console.error('Error syncing task with calendar event:', error);
        // Don't fail task update if event sync fails
    }

    const populatedTask = await Task.findById(task._id)
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
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    const task = await Task.findById(id);

    if (!task) {
        throw CustomException('Task not found', 404);
    }

    // Check delete permission - firmId first, then creator-only
    const canDelete = firmId
        ? task.firmId && task.firmId.toString() === firmId.toString()
        : task.createdBy.toString() === userId;

    if (!canDelete) {
        throw CustomException('Only the task creator can delete this task', 403);
    }

    // Delete linked calendar event if exists
    if (task.linkedEventId) {
        try {
            await Event.findByIdAndDelete(task.linkedEventId);
        } catch (error) {
            console.error('Error deleting linked calendar event:', error);
            // Continue with task deletion even if event deletion fails
        }
    }

    await Task.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: 'Task deleted successfully'
    });
});

// Complete task
const completeTask = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { completionNote } = req.body;
    const userId = req.userID;

    const task = await Task.findById(id);

    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const canComplete =
        task.assignedTo?.toString() === userId ||
        task.createdBy.toString() === userId;

    if (!canComplete) {
        throw CustomException('You do not have permission to complete this task', 403);
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

            const nextTask = await Task.create({
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
            });

            return res.status(200).json({
                success: true,
                message: 'Task completed! Next occurrence created.',
                data: task,
                nextTask
            });
        }
    }

    const populatedTask = await Task.findById(task._id)
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
    const { title, autoReset } = req.body;
    const userId = req.userID;

    const task = await Task.findById(id);
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

    const task = await Task.findById(id);
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const subtask = task.subtasks.id(subtaskId);
    if (!subtask) {
        throw CustomException('Subtask not found', 404);
    }

    subtask.completed = !subtask.completed;
    subtask.completedAt = subtask.completed ? new Date() : null;

    task.history.push({
        action: subtask.completed ? 'subtask_completed' : 'subtask_uncompleted',
        userId,
        changes: { subtaskId, subtaskTitle: subtask.title },
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

    const task = await Task.findById(id);
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    task.subtasks.pull(subtaskId);
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
    const { notes } = req.body;
    const userId = req.userID;

    const task = await Task.findById(id);
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
    const { notes, isBillable } = req.body;
    const userId = req.userID;

    const task = await Task.findById(id);
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
    const { minutes, notes, date, isBillable = true } = req.body;
    const userId = req.userID;

    const task = await Task.findById(id);
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    if (!minutes || minutes <= 0) {
        throw CustomException('Minutes must be a positive number', 400);
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
    // Accept both 'text' (frontend) and 'content' (schema) for flexibility
    const { content, text, mentions } = req.body;
    const rawContent = content || text;
    const userId = req.userID;

    if (!rawContent) {
        throw CustomException('Comment content is required', 400);
    }

    // Sanitize comment content (more restrictive than rich text)
    const sanitizedContent = sanitizeComment(rawContent);

    if (hasDangerousContent(rawContent)) {
        throw CustomException('Invalid content detected', 400);
    }

    const task = await Task.findById(id);
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

    const populatedTask = await Task.findById(id)
        .populate('comments.userId', 'firstName lastName image');

    res.status(201).json({
        success: true,
        message: 'Comment added',
        data: populatedTask.comments
    });
});

// Update comment
const updateComment = asyncHandler(async (req, res) => {
    const { id, commentId } = req.params;
    // Accept both 'text' (frontend) and 'content' (schema) for flexibility
    const { content, text } = req.body;
    const rawContent = content || text;
    const userId = req.userID;

    if (!rawContent) {
        throw CustomException('Comment content is required', 400);
    }

    // Sanitize comment content
    const sanitizedContent = sanitizeComment(rawContent);

    if (hasDangerousContent(rawContent)) {
        throw CustomException('Invalid content detected', 400);
    }

    const task = await Task.findById(id);
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const comment = task.comments.id(commentId);
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

    const task = await Task.findById(id);
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const comment = task.comments.id(commentId);
    if (!comment) {
        throw CustomException('Comment not found', 404);
    }

    if (comment.userId.toString() !== userId && task.createdBy.toString() !== userId) {
        throw CustomException('You cannot delete this comment', 403);
    }

    task.comments.pull(commentId);
    await task.save();

    res.status(200).json({
        success: true,
        message: 'Comment deleted'
    });
});

// === BULK OPERATIONS ===

// Bulk update tasks
const bulkUpdateTasks = asyncHandler(async (req, res) => {
    const { taskIds, updates } = req.body;
    const userId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        throw CustomException('Task IDs are required', 400);
    }

    // Verify access to all tasks - firmId first, then user-based
    const accessQuery = firmId
        ? { _id: { $in: taskIds }, firmId }
        : { _id: { $in: taskIds }, $or: [{ assignedTo: userId }, { createdBy: userId }] };

    const tasks = await Task.find(accessQuery);

    if (tasks.length !== taskIds.length) {
        throw CustomException('Some tasks are not accessible', 403);
    }

    const allowedUpdates = ['status', 'priority', 'assignedTo', 'dueDate', 'label'];
    const updateData = {};
    allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
            updateData[field] = updates[field];
        }
    });

    await Task.updateMany(
        { _id: { $in: taskIds } },
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
    const { taskIds } = req.body;
    const userId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        throw CustomException('Task IDs are required', 400);
    }

    // Validate ObjectIds format
    const invalidIds = taskIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
        return res.status(400).json({
            success: false,
            message: `Invalid task ID format`,
            invalidIds
        });
    }

    // Verify ownership of all tasks - firmId first, then creator-only
    const accessQuery = firmId
        ? { _id: { $in: taskIds }, firmId }
        : { _id: { $in: taskIds }, createdBy: userId };

    const tasks = await Task.find(accessQuery).select('_id');
    const foundTaskIds = tasks.map(t => t._id.toString());

    // Find which IDs failed authorization
    const failedIds = taskIds.filter(id => !foundTaskIds.includes(id));

    if (failedIds.length > 0) {
        return res.status(403).json({
            success: false,
            message: `Cannot delete ${failedIds.length} task(s): not found or no permission`,
            failedIds,
            validCount: foundTaskIds.length,
            requestedCount: taskIds.length
        });
    }

    await Task.deleteMany({ _id: { $in: taskIds } });

    res.status(200).json({
        success: true,
        message: `${tasks.length} tasks deleted successfully`,
        count: tasks.length
    });
});

// === STATS & ANALYTICS ===

// Get task stats
const getTaskStats = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    // Get stats with firmId filtering if available
    const stats = await Task.getStats(userId, firmId);

    res.status(200).json({
        success: true,
        data: stats
    });
});

// Get upcoming tasks
const getUpcomingTasks = asyncHandler(async (req, res) => {
    const { days = 7 } = req.query;
    const userId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + parseInt(days));

    // Build query - firmId first, then user-based
    const baseQuery = firmId
        ? { firmId }
        : { $or: [{ assignedTo: userId }, { createdBy: userId }] };

    const tasks = await Task.find({
        ...baseQuery,
        dueDate: { $gte: today, $lte: future },
        status: { $nin: ['done', 'canceled'] }
    })
        .populate('assignedTo', 'firstName lastName image')
        .populate('caseId', 'title caseNumber')
        .sort({ dueDate: 1 });

    res.status(200).json({
        success: true,
        data: tasks,
        count: tasks.length
    });
});

// Get overdue tasks
const getOverdueTasks = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    // Build query - firmId first, then user-based
    const baseQuery = firmId
        ? { firmId }
        : { $or: [{ assignedTo: userId }, { createdBy: userId }] };

    const tasks = await Task.find({
        ...baseQuery,
        dueDate: { $lt: new Date() },
        status: { $nin: ['done', 'canceled'] }
    })
        .populate('assignedTo', 'firstName lastName image')
        .populate('caseId', 'title caseNumber')
        .sort({ dueDate: 1 });

    res.status(200).json({
        success: true,
        data: tasks,
        count: tasks.length
    });
});

// Get tasks by case
const getTasksByCase = asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const userId = req.userID;

    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
        throw CustomException('Case not found', 404);
    }

    const tasks = await Task.find({ caseId })
        .populate('assignedTo', 'firstName lastName image')
        .populate('createdBy', 'firstName lastName')
        .sort({ dueDate: 1, priority: -1 });

    res.status(200).json({
        success: true,
        data: tasks,
        count: tasks.length
    });
});

// Get tasks due today
const getTasksDueToday = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Build query - firmId first, then user-based
    const baseQuery = firmId
        ? { firmId }
        : { $or: [{ assignedTo: userId }, { createdBy: userId }] };

    const tasks = await Task.find({
        ...baseQuery,
        dueDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $nin: ['done', 'canceled'] }
    })
        .populate('assignedTo', 'firstName lastName image')
        .populate('createdBy', 'firstName lastName image')
        .populate('caseId', 'title caseNumber')
        .sort({ dueTime: 1, priority: -1 });

    res.status(200).json({
        success: true,
        data: tasks,
        count: tasks.length,
        date: startOfDay.toISOString().split('T')[0]
    });
});

// Helper function to calculate next due date
function calculateNextDueDate(currentDueDate, recurring) {
    const nextDate = new Date(currentDueDate);
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

// ============================================
// TEMPLATE FUNCTIONS
// ============================================

/**
 * Get all task templates
 * GET /api/tasks/templates
 */
const getTemplates = asyncHandler(async (req, res) => {
    const userId = req.userID;

    const templates = await Task.find({
        isTemplate: true,
        $or: [
            { createdBy: userId },
            { isPublic: true }
        ]
    })
        .populate('createdBy', 'firstName lastName email image')
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        templates: templates,
        data: templates,
        total: templates.length
    });
});

/**
 * Get a single template by ID
 * GET /api/tasks/templates/:templateId
 */
const getTemplate = asyncHandler(async (req, res) => {
    const { templateId } = req.params;
    const userId = req.userID;

    const template = await Task.findOne({
        _id: templateId,
        isTemplate: true,
        $or: [
            { createdBy: userId },
            { isPublic: true }
        ]
    })
        .populate('createdBy', 'firstName lastName email image');

    if (!template) {
        throw CustomException('Template not found', 404);
    }

    res.status(200).json({
        success: true,
        template: template,
        data: template
    });
});

/**
 * Create a new task template
 * POST /api/tasks/templates
 */
const createTemplate = asyncHandler(async (req, res) => {
    const {
        title,
        templateName,
        description,
        priority,
        label,
        tags,
        subtasks,
        checklists,
        timeTracking,
        reminders,
        notes,
        isPublic
    } = req.body;

    const userId = req.userID;

    const template = await Task.create({
        title,
        templateName: templateName || title,
        description,
        priority: priority || 'medium',
        status: 'todo',
        label,
        tags,
        subtasks: subtasks?.map(st => ({
            title: st.title,
            completed: false,
            autoReset: st.autoReset || false
        })),
        checklists,
        timeTracking: timeTracking ? {
            estimatedMinutes: timeTracking.estimatedMinutes || 0,
            actualMinutes: 0,
            sessions: []
        } : undefined,
        reminders,
        notes,
        isTemplate: true,
        isPublic: isPublic || false,
        createdBy: userId
    });

    await template.populate('createdBy', 'firstName lastName email image');

    res.status(201).json({
        success: true,
        template: template,
        data: template,
        message: 'Template created successfully'
    });
});

/**
 * Update a task template
 * PUT /api/tasks/templates/:templateId
 */
const updateTemplate = asyncHandler(async (req, res) => {
    const { templateId } = req.params;
    const userId = req.userID;
    const updates = req.body;

    const template = await Task.findOne({
        _id: templateId,
        isTemplate: true,
        createdBy: userId
    });

    if (!template) {
        throw CustomException('Template not found or you do not have permission to update it', 404);
    }

    // Don't allow changing isTemplate to false
    delete updates.isTemplate;
    delete updates.createdBy;
    delete updates.templateId;

    // Update the template
    Object.assign(template, updates);
    await template.save();

    await template.populate('createdBy', 'firstName lastName email image');

    res.status(200).json({
        success: true,
        template: template,
        data: template,
        message: 'Template updated successfully'
    });
});

/**
 * Delete a task template
 * DELETE /api/tasks/templates/:templateId
 */
const deleteTemplate = asyncHandler(async (req, res) => {
    const { templateId } = req.params;
    const userId = req.userID;

    const template = await Task.findOneAndDelete({
        _id: templateId,
        isTemplate: true,
        createdBy: userId
    });

    if (!template) {
        throw CustomException('Template not found or you do not have permission to delete it', 404);
    }

    res.status(200).json({
        success: true,
        message: 'Template deleted successfully'
    });
});

/**
 * Create a new task from a template
 * POST /api/tasks/templates/:templateId/create
 */
const createFromTemplate = asyncHandler(async (req, res) => {
    const { templateId } = req.params;
    const userId = req.userID;
    const {
        title,
        dueDate,
        dueTime,
        assignedTo,
        caseId,
        clientId,
        notes
    } = req.body;

    const template = await Task.findOne({
        _id: templateId,
        isTemplate: true,
        $or: [
            { createdBy: userId },
            { isPublic: true }
        ]
    });

    if (!template) {
        throw CustomException('Template not found', 404);
    }

    // Validate assignedTo if provided
    if (assignedTo) {
        const assignedUser = await User.findById(assignedTo);
        if (!assignedUser) {
            throw CustomException('Assigned user not found', 404);
        }
    }

    // Validate caseId if provided
    if (caseId) {
        const caseDoc = await Case.findById(caseId);
        if (!caseDoc) {
            throw CustomException('Case not found', 404);
        }
    }

    // Create new task from template
    const taskData = {
        title: title || template.title,
        description: template.description,
        priority: template.priority,
        status: 'todo',
        label: template.label,
        tags: template.tags ? [...template.tags] : [],
        dueDate,
        dueTime,
        assignedTo: assignedTo || userId,
        caseId,
        clientId,
        createdBy: userId,
        isTemplate: false,
        templateId: templateId,
        notes: notes || template.notes,
        timeTracking: template.timeTracking ? {
            estimatedMinutes: template.timeTracking.estimatedMinutes || 0,
            actualMinutes: 0,
            sessions: []
        } : { estimatedMinutes: 0, actualMinutes: 0, sessions: [] },
        // Reset subtasks to incomplete
        subtasks: template.subtasks?.map(st => ({
            title: st.title,
            completed: false,
            autoReset: st.autoReset || false
        })),
        // Reset checklists
        checklists: template.checklists?.map(cl => ({
            title: cl.title,
            items: cl.items?.map(item => ({
                text: item.text,
                completed: false
            }))
        })),
        reminders: template.reminders?.map(r => ({
            type: r.type,
            beforeMinutes: r.beforeMinutes,
            sent: false
        })),
        history: [{
            action: 'created_from_template',
            userId: userId,
            changes: { templateId: templateId, templateName: template.templateName || template.title },
            timestamp: new Date()
        }]
    };

    const newTask = await Task.create(taskData);

    await newTask.populate([
        { path: 'assignedTo', select: 'firstName lastName image email' },
        { path: 'createdBy', select: 'firstName lastName image' },
        { path: 'caseId', select: 'title caseNumber' }
    ]);

    res.status(201).json({
        success: true,
        task: newTask,
        data: newTask,
        message: 'Task created from template successfully'
    });
});

/**
 * Save an existing task as a template
 * POST /api/tasks/:taskId/save-as-template
 */
const saveAsTemplate = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const { templateName, isPublic } = req.body;
    const userId = req.userID;

    const task = await Task.findOne({
        _id: taskId,
        $or: [
            { createdBy: userId },
            { assignedTo: userId }
        ]
    });

    if (!task) {
        throw CustomException('Task not found', 404);
    }

    // Create template from task
    const templateData = {
        title: task.title,
        templateName: templateName || `${task.title} (Template)`,
        description: task.description,
        priority: task.priority,
        status: 'todo',
        label: task.label,
        tags: task.tags ? [...task.tags] : [],
        isTemplate: true,
        isPublic: isPublic || false,
        createdBy: userId,
        notes: task.notes,
        timeTracking: task.timeTracking ? {
            estimatedMinutes: task.timeTracking.estimatedMinutes || 0,
            actualMinutes: 0,
            sessions: []
        } : { estimatedMinutes: 0, actualMinutes: 0, sessions: [] },
        // Reset subtasks
        subtasks: task.subtasks?.map(st => ({
            title: st.title,
            completed: false,
            autoReset: st.autoReset || false
        })),
        // Reset checklists
        checklists: task.checklists?.map(cl => ({
            title: cl.title,
            items: cl.items?.map(item => ({
                text: item.text,
                completed: false
            }))
        })),
        reminders: task.reminders?.map(r => ({
            type: r.type,
            beforeMinutes: r.beforeMinutes,
            sent: false
        }))
    };

    const template = await Task.create(templateData);

    await template.populate('createdBy', 'firstName lastName email image');

    res.status(201).json({
        success: true,
        template: template,
        data: template,
        message: 'Task saved as template successfully'
    });
});

// ============================================
// ATTACHMENT FUNCTIONS
// ============================================

/**
 * Add attachment to task
 * POST /api/tasks/:id/attachments
 * Supports both local storage and S3 uploads
 */
const addAttachment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    const task = await Task.findById(id);
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    if (!req.file) {
        throw CustomException('No file uploaded', 400);
    }

    const user = await User.findById(userId).select('firstName lastName');

    let attachment;

    if (isS3Configured() && req.file.location) {
        // S3 upload - multer-s3 provides location (full URL) and key
        attachment = {
            fileName: req.file.originalname,
            fileUrl: req.file.location, // Full S3 URL
            fileKey: req.file.key, // S3 key for deletion
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            uploadedBy: userId,
            uploadedAt: new Date(),
            storageType: 's3'
        };
    } else {
        // Local storage upload
        attachment = {
            fileName: req.file.originalname,
            fileUrl: `/uploads/tasks/${req.file.filename}`,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            uploadedBy: userId,
            uploadedAt: new Date(),
            storageType: 'local'
        };
    }

    task.attachments.push(attachment);

    // Add history entry
    task.history.push({
        action: 'attachment_added',
        userId,
        userName: user ? `${user.firstName} ${user.lastName}` : undefined,
        details: req.file.originalname,
        timestamp: new Date()
    });

    await task.save();

    const newAttachment = task.attachments[task.attachments.length - 1];

    // If S3, generate a presigned URL for immediate access
    let downloadUrl = newAttachment.fileUrl;
    if (newAttachment.storageType === 's3' && newAttachment.fileKey) {
        try {
            downloadUrl = await getTaskFilePresignedUrl(newAttachment.fileKey, newAttachment.fileName);
        } catch (err) {
            console.error('Error generating presigned URL:', err);
        }
    }

    res.status(201).json({
        success: true,
        message: 'تم رفع المرفق بنجاح',
        attachment: {
            ...newAttachment.toObject(),
            downloadUrl
        }
    });
});

/**
 * Delete attachment from task
 * DELETE /api/tasks/:id/attachments/:attachmentId
 * Supports both local storage and S3 deletion
 */
const deleteAttachment = asyncHandler(async (req, res) => {
    const { id, attachmentId } = req.params;
    const userId = req.userID;

    const task = await Task.findById(id);
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const attachment = task.attachments.id(attachmentId);
    if (!attachment) {
        throw CustomException('Attachment not found', 404);
    }

    // Only uploader or task creator can delete
    if (attachment.uploadedBy.toString() !== userId && task.createdBy.toString() !== userId) {
        throw CustomException('You do not have permission to delete this attachment', 403);
    }

    const fileName = attachment.fileName;
    const fileUrl = attachment.fileUrl;
    const fileKey = attachment.fileKey;
    const storageType = attachment.storageType;

    // Delete the actual file from storage
    try {
        if (storageType === 's3' && fileKey) {
            // Delete from S3
            await deleteFile(fileKey, 'tasks');
        } else if (storageType === 'local' || !storageType) {
            // Delete from local storage
            const localPath = path.join(process.cwd(), fileUrl);
            if (fs.existsSync(localPath)) {
                fs.unlinkSync(localPath);
            }
        }
    } catch (err) {
        console.error('Error deleting file from storage:', err);
        // Continue with database removal even if file deletion fails
    }

    task.attachments.pull(attachmentId);

    const user = await User.findById(userId).select('firstName lastName');

    // Add history entry
    task.history.push({
        action: 'attachment_removed',
        userId,
        userName: user ? `${user.firstName} ${user.lastName}` : undefined,
        details: fileName,
        timestamp: new Date()
    });

    await task.save();

    res.status(200).json({
        success: true,
        message: 'تم حذف المرفق'
    });
});

// ============================================
// DEPENDENCY FUNCTIONS
// ============================================

/**
 * Check for circular dependencies
 */
async function hasCircularDependency(taskId, dependsOnId, visited = new Set()) {
    if (taskId.toString() === dependsOnId.toString()) {
        return true;
    }

    if (visited.has(dependsOnId.toString())) {
        return false;
    }

    visited.add(dependsOnId.toString());

    const dependentTask = await Task.findById(dependsOnId).select('blockedBy');
    if (!dependentTask || !dependentTask.blockedBy) {
        return false;
    }

    for (const blockedById of dependentTask.blockedBy) {
        if (await hasCircularDependency(taskId, blockedById, visited)) {
            return true;
        }
    }

    return false;
}

/**
 * Add dependency to task
 * POST /api/tasks/:id/dependencies
 */
const addDependency = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { dependsOn, type = 'blocked_by' } = req.body;
    const userId = req.userID;

    if (!dependsOn) {
        throw CustomException('dependsOn task ID is required', 400);
    }

    const task = await Task.findById(id);
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const dependentTask = await Task.findById(dependsOn);
    if (!dependentTask) {
        throw CustomException('المهمة المحددة غير موجودة', 404);
    }

    // Prevent self-reference
    if (id === dependsOn) {
        throw CustomException('لا يمكن للمهمة أن تعتمد على نفسها', 400);
    }

    // Check if dependency already exists
    if (task.blockedBy.some(t => t.toString() === dependsOn)) {
        throw CustomException('هذه التبعية موجودة بالفعل', 400);
    }

    // Check for circular dependency
    if (await hasCircularDependency(id, dependsOn)) {
        throw CustomException('لا يمكن إنشاء تبعية دائرية', 400);
    }

    const user = await User.findById(userId).select('firstName lastName');

    // Add to blockedBy array
    task.blockedBy.push(dependsOn);
    task.dependencies.push({ taskId: dependsOn, type });

    // Add to dependent task's blocks array
    dependentTask.blocks.push(id);

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

    const task = await Task.findById(id);
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const dependentTask = await Task.findById(dependencyTaskId);

    // Remove from blockedBy
    task.blockedBy = task.blockedBy.filter(t => t.toString() !== dependencyTaskId);
    task.dependencies = task.dependencies.filter(d => d.taskId.toString() !== dependencyTaskId);

    // Remove from dependent task's blocks array
    if (dependentTask) {
        dependentTask.blocks = dependentTask.blocks.filter(t => t.toString() !== id);
        await dependentTask.save();
    }

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
    const { status } = req.body;
    const userId = req.userID;

    const task = await Task.findById(id).populate('blockedBy', 'title status');

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

    const populatedTask = await Task.findById(id)
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
    const { progress, autoCalculate } = req.body;
    const userId = req.userID;

    const task = await Task.findById(id);

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

    const populatedTask = await Task.findById(id)
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
 * Evaluate and execute workflow rules
 */
async function evaluateWorkflowRules(task, triggerType, context) {
    if (!task.workflowRules || task.workflowRules.length === 0) {
        return;
    }

    const rules = task.workflowRules.filter(r =>
        r.isActive && r.trigger.type === triggerType
    );

    for (const rule of rules) {
        // Check conditions
        const conditionsMet = rule.conditions.every(cond => {
            const fieldValue = task[cond.field];
            switch (cond.operator) {
                case 'equals': return fieldValue === cond.value;
                case 'not_equals': return fieldValue !== cond.value;
                case 'contains': return fieldValue?.includes?.(cond.value);
                case 'greater_than': return fieldValue > cond.value;
                case 'less_than': return fieldValue < cond.value;
                default: return false;
            }
        });

        if (conditionsMet || rule.conditions.length === 0) {
            for (const action of rule.actions) {
                await executeWorkflowAction(task, action, { ...context, ruleName: rule.name });
            }
        }
    }
}

/**
 * Execute a workflow action
 */
async function executeWorkflowAction(task, action, context) {
    switch (action.type) {
        case 'create_task':
            if (action.taskTemplate) {
                const template = action.taskTemplate;
                const dueDate = template.dueDateOffset
                    ? new Date(Date.now() + template.dueDateOffset * 24 * 60 * 60 * 1000)
                    : null;

                // Interpolate template strings
                const interpolate = (str) => {
                    if (!str) return str;
                    return str
                        .replace(/\$\{caseNumber\}/g, task.caseId?.caseNumber || '')
                        .replace(/\$\{caseTitle\}/g, task.caseId?.title || '')
                        .replace(/\$\{taskTitle\}/g, task.title || '');
                };

                await Task.create({
                    title: interpolate(template.title) || `متابعة: ${task.title}`,
                    description: interpolate(template.description),
                    taskType: template.taskType || 'general',
                    priority: template.priority || task.priority,
                    dueDate,
                    caseId: task.caseId,
                    clientId: task.clientId,
                    assignedTo: template.assignedTo || task.assignedTo,
                    createdBy: context.userId,
                    parentTaskId: task._id,
                    history: [{
                        action: 'created',
                        userId: context.userId,
                        userName: context.userName,
                        timestamp: new Date(),
                        details: `تم إنشاء المهمة تلقائياً من قاعدة: ${context.ruleName}`
                    }]
                });
            }
            break;

        case 'assign_user':
            if (action.value) {
                task.assignedTo = action.value;
            }
            break;

        case 'update_field':
            if (action.field && action.value !== undefined) {
                task[action.field] = action.value;
            }
            break;
    }
}

/**
 * Add workflow rule to task
 * POST /api/tasks/:id/workflow-rules
 */
const addWorkflowRule = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, trigger, conditions, actions } = req.body;

    const task = await Task.findById(id);
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

    const task = await Task.findById(id);
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    task.outcome = outcome;
    task.outcomeNotes = outcomeNotes;
    task.outcomeDate = new Date();

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

    const task = await Task.findById(id);
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

    const task = await Task.findById(id)
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
    const { title, completed } = req.body;

    const task = await Task.findById(id);
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const subtask = task.subtasks.id(subtaskId);
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

/**
 * Get download URL for an attachment
 * GET /api/tasks/:id/attachments/:attachmentId/download-url
 * Query params:
 *   - versionId (optional): specific S3 version ID for versioned buckets
 *   - disposition (optional): 'inline' for preview, 'attachment' for download (default)
 * Returns a fresh presigned URL for S3 files or the local URL
 * Verifies user has access to the task/attachment before generating URL
 */
const getAttachmentDownloadUrl = asyncHandler(async (req, res) => {
    const { id, attachmentId } = req.params;
    const { versionId, disposition = 'attachment' } = req.query;
    const userId = req.userID;

    const task = await Task.findById(id);
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    // Verify user has access to this task
    const hasAccess =
        task.createdBy.toString() === userId ||
        task.assignedTo?.toString() === userId;

    if (!hasAccess) {
        throw CustomException('You do not have access to this attachment', 403);
    }

    const attachment = task.attachments.id(attachmentId);
    if (!attachment) {
        throw CustomException('Attachment not found', 404);
    }

    let downloadUrl = attachment.fileUrl;
    let currentVersionId = null;

    // If S3 storage, generate a fresh presigned URL
    if (attachment.storageType === 's3' && attachment.fileKey) {
        try {
            // Support versioning and disposition (inline for preview, attachment for download)
            downloadUrl = await getTaskFilePresignedUrl(
                attachment.fileKey,
                attachment.fileName,
                versionId || null,
                disposition, // 'inline' or 'attachment'
                attachment.fileType // Content-Type for proper browser handling
            );
            if (!downloadUrl) {
                throw new Error('Failed to generate presigned URL - S3 may not be configured');
            }
            currentVersionId = versionId || null;

            // Log file access asynchronously (don't wait for it)
            const action = disposition === 'inline' ? 'preview' : 'download';
            logFileAccess(attachment.fileKey, 'tasks', userId, action, {
                taskId: id,
                attachmentId,
                fileName: attachment.fileName,
                versionId: versionId || 'latest'
            }).catch(err => console.error('Failed to log access:', err.message));

        } catch (err) {
            console.error('Error generating presigned URL:', err);
            throw CustomException('Error generating download URL', 500);
        }
    }

    // Return downloadUrl at top level for frontend compatibility
    res.status(200).json({
        success: true,
        downloadUrl,
        versionId: currentVersionId,
        disposition,
        attachment: {
            _id: attachment._id,
            fileName: attachment.fileName,
            fileType: attachment.fileType,
            fileSize: attachment.fileSize
        }
    });
});

/**
 * Get all versions of an attachment (for versioned S3 buckets)
 * GET /api/tasks/:id/attachments/:attachmentId/versions
 * Returns list of all versions with metadata
 */
const getAttachmentVersions = asyncHandler(async (req, res) => {
    const { id, attachmentId } = req.params;
    const userId = req.userID;

    const task = await Task.findById(id);
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    // Verify user has access to this task
    const hasAccess =
        task.createdBy.toString() === userId ||
        task.assignedTo?.toString() === userId;

    if (!hasAccess) {
        throw CustomException('You do not have access to this attachment', 403);
    }

    const attachment = task.attachments.id(attachmentId);
    if (!attachment) {
        throw CustomException('Attachment not found', 404);
    }

    // Only S3 storage supports versioning
    if (attachment.storageType !== 's3' || !attachment.fileKey) {
        return res.status(200).json({
            success: true,
            versions: [],
            message: 'Versioning not available for local storage'
        });
    }

    try {
        const versions = await listFileVersions(attachment.fileKey, 'tasks');

        res.status(200).json({
            success: true,
            attachment: {
                _id: attachment._id,
                fileName: attachment.fileName,
                fileKey: attachment.fileKey
            },
            versions
        });
    } catch (err) {
        console.error('Error listing versions:', err);
        // If versioning is not enabled, return empty array
        if (err.name === 'NoSuchBucket' || err.Code === 'NoSuchBucket') {
            throw CustomException('Bucket not found', 404);
        }
        res.status(200).json({
            success: true,
            versions: [],
            message: 'Versioning may not be enabled on this bucket'
        });
    }
});

// ============================================
// DOCUMENT MANAGEMENT FUNCTIONS
// ============================================

/**
 * Create a new text/rich-text document in a task
 * POST /api/tasks/:id/documents
 */
const createDocument = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, content, contentJson, contentFormat = 'html' } = req.body;
    const userId = req.userID;

    if (!title) {
        throw CustomException('Document title is required', 400);
    }

    const task = await Task.findById(id);
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const user = await User.findById(userId).select('firstName lastName');

    // Handle different content formats (TipTap JSON or HTML)
    let sanitizedContent = '';
    let documentJson = null;

    if (contentFormat === 'tiptap-json' && contentJson) {
        // Store TipTap JSON directly (it's a structured format, not user HTML)
        documentJson = contentJson;
        // Also store HTML version for display/preview
        sanitizedContent = content ? sanitizeRichText(content) : '';
    } else {
        // HTML format - sanitize it
        sanitizedContent = sanitizeRichText(content || '');
        if (hasDangerousContent(content)) {
            throw CustomException('Invalid content detected', 400);
        }
    }

    // Calculate size based on content
    const contentSize = documentJson
        ? Buffer.byteLength(JSON.stringify(documentJson), 'utf8')
        : Buffer.byteLength(sanitizedContent, 'utf8');

    // Create document as an attachment with editable content
    const document = {
        fileName: title.endsWith('.html') ? title : `${title}.html`,
        fileUrl: null, // No file URL for in-app documents
        fileType: 'text/html',
        fileSize: contentSize,
        uploadedBy: userId,
        uploadedAt: new Date(),
        storageType: 'local',
        isEditable: true,
        documentContent: sanitizedContent,
        documentJson: documentJson,
        contentFormat: contentFormat,
        lastEditedBy: userId,
        lastEditedAt: new Date()
    };

    task.attachments.push(document);

    // Add history entry
    task.history.push({
        action: 'attachment_added',
        userId,
        userName: user ? `${user.firstName} ${user.lastName}` : undefined,
        details: `Created document: ${title}`,
        timestamp: new Date()
    });

    await task.save();

    const newDocument = task.attachments[task.attachments.length - 1];

    res.status(201).json({
        success: true,
        message: 'تم إنشاء المستند بنجاح',
        document: newDocument
    });
});

/**
 * Get all documents for a task
 * GET /api/tasks/:id/documents
 * Returns a list of all editable documents (TipTap documents) for a task
 */
const getDocuments = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    const task = await Task.findById(id)
        .populate('createdBy', '_id')
        .populate('assignedTo', '_id')
        .populate('attachments.uploadedBy', 'firstName lastName')
        .populate('attachments.lastEditedBy', 'firstName lastName');

    if (!task) {
        throw CustomException('Task not found', 404);
    }

    // Verify user has access to this task
    const isCreator = task.createdBy && task.createdBy._id.toString() === userId;
    const isAssignee = task.assignedTo && task.assignedTo._id.toString() === userId;

    if (!isCreator && !isAssignee) {
        throw CustomException('You do not have access to this task', 403);
    }

    // Filter to get only editable documents (TipTap documents)
    const documents = task.attachments
        .filter(attachment => attachment.isEditable === true)
        .map(doc => ({
            _id: doc._id,
            fileName: doc.fileName,
            fileType: doc.fileType,
            fileSize: doc.fileSize,
            contentFormat: doc.contentFormat || 'html',
            isEditable: doc.isEditable,
            uploadedBy: doc.uploadedBy,
            uploadedAt: doc.uploadedAt,
            lastEditedBy: doc.lastEditedBy,
            lastEditedAt: doc.lastEditedAt
        }));

    res.status(200).json({
        success: true,
        documents,
        count: documents.length
    });
});

/**
 * Update a text/rich-text document in a task
 * PATCH /api/tasks/:id/documents/:documentId
 * Supports both HTML and TipTap JSON formats
 * Automatically saves version history before updating
 */
const updateDocument = asyncHandler(async (req, res) => {
    const { id, documentId } = req.params;
    const { title, content, contentJson, contentFormat, changeNote } = req.body;
    const userId = req.userID;

    const task = await Task.findById(id);
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const document = task.attachments.id(documentId);
    if (!document) {
        throw CustomException('Document not found', 404);
    }

    if (!document.isEditable) {
        throw CustomException('This document cannot be edited', 400);
    }

    const user = await User.findById(userId).select('firstName lastName');

    // Save current version to history before updating
    // Only save if there's actual content to preserve
    if (document.documentContent || document.documentJson) {
        try {
            await TaskDocumentVersion.createSnapshot(
                id,
                documentId,
                {
                    title: document.fileName,
                    documentContent: document.documentContent,
                    documentJson: document.documentJson,
                    contentFormat: document.contentFormat,
                    fileSize: document.fileSize
                },
                document.lastEditedBy || document.uploadedBy || userId,
                changeNote || 'Auto-saved before update'
            );
        } catch (err) {
            console.error('Error saving document version:', err);
            // Continue with update even if version save fails
        }
    }

    // Handle different content formats
    if (contentFormat === 'tiptap-json' && contentJson !== undefined) {
        // Update TipTap JSON content
        document.documentJson = contentJson;
        document.contentFormat = 'tiptap-json';
        // Also update HTML version if provided
        if (content !== undefined) {
            document.documentContent = sanitizeRichText(content);
        }
        document.fileSize = Buffer.byteLength(JSON.stringify(contentJson), 'utf8');
    } else if (content !== undefined) {
        // HTML format - sanitize it
        if (hasDangerousContent(content)) {
            throw CustomException('Invalid content detected', 400);
        }
        document.documentContent = sanitizeRichText(content);
        document.contentFormat = 'html';
        document.fileSize = Buffer.byteLength(document.documentContent, 'utf8');
    }

    // Update title if provided
    if (title) {
        document.fileName = title.endsWith('.html') ? title : `${title}.html`;
    }

    document.lastEditedBy = userId;
    document.lastEditedAt = new Date();

    // Add history entry
    task.history.push({
        action: 'updated',
        userId,
        userName: user ? `${user.firstName} ${user.lastName}` : undefined,
        details: `Updated document: ${document.fileName}`,
        timestamp: new Date()
    });

    await task.save();

    // Get current version number
    const currentVersion = await TaskDocumentVersion.getLatestVersionNumber(id, documentId);

    res.status(200).json({
        success: true,
        message: 'تم تحديث المستند بنجاح',
        document,
        version: currentVersion + 1 // Current document is one ahead of saved versions
    });
});

/**
 * Get document content
 * GET /api/tasks/:id/documents/:documentId
 * Returns both HTML and TipTap JSON format for editable documents
 */
const getDocument = asyncHandler(async (req, res) => {
    const { id, documentId } = req.params;

    const task = await Task.findById(id)
        .populate('attachments.uploadedBy', 'firstName lastName')
        .populate('attachments.lastEditedBy', 'firstName lastName');

    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const document = task.attachments.id(documentId);
    if (!document) {
        throw CustomException('Document not found', 404);
    }

    // If it's an editable document, return the content directly
    if (document.isEditable) {
        return res.status(200).json({
            success: true,
            document: {
                _id: document._id,
                fileName: document.fileName,
                fileType: document.fileType,
                fileSize: document.fileSize,
                content: document.documentContent || '',
                contentJson: document.documentJson || null,
                contentFormat: document.contentFormat || 'html',
                isEditable: document.isEditable,
                uploadedBy: document.uploadedBy,
                uploadedAt: document.uploadedAt,
                lastEditedBy: document.lastEditedBy,
                lastEditedAt: document.lastEditedAt
            }
        });
    }

    // For uploaded files, return the download URL
    let downloadUrl = document.fileUrl;
    if (document.storageType === 's3' && document.fileKey) {
        try {
            downloadUrl = await getTaskFilePresignedUrl(document.fileKey, document.fileName);
        } catch (err) {
            console.error('Error generating presigned URL:', err);
        }
    }

    res.status(200).json({
        success: true,
        document: {
            _id: document._id,
            fileName: document.fileName,
            fileType: document.fileType,
            fileSize: document.fileSize,
            downloadUrl,
            isEditable: document.isEditable,
            isVoiceMemo: document.isVoiceMemo,
            duration: document.duration,
            transcription: document.transcription,
            uploadedBy: document.uploadedBy,
            uploadedAt: document.uploadedAt
        }
    });
});

/**
 * Get version history for a TipTap document
 * GET /api/tasks/:id/documents/:documentId/versions
 */
const getDocumentVersions = asyncHandler(async (req, res) => {
    const { id, documentId } = req.params;
    const userId = req.userID;

    const task = await Task.findById(id)
        .populate('createdBy', '_id')
        .populate('assignedTo', '_id');

    if (!task) {
        throw CustomException('Task not found', 404);
    }

    // Verify user has access to this task
    const isCreator = task.createdBy && task.createdBy._id.toString() === userId;
    const isAssignee = task.assignedTo && task.assignedTo._id.toString() === userId;

    if (!isCreator && !isAssignee) {
        throw CustomException('You do not have access to this document', 403);
    }

    const document = task.attachments.id(documentId);
    if (!document) {
        throw CustomException('Document not found', 404);
    }

    if (!document.isEditable) {
        throw CustomException('This document does not support versioning', 400);
    }

    // Get version history from database
    const versions = await TaskDocumentVersion.getVersionHistory(id, documentId);

    // Get current version number
    const latestVersionNum = versions.length > 0 ? versions[0].version : 0;

    // Add current document as the latest version (not yet saved to history)
    const currentVersion = {
        _id: 'current',
        version: latestVersionNum + 1,
        title: document.fileName,
        fileSize: document.fileSize,
        contentFormat: document.contentFormat,
        editedBy: document.lastEditedBy || document.uploadedBy,
        createdAt: document.lastEditedAt || document.uploadedAt,
        isCurrent: true
    };

    res.status(200).json({
        success: true,
        document: {
            _id: document._id,
            fileName: document.fileName,
            isEditable: document.isEditable
        },
        versions: [currentVersion, ...versions]
    });
});

/**
 * Restore a previous version of a TipTap document
 * POST /api/tasks/:id/documents/:documentId/versions/:versionId/restore
 */
const restoreDocumentVersion = asyncHandler(async (req, res) => {
    const { id, documentId, versionId } = req.params;
    const userId = req.userID;

    const task = await Task.findById(id)
        .populate('createdBy', '_id')
        .populate('assignedTo', '_id');

    if (!task) {
        throw CustomException('Task not found', 404);
    }

    // Verify user has access to this task
    const isCreator = task.createdBy && task.createdBy._id.toString() === userId;
    const isAssignee = task.assignedTo && task.assignedTo._id.toString() === userId;

    if (!isCreator && !isAssignee) {
        throw CustomException('You do not have access to this document', 403);
    }

    const document = task.attachments.id(documentId);
    if (!document) {
        throw CustomException('Document not found', 404);
    }

    if (!document.isEditable) {
        throw CustomException('This document does not support versioning', 400);
    }

    // Find the version to restore
    const versionToRestore = await TaskDocumentVersion.findById(versionId);
    if (!versionToRestore || versionToRestore.documentId.toString() !== documentId) {
        throw CustomException('Version not found', 404);
    }

    const user = await User.findById(userId).select('firstName lastName');

    // Save current version to history before restoring
    if (document.documentContent || document.documentJson) {
        await TaskDocumentVersion.createSnapshot(
            id,
            documentId,
            {
                title: document.fileName,
                documentContent: document.documentContent,
                documentJson: document.documentJson,
                contentFormat: document.contentFormat,
                fileSize: document.fileSize
            },
            document.lastEditedBy || document.uploadedBy || userId,
            `Replaced by restore of v${versionToRestore.version}`
        );
    }

    // Restore the old version
    document.documentContent = versionToRestore.documentContent;
    document.documentJson = versionToRestore.documentJson;
    document.contentFormat = versionToRestore.contentFormat;
    document.fileSize = versionToRestore.fileSize;
    document.fileName = versionToRestore.title;
    document.lastEditedBy = userId;
    document.lastEditedAt = new Date();

    // Add history entry
    task.history.push({
        action: 'restored',
        userId,
        userName: user ? `${user.firstName} ${user.lastName}` : undefined,
        details: `Restored document "${document.fileName}" to version ${versionToRestore.version}`,
        timestamp: new Date()
    });

    await task.save();

    // Get new version number
    const currentVersion = await TaskDocumentVersion.getLatestVersionNumber(id, documentId);

    res.status(200).json({
        success: true,
        message: `تم استعادة النسخة ${versionToRestore.version} بنجاح`,
        document,
        restoredFromVersion: versionToRestore.version,
        currentVersion: currentVersion + 1
    });
});

/**
 * Get a specific version content
 * GET /api/tasks/:id/documents/:documentId/versions/:versionId
 */
const getDocumentVersion = asyncHandler(async (req, res) => {
    const { id, documentId, versionId } = req.params;
    const userId = req.userID;

    const task = await Task.findById(id)
        .populate('createdBy', '_id')
        .populate('assignedTo', '_id');

    if (!task) {
        throw CustomException('Task not found', 404);
    }

    // Verify user has access
    const isCreator = task.createdBy && task.createdBy._id.toString() === userId;
    const isAssignee = task.assignedTo && task.assignedTo._id.toString() === userId;

    if (!isCreator && !isAssignee) {
        throw CustomException('You do not have access to this document', 403);
    }

    const document = task.attachments.id(documentId);
    if (!document) {
        throw CustomException('Document not found', 404);
    }

    // If requesting current version
    if (versionId === 'current') {
        return res.status(200).json({
            success: true,
            version: {
                _id: 'current',
                version: (await TaskDocumentVersion.getLatestVersionNumber(id, documentId)) + 1,
                title: document.fileName,
                documentContent: document.documentContent,
                documentJson: document.documentJson,
                contentFormat: document.contentFormat,
                fileSize: document.fileSize,
                editedBy: document.lastEditedBy || document.uploadedBy,
                createdAt: document.lastEditedAt || document.uploadedAt,
                isCurrent: true
            }
        });
    }

    // Get specific version
    const version = await TaskDocumentVersion.findById(versionId)
        .populate('editedBy', 'firstName lastName fullName');

    if (!version || version.documentId.toString() !== documentId) {
        throw CustomException('Version not found', 404);
    }

    res.status(200).json({
        success: true,
        version
    });
});

/**
 * Add voice memo to task
 * POST /api/tasks/:id/voice-memos
 * Note: This endpoint expects the file to be uploaded via the attachments endpoint
 * with additional voice memo metadata
 */
const addVoiceMemo = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { duration, transcription } = req.body;
    const userId = req.userID;

    const task = await Task.findById(id);
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    if (!req.file) {
        throw CustomException('No audio file uploaded', 400);
    }

    const user = await User.findById(userId).select('firstName lastName');

    let voiceMemo;

    if (isS3Configured() && req.file.location) {
        // S3 upload
        voiceMemo = {
            fileName: req.file.originalname || `voice-memo-${Date.now()}.webm`,
            fileUrl: req.file.location,
            fileKey: req.file.key,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            uploadedBy: userId,
            uploadedAt: new Date(),
            storageType: 's3',
            isVoiceMemo: true,
            duration: duration || 0,
            transcription: transcription ? sanitizeRichText(transcription) : null
        };
    } else {
        // Local storage
        voiceMemo = {
            fileName: req.file.originalname || `voice-memo-${Date.now()}.webm`,
            fileUrl: `/uploads/tasks/${req.file.filename}`,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            uploadedBy: userId,
            uploadedAt: new Date(),
            storageType: 'local',
            isVoiceMemo: true,
            duration: duration || 0,
            transcription: transcription ? sanitizeRichText(transcription) : null
        };
    }

    task.attachments.push(voiceMemo);

    // Add history entry
    task.history.push({
        action: 'attachment_added',
        userId,
        userName: user ? `${user.firstName} ${user.lastName}` : undefined,
        details: `Voice memo (${duration || 0}s)`,
        timestamp: new Date()
    });

    await task.save();

    const newVoiceMemo = task.attachments[task.attachments.length - 1];

    // Generate download URL if S3
    let downloadUrl = newVoiceMemo.fileUrl;
    if (newVoiceMemo.storageType === 's3' && newVoiceMemo.fileKey) {
        try {
            downloadUrl = await getTaskFilePresignedUrl(newVoiceMemo.fileKey, newVoiceMemo.fileName);
        } catch (err) {
            console.error('Error generating presigned URL:', err);
        }
    }

    res.status(201).json({
        success: true,
        message: 'تم إضافة المذكرة الصوتية بنجاح',
        voiceMemo: {
            ...newVoiceMemo.toObject(),
            downloadUrl
        }
    });
});

/**
 * Update voice memo transcription
 * PATCH /api/tasks/:id/voice-memos/:memoId/transcription
 */
const updateVoiceMemoTranscription = asyncHandler(async (req, res) => {
    const { id, memoId } = req.params;
    const { transcription } = req.body;
    const userId = req.userID;

    const task = await Task.findById(id);
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const voiceMemo = task.attachments.id(memoId);
    if (!voiceMemo) {
        throw CustomException('Voice memo not found', 404);
    }

    if (!voiceMemo.isVoiceMemo) {
        throw CustomException('This attachment is not a voice memo', 400);
    }

    // Sanitize transcription
    voiceMemo.transcription = transcription ? sanitizeRichText(transcription) : null;

    await task.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث النص',
        voiceMemo
    });
});

// ==============================================
// VOICE-TO-TASK CONVERSION ENDPOINTS
// ==============================================

/**
 * Process voice transcription and create task/reminder/event
 * POST /api/tasks/voice-to-item
 */
const processVoiceToItem = asyncHandler(async (req, res) => {
    const { transcription, caseId, timezone, options } = req.body;
    const userId = req.userID;
    const firmId = req.firmId;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('لم يعد لديك صلاحية إنشاء مهام جديدة', 403);
    }

    if (!transcription || typeof transcription !== 'string' || transcription.trim().length === 0) {
        throw CustomException('Voice transcription is required', 400);
    }

    // Import voice-to-task service
    const voiceToTaskService = require('../services/voiceToTask.service');

    try {
        // Process the voice transcription to determine type
        const processOptions = {
            timezone: timezone || 'Asia/Riyadh',
            currentDateTime: new Date(),
            caseId,
            ...options
        };

        const processed = await voiceToTaskService.processVoiceTranscription(
            transcription,
            userId,
            firmId,
            processOptions
        );

        // Create the appropriate item based on detected type
        let createdItem;
        let itemType = processed.type;

        switch (processed.type) {
            case 'task':
                createdItem = await voiceToTaskService.createTaskFromVoice(
                    transcription,
                    userId,
                    firmId,
                    caseId
                );
                break;

            case 'reminder':
                createdItem = await voiceToTaskService.createReminderFromVoice(
                    transcription,
                    userId,
                    firmId
                );
                break;

            case 'event':
                createdItem = await voiceToTaskService.createEventFromVoice(
                    transcription,
                    userId,
                    firmId
                );
                break;

            default:
                // Default to task if type is uncertain
                createdItem = await voiceToTaskService.createTaskFromVoice(
                    transcription,
                    userId,
                    firmId,
                    caseId
                );
                itemType = 'task';
        }

        res.status(201).json({
            success: true,
            message: `${itemType === 'task' ? 'Task' : itemType === 'reminder' ? 'Reminder' : 'Event'} created successfully from voice`,
            type: itemType,
            data: createdItem,
            confidence: processed.confidence,
            metadata: processed.metadata
        });
    } catch (error) {
        console.error('Voice to item conversion error:', error);
        throw CustomException(error.message || 'Failed to create item from voice', 500);
    }
});

/**
 * Batch process voice memos into tasks/reminders/events
 * POST /api/tasks/voice-to-item/batch
 */
const batchProcessVoiceMemos = asyncHandler(async (req, res) => {
    const { memos } = req.body;
    const userId = req.userID;
    const firmId = req.firmId;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('لم يعد لديك صلاحية إنشاء مهام جديدة', 403);
    }

    if (!Array.isArray(memos) || memos.length === 0) {
        throw CustomException('Memos array is required and must not be empty', 400);
    }

    // Import voice-to-task service
    const voiceToTaskService = require('../services/voiceToTask.service');

    try {
        const results = await voiceToTaskService.processVoiceMemos(memos, userId, firmId);

        const summary = {
            total: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            byType: {
                task: results.filter(r => r.type === 'task').length,
                reminder: results.filter(r => r.type === 'reminder').length,
                event: results.filter(r => r.type === 'event').length
            }
        };

        res.status(200).json({
            success: true,
            message: `Processed ${summary.successful} of ${summary.total} voice memos successfully`,
            summary,
            results
        });
    } catch (error) {
        console.error('Batch voice processing error:', error);
        throw CustomException(error.message || 'Failed to process voice memos', 500);
    }
});

// ==============================================
// NLP & AI-POWERED TASK ENDPOINTS
// ==============================================

/**
 * Create task from natural language
 * POST /api/tasks/parse
 */
const createTaskFromNaturalLanguage = asyncHandler(async (req, res) => {
    const { text } = req.body;
    const userId = req.userID;
    const firmId = req.firmId;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('لم يعد لديك صلاحية إنشاء مهام جديدة', 403);
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw CustomException('Natural language text is required', 400);
    }

    // Import NLP service
    const nlpService = require('../services/nlp.service');

    // Parse the natural language input
    const context = {
        timezone: 'Asia/Riyadh',
        currentDateTime: new Date()
    };

    const parseResult = await nlpService.parseEventFromText(text, context);

    if (!parseResult.success) {
        throw CustomException('Failed to parse natural language input', 400);
    }

    const { eventData, confidence } = parseResult;

    // Map event data to task data
    const taskData = {
        title: eventData.title || 'Untitled Task',
        description: eventData.description || eventData.notes || '',
        priority: eventData.priority || 'medium',
        status: 'pending',
        dueDate: eventData.startDateTime,
        dueTime: eventData.startDateTime
            ? `${String(new Date(eventData.startDateTime).getHours()).padStart(2, '0')}:${String(new Date(eventData.startDateTime).getMinutes()).padStart(2, '0')}`
            : null,
        tags: eventData.tags || [],
        notes: eventData.notes || '',
        createdBy: userId,
        firmId,
        metadata: {
            nlpParsed: true,
            originalText: text,
            parsingConfidence: confidence,
            parsedAt: new Date()
        }
    };

    // Create the task
    const task = await Task.create(taskData);

    res.status(201).json({
        success: true,
        message: 'Task created from natural language',
        task,
        parsingDetails: {
            confidence,
            originalText: text,
            tokensUsed: parseResult.tokensUsed || 0
        }
    });
});

/**
 * Create task from voice transcription
 * POST /api/tasks/voice
 */
const createTaskFromVoice = asyncHandler(async (req, res) => {
    const { transcription } = req.body;
    const userId = req.userID;
    const firmId = req.firmId;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('لم يعد لديك صلاحية إنشاء مهام جديدة', 403);
    }

    if (!transcription || typeof transcription !== 'string' || transcription.trim().length === 0) {
        throw CustomException('Voice transcription is required', 400);
    }

    // Import voice to task service
    const voiceToTaskService = require('../services/voiceToTask.service');

    // Process voice transcription
    const context = {
        timezone: 'Asia/Riyadh',
        currentDateTime: new Date(),
        userId
    };

    const result = await voiceToTaskService.processVoiceTranscription(transcription, context);

    if (!result.success) {
        throw CustomException('Failed to process voice transcription', 400);
    }

    const { eventData, confidence, metadata } = result;

    // Map event data to task data
    const taskData = {
        title: eventData.title || 'Untitled Task',
        description: eventData.description || eventData.notes || '',
        priority: eventData.priority || 'medium',
        status: 'pending',
        dueDate: eventData.startDateTime,
        dueTime: eventData.startDateTime
            ? `${String(new Date(eventData.startDateTime).getHours()).padStart(2, '0')}:${String(new Date(eventData.startDateTime).getMinutes()).padStart(2, '0')}`
            : null,
        tags: eventData.tags || [],
        notes: eventData.notes || '',
        createdBy: userId,
        firmId,
        metadata: {
            voiceCreated: true,
            originalTranscription: metadata.originalTranscription,
            cleanedTranscription: metadata.cleanedTranscription,
            parsingConfidence: confidence,
            processedAt: metadata.processedAt
        }
    };

    // Create the task
    const task = await Task.create(taskData);

    res.status(201).json({
        success: true,
        message: 'Task created from voice transcription',
        task,
        processingDetails: {
            confidence,
            originalTranscription: metadata.originalTranscription,
            cleanedTranscription: metadata.cleanedTranscription
        }
    });
});

/**
 * Get smart schedule suggestions
 * GET /api/tasks/smart-schedule
 */
const getSmartScheduleSuggestions = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Import smart scheduling service
    const SmartSchedulingService = require('../services/smartScheduling.service');

    // Get query parameters
    const {
        timezone = 'Asia/Riyadh',
        daysAhead = 7,
        includeWorkloadAnalysis = 'true',
        includeDailyNudges = 'true'
    } = req.query;

    // Get user patterns and suggestions
    const patterns = await SmartSchedulingService.getUserPatterns(userId, firmId);

    // Get workload analysis
    const workloadAnalysis = includeWorkloadAnalysis === 'true'
        ? await SmartSchedulingService.analyzeWorkload(userId, firmId, {
            start: new Date(),
            end: new Date(Date.now() + parseInt(daysAhead) * 24 * 60 * 60 * 1000)
        })
        : null;

    // Get daily nudges
    const dailyNudges = includeDailyNudges === 'true'
        ? await SmartSchedulingService.getDailyNudges(userId, firmId)
        : null;

    // Get unscheduled tasks
    const unscheduledTasks = await Task.find({
        firmId,
        createdBy: userId,
        status: { $in: ['pending', 'in_progress'] },
        $or: [
            { dueDate: null },
            { dueTime: null }
        ],
        isDeleted: false
    })
        .select('title priority tags timeTracking')
        .limit(10)
        .lean();

    // Generate suggestions for unscheduled tasks
    const taskSuggestions = [];
    for (const task of unscheduledTasks.slice(0, 5)) {
        const suggestion = await SmartSchedulingService.suggestBestTime(userId, firmId, {
            priority: task.priority || 'medium',
            estimatedMinutes: task.timeTracking?.estimatedMinutes || 60,
            taskType: task.taskType || 'general',
            dueDate: task.dueDate
        });

        taskSuggestions.push({
            taskId: task._id,
            taskTitle: task.title,
            suggestion
        });
    }

    res.status(200).json({
        success: true,
        patterns,
        workloadAnalysis,
        dailyNudges,
        taskSuggestions,
        unscheduledTasksCount: unscheduledTasks.length
    });
});

/**
 * Auto-schedule multiple tasks
 * POST /api/tasks/auto-schedule
 */
const autoScheduleTasks = asyncHandler(async (req, res) => {
    const { taskIds } = req.body;
    const userId = req.userID;
    const firmId = req.firmId;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('لم يعد لديك صلاحية تعديل المهام', 403);
    }

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        throw CustomException('Array of task IDs is required', 400);
    }

    if (taskIds.length > 20) {
        throw CustomException('Cannot auto-schedule more than 20 tasks at once', 400);
    }

    // Import smart scheduling service
    const SmartSchedulingService = require('../services/smartScheduling.service');

    // Fetch tasks
    const tasks = await Task.find({
        _id: { $in: taskIds },
        createdBy: userId,
        firmId,
        isDeleted: false
    });

    if (tasks.length === 0) {
        throw CustomException('No valid tasks found', 404);
    }

    // Auto-schedule tasks
    const suggestions = await SmartSchedulingService.autoSchedule(userId, firmId, tasks);

    // Apply scheduling suggestions
    const updatedTasks = [];
    for (const suggestion of suggestions) {
        if (suggestion.suggestedDateTime) {
            const task = tasks.find(t => t._id.toString() === suggestion.taskId.toString());
            if (task) {
                task.dueDate = suggestion.suggestedDateTime;
                task.dueTime = suggestion.suggestedDueTime;

                // Add metadata
                if (!task.metadata) task.metadata = {};
                task.metadata.aiScheduled = true;
                task.metadata.scheduledAt = new Date();
                task.metadata.schedulingConfidence = suggestion.confidence;
                task.metadata.schedulingReason = suggestion.reason;

                await task.save();
                updatedTasks.push(task);
            }
        }
    }

    res.status(200).json({
        success: true,
        message: `Successfully auto-scheduled ${updatedTasks.length} task(s)`,
        scheduledTasks: updatedTasks,
        suggestions,
        totalProcessed: tasks.length,
        totalScheduled: updatedTasks.length
    });
});

/**
 * Get task with all related data (GOLD STANDARD - single API call)
 * GET /api/tasks/:id/full
 * Replaces 3-4 separate API calls with 1 parallel query
 */
const getTaskFull = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    // Fetch task with full population
    const task = await Task.findById(id)
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

    // Verify user has access
    const isCreator = task.createdBy && task.createdBy._id.toString() === userId;
    const isAssignee = task.assignedTo && task.assignedTo._id.toString() === userId;

    if (!isCreator && !isAssignee) {
        throw CustomException('You do not have access to this task', 403);
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

    // Filter documents (TipTap editable documents)
    const documents = (task.attachments || [])
        .filter(attachment => attachment.isEditable === true)
        .map(doc => ({
            _id: doc._id,
            fileName: doc.fileName,
            fileType: doc.fileType,
            fileSize: doc.fileSize,
            contentFormat: doc.contentFormat || 'html',
            createdAt: doc.uploadedAt,
            updatedAt: doc.lastEditedAt,
            uploadedBy: doc.uploadedBy,
            lastEditedBy: doc.lastEditedBy
        }));

    // Build response
    res.status(200).json({
        success: true,
        task: {
            _id: task._id,
            title: task.title,
            description: task.description,
            priority: task.priority,
            status: task.status,
            label: task.label,
            tags: task.tags,
            dueDate: task.dueDate,
            dueTime: task.dueTime,
            startDate: task.startDate,
            assignedTo: task.assignedTo,
            createdBy: task.createdBy,
            caseId: task.caseId,
            clientId: task.clientId,
            subtasks: task.subtasks,
            checklists: task.checklists,
            recurring: task.recurring,
            notes: task.notes,
            progress: task.progress,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        },
        timeTracking: {
            totalHours: Math.round((actualMinutes / 60) * 100) / 100,
            estimatedHours: Math.round((estimatedMinutes / 60) * 100) / 100,
            remainingHours: Math.round((Math.max(0, estimatedMinutes - actualMinutes) / 60) * 100) / 100,
            percentComplete: estimatedMinutes > 0
                ? Math.round((actualMinutes / estimatedMinutes) * 100)
                : 0,
            isOverBudget: actualMinutes > estimatedMinutes,
            entries: sessions.map(s => ({
                _id: s._id,
                userId: s.userId,
                startedAt: s.startedAt,
                endedAt: s.endedAt,
                duration: s.duration,
                description: s.description
            })),
            byUser: Object.values(timeByUser)
        },
        documents
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
    // Template functions
    getTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createFromTemplate,
    saveAsTemplate,
    // Attachment functions
    addAttachment,
    deleteAttachment,
    getAttachmentDownloadUrl,
    getAttachmentVersions,
    // Document functions
    createDocument,
    getDocuments,
    updateDocument,
    getDocument,
    getDocumentVersions,
    getDocumentVersion,
    restoreDocumentVersion,
    // Voice memo functions
    addVoiceMemo,
    updateVoiceMemoTranscription,
    // Voice-to-task conversion functions
    processVoiceToItem,
    batchProcessVoiceMemos,
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
    // NLP & AI functions
    createTaskFromNaturalLanguage,
    createTaskFromVoice,
    getSmartScheduleSuggestions,
    autoScheduleTasks,
    // Aggregated endpoints (GOLD STANDARD)
    getTaskFull
};
