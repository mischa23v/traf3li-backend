const Grievance = require('../models/grievance.model');
const Employee = require('../models/employee.model');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const { pickAllowedFields, sanitizeObjectId, sanitizeForLog } = require('../utils/securityUtils');
const { sanitizeRichText, stripHtml } = require('../utils/sanitize');

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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(req.params.id);
    if (!sanitizedId) {
        throw CustomException('Invalid grievance ID format', 400);
    }

    // IDOR Protection: Verify grievance belongs to firm/lawyer
    const grievance = await Grievance.findOne({
        _id: sanitizedId,
        ...baseQuery
    }).populate('employeeId', 'employeeId personalInfo employment');

    if (!grievance) {
        throw CustomException('Grievance not found or access denied', 404);
    }

    // Confidentiality check: Only authorized viewers can access confidential grievances
    if (grievance.confidential) {
        const userId = req.userID?.toString();
        const createdBy = grievance.createdBy?.toString();
        const assignedTo = grievance.assignedTo?.toString();

        // Allow access only to creator, assigned person, or firm/lawyer owner
        const isAuthorized =
            userId === createdBy ||
            userId === assignedTo ||
            (firmId && grievance.firmId?.toString() === firmId.toString()) ||
            (lawyerId && grievance.lawyerId?.toString() === lawyerId.toString());

        if (!isAuthorized) {
            throw CustomException('Access denied: This is a confidential grievance', 403);
        }
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Sanitize ObjectId
    const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
    if (!sanitizedEmployeeId) {
        throw CustomException('Invalid employee ID format', 400);
    }

    // IDOR Protection: Verify employee belongs to firm/lawyer
    const employee = await Employee.findOne({
        _id: sanitizedEmployeeId,
        ...baseQuery
    });

    if (!employee) {
        throw CustomException('Employee not found or access denied', 404);
    }

    const { status } = req.query;

    const query = {
        ...baseQuery,
        employeeId: sanitizedEmployeeId
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

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

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'employeeId', 'grievanceType', 'grievanceCategory', 'grievanceSubject',
        'grievanceSubjectAr', 'grievanceDescription', 'grievanceDescriptionAr',
        'filedDate', 'severity', 'confidential', 'protectedDisclosure',
        'anonymousComplaint', 'incidentDate', 'incidentLocation',
        'witnessesAvailable', 'evidenceAvailable', 'desiredOutcome',
        'urgencyLevel', 'contactPreference'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Sanitize ObjectId
    const sanitizedEmployeeId = sanitizeObjectId(safeData.employeeId);
    if (!sanitizedEmployeeId) {
        throw CustomException('Invalid employee ID format', 400);
    }

    // IDOR Protection: Validate employee belongs to the firm/lawyer
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const employee = await Employee.findOne({
        _id: sanitizedEmployeeId,
        ...baseQuery
    });

    if (!employee) {
        throw CustomException('Employee not found or access denied', 404);
    }

    // Input validation and XSS prevention
    if (!safeData.grievanceType || !safeData.grievanceSubject) {
        throw CustomException('Grievance type and subject are required', 400);
    }

    // Sanitize text fields to prevent XSS
    const grievanceSubject = stripHtml(safeData.grievanceSubject);
    const grievanceSubjectAr = safeData.grievanceSubjectAr ? stripHtml(safeData.grievanceSubjectAr) : undefined;
    const grievanceDescription = safeData.grievanceDescription ? sanitizeRichText(safeData.grievanceDescription) : '';
    const grievanceDescriptionAr = safeData.grievanceDescriptionAr ? sanitizeRichText(safeData.grievanceDescriptionAr) : undefined;

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
    const severity = safeData.severity || 'moderate';
    const priority = calculatePriority(safeData.grievanceType, severity);

    // Calculate risk assessment
    const riskAssessment = calculateRiskAssessment(
        safeData.grievanceType,
        severity,
        safeData.protectedDisclosure || false
    );

    // Create grievance with sanitized and validated data
    const grievance = new Grievance({
        firmId: firmId || undefined,
        lawyerId: !firmId ? lawyerId : undefined,
        employeeId: sanitizedEmployeeId,
        employeeName,
        employeeNameAr,
        employeeNumber,
        department,
        jobTitle,
        email,
        phone,
        grievanceType: safeData.grievanceType,
        grievanceCategory: safeData.grievanceCategory || 'individual',
        grievanceSubject,
        grievanceSubjectAr,
        grievanceDescription,
        grievanceDescriptionAr,
        filedDate: safeData.filedDate || new Date(),
        severity,
        priority,
        status: 'submitted',
        statusDate: new Date(),
        confidential: safeData.confidential === true,
        protectedDisclosure: safeData.protectedDisclosure === true,
        anonymousComplaint: safeData.anonymousComplaint === true,
        incidentDate: safeData.incidentDate,
        incidentLocation: safeData.incidentLocation ? stripHtml(safeData.incidentLocation) : undefined,
        witnessesAvailable: safeData.witnessesAvailable,
        evidenceAvailable: safeData.evidenceAvailable,
        desiredOutcome: safeData.desiredOutcome ? sanitizeRichText(safeData.desiredOutcome) : undefined,
        urgencyLevel: safeData.urgencyLevel,
        contactPreference: safeData.contactPreference,
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
        createdBy: req.userID
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(req.params.id);
    if (!sanitizedId) {
        throw CustomException('Invalid grievance ID format', 400);
    }

    // IDOR Protection: Verify grievance belongs to firm/lawyer
    const grievance = await Grievance.findOne({
        _id: sanitizedId,
        ...baseQuery
    });

    if (!grievance) {
        throw CustomException('Grievance not found or access denied', 404);
    }

    // Prevent updates on closed grievances
    if (grievance.status === 'closed') {
        throw CustomException('Cannot update closed grievance', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'grievanceSubject', 'grievanceSubjectAr',
        'grievanceDescription', 'grievanceDescriptionAr',
        'severity', 'priority', 'confidential',
        'incidentDate', 'incidentLocation',
        'witnessesAvailable', 'evidenceAvailable',
        'desiredOutcome', 'urgencyLevel', 'contactPreference',
        'statusReason', 'internalNotes'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Sanitize text fields to prevent XSS
    if (safeData.grievanceSubject) {
        safeData.grievanceSubject = stripHtml(safeData.grievanceSubject);
    }
    if (safeData.grievanceSubjectAr) {
        safeData.grievanceSubjectAr = stripHtml(safeData.grievanceSubjectAr);
    }
    if (safeData.grievanceDescription) {
        safeData.grievanceDescription = sanitizeRichText(safeData.grievanceDescription);
    }
    if (safeData.grievanceDescriptionAr) {
        safeData.grievanceDescriptionAr = sanitizeRichText(safeData.grievanceDescriptionAr);
    }
    if (safeData.incidentLocation) {
        safeData.incidentLocation = stripHtml(safeData.incidentLocation);
    }
    if (safeData.desiredOutcome) {
        safeData.desiredOutcome = sanitizeRichText(safeData.desiredOutcome);
    }
    if (safeData.internalNotes) {
        safeData.internalNotes = sanitizeRichText(safeData.internalNotes);
    }

    // Update fields with sanitized data
    Object.assign(grievance, safeData);
    grievance.updatedBy = req.userID;

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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // SECURITY: TOCTOU Fix - Use atomic delete with status check in query
    // This prevents race conditions where status could change between check and delete
    const result = await Grievance.deleteOne({
        _id: req.params.id,
        ...baseQuery,
        status: 'submitted'  // Include status check in delete query
    });

    if (result.deletedCount === 0) {
        // Check why deletion failed
        const existingGrievance = await Grievance.findOne({
            _id: req.params.id,
            ...baseQuery
        });
        if (existingGrievance) {
            throw CustomException('Only submitted grievances can be deleted. Use withdrawal for other statuses.', 400);
        }
        throw CustomException('Grievance not found', 404);
    }

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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(req.params.id);
    if (!sanitizedId) {
        throw CustomException('Invalid grievance ID format', 400);
    }

    // IDOR Protection: Verify grievance belongs to firm/lawyer
    const grievance = await Grievance.findOne({
        _id: sanitizedId,
        ...baseQuery
    });

    if (!grievance) {
        throw CustomException('Grievance not found or access denied', 404);
    }

    if (!['submitted', 'under_review'].includes(grievance.status)) {
        throw CustomException('Investigation can only be started for submitted or under review grievances', 400);
    }

    // Mass assignment protection
    const allowedFields = [
        'investigatorName', 'investigatorType', 'scope', 'methodology',
        'estimatedDuration', 'objectives'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (!safeData.investigatorName) {
        throw CustomException('Investigator name is required', 400);
    }

    // Sanitize text fields
    const investigatorName = stripHtml(safeData.investigatorName);
    const scope = safeData.scope ? sanitizeRichText(safeData.scope) : undefined;
    const methodology = safeData.methodology ? sanitizeRichText(safeData.methodology) : undefined;

    grievance.status = 'investigating';
    grievance.statusDate = new Date();
    grievance.updatedBy = req.userID;

    grievance.investigation = grievance.investigation || {};
    grievance.investigation.investigationRequired = true;
    grievance.investigation.investigationStartDate = new Date();
    grievance.investigation.investigationCompleted = false;
    grievance.investigation.investigators = [{
        investigatorName,
        investigatorType: safeData.investigatorType || 'internal_hr',
        role: 'lead',
        independentOfParties: true,
        conflictOfInterest: false
    }];

    if (scope || methodology) {
        grievance.investigation.investigationPlan = {
            scope,
            methodology,
            objectives: safeData.objectives ? sanitizeRichText(safeData.objectives) : undefined
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(req.params.id);
    if (!sanitizedId) {
        throw CustomException('Invalid grievance ID format', 400);
    }

    // IDOR Protection: Verify grievance belongs to firm/lawyer
    const grievance = await Grievance.findOne({
        _id: sanitizedId,
        ...baseQuery
    });

    if (!grievance) {
        throw CustomException('Grievance not found or access denied', 404);
    }

    if (grievance.status !== 'investigating') {
        throw CustomException('Grievance is not under investigation', 400);
    }

    // Mass assignment protection
    const allowedFields = [
        'substantiated', 'findingsNarrative', 'findingsNarrativeAr',
        'recommendations', 'evidenceReviewed', 'witnessesInterviewed'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (safeData.substantiated === undefined) {
        throw CustomException('Substantiated status is required', 400);
    }

    // Sanitize text fields
    const findingsNarrative = safeData.findingsNarrative ? sanitizeRichText(safeData.findingsNarrative) : '';
    const findingsNarrativeAr = safeData.findingsNarrativeAr ? sanitizeRichText(safeData.findingsNarrativeAr) : undefined;

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
        substantiated: safeData.substantiated,
        findingLevel: safeData.substantiated ? 'substantiated' : 'unsubstantiated',
        findingsNarrative,
        findingsNarrativeAr
    };

    if (safeData.recommendations && Array.isArray(safeData.recommendations) && safeData.recommendations.length > 0) {
        // Sanitize each recommendation
        const sanitizedRecommendations = safeData.recommendations.map(rec => {
            if (typeof rec === 'string') {
                return sanitizeRichText(rec);
            }
            return rec;
        });

        grievance.investigation.investigationReport = {
            reportPrepared: true,
            reportDate: new Date(),
            recommendations: sanitizedRecommendations
        };
    }

    grievance.updatedBy = req.userID;

    grievance.timeline.push(
        createTimelineEvent(
            'investigation_completed',
            `Investigation completed - ${safeData.substantiated ? 'Substantiated' : 'Not substantiated'}`,
            `اكتمل التحقيق - ${safeData.substantiated ? 'مثبتة' : 'غير مثبتة'}`,
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(req.params.id);
    if (!sanitizedId) {
        throw CustomException('Invalid grievance ID format', 400);
    }

    // IDOR Protection: Verify grievance belongs to firm/lawyer
    const grievance = await Grievance.findOne({
        _id: sanitizedId,
        ...baseQuery
    });

    if (!grievance) {
        throw CustomException('Grievance not found or access denied', 404);
    }

    if (['resolved', 'closed', 'withdrawn'].includes(grievance.status)) {
        throw CustomException('Grievance is already resolved, closed, or withdrawn', 400);
    }

    // Mass assignment protection
    const allowedFields = [
        'resolutionMethod', 'outcome', 'decisionSummary', 'decisionSummaryAr',
        'actionsTaken', 'disciplinaryAction', 'remedialActions',
        'compensationAwarded', 'followUpRequired'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (!safeData.outcome) {
        throw CustomException('Resolution outcome is required', 400);
    }

    // Sanitize text fields
    const decisionSummary = safeData.decisionSummary ? sanitizeRichText(safeData.decisionSummary) : '';
    const decisionSummaryAr = safeData.decisionSummaryAr ? sanitizeRichText(safeData.decisionSummaryAr) : undefined;

    // Sanitize arrays
    const actionsTaken = Array.isArray(safeData.actionsTaken)
        ? safeData.actionsTaken.map(action => typeof action === 'string' ? stripHtml(action) : action)
        : [];

    const remedialActions = Array.isArray(safeData.remedialActions)
        ? safeData.remedialActions.map(action => typeof action === 'string' ? sanitizeRichText(action) : action)
        : [];

    grievance.status = 'resolved';
    grievance.statusDate = new Date();
    grievance.updatedBy = req.userID;

    grievance.resolution = {
        resolved: true,
        resolutionDate: new Date(),
        resolutionMethod: safeData.resolutionMethod || 'management_decision',
        decision: {
            decisionMaker: req.user?.name || 'HR Manager',
            decisionDate: new Date(),
            decisionSummary,
            decisionSummaryAr,
            outcome: safeData.outcome
        },
        actionsTaken,
        disciplinaryAction: safeData.disciplinaryAction,
        remedialActions,
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
            `Grievance resolved - ${safeData.outcome}`,
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(req.params.id);
    if (!sanitizedId) {
        throw CustomException('Invalid grievance ID format', 400);
    }

    // IDOR Protection: Verify grievance belongs to firm/lawyer
    const grievance = await Grievance.findOne({
        _id: sanitizedId,
        ...baseQuery
    });

    if (!grievance) {
        throw CustomException('Grievance not found or access denied', 404);
    }

    // Mass assignment protection for timeline event
    const allowedFields = [
        'eventType', 'eventDescription', 'eventDescriptionAr',
        'eventDate', 'notes', 'attachments'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (!safeData.eventType || !safeData.eventDescription) {
        throw CustomException('Event type and description are required', 400);
    }

    // Sanitize text fields
    if (safeData.eventDescription) {
        safeData.eventDescription = stripHtml(safeData.eventDescription);
    }
    if (safeData.eventDescriptionAr) {
        safeData.eventDescriptionAr = stripHtml(safeData.eventDescriptionAr);
    }
    if (safeData.notes) {
        safeData.notes = sanitizeRichText(safeData.notes);
    }

    const event = {
        ...safeData,
        eventId: generateEventId(),
        eventDate: safeData.eventDate || new Date(),
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(req.params.id);
    if (!sanitizedId) {
        throw CustomException('Invalid grievance ID format', 400);
    }

    // IDOR Protection: Verify grievance belongs to firm/lawyer
    const grievance = await Grievance.findOne({
        _id: sanitizedId,
        ...baseQuery
    });

    if (!grievance) {
        throw CustomException('Grievance not found or access denied', 404);
    }

    // Mass assignment protection for witness
    const allowedFields = [
        'witnessName', 'witnessNameAr', 'witnessType', 'relationship',
        'contactInfo', 'statementProvided', 'statementDate',
        'statementSummary', 'statementSummaryAr', 'credibilityAssessment'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (!safeData.witnessName) {
        throw CustomException('Witness name is required', 400);
    }

    // Sanitize text fields
    if (safeData.witnessName) {
        safeData.witnessName = stripHtml(safeData.witnessName);
    }
    if (safeData.witnessNameAr) {
        safeData.witnessNameAr = stripHtml(safeData.witnessNameAr);
    }
    if (safeData.statementSummary) {
        safeData.statementSummary = sanitizeRichText(safeData.statementSummary);
    }
    if (safeData.statementSummaryAr) {
        safeData.statementSummaryAr = sanitizeRichText(safeData.statementSummaryAr);
    }

    const witness = {
        ...safeData,
        witnessId: generateWitnessId(),
        addedBy: req.userID,
        addedAt: new Date()
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(req.params.id);
    if (!sanitizedId) {
        throw CustomException('Invalid grievance ID format', 400);
    }

    // IDOR Protection: Verify grievance belongs to firm/lawyer
    const grievance = await Grievance.findOne({
        _id: sanitizedId,
        ...baseQuery
    });

    if (!grievance) {
        throw CustomException('Grievance not found or access denied', 404);
    }

    // Mass assignment protection for evidence
    const allowedFields = [
        'evidenceType', 'evidenceDescription', 'evidenceDescriptionAr',
        'dateObtained', 'obtainedBy', 'custodyChain',
        'fileUrl', 'fileName', 'fileType', 'fileSize',
        'sourceType', 'authenticityVerified', 'relevance'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (!safeData.evidenceType) {
        throw CustomException('Evidence type is required', 400);
    }

    // Sanitize text fields
    if (safeData.evidenceDescription) {
        safeData.evidenceDescription = sanitizeRichText(safeData.evidenceDescription);
    }
    if (safeData.evidenceDescriptionAr) {
        safeData.evidenceDescriptionAr = sanitizeRichText(safeData.evidenceDescriptionAr);
    }

    // Sanitize file attachments
    if (safeData.fileName) {
        // Remove path traversal attempts and dangerous characters
        safeData.fileName = safeData.fileName
            .replace(/[\/\\]/g, '')
            .replace(/\.\./g, '')
            .replace(/[<>:"|?*]/g, '')
            .substring(0, 255);
    }

    // Validate file type
    if (safeData.fileType) {
        const allowedMimeTypes = [
            'application/pdf',
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'video/mp4', 'video/mpeg',
            'audio/mpeg', 'audio/wav'
        ];

        if (!allowedMimeTypes.includes(safeData.fileType.toLowerCase())) {
            throw CustomException('File type not allowed', 400);
        }
    }

    // Validate file size (max 50MB)
    if (safeData.fileSize && safeData.fileSize > 50 * 1024 * 1024) {
        throw CustomException('File size exceeds maximum allowed (50MB)', 400);
    }

    // Validate and sanitize file URL
    if (safeData.fileUrl) {
        try {
            const url = new URL(safeData.fileUrl);
            // Only allow HTTPS URLs from trusted domains
            if (url.protocol !== 'https:') {
                throw CustomException('Only HTTPS URLs are allowed for file attachments', 400);
            }
        } catch (error) {
            throw CustomException('Invalid file URL format', 400);
        }
    }

    const evidence = {
        ...safeData,
        evidenceId: generateEvidenceId(),
        dateObtained: safeData.dateObtained || new Date(),
        uploadedBy: req.userID,
        uploadedAt: new Date()
    };

    grievance.evidence.push(evidence);
    grievance.updatedBy = req.userID;

    // Add to timeline
    grievance.timeline.push(
        createTimelineEvent(
            'evidence_collected',
            `Evidence collected: ${safeData.evidenceDescription || safeData.evidenceType}`,
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(req.params.id);
    if (!sanitizedId) {
        throw CustomException('Invalid grievance ID format', 400);
    }

    // IDOR Protection: Verify grievance belongs to firm/lawyer
    const grievance = await Grievance.findOne({
        _id: sanitizedId,
        ...baseQuery
    });

    if (!grievance) {
        throw CustomException('Grievance not found or access denied', 404);
    }

    // Mass assignment protection for interview
    const allowedFields = [
        'intervieweeName', 'intervieweeNameAr', 'intervieweeRole',
        'interviewDate', 'interviewLocation', 'interviewDuration',
        'interviewType', 'conductedBy', 'witnessPresent',
        'recordingMade', 'summary', 'summaryAr', 'keyFindings'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (!safeData.intervieweeName) {
        throw CustomException('Interviewee name is required', 400);
    }

    // Sanitize text fields
    if (safeData.intervieweeName) {
        safeData.intervieweeName = stripHtml(safeData.intervieweeName);
    }
    if (safeData.intervieweeNameAr) {
        safeData.intervieweeNameAr = stripHtml(safeData.intervieweeNameAr);
    }
    if (safeData.interviewLocation) {
        safeData.interviewLocation = stripHtml(safeData.interviewLocation);
    }
    if (safeData.summary) {
        safeData.summary = sanitizeRichText(safeData.summary);
    }
    if (safeData.summaryAr) {
        safeData.summaryAr = sanitizeRichText(safeData.summaryAr);
    }
    if (safeData.keyFindings) {
        safeData.keyFindings = sanitizeRichText(safeData.keyFindings);
    }

    const interview = {
        ...safeData,
        interviewId: generateInterviewId(),
        interviewDate: safeData.interviewDate || new Date(),
        addedBy: req.userID,
        addedAt: new Date()
    };

    grievance.investigation = grievance.investigation || {};
    grievance.investigation.interviews = grievance.investigation.interviews || [];
    grievance.investigation.interviews.push(interview);
    grievance.updatedBy = req.userID;

    // Add to timeline with sanitized name
    grievance.timeline.push(
        createTimelineEvent(
            'interview',
            `Interview conducted with ${safeData.intervieweeName}`,
            `تم إجراء مقابلة مع ${safeData.intervieweeNameAr || safeData.intervieweeName}`,
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

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
