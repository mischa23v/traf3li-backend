const express = require('express');
const router = express.Router();
const onboardingController = require('../controllers/onboarding.controller');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');
const upload = require('../configs/multer');

// Apply authentication middleware
router.use(verifyToken);
router.use(attachFirmContext);

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must come before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// GET /api/hr/onboarding/stats - Get onboarding statistics
router.get('/stats', onboardingController.getOnboardingStats);

// GET /api/hr/onboarding/upcoming-reviews - Get upcoming probation reviews
router.get('/upcoming-reviews', onboardingController.getUpcomingReviews);

// POST /api/hr/onboarding/bulk-delete - Bulk delete onboardings
router.post('/bulk-delete', onboardingController.bulkDelete);

// GET /api/hr/onboarding/by-employee/:employeeId - Get onboarding by employee
router.get('/by-employee/:employeeId', onboardingController.getByEmployee);

// ═══════════════════════════════════════════════════════════════
// CORE CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/hr/onboarding - List all onboardings
router.get('/', onboardingController.getOnboardings);

// POST /api/hr/onboarding - Create new onboarding
router.post('/', onboardingController.createOnboarding);

// GET /api/hr/onboarding/:onboardingId - Get single onboarding
router.get('/:onboardingId', onboardingController.getOnboarding);

// PATCH /api/hr/onboarding/:onboardingId - Update onboarding
router.patch('/:onboardingId', onboardingController.updateOnboarding);

// DELETE /api/hr/onboarding/:onboardingId - Delete onboarding
router.delete('/:onboardingId', onboardingController.deleteOnboarding);

// ═══════════════════════════════════════════════════════════════
// STATUS & COMPLETION ROUTES
// ═══════════════════════════════════════════════════════════════

// PATCH /api/hr/onboarding/:onboardingId/status - Update status
router.patch('/:onboardingId/status', onboardingController.updateStatus);

// POST /api/hr/onboarding/:onboardingId/complete - Complete onboarding
router.post('/:onboardingId/complete', onboardingController.completeOnboarding);

// POST /api/hr/onboarding/:onboardingId/complete-first-day - Complete first day
router.post('/:onboardingId/complete-first-day', onboardingController.completeFirstDay);

// POST /api/hr/onboarding/:onboardingId/complete-first-week - Complete first week
router.post('/:onboardingId/complete-first-week', onboardingController.completeFirstWeek);

// POST /api/hr/onboarding/:onboardingId/complete-first-month - Complete first month
router.post('/:onboardingId/complete-first-month', onboardingController.completeFirstMonth);

// ═══════════════════════════════════════════════════════════════
// TASK ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/onboarding/:onboardingId/tasks/:taskId/complete - Complete task
router.post('/:onboardingId/tasks/:taskId/complete', onboardingController.completeTask);

// ═══════════════════════════════════════════════════════════════
// PROBATION ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/onboarding/:onboardingId/probation-reviews - Add probation review
router.post('/:onboardingId/probation-reviews', onboardingController.addProbationReview);

// POST /api/hr/onboarding/:onboardingId/complete-probation - Complete probation
router.post('/:onboardingId/complete-probation', onboardingController.completeProbation);

// ═══════════════════════════════════════════════════════════════
// DOCUMENT ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/onboarding/:onboardingId/documents - Upload document
router.post('/:onboardingId/documents', upload.single('file'), upload.malwareScan, onboardingController.uploadDocument);

// POST /api/hr/onboarding/:onboardingId/documents/:type/verify - Verify document
router.post('/:onboardingId/documents/:type/verify', onboardingController.verifyDocument);

// ═══════════════════════════════════════════════════════════════
// CHECKLIST ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/onboarding/:onboardingId/checklist/categories - Add checklist category
router.post('/:onboardingId/checklist/categories', onboardingController.addChecklistCategory);

// POST /api/hr/onboarding/:onboardingId/checklist/categories/:categoryId/tasks - Add checklist task
router.post('/:onboardingId/checklist/categories/:categoryId/tasks', onboardingController.addChecklistTask);

// ═══════════════════════════════════════════════════════════════
// FEEDBACK ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/onboarding/:onboardingId/feedback - Add employee feedback
router.post('/:onboardingId/feedback', onboardingController.addEmployeeFeedback);

module.exports = router;
