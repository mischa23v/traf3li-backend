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
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  ⚠️  OFFICIAL SAUDI GOVERNMENT NITAQAT WEIGHTING RULES - DO NOT MODIFY  ⚠️   ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  These values are set by MHRSD (Ministry of Human Resources and Social      ║
 * ║  Development) and are legally binding. Incorrect values will cause:         ║
 * ║  - Client fines up to SAR 100,000                                            ║
 * ║  - Service suspension (visa, Qiwa, MOL)                                      ║
 * ║  - Legal liability for software provider                                     ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Last verified: January 2026                                                  ║
 * ║  Official sources:                                                            ║
 * ║  - https://www.hrsd.gov.sa (MHRSD Official)                                   ║
 * ║  - https://www.cercli.com/resources/nitaqat                                   ║
 * ║  - https://www.centuroglobal.com/article/saudization/                         ║
 * ║  - Saudi Press Agency Decision November 23, 2020 (SAR 4,000 minimum)         ║
 * ║  - MHRSD Decision April 11, 2024 (remote workers, foreign investors)         ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
const NITAQAT_WEIGHTS = {
    // ═══════════════════════════════════════════════════════════════════════════
    // SALARY-BASED WEIGHTING (Effective April 18, 2021)
    // ═══════════════════════════════════════════════════════════════════════════
    // SAR 4,000+ = Full count (1.0)
    FULL_COUNT_THRESHOLD: 4000,           // SAR 4,000/month minimum for full count
    // SAR 3,000 - 3,999 = Half count (0.5)
    HALF_COUNT_MIN: 3000,                 // Minimum for half count
    HALF_COUNT_WEIGHT: 0.5,               // Weight for SAR 3,000-3,999
    // Below SAR 3,000 = NOT counted (0.0)
    NO_COUNT_WEIGHT: 0.0,                 // Weight for salary < SAR 3,000

    // ═══════════════════════════════════════════════════════════════════════════
    // SPECIAL CATEGORY WEIGHTS
    // ═══════════════════════════════════════════════════════════════════════════
    NORMAL_SAUDI: 1.0,                    // Standard Saudi employee (>= SAR 4,000)
    DISABLED_EMPLOYEE: 4.0,               // Disabled Saudi = 4 persons (up to regulatory limit)
    RELEASED_PRISONER: 2.0,               // Saudi ex-prisoner = 2 persons (up to 2 years)
    PART_TIME_EMPLOYEE: 0.5,              // Part-time (must earn min SAR 3,000; max 2 entities)
    FLEXIBLE_WORK: 0.33,                  // Flexible Work System (168 hrs/month + social insurance)

    // ═══════════════════════════════════════════════════════════════════════════
    // NATIONALITY-BASED WEIGHTS (April 11, 2024 Updates)
    // ═══════════════════════════════════════════════════════════════════════════
    GCC_NATIONAL: 1.0,                    // GCC nationals count as Saudi
    FOREIGN_INVESTOR_OWNER: 1.0,          // Foreign investor owners (April 2024)
    REMOTE_WORKER: 1.0,                   // Remote workers (April 2024)
    SAUDI_WOMANS_CHILD: 1.0,              // Children of Saudi women (non-Saudi father)
    NON_SAUDI_WIDOW: 1.0,                 // Non-Saudi widows of Saudis
    DISPLACED_TRIBES: 1.0,                // Displaced tribes
    ATHLETES: 1.0,                        // Athletes

    // ═══════════════════════════════════════════════════════════════════════════
    // PARTIAL NATIONALITY WEIGHTS (April 11, 2024)
    // ═══════════════════════════════════════════════════════════════════════════
    PALESTINIAN_EGYPTIAN_PASSPORT: 0.25,  // 4 = 1 foreign worker; max 50% of workforce
    BALOCH_ETHNICITY: 0.25,               // 4 = 1 foreign worker; max 50% of workforce
    BURMESE: 0.25,                        // 4 = 1 foreign worker (except Mecca/Medina)
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
     * ╔══════════════════════════════════════════════════════════════════════════════╗
     * ║         OFFICIAL NITAQAT CALCULATION - DO NOT MODIFY WITHOUT APPROVAL        ║
     * ╠══════════════════════════════════════════════════════════════════════════════╣
     * ║  This calculation follows official MHRSD weighting rules:                    ║
     * ║                                                                               ║
     * ║  SALARY-BASED WEIGHTING (April 18, 2021):                                     ║
     * ║  - SAR 4,000+ monthly = 1.0 person (full count)                               ║
     * ║  - SAR 3,000 - 3,999 monthly = 0.5 person (half count)                        ║
     * ║  - Below SAR 3,000 monthly = 0.0 person (NOT COUNTED)                         ║
     * ║                                                                               ║
     * ║  SPECIAL CATEGORIES:                                                          ║
     * ║  - Disabled Saudi = 4.0 persons                                               ║
     * ║  - Released prisoners = 2.0 persons (for 2 years)                             ║
     * ║  - Part-time = 0.5 person                                                     ║
     * ║  - Flexible work = 0.33 person                                                ║
     * ║                                                                               ║
     * ║  BAND THRESHOLDS (January 26, 2020 - YELLOW ABOLISHED):                       ║
     * ║  - RED: Below required percentage (non-compliant)                             ║
     * ║  - GREEN_LOW, GREEN_MID, GREEN_HIGH: Compliant levels                         ║
     * ║  - PLATINUM: Highest tier                                                     ║
     * ║                                                                               ║
     * ║  ⚠️ YELLOW BAND WAS ABOLISHED JANUARY 26, 2020 - DO NOT ADD BACK ⚠️          ║
     * ╚══════════════════════════════════════════════════════════════════════════════╝
     */
    calculateNitaqat(employees) {
        const totalEmployees = employees.length;

        // Calculate weighted Saudi count
        let weightedSaudiCount = 0;
        let rawSaudiCount = 0;
        let gccCount = 0;
        let disabledCount = 0;
        let halfCountSalaryCount = 0;  // SAR 3,000-3,999
        let notCountedSalaryCount = 0; // Below SAR 3,000
        let remoteWorkerCount = 0;
        let foreignInvestorOwnerCount = 0;
        let partTimeCount = 0;
        let flexibleWorkCount = 0;
        let releasedPrisonerCount = 0;

        const employeeDetails = [];

        employees.forEach(emp => {
            const nationality = emp.nationality;
            const isSaudi = nationality === 'SA' || nationality === 'Saudi';
            const isGCC = GCC_NATIONALITIES.includes(nationality);
            const basicSalary = emp.basicSalary || emp.salary?.basic || 0;
            const isDisabled = emp.isDisabled === true || emp.disability === true;
            const isRemoteWorker = emp.isRemoteWorker === true || emp.workType === 'remote';
            const isForeignInvestorOwner = emp.isForeignInvestorOwner === true || emp.ownerType === 'foreign_investor';
            const isPartTime = emp.isPartTime === true || emp.employmentType === 'part_time';
            const isFlexibleWork = emp.isFlexibleWork === true || emp.employmentType === 'flexible';
            const isReleasedPrisoner = emp.isReleasedPrisoner === true;

            let weight = 0;
            let category = 'non-saudi';

            if (isSaudi) {
                rawSaudiCount++;
                category = 'saudi';

                // ═══════════════════════════════════════════════════════════════
                // PRIORITY 1: Special categories (apply before salary check)
                // ═══════════════════════════════════════════════════════════════
                if (isDisabled) {
                    // Disabled Saudi = 4 persons (highest weight)
                    weight = NITAQAT_WEIGHTS.DISABLED_EMPLOYEE;
                    disabledCount++;
                    category = 'saudi_disabled';
                } else if (isReleasedPrisoner) {
                    // Released prisoner = 2 persons (for up to 2 years)
                    weight = NITAQAT_WEIGHTS.RELEASED_PRISONER;
                    releasedPrisonerCount++;
                    category = 'saudi_released_prisoner';
                } else if (isFlexibleWork) {
                    // Flexible work = 0.33 person
                    weight = NITAQAT_WEIGHTS.FLEXIBLE_WORK;
                    flexibleWorkCount++;
                    category = 'saudi_flexible_work';
                } else if (isPartTime) {
                    // Part-time = 0.5 person (must earn min SAR 3,000)
                    weight = basicSalary >= NITAQAT_WEIGHTS.HALF_COUNT_MIN
                        ? NITAQAT_WEIGHTS.PART_TIME_EMPLOYEE
                        : NITAQAT_WEIGHTS.NO_COUNT_WEIGHT;
                    partTimeCount++;
                    category = 'saudi_part_time';
                }
                // ═══════════════════════════════════════════════════════════════
                // PRIORITY 2: Salary-based weighting (if no special category)
                // OFFICIAL THRESHOLDS (April 18, 2021):
                // - SAR 4,000+ = 1.0 (full count)
                // - SAR 3,000 - 3,999 = 0.5 (half count)
                // - Below SAR 3,000 = 0.0 (NOT counted)
                // ═══════════════════════════════════════════════════════════════
                else if (basicSalary >= NITAQAT_WEIGHTS.FULL_COUNT_THRESHOLD) {
                    // Full count: SAR 4,000+ monthly
                    if (isRemoteWorker) {
                        weight = NITAQAT_WEIGHTS.REMOTE_WORKER;
                        remoteWorkerCount++;
                        category = 'saudi_remote';
                    } else {
                        weight = NITAQAT_WEIGHTS.NORMAL_SAUDI;
                        category = 'saudi_full_count';
                    }
                } else if (basicSalary >= NITAQAT_WEIGHTS.HALF_COUNT_MIN) {
                    // Half count: SAR 3,000 - 3,999 monthly
                    weight = NITAQAT_WEIGHTS.HALF_COUNT_WEIGHT;
                    halfCountSalaryCount++;
                    category = 'saudi_half_count';
                } else {
                    // NOT counted: Below SAR 3,000 monthly
                    weight = NITAQAT_WEIGHTS.NO_COUNT_WEIGHT;
                    notCountedSalaryCount++;
                    category = 'saudi_not_counted';
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
                isPartTime,
                isFlexibleWork,
            });
        });

        // Calculate saudization rate based on weighted count
        const saudizationRate = totalEmployees > 0
            ? (weightedSaudiCount / totalEmployees) * 100
            : 0;

        // ═══════════════════════════════════════════════════════════════════════════
        // NITAQAT BAND THRESHOLDS
        // ⚠️ IMPORTANT: YELLOW BAND WAS ABOLISHED JANUARY 26, 2020
        // Only RED, GREEN (low/mid/high), and PLATINUM exist now
        // Thresholds vary by company size and sector - these are general defaults
        // ═══════════════════════════════════════════════════════════════════════════
        let nitaqatBand = 'RED';
        // Note: No YELLOW band - it was abolished January 26, 2020
        if (saudizationRate >= 30) nitaqatBand = 'GREEN_LOW';   // General threshold for >100 employees
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
                halfCountSalary: halfCountSalaryCount,    // SAR 3,000-3,999 = 0.5
                notCountedSalary: notCountedSalaryCount,  // Below SAR 3,000 = 0.0
                remoteWorkers: remoteWorkerCount,
                gccNationals: gccCount,
                foreignInvestorOwners: foreignInvestorOwnerCount,
                partTime: partTimeCount,
                flexibleWork: flexibleWorkCount,
                releasedPrisoners: releasedPrisonerCount,
            },
            // Summary
            saudizationRate: Math.round(saudizationRate * 100) / 100,
            nitaqatBand,
            // Note: YELLOW band abolished January 26, 2020 - only RED is non-compliant
            compliant: nitaqatBand !== 'RED',
            // Warnings
            warnings: this._getNitaqatWarnings(saudizationRate, halfCountSalaryCount, notCountedSalaryCount, rawSaudiCount),
            // Details for audit
            employeeDetails,
        };
    }

    /**
     * ╔══════════════════════════════════════════════════════════════════════════════╗
     * ║               NITAQAT WARNINGS - OFFICIAL COMPLIANCE MESSAGES                ║
     * ╚══════════════════════════════════════════════════════════════════════════════╝
     */
    _getNitaqatWarnings(rate, halfCountSalaryCount, notCountedSalaryCount, rawSaudiCount) {
        const warnings = [];

        // Band-based warnings
        if (rate < 30) {
            warnings.push({
                level: 'critical',
                messageAr: 'منشأتك في النطاق الأحمر - خطر إيقاف الخدمات',
                messageEn: 'Your establishment is in RED band - risk of service suspension',
            });
        }
        // Note: No YELLOW band warning - it was abolished January 26, 2020

        // Salary-based warnings (official thresholds April 18, 2021)
        if (halfCountSalaryCount > 0) {
            warnings.push({
                level: 'info',
                messageAr: `${halfCountSalaryCount} موظف سعودي براتب 3000-3999 ريال - يحتسب كنصف موظف`,
                messageEn: `${halfCountSalaryCount} Saudi employee(s) earning SAR 3,000-3,999 - counted as 0.5 each`,
            });
        }

        if (notCountedSalaryCount > 0) {
            warnings.push({
                level: 'warning',
                messageAr: `⚠️ ${notCountedSalaryCount} موظف سعودي براتب أقل من 3000 ريال - لا يحتسب في نسبة السعودة`,
                messageEn: `⚠️ ${notCountedSalaryCount} Saudi employee(s) earning below SAR 3,000 - NOT counted toward Saudization`,
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
