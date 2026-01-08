/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  ⚠️  OFFICIAL SAUDI LABOR LAW EOSB CALCULATION - DO NOT MODIFY  ⚠️          ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                               ║
 * ║  End of Service Benefits (مكافأة نهاية الخدمة)                                ║
 * ║                                                                               ║
 * ║  CALCULATION FORMULA (Articles 84-88):                                        ║
 * ║  ═══════════════════════════════════════                                      ║
 * ║  - First 5 years: 0.5 × monthly wage × years                                  ║
 * ║  - After 5 years: 1.0 × monthly wage × years                                  ║
 * ║                                                                               ║
 * ║  WAGE BASE:                                                                   ║
 * ║  ═══════════════════════════════════════                                      ║
 * ║  Basic Salary + Housing Allowance + All fixed allowances                      ║
 * ║  (Use last wage - Article 88)                                                 ║
 * ║                                                                               ║
 * ║  RESIGNATION REDUCTIONS (Article 85):                                         ║
 * ║  ═══════════════════════════════════════                                      ║
 * ║  - < 2 years service: 0% (no EOSB)                                            ║
 * ║  - 2-5 years service: 33.33% of calculated EOSB                               ║
 * ║  - 5-10 years service: 66.67% of calculated EOSB                              ║
 * ║  - > 10 years service: 100% of calculated EOSB                                ║
 * ║                                                                               ║
 * ║  FULL EOSB EXCEPTIONS (Article 87):                                           ║
 * ║  ═══════════════════════════════════════                                      ║
 * ║  - Force majeure                                                              ║
 * ║  - Female resignation within 6 months of marriage                             ║
 * ║  - Female resignation within 3 months of childbirth                           ║
 * ║  - Article 81 resignation (employer breach)                                   ║
 * ║                                                                               ║
 * ║  NO EOSB:                                                                     ║
 * ║  ═══════════════════════════════════════                                      ║
 * ║  - Article 80 termination (serious misconduct)                                ║
 * ║  - During probation period                                                    ║
 * ║  - Service less than 2 years (resignation only)                               ║
 * ║                                                                               ║
 * ║  Last verified: January 2026                                                  ║
 * ║  Official sources: hrsd.gov.sa, mol.gov.sa, Labor Law Articles 84-88          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const logger = require('../utils/logger');

/**
 * EOSB Service - End of Service Benefits Calculator
 *
 * Implements Saudi Labor Law Articles 84-88 for calculating
 * end of service benefits (مكافأة نهاية الخدمة)
 */
class EOSBService {

    /**
     * Calculate End of Service Benefits
     *
     * @param {Object} params - Calculation parameters
     * @param {Date} params.hireDate - Employee hire date
     * @param {Date} params.terminationDate - Date of termination/resignation
     * @param {Number} params.monthlyWage - Monthly wage (Basic + Housing + Fixed Allowances)
     * @param {String} params.terminationType - Type of termination
     * @param {Object} params.specialConditions - Special conditions for full EOSB
     * @returns {Object} - EOSB calculation breakdown
     */
    static calculateEOSB({
        hireDate,
        terminationDate,
        monthlyWage,
        terminationType,
        specialConditions = {}
    }) {
        // Validate inputs
        if (!hireDate || !terminationDate || !monthlyWage) {
            throw new Error('Missing required parameters: hireDate, terminationDate, monthlyWage');
        }

        const hire = new Date(hireDate);
        const termination = new Date(terminationDate);

        if (termination <= hire) {
            throw new Error('Termination date must be after hire date');
        }

        // Calculate years of service (precise to decimal)
        const serviceMs = termination - hire;
        const serviceDays = serviceMs / (1000 * 60 * 60 * 24);
        const serviceYears = serviceDays / 365.25;
        const serviceMonths = serviceDays / 30.4375;

        // Initialize result object
        const result = {
            hireDate: hire.toISOString(),
            terminationDate: termination.toISOString(),
            terminationType,
            monthlyWage,
            serviceYears: parseFloat(serviceYears.toFixed(4)),
            serviceMonths: parseFloat(serviceMonths.toFixed(2)),
            serviceDays: Math.floor(serviceDays),

            // Calculation breakdown
            first5YearsAmount: 0,
            after5YearsAmount: 0,
            baseAmount: 0,

            // Adjustments
            resignationDeductionPercent: 0,
            resignationDeduction: 0,
            specialConditionApplied: null,

            // Final
            finalAmount: 0,

            // Labor Law reference
            laborLawArticles: ['84', '85', '86', '87', '88'],
            calculationMethod: null,
            notes: []
        };

        // ═══════════════════════════════════════════════════════════════
        // STEP 1: Check for NO EOSB scenarios
        // ═══════════════════════════════════════════════════════════════

        // Article 80 - Employer termination without compensation (serious misconduct)
        if (terminationType === 'article_80_employer') {
            result.finalAmount = 0;
            result.calculationMethod = 'NO_EOSB_ARTICLE_80';
            result.notes.push('Article 80: Termination due to serious misconduct - No EOSB payable');
            return result;
        }

        // During probation - no EOSB
        if (terminationType === 'probation_termination') {
            result.finalAmount = 0;
            result.calculationMethod = 'NO_EOSB_PROBATION';
            result.notes.push('Termination during probation period - No EOSB payable');
            return result;
        }

        // ═══════════════════════════════════════════════════════════════
        // STEP 2: Calculate base EOSB amount
        // ═══════════════════════════════════════════════════════════════

        // First 5 years: 0.5 × monthly wage × years
        const yearsInFirst5 = Math.min(serviceYears, 5);
        result.first5YearsAmount = 0.5 * monthlyWage * yearsInFirst5;

        // After 5 years: 1.0 × monthly wage × years
        const yearsAfter5 = Math.max(0, serviceYears - 5);
        result.after5YearsAmount = 1.0 * monthlyWage * yearsAfter5;

        // Total base amount
        result.baseAmount = result.first5YearsAmount + result.after5YearsAmount;

        result.notes.push(`First 5 years (${yearsInFirst5.toFixed(2)} years): 0.5 × ${monthlyWage} × ${yearsInFirst5.toFixed(2)} = ${result.first5YearsAmount.toFixed(2)}`);
        if (yearsAfter5 > 0) {
            result.notes.push(`After 5 years (${yearsAfter5.toFixed(2)} years): 1.0 × ${monthlyWage} × ${yearsAfter5.toFixed(2)} = ${result.after5YearsAmount.toFixed(2)}`);
        }
        result.notes.push(`Base EOSB: ${result.baseAmount.toFixed(2)} SAR`);

        // ═══════════════════════════════════════════════════════════════
        // STEP 3: Check for special full EOSB conditions (Article 87)
        // ═══════════════════════════════════════════════════════════════

        // These conditions grant full EOSB regardless of resignation
        const isSpecialCondition = this._checkSpecialConditions(terminationType, specialConditions);

        if (isSpecialCondition.applies) {
            result.specialConditionApplied = isSpecialCondition.type;
            result.resignationDeductionPercent = 0;
            result.resignationDeduction = 0;
            result.finalAmount = result.baseAmount;
            result.calculationMethod = 'FULL_EOSB_SPECIAL_CONDITION';
            result.notes.push(`Special condition: ${isSpecialCondition.reason} - Full EOSB granted per Article 87`);
            return result;
        }

        // ═══════════════════════════════════════════════════════════════
        // STEP 4: Apply resignation deductions (Article 85)
        // ═══════════════════════════════════════════════════════════════

        // Only apply deductions for standard resignation
        if (terminationType === 'resignation') {
            const deduction = this._calculateResignationDeduction(serviceYears, result.baseAmount);
            result.resignationDeductionPercent = deduction.percent;
            result.resignationDeduction = deduction.amount;
            result.finalAmount = deduction.finalAmount;
            result.calculationMethod = 'RESIGNATION_WITH_DEDUCTION';
            result.notes.push(`Resignation deduction (${serviceYears.toFixed(2)} years service): ${(100 - deduction.percent)}% of base`);
            result.notes.push(`Deduction: ${result.resignationDeduction.toFixed(2)} SAR`);
        } else {
            // Termination by employer (not Article 80), contract expiry, mutual agreement, etc.
            // Full EOSB is payable
            result.finalAmount = result.baseAmount;
            result.calculationMethod = 'FULL_EOSB';
            result.notes.push(`${this._getTerminationTypeLabel(terminationType)} - Full EOSB payable`);
        }

        // Round final amount to 2 decimal places
        result.first5YearsAmount = parseFloat(result.first5YearsAmount.toFixed(2));
        result.after5YearsAmount = parseFloat(result.after5YearsAmount.toFixed(2));
        result.baseAmount = parseFloat(result.baseAmount.toFixed(2));
        result.resignationDeduction = parseFloat(result.resignationDeduction.toFixed(2));
        result.finalAmount = parseFloat(result.finalAmount.toFixed(2));

        return result;
    }

    /**
     * Check for special conditions that grant full EOSB (Article 87)
     *
     * @param {String} terminationType - Type of termination
     * @param {Object} conditions - Special conditions
     * @returns {Object} - Whether special condition applies
     */
    static _checkSpecialConditions(terminationType, conditions = {}) {
        // Force majeure
        if (terminationType === 'force_majeure') {
            return { applies: true, type: 'FORCE_MAJEURE', reason: 'Force majeure termination' };
        }

        // Article 81 - Employee resignation due to employer breach
        if (terminationType === 'article_81_employee') {
            return { applies: true, type: 'ARTICLE_81', reason: 'Resignation due to employer breach (Article 81)' };
        }

        // Female resignation within 6 months of marriage
        if (conditions.femaleResignationAfterMarriage) {
            const marriageDate = new Date(conditions.marriageDate);
            const resignationDate = new Date(conditions.resignationDate);
            const monthsSinceMarriage = (resignationDate - marriageDate) / (1000 * 60 * 60 * 24 * 30.4375);

            if (monthsSinceMarriage <= 6) {
                return {
                    applies: true,
                    type: 'FEMALE_MARRIAGE_6_MONTHS',
                    reason: 'Female resignation within 6 months of marriage'
                };
            }
        }

        // Female resignation within 3 months of childbirth
        if (conditions.femaleResignationAfterChildbirth) {
            const childbirthDate = new Date(conditions.childbirthDate);
            const resignationDate = new Date(conditions.resignationDate);
            const monthsSinceChildbirth = (resignationDate - childbirthDate) / (1000 * 60 * 60 * 24 * 30.4375);

            if (monthsSinceChildbirth <= 3) {
                return {
                    applies: true,
                    type: 'FEMALE_CHILDBIRTH_3_MONTHS',
                    reason: 'Female resignation within 3 months of childbirth'
                };
            }
        }

        // Death of employee
        if (terminationType === 'death') {
            return { applies: true, type: 'DEATH', reason: 'Employee death - Full EOSB to heirs' };
        }

        // Retirement
        if (terminationType === 'retirement') {
            return { applies: true, type: 'RETIREMENT', reason: 'Retirement - Full EOSB' };
        }

        return { applies: false };
    }

    /**
     * Calculate resignation deduction based on years of service (Article 85)
     *
     * Resignation deduction tiers:
     * - < 2 years: 0% (no EOSB)
     * - 2-5 years: 33.33% of calculated EOSB
     * - 5-10 years: 66.67% of calculated EOSB
     * - > 10 years: 100% of calculated EOSB
     *
     * @param {Number} serviceYears - Years of service
     * @param {Number} baseAmount - Base EOSB amount
     * @returns {Object} - Deduction details
     */
    static _calculateResignationDeduction(serviceYears, baseAmount) {
        // Less than 2 years - no EOSB
        if (serviceYears < 2) {
            return {
                percent: 0,
                amount: baseAmount,
                finalAmount: 0
            };
        }

        // 2-5 years - 1/3 of EOSB (33.33%)
        if (serviceYears < 5) {
            const entitlement = baseAmount * (1 / 3);
            return {
                percent: 33.33,
                amount: baseAmount - entitlement,
                finalAmount: entitlement
            };
        }

        // 5-10 years - 2/3 of EOSB (66.67%)
        if (serviceYears < 10) {
            const entitlement = baseAmount * (2 / 3);
            return {
                percent: 66.67,
                amount: baseAmount - entitlement,
                finalAmount: entitlement
            };
        }

        // 10+ years - full EOSB (100%)
        return {
            percent: 100,
            amount: 0,
            finalAmount: baseAmount
        };
    }

    /**
     * Get human-readable termination type label
     *
     * @param {String} terminationType - Termination type code
     * @returns {String} - Human-readable label
     */
    static _getTerminationTypeLabel(terminationType) {
        const labels = {
            'article_74_mutual': 'Mutual Agreement (Article 74)',
            'article_75_expiry': 'Contract Expiry (Article 75)',
            'article_77_indefinite': 'Party Termination - Indefinite Contract (Article 77)',
            'article_80_employer': 'Employer Termination - Misconduct (Article 80)',
            'article_81_employee': 'Employee Resignation - Employer Breach (Article 81)',
            'resignation': 'Standard Resignation',
            'retirement': 'Retirement',
            'death': 'Employee Death',
            'force_majeure': 'Force Majeure',
            'probation_termination': 'Probation Termination'
        };
        return labels[terminationType] || terminationType;
    }

    /**
     * Calculate the wage base for EOSB
     * (Basic + Housing + All fixed allowances)
     *
     * @param {Object} compensation - Employee compensation object
     * @returns {Number} - Monthly wage for EOSB calculation
     */
    static calculateWageBase(compensation) {
        if (!compensation) return 0;

        let wageBase = compensation.basicSalary || 0;

        // Add housing allowance (if separate)
        if (compensation.housingAllowance) {
            wageBase += compensation.housingAllowance;
        }

        // Add all fixed allowances that are included in EOSB
        if (compensation.allowances && Array.isArray(compensation.allowances)) {
            for (const allowance of compensation.allowances) {
                if (allowance.includedInEOSB && allowance.amount) {
                    wageBase += allowance.amount;
                }
            }
        }

        return wageBase;
    }

    /**
     * Calculate monthly EOSB accrual for accounting purposes
     *
     * @param {Number} monthlyWage - Monthly wage base
     * @param {Number} serviceYears - Current years of service
     * @returns {Number} - Monthly accrual amount
     */
    static calculateMonthlyAccrual(monthlyWage, serviceYears) {
        // First 5 years: 0.5 month per year = 0.5/12 per month
        // After 5 years: 1.0 month per year = 1/12 per month

        const monthlyRate = serviceYears < 5 ? (0.5 / 12) : (1.0 / 12);
        return monthlyWage * monthlyRate;
    }

    /**
     * Generate EOSB report for an employee
     *
     * @param {Object} employee - Employee document
     * @param {Date} asOfDate - Date to calculate EOSB as of (default: today)
     * @returns {Object} - Complete EOSB report
     */
    static generateReport(employee, asOfDate = new Date()) {
        if (!employee || !employee.employment?.hireDate) {
            throw new Error('Invalid employee or missing hire date');
        }

        const wageBase = this.calculateWageBase(employee.compensation);

        const report = this.calculateEOSB({
            hireDate: employee.employment.hireDate,
            terminationDate: asOfDate,
            monthlyWage: wageBase,
            terminationType: 'article_77_indefinite', // Default to employer termination for projection
            specialConditions: {}
        });

        // Add scenario comparisons
        report.scenarios = {
            employerTermination: report.finalAmount,
            resignation: this.calculateEOSB({
                hireDate: employee.employment.hireDate,
                terminationDate: asOfDate,
                monthlyWage: wageBase,
                terminationType: 'resignation',
                specialConditions: {}
            }).finalAmount,
            retirement: this.calculateEOSB({
                hireDate: employee.employment.hireDate,
                terminationDate: asOfDate,
                monthlyWage: wageBase,
                terminationType: 'retirement',
                specialConditions: {}
            }).finalAmount
        };

        // Add monthly accrual
        report.monthlyAccrual = this.calculateMonthlyAccrual(wageBase, report.serviceYears);

        return report;
    }
}

module.exports = EOSBService;
