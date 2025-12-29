/**
 * Retention Bonus Model
 *
 * Manages retention bonuses for key employees to prevent turnover.
 * Supports milestone-based and tenure-based retention incentives.
 *
 * Features:
 * - Vesting schedules
 * - Milestone tracking
 * - Clawback provisions
 * - Multi-currency support
 */

const mongoose = require('mongoose');
const Counter = require('./counter.model');

const vestingScheduleSchema = new mongoose.Schema({
  milestoneNumber: Number,
  vestingDate: Date,
  vestingPercentage: Number,
  vestingAmount: Number,
  status: {
    type: String,
    enum: ['pending', 'vested', 'forfeited'],
    default: 'pending'
  },
  vestedAt: Date,
  notes: String
});

const retentionBonusSchema = new mongoose.Schema({
  // Unique identifier
  bonusId: {
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

  // Bonus details
  bonusName: {
    type: String,
    required: true,
    trim: true
  },
  bonusType: {
    type: String,
    enum: ['tenure_based', 'milestone_based', 'project_completion', 'critical_role', 'counter_offer'],
    required: true
  },

  // Financial details
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'SAR'
  },
  paymentMode: {
    type: String,
    enum: ['lump_sum', 'installments', 'vesting'],
    default: 'vesting'
  },

  // Vesting
  vestingPeriodMonths: {
    type: Number,
    default: 12
  },
  vestingSchedule: [vestingScheduleSchema],
  totalVested: {
    type: Number,
    default: 0
  },
  totalPaid: {
    type: Number,
    default: 0
  },
  totalForfeited: {
    type: Number,
    default: 0
  },

  // Dates
  agreementDate: {
    type: Date,
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    required: true,
    index: true
  },

  // Retention conditions
  retentionConditions: {
    minimumTenureMonths: { type: Number, default: 12 },
    performanceRatingRequired: String,
    projectCompletion: [String],
    otherConditions: [String]
  },

  // Clawback provisions
  hasClawback: {
    type: Boolean,
    default: true
  },
  clawbackPercentage: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },
  clawbackPeriodMonths: {
    type: Number,
    default: 12
  },
  clawbackConditions: [String],

  // Status
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'active', 'completed', 'forfeited', 'cancelled'],
    default: 'draft',
    index: true
  },

  // Approval
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,

  // Forfeiture details
  forfeitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  forfeitedAt: Date,
  forfeitureReason: String,

  // Notes
  reason: String,
  notes: String,
  hrComments: String,

  // Attachments (agreement documents)
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
retentionBonusSchema.index({ firmId: 1, employeeId: 1, status: 1 });
retentionBonusSchema.index({ firmId: 1, endDate: 1 });

// Generate bonus ID before saving
retentionBonusSchema.pre('save', async function(next) {
  if (this.isNew && !this.bonusId) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { model: 'RetentionBonus', firmId: this.firmId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.bonusId = `RB-${String(counter.seq).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }

  // Generate vesting schedule if not exists
  if (this.isNew && this.paymentMode === 'vesting' && (!this.vestingSchedule || this.vestingSchedule.length === 0)) {
    this.generateVestingSchedule();
  }

  // Calculate totals
  this.calculateTotals();

  next();
});

// Methods
retentionBonusSchema.methods.generateVestingSchedule = function() {
  const vestingIntervalMonths = this.vestingPeriodMonths >= 12 ? 3 : 1; // Quarterly for annual, monthly otherwise
  const numberOfMilestones = Math.ceil(this.vestingPeriodMonths / vestingIntervalMonths);
  const percentagePerMilestone = 100 / numberOfMilestones;
  const amountPerMilestone = this.totalAmount / numberOfMilestones;

  this.vestingSchedule = [];

  for (let i = 1; i <= numberOfMilestones; i++) {
    const vestingDate = new Date(this.startDate);
    vestingDate.setMonth(vestingDate.getMonth() + (i * vestingIntervalMonths));

    this.vestingSchedule.push({
      milestoneNumber: i,
      vestingDate,
      vestingPercentage: percentagePerMilestone,
      vestingAmount: amountPerMilestone,
      status: 'pending'
    });
  }
};

retentionBonusSchema.methods.calculateTotals = function() {
  if (!this.vestingSchedule || this.vestingSchedule.length === 0) return;

  this.totalVested = this.vestingSchedule
    .filter(v => v.status === 'vested')
    .reduce((sum, v) => sum + v.vestingAmount, 0);

  this.totalForfeited = this.vestingSchedule
    .filter(v => v.status === 'forfeited')
    .reduce((sum, v) => sum + v.vestingAmount, 0);
};

retentionBonusSchema.methods.vestMilestone = async function(milestoneNumber, userId) {
  const milestone = this.vestingSchedule.find(v => v.milestoneNumber === milestoneNumber);
  if (!milestone) {
    throw new Error('Milestone not found');
  }

  if (milestone.status !== 'pending') {
    throw new Error('Milestone is not pending');
  }

  milestone.status = 'vested';
  milestone.vestedAt = new Date();

  this.updatedBy = userId;
  return this.save();
};

retentionBonusSchema.methods.forfeit = async function(userId, reason) {
  // Forfeit all pending milestones
  this.vestingSchedule.forEach(v => {
    if (v.status === 'pending') {
      v.status = 'forfeited';
    }
  });

  this.status = 'forfeited';
  this.forfeitedBy = userId;
  this.forfeitedAt = new Date();
  this.forfeitureReason = reason;
  this.updatedBy = userId;

  return this.save();
};

retentionBonusSchema.methods.approve = async function(userId) {
  this.status = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  this.updatedBy = userId;
  return this.save();
};

retentionBonusSchema.methods.activate = async function(userId) {
  if (this.status !== 'approved') {
    throw new Error('Bonus must be approved before activation');
  }

  this.status = 'active';
  this.updatedBy = userId;
  return this.save();
};

// Statics
retentionBonusSchema.statics.getEmployeeBonuses = function(firmId, employeeId) {
  return this.find({ firmId, employeeId })
    .populate('approvedBy', 'name email')
    .sort({ startDate: -1 });
};

retentionBonusSchema.statics.getActiveBonuses = function(firmId) {
  return this.find({
    firmId,
    status: 'active'
  })
    .populate('employeeId', 'employeeId firstName lastName')
    .sort({ endDate: 1 });
};

retentionBonusSchema.statics.getUpcomingVestings = async function(firmId, daysAhead = 30) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return this.find({
    firmId,
    status: 'active',
    'vestingSchedule': {
      $elemMatch: {
        status: 'pending',
        vestingDate: { $gte: now, $lte: futureDate }
      }
    }
  })
    .populate('employeeId', 'employeeId firstName lastName email')
    .sort({ 'vestingSchedule.vestingDate': 1 });
};

retentionBonusSchema.statics.getBonusSummary = async function(firmId, year = null) {
  const match = { firmId: mongoose.Types.ObjectId(firmId) };
  if (year) {
    match.startDate = {
      $gte: new Date(year, 0, 1),
      $lte: new Date(year, 11, 31)
    };
  }

  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        totalVested: { $sum: '$totalVested' },
        totalForfeited: { $sum: '$totalForfeited' }
      }
    }
  ]);

  return result;
};

retentionBonusSchema.set('toJSON', { virtuals: true });
retentionBonusSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('RetentionBonus', retentionBonusSchema);
