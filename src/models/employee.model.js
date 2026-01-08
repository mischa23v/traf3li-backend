const mongoose = require('mongoose');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  ⚠️  SAUDI LABOR LAW COMPLIANCE - DO NOT MODIFY WITHOUT LEGAL REVIEW  ⚠️    ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                               ║
 * ║  This file contains values mandated by Saudi Labor Law.                       ║
 * ║  Incorrect values can result in:                                              ║
 * ║  - Fines up to SAR 100,000 per violation                                      ║
 * ║  - Service suspension (GOSI, WPS, Qiwa, Muqeem)                              ║
 * ║  - Legal liability for employer AND software provider                         ║
 * ║                                                                               ║
 * ║  Key Labor Law Requirements (verified January 2026):                          ║
 * ║  - Probation period: Max 180 days (Article 53, Feb 2025 update)              ║
 * ║  - Notice period: 60 days indefinite, 30 days fixed-term (Article 75)        ║
 * ║  - National ID: 10 digits, starts with 1 (Saudi) or 2 (Iqama)               ║
 * ║  - IBAN: SA + 22 digits (ISO 13616 / ISO 7064 Mod 97)                        ║
 * ║                                                                               ║
 * ║  Official sources: hrsd.gov.sa, mol.gov.sa                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * Employee Model - HR Management
 * Supports both Solo lawyers and Firm employees
 * Matches frontend nested structure for form handling
 */

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

const allowanceSchema = new mongoose.Schema({
    name: { type: String, required: false },
    nameAr: { type: String },
    amount: { type: Number, required: false, default: 0 },
    taxable: { type: Boolean, default: true },
    includedInEOSB: { type: Boolean, default: true },
    includedInGOSI: { type: Boolean, default: false }
}, { _id: true });

const addressSchema = new mongoose.Schema({
    city: String,
    region: String,
    country: { type: String, default: 'Saudi Arabia' }
}, { _id: false });

const emergencyContactSchema = new mongoose.Schema({
    name: String,
    relationship: String,
    phone: String
}, { _id: false });

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * IBAN VALIDATION - ISO 7064 Mod 97-10
 * Saudi Arabia IBAN format: SA + 2 check digits + 22 alphanumeric
 * Total: 24 characters
 * ═══════════════════════════════════════════════════════════════════════════════
 */
function validateSaudiIBAN(iban) {
    if (!iban) return true; // Optional field

    // Remove spaces and convert to uppercase
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();

    // Saudi IBAN: SA + 2 check digits + 22 characters = 24 total
    if (!/^SA\d{2}[A-Z0-9]{22}$/.test(cleanIban)) {
        return false;
    }

    // ISO 7064 Mod 97-10 validation
    // Move first 4 chars to end and convert letters to numbers (A=10, B=11, etc.)
    const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4);
    const numericString = rearranged.replace(/[A-Z]/g, char => (char.charCodeAt(0) - 55).toString());

    // Calculate mod 97 using string math for large numbers
    let remainder = numericString;
    while (remainder.length > 2) {
        const block = remainder.slice(0, 9);
        remainder = (parseInt(block, 10) % 97).toString() + remainder.slice(9);
    }

    return parseInt(remainder, 10) % 97 === 1;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NATIONAL ID VALIDATION - Luhn Algorithm (Mod 10)
 * Saudi National ID: 10 digits, starts with 1
 * Iqama (Residence Permit): 10 digits, starts with 2
 * ═══════════════════════════════════════════════════════════════════════════════
 */
function validateSaudiNationalId(nationalId, idType) {
    if (!nationalId) return true; // Optional field

    // Skip Luhn validation for GCC ID and passport (different format)
    if (idType === 'gcc_id' || idType === 'passport') {
        return true; // No specific validation for these types
    }

    const cleanId = nationalId.replace(/\s/g, '');

    // Must be exactly 10 digits for Saudi ID and Iqama
    if (!/^\d{10}$/.test(cleanId)) {
        return false;
    }

    // First digit determines type
    const firstDigit = cleanId[0];
    if (idType === 'saudi_id' && firstDigit !== '1') {
        return false; // Saudi ID must start with 1
    }
    if (idType === 'iqama' && firstDigit !== '2') {
        return false; // Iqama must start with 2
    }

    // Luhn algorithm (Mod 10) validation for Saudi IDs
    // Note: Saudi ID uses a specific Luhn variant
    let sum = 0;
    for (let i = 0; i < 10; i++) {
        let digit = parseInt(cleanId[i], 10);

        // Double every second digit (starting from index 0)
        if (i % 2 === 0) {
            digit *= 2;
            if (digit > 9) {
                digit = Math.floor(digit / 10) + (digit % 10);
            }
        }
        sum += digit;
    }

    return sum % 10 === 0;
}

const bankDetailsSchema = new mongoose.Schema({
    bankName: String,
    // Saudi IBAN format: SA + 2 check digits + 22 alphanumeric = 24 total
    iban: {
        type: String,
        validate: {
            validator: validateSaudiIBAN,
            message: 'Invalid Saudi IBAN. Must be 24 characters (SA + 22 alphanumeric) and pass ISO 7064 Mod 97 checksum'
        }
    }
}, { _id: false });

const workScheduleSchema = new mongoose.Schema({
    weeklyHours: { type: Number, default: 48 },
    dailyHours: { type: Number, default: 8 },
    workDays: [{ type: String }],
    restDay: { type: String, default: 'Friday' }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const employeeSchema = new mongoose.Schema({
    // Auto-generated ID
    employeeId: {
        type: String,
        unique: true,
        sparse: true
    },

    // Office type - determines form behavior
    officeType: {
        type: String,
        enum: ['solo', 'small', 'medium', 'firm'],
        default: 'solo'
    },

    // ═══════════════════════════════════════════════════════════════
    // PERSONAL INFO - البيانات الشخصية
    // ═══════════════════════════════════════════════════════════════
    personalInfo: {
        fullNameArabic: { type: String, required: false, trim: true },
        fullNameEnglish: { type: String, trim: true },
        // ⚠️ NATIONAL ID VALIDATION
        // Saudi ID: 10 digits starting with 1, Luhn checksum
        // Iqama: 10 digits starting with 2, Luhn checksum
        nationalId: {
            type: String,
            required: false,
            validate: {
                validator: function(v) {
                    if (!v) return true;
                    return validateSaudiNationalId(v, this.nationalIdType);
                },
                message: 'Invalid National ID. Must be 10 digits starting with 1 (Saudi) or 2 (Iqama) with valid Luhn checksum'
            }
        },
        nationalIdType: {
            type: String,
            enum: ['saudi_id', 'iqama', 'gcc_id', 'passport'],
            default: 'saudi_id'
        },
        nationalIdExpiry: Date,
        nationality: { type: String, default: 'Saudi' },
        isSaudi: { type: Boolean, default: true },
        gender: {
            type: String,
            enum: ['male', 'female'],
            required: false
        },
        dateOfBirth: Date,
        mobile: { type: String, required: false },
        email: { type: String, required: false, lowercase: true, trim: true },
        personalEmail: { type: String, lowercase: true, trim: true },
        currentAddress: addressSchema,
        emergencyContact: emergencyContactSchema,
        maritalStatus: {
            type: String,
            enum: ['single', 'married', 'divorced', 'widowed'],
            default: 'single'
        },
        numberOfDependents: { type: Number, default: 0 },
        // Religion - Required for Iddah leave calculation (Article 160)
        // Muslim widow: 130 days, Non-Muslim widow: 15 days
        religion: {
            type: String,
            enum: ['muslim', 'non_muslim'],
            default: 'muslim'
        },
        bloodType: {
            type: String,
            enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', null],
            default: null
        },
        medicalConditions: [String] // For emergency situations
    },

    // ═══════════════════════════════════════════════════════════════
    // EMPLOYMENT - بيانات التوظيف
    // ═══════════════════════════════════════════════════════════════
    employment: {
        employmentStatus: {
            type: String,
            enum: ['active', 'on_leave', 'suspended', 'terminated', 'resigned'],
            default: 'active'
        },
        jobTitle: String,
        jobTitleArabic: { type: String, required: false },
        employmentType: {
            type: String,
            enum: ['full_time', 'part_time', 'contract', 'temporary'],
            default: 'full_time'
        },
        contractType: {
            type: String,
            enum: ['indefinite', 'fixed_term'],
            default: 'indefinite'
        },
        contractStartDate: Date,
        contractEndDate: Date,
        hireDate: { type: Date, required: false },
        // ⚠️ PROBATION PERIOD - Article 53 (Feb 2025 Update)
        // Maximum 180 days (was 90 days before Feb 2025)
        // Can be extended ONCE by written agreement for max 90 additional days
        probationPeriod: { type: Number, default: 180 }, // Days - Max 180 per Article 53
        probationExtendedTo: Date, // If probation extended by written agreement
        onProbation: { type: Boolean, default: true },
        workSchedule: workScheduleSchema,
        reportsTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee'
        },
        departmentName: String,

        // ⚠️ TERMINATION - Articles 74-81
        terminationDate: Date,
        terminationReason: String,
        terminationDetails: {
            // Termination article - determines EOSB calculation
            article: {
                type: String,
                enum: [
                    'article_74_mutual',     // Mutual agreement
                    'article_75_expiry',     // Contract expiry
                    'article_77_indefinite', // Party termination (indefinite)
                    'article_80_employer',   // Employer termination without compensation (serious misconduct)
                    'article_81_employee',   // Employee termination without notice (employer breach)
                    'resignation',           // Standard resignation
                    'retirement',            // Retirement
                    'death',                 // Death of employee
                    'force_majeure'          // Force majeure
                ]
            },
            // Notice period - Article 75
            // Indefinite contract: 60 days
            // Fixed-term: 30 days OR remaining contract period (whichever less)
            noticeServed: { type: Boolean, default: false },
            noticePeriodDays: { type: Number, default: 60 }, // 60 for indefinite, 30 for fixed
            noticeStartDate: Date,
            lastWorkingDay: Date,
            // Settlement tracking
            settlementStatus: {
                type: String,
                enum: ['pending', 'calculated', 'approved', 'paid'],
                default: 'pending'
            },
            exitInterviewDone: { type: Boolean, default: false },
            clearanceCompleted: { type: Boolean, default: false }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // COMPENSATION - الراتب والبدلات
    // ═══════════════════════════════════════════════════════════════
    compensation: {
        basicSalary: { type: Number, required: false, default: 0 },
        currency: { type: String, default: 'SAR' },
        allowances: [allowanceSchema],
        paymentFrequency: {
            type: String,
            enum: ['monthly', 'bi_weekly', 'weekly'],
            default: 'monthly'
        },
        paymentMethod: {
            type: String,
            enum: ['bank_transfer', 'cash', 'check'],
            default: 'bank_transfer'
        },
        bankDetails: bankDetailsSchema
    },

    // ═══════════════════════════════════════════════════════════════
    // GOSI - التأمينات الاجتماعية
    // ═══════════════════════════════════════════════════════════════
    gosi: {
        registered: { type: Boolean, default: false },
        gosiNumber: String,
        // Saudi: employee 9.75%, employer 11.75%
        // Non-Saudi: employer 2% only (employee 0%)
        employeeContribution: { type: Number, default: 9.75 },
        employerContribution: { type: Number, default: 11.75 }
    },

    // ═══════════════════════════════════════════════════════════════
    // ORGANIZATION - الهيكل التنظيمي (medium/firm only)
    // ═══════════════════════════════════════════════════════════════
    organization: {
        branchId: String,
        departmentName: String,
        teamId: String,
        supervisorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee'
        },
        costCenter: String
    },

    // ═══════════════════════════════════════════════════════════════
    // LEAVE - رصيد الإجازات
    // ═══════════════════════════════════════════════════════════════
    leave: {
        annualLeaveEntitlement: { type: Number, default: 21 } // 21 or 30 days
    },

    // ═══════════════════════════════════════════════════════════════
    // OWNERSHIP - Multi-tenancy
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }

}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// ENCRYPTION PLUGIN
// ═══════════════════════════════════════════════════════════════
const encryptionPlugin = require('./plugins/encryption.plugin');

// Apply encryption to sensitive fields
employeeSchema.plugin(encryptionPlugin, {
    fields: [
        'compensation.basicSalary',      // Employee salary
        'compensation.bankDetails.iban', // Bank IBAN
    ],
    searchableFields: []  // Salary and IBAN don't need to be searchable
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
employeeSchema.index({ firmId: 1, 'employment.employmentStatus': 1 });
employeeSchema.index({ lawyerId: 1, 'employment.employmentStatus': 1 });
employeeSchema.index({ employeeId: 1 });
employeeSchema.index({ 'personalInfo.nationalId': 1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUAL FIELDS
// ═══════════════════════════════════════════════════════════════

// Full name (for backward compatibility and convenience)
employeeSchema.virtual('fullName').get(function() {
    return this.personalInfo?.fullNameEnglish || this.personalInfo?.fullNameArabic || '';
});

employeeSchema.virtual('fullNameAr').get(function() {
    return this.personalInfo?.fullNameArabic || '';
});

// Total allowances - sum of all allowance amounts
employeeSchema.virtual('totalAllowances').get(function() {
    if (!this.compensation?.allowances || this.compensation.allowances.length === 0) return 0;
    return this.compensation.allowances.reduce((sum, a) => sum + (a.amount || 0), 0);
});

// Gross salary = basicSalary + totalAllowances
employeeSchema.virtual('grossSalary').get(function() {
    return (this.compensation?.basicSalary || 0) + this.totalAllowances;
});

// GOSI deduction = basicSalary * employeeContribution%
employeeSchema.virtual('gosiDeduction').get(function() {
    if (!this.gosi?.registered) return 0;
    return (this.compensation?.basicSalary || 0) * ((this.gosi.employeeContribution || 0) / 100);
});

// Net salary = grossSalary - gosiDeduction
employeeSchema.virtual('netSalary').get(function() {
    return this.grossSalary - this.gosiDeduction;
});

// Status shorthand (for backward compatibility)
employeeSchema.virtual('status').get(function() {
    return this.employment?.employmentStatus || 'active';
});

// Years of service - calculated from hire date
employeeSchema.virtual('yearsOfService').get(function() {
    if (!this.employment?.hireDate) return 0;
    const hireDate = new Date(this.employment.hireDate);
    const now = new Date();
    const diffMs = now - hireDate;
    const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
    return Math.max(0, parseFloat(years.toFixed(2)));
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ANNUAL LEAVE ENTITLEMENT - Article 109 (Saudi Labor Law)
 * ⚠️ DO NOT MODIFY - Legal requirement
 *
 * - Under 5 years service: 21 days minimum (paid annual leave)
 * - 5+ years service: 30 days minimum (paid annual leave)
 *
 * The employee cannot waive this right and cannot receive monetary
 * compensation in lieu of leave (except on termination - Article 111)
 * ═══════════════════════════════════════════════════════════════════════════════
 */
employeeSchema.virtual('minAnnualLeave').get(function() {
    return this.yearsOfService >= 5 ? 30 : 21;
});

// Check if employee is due for annual leave upgrade
employeeSchema.virtual('annualLeaveUpgradeStatus').get(function() {
    const currentEntitlement = this.leave?.annualLeaveEntitlement || 21;
    const minEntitlement = this.minAnnualLeave;

    if (currentEntitlement < minEntitlement) {
        return {
            needsUpgrade: true,
            currentDays: currentEntitlement,
            newDays: minEntitlement,
            reason: `Employee has ${this.yearsOfService.toFixed(1)} years of service - entitled to ${minEntitlement} days per Article 109`
        };
    }

    return { needsUpgrade: false, currentDays: currentEntitlement };
});

// Ensure virtuals are included in JSON
employeeSchema.set('toJSON', { virtuals: true });
employeeSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

// Generate employee ID
employeeSchema.pre('save', async function(next) {
    if (!this.employeeId) {
        const count = await this.constructor.countDocuments({
            $or: [
                { firmId: this.firmId },
                { lawyerId: this.lawyerId }
            ]
        });
        this.employeeId = `EMP${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTO-UPGRADE ANNUAL LEAVE ENTITLEMENT - Article 109
 * ⚠️ Automatically upgrades annual leave from 21 to 30 days when employee
 *    crosses 5 years of service. This is a legal requirement.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
employeeSchema.pre('save', function(next) {
    // Only run if we have hire date
    if (!this.employment?.hireDate) {
        return next();
    }

    // Calculate years of service
    const hireDate = new Date(this.employment.hireDate);
    const now = new Date();
    const yearsOfService = (now - hireDate) / (1000 * 60 * 60 * 24 * 365.25);

    // Initialize leave object if not present
    if (!this.leave) {
        this.leave = { annualLeaveEntitlement: 21 };
    }

    const currentEntitlement = this.leave.annualLeaveEntitlement || 21;
    const minEntitlement = yearsOfService >= 5 ? 30 : 21;

    // Auto-upgrade if current is less than minimum (never downgrade)
    if (currentEntitlement < minEntitlement) {
        this.leave.annualLeaveEntitlement = minEntitlement;
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get employees for firm or solo lawyer
employeeSchema.statics.getEmployees = function(firmId, lawyerId, filters = {}, options = {}) {
    const query = {};

    // Models receive context as parameter, so check for isSoloLawyer in the context/options
    if (options.isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    return this.find({ ...query, ...filters })
        .populate('employment.reportsTo', 'personalInfo.fullNameArabic personalInfo.fullNameEnglish')
        .populate('organization.supervisorId', 'personalInfo.fullNameArabic personalInfo.fullNameEnglish')
        .sort({ createdAt: -1 });
};

// Get employee stats
employeeSchema.statics.getStats = async function(firmId, lawyerId, options = {}) {
    const query = {};

    // Models receive context as parameter, so check for isSoloLawyer in the context/options
    if (options.isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const [stats] = await this.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                totalEmployees: { $sum: 1 },
                activeEmployees: {
                    $sum: { $cond: [{ $eq: ['$employment.employmentStatus', 'active'] }, 1, 0] }
                },
                totalBasicSalary: { $sum: '$compensation.basicSalary' },
                byDepartment: { $push: '$employment.departmentName' },
                byStatus: { $push: '$employment.employmentStatus' }
            }
        }
    ]);

    return stats || {
        totalEmployees: 0,
        activeEmployees: 0,
        totalBasicSalary: 0
    };
};

module.exports = mongoose.model('Employee', employeeSchema);
