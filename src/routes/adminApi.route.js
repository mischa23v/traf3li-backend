app.get('/dashboard/summary', publicRateLimiter, getDashboardSummary);

app.get('/dashboard/revenue', publicRateLimiter, getRevenueMetrics);

app.get('/dashboard/active-users', publicRateLimiter, getActiveUsers);

app.get('/dashboard/system-health', publicRateLimiter, getSystemHealth);

app.get('/dashboard/pending-approvals', publicRateLimiter, getPendingApprovals);

app.get('/dashboard/recent-activity', publicRateLimiter, getRecentActivity);

// ==================== USERS ROUTES ====================

app.get('/users', publicRateLimiter, listUsers);

app.get('/users/export', sensitiveRateLimiter, exportUsers);

app.get('/users/:id', publicRateLimiter, getUserDetails);

app.patch('/users/:id/status', sensitiveRateLimiter, updateUserStatus);

app.post('/users/:id/revoke-tokens', sensitiveRateLimiter, revokeUserTokens);

app.post('/users/:id/reset-password', sensitiveRateLimiter, resetUserPassword);

// ==================== AUDIT ROUTES ====================

app.get('/audit/logs', publicRateLimiter, getAuditLogs);

app.get('/audit/security-events', sensitiveRateLimiter, getSecurityEvents);

app.get('/audit/compliance-report', publicRateLimiter, getComplianceReport);

app.get('/audit/export', sensitiveRateLimiter, exportAuditLogs);

app.get('/audit/login-history', publicRateLimiter, getLoginHistory);

// ==================== FIRMS ROUTES (Super Admin Only) ====================

app.get('/firms', publicRateLimiter, listFirms);

app.get('/firms/:id', publicRateLimiter, getFirmDetails);

app.get('/firms/:id/usage', publicRateLimiter, getFirmUsage);

app.patch('/firms/:id/plan', sensitiveRateLimiter, updateFirmPlan);

app.patch('/firms/:id/suspend', sensitiveRateLimiter, suspendFirm);

module.exports = app;
