const express = require('express');
const router = express.Router();
const offboardingController = require('../controllers/offboarding.controller');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');

// Apply authentication middleware
router.use(verifyToken);
router.use(attachFirmContext);

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must come before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// GET /api/hr/offboarding/stats - Get offboarding statistics
router.get('/stats', offboardingController.getOffboardingStats);

// GET /api/hr/offboarding/pending-clearances - Get pending clearances
router.get('/pending-clearances', offboardingController.getPendingClearances);

// GET /api/hr/offboarding/pending-settlements - Get pending settlements
router.get('/pending-settlements', offboardingController.getPendingSettlements);

// POST /api/hr/offboarding/bulk-delete - Bulk delete offboardings
router.post('/bulk-delete', offboardingController.bulkDelete);

// GET /api/hr/offboarding/by-employee/:employeeId - Get offboarding by employee
router.get('/by-employee/:employeeId', offboardingController.getByEmployee);

// ═══════════════════════════════════════════════════════════════
// CORE CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/hr/offboarding - List all offboardings
router.get('/', offboardingController.getOffboardings);

// POST /api/hr/offboarding - Create new offboarding
router.post('/', offboardingController.createOffboarding);

// GET /api/hr/offboarding/:offboardingId - Get single offboarding
router.get('/:offboardingId', offboardingController.getOffboarding);

// PATCH /api/hr/offboarding/:offboardingId - Update offboarding
router.patch('/:offboardingId', offboardingController.updateOffboarding);

// DELETE /api/hr/offboarding/:offboardingId - Delete offboarding
router.delete('/:offboardingId', offboardingController.deleteOffboarding);

// ═══════════════════════════════════════════════════════════════
// STATUS ROUTES
// ═══════════════════════════════════════════════════════════════

// PATCH /api/hr/offboarding/:offboardingId/status - Update status
router.patch('/:offboardingId/status', offboardingController.updateStatus);

// POST /api/hr/offboarding/:offboardingId/complete - Complete offboarding
router.post('/:offboardingId/complete', offboardingController.completeOffboarding);

// ═══════════════════════════════════════════════════════════════
// EXIT INTERVIEW ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/offboarding/:offboardingId/exit-interview - Complete exit interview
router.post('/:offboardingId/exit-interview', offboardingController.completeExitInterview);

// ═══════════════════════════════════════════════════════════════
// CLEARANCE ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/offboarding/:offboardingId/clearance/items - Add clearance item
router.post('/:offboardingId/clearance/items', offboardingController.addClearanceItem);

// PATCH /api/hr/offboarding/:offboardingId/clearance/items/:itemId - Update clearance item
router.patch('/:offboardingId/clearance/items/:itemId', offboardingController.updateClearanceItem);

// POST /api/hr/offboarding/:offboardingId/clearance/:section/complete - Complete clearance section
router.post('/:offboardingId/clearance/:section/complete', offboardingController.completeClearanceSection);

// ═══════════════════════════════════════════════════════════════
// SETTLEMENT ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/offboarding/:offboardingId/calculate-settlement - Calculate final settlement
router.post('/:offboardingId/calculate-settlement', offboardingController.calculateSettlement);

// POST /api/hr/offboarding/:offboardingId/approve-settlement - Approve settlement
router.post('/:offboardingId/approve-settlement', offboardingController.approveSettlement);

// POST /api/hr/offboarding/:offboardingId/process-payment - Process payment
router.post('/:offboardingId/process-payment', offboardingController.processPayment);

// ═══════════════════════════════════════════════════════════════
// DOCUMENT ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/offboarding/:offboardingId/issue-experience-certificate - Issue experience certificate
router.post('/:offboardingId/issue-experience-certificate', offboardingController.issueExperienceCertificate);

// ═══════════════════════════════════════════════════════════════
// REHIRE ELIGIBILITY ROUTES
// ═══════════════════════════════════════════════════════════════

// PATCH /api/hr/offboarding/:offboardingId/rehire-eligibility - Update rehire eligibility
router.patch('/:offboardingId/rehire-eligibility', offboardingController.updateRehireEligibility);

module.exports = router;
