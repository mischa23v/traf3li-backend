const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Asset Model - Fixed Asset Management
 * Tracks company assets with depreciation and maintenance
 */

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Insurance Details Sub-Schema
const insuranceDetailsSchema = new Schema({
    insurer: String,
    policyNo: String,
    startDate: Date,
    endDate: Date,
    insuredValue: {
        type: Number,
        default: 0
    }
}, { _id: false });

// Depreciation Schedule Entry Sub-Schema
const depreciationScheduleEntrySchema = new Schema({
    scheduleDate: {
        type: Date,
        required: true
    },
    depreciationAmount: {
        type: Number,
        default: 0
    },
    accumulatedDepreciation: {
        type: Number,
        default: 0
    },
    valueAfterDepreciation: {
        type: Number,
        default: 0
    },
    journalEntry: {
        type: Schema.Types.ObjectId,
        ref: 'JournalEntry'
    }
}, { _id: true });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const assetSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // IDENTIFIERS
    // ═══════════════════════════════════════════════════════════════
    assetId: {
        type: String,
        unique: true,
        index: true
    },
    assetNumber: {
        type: String,
        unique: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // BASIC INFORMATION
    // ═══════════════════════════════════════════════════════════════
    assetName: {
        type: String,
        required: true,
        trim: true
    },
    assetNameAr: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        maxlength: 1000
    },
    serialNo: {
        type: String,
        trim: true
    },
    image: {
        type: String
    },
    tags: [{
        type: String
    }],

    // ═══════════════════════════════════════════════════════════════
    // CATEGORY & CLASSIFICATION
    // ═══════════════════════════════════════════════════════════════
    assetCategory: {
        type: Schema.Types.ObjectId,
        ref: 'AssetCategory',
        index: true
    },
    itemId: {
        type: Schema.Types.ObjectId,
        ref: 'Item'
    },
    itemCode: {
        type: String
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['draft', 'submitted', 'partially_depreciated', 'fully_depreciated', 'sold', 'scrapped', 'in_maintenance'],
        default: 'draft',
        index: true
    },
    isExistingAsset: {
        type: Boolean,
        default: false
    },

    // ═══════════════════════════════════════════════════════════════
    // LOCATION & CUSTODIAN
    // ═══════════════════════════════════════════════════════════════
    location: {
        type: String,
        trim: true
    },
    custodian: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    custodianName: {
        type: String
    },
    department: {
        type: String
    },
    company: {
        type: String
    },

    // ═══════════════════════════════════════════════════════════════
    // PURCHASE DETAILS
    // ═══════════════════════════════════════════════════════════════
    purchaseDate: {
        type: Date,
        index: true
    },
    purchaseInvoiceId: {
        type: Schema.Types.ObjectId,
        ref: 'Invoice'
    },
    supplierId: {
        type: Schema.Types.ObjectId,
        ref: 'Vendor'
    },
    supplierName: {
        type: String
    },
    grossPurchaseAmount: {
        type: Number,
        required: true,
        min: 0
    },
    purchaseReceiptAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    currency: {
        type: String,
        default: 'SAR'
    },
    assetQuantity: {
        type: Number,
        default: 1,
        min: 1
    },
    availableForUseDate: {
        type: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // DEPRECIATION CONFIGURATION
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
    depreciationStartDate: {
        type: Date
    },
    expectedValueAfterUsefulLife: {
        type: Number,
        default: 0,
        min: 0
    },
    openingAccumulatedDepreciation: {
        type: Number,
        default: 0,
        min: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // CURRENT VALUES
    // ═══════════════════════════════════════════════════════════════
    currentValue: {
        type: Number,
        default: 0
    },
    accumulatedDepreciation: {
        type: Number,
        default: 0
    },
    valueAfterDepreciation: {
        type: Number,
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // WARRANTY
    // ═══════════════════════════════════════════════════════════════
    warrantyExpiryDate: {
        type: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // INSURANCE
    // ═══════════════════════════════════════════════════════════════
    insuranceDetails: insuranceDetailsSchema,

    // ═══════════════════════════════════════════════════════════════
    // SCHEDULES & HISTORY
    // ═══════════════════════════════════════════════════════════════
    maintenanceSchedule: [{
        type: Schema.Types.ObjectId,
        ref: 'MaintenanceSchedule'
    }],
    depreciationSchedule: [depreciationScheduleEntrySchema],
    movementHistory: [{
        type: Schema.Types.ObjectId,
        ref: 'AssetMovement'
    }],

    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANCY
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
     },


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
assetSchema.index({ assetName: 1 });
assetSchema.index({ assetCategory: 1, status: 1 });
assetSchema.index({ custodian: 1, status: 1 });
assetSchema.index({ department: 1 });
assetSchema.index({ status: 1, purchaseDate: -1 });
assetSchema.index({ firmId: 1, status: 1 });
assetSchema.index({ firmId: 1, assetCategory: 1 });
assetSchema.index({ warrantyExpiryDate: 1 });
assetSchema.index({ 'insuranceDetails.endDate': 1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════
assetSchema.virtual('isWarrantyExpired').get(function() {
    if (!this.warrantyExpiryDate) return null;
    return new Date() > this.warrantyExpiryDate;
});

assetSchema.virtual('isInsuranceExpired').get(function() {
    if (!this.insuranceDetails?.endDate) return null;
    return new Date() > this.insuranceDetails.endDate;
});

assetSchema.virtual('depreciationRate').get(function() {
    if (!this.totalNumberOfDepreciations || this.totalNumberOfDepreciations === 0) return 0;
    const depreciableAmount = this.grossPurchaseAmount - this.expectedValueAfterUsefulLife;
    return (depreciableAmount / this.totalNumberOfDepreciations);
});

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
assetSchema.pre('save', async function(next) {
    // Generate asset ID (AST-YYYYMMDD-XXXX)
    if (this.isNew && !this.assetId) {
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

        this.assetId = `AST-${year}${month}${day}-${String(count + 1).padStart(4, '0')}`;
    }

    // Generate asset number if not provided
    if (this.isNew && !this.assetNumber) {
        const Counter = mongoose.model('Counter');
        const seq = await Counter.getNextSequence(`asset_${this.firmId || 'global'}`);
        this.assetNumber = `ASSET-${String(seq).padStart(6, '0')}`;
    }

    // Calculate current value and accumulated depreciation
    if (this.isModified('grossPurchaseAmount') || this.isModified('openingAccumulatedDepreciation')) {
        this.currentValue = this.grossPurchaseAmount;
        this.accumulatedDepreciation = this.openingAccumulatedDepreciation || 0;
        this.valueAfterDepreciation = this.currentValue - this.accumulatedDepreciation;
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get asset statistics
 */
assetSchema.statics.getAssetStats = async function(filters = {}) {
    const matchStage = {};

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
    if (filters.assetCategory) matchStage.assetCategory = new mongoose.Types.ObjectId(filters.assetCategory);
    if (filters.department) matchStage.department = filters.department;
    if (filters.status) matchStage.status = filters.status;

    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalAssets: { $sum: 1 },
                totalValue: { $sum: '$currentValue' },
                totalDepreciation: { $sum: '$accumulatedDepreciation' },
                netValue: { $sum: '$valueAfterDepreciation' },
                inMaintenance: {
                    $sum: { $cond: [{ $eq: ['$status', 'in_maintenance'] }, 1, 0] }
                },
                fullyDepreciated: {
                    $sum: { $cond: [{ $eq: ['$status', 'fully_depreciated'] }, 1, 0] }
                }
            }
        }
    ]);

    return stats[0] || {
        totalAssets: 0,
        totalValue: 0,
        totalDepreciation: 0,
        netValue: 0,
        inMaintenance: 0,
        fullyDepreciated: 0
    };
};

/**
 * Get assets by category
 */
assetSchema.statics.getAssetsByCategory = async function(filters = {}) {
    const matchStage = {};

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);

    return await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$assetCategory',
                count: { $sum: 1 },
                totalValue: { $sum: '$currentValue' },
                netValue: { $sum: '$valueAfterDepreciation' }
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
                netValue: 1,
                _id: 0
            }
        },
        { $sort: { totalValue: -1 } }
    ]);
};

/**
 * Get expiring warranties
 */
assetSchema.statics.getExpiringWarranties = async function(daysAhead = 30, firmId = null) {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const query = {
        warrantyExpiryDate: {
            $gte: today,
            $lte: futureDate
        },
        status: { $in: ['submitted', 'partially_depreciated'] }
    };

    if (firmId) query.firmId = firmId;

    return await this.find(query)
        .populate('assetCategory', 'name')
        .populate('custodian', 'name')
        .sort({ warrantyExpiryDate: 1 });
};

/**
 * Get expiring insurance
 */
assetSchema.statics.getExpiringInsurance = async function(daysAhead = 30, firmId = null) {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const query = {
        'insuranceDetails.endDate': {
            $gte: today,
            $lte: futureDate
        },
        status: { $in: ['submitted', 'partially_depreciated'] }
    };

    if (firmId) query.firmId = firmId;

    return await this.find(query)
        .populate('assetCategory', 'name')
        .populate('custodian', 'name')
        .sort({ 'insuranceDetails.endDate': 1 });
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate depreciation for a period
 */
assetSchema.methods.calculateDepreciation = function() {
    if (!this.totalNumberOfDepreciations || this.totalNumberOfDepreciations === 0) {
        return 0;
    }

    const depreciableAmount = this.grossPurchaseAmount - this.expectedValueAfterUsefulLife;

    switch (this.depreciationMethod) {
        case 'straight_line':
            return depreciableAmount / this.totalNumberOfDepreciations;

        case 'double_declining_balance':
            const rate = (2 / this.totalNumberOfDepreciations);
            return this.valueAfterDepreciation * rate;

        case 'written_down_value':
            const wdvRate = (1 / this.totalNumberOfDepreciations);
            return this.valueAfterDepreciation * wdvRate;

        default:
            return depreciableAmount / this.totalNumberOfDepreciations;
    }
};

/**
 * Post depreciation entry
 */
assetSchema.methods.postDepreciation = async function(depreciationAmount, date = new Date(), session = null) {
    this.accumulatedDepreciation += depreciationAmount;
    this.valueAfterDepreciation = this.currentValue - this.accumulatedDepreciation;

    // Update status if fully depreciated
    if (this.valueAfterDepreciation <= this.expectedValueAfterUsefulLife) {
        this.status = 'fully_depreciated';
    } else if (this.status === 'draft' || this.status === 'submitted') {
        this.status = 'partially_depreciated';
    }

    // Add to depreciation schedule
    this.depreciationSchedule.push({
        scheduleDate: date,
        depreciationAmount,
        accumulatedDepreciation: this.accumulatedDepreciation,
        valueAfterDepreciation: this.valueAfterDepreciation
    });

    const options = session ? { session } : {};
    await this.save(options);

    return this;
};

/**
 * Transfer asset to new custodian/location
 */
assetSchema.methods.transfer = async function(transferData, session = null) {
    const AssetMovement = mongoose.model('AssetMovement');

    const movement = new AssetMovement({
        assetId: this._id,
        assetName: this.assetName,
        movementType: 'transfer',
        transactionDate: transferData.transactionDate || new Date(),
        sourceLocation: this.location,
        targetLocation: transferData.targetLocation,
        fromCustodian: this.custodian,
        toCustodian: transferData.toCustodian,
        fromDepartment: this.department,
        toDepartment: transferData.toDepartment,
        reason: transferData.reason,
        status: 'completed',
        firmId: this.firmId,
        createdBy: transferData.userId
    });

    const options = session ? { session } : {};
    await movement.save(options);

    // Update asset
    if (transferData.targetLocation) this.location = transferData.targetLocation;
    if (transferData.toCustodian) {
        this.custodian = transferData.toCustodian;
        this.custodianName = transferData.custodianName;
    }
    if (transferData.toDepartment) this.department = transferData.toDepartment;

    this.movementHistory.push(movement._id);
    await this.save(options);

    return movement;
};

// ═══════════════════════════════════════════════════════════════
// FIRM ISOLATION PLUGIN (RLS-like enforcement)
// ═══════════════════════════════════════════════════════════════
// Removed firmIsolationPlugin - using direct RLS queries instead

module.exports = mongoose.model('Asset', assetSchema);
