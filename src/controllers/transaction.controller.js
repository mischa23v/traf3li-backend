const { Transaction, Invoice, Expense, Case } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Create transaction
 * POST /api/transactions
 */
const createTransaction = asyncHandler(async (req, res) => {
    const {
        type,
        amount,
        category,
        description,
        paymentMethod,
        invoiceId,
        expenseId,
        caseId,
        referenceNumber,
        date,
        notes
    } = req.body;

    const userId = req.userID;

    // Validate required fields
    if (!type || !amount) {
        throw CustomException('النوع والمبلغ مطلوبان', 400);
    }

    if (!['income', 'expense', 'transfer'].includes(type)) {
        throw CustomException('نوع المعاملة غير صالح', 400);
    }

    if (amount <= 0) {
        throw CustomException('المبلغ يجب أن يكون أكبر من صفر', 400);
    }

    // Create transaction (using schema field names: relatedInvoice, relatedExpense, relatedCase)
    const transaction = await Transaction.create({
        userId,
        type,
        amount,
        category,
        description,
        paymentMethod,
        relatedInvoice: invoiceId,
        relatedExpense: expenseId,
        relatedCase: caseId,
        reference: referenceNumber,
        date: date || new Date(),
        status: 'completed',
        notes
    });

    await transaction.populate([
        { path: 'relatedInvoice', select: 'invoiceNumber totalAmount' },
        { path: 'relatedExpense', select: 'description amount' },
        { path: 'relatedCase', select: 'caseNumber title' }
    ]);

    res.status(201).json({
        success: true,
        message: 'تم إنشاء المعاملة بنجاح',
        transaction
    });
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
    if (caseId) query.relatedCase = caseId;
    if (invoiceId) query.relatedInvoice = invoiceId;
    if (expenseId) query.relatedExpense = expenseId;

    // Date range
    if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
    }

    // Amount range
    if (minAmount || maxAmount) {
        query.amount = {};
        if (minAmount) query.amount.$gte = parseFloat(minAmount);
        if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
    }

    // Search
    if (search) {
        query.$or = [
            { description: { $regex: search, $options: 'i' } },
            { transactionId: { $regex: search, $options: 'i' } },
            { referenceNumber: { $regex: search, $options: 'i' } },
            { notes: { $regex: search, $options: 'i' } }
        ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const transactions = await Transaction.find(query)
        .populate('relatedInvoice', 'invoiceNumber totalAmount')
        .populate('relatedExpense', 'description amount')
        .populate('relatedCase', 'caseNumber title')
        .sort(sortOptions)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Transaction.countDocuments(query);

    // Ensure data is always an array (defensive check for frontend compatibility)
    // Flatten pagination fields to top level for frontend compatibility
    res.status(200).json({
        success: true,
        data: Array.isArray(transactions) ? transactions : [],
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
        // Keep pagination object for backwards compatibility
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single transaction
 * GET /api/transactions/:id
 */
const getTransaction = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    const transaction = await Transaction.findById(id)
        .populate('relatedInvoice', 'invoiceNumber totalAmount amountPaid status')
        .populate('relatedExpense', 'description amount category')
        .populate('relatedCase', 'caseNumber title status');

    if (!transaction) {
        throw CustomException('المعاملة غير موجودة', 404);
    }

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
    const { id } = req.params;
    const userId = req.userID;

    const transaction = await Transaction.findById(id);

    if (!transaction) {
        throw CustomException('المعاملة غير موجودة', 404);
    }

    if (transaction.userId.toString() !== userId) {
        throw CustomException('لا يمكنك الوصول إلى هذه المعاملة', 403);
    }

    // Map request body field names to schema field names
    const fieldMappings = {
        invoiceId: 'relatedInvoice',
        expenseId: 'relatedExpense',
        caseId: 'relatedCase',
        referenceNumber: 'reference'
    };

    const allowedUpdates = [
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

    allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
            // Use schema field name if there's a mapping, otherwise use the original field
            const schemaField = fieldMappings[field] || field;
            transaction[schemaField] = req.body[field];
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
    const { id } = req.params;
    const userId = req.userID;

    const transaction = await Transaction.findById(id);

    if (!transaction) {
        throw CustomException('المعاملة غير موجودة', 404);
    }

    if (transaction.userId.toString() !== userId) {
        throw CustomException('لا يمكنك الوصول إلى هذه المعاملة', 403);
    }

    await Transaction.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: 'تم حذف المعاملة بنجاح'
    });
});

/**
 * Get account balance
 * GET /api/transactions/balance
 */
const getBalance = asyncHandler(async (req, res) => {
    const { upToDate } = req.query;
    const userId = req.userID;

    const balance = await Transaction.calculateBalance(
        userId,
        upToDate ? new Date(upToDate) : undefined
    );

    res.status(200).json({
        success: true,
        balance,
        asOfDate: upToDate ? new Date(upToDate) : new Date()
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
    if (caseId) filters.caseId = caseId;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

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

    const query = { userId, status: 'completed' };

    if (type) query.type = type;

    if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
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
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.userID;

    const transaction = await Transaction.findById(id);

    if (!transaction) {
        throw CustomException('المعاملة غير موجودة', 404);
    }

    if (transaction.userId.toString() !== userId) {
        throw CustomException('لا يمكنك الوصول إلى هذه المعاملة', 403);
    }

    if (transaction.status === 'cancelled') {
        throw CustomException('المعاملة ملغاة بالفعل', 400);
    }

    transaction.status = 'cancelled';
    if (reason) {
        transaction.notes = transaction.notes
            ? `${transaction.notes}\nسبب الإلغاء: ${reason}`
            : `سبب الإلغاء: ${reason}`;
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
    const { transactionIds } = req.body;
    const userId = req.userID;

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
        throw CustomException('يجب تحديد المعاملات المراد حذفها', 400);
    }

    const result = await Transaction.deleteMany({
        _id: { $in: transactionIds },
        userId
    });

    res.status(200).json({
        success: true,
        message: `تم حذف ${result.deletedCount} معاملة بنجاح`,
        deletedCount: result.deletedCount
    });
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
