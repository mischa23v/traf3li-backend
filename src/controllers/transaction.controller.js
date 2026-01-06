const { Transaction, Invoice, Expense, Case } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');
const mongoose = require('mongoose');

// Helper function to escape regex special characters (ReDoS protection)
const escapeRegex = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Create transaction
 * POST /api/transactions
 */
const createTransaction = asyncHandler(async (req, res) => {
    const userId = req.userID;

    // Mass assignment protection
    const allowedFields = [
        'type',
        'amount',
        'category',
        'description',
        'paymentMethod',
        'invoiceId',
        'expenseId',
        'caseId',
        'referenceNumber',
        'date',
        'notes'
    ];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Validate required fields
    if (!sanitizedData.type || sanitizedData.amount === undefined) {
        throw CustomException('النوع والمبلغ مطلوبان', 400);
    }

    // Validate type
    if (!['income', 'expense', 'transfer'].includes(sanitizedData.type)) {
        throw CustomException('نوع المعاملة غير صالح', 400);
    }

    // Validate amount
    const amount = parseFloat(sanitizedData.amount);
    if (isNaN(amount) || amount <= 0) {
        throw CustomException('المبلغ يجب أن يكون رقماً موجباً أكبر من صفر', 400);
    }

    // Validate date if provided
    if (sanitizedData.date) {
        const parsedDate = new Date(sanitizedData.date);
        if (isNaN(parsedDate.getTime())) {
            throw CustomException('تنسيق التاريخ غير صالح', 400);
        }
    }

    // Sanitize ObjectIds
    const relatedInvoice = sanitizedData.invoiceId ? sanitizeObjectId(sanitizedData.invoiceId) : null;
    const relatedExpense = sanitizedData.expenseId ? sanitizeObjectId(sanitizedData.expenseId) : null;
    const relatedCase = sanitizedData.caseId ? sanitizeObjectId(sanitizedData.caseId) : null;

    // Use MongoDB transaction for financial operation
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Create transaction (using schema field names: relatedInvoice, relatedExpense, relatedCase)
        const transaction = await Transaction.create([{
            userId,
            type: sanitizedData.type,
            amount,
            category: sanitizedData.category,
            description: sanitizedData.description,
            paymentMethod: sanitizedData.paymentMethod,
            relatedInvoice,
            relatedExpense,
            relatedCase,
            reference: sanitizedData.referenceNumber,
            date: sanitizedData.date || new Date(),
            status: 'completed',
            notes: sanitizedData.notes
        }], { session });

        await transaction[0].populate([
            { path: 'relatedInvoice', select: 'invoiceNumber totalAmount' },
            { path: 'relatedExpense', select: 'description amount' },
            { path: 'relatedCase', select: 'caseNumber title' }
        ]);

        await session.commitTransaction();

        res.status(201).json({
            success: true,
            message: 'تم إنشاء المعاملة بنجاح',
            transaction: transaction[0]
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * Get transactions
 * GET /api/transactions
 */
const getTransactions = asyncHandler(async (req, res) => {
    const {
        type,
        category,
        status,
        paymentMethod,
        startDate,
        endDate,
        caseId,
        invoiceId,
        expenseId,
        minAmount,
        maxAmount,
        search,
        page = 1,
        limit = 20,
        sortBy = 'date',
        sortOrder = 'desc'
    } = req.query;

    const userId = req.userID;
    const query = { userId };

    // Filters
    if (type) query.type = type;
    if (category) query.category = category;
    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    // Sanitize ObjectIds
    if (caseId) query.relatedCase = sanitizeObjectId(caseId);
    if (invoiceId) query.relatedInvoice = sanitizeObjectId(invoiceId);
    if (expenseId) query.relatedExpense = sanitizeObjectId(expenseId);

    // Date range with validation
    if (startDate || endDate) {
        query.date = {};
        if (startDate) {
            const parsedStartDate = new Date(startDate);
            if (isNaN(parsedStartDate.getTime())) {
                throw CustomException('تنسيق تاريخ البداية غير صالح', 400);
            }
            query.date.$gte = parsedStartDate;
        }
        if (endDate) {
            const parsedEndDate = new Date(endDate);
            if (isNaN(parsedEndDate.getTime())) {
                throw CustomException('تنسيق تاريخ النهاية غير صالح', 400);
            }
            query.date.$lte = parsedEndDate;
        }
    }

    // Amount range with validation
    if (minAmount || maxAmount) {
        query.amount = {};
        if (minAmount) {
            const min = parseFloat(minAmount);
            if (isNaN(min) || min < 0) {
                throw CustomException('الحد الأدنى للمبلغ يجب أن يكون رقماً موجباً', 400);
            }
            query.amount.$gte = min;
        }
        if (maxAmount) {
            const max = parseFloat(maxAmount);
            if (isNaN(max) || max < 0) {
                throw CustomException('الحد الأقصى للمبلغ يجب أن يكون رقماً موجباً', 400);
            }
            query.amount.$lte = max;
        }
    }

    // Search
    if (search) {
        query.$or = [
            { description: { $regex: escapeRegex(search), $options: 'i' } },
            { transactionId: { $regex: escapeRegex(search), $options: 'i' } },
            { referenceNumber: { $regex: escapeRegex(search), $options: 'i' } },
            { notes: { $regex: escapeRegex(search), $options: 'i' } }
        ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Sanitize pagination to prevent DoS attacks
    const { page: safePage, limit: safeLimit, skip } = sanitizePagination(req.query, {
        maxLimit: 200,
        defaultLimit: 50
    });

    const transactions = await Transaction.find(query)
        .populate('relatedInvoice', 'invoiceNumber totalAmount')
        .populate('relatedExpense', 'description amount')
        .populate('relatedCase', 'caseNumber title')
        .sort(sortOptions)
        .limit(safeLimit)
        .skip(skip);

    const total = await Transaction.countDocuments(query);

    // Ensure data is always an array (defensive check for frontend compatibility)
    res.status(200).json({
        success: true,
        data: Array.isArray(transactions) ? transactions : [],
        pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            pages: Math.ceil(total / safeLimit)
        }
    });
});

/**
 * Get single transaction
 * GET /api/transactions/:id
 */
const getTransaction = asyncHandler(async (req, res) => {
    const userId = req.userID;

    // IDOR protection - sanitize ID
    const transactionId = sanitizeObjectId(req.params.id);

    const transaction = await Transaction.findOne({ _id: transactionId, ...req.firmQuery })
        .populate('relatedInvoice', 'invoiceNumber totalAmount amountPaid status')
        .populate('relatedExpense', 'description amount category')
        .populate('relatedCase', 'caseNumber title status');

    if (!transaction) {
        throw CustomException('المعاملة غير موجودة', 404);
    }

    // Verify ownership
    if (transaction.userId.toString() !== userId) {
        throw CustomException('لا يمكنك الوصول إلى هذه المعاملة', 403);
    }

    res.status(200).json({
        success: true,
        data: transaction
    });
});

/**
 * Update transaction
 * PUT /api/transactions/:id
 */
const updateTransaction = asyncHandler(async (req, res) => {
    const userId = req.userID;

    // IDOR protection - sanitize ID
    const transactionId = sanitizeObjectId(req.params.id);

    const transaction = await Transaction.findOne({ _id: transactionId, ...req.firmQuery });

    if (!transaction) {
        throw CustomException('المعاملة غير موجودة', 404);
    }

    // Verify ownership
    if (transaction.userId.toString() !== userId) {
        throw CustomException('لا يمكنك الوصول إلى هذه المعاملة', 403);
    }

    // Mass assignment protection
    const allowedFields = [
        'type',
        'amount',
        'category',
        'description',
        'paymentMethod',
        'invoiceId',
        'expenseId',
        'caseId',
        'referenceNumber',
        'date',
        'status',
        'notes'
    ];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Validate type if provided
    if (sanitizedData.type && !['income', 'expense', 'transfer'].includes(sanitizedData.type)) {
        throw CustomException('نوع المعاملة غير صالح', 400);
    }

    // Validate amount if provided
    if (sanitizedData.amount !== undefined) {
        const amount = parseFloat(sanitizedData.amount);
        if (isNaN(amount) || amount <= 0) {
            throw CustomException('المبلغ يجب أن يكون رقماً موجباً أكبر من صفر', 400);
        }
        transaction.amount = amount;
    }

    // Validate date if provided
    if (sanitizedData.date) {
        const parsedDate = new Date(sanitizedData.date);
        if (isNaN(parsedDate.getTime())) {
            throw CustomException('تنسيق التاريخ غير صالح', 400);
        }
        transaction.date = parsedDate;
    }

    // Map request body field names to schema field names
    const fieldMappings = {
        invoiceId: 'relatedInvoice',
        expenseId: 'relatedExpense',
        caseId: 'relatedCase',
        referenceNumber: 'reference'
    };

    // Update fields
    Object.keys(sanitizedData).forEach(field => {
        if (field === 'amount' || field === 'date') {
            // Already handled above
            return;
        }

        const schemaField = fieldMappings[field] || field;

        // Sanitize ObjectIds for related documents
        if (field === 'invoiceId' || field === 'expenseId' || field === 'caseId') {
            transaction[schemaField] = sanitizedData[field] ? sanitizeObjectId(sanitizedData[field]) : null;
        } else {
            transaction[schemaField] = sanitizedData[field];
        }
    });

    await transaction.save();

    await transaction.populate([
        { path: 'relatedInvoice', select: 'invoiceNumber totalAmount' },
        { path: 'relatedExpense', select: 'description amount' },
        { path: 'relatedCase', select: 'caseNumber title' }
    ]);

    res.status(200).json({
        success: true,
        message: 'تم تحديث المعاملة بنجاح',
        transaction
    });
});

/**
 * Delete transaction
 * DELETE /api/transactions/:id
 */
const deleteTransaction = asyncHandler(async (req, res) => {
    const userId = req.userID;

    // IDOR protection - sanitize ID
    const transactionId = sanitizeObjectId(req.params.id);

    const transaction = await Transaction.findOne({ _id: transactionId, ...req.firmQuery });

    if (!transaction) {
        throw CustomException('المعاملة غير موجودة', 404);
    }

    // Verify ownership
    if (transaction.userId.toString() !== userId) {
        throw CustomException('لا يمكنك الوصول إلى هذه المعاملة', 403);
    }

    // Use MongoDB transaction for financial operation
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        await Transaction.findOneAndDelete({ _id: transactionId, userId: req.userID }, { session });
        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: 'تم حذف المعاملة بنجاح'
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * Get account balance
 * GET /api/transactions/balance
 */
const getBalance = asyncHandler(async (req, res) => {
    const { upToDate } = req.query;
    const userId = req.userID;

    let parsedDate;
    if (upToDate) {
        parsedDate = new Date(upToDate);
        if (isNaN(parsedDate.getTime())) {
            throw CustomException('تنسيق التاريخ غير صالح', 400);
        }
    }

    const balance = await Transaction.calculateBalance(
        userId,
        parsedDate
    );

    res.status(200).json({
        success: true,
        balance,
        asOfDate: parsedDate || new Date()
    });
});

/**
 * Get transaction summary
 * GET /api/transactions/summary
 */
const getSummary = asyncHandler(async (req, res) => {
    const {
        startDate,
        endDate,
        type,
        category,
        caseId
    } = req.query;

    const userId = req.userID;

    const filters = {};
    if (type) filters.type = type;
    if (category) filters.category = category;

    // Sanitize caseId
    if (caseId) filters.caseId = sanitizeObjectId(caseId);

    // Validate and parse dates
    if (startDate) {
        const parsedStartDate = new Date(startDate);
        if (isNaN(parsedStartDate.getTime())) {
            throw CustomException('تنسيق تاريخ البداية غير صالح', 400);
        }
        filters.startDate = parsedStartDate;
    }
    if (endDate) {
        const parsedEndDate = new Date(endDate);
        if (isNaN(parsedEndDate.getTime())) {
            throw CustomException('تنسيق تاريخ النهاية غير صالح', 400);
        }
        filters.endDate = parsedEndDate;
    }

    const summary = await Transaction.getSummary(userId, filters);

    res.status(200).json({
        success: true,
        summary
    });
});

/**
 * Get transactions by category
 * GET /api/transactions/by-category
 */
const getTransactionsByCategory = asyncHandler(async (req, res) => {
    const { startDate, endDate, type } = req.query;
    const userId = req.userID;
    const firmId = req.firmId || req.user?.firmId;

    const query = { userId, status: 'completed' };

    // SECURITY: Add firmId filter to prevent cross-firm data exposure
    if (firmId) {
        query.firmId = new mongoose.Types.ObjectId(firmId);
    }

    if (type) query.type = type;

    // Validate and parse dates
    if (startDate || endDate) {
        query.date = {};
        if (startDate) {
            const parsedStartDate = new Date(startDate);
            if (isNaN(parsedStartDate.getTime())) {
                throw CustomException('تنسيق تاريخ البداية غير صالح', 400);
            }
            query.date.$gte = parsedStartDate;
        }
        if (endDate) {
            const parsedEndDate = new Date(endDate);
            if (isNaN(parsedEndDate.getTime())) {
                throw CustomException('تنسيق تاريخ النهاية غير صالح', 400);
            }
            query.date.$lte = parsedEndDate;
        }
    }

    const transactions = await Transaction.aggregate([
        { $match: query },
        {
            $group: {
                _id: '$category',
                total: { $sum: '$amount' },
                count: { $sum: 1 },
                avgAmount: { $avg: '$amount' }
            }
        },
        { $sort: { total: -1 } }
    ]);

    // Ensure data is always an array (defensive check for frontend compatibility)
    res.status(200).json({
        success: true,
        data: Array.isArray(transactions) ? transactions : []
    });
});

/**
 * Cancel transaction
 * POST /api/transactions/:id/cancel
 */
const cancelTransaction = asyncHandler(async (req, res) => {
    const userId = req.userID;

    // IDOR protection - sanitize ID
    const transactionId = sanitizeObjectId(req.params.id);

    // Mass assignment protection
    const allowedFields = ['reason'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    const transaction = await Transaction.findOne({ _id: transactionId, ...req.firmQuery });

    if (!transaction) {
        throw CustomException('المعاملة غير موجودة', 404);
    }

    // Verify ownership
    if (transaction.userId.toString() !== userId) {
        throw CustomException('لا يمكنك الوصول إلى هذه المعاملة', 403);
    }

    if (transaction.status === 'cancelled') {
        throw CustomException('المعاملة ملغاة بالفعل', 400);
    }

    transaction.status = 'cancelled';
    if (sanitizedData.reason) {
        transaction.notes = transaction.notes
            ? `${transaction.notes}\nسبب الإلغاء: ${sanitizedData.reason}`
            : `سبب الإلغاء: ${sanitizedData.reason}`;
    }

    await transaction.save();

    res.status(200).json({
        success: true,
        message: 'تم إلغاء المعاملة بنجاح',
        transaction
    });
});

/**
 * Bulk delete transactions
 * DELETE /api/transactions/bulk
 */
const bulkDeleteTransactions = asyncHandler(async (req, res) => {
    const userId = req.userID;

    // Mass assignment protection
    const allowedFields = ['transactionIds'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    if (!sanitizedData.transactionIds || !Array.isArray(sanitizedData.transactionIds) || sanitizedData.transactionIds.length === 0) {
        throw CustomException('يجب تحديد المعاملات المراد حذفها', 400);
    }

    // Sanitize all transaction IDs
    const sanitizedIds = sanitizedData.transactionIds.map(id => sanitizeObjectId(id));

    // Use MongoDB transaction for bulk financial operation
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const result = await Transaction.deleteMany(
            {
                _id: { $in: sanitizedIds },
                userId
            },
            { session }
        );

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: `تم حذف ${result.deletedCount} معاملة بنجاح`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

module.exports = {
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
};
