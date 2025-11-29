const mongoose = require('mongoose');

// Allowance schema
const allowanceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    nameAr: String,
    type: {
        type: String,
        enum: [
            'housing',          // بدل سكن
            'transportation',   // بدل مواصلات
            'food',             // بدل طعام
            'phone',            // بدل هاتف
            'overtime',         // عمل إضافي
            'commission',       // عمولة
            'bonus',            // مكافأة
            'other'
        ],
        required: true
    },
    amount: { type: Number, required: true, min: 0 },
    isPercentage: { type: Boolean, default: false },
    isTaxable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true }
}, { _id: true });

// Deduction schema
const deductionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    nameAr: String,
    type: {
        type: String,
        enum: [
            'gosi',             // التأمينات الاجتماعية
            'tax',              // ضريبة
            'loan',             // قرض
            'advance',          // سلفة
            'absence',          // غياب
            'late',             // تأخير
            'insurance',        // تأمين
            'other'
        ],
        required: true
    },
    amount: { type: Number, required: true, min: 0 },
    isPercentage: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
}, { _id: true });

const salarySchema = new mongoose.Schema({
    // Auto-generated salary ID
    salaryId: {
        type: String,
        unique: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // EMPLOYEE REFERENCE - مرجع الموظف
    // ═══════════════════════════════════════════════════════════════
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // BASIC SALARY - الراتب الأساسي
    // ═══════════════════════════════════════════════════════════════
    basicSalary: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'SAR'
    },
    paymentFrequency: {
        type: String,
        enum: ['monthly', 'bi_weekly', 'weekly'],
        default: 'monthly'
    },

    // ═══════════════════════════════════════════════════════════════
    // ALLOWANCES - البدلات
    // ═══════════════════════════════════════════════════════════════
    allowances: [allowanceSchema],

    // ═══════════════════════════════════════════════════════════════
    // DEDUCTIONS - الاستقطاعات
    // ═══════════════════════════════════════════════════════════════
    deductions: [deductionSchema],

    // ═══════════════════════════════════════════════════════════════
    // GOSI (Saudi Social Insurance) - التأمينات الاجتماعية
    // ═══════════════════════════════════════════════════════════════
    gosiEnabled: {
        type: Boolean,
        default: true
    },
    gosiEmployeePercentage: {
        type: Number,
        default: 9.75  // Employee contribution 9.75%
    },
    gosiEmployerPercentage: {
        type: Number,
        default: 11.75 // Employer contribution 11.75%
    },
    gosiBaseSalary: {
        type: Number  // Salary base for GOSI calculation (may differ from basic salary)
    },

    // ═══════════════════════════════════════════════════════════════
    // CALCULATED TOTALS - المجاميع المحسوبة
    // ═══════════════════════════════════════════════════════════════
    totalAllowances: {
        type: Number,
        default: 0
    },
    totalDeductions: {
        type: Number,
        default: 0
    },
    grossSalary: {
        type: Number,
        default: 0
    },
    netSalary: {
        type: Number,
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // EFFECTIVE DATES - تواريخ السريان
    // ═══════════════════════════════════════════════════════════════
    effectiveFrom: {
        type: Date,
        required: true
    },
    effectiveTo: Date,

    // ═══════════════════════════════════════════════════════════════
    // STATUS & METADATA - الحالة والبيانات الوصفية
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['active', 'inactive', 'superseded'],
        default: 'active',
        index: true
    },
    notes: {
        type: String,
        maxlength: 1000
    },

    // Audit
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

// Indexes
salarySchema.index({ employeeId: 1, status: 1 });
salarySchema.index({ lawyerId: 1, effectiveFrom: -1 });

// Generate salary ID before saving
salarySchema.pre('save', async function(next) {
    if (!this.salaryId) {
        const year = new Date().getFullYear();
        const count = await this.constructor.countDocuments({
            lawyerId: this.lawyerId,
            createdAt: { $gte: new Date(year, 0, 1) }
        });
        this.salaryId = `SAL-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    // Calculate totals
    this.calculateTotals();

    next();
});

// Method to calculate salary totals
salarySchema.methods.calculateTotals = function() {
    // Calculate total allowances
    this.totalAllowances = this.allowances
        .filter(a => a.isActive)
        .reduce((sum, a) => {
            if (a.isPercentage) {
                return sum + (this.basicSalary * a.amount / 100);
            }
            return sum + a.amount;
        }, 0);

    // Calculate gross salary
    this.grossSalary = this.basicSalary + this.totalAllowances;

    // Calculate GOSI if enabled
    let gosiDeduction = 0;
    if (this.gosiEnabled) {
        const gosiBase = this.gosiBaseSalary || this.basicSalary;
        gosiDeduction = gosiBase * (this.gosiEmployeePercentage / 100);
    }

    // Calculate total deductions
    this.totalDeductions = this.deductions
        .filter(d => d.isActive)
        .reduce((sum, d) => {
            if (d.isPercentage) {
                return sum + (this.basicSalary * d.amount / 100);
            }
            return sum + d.amount;
        }, gosiDeduction);

    // Calculate net salary
    this.netSalary = this.grossSalary - this.totalDeductions;
};

// Static method: Get current salary for employee
salarySchema.statics.getCurrentSalary = async function(employeeId) {
    return await this.findOne({
        employeeId,
        status: 'active',
        effectiveFrom: { $lte: new Date() },
        $or: [
            { effectiveTo: null },
            { effectiveTo: { $gt: new Date() } }
        ]
    }).sort({ effectiveFrom: -1 });
};

// Static method: Get salary history for employee
salarySchema.statics.getSalaryHistory = async function(employeeId) {
    return await this.find({ employeeId })
        .sort({ effectiveFrom: -1 });
};

module.exports = mongoose.model('Salary', salarySchema);
