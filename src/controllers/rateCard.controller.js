const { RateCard, RateGroup, Client, Case } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Create rate card
 * POST /api/rate-cards
 */
const createRateCard = asyncHandler(async (req, res) => {
    const {
        name, nameAr, clientId, caseId, rateGroupId,
        customRates, effectiveDate, expiryDate, notes
    } = req.body;
    const lawyerId = req.userID;

    if (!name) {
        throw CustomException('اسم بطاقة الأسعار مطلوب', 400);
    }

    // Verify client exists if provided
    if (clientId) {
        const client = await Client.findOne({ _id: clientId, lawyerId });
        if (!client) {
            throw CustomException('العميل غير موجود', 404);
        }
    }

    // Verify case exists if provided
    if (caseId) {
        const caseDoc = await Case.findOne({ _id: caseId, lawyerId });
        if (!caseDoc) {
            throw CustomException('القضية غير موجودة', 404);
        }
    }

    // Verify rate group exists if provided
    if (rateGroupId) {
        const rateGroup = await RateGroup.findOne({ _id: rateGroupId, lawyerId });
        if (!rateGroup) {
            throw CustomException('مجموعة الأسعار غير موجودة', 404);
        }
    }

    const rateCard = await RateCard.create({
        lawyerId,
        name: name.trim(),
        nameAr: nameAr?.trim(),
        clientId,
        caseId,
        rateGroupId,
        customRates: customRates || [],
        effectiveDate,
        expiryDate,
        notes
    });

    res.status(201).json({
        success: true,
        message: 'تم إنشاء بطاقة الأسعار بنجاح',
        data: rateCard
    });
});

/**
 * Get all rate cards
 * GET /api/rate-cards
 */
const getRateCards = asyncHandler(async (req, res) => {
    const { clientId, caseId, isActive, page = 1, limit = 50 } = req.query;
    const lawyerId = req.userID;

    const query = { lawyerId };
    if (clientId) query.clientId = clientId;
    if (caseId) query.caseId = caseId;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const rateCards = await RateCard.find(query)
        .populate('clientId', 'firstName lastName companyName')
        .populate('caseId', 'title caseNumber')
        .populate('rateGroupId', 'name nameAr')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await RateCard.countDocuments(query);

    res.status(200).json({
        success: true,
        data: rateCards,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single rate card
 * GET /api/rate-cards/:id
 */
const getRateCard = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const rateCard = await RateCard.findOne({ _id: id, lawyerId })
        .populate('clientId', 'firstName lastName companyName email')
        .populate('caseId', 'title caseNumber')
        .populate('rateGroupId');

    if (!rateCard) {
        throw CustomException('بطاقة الأسعار غير موجودة', 404);
    }

    res.status(200).json({
        success: true,
        data: rateCard
    });
});

/**
 * Update rate card
 * PATCH /api/rate-cards/:id
 */
const updateRateCard = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const rateCard = await RateCard.findOne({ _id: id, lawyerId });

    if (!rateCard) {
        throw CustomException('بطاقة الأسعار غير موجودة', 404);
    }

    const allowedFields = [
        'name', 'nameAr', 'clientId', 'caseId', 'rateGroupId',
        'customRates', 'effectiveDate', 'expiryDate', 'isActive', 'notes'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            rateCard[field] = req.body[field];
        }
    });

    await rateCard.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث بطاقة الأسعار بنجاح',
        data: rateCard
    });
});

/**
 * Delete rate card
 * DELETE /api/rate-cards/:id
 */
const deleteRateCard = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const rateCard = await RateCard.findOneAndDelete({ _id: id, lawyerId });

    if (!rateCard) {
        throw CustomException('بطاقة الأسعار غير موجودة', 404);
    }

    res.status(200).json({
        success: true,
        message: 'تم حذف بطاقة الأسعار بنجاح'
    });
});

/**
 * Get rate card for client
 * GET /api/rate-cards/client/:clientId
 */
const getRateCardForClient = asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    const lawyerId = req.userID;

    const rateCard = await RateCard.findOne({
        lawyerId,
        clientId,
        isActive: true,
        $or: [
            { expiryDate: { $exists: false } },
            { expiryDate: null },
            { expiryDate: { $gte: new Date() } }
        ]
    })
        .populate('rateGroupId')
        .sort({ effectiveDate: -1 });

    res.status(200).json({
        success: true,
        data: rateCard
    });
});

/**
 * Get rate card for case
 * GET /api/rate-cards/case/:caseId
 */
const getRateCardForCase = asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const lawyerId = req.userID;

    // First try to find case-specific rate card
    let rateCard = await RateCard.findOne({
        lawyerId,
        caseId,
        isActive: true,
        $or: [
            { expiryDate: { $exists: false } },
            { expiryDate: null },
            { expiryDate: { $gte: new Date() } }
        ]
    })
        .populate('rateGroupId')
        .sort({ effectiveDate: -1 });

    // If no case-specific card, try to find client-specific card
    if (!rateCard) {
        const caseDoc = await Case.findById(caseId);
        if (caseDoc && caseDoc.clientId) {
            rateCard = await RateCard.findOne({
                lawyerId,
                clientId: caseDoc.clientId,
                caseId: { $exists: false },
                isActive: true,
                $or: [
                    { expiryDate: { $exists: false } },
                    { expiryDate: null },
                    { expiryDate: { $gte: new Date() } }
                ]
            })
                .populate('rateGroupId')
                .sort({ effectiveDate: -1 });
        }
    }

    res.status(200).json({
        success: true,
        data: rateCard
    });
});

/**
 * Add custom rate to card
 * POST /api/rate-cards/:id/rates
 */
const addCustomRate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { activityCode, description, rate, unit, minimum, roundingIncrement } = req.body;
    const lawyerId = req.userID;

    if (!activityCode || !rate) {
        throw CustomException('رمز النشاط والسعر مطلوبان', 400);
    }

    const rateCard = await RateCard.findOne({ _id: id, lawyerId });

    if (!rateCard) {
        throw CustomException('بطاقة الأسعار غير موجودة', 404);
    }

    // Check if activity code already exists
    const existingRate = rateCard.customRates.find(
        r => r.activityCode === activityCode
    );
    if (existingRate) {
        throw CustomException('رمز النشاط موجود بالفعل في البطاقة', 400);
    }

    rateCard.customRates.push({
        activityCode,
        description,
        rate,
        unit: unit || 'hour',
        minimum,
        roundingIncrement
    });

    await rateCard.save();

    res.status(200).json({
        success: true,
        message: 'تم إضافة السعر المخصص بنجاح',
        data: rateCard
    });
});

/**
 * Update custom rate in card
 * PATCH /api/rate-cards/:id/rates/:rateId
 */
const updateCustomRate = asyncHandler(async (req, res) => {
    const { id, rateId } = req.params;
    const lawyerId = req.userID;

    const rateCard = await RateCard.findOne({ _id: id, lawyerId });

    if (!rateCard) {
        throw CustomException('بطاقة الأسعار غير موجودة', 404);
    }

    const rateIndex = rateCard.customRates.findIndex(
        r => r._id.toString() === rateId
    );

    if (rateIndex === -1) {
        throw CustomException('السعر المخصص غير موجود', 404);
    }

    const allowedFields = ['activityCode', 'description', 'rate', 'unit', 'minimum', 'roundingIncrement'];
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            rateCard.customRates[rateIndex][field] = req.body[field];
        }
    });

    await rateCard.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث السعر المخصص بنجاح',
        data: rateCard
    });
});

/**
 * Remove custom rate from card
 * DELETE /api/rate-cards/:id/rates/:rateId
 */
const removeCustomRate = asyncHandler(async (req, res) => {
    const { id, rateId } = req.params;
    const lawyerId = req.userID;

    const rateCard = await RateCard.findOne({ _id: id, lawyerId });

    if (!rateCard) {
        throw CustomException('بطاقة الأسعار غير موجودة', 404);
    }

    rateCard.customRates = rateCard.customRates.filter(
        r => r._id.toString() !== rateId
    );

    await rateCard.save();

    res.status(200).json({
        success: true,
        message: 'تم إزالة السعر المخصص بنجاح',
        data: rateCard
    });
});

/**
 * Calculate rate for activity
 * POST /api/rate-cards/calculate
 */
const calculateRate = asyncHandler(async (req, res) => {
    const { clientId, caseId, activityCode, hours } = req.body;
    const lawyerId = req.userID;

    if (!activityCode || !hours) {
        throw CustomException('رمز النشاط والساعات مطلوبة', 400);
    }

    // Try to find applicable rate card
    let rateCard = null;

    // First try case-specific
    if (caseId) {
        rateCard = await RateCard.findOne({
            lawyerId,
            caseId,
            isActive: true
        }).populate('rateGroupId');
    }

    // Then try client-specific
    if (!rateCard && clientId) {
        rateCard = await RateCard.findOne({
            lawyerId,
            clientId,
            caseId: { $exists: false },
            isActive: true
        }).populate('rateGroupId');
    }

    // Find the rate
    let rate = null;
    let source = 'default';

    if (rateCard) {
        // Check custom rates first
        const customRate = rateCard.customRates.find(
            r => r.activityCode === activityCode
        );
        if (customRate) {
            rate = customRate.rate;
            source = 'custom';
        }
        // Then check rate group
        else if (rateCard.rateGroupId && rateCard.rateGroupId.rates) {
            const groupRate = rateCard.rateGroupId.rates.find(
                r => r.activityCode === activityCode
            );
            if (groupRate) {
                rate = groupRate.customRate || (groupRate.billingRateId?.rate * (groupRate.multiplier || 1));
                source = 'group';
            }
        }
    }

    // Calculate total
    const total = rate ? rate * parseFloat(hours) : null;

    res.status(200).json({
        success: true,
        data: {
            activityCode,
            hours: parseFloat(hours),
            rate,
            total,
            source,
            rateCardId: rateCard?._id
        }
    });
});

module.exports = {
    createRateCard,
    getRateCards,
    getRateCard,
    updateRateCard,
    deleteRateCard,
    getRateCardForClient,
    getRateCardForCase,
    addCustomRate,
    updateCustomRate,
    removeCustomRate,
    calculateRate
};
