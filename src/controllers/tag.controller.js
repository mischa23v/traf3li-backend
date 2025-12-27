/**
 * Tag Controller
 * Universal tagging system for leads, clients, contacts, cases, quotes, campaigns
 * Security: All operations enforce multi-tenant isolation via firmQuery
 */

const { Tag } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Helper for regex safety - ReDoS protection
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Create a new tag
 * @route POST /api/tags
 */
const createTag = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;

    // MASS ASSIGNMENT PROTECTION: Only allow specific fields
    const allowedFields = pickAllowedFields(req.body, [
        'name',
        'nameAr',
        'color',
        'entityTypes',
        'isActive'
    ]);

    // VALIDATION: Required fields
    if (!allowedFields.name || typeof allowedFields.name !== 'string') {
        throw CustomException('Tag name is required', 400);
    }

    // Validate color format if provided
    if (allowedFields.color) {
        const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!colorRegex.test(allowedFields.color)) {
            throw CustomException('Invalid color format. Use hex format (#RRGGBB or #RGB)', 400);
        }
    }

    // Validate entityTypes if provided
    if (allowedFields.entityTypes) {
        const validEntityTypes = ['lead', 'client', 'contact', 'case', 'quote', 'campaign'];
        const invalidTypes = allowedFields.entityTypes.filter(type => !validEntityTypes.includes(type));
        if (invalidTypes.length > 0) {
            throw CustomException(`Invalid entity types: ${invalidTypes.join(', ')}`, 400);
        }
    }

    // Create tag with firm context
    const tag = new Tag({
        ...allowedFields,
        firmId,
        createdBy: userId
    });

    await tag.save();

    return res.status(201).json({
        error: false,
        message: 'Tag created successfully',
        data: tag
    });
});

/**
 * Get all tags with filters
 * @route GET /api/tags
 */
const getTags = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const {
        entityType,
        isActive,
        search,
        page = 1,
        limit = 100,
        sortBy = 'name'
    } = req.query;

    // Build query with firm isolation
    const query = { ...req.firmQuery };

    // Filter by entity type
    if (entityType) {
        const validEntityTypes = ['lead', 'client', 'contact', 'case', 'quote', 'campaign'];
        if (validEntityTypes.includes(entityType)) {
            query.entityTypes = entityType;
        }
    }

    // Filter by active status
    if (isActive !== undefined) {
        query.isActive = isActive === 'true' || isActive === true;
    }

    // Safe search with escaped regex
    if (search) {
        const searchRegex = { $regex: escapeRegex(search), $options: 'i' };
        query.$or = [
            { name: searchRegex },
            { nameAr: searchRegex },
            { slug: searchRegex }
        ];
    }

    // Parse pagination
    const parsedLimit = Math.min(parseInt(limit) || 100, 500);
    const parsedPage = parseInt(page) || 1;
    const skip = (parsedPage - 1) * parsedLimit;

    // Execute query
    const tags = await Tag.find(query)
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email')
        .sort(sortBy)
        .limit(parsedLimit)
        .skip(skip);

    const total = await Tag.countDocuments(query);

    return res.json({
        error: false,
        data: tags,
        pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total,
            pages: Math.ceil(total / parsedLimit)
        }
    });
});

/**
 * Get single tag by ID
 * @route GET /api/tags/:id
 */
const getTagById = asyncHandler(async (req, res) => {
    const sanitizedId = sanitizeObjectId(req.params.id);
    if (!sanitizedId) {
        throw CustomException('Invalid tag ID', 400);
    }

    // IDOR Protection: Query includes firmQuery
    const tag = await Tag.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    })
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email');

    if (!tag) {
        throw CustomException('Tag not found', 404);
    }

    return res.json({ error: false, data: tag });
});

/**
 * Update tag
 * @route PUT /api/tags/:id
 */
const updateTag = asyncHandler(async (req, res) => {
    const sanitizedId = sanitizeObjectId(req.params.id);
    if (!sanitizedId) {
        throw CustomException('Invalid tag ID', 400);
    }

    // MASS ASSIGNMENT PROTECTION: Only allow specific fields
    const allowedFields = pickAllowedFields(req.body, [
        'name',
        'nameAr',
        'color',
        'entityTypes',
        'isActive'
    ]);

    // Validate color format if provided
    if (allowedFields.color) {
        const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!colorRegex.test(allowedFields.color)) {
            throw CustomException('Invalid color format. Use hex format (#RRGGBB or #RGB)', 400);
        }
    }

    // Validate entityTypes if provided
    if (allowedFields.entityTypes) {
        const validEntityTypes = ['lead', 'client', 'contact', 'case', 'quote', 'campaign'];
        const invalidTypes = allowedFields.entityTypes.filter(type => !validEntityTypes.includes(type));
        if (invalidTypes.length > 0) {
            throw CustomException(`Invalid entity types: ${invalidTypes.join(', ')}`, 400);
        }
    }

    // IDOR Protection: Query-level ownership check
    const tag = await Tag.findOneAndUpdate(
        { _id: sanitizedId, ...req.firmQuery },
        {
            $set: {
                ...allowedFields,
                updatedBy: req.userID,
                updatedAt: new Date()
            }
        },
        { new: true }
    )
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email');

    if (!tag) {
        throw CustomException('Tag not found', 404);
    }

    return res.json({
        error: false,
        message: 'Tag updated successfully',
        data: tag
    });
});

/**
 * Delete tag
 * @route DELETE /api/tags/:id
 */
const deleteTag = asyncHandler(async (req, res) => {
    const sanitizedId = sanitizeObjectId(req.params.id);
    if (!sanitizedId) {
        throw CustomException('Invalid tag ID', 400);
    }

    // IDOR Protection: Query-level ownership check
    const tag = await Tag.findOneAndDelete({
        _id: sanitizedId,
        ...req.firmQuery
    });

    if (!tag) {
        throw CustomException('Tag not found', 404);
    }

    return res.json({
        error: false,
        message: 'Tag deleted successfully'
    });
});

/**
 * Merge multiple tags into one
 * @route POST /api/tags/merge
 */
const mergeTags = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    // MASS ASSIGNMENT PROTECTION
    const allowedFields = pickAllowedFields(req.body, ['sourceTagIds', 'targetTagId']);

    if (!allowedFields.sourceTagIds || !Array.isArray(allowedFields.sourceTagIds)) {
        throw CustomException('sourceTagIds must be an array', 400);
    }

    if (!allowedFields.targetTagId) {
        throw CustomException('targetTagId is required', 400);
    }

    // SANITIZE IDs
    const sanitizedTargetId = sanitizeObjectId(allowedFields.targetTagId);
    if (!sanitizedTargetId) {
        throw CustomException('Invalid targetTagId', 400);
    }

    const sanitizedSourceIds = allowedFields.sourceTagIds
        .map(id => sanitizeObjectId(id))
        .filter(id => id !== null);

    if (sanitizedSourceIds.length === 0) {
        throw CustomException('No valid source tag IDs provided', 400);
    }

    if (sanitizedSourceIds.length !== allowedFields.sourceTagIds.length) {
        throw CustomException('One or more source tag IDs are invalid', 400);
    }

    // Use static method with firm isolation
    const mergedTag = await Tag.mergeTags(sanitizedSourceIds, sanitizedTargetId, firmId);

    return res.json({
        error: false,
        message: `Successfully merged ${sanitizedSourceIds.length} tags`,
        data: mergedTag
    });
});

/**
 * Bulk create tags
 * @route POST /api/tags/bulk
 */
const bulkCreate = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;

    const { tags } = req.body;

    if (!Array.isArray(tags) || tags.length === 0) {
        throw CustomException('tags must be a non-empty array', 400);
    }

    if (tags.length > 100) {
        throw CustomException('Cannot create more than 100 tags at once', 400);
    }

    const validEntityTypes = ['lead', 'client', 'contact', 'case', 'quote', 'campaign'];
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

    // Validate and sanitize each tag
    const tagDocs = tags.map(tagData => {
        // MASS ASSIGNMENT PROTECTION
        const allowedFields = pickAllowedFields(tagData, [
            'name',
            'nameAr',
            'color',
            'entityTypes',
            'isActive'
        ]);

        if (!allowedFields.name || typeof allowedFields.name !== 'string') {
            throw CustomException('Each tag must have a name', 400);
        }

        // Validate color if provided
        if (allowedFields.color && !colorRegex.test(allowedFields.color)) {
            throw CustomException(`Invalid color format for tag "${allowedFields.name}"`, 400);
        }

        // Validate entityTypes if provided
        if (allowedFields.entityTypes) {
            const invalidTypes = allowedFields.entityTypes.filter(type => !validEntityTypes.includes(type));
            if (invalidTypes.length > 0) {
                throw CustomException(`Invalid entity types in tag "${allowedFields.name}": ${invalidTypes.join(', ')}`, 400);
            }
        }

        return {
            ...allowedFields,
            firmId,
            createdBy: userId
        };
    });

    // Insert all tags
    const createdTags = await Tag.insertMany(tagDocs, { ordered: false });

    return res.status(201).json({
        error: false,
        message: `Successfully created ${createdTags.length} tags`,
        data: createdTags
    });
});

/**
 * Get popular tags (most used)
 * @route GET /api/tags/popular
 */
const getPopularTags = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { limit = 10 } = req.query;

    const parsedLimit = Math.min(parseInt(limit) || 10, 50);

    // Use static method with firm isolation
    const tags = await Tag.getPopularTags(firmId, parsedLimit);

    return res.json({
        error: false,
        data: tags
    });
});

/**
 * Get tags by entity type
 * @route GET /api/tags/entity/:entityType
 */
const getTagsByEntity = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { entityType } = req.params;

    const validEntityTypes = ['lead', 'client', 'contact', 'case', 'quote', 'campaign'];
    if (!validEntityTypes.includes(entityType)) {
        throw CustomException('Invalid entity type', 400);
    }

    // Use static method with firm isolation
    const tags = await Tag.getTagsByEntity(firmId, entityType);

    return res.json({
        error: false,
        data: tags
    });
});

module.exports = {
    createTag,
    getTags,
    getTagById,
    updateTag,
    deleteTag,
    mergeTags,
    bulkCreate,
    getPopularTags,
    getTagsByEntity
};
