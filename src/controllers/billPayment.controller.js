const mongoose = require('mongoose');
const { BillPayment, Bill, Vendor, BankAccount, BillingActivity } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Create bill payment
const createPayment = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId; // IDOR Protection: Get user's firmId from auth middleware

    // Mass Assignment Protection: Only allow specific fields
    const allowedFields = [
        'billId',
        'amount',
        'paymentDate',
        'paymentMethod',
        'bankAccountId',
        'reference',
        'checkNumber',
        'notes'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const {
        billId,
        amount,
        paymentDate,
        paymentMethod,
        bankAccountId,
        reference,
        checkNumber,
        notes
    } = safeData;

    // Input Validation: Sanitize ObjectId
    const safeBillId = sanitizeObjectId(billId);
    if (!safeBillId) {
        throw CustomException('Valid Bill ID is required', 400);
    }

    // Amount Validation: Enhanced checks
    if (!amount) {
        throw CustomException('Payment amount is required', 400);
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
        throw CustomException('Payment amount must be a positive number', 400);
    }

    if (numAmount > 999999999.99) {
        throw CustomException('Payment amount exceeds maximum allowed limit', 400);
    }

    // Round to 2 decimal places to prevent precision issues
    const validatedAmount = Math.round(numAmount * 100) / 100;

    // Payment Method Validation: Verify against allowed enum values
    const validPaymentMethods = ['bank_transfer', 'cash', 'check', 'credit_card', 'debit_card', 'online'];
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
        throw CustomException(`Payment method must be one of: ${validPaymentMethods.join(', ')}`, 400);
    }

    // Payment Method Specific Validation
    if (paymentMethod === 'bank_transfer' && !bankAccountId) {
        throw CustomException('Bank account is required for bank transfer payments', 400);
    }

    if (paymentMethod === 'check' && !checkNumber) {
        throw CustomException('Check number is required for check payments', 400);
    }

    // Validate bill exists and belongs to user
    const bill = await Bill.findById(safeBillId).populate('vendorId', 'name');

    // IDOR Protection: Verify bill ownership
    if (!bill) {
        throw CustomException('Bill not found', 404);
    }

    if (bill.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this bill', 403);
    }

    // IDOR Protection: Verify firmId ownership (multi-tenancy)
    if (firmId && bill.firmId && bill.firmId.toString() !== firmId.toString()) {
        throw CustomException('You do not have access to this bill', 403);
    }

    // Bill Status Validation
    if (bill.status === 'cancelled') {
        throw CustomException('Cannot pay a cancelled bill', 400);
    }

    if (bill.status === 'paid') {
        throw CustomException('Bill is already fully paid', 400);
    }

    // Overpayment Prevention: Ensure payment doesn't exceed balance due
    if (validatedAmount > bill.balanceDue) {
        throw CustomException(
            `Payment amount (${validatedAmount}) exceeds balance due (${bill.balanceDue}). ` +
            `Please reduce the payment amount to avoid overpayment.`,
            400
        );
    }

    // Validate and verify bank account if provided
    let validatedBankAccountId = null;
    if (bankAccountId) {
        const safeBankAccountId = sanitizeObjectId(bankAccountId);
        if (!safeBankAccountId) {
            throw CustomException('Invalid bank account ID', 400);
        }

        const bankAccountQuery = { _id: safeBankAccountId, lawyerId };
        if (firmId) {
            bankAccountQuery.firmId = firmId;
        }
        const bankAccount = await BankAccount.findOne(bankAccountQuery);

        // IDOR Protection: Verify bank account ownership
        if (!bankAccount) {
            throw CustomException('Bank account not found', 404);
        }

        // Insufficient Funds Check
        if (bankAccount.availableBalance < validatedAmount) {
            throw CustomException(
                `Insufficient balance in bank account. Available: ${bankAccount.availableBalance}, Required: ${validatedAmount}`,
                400
            );
        }

        validatedBankAccountId = safeBankAccountId;
    }

    // Use MongoDB Transaction for atomic operation
    const session = await mongoose.startSession();
    let payment = null;

    try {
        await session.startTransaction();

        // Create payment record
        const paymentData = {
            billId: safeBillId,
            vendorId: bill.vendorId._id,
            amount: validatedAmount,
            currency: bill.currency,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            paymentMethod,
            bankAccountId: validatedBankAccountId,
            reference: reference ? String(reference).trim() : undefined,
            checkNumber: checkNumber ? String(checkNumber).trim() : undefined,
            notes: notes ? String(notes).trim().substring(0, 1000) : undefined,
            status: 'completed',
            createdBy: lawyerId,
            lawyerId
        };

        // Add firmId if present (multi-tenancy)
        if (firmId) {
            paymentData.firmId = firmId;
        }

        const [createdPayment] = await BillPayment.create([paymentData], { session });
        payment = createdPayment;

        // Update bill amounts within transaction
        bill.amountPaid = (bill.amountPaid || 0) + validatedAmount;
        bill.balanceDue = bill.totalAmount - bill.amountPaid;

        if (bill.balanceDue <= 0) {
            bill.status = 'paid';
            bill.paidDate = new Date();
        } else if (bill.amountPaid > 0) {
            bill.status = 'partial';
        }

        bill.history.push({
            action: 'paid',
            performedBy: lawyerId,
            performedAt: new Date(),
            details: {
                paymentId: payment._id,
                paymentNumber: payment.paymentNumber,
                amount: validatedAmount
            }
        });

        await bill.save({ session });

        // Deduct from bank account if specified
        if (validatedBankAccountId) {
            const bankAccountUpdateQuery = { _id: validatedBankAccountId, lawyerId };
            if (firmId) {
                bankAccountUpdateQuery.firmId = firmId;
            }
            await BankAccount.findOneAndUpdate(
                bankAccountUpdateQuery,
                {
                    $inc: {
                        balance: -validatedAmount,
                        availableBalance: -validatedAmount
                    }
                },
                { session }
            );
        }

        // Commit transaction
        await session.commitTransaction();

    } catch (error) {
        // Rollback on any error
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }

    // Fetch populated payment after successful transaction
    const paymentQuery = { _id: payment._id, lawyerId };
    if (firmId) {
        paymentQuery.firmId = firmId;
    }
    const populatedPayment = await BillPayment.findOne(paymentQuery)
        .populate('billId', 'billNumber totalAmount')
        .populate('vendorId', 'name vendorId')
        .populate('bankAccountId', 'name bankName');

    // Log activity (outside transaction for performance)
    await BillingActivity.logActivity({
        activityType: 'bill_payment_created',
        userId: lawyerId,
        relatedModel: 'BillPayment',
        relatedId: payment._id,
        description: `Payment ${payment.paymentNumber} for ${validatedAmount} ${bill.currency} on bill ${bill.billNumber}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    return res.status(201).json({
        success: true,
        message: 'Payment recorded successfully',
        payment: populatedPayment
    });
});

// Get bill payments
const getPayments = asyncHandler(async (req, res) => {
    const {
        billId,
        vendorId,
        startDate,
        endDate,
        page = 1,
        limit = 20
    } = req.query;

    const lawyerId = req.userID;
    const firmId = req.firmId; // IDOR Protection: Get user's firmId from auth middleware
    const filters = { lawyerId };

    // Add firmId filter for multi-tenancy
    if (firmId) {
        filters.firmId = firmId;
    }

    // Input Validation: Sanitize ObjectIds
    if (billId) {
        const safeBillId = sanitizeObjectId(billId);
        if (safeBillId) {
            filters.billId = safeBillId;
        }
    }

    if (vendorId) {
        const safeVendorId = sanitizeObjectId(vendorId);
        if (safeVendorId) {
            filters.vendorId = safeVendorId;
        }
    }

    // Date Range Validation
    if (startDate || endDate) {
        filters.paymentDate = {};
        if (startDate) {
            const start = new Date(startDate);
            if (!isNaN(start.getTime())) {
                filters.paymentDate.$gte = start;
            }
        }
        if (endDate) {
            const end = new Date(endDate);
            if (!isNaN(end.getTime())) {
                filters.paymentDate.$lte = end;
            }
        }
    }

    // Pagination Validation
    const validPage = Math.max(1, parseInt(page) || 1);
    const validLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (validPage - 1) * validLimit;

    const payments = await BillPayment.find(filters)
        .populate('billId', 'billNumber totalAmount')
        .populate('vendorId', 'name vendorId')
        .populate('bankAccountId', 'name bankName')
        .sort({ paymentDate: -1, createdAt: -1 })
        .limit(validLimit)
        .skip(skip);

    const total = await BillPayment.countDocuments(filters);

    return res.json({
        success: true,
        payments,
        total,
        page: validPage,
        limit: validLimit
    });
});

// Get single payment
const getPayment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId; // IDOR Protection: Get user's firmId from auth middleware

    // Input Validation: Sanitize ObjectId
    const safePaymentId = sanitizeObjectId(id);
    if (!safePaymentId) {
        throw CustomException('Invalid payment ID', 400);
    }

    const paymentQuery = { _id: safePaymentId, lawyerId };
    if (firmId) {
        paymentQuery.firmId = firmId;
    }
    const payment = await BillPayment.findOne(paymentQuery)
        .populate('billId', 'billNumber totalAmount balanceDue status')
        .populate('vendorId', 'name vendorId email')
        .populate('bankAccountId', 'name bankName accountNumber')
        .populate('createdBy', 'firstName lastName');

    if (!payment) {
        throw CustomException('Payment not found', 404);
    }

    return res.json({
        success: true,
        payment
    });
});

// Cancel payment
const cancelPayment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId; // IDOR Protection: Get user's firmId from auth middleware

    // Mass Assignment Protection: Only allow reason field
    const safeData = pickAllowedFields(req.body, ['reason']);
    const { reason } = safeData;

    // Input Validation: Sanitize ObjectId
    const safePaymentId = sanitizeObjectId(id);
    if (!safePaymentId) {
        throw CustomException('Invalid payment ID', 400);
    }

    const paymentQuery = { _id: safePaymentId, lawyerId };
    if (firmId) {
        paymentQuery.firmId = firmId;
    }
    const payment = await BillPayment.findOne(paymentQuery);

    if (!payment) {
        throw CustomException('Payment not found', 404);
    }

    try {
        const cancelledPayment = await BillPayment.cancelPayment(safePaymentId, reason, lawyerId);

        const cancelledPaymentQuery = { _id: cancelledPayment._id, lawyerId };
        if (firmId) {
            cancelledPaymentQuery.firmId = firmId;
        }
        const populatedPayment = await BillPayment.findOne(cancelledPaymentQuery)
            .populate('billId', 'billNumber totalAmount balanceDue status')
            .populate('vendorId', 'name vendorId');

        await BillingActivity.logActivity({
            activityType: 'bill_payment_cancelled',
            userId: lawyerId,
            relatedModel: 'BillPayment',
            relatedId: payment._id,
            description: `Payment ${payment.paymentNumber} cancelled`,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        return res.json({
            success: true,
            message: 'Payment cancelled successfully',
            payment: populatedPayment
        });
    } catch (error) {
        throw CustomException(error.message, 400);
    }
});

module.exports = {
    createPayment,
    getPayments,
    getPayment,
    cancelPayment
};
