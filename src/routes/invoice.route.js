/**
 * Invoice Routes
 *
 * Comprehensive invoice management API routes including CRUD operations,
 * payment processing, ZATCA e-invoicing, approval workflows, and reporting.
 *
 * Base route: /api/invoices
 */

const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
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
    firmFilter,
    getStats
);

// Get overdue invoices
router.get('/overdue',
    userMiddleware,
    firmFilter,
    getOverdueInvoices
);

// ============ UNIFIED DATA (No Duplicate Entry) ============

// Get billable items (unbilled time entries, expenses, tasks)
router.get('/billable-items',
    userMiddleware,
    firmFilter,
    getBillableItems
);

// Get open invoices for a client (for payment allocation)
router.get('/open/:clientId',
    userMiddleware,
    firmFilter,
    getOpenInvoices
);

// Confirm payment (Stripe webhook - no validation needed for webhook)
router.patch('/confirm-payment',
    userMiddleware,
    firmFilter,
    confirmPayment
);

// ============ CRUD OPERATIONS ============

// Create invoice
router.post('/',
    userMiddleware,
    firmFilter,
    validateCreateInvoice,
    auditAction('create_invoice', 'invoice', { severity: 'medium' }),
    createInvoice
);

// Get all invoices (with pagination and filters)
router.get('/',
    userMiddleware,
    firmFilter,
    getInvoices
);

// Get single invoice
router.get('/:id',
    userMiddleware,
    firmFilter,
    getInvoice
);

// Also support /:_id for backwards compatibility
router.get('/:_id',
    userMiddleware,
    firmFilter,
    getInvoice
);

// Update invoice
router.patch('/:id',
    userMiddleware,
    firmFilter,
    validateUpdateInvoice,
    auditAction('update_invoice', 'invoice', { captureChanges: true }),
    updateInvoice
);

router.patch('/:_id',
    userMiddleware,
    firmFilter,
    validateUpdateInvoice,
    auditAction('update_invoice', 'invoice', { captureChanges: true }),
    updateInvoice
);

// Also support PUT for update
router.put('/:id',
    userMiddleware,
    firmFilter,
    validateUpdateInvoice,
    auditAction('update_invoice', 'invoice', { captureChanges: true }),
    updateInvoice
);

// Delete invoice
router.delete('/:id',
    userMiddleware,
    firmFilter,
    auditAction('delete_invoice', 'invoice', { severity: 'high' }),
    deleteInvoice
);

router.delete('/:_id',
    userMiddleware,
    firmFilter,
    auditAction('delete_invoice', 'invoice', { severity: 'high' }),
    deleteInvoice
);

// ============ INVOICE ACTIONS ============

// Send invoice to client
router.post('/:id/send',
    userMiddleware,
    firmFilter,
    validateSendInvoice,
    sendInvoice
);

router.post('/:_id/send',
    userMiddleware,
    firmFilter,
    validateSendInvoice,
    sendInvoice
);

// Record payment for invoice
router.post('/:id/record-payment',
    userMiddleware,
    firmFilter,
    validateRecordPayment,
    recordPayment
);

// Alternative payment recording endpoint (backwards compatibility)
router.post('/:id/payments',
    userMiddleware,
    firmFilter,
    validateRecordInvoicePayment,
    recordInvoicePayment
);

router.post('/:_id/payments',
    userMiddleware,
    firmFilter,
    validateRecordInvoicePayment,
    recordInvoicePayment
);

// Void invoice
router.post('/:id/void',
    userMiddleware,
    firmFilter,
    validateVoid,
    voidInvoice
);

// Duplicate invoice
router.post('/:id/duplicate',
    userMiddleware,
    firmFilter,
    duplicateInvoice
);

// Send reminder
router.post('/:id/send-reminder',
    userMiddleware,
    firmFilter,
    validateReminder,
    sendReminder
);

// Convert to credit note
router.post('/:id/convert-to-credit-note',
    userMiddleware,
    firmFilter,
    convertToCreditNote
);

// Apply retainer to invoice
router.post('/:id/apply-retainer',
    userMiddleware,
    firmFilter,
    validateRetainerApplication,
    applyRetainer
);

// ============ APPROVAL WORKFLOW ============

// Submit invoice for approval
router.post('/:id/submit-for-approval',
    userMiddleware,
    firmFilter,
    submitForApproval
);

// Approve invoice (admin or lawyer)
router.post('/:id/approve',
    userMiddleware,
    firmFilter,
    validateApproval,
    approveInvoice
);

// Reject invoice (admin or lawyer)
router.post('/:id/reject',
    userMiddleware,
    firmFilter,
    validateRejection,
    rejectInvoice
);

// ============ ZATCA E-INVOICE ============

// Submit invoice to ZATCA
router.post('/:id/zatca/submit',
    userMiddleware,
    firmFilter,
    submitToZATCA
);

// Get ZATCA status
router.get('/:id/zatca/status',
    userMiddleware,
    firmFilter,
    getZATCAStatus
);

// ============ EXPORT ============

// Generate and download PDF
router.get('/:id/pdf',
    userMiddleware,
    firmFilter,
    generatePDF
);

// Generate and download XML (UBL 2.1 format for ZATCA)
router.get('/:id/xml',
    userMiddleware,
    firmFilter,
    generateXML
);

// ============ PAYMENT GATEWAY ============

// Create payment intent (Stripe)
router.post('/:id/payment',
    userMiddleware,
    firmFilter,
    createPaymentIntent
);

router.post('/:_id/payment',
    userMiddleware,
    firmFilter,
    createPaymentIntent
);

module.exports = router;
