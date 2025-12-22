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
        query.$or = [
            { sourceFirmId: firmId, targetFirmId: counterpartFirmId },
            { sourceFirmId: counterpartFirmId, targetFirmId: firmId }
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
    } = req.body;

    // Validate required fields
    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    if (!targetFirmId) {
        throw CustomException('Target firm ID is required', 400);
    }

    if (!transactionType) {
        throw CustomException('Transaction type is required', 400);
    }

    if (!amount || amount <= 0) {
        throw CustomException('Amount must be greater than 0', 400);
    }

    if (!transactionDate) {
        throw CustomException('Transaction date is required', 400);
    }

    if (firmId.toString() === targetFirmId.toString()) {
        throw CustomException('Cannot create transaction to the same firm', 400);
    }

    // Verify target firm exists
    const targetFirm = await Firm.findById(targetFirmId);
    if (!targetFirm) {
        throw CustomException('Target firm not found', 404);
    }

    // Create transaction
    const transaction = await InterCompanyTransaction.create({
        sourceFirmId: firmId,
        targetFirmId,
        transactionType,
        amount,
        currency,
        exchangeRate,
        transactionDate: new Date(transactionDate),
        reference,
        description,
        sourceDocumentType,
        sourceDocumentId,
        status: autoConfirm ? 'confirmed' : 'draft',
        createdBy: userId,
        confirmedBy: autoConfirm ? userId : null,
        confirmedAt: autoConfirm ? new Date() : null
    });

    // If auto-confirm, update balances
    if (autoConfirm) {
        await updateBalances(firmId, targetFirmId, amount, transaction._id);
    }

    // Populate references
    const populatedTransaction = await InterCompanyTransaction.findById(transaction._id)
        .populate('sourceFirmId', 'name nameArabic')
        .populate('targetFirmId', 'name nameArabic')
        .populate('createdBy', 'firstName lastName email');

    res.status(201).json({
        success: true,
        message: 'Inter-company transaction created successfully',
        data: populatedTransaction
    });
});

/**
 * Get single transaction
 * GET /api/inter-company/transactions/:id
 */
exports.getTransaction = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw CustomException('Invalid transaction ID', 400);
    }

    const transaction = await InterCompanyTransaction.findById(id)
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
    const { id } = req.params;
    const {
        transactionType,
        amount,
        currency,
        exchangeRate,
        transactionDate,
        reference,
        description
    } = req.body;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw CustomException('Invalid transaction ID', 400);
    }

    const transaction = await InterCompanyTransaction.findById(id);

    if (!transaction) {
        throw CustomException('Transaction not found', 404);
    }

    // Only source firm can update
    if (transaction.sourceFirmId.toString() !== firmId.toString()) {
        throw CustomException('Only the source firm can update this transaction', 403);
    }

    // Can only update draft or pending transactions
    if (!['draft', 'pending'].includes(transaction.status)) {
        throw CustomException('Cannot update confirmed, reconciled, or cancelled transactions', 400);
    }

    // Update fields
    if (transactionType) transaction.transactionType = transactionType;
    if (amount) transaction.amount = amount;
    if (currency) transaction.currency = currency;
    if (exchangeRate) transaction.exchangeRate = exchangeRate;
    if (transactionDate) transaction.transactionDate = new Date(transactionDate);
    if (reference !== undefined) transaction.reference = reference;
    if (description !== undefined) transaction.description = description;

    await transaction.save();

    // Populate and return
    const updatedTransaction = await InterCompanyTransaction.findById(id)
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
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw CustomException('Invalid transaction ID', 400);
    }

    const transaction = await InterCompanyTransaction.findById(id);

    if (!transaction) {
        throw CustomException('Transaction not found', 404);
    }

    // Either firm can confirm
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

    // Update transaction status
    transaction.status = 'confirmed';
    transaction.confirmedBy = userId;
    transaction.confirmedAt = new Date();
    await transaction.save();

    // Update balances
    await updateBalances(
        transaction.sourceFirmId,
        transaction.targetFirmId,
        transaction.amount,
        transaction._id
    );

    // TODO: Send notification to counterpart firm

    const confirmedTransaction = await InterCompanyTransaction.findById(id)
        .populate('sourceFirmId', 'name nameArabic')
        .populate('targetFirmId', 'name nameArabic')
        .populate('confirmedBy', 'firstName lastName email');

    res.json({
        success: true,
        message: 'Transaction confirmed successfully',
        data: confirmedTransaction
    });
});

/**
 * Cancel transaction
 * POST /api/inter-company/transactions/:id/cancel
 */
exports.cancelTransaction = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { id } = req.params;
    const { reason } = req.body;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw CustomException('Invalid transaction ID', 400);
    }

    const transaction = await InterCompanyTransaction.findById(id);

    if (!transaction) {
        throw CustomException('Transaction not found', 404);
    }

    // Only source firm can cancel
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

    // If transaction was confirmed, reverse the balance updates
    if (transaction.status === 'confirmed') {
        await reverseBalances(
            transaction.sourceFirmId,
            transaction.targetFirmId,
            transaction.amount
        );
    }

    // Update transaction status
    transaction.status = 'cancelled';
    if (reason) {
        transaction.description = (transaction.description || '') + `\nCancellation reason: ${reason}`;
    }
    await transaction.save();

    const cancelledTransaction = await InterCompanyTransaction.findById(id)
        .populate('sourceFirmId', 'name nameArabic')
        .populate('targetFirmId', 'name nameArabic');

    res.json({
        success: true,
        message: 'Transaction cancelled successfully',
        data: cancelledTransaction
    });
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
    const { firmId: counterpartFirmId } = req.params;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    if (!mongoose.Types.ObjectId.isValid(counterpartFirmId)) {
        throw CustomException('Invalid counterpart firm ID', 400);
    }

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
        query.$or = [
            { sourceFirmId: firmId, targetFirmId: counterpartFirmId },
            { sourceFirmId: counterpartFirmId, targetFirmId: firmId }
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
    const { transactionIds, counterpartFirmId, notes } = req.body;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
        throw CustomException('Transaction IDs are required', 400);
    }

    // Validate transaction IDs
    const invalidIds = transactionIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
        throw CustomException('Invalid transaction IDs provided', 400);
    }

    // Get transactions
    const transactions = await InterCompanyTransaction.find({
        _id: { $in: transactionIds },
        status: 'confirmed'
    });

    if (transactions.length === 0) {
        throw CustomException('No confirmed transactions found to reconcile', 404);
    }

    if (transactions.length !== transactionIds.length) {
        throw CustomException('Some transactions were not found or are not in confirmed status', 400);
    }

    // Verify all transactions involve the current firm
    const allValid = transactions.every(txn =>
        txn.sourceFirmId.toString() === firmId.toString() ||
        txn.targetFirmId.toString() === firmId.toString()
    );

    if (!allValid) {
        throw CustomException('Some transactions do not belong to your firm', 403);
    }

    // Mark transactions as reconciled
    await InterCompanyTransaction.updateMany(
        { _id: { $in: transactionIds } },
        {
            $set: {
                status: 'reconciled',
                reconciledAt: new Date(),
                reconciledBy: userId
            }
        }
    );

    // Update balance reconciliation status if counterpartFirmId provided
    if (counterpartFirmId) {
        const balance = await InterCompanyBalance.findOne({
            $or: [
                { sourceFirmId: firmId, targetFirmId: counterpartFirmId },
                { sourceFirmId: counterpartFirmId, targetFirmId: firmId }
            ]
        });

        if (balance) {
            await balance.reconcile(userId, notes);
        }
    }

    res.json({
        success: true,
        message: `${transactions.length} transaction(s) reconciled successfully`,
        data: {
            reconciledCount: transactions.length,
            transactionIds
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Update balances when a transaction is confirmed
 */
async function updateBalances(sourceFirmId, targetFirmId, amount, transactionId) {
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
            new: true
        }
    );

    return balance;
}

/**
 * Reverse balance updates when a transaction is cancelled
 */
async function reverseBalances(sourceFirmId, targetFirmId, amount) {
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
        }
    );
}
