/**
 * Churn Management Routes
 *
 * Provides endpoints for customer churn prediction, tracking, and intervention.
 * Requires admin/manager authentication and role-based access control.
 *
 * Route prefix: /api/churn
 */

const express = require('express');
const router = express.Router();
const churnController = require('../controllers/churn.controller');
const { userMiddleware, firmFilter, requireRole, requireAnyPermission } = require('../middlewares');
const { validateObjectIdParam, validateQueryPagination } = require('../validators/common.validator');
const {
    validateHealthScoreRecalculate,
    validateAtRiskQuery,
    validateRecordChurnEvent,
    validateChurnEventsQuery,
    validateUpdateChurnReason,
    validateExitSurvey,
    validateDashboardQuery,
    validateChurnRateQuery,
    validateReasonsQuery,
    validateCohortQuery,
    validateRevenueAtRiskQuery,
    validateTriggerIntervention,
    validateInterventionStatsQuery,
    validateGenerateReport,
    validateExportQuery,
    validateExecutiveSummaryQuery
} = require('../validators/churn.validator');

// ============================================
// MIDDLEWARE SETUP
// ============================================
// All routes require authentication and admin/manager role
router.use(userMiddleware);
router.use(firmFilter);

// Churn management requires admin or manager role
// Admins have full access, managers can view and perform interventions
const requireChurnAccess = requireAnyPermission(['churn:read', 'churn:write', 'churn:admin']);

// ============================================
// HEALTH SCORE ROUTES
// ============================================

/**
 * @route   GET /api/churn/health-score/:firmId
 * @desc    Get firm's current health score
 * @access  Admin, Manager
 */
router.get(
    '/health-score/:firmId',
    validateObjectIdParam('firmId'),
    requireChurnAccess,
    churnController.getHealthScore
);

/**
 * @route   GET /api/churn/health-score/:firmId/history
 * @desc    Get historical health scores for a firm
 * @access  Admin, Manager
 * @query   days - Number of days of history (7-365, default: 90)
 */
router.get(
    '/health-score/:firmId/history',
    validateObjectIdParam('firmId'),
    requireChurnAccess,
    churnController.getHealthScoreHistory
);

/**
 * @route   POST /api/churn/health-score/:firmId/recalculate
 * @desc    Force recalculation of health score
 * @access  Admin only
 */
router.post(
    '/health-score/:firmId/recalculate',
    validateObjectIdParam('firmId'),
    validateHealthScoreRecalculate,
    requireRole(['admin', 'owner']),
    churnController.recalculateHealthScore
);

/**
 * @route   GET /api/churn/at-risk
 * @desc    Get list of at-risk firms by risk tier
 * @access  Admin, Manager
 * @query   tier - Risk tier filter (critical, high_risk, medium_risk)
 * @query   minScore, maxScore - Score range filters
 * @query   sortBy - Sort field (score, lastActivity, mrr, tenure)
 * @query   page, limit - Pagination
 */
router.get(
    '/at-risk',
    validateAtRiskQuery,
    validateQueryPagination,
    requireChurnAccess,
    churnController.getAtRiskFirms
);

// ============================================
// CHURN EVENT ROUTES
// ============================================

/**
 * @route   POST /api/churn/events
 * @desc    Record a churn or downgrade event
 * @access  Admin, Manager
 * @body    firmId, eventType, reason, reasonCategory, notes, lostMRR
 */
router.post(
    '/events',
    validateRecordChurnEvent,
    requireRole(['admin', 'owner', 'manager']),
    churnController.recordChurnEvent
);

/**
 * @route   GET /api/churn/events
 * @desc    Get churn events with filters
 * @access  Admin, Manager
 * @query   eventType, reasonCategory, startDate, endDate, firmId
 */
router.get(
    '/events',
    validateChurnEventsQuery,
    validateQueryPagination,
    requireChurnAccess,
    churnController.getChurnEvents
);

/**
 * @route   PUT /api/churn/events/:id/reason
 * @desc    Update churn reason after exit survey
 * @access  Admin, Manager
 * @body    reason, reasonCategory, notes
 */
router.put(
    '/events/:id/reason',
    validateObjectIdParam('id'),
    validateUpdateChurnReason,
    requireRole(['admin', 'owner', 'manager']),
    churnController.updateChurnReason
);

/**
 * @route   POST /api/churn/events/:id/exit-survey
 * @desc    Submit exit survey responses
 * @access  Admin, Manager
 * @body    responses - Survey response object
 */
router.post(
    '/events/:id/exit-survey',
    validateObjectIdParam('id'),
    validateExitSurvey,
    requireRole(['admin', 'owner', 'manager']),
    churnController.recordExitSurvey
);

// ============================================
// ANALYTICS ROUTES
// ============================================

/**
 * @route   GET /api/churn/analytics/dashboard
 * @desc    Get main churn dashboard metrics
 * @access  Admin, Manager
 * @query   period - Days to analyze (default: 30)
 */
router.get(
    '/analytics/dashboard',
    validateDashboardQuery,
    requireChurnAccess,
    churnController.getDashboardMetrics
);

/**
 * @route   GET /api/churn/analytics/rate
 * @desc    Get churn rate by period
 * @access  Admin, Manager
 * @query   groupBy - day, week, month, quarter
 * @query   startDate, endDate
 * @query   includeDowngrades - Include downgrades in calculation
 */
router.get(
    '/analytics/rate',
    validateChurnRateQuery,
    requireChurnAccess,
    churnController.getChurnRate
);

/**
 * @route   GET /api/churn/analytics/reasons
 * @desc    Get churn reasons breakdown
 * @access  Admin, Manager
 * @query   startDate, endDate, eventType
 */
router.get(
    '/analytics/reasons',
    validateReasonsQuery,
    requireChurnAccess,
    churnController.getChurnReasons
);

/**
 * @route   GET /api/churn/analytics/cohorts
 * @desc    Get cohort retention analysis
 * @access  Admin, Manager
 * @query   cohortBy - month, quarter, year
 * @query   periods - Number of periods to show
 */
router.get(
    '/analytics/cohorts',
    validateCohortQuery,
    requireChurnAccess,
    churnController.getCohortAnalysis
);

/**
 * @route   GET /api/churn/analytics/revenue-at-risk
 * @desc    Get revenue at risk metrics
 * @access  Admin, Manager
 * @query   includeProjections - Include future projections
 */
router.get(
    '/analytics/revenue-at-risk',
    validateRevenueAtRiskQuery,
    requireChurnAccess,
    churnController.getRevenueAtRisk
);

// ============================================
// INTERVENTION ROUTES
// ============================================

/**
 * @route   GET /api/churn/interventions/:firmId
 * @desc    Get intervention history for a firm
 * @access  Admin, Manager
 */
router.get(
    '/interventions/:firmId',
    validateObjectIdParam('firmId'),
    requireChurnAccess,
    churnController.getInterventionHistory
);

/**
 * @route   POST /api/churn/interventions/:firmId/trigger
 * @desc    Manually trigger an intervention
 * @access  Admin, Manager
 * @body    type, assignedTo, priority, notes
 */
router.post(
    '/interventions/:firmId/trigger',
    validateObjectIdParam('firmId'),
    validateTriggerIntervention,
    requireRole(['admin', 'owner', 'manager']),
    churnController.triggerIntervention
);

/**
 * @route   GET /api/churn/interventions/stats
 * @desc    Get intervention success metrics
 * @access  Admin, Manager
 * @query   startDate, endDate, groupBy
 */
router.get(
    '/interventions/stats',
    validateInterventionStatsQuery,
    requireChurnAccess,
    churnController.getInterventionStats
);

// ============================================
// REPORT ROUTES
// ============================================

/**
 * @route   GET /api/churn/reports/generate
 * @desc    Generate comprehensive churn report
 * @access  Admin only
 * @query   reportType - comprehensive, executive, detailed, trends
 * @query   startDate, endDate
 * @query   format - json, pdf, csv, xlsx
 */
router.get(
    '/reports/generate',
    validateGenerateReport,
    requireRole(['admin', 'owner']),
    churnController.generateReport
);

/**
 * @route   GET /api/churn/reports/at-risk-export
 * @desc    Export at-risk customers list
 * @access  Admin, Manager
 * @query   tier, minScore, format
 */
router.get(
    '/reports/at-risk-export',
    validateExportQuery,
    requireChurnAccess,
    churnController.exportAtRiskList
);

/**
 * @route   GET /api/churn/reports/executive-summary
 * @desc    Get executive summary of churn metrics
 * @access  Admin only
 * @query   period - Days to analyze
 */
router.get(
    '/reports/executive-summary',
    validateExecutiveSummaryQuery,
    requireRole(['admin', 'owner']),
    churnController.getExecutiveSummary
);

module.exports = router;
