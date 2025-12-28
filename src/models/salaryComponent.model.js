/**
 * Salary Component Model
 *
 * Defines salary components (earnings and deductions) for payroll processing.
 * Saudi Labor Law compliance for allowances and deductions.
 *
 * Features:
 * - Earnings (basic salary, allowances, bonuses)
 * - Deductions (GOSI, loans, advances)
 * - Formula-based calculations
 * - Tax exemption settings
 */

const mongoose = require('mongoose');
const Counter = require('./counter.model');
const { calculateFormula, buildSalaryContext, validateFormula } = require('../services/salaryFormulaEngine');

const salaryComponentSchema = new mongoose.Schema({
  // Unique identifier
  componentId: {
    type: String,
    unique: true,
    index: true
  },

  // Basic Info
  name: {
    type: String,
    required: [true, 'Component name is required'],
    trim: true
  },
  nameAr: {
    type: String,
    required: [true, 'Arabic component name is required'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Component code is required'],
    uppercase: true,
    trim: true
  },
  description: String,

  // Component type
  componentType: {
    type: String,
    enum: ['earning', 'deduction'],
    required: true,
    index: true
  },

  // Sub-category
  category: {
    type: String,
    enum: [
      // Earnings
      'basic_salary',
      'housing_allowance',
      'transportation_allowance',
      'mobile_allowance',
      'meal_allowance',
      'bonus',
      'commission',
      'overtime',
      'incentive',
      'leave_encashment',
      'gratuity',
      'other_earning',
      // Deductions
      'gosi_employee',
      'gosi_employer',
      'loan',
      'advance',
      'absence',
      'late_penalty',
      'insurance',
      'other_deduction'
    ],
    required: true,
    index: true
  },

  // Calculation settings
  calculationType: {
    type: String,
    enum: ['fixed', 'percentage', 'formula'],
    default: 'fixed'
  },
  amount: {
    type: Number,
    default: 0,
    min: 0
  },
  percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  percentageOf: {
    type: String,
    enum: ['basic', 'gross', 'net', 'custom'],
    default: 'basic'
  },
  formula: String, // Custom formula for complex calculations

  // Default values
  defaultAmount: {
    type: Number,
    default: 0
  },
  minAmount: {
    type: Number,
    default: 0
  },
  maxAmount: {
    type: Number,
    default: null
  },

  // GOSI settings (Saudi Social Insurance)
  isGOSIApplicable: {
    type: Boolean,
    default: true
  },
  gosiRate: {
    type: Number,
    default: 0
  },

  // Tax settings (for VAT if applicable)
  isTaxable: {
    type: Boolean,
    default: false // Saudi Arabia has no income tax
  },
  taxRate: {
    type: Number,
    default: 0
  },

  // Applicability
  isStatutory: {
    type: Boolean,
    default: false, // Required by law (like GOSI)
    index: true
  },
  isMandatory: {
    type: Boolean,
    default: false // Must be included in payroll
  },
  isRecurring: {
    type: Boolean,
    default: true // Applies every pay period
  },

  // Conditions
  applyToAllEmployees: {
    type: Boolean,
    default: false
  },
  applicableDepartments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }],
  applicableDesignations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designation'
  }],
  applicableEmploymentTypes: [{
    type: String,
    enum: ['permanent', 'contract', 'probation', 'part_time', 'intern']
  }],

  // Eligibility criteria
  minServiceMonths: {
    type: Number,
    default: 0
  },
  maxServiceMonths: {
    type: Number,
    default: null
  },

  // Proration settings
  enableProration: {
    type: Boolean,
    default: false
  },
  prorationBasis: {
    type: String,
    enum: ['calendar_days', 'working_days', 'hours'],
    default: 'calendar_days'
  },

  // Rounding
  roundingType: {
    type: String,
    enum: ['none', 'round', 'ceil', 'floor'],
    default: 'round'
  },
  roundingPrecision: {
    type: Number,
    default: 2
  },

  // Pay slip settings
  showInPayslip: {
    type: Boolean,
    default: true
  },
  payslipCategory: {
    type: String,
    enum: ['earnings', 'allowances', 'deductions', 'statutory', 'reimbursements'],
    default: 'earnings'
  },
  sortOrder: {
    type: Number,
    default: 0
  },

  // Status
  isActive: {
    type: Boolean,
    default: true,
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

// Compound indexes
salaryComponentSchema.index({ firmId: 1, code: 1 }, { unique: true });
salaryComponentSchema.index({ firmId: 1, componentType: 1, isActive: 1 });
salaryComponentSchema.index({ firmId: 1, category: 1, isActive: 1 });

// Generate component ID before saving
salaryComponentSchema.pre('save', async function(next) {
  if (this.isNew && !this.componentId) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { model: 'SalaryComponent', firmId: this.firmId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.componentId = `SC-${String(counter.seq).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }

  // Set payslip category based on component type
  if (this.isNew && !this.payslipCategory) {
    if (this.componentType === 'earning') {
      this.payslipCategory = this.category.includes('allowance') ? 'allowances' : 'earnings';
    } else {
      this.payslipCategory = this.isStatutory ? 'statutory' : 'deductions';
    }
  }

  next();
});

// Methods
salaryComponentSchema.methods.calculateAmount = function(baseSalary, grossSalary, netSalary, customBase = 0) {
  let calculatedAmount = 0;

  switch (this.calculationType) {
    case 'fixed':
      calculatedAmount = this.amount || this.defaultAmount;
      break;

    case 'percentage':
      let baseAmount;
      switch (this.percentageOf) {
        case 'basic':
          baseAmount = baseSalary;
          break;
        case 'gross':
          baseAmount = grossSalary;
          break;
        case 'net':
          baseAmount = netSalary;
          break;
        case 'custom':
          baseAmount = customBase;
          break;
        default:
          baseAmount = baseSalary;
      }
      calculatedAmount = (baseAmount * this.percentage) / 100;
      break;

    case 'formula':
      if (this.formula) {
        // Use formula engine with basic context
        calculatedAmount = calculateFormula(this.formula, {
          basic: baseSalary,
          gross: grossSalary,
          net: netSalary,
          custom: customBase
        });
      } else {
        calculatedAmount = this.defaultAmount;
      }
      break;
  }

  // Apply min/max constraints
  if (this.minAmount > 0) {
    calculatedAmount = Math.max(calculatedAmount, this.minAmount);
  }
  if (this.maxAmount !== null && this.maxAmount > 0) {
    calculatedAmount = Math.min(calculatedAmount, this.maxAmount);
  }

  // Apply rounding
  switch (this.roundingType) {
    case 'round':
      calculatedAmount = Number(calculatedAmount.toFixed(this.roundingPrecision));
      break;
    case 'ceil':
      const ceilMultiplier = Math.pow(10, this.roundingPrecision);
      calculatedAmount = Math.ceil(calculatedAmount * ceilMultiplier) / ceilMultiplier;
      break;
    case 'floor':
      const floorMultiplier = Math.pow(10, this.roundingPrecision);
      calculatedAmount = Math.floor(calculatedAmount * floorMultiplier) / floorMultiplier;
      break;
    // 'none' - no rounding
  }

  return calculatedAmount;
};

/**
 * Calculate amount with full context (employee, period, earnings)
 * Supports all formula variables including service years, attendance, etc.
 *
 * @param {Object} employee - Employee data
 * @param {Object} earnings - Current earnings totals
 * @param {Object} period - Pay period data
 * @returns {number} Calculated amount
 */
salaryComponentSchema.methods.calculateWithContext = function(employee = {}, earnings = {}, period = {}) {
  let calculatedAmount = 0;

  switch (this.calculationType) {
    case 'fixed':
      calculatedAmount = this.amount || this.defaultAmount;
      break;

    case 'percentage': {
      const basic = employee.basicSalary || employee.basic || 0;
      const gross = earnings.totalEarnings || 0;
      const net = gross - (earnings.totalDeductions || 0);

      let baseAmount;
      switch (this.percentageOf) {
        case 'basic':
          baseAmount = basic;
          break;
        case 'gross':
          baseAmount = gross;
          break;
        case 'net':
          baseAmount = net;
          break;
        case 'custom':
          baseAmount = employee.customBase || 0;
          break;
        default:
          baseAmount = basic;
      }
      calculatedAmount = (baseAmount * this.percentage) / 100;
      break;
    }

    case 'formula':
      if (this.formula) {
        const context = buildSalaryContext(employee, earnings, period);
        calculatedAmount = calculateFormula(this.formula, context);
      } else {
        calculatedAmount = this.defaultAmount;
      }
      break;
  }

  // Apply min/max constraints
  if (this.minAmount > 0) {
    calculatedAmount = Math.max(calculatedAmount, this.minAmount);
  }
  if (this.maxAmount !== null && this.maxAmount > 0) {
    calculatedAmount = Math.min(calculatedAmount, this.maxAmount);
  }

  // Apply rounding
  switch (this.roundingType) {
    case 'round':
      calculatedAmount = Number(calculatedAmount.toFixed(this.roundingPrecision));
      break;
    case 'ceil': {
      const ceilMultiplier = Math.pow(10, this.roundingPrecision);
      calculatedAmount = Math.ceil(calculatedAmount * ceilMultiplier) / ceilMultiplier;
      break;
    }
    case 'floor': {
      const floorMultiplier = Math.pow(10, this.roundingPrecision);
      calculatedAmount = Math.floor(calculatedAmount * floorMultiplier) / floorMultiplier;
      break;
    }
    // 'none' - no rounding
  }

  return calculatedAmount;
};

/**
 * Validate the formula syntax
 * @returns {Object} { valid: boolean, error?: string, variables?: string[] }
 */
salaryComponentSchema.methods.validateFormulaField = function() {
  if (this.calculationType !== 'formula' || !this.formula) {
    return { valid: true };
  }
  return validateFormula(this.formula);
};

salaryComponentSchema.methods.calculateProration = function(amount, workedDays, totalDays) {
  if (!this.enableProration || !workedDays || !totalDays) {
    return amount;
  }

  return (amount * workedDays) / totalDays;
};

salaryComponentSchema.methods.isApplicableToEmployee = function(employee) {
  // Check employment type
  if (this.applicableEmploymentTypes?.length > 0) {
    if (!this.applicableEmploymentTypes.includes(employee.employmentType)) {
      return false;
    }
  }

  // Check department
  if (this.applicableDepartments?.length > 0) {
    if (!this.applicableDepartments.some(d => d.equals(employee.department))) {
      return false;
    }
  }

  // Check designation
  if (this.applicableDesignations?.length > 0) {
    if (!this.applicableDesignations.some(d => d.equals(employee.designation))) {
      return false;
    }
  }

  // Check service period
  if (employee.yearsOfService !== undefined) {
    const serviceMonths = employee.yearsOfService * 12;
    if (this.minServiceMonths > 0 && serviceMonths < this.minServiceMonths) {
      return false;
    }
    if (this.maxServiceMonths !== null && serviceMonths > this.maxServiceMonths) {
      return false;
    }
  }

  return true;
};

// Statics
salaryComponentSchema.statics.getActiveComponents = function(firmId, type = null) {
  const query = { firmId, isActive: true };
  if (type) query.componentType = type;

  return this.find(query).sort({ sortOrder: 1, name: 1 });
};

salaryComponentSchema.statics.getEarnings = function(firmId) {
  return this.find({
    firmId,
    componentType: 'earning',
    isActive: true
  }).sort({ sortOrder: 1, name: 1 });
};

salaryComponentSchema.statics.getDeductions = function(firmId) {
  return this.find({
    firmId,
    componentType: 'deduction',
    isActive: true
  }).sort({ sortOrder: 1, name: 1 });
};

salaryComponentSchema.statics.getStatutoryComponents = function(firmId) {
  return this.find({
    firmId,
    isStatutory: true,
    isActive: true
  }).sort({ sortOrder: 1, name: 1 });
};

salaryComponentSchema.statics.getByCategory = function(firmId, category) {
  return this.find({
    firmId,
    category,
    isActive: true
  }).sort({ sortOrder: 1, name: 1 });
};

salaryComponentSchema.statics.getGOSIComponents = function(firmId) {
  return this.find({
    firmId,
    isGOSIApplicable: true,
    isActive: true
  }).sort({ sortOrder: 1, name: 1 });
};

salaryComponentSchema.statics.createDefaultComponents = async function(firmId, createdBy) {
  const defaultComponents = [
    // Earnings
    {
      name: 'Basic Salary',
      nameAr: 'الراتب الأساسي',
      code: 'BASIC',
      componentType: 'earning',
      category: 'basic_salary',
      calculationType: 'fixed',
      isMandatory: true,
      isGOSIApplicable: true,
      applyToAllEmployees: true,
      showInPayslip: true,
      payslipCategory: 'earnings',
      sortOrder: 1
    },
    {
      name: 'Housing Allowance',
      nameAr: 'بدل السكن',
      code: 'HOUSING',
      componentType: 'earning',
      category: 'housing_allowance',
      calculationType: 'percentage',
      percentage: 25,
      percentageOf: 'basic',
      isGOSIApplicable: true,
      applyToAllEmployees: true,
      showInPayslip: true,
      payslipCategory: 'allowances',
      sortOrder: 2
    },
    {
      name: 'Transportation Allowance',
      nameAr: 'بدل المواصلات',
      code: 'TRANSPORT',
      componentType: 'earning',
      category: 'transportation_allowance',
      calculationType: 'fixed',
      defaultAmount: 500,
      isGOSIApplicable: false,
      applyToAllEmployees: true,
      showInPayslip: true,
      payslipCategory: 'allowances',
      sortOrder: 3
    },
    // Deductions
    {
      name: 'GOSI Employee Contribution',
      nameAr: 'اشتراك التأمينات (الموظف)',
      code: 'GOSI_EMP',
      componentType: 'deduction',
      category: 'gosi_employee',
      calculationType: 'percentage',
      percentage: 9.75, // Saudi GOSI rate for employee
      percentageOf: 'basic',
      isStatutory: true,
      isMandatory: true,
      applyToAllEmployees: true,
      showInPayslip: true,
      payslipCategory: 'statutory',
      sortOrder: 1
    },
    {
      name: 'GOSI Employer Contribution',
      nameAr: 'اشتراك التأمينات (صاحب العمل)',
      code: 'GOSI_EMP_ER',
      componentType: 'deduction',
      category: 'gosi_employer',
      calculationType: 'percentage',
      percentage: 11.75, // Saudi GOSI rate for employer
      percentageOf: 'basic',
      isStatutory: true,
      isMandatory: true,
      applyToAllEmployees: true,
      showInPayslip: false, // Usually not shown to employee
      payslipCategory: 'statutory',
      sortOrder: 2
    }
  ];

  const createdComponents = [];
  for (const comp of defaultComponents) {
    try {
      const component = await this.create({
        ...comp,
        firmId,
        createdBy
      });
      createdComponents.push(component);
    } catch (error) {
      // Skip if already exists
      if (error.code !== 11000) {
        throw error;
      }
    }
  }

  return createdComponents;
};

salaryComponentSchema.set('toJSON', { virtuals: true });
salaryComponentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('SalaryComponent', salaryComponentSchema);
