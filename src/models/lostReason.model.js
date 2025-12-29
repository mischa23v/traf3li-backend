/**
 * Lost Reason Model
 * Security: Multi-tenant isolation via firmId
 *
 * Tracks reasons why deals (leads, opportunities, quotes) are lost.
 * Helps with analytics and improving conversion rates.
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const LOST_REASON_CATEGORIES = [
    'price',
    'competition',
    'timing',
    'needs',
    'internal',
    'other'
];

const APPLICABLE_TO_TYPES = [
    'lead',
    'opportunity',
    'quote'
];

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const lostReasonSchema = new mongoose.Schema({
    // Multi-tenancy field (REQUIRED for all models)
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
    // Basic fields
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    nameAr: {
        type: String,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },

    // Categorization
    category: {
        type: String,
        enum: LOST_REASON_CATEGORIES,
        default: 'other',
        index: true
    },
    applicableTo: [{
        type: String,
        enum: APPLICABLE_TO_TYPES
    }],

    // Display and organization
    sortOrder: {
        type: Number,
        default: 0,
        index: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    isDefault: {
        type: Boolean,
        default: false,
        index: true
    },

    // Usage tracking
    usageCount: {
        type: Number,
        default: 0,
        min: 0
    },

    // Audit fields
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
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

// Compound indexes for common queries
lostReasonSchema.index({ firmId: 1, category: 1 });
lostReasonSchema.index({ firmId: 1, isActive: 1 });
lostReasonSchema.index({ firmId: 1, sortOrder: 1 });
lostReasonSchema.index({ firmId: 1, isDefault: 1 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all lost reasons for a firm with optional filters
 * @param {ObjectId} firmId - Firm ID (REQUIRED for multi-tenant isolation)
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of lost reasons
 */
lostReasonSchema.statics.getLostReasons = async function(firmId, filters = {}) {
    if (!firmId) throw new Error('firmId is required');

    const query = { firmId };

    // Apply filters
    if (filters.category) {
        query.category = filters.category;
    }
    if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
    }
    if (filters.applicableTo) {
        query.applicableTo = filters.applicableTo;
    }

    return this.find(query)
        .populate('createdBy', 'firstName lastName')
        .sort({ sortOrder: 1, name: 1 });
};

/**
 * Increment usage count when a lost reason is applied
 * @param {ObjectId} reasonId - Lost reason ID
 * @param {ObjectId} firmId - Firm ID (REQUIRED for multi-tenant isolation)
 * @returns {Promise<Object>} Updated lost reason
 */
lostReasonSchema.statics.incrementUsage = async function(reasonId, firmId) {
    if (!firmId) throw new Error('firmId is required');

    return this.findOneAndUpdate(
        { _id: reasonId, firmId },
        { $inc: { usageCount: 1 } },
        { new: true }
    );
};

/**
 * Get usage statistics for lost reasons
 * @param {ObjectId} firmId - Firm ID (REQUIRED for multi-tenant isolation)
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Usage statistics
 */
lostReasonSchema.statics.getUsageStats = async function(firmId, options = {}) {
    if (!firmId) throw new Error('firmId is required');

    const { category, limit = 10 } = options;

    const matchStage = { firmId: new mongoose.Types.ObjectId(firmId) };
    if (category) {
        matchStage.category = category;
    }

    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$category',
                totalUsage: { $sum: '$usageCount' },
                reasons: {
                    $push: {
                        id: '$_id',
                        name: '$name',
                        nameAr: '$nameAr',
                        usageCount: '$usageCount',
                        isActive: '$isActive'
                    }
                }
            }
        },
        {
            $project: {
                category: '$_id',
                totalUsage: 1,
                reasons: {
                    $slice: [
                        {
                            $sortArray: {
                                input: '$reasons',
                                sortBy: { usageCount: -1 }
                            }
                        },
                        limit
                    ]
                }
            }
        },
        { $sort: { totalUsage: -1 } }
    ]);
};

/**
 * Create default lost reasons for a new firm
 * @param {ObjectId} firmId - Firm ID
 * @param {ObjectId} userId - User creating the defaults
 * @returns {Promise<Array>} Created lost reasons
 */
lostReasonSchema.statics.createDefaults = async function(firmId, userId) {
    const defaults = [
        // Price reasons
        {
            name: 'Price too high',
            nameAr: 'السعر مرتفع جداً',
            category: 'price',
            applicableTo: ['lead', 'opportunity', 'quote'],
            sortOrder: 1
        },
        {
            name: 'Budget constraints',
            nameAr: 'قيود الميزانية',
            category: 'price',
            applicableTo: ['lead', 'opportunity', 'quote'],
            sortOrder: 2
        },
        {
            name: 'Found cheaper option',
            nameAr: 'وجدوا خيار أرخص',
            category: 'price',
            applicableTo: ['opportunity', 'quote'],
            sortOrder: 3
        },

        // Competition reasons
        {
            name: 'Chose competitor',
            nameAr: 'اختاروا منافس',
            category: 'competition',
            applicableTo: ['lead', 'opportunity', 'quote'],
            sortOrder: 4,
            isDefault: true
        },
        {
            name: 'Existing relationship with competitor',
            nameAr: 'علاقة قائمة مع منافس',
            category: 'competition',
            applicableTo: ['lead', 'opportunity'],
            sortOrder: 5
        },

        // Timing reasons
        {
            name: 'Bad timing',
            nameAr: 'توقيت غير مناسب',
            category: 'timing',
            applicableTo: ['lead', 'opportunity'],
            sortOrder: 6
        },
        {
            name: 'Project postponed',
            nameAr: 'تم تأجيل المشروع',
            category: 'timing',
            applicableTo: ['opportunity', 'quote'],
            sortOrder: 7
        },
        {
            name: 'No longer needed',
            nameAr: 'لم تعد هناك حاجة',
            category: 'timing',
            applicableTo: ['lead', 'opportunity'],
            sortOrder: 8
        },

        // Needs reasons
        {
            name: 'Requirements mismatch',
            nameAr: 'عدم تطابق المتطلبات',
            category: 'needs',
            applicableTo: ['lead', 'opportunity', 'quote'],
            sortOrder: 9
        },
        {
            name: 'Service not available',
            nameAr: 'الخدمة غير متوفرة',
            category: 'needs',
            applicableTo: ['lead', 'opportunity'],
            sortOrder: 10
        },

        // Internal reasons
        {
            name: 'Conflict of interest',
            nameAr: 'تضارب مصالح',
            category: 'internal',
            applicableTo: ['lead', 'opportunity'],
            sortOrder: 11
        },
        {
            name: 'Resource constraints',
            nameAr: 'قيود الموارد',
            category: 'internal',
            applicableTo: ['lead', 'opportunity'],
            sortOrder: 12
        },

        // Other
        {
            name: 'No response from client',
            nameAr: 'لا رد من العميل',
            category: 'other',
            applicableTo: ['lead', 'opportunity', 'quote'],
            sortOrder: 13
        },
        {
            name: 'Other',
            nameAr: 'أخرى',
            category: 'other',
            applicableTo: ['lead', 'opportunity', 'quote'],
            sortOrder: 14
        }
    ];

    const reasons = defaults.map(d => ({
        ...d,
        firmId,
        createdBy: userId
    }));

    return this.insertMany(reasons, { ordered: false }).catch(err => {
        // Ignore duplicate key errors
        if (err.code !== 11000) throw err;
    });
};

/**
 * Get valid categories
 * @returns {Array} Array of valid category strings
 */
lostReasonSchema.statics.getCategories = function() {
    return LOST_REASON_CATEGORIES;
};

/**
 * Get valid applicable-to types
 * @returns {Array} Array of valid applicable-to types
 */
lostReasonSchema.statics.getApplicableToTypes = function() {
    return APPLICABLE_TO_TYPES;
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Set this lost reason as default (and unset others)
 * @param {ObjectId} userId - User making the change
 * @returns {Promise<Object>} Updated lost reason
 */
lostReasonSchema.methods.setAsDefault = async function(userId) {
    // Unset all other defaults for this firm
    await this.constructor.updateMany(
        { firmId: this.firmId, _id: { $ne: this._id } },
        { $set: { isDefault: false } }
    );

    // Set this one as default
    this.isDefault = true;
    this.updatedBy = userId;
    return this.save();
};

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════

/**
 * Get display name (bilingual if Arabic is available)
 */
lostReasonSchema.virtual('displayName').get(function() {
    if (this.nameAr) {
        return `${this.name} / ${this.nameAr}`;
    }
    return this.name;
});

lostReasonSchema.set('toJSON', { virtuals: true });
lostReasonSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('LostReason', lostReasonSchema);
