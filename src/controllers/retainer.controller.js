const { Retainer, Payment, Invoice, BillingActivity, Case } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Create retainer
 * POST /api/retainers
 */
const createRetainer = asyncHandler(async (req, res) => {
    const {
        clientId,
        caseId,
        retainerType,
        initialAmount,
        minimumBalance = 0,
        startDate,
        endDate,
        autoReplenish = false,
        replenishThreshold,
        replenishAmount,
        agreementUrl,
        agreementSignedDate,
        notes,
        termsAndConditions
    } = req.body;

    const lawyerId = req.userID;

    // Validate required fields
    if (!clientId || !retainerType || !initialAmount) {
        throw new CustomException('الحقول المطلوبة: العميل، نوع العربون، المبلغ الأولي', 400);
    }

    // Validate case if provided
    if (caseId) {
        const caseDoc = await Case.findById(caseId);
        if (!caseDoc) {
            throw new CustomException('القضية غير موجودة', 404);
        }
        if (caseDoc.lawyerId.toString() !== lawyerId) {
            throw new CustomException('لا يمكنك الوصول إلى هذه القضية', 403);
        }
    }

    // Validate auto-replenish settings
    if (autoReplenish && (!replenishThreshold || !replenishAmount)) {
        throw new CustomException('التجديد التلقائي يتطلب حد التجديد ومبلغ التجديد', 400);
    }

    const retainer = await Retainer.create({
        clientId,
        lawyerId,
        caseId,
        retainerType,
        initialAmount,
        currentBalance: initialAmount,
        minimumBalance,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        autoReplenish,
        replenishThreshold,
        replenishAmount,
        status: 'active',
        agreementUrl,
        agreementSignedDate: agreementSignedDate ? new Date(agreementSignedDate) : null,
        notes,
        termsAndConditions,
        createdBy: lawyerId
    });

    // Add initial deposit
    retainer.deposits.push({
        date: new Date(),
        amount: initialAmount,
        paymentId: null
    });

    await retainer.save();

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'retainer_created',
        userId: lawyerId,
        clientId,
        relatedModel: 'Retainer',
        relatedId: retainer._id,
        description: `تم إنشاء عربون جديد بمبلغ ${initialAmount} ريال`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    await retainer.populate([
        { path: 'clientId', select: 'username email' },
        { path: 'lawyerId', select: 'username' },
        { path: 'caseId', select: 'title caseNumber' }
    ]);

    res.status(201).json({
        success: true,
        message: 'تم إنشاء العربون بنجاح',
        retainer
    });
});

/**
 * Get retainers with filters
 * GET /api/retainers
 */
const getRetainers = asyncHandler(async (req, res) => {
    const {
        status,
        retainerType,
        clientId,
        caseId,
        page = 1,
        limit = 50
    } = req.query;

    const lawyerId = req.userID;
    const query = { lawyerId };

    if (status) query.status = status;
    if (retainerType) query.retainerType = retainerType;
    if (clientId) query.clientId = clientId;
    if (caseId) query.caseId = caseId;

    const retainers = await Retainer.find(query)
        .populate('clientId', 'username email')
        .populate('lawyerId', 'username')
        .populate('caseId', 'title caseNumber')
        .populate('createdBy', 'username')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Retainer.countDocuments(query);

    // Calculate totals
    const totals = await Retainer.aggregate([
        { $match: query },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalInitialAmount: { $sum: '$initialAmount' },
                totalCurrentBalance: { $sum: '$currentBalance' }
            }
        }
    ]);

    res.status(200).json({
        success: true,
        data: retainers,
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
 * Get single retainer
 * GET /api/retainers/:id
 */
const getRetainer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const retainer = await Retainer.findById(id)
        .populate('clientId', 'username email phone')
        .populate('lawyerId', 'username email')
        .populate('caseId', 'title caseNumber category')
        .populate('createdBy', 'username')
        .populate('consumptions.invoiceId', 'invoiceNumber totalAmount')
        .populate('deposits.paymentId', 'paymentNumber amount paymentDate');

    if (!retainer) {
        throw new CustomException('العربون غير موجود', 404);
    }

    if (retainer.lawyerId._id.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا العربون', 403);
    }

    res.status(200).json({
        success: true,
        data: retainer
    });
});

/**
 * Update retainer
 * PUT /api/retainers/:id
 */
const updateRetainer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const retainer = await Retainer.findById(id);

    if (!retainer) {
        throw new CustomException('العربون غير موجود', 404);
    }

    if (retainer.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا العربون', 403);
    }

    const allowedFields = [
        'minimumBalance',
        'endDate',
        'autoReplenish',
        'replenishThreshold',
        'replenishAmount',
        'agreementUrl',
        'agreementSignedDate',
        'notes',
        'termsAndConditions'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            retainer[field] = req.body[field];
        }
    });

    await retainer.save();

    await retainer.populate([
        { path: 'clientId', select: 'username email' },
        { path: 'caseId', select: 'title caseNumber' }
    ]);

    res.status(200).json({
        success: true,
        message: 'تم تحديث العربون بنجاح',
        retainer
    });
});

/**
 * Consume from retainer
 * POST /api/retainers/:id/consume
 */
const consumeRetainer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { amount, invoiceId, description } = req.body;
    const lawyerId = req.userID;

    if (!amount || amount <= 0) {
        throw new CustomException('المبلغ مطلوب ويجب أن يكون أكبر من صفر', 400);
    }

    const retainer = await Retainer.findById(id);

    if (!retainer) {
        throw new CustomException('العربون غير موجود', 404);
    }

    if (retainer.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا العربون', 403);
    }

    if (retainer.status !== 'active') {
        throw new CustomException('العربون غير نشط', 400);
    }

    // Validate invoice if provided
    if (invoiceId) {
        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) {
            throw new CustomException('الفاتورة غير موجودة', 404);
        }
    }

    try {
        // Use the model method to consume
        await retainer.consume(amount, invoiceId, description);

        // Log activity
        await BillingActivity.logActivity({
            activityType: 'retainer_consumed',
            userId: lawyerId,
            clientId: retainer.clientId,
            relatedModel: 'Retainer',
            relatedId: retainer._id,
            description: `تم استهلاك ${amount} ريال من العربون. الرصيد الحالي: ${retainer.currentBalance}`,
            changes: { consumed: amount, balance: retainer.currentBalance },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        // Check if auto-replenish is needed
        if (
            retainer.autoReplenish &&
            retainer.replenishThreshold &&
            retainer.currentBalance <= retainer.replenishThreshold
        ) {
            // TODO: Trigger auto-replenishment process
            // This could involve creating a pending payment or sending a notification
        }

        await retainer.populate([
            { path: 'clientId', select: 'username email' },
            { path: 'caseId', select: 'title caseNumber' }
        ]);

        res.status(200).json({
            success: true,
            message: 'تم استهلاك المبلغ من العربون بنجاح',
            retainer,
            lowBalanceAlert: retainer.currentBalance <= retainer.minimumBalance
        });
    } catch (error) {
        throw new CustomException(error.message, 400);
    }
});

/**
 * Replenish retainer
 * POST /api/retainers/:id/replenish
 */
const replenishRetainer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { amount, paymentId } = req.body;
    const lawyerId = req.userID;

    if (!amount || amount <= 0) {
        throw new CustomException('المبلغ مطلوب ويجب أن يكون أكبر من صفر', 400);
    }

    const retainer = await Retainer.findById(id);

    if (!retainer) {
        throw new CustomException('العربون غير موجود', 404);
    }

    if (retainer.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا العربون', 403);
    }

    // Validate payment if provided
    if (paymentId) {
        const payment = await Payment.findById(paymentId);
        if (!payment) {
            throw new CustomException('الدفعة غير موجودة', 404);
        }
        if (payment.status !== 'completed') {
            throw new CustomException('يجب أن تكون الدفعة مكتملة', 400);
        }
    }

    try {
        // Use the model method to replenish
        await retainer.replenish(amount, paymentId);

        // Log activity
        await BillingActivity.logActivity({
            activityType: 'retainer_replenished',
            userId: lawyerId,
            clientId: retainer.clientId,
            relatedModel: 'Retainer',
            relatedId: retainer._id,
            description: `تم تجديد العربون بمبلغ ${amount} ريال. الرصيد الحالي: ${retainer.currentBalance}`,
            changes: { added: amount, balance: retainer.currentBalance },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        await retainer.populate([
            { path: 'clientId', select: 'username email' },
            { path: 'caseId', select: 'title caseNumber' }
        ]);

        res.status(200).json({
            success: true,
            message: 'تم تجديد العربون بنجاح',
            retainer
        });
    } catch (error) {
        throw new CustomException(error.message, 400);
    }
});

/**
 * Refund retainer
 * POST /api/retainers/:id/refund
 */
const refundRetainer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const lawyerId = req.userID;

    const retainer = await Retainer.findById(id);

    if (!retainer) {
        throw new CustomException('العربون غير موجود', 404);
    }

    if (retainer.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا العربون', 403);
    }

    if (retainer.status === 'refunded') {
        throw new CustomException('تم استرداد العربون بالفعل', 400);
    }

    const refundAmount = retainer.currentBalance;

    retainer.status = 'refunded';
    retainer.currentBalance = 0;
    await retainer.save();

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'retainer_refunded',
        userId: lawyerId,
        clientId: retainer.clientId,
        relatedModel: 'Retainer',
        relatedId: retainer._id,
        description: `تم استرداد العربون بمبلغ ${refundAmount} ريال. السبب: ${reason || 'غير محدد'}`,
        changes: { refundedAmount: refundAmount },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    await retainer.populate([
        { path: 'clientId', select: 'username email' },
        { path: 'caseId', select: 'title caseNumber' }
    ]);

    res.status(200).json({
        success: true,
        message: 'تم استرداد العربون بنجاح',
        retainer,
        refundAmount
    });
});

/**
 * Get retainer history
 * GET /api/retainers/:id/history
 */
const getRetainerHistory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const retainer = await Retainer.findById(id)
        .populate('consumptions.invoiceId', 'invoiceNumber totalAmount')
        .populate('deposits.paymentId', 'paymentNumber amount paymentDate');

    if (!retainer) {
        throw new CustomException('العربون غير موجود', 404);
    }

    if (retainer.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا العربون', 403);
    }

    // Combine and sort transactions chronologically
    const history = [
        ...retainer.consumptions.map(c => ({
            type: 'consumption',
            date: c.date,
            amount: -c.amount,
            invoiceId: c.invoiceId,
            description: c.description
        })),
        ...retainer.deposits.map(d => ({
            type: 'deposit',
            date: d.date,
            amount: d.amount,
            paymentId: d.paymentId
        }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
        success: true,
        data: {
            retainerNumber: retainer.retainerNumber,
            currentBalance: retainer.currentBalance,
            initialAmount: retainer.initialAmount,
            history
        }
    });
});

/**
 * Get retainer statistics
 * GET /api/retainers/stats
 */
const getRetainerStats = asyncHandler(async (req, res) => {
    const { clientId, startDate, endDate } = req.query;
    const lawyerId = req.userID;

    const matchQuery = { lawyerId };

    if (clientId) matchQuery.clientId = clientId;

    if (startDate || endDate) {
        matchQuery.createdAt = {};
        if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
        if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    const stats = await Retainer.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalInitialAmount: { $sum: '$initialAmount' },
                totalCurrentBalance: { $sum: '$currentBalance' }
            }
        }
    ]);

    // Count retainers needing replenishment
    const needingReplenishment = await Retainer.countDocuments({
        ...matchQuery,
        status: 'active',
        $expr: { $lte: ['$currentBalance', '$minimumBalance'] }
    });

    // Count low balance alerts
    const lowBalanceAlerts = await Retainer.countDocuments({
        ...matchQuery,
        status: 'active',
        lowBalanceAlertSent: true
    });

    res.status(200).json({
        success: true,
        data: {
            byStatus: stats,
            needingReplenishment,
            lowBalanceAlerts
        }
    });
});

/**
 * Get low balance retainers
 * GET /api/retainers/low-balance
 */
const getLowBalanceRetainers = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    const retainers = await Retainer.find({
        lawyerId,
        status: 'active',
        $expr: { $lte: ['$currentBalance', '$minimumBalance'] }
    })
        .populate('clientId', 'username email')
        .populate('caseId', 'title caseNumber')
        .sort({ currentBalance: 1 });

    res.status(200).json({
        success: true,
        data: retainers,
        count: retainers.length
    });
});

module.exports = {
    createRetainer,
    getRetainers,
    getRetainer,
    updateRetainer,
    consumeRetainer,
    replenishRetainer,
    refundRetainer,
    getRetainerHistory,
    getRetainerStats,
    getLowBalanceRetainers
};
