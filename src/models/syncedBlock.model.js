const mongoose = require('mongoose');

/**
 * Block content schema
 * Represents a single content block within a synced block
 */
const blockContentSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: [
            'paragraph',
            'heading',
            'list',
            'numbered_list',
            'checkbox',
            'quote',
            'code',
            'table',
            'divider',
            'image',
            'file',
            'video',
            'callout',
            'custom'
        ]
    },
    content: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    properties: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    children: [{
        type: mongoose.Schema.Types.Mixed
    }],
    order: {
        type: Number,
        required: true,
        default: 0
    }
}, { _id: true });

/**
 * Instance tracking schema
 * Tracks where a synced block is being used
 */
const instanceSchema = new mongoose.Schema({
    pageId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        index: true
    },
    blockId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        required: false,
        index: true
    },
    addedAt: {
        type: Date,
        default: Date.now
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { _id: true });

/**
 * Permissions schema
 * Controls who can edit and use synced blocks
 */
const permissionsSchema = new mongoose.Schema({
    canEdit: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    canUse: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { _id: false });

/**
 * Synced Block Schema
 * Allows content to be edited in one place and automatically update everywhere it's used
 * Perfect for FAQs, boilerplate text, process documentation, legal templates, etc.
 */
const syncedBlockSchema = new mongoose.Schema({
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    lastEditedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: [blockContentSchema],
        required: true,
        validate: {
            validator: function(v) {
                return v && v.length > 0;
            },
            message: 'Synced block must contain at least one content block'
        }
    },
    instances: {
        type: [instanceSchema],
        default: []
    },
    category: {
        type: String,
        required: true,
        enum: [
            'legal-boilerplate',
            'firm-info',
            'procedures',
            'templates',
            'custom'
        ],
        default: 'custom',
        index: true
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    isPublic: {
        type: Boolean,
        default: true,
        index: true
    },
    permissions: {
        type: permissionsSchema,
        default: () => ({ canEdit: [], canUse: [] })
    },
    version: {
        type: Number,
        default: 1,
        min: 1
    },
    usageCount: {
        type: Number,
        default: 0,
        min: 0
    },
    lastUsedAt: {
        type: Date
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    status: {
        type: String,
        enum: ['active', 'deprecated', 'archived'],
        default: 'active',
        index: true
    }
}, {
    versionKey: false,
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

// Composite indexes for efficient queries
syncedBlockSchema.index({ firmId: 1, category: 1 });
syncedBlockSchema.index({ firmId: 1, isPublic: 1 });
syncedBlockSchema.index({ firmId: 1, status: 1 });
syncedBlockSchema.index({ tags: 1 });
syncedBlockSchema.index({ usageCount: -1 });
syncedBlockSchema.index({ lastUsedAt: -1 });

// Text index for search functionality
syncedBlockSchema.index({ name: 'text', description: 'text' });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Pre-save hook to update usage count from instances array
 */
syncedBlockSchema.pre('save', function(next) {
    // Update usage count from instances array length
    if (this.instances && Array.isArray(this.instances)) {
        this.usageCount = this.instances.length;
    }

    // Set lastEditedBy to createdBy on first save if not set
    if (this.isNew && !this.lastEditedBy) {
        this.lastEditedBy = this.createdBy;
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Update the master content of this synced block
 * @param {Array} newContent - Array of block content objects
 * @param {ObjectId} userId - ID of the user making the update
 * @returns {Promise<SyncedBlock>} Updated synced block
 */
syncedBlockSchema.methods.updateContent = async function(newContent, userId) {
    if (!newContent || !Array.isArray(newContent) || newContent.length === 0) {
        throw new Error('Content must be a non-empty array');
    }

    this.content = newContent;
    this.lastEditedBy = userId;
    this.version += 1;

    await this.save();
    return this;
};

/**
 * Add a new instance tracking where this synced block is used
 * @param {ObjectId} pageId - ID of the page where block is used
 * @param {ObjectId} blockId - ID of the block instance
 * @param {ObjectId} caseId - Optional case ID if used in a case
 * @param {ObjectId} userId - ID of the user adding the instance
 * @returns {Promise<SyncedBlock>} Updated synced block
 */
syncedBlockSchema.methods.addInstance = async function(pageId, blockId, caseId, userId) {
    if (!blockId) {
        throw new Error('blockId is required');
    }

    // Check if instance already exists
    const existingInstance = this.instances.find(
        inst => inst.blockId.toString() === blockId.toString()
    );

    if (existingInstance) {
        return this; // Already tracked
    }

    // Add new instance
    this.instances.push({
        pageId,
        blockId,
        caseId,
        addedBy: userId,
        addedAt: new Date()
    });

    // Update last used timestamp
    this.lastUsedAt = new Date();

    await this.save();
    return this;
};

/**
 * Remove an instance when synced block is no longer used in that location
 * @param {ObjectId} blockId - ID of the block instance to remove
 * @returns {Promise<SyncedBlock>} Updated synced block
 */
syncedBlockSchema.methods.removeInstance = async function(blockId) {
    if (!blockId) {
        throw new Error('blockId is required');
    }

    const initialLength = this.instances.length;
    this.instances = this.instances.filter(
        inst => inst.blockId.toString() !== blockId.toString()
    );

    // Only save if something was actually removed
    if (this.instances.length < initialLength) {
        await this.save();
    }

    return this;
};

/**
 * Get all instances where this synced block is used
 * @returns {Array} Array of instance objects
 */
syncedBlockSchema.methods.getInstances = function() {
    return this.instances.map(inst => ({
        pageId: inst.pageId,
        blockId: inst.blockId,
        caseId: inst.caseId,
        addedAt: inst.addedAt,
        addedBy: inst.addedBy
    }));
};

/**
 * Mark this synced block as deprecated
 * Existing instances still work but new instances cannot be added
 * @returns {Promise<SyncedBlock>} Updated synced block
 */
syncedBlockSchema.methods.deprecate = async function() {
    this.status = 'deprecated';
    await this.save();
    return this;
};

/**
 * Check if a user has permission to edit this synced block
 * @param {ObjectId} userId - ID of the user to check
 * @returns {Boolean} True if user can edit
 */
syncedBlockSchema.methods.canUserEdit = function(userId) {
    const userIdStr = userId.toString();

    // Creator can always edit
    if (this.createdBy.toString() === userIdStr) {
        return true;
    }

    // Check if user is in canEdit permissions
    if (this.permissions && this.permissions.canEdit) {
        return this.permissions.canEdit.some(
            id => id.toString() === userIdStr
        );
    }

    return false;
};

/**
 * Check if a user has permission to use this synced block
 * @param {ObjectId} userId - ID of the user to check
 * @returns {Boolean} True if user can use
 */
syncedBlockSchema.methods.canUserUse = function(userId) {
    // Public blocks can be used by anyone in the firm
    if (this.isPublic) {
        return true;
    }

    const userIdStr = userId.toString();

    // Creator can always use
    if (this.createdBy.toString() === userIdStr) {
        return true;
    }

    // Check if user is in canUse permissions
    if (this.permissions && this.permissions.canUse) {
        return this.permissions.canUse.some(
            id => id.toString() === userIdStr
        );
    }

    return false;
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all synced blocks for a firm with optional filtering
 * @param {ObjectId} firmId - ID of the firm
 * @param {Object} options - Filter options
 * @param {String} options.category - Filter by category
 * @param {String} options.status - Filter by status
 * @param {Boolean} options.isPublic - Filter by public/private
 * @param {Array} options.tags - Filter by tags
 * @param {ObjectId} options.userId - Filter blocks user can access
 * @param {Number} options.limit - Limit number of results
 * @param {Number} options.skip - Skip number of results
 * @param {String} options.sort - Sort field (default: -updatedAt)
 * @returns {Promise<Array>} Array of synced blocks
 */
syncedBlockSchema.statics.getFirmSyncedBlocks = async function(firmId, options = {}) {
    const query = { firmId: new mongoose.Types.ObjectId(firmId) };

    // Apply filters
    if (options.category) {
        query.category = options.category;
    }

    if (options.status) {
        query.status = options.status;
    } else {
        // Default to active and deprecated (exclude archived)
        query.status = { $in: ['active', 'deprecated'] };
    }

    if (typeof options.isPublic === 'boolean') {
        query.isPublic = options.isPublic;
    }

    if (options.tags && Array.isArray(options.tags) && options.tags.length > 0) {
        query.tags = { $in: options.tags };
    }

    // If userId provided, filter by access permissions
    if (options.userId) {
        const userId = new mongoose.Types.ObjectId(options.userId);
        query.$or = [
            { isPublic: true },
            { createdBy: userId },
            { 'permissions.canUse': userId }
        ];
    }

    let queryBuilder = this.find(query)
        .populate('createdBy', 'firstName lastName email')
        .populate('lastEditedBy', 'firstName lastName email');

    // Apply sorting
    const sortField = options.sort || '-updatedAt';
    queryBuilder = queryBuilder.sort(sortField);

    // Apply pagination
    if (options.skip) {
        queryBuilder = queryBuilder.skip(options.skip);
    }

    if (options.limit) {
        queryBuilder = queryBuilder.limit(options.limit);
    }

    return await queryBuilder.exec();
};

/**
 * Get synced blocks by category
 * @param {ObjectId} firmId - ID of the firm
 * @param {String} category - Category to filter by
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} Array of synced blocks
 */
syncedBlockSchema.statics.getByCategory = async function(firmId, category, options = {}) {
    return await this.getFirmSyncedBlocks(firmId, {
        ...options,
        category
    });
};

/**
 * Search synced blocks by name or description
 * @param {ObjectId} firmId - ID of the firm
 * @param {String} query - Search query
 * @param {Object} options - Additional filter options
 * @returns {Promise<Array>} Array of matching synced blocks
 */
syncedBlockSchema.statics.search = async function(firmId, query, options = {}) {
    const searchQuery = {
        firmId: new mongoose.Types.ObjectId(firmId),
        $text: { $search: query }
    };

    // Apply status filter (default to active and deprecated)
    if (options.status) {
        searchQuery.status = options.status;
    } else {
        searchQuery.status = { $in: ['active', 'deprecated'] };
    }

    // Apply user access filter if provided
    if (options.userId) {
        const userId = new mongoose.Types.ObjectId(options.userId);
        searchQuery.$or = [
            { isPublic: true },
            { createdBy: userId },
            { 'permissions.canUse': userId }
        ];
    }

    return await this.find(searchQuery, {
        score: { $meta: 'textScore' }
    })
        .sort({ score: { $meta: 'textScore' } })
        .populate('createdBy', 'firstName lastName email')
        .populate('lastEditedBy', 'firstName lastName email')
        .limit(options.limit || 50)
        .exec();
};

/**
 * Get most popular synced blocks by usage count
 * @param {ObjectId} firmId - ID of the firm
 * @param {Number} limit - Number of results to return (default: 10)
 * @param {Object} options - Additional filter options
 * @returns {Promise<Array>} Array of popular synced blocks
 */
syncedBlockSchema.statics.getPopular = async function(firmId, limit = 10, options = {}) {
    return await this.getFirmSyncedBlocks(firmId, {
        ...options,
        limit,
        sort: '-usageCount -lastUsedAt'
    });
};

/**
 * Get all block IDs that need updating when a synced block changes
 * Used for synchronization operations
 * @param {ObjectId} syncedBlockId - ID of the synced block
 * @returns {Promise<Array>} Array of block IDs to update
 */
syncedBlockSchema.statics.syncToInstances = async function(syncedBlockId) {
    const syncedBlock = await this.findById(syncedBlockId);

    if (!syncedBlock) {
        throw new Error('Synced block not found');
    }

    return syncedBlock.instances.map(inst => ({
        blockId: inst.blockId,
        pageId: inst.pageId,
        caseId: inst.caseId,
        version: syncedBlock.version,
        content: syncedBlock.content
    }));
};

/**
 * Get synced blocks recently updated
 * @param {ObjectId} firmId - ID of the firm
 * @param {Number} days - Number of days to look back (default: 7)
 * @param {Number} limit - Maximum results to return (default: 20)
 * @returns {Promise<Array>} Array of recently updated synced blocks
 */
syncedBlockSchema.statics.getRecentlyUpdated = async function(firmId, days = 7, limit = 20) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return await this.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        status: { $in: ['active', 'deprecated'] },
        updatedAt: { $gte: cutoffDate }
    })
        .populate('createdBy', 'firstName lastName email')
        .populate('lastEditedBy', 'firstName lastName email')
        .sort('-updatedAt')
        .limit(limit)
        .exec();
};

/**
 * Get statistics for synced blocks in a firm
 * @param {ObjectId} firmId - ID of the firm
 * @returns {Promise<Object>} Statistics object
 */
syncedBlockSchema.statics.getStats = async function(firmId) {
    const stats = await this.aggregate([
        {
            $match: {
                firmId: new mongoose.Types.ObjectId(firmId)
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                active: {
                    $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                },
                deprecated: {
                    $sum: { $cond: [{ $eq: ['$status', 'deprecated'] }, 1, 0] }
                },
                archived: {
                    $sum: { $cond: [{ $eq: ['$status', 'archived'] }, 1, 0] }
                },
                public: {
                    $sum: { $cond: [{ $eq: ['$isPublic', true] }, 1, 0] }
                },
                private: {
                    $sum: { $cond: [{ $eq: ['$isPublic', false] }, 1, 0] }
                },
                totalUsages: { $sum: '$usageCount' },
                averageUsages: { $avg: '$usageCount' }
            }
        }
    ]);

    const byCategory = await this.aggregate([
        {
            $match: {
                firmId: new mongoose.Types.ObjectId(firmId),
                status: { $in: ['active', 'deprecated'] }
            }
        },
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 },
                totalUsages: { $sum: '$usageCount' }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);

    return {
        total: stats[0]?.total || 0,
        byStatus: {
            active: stats[0]?.active || 0,
            deprecated: stats[0]?.deprecated || 0,
            archived: stats[0]?.archived || 0
        },
        byVisibility: {
            public: stats[0]?.public || 0,
            private: stats[0]?.private || 0
        },
        usage: {
            total: stats[0]?.totalUsages || 0,
            average: Math.round(stats[0]?.averageUsages || 0)
        },
        byCategory: byCategory.map(cat => ({
            category: cat._id,
            count: cat.count,
            totalUsages: cat.totalUsages
        }))
    };
};

module.exports = mongoose.model('SyncedBlock', syncedBlockSchema);
