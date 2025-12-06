const GeneralLedger = require('../models/generalLedger.model');
const Account = require('../models/account.model');
const asyncHandler = require('../utils/asyncHandler');
const { CustomException } = require('../utils');
const BillingActivity = require('../models/billingActivity.model');

// ═══════════════════════════════════════════════════════════════
// HELPER: Get firm filter for multi-tenancy
// ═══════════════════════════════════════════════════════════════
const getFirmFilter = (req) => {
    // Try firmId from firm middleware first
    if (req.firm && req.firm._id) {
        return { firmId: req.firm._id };
    }
    // Fallback to lawyerId for backwards compatibility
    if (req.user && req.user._id) {
        return { lawyerId: req.user._id };
    }
    return {};
};

// ═══════════════════════════════════════════════════════════════
// GET ALL GL ENTRIES WITH FILTERS
// GET /api/general-ledger/entries
// Query: accountId, startDate, endDate, caseId, clientId, lawyerId,
//        status, referenceModel, page, limit, sort
// ═══════════════════════════════════════════════════════════════
const getEntries = asyncHandler(async (req, res) => {
    const {
        accountId,
        startDate,
        endDate,
        caseId,
        clientId,
        lawyerId,
        status,
        referenceModel,
        page = 1,
        limit = 50,
        sort = '-transactionDate'
    } = req.query;

    // Build query with firm filter (CRITICAL for multi-tenancy)
    const firmFilter = getFirmFilter(req);
    const query = { ...firmFilter };

    // Account filter (either debit or credit)
    if (accountId) {
        query.$or = [
            { debitAccountId: accountId },
            { creditAccountId: accountId }
        ];
    }

    // Date range filter
    if (startDate || endDate) {
        query.transactionDate = {};
        if (startDate) query.transactionDate.$gte = new Date(startDate);
        if (endDate) query.transactionDate.$lte = new Date(endDate);
    }

    // Other filters
    if (caseId) query.caseId = caseId;
    if (clientId) query.clientId = clientId;
    if (lawyerId) query.lawyerId = lawyerId;
    if (status) query.status = status;
    if (referenceModel) query.referenceModel = referenceModel;

    // Default to showing only posted entries unless status specified
    if (!status) {
        query.status = 'posted';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Build sort object
    let sortObj = { transactionDate: -1, createdAt: -1 };
    if (sort) {
        const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
        const sortDir = sort.startsWith('-') ? -1 : 1;
        sortObj = { [sortField]: sortDir };
    }

    const [entries, total] = await Promise.all([
        GeneralLedger.find(query)
            .populate('debitAccountId', 'code name nameAr type')
            .populate('creditAccountId', 'code name nameAr type')
            .populate('caseId', 'caseNumber title')
            .populate('clientId', 'name email')
            .populate('lawyerId', 'name email')
            .populate('createdBy', 'name email')
            .sort(sortObj)
            .skip(skip)
            .limit(limitNum),
        GeneralLedger.countDocuments(query)
    ]);

    res.status(200).json({
        success: true,
        count: entries.length,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limitNum),
        data: entries
    });
});

// ═══════════════════════════════════════════════════════════════
// GET SINGLE GL ENTRY
// GET /api/general-ledger/:id
// ═══════════════════════════════════════════════════════════════
const getEntry = asyncHandler(async (req, res) => {
    const firmFilter = getFirmFilter(req);

    const entry = await GeneralLedger.findOne({
        _id: req.params.id,
        ...firmFilter
    })
        .populate('debitAccountId', 'code name nameAr type normalBalance')
        .populate('creditAccountId', 'code name nameAr type normalBalance')
        .populate('caseId', 'caseNumber title')
        .populate('clientId', 'name email')
        .populate('lawyerId', 'name email')
        .populate('createdBy', 'name email')
        .populate('postedBy', 'name email')
        .populate('voidedBy', 'name email')
        .populate('reversingEntryId');

    if (!entry) {
        throw new CustomException('General ledger entry not found', 404);
    }

    res.status(200).json({
        success: true,
        data: entry
    });
});

// ═══════════════════════════════════════════════════════════════
// VOID A GL ENTRY (Creates reversing entry)
// POST /api/general-ledger/:id/void
// Body: { reason: string }
// ═══════════════════════════════════════════════════════════════
const voidEntry = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
        throw new CustomException('Void reason is required', 400);
    }

    // Block departed users from financial operations
    if (req.user?.departed) {
        throw new CustomException('Departed users cannot void GL entries', 403);
    }

    const firmFilter = getFirmFilter(req);

    // Find entry with firm filter (CRITICAL for security)
    const entry = await GeneralLedger.findOne({
        _id: req.params.id,
        ...firmFilter
    });

    if (!entry) {
        throw new CustomException('General ledger entry not found', 404);
    }

    if (entry.status !== 'posted') {
        throw new CustomException('Only posted entries can be voided', 400);
    }

    const result = await GeneralLedger.voidTransaction(
        req.params.id,
        reason,
        req.user?._id
    );

    // Log activity
    if (BillingActivity) {
        try {
            await BillingActivity.create({
                firmId: req.firm?._id,
                userId: req.user?._id,
                action: 'GL_VOID',
                referenceModel: 'GeneralLedger',
                referenceId: req.params.id,
                details: {
                    entryNumber: entry.entryNumber,
                    reason,
                    reversingEntryId: result.reversingEntry._id
                }
            });
        } catch (err) {
            console.error('Failed to log GL void activity:', err);
        }
    }

    res.status(200).json({
        success: true,
        data: {
            voidedEntry: result.voidedEntry,
            reversingEntry: result.reversingEntry
        },
        message: 'Entry voided successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// GET ACCOUNT BALANCE
// GET /api/general-ledger/account-balance/:accountId
// Query: asOfDate, caseId
// ═══════════════════════════════════════════════════════════════
const getAccountBalance = asyncHandler(async (req, res) => {
    const { asOfDate, caseId } = req.query;

    const account = await Account.findById(req.params.accountId);
    if (!account) {
        throw new CustomException('Account not found', 404);
    }

    // Use firm-filtered balance calculation
    const firmFilter = getFirmFilter(req);
    const balance = await getAccountBalanceFiltered(
        req.params.accountId,
        asOfDate ? new Date(asOfDate) : null,
        caseId || null,
        firmFilter
    );

    res.status(200).json({
        success: true,
        data: balance
    });
});

// Helper: Get account balance with firm filter
async function getAccountBalanceFiltered(accountId, upToDate = null, caseId = null, firmFilter = {}) {
    const Account = require('../models/account.model');
    const account = await Account.findById(accountId);
    if (!account) {
        throw new Error('Account not found');
    }

    const matchStage = {
        status: 'posted',
        ...firmFilter
    };

    if (upToDate) {
        matchStage.transactionDate = { $lte: new Date(upToDate) };
    }

    if (caseId) {
        const mongoose = require('mongoose');
        matchStage.caseId = mongoose.Types.ObjectId.createFromHexString(caseId.toString());
    }

    // Aggregate debits
    const debitMatch = { ...matchStage, debitAccountId: account._id };
    const debitResult = await GeneralLedger.aggregate([
        { $match: debitMatch },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalDebits = debitResult[0]?.total || 0;

    // Aggregate credits
    const creditMatch = { ...matchStage, creditAccountId: account._id };
    const creditResult = await GeneralLedger.aggregate([
        { $match: creditMatch },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalCredits = creditResult[0]?.total || 0;

    // Calculate balance based on normal balance
    let balance;
    if (account.normalBalance === 'debit') {
        balance = totalDebits - totalCredits;
    } else {
        balance = totalCredits - totalDebits;
    }

    return {
        accountId: account._id,
        accountCode: account.code,
        accountName: account.name,
        accountNameAr: account.nameAr,
        normalBalance: account.normalBalance,
        totalDebits,
        totalCredits,
        balance,
        asOfDate: upToDate || new Date()
    };
}

// ═══════════════════════════════════════════════════════════════
// GET TRIAL BALANCE
// GET /api/general-ledger/trial-balance
// Query: asOfDate
// ═══════════════════════════════════════════════════════════════
const getTrialBalance = asyncHandler(async (req, res) => {
    const { asOfDate } = req.query;
    const firmFilter = getFirmFilter(req);

    const accounts = await Account.find({ isActive: true }).sort({ code: 1 });

    const balances = [];
    let totalDebits = 0;
    let totalCredits = 0;

    for (const account of accounts) {
        const result = await getAccountBalanceFiltered(
            account._id,
            asOfDate ? new Date(asOfDate) : null,
            null,
            firmFilter
        );

        // Convert balance to debit/credit columns
        let debit = 0;
        let credit = 0;

        if (account.normalBalance === 'debit') {
            if (result.balance >= 0) {
                debit = result.balance;
            } else {
                credit = Math.abs(result.balance);
            }
        } else {
            if (result.balance >= 0) {
                credit = result.balance;
            } else {
                debit = Math.abs(result.balance);
            }
        }

        // Only include accounts with non-zero balance
        if (debit !== 0 || credit !== 0) {
            balances.push({
                accountCode: account.code,
                accountName: account.name,
                accountNameAr: account.nameAr,
                accountType: account.type,
                debit,
                credit
            });

            totalDebits += debit;
            totalCredits += credit;
        }
    }

    res.status(200).json({
        success: true,
        data: {
            balances,
            totalDebits,
            totalCredits,
            isBalanced: totalDebits === totalCredits,
            asOfDate: asOfDate || new Date()
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET ENTRIES BY REFERENCE (Invoice, Payment, etc.)
// GET /api/general-ledger/reference/:model/:id
// ═══════════════════════════════════════════════════════════════
const getEntriesByReference = asyncHandler(async (req, res) => {
    const { model, id } = req.params;

    const validModels = ['Invoice', 'Payment', 'Bill', 'BillPayment', 'Expense', 'Retainer', 'JournalEntry', 'TrustTransaction', 'BankTransaction', 'Payroll'];
    if (!validModels.includes(model)) {
        throw new CustomException(`Invalid reference model. Valid models: ${validModels.join(', ')}`, 400);
    }

    const firmFilter = getFirmFilter(req);

    const entries = await GeneralLedger.find({
        referenceModel: model,
        referenceId: id,
        ...firmFilter
    })
        .populate('debitAccountId', 'code name nameAr')
        .populate('creditAccountId', 'code name nameAr')
        .sort({ transactionDate: -1 });

    res.status(200).json({
        success: true,
        count: entries.length,
        data: entries
    });
});

// ═══════════════════════════════════════════════════════════════
// GET GL SUMMARY BY ACCOUNT TYPE
// GET /api/general-ledger/summary
// Query: startDate, endDate, caseId
// ═══════════════════════════════════════════════════════════════
const getSummary = asyncHandler(async (req, res) => {
    const { startDate, endDate, caseId } = req.query;
    const firmFilter = getFirmFilter(req);

    const matchStage = {
        status: 'posted',
        ...firmFilter
    };

    if (startDate || endDate) {
        matchStage.transactionDate = {};
        if (startDate) matchStage.transactionDate.$gte = new Date(startDate);
        if (endDate) matchStage.transactionDate.$lte = new Date(endDate);
    }

    if (caseId) {
        const mongoose = require('mongoose');
        matchStage.caseId = mongoose.Types.ObjectId.createFromHexString(caseId);
    }

    // Get all accounts
    const accounts = await Account.find({ isActive: true });
    const accountMap = new Map(accounts.map(a => [a._id.toString(), a]));

    // Aggregate debits by account
    const debits = await GeneralLedger.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$debitAccountId',
                total: { $sum: '$amount' }
            }
        }
    ]);

    // Aggregate credits by account
    const credits = await GeneralLedger.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$creditAccountId',
                total: { $sum: '$amount' }
            }
        }
    ]);

    // Build summary by account type
    const summary = {
        Asset: { totalDebits: 0, totalCredits: 0, balance: 0 },
        Liability: { totalDebits: 0, totalCredits: 0, balance: 0 },
        Equity: { totalDebits: 0, totalCredits: 0, balance: 0 },
        Income: { totalDebits: 0, totalCredits: 0, balance: 0 },
        Expense: { totalDebits: 0, totalCredits: 0, balance: 0 }
    };

    // Process debits
    debits.forEach(d => {
        const account = accountMap.get(d._id?.toString());
        if (account && summary[account.type]) {
            summary[account.type].totalDebits += d.total;
        }
    });

    // Process credits
    credits.forEach(c => {
        const account = accountMap.get(c._id?.toString());
        if (account && summary[account.type]) {
            summary[account.type].totalCredits += c.total;
        }
    });

    // Calculate balances based on normal balance
    Object.keys(summary).forEach(type => {
        const normalBalance = ['Asset', 'Expense'].includes(type) ? 'debit' : 'credit';
        if (normalBalance === 'debit') {
            summary[type].balance = summary[type].totalDebits - summary[type].totalCredits;
        } else {
            summary[type].balance = summary[type].totalCredits - summary[type].totalDebits;
        }
    });

    res.status(200).json({
        success: true,
        data: summary,
        filters: { startDate, endDate, caseId }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET GL STATISTICS
// GET /api/general-ledger/stats
// Query: startDate, endDate
// ═══════════════════════════════════════════════════════════════
const getStats = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const firmFilter = getFirmFilter(req);

    const matchStage = {
        status: 'posted',
        ...firmFilter
    };

    if (startDate || endDate) {
        matchStage.transactionDate = {};
        if (startDate) matchStage.transactionDate.$gte = new Date(startDate);
        if (endDate) matchStage.transactionDate.$lte = new Date(endDate);
    }

    const stats = await GeneralLedger.aggregate([
        { $match: matchStage },
        {
            $facet: {
                totals: [
                    {
                        $group: {
                            _id: null,
                            totalEntries: { $sum: 1 },
                            totalAmount: { $sum: '$amount' }
                        }
                    }
                ],
                byReferenceModel: [
                    {
                        $group: {
                            _id: '$referenceModel',
                            count: { $sum: 1 },
                            total: { $sum: '$amount' }
                        }
                    },
                    {
                        $project: {
                            referenceModel: '$_id',
                            count: 1,
                            total: 1,
                            _id: 0
                        }
                    }
                ],
                byMonth: [
                    {
                        $group: {
                            _id: {
                                year: '$fiscalYear',
                                month: '$fiscalMonth'
                            },
                            count: { $sum: 1 },
                            total: { $sum: '$amount' }
                        }
                    },
                    { $sort: { '_id.year': -1, '_id.month': -1 } },
                    { $limit: 12 }
                ],
                voidedEntries: [
                    { $match: { status: 'void' } },
                    {
                        $group: {
                            _id: null,
                            count: { $sum: 1 },
                            total: { $sum: '$amount' }
                        }
                    }
                ]
            }
        }
    ]);

    const result = stats[0];

    res.status(200).json({
        success: true,
        data: {
            totalEntries: result.totals[0]?.totalEntries || 0,
            totalAmount: result.totals[0]?.totalAmount || 0,
            byReferenceModel: result.byReferenceModel,
            byMonth: result.byMonth.map(m => ({
                year: m._id.year,
                month: m._id.month,
                count: m.count,
                total: m.total
            })),
            voidedEntries: {
                count: result.voidedEntries[0]?.count || 0,
                total: result.voidedEntries[0]?.total || 0
            }
        },
        filters: { startDate, endDate }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET PROFIT & LOSS STATEMENT
// GET /api/general-ledger/profit-loss
// Query: startDate, endDate
// ═══════════════════════════════════════════════════════════════
const getProfitLoss = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const firmFilter = getFirmFilter(req);

    if (!startDate || !endDate) {
        throw new CustomException('Start date and end date are required', 400);
    }

    const matchStage = {
        status: 'posted',
        transactionDate: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        },
        ...firmFilter
    };

    // Get income accounts
    const incomeAccounts = await Account.find({ type: 'Income', isActive: true });
    const incomeAccountIds = incomeAccounts.map(a => a._id);

    // Get expense accounts
    const expenseAccounts = await Account.find({ type: 'Expense', isActive: true });
    const expenseAccountIds = expenseAccounts.map(a => a._id);

    // Calculate income (credits to income accounts)
    const incomeCredits = await GeneralLedger.aggregate([
        { $match: { ...matchStage, creditAccountId: { $in: incomeAccountIds } } },
        { $group: { _id: '$creditAccountId', total: { $sum: '$amount' } } }
    ]);

    const incomeDebits = await GeneralLedger.aggregate([
        { $match: { ...matchStage, debitAccountId: { $in: incomeAccountIds } } },
        { $group: { _id: '$debitAccountId', total: { $sum: '$amount' } } }
    ]);

    // Calculate expenses (debits to expense accounts)
    const expenseDebits = await GeneralLedger.aggregate([
        { $match: { ...matchStage, debitAccountId: { $in: expenseAccountIds } } },
        { $group: { _id: '$debitAccountId', total: { $sum: '$amount' } } }
    ]);

    const expenseCredits = await GeneralLedger.aggregate([
        { $match: { ...matchStage, creditAccountId: { $in: expenseAccountIds } } },
        { $group: { _id: '$creditAccountId', total: { $sum: '$amount' } } }
    ]);

    // Build income breakdown
    const incomeMap = new Map();
    incomeCredits.forEach(c => {
        const id = c._id.toString();
        incomeMap.set(id, (incomeMap.get(id) || 0) + c.total);
    });
    incomeDebits.forEach(d => {
        const id = d._id.toString();
        incomeMap.set(id, (incomeMap.get(id) || 0) - d.total);
    });

    const incomeBreakdown = [];
    let totalIncome = 0;
    for (const [accountId, amount] of incomeMap) {
        const account = incomeAccounts.find(a => a._id.toString() === accountId);
        if (account && amount !== 0) {
            incomeBreakdown.push({
                accountCode: account.code,
                accountName: account.name,
                accountNameAr: account.nameAr,
                amount
            });
            totalIncome += amount;
        }
    }

    // Build expense breakdown
    const expenseMap = new Map();
    expenseDebits.forEach(d => {
        const id = d._id.toString();
        expenseMap.set(id, (expenseMap.get(id) || 0) + d.total);
    });
    expenseCredits.forEach(c => {
        const id = c._id.toString();
        expenseMap.set(id, (expenseMap.get(id) || 0) - c.total);
    });

    const expenseBreakdown = [];
    let totalExpenses = 0;
    for (const [accountId, amount] of expenseMap) {
        const account = expenseAccounts.find(a => a._id.toString() === accountId);
        if (account && amount !== 0) {
            expenseBreakdown.push({
                accountCode: account.code,
                accountName: account.name,
                accountNameAr: account.nameAr,
                amount
            });
            totalExpenses += amount;
        }
    }

    const netProfitLoss = totalIncome - totalExpenses;

    res.status(200).json({
        success: true,
        data: {
            period: { startDate, endDate },
            income: {
                breakdown: incomeBreakdown.sort((a, b) => b.amount - a.amount),
                total: totalIncome
            },
            expenses: {
                breakdown: expenseBreakdown.sort((a, b) => b.amount - a.amount),
                total: totalExpenses
            },
            netProfitLoss,
            isProfitable: netProfitLoss > 0
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET BALANCE SHEET
// GET /api/general-ledger/balance-sheet
// Query: asOfDate
// ═══════════════════════════════════════════════════════════════
const getBalanceSheet = asyncHandler(async (req, res) => {
    const { asOfDate } = req.query;
    const firmFilter = getFirmFilter(req);

    const dateFilter = asOfDate ? new Date(asOfDate) : new Date();

    // Get all accounts grouped by type
    const accountTypes = ['Asset', 'Liability', 'Equity'];
    const result = {};

    for (const type of accountTypes) {
        const accounts = await Account.find({ type, isActive: true }).sort({ code: 1 });
        const breakdown = [];
        let typeTotal = 0;

        for (const account of accounts) {
            const balance = await getAccountBalanceFiltered(
                account._id,
                dateFilter,
                null,
                firmFilter
            );

            if (balance.balance !== 0) {
                breakdown.push({
                    accountCode: account.code,
                    accountName: account.name,
                    accountNameAr: account.nameAr,
                    subType: account.subType,
                    balance: balance.balance
                });
                typeTotal += balance.balance;
            }
        }

        result[type.toLowerCase()] = {
            breakdown: breakdown,
            total: typeTotal
        };
    }

    // Calculate retained earnings (Income - Expenses to date)
    const incomeAccounts = await Account.find({ type: 'Income', isActive: true });
    const expenseAccounts = await Account.find({ type: 'Expense', isActive: true });

    let retainedEarnings = 0;
    for (const account of incomeAccounts) {
        const balance = await getAccountBalanceFiltered(account._id, dateFilter, null, firmFilter);
        retainedEarnings += balance.balance;
    }
    for (const account of expenseAccounts) {
        const balance = await getAccountBalanceFiltered(account._id, dateFilter, null, firmFilter);
        retainedEarnings -= balance.balance;
    }

    result.equity.retainedEarnings = retainedEarnings;
    result.equity.total += retainedEarnings;

    // Balance check: Assets = Liabilities + Equity
    const totalAssets = result.asset.total;
    const totalLiabilitiesAndEquity = result.liability.total + result.equity.total;

    res.status(200).json({
        success: true,
        data: {
            asOfDate: dateFilter,
            assets: result.asset,
            liabilities: result.liability,
            equity: result.equity,
            totalAssets,
            totalLiabilitiesAndEquity,
            isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 1 // Allow for rounding
        }
    });
});

module.exports = {
    getEntries,
    getEntry,
    voidEntry,
    getAccountBalance,
    getTrialBalance,
    getEntriesByReference,
    getSummary,
    getStats,
    getProfitLoss,
    getBalanceSheet
};
