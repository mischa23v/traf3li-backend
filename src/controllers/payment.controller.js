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
    const firmId = req.firmId; // From firmFilter middleware

    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى المدفوعات', 403);
    }

    // Validate required fields
    if (!clientId || !amount || !paymentMethod) {
        throw CustomException('الحقول المطلوبة: العميل، المبلغ، طريقة الدفع', 400);
    }

    // Validate invoice if provided
    if (invoiceId) {
        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) {
            throw CustomException('الفاتورة غير موجودة', 404);
        }
        // Check access via firmId or lawyerId
        const hasAccess = firmId
            ? invoice.firmId && invoice.firmId.toString() === firmId.toString()
            : invoice.lawyerId.toString() === lawyerId;
        if (!hasAccess) {
            throw CustomException('لا يمكنك الوصول إلى هذه الفاتورة', 403);
        }
    }

    const payment = await Payment.create({
        clientId,
        invoiceId,
        caseId,
        lawyerId,
        firmId, // Add firmId for multi-tenancy
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
    const firmId = req.firmId; // From firmFilter middleware

    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى المدفوعات', 403);
    }

    // Build query based on firmId or lawyerId
    const query = firmId ? { firmId } : { lawyerId };

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
 * Get new payment defaults/template
 * GET /api/payments/new
 */
const getNewPaymentDefaults = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الدفعات', 403);
    }

    res.status(200).json({
        success: true,
        data: {
            clientId: null,
            invoiceId: null,
            caseId: null,
            amount: 0,
            currency: 'SAR',
            paymentMethod: 'bank_transfer',
            gatewayProvider: null,
            transactionId: null,
            checkNumber: null,
            checkDate: null,
            bankName: null,
            allocations: [],
            notes: '',
            internalNotes: ''
        },
        paymentMethods: [
            { value: 'cash', label: 'نقدي' },
            { value: 'bank_transfer', label: 'تحويل بنكي' },
            { value: 'credit_card', label: 'بطاقة ائتمان' },
            { value: 'debit_card', label: 'بطاقة خصم' },
            { value: 'check', label: 'شيك' },
            { value: 'online', label: 'دفع إلكتروني' }
        ]
    });
});

/**
 * Get single payment
 * GET /api/payments/:id
 */
const getPayment = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الدفعات', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

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
        throw CustomException('الدفعة غير موجودة', 404);
    }

    // Check access via firmId or lawyerId
    const hasAccess = firmId
        ? payment.firmId && payment.firmId.toString() === firmId.toString()
        : payment.lawyerId._id.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('لا يمكنك الوصول إلى هذه الدفعة', 403);
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
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية لتعديل الدفعات', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const payment = await Payment.findById(id);

    if (!payment) {
        throw CustomException('الدفعة غير موجودة', 404);
    }

    // Check access via firmId or lawyerId
    const hasAccess = firmId
        ? payment.firmId && payment.firmId.toString() === firmId.toString()
        : payment.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('لا يمكنك الوصول إلى هذه الدفعة', 403);
    }

    // Cannot update completed or refunded payments
    if (payment.status === 'completed' || payment.status === 'refunded') {
        throw CustomException('لا يمكن تحديث دفعة مكتملة أو مستردة', 400);
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
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية لحذف الدفعات', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;

    const payment = await Payment.findById(id);

    if (!payment) {
        throw CustomException('الدفعة غير موجودة', 404);
    }

    if (payment.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذه الدفعة', 403);
    }

    // Cannot delete completed or refunded payments
    if (payment.status === 'completed' || payment.status === 'refunded') {
        throw CustomException('لا يمكن حذف دفعة مكتملة أو مستردة', 400);
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
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الدفعات', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;

    const payment = await Payment.findById(id);

    if (!payment) {
        throw CustomException('الدفعة غير موجودة', 404);
    }

    if (payment.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذه الدفعة', 403);
    }

    if (payment.status === 'completed') {
        throw CustomException('الدفعة مكتملة بالفعل', 400);
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
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الدفعات', 403);
    }

    const { id } = req.params;
    const { reason } = req.body;
    const lawyerId = req.userID;

    const payment = await Payment.findById(id);

    if (!payment) {
        throw CustomException('الدفعة غير موجودة', 404);
    }

    if (payment.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذه الدفعة', 403);
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
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الدفعات', 403);
    }

    const { id } = req.params;
    const { amount, reason } = req.body;
    const lawyerId = req.userID;

    const originalPayment = await Payment.findById(id);

    if (!originalPayment) {
        throw CustomException('الدفعة الأصلية غير موجودة', 404);
    }

    if (originalPayment.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذه الدفعة', 403);
    }

    if (originalPayment.status !== 'completed') {
        throw CustomException('يمكن فقط استرداد الدفعات المكتملة', 400);
    }

    const refundAmount = amount || originalPayment.amount;

    if (refundAmount > originalPayment.amount) {
        throw CustomException('مبلغ الاسترداد أكبر من المبلغ الأصلي', 400);
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
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الدفعات', 403);
    }

    const { id } = req.params;
    const { email } = req.body;
    const lawyerId = req.userID;

    const payment = await Payment.findById(id)
        .populate('clientId', 'username email')
        .populate('lawyerId', 'username email firmName')
        .populate('invoiceId', 'invoiceNumber');

    if (!payment) {
        throw CustomException('الدفعة غير موجودة', 404);
    }

    if (payment.lawyerId._id.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذه الدفعة', 403);
    }

    if (payment.status !== 'completed') {
        throw CustomException('يمكن فقط إرسال إيصالات للدفعات المكتملة', 400);
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
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الدفعات', 403);
    }

    const { startDate, endDate, clientId, groupBy = 'status' } = req.query;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Build query based on firmId or lawyerId
    const matchQuery = firmId ? { firmId } : { lawyerId };

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
 * Record payment for specific invoice
 * POST /api/invoices/:invoiceId/payments
 */
const recordInvoicePayment = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الدفعات', 403);
    }

    const { invoiceId } = req.params;
    const {
        amount,
        paymentMethod,
        transactionId,
        notes
    } = req.body;

    const lawyerId = req.userID;

    // Validate amount
    if (!amount || amount <= 0) {
        throw CustomException('Amount is required and must be positive', 400);
    }

    // Validate and get invoice
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
        throw CustomException('Invoice not found', 404);
    }

    if (invoice.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this invoice', 403);
    }

    if (invoice.status === 'paid') {
        throw CustomException('Invoice is already paid in full', 400);
    }

    if (invoice.status === 'cancelled') {
        throw CustomException('Cannot record payment for cancelled invoice', 400);
    }

    // Check if payment exceeds balance due
    if (amount > invoice.balanceDue) {
        throw CustomException(`Payment amount exceeds balance due (${invoice.balanceDue} SAR)`, 400);
    }

    // Create payment record
    const payment = await Payment.create({
        clientId: invoice.clientId,
        invoiceId: invoice._id,
        caseId: invoice.caseId,
        lawyerId,
        amount,
        currency: 'SAR',
        paymentMethod: paymentMethod || 'bank_transfer',
        transactionId,
        status: 'completed',
        paymentDate: new Date(),
        notes,
        createdBy: lawyerId,
        processedBy: lawyerId,
        allocations: [{
            invoiceId: invoice._id,
            amount,
            allocatedAt: new Date()
        }]
    });

    // Update invoice
    invoice.amountPaid = (invoice.amountPaid || 0) + amount;
    invoice.balanceDue = invoice.totalAmount - invoice.amountPaid;

    if (invoice.balanceDue <= 0) {
        invoice.status = 'paid';
        invoice.paidDate = new Date();
    } else if (invoice.amountPaid > 0) {
        invoice.status = 'partial';
    }

    invoice.history.push({
        action: 'payment_received',
        date: new Date(),
        user: lawyerId,
        note: `Payment of ${amount} SAR received`
    });

    await invoice.save();

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'payment_received',
        userId: lawyerId,
        clientId: invoice.clientId,
        relatedModel: 'Payment',
        relatedId: payment._id,
        description: `Payment of ${amount} SAR received for invoice ${invoice.invoiceNumber}`,
        amount,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    await payment.populate([
        { path: 'clientId', select: 'firstName lastName username email' },
        { path: 'invoiceId', select: 'invoiceNumber totalAmount status balanceDue' }
    ]);

    res.status(201).json({
        success: true,
        message: 'Payment recorded successfully',
        payment,
        invoice: {
            _id: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
            amountPaid: invoice.amountPaid,
            balanceDue: invoice.balanceDue,
            status: invoice.status
        }
    });
});

/**
 * Get payments summary
 * GET /api/payments/summary
 */
const getPaymentsSummary = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الدفعات', 403);
    }

    const { startDate, endDate } = req.query;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Build query based on firmId or lawyerId
    const baseQuery = firmId ? { firmId } : { lawyerId };
    const matchQuery = { ...baseQuery, status: 'completed', isRefund: { $ne: true } };

    if (startDate || endDate) {
        matchQuery.paymentDate = {};
        if (startDate) matchQuery.paymentDate.$gte = new Date(startDate);
        if (endDate) matchQuery.paymentDate.$lte = new Date(endDate);
    }

    // Calculate total received
    const totalReceived = await Payment.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: null,
                total: { $sum: '$amount' }
            }
        }
    ]);

    // Calculate this month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthQuery = {
        ...matchQuery,
        paymentDate: { $gte: firstDayOfMonth }
    };

    const thisMonth = await Payment.aggregate([
        { $match: thisMonthQuery },
        {
            $group: {
                _id: null,
                total: { $sum: '$amount' }
            }
        }
    ]);

    // Calculate pending payments
    const pendingQuery = { ...baseQuery, status: 'pending' };
    const pending = await Payment.aggregate([
        { $match: pendingQuery },
        {
            $group: {
                _id: null,
                total: { $sum: '$amount' }
            }
        }
    ]);

    // By payment method
    const byMethod = await Payment.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$paymentMethod',
                total: { $sum: '$amount' }
            }
        }
    ]);

    const byMethodObj = {};
    byMethod.forEach(item => {
        byMethodObj[item._id || 'other'] = item.total;
    });

    res.status(200).json({
        success: true,
        summary: {
            totalReceived: totalReceived[0]?.total || 0,
            thisMonth: thisMonth[0]?.total || 0,
            pending: pending[0]?.total || 0,
            byMethod: byMethodObj
        }
    });
});

/**
 * Bulk delete payments
 * DELETE /api/payments/bulk
 */
const bulkDeletePayments = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية لحذف الدفعات', 403);
    }

    const { paymentIds } = req.body;
    const lawyerId = req.userID;

    if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
        throw CustomException('معرفات الدفعات مطلوبة', 400);
    }

    // Verify all payments belong to lawyer and are not completed/refunded
    const payments = await Payment.find({
        _id: { $in: paymentIds },
        lawyerId,
        status: { $nin: ['completed', 'refunded'] }
    });

    if (payments.length !== paymentIds.length) {
        throw CustomException('بعض الدفعات غير صالحة للحذف', 400);
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
    getNewPaymentDefaults,
    updatePayment,
    deletePayment,
    completePayment,
    failPayment,
    createRefund,
    sendReceipt,
    getPaymentStats,
    getPaymentsSummary,
    recordInvoicePayment,
    bulkDeletePayments
};
