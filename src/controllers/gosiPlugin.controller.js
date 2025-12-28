/**
 * GOSI Plugin Controller
 *
 * API endpoints for GOSI calculations and reporting
 */

const asyncHandler = require('../utils/asyncHandler');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const { GOSI_CONFIG } = require('../plugins/gosiCalculation.plugin');
const SalarySlip = require('../models/salarySlip.model');
const PayrollRun = require('../models/payrollRun.model');
const Employee = require('../models/employee.model');
const HRSettings = require('../models/hrSettings.model');
const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get GOSI rates and configuration
 * GET /api/gosi/config
 */
exports.getConfig = asyncHandler(async (req, res) => {
    // Get firm-specific settings if available
    const hrSettings = await HRSettings.findOne(req.firmQuery).select('gosi').lean();

    res.status(200).json({
        success: true,
        data: {
            defaultRates: GOSI_CONFIG.rates,
            maxContributionBase: GOSI_CONFIG.maxContributionBase,
            minContributionBase: GOSI_CONFIG.minContributionBase,
            includedComponents: GOSI_CONFIG.includedComponents,
            excludedComponents: GOSI_CONFIG.excludedComponents,
            firmSettings: hrSettings?.gosi || null
        }
    });
});

/**
 * Update firm GOSI settings
 * PUT /api/gosi/config
 */
exports.updateConfig = asyncHandler(async (req, res) => {
    if (!req.hasPermission('settings', 'edit')) {
        throw CustomException('Permission denied', 403);
    }

    const allowedFields = [
        'enabled', 'employeeContribution', 'employerContribution',
        'maxContributionSalary', 'includeHousingAllowance'
    ];
    const data = pickAllowedFields(req.body, allowedFields);

    const hrSettings = await HRSettings.findOneAndUpdate(
        req.firmQuery,
        { $set: { gosi: data } },
        { new: true, upsert: true }
    );

    res.status(200).json({
        success: true,
        message: 'GOSI settings updated',
        data: hrSettings.gosi
    });
});

// ═══════════════════════════════════════════════════════════════
// CALCULATION ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate GOSI for a given amount
 * POST /api/gosi/calculate
 */
exports.calculate = asyncHandler(async (req, res) => {
    const { basicSalary, housingAllowance, transportationAllowance, isSaudi = true, otherAllowances = [] } = req.body;

    if (!basicSalary || basicSalary <= 0) {
        throw CustomException('Basic salary is required and must be positive', 400);
    }

    const rates = isSaudi ? GOSI_CONFIG.rates.saudi : GOSI_CONFIG.rates.nonSaudi;

    // Calculate contribution base
    let contributionBase = basicSalary;
    if (housingAllowance) contributionBase += housingAllowance;
    if (transportationAllowance) contributionBase += transportationAllowance;

    for (const allowance of otherAllowances) {
        if (allowance.includedInGOSI) {
            contributionBase += allowance.amount || 0;
        }
    }

    const originalBase = contributionBase;
    const wasCapped = contributionBase > GOSI_CONFIG.maxContributionBase;
    const cappedBase = Math.min(contributionBase, GOSI_CONFIG.maxContributionBase);

    const employeeContribution = Math.round(cappedBase * rates.employee * 100) / 100;
    const employerContribution = Math.round(cappedBase * rates.employer * 100) / 100;
    const totalContribution = employeeContribution + employerContribution;

    // Breakdown
    const breakdown = {
        pension: {
            employee: Math.round(cappedBase * rates.breakdown.pension.employee * 100) / 100,
            employer: Math.round(cappedBase * rates.breakdown.pension.employer * 100) / 100
        },
        hazards: {
            employee: Math.round(cappedBase * rates.breakdown.hazards.employee * 100) / 100,
            employer: Math.round(cappedBase * rates.breakdown.hazards.employer * 100) / 100
        },
        saned: {
            employee: Math.round(cappedBase * rates.breakdown.saned.employee * 100) / 100,
            employer: Math.round(cappedBase * rates.breakdown.saned.employer * 100) / 100
        }
    };

    res.status(200).json({
        success: true,
        data: {
            input: {
                basicSalary,
                housingAllowance: housingAllowance || 0,
                transportationAllowance: transportationAllowance || 0,
                otherAllowances: otherAllowances.reduce((sum, a) => sum + (a.includedInGOSI ? a.amount : 0), 0),
                isSaudi
            },
            contributionBase: originalBase,
            cappedContributionBase: cappedBase,
            wasCapped,
            capAmount: GOSI_CONFIG.maxContributionBase,
            rates: {
                employee: `${(rates.employee * 100).toFixed(2)}%`,
                employer: `${(rates.employer * 100).toFixed(2)}%`,
                total: `${(rates.total * 100).toFixed(2)}%`
            },
            contributions: {
                employee: employeeContribution,
                employer: employerContribution,
                total: totalContribution
            },
            breakdown,
            netSalaryImpact: basicSalary - employeeContribution,
            employerCost: basicSalary + employerContribution
        }
    });
});

/**
 * Calculate GOSI for an employee
 * POST /api/gosi/calculate/:employeeId
 */
exports.calculateForEmployee = asyncHandler(async (req, res) => {
    const { employeeId } = req.params;

    const sanitizedId = sanitizeObjectId(employeeId);
    if (!sanitizedId) {
        throw CustomException('Invalid employee ID', 400);
    }

    const employee = await Employee.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    }).select('name nationality basicSalary allowances gosiNumber');

    if (!employee) {
        throw CustomException('Employee not found', 404);
    }

    const isSaudi = employee.nationality === 'SA' || employee.nationality === 'Saudi';
    const rates = isSaudi ? GOSI_CONFIG.rates.saudi : GOSI_CONFIG.rates.nonSaudi;

    let contributionBase = employee.basicSalary || 0;

    // Add allowances
    if (employee.allowances && Array.isArray(employee.allowances)) {
        for (const allowance of employee.allowances) {
            if (allowance.includedInGOSI) {
                contributionBase += allowance.amount || 0;
            }
        }
    }

    const cappedBase = Math.min(contributionBase, GOSI_CONFIG.maxContributionBase);
    const employeeContribution = Math.round(cappedBase * rates.employee * 100) / 100;
    const employerContribution = Math.round(cappedBase * rates.employer * 100) / 100;

    res.status(200).json({
        success: true,
        data: {
            employee: {
                id: employee._id,
                name: employee.name,
                gosiNumber: employee.gosiNumber,
                isSaudi
            },
            basicSalary: employee.basicSalary,
            contributionBase,
            cappedContributionBase: cappedBase,
            wasCapped: contributionBase > GOSI_CONFIG.maxContributionBase,
            contributions: {
                employee: employeeContribution,
                employer: employerContribution,
                total: employeeContribution + employerContribution
            }
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// REPORTING ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get GOSI report for a period
 * GET /api/gosi/report
 */
exports.getReport = asyncHandler(async (req, res) => {
    const { month, year } = req.query;

    if (!month || !year) {
        throw CustomException('Month and year are required', 400);
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const payrollRuns = await PayrollRun.find({
        ...req.firmQuery,
        period: {
            $gte: startDate,
            $lte: endDate
        },
        status: { $in: ['approved', 'paid'] }
    }).populate('entries.employeeId', 'name nameAr gosiNumber nationality');

    if (payrollRuns.length === 0) {
        return res.status(200).json({
            success: true,
            data: {
                period: { month: parseInt(month), year: parseInt(year) },
                message: 'No payroll data found for this period',
                summary: null,
                employees: []
            }
        });
    }

    // Aggregate GOSI data
    let totalSaudiEmployees = 0;
    let totalNonSaudiEmployees = 0;
    let totalEmployeeContribution = 0;
    let totalEmployerContribution = 0;
    let totalContributionBase = 0;

    const employeeData = [];

    for (const run of payrollRuns) {
        for (const entry of run.entries || []) {
            const isSaudi = entry.employeeId?.nationality === 'SA';
            if (isSaudi) {
                totalSaudiEmployees++;
            } else {
                totalNonSaudiEmployees++;
            }

            const gosiEmployee = entry.deductions?.gosi || 0;
            const gosiEmployer = entry.deductions?.gosiEmployer || 0;
            const base = entry.earnings?.basic || 0;

            totalEmployeeContribution += gosiEmployee;
            totalEmployerContribution += gosiEmployer;
            totalContributionBase += base;

            employeeData.push({
                employeeId: entry.employeeId?._id,
                name: entry.employeeId?.name,
                nameAr: entry.employeeId?.nameAr,
                gosiNumber: entry.employeeId?.gosiNumber,
                isSaudi,
                basicSalary: base,
                employeeDeduction: gosiEmployee,
                employerContribution: gosiEmployer,
                totalContribution: gosiEmployee + gosiEmployer
            });
        }
    }

    res.status(200).json({
        success: true,
        data: {
            period: {
                month: parseInt(month),
                year: parseInt(year),
                startDate,
                endDate
            },
            summary: {
                totalEmployees: totalSaudiEmployees + totalNonSaudiEmployees,
                saudiEmployees: totalSaudiEmployees,
                nonSaudiEmployees: totalNonSaudiEmployees,
                totalContributionBase,
                totalEmployeeContribution,
                totalEmployerContribution,
                grandTotal: totalEmployeeContribution + totalEmployerContribution
            },
            employees: employeeData
        }
    });
});

/**
 * Get GOSI summary statistics
 * GET /api/gosi/stats
 */
exports.getStats = asyncHandler(async (req, res) => {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    const stats = await PayrollRun.aggregate([
        {
            $match: {
                firmId: new mongoose.Types.ObjectId(req.firmQuery.firmId),
                status: { $in: ['approved', 'paid'] },
                period: {
                    $gte: new Date(currentYear, 0, 1),
                    $lte: new Date(currentYear, 11, 31)
                }
            }
        },
        {
            $group: {
                _id: { $month: '$period' },
                totalGOSI: { $sum: '$financialSummary.totalGOSI' },
                totalEmployerGOSI: { $sum: '$financialSummary.totalEmployerGOSI' },
                employeeCount: { $sum: { $size: { $ifNull: ['$entries', []] } } }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const monthStats = stats.find(s => s._id === i + 1);
        return {
            month: i + 1,
            monthName: new Date(2024, i).toLocaleString('en', { month: 'short' }),
            totalGOSI: monthStats?.totalGOSI || 0,
            totalEmployerGOSI: monthStats?.totalEmployerGOSI || 0,
            employeeCount: monthStats?.employeeCount || 0
        };
    });

    const yearTotal = monthlyData.reduce((sum, m) => ({
        totalGOSI: sum.totalGOSI + m.totalGOSI,
        totalEmployerGOSI: sum.totalEmployerGOSI + m.totalEmployerGOSI
    }), { totalGOSI: 0, totalEmployerGOSI: 0 });

    res.status(200).json({
        success: true,
        data: {
            year: parseInt(currentYear),
            monthly: monthlyData,
            yearToDate: yearTotal
        }
    });
});

/**
 * Export GOSI report
 * GET /api/gosi/export
 */
exports.exportReport = asyncHandler(async (req, res) => {
    const { month, year, format = 'json' } = req.query;

    if (!month || !year) {
        throw CustomException('Month and year are required', 400);
    }

    // Get report data (reuse getReport logic)
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const salarySlips = await SalarySlip.find({
        ...req.firmQuery,
        paymentDate: { $gte: startDate, $lte: endDate },
        status: { $in: ['approved', 'paid'] }
    }).populate('employeeId', 'name nameAr gosiNumber nationalId nationality');

    const reportData = salarySlips.map(slip => ({
        gosiNumber: slip.employeeId?.gosiNumber || '',
        nationalId: slip.employeeId?.nationalId || '',
        employeeName: slip.employeeId?.name || '',
        employeeNameAr: slip.employeeId?.nameAr || '',
        nationality: slip.employeeId?.nationality || '',
        basicSalary: slip.earnings?.basic || 0,
        housingAllowance: slip.earnings?.housingAllowance || 0,
        contributionBase: (slip.earnings?.basic || 0) + (slip.earnings?.housingAllowance || 0),
        employeeDeduction: slip.deductions?.gosi || 0,
        employerContribution: slip.deductions?.gosiEmployer || 0,
        totalContribution: (slip.deductions?.gosi || 0) + (slip.deductions?.gosiEmployer || 0)
    }));

    if (format === 'csv') {
        const csv = [
            'GOSI Number,National ID,Employee Name,Employee Name (AR),Nationality,Basic Salary,Housing Allowance,Contribution Base,Employee Deduction,Employer Contribution,Total',
            ...reportData.map(r =>
                `${r.gosiNumber},${r.nationalId},"${r.employeeName}","${r.employeeNameAr}",${r.nationality},${r.basicSalary},${r.housingAllowance},${r.contributionBase},${r.employeeDeduction},${r.employerContribution},${r.totalContribution}`
            )
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=GOSI-Report-${year}-${month}.csv`);
        return res.send(csv);
    }

    res.status(200).json({
        success: true,
        data: {
            period: { month: parseInt(month), year: parseInt(year) },
            records: reportData,
            totalRecords: reportData.length,
            totals: {
                basicSalary: reportData.reduce((sum, r) => sum + r.basicSalary, 0),
                employeeDeduction: reportData.reduce((sum, r) => sum + r.employeeDeduction, 0),
                employerContribution: reportData.reduce((sum, r) => sum + r.employerContribution, 0),
                totalContribution: reportData.reduce((sum, r) => sum + r.totalContribution, 0)
            }
        }
    });
});
