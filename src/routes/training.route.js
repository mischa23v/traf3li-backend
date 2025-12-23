const express = require('express');
const router = express.Router();
const trainingController = require('../controllers/training.controller');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');

/**
 * Training Routes - HR Management
 * Module 13: التدريب والتطوير (Training & Development)
 * Base path: /api/hr/trainings
 */

// Apply authentication middleware
router.use(verifyToken);
router.use(attachFirmContext);
router.use(apiRateLimiter);

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must come before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// GET /api/hr/trainings/stats - Get training statistics
router.get('/stats', trainingController.getTrainingStats);

// GET /api/hr/trainings/pending-approvals - Get pending approvals
router.get('/pending-approvals', trainingController.getPendingApprovals);

// GET /api/hr/trainings/upcoming - Get upcoming trainings
router.get('/upcoming', trainingController.getUpcomingTrainings);

// GET /api/hr/trainings/overdue-compliance - Get overdue compliance trainings
router.get('/overdue-compliance', trainingController.getOverdueCompliance);

// GET /api/hr/trainings/calendar - Get training calendar
router.get('/calendar', trainingController.getTrainingCalendar);

// GET /api/hr/trainings/providers - Get training providers list
router.get('/providers', trainingController.getProviders);

// GET /api/hr/trainings/export - Export trainings
router.get('/export', trainingController.exportTrainings);

// GET /api/hr/trainings/policies - Get training policies
router.get('/policies', trainingController.getPolicies);

// POST /api/hr/trainings/bulk-delete - Bulk delete trainings
router.post('/bulk-delete', trainingController.bulkDeleteTrainings);

// GET /api/hr/trainings/by-employee/:employeeId - Get employee's trainings
router.get('/by-employee/:employeeId', trainingController.getTrainingsByEmployee);

// GET /api/hr/trainings/cle-summary/:employeeId - Get CLE credits summary (attorneys)
router.get('/cle-summary/:employeeId', trainingController.getCLESummary);

// ═══════════════════════════════════════════════════════════════
// CORE CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/hr/trainings - List all trainings
router.get('/', trainingController.getTrainings);

// POST /api/hr/trainings - Create new training request
router.post('/', trainingController.createTraining);

// GET /api/hr/trainings/:trainingId - Get single training
router.get('/:trainingId', trainingController.getTraining);

// PATCH /api/hr/trainings/:trainingId - Update training
router.patch('/:trainingId', trainingController.updateTraining);

// DELETE /api/hr/trainings/:trainingId - Delete training
router.delete('/:trainingId', trainingController.deleteTraining);

// ═══════════════════════════════════════════════════════════════
// WORKFLOW ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/trainings/:trainingId/submit - Submit training request
router.post('/:trainingId/submit', trainingController.submitTraining);

// POST /api/hr/trainings/:trainingId/approve - Approve training
router.post('/:trainingId/approve', trainingController.approveTraining);

// POST /api/hr/trainings/:trainingId/reject - Reject training
router.post('/:trainingId/reject', trainingController.rejectTraining);

// POST /api/hr/trainings/:trainingId/enroll - Enroll in training
router.post('/:trainingId/enroll', trainingController.enrollTraining);

// POST /api/hr/trainings/:trainingId/start - Start training
router.post('/:trainingId/start', trainingController.startTraining);

// POST /api/hr/trainings/:trainingId/complete - Complete training
router.post('/:trainingId/complete', trainingController.completeTraining);

// POST /api/hr/trainings/:trainingId/cancel - Cancel training
router.post('/:trainingId/cancel', trainingController.cancelTraining);

// ═══════════════════════════════════════════════════════════════
// ATTENDANCE & PROGRESS ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/trainings/:trainingId/attendance - Record session attendance
router.post('/:trainingId/attendance', trainingController.recordAttendance);

// POST /api/hr/trainings/:trainingId/progress - Update progress (online courses)
router.post('/:trainingId/progress', trainingController.updateProgress);

// ═══════════════════════════════════════════════════════════════
// ASSESSMENT ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/trainings/:trainingId/assessments - Submit assessment
router.post('/:trainingId/assessments', trainingController.submitAssessment);

// ═══════════════════════════════════════════════════════════════
// CERTIFICATE & EVALUATION ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/trainings/:trainingId/issue-certificate - Issue certificate
router.post('/:trainingId/issue-certificate', trainingController.issueCertificate);

// POST /api/hr/trainings/:trainingId/evaluation - Submit evaluation
router.post('/:trainingId/evaluation', trainingController.submitEvaluation);

// ═══════════════════════════════════════════════════════════════
// PAYMENT ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/trainings/:trainingId/payment - Record payment
router.post('/:trainingId/payment', trainingController.recordPayment);

module.exports = router;
