const { RateGroup, RateCard, BillingRate } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Create rate group
 * POST /api/rate-groups
 */
const createRateGroup = asyncHandler(async (req, res) => {
    const { name, nameAr, description, rates, isDefault, effectiveDate, expiryDate } = req.body;
    const lawyerId = req.userID;

    if (!name) {
        throw new CustomException('اسم مجموعة الأسعار مطلوب', 400);
    }

    // Check for duplicate name
    const existing = await RateGroup.findOne({ lawyerId, name: name.trim() });
    if (existing) {
        throw new CustomException('مجموعة الأسعار موجودة بالفعل', 400);
    }

    // If setting as default, remove default from others
    if (isDefault) {
        await RateGroup.updateMany(
            { lawyerId },
            { isDefault: false }
        );
    }

    const rateGroup = await RateGroup.create({
        lawyerId,
        name: name.trim(),
        nameAr: nameAr?.trim(),
        description,
        rates: rates || [],
        isDefault: isDefault || false,
        effectiveDate,
        expiryDate
    });

    res.status(201).json({
        success: true,
        message: 'تم إنشاء مجموعة الأسعار بنجاح',
        data: rateGroup
    });
});

/**
 * Get all rate groups
 * GET /api/rate-groups
 */
const getRateGroups = asyncHandler(async (req, res) => {
    const { isActive, page = 1, limit = 50 } = req.query;
    const lawyerId = req.userID;

    const query = { lawyerId };
    if (isActive !== undefined) {
        query.isActive = isActive === 'true';
    }

    const rateGroups = await RateGroup.find(query)
        .populate('rates.billingRateId')
        .sort({ isDefault: -1, name: 1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await RateGroup.countDocuments(query);

    res.status(200).json({
        success: true,
        data: rateGroups,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single rate group
 * GET /api/rate-groups/:id
 */
const getRateGroup = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const rateGroup = await RateGroup.findOne({ _id: id, lawyerId })
        .populate('rates.billingRateId');

    if (!rateGroup) {
        throw new CustomException('مجموعة الأسعار غير موجودة', 404);
    }

    res.status(200).json({
        success: true,
        data: rateGroup
    });
});

/**
 * Update rate group
 * PATCH /api/rate-groups/:id
 */
const updateRateGroup = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const rateGroup = await RateGroup.findOne({ _id: id, lawyerId });

    if (!rateGroup) {
        throw new CustomException('مجموعة الأسعار غير موجودة', 404);
    }

    // Check for duplicate name if name is being changed
    if (req.body.name && req.body.name !== rateGroup.name) {
        const existing = await RateGroup.findOne({
            lawyerId,
            name: req.body.name.trim(),
            _id: { $ne: id }
        });
        if (existing) {
            throw new CustomException('مجموعة الأسعار موجودة بالفعل', 400);
        }
    }

    // If setting as default, remove default from others
    if (req.body.isDefault && !rateGroup.isDefault) {
        await RateGroup.updateMany(
            { lawyerId, _id: { $ne: id } },
            { isDefault: false }
        );
    }

    const allowedFields = ['name', 'nameAr', 'description', 'rates', 'isDefault', 'isActive', 'effectiveDate', 'expiryDate'];
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            rateGroup[field] = req.body[field];
        }
    });

    await rateGroup.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث مجموعة الأسعار بنجاح',
        data: rateGroup
    });
});

/**
 * Delete rate group
 * DELETE /api/rate-groups/:id
 */
const deleteRateGroup = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const rateGroup = await RateGroup.findOne({ _id: id, lawyerId });

    if (!rateGroup) {
        throw new CustomException('مجموعة الأسعار غير موجودة', 404);
    }

    // Check if used in any rate cards
    const usedInCards = await RateCard.countDocuments({ rateGroupId: id });
    if (usedInCards > 0) {
        throw new CustomException('لا يمكن حذف مجموعة أسعار مستخدمة في بطاقات أسعار', 400);
    }

    await RateGroup.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: 'تم حذف مجموعة الأسعار بنجاح'
    });
});

/**
 * Add rate to group
 * POST /api/rate-groups/:id/rates
 */
const addRateToGroup = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { billingRateId, customRate, multiplier } = req.body;
    const lawyerId = req.userID;

    const rateGroup = await RateGroup.findOne({ _id: id, lawyerId });

    if (!rateGroup) {
        throw new CustomException('مجموعة الأسعار غير موجودة', 404);
    }

    // Check if rate already exists in group
    const existingRate = rateGroup.rates.find(
        r => r.billingRateId?.toString() === billingRateId
    );
    if (existingRate) {
        throw new CustomException('السعر موجود بالفعل في المجموعة', 400);
    }

    // Verify billing rate exists
    if (billingRateId) {
        const billingRate = await BillingRate.findOne({ _id: billingRateId, lawyerId });
        if (!billingRate) {
            throw new CustomException('سعر الفوترة غير موجود', 404);
        }
    }

    rateGroup.rates.push({
        billingRateId,
        customRate,
        multiplier: multiplier || 1
    });

    await rateGroup.save();

    res.status(200).json({
        success: true,
        message: 'تم إضافة السعر إلى المجموعة بنجاح',
        data: rateGroup
    });
});

/**
 * Remove rate from group
 * DELETE /api/rate-groups/:id/rates/:rateId
 */
const removeRateFromGroup = asyncHandler(async (req, res) => {
    const { id, rateId } = req.params;
    const lawyerId = req.userID;

    const rateGroup = await RateGroup.findOne({ _id: id, lawyerId });

    if (!rateGroup) {
        throw new CustomException('مجموعة الأسعار غير موجودة', 404);
    }

    rateGroup.rates = rateGroup.rates.filter(
        r => r._id.toString() !== rateId
    );

    await rateGroup.save();

    res.status(200).json({
        success: true,
        message: 'تم إزالة السعر من المجموعة بنجاح',
        data: rateGroup
    });
});

/**
 * Get default rate group
 * GET /api/rate-groups/default
 */
const getDefaultRateGroup = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    let rateGroup = await RateGroup.findOne({ lawyerId, isDefault: true })
        .populate('rates.billingRateId');

    if (!rateGroup) {
        // Return first active rate group if no default
        rateGroup = await RateGroup.findOne({ lawyerId, isActive: true })
            .populate('rates.billingRateId');
    }

    res.status(200).json({
        success: true,
        data: rateGroup
    });
});

/**
 * Duplicate rate group
 * POST /api/rate-groups/:id/duplicate
 */
const duplicateRateGroup = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, nameAr } = req.body;
    const lawyerId = req.userID;

    const original = await RateGroup.findOne({ _id: id, lawyerId });

    if (!original) {
        throw new CustomException('مجموعة الأسعار غير موجودة', 404);
    }

    const duplicate = await RateGroup.create({
        lawyerId,
        name: name || `${original.name} (نسخة)`,
        nameAr: nameAr || `${original.nameAr} (نسخة)`,
        description: original.description,
        rates: original.rates,
        isDefault: false
    });

    res.status(201).json({
        success: true,
        message: 'تم نسخ مجموعة الأسعار بنجاح',
        data: duplicate
    });
});

module.exports = {
    createRateGroup,
    getRateGroups,
    getRateGroup,
    updateRateGroup,
    deleteRateGroup,
    addRateToGroup,
    removeRateFromGroup,
    getDefaultRateGroup,
    duplicateRateGroup
};
