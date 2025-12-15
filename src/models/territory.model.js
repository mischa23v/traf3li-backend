/**
 * Territory Model
 *
 * Represents sales territories for CRM.
 * Supports hierarchical structure with parent-child relationships.
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

const targetSchema = new mongoose.Schema({
    year: { type: Number, required: true },
    quarter: { type: Number, min: 1, max: 4 },
    targetAmount: { type: Number, default: 0 },
    achievedAmount: { type: Number, default: 0 }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const territorySchema = new mongoose.Schema({
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
        maxlength: 100
    },
    nameAr: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    slug: {
        type: String,
        trim: true,
        lowercase: true
    },

    parentTerritoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Territory',
        default: null,
        index: true
    },
    isGroup: {
        type: Boolean,
        default: false
    },
    level: {
        type: Number,
        default: 0,
        min: 0
    },
    path: {
        type: String,
        default: ''
    },

    managerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SalesPerson'
    },

    targets: [targetSchema],

    enabled: {
        type: Boolean,
        default: true,
        index: true
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

territorySchema.index({ firmId: 1, slug: 1 }, { unique: true });
territorySchema.index({ firmId: 1, parentTerritoryId: 1 });
territorySchema.index({ firmId: 1, path: 1 });
territorySchema.index({ firmId: 1, enabled: 1, level: 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

territorySchema.pre('save', async function(next) {
    // Generate slug from name if not provided
    if (!this.slug && this.name) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }

    // Calculate level and path from parent
    if (this.isModified('parentTerritoryId') || this.isNew) {
        if (this.parentTerritoryId) {
            const parent = await mongoose.model('Territory').findById(this.parentTerritoryId);
            if (parent) {
                this.level = parent.level + 1;
                this.path = parent.path ? `${parent.path}/${this.slug}` : this.slug;
            }
        } else {
            this.level = 0;
            this.path = this.slug;
        }
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get territory tree structure
 * @param {ObjectId} firmId - Firm ID
 * @param {Boolean} enabledOnly - Only return enabled territories
 * @returns {Promise<Array>} Tree structure
 */
territorySchema.statics.getTree = async function(firmId, enabledOnly = true) {
    const query = { firmId };
    if (enabledOnly) {
        query.enabled = true;
    }

    const territories = await this.find(query)
        .sort({ level: 1, name: 1 })
        .populate('managerId', 'name nameAr')
        .lean();

    // Build tree structure
    const map = {};
    const roots = [];

    territories.forEach(t => {
        map[t._id.toString()] = { ...t, children: [] };
    });

    territories.forEach(t => {
        const parentId = t.parentTerritoryId?.toString();
        if (parentId && map[parentId]) {
            map[parentId].children.push(map[t._id.toString()]);
        } else {
            roots.push(map[t._id.toString()]);
        }
    });

    return roots;
};

/**
 * Get all child territories (descendants)
 * @param {ObjectId} territoryId - Parent territory ID
 * @returns {Promise<Array>} Array of child territories
 */
territorySchema.statics.getChildren = async function(territoryId) {
    const territory = await this.findById(territoryId);
    if (!territory) return [];

    return this.find({
        firmId: territory.firmId,
        path: { $regex: `^${territory.path}/` }
    }).sort({ level: 1, name: 1 });
};

/**
 * Update target achievement
 * @param {ObjectId} territoryId - Territory ID
 * @param {Number} year - Target year
 * @param {Number} amount - Amount to add to achievement
 * @param {Number} quarter - Optional quarter (1-4)
 */
territorySchema.statics.updateAchievement = async function(territoryId, year, amount, quarter = null) {
    const query = {
        _id: territoryId,
        'targets.year': year
    };

    if (quarter) {
        query['targets.quarter'] = quarter;
    }

    await this.findOneAndUpdate(query, {
        $inc: { 'targets.$.achievedAmount': amount }
    });
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get target for a specific year and optional quarter
 * @param {Number} year - Target year
 * @param {Number} quarter - Optional quarter (1-4)
 * @returns {Object} Target data
 */
territorySchema.methods.getTarget = function(year, quarter = null) {
    if (quarter) {
        return this.targets.find(t => t.year === year && t.quarter === quarter);
    }
    return this.targets.find(t => t.year === year && !t.quarter);
};

/**
 * Get achievement percentage
 * @param {Number} year - Target year
 * @param {Number} quarter - Optional quarter
 * @returns {Number} Achievement percentage
 */
territorySchema.methods.getAchievementPercentage = function(year, quarter = null) {
    const target = this.getTarget(year, quarter);
    if (!target || target.targetAmount === 0) return 0;
    return Math.round((target.achievedAmount / target.targetAmount) * 100);
};

module.exports = mongoose.model('Territory', territorySchema);
