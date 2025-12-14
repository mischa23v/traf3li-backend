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
    getUpcomingHearings,
    getUpcomingDeadlines,
    getBillableHoursSummary,
    getPendingDocuments
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

// ═══════════════════════════════════════════════════════════════
// LAWYER-FOCUSED DASHBOARD ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// Get upcoming hearings/court dates
app.get('/hearings/upcoming',
    userMiddleware,
    firmFilter,
    cacheResponse(DASHBOARD_CACHE_TTL, dashboardKeyGen('hearings-upcoming')),
    getUpcomingHearings
);

// Get upcoming case deadlines
app.get('/deadlines/upcoming',
    userMiddleware,
    firmFilter,
    cacheResponse(DASHBOARD_CACHE_TTL, dashboardKeyGen('deadlines-upcoming')),
    getUpcomingDeadlines
);

// Get billable hours summary
app.get('/time-entries/summary',
    userMiddleware,
    firmFilter,
    cacheResponse(DASHBOARD_CACHE_TTL, dashboardKeyGen('time-entries-summary')),
    getBillableHoursSummary
);

// Get documents pending action
app.get('/documents/pending',
    userMiddleware,
    firmFilter,
    cacheResponse(DASHBOARD_CACHE_TTL, dashboardKeyGen('documents-pending')),
    getPendingDocuments
);

module.exports = app;
