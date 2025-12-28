/**
 * CRM Dashboard Routes
 *
 * Enterprise-grade CRM dashboard with tiered views (Basic/Advanced)
 * Includes caching for optimal performance
 */

const express = require('express');
const { cacheResponse } = require('../middlewares/cache.middleware');
const { sanitizeString } = require('../utils/securityUtils');

const {
    // Main dashboard
    getCRMDashboard,
    getBasicDashboard,
    getAdvancedDashboard,

    // Hero stats
    getHeroStats,

    // Pipeline & Lead Scoring
    getPipelineMetrics,
    getLeadScoringMetrics,
    calculateLeadScore,

    // Reports
    getAllReports,
    getCRMSummaryReport,
    getFunnelReport,
    getSourcesReport,
    getWinLossReport,
    getActivityReport,
    getForecastReport,
    getAgingReport,

    // Conflict Check
    checkConflicts,
    batchConflictCheck,

    // State Transitions
    getLeadTransitions,
    transitionLead,

    // Settings
    getSettings,
    updateViewMode,
    updateSettings,

    // Activity
    getRecentActivity
} = require('../controllers/crmDashboard.controller');

const app = express.Router();

// Cache TTL: 5 minutes for dashboard endpoints
const DASHBOARD_CACHE_TTL = 300;
// Shorter TTL for frequently changing data
const SHORT_CACHE_TTL = 60;

// Custom key generator for CRM dashboard endpoints
const crmKeyGen = (endpoint) => (req) => {
    const firmId = req.firmQuery?.firmId || req.firmQuery?.lawyerId || 'none';
    const userId = req.userID || 'guest';
    return `crm-dashboard:${firmId}:${userId}:${endpoint}`;
};

// Key generator with date range parameters
const crmDateKeyGen = (endpoint) => (req) => {
    const firmId = req.firmQuery?.firmId || req.firmQuery?.lawyerId || 'none';
    const userId = req.userID || 'guest';
    const startDate = sanitizeString(req.query.startDate) || 'default';
    const endDate = sanitizeString(req.query.endDate) || 'default';
    const period = sanitizeString(req.query.period) || 'month';
    return `crm-dashboard:${firmId}:${userId}:${endpoint}:${period}:${startDate}:${endDate}`;
};

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// Main dashboard - auto-selects view based on user preference
app.get('/',
    cacheResponse(SHORT_CACHE_TTL, crmDateKeyGen('main')),
    getCRMDashboard
);

// Force basic view
app.get('/basic',
    cacheResponse(DASHBOARD_CACHE_TTL, crmDateKeyGen('basic')),
    getBasicDashboard
);

// Force advanced view
app.get('/advanced',
    cacheResponse(DASHBOARD_CACHE_TTL, crmDateKeyGen('advanced')),
    getAdvancedDashboard
);

// Hero stats only
app.get('/hero-stats',
    cacheResponse(SHORT_CACHE_TTL, crmDateKeyGen('hero-stats')),
    getHeroStats
);

// ═══════════════════════════════════════════════════════════════
// PIPELINE & LEAD SCORING
// ═══════════════════════════════════════════════════════════════

app.get('/pipeline',
    cacheResponse(DASHBOARD_CACHE_TTL, crmDateKeyGen('pipeline')),
    getPipelineMetrics
);

app.get('/lead-scoring',
    cacheResponse(DASHBOARD_CACHE_TTL, crmDateKeyGen('lead-scoring')),
    getLeadScoringMetrics
);

// Calculate score (no caching)
app.post('/calculate-score', calculateLeadScore);

// ═══════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════

// All reports in one call
app.get('/reports',
    cacheResponse(DASHBOARD_CACHE_TTL, crmDateKeyGen('reports-all')),
    getAllReports
);

// Individual reports
app.get('/reports/summary',
    cacheResponse(DASHBOARD_CACHE_TTL, crmDateKeyGen('reports-summary')),
    getCRMSummaryReport
);

app.get('/reports/funnel',
    cacheResponse(DASHBOARD_CACHE_TTL, crmDateKeyGen('reports-funnel')),
    getFunnelReport
);

app.get('/reports/sources',
    cacheResponse(DASHBOARD_CACHE_TTL, crmDateKeyGen('reports-sources')),
    getSourcesReport
);

app.get('/reports/win-loss',
    cacheResponse(DASHBOARD_CACHE_TTL, crmDateKeyGen('reports-win-loss')),
    getWinLossReport
);

app.get('/reports/activities',
    cacheResponse(DASHBOARD_CACHE_TTL, crmDateKeyGen('reports-activities')),
    getActivityReport
);

app.get('/reports/forecast',
    cacheResponse(DASHBOARD_CACHE_TTL, crmDateKeyGen('reports-forecast')),
    getForecastReport
);

app.get('/reports/aging',
    cacheResponse(DASHBOARD_CACHE_TTL, crmDateKeyGen('reports-aging')),
    getAgingReport
);

// ═══════════════════════════════════════════════════════════════
// CONFLICT CHECK (No caching - always fresh)
// ═══════════════════════════════════════════════════════════════

app.post('/check-conflicts', checkConflicts);
app.post('/batch-conflict-check', batchConflictCheck);

// ═══════════════════════════════════════════════════════════════
// STATE TRANSITIONS (No caching)
// ═══════════════════════════════════════════════════════════════

app.get('/lead/:id/transitions', getLeadTransitions);
app.post('/lead/:id/transition', transitionLead);

// ═══════════════════════════════════════════════════════════════
// SETTINGS (No caching - user-specific)
// ═══════════════════════════════════════════════════════════════

app.get('/settings', getSettings);
app.put('/settings/view-mode', updateViewMode);
app.put('/settings', updateSettings);

// ═══════════════════════════════════════════════════════════════
// ACTIVITY FEED
// ═══════════════════════════════════════════════════════════════

app.get('/recent-activity',
    cacheResponse(SHORT_CACHE_TTL, crmKeyGen('recent-activity')),
    getRecentActivity
);

module.exports = app;
