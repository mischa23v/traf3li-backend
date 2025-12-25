const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Asset Repair Model - Asset Repair/Service Log
 * Tracks repairs, services, and upgrades for assets
 */

const assetRepairSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // IDENTIFIERS
    // ═══════════════════════════════════════════════════════════════
    repairId: {
        type: String,
        unique: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // ASSET REFERENCE
    // ═══════════════════════════════════════════════════════════════
    assetId: {
        type: Schema.Types.ObjectId,
        ref: 'Asset',
        required: true,
        index: true
    },
    assetName: {
        type: String
    },

    // ═══════════════════════════════════════════════════════════════
    // REPAIR TYPE
    // ═══════════════════════════════════════════════════════════════
    repairType: {
        type: String,
        enum: ['repair', 'service', 'upgrade'],
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // DATES
    // ═══════════════════════════════════════════════════════════════
    failureDate: {
        type: Date,
        index: true
    },
    completionDate: {
        type: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // COST
    // ═══════════════════════════════════════════════════════════════
    repairCost: {
        type: Number,
        default: 0,
        min: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // DETAILS
    // ═══════════════════════════════════════════════════════════════
    description: {
        type: String,
        required: true,
        maxlength: 1000
    },
    actionsPerformed: {
        type: String,
        maxlength: 2000
    },

    // ═══════════════════════════════════════════════════════════════
    // VENDOR DETAILS
    // ═══════════════════════════════════════════════════════════════
    vendorId: {
        type: Schema.Types.ObjectId,
        ref: 'Vendor',
        index: true
    },
    vendorName: {
        type: String
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed'],
        default: 'pending',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANCY
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
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
assetRepairSchema.index({ assetId: 1, failureDate: -1 });
assetRepairSchema.index({ repairType: 1, status: 1 });
assetRepairSchema.index({ vendorId: 1 });
assetRepairSchema.index({ status: 1, failureDate: -1 });
assetRepairSchema.index({ firmId: 1, status: 1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════
assetRepairSchema.virtual('repairDuration').get(function() {
    if (!this.failureDate || !this.completionDate) return null;
    const diff = this.completionDate - this.failureDate;
    return Math.ceil(diff / (1000 * 60 * 60 * 24)); // Days
});

assetRepairSchema.virtual('isInProgress').get(function() {
    return this.status === 'in_progress';
});

assetRepairSchema.virtual('isCompleted').get(function() {
    return this.status === 'completed';
});

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
assetRepairSchema.pre('save', async function(next) {
    // Generate repair ID
    if (this.isNew && !this.repairId) {
        const Counter = mongoose.model('Counter');
        const seq = await Counter.getNextSequence(`assetRepair_${this.firmId || 'global'}`);
        this.repairId = `REP-${String(seq).padStart(6, '0')}`;
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get repair statistics
 */
assetRepairSchema.statics.getRepairStats = async function(filters = {}) {
    const matchStage = {};

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
    if (filters.assetId) matchStage.assetId = new mongoose.Types.ObjectId(filters.assetId);
    if (filters.repairType) matchStage.repairType = filters.repairType;
    if (filters.startDate || filters.endDate) {
        matchStage.failureDate = {};
        if (filters.startDate) matchStage.failureDate.$gte = new Date(filters.startDate);
        if (filters.endDate) matchStage.failureDate.$lte = new Date(filters.endDate);
    }

    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalRepairs: { $sum: 1 },
                totalCost: { $sum: '$repairCost' },
                pending: {
                    $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                },
                inProgress: {
                    $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
                },
                completed: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                avgCost: { $avg: '$repairCost' }
            }
        }
    ]);

    return stats[0] || {
        totalRepairs: 0,
        totalCost: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        avgCost: 0
    };
};

/**
 * Get repairs by type
 */
assetRepairSchema.statics.getRepairsByType = async function(filters = {}) {
    const matchStage = {};

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
    if (filters.startDate || filters.endDate) {
        matchStage.failureDate = {};
        if (filters.startDate) matchStage.failureDate.$gte = new Date(filters.startDate);
        if (filters.endDate) matchStage.failureDate.$lte = new Date(filters.endDate);
    }

    return await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$repairType',
                count: { $sum: 1 },
                totalCost: { $sum: '$repairCost' },
                completed: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                }
            }
        },
        {
            $project: {
                type: '$_id',
                count: 1,
                totalCost: 1,
                completed: 1,
                avgCost: { $divide: ['$totalCost', '$count'] },
                _id: 0
            }
        },
        { $sort: { count: -1 } }
    ]);
};

/**
 * Get asset repair history
 */
assetRepairSchema.statics.getAssetRepairHistory = async function(assetId) {
    return await this.find({ assetId })
        .populate('vendorId', 'name')
        .populate('createdBy', 'name')
        .sort({ failureDate: -1 });
};

/**
 * Get pending/in-progress repairs
 */
assetRepairSchema.statics.getActiveRepairs = async function(firmId = null) {
    const query = { status: { $in: ['pending', 'in_progress'] } };
    if (firmId) query.firmId = firmId;

    return await this.find(query)
        .populate('assetId', 'assetName assetNumber')
        .populate('vendorId', 'name')
        .sort({ failureDate: 1 });
};

/**
 * Get repairs by vendor
 */
assetRepairSchema.statics.getRepairsByVendor = async function(filters = {}) {
    const matchStage = {};

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
    if (filters.startDate || filters.endDate) {
        matchStage.failureDate = {};
        if (filters.startDate) matchStage.failureDate.$gte = new Date(filters.startDate);
        if (filters.endDate) matchStage.failureDate.$lte = new Date(filters.endDate);
    }

    return await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$vendorId',
                vendorName: { $first: '$vendorName' },
                count: { $sum: 1 },
                totalCost: { $sum: '$repairCost' },
                avgCost: { $avg: '$repairCost' }
            }
        },
        {
            $project: {
                vendorId: '$_id',
                vendorName: 1,
                count: 1,
                totalCost: 1,
                avgCost: 1,
                _id: 0
            }
        },
        { $sort: { totalCost: -1 } }
    ]);
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Start repair
 */
assetRepairSchema.methods.startRepair = async function(userId, session = null) {
    if (this.status !== 'pending') {
        throw new Error('Only pending repairs can be started');
    }

    this.status = 'in_progress';
    this.updatedBy = userId;

    // Update asset status
    const Asset = mongoose.model('Asset');
    const asset = await Asset.findById(this.assetId);
    if (asset) {
        asset.status = 'in_maintenance';
        const options = session ? { session } : {};
        await asset.save(options);
    }

    const options = session ? { session } : {};
    await this.save(options);

    return this;
};

/**
 * Complete repair
 */
assetRepairSchema.methods.completeRepair = async function(userId, actionsPerformed, session = null) {
    if (this.status !== 'in_progress') {
        throw new Error('Repair must be in progress to complete');
    }

    this.status = 'completed';
    this.completionDate = new Date();
    this.actionsPerformed = actionsPerformed;
    this.updatedBy = userId;

    // Update asset status back to active
    const Asset = mongoose.model('Asset');
    const asset = await Asset.findById(this.assetId);
    if (asset && asset.status === 'in_maintenance') {
        asset.status = 'submitted';
        const options = session ? { session } : {};
        await asset.save(options);
    }

    const options = session ? { session } : {};
    await this.save(options);

    return this;
};

/**
 * Cancel repair
 */
assetRepairSchema.methods.cancelRepair = async function(userId, session = null) {
    this.status = 'pending';
    this.updatedBy = userId;

    const options = session ? { session } : {};
    await this.save(options);

    return this;
};

// ═══════════════════════════════════════════════════════════════
// FIRM ISOLATION PLUGIN (RLS-like enforcement)
// ═══════════════════════════════════════════════════════════════
const firmIsolationPlugin = require('./plugins/firmIsolation.plugin');
assetRepairSchema.plugin(firmIsolationPlugin);

module.exports = mongoose.model('AssetRepair', assetRepairSchema);
