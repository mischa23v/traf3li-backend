const mongoose = require('mongoose');
const { Training, Employee, ExpenseClaim, User } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const { v4: uuidv4 } = require('uuid');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

/**
 * Training Controller - HR Management
 * Module 13: التدريب والتطوير (Training & Development)
 * Comprehensive training management including CLE tracking for attorneys
 */

// ═══════════════════════════════════════════════════════════════
// TRAINING POLICIES (Configurable)
// ═══════════════════════════════════════════════════════════════

const TRAINING_POLICIES = {
    approvalThresholds: {
        level1: 5000, // Manager approval for costs up to 5000 SAR
        level2: 15000, // Department head for costs up to 15000 SAR
        level3: 50000 // Director/CEO for costs above 15000 SAR
    },
    attendanceRequirements: {
        minimumPercentage: 80,
        graceMinutes: 15
    },
    assessmentRequirements: {
        passingScore: 70,
        maxRetakes: 2
    },
    cleRequirements: {
        annualCredits: 15,
        ethicsCredits: 3,
        specialtyCredits: 5
    },
    complianceGracePeriod: 30,
    submissionDeadlineDays: 30
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// Generate unique assessment ID
function generateAssessmentId() {
    return `ASM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate unique communication ID
function generateCommunicationId() {
    return `COM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate unique document ID
function generateDocumentId() {
    return `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate certificate number
function generateCertificateNumber(trainingNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    return `CERT-${trainingNumber}-${timestamp}`;
}

// Get approval workflow based on cost
function getApprovalWorkflow(totalCost) {
    const steps = [];

    if (totalCost >= TRAINING_POLICIES.approvalThresholds.level1) {
        steps.push({
            stepNumber: 1,
            stepName: 'Manager Approval',
            stepNameAr: 'موافقة المدير',
            approverRole: 'manager',
            status: 'pending',
            notificationSent: false
        });
    }

    if (totalCost >= TRAINING_POLICIES.approvalThresholds.level2) {
        steps.push({
            stepNumber: steps.length + 1,
            stepName: 'Department Head Approval',
            stepNameAr: 'موافقة رئيس القسم',
            approverRole: 'department_head',
            status: 'pending',
            notificationSent: false
        });
    }

    if (totalCost >= TRAINING_POLICIES.approvalThresholds.level3) {
        steps.push({
            stepNumber: steps.length + 1,
            stepName: 'Director Approval',
            stepNameAr: 'موافقة المدير التنفيذي',
            approverRole: 'director',
            status: 'pending',
            notificationSent: false
        });
    }

    // Add HR approval for all requests
    steps.push({
        stepNumber: steps.length + 1,
        stepName: 'HR Approval',
        stepNameAr: 'موافقة الموارد البشرية',
        approverRole: 'hr',
        status: 'pending',
        notificationSent: false
    });

    return steps;
}

// Calculate attendance percentage
function calculateAttendancePercentage(sessions) {
    if (!sessions || sessions.length === 0) return 0;
    const attended = sessions.filter(s => s.attended).length;
    return Math.round((attended / sessions.length) * 100);
}

// Calculate average rating from evaluation
function calculateAverageRating(ratings) {
    if (!ratings) return null;
    const values = Object.values(ratings).filter(v => typeof v === 'number' && v > 0);
    if (values.length === 0) return null;
    return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10;
}

// ═══════════════════════════════════════════════════════════════
// GET ALL TRAININGS
// GET /api/hr/trainings
// ═══════════════════════════════════════════════════════════════

const getTrainings = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const isSoloLawyer = req.isSoloLawyer;
    const query = {};
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    // Filters
    const {
        status, trainingType, trainingCategory, department, employeeId,
        deliveryMethod, isMandatory, isCLE, dateFrom, dateTo,
        search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    if (status) query.status = status;
    if (trainingType) query.trainingType = trainingType;
    if (trainingCategory) query.trainingCategory = trainingCategory;
    if (department) query.department = department;
    if (employeeId) query.employeeId = employeeId;
    if (deliveryMethod) query.deliveryMethod = deliveryMethod;

    if (isMandatory === 'true') query['complianceTracking.isMandatory'] = true;
    if (isMandatory === 'false') query['complianceTracking.isMandatory'] = false;

    if (isCLE === 'true') query['cleDetails.isCLE'] = true;
    if (isCLE === 'false') query['cleDetails.isCLE'] = false;

    if (dateFrom || dateTo) {
        query.startDate = {};
        if (dateFrom) query.startDate.$gte = new Date(dateFrom);
        if (dateTo) query.startDate.$lte = new Date(dateTo);
    }

    if (search) {
        query.$or = [
            { trainingNumber: { $regex: search, $options: 'i' } },
            { trainingTitle: { $regex: search, $options: 'i' } },
            { trainingTitleAr: { $regex: search, $options: 'i' } },
            { employeeName: { $regex: search, $options: 'i' } },
            { employeeNameAr: { $regex: search, $options: 'i' } },
            { employeeNumber: { $regex: search, $options: 'i' } }
        ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const trainings = await Training.find(query)
        .populate('employeeId', 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish')
        .populate('createdBy', 'firstName lastName')
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .sort(sortOptions);

    const total = await Training.countDocuments(query);

    return res.json({
        success: true,
        trainings,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET SINGLE TRAINING
// GET /api/hr/trainings/:trainingId
// ═══════════════════════════════════════════════════════════════

const getTraining = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { trainingId } = req.params;

    const isSoloLawyer = req.isSoloLawyer;
    const query = { _id: trainingId };
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const training = await Training.findOne(query)
        .populate('employeeId', 'employeeId personalInfo compensation')
        .populate('createdBy', 'firstName lastName')
        .populate('approvalWorkflow.workflowSteps.approverId', 'firstName lastName')
        .populate('provider.trainerId', 'personalInfo.fullNameEnglish')
        .populate('relatedRecords.performanceReviewId')
        .populate('relatedRecords.relatedTrainings', 'trainingNumber trainingTitle status')
        .populate('relatedRecords.expenseClaimIds', 'claimNumber status');

    if (!training) {
        throw CustomException('Training not found', 404);
    }

    return res.json({
        success: true,
        training
    });
});

// ═══════════════════════════════════════════════════════════════
// CREATE TRAINING
// POST /api/hr/trainings
// ═══════════════════════════════════════════════════════════════

const createTraining = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'employeeId', 'trainingTitle', 'trainingTitleAr', 'trainingDescription',
        'trainingDescriptionAr', 'trainingType', 'trainingCategory', 'deliveryMethod',
        'difficultyLevel', 'urgency', 'startDate', 'endDate', 'duration', 'locationType',
        'venue', 'virtualDetails', 'provider', 'cleDetails', 'costs', 'complianceTracking',
        'businessJustification', 'businessJustificationAr', 'justificationDetails',
        'trainingObjectives', 'learningOutcomes', 'travelRequired', 'travelDetails',
        'technicalRequirements', 'requestedBy'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const {
        employeeId, trainingTitle, trainingTitleAr, trainingDescription,
        trainingDescriptionAr, trainingType, trainingCategory, deliveryMethod,
        difficultyLevel, urgency, startDate, endDate, duration, locationType,
        venue, virtualDetails, provider, cleDetails, costs, complianceTracking,
        businessJustification, businessJustificationAr, justificationDetails,
        trainingObjectives, learningOutcomes, travelRequired, travelDetails,
        technicalRequirements, requestedBy
    } = safeData;

    // Input validation
    if (!employeeId || !trainingTitle || !startDate || !endDate) {
        throw CustomException('Required fields missing: employeeId, trainingTitle, startDate, endDate', 400);
    }

    // Validate ObjectId
    const sanitizedEmployeeId = sanitizeObjectId(employeeId);
    if (!sanitizedEmployeeId) {
        throw CustomException('Invalid employee ID format', 400);
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw CustomException('Invalid date format', 400);
    }
    if (end < start) {
        throw CustomException('End date must be after start date', 400);
    }

    // Validate employee and IDOR protection
    const employee = await Employee.findById(sanitizedEmployeeId);
    if (!employee) {
        throw CustomException('Employee not found', 404);
    }

    // IDOR Protection - verify employee belongs to the same firm/lawyer
    if (firmId && employee.firmId?.toString() !== firmId.toString()) {
        throw CustomException('Employee not found', 404);
    }
    if (!firmId && employee.lawyerId?.toString() !== lawyerId.toString()) {
        throw CustomException('Employee not found', 404);
    }

    // Generate training number and ID
    const trainingNumber = await Training.generateTrainingNumber(firmId);
    const trainingIdGenerated = await Training.generateTrainingId();

    // Calculate total cost
    const baseFee = costs?.trainingFee?.baseFee || 0;
    const discountAmount = costs?.trainingFee?.discount?.discountAmount || 0;
    const netTrainingFee = baseFee - discountAmount;
    const additionalCostsTotal = (costs?.additionalCosts || []).reduce((sum, c) => sum + (c.amount || 0), 0);
    const totalCost = netTrainingFee + additionalCostsTotal;

    // Generate approval workflow based on cost
    const workflowSteps = getApprovalWorkflow(totalCost);

    const training = new Training({
        firmId,
        lawyerId: !firmId ? lawyerId : undefined,

        // Identification
        trainingId: trainingIdGenerated,
        trainingNumber,

        // Employee info
        employeeId: sanitizedEmployeeId,
        employeeNumber: employee.employeeId,
        employeeName: employee.personalInfo?.fullNameEnglish || employee.personalInfo?.fullNameArabic,
        employeeNameAr: employee.personalInfo?.fullNameArabic,
        department: employee.employment?.department,
        jobTitle: employee.employment?.jobTitle,

        // Training details
        trainingTitle,
        trainingTitleAr,
        trainingDescription,
        trainingDescriptionAr,
        trainingType,
        trainingCategory,
        deliveryMethod: deliveryMethod || 'classroom',
        difficultyLevel: difficultyLevel || 'intermediate',
        urgency: urgency || 'medium',
        trainingObjectives,
        learningOutcomes,

        // Request info
        requestDate: new Date(),
        requestedBy: requestedBy || 'employee',
        businessJustification,
        businessJustificationAr,
        justificationDetails,
        requestStatus: 'draft',

        // Dates & Duration
        startDate,
        endDate,
        duration: {
            totalHours: duration?.totalHours || 0,
            totalDays: duration?.totalDays,
            sessionsCount: duration?.sessionsCount,
            hoursPerSession: duration?.hoursPerSession,
            studyTime: duration?.studyTime
        },

        // Location
        locationType: locationType || 'on_site',
        venue,
        virtualDetails,
        travelRequired: travelRequired || false,
        travelDetails,
        technicalRequirements,

        // Provider
        provider,

        // CLE Details (for attorneys)
        cleDetails,

        // Status
        status: 'requested',

        // Approval workflow
        approvalWorkflow: {
            required: totalCost >= TRAINING_POLICIES.approvalThresholds.level1,
            workflowSteps,
            currentStep: 1,
            totalSteps: workflowSteps.length,
            finalStatus: 'pending'
        },

        // Costs
        costs: {
            trainingFee: {
                baseFee,
                currency: costs?.trainingFee?.currency || 'SAR',
                discount: costs?.trainingFee?.discount,
                netTrainingFee
            },
            additionalCosts: costs?.additionalCosts || [],
            totalAdditionalCosts: additionalCostsTotal,
            totalCost,
            costAllocation: costs?.costAllocation || { companyPaid: totalCost, employeePaid: 0 },
            budgetTracking: costs?.budgetTracking,
            payment: {
                paymentRequired: totalCost > 0,
                paymentStatus: 'pending',
                payments: [],
                totalPaid: 0,
                outstandingAmount: totalCost
            }
        },

        // Compliance
        complianceTracking: {
            isMandatory: complianceTracking?.isMandatory || false,
            mandatoryReason: complianceTracking?.mandatoryReason,
            complianceDeadline: complianceTracking?.complianceDeadline,
            gracePeriod: complianceTracking?.gracePeriod || TRAINING_POLICIES.complianceGracePeriod,
            overdue: false,
            daysOverdue: 0,
            consequencesOfNonCompliance: complianceTracking?.consequencesOfNonCompliance,
            regulatoryBody: complianceTracking?.regulatoryBody,
            renewal: complianceTracking?.renewal
        },

        // Completion (initialized)
        completion: {
            completed: false,
            completionCriteria: {
                attendanceRequired: true,
                assessmentRequired: false,
                projectRequired: false,
                allCriteriaMet: false
            },
            finalResults: {
                passed: false
            }
        },

        // Certificate (initialized)
        certificate: {
            issued: false
        },

        // Enrollment (initialized)
        enrollment: {
            enrolled: false
        },

        // Attendance summary (initialized)
        attendanceSummary: {
            totalSessions: 0,
            attendedSessions: 0,
            missedSessions: 0,
            attendancePercentage: 0,
            minimumRequired: TRAINING_POLICIES.attendanceRequirements.minimumPercentage,
            meetsMinimum: false,
            totalHoursAttended: 0
        },

        // Progress (initialized)
        progress: {
            completedModules: 0,
            progressPercentage: 0
        },

        // Evaluation (initialized)
        evaluation: {
            evaluationCompleted: false
        },

        // Audit
        createdOn: new Date(),
        createdBy: req.userID
    });

    await training.save();

    return res.status(201).json({
        success: true,
        message: 'Training request created successfully',
        training
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE TRAINING
// PATCH /api/hr/trainings/:trainingId
// ═══════════════════════════════════════════════════════════════

const updateTraining = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { trainingId } = req.params;

    // Validate and sanitize trainingId
    const sanitizedTrainingId = sanitizeObjectId(trainingId);
    if (!sanitizedTrainingId) {
        throw CustomException('Invalid training ID format', 400);
    }

    // IDOR Protection - verify firmId/lawyerId ownership
    const isSoloLawyer = req.isSoloLawyer;
    const query = { _id: sanitizedTrainingId };
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const training = await Training.findOne(query);
    if (!training) {
        throw CustomException('Training not found', 404);
    }

    // Additional IDOR check - ensure training belongs to correct firm/lawyer
    if (firmId && training.firmId?.toString() !== firmId.toString()) {
        throw CustomException('Training not found', 404);
    }
    if (!firmId && training.lawyerId?.toString() !== lawyerId.toString()) {
        throw CustomException('Training not found', 404);
    }

    // Only allow updates in certain statuses
    if (!['requested', 'approved', 'enrolled'].includes(training.status)) {
        throw CustomException(`Cannot update training in ${training.status} status`, 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedUpdates = [
        'trainingTitle', 'trainingTitleAr', 'trainingDescription', 'trainingDescriptionAr',
        'trainingType', 'trainingCategory', 'deliveryMethod', 'difficultyLevel', 'urgency',
        'startDate', 'endDate', 'duration', 'locationType', 'venue', 'virtualDetails',
        'provider', 'cleDetails', 'costs', 'complianceTracking', 'businessJustification',
        'businessJustificationAr', 'justificationDetails', 'trainingObjectives',
        'learningOutcomes', 'travelRequired', 'travelDetails', 'technicalRequirements',
        'notes'
    ];

    const safeData = pickAllowedFields(req.body, allowedUpdates);

    // Validate dates if being updated
    if (safeData.startDate || safeData.endDate) {
        const start = safeData.startDate ? new Date(safeData.startDate) : training.startDate;
        const end = safeData.endDate ? new Date(safeData.endDate) : training.endDate;

        if ((safeData.startDate && isNaN(start.getTime())) || (safeData.endDate && isNaN(end.getTime()))) {
            throw CustomException('Invalid date format', 400);
        }
        if (end < start) {
            throw CustomException('End date must be after start date', 400);
        }
    }

    // Apply updates
    allowedUpdates.forEach(field => {
        if (safeData[field] !== undefined) {
            if (field === 'costs') {
                // Handle costs update carefully
                Object.assign(training.costs, safeData[field]);
            } else if (typeof safeData[field] === 'object' && !Array.isArray(safeData[field])) {
                Object.assign(training[field], safeData[field]);
            } else {
                training[field] = safeData[field];
            }
        }
    });

    training.lastModifiedBy = req.userID;
    await training.save();

    return res.json({
        success: true,
        message: 'Training updated successfully',
        training
    });
});

// ═══════════════════════════════════════════════════════════════
// DELETE TRAINING
// DELETE /api/hr/trainings/:trainingId
// ═══════════════════════════════════════════════════════════════

const deleteTraining = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { trainingId } = req.params;

    // Validate and sanitize trainingId
    const sanitizedTrainingId = sanitizeObjectId(trainingId);
    if (!sanitizedTrainingId) {
        throw CustomException('Invalid training ID format', 400);
    }

    // IDOR Protection - verify firmId/lawyerId ownership
    const isSoloLawyer = req.isSoloLawyer;
    const query = { _id: sanitizedTrainingId };
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const training = await Training.findOne(query);
    if (!training) {
        throw CustomException('Training not found', 404);
    }

    // Additional IDOR check
    if (firmId && training.firmId?.toString() !== firmId.toString()) {
        throw CustomException('Training not found', 404);
    }
    if (!firmId && training.lawyerId?.toString() !== lawyerId.toString()) {
        throw CustomException('Training not found', 404);
    }

    // Only allow deletion in draft or requested status
    if (!['requested'].includes(training.status) && training.requestStatus !== 'draft') {
        throw CustomException(`Cannot delete training in ${training.status} status`, 400);
    }

    await Training.findByIdAndDelete(sanitizedTrainingId);

    return res.json({
        success: true,
        message: 'Training deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// SUBMIT TRAINING REQUEST
// POST /api/hr/trainings/:trainingId/submit
// ═══════════════════════════════════════════════════════════════

const submitTraining = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { trainingId } = req.params;

    const query = firmId ? { firmId, _id: trainingId } : { lawyerId, _id: trainingId };

    const training = await Training.findOne(query);
    if (!training) {
        throw CustomException('Training not found', 404);
    }

    if (training.requestStatus !== 'draft' && training.status !== 'requested') {
        throw CustomException('Training request has already been submitted', 400);
    }

    // Validate required fields
    if (!training.trainingTitle || !training.startDate || !training.endDate) {
        throw CustomException('Missing required fields for submission', 400);
    }

    training.requestStatus = 'submitted';
    training.requestDate = new Date();

    // Set first approval step to pending
    if (training.approvalWorkflow.workflowSteps.length > 0) {
        training.approvalWorkflow.workflowSteps[0].status = 'pending';
        training.approvalWorkflow.workflowSteps[0].notificationSent = true;
    }

    training.lastModifiedBy = req.userID;
    await training.save();

    return res.json({
        success: true,
        message: 'Training request submitted successfully',
        training
    });
});

// ═══════════════════════════════════════════════════════════════
// APPROVE TRAINING
// POST /api/hr/trainings/:trainingId/approve
// ═══════════════════════════════════════════════════════════════

const approveTraining = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { trainingId } = req.params;

    // Validate and sanitize trainingId
    const sanitizedTrainingId = sanitizeObjectId(trainingId);
    if (!sanitizedTrainingId) {
        throw CustomException('Invalid training ID format', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['comments', 'approvedAmount', 'conditions'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const { comments, approvedAmount, conditions } = safeData;

    // Validate conditions if provided
    if (conditions !== undefined && !Array.isArray(conditions)) {
        throw CustomException('Conditions must be an array', 400);
    }

    // IDOR Protection - verify firmId/lawyerId ownership
    const isSoloLawyer = req.isSoloLawyer;
    const query = { _id: sanitizedTrainingId };
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const training = await Training.findOne(query);
    if (!training) {
        throw CustomException('Training not found', 404);
    }

    // Additional IDOR check
    if (firmId && training.firmId?.toString() !== firmId.toString()) {
        throw CustomException('Training not found', 404);
    }
    if (!firmId && training.lawyerId?.toString() !== lawyerId.toString()) {
        throw CustomException('Training not found', 404);
    }

    if (training.approvalWorkflow.finalStatus !== 'pending') {
        throw CustomException('Training is not pending approval', 400);
    }

    const currentStep = training.approvalWorkflow.currentStep;
    const stepIndex = currentStep - 1;

    if (stepIndex >= training.approvalWorkflow.workflowSteps.length) {
        throw CustomException('Invalid approval step', 400);
    }

    // Update current step
    training.approvalWorkflow.workflowSteps[stepIndex].status = conditions ? 'conditional' : 'approved';
    training.approvalWorkflow.workflowSteps[stepIndex].actionDate = new Date();
    training.approvalWorkflow.workflowSteps[stepIndex].decision = conditions ? 'approve_with_conditions' : 'approve';
    training.approvalWorkflow.workflowSteps[stepIndex].comments = comments;
    training.approvalWorkflow.workflowSteps[stepIndex].approverId = req.userID;

    // Check if this is the last step
    if (currentStep >= training.approvalWorkflow.totalSteps) {
        training.approvalWorkflow.finalStatus = conditions ? 'conditional' : 'approved';
        training.approvalWorkflow.finalApprovalDate = new Date();
        training.approvalWorkflow.finalApprover = req.userID;
        training.status = 'approved';
        training.requestStatus = 'approved';

        if (conditions && Array.isArray(conditions)) {
            training.approvalWorkflow.conditions = conditions.map(c => ({
                condition: c,
                met: false
            }));
        }
    } else {
        // Move to next step
        training.approvalWorkflow.currentStep = currentStep + 1;
        training.approvalWorkflow.workflowSteps[currentStep].status = 'pending';
        training.approvalWorkflow.workflowSteps[currentStep].notificationSent = true;
    }

    training.lastModifiedBy = req.userID;
    await training.save();

    return res.json({
        success: true,
        message: currentStep >= training.approvalWorkflow.totalSteps
            ? 'Training fully approved'
            : 'Training approved at current step, moved to next approver',
        training
    });
});

// ═══════════════════════════════════════════════════════════════
// REJECT TRAINING
// POST /api/hr/trainings/:trainingId/reject
// ═══════════════════════════════════════════════════════════════

const rejectTraining = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { trainingId } = req.params;

    // Validate and sanitize trainingId
    const sanitizedTrainingId = sanitizeObjectId(trainingId);
    if (!sanitizedTrainingId) {
        throw CustomException('Invalid training ID format', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['reason', 'comments'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const { reason, comments } = safeData;

    if (!reason) {
        throw CustomException('Rejection reason is required', 400);
    }

    // IDOR Protection - verify firmId/lawyerId ownership
    const isSoloLawyer = req.isSoloLawyer;
    const query = { _id: sanitizedTrainingId };
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const training = await Training.findOne(query);
    if (!training) {
        throw CustomException('Training not found', 404);
    }

    // Additional IDOR check
    if (firmId && training.firmId?.toString() !== firmId.toString()) {
        throw CustomException('Training not found', 404);
    }
    if (!firmId && training.lawyerId?.toString() !== lawyerId.toString()) {
        throw CustomException('Training not found', 404);
    }

    if (training.approvalWorkflow.finalStatus !== 'pending') {
        throw CustomException('Training is not pending approval', 400);
    }

    const currentStep = training.approvalWorkflow.currentStep;
    const stepIndex = currentStep - 1;

    // Update current step
    training.approvalWorkflow.workflowSteps[stepIndex].status = 'rejected';
    training.approvalWorkflow.workflowSteps[stepIndex].actionDate = new Date();
    training.approvalWorkflow.workflowSteps[stepIndex].decision = 'reject';
    training.approvalWorkflow.workflowSteps[stepIndex].comments = comments;
    training.approvalWorkflow.workflowSteps[stepIndex].approverId = req.userID;

    training.approvalWorkflow.finalStatus = 'rejected';
    training.approvalWorkflow.rejectionReason = reason;
    training.status = 'rejected';
    training.requestStatus = 'rejected';

    training.lastModifiedBy = req.userID;
    await training.save();

    return res.json({
        success: true,
        message: 'Training request rejected',
        training
    });
});

// ═══════════════════════════════════════════════════════════════
// ENROLL IN TRAINING
// POST /api/hr/trainings/:trainingId/enroll
// ═══════════════════════════════════════════════════════════════

const enrollTraining = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { trainingId } = req.params;

    // Validate and sanitize trainingId
    const sanitizedTrainingId = sanitizeObjectId(trainingId);
    if (!sanitizedTrainingId) {
        throw CustomException('Invalid training ID format', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['registrationNumber', 'confirmationNumber', 'enrollmentMethod', 'seatNumber'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const { registrationNumber, confirmationNumber, enrollmentMethod, seatNumber } = safeData;

    // IDOR Protection - verify firmId/lawyerId ownership
    const isSoloLawyer = req.isSoloLawyer;
    const query = { _id: sanitizedTrainingId };
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const training = await Training.findOne(query);
    if (!training) {
        throw CustomException('Training not found', 404);
    }

    // Additional IDOR check
    if (firmId && training.firmId?.toString() !== firmId.toString()) {
        throw CustomException('Training not found', 404);
    }
    if (!firmId && training.lawyerId?.toString() !== lawyerId.toString()) {
        throw CustomException('Training not found', 404);
    }

    if (training.status !== 'approved') {
        throw CustomException('Training must be approved before enrollment', 400);
    }

    training.enrollment = {
        enrolled: true,
        enrollmentDate: new Date(),
        enrollmentBy: req.userID,
        enrollmentMethod: enrollmentMethod || 'manual',
        registrationNumber,
        registrationRequired: !!registrationNumber,
        registered: !!registrationNumber,
        registrationDate: registrationNumber ? new Date() : undefined,
        confirmationReceived: !!confirmationNumber,
        confirmationNumber,
        seatReserved: !!seatNumber,
        seatNumber,
        reservationDate: seatNumber ? new Date() : undefined
    };

    training.status = 'enrolled';
    training.lastModifiedBy = req.userID;
    await training.save();

    return res.json({
        success: true,
        message: 'Successfully enrolled in training',
        training
    });
});

// ═══════════════════════════════════════════════════════════════
// START TRAINING
// POST /api/hr/trainings/:trainingId/start
// ═══════════════════════════════════════════════════════════════

const startTraining = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { trainingId } = req.params;

    const isSoloLawyer = req.isSoloLawyer;
    const query = { _id: trainingId };
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const training = await Training.findOne(query);
    if (!training) {
        throw CustomException('Training not found', 404);
    }

    if (!['approved', 'enrolled'].includes(training.status)) {
        throw CustomException('Training must be approved or enrolled to start', 400);
    }

    training.status = 'in_progress';

    // Initialize progress for online courses
    if (['online', 'self_paced_online'].includes(training.deliveryMethod)) {
        training.progress.lastAccessDate = new Date();
    }

    training.lastModifiedBy = req.userID;
    await training.save();

    return res.json({
        success: true,
        message: 'Training started',
        training
    });
});

// ═══════════════════════════════════════════════════════════════
// COMPLETE TRAINING
// POST /api/hr/trainings/:trainingId/complete
// ═══════════════════════════════════════════════════════════════

const completeTraining = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { trainingId } = req.params;

    // Validate and sanitize trainingId
    const sanitizedTrainingId = sanitizeObjectId(trainingId);
    if (!sanitizedTrainingId) {
        throw CustomException('Invalid training ID format', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['finalScore', 'grade', 'passed', 'rank', 'totalParticipants'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const { finalScore, grade, passed, rank, totalParticipants } = safeData;

    // Validate numeric inputs
    if (finalScore !== undefined && (typeof finalScore !== 'number' || finalScore < 0 || finalScore > 100)) {
        throw CustomException('Invalid final score (must be 0-100)', 400);
    }
    if (rank !== undefined && (typeof rank !== 'number' || rank < 1)) {
        throw CustomException('Invalid rank value', 400);
    }
    if (totalParticipants !== undefined && (typeof totalParticipants !== 'number' || totalParticipants < 1)) {
        throw CustomException('Invalid total participants value', 400);
    }

    // IDOR Protection - verify firmId/lawyerId ownership
    const isSoloLawyer = req.isSoloLawyer;
    const query = { _id: sanitizedTrainingId };
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const training = await Training.findOne(query);
    if (!training) {
        throw CustomException('Training not found', 404);
    }

    // Additional IDOR check
    if (firmId && training.firmId?.toString() !== firmId.toString()) {
        throw CustomException('Training not found', 404);
    }
    if (!firmId && training.lawyerId?.toString() !== lawyerId.toString()) {
        throw CustomException('Training not found', 404);
    }

    if (training.status !== 'in_progress') {
        throw CustomException('Training must be in progress to complete', 400);
    }

    // Check completion criteria
    const completionCriteria = training.checkCompletionCriteria();
    training.completion.completionCriteria = {
        ...training.completion.completionCriteria,
        ...completionCriteria
    };

    training.completion.completed = true;
    training.completion.completionDate = new Date();
    training.completion.finalResults = {
        overallScore: finalScore,
        grade,
        passed: passed !== undefined ? passed : completionCriteria.allCriteriaMet,
        rank,
        totalParticipants,
        percentileRank: rank && totalParticipants ? Math.round((1 - (rank / totalParticipants)) * 100) : undefined
    };

    training.status = passed !== false ? 'completed' : 'failed';

    // Update analytics
    training.analytics = {
        ...training.analytics,
        attendanceRate: training.attendanceSummary.attendancePercentage,
        passRate: passed !== false
    };

    training.lastModifiedBy = req.userID;
    await training.save();

    return res.json({
        success: true,
        message: `Training ${passed !== false ? 'completed' : 'failed'}`,
        training
    });
});

// ═══════════════════════════════════════════════════════════════
// CANCEL TRAINING
// POST /api/hr/trainings/:trainingId/cancel
// ═══════════════════════════════════════════════════════════════

const cancelTraining = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { trainingId } = req.params;
    const { reason } = req.body;

    if (!reason) {
        throw CustomException('Cancellation reason is required', 400);
    }

    const isSoloLawyer = req.isSoloLawyer;
    const query = { _id: trainingId };
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const training = await Training.findOne(query);
    if (!training) {
        throw CustomException('Training not found', 404);
    }

    if (['completed', 'cancelled', 'failed'].includes(training.status)) {
        throw CustomException(`Cannot cancel training in ${training.status} status`, 400);
    }

    training.status = 'cancelled';
    training.notes.hrNotes = `${training.notes.hrNotes || ''}\n\nCancellation Reason: ${reason}`;
    training.lastModifiedBy = req.userID;
    await training.save();

    return res.json({
        success: true,
        message: 'Training cancelled',
        training
    });
});

// ═══════════════════════════════════════════════════════════════
// RECORD ATTENDANCE
// POST /api/hr/trainings/:trainingId/attendance
// ═══════════════════════════════════════════════════════════════

const recordAttendance = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { trainingId } = req.params;

    // Validate and sanitize trainingId
    const sanitizedTrainingId = sanitizeObjectId(trainingId);
    if (!sanitizedTrainingId) {
        throw CustomException('Invalid training ID format', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'sessionNumber', 'sessionDate', 'attended', 'checkInTime', 'checkOutTime',
        'attendanceMethod', 'late', 'lateMinutes', 'excused', 'excuseReason', 'notes'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const {
        sessionNumber, sessionDate, attended, checkInTime, checkOutTime,
        attendanceMethod, late, lateMinutes, excused, excuseReason, notes
    } = safeData;

    // Input validation
    if (sessionNumber === undefined || sessionDate === undefined || attended === undefined) {
        throw CustomException('Required fields missing: sessionNumber, sessionDate, attended', 400);
    }

    // Validate session number
    if (typeof sessionNumber !== 'number' || sessionNumber < 1) {
        throw CustomException('Invalid session number', 400);
    }

    // Validate session date
    const parsedSessionDate = new Date(sessionDate);
    if (isNaN(parsedSessionDate.getTime())) {
        throw CustomException('Invalid session date format', 400);
    }

    // Validate lateMinutes if provided
    if (lateMinutes !== undefined && (typeof lateMinutes !== 'number' || lateMinutes < 0)) {
        throw CustomException('Invalid late minutes value', 400);
    }

    // IDOR Protection - verify firmId/lawyerId ownership
    const isSoloLawyer = req.isSoloLawyer;
    const query = { _id: sanitizedTrainingId };
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const training = await Training.findOne(query);
    if (!training) {
        throw CustomException('Training not found', 404);
    }

    // Additional IDOR check
    if (firmId && training.firmId?.toString() !== firmId.toString()) {
        throw CustomException('Training not found', 404);
    }
    if (!firmId && training.lawyerId?.toString() !== lawyerId.toString()) {
        throw CustomException('Training not found', 404);
    }

    // Find or create session
    let sessionIndex = training.sessions.findIndex(s => s.sessionNumber === sessionNumber);

    if (sessionIndex === -1) {
        // Add new session
        training.sessions.push({
            sessionNumber,
            sessionDate: new Date(sessionDate),
            attended,
            checkInTime,
            checkOutTime,
            attendanceMethod: attendanceMethod || 'manual',
            late: late || false,
            lateMinutes: lateMinutes || 0,
            excused: excused || false,
            excuseReason,
            notes
        });
    } else {
        // Update existing session
        Object.assign(training.sessions[sessionIndex], {
            attended,
            checkInTime,
            checkOutTime,
            attendanceMethod: attendanceMethod || training.sessions[sessionIndex].attendanceMethod,
            late: late !== undefined ? late : training.sessions[sessionIndex].late,
            lateMinutes: lateMinutes !== undefined ? lateMinutes : training.sessions[sessionIndex].lateMinutes,
            excused: excused !== undefined ? excused : training.sessions[sessionIndex].excused,
            excuseReason: excuseReason || training.sessions[sessionIndex].excuseReason,
            notes: notes || training.sessions[sessionIndex].notes
        });
    }

    training.lastModifiedBy = req.userID;
    await training.save();

    return res.json({
        success: true,
        message: 'Attendance recorded successfully',
        attendanceSummary: training.attendanceSummary,
        sessions: training.sessions
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE PROGRESS (for online courses)
// POST /api/hr/trainings/:trainingId/progress
// ═══════════════════════════════════════════════════════════════

const updateProgress = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { trainingId } = req.params;

    // Validate and sanitize trainingId
    const sanitizedTrainingId = sanitizeObjectId(trainingId);
    if (!sanitizedTrainingId) {
        throw CustomException('Invalid training ID format', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'moduleNumber', 'moduleTitle', 'status', 'timeSpent', 'score', 'passed',
        'videosWatched', 'documentsRead', 'quizzesTaken', 'forumPosts'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const {
        moduleNumber, moduleTitle, status, timeSpent, score, passed,
        videosWatched, documentsRead, quizzesTaken, forumPosts
    } = safeData;

    // Input validation
    if (moduleNumber === undefined) {
        throw CustomException('Module number is required', 400);
    }

    // Validate module number
    if (typeof moduleNumber !== 'number' || moduleNumber < 1) {
        throw CustomException('Invalid module number', 400);
    }

    // Validate numeric fields if provided
    if (timeSpent !== undefined && (typeof timeSpent !== 'number' || timeSpent < 0)) {
        throw CustomException('Invalid time spent value', 400);
    }
    if (score !== undefined && (typeof score !== 'number' || score < 0 || score > 100)) {
        throw CustomException('Invalid score value (must be 0-100)', 400);
    }
    if (videosWatched !== undefined && (typeof videosWatched !== 'number' || videosWatched < 0)) {
        throw CustomException('Invalid videos watched value', 400);
    }
    if (documentsRead !== undefined && (typeof documentsRead !== 'number' || documentsRead < 0)) {
        throw CustomException('Invalid documents read value', 400);
    }
    if (quizzesTaken !== undefined && (typeof quizzesTaken !== 'number' || quizzesTaken < 0)) {
        throw CustomException('Invalid quizzes taken value', 400);
    }
    if (forumPosts !== undefined && (typeof forumPosts !== 'number' || forumPosts < 0)) {
        throw CustomException('Invalid forum posts value', 400);
    }

    // IDOR Protection - verify firmId/lawyerId ownership
    const isSoloLawyer = req.isSoloLawyer;
    const query = { _id: sanitizedTrainingId };
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const training = await Training.findOne(query);
    if (!training) {
        throw CustomException('Training not found', 404);
    }

    // Additional IDOR check
    if (firmId && training.firmId?.toString() !== firmId.toString()) {
        throw CustomException('Training not found', 404);
    }
    if (!firmId && training.lawyerId?.toString() !== lawyerId.toString()) {
        throw CustomException('Training not found', 404);
    }

    if (!training.progress.modules) {
        training.progress.modules = [];
    }

    // Find or create module progress
    let moduleIndex = training.progress.modules.findIndex(m => m.moduleNumber === moduleNumber);

    if (moduleIndex === -1) {
        training.progress.modules.push({
            moduleNumber,
            moduleTitle,
            status: status || 'in_progress',
            startDate: new Date(),
            completionDate: status === 'completed' ? new Date() : undefined,
            timeSpent: timeSpent || 0,
            score,
            passed
        });

        if (!training.progress.totalModules || moduleNumber > training.progress.totalModules) {
            training.progress.totalModules = moduleNumber;
        }
    } else {
        const module = training.progress.modules[moduleIndex];
        module.status = status || module.status;
        module.timeSpent = (module.timeSpent || 0) + (timeSpent || 0);
        if (status === 'completed' && !module.completionDate) {
            module.completionDate = new Date();
        }
        if (score !== undefined) module.score = score;
        if (passed !== undefined) module.passed = passed;
    }

    // Update completed modules count
    training.progress.completedModules = training.progress.modules.filter(m => m.status === 'completed').length;
    training.progress.lastAccessDate = new Date();

    // Update engagement metrics
    if (videosWatched) training.progress.videosWatched = (training.progress.videosWatched || 0) + videosWatched;
    if (documentsRead) training.progress.documentsRead = (training.progress.documentsRead || 0) + documentsRead;
    if (quizzesTaken) training.progress.quizzesTaken = (training.progress.quizzesTaken || 0) + quizzesTaken;
    if (forumPosts) training.progress.forumPosts = (training.progress.forumPosts || 0) + forumPosts;

    // Calculate total time spent
    training.progress.totalTimeSpent = training.progress.modules.reduce((sum, m) => sum + (m.timeSpent || 0), 0);

    training.lastModifiedBy = req.userID;
    await training.save();

    return res.json({
        success: true,
        message: 'Progress updated successfully',
        progress: training.progress
    });
});

// ═══════════════════════════════════════════════════════════════
// SUBMIT ASSESSMENT
// POST /api/hr/trainings/:trainingId/assessments
// ═══════════════════════════════════════════════════════════════

const submitAssessment = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { trainingId } = req.params;

    // Validate and sanitize trainingId
    const sanitizedTrainingId = sanitizeObjectId(trainingId);
    if (!sanitizedTrainingId) {
        throw CustomException('Invalid training ID format', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'assessmentType', 'assessmentTitle', 'score', 'maxScore', 'passingScore',
        'timeSpent', 'feedback', 'areasOfStrength', 'areasForImprovement'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const {
        assessmentType, assessmentTitle, score, maxScore, passingScore,
        timeSpent, feedback, areasOfStrength, areasForImprovement
    } = safeData;

    // Input validation
    if (!assessmentType || score === undefined) {
        throw CustomException('Required fields missing: assessmentType, score', 400);
    }

    // Validate score values
    if (typeof score !== 'number' || score < 0) {
        throw CustomException('Invalid score value', 400);
    }
    if (maxScore !== undefined && (typeof maxScore !== 'number' || maxScore <= 0)) {
        throw CustomException('Invalid max score value', 400);
    }
    if (passingScore !== undefined && (typeof passingScore !== 'number' || passingScore < 0 || passingScore > 100)) {
        throw CustomException('Invalid passing score value (must be 0-100)', 400);
    }
    if (timeSpent !== undefined && (typeof timeSpent !== 'number' || timeSpent < 0)) {
        throw CustomException('Invalid time spent value', 400);
    }

    // IDOR Protection - verify firmId/lawyerId ownership
    const isSoloLawyer = req.isSoloLawyer;
    const query = { _id: sanitizedTrainingId };
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const training = await Training.findOne(query);
    if (!training) {
        throw CustomException('Training not found', 404);
    }

    // Additional IDOR check
    if (firmId && training.firmId?.toString() !== firmId.toString()) {
        throw CustomException('Training not found', 404);
    }
    if (!firmId && training.lawyerId?.toString() !== lawyerId.toString()) {
        throw CustomException('Training not found', 404);
    }

    const percentageScore = maxScore ? Math.round((score / maxScore) * 100) : score;
    const passed = percentageScore >= (passingScore || TRAINING_POLICIES.assessmentRequirements.passingScore);

    // Check for existing assessments of same type
    const existingAttempts = training.assessments.filter(a => a.assessmentType === assessmentType);
    const attemptNumber = existingAttempts.length + 1;

    const assessment = {
        assessmentId: generateAssessmentId(),
        assessmentType,
        assessmentTitle: assessmentTitle || assessmentType,
        assessmentDate: new Date(),
        attemptNumber,
        maxAttempts: TRAINING_POLICIES.assessmentRequirements.maxRetakes + 1,
        score,
        maxScore: maxScore || 100,
        percentageScore,
        passingScore: passingScore || TRAINING_POLICIES.assessmentRequirements.passingScore,
        passed,
        grade: passed ? (percentageScore >= 90 ? 'A' : percentageScore >= 80 ? 'B' : percentageScore >= 70 ? 'C' : 'D') : 'F',
        timeSpent,
        feedback,
        areasOfStrength,
        areasForImprovement,
        retakeRequired: !passed && attemptNumber < TRAINING_POLICIES.assessmentRequirements.maxRetakes + 1
    };

    training.assessments.push(assessment);

    // Update completion criteria if final exam
    if (['final_exam', 'post_assessment'].includes(assessmentType)) {
        training.completion.completionCriteria.assessmentPassed = passed;

        // Update analytics
        training.analytics.postTestScore = percentageScore;
        if (training.analytics.preTestScore) {
            training.analytics.scoreImprovement = percentageScore - training.analytics.preTestScore;
        }
    }

    if (assessmentType === 'pre_assessment') {
        training.analytics.preTestScore = percentageScore;
    }

    training.lastModifiedBy = req.userID;
    await training.save();

    return res.json({
        success: true,
        message: passed ? 'Assessment passed!' : 'Assessment submitted',
        assessment,
        passed,
        retakeRequired: assessment.retakeRequired
    });
});

// ═══════════════════════════════════════════════════════════════
// ISSUE CERTIFICATE
// POST /api/hr/trainings/:trainingId/issue-certificate
// ═══════════════════════════════════════════════════════════════

const issueCertificate = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { trainingId } = req.params;

    // Validate and sanitize trainingId
    const sanitizedTrainingId = sanitizeObjectId(trainingId);
    if (!sanitizedTrainingId) {
        throw CustomException('Invalid training ID format', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'certificateType', 'certificateUrl', 'validUntil', 'cleCredits', 'cpdPoints',
        'verificationUrl', 'deliveryMethod'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const {
        certificateType, certificateUrl, validUntil, cleCredits, cpdPoints,
        verificationUrl, deliveryMethod
    } = safeData;

    // Validate date if provided
    if (validUntil) {
        const validUntilDate = new Date(validUntil);
        if (isNaN(validUntilDate.getTime())) {
            throw CustomException('Invalid validUntil date format', 400);
        }
    }

    // Validate numeric fields
    if (cleCredits !== undefined && (typeof cleCredits !== 'number' || cleCredits < 0)) {
        throw CustomException('Invalid CLE credits value', 400);
    }
    if (cpdPoints !== undefined && (typeof cpdPoints !== 'number' || cpdPoints < 0)) {
        throw CustomException('Invalid CPD points value', 400);
    }

    // IDOR Protection - verify firmId/lawyerId ownership
    const isSoloLawyer = req.isSoloLawyer;
    const query = { _id: sanitizedTrainingId };
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const training = await Training.findOne(query);
    if (!training) {
        throw CustomException('Training not found', 404);
    }

    // Additional IDOR check
    if (firmId && training.firmId?.toString() !== firmId.toString()) {
        throw CustomException('Training not found', 404);
    }
    if (!firmId && training.lawyerId?.toString() !== lawyerId.toString()) {
        throw CustomException('Training not found', 404);
    }

    if (training.status !== 'completed') {
        throw CustomException('Training must be completed before issuing certificate', 400);
    }

    if (training.certificate.issued) {
        throw CustomException('Certificate has already been issued', 400);
    }

    const certificateNumber = generateCertificateNumber(training.trainingNumber);

    training.certificate = {
        issued: true,
        issueDate: new Date(),
        certificateNumber,
        certificateUrl,
        certificateType: certificateType || 'completion',
        validFrom: new Date(),
        validUntil: validUntil ? new Date(validUntil) : undefined,
        renewalRequired: !!validUntil,
        renewalDueDate: validUntil ? new Date(validUntil) : undefined,
        cleCredits: cleCredits || training.cleDetails?.cleCredits,
        cpdPoints,
        verificationUrl,
        delivered: !!deliveryMethod,
        deliveryDate: deliveryMethod ? new Date() : undefined,
        deliveryMethod
    };

    training.lastModifiedBy = req.userID;
    await training.save();

    return res.json({
        success: true,
        message: 'Certificate issued successfully',
        certificate: training.certificate
    });
});

// ═══════════════════════════════════════════════════════════════
// SUBMIT EVALUATION
// POST /api/hr/trainings/:trainingId/evaluation
// ═══════════════════════════════════════════════════════════════

const submitEvaluation = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { trainingId } = req.params;

    // Validate and sanitize trainingId
    const sanitizedTrainingId = sanitizeObjectId(trainingId);
    if (!sanitizedTrainingId) {
        throw CustomException('Invalid training ID format', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['ratings', 'openEndedFeedback'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const { ratings, openEndedFeedback } = safeData;

    // Input validation
    if (!ratings || typeof ratings !== 'object') {
        throw CustomException('Ratings object is required', 400);
    }

    // Validate ratings values (should be numbers between 1-5)
    for (const [key, value] of Object.entries(ratings)) {
        if (typeof value === 'number' && (value < 1 || value > 5)) {
            throw CustomException(`Invalid rating value for ${key} (must be 1-5)`, 400);
        }
    }

    // IDOR Protection - verify firmId/lawyerId ownership
    const isSoloLawyer = req.isSoloLawyer;
    const query = { _id: sanitizedTrainingId };
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const training = await Training.findOne(query);
    if (!training) {
        throw CustomException('Training not found', 404);
    }

    // Additional IDOR check
    if (firmId && training.firmId?.toString() !== firmId.toString()) {
        throw CustomException('Training not found', 404);
    }
    if (!firmId && training.lawyerId?.toString() !== lawyerId.toString()) {
        throw CustomException('Training not found', 404);
    }

    training.evaluation = {
        evaluationCompleted: true,
        evaluationDate: new Date(),
        ratings,
        openEndedFeedback
    };

    // Calculate average satisfaction score
    const avgRating = calculateAverageRating(ratings);
    training.analytics.satisfactionScore = avgRating;

    training.lastModifiedBy = req.userID;
    await training.save();

    return res.json({
        success: true,
        message: 'Evaluation submitted successfully',
        evaluation: training.evaluation,
        averageRating: avgRating
    });
});

// ═══════════════════════════════════════════════════════════════
// RECORD PAYMENT
// POST /api/hr/trainings/:trainingId/payment
// ═══════════════════════════════════════════════════════════════

const recordPayment = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { trainingId } = req.params;

    // Validate and sanitize trainingId
    const sanitizedTrainingId = sanitizeObjectId(trainingId);
    if (!sanitizedTrainingId) {
        throw CustomException('Invalid training ID format', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['amount', 'paymentMethod', 'paymentReference', 'paidBy', 'receiptUrl'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const { amount, paymentMethod, paymentReference, paidBy, receiptUrl } = safeData;

    // Input validation
    if (!amount || typeof amount !== 'number' || amount <= 0) {
        throw CustomException('Valid payment amount is required (must be a positive number)', 400);
    }

    // IDOR Protection - verify firmId/lawyerId ownership
    const isSoloLawyer = req.isSoloLawyer;
    const query = { _id: sanitizedTrainingId };
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const training = await Training.findOne(query);
    if (!training) {
        throw CustomException('Training not found', 404);
    }

    // Additional IDOR check
    if (firmId && training.firmId?.toString() !== firmId.toString()) {
        throw CustomException('Training not found', 404);
    }
    if (!firmId && training.lawyerId?.toString() !== lawyerId.toString()) {
        throw CustomException('Training not found', 404);
    }

    const payment = {
        paymentDate: new Date(),
        amount,
        paymentMethod: paymentMethod || 'bank_transfer',
        paymentReference,
        paidBy: paidBy || 'company',
        receiptUrl
    };

    training.costs.payment.payments.push(payment);
    training.costs.payment.totalPaid = (training.costs.payment.totalPaid || 0) + amount;
    training.costs.payment.outstandingAmount = training.costs.totalCost - training.costs.payment.totalPaid;

    if (training.costs.payment.outstandingAmount <= 0) {
        training.costs.payment.paymentStatus = 'paid';
    } else if (training.costs.payment.totalPaid > 0) {
        training.costs.payment.paymentStatus = 'partial';
    }

    training.lastModifiedBy = req.userID;
    await training.save();

    return res.json({
        success: true,
        message: 'Payment recorded successfully',
        payment: training.costs.payment
    });
});

// ═══════════════════════════════════════════════════════════════
// BULK DELETE TRAININGS
// POST /api/hr/trainings/bulk-delete
// ═══════════════════════════════════════════════════════════════

const bulkDeleteTrainings = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['ids'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const { ids } = safeData;

    // Input validation
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw CustomException('Training IDs are required (must be a non-empty array)', 400);
    }

    // Validate and sanitize each ID
    const sanitizedIds = ids.map(id => {
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            throw CustomException(`Invalid training ID format: ${id}`, 400);
        }
        return sanitizedId;
    });

    // Limit bulk delete to prevent abuse (max 100 at a time)
    if (sanitizedIds.length > 100) {
        throw CustomException('Cannot delete more than 100 trainings at once', 400);
    }

    // IDOR Protection - ensure all trainings belong to the user's firm/account
    const isSoloLawyer = req.isSoloLawyer;
    const query = { _id: { $in: sanitizedIds }, status: 'requested' };
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const result = await Training.deleteMany(query);

    return res.json({
        success: true,
        message: `${result.deletedCount} training(s) deleted successfully`,
        deletedCount: result.deletedCount
    });
});

// ═══════════════════════════════════════════════════════════════
// GET TRAINING STATISTICS
// GET /api/hr/trainings/stats
// ═══════════════════════════════════════════════════════════════

const getTrainingStats = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { year, department, employeeId } = req.query;

    const isSoloLawyer = req.isSoloLawyer;
    const matchQuery = {};
    if (isSoloLawyer || !firmId) {
        matchQuery.lawyerId = lawyerId;
    } else {
        matchQuery.firmId = firmId;
    }

    if (year) {
        matchQuery.startDate = {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`)
        };
    }
    if (department) matchQuery.department = department;
    if (employeeId) matchQuery.employeeId = new mongoose.Types.ObjectId(employeeId);

    const stats = await Training.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: null,
                totalTrainings: { $sum: 1 },
                requested: { $sum: { $cond: [{ $eq: ['$status', 'requested'] }, 1, 0] } },
                approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
                enrolled: { $sum: { $cond: [{ $eq: ['$status', 'enrolled'] }, 1, 0] } },
                inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
                totalCost: { $sum: '$costs.totalCost' },
                totalPaid: { $sum: '$costs.payment.totalPaid' },
                totalHours: { $sum: '$duration.totalHours' },
                mandatoryCount: { $sum: { $cond: ['$complianceTracking.isMandatory', 1, 0] } },
                cleCount: { $sum: { $cond: ['$cleDetails.isCLE', 1, 0] } },
                avgSatisfaction: { $avg: '$analytics.satisfactionScore' },
                avgAttendance: { $avg: '$attendanceSummary.attendancePercentage' }
            }
        }
    ]);

    // Get breakdown by type
    const byType = await Training.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$trainingType',
                count: { $sum: 1 },
                totalCost: { $sum: '$costs.totalCost' },
                completedCount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
            }
        }
    ]);

    // Get breakdown by category
    const byCategory = await Training.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$trainingCategory',
                count: { $sum: 1 },
                totalCost: { $sum: '$costs.totalCost' },
                totalHours: { $sum: '$duration.totalHours' }
            }
        }
    ]);

    // Get overdue compliance trainings
    const overdueCount = await Training.countDocuments({
        ...matchQuery,
        'complianceTracking.overdue': true,
        'completion.completed': false
    });

    return res.json({
        success: true,
        stats: stats[0] || {
            totalTrainings: 0,
            requested: 0,
            approved: 0,
            enrolled: 0,
            inProgress: 0,
            completed: 0,
            cancelled: 0,
            failed: 0,
            rejected: 0,
            totalCost: 0,
            totalPaid: 0,
            totalHours: 0,
            mandatoryCount: 0,
            cleCount: 0,
            avgSatisfaction: null,
            avgAttendance: null
        },
        byType,
        byCategory,
        overdueComplianceCount: overdueCount
    });
});

// ═══════════════════════════════════════════════════════════════
// GET TRAININGS BY EMPLOYEE
// GET /api/hr/trainings/by-employee/:employeeId
// ═══════════════════════════════════════════════════════════════

const getTrainingsByEmployee = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { employeeId } = req.params;
    const { status, year, page = 1, limit = 20 } = req.query;

    const isSoloLawyer = req.isSoloLawyer;
    const query = { employeeId };
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    if (status) query.status = status;
    if (year) {
        query.startDate = {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`)
        };
    }

    const trainings = await Training.find(query)
        .populate('employeeId', 'employeeId personalInfo')
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .sort({ startDate: -1 });

    const total = await Training.countDocuments(query);

    // Calculate employee training summary
    const summary = await Training.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                totalTrainings: { $sum: 1 },
                completedTrainings: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                totalHours: { $sum: '$duration.totalHours' },
                totalCost: { $sum: '$costs.totalCost' },
                avgScore: { $avg: '$completion.finalResults.overallScore' },
                cleCredits: { $sum: '$cleDetails.cleCredits' }
            }
        }
    ]);

    return res.json({
        success: true,
        trainings,
        summary: summary[0] || {
            totalTrainings: 0,
            completedTrainings: 0,
            totalHours: 0,
            totalCost: 0,
            avgScore: null,
            cleCredits: 0
        },
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
// GET /api/hr/trainings/pending-approvals
// ═══════════════════════════════════════════════════════════════

const getPendingApprovals = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { page = 1, limit = 20 } = req.query;

    const isSoloLawyer = req.isSoloLawyer;
    const query = { 'approvalWorkflow.finalStatus': 'pending', requestStatus: 'submitted' };
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const trainings = await Training.find(query)
        .populate('employeeId', 'employeeId personalInfo')
        .populate('createdBy', 'firstName lastName')
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .sort({ requestDate: 1 });

    const total = await Training.countDocuments(query);

    return res.json({
        success: true,
        trainings,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET UPCOMING TRAININGS
// GET /api/hr/trainings/upcoming
// ═══════════════════════════════════════════════════════════════

const getUpcomingTrainings = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { days = 30, page = 1, limit = 20 } = req.query;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));

    const isSoloLawyer = req.isSoloLawyer;
    const query = {
        startDate: { $gte: new Date(), $lte: futureDate },
        status: { $in: ['approved', 'enrolled'] }
    };
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const trainings = await Training.find(query)
        .populate('employeeId', 'employeeId personalInfo')
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .sort({ startDate: 1 });

    const total = await Training.countDocuments(query);

    return res.json({
        success: true,
        trainings,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET OVERDUE COMPLIANCE TRAININGS
// GET /api/hr/trainings/overdue-compliance
// ═══════════════════════════════════════════════════════════════

const getOverdueCompliance = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { page = 1, limit = 20 } = req.query;

    const isSoloLawyer = req.isSoloLawyer;
    const query = {
        'complianceTracking.isMandatory': true,
        'complianceTracking.overdue': true,
        'completion.completed': false
    };
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const trainings = await Training.find(query)
        .populate('employeeId', 'employeeId personalInfo')
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .sort({ 'complianceTracking.daysOverdue': -1 });

    const total = await Training.countDocuments(query);

    return res.json({
        success: true,
        trainings,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET CLE SUMMARY FOR ATTORNEY
// GET /api/hr/trainings/cle-summary/:employeeId
// ═══════════════════════════════════════════════════════════════

const getCLESummary = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { employeeId } = req.params;
    const { year } = req.query;

    const currentYear = year || new Date().getFullYear();

    const isSoloLawyer = req.isSoloLawyer;
    const matchQuery = {
        employeeId: new mongoose.Types.ObjectId(employeeId),
        'cleDetails.isCLE': true,
        status: 'completed',
        'completion.completionDate': {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`)
        }
    };
    if (isSoloLawyer || !firmId) {
        matchQuery.lawyerId = lawyerId;
    } else {
        matchQuery.firmId = firmId;
    }

    const trainings = await Training.find(matchQuery)
        .select('trainingTitle cleDetails completion.completionDate certificate');

    // Calculate totals
    const summary = {
        year: currentYear,
        totalCredits: 0,
        totalHours: 0,
        ethicsCredits: 0,
        specialtyCredits: 0,
        byCategory: {},
        requirements: TRAINING_POLICIES.cleRequirements,
        trainings: []
    };

    trainings.forEach(t => {
        const cle = t.cleDetails;
        summary.totalCredits += cle.cleCredits || 0;
        summary.totalHours += cle.cleHours || 0;
        summary.ethicsCredits += cle.ethicsCredits || 0;
        summary.specialtyCredits += cle.specialtyCredits || 0;

        if (cle.cleCategory) {
            summary.byCategory[cle.cleCategory] = (summary.byCategory[cle.cleCategory] || 0) + (cle.cleCredits || 0);
        }

        summary.trainings.push({
            trainingTitle: t.trainingTitle,
            completionDate: t.completion.completionDate,
            credits: cle.cleCredits,
            hours: cle.cleHours,
            category: cle.cleCategory,
            ethicsCredits: cle.ethicsCredits,
            specialtyCredits: cle.specialtyCredits,
            certificateNumber: t.certificate?.certificateNumber
        });
    });

    // Check requirements
    summary.meetsRequirements = {
        totalCredits: summary.totalCredits >= TRAINING_POLICIES.cleRequirements.annualCredits,
        ethicsCredits: summary.ethicsCredits >= TRAINING_POLICIES.cleRequirements.ethicsCredits,
        specialtyCredits: summary.specialtyCredits >= TRAINING_POLICIES.cleRequirements.specialtyCredits,
        allMet: summary.totalCredits >= TRAINING_POLICIES.cleRequirements.annualCredits &&
            summary.ethicsCredits >= TRAINING_POLICIES.cleRequirements.ethicsCredits &&
            summary.specialtyCredits >= TRAINING_POLICIES.cleRequirements.specialtyCredits
    };

    summary.creditsRemaining = {
        total: Math.max(0, TRAINING_POLICIES.cleRequirements.annualCredits - summary.totalCredits),
        ethics: Math.max(0, TRAINING_POLICIES.cleRequirements.ethicsCredits - summary.ethicsCredits),
        specialty: Math.max(0, TRAINING_POLICIES.cleRequirements.specialtyCredits - summary.specialtyCredits)
    };

    return res.json({
        success: true,
        summary
    });
});

// ═══════════════════════════════════════════════════════════════
// GET TRAINING CALENDAR
// GET /api/hr/trainings/calendar
// ═══════════════════════════════════════════════════════════════

const getTrainingCalendar = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { startDate, endDate, department, employeeId } = req.query;

    const isSoloLawyer = req.isSoloLawyer;
    const query = {};
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    // Default to current month if no dates provided
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date(new Date().setMonth(new Date().getMonth() + 1, 0));

    query.startDate = { $lte: end };
    query.endDate = { $gte: start };
    query.status = { $in: ['approved', 'enrolled', 'in_progress'] };

    if (department) query.department = department;
    if (employeeId) query.employeeId = employeeId;

    const trainings = await Training.find(query)
        .select('trainingNumber trainingTitle employeeName startDate endDate status locationType deliveryMethod')
        .sort({ startDate: 1 });

    // Format for calendar
    const events = trainings.map(t => ({
        id: t._id,
        title: t.trainingTitle,
        start: t.startDate,
        end: t.endDate,
        employee: t.employeeName,
        trainingNumber: t.trainingNumber,
        status: t.status,
        locationType: t.locationType,
        deliveryMethod: t.deliveryMethod
    }));

    return res.json({
        success: true,
        events,
        total: events.length
    });
});

// ═══════════════════════════════════════════════════════════════
// GET TRAINING PROVIDERS
// GET /api/hr/trainings/providers
// ═══════════════════════════════════════════════════════════════

const getProviders = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const isSoloLawyer = req.isSoloLawyer;
    const matchQuery = {};
    if (isSoloLawyer || !firmId) {
        matchQuery.lawyerId = lawyerId;
    } else {
        matchQuery.firmId = firmId;
    }

    const providers = await Training.aggregate([
        { $match: matchQuery },
        { $match: { 'provider.providerName': { $exists: true, $ne: null } } },
        {
            $group: {
                _id: '$provider.providerName',
                providerType: { $first: '$provider.providerType' },
                contactPerson: { $first: '$provider.contactPerson' },
                contactEmail: { $first: '$provider.contactEmail' },
                website: { $first: '$provider.website' },
                accredited: { $first: '$provider.accredited' },
                trainingsCount: { $sum: 1 },
                completedTrainings: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                totalCost: { $sum: '$costs.totalCost' },
                avgRating: { $avg: '$evaluation.ratings.overallSatisfaction' },
                lastUsed: { $max: '$startDate' }
            }
        },
        { $sort: { trainingsCount: -1 } }
    ]);

    return res.json({
        success: true,
        providers,
        total: providers.length
    });
});

// ═══════════════════════════════════════════════════════════════
// EXPORT TRAININGS
// GET /api/hr/trainings/export
// ═══════════════════════════════════════════════════════════════

const exportTrainings = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { format = 'json', status, dateFrom, dateTo, department, employeeId } = req.query;

    const isSoloLawyer = req.isSoloLawyer;
    const query = {};
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    if (status) query.status = status;
    if (department) query.department = department;
    if (employeeId) query.employeeId = employeeId;

    if (dateFrom || dateTo) {
        query.startDate = {};
        if (dateFrom) query.startDate.$gte = new Date(dateFrom);
        if (dateTo) query.startDate.$lte = new Date(dateTo);
    }

    const trainings = await Training.find(query)
        .populate('employeeId', 'employeeId personalInfo')
        .sort({ startDate: -1 });

    // Transform for export
    const exportData = trainings.map(t => ({
        trainingNumber: t.trainingNumber,
        trainingTitle: t.trainingTitle,
        employeeNumber: t.employeeNumber,
        employeeName: t.employeeName,
        department: t.department,
        trainingType: t.trainingType,
        trainingCategory: t.trainingCategory,
        deliveryMethod: t.deliveryMethod,
        startDate: t.startDate,
        endDate: t.endDate,
        totalHours: t.duration?.totalHours,
        status: t.status,
        provider: t.provider?.providerName,
        totalCost: t.costs?.totalCost,
        paymentStatus: t.costs?.payment?.paymentStatus,
        isMandatory: t.complianceTracking?.isMandatory,
        isCLE: t.cleDetails?.isCLE,
        cleCredits: t.cleDetails?.cleCredits,
        completed: t.completion?.completed,
        completionDate: t.completion?.completionDate,
        finalScore: t.completion?.finalResults?.overallScore,
        passed: t.completion?.finalResults?.passed,
        certificateIssued: t.certificate?.issued,
        certificateNumber: t.certificate?.certificateNumber,
        satisfactionScore: t.analytics?.satisfactionScore
    }));

    if (format === 'csv') {
        // SECURITY: Import sanitization function to prevent CSV injection
        const { sanitizeForCSV } = require('../utils/securityUtils');

        // Return CSV format
        const headers = Object.keys(exportData[0] || {}).join(',');
        const rows = exportData.map(row =>
            Object.values(row).map(v => {
                const val = v === null || v === undefined ? '' :
                    v instanceof Date ? v.toISOString() : v;
                const sanitized = sanitizeForCSV(val);
                return typeof sanitized === 'string' && sanitized.includes(',') ? `"${sanitized}"` : sanitized;
            }).join(',')
        );
        const csv = [headers, ...rows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=trainings-export-${Date.now()}.csv`);
        return res.send(csv);
    }

    return res.json({
        success: true,
        data: exportData,
        total: exportData.length
    });
});

// ═══════════════════════════════════════════════════════════════
// GET TRAINING POLICIES
// GET /api/hr/trainings/policies
// ═══════════════════════════════════════════════════════════════

const getPolicies = asyncHandler(async (req, res) => {
    return res.json({
        success: true,
        policies: TRAINING_POLICIES
    });
});

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // CRUD
    getTrainings,
    getTraining,
    createTraining,
    updateTraining,
    deleteTraining,

    // Workflow
    submitTraining,
    approveTraining,
    rejectTraining,
    enrollTraining,
    startTraining,
    completeTraining,
    cancelTraining,

    // Attendance & Progress
    recordAttendance,
    updateProgress,

    // Assessment
    submitAssessment,

    // Certificate & Evaluation
    issueCertificate,
    submitEvaluation,

    // Payment
    recordPayment,

    // Bulk Operations
    bulkDeleteTrainings,

    // Reports & Analytics
    getTrainingStats,
    getTrainingsByEmployee,
    getPendingApprovals,
    getUpcomingTrainings,
    getOverdueCompliance,
    getCLESummary,
    getTrainingCalendar,
    getProviders,
    exportTrainings,
    getPolicies
};
