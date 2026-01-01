const { BankTransfer, BankAccount } = require('../models');
const QueueService = require('../services/queue.service');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const mongoose = require('mongoose');

// Transfer limits configuration
const TRANSFER_LIMITS = {
    MIN_AMOUNT: 0.01,
    MAX_AMOUNT: 1000000,
    MAX_DAILY_AMOUNT: 5000000,
    MAX_FEE_PERCENTAGE: 10
};

// Create transfer
const createTransfer = asyncHandler(async (req, res) => {
    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'fromAccountId',
        'toAccountId',
        'amount',
        'date',
        'exchangeRate',
        'fee',
        'reference',
        'description'
    ];
    const transferData = pickAllowedFields(req.body, allowedFields);

    const {
        fromAccountId,
        toAccountId,
        amount,
        date,
        exchangeRate,
        fee,
        reference,
        description
    } = transferData;

    const lawyerId = req.userID;

    // Sanitize and validate ObjectIds
    const sanitizedFromAccountId = sanitizeObjectId(fromAccountId);
    const sanitizedToAccountId = sanitizeObjectId(toAccountId);

    if (!sanitizedFromAccountId || !sanitizedToAccountId) {
        throw CustomException('Valid source and destination account IDs are required', 400);
    }

    if (sanitizedFromAccountId === sanitizedToAccountId) {
        throw CustomException('Source and destination accounts must be different', 400);
    }

    // Amount validation with transfer limits
    if (!amount || typeof amount !== 'number' || isNaN(amount)) {
        throw CustomException('Valid amount is required', 400);
    }

    if (amount < TRANSFER_LIMITS.MIN_AMOUNT) {
        throw CustomException(`Amount must be at least ${TRANSFER_LIMITS.MIN_AMOUNT}`, 400);
    }

    if (amount > TRANSFER_LIMITS.MAX_AMOUNT) {
        throw CustomException(`Amount cannot exceed ${TRANSFER_LIMITS.MAX_AMOUNT}`, 400);
    }

    // Validate fee
    if (fee !== undefined && fee !== null) {
        if (typeof fee !== 'number' || isNaN(fee) || fee < 0) {
            throw CustomException('Fee must be a valid positive number', 400);
        }

        const feePercentage = (fee / amount) * 100;
        if (feePercentage > TRANSFER_LIMITS.MAX_FEE_PERCENTAGE) {
            throw CustomException(`Fee cannot exceed ${TRANSFER_LIMITS.MAX_FEE_PERCENTAGE}% of transfer amount`, 400);
        }
    }

    // Validate exchange rate
    if (exchangeRate !== undefined && exchangeRate !== null) {
        if (typeof exchangeRate !== 'number' || isNaN(exchangeRate) || exchangeRate <= 0) {
            throw CustomException('Exchange rate must be a valid positive number', 400);
        }
    }

    // Start MongoDB transaction for atomic operation
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // IDOR Protection: Validate accounts exist and belong to firm
        const fromAccount = await BankAccount.findOne({
            _id: sanitizedFromAccountId,
            ...req.firmQuery
        }).session(session);
        const toAccount = await BankAccount.findOne({
            _id: sanitizedToAccountId,
            ...req.firmQuery
        }).session(session);

        if (!fromAccount) {
            throw CustomException('Source account not found', 404);
        }

        if (!toAccount) {
            throw CustomException('Destination account not found', 404);
        }

        // Additional IDOR Protection: Verify account ownership by lawyerId
        if (fromAccount.lawyerId.toString() !== lawyerId) {
            throw CustomException('Source account not found', 404);
        }

        if (toAccount.lawyerId.toString() !== lawyerId) {
            throw CustomException('Destination account not found', 404);
        }

        // Validate account status
        if (!fromAccount.isActive) {
            throw CustomException('Source account is not active', 400);
        }

        if (!toAccount.isActive) {
            throw CustomException('Destination account is not active', 400);
        }

        // Check sufficient balance
        const totalDeduction = amount + (fee || 0);
        if (fromAccount.availableBalance < totalDeduction) {
            throw CustomException('Insufficient balance in source account', 400);
        }

        // Check daily transfer limit
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dailyTransfers = await BankTransfer.aggregate([
            {
                $match: {
                    fromAccountId: new mongoose.Types.ObjectId(sanitizedFromAccountId),
                    status: { $in: ['completed', 'pending'] },
                    createdAt: { $gte: today }
                }
            },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]).session(session);

        const dailyTotal = dailyTransfers[0]?.totalAmount || 0;
        if (dailyTotal + amount > TRANSFER_LIMITS.MAX_DAILY_AMOUNT) {
            throw CustomException(`Daily transfer limit of ${TRANSFER_LIMITS.MAX_DAILY_AMOUNT} would be exceeded`, 400);
        }

        // Create transfer with only allowed fields and firmId isolation
        const transfer = await BankTransfer.create([{
            fromAccountId: sanitizedFromAccountId,
            toAccountId: sanitizedToAccountId,
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
            lawyerId,
            firmId: req.firmId
        }], { session });

        // Execute the transfer immediately within transaction
        const executedTransfer = await BankTransfer.executeTransfer(transfer[0]._id, session);

        // Commit transaction
        await session.commitTransaction();

        // Query populated transfer after transaction commits
        const populatedTransfer = await BankTransfer.findOne({
            _id: executedTransfer._id,
            ...req.firmQuery
        })
            .populate('fromAccountId', 'name bankName accountNumber')
            .populate('toAccountId', 'name bankName accountNumber');

        // Fire-and-forget: Queue the billing activity log
        QueueService.logBillingActivity({
            activityType: 'bank_transfer_created',
            userId: lawyerId,
            relatedModel: 'BankTransfer',
            relatedId: transfer[0]._id,
            description: `Transfer ${transfer[0].transferNumber} created for ${amount} ${fromAccount.currency}`,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        return res.status(201).json({
            success: true,
            message: 'Transfer completed successfully',
            transfer: populatedTransfer
        });
    } catch (error) {
        // Rollback transaction on error
        await session.abortTransaction();
        throw error;
    } finally {
        // End session
        session.endSession();
    }
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
    const filters = { lawyerId, ...req.firmQuery };

    // Sanitize ObjectIds for IDOR protection
    if (fromAccountId) {
        const sanitizedFromAccountId = sanitizeObjectId(fromAccountId);
        if (!sanitizedFromAccountId) {
            throw CustomException('Invalid fromAccountId format', 400);
        }

        // Verify account ownership
        const fromAccount = await BankAccount.findOne({
            _id: sanitizedFromAccountId,
            ...req.firmQuery
        });
        if (!fromAccount || fromAccount.lawyerId.toString() !== lawyerId) {
            throw CustomException('Source account not found', 404);
        }

        filters.fromAccountId = sanitizedFromAccountId;
    }

    if (toAccountId) {
        const sanitizedToAccountId = sanitizeObjectId(toAccountId);
        if (!sanitizedToAccountId) {
            throw CustomException('Invalid toAccountId format', 400);
        }

        // Verify account ownership
        const toAccount = await BankAccount.findOne({
            _id: sanitizedToAccountId,
            ...req.firmQuery
        });
        if (!toAccount || toAccount.lawyerId.toString() !== lawyerId) {
            throw CustomException('Destination account not found', 404);
        }

        filters.toAccountId = sanitizedToAccountId;
    }

    // Validate status
    const validStatuses = ['pending', 'completed', 'cancelled', 'failed'];
    if (status && !validStatuses.includes(status)) {
        throw CustomException('Invalid status value', 400);
    }
    if (status) {
        filters.status = status;
    }

    // Validate and sanitize date range
    if (startDate || endDate) {
        filters.date = {};

        if (startDate) {
            const parsedStartDate = new Date(startDate);
            if (isNaN(parsedStartDate.getTime())) {
                throw CustomException('Invalid startDate format', 400);
            }
            filters.date.$gte = parsedStartDate;
        }

        if (endDate) {
            const parsedEndDate = new Date(endDate);
            if (isNaN(parsedEndDate.getTime())) {
                throw CustomException('Invalid endDate format', 400);
            }
            filters.date.$lte = parsedEndDate;
        }
    }

    // Sanitize pagination parameters
    const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const safePage = Math.max(parseInt(page) || 1, 1);

    const transfers = await BankTransfer.find(filters)
        .populate('fromAccountId', 'name bankName accountNumber')
        .populate('toAccountId', 'name bankName accountNumber')
        .populate('createdBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName')
        .sort({ date: -1, createdAt: -1 })
        .limit(safeLimit)
        .skip((safePage - 1) * safeLimit);

    const total = await BankTransfer.countDocuments(filters);

    return res.json({
        success: true,
        transfers,
        total,
        page: safePage,
        limit: safeLimit
    });
});

// Get single transfer
const getTransfer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    // Sanitize ObjectId for IDOR protection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid transfer ID format', 400);
    }

    const transfer = await BankTransfer.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    })
        .populate('fromAccountId', 'name bankName accountNumber currency')
        .populate('toAccountId', 'name bankName accountNumber currency')
        .populate('createdBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName');

    if (!transfer) {
        throw CustomException('Transfer not found', 404);
    }

    // IDOR Protection: Verify transfer ownership by lawyerId
    if (transfer.lawyerId.toString() !== lawyerId) {
        throw CustomException('Transfer not found', 404);
    }

    return res.json({
        success: true,
        transfer
    });
});

// Cancel transfer
const cancelTransfer = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Mass assignment protection - only allow reason field
    const cancelData = pickAllowedFields(req.body, ['reason']);
    const { reason } = cancelData;

    const lawyerId = req.userID;

    // Sanitize ObjectId for IDOR protection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid transfer ID format', 400);
    }

    const transfer = await BankTransfer.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    });

    if (!transfer) {
        throw CustomException('Transfer not found', 404);
    }

    // IDOR Protection: Verify transfer ownership by lawyerId
    if (transfer.lawyerId.toString() !== lawyerId) {
        throw CustomException('Transfer not found', 404);
    }

    if (transfer.status === 'cancelled') {
        throw CustomException('Transfer already cancelled', 400);
    }

    if (transfer.status === 'completed') {
        throw CustomException('Cannot cancel completed transfer', 400);
    }

    const cancelledTransfer = await BankTransfer.cancelTransfer(sanitizedId, reason);

    const populatedTransfer = await BankTransfer.findOne({
        _id: cancelledTransfer._id,
        ...req.firmQuery
    })
        .populate('fromAccountId', 'name bankName')
        .populate('toAccountId', 'name bankName');

    // Fire-and-forget: Queue the billing activity log
    QueueService.logBillingActivity({
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
