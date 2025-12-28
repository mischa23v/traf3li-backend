/**
 * CRM Transaction Routes
 *
 * Routes for transaction logging, stale leads, and revenue forecasting.
 * Protected by global authenticatedApi middleware.
 */

const express = require('express');
const {
    getTransactions,
    getEntityTimeline,
    getSummary,
    getUserActivity,
    getDailyReport,
    exportTransactions,
    getStaleLeads,
    getStaleSummary,
    getStalenessbyStage,
    getLeadsNeedingAttention,
    getRevenueForecast,
    getForecastByPeriod,
    getPipelineVelocity,
    getForecastTrends,
    getForecastByCategory
} = require('../controllers/crmTransaction.controller');

const router = express.Router();

// Transaction routes
router.get('/', getTransactions);
router.get('/summary', getSummary);
router.get('/daily-report', getDailyReport);
router.get('/export', exportTransactions);
router.get('/entity/:entityType/:entityId', getEntityTimeline);
router.get('/user-activity/:userId', getUserActivity);

// Stale leads routes
router.get('/stale-leads', getStaleLeads);
router.get('/stale-leads/summary', getStaleSummary);
router.get('/stale-leads/by-stage', getStalenessbyStage);
router.get('/leads-needing-attention', getLeadsNeedingAttention);

// Revenue forecast routes
router.get('/revenue-forecast', getRevenueForecast);
router.get('/revenue-forecast/by-period', getForecastByPeriod);
router.get('/pipeline-velocity', getPipelineVelocity);
router.get('/forecast-trends', getForecastTrends);
router.get('/forecast-by-category', getForecastByCategory);

module.exports = router;
