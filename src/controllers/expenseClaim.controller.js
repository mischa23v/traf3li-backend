const { ExpenseClaim, Employee, EmployeeAdvance, Client, Case } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const { v4: uuidv4 } = require('uuid');

/**
 * Expense Claim Controller - HR Management
 * Module 12: مطالبات النفقات (Expense Claims)
 */

// ═══════════════════════════════════════════════════════════════
// EXPENSE POLICIES (Configurable)
// ═══════════════════════════════════════════════════════════════

const EXPENSE_POLICIES = {
    dailyLimits: {
        meals: 150, // SAR per day
        transportation: 200,
        accommodation: 500,
        entertainment: 300
    },
    requiresReceipt: {
        threshold: 100, // SAR - receipts required above this
        always: ['travel', 'accommodation', 'professional_services']
    },
    requiresApproval: {
        level1: 1000, // Manager approval
        level2: 5000, // Department head
        level3: 10000 // Finance director
    },
    mileageRates: {
        personal_car: 0.50, // SAR per km
        company_car: 0.25,
        rental: 0.40
    },
    travelPolicies: {
        domesticPerDiem: 350,
        internationalPerDiem: 600,
        maxHotelRate: 800,
        allowedTravelClasses: ['economy', 'business']
    },
    submissionDeadline: 30, // days after expense date
    vatRate: 15 // 15% VAT in Saudi Arabia
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// Generate unique line item ID
function generateLineItemId() {
    return `LI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate unique receipt ID
function generateReceiptId() {
    return `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Calculate VAT amount
function calculateVAT(amount, vatRate = EXPENSE_POLICIES.vatRate) {
    return Math.round((amount * vatRate / 100) * 100) / 100;
}

// Check policy compliance for an expense item
function checkItemCompliance(item) {
    const violations = [];

    // Check receipt requirement
    if (item.amount > EXPENSE_POLICIES.requiresReceipt.threshold &&
        item.receiptStatus === 'missing') {
        violations.push({
            violationType: 'missing_receipt',
            description: `Receipt required for expenses over ${EXPENSE_POLICIES.requiresReceipt.threshold} SAR`,
            severity: 'violation',
            lineItemId: item.lineItemId,
            amount: item.amount
        });
    }

    // Check daily limits
    const category = item.category;
    if (EXPENSE_POLICIES.dailyLimits[category]) {
        const limit = EXPENSE_POLICIES.dailyLimits[category];
        if (item.amount > limit) {
            violations.push({
                violationType: 'daily_limit_exceeded',
                description: `${category} expense exceeds daily limit of ${limit} SAR`,
                severity: 'warning',
                lineItemId: item.lineItemId,
                amount: item.amount - limit
            });
        }
    }

    return violations;
}

// Determine required approval workflow based on amount
function getApprovalWorkflow(amount) {
    const steps = [];

    if (amount >= EXPENSE_POLICIES.requiresApproval.level1) {
        steps.push({
            stepNumber: 1,
            stepName: 'Manager Approval',
            stepNameAr: 'موافقة المدير',
            approverRole: 'manager',
            approvalThreshold: {
                minimumAmount: EXPENSE_POLICIES.requiresApproval.level1,
                maximumAmount: EXPENSE_POLICIES.requiresApproval.level2 - 1
            },
            status: 'pending',
            notificationSent: false
        });
    }

    if (amount >= EXPENSE_POLICIES.requiresApproval.level2) {
        steps.push({
            stepNumber: 2,
            stepName: 'Department Head Approval',
            stepNameAr: 'موافقة رئيس القسم',
            approverRole: 'department_head',
            approvalThreshold: {
                minimumAmount: EXPENSE_POLICIES.requiresApproval.level2,
                maximumAmount: EXPENSE_POLICIES.requiresApproval.level3 - 1
            },
            status: 'pending',
            notificationSent: false
        });
    }

    if (amount >= EXPENSE_POLICIES.requiresApproval.level3) {
        steps.push({
            stepNumber: 3,
            stepName: 'Finance Director Approval',
            stepNameAr: 'موافقة المدير المالي',
            approverRole: 'finance_director',
            approvalThreshold: {
                minimumAmount: EXPENSE_POLICIES.requiresApproval.level3
            },
            status: 'pending',
            notificationSent: false
        });
    }

    return steps;
}

// ═══════════════════════════════════════════════════════════════
// GET ALL CLAIMS
// GET /api/hr/expense-claims
// ═══════════════════════════════════════════════════════════════

const getClaims = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const query = firmId ? { firmId } : { lawyerId };

    // Filters
    const {
        status, expenseType, employeeId, startDate, endDate,
        minAmount, maxAmount, search, page = 1, limit = 20
    } = req.query;

    if (status) query.status = status;
    if (expenseType) query.expenseType = expenseType;
    if (employeeId) query.employeeId = employeeId;

    if (startDate || endDate) {
        query['claimPeriod.startDate'] = {};
        if (startDate) query['claimPeriod.startDate'].$gte = new Date(startDate);
        if (endDate) query['claimPeriod.startDate'].$lte = new Date(endDate);
    }

    if (minAmount || maxAmount) {
        query['totals.grandTotal'] = {};
        if (minAmount) query['totals.grandTotal'].$gte = parseFloat(minAmount);
        if (maxAmount) query['totals.grandTotal'].$lte = parseFloat(maxAmount);
    }

    if (search) {
        query.$or = [
            { claimNumber: { $regex: search, $options: 'i' } },
            { claimTitle: { $regex: search, $options: 'i' } },
            { employeeName: { $regex: search, $options: 'i' } },
            { employeeNameAr: { $regex: search, $options: 'i' } }
        ];
    }

    const claims = await ExpenseClaim.find(query)
        .populate('employeeId', 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish')
        .populate('createdBy', 'firstName lastName')
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .sort({ createdAt: -1 });

    const total = await ExpenseClaim.countDocuments(query);

    return res.json({
        success: true,
        claims,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET SINGLE CLAIM
// GET /api/hr/expense-claims/:id
// ═══════════════════════════════════════════════════════════════

const getClaim = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { id } = req.params;

    const query = firmId ? { firmId, _id: id } : { lawyerId, _id: id };

    const claim = await ExpenseClaim.findOne(query)
        .populate('employeeId', 'employeeId personalInfo compensation bankDetails')
        .populate('createdBy', 'firstName lastName')
        .populate('approvalWorkflow.workflowSteps.approverId', 'firstName lastName')
        .populate('payment.processedBy', 'firstName lastName');

    if (!claim) {
        throw CustomException('Expense claim not found', 404);
    }

    return res.json({
        success: true,
        claim
    });
});

// ═══════════════════════════════════════════════════════════════
// CREATE CLAIM
// POST /api/hr/expense-claims
// ═══════════════════════════════════════════════════════════════

const createClaim = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const {
        employeeId,
        claimTitle,
        claimTitleAr,
        expenseType,
        claimCategory,
        claimPeriod,
        description,
        descriptionAr,
        businessPurpose,
        businessPurposeAr,
        allocation,
        urgency,
        lineItems,
        travelDetails,
        mileageClaim,
        advanceSettlement,
        notes
    } = req.body;

    // Validate required fields
    if (!employeeId) {
        throw CustomException('Employee ID is required', 400);
    }

    if (!claimTitle) {
        throw CustomException('Claim title is required', 400);
    }

    if (!expenseType) {
        throw CustomException('Expense type is required', 400);
    }

    // Get employee details
    const employeeQuery = firmId ? { firmId, _id: employeeId } : { lawyerId, _id: employeeId };
    const employee = await Employee.findOne(employeeQuery);

    if (!employee) {
        throw CustomException('Employee not found', 404);
    }

    // Prepare line items with IDs
    const preparedLineItems = (lineItems || []).map(item => ({
        ...item,
        lineItemId: item.lineItemId || generateLineItemId(),
        vatAmount: item.vatAmount || (item.amount && item.vatApplicable !== false ?
            calculateVAT(item.amount) : 0),
        totalAmount: item.amount + (item.vatAmount || calculateVAT(item.amount || 0))
    }));

    // Create claim
    const claim = new ExpenseClaim({
        firmId: firmId || undefined,
        lawyerId: lawyerId || undefined,
        createdBy: lawyerId,

        // Employee info
        employeeId,
        employeeNumber: employee.employeeId,
        employeeName: employee.personalInfo?.fullNameEnglish || employee.personalInfo?.fullNameArabic,
        employeeNameAr: employee.personalInfo?.fullNameArabic,
        department: employee.employment?.department,
        jobTitle: employee.employment?.jobTitle,
        costCenter: employee.employment?.costCenter,
        bankDetails: employee.bankDetails,

        // Claim header
        claimTitle,
        claimTitleAr,
        expenseType,
        claimCategory: claimCategory || 'business_travel',
        claimPeriod,
        description,
        descriptionAr,
        businessPurpose,
        businessPurposeAr,
        allocation,
        urgency: urgency || 'medium',

        // Line items
        lineItems: preparedLineItems,

        // Optional sections
        travelDetails: travelDetails ? { ...travelDetails, isTravelClaim: true } : undefined,
        mileageClaim: mileageClaim ? { ...mileageClaim, isMileageClaim: true } : undefined,
        advanceSettlement: advanceSettlement ? { ...advanceSettlement, isAdvanceSettlement: true } : undefined,

        // Notes
        notes,

        // Status
        status: 'draft'
    });

    await claim.save();

    return res.status(201).json({
        success: true,
        message: 'Expense claim created successfully',
        claim
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE CLAIM
// PATCH /api/hr/expense-claims/:id
// ═══════════════════════════════════════════════════════════════

const updateClaim = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { id } = req.params;

    const query = firmId ? { firmId, _id: id } : { lawyerId, _id: id };
    const claim = await ExpenseClaim.findOne(query);

    if (!claim) {
        throw CustomException('Expense claim not found', 404);
    }

    // Only allow updates in draft or returned states
    if (!['draft', 'under_review'].includes(claim.status)) {
        throw CustomException('Cannot update claim in current status', 400);
    }

    // Update allowed fields
    const allowedFields = [
        'claimTitle', 'claimTitleAr', 'expenseType', 'claimCategory',
        'claimPeriod', 'description', 'descriptionAr', 'businessPurpose',
        'businessPurposeAr', 'allocation', 'urgency', 'lineItems',
        'travelDetails', 'mileageClaim', 'advanceSettlement', 'notes'
    ];

    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            claim[field] = req.body[field];
        }
    }

    // Track modification
    claim.auditTrail.modifications.push({
        modificationId: uuidv4(),
        modifiedOn: new Date(),
        modifiedBy: lawyerId,
        modificationType: 'edit',
        reason: req.body.modificationReason || 'General update'
    });

    claim.lastModifiedBy = lawyerId;
    claim.lastModifiedOn = new Date();

    await claim.save();

    return res.json({
        success: true,
        message: 'Expense claim updated successfully',
        claim
    });
});

// ═══════════════════════════════════════════════════════════════
// DELETE CLAIM
// DELETE /api/hr/expense-claims/:id
// ═══════════════════════════════════════════════════════════════

const deleteClaim = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { id } = req.params;

    const query = firmId ? { firmId, _id: id } : { lawyerId, _id: id };
    const claim = await ExpenseClaim.findOne(query);

    if (!claim) {
        throw CustomException('Expense claim not found', 404);
    }

    // Only allow deletion of draft claims
    if (claim.status !== 'draft') {
        throw CustomException('Can only delete draft claims', 400);
    }

    await ExpenseClaim.deleteOne(query);

    return res.json({
        success: true,
        message: 'Expense claim deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// GET CLAIM STATISTICS
// GET /api/hr/expense-claims/stats
// ═══════════════════════════════════════════════════════════════

const getClaimStats = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const stats = await ExpenseClaim.getStats(firmId, lawyerId);

    return res.json({
        success: true,
        stats
    });
});

// ═══════════════════════════════════════════════════════════════
// SUBMIT CLAIM FOR APPROVAL
// POST /api/hr/expense-claims/:id/submit
// ═══════════════════════════════════════════════════════════════

const submitClaim = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { id } = req.params;

    const query = firmId ? { firmId, _id: id } : { lawyerId, _id: id };
    const claim = await ExpenseClaim.findOne(query);

    if (!claim) {
        throw CustomException('Expense claim not found', 404);
    }

    if (claim.status !== 'draft') {
        throw CustomException('Only draft claims can be submitted', 400);
    }

    // Check if there are line items
    if (!claim.lineItems || claim.lineItems.length === 0) {
        throw CustomException('Cannot submit claim without line items', 400);
    }

    // Check policy compliance
    claim.checkPolicyCompliance();

    // Set up approval workflow
    const workflowSteps = getApprovalWorkflow(claim.totals.grandTotal);

    if (workflowSteps.length === 0) {
        // Auto-approve small amounts
        claim.status = 'approved';
        claim.approvalWorkflow.finalStatus = 'approved';
        claim.approvalWorkflow.totalApprovedAmount = claim.totals.grandTotal;
        claim.totals.approvedAmount = claim.totals.grandTotal;
        claim.approvalDate = new Date();
    } else {
        claim.status = 'submitted';
        claim.approvalWorkflow.workflowSteps = workflowSteps;
        claim.approvalWorkflow.currentStep = 1;
        claim.approvalWorkflow.totalSteps = workflowSteps.length;
    }

    claim.submissionDate = new Date();
    claim.auditTrail.submission = {
        submittedOn: new Date(),
        submittedBy: lawyerId,
        submissionMethod: 'web'
    };

    claim.auditTrail.statusHistory.push({
        status: claim.status,
        changedOn: new Date(),
        changedBy: lawyerId,
        reason: 'Claim submitted for approval'
    });

    await claim.save();

    return res.json({
        success: true,
        message: claim.status === 'approved' ?
            'Claim auto-approved (below threshold)' :
            'Claim submitted for approval',
        claim
    });
});

// ═══════════════════════════════════════════════════════════════
// APPROVE CLAIM
// POST /api/hr/expense-claims/:id/approve
// ═══════════════════════════════════════════════════════════════

const approveClaim = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { id } = req.params;
    const { approvedAmount, comments, itemApprovals } = req.body;

    const query = firmId ? { firmId, _id: id } : { lawyerId, _id: id };
    const claim = await ExpenseClaim.findOne(query);

    if (!claim) {
        throw CustomException('Expense claim not found', 404);
    }

    if (!['submitted', 'under_review', 'pending_approval'].includes(claim.status)) {
        throw CustomException('Claim is not pending approval', 400);
    }

    const currentStep = claim.approvalWorkflow.currentStep;
    const stepIndex = currentStep - 1;

    if (stepIndex >= 0 && stepIndex < claim.approvalWorkflow.workflowSteps.length) {
        const step = claim.approvalWorkflow.workflowSteps[stepIndex];
        step.status = 'approved';
        step.actionDate = new Date();
        step.decision = 'approve';
        step.approverId = lawyerId;
        step.totalApprovedAmount = approvedAmount || claim.totals.grandTotal;
        step.comments = comments;
        step.itemApprovals = itemApprovals;
    }

    // Check if all steps are complete
    const allApproved = claim.approvalWorkflow.workflowSteps.every(s => s.status === 'approved');

    if (allApproved || currentStep >= claim.approvalWorkflow.totalSteps) {
        claim.status = 'approved';
        claim.approvalWorkflow.finalStatus = 'approved';
        claim.approvalWorkflow.finalApprover = lawyerId;
        claim.approvalWorkflow.finalApprovalDate = new Date();
        claim.approvalDate = new Date();
        claim.totals.approvedAmount = approvedAmount || claim.totals.grandTotal;
        claim.approvalWorkflow.totalApprovedAmount = claim.totals.approvedAmount;
        claim.payment.approvedAmount = claim.totals.approvedAmount;
        claim.payment.netReimbursementAmount = claim.totals.approvedAmount;
    } else {
        claim.status = 'pending_approval';
        claim.approvalWorkflow.currentStep = currentStep + 1;
    }

    claim.auditTrail.approvalsLog.push({
        stepNumber: currentStep,
        approver: lawyerId,
        decision: 'approve',
        actionDate: new Date(),
        comments
    });

    claim.auditTrail.statusHistory.push({
        status: claim.status,
        changedOn: new Date(),
        changedBy: lawyerId,
        reason: 'Claim approved'
    });

    await claim.save();

    return res.json({
        success: true,
        message: claim.status === 'approved' ?
            'Claim fully approved' :
            `Step ${currentStep} approved, pending further approval`,
        claim
    });
});

// ═══════════════════════════════════════════════════════════════
// REJECT CLAIM
// POST /api/hr/expense-claims/:id/reject
// ═══════════════════════════════════════════════════════════════

const rejectClaim = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { id } = req.params;
    const { reason, comments } = req.body;

    if (!reason) {
        throw CustomException('Rejection reason is required', 400);
    }

    const query = firmId ? { firmId, _id: id } : { lawyerId, _id: id };
    const claim = await ExpenseClaim.findOne(query);

    if (!claim) {
        throw CustomException('Expense claim not found', 404);
    }

    if (!['submitted', 'under_review', 'pending_approval'].includes(claim.status)) {
        throw CustomException('Claim is not pending approval', 400);
    }

    const currentStep = claim.approvalWorkflow.currentStep;
    const stepIndex = currentStep - 1;

    if (stepIndex >= 0 && stepIndex < claim.approvalWorkflow.workflowSteps.length) {
        const step = claim.approvalWorkflow.workflowSteps[stepIndex];
        step.status = 'rejected';
        step.actionDate = new Date();
        step.decision = 'reject';
        step.approverId = lawyerId;
        step.comments = comments;
    }

    claim.status = 'rejected';
    claim.approvalWorkflow.finalStatus = 'rejected';
    claim.approvalWorkflow.rejectionReason = reason;

    claim.auditTrail.approvalsLog.push({
        stepNumber: currentStep,
        approver: lawyerId,
        decision: 'reject',
        actionDate: new Date(),
        comments: reason
    });

    claim.auditTrail.statusHistory.push({
        status: 'rejected',
        changedOn: new Date(),
        changedBy: lawyerId,
        reason
    });

    await claim.save();

    return res.json({
        success: true,
        message: 'Claim rejected',
        claim
    });
});

// ═══════════════════════════════════════════════════════════════
// REQUEST CHANGES
// POST /api/hr/expense-claims/:id/request-changes
// ═══════════════════════════════════════════════════════════════

const requestChanges = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { id } = req.params;
    const { changesRequested, comments } = req.body;

    if (!changesRequested) {
        throw CustomException('Changes requested description is required', 400);
    }

    const query = firmId ? { firmId, _id: id } : { lawyerId, _id: id };
    const claim = await ExpenseClaim.findOne(query);

    if (!claim) {
        throw CustomException('Expense claim not found', 404);
    }

    if (!['submitted', 'under_review', 'pending_approval'].includes(claim.status)) {
        throw CustomException('Claim is not pending approval', 400);
    }

    const currentStep = claim.approvalWorkflow.currentStep;
    const stepIndex = currentStep - 1;

    if (stepIndex >= 0 && stepIndex < claim.approvalWorkflow.workflowSteps.length) {
        const step = claim.approvalWorkflow.workflowSteps[stepIndex];
        step.status = 'returned';
        step.actionDate = new Date();
        step.decision = 'request_clarification';
        step.approverId = lawyerId;
        step.comments = comments;
        step.clarificationsRequested = [{
            question: changesRequested,
            response: null,
            respondedDate: null
        }];
    }

    claim.status = 'under_review';
    claim.approvalWorkflow.changesRequested = changesRequested;

    claim.auditTrail.statusHistory.push({
        status: 'under_review',
        changedOn: new Date(),
        changedBy: lawyerId,
        reason: `Changes requested: ${changesRequested}`
    });

    await claim.save();

    return res.json({
        success: true,
        message: 'Changes requested',
        claim
    });
});

// ═══════════════════════════════════════════════════════════════
// PROCESS PAYMENT
// POST /api/hr/expense-claims/:id/process-payment
// ═══════════════════════════════════════════════════════════════

const processPayment = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { id } = req.params;
    const {
        paymentMethod,
        paymentReference,
        bankTransfer,
        check,
        payrollAddition,
        deductions
    } = req.body;

    const query = firmId ? { firmId, _id: id } : { lawyerId, _id: id };
    const claim = await ExpenseClaim.findOne(query);

    if (!claim) {
        throw CustomException('Expense claim not found', 404);
    }

    if (claim.status !== 'approved') {
        throw CustomException('Only approved claims can be processed for payment', 400);
    }

    // Calculate deductions
    let totalDeductions = 0;
    if (deductions && deductions.length > 0) {
        totalDeductions = deductions.reduce((sum, d) => sum + d.deductionAmount, 0);
        claim.payment.deductions = deductions;
    }

    const netAmount = claim.totals.approvedAmount - totalDeductions;

    claim.payment.paymentMethod = paymentMethod;
    claim.payment.paymentReference = paymentReference;
    claim.payment.totalDeductions = totalDeductions;
    claim.payment.netReimbursementAmount = netAmount;
    claim.payment.paymentStatus = 'processing';
    claim.payment.processedBy = lawyerId;
    claim.payment.processedOn = new Date();

    // Payment method specific details
    if (bankTransfer) {
        claim.payment.bankTransfer = {
            ...bankTransfer,
            transferStatus: 'pending'
        };
    }

    if (check) {
        claim.payment.check = check;
    }

    if (payrollAddition) {
        claim.payment.payrollAddition = payrollAddition;
    }

    claim.status = 'processing';

    claim.auditTrail.paymentLog.push({
        action: 'Payment initiated',
        actionDate: new Date(),
        actionBy: lawyerId,
        amount: netAmount,
        reference: paymentReference,
        status: 'processing'
    });

    claim.auditTrail.statusHistory.push({
        status: 'processing',
        changedOn: new Date(),
        changedBy: lawyerId,
        reason: 'Payment processing initiated'
    });

    await claim.save();

    return res.json({
        success: true,
        message: 'Payment processing initiated',
        claim
    });
});

// ═══════════════════════════════════════════════════════════════
// CONFIRM PAYMENT
// POST /api/hr/expense-claims/:id/confirm-payment
// ═══════════════════════════════════════════════════════════════

const confirmPayment = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { id } = req.params;
    const { paymentDate, paymentReference } = req.body;

    const query = firmId ? { firmId, _id: id } : { lawyerId, _id: id };
    const claim = await ExpenseClaim.findOne(query);

    if (!claim) {
        throw CustomException('Expense claim not found', 404);
    }

    if (claim.status !== 'processing') {
        throw CustomException('Claim is not in processing status', 400);
    }

    claim.status = 'paid';
    claim.payment.paymentStatus = 'paid';
    claim.payment.paymentDate = paymentDate || new Date();
    claim.payment.paymentReference = paymentReference || claim.payment.paymentReference;
    claim.paymentDate = claim.payment.paymentDate;
    claim.totals.paidAmount = claim.payment.netReimbursementAmount;

    if (claim.payment.bankTransfer) {
        claim.payment.bankTransfer.transferStatus = 'completed';
        claim.payment.bankTransfer.transferDate = claim.payment.paymentDate;
    }

    claim.auditTrail.paymentLog.push({
        action: 'Payment confirmed',
        actionDate: new Date(),
        actionBy: lawyerId,
        amount: claim.payment.netReimbursementAmount,
        reference: paymentReference,
        status: 'paid'
    });

    claim.auditTrail.statusHistory.push({
        status: 'paid',
        changedOn: new Date(),
        changedBy: lawyerId,
        reason: 'Payment completed'
    });

    await claim.save();

    return res.json({
        success: true,
        message: 'Payment confirmed',
        claim
    });
});

// ═══════════════════════════════════════════════════════════════
// ADD LINE ITEM
// POST /api/hr/expense-claims/:id/line-items
// ═══════════════════════════════════════════════════════════════

const addLineItem = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { id } = req.params;

    const query = firmId ? { firmId, _id: id } : { lawyerId, _id: id };
    const claim = await ExpenseClaim.findOne(query);

    if (!claim) {
        throw CustomException('Expense claim not found', 404);
    }

    if (!['draft', 'under_review'].includes(claim.status)) {
        throw CustomException('Cannot add items in current status', 400);
    }

    const lineItem = {
        ...req.body,
        lineItemId: generateLineItemId(),
        vatAmount: req.body.vatAmount || calculateVAT(req.body.amount || 0),
        totalAmount: (req.body.amount || 0) + (req.body.vatAmount || calculateVAT(req.body.amount || 0))
    };

    claim.lineItems.push(lineItem);

    claim.auditTrail.modifications.push({
        modificationId: uuidv4(),
        modifiedOn: new Date(),
        modifiedBy: lawyerId,
        modificationType: 'add_item',
        newValue: lineItem,
        reason: 'Added new line item'
    });

    await claim.save();

    return res.json({
        success: true,
        message: 'Line item added',
        lineItem,
        claim
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE LINE ITEM
// PATCH /api/hr/expense-claims/:id/line-items/:lineItemId
// ═══════════════════════════════════════════════════════════════

const updateLineItem = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { id, lineItemId } = req.params;

    const query = firmId ? { firmId, _id: id } : { lawyerId, _id: id };
    const claim = await ExpenseClaim.findOne(query);

    if (!claim) {
        throw CustomException('Expense claim not found', 404);
    }

    if (!['draft', 'under_review'].includes(claim.status)) {
        throw CustomException('Cannot update items in current status', 400);
    }

    const itemIndex = claim.lineItems.findIndex(item => item.lineItemId === lineItemId);

    if (itemIndex === -1) {
        throw CustomException('Line item not found', 404);
    }

    const oldValue = { ...claim.lineItems[itemIndex].toObject() };

    // Update line item
    Object.assign(claim.lineItems[itemIndex], req.body);

    // Recalculate VAT and total
    if (req.body.amount !== undefined) {
        claim.lineItems[itemIndex].vatAmount = req.body.vatAmount ||
            calculateVAT(req.body.amount);
        claim.lineItems[itemIndex].totalAmount = req.body.amount +
            claim.lineItems[itemIndex].vatAmount;
    }

    claim.auditTrail.modifications.push({
        modificationId: uuidv4(),
        modifiedOn: new Date(),
        modifiedBy: lawyerId,
        modificationType: 'edit',
        field: 'lineItem',
        oldValue,
        newValue: claim.lineItems[itemIndex].toObject(),
        reason: 'Updated line item'
    });

    await claim.save();

    return res.json({
        success: true,
        message: 'Line item updated',
        lineItem: claim.lineItems[itemIndex],
        claim
    });
});

// ═══════════════════════════════════════════════════════════════
// DELETE LINE ITEM
// DELETE /api/hr/expense-claims/:id/line-items/:lineItemId
// ═══════════════════════════════════════════════════════════════

const deleteLineItem = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { id, lineItemId } = req.params;

    const query = firmId ? { firmId, _id: id } : { lawyerId, _id: id };
    const claim = await ExpenseClaim.findOne(query);

    if (!claim) {
        throw CustomException('Expense claim not found', 404);
    }

    if (!['draft', 'under_review'].includes(claim.status)) {
        throw CustomException('Cannot delete items in current status', 400);
    }

    const itemIndex = claim.lineItems.findIndex(item => item.lineItemId === lineItemId);

    if (itemIndex === -1) {
        throw CustomException('Line item not found', 404);
    }

    const removedItem = claim.lineItems[itemIndex];
    claim.lineItems.splice(itemIndex, 1);

    claim.auditTrail.modifications.push({
        modificationId: uuidv4(),
        modifiedOn: new Date(),
        modifiedBy: lawyerId,
        modificationType: 'remove_item',
        oldValue: removedItem.toObject(),
        reason: 'Removed line item'
    });

    await claim.save();

    return res.json({
        success: true,
        message: 'Line item deleted',
        claim
    });
});

// ═══════════════════════════════════════════════════════════════
// UPLOAD RECEIPT
// POST /api/hr/expense-claims/:id/receipts
// ═══════════════════════════════════════════════════════════════

const uploadReceipt = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { id } = req.params;
    const { lineItemId, fileName, fileUrl, fileType, fileSize } = req.body;

    const query = firmId ? { firmId, _id: id } : { lawyerId, _id: id };
    const claim = await ExpenseClaim.findOne(query);

    if (!claim) {
        throw CustomException('Expense claim not found', 404);
    }

    const receipt = {
        receiptId: generateReceiptId(),
        lineItemId,
        fileName,
        fileUrl,
        fileType,
        fileSize,
        uploadedOn: new Date(),
        uploadedBy: lawyerId,
        verified: false
    };

    claim.receipts.push(receipt);

    // Update line item receipt status if linked
    if (lineItemId) {
        const lineItem = claim.lineItems.find(item => item.lineItemId === lineItemId);
        if (lineItem) {
            lineItem.receiptStatus = 'attached';
            lineItem.receiptUrl = fileUrl;
        }
    }

    claim.auditTrail.modifications.push({
        modificationId: uuidv4(),
        modifiedOn: new Date(),
        modifiedBy: lawyerId,
        modificationType: 'add_receipt',
        newValue: receipt,
        reason: 'Uploaded receipt'
    });

    await claim.save();

    return res.json({
        success: true,
        message: 'Receipt uploaded',
        receipt,
        claim
    });
});

// ═══════════════════════════════════════════════════════════════
// DELETE RECEIPT
// DELETE /api/hr/expense-claims/:id/receipts/:receiptId
// ═══════════════════════════════════════════════════════════════

const deleteReceipt = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { id, receiptId } = req.params;

    const query = firmId ? { firmId, _id: id } : { lawyerId, _id: id };
    const claim = await ExpenseClaim.findOne(query);

    if (!claim) {
        throw CustomException('Expense claim not found', 404);
    }

    if (!['draft', 'under_review'].includes(claim.status)) {
        throw CustomException('Cannot delete receipts in current status', 400);
    }

    const receiptIndex = claim.receipts.findIndex(r => r.receiptId === receiptId);

    if (receiptIndex === -1) {
        throw CustomException('Receipt not found', 404);
    }

    const removedReceipt = claim.receipts[receiptIndex];
    claim.receipts.splice(receiptIndex, 1);

    // Update line item receipt status if linked
    if (removedReceipt.lineItemId) {
        const lineItem = claim.lineItems.find(item => item.lineItemId === removedReceipt.lineItemId);
        if (lineItem) {
            lineItem.receiptStatus = 'missing';
            lineItem.receiptUrl = null;
        }
    }

    await claim.save();

    return res.json({
        success: true,
        message: 'Receipt deleted',
        claim
    });
});

// ═══════════════════════════════════════════════════════════════
// VERIFY RECEIPT
// POST /api/hr/expense-claims/:id/receipts/:receiptId/verify
// ═══════════════════════════════════════════════════════════════

const verifyReceipt = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { id, receiptId } = req.params;

    const query = firmId ? { firmId, _id: id } : { lawyerId, _id: id };
    const claim = await ExpenseClaim.findOne(query);

    if (!claim) {
        throw CustomException('Expense claim not found', 404);
    }

    const receipt = claim.receipts.find(r => r.receiptId === receiptId);

    if (!receipt) {
        throw CustomException('Receipt not found', 404);
    }

    receipt.verified = true;
    receipt.verifiedBy = lawyerId;
    receipt.verifiedOn = new Date();

    // Update line item receipt status if linked
    if (receipt.lineItemId) {
        const lineItem = claim.lineItems.find(item => item.lineItemId === receipt.lineItemId);
        if (lineItem) {
            lineItem.receiptStatus = 'verified';
        }
    }

    await claim.save();

    return res.json({
        success: true,
        message: 'Receipt verified',
        receipt,
        claim
    });
});

// ═══════════════════════════════════════════════════════════════
// RECONCILE CORPORATE CARD TRANSACTION
// POST /api/hr/expense-claims/:id/reconcile-card
// ═══════════════════════════════════════════════════════════════

const reconcileCardTransaction = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { id } = req.params;
    const { transactionId, lineItemId } = req.body;

    const query = firmId ? { firmId, _id: id } : { lawyerId, _id: id };
    const claim = await ExpenseClaim.findOne(query);

    if (!claim) {
        throw CustomException('Expense claim not found', 404);
    }

    if (!claim.corporateCard?.hasCardTransactions) {
        throw CustomException('No corporate card transactions found', 400);
    }

    const transaction = claim.corporateCard.transactions.find(t => t.transactionId === transactionId);

    if (!transaction) {
        throw CustomException('Transaction not found', 404);
    }

    transaction.isReconciled = true;
    transaction.reconciledLineItemId = lineItemId;
    transaction.reconciledDate = new Date();
    transaction.status = 'matched';

    await claim.save();

    return res.json({
        success: true,
        message: 'Transaction reconciled',
        transaction,
        claim
    });
});

// ═══════════════════════════════════════════════════════════════
// CHECK POLICY COMPLIANCE
// POST /api/hr/expense-claims/:id/check-compliance
// ═══════════════════════════════════════════════════════════════

const checkCompliance = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { id } = req.params;

    const query = firmId ? { firmId, _id: id } : { lawyerId, _id: id };
    const claim = await ExpenseClaim.findOne(query);

    if (!claim) {
        throw CustomException('Expense claim not found', 404);
    }

    const compliance = claim.checkPolicyCompliance();
    await claim.save();

    return res.json({
        success: true,
        compliance
    });
});

// ═══════════════════════════════════════════════════════════════
// APPROVE POLICY EXCEPTION
// POST /api/hr/expense-claims/:id/approve-exception
// ═══════════════════════════════════════════════════════════════

const approveException = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { id } = req.params;
    const { exceptionType, exceptionReason, conditions } = req.body;

    const query = firmId ? { firmId, _id: id } : { lawyerId, _id: id };
    const claim = await ExpenseClaim.findOne(query);

    if (!claim) {
        throw CustomException('Expense claim not found', 404);
    }

    claim.policyCompliance.exceptions.push({
        exceptionType,
        exceptionReason,
        requestedBy: claim.employeeName,
        requestDate: new Date(),
        grantedBy: lawyerId,
        grantedDate: new Date(),
        conditions: conditions || []
    });

    claim.policyCompliance.exceptionsCount = claim.policyCompliance.exceptions.length;

    await claim.save();

    return res.json({
        success: true,
        message: 'Exception approved',
        claim
    });
});

// ═══════════════════════════════════════════════════════════════
// MARK AS BILLABLE
// POST /api/hr/expense-claims/:id/mark-billable
// ═══════════════════════════════════════════════════════════════

const markBillable = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { id } = req.params;
    const { clientId, clientName, caseId, caseNumber, lineItemIds, markupPercentage } = req.body;

    const query = firmId ? { firmId, _id: id } : { lawyerId, _id: id };
    const claim = await ExpenseClaim.findOne(query);

    if (!claim) {
        throw CustomException('Expense claim not found', 404);
    }

    let billableAmount = 0;

    // Mark specific line items as billable
    if (lineItemIds && lineItemIds.length > 0) {
        for (const lineItemId of lineItemIds) {
            const lineItem = claim.lineItems.find(item => item.lineItemId === lineItemId);
            if (lineItem) {
                lineItem.isBillable = true;
                lineItem.clientId = clientId;
                lineItem.clientName = clientName;
                lineItem.caseId = caseId;
                billableAmount += lineItem.totalAmount || 0;
            }
        }
    } else {
        // Mark all items as billable
        for (const lineItem of claim.lineItems) {
            lineItem.isBillable = true;
            lineItem.clientId = clientId;
            lineItem.clientName = clientName;
            lineItem.caseId = caseId;
            billableAmount += lineItem.totalAmount || 0;
        }
    }

    const markup = markupPercentage ? (billableAmount * markupPercentage / 100) : 0;

    claim.billable = {
        isBillable: true,
        billableAmount,
        clientId,
        clientName,
        caseId,
        caseNumber,
        markupPercentage: markupPercentage || 0,
        markupAmount: markup,
        totalBilledAmount: billableAmount + markup,
        invoiced: false
    };

    claim.totals.billableAmount = billableAmount;

    await claim.save();

    return res.json({
        success: true,
        message: 'Expenses marked as billable',
        claim
    });
});

// ═══════════════════════════════════════════════════════════════
// CREATE INVOICE FOR BILLABLE
// POST /api/hr/expense-claims/:id/create-invoice
// ═══════════════════════════════════════════════════════════════

const createInvoice = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { id } = req.params;

    const query = firmId ? { firmId, _id: id } : { lawyerId, _id: id };
    const claim = await ExpenseClaim.findOne(query);

    if (!claim) {
        throw CustomException('Expense claim not found', 404);
    }

    if (!claim.billable?.isBillable) {
        throw CustomException('No billable expenses found', 400);
    }

    if (claim.billable.invoiced) {
        throw CustomException('Invoice already created', 400);
    }

    // Mark as invoiced (actual invoice creation would be done in invoice module)
    claim.billable.invoiced = true;
    claim.billable.invoiceDate = new Date();

    await claim.save();

    return res.json({
        success: true,
        message: 'Invoice marked for creation',
        billableDetails: claim.billable
    });
});

// ═══════════════════════════════════════════════════════════════
// BULK DELETE CLAIMS
// POST /api/hr/expense-claims/bulk-delete
// ═══════════════════════════════════════════════════════════════

const bulkDelete = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { claimIds } = req.body;

    if (!claimIds || claimIds.length === 0) {
        throw CustomException('No claim IDs provided', 400);
    }

    const query = firmId ?
        { firmId, _id: { $in: claimIds }, status: 'draft' } :
        { lawyerId, _id: { $in: claimIds }, status: 'draft' };

    const result = await ExpenseClaim.deleteMany(query);

    return res.json({
        success: true,
        message: `${result.deletedCount} claims deleted`,
        deletedCount: result.deletedCount
    });
});

// ═══════════════════════════════════════════════════════════════
// GET CLAIMS BY EMPLOYEE
// GET /api/hr/expense-claims/by-employee/:employeeId
// ═══════════════════════════════════════════════════════════════

const getClaimsByEmployee = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { employeeId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    const query = firmId ?
        { firmId, employeeId } :
        { lawyerId, employeeId };

    if (status) query.status = status;

    const claims = await ExpenseClaim.find(query)
        .populate('createdBy', 'firstName lastName')
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .sort({ createdAt: -1 });

    const total = await ExpenseClaim.countDocuments(query);

    return res.json({
        success: true,
        claims,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET PENDING APPROVALS
// GET /api/hr/expense-claims/pending-approvals
// ═══════════════════════════════════════════════════════════════

const getPendingApprovals = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const claims = await ExpenseClaim.getPendingApprovals(firmId, lawyerId);

    return res.json({
        success: true,
        claims,
        count: claims.length
    });
});

// ═══════════════════════════════════════════════════════════════
// GET PENDING PAYMENTS
// GET /api/hr/expense-claims/pending-payments
// ═══════════════════════════════════════════════════════════════

const getPendingPayments = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const claims = await ExpenseClaim.getPendingPayments(firmId, lawyerId);

    return res.json({
        success: true,
        claims,
        count: claims.length
    });
});

// ═══════════════════════════════════════════════════════════════
// GET MILEAGE RATES
// GET /api/hr/expense-claims/mileage-rates
// ═══════════════════════════════════════════════════════════════

const getMileageRates = asyncHandler(async (req, res) => {
    return res.json({
        success: true,
        rates: EXPENSE_POLICIES.mileageRates
    });
});

// ═══════════════════════════════════════════════════════════════
// GET EXPENSE POLICIES
// GET /api/hr/expense-claims/policies
// ═══════════════════════════════════════════════════════════════

const getPolicies = asyncHandler(async (req, res) => {
    return res.json({
        success: true,
        policies: EXPENSE_POLICIES
    });
});

// ═══════════════════════════════════════════════════════════════
// GET CORPORATE CARD TRANSACTIONS
// GET /api/hr/expense-claims/corporate-card/:employeeId
// ═══════════════════════════════════════════════════════════════

const getCorporateCardTransactions = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { employeeId } = req.params;

    const query = firmId ?
        { firmId, employeeId, 'corporateCard.hasCardTransactions': true } :
        { lawyerId, employeeId, 'corporateCard.hasCardTransactions': true };

    const claims = await ExpenseClaim.find(query)
        .select('claimNumber corporateCard submissionDate status')
        .sort({ createdAt: -1 });

    // Flatten transactions from all claims
    const transactions = [];
    for (const claim of claims) {
        if (claim.corporateCard?.transactions) {
            for (const txn of claim.corporateCard.transactions) {
                transactions.push({
                    ...txn.toObject(),
                    claimNumber: claim.claimNumber,
                    claimStatus: claim.status
                });
            }
        }
    }

    return res.json({
        success: true,
        transactions,
        count: transactions.length
    });
});

// ═══════════════════════════════════════════════════════════════
// DUPLICATE CLAIM
// POST /api/hr/expense-claims/:id/duplicate
// ═══════════════════════════════════════════════════════════════

const duplicateClaim = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { id } = req.params;

    const query = firmId ? { firmId, _id: id } : { lawyerId, _id: id };
    const originalClaim = await ExpenseClaim.findOne(query);

    if (!originalClaim) {
        throw CustomException('Expense claim not found', 404);
    }

    // Create new claim with same details
    const newClaimData = originalClaim.toObject();

    // Remove unique fields
    delete newClaimData._id;
    delete newClaimData.claimId;
    delete newClaimData.claimNumber;
    delete newClaimData.createdAt;
    delete newClaimData.updatedAt;

    // Reset status and dates
    newClaimData.status = 'draft';
    newClaimData.submissionDate = null;
    newClaimData.approvalDate = null;
    newClaimData.paymentDate = null;
    newClaimData.createdOn = new Date();
    newClaimData.createdBy = lawyerId;

    // Reset approval workflow
    newClaimData.approvalWorkflow = {
        required: true,
        workflowSteps: [],
        currentStep: 1,
        totalSteps: 1,
        finalStatus: 'pending'
    };

    // Reset payment
    newClaimData.payment = {
        paymentStatus: 'pending'
    };

    // Reset audit trail
    newClaimData.auditTrail = {
        modifications: [],
        statusHistory: [],
        approvalsLog: [],
        paymentLog: []
    };

    // Generate new line item IDs
    if (newClaimData.lineItems) {
        newClaimData.lineItems = newClaimData.lineItems.map(item => ({
            ...item,
            lineItemId: generateLineItemId(),
            receiptStatus: 'missing',
            receiptUrl: null,
            approved: false,
            approvedAmount: null
        }));
    }

    // Clear receipts
    newClaimData.receipts = [];

    const newClaim = new ExpenseClaim(newClaimData);
    await newClaim.save();

    return res.json({
        success: true,
        message: 'Claim duplicated successfully',
        claim: newClaim
    });
});

// ═══════════════════════════════════════════════════════════════
// EXPORT CLAIMS
// GET /api/hr/expense-claims/export
// ═══════════════════════════════════════════════════════════════

const exportClaims = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { startDate, endDate, status, format = 'json' } = req.query;

    const query = firmId ? { firmId } : { lawyerId };

    if (status) query.status = status;
    if (startDate || endDate) {
        query.submissionDate = {};
        if (startDate) query.submissionDate.$gte = new Date(startDate);
        if (endDate) query.submissionDate.$lte = new Date(endDate);
    }

    const claims = await ExpenseClaim.find(query)
        .populate('employeeId', 'employeeId personalInfo.fullNameEnglish')
        .sort({ submissionDate: -1 });

    // Format data for export
    const exportData = claims.map(claim => ({
        claimNumber: claim.claimNumber,
        employeeName: claim.employeeName,
        claimTitle: claim.claimTitle,
        expenseType: claim.expenseType,
        submissionDate: claim.submissionDate,
        status: claim.status,
        totalAmount: claim.totals.grandTotal,
        approvedAmount: claim.totals.approvedAmount,
        paidAmount: claim.totals.paidAmount,
        lineItemsCount: claim.lineItemsCount
    }));

    return res.json({
        success: true,
        data: exportData,
        count: exportData.length
    });
});

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    getClaims,
    getClaim,
    createClaim,
    updateClaim,
    deleteClaim,
    getClaimStats,
    submitClaim,
    approveClaim,
    rejectClaim,
    requestChanges,
    processPayment,
    confirmPayment,
    addLineItem,
    updateLineItem,
    deleteLineItem,
    uploadReceipt,
    deleteReceipt,
    verifyReceipt,
    reconcileCardTransaction,
    checkCompliance,
    approveException,
    markBillable,
    createInvoice,
    bulkDelete,
    getClaimsByEmployee,
    getPendingApprovals,
    getPendingPayments,
    getMileageRates,
    getPolicies,
    getCorporateCardTransactions,
    duplicateClaim,
    exportClaims
};
