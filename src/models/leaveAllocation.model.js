/**
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
