const { Payment, Invoice, Retainer, BillingActivity } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Create payment
 * POST /api/payments
 */
const createPayment = asyncHandler(async (req, res) => {
    const {
        clientId,
        invoiceId,
        caseId,
        amount,
        currency = 'SAR',
        paymentMethod,
        gatewayProvider,
        transactionId,
        gatewayResponse,
        checkNumber,
        checkDate,
        bankName,
        allocations,
        notes,
        internalNotes
    } = req.body;

    const lawyerId = req.userID;

    // Validate required fields
    if (!clientId || !amount || !paymentMethod) {
        throw new CustomException('الحقول المطلوبة: العميل، المبلغ، طريقة الدفع', 400);
    }

    // Validate invoice if provided
    if (invoiceId) {
        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) {
            throw new CustomException('الفاتورة غير موجودة', 404);
        }
        if (invoice.lawyerId.toString() !== lawyerId) {
            throw new CustomException('لا يمكنك الوصول إلى هذه الفاتورة', 403);
        }
    }

    const payment = await Payment.create({
        clientId,
        invoiceId,
        caseId,
        lawyerId,
        amount,
        currency,
        paymentMethod,
        gatewayProvider,
        transactionId,
        gatewayResponse,
        checkNumber,
        checkDate,
        bankName,
        status: 'pending',
        allocations: allocations || [],
        notes,
        internalNotes,
        createdBy: lawyerId
    });

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'payment_received',
        userId: lawyerId,
        clientId,
        relatedModel: 'Payment',
        relatedId: payment._id,
        description: `تم إنشاء دفعة جديدة بمبلغ ${amount} ${currency}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    await payment.populate([
        { path: 'clientId', select: 'username email' },
        { path: 'lawyerId', select: 'username' },
        { path: 'invoiceId', select: 'invoiceNumber totalAmount' },
        { path: 'caseId', select: 'title caseNumber' }
    ]);

    res.status(201).json({
        success: true,
        message: 'تم إنشاء الدفعة بنجاح',
        payment
    });
});

/**
 * Get payments with filters
 * GET /api/payments
 */
const getPayments = asyncHandler(async (req, res) => {
    const {
        status,
        paymentMethod,
        clientId,
        invoiceId,
        caseId,
        startDate,
        endDate,
        page = 1,
        limit = 50
    } = req.query;

    const lawyerId = req.userID;
    const query = { lawyerId };

    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (clientId) query.clientId = clientId;
    if (invoiceId) query.invoiceId = invoiceId;
    if (caseId) query.caseId = caseId;

    if (startDate || endDate) {
        query.paymentDate = {};
        if (startDate) query.paymentDate.$gte = new Date(startDate);
        if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    const payments = await Payment.find(query)
        .populate('clientId', 'username email')
        .populate('lawyerId', 'username')
        .populate('invoiceId', 'invoiceNumber totalAmount status')
        .populate('caseId', 'title caseNumber')
        .populate('createdBy', 'username')
        .populate('processedBy', 'username')
        .sort({ paymentDate: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Payment.countDocuments(query);

    // Calculate totals
    const totals = await Payment.aggregate([
        { $match: query },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' }
            }
        }
    ]);

    res.status(200).json({
        success: true,
        data: payments,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        },
        summary: totals
    });
});

/**
 * Get single payment
 * GET /api/payments/:id
 */
const getPayment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const payment = await Payment.findById(id)
        .populate('clientId', 'username email phone')
        .populate('lawyerId', 'username email')
        .populate('invoiceId', 'invoiceNumber totalAmount dueDate status')
        .populate('caseId', 'title caseNumber category')
        .populate('createdBy', 'username')
        .populate('processedBy', 'username')
        .populate('originalPaymentId', 'paymentNumber amount paymentDate')
        .populate('allocations.invoiceId', 'invoiceNumber totalAmount');

    if (!payment) {
        throw new CustomException('الدفعة غير موجودة', 404);
    }

    if (payment.lawyerId._id.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذه الدفعة', 403);
    }

    res.status(200).json({
        success: true,
        data: payment
    });
});

/**
 * Update payment
 * PUT /api/payments/:id
 */
const updatePayment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const payment = await Payment.findById(id);

    if (!payment) {
        throw new CustomException('الدفعة غير موجودة', 404);
    }

    if (payment.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذه الدفعة', 403);
    }

    // Cannot update completed or refunded payments
    if (payment.status === 'completed' || payment.status === 'refunded') {
        throw new CustomException('لا يمكن تحديث دفعة مكتملة أو مستردة', 400);
    }

    const allowedFields = ['notes', 'internalNotes', 'allocations'];
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            payment[field] = req.body[field];
        }
    });

    await payment.save();

    await payment.populate([
        { path: 'clientId', select: 'username email' },
        { path: 'invoiceId', select: 'invoiceNumber totalAmount' }
    ]);

    res.status(200).json({
        success: true,
        message: 'تم تحديث الدفعة بنجاح',
        payment
    });
});

/**
 * Delete payment
 * DELETE /api/payments/:id
 */
const deletePayment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const payment = await Payment.findById(id);

    if (!payment) {
        throw new CustomException('الدفعة غير موجودة', 404);
    }

    if (payment.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذه الدفعة', 403);
    }

    // Cannot delete completed or refunded payments
    if (payment.status === 'completed' || payment.status === 'refunded') {
        throw new CustomException('لا يمكن حذف دفعة مكتملة أو مستردة', 400);
    }

    await Payment.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: 'تم حذف الدفعة بنجاح'
    });
});

/**
 * Mark payment as completed
 * POST /api/payments/:id/complete
 */
const completePayment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const payment = await Payment.findById(id);

    if (!payment) {
        throw new CustomException('الدفعة غير موجودة', 404);
    }

    if (payment.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذه الدفعة', 403);
    }

    if (payment.status === 'completed') {
        throw new CustomException('الدفعة مكتملة بالفعل', 400);
    }

    payment.status = 'completed';
    payment.processedBy = lawyerId;
    await payment.save();

    // Update invoice if linked
    if (payment.invoiceId) {
        const invoice = await Invoice.findById(payment.invoiceId);
        if (invoice) {
            invoice.amountPaid = (invoice.amountPaid || 0) + payment.amount;
            invoice.balanceDue = invoice.totalAmount - invoice.amountPaid;

            if (invoice.balanceDue <= 0) {
                invoice.status = 'paid';
                invoice.paidDate = new Date();
            } else if (invoice.amountPaid > 0) {
                invoice.status = 'partial';
            }

            await invoice.save();
        }
    }

    // Update retainer if linked
    if (payment.allocations && payment.allocations.length === 0) {
        // Check if this is a retainer replenishment
        const retainer = await Retainer.findOne({
            clientId: payment.clientId,
            lawyerId: payment.lawyerId,
            status: { $in: ['active', 'depleted'] }
        }).sort({ createdAt: -1 });

        if (retainer) {
            await retainer.replenish(payment.amount, payment._id);
        }
    }

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'payment_received',
        userId: lawyerId,
        clientId: payment.clientId,
        relatedModel: 'Payment',
        relatedId: payment._id,
        description: `تم استكمال دفعة بمبلغ ${payment.amount} ${payment.currency}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    await payment.populate([
        { path: 'clientId', select: 'username email' },
        { path: 'invoiceId', select: 'invoiceNumber totalAmount status' }
    ]);

    res.status(200).json({
        success: true,
        message: 'تم إكمال الدفعة بنجاح',
        payment
    });
});

/**
 * Mark payment as failed
 * POST /api/payments/:id/fail
 */
const failPayment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const lawyerId = req.userID;

    const payment = await Payment.findById(id);

    if (!payment) {
        throw new CustomException('الدفعة غير موجودة', 404);
    }

    if (payment.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذه الدفعة', 403);
    }

    payment.status = 'failed';
    payment.failureReason = reason || 'فشل الدفع';
    payment.failureDate = new Date();
    payment.retryCount = (payment.retryCount || 0) + 1;
    await payment.save();

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'payment_failed',
        userId: lawyerId,
        clientId: payment.clientId,
        relatedModel: 'Payment',
        relatedId: payment._id,
        description: `فشلت دفعة بمبلغ ${payment.amount} ${payment.currency}. السبب: ${reason}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    res.status(200).json({
        success: true,
        message: 'تم تسجيل فشل الدفعة',
        payment
    });
});

/**
 * Create refund
 * POST /api/payments/:id/refund
 */
const createRefund = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { amount, reason } = req.body;
    const lawyerId = req.userID;

    const originalPayment = await Payment.findById(id);

    if (!originalPayment) {
        throw new CustomException('الدفعة الأصلية غير موجودة', 404);
    }

    if (originalPayment.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذه الدفعة', 403);
    }

    if (originalPayment.status !== 'completed') {
        throw new CustomException('يمكن فقط استرداد الدفعات المكتملة', 400);
    }

    const refundAmount = amount || originalPayment.amount;

    if (refundAmount > originalPayment.amount) {
        throw new CustomException('مبلغ الاسترداد أكبر من المبلغ الأصلي', 400);
    }

    // Create refund payment
    const refund = await Payment.create({
        clientId: originalPayment.clientId,
        invoiceId: originalPayment.invoiceId,
        caseId: originalPayment.caseId,
        lawyerId,
        amount: -refundAmount, // Negative amount for refund
        currency: originalPayment.currency,
        paymentMethod: originalPayment.paymentMethod,
        gatewayProvider: originalPayment.gatewayProvider,
        status: 'completed',
        isRefund: true,
        originalPaymentId: originalPayment._id,
        refundReason: reason,
        refundDate: new Date(),
        createdBy: lawyerId,
        processedBy: lawyerId
    });

    // Update original payment status
    originalPayment.status = 'refunded';
    await originalPayment.save();

    // Update invoice if linked
    if (originalPayment.invoiceId) {
        const invoice = await Invoice.findById(originalPayment.invoiceId);
        if (invoice) {
            invoice.amountPaid = Math.max(0, (invoice.amountPaid || 0) - refundAmount);
            invoice.balanceDue = invoice.totalAmount - invoice.amountPaid;

            if (invoice.status === 'paid' && invoice.balanceDue > 0) {
                invoice.status = 'partial';
            }

            await invoice.save();
        }
    }

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'payment_refunded',
        userId: lawyerId,
        clientId: originalPayment.clientId,
        relatedModel: 'Payment',
        relatedId: refund._id,
        description: `تم استرداد ${refundAmount} ${originalPayment.currency}. السبب: ${reason}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    await refund.populate([
        { path: 'clientId', select: 'username email' },
        { path: 'originalPaymentId', select: 'paymentNumber amount paymentDate' }
    ]);

    res.status(201).json({
        success: true,
        message: 'تم إنشاء الاسترداد بنجاح',
        refund
    });
});

/**
 * Generate and send receipt
 * POST /api/payments/:id/receipt
 */
const sendReceipt = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { email } = req.body;
    const lawyerId = req.userID;

    const payment = await Payment.findById(id)
        .populate('clientId', 'username email')
        .populate('lawyerId', 'username email firmName')
        .populate('invoiceId', 'invoiceNumber');

    if (!payment) {
        throw new CustomException('الدفعة غير موجودة', 404);
    }

    if (payment.lawyerId._id.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذه الدفعة', 403);
    }

    if (payment.status !== 'completed') {
        throw new CustomException('يمكن فقط إرسال إيصالات للدفعات المكتملة', 400);
    }

    // TODO: Generate PDF receipt and send email
    // For now, just mark as sent
    payment.receiptSent = true;
    payment.receiptSentAt = new Date();
    // payment.receiptUrl = 'URL_TO_GENERATED_PDF';
    await payment.save();

    res.status(200).json({
        success: true,
        message: `تم إرسال الإيصال إلى ${email || payment.clientId.email}`,
        payment
    });
});

/**
 * Get payment statistics
 * GET /api/payments/stats
 */
const getPaymentStats = asyncHandler(async (req, res) => {
    const { startDate, endDate, clientId, groupBy = 'status' } = req.query;
    const lawyerId = req.userID;

    const matchQuery = { lawyerId };

    if (startDate || endDate) {
        matchQuery.paymentDate = {};
        if (startDate) matchQuery.paymentDate.$gte = new Date(startDate);
        if (endDate) matchQuery.paymentDate.$lte = new Date(endDate);
    }

    if (clientId) matchQuery.clientId = clientId;

    // Overall stats
    const overallStats = await Payment.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: null,
                totalPayments: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
                completedCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                completedAmount: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
                },
                pendingCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                },
                pendingAmount: {
                    $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] }
                },
                failedCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                },
                refundedCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] }
                }
            }
        }
    ]);

    // By payment method
    const byMethod = await Payment.aggregate([
        { $match: { ...matchQuery, status: 'completed' } },
        {
            $group: {
                _id: '$paymentMethod',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' }
            }
        },
        { $sort: { totalAmount: -1 } }
    ]);

    // By gateway provider
    const byGateway = await Payment.aggregate([
        {
            $match: {
                ...matchQuery,
                status: 'completed',
                gatewayProvider: { $exists: true, $ne: null }
            }
        },
        {
            $group: {
                _id: '$gatewayProvider',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' }
            }
        },
        { $sort: { totalAmount: -1 } }
    ]);

    res.status(200).json({
        success: true,
        data: {
            overall: overallStats[0] || {},
            byMethod,
            byGateway
        }
    });
});

/**
 * Bulk delete payments
 * DELETE /api/payments/bulk
 */
const bulkDeletePayments = asyncHandler(async (req, res) => {
    const { paymentIds } = req.body;
    const lawyerId = req.userID;

    if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
        throw new CustomException('معرفات الدفعات مطلوبة', 400);
    }

    // Verify all payments belong to lawyer and are not completed/refunded
    const payments = await Payment.find({
        _id: { $in: paymentIds },
        lawyerId,
        status: { $nin: ['completed', 'refunded'] }
    });

    if (payments.length !== paymentIds.length) {
        throw new CustomException('بعض الدفعات غير صالحة للحذف', 400);
    }

    await Payment.deleteMany({ _id: { $in: paymentIds } });

    res.status(200).json({
        success: true,
        message: `تم حذف ${payments.length} دفعات بنجاح`,
        count: payments.length
    });
});

module.exports = {
    createPayment,
    getPayments,
    getPayment,
    updatePayment,
    deletePayment,
    completePayment,
    failPayment,
    createRefund,
    sendReceipt,
    getPaymentStats,
    bulkDeletePayments
};
