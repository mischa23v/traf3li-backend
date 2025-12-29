const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Item Group Model - Hierarchical Item Categorization
 *
 * Organizes items into categories and subcategories.
 */

const itemGroupSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
     },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ============ IDENTIFICATION ============
    itemGroupId: {
        type: String,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: [true, 'Item group name is required'],
        trim: true,
        maxlength: [200, 'Name cannot exceed 200 characters'],
        index: true
    },
    nameAr: {
        type: String,
        trim: true,
        maxlength: [200, 'Arabic name cannot exceed 200 characters']
    },

    // ============ HIERARCHY ============
    parentGroup: {
        type: Schema.Types.ObjectId,
        ref: 'ItemGroup',
        default: null,
        index: true
    },
    isGroup: {
        type: Boolean,
        default: false
    },

    // ============ SETTINGS ============
    disabled: {
        type: Boolean,
        default: false,
        index: true
    },

    // ============ DEFAULTS ============
    defaultTaxRate: {
        type: Number,
        min: 0,
        max: 100
    },
    defaultValuationMethod: {
        type: String,
        enum: ['fifo', 'moving_average', 'lifo']
    },

    // ============ AUDIT ============
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

// ============ INDEXES ============
itemGroupSchema.index({ firmId: 1, name: 1 }, { unique: true });
itemGroupSchema.index({ firmId: 1, parentGroup: 1 });

// ============ VIRTUALS ============
itemGroupSchema.virtual('children', {
    ref: 'ItemGroup',
    localField: '_id',
    foreignField: 'parentGroup'
});

// ============ STATICS ============
/**
 * Generate unique item group ID
 */
itemGroupSchema.statics.generateItemGroupId = async function() {
    const Counter = require('./counter.model');
    const seq = await Counter.getNextSequence('itemgroup');
    return `IG-${String(seq).padStart(6, '0')}`;
};

/**
 * Get item group hierarchy
 */
itemGroupSchema.statics.getHierarchy = async function(firmId = null) {
    const query = { disabled: false };
    if (firmId) {
        query.firmId = firmId;
    }

    const groups = await this.find(query).sort({ name: 1 }).lean();

    // Build tree structure
    const groupMap = {};
    const rootGroups = [];

    // First pass: create map
    groups.forEach((group) => {
        groupMap[group._id.toString()] = { ...group, children: [] };
    });

    // Second pass: build tree
    groups.forEach((group) => {
        const node = groupMap[group._id.toString()];
        if (group.parentGroup) {
            const parent = groupMap[group.parentGroup.toString()];
            if (parent) {
                parent.children.push(node);
            } else {
                rootGroups.push(node);
            }
        } else {
            rootGroups.push(node);
        }
    });

    return rootGroups;
};

// ============ PRE-SAVE MIDDLEWARE ============
itemGroupSchema.pre('save', async function(next) {
    try {
        // Auto-generate item group ID if not provided
        if (this.isNew && !this.itemGroupId) {
            this.itemGroupId = await this.constructor.generateItemGroupId();
        }

        next();
    } catch (error) {
        next(error);
    }
});

// ============ PRE-DELETE MIDDLEWARE ============
itemGroupSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
    try {
        // Check for child groups
        const childCount = await mongoose.model('ItemGroup').countDocuments({
            parentGroup: this._id
        });

        if (childCount > 0) {
            const error = new Error('Cannot delete item group with child groups');
            error.statusCode = 400;
            return next(error);
        }

        // Check for items in this group
        const Item = mongoose.model('Item');
        const itemCount = await Item.countDocuments({
            itemGroup: this.name
        });

        if (itemCount > 0) {
            const error = new Error('Cannot delete item group with items');
            error.statusCode = 400;
            return next(error);
        }

        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('ItemGroup', itemGroupSchema);
