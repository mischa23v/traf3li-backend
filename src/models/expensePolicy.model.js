/**
 * Expense Policy Model
 *
 * Defines expense policies that control spending limits, approval requirements,
 * and reimbursement rules for different categories and user roles.
 */

const mongoose = require('mongoose');

const categoryLimitSchema = new mongoose.Schema({
    category: {
        type: String,
        required: true
    },
    dailyLimit: { type: Number }, // In halalas
    weeklyLimit: { type: Number },
    monthlyLimit: { type: Number },
    singleTransactionLimit: { type: Number },
    requiresReceipt: { type: Boolean, default: true },
    receiptThreshold: { type: Number }, // Require receipt above this amount
    requiresPreApproval: { type: Boolean, default: false },
    preApprovalThreshold: { type: Number }, // Require pre-approval above this amount
    allowedPaymentMethods: [{ type: String }],
    notes: { type: String }
}, { _id: true });

const approvalRuleSchema = new mongoose.Schema({
    minAmount: { type: Number, required: true }, // In halalas
    maxAmount: { type: Number }, // In halalas (null = unlimited)
    approverRole: { type: String }, // 'manager', 'admin', 'owner', etc.
    approverUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requiresMultipleApprovers: { type: Boolean, default: false },
    minimumApprovers: { type: Number, default: 1 }
}, { _id: true });

const expensePolicySchema = new mongoose.Schema({
    // Multi-tenancy
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // Policy Info
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, trim: true },
    description: { type: String, trim: true },
    descriptionAr: { type: String, trim: true },

    // Policy Type
    policyType: {
        type: String,
        enum: ['standard', 'travel', 'client_entertainment', 'project', 'custom'],
        default: 'standard'
    },

    // Applicable To
    applicableTo: {
        type: String,
        enum: ['all', 'roles', 'departments', 'individuals'],
        default: 'all'
    },
    applicableRoles: [{ type: String }], // ['lawyer', 'associate', 'secretary']
    applicableDepartments: [{ type: String }],
    applicableUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Global Limits
    globalLimits: {
        dailyLimit: { type: Number }, // In halalas
        weeklyLimit: { type: Number },
        monthlyLimit: { type: Number },
        quarterlyLimit: { type: Number },
        yearlyLimit: { type: Number },
        singleTransactionLimit: { type: Number }
    },

    // Category-Specific Limits
    categoryLimits: [categoryLimitSchema],

    // Receipt Requirements
    receiptPolicy: {
        alwaysRequired: { type: Boolean, default: false },
        requiredAbove: { type: Number, default: 10000 }, // 100 SAR in halalas
        acceptedFormats: [{ type: String }], // ['image/jpeg', 'image/png', 'application/pdf']
        maxFileSize: { type: Number, default: 10485760 }, // 10MB in bytes
        requireOriginal: { type: Boolean, default: false }
    },

    // Approval Workflow
    approvalRules: [approvalRuleSchema],
    autoApproveBelow: { type: Number }, // Auto-approve expenses below this amount
    requiresManagerApproval: { type: Boolean, default: true },
    requiresFinanceApproval: { type: Boolean, default: false },
    financeApprovalThreshold: { type: Number }, // Require finance approval above this

    // Reimbursement Settings
    reimbursement: {
        enabled: { type: Boolean, default: true },
        processingDays: { type: Number, default: 14 },
        paymentMethod: {
            type: String,
            enum: ['bank_transfer', 'payroll', 'cash', 'check'],
            default: 'bank_transfer'
        },
        minimumAmount: { type: Number, default: 100 }, // Minimum for reimbursement
        batchProcessing: { type: Boolean, default: true },
        batchFrequency: {
            type: String,
            enum: ['daily', 'weekly', 'biweekly', 'monthly'],
            default: 'biweekly'
        }
    },

    // Per Diem Settings (for travel)
    perDiem: {
        enabled: { type: Boolean, default: false },
        domesticRate: { type: Number }, // Daily rate in halalas
        internationalRate: { type: Number },
        mealsIncluded: { type: Boolean, default: true },
        lodgingIncluded: { type: Boolean, default: false },
        incidentalsRate: { type: Number }
    },

    // Mileage Reimbursement
    mileage: {
        enabled: { type: Boolean, default: false },
        ratePerKm: { type: Number }, // In halalas per km
        requiresOdometer: { type: Boolean, default: false },
        requiresDestination: { type: Boolean, default: true }
    },

    // Billable Expense Rules
    billableRules: {
        allowBillable: { type: Boolean, default: true },
        defaultBillable: { type: Boolean, default: false },
        markupPercentage: { type: Number, default: 0 },
        requireClientApproval: { type: Boolean, default: false },
        clientApprovalThreshold: { type: Number }
    },

    // Currency Settings
    currency: {
        defaultCurrency: { type: String, default: 'SAR' },
        allowedCurrencies: [{ type: String }],
        exchangeRateSource: {
            type: String,
            enum: ['manual', 'automatic'],
            default: 'manual'
        }
    },

    // Audit & Compliance
    auditSettings: {
        randomAuditPercentage: { type: Number, default: 0 }, // % of expenses to audit
        auditCategories: [{ type: String }], // Categories that always require audit
        requiresJustification: { type: Boolean, default: false },
        justificationMinLength: { type: Number, default: 10 }
    },

    // Violations
    violationPolicy: {
        warnOnFirstViolation: { type: Boolean, default: true },
        blockRepeatedViolations: { type: Boolean, default: false },
        violationThreshold: { type: Number, default: 3 }, // Number of violations before blocking
        notifyManager: { type: Boolean, default: true },
        notifyHR: { type: Boolean, default: false }
    },

    // Status
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    effectiveDate: { type: Date, default: Date.now },
    expiryDate: { type: Date },

    // Usage Stats
    usageCount: { type: Number, default: 0 },
    totalExpensesProcessed: { type: Number, default: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true,
    versionKey: false
});

// Indexes
expensePolicySchema.index({ firmId: 1, isActive: 1 });
expensePolicySchema.index({ firmId: 1, isDefault: 1 });
expensePolicySchema.index({ firmId: 1, policyType: 1 });
expensePolicySchema.index({ lawyerId: 1, isActive: 1 });

/**
 * Check if expense complies with policy
 */
expensePolicySchema.methods.checkCompliance = async function(expense, userId) {
    const violations = [];
    const warnings = [];

    // Check single transaction limit
    if (this.globalLimits?.singleTransactionLimit &&
        expense.amount > this.globalLimits.singleTransactionLimit) {
        violations.push({
            type: 'single_transaction_limit',
            message: `Expense amount (${expense.amount}) exceeds single transaction limit (${this.globalLimits.singleTransactionLimit})`,
            messageAr: `مبلغ المصروف يتجاوز الحد الأقصى للمعاملة الواحدة`
        });
    }

    // Check category limit
    const categoryLimit = this.categoryLimits.find(c => c.category === expense.category);
    if (categoryLimit) {
        if (categoryLimit.singleTransactionLimit &&
            expense.amount > categoryLimit.singleTransactionLimit) {
            violations.push({
                type: 'category_limit',
                message: `Expense exceeds category limit for ${expense.category}`,
                messageAr: `المصروف يتجاوز الحد الأقصى للفئة`
            });
        }

        // Check receipt requirement
        if (categoryLimit.requiresReceipt && !expense.receipt) {
            violations.push({
                type: 'receipt_required',
                message: `Receipt required for ${expense.category} expenses`,
                messageAr: `يجب إرفاق إيصال لهذه الفئة`
            });
        }

        // Check pre-approval requirement
        if (categoryLimit.requiresPreApproval &&
            expense.amount > (categoryLimit.preApprovalThreshold || 0) &&
            !expense.preApprovalId) {
            violations.push({
                type: 'preapproval_required',
                message: `Pre-approval required for this expense`,
                messageAr: `يتطلب موافقة مسبقة`
            });
        }
    }

    // Check receipt threshold
    if (!expense.receipt && this.receiptPolicy?.requiredAbove &&
        expense.amount > this.receiptPolicy.requiredAbove) {
        violations.push({
            type: 'receipt_required',
            message: `Receipt required for expenses over ${this.receiptPolicy.requiredAbove}`,
            messageAr: `يجب إرفاق إيصال للمصروفات التي تتجاوز ${this.receiptPolicy.requiredAbove}`
        });
    }

    // Check justification
    if (this.auditSettings?.requiresJustification) {
        if (!expense.notes || expense.notes.length < (this.auditSettings.justificationMinLength || 10)) {
            violations.push({
                type: 'justification_required',
                message: 'Expense requires justification',
                messageAr: 'يجب توضيح سبب المصروف'
            });
        }
    }

    return {
        compliant: violations.length === 0,
        violations,
        warnings,
        requiresApproval: this.getRequiredApproval(expense.amount),
        autoApprove: this.autoApproveBelow && expense.amount <= this.autoApproveBelow
    };
};

/**
 * Get required approval level
 */
expensePolicySchema.methods.getRequiredApproval = function(amount) {
    const applicableRules = this.approvalRules
        .filter(r => amount >= r.minAmount && (!r.maxAmount || amount <= r.maxAmount))
        .sort((a, b) => b.minAmount - a.minAmount);

    if (applicableRules.length > 0) {
        return applicableRules[0];
    }

    return null;
};

/**
 * Get limit for category
 */
expensePolicySchema.methods.getCategoryLimit = function(category) {
    return this.categoryLimits.find(c => c.category === category);
};

/**
 * Check if user is applicable to this policy
 */
expensePolicySchema.methods.isApplicableToUser = async function(userId, userRole, userDepartment) {
    if (this.applicableTo === 'all') return true;

    if (this.applicableTo === 'roles') {
        return this.applicableRoles.includes(userRole);
    }

    if (this.applicableTo === 'departments') {
        return this.applicableDepartments.includes(userDepartment);
    }

    if (this.applicableTo === 'individuals') {
        return this.applicableUsers.some(u => u.toString() === userId.toString());
    }

    return false;
};

/**
 * Set as default policy
 */
expensePolicySchema.methods.setAsDefault = async function(userId) {
    const query = {};
    if (this.firmId) {
        query.firmId = this.firmId;
    } else if (this.lawyerId) {
        query.lawyerId = this.lawyerId;
    }

    await mongoose.model('ExpensePolicy').updateMany(
        { ...query, _id: { $ne: this._id } },
        { $set: { isDefault: false } }
    );

    this.isDefault = true;
    this.updatedBy = userId;
    await this.save();
    return this;
};

/**
 * Static: Get applicable policy for user
 */
expensePolicySchema.statics.getApplicablePolicy = async function(firmId, lawyerId, userId, userRole, userDepartment) {
    const query = {};
    if (firmId) {
        query.firmId = firmId;
    } else if (lawyerId) {
        query.lawyerId = lawyerId;
    }

    // Try to find specific policy for user
    const userPolicy = await this.findOne({
        ...query,
        isActive: true,
        applicableTo: 'individuals',
        applicableUsers: userId
    });
    if (userPolicy) return userPolicy;

    // Try role-based policy
    if (userRole) {
        const rolePolicy = await this.findOne({
            ...query,
            isActive: true,
            applicableTo: 'roles',
            applicableRoles: userRole
        });
        if (rolePolicy) return rolePolicy;
    }

    // Try department-based policy
    if (userDepartment) {
        const deptPolicy = await this.findOne({
            ...query,
            isActive: true,
            applicableTo: 'departments',
            applicableDepartments: userDepartment
        });
        if (deptPolicy) return deptPolicy;
    }

    // Fall back to default policy
    return this.findOne({
        ...query,
        isActive: true,
        isDefault: true
    });
};

/**
 * Static: Create default policy
 */
expensePolicySchema.statics.createDefaultPolicy = async function(firmId, lawyerId, userId) {
    const query = {};
    if (firmId) {
        query.firmId = firmId;
    } else if (lawyerId) {
        query.lawyerId = lawyerId;
    }

    return this.create({
        ...query,
        name: 'Standard Expense Policy',
        nameAr: 'سياسة المصروفات القياسية',
        description: 'Default expense policy for all employees',
        descriptionAr: 'سياسة المصروفات الافتراضية لجميع الموظفين',
        policyType: 'standard',
        applicableTo: 'all',
        globalLimits: {
            dailyLimit: 100000, // 1000 SAR
            monthlyLimit: 500000, // 5000 SAR
            singleTransactionLimit: 50000 // 500 SAR
        },
        receiptPolicy: {
            alwaysRequired: false,
            requiredAbove: 10000 // 100 SAR
        },
        autoApproveBelow: 10000, // 100 SAR
        requiresManagerApproval: true,
        reimbursement: {
            enabled: true,
            processingDays: 14,
            paymentMethod: 'bank_transfer'
        },
        isActive: true,
        isDefault: true,
        createdBy: userId
    });
};

module.exports = mongoose.model('ExpensePolicy', expensePolicySchema);
