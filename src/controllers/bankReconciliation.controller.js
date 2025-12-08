const { BankReconciliation, BankAccount, BillingActivity } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const bankReconciliationService = require('../services/bankReconciliation.service');
const currencyService = require('../services/currency.service');
const BankTransaction = require('../models/bankTransaction.model');
const BankTransactionMatch = require('../models/bankTransactionMatch.model');
const BankMatchRule = require('../models/bankMatchRule.model');
const BankFeed = require('../models/bankFeed.model');
const ExchangeRate = require('../models/exchangeRate.model');

// Start new reconciliation
const createReconciliation = asyncHandler(async (req, res) => {
    const { accountId, endDate, statementBalance } = req.body;
    const lawyerId = req.userID;

    if (!accountId) {
        throw CustomException('Account ID is required', 400);
    }

    if (!endDate) {
        throw CustomException('End date is required', 400);
    }

    if (statementBalance === undefined || statementBalance === null) {
        throw CustomException('Statement balance is required', 400);
    }

    // Validate account exists and belongs to user
    const account = await BankAccount.findById(accountId);
    if (!account || account.lawyerId.toString() !== lawyerId) {
        throw CustomException('Account not found or access denied', 404);
    }

    // Check for existing in-progress reconciliation
    const existingReconciliation = await BankReconciliation.findOne({
        accountId,
        status: 'in_progress'
    });

    if (existingReconciliation) {
        throw CustomException('There is already an in-progress reconciliation for this account', 400);
    }

    const reconciliation = await BankReconciliation.startReconciliation({
        accountId,
        endDate,
        statementBalance,
        lawyerId,
        userId: lawyerId
    });

    const populatedReconciliation = await BankReconciliation.findById(reconciliation._id)
        .populate('accountId', 'name bankName accountNumber');

    await BillingActivity.logActivity({
        activityType: 'bank_reconciliation_started',
        userId: lawyerId,
        relatedModel: 'BankReconciliation',
        relatedId: reconciliation._id,
        description: `Reconciliation ${reconciliation.reconciliationNumber} started for ${account.name}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    return res.status(201).json({
        success: true,
        message: 'Reconciliation started successfully',
        reconciliation: populatedReconciliation
    });
});

// Get reconciliations
const getReconciliations = asyncHandler(async (req, res) => {
    const { accountId, status, page = 1, limit = 20 } = req.query;
    const lawyerId = req.userID;

    const filters = { lawyerId };

    if (accountId) filters.accountId = accountId;
    if (status) filters.status = status;

    const reconciliations = await BankReconciliation.find(filters)
        .populate('accountId', 'name bankName accountNumber')
        .populate('startedBy', 'firstName lastName')
        .populate('completedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await BankReconciliation.countDocuments(filters);

    return res.json({
        success: true,
        reconciliations,
        total
    });
});

// Get single reconciliation
const getReconciliation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const reconciliation = await BankReconciliation.findById(id)
        .populate('accountId', 'name bankName accountNumber balance')
        .populate('startedBy', 'firstName lastName')
        .populate('completedBy', 'firstName lastName')
        .populate('transactions.transactionId')
        .populate('transactions.clearedBy', 'firstName lastName');

    if (!reconciliation) {
        throw CustomException('Reconciliation not found', 404);
    }

    if (reconciliation.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this reconciliation', 403);
    }

    return res.json({
        success: true,
        reconciliation
    });
});

// Clear a transaction in reconciliation
const clearTransaction = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { transactionId } = req.body;
    const lawyerId = req.userID;

    if (!transactionId) {
        throw CustomException('Transaction ID is required', 400);
    }

    const reconciliation = await BankReconciliation.findById(id);

    if (!reconciliation) {
        throw CustomException('Reconciliation not found', 404);
    }

    if (reconciliation.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this reconciliation', 403);
    }

    if (reconciliation.status !== 'in_progress') {
        throw CustomException('Cannot modify a reconciliation that is not in progress', 400);
    }

    reconciliation.clearTransaction(transactionId, lawyerId);
    await reconciliation.save();

    return res.json({
        success: true,
        message: 'Transaction cleared',
        reconciliation: {
            _id: reconciliation._id,
            closingBalance: reconciliation.closingBalance,
            difference: reconciliation.difference,
            clearedCredits: reconciliation.clearedCredits,
            clearedDebits: reconciliation.clearedDebits
        }
    });
});

// Unclear a transaction in reconciliation
const unclearTransaction = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { transactionId } = req.body;
    const lawyerId = req.userID;

    if (!transactionId) {
        throw CustomException('Transaction ID is required', 400);
    }

    const reconciliation = await BankReconciliation.findById(id);

    if (!reconciliation) {
        throw CustomException('Reconciliation not found', 404);
    }

    if (reconciliation.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this reconciliation', 403);
    }

    if (reconciliation.status !== 'in_progress') {
        throw CustomException('Cannot modify a reconciliation that is not in progress', 400);
    }

    reconciliation.unclearTransaction(transactionId);
    await reconciliation.save();

    return res.json({
        success: true,
        message: 'Transaction uncleared',
        reconciliation: {
            _id: reconciliation._id,
            closingBalance: reconciliation.closingBalance,
            difference: reconciliation.difference,
            clearedCredits: reconciliation.clearedCredits,
            clearedDebits: reconciliation.clearedDebits
        }
    });
});

// Complete reconciliation
const completeReconciliation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const reconciliation = await BankReconciliation.findById(id);

    if (!reconciliation) {
        throw CustomException('Reconciliation not found', 404);
    }

    if (reconciliation.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this reconciliation', 403);
    }

    try {
        const completedReconciliation = await BankReconciliation.completeReconciliation(id, lawyerId);

        await BillingActivity.logActivity({
            activityType: 'bank_reconciliation_completed',
            userId: lawyerId,
            relatedModel: 'BankReconciliation',
            relatedId: reconciliation._id,
            description: `Reconciliation ${reconciliation.reconciliationNumber} completed`,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        return res.json({
            success: true,
            message: 'Reconciliation completed successfully',
            reconciliation: completedReconciliation
        });
    } catch (error) {
        throw CustomException(error.message, 400);
    }
});

// Cancel reconciliation
const cancelReconciliation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const reconciliation = await BankReconciliation.findById(id);

    if (!reconciliation) {
        throw CustomException('Reconciliation not found', 404);
    }

    if (reconciliation.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this reconciliation', 403);
    }

    try {
        const cancelledReconciliation = await BankReconciliation.cancelReconciliation(id, lawyerId);

        await BillingActivity.logActivity({
            activityType: 'bank_reconciliation_cancelled',
            userId: lawyerId,
            relatedModel: 'BankReconciliation',
            relatedId: reconciliation._id,
            description: `Reconciliation ${reconciliation.reconciliationNumber} cancelled`,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        return res.json({
            success: true,
            message: 'Reconciliation cancelled',
            reconciliation: cancelledReconciliation
        });
    } catch (error) {
        throw CustomException(error.message, 400);
    }
});

// Import CSV
const importCSV = asyncHandler(async (req, res) => {
    const { bankAccountId } = req.body;
    const lawyerId = req.userID;

    if (!req.file) {
        throw CustomException('No file uploaded', 400);
    }

    const settings = {
        fileFormat: 'csv',
        dateFormat: req.body.dateFormat || 'YYYY-MM-DD',
        delimiter: req.body.delimiter || ',',
        hasHeader: req.body.hasHeader !== 'false',
        encoding: req.body.encoding || 'utf-8',
        skipRows: parseInt(req.body.skipRows) || 0,
        columnMapping: req.body.columnMapping ? JSON.parse(req.body.columnMapping) : {},
        debitColumn: req.body.debitColumn,
        creditColumn: req.body.creditColumn
    };

    const result = await bankReconciliationService.importFromCSV(
        req.firmId,
        bankAccountId,
        req.file.buffer,
        settings,
        lawyerId,
        lawyerId
    );

    await BillingActivity.logActivity({
        activityType: 'bank_transactions_imported',
        userId: lawyerId,
        description: `Imported ${result.imported} transactions from CSV`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    return res.status(200).json({
        success: true,
        message: `Successfully imported ${result.imported} transactions`,
        ...result
    });
});

// Import OFX
const importOFX = asyncHandler(async (req, res) => {
    const { bankAccountId } = req.body;
    const lawyerId = req.userID;

    if (!req.file) {
        throw CustomException('No file uploaded', 400);
    }

    const result = await bankReconciliationService.importFromOFX(
        req.firmId,
        bankAccountId,
        req.file.buffer,
        lawyerId,
        lawyerId
    );

    await BillingActivity.logActivity({
        activityType: 'bank_transactions_imported',
        userId: lawyerId,
        description: `Imported ${result.imported} transactions from OFX`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    return res.status(200).json({
        success: true,
        message: `Successfully imported ${result.imported} transactions`,
        ...result
    });
});

// Get CSV template
const getCSVTemplate = asyncHandler(async (req, res) => {
    const template = [
        ['Date', 'Description', 'Amount', 'Type', 'Reference', 'Balance'],
        ['2024-01-15', 'Payment from client', '5000.00', 'credit', 'INV-001', '25000.00'],
        ['2024-01-16', 'Office rent', '2000.00', 'debit', 'RENT-JAN', '23000.00'],
        ['2024-01-17', 'Legal fees received', '3500.00', 'credit', 'INV-002', '26500.00']
    ];

    const csvContent = template.map(row => row.join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=bank_transactions_template.csv');
    return res.status(200).send(csvContent);
});

// Get match suggestions
const getMatchSuggestions = asyncHandler(async (req, res) => {
    const { accountId } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const suggestions = await bankReconciliationService.getMatchSuggestions(accountId, limit);

    return res.status(200).json({
        success: true,
        suggestions
    });
});

// Auto-match transactions
const autoMatch = asyncHandler(async (req, res) => {
    const { accountId } = req.params;
    const lawyerId = req.userID;

    const options = {
        firmId: req.firmId,
        userId: lawyerId,
        limit: parseInt(req.query.limit) || 100,
        minScore: parseInt(req.query.minScore) || 70
    };

    const result = await bankReconciliationService.autoMatchTransactions(accountId, options);

    await BillingActivity.logActivity({
        activityType: 'bank_auto_match',
        userId: lawyerId,
        description: `Auto-matched ${result.matched} transactions`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    return res.status(200).json({
        success: true,
        message: `Processed ${result.processed} transactions. Matched: ${result.matched}, Suggested: ${result.suggested}`,
        ...result
    });
});

// Confirm match
const confirmMatch = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const match = await bankReconciliationService.confirmMatch(id, lawyerId);

    return res.status(200).json({
        success: true,
        message: 'Match confirmed successfully',
        match
    });
});

// Reject match
const rejectMatch = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const lawyerId = req.userID;

    const match = await bankReconciliationService.rejectMatch(id, lawyerId, reason);

    return res.status(200).json({
        success: true,
        message: 'Match rejected successfully',
        match
    });
});

// Create split match
const createSplitMatch = asyncHandler(async (req, res) => {
    const { bankTransactionId, splits } = req.body;
    const lawyerId = req.userID;

    const match = await bankReconciliationService.createSplitMatch(
        bankTransactionId,
        splits,
        lawyerId,
        req.firmId,
        lawyerId
    );

    return res.status(201).json({
        success: true,
        message: 'Split match created successfully',
        match
    });
});

// Unmatch transaction
const unmatch = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    await bankReconciliationService.unmatch(id, lawyerId);

    return res.status(200).json({
        success: true,
        message: 'Transaction unmatched successfully'
    });
});

// Create match rule
const createRule = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    const ruleData = {
        ...req.body,
        firmId: req.firmId,
        lawyerId: lawyerId,
        createdBy: lawyerId
    };

    const rule = new BankMatchRule(ruleData);
    await rule.save();

    return res.status(201).json({
        success: true,
        message: 'Match rule created successfully',
        rule
    });
});

// Get all rules
const getRules = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const { isActive, bankAccountId } = req.query;

    const query = { lawyerId };
    if (isActive !== undefined) {
        query.isActive = isActive === 'true';
    }
    if (bankAccountId) {
        query.$or = [
            { bankAccountIds: { $size: 0 } },
            { bankAccountIds: bankAccountId }
        ];
    }

    const rules = await BankMatchRule.find(query)
        .sort({ priority: -1 })
        .populate('createdBy', 'firstName lastName email');

    return res.status(200).json({
        success: true,
        rules
    });
});

// Update rule
const updateRule = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const updateData = {
        ...req.body,
        lastModifiedBy: lawyerId
    };

    const rule = await BankMatchRule.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
    );

    if (!rule) {
        throw CustomException('Rule not found', 404);
    }

    return res.status(200).json({
        success: true,
        message: 'Rule updated successfully',
        rule
    });
});

// Delete rule
const deleteRule = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const rule = await BankMatchRule.findByIdAndDelete(id);

    if (!rule) {
        throw CustomException('Rule not found', 404);
    }

    return res.status(200).json({
        success: true,
        message: 'Rule deleted successfully'
    });
});

// Get reconciliation status
const getReconciliationStatus = asyncHandler(async (req, res) => {
    const { accountId } = req.params;

    const status = await bankReconciliationService.getReconciliationStatus(accountId);

    return res.status(200).json({
        success: true,
        ...status
    });
});

// Get unmatched transactions
const getUnmatchedTransactions = asyncHandler(async (req, res) => {
    const { accountId } = req.params;

    const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        minAmount: req.query.minAmount,
        maxAmount: req.query.maxAmount,
        type: req.query.type,
        limit: parseInt(req.query.limit) || 50,
        skip: parseInt(req.query.skip) || 0
    };

    const result = await bankReconciliationService.getUnmatchedTransactions(accountId, filters);

    return res.status(200).json({
        success: true,
        ...result
    });
});

// ============ CURRENCY ENDPOINTS ============

// Get exchange rates
const getExchangeRates = asyncHandler(async (req, res) => {
    const { baseCurrency = 'SAR', firmId } = req.query;

    const rates = await currencyService.getCurrentRates(baseCurrency, firmId || null);

    return res.status(200).json({
        success: true,
        baseCurrency,
        rates,
        timestamp: new Date()
    });
});

// Convert amount
const convertAmount = asyncHandler(async (req, res) => {
    const { amount, from, to, date, firmId } = req.body;

    if (!amount || !from || !to) {
        throw CustomException('Amount, from currency, and to currency are required', 400);
    }

    const convertedAmount = await currencyService.convertAmount(
        parseFloat(amount),
        from,
        to,
        date ? new Date(date) : new Date(),
        firmId || null
    );

    const rate = await currencyService.getExchangeRate(
        from,
        to,
        date ? new Date(date) : new Date(),
        firmId || null
    );

    return res.status(200).json({
        success: true,
        originalAmount: parseFloat(amount),
        convertedAmount,
        fromCurrency: from,
        toCurrency: to,
        rate,
        date: date || new Date()
    });
});

// Set manual exchange rate
const setManualRate = asyncHandler(async (req, res) => {
    const { fromCurrency, toCurrency, rate, notes } = req.body;
    const lawyerId = req.userID;

    if (!fromCurrency || !toCurrency || !rate) {
        throw CustomException('From currency, to currency, and rate are required', 400);
    }

    const exchangeRate = await currencyService.setManualRate(
        req.firmId,
        fromCurrency,
        toCurrency,
        parseFloat(rate),
        lawyerId,
        notes
    );

    await BillingActivity.logActivity({
        activityType: 'exchange_rate_set',
        userId: lawyerId,
        description: `Set exchange rate ${fromCurrency}/${toCurrency} = ${rate}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    return res.status(201).json({
        success: true,
        message: 'Exchange rate set successfully',
        exchangeRate
    });
});

// Get supported currencies
const getSupportedCurrencies = asyncHandler(async (req, res) => {
    const { baseCurrency = 'SAR', firmId } = req.query;

    const currencies = await currencyService.getSupportedCurrencies(baseCurrency, firmId || null);

    const currenciesWithInfo = currencies.map(code => ({
        code,
        ...currencyService.getCurrencyInfo(code)
    }));

    return res.status(200).json({
        success: true,
        currencies: currenciesWithInfo
    });
});

// Update rates from API
const updateRatesFromAPI = asyncHandler(async (req, res) => {
    const { baseCurrency = 'SAR' } = req.body;

    const result = await currencyService.updateRatesFromAPI(baseCurrency);

    return res.status(200).json({
        success: true,
        message: `Updated ${result.updated} exchange rates`,
        ...result
    });
});

// Get match statistics
const getMatchStatistics = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const { startDate, endDate } = req.query;

    const dateRange = startDate && endDate ? { start: startDate, end: endDate } : null;

    const stats = await BankTransactionMatch.getStatistics(lawyerId, req.firmId, dateRange);

    return res.status(200).json({
        success: true,
        statistics: stats
    });
});

// Get rule statistics
const getRuleStatistics = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    const stats = await BankMatchRule.getStatistics(lawyerId, req.firmId);

    return res.status(200).json({
        success: true,
        statistics: stats
    });
});

module.exports = {
    createReconciliation,
    getReconciliations,
    getReconciliation,
    clearTransaction,
    unclearTransaction,
    completeReconciliation,
    cancelReconciliation,
    // Import functions
    importCSV,
    importOFX,
    getCSVTemplate,
    // Matching functions
    getMatchSuggestions,
    autoMatch,
    confirmMatch,
    rejectMatch,
    createSplitMatch,
    unmatch,
    // Rule functions
    createRule,
    getRules,
    updateRule,
    deleteRule,
    // Status & reporting
    getReconciliationStatus,
    getUnmatchedTransactions,
    getMatchStatistics,
    getRuleStatistics,
    // Currency functions
    getExchangeRates,
    convertAmount,
    setManualRate,
    getSupportedCurrencies,
    updateRatesFromAPI
};
