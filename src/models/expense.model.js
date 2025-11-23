const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    expenseId: {
        type: String,
        unique: true,
        index: true
    },
    description: {
        type: String,
        required: true,
        maxlength: 500,
        trim: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'SAR'
    },
    category: {
        type: String,
        enum: ['office', 'transport', 'hospitality', 'government', 'court_fees', 'filing_fees', 'expert_witness', 'investigation', 'accommodation', 'meals', 'postage', 'printing', 'consultation', 'documents', 'research', 'software', 'telephone', 'mileage', 'other'],
        required: true,
        default: 'other'
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        required: false,
        index: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'transfer'],
        default: 'cash'
    },
    status: {
        type: String,
        enum: ['draft', 'pending_approval', 'approved', 'invoiced', 'rejected'],
        default: 'draft',
        index: true
    },
    vendor: {
        type: String,
        trim: true
    },
    receiptUrl: {
        type: String
    },
    hasReceipt: {
        type: Boolean,
        default: false
    },
    notes: {
        type: String,
        maxlength: 1000
    },
    isBillable: {
        type: Boolean,
        default: true
    },
    billableAmount: {
        type: Number,
        default: 0
    },
    markupType: {
        type: String,
        enum: ['none', 'percentage', 'fixed'],
        default: 'none'
    },
    markupValue: {
        type: Number,
        default: 0
    },
    isReimbursable: {
        type: Boolean,
        default: false
    },
    reimbursementStatus: {
        type: String,
        enum: ['pending', 'approved', 'paid'],
        default: 'pending'
    },
    reimbursedAmount: {
        type: Number,
        default: 0
    },
    reimbursedAt: {
        type: Date
    },
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice'
    },
    invoicedAt: {
        type: Date
    },
    receipts: [{
        fileName: String,
        fileUrl: String,
        fileType: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    mileage: {
        distance: Number,
        unit: {
            type: String,
            enum: ['km', 'miles'],
            default: 'km'
        },
        ratePerUnit: Number,
        startLocation: String,
        endLocation: String
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },
    rejectionReason: {
        type: String
    },
    isRecurring: {
        type: Boolean,
        default: false
    },
    recurringFrequency: {
        type: String,
        enum: ['weekly', 'monthly', 'quarterly', 'yearly']
    },
    recurringEndDate: {
        type: Date
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes for performance
expenseSchema.index({ caseId: 1, date: -1 });
expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ isBillable: 1, invoiceId: 1 });
expenseSchema.index({ date: -1 });
expenseSchema.index({ status: 1, userId: 1 });

// Generate expense ID and calculate billable amount before saving
expenseSchema.pre('save', async function(next) {
    // Generate expense ID
    if (!this.expenseId) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const count = await this.constructor.countDocuments({
            createdAt: {
                $gte: new Date(year, date.getMonth(), 1),
                $lt: new Date(year, date.getMonth() + 1, 1)
            }
        });
        this.expenseId = `EXP-${year}${month}-${String(count + 1).padStart(4, '0')}`;
    }

    // Calculate billable amount with markup
    if (this.isBillable) {
        if (this.markupType === 'percentage') {
            this.billableAmount = this.amount * (1 + this.markupValue / 100);
        } else if (this.markupType === 'fixed') {
            this.billableAmount = this.amount + this.markupValue;
        } else {
            this.billableAmount = this.amount;
        }
    } else {
        this.billableAmount = 0;
    }

    next();
});

// Static method: Get expense stats
expenseSchema.statics.getExpenseStats = async function(filters = {}) {
    const matchStage = {};

    if (filters.userId) matchStage.userId = new mongoose.Types.ObjectId(filters.userId);
    if (filters.caseId) matchStage.caseId = new mongoose.Types.ObjectId(filters.caseId);
    if (filters.startDate || filters.endDate) {
        matchStage.date = {};
        if (filters.startDate) matchStage.date.$gte = new Date(filters.startDate);
        if (filters.endDate) matchStage.date.$lte = new Date(filters.endDate);
    }

    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalExpenses: { $sum: '$amount' },
                billableExpenses: {
                    $sum: { $cond: ['$isBillable', '$amount', 0] }
                },
                nonBillableExpenses: {
                    $sum: { $cond: ['$isBillable', 0, '$amount'] }
                },
                reimbursedExpenses: {
                    $sum: { $cond: ['$isReimbursed', '$amount', 0] }
                },
                pendingExpenses: {
                    $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] }
                },
                approvedExpenses: {
                    $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$amount', 0] }
                },
                expenseCount: { $sum: 1 }
            }
        }
    ]);

    return stats[0] || {
        totalExpenses: 0,
        billableExpenses: 0,
        nonBillableExpenses: 0,
        reimbursedExpenses: 0,
        pendingExpenses: 0,
        approvedExpenses: 0,
        expenseCount: 0
    };
};

// Static method: Get expenses by category
expenseSchema.statics.getExpensesByCategory = async function(filters = {}) {
    const matchStage = {};

    if (filters.userId) matchStage.userId = new mongoose.Types.ObjectId(filters.userId);
    if (filters.caseId) matchStage.caseId = new mongoose.Types.ObjectId(filters.caseId);
    if (filters.startDate || filters.endDate) {
        matchStage.date = {};
        if (filters.startDate) matchStage.date.$gte = new Date(filters.startDate);
        if (filters.endDate) matchStage.date.$lte = new Date(filters.endDate);
    }

    return await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$category',
                total: { $sum: '$amount' },
                count: { $sum: 1 }
            }
        },
        {
            $project: {
                category: '$_id',
                total: 1,
                count: 1,
                _id: 0
            }
        },
        { $sort: { total: -1 } }
    ]);
};

// Static method: Mark as reimbursed
expenseSchema.statics.markAsReimbursed = async function(expenseIds) {
    return await this.updateMany(
        { _id: { $in: expenseIds } },
        {
            $set: {
                isReimbursed: true,
                reimbursedAt: new Date()
            }
        }
    );
};

module.exports = mongoose.model('Expense', expenseSchema);
