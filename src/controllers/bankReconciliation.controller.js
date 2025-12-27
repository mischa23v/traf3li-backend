const { BankReconciliation, BankAccount, BillingActivity } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const bankReconciliationService = require('../services/bankReconciliation.service');
const currencyService = require('../services/currency.service');
const BankTransaction = require('../models/bankTransaction.model');
const BankTransactionMatch = require('../models/bankTransactionMatch.model');
const BankMatchRule = require('../models/bankMatchRule.model');
const BankFeed = require('../models/bankFeed.model');
const ExchangeRate = require('../models/exchangeRate.model');
const mongoose = require('mongoose');

// Start new reconciliation
const createReconciliation = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'accountId',
        'endDate',
        'statementBalance',
        'openingBalance'
    ]);

    const { accountId, endDate, statementBalance } = allowedFields;

    // Input validation
    if (!accountId) {
        throw CustomException('Account ID is required', 400);
    }

    // Sanitize ObjectId
    const sanitizedAccountId = sanitizeObjectId(accountId);
    if (!sanitizedAccountId) {
        throw CustomException('Invalid account ID format', 400);
    }

    if (!endDate) {
        throw CustomException('End date is required', 400);
    }

    // Validate date format
    const endDateObj = new Date(endDate);
    if (isNaN(endDateObj.getTime())) {
        throw CustomException('Invalid end date format', 400);
    }

    if (statementBalance === undefined || statementBalance === null) {
        throw CustomException('Statement balance is required', 400);
    }

    // Validate statement balance is a number
    const balance = parseFloat(statementBalance);
    if (isNaN(balance)) {
        throw CustomException('Statement balance must be a valid number', 400);
    }

    // IDOR protection - Validate account exists and belongs to user
    const account = await BankAccount.findOne({
        _id: sanitizedAccountId,
        lawyerId: lawyerId,
        ...(req.firmId && { firmId: req.firmId })
    });

    if (!account) {
        throw CustomException('Account not found', 404);
    }

    // Check for existing in-progress reconciliation
    const existingReconciliation = await BankReconciliation.findOne({
        accountId: sanitizedAccountId,
        status: 'in_progress'
    });

    if (existingReconciliation) {
        throw CustomException('There is already an in-progress reconciliation for this account', 400);
    }

    const reconciliation = await BankReconciliation.startReconciliation({
        accountId: sanitizedAccountId,
        endDate: endDateObj,
        statementBalance: balance,
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

    // IDOR protection - Verify accountId ownership if provided
    if (accountId) {
        const sanitizedAccountId = sanitizeObjectId(accountId);
        if (!sanitizedAccountId) {
            throw CustomException('Invalid account ID format', 400);
        }

        // IDOR Protection: Include ownership check in query
        const account = await BankAccount.findOne({
            _id: sanitizedAccountId,
            lawyerId: lawyerId,
            ...(req.firmId && { firmId: req.firmId })
        });

        if (!account) {
            throw CustomException('Account not found', 404);
        }

        filters.accountId = sanitizedAccountId;
    }

    if (status) filters.status = status;

    // Input validation for pagination
    const validatedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const validatedPage = Math.max(parseInt(page) || 1, 1);

    const reconciliations = await BankReconciliation.find(filters)
        .populate('accountId', 'name bankName accountNumber')
        .populate('startedBy', 'firstName lastName')
        .populate('completedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(validatedLimit)
        .skip((validatedPage - 1) * validatedLimit);

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

    const reconciliation = await BankReconciliation.findOne({
        _id: id,
        lawyerId: lawyerId,
        ...(req.firmId && { firmId: req.firmId })
    })
        .populate('accountId', 'name bankName accountNumber balance')
        .populate('startedBy', 'firstName lastName')
        .populate('completedBy', 'firstName lastName')
        .populate('transactions.transactionId')
        .populate('transactions.clearedBy', 'firstName lastName');

    if (!reconciliation) {
        throw CustomException('Reconciliation not found', 404);
    }

    return res.json({
        success: true,
        reconciliation
    });
});

// Clear a transaction in reconciliation
const clearTransaction = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, ['transactionId']);
    const { transactionId } = allowedFields;

    // Input validation
    if (!transactionId) {
        throw CustomException('Transaction ID is required', 400);
    }

    // Sanitize IDs
    const sanitizedId = sanitizeObjectId(id);
    const sanitizedTransactionId = sanitizeObjectId(transactionId);

    if (!sanitizedId || !sanitizedTransactionId) {
        throw CustomException('Invalid ID format', 400);
    }

    // IDOR protection
    const reconciliation = await BankReconciliation.findOne({
        _id: sanitizedId,
        lawyerId: lawyerId,
        ...(req.firmId && { firmId: req.firmId })
    });

    if (!reconciliation) {
        throw CustomException('Reconciliation not found', 404);
    }

    if (reconciliation.status !== 'in_progress') {
        throw CustomException('Cannot modify a reconciliation that is not in progress', 400);
    }

    reconciliation.clearTransaction(sanitizedTransactionId, lawyerId);
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
    const lawyerId = req.userID;

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, ['transactionId']);
    const { transactionId } = allowedFields;

    // Input validation
    if (!transactionId) {
        throw CustomException('Transaction ID is required', 400);
    }

    // Sanitize IDs
    const sanitizedId = sanitizeObjectId(id);
    const sanitizedTransactionId = sanitizeObjectId(transactionId);

    if (!sanitizedId || !sanitizedTransactionId) {
        throw CustomException('Invalid ID format', 400);
    }

    // IDOR protection
    const reconciliation = await BankReconciliation.findOne({
        _id: sanitizedId,
        lawyerId: lawyerId,
        ...(req.firmId && { firmId: req.firmId })
    });

    if (!reconciliation) {
        throw CustomException('Reconciliation not found', 404);
    }

    if (reconciliation.status !== 'in_progress') {
        throw CustomException('Cannot modify a reconciliation that is not in progress', 400);
    }

    reconciliation.unclearTransaction(sanitizedTransactionId);
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

    // Sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid reconciliation ID format', 400);
    }

    // IDOR protection
    const reconciliation = await BankReconciliation.findOne({
        _id: sanitizedId,
        lawyerId: lawyerId,
        ...(req.firmId && { firmId: req.firmId })
    });

    if (!reconciliation) {
        throw CustomException('Reconciliation not found', 404);
    }

    // Use MongoDB transaction for financial operation
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const completedReconciliation = await BankReconciliation.completeReconciliation(sanitizedId, lawyerId, { session });

        await BillingActivity.logActivity({
            activityType: 'bank_reconciliation_completed',
            userId: lawyerId,
            relatedModel: 'BankReconciliation',
            relatedId: reconciliation._id,
            description: `Reconciliation ${reconciliation.reconciliationNumber} completed`,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        await session.commitTransaction();
        session.endSession();

        return res.json({
            success: true,
            message: 'Reconciliation completed successfully',
            reconciliation: completedReconciliation
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw CustomException(error.message, 400);
    }
});

// Cancel reconciliation
const cancelReconciliation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    // Sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid reconciliation ID format', 400);
    }

    // IDOR protection
    const reconciliation = await BankReconciliation.findOne({
        _id: sanitizedId,
        lawyerId: lawyerId,
        ...(req.firmId && { firmId: req.firmId })
    });

    if (!reconciliation) {
        throw CustomException('Reconciliation not found', 404);
    }

    // Use MongoDB transaction for financial operation
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const cancelledReconciliation = await BankReconciliation.cancelReconciliation(sanitizedId, lawyerId, { session });

        await BillingActivity.logActivity({
            activityType: 'bank_reconciliation_cancelled',
            userId: lawyerId,
            relatedModel: 'BankReconciliation',
            relatedId: reconciliation._id,
            description: `Reconciliation ${reconciliation.reconciliationNumber} cancelled`,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        await session.commitTransaction();
        session.endSession();

        return res.json({
            success: true,
            message: 'Reconciliation cancelled',
            reconciliation: cancelledReconciliation
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw CustomException(error.message, 400);
    }
});

// Import CSV
const importCSV = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    if (!req.file) {
        throw CustomException('No file uploaded', 400);
    }

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'bankAccountId',
        'dateFormat',
        'delimiter',
        'hasHeader',
        'encoding',
        'skipRows',
        'columnMapping',
        'debitColumn',
        'creditColumn'
    ]);

    const { bankAccountId } = allowedFields;

    // Input validation
    if (!bankAccountId) {
        throw CustomException('Bank account ID is required', 400);
    }

    // Sanitize ID
    const sanitizedBankAccountId = sanitizeObjectId(bankAccountId);
    if (!sanitizedBankAccountId) {
        throw CustomException('Invalid bank account ID format', 400);
    }

    // IDOR protection - Verify account ownership
    const account = await BankAccount.findById(sanitizedBankAccountId);
    if (!account) {
        throw CustomException('Bank account not found', 404);
    }

    if (account.lawyerId.toString() !== lawyerId) {
        throw CustomException('Access denied', 403);
    }

    if (req.firmId && account.firmId && account.firmId.toString() !== req.firmId.toString()) {
        throw CustomException('Access denied', 403);
    }

    const settings = {
        fileFormat: 'csv',
        dateFormat: allowedFields.dateFormat || 'YYYY-MM-DD',
        delimiter: allowedFields.delimiter || ',',
        hasHeader: allowedFields.hasHeader !== 'false',
        encoding: allowedFields.encoding || 'utf-8',
        skipRows: parseInt(allowedFields.skipRows) || 0,
        columnMapping: allowedFields.columnMapping ? JSON.parse(allowedFields.columnMapping) : {},
        debitColumn: allowedFields.debitColumn,
        creditColumn: allowedFields.creditColumn
    };

    const result = await bankReconciliationService.importFromCSV(
        req.firmId,
        sanitizedBankAccountId,
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
    const lawyerId = req.userID;

    if (!req.file) {
        throw CustomException('No file uploaded', 400);
    }

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, ['bankAccountId']);
    const { bankAccountId } = allowedFields;

    // Input validation
    if (!bankAccountId) {
        throw CustomException('Bank account ID is required', 400);
    }

    // Sanitize ID
    const sanitizedBankAccountId = sanitizeObjectId(bankAccountId);
    if (!sanitizedBankAccountId) {
        throw CustomException('Invalid bank account ID format', 400);
    }

    // IDOR protection - Verify account ownership
    const account = await BankAccount.findById(sanitizedBankAccountId);
    if (!account) {
        throw CustomException('Bank account not found', 404);
    }

    if (account.lawyerId.toString() !== lawyerId) {
        throw CustomException('Access denied', 403);
    }

    if (req.firmId && account.firmId && account.firmId.toString() !== req.firmId.toString()) {
        throw CustomException('Access denied', 403);
    }

    const result = await bankReconciliationService.importFromOFX(
        req.firmId,
        sanitizedBankAccountId,
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
    const lawyerId = req.userID;

    // Sanitize ID
    const sanitizedAccountId = sanitizeObjectId(accountId);
    if (!sanitizedAccountId) {
        throw CustomException('Invalid account ID format', 400);
    }

    // IDOR protection - Verify account ownership
    const account = await BankAccount.findById(sanitizedAccountId);
    if (!account) {
        throw CustomException('Account not found', 404);
    }

    if (account.lawyerId.toString() !== lawyerId) {
        throw CustomException('Access denied', 403);
    }

    if (req.firmId && account.firmId && account.firmId.toString() !== req.firmId.toString()) {
        throw CustomException('Access denied', 403);
    }

    // Input validation
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);

    const suggestions = await bankReconciliationService.getMatchSuggestions(sanitizedAccountId, limit);

    return res.status(200).json({
        success: true,
        suggestions
    });
});

// Auto-match transactions
const autoMatch = asyncHandler(async (req, res) => {
    const { accountId } = req.params;
    const lawyerId = req.userID;

    // Sanitize ID
    const sanitizedAccountId = sanitizeObjectId(accountId);
    if (!sanitizedAccountId) {
        throw CustomException('Invalid account ID format', 400);
    }

    // IDOR protection - Verify account ownership
    const account = await BankAccount.findById(sanitizedAccountId);
    if (!account) {
        throw CustomException('Account not found', 404);
    }

    if (account.lawyerId.toString() !== lawyerId) {
        throw CustomException('Access denied', 403);
    }

    if (req.firmId && account.firmId && account.firmId.toString() !== req.firmId.toString()) {
        throw CustomException('Access denied', 403);
    }

    // Input validation
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 500);
    const minScore = Math.min(Math.max(parseInt(req.query.minScore) || 70, 0), 100);

    const options = {
        firmId: req.firmId,
        userId: lawyerId,
        limit,
        minScore
    };

    const result = await bankReconciliationService.autoMatchTransactions(sanitizedAccountId, options);

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

    // Sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid match ID format', 400);
    }

    // IDOR protection - Verify match ownership
    const existingMatch = await BankTransactionMatch.findById(sanitizedId);
    if (!existingMatch) {
        throw CustomException('Match not found', 404);
    }

    if (existingMatch.lawyerId && existingMatch.lawyerId.toString() !== lawyerId) {
        throw CustomException('Access denied', 403);
    }

    if (req.firmId && existingMatch.firmId && existingMatch.firmId.toString() !== req.firmId.toString()) {
        throw CustomException('Access denied', 403);
    }

    const match = await bankReconciliationService.confirmMatch(sanitizedId, lawyerId);

    return res.status(200).json({
        success: true,
        message: 'Match confirmed successfully',
        match
    });
});

// Reject match
const rejectMatch = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, ['reason']);
    const { reason } = allowedFields;

    // Sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid match ID format', 400);
    }

    // IDOR protection - Verify match ownership
    const existingMatch = await BankTransactionMatch.findById(sanitizedId);
    if (!existingMatch) {
        throw CustomException('Match not found', 404);
    }

    if (existingMatch.lawyerId && existingMatch.lawyerId.toString() !== lawyerId) {
        throw CustomException('Access denied', 403);
    }

    if (req.firmId && existingMatch.firmId && existingMatch.firmId.toString() !== req.firmId.toString()) {
        throw CustomException('Access denied', 403);
    }

    const match = await bankReconciliationService.rejectMatch(sanitizedId, lawyerId, reason);

    return res.status(200).json({
        success: true,
        message: 'Match rejected successfully',
        match
    });
});

// Create split match
const createSplitMatch = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, ['bankTransactionId', 'splits']);
    const { bankTransactionId, splits } = allowedFields;

    // Input validation
    if (!bankTransactionId) {
        throw CustomException('Bank transaction ID is required', 400);
    }

    if (!splits || !Array.isArray(splits) || splits.length === 0) {
        throw CustomException('Splits array is required and must not be empty', 400);
    }

    // Sanitize ID
    const sanitizedBankTransactionId = sanitizeObjectId(bankTransactionId);
    if (!sanitizedBankTransactionId) {
        throw CustomException('Invalid bank transaction ID format', 400);
    }

    // IDOR protection - Verify transaction ownership
    const transaction = await BankTransaction.findById(sanitizedBankTransactionId);
    if (!transaction) {
        throw CustomException('Bank transaction not found', 404);
    }

    if (transaction.lawyerId && transaction.lawyerId.toString() !== lawyerId) {
        throw CustomException('Access denied', 403);
    }

    if (req.firmId && transaction.firmId && transaction.firmId.toString() !== req.firmId.toString()) {
        throw CustomException('Access denied', 403);
    }

    // Validate splits
    for (const split of splits) {
        if (!split.amount || isNaN(parseFloat(split.amount))) {
            throw CustomException('Each split must have a valid amount', 400);
        }
    }

    const match = await bankReconciliationService.createSplitMatch(
        sanitizedBankTransactionId,
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

    // Sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid match ID format', 400);
    }

    // IDOR protection - Verify match ownership
    const existingMatch = await BankTransactionMatch.findById(sanitizedId);
    if (!existingMatch) {
        throw CustomException('Match not found', 404);
    }

    if (existingMatch.lawyerId && existingMatch.lawyerId.toString() !== lawyerId) {
        throw CustomException('Access denied', 403);
    }

    if (req.firmId && existingMatch.firmId && existingMatch.firmId.toString() !== req.firmId.toString()) {
        throw CustomException('Access denied', 403);
    }

    await bankReconciliationService.unmatch(sanitizedId, lawyerId);

    return res.status(200).json({
        success: true,
        message: 'Transaction unmatched successfully'
    });
});

// Create match rule
const createRule = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'name',
        'description',
        'isActive',
        'priority',
        'conditions',
        'action',
        'bankAccountIds',
        'applyToFutureTransactions'
    ]);

    // Input validation
    if (!allowedFields.name) {
        throw CustomException('Rule name is required', 400);
    }

    if (!allowedFields.conditions || !Array.isArray(allowedFields.conditions) || allowedFields.conditions.length === 0) {
        throw CustomException('At least one condition is required', 400);
    }

    if (!allowedFields.action) {
        throw CustomException('Action is required', 400);
    }

    const ruleData = {
        ...allowedFields,
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

    // Sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid rule ID format', 400);
    }

    // IDOR protection - Verify rule ownership
    const existingRule = await BankMatchRule.findOne({
        _id: sanitizedId,
        lawyerId: lawyerId,
        ...(req.firmId && { firmId: req.firmId })
    });
    if (!existingRule) {
        throw CustomException('Rule not found', 404);
    }

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'name',
        'description',
        'isActive',
        'priority',
        'conditions',
        'action',
        'bankAccountIds',
        'applyToFutureTransactions'
    ]);

    const updateData = {
        ...allowedFields,
        lastModifiedBy: lawyerId
    };

    const rule = await BankMatchRule.findOneAndUpdate(
        {
            _id: sanitizedId,
            lawyerId: lawyerId,
            ...(req.firmId && { firmId: req.firmId })
        },
        updateData,
        { new: true, runValidators: true }
    );

    return res.status(200).json({
        success: true,
        message: 'Rule updated successfully',
        rule
    });
});

// Delete rule
const deleteRule = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    // Sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid rule ID format', 400);
    }

    // IDOR protection - Verify rule ownership
    const rule = await BankMatchRule.findOne({
        _id: sanitizedId,
        lawyerId: lawyerId,
        ...(req.firmId && { firmId: req.firmId })
    });
    if (!rule) {
        throw CustomException('Rule not found', 404);
    }

    await BankMatchRule.findOneAndDelete({
        _id: sanitizedId,
        lawyerId: lawyerId,
        ...(req.firmId && { firmId: req.firmId })
    });

    return res.status(200).json({
        success: true,
        message: 'Rule deleted successfully'
    });
});

// Get reconciliation status
const getReconciliationStatus = asyncHandler(async (req, res) => {
    const { accountId } = req.params;
    const lawyerId = req.userID;

    // Sanitize ID
    const sanitizedAccountId = sanitizeObjectId(accountId);
    if (!sanitizedAccountId) {
        throw CustomException('Invalid account ID format', 400);
    }

    // IDOR protection - Verify account ownership
    const account = await BankAccount.findById(sanitizedAccountId);
    if (!account) {
        throw CustomException('Account not found', 404);
    }

    if (account.lawyerId.toString() !== lawyerId) {
        throw CustomException('Access denied', 403);
    }

    if (req.firmId && account.firmId && account.firmId.toString() !== req.firmId.toString()) {
        throw CustomException('Access denied', 403);
    }

    const status = await bankReconciliationService.getReconciliationStatus(sanitizedAccountId);

    return res.status(200).json({
        success: true,
        ...status
    });
});

// Get unmatched transactions
const getUnmatchedTransactions = asyncHandler(async (req, res) => {
    const { accountId } = req.params;
    const lawyerId = req.userID;

    // Sanitize ID
    const sanitizedAccountId = sanitizeObjectId(accountId);
    if (!sanitizedAccountId) {
        throw CustomException('Invalid account ID format', 400);
    }

    // IDOR protection - Verify account ownership
    const account = await BankAccount.findById(sanitizedAccountId);
    if (!account) {
        throw CustomException('Account not found', 404);
    }

    if (account.lawyerId.toString() !== lawyerId) {
        throw CustomException('Access denied', 403);
    }

    if (req.firmId && account.firmId && account.firmId.toString() !== req.firmId.toString()) {
        throw CustomException('Access denied', 403);
    }

    // Input validation for pagination
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
    const skip = Math.max(parseInt(req.query.skip) || 0, 0);

    const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        minAmount: req.query.minAmount,
        maxAmount: req.query.maxAmount,
        type: req.query.type,
        limit,
        skip
    };

    const result = await bankReconciliationService.getUnmatchedTransactions(sanitizedAccountId, filters);

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
        data: rates,
        baseCurrency,
        timestamp: new Date()
    });
});

// Convert amount
const convertAmount = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'amount',
        'from',
        'to',
        'date',
        'firmId'
    ]);

    const { amount, from, to, date, firmId } = allowedFields;

    // Input validation
    if (!amount || !from || !to) {
        throw CustomException('Amount, from currency, and to currency are required', 400);
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw CustomException('Amount must be a valid positive number', 400);
    }

    // Validate currency codes (basic format check)
    if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) {
        throw CustomException('Invalid currency code format', 400);
    }

    const dateObj = date ? new Date(date) : new Date();
    if (date && isNaN(dateObj.getTime())) {
        throw CustomException('Invalid date format', 400);
    }

    const convertedAmount = await currencyService.convertAmount(
        parsedAmount,
        from,
        to,
        dateObj,
        firmId || req.firmId || null
    );

    const rate = await currencyService.getExchangeRate(
        from,
        to,
        dateObj,
        firmId || req.firmId || null
    );

    return res.status(200).json({
        success: true,
        originalAmount: parsedAmount,
        convertedAmount,
        fromCurrency: from,
        toCurrency: to,
        rate,
        date: dateObj
    });
});

// Set manual exchange rate
const setManualRate = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'fromCurrency',
        'toCurrency',
        'rate',
        'notes'
    ]);

    const { fromCurrency, toCurrency, rate, notes } = allowedFields;

    // Input validation
    if (!fromCurrency || !toCurrency || !rate) {
        throw CustomException('From currency, to currency, and rate are required', 400);
    }

    // Validate currency codes (basic format check)
    if (!/^[A-Z]{3}$/.test(fromCurrency) || !/^[A-Z]{3}$/.test(toCurrency)) {
        throw CustomException('Invalid currency code format', 400);
    }

    const parsedRate = parseFloat(rate);
    if (isNaN(parsedRate) || parsedRate <= 0) {
        throw CustomException('Rate must be a valid positive number', 400);
    }

    const exchangeRate = await currencyService.setManualRate(
        req.firmId,
        fromCurrency,
        toCurrency,
        parsedRate,
        lawyerId,
        notes
    );

    await BillingActivity.logActivity({
        activityType: 'exchange_rate_set',
        userId: lawyerId,
        description: `Set exchange rate ${fromCurrency}/${toCurrency} = ${parsedRate}`,
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

// ============ CURRENCY SETTINGS ============

// Get currency settings
const getCurrencySettings = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Return currency configuration settings
    // In a production system, these might be stored in a firm settings collection
    const settings = {
        baseCurrency: 'SAR',
        defaultCurrency: 'SAR',  // Keep for backward compatibility
        supportedCurrencies: ['SAR', 'USD', 'EUR', 'GBP', 'AED', 'KWD', 'BHD', 'QAR', 'OMR'],
        multiCurrencyEnabled: true,
        autoUpdateEnabled: true,
        autoUpdateRates: true,  // Keep for backward compatibility
        updateInterval: 'daily',
        updateFrequency: 'daily',  // Keep for backward compatibility
        rateSource: 'openexchangerates',
        decimalPlaces: 2,
        roundingMode: 'half_up',
        displayFormat: {
            symbolPosition: 'before',
            thousandsSeparator: ',',
            decimalSeparator: '.'
        }
    };

    return res.status(200).json({
        success: true,
        data: settings
    });
});

// ============ BANK FEEDS ============

// Get bank feeds with sorting support
const getBankFeeds = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        status,
        provider,
        bankAccountId
    } = req.query;

    // Build query
    const query = { lawyerId };
    if (firmId) query.firmId = firmId;
    if (status) query.status = status;
    if (provider) query.provider = provider;
    if (bankAccountId) query.bankAccountId = bankAccountId;

    // Validate sortBy field to prevent injection
    // Map frontend field names to model fields
    const sortFieldMap = {
        'lastReconciled': 'lastImportAt'  // Frontend uses lastReconciled, model has lastImportAt
    };
    const mappedSortBy = sortFieldMap[sortBy] || sortBy;
    const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'lastImportAt', 'totalImported', 'status'];
    const sanitizedSortBy = allowedSortFields.includes(mappedSortBy) ? mappedSortBy : 'createdAt';
    const sanitizedSortOrder = sortOrder === 'asc' ? 1 : -1;

    const feeds = await BankFeed.find(query)
        .sort({ [sanitizedSortBy]: sanitizedSortOrder })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .populate('bankAccountId', 'name bankName accountNumber')
        .populate('createdBy', 'firstName lastName email');

    const total = await BankFeed.countDocuments(query);

    return res.status(200).json({
        success: true,
        data: feeds,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        },
        sorting: {
            sortBy: sanitizedSortBy,
            sortOrder: sortOrder === 'asc' ? 'asc' : 'desc'
        }
    });
});

// Create bank feed
const createBankFeed = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'name',
        'bankAccountId',
        'provider',
        'status',
        'credentials',
        'settings',
        'autoImport',
        'importFrequency',
        'lastImportAt'
    ]);

    // Input validation
    if (!allowedFields.name) {
        throw CustomException('Feed name is required', 400);
    }

    if (!allowedFields.bankAccountId) {
        throw CustomException('Bank account ID is required', 400);
    }

    // Sanitize bankAccountId
    const sanitizedBankAccountId = sanitizeObjectId(allowedFields.bankAccountId);
    if (!sanitizedBankAccountId) {
        throw CustomException('Invalid bank account ID format', 400);
    }

    // IDOR protection - Verify account ownership
    const account = await BankAccount.findById(sanitizedBankAccountId);
    if (!account) {
        throw CustomException('Bank account not found', 404);
    }

    if (account.lawyerId.toString() !== lawyerId) {
        throw CustomException('Access denied', 403);
    }

    if (firmId && account.firmId && account.firmId.toString() !== firmId.toString()) {
        throw CustomException('Access denied', 403);
    }

    const feedData = {
        ...allowedFields,
        bankAccountId: sanitizedBankAccountId,
        firmId,
        lawyerId,
        createdBy: lawyerId
    };

    const feed = new BankFeed(feedData);
    await feed.save();

    const populatedFeed = await BankFeed.findById(feed._id)
        .populate('bankAccountId', 'name bankName accountNumber')
        .populate('createdBy', 'firstName lastName email');

    return res.status(201).json({
        success: true,
        message: 'Bank feed created successfully',
        data: populatedFeed
    });
});

// Update bank feed
const updateBankFeed = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    // Sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid bank feed ID format', 400);
    }

    // IDOR protection - Verify feed ownership
    const feed = await BankFeed.findOne({
        _id: sanitizedId,
        lawyerId: lawyerId,
        ...(req.firmId && { firmId: req.firmId })
    });

    if (!feed) {
        throw CustomException('Bank feed not found', 404);
    }

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'name',
        'provider',
        'status',
        'credentials',
        'settings',
        'autoImport',
        'importFrequency',
        'lastImportAt'
    ]);

    // If bankAccountId is being updated, verify ownership
    if (allowedFields.bankAccountId) {
        const sanitizedBankAccountId = sanitizeObjectId(allowedFields.bankAccountId);
        if (!sanitizedBankAccountId) {
            throw CustomException('Invalid bank account ID format', 400);
        }

        const account = await BankAccount.findById(sanitizedBankAccountId);
        if (!account) {
            throw CustomException('Bank account not found', 404);
        }

        if (account.lawyerId.toString() !== lawyerId) {
            throw CustomException('Access denied to bank account', 403);
        }

        if (req.firmId && account.firmId && account.firmId.toString() !== req.firmId.toString()) {
            throw CustomException('Access denied to bank account', 403);
        }

        allowedFields.bankAccountId = sanitizedBankAccountId;
    }

    const updatedFeed = await BankFeed.findOneAndUpdate(
        {
            _id: sanitizedId,
            lawyerId: lawyerId,
            ...(req.firmId && { firmId: req.firmId })
        },
        allowedFields,
        { new: true, runValidators: true }
    )
        .populate('bankAccountId', 'name bankName accountNumber')
        .populate('createdBy', 'firstName lastName email');

    return res.status(200).json({
        success: true,
        message: 'Bank feed updated successfully',
        data: updatedFeed
    });
});

// Delete bank feed
const deleteBankFeed = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    // Sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid bank feed ID format', 400);
    }

    // IDOR protection - Verify feed ownership
    const feed = await BankFeed.findOne({
        _id: sanitizedId,
        lawyerId: lawyerId,
        ...(req.firmId && { firmId: req.firmId })
    });

    if (!feed) {
        throw CustomException('Bank feed not found', 404);
    }

    await BankFeed.findOneAndDelete({
        _id: sanitizedId,
        lawyerId: lawyerId,
        ...(req.firmId && { firmId: req.firmId })
    });

    return res.status(200).json({
        success: true,
        message: 'Bank feed deleted successfully'
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
    updateRatesFromAPI,
    getCurrencySettings,
    // Feed functions
    getBankFeeds,
    createBankFeed,
    updateBankFeed,
    deleteBankFeed
};
