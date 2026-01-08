/**
 * Mudad Platform Service
 * Saudi Arabia SME Payroll Compliance Platform
 *
 * Mudad is a government platform for SMEs that:
 * - Automates WPS compliance
 * - Integrates with GOSI
 * - Connects with banks for salary transfers
 * - Manages employee wage data
 *
 * Reference: https://www.mudad.com.sa
 *
 * Note: This service simulates Mudad integration.
 * Actual integration requires registration with Mudad portal.
 */

const axios = require('axios');
const { WPSService } = require('./wps.service');
const logger = require('../utils/logger');
const {
    GOSI_RATES,
    calculateGOSI: calculateGOSICentral,
    getSaudiGOSIRates
} = require('../constants/gosi.constants');

/**
 * Nitaqat Weighting Rules (2024)
 * Reference: https://www.cercli.com/resources/nitaqat
 * Reference: https://www.centuroglobal.com/article/saudization/
 */
const NITAQAT_WEIGHTS = {
    // Saudi with salary < 4000 SAR counts as 0.5 person
    BELOW_MINIMUM_WAGE: 0.5,
    // Disabled Saudi employee counts as 4 persons
    DISABLED_EMPLOYEE: 4.0,
    // GCC national counts as 1 Saudi
    GCC_NATIONAL: 1.0,
    // Foreign investor owner counts as 1 Saudi (April 2024 update)
    FOREIGN_INVESTOR_OWNER: 1.0,
    // Remote worker counts as 1 Saudi (2024 update)
    REMOTE_WORKER: 1.0,
    // Normal Saudi employee
    NORMAL_SAUDI: 1.0,
};

// GCC country codes (count as Saudi for Nitaqat)
const GCC_NATIONALITIES = ['AE', 'BH', 'KW', 'OM', 'QA', 'UAE', 'Bahrain', 'Kuwait', 'Oman', 'Qatar'];

// Mudad subscription types
const SUBSCRIPTION_TYPES = {
    BASIC: 'basic',       // Up to 10 employees
    STANDARD: 'standard', // Up to 50 employees
    PREMIUM: 'premium',   // Up to 200 employees
    ENTERPRISE: 'enterprise', // Unlimited
};

class MudadService {
    constructor() {
        this.apiUrl = process.env.MUDAD_API_URL || 'https://api.mudad.com.sa';
        this.apiKey = process.env.MUDAD_API_KEY;
        this.establishmentId = process.env.MUDAD_ESTABLISHMENT_ID;
    }

    /**
     * Get API headers
     */
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Establishment-ID': this.establishmentId,
        };
    }

    /**
     * Calculate GOSI contributions for an employee
     * Uses centralized GOSI constants for consistent calculations
     *
     * IMPORTANT: GOSI base = Basic Salary + Housing Allowance
     *
     * @param {Object} employee - Employee details
     * @param {number} basicSalary - Basic salary in SAR
     * @param {number} housingAllowance - Housing allowance in SAR (optional)
     */
    calculateGOSI(employee, basicSalary, housingAllowance = 0) {
        const isSaudi = employee.nationality === 'SA' || employee.nationality === 'Saudi';

        // Use centralized GOSI calculation with housing allowance
        const result = calculateGOSICentral(isSaudi, basicSalary, {
            housingAllowance: housingAllowance,
            employeeStartDate: employee.gosiStartDate || employee.hireDate || null,
        });

        return {
            employeeContribution: result.employee,
            employerContribution: result.employer,
            totalContribution: result.total,
            baseSalary: result.baseSalary,
            housingAllowance: result.housingAllowance,
            contributionBase: result.contributionBase,
            cappedSalary: result.cappedSalary,
            wasCapped: result.wasCapped,
            isReformEmployee: result.isReformEmployee,
            rates: result.rates,
        };
    }

    /**
     * Calculate complete payroll for employees
     * @param {Array} employees - List of employees with salary structure
     */
    calculatePayroll(employees) {
        const payrollResults = [];
        let totalGross = 0;
        let totalNet = 0;
        let totalGosiEmployee = 0;
        let totalGosiEmployer = 0;

        employees.forEach(emp => {
            const basic = emp.salary?.basic || emp.basicSalary;
            const housing = emp.salary?.housing || emp.housingAllowance || basic * 0.25;
            const transport = emp.salary?.transport || emp.transportAllowance || 0;
            const otherAllowances = emp.salary?.otherAllowances || 0;

            // Calculate GOSI with housing allowance (per official GOSI regulations)
            const gosi = this.calculateGOSI(emp, basic, housing);

            // Calculate gross salary
            const gross = basic + housing + transport + otherAllowances;

            // Calculate deductions
            const gosiDeduction = gosi.employeeContribution;
            const otherDeductions = emp.salary?.otherDeductions || 0;
            const totalDeductions = gosiDeduction + otherDeductions;

            // Calculate net salary
            const net = gross - totalDeductions;

            const result = {
                employeeId: emp._id || emp.id,
                employeeName: emp.name,
                nationalId: emp.nationalId || emp.molId,
                nationality: emp.nationality,
                iban: emp.iban,

                // Earnings
                basicSalary: basic,
                housingAllowance: housing,
                transportAllowance: transport,
                otherAllowances: otherAllowances,
                grossSalary: gross,

                // GOSI
                gosiEmployee: gosi.employeeContribution,
                gosiEmployer: gosi.employerContribution,
                gosiTotal: gosi.totalContribution,

                // Deductions
                otherDeductions: otherDeductions,
                totalDeductions: totalDeductions,

                // Net
                netSalary: net,

                // WPS format
                salary: {
                    basic: basic,
                    housing: housing,
                    otherEarnings: transport + otherAllowances,
                    deductions: totalDeductions,
                    netSalary: net,
                    gosiDeduction: gosiDeduction,
                }
            };

            payrollResults.push(result);

            // Update totals
            totalGross += gross;
            totalNet += net;
            totalGosiEmployee += gosi.employeeContribution;
            totalGosiEmployer += gosi.employerContribution;
        });

        return {
            employees: payrollResults,
            summary: {
                totalEmployees: employees.length,
                totalGrossSalary: Math.round(totalGross * 100) / 100,
                totalNetSalary: Math.round(totalNet * 100) / 100,
                totalGosiEmployee: Math.round(totalGosiEmployee * 100) / 100,
                totalGosiEmployer: Math.round(totalGosiEmployer * 100) / 100,
                totalGosiPayable: Math.round((totalGosiEmployee + totalGosiEmployer) * 100) / 100,
            }
        };
    }

    /**
     * Generate WPS file via Mudad
     * @param {Object} establishment - Company details
     * @param {Array} employees - Employees with calculated payroll
     * @param {Object} options - Generation options
     */
    async generateWPSFile(establishment, employees, options = {}) {
        // Calculate payroll if not already calculated
        const payroll = employees[0]?.salary ? employees : this.calculatePayroll(employees).employees;

        // Generate WPS file
        const wpsResult = WPSService.generateWPSFile(
            establishment,
            payroll.map(emp => ({
                ...emp,
                molId: emp.nationalId || emp.molId,
                salary: emp.salary,
            })),
            options
        );

        return {
            ...wpsResult,
            payrollSummary: this.calculatePayroll(employees).summary,
        };
    }

    /**
     * Submit payroll to Mudad
     * @param {Object} payrollData - Complete payroll data
     */
    async submitPayroll(payrollData) {
        try {
            // In real implementation, this would submit to Mudad API
            // For now, we validate and return success

            const validation = this.validatePayrollSubmission(payrollData);
            if (!validation.valid) {
                return {
                    success: false,
                    errors: validation.errors,
                };
            }

            // Simulate API call
            const submissionId = `MUD${Date.now()}`;

            return {
                success: true,
                submissionId: submissionId,
                status: 'SUBMITTED',
                message: 'Payroll submitted to Mudad successfully',
                timestamp: new Date().toISOString(),
                summary: payrollData.summary,
            };
        } catch (error) {
            logger.error('Mudad submission error:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Get payroll submission status
     */
    async getSubmissionStatus(submissionId) {
        try {
            // In real implementation, check with Mudad API
            return {
                submissionId: submissionId,
                status: 'PROCESSED',
                wpsStatus: 'UPLOADED',
                gosiStatus: 'SYNCED',
                bankStatus: 'PENDING',
                processedAt: new Date().toISOString(),
            };
        } catch (error) {
            logger.error('Get status error:', error);
            throw new Error('Failed to get submission status');
        }
    }

    /**
     * Validate payroll submission data
     */
    validatePayrollSubmission(payrollData) {
        const errors = [];

        if (!payrollData.establishment) {
            errors.push('Establishment details are required');
        }

        if (!payrollData.employees || payrollData.employees.length === 0) {
            errors.push('At least one employee is required');
        }

        if (!payrollData.paymentDate) {
            errors.push('Payment date is required');
        }

        // Check if payment date is within 30 days of salary due date (March 2025 MHRSD WPS deadline update)
        // WPS deadline = salary due date + 30 days (not 10th of month anymore)
        const paymentDate = new Date(payrollData.paymentDate);
        const salaryDueDate = payrollData.salaryDueDate
            ? new Date(payrollData.salaryDueDate)
            : new Date(paymentDate.getFullYear(), paymentDate.getMonth(), 0); // Last day of prev month

        const wpsDeadline = new Date(salaryDueDate);
        wpsDeadline.setDate(wpsDeadline.getDate() + 30);

        if (paymentDate > wpsDeadline) {
            const daysLate = Math.ceil((paymentDate - wpsDeadline) / (1000 * 60 * 60 * 24));
            errors.push(`Warning: Payment date is ${daysLate} day(s) after WPS deadline (30 days from salary due date)`);
        }

        // Validate employees
        payrollData.employees?.forEach((emp, index) => {
            if (!emp.nationalId && !emp.molId) {
                errors.push(`Employee ${index + 1}: Missing National ID / MOL ID`);
            }
            if (!emp.iban) {
                errors.push(`Employee ${index + 1}: Missing IBAN`);
            }
            if (!emp.salary?.netSalary && !emp.netSalary) {
                errors.push(`Employee ${index + 1}: Missing net salary`);
            }
        });

        return {
            valid: errors.filter(e => !e.startsWith('Warning')).length === 0,
            errors,
        };
    }

    /**
     * Generate GOSI report for submission
     */
    generateGOSIReport(employees, month) {
        const report = {
            reportMonth: month,
            generatedAt: new Date().toISOString(),
            employees: [],
            summary: {
                totalSaudi: 0,
                totalNonSaudi: 0,
                totalEmployeeContribution: 0,
                totalEmployerContribution: 0,
                totalPayable: 0,
            }
        };

        employees.forEach(emp => {
            const isSaudi = emp.nationality === 'SA' || emp.nationality === 'Saudi';
            const gosi = this.calculateGOSI(emp, emp.basicSalary || emp.salary?.basic);

            report.employees.push({
                nationalId: emp.nationalId || emp.molId,
                name: emp.name,
                nationality: emp.nationality,
                basicSalary: gosi.baseSalary,
                employeeContribution: gosi.employeeContribution,
                employerContribution: gosi.employerContribution,
            });

            if (isSaudi) {
                report.summary.totalSaudi++;
            } else {
                report.summary.totalNonSaudi++;
            }

            report.summary.totalEmployeeContribution += gosi.employeeContribution;
            report.summary.totalEmployerContribution += gosi.employerContribution;
        });

        report.summary.totalPayable =
            report.summary.totalEmployeeContribution +
            report.summary.totalEmployerContribution;

        return report;
    }

    /**
     * Get Nitaqat (Saudization) calculation with proper weighting
     *
     * Official Weighting Rules (2024):
     * - Saudi with salary < 4000 SAR = counts as 0.5 person
     * - Disabled Saudi employee = counts as 4 persons
     * - GCC national = counts as 1 Saudi
     * - Foreign investor owner = counts as 1 Saudi (April 2024)
     * - Remote worker (Saudi) = counts as 1 Saudi (2024)
     *
     * Reference: https://www.cercli.com/resources/nitaqat
     * Reference: https://www.centuroglobal.com/article/saudization/
     */
    calculateNitaqat(employees) {
        const totalEmployees = employees.length;

        // Calculate weighted Saudi count
        let weightedSaudiCount = 0;
        let rawSaudiCount = 0;
        let gccCount = 0;
        let disabledCount = 0;
        let belowMinWageCount = 0;
        let remoteWorkerCount = 0;
        let foreignInvestorOwnerCount = 0;

        const employeeDetails = [];

        employees.forEach(emp => {
            const nationality = emp.nationality;
            const isSaudi = nationality === 'SA' || nationality === 'Saudi';
            const isGCC = GCC_NATIONALITIES.includes(nationality);
            const basicSalary = emp.basicSalary || emp.salary?.basic || 0;
            const isDisabled = emp.isDisabled === true || emp.disability === true;
            const isRemoteWorker = emp.isRemoteWorker === true || emp.workType === 'remote';
            const isForeignInvestorOwner = emp.isForeignInvestorOwner === true || emp.ownerType === 'foreign_investor';

            let weight = 0;
            let category = 'non-saudi';

            if (isSaudi) {
                rawSaudiCount++;
                category = 'saudi';

                // Check for special weighting
                if (isDisabled) {
                    // Disabled Saudi = 4 persons
                    weight = NITAQAT_WEIGHTS.DISABLED_EMPLOYEE;
                    disabledCount++;
                    category = 'saudi_disabled';
                } else if (basicSalary < GOSI_RATES.MINIMUM_WAGE_SAUDI && basicSalary > 0) {
                    // Below minimum wage Saudi = 0.5 person
                    weight = NITAQAT_WEIGHTS.BELOW_MINIMUM_WAGE;
                    belowMinWageCount++;
                    category = 'saudi_below_min_wage';
                } else if (isRemoteWorker) {
                    // Remote worker = 1 person (2024 update)
                    weight = NITAQAT_WEIGHTS.REMOTE_WORKER;
                    remoteWorkerCount++;
                    category = 'saudi_remote';
                } else {
                    // Normal Saudi = 1 person
                    weight = NITAQAT_WEIGHTS.NORMAL_SAUDI;
                }
            } else if (isGCC) {
                // GCC national counts as Saudi
                weight = NITAQAT_WEIGHTS.GCC_NATIONAL;
                gccCount++;
                category = 'gcc';
            } else if (isForeignInvestorOwner) {
                // Foreign investor owner counts as Saudi (April 2024)
                weight = NITAQAT_WEIGHTS.FOREIGN_INVESTOR_OWNER;
                foreignInvestorOwnerCount++;
                category = 'foreign_investor_owner';
            }

            weightedSaudiCount += weight;

            employeeDetails.push({
                employeeId: emp._id || emp.id,
                name: emp.name,
                nationality,
                category,
                weight,
                basicSalary,
                isDisabled,
                isRemoteWorker,
            });
        });

        // Calculate saudization rate based on weighted count
        const saudizationRate = totalEmployees > 0
            ? (weightedSaudiCount / totalEmployees) * 100
            : 0;

        // Nitaqat ranges (simplified - actual ranges depend on company size and sector)
        let nitaqatBand = 'RED';
        if (saudizationRate >= 10) nitaqatBand = 'YELLOW';
        if (saudizationRate >= 40) nitaqatBand = 'GREEN_LOW';
        if (saudizationRate >= 50) nitaqatBand = 'GREEN_MID';
        if (saudizationRate >= 60) nitaqatBand = 'GREEN_HIGH';
        if (saudizationRate >= 70) nitaqatBand = 'PLATINUM';

        return {
            totalEmployees,
            // Raw counts (actual headcount)
            rawCounts: {
                saudi: rawSaudiCount,
                gcc: gccCount,
                nonSaudi: totalEmployees - rawSaudiCount - gccCount,
            },
            // Weighted counts (for Nitaqat calculation)
            weightedCounts: {
                saudi: weightedSaudiCount,
                disabled: disabledCount,
                belowMinWage: belowMinWageCount,
                remoteWorkers: remoteWorkerCount,
                gccNationals: gccCount,
                foreignInvestorOwners: foreignInvestorOwnerCount,
            },
            // Summary
            saudizationRate: Math.round(saudizationRate * 100) / 100,
            nitaqatBand,
            compliant: nitaqatBand !== 'RED' && nitaqatBand !== 'YELLOW',
            // Warnings
            warnings: this._getNitaqatWarnings(saudizationRate, belowMinWageCount, rawSaudiCount),
            // Details for audit
            employeeDetails,
        };
    }

    /**
     * Get warnings for Nitaqat compliance
     */
    _getNitaqatWarnings(rate, belowMinWageCount, rawSaudiCount) {
        const warnings = [];

        if (rate < 10) {
            warnings.push({
                level: 'critical',
                messageAr: 'منشأتك في النطاق الأحمر - خطر إيقاف الخدمات',
                messageEn: 'Your establishment is in RED band - risk of service suspension',
            });
        } else if (rate < 40) {
            warnings.push({
                level: 'warning',
                messageAr: 'منشأتك في النطاق الأصفر - يجب زيادة السعودة',
                messageEn: 'Your establishment is in YELLOW band - need to increase Saudization',
            });
        }

        if (belowMinWageCount > 0) {
            warnings.push({
                level: 'info',
                messageAr: `${belowMinWageCount} موظف سعودي براتب أقل من 4000 ريال - يحتسب كنصف موظف`,
                messageEn: `${belowMinWageCount} Saudi employee(s) with salary below 4000 SAR - counted as 0.5 each`,
            });
        }

        return warnings;
    }

    /**
     * Get minimum wage compliance
     */
    checkMinimumWageCompliance(employees) {
        const MINIMUM_WAGE_SAUDI = 4000; // SAR per month

        const violations = [];
        const compliant = [];

        employees.forEach(emp => {
            const isSaudi = emp.nationality === 'SA' || emp.nationality === 'Saudi';
            const basicSalary = emp.basicSalary || emp.salary?.basic;

            if (isSaudi && basicSalary < MINIMUM_WAGE_SAUDI) {
                violations.push({
                    employeeId: emp._id || emp.id,
                    name: emp.name,
                    currentSalary: basicSalary,
                    minimumRequired: MINIMUM_WAGE_SAUDI,
                    shortfall: MINIMUM_WAGE_SAUDI - basicSalary,
                });
            } else {
                compliant.push({
                    employeeId: emp._id || emp.id,
                    name: emp.name,
                });
            }
        });

        return {
            compliant: violations.length === 0,
            totalEmployees: employees.length,
            compliantCount: compliant.length,
            violationCount: violations.length,
            violations,
        };
    }
}

module.exports = {
    MudadService: new MudadService(),
    GOSI_RATES,
    SUBSCRIPTION_TYPES,
    NITAQAT_WEIGHTS,
    GCC_NATIONALITIES,
};
