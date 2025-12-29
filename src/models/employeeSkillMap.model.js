/**
 * Employee Skill Map Model
 *
 * Maps skills to employees with proficiency levels and verification status.
 * Tracks skill development and training history.
 *
 * Features:
 * - Skill assignment with proficiency
 * - Verification and certification tracking
 * - Skill development history
 * - Expiry management for certifications
 */

const mongoose = require('mongoose');

const skillHistorySchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  fromLevel: Number,
  toLevel: Number,
  reason: String,
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String
});

const employeeSkillMapSchema = new mongoose.Schema({
  // References
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'Employee is required'],
    index: true
  },
  skillId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
    required: [true, 'Skill is required'],
    index: true
  },

  // Proficiency
  proficiencyLevel: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    default: 1
  },
  selfAssessedLevel: {
    type: Number,
    min: 1,
    max: 5
  },
  managerAssessedLevel: {
    type: Number,
    min: 1,
    max: 5
  },

  // Verification
  isVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  verificationDate: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verificationMethod: {
    type: String,
    enum: ['certification', 'test', 'assessment', 'portfolio', 'reference', 'manager_approval', 'none'],
    default: 'none'
  },
  verificationDetails: String,

  // Certification (if applicable)
  hasCertification: {
    type: Boolean,
    default: false
  },
  certificationName: String,
  certificationNumber: String,
  certificationBody: String,
  certificationDate: Date,
  certificationExpiry: {
    type: Date,
    index: true
  },
  isCertificationExpired: {
    type: Boolean,
    default: false
  },

  // Experience
  yearsOfExperience: {
    type: Number,
    default: 0,
    min: 0
  },
  acquiredDate: {
    type: Date,
    default: Date.now
  },

  // Training
  relatedTrainingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainingProgram'
  },
  trainingCompletedDate: Date,

  // Development
  targetLevel: Number,
  developmentPlan: String,
  nextReviewDate: Date,

  // History
  skillHistory: [skillHistorySchema],

  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  // Notes
  notes: String,

  // Attachments (certificates, etc.)
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
employeeSkillMapSchema.index({ firmId: 1, employeeId: 1, skillId: 1 }, { unique: true });
employeeSkillMapSchema.index({ firmId: 1, skillId: 1, proficiencyLevel: 1 });
employeeSkillMapSchema.index({ firmId: 1, certificationExpiry: 1 });

// Check certification expiry before saving
employeeSkillMapSchema.pre('save', function(next) {
  if (this.certificationExpiry) {
    this.isCertificationExpired = new Date() > this.certificationExpiry;
  }
  next();
});

// Virtual for days until certification expiry
employeeSkillMapSchema.virtual('daysUntilCertificationExpiry').get(function() {
  if (!this.certificationExpiry) return null;
  const now = new Date();
  const diffTime = this.certificationExpiry - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Methods
employeeSkillMapSchema.methods.updateProficiency = async function(newLevel, reason, userId) {
  // Add to history
  this.skillHistory.push({
    fromLevel: this.proficiencyLevel,
    toLevel: newLevel,
    reason,
    verifiedBy: userId,
    date: new Date()
  });

  this.proficiencyLevel = newLevel;
  this.updatedBy = userId;

  return this.save();
};

employeeSkillMapSchema.methods.verify = async function(verificationData, userId) {
  this.isVerified = true;
  this.verificationDate = new Date();
  this.verifiedBy = userId;
  this.verificationMethod = verificationData.method || 'manager_approval';
  this.verificationDetails = verificationData.details;

  if (verificationData.certification) {
    this.hasCertification = true;
    this.certificationName = verificationData.certification.name;
    this.certificationNumber = verificationData.certification.number;
    this.certificationBody = verificationData.certification.body;
    this.certificationDate = verificationData.certification.date;
    this.certificationExpiry = verificationData.certification.expiry;
  }

  this.updatedBy = userId;
  return this.save();
};

employeeSkillMapSchema.methods.renewCertification = async function(newExpiry, userId, newNumber = null) {
  this.certificationExpiry = newExpiry;
  if (newNumber) this.certificationNumber = newNumber;
  this.isCertificationExpired = false;
  this.verificationDate = new Date();
  this.updatedBy = userId;

  this.skillHistory.push({
    fromLevel: this.proficiencyLevel,
    toLevel: this.proficiencyLevel,
    reason: 'Certification renewed',
    verifiedBy: userId,
    date: new Date()
  });

  return this.save();
};

// Statics
employeeSkillMapSchema.statics.getEmployeeSkills = function(firmId, employeeId, options = {}) {
  const query = { firmId, employeeId, isActive: true };

  if (options.isVerified !== undefined) {
    query.isVerified = options.isVerified;
  }
  if (options.minLevel) {
    query.proficiencyLevel = { $gte: options.minLevel };
  }

  return this.find(query)
    .populate('skillId', 'name nameAr category proficiencyLevels')
    .populate('verifiedBy', 'name email')
    .sort({ proficiencyLevel: -1 });
};

employeeSkillMapSchema.statics.findEmployeesWithSkill = function(firmId, skillId, options = {}) {
  const query = { firmId, skillId, isActive: true };

  if (options.minLevel) {
    query.proficiencyLevel = { $gte: options.minLevel };
  }
  if (options.isVerified) {
    query.isVerified = true;
  }

  return this.find(query)
    .populate('employeeId', 'employeeId firstName lastName department designation')
    .sort({ proficiencyLevel: -1 });
};

employeeSkillMapSchema.statics.getSkillMatrix = async function(firmId, departmentId = null) {
  const Employee = mongoose.model('Employee');
  const Skill = mongoose.model('Skill');

  // Get all active skills
  const skills = await Skill.find({ firmId, isActive: true });

  // Get employees
  const employeeQuery = { firmId, status: 'active' };
  if (departmentId) employeeQuery.department = departmentId;
  const employees = await Employee.find(employeeQuery).select('employeeId firstName lastName');

  // Get all skill mappings
  const mappings = await this.find({
    firmId,
    employeeId: { $in: employees.map(e => e._id) },
    isActive: true
  });

  // Build matrix
  const matrix = employees.map(employee => {
    const employeeSkills = mappings.filter(m => m.employeeId.equals(employee._id));
    const skillLevels = {};

    skills.forEach(skill => {
      const mapping = employeeSkills.find(m => m.skillId.equals(skill._id));
      skillLevels[skill._id.toString()] = mapping ? mapping.proficiencyLevel : 0;
    });

    return {
      employee: {
        _id: employee._id,
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`
      },
      skills: skillLevels
    };
  });

  return {
    skills: skills.map(s => ({ _id: s._id, name: s.name, category: s.category })),
    matrix
  };
};

employeeSkillMapSchema.statics.getExpiringCertifications = function(firmId, daysThreshold = 30) {
  const now = new Date();
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

  return this.find({
    firmId,
    isActive: true,
    hasCertification: true,
    isCertificationExpired: false,
    certificationExpiry: { $gte: now, $lte: thresholdDate }
  })
    .populate('employeeId', 'employeeId firstName lastName email')
    .populate('skillId', 'name nameAr')
    .sort({ certificationExpiry: 1 });
};

employeeSkillMapSchema.statics.getSkillGapAnalysis = async function(firmId, skillId, targetLevel) {
  const result = await this.aggregate([
    {
      $match: {
        firmId: mongoose.Types.ObjectId(firmId),
        skillId: mongoose.Types.ObjectId(skillId),
        isActive: true
      }
    },
    {
      $group: {
        _id: '$proficiencyLevel',
        count: { $sum: 1 },
        employees: { $push: '$employeeId' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const belowTarget = result
    .filter(r => r._id < targetLevel)
    .reduce((sum, r) => sum + r.count, 0);

  const atOrAboveTarget = result
    .filter(r => r._id >= targetLevel)
    .reduce((sum, r) => sum + r.count, 0);

  return {
    distribution: result,
    targetLevel,
    belowTarget,
    atOrAboveTarget,
    gapPercentage: belowTarget > 0 ? ((belowTarget / (belowTarget + atOrAboveTarget)) * 100).toFixed(1) : 0
  };
};

employeeSkillMapSchema.set('toJSON', { virtuals: true });
employeeSkillMapSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('EmployeeSkillMap', employeeSkillMapSchema);
