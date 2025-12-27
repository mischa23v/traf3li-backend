const express = require('express');
const router = express.Router();
const expenseClaimController = require('../controllers/expenseClaim.controller');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');
const upload = require('../configs/multer');

/**
 * Expense Claim Routes - HR Management
 * Module 12: مطالبات النفقات (Expense Claims)
 * Base path: /api/hr/expense-claims
 */

// Apply authentication middleware
router.use(verifyToken);
router.use(attachFirmContext);

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must come before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// GET /api/hr/expense-claims/stats - Get claim statistics
router.get('/stats', expenseClaimController.getClaimStats);

// GET /api/hr/expense-claims/pending-approvals - Get pending approvals
router.get('/pending-approvals', expenseClaimController.getPendingApprovals);

// GET /api/hr/expense-claims/pending-payments - Get pending payments
router.get('/pending-payments', expenseClaimController.getPendingPayments);

// GET /api/hr/expense-claims/mileage-rates - Get mileage rates
router.get('/mileage-rates', expenseClaimController.getMileageRates);

// GET /api/hr/expense-claims/policies - Get expense policies
router.get('/policies', expenseClaimController.getPolicies);

// GET /api/hr/expense-claims/export - Export claims
router.get('/export', expenseClaimController.exportClaims);

// POST /api/hr/expense-claims/bulk-delete - Bulk delete claims
router.post('/bulk-delete', expenseClaimController.bulkDelete);

// GET /api/hr/expense-claims/by-employee/:employeeId - Get employee's claims
router.get('/by-employee/:employeeId', expenseClaimController.getClaimsByEmployee);

// GET /api/hr/expense-claims/corporate-card/:employeeId - Get card transactions
router.get('/corporate-card/:employeeId', expenseClaimController.getCorporateCardTransactions);

// ═══════════════════════════════════════════════════════════════
// CORE CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/hr/expense-claims - List all claims
router.get('/', expenseClaimController.getClaims);

// POST /api/hr/expense-claims - Create new claim
router.post('/', expenseClaimController.createClaim);

// GET /api/hr/expense-claims/:id - Get single claim
router.get('/:id', expenseClaimController.getClaim);

// PATCH /api/hr/expense-claims/:id - Update claim
router.patch('/:id', expenseClaimController.updateClaim);

// DELETE /api/hr/expense-claims/:id - Delete claim
router.delete('/:id', expenseClaimController.deleteClaim);

// ═══════════════════════════════════════════════════════════════
// WORKFLOW ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/expense-claims/:id/submit - Submit claim for approval
router.post('/:id/submit', expenseClaimController.submitClaim);

// POST /api/hr/expense-claims/:id/approve - Approve claim
router.post('/:id/approve', expenseClaimController.approveClaim);

// POST /api/hr/expense-claims/:id/reject - Reject claim
router.post('/:id/reject', expenseClaimController.rejectClaim);

// POST /api/hr/expense-claims/:id/request-changes - Request changes
router.post('/:id/request-changes', expenseClaimController.requestChanges);

// ═══════════════════════════════════════════════════════════════
// PAYMENT ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/expense-claims/:id/process-payment - Process payment
router.post('/:id/process-payment', expenseClaimController.processPayment);

// POST /api/hr/expense-claims/:id/confirm-payment - Confirm payment
router.post('/:id/confirm-payment', expenseClaimController.confirmPayment);

// ═══════════════════════════════════════════════════════════════
// LINE ITEM ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/expense-claims/:id/line-items - Add line item
router.post('/:id/line-items', expenseClaimController.addLineItem);

// PATCH /api/hr/expense-claims/:id/line-items/:lineItemId - Update line item
router.patch('/:id/line-items/:lineItemId', expenseClaimController.updateLineItem);

// DELETE /api/hr/expense-claims/:id/line-items/:lineItemId - Delete line item
router.delete('/:id/line-items/:lineItemId', expenseClaimController.deleteLineItem);

// ═══════════════════════════════════════════════════════════════
// RECEIPT ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/expense-claims/:id/receipts - Upload receipt
router.post('/:id/receipts', upload.single('file'), upload.malwareScan, expenseClaimController.uploadReceipt);

// DELETE /api/hr/expense-claims/:id/receipts/:receiptId - Delete receipt
router.delete('/:id/receipts/:receiptId', expenseClaimController.deleteReceipt);

// POST /api/hr/expense-claims/:id/receipts/:receiptId/verify - Verify receipt
router.post('/:id/receipts/:receiptId/verify', expenseClaimController.verifyReceipt);

// ═══════════════════════════════════════════════════════════════
// CORPORATE CARD ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/expense-claims/:id/reconcile-card - Reconcile card transaction
router.post('/:id/reconcile-card', expenseClaimController.reconcileCardTransaction);

// ═══════════════════════════════════════════════════════════════
// COMPLIANCE ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/expense-claims/:id/check-compliance - Check policy compliance
router.post('/:id/check-compliance', expenseClaimController.checkCompliance);

// POST /api/hr/expense-claims/:id/approve-exception - Approve policy exception
router.post('/:id/approve-exception', expenseClaimController.approveException);

// ═══════════════════════════════════════════════════════════════
// BILLING ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/expense-claims/:id/mark-billable - Mark expenses as billable
router.post('/:id/mark-billable', expenseClaimController.markBillable);

// POST /api/hr/expense-claims/:id/create-invoice - Create invoice for billable
router.post('/:id/create-invoice', expenseClaimController.createInvoice);

// ═══════════════════════════════════════════════════════════════
// UTILITY ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/expense-claims/:id/duplicate - Duplicate claim
router.post('/:id/duplicate', expenseClaimController.duplicateClaim);

module.exports = router;
