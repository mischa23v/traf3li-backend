/**
 * CRM Reports Alias Routes
 *
 * Routes at /api/crm/reports to match frontend expected paths
 * Maps to existing crmReportsController methods
 *
 * This file provides aliases for the existing /api/crm-reports endpoints
 * to match the frontend's expected path structure
 */

const express = require('express');
const router = express.Router();
const crmReportsController = require('../controllers/crmReports.controller');
const { sensitiveRateLimiter } = require('../middlewares/rateLimiter.middleware');

// ═══════════════════════════════════════════════════════════════
// PIPELINE REPORTS (Frontend: /crm/reports/pipeline/...)
// Maps to existing funnel endpoints
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/crm/reports/pipeline/overview
 * @desc    Get pipeline overview (alias for funnel/overview)
 */
router.get('/pipeline/overview', crmReportsController.getFunnelOverview);

/**
 * @route   GET /api/crm/reports/pipeline/velocity
 * @desc    Get pipeline velocity (alias for funnel/velocity)
 */
router.get('/pipeline/velocity', crmReportsController.getFunnelVelocity);

/**
 * @route   GET /api/crm/reports/pipeline/stage-duration
 * @desc    Get stage duration (alias for funnel/velocity)
 */
router.get('/pipeline/stage-duration', crmReportsController.getFunnelVelocity);

/**
 * @route   GET /api/crm/reports/pipeline/deal-aging
 * @desc    Get deal aging (alias for aging/overview)
 */
router.get('/pipeline/deal-aging', crmReportsController.getAgingOverview);

/**
 * @route   GET /api/crm/reports/pipeline/movement
 * @desc    Get pipeline movement (alias for funnel/bottlenecks)
 */
router.get('/pipeline/movement', crmReportsController.getFunnelBottlenecks);

// ═══════════════════════════════════════════════════════════════
// LEADS REPORTS (Frontend: /crm/reports/leads/...)
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/crm/reports/leads/by-source
 * @desc    Get leads by source (alias for leads-source/overview)
 */
router.get('/leads/by-source', crmReportsController.getLeadsSourceOverview);

/**
 * @route   GET /api/crm/reports/leads/conversion-funnel
 * @desc    Get lead conversion funnel (alias for funnel/overview)
 */
router.get('/leads/conversion-funnel', crmReportsController.getFunnelOverview);

/**
 * @route   GET /api/crm/reports/leads/response-time
 * @desc    Get lead response time (alias for first-response-time)
 */
router.get('/leads/response-time', crmReportsController.getFirstResponseTime);

/**
 * @route   GET /api/crm/reports/leads/velocity
 * @desc    Get leads velocity (alias for funnel/velocity)
 */
router.get('/leads/velocity', crmReportsController.getFunnelVelocity);

/**
 * @route   GET /api/crm/reports/leads/distribution
 * @desc    Get leads distribution (alias for lead-owner-efficiency)
 */
router.get('/leads/distribution', crmReportsController.getLeadOwnerEfficiency);

// ═══════════════════════════════════════════════════════════════
// ACTIVITY REPORTS (Frontend: /crm/reports/activity/...)
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/crm/reports/activity/summary
 * @desc    Get activity summary (alias for activity/overview)
 */
router.get('/activity/summary', crmReportsController.getActivityOverview);

/**
 * @route   GET /api/crm/reports/activity/calls
 * @desc    Get calls activity report
 */
router.get('/activity/calls', crmReportsController.getActivityOverview);

/**
 * @route   GET /api/crm/reports/activity/emails
 * @desc    Get emails activity report
 */
router.get('/activity/emails', crmReportsController.getActivityOverview);

/**
 * @route   GET /api/crm/reports/activity/meetings
 * @desc    Get meetings activity report
 */
router.get('/activity/meetings', crmReportsController.getActivityOverview);

/**
 * @route   GET /api/crm/reports/activity/tasks
 * @desc    Get tasks activity report
 */
router.get('/activity/tasks', crmReportsController.getActivityOverview);

// ═══════════════════════════════════════════════════════════════
// REVENUE REPORTS (Frontend: /crm/reports/revenue/...)
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/crm/reports/revenue/forecast
 * @desc    Get revenue forecast (alias for forecast/overview)
 */
router.get('/revenue/forecast', crmReportsController.getForecastOverview);

/**
 * @route   GET /api/crm/reports/revenue/by-month
 * @desc    Get revenue by month (alias for forecast/by-month)
 */
router.get('/revenue/by-month', crmReportsController.getForecastByMonth);

/**
 * @route   GET /api/crm/reports/revenue/by-rep
 * @desc    Get revenue by rep (alias for forecast/by-rep)
 */
router.get('/revenue/by-rep', crmReportsController.getForecastByRep);

module.exports = router;
