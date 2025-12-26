/**
 * Invoice Routes
 *
 * Comprehensive invoice management API routes including CRUD operations,
 * payment processing, ZATCA e-invoicing, approval workflows, and reporting.
 *
 * Base route: /api/invoices
 */

const express = require('express');
const { userMiddleware } = require('../middlewares');
const { auditAction } = require('../middlewares/auditLog.middleware');
const { authorize } = require('../middlewares/authorize.middleware');
const {
    validateVoid,
    validateApproval,
    validateRejection,
    validateReminder,
    validateRetainerApplication
} = require('../middlewares/invoiceValidator.middleware');
const {
    validateCreateInvoice,
    validateUpdateInvoice,
    validateRecordPayment,
    validateSendInvoice,
    validateAddLineItem
} = require('../validators/invoice.validator');
const { validateRecordInvoicePayment } = require('../validators/payment.validator');
const {
    // CRUD
    createInvoice,
    getInvoices,
    getInvoice,
    updateInvoice,
    deleteInvoice,
    bulkDeleteInvoices,

    // Actions
    sendInvoice,
    recordPayment,
    voidInvoice,
    duplicateInvoice,
    sendReminder,
    convertToCreditNote,

    // Approval
    submitForApproval,
    approveInvoice,
    rejectInvoice,

    // ZATCA
    submitToZATCA,
    getZATCAStatus,

    // Stats
    getStats,
    getOverdueInvoices,

    // Payment
    createPaymentIntent,
    confirmPayment,
    applyRetainer,

    // Export
    generateXML,
    generatePDF,

    // Unified Data
    getBillableItems,
    getOpenInvoices
} = require('../controllers/invoice.controller');
const { recordInvoicePayment } = require('../controllers/payment.controller');

const router = express.Router();

// ============ STATISTICS & REPORTS ============
// These need to be before /:id routes to avoid conflicts

// Get invoice statistics
router.get('/stats',
    userMiddleware,
    getStats
);

// Get overdue invoices
router.get('/overdue',
    userMiddleware,
    getOverdueInvoices
);

// ============ UNIFIED DATA (No Duplicate Entry) ============

// Get billable items (unbilled time entries, expenses, tasks)
router.get('/billable-items',
    userMiddleware,
    getBillableItems
);

// Get open invoices for a client (for payment allocation)
router.get('/open/:clientId',
    userMiddleware,
    getOpenInvoices
);

// Confirm payment (Stripe webhook - no validation needed for webhook)
router.patch('/confirm-payment',
    userMiddleware,
    confirmPayment
);

// Bulk delete invoices
router.post('/bulk-delete',
    userMiddleware,
    auditAction('bulk_delete_invoices', 'invoice', { severity: 'high' }),
    bulkDeleteInvoices
);

// ============ CRUD OPERATIONS ============

// Create invoice
router.post('/',
    userMiddleware,
    validateCreateInvoice,
    auditAction('create_invoice', 'invoice', { severity: 'medium' }),
    createInvoice
);

// Get all invoices (with pagination and filters)
router.get('/',
    userMiddleware,
    getInvoices
);

// Get single invoice
router.get('/:id',
    userMiddleware,
    getInvoice
);

// Also support /:_id for backwards compatibility
router.get('/:_id',
    userMiddleware,
    getInvoice
);

// Update invoice
router.patch('/:id',
    userMiddleware,
    validateUpdateInvoice,
    auditAction('update_invoice', 'invoice', { captureChanges: true }),
    updateInvoice
);

router.patch('/:_id',
    userMiddleware,
    validateUpdateInvoice,
    auditAction('update_invoice', 'invoice', { captureChanges: true }),
    updateInvoice
);

// Also support PUT for update
router.put('/:id',
    userMiddleware,
    validateUpdateInvoice,
    auditAction('update_invoice', 'invoice', { captureChanges: true }),
    updateInvoice
);

// Delete invoice
router.delete('/:id',
    userMiddleware,
    auditAction('delete_invoice', 'invoice', { severity: 'high' }),
    deleteInvoice
);

router.delete('/:_id',
    userMiddleware,
    auditAction('delete_invoice', 'invoice', { severity: 'high' }),
    deleteInvoice
);

// ============ INVOICE ACTIONS ============

// Send invoice to client
router.post('/:id/send',
    userMiddleware,
    validateSendInvoice,
    sendInvoice
);

router.post('/:_id/send',
    userMiddleware,
    validateSendInvoice,
    sendInvoice
);

// Record payment for invoice
router.post('/:id/record-payment',
    userMiddleware,
    validateRecordPayment,
    recordPayment
);

// Alternative payment recording endpoint (backwards compatibility)
router.post('/:id/payments',
    userMiddleware,
    validateRecordInvoicePayment,
    recordInvoicePayment
);

router.post('/:_id/payments',
    userMiddleware,
    validateRecordInvoicePayment,
    recordInvoicePayment
);

// Void invoice
router.post('/:id/void',
    userMiddleware,
    validateVoid,
    voidInvoice
);

// Duplicate invoice
router.post('/:id/duplicate',
    userMiddleware,
    duplicateInvoice
);

// Send reminder
router.post('/:id/send-reminder',
    userMiddleware,
    validateReminder,
    sendReminder
);

// Convert to credit note
router.post('/:id/convert-to-credit-note',
    userMiddleware,
    convertToCreditNote
);

// Apply retainer to invoice
router.post('/:id/apply-retainer',
    userMiddleware,
    validateRetainerApplication,
    applyRetainer
);

// ============ APPROVAL WORKFLOW ============

// Submit invoice for approval
router.post('/:id/submit-for-approval',
    userMiddleware,
    submitForApproval
);

// Approve invoice (admin or lawyer)
router.post('/:id/approve',
    userMiddleware,
    validateApproval,
    approveInvoice
);

// Reject invoice (admin or lawyer)
router.post('/:id/reject',
    userMiddleware,
    validateRejection,
    rejectInvoice
);

// ============ ZATCA E-INVOICE ============

// Submit invoice to ZATCA
router.post('/:id/zatca/submit',
    userMiddleware,
    submitToZATCA
);

// Get ZATCA status
router.get('/:id/zatca/status',
    userMiddleware,
    getZATCAStatus
);

// ============ EXPORT ============

// Generate and download PDF
router.get('/:id/pdf',
    userMiddleware,
    generatePDF
);

// Generate and download XML (UBL 2.1 format for ZATCA)
router.get('/:id/xml',
    userMiddleware,
    generateXML
);

// ============ PAYMENT GATEWAY ============

// Create payment intent (Stripe)
router.post('/:id/payment',
    userMiddleware,
    createPaymentIntent
);

router.post('/:_id/payment',
    userMiddleware,
    createPaymentIntent
);

module.exports = router;
