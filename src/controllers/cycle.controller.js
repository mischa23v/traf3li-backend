const mongoose = require('mongoose');
const Cycle = require('../models/cycle.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const CycleService = require('../services/cycle.service');
const logger = require('../utils/logger');

/**
 * List cycles for team
 * GET /api/cycles
 */
const listCycles = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { teamId, status } = req.query;

    // Build query
    const query = {};

    if (firmId) {
        query.firmId = new mongoose.Types.ObjectId(firmId);
    }

    if (teamId) {
        query.teamId = new mongoose.Types.ObjectId(sanitizeObjectId(teamId));
    }

    if (status) {
        // Validate status value
        if (!['upcoming', 'active', 'completed'].includes(status)) {
            throw CustomException('Invalid status value', 400);
        }
        query.status = status;
    }

    // Get cycles
    const cycles = await Cycle.find(query)
        .sort({ startDate: -1 })
        .populate('teamId', 'name');

    res.status(200).json({
        success: true,
        data: cycles
    });
});

/**
 * Create cycle
 * POST /api/cycles
 */
const createCycle = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    // Mass assignment protection
    const allowedFields = [
        'teamId', 'name', 'duration', 'startDate', 'autoStart',
        'autoRollover', 'cooldownDays', 'goals'
    ];
    const data = pickAllowedFields(req.body, allowedFields);

    // Validate required fields
    if (!data.teamId) {
        throw CustomException('Team ID is required', 400);
    }

    // Sanitize teamId
    const sanitizedTeamId = sanitizeObjectId(data.teamId);

    // Prepare config
    const config = {
        name: data.name,
        duration: data.duration,
        startDate: data.startDate,
        autoStart: data.autoStart,
        autoRollover: data.autoRollover,
        cooldownDays: data.cooldownDays,
        goals: data.goals
    };

    // Create cycle using service
    const cycle = await CycleService.createCycle(sanitizedTeamId, firmId, config);

    if (!cycle) {
        throw CustomException('Failed to create cycle', 500);
    }

    res.status(201).json({
        success: true,
        message: 'Cycle created successfully',
        data: cycle
    });
});

/**
 * Get cycle by ID
 * GET /api/cycles/:id
 */
const getCycle = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;

    // Sanitize ID
    const sanitizedId = sanitizeObjectId(id);

    // IDOR protection - verify firmId ownership
    const query = { _id: sanitizedId };
    if (firmId) {
        query.firmId = new mongoose.Types.ObjectId(firmId);
    }

    const cycle = await Cycle.findOne(query).populate('teamId', 'name');

    if (!cycle) {
        throw CustomException('Cycle not found or access denied', 404);
    }

    res.status(200).json({
        success: true,
        data: cycle
    });
});

/**
 * Start cycle
 * POST /api/cycles/:id/start
 */
const startCycle = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    // Sanitize ID
    const sanitizedId = sanitizeObjectId(id);

    // IDOR protection - verify cycle belongs to firm
    const query = { _id: sanitizedId };
    if (firmId) {
        query.firmId = new mongoose.Types.ObjectId(firmId);
    }

    const existingCycle = await Cycle.findOne(query);
    if (!existingCycle) {
        throw CustomException('Cycle not found or access denied', 404);
    }

    // Start cycle using service
    const cycle = await CycleService.startCycle(sanitizedId, userId);

    if (!cycle) {
        throw CustomException('Failed to start cycle. Cycle must be in upcoming status.', 400);
    }

    res.status(200).json({
        success: true,
        message: 'Cycle started successfully',
        data: cycle
    });
});

/**
 * Complete cycle
 * POST /api/cycles/:id/complete
 */
const completeCycle = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    // Sanitize ID
    const sanitizedId = sanitizeObjectId(id);

    // IDOR protection - verify cycle belongs to firm
    const query = { _id: sanitizedId };
    if (firmId) {
        query.firmId = new mongoose.Types.ObjectId(firmId);
    }

    const existingCycle = await Cycle.findOne(query);
    if (!existingCycle) {
        throw CustomException('Cycle not found or access denied', 404);
    }

    // Complete cycle using service
    const result = await CycleService.completeCycle(sanitizedId, userId);

    if (!result) {
        throw CustomException('Failed to complete cycle', 500);
    }

    res.status(200).json({
        success: true,
        message: 'Cycle completed successfully',
        data: result
    });
});

/**
 * Get cycle progress
 * GET /api/cycles/:id/progress
 */
const getCycleProgress = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;

    // Sanitize ID
    const sanitizedId = sanitizeObjectId(id);

    // IDOR protection - verify cycle belongs to firm
    const query = { _id: sanitizedId };
    if (firmId) {
        query.firmId = new mongoose.Types.ObjectId(firmId);
    }

    const existingCycle = await Cycle.findOne(query);
    if (!existingCycle) {
        throw CustomException('Cycle not found or access denied', 404);
    }

    // Get progress using service
    const progress = await CycleService.getCycleProgress(sanitizedId);

    if (!progress) {
        throw CustomException('Failed to get cycle progress', 500);
    }

    res.status(200).json({
        success: true,
        data: progress
    });
});

/**
 * Get burndown chart data
 * GET /api/cycles/:id/burndown
 */
const getBurndown = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;

    // Sanitize ID
    const sanitizedId = sanitizeObjectId(id);

    // IDOR protection - verify cycle belongs to firm
    const query = { _id: sanitizedId };
    if (firmId) {
        query.firmId = new mongoose.Types.ObjectId(firmId);
    }

    const existingCycle = await Cycle.findOne(query);
    if (!existingCycle) {
        throw CustomException('Cycle not found or access denied', 404);
    }

    // Get burndown data using service
    const burndown = await CycleService.calculateBurndown(sanitizedId);

    res.status(200).json({
        success: true,
        data: burndown
    });
});

/**
 * Get active cycle for team
 * GET /api/cycles/active
 */
const getActiveCycle = asyncHandler(async (req, res) => {
    const { teamId } = req.query;
    const firmId = req.firmId;

    // Validate teamId
    if (!teamId) {
        throw CustomException('Team ID is required', 400);
    }

    const sanitizedTeamId = sanitizeObjectId(teamId);

    // Get active cycle using service
    const cycle = await CycleService.getActiveCycle(sanitizedTeamId, firmId);

    if (!cycle) {
        return res.status(200).json({
            success: true,
            data: null,
            message: 'No active cycle found'
        });
    }

    res.status(200).json({
        success: true,
        data: cycle
    });
});

/**
 * Get velocity stats for team
 * GET /api/cycles/stats
 */
const getCycleStats = asyncHandler(async (req, res) => {
    const { teamId, count = 5 } = req.query;
    const firmId = req.firmId;

    // Validate teamId
    if (!teamId) {
        throw CustomException('Team ID is required', 400);
    }

    const sanitizedTeamId = sanitizeObjectId(teamId);

    // Get stats using service
    const stats = await CycleService.getCycleStats(
        sanitizedTeamId,
        firmId,
        parseInt(count)
    );

    res.status(200).json({
        success: true,
        data: stats
    });
});

/**
 * Add task to cycle
 * POST /api/cycles/:id/tasks/:taskId
 */
const addTaskToCycle = asyncHandler(async (req, res) => {
    const { id, taskId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    // Sanitize IDs
    const sanitizedCycleId = sanitizeObjectId(id);
    const sanitizedTaskId = sanitizeObjectId(taskId);

    // IDOR protection - verify cycle belongs to firm
    const query = { _id: sanitizedCycleId };
    if (firmId) {
        query.firmId = new mongoose.Types.ObjectId(firmId);
    }

    const existingCycle = await Cycle.findOne(query);
    if (!existingCycle) {
        throw CustomException('Cycle not found or access denied', 404);
    }

    // Add task to cycle using service
    const task = await CycleService.addTaskToCycle(
        sanitizedTaskId,
        sanitizedCycleId,
        userId
    );

    if (!task) {
        throw CustomException('Failed to add task to cycle. Task may not exist.', 400);
    }

    res.status(200).json({
        success: true,
        message: 'Task added to cycle successfully',
        data: task
    });
});

/**
 * Remove task from cycle
 * DELETE /api/cycles/:id/tasks/:taskId
 */
const removeTaskFromCycle = asyncHandler(async (req, res) => {
    const { id, taskId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    // Sanitize IDs
    const sanitizedCycleId = sanitizeObjectId(id);
    const sanitizedTaskId = sanitizeObjectId(taskId);

    // IDOR protection - verify cycle belongs to firm
    const query = { _id: sanitizedCycleId };
    if (firmId) {
        query.firmId = new mongoose.Types.ObjectId(firmId);
    }

    const existingCycle = await Cycle.findOne(query);
    if (!existingCycle) {
        throw CustomException('Cycle not found or access denied', 404);
    }

    // Remove task from cycle using service
    const task = await CycleService.removeTaskFromCycle(sanitizedTaskId, userId);

    if (!task) {
        throw CustomException('Failed to remove task from cycle. Task may not exist.', 400);
    }

    res.status(200).json({
        success: true,
        message: 'Task removed from cycle successfully',
        data: task
    });
});

module.exports = {
    listCycles,
    createCycle,
    getCycle,
    startCycle,
    completeCycle,
    getCycleProgress,
    getBurndown,
    getActiveCycle,
    getCycleStats,
    addTaskToCycle,
    removeTaskFromCycle
};
