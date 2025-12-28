const mongoose = require('mongoose');

/**
 * Cost Center Model - Enables dimensional reporting like ERPNext
 * Track expenses and revenue by department, project, location, practice area
 */
const costCenterSchema = new mongoose.Schema({
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },,

    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    code: {
        type: String,
        required: [true, 'Cost center code is required'],
        trim: true,
        uppercase: true,
        maxlength: 20
    },
    name: {
        type: String,
        required: [true, 'Cost center name is required'],
        trim: true,
        maxlength: 100
    },
    nameAr: {
        type: String,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    descriptionAr: {
        type: String,
        trim: true,
        maxlength: 500
    },
    type: {
        type: String,
        required: [true, 'Cost center type is required'],
        enum: ['department', 'project', 'location', 'practice_area', 'custom'],
        index: true
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CostCenter',
        default: null,
        index: true
    },
    isActive: {
        type: Boolean,
        default: true,
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
    budgetAllocationPercentage: {
        type: Number,
        min: 0,
        max: 100,
        default: null
    },
    annualBudget: {
        type: Number,
        min: 0,
        default: null
    },
    managerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    budgetYear: {
        type: Number,
        default: null
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        default: null
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        default: null
    },
    meta: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 1000
    },
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
costCenterSchema.index({ firmId: 1, code: 1 }, { unique: true });
costCenterSchema.index({ type: 1, isActive: 1 });
costCenterSchema.index({ parentId: 1, isActive: 1 });
costCenterSchema.index({ path: 1 });
costCenterSchema.index({ managerId: 1 });
costCenterSchema.index({ caseId: 1 });
costCenterSchema.index({ firmId: 1, type: 1, isActive: 1 });

// Virtual: Get children cost centers
costCenterSchema.virtual('children', {
    ref: 'CostCenter',
    localField: '_id',
    foreignField: 'parentId'
});

// Pre-save: Calculate level and path
costCenterSchema.pre('save', async function(next) {
    if (this.isModified('parentId')) {
        if (this.parentId) {
            const parent = await mongoose.model('CostCenter').findById(this.parentId);
            if (parent) {
                this.level = parent.level + 1;
                this.path = parent.path + parent._id.toString() + '/';
            } else {
                this.level = 0;
                this.path = '';
            }
        } else {
            this.level = 0;
            this.path = '';
        }
    }
    next();
});

// Pre-delete: Validate deletion rules
costCenterSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
    const childCount = await mongoose.model('CostCenter').countDocuments({ parentId: this._id });
    if (childCount > 0) {
        const error = new Error('Cannot delete cost center with child cost centers');
        error.statusCode = 400;
        return next(error);
    }

    const GeneralLedger = mongoose.model('GeneralLedger');
    const glCount = await GeneralLedger.countDocuments({
        costCenterId: this._id,
        status: { $ne: 'void' }
    });
    if (glCount > 0) {
        const error = new Error('Cannot delete cost center with transactions');
        error.statusCode = 400;
        return next(error);
    }

    next();
});

// Static: Get hierarchy as nested tree
costCenterSchema.statics.getHierarchy = async function(options = {}) {
    const { firmId, type, isActive = true, managerId } = options;

    const query = {};
    if (firmId) query.firmId = firmId;
    if (type) query.type = type;
    if (isActive !== null) query.isActive = isActive;
    if (managerId) query.managerId = managerId;

    const costCenters = await this.find(query).sort({ code: 1 }).lean();

    const costCenterMap = {};
    const rootCostCenters = [];

    costCenters.forEach(cc => {
        costCenterMap[cc._id.toString()] = { ...cc, children: [] };
    });

    costCenters.forEach(cc => {
        const node = costCenterMap[cc._id.toString()];
        if (cc.parentId) {
            const parent = costCenterMap[cc.parentId.toString()];
            if (parent) {
                parent.children.push(node);
            } else {
                rootCostCenters.push(node);
            }
        } else {
            rootCostCenters.push(node);
        }
    });

    return rootCostCenters;
};

// Static: Get by type
costCenterSchema.statics.getByType = function(type, firmId = null, isActive = true) {
    const query = { type };
    if (firmId) query.firmId = firmId;
    if (isActive !== null) query.isActive = isActive;
    return this.find(query).sort({ code: 1 });
};

// Static: Find by code
costCenterSchema.statics.findByCode = function(code, firmId = null) {
    const query = { code: code.toUpperCase() };
    if (firmId) query.firmId = firmId;
    return this.findOne(query);
};

// Instance: Check if can be deleted
costCenterSchema.methods.canDelete = async function() {
    const childCount = await mongoose.model('CostCenter').countDocuments({ parentId: this._id });
    if (childCount > 0) {
        return { canDelete: false, reason: 'Cost center has child cost centers' };
    }

    try {
        const GeneralLedger = mongoose.model('GeneralLedger');
        const glCount = await GeneralLedger.countDocuments({
            costCenterId: this._id,
            status: { $ne: 'void' }
        });
        if (glCount > 0) {
            return { canDelete: false, reason: 'Cost center has transactions' };
        }
    } catch (e) {
        // GL model might not have costCenterId yet
    }

    return { canDelete: true };
};

// Instance: Get balance summary
costCenterSchema.methods.getBalanceSummary = async function(startDate = null, endDate = null) {
    const GeneralLedger = mongoose.model('GeneralLedger');

    const dateFilter = {};
    if (startDate || endDate) {
        dateFilter.transactionDate = {};
        if (startDate) dateFilter.transactionDate.$gte = new Date(startDate);
        if (endDate) dateFilter.transactionDate.$lte = new Date(endDate);
    }

    const matchStage = {
        costCenterId: this._id,
        status: 'posted',
        ...dateFilter
    };

    const transactionCount = await GeneralLedger.countDocuments(matchStage);

    const summary = await GeneralLedger.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalAmount: { $sum: '$amount' }
            }
        }
    ]);

    return {
        costCenterId: this._id,
        costCenterCode: this.code,
        costCenterName: this.name,
        transactionCount,
        totalAmount: summary[0]?.totalAmount || 0,
        period: {
            startDate: startDate || 'inception',
            endDate: endDate || new Date()
        }
    };
};

const CostCenter = mongoose.model('CostCenter', costCenterSchema);

module.exports = CostCenter;
