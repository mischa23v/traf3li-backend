const { LeaveRequest, Employee, LeaveBalance } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// GET ALL LEAVE REQUESTS
// GET /api/leave-requests
// ═══════════════════════════════════════════════════════════════
const getLeaveRequests = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const {
        status,
        leaveType,
        employeeId,
        department,
        startDate,
        endDate,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
    } = req.query;

    // Build query
    const query = firmId ? { firmId } : { lawyerId };

    if (status) query.status = status;
    if (leaveType) query.leaveType = leaveType;
    if (employeeId) query.employeeId = employeeId;
    if (department) query.department = department;

    if (startDate || endDate) {
        query['dates.startDate'] = {};
        if (startDate) query['dates.startDate'].$gte = new Date(startDate);
        if (endDate) query['dates.startDate'].$lte = new Date(endDate);
    }

    if (search) {
        query.$or = [
            { employeeName: { $regex: search, $options: 'i' } },
            { employeeNameAr: { $regex: search, $options: 'i' } },
            { requestId: { $regex: search, $options: 'i' } },
            { requestNumber: { $regex: search, $options: 'i' } },
            { employeeNumber: { $regex: search, $options: 'i' } }
        ];
    }

    // Build sort
    const sortField = sortBy === 'startDate' ? 'dates.startDate' :
        sortBy === 'employeeName' ? 'employeeName' :
            sortBy === 'status' ? 'status' :
                sortBy === 'leaveType' ? 'leaveType' : 'createdAt';
    const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    const leaveRequests = await LeaveRequest.find(query)
        .populate('employeeId', 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish')
        .populate('approvedBy', 'firstName lastName')
        .populate('rejectedBy', 'firstName lastName')
        .populate('createdBy', 'firstName lastName')
        .sort(sort)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await LeaveRequest.countDocuments(query);

    return res.json({
        success: true,
        leaveRequests,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET SINGLE LEAVE REQUEST
// GET /api/leave-requests/:id
// ═══════════════════════════════════════════════════════════════
const getLeaveRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const leaveRequest = await LeaveRequest.findById(id)
        .populate('employeeId', 'employeeId personalInfo employment')
        .populate('approvedBy', 'firstName lastName')
        .populate('rejectedBy', 'firstName lastName')
        .populate('createdBy', 'firstName lastName')
        .populate('workHandover.handoverTo', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic')
        .populate('returnFromLeave.confirmedBy', 'firstName lastName');

    if (!leaveRequest) {
        throw CustomException('Leave request not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? leaveRequest.firmId?.toString() === firmId.toString()
        : leaveRequest.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    return res.json({
        success: true,
        leaveRequest
    });
});

// ═══════════════════════════════════════════════════════════════
// CREATE LEAVE REQUEST
// POST /api/leave-requests
// ═══════════════════════════════════════════════════════════════
const createLeaveRequest = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const {
        employeeId,
        leaveType,
        dates,
        reason,
        reasonAr,
        leaveDetails,
        workHandover,
        notes
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

    // Check for conflicts
    const conflicts = await LeaveRequest.checkConflicts(
        employeeId,
        new Date(dates.startDate),
        new Date(dates.endDate),
        null,
        firmId,
        lawyerId,
        employee.organization?.departmentName || employee.employment?.departmentName
    );

    // Get current balance from LeaveBalance model
    const year = new Date().getFullYear();
    const balance = await LeaveBalance.getOrCreateBalance(employeeId, year, firmId, lawyerId);

    // Get current balance for leave type
    let currentBalance = 0;
    switch (leaveType) {
        case 'annual':
            currentBalance = balance.annualLeave?.remaining || 0;
            break;
        case 'sick':
            currentBalance = balance.sickLeave?.totalRemaining || 0;
            break;
        case 'hajj':
            currentBalance = balance.hajjLeave?.eligible && !balance.hajjLeave?.taken ? 15 : 0;
            break;
        case 'marriage':
            currentBalance = balance.marriageLeave?.used ? 0 : 3;
            break;
        case 'birth':
            currentBalance = balance.birthLeave?.remaining || 0;
            break;
        case 'death':
            currentBalance = balance.deathLeave?.remaining || 0;
            break;
        case 'maternity':
            currentBalance = balance.maternityLeave?.remaining || 0;
            break;
        case 'paternity':
            currentBalance = balance.paternityLeave?.remaining || 0;
            break;
        default:
            currentBalance = 0;
    }

    // Prepare leave request data
    const requestData = {
        employeeId,
        employeeNumber: employee.employeeId,
        employeeName: employee.personalInfo?.fullNameEnglish || employee.personalInfo?.fullNameArabic,
        employeeNameAr: employee.personalInfo?.fullNameArabic,
        nationalId: employee.personalInfo?.nationalId,
        department: employee.organization?.departmentName || employee.employment?.departmentName,
        jobTitle: employee.employment?.jobTitle || employee.employment?.jobTitleArabic,

        leaveType,
        dates: {
            startDate: new Date(dates.startDate),
            endDate: new Date(dates.endDate),
            halfDay: dates.halfDay || false,
            halfDayPeriod: dates.halfDayPeriod
        },

        reason,
        reasonAr,
        leaveDetails: leaveDetails || {},
        workHandover: workHandover || { required: false },
        notes: notes || {},
        conflicts,

        balanceBefore: currentBalance,
        status: 'draft',
        requestedOn: new Date(),

        firmId,
        lawyerId,
        createdBy: lawyerId
    };

    const leaveRequest = await LeaveRequest.create(requestData);

    return res.status(201).json({
        success: true,
        message: 'Leave request created successfully',
        leaveRequest
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE LEAVE REQUEST
// PATCH /api/leave-requests/:id
// ═══════════════════════════════════════════════════════════════
const updateLeaveRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const leaveRequest = await LeaveRequest.findById(id);

    if (!leaveRequest) {
        throw CustomException('Leave request not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? leaveRequest.firmId?.toString() === firmId.toString()
        : leaveRequest.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // Only allow updates if status is draft or submitted
    if (!['draft', 'submitted'].includes(leaveRequest.status)) {
        throw CustomException('Only draft or submitted leave requests can be updated', 400);
    }

    const {
        leaveType,
        dates,
        reason,
        reasonAr,
        leaveDetails,
        workHandover,
        notes
    } = req.body;

    // Update fields
    if (leaveType) leaveRequest.leaveType = leaveType;
    if (reason !== undefined) leaveRequest.reason = reason;
    if (reasonAr !== undefined) leaveRequest.reasonAr = reasonAr;

    if (dates) {
        if (dates.startDate) leaveRequest.dates.startDate = new Date(dates.startDate);
        if (dates.endDate) leaveRequest.dates.endDate = new Date(dates.endDate);
        if (dates.halfDay !== undefined) leaveRequest.dates.halfDay = dates.halfDay;
        if (dates.halfDayPeriod) leaveRequest.dates.halfDayPeriod = dates.halfDayPeriod;
    }

    if (leaveDetails) {
        leaveRequest.leaveDetails = { ...leaveRequest.leaveDetails?.toObject(), ...leaveDetails };
    }

    if (workHandover) {
        leaveRequest.workHandover = { ...leaveRequest.workHandover?.toObject(), ...workHandover };
    }

    if (notes) {
        leaveRequest.notes = { ...leaveRequest.notes?.toObject(), ...notes };
    }

    // Recheck conflicts if dates changed
    if (dates?.startDate || dates?.endDate) {
        const conflicts = await LeaveRequest.checkConflicts(
            leaveRequest.employeeId,
            leaveRequest.dates.startDate,
            leaveRequest.dates.endDate,
            leaveRequest._id,
            firmId,
            lawyerId
        );
        leaveRequest.conflicts = conflicts;
    }

    await leaveRequest.save();

    return res.json({
        success: true,
        message: 'Leave request updated successfully',
        leaveRequest
    });
});

// ═══════════════════════════════════════════════════════════════
// DELETE LEAVE REQUEST
// DELETE /api/leave-requests/:id
// ═══════════════════════════════════════════════════════════════
const deleteLeaveRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const leaveRequest = await LeaveRequest.findById(id);

    if (!leaveRequest) {
        throw CustomException('Leave request not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? leaveRequest.firmId?.toString() === firmId.toString()
        : leaveRequest.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // Only allow deletion if status is draft
    if (leaveRequest.status !== 'draft') {
        throw CustomException('Only draft leave requests can be deleted', 400);
    }

    await LeaveRequest.findByIdAndDelete(id);

    return res.json({
        success: true,
        message: 'Leave request deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// SUBMIT LEAVE REQUEST
// POST /api/leave-requests/:id/submit
// ═══════════════════════════════════════════════════════════════
const submitLeaveRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const leaveRequest = await LeaveRequest.findById(id);

    if (!leaveRequest) {
        throw CustomException('Leave request not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? leaveRequest.firmId?.toString() === firmId.toString()
        : leaveRequest.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    if (leaveRequest.status !== 'draft') {
        throw CustomException('Only draft leave requests can be submitted', 400);
    }

    // Check for conflicts
    if (leaveRequest.conflicts?.hasConflicts) {
        const errors = leaveRequest.conflicts.overlappingLeaves?.filter(c => c.severity === 'high' || c.severity === 'critical');
        if (errors && errors.length > 0) {
            throw CustomException('Cannot submit: leave request has conflicts', 400);
        }
    }

    leaveRequest.status = 'pending_approval';
    leaveRequest.submittedOn = new Date();

    // Setup approval workflow
    leaveRequest.approvalWorkflow = {
        required: true,
        steps: [{
            stepNumber: 1,
            stepName: 'Manager Approval',
            stepNameAr: 'موافقة المدير',
            approverRole: 'manager',
            status: 'pending',
            notificationSent: true,
            notificationDate: new Date()
        }],
        currentStep: 1,
        totalSteps: 1,
        finalStatus: 'pending'
    };

    await leaveRequest.save();

    return res.json({
        success: true,
        message: 'Leave request submitted for approval',
        leaveRequest
    });
});

// ═══════════════════════════════════════════════════════════════
// APPROVE LEAVE REQUEST
// POST /api/leave-requests/:id/approve
// ═══════════════════════════════════════════════════════════════
const approveLeaveRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { comments } = req.body;

    const leaveRequest = await LeaveRequest.findById(id);

    if (!leaveRequest) {
        throw CustomException('Leave request not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? leaveRequest.firmId?.toString() === firmId.toString()
        : leaveRequest.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    if (!['submitted', 'pending_approval'].includes(leaveRequest.status)) {
        throw CustomException('Only submitted or pending leave requests can be approved', 400);
    }

    // Calculate balance after
    const daysToDeduct = leaveRequest.dates.workingDays || leaveRequest.dates.totalDays || 0;
    leaveRequest.balanceAfter = leaveRequest.balanceBefore - daysToDeduct;

    // Deduct from LeaveBalance
    const year = new Date().getFullYear();
    const updatedBalance = await LeaveBalance.deductLeave(
        leaveRequest.employeeId,
        year,
        leaveRequest.leaveType,
        daysToDeduct,
        firmId,
        lawyerId
    );

    // Update balance impact with detailed information
    leaveRequest.balanceImpact = {
        balanceBefore: {
            annualLeave: updatedBalance.annualLeave?.remaining + (leaveRequest.leaveType === 'annual' ? daysToDeduct : 0),
            sickLeave: updatedBalance.sickLeave?.totalRemaining + (leaveRequest.leaveType === 'sick' ? daysToDeduct : 0),
            hajjLeave: !updatedBalance.hajjLeave?.taken
        },
        deducted: {
            annualLeave: leaveRequest.leaveType === 'annual' ? daysToDeduct : 0,
            sickLeave: leaveRequest.leaveType === 'sick' ? daysToDeduct : 0,
            unpaidLeave: leaveRequest.leaveType === 'unpaid' ? daysToDeduct : 0
        },
        balanceAfter: {
            annualLeave: updatedBalance.annualLeave?.remaining,
            sickLeave: updatedBalance.sickLeave?.totalRemaining,
            hajjLeave: !updatedBalance.hajjLeave?.taken
        }
    };

    // Update approval workflow if exists
    if (leaveRequest.approvalWorkflow?.steps?.length > 0) {
        const currentStep = leaveRequest.approvalWorkflow.steps[leaveRequest.approvalWorkflow.currentStep - 1];
        if (currentStep) {
            currentStep.status = 'approved';
            currentStep.approverId = lawyerId;
            currentStep.actionDate = new Date();
            currentStep.comments = comments;
        }
        leaveRequest.approvalWorkflow.finalStatus = 'approved';
    }

    leaveRequest.status = 'approved';
    leaveRequest.approvedBy = lawyerId;
    leaveRequest.approvedOn = new Date();
    leaveRequest.approvalComments = comments;

    await leaveRequest.save();

    return res.json({
        success: true,
        message: 'Leave request approved successfully',
        leaveRequest
    });
});

// ═══════════════════════════════════════════════════════════════
// REJECT LEAVE REQUEST
// POST /api/leave-requests/:id/reject
// ═══════════════════════════════════════════════════════════════
const rejectLeaveRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { reason } = req.body;

    const leaveRequest = await LeaveRequest.findById(id);

    if (!leaveRequest) {
        throw CustomException('Leave request not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? leaveRequest.firmId?.toString() === firmId.toString()
        : leaveRequest.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    if (!['submitted', 'pending_approval'].includes(leaveRequest.status)) {
        throw CustomException('Only submitted or pending leave requests can be rejected', 400);
    }

    leaveRequest.status = 'rejected';
    leaveRequest.rejectedBy = lawyerId;
    leaveRequest.rejectedOn = new Date();
    leaveRequest.rejectionReason = reason;

    await leaveRequest.save();

    return res.json({
        success: true,
        message: 'Leave request rejected',
        leaveRequest
    });
});

// ═══════════════════════════════════════════════════════════════
// CANCEL LEAVE REQUEST
// POST /api/leave-requests/:id/cancel
// ═══════════════════════════════════════════════════════════════
const cancelLeaveRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { reason } = req.body;

    // Get user info for name
    const User = require('../models/user.model');
    const user = await User.findById(lawyerId);

    const leaveRequest = await LeaveRequest.findById(id);

    if (!leaveRequest) {
        throw CustomException('Leave request not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? leaveRequest.firmId?.toString() === firmId.toString()
        : leaveRequest.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    if (leaveRequest.status === 'completed') {
        throw CustomException('Completed leave requests cannot be cancelled', 400);
    }

    // Restore balance if was approved
    const restoreBalance = leaveRequest.status === 'approved';
    const daysToRestore = leaveRequest.dates.workingDays || leaveRequest.dates.totalDays || 0;

    if (restoreBalance && daysToRestore > 0) {
        const year = new Date().getFullYear();
        await LeaveBalance.restoreLeave(
            leaveRequest.employeeId,
            year,
            leaveRequest.leaveType,
            daysToRestore,
            firmId,
            lawyerId
        );
    }

    leaveRequest.status = 'cancelled';
    leaveRequest.cancellation = {
        cancelled: true,
        cancellationDate: new Date(),
        cancelledBy: lawyerId,
        cancellationReason: reason,
        balanceRestored: restoreBalance,
        restoredAmount: restoreBalance ? daysToRestore : 0
    };

    await leaveRequest.save();

    return res.json({
        success: true,
        message: 'Leave request cancelled',
        leaveRequest
    });
});

// ═══════════════════════════════════════════════════════════════
// CONFIRM RETURN FROM LEAVE
// POST /api/leave-requests/:id/confirm-return
// ═══════════════════════════════════════════════════════════════
const confirmReturn = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { actualReturnDate, notes } = req.body;

    const leaveRequest = await LeaveRequest.findById(id);

    if (!leaveRequest) {
        throw CustomException('Leave request not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? leaveRequest.firmId?.toString() === firmId.toString()
        : leaveRequest.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    if (leaveRequest.status !== 'approved') {
        throw CustomException('Only approved leave requests can have return confirmed', 400);
    }

    const returnDate = actualReturnDate ? new Date(actualReturnDate) : new Date();
    const expectedReturn = leaveRequest.returnFromLeave?.expectedReturnDate;

    // Check if early or late return
    let earlyReturn = false;
    let lateReturn = false;
    let lateDays = 0;

    if (expectedReturn) {
        if (returnDate < expectedReturn) {
            earlyReturn = true;
        } else if (returnDate > expectedReturn) {
            lateReturn = true;
            const diffTime = returnDate - expectedReturn;
            lateDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
    }

    leaveRequest.returnFromLeave = {
        ...leaveRequest.returnFromLeave?.toObject(),
        actualReturnDate: returnDate,
        returnConfirmed: true,
        confirmedBy: lawyerId,
        confirmedOn: new Date(),
        earlyReturn,
        lateReturn,
        lateDays,
        notes
    };

    leaveRequest.status = 'completed';

    await leaveRequest.save();

    return res.json({
        success: true,
        message: 'Return from leave confirmed',
        leaveRequest
    });
});

// ═══════════════════════════════════════════════════════════════
// REQUEST EXTENSION
// POST /api/leave-requests/:id/request-extension
// ═══════════════════════════════════════════════════════════════
const requestExtension = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { newEndDate, reason } = req.body;

    const leaveRequest = await LeaveRequest.findById(id);

    if (!leaveRequest) {
        throw CustomException('Leave request not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? leaveRequest.firmId?.toString() === firmId.toString()
        : leaveRequest.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    if (leaveRequest.status !== 'approved') {
        throw CustomException('Only approved leave requests can be extended', 400);
    }

    const newEnd = new Date(newEndDate);
    if (newEnd <= leaveRequest.dates.endDate) {
        throw CustomException('New end date must be after current end date', 400);
    }

    // Calculate extension days
    const diffTime = newEnd - leaveRequest.dates.endDate;
    const extensionDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Create extension request as new leave request
    const extensionRequest = await LeaveRequest.create({
        employeeId: leaveRequest.employeeId,
        employeeNumber: leaveRequest.employeeNumber,
        employeeName: leaveRequest.employeeName,
        employeeNameAr: leaveRequest.employeeNameAr,
        nationalId: leaveRequest.nationalId,
        department: leaveRequest.department,
        jobTitle: leaveRequest.jobTitle,

        leaveType: leaveRequest.leaveType,
        dates: {
            startDate: new Date(leaveRequest.dates.endDate.getTime() + 24 * 60 * 60 * 1000),
            endDate: newEnd
        },

        reason,
        status: 'pending_approval',
        submittedOn: new Date(),

        isExtension: true,
        originalRequestId: leaveRequest._id,
        extensionDays,

        firmId,
        lawyerId,
        createdBy: lawyerId
    });

    return res.status(201).json({
        success: true,
        message: 'Extension request created',
        extensionRequest
    });
});

// ═══════════════════════════════════════════════════════════════
// COMPLETE HANDOVER
// POST /api/leave-requests/:id/complete-handover
// ═══════════════════════════════════════════════════════════════
const completeHandover = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { tasks } = req.body;

    const leaveRequest = await LeaveRequest.findById(id);

    if (!leaveRequest) {
        throw CustomException('Leave request not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? leaveRequest.firmId?.toString() === firmId.toString()
        : leaveRequest.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    leaveRequest.workHandover.handoverCompleted = true;
    leaveRequest.workHandover.handoverCompletedOn = new Date();

    if (tasks && Array.isArray(tasks)) {
        leaveRequest.workHandover.tasks = tasks;
    }

    await leaveRequest.save();

    return res.json({
        success: true,
        message: 'Handover completed',
        leaveRequest
    });
});

// ═══════════════════════════════════════════════════════════════
// UPLOAD DOCUMENT
// POST /api/leave-requests/:id/documents
// ═══════════════════════════════════════════════════════════════
const uploadDocument = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { documentType, documentName, fileUrl } = req.body;

    const leaveRequest = await LeaveRequest.findById(id);

    if (!leaveRequest) {
        throw CustomException('Leave request not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? leaveRequest.firmId?.toString() === firmId.toString()
        : leaveRequest.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    leaveRequest.documents.push({
        documentType,
        documentName: documentName || documentType,
        fileUrl,
        uploadedOn: new Date(),
        uploadedBy: lawyerId,
        verified: false
    });

    await leaveRequest.save();

    return res.json({
        success: true,
        message: 'Document uploaded successfully',
        leaveRequest
    });
});

// ═══════════════════════════════════════════════════════════════
// GET LEAVE BALANCE
// GET /api/leave-requests/balance/:employeeId
// ═══════════════════════════════════════════════════════════════
const getLeaveBalance = asyncHandler(async (req, res) => {
    const { employeeId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Verify employee access
    const employee = await Employee.findById(employeeId);
    if (!employee) {
        throw CustomException('Employee not found', 404);
    }

    const hasAccess = firmId
        ? employee.firmId?.toString() === firmId.toString()
        : employee.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // Get or create balance from LeaveBalance model
    const year = new Date().getFullYear();
    const balance = await LeaveBalance.getOrCreateBalance(employeeId, year, firmId, lawyerId);

    // Get employee entitlements based on years of service
    const yearsOfService = employee.yearsOfService || 0;

    return res.json({
        success: true,
        employeeId,
        employeeName: employee.personalInfo?.fullNameEnglish || employee.personalInfo?.fullNameArabic,
        employeeNumber: employee.employeeId,
        yearsOfService,
        year,
        balance: {
            annualLeave: balance.annualLeave,
            sickLeave: balance.sickLeave,
            hajjLeave: balance.hajjLeave,
            marriageLeave: balance.marriageLeave,
            birthLeave: balance.birthLeave,
            deathLeave: balance.deathLeave,
            maternityLeave: balance.maternityLeave,
            paternityLeave: balance.paternityLeave,
            examLeave: balance.examLeave,
            unpaidLeave: balance.unpaidLeave,
            totalStats: balance.totalStats
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET LEAVE STATISTICS
// GET /api/leave-requests/stats
// ═══════════════════════════════════════════════════════════════
const getLeaveStats = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { month, year } = req.query;

    const stats = await LeaveRequest.getStats(
        firmId,
        lawyerId,
        month ? parseInt(month) : null,
        year ? parseInt(year) : new Date().getFullYear()
    );

    return res.json({
        success: true,
        stats
    });
});

// ═══════════════════════════════════════════════════════════════
// GET TEAM CALENDAR
// GET /api/leave-requests/calendar
// ═══════════════════════════════════════════════════════════════
const getTeamCalendar = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { startDate, endDate, department } = req.query;

    const query = firmId ? { firmId } : { lawyerId };
    query.status = { $in: ['approved', 'completed'] };
    query.$or = [
        { 'dates.startDate': { $gte: new Date(startDate), $lte: new Date(endDate) } },
        { 'dates.endDate': { $gte: new Date(startDate), $lte: new Date(endDate) } },
        {
            'dates.startDate': { $lte: new Date(startDate) },
            'dates.endDate': { $gte: new Date(endDate) }
        }
    ];

    if (department) {
        query.department = department;
    }

    const leaves = await LeaveRequest.find(query)
        .select('employeeId employeeName employeeNameAr department leaveType leaveTypeName dates.startDate dates.endDate dates.workingDays')
        .sort({ 'dates.startDate': 1 });

    // Group by date
    const calendar = {};
    leaves.forEach(leave => {
        const current = new Date(leave.dates.startDate);
        const end = new Date(leave.dates.endDate);

        while (current <= end) {
            const dateKey = current.toISOString().split('T')[0];
            if (!calendar[dateKey]) {
                calendar[dateKey] = [];
            }
            calendar[dateKey].push({
                _id: leave._id,
                employeeId: leave.employeeId,
                employeeName: leave.employeeName,
                employeeNameAr: leave.employeeNameAr,
                department: leave.department,
                leaveType: leave.leaveType,
                leaveTypeName: leave.leaveTypeName
            });
            current.setDate(current.getDate() + 1);
        }
    });

    return res.json({
        success: true,
        calendar,
        leaves
    });
});

// ═══════════════════════════════════════════════════════════════
// CHECK CONFLICTS
// POST /api/leave-requests/check-conflicts
// ═══════════════════════════════════════════════════════════════
const checkConflicts = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { employeeId, startDate, endDate, excludeRequestId } = req.body;

    const conflicts = await LeaveRequest.checkConflicts(
        employeeId,
        new Date(startDate),
        new Date(endDate),
        excludeRequestId,
        firmId,
        lawyerId
    );

    return res.json({
        success: true,
        ...conflicts
    });
});

// ═══════════════════════════════════════════════════════════════
// GET PENDING APPROVALS
// GET /api/leave-requests/pending-approvals
// ═══════════════════════════════════════════════════════════════
const getPendingApprovals = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { page = 1, limit = 20 } = req.query;

    const query = firmId ? { firmId } : { lawyerId };
    query.status = { $in: ['submitted', 'pending_approval'] };

    const pendingRequests = await LeaveRequest.find(query)
        .populate('employeeId', 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish')
        .sort({ submittedOn: 1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await LeaveRequest.countDocuments(query);

    return res.json({
        success: true,
        pendingRequests,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET LEAVE TYPES (OPTIONS)
// GET /api/leave-requests/types
// ═══════════════════════════════════════════════════════════════
const getLeaveTypes = asyncHandler(async (req, res) => {
    const leaveTypes = LeaveRequest.LEAVE_TYPES;

    return res.json({
        success: true,
        leaveTypes: Object.entries(leaveTypes).map(([key, value]) => ({
            value: key,
            label: value.name,
            labelAr: value.nameAr,
            article: value.article,
            maxDays: value.maxDays,
            paid: value.paid
        }))
    });
});

// ═══════════════════════════════════════════════════════════════
// BULK DELETE LEAVE REQUESTS
// POST /api/leave-requests/bulk-delete
// ═══════════════════════════════════════════════════════════════
const bulkDeleteLeaveRequests = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw CustomException('يجب توفير قائمة المعرفات / IDs list is required', 400);
    }

    // Build access query - only delete draft leave requests
    const accessQuery = firmId
        ? { _id: { $in: ids }, firmId, status: 'draft' }
        : { _id: { $in: ids }, lawyerId, status: 'draft' };

    const result = await LeaveRequest.deleteMany(accessQuery);

    return res.json({
        success: true,
        message: `تم حذف ${result.deletedCount} طلب إجازة بنجاح / ${result.deletedCount} leave request(s) deleted successfully`,
        deletedCount: result.deletedCount
    });
});

module.exports = {
    getLeaveRequests,
    getLeaveRequest,
    createLeaveRequest,
    updateLeaveRequest,
    deleteLeaveRequest,
    bulkDeleteLeaveRequests,
    submitLeaveRequest,
    approveLeaveRequest,
    rejectLeaveRequest,
    cancelLeaveRequest,
    confirmReturn,
    requestExtension,
    completeHandover,
    uploadDocument,
    getLeaveBalance,
    getLeaveStats,
    getTeamCalendar,
    checkConflicts,
    getPendingApprovals,
    getLeaveTypes
};
