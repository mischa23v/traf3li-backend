/**
 * Field History Routes - API Routes for Field-Level Change Tracking
 *
 * All routes require authentication and firm filtering.
 * Provides endpoints for viewing, comparing, and reverting field changes.
 */

const express = require('express');
const router = express.Router();
const fieldHistoryController = require('../controllers/fieldHistory.controller');
const { userMiddleware } = require('../middlewares');
const { authorize } = require('../middlewares/authorize.middleware');

// Apply authentication to all routes
router.use(userMiddleware);

// ═══════════════════════════════════════════════════════════════
// FIELD HISTORY QUERY ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/field-history/recent
 * Get recent changes across the firm
 * Requires: admin or owner role
 */
router.get('/recent', fieldHistoryController.getRecentChanges);

/**
 * GET /api/field-history/user/:userId
 * Get all changes made by a specific user
 * Users can view their own changes, admins/owners can view anyone's
 */
router.get('/user/:userId', fieldHistoryController.getUserChanges);

/**
 * GET /api/field-history/:entityType/:entityId
 * Get all field history for an entity
 */
router.get('/:entityType/:entityId', fieldHistoryController.getEntityHistory);

/**
 * GET /api/field-history/:entityType/:entityId/stats
 * Get statistics for entity history
 */
router.get('/:entityType/:entityId/stats', fieldHistoryController.getEntityHistoryStats);

/**
 * GET /api/field-history/:entityType/:entityId/field/:fieldName
 * Get history for a specific field
 */
router.get('/:entityType/:entityId/field/:fieldName', fieldHistoryController.getFieldHistory);

/**
 * GET /api/field-history/:entityType/:entityId/timeline/:fieldName
 * Get timeline visualization data for a specific field
 */
router.get('/:entityType/:entityId/timeline/:fieldName', fieldHistoryController.getFieldTimeline);

/**
 * GET /api/field-history/:entityType/:entityId/compare
 * Compare two versions of an entity
 * Query params: version1, version2 (ISO date strings)
 */
router.get('/:entityType/:entityId/compare', fieldHistoryController.compareVersions);

// ═══════════════════════════════════════════════════════════════
// FIELD HISTORY MODIFICATION ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/field-history/:historyId/revert
 * Revert a field to its previous value
 * Requires: admin or owner role
 */
router.post('/:historyId/revert', authorize('admin', 'owner'), fieldHistoryController.revertField);

module.exports = router;
