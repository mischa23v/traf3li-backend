const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const { paymentRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    validateCreatePayment,
    validateUpdatePayment,
    validateApplyToInvoices,
    validateRefund,
    validateCheckStatus,
    validateReconcile,
    validateSendReceipt,
    validateBulkDelete,
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
app.get('/new', userMiddleware, firmFilter, getNewPaymentDefaults);

// Statistics and reporting
app.get('/stats', userMiddleware, firmFilter, getPaymentStats);
app.get('/summary', userMiddleware, firmFilter, getPaymentsSummary);

// Unreconciled payments
app.get('/unreconciled', userMiddleware, firmFilter, getUnreconciledPayments);

// Pending checks
app.get('/pending-checks', userMiddleware, firmFilter, getPendingChecks);

// Bulk operations
app.delete('/bulk', userMiddleware, firmFilter, validateBulkDelete, bulkDeletePayments);

// ═══════════════════════════════════════════════════════════════
// CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// Create payment
app.post('/', userMiddleware, firmFilter, validateCreatePayment, createPayment);

// List payments with filters
app.get('/', userMiddleware, firmFilter, getPayments);

// Get single payment
app.get('/:id', userMiddleware, firmFilter, getPayment);

// Update payment
app.put('/:id', userMiddleware, firmFilter, validateUpdatePayment, updatePayment);

// Delete payment
app.delete('/:id', userMiddleware, firmFilter, deletePayment);

// ═══════════════════════════════════════════════════════════════
// PAYMENT STATUS ACTIONS
// ═══════════════════════════════════════════════════════════════

// Complete payment (mark as completed and apply to invoices)
app.post('/:id/complete', userMiddleware, firmFilter, completePayment);

// Mark payment as failed
app.post('/:id/fail', userMiddleware, firmFilter, failPayment);

// Create refund for a payment
app.post('/:id/refund', userMiddleware, firmFilter, validateRefund, createRefund);

// ═══════════════════════════════════════════════════════════════
// RECONCILIATION
// ═══════════════════════════════════════════════════════════════

// Reconcile payment with bank statement
app.post('/:id/reconcile', userMiddleware, firmFilter, validateReconcile, reconcilePayment);

// ═══════════════════════════════════════════════════════════════
// INVOICE APPLICATION
// ═══════════════════════════════════════════════════════════════

// Apply payment to invoices
app.put('/:id/apply', userMiddleware, firmFilter, validateApplyToInvoices, applyPaymentToInvoices);

// Unapply payment from a specific invoice
app.delete('/:id/unapply/:invoiceId', userMiddleware, firmFilter, unapplyPaymentFromInvoice);

// ═══════════════════════════════════════════════════════════════
// CHECK MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// Update check status (deposited, cleared, bounced)
app.put('/:id/check-status', userMiddleware, firmFilter, validateCheckStatus, updateCheckStatus);

// ═══════════════════════════════════════════════════════════════
// RECEIPTS/COMMUNICATION
// ═══════════════════════════════════════════════════════════════

// Send/resend receipt email
app.post('/:id/send-receipt', userMiddleware, firmFilter, validateSendReceipt, sendReceipt);

// Legacy alias
app.post('/:id/receipt', userMiddleware, firmFilter, validateSendReceipt, sendReceipt);

module.exports = app;
