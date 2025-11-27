const { Task, User, Case } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

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
    const activeSession = task.timeTracking.sessions.find(s => !s.endedAt);
    if (activeSession) {
        throw new CustomException('A timer is already running for this task', 400);
    }

    task.timeTracking.sessions.push({
        startedAt: new Date(),
        userId,
        notes
    });

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

    const task = await Task.findById(id);
    if (!task) {
        throw new CustomException('Task not found', 404);
    }

    const activeSession = task.timeTracking.sessions.find(s => !s.endedAt);
    if (!activeSession) {
        throw new CustomException('No active timer found', 400);
    }

    activeSession.endedAt = new Date();
    activeSession.duration = Math.round((activeSession.endedAt - activeSession.startedAt) / 60000);

    // Update total actual minutes
    task.timeTracking.actualMinutes = task.timeTracking.sessions
        .filter(s => s.endedAt)
        .reduce((total, s) => total + (s.duration || 0), 0);

    await task.save();

    res.status(200).json({
        success: true,
        message: 'Timer stopped',
        data: task.timeTracking
    });
});

// Add manual time
const addManualTime = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { minutes, notes, date } = req.body;
    const userId = req.userID;

    const task = await Task.findById(id);
    if (!task) {
        throw new CustomException('Task not found', 404);
    }

    const sessionDate = date ? new Date(date) : new Date();
    task.timeTracking.sessions.push({
        startedAt: sessionDate,
        endedAt: new Date(sessionDate.getTime() + minutes * 60000),
        duration: minutes,
        userId,
        notes
    });

    task.timeTracking.actualMinutes = (task.timeTracking.actualMinutes || 0) + minutes;

    await task.save();

    res.status(200).json({
        success: true,
        message: 'Time entry added',
        data: task.timeTracking
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
    saveAsTemplate
};
