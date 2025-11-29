const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema({
    salaryId: {
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
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
        index: true
    },
    // Salary Period
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
        }
    },
    // Earnings
    baseSalary: {
        type: Number,
        required: true,
        default: 0
    },
    allowances: [{
        type: {
            type: String,
            enum: ['housing', 'transportation', 'food', 'phone', 'medical', 'education', 'overtime', 'bonus', 'commission', 'other']
        },
        amount: Number,
        description: String
    }],
    overtime: {
        hours: { type: Number, default: 0 },
        rate: { type: Number, default: 0 },
        amount: { type: Number, default: 0 }
    },
    bonus: {
        type: Number,
        default: 0
    },
    commission: {
        type: Number,
        default: 0
    },
    // Deductions
    deductions: [{
        type: {
            type: String,
            enum: ['tax', 'social_security', 'insurance', 'loan', 'advance', 'penalty', 'absence', 'other']
        },
        amount: Number,
        description: String
    }],
    // Calculated Fields
    grossSalary: {
        type: Number,
        default: 0
    },
    totalDeductions: {
        type: Number,
        default: 0
    },
    netSalary: {
        type: Number,
        default: 0
    },
    // Status
    status: {
        type: String,
        enum: ['draft', 'pending', 'approved', 'paid', 'cancelled'],
        default: 'draft'
    },
    // Payment Information
    paymentDate: {
        type: Date
    },
    paymentMethod: {
        type: String,
        enum: ['bank_transfer', 'cash', 'check'],
        default: 'bank_transfer'
    },
    paymentReference: String,
    // Notes
    notes: {
        type: String,
        maxlength: 1000
    },
    // Approval
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
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
salarySchema.index({ lawyerId: 1, 'period.year': 1, 'period.month': 1 });
salarySchema.index({ employeeId: 1, 'period.year': 1, 'period.month': 1 });
salarySchema.index({ lawyerId: 1, status: 1 });

// Generate salary ID before saving
salarySchema.pre('save', async function(next) {
    if (!this.salaryId) {
        const count = await this.constructor.countDocuments({
            lawyerId: this.lawyerId,
            'period.year': this.period.year,
            'period.month': this.period.month
        });
        this.salaryId = `SAL-${this.period.year}${String(this.period.month).padStart(2, '0')}-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

// Calculate totals before saving
salarySchema.pre('save', function(next) {
    // Calculate allowances total
    const allowancesTotal = this.allowances.reduce((sum, a) => sum + (a.amount || 0), 0);

    // Calculate gross salary
    this.grossSalary = this.baseSalary + allowancesTotal + this.overtime.amount + this.bonus + this.commission;

    // Calculate deductions total
    this.totalDeductions = this.deductions.reduce((sum, d) => sum + (d.amount || 0), 0);

    // Calculate net salary
    this.netSalary = this.grossSalary - this.totalDeductions;

    next();
});

module.exports = mongoose.model('Salary', salarySchema);
