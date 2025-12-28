const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Asset Category Model - Asset Classification
 * Defines categories for fixed assets with default depreciation settings
 */

const assetCategorySchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // IDENTIFIERS
    // ═══════════════════════════════════════════════════════════════
    categoryId: {
        type: String,
        unique: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // BASIC INFORMATION
    // ═══════════════════════════════════════════════════════════════
    name: {
        type: String,
        required: true,
        trim: true
    },
    nameAr: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // HIERARCHY
    // ═══════════════════════════════════════════════════════════════
    parentCategory: {
        type: Schema.Types.ObjectId,
        ref: 'AssetCategory',
        index: true
    },
    isGroup: {
        type: Boolean,
        default: false
    },

    // ═══════════════════════════════════════════════════════════════
    // DEPRECIATION DEFAULTS
    // ═══════════════════════════════════════════════════════════════
    depreciationMethod: {
        type: String,
        enum: ['straight_line', 'double_declining_balance', 'written_down_value'],
        default: 'straight_line'
    },
    totalNumberOfDepreciations: {
        type: Number,
        min: 0
    },
    frequencyOfDepreciation: {
        type: String,
        enum: ['monthly', 'quarterly', 'half_yearly', 'yearly'],
        default: 'yearly'
    },

    // ═══════════════════════════════════════════════════════════════
    // CAPITAL WORK IN PROGRESS (CWIP)
    // ═══════════════════════════════════════════════════════════════
    enableCwip: {
        type: Boolean,
        default: false
    },

    // ═══════════════════════════════════════════════════════════════
    // ACCOUNTING CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    fixedAssetAccount: {
        type: Schema.Types.ObjectId,
        ref: 'Account'
    },
    accumulatedDepreciationAccount: {
        type: Schema.Types.ObjectId,
        ref: 'Account'
    },
    depreciationExpenseAccount: {
        type: Schema.Types.ObjectId,
        ref: 'Account'
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    isActive: {
        type: Boolean,
        default: true
    },

    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANCY
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ═══════════════════════════════════════════════════════════════
    // AUDIT
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }

}, {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
assetCategorySchema.index({ name: 1, firmId: 1 });
assetCategorySchema.index({ parentCategory: 1 });
assetCategorySchema.index({ isGroup: 1, isActive: 1 });
assetCategorySchema.index({ firmId: 1, isActive: 1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════
assetCategorySchema.virtual('assets', {
    ref: 'Asset',
    localField: '_id',
    foreignField: 'assetCategory'
});

assetCategorySchema.virtual('subcategories', {
    ref: 'AssetCategory',
    localField: '_id',
    foreignField: 'parentCategory'
});

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
assetCategorySchema.pre('save', async function(next) {
    // Generate category ID
    if (this.isNew && !this.categoryId) {
        const Counter = mongoose.model('Counter');
        const seq = await Counter.getNextSequence(`assetCategory_${this.firmId || 'global'}`);
        this.categoryId = `ASSETCAT-${String(seq).padStart(5, '0')}`;
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get category tree
 */
assetCategorySchema.statics.getCategoryTree = async function(firmId = null) {
    const query = { parentCategory: null, isActive: true };
    if (firmId) query.firmId = firmId;

    const rootCategories = await this.find(query)
        .populate({
            path: 'subcategories',
            match: { isActive: true },
            populate: {
                path: 'subcategories',
                match: { isActive: true }
            }
        })
        .sort({ name: 1 });

    return rootCategories;
};

/**
 * Get asset count by category
 */
assetCategorySchema.statics.getAssetCounts = async function(firmId = null) {
    const Asset = mongoose.model('Asset');

    const matchStage = {};
    if (firmId) matchStage.firmId = new mongoose.Types.ObjectId(firmId);

    return await Asset.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$assetCategory',
                count: { $sum: 1 },
                totalValue: { $sum: '$currentValue' }
            }
        },
        {
            $lookup: {
                from: 'assetcategories',
                localField: '_id',
                foreignField: '_id',
                as: 'category'
            }
        },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                categoryId: '$_id',
                categoryName: '$category.name',
                count: 1,
                totalValue: 1,
                _id: 0
            }
        },
        { $sort: { count: -1 } }
    ]);
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get full category path
 */
assetCategorySchema.methods.getPath = async function() {
    const path = [this.name];
    let current = this;

    while (current.parentCategory) {
        current = await this.constructor.findById(current.parentCategory);
        if (current) {
            path.unshift(current.name);
        } else {
            break;
        }
    }

    return path.join(' > ');
};

/**
 * Check if category has assets
 */
assetCategorySchema.methods.hasAssets = async function() {
    const Asset = mongoose.model('Asset');
    const count = await Asset.countDocuments({ assetCategory: this._id });
    return count > 0;
};

/**
 * Check if category has subcategories
 */
assetCategorySchema.methods.hasSubcategories = async function() {
    const count = await this.constructor.countDocuments({ parentCategory: this._id });
    return count > 0;
};

// ═══════════════════════════════════════════════════════════════
// FIRM ISOLATION PLUGIN (RLS-like enforcement)
// ═══════════════════════════════════════════════════════════════
// Removed firmIsolationPlugin - using direct RLS queries instead

module.exports = mongoose.model('AssetCategory', assetCategorySchema);
