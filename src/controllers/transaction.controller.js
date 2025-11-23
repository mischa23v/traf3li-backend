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
        throw new CustomException('النوع والمبلغ مطلوبان', 400);
    }

    if (!['income', 'expense', 'transfer'].includes(type)) {
        throw new CustomException('نوع المعاملة غير صالح', 400);
    }

    if (amount <= 0) {
        throw new CustomException('المبلغ يجب أن يكون أكبر من صفر', 400);
    }

    // Create transaction
    const transaction = await Transaction.create({
        userId,
        type,
        amount,
        category,
        description,
        paymentMethod,
        invoiceId,
        expenseId,
        caseId,
        referenceNumber,
        date: date || new Date(),
        status: 'completed',
        notes
    });

    await transaction.populate([
        { path: 'invoiceId', select: 'invoiceNumber totalAmount' },
        { path: 'expenseId', select: 'description amount' },
        { path: 'caseId', select: 'caseNumber title' }
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
    if (caseId) query.caseId = caseId;
    if (invoiceId) query.invoiceId = invoiceId;
    if (expenseId) query.expenseId = expenseId;

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
        .populate('invoiceId', 'invoiceNumber totalAmount')
        .populate('expenseId', 'description amount')
        .populate('caseId', 'caseNumber title')
        .sort(sortOptions)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
        success: true,
        data: transactions,
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
        .populate('invoiceId', 'invoiceNumber totalAmount amountPaid status')
        .populate('expenseId', 'description amount category')
        .populate('caseId', 'caseNumber title status');

    if (!transaction) {
        throw new CustomException('المعاملة غير موجودة', 404);
    }

    if (transaction.userId.toString() !== userId) {
        throw new CustomException('لا يمكنك الوصول إلى هذه المعاملة', 403);
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
        throw new CustomException('المعاملة غير موجودة', 404);
    }

    if (transaction.userId.toString() !== userId) {
        throw new CustomException('لا يمكنك الوصول إلى هذه المعاملة', 403);
    }

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
            transaction[field] = req.body[field];
        }
    });

    await transaction.save();

    await transaction.populate([
        { path: 'invoiceId', select: 'invoiceNumber totalAmount' },
        { path: 'expenseId', select: 'description amount' },
        { path: 'caseId', select: 'caseNumber title' }
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
        throw new CustomException('المعاملة غير موجودة', 404);
    }

    if (transaction.userId.toString() !== userId) {
        throw new CustomException('لا يمكنك الوصول إلى هذه المعاملة', 403);
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

    res.status(200).json({
        success: true,
        data: transactions
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
        throw new CustomException('المعاملة غير موجودة', 404);
    }

    if (transaction.userId.toString() !== userId) {
        throw new CustomException('لا يمكنك الوصول إلى هذه المعاملة', 403);
    }

    if (transaction.status === 'cancelled') {
        throw new CustomException('المعاملة ملغاة بالفعل', 400);
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
        throw new CustomException('يجب تحديد المعاملات المراد حذفها', 400);
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
