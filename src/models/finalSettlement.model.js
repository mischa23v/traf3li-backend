/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  ⚠️  SAUDI LABOR LAW COMPLIANCE - DO NOT MODIFY WITHOUT LEGAL REVIEW  ⚠️    ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                               ║
 * ║  Final Settlement (تسوية نهاية الخدمة) - Articles 84-88 & 111                ║
 * ║                                                                               ║
 * ║  Components:                                                                  ║
 * ║  - EOSB (End of Service Benefits)                                            ║
 * ║  - Unpaid salary (pro-rated)                                                 ║
 * ║  - Accrued annual leave encashment (Article 111)                             ║
 * ║  - Overtime dues                                                             ║
 * ║  - Bonus/commissions due                                                     ║
 * ║  - LESS: Advance/loan balances                                               ║
 * ║  - LESS: Notice period compensation (if applicable)                          ║
 * ║                                                                               ║
 * ║  Payment Timeline:                                                           ║
 * ║  - Resignation: within 2 weeks                                               ║
 * ║  - Termination: immediately or within 1 week                                 ║
 * ║                                                                               ║
 * ║  Official sources: hrsd.gov.sa, mol.gov.sa                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * Final Settlement Model
 *
 * Comprehensive calculation and tracking of employee end-of-service dues.
 */

const mongoose = require('mongoose');
const Counter = require('./counter.model');

const finalSettlementSchema = new mongoose.Schema({
    // Unique identifier
    settlementNumber: {
        type: String,
        unique: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // EMPLOYEE REFERENCE
    // ═══════════════════════════════════════════════════════════════
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: [true, 'Employee is required'],
        index: true
    },
    employeeSnapshot: {
        employeeIdNumber: String,
        fullName: String,
        fullNameArabic: String,
        nationalId: String,
        department: String,
        jobTitle: String,
        hireDate: Date,
        lastWorkingDay: Date,
        bankDetails: {
            bankName: String,
            iban: String
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // TERMINATION DETAILS
    // ═══════════════════════════════════════════════════════════════
    terminationType: {
        type: String,
        enum: [
            'resignation',           // Standard resignation
            'article_74_mutual',     // Mutual agreement
            'article_75_expiry',     // Contract expiry
            'article_77_indefinite', // Party termination (indefinite)
            'article_80_employer',   // Employer termination - misconduct
            'article_81_employee',   // Employee resignation - employer breach
            'retirement',            // Retirement
            'death',                 // Death of employee
            'force_majeure'          // Force majeure
        ],
        required: [true, 'Termination type is required']
    },
    terminationReason: String,
    lastWorkingDay: {
        type: Date,
        required: [true, 'Last working day is required']
    },
    noticePeriod: {
        required: { type: Boolean, default: true },
        daysRequired: { type: Number, default: 60 },
        daysServed: { type: Number, default: 0 },
        waived: { type: Boolean, default: false },
        waivedBy: { type: String, enum: ['employer', 'employee', 'mutual', null], default: null }
    },

    // ═══════════════════════════════════════════════════════════════
    // SERVICE DETAILS
    // ═══════════════════════════════════════════════════════════════
    serviceDetails: {
        hireDate: { type: Date, required: true },
        terminationDate: { type: Date, required: true },
        totalYears: { type: Number, default: 0 },
        totalMonths: { type: Number, default: 0 },
        totalDays: { type: Number, default: 0 }
    },

    // ═══════════════════════════════════════════════════════════════
    // COMPENSATION DETAILS (Last drawn)
    // ═══════════════════════════════════════════════════════════════
    compensation: {
        basicSalary: { type: Number, default: 0 },
        housingAllowance: { type: Number, default: 0 },
        transportAllowance: { type: Number, default: 0 },
        otherAllowances: { type: Number, default: 0 },
        totalMonthlyWage: { type: Number, default: 0 }, // For EOSB calculation
        dailyRate: { type: Number, default: 0 }
    },

    // ═══════════════════════════════════════════════════════════════
    // EARNINGS - Dues TO Employee
    // ═══════════════════════════════════════════════════════════════
    earnings: {
        // EOSB - End of Service Benefits
        eosb: {
            yearsOfService: { type: Number, default: 0 },
            monthlyWageBase: { type: Number, default: 0 },
            first5YearsAmount: { type: Number, default: 0 },
            after5YearsAmount: { type: Number, default: 0 },
            baseAmount: { type: Number, default: 0 },
            resignationDeductionPercent: { type: Number, default: 0 },
            resignationDeduction: { type: Number, default: 0 },
            specialCondition: String,
            finalAmount: { type: Number, default: 0 },
            calculationMethod: String,
            notes: [String]
        },

        // Unpaid Salary (pro-rated)
        unpaidSalary: {
            fromDate: Date,
            toDate: Date,
            workingDays: { type: Number, default: 0 },
            amount: { type: Number, default: 0 }
        },

        // Accrued Leave Encashment (Article 111)
        accruedLeave: {
            annualLeaveBalance: { type: Number, default: 0 },
            sickLeaveBalance: { type: Number, default: 0 },
            otherLeaveBalance: { type: Number, default: 0 },
            totalDays: { type: Number, default: 0 },
            dailyRate: { type: Number, default: 0 },
            amount: { type: Number, default: 0 }
        },

        // Overtime dues
        overtime: {
            hours: { type: Number, default: 0 },
            rate: { type: Number, default: 0 },
            amount: { type: Number, default: 0 }
        },

        // Bonus/Commission
        bonusCommission: {
            type: String,
            description: String,
            amount: { type: Number, default: 0 }
        },

        // Other earnings
        otherEarnings: [{
            description: String,
            amount: { type: Number, default: 0 }
        }],

        // Total earnings
        totalEarnings: { type: Number, default: 0 }
    },

    // ═══════════════════════════════════════════════════════════════
    // DEDUCTIONS - Dues FROM Employee
    // ═══════════════════════════════════════════════════════════════
    deductions: {
        // Advance balance
        advanceBalance: {
            description: String,
            amount: { type: Number, default: 0 }
        },

        // Loan balance
        loanBalance: {
            description: String,
            amount: { type: Number, default: 0 }
        },

        // Notice period compensation (if not served)
        noticePeriodCompensation: {
            daysNotServed: { type: Number, default: 0 },
            dailyRate: { type: Number, default: 0 },
            amount: { type: Number, default: 0 }
        },

        // Company property not returned
        unreturnedProperty: [{
            item: String,
            value: { type: Number, default: 0 }
        }],

        // Other deductions
        otherDeductions: [{
            description: String,
            amount: { type: Number, default: 0 }
        }],

        // Total deductions
        totalDeductions: { type: Number, default: 0 }
    },

    // ═══════════════════════════════════════════════════════════════
    // NET SETTLEMENT
    // ═══════════════════════════════════════════════════════════════
    netSettlement: { type: Number, default: 0 },
    netSettlementInWords: String,
    netSettlementInWordsArabic: String,

    // ═══════════════════════════════════════════════════════════════
    // PAYMENT TRACKING
    // ═══════════════════════════════════════════════════════════════
    payment: {
        status: {
            type: String,
            enum: ['pending', 'approved', 'processing', 'paid', 'cancelled'],
            default: 'pending'
        },
        dueDate: Date,
        paymentDate: Date,
        paymentMethod: {
            type: String,
            enum: ['bank_transfer', 'check', 'cash'],
            default: 'bank_transfer'
        },
        transactionReference: String,
        paymentNotes: String
    },

    // ═══════════════════════════════════════════════════════════════
    // CLEARANCE & DOCUMENTATION
    // ═══════════════════════════════════════════════════════════════
    clearance: {
        hrClearance: { completed: { type: Boolean, default: false }, date: Date, by: String },
        financeClearance: { completed: { type: Boolean, default: false }, date: Date, by: String },
        itClearance: { completed: { type: Boolean, default: false }, date: Date, by: String },
        adminClearance: { completed: { type: Boolean, default: false }, date: Date, by: String },
        allClearancesCompleted: { type: Boolean, default: false }
    },
    documents: {
        experienceLetterIssued: { type: Boolean, default: false },
        experienceLetterDate: Date,
        gosiDeregistration: { type: Boolean, default: false },
        gosiDeregistrationDate: Date,
        finalPayslip: { type: Boolean, default: false },
        settlementAcknowledgment: { type: Boolean, default: false },
        settlementAcknowledgmentDate: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // APPROVAL WORKFLOW
    // ═══════════════════════════════════════════════════════════════
    workflow: {
        calculatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        calculatedAt: Date,
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reviewedAt: Date,
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        approvedAt: Date,
        rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        rejectedAt: Date,
        rejectionReason: String
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT TRAIL
    // ═══════════════════════════════════════════════════════════════
    history: [{
        action: {
            type: String,
            enum: ['created', 'calculated', 'reviewed', 'approved', 'rejected', 'paid', 'modified']
        },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        performedAt: { type: Date, default: Date.now },
        details: String,
        previousValues: mongoose.Schema.Types.Mixed
    }],

    // Comments/Notes
    notes: String,
    internalNotes: String,

    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANCY
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
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
finalSettlementSchema.index({ firmId: 1, employeeId: 1 });
finalSettlementSchema.index({ firmId: 1, 'payment.status': 1 });
finalSettlementSchema.index({ firmId: 1, lastWorkingDay: 1 });
finalSettlementSchema.index({ lawyerId: 1, employeeId: 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

// Generate settlement number
finalSettlementSchema.pre('save', async function(next) {
    if (this.isNew && !this.settlementNumber) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { model: 'FinalSettlement', firmId: this.firmId },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            const year = new Date().getFullYear();
            this.settlementNumber = `FS-${year}-${String(counter.seq).padStart(5, '0')}`;
        } catch (error) {
            this.settlementNumber = `FS-${Date.now()}`;
        }
    }

    // Calculate totals
    this.calculateTotals();

    // Check if all clearances completed
    if (this.clearance) {
        this.clearance.allClearancesCompleted =
            this.clearance.hrClearance?.completed &&
            this.clearance.financeClearance?.completed &&
            this.clearance.itClearance?.completed &&
            this.clearance.adminClearance?.completed;
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// METHODS
// ═══════════════════════════════════════════════════════════════

// Calculate all totals
finalSettlementSchema.methods.calculateTotals = function() {
    // Calculate total earnings
    let totalEarnings = 0;
    totalEarnings += this.earnings.eosb?.finalAmount || 0;
    totalEarnings += this.earnings.unpaidSalary?.amount || 0;
    totalEarnings += this.earnings.accruedLeave?.amount || 0;
    totalEarnings += this.earnings.overtime?.amount || 0;
    totalEarnings += this.earnings.bonusCommission?.amount || 0;

    if (this.earnings.otherEarnings) {
        for (const earning of this.earnings.otherEarnings) {
            totalEarnings += earning.amount || 0;
        }
    }
    this.earnings.totalEarnings = totalEarnings;

    // Calculate total deductions
    let totalDeductions = 0;
    totalDeductions += this.deductions.advanceBalance?.amount || 0;
    totalDeductions += this.deductions.loanBalance?.amount || 0;
    totalDeductions += this.deductions.noticePeriodCompensation?.amount || 0;

    if (this.deductions.unreturnedProperty) {
        for (const item of this.deductions.unreturnedProperty) {
            totalDeductions += item.value || 0;
        }
    }
    if (this.deductions.otherDeductions) {
        for (const deduction of this.deductions.otherDeductions) {
            totalDeductions += deduction.amount || 0;
        }
    }
    this.deductions.totalDeductions = totalDeductions;

    // Calculate net settlement
    this.netSettlement = totalEarnings - totalDeductions;

    return this;
};

// Add to history
finalSettlementSchema.methods.addToHistory = function(action, userId, details, previousValues) {
    this.history.push({
        action,
        performedBy: userId,
        performedAt: new Date(),
        details,
        previousValues
    });
    return this;
};

// ═══════════════════════════════════════════════════════════════
// STATICS
// ═══════════════════════════════════════════════════════════════

// Get settlements for firm/lawyer
finalSettlementSchema.statics.getSettlements = function(firmQuery, filters = {}, options = {}) {
    const query = { ...firmQuery, ...filters };

    return this.find(query)
        .populate('employeeId', 'employeeId personalInfo.fullNameEnglish personalInfo.fullNameArabic')
        .populate('workflow.calculatedBy', 'firstName lastName')
        .populate('workflow.approvedBy', 'firstName lastName')
        .sort(options.sort || { createdAt: -1 })
        .limit(options.limit || 50);
};

// Get pending settlements
finalSettlementSchema.statics.getPendingSettlements = function(firmQuery) {
    return this.find({
        ...firmQuery,
        'payment.status': { $in: ['pending', 'approved'] }
    }).populate('employeeId', 'employeeId personalInfo.fullNameEnglish');
};

// Get settlement statistics
finalSettlementSchema.statics.getStats = async function(firmQuery, dateRange = {}) {
    const match = { ...firmQuery };

    if (dateRange.startDate) {
        match.lastWorkingDay = match.lastWorkingDay || {};
        match.lastWorkingDay.$gte = new Date(dateRange.startDate);
    }
    if (dateRange.endDate) {
        match.lastWorkingDay = match.lastWorkingDay || {};
        match.lastWorkingDay.$lte = new Date(dateRange.endDate);
    }

    const [stats] = await this.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                totalSettlements: { $sum: 1 },
                totalEOSB: { $sum: '$earnings.eosb.finalAmount' },
                totalLeaveEncashment: { $sum: '$earnings.accruedLeave.amount' },
                totalPaidOut: { $sum: '$netSettlement' },
                pendingCount: {
                    $sum: { $cond: [{ $eq: ['$payment.status', 'pending'] }, 1, 0] }
                },
                paidCount: {
                    $sum: { $cond: [{ $eq: ['$payment.status', 'paid'] }, 1, 0] }
                },
                byTerminationType: { $push: '$terminationType' }
            }
        }
    ]);

    return stats || {
        totalSettlements: 0,
        totalEOSB: 0,
        totalLeaveEncashment: 0,
        totalPaidOut: 0,
        pendingCount: 0,
        paidCount: 0
    };
};

finalSettlementSchema.set('toJSON', { virtuals: true });
finalSettlementSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('FinalSettlement', finalSettlementSchema);
