const express = require('express');
const { userMiddleware } = require('../middlewares');

// Event-based analytics controller
const {
    trackEvent,
    getDashboard,
    getFeatureUsage,
    getEngagement,
    getFunnel,
    getRetention,
    getUserJourney,
    getEventCounts,
    getPopularFeatures,
    getDropoffPoints,
    exportAnalytics
} = require('../controllers/analytics.controller');

// CRM analytics controller
const crmAnalyticsController = require('../controllers/crmAnalytics.controller');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// EVENT-BASED ANALYTICS TRACKING ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/analytics/events
 * Track an event from the frontend
 * Body: { eventType, eventName, properties, metadata, duration }
 */
router.post('/events', userMiddleware, trackEvent);

/**
 * GET /api/analytics/events/counts
 * Get event counts by type
 * Query: { eventType, start, end }
 */
router.get('/events/counts', userMiddleware, getEventCounts);

// ═══════════════════════════════════════════════════════════════
// EVENT-BASED ANALYTICS DASHBOARD & REPORTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/analytics/app/dashboard
 * Get app analytics dashboard summary
 * Query: { start, end }
 */
router.get('/app/dashboard', userMiddleware, getDashboard);

/**
 * GET /api/analytics/app/features
 * Get feature usage statistics
 * Query: { start, end }
 */
router.get('/app/features', userMiddleware, getFeatureUsage);

/**
 * GET /api/analytics/app/features/popular
 * Get most popular features
 * Query: { start, end, limit }
 */
router.get('/app/features/popular', userMiddleware, getPopularFeatures);

/**
 * GET /api/analytics/app/engagement
 * Get user engagement metrics (DAU, WAU, MAU)
 * Query: { start, end }
 */
router.get('/app/engagement', userMiddleware, getEngagement);

/**
 * GET /api/analytics/app/retention
 * Get retention cohorts
 * Query: { start, end }
 */
router.get('/app/retention', userMiddleware, getRetention);

/**
 * GET /api/analytics/app/funnel
 * Get funnel analysis
 * Query: { steps (comma-separated or JSON array), start, end }
 */
router.get('/app/funnel', userMiddleware, getFunnel);

/**
 * GET /api/analytics/app/dropoff
 * Get dropoff points in a workflow
 * Query: { workflow (comma-separated or JSON array), start, end }
 */
router.get('/app/dropoff', userMiddleware, getDropoffPoints);

/**
 * GET /api/analytics/app/users/:userId/journey
 * Get user's event timeline
 * Query: { start, end }
 */
router.get('/app/users/:userId/journey', userMiddleware, getUserJourney);

/**
 * GET /api/analytics/app/export
 * Export analytics data
 * Query: { eventType, start, end, format (json|csv) }
 */
router.get('/app/export', userMiddleware, exportAnalytics);

// ═══════════════════════════════════════════════════════════════
// CRM ANALYTICS ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/analytics/crm/dashboard
 * Main CRM dashboard with comprehensive metrics
 * Query: { startDate, endDate, userId, teamId, territoryId }
 */
router.get('/crm/dashboard', userMiddleware, crmAnalyticsController.getDashboard);

/**
 * GET /api/analytics/crm/pipeline
 * Pipeline analysis with stage breakdown
 * Query: { startDate, endDate, pipelineId }
 */
router.get('/crm/pipeline', userMiddleware, crmAnalyticsController.getPipelineAnalysis);

/**
 * GET /api/analytics/crm/sales-funnel
 * Sales funnel visualization
 * Query: { startDate, endDate }
 */
router.get('/crm/sales-funnel', userMiddleware, crmAnalyticsController.getSalesFunnel);

/**
 * GET /api/analytics/crm/forecast
 * Forecast report with quota tracking
 * Query: { period, year, quarter }
 */
router.get('/crm/forecast', userMiddleware, crmAnalyticsController.getForecast);

/**
 * GET /api/analytics/crm/lead-sources
 * Lead source effectiveness analysis
 * Query: { startDate, endDate }
 */
router.get('/crm/lead-sources', userMiddleware, crmAnalyticsController.getLeadSourceAnalysis);

/**
 * GET /api/analytics/crm/win-loss
 * Win/loss analysis with reasons
 * Query: { startDate, endDate }
 */
router.get('/crm/win-loss', userMiddleware, crmAnalyticsController.getWinLossAnalysis);

/**
 * GET /api/analytics/crm/activity
 * Activity report (calls, emails, meetings)
 * Query: { startDate, endDate }
 */
router.get('/crm/activity', userMiddleware, crmAnalyticsController.getActivityReport);

/**
 * GET /api/analytics/crm/team-performance
 * Team performance metrics and leaderboards
 * Query: { startDate, endDate, teamId }
 */
router.get('/crm/team-performance', userMiddleware, crmAnalyticsController.getTeamPerformance);

/**
 * GET /api/analytics/crm/territory
 * Territory analysis and performance
 * Query: { startDate, endDate }
 */
router.get('/crm/territory', userMiddleware, crmAnalyticsController.getTerritoryAnalysis);

/**
 * GET /api/analytics/crm/campaign-roi
 * Campaign ROI analysis
 * Query: { startDate, endDate }
 */
router.get('/crm/campaign-roi', userMiddleware, crmAnalyticsController.getCampaignRoi);

/**
 * GET /api/analytics/crm/first-response
 * First response time analysis and SLA compliance
 * Query: { startDate, endDate }
 */
router.get('/crm/first-response', userMiddleware, crmAnalyticsController.getFirstResponseTime);

/**
 * GET /api/analytics/crm/conversion-rates
 * Conversion rates breakdown by source, stage, etc.
 * Query: { startDate, endDate, groupBy }
 */
router.get('/crm/conversion-rates', userMiddleware, crmAnalyticsController.getConversionRates);

/**
 * GET /api/analytics/crm/cohort
 * Cohort analysis for leads
 * Query: { months }
 */
router.get('/crm/cohort', userMiddleware, crmAnalyticsController.getCohortAnalysis);

/**
 * GET /api/analytics/crm/revenue
 * Revenue analytics by period
 * Query: { startDate, endDate, period }
 */
router.get('/crm/revenue', userMiddleware, crmAnalyticsController.getRevenueAnalytics);

/**
 * GET /api/analytics/crm/forecast-accuracy
 * Forecast vs actual comparison
 * Query: { year, quarters }
 */
router.get('/crm/forecast-accuracy', userMiddleware, crmAnalyticsController.getForecastAccuracy);

module.exports = router;
