const mongoose = require('mongoose');

// Payroll item schema for individual employee payment
const payrollItemSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    salaryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Salary'
    },

    // Employee snapshot at time of payroll
    employeeName: String,
    employeeIdNumber: String,
    department: String,
    position: String,
    bankName: String,
    bankAccountNumber: String,
    iban: String,

    // Salary breakdown
    basicSalary: { type: Number, default: 0 },

    // Allowances breakdown
    allowances: [{
        name: String,
        type: String,
        amount: { type: Number, default: 0 }
    }],
    totalAllowances: { type: Number, default: 0 },

    // Deductions breakdown
    deductions: [{
        name: String,
        type: String,
        amount: { type: Number, default: 0 }
    }],
    totalDeductions: { type: Number, default: 0 },

    // GOSI
    gosiEmployee: { type: Number, default: 0 },
    gosiEmployer: { type: Number, default: 0 },

    // Attendance-based adjustments
    workingDays: { type: Number, default: 0 },
    actualWorkingDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    lateDays: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    overtimeAmount: { type: Number, default: 0 },

    // Leave deductions
    unpaidLeaveDays: { type: Number, default: 0 },
    unpaidLeaveDeduction: { type: Number, default: 0 },

    // Additional payments/deductions for this period
    bonuses: { type: Number, default: 0 },
    commissions: { type: Number, default: 0 },
    penalties: { type: Number, default: 0 },
    advances: { type: Number, default: 0 },
    loans: { type: Number, default: 0 },

    // Calculated totals
    grossSalary: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },

    // Payment status
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'cancelled'],
        default: 'pending'
    },
    paymentDate: Date,
    paymentReference: String,
    paymentMethod: {
        type: String,
        enum: ['bank_transfer', 'check', 'cash'],
        default: 'bank_transfer'
    },

    notes: String
}, { _id: true });

const payrollSchema = new mongoose.Schema({
    // Auto-generated payroll ID
    payrollId: {
        type: String,
        unique: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // ORGANIZATION - المنظمة
    // ═══════════════════════════════════════════════════════════════
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // PAYROLL PERIOD - فترة الرواتب
    // ═══════════════════════════════════════════════════════════════
    periodMonth: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    periodYear: {
        type: Number,
        required: true
    },
    periodStart: {
        type: Date,
        required: true
    },
    periodEnd: {
        type: Date,
        required: true
    },

    // ═══════════════════════════════════════════════════════════════
    // PAYROLL ITEMS - بنود الرواتب
    // ═══════════════════════════════════════════════════════════════
    items: [payrollItemSchema],

    // ═══════════════════════════════════════════════════════════════
    // TOTALS - المجاميع
    // ═══════════════════════════════════════════════════════════════
    totalEmployees: { type: Number, default: 0 },
    totalBasicSalary: { type: Number, default: 0 },
    totalAllowances: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    totalGosiEmployee: { type: Number, default: 0 },
    totalGosiEmployer: { type: Number, default: 0 },
    totalBonuses: { type: Number, default: 0 },
    totalOvertimeAmount: { type: Number, default: 0 },
    totalGrossSalary: { type: Number, default: 0 },
    totalNetSalary: { type: Number, default: 0 },

    // ═══════════════════════════════════════════════════════════════
    // STATUS - الحالة
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['draft', 'pending_approval', 'approved', 'processing', 'completed', 'cancelled'],
        default: 'draft',
        index: true
    },

    // Approval workflow
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

    // Processing
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    processedAt: Date,
    completedAt: Date,

    // ═══════════════════════════════════════════════════════════════
    // METADATA - البيانات الوصفية
    // ═══════════════════════════════════════════════════════════════
    notes: {
        type: String,
        maxlength: 2000
    },

    // Audit trail
    history: [{
        action: String,
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        performedAt: { type: Date, default: Date.now },
        details: String
    }],

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
payrollSchema.index({ lawyerId: 1, periodYear: -1, periodMonth: -1 });
payrollSchema.index({ lawyerId: 1, status: 1 });

// Generate payroll ID before saving
payrollSchema.pre('save', async function(next) {
    if (!this.payrollId) {
        const monthStr = String(this.periodMonth).padStart(2, '0');
        this.payrollId = `PAY-${this.periodYear}${monthStr}-${Date.now().toString().slice(-4)}`;
    }

    // Calculate totals from items
    this.calculateTotals();

    next();
});

// Method to calculate totals
payrollSchema.methods.calculateTotals = function() {
    this.totalEmployees = this.items.length;
    this.totalBasicSalary = this.items.reduce((sum, item) => sum + (item.basicSalary || 0), 0);
    this.totalAllowances = this.items.reduce((sum, item) => sum + (item.totalAllowances || 0), 0);
    this.totalDeductions = this.items.reduce((sum, item) => sum + (item.totalDeductions || 0), 0);
    this.totalGosiEmployee = this.items.reduce((sum, item) => sum + (item.gosiEmployee || 0), 0);
    this.totalGosiEmployer = this.items.reduce((sum, item) => sum + (item.gosiEmployer || 0), 0);
    this.totalBonuses = this.items.reduce((sum, item) => sum + (item.bonuses || 0), 0);
    this.totalOvertimeAmount = this.items.reduce((sum, item) => sum + (item.overtimeAmount || 0), 0);
    this.totalGrossSalary = this.items.reduce((sum, item) => sum + (item.grossSalary || 0), 0);
    this.totalNetSalary = this.items.reduce((sum, item) => sum + (item.netSalary || 0), 0);
};

// Method to add history entry
payrollSchema.methods.addHistory = function(action, userId, details = '') {
    this.history.push({
        action,
        performedBy: userId,
        performedAt: new Date(),
        details
    });
};

// Static method: Get payroll for period
payrollSchema.statics.getPayrollForPeriod = async function(lawyerId, year, month) {
    return await this.findOne({
        lawyerId,
        periodYear: year,
        periodMonth: month
    }).populate('items.employeeId', 'firstName lastName employeeId');
};

// Static method: Get payroll summary by year
payrollSchema.statics.getYearlySummary = async function(lawyerId, year) {
    return await this.aggregate([
        {
            $match: {
                lawyerId: new mongoose.Types.ObjectId(lawyerId),
                periodYear: year,
                status: { $in: ['approved', 'completed'] }
            }
        },
        {
            $group: {
                _id: '$periodMonth',
                totalNetSalary: { $sum: '$totalNetSalary' },
                totalGrossSalary: { $sum: '$totalGrossSalary' },
                totalGosiEmployer: { $sum: '$totalGosiEmployer' },
                totalEmployees: { $first: '$totalEmployees' }
            }
        },
        { $sort: { _id: 1 } }
    ]);
};

module.exports = mongoose.model('Payroll', payrollSchema);
