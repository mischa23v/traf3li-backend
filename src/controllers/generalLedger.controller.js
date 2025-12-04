const GeneralLedger = require('../models/generalLedger.model');
const Account = require('../models/account.model');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get all GL entries with filters
 * GET /api/general-ledger
 * Query params: accountId, startDate, endDate, caseId, status, page, limit, referenceModel
 */
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
        limit = 50
    } = req.query;

    const query = {};

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

    const [entries, total] = await Promise.all([
        GeneralLedger.find(query)
            .populate('debitAccountId', 'code name')
            .populate('creditAccountId', 'code name')
            .populate('caseId', 'caseNumber title')
            .populate('clientId', 'name email')
            .populate('createdBy', 'name email')
            .sort({ transactionDate: -1, createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        GeneralLedger.countDocuments(query)
    ]);

    res.status(200).json({
        success: true,
        count: entries.length,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        data: entries
    });
});

/**
 * Get single GL entry
 * GET /api/general-ledger/:id
 */
const getEntry = asyncHandler(async (req, res) => {
    const entry = await GeneralLedger.findById(req.params.id)
        .populate('debitAccountId', 'code name type')
        .populate('creditAccountId', 'code name type')
        .populate('caseId', 'caseNumber title')
        .populate('clientId', 'name email')
        .populate('lawyerId', 'name email')
        .populate('createdBy', 'name email')
        .populate('postedBy', 'name email')
        .populate('voidedBy', 'name email')
        .populate('reversingEntryId');

    if (!entry) {
        return res.status(404).json({
            success: false,
            error: 'General ledger entry not found'
        });
    }

    res.status(200).json({
        success: true,
        data: entry
    });
});

/**
 * Void a GL entry (creates reversing entry)
 * POST /api/general-ledger/void/:id
 */
const voidEntry = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    if (!reason) {
        return res.status(400).json({
            success: false,
            error: 'Void reason is required'
        });
    }

    const entry = await GeneralLedger.findById(req.params.id);

    if (!entry) {
        return res.status(404).json({
            success: false,
            error: 'General ledger entry not found'
        });
    }

    if (entry.status !== 'posted') {
        return res.status(400).json({
            success: false,
            error: 'Only posted entries can be voided'
        });
    }

    const result = await GeneralLedger.voidTransaction(
        req.params.id,
        reason,
        req.user?._id
    );

    res.status(200).json({
        success: true,
        data: {
            voidedEntry: result.voidedEntry,
            reversingEntry: result.reversingEntry
        },
        message: 'Entry voided successfully'
    });
});

/**
 * Get account balance
 * GET /api/general-ledger/account-balance/:accountId
 * Query params: asOfDate, caseId
 */
const getAccountBalance = asyncHandler(async (req, res) => {
    const { asOfDate, caseId } = req.query;

    const account = await Account.findById(req.params.accountId);
    if (!account) {
        return res.status(404).json({
            success: false,
            error: 'Account not found'
        });
    }

    const balance = await GeneralLedger.getAccountBalance(
        req.params.accountId,
        asOfDate ? new Date(asOfDate) : null,
        caseId || null
    );

    res.status(200).json({
        success: true,
        data: balance
    });
});

/**
 * Get trial balance
 * GET /api/general-ledger/trial-balance
 * Query params: asOfDate
 */
const getTrialBalance = asyncHandler(async (req, res) => {
    const { asOfDate } = req.query;

    const trialBalance = await GeneralLedger.getTrialBalance(
        asOfDate ? new Date(asOfDate) : null
    );

    res.status(200).json({
        success: true,
        data: trialBalance
    });
});

/**
 * Get entries for a specific reference (invoice, payment, etc.)
 * GET /api/general-ledger/reference/:model/:id
 */
const getEntriesByReference = asyncHandler(async (req, res) => {
    const { model, id } = req.params;

    const validModels = ['Invoice', 'Payment', 'Bill', 'BillPayment', 'Expense', 'Retainer', 'JournalEntry'];
    if (!validModels.includes(model)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid reference model'
        });
    }

    const entries = await GeneralLedger.find({
        referenceModel: model,
        referenceId: id
    })
        .populate('debitAccountId', 'code name')
        .populate('creditAccountId', 'code name')
        .sort({ transactionDate: -1 });

    res.status(200).json({
        success: true,
        count: entries.length,
        data: entries
    });
});

/**
 * Get GL summary by account type
 * GET /api/general-ledger/summary
 * Query params: startDate, endDate, caseId
 */
const getSummary = asyncHandler(async (req, res) => {
    const { startDate, endDate, caseId } = req.query;

    const matchStage = { status: 'posted' };

    if (startDate || endDate) {
        matchStage.transactionDate = {};
        if (startDate) matchStage.transactionDate.$gte = new Date(startDate);
        if (endDate) matchStage.transactionDate.$lte = new Date(endDate);
    }

    if (caseId) {
        matchStage.caseId = require('mongoose').Types.ObjectId.createFromHexString(caseId);
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
        const account = accountMap.get(d._id.toString());
        if (account && summary[account.type]) {
            summary[account.type].totalDebits += d.total;
        }
    });

    // Process credits
    credits.forEach(c => {
        const account = accountMap.get(c._id.toString());
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

module.exports = {
    getEntries,
    getEntry,
    voidEntry,
    getAccountBalance,
    getTrialBalance,
    getEntriesByReference,
    getSummary
};
