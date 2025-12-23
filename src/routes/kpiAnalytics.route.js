const express = require('express');
const router = express.Router();
const { userMiddleware, firmFilter } = require('../middlewares');
const { cacheResponse } = require('../middlewares/cache.middleware');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const kpiAnalyticsController = require('../controllers/kpiAnalytics.controller');

// Cache TTL: 300 seconds (5 minutes) for analytics endpoints
const ANALYTICS_CACHE_TTL = 300;

// Apply rate limiting to all routes
router.use(apiRateLimiter);

/**
 * @openapi
 * /api/analytics/kpi-dashboard:
 *   get:
 *     summary: Get KPI Dashboard metrics
 *     description: Returns all key performance indicators including case throughput, revenue metrics, and user activation stats
 *     tags:
 *       - Analytics
 *       - KPI
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to include in the analysis
 *     responses:
 *       200:
 *         description: KPI Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: object
 *                   properties:
 *                     caseMetrics:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         active:
 *                           type: integer
 *                         closed:
 *                           type: integer
 *                         closedThisPeriod:
 *                           type: integer
 *                         avgCycleTime:
 *                           type: integer
 *                     revenueMetrics:
 *                       type: object
 *                       properties:
 *                         totalInvoiced:
 *                           type: number
 *                         totalPaid:
 *                           type: number
 *                         collectionRate:
 *                           type: integer
 *                         revenuePerCase:
 *                           type: number
 *                     activationMetrics:
 *                       type: object
 *                       properties:
 *                         timeEntriesThisPeriod:
 *                           type: integer
 *                         documentsThisPeriod:
 *                           type: integer
 *                         activationRate:
 *                           type: integer
 *                     period:
 *                       type: integer
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/kpi-dashboard',
    userMiddleware,
    firmFilter,
    cacheResponse(ANALYTICS_CACHE_TTL, (req) => `analytics:firm:${req.firmId || 'none'}:kpi-dashboard:period:${req.query.period || 30}`),
    kpiAnalyticsController.getKPIDashboard
);

/**
 * @openapi
 * /api/analytics/revenue-by-case:
 *   get:
 *     summary: Get revenue breakdown by case
 *     description: Returns detailed revenue metrics for each case with invoicing data
 *     tags:
 *       - Analytics
 *       - KPI
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Revenue by case data retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/revenue-by-case',
    userMiddleware,
    firmFilter,
    cacheResponse(ANALYTICS_CACHE_TTL, (req) => `analytics:firm:${req.firmId || 'none'}:revenue-by-case:${req.originalUrl}`),
    kpiAnalyticsController.getRevenueByCase
);

/**
 * @openapi
 * /api/analytics/case-throughput:
 *   get:
 *     summary: Get case throughput metrics
 *     description: Returns case opening/closing rates over time with category and outcome breakdowns
 *     tags:
 *       - Analytics
 *       - KPI
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to analyze
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: week
 *         description: Time grouping for the timeline
 *     responses:
 *       200:
 *         description: Case throughput data retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/case-throughput',
    userMiddleware,
    firmFilter,
    cacheResponse(ANALYTICS_CACHE_TTL, (req) => `analytics:firm:${req.firmId || 'none'}:case-throughput:${req.originalUrl}`),
    kpiAnalyticsController.getCaseThroughput
);

/**
 * @openapi
 * /api/analytics/user-activation:
 *   get:
 *     summary: Get user activation metrics
 *     description: Returns user activity metrics including time entries, documents, and case handling
 *     tags:
 *       - Analytics
 *       - KPI
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to analyze
 *     responses:
 *       200:
 *         description: User activation data retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/user-activation',
    userMiddleware,
    firmFilter,
    cacheResponse(ANALYTICS_CACHE_TTL, (req) => `analytics:firm:${req.firmId || 'none'}:user-activation:period:${req.query.period || 30}`),
    kpiAnalyticsController.getUserActivation
);

module.exports = router;
