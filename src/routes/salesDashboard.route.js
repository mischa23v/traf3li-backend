/**
 * Sales Dashboard Routes
 *
 * Enterprise-grade sales dashboard with tiered views (Basic/Advanced)
 * Includes caching for optimal performance
 */

const express = require('express');
const { cacheResponse } = require('../middlewares/cache.middleware');
const { sanitizeString } = require('../utils/securityUtils');

const {
    // Main dashboard
    getSalesDashboard,
    getBasicDashboard,
    getAdvancedDashboard,

    // Hero stats
    getHeroStats,

    // Pipeline & Forecast
    getPipelineMetrics,
    getForecast,
    getTargetProgress,

    // Reports
    getAllReports,
    getSalesSummaryReport,
    getRevenueReport,
    getSalesByRepReport,
    getQuotationReport,
    getCommissionReport,
    getProductReport,

    // Calculations
    calculateQuote,
    simulateDiscount,
    suggestDiscount,

    // Settings
    getSettings,
    updateViewMode,
    updateSettings
} = require('../controllers/salesDashboard.controller');

const app = express.Router();

// Cache TTL: 5 minutes for dashboard endpoints
const DASHBOARD_CACHE_TTL = 300;
// Shorter TTL for frequently changing data
const SHORT_CACHE_TTL = 60;

// Custom key generator for sales dashboard endpoints
const salesKeyGen = (endpoint) => (req) => {
    const firmId = req.firmQuery?.firmId || req.firmQuery?.lawyerId || 'none';
    const userId = req.userID || 'guest';
    return `sales-dashboard:${firmId}:${userId}:${endpoint}`;
};

// Key generator with date range parameters
const salesDateKeyGen = (endpoint) => (req) => {
    const firmId = req.firmQuery?.firmId || req.firmQuery?.lawyerId || 'none';
    const userId = req.userID || 'guest';
    const startDate = sanitizeString(req.query.startDate) || 'default';
    const endDate = sanitizeString(req.query.endDate) || 'default';
    const period = sanitizeString(req.query.period) || 'month';
    return `sales-dashboard:${firmId}:${userId}:${endpoint}:${period}:${startDate}:${endDate}`;
};

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// Main dashboard - auto-selects view based on user preference
app.get('/',
    cacheResponse(SHORT_CACHE_TTL, salesDateKeyGen('main')),
    getSalesDashboard
);

// Force basic view
app.get('/basic',
    cacheResponse(DASHBOARD_CACHE_TTL, salesDateKeyGen('basic')),
    getBasicDashboard
);

// Force advanced view
app.get('/advanced',
    cacheResponse(DASHBOARD_CACHE_TTL, salesDateKeyGen('advanced')),
    getAdvancedDashboard
);

// Hero stats only
app.get('/hero-stats',
    cacheResponse(SHORT_CACHE_TTL, salesDateKeyGen('hero-stats')),
    getHeroStats
);

// ═══════════════════════════════════════════════════════════════
// PIPELINE & FORECAST
// ═══════════════════════════════════════════════════════════════

app.get('/pipeline',
    cacheResponse(DASHBOARD_CACHE_TTL, salesDateKeyGen('pipeline')),
    getPipelineMetrics
);

app.get('/forecast',
    cacheResponse(DASHBOARD_CACHE_TTL, salesDateKeyGen('forecast')),
    getForecast
);

app.get('/target-progress',
    cacheResponse(DASHBOARD_CACHE_TTL, (req) => {
        const firmId = req.firmQuery?.firmId || req.firmQuery?.lawyerId || 'none';
        const userId = req.userID || 'guest';
        const salesPersonId = sanitizeString(req.query.salesPersonId) || 'all';
        return `sales-dashboard:${firmId}:${userId}:target-progress:${salesPersonId}`;
    }),
    getTargetProgress
);

// ═══════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════

// All reports in one call
app.get('/reports',
    cacheResponse(DASHBOARD_CACHE_TTL, salesDateKeyGen('reports-all')),
    getAllReports
);

// Individual reports
app.get('/reports/summary',
    cacheResponse(DASHBOARD_CACHE_TTL, salesDateKeyGen('reports-summary')),
    getSalesSummaryReport
);

app.get('/reports/revenue',
    cacheResponse(DASHBOARD_CACHE_TTL, salesDateKeyGen('reports-revenue')),
    getRevenueReport
);

app.get('/reports/by-rep',
    cacheResponse(DASHBOARD_CACHE_TTL, salesDateKeyGen('reports-by-rep')),
    getSalesByRepReport
);

app.get('/reports/quotations',
    cacheResponse(DASHBOARD_CACHE_TTL, salesDateKeyGen('reports-quotations')),
    getQuotationReport
);

app.get('/reports/commission',
    cacheResponse(DASHBOARD_CACHE_TTL, salesDateKeyGen('reports-commission')),
    getCommissionReport
);

app.get('/reports/products',
    cacheResponse(DASHBOARD_CACHE_TTL, salesDateKeyGen('reports-products')),
    getProductReport
);

// ═══════════════════════════════════════════════════════════════
// CALCULATIONS (No caching - always fresh)
// ═══════════════════════════════════════════════════════════════

app.post('/calculate-quote', calculateQuote);
app.post('/simulate-discount', simulateDiscount);
app.post('/suggest-discount', suggestDiscount);

// ═══════════════════════════════════════════════════════════════
// SETTINGS (No caching - user-specific)
// ═══════════════════════════════════════════════════════════════

app.get('/settings', getSettings);
app.put('/settings/view-mode', updateViewMode);
app.put('/settings', updateSettings);

module.exports = app;
