const { BankReconciliation, BankAccount, BillingActivity } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');

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

module.exports = {
    createReconciliation,
    getReconciliations,
    getReconciliation,
    clearTransaction,
    unclearTransaction,
    completeReconciliation,
    cancelReconciliation
};
