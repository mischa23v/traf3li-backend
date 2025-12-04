const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    expenseId: {
        type: String,
        unique: true,
        index: true
    },
    // Accounting: GL account for this expense
    expenseAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    },
    // Accounting: Bank/Cash account used
    bankAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    },
    // GL entry ID for this expense
    glEntryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GeneralLedger'
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
        enum: [
            'office_supplies',      // مستلزمات مكتبية
            'travel',               // سفر وانتقالات
            'transport',            // مواصلات
            'meals',                // وجبات وضيافة
            'software',             // برمجيات واشتراكات
            'equipment',            // معدات وأجهزة
            'communication',        // اتصالات
            'government_fees',      // رسوم حكومية
            'professional_services', // خدمات مهنية
            'marketing',            // تسويق وإعلان
            'training',             // تدريب وتطوير
            // Legacy categories for backward compatibility
            'office', 'hospitality', 'government', 'court_fees', 'filing_fees',
            'expert_witness', 'investigation', 'accommodation', 'postage',
            'printing', 'consultation', 'documents', 'research', 'telephone', 'mileage',
            'other'
        ],
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
        enum: ['cash', 'card', 'debit', 'transfer', 'check', 'petty_cash'],
        default: 'cash'
    },
    // NEW FIELDS per API spec
    expenseType: {
        type: String,
        enum: ['company', 'personal'],
        default: 'company'
    },
    taxAmount: {
        type: Number,
        default: 0
    },
    receiptNumber: {
        type: String,
        default: null
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
expenseSchema.index({ lawyerId: 1, date: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ isBillable: 1, invoiceId: 1 });
expenseSchema.index({ date: -1 });
expenseSchema.index({ status: 1, lawyerId: 1 });

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

    if (filters.lawyerId) matchStage.lawyerId = new mongoose.Types.ObjectId(filters.lawyerId);
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

    if (filters.lawyerId) matchStage.lawyerId = new mongoose.Types.ObjectId(filters.lawyerId);
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

/**
 * Post expense to General Ledger (called when expense is approved)
 * DR: Expense Account
 * CR: Bank/Cash Account
 * @param {Session} session - MongoDB session for transactions
 */
expenseSchema.methods.postToGL = async function(session = null) {
    const GeneralLedger = mongoose.model('GeneralLedger');
    const Account = mongoose.model('Account');

    // Check if already posted
    if (this.glEntryId) {
        throw new Error('Expense already posted to GL');
    }

    // Only post approved expenses
    if (this.status !== 'approved') {
        throw new Error('Only approved expenses can be posted to GL');
    }

    // Map expense category to GL account code
    const categoryAccountMap = {
        'office_supplies': '5203',
        'travel': '5300',
        'transport': '5301',
        'meals': '5303',
        'software': '5204',
        'equipment': '1201',
        'communication': '5210',
        'government_fees': '5401',
        'professional_services': '5400',
        'marketing': '5206',
        'training': '5205',
        'office': '5203',
        'hospitality': '5303',
        'government': '5401',
        'court_fees': '5401',
        'filing_fees': '5402',
        'expert_witness': '5403',
        'investigation': '5400',
        'accommodation': '5302',
        'postage': '5211',
        'printing': '5203',
        'consultation': '5400',
        'documents': '5203',
        'research': '5205',
        'telephone': '5210',
        'mileage': '5301',
        'other': '5600'
    };

    // Get expense account (use mapped account or default)
    let expenseAccountId = this.expenseAccountId;
    if (!expenseAccountId) {
        const accountCode = categoryAccountMap[this.category] || '5600';
        const expenseAccount = await Account.findOne({ code: accountCode });
        if (!expenseAccount) {
            // Fallback to Other Expenses
            const fallbackAccount = await Account.findOne({ code: '5600' });
            if (!fallbackAccount) throw new Error('Expense account not found');
            expenseAccountId = fallbackAccount._id;
        } else {
            expenseAccountId = expenseAccount._id;
        }
        this.expenseAccountId = expenseAccountId;
    }

    // Get bank/cash account (use default if not set)
    let bankAccountId = this.bankAccountId;
    if (!bankAccountId) {
        // Map payment method to account
        const paymentAccountMap = {
            'cash': '1101',      // Cash on Hand
            'petty_cash': '1101',
            'card': '1102',     // Bank Account - Main
            'debit': '1102',
            'transfer': '1102',
            'check': '1102'
        };
        const accountCode = paymentAccountMap[this.paymentMethod] || '1102';
        const bankAccount = await Account.findOne({ code: accountCode });
        if (!bankAccount) throw new Error('Bank/Cash account not found');
        bankAccountId = bankAccount._id;
        this.bankAccountId = bankAccountId;
    }

    // Convert amount to halalas if needed
    const { toHalalas } = require('../utils/currency');
    const amount = Number.isInteger(this.amount) ? this.amount : toHalalas(this.amount);

    // Create GL entry: DR Expense, CR Bank/Cash
    const glEntry = await GeneralLedger.postTransaction({
        transactionDate: this.date || new Date(),
        description: `Expense ${this.expenseId} - ${this.description}`,
        descriptionAr: `مصروف ${this.expenseId}`,
        debitAccountId: expenseAccountId,
        creditAccountId: bankAccountId,
        amount,
        referenceId: this._id,
        referenceModel: 'Expense',
        referenceNumber: this.expenseId,
        caseId: this.caseId,
        clientId: this.clientId,
        lawyerId: this.lawyerId,
        meta: {
            category: this.category,
            vendor: this.vendor,
            receiptNumber: this.receiptNumber,
            isBillable: this.isBillable,
            expenseType: this.expenseType
        },
        createdBy: this.approvedBy || this.lawyerId
    }, session);

    this.glEntryId = glEntry._id;

    const options = session ? { session } : {};
    await this.save(options);

    return glEntry;
};

/**
 * Approve and post expense to GL
 * @param {ObjectId} userId - User approving the expense
 * @param {Session} session - MongoDB session for transactions
 */
expenseSchema.methods.approve = async function(userId, session = null) {
    if (this.status === 'approved') {
        throw new Error('Expense already approved');
    }

    this.status = 'approved';
    this.approvedBy = userId;
    this.approvedAt = new Date();

    const options = session ? { session } : {};
    await this.save(options);

    // Post to GL
    const glEntry = await this.postToGL(session);

    return { expense: this, glEntry };
};

module.exports = mongoose.model('Expense', expenseSchema);
