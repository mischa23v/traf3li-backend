/**
 * Admin API Routes
 *
 * Comprehensive admin API endpoints for integration with
 * Appsmith, Budibase, or other admin panels.
 *
 * All routes require authentication and admin role.
 * Routes are organized by functional area:
 * - Dashboard: Overview and metrics
 * - Users: User management
 * - Audit: Audit logs and compliance
 * - Firms: Firm management (super admin only)
 *
 * Security features:
 * - Admin authentication required
 * - Rate limiting applied
 * - All actions logged
 * - Optional IP whitelist
 * - Multi-tenancy support
 */

const express = require('express');
const { authenticate } = require('../middlewares');
const {
    requireAdmin,
    requireSuperAdmin,
    logAdminAction,
    adminRateLimiter
} = require('../middlewares/adminAuth.middleware');
const { publicRateLimiter, sensitiveRateLimiter } = require('../middlewares/rateLimiter.middleware');

// Dashboard controllers
const {
    getDashboardSummary,
    getRevenueMetrics,
    getActiveUsers,
    getSystemHealth,
    getPendingApprovals,
    getRecentActivity
} = require('../controllers/adminDashboard.controller');

// Users controllers
const {
    listUsers,
    getUserDetails,
    updateUserStatus,
    revokeUserTokens,
    resetUserPassword,
    exportUsers
} = require('../controllers/adminUsers.controller');

// Audit controllers
const {
    getAuditLogs,
    getSecurityEvents,
    getComplianceReport,
    exportAuditLogs,
    getLoginHistory
} = require('../controllers/adminAudit.controller');

// Firms controllers
const {
    listFirms,
    getFirmDetails,
    getFirmUsage,
    updateFirmPlan,
    suspendFirm
} = require('../controllers/adminFirms.controller');

const app = express.Router();

// Apply authentication and admin check to all routes
app.use(authenticate);
app.use(requireAdmin());
app.use(logAdminAction());

// ==================== DASHBOARD ROUTES ====================

/**
 * @openapi
 * /api/admin-api/dashboard/summary:
 *   get:
 *     summary: Get dashboard summary with key metrics
 *     description: Returns comprehensive overview statistics for the admin dashboard
 *     tags:
 *       - Admin - Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: object
 *                     firms:
 *                       type: object
 *                     cases:
 *                       type: object
 *                     revenue:
 *                       type: object
 *       403:
 *         description: Admin access required
 */
app.get('/dashboard/summary', publicRateLimiter, getDashboardSummary);

/**
 * @openapi
 * /api/admin-api/dashboard/revenue:
 *   get:
 *     summary: Get revenue metrics and financial analytics
 *     description: Returns revenue breakdown by month, payment method, and top clients
 *     tags:
 *       - Admin - Dashboard
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: months
 *         schema:
 *           type: integer
 *           default: 12
 *         description: Number of months to include
 *     responses:
 *       200:
 *         description: Revenue metrics retrieved successfully
 */
app.get('/dashboard/revenue', publicRateLimiter, getRevenueMetrics);

/**
 * @openapi
 * /api/admin-api/dashboard/active-users:
 *   get:
 *     summary: Get active users and activity metrics
 *     description: Returns active user counts by time period and role
 *     tags:
 *       - Admin - Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active user metrics retrieved successfully
 */
app.get('/dashboard/active-users', publicRateLimiter, getActiveUsers);

/**
 * @openapi
 * /api/admin-api/dashboard/system-health:
 *   get:
 *     summary: Get system health and performance metrics
 *     description: Returns database status, server health, and error statistics
 *     tags:
 *       - Admin - Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System health retrieved successfully
 */
app.get('/dashboard/system-health', publicRateLimiter, getSystemHealth);

/**
 * @openapi
 * /api/admin-api/dashboard/pending-approvals:
 *   get:
 *     summary: Get pending approvals and items requiring attention
 *     description: Returns pending approval requests, overdue invoices, and unverified users
 *     tags:
 *       - Admin - Dashboard
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Pending approvals retrieved successfully
 */
app.get('/dashboard/pending-approvals', publicRateLimiter, getPendingApprovals);

/**
 * @openapi
 * /api/admin-api/dashboard/recent-activity:
 *   get:
 *     summary: Get recent activity feed
 *     description: Returns recent audit log entries and activity statistics
 *     tags:
 *       - Admin - Dashboard
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Recent activity retrieved successfully
 */
app.get('/dashboard/recent-activity', publicRateLimiter, getRecentActivity);

// ==================== USERS ROUTES ====================

/**
 * @openapi
 * /api/admin-api/users:
 *   get:
 *     summary: List users with filtering and pagination
 *     description: Returns paginated list of users with advanced filtering options
 *     tags:
 *       - Admin - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, lawyer, client, staff]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, suspended, banned, deleted]
 *       - in: query
 *         name: verified
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, lastLogin, firstName, email]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
app.get('/users', publicRateLimiter, listUsers);

/**
 * @openapi
 * /api/admin-api/users/export:
 *   get:
 *     summary: Export users data
 *     description: Export users to CSV or JSON format
 *     tags:
 *       - Admin - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, json]
 *           default: json
 *     responses:
 *       200:
 *         description: Users exported successfully
 */
app.get('/users/export', publicRateLimiter, exportUsers);

/**
 * @openapi
 * /api/admin-api/users/{id}:
 *   get:
 *     summary: Get detailed user information
 *     description: Returns comprehensive user details including activity history
 *     tags:
 *       - Admin - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *       404:
 *         description: User not found
 */
app.get('/users/:id', publicRateLimiter, getUserDetails);

/**
 * @openapi
 * /api/admin-api/users/{id}/status:
 *   patch:
 *     summary: Update user status
 *     description: Enable, disable, suspend, or ban a user account
 *     tags:
 *       - Admin - Users
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
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, suspended, banned, deleted]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: User status updated successfully
 */
app.patch('/users/:id/status', sensitiveRateLimiter, updateUserStatus);

/**
 * @openapi
 * /api/admin-api/users/{id}/revoke-tokens:
 *   post:
 *     summary: Revoke all user tokens
 *     description: Security action to log out user from all devices
 *     tags:
 *       - Admin - Users
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
 *                 enum: [admin_revoke, security_incident, account_suspended, account_deleted]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tokens revoked successfully
 */
app.post('/users/:id/revoke-tokens', sensitiveRateLimiter, revokeUserTokens);

/**
 * @openapi
 * /api/admin-api/users/{id}/reset-password:
 *   post:
 *     summary: Reset user password
 *     description: Admin password reset - generates temporary password
 *     tags:
 *       - Admin - Users
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
 *               newPassword:
 *                 type: string
 *                 description: Optional - if not provided, a random password will be generated
 *               sendEmail:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Password reset successfully
 */
app.post('/users/:id/reset-password', sensitiveRateLimiter, resetUserPassword);

// ==================== AUDIT ROUTES ====================

/**
 * @openapi
 * /api/admin-api/audit/logs:
 *   get:
 *     summary: Get audit logs with filtering
 *     description: Returns audit logs with advanced filtering and pagination
 *     tags:
 *       - Admin - Audit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: resourceType
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SUCCESS, FAILED]
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
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
 *         description: Audit logs retrieved successfully
 */
app.get('/audit/logs', publicRateLimiter, getAuditLogs);

/**
 * @openapi
 * /api/admin-api/audit/security-events:
 *   get:
 *     summary: Get security-specific events
 *     description: Returns high-severity events and security incidents
 *     tags:
 *       - Admin - Audit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
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
 *         description: Security events retrieved successfully
 */
app.get('/audit/security-events', publicRateLimiter, getSecurityEvents);

/**
 * @openapi
 * /api/admin-api/audit/compliance-report:
 *   get:
 *     summary: Generate compliance report
 *     description: Returns comprehensive compliance metrics for specified period
 *     tags:
 *       - Admin - Audit
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
 *         description: Compliance report generated successfully
 */
app.get('/audit/compliance-report', publicRateLimiter, getComplianceReport);

/**
 * @openapi
 * /api/admin-api/audit/export:
 *   get:
 *     summary: Export audit logs
 *     description: Export audit logs to CSV or JSON for compliance
 *     tags:
 *       - Admin - Audit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, json]
 *           default: json
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Audit logs exported successfully
 */
app.get('/audit/export', publicRateLimiter, exportAuditLogs);

/**
 * @openapi
 * /api/admin-api/audit/login-history:
 *   get:
 *     summary: Get user login history
 *     description: Returns login/logout events with IP addresses
 *     tags:
 *       - Admin - Audit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
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
 *         description: Login history retrieved successfully
 */
app.get('/audit/login-history', publicRateLimiter, getLoginHistory);

// ==================== FIRMS ROUTES (Super Admin Only) ====================

/**
 * @openapi
 * /api/admin-api/firms:
 *   get:
 *     summary: List all firms with statistics (Super Admin)
 *     description: Returns all firms with user counts and activity metrics
 *     tags:
 *       - Admin - Firms
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, suspended, trial, cancelled]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Firms retrieved successfully
 *       403:
 *         description: Super admin access required
 */
app.get('/firms', publicRateLimiter, listFirms);

/**
 * @openapi
 * /api/admin-api/firms/{id}:
 *   get:
 *     summary: Get detailed firm information
 *     description: Returns comprehensive firm details with users and statistics
 *     tags:
 *       - Admin - Firms
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
 *         description: Firm details retrieved successfully
 *       404:
 *         description: Firm not found
 */
app.get('/firms/:id', publicRateLimiter, getFirmDetails);

/**
 * @openapi
 * /api/admin-api/firms/{id}/usage:
 *   get:
 *     summary: Get firm usage metrics
 *     description: Returns usage statistics and activity metrics for a firm
 *     tags:
 *       - Admin - Firms
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Firm usage retrieved successfully
 */
app.get('/firms/:id/usage', publicRateLimiter, getFirmUsage);

/**
 * @openapi
 * /api/admin-api/firms/{id}/plan:
 *   patch:
 *     summary: Update firm plan/subscription (Super Admin)
 *     description: Change firm's subscription plan
 *     tags:
 *       - Admin - Firms
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
 *             required:
 *               - plan
 *             properties:
 *               plan:
 *                 type: string
 *                 enum: [free, basic, professional, enterprise]
 *               status:
 *                 type: string
 *                 enum: [active, cancelled, trial]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Firm plan updated successfully
 */
app.patch('/firms/:id/plan', sensitiveRateLimiter, updateFirmPlan);

/**
 * @openapi
 * /api/admin-api/firms/{id}/suspend:
 *   patch:
 *     summary: Suspend or unsuspend a firm (Super Admin)
 *     description: Suspend or reactivate a firm and all its users
 *     tags:
 *       - Admin - Firms
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
 *             required:
 *               - suspend
 *             properties:
 *               suspend:
 *                 type: boolean
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Firm status updated successfully
 */
app.patch('/firms/:id/suspend', sensitiveRateLimiter, suspendFirm);

module.exports = app;
