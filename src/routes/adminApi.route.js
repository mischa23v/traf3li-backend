/**
 * Admin API Routes
 *
 * Comprehensive Admin API for Appsmith/Budibase integration
 * Provides dashboard, users, audit, and firms management endpoints
 *
 * SECURITY: All routes require authentication via the global middleware
 */

const express = require('express');
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

router.get('/dashboard/summary', publicRateLimiter, getDashboardSummary);

router.get('/dashboard/revenue', publicRateLimiter, getRevenueMetrics);

router.get('/dashboard/active-users', publicRateLimiter, getActiveUsers);

router.get('/dashboard/system-health', publicRateLimiter, getSystemHealth);

router.get('/dashboard/pending-approvals', publicRateLimiter, getPendingApprovals);

router.get('/dashboard/recent-activity', publicRateLimiter, getRecentActivity);

// ==================== USERS ROUTES ====================

router.get('/users', publicRateLimiter, listUsers);

router.get('/users/export', sensitiveRateLimiter, exportUsers);

router.get('/users/:id', publicRateLimiter, getUserDetails);

router.patch('/users/:id/status', sensitiveRateLimiter, updateUserStatus);

router.post('/users/:id/revoke-tokens', sensitiveRateLimiter, revokeUserTokens);

router.post('/users/:id/reset-password', sensitiveRateLimiter, resetUserPassword);

// ==================== AUDIT ROUTES ====================

router.get('/audit/logs', publicRateLimiter, getAuditLogs);

router.get('/audit/security-events', sensitiveRateLimiter, getSecurityEvents);

router.get('/audit/compliance-report', publicRateLimiter, getComplianceReport);

router.get('/audit/export', sensitiveRateLimiter, exportAuditLogs);

router.get('/audit/login-history', publicRateLimiter, getLoginHistory);

// ==================== FIRMS ROUTES (Super Admin Only) ====================

router.get('/firms', publicRateLimiter, listFirms);

router.get('/firms/:id', publicRateLimiter, getFirmDetails);

router.get('/firms/:id/usage', publicRateLimiter, getFirmUsage);

router.patch('/firms/:id/plan', sensitiveRateLimiter, updateFirmPlan);

router.patch('/firms/:id/suspend', sensitiveRateLimiter, suspendFirm);

module.exports = router;
