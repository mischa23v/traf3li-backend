const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Asset Movement Model - Asset Transfer & Movement Tracking
 * Tracks asset movements between locations, custodians, and departments
 */

const assetMovementSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // IDENTIFIERS
    // ═══════════════════════════════════════════════════════════════
    movementId: {
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
    // MOVEMENT TYPE
    // ═══════════════════════════════════════════════════════════════
    movementType: {
        type: String,
        enum: ['transfer', 'issue', 'receipt'],
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // TRANSACTION DATE
    // ═══════════════════════════════════════════════════════════════
    transactionDate: {
        type: Date,
        default: Date.now,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // LOCATION DETAILS
    // ═══════════════════════════════════════════════════════════════
    sourceLocation: {
        type: String,
        trim: true
    },
    targetLocation: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // CUSTODIAN DETAILS
    // ═══════════════════════════════════════════════════════════════
    fromCustodian: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    toCustodian: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // DEPARTMENT DETAILS
    // ═══════════════════════════════════════════════════════════════
    fromDepartment: {
        type: String
    },
    toDepartment: {
        type: String
    },

    // ═══════════════════════════════════════════════════════════════
    // MOVEMENT DETAILS
    // ═══════════════════════════════════════════════════════════════
    reason: {
        type: String,
        maxlength: 500
    },
    remarks: {
        type: String,
        maxlength: 1000
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS & APPROVAL
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed'],
        default: 'pending',
        index: true
    },
    approvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    approvalDate: {
        type: Date
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
assetMovementSchema.index({ assetId: 1, transactionDate: -1 });
assetMovementSchema.index({ movementType: 1, status: 1 });
assetMovementSchema.index({ fromCustodian: 1 });
assetMovementSchema.index({ toCustodian: 1 });
assetMovementSchema.index({ transactionDate: -1 });
assetMovementSchema.index({ firmId: 1, status: 1 });
assetMovementSchema.index({ status: 1, transactionDate: -1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════
assetMovementSchema.virtual('isPending').get(function() {
    return this.status === 'pending';
});

assetMovementSchema.virtual('isCompleted').get(function() {
    return this.status === 'completed';
});

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
assetMovementSchema.pre('save', async function(next) {
    // Generate movement ID (AM-YYYYMMDD-XXXX)
    if (this.isNew && !this.movementId) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        const count = await this.constructor.countDocuments({
            createdAt: {
                $gte: new Date(year, date.getMonth(), date.getDate()),
                $lt: new Date(year, date.getMonth(), date.getDate() + 1)
            }
        });

        this.movementId = `AM-${year}${month}${day}-${String(count + 1).padStart(4, '0')}`;
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get movement statistics
 */
assetMovementSchema.statics.getMovementStats = async function(filters = {}) {
    const matchStage = {};

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
    if (filters.assetId) matchStage.assetId = new mongoose.Types.ObjectId(filters.assetId);
    if (filters.startDate || filters.endDate) {
        matchStage.transactionDate = {};
        if (filters.startDate) matchStage.transactionDate.$gte = new Date(filters.startDate);
        if (filters.endDate) matchStage.transactionDate.$lte = new Date(filters.endDate);
    }

    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalMovements: { $sum: 1 },
                pending: {
                    $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                },
                approved: {
                    $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
                },
                completed: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                rejected: {
                    $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
                }
            }
        }
    ]);

    return stats[0] || {
        totalMovements: 0,
        pending: 0,
        approved: 0,
        completed: 0,
        rejected: 0
    };
};

/**
 * Get movements by type
 */
assetMovementSchema.statics.getMovementsByType = async function(filters = {}) {
    const matchStage = {};

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
    if (filters.startDate || filters.endDate) {
        matchStage.transactionDate = {};
        if (filters.startDate) matchStage.transactionDate.$gte = new Date(filters.startDate);
        if (filters.endDate) matchStage.transactionDate.$lte = new Date(filters.endDate);
    }

    return await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$movementType',
                count: { $sum: 1 },
                completed: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                }
            }
        },
        {
            $project: {
                type: '$_id',
                count: 1,
                completed: 1,
                _id: 0
            }
        },
        { $sort: { count: -1 } }
    ]);
};

/**
 * Get pending movements
 */
assetMovementSchema.statics.getPendingMovements = async function(firmId = null) {
    const query = { status: 'pending' };
    if (firmId) query.firmId = firmId;

    return await this.find(query)
        .populate('assetId', 'assetName assetNumber')
        .populate('fromCustodian', 'name')
        .populate('toCustodian', 'name')
        .sort({ transactionDate: -1 });
};

/**
 * Get asset movement history
 */
assetMovementSchema.statics.getAssetHistory = async function(assetId) {
    return await this.find({ assetId })
        .populate('fromCustodian', 'name')
        .populate('toCustodian', 'name')
        .populate('approvedBy', 'name')
        .populate('createdBy', 'name')
        .sort({ transactionDate: -1 });
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Approve movement
 */
assetMovementSchema.methods.approve = async function(userId, session = null) {
    if (this.status !== 'pending') {
        throw new Error('Only pending movements can be approved');
    }

    this.status = 'approved';
    this.approvedBy = userId;
    this.approvalDate = new Date();
    this.updatedBy = userId;

    const options = session ? { session } : {};
    await this.save(options);

    return this;
};

/**
 * Reject movement
 */
assetMovementSchema.methods.reject = async function(userId, remarks, session = null) {
    if (this.status !== 'pending') {
        throw new Error('Only pending movements can be rejected');
    }

    this.status = 'rejected';
    this.remarks = remarks;
    this.updatedBy = userId;

    const options = session ? { session } : {};
    await this.save(options);

    return this;
};

/**
 * Complete movement
 */
assetMovementSchema.methods.complete = async function(userId, session = null) {
    if (this.status !== 'approved' && this.status !== 'pending') {
        throw new Error('Movement must be approved before completion');
    }

    this.status = 'completed';
    this.updatedBy = userId;

    const options = session ? { session } : {};
    await this.save(options);

    // Update asset
    const Asset = mongoose.model('Asset');
    const asset = await Asset.findById(this.assetId);

    if (asset) {
        if (this.targetLocation) asset.location = this.targetLocation;
        if (this.toCustodian) asset.custodian = this.toCustodian;
        if (this.toDepartment) asset.department = this.toDepartment;

        await asset.save(options);
    }

    return this;
};

// ═══════════════════════════════════════════════════════════════
// FIRM ISOLATION PLUGIN (RLS-like enforcement)
// ═══════════════════════════════════════════════════════════════
// Removed firmIsolationPlugin - using direct RLS queries instead

module.exports = mongoose.model('AssetMovement', assetMovementSchema);
