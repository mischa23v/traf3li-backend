const { RateGroup, RateCard, BillingRate } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

/**
 * Create rate group
 * POST /api/rate-groups
 */
const createRateGroup = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const allowedFields = ['name', 'nameAr', 'description', 'rates', 'isDefault', 'effectiveDate', 'expiryDate'];
    const data = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
        throw CustomException('اسم مجموعة الأسعار مطلوب', 400);
    }

    if (data.nameAr && typeof data.nameAr !== 'string') {
        throw CustomException('اسم المجموعة بالعربي يجب أن يكون نص', 400);
    }

    if (data.description && typeof data.description !== 'string') {
        throw CustomException('الوصف يجب أن يكون نص', 400);
    }

    if (data.isDefault !== undefined && typeof data.isDefault !== 'boolean') {
        throw CustomException('isDefault يجب أن يكون قيمة منطقية', 400);
    }

    // Validate dates
    if (data.effectiveDate && isNaN(Date.parse(data.effectiveDate))) {
        throw CustomException('تاريخ السريان غير صحيح', 400);
    }

    if (data.expiryDate && isNaN(Date.parse(data.expiryDate))) {
        throw CustomException('تاريخ الانتهاء غير صحيح', 400);
    }

    if (data.effectiveDate && data.expiryDate && new Date(data.effectiveDate) >= new Date(data.expiryDate)) {
        throw CustomException('تاريخ الانتهاء يجب أن يكون بعد تاريخ السريان', 400);
    }

    // Validate rates array
    if (data.rates && !Array.isArray(data.rates)) {
        throw CustomException('rates يجب أن يكون مصفوفة', 400);
    }

    if (data.rates) {
        for (const rate of data.rates) {
            if (rate.billingRateId) {
                sanitizeObjectId(rate.billingRateId, 'معرف سعر الفوترة غير صحيح');
            }
            if (rate.customRate !== undefined && (typeof rate.customRate !== 'number' || rate.customRate < 0)) {
                throw CustomException('السعر المخصص يجب أن يكون رقم موجب', 400);
            }
            if (rate.multiplier !== undefined && (typeof rate.multiplier !== 'number' || rate.multiplier <= 0)) {
                throw CustomException('المضاعف يجب أن يكون رقم موجب', 400);
            }
        }
    }

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    // Check for duplicate name
    const existing = await RateGroup.findOne({ ...req.firmQuery, name: data.name.trim() });
    if (existing) {
        throw CustomException('مجموعة الأسعار موجودة بالفعل', 400);
    }

    // If setting as default, remove default from others
    if (data.isDefault) {
        await RateGroup.updateMany(
            { ...req.firmQuery },
            { isDefault: false }
        );
    }

    // SECURITY FIX: Use req.addFirmId for proper tenant context
    const rateGroup = await RateGroup.create(req.addFirmId({
        name: data.name.trim(),
        nameAr: data.nameAr?.trim(),
        description: data.description,
        rates: data.rates || [],
        isDefault: data.isDefault || false,
        effectiveDate: data.effectiveDate,
        expiryDate: data.expiryDate
    }));

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
    // Input validation for query parameters
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 50), 100);

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    const query = { ...req.firmQuery };
    if (req.query.isActive !== undefined) {
        query.isActive = req.query.isActive === 'true';
    }

    const rateGroups = await RateGroup.find(query)
        .populate('rates.billingRateId')
        .sort({ isDefault: -1, name: 1 })
        .limit(limit)
        .skip((page - 1) * limit);

    const total = await RateGroup.countDocuments(query);

    res.status(200).json({
        success: true,
        data: rateGroups,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

/**
 * Get single rate group
 * GET /api/rate-groups/:id
 */
const getRateGroup = asyncHandler(async (req, res) => {
    // IDOR protection - sanitize and validate ID
    const id = sanitizeObjectId(req.params.id, 'معرف مجموعة الأسعار غير صحيح');

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    const rateGroup = await RateGroup.findOne({ _id: id, ...req.firmQuery })
        .populate('rates.billingRateId');

    if (!rateGroup) {
        throw CustomException('مجموعة الأسعار غير موجودة', 404);
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
    // IDOR protection - sanitize and validate ID
    const id = sanitizeObjectId(req.params.id, 'معرف مجموعة الأسعار غير صحيح');

    // Mass assignment protection
    const allowedFields = ['name', 'nameAr', 'description', 'rates', 'isDefault', 'isActive', 'effectiveDate', 'expiryDate'];
    const data = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (data.name !== undefined && (typeof data.name !== 'string' || !data.name.trim())) {
        throw CustomException('اسم مجموعة الأسعار يجب أن يكون نص غير فارغ', 400);
    }

    if (data.nameAr !== undefined && typeof data.nameAr !== 'string') {
        throw CustomException('اسم المجموعة بالعربي يجب أن يكون نص', 400);
    }

    if (data.description !== undefined && typeof data.description !== 'string') {
        throw CustomException('الوصف يجب أن يكون نص', 400);
    }

    if (data.isDefault !== undefined && typeof data.isDefault !== 'boolean') {
        throw CustomException('isDefault يجب أن يكون قيمة منطقية', 400);
    }

    if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
        throw CustomException('isActive يجب أن يكون قيمة منطقية', 400);
    }

    // Validate dates
    if (data.effectiveDate !== undefined && data.effectiveDate !== null && isNaN(Date.parse(data.effectiveDate))) {
        throw CustomException('تاريخ السريان غير صحيح', 400);
    }

    if (data.expiryDate !== undefined && data.expiryDate !== null && isNaN(Date.parse(data.expiryDate))) {
        throw CustomException('تاريخ الانتهاء غير صحيح', 400);
    }

    // Validate rates array
    if (data.rates !== undefined) {
        if (!Array.isArray(data.rates)) {
            throw CustomException('rates يجب أن يكون مصفوفة', 400);
        }
        for (const rate of data.rates) {
            if (rate.billingRateId) {
                sanitizeObjectId(rate.billingRateId, 'معرف سعر الفوترة غير صحيح');
            }
            if (rate.customRate !== undefined && (typeof rate.customRate !== 'number' || rate.customRate < 0)) {
                throw CustomException('السعر المخصص يجب أن يكون رقم موجب', 400);
            }
            if (rate.multiplier !== undefined && (typeof rate.multiplier !== 'number' || rate.multiplier <= 0)) {
                throw CustomException('المضاعف يجب أن يكون رقم موجب', 400);
            }
        }
    }

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    const rateGroup = await RateGroup.findOne({ _id: id, ...req.firmQuery });

    if (!rateGroup) {
        throw CustomException('مجموعة الأسعار غير موجودة', 404);
    }

    // Check for duplicate name if name is being changed
    if (data.name && data.name.trim() !== rateGroup.name) {
        const existing = await RateGroup.findOne({
            ...req.firmQuery,
            name: data.name.trim(),
            _id: { $ne: id }
        });
        if (existing) {
            throw CustomException('مجموعة الأسعار موجودة بالفعل', 400);
        }
    }

    // If setting as default, remove default from others
    if (data.isDefault && !rateGroup.isDefault) {
        await RateGroup.updateMany(
            { ...req.firmQuery, _id: { $ne: id } },
            { isDefault: false }
        );
    }

    // Validate combined dates
    const effectiveDate = data.effectiveDate !== undefined ? data.effectiveDate : rateGroup.effectiveDate;
    const expiryDate = data.expiryDate !== undefined ? data.expiryDate : rateGroup.expiryDate;
    if (effectiveDate && expiryDate && new Date(effectiveDate) >= new Date(expiryDate)) {
        throw CustomException('تاريخ الانتهاء يجب أن يكون بعد تاريخ السريان', 400);
    }

    // Apply updates
    Object.keys(data).forEach(field => {
        if (data[field] !== undefined) {
            rateGroup[field] = field === 'name' || field === 'nameAr'
                ? (typeof data[field] === 'string' ? data[field].trim() : data[field])
                : data[field];
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
    // IDOR protection - sanitize and validate ID
    const id = sanitizeObjectId(req.params.id, 'معرف مجموعة الأسعار غير صحيح');

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    const rateGroup = await RateGroup.findOne({ _id: id, ...req.firmQuery });

    if (!rateGroup) {
        throw CustomException('مجموعة الأسعار غير موجودة', 404);
    }

    // Check if used in any rate cards
    const usedInCards = await RateCard.countDocuments({ rateGroupId: id, ...req.firmQuery });
    if (usedInCards > 0) {
        throw CustomException('لا يمكن حذف مجموعة أسعار مستخدمة في بطاقات أسعار', 400);
    }

    // SECURITY FIX: Use atomic findOneAndDelete with req.firmQuery
    await RateGroup.findOneAndDelete({ _id: id, ...req.firmQuery });

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
    // IDOR protection - sanitize and validate ID
    const id = sanitizeObjectId(req.params.id, 'معرف مجموعة الأسعار غير صحيح');

    // Mass assignment protection
    const allowedFields = ['billingRateId', 'customRate', 'multiplier'];
    const data = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (!data.billingRateId) {
        throw CustomException('معرف سعر الفوترة مطلوب', 400);
    }

    // Validate billingRateId
    const billingRateId = sanitizeObjectId(data.billingRateId, 'معرف سعر الفوترة غير صحيح');

    // Validate customRate if provided
    if (data.customRate !== undefined && data.customRate !== null) {
        if (typeof data.customRate !== 'number' || data.customRate < 0) {
            throw CustomException('السعر المخصص يجب أن يكون رقم موجب', 400);
        }
    }

    // Validate multiplier if provided
    if (data.multiplier !== undefined && data.multiplier !== null) {
        if (typeof data.multiplier !== 'number' || data.multiplier <= 0) {
            throw CustomException('المضاعف يجب أن يكون رقم موجب', 400);
        }
    }

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    const rateGroup = await RateGroup.findOne({ _id: id, ...req.firmQuery });

    if (!rateGroup) {
        throw CustomException('مجموعة الأسعار غير موجودة', 404);
    }

    // Check if rate already exists in group
    const existingRate = rateGroup.rates.find(
        r => r.billingRateId?.toString() === billingRateId
    );
    if (existingRate) {
        throw CustomException('السعر موجود بالفعل في المجموعة', 400);
    }

    // SECURITY FIX: Use req.firmQuery for billing rate verification
    const billingRate = await BillingRate.findOne({ _id: billingRateId, ...req.firmQuery });
    if (!billingRate) {
        throw CustomException('سعر الفوترة غير موجود', 404);
    }

    rateGroup.rates.push({
        billingRateId,
        customRate: data.customRate,
        multiplier: data.multiplier || 1
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
    // IDOR protection - sanitize and validate IDs
    const id = sanitizeObjectId(req.params.id, 'معرف مجموعة الأسعار غير صحيح');
    const rateId = sanitizeObjectId(req.params.rateId, 'معرف السعر غير صحيح');

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    const rateGroup = await RateGroup.findOne({ _id: id, ...req.firmQuery });

    if (!rateGroup) {
        throw CustomException('مجموعة الأسعار غير موجودة', 404);
    }

    // Check if rate exists in group before removal
    const rateExists = rateGroup.rates.some(r => r._id.toString() === rateId);
    if (!rateExists) {
        throw CustomException('السعر غير موجود في المجموعة', 404);
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
    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    let rateGroup = await RateGroup.findOne({ ...req.firmQuery, isDefault: true })
        .populate('rates.billingRateId');

    if (!rateGroup) {
        // Return first active rate group if no default
        rateGroup = await RateGroup.findOne({ ...req.firmQuery, isActive: true })
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
    // IDOR protection - sanitize and validate ID
    const id = sanitizeObjectId(req.params.id, 'معرف مجموعة الأسعار غير صحيح');

    // Mass assignment protection
    const allowedFields = ['name', 'nameAr'];
    const data = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (data.name !== undefined && (typeof data.name !== 'string' || !data.name.trim())) {
        throw CustomException('الاسم يجب أن يكون نص غير فارغ', 400);
    }

    if (data.nameAr !== undefined && data.nameAr !== null && typeof data.nameAr !== 'string') {
        throw CustomException('الاسم بالعربي يجب أن يكون نص', 400);
    }

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    const original = await RateGroup.findOne({ _id: id, ...req.firmQuery });

    if (!original) {
        throw CustomException('مجموعة الأسعار غير موجودة', 404);
    }

    // Generate default names
    const duplicateName = data.name ? data.name.trim() : `${original.name} (نسخة)`;
    const duplicateNameAr = data.nameAr ? data.nameAr.trim() : (original.nameAr ? `${original.nameAr} (نسخة)` : undefined);

    // Check for duplicate name
    const existing = await RateGroup.findOne({ ...req.firmQuery, name: duplicateName });
    if (existing) {
        throw CustomException('مجموعة أسعار بهذا الاسم موجودة بالفعل', 400);
    }

    // SECURITY FIX: Use req.addFirmId for proper tenant context
    const duplicate = await RateGroup.create(req.addFirmId({
        name: duplicateName,
        nameAr: duplicateNameAr,
        description: original.description,
        rates: original.rates,
        isDefault: false,
        effectiveDate: original.effectiveDate,
        expiryDate: original.expiryDate
    }));

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
