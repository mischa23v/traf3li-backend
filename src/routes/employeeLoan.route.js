const express = require('express');
const router = express.Router();
const employeeLoanController = require('../controllers/employeeLoan.controller');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');
const {
    validateCreateLoan,
    validateUpdateLoan,
    validateReviewLoan,
    validateDisburseLoan,
    validateRecordPayment,
    validateRestructureLoan,
    validateEmployeeIdParam
} = require('../validators/hr.validator');

// Apply authentication middleware
router.use(verifyToken);
router.use(attachFirmContext);

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must come before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// GET /api/hr/employee-loans/stats - Get loan statistics
router.get('/stats', employeeLoanController.getLoanStats);

// GET /api/hr/employee-loans/pending-approvals - Get pending approvals
router.get('/pending-approvals', employeeLoanController.getPendingApprovals);

// GET /api/hr/employee-loans/overdue-installments - Get overdue installments
router.get('/overdue-installments', employeeLoanController.getOverdueInstallments);

// POST /api/hr/employee-loans/check-eligibility - Check employee loan eligibility
router.post('/check-eligibility', employeeLoanController.checkEligibility);

// POST /api/hr/employee-loans/bulk-delete - Bulk delete loans
router.post('/bulk-delete', employeeLoanController.bulkDelete);

// GET /api/hr/employee-loans/by-employee/:employeeId - Get loans by employee
router.get('/by-employee/:employeeId', validateEmployeeIdParam, employeeLoanController.getByEmployee);

// ═══════════════════════════════════════════════════════════════
// CORE CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/hr/employee-loans - List all loans
router.get('/', employeeLoanController.getLoans);

// POST /api/hr/employee-loans - Create new loan application
router.post('/', validateCreateLoan, employeeLoanController.createLoan);

// GET /api/hr/employee-loans/:loanId - Get single loan
router.get('/:loanId', employeeLoanController.getLoan);

// PATCH /api/hr/employee-loans/:loanId - Update loan
router.patch('/:loanId', validateUpdateLoan, employeeLoanController.updateLoan);

// DELETE /api/hr/employee-loans/:loanId - Delete loan
router.delete('/:loanId', employeeLoanController.deleteLoan);

// ═══════════════════════════════════════════════════════════════
// APPLICATION WORKFLOW ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/employee-loans/:loanId/submit - Submit loan application
router.post('/:loanId/submit', employeeLoanController.submitLoan);

// POST /api/hr/employee-loans/:loanId/approve - Approve loan application
router.post('/:loanId/approve', validateReviewLoan, employeeLoanController.approveLoan);

// POST /api/hr/employee-loans/:loanId/reject - Reject loan application
router.post('/:loanId/reject', validateReviewLoan, employeeLoanController.rejectLoan);

// ═══════════════════════════════════════════════════════════════
// DISBURSEMENT ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/employee-loans/:loanId/disburse - Disburse approved loan
router.post('/:loanId/disburse', validateDisburseLoan, employeeLoanController.disburseLoan);

// ═══════════════════════════════════════════════════════════════
// PAYMENT ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/employee-loans/:loanId/payments - Record payment
router.post('/:loanId/payments', validateRecordPayment, employeeLoanController.recordPayment);

// POST /api/hr/employee-loans/:loanId/payroll-deduction - Process payroll deduction
router.post('/:loanId/payroll-deduction', validateRecordPayment, employeeLoanController.processPayrollDeduction);

// ═══════════════════════════════════════════════════════════════
// EARLY SETTLEMENT ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/hr/employee-loans/:loanId/early-settlement-calculation - Calculate early settlement
router.get('/:loanId/early-settlement-calculation', employeeLoanController.calculateEarlySettlement);

// POST /api/hr/employee-loans/:loanId/early-settlement - Process early settlement
router.post('/:loanId/early-settlement', validateRecordPayment, employeeLoanController.processEarlySettlement);

// ═══════════════════════════════════════════════════════════════
// DEFAULT & RESTRUCTURING ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/employee-loans/:loanId/default - Mark loan as defaulted
router.post('/:loanId/default', employeeLoanController.markAsDefaulted);

// POST /api/hr/employee-loans/:loanId/restructure - Restructure loan
router.post('/:loanId/restructure', validateRestructureLoan, employeeLoanController.restructureLoan);

// ═══════════════════════════════════════════════════════════════
// CLEARANCE ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/employee-loans/:loanId/issue-clearance - Issue clearance letter
router.post('/:loanId/issue-clearance', employeeLoanController.issueClearanceLetter);

// ═══════════════════════════════════════════════════════════════
// DOCUMENT ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/employee-loans/:loanId/documents - Upload document
router.post('/:loanId/documents', employeeLoanController.uploadDocument);

// ═══════════════════════════════════════════════════════════════
// COMMUNICATION ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/employee-loans/:loanId/communications - Add communication
router.post('/:loanId/communications', employeeLoanController.addCommunication);

module.exports = router;
