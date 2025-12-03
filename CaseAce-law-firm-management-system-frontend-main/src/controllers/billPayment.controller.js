const { BillPayment, Bill, Vendor, BankAccount, BillingActivity } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');

// Create bill payment
const createPayment = asyncHandler(async (req, res) => {
    const {
        billId,
        amount,
        paymentDate,
        paymentMethod,
        bankAccountId,
        reference,
        checkNumber,
        notes
    } = req.body;

    const lawyerId = req.userID;

    if (!billId) {
        throw CustomException('Bill ID is required', 400);
    }

    if (!amount || amount <= 0) {
        throw CustomException('Valid amount is required', 400);
    }

    if (!paymentMethod) {
        throw CustomException('Payment method is required', 400);
    }

    // Validate bill exists and belongs to user
    const bill = await Bill.findById(billId).populate('vendorId', 'name');
    if (!bill || bill.lawyerId.toString() !== lawyerId) {
        throw CustomException('Bill not found or access denied', 404);
    }

    if (bill.status === 'cancelled') {
        throw CustomException('Cannot pay a cancelled bill', 400);
    }

    if (bill.status === 'paid') {
        throw CustomException('Bill is already fully paid', 400);
    }

    if (amount > bill.balanceDue) {
        throw CustomException(`Payment amount exceeds balance due (${bill.balanceDue})`, 400);
    }

    // Validate bank account if provided
    if (bankAccountId) {
        const bankAccount = await BankAccount.findById(bankAccountId);
        if (!bankAccount || bankAccount.lawyerId.toString() !== lawyerId) {
            throw CustomException('Bank account not found or access denied', 404);
        }

        if (bankAccount.availableBalance < amount) {
            throw CustomException('Insufficient balance in bank account', 400);
        }
    }

    const payment = await BillPayment.create({
        billId,
        vendorId: bill.vendorId._id,
        amount,
        currency: bill.currency,
        paymentDate: paymentDate || new Date(),
        paymentMethod,
        bankAccountId,
        reference,
        checkNumber,
        notes,
        status: 'completed',
        createdBy: lawyerId,
        lawyerId
    });

    const populatedPayment = await BillPayment.findById(payment._id)
        .populate('billId', 'billNumber totalAmount')
        .populate('vendorId', 'name vendorId')
        .populate('bankAccountId', 'name bankName');

    await BillingActivity.logActivity({
        activityType: 'bill_payment_created',
        userId: lawyerId,
        relatedModel: 'BillPayment',
        relatedId: payment._id,
        description: `Payment ${payment.paymentNumber} for ${amount} ${bill.currency} on bill ${bill.billNumber}`,
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
    const filters = { lawyerId };

    if (billId) filters.billId = billId;
    if (vendorId) filters.vendorId = vendorId;

    if (startDate || endDate) {
        filters.paymentDate = {};
        if (startDate) filters.paymentDate.$gte = new Date(startDate);
        if (endDate) filters.paymentDate.$lte = new Date(endDate);
    }

    const payments = await BillPayment.find(filters)
        .populate('billId', 'billNumber totalAmount')
        .populate('vendorId', 'name vendorId')
        .populate('bankAccountId', 'name bankName')
        .sort({ paymentDate: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await BillPayment.countDocuments(filters);

    return res.json({
        success: true,
        payments,
        total
    });
});

// Get single payment
const getPayment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const payment = await BillPayment.findById(id)
        .populate('billId', 'billNumber totalAmount balanceDue status')
        .populate('vendorId', 'name vendorId email')
        .populate('bankAccountId', 'name bankName accountNumber')
        .populate('createdBy', 'firstName lastName');

    if (!payment) {
        throw CustomException('Payment not found', 404);
    }

    if (payment.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this payment', 403);
    }

    return res.json({
        success: true,
        payment
    });
});

// Cancel payment
const cancelPayment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const lawyerId = req.userID;

    const payment = await BillPayment.findById(id);

    if (!payment) {
        throw CustomException('Payment not found', 404);
    }

    if (payment.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this payment', 403);
    }

    try {
        const cancelledPayment = await BillPayment.cancelPayment(id, reason, lawyerId);

        const populatedPayment = await BillPayment.findById(cancelledPayment._id)
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
