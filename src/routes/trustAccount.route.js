const express = require('express');
const { userMiddleware } = require('../middlewares');
const { sensitiveRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    // Trust Account
    createTrustAccount,
    getTrustAccounts,
    getTrustAccount,
    updateTrustAccount,
    deleteTrustAccount,
    // Transactions
    createTransaction,
    getTransactions,
    getTransaction,
    voidTransaction,
    // Client Balances
    getClientBalances,
    getClientBalance,
    transferBetweenClients,
    // Reconciliation
    createReconciliation,
    getReconciliations,
    createThreeWayReconciliation,
    getThreeWayReconciliations,
    // Summary
    getAccountSummary
} = require('../controllers/trustAccount.controller');

const app = express.Router();

// Trust Account CRUD
app.get('/', userMiddleware, getTrustAccounts);
app.post('/', sensitiveRateLimiter, userMiddleware, createTrustAccount);

app.get('/:id', userMiddleware, getTrustAccount);
app.patch('/:id', sensitiveRateLimiter, userMiddleware, updateTrustAccount);
app.delete('/:id', sensitiveRateLimiter, userMiddleware, deleteTrustAccount);

// Account summary
app.get('/:id/summary', userMiddleware, getAccountSummary);

// Transactions
app.get('/:id/transactions', userMiddleware, getTransactions);
app.post('/:id/transactions', sensitiveRateLimiter, userMiddleware, createTransaction);
app.get('/:id/transactions/:transactionId', userMiddleware, getTransaction);
app.post('/:id/transactions/:transactionId/void', sensitiveRateLimiter, userMiddleware, voidTransaction);

// Client balances
app.get('/:id/balances', userMiddleware, getClientBalances);
app.get('/:id/balances/:clientId', userMiddleware, getClientBalance);

// Inter-client transfer
app.post('/:id/transfer', sensitiveRateLimiter, userMiddleware, transferBetweenClients);

// Bank reconciliation
app.get('/:id/reconciliations', userMiddleware, getReconciliations);
app.post('/:id/reconciliations', sensitiveRateLimiter, userMiddleware, createReconciliation);

// Three-way reconciliation
app.get('/:id/three-way-reconciliations', userMiddleware, getThreeWayReconciliations);
app.post('/:id/three-way-reconciliations', sensitiveRateLimiter, userMiddleware, createThreeWayReconciliation);

module.exports = app;
