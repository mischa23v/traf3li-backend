const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
    payrollId: {
        type: String,
        unique: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // Payroll Period
    period: {
        month: {
            type: Number,
            required: true,
            min: 1,
            max: 12
        },
        year: {
            type: Number,
            required: true
        },
        startDate: Date,
        endDate: Date
    },
    // Payroll Status
    status: {
        type: String,
        enum: ['draft', 'processing', 'pending_approval', 'approved', 'paid', 'cancelled'],
        default: 'draft'
    },
    // Summary
    summary: {
        totalEmployees: { type: Number, default: 0 },
        totalGrossSalary: { type: Number, default: 0 },
        totalDeductions: { type: Number, default: 0 },
        totalNetSalary: { type: Number, default: 0 },
        totalAllowances: { type: Number, default: 0 },
        totalOvertime: { type: Number, default: 0 },
        totalBonus: { type: Number, default: 0 }
    },
    // Department breakdown
    departmentBreakdown: [{
        department: String,
        employeeCount: Number,
        totalAmount: Number
    }],
    // Salary Records
    salaryRecords: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Salary'
    }],
    // Processing
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    processedAt: Date,
    // Approval
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    // Payment
    paymentDate: Date,
    paymentMethod: {
        type: String,
        enum: ['bank_transfer', 'mixed'],
        default: 'bank_transfer'
    },
    paymentReference: String,
    // Notes
    notes: {
        type: String,
        maxlength: 2000
    },
    // Currency
    currency: {
        type: String,
        default: 'SAR'
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
payrollSchema.index({ lawyerId: 1, 'period.year': 1, 'period.month': 1 });
payrollSchema.index({ lawyerId: 1, status: 1 });

// Generate payroll ID before saving
payrollSchema.pre('save', async function(next) {
    if (!this.payrollId) {
        const count = await this.constructor.countDocuments({
            lawyerId: this.lawyerId,
            'period.year': this.period.year
        });
        this.payrollId = `PR-${this.period.year}${String(this.period.month).padStart(2, '0')}-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

// Calculate summary before saving
payrollSchema.methods.calculateSummary = async function() {
    const Salary = mongoose.model('Salary');
    const salaries = await Salary.find({
        _id: { $in: this.salaryRecords }
    });

    this.summary = {
        totalEmployees: salaries.length,
        totalGrossSalary: salaries.reduce((sum, s) => sum + s.grossSalary, 0),
        totalDeductions: salaries.reduce((sum, s) => sum + s.totalDeductions, 0),
        totalNetSalary: salaries.reduce((sum, s) => sum + s.netSalary, 0),
        totalAllowances: salaries.reduce((sum, s) => {
            return sum + s.allowances.reduce((a, b) => a + (b.amount || 0), 0);
        }, 0),
        totalOvertime: salaries.reduce((sum, s) => sum + (s.overtime?.amount || 0), 0),
        totalBonus: salaries.reduce((sum, s) => sum + (s.bonus || 0), 0)
    };
};

module.exports = mongoose.model('Payroll', payrollSchema);
