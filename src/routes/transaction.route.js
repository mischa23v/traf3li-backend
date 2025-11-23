const express = require('express');
const { userMiddleware } = require('../middlewares');
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
app.post('/', userMiddleware, createTransaction);
app.get('/', userMiddleware, getTransactions);
app.get('/balance', userMiddleware, getBalance);
app.get('/summary', userMiddleware, getSummary);
app.get('/by-category', userMiddleware, getTransactionsByCategory);
app.get('/:id', userMiddleware, getTransaction);
app.put('/:id', userMiddleware, updateTransaction);
app.delete('/:id', userMiddleware, deleteTransaction);

// Transaction actions
app.post('/:id/cancel', userMiddleware, cancelTransaction);

// Bulk operations
app.delete('/bulk', userMiddleware, bulkDeleteTransactions);

module.exports = app;
