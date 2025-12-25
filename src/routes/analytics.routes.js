const express = require('express');
const { userMiddleware } = require('../middlewares');
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

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// ANALYTICS TRACKING ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/analytics/events
 * Track an event from the frontend
 * Body: { eventType, eventName, properties, metadata, duration }
 */
router.post('/events', userMiddleware, trackEvent);

// ═══════════════════════════════════════════════════════════════
// ANALYTICS DASHBOARD & REPORTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/analytics/dashboard
 * Get analytics dashboard summary
 * Query: { start, end }
 */
router.get('/dashboard', userMiddleware, getDashboard);

/**
 * GET /api/analytics/events/counts
 * Get event counts by type
 * Query: { eventType, start, end }
 */
router.get('/events/counts', userMiddleware, getEventCounts);

// ═══════════════════════════════════════════════════════════════
// FEATURE ANALYTICS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/analytics/features
 * Get feature usage statistics
 * Query: { start, end }
 */
router.get('/features', userMiddleware, getFeatureUsage);

/**
 * GET /api/analytics/features/popular
 * Get most popular features
 * Query: { start, end, limit }
 */
router.get('/features/popular', userMiddleware, getPopularFeatures);

// ═══════════════════════════════════════════════════════════════
// USER ENGAGEMENT & RETENTION
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/analytics/engagement
 * Get user engagement metrics (DAU, WAU, MAU)
 * Query: { start, end }
 */
router.get('/engagement', userMiddleware, getEngagement);

/**
 * GET /api/analytics/retention
 * Get retention cohorts
 * Query: { start, end }
 */
router.get('/retention', userMiddleware, getRetention);

// ═══════════════════════════════════════════════════════════════
// FUNNEL & WORKFLOW ANALYTICS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/analytics/funnel
 * Get funnel analysis
 * Query: { steps (comma-separated or JSON array), start, end }
 */
router.get('/funnel', userMiddleware, getFunnel);

/**
 * GET /api/analytics/dropoff
 * Get dropoff points in a workflow
 * Query: { workflow (comma-separated or JSON array), start, end }
 */
router.get('/dropoff', userMiddleware, getDropoffPoints);

// ═══════════════════════════════════════════════════════════════
// USER JOURNEY
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/analytics/users/:userId/journey
 * Get user's event timeline
 * Query: { start, end }
 */
router.get('/users/:userId/journey', userMiddleware, getUserJourney);

// ═══════════════════════════════════════════════════════════════
// DATA EXPORT
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/analytics/export
 * Export analytics data
 * Query: { eventType, start, end, format (json|csv) }
 */
router.get('/export', userMiddleware, exportAnalytics);

module.exports = router;
