const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const { cacheResponse } = require('../middlewares/cache.middleware');
const {
    getHeroStats,
    getDashboardStats,
    getFinancialSummary,
    getTodayEvents,
    getRecentMessages,
    getActivityOverview,
    getCRMStats,
    getHRStats,
    getFinanceStats,
    getDashboardSummary,
    getAnalytics,
    getReports
} = require('../controllers/dashboard.controller');

const app = express.Router();

// Cache TTL: 5 minutes for dashboard endpoints
// Dashboard data doesn't need real-time updates - saves Redis requests
const DASHBOARD_CACHE_TTL = 300;

// Custom key generator for dashboard endpoints
const dashboardKeyGen = (endpoint) => (req) => {
    const firmId = req.firmId || 'none';
    const userId = req.userID || 'guest';
    return `dashboard:firm:${firmId}:user:${userId}:${endpoint}`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// GOLD STANDARD: Combined dashboard summary endpoint
// Replaces 7 separate API calls with one parallel-executed query
// Frontend should use this endpoint for initial dashboard load
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/summary',
    userMiddleware,
    firmFilter,
    cacheResponse(60, dashboardKeyGen('summary')), // 60 second cache for summary
    getDashboardSummary
);

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH ENDPOINT: Analytics - Replaces 9 separate API calls
// Returns: revenue, clients, cases, invoices data in one response
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/analytics',
    userMiddleware,
    firmFilter,
    cacheResponse(DASHBOARD_CACHE_TTL, dashboardKeyGen('analytics')),
    getAnalytics
);

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH ENDPOINT: Reports - Replaces 3 chart API calls
// Query: ?period=week|month|quarter|year
// Returns: casesChart, revenueChart, tasksChart with totals
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/reports',
    userMiddleware,
    firmFilter,
    cacheResponse(DASHBOARD_CACHE_TTL, (req) => `dashboard:firm:${req.firmId || 'none'}:user:${req.userID || 'guest'}:reports:${req.query.period || 'month'}`),
    getReports
);

// Get hero stats (top-level metrics for dashboard header)
app.get('/hero-stats',
    userMiddleware,
    firmFilter,
    cacheResponse(DASHBOARD_CACHE_TTL, dashboardKeyGen('hero-stats')),
    getHeroStats
);

// Get detailed dashboard stats
app.get('/stats',
    userMiddleware,
    firmFilter,
    cacheResponse(DASHBOARD_CACHE_TTL, dashboardKeyGen('stats')),
    getDashboardStats
);

// Get financial summary
app.get('/financial-summary',
    userMiddleware,
    firmFilter,
    cacheResponse(DASHBOARD_CACHE_TTL, dashboardKeyGen('financial-summary')),
    getFinancialSummary
);

// Get today's events
app.get('/today-events',
    userMiddleware,
    firmFilter,
    cacheResponse(DASHBOARD_CACHE_TTL, dashboardKeyGen('today-events')),
    getTodayEvents
);

// Get recent messages
app.get('/recent-messages',
    userMiddleware,
    firmFilter,
    cacheResponse(DASHBOARD_CACHE_TTL, dashboardKeyGen('recent-messages')),
    getRecentMessages
);

// Get activity overview
app.get('/activity',
    userMiddleware,
    firmFilter,
    cacheResponse(DASHBOARD_CACHE_TTL, dashboardKeyGen('activity')),
    getActivityOverview
);

// Get CRM stats (for Analytics tab)
app.get('/crm-stats',
    userMiddleware,
    firmFilter,
    cacheResponse(DASHBOARD_CACHE_TTL, dashboardKeyGen('crm-stats')),
    getCRMStats
);

// Get HR stats (for Analytics tab)
app.get('/hr-stats',
    userMiddleware,
    firmFilter,
    cacheResponse(DASHBOARD_CACHE_TTL, dashboardKeyGen('hr-stats')),
    getHRStats
);

// Get Finance stats (for Analytics tab)
app.get('/finance-stats',
    userMiddleware,
    firmFilter,
    cacheResponse(DASHBOARD_CACHE_TTL, dashboardKeyGen('finance-stats')),
    getFinanceStats
);

module.exports = app;
