/**
 * Leave Type Model
 *
 * Defines configurable leave types for the organization.
 * Saudi Labor Law compliant leave categories.
 */

const mongoose = require('mongoose');
const Counter = require('./counter.model');

const leaveTypeSchema = new mongoose.Schema({
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
  // Identification
  code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  leaveTypeNumber: {
    type: String,
    unique: true
  },

  // Names
  name: {
    type: String,
    required: true,
    trim: true
  },
  nameAr: {
    type: String,
    trim: true
  },
  description: String,
  descriptionAr: String,

  // Saudi Labor Law Reference
  laborLawArticle: String,
  laborLawArticleAr: String,

  // Leave Configuration
  maxDays: {
    type: Number,
    default: null // null means unlimited
  },
  minDays: {
    type: Number,
    default: 0.5 // Allow half-day leave
  },

  // Pay Configuration
  isPaid: {
    type: Boolean,
    default: true
  },
  payPercentage: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },

  // Eligibility
  requiresApproval: {
    type: Boolean,
    default: true
  },
  requiresDocument: {
    type: Boolean,
    default: false
  },
  documentType: {
    type: String,
    enum: ['medical_certificate', 'marriage_certificate', 'death_certificate', 'birth_certificate', 'travel_document', 'other', null],
    default: null
  },

  // Accrual settings
  isAccrued: {
    type: Boolean,
    default: false
  },
  accrualRate: {
    type: Number,
    default: 0 // Days per month
  },

  // Carry forward
  allowCarryForward: {
    type: Boolean,
    default: false
  },
  maxCarryForwardDays: {
    type: Number,
    default: 0
  },

  // Encashment
  allowEncashment: {
    type: Boolean,
    default: false
  },
  maxEncashableDays: {
    type: Number,
    default: 0
  },

  // Applicability
  applicableGender: {
    type: String,
    enum: ['all', 'male', 'female'],
    default: 'all'
  },
  applicableEmploymentTypes: [{
    type: String,
    enum: ['full_time', 'part_time', 'contract', 'probation', 'all']
  }],
  minServiceDays: {
    type: Number,
    default: 0 // Minimum days of service required
  },

  // Display
  color: {
    type: String,
    default: '#3B82F6' // Default blue
  },
  icon: String,
  sortOrder: {
    type: Number,
    default: 0
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isSystemDefault: {
    type: Boolean,
    default: false
  },

  // Audit
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
leaveTypeSchema.index({ firmId: 1, code: 1 }, { unique: true });
leaveTypeSchema.index({ firmId: 1, isActive: 1 });
leaveTypeSchema.index({ firmId: 1, sortOrder: 1 });

// Generate leave type number
leaveTypeSchema.pre('save', async function(next) {
  if (this.isNew && !this.leaveTypeNumber) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { name: `leaveType_${this.firmId}` },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.leaveTypeNumber = `LT-${String(counter.seq).padStart(4, '0')}`;
    } catch (error) {
      // Fallback
      this.leaveTypeNumber = `LT-${Date.now()}`;
    }
  }
  next();
});

// Static: Get default leave types for Saudi Labor Law
leaveTypeSchema.statics.getDefaultTypes = function() {
  return [
    {
      code: 'ANNUAL',
      name: 'Annual Leave',
      nameAr: 'إجازة سنوية',
      laborLawArticle: 'Article 109',
      laborLawArticleAr: 'المادة 109',
      maxDays: 30,
      isPaid: true,
      isAccrued: true,
      accrualRate: 2.5,
      allowCarryForward: true,
      maxCarryForwardDays: 10,
      allowEncashment: true,
      requiresApproval: true,
      color: '#10B981',
      sortOrder: 1,
      isSystemDefault: true
    },
    {
      code: 'SICK',
      name: 'Sick Leave',
      nameAr: 'إجازة مرضية',
      laborLawArticle: 'Article 117',
      laborLawArticleAr: 'المادة 117',
      maxDays: 120,
      isPaid: true,
      requiresDocument: true,
      documentType: 'medical_certificate',
      requiresApproval: true,
      color: '#EF4444',
      sortOrder: 2,
      isSystemDefault: true
    },
    {
      code: 'HAJJ',
      name: 'Hajj Leave',
      nameAr: 'إجازة حج',
      laborLawArticle: 'Article 114',
      laborLawArticleAr: 'المادة 114',
      maxDays: 15,
      isPaid: true,
      requiresApproval: true,
      color: '#8B5CF6',
      sortOrder: 3,
      isSystemDefault: true
    },
    {
      code: 'MARRIAGE',
      name: 'Marriage Leave',
      nameAr: 'إجازة زواج',
      laborLawArticle: 'Article 113',
      laborLawArticleAr: 'المادة 113',
      maxDays: 3,
      isPaid: true,
      requiresDocument: true,
      documentType: 'marriage_certificate',
      requiresApproval: true,
      color: '#EC4899',
      sortOrder: 4,
      isSystemDefault: true
    },
    {
      code: 'BIRTH',
      name: 'Birth Leave',
      nameAr: 'إجازة ولادة',
      laborLawArticle: 'Article 113',
      laborLawArticleAr: 'المادة 113',
      maxDays: 1,
      isPaid: true,
      requiresDocument: true,
      documentType: 'birth_certificate',
      applicableGender: 'male',
      requiresApproval: true,
      color: '#06B6D4',
      sortOrder: 5,
      isSystemDefault: true
    },
    {
      code: 'DEATH',
      name: 'Death Leave',
      nameAr: 'إجازة وفاة',
      laborLawArticle: 'Article 113',
      laborLawArticleAr: 'المادة 113',
      maxDays: 3,
      isPaid: true,
      requiresDocument: true,
      documentType: 'death_certificate',
      requiresApproval: true,
      color: '#6B7280',
      sortOrder: 6,
      isSystemDefault: true
    },
    {
      code: 'MATERNITY',
      name: 'Maternity Leave',
      nameAr: 'إجازة وضع',
      laborLawArticle: 'Article 151',
      laborLawArticleAr: 'المادة 151',
      maxDays: 70,
      isPaid: true,
      requiresDocument: true,
      documentType: 'medical_certificate',
      applicableGender: 'female',
      requiresApproval: true,
      color: '#F472B6',
      sortOrder: 7,
      isSystemDefault: true
    },
    {
      code: 'PATERNITY',
      name: 'Paternity Leave',
      nameAr: 'إجازة أبوة',
      maxDays: 3,
      isPaid: true,
      requiresDocument: true,
      documentType: 'birth_certificate',
      applicableGender: 'male',
      requiresApproval: true,
      color: '#3B82F6',
      sortOrder: 8,
      isSystemDefault: true
    },
    {
      code: 'EXAM',
      name: 'Exam Leave',
      nameAr: 'إجازة امتحان',
      laborLawArticle: 'Article 115',
      laborLawArticleAr: 'المادة 115',
      maxDays: null,
      isPaid: true,
      requiresDocument: true,
      documentType: 'other',
      requiresApproval: true,
      color: '#F59E0B',
      sortOrder: 9,
      isSystemDefault: true
    },
    {
      code: 'UNPAID',
      name: 'Unpaid Leave',
      nameAr: 'إجازة بدون راتب',
      maxDays: null,
      isPaid: false,
      payPercentage: 0,
      requiresApproval: true,
      color: '#9CA3AF',
      sortOrder: 10,
      isSystemDefault: true
    }
  ];
};

// Static: Initialize default leave types for a firm
leaveTypeSchema.statics.initializeForFirm = async function(firmId, createdBy) {
  const defaults = this.getDefaultTypes();
  const leaveTypes = [];

  for (const typeData of defaults) {
    const existing = await this.findOne({ firmId, code: typeData.code });
    if (!existing) {
      const leaveType = new this({
        ...typeData,
        firmId,
        createdBy,
        applicableEmploymentTypes: ['all']
      });
      await leaveType.save();
      leaveTypes.push(leaveType);
    }
  }

  return leaveTypes;
};

module.exports = mongoose.model('LeaveType', leaveTypeSchema);
