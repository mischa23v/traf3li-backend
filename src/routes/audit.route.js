/**
 * Audit Routes - Activity Log & Compliance API
 *
 * All routes require authentication and firm membership.
 */

const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    getAuditLog,
    exportAuditLog,
    getAuditStats,
    getAuditOptions,
    getUserAuditLog
} = require('../controllers/audit.controller');

const router = express.Router();

// Apply authentication to all routes
router.use(userMiddleware);

// ═══════════════════════════════════════════════════════════════
// AUDIT LOG ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/audit - Get firm-wide audit log
router.get('/', getAuditLog);

// GET /api/audit/export - Export audit log for compliance
router.get('/export', exportAuditLog);

// GET /api/audit/stats - Get audit statistics
router.get('/stats', getAuditStats);

// GET /api/audit/options - Get filter options
router.get('/options', getAuditOptions);

// GET /api/audit/user/:userId - Get user-specific activity
router.get('/user/:userId', getUserAuditLog);

module.exports = router;
