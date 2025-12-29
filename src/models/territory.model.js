/**
 * Territory Model
 *
 * Represents sales/service territories with hierarchical structure.
 * Supports country, region, city, district levels with Saudi Arabia regional structure.
 * Multi-tenant with firmId isolation.
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

const targetSchema = new mongoose.Schema({
    year: { type: Number, required: true },
    quarter: { type: Number, min: 1, max: 4 },
    month: { type: Number, min: 1, max: 12 },
    annualRevenue: { type: Number, default: 0 },
    quarterlyRevenue: { type: Number, default: 0 },
    monthlyLeads: { type: Number, default: 0 },
    achievedRevenue: { type: Number, default: 0 },
    achievedLeads: { type: Number, default: 0 }
}, { _id: false });

const statsSchema = new mongoose.Schema({
    totalClients: { type: Number, default: 0 },
    totalLeads: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    pipelineValue: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const territorySchema = new mongoose.Schema({
    // Multi-tenancy
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
    // Identification
    territoryId: {
        type: String,
        unique: true,
        index: true
    },
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
    code: {
        type: String,
        trim: true,
        maxlength: 50
    },

    // Hierarchy
    parentTerritoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Territory',
        default: null,
        index: true
    },
    level: {
        type: Number,
        default: 0,
        min: 0,
        max: 10
    },
    path: {
        type: String,
        default: ''
    },
    isGroup: {
        type: Boolean,
        default: false
    },

    // Type and Classification
    type: {
        type: String,
        enum: ['country', 'region', 'city', 'district', 'custom'],
        default: 'custom',
        index: true
    },

    // Saudi Arabia Regional Structure (13 regions)
    saudiRegion: {
        type: String,
        enum: [
            'riyadh',           // الرياض
            'makkah',           // مكة المكرمة
            'madinah',          // المدينة المنورة
            'eastern',          // الشرقية
            'asir',             // عسير
            'tabuk',            // تبوك
            'hail',             // حائل
            'northern_borders', // الحدود الشمالية
            'jazan',            // جازان
            'najran',           // نجران
            'bahah',            // الباحة
            'jawf',             // الجوف
            'qassim'            // القصيم
        ]
    },

    // Geographic Coverage
    countries: [{
        type: String,
        trim: true,
        uppercase: true,
        maxlength: 3  // ISO 3166-1 alpha-3
    }],
    cities: [{
        type: String,
        trim: true,
        maxlength: 100
    }],
    postalCodes: [{
        type: String,
        trim: true,
        maxlength: 20
    }],

    // Management
    managerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    salesTeamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SalesTeam'
    },
    assignedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // Targets and Performance
    targets: [targetSchema],
    stats: {
        type: statsSchema,
        default: () => ({})
    },

    // Status
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    // Audit
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

territorySchema.index({ firmId: 1, name: 1 });
territorySchema.index({ firmId: 1, type: 1, isActive: 1 });
territorySchema.index({ firmId: 1, parentTerritoryId: 1 });
territorySchema.index({ firmId: 1, managerId: 1 });
territorySchema.index({ firmId: 1, saudiRegion: 1 });
territorySchema.index({ firmId: 1, level: 1, isActive: 1 });
territorySchema.index({ firmId: 1, assignedUsers: 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

territorySchema.pre('save', async function(next) {
    try {
        // Auto-generate territoryId if not provided
        if (this.isNew && !this.territoryId) {
            const Counter = require('./counter.model');
            const counterId = `territory_${this.firmId}`;
            const seq = await Counter.getNextSequence(counterId);
            this.territoryId = `TERR-${String(seq).padStart(4, '0')}`;
        }

        // Calculate level and path from parent
        if (this.isModified('parentTerritoryId') || this.isNew) {
            if (this.parentTerritoryId) {
                const parent = await mongoose.model('Territory').findOne({
                    _id: this.parentTerritoryId,
                    firmId: this.firmId
                });
                if (parent) {
                    this.level = parent.level + 1;
                    this.path = parent.path ? `${parent.path}/${this._id}` : this._id.toString();
                }
            } else {
                this.level = 0;
                this.path = this._id.toString();
            }
        }

        // Check if this territory has children
        if (!this.isNew && this.isModified('isGroup') === false) {
            const childCount = await mongoose.model('Territory').countDocuments({
                parentTerritoryId: this._id,
                firmId: this.firmId
            });
            this.isGroup = childCount > 0;
        }

        next();
    } catch (error) {
        next(error);
    }
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all territories for a firm
 * @param {ObjectId} firmId - Firm ID (REQUIRED for multi-tenant isolation)
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of territories
 */
territorySchema.statics.getTerritories = async function(firmId, filters = {}) {
    if (!firmId) throw new Error('firmId is required');

    const query = { firmId, ...filters };

    return this.find(query)
        .populate('managerId', 'firstName lastName avatar email')
        .populate('salesTeamId', 'name nameAr')
        .populate('assignedUsers', 'firstName lastName avatar')
        .populate('parentTerritoryId', 'name nameAr territoryId')
        .sort({ level: 1, name: 1 })
        .lean();
};

/**
 * Get territory tree structure
 * @param {ObjectId} firmId - Firm ID (REQUIRED for multi-tenant isolation)
 * @param {Boolean} activeOnly - Only return active territories
 * @returns {Promise<Array>} Tree structure
 */
territorySchema.statics.getTree = async function(firmId, activeOnly = true) {
    if (!firmId) throw new Error('firmId is required');

    const query = { firmId };
    if (activeOnly) {
        query.isActive = true;
    }

    const territories = await this.find(query)
        .populate('managerId', 'firstName lastName avatar email')
        .populate('salesTeamId', 'name nameAr')
        .populate('assignedUsers', 'firstName lastName avatar')
        .sort({ level: 1, name: 1 })
        .lean();

    // Build tree structure
    const map = {};
    const roots = [];

    territories.forEach(territory => {
        map[territory._id.toString()] = { ...territory, children: [] };
    });

    territories.forEach(territory => {
        const parentId = territory.parentTerritoryId?.toString();
        if (parentId && map[parentId]) {
            map[parentId].children.push(map[territory._id.toString()]);
        } else {
            roots.push(map[territory._id.toString()]);
        }
    });

    return roots;
};

/**
 * Get children of a territory
 * @param {ObjectId} territoryId - Territory ID
 * @param {ObjectId} firmId - Firm ID (REQUIRED for multi-tenant isolation)
 * @returns {Promise<Array>} Array of child territories
 */
territorySchema.statics.getChildren = async function(territoryId, firmId) {
    if (!firmId) throw new Error('firmId is required');

    return this.find({
        parentTerritoryId: territoryId,
        firmId,
        isActive: true
    })
        .populate('managerId', 'firstName lastName avatar')
        .populate('assignedUsers', 'firstName lastName avatar')
        .sort({ name: 1 });
};

/**
 * Assign users to a territory
 * @param {ObjectId} territoryId - Territory ID
 * @param {ObjectId} firmId - Firm ID (REQUIRED for multi-tenant isolation)
 * @param {Array<ObjectId>} userIds - Array of user IDs to assign
 * @returns {Promise<Object>} Updated territory
 */
territorySchema.statics.assignToTerritory = async function(territoryId, firmId, userIds) {
    if (!firmId) throw new Error('firmId is required');

    return this.findOneAndUpdate(
        { _id: territoryId, firmId },
        { $addToSet: { assignedUsers: { $each: userIds } } },
        { new: true }
    ).populate('assignedUsers', 'firstName lastName avatar email');
};

/**
 * Update territory statistics
 * @param {ObjectId} territoryId - Territory ID
 * @param {ObjectId} firmId - Firm ID (REQUIRED for multi-tenant isolation)
 * @param {Object} stats - Stats object
 * @returns {Promise<Object>} Updated territory
 */
territorySchema.statics.updateStats = async function(territoryId, firmId, stats) {
    if (!firmId) throw new Error('firmId is required');

    return this.findOneAndUpdate(
        { _id: territoryId, firmId },
        {
            $set: {
                'stats.totalClients': stats.totalClients || 0,
                'stats.totalLeads': stats.totalLeads || 0,
                'stats.totalRevenue': stats.totalRevenue || 0,
                'stats.pipelineValue': stats.pipelineValue || 0,
                'stats.lastUpdated': new Date()
            }
        },
        { new: true }
    );
};

/**
 * Get territories by manager
 * @param {ObjectId} managerId - Manager user ID
 * @param {ObjectId} firmId - Firm ID (REQUIRED for multi-tenant isolation)
 * @returns {Promise<Array>} Array of territories
 */
territorySchema.statics.getByManager = async function(managerId, firmId) {
    if (!firmId) throw new Error('firmId is required');

    return this.find({
        managerId,
        firmId,
        isActive: true
    }).populate('assignedUsers', 'firstName lastName avatar');
};

/**
 * Get territories by Saudi region
 * @param {String} region - Saudi region code
 * @param {ObjectId} firmId - Firm ID (REQUIRED for multi-tenant isolation)
 * @returns {Promise<Array>} Array of territories
 */
territorySchema.statics.getBySaudiRegion = async function(region, firmId) {
    if (!firmId) throw new Error('firmId is required');

    return this.find({
        saudiRegion: region,
        firmId,
        isActive: true
    }).sort({ name: 1 });
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all descendants (children, grandchildren, etc.)
 * @returns {Promise<Array>} Array of descendant territories
 */
territorySchema.methods.getDescendants = async function() {
    const allTerritories = await mongoose.model('Territory').find({
        firmId: this.firmId,
        isActive: true
    }).lean();

    const descendants = [];
    const findDescendants = (parentId) => {
        allTerritories.forEach(territory => {
            if (territory.parentTerritoryId?.toString() === parentId.toString()) {
                descendants.push(territory);
                findDescendants(territory._id);
            }
        });
    };

    findDescendants(this._id);
    return descendants;
};

/**
 * Get all ancestors (parent, grandparent, etc.)
 * @returns {Promise<Array>} Array of ancestor territories
 */
territorySchema.methods.getAncestors = async function() {
    const ancestors = [];
    let currentId = this.parentTerritoryId;

    while (currentId) {
        const parent = await mongoose.model('Territory').findOne({
            _id: currentId,
            firmId: this.firmId
        }).lean();

        if (!parent) break;

        ancestors.push(parent);
        currentId = parent.parentTerritoryId;
    }

    return ancestors;
};

/**
 * Check if territory contains a location
 * @param {Object} location - Location object with country, city, postalCode
 * @returns {Boolean} True if location is in territory
 */
territorySchema.methods.containsLocation = function(location) {
    if (location.country && this.countries.length > 0) {
        if (!this.countries.includes(location.country.toUpperCase())) {
            return false;
        }
    }

    if (location.city && this.cities.length > 0) {
        if (!this.cities.some(city =>
            city.toLowerCase() === location.city.toLowerCase()
        )) {
            return false;
        }
    }

    if (location.postalCode && this.postalCodes.length > 0) {
        if (!this.postalCodes.includes(location.postalCode)) {
            return false;
        }
    }

    return true;
};

/**
 * Get target for a specific period
 * @param {Number} year - Target year
 * @param {Number} quarter - Optional quarter (1-4)
 * @param {Number} month - Optional month (1-12)
 * @returns {Object} Target data
 */
territorySchema.methods.getTarget = function(year, quarter = null, month = null) {
    if (month) {
        return this.targets.find(t => t.year === year && t.month === month);
    }
    if (quarter) {
        return this.targets.find(t => t.year === year && t.quarter === quarter);
    }
    return this.targets.find(t => t.year === year && !t.quarter && !t.month);
};

module.exports = mongoose.model('Territory', territorySchema);
