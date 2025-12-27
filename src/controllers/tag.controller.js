const { Tag } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const sanitizeHtml = require('sanitize-html');

/**
 * Sanitize tag input to prevent XSS
 */
const sanitizeTagInput = (input) => {
    if (!input || typeof input !== 'string') {
        return input;
    }
    // Allow only plain text, no HTML tags
    return sanitizeHtml(input, {
        allowedTags: [],
        allowedAttributes: {}
    });
};

/**
 * Validate tag name
 */
const validateTagName = (name) => {
    if (!name || typeof name !== 'string') {
        throw CustomException('اسم الوسم مطلوب', 400);
    }

    const trimmedName = name.trim();

    if (trimmedName.length < 1) {
        throw CustomException('اسم الوسم يجب أن يحتوي على حرف واحد على الأقل', 400);
    }

    if (trimmedName.length > 100) {
        throw CustomException('اسم الوسم يجب ألا يتجاوز 100 حرف', 400);
    }

    return trimmedName;
};

/**
 * Create tag
 * POST /api/tags
 */
const createTag = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    // Mass assignment protection - only allow specific fields
    const allowedData = pickAllowedFields(req.body, ['name', 'nameAr', 'color', 'description', 'entityType']);

    // Validate required fields
    if (!allowedData.name || !allowedData.color) {
        throw CustomException('الاسم واللون مطلوبان', 400);
    }

    // Validate and sanitize tag name
    const validatedName = validateTagName(allowedData.name);

    // Sanitize all text inputs to prevent XSS
    const sanitizedData = {
        name: sanitizeTagInput(validatedName),
        nameAr: allowedData.nameAr ? sanitizeTagInput(allowedData.nameAr.trim()) : undefined,
        color: allowedData.color,
        description: allowedData.description ? sanitizeTagInput(allowedData.description) : undefined,
        entityType: allowedData.entityType || 'all'
    };

    // Check for duplicate name - with firm isolation
    const existing = await Tag.findOne({ firmId, name: sanitizedData.name });
    if (existing) {
        throw CustomException('الوسم موجود بالفعل', 400);
    }

    const tag = await Tag.create({
        firmId,
        ...sanitizedData
    });

    res.status(201).json({
        success: true,
        message: 'تم إنشاء الوسم بنجاح',
        data: tag
    });
});

/**
 * Get all tags
 * GET /api/tags
 */
const getTags = asyncHandler(async (req, res) => {
    const { entityType, search, page = 1, limit = 50 } = req.query;

    // Firm-level isolation
    const query = { ...req.firmQuery };

    if (entityType && entityType !== 'all') {
        query.$or = [
            { entityType: entityType },
            { entityType: 'all' }
        ];
    }

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { nameAr: { $regex: search, $options: 'i' } }
        ];
    }

    const tags = await Tag.find(query)
        .sort({ usageCount: -1, name: 1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Tag.countDocuments(query);

    res.status(200).json({
        success: true,
        data: tags,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single tag
 * GET /api/tags/:id
 */
const getTag = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Sanitize ObjectId to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف الوسم غير صالح', 400);
    }

    // IDOR protection - verify ownership with firm isolation
    const tag = await Tag.findOne({ _id: sanitizedId, ...req.firmQuery });

    if (!tag) {
        throw CustomException('الوسم غير موجود', 404);
    }

    res.status(200).json({
        success: true,
        data: tag
    });
});

/**
 * Update tag
 * PATCH /api/tags/:id
 */
const updateTag = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Sanitize ObjectId to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف الوسم غير صالح', 400);
    }

    // IDOR protection - verify ownership with firm isolation
    const tag = await Tag.findOne({ _id: sanitizedId, ...req.firmQuery });

    if (!tag) {
        throw CustomException('الوسم غير موجود', 404);
    }

    // Mass assignment protection - only allow specific fields
    const allowedData = pickAllowedFields(req.body, ['name', 'nameAr', 'color', 'description', 'entityType']);

    // Validate and sanitize name if provided
    if (allowedData.name !== undefined) {
        const validatedName = validateTagName(allowedData.name);
        const sanitizedName = sanitizeTagInput(validatedName);

        // Check for duplicate name if name is being changed - with firm isolation
        if (sanitizedName !== tag.name) {
            const existing = await Tag.findOne({
                ...req.firmQuery,
                name: sanitizedName,
                _id: { $ne: sanitizedId }
            });
            if (existing) {
                throw CustomException('الوسم موجود بالفعل', 400);
            }
        }

        tag.name = sanitizedName;
    }

    // Sanitize other text fields to prevent XSS
    if (allowedData.nameAr !== undefined) {
        tag.nameAr = sanitizeTagInput(allowedData.nameAr.trim());
    }

    if (allowedData.description !== undefined) {
        tag.description = sanitizeTagInput(allowedData.description);
    }

    if (allowedData.color !== undefined) {
        tag.color = allowedData.color;
    }

    if (allowedData.entityType !== undefined) {
        tag.entityType = allowedData.entityType;
    }

    await tag.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث الوسم بنجاح',
        data: tag
    });
});

/**
 * Delete tag
 * DELETE /api/tags/:id
 */
const deleteTag = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Sanitize ObjectId to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف الوسم غير صالح', 400);
    }

    // IDOR protection - verify ownership with firm isolation
    const tag = await Tag.findOneAndDelete({ _id: sanitizedId, ...req.firmQuery });

    if (!tag) {
        throw CustomException('الوسم غير موجود', 404);
    }

    res.status(200).json({
        success: true,
        message: 'تم حذف الوسم بنجاح'
    });
});

/**
 * Search tags
 * GET /api/tags/search
 */
const searchTags = asyncHandler(async (req, res) => {
    const { q, entityType } = req.query;
    const firmId = req.firmId;

    if (!q || q.length < 1) {
        throw CustomException('يجب أن يكون مصطلح البحث حرفًا واحدًا على الأقل', 400);
    }

    const tags = await Tag.searchTags(firmId, q, entityType);

    res.status(200).json({
        success: true,
        data: tags,
        count: tags.length
    });
});

/**
 * Get popular tags
 * GET /api/tags/popular
 */
const getPopularTags = asyncHandler(async (req, res) => {
    const { limit = 10, entityType } = req.query;
    const firmId = req.firmId;

    const tags = await Tag.getPopularTags(firmId, parseInt(limit), entityType);

    res.status(200).json({
        success: true,
        data: tags
    });
});

/**
 * Attach tag to entity
 * POST /api/tags/:id/attach
 */
const attachTag = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Sanitize ObjectId to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف الوسم غير صالح', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedData = pickAllowedFields(req.body, ['entityType', 'entityId']);

    if (!allowedData.entityType || !allowedData.entityId) {
        throw CustomException('نوع الكيان ومعرف الكيان مطلوبان', 400);
    }

    // Sanitize entityId
    const sanitizedEntityId = sanitizeObjectId(allowedData.entityId);
    if (!sanitizedEntityId) {
        throw CustomException('معرف الكيان غير صالح', 400);
    }

    // IDOR protection - verify ownership with firm isolation
    const tag = await Tag.findOne({ _id: sanitizedId, ...req.firmQuery });
    if (!tag) {
        throw CustomException('الوسم غير موجود', 404);
    }

    // Increment usage count
    await Tag.incrementUsage(sanitizedId);

    res.status(200).json({
        success: true,
        message: 'تم إرفاق الوسم بنجاح'
    });
});

/**
 * Detach tag from entity
 * POST /api/tags/:id/detach
 */
const detachTag = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Sanitize ObjectId to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف الوسم غير صالح', 400);
    }

    // IDOR protection - verify ownership with firm isolation
    const tag = await Tag.findOne({ _id: sanitizedId, ...req.firmQuery });
    if (!tag) {
        throw CustomException('الوسم غير موجود', 404);
    }

    // Decrement usage count
    await Tag.decrementUsage(sanitizedId);

    res.status(200).json({
        success: true,
        message: 'تم فك إرفاق الوسم بنجاح'
    });
});

/**
 * Get tags for entity
 * GET /api/tags/entity/:entityType/:entityId
 */
const getTagsForEntity = asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.params;

    // Sanitize entityId to prevent NoSQL injection
    const sanitizedEntityId = sanitizeObjectId(entityId);
    if (!sanitizedEntityId) {
        throw CustomException('معرف الكيان غير صالح', 400);
    }

    // This would need integration with specific entity models
    // For now, return tags that match the entity type
    // IDOR protection - firm-level isolation
    const tags = await Tag.find({
        ...req.firmQuery,
        $or: [
            { entityType: entityType },
            { entityType: 'all' }
        ]
    }).sort({ usageCount: -1 });

    res.status(200).json({
        success: true,
        data: tags
    });
});

module.exports = {
    createTag,
    getTags,
    getTag,
    updateTag,
    deleteTag,
    searchTags,
    getPopularTags,
    attachTag,
    detachTag,
    getTagsForEntity
};
