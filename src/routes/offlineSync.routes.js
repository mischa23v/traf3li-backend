const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    getSyncManifest,
    getOfflineData,
    syncOfflineChanges,
    getChangesSinceLastSync,
    resolveConflicts,
    getSyncStatus
} = require('../controllers/offlineSync.controller');

const app = express.Router();

// ==============================================
// OFFLINE SYNC ROUTES
// ==============================================

/**
 * GET /api/offline/manifest
 * Get sync manifest with data to cache
 * Query params:
 *   - firmId (optional): Firm ID
 */
app.get('/manifest', userMiddleware, getSyncManifest);

/**
 * GET /api/offline/data
 * Get essential data for offline caching
 * Query params:
 *   - firmId (optional): Firm ID
 *   - entityTypes (optional): Comma-separated list of entity types
 */
app.get('/data', userMiddleware, getOfflineData);

/**
 * POST /api/offline/sync
 * Sync changes from offline queue
 * Body:
 *   - changes: Array of change objects
 */
app.post('/sync', userMiddleware, syncOfflineChanges);

/**
 * GET /api/offline/changes
 * Get changes since last sync
 * Query params:
 *   - since (optional): Timestamp to get changes since
 *   - firmId (optional): Firm ID
 *   - entityTypes (optional): Comma-separated list of entity types
 */
app.get('/changes', userMiddleware, getChangesSinceLastSync);

/**
 * POST /api/offline/conflicts/resolve
 * Resolve sync conflicts
 * Body:
 *   - conflicts: Array of conflict objects with resolution strategy
 */
app.post('/conflicts/resolve', userMiddleware, resolveConflicts);

/**
 * GET /api/offline/status
 * Get current sync status
 */
app.get('/status', userMiddleware, getSyncStatus);

module.exports = app;
