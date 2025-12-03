const mongoose = require('mongoose');

// Item schema for statement line items
const statementItemSchema = new mongoose.Schema({
    itemType: {
        type: String,
        enum: ['invoice', 'payment', 'expense', 'time_entry', 'adjustment', 'credit'],
        required: true
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'items.referenceModel'
    },
    referenceModel: {
        type: String,
        enum: ['Invoice', 'Payment', 'Expense', 'TimeEntry']
    },
    referenceNumber: {
        type: String
    },
    date: {
        type: Date,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    balance: {
        type: Number,
        default: 0
    }
}, { _id: false });

const statementSchema = new mongoose.Schema({
    statementNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    // Client this statement is for
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // Lawyer/firm generating the statement
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // Case reference (optional - for case-specific statements)
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
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
    period: {
        type: String,
        enum: ['monthly', 'quarterly', 'yearly', 'custom'],
        default: 'monthly'
    },
    // Detailed line items
    items: [statementItemSchema],
    summary: {
        openingBalance: {
            type: Number,
            default: 0
        },
        totalCharges: {
            type: Number,
            default: 0
        },
        totalPayments: {
            type: Number,
            default: 0
        },
        totalAdjustments: {
            type: Number,
            default: 0
        },
        closingBalance: {
            type: Number,
            default: 0
        },
        // Legacy fields for backward compatibility
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
    // Legacy reference arrays
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
    payments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment'
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
statementSchema.index({ lawyerId: 1, periodStart: -1 });
statementSchema.index({ clientId: 1, periodStart: -1 });
statementSchema.index({ caseId: 1, periodStart: -1 });
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
