/**
 * Inter-Company Routes
 *
 * API routes for managing inter-company transactions and balances
 * between different firms in a multi-firm organization.
 *
 * Base route: /api/inter-company
 */

const express = require('express');
const { userMiddleware, firmFilter, financeAccessOnly } = require('../middlewares');
const { auditAction } = require('../middlewares/auditLog.middleware');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    // Transactions
    getTransactions,
    createTransaction,
    getTransaction,
    updateTransaction,
    confirmTransaction,
    cancelTransaction,

    // Balances
    getBalances,
    getBalanceWithFirm,

    // Reconciliation
    getReconciliationItems,
    reconcileTransactions
} = require('../controllers/interCompany.controller');

const router = express.Router();

// Apply rate limiting
router.use(apiRateLimiter);

// All routes require authentication and firm context
router.use(userMiddleware);
router.use(firmFilter);

// ============ TRANSACTION ROUTES ============

// Get all transactions for current firm
router.get('/transactions',
    getTransactions
);

// Create new inter-company transaction
router.post('/transactions',
    financeAccessOnly,
    auditAction('create_intercompany_transaction', 'intercompany', { severity: 'medium' }),
    createTransaction
);

// Get single transaction
router.get('/transactions/:id',
    getTransaction
);

// Update transaction (only draft/pending)
router.put('/transactions/:id',
    financeAccessOnly,
    auditAction('update_intercompany_transaction', 'intercompany', { captureChanges: true }),
    updateTransaction
);

// Confirm transaction
router.post('/transactions/:id/confirm',
    financeAccessOnly,
    auditAction('confirm_intercompany_transaction', 'intercompany', { severity: 'medium' }),
    confirmTransaction
);

// Cancel transaction
router.post('/transactions/:id/cancel',
    financeAccessOnly,
    auditAction('cancel_intercompany_transaction', 'intercompany', { severity: 'high' }),
    cancelTransaction
);

// ============ BALANCE ROUTES ============

// Get balance matrix for current firm
router.get('/balances',
    getBalances
);

// Get detailed balance with specific firm
router.get('/balances/:firmId',
    getBalanceWithFirm
);

// ============ RECONCILIATION ROUTES ============

// Get unreconciled transactions
router.get('/reconciliation',
    getReconciliationItems
);

// Reconcile transactions
router.post('/reconciliation',
    financeAccessOnly,
    auditAction('reconcile_intercompany_transactions', 'intercompany', { severity: 'medium' }),
    reconcileTransactions
);

module.exports = router;
