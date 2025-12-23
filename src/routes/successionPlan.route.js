const express = require('express');
const router = express.Router();
const successionPlanController = require('../controllers/successionPlan.controller');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

router.use(verifyToken);
router.use(attachFirmContext);

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must come before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// Statistics
router.get('/stats', successionPlanController.getSuccessionPlanStats);

// Plans needing review
router.get('/review-due', successionPlanController.getPlansNeedingReview);

// High risk plans
router.get('/high-risk', successionPlanController.getHighRiskPlans);

// Critical positions without successors
router.get('/critical-without-successors', successionPlanController.getCriticalWithoutSuccessors);

// Export
router.get('/export', successionPlanController.exportSuccessionPlans);

// ═══════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

// List all succession plans
router.get('/', successionPlanController.getSuccessionPlans);

// Create new succession plan
router.post('/', successionPlanController.createSuccessionPlan);

// Bulk delete
router.post('/bulk-delete', successionPlanController.bulkDeleteSuccessionPlans);

// ═══════════════════════════════════════════════════════════════
// LOOKUP ROUTES
// ═══════════════════════════════════════════════════════════════

// Get by position
router.get('/by-position/:positionId', successionPlanController.getByPosition);

// Get by incumbent
router.get('/by-incumbent/:incumbentId', successionPlanController.getByIncumbent);

// ═══════════════════════════════════════════════════════════════
// SINGLE PLAN OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Get single succession plan
router.get('/:id', successionPlanController.getSuccessionPlan);

// Update succession plan
router.patch('/:id', successionPlanController.updateSuccessionPlan);

// Delete succession plan
router.delete('/:id', successionPlanController.deleteSuccessionPlan);

// ═══════════════════════════════════════════════════════════════
// WORKFLOW OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Submit for approval
router.post('/:id/submit-for-approval', successionPlanController.submitForApproval);

// Approve plan
router.post('/:id/approve', successionPlanController.approvePlan);

// Reject plan
router.post('/:id/reject', successionPlanController.rejectPlan);

// Activate plan
router.post('/:id/activate', successionPlanController.activatePlan);

// Archive plan
router.post('/:id/archive', successionPlanController.archivePlan);

// ═══════════════════════════════════════════════════════════════
// SUCCESSOR OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Add successor
router.post('/:id/successors', successionPlanController.addSuccessor);

// Update successor
router.patch('/:id/successors/:successorId', successionPlanController.updateSuccessor);

// Remove successor
router.delete('/:id/successors/:successorId', successionPlanController.removeSuccessor);

// Update successor readiness
router.patch('/:id/successors/:successorId/readiness', successionPlanController.updateSuccessorReadiness);

// Update successor development plan
router.patch('/:id/successors/:successorId/development', successionPlanController.updateSuccessorDevelopmentPlan);

// ═══════════════════════════════════════════════════════════════
// REVIEW & ACTION OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Add review
router.post('/:id/reviews', successionPlanController.addReview);

// Add action
router.post('/:id/actions', successionPlanController.addAction);

// Update action
router.patch('/:id/actions/:actionId', successionPlanController.updateAction);

// ═══════════════════════════════════════════════════════════════
// DOCUMENTS
// ═══════════════════════════════════════════════════════════════

// Add document
router.post('/:id/documents', successionPlanController.addDocument);

module.exports = router;
