const { BillingRate, BillingActivity } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Create billing rate
 * POST /api/billing-rates
 */
const createRate = asyncHandler(async (req, res) => {
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
    } = req.body;

    const lawyerId = req.userID;

    // Validate required fields
    if (!rateType || !standardHourlyRate) {
        throw new CustomException('نوع السعر والسعر بالساعة مطلوبان', 400);
    }

    // Validate rate type specific requirements
    if (rateType === 'custom_client' && !clientId) {
        throw new CustomException('معرف العميل مطلوب لسعر العميل المخصص', 400);
    }

    if (rateType === 'custom_case_type' && !caseType) {
        throw new CustomException('نوع القضية مطلوب لسعر نوع القضية المخصص', 400);
    }

    if (rateType === 'activity_based' && !activityCode) {
        throw new CustomException('رمز النشاط مطلوب للسعر المبني على النشاط', 400);
    }

    const billingRate = await BillingRate.create({
        lawyerId,
        rateType,
        standardHourlyRate,
        clientId,
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
    const query = { lawyerId };

    if (rateType) query.rateType = rateType;
    if (clientId) query.clientId = clientId;
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

    const billingRate = await BillingRate.findById(id)
        .populate('clientId', 'username email phone')
        .populate('createdBy', 'username');

    if (!billingRate) {
        throw new CustomException('السعر غير موجود', 404);
    }

    if (billingRate.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا السعر', 403);
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

    const billingRate = await BillingRate.findById(id);

    if (!billingRate) {
        throw new CustomException('السعر غير موجود', 404);
    }

    if (billingRate.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا السعر', 403);
    }

    const allowedFields = [
        'standardHourlyRate',
        'customRate',
        'effectiveDate',
        'endDate',
        'isActive',
        'notes'
    ];

    const changes = {};
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined && req.body[field] !== billingRate[field]) {
            changes[field] = { old: billingRate[field], new: req.body[field] };
            billingRate[field] = req.body[field];
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

    const billingRate = await BillingRate.findById(id);

    if (!billingRate) {
        throw new CustomException('السعر غير موجود', 404);
    }

    if (billingRate.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا السعر', 403);
    }

    await BillingRate.findByIdAndDelete(id);

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

    const rate = await BillingRate.getApplicableRate(
        lawyerId,
        clientId || null,
        caseType || null,
        activityCode || null
    );

    if (!rate) {
        throw new CustomException('لم يتم العثور على سعر. يرجى تعيين سعر قياسي أولاً', 404);
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
    const { standardHourlyRate, currency = 'SAR' } = req.body;
    const lawyerId = req.userID;

    if (!standardHourlyRate || standardHourlyRate <= 0) {
        throw new CustomException('السعر بالساعة مطلوب ويجب أن يكون أكبر من صفر', 400);
    }

    // Check if standard rate already exists
    const existingRate = await BillingRate.findOne({
        lawyerId,
        rateType: 'standard',
        isActive: true
    });

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

    const stats = await BillingRate.aggregate([
        { $match: { lawyerId, isActive: true } },
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

    const standardRate = await BillingRate.findOne({
        lawyerId,
        rateType: 'standard',
        isActive: true
    });

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
