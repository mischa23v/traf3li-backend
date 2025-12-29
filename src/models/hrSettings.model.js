/**
 * HR Settings Model
 *
 * Centralized HR configuration for the firm.
 * Saudi Labor Law compliant defaults and customizable settings.
 *
 * Features:
 * - Company-wide HR policies
 * - Saudi Labor Law defaults
 * - Leave, attendance, payroll configurations
 * - GOSI and WPS settings
 */

const mongoose = require('mongoose');

const hrSettingsSchema = new mongoose.Schema({
  // Firm reference (one settings doc per firm)
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
  // General Settings
  general: {
    fiscalYearStart: { type: String, default: '01-01' }, // MM-DD
    weekStartDay: { type: String, default: 'sunday' },
    workWeek: {
      type: [String],
      default: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday']
    },
    weekendDays: {
      type: [String],
      default: ['friday', 'saturday']
    },
    defaultCurrency: { type: String, default: 'SAR' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    timeFormat: { type: String, default: '24h' }
  },

  // Working Hours (Saudi Labor Law Article 53)
  workingHours: {
    standardHoursPerDay: { type: Number, default: 8 },
    standardHoursPerWeek: { type: Number, default: 48 },
    ramadanHoursPerDay: { type: Number, default: 6 }, // For Muslims
    ramadanHoursPerWeek: { type: Number, default: 36 },
    maxOvertimePerDay: { type: Number, default: 2 },
    maxOvertimePerMonth: { type: Number, default: 24 }
  },

  // Overtime Settings (Saudi Labor Law Article 107)
  overtime: {
    regularMultiplier: { type: Number, default: 1.5 },
    weekendMultiplier: { type: Number, default: 2.0 },
    holidayMultiplier: { type: Number, default: 2.0 },
    requireApproval: { type: Boolean, default: true },
    autoCalculate: { type: Boolean, default: true }
  },

  // Attendance Settings
  attendance: {
    enableBiometric: { type: Boolean, default: false },
    enableGeofencing: { type: Boolean, default: false },
    geofenceRadius: { type: Number, default: 100 }, // meters
    lateMarkAfterMinutes: { type: Number, default: 15 },
    halfDayAfterMinutes: { type: Number, default: 240 }, // 4 hours
    absentAfterMinutes: { type: Number, default: 480 }, // 8 hours
    autoMarkAbsent: { type: Boolean, default: true },
    autoMarkAbsentTime: { type: String, default: '23:59' },
    allowSelfCheckIn: { type: Boolean, default: false },
    allowRemoteCheckIn: { type: Boolean, default: false }
  },

  // Leave Settings (Saudi Labor Law Articles 109-113)
  leave: {
    defaultAnnualLeave: { type: Number, default: 21 }, // Article 109
    annualLeaveAfter5Years: { type: Number, default: 30 }, // Article 109
    allowNegativeBalance: { type: Boolean, default: false },
    maxCarryForwardDays: { type: Number, default: 10 },
    carryForwardExpiryMonths: { type: Number, default: 3 },
    probationLeaveAllowed: { type: Boolean, default: false },
    minimumNoticeDays: { type: Number, default: 7 },
    maxConsecutiveDays: { type: Number, default: 30 },
    encashmentAllowed: { type: Boolean, default: true },
    encashmentOnTermination: { type: Boolean, default: true }, // Article 111
    requireDocumentForSick: { type: Boolean, default: true },
    sickLeaveDocumentAfterDays: { type: Number, default: 2 }
  },

  // Payroll Settings
  payroll: {
    payFrequency: { type: String, default: 'monthly' },
    payDay: { type: Number, default: 25 }, // Day of month
    wpsEnabled: { type: Boolean, default: true },
    salaryCalculationBasis: { type: String, default: '30_days' }, // 30_days or actual_days
    deductAbsences: { type: Boolean, default: true },
    deductLateMinutes: { type: Boolean, default: false },
    lateDeductionThreshold: { type: Number, default: 3 }, // Number of lates before deduction
    roundingPrecision: { type: Number, default: 2 }
  },

  // GOSI Settings (Saudi Social Insurance)
  gosi: {
    enabled: { type: Boolean, default: true },
    employeeContribution: { type: Number, default: 9.75 },
    employerContribution: { type: Number, default: 11.75 },
    maxContributionSalary: { type: Number, default: 45000 }, // SAR
    includeHousingAllowance: { type: Boolean, default: true }
  },

  // End of Service (Saudi Labor Law Articles 84-87)
  endOfService: {
    calculateOnTermination: { type: Boolean, default: true },
    firstFiveYearsRate: { type: Number, default: 0.5 }, // Half month per year
    afterFiveYearsRate: { type: Number, default: 1.0 }, // Full month per year
    includeAllowances: { type: Boolean, default: true },
    maxYears: { type: Number, default: null } // No maximum
  },

  // Probation Settings
  probation: {
    defaultPeriodDays: { type: Number, default: 90 },
    maxPeriodDays: { type: Number, default: 180 },
    noticePeriodDays: { type: Number, default: 0 }, // No notice during probation
    canExtend: { type: Boolean, default: true },
    maxExtensionDays: { type: Number, default: 90 }
  },

  // Notice Period
  noticePeriod: {
    defaultDays: { type: Number, default: 30 },
    duringProbation: { type: Number, default: 0 },
    afterProbation: { type: Number, default: 30 },
    canBuyout: { type: Boolean, default: true }
  },

  // Holiday Settings
  holidays: {
    autoAddNationalHolidays: { type: Boolean, default: true },
    eidAlFitrDays: { type: Number, default: 4 },
    eidAlAdhaDays: { type: Number, default: 4 },
    nationalDayDays: { type: Number, default: 1 },
    foundingDayDays: { type: Number, default: 1 }
  },

  // Approval Workflow Settings
  approvals: {
    leaveApprovalLevels: { type: Number, default: 1 },
    overtimeApprovalLevels: { type: Number, default: 1 },
    expenseApprovalLevels: { type: Number, default: 2 },
    autoApproveLeaveAfterDays: { type: Number, default: 0 }, // 0 = disabled
    escalateAfterDays: { type: Number, default: 3 }
  },

  // Employee ID Settings
  employeeId: {
    prefix: { type: String, default: 'EMP' },
    startNumber: { type: Number, default: 1 },
    paddingLength: { type: Number, default: 4 },
    includeYear: { type: Boolean, default: false }
  },

  // Document Settings
  documents: {
    requireIdCopy: { type: Boolean, default: true },
    requirePhoto: { type: Boolean, default: true },
    requireEducationCerts: { type: Boolean, default: true },
    requireExperienceCerts: { type: Boolean, default: false },
    requireMedicalCert: { type: Boolean, default: false },
    maxFileSizeMB: { type: Number, default: 10 }
  },

  // Notification Settings
  notifications: {
    emailEnabled: { type: Boolean, default: true },
    smsEnabled: { type: Boolean, default: false },
    notifyOnLeaveRequest: { type: Boolean, default: true },
    notifyOnLeaveApproval: { type: Boolean, default: true },
    notifyOnAttendanceIssue: { type: Boolean, default: true },
    notifyOnBirthday: { type: Boolean, default: true },
    notifyOnWorkAnniversary: { type: Boolean, default: true },
    notifyBeforeDocExpiry: { type: Number, default: 30 }, // days
    notifyBeforeProbationEnd: { type: Number, default: 7 } // days
  },

  // Metadata
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Statics
hrSettingsSchema.statics.getSettings = async function(firmId) {
  let settings = await this.findOne({ firmId });

  // Create default settings if not exist
  if (!settings) {
    settings = await this.create({ firmId });
  }

  return settings;
};

hrSettingsSchema.statics.updateSettings = async function(firmId, updates, userId) {
  const settings = await this.findOneAndUpdate(
    { firmId },
    { ...updates, lastUpdatedBy: userId },
    { new: true, upsert: true, runValidators: true }
  );

  return settings;
};

hrSettingsSchema.statics.getWorkWeek = async function(firmId) {
  const settings = await this.getSettings(firmId);
  return settings.general.workWeek;
};

hrSettingsSchema.statics.getLeaveSettings = async function(firmId) {
  const settings = await this.getSettings(firmId);
  return settings.leave;
};

hrSettingsSchema.statics.getPayrollSettings = async function(firmId) {
  const settings = await this.getSettings(firmId);
  return {
    ...settings.payroll,
    gosi: settings.gosi
  };
};

hrSettingsSchema.statics.getEndOfServiceSettings = async function(firmId) {
  const settings = await this.getSettings(firmId);
  return settings.endOfService;
};

module.exports = mongoose.model('HRSettings', hrSettingsSchema);
