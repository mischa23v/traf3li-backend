const { BillingRate, BillingActivity } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

/**
 * Create billing rate
 * POST /api/billing-rates
 */
const createRate = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const allowedFields = [
        'rateType',
        'standardHourlyRate',
        'clientId',
        'caseType',
        'activityCode',
        'customRate',
        'effectiveDate',
        'endDate',
        'currency',
        'notes'
    ];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    const {
        rateType,
        standardHourlyRate,
        clientId,
        caseType,
        activityCode,
        customRate,
        effectiveDate,
        endDate,
        currency = 'SAR',
        notes
    } = sanitizedData;

    const lawyerId = req.userID;
    const firmId = req.user?.firmId;

    // Validate required fields
    if (!rateType || !standardHourlyRate) {
        throw CustomException('نوع السعر والسعر بالساعة مطلوبان', 400);
    }

    // Input validation for rate amounts
    if (typeof standardHourlyRate !== 'number' || standardHourlyRate <= 0 || standardHourlyRate > 100000) {
        throw CustomException('السعر بالساعة يجب أن يكون رقماً موجباً ومعقولاً', 400);
    }

    if (customRate !== undefined && customRate !== null) {
        if (typeof customRate !== 'number' || customRate <= 0 || customRate > 100000) {
            throw CustomException('السعر المخصص يجب أن يكون رقماً موجباً ومعقولاً', 400);
        }
    }

    // Validate rate type specific requirements
    if (rateType === 'custom_client' && !clientId) {
        throw CustomException('معرف العميل مطلوب لسعر العميل المخصص', 400);
    }

    if (rateType === 'custom_case_type' && !caseType) {
        throw CustomException('نوع القضية مطلوب لسعر نوع القضية المخصص', 400);
    }

    if (rateType === 'activity_based' && !activityCode) {
        throw CustomException('رمز النشاط مطلوب للسعر المبني على النشاط', 400);
    }

    // Sanitize ObjectIds
    const sanitizedClientId = clientId ? sanitizeObjectId(clientId) : undefined;

    const billingRate = await BillingRate.create({
        lawyerId,
        firmId,
        rateType,
        standardHourlyRate,
        clientId: sanitizedClientId,
        caseType,
        activityCode,
        customRate,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        currency,
        notes,
        isActive: true,
        createdBy: lawyerId
    });

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'billing_rate_created',
        userId: lawyerId,
        relatedModel: 'BillingRate',
        relatedId: billingRate._id,
        description: `تم إنشاء سعر ${rateType}: ${standardHourlyRate} ${currency}/ساعة`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    await billingRate.populate([
        { path: 'clientId', select: 'username email' },
        { path: 'createdBy', select: 'username' }
    ]);

    res.status(201).json({
        success: true,
        message: 'تم إنشاء السعر بنجاح',
        billingRate
    });
});

/**
 * Get billing rates
 * GET /api/billing-rates
 */
const getRates = asyncHandler(async (req, res) => {
    const {
        rateType,
        clientId,
        isActive,
        page = 1,
        limit = 50
    } = req.query;

    const lawyerId = req.userID;
    const firmId = req.user?.firmId;

    // IDOR protection - verify firmId ownership
    const query = { lawyerId };
    if (firmId) {
        query.firmId = firmId;
    }

    if (rateType) query.rateType = rateType;
    if (clientId) query.clientId = sanitizeObjectId(clientId);
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const billingRates = await BillingRate.find(query)
        .populate('clientId', 'username email')
        .populate('createdBy', 'username')
        .sort({ effectiveDate: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await BillingRate.countDocuments(query);

    res.status(200).json({
        success: true,
        data: billingRates,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single billing rate
 * GET /api/billing-rates/:id
 */
const getRate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.user?.firmId;

    // Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(id);

    const billingRate = await BillingRate.findById(sanitizedId)
        .populate('clientId', 'username email phone')
        .populate('createdBy', 'username');

    if (!billingRate) {
        throw CustomException('السعر غير موجود', 404);
    }

    // IDOR protection - verify ownership
    if (billingRate.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذا السعر', 403);
    }

    // Additional firmId verification if available
    if (firmId && billingRate.firmId && billingRate.firmId.toString() !== firmId.toString()) {
        throw CustomException('لا يمكنك الوصول إلى هذا السعر', 403);
    }

    res.status(200).json({
        success: true,
        data: billingRate
    });
});

/**
 * Update billing rate
 * PUT /api/billing-rates/:id
 */
const updateRate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.user?.firmId;

    // Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(id);

    const billingRate = await BillingRate.findById(sanitizedId);

    if (!billingRate) {
        throw CustomException('السعر غير موجود', 404);
    }

    // IDOR protection - verify ownership
    if (billingRate.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذا السعر', 403);
    }

    // Additional firmId verification if available
    if (firmId && billingRate.firmId && billingRate.firmId.toString() !== firmId.toString()) {
        throw CustomException('لا يمكنك الوصول إلى هذا السعر', 403);
    }

    // Mass assignment protection
    const allowedFields = [
        'standardHourlyRate',
        'customRate',
        'effectiveDate',
        'endDate',
        'isActive',
        'notes'
    ];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Input validation for rate amounts
    if (sanitizedData.standardHourlyRate !== undefined) {
        if (typeof sanitizedData.standardHourlyRate !== 'number' ||
            sanitizedData.standardHourlyRate <= 0 ||
            sanitizedData.standardHourlyRate > 100000) {
            throw CustomException('السعر بالساعة يجب أن يكون رقماً موجباً ومعقولاً', 400);
        }
    }

    if (sanitizedData.customRate !== undefined && sanitizedData.customRate !== null) {
        if (typeof sanitizedData.customRate !== 'number' ||
            sanitizedData.customRate <= 0 ||
            sanitizedData.customRate > 100000) {
            throw CustomException('السعر المخصص يجب أن يكون رقماً موجباً ومعقولاً', 400);
        }
    }

    const changes = {};
    allowedFields.forEach(field => {
        if (sanitizedData[field] !== undefined && sanitizedData[field] !== billingRate[field]) {
            changes[field] = { old: billingRate[field], new: sanitizedData[field] };
            billingRate[field] = sanitizedData[field];
        }
    });

    await billingRate.save();

    // Log activity
    if (Object.keys(changes).length > 0) {
        await BillingActivity.logActivity({
            activityType: 'billing_rate_updated',
            userId: lawyerId,
            relatedModel: 'BillingRate',
            relatedId: billingRate._id,
            description: `تم تحديث السعر ${billingRate.rateType}`,
            changes,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
    }

    await billingRate.populate([
        { path: 'clientId', select: 'username email' }
    ]);

    res.status(200).json({
        success: true,
        message: 'تم تحديث السعر بنجاح',
        billingRate
    });
});

/**
 * Delete billing rate
 * DELETE /api/billing-rates/:id
 */
const deleteRate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.user?.firmId;

    // Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(id);

    const billingRate = await BillingRate.findById(sanitizedId);

    if (!billingRate) {
        throw CustomException('السعر غير موجود', 404);
    }

    // IDOR protection - verify ownership
    if (billingRate.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذا السعر', 403);
    }

    // Additional firmId verification if available
    if (firmId && billingRate.firmId && billingRate.firmId.toString() !== firmId.toString()) {
        throw CustomException('لا يمكنك الوصول إلى هذا السعر', 403);
    }

    await BillingRate.findByIdAndDelete(sanitizedId);

    res.status(200).json({
        success: true,
        message: 'تم حذف السعر بنجاح'
    });
});

/**
 * Get applicable rate for context
 * GET /api/billing-rates/applicable
 */
const getApplicableRate = asyncHandler(async (req, res) => {
    const { clientId, caseType, activityCode } = req.query;
    const lawyerId = req.userID;

    // Sanitize ObjectId if provided
    const sanitizedClientId = clientId ? sanitizeObjectId(clientId) : null;

    const rate = await BillingRate.getApplicableRate(
        lawyerId,
        sanitizedClientId,
        caseType || null,
        activityCode || null
    );

    if (!rate) {
        throw CustomException('لم يتم العثور على سعر. يرجى تعيين سعر قياسي أولاً', 404);
    }

    res.status(200).json({
        success: true,
        data: {
            hourlyRate: rate,
            currency: 'SAR'
        }
    });
});

/**
 * Set standard rate (Quick setup)
 * POST /api/billing-rates/standard
 */
const setStandardRate = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const allowedFields = ['standardHourlyRate', 'currency'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    const { standardHourlyRate, currency = 'SAR' } = sanitizedData;
    const lawyerId = req.userID;
    const firmId = req.user?.firmId;

    // Input validation for rate amounts
    if (!standardHourlyRate || typeof standardHourlyRate !== 'number' ||
        standardHourlyRate <= 0 || standardHourlyRate > 100000) {
        throw CustomException('السعر بالساعة مطلوب ويجب أن يكون رقماً موجباً ومعقولاً', 400);
    }

    // Check if standard rate already exists
    const query = {
        lawyerId,
        rateType: 'standard',
        isActive: true
    };
    if (firmId) {
        query.firmId = firmId;
    }

    const existingRate = await BillingRate.findOne(query);

    if (existingRate) {
        // Update existing
        existingRate.standardHourlyRate = standardHourlyRate;
        existingRate.currency = currency;
        existingRate.effectiveDate = new Date();
        await existingRate.save();

        return res.status(200).json({
            success: true,
            message: 'تم تحديث السعر القياسي بنجاح',
            billingRate: existingRate
        });
    }

    // Create new
    const billingRate = await BillingRate.create({
        lawyerId,
        firmId,
        rateType: 'standard',
        standardHourlyRate,
        currency,
        isActive: true,
        createdBy: lawyerId
    });

    res.status(201).json({
        success: true,
        message: 'تم تعيين السعر القياسي بنجاح',
        billingRate
    });
});

/**
 * Get rate statistics
 * GET /api/billing-rates/stats
 */
const getRateStats = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.user?.firmId;

    // IDOR protection - build match query
    const matchQuery = { lawyerId, isActive: true };
    if (firmId) {
        matchQuery.firmId = firmId;
    }

    const stats = await BillingRate.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$rateType',
                count: { $sum: 1 },
                avgRate: { $avg: '$standardHourlyRate' },
                minRate: { $min: '$standardHourlyRate' },
                maxRate: { $max: '$standardHourlyRate' }
            }
        }
    ]);

    const standardRateQuery = {
        lawyerId,
        rateType: 'standard',
        isActive: true
    };
    if (firmId) {
        standardRateQuery.firmId = firmId;
    }

    const standardRate = await BillingRate.findOne(standardRateQuery);

    res.status(200).json({
        success: true,
        data: {
            byType: stats,
            standardRate: standardRate ? standardRate.standardHourlyRate : null,
            hasStandardRate: !!standardRate
        }
    });
});

module.exports = {
    createRate,
    getRates,
    getRate,
    updateRate,
    deleteRate,
    getApplicableRate,
    setStandardRate,
    getRateStats
};
