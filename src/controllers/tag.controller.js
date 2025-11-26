const { Tag } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Create tag
 * POST /api/tags
 */
const createTag = asyncHandler(async (req, res) => {
    const { name, nameAr, color, description, entityType } = req.body;
    const lawyerId = req.userID;

    if (!name || !color) {
        throw new CustomException('الاسم واللون مطلوبان', 400);
    }

    // Check for duplicate name
    const existing = await Tag.findOne({ lawyerId, name: name.trim() });
    if (existing) {
        throw new CustomException('الوسم موجود بالفعل', 400);
    }

    const tag = await Tag.create({
        lawyerId,
        name: name.trim(),
        nameAr: nameAr?.trim(),
        color,
        description,
        entityType: entityType || 'all'
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
    const lawyerId = req.userID;

    const query = { lawyerId };

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
    const lawyerId = req.userID;

    const tag = await Tag.findOne({ _id: id, lawyerId });

    if (!tag) {
        throw new CustomException('الوسم غير موجود', 404);
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
    const lawyerId = req.userID;

    const tag = await Tag.findOne({ _id: id, lawyerId });

    if (!tag) {
        throw new CustomException('الوسم غير موجود', 404);
    }

    // Check for duplicate name if name is being changed
    if (req.body.name && req.body.name !== tag.name) {
        const existing = await Tag.findOne({
            lawyerId,
            name: req.body.name.trim(),
            _id: { $ne: id }
        });
        if (existing) {
            throw new CustomException('الوسم موجود بالفعل', 400);
        }
    }

    const allowedFields = ['name', 'nameAr', 'color', 'description', 'entityType'];
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            tag[field] = req.body[field];
        }
    });

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
    const lawyerId = req.userID;

    const tag = await Tag.findOneAndDelete({ _id: id, lawyerId });

    if (!tag) {
        throw new CustomException('الوسم غير موجود', 404);
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
    const lawyerId = req.userID;

    if (!q || q.length < 1) {
        throw new CustomException('يجب أن يكون مصطلح البحث حرفًا واحدًا على الأقل', 400);
    }

    const tags = await Tag.searchTags(lawyerId, q, entityType);

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
    const lawyerId = req.userID;

    const tags = await Tag.getPopularTags(lawyerId, parseInt(limit), entityType);

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
    const { entityType, entityId } = req.body;
    const lawyerId = req.userID;

    if (!entityType || !entityId) {
        throw new CustomException('نوع الكيان ومعرف الكيان مطلوبان', 400);
    }

    const tag = await Tag.findOne({ _id: id, lawyerId });
    if (!tag) {
        throw new CustomException('الوسم غير موجود', 404);
    }

    // Increment usage count
    await Tag.incrementUsage(id);

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
    const lawyerId = req.userID;

    const tag = await Tag.findOne({ _id: id, lawyerId });
    if (!tag) {
        throw new CustomException('الوسم غير موجود', 404);
    }

    // Decrement usage count
    await Tag.decrementUsage(id);

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
    const lawyerId = req.userID;

    // This would need integration with specific entity models
    // For now, return tags that match the entity type
    const tags = await Tag.find({
        lawyerId,
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
