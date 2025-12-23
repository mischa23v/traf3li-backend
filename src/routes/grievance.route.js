const express = require('express');
const router = express.Router();
const grievanceController = require('../controllers/grievance.controller');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

router.use(apiRateLimiter);
router.use(verifyToken);
router.use(attachFirmContext);

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must come before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// Statistics & Reports
router.get('/stats', grievanceController.getGrievanceStats);
router.get('/overdue', grievanceController.getOverdueGrievances);
router.get('/export', grievanceController.exportGrievances);

// ═══════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

// List all grievances
router.get('/', grievanceController.getGrievances);

// Create new grievance
router.post('/', grievanceController.createGrievance);

// Bulk delete
router.post('/bulk-delete', grievanceController.bulkDeleteGrievances);

// Get grievances by employee (before :id to avoid conflict)
router.get('/employee/:employeeId', grievanceController.getEmployeeGrievances);

// ═══════════════════════════════════════════════════════════════
// SINGLE GRIEVANCE OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Get single grievance
router.get('/:id', grievanceController.getGrievance);

// Update grievance
router.patch('/:id', grievanceController.updateGrievance);

// Delete grievance
router.delete('/:id', grievanceController.deleteGrievance);

// ═══════════════════════════════════════════════════════════════
// WORKFLOW ACTIONS
// ═══════════════════════════════════════════════════════════════

// Acknowledge grievance receipt
router.post('/:id/acknowledge', grievanceController.acknowledgeGrievance);

// Start investigation
router.post('/:id/start-investigation', grievanceController.startInvestigation);

// Complete investigation
router.post('/:id/complete-investigation', grievanceController.completeInvestigation);

// Resolve grievance
router.post('/:id/resolve', grievanceController.resolveGrievance);

// Escalate grievance
router.post('/:id/escalate', grievanceController.escalateGrievance);

// Withdraw grievance
router.post('/:id/withdraw', grievanceController.withdrawGrievance);

// Close grievance
router.post('/:id/close', grievanceController.closeGrievance);

// ═══════════════════════════════════════════════════════════════
// TIMELINE & EVIDENCE
// ═══════════════════════════════════════════════════════════════

// Add timeline event
router.post('/:id/timeline', grievanceController.addTimelineEvent);

// Add witness
router.post('/:id/witnesses', grievanceController.addWitness);

// Add evidence
router.post('/:id/evidence', grievanceController.addEvidence);

// Add interview
router.post('/:id/interviews', grievanceController.addInterview);

// ═══════════════════════════════════════════════════════════════
// APPEAL
// ═══════════════════════════════════════════════════════════════

// File appeal
router.post('/:id/appeal', grievanceController.fileAppeal);

// Decide appeal
router.post('/:id/appeal/decide', grievanceController.decideAppeal);

// ═══════════════════════════════════════════════════════════════
// LABOR OFFICE ESCALATION
// ═══════════════════════════════════════════════════════════════

// Escalate to labor office
router.post('/:id/labor-office', grievanceController.escalateToLaborOffice);

module.exports = router;
