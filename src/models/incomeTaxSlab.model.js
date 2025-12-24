/**
 * Income Tax Slab Model
 *
 * Defines progressive income tax brackets for automatic tax calculation.
 * While Saudi Arabia doesn't have personal income tax, this model supports
 * firms operating in other jurisdictions or for expat tax equalization.
 *
 * Features:
 * - Progressive tax brackets
 * - Multiple tax regimes (country-specific)
 * - Effective date management
 * - Standard deductions and exemptions
 *
 * @module models/incomeTaxSlab
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Individual tax bracket
 */
const taxBracketSchema = new mongoose.Schema({
    // Lower limit of income range (inclusive)
    fromAmount: {
        type: Number,
        required: true,
        min: 0
    },
    // Upper limit of income range (exclusive, null = unlimited)
    toAmount: {
        type: Number,
        default: null,
        min: 0
    },
    // Tax rate for this bracket (percentage)
    rate: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    // Fixed amount to add (for progressive calculations)
    fixedAmount: {
        type: Number,
        default: 0
    }
}, { _id: false });

/**
 * Standard deduction entry
 */
const standardDeductionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    nameAr: String,
    // Deduction type
    type: {
        type: String,
        enum: ['fixed', 'percentage'],
        default: 'fixed'
    },
    amount: {
        type: Number,
        default: 0
    },
    percentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    // Maximum deduction if percentage-based
    maxAmount: {
        type: Number,
        default: null
    }
}, { _id: false });

/**
 * Main tax slab schema
 */
const incomeTaxSlabSchema = new mongoose.Schema({
    // Multi-tenancy
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    // Tax regime name
    name: {
        type: String,
        required: true,
        trim: true
    },
    nameAr: {
        type: String,
        trim: true
    },
    // Country/jurisdiction code
    countryCode: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        minlength: 2,
        maxlength: 3,
        index: true
    },
    // Currency for amounts
    currency: {
        type: String,
        required: true,
        default: 'SAR',
        uppercase: true
    },
    // Fiscal year this applies to
    fiscalYear: {
        type: Number,
        required: true,
        index: true
    },
    // Effective date range
    effectiveFrom: {
        type: Date,
        required: true,
        index: true
    },
    effectiveTo: {
        type: Date,
        default: null
    },
    // Tax calculation period
    period: {
        type: String,
        enum: ['annual', 'monthly', 'weekly'],
        default: 'annual'
    },
    // Tax brackets (progressive)
    brackets: [taxBracketSchema],
    // Standard deductions applied before tax
    standardDeductions: [standardDeductionSchema],
    // Personal exemption amount
    personalExemption: {
        type: Number,
        default: 0
    },
    // Dependent exemption (per dependent)
    dependentExemption: {
        type: Number,
        default: 0
    },
    // Spouse exemption
    spouseExemption: {
        type: Number,
        default: 0
    },
    // Filing status options
    filingStatuses: [{
        code: {
            type: String,
            required: true
        },
        name: String,
        nameAr: String,
        exemptionMultiplier: {
            type: Number,
            default: 1
        }
    }],
    // Additional surcharges
    surcharge: {
        enabled: {
            type: Boolean,
            default: false
        },
        thresholdAmount: {
            type: Number,
            default: 0
        },
        rate: {
            type: Number,
            default: 0
        }
    },
    // Education cess (like India)
    cess: {
        enabled: {
            type: Boolean,
            default: false
        },
        rate: {
            type: Number,
            default: 0
        },
        name: String
    },
    // Is this the active/current slab
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    // Notes
    notes: {
        type: String,
        trim: true,
        maxlength: 1000
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
incomeTaxSlabSchema.index({ firmId: 1, countryCode: 1, fiscalYear: 1 });
incomeTaxSlabSchema.index({ firmId: 1, isActive: 1 });

/**
 * Calculate tax for a given income amount
 * @param {number} grossIncome - Gross taxable income
 * @param {Object} options - Calculation options
 * @returns {Object} Tax calculation result
 */
incomeTaxSlabSchema.methods.calculateTax = function(grossIncome, options = {}) {
    const {
        dependents = 0,
        hasSpouse = false,
        filingStatus = 'single',
        additionalDeductions = 0
    } = options;

    // Start with gross income
    let taxableIncome = grossIncome;

    // Apply standard deductions
    let totalDeductions = 0;
    const deductionsApplied = [];

    for (const deduction of this.standardDeductions || []) {
        let deductionAmount = 0;

        if (deduction.type === 'fixed') {
            deductionAmount = deduction.amount;
        } else if (deduction.type === 'percentage') {
            deductionAmount = (grossIncome * deduction.percentage) / 100;
            if (deduction.maxAmount && deductionAmount > deduction.maxAmount) {
                deductionAmount = deduction.maxAmount;
            }
        }

        totalDeductions += deductionAmount;
        deductionsApplied.push({
            name: deduction.name,
            amount: deductionAmount
        });
    }

    // Apply exemptions
    let totalExemptions = this.personalExemption || 0;

    // Dependent exemptions
    if (dependents > 0 && this.dependentExemption > 0) {
        totalExemptions += dependents * this.dependentExemption;
    }

    // Spouse exemption
    if (hasSpouse && this.spouseExemption > 0) {
        totalExemptions += this.spouseExemption;
    }

    // Filing status multiplier
    const statusConfig = this.filingStatuses?.find(s => s.code === filingStatus);
    if (statusConfig && statusConfig.exemptionMultiplier !== 1) {
        totalExemptions *= statusConfig.exemptionMultiplier;
    }

    // Apply additional deductions
    totalDeductions += additionalDeductions;

    // Calculate taxable income
    taxableIncome = Math.max(0, grossIncome - totalDeductions - totalExemptions);

    // Calculate tax using brackets
    let totalTax = 0;
    const bracketBreakdown = [];

    // Sort brackets by fromAmount
    const sortedBrackets = [...(this.brackets || [])].sort((a, b) => a.fromAmount - b.fromAmount);

    let remainingIncome = taxableIncome;

    for (const bracket of sortedBrackets) {
        if (remainingIncome <= 0) break;

        const bracketStart = bracket.fromAmount;
        const bracketEnd = bracket.toAmount || Infinity;
        const bracketSize = bracketEnd - bracketStart;

        // Calculate income in this bracket
        const incomeInBracket = Math.min(remainingIncome, bracketSize);

        if (incomeInBracket > 0) {
            const taxInBracket = (incomeInBracket * bracket.rate) / 100 + (bracket.fixedAmount || 0);

            totalTax += taxInBracket;
            bracketBreakdown.push({
                fromAmount: bracketStart,
                toAmount: bracket.toAmount,
                rate: bracket.rate,
                incomeInBracket,
                taxAmount: taxInBracket
            });

            remainingIncome -= incomeInBracket;
        }
    }

    // Apply surcharge if applicable
    let surchargeAmount = 0;
    if (this.surcharge?.enabled && taxableIncome > this.surcharge.thresholdAmount) {
        surchargeAmount = (totalTax * this.surcharge.rate) / 100;
        totalTax += surchargeAmount;
    }

    // Apply cess if applicable
    let cessAmount = 0;
    if (this.cess?.enabled) {
        cessAmount = (totalTax * this.cess.rate) / 100;
        totalTax += cessAmount;
    }

    // Round to 2 decimal places
    totalTax = Math.round(totalTax * 100) / 100;

    return {
        grossIncome,
        deductions: {
            standard: totalDeductions - additionalDeductions,
            additional: additionalDeductions,
            total: totalDeductions
        },
        exemptions: {
            personal: this.personalExemption || 0,
            dependents: dependents * (this.dependentExemption || 0),
            spouse: hasSpouse ? (this.spouseExemption || 0) : 0,
            total: totalExemptions
        },
        taxableIncome,
        brackets: bracketBreakdown,
        baseTax: totalTax - surchargeAmount - cessAmount,
        surcharge: surchargeAmount,
        cess: cessAmount,
        totalTax,
        effectiveRate: grossIncome > 0 ? ((totalTax / grossIncome) * 100).toFixed(2) + '%' : '0%',
        marginalRate: sortedBrackets.find(b =>
            taxableIncome >= b.fromAmount &&
            (b.toAmount === null || taxableIncome < b.toAmount)
        )?.rate || 0
    };
};

/**
 * Calculate monthly tax from annual tax
 */
incomeTaxSlabSchema.methods.calculateMonthlyTax = function(annualIncome, options = {}) {
    const annualResult = this.calculateTax(annualIncome, options);
    return {
        ...annualResult,
        monthlyTax: Math.round((annualResult.totalTax / 12) * 100) / 100
    };
};

/**
 * Static: Get active tax slab for a country
 */
incomeTaxSlabSchema.statics.getActiveSlab = async function(firmId, countryCode, date = new Date()) {
    return this.findOne({
        firmId,
        countryCode: countryCode.toUpperCase(),
        isActive: true,
        effectiveFrom: { $lte: date },
        $or: [
            { effectiveTo: null },
            { effectiveTo: { $gte: date } }
        ]
    }).sort({ effectiveFrom: -1 });
};

/**
 * Static: Create default slabs for common countries
 */
incomeTaxSlabSchema.statics.createDefaultSlabs = async function(firmId, createdBy) {
    const defaults = [
        // UAE (0% tax)
        {
            name: 'UAE Personal Income Tax',
            nameAr: 'ضريبة الدخل الشخصي - الإمارات',
            countryCode: 'AE',
            currency: 'AED',
            fiscalYear: new Date().getFullYear(),
            effectiveFrom: new Date(new Date().getFullYear(), 0, 1),
            period: 'annual',
            brackets: [{ fromAmount: 0, toAmount: null, rate: 0 }],
            notes: 'UAE has no personal income tax'
        },
        // Bahrain (0% tax)
        {
            name: 'Bahrain Personal Income Tax',
            nameAr: 'ضريبة الدخل الشخصي - البحرين',
            countryCode: 'BH',
            currency: 'BHD',
            fiscalYear: new Date().getFullYear(),
            effectiveFrom: new Date(new Date().getFullYear(), 0, 1),
            period: 'annual',
            brackets: [{ fromAmount: 0, toAmount: null, rate: 0 }],
            notes: 'Bahrain has no personal income tax'
        },
        // Saudi Arabia (0% tax for individuals, corporate tax exists)
        {
            name: 'Saudi Arabia Personal Income Tax',
            nameAr: 'ضريبة الدخل الشخصي - السعودية',
            countryCode: 'SA',
            currency: 'SAR',
            fiscalYear: new Date().getFullYear(),
            effectiveFrom: new Date(new Date().getFullYear(), 0, 1),
            period: 'annual',
            brackets: [{ fromAmount: 0, toAmount: null, rate: 0 }],
            notes: 'Saudi Arabia has no personal income tax for individuals'
        },
        // Egypt (progressive)
        {
            name: 'Egypt Personal Income Tax',
            nameAr: 'ضريبة الدخل الشخصي - مصر',
            countryCode: 'EG',
            currency: 'EGP',
            fiscalYear: new Date().getFullYear(),
            effectiveFrom: new Date(new Date().getFullYear(), 0, 1),
            period: 'annual',
            brackets: [
                { fromAmount: 0, toAmount: 15000, rate: 0 },
                { fromAmount: 15000, toAmount: 30000, rate: 2.5 },
                { fromAmount: 30000, toAmount: 45000, rate: 10 },
                { fromAmount: 45000, toAmount: 60000, rate: 15 },
                { fromAmount: 60000, toAmount: 200000, rate: 20 },
                { fromAmount: 200000, toAmount: 400000, rate: 22.5 },
                { fromAmount: 400000, toAmount: null, rate: 25 }
            ],
            personalExemption: 15000,
            notes: 'Egyptian personal income tax rates'
        },
        // Jordan (progressive)
        {
            name: 'Jordan Personal Income Tax',
            nameAr: 'ضريبة الدخل الشخصي - الأردن',
            countryCode: 'JO',
            currency: 'JOD',
            fiscalYear: new Date().getFullYear(),
            effectiveFrom: new Date(new Date().getFullYear(), 0, 1),
            period: 'annual',
            brackets: [
                { fromAmount: 0, toAmount: 10000, rate: 5 },
                { fromAmount: 10000, toAmount: 20000, rate: 10 },
                { fromAmount: 20000, toAmount: 30000, rate: 15 },
                { fromAmount: 30000, toAmount: 40000, rate: 20 },
                { fromAmount: 40000, toAmount: null, rate: 25 }
            ],
            personalExemption: 10000,
            spouseExemption: 5000,
            dependentExemption: 2000,
            notes: 'Jordanian personal income tax rates'
        }
    ];

    const created = [];
    for (const slab of defaults) {
        try {
            const doc = await this.create({
                ...slab,
                firmId,
                createdBy,
                isActive: true
            });
            created.push(doc);
        } catch (error) {
            // Skip if exists
            if (error.code !== 11000) {
                logger.error('Error creating tax slab', {
                    countryCode: slab.countryCode,
                    error: error.message
                });
            }
        }
    }

    return created;
};

module.exports = mongoose.model('IncomeTaxSlab', incomeTaxSlabSchema);
