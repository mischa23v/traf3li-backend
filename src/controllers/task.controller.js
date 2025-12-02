const { Task, User, Case } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { deleteFile } = require('../configs/s3');
const { isS3Configured, getTaskFilePresignedUrl, isS3Url, extractS3Key } = require('../configs/taskUpload');
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

    // Validate assignedTo user if provided
    if (assignedTo) {
        const assignedUser = await User.findById(assignedTo);
        if (!assignedUser) {
            throw new CustomException('Assigned user not found', 404);
        }
    }

    // If caseId provided, validate it exists
    if (caseId) {
        const caseDoc = await Case.findById(caseId);
        if (!caseDoc) {
            throw new CustomException('Case not found', 404);
        }
    }

    const task = await Task.create({
        title,
        description,
        priority: priority || 'medium',
        status: status || 'todo',
        label,
        tags,
        dueDate,
        dueTime,
        startDate,
        assignedTo: assignedTo || userId,
        createdBy: userId,
        caseId,
        clientId,
        parentTaskId,
        subtasks: subtasks || [],
        checklists: checklists || [],
        timeTracking: timeTracking || { estimatedMinutes: 0, actualMinutes: 0, sessions: [] },
        recurring,
        reminders: reminders || [],
        notes,
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

    const populatedTask = await Task.findById(task._id)
        .populate('assignedTo', 'firstName lastName username email image')
        .populate('createdBy', 'firstName lastName username email image')
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'firstName lastName');

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
    const query = {
        $or: [
            { assignedTo: userId },
            { createdBy: userId }
        ]
    };

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
        .skip((parseInt(page) - 1) * parseInt(limit));

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

    const task = await Task.findById(id)
        .populate('assignedTo', 'firstName lastName username email image')
        .populate('createdBy', 'firstName lastName username email image')
        .populate('caseId', 'title caseNumber category')
        .populate('clientId', 'firstName lastName email')
        .populate('completedBy', 'firstName lastName')
        .populate('comments.userId', 'firstName lastName image')
        .populate('timeTracking.sessions.userId', 'firstName lastName');

    if (!task) {
        throw new CustomException('Task not found', 404);
    }

    // Check access
    const hasAccess =
        task.assignedTo?._id.toString() === userId ||
        task.createdBy._id.toString() === userId;

    if (!hasAccess) {
        throw new CustomException('You do not have access to this task', 403);
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

    const task = await Task.findById(id);

    if (!task) {
        throw new CustomException('Task not found', 404);
    }

    // Check permission
    const canUpdate =
        task.createdBy.toString() === userId ||
        task.assignedTo?.toString() === userId;

    if (!canUpdate) {
        throw new CustomException('You do not have permission to update this task', 403);
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

    const populatedTask = await Task.findById(task._id)
        .populate('assignedTo', 'firstName lastName username email image')
        .populate('createdBy', 'firstName lastName username email image')
        .populate('caseId', 'title caseNumber');

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

    const task = await Task.findById(id);

    if (!task) {
        throw new CustomException('Task not found', 404);
    }

    // Only creator can delete
    if (task.createdBy.toString() !== userId) {
        throw new CustomException('Only the task creator can delete this task', 403);
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
        throw new CustomException('Task not found', 404);
    }

    const canComplete =
        task.assignedTo?.toString() === userId ||
        task.createdBy.toString() === userId;

    if (!canComplete) {
        throw new CustomException('You do not have permission to complete this task', 403);
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
        throw new CustomException('Task not found', 404);
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
        throw new CustomException('Task not found', 404);
    }

    const subtask = task.subtasks.id(subtaskId);
    if (!subtask) {
        throw new CustomException('Subtask not found', 404);
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
        throw new CustomException('Task not found', 404);
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
        throw new CustomException('Task not found', 404);
    }

    // Check for active session
    if (task.timeTracking.isTracking) {
        throw new CustomException('A timer is already running for this task', 400);
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
        throw new CustomException('Task not found', 404);
    }

    if (!task.timeTracking.isTracking) {
        throw new CustomException('No active timer found', 400);
    }

    const activeSession = task.timeTracking.sessions.find(s => !s.endedAt);
    if (!activeSession) {
        throw new CustomException('No active timer found', 400);
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
        throw new CustomException('Task not found', 404);
    }

    if (!minutes || minutes <= 0) {
        throw new CustomException('Minutes must be a positive number', 400);
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
    const { content, mentions } = req.body;
    const userId = req.userID;

    const task = await Task.findById(id);
    if (!task) {
        throw new CustomException('Task not found', 404);
    }

    task.comments.push({
        userId,
        content,
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
    const { content } = req.body;
    const userId = req.userID;

    const task = await Task.findById(id);
    if (!task) {
        throw new CustomException('Task not found', 404);
    }

    const comment = task.comments.id(commentId);
    if (!comment) {
        throw new CustomException('Comment not found', 404);
    }

    if (comment.userId.toString() !== userId) {
        throw new CustomException('You can only edit your own comments', 403);
    }

    comment.content = content;
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
        throw new CustomException('Task not found', 404);
    }

    const comment = task.comments.id(commentId);
    if (!comment) {
        throw new CustomException('Comment not found', 404);
    }

    if (comment.userId.toString() !== userId && task.createdBy.toString() !== userId) {
        throw new CustomException('You cannot delete this comment', 403);
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

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        throw new CustomException('Task IDs are required', 400);
    }

    // Verify access to all tasks
    const tasks = await Task.find({
        _id: { $in: taskIds },
        $or: [{ assignedTo: userId }, { createdBy: userId }]
    });

    if (tasks.length !== taskIds.length) {
        throw new CustomException('Some tasks are not accessible', 403);
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

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        throw new CustomException('Task IDs are required', 400);
    }

    // Verify ownership of all tasks
    const tasks = await Task.find({
        _id: { $in: taskIds },
        createdBy: userId
    });

    if (tasks.length !== taskIds.length) {
        throw new CustomException('Some tasks cannot be deleted', 403);
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

    const stats = await Task.getStats(userId);

    res.status(200).json({
        success: true,
        data: stats
    });
});

// Get upcoming tasks
const getUpcomingTasks = asyncHandler(async (req, res) => {
    const { days = 7 } = req.query;
    const userId = req.userID;

    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + parseInt(days));

    const tasks = await Task.find({
        $or: [{ assignedTo: userId }, { createdBy: userId }],
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

    const tasks = await Task.find({
        $or: [{ assignedTo: userId }, { createdBy: userId }],
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
        throw new CustomException('Case not found', 404);
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

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const tasks = await Task.find({
        $or: [{ assignedTo: userId }, { createdBy: userId }],
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
        throw new CustomException('Template not found', 404);
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
        throw new CustomException('Template not found or you do not have permission to update it', 404);
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
        throw new CustomException('Template not found or you do not have permission to delete it', 404);
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
        throw new CustomException('Template not found', 404);
    }

    // Validate assignedTo if provided
    if (assignedTo) {
        const assignedUser = await User.findById(assignedTo);
        if (!assignedUser) {
            throw new CustomException('Assigned user not found', 404);
        }
    }

    // Validate caseId if provided
    if (caseId) {
        const caseDoc = await Case.findById(caseId);
        if (!caseDoc) {
            throw new CustomException('Case not found', 404);
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
        throw new CustomException('Task not found', 404);
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
        throw new CustomException('Task not found', 404);
    }

    if (!req.file) {
        throw new CustomException('No file uploaded', 400);
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
        throw new CustomException('Task not found', 404);
    }

    const attachment = task.attachments.id(attachmentId);
    if (!attachment) {
        throw new CustomException('Attachment not found', 404);
    }

    // Only uploader or task creator can delete
    if (attachment.uploadedBy.toString() !== userId && task.createdBy.toString() !== userId) {
        throw new CustomException('You do not have permission to delete this attachment', 403);
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
        throw new CustomException('dependsOn task ID is required', 400);
    }

    const task = await Task.findById(id);
    if (!task) {
        throw new CustomException('Task not found', 404);
    }

    const dependentTask = await Task.findById(dependsOn);
    if (!dependentTask) {
        throw new CustomException('المهمة المحددة غير موجودة', 404);
    }

    // Prevent self-reference
    if (id === dependsOn) {
        throw new CustomException('لا يمكن للمهمة أن تعتمد على نفسها', 400);
    }

    // Check if dependency already exists
    if (task.blockedBy.some(t => t.toString() === dependsOn)) {
        throw new CustomException('هذه التبعية موجودة بالفعل', 400);
    }

    // Check for circular dependency
    if (await hasCircularDependency(id, dependsOn)) {
        throw new CustomException('لا يمكن إنشاء تبعية دائرية', 400);
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
        throw new CustomException('Task not found', 404);
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
        throw new CustomException('Task not found', 404);
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
        throw new CustomException('Task not found', 404);
    }

    if (!name || !trigger || !actions) {
        throw new CustomException('name, trigger, and actions are required', 400);
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
        throw new CustomException('Task not found', 404);
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
        throw new CustomException('Task not found', 404);
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
        throw new CustomException('Task not found', 404);
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
        throw new CustomException('Task not found', 404);
    }

    const subtask = task.subtasks.id(subtaskId);
    if (!subtask) {
        throw new CustomException('Subtask not found', 404);
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
 * Returns a fresh presigned URL for S3 files or the local URL
 */
const getAttachmentDownloadUrl = asyncHandler(async (req, res) => {
    const { id, attachmentId } = req.params;

    const task = await Task.findById(id);
    if (!task) {
        throw new CustomException('Task not found', 404);
    }

    const attachment = task.attachments.id(attachmentId);
    if (!attachment) {
        throw new CustomException('Attachment not found', 404);
    }

    let downloadUrl = attachment.fileUrl;

    // If S3 storage, generate a fresh presigned URL
    if (attachment.storageType === 's3' && attachment.fileKey) {
        try {
            downloadUrl = await getTaskFilePresignedUrl(attachment.fileKey, attachment.fileName);
        } catch (err) {
            console.error('Error generating presigned URL:', err);
            throw new CustomException('Error generating download URL', 500);
        }
    }

    res.status(200).json({
        success: true,
        attachment: {
            _id: attachment._id,
            fileName: attachment.fileName,
            fileType: attachment.fileType,
            fileSize: attachment.fileSize,
            downloadUrl
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
    // Dependency functions
    addDependency,
    removeDependency,
    updateTaskStatus,
    // Workflow functions
    addWorkflowRule,
    updateOutcome,
    // Budget functions
    updateEstimate,
    getTimeTrackingSummary
};
