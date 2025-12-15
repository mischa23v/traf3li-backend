const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
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
    getNewExpenseDefaults,
    // ERPNext parity endpoints
    getPendingApproval,
    approveSanctionedExpense,
    rejectExpenseWithNotification,
    markExpenseAsPaid
} = require('../controllers/expense.controller');

const app = express.Router();

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must be before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// Get defaults for new expense form
app.get('/new', userMiddleware, firmFilter, getNewExpenseDefaults);

// Smart categorization (AI-powered suggestions)
app.post('/suggest-category', userMiddleware, firmFilter, suggestCategory);

// Get all categories and enums
app.get('/categories', userMiddleware, firmFilter, getExpenseCategories);

// Statistics and grouping
app.get('/stats', userMiddleware, firmFilter, getExpenseStats);
app.get('/by-category', userMiddleware, firmFilter, getExpensesByCategory);

// Bulk operations
app.post('/bulk-approve', userMiddleware, firmFilter, bulkApproveExpenses);
app.post('/bulk-delete', userMiddleware, firmFilter, bulkDeleteExpenses);

// ═══════════════════════════════════════════════════════════════
// APPROVAL WORKFLOW (ERPNext parity)
// ═══════════════════════════════════════════════════════════════

// Get expenses pending my approval (as assigned approver)
app.get('/pending-approval', userMiddleware, firmFilter, getPendingApproval);

// ═══════════════════════════════════════════════════════════════
// CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// Create expense
app.post('/', userMiddleware, firmFilter, createExpense);

// List expenses with filters
app.get('/', userMiddleware, firmFilter, getExpenses);

// Get single expense
app.get('/:id', userMiddleware, firmFilter, getExpense);

// Update expense
app.put('/:id', userMiddleware, firmFilter, updateExpense);

// Delete expense
app.delete('/:id', userMiddleware, firmFilter, deleteExpense);

// ═══════════════════════════════════════════════════════════════
// WORKFLOW ACTIONS
// ═══════════════════════════════════════════════════════════════

// Submit expense for approval
app.post('/:id/submit', userMiddleware, firmFilter, submitExpense);

// Approve expense
app.post('/:id/approve', userMiddleware, firmFilter, approveExpense);

// Reject expense
app.post('/:id/reject', userMiddleware, firmFilter, rejectExpense);

// Mark as reimbursed
app.post('/:id/reimburse', userMiddleware, firmFilter, markAsReimbursed);

// ═══════════════════════════════════════════════════════════════
// ERPNext PARITY WORKFLOW ACTIONS
// ═══════════════════════════════════════════════════════════════

// Approve with sanctioned amount (may differ from claimed)
app.post('/:id/approve-sanctioned', userMiddleware, firmFilter, approveSanctionedExpense);

// Reject with notification to employee
app.post('/:id/reject-with-notification', userMiddleware, firmFilter, rejectExpenseWithNotification);

// Mark expense as paid (for approved expenses)
app.post('/:id/pay', userMiddleware, firmFilter, markExpenseAsPaid);

// ═══════════════════════════════════════════════════════════════
// ATTACHMENTS
// ═══════════════════════════════════════════════════════════════

// Upload receipt/attachment
app.post('/:id/receipt', userMiddleware, firmFilter, uploadReceipt);

module.exports = app;
