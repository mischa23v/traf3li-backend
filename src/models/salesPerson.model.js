/**
 * Sales Person Model
 *
 * Represents sales team members for CRM.
 * Supports hierarchical structure and target tracking.
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

const targetSchema = new mongoose.Schema({
    year: { type: Number, required: true },
    quarter: { type: Number, min: 1, max: 4 },
    month: { type: Number, min: 1, max: 12 },
    targetAmount: { type: Number, default: 0 },
    achievedAmount: { type: Number, default: 0 },
    targetLeads: { type: Number, default: 0 },
    achievedLeads: { type: Number, default: 0 },
    targetCases: { type: Number, default: 0 },
    achievedCases: { type: Number, default: 0 }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const salesPersonSchema = new mongoose.Schema({
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

    parentSalesPersonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SalesPerson',
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

    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    commissionRate: {
        type: Number,
        default: 5,
        min: 0,
        max: 100
    },

    territoryIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Territory'
    }],

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

salesPersonSchema.index({ firmId: 1, userId: 1 });
salesPersonSchema.index({ firmId: 1, territoryIds: 1 });
salesPersonSchema.index({ firmId: 1, enabled: 1, parentSalesPersonId: 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

salesPersonSchema.pre('save', async function(next) {
    // Calculate level and path from parent
    if (this.isModified('parentSalesPersonId') || this.isNew) {
        if (this.parentSalesPersonId) {
            const parent = await mongoose.model('SalesPerson').findById(this.parentSalesPersonId);
            if (parent) {
                this.level = parent.level + 1;
                this.path = parent.path ? `${parent.path}/${this._id}` : this._id.toString();
            }
        } else {
            this.level = 0;
            this.path = this._id.toString();
        }
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get sales person tree structure
 * @param {ObjectId} firmId - Firm ID
 * @param {Boolean} enabledOnly - Only return enabled sales persons
 * @returns {Promise<Array>} Tree structure
 */
salesPersonSchema.statics.getTree = async function(firmId, enabledOnly = true) {
    const query = { firmId };
    if (enabledOnly) {
        query.enabled = true;
    }

    const salesPersons = await this.find(query)
        .sort({ level: 1, name: 1 })
        .populate('userId', 'firstName lastName avatar email')
        .populate('territoryIds', 'name nameAr')
        .lean();

    // Build tree structure
    const map = {};
    const roots = [];

    salesPersons.forEach(sp => {
        map[sp._id.toString()] = { ...sp, children: [] };
    });

    salesPersons.forEach(sp => {
        const parentId = sp.parentSalesPersonId?.toString();
        if (parentId && map[parentId]) {
            map[parentId].children.push(map[sp._id.toString()]);
        } else {
            roots.push(map[sp._id.toString()]);
        }
    });

    return roots;
};

/**
 * Get sales person by user ID
 * @param {ObjectId} firmId - Firm ID
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} Sales person document
 */
salesPersonSchema.statics.getByUserId = async function(firmId, userId) {
    return this.findOne({ firmId, userId, enabled: true })
        .populate('territoryIds', 'name nameAr');
};

/**
 * Get subordinates (direct reports)
 * @param {ObjectId} salesPersonId - Sales person ID
 * @returns {Promise<Array>} Array of subordinates
 */
salesPersonSchema.statics.getSubordinates = async function(salesPersonId) {
    return this.find({
        parentSalesPersonId: salesPersonId,
        enabled: true
    }).populate('userId', 'firstName lastName avatar');
};

/**
 * Update target achievements
 * @param {ObjectId} salesPersonId - Sales person ID
 * @param {Object} params - Parameters
 */
salesPersonSchema.statics.updateAchievements = async function(salesPersonId, params) {
    const {
        year,
        quarter,
        month,
        addWonCase = false,
        addWonValue = 0,
        addLead = false
    } = params;

    const updates = {};
    if (addWonCase) {
        updates['targets.$.achievedCases'] = 1;
    }
    if (addWonValue) {
        updates['targets.$.achievedAmount'] = addWonValue;
    }
    if (addLead) {
        updates['targets.$.achievedLeads'] = 1;
    }

    const query = {
        _id: salesPersonId,
        'targets.year': year
    };

    if (month) {
        query['targets.month'] = month;
    } else if (quarter) {
        query['targets.quarter'] = quarter;
    }

    if (Object.keys(updates).length > 0) {
        await this.findOneAndUpdate(query, { $inc: updates });
    }
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get target for a specific period
 * @param {Number} year - Target year
 * @param {Number} quarter - Optional quarter (1-4)
 * @param {Number} month - Optional month (1-12)
 * @returns {Object} Target data
 */
salesPersonSchema.methods.getTarget = function(year, quarter = null, month = null) {
    if (month) {
        return this.targets.find(t => t.year === year && t.month === month);
    }
    if (quarter) {
        return this.targets.find(t => t.year === year && t.quarter === quarter);
    }
    return this.targets.find(t => t.year === year && !t.quarter && !t.month);
};

/**
 * Calculate commission amount
 * @param {Number} wonValue - Won case value
 * @returns {Number} Commission amount
 */
salesPersonSchema.methods.calculateCommission = function(wonValue) {
    return Math.round(wonValue * (this.commissionRate / 100));
};

/**
 * Check if sales person manages a territory
 * @param {ObjectId} territoryId - Territory ID
 * @returns {Boolean} True if manages territory
 */
salesPersonSchema.methods.managesTerritory = function(territoryId) {
    return this.territoryIds.some(
        tid => tid.toString() === territoryId.toString()
    );
};

module.exports = mongoose.model('SalesPerson', salesPersonSchema);
