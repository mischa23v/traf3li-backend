const express = require('express');
const router = express.Router();
const { userMiddleware, firmFilter } = require('../middlewares');
const { cacheResponse } = require('../middlewares/cache.middleware');
const kpiAnalyticsController = require('../controllers/kpiAnalytics.controller');
const { sanitizeString, sanitizeObjectId } = require('../utils/securityUtils');

// Cache TTL: 300 seconds (5 minutes) for analytics endpoints
const ANALYTICS_CACHE_TTL = 300;

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
    cacheResponse(ANALYTICS_CACHE_TTL, (req) => {
        const safeFirmId = sanitizeObjectId(req.firmId) || 'none';
        const safePeriod = parseInt(req.query.period, 10) || 30;
        // Validate period is within reasonable range (1-365 days)
        const validPeriod = (safePeriod > 0 && safePeriod <= 365) ? safePeriod : 30;
        return `analytics:firm:${safeFirmId}:kpi-dashboard:period:${validPeriod}`;
    }),
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
    cacheResponse(ANALYTICS_CACHE_TTL, (req) => {
        const safeFirmId = sanitizeObjectId(req.firmId) || 'none';
        const safeStartDate = sanitizeString(req.query.startDate || '');
        const safeEndDate = sanitizeString(req.query.endDate || '');
        const safePage = parseInt(req.query.page, 10) || 1;
        const safeLimit = parseInt(req.query.limit, 10) || 50;
        // Validate pagination parameters
        const validPage = (safePage > 0) ? safePage : 1;
        const validLimit = (safeLimit > 0 && safeLimit <= 100) ? safeLimit : 50;
        return `analytics:firm:${safeFirmId}:revenue-by-case:start:${safeStartDate}:end:${safeEndDate}:page:${validPage}:limit:${validLimit}`;
    }),
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
    cacheResponse(ANALYTICS_CACHE_TTL, (req) => {
        const safeFirmId = sanitizeObjectId(req.firmId) || 'none';
        const safePeriod = parseInt(req.query.period, 10) || 30;
        const safeGroupBy = sanitizeString(req.query.groupBy || 'week');
        // Validate period is within reasonable range (1-365 days)
        const validPeriod = (safePeriod > 0 && safePeriod <= 365) ? safePeriod : 30;
        // Validate groupBy is one of the allowed values
        const allowedGroupBy = ['day', 'week', 'month'];
        const validGroupBy = allowedGroupBy.includes(safeGroupBy) ? safeGroupBy : 'week';
        return `analytics:firm:${safeFirmId}:case-throughput:period:${validPeriod}:groupBy:${validGroupBy}`;
    }),
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
    cacheResponse(ANALYTICS_CACHE_TTL, (req) => {
        const safeFirmId = sanitizeObjectId(req.firmId) || 'none';
        const safePeriod = parseInt(req.query.period, 10) || 30;
        // Validate period is within reasonable range (1-365 days)
        const validPeriod = (safePeriod > 0 && safePeriod <= 365) ? safePeriod : 30;
        return `analytics:firm:${safeFirmId}:user-activation:period:${validPeriod}`;
    }),
    kpiAnalyticsController.getUserActivation
);

module.exports = router;
