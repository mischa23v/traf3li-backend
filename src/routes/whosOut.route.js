/**
 * Who's Out Calendar Routes
 *
 * Enterprise-grade absence calendar feature
 * Provides visibility into team availability
 */

const express = require('express');
const router = express.Router();
const whosOutController = require('../controllers/whosOut.controller');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');

// Apply authentication middleware
router.use(verifyToken);
router.use(attachFirmContext);

// ═══════════════════════════════════════════════════════════════
// WHO'S OUT CALENDAR ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/hr/whos-out/today
 * Get employees who are out today
 */
router.get('/today', whosOutController.getTodayAbsences);

/**
 * GET /api/hr/whos-out/week
 * Get weekly absence calendar
 * Query params: weekStart, department
 */
router.get('/week', whosOutController.getWeeklyCalendar);

/**
 * GET /api/hr/whos-out/month
 * Get monthly absence calendar
 * Query params: year, month, department
 */
router.get('/month', whosOutController.getMonthlyCalendar);

/**
 * GET /api/hr/whos-out/upcoming
 * Get upcoming absences
 * Query params: days (default: 30), department
 */
router.get('/upcoming', whosOutController.getUpcomingAbsences);

/**
 * GET /api/hr/whos-out/departments
 * Get all departments summary for today
 */
router.get('/departments', whosOutController.getDepartmentsSummary);

/**
 * GET /api/hr/whos-out/coverage/:department
 * Get coverage analysis for a department
 * Query params: startDate, endDate
 */
router.get('/coverage/:department', whosOutController.getDepartmentCoverage);

module.exports = router;
