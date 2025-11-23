const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createExpense,
    getExpenses,
    getExpense,
    updateExpense,
    deleteExpense,
    getExpenseStats,
    getExpensesByCategory,
    markAsReimbursed,
    uploadReceipt
} = require('../controllers/expense.controller');

const app = express.Router();

// Expense CRUD
app.post('/', userMiddleware, createExpense);
app.get('/', userMiddleware, getExpenses);

// Statistics and grouping
app.get('/stats', userMiddleware, getExpenseStats);
app.get('/by-category', userMiddleware, getExpensesByCategory);

// Single expense
app.get('/:id', userMiddleware, getExpense);
app.put('/:id', userMiddleware, updateExpense);
app.delete('/:id', userMiddleware, deleteExpense);

// Expense actions
app.post('/:id/reimburse', userMiddleware, markAsReimbursed);
app.post('/:id/receipt', userMiddleware, uploadReceipt);

module.exports = app;
