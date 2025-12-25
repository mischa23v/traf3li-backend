const express = require('express');
const router = express.Router();
const HRAnalyticsController = require('../controllers/hrAnalytics.controller');
const { userMiddleware, firmFilter } = require('../middlewares');
const { authorize } = require('../middlewares/authorize.middleware');
const { sensitiveRateLimiter, authRateLimiter } = require('../middlewares/rateLimiter.middleware');

/**
 * HR Analytics & Predictions Routes
 * All routes require authentication and HR/Admin authorization
 */

// Apply authentication middleware to all routes (checks both cookies AND Authorization header)
router.use(userMiddleware);

// Apply firm filter middleware to set req.firmId (same as finance/invoice routes)
router.use(firmFilter);

// Apply HR/Admin authorization to all routes
// Note: User.role enum is ['client', 'lawyer', 'admin']
// Firm-level permissions (partner, owner) are handled by firmFilter middleware
router.use(authorize('admin', 'lawyer'));

// ═══════════════════════════════════════════════════════════════
// ANALYTICS ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/hr-analytics/dashboard
 * @desc    Get comprehensive dashboard with all key metrics
 * @query   startDate, endDate, department, status
 * @access  Private (HR, Admin)
 */
router.get('/dashboard', authRateLimiter, HRAnalyticsController.getDashboard);

/**
 * @route   GET /api/hr-analytics/demographics
 * @desc    Get workforce demographics (age, gender, department, tenure, nationality, saudization)
 * @query   department, status
 * @access  Private (HR, Admin)
 */
router.get('/demographics', authRateLimiter, HRAnalyticsController.getDemographics);

/**
 * @route   GET /api/hr-analytics/turnover
 * @desc    Get turnover analysis (monthly/quarterly/yearly rates, by department, by tenure)
 * @query   startDate, endDate, department
 * @access  Private (HR, Admin)
 */
router.get('/turnover', authRateLimiter, HRAnalyticsController.getTurnover);

/**
 * @route   GET /api/hr-analytics/absenteeism
 * @desc    Get absenteeism tracking (rates, patterns, cost analysis)
 * @query   startDate, endDate, department
 * @access  Private (HR, Admin)
 */
router.get('/absenteeism', authRateLimiter, HRAnalyticsController.getAbsenteeism);

/**
 * @route   GET /api/hr-analytics/attendance
 * @desc    Get attendance analytics (punctuality, working hours, overtime)
 * @query   startDate, endDate, department
 * @access  Private (HR, Admin)
 */
router.get('/attendance', authRateLimiter, HRAnalyticsController.getAttendance);

/**
 * @route   GET /api/hr-analytics/performance
 * @desc    Get performance analytics (rating distribution, scores, goals)
 * @query   startDate, endDate, department
 * @access  Private (HR, Admin)
 */
router.get('/performance', authRateLimiter, HRAnalyticsController.getPerformance);

/**
 * @route   GET /api/hr-analytics/recruitment
 * @desc    Get recruitment analytics (time to hire, cost per hire, source effectiveness)
 * @query   startDate, endDate, department
 * @access  Private (HR, Admin)
 */
router.get('/recruitment', authRateLimiter, HRAnalyticsController.getRecruitment);

/**
 * @route   GET /api/hr-analytics/compensation
 * @desc    Get compensation analytics (salary distribution, pay equity, compa-ratio)
 * @query   department
 * @access  Private (HR, Admin)
 */
router.get('/compensation', authRateLimiter, HRAnalyticsController.getCompensation);

/**
 * @route   GET /api/hr-analytics/training
 * @desc    Get training analytics (participation, completion rates, effectiveness)
 * @query   startDate, endDate, department
 * @access  Private (HR, Admin)
 */
router.get('/training', authRateLimiter, HRAnalyticsController.getTraining);

/**
 * @route   GET /api/hr-analytics/leave
 * @desc    Get leave analytics (utilization, balance trends, upcoming forecast)
 * @query   startDate, endDate, department
 * @access  Private (HR, Admin)
 */
router.get('/leave', authRateLimiter, HRAnalyticsController.getLeave);

/**
 * @route   GET /api/hr-analytics/saudization
 * @desc    Get Saudization compliance metrics (critical for Saudi Arabia)
 * @access  Private (HR, Admin)
 */
router.get('/saudization', authRateLimiter, HRAnalyticsController.getSaudization);

/**
 * @route   POST /api/hr-analytics/snapshot
 * @desc    Take a snapshot of current HR metrics for historical tracking
 * @body    snapshotType (daily, weekly, monthly, quarterly, yearly)
 * @access  Private (HR, Admin)
 */
router.post('/snapshot', sensitiveRateLimiter, HRAnalyticsController.takeSnapshot);

/**
 * @route   GET /api/hr-analytics/trends
 * @desc    Get historical trends from snapshots
 * @query   snapshotType, limit
 * @access  Private (HR, Admin)
 */
router.get('/trends', authRateLimiter, HRAnalyticsController.getTrends);

/**
 * @route   GET /api/hr-analytics/export
 * @desc    Export analytics report (JSON, Excel, PDF)
 * @query   startDate, endDate, department, format
 * @access  Private (HR, Admin)
 */
router.get('/export', authRateLimiter, HRAnalyticsController.exportReport);

// ═══════════════════════════════════════════════════════════════
// PREDICTIONS ROUTES (AI-POWERED)
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/hr-predictions/attrition
 * @desc    Get attrition risk scores for all employees (0-100 scale)
 * @query   department
 * @access  Private (HR, Admin)
 * @returns High/medium/low risk employees with risk factors and interventions
 */
router.get('/predictions/attrition', authRateLimiter, HRAnalyticsController.getAttritionRisk);

/**
 * @route   GET /api/hr-predictions/attrition/:employeeId
 * @desc    Get detailed attrition risk analysis for specific employee
 * @param   employeeId
 * @access  Private (HR, Admin, Manager)
 * @returns Risk score, factors, interventions, timeline, similar departures
 */
router.get('/predictions/attrition/:employeeId', authRateLimiter, HRAnalyticsController.getEmployeeAttritionRisk);

/**
 * @route   GET /api/hr-predictions/workforce
 * @desc    Get workforce forecast (headcount projections, attrition, hiring needs)
 * @query   months (default: 12)
 * @access  Private (HR, Admin)
 * @returns Monthly forecast with headcount, attrition, and hiring predictions
 */
router.get('/predictions/workforce', authRateLimiter, HRAnalyticsController.getWorkforceForecast);

/**
 * @route   GET /api/hr-predictions/high-potential
 * @desc    Identify high-potential employees and promotion readiness
 * @query   limit (default: 20)
 * @access  Private (HR, Admin)
 * @returns High-potential employees with development recommendations
 */
router.get('/predictions/high-potential', authRateLimiter, HRAnalyticsController.getHighPotential);

/**
 * @route   GET /api/hr-predictions/flight-risk
 * @desc    Get employees at high flight risk (low engagement + high attrition risk)
 * @access  Private (HR, Admin)
 * @returns Flight risk employees with engagement scores
 */
router.get('/predictions/flight-risk', authRateLimiter, HRAnalyticsController.getFlightRisk);

/**
 * @route   GET /api/hr-predictions/absence
 * @desc    Predict likely absence days and identify at-risk employees
 * @access  Private (HR, Admin)
 * @returns Absence predictions with patterns and recommendations
 */
router.get('/predictions/absence', authRateLimiter, HRAnalyticsController.getAbsencePredictions);

/**
 * @route   GET /api/hr-predictions/engagement
 * @desc    Predict engagement trends and identify disengaged employees
 * @access  Private (HR, Admin)
 * @returns Engagement scores and distribution
 */
router.get('/predictions/engagement', authRateLimiter, HRAnalyticsController.getEngagementPredictions);

// ═══════════════════════════════════════════════════════════════
// ROUTE SUMMARY
// ═══════════════════════════════════════════════════════════════

/**
 * ANALYTICS ROUTES (11):
 * - GET /dashboard                    - Comprehensive dashboard
 * - GET /demographics                 - Workforce demographics
 * - GET /turnover                     - Turnover analysis
 * - GET /absenteeism                  - Absenteeism tracking
 * - GET /attendance                   - Attendance analytics
 * - GET /performance                  - Performance analytics
 * - GET /recruitment                  - Recruitment metrics
 * - GET /compensation                 - Compensation analytics
 * - GET /training                     - Training analytics
 * - GET /leave                        - Leave analytics
 * - GET /saudization                  - Saudization compliance
 *
 * UTILITY ROUTES (3):
 * - POST /snapshot                    - Take snapshot
 * - GET /trends                       - Historical trends
 * - GET /export                       - Export reports
 *
 * PREDICTIONS ROUTES (7):
 * - GET /predictions/attrition        - All employees attrition risk
 * - GET /predictions/attrition/:id    - Individual attrition risk
 * - GET /predictions/workforce        - Workforce forecast
 * - GET /predictions/high-potential   - High potential employees
 * - GET /predictions/flight-risk      - Flight risk employees
 * - GET /predictions/absence          - Absence predictions
 * - GET /predictions/engagement       - Engagement predictions
 *
 * TOTAL: 21 endpoints
 */

module.exports = router;
