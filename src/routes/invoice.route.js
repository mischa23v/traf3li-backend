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
const { authorize } = require('../middlewares/authorize.middleware');
const {
    validateInvoice,
    validateUpdateInvoice,
    validatePayment,
    validateVoid,
    validateApproval,
    validateRejection,
    validateReminder,
    validateRetainerApplication
} = require('../middlewares/invoiceValidator.middleware');
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

// ============ CRUD OPERATIONS ============

// Create invoice
router.post('/',
    userMiddleware,
    validateInvoice,
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
    updateInvoice
);

router.patch('/:_id',
    userMiddleware,
    validateUpdateInvoice,
    updateInvoice
);

// Also support PUT for update
router.put('/:id',
    userMiddleware,
    validateUpdateInvoice,
    updateInvoice
);

// Delete invoice
router.delete('/:id',
    userMiddleware,
    deleteInvoice
);

router.delete('/:_id',
    userMiddleware,
    deleteInvoice
);

// ============ INVOICE ACTIONS ============

// Send invoice to client
router.post('/:id/send',
    userMiddleware,
    sendInvoice
);

router.post('/:_id/send',
    userMiddleware,
    sendInvoice
);

// Record payment for invoice
router.post('/:id/record-payment',
    userMiddleware,
    validatePayment,
    recordPayment
);

// Alternative payment recording endpoint (backwards compatibility)
router.post('/:id/payments',
    userMiddleware,
    recordInvoicePayment
);

router.post('/:_id/payments',
    userMiddleware,
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
