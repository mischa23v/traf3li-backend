const express = require('express');
const router = express.Router();
const performanceReviewController = require('../controllers/performanceReview.controller');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');

/**
 * Performance Review Routes
 * MODULE 6: إدارة الأداء
 * Base path: /api/hr/performance-reviews
 */

// Apply authentication middleware to all routes
router.use(verifyToken);
router.use(attachFirmContext);
router.use(apiRateLimiter);

// ═══════════════════════════════════════════════════════════════
// STATISTICS & OVERDUE (must be before :id routes)
// ═══════════════════════════════════════════════════════════════

// GET /api/hr/performance-reviews/stats - Get performance statistics
router.get('/stats', performanceReviewController.getPerformanceStats);

// GET /api/hr/performance-reviews/overdue - Get overdue reviews
router.get('/overdue', performanceReviewController.getOverdueReviews);

// ═══════════════════════════════════════════════════════════════
// TEMPLATES (must be before :id routes)
// ═══════════════════════════════════════════════════════════════

// GET /api/hr/performance-reviews/templates - Get review templates
router.get('/templates', performanceReviewController.getTemplates);

// POST /api/hr/performance-reviews/templates - Create review template
router.post('/templates', performanceReviewController.createTemplate);

// PATCH /api/hr/performance-reviews/templates/:id - Update review template
router.patch('/templates/:id', performanceReviewController.updateTemplate);

// ═══════════════════════════════════════════════════════════════
// CALIBRATION SESSIONS (must be before :id routes)
// ═══════════════════════════════════════════════════════════════

// GET /api/hr/performance-reviews/calibration-sessions - Get calibration sessions
router.get('/calibration-sessions', performanceReviewController.getCalibrationSessions);

// POST /api/hr/performance-reviews/calibration-sessions - Create calibration session
router.post('/calibration-sessions', performanceReviewController.createCalibrationSession);

// POST /api/hr/performance-reviews/calibration-sessions/:id/complete - Complete calibration session
router.post('/calibration-sessions/:id/complete', performanceReviewController.completeCalibrationSession);

// ═══════════════════════════════════════════════════════════════
// BULK OPERATIONS (must be before :id routes)
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/performance-reviews/bulk-create - Bulk create reviews
router.post('/bulk-create', performanceReviewController.bulkCreateReviews);

// POST /api/hr/performance-reviews/bulk-delete - Bulk delete reviews
router.post('/bulk-delete', performanceReviewController.bulkDeletePerformanceReviews);

// ═══════════════════════════════════════════════════════════════
// EMPLOYEE HISTORY (must be before :id routes)
// ═══════════════════════════════════════════════════════════════

// GET /api/hr/performance-reviews/employee/:employeeId/history - Get employee performance history
router.get('/employee/:employeeId/history', performanceReviewController.getEmployeeHistory);

// ═══════════════════════════════════════════════════════════════
// TEAM REPORTS (must be before :id routes)
// ═══════════════════════════════════════════════════════════════

// GET /api/hr/performance-reviews/team/:managerId/summary - Get team performance summary
router.get('/team/:managerId/summary', performanceReviewController.getTeamSummary);

// ═══════════════════════════════════════════════════════════════
// CORE CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/hr/performance-reviews - Get all performance reviews
router.get('/', performanceReviewController.getPerformanceReviews);

// POST /api/hr/performance-reviews - Create new performance review
router.post('/', performanceReviewController.createPerformanceReview);

// GET /api/hr/performance-reviews/:id - Get single performance review
router.get('/:id', performanceReviewController.getPerformanceReviewById);

// PATCH /api/hr/performance-reviews/:id - Update performance review
router.patch('/:id', performanceReviewController.updatePerformanceReview);

// DELETE /api/hr/performance-reviews/:id - Delete performance review
router.delete('/:id', performanceReviewController.deletePerformanceReview);

// ═══════════════════════════════════════════════════════════════
// SELF-ASSESSMENT ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/performance-reviews/:id/self-assessment - Submit self-assessment
router.post('/:id/self-assessment', performanceReviewController.submitSelfAssessment);

// ═══════════════════════════════════════════════════════════════
// MANAGER ASSESSMENT ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/performance-reviews/:id/manager-assessment - Submit manager assessment
router.post('/:id/manager-assessment', performanceReviewController.submitManagerAssessment);

// ═══════════════════════════════════════════════════════════════
// 360 FEEDBACK ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/performance-reviews/:id/360-feedback/request - Request 360 feedback
router.post('/:id/360-feedback/request', performanceReviewController.request360Feedback);

// POST /api/hr/performance-reviews/:id/360-feedback/:providerId - Submit 360 feedback
router.post('/:id/360-feedback/:providerId', performanceReviewController.submit360Feedback);

// ═══════════════════════════════════════════════════════════════
// DEVELOPMENT PLAN ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/performance-reviews/:id/development-plan - Create development plan
router.post('/:id/development-plan', performanceReviewController.createDevelopmentPlan);

// PATCH /api/hr/performance-reviews/:id/development-plan/:itemId - Update development plan item
router.patch('/:id/development-plan/:itemId', performanceReviewController.updateDevelopmentPlanItem);

// ═══════════════════════════════════════════════════════════════
// CALIBRATION ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/performance-reviews/:id/calibration - Submit for calibration
router.post('/:id/calibration', performanceReviewController.submitForCalibration);

// POST /api/hr/performance-reviews/:id/calibration/apply - Apply calibration result
router.post('/:id/calibration/apply', performanceReviewController.applyCalibration);

// ═══════════════════════════════════════════════════════════════
// COMPLETION & ACKNOWLEDGEMENT ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/performance-reviews/:id/complete - Complete review
router.post('/:id/complete', performanceReviewController.completeReview);

// POST /api/hr/performance-reviews/:id/acknowledge - Employee acknowledge review
router.post('/:id/acknowledge', performanceReviewController.acknowledgeReview);

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/performance-reviews/:id/reminder - Send reminder
router.post('/:id/reminder', performanceReviewController.sendReminder);

module.exports = router;
