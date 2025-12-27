/**
 * Lost Reason Controller
 * Security: All operations enforce multi-tenant isolation via firmQuery
 *
 * Handles CRUD operations for lost reasons in the CRM system.
 * Lost reasons track why deals (leads, opportunities, quotes) are lost.
 */

const LostReason = require('../models/lostReason.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ═══════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new lost reason
 * @route POST /api/lost-reasons
 */
const createLostReason = asyncHandler(async (req, res) => {
    // Validate required fields
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw CustomException('Name is required', 400, {
            messageAr: 'الاسم مطلوب'
        });
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = pickAllowedFields(req.body, [
        'name',
        'nameAr',
        'description',
        'category',
        'applicableTo',
        'sortOrder',
        'isActive',
        'isDefault'
    ]);

    // Validate category if provided
    if (allowedFields.category && !LostReason.getCategories().includes(allowedFields.category)) {
        throw CustomException('Invalid category', 400, {
            messageAr: 'فئة غير صالحة'
        });
    }

    // Validate applicableTo if provided
    if (allowedFields.applicableTo) {
        const validTypes = LostReason.getApplicableToTypes();
        const invalidTypes = allowedFields.applicableTo.filter(type => !validTypes.includes(type));
        if (invalidTypes.length > 0) {
            throw CustomException(`Invalid applicableTo types: ${invalidTypes.join(', ')}`, 400, {
                messageAr: 'أنواع applicableTo غير صالحة'
            });
        }
    }

    // If setting as default, unset other defaults first
    if (allowedFields.isDefault) {
        await LostReason.updateMany(
            { ...req.firmQuery },
            { $set: { isDefault: false } }
        );
    }

    // Create with firm context
    const lostReason = new LostReason({
        ...allowedFields,
        firmId: req.firmId,
        createdBy: req.userID
    });

    await lostReason.save();

    // Fetch with population for response
    const populated = await LostReason.findOne({
        _id: lostReason._id,
        ...req.firmQuery
    }).populate('createdBy', 'firstName lastName email');

    res.status(201).json({
        success: true,
        data: populated,
        message: 'Lost reason created',
        messageAr: 'تم إنشاء سبب الخسارة'
    });
});

// ═══════════════════════════════════════════════════════════════
// READ
// ═══════════════════════════════════════════════════════════════

/**
 * Get all lost reasons with filters
 * @route GET /api/lost-reasons
 */
const getLostReasons = asyncHandler(async (req, res) => {
    const { category, applicableTo, isActive, search, page = 1, limit = 50 } = req.query;

    // Build query with firm isolation
    const query = { ...req.firmQuery };

    // Apply filters
    if (category && LostReason.getCategories().includes(category)) {
        query.category = category;
    }

    if (applicableTo && LostReason.getApplicableToTypes().includes(applicableTo)) {
        query.applicableTo = applicableTo;
    }

    if (isActive !== undefined) {
        query.isActive = isActive === 'true';
    }

    // Safe search with escaped regex
    if (search && typeof search === 'string') {
        query.$or = [
            { name: { $regex: escapeRegex(search.trim()), $options: 'i' } },
            { nameAr: { $regex: escapeRegex(search.trim()), $options: 'i' } }
        ];
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const lostReasons = await LostReason.find(query)
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email')
        .sort({ sortOrder: 1, name: 1 })
        .skip(skip)
        .limit(limitNum);

    const total = await LostReason.countDocuments(query);

    res.json({
        success: true,
        data: lostReasons,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
        }
    });
});

/**
 * Get single lost reason by ID
 * @route GET /api/lost-reasons/:id
 */
const getLostReasonById = asyncHandler(async (req, res) => {
    const sanitizedId = sanitizeObjectId(req.params.id);

    if (!sanitizedId) {
        throw CustomException('Invalid lost reason ID', 400, {
            messageAr: 'معرف سبب الخسارة غير صالح'
        });
    }

    // IDOR Protection: Query includes firmQuery
    const lostReason = await LostReason.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    })
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email');

    if (!lostReason) {
        throw CustomException('Lost reason not found', 404, {
            messageAr: 'سبب الخسارة غير موجود'
        });
    }

    res.json({
        success: true,
        data: lostReason
    });
});

/**
 * Get usage statistics
 * @route GET /api/lost-reasons/stats
 */
const getUsageStats = asyncHandler(async (req, res) => {
    const { category, limit } = req.query;

    const options = {
        category,
        limit: limit ? parseInt(limit, 10) : 10
    };

    const stats = await LostReason.getUsageStats(req.firmId, options);

    res.json({
        success: true,
        data: stats
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════

/**
 * Update lost reason
 * @route PUT /api/lost-reasons/:id
 */
const updateLostReason = asyncHandler(async (req, res) => {
    const sanitizedId = sanitizeObjectId(req.params.id);

    if (!sanitizedId) {
        throw CustomException('Invalid lost reason ID', 400, {
            messageAr: 'معرف سبب الخسارة غير صالح'
        });
    }

    // IDOR Protection: Find with firmQuery
    const lostReason = await LostReason.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    });

    if (!lostReason) {
        throw CustomException('Lost reason not found', 404, {
            messageAr: 'سبب الخسارة غير موجود'
        });
    }

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'name',
        'nameAr',
        'description',
        'category',
        'applicableTo',
        'sortOrder',
        'isActive',
        'isDefault'
    ]);

    // Validate category if provided
    if (allowedFields.category && !LostReason.getCategories().includes(allowedFields.category)) {
        throw CustomException('Invalid category', 400, {
            messageAr: 'فئة غير صالحة'
        });
    }

    // Validate applicableTo if provided
    if (allowedFields.applicableTo) {
        const validTypes = LostReason.getApplicableToTypes();
        const invalidTypes = allowedFields.applicableTo.filter(type => !validTypes.includes(type));
        if (invalidTypes.length > 0) {
            throw CustomException(`Invalid applicableTo types: ${invalidTypes.join(', ')}`, 400, {
                messageAr: 'أنواع applicableTo غير صالحة'
            });
        }
    }

    // If setting as default, unset other defaults first
    if (allowedFields.isDefault && !lostReason.isDefault) {
        await LostReason.updateMany(
            { ...req.firmQuery, _id: { $ne: sanitizedId } },
            { $set: { isDefault: false } }
        );
    }

    // Apply updates
    Object.keys(allowedFields).forEach(field => {
        lostReason[field] = allowedFields[field];
    });

    lostReason.updatedBy = req.userID;
    await lostReason.save();

    // Fetch updated with population
    const updated = await LostReason.findOne({
        _id: lostReason._id,
        ...req.firmQuery
    })
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email');

    res.json({
        success: true,
        data: updated,
        message: 'Lost reason updated',
        messageAr: 'تم تحديث سبب الخسارة'
    });
});

/**
 * Reorder lost reasons
 * @route PUT /api/lost-reasons/reorder
 */
const reorderLostReasons = asyncHandler(async (req, res) => {
    const { reasonIds } = req.body;

    if (!Array.isArray(reasonIds) || reasonIds.length === 0) {
        throw CustomException('reasonIds array is required', 400, {
            messageAr: 'مصفوفة reasonIds مطلوبة'
        });
    }

    // Sanitize all IDs
    const sanitizedIds = reasonIds.map(id => sanitizeObjectId(id)).filter(Boolean);

    if (sanitizedIds.length !== reasonIds.length) {
        throw CustomException('Invalid IDs in reasonIds array', 400, {
            messageAr: 'معرفات غير صالحة في مصفوفة reasonIds'
        });
    }

    // Update sort order for each reason (with firm isolation)
    const updatePromises = sanitizedIds.map((id, index) =>
        LostReason.findOneAndUpdate(
            { _id: id, ...req.firmQuery },
            { $set: { sortOrder: index, updatedBy: req.userID } },
            { new: true }
        )
    );

    const updatedReasons = await Promise.all(updatePromises);

    // Filter out null results (reasons not found or not owned by firm)
    const validReasons = updatedReasons.filter(Boolean);

    if (validReasons.length === 0) {
        throw CustomException('No lost reasons found to reorder', 404, {
            messageAr: 'لم يتم العثور على أسباب خسارة لإعادة ترتيبها'
        });
    }

    res.json({
        success: true,
        data: validReasons,
        message: 'Lost reasons reordered',
        messageAr: 'تم إعادة ترتيب أسباب الخسارة'
    });
});

// ═══════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════

/**
 * Delete lost reason
 * @route DELETE /api/lost-reasons/:id
 */
const deleteLostReason = asyncHandler(async (req, res) => {
    const sanitizedId = sanitizeObjectId(req.params.id);

    if (!sanitizedId) {
        throw CustomException('Invalid lost reason ID', 400, {
            messageAr: 'معرف سبب الخسارة غير صالح'
        });
    }

    // IDOR Protection: Query-level ownership check
    const lostReason = await LostReason.findOneAndDelete({
        _id: sanitizedId,
        ...req.firmQuery
    });

    if (!lostReason) {
        throw CustomException('Lost reason not found', 404, {
            messageAr: 'سبب الخسارة غير موجود'
        });
    }

    // If deleted reason was default, set another as default
    if (lostReason.isDefault) {
        const newDefault = await LostReason.findOne({
            ...req.firmQuery,
            isActive: true
        }).sort({ usageCount: -1, sortOrder: 1 });

        if (newDefault) {
            newDefault.isDefault = true;
            newDefault.updatedBy = req.userID;
            await newDefault.save();
        }
    }

    res.json({
        success: true,
        message: 'Lost reason deleted',
        messageAr: 'تم حذف سبب الخسارة'
    });
});

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    createLostReason,
    getLostReasons,
    getLostReasonById,
    updateLostReason,
    deleteLostReason,
    reorderLostReasons,
    getUsageStats
};
