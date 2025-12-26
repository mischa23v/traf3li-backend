/**
 * Bulk Actions Routes - Enterprise Bulk Operations API
 *
 * All routes require authentication and firm filtering.
 * Certain actions require admin or owner authorization.
 *
 * @module routes/bulkActions.routes
 */

const express = require('express');
const router = express.Router();
const bulkActionsController = require('../controllers/bulkActions.controller');
const { userMiddleware } = require('../middlewares');

// Apply authentication to all routes
router.use(userMiddleware);

// ═══════════════════════════════════════════════════════════════
// BULK ACTION EXECUTION ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/bulk-actions/:entityType
 * Execute bulk action on entities
 * Body: { action, ids, params }
 *
 * Example:
 * POST /api/bulk-actions/invoices
 * {
 *   "action": "send",
 *   "ids": ["64a...", "64b...", "64c..."],
 *   "params": {
 *     "firmName": "My Law Firm",
 *     "invoiceLink": "https://app.example.com/invoices"
 *   }
 * }
 */
router.post('/:entityType', bulkActionsController.executeBulkAction);

/**
 * POST /api/bulk-actions/:entityType/validate
 * Validate bulk action before execution
 * Body: { action, ids }
 *
 * Example:
 * POST /api/bulk-actions/invoices/validate
 * {
 *   "action": "void",
 *   "ids": ["64a...", "64b...", "64c..."]
 * }
 */
router.post('/:entityType/validate', bulkActionsController.validateBulkAction);

// ═══════════════════════════════════════════════════════════════
// JOB MONITORING ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/bulk-actions/:jobId/progress
 * Get progress of a running bulk action job
 *
 * Example:
 * GET /api/bulk-actions/bulk-invoices-send-1234567890/progress
 */
router.get('/:jobId/progress', bulkActionsController.getBulkActionProgress);

/**
 * POST /api/bulk-actions/:jobId/cancel
 * Cancel a running bulk action job
 * Requires admin or owner role
 *
 * Example:
 * POST /api/bulk-actions/bulk-invoices-send-1234567890/cancel
 */
router.post('/:jobId/cancel', bulkActionsController.cancelBulkAction);

// ═══════════════════════════════════════════════════════════════
// DISCOVERY ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/bulk-actions/supported/:entityType?
 * Get supported bulk actions
 *
 * Examples:
 * GET /api/bulk-actions/supported/invoices
 * GET /api/bulk-actions/supported (returns all entity types and actions)
 */
router.get('/supported/:entityType?', bulkActionsController.getSupportedActions);

module.exports = router;
