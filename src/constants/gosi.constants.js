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

    // Validate input - must be a positive number
    const salary = parseFloat(basicSalary);
    if (isNaN(salary) || salary <= 0) {
        return {
            employee: 0,
            employer: 0,
            total: 0,
            baseSalary: 0,
            cappedSalary: 0,
            wasCapped: false,
            rates: { employee: rates.employee, employer: rates.employer, total: rates.total },
            breakdown: {},
            error: salary <= 0 ? 'Salary must be positive' : 'Invalid salary value'
        };
    }

    // Apply the 45,000 SAR max cap and 400 SAR minimum base
    const cappedSalary = Math.min(Math.max(salary, GOSI_RATES.MIN_CONTRIBUTION_BASE), GOSI_RATES.MAX_CONTRIBUTION_BASE);
    const wasCapped = salary > GOSI_RATES.MAX_CONTRIBUTION_BASE;

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
        baseSalary: salary,
        cappedSalary,
        wasCapped,
        wasBelowMin: salary < GOSI_RATES.MIN_CONTRIBUTION_BASE,
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
    calculateGOSI,
    getGOSIRatesPercent,
    validateGOSIAmount,
    generateGOSIPaymentSummary
};
