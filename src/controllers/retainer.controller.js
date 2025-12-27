const { Retainer, Payment, Invoice, BillingActivity, Case } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields } = require('../utils/securityUtils');
const mongoose = require('mongoose');

// ============================================
// SECURITY HELPERS
// ============================================

/**
 * Validate and sanitize amount input
 * Prevents negative amounts, zero amounts, NaN, Infinity, and excessive values
 * @param {number} amount - Amount to validate
 * @param {Object} options - Validation options
 * @returns {number} - Validated amount in halalas
 * @throws {Error} - If validation fails
 */
const validateAmount = (amount, options = {}) => {
    const {
        allowZero = false,
        minAmount = 1,
        maxAmount = 999999999999, // Prevent overflow and unrealistic amounts
        fieldName = 'المبلغ'
    } = options;

    // Check if amount exists and is a number
    if (amount === undefined || amount === null) {
        throw CustomException(`${fieldName} مطلوب`, 400);
    }

    const numAmount = Number(amount);

    // Check for NaN, Infinity, or negative numbers
    if (!Number.isFinite(numAmount)) {
        throw CustomException(`${fieldName} يجب أن يكون رقماً صحيحاً`, 400);
    }

    // Validate against minimum
    if (!allowZero && numAmount < minAmount) {
        throw CustomException(`${fieldName} يجب أن يكون أكبر من الصفر`, 400);
    }

    if (allowZero && numAmount < 0) {
        throw CustomException(`${fieldName} لا يمكن أن يكون سالباً`, 400);
    }

    // Validate against maximum
    if (numAmount > maxAmount) {
        throw CustomException(`${fieldName} أكبر من المسموح به (الحد الأقصى: ${maxAmount})`, 400);
    }

    return Math.round(numAmount); // Ensure integer (halalas)
};

/**
 * Verify IDOR authorization for retainer access
 * Ensures user can only access their own retainers
 * @param {Object} retainer - Retainer document
 * @param {string} userId - Current user ID
 * @throws {Error} - If user not authorized
 */
const verifyRetainerOwnership = (retainer, userId) => {
    if (!retainer) {
        throw CustomException('العربون غير موجود', 404);
    }

    if (retainer.lawyerId.toString() !== userId) {
        throw CustomException('لا يمكنك الوصول إلى هذا العربون - الوصول مرفوض', 403);
    }
};

/**
 * Get MongoDB session for atomic operations
 * Ensures all balance operations are atomic and prevent race conditions
 * @returns {Promise<Session>} - MongoDB session
 */
const getSessionForAtomicOps = async () => {
    return mongoose.startSession();
};

/**
 * Create retainer
 * POST /api/retainers
 */
const createRetainer = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    // Mass Assignment Protection: Use only allowed fields
    const allowedFields = [
        'clientId',
        'caseId',
        'retainerType',
        'initialAmount',
        'minimumBalance',
        'startDate',
        'endDate',
        'autoReplenish',
        'replenishThreshold',
        'replenishAmount',
        'agreementUrl',
        'agreementSignedDate',
        'notes',
        'termsAndConditions'
    ];

    const input = pickAllowedFields(req.body, allowedFields);
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
    } = input;

    // Validate required fields
    if (!clientId || !retainerType || initialAmount === undefined) {
        throw CustomException('الحقول المطلوبة: العميل، نوع العربون، المبلغ الأولي', 400);
    }

    // Amount Validation: Validate initialAmount
    const validatedInitialAmount = validateAmount(initialAmount, {
        minAmount: 1,
        maxAmount: 999999999999,
        fieldName: 'المبلغ الأولي'
    });

    // Amount Validation: Validate minimumBalance
    const validatedMinimumBalance = minimumBalance !== undefined
        ? validateAmount(minimumBalance, {
            allowZero: true,
            minAmount: 0,
            maxAmount: validatedInitialAmount,
            fieldName: 'الحد الأدنى للرصيد'
        })
        : 0;

    // Validate case if provided (IDOR Protection)
    if (caseId) {
        const caseDoc = await Case.findOne({ _id: caseId, lawyerId });
        if (!caseDoc) {
            throw CustomException('القضية غير موجودة', 404);
        }
    }

    // Validate auto-replenish settings
    if (autoReplenish && (!replenishThreshold || !replenishAmount)) {
        throw CustomException('التجديد التلقائي يتطلب حد التجديد ومبلغ التجديد', 400);
    }

    // Amount Validation: Validate auto-replenish amounts if provided
    if (autoReplenish) {
        validateAmount(replenishThreshold, {
            allowZero: true,
            minAmount: 0,
            fieldName: 'حد التجديد التلقائي'
        });
        validateAmount(replenishAmount, {
            minAmount: 1,
            fieldName: 'مبلغ التجديد التلقائي'
        });
    }

    const retainer = await Retainer.create({
        clientId,
        lawyerId,
        caseId,
        retainerType,
        initialAmount: validatedInitialAmount,
        currentBalance: validatedInitialAmount,
        minimumBalance: validatedMinimumBalance,
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
        amount: validatedInitialAmount,
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

    const retainer = await Retainer.findOne({ _id: id, lawyerId })
        .populate('clientId', 'username email phone')
        .populate('lawyerId', 'username email')
        .populate('caseId', 'title caseNumber category')
        .populate('createdBy', 'username')
        .populate('consumptions.invoiceId', 'invoiceNumber totalAmount')
        .populate('deposits.paymentId', 'paymentNumber amount paymentDate');

    // IDOR Protection: Verify ownership using helper
    verifyRetainerOwnership(retainer, lawyerId);

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

    const retainer = await Retainer.findOne({ _id: id, lawyerId });

    // IDOR Protection: Verify ownership
    verifyRetainerOwnership(retainer, lawyerId);

    // Mass Assignment Protection: Use pickAllowedFields
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

    const safeInput = pickAllowedFields(req.body, allowedFields);

    // Validate amounts if provided
    if (safeInput.minimumBalance !== undefined) {
        safeInput.minimumBalance = validateAmount(safeInput.minimumBalance, {
            allowZero: true,
            minAmount: 0,
            maxAmount: retainer.currentBalance + 1000000, // Allow some buffer
            fieldName: 'الحد الأدنى للرصيد'
        });
    }

    if (safeInput.autoReplenish && safeInput.replenishThreshold !== undefined) {
        safeInput.replenishThreshold = validateAmount(safeInput.replenishThreshold, {
            allowZero: true,
            minAmount: 0,
            fieldName: 'حد التجديد التلقائي'
        });
    }

    if (safeInput.autoReplenish && safeInput.replenishAmount !== undefined) {
        safeInput.replenishAmount = validateAmount(safeInput.replenishAmount, {
            minAmount: 1,
            fieldName: 'مبلغ التجديد التلقائي'
        });
    }

    // Apply only safe fields to retainer
    Object.assign(retainer, safeInput);

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

    // Amount Validation
    const validatedAmount = validateAmount(amount, {
        minAmount: 1,
        maxAmount: 999999999999,
        fieldName: 'مبلغ الاستهلاك'
    });

    // Race Condition Protection: Start MongoDB session for atomic operations
    const session = await getSessionForAtomicOps();

    try {
        await session.withTransaction(async () => {
            // Fetch retainer within transaction with lock
            const retainer = await Retainer.findOne({ _id: id, lawyerId }).session(session);

            // IDOR Protection: Verify ownership
            verifyRetainerOwnership(retainer, lawyerId);

            if (retainer.status !== 'active') {
                throw CustomException('العربون غير نشط', 400);
            }

            // Validate invoice if provided (IDOR Protection)
            if (invoiceId) {
                const invoice = await Invoice.findOne({ _id: invoiceId, lawyerId }).session(session);
                if (!invoice) {
                    throw CustomException('الفاتورة غير موجودة', 404);
                }
            }

            // Validate sufficient balance (prevents race condition with another consume)
            if (retainer.currentBalance < validatedAmount) {
                throw CustomException('مبلغ العربون غير كافٍ - Insufficient retainer balance', 400);
            }

            // Use the model method to consume (passes session for atomic operation)
            await retainer.consume(validatedAmount, invoiceId, description, session);

            // Log activity within transaction
            await BillingActivity.logActivity({
                activityType: 'retainer_consumed',
                userId: lawyerId,
                clientId: retainer.clientId,
                relatedModel: 'Retainer',
                relatedId: retainer._id,
                description: `تم استهلاك ${validatedAmount} ريال من العربون. الرصيد الحالي: ${retainer.currentBalance}`,
                changes: { consumed: validatedAmount, balance: retainer.currentBalance },
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
        }, {
            readConcern: { level: 'snapshot' },
            writeConcern: { w: 'majority' },
            readPreference: 'primary',
            maxCommitTimeMS: 30000
        });
    } catch (error) {
        throw CustomException(error.message, 400);
    } finally {
        await session.endSession();
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

    // Amount Validation
    const validatedAmount = validateAmount(amount, {
        minAmount: 1,
        maxAmount: 999999999999,
        fieldName: 'مبلغ التجديد'
    });

    // Race Condition Protection: Start MongoDB session for atomic operations
    const session = await getSessionForAtomicOps();

    try {
        await session.withTransaction(async () => {
            // Fetch retainer within transaction with lock
            const retainer = await Retainer.findOne({ _id: id, lawyerId }).session(session);

            // IDOR Protection: Verify ownership
            verifyRetainerOwnership(retainer, lawyerId);

            // Validate payment if provided (IDOR Protection)
            if (paymentId) {
                const payment = await Payment.findOne({ _id: paymentId, lawyerId }).session(session);
                if (!payment) {
                    throw CustomException('الدفعة غير موجودة', 404);
                }
                if (payment.status !== 'completed') {
                    throw CustomException('يجب أن تكون الدفعة مكتملة', 400);
                }
            }

            // Use the model method to replenish (passes session for atomic operation)
            await retainer.replenish(validatedAmount, paymentId, session);

            // Log activity within transaction
            await BillingActivity.logActivity({
                activityType: 'retainer_replenished',
                userId: lawyerId,
                clientId: retainer.clientId,
                relatedModel: 'Retainer',
                relatedId: retainer._id,
                description: `تم تجديد العربون بمبلغ ${validatedAmount} ريال. الرصيد الحالي: ${retainer.currentBalance}`,
                changes: { added: validatedAmount, balance: retainer.currentBalance },
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
        }, {
            readConcern: { level: 'snapshot' },
            writeConcern: { w: 'majority' },
            readPreference: 'primary',
            maxCommitTimeMS: 30000
        });
    } catch (error) {
        throw CustomException(error.message, 400);
    } finally {
        await session.endSession();
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

    // Race Condition Protection: Start MongoDB session for atomic operations
    const session = await getSessionForAtomicOps();

    try {
        await session.withTransaction(async () => {
            // Fetch retainer within transaction with lock
            const retainer = await Retainer.findOne({ _id: id, lawyerId }).session(session);

            // IDOR Protection: Verify ownership
            verifyRetainerOwnership(retainer, lawyerId);

            if (retainer.status === 'refunded') {
                throw CustomException('تم استرداد العربون بالفعل', 400);
            }

            const refundAmount = retainer.currentBalance;

            retainer.status = 'refunded';
            retainer.currentBalance = 0;
            await retainer.save({ session });

            // Log activity within transaction
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
        }, {
            readConcern: { level: 'snapshot' },
            writeConcern: { w: 'majority' },
            readPreference: 'primary',
            maxCommitTimeMS: 30000
        });
    } catch (error) {
        throw CustomException(error.message, 400);
    } finally {
        await session.endSession();
    }
});

/**
 * Get retainer history
 * GET /api/retainers/:id/history
 */
const getRetainerHistory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const retainer = await Retainer.findOne({ _id: id, lawyerId })
        .populate('consumptions.invoiceId', 'invoiceNumber totalAmount')
        .populate('deposits.paymentId', 'paymentNumber amount paymentDate');

    // IDOR Protection: Verify ownership using helper
    verifyRetainerOwnership(retainer, lawyerId);

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
