/**
 * Employee Promotion Model
 *
 * Tracks employee promotions including designation changes,
 * salary increments, and department transfers.
 *
 * Features:
 * - Promotion history tracking
 * - Salary increment calculations
 * - Approval workflow
 * - Employee record auto-update
 */

const mongoose = require('mongoose');
const Counter = require('./counter.model');

const employeePromotionSchema = new mongoose.Schema({
  // Unique identifier
  promotionId: {
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

  // From position
  fromDesignation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designation',
    required: true
  },
  fromDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  fromGrade: String,
  fromSalary: {
    type: Number,
    required: true,
    min: 0
  },

  // To position
  toDesignation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designation',
    required: true
  },
  toDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  toGrade: String,
  toSalary: {
    type: Number,
    required: true,
    min: 0
  },

  // Salary change
  salaryIncrement: {
    type: Number,
    default: 0
  },
  incrementPercentage: {
    type: Number,
    default: 0
  },
  incrementType: {
    type: String,
    enum: ['fixed', 'percentage', 'grade_based'],
    default: 'percentage'
  },

  // Allowance changes
  allowanceChanges: [{
    componentId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryComponent' },
    componentName: String,
    fromAmount: Number,
    toAmount: Number,
    changeAmount: Number
  }],

  // Dates
  promotionDate: {
    type: Date,
    required: [true, 'Promotion date is required'],
    index: true
  },
  effectiveDate: {
    type: Date,
    required: [true, 'Effective date is required'],
    index: true
  },

  // Promotion type
  promotionType: {
    type: String,
    enum: ['regular', 'merit', 'position_change', 'acting', 'interim'],
    default: 'regular'
  },

  // Reason and notes
  promotionReason: {
    type: String,
    required: true
  },
  performanceRating: String,
  achievements: [String],
  notes: String,
  hrComments: String,

  // Status
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'rejected', 'applied', 'cancelled'],
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

  // Application status (when changes are applied to employee record)
  isApplied: {
    type: Boolean,
    default: false
  },
  appliedAt: Date,
  appliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

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
  },,


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
employeePromotionSchema.index({ firmId: 1, employeeId: 1, promotionDate: -1 });
employeePromotionSchema.index({ firmId: 1, status: 1 });
employeePromotionSchema.index({ firmId: 1, effectiveDate: 1 });

// Generate promotion ID before saving
employeePromotionSchema.pre('save', async function(next) {
  if (this.isNew && !this.promotionId) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { model: 'EmployeePromotion', firmId: this.firmId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.promotionId = `PROMO-${String(counter.seq).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }

  // Calculate salary increment
  this.salaryIncrement = this.toSalary - this.fromSalary;
  if (this.fromSalary > 0) {
    this.incrementPercentage = ((this.salaryIncrement / this.fromSalary) * 100).toFixed(2);
  }

  next();
});

// Methods
employeePromotionSchema.methods.approve = async function(userId, comments = '') {
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

employeePromotionSchema.methods.reject = async function(userId, reason) {
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

employeePromotionSchema.methods.applyPromotion = async function(userId) {
  if (this.status !== 'approved') {
    throw new Error('Promotion must be approved before applying');
  }

  if (this.isApplied) {
    throw new Error('Promotion has already been applied');
  }

  const Employee = mongoose.model('Employee');
  const employee = await Employee.findById(this.employeeId);

  if (!employee) {
    throw new Error('Employee not found');
  }

  // Update employee record
  employee.designation = this.toDesignation;
  if (this.toDepartment) {
    employee.department = this.toDepartment;
  }
  if (this.toGrade) {
    employee.grade = this.toGrade;
  }
  employee.basicSalary = this.toSalary;
  employee.updatedBy = userId;

  await employee.save();

  // Mark promotion as applied
  this.isApplied = true;
  this.appliedAt = new Date();
  this.appliedBy = userId;
  this.status = 'applied';
  this.updatedBy = userId;

  return this.save();
};

// Statics
employeePromotionSchema.statics.getEmployeePromotions = function(firmId, employeeId) {
  return this.find({ firmId, employeeId })
    .populate('fromDesignation', 'name nameAr')
    .populate('toDesignation', 'name nameAr')
    .populate('fromDepartment', 'name')
    .populate('toDepartment', 'name')
    .populate('approvedBy', 'name email')
    .sort({ promotionDate: -1 });
};

employeePromotionSchema.statics.getPendingApprovals = function(firmId, approverId = null) {
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
    .populate('fromDesignation', 'name nameAr')
    .populate('toDesignation', 'name nameAr')
    .sort({ createdAt: -1 });
};

employeePromotionSchema.statics.getUpcomingPromotions = function(firmId, daysAhead = 30) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return this.find({
    firmId,
    status: 'approved',
    isApplied: false,
    effectiveDate: { $gte: now, $lte: futureDate }
  })
    .populate('employeeId', 'employeeId firstName lastName')
    .populate('toDesignation', 'name nameAr')
    .sort({ effectiveDate: 1 });
};

employeePromotionSchema.statics.getPromotionStats = async function(firmId, year) {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31);

  const stats = await this.aggregate([
    {
      $match: {
        firmId: mongoose.Types.ObjectId(firmId),
        promotionDate: { $gte: startOfYear, $lte: endOfYear },
        status: { $in: ['approved', 'applied'] }
      }
    },
    {
      $group: {
        _id: { $month: '$promotionDate' },
        count: { $sum: 1 },
        avgIncrementPercentage: { $avg: { $toDouble: '$incrementPercentage' } },
        totalSalaryIncrease: { $sum: '$salaryIncrement' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const summary = await this.aggregate([
    {
      $match: {
        firmId: mongoose.Types.ObjectId(firmId),
        promotionDate: { $gte: startOfYear, $lte: endOfYear },
        status: { $in: ['approved', 'applied'] }
      }
    },
    {
      $group: {
        _id: null,
        totalPromotions: { $sum: 1 },
        avgIncrementPercentage: { $avg: { $toDouble: '$incrementPercentage' } },
        totalSalaryIncrease: { $sum: '$salaryIncrement' }
      }
    }
  ]);

  return {
    monthly: stats,
    summary: summary[0] || { totalPromotions: 0, avgIncrementPercentage: 0, totalSalaryIncrease: 0 }
  };
};

employeePromotionSchema.set('toJSON', { virtuals: true });
employeePromotionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('EmployeePromotion', employeePromotionSchema);
