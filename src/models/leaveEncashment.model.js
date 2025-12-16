/**
 * Leave Encashment Model
 *
 * Handles leave encashment (converting unused leave to cash payment).
 * Saudi Labor Law Article 111: Employees are entitled to leave
 * encashment on termination of service.
 *
 * Features:
 * - Encashment calculation based on daily wage
 * - Support for partial and full encashment
 * - Integration with payroll system
 * - Termination and voluntary encashment types
 */

const mongoose = require('mongoose');
const Counter = require('./counter.model');

const leaveEncashmentSchema = new mongoose.Schema({
  // Unique identifier
  encashmentId: {
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
    index: true
  },
  leaveAllocationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaveAllocation',
    index: true
  },

  // Encashment details
  encashmentType: {
    type: String,
    enum: ['termination', 'voluntary', 'annual', 'carry_forward_excess'],
    required: true,
    index: true
  },

  // Leave days
  leavesAvailable: {
    type: Number,
    required: true,
    min: 0
  },
  leavesEncashed: {
    type: Number,
    required: true,
    min: 0
  },
  leavesAfterEncashment: {
    type: Number,
    default: 0,
    min: 0
  },

  // Financial calculation
  dailyWage: {
    type: Number,
    required: true,
    min: 0
  },
  encashmentRate: {
    type: Number,
    default: 1, // 100% of daily wage
    min: 0,
    max: 2
  },
  encashmentAmount: {
    type: Number,
    required: true,
    min: 0
  },

  // Deductions (if any)
  deductions: [{
    name: String,
    amount: Number,
    reason: String
  }],
  totalDeductions: {
    type: Number,
    default: 0,
    min: 0
  },
  netAmount: {
    type: Number,
    required: true,
    min: 0
  },

  // Currency
  currency: {
    type: String,
    default: 'SAR'
  },

  // Status and workflow
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'rejected', 'processed', 'cancelled'],
    default: 'draft',
    index: true
  },

  // Dates
  encashmentDate: {
    type: Date,
    required: true,
    index: true
  },
  paymentDate: Date,

  // Approval workflow
  approvalFlow: [{
    level: Number,
    approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'] },
    comments: String,
    date: Date
  }],
  currentApprovalLevel: {
    type: Number,
    default: 1
  },

  // Final approval
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

  // Payroll integration
  payrollRunId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PayrollRun'
  },
  payrollProcessed: {
    type: Boolean,
    default: false
  },
  payrollProcessedAt: Date,

  // Notes
  reason: String,
  notes: String,
  hrComments: String,

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
leaveEncashmentSchema.index({ firmId: 1, employeeId: 1, encashmentDate: -1 });
leaveEncashmentSchema.index({ firmId: 1, status: 1 });
leaveEncashmentSchema.index({ firmId: 1, payrollProcessed: 1 });

// Generate encashment ID before saving
leaveEncashmentSchema.pre('save', async function(next) {
  if (this.isNew && !this.encashmentId) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { model: 'LeaveEncashment', firmId: this.firmId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.encashmentId = `LE-${String(counter.seq).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }

  // Calculate amounts
  this.encashmentAmount = this.leavesEncashed * this.dailyWage * this.encashmentRate;
  this.totalDeductions = (this.deductions || []).reduce((sum, d) => sum + (d.amount || 0), 0);
  this.netAmount = this.encashmentAmount - this.totalDeductions;
  this.leavesAfterEncashment = this.leavesAvailable - this.leavesEncashed;

  next();
});

// Virtual for display
leaveEncashmentSchema.virtual('displayAmount').get(function() {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: this.currency
  }).format(this.netAmount);
});

// Methods
leaveEncashmentSchema.methods.approve = async function(userId, comments = '') {
  const currentLevel = this.approvalFlow.find(
    af => af.level === this.currentApprovalLevel && af.status === 'pending'
  );

  if (currentLevel) {
    currentLevel.status = 'approved';
    currentLevel.date = new Date();
    currentLevel.comments = comments;
    currentLevel.approver = userId;
  }

  // Check if this was the last approval level
  const pendingApprovals = this.approvalFlow.filter(af => af.status === 'pending');
  if (pendingApprovals.length === 0) {
    this.status = 'approved';
    this.approvedBy = userId;
    this.approvedAt = new Date();
  } else {
    this.currentApprovalLevel++;
  }

  this.updatedBy = userId;
  return this.save();
};

leaveEncashmentSchema.methods.reject = async function(userId, reason) {
  this.status = 'rejected';
  this.rejectedBy = userId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  this.updatedBy = userId;

  // Update current approval level
  const currentLevel = this.approvalFlow.find(
    af => af.level === this.currentApprovalLevel && af.status === 'pending'
  );
  if (currentLevel) {
    currentLevel.status = 'rejected';
    currentLevel.date = new Date();
    currentLevel.comments = reason;
  }

  return this.save();
};

leaveEncashmentSchema.methods.markAsProcessed = async function(payrollRunId, userId) {
  this.status = 'processed';
  this.payrollProcessed = true;
  this.payrollProcessedAt = new Date();
  this.payrollRunId = payrollRunId;
  this.updatedBy = userId;
  return this.save();
};

// Statics
leaveEncashmentSchema.statics.calculateDailyWage = async function(employeeId) {
  const Employee = mongoose.model('Employee');
  const employee = await Employee.findById(employeeId);

  if (!employee || !employee.basicSalary) {
    throw new Error('Employee salary information not found');
  }

  // Daily wage = Monthly salary / 30 (Saudi Labor Law standard)
  return employee.basicSalary / 30;
};

leaveEncashmentSchema.statics.getEmployeeEncashments = function(firmId, employeeId, options = {}) {
  const query = { firmId, employeeId };

  if (options.status) query.status = options.status;
  if (options.year) {
    const startOfYear = new Date(options.year, 0, 1);
    const endOfYear = new Date(options.year, 11, 31);
    query.encashmentDate = { $gte: startOfYear, $lte: endOfYear };
  }

  return this.find(query)
    .populate('leaveTypeId', 'name nameAr')
    .populate('approvedBy', 'name email')
    .sort({ encashmentDate: -1 });
};

leaveEncashmentSchema.statics.getPendingApprovals = function(firmId, approverId) {
  return this.find({
    firmId,
    status: 'pending_approval',
    'approvalFlow': {
      $elemMatch: {
        approver: approverId,
        status: 'pending'
      }
    }
  })
    .populate('employeeId', 'employeeId firstName lastName')
    .populate('leaveTypeId', 'name nameAr')
    .sort({ createdAt: -1 });
};

leaveEncashmentSchema.statics.getUnprocessedForPayroll = function(firmId) {
  return this.find({
    firmId,
    status: 'approved',
    payrollProcessed: false
  })
    .populate('employeeId', 'employeeId firstName lastName')
    .populate('leaveTypeId', 'name nameAr')
    .sort({ encashmentDate: 1 });
};

leaveEncashmentSchema.statics.getEncashmentStats = async function(firmId, year) {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31);

  const stats = await this.aggregate([
    {
      $match: {
        firmId: mongoose.Types.ObjectId(firmId),
        encashmentDate: { $gte: startOfYear, $lte: endOfYear },
        status: { $in: ['approved', 'processed'] }
      }
    },
    {
      $group: {
        _id: '$encashmentType',
        count: { $sum: 1 },
        totalDays: { $sum: '$leavesEncashed' },
        totalAmount: { $sum: '$netAmount' }
      }
    }
  ]);

  const summary = await this.aggregate([
    {
      $match: {
        firmId: mongoose.Types.ObjectId(firmId),
        encashmentDate: { $gte: startOfYear, $lte: endOfYear },
        status: { $in: ['approved', 'processed'] }
      }
    },
    {
      $group: {
        _id: null,
        totalEncashments: { $sum: 1 },
        totalDaysEncashed: { $sum: '$leavesEncashed' },
        totalAmountPaid: { $sum: '$netAmount' }
      }
    }
  ]);

  return {
    byType: stats,
    summary: summary[0] || { totalEncashments: 0, totalDaysEncashed: 0, totalAmountPaid: 0 }
  };
};

leaveEncashmentSchema.set('toJSON', { virtuals: true });
leaveEncashmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('LeaveEncashment', leaveEncashmentSchema);
