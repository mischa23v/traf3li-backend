const { Expense, Case, User } = require('../models');
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

    try {
        // Validate amount
        if (!amount || amount < 0) {
            throw CustomException('المبلغ غير صالح', 400);
        }

        // If caseId provided, validate case exists and user has access
        if (caseId) {
            const caseDoc = await Case.findById(caseId);
            if (!caseDoc) {
                throw CustomException('القضية غير موجودة', 404);
            }

            if (caseDoc.lawyerId.toString() !== req.userID) {
                throw CustomException('ليس لديك صلاحية لإضافة مصروف لهذه القضية', 403);
            }
        }

        const expense = await Expense.create({
            description,
            amount,
            category: category || 'other',
            caseId,
            userId: req.userID,
            date: date || new Date(),
            paymentMethod: paymentMethod || 'cash',
            vendor,
            notes,
            isBillable: isBillable || false
        });

        const populatedExpense = await Expense.findById(expense._id)
            .populate('caseId', 'title caseNumber')
            .populate('userId', 'username email');

        return res.status(201).json({
            success: true,
            message: 'تم إضافة المصروف بنجاح',
            data: populatedExpense
        });
    } catch (error) {
        throw CustomException(error.message || 'فشل إنشاء المصروف', error.status || 500);
    }
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

    try {
        const filters = { userId: req.userID };

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
            .populate('userId', 'username email')
            .sort({ date: -1, createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Expense.countDocuments(filters);

        return res.json({
            success: true,
            data: expenses,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            },
            message: expenses.length === 0 ? 'لا توجد مصروفات' : undefined
        });
    } catch (error) {
        throw CustomException(error.message || 'فشل جلب المصروفات', error.status || 500);
    }
});

// Get single expense
const getExpense = asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
        const expense = await Expense.findById(id)
            .populate('caseId', 'title caseNumber category')
            .populate('userId', 'username email')
            .populate('invoiceId', 'invoiceNumber total');

        if (!expense) {
            throw CustomException('المصروف غير موجود', 404);
        }

        // Check access
        if (expense.userId._id.toString() !== req.userID) {
            throw CustomException('ليس لديك صلاحية لعرض هذا المصروف', 403);
        }

        return res.json({
            success: true,
            data: expense
        });
    } catch (error) {
        throw CustomException(error.message || 'فشل جلب المصروف', error.status || 500);
    }
});

// Update expense
const updateExpense = asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
        const expense = await Expense.findById(id);

        if (!expense) {
            throw CustomException('المصروف غير موجود', 404);
        }

        // Check access
        if (expense.userId.toString() !== req.userID) {
            throw CustomException('ليس لديك صلاحية لتعديل هذا المصروف', 403);
        }

        // Don't allow editing if already reimbursed or billed
        if (expense.isReimbursed) {
            throw CustomException('لا يمكن تعديل مصروف تم سداده', 400);
        }

        if (expense.invoiceId) {
            throw CustomException('لا يمكن تعديل مصروف مرتبط بفاتورة', 400);
        }

        const updatedExpense = await Expense.findByIdAndUpdate(
            id,
            { $set: req.body },
            { new: true, runValidators: true }
        )
        .populate('caseId', 'title caseNumber')
        .populate('userId', 'username email');

        return res.json({
            success: true,
            message: 'تم تحديث المصروف بنجاح',
            data: updatedExpense
        });
    } catch (error) {
        throw CustomException(error.message || 'فشل تحديث المصروف', error.status || 500);
    }
});

// Delete expense
const deleteExpense = asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
        const expense = await Expense.findById(id);

        if (!expense) {
            throw CustomException('المصروف غير موجود', 404);
        }

        // Check access
        if (expense.userId.toString() !== req.userID) {
            throw CustomException('ليس لديك صلاحية لحذف هذا المصروف', 403);
        }

        // Don't allow deleting if reimbursed or billed
        if (expense.isReimbursed) {
            throw CustomException('لا يمكن حذف مصروف تم سداده', 400);
        }

        if (expense.invoiceId) {
            throw CustomException('لا يمكن حذف مصروف مرتبط بفاتورة', 400);
        }

        await Expense.findByIdAndDelete(id);

        return res.json({
            success: true,
            message: 'تم حذف المصروف بنجاح'
        });
    } catch (error) {
        throw CustomException(error.message || 'فشل حذف المصروف', error.status || 500);
    }
});

// Get expense statistics
const getExpenseStats = asyncHandler(async (req, res) => {
    const { caseId, startDate, endDate } = req.query;

    try {
        const filters = { userId: req.userID };

        if (caseId) filters.caseId = caseId;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;

        const stats = await Expense.getExpenseStats(filters);

        return res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        throw CustomException(error.message || 'فشل جلب إحصائيات المصروفات', error.status || 500);
    }
});

// Get expenses by category
const getExpensesByCategory = asyncHandler(async (req, res) => {
    const { caseId, startDate, endDate } = req.query;

    try {
        const filters = { userId: req.userID };

        if (caseId) filters.caseId = caseId;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;

        const byCategory = await Expense.getExpensesByCategory(filters);

        return res.json({
            success: true,
            data: byCategory
        });
    } catch (error) {
        throw CustomException(error.message || 'فشل جلب المصروفات حسب الفئة', error.status || 500);
    }
});

// Mark expense as reimbursed
const markAsReimbursed = asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
        const expense = await Expense.findById(id);

        if (!expense) {
            throw CustomException('المصروف غير موجود', 404);
        }

        // Check access
        if (expense.userId.toString() !== req.userID) {
            throw CustomException('ليس لديك صلاحية لتحديث هذا المصروف', 403);
        }

        if (expense.isReimbursed) {
            throw CustomException('تم سداد هذا المصروف مسبقاً', 400);
        }

        expense.isReimbursed = true;
        expense.reimbursedAt = new Date();
        await expense.save();

        return res.json({
            success: true,
            message: 'تم تحديث حالة السداد بنجاح',
            data: expense
        });
    } catch (error) {
        throw CustomException(error.message || 'فشل تحديث حالة السداد', error.status || 500);
    }
});

// Upload receipt
const uploadReceipt = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { receiptUrl } = req.body;

    try {
        const expense = await Expense.findById(id);

        if (!expense) {
            throw CustomException('المصروف غير موجود', 404);
        }

        // Check access
        if (expense.userId.toString() !== req.userID) {
            throw CustomException('ليس لديك صلاحية لتحديث هذا المصروف', 403);
        }

        expense.receiptUrl = receiptUrl;
        expense.hasReceipt = true;
        await expense.save();

        return res.json({
            success: true,
            message: 'تم رفع الإيصال بنجاح',
            data: expense
        });
    } catch (error) {
        throw CustomException(error.message || 'فشل رفع الإيصال', error.status || 500);
    }
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
    uploadReceipt
};
