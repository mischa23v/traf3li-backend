/**
 * Employee Transfer Model
 *
 * Tracks employee transfers between departments, branches, or locations.
 * Supports temporary and permanent transfers.
 *
 * Features:
 * - Department/branch/location transfers
 * - Temporary and permanent transfer types
 * - Approval workflow
 * - Transfer allowance tracking
 */

const mongoose = require('mongoose');
const Counter = require('./counter.model');

const employeeTransferSchema = new mongoose.Schema({
  // Unique identifier
  transferId: {
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

  // From location
  fromDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  fromBranch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  fromLocation: String,
  fromCity: String,
  fromReportingManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },

  // To location
  toDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  toBranch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  toLocation: String,
  toCity: String,
  toReportingManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },

  // Transfer type
  transferType: {
    type: String,
    enum: ['permanent', 'temporary', 'deputation', 'secondment'],
    required: true,
    default: 'permanent'
  },

  // Dates
  requestDate: {
    type: Date,
    default: Date.now
  },
  transferDate: {
    type: Date,
    required: [true, 'Transfer date is required'],
    index: true
  },
  effectiveDate: {
    type: Date,
    required: [true, 'Effective date is required'],
    index: true
  },
  endDate: Date, // For temporary transfers

  // Transfer reason
  transferReason: {
    type: String,
    enum: [
      'business_requirement',
      'employee_request',
      'restructuring',
      'project_assignment',
      'career_development',
      'disciplinary',
      'performance_based',
      'other'
    ],
    required: true
  },
  reasonDetails: String,

  // Financial impact
  salaryChange: {
    type: Number,
    default: 0
  },
  transferAllowance: {
    type: Number,
    default: 0
  },
  relocationAllowance: {
    type: Number,
    default: 0
  },
  allowanceDuration: {
    type: Number, // In months
    default: 0
  },

  // Designation change (if any)
  designationChange: {
    type: Boolean,
    default: false
  },
  fromDesignation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designation'
  },
  toDesignation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designation'
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'rejected', 'applied', 'completed', 'cancelled'],
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

  // Application status
  isApplied: {
    type: Boolean,
    default: false
  },
  appliedAt: Date,
  appliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Completion (for temporary transfers)
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: Date,
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Notes
  notes: String,
  hrComments: String,
  handoverNotes: String,

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
employeeTransferSchema.index({ firmId: 1, employeeId: 1, transferDate: -1 });
employeeTransferSchema.index({ firmId: 1, status: 1 });
employeeTransferSchema.index({ firmId: 1, toDepartment: 1, effectiveDate: 1 });

// Generate transfer ID before saving
employeeTransferSchema.pre('save', async function(next) {
  if (this.isNew && !this.transferId) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { model: 'EmployeeTransfer', firmId: this.firmId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.transferId = `TRF-${String(counter.seq).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Virtual for transfer duration (temporary transfers)
employeeTransferSchema.virtual('transferDuration').get(function() {
  if (!this.endDate || !this.effectiveDate) return null;
  const diffTime = this.endDate - this.effectiveDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Days
});

// Methods
employeeTransferSchema.methods.approve = async function(userId, comments = '') {
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

employeeTransferSchema.methods.reject = async function(userId, reason) {
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

employeeTransferSchema.methods.applyTransfer = async function(userId) {
  if (this.status !== 'approved') {
    throw new Error('Transfer must be approved before applying');
  }

  if (this.isApplied) {
    throw new Error('Transfer has already been applied');
  }

  const Employee = mongoose.model('Employee');
  const employee = await Employee.findById(this.employeeId);

  if (!employee) {
    throw new Error('Employee not found');
  }

  // Update employee record
  employee.department = this.toDepartment;
  if (this.toBranch) employee.branch = this.toBranch;
  if (this.toReportingManager) employee.reportingManager = this.toReportingManager;
  if (this.designationChange && this.toDesignation) {
    employee.designation = this.toDesignation;
  }
  employee.updatedBy = userId;

  await employee.save();

  // Mark transfer as applied
  this.isApplied = true;
  this.appliedAt = new Date();
  this.appliedBy = userId;
  this.status = 'applied';
  this.updatedBy = userId;

  return this.save();
};

employeeTransferSchema.methods.completeTransfer = async function(userId) {
  if (this.transferType !== 'temporary' && this.transferType !== 'deputation') {
    throw new Error('Only temporary transfers can be completed');
  }

  if (!this.isApplied) {
    throw new Error('Transfer must be applied before completion');
  }

  // Revert employee to original department
  const Employee = mongoose.model('Employee');
  const employee = await Employee.findById(this.employeeId);

  if (employee) {
    employee.department = this.fromDepartment;
    if (this.fromBranch) employee.branch = this.fromBranch;
    if (this.fromReportingManager) employee.reportingManager = this.fromReportingManager;
    if (this.designationChange && this.fromDesignation) {
      employee.designation = this.fromDesignation;
    }
    employee.updatedBy = userId;
    await employee.save();
  }

  this.isCompleted = true;
  this.completedAt = new Date();
  this.completedBy = userId;
  this.status = 'completed';
  this.updatedBy = userId;

  return this.save();
};

// Statics
employeeTransferSchema.statics.getEmployeeTransfers = function(firmId, employeeId) {
  return this.find({ firmId, employeeId })
    .populate('fromDepartment', 'name')
    .populate('toDepartment', 'name')
    .populate('fromBranch', 'name')
    .populate('toBranch', 'name')
    .populate('approvedBy', 'name email')
    .sort({ transferDate: -1 });
};

employeeTransferSchema.statics.getPendingApprovals = function(firmId, approverId = null) {
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
    .populate('fromDepartment', 'name')
    .populate('toDepartment', 'name')
    .sort({ createdAt: -1 });
};

employeeTransferSchema.statics.getUpcomingTransfers = function(firmId, daysAhead = 30) {
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
    .populate('toDepartment', 'name')
    .sort({ effectiveDate: 1 });
};

employeeTransferSchema.statics.getActiveTemporaryTransfers = function(firmId) {
  const now = new Date();

  return this.find({
    firmId,
    transferType: { $in: ['temporary', 'deputation'] },
    status: 'applied',
    isCompleted: false,
    $or: [
      { endDate: { $gte: now } },
      { endDate: null }
    ]
  })
    .populate('employeeId', 'employeeId firstName lastName')
    .populate('toDepartment', 'name')
    .sort({ endDate: 1 });
};

employeeTransferSchema.statics.getTransfersByDepartment = function(firmId, departmentId, type = 'incoming') {
  const query = { firmId, status: { $in: ['approved', 'applied'] } };

  if (type === 'incoming') {
    query.toDepartment = departmentId;
  } else {
    query.fromDepartment = departmentId;
  }

  return this.find(query)
    .populate('employeeId', 'employeeId firstName lastName')
    .populate('fromDepartment', 'name')
    .populate('toDepartment', 'name')
    .sort({ effectiveDate: -1 });
};

employeeTransferSchema.set('toJSON', { virtuals: true });
employeeTransferSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('EmployeeTransfer', employeeTransferSchema);
