const { Statement, Invoice, Expense, Payment, Transaction, Client, Case } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

/**
 * Generate client statement
 * POST /api/statements
 */
const generateStatement = asyncHandler(async (req, res) => {
    // Mass assignment protection - only allow specific fields
    const allowedFields = pickAllowedFields(req.body, [
        'clientId',
        'caseId',
        'periodStart',
        'periodEnd',
        'period',
        'notes'
    ]);

    const {
        clientId,
        caseId,
        periodStart,
        periodEnd,
        period = 'custom',
        notes
    } = allowedFields;

    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Validate required fields
    if (!clientId) {
        throw CustomException('Client ID is required', 400);
    }

    // Sanitize and validate ObjectIds
    const sanitizedClientId = sanitizeObjectId(clientId);
    if (!sanitizedClientId) {
        throw CustomException('Invalid client ID format', 400);
    }

    let sanitizedCaseId = null;
    if (caseId) {
        sanitizedCaseId = sanitizeObjectId(caseId);
        if (!sanitizedCaseId) {
            throw CustomException('Invalid case ID format', 400);
        }
    }

    if (!periodStart || !periodEnd) {
        throw CustomException('Period start and end dates are required', 400);
    }

    // Validate period type
    const validPeriods = ['custom', 'monthly', 'quarterly', 'yearly'];
    if (period && !validPeriods.includes(period)) {
        throw CustomException('Invalid period type. Must be one of: custom, monthly, quarterly, yearly', 400);
    }

    // Validate and parse dates
    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw CustomException('Invalid date format for period start or end', 400);
    }

    if (startDate >= endDate) {
        throw CustomException('Period start must be before period end', 400);
    }

    // IDOR Protection: Verify client belongs to the lawyer's firm
    const client = await Client.findById(sanitizedClientId);
    if (!client) {
        throw CustomException('Client not found', 404);
    }

    // Verify client belongs to the lawyer's firm
    if (firmId && client.firmId && client.firmId.toString() !== firmId.toString()) {
        throw CustomException('You do not have access to this client', 403);
    }

    // Verify client belongs to the lawyer
    if (client.lawyerId && client.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this client', 403);
    }

    // IDOR Protection: Verify case belongs to the lawyer's firm (if caseId provided)
    if (sanitizedCaseId) {
        const caseRecord = await Case.findById(sanitizedCaseId);
        if (!caseRecord) {
            throw CustomException('Case not found', 404);
        }

        // Verify case belongs to the lawyer's firm
        if (firmId && caseRecord.firmId && caseRecord.firmId.toString() !== firmId.toString()) {
            throw CustomException('You do not have access to this case', 403);
        }

        // Verify case belongs to the lawyer
        if (caseRecord.lawyerId && caseRecord.lawyerId.toString() !== lawyerId) {
            throw CustomException('You do not have access to this case', 403);
        }

        // Verify case belongs to the client
        if (caseRecord.clientId && caseRecord.clientId.toString() !== sanitizedClientId.toString()) {
            throw CustomException('Case does not belong to the specified client', 400);
        }
    }

    // Build query for client data
    const clientQuery = { clientId: sanitizedClientId, lawyerId };
    if (sanitizedCaseId) clientQuery.caseId = sanitizedCaseId;

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

    // Validate financial amounts helper function
    const validateAmount = (amount, fieldName) => {
        const num = Number(amount);
        if (isNaN(num)) {
            throw CustomException(`Invalid ${fieldName}: must be a valid number`, 400);
        }
        if (num < 0) {
            throw CustomException(`Invalid ${fieldName}: cannot be negative`, 400);
        }
        if (!isFinite(num)) {
            throw CustomException(`Invalid ${fieldName}: must be a finite number`, 400);
        }
        return num;
    };

    // Calculate summary with financial validation
    const totalCharges = invoices.reduce((sum, inv) => {
        const amount = validateAmount(inv.totalAmount || 0, 'invoice amount');
        return sum + amount;
    }, 0) + expenses.reduce((sum, exp) => {
        const amount = validateAmount(exp.amount || 0, 'expense amount');
        return sum + amount;
    }, 0);

    const totalPayments = payments.reduce((sum, pmt) => {
        const amount = validateAmount(pmt.amount || 0, 'payment amount');
        return sum + amount;
    }, 0);

    const closingBalance = totalCharges - totalPayments;

    // Validate final calculated amounts
    validateAmount(totalCharges, 'total charges');
    validateAmount(totalPayments, 'total payments');

    const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
    const pendingInvoices = invoices.filter(inv => ['sent', 'partial'].includes(inv.status)).length;

    const totalExpensesAmount = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const netIncome = totalPayments - totalExpensesAmount;

    // Validate summary amounts
    validateAmount(totalExpensesAmount, 'total expenses');
    if (!isFinite(netIncome)) {
        throw CustomException('Invalid net income calculation', 400);
    }

    // Create statement with sanitized and validated data
    const statement = await Statement.create({
        clientId: sanitizedClientId,
        lawyerId,
        caseId: sanitizedCaseId,
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
            totalExpenses: totalExpensesAmount,
            netIncome,
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

    // Validate and sanitize ObjectIds in query parameters
    if (clientId) {
        const sanitizedClientId = sanitizeObjectId(clientId);
        if (!sanitizedClientId) {
            throw CustomException('Invalid client ID format', 400);
        }
        query.clientId = sanitizedClientId;
    }

    if (caseId) {
        const sanitizedCaseId = sanitizeObjectId(caseId);
        if (!sanitizedCaseId) {
            throw CustomException('Invalid case ID format', 400);
        }
        query.caseId = sanitizedCaseId;
    }

    // Validate status
    if (status) {
        const validStatuses = ['generated', 'sent', 'paid', 'overdue', 'cancelled'];
        if (!validStatuses.includes(status)) {
            throw CustomException('Invalid status value', 400);
        }
        query.status = status;
    }

    // Validate period
    if (period) {
        const validPeriods = ['custom', 'monthly', 'quarterly', 'yearly'];
        if (!validPeriods.includes(period)) {
            throw CustomException('Invalid period value', 400);
        }
        query.period = period;
    }

    // Validate dates if provided
    if (startDate || endDate) {
        query.periodStart = {};
        if (startDate) {
            const parsedStartDate = new Date(startDate);
            if (isNaN(parsedStartDate.getTime())) {
                throw CustomException('Invalid start date format', 400);
            }
            query.periodStart.$gte = parsedStartDate;
        }
        if (endDate) {
            const parsedEndDate = new Date(endDate);
            if (isNaN(parsedEndDate.getTime())) {
                throw CustomException('Invalid end date format', 400);
            }
            query.periodStart.$lte = parsedEndDate;
        }
    }

    // Validate pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (isNaN(pageNum) || pageNum < 1) {
        throw CustomException('Invalid page number', 400);
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        throw CustomException('Invalid limit value (must be between 1 and 100)', 400);
    }

    const statements = await Statement.find(query)
        .populate('clientId', 'firstName lastName username email')
        .populate('caseId', 'title caseNumber')
        .select('-items -invoices -expenses -payments -transactions')
        .sort({ periodStart: -1, createdAt: -1 })
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum);

    const total = await Statement.countDocuments(query);

    res.status(200).json({
        success: true,
        data: statements,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
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

    // Validate and sanitize statement ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid statement ID format', 400);
    }

    const statement = await Statement.findById(sanitizedId)
        .populate('clientId', 'firstName lastName username email phone')
        .populate('caseId', 'title caseNumber category')
        .populate('invoices', 'invoiceNumber totalAmount amountPaid status issueDate')
        .populate('payments', 'paymentNumber amount paymentMethod paymentDate')
        .populate('expenses', 'description amount category date')
        .populate('transactions', 'transactionId type amount date category')
        .populate('generatedBy', 'firstName lastName username');

    if (!statement) {
        throw CustomException('Statement not found', 404);
    }

    if (statement.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this statement', 403);
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

    // Validate and sanitize statement ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid statement ID format', 400);
    }

    const statement = await Statement.findById(sanitizedId)
        .populate('clientId', 'firstName lastName username email phone address')
        .populate('caseId', 'title caseNumber')
        .populate('lawyerId', 'firstName lastName username email firmName');

    if (!statement) {
        throw CustomException('Statement not found', 404);
    }

    if (statement.lawyerId._id.toString() !== lawyerId) {
        throw CustomException('You do not have access to this statement', 403);
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

    // Validate and sanitize statement ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid statement ID format', 400);
    }

    const statement = await Statement.findById(sanitizedId);

    if (!statement) {
        throw CustomException('Statement not found', 404);
    }

    if (statement.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this statement', 403);
    }

    await Statement.findByIdAndDelete(sanitizedId);

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
    const lawyerId = req.userID;

    // Mass assignment protection - only allow email field
    const allowedFields = pickAllowedFields(req.body, ['email']);
    const { email } = allowedFields;

    // Validate statement ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid statement ID format', 400);
    }

    const statement = await Statement.findById(sanitizedId)
        .populate('clientId', 'firstName lastName email');

    if (!statement) {
        throw CustomException('Statement not found', 404);
    }

    if (statement.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this statement', 403);
    }

    // Validate email if provided
    const recipientEmail = email || statement.clientId.email;
    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw CustomException('Invalid email format', 400);
        }
    }

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
