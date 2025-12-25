/**
 * Admin Tools Routes - System Management Endpoints
 *
 * All routes require admin authentication and are rate limited.
 * Comprehensive audit logging is performed for all operations.
 */

const express = require('express');
const {
    // Data Management
    getUserData,
    deleteUserData,
    exportFirmData,
    importFirmData,
    mergeUsers,
    mergeClients,

    // Data Fixes
    recalculateInvoiceTotals,
    reindexSearchData,
    cleanupOrphanedRecords,
    validateDataIntegrity,
    fixCurrencyConversions,

    // System Tools
    getSystemStats,
    getUserActivityReport,
    getStorageUsage,
    clearCache,
    runDiagnostics,
    getSlowQueries,

    // User Management
    resetUserPassword,
    impersonateUser,
    endImpersonation,
    lockUser,
    unlockUser,
    getLoginHistory
} = require('../controllers/adminTools.controller');

const { authenticate } = require('../middlewares');
const { authorize } = require('../middlewares/authorize.middleware');
const { sensitiveRateLimiter, publicRateLimiter } = require('../middlewares/rateLimiter.middleware');

const router = express.Router();

// All routes require authentication and admin role
const adminOnly = [authenticate, authorize('admin')];

// ═══════════════════════════════════════════════════════════════
// DATA MANAGEMENT ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @openapi
 * /api/admin/tools/users/{id}/data:
 *   get:
 *     summary: Get user data for export/review (GDPR)
 *     tags: [Admin Tools - Data Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *       - in: query
 *         name: includeRelated
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: User data retrieved successfully
 *       403:
 *         description: Admin access required
 */
router.get('/users/:id/data', ...adminOnly, publicRateLimiter, getUserData);

/**
 * @openapi
 * /api/admin/tools/users/{id}/data:
 *   delete:
 *     summary: Delete user data (GDPR right to erasure)
 *     tags: [Admin Tools - Data Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               anonymize:
 *                 type: boolean
 *                 default: true
 *                 description: Anonymize instead of hard delete
 *               cascade:
 *                 type: boolean
 *                 default: false
 *                 description: Delete related records
 *     responses:
 *       200:
 *         description: User data deleted successfully
 *       403:
 *         description: Admin access required
 */
router.delete('/users/:id/data', ...adminOnly, sensitiveRateLimiter, deleteUserData);

/**
 * @openapi
 * /api/admin/tools/firms/{id}/export:
 *   get:
 *     summary: Export all firm data
 *     tags: [Admin Tools - Data Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *     responses:
 *       200:
 *         description: Firm data exported successfully
 *       403:
 *         description: Admin access required
 */
router.get('/firms/:id/export', ...adminOnly, publicRateLimiter, exportFirmData);

/**
 * @openapi
 * /api/admin/tools/firms/{id}/import:
 *   post:
 *     summary: Import firm data
 *     tags: [Admin Tools - Data Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clients:
 *                 type: array
 *               cases:
 *                 type: array
 *     responses:
 *       200:
 *         description: Firm data imported successfully
 *       403:
 *         description: Admin access required
 */
router.post('/firms/:id/import', ...adminOnly, sensitiveRateLimiter, importFirmData);

/**
 * @openapi
 * /api/admin/tools/users/merge:
 *   post:
 *     summary: Merge duplicate users
 *     tags: [Admin Tools - Data Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sourceUserId
 *               - targetUserId
 *             properties:
 *               sourceUserId:
 *                 type: string
 *                 description: User to merge from (will be deleted)
 *               targetUserId:
 *                 type: string
 *                 description: User to merge into (will be kept)
 *     responses:
 *       200:
 *         description: Users merged successfully
 *       403:
 *         description: Admin access required
 */
router.post('/users/merge', ...adminOnly, sensitiveRateLimiter, mergeUsers);

/**
 * @openapi
 * /api/admin/tools/clients/merge:
 *   post:
 *     summary: Merge duplicate clients
 *     tags: [Admin Tools - Data Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sourceClientId
 *               - targetClientId
 *             properties:
 *               sourceClientId:
 *                 type: string
 *               targetClientId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Clients merged successfully
 *       403:
 *         description: Admin access required
 */
router.post('/clients/merge', ...adminOnly, sensitiveRateLimiter, mergeClients);

// ═══════════════════════════════════════════════════════════════
// DATA FIXES ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @openapi
 * /api/admin/tools/firms/{id}/recalculate-invoices:
 *   post:
 *     summary: Recalculate invoice totals
 *     tags: [Admin Tools - Data Fixes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice totals recalculated
 *       403:
 *         description: Admin access required
 */
router.post('/firms/:id/recalculate-invoices', ...adminOnly, sensitiveRateLimiter, recalculateInvoiceTotals);

/**
 * @openapi
 * /api/admin/tools/firms/{id}/reindex:
 *   post:
 *     summary: Reindex search data
 *     tags: [Admin Tools - Data Fixes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search data reindexed
 *       403:
 *         description: Admin access required
 */
router.post('/firms/:id/reindex', ...adminOnly, sensitiveRateLimiter, reindexSearchData);

/**
 * @openapi
 * /api/admin/tools/firms/{id}/cleanup-orphaned:
 *   post:
 *     summary: Cleanup orphaned records
 *     tags: [Admin Tools - Data Fixes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Orphaned records cleaned up
 *       403:
 *         description: Admin access required
 */
router.post('/firms/:id/cleanup-orphaned', ...adminOnly, sensitiveRateLimiter, cleanupOrphanedRecords);

/**
 * @openapi
 * /api/admin/tools/firms/{id}/validate:
 *   get:
 *     summary: Validate data integrity
 *     tags: [Admin Tools - Data Fixes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Data integrity validation complete
 *       403:
 *         description: Admin access required
 */
router.get('/firms/:id/validate', ...adminOnly, publicRateLimiter, validateDataIntegrity);

/**
 * @openapi
 * /api/admin/tools/firms/{id}/fix-currency:
 *   post:
 *     summary: Fix currency conversion issues
 *     tags: [Admin Tools - Data Fixes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Currency conversions fixed
 *       403:
 *         description: Admin access required
 */
router.post('/firms/:id/fix-currency', ...adminOnly, sensitiveRateLimiter, fixCurrencyConversions);

// ═══════════════════════════════════════════════════════════════
// SYSTEM TOOLS ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @openapi
 * /api/admin/tools/stats:
 *   get:
 *     summary: Get system-wide statistics
 *     tags: [Admin Tools - System]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System statistics retrieved
 *       403:
 *         description: Admin access required
 */
router.get('/stats', ...adminOnly, publicRateLimiter, getSystemStats);

/**
 * @openapi
 * /api/admin/tools/activity-report:
 *   get:
 *     summary: Get user activity report
 *     tags: [Admin Tools - System]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Activity report retrieved
 *       403:
 *         description: Admin access required
 */
router.get('/activity-report', ...adminOnly, publicRateLimiter, getUserActivityReport);

/**
 * @openapi
 * /api/admin/tools/storage-usage:
 *   get:
 *     summary: Get storage usage per firm
 *     tags: [Admin Tools - System]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: firmId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Storage usage retrieved
 *       403:
 *         description: Admin access required
 */
router.get('/storage-usage', ...adminOnly, publicRateLimiter, getStorageUsage);

/**
 * @openapi
 * /api/admin/tools/clear-cache:
 *   post:
 *     summary: Clear cache by pattern
 *     tags: [Admin Tools - System]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pattern:
 *                 type: string
 *                 default: "*"
 *                 description: Cache key pattern (e.g., "user:*")
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 *       403:
 *         description: Admin access required
 */
router.post('/clear-cache', ...adminOnly, sensitiveRateLimiter, clearCache);

/**
 * @openapi
 * /api/admin/tools/diagnostics:
 *   get:
 *     summary: Run system diagnostics
 *     tags: [Admin Tools - System]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Diagnostics completed
 *       403:
 *         description: Admin access required
 */
router.get('/diagnostics', ...adminOnly, publicRateLimiter, runDiagnostics);

/**
 * @openapi
 * /api/admin/tools/slow-queries:
 *   get:
 *     summary: Get slow database queries
 *     tags: [Admin Tools - System]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Slow queries retrieved
 *       403:
 *         description: Admin access required
 */
router.get('/slow-queries', ...adminOnly, publicRateLimiter, getSlowQueries);

// ═══════════════════════════════════════════════════════════════
// USER MANAGEMENT ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @openapi
 * /api/admin/tools/users/{id}/reset-password:
 *   post:
 *     summary: Reset user password and send email
 *     tags: [Admin Tools - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       403:
 *         description: Admin access required
 */
router.post('/users/:id/reset-password', ...adminOnly, sensitiveRateLimiter, resetUserPassword);

/**
 * @openapi
 * /api/admin/tools/users/{id}/impersonate:
 *   post:
 *     summary: Create impersonation session
 *     tags: [Admin Tools - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Impersonation session created
 *       403:
 *         description: Admin access required
 */
router.post('/users/:id/impersonate', ...adminOnly, sensitiveRateLimiter, impersonateUser);

/**
 * @openapi
 * /api/admin/tools/impersonation/{sessionId}/end:
 *   post:
 *     summary: End impersonation session
 *     tags: [Admin Tools - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Impersonation ended
 *       403:
 *         description: Admin access required
 */
router.post('/impersonation/:sessionId/end', ...adminOnly, sensitiveRateLimiter, endImpersonation);

/**
 * @openapi
 * /api/admin/tools/users/{id}/lock:
 *   post:
 *     summary: Lock user account
 *     tags: [Admin Tools - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 default: administrative_action
 *     responses:
 *       200:
 *         description: User account locked
 *       403:
 *         description: Admin access required
 */
router.post('/users/:id/lock', ...adminOnly, sensitiveRateLimiter, lockUser);

/**
 * @openapi
 * /api/admin/tools/users/{id}/unlock:
 *   post:
 *     summary: Unlock user account
 *     tags: [Admin Tools - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User account unlocked
 *       403:
 *         description: Admin access required
 */
router.post('/users/:id/unlock', ...adminOnly, sensitiveRateLimiter, unlockUser);

/**
 * @openapi
 * /api/admin/tools/users/{id}/login-history:
 *   get:
 *     summary: Get login history for user
 *     tags: [Admin Tools - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Login history retrieved
 *       403:
 *         description: Admin access required
 */
router.get('/users/:id/login-history', ...adminOnly, publicRateLimiter, getLoginHistory);

module.exports = router;
