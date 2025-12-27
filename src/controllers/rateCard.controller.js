const { RateCard, RateGroup, Client, Case } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

/**
 * Validate rate amount
 */
const validateRateAmount = (rate, fieldName = 'السعر') => {
    if (rate === null || rate === undefined) {
        return; // Allow null/undefined for optional fields
    }

    const numRate = parseFloat(rate);
    if (isNaN(numRate)) {
        throw CustomException(`${fieldName} يجب أن يكون رقماً صحيحاً`, 400);
    }
    if (numRate < 0) {
        throw CustomException(`${fieldName} لا يمكن أن يكون سالباً`, 400);
    }
    if (numRate > 1000000) {
        throw CustomException(`${fieldName} مرتفع جداً`, 400);
    }
    return numRate;
};

/**
 * Validate and sanitize custom rates array
 */
const validateCustomRates = (customRates) => {
    if (!customRates || !Array.isArray(customRates)) {
        return [];
    }

    return customRates.map(rate => {
        const sanitized = pickAllowedFields(rate, [
            'activityCode', 'description', 'rate', 'unit', 'minimum', 'roundingIncrement'
        ]);

        // Validate rate amount
        if (sanitized.rate !== undefined) {
            sanitized.rate = validateRateAmount(sanitized.rate, 'معدل النشاط');
        }

        // Validate minimum
        if (sanitized.minimum !== undefined) {
            sanitized.minimum = validateRateAmount(sanitized.minimum, 'الحد الأدنى');
        }

        // Validate roundingIncrement
        if (sanitized.roundingIncrement !== undefined) {
            sanitized.roundingIncrement = validateRateAmount(sanitized.roundingIncrement, 'خطوة التقريب');
        }

        return sanitized;
    });
};

/**
 * Create rate card
 * POST /api/rate-cards
 */
const createRateCard = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection
    const allowedData = pickAllowedFields(req.body, [
        'name', 'nameAr', 'clientId', 'caseId', 'rateGroupId',
        'customRates', 'effectiveDate', 'expiryDate', 'notes'
    ]);

    if (!allowedData.name) {
        throw CustomException('اسم بطاقة الأسعار مطلوب', 400);
    }

    // Sanitize IDs to prevent injection
    const clientId = allowedData.clientId ? sanitizeObjectId(allowedData.clientId) : null;
    const caseId = allowedData.caseId ? sanitizeObjectId(allowedData.caseId) : null;
    const rateGroupId = allowedData.rateGroupId ? sanitizeObjectId(allowedData.rateGroupId) : null;

    // IDOR Protection: Verify client exists and belongs to firm/lawyer
    if (clientId) {
        const client = await Client.findOne({ _id: clientId, ...req.firmQuery });
        if (!client) {
            throw CustomException('العميل غير موجود', 404);
        }
    }

    // IDOR Protection: Verify case exists and belongs to firm/lawyer
    if (caseId) {
        const caseDoc = await Case.findOne({ _id: caseId, ...req.firmQuery });
        if (!caseDoc) {
            throw CustomException('القضية غير موجودة', 404);
        }
    }

    // IDOR Protection: Verify rate group exists and belongs to firm/lawyer
    if (rateGroupId) {
        const rateGroup = await RateGroup.findOne({ _id: rateGroupId, ...req.firmQuery });
        if (!rateGroup) {
            throw CustomException('مجموعة الأسعار غير موجودة', 404);
        }
    }

    // Validate and sanitize custom rates
    const sanitizedCustomRates = validateCustomRates(allowedData.customRates);

    const rateCard = await RateCard.create({
        lawyerId,
        firmId,
        name: allowedData.name.trim(),
        nameAr: allowedData.nameAr?.trim(),
        clientId,
        caseId,
        rateGroupId,
        customRates: sanitizedCustomRates,
        effectiveDate: allowedData.effectiveDate,
        expiryDate: allowedData.expiryDate,
        notes: allowedData.notes
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
    // Mass assignment protection for query parameters
    const allowedQuery = pickAllowedFields(req.query, [
        'clientId', 'caseId', 'isActive', 'page', 'limit'
    ]);

    // Firm/lawyer-level isolation
    const query = { ...req.firmQuery };

    // Sanitize IDs if provided
    if (allowedQuery.clientId) {
        query.clientId = sanitizeObjectId(allowedQuery.clientId);
    }
    if (allowedQuery.caseId) {
        query.caseId = sanitizeObjectId(allowedQuery.caseId);
    }
    if (allowedQuery.isActive !== undefined) {
        query.isActive = allowedQuery.isActive === 'true';
    }

    // Validate pagination parameters
    const page = Math.max(1, parseInt(allowedQuery.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(allowedQuery.limit) || 50));

    const rateCards = await RateCard.find(query)
        .populate('clientId', 'firstName lastName companyName')
        .populate('caseId', 'title caseNumber')
        .populate('rateGroupId', 'name nameAr')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

    const total = await RateCard.countDocuments(query);

    res.status(200).json({
        success: true,
        data: rateCards,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

/**
 * Get single rate card
 * GET /api/rate-cards/:id
 */
const getRateCard = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Sanitize ID parameter
    const rateCardId = sanitizeObjectId(id);

    // IDOR Protection: Verify rate card exists and belongs to firm/lawyer
    const rateCard = await RateCard.findOne({ _id: rateCardId, ...req.firmQuery })
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

    // Sanitize ID parameter
    const rateCardId = sanitizeObjectId(id);

    // IDOR Protection: Verify rate card exists and belongs to firm/lawyer
    const rateCard = await RateCard.findOne({ _id: rateCardId, ...req.firmQuery });

    if (!rateCard) {
        throw CustomException('بطاقة الأسعار غير موجودة', 404);
    }

    // Mass assignment protection
    const allowedData = pickAllowedFields(req.body, [
        'name', 'nameAr', 'clientId', 'caseId', 'rateGroupId',
        'customRates', 'effectiveDate', 'expiryDate', 'isActive', 'notes'
    ]);

    // IDOR Protection: Verify client ownership if being updated
    if (allowedData.clientId !== undefined) {
        const clientId = sanitizeObjectId(allowedData.clientId);
        if (clientId) {
            const client = await Client.findOne({ _id: clientId, ...req.firmQuery });
            if (!client) {
                throw CustomException('العميل غير موجود', 404);
            }
        }
        rateCard.clientId = clientId;
    }

    // IDOR Protection: Verify case ownership if being updated
    if (allowedData.caseId !== undefined) {
        const caseId = sanitizeObjectId(allowedData.caseId);
        if (caseId) {
            const caseDoc = await Case.findOne({ _id: caseId, ...req.firmQuery });
            if (!caseDoc) {
                throw CustomException('القضية غير موجودة', 404);
            }
        }
        rateCard.caseId = caseId;
    }

    // IDOR Protection: Verify rate group ownership if being updated
    if (allowedData.rateGroupId !== undefined) {
        const rateGroupId = sanitizeObjectId(allowedData.rateGroupId);
        if (rateGroupId) {
            const rateGroup = await RateGroup.findOne({ _id: rateGroupId, ...req.firmQuery });
            if (!rateGroup) {
                throw CustomException('مجموعة الأسعار غير موجودة', 404);
            }
        }
        rateCard.rateGroupId = rateGroupId;
    }

    // Validate and sanitize custom rates if being updated
    if (allowedData.customRates !== undefined) {
        rateCard.customRates = validateCustomRates(allowedData.customRates);
    }

    // Update other allowed fields
    ['name', 'nameAr', 'effectiveDate', 'expiryDate', 'isActive', 'notes'].forEach(field => {
        if (allowedData[field] !== undefined) {
            rateCard[field] = field === 'name' || field === 'nameAr'
                ? allowedData[field]?.trim()
                : allowedData[field];
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

    // Sanitize ID parameter
    const rateCardId = sanitizeObjectId(id);

    // IDOR Protection: Verify rate card exists and belongs to firm/lawyer before deletion
    const rateCard = await RateCard.findOneAndDelete({ _id: rateCardId, ...req.firmQuery });

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

    // Sanitize ID parameter
    const sanitizedClientId = sanitizeObjectId(clientId);

    // IDOR Protection: Verify client exists and belongs to firm/lawyer
    const client = await Client.findOne({ _id: sanitizedClientId, ...req.firmQuery });
    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    const rateCard = await RateCard.findOne({
        ...req.firmQuery,
        clientId: sanitizedClientId,
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

    // Sanitize ID parameter
    const sanitizedCaseId = sanitizeObjectId(caseId);

    // IDOR Protection: Verify case exists and belongs to firm/lawyer
    const caseDoc = await Case.findOne({ _id: sanitizedCaseId, ...req.firmQuery });
    if (!caseDoc) {
        throw CustomException('القضية غير موجودة', 404);
    }

    // First try to find case-specific rate card
    let rateCard = await RateCard.findOne({
        ...req.firmQuery,
        caseId: sanitizedCaseId,
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
    if (!rateCard && caseDoc.clientId) {
        rateCard = await RateCard.findOne({
            ...req.firmQuery,
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

    // Sanitize ID parameter
    const rateCardId = sanitizeObjectId(id);

    // Mass assignment protection
    const allowedData = pickAllowedFields(req.body, [
        'activityCode', 'description', 'rate', 'unit', 'minimum', 'roundingIncrement'
    ]);

    if (!allowedData.activityCode || allowedData.rate === undefined || allowedData.rate === null) {
        throw CustomException('رمز النشاط والسعر مطلوبان', 400);
    }

    // Validate rate amounts
    const validatedRate = validateRateAmount(allowedData.rate, 'السعر');
    const validatedMinimum = allowedData.minimum !== undefined
        ? validateRateAmount(allowedData.minimum, 'الحد الأدنى')
        : undefined;
    const validatedRoundingIncrement = allowedData.roundingIncrement !== undefined
        ? validateRateAmount(allowedData.roundingIncrement, 'خطوة التقريب')
        : undefined;

    // IDOR Protection: Verify rate card exists and belongs to firm/lawyer
    const rateCard = await RateCard.findOne({ _id: rateCardId, ...req.firmQuery });

    if (!rateCard) {
        throw CustomException('بطاقة الأسعار غير موجودة', 404);
    }

    // Check if activity code already exists
    const existingRate = rateCard.customRates.find(
        r => r.activityCode === allowedData.activityCode
    );
    if (existingRate) {
        throw CustomException('رمز النشاط موجود بالفعل في البطاقة', 400);
    }

    // Add validated custom rate
    rateCard.customRates.push({
        activityCode: allowedData.activityCode,
        description: allowedData.description,
        rate: validatedRate,
        unit: allowedData.unit || 'hour',
        minimum: validatedMinimum,
        roundingIncrement: validatedRoundingIncrement
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

    // Sanitize ID parameters
    const rateCardId = sanitizeObjectId(id);
    const customRateId = sanitizeObjectId(rateId);

    // IDOR Protection: Verify rate card exists and belongs to firm/lawyer
    const rateCard = await RateCard.findOne({ _id: rateCardId, ...req.firmQuery });

    if (!rateCard) {
        throw CustomException('بطاقة الأسعار غير موجودة', 404);
    }

    const rateIndex = rateCard.customRates.findIndex(
        r => r._id.toString() === customRateId
    );

    if (rateIndex === -1) {
        throw CustomException('السعر المخصص غير موجود', 404);
    }

    // Mass assignment protection
    const allowedData = pickAllowedFields(req.body, [
        'activityCode', 'description', 'rate', 'unit', 'minimum', 'roundingIncrement'
    ]);

    // Validate rate amounts if being updated
    if (allowedData.rate !== undefined) {
        rateCard.customRates[rateIndex].rate = validateRateAmount(allowedData.rate, 'السعر');
    }

    if (allowedData.minimum !== undefined) {
        rateCard.customRates[rateIndex].minimum = validateRateAmount(allowedData.minimum, 'الحد الأدنى');
    }

    if (allowedData.roundingIncrement !== undefined) {
        rateCard.customRates[rateIndex].roundingIncrement = validateRateAmount(
            allowedData.roundingIncrement,
            'خطوة التقريب'
        );
    }

    // Update other allowed fields
    ['activityCode', 'description', 'unit'].forEach(field => {
        if (allowedData[field] !== undefined) {
            rateCard.customRates[rateIndex][field] = allowedData[field];
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

    // Sanitize ID parameters
    const rateCardId = sanitizeObjectId(id);
    const customRateId = sanitizeObjectId(rateId);

    // IDOR Protection: Verify rate card exists and belongs to firm/lawyer
    const rateCard = await RateCard.findOne({ _id: rateCardId, ...req.firmQuery });

    if (!rateCard) {
        throw CustomException('بطاقة الأسعار غير موجودة', 404);
    }

    rateCard.customRates = rateCard.customRates.filter(
        r => r._id.toString() !== customRateId
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
    // Mass assignment protection
    const allowedData = pickAllowedFields(req.body, [
        'clientId', 'caseId', 'activityCode', 'hours'
    ]);

    if (!allowedData.activityCode || !allowedData.hours) {
        throw CustomException('رمز النشاط والساعات مطلوبة', 400);
    }

    // Validate hours input
    const hours = parseFloat(allowedData.hours);
    if (isNaN(hours) || hours < 0) {
        throw CustomException('الساعات يجب أن تكون رقماً موجباً', 400);
    }
    if (hours > 1000) {
        throw CustomException('عدد الساعات مرتفع جداً', 400);
    }

    // Sanitize IDs
    const clientId = allowedData.clientId ? sanitizeObjectId(allowedData.clientId) : null;
    const caseId = allowedData.caseId ? sanitizeObjectId(allowedData.caseId) : null;

    // IDOR Protection: Verify client ownership if provided
    if (clientId) {
        const client = await Client.findOne({ _id: clientId, ...req.firmQuery });
        if (!client) {
            throw CustomException('العميل غير موجود', 404);
        }
    }

    // IDOR Protection: Verify case ownership if provided
    if (caseId) {
        const caseDoc = await Case.findOne({ _id: caseId, ...req.firmQuery });
        if (!caseDoc) {
            throw CustomException('القضية غير موجودة', 404);
        }
    }

    // Try to find applicable rate card
    let rateCard = null;

    // First try case-specific
    if (caseId) {
        rateCard = await RateCard.findOne({
            ...req.firmQuery,
            caseId,
            isActive: true
        }).populate('rateGroupId');
    }

    // Then try client-specific
    if (!rateCard && clientId) {
        rateCard = await RateCard.findOne({
            ...req.firmQuery,
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
            r => r.activityCode === allowedData.activityCode
        );
        if (customRate) {
            rate = customRate.rate;
            source = 'custom';
        }
        // Then check rate group
        else if (rateCard.rateGroupId && rateCard.rateGroupId.rates) {
            const groupRate = rateCard.rateGroupId.rates.find(
                r => r.activityCode === allowedData.activityCode
            );
            if (groupRate) {
                rate = groupRate.customRate || (groupRate.billingRateId?.rate * (groupRate.multiplier || 1));
                source = 'group';
            }
        }
    }

    // Calculate total (prevent rate manipulation)
    const total = rate && !isNaN(rate) ? Number((rate * hours).toFixed(2)) : null;

    res.status(200).json({
        success: true,
        data: {
            activityCode: allowedData.activityCode,
            hours,
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
