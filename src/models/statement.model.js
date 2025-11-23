const mongoose = require('mongoose');

const statementSchema = new mongoose.Schema({
    statementNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    periodStart: {
        type: Date,
        required: true
    },
    periodEnd: {
        type: Date,
        required: true
    },
    type: {
        type: String,
        enum: ['monthly', 'quarterly', 'yearly', 'custom'],
        default: 'monthly'
    },
    summary: {
        totalIncome: {
            type: Number,
            default: 0
        },
        totalExpenses: {
            type: Number,
            default: 0
        },
        netIncome: {
            type: Number,
            default: 0
        },
        invoicesCount: {
            type: Number,
            default: 0
        },
        paidInvoices: {
            type: Number,
            default: 0
        },
        pendingInvoices: {
            type: Number,
            default: 0
        },
        expensesCount: {
            type: Number,
            default: 0
        }
    },
    transactions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction'
    }],
    invoices: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice'
    }],
    expenses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Expense'
    }],
    pdfUrl: {
        type: String
    },
    status: {
        type: String,
        enum: ['draft', 'generated', 'sent', 'archived'],
        default: 'draft'
    },
    notes: {
        type: String,
        maxlength: 1000
    },
    generatedAt: {
        type: Date
    },
    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
statementSchema.index({ userId: 1, periodStart: -1 });
statementSchema.index({ status: 1 });

// Generate statement number before saving
statementSchema.pre('save', async function(next) {
    if (!this.statementNumber) {
        const year = this.periodStart.getFullYear();
        const month = String(this.periodStart.getMonth() + 1).padStart(2, '0');
        const count = await this.constructor.countDocuments({
            periodStart: {
                $gte: new Date(year, this.periodStart.getMonth(), 1),
                $lt: new Date(year, this.periodStart.getMonth() + 1, 1)
            }
        });
        this.statementNumber = `STMT-${year}${month}-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Statement', statementSchema);
