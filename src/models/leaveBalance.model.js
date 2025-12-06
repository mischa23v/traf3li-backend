const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Leave Balance Model
 * Tracks employee leave balances per year according to Saudi Labor Law
 */

const LeaveBalanceSchema = new Schema({
    // Employee Reference
    employeeId: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    employeeName: String,
    employeeNameAr: String,
    employeeNumber: String,

    // Year
    year: { type: Number, required: true },
    yearOfService: Number,

    // Annual Leave (المادة 109)
    // 21 days for < 5 years service, 30 days for >= 5 years
    annualLeave: {
        entitlement: { type: Number, default: 21 },
        used: { type: Number, default: 0 },
        pending: { type: Number, default: 0 },
        remaining: { type: Number, default: 21 },
        carriedForward: { type: Number, default: 0 },
        maxCarryForward: { type: Number, default: 0 },
        expiryDate: Date,
        accrualRate: { type: Number, default: 1.75 }, // days per month
        accruedToDate: { type: Number, default: 0 }
    },

    // Sick Leave (المادة 117)
    // First 30 days: 100% pay
    // Next 60 days: 75% pay
    // Last 30 days: 0% pay
    sickLeave: {
        fullPayEntitlement: { type: Number, default: 30 },
        fullPayUsed: { type: Number, default: 0 },
        fullPayRemaining: { type: Number, default: 30 },

        partialPayEntitlement: { type: Number, default: 60 },
        partialPayUsed: { type: Number, default: 0 },
        partialPayRemaining: { type: Number, default: 60 },
        partialPayPercentage: { type: Number, default: 75 },

        unpaidEntitlement: { type: Number, default: 30 },
        unpaidUsed: { type: Number, default: 0 },
        unpaidRemaining: { type: Number, default: 30 },

        totalEntitlement: { type: Number, default: 120 },
        totalUsed: { type: Number, default: 0 },
        totalRemaining: { type: Number, default: 120 }
    },

    // Hajj Leave (المادة 114)
    // 10-15 days, once only, requires 2+ years service
    hajjLeave: {
        entitlement: { type: Number, default: 15 },
        eligible: { type: Boolean, default: false },
        taken: { type: Boolean, default: false },
        takenDate: Date,
        daysUsed: { type: Number, default: 0 }
    },

    // Marriage Leave (المادة 113)
    // 3 days, one-time only
    marriageLeave: {
        entitlement: { type: Number, default: 3 },
        used: { type: Boolean, default: false },
        usedDate: Date
    },

    // Birth Leave (المادة 113)
    // 1 day for fathers
    birthLeave: {
        entitlement: { type: Number, default: 1 },
        used: { type: Number, default: 0 },
        remaining: { type: Number, default: 1 }
    },

    // Death Leave (المادة 113)
    // 3 days
    deathLeave: {
        entitlement: { type: Number, default: 3 },
        used: { type: Number, default: 0 },
        remaining: { type: Number, default: 3 },
        occurrences: { type: Number, default: 0 }
    },

    // Maternity Leave (المادة 151)
    // 10 weeks (70 days)
    maternityLeave: {
        entitlement: { type: Number, default: 70 },
        used: { type: Number, default: 0 },
        remaining: { type: Number, default: 70 },
        eligible: { type: Boolean, default: false }
    },

    // Paternity Leave
    // 3 days
    paternityLeave: {
        entitlement: { type: Number, default: 3 },
        used: { type: Number, default: 0 },
        remaining: { type: Number, default: 3 }
    },

    // Exam Leave (المادة 115)
    // Actual exam days
    examLeave: {
        used: { type: Number, default: 0 },
        occurrences: { type: Number, default: 0 }
    },

    // Unpaid Leave
    unpaidLeave: {
        used: { type: Number, default: 0 },
        approved: { type: Number, default: 0 }
    },

    // Total Statistics
    totalStats: {
        totalLeaveDaysTaken: { type: Number, default: 0 },
        totalPaidLeaveDays: { type: Number, default: 0 },
        totalUnpaidLeaveDays: { type: Number, default: 0 },
        totalLeaveRequests: { type: Number, default: 0 },
        approvedRequests: { type: Number, default: 0 },
        rejectedRequests: { type: Number, default: 0 },
        pendingRequests: { type: Number, default: 0 }
    },

    // Multi-tenancy
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },
    lawyerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // Audit
    lastUpdated: { type: Date, default: Date.now },
    lastUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User' }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound unique index
LeaveBalanceSchema.index({ employeeId: 1, year: 1 }, { unique: true });
LeaveBalanceSchema.index({ firmId: 1, year: 1 });
LeaveBalanceSchema.index({ lawyerId: 1, year: 1 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get or create balance for employee
LeaveBalanceSchema.statics.getOrCreateBalance = async function(employeeId, year, firmId, lawyerId) {
    let balance = await this.findOne({ employeeId, year });

    if (!balance) {
        // Get employee info
        const Employee = mongoose.model('Employee');
        const employee = await Employee.findById(employeeId);

        if (!employee) {
            throw new Error('Employee not found');
        }

        // Calculate years of service
        const yearsOfService = employee.yearsOfService || 0;
        const annualEntitlement = yearsOfService >= 5 ? 30 : 21;
        const hajjEligible = yearsOfService >= 2;

        // Check if hajj was taken in previous years
        const previousHajj = await this.findOne({
            employeeId,
            'hajjLeave.taken': true
        });

        balance = new this({
            employeeId,
            employeeName: employee.personalInfo?.fullNameEnglish || employee.personalInfo?.fullNameArabic,
            employeeNameAr: employee.personalInfo?.fullNameArabic,
            employeeNumber: employee.employeeId,
            year,
            yearOfService: yearsOfService,
            annualLeave: {
                entitlement: annualEntitlement,
                remaining: annualEntitlement,
                accrualRate: annualEntitlement / 12
            },
            hajjLeave: {
                eligible: hajjEligible && !previousHajj,
                taken: !!previousHajj
            },
            maternityLeave: {
                eligible: employee.personalInfo?.gender === 'female'
            },
            firmId,
            lawyerId
        });

        await balance.save();
    }

    return balance;
};

// Update balance after leave approval
LeaveBalanceSchema.statics.deductLeave = async function(employeeId, year, leaveType, days, firmId, lawyerId) {
    const balance = await this.getOrCreateBalance(employeeId, year, firmId, lawyerId);

    switch (leaveType) {
        case 'annual':
            balance.annualLeave.used += days;
            balance.annualLeave.remaining = balance.annualLeave.entitlement + balance.annualLeave.carriedForward - balance.annualLeave.used;
            break;

        case 'sick':
            // Determine which tier of sick leave
            const fullPayRemaining = balance.sickLeave.fullPayRemaining;
            const partialPayRemaining = balance.sickLeave.partialPayRemaining;

            if (days <= fullPayRemaining) {
                balance.sickLeave.fullPayUsed += days;
                balance.sickLeave.fullPayRemaining -= days;
            } else if (days <= fullPayRemaining + partialPayRemaining) {
                const fullPayDays = fullPayRemaining;
                const partialPayDays = days - fullPayDays;
                balance.sickLeave.fullPayUsed += fullPayDays;
                balance.sickLeave.fullPayRemaining = 0;
                balance.sickLeave.partialPayUsed += partialPayDays;
                balance.sickLeave.partialPayRemaining -= partialPayDays;
            } else {
                const fullPayDays = fullPayRemaining;
                const partialPayDays = partialPayRemaining;
                const unpaidDays = days - fullPayDays - partialPayDays;
                balance.sickLeave.fullPayUsed += fullPayDays;
                balance.sickLeave.fullPayRemaining = 0;
                balance.sickLeave.partialPayUsed += partialPayDays;
                balance.sickLeave.partialPayRemaining = 0;
                balance.sickLeave.unpaidUsed += unpaidDays;
                balance.sickLeave.unpaidRemaining -= unpaidDays;
            }
            balance.sickLeave.totalUsed += days;
            balance.sickLeave.totalRemaining = balance.sickLeave.totalEntitlement - balance.sickLeave.totalUsed;
            break;

        case 'hajj':
            balance.hajjLeave.taken = true;
            balance.hajjLeave.takenDate = new Date();
            balance.hajjLeave.daysUsed = days;
            break;

        case 'marriage':
            balance.marriageLeave.used = true;
            balance.marriageLeave.usedDate = new Date();
            break;

        case 'birth':
            balance.birthLeave.used += days;
            balance.birthLeave.remaining = Math.max(0, balance.birthLeave.entitlement - balance.birthLeave.used);
            break;

        case 'death':
            balance.deathLeave.used += days;
            balance.deathLeave.remaining = Math.max(0, balance.deathLeave.entitlement - balance.deathLeave.used);
            balance.deathLeave.occurrences += 1;
            break;

        case 'maternity':
            balance.maternityLeave.used += days;
            balance.maternityLeave.remaining = Math.max(0, balance.maternityLeave.entitlement - balance.maternityLeave.used);
            break;

        case 'paternity':
            balance.paternityLeave.used += days;
            balance.paternityLeave.remaining = Math.max(0, balance.paternityLeave.entitlement - balance.paternityLeave.used);
            break;

        case 'exam':
            balance.examLeave.used += days;
            balance.examLeave.occurrences += 1;
            break;

        case 'unpaid':
            balance.unpaidLeave.used += days;
            balance.unpaidLeave.approved += 1;
            break;
    }

    // Update total stats
    balance.totalStats.totalLeaveDaysTaken += days;
    if (leaveType !== 'unpaid') {
        balance.totalStats.totalPaidLeaveDays += days;
    } else {
        balance.totalStats.totalUnpaidLeaveDays += days;
    }
    balance.totalStats.approvedRequests += 1;

    balance.lastUpdated = new Date();
    await balance.save();

    return balance;
};

// Restore balance after leave cancellation
LeaveBalanceSchema.statics.restoreLeave = async function(employeeId, year, leaveType, days, firmId, lawyerId) {
    const balance = await this.getOrCreateBalance(employeeId, year, firmId, lawyerId);

    switch (leaveType) {
        case 'annual':
            balance.annualLeave.used = Math.max(0, balance.annualLeave.used - days);
            balance.annualLeave.remaining = balance.annualLeave.entitlement + balance.annualLeave.carriedForward - balance.annualLeave.used;
            break;

        case 'sick':
            balance.sickLeave.totalUsed = Math.max(0, balance.sickLeave.totalUsed - days);
            balance.sickLeave.totalRemaining = balance.sickLeave.totalEntitlement - balance.sickLeave.totalUsed;
            break;

        case 'hajj':
            balance.hajjLeave.taken = false;
            balance.hajjLeave.takenDate = null;
            balance.hajjLeave.daysUsed = 0;
            break;

        case 'marriage':
            balance.marriageLeave.used = false;
            balance.marriageLeave.usedDate = null;
            break;

        case 'birth':
            balance.birthLeave.used = Math.max(0, balance.birthLeave.used - days);
            balance.birthLeave.remaining = balance.birthLeave.entitlement - balance.birthLeave.used;
            break;

        case 'death':
            balance.deathLeave.used = Math.max(0, balance.deathLeave.used - days);
            balance.deathLeave.remaining = balance.deathLeave.entitlement - balance.deathLeave.used;
            break;

        case 'maternity':
            balance.maternityLeave.used = Math.max(0, balance.maternityLeave.used - days);
            balance.maternityLeave.remaining = balance.maternityLeave.entitlement - balance.maternityLeave.used;
            break;

        case 'paternity':
            balance.paternityLeave.used = Math.max(0, balance.paternityLeave.used - days);
            balance.paternityLeave.remaining = balance.paternityLeave.entitlement - balance.paternityLeave.used;
            break;

        case 'exam':
            balance.examLeave.used = Math.max(0, balance.examLeave.used - days);
            break;

        case 'unpaid':
            balance.unpaidLeave.used = Math.max(0, balance.unpaidLeave.used - days);
            break;
    }

    // Update total stats
    balance.totalStats.totalLeaveDaysTaken = Math.max(0, balance.totalStats.totalLeaveDaysTaken - days);
    if (leaveType !== 'unpaid') {
        balance.totalStats.totalPaidLeaveDays = Math.max(0, balance.totalStats.totalPaidLeaveDays - days);
    } else {
        balance.totalStats.totalUnpaidLeaveDays = Math.max(0, balance.totalStats.totalUnpaidLeaveDays - days);
    }

    balance.lastUpdated = new Date();
    await balance.save();

    return balance;
};

// Carry forward balance to new year
LeaveBalanceSchema.statics.carryForwardBalance = async function(employeeId, fromYear, toYear, maxCarryForward, firmId, lawyerId) {
    const fromBalance = await this.findOne({ employeeId, year: fromYear });

    if (!fromBalance) {
        return null;
    }

    const carryForwardDays = Math.min(fromBalance.annualLeave.remaining, maxCarryForward || 0);

    const toBalance = await this.getOrCreateBalance(employeeId, toYear, firmId, lawyerId);
    toBalance.annualLeave.carriedForward = carryForwardDays;
    toBalance.annualLeave.remaining = toBalance.annualLeave.entitlement + carryForwardDays - toBalance.annualLeave.used;

    await toBalance.save();

    return toBalance;
};

module.exports = mongoose.model('LeaveBalance', LeaveBalanceSchema);
