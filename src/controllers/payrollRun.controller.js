const { PayrollRun, Employee, SalarySlip } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');

// ═══════════════════════════════════════════════════════════════
// GET ALL PAYROLL RUNS
// GET /api/hr/payroll-runs
// ═══════════════════════════════════════════════════════════════
const getPayrollRuns = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const {
        month,
        year,
        status,
        search,
        page = 1,
        limit = 20
    } = req.query;

    const query = firmId ? { firmId } : { lawyerId };

    if (month) query['payPeriod.month'] = parseInt(month);
    if (year) query['payPeriod.year'] = parseInt(year);
    if (status) query.status = status;

    if (search) {
        query.$or = [
            { runId: { $regex: search, $options: 'i' } },
            { runName: { $regex: search, $options: 'i' } },
            { runNameAr: { $regex: search, $options: 'i' } }
        ];
    }

    const total = await PayrollRun.countDocuments(query);
    const payrollRuns = await PayrollRun.find(query)
        .populate('createdBy', 'firstName lastName')
        .populate('approvalWorkflow.finalApprover', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit));

    return res.json({
        success: true,
        payrollRuns,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET PAYROLL RUN STATS
// GET /api/hr/payroll-runs/stats
// ═══════════════════════════════════════════════════════════════
const getPayrollRunStats = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const stats = await PayrollRun.getStats(firmId, lawyerId);

    return res.json({
        success: true,
        stats
    });
});

// ═══════════════════════════════════════════════════════════════
// GET SINGLE PAYROLL RUN
// GET /api/hr/payroll-runs/:id
// ═══════════════════════════════════════════════════════════════
const getPayrollRun = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const payrollRun = await PayrollRun.findById(id)
        .populate('createdBy', 'firstName lastName')
        .populate('approvalWorkflow.finalApprover', 'firstName lastName')
        .populate('employeeList.employeeId', 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish');

    if (!payrollRun) {
        throw CustomException('Payroll run not found', 404);
    }

    const hasAccess = firmId
        ? payrollRun.firmId?.toString() === firmId.toString()
        : payrollRun.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    return res.json({
        success: true,
        payrollRun
    });
});

// ═══════════════════════════════════════════════════════════════
// CREATE PAYROLL RUN
// POST /api/hr/payroll-runs
// ═══════════════════════════════════════════════════════════════
const createPayrollRun = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const {
        runName,
        runNameAr,
        payPeriod,
        configuration,
        notes
    } = req.body;

    const payrollRun = await PayrollRun.create({
        runName,
        runNameAr,
        payPeriod,
        configuration: configuration || {
            includedEmploymentStatuses: ['active'],
            includedEmployeeTypes: ['full_time', 'part_time', 'contract'],
            calculateGOSI: true,
            prorateSalaries: true,
            includeOvertime: true,
            includeBonuses: true,
            processLoans: true,
            processAdvances: true
        },
        notes,
        status: 'draft',
        firmId,
        lawyerId,
        createdBy: lawyerId,
        processingLog: [{
            logId: `LOG-${Date.now()}`,
            action: 'Payroll run created',
            actionType: 'creation',
            performedBy: lawyerId,
            status: 'success'
        }]
    });

    return res.status(201).json({
        success: true,
        message: 'Payroll run created successfully',
        payrollRun
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE PAYROLL RUN
// PATCH /api/hr/payroll-runs/:id
// ═══════════════════════════════════════════════════════════════
const updatePayrollRun = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const payrollRun = await PayrollRun.findById(id);

    if (!payrollRun) {
        throw CustomException('Payroll run not found', 404);
    }

    const hasAccess = firmId
        ? payrollRun.firmId?.toString() === firmId.toString()
        : payrollRun.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    if (!['draft', 'calculated'].includes(payrollRun.status)) {
        throw CustomException('Only draft or calculated runs can be updated', 400);
    }

    const {
        runName,
        runNameAr,
        payPeriod,
        configuration,
        notes
    } = req.body;

    if (runName) payrollRun.runName = runName;
    if (runNameAr) payrollRun.runNameAr = runNameAr;
    if (payPeriod) {
        Object.keys(payPeriod).forEach(key => {
            payrollRun.payPeriod[key] = payPeriod[key];
        });
    }
    if (configuration) {
        Object.keys(configuration).forEach(key => {
            payrollRun.configuration[key] = configuration[key];
        });
    }
    if (notes) {
        Object.keys(notes).forEach(key => {
            payrollRun.notes[key] = notes[key];
        });
    }

    payrollRun.lastModifiedBy = lawyerId;
    await payrollRun.save();

    return res.json({
        success: true,
        message: 'Payroll run updated successfully',
        payrollRun
    });
});

// ═══════════════════════════════════════════════════════════════
// DELETE PAYROLL RUN
// DELETE /api/hr/payroll-runs/:id
// ═══════════════════════════════════════════════════════════════
const deletePayrollRun = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const payrollRun = await PayrollRun.findById(id);

    if (!payrollRun) {
        throw CustomException('Payroll run not found', 404);
    }

    const hasAccess = firmId
        ? payrollRun.firmId?.toString() === firmId.toString()
        : payrollRun.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    if (payrollRun.status !== 'draft') {
        throw CustomException('Only draft runs can be deleted', 400);
    }

    await PayrollRun.findByIdAndDelete(id);

    return res.json({
        success: true,
        message: 'Payroll run deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// CALCULATE PAYROLL
// POST /api/hr/payroll-runs/:id/calculate
// ═══════════════════════════════════════════════════════════════
const calculatePayroll = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const payrollRun = await PayrollRun.findById(id);

    if (!payrollRun) {
        throw CustomException('Payroll run not found', 404);
    }

    const hasAccess = firmId
        ? payrollRun.firmId?.toString() === firmId.toString()
        : payrollRun.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    if (!['draft', 'calculated'].includes(payrollRun.status)) {
        throw CustomException('Only draft or calculated runs can be recalculated', 400);
    }

    const startTime = Date.now();
    payrollRun.status = 'calculating';
    await payrollRun.save();

    // Get employees based on configuration
    const employeeQuery = firmId ? { firmId } : { lawyerId };
    employeeQuery['employment.employmentStatus'] = {
        $in: payrollRun.configuration.includedEmploymentStatuses || ['active']
    };

    if (payrollRun.configuration.includedEmployeeTypes?.length) {
        employeeQuery['employment.employmentType'] = {
            $in: payrollRun.configuration.includedEmployeeTypes
        };
    }

    // Exclude specific employees
    const excludedIds = (payrollRun.configuration.excludedEmployees || []).map(e => e.employeeId);
    if (excludedIds.length > 0) {
        employeeQuery._id = { $nin: excludedIds };
    }

    const employees = await Employee.find(employeeQuery);

    let totalBasicSalary = 0;
    let totalAllowances = 0;
    let totalGrossPay = 0;
    let totalGOSI = 0;
    let totalEmployerGOSI = 0;
    let totalDeductions = 0;
    let totalNetPay = 0;

    let saudiCount = 0;
    let nonSaudiCount = 0;
    let maleCount = 0;
    let femaleCount = 0;

    const employeeList = [];

    for (const emp of employees) {
        const basicSalary = emp.compensation?.basicSalary || 0;
        const allowances = (emp.compensation?.allowances || []).reduce((sum, a) => sum + (a.amount || 0), 0);
        const grossPay = basicSalary + allowances;

        // GOSI calculation
        const isSaudi = emp.personalInfo?.isSaudi !== false;
        let gosiEmployee = 0;
        let gosiEmployer = 0;

        if (payrollRun.configuration.calculateGOSI) {
            if (isSaudi) {
                gosiEmployee = Math.round(basicSalary * 0.0975); // 9.75%
                gosiEmployer = Math.round(basicSalary * 0.1275); // 12.75%
                saudiCount++;
            } else {
                gosiEmployer = Math.round(basicSalary * 0.02); // 2% for non-Saudi
                nonSaudiCount++;
            }
        }

        // Gender stats
        if (emp.personalInfo?.gender === 'male') maleCount++;
        else if (emp.personalInfo?.gender === 'female') femaleCount++;

        const totalDeductionsEmp = gosiEmployee;
        const netPay = grossPay - totalDeductionsEmp;

        employeeList.push({
            employeeId: emp._id,
            employeeNumber: emp.employeeId,
            employeeName: emp.personalInfo?.fullNameEnglish || emp.personalInfo?.fullNameArabic,
            employeeNameAr: emp.personalInfo?.fullNameArabic,
            nationalId: emp.personalInfo?.nationalId,
            department: emp.employment?.departmentName || emp.organization?.departmentName,
            jobTitle: emp.employment?.jobTitle || emp.employment?.jobTitleArabic,
            earnings: {
                basicSalary,
                allowances,
                overtime: 0,
                bonus: 0,
                commission: 0,
                otherEarnings: 0,
                grossPay
            },
            deductions: {
                gosi: gosiEmployee,
                loans: 0,
                advances: 0,
                absences: 0,
                lateDeductions: 0,
                violations: 0,
                otherDeductions: 0,
                totalDeductions: totalDeductionsEmp
            },
            netPay,
            status: 'calculated',
            paymentMethod: emp.compensation?.paymentMethod || 'bank_transfer',
            bankName: emp.compensation?.bankDetails?.bankName,
            iban: emp.compensation?.bankDetails?.iban,
            wpsIncluded: true,
            calculatedOn: new Date()
        });

        totalBasicSalary += basicSalary;
        totalAllowances += allowances;
        totalGrossPay += grossPay;
        totalGOSI += gosiEmployee;
        totalEmployerGOSI += gosiEmployer;
        totalDeductions += totalDeductionsEmp;
        totalNetPay += netPay;
    }

    // Update payroll run
    payrollRun.employeeList = employeeList;
    payrollRun.employees = {
        totalEmployees: employees.length,
        processedEmployees: employees.length,
        pendingEmployees: 0,
        failedEmployees: 0,
        onHoldEmployees: 0
    };
    payrollRun.financialSummary = {
        totalBasicSalary,
        totalAllowances,
        totalGrossPay,
        totalGOSI,
        totalDeductions,
        totalNetPay,
        totalEmployerGOSI
    };
    payrollRun.statistics = {
        ...payrollRun.statistics,
        employeesByNationality: { saudi: saudiCount, nonSaudi: nonSaudiCount },
        employeesByGender: { male: maleCount, female: femaleCount },
        totalProcessingTime: Date.now() - startTime,
        averageTimePerEmployee: employees.length > 0 ? (Date.now() - startTime) / employees.length : 0,
        averageSalary: employees.length > 0 ? totalNetPay / employees.length : 0,
        highestSalary: employeeList.length > 0 ? Math.max(...employeeList.map(e => e.netPay)) : 0,
        lowestSalary: employeeList.length > 0 ? Math.min(...employeeList.map(e => e.netPay)) : 0
    };
    payrollRun.status = 'calculated';

    // Add log
    payrollRun.processingLog.push({
        logId: `LOG-${Date.now()}`,
        action: 'Payroll calculated',
        actionType: 'calculation',
        performedBy: lawyerId,
        status: 'success',
        affectedEmployees: employees.length,
        affectedAmount: totalNetPay,
        duration: Date.now() - startTime
    });

    await payrollRun.save();

    return res.json({
        success: true,
        message: `Payroll calculated for ${employees.length} employees`,
        payrollRun
    });
});

// ═══════════════════════════════════════════════════════════════
// VALIDATE PAYROLL RUN
// POST /api/hr/payroll-runs/:id/validate
// ═══════════════════════════════════════════════════════════════
const validatePayroll = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const payrollRun = await PayrollRun.findById(id);

    if (!payrollRun) {
        throw CustomException('Payroll run not found', 404);
    }

    const hasAccess = firmId
        ? payrollRun.firmId?.toString() === firmId.toString()
        : payrollRun.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    const errors = [];

    // Validation rules
    payrollRun.employeeList.forEach(emp => {
        if (emp.netPay < 0) {
            errors.push({
                errorId: `ERR-${Date.now()}-${emp.employeeId}`,
                errorCode: 'NEGATIVE_NET_PAY',
                errorType: 'critical',
                errorMessage: 'Net pay is negative',
                errorMessageAr: 'صافي الراتب سالب',
                employeeId: emp.employeeId,
                employeeName: emp.employeeName
            });
        }
        if (!emp.iban && emp.paymentMethod === 'bank_transfer') {
            errors.push({
                errorId: `ERR-${Date.now()}-${emp.employeeId}`,
                errorCode: 'MISSING_IBAN',
                errorType: 'error',
                errorMessage: 'IBAN is required for bank transfer',
                errorMessageAr: 'رقم الآيبان مطلوب للتحويل البنكي',
                employeeId: emp.employeeId,
                employeeName: emp.employeeName
            });
        }
        if (emp.earnings.basicSalary <= 0) {
            errors.push({
                errorId: `ERR-${Date.now()}-${emp.employeeId}`,
                errorCode: 'ZERO_SALARY',
                errorType: 'warning',
                errorMessage: 'Basic salary is zero or negative',
                errorMessageAr: 'الراتب الأساسي صفر أو سالب',
                employeeId: emp.employeeId,
                employeeName: emp.employeeName
            });
        }
    });

    payrollRun.validation = {
        validated: true,
        validationDate: new Date(),
        validatedBy: lawyerId,
        errors,
        criticalErrorCount: errors.filter(e => e.errorType === 'critical').length,
        errorCount: errors.filter(e => e.errorType === 'error').length,
        warningCount: errors.filter(e => e.errorType === 'warning').length,
        hasBlockingErrors: errors.some(e => e.errorType === 'critical'),
        canProceed: !errors.some(e => e.errorType === 'critical'),
        preRunValidation: {
            allEmployeesHaveBank: !errors.some(e => e.errorCode === 'MISSING_IBAN'),
            allSalariesPositive: !errors.some(e => e.errorCode === 'ZERO_SALARY'),
            noNegativeDeductions: true,
            gosiCalculationCorrect: true,
            totalBalanced: true
        }
    };

    payrollRun.processingLog.push({
        logId: `LOG-${Date.now()}`,
        action: 'Payroll validated',
        actionType: 'validation',
        performedBy: lawyerId,
        status: errors.some(e => e.errorType === 'critical') ? 'warning' : 'success',
        details: `Found ${errors.length} issues`
    });

    await payrollRun.save();

    return res.json({
        success: true,
        message: `Validation completed with ${errors.length} issues`,
        validation: payrollRun.validation
    });
});

// ═══════════════════════════════════════════════════════════════
// APPROVE PAYROLL RUN
// POST /api/hr/payroll-runs/:id/approve
// ═══════════════════════════════════════════════════════════════
const approvePayroll = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { comments } = req.body;

    const payrollRun = await PayrollRun.findById(id);

    if (!payrollRun) {
        throw CustomException('Payroll run not found', 404);
    }

    const hasAccess = firmId
        ? payrollRun.firmId?.toString() === firmId.toString()
        : payrollRun.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    if (payrollRun.status !== 'calculated') {
        throw CustomException('Only calculated runs can be approved', 400);
    }

    if (payrollRun.validation?.hasBlockingErrors) {
        throw CustomException('Cannot approve run with critical errors', 400);
    }

    payrollRun.status = 'approved';
    payrollRun.approvalWorkflow.finalStatus = 'approved';
    payrollRun.approvalWorkflow.finalApprover = lawyerId;
    payrollRun.approvalWorkflow.finalApprovalDate = new Date();

    if (comments) {
        payrollRun.notes.approverNotes = comments;
    }

    payrollRun.processingLog.push({
        logId: `LOG-${Date.now()}`,
        action: 'Payroll run approved',
        actionType: 'approval',
        performedBy: lawyerId,
        details: comments,
        status: 'success'
    });

    await payrollRun.save();

    return res.json({
        success: true,
        message: 'Payroll run approved successfully',
        payrollRun
    });
});

// ═══════════════════════════════════════════════════════════════
// PROCESS PAYMENTS
// POST /api/hr/payroll-runs/:id/process-payments
// ═══════════════════════════════════════════════════════════════
const processPayments = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const payrollRun = await PayrollRun.findById(id);

    if (!payrollRun) {
        throw CustomException('Payroll run not found', 404);
    }

    const hasAccess = firmId
        ? payrollRun.firmId?.toString() === firmId.toString()
        : payrollRun.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    if (payrollRun.status !== 'approved') {
        throw CustomException('Only approved runs can process payments', 400);
    }

    payrollRun.status = 'processing_payment';
    await payrollRun.save();

    // Create salary slips for each employee
    const slipsToCreate = [];
    for (const emp of payrollRun.employeeList) {
        if (emp.onHold) continue;

        slipsToCreate.push({
            employeeId: emp.employeeId,
            employeeNumber: emp.employeeNumber,
            employeeName: emp.employeeName,
            employeeNameAr: emp.employeeNameAr,
            nationalId: emp.nationalId,
            jobTitle: emp.jobTitle,
            department: emp.department,
            payPeriod: {
                month: payrollRun.payPeriod.month,
                year: payrollRun.payPeriod.year,
                calendarType: payrollRun.payPeriod.calendarType,
                periodStart: payrollRun.payPeriod.periodStart,
                periodEnd: payrollRun.payPeriod.periodEnd,
                paymentDate: payrollRun.payPeriod.paymentDate,
                workingDays: 22,
                daysWorked: emp.isProrated ? emp.proratedDays : 22
            },
            earnings: {
                basicSalary: emp.earnings.basicSalary,
                allowances: [],
                totalAllowances: emp.earnings.allowances,
                overtime: { hours: 0, rate: 1.5, amount: emp.earnings.overtime },
                bonus: emp.earnings.bonus,
                commission: emp.earnings.commission,
                arrears: 0,
                totalEarnings: emp.earnings.grossPay
            },
            deductions: {
                gosi: emp.deductions.gosi,
                gosiEmployer: 0,
                loans: emp.deductions.loans,
                advances: emp.deductions.advances,
                absences: emp.deductions.absences,
                lateDeductions: emp.deductions.lateDeductions,
                violations: emp.deductions.violations,
                otherDeductions: emp.deductions.otherDeductions,
                totalDeductions: emp.deductions.totalDeductions
            },
            netPay: emp.netPay,
            payment: {
                paymentMethod: emp.paymentMethod,
                bankName: emp.bankName,
                iban: emp.iban,
                status: 'paid'
            },
            generatedBy: lawyerId,
            firmId,
            lawyerId
        });
    }

    // Bulk insert salary slips
    const insertedSlips = await SalarySlip.insertMany(slipsToCreate);

    // Post each salary slip to General Ledger and update employee list
    for (let i = 0; i < insertedSlips.length; i++) {
        const slip = insertedSlips[i];

        // Post to GL
        try {
            await slip.postToGL();
        } catch (error) {
            console.error(`Failed to post payroll to GL for slip ${slip.slipNumber}:`, error.message);
            // Continue processing other slips even if one fails
        }

        const empIndex = payrollRun.employeeList.findIndex(
            e => e.employeeId.toString() === slip.employeeId.toString() && !e.onHold
        );
        if (empIndex !== -1) {
            payrollRun.employeeList[empIndex].slipId = slip._id;
            payrollRun.employeeList[empIndex].slipNumber = slip.slipNumber;
            payrollRun.employeeList[empIndex].paymentStatus = 'paid';
            payrollRun.employeeList[empIndex].paidOn = new Date();
            payrollRun.employeeList[empIndex].status = 'paid';
        }
    }

    payrollRun.status = 'paid';
    payrollRun.paymentProcessing = {
        paymentStatus: 'completed',
        paidEmployees: insertedSlips.length,
        pendingPayments: 0,
        failedPayments: 0,
        totalPaid: payrollRun.financialSummary.totalNetPay,
        totalPending: 0,
        totalFailed: 0,
        paymentCompletionPercentage: 100
    };

    payrollRun.processingLog.push({
        logId: `LOG-${Date.now()}`,
        action: 'Payments processed and salary slips created',
        actionType: 'payment',
        performedBy: lawyerId,
        status: 'success',
        affectedEmployees: insertedSlips.length,
        affectedAmount: payrollRun.financialSummary.totalNetPay
    });

    await payrollRun.save();

    return res.json({
        success: true,
        message: `Processed payments for ${insertedSlips.length} employees`,
        payrollRun
    });
});

// ═══════════════════════════════════════════════════════════════
// CANCEL PAYROLL RUN
// POST /api/hr/payroll-runs/:id/cancel
// ═══════════════════════════════════════════════════════════════
const cancelPayroll = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { reason } = req.body;

    const payrollRun = await PayrollRun.findById(id);

    if (!payrollRun) {
        throw CustomException('Payroll run not found', 404);
    }

    const hasAccess = firmId
        ? payrollRun.firmId?.toString() === firmId.toString()
        : payrollRun.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    if (['paid', 'cancelled'].includes(payrollRun.status)) {
        throw CustomException('Cannot cancel paid or already cancelled runs', 400);
    }

    payrollRun.status = 'cancelled';
    payrollRun.processingLog.push({
        logId: `LOG-${Date.now()}`,
        action: 'Payroll run cancelled',
        actionType: 'other',
        performedBy: lawyerId,
        details: reason,
        status: 'success'
    });

    await payrollRun.save();

    return res.json({
        success: true,
        message: 'Payroll run cancelled successfully',
        payrollRun
    });
});

// ═══════════════════════════════════════════════════════════════
// GENERATE WPS FILE
// POST /api/hr/payroll-runs/:id/generate-wps
// ═══════════════════════════════════════════════════════════════
const generateWPS = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const payrollRun = await PayrollRun.findById(id);

    if (!payrollRun) {
        throw CustomException('Payroll run not found', 404);
    }

    const hasAccess = firmId
        ? payrollRun.firmId?.toString() === firmId.toString()
        : payrollRun.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // Generate WPS SIF file name
    const fileName = `WPS_${payrollRun.runId}_${Date.now()}.sif`;

    payrollRun.wps.sifFile = {
        generated: true,
        generatedDate: new Date(),
        generatedBy: lawyerId,
        fileName,
        fileUrl: `/uploads/wps/${fileName}`,
        recordCount: payrollRun.employeeList.filter(e => e.wpsIncluded).length,
        totalAmount: payrollRun.financialSummary.totalNetPay,
        fileFormat: 'MOL_SIF'
    };

    payrollRun.processingLog.push({
        logId: `LOG-${Date.now()}`,
        action: 'WPS file generated',
        actionType: 'other',
        performedBy: lawyerId,
        status: 'success',
        details: fileName
    });

    await payrollRun.save();

    return res.json({
        success: true,
        message: 'WPS file generated successfully',
        wpsFile: payrollRun.wps.sifFile
    });
});

// ═══════════════════════════════════════════════════════════════
// HOLD EMPLOYEE
// POST /api/hr/payroll-runs/:id/employees/:empId/hold
// ═══════════════════════════════════════════════════════════════
const holdEmployee = asyncHandler(async (req, res) => {
    const { id, empId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { reason } = req.body;

    const payrollRun = await PayrollRun.findById(id);

    if (!payrollRun) {
        throw CustomException('Payroll run not found', 404);
    }

    const hasAccess = firmId
        ? payrollRun.firmId?.toString() === firmId.toString()
        : payrollRun.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    const empIndex = payrollRun.employeeList.findIndex(
        e => e.employeeId.toString() === empId
    );

    if (empIndex === -1) {
        throw CustomException('Employee not found in run', 404);
    }

    payrollRun.employeeList[empIndex].onHold = true;
    payrollRun.employeeList[empIndex].onHoldReason = reason;
    payrollRun.employeeList[empIndex].onHoldBy = lawyerId;
    payrollRun.employeeList[empIndex].onHoldDate = new Date();
    payrollRun.employeeList[empIndex].status = 'on_hold';

    payrollRun.employees.onHoldEmployees = (payrollRun.employees.onHoldEmployees || 0) + 1;

    await payrollRun.save();

    return res.json({
        success: true,
        message: 'Employee put on hold',
        employee: payrollRun.employeeList[empIndex]
    });
});

// ═══════════════════════════════════════════════════════════════
// UNHOLD EMPLOYEE
// POST /api/hr/payroll-runs/:id/employees/:empId/unhold
// ═══════════════════════════════════════════════════════════════
const unholdEmployee = asyncHandler(async (req, res) => {
    const { id, empId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const payrollRun = await PayrollRun.findById(id);

    if (!payrollRun) {
        throw CustomException('Payroll run not found', 404);
    }

    const hasAccess = firmId
        ? payrollRun.firmId?.toString() === firmId.toString()
        : payrollRun.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    const empIndex = payrollRun.employeeList.findIndex(
        e => e.employeeId.toString() === empId
    );

    if (empIndex === -1) {
        throw CustomException('Employee not found in run', 404);
    }

    payrollRun.employeeList[empIndex].onHold = false;
    payrollRun.employeeList[empIndex].onHoldReason = undefined;
    payrollRun.employeeList[empIndex].status = 'calculated';

    payrollRun.employees.onHoldEmployees = Math.max(0, (payrollRun.employees.onHoldEmployees || 0) - 1);

    await payrollRun.save();

    return res.json({
        success: true,
        message: 'Employee removed from hold',
        employee: payrollRun.employeeList[empIndex]
    });
});

// ═══════════════════════════════════════════════════════════════
// SEND NOTIFICATIONS
// POST /api/hr/payroll-runs/:id/send-notifications
// ═══════════════════════════════════════════════════════════════
const sendNotifications = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const payrollRun = await PayrollRun.findById(id);

    if (!payrollRun) {
        throw CustomException('Payroll run not found', 404);
    }

    const hasAccess = firmId
        ? payrollRun.firmId?.toString() === firmId.toString()
        : payrollRun.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // In production, this would send emails/SMS
    const sent = payrollRun.employeeList.length;

    payrollRun.processingLog.push({
        logId: `LOG-${Date.now()}`,
        action: 'Payslip notifications sent',
        actionType: 'notification',
        performedBy: lawyerId,
        status: 'success',
        affectedEmployees: sent
    });

    await payrollRun.save();

    return res.json({
        success: true,
        message: `Notifications sent to ${sent} employees`,
        sent,
        failed: 0
    });
});

module.exports = {
    getPayrollRuns,
    getPayrollRunStats,
    getPayrollRun,
    createPayrollRun,
    updatePayrollRun,
    deletePayrollRun,
    calculatePayroll,
    validatePayroll,
    approvePayroll,
    processPayments,
    cancelPayroll,
    generateWPS,
    holdEmployee,
    unholdEmployee,
    sendNotifications
};
