/**
 * Tag Model
 * Universal tagging system for leads, clients, contacts, cases, quotes, campaigns
 * Security: Multi-tenant isolation via firmId
 */

const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANCY
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // TAG IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    nameAr: {
        type: String,
        trim: true,
        maxlength: 100
    },
    slug: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 120
        // Unique per firm - enforced by compound index
    },

    // ═══════════════════════════════════════════════════════════════
    // APPEARANCE
    // ═══════════════════════════════════════════════════════════════
    color: {
        type: String,
        default: '#6366f1',
        trim: true,
        match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    },

    // ═══════════════════════════════════════════════════════════════
    // ENTITY ASSOCIATIONS
    // ═══════════════════════════════════════════════════════════════
    entityTypes: [{
        type: String,
        enum: ['lead', 'client', 'contact', 'case', 'quote', 'campaign'],
        lowercase: true
    }],

    // ═══════════════════════════════════════════════════════════════
    // USAGE TRACKING
    // ═══════════════════════════════════════════════════════════════
    usageCount: {
        type: Number,
        default: 0,
        min: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

// Unique slug per firm
tagSchema.index({ firmId: 1, slug: 1 }, { unique: true });

// Common queries
tagSchema.index({ firmId: 1, isActive: 1 });
tagSchema.index({ firmId: 1, usageCount: -1 });
tagSchema.index({ firmId: 1, entityTypes: 1 });

// ═══════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Pre-save hook: Generate slug from name
 */
tagSchema.pre('save', function(next) {
    if (this.isModified('name') || !this.slug) {
        // Generate slug from name: convert to lowercase, remove special chars, replace spaces with hyphens
        this.slug = this.name
            .toLowerCase()
            .trim()
            .replace(/[\s_]+/g, '-')              // Replace spaces and underscores with hyphens
            .replace(/[^\w\-\u0600-\u06FF]+/g, '') // Remove special chars (keep Arabic)
            .replace(/\-\-+/g, '-')                // Replace multiple hyphens with single
            .replace(/^-+/, '')                    // Trim hyphens from start
            .replace(/-+$/, '');                   // Trim hyphens from end
    }
    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get tags with filters
 * @param {ObjectId} firmId - Firm ID (REQUIRED for multi-tenant isolation)
 * @param {Object} filters - Query filters
 * @returns {Promise<Array>}
 */
tagSchema.statics.getTags = async function(firmId, filters = {}) {
    if (!firmId) throw new Error('firmId is required');

    const query = { firmId: new mongoose.Types.ObjectId(firmId) };

    // Filter by entity type
    if (filters.entityType) {
        query.entityTypes = filters.entityType;
    }

    // Filter by active status
    if (typeof filters.isActive === 'boolean') {
        query.isActive = filters.isActive;
    }

    // Search by name
    if (filters.search) {
        const searchRegex = new RegExp(
            filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            'i'
        );
        query.$or = [
            { name: searchRegex },
            { nameAr: searchRegex },
            { slug: searchRegex }
        ];
    }

    const limit = Math.min(filters.limit || 100, 500);
    const skip = filters.skip || 0;
    const sort = filters.sortBy || 'name';

    return await this.find(query)
        .populate('createdBy', 'firstName lastName email')
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .lean();
};

/**
 * Get tags filtered by entity type
 * @param {ObjectId} firmId - Firm ID (REQUIRED)
 * @param {String} entityType - Entity type to filter by
 * @returns {Promise<Array>}
 */
tagSchema.statics.getTagsByEntity = async function(firmId, entityType) {
    if (!firmId) throw new Error('firmId is required');

    const validEntityTypes = ['lead', 'client', 'contact', 'case', 'quote', 'campaign'];
    if (!validEntityTypes.includes(entityType)) {
        throw new Error('Invalid entity type');
    }

    return await this.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        entityTypes: entityType,
        isActive: true
    })
        .select('name nameAr slug color usageCount')
        .sort({ usageCount: -1, name: 1 })
        .lean();
};

/**
 * Increment usage count
 * @param {ObjectId} tagId - Tag ID
 * @param {ObjectId} firmId - Firm ID (REQUIRED for security)
 * @returns {Promise<Object>}
 */
tagSchema.statics.incrementUsage = async function(tagId, firmId) {
    if (!firmId) throw new Error('firmId is required');

    return await this.findOneAndUpdate(
        {
            _id: new mongoose.Types.ObjectId(tagId),
            firmId: new mongoose.Types.ObjectId(firmId)
        },
        { $inc: { usageCount: 1 } },
        { new: true }
    );
};

/**
 * Decrement usage count
 * @param {ObjectId} tagId - Tag ID
 * @param {ObjectId} firmId - Firm ID (REQUIRED for security)
 * @returns {Promise<Object>}
 */
tagSchema.statics.decrementUsage = async function(tagId, firmId) {
    if (!firmId) throw new Error('firmId is required');

    return await this.findOneAndUpdate(
        {
            _id: new mongoose.Types.ObjectId(tagId),
            firmId: new mongoose.Types.ObjectId(firmId)
        },
        { $inc: { usageCount: -1 } },
        { new: true }
    );
};

/**
 * Search tags across name and slug
 * @param {ObjectId} firmId - Firm ID (REQUIRED)
 * @param {String} searchTerm - Search term
 * @param {Object} options - Additional options
 * @returns {Promise<Array>}
 */
tagSchema.statics.searchTags = async function(firmId, searchTerm, options = {}) {
    if (!firmId) throw new Error('firmId is required');
    if (!searchTerm || typeof searchTerm !== 'string') {
        return [];
    }

    // Escape regex special characters to prevent ReDoS
    const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escapedSearch, 'i');

    const query = {
        firmId: new mongoose.Types.ObjectId(firmId),
        isActive: true,
        $or: [
            { name: searchRegex },
            { nameAr: searchRegex },
            { slug: searchRegex }
        ]
    };

    // Filter by entity type if provided
    if (options.entityType) {
        query.entityTypes = options.entityType;
    }

    const limit = Math.min(options.limit || 20, 100);

    return await this.find(query)
        .select('name nameAr slug color entityTypes usageCount')
        .sort({ usageCount: -1, name: 1 })
        .limit(limit)
        .lean();
};

/**
 * Get popular tags (most used)
 * @param {ObjectId} firmId - Firm ID (REQUIRED)
 * @param {Number} limit - Number of tags to return
 * @returns {Promise<Array>}
 */
tagSchema.statics.getPopularTags = async function(firmId, limit = 10) {
    if (!firmId) throw new Error('firmId is required');

    return await this.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        isActive: true,
        usageCount: { $gt: 0 }
    })
        .select('name nameAr slug color usageCount entityTypes')
        .sort({ usageCount: -1, name: 1 })
        .limit(Math.min(limit, 50))
        .lean();
};

/**
 * Merge multiple tags into one
 * @param {Array<ObjectId>} sourceTagIds - Tags to merge (will be deleted)
 * @param {ObjectId} targetTagId - Target tag to merge into
 * @param {ObjectId} firmId - Firm ID (REQUIRED for security)
 * @returns {Promise<Object>}
 */
tagSchema.statics.mergeTags = async function(sourceTagIds, targetTagId, firmId) {
    if (!firmId) throw new Error('firmId is required');
    if (!Array.isArray(sourceTagIds) || sourceTagIds.length === 0) {
        throw new Error('sourceTagIds must be a non-empty array');
    }

    // Verify target tag exists and belongs to firm
    const targetTag = await this.findOne({
        _id: new mongoose.Types.ObjectId(targetTagId),
        firmId: new mongoose.Types.ObjectId(firmId)
    });

    if (!targetTag) {
        throw new Error('Target tag not found');
    }

    // Verify all source tags exist and belong to firm
    const sourceTags = await this.find({
        _id: { $in: sourceTagIds.map(id => new mongoose.Types.ObjectId(id)) },
        firmId: new mongoose.Types.ObjectId(firmId)
    });

    if (sourceTags.length !== sourceTagIds.length) {
        throw new Error('One or more source tags not found');
    }

    // Calculate total usage count
    const totalUsageCount = sourceTags.reduce((sum, tag) => sum + (tag.usageCount || 0), 0);

    // Merge entity types (unique)
    const mergedEntityTypes = [...new Set([
        ...targetTag.entityTypes,
        ...sourceTags.flatMap(tag => tag.entityTypes)
    ])];

    // Update target tag
    targetTag.usageCount += totalUsageCount;
    targetTag.entityTypes = mergedEntityTypes;
    await targetTag.save();

    // Delete source tags
    await this.deleteMany({
        _id: { $in: sourceTagIds.map(id => new mongoose.Types.ObjectId(id)) },
        firmId: new mongoose.Types.ObjectId(firmId)
    });

    return targetTag;
};

module.exports = mongoose.model('Tag', tagSchema);
