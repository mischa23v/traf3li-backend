const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const { auditAction } = require('../middlewares/auditLog.middleware');
const { paymentRateLimiter } = require('../middlewares/rateLimiter.middleware');
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
app.get('/new', userMiddleware, firmFilter, getNewPaymentDefaults);

// Statistics and reporting
app.get('/stats', userMiddleware, firmFilter, getPaymentStats);
app.get('/summary', userMiddleware, firmFilter, getPaymentsSummary);

// Unreconciled payments
app.get('/unreconciled', userMiddleware, firmFilter, getUnreconciledPayments);

// Pending checks
app.get('/pending-checks', userMiddleware, firmFilter, getPendingChecks);

// ═══════════════════════════════════════════════════════════════
// ADVANCE PAYMENTS (ERPNext Parity)
// ═══════════════════════════════════════════════════════════════

// Get available advance payments for a client (for invoice allocation)
// GET /api/payments/advances/available/:clientId
app.get('/advances/available/:clientId', userMiddleware, firmFilter, async (req, res) => {
    try {
        const Payment = require('../models/payment.model');
        const advances = await Payment.getAvailableAdvances(req.params.clientId);
        res.json({ success: true, data: advances });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Allocate advance to invoice
// POST /api/payments/advances/:paymentId/allocate
app.post('/advances/:paymentId/allocate', userMiddleware, firmFilter, async (req, res) => {
    try {
        const { invoiceId, amount } = req.body;
        if (!invoiceId || !amount) {
            return res.status(400).json({ success: false, error: 'invoiceId and amount are required' });
        }
        const Payment = require('../models/payment.model');
        const result = await Payment.allocateAdvanceToInvoice(req.params.paymentId, invoiceId, amount);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get deduction accounts configuration
// GET /api/payments/deduction-accounts
app.get('/deduction-accounts', userMiddleware, firmFilter, async (req, res) => {
    try {
        const { getAllDeductionAccounts, DEDUCTION_CATEGORIES } = require('../config/deductionAccounts.config');
        const { paymentType } = req.query;

        let accounts = getAllDeductionAccounts();
        if (paymentType) {
            const { getDeductionsByPaymentType } = require('../config/deductionAccounts.config');
            accounts = getDeductionsByPaymentType(paymentType);
        }

        res.json({
            success: true,
            data: {
                accounts,
                categories: DEDUCTION_CATEGORIES
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bulk operations
app.delete('/bulk', userMiddleware, firmFilter, validateBulkDelete, bulkDeletePayments);

// ═══════════════════════════════════════════════════════════════
// CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// Create payment
app.post('/', userMiddleware, firmFilter, validateCreatePayment, auditAction('create_payment', 'payment', { severity: 'medium' }), createPayment);

// List payments with filters
app.get('/', userMiddleware, firmFilter, getPayments);

// Get single payment
app.get('/:id', userMiddleware, firmFilter, getPayment);

// Update payment
app.put('/:id', userMiddleware, firmFilter, validateUpdatePayment, auditAction('update_payment', 'payment', { captureChanges: true }), updatePayment);

// Delete payment
app.delete('/:id', userMiddleware, firmFilter, auditAction('delete_payment', 'payment', { severity: 'high' }), deletePayment);

// ═══════════════════════════════════════════════════════════════
// PAYMENT STATUS ACTIONS
// ═══════════════════════════════════════════════════════════════

// Complete payment (mark as completed and apply to invoices)
app.post('/:id/complete', userMiddleware, firmFilter, completePayment);

// Mark payment as failed
app.post('/:id/fail', userMiddleware, firmFilter, failPayment);

// Create refund for a payment
app.post('/:id/refund', userMiddleware, firmFilter, validateRefund, auditAction('refund_payment', 'payment', { severity: 'high' }), createRefund);

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
