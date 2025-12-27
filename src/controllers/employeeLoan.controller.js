const { EmployeeLoan, Employee } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const mongoose = require('mongoose');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// ═══════════════════════════════════════════════════════════════
// LOAN POLICIES (Configurable)
// ═══════════════════════════════════════════════════════════════
const LOAN_POLICIES = {
    minServiceDays: 180, // Minimum 6 months
    creditLimitMultiplier: 3, // 3x monthly salary
    maxInstallmentPercentage: 30, // 30% of salary
    maxOverdueDays: 90, // Days before default
    interestRate: 0, // Interest-free (Islamic compliant)
    earlySettlementPenalty: 0, // No penalty
    loanTypes: {
        personal: { maxAmount: 50000, maxInstallments: 24 },
        housing: { maxAmount: 200000, maxInstallments: 60 },
        vehicle: { maxAmount: 100000, maxInstallments: 48 },
        education: { maxAmount: 30000, maxInstallments: 24 },
        emergency: { maxAmount: 10000, maxInstallments: 6 },
        marriage: { maxAmount: 30000, maxInstallments: 24 },
        medical: { maxAmount: 20000, maxInstallments: 12 },
        hajj: { maxAmount: 15000, maxInstallments: 12 },
        furniture: { maxAmount: 20000, maxInstallments: 18 },
        computer: { maxAmount: 10000, maxInstallments: 12 },
        travel: { maxAmount: 10000, maxInstallments: 6 },
        debt_consolidation: { maxAmount: 50000, maxInstallments: 24 },
        other: { maxAmount: 20000, maxInstallments: 12 }
    }
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// Validate loan amount and interest rate
function validateLoanAmountAndInterest(loanType, loanAmount, interestRate) {
    // Validate loan amount is positive
    if (!loanAmount || loanAmount <= 0) {
        throw CustomException('Loan amount must be greater than zero', 400);
    }

    // Check if loan type exists
    const loanPolicy = LOAN_POLICIES.loanTypes[loanType];
    if (!loanPolicy) {
        throw CustomException('Invalid loan type', 400);
    }

    // Validate against maximum amount for loan type
    if (loanAmount > loanPolicy.maxAmount) {
        throw CustomException(
            `Loan amount exceeds maximum allowed for ${loanType} (max: ${loanPolicy.maxAmount})`,
            400
        );
    }

    // Validate interest rate (should be 0 for Islamic compliant loans)
    if (interestRate !== undefined && interestRate !== 0) {
        throw CustomException('Interest rate must be 0 for Islamic compliant loans', 400);
    }

    // Validate installments
    return loanPolicy;
}

// Verify employee ownership
async function verifyEmployeeOwnership(employeeId, firmId, lawyerId) {
    const employee = await Employee.findById(sanitizeObjectId(employeeId));
    if (!employee) {
        throw CustomException('Employee not found', 404);
    }

    const hasAccess = firmId
        ? employee.firmId?.toString() === firmId.toString()
        : employee.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied to this employee', 403);
    }

    return employee;
}

// Verify loan ownership (IDOR protection)
async function verifyLoanOwnership(loanId, firmId, lawyerId) {
    // IDOR PROTECTION - Query includes firmId/lawyerId to ensure loan belongs to user
    const accessQuery = firmId
        ? { _id: sanitizeObjectId(loanId), firmId }
        : { _id: sanitizeObjectId(loanId), lawyerId };

    const loan = await EmployeeLoan.findOne(accessQuery);

    if (!loan) {
        throw CustomException('Loan not found', 404);
    }

    return loan;
}

// Generate installment schedule
function generateInstallmentSchedule(loanAmount, numInstallments, firstDate) {
    const installmentAmount = Math.ceil(loanAmount / numInstallments);
    const installments = [];
    let remainingBalance = loanAmount;

    for (let i = 1; i <= numInstallments; i++) {
        const dueDate = new Date(firstDate);
        dueDate.setMonth(dueDate.getMonth() + (i - 1));

        // Last installment adjusts for rounding
        const actualAmount = i === numInstallments
            ? remainingBalance
            : installmentAmount;

        remainingBalance -= actualAmount;

        installments.push({
            installmentNumber: i,
            dueDate,
            principalAmount: actualAmount,
            interestAmount: 0, // Interest-free
            installmentAmount: actualAmount,
            status: 'pending',
            paidAmount: 0,
            remainingBalance: Math.max(0, loanAmount - (installmentAmount * i))
        });
    }

    return {
        installments,
        lastInstallmentDate: installments[installments.length - 1].dueDate
    };
}

// Check loan eligibility
async function checkLoanEligibility(employeeId, requestedAmount, firmId, lawyerId) {
    const employee = await Employee.findById(employeeId);
    if (!employee) {
        throw CustomException('Employee not found', 404);
    }

    const query = firmId ? { firmId, employeeId } : { lawyerId, employeeId };
    const existingLoans = await EmployeeLoan.find({
        ...query,
        status: { $in: ['active', 'pending', 'approved'] }
    });

    const checks = [];
    const basicSalary = employee.compensation?.basicSalary || 0;
    const totalAllowances = employee.compensation?.allowances?.reduce((sum, a) => sum + (a.amount || 0), 0) || 0;
    const grossSalary = basicSalary + totalAllowances;

    // Check 1: Probation Period (minimum 180 days of service)
    const serviceStartDate = new Date(employee.employment?.hireDate);
    const daysSinceJoining = Math.floor((Date.now() - serviceStartDate) / (1000 * 60 * 60 * 24));
    checks.push({
        checkType: 'probation',
        checkName: 'Probation Period',
        checkNameAr: 'فترة التجربة',
        passed: daysSinceJoining >= LOAN_POLICIES.minServiceDays,
        requirement: `Minimum ${LOAN_POLICIES.minServiceDays} days (6 months) of service`,
        actualValue: `${daysSinceJoining} days`,
        notes: daysSinceJoining < LOAN_POLICIES.minServiceDays ? 'Employee still in probation period' : null
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

    // Check 3: Credit Limit (3x monthly salary)
    const creditLimit = grossSalary * LOAN_POLICIES.creditLimitMultiplier;
    const totalOutstanding = existingLoans.reduce(
        (sum, loan) => sum + (loan.balance?.remainingBalance || 0), 0
    );
    const availableCredit = Math.max(0, creditLimit - totalOutstanding);

    checks.push({
        checkType: 'credit_limit',
        checkName: 'Credit Limit',
        checkNameAr: 'الحد الائتماني',
        passed: requestedAmount <= availableCredit,
        requirement: `Maximum ${creditLimit.toLocaleString()} SAR (3x salary)`,
        actualValue: `Available: ${availableCredit.toLocaleString()} SAR`
    });

    // Check 4: Maximum Installment (30% of salary)
    const maxMonthlyInstallment = grossSalary * (LOAN_POLICIES.maxInstallmentPercentage / 100);
    const currentDeductions = existingLoans.reduce(
        (sum, loan) => sum + (loan.repayment?.installmentAmount || 0), 0
    );
    const availableInstallment = Math.max(0, maxMonthlyInstallment - currentDeductions);

    checks.push({
        checkType: 'salary_ratio',
        checkName: 'Monthly Installment Capacity',
        checkNameAr: 'القدرة على السداد الشهري',
        passed: availableInstallment > 0,
        requirement: `Max ${LOAN_POLICIES.maxInstallmentPercentage}% of salary (${maxMonthlyInstallment.toLocaleString()} SAR)`,
        actualValue: `Available: ${availableInstallment.toLocaleString()} SAR`
    });

    // Check 5: No Overdue Payments
    const hasOverdue = existingLoans.some(loan =>
        loan.installments?.some(i => i.status === 'missed' || i.lateDays > 30)
    );
    checks.push({
        checkType: 'overdue',
        checkName: 'Payment History',
        checkNameAr: 'سجل المدفوعات',
        passed: !hasOverdue,
        requirement: 'No overdue payments (>30 days)',
        actualValue: hasOverdue ? 'Has overdue payments' : 'Good standing'
    });

    // Check 6: Maximum active loans
    const activeLoansCount = existingLoans.filter(l => l.status === 'active').length;
    checks.push({
        checkType: 'maximum_loans',
        checkName: 'Active Loans Count',
        checkNameAr: 'عدد القروض النشطة',
        passed: activeLoansCount < 2,
        requirement: 'Maximum 2 active loans',
        actualValue: `${activeLoansCount} active loan(s)`
    });

    const eligible = checks.every(c => c.passed);
    const ineligibilityReasons = checks
        .filter(c => !c.passed)
        .map(c => c.checkNameAr || c.checkName);

    return {
        eligible,
        eligibilityChecks: checks,
        ineligibilityReasons,
        creditLimit: {
            employeeCreditLimit: creditLimit,
            availableCredit,
            requestedAmount,
            withinLimit: requestedAmount <= availableCredit
        },
        salaryDeductionRatio: {
            netSalary: grossSalary,
            existingDeductions: currentDeductions,
            proposedInstallment: 0, // Will be calculated
            totalDeductions: currentDeductions,
            deductionPercentage: Math.round((currentDeductions / grossSalary) * 100),
            maximumAllowed: LOAN_POLICIES.maxInstallmentPercentage,
            withinLimit: true
        },
        employeeInfo: {
            basicSalary,
            grossSalary,
            daysSinceJoining,
            activeLoansCount,
            totalOutstanding
        }
    };
}

// ═══════════════════════════════════════════════════════════════
// GET ALL LOANS
// GET /api/hr/employee-loans
// ═══════════════════════════════════════════════════════════════
const getLoans = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const {
        status,
        loanType,
        employeeId,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 10
    } = req.query;

    // Build query
    const isSoloLawyer = req.isSoloLawyer;
    const query = {};
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    if (status) query.status = status;
    if (loanType) query.loanType = loanType;
    if (employeeId) query.employeeId = employeeId;

    if (search) {
        query.$or = [
            { employeeName: { $regex: search, $options: 'i' } },
            { employeeNameAr: { $regex: search, $options: 'i' } },
            { loanId: { $regex: search, $options: 'i' } },
            { loanNumber: { $regex: search, $options: 'i' } }
        ];
    }

    // Build sort
    const sortField = sortBy === 'loanAmount' ? 'loanAmount' :
        sortBy === 'applicationDate' ? 'applicationDate' :
            sortBy === 'status' ? 'status' :
                sortBy === 'employeeName' ? 'employeeName' : 'createdAt';
    const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    const [loans, total] = await Promise.all([
        EmployeeLoan.find(query)
            .populate('employeeId', 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish compensation.basicSalary employment.departmentName')
            .populate('createdBy', 'firstName lastName')
            .sort(sort)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .lean(),
        EmployeeLoan.countDocuments(query)
    ]);

    return res.json({
        success: true,
        data: loans,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET LOAN STATS
// GET /api/hr/employee-loans/stats
// ═══════════════════════════════════════════════════════════════
const getLoanStats = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const stats = await EmployeeLoan.getStats(firmId, lawyerId);

    return res.json({
        success: true,
        ...stats
    });
});

// ═══════════════════════════════════════════════════════════════
// GET SINGLE LOAN
// GET /api/hr/employee-loans/:loanId
// ═══════════════════════════════════════════════════════════════
const getLoan = asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // IDOR Protection: Verify loan ownership
    await verifyLoanOwnership(loanId, firmId, lawyerId);

    const loan = await EmployeeLoan.findById(loanId)
        .populate('employeeId', 'employeeId personalInfo employment compensation gosi')
        .populate('createdBy', 'firstName lastName')
        .populate('lastModifiedBy', 'firstName lastName')
        .populate('approvalWorkflow.workflowSteps.approverId', 'firstName lastName')
        .populate('disbursement.cash.disbursedBy', 'firstName lastName')
        .populate('disbursement.confirmedBy', 'firstName lastName');

    return res.json({
        success: true,
        data: loan
    });
});

// ═══════════════════════════════════════════════════════════════
// CHECK ELIGIBILITY
// POST /api/hr/employee-loans/check-eligibility
// ═══════════════════════════════════════════════════════════════
const checkEligibility = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'employeeId', 'requestedAmount'
    ]);

    const { employeeId, requestedAmount } = allowedFields;

    if (!employeeId) {
        throw CustomException('Employee ID is required', 400);
    }

    // IDOR Protection: Verify employee ownership
    await verifyEmployeeOwnership(employeeId, firmId, lawyerId);

    const eligibility = await checkLoanEligibility(employeeId, requestedAmount || 0, firmId, lawyerId);

    return res.json({
        success: true,
        ...eligibility
    });
});

// ═══════════════════════════════════════════════════════════════
// CREATE LOAN
// POST /api/hr/employee-loans
// ═══════════════════════════════════════════════════════════════
const createLoan = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection - only allow specific fields
    const allowedFields = pickAllowedFields(req.body, [
        'employeeId',
        'loanType',
        'loanAmount',
        'installments',
        'firstInstallmentDate',
        'purpose',
        'purposeAr',
        'urgency',
        'notes',
        'skipEligibilityCheck'
    ]);

    const {
        employeeId,
        loanType,
        loanAmount,
        installments,
        firstInstallmentDate,
        purpose,
        purposeAr,
        urgency,
        notes,
        skipEligibilityCheck
    } = allowedFields;

    // Validate required fields
    if (!employeeId || !loanType || !loanAmount || !installments || !firstInstallmentDate) {
        throw CustomException('Missing required fields', 400);
    }

    // Validate loan amount and interest rate
    const loanPolicy = validateLoanAmountAndInterest(loanType, loanAmount, 0);

    // Validate installments
    if (installments <= 0 || installments > loanPolicy.maxInstallments) {
        throw CustomException(
            `Installments must be between 1 and ${loanPolicy.maxInstallments} for ${loanType}`,
            400
        );
    }

    // IDOR Protection: Verify employee ownership
    const employee = await verifyEmployeeOwnership(employeeId, firmId, lawyerId);

    // Check eligibility (unless skipped for admin)
    let eligibility = { eligible: true, eligibilityChecks: [], ineligibilityReasons: [] };
    if (!skipEligibilityCheck) {
        eligibility = await checkLoanEligibility(employeeId, loanAmount, firmId, lawyerId);
        if (!eligibility.eligible) {
            throw CustomException(`Employee is not eligible for this loan: ${eligibility.ineligibilityReasons.join(', ')}`, 400);
        }
    }

    // Calculate installment amount
    const installmentAmount = Math.ceil(loanAmount / installments);

    // Generate installment schedule
    const schedule = generateInstallmentSchedule(
        loanAmount,
        installments,
        new Date(firstInstallmentDate)
    );

    // Prepare loan data
    const loanData = {
        employeeId,
        employeeNumber: employee.employeeId,
        employeeName: employee.personalInfo?.fullNameEnglish || employee.personalInfo?.fullNameArabic,
        employeeNameAr: employee.personalInfo?.fullNameArabic,
        nationalId: employee.personalInfo?.nationalId,
        department: employee.organization?.departmentName || employee.employment?.departmentName,
        jobTitle: employee.employment?.jobTitle || employee.employment?.jobTitleArabic,

        loanType,
        loanAmount,
        approvedAmount: loanAmount,
        currency: 'SAR',

        purpose,
        purposeAr,
        urgency: urgency || 'medium',

        repayment: {
            installments,
            installmentAmount,
            installmentFrequency: 'monthly',
            firstInstallmentDate: new Date(firstInstallmentDate),
            lastInstallmentDate: schedule.lastInstallmentDate,
            deductionMethod: 'payroll_deduction'
        },

        balance: {
            originalAmount: loanAmount,
            paidAmount: 0,
            remainingBalance: loanAmount,
            completionPercentage: 0
        },

        status: 'pending',
        applicationStatus: 'submitted',
        applicationDate: new Date(),

        eligibility: {
            eligible: eligibility.eligible,
            eligibilityChecks: eligibility.eligibilityChecks,
            ineligibilityReasons: eligibility.ineligibilityReasons,
            creditLimit: eligibility.creditLimit,
            salaryDeductionRatio: eligibility.salaryDeductionRatio
        },

        loanTerms: {
            principalAmount: loanAmount,
            interestRate: 0,
            interestType: 'none',
            islamicFinance: {
                shariaCompliant: true,
                financingType: 'qard_hassan',
                profitRate: 0
            },
            totalAmountPayable: loanAmount,
            earlyRepayment: {
                allowed: true,
                penaltyApplicable: false
            },
            latePayment: {
                gracePeriodDays: 5,
                lateFeeApplicable: false
            }
        },

        installments: schedule.installments,

        approvalWorkflow: {
            required: true,
            workflowSteps: [{
                stepNumber: 1,
                stepName: 'HR Approval',
                stepNameAr: 'موافقة الموارد البشرية',
                approverRole: 'hr',
                status: 'pending'
            }],
            currentStep: 1,
            totalSteps: 1,
            finalStatus: 'pending'
        },

        notes: notes || {},

        firmId: firmId || null,
        lawyerId: firmId ? null : lawyerId,
        createdBy: lawyerId
    };

    const loan = await EmployeeLoan.create(loanData);

    // Populate and return
    await loan.populate([
        { path: 'employeeId', select: 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish' },
        { path: 'createdBy', select: 'firstName lastName' }
    ]);

    return res.status(201).json({
        success: true,
        message: 'Loan application created successfully',
        data: loan
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE LOAN
// PATCH /api/hr/employee-loans/:loanId
// ═══════════════════════════════════════════════════════════════
const updateLoan = asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // IDOR Protection: Verify loan ownership
    const loan = await verifyLoanOwnership(loanId, firmId, lawyerId);

    // Prevent updates if active, completed, or cancelled
    if (['active', 'completed', 'cancelled', 'defaulted'].includes(loan.status)) {
        throw CustomException('Cannot update loan in current status', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = pickAllowedFields(req.body, [
        'loanType', 'loanAmount', 'purpose', 'purposeAr', 'urgency',
        'repayment', 'notes', 'documents', 'guarantee'
    ]);

    // Validate loan amount if being changed
    if (allowedFields.loanAmount) {
        validateLoanAmountAndInterest(
            allowedFields.loanType || loan.loanType,
            allowedFields.loanAmount,
            0
        );
    }

    // Apply updates
    Object.keys(allowedFields).forEach(field => {
        if (allowedFields[field] !== undefined) {
            if (typeof allowedFields[field] === 'object' && !Array.isArray(allowedFields[field])) {
                loan[field] = { ...loan[field]?.toObject?.() || loan[field] || {}, ...allowedFields[field] };
            } else {
                loan[field] = allowedFields[field];
            }
        }
    });

    // Recalculate if loan amount changed
    if (allowedFields.loanAmount) {
        loan.balance.originalAmount = allowedFields.loanAmount;
        loan.balance.remainingBalance = allowedFields.loanAmount - loan.balance.paidAmount;
        loan.loanTerms.principalAmount = allowedFields.loanAmount;
        loan.loanTerms.totalAmountPayable = allowedFields.loanAmount;
    }

    loan.lastModifiedBy = lawyerId;
    await loan.save();

    return res.json({
        success: true,
        message: 'Loan updated successfully',
        data: loan
    });
});

// ═══════════════════════════════════════════════════════════════
// DELETE LOAN
// DELETE /api/hr/employee-loans/:loanId
// ═══════════════════════════════════════════════════════════════
const deleteLoan = asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // IDOR Protection: Verify loan ownership
    const loan = await verifyLoanOwnership(loanId, firmId, lawyerId);

    // Only allow deletion if pending or draft
    if (!['pending', 'rejected'].includes(loan.status)) {
        throw CustomException('Only pending or rejected loans can be deleted', 400);
    }

    await EmployeeLoan.findByIdAndDelete(loanId);

    return res.json({
        success: true,
        message: 'Loan deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// SUBMIT LOAN APPLICATION
// POST /api/hr/employee-loans/:loanId/submit
// ═══════════════════════════════════════════════════════════════
const submitLoan = asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // IDOR Protection: Verify loan ownership
    const loan = await verifyLoanOwnership(loanId, firmId, lawyerId);

    if (loan.applicationStatus !== 'draft') {
        throw CustomException('Only draft applications can be submitted', 400);
    }

    loan.applicationStatus = 'submitted';
    loan.applicationDate = new Date();
    loan.lastModifiedBy = lawyerId;
    await loan.save();

    return res.json({
        success: true,
        message: 'Loan application submitted successfully',
        data: loan
    });
});

// ═══════════════════════════════════════════════════════════════
// APPROVE LOAN
// POST /api/hr/employee-loans/:loanId/approve
// ═══════════════════════════════════════════════════════════════
const approveLoan = asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'approvedAmount', 'approvedInstallments', 'comments', 'conditions'
    ]);

    const { approvedAmount, approvedInstallments, comments, conditions } = allowedFields;

    // IDOR Protection: Verify loan ownership
    const loan = await verifyLoanOwnership(loanId, firmId, lawyerId);

    if (loan.status !== 'pending') {
        throw CustomException('Only pending loans can be approved', 400);
    }

    // Validate approved amount if provided
    if (approvedAmount) {
        validateLoanAmountAndInterest(loan.loanType, approvedAmount, 0);
    }

    // Update approval workflow
    const currentStep = loan.approvalWorkflow.workflowSteps.find(
        s => s.stepNumber === loan.approvalWorkflow.currentStep
    );

    if (currentStep) {
        currentStep.status = 'approved';
        currentStep.decision = 'approve';
        currentStep.actionDate = new Date();
        currentStep.approverId = lawyerId;
        currentStep.comments = comments;
        currentStep.conditions = conditions || [];
        if (approvedAmount) currentStep.approvedAmount = approvedAmount;
        if (approvedInstallments) currentStep.approvedInstallments = approvedInstallments;
    }

    // Update loan
    loan.status = 'approved';
    loan.applicationStatus = 'approved';
    loan.approvalDate = new Date();
    loan.approvedAmount = approvedAmount || loan.loanAmount;
    loan.approvalWorkflow.finalStatus = 'approved';
    loan.approvalWorkflow.finalApprover = lawyerId.toString();
    loan.approvalWorkflow.finalApprovalDate = new Date();

    // Recalculate if approved amount differs
    if (approvedAmount && approvedAmount !== loan.loanAmount) {
        loan.balance.originalAmount = approvedAmount;
        loan.balance.remainingBalance = approvedAmount;
        loan.loanTerms.principalAmount = approvedAmount;
        loan.loanTerms.totalAmountPayable = approvedAmount;

        const numInstallments = approvedInstallments || loan.repayment.installments;
        const installmentAmount = Math.ceil(approvedAmount / numInstallments);
        loan.repayment.installmentAmount = installmentAmount;

        // Regenerate schedule
        const schedule = generateInstallmentSchedule(
            approvedAmount,
            numInstallments,
            loan.repayment.firstInstallmentDate
        );
        loan.installments = schedule.installments;
        loan.repayment.lastInstallmentDate = schedule.lastInstallmentDate;
    }

    loan.lastModifiedBy = lawyerId;
    await loan.save();

    return res.json({
        success: true,
        message: 'Loan approved successfully',
        data: loan
    });
});

// ═══════════════════════════════════════════════════════════════
// REJECT LOAN
// POST /api/hr/employee-loans/:loanId/reject
// ═══════════════════════════════════════════════════════════════
const rejectLoan = asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'rejectionReason', 'comments'
    ]);

    const { rejectionReason, comments } = allowedFields;

    // IDOR Protection: Verify loan ownership
    const loan = await verifyLoanOwnership(loanId, firmId, lawyerId);

    if (loan.status !== 'pending') {
        throw CustomException('Only pending loans can be rejected', 400);
    }

    // Update approval workflow
    const currentStep = loan.approvalWorkflow.workflowSteps.find(
        s => s.stepNumber === loan.approvalWorkflow.currentStep
    );

    if (currentStep) {
        currentStep.status = 'rejected';
        currentStep.decision = 'reject';
        currentStep.actionDate = new Date();
        currentStep.approverId = lawyerId;
        currentStep.comments = comments || rejectionReason;
    }

    // Update loan
    loan.status = 'rejected';
    loan.applicationStatus = 'rejected';
    loan.approvalWorkflow.finalStatus = 'rejected';
    loan.approvalWorkflow.rejectionReason = rejectionReason;
    loan.lastModifiedBy = lawyerId;
    await loan.save();

    return res.json({
        success: true,
        message: 'Loan rejected',
        data: loan
    });
});

// ═══════════════════════════════════════════════════════════════
// DISBURSE LOAN
// POST /api/hr/employee-loans/:loanId/disburse
// ═══════════════════════════════════════════════════════════════
const disburseLoan = asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'disbursementMethod',
        'bankDetails',
        'checkDetails',
        'cashDetails',
        'transferReference',
        'deductions'
    ]);

    const {
        disbursementMethod,
        bankDetails,
        checkDetails,
        cashDetails,
        transferReference,
        deductions
    } = allowedFields;

    // Validate disbursement method
    const validMethods = ['bank_transfer', 'check', 'cash'];
    if (!disbursementMethod || !validMethods.includes(disbursementMethod)) {
        throw CustomException('Invalid disbursement method', 400);
    }

    // Use MongoDB transaction for disbursement
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // IDOR Protection: Verify loan ownership
        const loan = await verifyLoanOwnership(loanId, firmId, lawyerId);

        if (loan.status !== 'approved') {
            throw CustomException('Loan must be approved before disbursement', 400);
        }

        // Validate deductions
        let totalDeductions = 0;
        if (deductions && Array.isArray(deductions)) {
            deductions.forEach(d => {
                if (d.deductionAmount && d.deductionAmount < 0) {
                    throw CustomException('Deduction amount cannot be negative', 400);
                }
                totalDeductions += d.deductionAmount || 0;
            });
        }

        const netDisbursedAmount = (loan.approvedAmount || loan.loanAmount) - totalDeductions;
        if (netDisbursedAmount <= 0) {
            throw CustomException('Net disbursed amount must be greater than zero', 400);
        }

        const disbursementDeductions = [];
        if (deductions && Array.isArray(deductions)) {
            deductions.forEach(d => {
                disbursementDeductions.push(d);
            });
        }

        // Update disbursement details
        loan.disbursement = {
            disbursementMethod,
            disbursed: true,
            disbursementDate: new Date(),
            actualDisbursedAmount: loan.approvedAmount || loan.loanAmount,
            disbursementDeductions,
            netDisbursedAmount,
            confirmationRequired: true,
            confirmed: false
        };

        if (disbursementMethod === 'bank_transfer' && bankDetails) {
            loan.disbursement.bankTransfer = {
                bankName: bankDetails.bankName,
                accountNumber: bankDetails.accountNumber,
                iban: bankDetails.iban,
                transferDate: new Date(),
                transferReference: transferReference || `TRF-${Date.now()}`,
                transferStatus: 'completed'
            };
        }

        if (disbursementMethod === 'check' && checkDetails) {
            loan.disbursement.check = {
                checkNumber: checkDetails.checkNumber,
                checkDate: new Date(checkDetails.checkDate),
                issued: true,
                issuedDate: new Date()
            };
        }

        if (disbursementMethod === 'cash' && cashDetails) {
            loan.disbursement.cash = {
                disbursedOn: new Date(),
                disbursedBy: lawyerId,
                receiptNumber: cashDetails.receiptNumber || `RCP-${Date.now()}`
            };
        }

        // Update loan status
        loan.status = 'active';
        loan.disbursementDate = new Date();

        // Set up payroll deduction
        loan.payrollIntegration = {
            payrollDeduction: {
                active: true,
                deductionCode: `LOAN-${loan.loanNumber}`,
                deductionAmount: loan.repayment.installmentAmount,
                deductionStartDate: loan.repayment.firstInstallmentDate,
                deductionEndDate: loan.repayment.lastInstallmentDate,
                deductionFrequency: 'monthly',
                automaticDeduction: true
            },
            payrollDeductions: [],
            failedDeductions: []
        };

        loan.lastModifiedBy = lawyerId;
        await loan.save({ session });

        // Commit transaction
        await session.commitTransaction();
        session.endSession();

        return res.json({
            success: true,
            message: 'Loan disbursed successfully',
            data: loan
        });
    } catch (error) {
        // Rollback transaction on error
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
});

// ═══════════════════════════════════════════════════════════════
// RECORD PAYMENT
// POST /api/hr/employee-loans/:loanId/payments
// ═══════════════════════════════════════════════════════════════
const recordPayment = asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'amount',
        'paymentMethod',
        'paymentDate',
        'paymentReference',
        'notes'
    ]);

    const {
        amount,
        paymentMethod,
        paymentDate,
        paymentReference,
        notes
    } = allowedFields;

    // Validate payment amount
    if (!amount || amount <= 0) {
        throw CustomException('Payment amount must be greater than zero', 400);
    }

    // Use MongoDB transaction for payment
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // IDOR Protection: Verify loan ownership
        const loan = await verifyLoanOwnership(loanId, firmId, lawyerId);

        if (loan.status !== 'active') {
            throw CustomException('Can only record payments for active loans', 400);
        }

        // Validate payment amount doesn't exceed remaining balance
        if (amount > loan.balance.remainingBalance) {
            throw CustomException(
                `Payment amount (${amount}) exceeds remaining balance (${loan.balance.remainingBalance})`,
                400
            );
        }

        // Apply payment to pending installments
        let remainingPayment = amount;
        const paymentsApplied = [];
        const actualPaymentDate = paymentDate ? new Date(paymentDate) : new Date();

        const pendingInstallments = loan.installments
            .filter(i => i.status !== 'paid' && i.status !== 'waived')
            .sort((a, b) => a.installmentNumber - b.installmentNumber);

        for (const installment of pendingInstallments) {
            if (remainingPayment <= 0) break;

            const amountDue = installment.installmentAmount - (installment.paidAmount || 0);
            const paymentApplied = Math.min(remainingPayment, amountDue);

            installment.paidAmount = (installment.paidAmount || 0) + paymentApplied;
            installment.status = installment.paidAmount >= installment.installmentAmount
                ? 'paid'
                : 'partial';

            if (installment.status === 'paid') {
                installment.paidDate = actualPaymentDate;
                installment.paymentMethod = paymentMethod;
                installment.paymentReference = paymentReference;

                // Check if late
                const daysLate = Math.floor(
                    (actualPaymentDate - new Date(installment.dueDate)) / (1000 * 60 * 60 * 24)
                );
                if (daysLate > 0) {
                    installment.lateDays = daysLate;
                    loan.paymentPerformance.latePayments += 1;
                } else {
                    loan.paymentPerformance.onTimePayments += 1;
                }
            }

            remainingPayment -= paymentApplied;
            paymentsApplied.push({
                installmentNumber: installment.installmentNumber,
                amountApplied: paymentApplied
            });
        }

        // Update balance
        loan.balance.paidAmount += amount;
        loan.balance.remainingBalance = loan.balance.originalAmount - loan.balance.paidAmount;
        loan.balance.completionPercentage = Math.round(
            (loan.balance.paidAmount / loan.balance.originalAmount) * 100
        );

        // Add to payment history
        loan.paymentHistory.push({
            paymentId: `PAY-${Date.now()}`,
            paymentDate: actualPaymentDate,
            principalPaid: amount,
            totalPaid: amount,
            paymentMethod,
            paymentReference,
            processedBy: lawyerId,
            remainingBalance: loan.balance.remainingBalance,
            receiptNumber: `RCP-${Date.now()}`,
            notes
        });

        // Update payment performance
        const totalPayments = loan.paymentPerformance.onTimePayments +
            loan.paymentPerformance.latePayments;
        if (totalPayments > 0) {
            loan.paymentPerformance.onTimePercentage = Math.round(
                (loan.paymentPerformance.onTimePayments / totalPayments) * 100
            );
        }

        // Calculate rating
        const percentage = loan.paymentPerformance.onTimePercentage;
        if (percentage >= 95) {
            loan.paymentPerformance.paymentRating = 'excellent';
        } else if (percentage >= 80) {
            loan.paymentPerformance.paymentRating = 'good';
        } else if (percentage >= 60) {
            loan.paymentPerformance.paymentRating = 'fair';
        } else {
            loan.paymentPerformance.paymentRating = 'poor';
        }

        // Update analytics
        loan.analytics.totalAmountRepaid = loan.balance.paidAmount;

        // Check if loan is completed
        if (loan.balance.remainingBalance <= 0) {
            loan.status = 'completed';
            loan.completion = {
                loanCompleted: true,
                completionDate: new Date(),
                completionMethod: 'full_repayment',
                finalPayment: {
                    paymentDate: actualPaymentDate,
                    paymentAmount: amount,
                    paymentReference
                }
            };
        }

        loan.lastModifiedBy = lawyerId;
        await loan.save({ session });

        // Commit transaction
        await session.commitTransaction();
        session.endSession();

        return res.json({
            success: true,
            message: 'Payment recorded successfully',
            data: {
                loan,
                paymentsApplied,
                remainingBalance: loan.balance.remainingBalance
            }
        });
    } catch (error) {
        // Rollback transaction on error
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
});

// ═══════════════════════════════════════════════════════════════
// PROCESS PAYROLL DEDUCTION
// POST /api/hr/employee-loans/:loanId/payroll-deduction
// ═══════════════════════════════════════════════════════════════
const processPayrollDeduction = asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'payrollRunId', 'payrollMonth', 'payrollYear', 'deductedAmount'
    ]);

    const { payrollRunId, payrollMonth, payrollYear, deductedAmount } = allowedFields;

    // Validate deducted amount
    if (!deductedAmount || deductedAmount <= 0) {
        throw CustomException('Deducted amount must be greater than zero', 400);
    }

    // IDOR Protection: Verify loan ownership
    const loan = await verifyLoanOwnership(loanId, firmId, lawyerId);

    if (loan.status !== 'active') {
        throw CustomException('Can only process deductions for active loans', 400);
    }

    // Record the payroll deduction
    loan.payrollIntegration.payrollDeductions.push({
        payrollRunId,
        payrollMonth,
        payrollYear,
        deductionDate: new Date(),
        installmentNumber: loan.paymentHistory.length + 1,
        deductedAmount,
        remainingBalance: loan.balance.remainingBalance - deductedAmount,
        processedBy: lawyerId
    });

    // Record as payment
    await recordPayment({
        params: { loanId },
        body: {
            amount: deductedAmount,
            paymentMethod: 'payroll_deduction',
            paymentDate: new Date(),
            paymentReference: `PAYROLL-${payrollRunId}`
        },
        userID: lawyerId,
        firmId
    }, { json: () => {} });

    loan.lastModifiedBy = lawyerId;
    await loan.save();

    return res.json({
        success: true,
        message: 'Payroll deduction processed successfully',
        data: loan
    });
});

// ═══════════════════════════════════════════════════════════════
// CALCULATE EARLY SETTLEMENT
// GET /api/hr/employee-loans/:loanId/early-settlement-calculation
// ═══════════════════════════════════════════════════════════════
const calculateEarlySettlement = asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // IDOR Protection: Verify loan ownership
    const loan = await verifyLoanOwnership(loanId, firmId, lawyerId);

    if (loan.status !== 'active') {
        throw CustomException('Only active loans can be settled early', 400);
    }

    const calculation = {
        remainingPrincipal: loan.balance.remainingBalance,
        remainingInterest: 0, // Interest-free
        interestWaiver: 0,
        earlySettlementPenalty: 0, // No penalty
        totalSettlementAmount: loan.balance.remainingBalance,
        savings: 0 // No interest = no savings
    };

    return res.json({
        success: true,
        data: calculation
    });
});

// ═══════════════════════════════════════════════════════════════
// PROCESS EARLY SETTLEMENT
// POST /api/hr/employee-loans/:loanId/early-settlement
// ═══════════════════════════════════════════════════════════════
const processEarlySettlement = asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'settlementAmount', 'paymentMethod', 'paymentReference'
    ]);

    const { settlementAmount, paymentMethod, paymentReference } = allowedFields;

    // Validate settlement amount
    if (!settlementAmount || settlementAmount <= 0) {
        throw CustomException('Settlement amount must be greater than zero', 400);
    }

    // IDOR Protection: Verify loan ownership
    const loan = await verifyLoanOwnership(loanId, firmId, lawyerId);

    if (loan.status !== 'active') {
        throw CustomException('Only active loans can be settled early', 400);
    }

    if (settlementAmount < loan.balance.remainingBalance) {
        throw CustomException('Settlement amount must cover remaining balance', 400);
    }

    // Mark all pending installments as paid
    loan.installments.forEach(installment => {
        if (installment.status !== 'paid' && installment.status !== 'waived') {
            installment.status = 'paid';
            installment.paidDate = new Date();
            installment.paymentMethod = paymentMethod;
            installment.paidAmount = installment.installmentAmount;
        }
    });

    // Update balance
    loan.balance.paidAmount = loan.balance.originalAmount;
    loan.balance.remainingBalance = 0;
    loan.balance.completionPercentage = 100;

    // Add to payment history
    loan.paymentHistory.push({
        paymentId: `PAY-SETTLE-${Date.now()}`,
        paymentDate: new Date(),
        principalPaid: settlementAmount,
        totalPaid: settlementAmount,
        paymentMethod,
        paymentReference,
        remainingBalance: 0,
        receiptNumber: `RCP-SETTLE-${Date.now()}`,
        notes: 'Early settlement'
    });

    // Update early settlement
    loan.earlySettlement = {
        requested: true,
        requestDate: new Date(),
        calculation: {
            remainingPrincipal: loan.balance.remainingBalance,
            totalSettlementAmount: settlementAmount,
            savings: 0
        },
        approved: true,
        approvedBy: lawyerId,
        approvalDate: new Date(),
        settlement: {
            settlementDate: new Date(),
            paymentMethod,
            paymentReference,
            settled: true,
            settlementCompletionDate: new Date()
        }
    };

    // Complete loan
    loan.status = 'completed';
    loan.completion = {
        loanCompleted: true,
        completionDate: new Date(),
        completionMethod: 'early_settlement',
        finalPayment: {
            paymentDate: new Date(),
            paymentAmount: settlementAmount,
            paymentReference
        }
    };

    // Update analytics
    loan.analytics.totalAmountRepaid = loan.balance.paidAmount;
    loan.analytics.actualRepaymentPeriod = Math.floor(
        (new Date() - new Date(loan.disbursementDate)) / (1000 * 60 * 60 * 24)
    );

    // Deactivate payroll deduction
    if (loan.payrollIntegration?.payrollDeduction) {
        loan.payrollIntegration.payrollDeduction.active = false;
        loan.payrollIntegration.payrollDeduction.deductionEndDate = new Date();
    }

    loan.lastModifiedBy = lawyerId;
    await loan.save();

    return res.json({
        success: true,
        message: 'Early settlement processed successfully',
        data: loan
    });
});

// ═══════════════════════════════════════════════════════════════
// MARK AS DEFAULTED
// POST /api/hr/employee-loans/:loanId/default
// ═══════════════════════════════════════════════════════════════
const markAsDefaulted = asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'defaultReason', 'notes'
    ]);

    const { defaultReason, notes } = allowedFields;

    // IDOR Protection: Verify loan ownership
    const loan = await verifyLoanOwnership(loanId, firmId, lawyerId);

    if (loan.status !== 'active') {
        throw CustomException('Only active loans can be marked as defaulted', 400);
    }

    loan.status = 'defaulted';
    loan.default = {
        inDefault: true,
        defaultDate: new Date(),
        defaultReason: defaultReason || 'non_payment',
        outstandingAmount: loan.balance.remainingBalance,
        totalAmountDue: loan.balance.remainingBalance,
        recoveryActions: [],
        recovered: false
    };

    // Deactivate payroll deduction
    if (loan.payrollIntegration?.payrollDeduction) {
        loan.payrollIntegration.payrollDeduction.active = false;
    }

    if (notes) {
        loan.notes.internalNotes = `${loan.notes.internalNotes || ''}\n[DEFAULT] ${new Date().toISOString()}: ${notes}`;
    }

    loan.lastModifiedBy = lawyerId;
    await loan.save();

    return res.json({
        success: true,
        message: 'Loan marked as defaulted',
        data: loan
    });
});

// ═══════════════════════════════════════════════════════════════
// RESTRUCTURE LOAN
// POST /api/hr/employee-loans/:loanId/restructure
// ═══════════════════════════════════════════════════════════════
const restructureLoan = asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'restructureReason',
        'newInstallmentAmount',
        'newInstallments',
        'effectiveDate'
    ]);

    const {
        restructureReason,
        newInstallmentAmount,
        newInstallments,
        effectiveDate
    } = allowedFields;

    // Validate new installments
    if (newInstallments && newInstallments <= 0) {
        throw CustomException('New installments must be greater than zero', 400);
    }

    // IDOR Protection: Verify loan ownership
    const loan = await verifyLoanOwnership(loanId, firmId, lawyerId);

    if (!['active', 'defaulted'].includes(loan.status)) {
        throw CustomException('Only active or defaulted loans can be restructured', 400);
    }

    // Calculate remaining installments
    const paidInstallments = loan.installments.filter(i => i.status === 'paid').length;
    const remainingBalance = loan.balance.remainingBalance;

    // Create restructuring record
    const restructuring = {
        restructureId: `RST-${Date.now()}`,
        restructureDate: new Date(),
        restructureReason: restructureReason || 'mutual_agreement',
        requestedBy: 'employer',
        originalTerms: {
            remainingBalance,
            installmentAmount: loan.repayment.installmentAmount,
            remainingInstallments: loan.repayment.installments - paidInstallments,
            endDate: loan.repayment.lastInstallmentDate
        },
        newTerms: {
            newInstallmentAmount: newInstallmentAmount || Math.ceil(remainingBalance / newInstallments),
            newInstallments,
            newEndDate: null, // Will be calculated
            totalNewPayable: remainingBalance
        },
        approved: true,
        approvedBy: lawyerId,
        approvalDate: new Date(),
        effectiveDate: new Date(effectiveDate || Date.now())
    };

    // Calculate new end date
    const newEndDate = new Date(restructuring.effectiveDate);
    newEndDate.setMonth(newEndDate.getMonth() + newInstallments - 1);
    restructuring.newTerms.newEndDate = newEndDate;

    // Generate new installment schedule
    const newSchedule = generateInstallmentSchedule(
        remainingBalance,
        newInstallments,
        restructuring.effectiveDate
    );

    // Keep paid installments, replace pending ones
    const paidInstallmentsList = loan.installments.filter(i => i.status === 'paid');
    loan.installments = [
        ...paidInstallmentsList,
        ...newSchedule.installments.map((inst, idx) => ({
            ...inst,
            installmentNumber: paidInstallmentsList.length + idx + 1
        }))
    ];

    // Update repayment terms
    loan.repayment.installments = paidInstallmentsList.length + newInstallments;
    loan.repayment.installmentAmount = restructuring.newTerms.newInstallmentAmount;
    loan.repayment.lastInstallmentDate = newEndDate;

    // Add to restructuring history
    if (!loan.restructuring) {
        loan.restructuring = [];
    }
    loan.restructuring.push(restructuring);

    // Update payroll deduction
    if (loan.payrollIntegration?.payrollDeduction) {
        loan.payrollIntegration.payrollDeduction.deductionAmount = restructuring.newTerms.newInstallmentAmount;
        loan.payrollIntegration.payrollDeduction.deductionEndDate = newEndDate;
    }

    // If was defaulted, make active again
    if (loan.status === 'defaulted') {
        loan.status = 'active';
        loan.default.recovered = true;
        loan.default.recoveryDate = new Date();
    }

    loan.lastModifiedBy = lawyerId;
    await loan.save();

    return res.json({
        success: true,
        message: 'Loan restructured successfully',
        data: loan
    });
});

// ═══════════════════════════════════════════════════════════════
// ISSUE CLEARANCE LETTER
// POST /api/hr/employee-loans/:loanId/issue-clearance
// ═══════════════════════════════════════════════════════════════
const issueClearanceLetter = asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // IDOR Protection: Verify loan ownership
    const loan = await verifyLoanOwnership(loanId, firmId, lawyerId);

    if (loan.status !== 'completed') {
        throw CustomException('Clearance letter can only be issued for completed loans', 400);
    }

    loan.completion.clearanceLetter = {
        issued: true,
        issueDate: new Date(),
        letterUrl: req.body.letterUrl || null,
        delivered: false
    };

    loan.completion.caseClosed = true;
    loan.completion.closedDate = new Date();
    loan.completion.closedBy = lawyerId;

    loan.lastModifiedBy = lawyerId;
    await loan.save();

    return res.json({
        success: true,
        message: 'Clearance letter issued successfully',
        data: loan
    });
});

// ═══════════════════════════════════════════════════════════════
// BULK DELETE
// POST /api/hr/employee-loans/bulk-delete
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

    const result = await EmployeeLoan.deleteMany(query);

    return res.json({
        success: true,
        message: `${result.deletedCount} loan(s) deleted successfully`,
        deletedCount: result.deletedCount
    });
});

// ═══════════════════════════════════════════════════════════════
// GET BY EMPLOYEE
// GET /api/hr/employee-loans/by-employee/:employeeId
// ═══════════════════════════════════════════════════════════════
const getByEmployee = asyncHandler(async (req, res) => {
    const { employeeId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const loans = await EmployeeLoan.getByEmployee(employeeId, firmId, lawyerId);

    return res.json({
        success: true,
        data: loans
    });
});

// ═══════════════════════════════════════════════════════════════
// GET PENDING APPROVALS
// GET /api/hr/employee-loans/pending-approvals
// ═══════════════════════════════════════════════════════════════
const getPendingApprovals = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const loans = await EmployeeLoan.getPendingApprovals(firmId, lawyerId);

    return res.json({
        success: true,
        data: loans
    });
});

// ═══════════════════════════════════════════════════════════════
// GET OVERDUE INSTALLMENTS
// GET /api/hr/employee-loans/overdue-installments
// ═══════════════════════════════════════════════════════════════
const getOverdueInstallments = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const overdueList = await EmployeeLoan.getOverdueInstallments(firmId, lawyerId);

    return res.json({
        success: true,
        data: overdueList
    });
});

// ═══════════════════════════════════════════════════════════════
// UPLOAD DOCUMENT
// POST /api/hr/employee-loans/:loanId/documents
// ═══════════════════════════════════════════════════════════════
const uploadDocument = asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'documentType', 'documentName', 'documentNameAr', 'fileUrl', 'notes'
    ]);

    const { documentType, documentName, documentNameAr, fileUrl, notes } = allowedFields;

    if (!documentType || !fileUrl) {
        throw CustomException('Document type and file URL are required', 400);
    }

    // IDOR Protection: Verify loan ownership
    const loan = await verifyLoanOwnership(loanId, firmId, lawyerId);

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

    loan.documents.push(document);
    loan.lastModifiedBy = lawyerId;
    await loan.save();

    return res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: document
    });
});

// ═══════════════════════════════════════════════════════════════
// ADD COMMUNICATION
// POST /api/hr/employee-loans/:loanId/communications
// ═══════════════════════════════════════════════════════════════
const addCommunication = asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'communicationType', 'purpose', 'subject', 'message', 'sentTo', 'attachments'
    ]);

    const { communicationType, purpose, subject, message, sentTo, attachments } = allowedFields;

    // IDOR Protection: Verify loan ownership
    const loan = await verifyLoanOwnership(loanId, firmId, lawyerId);

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

    loan.communications.push(communication);
    loan.lastModifiedBy = lawyerId;
    await loan.save();

    return res.status(201).json({
        success: true,
        message: 'Communication added successfully',
        data: communication
    });
});

module.exports = {
    getLoans,
    getLoanStats,
    getLoan,
    checkEligibility,
    createLoan,
    updateLoan,
    deleteLoan,
    submitLoan,
    approveLoan,
    rejectLoan,
    disburseLoan,
    recordPayment,
    processPayrollDeduction,
    calculateEarlySettlement,
    processEarlySettlement,
    markAsDefaulted,
    restructureLoan,
    issueClearanceLetter,
    bulkDelete,
    getByEmployee,
    getPendingApprovals,
    getOverdueInstallments,
    uploadDocument,
    addCommunication
};
