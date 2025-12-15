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
    getNewExpenseDefaults
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

// ═══════════════════════════════════════════════════════════════
// ERPNext PARITY ROUTES
// ═══════════════════════════════════════════════════════════════

// Get expenses pending approval
// GET /api/expenses/pending-approval
app.get('/pending-approval', userMiddleware, firmFilter, async (req, res) => {
    try {
        const Expense = require('../models/expense.model');
        const query = {
            firmId: req.firmId,
            approvalStatus: { $in: ['pending', 'draft'] }
        };

        // If user is an approver, filter by their approval queue
        if (req.query.approverId) {
            query.expenseApproverId = req.query.approverId;
        }

        const expenses = await Expense.find(query)
            .populate('lawyerId', 'firstName lastName email')
            .populate('clientId', 'firstName lastName companyName')
            .populate('caseId', 'caseNumber title')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: expenses });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get employee's available advances for expense claim allocation
// GET /api/expenses/available-advances/:employeeId
app.get('/available-advances/:employeeId', userMiddleware, firmFilter, async (req, res) => {
    try {
        const EmployeeAdvance = require('../models/employeeAdvance.model');
        const advances = await EmployeeAdvance.getAvailableAdvancesForExpense(
            req.firmId,
            req.params.employeeId
        );
        res.json({ success: true, data: advances });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bulk operations
app.post('/bulk-approve', userMiddleware, firmFilter, bulkApproveExpenses);
app.post('/bulk-delete', userMiddleware, firmFilter, bulkDeleteExpenses);

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

// Mark expense as paid (ERPNext Parity)
// POST /api/expenses/:id/pay
app.post('/:id/pay', userMiddleware, firmFilter, async (req, res) => {
    try {
        const Expense = require('../models/expense.model');
        const { modeOfPayment, paymentReference, clearanceDate } = req.body;

        const expense = await Expense.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    isPaid: true,
                    modeOfPayment: modeOfPayment || 'bank_transfer',
                    paymentReference,
                    clearanceDate: clearanceDate || new Date(),
                    approvalStatus: 'paid'
                }
            },
            { new: true }
        );

        if (!expense) {
            return res.status(404).json({ success: false, error: 'Expense not found' });
        }

        res.json({ success: true, data: expense });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Allocate employee advance to expense (ERPNext Parity)
// POST /api/expenses/:id/allocate-advance
app.post('/:id/allocate-advance', userMiddleware, firmFilter, async (req, res) => {
    try {
        const { advanceId, amount } = req.body;
        if (!advanceId || !amount) {
            return res.status(400).json({ success: false, error: 'advanceId and amount are required' });
        }

        const EmployeeAdvance = require('../models/employeeAdvance.model');
        const result = await EmployeeAdvance.allocateToExpenseClaim(advanceId, req.params.id, amount);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// ATTACHMENTS
// ═══════════════════════════════════════════════════════════════

// Upload receipt/attachment
app.post('/:id/receipt', userMiddleware, firmFilter, uploadReceipt);

module.exports = app;
