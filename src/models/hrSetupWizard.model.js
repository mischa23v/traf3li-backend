/**
 * HR Setup Wizard Model
 *
 * Tracks the HR module setup progress for new firms.
 * Guides users through essential HR configuration steps.
 *
 * Features:
 * - Step-by-step setup tracking
 * - Progress persistence
 * - Setup completion validation
 */

const mongoose = require('mongoose');

const setupStepSchema = new mongoose.Schema({
  stepId: { type: String, required: true },
  name: { type: String, required: true },
  nameAr: String,
  description: String,
  isCompleted: { type: Boolean, default: false },
  completedAt: Date,
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isOptional: { type: Boolean, default: false },
  order: { type: Number, required: true },
  category: {
    type: String,
    enum: ['basics', 'structure', 'policies', 'payroll', 'compliance', 'advanced'],
    required: true
  },
  dependencies: [String], // Step IDs that must be completed first
  validationRules: {
    requiredModels: [String], // Model names that should have at least one document
    requiredSettings: [String] // Settings paths that should be configured
  }
});

const hrSetupWizardSchema = new mongoose.Schema({
  // Firm reference (one wizard per firm)
  firmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Firm',
    required: true,
    unique: true,
    index: true
   },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
  // Overall status
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'skipped'],
    default: 'not_started',
    index: true
  },

  // Progress
  totalSteps: { type: Number, default: 0 },
  completedSteps: { type: Number, default: 0 },
  progressPercentage: { type: Number, default: 0 },

  // Current step
  currentStep: { type: String, default: 'company_info' },

  // Setup steps
  steps: [setupStepSchema],

  // Completion info
  completedAt: Date,
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Skip info
  skippedAt: Date,
  skippedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  skipReason: String,

  // Reminders
  lastReminderSent: Date,
  remindersSent: { type: Number, default: 0 },
  doNotRemind: { type: Boolean, default: false },

  // Metadata
  startedAt: Date,
  startedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Define default setup steps
const DEFAULT_SETUP_STEPS = [
  // Basics
  {
    stepId: 'company_info',
    name: 'Company Information',
    nameAr: 'معلومات الشركة',
    description: 'Set up basic company information and branding',
    order: 1,
    category: 'basics',
    isOptional: false,
    dependencies: []
  },
  {
    stepId: 'hr_settings',
    name: 'HR Settings',
    nameAr: 'إعدادات الموارد البشرية',
    description: 'Configure general HR settings and policies',
    order: 2,
    category: 'basics',
    isOptional: false,
    dependencies: ['company_info']
  },

  // Structure
  {
    stepId: 'departments',
    name: 'Departments',
    nameAr: 'الأقسام',
    description: 'Create your organizational departments',
    order: 3,
    category: 'structure',
    isOptional: false,
    dependencies: ['company_info'],
    validationRules: { requiredModels: ['Department'] }
  },
  {
    stepId: 'designations',
    name: 'Designations',
    nameAr: 'المسميات الوظيفية',
    description: 'Set up job titles and designations',
    order: 4,
    category: 'structure',
    isOptional: false,
    dependencies: ['departments'],
    validationRules: { requiredModels: ['Designation'] }
  },
  {
    stepId: 'branches',
    name: 'Branches/Locations',
    nameAr: 'الفروع',
    description: 'Add company branches and work locations',
    order: 5,
    category: 'structure',
    isOptional: true,
    dependencies: ['company_info']
  },

  // Policies
  {
    stepId: 'leave_types',
    name: 'Leave Types',
    nameAr: 'أنواع الإجازات',
    description: 'Configure leave types (annual, sick, etc.)',
    order: 6,
    category: 'policies',
    isOptional: false,
    dependencies: ['hr_settings'],
    validationRules: { requiredModels: ['LeaveType'] }
  },
  {
    stepId: 'leave_policy',
    name: 'Leave Policy',
    nameAr: 'سياسة الإجازات',
    description: 'Set up default leave policy',
    order: 7,
    category: 'policies',
    isOptional: false,
    dependencies: ['leave_types'],
    validationRules: { requiredModels: ['LeavePolicy'] }
  },
  {
    stepId: 'shift_types',
    name: 'Shift Types',
    nameAr: 'أنواع الورديات',
    description: 'Configure work shifts and timings',
    order: 8,
    category: 'policies',
    isOptional: false,
    dependencies: ['hr_settings'],
    validationRules: { requiredModels: ['ShiftType'] }
  },
  {
    stepId: 'holidays',
    name: 'Holidays',
    nameAr: 'العطلات الرسمية',
    description: 'Set up public holidays calendar',
    order: 9,
    category: 'policies',
    isOptional: true,
    dependencies: ['hr_settings']
  },

  // Payroll
  {
    stepId: 'salary_components',
    name: 'Salary Components',
    nameAr: 'مكونات الراتب',
    description: 'Configure earnings and deductions',
    order: 10,
    category: 'payroll',
    isOptional: false,
    dependencies: ['hr_settings'],
    validationRules: { requiredModels: ['SalaryComponent'] }
  },
  {
    stepId: 'gosi_settings',
    name: 'GOSI Settings',
    nameAr: 'إعدادات التأمينات',
    description: 'Configure GOSI (Social Insurance) settings',
    order: 11,
    category: 'payroll',
    isOptional: false,
    dependencies: ['salary_components']
  },
  {
    stepId: 'bank_accounts',
    name: 'Bank Accounts',
    nameAr: 'الحسابات البنكية',
    description: 'Set up company bank accounts for payroll',
    order: 12,
    category: 'payroll',
    isOptional: true,
    dependencies: ['company_info']
  },

  // Compliance
  {
    stepId: 'document_types',
    name: 'Document Types',
    nameAr: 'أنواع الوثائق',
    description: 'Configure required employee documents',
    order: 13,
    category: 'compliance',
    isOptional: true,
    dependencies: ['hr_settings']
  },
  {
    stepId: 'approval_workflows',
    name: 'Approval Workflows',
    nameAr: 'مسارات الموافقة',
    description: 'Set up approval chains for requests',
    order: 14,
    category: 'compliance',
    isOptional: true,
    dependencies: ['departments', 'designations']
  },

  // Advanced
  {
    stepId: 'skills',
    name: 'Skills Library',
    nameAr: 'مكتبة المهارات',
    description: 'Create skills for employee profiles',
    order: 15,
    category: 'advanced',
    isOptional: true,
    dependencies: ['designations']
  },
  {
    stepId: 'training_programs',
    name: 'Training Programs',
    nameAr: 'برامج التدريب',
    description: 'Set up training courses',
    order: 16,
    category: 'advanced',
    isOptional: true,
    dependencies: ['departments']
  },
  {
    stepId: 'first_employee',
    name: 'Add First Employee',
    nameAr: 'إضافة أول موظف',
    description: 'Add your first employee to the system',
    order: 17,
    category: 'advanced',
    isOptional: false,
    dependencies: ['departments', 'designations', 'shift_types'],
    validationRules: { requiredModels: ['Employee'] }
  }
];

// Initialize wizard with default steps
hrSetupWizardSchema.pre('save', function(next) {
  if (this.isNew && (!this.steps || this.steps.length === 0)) {
    this.steps = DEFAULT_SETUP_STEPS.map(step => ({
      ...step,
      isCompleted: false
    }));
    this.totalSteps = this.steps.filter(s => !s.isOptional).length;
  }

  // Calculate progress
  const requiredSteps = this.steps.filter(s => !s.isOptional);
  this.completedSteps = requiredSteps.filter(s => s.isCompleted).length;
  this.progressPercentage = this.totalSteps > 0
    ? Math.round((this.completedSteps / this.totalSteps) * 100)
    : 0;

  // Update status
  if (this.completedSteps === 0 && this.status === 'not_started') {
    // Keep not_started
  } else if (this.completedSteps > 0 && this.completedSteps < this.totalSteps) {
    this.status = 'in_progress';
  } else if (this.completedSteps >= this.totalSteps) {
    this.status = 'completed';
    if (!this.completedAt) {
      this.completedAt = new Date();
    }
  }

  next();
});

// Methods
hrSetupWizardSchema.methods.completeStep = async function(stepId, userId) {
  const step = this.steps.find(s => s.stepId === stepId);
  if (!step) {
    throw new Error('Step not found');
  }

  // Check dependencies
  const uncompletedDeps = step.dependencies.filter(depId => {
    const depStep = this.steps.find(s => s.stepId === depId);
    return depStep && !depStep.isCompleted;
  });

  if (uncompletedDeps.length > 0) {
    throw new Error(`Complete these steps first: ${uncompletedDeps.join(', ')}`);
  }

  step.isCompleted = true;
  step.completedAt = new Date();
  step.completedBy = userId;

  // Move to next step
  const nextStep = this.steps.find(s => !s.isCompleted && !s.isOptional);
  if (nextStep) {
    this.currentStep = nextStep.stepId;
  }

  this.lastUpdatedBy = userId;
  return this.save();
};

hrSetupWizardSchema.methods.skipStep = async function(stepId, userId) {
  const step = this.steps.find(s => s.stepId === stepId);
  if (!step) {
    throw new Error('Step not found');
  }

  if (!step.isOptional) {
    throw new Error('Cannot skip required steps');
  }

  step.isCompleted = true;
  step.completedAt = new Date();
  step.completedBy = userId;

  // Move to next step
  const nextStep = this.steps.find(s => !s.isCompleted && !s.isOptional);
  if (nextStep) {
    this.currentStep = nextStep.stepId;
  }

  this.lastUpdatedBy = userId;
  return this.save();
};

hrSetupWizardSchema.methods.skipWizard = async function(userId, reason) {
  this.status = 'skipped';
  this.skippedAt = new Date();
  this.skippedBy = userId;
  this.skipReason = reason;
  this.lastUpdatedBy = userId;
  return this.save();
};

hrSetupWizardSchema.methods.resetProgress = async function(userId) {
  this.steps.forEach(step => {
    step.isCompleted = false;
    step.completedAt = null;
    step.completedBy = null;
  });

  this.status = 'not_started';
  this.completedSteps = 0;
  this.progressPercentage = 0;
  this.currentStep = 'company_info';
  this.completedAt = null;
  this.completedBy = null;
  this.lastUpdatedBy = userId;

  return this.save();
};

// Statics
hrSetupWizardSchema.statics.getWizard = async function(firmId) {
  let wizard = await this.findOne({ firmId });

  if (!wizard) {
    wizard = await this.create({ firmId });
  }

  return wizard;
};

hrSetupWizardSchema.statics.getProgress = async function(firmId) {
  const wizard = await this.getWizard(firmId);
  return {
    status: wizard.status,
    totalSteps: wizard.totalSteps,
    completedSteps: wizard.completedSteps,
    progressPercentage: wizard.progressPercentage,
    currentStep: wizard.currentStep,
    isCompleted: wizard.status === 'completed'
  };
};

hrSetupWizardSchema.statics.getNextStep = async function(firmId) {
  const wizard = await this.getWizard(firmId);

  if (wizard.status === 'completed') {
    return null;
  }

  const nextStep = wizard.steps.find(s => !s.isCompleted && !s.isOptional);
  return nextStep || null;
};

hrSetupWizardSchema.statics.validateStep = async function(firmId, stepId) {
  const wizard = await this.getWizard(firmId);
  const step = wizard.steps.find(s => s.stepId === stepId);

  if (!step) {
    return { valid: false, error: 'Step not found' };
  }

  if (!step.validationRules) {
    return { valid: true };
  }

  const errors = [];

  // Check required models
  if (step.validationRules.requiredModels) {
    for (const modelName of step.validationRules.requiredModels) {
      const Model = mongoose.model(modelName);
      const count = await Model.countDocuments({ firmId });
      if (count === 0) {
        errors.push(`At least one ${modelName} is required`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

module.exports = mongoose.model('HRSetupWizard', hrSetupWizardSchema);
