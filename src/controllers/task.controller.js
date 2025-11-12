const { Task, User, Case } = require('../models');
const { CustomException } = require('../utils');
const { syncTaskToCalendar } = require('./event.controller'); // ✅ ADDED

// Create task
const createTask = async (request, response) => {
    const { 
        title, 
        description, 
        priority, 
        status, 
        dueDate, 
        assignedTo, 
        caseId,
        recurring,
        tags,
        notes
    } = request.body;
    
    try {
        // Check if user is a lawyer
        const user = await User.findById(request.userID);
        if (!user.isSeller) {
            throw CustomException('Only lawyers can create tasks!', 403);
        }

        // Validate assignedTo user exists
        const assignedUser = await User.findById(assignedTo);
        if (!assignedUser) {
            throw CustomException('Assigned user not found!', 404);
        }

        // If caseId provided, validate it exists and user has access
        if (caseId) {
            const caseDoc = await Case.findById(caseId);
            if (!caseDoc) {
                throw CustomException('Case not found!', 404);
            }
            
            const hasAccess = caseDoc.lawyerId.toString() === request.userID;
            if (!hasAccess) {
                throw CustomException('You do not have access to this case!', 403);
            }
        }

        const taskData = {
            title,
            description,
            priority: priority || 'medium',
            status: status || 'todo',
            dueDate,
            assignedTo,
            createdBy: request.userID,
            ...(caseId && { caseId }),
            ...(recurring && { recurring }),
            ...(tags && { tags }),
            ...(notes && { notes })
        };

        const task = await Task.create(taskData);
        
        // ✅ ADDED: Sync to calendar
        await syncTaskToCalendar(task._id);
        
        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo', 'username image email')
            .populate('createdBy', 'username image email')
            .populate('caseId', 'title category');

        return response.status(201).send({
            error: false,
            message: 'Task created successfully!',
            task: populatedTask
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get all tasks (with filters)
const getTasks = async (request, response) => {
    const { status, priority, assignedTo, caseId, overdue } = request.query;
    
    try {
        const filters = {
            $or: [
                { assignedTo: request.userID },
                { createdBy: request.userID }
            ]
        };

        if (status) {
            filters.status = status;
        }

        if (priority) {
            filters.priority = priority;
        }

        if (assignedTo) {
            filters.assignedTo = assignedTo;
        }

        if (caseId) {
            filters.caseId = caseId;
        }

        // Filter for overdue tasks
        if (overdue === 'true') {
            filters.dueDate = { $lt: new Date() };
            filters.status = { $ne: 'done' };
        }

        const tasks = await Task.find(filters)
            .populate('assignedTo', 'username image email')
            .populate('createdBy', 'username image email')
            .populate('caseId', 'title category')
            .sort({ dueDate: 1, priority: -1, createdAt: -1 });

        return response.send({
            error: false,
            tasks,
            total: tasks.length
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get single task
const getTask = async (request, response) => {
    const { _id } = request.params;
    
    try {
        const task = await Task.findById(_id)
            .populate('assignedTo', 'username image email')
            .populate('createdBy', 'username image email')
            .populate('caseId', 'title category description');

        if (!task) {
            throw CustomException('Task not found!', 404);
        }

        // Check access (assigned user or creator)
        const hasAccess = 
            task.assignedTo._id.toString() === request.userID ||
            task.createdBy._id.toString() === request.userID;
        
        if (!hasAccess) {
            throw CustomException('You do not have access to this task!', 403);
        }

        return response.send({
            error: false,
            task
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Update task
const updateTask = async (request, response) => {
    const { _id } = request.params;
    
    try {
        const task = await Task.findById(_id);

        if (!task) {
            throw CustomException('Task not found!', 404);
        }

        // Only creator or assigned user can update
        const canUpdate = 
            task.createdBy.toString() === request.userID ||
            task.assignedTo.toString() === request.userID;

        if (!canUpdate) {
            throw CustomException('You do not have permission to update this task!', 403);
        }

        const updatedTask = await Task.findByIdAndUpdate(
            _id,
            { $set: request.body },
            { new: true }
        )
            .populate('assignedTo', 'username image email')
            .populate('createdBy', 'username image email')
            .populate('caseId', 'title category');

        // ✅ ADDED: Sync to calendar if due date changed
        if (request.body.dueDate) {
            await syncTaskToCalendar(updatedTask._id);
        }

        return response.status(202).send({
            error: false,
            message: 'Task updated successfully!',
            task: updatedTask
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Delete task
const deleteTask = async (request, response) => {
    const { _id } = request.params;
    
    try {
        const task = await Task.findById(_id);

        if (!task) {
            throw CustomException('Task not found!', 404);
        }

        // Only creator can delete
        if (task.createdBy.toString() !== request.userID) {
            throw CustomException('Only the task creator can delete this task!', 403);
        }

        await Task.findByIdAndDelete(_id);

        return response.send({
            error: false,
            message: 'Task deleted successfully!'
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Mark task as complete
const completeTask = async (request, response) => {
    const { _id } = request.params;
    
    try {
        const task = await Task.findById(_id);

        if (!task) {
            throw CustomException('Task not found!', 404);
        }

        // Assigned user or creator can mark as complete
        const canComplete = 
            task.assignedTo.toString() === request.userID ||
            task.createdBy.toString() === request.userID;

        if (!canComplete) {
            throw CustomException('You do not have permission to complete this task!', 403);
        }

        task.status = 'done';
        task.completedAt = new Date();
        await task.save();

        // ✅ ADDED: Sync completion to calendar
        await syncTaskToCalendar(task._id);

        // Handle recurring tasks
        if (task.recurring && task.recurring.enabled) {
            const nextDueDate = calculateNextDueDate(task.dueDate, task.recurring.frequency);
            
            // Create next occurrence
            const nextTask = await Task.create({
                title: task.title,
                description: task.description,
                priority: task.priority,
                status: 'todo',
                dueDate: nextDueDate,
                assignedTo: task.assignedTo,
                createdBy: task.createdBy,
                caseId: task.caseId,
                recurring: task.recurring,
                tags: task.tags,
                notes: task.notes
            });

            // ✅ ADDED: Sync new recurring task to calendar
            await syncTaskToCalendar(nextTask._id);

            return response.status(202).send({
                error: false,
                message: 'Task completed! Next occurrence created.',
                task,
                nextTask
            });
        }

        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo', 'username image email')
            .populate('createdBy', 'username image email')
            .populate('caseId', 'title category');

        return response.status(202).send({
            error: false,
            message: 'Task completed successfully!',
            task: populatedTask
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get upcoming tasks (next 7 days)
const getUpcomingTasks = async (request, response) => {
    try {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        const tasks = await Task.find({
            $or: [
                { assignedTo: request.userID },
                { createdBy: request.userID }
            ],
            dueDate: { $gte: today, $lte: nextWeek },
            status: { $ne: 'done' }
        })
            .populate('assignedTo', 'username image email')
            .populate('createdBy', 'username image email')
            .populate('caseId', 'title category')
            .sort({ dueDate: 1 });

        return response.send({
            error: false,
            tasks,
            total: tasks.length
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get overdue tasks
const getOverdueTasks = async (request, response) => {
    try {
        const today = new Date();

        const tasks = await Task.find({
            $or: [
                { assignedTo: request.userID },
                { createdBy: request.userID }
            ],
            dueDate: { $lt: today },
            status: { $ne: 'done' }
        })
            .populate('assignedTo', 'username image email')
            .populate('createdBy', 'username image email')
            .populate('caseId', 'title category')
            .sort({ dueDate: 1 });

        return response.send({
            error: false,
            tasks,
            total: tasks.length
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get tasks by case
const getTasksByCase = async (request, response) => {
    const { caseId } = request.params;
    
    try {
        const caseDoc = await Case.findById(caseId);
        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        // Check access
        const hasAccess = 
            caseDoc.lawyerId.toString() === request.userID ||
            (caseDoc.clientId && caseDoc.clientId.toString() === request.userID);

        if (!hasAccess) {
            throw CustomException('You do not have access to this case!', 403);
        }

        const tasks = await Task.find({ caseId })
            .populate('assignedTo', 'username image email')
            .populate('createdBy', 'username image email')
            .sort({ dueDate: 1 });

        return response.send({
            error: false,
            tasks,
            total: tasks.length
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Helper function to calculate next due date for recurring tasks
const calculateNextDueDate = (currentDueDate, frequency) => {
    const nextDate = new Date(currentDueDate);
    
    switch (frequency) {
        case 'daily':
            nextDate.setDate(nextDate.getDate() + 1);
            break;
        case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        default:
            nextDate.setDate(nextDate.getDate() + 1);
    }
    
    return nextDate;
};

module.exports = {
    createTask,
    getTasks,
    getTask,
    updateTask,
    deleteTask,
    completeTask,
    getUpcomingTasks,
    getOverdueTasks,
    getTasksByCase
};
