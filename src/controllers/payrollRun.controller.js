const { PayrollRun, Employee, SalarySlip } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

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

    const isSoloLawyer = req.isSoloLawyer;
    const query = {};
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

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

    // Sanitize ObjectId to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid payroll run ID', 400);
    }

    // IDOR protection - build query with firmId isolation
    const query = { _id: sanitizedId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const payrollRun = await PayrollRun.findOne(query)
        .populate('createdBy', 'firstName lastName')
        .populate('approvalWorkflow.finalApprover', 'firstName lastName')
        .populate('employeeList.employeeId', 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish');

    if (!payrollRun) {
        throw CustomException('Payroll run not found', 404);
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

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['runName', 'runNameAr', 'payPeriod', 'configuration', 'notes'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const payrollRun = await PayrollRun.create({
        ...safeData,
        configuration: safeData.configuration || {
            includedEmploymentStatuses: ['active'],
            includedEmployeeTypes: ['full_time', 'part_time', 'contract'],
            calculateGOSI: true,
            prorateSalaries: true,
            includeOvertime: true,
            includeBonuses: true,
            processLoans: true,
            processAdvances: true
        },
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

    // Sanitize ObjectId to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid payroll run ID', 400);
    }

    // IDOR protection - build query with firmId isolation
    const query = { _id: sanitizedId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const payrollRun = await PayrollRun.findOne(query);

    if (!payrollRun) {
        throw CustomException('Payroll run not found', 404);
    }

    if (!['draft', 'calculated'].includes(payrollRun.status)) {
        throw CustomException('Only draft or calculated runs can be updated', 400);
    }

    // Mass assignment protection - only allow specific safe fields
    const allowedFields = ['runName', 'runNameAr', 'payPeriod', 'configuration', 'notes'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Prevent salary manipulation - configuration changes only allowed in draft mode
    if (payrollRun.status !== 'draft' && safeData.configuration) {
        throw CustomException('Cannot modify configuration after draft status', 400);
    }

    // Update only allowed fields
    if (safeData.runName) payrollRun.runName = safeData.runName;
    if (safeData.runNameAr) payrollRun.runNameAr = safeData.runNameAr;
    if (safeData.payPeriod) {
        Object.keys(safeData.payPeriod).forEach(key => {
            payrollRun.payPeriod[key] = safeData.payPeriod[key];
        });
    }
    if (safeData.configuration && payrollRun.status === 'draft') {
        Object.keys(safeData.configuration).forEach(key => {
            payrollRun.configuration[key] = safeData.configuration[key];
        });
    }
    if (safeData.notes) {
        Object.keys(safeData.notes).forEach(key => {
            payrollRun.notes[key] = safeData.notes[key];
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

    // Sanitize ObjectId to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid payroll run ID', 400);
    }

    // IDOR protection - build query with firmId isolation
    const query = { _id: sanitizedId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const payrollRun = await PayrollRun.findOne(query);

    if (!payrollRun) {
        throw CustomException('Payroll run not found', 404);
    }

    if (payrollRun.status !== 'draft') {
        throw CustomException('Only draft runs can be deleted', 400);
    }

    await PayrollRun.findOneAndDelete(query);

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

    // Sanitize ObjectId to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid payroll run ID', 400);
    }

    // IDOR protection - build query with firmId isolation
    const query = { _id: sanitizedId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const payrollRun = await PayrollRun.findOne(query);

    if (!payrollRun) {
        throw CustomException('Payroll run not found', 404);
    }

    if (!['draft', 'calculated'].includes(payrollRun.status)) {
        throw CustomException('Only draft or calculated runs can be recalculated', 400);
    }

    const startTime = Date.now();
    payrollRun.status = 'calculating';
    await payrollRun.save();

    // Get employees based on configuration
    const isSoloLawyer = req.isSoloLawyer;
    const employeeQuery = {};
    if (isSoloLawyer || !firmId) {
        employeeQuery.lawyerId = lawyerId;
    } else {
        employeeQuery.firmId = firmId;
    }
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
        // Input validation for payroll amounts
        const basicSalary = parseFloat(emp.compensation?.basicSalary) || 0;

        // Validate salary amount
        if (basicSalary < 0 || !isFinite(basicSalary) || basicSalary > 1000000) {
            throw CustomException(`Invalid salary amount for employee ${emp.employeeId}`, 400);
        }

        // Validate allowances
        const allowances = (emp.compensation?.allowances || []).reduce((sum, a) => {
            const amount = parseFloat(a.amount) || 0;
            if (amount < 0 || !isFinite(amount)) {
                throw CustomException(`Invalid allowance amount for employee ${emp.employeeId}`, 400);
            }
            return sum + amount;
        }, 0);

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

    // Sanitize ObjectId to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid payroll run ID', 400);
    }

    // IDOR protection - build query with firmId isolation
    const query = { _id: sanitizedId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const payrollRun = await PayrollRun.findOne(query);

    if (!payrollRun) {
        throw CustomException('Payroll run not found', 404);
    }

    const errorMessages = [];

    // Validation rules
    payrollRun.employeeList.forEach(emp => {
        if (emp.netPay < 0) {
            errorMessages.push({
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
            errorMessages.push({
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
            errorMessages.push({
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
        errorMessages,
        criticalErrorCount: errorMessages.filter(e => e.errorType === 'critical').length,
        errorCount: errorMessages.filter(e => e.errorType === 'error').length,
        warningCount: errorMessages.filter(e => e.errorType === 'warning').length,
        hasBlockingErrors: errorMessages.some(e => e.errorType === 'critical'),
        canProceed: !errorMessages.some(e => e.errorType === 'critical'),
        preRunValidation: {
            allEmployeesHaveBank: !errorMessages.some(e => e.errorCode === 'MISSING_IBAN'),
            allSalariesPositive: !errorMessages.some(e => e.errorCode === 'ZERO_SALARY'),
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
        status: errorMessages.some(e => e.errorType === 'critical') ? 'warning' : 'success',
        details: `Found ${errorMessages.length} issues`
    });

    await payrollRun.save();

    return res.json({
        success: true,
        message: `Validation completed with ${errorMessages.length} issues`,
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

    // Sanitize ObjectId to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid payroll run ID', 400);
    }

    // Mass assignment protection - only allow comments field
    const safeData = pickAllowedFields(req.body, ['comments']);

    // IDOR protection - build query with firmId isolation
    const query = { _id: sanitizedId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const payrollRun = await PayrollRun.findOne(query);

    if (!payrollRun) {
        throw CustomException('Payroll run not found', 404);
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

    if (safeData.comments) {
        payrollRun.notes.approverNotes = safeData.comments;
    }

    payrollRun.processingLog.push({
        logId: `LOG-${Date.now()}`,
        action: 'Payroll run approved',
        actionType: 'approval',
        performedBy: lawyerId,
        details: safeData.comments,
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

    // Sanitize ObjectId to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid payroll run ID', 400);
    }

    // IDOR protection - build query with firmId isolation
    const query = { _id: sanitizedId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const payrollRun = await PayrollRun.findOne(query);

    if (!payrollRun) {
        throw CustomException('Payroll run not found', 404);
    }

    if (payrollRun.status !== 'approved') {
        throw CustomException('Only approved runs can process payments', 400);
    }

    // Use MongoDB transaction for atomic payroll processing
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Update payroll run status within transaction
        payrollRun.status = 'processing_payment';
        await payrollRun.save({ session });

        // Create salary slips for each employee
        const slipsToCreate = [];
        for (const emp of payrollRun.employeeList) {
            if (emp.onHold) continue;

            // Validate payment amounts within transaction
            const netPay = parseFloat(emp.netPay);
            if (netPay < 0 || !isFinite(netPay)) {
                throw CustomException(`Invalid net pay for employee ${emp.employeeNumber}`, 400);
            }

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

        // Bulk insert salary slips within transaction
        const insertedSlips = await SalarySlip.insertMany(slipsToCreate, { session });

        // Post each salary slip to General Ledger and update employee list
        for (let i = 0; i < insertedSlips.length; i++) {
            const slip = insertedSlips[i];

            // Post to GL within transaction
            try {
                await slip.postToGL();
            } catch (error) {
                logger.error(`Failed to post payroll to GL for slip ${slip.slipNumber}:`, error.message);
                // Rollback transaction on GL posting failure
                throw CustomException(`GL posting failed for slip ${slip.slipNumber}`, 500);
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

        await payrollRun.save({ session });

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        return res.json({
            success: true,
            message: `Processed payments for ${insertedSlips.length} employees`,
            payrollRun
        });
    } catch (error) {
        // Rollback the transaction on error
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
});

// ═══════════════════════════════════════════════════════════════
// CANCEL PAYROLL RUN
// POST /api/hr/payroll-runs/:id/cancel
// ═══════════════════════════════════════════════════════════════
const cancelPayroll = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Sanitize ObjectId to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid payroll run ID', 400);
    }

    // Mass assignment protection - only allow reason field
    const safeData = pickAllowedFields(req.body, ['reason']);

    // IDOR protection - build query with firmId isolation
    const query = { _id: sanitizedId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const payrollRun = await PayrollRun.findOne(query);

    if (!payrollRun) {
        throw CustomException('Payroll run not found', 404);
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
        details: safeData.reason,
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

    // Sanitize ObjectId to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid payroll run ID', 400);
    }

    // IDOR protection - build query with firmId isolation
    const query = { _id: sanitizedId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const payrollRun = await PayrollRun.findOne(query);

    if (!payrollRun) {
        throw CustomException('Payroll run not found', 404);
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

    // Sanitize ObjectIds to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    const sanitizedEmpId = sanitizeObjectId(empId);
    if (!sanitizedId || !sanitizedEmpId) {
        throw CustomException('Invalid ID provided', 400);
    }

    // Mass assignment protection - only allow reason field
    const safeData = pickAllowedFields(req.body, ['reason']);

    // IDOR protection - build query with firmId isolation
    const query = { _id: sanitizedId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const payrollRun = await PayrollRun.findOne(query);

    if (!payrollRun) {
        throw CustomException('Payroll run not found', 404);
    }

    const empIndex = payrollRun.employeeList.findIndex(
        e => e.employeeId.toString() === sanitizedEmpId
    );

    if (empIndex === -1) {
        throw CustomException('Employee not found in run', 404);
    }

    payrollRun.employeeList[empIndex].onHold = true;
    payrollRun.employeeList[empIndex].onHoldReason = safeData.reason;
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

    // Sanitize ObjectIds to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    const sanitizedEmpId = sanitizeObjectId(empId);
    if (!sanitizedId || !sanitizedEmpId) {
        throw CustomException('Invalid ID provided', 400);
    }

    // IDOR protection - build query with firmId isolation
    const query = { _id: sanitizedId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const payrollRun = await PayrollRun.findOne(query);

    if (!payrollRun) {
        throw CustomException('Payroll run not found', 404);
    }

    const empIndex = payrollRun.employeeList.findIndex(
        e => e.employeeId.toString() === sanitizedEmpId
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

    // Sanitize ObjectId to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid payroll run ID', 400);
    }

    // IDOR protection - build query with firmId isolation
    const query = { _id: sanitizedId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const payrollRun = await PayrollRun.findOne(query);

    if (!payrollRun) {
        throw CustomException('Payroll run not found', 404);
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

// ═══════════════════════════════════════════════════════════════
// EXCLUDE EMPLOYEE FROM RUN
// POST /api/hr/payroll-runs/:id/employees/:empId/exclude
// ═══════════════════════════════════════════════════════════════
const excludeEmployee = asyncHandler(async (req, res) => {
    const { id, empId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const sanitizedId = sanitizeObjectId(id);
    const sanitizedEmpId = sanitizeObjectId(empId);
    if (!sanitizedId || !sanitizedEmpId) {
        throw CustomException('Invalid ID provided | معرف غير صالح', 400);
    }

    const safeData = pickAllowedFields(req.body, ['reason']);

    // IDOR protection - build query with firmId isolation
    const query = { _id: sanitizedId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const payrollRun = await PayrollRun.findOne(query);

    if (!payrollRun) {
        throw CustomException('Payroll run not found | دورة الرواتب غير موجودة', 404);
    }

    if (!['draft', 'calculated'].includes(payrollRun.status)) {
        throw CustomException('Can only exclude employees in draft or calculated runs | يمكن استبعاد الموظفين فقط في الدورات المسودة أو المحسوبة', 400);
    }

    // Check if employee is in the run
    const empIndex = payrollRun.employeeList.findIndex(
        e => e.employeeId.toString() === sanitizedEmpId
    );

    if (empIndex === -1) {
        throw CustomException('Employee not found in run | الموظف غير موجود في الدورة', 404);
    }

    // Remove from employee list
    const excludedEmployee = payrollRun.employeeList[empIndex];
    payrollRun.employeeList.splice(empIndex, 1);

    // Add to excluded employees configuration
    if (!payrollRun.configuration.excludedEmployees) {
        payrollRun.configuration.excludedEmployees = [];
    }
    payrollRun.configuration.excludedEmployees.push({
        employeeId: sanitizedEmpId,
        reason: safeData.reason || 'Manually excluded',
        excludedBy: lawyerId,
        excludedAt: new Date()
    });

    // Update counts
    payrollRun.employees.totalEmployees = payrollRun.employeeList.length;
    payrollRun.employees.processedEmployees = payrollRun.employeeList.length;

    // Recalculate totals
    payrollRun.financialSummary.totalBasicSalary -= excludedEmployee.earnings.basicSalary || 0;
    payrollRun.financialSummary.totalAllowances -= excludedEmployee.earnings.allowances || 0;
    payrollRun.financialSummary.totalGrossPay -= excludedEmployee.earnings.grossPay || 0;
    payrollRun.financialSummary.totalGOSI -= excludedEmployee.deductions.gosi || 0;
    payrollRun.financialSummary.totalDeductions -= excludedEmployee.deductions.totalDeductions || 0;
    payrollRun.financialSummary.totalNetPay -= excludedEmployee.netPay || 0;

    payrollRun.processingLog.push({
        logId: `LOG-${Date.now()}`,
        action: `Employee excluded: ${excludedEmployee.employeeName}`,
        actionType: 'other',
        performedBy: lawyerId,
        details: safeData.reason,
        status: 'success',
        affectedEmployees: 1,
        affectedAmount: excludedEmployee.netPay
    });

    await payrollRun.save();

    return res.json({
        success: true,
        message: 'Employee excluded from payroll run | تم استبعاد الموظف من دورة الرواتب',
        excludedEmployee: {
            employeeId: excludedEmployee.employeeId,
            employeeName: excludedEmployee.employeeName,
            netPay: excludedEmployee.netPay,
            reason: safeData.reason
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// INCLUDE EMPLOYEE BACK IN RUN
// POST /api/hr/payroll-runs/:id/employees/:empId/include
// ═══════════════════════════════════════════════════════════════
const includeEmployee = asyncHandler(async (req, res) => {
    const { id, empId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const sanitizedId = sanitizeObjectId(id);
    const sanitizedEmpId = sanitizeObjectId(empId);
    if (!sanitizedId || !sanitizedEmpId) {
        throw CustomException('Invalid ID provided | معرف غير صالح', 400);
    }

    // IDOR protection - build query with firmId isolation
    const query = { _id: sanitizedId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const payrollRun = await PayrollRun.findOne(query);

    if (!payrollRun) {
        throw CustomException('Payroll run not found | دورة الرواتب غير موجودة', 404);
    }

    if (!['draft', 'calculated'].includes(payrollRun.status)) {
        throw CustomException('Can only include employees in draft or calculated runs | يمكن إضافة الموظفين فقط في الدورات المسودة أو المحسوبة', 400);
    }

    // Check if employee is in excluded list
    const excludedIndex = (payrollRun.configuration.excludedEmployees || []).findIndex(
        e => e.employeeId.toString() === sanitizedEmpId
    );

    if (excludedIndex === -1) {
        throw CustomException('Employee is not in excluded list | الموظف ليس في قائمة المستبعدين', 404);
    }

    // IDOR protection - build employee query with firmId isolation
    const employeeQuery = { _id: sanitizedEmpId };
    if (firmId) {
        employeeQuery.firmId = firmId;
    } else {
        employeeQuery.lawyerId = lawyerId;
    }

    const employee = await Employee.findOne(employeeQuery);
    if (!employee) {
        throw CustomException('Employee not found | الموظف غير موجود', 404);
    }

    // Remove from excluded list
    payrollRun.configuration.excludedEmployees.splice(excludedIndex, 1);

    // Calculate employee payroll data
    const basicSalary = parseFloat(employee.compensation?.basicSalary) || 0;
    const allowances = (employee.compensation?.allowances || []).reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
    const grossPay = basicSalary + allowances;
    const isSaudi = employee.personalInfo?.isSaudi !== false;
    const gosiEmployee = payrollRun.configuration.calculateGOSI && isSaudi ? Math.round(basicSalary * 0.0975) : 0;
    const netPay = grossPay - gosiEmployee;

    // Add to employee list
    const newEmployeeEntry = {
        employeeId: employee._id,
        employeeNumber: employee.employeeId,
        employeeName: employee.personalInfo?.fullNameEnglish || employee.personalInfo?.fullNameArabic,
        employeeNameAr: employee.personalInfo?.fullNameArabic,
        nationalId: employee.personalInfo?.nationalId,
        department: employee.employment?.departmentName || employee.organization?.departmentName,
        jobTitle: employee.employment?.jobTitle,
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
            totalDeductions: gosiEmployee
        },
        netPay,
        status: 'calculated',
        paymentMethod: employee.compensation?.paymentMethod || 'bank_transfer',
        bankName: employee.compensation?.bankDetails?.bankName,
        iban: employee.compensation?.bankDetails?.iban,
        wpsIncluded: true,
        calculatedOn: new Date()
    };

    payrollRun.employeeList.push(newEmployeeEntry);

    // Update counts
    payrollRun.employees.totalEmployees = payrollRun.employeeList.length;
    payrollRun.employees.processedEmployees = payrollRun.employeeList.length;

    // Update totals
    payrollRun.financialSummary.totalBasicSalary += basicSalary;
    payrollRun.financialSummary.totalAllowances += allowances;
    payrollRun.financialSummary.totalGrossPay += grossPay;
    payrollRun.financialSummary.totalGOSI += gosiEmployee;
    payrollRun.financialSummary.totalDeductions += gosiEmployee;
    payrollRun.financialSummary.totalNetPay += netPay;

    payrollRun.processingLog.push({
        logId: `LOG-${Date.now()}`,
        action: `Employee included: ${newEmployeeEntry.employeeName}`,
        actionType: 'other',
        performedBy: lawyerId,
        status: 'success',
        affectedEmployees: 1,
        affectedAmount: netPay
    });

    await payrollRun.save();

    return res.json({
        success: true,
        message: 'Employee included in payroll run | تمت إضافة الموظف إلى دورة الرواتب',
        employee: newEmployeeEntry
    });
});

// ═══════════════════════════════════════════════════════════════
// RECALCULATE SINGLE EMPLOYEE
// POST /api/hr/payroll-runs/:id/employees/:empId/recalculate
// ═══════════════════════════════════════════════════════════════
const recalculateSingleEmployee = asyncHandler(async (req, res) => {
    const { id, empId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const sanitizedId = sanitizeObjectId(id);
    const sanitizedEmpId = sanitizeObjectId(empId);
    if (!sanitizedId || !sanitizedEmpId) {
        throw CustomException('Invalid ID provided | معرف غير صالح', 400);
    }

    // IDOR protection - build query with firmId isolation
    const query = { _id: sanitizedId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const payrollRun = await PayrollRun.findOne(query);

    if (!payrollRun) {
        throw CustomException('Payroll run not found | دورة الرواتب غير موجودة', 404);
    }

    if (!['draft', 'calculated'].includes(payrollRun.status)) {
        throw CustomException('Can only recalculate in draft or calculated runs | يمكن إعادة الحساب فقط في الدورات المسودة أو المحسوبة', 400);
    }

    const empIndex = payrollRun.employeeList.findIndex(
        e => e.employeeId.toString() === sanitizedEmpId
    );

    if (empIndex === -1) {
        throw CustomException('Employee not found in run | الموظف غير موجود في الدورة', 404);
    }

    // IDOR protection - build employee query with firmId isolation
    const employeeQuery = { _id: sanitizedEmpId };
    if (firmId) {
        employeeQuery.firmId = firmId;
    } else {
        employeeQuery.lawyerId = lawyerId;
    }

    const employee = await Employee.findOne(employeeQuery);
    if (!employee) {
        throw CustomException('Employee not found | الموظف غير موجود', 404);
    }

    const oldData = payrollRun.employeeList[empIndex];

    // Recalculate
    const basicSalary = parseFloat(employee.compensation?.basicSalary) || 0;
    const allowances = (employee.compensation?.allowances || []).reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
    const grossPay = basicSalary + allowances;
    const isSaudi = employee.personalInfo?.isSaudi !== false;
    const gosiEmployee = payrollRun.configuration.calculateGOSI && isSaudi ? Math.round(basicSalary * 0.0975) : 0;
    const gosiEmployer = payrollRun.configuration.calculateGOSI && isSaudi ? Math.round(basicSalary * 0.1275) : (payrollRun.configuration.calculateGOSI ? Math.round(basicSalary * 0.02) : 0);
    const netPay = grossPay - gosiEmployee;

    // Update employee entry
    payrollRun.employeeList[empIndex] = {
        ...payrollRun.employeeList[empIndex],
        employeeName: employee.personalInfo?.fullNameEnglish || employee.personalInfo?.fullNameArabic,
        employeeNameAr: employee.personalInfo?.fullNameArabic,
        nationalId: employee.personalInfo?.nationalId,
        department: employee.employment?.departmentName || employee.organization?.departmentName,
        jobTitle: employee.employment?.jobTitle,
        earnings: {
            basicSalary,
            allowances,
            overtime: oldData.earnings?.overtime || 0,
            bonus: oldData.earnings?.bonus || 0,
            commission: oldData.earnings?.commission || 0,
            otherEarnings: oldData.earnings?.otherEarnings || 0,
            grossPay
        },
        deductions: {
            gosi: gosiEmployee,
            loans: oldData.deductions?.loans || 0,
            advances: oldData.deductions?.advances || 0,
            absences: oldData.deductions?.absences || 0,
            lateDeductions: oldData.deductions?.lateDeductions || 0,
            violations: oldData.deductions?.violations || 0,
            otherDeductions: oldData.deductions?.otherDeductions || 0,
            totalDeductions: gosiEmployee + (oldData.deductions?.loans || 0) + (oldData.deductions?.advances || 0)
        },
        netPay,
        status: 'calculated',
        paymentMethod: employee.compensation?.paymentMethod || 'bank_transfer',
        bankName: employee.compensation?.bankDetails?.bankName,
        iban: employee.compensation?.bankDetails?.iban,
        calculatedOn: new Date()
    };

    // Update totals (subtract old, add new)
    payrollRun.financialSummary.totalBasicSalary += (basicSalary - (oldData.earnings?.basicSalary || 0));
    payrollRun.financialSummary.totalAllowances += (allowances - (oldData.earnings?.allowances || 0));
    payrollRun.financialSummary.totalGrossPay += (grossPay - (oldData.earnings?.grossPay || 0));
    payrollRun.financialSummary.totalGOSI += (gosiEmployee - (oldData.deductions?.gosi || 0));
    payrollRun.financialSummary.totalDeductions += (gosiEmployee - (oldData.deductions?.totalDeductions || 0));
    payrollRun.financialSummary.totalNetPay += (netPay - (oldData.netPay || 0));

    payrollRun.processingLog.push({
        logId: `LOG-${Date.now()}`,
        action: `Employee recalculated: ${payrollRun.employeeList[empIndex].employeeName}`,
        actionType: 'calculation',
        performedBy: lawyerId,
        status: 'success',
        details: `Net pay changed from ${oldData.netPay} to ${netPay}`
    });

    await payrollRun.save();

    return res.json({
        success: true,
        message: 'Employee recalculated successfully | تمت إعادة حساب الموظف بنجاح',
        employee: payrollRun.employeeList[empIndex],
        changes: {
            oldNetPay: oldData.netPay,
            newNetPay: netPay,
            difference: netPay - oldData.netPay
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// EXPORT PAYROLL REPORT
// GET /api/hr/payroll-runs/:id/export
// ═══════════════════════════════════════════════════════════════
const exportPayrollReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { format = 'json' } = req.query;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid payroll run ID | معرف دورة الرواتب غير صالح', 400);
    }

    const validFormats = ['json', 'csv', 'xlsx', 'pdf'];
    if (!validFormats.includes(format.toLowerCase())) {
        throw CustomException(`Invalid format. Supported: ${validFormats.join(', ')} | تنسيق غير صالح`, 400);
    }

    // IDOR protection - build query with firmId isolation
    const query = { _id: sanitizedId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const payrollRun = await PayrollRun.findOne(query)
        .populate('employeeList.employeeId', 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish');

    if (!payrollRun) {
        throw CustomException('Payroll run not found | دورة الرواتب غير موجودة', 404);
    }

    // Prepare export data
    const exportData = {
        runInfo: {
            runId: payrollRun.runId,
            runName: payrollRun.runName,
            runNameAr: payrollRun.runNameAr,
            status: payrollRun.status,
            payPeriod: payrollRun.payPeriod,
            createdAt: payrollRun.createdAt
        },
        summary: payrollRun.financialSummary,
        statistics: {
            totalEmployees: payrollRun.employees.totalEmployees,
            processedEmployees: payrollRun.employees.processedEmployees,
            onHoldEmployees: payrollRun.employees.onHoldEmployees
        },
        employees: payrollRun.employeeList.map(emp => ({
            employeeNumber: emp.employeeNumber,
            employeeName: emp.employeeName,
            employeeNameAr: emp.employeeNameAr,
            department: emp.department,
            jobTitle: emp.jobTitle,
            basicSalary: emp.earnings.basicSalary,
            allowances: emp.earnings.allowances,
            grossPay: emp.earnings.grossPay,
            gosiDeduction: emp.deductions.gosi,
            loans: emp.deductions.loans,
            advances: emp.deductions.advances,
            otherDeductions: emp.deductions.otherDeductions,
            totalDeductions: emp.deductions.totalDeductions,
            netPay: emp.netPay,
            paymentMethod: emp.paymentMethod,
            bankName: emp.bankName,
            iban: emp.iban,
            status: emp.status
        }))
    };

    // For JSON format, return directly
    if (format.toLowerCase() === 'json') {
        return res.json({
            success: true,
            message: 'Export generated successfully | تم إنشاء التقرير بنجاح',
            format: 'json',
            data: exportData
        });
    }

    // For CSV format
    if (format.toLowerCase() === 'csv') {
        const headers = [
            'Employee Number', 'Employee Name (EN)', 'Employee Name (AR)', 'Department', 'Job Title',
            'Basic Salary', 'Allowances', 'Gross Pay', 'GOSI', 'Loans', 'Advances', 'Other Deductions',
            'Total Deductions', 'Net Pay', 'Payment Method', 'Bank Name', 'IBAN', 'Status'
        ];

        let csv = headers.join(',') + '\n';
        exportData.employees.forEach(emp => {
            csv += [
                emp.employeeNumber,
                `"${emp.employeeName || ''}"`,
                `"${emp.employeeNameAr || ''}"`,
                `"${emp.department || ''}"`,
                `"${emp.jobTitle || ''}"`,
                emp.basicSalary,
                emp.allowances,
                emp.grossPay,
                emp.gosiDeduction,
                emp.loans,
                emp.advances,
                emp.otherDeductions,
                emp.totalDeductions,
                emp.netPay,
                emp.paymentMethod,
                `"${emp.bankName || ''}"`,
                `"${emp.iban || ''}"`,
                emp.status
            ].join(',') + '\n';
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=payroll_${payrollRun.runId}.csv`);
        return res.send('\uFEFF' + csv); // BOM for Arabic support
    }

    // For xlsx/pdf, return metadata - actual file generation would be done via queue/external service
    return res.json({
        success: true,
        message: `Export request received. ${format.toUpperCase()} generation will be processed. | تم استلام طلب التصدير`,
        format: format.toLowerCase(),
        data: exportData,
        meta: {
            note: 'For xlsx/pdf formats, use a dedicated document generation service',
            runId: payrollRun.runId,
            employeeCount: exportData.employees.length,
            totalNetPay: payrollRun.financialSummary.totalNetPay
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// BULK DELETE PAYROLL RUNS
// POST /api/hr/payroll-runs/bulk-delete
// ═══════════════════════════════════════════════════════════════
const bulkDeletePayrollRuns = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw CustomException('يجب توفير قائمة المعرفات / IDs list is required', 400);
    }

    // Build access query - only delete draft payroll runs
    const accessQuery = firmId
        ? { _id: { $in: ids }, firmId, status: 'draft' }
        : { _id: { $in: ids }, lawyerId, status: 'draft' };

    const result = await PayrollRun.deleteMany(accessQuery);

    return res.json({
        success: true,
        message: `تم حذف ${result.deletedCount} دورة رواتب بنجاح / ${result.deletedCount} payroll run(s) deleted successfully`,
        deletedCount: result.deletedCount
    });
});

module.exports = {
    getPayrollRuns,
    getPayrollRunStats,
    getPayrollRun,
    createPayrollRun,
    updatePayrollRun,
    deletePayrollRun,
    bulkDeletePayrollRuns,
    calculatePayroll,
    validatePayroll,
    approvePayroll,
    processPayments,
    cancelPayroll,
    generateWPS,
    holdEmployee,
    unholdEmployee,
    excludeEmployee,
    includeEmployee,
    recalculateSingleEmployee,
    exportPayrollReport,
    sendNotifications
};
