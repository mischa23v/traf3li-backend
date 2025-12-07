const Grievance = require('../models/grievance.model');
const Employee = require('../models/employee.model');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');

// ═══════════════════════════════════════════════════════════════
// CONFIGURABLE POLICIES
// ═══════════════════════════════════════════════════════════════

const GRIEVANCE_POLICIES = {
    resolution: {
        targetDays: 30,
        warningDays: 21,
        urgentTargetDays: 7
    },
    appeal: {
        deadlineDays: 15  // Saudi Labor Law Article 69
    },
    investigation: {
        maxSuspensionDays: 180  // Saudi Labor Law Article 67
    },
    fileRetention: {
        years: 7
    },
    priorityEscalation: {
        daysBeforeAutoEscalate: 14
    }
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate unique witness ID
 */
function generateWitnessId() {
    return `WIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique evidence ID
 */
function generateEvidenceId() {
    return `EVD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique event ID
 */
function generateEventId() {
    return `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique interview ID
 */
function generateInterviewId() {
    return `INT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique communication ID
 */
function generateCommunicationId() {
    return `COM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Add timeline event to grievance
 */
function createTimelineEvent(eventType, description, descriptionAr, performedBy, notes = null) {
    return {
        eventId: generateEventId(),
        eventType,
        eventDate: new Date(),
        eventDescription: description,
        eventDescriptionAr: descriptionAr,
        performedBy,
        notes
    };
}

/**
 * Calculate priority based on grievance type and severity
 */
function calculatePriority(grievanceType, severity) {
    const urgentTypes = ['harassment', 'discrimination', 'safety', 'whistleblower', 'retaliation'];
    const highPriorityTypes = ['wrongful_termination', 'bullying'];

    if (severity === 'critical' || urgentTypes.includes(grievanceType)) {
        return 'urgent';
    }
    if (severity === 'serious' || highPriorityTypes.includes(grievanceType)) {
        return 'high';
    }
    if (severity === 'moderate') {
        return 'medium';
    }
    return 'low';
}

/**
 * Calculate risk assessment
 */
function calculateRiskAssessment(grievanceType, severity, protectedDisclosure) {
    const riskMapping = {
        critical: { legal: 'critical', reputational: 'high', financial: 'high', overall: 'critical' },
        serious: { legal: 'high', reputational: 'medium', financial: 'medium', overall: 'high' },
        moderate: { legal: 'medium', reputational: 'low', financial: 'low', overall: 'medium' },
        minor: { legal: 'low', reputational: 'low', financial: 'low', overall: 'low' }
    };

    const baseRisk = riskMapping[severity] || riskMapping.moderate;

    // Increase risk for protected disclosures (whistleblower)
    if (protectedDisclosure) {
        return {
            ...baseRisk,
            legal: 'critical',
            regulatoryRisk: 'high',
            overall: 'critical'
        };
    }

    return baseRisk;
}

// ═══════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all grievances with filtering, pagination, and sorting
 */
const getGrievances = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const {
        search,
        employeeId,
        grievanceType,
        grievanceCategory,
        status,
        priority,
        severity,
        fromDate,
        toDate,
        confidential,
        page = 1,
        limit = 20,
        sortBy = 'createdOn',
        sortOrder = 'desc'
    } = req.query;

    const query = { ...baseQuery };

    // Search filter
    if (search) {
        query.$or = [
            { grievanceSubject: { $regex: search, $options: 'i' } },
            { grievanceSubjectAr: { $regex: search, $options: 'i' } },
            { grievanceNumber: { $regex: search, $options: 'i' } },
            { grievanceId: { $regex: search, $options: 'i' } },
            { employeeName: { $regex: search, $options: 'i' } },
            { employeeNameAr: { $regex: search, $options: 'i' } }
        ];
    }

    // Field filters
    if (employeeId) query.employeeId = employeeId;
    if (grievanceType) query.grievanceType = grievanceType;
    if (grievanceCategory) query.grievanceCategory = grievanceCategory;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (severity) query.severity = severity;
    if (confidential !== undefined) query.confidential = confidential === 'true';

    // Date range filter
    if (fromDate || toDate) {
        query.filedDate = {};
        if (fromDate) query.filedDate.$gte = new Date(fromDate);
        if (toDate) query.filedDate.$lte = new Date(toDate);
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const sortDirection = sortOrder === 'desc' ? -1 : 1;

    const [grievances, total] = await Promise.all([
        Grievance.find(query)
            .populate('employeeId', 'employeeId personalInfo employment')
            .sort({ [sortBy]: sortDirection })
            .skip(skip)
            .limit(limitNum)
            .lean(),
        Grievance.countDocuments(query)
    ]);

    return res.json({
        success: true,
        data: grievances,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
        }
    });
});

/**
 * Get single grievance by ID
 */
const getGrievance = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const grievance = await Grievance.findOne({
        _id: req.params.id,
        ...baseQuery
    }).populate('employeeId', 'employeeId personalInfo employment');

    if (!grievance) {
        throw CustomException('Grievance not found', 404);
    }

    return res.json({
        success: true,
        grievance
    });
});

/**
 * Get grievances by employee
 */
const getEmployeeGrievances = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const { employeeId } = req.params;
    const { status } = req.query;

    const query = {
        ...baseQuery,
        employeeId
    };

    if (status) query.status = status;

    const grievances = await Grievance.find(query)
        .populate('employeeId', 'employeeId personalInfo')
        .sort({ filedDate: -1 });

    return res.json({
        success: true,
        grievances,
        total: grievances.length
    });
});

/**
 * Get grievance statistics
 */
const getGrievanceStats = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const [
        totalGrievances,
        activeGrievances,
        resolvedGrievances,
        escalatedCases,
        pendingInvestigation,
        byType,
        byStatus,
        byPriority,
        bySeverity,
        resolvedWithDuration
    ] = await Promise.all([
        Grievance.countDocuments(baseQuery),
        Grievance.countDocuments({ ...baseQuery, status: { $in: ['submitted', 'under_review', 'investigating'] } }),
        Grievance.countDocuments({ ...baseQuery, status: 'resolved' }),
        Grievance.countDocuments({ ...baseQuery, status: 'escalated' }),
        Grievance.countDocuments({ ...baseQuery, status: 'investigating' }),
        Grievance.aggregate([
            { $match: baseQuery },
            { $group: { _id: '$grievanceType', count: { $sum: 1 } } }
        ]),
        Grievance.aggregate([
            { $match: baseQuery },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        Grievance.aggregate([
            { $match: baseQuery },
            { $group: { _id: '$priority', count: { $sum: 1 } } }
        ]),
        Grievance.aggregate([
            { $match: baseQuery },
            { $group: { _id: '$severity', count: { $sum: 1 } } }
        ]),
        Grievance.aggregate([
            { $match: { ...baseQuery, status: 'resolved', 'resolution.resolutionDate': { $exists: true } } },
            {
                $project: {
                    duration: {
                        $divide: [
                            { $subtract: ['$resolution.resolutionDate', '$filedDate'] },
                            1000 * 60 * 60 * 24
                        ]
                    }
                }
            },
            { $group: { _id: null, avgDays: { $avg: '$duration' } } }
        ])
    ]);

    // Calculate resolution rate
    const resolutionRate = totalGrievances > 0
        ? Math.round((resolvedGrievances / totalGrievances) * 100)
        : 0;

    // Calculate upheld rate
    const upheldCount = await Grievance.countDocuments({
        ...baseQuery,
        'resolution.decision.outcome': { $in: ['grievance_upheld', 'grievance_partially_upheld'] }
    });
    const upheldRate = resolvedGrievances > 0
        ? Math.round((upheldCount / resolvedGrievances) * 100)
        : 0;

    // Count overdue grievances
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - GRIEVANCE_POLICIES.resolution.targetDays);
    const overdueCount = await Grievance.countDocuments({
        ...baseQuery,
        status: { $in: ['submitted', 'under_review', 'investigating'] },
        filedDate: { $lte: thresholdDate }
    });

    return res.json({
        success: true,
        stats: {
            totalGrievances,
            activeGrievances,
            resolvedGrievances,
            escalatedCases,
            pendingInvestigation,
            overdueGrievances: overdueCount,
            averageResolutionDays: Math.round(resolvedWithDuration[0]?.avgDays || 0),
            resolutionRate,
            upheldRate,
            byType: Object.fromEntries(byType.map(t => [t._id, t.count])),
            byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])),
            byPriority: Object.fromEntries(byPriority.map(p => [p._id, p.count])),
            bySeverity: Object.fromEntries(bySeverity.map(s => [s._id, s.count]))
        }
    });
});

/**
 * Create new grievance
 */
const createGrievance = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const {
        employeeId,
        grievanceType,
        grievanceCategory,
        grievanceSubject,
        grievanceDescription,
        filedDate,
        severity,
        ...otherData
    } = req.body;

    // Validate employee
    const employee = await Employee.findById(employeeId);
    if (!employee) {
        throw CustomException('Employee not found', 404);
    }

    // Extract employee info
    const employeeName = employee.personalInfo?.fullNameEnglish ||
        employee.personalInfo?.fullNameArabic ||
        employee.personalInfo?.firstName + ' ' + employee.personalInfo?.lastName;
    const employeeNameAr = employee.personalInfo?.fullNameArabic;
    const employeeNumber = employee.employeeId;
    const department = employee.employment?.department;
    const jobTitle = employee.employment?.jobTitle;
    const email = employee.personalInfo?.email;
    const phone = employee.personalInfo?.mobile;

    // Calculate priority
    const priority = calculatePriority(grievanceType, severity || 'moderate');

    // Calculate risk assessment
    const riskAssessment = calculateRiskAssessment(
        grievanceType,
        severity || 'moderate',
        otherData.protectedDisclosure || false
    );

    // Create grievance
    const grievance = new Grievance({
        firmId: firmId || undefined,
        lawyerId: !firmId ? lawyerId : undefined,
        employeeId,
        employeeName,
        employeeNameAr,
        employeeNumber,
        department,
        jobTitle,
        email,
        phone,
        grievanceType,
        grievanceCategory: grievanceCategory || 'individual',
        grievanceSubject,
        grievanceDescription,
        filedDate: filedDate || new Date(),
        severity: severity || 'moderate',
        priority,
        status: 'submitted',
        statusDate: new Date(),
        assessment: {
            assessed: false,
            initialReview: {
                riskAssessment
            }
        },
        timeline: [
            createTimelineEvent(
                'filed',
                'Grievance filed',
                'تم تقديم الشكوى',
                req.userID
            )
        ],
        createdBy: req.userID,
        ...otherData
    });

    await grievance.save();

    return res.status(201).json({
        success: true,
        message: 'Grievance filed successfully',
        grievance
    });
});

/**
 * Update grievance
 */
const updateGrievance = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const grievance = await Grievance.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!grievance) {
        throw CustomException('Grievance not found', 404);
    }

    // Prevent updates on closed grievances
    if (grievance.status === 'closed') {
        throw CustomException('Cannot update closed grievance', 400);
    }

    // Update fields
    const updateFields = { ...req.body, updatedBy: req.userID };
    delete updateFields.grievanceId;
    delete updateFields.grievanceNumber;
    delete updateFields.firmId;
    delete updateFields.lawyerId;
    delete updateFields.employeeId;
    delete updateFields.createdBy;

    Object.assign(grievance, updateFields);
    await grievance.save();

    return res.json({
        success: true,
        message: 'Grievance updated successfully',
        grievance
    });
});

/**
 * Delete grievance
 */
const deleteGrievance = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const grievance = await Grievance.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!grievance) {
        throw CustomException('Grievance not found', 404);
    }

    // Only allow deletion of submitted grievances
    if (grievance.status !== 'submitted') {
        throw CustomException('Only submitted grievances can be deleted. Use withdrawal for other statuses.', 400);
    }

    await Grievance.deleteOne({ _id: req.params.id });

    return res.json({
        success: true,
        message: 'Grievance deleted successfully'
    });
});

/**
 * Bulk delete grievances
 */
const bulkDeleteGrievances = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw CustomException('Please provide an array of grievance IDs to delete', 400);
    }

    // Only delete submitted grievances
    const result = await Grievance.deleteMany({
        _id: { $in: ids },
        ...baseQuery,
        status: 'submitted'
    });

    return res.json({
        success: true,
        message: `${result.deletedCount} grievance(s) deleted successfully`,
        deletedCount: result.deletedCount
    });
});

// ═══════════════════════════════════════════════════════════════
// WORKFLOW OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Acknowledge grievance receipt
 */
const acknowledgeGrievance = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const grievance = await Grievance.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!grievance) {
        throw CustomException('Grievance not found', 404);
    }

    grievance.filing = grievance.filing || {};
    grievance.filing.acknowledgment = {
        acknowledged: true,
        acknowledgmentDate: new Date(),
        acknowledgmentMethod: req.body.method || 'email',
        acknowledgmentSent: true,
        acknowledgmentReference: `ACK-${grievance.grievanceId}`,
        employeeNotified: true,
        notificationDate: new Date()
    };

    grievance.status = 'under_review';
    grievance.statusDate = new Date();
    grievance.updatedBy = req.userID;

    grievance.timeline.push(
        createTimelineEvent(
            'acknowledged',
            'Grievance acknowledged and under review',
            'تم استلام الشكوى وهي قيد المراجعة',
            req.userID
        )
    );

    await grievance.save();

    return res.json({
        success: true,
        message: 'Grievance acknowledged successfully',
        grievance
    });
});

/**
 * Start investigation
 */
const startInvestigation = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const { investigatorName, investigatorType, scope, methodology } = req.body;

    const grievance = await Grievance.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!grievance) {
        throw CustomException('Grievance not found', 404);
    }

    if (!['submitted', 'under_review'].includes(grievance.status)) {
        throw CustomException('Investigation can only be started for submitted or under review grievances', 400);
    }

    grievance.status = 'investigating';
    grievance.statusDate = new Date();
    grievance.updatedBy = req.userID;

    grievance.investigation = grievance.investigation || {};
    grievance.investigation.investigationRequired = true;
    grievance.investigation.investigationStartDate = new Date();
    grievance.investigation.investigationCompleted = false;
    grievance.investigation.investigators = [{
        investigatorName,
        investigatorType: investigatorType || 'internal_hr',
        role: 'lead',
        independentOfParties: true,
        conflictOfInterest: false
    }];

    if (scope || methodology) {
        grievance.investigation.investigationPlan = {
            scope,
            methodology
        };
    }

    grievance.timeline.push(
        createTimelineEvent(
            'investigation_started',
            `Investigation started by ${investigatorName}`,
            `بدأ التحقيق بواسطة ${investigatorName}`,
            req.userID
        )
    );

    await grievance.save();

    return res.json({
        success: true,
        message: 'Investigation started successfully',
        grievance
    });
});

/**
 * Complete investigation
 */
const completeInvestigation = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const { substantiated, findingsNarrative, findingsNarrativeAr, recommendations } = req.body;

    const grievance = await Grievance.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!grievance) {
        throw CustomException('Grievance not found', 404);
    }

    if (grievance.status !== 'investigating') {
        throw CustomException('Grievance is not under investigation', 400);
    }

    grievance.investigation.investigationCompleted = true;
    grievance.investigation.investigationEndDate = new Date();
    grievance.investigation.completionDate = new Date();

    // Calculate investigation duration
    if (grievance.investigation.investigationStartDate) {
        const startDate = new Date(grievance.investigation.investigationStartDate);
        const endDate = new Date();
        grievance.investigation.investigationDuration = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
    }

    grievance.investigation.findings = {
        findingsDate: new Date(),
        substantiated,
        findingLevel: substantiated ? 'substantiated' : 'unsubstantiated',
        findingsNarrative,
        findingsNarrativeAr
    };

    if (recommendations && recommendations.length > 0) {
        grievance.investigation.investigationReport = {
            reportPrepared: true,
            reportDate: new Date(),
            recommendations
        };
    }

    grievance.updatedBy = req.userID;

    grievance.timeline.push(
        createTimelineEvent(
            'investigation_completed',
            `Investigation completed - ${substantiated ? 'Substantiated' : 'Not substantiated'}`,
            `اكتمل التحقيق - ${substantiated ? 'مثبتة' : 'غير مثبتة'}`,
            req.userID
        )
    );

    await grievance.save();

    return res.json({
        success: true,
        message: 'Investigation completed successfully',
        grievance
    });
});

/**
 * Resolve grievance
 */
const resolveGrievance = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const {
        resolutionMethod,
        outcome,
        decisionSummary,
        decisionSummaryAr,
        actionsTaken,
        disciplinaryAction,
        remedialActions
    } = req.body;

    const grievance = await Grievance.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!grievance) {
        throw CustomException('Grievance not found', 404);
    }

    if (['resolved', 'closed', 'withdrawn'].includes(grievance.status)) {
        throw CustomException('Grievance is already resolved, closed, or withdrawn', 400);
    }

    grievance.status = 'resolved';
    grievance.statusDate = new Date();
    grievance.updatedBy = req.userID;

    grievance.resolution = {
        resolved: true,
        resolutionDate: new Date(),
        resolutionMethod: resolutionMethod || 'management_decision',
        decision: {
            decisionMaker: req.user?.name || 'HR Manager',
            decisionDate: new Date(),
            decisionSummary,
            decisionSummaryAr,
            outcome
        },
        actionsTaken: actionsTaken || [],
        disciplinaryAction,
        remedialActions: remedialActions || [],
        resolutionLetter: {
            issued: false
        }
    };

    // Set appeal deadline (15 days per Saudi Labor Law Article 69)
    grievance.appeal = grievance.appeal || {};
    grievance.appeal.appealAllowed = true;
    const appealDeadline = new Date();
    appealDeadline.setDate(appealDeadline.getDate() + GRIEVANCE_POLICIES.appeal.deadlineDays);
    grievance.appeal.appealDeadline = appealDeadline;

    grievance.timeline.push(
        createTimelineEvent(
            'resolution',
            `Grievance resolved - ${outcome}`,
            'تم حل الشكوى',
            req.userID
        )
    );

    await grievance.save();

    return res.json({
        success: true,
        message: 'Grievance resolved successfully',
        grievance
    });
});

/**
 * Escalate grievance
 */
const escalateGrievance = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const { reason, escalateTo } = req.body;

    const grievance = await Grievance.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!grievance) {
        throw CustomException('Grievance not found', 404);
    }

    grievance.status = 'escalated';
    grievance.statusDate = new Date();
    grievance.statusReason = reason;
    grievance.updatedBy = req.userID;

    // Increase priority if not already urgent
    if (grievance.priority !== 'urgent') {
        grievance.priority = 'high';
    }

    grievance.timeline.push(
        createTimelineEvent(
            'other',
            `Grievance escalated${escalateTo ? ` to ${escalateTo}` : ''}: ${reason}`,
            'تم تصعيد الشكوى',
            req.userID
        )
    );

    await grievance.save();

    return res.json({
        success: true,
        message: 'Grievance escalated successfully',
        grievance
    });
});

/**
 * Withdraw grievance
 */
const withdrawGrievance = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const { reason, reasonCategory, coerced } = req.body;

    const grievance = await Grievance.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!grievance) {
        throw CustomException('Grievance not found', 404);
    }

    if (['resolved', 'closed', 'withdrawn'].includes(grievance.status)) {
        throw CustomException('Grievance cannot be withdrawn in current status', 400);
    }

    // Determine withdrawal stage
    let withdrawalStage = 'initial';
    if (grievance.status === 'investigating') {
        withdrawalStage = 'investigation';
    } else if (grievance.appeal?.appealFiled) {
        withdrawalStage = 'appeal';
    }

    grievance.status = 'withdrawn';
    grievance.statusDate = new Date();
    grievance.statusReason = reason;
    grievance.updatedBy = req.userID;

    grievance.withdrawal = {
        withdrawn: true,
        withdrawalDate: new Date(),
        withdrawnBy: 'complainant',
        withdrawalStage,
        withdrawalReason: reason,
        withdrawalReasonCategory: reasonCategory || 'personal_reasons',
        coerced: coerced || false,
        acceptedBy: req.user?.name || 'HR',
        acceptanceDate: new Date()
    };

    grievance.timeline.push(
        createTimelineEvent(
            'other',
            `Grievance withdrawn: ${reason}`,
            'تم سحب الشكوى',
            req.userID
        )
    );

    await grievance.save();

    return res.json({
        success: true,
        message: 'Grievance withdrawn successfully',
        grievance
    });
});

/**
 * Close grievance
 */
const closeGrievance = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const { closureReason, lessonsLearned } = req.body;

    const grievance = await Grievance.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!grievance) {
        throw CustomException('Grievance not found', 404);
    }

    if (!['resolved', 'withdrawn'].includes(grievance.status)) {
        throw CustomException('Grievance must be resolved or withdrawn before closing', 400);
    }

    grievance.status = 'closed';
    grievance.statusDate = new Date();
    grievance.updatedBy = req.userID;

    // Set file retention
    const retentionStartDate = new Date();
    const retentionEndDate = new Date();
    retentionEndDate.setFullYear(retentionEndDate.getFullYear() + GRIEVANCE_POLICIES.fileRetention.years);

    grievance.closure = {
        closed: true,
        closureDate: new Date(),
        closureReason: closureReason || (grievance.status === 'withdrawn' ? 'withdrawn' : 'resolved'),
        closureApproved: true,
        closedBy: req.userID,
        lessonsLearned: lessonsLearned || {},
        fileRetention: {
            retentionPeriod: GRIEVANCE_POLICIES.fileRetention.years,
            retentionStartDate,
            retentionEndDate,
            destructionScheduled: true,
            destructionDate: retentionEndDate
        }
    };

    grievance.timeline.push(
        createTimelineEvent(
            'closure',
            'Grievance closed',
            'تم إغلاق الشكوى',
            req.userID
        )
    );

    await grievance.save();

    return res.json({
        success: true,
        message: 'Grievance closed successfully',
        grievance
    });
});

// ═══════════════════════════════════════════════════════════════
// TIMELINE & EVIDENCE
// ═══════════════════════════════════════════════════════════════

/**
 * Add timeline event
 */
const addTimelineEvent = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const grievance = await Grievance.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!grievance) {
        throw CustomException('Grievance not found', 404);
    }

    const event = {
        ...req.body,
        eventId: generateEventId(),
        eventDate: req.body.eventDate || new Date(),
        performedBy: req.userID
    };

    grievance.timeline.push(event);
    grievance.updatedBy = req.userID;
    await grievance.save();

    return res.json({
        success: true,
        message: 'Timeline event added successfully',
        event: grievance.timeline[grievance.timeline.length - 1]
    });
});

/**
 * Add witness
 */
const addWitness = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const grievance = await Grievance.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!grievance) {
        throw CustomException('Grievance not found', 404);
    }

    const witness = {
        ...req.body,
        witnessId: generateWitnessId()
    };

    grievance.witnesses.push(witness);
    grievance.updatedBy = req.userID;
    await grievance.save();

    return res.json({
        success: true,
        message: 'Witness added successfully',
        witness: grievance.witnesses[grievance.witnesses.length - 1]
    });
});

/**
 * Add evidence
 */
const addEvidence = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const grievance = await Grievance.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!grievance) {
        throw CustomException('Grievance not found', 404);
    }

    const evidence = {
        ...req.body,
        evidenceId: generateEvidenceId(),
        dateObtained: req.body.dateObtained || new Date()
    };

    grievance.evidence.push(evidence);
    grievance.updatedBy = req.userID;

    // Add to timeline
    grievance.timeline.push(
        createTimelineEvent(
            'evidence_collected',
            `Evidence collected: ${req.body.evidenceDescription || req.body.evidenceType}`,
            'تم جمع الأدلة',
            req.userID
        )
    );

    await grievance.save();

    return res.json({
        success: true,
        message: 'Evidence added successfully',
        evidence: grievance.evidence[grievance.evidence.length - 1]
    });
});

/**
 * Add interview
 */
const addInterview = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const grievance = await Grievance.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!grievance) {
        throw CustomException('Grievance not found', 404);
    }

    const interview = {
        ...req.body,
        interviewId: generateInterviewId(),
        interviewDate: req.body.interviewDate || new Date()
    };

    grievance.investigation = grievance.investigation || {};
    grievance.investigation.interviews = grievance.investigation.interviews || [];
    grievance.investigation.interviews.push(interview);
    grievance.updatedBy = req.userID;

    // Add to timeline
    grievance.timeline.push(
        createTimelineEvent(
            'interview',
            `Interview conducted with ${req.body.intervieweeName}`,
            `تم إجراء مقابلة مع ${req.body.intervieweeName}`,
            req.userID
        )
    );

    await grievance.save();

    return res.json({
        success: true,
        message: 'Interview added successfully',
        interview: grievance.investigation.interviews[grievance.investigation.interviews.length - 1]
    });
});

// ═══════════════════════════════════════════════════════════════
// APPEAL
// ═══════════════════════════════════════════════════════════════

/**
 * File appeal
 */
const fileAppeal = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const { appealBy, appealGrounds, appealNarrative, reliefSought } = req.body;

    const grievance = await Grievance.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!grievance) {
        throw CustomException('Grievance not found', 404);
    }

    if (grievance.status !== 'resolved') {
        throw CustomException('Appeal can only be filed for resolved grievances', 400);
    }

    // Check if within appeal deadline
    if (grievance.appeal?.appealDeadline && new Date() > new Date(grievance.appeal.appealDeadline)) {
        throw CustomException('Appeal deadline has passed', 400);
    }

    grievance.appeal = grievance.appeal || {};
    grievance.appeal.appealFiled = true;
    grievance.appeal.appealFiledDate = new Date();
    grievance.appeal.appealBy = appealBy || 'complainant';
    grievance.appeal.appealDetails = {
        appealGrounds: appealGrounds || [],
        appealNarrative,
        reliefSought
    };

    grievance.updatedBy = req.userID;

    grievance.timeline.push(
        createTimelineEvent(
            'appeal',
            `Appeal filed by ${appealBy || 'complainant'}`,
            'تم تقديم استئناف',
            req.userID
        )
    );

    await grievance.save();

    return res.json({
        success: true,
        message: 'Appeal filed successfully',
        grievance
    });
});

/**
 * Decide appeal
 */
const decideAppeal = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const { appealDecision, decisionRationale, modifications, reviewLevel } = req.body;

    const grievance = await Grievance.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!grievance) {
        throw CustomException('Grievance not found', 404);
    }

    if (!grievance.appeal?.appealFiled) {
        throw CustomException('No appeal has been filed', 400);
    }

    grievance.appeal.appealReview = {
        reviewedBy: req.user?.name || 'Senior Management',
        reviewDate: new Date(),
        reviewLevel: reviewLevel || 'senior_management',
        appealDecision,
        decisionDate: new Date(),
        decisionRationale,
        modifications,
        finalDecision: true
    };

    grievance.updatedBy = req.userID;

    grievance.timeline.push(
        createTimelineEvent(
            'appeal',
            `Appeal decision: ${appealDecision}`,
            'قرار الاستئناف',
            req.userID
        )
    );

    await grievance.save();

    return res.json({
        success: true,
        message: 'Appeal decision recorded successfully',
        grievance
    });
});

// ═══════════════════════════════════════════════════════════════
// LABOR OFFICE ESCALATION
// ═══════════════════════════════════════════════════════════════

/**
 * Escalate to labor office
 */
const escalateToLaborOffice = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const { escalationReason, laborOffice, submittedBy } = req.body;

    const grievance = await Grievance.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!grievance) {
        throw CustomException('Grievance not found', 404);
    }

    grievance.laborOfficeEscalation = {
        escalatedToLaborOffice: true,
        escalationReason: escalationReason || 'unresolved_internally',
        escalationDate: new Date(),
        laborOffice: laborOffice || {},
        submission: {
            submittedBy: submittedBy || 'employee',
            submissionDate: new Date()
        },
        conciliationAttempt: {
            attempted: false
        }
    };

    grievance.status = 'escalated';
    grievance.statusDate = new Date();
    grievance.statusReason = 'Escalated to Labor Office';
    grievance.updatedBy = req.userID;

    grievance.timeline.push(
        createTimelineEvent(
            'labor_office',
            'Grievance escalated to Labor Office',
            'تم تصعيد الشكوى إلى مكتب العمل',
            req.userID
        )
    );

    await grievance.save();

    return res.json({
        success: true,
        message: 'Grievance escalated to Labor Office successfully',
        grievance
    });
});

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

/**
 * Export grievances
 */
const exportGrievances = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const { format = 'json', status, grievanceType, fromDate, toDate } = req.query;

    const query = { ...baseQuery };
    if (status) query.status = status;
    if (grievanceType) query.grievanceType = grievanceType;
    if (fromDate || toDate) {
        query.filedDate = {};
        if (fromDate) query.filedDate.$gte = new Date(fromDate);
        if (toDate) query.filedDate.$lte = new Date(toDate);
    }

    const grievances = await Grievance.find(query)
        .populate('employeeId', 'employeeId personalInfo')
        .lean();

    if (format === 'csv') {
        const headers = [
            'Grievance ID', 'Employee Name', 'Employee Number', 'Department',
            'Type', 'Category', 'Subject', 'Filed Date', 'Status',
            'Priority', 'Severity', 'Resolution Date', 'Outcome'
        ];

        const rows = grievances.map(g => [
            g.grievanceId,
            g.employeeName,
            g.employeeNumber,
            g.department,
            g.grievanceType,
            g.grievanceCategory,
            g.grievanceSubject,
            g.filedDate?.toISOString().split('T')[0],
            g.status,
            g.priority,
            g.severity,
            g.resolution?.resolutionDate?.toISOString().split('T')[0] || '',
            g.resolution?.decision?.outcome || ''
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c || ''}"`).join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=grievances-export.csv');
        return res.send(csv);
    }

    return res.json({
        success: true,
        data: grievances,
        total: grievances.length,
        exportedAt: new Date()
    });
});

/**
 * Get overdue grievances
 */
const getOverdueGrievances = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const daysThreshold = parseInt(req.query.days) || GRIEVANCE_POLICIES.resolution.targetDays;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    const grievances = await Grievance.find({
        ...baseQuery,
        status: { $in: ['submitted', 'under_review', 'investigating'] },
        filedDate: { $lte: thresholdDate }
    })
        .populate('employeeId', 'employeeId personalInfo')
        .sort({ filedDate: 1 });

    return res.json({
        success: true,
        grievances,
        total: grievances.length,
        daysThreshold
    });
});

// ═══════════════════════════════════════════════════════════════
// MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // CRUD
    getGrievances,
    getGrievance,
    getEmployeeGrievances,
    getGrievanceStats,
    createGrievance,
    updateGrievance,
    deleteGrievance,
    bulkDeleteGrievances,

    // Workflow
    acknowledgeGrievance,
    startInvestigation,
    completeInvestigation,
    resolveGrievance,
    escalateGrievance,
    withdrawGrievance,
    closeGrievance,

    // Timeline & Evidence
    addTimelineEvent,
    addWitness,
    addEvidence,
    addInterview,

    // Appeal
    fileAppeal,
    decideAppeal,

    // Labor Office
    escalateToLaborOffice,

    // Export & Reports
    exportGrievances,
    getOverdueGrievances
};
