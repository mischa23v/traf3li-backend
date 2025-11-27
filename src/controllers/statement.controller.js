const { Statement, Invoice, Expense, Payment, Transaction } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Generate client statement
 * POST /api/statements
 */
const generateStatement = asyncHandler(async (req, res) => {
    const {
        clientId,
        caseId,
        periodStart,
        periodEnd,
        period = 'custom',
        notes
    } = req.body;

    const lawyerId = req.userID;

    // Validate required fields
    if (!clientId) {
        throw new CustomException('Client ID is required', 400);
    }

    if (!periodStart || !periodEnd) {
        throw new CustomException('Period start and end dates are required', 400);
    }

    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    if (startDate >= endDate) {
        throw new CustomException('Period start must be before period end', 400);
    }

    // Build query for client data
    const clientQuery = { clientId, lawyerId };
    if (caseId) clientQuery.caseId = caseId;

    // Fetch invoices for the client in the period
    const invoices = await Invoice.find({
        ...clientQuery,
        issueDate: { $gte: startDate, $lte: endDate }
    }).sort({ issueDate: 1 });

    // Fetch payments for the client in the period
    const payments = await Payment.find({
        ...clientQuery,
        paymentDate: { $gte: startDate, $lte: endDate },
        status: 'completed'
    }).sort({ paymentDate: 1 });

    // Fetch expenses for the client in the period (billable)
    const expenses = await Expense.find({
        ...clientQuery,
        lawyerId,
        date: { $gte: startDate, $lte: endDate },
        isBillable: true
    }).sort({ date: 1 });

    // Build items array with running balance
    const items = [];
    let runningBalance = 0;

    // Add invoices as charges
    for (const inv of invoices) {
        runningBalance += inv.totalAmount || 0;
        items.push({
            itemType: 'invoice',
            referenceId: inv._id,
            referenceModel: 'Invoice',
            referenceNumber: inv.invoiceNumber,
            date: inv.issueDate,
            description: `Invoice ${inv.invoiceNumber}`,
            amount: inv.totalAmount || 0,
            balance: runningBalance
        });
    }

    // Add payments as credits
    for (const pmt of payments) {
        runningBalance -= pmt.amount || 0;
        items.push({
            itemType: 'payment',
            referenceId: pmt._id,
            referenceModel: 'Payment',
            referenceNumber: pmt.paymentNumber,
            date: pmt.paymentDate,
            description: `Payment received - ${pmt.paymentMethod}`,
            amount: -(pmt.amount || 0),
            balance: runningBalance
        });
    }

    // Add billable expenses
    for (const exp of expenses) {
        runningBalance += exp.amount || 0;
        items.push({
            itemType: 'expense',
            referenceId: exp._id,
            referenceModel: 'Expense',
            referenceNumber: exp.expenseId,
            date: exp.date,
            description: `Expense: ${exp.description}`,
            amount: exp.amount || 0,
            balance: runningBalance
        });
    }

    // Sort items by date
    items.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Recalculate running balance after sorting
    let balance = 0;
    for (const item of items) {
        balance += item.amount;
        item.balance = balance;
    }

    // Calculate summary
    const totalCharges = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0) +
                         expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const totalPayments = payments.reduce((sum, pmt) => sum + (pmt.amount || 0), 0);
    const closingBalance = totalCharges - totalPayments;

    const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
    const pendingInvoices = invoices.filter(inv => ['sent', 'partial'].includes(inv.status)).length;

    // Create statement
    const statement = await Statement.create({
        clientId,
        lawyerId,
        caseId,
        periodStart: startDate,
        periodEnd: endDate,
        period,
        items,
        summary: {
            openingBalance: 0,
            totalCharges,
            totalPayments,
            totalAdjustments: 0,
            closingBalance,
            totalIncome: totalPayments,
            totalExpenses: expenses.reduce((sum, exp) => sum + exp.amount, 0),
            netIncome: totalPayments - expenses.reduce((sum, exp) => sum + exp.amount, 0),
            invoicesCount: invoices.length,
            paidInvoices,
            pendingInvoices,
            expensesCount: expenses.length
        },
        invoices: invoices.map(inv => inv._id),
        expenses: expenses.map(exp => exp._id),
        payments: payments.map(pmt => pmt._id),
        status: 'generated',
        generatedAt: new Date(),
        generatedBy: lawyerId,
        notes
    });

    await statement.populate([
        { path: 'clientId', select: 'firstName lastName username email' },
        { path: 'caseId', select: 'title caseNumber' },
        { path: 'invoices', select: 'invoiceNumber totalAmount status' },
        { path: 'payments', select: 'paymentNumber amount paymentDate' },
        { path: 'expenses', select: 'description amount category' }
    ]);

    res.status(201).json({
        success: true,
        message: 'Statement generated successfully',
        statement
    });
});

/**
 * Get statements
 * GET /api/statements
 */
const getStatements = asyncHandler(async (req, res) => {
    const {
        clientId,
        caseId,
        status,
        period,
        startDate,
        endDate,
        page = 1,
        limit = 20
    } = req.query;

    const lawyerId = req.userID;
    const query = { lawyerId };

    if (clientId) query.clientId = clientId;
    if (caseId) query.caseId = caseId;
    if (status) query.status = status;
    if (period) query.period = period;

    if (startDate || endDate) {
        query.periodStart = {};
        if (startDate) query.periodStart.$gte = new Date(startDate);
        if (endDate) query.periodStart.$lte = new Date(endDate);
    }

    const statements = await Statement.find(query)
        .populate('clientId', 'firstName lastName username email')
        .populate('caseId', 'title caseNumber')
        .select('-items -invoices -expenses -payments -transactions')
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
    const lawyerId = req.userID;

    const statement = await Statement.findById(id)
        .populate('clientId', 'firstName lastName username email phone')
        .populate('caseId', 'title caseNumber category')
        .populate('invoices', 'invoiceNumber totalAmount amountPaid status issueDate')
        .populate('payments', 'paymentNumber amount paymentMethod paymentDate')
        .populate('expenses', 'description amount category date')
        .populate('transactions', 'transactionId type amount date category')
        .populate('generatedBy', 'firstName lastName username');

    if (!statement) {
        throw new CustomException('Statement not found', 404);
    }

    if (statement.lawyerId.toString() !== lawyerId) {
        throw new CustomException('You do not have access to this statement', 403);
    }

    res.status(200).json({
        success: true,
        data: statement
    });
});

/**
 * Download statement as PDF
 * GET /api/statements/:id/download
 */
const downloadStatement = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const statement = await Statement.findById(id)
        .populate('clientId', 'firstName lastName username email phone address')
        .populate('caseId', 'title caseNumber')
        .populate('lawyerId', 'firstName lastName username email firmName');

    if (!statement) {
        throw new CustomException('Statement not found', 404);
    }

    if (statement.lawyerId._id.toString() !== lawyerId) {
        throw new CustomException('You do not have access to this statement', 403);
    }

    // If PDF already exists, return URL
    if (statement.pdfUrl) {
        return res.status(200).json({
            success: true,
            downloadUrl: statement.pdfUrl,
            statement: {
                _id: statement._id,
                statementNumber: statement.statementNumber,
                clientName: `${statement.clientId.firstName} ${statement.clientId.lastName}`,
                periodStart: statement.periodStart,
                periodEnd: statement.periodEnd,
                summary: statement.summary
            }
        });
    }

    // Return statement data for client-side PDF generation
    res.status(200).json({
        success: true,
        message: 'Statement data for PDF generation',
        statement: {
            _id: statement._id,
            statementNumber: statement.statementNumber,
            client: statement.clientId,
            lawyer: statement.lawyerId,
            case: statement.caseId,
            periodStart: statement.periodStart,
            periodEnd: statement.periodEnd,
            period: statement.period,
            items: statement.items,
            summary: statement.summary,
            generatedAt: statement.generatedAt,
            notes: statement.notes
        }
    });
});

/**
 * Delete statement
 * DELETE /api/statements/:id
 */
const deleteStatement = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const statement = await Statement.findById(id);

    if (!statement) {
        throw new CustomException('Statement not found', 404);
    }

    if (statement.lawyerId.toString() !== lawyerId) {
        throw new CustomException('You do not have access to this statement', 403);
    }

    await Statement.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: 'Statement deleted successfully'
    });
});

/**
 * Send statement
 * POST /api/statements/:id/send
 */
const sendStatement = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { email } = req.body;
    const lawyerId = req.userID;

    const statement = await Statement.findById(id)
        .populate('clientId', 'firstName lastName email');

    if (!statement) {
        throw new CustomException('Statement not found', 404);
    }

    if (statement.lawyerId.toString() !== lawyerId) {
        throw new CustomException('You do not have access to this statement', 403);
    }

    const recipientEmail = email || statement.clientId.email;

    // TODO: Generate PDF and send email
    statement.status = 'sent';
    await statement.save();

    res.status(200).json({
        success: true,
        message: `Statement sent to ${recipientEmail}`,
        statement
    });
});

module.exports = {
    generateStatement,
    getStatements,
    getStatement,
    downloadStatement,
    deleteStatement,
    sendStatement
};
