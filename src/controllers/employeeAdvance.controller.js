const { EmployeeAdvance, Employee } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// ADVANCE POLICIES (Configurable)
// Key Differences from Loans: Shorter term, smaller amounts, faster processing
// ═══════════════════════════════════════════════════════════════
const ADVANCE_POLICIES = {
    minServiceDays: 90, // Minimum 3 months (vs 6 for loans)
    maxAdvancePercentage: 50, // 50% of monthly salary
    maxInstallments: 6, // Maximum 6 installments (vs 60 for loans)
    maxActiveAdvances: 1, // Only 1 active at a time (vs 2 for loans)
    maxInstallmentPercentage: 50, // 50% of salary for deductions
    emergencyProcessingHours: 24, // Fast-track for emergencies
    autoApprovalThreshold: 1000, // Auto-approve advances below this amount
    advanceTypes: {
        salary: { maxPercentage: 50, maxInstallments: 3 },
        emergency: { maxPercentage: 100, maxInstallments: 1, fastTrack: true },
        travel: { maxPercentage: 30, maxInstallments: 2 },
        relocation: { maxPercentage: 100, maxInstallments: 6 },
        medical: { maxPercentage: 100, maxInstallments: 6, fastTrack: true },
        education: { maxPercentage: 50, maxInstallments: 6 },
        housing: { maxPercentage: 50, maxInstallments: 6 },
        end_of_year: { maxPercentage: 100, maxInstallments: 1 },
        other: { maxPercentage: 30, maxInstallments: 3 }
    }
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// Generate repayment schedule
function generateRepaymentSchedule(advanceAmount, numInstallments, startDate) {
    const installmentAmount = Math.ceil(advanceAmount / numInstallments);
    const installments = [];
    let remainingBalance = advanceAmount;

    for (let i = 1; i <= numInstallments; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + (i - 1));

        // Last installment adjusts for rounding
        const actualAmount = i === numInstallments
            ? remainingBalance
            : installmentAmount;

        remainingBalance -= actualAmount;

        installments.push({
            installmentNumber: i,
            dueDate,
            installmentAmount: actualAmount,
            status: 'pending',
            paidAmount: 0,
            remainingBalance: Math.max(0, advanceAmount - (installmentAmount * i))
        });
    }

    return {
        installments,
        endDate: installments[installments.length - 1].dueDate
    };
}

// Check advance eligibility
async function checkAdvanceEligibility(employeeId, requestedAmount, firmId, lawyerId) {
    const employee = await Employee.findById(employeeId);
    if (!employee) {
        throw CustomException('Employee not found', 404);
    }

    const query = firmId ? { firmId, employeeId } : { lawyerId, employeeId };
    const existingAdvances = await EmployeeAdvance.find({
        ...query,
        status: { $in: ['disbursed', 'recovering', 'pending', 'approved'] }
    });

    const checks = [];
    const basicSalary = employee.compensation?.basicSalary || 0;
    const totalAllowances = employee.compensation?.allowances?.reduce((sum, a) => sum + (a.amount || 0), 0) || 0;
    const grossSalary = basicSalary + totalAllowances;

    // Check 1: Minimum Service Period (90 days / 3 months)
    const serviceStartDate = new Date(employee.employment?.hireDate);
    const daysSinceJoining = Math.floor((Date.now() - serviceStartDate) / (1000 * 60 * 60 * 24));
    checks.push({
        checkType: 'minimum_service',
        checkName: 'Minimum Service Period',
        checkNameAr: 'الحد الأدنى لفترة الخدمة',
        passed: daysSinceJoining >= ADVANCE_POLICIES.minServiceDays,
        requirement: `Minimum ${ADVANCE_POLICIES.minServiceDays} days (3 months) of service`,
        actualValue: `${daysSinceJoining} days`,
        notes: daysSinceJoining < ADVANCE_POLICIES.minServiceDays ? 'Employee has not completed minimum service period' : null
    });

    // Check 2: Employment Status
    const isActive = employee.employment?.employmentStatus === 'active';
    checks.push({
        checkType: 'employment_type',
        checkName: 'Employment Status',
        checkNameAr: 'حالة التوظيف',
        passed: isActive,
        requirement: 'Active employment status',
        actualValue: employee.employment?.employmentStatus || 'unknown'
    });

    // Check 3: Probation Check
    const probationEndDate = employee.employment?.probationEndDate;
    const onProbation = probationEndDate && new Date(probationEndDate) > new Date();
    checks.push({
        checkType: 'probation',
        checkName: 'Probation Period',
        checkNameAr: 'فترة التجربة',
        passed: !onProbation,
        requirement: 'Employee should not be on probation',
        actualValue: onProbation ? 'On probation' : 'Probation completed'
    });

    // Check 4: Maximum Active Advances (Only 1 allowed)
    const activeAdvancesCount = existingAdvances.filter(
        a => ['disbursed', 'recovering'].includes(a.status)
    ).length;
    checks.push({
        checkType: 'maximum_advances',
        checkName: 'Active Advances Count',
        checkNameAr: 'عدد السلف النشطة',
        passed: activeAdvancesCount < ADVANCE_POLICIES.maxActiveAdvances,
        requirement: `Maximum ${ADVANCE_POLICIES.maxActiveAdvances} active advance allowed`,
        actualValue: `${activeAdvancesCount} active advance(s)`
    });

    // Check 5: Advance Limit (50% of salary)
    const maxAdvanceAmount = grossSalary * (ADVANCE_POLICIES.maxAdvancePercentage / 100);
    checks.push({
        checkType: 'advance_limit',
        checkName: 'Advance Limit',
        checkNameAr: 'حد السلفة',
        passed: requestedAmount <= maxAdvanceAmount,
        requirement: `Maximum ${ADVANCE_POLICIES.maxAdvancePercentage}% of salary (${maxAdvanceAmount.toLocaleString()} SAR)`,
        actualValue: `Requested: ${requestedAmount.toLocaleString()} SAR`
    });

    // Check 6: Maximum Deductions (50% of salary including existing)
    const maxMonthlyDeduction = grossSalary * (ADVANCE_POLICIES.maxInstallmentPercentage / 100);
    const currentDeductions = existingAdvances.reduce(
        (sum, adv) => sum + (adv.repayment?.installmentAmount || 0), 0
    );
    const availableDeduction = Math.max(0, maxMonthlyDeduction - currentDeductions);

    checks.push({
        checkType: 'salary_ratio',
        checkName: 'Monthly Deduction Capacity',
        checkNameAr: 'القدرة على الاستقطاع الشهري',
        passed: availableDeduction > 0,
        requirement: `Max ${ADVANCE_POLICIES.maxInstallmentPercentage}% of salary (${maxMonthlyDeduction.toLocaleString()} SAR)`,
        actualValue: `Available: ${availableDeduction.toLocaleString()} SAR`
    });

    // Check 7: Previous Defaults
    const defaultedAdvances = await EmployeeAdvance.countDocuments({
        ...query,
        'recoveryPerformance.missedRecoveries': { $gt: 2 }
    });
    checks.push({
        checkType: 'previous_defaults',
        checkName: 'Payment History',
        checkNameAr: 'سجل السداد',
        passed: defaultedAdvances === 0,
        requirement: 'No history of multiple missed recoveries',
        actualValue: defaultedAdvances > 0 ? 'Has previous defaults' : 'Good standing'
    });

    // Check 8: Existing Deductions
    const totalOutstanding = existingAdvances.reduce(
        (sum, adv) => sum + (adv.balance?.remainingBalance || 0), 0
    );
    checks.push({
        checkType: 'existing_deductions',
        checkName: 'Outstanding Advances',
        checkNameAr: 'السلف القائمة',
        passed: totalOutstanding === 0 || activeAdvancesCount === 0,
        requirement: 'No outstanding advances',
        actualValue: totalOutstanding > 0 ? `${totalOutstanding.toLocaleString()} SAR outstanding` : 'No outstanding'
    });

    const eligible = checks.every(c => c.passed);
    const ineligibilityReasons = checks
        .filter(c => !c.passed)
        .map(c => c.checkNameAr || c.checkName);

    return {
        eligible,
        eligibilityChecks: checks,
        ineligibilityReasons,
        advanceLimit: {
            maximumAdvanceAmount: maxAdvanceAmount,
            requestedAmount,
            withinLimit: requestedAmount <= maxAdvanceAmount
        },
        deductionsCheck: {
            currentMonthlyDeductions: currentDeductions,
            maximumAllowed: maxMonthlyDeduction,
            availableForDeduction: availableDeduction,
            withinLimit: availableDeduction > 0
        },
        employeeInfo: {
            basicSalary,
            grossSalary,
            daysSinceJoining,
            onProbation,
            activeAdvancesCount,
            totalOutstanding
        }
    };
}

// ═══════════════════════════════════════════════════════════════
// GET ALL ADVANCES
// GET /api/hr/advances
// ═══════════════════════════════════════════════════════════════
const getAdvances = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const {
        status,
        advanceType,
        employeeId,
        isEmergency,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 10
    } = req.query;

    // Build query
    const query = firmId ? { firmId } : { lawyerId };

    if (status) query.status = status;
    if (advanceType) query.advanceType = advanceType;
    if (employeeId) query.employeeId = employeeId;
    if (isEmergency !== undefined) query.isEmergency = isEmergency === 'true';

    if (search) {
        query.$or = [
            { employeeName: { $regex: search, $options: 'i' } },
            { employeeNameAr: { $regex: search, $options: 'i' } },
            { advanceId: { $regex: search, $options: 'i' } },
            { advanceNumber: { $regex: search, $options: 'i' } }
        ];
    }

    // Build sort
    const sortField = sortBy === 'advanceAmount' ? 'advanceAmount' :
        sortBy === 'requestDate' ? 'requestDate' :
            sortBy === 'status' ? 'status' :
                sortBy === 'employeeName' ? 'employeeName' : 'createdAt';
    const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    const [advances, total] = await Promise.all([
        EmployeeAdvance.find(query)
            .populate('employeeId', 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish compensation.basicSalary employment.departmentName')
            .populate('createdBy', 'firstName lastName')
            .sort(sort)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .lean(),
        EmployeeAdvance.countDocuments(query)
    ]);

    return res.json({
        success: true,
        data: advances,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET ADVANCE STATS
// GET /api/hr/advances/stats
// ═══════════════════════════════════════════════════════════════
const getAdvanceStats = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const stats = await EmployeeAdvance.getStats(firmId, lawyerId);

    return res.json({
        success: true,
        ...stats
    });
});

// ═══════════════════════════════════════════════════════════════
// GET SINGLE ADVANCE
// GET /api/hr/advances/:advanceId
// ═══════════════════════════════════════════════════════════════
const getAdvance = asyncHandler(async (req, res) => {
    const { advanceId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const advance = await EmployeeAdvance.findById(advanceId)
        .populate('employeeId', 'employeeId personalInfo employment compensation')
        .populate('createdBy', 'firstName lastName')
        .populate('lastModifiedBy', 'firstName lastName')
        .populate('approvalWorkflow.workflowSteps.approverId', 'firstName lastName')
        .populate('disbursement.cash.disbursedBy', 'firstName lastName')
        .populate('disbursement.confirmedBy', 'firstName lastName');

    if (!advance) {
        throw CustomException('Advance not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? advance.firmId?.toString() === firmId.toString()
        : advance.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    return res.json({
        success: true,
        data: advance
    });
});

// ═══════════════════════════════════════════════════════════════
// CHECK ELIGIBILITY
// POST /api/hr/advances/check-eligibility
// ═══════════════════════════════════════════════════════════════
const checkEligibility = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const { employeeId, requestedAmount } = req.body;

    const eligibility = await checkAdvanceEligibility(employeeId, requestedAmount || 0, firmId, lawyerId);

    return res.json({
        success: true,
        ...eligibility
    });
});

// ═══════════════════════════════════════════════════════════════
// CREATE ADVANCE
// POST /api/hr/advances
// ═══════════════════════════════════════════════════════════════
const createAdvance = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const {
        employeeId,
        advanceType,
        advanceAmount,
        installments,
        startDate,
        reason,
        reasonAr,
        urgency,
        isEmergency,
        emergencyDetails,
        notes,
        skipEligibilityCheck
    } = req.body;

    // Fetch employee
    const employee = await Employee.findById(employeeId);
    if (!employee) {
        throw CustomException('Employee not found', 404);
    }

    // Check access to employee
    const hasEmployeeAccess = firmId
        ? employee.firmId?.toString() === firmId.toString()
        : employee.lawyerId?.toString() === lawyerId;

    if (!hasEmployeeAccess) {
        throw CustomException('Access denied to this employee', 403);
    }

    // Check eligibility (unless skipped for admin)
    let eligibility = { eligible: true, eligibilityChecks: [], ineligibilityReasons: [] };
    if (!skipEligibilityCheck && !isEmergency) {
        eligibility = await checkAdvanceEligibility(employeeId, advanceAmount, firmId, lawyerId);
        if (!eligibility.eligible) {
            throw CustomException(`Employee is not eligible for this advance: ${eligibility.ineligibilityReasons.join(', ')}`, 400);
        }
    }

    // Calculate installment amount
    const installmentAmount = Math.ceil(advanceAmount / installments);

    // Generate repayment schedule
    const schedule = generateRepaymentSchedule(
        advanceAmount,
        installments,
        new Date(startDate)
    );

    // Determine if fast-track approval
    const typeConfig = ADVANCE_POLICIES.advanceTypes[advanceType] || {};
    const fastTrack = isEmergency || typeConfig.fastTrack || false;

    // Prepare advance data
    const advanceData = {
        employeeId,
        employeeNumber: employee.employeeId,
        employeeName: employee.personalInfo?.fullNameEnglish || employee.personalInfo?.fullNameArabic,
        employeeNameAr: employee.personalInfo?.fullNameArabic,
        nationalId: employee.personalInfo?.nationalId,
        department: employee.organization?.departmentName || employee.employment?.departmentName,
        jobTitle: employee.employment?.jobTitle || employee.employment?.jobTitleArabic,

        advanceType,
        advanceAmount,
        approvedAmount: advanceAmount,
        currency: 'SAR',

        reason,
        reasonAr,
        urgency: urgency || (isEmergency ? 'critical' : 'medium'),
        isEmergency: isEmergency || false,
        emergencyDetails: isEmergency ? emergencyDetails : undefined,

        repayment: {
            installments,
            installmentAmount,
            repaymentFrequency: 'monthly',
            startDate: new Date(startDate),
            endDate: schedule.endDate,
            deductionMethod: 'payroll_deduction'
        },

        balance: {
            originalAmount: advanceAmount,
            recoveredAmount: 0,
            remainingBalance: advanceAmount,
            completionPercentage: 0
        },

        status: 'pending',
        requestStatus: 'submitted',
        requestDate: new Date(),

        eligibility: {
            eligible: eligibility.eligible,
            eligibilityChecks: eligibility.eligibilityChecks,
            ineligibilityReasons: eligibility.ineligibilityReasons,
            advanceLimit: eligibility.advanceLimit,
            deductionsCheck: eligibility.deductionsCheck
        },

        approvalWorkflow: {
            required: true,
            fastTrack,
            workflowSteps: [{
                stepNumber: 1,
                stepName: fastTrack ? 'Fast-Track Approval' : 'HR Approval',
                stepNameAr: fastTrack ? 'موافقة سريعة' : 'موافقة الموارد البشرية',
                approverRole: 'hr',
                status: 'pending'
            }],
            currentStep: 1,
            totalSteps: 1,
            finalStatus: 'pending'
        },

        repaymentSchedule: {
            scheduleGenerated: true,
            generatedDate: new Date(),
            installments: schedule.installments,
            summary: {
                totalInstallments: installments,
                paidInstallments: 0,
                pendingInstallments: installments,
                missedInstallments: 0,
                totalPayable: advanceAmount,
                amountPaid: 0,
                remainingAmount: advanceAmount
            }
        },

        notes: notes || {},

        firmId: firmId || null,
        lawyerId: firmId ? null : lawyerId,
        createdBy: lawyerId
    };

    const advance = await EmployeeAdvance.create(advanceData);

    // Populate and return
    await advance.populate([
        { path: 'employeeId', select: 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish' },
        { path: 'createdBy', select: 'firstName lastName' }
    ]);

    return res.status(201).json({
        success: true,
        message: isEmergency ? 'Emergency advance request created (fast-track)' : 'Advance request created successfully',
        data: advance
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE ADVANCE
// PATCH /api/hr/advances/:advanceId
// ═══════════════════════════════════════════════════════════════
const updateAdvance = asyncHandler(async (req, res) => {
    const { advanceId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const advance = await EmployeeAdvance.findById(advanceId);

    if (!advance) {
        throw CustomException('Advance not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? advance.firmId?.toString() === firmId.toString()
        : advance.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // Prevent updates if disbursed or completed
    if (['disbursed', 'recovering', 'completed', 'cancelled'].includes(advance.status)) {
        throw CustomException('Cannot update advance in current status', 400);
    }

    const allowedUpdates = [
        'advanceType', 'advanceAmount', 'reason', 'reasonAr', 'urgency',
        'repayment', 'notes', 'documents', 'isEmergency', 'emergencyDetails'
    ];

    // Apply updates
    allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
            if (typeof req.body[field] === 'object' && !Array.isArray(req.body[field])) {
                advance[field] = { ...advance[field]?.toObject?.() || advance[field] || {}, ...req.body[field] };
            } else {
                advance[field] = req.body[field];
            }
        }
    });

    // Recalculate if advance amount changed
    if (req.body.advanceAmount) {
        advance.balance.originalAmount = req.body.advanceAmount;
        advance.balance.remainingBalance = req.body.advanceAmount - advance.balance.recoveredAmount;
    }

    advance.lastModifiedBy = lawyerId;
    await advance.save();

    return res.json({
        success: true,
        message: 'Advance updated successfully',
        data: advance
    });
});

// ═══════════════════════════════════════════════════════════════
// DELETE ADVANCE
// DELETE /api/hr/advances/:advanceId
// ═══════════════════════════════════════════════════════════════
const deleteAdvance = asyncHandler(async (req, res) => {
    const { advanceId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const advance = await EmployeeAdvance.findById(advanceId);

    if (!advance) {
        throw CustomException('Advance not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? advance.firmId?.toString() === firmId.toString()
        : advance.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // Only allow deletion if pending or rejected
    if (!['pending', 'rejected'].includes(advance.status)) {
        throw CustomException('Only pending or rejected advances can be deleted', 400);
    }

    await EmployeeAdvance.findByIdAndDelete(advanceId);

    return res.json({
        success: true,
        message: 'Advance deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// APPROVE ADVANCE
// POST /api/hr/advances/:advanceId/approve
// ═══════════════════════════════════════════════════════════════
const approveAdvance = asyncHandler(async (req, res) => {
    const { advanceId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const { approvedAmount, approvedInstallments, comments, conditions } = req.body;

    const advance = await EmployeeAdvance.findById(advanceId);

    if (!advance) {
        throw CustomException('Advance not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? advance.firmId?.toString() === firmId.toString()
        : advance.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    if (advance.status !== 'pending') {
        throw CustomException('Only pending advances can be approved', 400);
    }

    // Update approval workflow
    const currentStep = advance.approvalWorkflow.workflowSteps.find(
        s => s.stepNumber === advance.approvalWorkflow.currentStep
    );

    if (currentStep) {
        currentStep.status = 'approved';
        currentStep.decision = 'approve';
        currentStep.actionDate = new Date();
        currentStep.approverId = lawyerId;
        currentStep.comments = comments;
        if (approvedAmount) currentStep.approvedAmount = approvedAmount;
        if (approvedInstallments) currentStep.approvedInstallments = approvedInstallments;

        // Calculate response time
        const requestDate = new Date(advance.requestDate);
        currentStep.responseTime = Math.round((Date.now() - requestDate) / (1000 * 60 * 60)); // hours
    }

    // Update advance
    advance.status = 'approved';
    advance.requestStatus = 'approved';
    advance.approvalDate = new Date();
    advance.approvedAmount = approvedAmount || advance.advanceAmount;
    advance.approvalWorkflow.finalStatus = 'approved';
    advance.approvalWorkflow.finalApprover = lawyerId.toString();
    advance.approvalWorkflow.finalApprovalDate = new Date();

    // Calculate total approval time
    const requestDate = new Date(advance.requestDate);
    advance.approvalWorkflow.totalApprovalTime = Math.round((Date.now() - requestDate) / (1000 * 60 * 60));

    // Recalculate if approved amount differs
    if (approvedAmount && approvedAmount !== advance.advanceAmount) {
        advance.balance.originalAmount = approvedAmount;
        advance.balance.remainingBalance = approvedAmount;

        const numInstallments = approvedInstallments || advance.repayment.installments;
        const installmentAmount = Math.ceil(approvedAmount / numInstallments);
        advance.repayment.installmentAmount = installmentAmount;

        // Regenerate schedule
        const schedule = generateRepaymentSchedule(
            approvedAmount,
            numInstallments,
            advance.repayment.startDate
        );
        advance.repaymentSchedule.installments = schedule.installments;
        advance.repayment.endDate = schedule.endDate;
        advance.repaymentSchedule.summary.totalPayable = approvedAmount;
        advance.repaymentSchedule.summary.remainingAmount = approvedAmount;
        advance.repaymentSchedule.summary.totalInstallments = numInstallments;
        advance.repaymentSchedule.summary.pendingInstallments = numInstallments;
    }

    // Update analytics
    advance.analytics.requestToApprovalTime = advance.approvalWorkflow.totalApprovalTime;

    advance.lastModifiedBy = lawyerId;
    await advance.save();

    return res.json({
        success: true,
        message: 'Advance approved successfully',
        data: advance
    });
});

// ═══════════════════════════════════════════════════════════════
// REJECT ADVANCE
// POST /api/hr/advances/:advanceId/reject
// ═══════════════════════════════════════════════════════════════
const rejectAdvance = asyncHandler(async (req, res) => {
    const { advanceId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const { rejectionReason, comments } = req.body;

    const advance = await EmployeeAdvance.findById(advanceId);

    if (!advance) {
        throw CustomException('Advance not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? advance.firmId?.toString() === firmId.toString()
        : advance.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    if (advance.status !== 'pending') {
        throw CustomException('Only pending advances can be rejected', 400);
    }

    // Update approval workflow
    const currentStep = advance.approvalWorkflow.workflowSteps.find(
        s => s.stepNumber === advance.approvalWorkflow.currentStep
    );

    if (currentStep) {
        currentStep.status = 'rejected';
        currentStep.decision = 'reject';
        currentStep.actionDate = new Date();
        currentStep.approverId = lawyerId;
        currentStep.comments = comments || rejectionReason;
    }

    // Update advance
    advance.status = 'rejected';
    advance.requestStatus = 'rejected';
    advance.approvalWorkflow.finalStatus = 'rejected';
    advance.approvalWorkflow.rejectionReason = rejectionReason;
    advance.lastModifiedBy = lawyerId;
    await advance.save();

    return res.json({
        success: true,
        message: 'Advance rejected',
        data: advance
    });
});

// ═══════════════════════════════════════════════════════════════
// DISBURSE ADVANCE
// POST /api/hr/advances/:advanceId/disburse
// ═══════════════════════════════════════════════════════════════
const disburseAdvance = asyncHandler(async (req, res) => {
    const { advanceId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const {
        disbursementMethod,
        bankDetails,
        checkDetails,
        cashDetails,
        transferReference,
        deductions
    } = req.body;

    const advance = await EmployeeAdvance.findById(advanceId);

    if (!advance) {
        throw CustomException('Advance not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? advance.firmId?.toString() === firmId.toString()
        : advance.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    if (advance.status !== 'approved') {
        throw CustomException('Advance must be approved before disbursement', 400);
    }

    // Calculate net disbursement
    let totalDeductions = 0;
    const disbursementDeductions = [];
    if (deductions && Array.isArray(deductions)) {
        deductions.forEach(d => {
            totalDeductions += d.deductionAmount || 0;
            disbursementDeductions.push(d);
        });
    }

    const netDisbursedAmount = (advance.approvedAmount || advance.advanceAmount) - totalDeductions;

    // Update disbursement details
    advance.disbursement = {
        disbursementMethod,
        disbursed: true,
        disbursementDate: new Date(),
        actualDisbursedAmount: advance.approvedAmount || advance.advanceAmount,
        disbursementDeductions,
        netDisbursedAmount,
        urgentDisbursement: advance.isEmergency || advance.urgency === 'critical',
        confirmationRequired: true,
        confirmed: false
    };

    if (disbursementMethod === 'bank_transfer' && bankDetails) {
        advance.disbursement.bankTransfer = {
            bankName: bankDetails.bankName,
            accountNumber: bankDetails.accountNumber,
            iban: bankDetails.iban,
            transferDate: new Date(),
            transferReference: transferReference || `ADV-TRF-${Date.now()}`,
            transferStatus: 'completed',
            sameDayTransfer: advance.isEmergency
        };
    }

    if (disbursementMethod === 'check' && checkDetails) {
        advance.disbursement.check = {
            checkNumber: checkDetails.checkNumber,
            checkDate: new Date(checkDetails.checkDate),
            issued: true,
            issuedDate: new Date()
        };
    }

    if (disbursementMethod === 'cash' && cashDetails) {
        advance.disbursement.cash = {
            disbursedOn: new Date(),
            disbursedBy: lawyerId,
            receiptNumber: cashDetails.receiptNumber || `ADV-RCP-${Date.now()}`
        };
    }

    // Update status to recovering (ready for payroll deductions)
    advance.status = 'recovering';
    advance.disbursementDate = new Date();

    // Set up payroll deduction
    advance.payrollIntegration = {
        payrollDeduction: {
            active: true,
            deductionCode: `ADV-${advance.advanceNumber}`,
            deductionAmount: advance.repayment.installmentAmount,
            deductionStartDate: advance.repayment.startDate,
            deductionEndDate: advance.repayment.endDate,
            deductionFrequency: 'monthly',
            automaticDeduction: true
        },
        payrollDeductions: [],
        failedDeductions: []
    };

    // Update analytics
    const approvalDate = new Date(advance.approvalDate);
    advance.analytics.approvalToDisbursementTime = Math.round((Date.now() - approvalDate) / (1000 * 60 * 60));
    advance.analytics.totalProcessingTime = (advance.analytics.requestToApprovalTime || 0) +
        advance.analytics.approvalToDisbursementTime;

    advance.lastModifiedBy = lawyerId;
    await advance.save();

    return res.json({
        success: true,
        message: 'Advance disbursed successfully',
        data: advance
    });
});

// ═══════════════════════════════════════════════════════════════
// RECORD RECOVERY (Payment)
// POST /api/hr/advances/:advanceId/recover
// ═══════════════════════════════════════════════════════════════
const recordRecovery = asyncHandler(async (req, res) => {
    const { advanceId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const {
        amount,
        recoveryMethod,
        recoveryDate,
        recoveryReference,
        notes
    } = req.body;

    const advance = await EmployeeAdvance.findById(advanceId);

    if (!advance) {
        throw CustomException('Advance not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? advance.firmId?.toString() === firmId.toString()
        : advance.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    if (!['disbursed', 'recovering'].includes(advance.status)) {
        throw CustomException('Can only record recoveries for disbursed/recovering advances', 400);
    }

    // Apply recovery to pending installments
    let remainingRecovery = amount;
    const recoveriesApplied = [];
    const actualRecoveryDate = recoveryDate ? new Date(recoveryDate) : new Date();

    const pendingInstallments = advance.repaymentSchedule.installments
        .filter(i => i.status !== 'paid' && i.status !== 'waived')
        .sort((a, b) => a.installmentNumber - b.installmentNumber);

    for (const installment of pendingInstallments) {
        if (remainingRecovery <= 0) break;

        const amountDue = installment.installmentAmount - (installment.paidAmount || 0);
        const recoveryApplied = Math.min(remainingRecovery, amountDue);

        installment.paidAmount = (installment.paidAmount || 0) + recoveryApplied;
        installment.status = installment.paidAmount >= installment.installmentAmount
            ? 'paid'
            : 'partial';

        if (installment.status === 'paid') {
            installment.paidDate = actualRecoveryDate;
            installment.paymentMethod = recoveryMethod;
            installment.paymentReference = recoveryReference;

            // Check if late
            const daysLate = Math.floor(
                (actualRecoveryDate - new Date(installment.dueDate)) / (1000 * 60 * 60 * 24)
            );
            if (daysLate > 0) {
                installment.daysMissed = daysLate;
                advance.recoveryPerformance.delayedRecoveries += 1;
            } else {
                advance.recoveryPerformance.onTimeRecoveries += 1;
            }

            advance.repaymentSchedule.summary.paidInstallments += 1;
            advance.repaymentSchedule.summary.pendingInstallments -= 1;
        }

        remainingRecovery -= recoveryApplied;
        recoveriesApplied.push({
            installmentNumber: installment.installmentNumber,
            amountApplied: recoveryApplied
        });
    }

    // Update balance
    advance.balance.recoveredAmount += amount;
    advance.balance.remainingBalance = advance.balance.originalAmount - advance.balance.recoveredAmount;
    advance.balance.completionPercentage = Math.round(
        (advance.balance.recoveredAmount / advance.balance.originalAmount) * 100
    );

    // Add to recovery history
    advance.recoveryHistory.push({
        recoveryId: `RCV-${Date.now()}`,
        recoveryDate: actualRecoveryDate,
        recoveredAmount: amount,
        recoveryMethod,
        recoveryReference,
        processedBy: lawyerId,
        remainingBalance: advance.balance.remainingBalance,
        receiptNumber: `RCP-${Date.now()}`,
        notes
    });

    // Update repayment schedule summary
    advance.repaymentSchedule.summary.amountPaid = advance.balance.recoveredAmount;
    advance.repaymentSchedule.summary.remainingAmount = advance.balance.remainingBalance;

    // Update recovery performance
    advance.calculateRecoveryPerformance();

    // Check if advance is completed
    if (advance.balance.remainingBalance <= 0) {
        advance.status = 'completed';
        advance.completion = {
            advanceCompleted: true,
            completionDate: new Date(),
            completionMethod: 'full_recovery',
            finalRecovery: {
                recoveryDate: actualRecoveryDate,
                recoveryAmount: amount,
                recoveryReference
            }
        };

        // Deactivate payroll deduction
        if (advance.payrollIntegration?.payrollDeduction) {
            advance.payrollIntegration.payrollDeduction.active = false;
        }
    }

    advance.lastModifiedBy = lawyerId;
    await advance.save();

    return res.json({
        success: true,
        message: 'Recovery recorded successfully',
        data: {
            advance,
            recoveriesApplied,
            remainingBalance: advance.balance.remainingBalance
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// PROCESS PAYROLL DEDUCTION
// POST /api/hr/advances/:advanceId/payroll-deduction
// ═══════════════════════════════════════════════════════════════
const processPayrollDeduction = asyncHandler(async (req, res) => {
    const { advanceId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const { payrollRunId, payrollMonth, payrollYear, deductedAmount } = req.body;

    const advance = await EmployeeAdvance.findById(advanceId);

    if (!advance) {
        throw CustomException('Advance not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? advance.firmId?.toString() === firmId.toString()
        : advance.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    if (!['disbursed', 'recovering'].includes(advance.status)) {
        throw CustomException('Can only process deductions for active advances', 400);
    }

    // Record the payroll deduction
    advance.payrollIntegration.payrollDeductions.push({
        payrollRunId,
        payrollMonth,
        payrollYear,
        deductionDate: new Date(),
        installmentNumber: advance.recoveryHistory.length + 1,
        deductedAmount,
        remainingBalance: advance.balance.remainingBalance - deductedAmount,
        processedBy: lawyerId
    });

    // Use internal record recovery logic
    // Apply to pending installments
    let remainingRecovery = deductedAmount;
    const pendingInstallments = advance.repaymentSchedule.installments
        .filter(i => i.status !== 'paid' && i.status !== 'waived')
        .sort((a, b) => a.installmentNumber - b.installmentNumber);

    for (const installment of pendingInstallments) {
        if (remainingRecovery <= 0) break;

        const amountDue = installment.installmentAmount - (installment.paidAmount || 0);
        const recoveryApplied = Math.min(remainingRecovery, amountDue);

        installment.paidAmount = (installment.paidAmount || 0) + recoveryApplied;
        installment.status = installment.paidAmount >= installment.installmentAmount ? 'paid' : 'partial';

        if (installment.status === 'paid') {
            installment.paidDate = new Date();
            installment.paymentMethod = 'payroll_deduction';
            installment.paymentReference = `PAYROLL-${payrollRunId}`;
            advance.recoveryPerformance.onTimeRecoveries += 1;
            advance.repaymentSchedule.summary.paidInstallments += 1;
            advance.repaymentSchedule.summary.pendingInstallments -= 1;
        }

        remainingRecovery -= recoveryApplied;
    }

    // Update balance
    advance.balance.recoveredAmount += deductedAmount;
    advance.balance.remainingBalance = advance.balance.originalAmount - advance.balance.recoveredAmount;
    advance.balance.completionPercentage = Math.round(
        (advance.balance.recoveredAmount / advance.balance.originalAmount) * 100
    );

    // Add to recovery history
    advance.recoveryHistory.push({
        recoveryId: `RCV-PAYROLL-${Date.now()}`,
        recoveryDate: new Date(),
        recoveredAmount: deductedAmount,
        recoveryMethod: 'payroll_deduction',
        recoveryReference: `PAYROLL-${payrollRunId}`,
        processedBy: lawyerId,
        remainingBalance: advance.balance.remainingBalance
    });

    // Update summary
    advance.repaymentSchedule.summary.amountPaid = advance.balance.recoveredAmount;
    advance.repaymentSchedule.summary.remainingAmount = advance.balance.remainingBalance;

    // Check if completed
    if (advance.balance.remainingBalance <= 0) {
        advance.status = 'completed';
        advance.completion = {
            advanceCompleted: true,
            completionDate: new Date(),
            completionMethod: 'full_recovery'
        };
        if (advance.payrollIntegration?.payrollDeduction) {
            advance.payrollIntegration.payrollDeduction.active = false;
        }
    }

    advance.lastModifiedBy = lawyerId;
    await advance.save();

    return res.json({
        success: true,
        message: 'Payroll deduction processed successfully',
        data: advance
    });
});

// ═══════════════════════════════════════════════════════════════
// PROCESS EARLY RECOVERY (Lump Sum)
// POST /api/hr/advances/:advanceId/early-recovery
// ═══════════════════════════════════════════════════════════════
const processEarlyRecovery = asyncHandler(async (req, res) => {
    const { advanceId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const { recoveryAmount, recoveryMethod, recoveryReference, recoveryOption } = req.body;

    const advance = await EmployeeAdvance.findById(advanceId);

    if (!advance) {
        throw CustomException('Advance not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? advance.firmId?.toString() === firmId.toString()
        : advance.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    if (!['disbursed', 'recovering'].includes(advance.status)) {
        throw CustomException('Only active advances can be recovered early', 400);
    }

    if (recoveryAmount < advance.balance.remainingBalance) {
        throw CustomException('Recovery amount must cover remaining balance', 400);
    }

    // Mark all pending installments as paid
    advance.repaymentSchedule.installments.forEach(installment => {
        if (installment.status !== 'paid' && installment.status !== 'waived') {
            installment.status = 'paid';
            installment.paidDate = new Date();
            installment.paymentMethod = recoveryMethod;
            installment.paidAmount = installment.installmentAmount;
        }
    });

    // Update balance
    advance.balance.recoveredAmount = advance.balance.originalAmount;
    advance.balance.remainingBalance = 0;
    advance.balance.completionPercentage = 100;

    // Add to recovery history
    advance.recoveryHistory.push({
        recoveryId: `RCV-EARLY-${Date.now()}`,
        recoveryDate: new Date(),
        recoveredAmount: recoveryAmount,
        recoveryMethod,
        recoveryReference,
        remainingBalance: 0,
        receiptNumber: `RCP-EARLY-${Date.now()}`,
        notes: 'Early recovery - lump sum'
    });

    // Update early recovery
    advance.earlyRecovery = {
        requested: true,
        requestDate: new Date(),
        requestedBy: 'employer',
        recoveryOption: recoveryOption || 'lump_sum',
        lumpSum: {
            amount: recoveryAmount,
            paymentMethod: recoveryMethod,
            paymentDate: new Date(),
            paymentReference: recoveryReference,
            paid: true
        },
        approved: true,
        approvedBy: lawyerId,
        approvalDate: new Date(),
        completed: true,
        completionDate: new Date()
    };

    // Complete advance
    advance.status = 'completed';
    advance.completion = {
        advanceCompleted: true,
        completionDate: new Date(),
        completionMethod: 'early_recovery',
        finalRecovery: {
            recoveryDate: new Date(),
            recoveryAmount: recoveryAmount,
            recoveryReference
        }
    };

    // Update summary
    advance.repaymentSchedule.summary.amountPaid = advance.balance.originalAmount;
    advance.repaymentSchedule.summary.remainingAmount = 0;
    advance.repaymentSchedule.summary.paidInstallments = advance.repaymentSchedule.summary.totalInstallments;
    advance.repaymentSchedule.summary.pendingInstallments = 0;

    // Deactivate payroll deduction
    if (advance.payrollIntegration?.payrollDeduction) {
        advance.payrollIntegration.payrollDeduction.active = false;
        advance.payrollIntegration.payrollDeduction.deductionEndDate = new Date();
    }

    advance.lastModifiedBy = lawyerId;
    await advance.save();

    return res.json({
        success: true,
        message: 'Early recovery processed successfully',
        data: advance
    });
});

// ═══════════════════════════════════════════════════════════════
// CANCEL ADVANCE
// POST /api/hr/advances/:advanceId/cancel
// ═══════════════════════════════════════════════════════════════
const cancelAdvance = asyncHandler(async (req, res) => {
    const { advanceId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const { cancellationReason } = req.body;

    const advance = await EmployeeAdvance.findById(advanceId);

    if (!advance) {
        throw CustomException('Advance not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? advance.firmId?.toString() === firmId.toString()
        : advance.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // Only allow cancellation if not yet disbursed
    if (!['pending', 'approved'].includes(advance.status)) {
        throw CustomException('Only pending or approved advances can be cancelled', 400);
    }

    advance.status = 'cancelled';
    advance.requestStatus = 'cancelled';

    if (cancellationReason) {
        advance.notes.internalNotes = `${advance.notes.internalNotes || ''}\n[CANCELLED] ${new Date().toISOString()}: ${cancellationReason}`;
    }

    advance.lastModifiedBy = lawyerId;
    await advance.save();

    return res.json({
        success: true,
        message: 'Advance cancelled successfully',
        data: advance
    });
});

// ═══════════════════════════════════════════════════════════════
// WRITE OFF ADVANCE
// POST /api/hr/advances/:advanceId/write-off
// ═══════════════════════════════════════════════════════════════
const writeOffAdvance = asyncHandler(async (req, res) => {
    const { advanceId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const { writeOffReason, detailedReason } = req.body;

    const advance = await EmployeeAdvance.findById(advanceId);

    if (!advance) {
        throw CustomException('Advance not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? advance.firmId?.toString() === firmId.toString()
        : advance.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    if (!['disbursed', 'recovering'].includes(advance.status)) {
        throw CustomException('Only active advances can be written off', 400);
    }

    advance.writeOff = {
        writtenOff: true,
        writeOffDate: new Date(),
        writeOffReason,
        writeOffAmount: advance.balance.remainingBalance,
        detailedReason,
        finalApproved: true,
        finalApprovalBy: lawyerId,
        finalApprovalDate: new Date()
    };

    advance.status = 'completed';
    advance.completion = {
        advanceCompleted: true,
        completionDate: new Date(),
        completionMethod: 'write_off',
        caseClosed: true,
        closedDate: new Date(),
        closedBy: lawyerId
    };

    // Deactivate payroll deduction
    if (advance.payrollIntegration?.payrollDeduction) {
        advance.payrollIntegration.payrollDeduction.active = false;
    }

    advance.lastModifiedBy = lawyerId;
    await advance.save();

    return res.json({
        success: true,
        message: 'Advance written off successfully',
        data: advance
    });
});

// ═══════════════════════════════════════════════════════════════
// ISSUE CLEARANCE LETTER
// POST /api/hr/advances/:advanceId/issue-clearance
// ═══════════════════════════════════════════════════════════════
const issueClearanceLetter = asyncHandler(async (req, res) => {
    const { advanceId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const advance = await EmployeeAdvance.findById(advanceId);

    if (!advance) {
        throw CustomException('Advance not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? advance.firmId?.toString() === firmId.toString()
        : advance.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    if (advance.status !== 'completed') {
        throw CustomException('Clearance letter can only be issued for completed advances', 400);
    }

    advance.completion.clearanceLetter = {
        issued: true,
        issueDate: new Date(),
        letterUrl: req.body.letterUrl || null,
        delivered: false
    };

    advance.completion.caseClosed = true;
    advance.completion.closedDate = new Date();
    advance.completion.closedBy = lawyerId;

    advance.lastModifiedBy = lawyerId;
    await advance.save();

    return res.json({
        success: true,
        message: 'Clearance letter issued successfully',
        data: advance
    });
});

// ═══════════════════════════════════════════════════════════════
// BULK DELETE
// POST /api/hr/advances/bulk-delete
// ═══════════════════════════════════════════════════════════════
const bulkDelete = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { ids } = req.body;

    // Build query to ensure access
    const query = {
        _id: { $in: ids },
        status: { $in: ['pending', 'rejected'] }
    };

    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const result = await EmployeeAdvance.deleteMany(query);

    return res.json({
        success: true,
        message: `${result.deletedCount} advance(s) deleted successfully`,
        deletedCount: result.deletedCount
    });
});

// ═══════════════════════════════════════════════════════════════
// GET BY EMPLOYEE
// GET /api/hr/advances/by-employee/:employeeId
// ═══════════════════════════════════════════════════════════════
const getByEmployee = asyncHandler(async (req, res) => {
    const { employeeId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const advances = await EmployeeAdvance.getByEmployee(employeeId, firmId, lawyerId);

    return res.json({
        success: true,
        data: advances
    });
});

// ═══════════════════════════════════════════════════════════════
// GET PENDING APPROVALS
// GET /api/hr/advances/pending-approvals
// ═══════════════════════════════════════════════════════════════
const getPendingApprovals = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const advances = await EmployeeAdvance.getPendingApprovals(firmId, lawyerId);

    return res.json({
        success: true,
        data: advances
    });
});

// ═══════════════════════════════════════════════════════════════
// GET OVERDUE RECOVERIES
// GET /api/hr/advances/overdue-recoveries
// ═══════════════════════════════════════════════════════════════
const getOverdueRecoveries = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const overdueList = await EmployeeAdvance.getOverdueRecoveries(firmId, lawyerId);

    return res.json({
        success: true,
        data: overdueList
    });
});

// ═══════════════════════════════════════════════════════════════
// GET EMERGENCY ADVANCES
// GET /api/hr/advances/emergency
// ═══════════════════════════════════════════════════════════════
const getEmergencyAdvances = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const advances = await EmployeeAdvance.getEmergencyAdvances(firmId, lawyerId);

    return res.json({
        success: true,
        data: advances
    });
});

// ═══════════════════════════════════════════════════════════════
// UPLOAD DOCUMENT
// POST /api/hr/advances/:advanceId/documents
// ═══════════════════════════════════════════════════════════════
const uploadDocument = asyncHandler(async (req, res) => {
    const { advanceId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const { documentType, documentName, documentNameAr, fileUrl, notes } = req.body;

    const advance = await EmployeeAdvance.findById(advanceId);

    if (!advance) {
        throw CustomException('Advance not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? advance.firmId?.toString() === firmId.toString()
        : advance.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    if (!documentType || !fileUrl) {
        throw CustomException('Document type and file URL are required', 400);
    }

    const document = {
        documentType,
        documentName: documentName || documentType,
        documentNameAr,
        fileUrl,
        uploadedOn: new Date(),
        uploadedBy: lawyerId,
        verified: false,
        notes
    };

    advance.documents.push(document);
    advance.lastModifiedBy = lawyerId;
    await advance.save();

    return res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: document
    });
});

// ═══════════════════════════════════════════════════════════════
// ADD COMMUNICATION
// POST /api/hr/advances/:advanceId/communications
// ═══════════════════════════════════════════════════════════════
const addCommunication = asyncHandler(async (req, res) => {
    const { advanceId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const { communicationType, purpose, subject, message, sentTo, attachments } = req.body;

    const advance = await EmployeeAdvance.findById(advanceId);

    if (!advance) {
        throw CustomException('Advance not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? advance.firmId?.toString() === firmId.toString()
        : advance.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    const communication = {
        communicationId: `COM-${Date.now()}`,
        communicationType,
        date: new Date(),
        purpose,
        subject,
        message,
        sentTo,
        sentBy: lawyerId,
        attachments,
        responseReceived: false
    };

    advance.communications.push(communication);
    advance.lastModifiedBy = lawyerId;
    await advance.save();

    return res.status(201).json({
        success: true,
        message: 'Communication added successfully',
        data: communication
    });
});

module.exports = {
    getAdvances,
    getAdvanceStats,
    getAdvance,
    checkEligibility,
    createAdvance,
    updateAdvance,
    deleteAdvance,
    approveAdvance,
    rejectAdvance,
    disburseAdvance,
    recordRecovery,
    processPayrollDeduction,
    processEarlyRecovery,
    cancelAdvance,
    writeOffAdvance,
    issueClearanceLetter,
    bulkDelete,
    getByEmployee,
    getPendingApprovals,
    getOverdueRecoveries,
    getEmergencyAdvances,
    uploadDocument,
    addCommunication
};
