/**
 * Compensatory Leave Model
 *
 * Tracks compensatory leave (comp-off) earned by employees for
 * working on holidays, weekends, or extra hours.
 * Saudi Labor Law Article 106: Rest day work compensation.
 *
 * Features:
 * - Track work on rest days/holidays
 * - Expiry management for comp-off days
 * - Integration with leave allocation
 */

const mongoose = require('mongoose');
const Counter = require('./counter.model');

const compensatoryLeaveSchema = new mongoose.Schema({
  // Unique identifier
  compLeaveId: {
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
    index: true
  },

  // Work details
  workDate: {
    type: Date,
    required: [true, 'Work date is required'],
    index: true
  },
  workReason: {
    type: String,
    enum: ['holiday_work', 'weekend_work', 'overtime', 'emergency', 'project_deadline', 'other'],
    required: true
  },
  workReasonDetails: String,

  // Hours and days
  hoursWorked: {
    type: Number,
    required: true,
    min: 0,
    max: 24
  },
  daysEarned: {
    type: Number,
    required: true,
    min: 0
  },
  daysUsed: {
    type: Number,
    default: 0,
    min: 0
  },
  daysRemaining: {
    type: Number,
    default: 0
  },
  daysExpired: {
    type: Number,
    default: 0,
    min: 0
  },

  // Expiry
  expiryDate: {
    type: Date,
    required: true,
    index: true
  },
  isExpired: {
    type: Boolean,
    default: false,
    index: true
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'partially_used', 'fully_used', 'expired', 'cancelled'],
    default: 'pending',
    index: true
  },

  // Approval
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

  // Related leave requests (when used)
  usageHistory: [{
    leaveRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveRequest' },
    daysUsed: Number,
    usedOn: Date,
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],

  // Holiday/event reference (if applicable)
  holidayId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Holiday'
  },
  holidayName: String,

  // Notes
  notes: String,
  hrComments: String,

  // Attachments (proof of work)
  attachments: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: { type: Date, default: Date.now }
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
compensatoryLeaveSchema.index({ firmId: 1, employeeId: 1, workDate: -1 });
compensatoryLeaveSchema.index({ firmId: 1, employeeId: 1, status: 1 });
compensatoryLeaveSchema.index({ firmId: 1, expiryDate: 1, isExpired: 1 });

// Generate comp leave ID before saving
compensatoryLeaveSchema.pre('save', async function(next) {
  if (this.isNew && !this.compLeaveId) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { model: 'CompensatoryLeave', firmId: this.firmId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.compLeaveId = `CL-${String(counter.seq).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }

  // Calculate remaining days
  this.daysRemaining = this.daysEarned - this.daysUsed - this.daysExpired;

  // Update status based on usage
  if (this.status === 'approved' || this.status === 'partially_used') {
    if (this.daysRemaining <= 0) {
      this.status = 'fully_used';
    } else if (this.daysUsed > 0) {
      this.status = 'partially_used';
    }
  }

  // Check expiry
  if (this.expiryDate && new Date() > this.expiryDate && !this.isExpired) {
    this.isExpired = true;
    if (this.daysRemaining > 0 && this.status !== 'expired') {
      this.daysExpired += this.daysRemaining;
      this.daysRemaining = 0;
      this.status = 'expired';
    }
  }

  next();
});

// Virtual for display
compensatoryLeaveSchema.virtual('workDateFormatted').get(function() {
  return this.workDate ? this.workDate.toISOString().split('T')[0] : '';
});

compensatoryLeaveSchema.virtual('daysUntilExpiry').get(function() {
  if (!this.expiryDate || this.isExpired) return 0;
  const now = new Date();
  const diffTime = this.expiryDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// Methods
compensatoryLeaveSchema.methods.approve = async function(userId) {
  if (this.status !== 'pending') {
    throw new Error('Can only approve pending compensatory leave requests');
  }

  this.status = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  this.updatedBy = userId;

  return this.save();
};

compensatoryLeaveSchema.methods.reject = async function(userId, reason) {
  if (this.status !== 'pending') {
    throw new Error('Can only reject pending compensatory leave requests');
  }

  this.status = 'rejected';
  this.rejectedBy = userId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  this.updatedBy = userId;

  return this.save();
};

compensatoryLeaveSchema.methods.useLeave = async function(days, leaveRequestId, userId) {
  if (this.status !== 'approved' && this.status !== 'partially_used') {
    throw new Error('Compensatory leave must be approved before use');
  }

  if (this.isExpired) {
    throw new Error('Compensatory leave has expired');
  }

  if (days > this.daysRemaining) {
    throw new Error('Insufficient compensatory leave balance');
  }

  this.daysUsed += days;
  this.usageHistory.push({
    leaveRequestId,
    daysUsed: days,
    usedOn: new Date(),
    usedBy: userId
  });
  this.updatedBy = userId;

  return this.save();
};

compensatoryLeaveSchema.methods.revertUsage = async function(days, leaveRequestId, userId) {
  this.daysUsed = Math.max(0, this.daysUsed - days);

  // Remove from usage history
  this.usageHistory = this.usageHistory.filter(
    u => !u.leaveRequestId.equals(leaveRequestId)
  );

  // Update status
  if (this.daysUsed === 0 && this.status === 'fully_used') {
    this.status = 'approved';
  } else if (this.daysUsed < this.daysEarned && this.status === 'fully_used') {
    this.status = 'partially_used';
  }

  this.updatedBy = userId;
  return this.save();
};

// Statics
compensatoryLeaveSchema.statics.calculateDaysEarned = function(hoursWorked, workReason) {
  // Standard calculation: 8 hours = 1 day
  let baseDays = hoursWorked / 8;

  // Saudi Labor Law Article 106: Work on rest day earns 1.5x compensation
  const multipliers = {
    holiday_work: 1.5, // 1.5x for holiday work
    weekend_work: 1.5, // 1.5x for weekend (Friday) work
    overtime: 1.0, // 1x for regular overtime
    emergency: 1.5, // 1.5x for emergency work
    project_deadline: 1.0, // 1x for project deadlines
    other: 1.0 // 1x for other reasons
  };

  const multiplier = multipliers[workReason] || 1.0;
  return Math.round(baseDays * multiplier * 2) / 2; // Round to nearest 0.5
};

compensatoryLeaveSchema.statics.getDefaultExpiryDate = function(workDate, expiryDays = 90) {
  const expiry = new Date(workDate);
  expiry.setDate(expiry.getDate() + expiryDays);
  return expiry;
};

compensatoryLeaveSchema.statics.getEmployeeBalance = async function(firmId, employeeId) {
  const result = await this.aggregate([
    {
      $match: {
        firmId: mongoose.Types.ObjectId(firmId),
        employeeId: mongoose.Types.ObjectId(employeeId),
        status: { $in: ['approved', 'partially_used'] },
        isExpired: false
      }
    },
    {
      $group: {
        _id: null,
        totalEarned: { $sum: '$daysEarned' },
        totalUsed: { $sum: '$daysUsed' },
        totalRemaining: { $sum: '$daysRemaining' }
      }
    }
  ]);

  return result[0] || { totalEarned: 0, totalUsed: 0, totalRemaining: 0 };
};

compensatoryLeaveSchema.statics.getEmployeeCompLeaves = function(firmId, employeeId, options = {}) {
  const query = {
    firmId,
    employeeId,
    status: { $nin: ['rejected', 'cancelled'] }
  };

  if (options.includeExpired === false) {
    query.isExpired = false;
  }
  if (options.status) {
    query.status = options.status;
  }
  if (options.year) {
    const startOfYear = new Date(options.year, 0, 1);
    const endOfYear = new Date(options.year, 11, 31);
    query.workDate = { $gte: startOfYear, $lte: endOfYear };
  }

  return this.find(query)
    .populate('approvedBy', 'name email')
    .sort({ workDate: -1 });
};

compensatoryLeaveSchema.statics.getPendingApprovals = function(firmId) {
  return this.find({
    firmId,
    status: 'pending'
  })
    .populate('employeeId', 'employeeId firstName lastName')
    .sort({ createdAt: -1 });
};

compensatoryLeaveSchema.statics.getExpiringLeaves = function(firmId, daysThreshold = 7) {
  const now = new Date();
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

  return this.find({
    firmId,
    status: { $in: ['approved', 'partially_used'] },
    isExpired: false,
    expiryDate: { $gte: now, $lte: thresholdDate },
    daysRemaining: { $gt: 0 }
  })
    .populate('employeeId', 'employeeId firstName lastName email')
    .sort({ expiryDate: 1 });
};

compensatoryLeaveSchema.statics.expireOldLeaves = async function(firmId) {
  const now = new Date();

  const expiredLeaves = await this.find({
    firmId,
    status: { $in: ['approved', 'partially_used'] },
    isExpired: false,
    expiryDate: { $lt: now },
    daysRemaining: { $gt: 0 }
  });

  const results = [];
  for (const leave of expiredLeaves) {
    leave.isExpired = true;
    leave.daysExpired = leave.daysRemaining;
    leave.daysRemaining = 0;
    leave.status = leave.daysUsed > 0 ? 'fully_used' : 'expired';
    await leave.save();
    results.push(leave);
  }

  return results;
};

compensatoryLeaveSchema.set('toJSON', { virtuals: true });
compensatoryLeaveSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('CompensatoryLeave', compensatoryLeaveSchema);
