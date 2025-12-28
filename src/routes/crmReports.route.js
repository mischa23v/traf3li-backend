/**
 * CRM Reports Routes
 *
 * Comprehensive CRM analytics and reporting endpoints.
 * All routes are protected by global authenticatedApi middleware.
 */

const express = require('express');
const router = express.Router();
const crmReportsController = require('../controllers/crmReports.controller');
const { sensitiveRateLimiter } = require('../middlewares/rateLimiter.middleware');

// ═══════════════════════════════════════════════════════════════
// QUICK STATS & DASHBOARD
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/crm-reports/quick-stats
 * @desc    Get quick stats for CRM dashboard
 * @access  Private
 */
router.get('/quick-stats', crmReportsController.getQuickStats);

/**
 * @route   GET /api/crm-reports/recent-activity
 * @desc    Get recent activity for dashboard
 * @access  Private
 */
router.get('/recent-activity', crmReportsController.getRecentActivity);

// ═══════════════════════════════════════════════════════════════
// SALES FUNNEL REPORT
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/crm-reports/funnel/overview
 * @desc    Get sales funnel overview
 * @access  Private
 */
router.get('/funnel/overview', crmReportsController.getFunnelOverview);

/**
 * @route   GET /api/crm-reports/funnel/velocity
 * @desc    Get funnel velocity (time in each stage)
 * @access  Private
 */
router.get('/funnel/velocity', crmReportsController.getFunnelVelocity);

/**
 * @route   GET /api/crm-reports/funnel/bottlenecks
 * @desc    Get funnel bottlenecks
 * @access  Private
 */
router.get('/funnel/bottlenecks', crmReportsController.getFunnelBottlenecks);

// ═══════════════════════════════════════════════════════════════
// DEAL AGING REPORT
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/crm-reports/aging/overview
 * @desc    Get deal aging overview
 * @access  Private
 */
router.get('/aging/overview', crmReportsController.getAgingOverview);

/**
 * @route   GET /api/crm-reports/aging/by-stage
 * @desc    Get aging by stage
 * @access  Private
 */
router.get('/aging/by-stage', crmReportsController.getAgingByStage);

// ═══════════════════════════════════════════════════════════════
// LEADS BY SOURCE REPORT
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/crm-reports/leads-source/overview
 * @desc    Get leads by source overview
 * @access  Private
 */
router.get('/leads-source/overview', crmReportsController.getLeadsSourceOverview);

/**
 * @route   GET /api/crm-reports/leads-source/trend
 * @desc    Get leads by source trend
 * @access  Private
 */
router.get('/leads-source/trend', crmReportsController.getLeadsSourceTrend);

// ═══════════════════════════════════════════════════════════════
// WIN/LOSS ANALYSIS REPORT
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/crm-reports/win-loss/overview
 * @desc    Get win/loss overview
 * @access  Private
 */
router.get('/win-loss/overview', crmReportsController.getWinLossOverview);

/**
 * @route   GET /api/crm-reports/win-loss/reasons
 * @desc    Get lost reasons analysis
 * @access  Private
 */
router.get('/win-loss/reasons', crmReportsController.getLostReasons);

/**
 * @route   GET /api/crm-reports/win-loss/trend
 * @desc    Get win/loss trend
 * @access  Private
 */
router.get('/win-loss/trend', crmReportsController.getWinLossTrend);

// ═══════════════════════════════════════════════════════════════
// ACTIVITY ANALYTICS REPORT
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/crm-reports/activity/overview
 * @desc    Get activity overview
 * @access  Private
 */
router.get('/activity/overview', crmReportsController.getActivityOverview);

/**
 * @route   GET /api/crm-reports/activity/by-day-of-week
 * @desc    Get activity by day of week
 * @access  Private
 */
router.get('/activity/by-day-of-week', crmReportsController.getActivityByDayOfWeek);

/**
 * @route   GET /api/crm-reports/activity/by-hour
 * @desc    Get activity by hour
 * @access  Private
 */
router.get('/activity/by-hour', crmReportsController.getActivityByHour);

/**
 * @route   GET /api/crm-reports/activity/leaderboard
 * @desc    Get activity leaderboard
 * @access  Private
 */
router.get('/activity/leaderboard', crmReportsController.getActivityLeaderboard);

// ═══════════════════════════════════════════════════════════════
// REVENUE FORECAST REPORT
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/crm-reports/forecast/overview
 * @desc    Get revenue forecast overview
 * @access  Private
 */
router.get('/forecast/overview', crmReportsController.getForecastOverview);

/**
 * @route   GET /api/crm-reports/forecast/by-month
 * @desc    Get forecast by month
 * @access  Private
 */
router.get('/forecast/by-month', crmReportsController.getForecastByMonth);

/**
 * @route   GET /api/crm-reports/forecast/by-rep
 * @desc    Get forecast by rep
 * @access  Private
 */
router.get('/forecast/by-rep', crmReportsController.getForecastByRep);

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

/**
 * @route   POST /api/crm-reports/export
 * @desc    Export report to CSV
 * @access  Private
 */
router.post('/export', sensitiveRateLimiter, crmReportsController.exportReport);

// ═══════════════════════════════════════════════════════════════
// LEGACY REPORTS (Existing endpoints)
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/crm-reports/campaign-efficiency
 * @desc    Get campaign efficiency report
 * @access  Private
 */
router.get('/campaign-efficiency', sensitiveRateLimiter, crmReportsController.getCampaignEfficiency);

/**
 * @route   GET /api/crm-reports/lead-owner-efficiency
 * @desc    Get lead owner efficiency report
 * @access  Private
 */
router.get('/lead-owner-efficiency', sensitiveRateLimiter, crmReportsController.getLeadOwnerEfficiency);

/**
 * @route   GET /api/crm-reports/first-response-time
 * @desc    Get first response time report
 * @access  Private
 */
router.get('/first-response-time', sensitiveRateLimiter, crmReportsController.getFirstResponseTime);

/**
 * @route   GET /api/crm-reports/lost-opportunity
 * @desc    Get lost opportunity analysis report
 * @access  Private
 */
router.get('/lost-opportunity', sensitiveRateLimiter, crmReportsController.getLostOpportunity);

/**
 * @route   GET /api/crm-reports/sales-pipeline
 * @desc    Get sales pipeline report
 * @access  Private
 */
router.get('/sales-pipeline', sensitiveRateLimiter, crmReportsController.getSalesPipeline);

/**
 * @route   GET /api/crm-reports/prospects-engaged
 * @desc    Get prospects engaged but not converted report
 * @access  Private
 */
router.get('/prospects-engaged', sensitiveRateLimiter, crmReportsController.getProspectsEngaged);

/**
 * @route   GET /api/crm-reports/lead-conversion-time
 * @desc    Get lead conversion time report
 * @access  Private
 */
router.get('/lead-conversion-time', sensitiveRateLimiter, crmReportsController.getLeadConversionTime);

module.exports = router;
