const express = require('express');
const { userMiddleware } = require('../middlewares');
const { auditAction } = require('../middlewares/auditLog.middleware');
const { paymentRateLimiter } = require('../middlewares/rateLimiter.middleware');
const { requiredIdempotency } = require('../middlewares/idempotency');
const {
    validateCreatePayment,
    validateUpdatePayment,
    validateApplyPayment: validateApplyToInvoices,
    validateCreateRefund: validateRefund,
    validateUpdateCheckStatus: validateCheckStatus,
    validateReconcilePayment: validateReconcile,
    validateBulkDelete,
    validateSendReceipt,
    validateRecordInvoicePayment
} = require('../validators/payment.validator');
const {
    createPayment,
    getPayments,
    getPayment,
    getNewPaymentDefaults,
    updatePayment,
    deletePayment,
    completePayment,
    failPayment,
    createRefund,
    reconcilePayment,
    applyPaymentToInvoices,
    unapplyPaymentFromInvoice,
    updateCheckStatus,
    sendReceipt,
    getPaymentStats,
    getPaymentsSummary,
    getUnreconciledPayments,
    getPendingChecks,
    recordInvoicePayment,
    bulkDeletePayments
} = require('../controllers/payment.controller');

const app = express.Router();

// Apply payment-specific rate limiting to financial operations
app.use(paymentRateLimiter);

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must be before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// Get defaults for new payment form
app.get('/new', userMiddleware, getNewPaymentDefaults);

// Statistics and reporting
app.get('/stats', userMiddleware, getPaymentStats);
app.get('/summary', userMiddleware, getPaymentsSummary);

// Unreconciled payments
app.get('/unreconciled', userMiddleware, getUnreconciledPayments);

// Pending checks
app.get('/pending-checks', userMiddleware, getPendingChecks);

// Bulk operations
app.delete('/bulk', userMiddleware, requiredIdempotency, validateBulkDelete, bulkDeletePayments);

// ═══════════════════════════════════════════════════════════════
// CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// Create payment
app.post('/', userMiddleware, requiredIdempotency, validateCreatePayment, auditAction('create_payment', 'payment', { severity: 'medium' }), createPayment);

// List payments with filters
app.get('/', userMiddleware, getPayments);

// Get single payment
app.get('/:id', userMiddleware, getPayment);

// Update payment
app.put('/:id', userMiddleware, requiredIdempotency, validateUpdatePayment, auditAction('update_payment', 'payment', { captureChanges: true }), updatePayment);

// Delete payment
app.delete('/:id', userMiddleware, requiredIdempotency, auditAction('delete_payment', 'payment', { severity: 'high' }), deletePayment);

// ═══════════════════════════════════════════════════════════════
// PAYMENT STATUS ACTIONS
// ═══════════════════════════════════════════════════════════════

// Complete payment (mark as completed and apply to invoices)
app.post('/:id/complete', userMiddleware, requiredIdempotency, completePayment);

// Mark payment as failed
app.post('/:id/fail', userMiddleware, requiredIdempotency, failPayment);

// Create refund for a payment
app.post('/:id/refund', userMiddleware, requiredIdempotency, validateRefund, auditAction('refund_payment', 'payment', { severity: 'high' }), createRefund);

// ═══════════════════════════════════════════════════════════════
// RECONCILIATION
// ═══════════════════════════════════════════════════════════════

// Reconcile payment with bank statement
app.post('/:id/reconcile', userMiddleware, requiredIdempotency, validateReconcile, reconcilePayment);

// ═══════════════════════════════════════════════════════════════
// INVOICE APPLICATION
// ═══════════════════════════════════════════════════════════════

// Apply payment to invoices
app.put('/:id/apply', userMiddleware, requiredIdempotency, validateApplyToInvoices, applyPaymentToInvoices);

// Unapply payment from a specific invoice
app.delete('/:id/unapply/:invoiceId', userMiddleware, requiredIdempotency, unapplyPaymentFromInvoice);

// ═══════════════════════════════════════════════════════════════
// CHECK MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// Update check status (deposited, cleared, bounced)
app.put('/:id/check-status', userMiddleware, requiredIdempotency, validateCheckStatus, updateCheckStatus);

// ═══════════════════════════════════════════════════════════════
// RECEIPTS/COMMUNICATION
// ═══════════════════════════════════════════════════════════════

// Send/resend receipt email
app.post('/:id/send-receipt', userMiddleware, validateSendReceipt, sendReceipt);

// Legacy alias
app.post('/:id/receipt', userMiddleware, validateSendReceipt, sendReceipt);

module.exports = app;
