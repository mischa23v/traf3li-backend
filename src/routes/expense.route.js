const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createExpense,
    getExpenses,
    getExpense,
    updateExpense,
    deleteExpense,
    bulkDeleteExpenses,
    submitExpense,
    approveExpense,
    rejectExpense,
    markAsReimbursed,
    getExpenseStats,
    getExpensesByCategory,
    uploadReceipt,
    suggestCategory,
    getExpenseCategories,
    bulkApproveExpenses,
    getNewExpenseDefaults
} = require('../controllers/expense.controller');

const app = express.Router();

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must be before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// Get defaults for new expense form
app.get('/new', userMiddleware, getNewExpenseDefaults);

// Smart categorization (AI-powered suggestions)
app.post('/suggest-category', userMiddleware, suggestCategory);

// Get all categories and enums
app.get('/categories', userMiddleware, getExpenseCategories);

// Statistics and grouping
app.get('/stats', userMiddleware, getExpenseStats);
app.get('/by-category', userMiddleware, getExpensesByCategory);

// Bulk operations
app.post('/bulk-approve', userMiddleware, bulkApproveExpenses);
app.post('/bulk-delete', userMiddleware, bulkDeleteExpenses);

// ═══════════════════════════════════════════════════════════════
// CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// Create expense
app.post('/', userMiddleware, createExpense);

// List expenses with filters
app.get('/', userMiddleware, getExpenses);

// Get single expense
app.get('/:id', userMiddleware, getExpense);

// Update expense
app.put('/:id', userMiddleware, updateExpense);

// Delete expense
app.delete('/:id', userMiddleware, deleteExpense);

// ═══════════════════════════════════════════════════════════════
// WORKFLOW ACTIONS
// ═══════════════════════════════════════════════════════════════

// Submit expense for approval
app.post('/:id/submit', userMiddleware, submitExpense);

// Approve expense
app.post('/:id/approve', userMiddleware, approveExpense);

// Reject expense
app.post('/:id/reject', userMiddleware, rejectExpense);

// Mark as reimbursed
app.post('/:id/reimburse', userMiddleware, markAsReimbursed);

// ═══════════════════════════════════════════════════════════════
// ATTACHMENTS
// ═══════════════════════════════════════════════════════════════

// Upload receipt/attachment
app.post('/:id/receipt', userMiddleware, uploadReceipt);

module.exports = app;
