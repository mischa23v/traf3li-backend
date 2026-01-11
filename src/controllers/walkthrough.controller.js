/**
 * Walkthrough Controller
 *
 * Manages user walkthroughs for onboarding and feature discovery.
 * Uses the existing SetupTask and UserSetupProgress models for tracking walkthrough progress.
 *
 * Features:
 * - List available walkthroughs
 * - Start/complete/skip walkthroughs
 * - Track progress per user/firm
 * - Admin management of walkthroughs
 */

const mongoose = require('mongoose');
const SetupTask = require('../models/setupTask.model');
const SetupSection = require('../models/setupSection.model');
const UserSetupProgress = require('../models/userSetupProgress.model');
const { User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { CustomException } = require('../utils');
const logger = require('../utils/contextLogger');
const auditLogService = require('../services/auditLog.service');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// ═══════════════════════════════════════════════════════════════
// USER ENDPOINTS - Walkthrough Management
// ═══════════════════════════════════════════════════════════════

/**
 * Get available walkthroughs for the authenticated user
 * GET /api/walkthroughs
 */
exports.listWalkthroughs = asyncHandler(async (req, res) => {
    const userId = req.userID || req.userId;
    const firmId = req.firmId;

    if (!userId) {
        throw CustomException('Authentication required', 401);
    }

    // Get all active sections (walkthroughs are organized by sections)
    const sections = await SetupSection.find({ isActive: true })
        .sort({ orderIndex: 1 })
        .lean();

    // Get user's progress for all tasks
    const allTasks = await SetupTask.find({ isActive: true }).lean();
    const progress = firmId
        ? await UserSetupProgress.find({ userId, firmId }).lean()
        : [];

    // Build progress map
    const progressMap = {};
    progress.forEach(p => {
        progressMap[p.taskId] = p;
    });

    // Build walkthroughs with progress
    const walkthroughs = await Promise.all(sections.map(async (section) => {
        const sectionTasks = allTasks.filter(t => t.sectionId === section.sectionId);
        const completedTasks = sectionTasks.filter(t =>
            progressMap[t.taskId]?.isCompleted || progressMap[t.taskId]?.skipped
        ).length;

        return {
            id: section.sectionId,
            name: section.name,
            nameAr: section.nameAr,
            description: section.description,
            descriptionAr: section.descriptionAr,
            icon: section.icon,
            category: section.category,
            estimatedMinutes: section.estimatedMinutes,
            orderIndex: section.orderIndex,
            isRequired: section.isRequired,
            taskCount: sectionTasks.length,
            completedCount: completedTasks,
            progress: sectionTasks.length > 0
                ? Math.round((completedTasks / sectionTasks.length) * 100)
                : 0,
            status: completedTasks === sectionTasks.length ? 'completed' :
                    completedTasks > 0 ? 'in_progress' : 'not_started'
        };
    }));

    res.json({
        success: true,
        data: walkthroughs,
        count: walkthroughs.length
    });
});

/**
 * Get specific walkthrough details
 * GET /api/walkthroughs/:id
 */
exports.getWalkthrough = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID || req.userId;
    const firmId = req.firmId;

    if (!userId) {
        throw CustomException('Authentication required', 401);
    }

    // Get section (walkthrough)
    const section = await SetupSection.findOne({
        sectionId: id,
        isActive: true
    }).lean();

    if (!section) {
        throw CustomException('Walkthrough not found', 404);
    }

    // Get tasks for this section
    const tasks = await SetupTask.find({
        sectionId: id,
        isActive: true
    })
        .sort({ orderIndex: 1 })
        .lean();

    // Get user's progress
    const taskIds = tasks.map(t => t.taskId);
    const progress = firmId
        ? await UserSetupProgress.find({
            userId,
            firmId,
            taskId: { $in: taskIds }
        }).lean()
        : [];

    // Build progress map
    const progressMap = {};
    progress.forEach(p => {
        progressMap[p.taskId] = p;
    });

    // Enhance tasks with progress
    const tasksWithProgress = tasks.map(task => ({
        id: task.taskId,
        name: task.name,
        nameAr: task.nameAr,
        description: task.description,
        descriptionAr: task.descriptionAr,
        orderIndex: task.orderIndex,
        isRequired: task.isRequired,
        actionUrl: task.actionUrl,
        checkEndpoint: task.checkEndpoint,
        estimatedMinutes: task.estimatedMinutes,
        dependencies: task.dependencies,
        isCompleted: progressMap[task.taskId]?.isCompleted || false,
        isSkipped: progressMap[task.taskId]?.skipped || false,
        completedAt: progressMap[task.taskId]?.completedAt,
        skippedAt: progressMap[task.taskId]?.skippedAt,
        timeSpentSeconds: progressMap[task.taskId]?.timeSpentSeconds || 0
    }));

    const completedCount = tasksWithProgress.filter(t => t.isCompleted || t.isSkipped).length;

    res.json({
        success: true,
        data: {
            walkthrough: {
                id: section.sectionId,
                name: section.name,
                nameAr: section.nameAr,
                description: section.description,
                descriptionAr: section.descriptionAr,
                icon: section.icon,
                category: section.category,
                estimatedMinutes: section.estimatedMinutes,
                isRequired: section.isRequired,
                taskCount: tasks.length,
                completedCount,
                progress: tasks.length > 0
                    ? Math.round((completedCount / tasks.length) * 100)
                    : 0
            },
            tasks: tasksWithProgress,
            currentStep: tasksWithProgress.findIndex(t => !t.isCompleted && !t.isSkipped)
        }
    });
});

/**
 * Start a walkthrough
 * POST /api/walkthroughs/:id/start
 */
exports.startWalkthrough = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID || req.userId;
    const firmId = req.firmId;

    if (!userId) {
        throw CustomException('Authentication required', 401);
    }

    // Verify walkthrough exists
    const section = await SetupSection.findOne({
        sectionId: id,
        isActive: true
    }).lean();

    if (!section) {
        throw CustomException('Walkthrough not found', 404);
    }

    // Get first task in walkthrough
    const firstTask = await SetupTask.findOne({
        sectionId: id,
        isActive: true
    })
        .sort({ orderIndex: 1 })
        .lean();

    if (!firstTask) {
        throw CustomException('No tasks found in this walkthrough', 404);
    }

    // Log walkthrough start
    if (firmId) {
        await auditLogService.log(
            'walkthrough_started',
            'user',
            userId,
            'SUCCESS',
            {
                userId,
                firmId,
                walkthroughId: id,
                walkthroughName: section.name,
                severity: 'low'
            }
        );
    }

    res.json({
        success: true,
        message: 'Walkthrough started',
        data: {
            walkthroughId: id,
            firstTaskId: firstTask.taskId,
            firstTaskUrl: firstTask.actionUrl
        }
    });
});

/**
 * Advance to next step in walkthrough
 * POST /api/walkthroughs/:id/step/next
 */
exports.nextStep = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID || req.userId;
    const firmId = req.firmId;

    if (!userId) {
        throw CustomException('Authentication required', 401);
    }

    if (!firmId) {
        throw CustomException('Firm context required', 400);
    }

    const { currentTaskId } = req.body;

    // Get all tasks in this walkthrough
    const tasks = await SetupTask.find({
        sectionId: id,
        isActive: true
    })
        .sort({ orderIndex: 1 })
        .lean();

    if (tasks.length === 0) {
        throw CustomException('No tasks found in this walkthrough', 404);
    }

    // If currentTaskId provided, mark it as completed
    if (currentTaskId) {
        await UserSetupProgress.completeTask(userId, firmId, currentTaskId);
    }

    // Get progress
    const taskIds = tasks.map(t => t.taskId);
    const progress = await UserSetupProgress.find({
        userId,
        firmId,
        taskId: { $in: taskIds }
    }).lean();

    const progressMap = {};
    progress.forEach(p => {
        progressMap[p.taskId] = p;
    });

    // Find next incomplete task
    const nextTask = tasks.find(t =>
        !progressMap[t.taskId]?.isCompleted && !progressMap[t.taskId]?.skipped
    );

    if (!nextTask) {
        // All tasks completed
        return res.json({
            success: true,
            message: 'Walkthrough completed',
            data: {
                completed: true,
                walkthroughId: id
            }
        });
    }

    res.json({
        success: true,
        data: {
            nextTask: {
                id: nextTask.taskId,
                name: nextTask.name,
                nameAr: nextTask.nameAr,
                description: nextTask.description,
                descriptionAr: nextTask.descriptionAr,
                actionUrl: nextTask.actionUrl,
                estimatedMinutes: nextTask.estimatedMinutes,
                orderIndex: nextTask.orderIndex
            },
            progress: {
                current: tasks.findIndex(t => t.taskId === nextTask.taskId) + 1,
                total: tasks.length
            }
        }
    });
});

/**
 * Skip a specific step in walkthrough
 * POST /api/walkthroughs/:id/step/:stepOrder/skip
 */
exports.skipStep = asyncHandler(async (req, res) => {
    const { id, stepOrder } = req.params;
    const userId = req.userID || req.userId;
    const firmId = req.firmId;

    if (!userId) {
        throw CustomException('Authentication required', 401);
    }

    if (!firmId) {
        throw CustomException('Firm context required', 400);
    }

    const { reason } = req.body;

    // Get task at this step order
    const task = await SetupTask.findOne({
        sectionId: id,
        orderIndex: parseInt(stepOrder),
        isActive: true
    }).lean();

    if (!task) {
        throw CustomException('Step not found', 404);
    }

    // Skip the task
    await UserSetupProgress.skipTask(userId, firmId, task.taskId, reason);

    // Log skip action
    await auditLogService.log(
        'walkthrough_step_skipped',
        'user',
        userId,
        'SUCCESS',
        {
            userId,
            firmId,
            walkthroughId: id,
            taskId: task.taskId,
            reason: reason || 'No reason provided',
            severity: 'low'
        }
    );

    res.json({
        success: true,
        message: 'Step skipped successfully',
        data: {
            taskId: task.taskId,
            skipped: true
        }
    });
});

/**
 * Complete entire walkthrough
 * POST /api/walkthroughs/:id/complete
 */
exports.completeWalkthrough = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID || req.userId;
    const firmId = req.firmId;

    if (!userId) {
        throw CustomException('Authentication required', 401);
    }

    if (!firmId) {
        throw CustomException('Firm context required', 400);
    }

    // Get all tasks in walkthrough
    const tasks = await SetupTask.find({
        sectionId: id,
        isActive: true
    }).lean();

    if (tasks.length === 0) {
        throw CustomException('Walkthrough not found', 404);
    }

    // Mark all incomplete tasks as completed
    for (const task of tasks) {
        const existing = await UserSetupProgress.findOne({
            userId,
            firmId,
            taskId: task.taskId
        });

        if (!existing || (!existing.isCompleted && !existing.skipped)) {
            await UserSetupProgress.completeTask(userId, firmId, task.taskId);
        }
    }

    // Log completion
    await auditLogService.log(
        'walkthrough_completed',
        'user',
        userId,
        'SUCCESS',
        {
            userId,
            firmId,
            walkthroughId: id,
            taskCount: tasks.length,
            severity: 'low'
        }
    );

    res.json({
        success: true,
        message: 'Walkthrough completed successfully',
        data: {
            walkthroughId: id,
            completedTasks: tasks.length
        }
    });
});

/**
 * Skip entire walkthrough
 * POST /api/walkthroughs/:id/skip
 */
exports.skipWalkthrough = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID || req.userId;
    const firmId = req.firmId;

    if (!userId) {
        throw CustomException('Authentication required', 401);
    }

    if (!firmId) {
        throw CustomException('Firm context required', 400);
    }

    const { reason } = req.body;

    // Get all tasks in walkthrough
    const tasks = await SetupTask.find({
        sectionId: id,
        isActive: true
    }).lean();

    if (tasks.length === 0) {
        throw CustomException('Walkthrough not found', 404);
    }

    // Skip all tasks
    for (const task of tasks) {
        const existing = await UserSetupProgress.findOne({
            userId,
            firmId,
            taskId: task.taskId
        });

        if (!existing || (!existing.isCompleted && !existing.skipped)) {
            await UserSetupProgress.skipTask(userId, firmId, task.taskId, reason);
        }
    }

    // Log skip
    await auditLogService.log(
        'walkthrough_skipped',
        'user',
        userId,
        'SUCCESS',
        {
            userId,
            firmId,
            walkthroughId: id,
            reason: reason || 'No reason provided',
            taskCount: tasks.length,
            severity: 'low'
        }
    );

    res.json({
        success: true,
        message: 'Walkthrough skipped successfully',
        data: {
            walkthroughId: id,
            skippedTasks: tasks.length
        }
    });
});

/**
 * Reset walkthrough progress
 * POST /api/walkthroughs/:id/reset
 */
exports.resetWalkthrough = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID || req.userId;
    const firmId = req.firmId;

    if (!userId) {
        throw CustomException('Authentication required', 401);
    }

    if (!firmId) {
        throw CustomException('Firm context required', 400);
    }

    // Get all tasks in walkthrough
    const tasks = await SetupTask.find({
        sectionId: id,
        isActive: true
    }).lean();

    if (tasks.length === 0) {
        throw CustomException('Walkthrough not found', 404);
    }

    // Delete all progress for these tasks
    const taskIds = tasks.map(t => t.taskId);
    await UserSetupProgress.deleteMany({
        userId,
        firmId,
        taskId: { $in: taskIds }
    });

    // Log reset
    await auditLogService.log(
        'walkthrough_reset',
        'user',
        userId,
        'SUCCESS',
        {
            userId,
            firmId,
            walkthroughId: id,
            taskCount: tasks.length,
            severity: 'low'
        }
    );

    res.json({
        success: true,
        message: 'Walkthrough progress reset successfully',
        data: {
            walkthroughId: id,
            resetTasks: taskIds.length
        }
    });
});

/**
 * Get user's progress on all walkthroughs
 * GET /api/walkthroughs/progress
 */
exports.getProgress = asyncHandler(async (req, res) => {
    const userId = req.userID || req.userId;
    const firmId = req.firmId;

    if (!userId) {
        throw CustomException('Authentication required', 401);
    }

    // Get overall progress
    const overallProgress = firmId
        ? await UserSetupProgress.getOverallProgress(userId, firmId)
        : {
            sections: [],
            overall: { totalTasks: 0, completedTasks: 0, skippedTasks: 0, pendingTasks: 0, percentage: 0 },
            required: { total: 0, completed: 0, isComplete: false }
        };

    // Get sections with details
    const sections = await SetupSection.find({ isActive: true })
        .sort({ orderIndex: 1 })
        .lean();

    const progressBySectionMap = {};
    overallProgress.sections.forEach(sp => {
        progressBySectionMap[sp.sectionId] = sp;
    });

    const walkthroughProgress = sections.map(section => {
        const sectionProgress = progressBySectionMap[section.sectionId] || {
            total: 0,
            completed: 0,
            skipped: 0,
            pending: 0,
            percentage: 0
        };

        return {
            walkthroughId: section.sectionId,
            name: section.name,
            nameAr: section.nameAr,
            isRequired: section.isRequired,
            ...sectionProgress
        };
    });

    res.json({
        success: true,
        data: {
            overall: overallProgress.overall,
            required: overallProgress.required,
            walkthroughs: walkthroughProgress
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS - Walkthrough Management
// ═══════════════════════════════════════════════════════════════

/**
 * Get completion statistics for all walkthroughs (admin)
 * GET /api/walkthroughs/stats
 */
exports.getStats = asyncHandler(async (req, res) => {
    const adminUserId = req.userID || req.userId;

    // Verify admin access
    const adminUser = await User.findOne({ _id: adminUserId, ...req.firmQuery }).select('role').lean();
    if (!adminUser || adminUser.role !== 'admin') {
        throw CustomException('Admin access required', 403);
    }

    // Get all sections (sections are global/system-level, not tenant-scoped)
    const sections = await SetupSection.find({ isActive: true }).lean();

    // SECURITY FIX: Filter progress records by firmQuery to prevent cross-tenant data exposure
    // Previously: UserSetupProgress.find({}) returned ALL firms' data
    const allProgress = await UserSetupProgress.find({ ...req.firmQuery }).lean();

    // Calculate stats per section
    const sectionStats = await Promise.all(sections.map(async (section) => {
        const tasks = await SetupTask.find({
            sectionId: section.sectionId,
            isActive: true
        }).lean();

        const taskIds = tasks.map(t => t.taskId);
        const sectionProgress = allProgress.filter(p => taskIds.includes(p.taskId));

        const uniqueUsers = new Set(sectionProgress.map(p => p.userId.toString())).size;
        const completedCount = sectionProgress.filter(p => p.isCompleted).length;
        const skippedCount = sectionProgress.filter(p => p.skipped).length;

        return {
            walkthroughId: section.sectionId,
            name: section.name,
            taskCount: tasks.length,
            uniqueUsers,
            totalCompletions: completedCount,
            totalSkips: skippedCount,
            averageCompletionRate: uniqueUsers > 0
                ? Math.round((completedCount / (uniqueUsers * tasks.length)) * 100)
                : 0
        };
    }));

    // Overall stats
    const totalUsers = new Set(allProgress.map(p => p.userId.toString())).size;
    const totalCompletions = allProgress.filter(p => p.isCompleted).length;
    const totalSkips = allProgress.filter(p => p.skipped).length;

    res.json({
        success: true,
        data: {
            overall: {
                totalWalkthroughs: sections.length,
                totalUsers,
                totalCompletions,
                totalSkips,
                totalProgressRecords: allProgress.length
            },
            bySectionId: sectionStats
        }
    });
});

/**
 * Create a new walkthrough (admin)
 * POST /api/walkthroughs/admin
 */
exports.createWalkthrough = asyncHandler(async (req, res) => {
    const adminUserId = req.userID || req.userId;

    // Verify admin access
    const adminUser = await User.findOne({ _id: adminUserId, ...req.firmQuery }).select('role email').lean();
    if (!adminUser || adminUser.role !== 'admin') {
        throw CustomException('Admin access required', 403);
    }

    const allowedFields = pickAllowedFields(req.body, [
        'sectionId', 'name', 'nameAr', 'description', 'descriptionAr',
        'icon', 'category', 'estimatedMinutes', 'orderIndex', 'isRequired'
    ]);

    // Validate required fields
    if (!allowedFields.sectionId || !allowedFields.name) {
        throw CustomException('sectionId and name are required', 400);
    }

    // Check if section already exists
    const existing = await SetupSection.findOne({ sectionId: allowedFields.sectionId });
    if (existing) {
        throw CustomException('Walkthrough with this ID already exists', 400);
    }

    // Create new section
    const newSection = await SetupSection.create({
        ...allowedFields,
        isActive: true
    });

    // Log creation
    await auditLogService.log(
        'walkthrough_created',
        'system',
        null,
        'SUCCESS',
        {
            userId: adminUserId,
            userEmail: adminUser.email,
            walkthroughId: newSection.sectionId,
            walkthroughName: newSection.name,
            severity: 'medium'
        }
    );

    res.status(201).json({
        success: true,
        message: 'Walkthrough created successfully',
        data: newSection
    });
});

/**
 * Update walkthrough (admin)
 * PUT /api/walkthroughs/admin/:id
 */
exports.updateWalkthrough = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const adminUserId = req.userID || req.userId;

    // Verify admin access
    const adminUser = await User.findOne({ _id: adminUserId, ...req.firmQuery }).select('role email').lean();
    if (!adminUser || adminUser.role !== 'admin') {
        throw CustomException('Admin access required', 403);
    }

    const allowedFields = pickAllowedFields(req.body, [
        'name', 'nameAr', 'description', 'descriptionAr',
        'icon', 'category', 'estimatedMinutes', 'orderIndex', 'isRequired', 'isActive'
    ]);

    // Update section
    const section = await SetupSection.findOneAndUpdate(
        { sectionId: id },
        { $set: allowedFields },
        { new: true, runValidators: true }
    );

    if (!section) {
        throw CustomException('Walkthrough not found', 404);
    }

    // Log update
    await auditLogService.log(
        'walkthrough_updated',
        'system',
        null,
        'SUCCESS',
        {
            userId: adminUserId,
            userEmail: adminUser.email,
            walkthroughId: id,
            updatedFields: Object.keys(allowedFields),
            severity: 'medium'
        }
    );

    res.json({
        success: true,
        message: 'Walkthrough updated successfully',
        data: section
    });
});

/**
 * Delete walkthrough (admin)
 * DELETE /api/walkthroughs/admin/:id
 */
exports.deleteWalkthrough = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const adminUserId = req.userID || req.userId;

    // Verify admin access
    const adminUser = await User.findOne({ _id: adminUserId, ...req.firmQuery }).select('role email').lean();
    if (!adminUser || adminUser.role !== 'admin') {
        throw CustomException('Admin access required', 403);
    }

    // Soft delete by setting isActive to false
    const section = await SetupSection.findOneAndUpdate(
        { sectionId: id },
        { $set: { isActive: false } },
        { new: true }
    );

    if (!section) {
        throw CustomException('Walkthrough not found', 404);
    }

    // Also deactivate all tasks in this section
    await SetupTask.updateMany(
        { sectionId: id },
        { $set: { isActive: false } }
    );

    // Log deletion
    await auditLogService.log(
        'walkthrough_deleted',
        'system',
        null,
        'SUCCESS',
        {
            userId: adminUserId,
            userEmail: adminUser.email,
            walkthroughId: id,
            walkthroughName: section.name,
            severity: 'high'
        }
    );

    res.json({
        success: true,
        message: 'Walkthrough deleted successfully',
        data: {
            walkthroughId: id,
            deactivated: true
        }
    });
});

/**
 * List all walkthroughs for admin management
 * GET /api/walkthroughs/admin
 */
exports.listAllWalkthroughs = asyncHandler(async (req, res) => {
    const adminUserId = req.userID || req.userId;

    // Verify admin access
    const adminUser = await User.findOne({ _id: adminUserId, ...req.firmQuery }).select('role').lean();
    if (!adminUser || adminUser.role !== 'admin') {
        throw CustomException('Admin access required', 403);
    }

    const { includeInactive = false } = req.query;

    // Build query
    const query = includeInactive === 'true' ? {} : { isActive: true };

    // Get all sections
    const sections = await SetupSection.find(query)
        .sort({ orderIndex: 1 })
        .lean();

    // Get task counts for each section
    const walkthroughs = await Promise.all(sections.map(async (section) => {
        const taskCount = await SetupTask.countDocuments({
            sectionId: section.sectionId,
            isActive: true
        });

        const progressCount = await UserSetupProgress.countDocuments({
            taskId: { $in: (await SetupTask.find({
                sectionId: section.sectionId,
                isActive: true
            }).distinct('taskId')) }
        });

        return {
            ...section,
            taskCount,
            progressRecords: progressCount
        };
    }));

    res.json({
        success: true,
        data: walkthroughs,
        count: walkthroughs.length
    });
});
