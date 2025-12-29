const mongoose = require('mongoose');

/**
 * SavedFilter Model
 *
 * Stores user-defined filters, sort configurations, and column selections
 * for different entity types (invoices, clients, cases, etc.).
 * Supports sharing filters with team members and usage tracking.
 */

const savedFilterSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // BASIC INFO
    // ═══════════════════════════════════════════════════════════════
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },

    // ═══════════════════════════════════════════════════════════════
    // OWNERSHIP & MULTI-TENANCY
    // ═══════════════════════════════════════════════════════════════
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
     },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ═══════════════════════════════════════════════════════════════
    // ENTITY TYPE & CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    entityType: {
        type: String,
        required: true,
        enum: [
            'invoices',
            'clients',
            'cases',
            'leads',
            'tasks',
            'events',
            'expenses',
            'payments',
            'documents',
            'contacts',
            'deals',
            'projects',
            'time_entries'
        ],
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // FILTER CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    filters: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // ═══════════════════════════════════════════════════════════════
    // SORT CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    sort: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // ═══════════════════════════════════════════════════════════════
    // COLUMN SELECTION
    // ═══════════════════════════════════════════════════════════════
    columns: {
        type: [String],
        default: []
    },

    // ═══════════════════════════════════════════════════════════════
    // DEFAULT & FAVORITE
    // ═══════════════════════════════════════════════════════════════
    isDefault: {
        type: Boolean,
        default: false,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // SHARING
    // ═══════════════════════════════════════════════════════════════
    isShared: {
        type: Boolean,
        default: false,
        index: true
    },
    sharedWith: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // ═══════════════════════════════════════════════════════════════
    // USAGE TRACKING
    // ═══════════════════════════════════════════════════════════════
    usageCount: {
        type: Number,
        default: 0,
        min: 0
    },
    lastUsedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
savedFilterSchema.index({ firmId: 1, entityType: 1, userId: 1 });
savedFilterSchema.index({ firmId: 1, entityType: 1, isDefault: 1 });
savedFilterSchema.index({ firmId: 1, entityType: 1, usageCount: -1 });
savedFilterSchema.index({ firmId: 1, isShared: 1 });
savedFilterSchema.index({ sharedWith: 1 });

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Record usage of this filter
 */
savedFilterSchema.methods.recordUsage = async function() {
    this.usageCount += 1;
    this.lastUsedAt = new Date();
    await this.save();
    return this;
};

/**
 * Share filter with users
 * @param {Array<String|ObjectId>} userIds - User IDs to share with
 */
savedFilterSchema.methods.shareWith = async function(userIds) {
    // Convert to ObjectIds and avoid duplicates
    const newUserIds = userIds
        .map(id => id.toString())
        .filter(id => !this.sharedWith.some(existingId => existingId.toString() === id));

    if (newUserIds.length > 0) {
        this.sharedWith.push(...newUserIds.map(id => new mongoose.Types.ObjectId(id)));
        this.isShared = true;
        await this.save();
    }

    return this;
};

/**
 * Unshare filter from specific user
 * @param {String|ObjectId} userId - User ID to unshare from
 */
savedFilterSchema.methods.unshareFrom = async function(userId) {
    const userIdStr = userId.toString();
    this.sharedWith = this.sharedWith.filter(id => id.toString() !== userIdStr);

    // Update isShared flag if no more shares
    if (this.sharedWith.length === 0) {
        this.isShared = false;
    }

    await this.save();
    return this;
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all filters for a user and entity type
 * @param {String|ObjectId} userId - User ID
 * @param {String|ObjectId} firmId - Firm ID
 * @param {String} entityType - Entity type
 * @returns {Promise<Array>} - Array of saved filters
 */
savedFilterSchema.statics.getFiltersForUser = async function(userId, firmId, entityType) {
    return this.find({
        firmId,
        entityType,
        $or: [
            { userId }, // Own filters
            { isShared: true, sharedWith: userId } // Shared filters
        ]
    })
    .populate('userId', 'firstName lastName email')
    .populate('sharedWith', 'firstName lastName email')
    .sort({ isDefault: -1, usageCount: -1, createdAt: -1 })
    .lean();
};

/**
 * Get default filter for user and entity type
 * @param {String|ObjectId} userId - User ID
 * @param {String|ObjectId} firmId - Firm ID
 * @param {String} entityType - Entity type
 * @returns {Promise<Object|null>} - Default filter or null
 */
savedFilterSchema.statics.getDefaultFilter = async function(userId, firmId, entityType) {
    return this.findOne({
        firmId,
        entityType,
        userId,
        isDefault: true
    })
    .populate('userId', 'firstName lastName email')
    .lean();
};

/**
 * Get popular filters for entity type
 * @param {String|ObjectId} firmId - Firm ID
 * @param {String} entityType - Entity type
 * @param {Number} limit - Number of filters to return
 * @returns {Promise<Array>} - Array of popular filters
 */
savedFilterSchema.statics.getPopularFilters = async function(firmId, entityType, limit = 10) {
    return this.find({
        firmId,
        entityType,
        isShared: true,
        usageCount: { $gt: 0 }
    })
    .populate('userId', 'firstName lastName email')
    .sort({ usageCount: -1, createdAt: -1 })
    .limit(limit)
    .lean();
};

module.exports = mongoose.model('SavedFilter', savedFilterSchema);
