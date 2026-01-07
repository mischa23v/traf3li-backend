/**
 * Admin API Routes
 *
 * Comprehensive Admin API for Appsmith/Budibase integration
 * Provides dashboard, users, audit, and firms management endpoints
 *
 * SECURITY: All routes require authentication + firmAdminOnly authorization
 * Only firm admins/owners can access these endpoints
 */

const express = require('express');
const { authenticate } = require('../middlewares');
const { firmAdminOnly } = require('../middlewares/firmFilter.middleware');
const { sensitiveRateLimiter, publicRateLimiter } = require('../middlewares/rateLimiter.middleware');

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

const router = express.Router();

// ==================== DASHBOARD ROUTES ====================
// SECURITY: authenticate + firmAdminOnly on all routes

router.get('/dashboard/summary', authenticate, firmAdminOnly, publicRateLimiter, getDashboardSummary);

router.get('/dashboard/revenue', authenticate, firmAdminOnly, publicRateLimiter, getRevenueMetrics);

router.get('/dashboard/active-users', authenticate, firmAdminOnly, publicRateLimiter, getActiveUsers);

router.get('/dashboard/system-health', authenticate, firmAdminOnly, publicRateLimiter, getSystemHealth);

router.get('/dashboard/pending-approvals', authenticate, firmAdminOnly, publicRateLimiter, getPendingApprovals);

router.get('/dashboard/recent-activity', authenticate, firmAdminOnly, publicRateLimiter, getRecentActivity);

// ==================== USERS ROUTES ====================
// SECURITY: authenticate + firmAdminOnly on all routes

router.get('/users', authenticate, firmAdminOnly, publicRateLimiter, listUsers);

router.get('/users/export', authenticate, firmAdminOnly, sensitiveRateLimiter, exportUsers);

router.get('/users/:id', authenticate, firmAdminOnly, publicRateLimiter, getUserDetails);

router.patch('/users/:id/status', authenticate, firmAdminOnly, sensitiveRateLimiter, updateUserStatus);

router.post('/users/:id/revoke-tokens', authenticate, firmAdminOnly, sensitiveRateLimiter, revokeUserTokens);

router.post('/users/:id/reset-password', authenticate, firmAdminOnly, sensitiveRateLimiter, resetUserPassword);

// ==================== AUDIT ROUTES ====================
// SECURITY: authenticate + firmAdminOnly on all routes

router.get('/audit/logs', authenticate, firmAdminOnly, publicRateLimiter, getAuditLogs);

router.get('/audit/security-events', authenticate, firmAdminOnly, sensitiveRateLimiter, getSecurityEvents);

router.get('/audit/compliance-report', authenticate, firmAdminOnly, publicRateLimiter, getComplianceReport);

router.get('/audit/export', authenticate, firmAdminOnly, sensitiveRateLimiter, exportAuditLogs);

router.get('/audit/login-history', authenticate, firmAdminOnly, publicRateLimiter, getLoginHistory);

// ==================== FIRMS ROUTES ====================
// SECURITY: authenticate + firmAdminOnly - admins can only see their own firm
// Note: Controllers enforce firm isolation via req.firmQuery

router.get('/firms', authenticate, firmAdminOnly, publicRateLimiter, listFirms);

router.get('/firms/:id', authenticate, firmAdminOnly, publicRateLimiter, getFirmDetails);

router.get('/firms/:id/usage', authenticate, firmAdminOnly, publicRateLimiter, getFirmUsage);

router.patch('/firms/:id/plan', authenticate, firmAdminOnly, sensitiveRateLimiter, updateFirmPlan);

router.patch('/firms/:id/suspend', authenticate, firmAdminOnly, sensitiveRateLimiter, suspendFirm);

module.exports = router;
