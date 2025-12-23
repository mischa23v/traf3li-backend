const SetupSection = require('../models/setupSection.model');
const SetupTask = require('../models/setupTask.model');
const UserSetupProgress = require('../models/userSetupProgress.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// ═══════════════════════════════════════════════════════════════
// GET FULL SETUP STATUS
// GET /api/setup/status
// ═══════════════════════════════════════════════════════════════
exports.getSetupStatus = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    // Get all sections and tasks
    const sections = await SetupSection.find({ isActive: true })
        .sort({ orderIndex: 1 })
        .lean();

    const tasks = await SetupTask.find({ isActive: true })
        .sort({ sectionId: 1, orderIndex: 1 })
        .lean();

    // Get user's progress
    const progress = await UserSetupProgress.find({ userId, firmId }).lean();

    // Create progress map
    const progressMap = {};
    progress.forEach(p => {
        progressMap[p.taskId] = p;
    });

    // Map tasks with progress
    const tasksWithProgress = tasks.map(task => ({
        ...task,
        progress: progressMap[task.taskId] || null,
        isCompleted: progressMap[task.taskId]?.isCompleted || false,
        skipped: progressMap[task.taskId]?.skipped || false
    }));

    // Group tasks by section
    const sectionsWithTasks = sections.map(section => {
        const sectionTasks = tasksWithProgress.filter(t => t.sectionId === section.sectionId);
        const completed = sectionTasks.filter(t => t.isCompleted || t.skipped).length;
        const total = sectionTasks.length;

        return {
            ...section,
            tasks: sectionTasks,
            progress: {
                completed,
                total,
                percentage: total > 0 ? Math.round((completed / total) * 100) : 0
            }
        };
    });

    // Calculate overall progress
    const allTasks = tasksWithProgress;
    const completedTasks = allTasks.filter(t => t.isCompleted || t.skipped).length;
    const requiredTasks = allTasks.filter(t => t.isRequired);
    const requiredCompleted = requiredTasks.filter(t => t.isCompleted || t.skipped).length;

    const overallProgress = {
        total: allTasks.length,
        completed: completedTasks,
        percentage: allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0,
        required: {
            total: requiredTasks.length,
            completed: requiredCompleted,
            isComplete: requiredCompleted >= requiredTasks.length
        }
    };

    res.status(200).json({
        success: true,
        data: {
            sections: sectionsWithTasks,
            overall: overallProgress
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET ALL SECTIONS
// GET /api/setup/sections
// ═══════════════════════════════════════════════════════════════
exports.getSections = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    // Get all active sections with their tasks
    const sections = await SetupSection.find({ isActive: true })
        .sort({ orderIndex: 1 })
        .lean();

    const sectionsWithTasks = await Promise.all(
        sections.map(async (section) => {
            const tasks = await SetupTask.find({
                sectionId: section.sectionId,
                isActive: true
            })
                .sort({ orderIndex: 1 })
                .lean();

            // Get progress for each task
            const tasksWithProgress = await Promise.all(
                tasks.map(async (task) => {
                    const progress = await UserSetupProgress.findOne({
                        userId,
                        firmId,
                        taskId: task.taskId
                    }).lean();

                    return {
                        ...task,
                        progress,
                        isCompleted: progress?.isCompleted || false,
                        skipped: progress?.skipped || false
                    };
                })
            );

            const completed = tasksWithProgress.filter(t => t.isCompleted || t.skipped).length;
            const total = tasksWithProgress.length;

            return {
                ...section,
                tasks: tasksWithProgress,
                progress: {
                    completed,
                    total,
                    percentage: total > 0 ? Math.round((completed / total) * 100) : 0
                }
            };
        })
    );

    res.status(200).json({
        success: true,
        data: sectionsWithTasks
    });
});

// ═══════════════════════════════════════════════════════════════
// COMPLETE TASK
// POST /api/setup/tasks/:taskId/complete
// ═══════════════════════════════════════════════════════════════
exports.completeTask = asyncHandler(async (req, res) => {
    const taskId = sanitizeObjectId(req.params.taskId, 'Task ID');
    const userId = req.userID;
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    // Validate taskId
    if (!taskId || typeof taskId !== 'string') {
        throw CustomException('Valid task ID is required', 400);
    }

    try {
        const progress = await UserSetupProgress.completeTask(userId, firmId, taskId);

        res.status(200).json({
            success: true,
            message: 'Task completed successfully',
            data: progress
        });
    } catch (error) {
        throw CustomException(error.message, 400);
    }
});

// ═══════════════════════════════════════════════════════════════
// SKIP TASK
// POST /api/setup/tasks/:taskId/skip
// ═══════════════════════════════════════════════════════════════
exports.skipTask = asyncHandler(async (req, res) => {
    const taskId = sanitizeObjectId(req.params.taskId, 'Task ID');
    const userId = req.userID;
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    // Validate taskId
    if (!taskId || typeof taskId !== 'string') {
        throw CustomException('Valid task ID is required', 400);
    }

    // Mass assignment protection
    const allowedFields = ['reason'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Validate reason if provided
    if (sanitizedData.reason && typeof sanitizedData.reason !== 'string') {
        throw CustomException('Reason must be a string', 400);
    }

    try {
        const progress = await UserSetupProgress.skipTask(userId, firmId, taskId, sanitizedData.reason);

        res.status(200).json({
            success: true,
            message: 'Task skipped successfully',
            data: progress
        });
    } catch (error) {
        throw CustomException(error.message, 400);
    }
});

// ═══════════════════════════════════════════════════════════════
// GET NEXT TASK
// GET /api/setup/next-task
// ═══════════════════════════════════════════════════════════════
exports.getNextTask = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    const nextTask = await UserSetupProgress.getNextTask(userId, firmId);

    if (!nextTask) {
        return res.status(200).json({
            success: true,
            message: 'All tasks completed',
            data: null
        });
    }

    res.status(200).json({
        success: true,
        data: nextTask
    });
});

// ═══════════════════════════════════════════════════════════════
// GET PROGRESS PERCENTAGE
// GET /api/setup/progress-percentage
// ═══════════════════════════════════════════════════════════════
exports.getProgressPercentage = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    const overallProgress = await UserSetupProgress.getOverallProgress(userId, firmId);

    res.status(200).json({
        success: true,
        data: overallProgress
    });
});

// ═══════════════════════════════════════════════════════════════
// RESET PROGRESS (Admin Only)
// POST /api/setup/reset
// ═══════════════════════════════════════════════════════════════
exports.resetProgress = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    await UserSetupProgress.resetAllProgress(userId, firmId);

    res.status(200).json({
        success: true,
        message: 'Setup progress reset successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS - SECTION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// CREATE SECTION
// POST /api/setup/admin/sections
exports.createSection = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const allowedFields = [
        'sectionId',
        'name',
        'nameAr',
        'description',
        'descriptionAr',
        'icon',
        'orderIndex',
        'isRequired',
        'isActive'
    ];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Validate required fields
    if (!sanitizedData.sectionId || !sanitizedData.name || sanitizedData.orderIndex === undefined) {
        throw CustomException('sectionId, name, and orderIndex are required', 400);
    }

    // Validate field types
    if (typeof sanitizedData.sectionId !== 'string' || typeof sanitizedData.name !== 'string') {
        throw CustomException('sectionId and name must be strings', 400);
    }

    if (typeof sanitizedData.orderIndex !== 'number' || sanitizedData.orderIndex < 0) {
        throw CustomException('orderIndex must be a non-negative number', 400);
    }

    if (sanitizedData.nameAr && typeof sanitizedData.nameAr !== 'string') {
        throw CustomException('nameAr must be a string', 400);
    }

    if (sanitizedData.description && typeof sanitizedData.description !== 'string') {
        throw CustomException('description must be a string', 400);
    }

    if (sanitizedData.descriptionAr && typeof sanitizedData.descriptionAr !== 'string') {
        throw CustomException('descriptionAr must be a string', 400);
    }

    if (sanitizedData.icon && typeof sanitizedData.icon !== 'string') {
        throw CustomException('icon must be a string', 400);
    }

    if (sanitizedData.isRequired !== undefined && typeof sanitizedData.isRequired !== 'boolean') {
        throw CustomException('isRequired must be a boolean', 400);
    }

    if (sanitizedData.isActive !== undefined && typeof sanitizedData.isActive !== 'boolean') {
        throw CustomException('isActive must be a boolean', 400);
    }

    // Check if section already exists
    const existingSection = await SetupSection.findOne({ sectionId: sanitizedData.sectionId });
    if (existingSection) {
        throw CustomException('Section with this ID already exists', 400);
    }

    const section = await SetupSection.create({
        sectionId: sanitizedData.sectionId,
        name: sanitizedData.name,
        nameAr: sanitizedData.nameAr,
        description: sanitizedData.description,
        descriptionAr: sanitizedData.descriptionAr,
        icon: sanitizedData.icon,
        orderIndex: sanitizedData.orderIndex,
        isRequired: sanitizedData.isRequired || false,
        isActive: sanitizedData.isActive !== undefined ? sanitizedData.isActive : true
    });

    res.status(201).json({
        success: true,
        message: 'Section created successfully',
        data: section
    });
});

// UPDATE SECTION
// PATCH /api/setup/admin/sections/:sectionId
exports.updateSection = asyncHandler(async (req, res) => {
    const sectionId = sanitizeObjectId(req.params.sectionId, 'Section ID');

    // Validate sectionId
    if (!sectionId || typeof sectionId !== 'string') {
        throw CustomException('Valid section ID is required', 400);
    }

    const section = await SetupSection.findOne({ sectionId });
    if (!section) {
        throw CustomException('Section not found', 404);
    }

    // Mass assignment protection
    const allowedFields = [
        'name',
        'nameAr',
        'description',
        'descriptionAr',
        'icon',
        'orderIndex',
        'isRequired',
        'isActive'
    ];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Validate field types if provided
    if (sanitizedData.name !== undefined && typeof sanitizedData.name !== 'string') {
        throw CustomException('name must be a string', 400);
    }

    if (sanitizedData.nameAr !== undefined && typeof sanitizedData.nameAr !== 'string') {
        throw CustomException('nameAr must be a string', 400);
    }

    if (sanitizedData.description !== undefined && typeof sanitizedData.description !== 'string') {
        throw CustomException('description must be a string', 400);
    }

    if (sanitizedData.descriptionAr !== undefined && typeof sanitizedData.descriptionAr !== 'string') {
        throw CustomException('descriptionAr must be a string', 400);
    }

    if (sanitizedData.icon !== undefined && typeof sanitizedData.icon !== 'string') {
        throw CustomException('icon must be a string', 400);
    }

    if (sanitizedData.orderIndex !== undefined) {
        if (typeof sanitizedData.orderIndex !== 'number' || sanitizedData.orderIndex < 0) {
            throw CustomException('orderIndex must be a non-negative number', 400);
        }
    }

    if (sanitizedData.isRequired !== undefined && typeof sanitizedData.isRequired !== 'boolean') {
        throw CustomException('isRequired must be a boolean', 400);
    }

    if (sanitizedData.isActive !== undefined && typeof sanitizedData.isActive !== 'boolean') {
        throw CustomException('isActive must be a boolean', 400);
    }

    // Update fields
    Object.keys(sanitizedData).forEach(field => {
        section[field] = sanitizedData[field];
    });

    await section.save();

    res.status(200).json({
        success: true,
        message: 'Section updated successfully',
        data: section
    });
});

// DELETE SECTION
// DELETE /api/setup/admin/sections/:sectionId
exports.deleteSection = asyncHandler(async (req, res) => {
    const sectionId = sanitizeObjectId(req.params.sectionId, 'Section ID');

    // Validate sectionId
    if (!sectionId || typeof sectionId !== 'string') {
        throw CustomException('Valid section ID is required', 400);
    }

    const section = await SetupSection.findOne({ sectionId });
    if (!section) {
        throw CustomException('Section not found', 404);
    }

    // Check if there are tasks in this section
    const tasksCount = await SetupTask.countDocuments({ sectionId });
    if (tasksCount > 0) {
        throw CustomException(
            'Cannot delete section with tasks. Delete or reassign tasks first.',
            400
        );
    }

    await SetupSection.deleteOne({ sectionId });

    res.status(200).json({
        success: true,
        message: 'Section deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS - TASK MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// CREATE TASK
// POST /api/setup/admin/tasks
exports.createTask = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const allowedFields = [
        'taskId',
        'sectionId',
        'name',
        'nameAr',
        'description',
        'descriptionAr',
        'orderIndex',
        'isRequired',
        'checkEndpoint',
        'actionUrl',
        'estimatedMinutes',
        'dependencies',
        'validationRules',
        'isActive'
    ];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Validate required fields
    if (!sanitizedData.taskId || !sanitizedData.sectionId || !sanitizedData.name || sanitizedData.orderIndex === undefined) {
        throw CustomException('taskId, sectionId, name, and orderIndex are required', 400);
    }

    // Validate field types
    if (typeof sanitizedData.taskId !== 'string' || typeof sanitizedData.sectionId !== 'string' || typeof sanitizedData.name !== 'string') {
        throw CustomException('taskId, sectionId, and name must be strings', 400);
    }

    if (typeof sanitizedData.orderIndex !== 'number' || sanitizedData.orderIndex < 0) {
        throw CustomException('orderIndex must be a non-negative number', 400);
    }

    if (sanitizedData.nameAr && typeof sanitizedData.nameAr !== 'string') {
        throw CustomException('nameAr must be a string', 400);
    }

    if (sanitizedData.description && typeof sanitizedData.description !== 'string') {
        throw CustomException('description must be a string', 400);
    }

    if (sanitizedData.descriptionAr && typeof sanitizedData.descriptionAr !== 'string') {
        throw CustomException('descriptionAr must be a string', 400);
    }

    if (sanitizedData.checkEndpoint && typeof sanitizedData.checkEndpoint !== 'string') {
        throw CustomException('checkEndpoint must be a string', 400);
    }

    if (sanitizedData.actionUrl && typeof sanitizedData.actionUrl !== 'string') {
        throw CustomException('actionUrl must be a string', 400);
    }

    if (sanitizedData.estimatedMinutes !== undefined) {
        if (typeof sanitizedData.estimatedMinutes !== 'number' || sanitizedData.estimatedMinutes < 0) {
            throw CustomException('estimatedMinutes must be a non-negative number', 400);
        }
    }

    if (sanitizedData.dependencies !== undefined && !Array.isArray(sanitizedData.dependencies)) {
        throw CustomException('dependencies must be an array', 400);
    }

    if (sanitizedData.validationRules !== undefined && typeof sanitizedData.validationRules !== 'object') {
        throw CustomException('validationRules must be an object', 400);
    }

    if (sanitizedData.isRequired !== undefined && typeof sanitizedData.isRequired !== 'boolean') {
        throw CustomException('isRequired must be a boolean', 400);
    }

    if (sanitizedData.isActive !== undefined && typeof sanitizedData.isActive !== 'boolean') {
        throw CustomException('isActive must be a boolean', 400);
    }

    // Check if section exists
    const section = await SetupSection.findOne({ sectionId: sanitizedData.sectionId });
    if (!section) {
        throw CustomException('Section not found', 404);
    }

    // Check if task already exists
    const existingTask = await SetupTask.findOne({ taskId: sanitizedData.taskId });
    if (existingTask) {
        throw CustomException('Task with this ID already exists', 400);
    }

    const task = await SetupTask.create({
        taskId: sanitizedData.taskId,
        sectionId: sanitizedData.sectionId,
        name: sanitizedData.name,
        nameAr: sanitizedData.nameAr,
        description: sanitizedData.description,
        descriptionAr: sanitizedData.descriptionAr,
        orderIndex: sanitizedData.orderIndex,
        isRequired: sanitizedData.isRequired || false,
        checkEndpoint: sanitizedData.checkEndpoint,
        actionUrl: sanitizedData.actionUrl,
        estimatedMinutes: sanitizedData.estimatedMinutes || 5,
        dependencies: sanitizedData.dependencies || [],
        validationRules: sanitizedData.validationRules || {},
        isActive: sanitizedData.isActive !== undefined ? sanitizedData.isActive : true
    });

    res.status(201).json({
        success: true,
        message: 'Task created successfully',
        data: task
    });
});

// UPDATE TASK
// PATCH /api/setup/admin/tasks/:taskId
exports.updateTask = asyncHandler(async (req, res) => {
    const taskId = sanitizeObjectId(req.params.taskId, 'Task ID');

    // Validate taskId
    if (!taskId || typeof taskId !== 'string') {
        throw CustomException('Valid task ID is required', 400);
    }

    const task = await SetupTask.findOne({ taskId });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    // Mass assignment protection
    const allowedFields = [
        'sectionId',
        'name',
        'nameAr',
        'description',
        'descriptionAr',
        'orderIndex',
        'isRequired',
        'checkEndpoint',
        'actionUrl',
        'estimatedMinutes',
        'dependencies',
        'validationRules',
        'isActive'
    ];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Validate field types if provided
    if (sanitizedData.sectionId !== undefined && typeof sanitizedData.sectionId !== 'string') {
        throw CustomException('sectionId must be a string', 400);
    }

    if (sanitizedData.name !== undefined && typeof sanitizedData.name !== 'string') {
        throw CustomException('name must be a string', 400);
    }

    if (sanitizedData.nameAr !== undefined && typeof sanitizedData.nameAr !== 'string') {
        throw CustomException('nameAr must be a string', 400);
    }

    if (sanitizedData.description !== undefined && typeof sanitizedData.description !== 'string') {
        throw CustomException('description must be a string', 400);
    }

    if (sanitizedData.descriptionAr !== undefined && typeof sanitizedData.descriptionAr !== 'string') {
        throw CustomException('descriptionAr must be a string', 400);
    }

    if (sanitizedData.orderIndex !== undefined) {
        if (typeof sanitizedData.orderIndex !== 'number' || sanitizedData.orderIndex < 0) {
            throw CustomException('orderIndex must be a non-negative number', 400);
        }
    }

    if (sanitizedData.checkEndpoint !== undefined && typeof sanitizedData.checkEndpoint !== 'string') {
        throw CustomException('checkEndpoint must be a string', 400);
    }

    if (sanitizedData.actionUrl !== undefined && typeof sanitizedData.actionUrl !== 'string') {
        throw CustomException('actionUrl must be a string', 400);
    }

    if (sanitizedData.estimatedMinutes !== undefined) {
        if (typeof sanitizedData.estimatedMinutes !== 'number' || sanitizedData.estimatedMinutes < 0) {
            throw CustomException('estimatedMinutes must be a non-negative number', 400);
        }
    }

    if (sanitizedData.dependencies !== undefined && !Array.isArray(sanitizedData.dependencies)) {
        throw CustomException('dependencies must be an array', 400);
    }

    if (sanitizedData.validationRules !== undefined && typeof sanitizedData.validationRules !== 'object') {
        throw CustomException('validationRules must be an object', 400);
    }

    if (sanitizedData.isRequired !== undefined && typeof sanitizedData.isRequired !== 'boolean') {
        throw CustomException('isRequired must be a boolean', 400);
    }

    if (sanitizedData.isActive !== undefined && typeof sanitizedData.isActive !== 'boolean') {
        throw CustomException('isActive must be a boolean', 400);
    }

    // If updating sectionId, verify it exists
    if (sanitizedData.sectionId && sanitizedData.sectionId !== task.sectionId) {
        const section = await SetupSection.findOne({ sectionId: sanitizedData.sectionId });
        if (!section) {
            throw CustomException('New section not found', 404);
        }
    }

    // Update fields
    Object.keys(sanitizedData).forEach(field => {
        task[field] = sanitizedData[field];
    });

    await task.save();

    res.status(200).json({
        success: true,
        message: 'Task updated successfully',
        data: task
    });
});

// DELETE TASK
// DELETE /api/setup/admin/tasks/:taskId
exports.deleteTask = asyncHandler(async (req, res) => {
    const taskId = sanitizeObjectId(req.params.taskId, 'Task ID');

    // Validate taskId
    if (!taskId || typeof taskId !== 'string') {
        throw CustomException('Valid task ID is required', 400);
    }

    const task = await SetupTask.findOne({ taskId });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    // Check if this task is a dependency for other tasks
    const dependentTasks = await SetupTask.find({
        dependencies: taskId,
        isActive: true
    });

    if (dependentTasks.length > 0) {
        const taskNames = dependentTasks.map(t => t.name).join(', ');
        throw CustomException(
            `Cannot delete task. It is a dependency for: ${taskNames}`,
            400
        );
    }

    // Delete all progress records for this task
    await UserSetupProgress.deleteMany({ taskId });

    await SetupTask.deleteOne({ taskId });

    res.status(200).json({
        success: true,
        message: 'Task deleted successfully'
    });
});
