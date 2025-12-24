const { Onboarding, Employee } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const mongoose = require('mongoose');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// ═══════════════════════════════════════════════════════════════
// GET ALL ONBOARDINGS
// GET /api/hr/onboarding
// ═══════════════════════════════════════════════════════════════
const getOnboardings = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const {
        status,
        probationStatus,
        department,
        managerId,
        startDateFrom,
        startDateTo,
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
    if (probationStatus) query['probation.probationStatus'] = probationStatus;
    if (department) query.department = department;
    if (managerId) query.managerId = managerId;

    if (startDateFrom || startDateTo) {
        query.startDate = {};
        if (startDateFrom) query.startDate.$gte = new Date(startDateFrom);
        if (startDateTo) query.startDate.$lte = new Date(startDateTo);
    }

    if (search) {
        query.$or = [
            { employeeName: { $regex: search, $options: 'i' } },
            { employeeNameAr: { $regex: search, $options: 'i' } },
            { onboardingId: { $regex: search, $options: 'i' } },
            { onboardingNumber: { $regex: search, $options: 'i' } },
            { employeeNumber: { $regex: search, $options: 'i' } }
        ];
    }

    // Build sort
    const sortField = sortBy === 'startDate' ? 'startDate' :
        sortBy === 'employeeName' ? 'employeeName' :
            sortBy === 'status' ? 'status' :
                sortBy === 'completionPercentage' ? 'completion.completionPercentage' : 'createdAt';
    const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    const [onboardings, total] = await Promise.all([
        Onboarding.find(query)
            .populate('employeeId', 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish employment')
            .populate('managerId', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName')
            .sort(sort)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .lean(),
        Onboarding.countDocuments(query)
    ]);

    return res.json({
        success: true,
        data: onboardings,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET ONBOARDING STATS
// GET /api/hr/onboarding/stats
// ═══════════════════════════════════════════════════════════════
const getOnboardingStats = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const stats = await Onboarding.getStats(firmId, lawyerId);

    return res.json({
        success: true,
        ...stats
    });
});

// ═══════════════════════════════════════════════════════════════
// GET SINGLE ONBOARDING
// GET /api/hr/onboarding/:onboardingId
// ═══════════════════════════════════════════════════════════════
const getOnboarding = asyncHandler(async (req, res) => {
    const { onboardingId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Sanitize onboarding ID
    const sanitizedOnboardingId = sanitizeObjectId(onboardingId);
    if (!sanitizedOnboardingId) {
        throw CustomException('Invalid onboarding ID format', 400);
    }

    const onboarding = await Onboarding.findById(sanitizedOnboardingId)
        .populate('employeeId', 'employeeId personalInfo employment compensation gosi')
        .populate('managerId', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName')
        .populate('lastModifiedBy', 'firstName lastName')
        .populate('firstWeek.buddyAssignment.buddyId', 'personalInfo.fullNameArabic personalInfo.fullNameEnglish');

    if (!onboarding) {
        throw CustomException('Onboarding not found', 404);
    }

    // IDOR Protection - Check access
    const hasAccess = firmId
        ? onboarding.firmId?.toString() === firmId.toString()
        : onboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    return res.json({
        success: true,
        data: onboarding
    });
});

// ═══════════════════════════════════════════════════════════════
// CREATE ONBOARDING
// POST /api/hr/onboarding
// ═══════════════════════════════════════════════════════════════
const createOnboarding = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'employeeId', 'employeeNumber', 'employeeName', 'employeeNameAr',
        'jobTitle', 'jobTitleAr', 'department', 'managerId', 'managerName',
        'startDate', 'completionTargetDate', 'probationPeriod', 'notes'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const {
        employeeId,
        employeeNumber,
        employeeName,
        employeeNameAr,
        jobTitle,
        jobTitleAr,
        department,
        managerId,
        managerName,
        startDate,
        completionTargetDate,
        probationPeriod = 90,
        notes
    } = safeData;

    // Input validation
    if (!employeeId || !startDate) {
        throw CustomException('Employee ID and start date are required', 400);
    }

    // Sanitize ObjectIds
    const sanitizedEmployeeId = sanitizeObjectId(employeeId);
    if (!sanitizedEmployeeId) {
        throw CustomException('Invalid employee ID format', 400);
    }

    if (managerId) {
        const sanitizedManagerId = sanitizeObjectId(managerId);
        if (!sanitizedManagerId) {
            throw CustomException('Invalid manager ID format', 400);
        }
    }

    // Validate probation period (Saudi Labor Law Article 53 - max 180 days)
    if (probationPeriod > 180 || probationPeriod < 0) {
        throw CustomException('Probation period must be between 0 and 180 days as per Saudi Labor Law Article 53', 400);
    }

    // Fetch employee with sanitized ID
    const employee = await Employee.findById(sanitizedEmployeeId);
    if (!employee) {
        throw CustomException('Employee not found', 404);
    }

    // IDOR Protection - Check access to employee
    const hasEmployeeAccess = firmId
        ? employee.firmId?.toString() === firmId.toString()
        : employee.lawyerId?.toString() === lawyerId;

    if (!hasEmployeeAccess) {
        throw CustomException('Access denied to this employee', 403);
    }

    // Check if onboarding already exists for this employee
    const existingOnboarding = await Onboarding.findOne({
        employeeId: sanitizedEmployeeId,
        status: { $nin: ['completed', 'cancelled'] },
        $or: [{ firmId }, { lawyerId }]
    });

    if (existingOnboarding) {
        throw CustomException('An active onboarding already exists for this employee', 400);
    }

    // Calculate target completion date if not provided
    const targetDate = completionTargetDate
        ? new Date(completionTargetDate)
        : new Date(new Date(startDate).getTime() + probationPeriod * 24 * 60 * 60 * 1000);

    // Prepare onboarding data - prevent role escalation by NOT allowing role/permission fields
    const onboardingData = {
        employeeId: sanitizedEmployeeId,
        employeeNumber: employeeNumber || employee.employeeId,
        employeeName,
        employeeNameAr: employeeNameAr || employee.personalInfo?.fullNameArabic,
        nationalId: employee.personalInfo?.nationalId,
        email: employee.personalInfo?.email,
        phone: employee.personalInfo?.mobile,

        jobTitle,
        jobTitleAr: jobTitleAr || employee.employment?.jobTitleArabic,
        department: department || employee.organization?.departmentName || employee.employment?.departmentName,

        employmentType: employee.employment?.employmentType || 'full_time',
        contractType: employee.employment?.contractType || 'indefinite',
        hireDate: employee.employment?.hireDate || startDate,

        managerId: managerId ? sanitizeObjectId(managerId) : null,
        managerName,

        startDate: new Date(startDate),
        completionTargetDate: targetDate,

        probation: {
            probationPeriod,
            probationStartDate: new Date(startDate),
            probationEndDate: new Date(new Date(startDate).getTime() + probationPeriod * 24 * 60 * 60 * 1000),
            onProbation: true,
            probationStatus: 'active'
        },

        status: 'pending',

        notes: notes || {},

        // Security: Explicitly set firmId and lawyerId from authenticated user, NOT from request body
        firmId: firmId || null,
        lawyerId: firmId ? null : lawyerId,
        createdBy: lawyerId
    };

    const onboarding = await Onboarding.create(onboardingData);

    // Populate and return
    await onboarding.populate([
        { path: 'employeeId', select: 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish' },
        { path: 'managerId', select: 'firstName lastName email' },
        { path: 'createdBy', select: 'firstName lastName' }
    ]);

    return res.status(201).json({
        success: true,
        message: 'Onboarding created successfully',
        data: onboarding
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE ONBOARDING
// PATCH /api/hr/onboarding/:onboardingId
// ═══════════════════════════════════════════════════════════════
const updateOnboarding = asyncHandler(async (req, res) => {
    const { onboardingId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Sanitize onboarding ID
    const sanitizedOnboardingId = sanitizeObjectId(onboardingId);
    if (!sanitizedOnboardingId) {
        throw CustomException('Invalid onboarding ID format', 400);
    }

    const onboarding = await Onboarding.findById(sanitizedOnboardingId);

    if (!onboarding) {
        throw CustomException('Onboarding not found', 404);
    }

    // IDOR Protection - Check access
    const hasAccess = firmId
        ? onboarding.firmId?.toString() === firmId.toString()
        : onboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // Prevent updates if completed or cancelled
    if (['completed', 'cancelled'].includes(onboarding.status)) {
        throw CustomException('Cannot update completed or cancelled onboarding', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedUpdates = [
        'employeeName', 'employeeNameAr', 'jobTitle', 'jobTitleAr', 'department',
        'location', 'managerId', 'managerName', 'managerEmail',
        'completionTargetDate', 'notes',
        'preBoarding', 'firstDay', 'firstWeek', 'firstMonth',
        'probationTracking', 'onboardingChecklist', 'trainingCompletion',
        'employeeFeedback', 'documents', 'metrics'
    ];

    const safeUpdates = pickAllowedFields(req.body, allowedUpdates);

    // Prevent role escalation - never allow these fields to be updated
    // firmId, lawyerId, employeeId, createdBy, status should not be updateable via this endpoint

    // Apply updates
    allowedUpdates.forEach(field => {
        if (safeUpdates[field] !== undefined) {
            if (typeof safeUpdates[field] === 'object' && !Array.isArray(safeUpdates[field])) {
                // Deep merge for objects
                onboarding[field] = { ...onboarding[field]?.toObject?.() || onboarding[field] || {}, ...safeUpdates[field] };
            } else {
                onboarding[field] = safeUpdates[field];
            }
        }
    });

    // Sanitize managerId if being updated
    if (safeUpdates.managerId) {
        const sanitizedManagerId = sanitizeObjectId(safeUpdates.managerId);
        if (sanitizedManagerId) {
            onboarding.managerId = sanitizedManagerId;
        }
    }

    onboarding.lastModifiedBy = lawyerId;
    await onboarding.save();

    return res.json({
        success: true,
        message: 'Onboarding updated successfully',
        data: onboarding
    });
});

// ═══════════════════════════════════════════════════════════════
// DELETE ONBOARDING
// DELETE /api/hr/onboarding/:onboardingId
// ═══════════════════════════════════════════════════════════════
const deleteOnboarding = asyncHandler(async (req, res) => {
    const { onboardingId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Sanitize onboarding ID
    const sanitizedOnboardingId = sanitizeObjectId(onboardingId);
    if (!sanitizedOnboardingId) {
        throw CustomException('Invalid onboarding ID format', 400);
    }

    const onboarding = await Onboarding.findById(sanitizedOnboardingId);

    if (!onboarding) {
        throw CustomException('Onboarding not found', 404);
    }

    // IDOR Protection - Check access
    const hasAccess = firmId
        ? onboarding.firmId?.toString() === firmId.toString()
        : onboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // Only allow deletion if pending
    if (onboarding.status !== 'pending') {
        throw CustomException('Only pending onboardings can be deleted', 400);
    }

    await Onboarding.findByIdAndDelete(sanitizedOnboardingId);

    return res.json({
        success: true,
        message: 'Onboarding deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE STATUS
// PATCH /api/hr/onboarding/:onboardingId/status
// ═══════════════════════════════════════════════════════════════
const updateStatus = asyncHandler(async (req, res) => {
    const { onboardingId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Sanitize onboarding ID
    const sanitizedOnboardingId = sanitizeObjectId(onboardingId);
    if (!sanitizedOnboardingId) {
        throw CustomException('Invalid onboarding ID format', 400);
    }

    // Mass assignment protection - only allow status field
    const safeData = pickAllowedFields(req.body, ['status']);
    const { status } = safeData;

    // Input validation
    if (!status) {
        throw CustomException('Status is required', 400);
    }

    const validStatuses = ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'];
    if (!validStatuses.includes(status)) {
        throw CustomException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const onboarding = await Onboarding.findById(sanitizedOnboardingId);

    if (!onboarding) {
        throw CustomException('Onboarding not found', 404);
    }

    // IDOR Protection - Check access
    const hasAccess = firmId
        ? onboarding.firmId?.toString() === firmId.toString()
        : onboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    onboarding.status = status;
    onboarding.lastModifiedBy = lawyerId;

    if (status === 'in_progress' && !onboarding.startedAt) {
        onboarding.startedAt = new Date();
    }

    await onboarding.save();

    return res.json({
        success: true,
        message: `Onboarding status updated to ${status}`,
        data: onboarding
    });
});

// ═══════════════════════════════════════════════════════════════
// COMPLETE TASK
// POST /api/hr/onboarding/:onboardingId/tasks/:taskId/complete
// ═══════════════════════════════════════════════════════════════
const completeTask = asyncHandler(async (req, res) => {
    const { onboardingId, taskId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Sanitize onboarding ID
    const sanitizedOnboardingId = sanitizeObjectId(onboardingId);
    if (!sanitizedOnboardingId) {
        throw CustomException('Invalid onboarding ID format', 400);
    }

    // Mass assignment protection - only allow notes field
    const safeData = pickAllowedFields(req.body, ['notes']);
    const { notes } = safeData;

    const onboarding = await Onboarding.findById(sanitizedOnboardingId);

    if (!onboarding) {
        throw CustomException('Onboarding not found', 404);
    }

    // IDOR Protection - Check access
    const hasAccess = firmId
        ? onboarding.firmId?.toString() === firmId.toString()
        : onboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    let taskFound = false;

    // Search in pre-boarding tasks
    if (onboarding.preBoarding?.preboardingTasks) {
        const task = onboarding.preBoarding.preboardingTasks.find(t => t.taskId === taskId || t._id?.toString() === taskId);
        if (task) {
            task.status = 'completed';
            task.completedDate = new Date();
            task.completedBy = lawyerId;
            if (notes) task.notes = notes;
            taskFound = true;
        }
    }

    // Search in first day tasks
    if (!taskFound && onboarding.firstDay?.firstDayTasks) {
        const task = onboarding.firstDay.firstDayTasks.find(t => t.taskId === taskId || t._id?.toString() === taskId);
        if (task) {
            task.completed = true;
            task.completedTime = new Date();
            if (notes) task.notes = notes;
            taskFound = true;
        }
    }

    // Search in first week tasks
    if (!taskFound && onboarding.firstWeek?.firstWeekTasks) {
        const task = onboarding.firstWeek.firstWeekTasks.find(t => t.taskId === taskId || t._id?.toString() === taskId);
        if (task) {
            task.completed = true;
            task.completedDate = new Date();
            if (notes) task.notes = notes;
            taskFound = true;
        }
    }

    // Search in checklist categories
    if (!taskFound && onboarding.onboardingChecklist?.categories) {
        for (const category of onboarding.onboardingChecklist.categories) {
            const task = category.tasks?.find(t => t.taskId === taskId || t._id?.toString() === taskId);
            if (task) {
                task.status = 'completed';
                task.completedDate = new Date();
                task.completedBy = lawyerId;
                if (notes) task.notes = notes;
                taskFound = true;
                break;
            }
        }
    }

    if (!taskFound) {
        throw CustomException('Task not found', 404);
    }

    onboarding.lastModifiedBy = lawyerId;
    await onboarding.save();

    return res.json({
        success: true,
        message: 'Task completed successfully',
        data: onboarding
    });
});

// ═══════════════════════════════════════════════════════════════
// ADD PROBATION REVIEW
// POST /api/hr/onboarding/:onboardingId/probation-reviews
// ═══════════════════════════════════════════════════════════════
const addProbationReview = asyncHandler(async (req, res) => {
    const { onboardingId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Sanitize onboarding ID
    const sanitizedOnboardingId = sanitizeObjectId(onboardingId);
    if (!sanitizedOnboardingId) {
        throw CustomException('Invalid onboarding ID format', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'reviewType', 'reviewDay', 'scheduledDate', 'conducted',
        'conductedDate', 'conductedBy', 'performanceAssessment',
        'competencyRatings', 'goalsProgress', 'strengths',
        'areasForImprovement', 'managerComments', 'employeeComments',
        'recommendation', 'recommendationReason', 'actionItems', 'nextReviewDate'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const {
        reviewType,
        reviewDay,
        scheduledDate,
        conducted,
        conductedDate,
        conductedBy,
        performanceAssessment,
        competencyRatings,
        goalsProgress,
        strengths,
        areasForImprovement,
        managerComments,
        employeeComments,
        recommendation,
        recommendationReason,
        actionItems,
        nextReviewDate
    } = safeData;

    const onboarding = await Onboarding.findById(sanitizedOnboardingId);

    if (!onboarding) {
        throw CustomException('Onboarding not found', 404);
    }

    // IDOR Protection - Check access
    const hasAccess = firmId
        ? onboarding.firmId?.toString() === firmId.toString()
        : onboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // Input validation
    if (!reviewType || !scheduledDate) {
        throw CustomException('Review type and scheduled date are required', 400);
    }

    // Validate review type
    const validReviewTypes = ['30_day', '60_day', '90_day', 'mid_probation', 'final'];
    if (!validReviewTypes.includes(reviewType)) {
        throw CustomException('Invalid review type', 400);
    }

    // Create review object
    const review = {
        reviewId: `REV-${Date.now()}`,
        reviewType,
        reviewDay: reviewDay || parseInt(reviewType.replace('_day', '')) || 0,
        scheduledDate: new Date(scheduledDate),
        conducted: conducted || false,
        conductedDate: conducted ? (conductedDate ? new Date(conductedDate) : new Date()) : null,
        conductedBy: conducted ? (conductedBy || lawyerId) : null,
        performanceAssessment: performanceAssessment || {},
        competencyRatings: competencyRatings || [],
        goalsProgress: goalsProgress || [],
        strengths: strengths || [],
        areasForImprovement: areasForImprovement || [],
        managerComments: managerComments || '',
        employeeComments: employeeComments || '',
        recommendation: recommendation || 'on_track',
        recommendationReason: recommendationReason || '',
        actionItems: actionItems || [],
        nextReviewDate: nextReviewDate ? new Date(nextReviewDate) : null,
        employeeAcknowledged: false
    };

    // Initialize probationTracking if needed
    if (!onboarding.probationTracking) {
        onboarding.probationTracking = { probationReviews: [] };
    }
    if (!onboarding.probationTracking.probationReviews) {
        onboarding.probationTracking.probationReviews = [];
    }

    onboarding.probationTracking.probationReviews.push(review);
    onboarding.lastModifiedBy = lawyerId;
    await onboarding.save();

    return res.status(201).json({
        success: true,
        message: 'Probation review added successfully',
        data: review
    });
});

// ═══════════════════════════════════════════════════════════════
// COMPLETE PROBATION
// POST /api/hr/onboarding/:onboardingId/complete-probation
// ═══════════════════════════════════════════════════════════════
const completeProbation = asyncHandler(async (req, res) => {
    const { onboardingId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Sanitize onboarding ID
    const sanitizedOnboardingId = sanitizeObjectId(onboardingId);
    if (!sanitizedOnboardingId) {
        throw CustomException('Invalid onboarding ID format', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'decision', 'decisionReason', 'confirmationDate',
        'salaryReview', 'benefitsActivation', 'terminationDate',
        'terminationReason', 'terminationArticle', 'severancePayable', 'severanceAmount'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const {
        decision, // 'confirm' or 'terminate' (NO 'extend' option per Saudi Labor Law)
        decisionReason,
        confirmationDate,
        salaryReview,
        benefitsActivation,
        terminationDate,
        terminationReason,
        terminationArticle,
        severancePayable,
        severanceAmount
    } = safeData;

    // Input validation
    if (!decision) {
        throw CustomException('Decision is required', 400);
    }

    // Validate decision (prevent role escalation - only allow confirm or terminate)
    const validDecisions = ['confirm', 'terminate'];
    if (!validDecisions.includes(decision)) {
        throw CustomException('Invalid decision. Must be either "confirm" or "terminate"', 400);
    }

    const onboarding = await Onboarding.findById(sanitizedOnboardingId);

    if (!onboarding) {
        throw CustomException('Onboarding not found', 404);
    }

    // IDOR Protection - Check access
    const hasAccess = firmId
        ? onboarding.firmId?.toString() === firmId.toString()
        : onboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // Check if probation is active
    if (onboarding.probation.probationStatus !== 'active') {
        throw CustomException('Probation is not active', 400);
    }

    // Update probation tracking final review
    if (!onboarding.probationTracking.finalReview) {
        onboarding.probationTracking.finalReview = {};
    }

    onboarding.probationTracking.finalReview.conducted = true;
    onboarding.probationTracking.finalReview.conductedDate = new Date();
    onboarding.probationTracking.finalReview.decision = decision;
    onboarding.probationTracking.finalReview.decisionReason = decisionReason;
    onboarding.probationTracking.finalReview.hrProcessed = true;
    onboarding.probationTracking.finalReview.processedDate = new Date();
    onboarding.probationTracking.finalReview.processedBy = lawyerId;

    if (decision === 'confirm') {
        // Update probation status
        onboarding.probation.probationStatus = 'passed';
        onboarding.probation.onProbation = false;
        onboarding.probationTracking.probationInfo.currentStatus = 'passed';

        // Set confirmation details
        onboarding.probationTracking.finalReview.confirmation = {
            confirmationDate: confirmationDate ? new Date(confirmationDate) : new Date(),
            salaryReview: salaryReview || {},
            benefitsActivation: benefitsActivation || {}
        };

        // Update onboarding completion
        onboarding.onboardingCompletion.probationStatus = 'passed';
        onboarding.onboardingCompletion.onboardingSuccessful = true;

        // Issue confirmation letter
        onboarding.onboardingCompletion.confirmationLetter = {
            issued: true,
            issueDate: new Date()
        };

    } else if (decision === 'terminate') {
        // Update probation status
        onboarding.probation.probationStatus = 'failed';
        onboarding.probation.onProbation = false;
        onboarding.probationTracking.probationInfo.currentStatus = 'failed';

        // Set termination details
        onboarding.probationTracking.finalReview.termination = {
            terminationDate: terminationDate ? new Date(terminationDate) : new Date(),
            terminationReason: terminationReason || decisionReason,
            terminationArticle: terminationArticle || 'Article 53',
            severancePayable: severancePayable || false,
            severanceAmount: severanceAmount || 0,
            noticeGiven: true,
            noticePeriod: 0 // No notice required during probation per Article 53
        };

        // Update onboarding status
        onboarding.status = 'cancelled';
        onboarding.onboardingCompletion.probationStatus = 'failed';
        onboarding.onboardingCompletion.onboardingSuccessful = false;
    }

    onboarding.lastModifiedBy = lawyerId;
    await onboarding.save();

    return res.json({
        success: true,
        message: decision === 'confirm'
            ? 'Probation completed successfully - Employee confirmed'
            : 'Probation terminated',
        data: onboarding
    });
});

// ═══════════════════════════════════════════════════════════════
// UPLOAD DOCUMENT
// POST /api/hr/onboarding/:onboardingId/documents
// ═══════════════════════════════════════════════════════════════
const uploadDocument = asyncHandler(async (req, res) => {
    const { onboardingId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Sanitize onboarding ID
    const sanitizedOnboardingId = sanitizeObjectId(onboardingId);
    if (!sanitizedOnboardingId) {
        throw CustomException('Invalid onboarding ID format', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'documentType', 'documentName', 'documentNameAr',
        'fileUrl', 'required', 'expiryDate'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const {
        documentType,
        documentName,
        documentNameAr,
        fileUrl,
        required,
        expiryDate
    } = safeData;

    const onboarding = await Onboarding.findById(sanitizedOnboardingId);

    if (!onboarding) {
        throw CustomException('Onboarding not found', 404);
    }

    // IDOR Protection - Check access
    const hasAccess = firmId
        ? onboarding.firmId?.toString() === firmId.toString()
        : onboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // Input validation
    if (!documentType || !fileUrl) {
        throw CustomException('Document type and file URL are required', 400);
    }

    // Sanitize document upload - validate file URL format
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (!urlPattern.test(fileUrl)) {
        throw CustomException('Invalid file URL format', 400);
    }

    // Validate document type (prevent injection)
    const validDocumentTypes = [
        'national_id', 'passport', 'contract', 'tax_form', 'bank_info',
        'certificate', 'license', 'medical_report', 'background_check',
        'education_certificate', 'experience_letter', 'other'
    ];

    if (!validDocumentTypes.includes(documentType)) {
        throw CustomException('Invalid document type', 400);
    }

    const document = {
        documentType,
        documentName: documentName || documentType,
        documentNameAr,
        required: Boolean(required),
        fileUrl,
        uploadedOn: new Date(),
        uploadedBy: lawyerId,
        signed: false,
        expiryDate: expiryDate ? new Date(expiryDate) : null
    };

    onboarding.documents.push(document);
    onboarding.lastModifiedBy = lawyerId;
    await onboarding.save();

    return res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: document
    });
});

// ═══════════════════════════════════════════════════════════════
// VERIFY DOCUMENT
// POST /api/hr/onboarding/:onboardingId/documents/:type/verify
// ═══════════════════════════════════════════════════════════════
const verifyDocument = asyncHandler(async (req, res) => {
    const { onboardingId, type } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Sanitize onboarding ID
    const sanitizedOnboardingId = sanitizeObjectId(onboardingId);
    if (!sanitizedOnboardingId) {
        throw CustomException('Invalid onboarding ID format', 400);
    }

    const onboarding = await Onboarding.findById(sanitizedOnboardingId);

    if (!onboarding) {
        throw CustomException('Onboarding not found', 404);
    }

    // IDOR Protection - Check access
    const hasAccess = firmId
        ? onboarding.firmId?.toString() === firmId.toString()
        : onboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // Find in documents array
    let document = onboarding.documents.find(d => d.documentType === type);

    // Also check pre-boarding documents
    if (!document && onboarding.preBoarding?.documentsCollection?.documentsRequired) {
        document = onboarding.preBoarding.documentsCollection.documentsRequired.find(d => d.documentType === type);
        if (document) {
            document.verified = true;
            document.verifiedBy = lawyerId;
            document.verificationDate = new Date();
        }
    }

    if (document && onboarding.documents.includes(document)) {
        document.signed = true;
        document.signedDate = new Date();
    }

    if (!document) {
        throw CustomException('Document not found', 404);
    }

    // Check if all documents are collected
    if (onboarding.preBoarding?.documentsCollection?.documentsRequired) {
        const allCollected = onboarding.preBoarding.documentsCollection.documentsRequired.every(d => d.submitted);
        const allVerified = onboarding.preBoarding.documentsCollection.documentsRequired.every(d => d.verified);
        onboarding.preBoarding.documentsCollection.allDocumentsCollected = allCollected;
        onboarding.preBoarding.documentsCollection.documentationComplete = allVerified;
    }

    onboarding.lastModifiedBy = lawyerId;
    await onboarding.save();

    return res.json({
        success: true,
        message: 'Document verified successfully',
        data: document
    });
});

// ═══════════════════════════════════════════════════════════════
// COMPLETE FIRST DAY
// POST /api/hr/onboarding/:onboardingId/complete-first-day
// ═══════════════════════════════════════════════════════════════
const completeFirstDay = asyncHandler(async (req, res) => {
    const { onboardingId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Sanitize onboarding ID
    const sanitizedOnboardingId = sanitizeObjectId(onboardingId);
    if (!sanitizedOnboardingId) {
        throw CustomException('Invalid onboarding ID format', 400);
    }

    // Mass assignment protection - only allow feedback field
    const safeData = pickAllowedFields(req.body, ['feedback']);
    const { feedback } = safeData;

    const onboarding = await Onboarding.findById(sanitizedOnboardingId);

    if (!onboarding) {
        throw CustomException('Onboarding not found', 404);
    }

    // IDOR Protection - Check access
    const hasAccess = firmId
        ? onboarding.firmId?.toString() === firmId.toString()
        : onboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    onboarding.firstDay.firstDayComplete = true;

    if (feedback) {
        onboarding.firstDay.firstDayFeedback = {
            provided: true,
            ...feedback
        };
    }

    // Update status to in_progress if still pending
    if (onboarding.status === 'pending') {
        onboarding.status = 'in_progress';
    }

    onboarding.lastModifiedBy = lawyerId;
    await onboarding.save();

    return res.json({
        success: true,
        message: 'First day completed successfully',
        data: onboarding
    });
});

// ═══════════════════════════════════════════════════════════════
// COMPLETE FIRST WEEK
// POST /api/hr/onboarding/:onboardingId/complete-first-week
// ═══════════════════════════════════════════════════════════════
const completeFirstWeek = asyncHandler(async (req, res) => {
    const { onboardingId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Sanitize onboarding ID
    const sanitizedOnboardingId = sanitizeObjectId(onboardingId);
    if (!sanitizedOnboardingId) {
        throw CustomException('Invalid onboarding ID format', 400);
    }

    // Mass assignment protection - only allow weeklyCheckIn field
    const safeData = pickAllowedFields(req.body, ['weeklyCheckIn']);
    const { weeklyCheckIn } = safeData;

    const onboarding = await Onboarding.findById(sanitizedOnboardingId);

    if (!onboarding) {
        throw CustomException('Onboarding not found', 404);
    }

    // IDOR Protection - Check access
    const hasAccess = firmId
        ? onboarding.firmId?.toString() === firmId.toString()
        : onboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    onboarding.firstWeek.firstWeekComplete = true;
    onboarding.firstWeek.firstWeekCompletionDate = new Date();

    if (weeklyCheckIn) {
        onboarding.firstWeek.weeklyCheckIn = {
            ...onboarding.firstWeek.weeklyCheckIn?.toObject?.() || {},
            ...weeklyCheckIn,
            conducted: true,
            conductedDate: new Date(),
            conductedBy: lawyerId
        };
    }

    onboarding.lastModifiedBy = lawyerId;
    await onboarding.save();

    return res.json({
        success: true,
        message: 'First week completed successfully',
        data: onboarding
    });
});

// ═══════════════════════════════════════════════════════════════
// COMPLETE FIRST MONTH
// POST /api/hr/onboarding/:onboardingId/complete-first-month
// ═══════════════════════════════════════════════════════════════
const completeFirstMonth = asyncHandler(async (req, res) => {
    const { onboardingId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Sanitize onboarding ID
    const sanitizedOnboardingId = sanitizeObjectId(onboardingId);
    if (!sanitizedOnboardingId) {
        throw CustomException('Invalid onboarding ID format', 400);
    }

    // Mass assignment protection - only allow initialFeedback field
    const safeData = pickAllowedFields(req.body, ['initialFeedback']);
    const { initialFeedback } = safeData;

    const onboarding = await Onboarding.findById(sanitizedOnboardingId);

    if (!onboarding) {
        throw CustomException('Onboarding not found', 404);
    }

    // IDOR Protection - Check access
    const hasAccess = firmId
        ? onboarding.firmId?.toString() === firmId.toString()
        : onboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    onboarding.firstMonth.firstMonthComplete = true;
    onboarding.firstMonth.firstMonthCompletionDate = new Date();

    if (initialFeedback) {
        onboarding.firstMonth.initialFeedback = {
            ...onboarding.firstMonth.initialFeedback?.toObject?.() || {},
            ...initialFeedback,
            conducted: true,
            conductedDate: new Date()
        };
    }

    onboarding.lastModifiedBy = lawyerId;
    await onboarding.save();

    return res.json({
        success: true,
        message: 'First month completed successfully',
        data: onboarding
    });
});

// ═══════════════════════════════════════════════════════════════
// COMPLETE ONBOARDING
// POST /api/hr/onboarding/:onboardingId/complete
// ═══════════════════════════════════════════════════════════════
const completeOnboarding = asyncHandler(async (req, res) => {
    const { onboardingId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Sanitize onboarding ID
    const sanitizedOnboardingId = sanitizeObjectId(onboardingId);
    if (!sanitizedOnboardingId) {
        throw CustomException('Invalid onboarding ID format', 400);
    }

    // Mass assignment protection - only allow finalReview and outstandingItems fields
    const safeData = pickAllowedFields(req.body, ['finalReview', 'outstandingItems']);
    const { finalReview, outstandingItems } = safeData;

    const onboarding = await Onboarding.findById(sanitizedOnboardingId);

    if (!onboarding) {
        throw CustomException('Onboarding not found', 404);
    }

    // IDOR Protection - Check access
    const hasAccess = firmId
        ? onboarding.firmId?.toString() === firmId.toString()
        : onboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // Update completion
    onboarding.status = 'completed';
    onboarding.onboardingCompletion.allTasksCompleted = true;
    onboarding.onboardingCompletion.completionDate = new Date();
    onboarding.onboardingCompletion.onboardingSuccessful = true;
    onboarding.onboardingCompletion.onboardingClosed = true;
    onboarding.onboardingCompletion.closedDate = new Date();
    onboarding.onboardingCompletion.closedBy = lawyerId;

    if (finalReview) {
        onboarding.onboardingCompletion.finalReview = {
            conducted: true,
            conductedBy: lawyerId,
            conductedDate: new Date(),
            overallAssessment: finalReview.overallAssessment,
            readyForFullRole: finalReview.readyForFullRole ?? true,
            outstandingItems: outstandingItems || [],
            handoffToManager: true,
            handoffDate: new Date()
        };
    }

    // Calculate metrics
    if (onboarding.startDate) {
        const durationMs = new Date() - new Date(onboarding.startDate);
        onboarding.metrics.totalDurationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
    }

    onboarding.lastModifiedBy = lawyerId;
    await onboarding.save();

    return res.json({
        success: true,
        message: 'Onboarding completed successfully',
        data: onboarding
    });
});

// ═══════════════════════════════════════════════════════════════
// BULK DELETE
// POST /api/hr/onboarding/bulk-delete
// ═══════════════════════════════════════════════════════════════
const bulkDelete = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { ids } = req.body;

    // Build query to ensure access
    const query = {
        _id: { $in: ids },
        status: 'pending' // Only allow deletion of pending onboardings
    };

    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const result = await Onboarding.deleteMany(query);

    return res.json({
        success: true,
        message: `${result.deletedCount} onboarding(s) deleted successfully`,
        deletedCount: result.deletedCount
    });
});

// ═══════════════════════════════════════════════════════════════
// GET BY EMPLOYEE
// GET /api/hr/onboarding/by-employee/:employeeId
// ═══════════════════════════════════════════════════════════════
const getByEmployee = asyncHandler(async (req, res) => {
    const { employeeId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Sanitize employee ID
    const sanitizedEmployeeId = sanitizeObjectId(employeeId);
    if (!sanitizedEmployeeId) {
        throw CustomException('Invalid employee ID format', 400);
    }

    // IDOR Protection - Only allow access to own firm/lawyer data
    const query = { employeeId: sanitizedEmployeeId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const onboardings = await Onboarding.find(query)
        .populate('employeeId', 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish')
        .populate('managerId', 'firstName lastName email')
        .sort({ createdAt: -1 });

    return res.json({
        success: true,
        data: onboardings
    });
});

// ═══════════════════════════════════════════════════════════════
// GET UPCOMING REVIEWS
// GET /api/hr/onboarding/upcoming-reviews
// ═══════════════════════════════════════════════════════════════
const getUpcomingReviews = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { days = 30 } = req.query;

    const upcomingReviews = await Onboarding.getUpcomingReviews(firmId, lawyerId, parseInt(days));

    return res.json({
        success: true,
        data: upcomingReviews
    });
});

// ═══════════════════════════════════════════════════════════════
// ADD CHECKLIST CATEGORY
// POST /api/hr/onboarding/:onboardingId/checklist/categories
// ═══════════════════════════════════════════════════════════════
const addChecklistCategory = asyncHandler(async (req, res) => {
    const { onboardingId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Sanitize onboarding ID
    const sanitizedOnboardingId = sanitizeObjectId(onboardingId);
    if (!sanitizedOnboardingId) {
        throw CustomException('Invalid onboarding ID format', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['categoryName', 'categoryNameAr', 'tasks'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const { categoryName, categoryNameAr, tasks } = safeData;

    // Input validation
    if (!categoryName) {
        throw CustomException('Category name is required', 400);
    }

    const onboarding = await Onboarding.findById(sanitizedOnboardingId);

    if (!onboarding) {
        throw CustomException('Onboarding not found', 404);
    }

    // IDOR Protection - Check access
    const hasAccess = firmId
        ? onboarding.firmId?.toString() === firmId.toString()
        : onboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    const category = {
        categoryId: `CAT-${Date.now()}`,
        categoryName,
        categoryNameAr,
        tasks: (tasks || []).map((task, index) => ({
            taskId: `TASK-${Date.now()}-${index}`,
            ...task,
            status: task.status || 'not_started'
        })),
        completionPercentage: 0
    };

    if (!onboarding.onboardingChecklist) {
        onboarding.onboardingChecklist = { categories: [] };
    }
    if (!onboarding.onboardingChecklist.categories) {
        onboarding.onboardingChecklist.categories = [];
    }

    onboarding.onboardingChecklist.categories.push(category);
    onboarding.lastModifiedBy = lawyerId;
    await onboarding.save();

    return res.status(201).json({
        success: true,
        message: 'Checklist category added successfully',
        data: category
    });
});

// ═══════════════════════════════════════════════════════════════
// ADD CHECKLIST TASK
// POST /api/hr/onboarding/:onboardingId/checklist/categories/:categoryId/tasks
// ═══════════════════════════════════════════════════════════════
const addChecklistTask = asyncHandler(async (req, res) => {
    const { onboardingId, categoryId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Sanitize onboarding ID
    const sanitizedOnboardingId = sanitizeObjectId(onboardingId);
    if (!sanitizedOnboardingId) {
        throw CustomException('Invalid onboarding ID format', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'taskName', 'taskNameAr', 'description',
        'responsible', 'responsiblePerson', 'dueDate', 'priority'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const { taskName, taskNameAr, description, responsible, responsiblePerson, dueDate, priority } = safeData;

    // Input validation
    if (!taskName) {
        throw CustomException('Task name is required', 400);
    }

    const onboarding = await Onboarding.findById(sanitizedOnboardingId);

    if (!onboarding) {
        throw CustomException('Onboarding not found', 404);
    }

    // IDOR Protection - Check access
    const hasAccess = firmId
        ? onboarding.firmId?.toString() === firmId.toString()
        : onboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    const category = onboarding.onboardingChecklist?.categories?.find(
        c => c.categoryId === categoryId || c._id?.toString() === categoryId
    );

    if (!category) {
        throw CustomException('Category not found', 404);
    }

    const task = {
        taskId: `TASK-${Date.now()}`,
        taskName,
        taskNameAr,
        description,
        responsible: responsible || 'hr',
        responsiblePerson,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || 'medium',
        status: 'not_started'
    };

    category.tasks.push(task);
    onboarding.lastModifiedBy = lawyerId;
    await onboarding.save();

    return res.status(201).json({
        success: true,
        message: 'Task added successfully',
        data: task
    });
});

// ═══════════════════════════════════════════════════════════════
// ADD EMPLOYEE FEEDBACK
// POST /api/hr/onboarding/:onboardingId/feedback
// ═══════════════════════════════════════════════════════════════
const addEmployeeFeedback = asyncHandler(async (req, res) => {
    const { onboardingId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Sanitize onboarding ID
    const sanitizedOnboardingId = sanitizeObjectId(onboardingId);
    if (!sanitizedOnboardingId) {
        throw CustomException('Invalid onboarding ID format', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'sessionType', 'overallSatisfaction', 'experienceRatings',
        'positiveAspects', 'challenges', 'suggestions',
        'questionsOrConcerns', 'wouldRecommend'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const {
        sessionType,
        overallSatisfaction,
        experienceRatings,
        positiveAspects,
        challenges,
        suggestions,
        questionsOrConcerns,
        wouldRecommend
    } = safeData;

    // Input validation
    if (!sessionType) {
        throw CustomException('Session type is required', 400);
    }

    // Validate satisfaction rating
    if (overallSatisfaction && (overallSatisfaction < 1 || overallSatisfaction > 5)) {
        throw CustomException('Overall satisfaction must be between 1 and 5', 400);
    }

    const onboarding = await Onboarding.findById(sanitizedOnboardingId);

    if (!onboarding) {
        throw CustomException('Onboarding not found', 404);
    }

    // IDOR Protection - Check access
    const hasAccess = firmId
        ? onboarding.firmId?.toString() === firmId.toString()
        : onboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    const feedbackSession = {
        sessionDate: new Date(),
        sessionType,
        overallSatisfaction,
        experienceRatings,
        positiveAspects,
        challenges,
        suggestions,
        questionsOrConcerns,
        wouldRecommend
    };

    if (!onboarding.employeeFeedback) {
        onboarding.employeeFeedback = { feedbackSessions: [] };
    }
    if (!onboarding.employeeFeedback.feedbackSessions) {
        onboarding.employeeFeedback.feedbackSessions = [];
    }

    onboarding.employeeFeedback.feedbackSessions.push(feedbackSession);

    // Calculate aggregated feedback
    const sessions = onboarding.employeeFeedback.feedbackSessions;
    const satisfactionSum = sessions.reduce((sum, s) => sum + (s.overallSatisfaction || 0), 0);
    onboarding.employeeFeedback.aggregatedFeedback = {
        averageSatisfaction: sessions.length > 0 ? satisfactionSum / sessions.length : 0
    };

    onboarding.lastModifiedBy = lawyerId;
    await onboarding.save();

    return res.status(201).json({
        success: true,
        message: 'Feedback added successfully',
        data: feedbackSession
    });
});

module.exports = {
    getOnboardings,
    getOnboardingStats,
    getOnboarding,
    createOnboarding,
    updateOnboarding,
    deleteOnboarding,
    updateStatus,
    completeTask,
    addProbationReview,
    completeProbation,
    uploadDocument,
    verifyDocument,
    completeFirstDay,
    completeFirstWeek,
    completeFirstMonth,
    completeOnboarding,
    bulkDelete,
    getByEmployee,
    getUpcomingReviews,
    addChecklistCategory,
    addChecklistTask,
    addEmployeeFeedback
};
