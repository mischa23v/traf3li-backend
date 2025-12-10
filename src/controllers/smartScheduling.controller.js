/**
 * Smart Scheduling & NLP Controller
 *
 * This controller provides intelligent task scheduling and natural language processing
 * capabilities for the task management system. It leverages machine learning algorithms
 * to analyze user productivity patterns and optimize task scheduling.
 *
 * Features:
 * - Productivity pattern analysis
 * - Intelligent time slot suggestions
 * - Task duration prediction
 * - Workload analysis
 * - Smart nudges for task management
 * - Automated task scheduling
 *
 * @module controllers/smartScheduling
 */

const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const smartSchedulingService = require('../services/smartScheduling.service');

/**
 * Get user's productivity patterns
 * GET /api/smart-scheduling/patterns
 */
const getUserPatterns = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('Access denied', 403);
    }

    const patterns = await smartSchedulingService.getUserPatterns(userId, firmId);

    return res.json({
        error: false,
        patterns
    });
});

/**
 * Suggest best time for a task
 * POST /api/smart-scheduling/suggest
 * Body: { title, type, estimatedMinutes, priority }
 */
const suggestBestTime = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { title, type, estimatedMinutes, priority } = req.body;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('Access denied', 403);
    }

    // Validate required fields
    if (!title) {
        throw CustomException('Task title is required', 400);
    }

    if (!estimatedMinutes || estimatedMinutes <= 0) {
        throw CustomException('Valid estimated duration is required', 400);
    }

    const suggestion = await smartSchedulingService.suggestBestTime(
        userId,
        firmId,
        {
            title,
            taskType: type || 'general',
            estimatedMinutes,
            priority: priority || 'medium'
        }
    );

    return res.json({
        error: false,
        suggestion
    });
});

/**
 * Predict task duration
 * POST /api/smart-scheduling/predict-duration
 * Body: { taskType, complexity }
 */
const predictDuration = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { taskType, complexity } = req.body;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('Access denied', 403);
    }

    // Validate required fields
    if (!taskType) {
        throw CustomException('Task type is required', 400);
    }

    const prediction = await smartSchedulingService.predictDuration(
        userId,
        firmId,
        taskType,
        complexity || 'medium'
    );

    return res.json({
        error: false,
        prediction
    });
});

/**
 * Analyze workload for date range
 * GET /api/smart-scheduling/workload
 * Query: { startDate, endDate }
 */
const analyzeWorkload = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { startDate, endDate } = req.query;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('Access denied', 403);
    }

    // Validate date range
    if (!startDate || !endDate) {
        throw CustomException('Start date and end date are required', 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw CustomException('Invalid date format', 400);
    }

    if (start > end) {
        throw CustomException('Start date must be before end date', 400);
    }

    // Limit to 90 days
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
        throw CustomException('Date range cannot exceed 90 days', 400);
    }

    const workloadAnalysis = await smartSchedulingService.analyzeWorkload(
        userId,
        firmId,
        { start, end }
    );

    return res.json({
        error: false,
        workload: workloadAnalysis
    });
});

/**
 * Get daily smart nudges
 * GET /api/smart-scheduling/nudges
 */
const getDailyNudges = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('Access denied', 403);
    }

    const nudges = await smartSchedulingService.getDailyNudges(userId, firmId);

    return res.json({
        error: false,
        nudges
    });
});

/**
 * Auto-schedule tasks
 * POST /api/smart-scheduling/auto-schedule
 * Body: { taskIds: [] }
 */
const autoScheduleTasks = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { taskIds } = req.body;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('Access denied', 403);
    }

    // Validate taskIds
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        throw CustomException('Task IDs array is required', 400);
    }

    // Limit to 50 tasks at a time
    if (taskIds.length > 50) {
        throw CustomException('Cannot auto-schedule more than 50 tasks at once', 400);
    }

    // Fetch tasks to schedule
    const Task = require('../models/task.model');
    const tasks = await Task.find({
        _id: { $in: taskIds },
        firmId,
        assignedTo: userId
    }).lean();

    if (tasks.length === 0) {
        throw CustomException('No valid tasks found', 404);
    }

    const scheduledTasks = await smartSchedulingService.autoSchedule(
        userId,
        firmId,
        tasks
    );

    return res.json({
        error: false,
        message: 'Tasks auto-scheduled successfully',
        scheduled: scheduledTasks
    });
});

module.exports = {
    getUserPatterns,
    suggestBestTime,
    predictDuration,
    analyzeWorkload,
    getDailyNudges,
    autoScheduleTasks
};
