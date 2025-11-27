const { BankTransfer, BankAccount, BillingActivity } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');

// Create transfer
const createTransfer = asyncHandler(async (req, res) => {
    const {
        fromAccountId,
        toAccountId,
        amount,
        date,
        exchangeRate,
        fee,
        reference,
        description
    } = req.body;

    const lawyerId = req.userID;

    if (!fromAccountId || !toAccountId) {
        throw CustomException('Source and destination accounts are required', 400);
    }

    if (fromAccountId === toAccountId) {
        throw CustomException('Source and destination accounts must be different', 400);
    }

    if (!amount || amount <= 0) {
        throw CustomException('Valid amount is required', 400);
    }

    // Validate accounts exist and belong to user
    const fromAccount = await BankAccount.findById(fromAccountId);
    const toAccount = await BankAccount.findById(toAccountId);

    if (!fromAccount || fromAccount.lawyerId.toString() !== lawyerId) {
        throw CustomException('Source account not found or access denied', 404);
    }

    if (!toAccount || toAccount.lawyerId.toString() !== lawyerId) {
        throw CustomException('Destination account not found or access denied', 404);
    }

    // Check sufficient balance
    const totalDeduction = amount + (fee || 0);
    if (fromAccount.availableBalance < totalDeduction) {
        throw CustomException('Insufficient balance in source account', 400);
    }

    const transfer = await BankTransfer.create({
        fromAccountId,
        toAccountId,
        amount,
        fromCurrency: fromAccount.currency,
        toCurrency: toAccount.currency,
        exchangeRate: exchangeRate || 1,
        fee: fee || 0,
        date: date || new Date(),
        reference,
        description,
        status: 'pending',
        createdBy: lawyerId,
        lawyerId
    });

    // Execute the transfer immediately
    const executedTransfer = await BankTransfer.executeTransfer(transfer._id);

    const populatedTransfer = await BankTransfer.findById(executedTransfer._id)
        .populate('fromAccountId', 'name bankName accountNumber')
        .populate('toAccountId', 'name bankName accountNumber');

    await BillingActivity.logActivity({
        activityType: 'bank_transfer_created',
        userId: lawyerId,
        relatedModel: 'BankTransfer',
        relatedId: transfer._id,
        description: `Transfer ${transfer.transferNumber} created for ${amount} ${fromAccount.currency}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    return res.status(201).json({
        success: true,
        message: 'Transfer completed successfully',
        transfer: populatedTransfer
    });
});

// Get all transfers
const getTransfers = asyncHandler(async (req, res) => {
    const {
        fromAccountId,
        toAccountId,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 20
    } = req.query;

    const lawyerId = req.userID;
    const filters = { lawyerId };

    if (fromAccountId) filters.fromAccountId = fromAccountId;
    if (toAccountId) filters.toAccountId = toAccountId;
    if (status) filters.status = status;

    if (startDate || endDate) {
        filters.date = {};
        if (startDate) filters.date.$gte = new Date(startDate);
        if (endDate) filters.date.$lte = new Date(endDate);
    }

    const transfers = await BankTransfer.find(filters)
        .populate('fromAccountId', 'name bankName accountNumber')
        .populate('toAccountId', 'name bankName accountNumber')
        .populate('createdBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName')
        .sort({ date: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await BankTransfer.countDocuments(filters);

    return res.json({
        success: true,
        transfers,
        total
    });
});

// Get single transfer
const getTransfer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const transfer = await BankTransfer.findById(id)
        .populate('fromAccountId', 'name bankName accountNumber currency')
        .populate('toAccountId', 'name bankName accountNumber currency')
        .populate('createdBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName');

    if (!transfer) {
        throw CustomException('Transfer not found', 404);
    }

    if (transfer.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this transfer', 403);
    }

    return res.json({
        success: true,
        transfer
    });
});

// Cancel transfer
const cancelTransfer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const lawyerId = req.userID;

    const transfer = await BankTransfer.findById(id);

    if (!transfer) {
        throw CustomException('Transfer not found', 404);
    }

    if (transfer.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this transfer', 403);
    }

    if (transfer.status === 'cancelled') {
        throw CustomException('Transfer already cancelled', 400);
    }

    const cancelledTransfer = await BankTransfer.cancelTransfer(id, reason);

    const populatedTransfer = await BankTransfer.findById(cancelledTransfer._id)
        .populate('fromAccountId', 'name bankName')
        .populate('toAccountId', 'name bankName');

    await BillingActivity.logActivity({
        activityType: 'bank_transfer_cancelled',
        userId: lawyerId,
        relatedModel: 'BankTransfer',
        relatedId: transfer._id,
        description: `Transfer ${transfer.transferNumber} cancelled`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    return res.json({
        success: true,
        message: 'Transfer cancelled successfully',
        transfer: populatedTransfer
    });
});

module.exports = {
    createTransfer,
    getTransfers,
    getTransfer,
    cancelTransfer
};
