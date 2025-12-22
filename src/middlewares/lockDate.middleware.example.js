/**
 * Lock Date Middleware Usage Examples
 *
 * This file demonstrates how to use the lock date middleware
 * to enforce fiscal period controls on financial transactions.
 */

const express = require('express');
const router = express.Router();
const {
    checkInvoiceLockDate,
    checkPaymentLockDate,
    checkExpenseLockDate,
    checkBankLockDate,
    checkJournalLockDate,
    checkLockDate,
    requireUnlockedPeriod
} = require('./lockDate.middleware');
const { authenticate } = require('./authenticate');
const { firmFilter } = require('./firmFilter.middleware');

// ============================================================================
// INVOICE ROUTES - Automatically determines lock type based on invoice type
// ============================================================================

// Create invoice - checks lock date based on invoice type (sale/purchase)
router.post('/invoices',
    authenticate,
    firmFilter,
    checkInvoiceLockDate,
    createInvoice
);

// Update invoice - checks lock date
router.put('/invoices/:id',
    authenticate,
    firmFilter,
    checkInvoiceLockDate,
    updateInvoice
);

// ============================================================================
// PAYMENT ROUTES - Determines lock type based on payment context
// ============================================================================

// Record payment - checks lock date based on payment type
router.post('/payments',
    authenticate,
    firmFilter,
    checkPaymentLockDate,
    createPayment
);

// Update payment
router.put('/payments/:id',
    authenticate,
    firmFilter,
    checkPaymentLockDate,
    updatePayment
);

// ============================================================================
// EXPENSE ROUTES - Uses purchase lock type
// ============================================================================

// Create expense
router.post('/expenses',
    authenticate,
    firmFilter,
    checkExpenseLockDate,
    createExpense
);

// Update expense
router.put('/expenses/:id',
    authenticate,
    firmFilter,
    checkExpenseLockDate,
    updateExpense
);

// ============================================================================
// BANK TRANSACTION ROUTES - Uses bank lock type
// ============================================================================

// Create bank transaction
router.post('/bank-transactions',
    authenticate,
    firmFilter,
    checkBankLockDate,
    createBankTransaction
);

// Reconcile bank statement
router.post('/bank-accounts/:id/reconcile',
    authenticate,
    firmFilter,
    checkBankLockDate,
    reconcileBankStatement
);

// ============================================================================
// JOURNAL ENTRY ROUTES - Uses journal lock type
// ============================================================================

// Create journal entry
router.post('/journal-entries',
    authenticate,
    firmFilter,
    checkJournalLockDate,
    createJournalEntry
);

// Update journal entry
router.put('/journal-entries/:id',
    authenticate,
    firmFilter,
    checkJournalLockDate,
    updateJournalEntry
);

// ============================================================================
// CUSTOM LOCK TYPE - Use checkLockDate factory with specific type
// ============================================================================

// Create sale order - use 'sale' lock type
router.post('/sale-orders',
    authenticate,
    firmFilter,
    checkLockDate('sale'),
    createSaleOrder
);

// Create purchase order - use 'purchase' lock type
router.post('/purchase-orders',
    authenticate,
    firmFilter,
    checkLockDate('purchase'),
    createPurchaseOrder
);

// General financial operation - use 'all' lock type
router.post('/financial-adjustments',
    authenticate,
    firmFilter,
    checkLockDate('all'),
    createFinancialAdjustment
);

// ============================================================================
// GENERIC DATE CHECKING - Use requireUnlockedPeriod with custom date field
// ============================================================================

// Create time entry with custom date field
router.post('/time-entries',
    authenticate,
    firmFilter,
    requireUnlockedPeriod('workDate'),
    createTimeEntry
);

// Create contract with effective date
router.post('/contracts',
    authenticate,
    firmFilter,
    requireUnlockedPeriod('effectiveDate'),
    createContract
);

// ============================================================================
// EXAMPLE: Combining multiple middleware
// ============================================================================

router.post('/invoices/bulk',
    authenticate,
    firmFilter,
    checkFirmPermission('invoices', 'edit'), // Check permissions
    checkInvoiceLockDate, // Check lock date
    requireFeature('bulk_operations'), // Check plan feature
    bulkCreateInvoices
);

// ============================================================================
// Placeholder controller functions
// ============================================================================

function createInvoice(req, res) {
    res.json({ message: 'Invoice created' });
}

function updateInvoice(req, res) {
    res.json({ message: 'Invoice updated' });
}

function createPayment(req, res) {
    res.json({ message: 'Payment created' });
}

function updatePayment(req, res) {
    res.json({ message: 'Payment updated' });
}

function createExpense(req, res) {
    res.json({ message: 'Expense created' });
}

function updateExpense(req, res) {
    res.json({ message: 'Expense updated' });
}

function createBankTransaction(req, res) {
    res.json({ message: 'Bank transaction created' });
}

function reconcileBankStatement(req, res) {
    res.json({ message: 'Bank statement reconciled' });
}

function createJournalEntry(req, res) {
    res.json({ message: 'Journal entry created' });
}

function updateJournalEntry(req, res) {
    res.json({ message: 'Journal entry updated' });
}

function createSaleOrder(req, res) {
    res.json({ message: 'Sale order created' });
}

function createPurchaseOrder(req, res) {
    res.json({ message: 'Purchase order created' });
}

function createFinancialAdjustment(req, res) {
    res.json({ message: 'Financial adjustment created' });
}

function createTimeEntry(req, res) {
    res.json({ message: 'Time entry created' });
}

function createContract(req, res) {
    res.json({ message: 'Contract created' });
}

function bulkCreateInvoices(req, res) {
    res.json({ message: 'Invoices bulk created' });
}

module.exports = router;
