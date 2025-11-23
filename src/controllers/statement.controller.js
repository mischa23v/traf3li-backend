const { Statement, Invoice, Expense, Transaction } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Generate statement
 * POST /api/statements/generate
 */
const generateStatement = asyncHandler(async (req, res) => {
    const {
        periodStart,
        periodEnd,
        type = 'custom',
        notes
    } = req.body;

    const userId = req.userID;

    // Validate required fields
    if (!periodStart || !periodEnd) {
        throw new CustomException('تاريخ البداية والنهاية مطلوبان', 400);
    }

    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    if (startDate >= endDate) {
        throw new CustomException('تاريخ البداية يجب أن يكون قبل تاريخ النهاية', 400);
    }

    // Fetch invoices
    const invoices = await Invoice.find({
        lawyerId: userId,
        issueDate: { $gte: startDate, $lte: endDate }
    });

    // Fetch expenses
    const expenses = await Expense.find({
        userId,
        date: { $gte: startDate, $lte: endDate }
    });

    // Fetch transactions
    const transactions = await Transaction.find({
        userId,
        date: { $gte: startDate, $lte: endDate },
        status: 'completed'
    });

    // Calculate summary
    const totalIncome = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netIncome = totalIncome - totalExpenses;

    const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
    const pendingInvoices = invoices.filter(inv => ['sent', 'partial'].includes(inv.status)).length;

    // Create statement
    const statement = await Statement.create({
        userId,
        periodStart: startDate,
        periodEnd: endDate,
        type,
        summary: {
            totalIncome,
            totalExpenses,
            netIncome,
            invoicesCount: invoices.length,
            paidInvoices,
            pendingInvoices,
            expensesCount: expenses.length
        },
        invoices: invoices.map(inv => inv._id),
        expenses: expenses.map(exp => exp._id),
        transactions: transactions.map(txn => txn._id),
        status: 'generated',
        generatedAt: new Date(),
        generatedBy: userId,
        notes
    });

    await statement.populate([
        { path: 'invoices', select: 'invoiceNumber totalAmount status' },
        { path: 'expenses', select: 'description amount category' },
        { path: 'transactions', select: 'transactionId type amount' }
    ]);

    res.status(201).json({
        success: true,
        message: 'تم إنشاء الكشف بنجاح',
        statement
    });
});

/**
 * Get statements
 * GET /api/statements
 */
const getStatements = asyncHandler(async (req, res) => {
    const {
        status,
        type,
        startDate,
        endDate,
        page = 1,
        limit = 20
    } = req.query;

    const userId = req.userID;
    const query = { userId };

    if (status) query.status = status;
    if (type) query.type = type;

    if (startDate || endDate) {
        query.periodStart = {};
        if (startDate) query.periodStart.$gte = new Date(startDate);
        if (endDate) query.periodStart.$lte = new Date(endDate);
    }

    const statements = await Statement.find(query)
        .select('-invoices -expenses -transactions')
        .sort({ periodStart: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Statement.countDocuments(query);

    res.status(200).json({
        success: true,
        data: statements,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single statement
 * GET /api/statements/:id
 */
const getStatement = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    const statement = await Statement.findById(id)
        .populate('invoices', 'invoiceNumber totalAmount amountPaid status issueDate')
        .populate('expenses', 'description amount category date')
        .populate('transactions', 'transactionId type amount date category')
        .populate('generatedBy', 'username');

    if (!statement) {
        throw new CustomException('الكشف غير موجود', 404);
    }

    if (statement.userId.toString() !== userId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا الكشف', 403);
    }

    res.status(200).json({
        success: true,
        data: statement
    });
});

/**
 * Delete statement
 * DELETE /api/statements/:id
 */
const deleteStatement = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    const statement = await Statement.findById(id);

    if (!statement) {
        throw new CustomException('الكشف غير موجود', 404);
    }

    if (statement.userId.toString() !== userId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا الكشف', 403);
    }

    await Statement.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: 'تم حذف الكشف بنجاح'
    });
});

/**
 * Send statement
 * POST /api/statements/:id/send
 */
const sendStatement = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { email } = req.body;
    const userId = req.userID;

    const statement = await Statement.findById(id);

    if (!statement) {
        throw new CustomException('الكشف غير موجود', 404);
    }

    if (statement.userId.toString() !== userId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا الكشف', 403);
    }

    // TODO: Generate PDF and send email
    statement.status = 'sent';
    await statement.save();

    res.status(200).json({
        success: true,
        message: `تم إرسال الكشف إلى ${email}`,
        statement
    });
});

module.exports = {
    generateStatement,
    getStatements,
    getStatement,
    deleteStatement,
    sendStatement
};
