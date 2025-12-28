/**
 * Leave Policy Model
 *
 * Defines leave allocation policies with Saudi Labor Law compliance.
 * Article 109: Minimum 21 days annual leave (30 after 5 years)
 * Article 111: Leave encashment on termination
 * Article 113: Sick leave entitlement (120 days)
 */

const mongoose = require('mongoose');
const Counter = require('./counter.model');

const leavePolicyDetailSchema = new mongoose.Schema({
  leaveTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaveType'
  },
  leaveTypeName: String,
  leaveTypeNameAr: String,

  // Allocation
  annualAllocation: {
    type: Number,
    required: true,
    min: 0
  },

  // Carry forward
  allowCarryForward: {
    type: Boolean,
    default: true
  },
  maxCarryForwardDays: {
    type: Number,
    default: 10,
    min: 0
  },

  // Encashment (Article 111)
  allowEncashment: {
    type: Boolean,
    default: false
  },
  maxEncashableDays: {
    type: Number,
    default: 0,
    min: 0
  },
  encashmentPercentage: {
    type: Number,
    default: 100, // 100% of daily wage
    min: 0,
    max: 100
  },

  // Earned leave (accrual)
  isEarnedLeave: {
    type: Boolean,
    default: false
  },
  earnedLeaveFrequency: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },
  earnedLeavePerPeriod: {
    type: Number,
    default: 0
  },

  // Pro-rata for new employees
  applyProrata: {
    type: Boolean,
    default: true
  },
  prorataBasedOn: {
    type: String,
    enum: ['joining_date', 'confirmation_date', 'fiscal_year_start'],
    default: 'joining_date'
  }
}, { _id: false });

const leavePolicySchema = new mongoose.Schema({
  // Unique identifier
  policyId: {
    type: String,
    unique: true,
    index: true
  },

  // Basic Info
  name: {
    type: String,
    required: [true, 'Policy name is required'],
    trim: true
  },
  nameAr: {
    type: String,
    trim: true
  },
  description: String,

  // Policy details per leave type
  leavePolicyDetails: [leavePolicyDetailSchema],

  // Applicability
  applicableFor: {
    type: String,
    enum: ['all', 'department', 'designation', 'grade', 'employee_type'],
    default: 'all'
  },
  applicableValue: String, // Department ID, designation name, etc.
  applicableValues: [String], // For multiple values

  // Saudi Labor Law compliance
  saudiLaborLawCompliant: {
    type: Boolean,
    default: true
  },

  // Special rules based on tenure
  tenureBasedAllocation: {
    type: Boolean,
    default: true
  },
  tenureRules: [{
    minYears: Number,
    maxYears: Number,
    additionalDays: Number,
    leaveTypeId: mongoose.Schema.Types.ObjectId
  }],

  // Probation restrictions
  probationRestriction: {
    type: Boolean,
    default: true
  },
  allowedLeaveTypesInProbation: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaveType'
  }],

  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isDefault: {
    type: Boolean,
    default: false,
    index: true
  },

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

// Indexes
leavePolicySchema.index({ firmId: 1, isActive: 1 });
leavePolicySchema.index({ firmId: 1, isDefault: 1 });

// Generate policy ID before saving
leavePolicySchema.pre('save', async function(next) {
  if (this.isNew && !this.policyId) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { model: 'LeavePolicy', firmId: this.firmId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.policyId = `LPO-${String(counter.seq).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Ensure only one default policy per firm
leavePolicySchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { firmId: this.firmId, _id: { $ne: this._id }, isDefault: true },
      { $set: { isDefault: false } }
    );
  }
  next();
});

// Methods
leavePolicySchema.methods.getAllocationForLeaveType = function(leaveTypeId) {
  const detail = this.leavePolicyDetails.find(
    d => d.leaveTypeId?.toString() === leaveTypeId?.toString()
  );
  return detail || null;
};

leavePolicySchema.methods.calculateAllocationWithTenure = function(leaveTypeId, yearsOfService) {
  const baseAllocation = this.getAllocationForLeaveType(leaveTypeId);
  if (!baseAllocation) return 0;

  let allocation = baseAllocation.annualAllocation;

  // Apply Saudi Labor Law: 30 days after 5 years
  if (this.saudiLaborLawCompliant && yearsOfService >= 5) {
    // Check if this is annual leave
    if (baseAllocation.leaveTypeName?.toLowerCase().includes('annual') ||
        baseAllocation.leaveTypeNameAr?.includes('سنوية')) {
      allocation = Math.max(allocation, 30);
    }
  }

  // Apply tenure rules
  if (this.tenureBasedAllocation && this.tenureRules?.length > 0) {
    const applicableRule = this.tenureRules.find(
      r => r.leaveTypeId?.toString() === leaveTypeId?.toString() &&
           yearsOfService >= r.minYears &&
           (!r.maxYears || yearsOfService < r.maxYears)
    );

    if (applicableRule) {
      allocation += applicableRule.additionalDays || 0;
    }
  }

  return allocation;
};

// Statics
leavePolicySchema.statics.getDefaultPolicy = function(firmId) {
  return this.findOne({ firmId, isActive: true, isDefault: true });
};

leavePolicySchema.statics.getPolicyForEmployee = async function(firmId, employee) {
  // Try to find specific policy based on department/designation/etc.
  let policy = await this.findOne({
    firmId,
    isActive: true,
    $or: [
      { applicableFor: 'department', applicableValue: employee.department },
      { applicableFor: 'designation', applicableValue: employee.position },
      { applicableFor: 'grade', applicableValue: employee.grade },
      { applicableFor: 'employee_type', applicableValue: employee.employmentType }
    ]
  });

  // Fall back to default policy
  if (!policy) {
    policy = await this.getDefaultPolicy(firmId);
  }

  // Fall back to 'all' policy
  if (!policy) {
    policy = await this.findOne({ firmId, isActive: true, applicableFor: 'all' });
  }

  return policy;
};

leavePolicySchema.set('toJSON', { virtuals: true });
leavePolicySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('LeavePolicy', leavePolicySchema);
