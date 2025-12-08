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

// GOSI contribution rates
const GOSI_RATES = {
    SAUDI: {
        employee: 0.0975, // 9.75% from employee
        employer: 0.1175, // 11.75% from employer
        total: 0.215,     // Total 21.5%
        // Breakdown:
        // - Pension: 9% employee + 9% employer = 18%
        // - Hazards: 0% employee + 2% employer = 2%
        // - SANED: 0.75% employee + 0.75% employer = 1.5%
    },
    NON_SAUDI: {
        employee: 0,      // 0% from employee
        employer: 0.02,   // 2% from employer (hazards only)
        total: 0.02,
    }
};

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
     * @param {Object} employee - Employee details
     * @param {number} basicSalary - Basic salary in SAR
     */
    calculateGOSI(employee, basicSalary) {
        const isSaudi = employee.nationality === 'SA' || employee.nationality === 'Saudi';
        const rates = isSaudi ? GOSI_RATES.SAUDI : GOSI_RATES.NON_SAUDI;

        // GOSI is calculated on basic salary only (capped at 45,000 SAR)
        const cappedSalary = Math.min(basicSalary, 45000);

        return {
            employeeContribution: Math.round(cappedSalary * rates.employee * 100) / 100,
            employerContribution: Math.round(cappedSalary * rates.employer * 100) / 100,
            totalContribution: Math.round(cappedSalary * rates.total * 100) / 100,
            baseSalary: cappedSalary,
            rates: rates,
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

            // Calculate GOSI
            const gosi = this.calculateGOSI(emp, basic);

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
            console.error('Mudad submission error:', error);
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
            console.error('Get status error:', error);
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

        // Check if payment date is before 10th of month (WPS deadline)
        const paymentDate = new Date(payrollData.paymentDate);
        if (paymentDate.getDate() > 10) {
            errors.push('Warning: Payment date is after WPS deadline (10th of month)');
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
     * Get Nitaqat (Saudization) calculation
     */
    calculateNitaqat(employees) {
        const totalEmployees = employees.length;
        const saudiEmployees = employees.filter(
            emp => emp.nationality === 'SA' || emp.nationality === 'Saudi'
        ).length;

        const saudizationRate = totalEmployees > 0
            ? (saudiEmployees / totalEmployees) * 100
            : 0;

        // Nitaqat ranges (simplified - actual ranges depend on company size and sector)
        let nitaqatBand = 'RED';
        if (saudizationRate >= 40) nitaqatBand = 'GREEN_LOW';
        if (saudizationRate >= 50) nitaqatBand = 'GREEN_MID';
        if (saudizationRate >= 60) nitaqatBand = 'GREEN_HIGH';
        if (saudizationRate >= 70) nitaqatBand = 'PLATINUM';

        return {
            totalEmployees,
            saudiEmployees,
            nonSaudiEmployees: totalEmployees - saudiEmployees,
            saudizationRate: Math.round(saudizationRate * 100) / 100,
            nitaqatBand,
            compliant: nitaqatBand !== 'RED',
        };
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
};
