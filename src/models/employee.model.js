const mongoose = require('mongoose');

/**
 * Employee Model - HR Management
 * Supports both Solo lawyers and Firm employees
 */

const allowanceSchema = new mongoose.Schema({
    name: { type: String, required: true },      // اسم البدل
    nameAr: { type: String },                    // Arabic name
    amount: { type: Number, required: true, default: 0 }
}, { _id: true });

const employeeSchema = new mongoose.Schema({
    // Auto-generated ID
    employeeId: {
        type: String,
        unique: true,
        sparse: true
    },

    // ═══════════════════════════════════════════════════════════════
    // PERSONAL DATA - البيانات الشخصية
    // ═══════════════════════════════════════════════════════════════
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    firstNameAr: { type: String, trim: true },
    lastNameAr: { type: String, trim: true },

    // Identity
    idType: {
        type: String,
        enum: ['national_id', 'iqama', 'passport'],
        default: 'national_id'
    },
    idNumber: { type: String, required: true },
    nationality: { type: String, default: 'Saudi' },

    gender: {
        type: String,
        enum: ['male', 'female'],
        required: true
    },
    dateOfBirth: Date,

    // Contact
    phone: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true },

    // Address
    address: {
        city: String,
        region: String,
        district: String,
        street: String,
        postalCode: String
    },

    maritalStatus: {
        type: String,
        enum: ['single', 'married', 'divorced', 'widowed'],
        default: 'single'
    },
    dependents: { type: Number, default: 0 },

    // Emergency Contact - جهة اتصال الطوارئ
    emergencyContact: {
        name: String,
        relationship: String,
        phone: String
    },

    // ═══════════════════════════════════════════════════════════════
    // EMPLOYMENT DATA - بيانات التوظيف
    // ═══════════════════════════════════════════════════════════════
    department: String,
    jobTitle: { type: String, required: true },
    jobTitleAr: String,

    employmentType: {
        type: String,
        enum: ['full_time', 'part_time', 'contract', 'temporary', 'intern'],
        default: 'full_time'
    },

    contractType: {
        type: String,
        enum: ['unlimited', 'limited', 'seasonal', 'task_based'],
        default: 'unlimited'
    },

    hireDate: { type: Date, required: true },
    contractEndDate: Date,
    probationDays: { type: Number, default: 90 },

    // Work Schedule - جدول العمل
    workSchedule: {
        hoursPerWeek: { type: Number, default: 48 },
        hoursPerDay: { type: Number, default: 8 },
        weekendDays: [{ type: String, enum: ['friday', 'saturday', 'sunday'] }]
    },

    // ═══════════════════════════════════════════════════════════════
    // SALARY & ALLOWANCES - الراتب والبدلات
    // ═══════════════════════════════════════════════════════════════
    basicSalary: { type: Number, required: true, default: 0 },

    // Dynamic allowances - can add unlimited
    allowances: [allowanceSchema],

    // Payment details
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

    // Bank details - البيانات البنكية
    bankDetails: {
        bankName: String,
        iban: String,
        accountNumber: String
    },

    // ═══════════════════════════════════════════════════════════════
    // GOSI - التأمينات الاجتماعية
    // ═══════════════════════════════════════════════════════════════
    gosi: {
        isRegistered: { type: Boolean, default: false },
        subscriberNumber: String,
        registrationDate: Date,
        // Saudi: employee 9.75%, employer 12.75%
        // Non-Saudi: employer 2% only
        employeeContribution: { type: Number, default: 9.75 },
        employerContribution: { type: Number, default: 12.75 }
    },

    // ═══════════════════════════════════════════════════════════════
    // ORGANIZATIONAL STRUCTURE - الهيكل التنظيمي (Firm only)
    // ═══════════════════════════════════════════════════════════════
    branch: String,
    team: String,
    supervisor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    costCenter: String,

    // ═══════════════════════════════════════════════════════════════
    // LEAVE BALANCES - رصيد الإجازات
    // ═══════════════════════════════════════════════════════════════
    leaveBalance: {
        annual: { type: Number, default: 21 },      // 21 days first 5 years, 30 after
        sick: { type: Number, default: 30 },
        unpaid: { type: Number, default: 0 },
        other: { type: Number, default: 0 }
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['active', 'on_leave', 'suspended', 'terminated', 'resigned'],
        default: 'active'
    },
    terminationDate: Date,
    terminationReason: String,

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
    },

    // Notes
    notes: String

}, {
    timestamps: true,
    versionKey: false
});

// Indexes
employeeSchema.index({ firmId: 1, status: 1 });
employeeSchema.index({ lawyerId: 1, status: 1 });
employeeSchema.index({ employeeId: 1 });

// Virtual: Full name
employeeSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

employeeSchema.virtual('fullNameAr').get(function() {
    if (this.firstNameAr && this.lastNameAr) {
        return `${this.firstNameAr} ${this.lastNameAr}`;
    }
    return this.fullName;
});

// Virtual: Total allowances
employeeSchema.virtual('totalAllowances').get(function() {
    if (!this.allowances || this.allowances.length === 0) return 0;
    return this.allowances.reduce((sum, a) => sum + (a.amount || 0), 0);
});

// Virtual: Total salary (basic + allowances)
employeeSchema.virtual('totalSalary').get(function() {
    return (this.basicSalary || 0) + this.totalAllowances;
});

// Virtual: GOSI deduction
employeeSchema.virtual('gosiDeduction').get(function() {
    if (!this.gosi?.isRegistered) return 0;
    return (this.basicSalary || 0) * (this.gosi.employeeContribution / 100);
});

// Virtual: Net salary
employeeSchema.virtual('netSalary').get(function() {
    return this.totalSalary - this.gosiDeduction;
});

// Ensure virtuals are included in JSON
employeeSchema.set('toJSON', { virtuals: true });
employeeSchema.set('toObject', { virtuals: true });

// Pre-save: Generate employee ID
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

// Static: Get employees for firm or solo lawyer
employeeSchema.statics.getEmployees = function(firmId, lawyerId, filters = {}) {
    const query = firmId ? { firmId } : { lawyerId };
    return this.find({ ...query, ...filters })
        .populate('supervisor', 'firstName lastName')
        .sort({ createdAt: -1 });
};

// Static: Get employee stats
employeeSchema.statics.getStats = async function(firmId, lawyerId) {
    const query = firmId ? { firmId } : { lawyerId };

    const [stats] = await this.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                totalEmployees: { $sum: 1 },
                activeEmployees: {
                    $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                },
                totalBasicSalary: { $sum: '$basicSalary' },
                byDepartment: { $push: '$department' },
                byStatus: { $push: '$status' }
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
