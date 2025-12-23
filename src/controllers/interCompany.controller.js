/**
 * Inter-Company Transaction Controller
 *
 * Manages transactions and balances between different firms in a multi-firm organization.
 * Handles transaction creation, confirmation, cancellation, and reconciliation.
 */

const mongoose = require('mongoose');
const InterCompanyTransaction = require('../models/interCompanyTransaction.model');
const InterCompanyBalance = require('../models/interCompanyBalance.model');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// ═══════════════════════════════════════════════════════════════
// TRANSACTION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Get transactions for current firm
 * GET /api/inter-company/transactions
 */
exports.getTransactions = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const {
        counterpartFirmId,
        type,
        status,
        dateFrom,
        dateTo,
        page = 1,
        limit = 50,
        sortBy = 'transactionDate',
        sortOrder = 'desc'
    } = req.query;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    // Build query - get transactions where firm is source or target
    const query = {
        $or: [
            { sourceFirmId: firmId },
            { targetFirmId: firmId }
        ]
    };

    // Apply filters
    if (counterpartFirmId) {
        // Sanitize counterpartFirmId if provided
        const sanitizedCounterpartFirmId = sanitizeObjectId(counterpartFirmId, 'Counterpart firm ID');
        query.$or = [
            { sourceFirmId: firmId, targetFirmId: sanitizedCounterpartFirmId },
            { sourceFirmId: sanitizedCounterpartFirmId, targetFirmId: firmId }
        ];
    }

    if (type) {
        query.transactionType = type;
    }

    if (status) {
        if (Array.isArray(status)) {
            query.status = { $in: status };
        } else {
            query.status = status;
        }
    }

    // Date range filter
    if (dateFrom || dateTo) {
        query.transactionDate = {};
        if (dateFrom) {
            query.transactionDate.$gte = new Date(dateFrom);
        }
        if (dateTo) {
            query.transactionDate.$lte = new Date(dateTo);
        }
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [transactions, total] = await Promise.all([
        InterCompanyTransaction.find(query)
            .populate('sourceFirmId', 'name nameArabic')
            .populate('targetFirmId', 'name nameArabic')
            .populate('createdBy', 'firstName lastName email')
            .populate('confirmedBy', 'firstName lastName email')
            .populate('reconciledBy', 'firstName lastName email')
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        InterCompanyTransaction.countDocuments(query)
    ]);

    // Add direction flag for each transaction
    const enrichedTransactions = transactions.map(txn => ({
        ...txn,
        direction: txn.sourceFirmId._id.toString() === firmId.toString() ? 'outgoing' : 'incoming'
    }));

    res.json({
        success: true,
        data: enrichedTransactions,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Create new inter-company transaction
 * POST /api/inter-company/transactions
 */
exports.createTransaction = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'targetFirmId',
        'transactionType',
        'amount',
        'currency',
        'exchangeRate',
        'transactionDate',
        'reference',
        'description',
        'sourceDocumentType',
        'sourceDocumentId',
        'autoConfirm'
    ];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Set defaults
    const {
        targetFirmId,
        transactionType,
        amount,
        currency = 'SAR',
        exchangeRate = 1,
        transactionDate,
        reference,
        description,
        sourceDocumentType,
        sourceDocumentId,
        autoConfirm = false
    } = sanitizedData;

    // Validate required fields
    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    if (!targetFirmId) {
        throw CustomException('Target firm ID is required', 400);
    }

    // Sanitize and validate targetFirmId
    const sanitizedTargetFirmId = sanitizeObjectId(targetFirmId, 'Target firm ID');

    if (!transactionType) {
        throw CustomException('Transaction type is required', 400);
    }

    // Validate transaction type
    const validTransactionTypes = ['invoice', 'payment', 'transfer', 'adjustment', 'refund', 'other'];
    if (!validTransactionTypes.includes(transactionType)) {
        throw CustomException(`Invalid transaction type. Must be one of: ${validTransactionTypes.join(', ')}`, 400);
    }

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
        throw CustomException('Amount must be a positive number', 400);
    }

    // Validate amount is not too large (prevent overflow)
    if (amount > 999999999999.99) {
        throw CustomException('Amount exceeds maximum allowed value', 400);
    }

    // Validate currency
    const validCurrencies = ['SAR', 'USD', 'EUR', 'GBP', 'AED'];
    if (!validCurrencies.includes(currency)) {
        throw CustomException(`Invalid currency. Must be one of: ${validCurrencies.join(', ')}`, 400);
    }

    // Validate exchange rate
    if (typeof exchangeRate !== 'number' || exchangeRate <= 0) {
        throw CustomException('Exchange rate must be a positive number', 400);
    }

    if (!transactionDate) {
        throw CustomException('Transaction date is required', 400);
    }

    // Validate transaction date
    const parsedDate = new Date(transactionDate);
    if (isNaN(parsedDate.getTime())) {
        throw CustomException('Invalid transaction date', 400);
    }

    // IDOR Protection - verify firmId ownership
    if (firmId.toString() === sanitizedTargetFirmId.toString()) {
        throw CustomException('Cannot create transaction to the same firm', 400);
    }

    // Verify source firm exists and user has access
    const sourceFirm = await Firm.findById(firmId);
    if (!sourceFirm) {
        throw CustomException('Source firm not found', 404);
    }

    // Verify target firm exists
    const targetFirm = await Firm.findById(sanitizedTargetFirmId);
    if (!targetFirm) {
        throw CustomException('Target firm not found', 404);
    }

    // Use MongoDB transaction for financial operations
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Create transaction
        const transaction = await InterCompanyTransaction.create([{
            sourceFirmId: firmId,
            targetFirmId: sanitizedTargetFirmId,
            transactionType,
            amount,
            currency,
            exchangeRate,
            transactionDate: parsedDate,
            reference,
            description,
            sourceDocumentType,
            sourceDocumentId,
            status: autoConfirm ? 'confirmed' : 'draft',
            createdBy: userId,
            confirmedBy: autoConfirm ? userId : null,
            confirmedAt: autoConfirm ? new Date() : null
        }], { session });

        // If auto-confirm, update balances
        if (autoConfirm) {
            await updateBalancesWithSession(firmId, sanitizedTargetFirmId, amount, transaction[0]._id, session);
        }

        await session.commitTransaction();

        // Populate references
        const populatedTransaction = await InterCompanyTransaction.findById(transaction[0]._id)
            .populate('sourceFirmId', 'name nameArabic')
            .populate('targetFirmId', 'name nameArabic')
            .populate('createdBy', 'firstName lastName email');

        res.status(201).json({
            success: true,
            message: 'Inter-company transaction created successfully',
            data: populatedTransaction
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * Get single transaction
 * GET /api/inter-company/transactions/:id
 */
exports.getTransaction = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const transactionId = sanitizeObjectId(req.params.id, 'Transaction ID');

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    const transaction = await InterCompanyTransaction.findById(transactionId)
        .populate('sourceFirmId', 'name nameArabic')
        .populate('targetFirmId', 'name nameArabic')
        .populate('createdBy', 'firstName lastName email')
        .populate('confirmedBy', 'firstName lastName email')
        .populate('reconciledBy', 'firstName lastName email');

    if (!transaction) {
        throw CustomException('Transaction not found', 404);
    }

    // Verify user has access (must be source or target firm)
    const hasAccess =
        transaction.sourceFirmId._id.toString() === firmId.toString() ||
        transaction.targetFirmId._id.toString() === firmId.toString();

    if (!hasAccess) {
        throw CustomException('You do not have access to this transaction', 403);
    }

    // Add direction flag
    const direction = transaction.sourceFirmId._id.toString() === firmId.toString()
        ? 'outgoing'
        : 'incoming';

    res.json({
        success: true,
        data: {
            ...transaction.toObject(),
            direction
        }
    });
});

/**
 * Update transaction
 * PUT /api/inter-company/transactions/:id
 */
exports.updateTransaction = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;
    const transactionId = sanitizeObjectId(req.params.id, 'Transaction ID');

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'transactionType',
        'amount',
        'currency',
        'exchangeRate',
        'transactionDate',
        'reference',
        'description'
    ];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    const {
        transactionType,
        amount,
        currency,
        exchangeRate,
        transactionDate,
        reference,
        description
    } = sanitizedData;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    const transaction = await InterCompanyTransaction.findById(transactionId);

    if (!transaction) {
        throw CustomException('Transaction not found', 404);
    }

    // IDOR Protection - Only source firm can update
    if (transaction.sourceFirmId.toString() !== firmId.toString()) {
        throw CustomException('Only the source firm can update this transaction', 403);
    }

    // Can only update draft or pending transactions
    if (!['draft', 'pending'].includes(transaction.status)) {
        throw CustomException('Cannot update confirmed, reconciled, or cancelled transactions', 400);
    }

    // Validate transaction type if provided
    if (transactionType) {
        const validTransactionTypes = ['invoice', 'payment', 'transfer', 'adjustment', 'refund', 'other'];
        if (!validTransactionTypes.includes(transactionType)) {
            throw CustomException(`Invalid transaction type. Must be one of: ${validTransactionTypes.join(', ')}`, 400);
        }
        transaction.transactionType = transactionType;
    }

    // Validate amount if provided
    if (amount !== undefined) {
        if (typeof amount !== 'number' || amount <= 0) {
            throw CustomException('Amount must be a positive number', 400);
        }
        if (amount > 999999999999.99) {
            throw CustomException('Amount exceeds maximum allowed value', 400);
        }
        transaction.amount = amount;
    }

    // Validate currency if provided
    if (currency) {
        const validCurrencies = ['SAR', 'USD', 'EUR', 'GBP', 'AED'];
        if (!validCurrencies.includes(currency)) {
            throw CustomException(`Invalid currency. Must be one of: ${validCurrencies.join(', ')}`, 400);
        }
        transaction.currency = currency;
    }

    // Validate exchange rate if provided
    if (exchangeRate !== undefined) {
        if (typeof exchangeRate !== 'number' || exchangeRate <= 0) {
            throw CustomException('Exchange rate must be a positive number', 400);
        }
        transaction.exchangeRate = exchangeRate;
    }

    // Validate transaction date if provided
    if (transactionDate) {
        const parsedDate = new Date(transactionDate);
        if (isNaN(parsedDate.getTime())) {
            throw CustomException('Invalid transaction date', 400);
        }
        transaction.transactionDate = parsedDate;
    }

    // Update optional fields
    if (reference !== undefined) transaction.reference = reference;
    if (description !== undefined) transaction.description = description;

    await transaction.save();

    // Populate and return
    const updatedTransaction = await InterCompanyTransaction.findById(transactionId)
        .populate('sourceFirmId', 'name nameArabic')
        .populate('targetFirmId', 'name nameArabic')
        .populate('createdBy', 'firstName lastName email');

    res.json({
        success: true,
        message: 'Transaction updated successfully',
        data: updatedTransaction
    });
});

/**
 * Confirm transaction
 * POST /api/inter-company/transactions/:id/confirm
 */
exports.confirmTransaction = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;
    const transactionId = sanitizeObjectId(req.params.id, 'Transaction ID');

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    const transaction = await InterCompanyTransaction.findById(transactionId);

    if (!transaction) {
        throw CustomException('Transaction not found', 404);
    }

    // IDOR Protection - Either firm can confirm
    const hasAccess =
        transaction.sourceFirmId.toString() === firmId.toString() ||
        transaction.targetFirmId.toString() === firmId.toString();

    if (!hasAccess) {
        throw CustomException('You do not have access to this transaction', 403);
    }

    // Can only confirm draft or pending transactions
    if (!['draft', 'pending'].includes(transaction.status)) {
        throw CustomException('Transaction is already confirmed, reconciled, or cancelled', 400);
    }

    // Use MongoDB transaction for financial operations
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Update transaction status
        transaction.status = 'confirmed';
        transaction.confirmedBy = userId;
        transaction.confirmedAt = new Date();
        await transaction.save({ session });

        // Update balances
        await updateBalancesWithSession(
            transaction.sourceFirmId,
            transaction.targetFirmId,
            transaction.amount,
            transaction._id,
            session
        );

        await session.commitTransaction();

        // TODO: Send notification to counterpart firm

        const confirmedTransaction = await InterCompanyTransaction.findById(transactionId)
            .populate('sourceFirmId', 'name nameArabic')
            .populate('targetFirmId', 'name nameArabic')
            .populate('confirmedBy', 'firstName lastName email');

        res.json({
            success: true,
            message: 'Transaction confirmed successfully',
            data: confirmedTransaction
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * Cancel transaction
 * POST /api/inter-company/transactions/:id/cancel
 */
exports.cancelTransaction = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const transactionId = sanitizeObjectId(req.params.id, 'Transaction ID');

    // Mass assignment protection
    const allowedFields = ['reason'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);
    const { reason } = sanitizedData;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    const transaction = await InterCompanyTransaction.findById(transactionId);

    if (!transaction) {
        throw CustomException('Transaction not found', 404);
    }

    // IDOR Protection - Only source firm can cancel
    if (transaction.sourceFirmId.toString() !== firmId.toString()) {
        throw CustomException('Only the source firm can cancel this transaction', 403);
    }

    // Cannot cancel reconciled transactions
    if (transaction.status === 'reconciled') {
        throw CustomException('Cannot cancel a reconciled transaction', 400);
    }

    if (transaction.status === 'cancelled') {
        throw CustomException('Transaction is already cancelled', 400);
    }

    // Use MongoDB transaction for financial operations
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // If transaction was confirmed, reverse the balance updates
        if (transaction.status === 'confirmed') {
            await reverseBalancesWithSession(
                transaction.sourceFirmId,
                transaction.targetFirmId,
                transaction.amount,
                session
            );
        }

        // Update transaction status
        transaction.status = 'cancelled';
        if (reason) {
            transaction.description = (transaction.description || '') + `\nCancellation reason: ${reason}`;
        }
        await transaction.save({ session });

        await session.commitTransaction();

        const cancelledTransaction = await InterCompanyTransaction.findById(transactionId)
            .populate('sourceFirmId', 'name nameArabic')
            .populate('targetFirmId', 'name nameArabic');

        res.json({
            success: true,
            message: 'Transaction cancelled successfully',
            data: cancelledTransaction
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

// ═══════════════════════════════════════════════════════════════
// BALANCE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Get balance matrix for current firm
 * GET /api/inter-company/balances
 */
exports.getBalances = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { status = 'active' } = req.query;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    // Get all balances for this firm
    const balances = await InterCompanyBalance.getBalancesForFirm(firmId, status);

    // Calculate totals
    const summary = await InterCompanyBalance.getTotalExposure(firmId);

    // Enrich balance data with direction
    const enrichedBalances = balances.map(balance => {
        const isSource = balance.sourceFirmId._id.toString() === firmId.toString();
        const counterpartFirm = isSource ? balance.targetFirmId : balance.sourceFirmId;

        // Calculate what this firm owes or is owed
        let owes = 0;
        let owed = 0;

        if (balance.currentBalance > 0) {
            // Source firm owes target firm
            if (isSource) {
                owes = balance.currentBalance;
            } else {
                owed = balance.currentBalance;
            }
        } else if (balance.currentBalance < 0) {
            // Target firm owes source firm
            if (isSource) {
                owed = Math.abs(balance.currentBalance);
            } else {
                owes = Math.abs(balance.currentBalance);
            }
        }

        return {
            balanceId: balance._id,
            counterpartFirm: {
                _id: counterpartFirm._id,
                name: counterpartFirm.name,
                nameArabic: counterpartFirm.nameArabic
            },
            owes,
            owed,
            netBalance: owed - owes,
            currency: balance.currency,
            totalTransactions: balance.totalTransactions,
            lastTransactionDate: balance.lastTransactionDate,
            needsReconciliation: balance.needsReconciliation(),
            status: balance.status
        };
    });

    res.json({
        success: true,
        data: {
            balances: enrichedBalances,
            summary: {
                totalReceivable: summary.totalReceivable,
                totalPayable: summary.totalPayable,
                netPosition: summary.netPosition
            }
        }
    });
});

/**
 * Get detailed balance with specific firm
 * GET /api/inter-company/balances/:firmId
 */
exports.getBalanceWithFirm = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const counterpartFirmId = sanitizeObjectId(req.params.firmId, 'Counterpart firm ID');

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    // IDOR Protection - prevent accessing balance with same firm
    if (firmId.toString() === counterpartFirmId.toString()) {
        throw CustomException('Cannot get balance with the same firm', 400);
    }

    // Verify counterpart firm exists
    const counterpartFirm = await Firm.findById(counterpartFirmId).select('name nameArabic');
    if (!counterpartFirm) {
        throw CustomException('Counterpart firm not found', 404);
    }

    // Get or create balance record
    const balance = await InterCompanyBalance.getOrCreate(firmId, counterpartFirmId);

    // Populate firm references
    await balance.populate([
        { path: 'sourceFirmId', select: 'name nameArabic' },
        { path: 'targetFirmId', select: 'name nameArabic' },
        { path: 'lastReconciledBy', select: 'firstName lastName email' }
    ]);

    // Get recent transactions
    const recentTransactions = await InterCompanyTransaction.find({
        $or: [
            { sourceFirmId: firmId, targetFirmId: counterpartFirmId },
            { sourceFirmId: counterpartFirmId, targetFirmId: firmId }
        ],
        status: { $in: ['confirmed', 'reconciled'] }
    })
        .sort({ transactionDate: -1 })
        .limit(10)
        .populate('createdBy', 'firstName lastName email')
        .lean();

    // Calculate direction-specific data
    const isSource = balance.sourceFirmId._id.toString() === firmId.toString();
    let owes = 0;
    let owed = 0;

    if (balance.currentBalance > 0) {
        if (isSource) {
            owes = balance.currentBalance;
        } else {
            owed = balance.currentBalance;
        }
    } else if (balance.currentBalance < 0) {
        if (isSource) {
            owed = Math.abs(balance.currentBalance);
        } else {
            owes = Math.abs(balance.currentBalance);
        }
    }

    res.json({
        success: true,
        data: {
            balance: {
                _id: balance._id,
                counterpartFirm,
                owes,
                owed,
                netBalance: owed - owes,
                currency: balance.currency,
                totalTransactions: balance.totalTransactions,
                totalDebits: balance.totalDebits,
                totalCredits: balance.totalCredits,
                lastTransactionDate: balance.lastTransactionDate,
                lastReconciledAt: balance.lastReconciledAt,
                lastReconciledBy: balance.lastReconciledBy,
                needsReconciliation: balance.needsReconciliation(),
                status: balance.status,
                creditLimit: balance.creditLimit,
                paymentTerms: balance.paymentTerms
            },
            recentTransactions: recentTransactions.map(txn => ({
                ...txn,
                direction: txn.sourceFirmId.toString() === firmId.toString() ? 'outgoing' : 'incoming'
            }))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// RECONCILIATION
// ═══════════════════════════════════════════════════════════════

/**
 * Get unreconciled transactions
 * GET /api/inter-company/reconciliation
 */
exports.getReconciliationItems = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { counterpartFirmId } = req.query;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    // Build query for confirmed but not reconciled transactions
    const query = {
        $or: [
            { sourceFirmId: firmId },
            { targetFirmId: firmId }
        ],
        status: 'confirmed'
    };

    // Filter by counterpart firm if specified
    if (counterpartFirmId) {
        // Sanitize counterpartFirmId if provided
        const sanitizedCounterpartFirmId = sanitizeObjectId(counterpartFirmId, 'Counterpart firm ID');
        query.$or = [
            { sourceFirmId: firmId, targetFirmId: sanitizedCounterpartFirmId },
            { sourceFirmId: sanitizedCounterpartFirmId, targetFirmId: firmId }
        ];
    }

    const unreconciledTransactions = await InterCompanyTransaction.find(query)
        .populate('sourceFirmId', 'name nameArabic')
        .populate('targetFirmId', 'name nameArabic')
        .populate('createdBy', 'firstName lastName email')
        .populate('confirmedBy', 'firstName lastName email')
        .sort({ transactionDate: -1 })
        .lean();

    // Group by counterpart firm
    const groupedByFirm = {};
    unreconciledTransactions.forEach(txn => {
        const counterpartId = txn.sourceFirmId._id.toString() === firmId.toString()
            ? txn.targetFirmId._id.toString()
            : txn.sourceFirmId._id.toString();

        if (!groupedByFirm[counterpartId]) {
            const counterpartFirm = txn.sourceFirmId._id.toString() === firmId.toString()
                ? txn.targetFirmId
                : txn.sourceFirmId;

            groupedByFirm[counterpartId] = {
                counterpartFirm,
                transactions: [],
                totalAmount: 0,
                count: 0
            };
        }

        groupedByFirm[counterpartId].transactions.push({
            ...txn,
            direction: txn.sourceFirmId._id.toString() === firmId.toString() ? 'outgoing' : 'incoming'
        });
        groupedByFirm[counterpartId].totalAmount += txn.amount;
        groupedByFirm[counterpartId].count += 1;
    });

    res.json({
        success: true,
        data: {
            items: Object.values(groupedByFirm),
            totalUnreconciled: unreconciledTransactions.length
        }
    });
});

/**
 * Reconcile transactions
 * POST /api/inter-company/reconciliation
 */
exports.reconcileTransactions = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;

    // Mass assignment protection
    const allowedFields = ['transactionIds', 'counterpartFirmId', 'notes'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);
    const { transactionIds, counterpartFirmId, notes } = sanitizedData;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    // Input validation
    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
        throw CustomException('Transaction IDs are required', 400);
    }

    // Limit number of transactions that can be reconciled at once
    if (transactionIds.length > 100) {
        throw CustomException('Cannot reconcile more than 100 transactions at once', 400);
    }

    // Validate and sanitize transaction IDs
    const sanitizedTransactionIds = transactionIds.map(id => {
        try {
            return sanitizeObjectId(id, 'Transaction ID');
        } catch (error) {
            throw CustomException('Invalid transaction IDs provided', 400);
        }
    });

    // Sanitize counterpartFirmId if provided
    let sanitizedCounterpartFirmId;
    if (counterpartFirmId) {
        sanitizedCounterpartFirmId = sanitizeObjectId(counterpartFirmId, 'Counterpart firm ID');
    }

    // Get transactions
    const transactions = await InterCompanyTransaction.find({
        _id: { $in: sanitizedTransactionIds },
        status: 'confirmed'
    });

    if (transactions.length === 0) {
        throw CustomException('No confirmed transactions found to reconcile', 404);
    }

    if (transactions.length !== sanitizedTransactionIds.length) {
        throw CustomException('Some transactions were not found or are not in confirmed status', 400);
    }

    // IDOR Protection - Verify all transactions involve the current firm
    const allValid = transactions.every(txn =>
        txn.sourceFirmId.toString() === firmId.toString() ||
        txn.targetFirmId.toString() === firmId.toString()
    );

    if (!allValid) {
        throw CustomException('Some transactions do not belong to your firm', 403);
    }

    // Use MongoDB transaction for reconciliation
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Mark transactions as reconciled
        await InterCompanyTransaction.updateMany(
            { _id: { $in: sanitizedTransactionIds } },
            {
                $set: {
                    status: 'reconciled',
                    reconciledAt: new Date(),
                    reconciledBy: userId
                }
            },
            { session }
        );

        // Update balance reconciliation status if counterpartFirmId provided
        if (sanitizedCounterpartFirmId) {
            const balance = await InterCompanyBalance.findOne({
                $or: [
                    { sourceFirmId: firmId, targetFirmId: sanitizedCounterpartFirmId },
                    { sourceFirmId: sanitizedCounterpartFirmId, targetFirmId: firmId }
                ]
            }).session(session);

            if (balance) {
                await balance.reconcile(userId, notes);
            }
        }

        await session.commitTransaction();

        res.json({
            success: true,
            message: `${transactions.length} transaction(s) reconciled successfully`,
            data: {
                reconciledCount: transactions.length,
                transactionIds: sanitizedTransactionIds
            }
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Update balances when a transaction is confirmed (with session support)
 */
async function updateBalancesWithSession(sourceFirmId, targetFirmId, amount, transactionId, session) {
    // Get or create balance record (consistent ordering)
    const [firmA, firmB] = [sourceFirmId.toString(), targetFirmId.toString()].sort();

    const balance = await InterCompanyBalance.findOneAndUpdate(
        {
            sourceFirmId: firmA,
            targetFirmId: firmB
        },
        {
            $inc: {
                currentBalance: sourceFirmId.toString() === firmA ? amount : -amount,
                totalDebits: sourceFirmId.toString() === firmA ? amount : 0,
                totalCredits: sourceFirmId.toString() === firmB ? amount : 0,
                totalTransactions: 1
            },
            $set: {
                lastTransactionDate: new Date(),
                lastTransactionId: transactionId
            }
        },
        {
            upsert: true,
            new: true,
            session
        }
    );

    return balance;
}

/**
 * Update balances when a transaction is confirmed (without session - for backward compatibility)
 */
async function updateBalances(sourceFirmId, targetFirmId, amount, transactionId) {
    return updateBalancesWithSession(sourceFirmId, targetFirmId, amount, transactionId, null);
}

/**
 * Reverse balance updates when a transaction is cancelled (with session support)
 */
async function reverseBalancesWithSession(sourceFirmId, targetFirmId, amount, session) {
    const [firmA, firmB] = [sourceFirmId.toString(), targetFirmId.toString()].sort();

    await InterCompanyBalance.findOneAndUpdate(
        {
            sourceFirmId: firmA,
            targetFirmId: firmB
        },
        {
            $inc: {
                currentBalance: sourceFirmId.toString() === firmA ? -amount : amount,
                totalDebits: sourceFirmId.toString() === firmA ? -amount : 0,
                totalCredits: sourceFirmId.toString() === firmB ? -amount : 0,
                totalTransactions: -1
            }
        },
        {
            session
        }
    );
}

/**
 * Reverse balance updates when a transaction is cancelled (without session - for backward compatibility)
 */
async function reverseBalances(sourceFirmId, targetFirmId, amount) {
    return reverseBalancesWithSession(sourceFirmId, targetFirmId, amount, null);
}
