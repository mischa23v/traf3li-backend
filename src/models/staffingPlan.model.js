/**
 * Staffing Plan Model
 *
 * Workforce planning and staffing requirements tracking.
 * Helps HR plan for future hiring needs based on business growth.
 *
 * Features:
 * - Department-wise staffing plans
 * - Budget allocation
 * - Vacancy tracking
 * - Timeline-based planning
 */

const mongoose = require('mongoose');
const Counter = require('./counter.model');

const staffingPlanDetailSchema = new mongoose.Schema({
  designation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designation',
    required: true
  },
  currentCount: {
    type: Number,
    default: 0,
    min: 0
  },
  plannedCount: {
    type: Number,
    required: true,
    min: 0
  },
  vacancies: {
    type: Number,
    default: 0,
    min: 0
  },
  filledCount: {
    type: Number,
    default: 0,
    min: 0
  },
  salaryBudget: {
    type: Number,
    default: 0,
    min: 0
  },
  avgSalary: {
    type: Number,
    default: 0,
    min: 0
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  hiringTimeline: {
    type: String,
    enum: ['immediate', 'q1', 'q2', 'q3', 'q4', 'next_year'],
    default: 'q1'
  },
  notes: String
});

const staffingPlanSchema = new mongoose.Schema({
  // Unique identifier
  planId: {
    type: String,
    unique: true,
    index: true
  },

  // Basic Info
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true
  },
  nameAr: {
    type: String,
    trim: true
  },
  description: String,

  // Planning period
  fiscalYear: {
    type: Number,
    required: true,
    index: true
  },
  quarter: {
    type: String,
    enum: ['Q1', 'Q2', 'Q3', 'Q4', 'annual'],
    default: 'annual'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },

  // Department
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true,
    index: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },

  // Staffing details
  staffingDetails: [staffingPlanDetailSchema],

  // Summary
  totalCurrentHeadcount: {
    type: Number,
    default: 0
  },
  totalPlannedHeadcount: {
    type: Number,
    default: 0
  },
  totalVacancies: {
    type: Number,
    default: 0
  },
  totalFilled: {
    type: Number,
    default: 0
  },

  // Budget
  totalSalaryBudget: {
    type: Number,
    default: 0
  },
  approvedBudget: {
    type: Number,
    default: 0
  },
  utilizedBudget: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'SAR'
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'in_progress', 'completed', 'cancelled'],
    default: 'draft',
    index: true
  },

  // Progress tracking
  completionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
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

  // Notes
  notes: String,
  justification: String,
  assumptions: String,

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
staffingPlanSchema.index({ firmId: 1, fiscalYear: 1, department: 1 });
staffingPlanSchema.index({ firmId: 1, status: 1 });

// Generate plan ID before saving
staffingPlanSchema.pre('save', async function(next) {
  if (this.isNew && !this.planId) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { model: 'StaffingPlan', firmId: this.firmId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.planId = `SP-${String(counter.seq).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }

  // Calculate totals
  this.calculateTotals();

  next();
});

// Methods
staffingPlanSchema.methods.calculateTotals = function() {
  if (!this.staffingDetails || this.staffingDetails.length === 0) return;

  this.totalCurrentHeadcount = this.staffingDetails.reduce((sum, d) => sum + (d.currentCount || 0), 0);
  this.totalPlannedHeadcount = this.staffingDetails.reduce((sum, d) => sum + (d.plannedCount || 0), 0);
  this.totalVacancies = this.staffingDetails.reduce((sum, d) => sum + (d.vacancies || 0), 0);
  this.totalFilled = this.staffingDetails.reduce((sum, d) => sum + (d.filledCount || 0), 0);
  this.totalSalaryBudget = this.staffingDetails.reduce((sum, d) => sum + (d.salaryBudget || 0), 0);

  // Calculate completion percentage
  if (this.totalVacancies > 0) {
    this.completionPercentage = Math.round((this.totalFilled / (this.totalVacancies + this.totalFilled)) * 100);
  } else if (this.totalPlannedHeadcount > 0) {
    this.completionPercentage = Math.round((this.totalCurrentHeadcount / this.totalPlannedHeadcount) * 100);
  }
};

staffingPlanSchema.methods.updateVacancy = async function(designationId, filledCount, userId) {
  const detail = this.staffingDetails.find(d => d.designation.equals(designationId));
  if (!detail) {
    throw new Error('Designation not found in staffing plan');
  }

  detail.filledCount = filledCount;
  detail.vacancies = Math.max(0, detail.plannedCount - detail.currentCount - filledCount);

  this.updatedBy = userId;
  return this.save();
};

staffingPlanSchema.methods.approve = async function(userId) {
  this.status = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  this.updatedBy = userId;
  return this.save();
};

staffingPlanSchema.methods.reject = async function(userId, reason) {
  this.status = 'cancelled';
  this.rejectedBy = userId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  this.updatedBy = userId;
  return this.save();
};

// Statics
staffingPlanSchema.statics.getActivePlans = function(firmId, fiscalYear = null) {
  const query = {
    firmId,
    status: { $in: ['approved', 'in_progress'] }
  };
  if (fiscalYear) query.fiscalYear = fiscalYear;

  return this.find(query)
    .populate('department', 'name')
    .populate('branch', 'name')
    .populate('staffingDetails.designation', 'name nameAr')
    .sort({ department: 1 });
};

staffingPlanSchema.statics.getDepartmentPlan = function(firmId, departmentId, fiscalYear) {
  return this.findOne({
    firmId,
    department: departmentId,
    fiscalYear,
    status: { $in: ['approved', 'in_progress'] }
  })
    .populate('department', 'name')
    .populate('staffingDetails.designation', 'name nameAr');
};

staffingPlanSchema.statics.getVacancySummary = async function(firmId, fiscalYear = null) {
  const match = {
    firmId: mongoose.Types.ObjectId(firmId),
    status: { $in: ['approved', 'in_progress'] }
  };
  if (fiscalYear) match.fiscalYear = fiscalYear;

  const result = await this.aggregate([
    { $match: match },
    { $unwind: '$staffingDetails' },
    {
      $group: {
        _id: '$staffingDetails.priority',
        totalVacancies: { $sum: '$staffingDetails.vacancies' },
        totalPlanned: { $sum: '$staffingDetails.plannedCount' },
        totalCurrent: { $sum: '$staffingDetails.currentCount' }
      }
    }
  ]);

  const byTimeline = await this.aggregate([
    { $match: match },
    { $unwind: '$staffingDetails' },
    {
      $group: {
        _id: '$staffingDetails.hiringTimeline',
        count: { $sum: '$staffingDetails.vacancies' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return {
    byPriority: result,
    byTimeline
  };
};

staffingPlanSchema.statics.getBudgetSummary = async function(firmId, fiscalYear) {
  const result = await this.aggregate([
    {
      $match: {
        firmId: mongoose.Types.ObjectId(firmId),
        fiscalYear,
        status: { $in: ['approved', 'in_progress'] }
      }
    },
    {
      $group: {
        _id: '$department',
        totalBudget: { $sum: '$totalSalaryBudget' },
        approvedBudget: { $sum: '$approvedBudget' },
        utilizedBudget: { $sum: '$utilizedBudget' }
      }
    },
    {
      $lookup: {
        from: 'departments',
        localField: '_id',
        foreignField: '_id',
        as: 'departmentInfo'
      }
    },
    { $unwind: '$departmentInfo' },
    {
      $project: {
        departmentName: '$departmentInfo.name',
        totalBudget: 1,
        approvedBudget: 1,
        utilizedBudget: 1,
        remainingBudget: { $subtract: ['$approvedBudget', '$utilizedBudget'] }
      }
    }
  ]);

  return result;
};

staffingPlanSchema.set('toJSON', { virtuals: true });
staffingPlanSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('StaffingPlan', staffingPlanSchema);
