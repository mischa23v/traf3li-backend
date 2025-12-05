const { Expense, Case, User, BillingActivity } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');

// Create expense
const createExpense = asyncHandler(async (req, res) => {
    const {
        description,
        amount,
        category,
        caseId,
        date,
        paymentMethod,
        vendor,
        notes,
        isBillable
    } = req.body;

    const lawyerId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    // Validate required fields
    if (!description || description.length < 3) {
        throw CustomException('Description is required (min 3 characters)', 400);
    }

    if (!amount || amount < 0) {
        throw CustomException('Invalid amount', 400);
    }

    // If caseId provided, validate case exists and user has access
    if (caseId) {
        const caseDoc = await Case.findById(caseId);
        if (!caseDoc) {
            throw CustomException('Case not found', 404);
        }

        if (caseDoc.lawyerId.toString() !== lawyerId) {
            throw CustomException('You do not have access to this case', 403);
        }
    }

    const expense = await Expense.create({
        description,
        amount,
        category: category || 'other',
        caseId,
        lawyerId,
        firmId, // Add firmId for multi-tenancy
        date: date || new Date(),
        paymentMethod: paymentMethod || 'cash',
        vendor,
        notes,
        isBillable: isBillable !== undefined ? isBillable : true,
        createdBy: lawyerId
    });

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'expense_created',
        userId: lawyerId,
        relatedModel: 'Expense',
        relatedId: expense._id,
        description: `Expense ${expense.expenseId} created for ${amount} SAR`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    const populatedExpense = await Expense.findById(expense._id)
        .populate('caseId', 'title caseNumber')
        .populate('lawyerId', 'firstName lastName username email');

    return res.status(201).json({
        success: true,
        message: 'Expense created successfully',
        expense: populatedExpense
    });
});

// Get all expenses with filters
const getExpenses = asyncHandler(async (req, res) => {
    const {
        status,
        category,
        caseId,
        startDate,
        endDate,
        page = 1,
        limit = 20
    } = req.query;

    const lawyerId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    // Build filters - firmId first, then lawyerId fallback
    const filters = firmId ? { firmId } : { lawyerId };

    if (status) filters.status = status;
    if (category) filters.category = category;
    if (caseId) filters.caseId = caseId;

    if (startDate || endDate) {
        filters.date = {};
        if (startDate) filters.date.$gte = new Date(startDate);
        if (endDate) filters.date.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(filters)
        .populate('caseId', 'title caseNumber')
        .populate('lawyerId', 'firstName lastName username email')
        .sort({ date: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Expense.countDocuments(filters);

    return res.json({
        success: true,
        expenses,
        total
    });
});

// Get single expense
const getExpense = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    const expense = await Expense.findById(id)
        .populate('caseId', 'title caseNumber category')
        .populate('lawyerId', 'firstName lastName username email')
        .populate('invoiceId', 'invoiceNumber totalAmount');

    if (!expense) {
        throw CustomException('Expense not found', 404);
    }

    // Check access - firmId first, then lawyerId
    const hasAccess = firmId
        ? expense.firmId && expense.firmId.toString() === firmId.toString()
        : expense.lawyerId._id.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('You do not have access to this expense', 403);
    }

    return res.json({
        success: true,
        expense
    });
});

// Update expense
const updateExpense = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    const expense = await Expense.findById(id);

    if (!expense) {
        throw CustomException('Expense not found', 404);
    }

    // Check access - firmId first, then lawyerId
    const hasAccess = firmId
        ? expense.firmId && expense.firmId.toString() === firmId.toString()
        : expense.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('You do not have access to this expense', 403);
    }

    // Don't allow editing if already reimbursed or billed
    if (expense.reimbursementStatus === 'paid') {
        throw CustomException('Cannot edit a reimbursed expense', 400);
    }

    if (expense.invoiceId) {
        throw CustomException('Cannot edit an invoiced expense', 400);
    }

    const updatedExpense = await Expense.findByIdAndUpdate(
        id,
        { $set: req.body },
        { new: true, runValidators: true }
    )
        .populate('caseId', 'title caseNumber')
        .populate('lawyerId', 'firstName lastName username email');

    return res.json({
        success: true,
        message: 'Expense updated successfully',
        expense: updatedExpense
    });
});

// Delete expense
const deleteExpense = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    const expense = await Expense.findById(id);

    if (!expense) {
        throw CustomException('Expense not found', 404);
    }

    // Check access - firmId first, then lawyerId
    const hasAccess = firmId
        ? expense.firmId && expense.firmId.toString() === firmId.toString()
        : expense.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('You do not have access to this expense', 403);
    }

    // Don't allow deleting if reimbursed or billed
    if (expense.reimbursementStatus === 'paid') {
        throw CustomException('Cannot delete a reimbursed expense', 400);
    }

    if (expense.invoiceId) {
        throw CustomException('Cannot delete an invoiced expense', 400);
    }

    await Expense.findByIdAndDelete(id);

    return res.json({
        success: true,
        message: 'Expense deleted successfully'
    });
});

// Get expense statistics
const getExpenseStats = asyncHandler(async (req, res) => {
    const { caseId, startDate, endDate } = req.query;
    const lawyerId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    // Build filters - firmId first, then lawyerId fallback
    const filters = firmId ? { firmId } : { lawyerId };

    if (caseId) filters.caseId = caseId;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const stats = await Expense.getExpenseStats(filters);

    // Get expenses by category
    const byCategory = await Expense.getExpensesByCategory(filters);
    const byCategoryObj = {};
    byCategory.forEach(item => {
        byCategoryObj[item.category] = item.total;
    });

    // Get expenses by month
    const mongoose = require('mongoose');
    // Build match stage - firmId first, then lawyerId fallback
    const matchStage = firmId
        ? { firmId: new mongoose.Types.ObjectId(firmId) }
        : { lawyerId: new mongoose.Types.ObjectId(lawyerId) };
    if (startDate) matchStage.date = { $gte: new Date(startDate) };
    if (endDate) matchStage.date = { ...matchStage.date, $lte: new Date(endDate) };

    const byMonth = await Expense.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: {
                    year: { $year: '$date' },
                    month: { $month: '$date' }
                },
                amount: { $sum: '$amount' }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        {
            $project: {
                month: {
                    $concat: [
                        { $toString: '$_id.year' },
                        '-',
                        { $cond: [{ $lt: ['$_id.month', 10] }, { $concat: ['0', { $toString: '$_id.month' }] }, { $toString: '$_id.month' }] }
                    ]
                },
                amount: 1,
                _id: 0
            }
        }
    ]);

    return res.json({
        success: true,
        stats: {
            totalExpenses: stats.totalExpenses,
            billableExpenses: stats.billableExpenses,
            nonBillableExpenses: stats.nonBillableExpenses,
            byCategory: byCategoryObj,
            byMonth
        }
    });
});

// Get expenses by category
const getExpensesByCategory = asyncHandler(async (req, res) => {
    const { caseId, startDate, endDate } = req.query;
    const lawyerId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    // Build filters - firmId first, then lawyerId fallback
    const filters = firmId ? { firmId } : { lawyerId };

    if (caseId) filters.caseId = caseId;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const byCategory = await Expense.getExpensesByCategory(filters);

    return res.json({
        success: true,
        data: byCategory
    });
});

// Mark expense as reimbursed
const markAsReimbursed = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    const expense = await Expense.findById(id);

    if (!expense) {
        throw CustomException('Expense not found', 404);
    }

    // Check access - firmId first, then lawyerId
    const hasAccess = firmId
        ? expense.firmId && expense.firmId.toString() === firmId.toString()
        : expense.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('You do not have access to this expense', 403);
    }

    if (expense.reimbursementStatus === 'paid') {
        throw CustomException('Expense already reimbursed', 400);
    }

    expense.reimbursementStatus = 'paid';
    expense.reimbursedAt = new Date();
    expense.reimbursedAmount = expense.amount;
    await expense.save();

    return res.json({
        success: true,
        message: 'Expense marked as reimbursed',
        expense
    });
});

// Upload receipt
const uploadReceipt = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { fileName, fileUrl, fileType } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    const expense = await Expense.findById(id);

    if (!expense) {
        throw CustomException('Expense not found', 404);
    }

    // Check access - firmId first, then lawyerId
    const hasAccess = firmId
        ? expense.firmId && expense.firmId.toString() === firmId.toString()
        : expense.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('You do not have access to this expense', 403);
    }

    const receipt = {
        fileName: fileName || 'receipt',
        fileUrl,
        fileType: fileType || 'application/pdf',
        uploadedAt: new Date()
    };

    expense.receipts.push(receipt);
    expense.hasReceipt = true;

    // Also set the single receiptUrl for backwards compatibility
    if (!expense.receiptUrl) {
        expense.receiptUrl = fileUrl;
    }

    await expense.save();

    return res.json({
        success: true,
        message: 'Receipt uploaded successfully',
        receipt
    });
});

// Smart category suggestion
const suggestCategory = asyncHandler(async (req, res) => {
    const { description, descriptions } = req.body;
    const { suggestCategory: suggest, suggestCategoriesBatch, getAllCategories } = require('../utils/smartCategorization');

    // Single description
    if (description) {
        const suggestion = suggest(description);
        return res.json({
            success: true,
            data: suggestion
        });
    }

    // Batch descriptions
    if (descriptions && Array.isArray(descriptions)) {
        const suggestions = suggestCategoriesBatch(descriptions);
        return res.json({
            success: true,
            data: suggestions
        });
    }

    // Return all categories if no description provided
    const categories = getAllCategories();
    return res.json({
        success: true,
        data: { categories }
    });
});

// Get all expense categories with account codes
const getExpenseCategories = asyncHandler(async (req, res) => {
    const { getAllCategories } = require('../utils/smartCategorization');
    const categories = getAllCategories();

    return res.json({
        success: true,
        data: categories
    });
});

module.exports = {
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
};
