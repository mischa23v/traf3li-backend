const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const {
    createExpense,
    getExpenses,
    getExpense,
    updateExpense,
    deleteExpense,
    getExpenseStats,
    getExpensesByCategory,
    markAsReimbursed,
    uploadReceipt,
    suggestCategory,
    getExpenseCategories
} = require('../controllers/expense.controller');

const app = express.Router();

// Expense CRUD
app.post('/', userMiddleware, firmFilter, createExpense);
app.get('/', userMiddleware, firmFilter, getExpenses);

// Smart categorization (AI-powered suggestions)
app.post('/suggest-category', userMiddleware, firmFilter, suggestCategory);
app.get('/categories', userMiddleware, firmFilter, getExpenseCategories);

// Statistics and grouping
app.get('/stats', userMiddleware, firmFilter, getExpenseStats);
app.get('/by-category', userMiddleware, firmFilter, getExpensesByCategory);

// Single expense
app.get('/:id', userMiddleware, firmFilter, getExpense);
app.put('/:id', userMiddleware, firmFilter, updateExpense);
app.delete('/:id', userMiddleware, firmFilter, deleteExpense);

// Expense actions
app.post('/:id/reimburse', userMiddleware, firmFilter, markAsReimbursed);
app.post('/:id/receipt', userMiddleware, firmFilter, uploadReceipt);

module.exports = app;
