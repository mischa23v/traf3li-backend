/**
 * Employee Incentive Model
 *
 * Tracks performance-based incentives, spot awards, and recognition bonuses.
 * Supports various incentive types with approval workflows.
 *
 * Features:
 * - Multiple incentive types
 * - Performance-linked awards
 * - Approval workflow
 * - Payroll integration
 */

const mongoose = require('mongoose');
const Counter = require('./counter.model');

const employeeIncentiveSchema = new mongoose.Schema({
  // Unique identifier
  incentiveId: {
    type: String,
    unique: true,
    index: true
  },

  // Employee reference
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'Employee is required'],
    index: true
  },

  // Incentive details
  incentiveType: {
    type: String,
    enum: [
      'performance_bonus',
      'spot_award',
      'referral_bonus',
      'project_bonus',
      'sales_commission',
      'annual_bonus',
      'quarterly_bonus',
      'recognition_award',
      'innovation_award',
      'team_bonus',
      'other'
    ],
    required: true,
    index: true
  },
  incentiveName: {
    type: String,
    required: true,
    trim: true
  },
  description: String,

  // Financial details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'SAR'
  },
  calculationBasis: {
    type: String,
    enum: ['fixed', 'percentage_of_salary', 'percentage_of_target', 'custom'],
    default: 'fixed'
  },
  percentage: {
    type: Number,
    min: 0,
    max: 100
  },
  baseAmount: {
    type: Number,
    min: 0
  },

  // Period
  periodType: {
    type: String,
    enum: ['monthly', 'quarterly', 'half_yearly', 'annual', 'one_time'],
    default: 'one_time'
  },
  periodStartDate: Date,
  periodEndDate: Date,
  awardDate: {
    type: Date,
    required: true,
    index: true
  },
  paymentDate: Date,

  // Performance metrics (if applicable)
  performanceMetrics: {
    targetAchieved: Number, // Percentage
    rating: String,
    kpis: [{
      name: String,
      target: Number,
      achieved: Number,
      weight: Number
    }]
  },

  // Project/referral details (if applicable)
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  referredEmployee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  salesAmount: Number,

  // Status
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'rejected', 'processed', 'cancelled'],
    default: 'draft',
    index: true
  },

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

  // Tax details (usually exempt in Saudi Arabia)
  isTaxable: {
    type: Boolean,
    default: false
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number,
    default: 0
  },

  // Notes
  reason: String,
  notes: String,
  hrComments: String,

  // Attachments
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
employeeIncentiveSchema.index({ firmId: 1, employeeId: 1, awardDate: -1 });
employeeIncentiveSchema.index({ firmId: 1, incentiveType: 1, status: 1 });
employeeIncentiveSchema.index({ firmId: 1, payrollProcessed: 1 });

// Generate incentive ID before saving
employeeIncentiveSchema.pre('save', async function(next) {
  if (this.isNew && !this.incentiveId) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { model: 'EmployeeIncentive', firmId: this.firmId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.incentiveId = `INC-${String(counter.seq).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }

  // Calculate net amount
  this.netAmount = this.amount - (this.taxAmount || 0);

  next();
});

// Virtual for display
employeeIncentiveSchema.virtual('displayAmount').get(function() {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: this.currency
  }).format(this.amount);
});

// Methods
employeeIncentiveSchema.methods.approve = async function(userId, comments = '') {
  const currentLevel = this.approvalFlow.find(
    af => af.level === this.currentApprovalLevel && af.status === 'pending'
  );

  if (currentLevel) {
    currentLevel.status = 'approved';
    currentLevel.date = new Date();
    currentLevel.comments = comments;
    currentLevel.approver = userId;
  }

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

employeeIncentiveSchema.methods.reject = async function(userId, reason) {
  this.status = 'rejected';
  this.rejectedBy = userId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  this.updatedBy = userId;

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

employeeIncentiveSchema.methods.markAsProcessed = async function(payrollRunId, userId) {
  this.status = 'processed';
  this.payrollProcessed = true;
  this.payrollProcessedAt = new Date();
  this.payrollRunId = payrollRunId;
  this.updatedBy = userId;
  return this.save();
};

// Statics
employeeIncentiveSchema.statics.getEmployeeIncentives = function(firmId, employeeId, options = {}) {
  const query = { firmId, employeeId };

  if (options.status) query.status = options.status;
  if (options.incentiveType) query.incentiveType = options.incentiveType;
  if (options.year) {
    query.awardDate = {
      $gte: new Date(options.year, 0, 1),
      $lte: new Date(options.year, 11, 31)
    };
  }

  return this.find(query)
    .populate('approvedBy', 'name email')
    .sort({ awardDate: -1 });
};

employeeIncentiveSchema.statics.getPendingApprovals = function(firmId, approverId = null) {
  const query = {
    firmId,
    status: 'pending_approval'
  };

  if (approverId) {
    query['approvalFlow'] = {
      $elemMatch: {
        approver: approverId,
        status: 'pending'
      }
    };
  }

  return this.find(query)
    .populate('employeeId', 'employeeId firstName lastName')
    .sort({ createdAt: -1 });
};

employeeIncentiveSchema.statics.getUnprocessedForPayroll = function(firmId) {
  return this.find({
    firmId,
    status: 'approved',
    payrollProcessed: false
  })
    .populate('employeeId', 'employeeId firstName lastName')
    .sort({ awardDate: 1 });
};

employeeIncentiveSchema.statics.getIncentiveStats = async function(firmId, year) {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31);

  const byType = await this.aggregate([
    {
      $match: {
        firmId: mongoose.Types.ObjectId(firmId),
        awardDate: { $gte: startOfYear, $lte: endOfYear },
        status: { $in: ['approved', 'processed'] }
      }
    },
    {
      $group: {
        _id: '$incentiveType',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);

  const monthly = await this.aggregate([
    {
      $match: {
        firmId: mongoose.Types.ObjectId(firmId),
        awardDate: { $gte: startOfYear, $lte: endOfYear },
        status: { $in: ['approved', 'processed'] }
      }
    },
    {
      $group: {
        _id: { $month: '$awardDate' },
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const summary = await this.aggregate([
    {
      $match: {
        firmId: mongoose.Types.ObjectId(firmId),
        awardDate: { $gte: startOfYear, $lte: endOfYear },
        status: { $in: ['approved', 'processed'] }
      }
    },
    {
      $group: {
        _id: null,
        totalIncentives: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        avgAmount: { $avg: '$amount' }
      }
    }
  ]);

  return {
    byType,
    monthly,
    summary: summary[0] || { totalIncentives: 0, totalAmount: 0, avgAmount: 0 }
  };
};

employeeIncentiveSchema.set('toJSON', { virtuals: true });
employeeIncentiveSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('EmployeeIncentive', employeeIncentiveSchema);
