/**
 * GOSI (General Organization for Social Insurance) Calculation Plugin
 *
 * Saudi Arabia's mandatory social insurance contribution system.
 *
 * Contribution Rates (2024):
 * ┌─────────────────┬────────────────┬────────────────┬───────────┐
 * │ Type            │ Employee Rate  │ Employer Rate  │ Total     │
 * ├─────────────────┼────────────────┼────────────────┼───────────┤
 * │ Saudi National  │ 9.75%          │ 11.75%         │ 21.5%     │
 * │ Non-Saudi       │ 0%             │ 2%             │ 2%        │
 * └─────────────────┴────────────────┴────────────────┴───────────┘
 *
 * Breakdown for Saudi:
 * - Pension: 18% (9% employee + 9% employer)
 * - Hazards: 2% (employer only)
 * - SANED: 1.5% (0.75% each)
 *
 * Maximum Contribution Base: 45,000 SAR/month
 *
 * Usage:
 * ```javascript
 * const gosiPlugin = require('./plugins/gosiCalculation.plugin');
 * salarySlipSchema.plugin(gosiPlugin);
 * ```
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// GOSI CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const GOSI_CONFIG = {
    // 2024 Rates
    rates: {
        saudi: {
            employee: 0.0975,      // 9.75%
            employer: 0.1175,      // 11.75%
            total: 0.215,          // 21.5%
            breakdown: {
                pension: { employee: 0.09, employer: 0.09, total: 0.18 },
                hazards: { employee: 0, employer: 0.02, total: 0.02 },
                saned: { employee: 0.0075, employer: 0.0075, total: 0.015 }
            }
        },
        nonSaudi: {
            employee: 0,           // 0%
            employer: 0.02,        // 2% (hazards only)
            total: 0.02,           // 2%
            breakdown: {
                pension: { employee: 0, employer: 0, total: 0 },
                hazards: { employee: 0, employer: 0.02, total: 0.02 },
                saned: { employee: 0, employer: 0, total: 0 }
            }
        }
    },

    // Maximum salary for GOSI calculation
    maxContributionBase: 45000,

    // Minimum salary for GOSI calculation
    minContributionBase: 400,

    // Components to include in GOSI base
    includedComponents: [
        'basicSalary',
        'housingAllowance',
        'transportationAllowance'
    ],

    // Components excluded from GOSI base
    excludedComponents: [
        'overtime',
        'bonus',
        'commission',
        'endOfServiceBenefit'
    ]
};

// ═══════════════════════════════════════════════════════════════
// GOSI SCHEMA EXTENSION
// ═══════════════════════════════════════════════════════════════

const gosiDetailsSchema = new mongoose.Schema({
    // Employee classification
    isSaudiNational: {
        type: Boolean,
        required: true,
        default: true
    },

    // GOSI registration
    gosiNumber: {
        type: String,
        trim: true,
        validate: {
            validator: function(v) {
                return !v || /^\d{10}$/.test(v);
            },
            message: 'GOSI number must be 10 digits'
        }
    },
    gosiRegistrationDate: Date,

    // Contribution base calculation
    contributionBase: {
        type: Number,
        default: 0,
        min: 0
    },
    cappedContributionBase: {
        type: Number,
        default: 0,
        min: 0
    },
    wasCapped: {
        type: Boolean,
        default: false
    },

    // Base components
    baseComponents: {
        basicSalary: { type: Number, default: 0 },
        housingAllowance: { type: Number, default: 0 },
        transportationAllowance: { type: Number, default: 0 },
        otherIncluded: { type: Number, default: 0 }
    },

    // Rates applied
    rates: {
        employee: { type: Number, default: 0 },
        employer: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },

    // Contributions calculated
    contributions: {
        employee: { type: Number, default: 0 },
        employer: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },

    // Breakdown by type
    breakdown: {
        pension: {
            employee: { type: Number, default: 0 },
            employer: { type: Number, default: 0 },
            total: { type: Number, default: 0 }
        },
        hazards: {
            employee: { type: Number, default: 0 },
            employer: { type: Number, default: 0 },
            total: { type: Number, default: 0 }
        },
        saned: {
            employee: { type: Number, default: 0 },
            employer: { type: Number, default: 0 },
            total: { type: Number, default: 0 }
        }
    },

    // Status
    status: {
        type: String,
        enum: ['pending', 'calculated', 'submitted', 'paid', 'error'],
        default: 'pending'
    },
    submittedAt: Date,
    paidAt: Date,
    paymentReference: String,
    errorMessage: String,

    // Audit
    calculatedAt: {
        type: Date,
        default: Date.now
    },
    calculatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// PLUGIN FUNCTION
// ═══════════════════════════════════════════════════════════════

function gosiCalculationPlugin(schema, options = {}) {
    const {
        fieldName = 'gosi',
        autoCalculate = true,
        includedComponents = GOSI_CONFIG.includedComponents,
        customRates = null
    } = options;

    // Add GOSI schema to the parent schema
    schema.add({
        [fieldName]: {
            type: gosiDetailsSchema,
            default: () => ({})
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // INSTANCE METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Calculate GOSI contributions
     * @param {Object} params - Calculation parameters
     * @returns {Object} GOSI calculation result
     */
    schema.methods.calculateGOSI = function(params = {}) {
        const {
            isSaudi = this[fieldName]?.isSaudiNational ?? true,
            basicSalary = 0,
            housingAllowance = 0,
            transportationAllowance = 0,
            otherAllowances = [],
            userId = null
        } = params;

        // Get rates based on nationality
        const rates = customRates || (isSaudi ? GOSI_CONFIG.rates.saudi : GOSI_CONFIG.rates.nonSaudi);

        // Calculate contribution base
        let contributionBase = basicSalary;

        // Add housing if included (usually 25% of basic if not specified)
        if (includedComponents.includes('housingAllowance')) {
            contributionBase += housingAllowance || (basicSalary * 0.25);
        }

        // Add transportation if included
        if (includedComponents.includes('transportationAllowance')) {
            contributionBase += transportationAllowance;
        }

        // Add other included allowances
        for (const allowance of otherAllowances) {
            if (allowance.includedInGOSI) {
                contributionBase += allowance.amount || 0;
            }
        }

        // Store original before capping
        const originalBase = contributionBase;

        // Apply cap
        const wasCapped = contributionBase > GOSI_CONFIG.maxContributionBase;
        const cappedBase = Math.min(contributionBase, GOSI_CONFIG.maxContributionBase);

        // Calculate contributions
        const employeeContribution = Math.round(cappedBase * rates.employee * 100) / 100;
        const employerContribution = Math.round(cappedBase * rates.employer * 100) / 100;
        const totalContribution = employeeContribution + employerContribution;

        // Calculate breakdown
        const breakdown = {
            pension: {
                employee: Math.round(cappedBase * rates.breakdown.pension.employee * 100) / 100,
                employer: Math.round(cappedBase * rates.breakdown.pension.employer * 100) / 100,
                total: 0
            },
            hazards: {
                employee: Math.round(cappedBase * rates.breakdown.hazards.employee * 100) / 100,
                employer: Math.round(cappedBase * rates.breakdown.hazards.employer * 100) / 100,
                total: 0
            },
            saned: {
                employee: Math.round(cappedBase * rates.breakdown.saned.employee * 100) / 100,
                employer: Math.round(cappedBase * rates.breakdown.saned.employer * 100) / 100,
                total: 0
            }
        };

        // Sum totals
        breakdown.pension.total = breakdown.pension.employee + breakdown.pension.employer;
        breakdown.hazards.total = breakdown.hazards.employee + breakdown.hazards.employer;
        breakdown.saned.total = breakdown.saned.employee + breakdown.saned.employer;

        // Update document
        this[fieldName] = {
            ...this[fieldName],
            isSaudiNational: isSaudi,
            contributionBase: originalBase,
            cappedContributionBase: cappedBase,
            wasCapped,
            baseComponents: {
                basicSalary,
                housingAllowance: housingAllowance || (basicSalary * 0.25),
                transportationAllowance,
                otherIncluded: otherAllowances.reduce((sum, a) => sum + (a.includedInGOSI ? a.amount : 0), 0)
            },
            rates: {
                employee: rates.employee,
                employer: rates.employer,
                total: rates.total
            },
            contributions: {
                employee: employeeContribution,
                employer: employerContribution,
                total: totalContribution
            },
            breakdown,
            status: 'calculated',
            calculatedAt: new Date(),
            calculatedBy: userId
        };

        return this[fieldName];
    };

    /**
     * Get GOSI summary for reporting
     * @returns {Object} Summary object
     */
    schema.methods.getGOSISummary = function() {
        const gosi = this[fieldName];
        if (!gosi) return null;

        return {
            employeeType: gosi.isSaudiNational ? 'Saudi' : 'Non-Saudi',
            gosiNumber: gosi.gosiNumber,
            contributionBase: gosi.cappedContributionBase,
            wasCapped: gosi.wasCapped,
            employeeDeduction: gosi.contributions.employee,
            employerContribution: gosi.contributions.employer,
            totalContribution: gosi.contributions.total,
            breakdown: {
                pension: gosi.breakdown.pension.total,
                hazards: gosi.breakdown.hazards.total,
                saned: gosi.breakdown.saned.total
            },
            status: gosi.status
        };
    };

    /**
     * Validate GOSI calculation
     * @returns {Object} Validation result
     */
    schema.methods.validateGOSI = function() {
        const gosi = this[fieldName];
        const errors = [];
        const warnings = [];

        if (!gosi) {
            errors.push('GOSI data not calculated');
            return { valid: false, errors, warnings };
        }

        // Check GOSI number for Saudi nationals
        if (gosi.isSaudiNational && !gosi.gosiNumber) {
            warnings.push('GOSI number not provided for Saudi employee');
        }

        // Validate contribution base
        if (gosi.cappedContributionBase < GOSI_CONFIG.minContributionBase) {
            errors.push(`Contribution base below minimum (${GOSI_CONFIG.minContributionBase} SAR)`);
        }

        // Verify calculation accuracy
        const expectedEmployee = Math.round(gosi.cappedContributionBase * gosi.rates.employee * 100) / 100;
        if (Math.abs(gosi.contributions.employee - expectedEmployee) > 0.01) {
            errors.push('Employee contribution calculation mismatch');
        }

        const expectedEmployer = Math.round(gosi.cappedContributionBase * gosi.rates.employer * 100) / 100;
        if (Math.abs(gosi.contributions.employer - expectedEmployer) > 0.01) {
            errors.push('Employer contribution calculation mismatch');
        }

        // Check breakdown totals
        const breakdownTotal = gosi.breakdown.pension.total + gosi.breakdown.hazards.total + gosi.breakdown.saned.total;
        if (Math.abs(gosi.contributions.total - breakdownTotal) > 0.02) {
            warnings.push('Breakdown totals do not match contribution total');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    };

    /**
     * Mark GOSI as submitted
     */
    schema.methods.markGOSISubmitted = function() {
        if (this[fieldName]) {
            this[fieldName].status = 'submitted';
            this[fieldName].submittedAt = new Date();
        }
    };

    /**
     * Mark GOSI as paid
     */
    schema.methods.markGOSIPaid = function(paymentReference) {
        if (this[fieldName]) {
            this[fieldName].status = 'paid';
            this[fieldName].paidAt = new Date();
            this[fieldName].paymentReference = paymentReference;
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // STATIC METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get GOSI rates
     * @returns {Object} GOSI rate configuration
     */
    schema.statics.getGOSIRates = function() {
        return GOSI_CONFIG.rates;
    };

    /**
     * Get GOSI configuration
     * @returns {Object} Full GOSI configuration
     */
    schema.statics.getGOSIConfig = function() {
        return { ...GOSI_CONFIG };
    };

    /**
     * Calculate GOSI for an amount (static helper)
     * @param {number} amount - Salary amount
     * @param {boolean} isSaudi - Is Saudi national
     * @returns {Object} Calculation result
     */
    schema.statics.calculateGOSIAmount = function(amount, isSaudi = true) {
        const rates = isSaudi ? GOSI_CONFIG.rates.saudi : GOSI_CONFIG.rates.nonSaudi;
        const cappedAmount = Math.min(amount, GOSI_CONFIG.maxContributionBase);

        return {
            base: amount,
            cappedBase: cappedAmount,
            wasCapped: amount > GOSI_CONFIG.maxContributionBase,
            employee: Math.round(cappedAmount * rates.employee * 100) / 100,
            employer: Math.round(cappedAmount * rates.employer * 100) / 100,
            total: Math.round(cappedAmount * rates.total * 100) / 100,
            rates
        };
    };

    /**
     * Aggregate GOSI totals for a collection
     * @param {Object} match - MongoDB match query
     * @returns {Object} Aggregated totals
     */
    schema.statics.aggregateGOSI = async function(match = {}) {
        const results = await this.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    totalEmployees: { $sum: 1 },
                    saudiCount: {
                        $sum: { $cond: [`$${fieldName}.isSaudiNational`, 1, 0] }
                    },
                    nonSaudiCount: {
                        $sum: { $cond: [`$${fieldName}.isSaudiNational`, 0, 1] }
                    },
                    totalContributionBase: { $sum: `$${fieldName}.cappedContributionBase` },
                    totalEmployeeContribution: { $sum: `$${fieldName}.contributions.employee` },
                    totalEmployerContribution: { $sum: `$${fieldName}.contributions.employer` },
                    totalContribution: { $sum: `$${fieldName}.contributions.total` },
                    totalPension: { $sum: `$${fieldName}.breakdown.pension.total` },
                    totalHazards: { $sum: `$${fieldName}.breakdown.hazards.total` },
                    totalSaned: { $sum: `$${fieldName}.breakdown.saned.total` }
                }
            }
        ]);

        return results[0] || {
            totalEmployees: 0,
            saudiCount: 0,
            nonSaudiCount: 0,
            totalContributionBase: 0,
            totalEmployeeContribution: 0,
            totalEmployerContribution: 0,
            totalContribution: 0,
            totalPension: 0,
            totalHazards: 0,
            totalSaned: 0
        };
    };

    /**
     * Generate GOSI monthly report
     * @param {Object} params - Report parameters
     * @returns {Object} GOSI report data
     */
    schema.statics.generateGOSIReport = async function(params = {}) {
        const { firmId, month, year } = params;

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const match = {
            firmId: new mongoose.Types.ObjectId(firmId),
            createdAt: { $gte: startDate, $lte: endDate },
            [`${fieldName}.status`]: { $in: ['calculated', 'submitted', 'paid'] }
        };

        const records = await this.find(match)
            .populate('employeeId', 'name nameAr gosiNumber nationalId')
            .lean();

        const aggregated = await this.aggregateGOSI(match);

        return {
            reportPeriod: {
                month,
                year,
                startDate,
                endDate
            },
            summary: aggregated,
            employees: records.map(r => ({
                employeeId: r.employeeId?._id,
                employeeName: r.employeeId?.name,
                gosiNumber: r.employeeId?.gosiNumber || r[fieldName]?.gosiNumber,
                isSaudi: r[fieldName]?.isSaudiNational,
                contributionBase: r[fieldName]?.cappedContributionBase,
                employeeDeduction: r[fieldName]?.contributions?.employee,
                employerContribution: r[fieldName]?.contributions?.employer,
                totalContribution: r[fieldName]?.contributions?.total,
                status: r[fieldName]?.status
            })),
            generatedAt: new Date()
        };
    };

    // ═══════════════════════════════════════════════════════════════
    // INDEXES
    // ═══════════════════════════════════════════════════════════════

    schema.index({ [`${fieldName}.status`]: 1 });
    schema.index({ [`${fieldName}.gosiNumber`]: 1 });
    schema.index({ [`${fieldName}.isSaudiNational`]: 1 });
    schema.index({ [`${fieldName}.calculatedAt`]: -1 });
}

// Export plugin and configuration
module.exports = gosiCalculationPlugin;
module.exports.GOSI_CONFIG = GOSI_CONFIG;
module.exports.gosiDetailsSchema = gosiDetailsSchema;
