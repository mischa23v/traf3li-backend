const express = require('express');
const router = express.Router();
const employeeAdvanceController = require('../controllers/employeeAdvance.controller');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');
const {
    validateCreateAdvance,
    validateUpdateAdvance,
    validateReviewAdvance,
    validateDisburseAdvance,
    validateRecordRecovery,
    validateIdParam,
    validateEmployeeIdParam
} = require('../validators/hr.validator');

// Apply authentication middleware
router.use(verifyToken);
router.use(attachFirmContext);

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must come before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// GET /api/hr/advances/stats - Get advance statistics
router.get('/stats', employeeAdvanceController.getAdvanceStats);

// GET /api/hr/advances/pending-approvals - Get pending approvals
router.get('/pending-approvals', employeeAdvanceController.getPendingApprovals);

// GET /api/hr/advances/overdue-recoveries - Get overdue recoveries
router.get('/overdue-recoveries', employeeAdvanceController.getOverdueRecoveries);

// GET /api/hr/advances/emergency - Get emergency advances
router.get('/emergency', employeeAdvanceController.getEmergencyAdvances);

// POST /api/hr/advances/check-eligibility - Check employee advance eligibility
router.post('/check-eligibility', employeeAdvanceController.checkEligibility);

// POST /api/hr/advances/bulk-delete - Bulk delete advances
router.post('/bulk-delete', employeeAdvanceController.bulkDelete);

// GET /api/hr/advances/by-employee/:employeeId - Get advances by employee
router.get('/by-employee/:employeeId', validateEmployeeIdParam, employeeAdvanceController.getByEmployee);

// ═══════════════════════════════════════════════════════════════
// CORE CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/hr/advances - List all advances
router.get('/', employeeAdvanceController.getAdvances);

// POST /api/hr/advances - Create new advance request
router.post('/', validateCreateAdvance, employeeAdvanceController.createAdvance);

// GET /api/hr/advances/:advanceId - Get single advance
router.get('/:advanceId', employeeAdvanceController.getAdvance);

// PATCH /api/hr/advances/:advanceId - Update advance
router.patch('/:advanceId', validateUpdateAdvance, employeeAdvanceController.updateAdvance);

// DELETE /api/hr/advances/:advanceId - Delete advance
router.delete('/:advanceId', employeeAdvanceController.deleteAdvance);

// ═══════════════════════════════════════════════════════════════
// APPLICATION WORKFLOW ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/advances/:advanceId/approve - Approve advance request
router.post('/:advanceId/approve', validateReviewAdvance, employeeAdvanceController.approveAdvance);

// POST /api/hr/advances/:advanceId/reject - Reject advance request
router.post('/:advanceId/reject', validateReviewAdvance, employeeAdvanceController.rejectAdvance);

// POST /api/hr/advances/:advanceId/cancel - Cancel advance request
router.post('/:advanceId/cancel', employeeAdvanceController.cancelAdvance);

// ═══════════════════════════════════════════════════════════════
// DISBURSEMENT ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/advances/:advanceId/disburse - Disburse approved advance
router.post('/:advanceId/disburse', validateDisburseAdvance, employeeAdvanceController.disburseAdvance);

// ═══════════════════════════════════════════════════════════════
// RECOVERY ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/advances/:advanceId/recover - Record recovery (payment)
router.post('/:advanceId/recover', validateRecordRecovery, employeeAdvanceController.recordRecovery);

// POST /api/hr/advances/:advanceId/payroll-deduction - Process payroll deduction
router.post('/:advanceId/payroll-deduction', validateRecordRecovery, employeeAdvanceController.processPayrollDeduction);

// POST /api/hr/advances/:advanceId/early-recovery - Process early recovery (lump sum)
router.post('/:advanceId/early-recovery', validateRecordRecovery, employeeAdvanceController.processEarlyRecovery);

// ═══════════════════════════════════════════════════════════════
// WRITE-OFF ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/advances/:advanceId/write-off - Write off advance
router.post('/:advanceId/write-off', employeeAdvanceController.writeOffAdvance);

// ═══════════════════════════════════════════════════════════════
// CLEARANCE ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/advances/:advanceId/issue-clearance - Issue clearance letter
router.post('/:advanceId/issue-clearance', employeeAdvanceController.issueClearanceLetter);

// ═══════════════════════════════════════════════════════════════
// DOCUMENT ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/advances/:advanceId/documents - Upload document
router.post('/:advanceId/documents', employeeAdvanceController.uploadDocument);

// ═══════════════════════════════════════════════════════════════
// COMMUNICATION ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/advances/:advanceId/communications - Add communication
router.post('/:advanceId/communications', employeeAdvanceController.addCommunication);

module.exports = router;
