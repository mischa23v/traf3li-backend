/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║    ⚠️  OFFICIAL SAUDI GOSI RATES - DO NOT MODIFY WITHOUT VERIFICATION  ⚠️    ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                               ║
 * ║  GOSI (التأمينات الاجتماعية) - General Organization for Social Insurance     ║
 * ║                                                                               ║
 * ║  These values are set by GOSI and are legally binding. Incorrect rates:      ║
 * ║  - Under-payment: 2% monthly penalty on overdue amount                        ║
 * ║  - Over-payment: No refund, manual correction required                        ║
 * ║  - Repeated violations: Service suspension                                    ║
 * ║                                                                               ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  OFFICIAL RATES (verified January 2026):                                      ║
 * ║                                                                               ║
 * ║  LEGACY EMPLOYEES (before July 3, 2024):                                      ║
 * ║  - Saudi: 21.5% total (9.75% employee + 11.75% employer)                      ║
 * ║  - Non-Saudi: 2% total (0% employee + 2% employer - hazards only)             ║
 * ║                                                                               ║
 * ║  2024 REFORM (NEW employees after July 3, 2024):                              ║
 * ║  - Pension rates graduate from 9% to 11% by 2028                              ║
 * ║  - July 2024: 9% → July 2025: 9.5% → July 2026: 10% → ... → July 2028: 11%   ║
 * ║  - Hazards (2%) and SANED (1.5%) remain unchanged                             ║
 * ║                                                                               ║
 * ║  CONTRIBUTION BASE:                                                           ║
 * ║  - Base = Basic Salary + Housing Allowance ONLY                               ║
 * ║  - Maximum: SAR 45,000/month                                                  ║
 * ║  - Minimum: SAR 1,500/month (some sources cite 400)                           ║
 * ║                                                                               ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Official sources:                                                            ║
 * ║  - https://www.gosi.gov.sa (GOSI Official)                                    ║
 * ║  - https://blog.zenhr.com/en/guide-to-the-gosi-social-insurance-system        ║
 * ║  - https://mercans.com/resources/statutory-alerts/saudi-arabia                ║
 * ║                                                                               ║
 * ║  Last verified: January 2026                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// Date when new GOSI rates took effect (July 3, 2024)
const GOSI_REFORM_DATE = new Date('2024-07-03');

// 2024 Reform graduated pension rates by year (for NEW employees only)
// Hazards (2%) and SANED (1.5%) are NOT affected by the reform
const GOSI_2024_REFORM_PENSION_RATES = {
    2024: { employee: 0.09, employer: 0.09 },     // July 2024: 9% each
    2025: { employee: 0.095, employer: 0.095 },   // July 2025: 9.5% each
    2026: { employee: 0.10, employer: 0.10 },     // July 2026: 10% each
    2027: { employee: 0.105, employer: 0.105 },   // July 2027: 10.5% each
    2028: { employee: 0.11, employer: 0.11 },     // July 2028: 11% each (final)
};

const GOSI_RATES = {
    // Saudi National rates (LEGACY - for employees who started BEFORE July 3, 2024)
    SAUDI: {
        employee: 0.0975,      // 9.75% (9% pension + 0.75% SANED)
        employer: 0.1175,      // 11.75% (9% pension + 2% hazards + 0.75% SANED)
        total: 0.215,          // 21.5%
        // Detailed breakdown
        breakdown: {
            pension: { employee: 0.09, employer: 0.09, total: 0.18 },    // 18% معاشات
            hazards: { employee: 0, employer: 0.02, total: 0.02 },       // 2% مخاطر العمل
            saned: { employee: 0.0075, employer: 0.0075, total: 0.015 }  // 1.5% ساند
        }
    },

    // Non-Saudi (expatriate) rates - hazards only (unchanged by 2024 reform)
    NON_SAUDI: {
        employee: 0,           // 0%
        employer: 0.02,        // 2% (hazards only)
        total: 0.02,           // 2%
        breakdown: {
            pension: { employee: 0, employer: 0, total: 0 },
            hazards: { employee: 0, employer: 0.02, total: 0.02 },
            saned: { employee: 0, employer: 0, total: 0 }
        }
    },

    // Maximum contribution base (salary cap) - Basic + Housing Allowance
    MAX_CONTRIBUTION_BASE: 45000,  // SAR 45,000/month

    // Minimum contribution base (official GOSI minimum)
    MIN_CONTRIBUTION_BASE: 1500,   // SAR 1,500/month (NOT 400 - that's Nitaqat threshold)

    // Minimum wage for Saudis (for Nitaqat compliance - counts as 0.5 if below)
    MINIMUM_WAGE_SAUDI: 4000,      // SAR 4,000/month

    // Nitaqat threshold where Saudi counts as 0.5 person
    NITAQAT_HALF_COUNT_THRESHOLD: 4000, // SAR 4,000/month
};

/**
 * Get GOSI pension rates for NEW employees based on the 2024 reform
 * @param {Date} employeeStartDate - Date the employee started working
 * @param {Date} calculationDate - Date for which to calculate (defaults to now)
 * @returns {Object} { employee, employer } pension rates
 */
function getGOSI2024ReformPensionRates(employeeStartDate, calculationDate = new Date()) {
    // Legacy employees (started before July 3, 2024) use original rates
    if (employeeStartDate < GOSI_REFORM_DATE) {
        return { employee: 0.09, employer: 0.09, isReformEmployee: false };
    }

    // New employees use graduated rates based on calculation year
    const year = calculationDate.getFullYear();
    const month = calculationDate.getMonth();

    // Rates change in July each year
    let effectiveYear = year;
    if (month < 6) { // Before July
        effectiveYear = year - 1;
    }

    // Cap at 2028 rates (final rates)
    if (effectiveYear >= 2028) {
        return { ...GOSI_2024_REFORM_PENSION_RATES[2028], isReformEmployee: true };
    }

    // Use appropriate year's rates (minimum 2024)
    const rateYear = Math.max(2024, effectiveYear);
    return { ...GOSI_2024_REFORM_PENSION_RATES[rateYear], isReformEmployee: true };
}

/**
 * Get complete GOSI rates for a Saudi employee accounting for 2024 reform
 * @param {Date} employeeStartDate - Date the employee started working (null = legacy)
 * @param {Date} calculationDate - Date for which to calculate
 * @returns {Object} Complete rate structure
 */
function getSaudiGOSIRates(employeeStartDate = null, calculationDate = new Date()) {
    // If no start date provided, assume legacy employee
    if (!employeeStartDate) {
        return GOSI_RATES.SAUDI;
    }

    const pensionRates = getGOSI2024ReformPensionRates(employeeStartDate, calculationDate);

    // Hazards and SANED are NOT affected by the 2024 reform
    const hazardsEmployer = 0.02;
    const sanedEmployee = 0.0075;
    const sanedEmployer = 0.0075;

    const employeeTotal = pensionRates.employee + sanedEmployee;
    const employerTotal = pensionRates.employer + hazardsEmployer + sanedEmployer;

    return {
        employee: employeeTotal,
        employer: employerTotal,
        total: employeeTotal + employerTotal,
        isReformEmployee: pensionRates.isReformEmployee,
        breakdown: {
            pension: {
                employee: pensionRates.employee,
                employer: pensionRates.employer,
                total: pensionRates.employee + pensionRates.employer
            },
            hazards: { employee: 0, employer: hazardsEmployer, total: hazardsEmployer },
            saned: { employee: sanedEmployee, employer: sanedEmployer, total: sanedEmployee + sanedEmployer }
        }
    };
}

/**
 * Calculate GOSI contributions for an employee
 *
 * IMPORTANT: GOSI is calculated on Basic Salary + Housing Allowance ONLY
 * Other allowances (transport, food, etc.) are NOT included in the GOSI base
 *
 * @param {boolean} isSaudi - Whether the employee is Saudi
 * @param {number} basicSalary - Basic salary in SAR
 * @param {Object} options - Optional parameters
 * @param {number} options.housingAllowance - Housing allowance in SAR (added to GOSI base)
 * @param {Date} options.employeeStartDate - Date employee started (for 2024 reform rates)
 * @param {Date} options.calculationDate - Date for calculation (defaults to now)
 * @returns {Object} { employee, employer, total, capped, breakdown }
 */
function calculateGOSI(isSaudi, basicSalary, options = {}) {
    const {
        housingAllowance = 0,
        employeeStartDate = null,
        calculationDate = new Date()
    } = options;

    // Get appropriate rates based on nationality and 2024 reform
    let rates;
    if (isSaudi) {
        rates = getSaudiGOSIRates(employeeStartDate, calculationDate);
    } else {
        rates = GOSI_RATES.NON_SAUDI;
    }

    // Validate basic salary - must be a positive number
    const basic = parseFloat(basicSalary);
    const housing = parseFloat(housingAllowance) || 0;

    if (isNaN(basic) || basic <= 0) {
        return {
            employee: 0,
            employer: 0,
            total: 0,
            baseSalary: 0,
            housingAllowance: 0,
            contributionBase: 0,
            cappedSalary: 0,
            wasCapped: false,
            rates: { employee: rates.employee, employer: rates.employer, total: rates.total },
            breakdown: {},
            error: basic <= 0 ? 'Salary must be positive' : 'Invalid salary value'
        };
    }

    // GOSI base = Basic + Housing (per official GOSI regulations)
    const gosiBase = basic + housing;

    // Apply the 45,000 SAR max cap and 1,500 SAR minimum base
    const cappedSalary = Math.min(Math.max(gosiBase, GOSI_RATES.MIN_CONTRIBUTION_BASE), GOSI_RATES.MAX_CONTRIBUTION_BASE);
    const wasCapped = gosiBase > GOSI_RATES.MAX_CONTRIBUTION_BASE;
    const wasBelowMin = gosiBase < GOSI_RATES.MIN_CONTRIBUTION_BASE;

    // Calculate contributions
    const employeeContribution = Math.round(cappedSalary * rates.employee);
    const employerContribution = Math.round(cappedSalary * rates.employer);
    const totalContribution = employeeContribution + employerContribution;

    // Calculate breakdown (for detailed reporting)
    const breakdown = {};
    if (isSaudi && rates.breakdown) {
        breakdown.pension = {
            employee: Math.round(cappedSalary * rates.breakdown.pension.employee),
            employer: Math.round(cappedSalary * rates.breakdown.pension.employer)
        };
        breakdown.hazards = {
            employee: 0,
            employer: Math.round(cappedSalary * rates.breakdown.hazards.employer)
        };
        breakdown.saned = {
            employee: Math.round(cappedSalary * rates.breakdown.saned.employee),
            employer: Math.round(cappedSalary * rates.breakdown.saned.employer)
        };
    } else {
        breakdown.hazards = {
            employee: 0,
            employer: Math.round(cappedSalary * rates.breakdown.hazards.employer)
        };
    }

    return {
        employee: employeeContribution,
        employer: employerContribution,
        total: totalContribution,
        baseSalary: basic,
        housingAllowance: housing,
        contributionBase: gosiBase,
        cappedSalary,
        wasCapped,
        wasBelowMin,
        isReformEmployee: rates.isReformEmployee || false,
        rates: {
            employee: rates.employee,
            employer: rates.employer,
            total: rates.total
        },
        breakdown
    };
}

/**
 * Get GOSI rates as percentages (for display)
 * @param {boolean} isSaudi - Whether to get Saudi rates
 * @returns {Object} { employee, employer, total } as percentages
 */
function getGOSIRatesPercent(isSaudi) {
    const rates = isSaudi ? GOSI_RATES.SAUDI : GOSI_RATES.NON_SAUDI;
    return {
        employee: rates.employee * 100,
        employer: rates.employer * 100,
        total: rates.total * 100
    };
}

/**
 * Validate GOSI calculation
 * @param {number} calculatedAmount - The calculated GOSI amount
 * @param {number} basicSalary - The basic salary used
 * @param {boolean} isSaudi - Whether Saudi employee
 * @param {string} type - 'employee' or 'employer'
 * @returns {Object} { valid, expected, difference }
 */
function validateGOSIAmount(calculatedAmount, basicSalary, isSaudi, type = 'employee') {
    const gosi = calculateGOSI(isSaudi, basicSalary);
    const expected = type === 'employee' ? gosi.employee : gosi.employer;
    const difference = Math.abs(calculatedAmount - expected);

    return {
        valid: difference <= 1, // Allow 1 SAR rounding difference
        expected,
        calculated: calculatedAmount,
        difference
    };
}

/**
 * Generate GOSI payment summary for a list of employees
 * Useful for displaying total GOSI contributions to be paid
 * @param {Array} employees - Array of { nationality: 'SA'|'non-SA', basicSalary: number }
 * @returns {Object} Payment summary with breakdowns
 */
function generateGOSIPaymentSummary(employees) {
    if (!Array.isArray(employees) || employees.length === 0) {
        return {
            success: false,
            error: 'No employees provided',
            totalEmployees: 0,
            saudiEmployees: 0,
            nonSaudiEmployees: 0,
            totals: {
                employeeContribution: 0,
                employerContribution: 0,
                totalContribution: 0
            },
            breakdown: { pension: 0, hazards: 0, saned: 0 },
            byNationality: { saudi: {}, nonSaudi: {} }
        };
    }

    const summary = {
        success: true,
        totalEmployees: employees.length,
        saudiEmployees: 0,
        nonSaudiEmployees: 0,
        totals: {
            employeeContribution: 0,
            employerContribution: 0,
            totalContribution: 0
        },
        breakdown: {
            pension: { employee: 0, employer: 0, total: 0 },
            hazards: { employee: 0, employer: 0, total: 0 },
            saned: { employee: 0, employer: 0, total: 0 }
        },
        byNationality: {
            saudi: {
                count: 0,
                totalBasicSalary: 0,
                totalCappedSalary: 0,
                employeeContribution: 0,
                employerContribution: 0,
                totalContribution: 0
            },
            nonSaudi: {
                count: 0,
                totalBasicSalary: 0,
                totalCappedSalary: 0,
                employeeContribution: 0,
                employerContribution: 0,
                totalContribution: 0
            }
        },
        cappedEmployees: [], // Employees whose salary was capped at 45,000
        belowMinEmployees: [], // Employees below 400 SAR minimum base
        invalidEmployees: [], // Employees with invalid salary data
        processingDetails: []
    };

    employees.forEach((emp, index) => {
        const isSaudi = emp.nationality === 'SA' || emp.nationality === 'saudi' || emp.isSaudi === true;
        const empLabel = emp.name || emp.employeeName || `Employee ${index + 1}`;

        const gosiResult = calculateGOSI(isSaudi, emp.basicSalary);

        // Track invalid employees
        if (gosiResult.error) {
            summary.invalidEmployees.push({
                index,
                name: empLabel,
                error: gosiResult.error,
                salary: emp.basicSalary
            });
            return; // Skip invalid employees
        }

        // Update nationality counts
        if (isSaudi) {
            summary.saudiEmployees++;
            summary.byNationality.saudi.count++;
            summary.byNationality.saudi.totalBasicSalary += gosiResult.baseSalary;
            summary.byNationality.saudi.totalCappedSalary += gosiResult.cappedSalary;
            summary.byNationality.saudi.employeeContribution += gosiResult.employee;
            summary.byNationality.saudi.employerContribution += gosiResult.employer;
            summary.byNationality.saudi.totalContribution += gosiResult.total;
        } else {
            summary.nonSaudiEmployees++;
            summary.byNationality.nonSaudi.count++;
            summary.byNationality.nonSaudi.totalBasicSalary += gosiResult.baseSalary;
            summary.byNationality.nonSaudi.totalCappedSalary += gosiResult.cappedSalary;
            summary.byNationality.nonSaudi.employeeContribution += gosiResult.employee;
            summary.byNationality.nonSaudi.employerContribution += gosiResult.employer;
            summary.byNationality.nonSaudi.totalContribution += gosiResult.total;
        }

        // Update totals
        summary.totals.employeeContribution += gosiResult.employee;
        summary.totals.employerContribution += gosiResult.employer;
        summary.totals.totalContribution += gosiResult.total;

        // Update breakdown
        if (gosiResult.breakdown) {
            if (gosiResult.breakdown.pension) {
                summary.breakdown.pension.employee += gosiResult.breakdown.pension.employee || 0;
                summary.breakdown.pension.employer += gosiResult.breakdown.pension.employer || 0;
            }
            if (gosiResult.breakdown.hazards) {
                summary.breakdown.hazards.employee += gosiResult.breakdown.hazards.employee || 0;
                summary.breakdown.hazards.employer += gosiResult.breakdown.hazards.employer || 0;
            }
            if (gosiResult.breakdown.saned) {
                summary.breakdown.saned.employee += gosiResult.breakdown.saned.employee || 0;
                summary.breakdown.saned.employer += gosiResult.breakdown.saned.employer || 0;
            }
        }

        // Track capped employees
        if (gosiResult.wasCapped) {
            summary.cappedEmployees.push({
                index,
                name: empLabel,
                originalSalary: gosiResult.baseSalary,
                cappedSalary: gosiResult.cappedSalary,
                reduction: gosiResult.baseSalary - gosiResult.cappedSalary
            });
        }

        // Track below minimum
        if (gosiResult.wasBelowMin) {
            summary.belowMinEmployees.push({
                index,
                name: empLabel,
                salary: gosiResult.baseSalary,
                minimumBase: GOSI_RATES.MIN_CONTRIBUTION_BASE
            });
        }

        // Store processing details for audit
        summary.processingDetails.push({
            index,
            name: empLabel,
            nationality: isSaudi ? 'Saudi' : 'Non-Saudi',
            basicSalary: gosiResult.baseSalary,
            cappedSalary: gosiResult.cappedSalary,
            employeeContribution: gosiResult.employee,
            employerContribution: gosiResult.employer,
            totalContribution: gosiResult.total
        });
    });

    // Calculate breakdown totals
    summary.breakdown.pension.total = summary.breakdown.pension.employee + summary.breakdown.pension.employer;
    summary.breakdown.hazards.total = summary.breakdown.hazards.employee + summary.breakdown.hazards.employer;
    summary.breakdown.saned.total = summary.breakdown.saned.employee + summary.breakdown.saned.employer;

    // Add formatted summary for display (bilingual)
    // Calculate next month for deadline (handles December -> January rollover)
    const now = new Date();
    const deadlineMonth = now.getMonth() + 1; // 0-indexed, so +1 for next month
    const deadlineYear = deadlineMonth > 11 ? now.getFullYear() + 1 : now.getFullYear();
    const actualDeadlineMonth = deadlineMonth > 11 ? 1 : deadlineMonth + 1; // Convert to 1-indexed

    summary.formattedSummary = {
        title: 'ملخص اشتراكات التأمينات الاجتماعية / GOSI Contributions Summary',
        period: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        deadline: `15/${actualDeadlineMonth}/${deadlineYear}`,
        items: [
            {
                label: 'إجمالي حصة الموظفين / Total Employee Share',
                value: summary.totals.employeeContribution,
                formatted: `${summary.totals.employeeContribution.toLocaleString()} SAR`
            },
            {
                label: 'إجمالي حصة صاحب العمل / Total Employer Share',
                value: summary.totals.employerContribution,
                formatted: `${summary.totals.employerContribution.toLocaleString()} SAR`
            },
            {
                label: 'المبلغ المطلوب سداده / Total Amount Due',
                value: summary.totals.totalContribution,
                formatted: `${summary.totals.totalContribution.toLocaleString()} SAR`,
                highlight: true
            }
        ],
        warnings: []
    };

    // Add warnings for capped/below minimum
    if (summary.cappedEmployees.length > 0) {
        summary.formattedSummary.warnings.push(
            `${summary.cappedEmployees.length} موظف تجاوز راتبه الحد الأقصى (45,000 ريال) / ${summary.cappedEmployees.length} employee(s) salary capped at 45,000 SAR`
        );
    }
    if (summary.belowMinEmployees.length > 0) {
        summary.formattedSummary.warnings.push(
            `${summary.belowMinEmployees.length} موظف راتبه أقل من الحد الأدنى (400 ريال) / ${summary.belowMinEmployees.length} employee(s) below minimum base (400 SAR)`
        );
    }
    if (summary.invalidEmployees.length > 0) {
        summary.formattedSummary.warnings.push(
            `${summary.invalidEmployees.length} موظف ببيانات غير صالحة / ${summary.invalidEmployees.length} employee(s) with invalid data`
        );
    }

    return summary;
}

module.exports = {
    GOSI_RATES,
    GOSI_REFORM_DATE,
    GOSI_2024_REFORM_PENSION_RATES,
    calculateGOSI,
    getSaudiGOSIRates,
    getGOSI2024ReformPensionRates,
    getGOSIRatesPercent,
    validateGOSIAmount,
    generateGOSIPaymentSummary
};
