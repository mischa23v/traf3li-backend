const mongoose = require('mongoose');

/**
 * Employee Model - HR Management
 * Supports both Solo lawyers and Firm employees
 * Matches frontend nested structure for form handling
 */

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

const allowanceSchema = new mongoose.Schema({
    name: { type: String, required: false },
    nameAr: { type: String },
    amount: { type: Number, required: false, default: 0 },
    taxable: { type: Boolean, default: true },
    includedInEOSB: { type: Boolean, default: true },
    includedInGOSI: { type: Boolean, default: false }
}, { _id: true });

const addressSchema = new mongoose.Schema({
    city: String,
    region: String,
    country: { type: String, default: 'Saudi Arabia' }
}, { _id: false });

const emergencyContactSchema = new mongoose.Schema({
    name: String,
    relationship: String,
    phone: String
}, { _id: false });

const bankDetailsSchema = new mongoose.Schema({
    bankName: String,
    iban: String
}, { _id: false });

const workScheduleSchema = new mongoose.Schema({
    weeklyHours: { type: Number, default: 48 },
    dailyHours: { type: Number, default: 8 },
    workDays: [{ type: String }],
    restDay: { type: String, default: 'Friday' }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const employeeSchema = new mongoose.Schema({
    // Auto-generated ID
    employeeId: {
        type: String,
        unique: true,
        sparse: true
    },

    // Office type - determines form behavior
    officeType: {
        type: String,
        enum: ['solo', 'small', 'medium', 'firm'],
        default: 'solo'
    },

    // ═══════════════════════════════════════════════════════════════
    // PERSONAL INFO - البيانات الشخصية
    // ═══════════════════════════════════════════════════════════════
    personalInfo: {
        fullNameArabic: { type: String, required: false, trim: true },
        fullNameEnglish: { type: String, trim: true },
        nationalId: { type: String, required: false },
        nationalIdType: {
            type: String,
            enum: ['saudi_id', 'iqama', 'gcc_id', 'passport'],
            default: 'saudi_id'
        },
        nationalIdExpiry: Date,
        nationality: { type: String, default: 'Saudi' },
        isSaudi: { type: Boolean, default: true },
        gender: {
            type: String,
            enum: ['male', 'female'],
            required: false
        },
        dateOfBirth: Date,
        mobile: { type: String, required: false },
        email: { type: String, required: false, lowercase: true, trim: true },
        personalEmail: { type: String, lowercase: true, trim: true },
        currentAddress: addressSchema,
        emergencyContact: emergencyContactSchema,
        maritalStatus: {
            type: String,
            enum: ['single', 'married', 'divorced', 'widowed'],
            default: 'single'
        },
        numberOfDependents: { type: Number, default: 0 }
    },

    // ═══════════════════════════════════════════════════════════════
    // EMPLOYMENT - بيانات التوظيف
    // ═══════════════════════════════════════════════════════════════
    employment: {
        employmentStatus: {
            type: String,
            enum: ['active', 'on_leave', 'suspended', 'terminated', 'resigned'],
            default: 'active'
        },
        jobTitle: String,
        jobTitleArabic: { type: String, required: false },
        employmentType: {
            type: String,
            enum: ['full_time', 'part_time', 'contract', 'temporary'],
            default: 'full_time'
        },
        contractType: {
            type: String,
            enum: ['indefinite', 'fixed_term'],
            default: 'indefinite'
        },
        contractStartDate: Date,
        contractEndDate: Date,
        hireDate: { type: Date, required: false },
        probationPeriod: { type: Number, default: 90 }, // Days
        onProbation: { type: Boolean, default: true },
        workSchedule: workScheduleSchema,
        reportsTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee'
        },
        departmentName: String,
        terminationDate: Date,
        terminationReason: String
    },

    // ═══════════════════════════════════════════════════════════════
    // COMPENSATION - الراتب والبدلات
    // ═══════════════════════════════════════════════════════════════
    compensation: {
        basicSalary: { type: Number, required: false, default: 0 },
        currency: { type: String, default: 'SAR' },
        allowances: [allowanceSchema],
        paymentFrequency: {
            type: String,
            enum: ['monthly', 'bi_weekly', 'weekly'],
            default: 'monthly'
        },
        paymentMethod: {
            type: String,
            enum: ['bank_transfer', 'cash', 'check'],
            default: 'bank_transfer'
        },
        bankDetails: bankDetailsSchema
    },

    // ═══════════════════════════════════════════════════════════════
    // GOSI - التأمينات الاجتماعية
    // ═══════════════════════════════════════════════════════════════
    gosi: {
        registered: { type: Boolean, default: false },
        gosiNumber: String,
        // Saudi: employee 9.75%, employer 12.75%
        // Non-Saudi: employer 2% only (employee 0%)
        employeeContribution: { type: Number, default: 9.75 },
        employerContribution: { type: Number, default: 12.75 }
    },

    // ═══════════════════════════════════════════════════════════════
    // ORGANIZATION - الهيكل التنظيمي (medium/firm only)
    // ═══════════════════════════════════════════════════════════════
    organization: {
        branchId: String,
        departmentName: String,
        teamId: String,
        supervisorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee'
        },
        costCenter: String
    },

    // ═══════════════════════════════════════════════════════════════
    // LEAVE - رصيد الإجازات
    // ═══════════════════════════════════════════════════════════════
    leave: {
        annualLeaveEntitlement: { type: Number, default: 21 } // 21 or 30 days
    },

    // ═══════════════════════════════════════════════════════════════
    // OWNERSHIP - Multi-tenancy
    // ═══════════════════════════════════════════════════════════════
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
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }

}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// ENCRYPTION PLUGIN
// ═══════════════════════════════════════════════════════════════
const encryptionPlugin = require('./plugins/encryption.plugin');

// Apply encryption to sensitive fields
employeeSchema.plugin(encryptionPlugin, {
    fields: [
        'compensation.basicSalary',      // Employee salary
        'compensation.bankDetails.iban', // Bank IBAN
    ],
    searchableFields: []  // Salary and IBAN don't need to be searchable
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
employeeSchema.index({ firmId: 1, 'employment.employmentStatus': 1 });
employeeSchema.index({ lawyerId: 1, 'employment.employmentStatus': 1 });
employeeSchema.index({ employeeId: 1 });
employeeSchema.index({ 'personalInfo.nationalId': 1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUAL FIELDS
// ═══════════════════════════════════════════════════════════════

// Full name (for backward compatibility and convenience)
employeeSchema.virtual('fullName').get(function() {
    return this.personalInfo?.fullNameEnglish || this.personalInfo?.fullNameArabic || '';
});

employeeSchema.virtual('fullNameAr').get(function() {
    return this.personalInfo?.fullNameArabic || '';
});

// Total allowances - sum of all allowance amounts
employeeSchema.virtual('totalAllowances').get(function() {
    if (!this.compensation?.allowances || this.compensation.allowances.length === 0) return 0;
    return this.compensation.allowances.reduce((sum, a) => sum + (a.amount || 0), 0);
});

// Gross salary = basicSalary + totalAllowances
employeeSchema.virtual('grossSalary').get(function() {
    return (this.compensation?.basicSalary || 0) + this.totalAllowances;
});

// GOSI deduction = basicSalary * employeeContribution%
employeeSchema.virtual('gosiDeduction').get(function() {
    if (!this.gosi?.registered) return 0;
    return (this.compensation?.basicSalary || 0) * ((this.gosi.employeeContribution || 0) / 100);
});

// Net salary = grossSalary - gosiDeduction
employeeSchema.virtual('netSalary').get(function() {
    return this.grossSalary - this.gosiDeduction;
});

// Status shorthand (for backward compatibility)
employeeSchema.virtual('status').get(function() {
    return this.employment?.employmentStatus || 'active';
});

// Years of service - calculated from hire date
employeeSchema.virtual('yearsOfService').get(function() {
    if (!this.employment?.hireDate) return 0;
    const hireDate = new Date(this.employment.hireDate);
    const now = new Date();
    const diffMs = now - hireDate;
    const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
    return Math.max(0, parseFloat(years.toFixed(2)));
});

// Minimum annual leave entitlement based on Saudi Labor Law
// Under 5 years: 21 days minimum, 5+ years: 30 days minimum
employeeSchema.virtual('minAnnualLeave').get(function() {
    return this.yearsOfService >= 5 ? 30 : 21;
});

// Ensure virtuals are included in JSON
employeeSchema.set('toJSON', { virtuals: true });
employeeSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

// Generate employee ID
employeeSchema.pre('save', async function(next) {
    if (!this.employeeId) {
        const count = await this.constructor.countDocuments({
            $or: [
                { firmId: this.firmId },
                { lawyerId: this.lawyerId }
            ]
        });
        this.employeeId = `EMP${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get employees for firm or solo lawyer
employeeSchema.statics.getEmployees = function(firmId, lawyerId, filters = {}) {
    const query = firmId ? { firmId } : { lawyerId };
    return this.find({ ...query, ...filters })
        .populate('employment.reportsTo', 'personalInfo.fullNameArabic personalInfo.fullNameEnglish')
        .populate('organization.supervisorId', 'personalInfo.fullNameArabic personalInfo.fullNameEnglish')
        .sort({ createdAt: -1 });
};

// Get employee stats
employeeSchema.statics.getStats = async function(firmId, lawyerId) {
    const query = firmId ? { firmId } : { lawyerId };

    const [stats] = await this.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                totalEmployees: { $sum: 1 },
                activeEmployees: {
                    $sum: { $cond: [{ $eq: ['$employment.employmentStatus', 'active'] }, 1, 0] }
                },
                totalBasicSalary: { $sum: '$compensation.basicSalary' },
                byDepartment: { $push: '$employment.departmentName' },
                byStatus: { $push: '$employment.employmentStatus' }
            }
        }
    ]);

    return stats || {
        totalEmployees: 0,
        activeEmployees: 0,
        totalBasicSalary: 0
    };
};

module.exports = mongoose.model('Employee', employeeSchema);
