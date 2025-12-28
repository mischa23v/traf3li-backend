const express = require('express');
const { cacheResponse } = require('../middlewares/cache.middleware');
const { sanitizeString } = require('../utils/securityUtils');
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
const DASHBOARD_CACHE_TTL = 300;

// Custom key generator for dashboard endpoints
const dashboardKeyGen = (endpoint) => (req) => {
    const firmId = req.firmId || 'none';
    const userId = req.userID || 'guest';
    return `dashboard:firm:${firmId}:user:${userId}:${endpoint}`;
};

// Combined dashboard summary endpoint
app.get('/summary',
    cacheResponse(60, dashboardKeyGen('summary')),
    getDashboardSummary
);

// Batch endpoint: Analytics
app.get('/analytics',
    cacheResponse(DASHBOARD_CACHE_TTL, dashboardKeyGen('analytics')),
    getAnalytics
);

// Batch endpoint: Reports
app.get('/reports',
    cacheResponse(DASHBOARD_CACHE_TTL, (req) => {
        const firmId = req.firmId || 'none';
        const userId = req.userID || 'guest';
        const period = sanitizeString(req.query.period) || 'month';
        return `dashboard:firm:${firmId}:user:${userId}:reports:${period}`;
    }),
    getReports
);

// Get hero stats (top-level metrics for dashboard header)
app.get('/hero-stats',
    cacheResponse(DASHBOARD_CACHE_TTL, dashboardKeyGen('hero-stats')),
    getHeroStats
);

// Get detailed dashboard stats
app.get('/stats',
    cacheResponse(DASHBOARD_CACHE_TTL, dashboardKeyGen('stats')),
    getDashboardStats
);

// Get financial summary
app.get('/financial-summary',
    cacheResponse(DASHBOARD_CACHE_TTL, dashboardKeyGen('financial-summary')),
    getFinancialSummary
);

// Get today's events
app.get('/today-events',
    cacheResponse(DASHBOARD_CACHE_TTL, dashboardKeyGen('today-events')),
    getTodayEvents
);

// Get recent messages
app.get('/recent-messages',
    cacheResponse(DASHBOARD_CACHE_TTL, dashboardKeyGen('recent-messages')),
    getRecentMessages
);

// Get activity overview
app.get('/activity',
    cacheResponse(DASHBOARD_CACHE_TTL, dashboardKeyGen('activity')),
    getActivityOverview
);

// Get CRM stats (for Analytics tab)
app.get('/crm-stats',
    cacheResponse(DASHBOARD_CACHE_TTL, dashboardKeyGen('crm-stats')),
    getCRMStats
);

// Get HR stats (for Analytics tab)
app.get('/hr-stats',
    cacheResponse(DASHBOARD_CACHE_TTL, dashboardKeyGen('hr-stats')),
    getHRStats
);

// Get Finance stats (for Analytics tab)
app.get('/finance-stats',
    cacheResponse(DASHBOARD_CACHE_TTL, dashboardKeyGen('finance-stats')),
    getFinanceStats
);

module.exports = app;
