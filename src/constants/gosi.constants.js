/**
 * GOSI (التأمينات الاجتماعية) Constants
 * Saudi Arabia General Organization for Social Insurance
 *
 * Official 2024 Rates:
 * - Saudi employees: 21.5% total (9.75% employee + 11.75% employer)
 * - Non-Saudi employees: 2% total (0% employee + 2% employer - hazards only)
 *
 * CRITICAL: All GOSI calculations in the codebase MUST use these constants
 * to prevent rate mismatches between different files.
 *
 * Reference: https://www.gosi.gov.sa
 */

const GOSI_RATES = {
    // Saudi National rates
    SAUDI: {
        employee: 0.0975,      // 9.75%
        employer: 0.1175,      // 11.75%
        total: 0.215,          // 21.5%
        // Detailed breakdown
        breakdown: {
            pension: { employee: 0.09, employer: 0.09, total: 0.18 },    // 18% معاشات
            hazards: { employee: 0, employer: 0.02, total: 0.02 },       // 2% مخاطر العمل
            saned: { employee: 0.0075, employer: 0.0075, total: 0.015 }  // 1.5% ساند
        }
    },

    // Non-Saudi (expatriate) rates - hazards only
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

    // Maximum contribution base (salary cap)
    MAX_CONTRIBUTION_BASE: 45000,  // SAR 45,000/month

    // Minimum contribution base
    MIN_CONTRIBUTION_BASE: 400,    // SAR 400/month

    // Minimum wage for Saudis (for Nitaqat compliance)
    MINIMUM_WAGE_SAUDI: 4000,      // SAR 4,000/month
};

/**
 * Calculate GOSI contributions for an employee
 * @param {boolean} isSaudi - Whether the employee is Saudi
 * @param {number} basicSalary - Basic salary in SAR
 * @returns {Object} { employee, employer, total, capped, breakdown }
 */
function calculateGOSI(isSaudi, basicSalary) {
    const rates = isSaudi ? GOSI_RATES.SAUDI : GOSI_RATES.NON_SAUDI;

    // Apply the 45,000 SAR cap
    const cappedSalary = Math.min(basicSalary, GOSI_RATES.MAX_CONTRIBUTION_BASE);
    const wasCapped = basicSalary > GOSI_RATES.MAX_CONTRIBUTION_BASE;

    // Calculate contributions
    const employeeContribution = Math.round(cappedSalary * rates.employee);
    const employerContribution = Math.round(cappedSalary * rates.employer);
    const totalContribution = employeeContribution + employerContribution;

    // Calculate breakdown (for detailed reporting)
    const breakdown = {};
    if (isSaudi) {
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
        baseSalary: basicSalary,
        cappedSalary,
        wasCapped,
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

module.exports = {
    GOSI_RATES,
    calculateGOSI,
    getGOSIRatesPercent,
    validateGOSIAmount
};
