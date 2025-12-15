const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// EXPENSE CATEGORIES ENUM
// ═══════════════════════════════════════════════════════════════
const EXPENSE_CATEGORIES = [
    // Office
    'office_supplies',      // مستلزمات مكتبية
    'software',             // برمجيات واشتراكات
    'hardware',             // أجهزة ومعدات
    // Travel
    'travel',               // سفر
    'accommodation',        // إقامة
    'meals',                // وجبات
    'transportation',       // مواصلات
    'fuel',                 // وقود
    'parking',              // مواقف
    // Legal
    'court_fees',           // رسوم محكمة
    'government_fees',      // رسوم حكومية
    'legal_fees',           // رسوم قانونية
    // Professional
    'professional_services', // خدمات مهنية
    'accounting',           // محاسبة
    'consulting',           // استشارات
    // Operational
    'rent',                 // إيجار
    'utilities',            // مرافق
    'telecommunications',   // اتصالات
    'maintenance',          // صيانة
    'cleaning',             // نظافة
    'security',             // أمن
    // Marketing/HR
    'marketing',            // تسويق
    'training',             // تدريب
    'recruitment',          // توظيف
    // Other
    'insurance',            // تأمين
    'bank_charges',         // رسوم بنكية
    'postage',              // بريد
    'printing',             // طباعة
    'subscriptions',        // اشتراكات
    'entertainment',        // ترفيه
    'donations',            // تبرعات
    'other',                // أخرى
    // Legacy categories for backward compatibility
    'office', 'hospitality', 'government', 'filing_fees',
    'expert_witness', 'investigation', 'documents', 'research',
    'telephone', 'mileage', 'transport', 'equipment', 'communication'
];

// Payment methods
const PAYMENT_METHODS = [
    'cash',
    'company_card',
    'personal_card',
    'debit_card',
    'bank_transfer',
    'check',
    'petty_cash',
    'direct_billing',
    // Legacy
    'card', 'debit', 'transfer'
];

// Trip purposes
const TRIP_PURPOSES = [
    'client_meeting',
    'court_appearance',
    'conference',
    'training',
    'business_development',
    'site_visit',
    'other'
];

// Government entities
const GOVERNMENT_ENTITIES = [
    'moj',    // Ministry of Justice
    'moci',   // Ministry of Commerce
    'mol',    // Ministry of Labor
    'moi',    // Ministry of Interior
    'mof',    // Ministry of Finance
    'zatca',  // Zakat, Tax and Customs Authority
    'sama',   // Saudi Arabian Monetary Authority
    'other'
];

const expenseSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
    },

    // ═══════════════════════════════════════════════════════════════
    // BASIC INFO
    // ═══════════════════════════════════════════════════════════════
    expenseId: {
        type: String,
        unique: true,
        index: true
    },
    // Alias for API compatibility
    expenseNumber: {
        type: String,
        index: true
    },
    description: {
        type: String,
        required: false,
        minlength: 1,
        maxlength: 500,
        trim: true
    },
    // Amount in halalas (SAR subunit)
    amount: {
        type: Number,
        required: false,
        min: 0
    },
    taxAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    // Calculated: amount + taxAmount
    totalAmount: {
        type: Number,
        default: 0
    },
    category: {
        type: String,
        enum: EXPENSE_CATEGORIES,
        required: false,
        default: 'other'
    },
    date: {
        type: Date,
        required: false,
        index: true
    },
    paymentMethod: {
        type: String,
        enum: PAYMENT_METHODS,
        default: 'cash'
    },
    vendor: {
        type: String,
        trim: true
    },
    receiptNumber: {
        type: String,
        trim: true
    },
    currency: {
        type: String,
        default: 'SAR'
    },

    // ═══════════════════════════════════════════════════════════════
    // EXPENSE TYPE (Reimbursable vs Non-Reimbursable)
    // ═══════════════════════════════════════════════════════════════
    expenseType: {
        type: String,
        enum: ['reimbursable', 'non_reimbursable', 'company', 'personal'],
        default: 'non_reimbursable'
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        index: true
    },
    reimbursementStatus: {
        type: String,
        enum: ['pending', 'approved', 'paid', 'rejected'],
        default: 'pending'
    },
    reimbursedAmount: {
        type: Number,
        default: 0
    },
    reimbursedAt: {
        type: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // BILLABLE
    // ═══════════════════════════════════════════════════════════════
    isBillable: {
        type: Boolean,
        default: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        index: true
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        index: true
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
    billableAmount: {
        type: Number,
        default: 0
    },
    billingStatus: {
        type: String,
        enum: ['unbilled', 'billed', 'invoiced'],
        default: 'unbilled'
    },
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        index: true
    },
    invoicedAt: {
        type: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // TAX DETAILS
    // ═══════════════════════════════════════════════════════════════
    taxRate: {
        type: Number,
        default: 15,  // Saudi VAT rate
        min: 0,
        max: 100
    },
    taxReclaimable: {
        type: Boolean,
        default: false
    },
    vendorTaxNumber: {
        type: String,
        trim: true,
        validate: {
            validator: function(v) {
                if (!v) return true;
                return /^[0-9]{15}$/.test(v);
            },
            message: 'Vendor tax number must be 15 digits'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // TRAVEL DETAILS (when category = travel)
    // ═══════════════════════════════════════════════════════════════
    travelDetails: {
        purpose: {
            type: String,
            enum: TRIP_PURPOSES
        },
        departureLocation: String,
        destination: String,
        departureDate: Date,
        returnDate: Date,
        numberOfDays: Number,
        attendees: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        mileage: {
            distance: Number,           // in KM
            rate: Number,               // SAR per KM
            amount: Number,             // Calculated
            vehicle: {
                type: String,
                enum: ['company_car', 'personal_car', 'rental']
            },
            registration: String
        },
        perDiem: {
            enabled: {
                type: Boolean,
                default: false
            },
            rate: Number,               // Daily rate
            days: Number,
            amount: Number,             // Calculated
            actualMealCost: Number      // If exceeds per diem
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // GOVERNMENT REFERENCE (for legal/court fees)
    // ═══════════════════════════════════════════════════════════════
    governmentReference: {
        transactionNumber: String,
        courtCaseNumber: String,
        entity: {
            type: String,
            enum: GOVERNMENT_ENTITIES
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // ORGANIZATION
    // ═══════════════════════════════════════════════════════════════
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        index: true
    },
    locationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location'
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        index: true
    },
    costCenterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CostCenter'
    },

    // ═══════════════════════════════════════════════════════════════
    // ATTACHMENTS
    // ═══════════════════════════════════════════════════════════════
    receipt: {
        filename: String,
        url: String,
        mimeType: String,
        size: Number
    },
    attachments: [{
        type: {
            type: String,
            enum: ['invoice', 'authorization', 'quote', 'other']
        },
        filename: String,
        url: String,
        size: Number,
        mimeType: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Legacy receipts array for backwards compatibility
    receipts: [{
        fileName: String,
        fileUrl: String,
        fileType: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    receiptUrl: String,
    hasReceipt: {
        type: Boolean,
        default: false
    },

    // ═══════════════════════════════════════════════════════════════
    // WORKFLOW
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['draft', 'pending_approval', 'approved', 'rejected', 'paid', 'invoiced'],
        default: 'draft',
        index: true
    },
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    submittedAt: {
        type: Date
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },
    rejectionReason: {
        type: String,
        maxlength: 500
    },

    // ═══════════════════════════════════════════════════════════════
    // APPROVAL WORKFLOW (ERPNext: expense_approver, approval_status)
    // ═══════════════════════════════════════════════════════════════
    // Assigned expense approver
    expenseApproverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // Approval status (ERPNext: approval_status)
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        index: true
    },
    approvalDate: {
        type: Date
    },
    // Sanctioned Amount (ERPNext: sanctioned_amount - may differ from claimed)
    sanctionedAmount: {
        type: Number,
        min: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // NOTES
    // ═══════════════════════════════════════════════════════════════
    notes: {
        type: String,
        maxlength: 1000
    },
    internalNotes: {
        type: String,
        maxlength: 1000
    },

    // ═══════════════════════════════════════════════════════════════
    // RECURRING
    // ═══════════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════════
    // ACCOUNTING
    // ═══════════════════════════════════════════════════════════════
    expenseAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    },
    bankAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    },
    glEntryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GeneralLedger'
    },
    // Payable Account (ERPNext: payable_account)
    payableAccount: {
        type: String,
        trim: true
    },
    // Journal Entry Reference (ERPNext: journal_entry)
    journalEntryRef: {
        type: String,
        trim: true
    },
    journalEntryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JournalEntry'
    },

    // ═══════════════════════════════════════════════════════════════
    // PAYMENT STATUS (ERPNext parity)
    // ═══════════════════════════════════════════════════════════════
    isPaid: {
        type: Boolean,
        default: false
    },
    modeOfPayment: {
        type: String,
        enum: ['bank_transfer', 'cash', 'check', 'payroll']
    },
    clearanceDate: {
        type: Date
    },
    paymentReference: {
        type: String
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT
    // ═══════════════════════════════════════════════════════════════
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        index: true
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
    versionKey: false,
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
expenseSchema.index({ caseId: 1, date: -1 });
expenseSchema.index({ lawyerId: 1, date: -1 });
expenseSchema.index({ firmId: 1, date: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ isBillable: 1, invoiceId: 1 });
expenseSchema.index({ date: -1 });
expenseSchema.index({ status: 1, lawyerId: 1 });
expenseSchema.index({ billingStatus: 1 });
expenseSchema.index({ expenseType: 1, reimbursementStatus: 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
expenseSchema.pre('save', async function(next) {
    const { toHalalas, addAmounts, calculatePercentage } = require('../utils/currency');
    const normalizeHalalas = (value = 0) => Number.isInteger(value) ? value : toHalalas(value);

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
        this.expenseNumber = this.expenseId; // Keep in sync
    }

    // Sync expenseNumber with expenseId
    if (this.expenseId && !this.expenseNumber) {
        this.expenseNumber = this.expenseId;
    }

    this.amount = normalizeHalalas(this.amount);
    this.taxAmount = normalizeHalalas(this.taxAmount);

    // Calculate totalAmount
    this.totalAmount = addAmounts(this.amount || 0, this.taxAmount || 0);

    // Calculate billable amount with markup
    if (this.isBillable) {
        if (this.markupType === 'percentage') {
            this.billableAmount = addAmounts(
                this.totalAmount,
                calculatePercentage(this.totalAmount, this.markupValue || 0)
            );
        } else if (this.markupType === 'fixed') {
            this.billableAmount = addAmounts(this.totalAmount, normalizeHalalas(this.markupValue || 0));
        } else {
            this.billableAmount = this.totalAmount;
        }
    } else {
        this.billableAmount = 0;
    }

    // Calculate travel mileage amount if applicable
    if (this.travelDetails && this.travelDetails.mileage) {
        const mileage = this.travelDetails.mileage;
        if (mileage.distance && mileage.rate) {
            this.travelDetails.mileage.amount = normalizeHalalas(mileage.distance * mileage.rate);
        }
    }

    // Calculate per diem amount if applicable
    if (this.travelDetails && this.travelDetails.perDiem && this.travelDetails.perDiem.enabled) {
        const perDiem = this.travelDetails.perDiem;
        if (perDiem.rate && perDiem.days) {
            this.travelDetails.perDiem.amount = normalizeHalalas(perDiem.rate * perDiem.days);
        }
    }

    // Calculate number of travel days
    if (this.travelDetails && this.travelDetails.departureDate && this.travelDetails.returnDate) {
        const departure = new Date(this.travelDetails.departureDate);
        const returnDate = new Date(this.travelDetails.returnDate);
        const diffTime = Math.abs(returnDate - departure);
        this.travelDetails.numberOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get expense stats
expenseSchema.statics.getExpenseStats = async function(filters = {}) {
    const matchStage = {};

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
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
                totalExpenses: { $sum: '$totalAmount' },
                totalAmount: { $sum: '$amount' },
                totalTax: { $sum: '$taxAmount' },
                billableExpenses: {
                    $sum: { $cond: ['$isBillable', '$totalAmount', 0] }
                },
                nonBillableExpenses: {
                    $sum: { $cond: ['$isBillable', 0, '$totalAmount'] }
                },
                reimbursableExpenses: {
                    $sum: {
                        $cond: [
                            { $in: ['$expenseType', ['reimbursable', 'personal']] },
                            '$totalAmount',
                            0
                        ]
                    }
                },
                reimbursedExpenses: {
                    $sum: { $cond: [{ $eq: ['$reimbursementStatus', 'paid'] }, '$totalAmount', 0] }
                },
                pendingApproval: {
                    $sum: { $cond: [{ $eq: ['$status', 'pending_approval'] }, '$totalAmount', 0] }
                },
                approvedExpenses: {
                    $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$totalAmount', 0] }
                },
                invoicedExpenses: {
                    $sum: { $cond: [{ $eq: ['$billingStatus', 'invoiced'] }, '$totalAmount', 0] }
                },
                expenseCount: { $sum: 1 }
            }
        }
    ]);

    return stats[0] || {
        totalExpenses: 0,
        totalAmount: 0,
        totalTax: 0,
        billableExpenses: 0,
        nonBillableExpenses: 0,
        reimbursableExpenses: 0,
        reimbursedExpenses: 0,
        pendingApproval: 0,
        approvedExpenses: 0,
        invoicedExpenses: 0,
        expenseCount: 0
    };
};

// Get expenses by category
expenseSchema.statics.getExpensesByCategory = async function(filters = {}) {
    const matchStage = {};

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
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
                total: { $sum: '$totalAmount' },
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

// Mark as reimbursed
expenseSchema.statics.markAsReimbursed = async function(expenseIds, userId) {
    return await this.updateMany(
        { _id: { $in: expenseIds } },
        {
            $set: {
                reimbursementStatus: 'paid',
                reimbursedAt: new Date(),
                updatedBy: userId
            }
        }
    );
};

// Get pending reimbursements
expenseSchema.statics.getPendingReimbursements = async function(filters = {}) {
    const matchStage = {
        expenseType: { $in: ['reimbursable', 'personal'] },
        reimbursementStatus: { $in: ['pending', 'approved'] }
    };

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
    if (filters.employeeId) matchStage.employeeId = new mongoose.Types.ObjectId(filters.employeeId);

    return await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$employeeId',
                totalPending: { $sum: '$totalAmount' },
                count: { $sum: 1 },
                expenses: { $push: '$$ROOT' }
            }
        },
        {
            $lookup: {
                from: 'employees',
                localField: '_id',
                foreignField: '_id',
                as: 'employee'
            }
        },
        { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } }
    ]);
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Submit expense for approval
 */
expenseSchema.methods.submit = async function(userId) {
    if (this.status !== 'draft') {
        throw new Error('Only draft expenses can be submitted');
    }

    this.status = 'pending_approval';
    this.submittedBy = userId;
    this.submittedAt = new Date();

    return await this.save();
};

/**
 * Approve expense
 * @param {ObjectId} userId - User approving the expense
 * @param {Session} session - MongoDB session for transactions
 */
expenseSchema.methods.approve = async function(userId, session = null) {
    if (this.status === 'approved') {
        throw new Error('Expense already approved');
    }

    if (this.status !== 'pending_approval' && this.status !== 'draft') {
        throw new Error('Only pending expenses can be approved');
    }

    this.status = 'approved';
    this.approvedBy = userId;
    this.approvedAt = new Date();

    // If reimbursable, also approve the reimbursement
    if (this.expenseType === 'reimbursable' || this.expenseType === 'personal') {
        this.reimbursementStatus = 'approved';
    }

    const options = session ? { session } : {};
    await this.save(options);

    // Post to GL
    const glEntry = await this.postToGL(session);

    return { expense: this, glEntry };
};

/**
 * Reject expense
 * @param {ObjectId} userId - User rejecting the expense
 * @param {String} reason - Rejection reason
 */
expenseSchema.methods.reject = async function(userId, reason) {
    if (this.status === 'rejected') {
        throw new Error('Expense already rejected');
    }

    if (this.status !== 'pending_approval') {
        throw new Error('Only pending expenses can be rejected');
    }

    this.status = 'rejected';
    this.rejectionReason = reason;
    this.updatedBy = userId;

    if (this.expenseType === 'reimbursable' || this.expenseType === 'personal') {
        this.reimbursementStatus = 'rejected';
    }

    return await this.save();
};

/**
 * Mark as reimbursed (paid to employee)
 * @param {ObjectId} userId - User processing the reimbursement
 * @param {Number} amount - Optional partial reimbursement amount
 */
expenseSchema.methods.reimburse = async function(userId, amount = null) {
    if (this.reimbursementStatus === 'paid') {
        throw new Error('Expense already reimbursed');
    }

    if (this.expenseType !== 'reimbursable' && this.expenseType !== 'personal') {
        throw new Error('Only reimbursable expenses can be reimbursed');
    }

    if (this.status !== 'approved') {
        throw new Error('Expense must be approved before reimbursement');
    }

    this.reimbursementStatus = 'paid';
    this.reimbursedAmount = amount || this.totalAmount;
    this.reimbursedAt = new Date();
    this.updatedBy = userId;

    return await this.save();
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
        'software': '5204',
        'hardware': '1201',
        'travel': '5300',
        'accommodation': '5302',
        'meals': '5303',
        'transportation': '5301',
        'fuel': '5304',
        'parking': '5305',
        'court_fees': '5401',
        'government_fees': '5401',
        'legal_fees': '5402',
        'professional_services': '5400',
        'accounting': '5403',
        'consulting': '5400',
        'rent': '5100',
        'utilities': '5101',
        'telecommunications': '5210',
        'maintenance': '5102',
        'cleaning': '5103',
        'security': '5104',
        'marketing': '5206',
        'training': '5205',
        'recruitment': '5207',
        'insurance': '5500',
        'bank_charges': '5501',
        'postage': '5211',
        'printing': '5203',
        'subscriptions': '5204',
        'entertainment': '5303',
        'donations': '5502',
        'other': '5600',
        // Legacy mappings
        'office': '5203',
        'hospitality': '5303',
        'government': '5401',
        'filing_fees': '5402',
        'expert_witness': '5403',
        'investigation': '5400',
        'transport': '5301',
        'equipment': '1201',
        'communication': '5210',
        'documents': '5203',
        'research': '5205',
        'telephone': '5210',
        'mileage': '5301'
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
            'cash': '1101',
            'petty_cash': '1101',
            'company_card': '1102',
            'personal_card': '2100', // Payable to employee
            'debit_card': '1102',
            'bank_transfer': '1102',
            'check': '1102',
            'direct_billing': '2000',
            // Legacy
            'card': '1102',
            'debit': '1102',
            'transfer': '1102'
        };
        const accountCode = paymentAccountMap[this.paymentMethod] || '1102';
        const bankAccount = await Account.findOne({ code: accountCode });
        if (!bankAccount) throw new Error('Bank/Cash account not found');
        bankAccountId = bankAccount._id;
        this.bankAccountId = bankAccountId;
    }

    // Convert amount to halalas if needed
    const { toHalalas } = require('../utils/currency');
    const amount = Number.isInteger(this.totalAmount) ? this.totalAmount : toHalalas(this.totalAmount);

    // Create GL entry: DR Expense, CR Bank/Cash
    const glEntry = await GeneralLedger.postTransaction({
        firmId: this.firmId,  // Multi-tenancy: pass firmId to GL
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
            expenseType: this.expenseType,
            taxAmount: this.taxAmount,
            taxRate: this.taxRate
        },
        createdBy: this.approvedBy || this.lawyerId
    }, session);

    this.glEntryId = glEntry._id;

    const options = session ? { session } : {};
    await this.save(options);

    return glEntry;
};

// Export constants for use in controllers
expenseSchema.statics.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;
expenseSchema.statics.PAYMENT_METHODS = PAYMENT_METHODS;
expenseSchema.statics.TRIP_PURPOSES = TRIP_PURPOSES;
expenseSchema.statics.GOVERNMENT_ENTITIES = GOVERNMENT_ENTITIES;

module.exports = mongoose.model('Expense', expenseSchema);
