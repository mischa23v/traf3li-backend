/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  ⚠️  SAUDI LABOR LAW COMPLIANCE - DO NOT MODIFY WITHOUT LEGAL REVIEW  ⚠️    ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                               ║
 * ║  Leave Allocation tracking per Saudi Labor Law:                               ║
 * ║  - Sick Leave Tiers (Article 117):                                           ║
 * ║    • Tier 1: First 30 days - 100% pay                                        ║
 * ║    • Tier 2: Next 60 days - 50% pay (was 75%, now 50%)                       ║
 * ║    • Tier 3: Final 30 days - 0% pay                                          ║
 * ║    • Total: 120 days per year                                                ║
 * ║  - Hajj Leave (Article 114): Once per employer, tracked separately           ║
 * ║                                                                               ║
 * ║  Official sources: hrsd.gov.sa, mol.gov.sa                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * Leave Allocation Model
 *
 * Tracks leave allocations for employees per leave period.
 * Supports carry forward and earned leave accrual.
 */

const mongoose = require('mongoose');
const Counter = require('./counter.model');

const leaveAllocationSchema = new mongoose.Schema({
  // Unique identifier
  allocationId: {
    type: String,
    unique: true,
    index: true
  },

  // References
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'Employee is required'],
    index: true
  },
  leaveTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaveType',
    required: [true, 'Leave type is required'],
    index: true
  },
  leavePeriodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeavePeriod',
    required: [true, 'Leave period is required'],
    index: true
  },
  leavePolicyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeavePolicy'
  },

  // Allocation details
  newLeavesAllocated: {
    type: Number,
    required: true,
    min: 0
  },
  carryForwardedLeaves: {
    type: Number,
    default: 0,
    min: 0
  },
  compensatoryLeaves: {
    type: Number,
    default: 0,
    min: 0
  },
  totalLeavesAllocated: {
    type: Number,
    default: 0
  },

  // Usage tracking
  leavesUsed: {
    type: Number,
    default: 0,
    min: 0
  },
  leavesEncashed: {
    type: Number,
    default: 0,
    min: 0
  },
  leavesExpired: {
    type: Number,
    default: 0,
    min: 0
  },
  leavesBalance: {
    type: Number,
    default: 0
  },

  // Pending leaves (approved but not yet taken)
  leavesPending: {
    type: Number,
    default: 0,
    min: 0
  },

  // ═══════════════════════════════════════════════════════════════
  // SICK LEAVE TIER TRACKING - Article 117
  // ⚠️ Saudi Labor Law mandates 3-tier sick leave:
  // - Tier 1: First 30 days at 100% pay
  // - Tier 2: Next 60 days at 50% pay
  // - Tier 3: Final 30 days at 0% pay (unpaid)
  // ═══════════════════════════════════════════════════════════════
  sickLeaveTiers: {
    // Tier 1: 30 days at 100% pay
    tier1: {
      maxDays: { type: Number, default: 30 },
      usedDays: { type: Number, default: 0, min: 0 },
      remainingDays: { type: Number, default: 30 },
      payPercentage: { type: Number, default: 100 }
    },
    // Tier 2: 60 days at 50% pay (was 75% before 2024 update)
    tier2: {
      maxDays: { type: Number, default: 60 },
      usedDays: { type: Number, default: 0, min: 0 },
      remainingDays: { type: Number, default: 60 },
      payPercentage: { type: Number, default: 50 }
    },
    // Tier 3: 30 days at 0% pay (unpaid)
    tier3: {
      maxDays: { type: Number, default: 30 },
      usedDays: { type: Number, default: 0, min: 0 },
      remainingDays: { type: Number, default: 30 },
      payPercentage: { type: Number, default: 0 }
    },
    // Total tracking
    totalMaxDays: { type: Number, default: 120 },
    totalUsedDays: { type: Number, default: 0 },
    totalRemainingDays: { type: Number, default: 120 }
  },

  // ═══════════════════════════════════════════════════════════════
  // HAJJ LEAVE TRACKING - Article 114
  // ⚠️ Hajj leave can only be taken ONCE per employer
  // Employee must have at least 2 years of service
  // ═══════════════════════════════════════════════════════════════
  hajjLeaveTracking: {
    usedWithCurrentEmployer: { type: Boolean, default: false },
    usedDate: Date,
    hijriYear: String, // Hijri year when Hajj was performed
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },

  // Dates
  fromDate: {
    type: Date,
    required: true,
    index: true
  },
  toDate: {
    type: Date,
    required: true,
    index: true
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'cancelled'],
    default: 'draft',
    index: true
  },

  // Approval
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,

  // Notes
  notes: String,
  allocationReason: String,

  // Adjustment history
  adjustments: [{
    date: { type: Date, default: Date.now },
    type: { type: String, enum: ['add', 'deduct', 'carry_forward', 'encash', 'expire'] },
    days: Number,
    reason: String,
    adjustedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],

  // Firm reference (multi-tenant)
  firmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Firm',
    required: true,
    index: true
   },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
  // Metadata
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

// Compound indexes
leaveAllocationSchema.index({ firmId: 1, employeeId: 1, leavePeriodId: 1, leaveTypeId: 1 }, { unique: true });
leaveAllocationSchema.index({ firmId: 1, employeeId: 1, status: 1 });

// Generate allocation ID before saving
leaveAllocationSchema.pre('save', async function(next) {
  if (this.isNew && !this.allocationId) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { model: 'LeaveAllocation', firmId: this.firmId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.allocationId = `LA-${String(counter.seq).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }

  // Calculate totals
  this.totalLeavesAllocated = (this.newLeavesAllocated || 0) +
    (this.carryForwardedLeaves || 0) +
    (this.compensatoryLeaves || 0);

  this.leavesBalance = this.totalLeavesAllocated -
    (this.leavesUsed || 0) -
    (this.leavesEncashed || 0) -
    (this.leavesExpired || 0) -
    (this.leavesPending || 0);

  next();
});

// Methods
leaveAllocationSchema.methods.adjustAllocation = async function(type, days, reason, userId) {
  const adjustment = {
    type,
    days,
    reason,
    adjustedBy: userId,
    date: new Date()
  };

  switch (type) {
    case 'add':
      this.newLeavesAllocated += days;
      break;
    case 'deduct':
      this.newLeavesAllocated = Math.max(0, this.newLeavesAllocated - days);
      break;
    case 'carry_forward':
      this.carryForwardedLeaves += days;
      break;
    case 'encash':
      this.leavesEncashed += days;
      break;
    case 'expire':
      this.leavesExpired += days;
      break;
  }

  this.adjustments.push(adjustment);
  this.updatedBy = userId;

  return this.save();
};

leaveAllocationSchema.methods.useLeaves = function(days) {
  if (this.leavesBalance < days) {
    throw new Error('Insufficient leave balance');
  }
  this.leavesUsed += days;
  return this.save();
};

leaveAllocationSchema.methods.reserveLeaves = function(days) {
  if (this.leavesBalance < days) {
    throw new Error('Insufficient leave balance');
  }
  this.leavesPending += days;
  return this.save();
};

leaveAllocationSchema.methods.releaseReservedLeaves = function(days) {
  this.leavesPending = Math.max(0, this.leavesPending - days);
  return this.save();
};

/**
 * Use sick leave with tier tracking
 * Automatically distributes days across tiers per Article 117
 *
 * @param {Number} days - Number of sick leave days to use
 * @returns {Object} - Breakdown of days used per tier with pay percentages
 */
leaveAllocationSchema.methods.useSickLeave = function(days) {
  if (!this.sickLeaveTiers) {
    this.sickLeaveTiers = {
      tier1: { maxDays: 30, usedDays: 0, remainingDays: 30, payPercentage: 100 },
      tier2: { maxDays: 60, usedDays: 0, remainingDays: 60, payPercentage: 50 },
      tier3: { maxDays: 30, usedDays: 0, remainingDays: 30, payPercentage: 0 },
      totalMaxDays: 120,
      totalUsedDays: 0,
      totalRemainingDays: 120
    };
  }

  const tiers = this.sickLeaveTiers;
  let remainingDays = days;
  const breakdown = {
    tier1Days: 0,
    tier2Days: 0,
    tier3Days: 0,
    totalDays: days,
    payCalculation: {
      fullPay: 0,    // 100%
      halfPay: 0,    // 50%
      noPay: 0       // 0%
    },
    error: null
  };

  // Check if enough sick leave balance
  if (days > tiers.totalRemainingDays) {
    breakdown.error = `Insufficient sick leave. Requested: ${days}, Available: ${tiers.totalRemainingDays}`;
    return breakdown;
  }

  // Tier 1: 100% pay (first 30 days)
  if (remainingDays > 0 && tiers.tier1.remainingDays > 0) {
    const useDays = Math.min(remainingDays, tiers.tier1.remainingDays);
    tiers.tier1.usedDays += useDays;
    tiers.tier1.remainingDays -= useDays;
    breakdown.tier1Days = useDays;
    breakdown.payCalculation.fullPay = useDays;
    remainingDays -= useDays;
  }

  // Tier 2: 50% pay (next 60 days)
  if (remainingDays > 0 && tiers.tier2.remainingDays > 0) {
    const useDays = Math.min(remainingDays, tiers.tier2.remainingDays);
    tiers.tier2.usedDays += useDays;
    tiers.tier2.remainingDays -= useDays;
    breakdown.tier2Days = useDays;
    breakdown.payCalculation.halfPay = useDays;
    remainingDays -= useDays;
  }

  // Tier 3: 0% pay (final 30 days)
  if (remainingDays > 0 && tiers.tier3.remainingDays > 0) {
    const useDays = Math.min(remainingDays, tiers.tier3.remainingDays);
    tiers.tier3.usedDays += useDays;
    tiers.tier3.remainingDays -= useDays;
    breakdown.tier3Days = useDays;
    breakdown.payCalculation.noPay = useDays;
    remainingDays -= useDays;
  }

  // Update totals
  tiers.totalUsedDays = tiers.tier1.usedDays + tiers.tier2.usedDays + tiers.tier3.usedDays;
  tiers.totalRemainingDays = tiers.tier1.remainingDays + tiers.tier2.remainingDays + tiers.tier3.remainingDays;

  // Update general leave tracking
  this.leavesUsed += days;

  return breakdown;
};

/**
 * Preview sick leave pay calculation WITHOUT modifying the allocation
 * Use this for displaying pay breakdown to users before they confirm
 *
 * @param {Number} days - Days to calculate
 * @param {Number} dailyRate - Daily salary rate
 * @returns {Object} - Pay calculation breakdown (read-only preview)
 */
leaveAllocationSchema.methods.previewSickLeavePay = function(days, dailyRate) {
  const tiers = this.sickLeaveTiers || {
    tier1: { remainingDays: 30 },
    tier2: { remainingDays: 60 },
    tier3: { remainingDays: 30 },
    totalRemainingDays: 120
  };

  let remainingDays = days;
  const breakdown = {
    tier1Days: 0,
    tier2Days: 0,
    tier3Days: 0,
    totalDays: days,
    error: null
  };

  // Check if enough sick leave balance
  if (days > tiers.totalRemainingDays) {
    return {
      error: `Insufficient sick leave. Requested: ${days}, Available: ${tiers.totalRemainingDays}`,
      totalPay: 0
    };
  }

  // Simulate tier distribution (without modifying)
  if (remainingDays > 0 && tiers.tier1.remainingDays > 0) {
    breakdown.tier1Days = Math.min(remainingDays, tiers.tier1.remainingDays);
    remainingDays -= breakdown.tier1Days;
  }
  if (remainingDays > 0 && tiers.tier2.remainingDays > 0) {
    breakdown.tier2Days = Math.min(remainingDays, tiers.tier2.remainingDays);
    remainingDays -= breakdown.tier2Days;
  }
  if (remainingDays > 0 && tiers.tier3.remainingDays > 0) {
    breakdown.tier3Days = Math.min(remainingDays, tiers.tier3.remainingDays);
  }

  const pay = {
    tier1Pay: breakdown.tier1Days * dailyRate * 1.00, // 100%
    tier2Pay: breakdown.tier2Days * dailyRate * 0.50,  // 50%
    tier3Pay: breakdown.tier3Days * dailyRate * 0.00,    // 0%
    totalPay: 0,
    breakdown,
    isPreview: true
  };

  pay.totalPay = pay.tier1Pay + pay.tier2Pay + pay.tier3Pay;

  return pay;
};

/**
 * Apply sick leave and calculate pay (modifies the allocation)
 * Use this when actually processing the leave request
 *
 * @param {Number} days - Days to calculate
 * @param {Number} dailyRate - Daily salary rate
 * @returns {Object} - Pay calculation breakdown
 */
leaveAllocationSchema.methods.applySickLeaveWithPay = function(days, dailyRate) {
  const breakdown = this.useSickLeave(days);

  if (breakdown.error) {
    return { error: breakdown.error, totalPay: 0 };
  }

  const pay = {
    tier1Pay: breakdown.payCalculation.fullPay * dailyRate * 1.00, // 100%
    tier2Pay: breakdown.payCalculation.halfPay * dailyRate * 0.50,  // 50%
    tier3Pay: breakdown.payCalculation.noPay * dailyRate * 0.00,    // 0%
    totalPay: 0,
    breakdown,
    isPreview: false
  };

  pay.totalPay = pay.tier1Pay + pay.tier2Pay + pay.tier3Pay;

  return pay;
};

/**
 * Mark Hajj leave as used for this employee
 * Hajj can only be taken ONCE per employer (Article 114)
 *
 * @param {ObjectId} approvedBy - User who approved the Hajj leave
 * @param {String} hijriYear - Hijri year when Hajj is performed
 * @returns {Object} - Result
 */
leaveAllocationSchema.methods.markHajjLeaveUsed = function(approvedBy, hijriYear) {
  if (!this.hajjLeaveTracking) {
    this.hajjLeaveTracking = {};
  }

  if (this.hajjLeaveTracking.usedWithCurrentEmployer) {
    return {
      success: false,
      error: 'Hajj leave has already been used with this employer (Article 114)'
    };
  }

  this.hajjLeaveTracking.usedWithCurrentEmployer = true;
  this.hajjLeaveTracking.usedDate = new Date();
  this.hajjLeaveTracking.hijriYear = hijriYear;
  this.hajjLeaveTracking.approvedBy = approvedBy;

  return { success: true };
};

// Statics
leaveAllocationSchema.statics.getAllocationForEmployee = function(firmId, employeeId, leaveTypeId, leavePeriodId) {
  return this.findOne({
    firmId,
    employeeId,
    leaveTypeId,
    leavePeriodId,
    status: 'approved'
  });
};

leaveAllocationSchema.statics.getEmployeeAllocations = function(firmId, employeeId, leavePeriodId) {
  const query = { firmId, employeeId, status: 'approved' };
  if (leavePeriodId) {
    query.leavePeriodId = leavePeriodId;
  }

  return this.find(query)
    .populate('leaveTypeId', 'name nameAr')
    .populate('leavePeriodId', 'name startDate endDate');
};

leaveAllocationSchema.statics.getEmployeeBalance = async function(firmId, employeeId, leaveTypeId) {
  const allocation = await this.findOne({
    firmId,
    employeeId,
    leaveTypeId,
    status: 'approved',
    fromDate: { $lte: new Date() },
    toDate: { $gte: new Date() }
  });

  return allocation?.leavesBalance || 0;
};

leaveAllocationSchema.statics.bulkAllocate = async function(firmId, leavePeriodId, allocations, createdBy) {
  const docs = allocations.map(alloc => ({
    ...alloc,
    firmId,
    leavePeriodId,
    status: 'approved',
    createdBy,
    approvedBy: createdBy,
    approvedAt: new Date()
  }));

  return this.insertMany(docs);
};

leaveAllocationSchema.set('toJSON', { virtuals: true });
leaveAllocationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('LeaveAllocation', leaveAllocationSchema);
