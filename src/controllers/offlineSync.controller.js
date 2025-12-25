const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const offlineSyncService = require('../services/offlineSync.service');
const logger = require('../utils/logger');

/**
 * Get sync manifest
 * GET /api/offline/manifest
 */
const getSyncManifest = asyncHandler(async (req, res) => {
    const userId = req.userID;

    // Get firmId from user or query
    let firmId = req.query.firmId;
    if (!firmId) {
        const User = require('../models/user.model');
        const user = await User.findById(userId).select('firmId lawyerId').lean();
        firmId = user?.firmId || user?._id;
    }

    const manifest = await offlineSyncService.generateSyncManifest(userId, firmId);

    res.status(200).json({
        success: true,
        message: 'Sync manifest generated successfully',
        data: manifest
    });
});

/**
 * Get data for offline caching
 * GET /api/offline/data
 */
const getOfflineData = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const { entityTypes } = req.query;

    // Get firmId from user or query
    let firmId = req.query.firmId;
    if (!firmId) {
        const User = require('../models/user.model');
        const user = await User.findById(userId).select('firmId lawyerId').lean();
        firmId = user?.firmId || user?._id;
    }

    // Parse entity types if provided as comma-separated string
    let types = [];
    if (entityTypes) {
        types = typeof entityTypes === 'string'
            ? entityTypes.split(',').map(t => t.trim())
            : entityTypes;
    }

    const data = await offlineSyncService.getDataForOfflineCache(userId, firmId, types);

    res.status(200).json({
        success: true,
        message: 'Offline data retrieved successfully',
        data
    });
});

/**
 * Sync changes from offline queue
 * POST /api/offline/sync
 */
const syncOfflineChanges = asyncHandler(async (req, res) => {
    const userId = req.userID;

    // Validate request body
    if (!req.body.changes || !Array.isArray(req.body.changes)) {
        throw CustomException('Changes array is required', 400);
    }

    const { changes } = req.body;

    // Validate changes
    const validationResult = await offlineSyncService.validateOfflineChanges(changes);
    if (!validationResult.valid) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: validationResult.errors
        });
    }

    // Process sync queue
    const results = await offlineSyncService.processSyncQueue(userId, changes);

    // Update last sync timestamp
    await offlineSyncService.updateSyncTimestamp(userId);

    const statusCode = results.failed > 0 ? 207 : 200; // 207 Multi-Status if some failed

    res.status(statusCode).json({
        success: results.failed === 0,
        message: `Processed ${results.processed} changes: ${results.succeeded} succeeded, ${results.failed} failed`,
        data: results
    });
});

/**
 * Get changes since last sync
 * GET /api/offline/changes
 */
const getChangesSinceLastSync = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const { since, entityTypes } = req.query;

    // Get firmId from user or query
    let firmId = req.query.firmId;
    if (!firmId) {
        const User = require('../models/user.model');
        const user = await User.findById(userId).select('firmId lawyerId').lean();
        firmId = user?.firmId || user?._id;
    }

    // Use provided timestamp or get last sync timestamp
    let sinceTimestamp;
    if (since) {
        sinceTimestamp = new Date(since);
        if (isNaN(sinceTimestamp.getTime())) {
            throw CustomException('Invalid timestamp format', 400);
        }
    } else {
        sinceTimestamp = await offlineSyncService.getLastSyncTimestamp(userId);
        if (!sinceTimestamp) {
            // If no last sync, use 30 days ago as default
            sinceTimestamp = new Date();
            sinceTimestamp.setDate(sinceTimestamp.getDate() - 30);
        }
    }

    // Parse entity types if provided
    let types = [];
    if (entityTypes) {
        types = typeof entityTypes === 'string'
            ? entityTypes.split(',').map(t => t.trim())
            : entityTypes;
    }

    const changes = await offlineSyncService.getChangesSince(
        userId,
        firmId,
        sinceTimestamp,
        types
    );

    res.status(200).json({
        success: true,
        message: 'Changes retrieved successfully',
        data: changes
    });
});

/**
 * Resolve sync conflicts
 * POST /api/offline/conflicts/resolve
 */
const resolveConflicts = asyncHandler(async (req, res) => {
    const userId = req.userID;

    // Validate request body
    if (!req.body.conflicts || !Array.isArray(req.body.conflicts)) {
        throw CustomException('Conflicts array is required', 400);
    }

    const { conflicts } = req.body;

    // Validate each conflict has required fields
    for (const conflict of conflicts) {
        if (!conflict.entityType || !conflict.entityId || !conflict.resolution) {
            throw CustomException(
                'Each conflict must have entityType, entityId, and resolution',
                400
            );
        }

        const validResolutions = ['useLocal', 'useServer', 'merge'];
        if (!validResolutions.includes(conflict.resolution)) {
            throw CustomException(
                `Invalid resolution strategy. Must be one of: ${validResolutions.join(', ')}`,
                400
            );
        }
    }

    const results = await offlineSyncService.resolveConflicts(userId, conflicts);

    const statusCode = results.failed > 0 ? 207 : 200; // 207 Multi-Status if some failed

    res.status(statusCode).json({
        success: results.failed === 0,
        message: `Resolved ${results.resolved} conflicts, ${results.failed} failed`,
        data: results
    });
});

/**
 * Get sync status
 * GET /api/offline/status
 */
const getSyncStatus = asyncHandler(async (req, res) => {
    const userId = req.userID;

    // Get firmId from user
    const User = require('../models/user.model');
    const user = await User.findById(userId).select('firmId lawyerId lastSyncedAt').lean();
    const firmId = user?.firmId || user?._id;

    // Get last sync timestamp
    const lastSyncedAt = await offlineSyncService.getLastSyncTimestamp(userId);

    // Calculate time since last sync
    let timeSinceSync = null;
    let syncStatus = 'never';

    if (lastSyncedAt) {
        const now = new Date();
        const diffMs = now - lastSyncedAt;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        timeSinceSync = {
            milliseconds: diffMs,
            minutes: diffMinutes,
            hours: diffHours,
            days: diffDays
        };

        // Determine sync status
        if (diffMinutes < 5) {
            syncStatus = 'current';
        } else if (diffMinutes < 60) {
            syncStatus = 'recent';
        } else if (diffHours < 24) {
            syncStatus = 'stale';
        } else {
            syncStatus = 'outdated';
        }
    }

    // Check if there are any changes since last sync
    let hasChanges = false;
    if (lastSyncedAt) {
        try {
            const changes = await offlineSyncService.getChangesSince(
                userId,
                firmId,
                lastSyncedAt,
                []
            );
            hasChanges = changes.hasChanges;
        } catch (error) {
            logger.error('getSyncStatus: Failed to check for changes:', error.message);
        }
    }

    res.status(200).json({
        success: true,
        data: {
            userId,
            firmId,
            lastSyncedAt,
            timeSinceSync,
            syncStatus,
            hasChanges,
            isOnline: true // This endpoint being called means they're online
        }
    });
});

module.exports = {
    getSyncManifest,
    getOfflineData,
    syncOfflineChanges,
    getChangesSinceLastSync,
    resolveConflicts,
    getSyncStatus
};
