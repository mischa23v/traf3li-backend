const express = require('express');
const { userMiddleware } = require('../middlewares');
const { requiredIdempotency } = require('../middlewares/idempotency');
const {
    createTransaction,
    getTransactions,
    getTransaction,
    updateTransaction,
    deleteTransaction,
    getBalance,
    getSummary,
    getTransactionsByCategory,
    cancelTransaction,
    bulkDeleteTransactions
} = require('../controllers/transaction.controller');

const app = express.Router();

// Transaction CRUD
app.post('/', userMiddleware, requiredIdempotency, createTransaction);
app.get('/', userMiddleware, getTransactions);
app.get('/balance', userMiddleware, getBalance);
app.get('/summary', userMiddleware, getSummary);
app.get('/by-category', userMiddleware, getTransactionsByCategory);
app.get('/:id', userMiddleware, getTransaction);
app.put('/:id', userMiddleware, requiredIdempotency, updateTransaction);
app.delete('/:id', userMiddleware, requiredIdempotency, deleteTransaction);

// Transaction actions
app.post('/:id/cancel', userMiddleware, requiredIdempotency, cancelTransaction);

// Bulk operations
app.delete('/bulk', userMiddleware, requiredIdempotency, bulkDeleteTransactions);

module.exports = app;
