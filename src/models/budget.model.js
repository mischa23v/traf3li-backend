const mongoose = require('mongoose');

/**
 * Budget Model - Firm-wide financial budgeting
 * Enables budget vs actual variance analysis like ERPNext
 */
const budgetLineItemSchema = new mongoose.Schema({
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true
    },
    period: {
        type: Number, // 1-12 for months, 1-4 for quarters, null for annual
        min: 1,
        max: 12
    },
    budgetedAmount: {
        type: Number,
        required: true,
        min: 0
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CostCenter'
    },
    costCenterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CostCenter'
    },
    notes: String,
    varianceThreshold: {
        type: Number,
        min: 0,
        max: 100
    }
}, { _id: true });

const budgetSchema = new mongoose.Schema({
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
    budgetNumber: {
        type: String,
        unique: true
    },
    fiscalYear: {
        type: Number,
        required: [true, 'Fiscal year is required'],
        min: 2020,
        max: 2100
    },
    name: {
        type: String,
        required: [true, 'Budget name is required'],
        trim: true,
        maxlength: 200
    },
    nameAr: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    periodType: {
        type: String,
        enum: ['monthly', 'quarterly', 'annual'],
        default: 'annual'
    },
    status: {
        type: String,
        enum: ['draft', 'pending_approval', 'approved', 'rejected', 'closed'],
        default: 'draft',
        index: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CostCenter'
    },
    costCenterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CostCenter'
    },
    isMasterBudget: {
        type: Boolean,
        default: false
    },
    lineItems: [budgetLineItemSchema],
    varianceAlertThreshold: {
        type: Number,
        default: 10,
        min: 0,
        max: 100
    },
    varianceAlertType: {
        type: String,
        enum: ['percentage', 'amount'],
        default: 'percentage'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    submittedAt: Date,
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedAt: Date,
    rejectionReason: String,
    closedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    closedAt: Date,
    changeHistory: [{
        action: String,
        userId: mongoose.Schema.Types.ObjectId,
        timestamp: { type: Date, default: Date.now },
        previousStatus: String,
        newStatus: String,
        notes: String
    }],
    notes: String,
    attachments: [{
        fileName: String,
        fileUrl: String,
        uploadedAt: Date,
        uploadedBy: mongoose.Schema.Types.ObjectId
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
budgetSchema.index({ firmId: 1, fiscalYear: 1, status: 1 });
budgetSchema.index({ firmId: 1, fiscalYear: 1, departmentId: 1 });
budgetSchema.index({ firmId: 1, status: 1 });
budgetSchema.index({ 'lineItems.accountId': 1 });
budgetSchema.index({ 'lineItems.period': 1 });

// Virtuals
budgetSchema.virtual('totalBudgetedAmount').get(function() {
    return this.lineItems.reduce((sum, item) => sum + (item.budgetedAmount || 0), 0);
});

budgetSchema.virtual('lineItemCount').get(function() {
    return this.lineItems.length;
});

budgetSchema.virtual('isActive').get(function() {
    const now = new Date();
    return this.status === 'approved' &&
           this.startDate <= now &&
           this.endDate >= now;
});

// Pre-save: Auto-generate budget number
budgetSchema.pre('save', async function(next) {
    if (this.isNew && !this.budgetNumber) {
        const year = this.fiscalYear || new Date().getFullYear();
        const count = await mongoose.model('Budget').countDocuments({
            fiscalYear: year
        });
        this.budgetNumber = `BUD-${year}-${String(count + 1).padStart(5, '0')}`;
    }

    // Track status changes
    if (this.isModified('status') && !this.isNew) {
        this.changeHistory.push({
            action: 'status_change',
            previousStatus: this._previousStatus,
            newStatus: this.status,
            timestamp: new Date()
        });
    }

    next();
});

// Instance Methods
budgetSchema.methods.submit = function(userId) {
    if (this.status !== 'draft') {
        throw new Error('Only draft budgets can be submitted');
    }
    this._previousStatus = this.status;
    this.status = 'pending_approval';
    this.submittedBy = userId;
    this.submittedAt = new Date();
    return this.save();
};

budgetSchema.methods.approve = function(userId) {
    if (this.status !== 'pending_approval') {
        throw new Error('Only pending budgets can be approved');
    }
    this._previousStatus = this.status;
    this.status = 'approved';
    this.approvedBy = userId;
    this.approvedAt = new Date();
    return this.save();
};

budgetSchema.methods.reject = function(userId, reason) {
    if (this.status !== 'pending_approval') {
        throw new Error('Only pending budgets can be rejected');
    }
    this._previousStatus = this.status;
    this.status = 'rejected';
    this.rejectedBy = userId;
    this.rejectedAt = new Date();
    this.rejectionReason = reason;
    return this.save();
};

budgetSchema.methods.close = function(userId) {
    if (this.status !== 'approved') {
        throw new Error('Only approved budgets can be closed');
    }
    this._previousStatus = this.status;
    this.status = 'closed';
    this.closedBy = userId;
    this.closedAt = new Date();
    return this.save();
};

budgetSchema.methods.getBudgetForAccount = function(accountId, period = null) {
    return this.lineItems.filter(item => {
        const accountMatch = item.accountId.toString() === accountId.toString();
        const periodMatch = period === null || item.period === period;
        return accountMatch && periodMatch;
    }).reduce((sum, item) => sum + item.budgetedAmount, 0);
};

// Static Methods
budgetSchema.statics.getApprovedBudgetForYear = async function(fiscalYear, firmId) {
    return this.findOne({
        fiscalYear,
        firmId,
        status: 'approved',
        isMasterBudget: true
    }).populate('lineItems.accountId', 'code name type');
};

budgetSchema.statics.getBudgetByAccountAndPeriod = async function(accountId, period, options = {}) {
    const { fiscalYear, firmId } = options;

    const query = {
        status: 'approved',
        'lineItems.accountId': accountId
    };

    if (fiscalYear) query.fiscalYear = fiscalYear;
    if (firmId) query.firmId = firmId;

    const budgets = await this.find(query);

    let total = 0;
    for (const budget of budgets) {
        for (const item of budget.lineItems) {
            if (item.accountId.toString() === accountId.toString()) {
                if (period === null || item.period === period || item.period === null) {
                    total += item.budgetedAmount;
                }
            }
        }
    }

    return total;
};

budgetSchema.statics.getBudgetVsActual = async function(budgetId, upToDate = new Date()) {
    const budget = await this.findById(budgetId).populate('lineItems.accountId');
    if (!budget) throw new Error('Budget not found');

    const GeneralLedger = mongoose.model('GeneralLedger');
    const results = [];
    let totalBudgeted = 0;
    let totalActual = 0;

    for (const item of budget.lineItems) {
        const account = item.accountId;
        if (!account) continue;

        // Get actual from GL
        const glResult = await GeneralLedger.aggregate([
            {
                $match: {
                    status: 'posted',
                    transactionDate: {
                        $gte: budget.startDate,
                        $lte: upToDate
                    },
                    $or: [
                        { debitAccountId: account._id },
                        { creditAccountId: account._id }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    debits: {
                        $sum: { $cond: [{ $eq: ['$debitAccountId', account._id] }, '$amount', 0] }
                    },
                    credits: {
                        $sum: { $cond: [{ $eq: ['$creditAccountId', account._id] }, '$amount', 0] }
                    }
                }
            }
        ]);

        const debits = glResult[0]?.debits || 0;
        const credits = glResult[0]?.credits || 0;

        // Calculate actual based on account type
        let actual = 0;
        if (account.type === 'Expense' || account.type === 'Asset') {
            actual = debits - credits;
        } else {
            actual = credits - debits;
        }

        const budgeted = item.budgetedAmount;
        const variance = actual - budgeted;
        const variancePercent = budgeted !== 0 ? (variance / budgeted) * 100 : 0;
        const threshold = item.varianceThreshold || budget.varianceAlertThreshold;

        results.push({
            accountCode: account.code,
            accountName: account.name,
            accountType: account.type,
            period: item.period,
            budgeted,
            actual,
            variance,
            variancePercent: variancePercent.toFixed(2),
            exceedsThreshold: Math.abs(variancePercent) > threshold
        });

        totalBudgeted += budgeted;
        totalActual += actual;
    }

    return {
        budget: {
            id: budget._id,
            name: budget.name,
            fiscalYear: budget.fiscalYear,
            periodType: budget.periodType
        },
        lineItems: results,
        totals: {
            budgeted: totalBudgeted,
            actual: totalActual,
            variance: totalActual - totalBudgeted,
            variancePercent: totalBudgeted !== 0
                ? ((totalActual - totalBudgeted) / totalBudgeted * 100).toFixed(2)
                : '0.00'
        },
        alertCount: results.filter(r => r.exceedsThreshold).length
    };
};

const Budget = mongoose.model('Budget', budgetSchema);

module.exports = Budget;
