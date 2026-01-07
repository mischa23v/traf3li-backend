const express = require('express');
const router = express.Router();
const { userMiddleware } = require('../middlewares');
const { cacheResponse } = require('../middlewares/cache.middleware');
const kpiAnalyticsController = require('../controllers/kpiAnalytics.controller');
const { sanitizeString, sanitizeObjectId } = require('../utils/securityUtils');

// Cache TTL: 300 seconds (5 minutes) for analytics endpoints
const ANALYTICS_CACHE_TTL = 300;

router.get('/kpi-dashboard',
    userMiddleware,
    cacheResponse(ANALYTICS_CACHE_TTL, (req) => {
        const safeFirmId = sanitizeObjectId(req.firmId) || 'none';
        const safePeriod = parseInt(req.query.period, 10) || 30;
        // Validate period is within reasonable range (1-365 days)
        const validPeriod = (safePeriod > 0 && safePeriod <= 365) ? safePeriod : 30;
        return `analytics:firm:${safeFirmId}:kpi-dashboard:period:${validPeriod}`;
    }),
    kpiAnalyticsController.getKPIDashboard
);

router.get('/revenue-by-case',
    userMiddleware,
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

router.get('/case-throughput',
    userMiddleware,
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

router.get('/user-activation',
    userMiddleware,
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
