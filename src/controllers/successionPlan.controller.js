const SuccessionPlan = require('../models/successionPlan.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// ═══════════════════════════════════════════════════════════════
// GET ALL SUCCESSION PLANS
// ═══════════════════════════════════════════════════════════════

const getSuccessionPlans = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;
    const {
        page = 1,
        limit = 20,
        planStatus,
        criticalityLevel,
        riskLevel,
        benchStrength,
        departmentId,
        hasReadyNowSuccessor,
        needsReview,
        search,
        sort = '-createdOn'
    } = req.query;

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const query = { ...baseQuery };

    // Apply filters
    if (planStatus) query.planStatus = planStatus;
    if (criticalityLevel) query['criticalPosition.criticalityAssessment.criticalityLevel'] = criticalityLevel;
    if (riskLevel) query['criticalPosition.vacancyRisk.riskLevel'] = riskLevel;
    if (benchStrength) query['benchStrength.overallBenchStrength'] = benchStrength;
    if (departmentId) query['criticalPosition.departmentId'] = departmentId;
    if (hasReadyNowSuccessor === 'true') query.readyNowCount = { $gt: 0 };
    if (hasReadyNowSuccessor === 'false') query.readyNowCount = 0;
    if (needsReview === 'true') {
        query['planDetails.nextReviewDate'] = { $lte: new Date() };
        query.planStatus = { $nin: ['archived', 'expired'] };
    }

    // Search
    if (search) {
        query.$or = [
            { successionPlanId: { $regex: search, $options: 'i' } },
            { planNumber: { $regex: search, $options: 'i' } },
            { 'criticalPosition.positionTitle': { $regex: search, $options: 'i' } },
            { 'incumbent.employeeName': { $regex: search, $options: 'i' } }
        ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [plans, total] = await Promise.all([
        SuccessionPlan.find(query)
            .populate('criticalPosition.positionId', 'positionId positionNumber jobTitle')
            .populate('incumbent.employeeId', 'firstName lastName email employeeNumber')
            .populate('criticalPosition.departmentId', 'unitId unitName')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        SuccessionPlan.countDocuments(query)
    ]);

    res.status(200).json({
        success: true,
        data: plans,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET SUCCESSION PLAN STATISTICS
// ═══════════════════════════════════════════════════════════════

const getSuccessionPlanStats = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    const activeQuery = {
        ...baseQuery,
        planStatus: { $nin: ['archived', 'expired'] }
    };

    const [
        totalPlans,
        activePlans,
        criticalPositions,
        highRiskPlans,
        withReadySuccessors,
        withoutSuccessors,
        reviewDue,
        byBenchStrength,
        byCriticality
    ] = await Promise.all([
        SuccessionPlan.countDocuments(baseQuery),
        SuccessionPlan.countDocuments({ ...baseQuery, planStatus: 'active' }),
        SuccessionPlan.countDocuments({
            ...activeQuery,
            'criticalPosition.criticalityAssessment.criticalityLevel': 'critical'
        }),
        SuccessionPlan.countDocuments({
            ...activeQuery,
            'criticalPosition.vacancyRisk.riskLevel': 'high'
        }),
        SuccessionPlan.countDocuments({ ...activeQuery, readyNowCount: { $gt: 0 } }),
        SuccessionPlan.countDocuments({ ...activeQuery, successorsCount: 0 }),
        SuccessionPlan.countDocuments({
            ...baseQuery,
            'planDetails.nextReviewDate': { $lte: new Date() },
            planStatus: { $nin: ['archived', 'expired'] }
        }),
        SuccessionPlan.aggregate([
            { $match: activeQuery },
            { $group: { _id: '$benchStrength.overallBenchStrength', count: { $sum: 1 } } }
        ]),
        SuccessionPlan.aggregate([
            { $match: activeQuery },
            { $group: { _id: '$criticalPosition.criticalityAssessment.criticalityLevel', count: { $sum: 1 } } }
        ])
    ]);

    // Calculate average metrics
    const avgMetrics = await SuccessionPlan.aggregate([
        { $match: activeQuery },
        {
            $group: {
                _id: null,
                avgSuccessors: { $avg: '$successorsCount' },
                avgReadyNow: { $avg: '$readyNowCount' },
                totalSuccessors: { $sum: '$successorsCount' },
                totalReadyNow: { $sum: '$readyNowCount' }
            }
        }
    ]);

    const averages = avgMetrics[0] || {
        avgSuccessors: 0,
        avgReadyNow: 0,
        totalSuccessors: 0,
        totalReadyNow: 0
    };

    res.status(200).json({
        success: true,
        data: {
            totalPlans,
            activePlans,
            criticalPositions,
            highRiskPlans,
            withReadySuccessors,
            withoutSuccessors,
            reviewDue,
            coverageRate: activePlans > 0
                ? Math.round((withReadySuccessors / activePlans) * 100)
                : 0,
            byBenchStrength: byBenchStrength.reduce((acc, item) => {
                acc[item._id || 'unknown'] = item.count;
                return acc;
            }, {}),
            byCriticality: byCriticality.reduce((acc, item) => {
                acc[item._id || 'unknown'] = item.count;
                return acc;
            }, {}),
            averages: {
                avgSuccessorsPerPlan: Math.round(averages.avgSuccessors * 10) / 10,
                avgReadyNowPerPlan: Math.round(averages.avgReadyNow * 10) / 10,
                totalSuccessors: averages.totalSuccessors,
                totalReadyNow: averages.totalReadyNow
            }
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET PLANS NEEDING REVIEW
// ═══════════════════════════════════════════════════════════════

const getPlansNeedingReview = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;

    const plans = await SuccessionPlan.getPlansNeedingReview(firmId, lawyerId);

    res.status(200).json({
        success: true,
        data: plans,
        total: plans.length
    });
});

// ═══════════════════════════════════════════════════════════════
// GET HIGH RISK PLANS
// ═══════════════════════════════════════════════════════════════

const getHighRiskPlans = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;

    const plans = await SuccessionPlan.getHighRiskPlans(firmId, lawyerId);

    res.status(200).json({
        success: true,
        data: plans,
        total: plans.length
    });
});

// ═══════════════════════════════════════════════════════════════
// GET CRITICAL WITHOUT SUCCESSORS
// ═══════════════════════════════════════════════════════════════

const getCriticalWithoutSuccessors = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;

    const plans = await SuccessionPlan.getCriticalWithoutSuccessors(firmId, lawyerId);

    res.status(200).json({
        success: true,
        data: plans,
        total: plans.length
    });
});

// ═══════════════════════════════════════════════════════════════
// GET BY POSITION
// ═══════════════════════════════════════════════════════════════

const getByPosition = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;
    const positionId = sanitizeObjectId(req.params.positionId, 'Position ID');

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const plans = await SuccessionPlan.find({
        ...baseQuery,
        'criticalPosition.positionId': positionId
    }).sort({ createdOn: -1 });

    res.status(200).json({
        success: true,
        data: plans,
        total: plans.length
    });
});

// ═══════════════════════════════════════════════════════════════
// GET BY INCUMBENT
// ═══════════════════════════════════════════════════════════════

const getByIncumbent = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;
    const incumbentId = sanitizeObjectId(req.params.incumbentId, 'Incumbent ID');

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const plans = await SuccessionPlan.find({
        ...baseQuery,
        'incumbent.employeeId': incumbentId
    }).sort({ createdOn: -1 });

    res.status(200).json({
        success: true,
        data: plans,
        total: plans.length
    });
});

// ═══════════════════════════════════════════════════════════════
// GET SINGLE SUCCESSION PLAN
// ═══════════════════════════════════════════════════════════════

const getSuccessionPlan = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;
    const id = sanitizeObjectId(req.params.id, 'Succession plan ID');

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const plan = await SuccessionPlan.findOne({ _id: id, ...baseQuery })
        .populate('criticalPosition.positionId')
        .populate('criticalPosition.departmentId', 'unitId unitName unitNameAr')
        .populate('incumbent.employeeId', 'firstName lastName email employeeNumber')
        .populate('successors.employeeId', 'firstName lastName email employeeNumber')
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email');

    if (!plan) {
        throw new CustomException('Succession plan not found', 404);
    }

    res.status(200).json({
        success: true,
        data: plan
    });
});

// ═══════════════════════════════════════════════════════════════
// CREATE SUCCESSION PLAN
// ═══════════════════════════════════════════════════════════════

const createSuccessionPlan = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;

    // Define allowed fields
    const allowedFields = [
        'planNumber',
        'planStatus',
        'criticalPosition',
        'incumbent',
        'successors',
        'benchStrength',
        'readyNowCount',
        'successorsCount',
        'planDetails',
        'actionPlan',
        'reviewApproval',
        'riskMitigation',
        'notes',
        'documents'
    ];

    // Input validation
    if (!req.body.planNumber || typeof req.body.planNumber !== 'string') {
        throw new CustomException('Valid plan number is required', 400);
    }

    if (req.body.criticalPosition && !req.body.criticalPosition.positionTitle) {
        throw new CustomException('Position title is required in critical position', 400);
    }

    // Validate positionId if provided
    if (req.body.criticalPosition?.positionId) {
        req.body.criticalPosition.positionId = sanitizeObjectId(req.body.criticalPosition.positionId, 'Position ID');
    }

    // Validate departmentId if provided
    if (req.body.criticalPosition?.departmentId) {
        req.body.criticalPosition.departmentId = sanitizeObjectId(req.body.criticalPosition.departmentId, 'Department ID');
    }

    // Validate incumbent employeeId if provided
    if (req.body.incumbent?.employeeId) {
        req.body.incumbent.employeeId = sanitizeObjectId(req.body.incumbent.employeeId, 'Employee ID');
    }

    // Validate successor employeeIds if provided
    if (req.body.successors && Array.isArray(req.body.successors)) {
        req.body.successors.forEach((successor, index) => {
            if (successor.employeeId) {
                successor.employeeId = sanitizeObjectId(successor.employeeId, `Successor ${index + 1} employee ID`);
            }
        });
    }

    // Validate dates if provided
    if (req.body.planDetails?.effectiveDate && isNaN(Date.parse(req.body.planDetails.effectiveDate))) {
        throw new CustomException('Invalid effective date format', 400);
    }

    if (req.body.planDetails?.nextReviewDate && isNaN(Date.parse(req.body.planDetails.nextReviewDate))) {
        throw new CustomException('Invalid next review date format', 400);
    }

    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    const plan = new SuccessionPlan({
        ...sanitizedData,
        firmId,
        lawyerId,
        createdBy: userId,
        statusDate: new Date()
    });

    await plan.save();

    res.status(201).json({
        success: true,
        message: 'Succession plan created successfully',
        data: plan
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE SUCCESSION PLAN
// ═══════════════════════════════════════════════════════════════

const updateSuccessionPlan = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const id = sanitizeObjectId(req.params.id, 'Succession plan ID');

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const plan = await SuccessionPlan.findOne({ _id: id, ...baseQuery });

    if (!plan) {
        throw new CustomException('Succession plan not found', 404);
    }

    // Define allowed fields
    const allowedFields = [
        'planNumber',
        'planStatus',
        'criticalPosition',
        'incumbent',
        'successors',
        'benchStrength',
        'readyNowCount',
        'successorsCount',
        'planDetails',
        'actionPlan',
        'reviewApproval',
        'riskMitigation',
        'notes',
        'documents'
    ];

    // Validate positionId if provided
    if (req.body.criticalPosition?.positionId) {
        req.body.criticalPosition.positionId = sanitizeObjectId(req.body.criticalPosition.positionId, 'Position ID');
    }

    // Validate departmentId if provided
    if (req.body.criticalPosition?.departmentId) {
        req.body.criticalPosition.departmentId = sanitizeObjectId(req.body.criticalPosition.departmentId, 'Department ID');
    }

    // Validate incumbent employeeId if provided
    if (req.body.incumbent?.employeeId) {
        req.body.incumbent.employeeId = sanitizeObjectId(req.body.incumbent.employeeId, 'Employee ID');
    }

    // Validate successor employeeIds if provided
    if (req.body.successors && Array.isArray(req.body.successors)) {
        req.body.successors.forEach((successor, index) => {
            if (successor.employeeId) {
                successor.employeeId = sanitizeObjectId(successor.employeeId, `Successor ${index + 1} employee ID`);
            }
        });
    }

    // Validate dates if provided
    if (req.body.planDetails?.effectiveDate && isNaN(Date.parse(req.body.planDetails.effectiveDate))) {
        throw new CustomException('Invalid effective date format', 400);
    }

    if (req.body.planDetails?.nextReviewDate && isNaN(Date.parse(req.body.planDetails.nextReviewDate))) {
        throw new CustomException('Invalid next review date format', 400);
    }

    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    Object.assign(plan, sanitizedData, { updatedBy: userId });
    await plan.save();

    res.status(200).json({
        success: true,
        message: 'Succession plan updated successfully',
        data: plan
    });
});

// ═══════════════════════════════════════════════════════════════
// DELETE SUCCESSION PLAN
// ═══════════════════════════════════════════════════════════════

const deleteSuccessionPlan = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;
    const id = sanitizeObjectId(req.params.id, 'Succession plan ID');

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const plan = await SuccessionPlan.findOne({ _id: id, ...baseQuery });

    if (!plan) {
        throw new CustomException('Succession plan not found', 404);
    }

    await plan.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Succession plan deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// BULK DELETE SUCCESSION PLANS
// ═══════════════════════════════════════════════════════════════

const bulkDeleteSuccessionPlans = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new CustomException('Please provide an array of plan IDs', 400);
    }

    // Sanitize all IDs
    const sanitizedIds = ids.map((id, index) => sanitizeObjectId(id, `Plan ID at index ${index}`));

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const result = await SuccessionPlan.deleteMany({
        _id: { $in: sanitizedIds },
        ...baseQuery
    });

    res.status(200).json({
        success: true,
        message: `${result.deletedCount} succession plan(s) deleted successfully`,
        deletedCount: result.deletedCount
    });
});

// ═══════════════════════════════════════════════════════════════
// ADD SUCCESSOR
// ═══════════════════════════════════════════════════════════════

const addSuccessor = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const id = sanitizeObjectId(req.params.id, 'Succession plan ID');

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const plan = await SuccessionPlan.findOne({ _id: id, ...baseQuery });

    if (!plan) {
        throw new CustomException('Succession plan not found', 404);
    }

    // Define allowed fields
    const allowedFields = [
        'employeeId',
        'employeeName',
        'currentPosition',
        'readinessLevel',
        'readinessTimeframe',
        'readinessAssessment',
        'developmentPlan',
        'strengths',
        'developmentNeeds',
        'priority',
        'isActive'
    ];

    // Input validation
    if (!req.body.employeeId) {
        throw new CustomException('Employee ID is required', 400);
    }

    // Sanitize employeeId
    req.body.employeeId = sanitizeObjectId(req.body.employeeId, 'Employee ID');

    // Validate readiness assessment date if provided
    if (req.body.readinessAssessment?.assessmentDate && isNaN(Date.parse(req.body.readinessAssessment.assessmentDate))) {
        throw new CustomException('Invalid assessment date format', 400);
    }

    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Generate successor ID
    const successorId = `SUCC-${plan.planNumber}-${(plan.successors?.length || 0) + 1}`;

    plan.successors = plan.successors || [];
    plan.successors.push({
        successorId,
        ...sanitizedData,
        readinessAssessment: {
            ...sanitizedData.readinessAssessment,
            assessmentDate: new Date()
        }
    });
    plan.updatedBy = userId;
    await plan.save();

    res.status(201).json({
        success: true,
        message: 'Successor added successfully',
        data: plan.successors[plan.successors.length - 1]
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE SUCCESSOR
// ═══════════════════════════════════════════════════════════════

const updateSuccessor = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const id = sanitizeObjectId(req.params.id, 'Succession plan ID');
    const { successorId } = req.params;

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const plan = await SuccessionPlan.findOne({ _id: id, ...baseQuery });

    if (!plan) {
        throw new CustomException('Succession plan not found', 404);
    }

    const successorIndex = plan.successors?.findIndex(
        s => s.successorId === successorId || s._id.toString() === successorId
    );

    if (successorIndex === -1 || successorIndex === undefined) {
        throw new CustomException('Successor not found', 404);
    }

    // Define allowed fields
    const allowedFields = [
        'employeeId',
        'employeeName',
        'currentPosition',
        'readinessLevel',
        'readinessTimeframe',
        'readinessAssessment',
        'developmentPlan',
        'strengths',
        'developmentNeeds',
        'priority',
        'isActive'
    ];

    // Sanitize employeeId if provided
    if (req.body.employeeId) {
        req.body.employeeId = sanitizeObjectId(req.body.employeeId, 'Employee ID');
    }

    // Validate readiness assessment date if provided
    if (req.body.readinessAssessment?.assessmentDate && isNaN(Date.parse(req.body.readinessAssessment.assessmentDate))) {
        throw new CustomException('Invalid assessment date format', 400);
    }

    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    plan.successors[successorIndex] = {
        ...plan.successors[successorIndex].toObject?.() || plan.successors[successorIndex],
        ...sanitizedData
    };
    plan.updatedBy = userId;
    await plan.save();

    res.status(200).json({
        success: true,
        message: 'Successor updated successfully',
        data: plan.successors[successorIndex]
    });
});

// ═══════════════════════════════════════════════════════════════
// REMOVE SUCCESSOR
// ═══════════════════════════════════════════════════════════════

const removeSuccessor = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const id = sanitizeObjectId(req.params.id, 'Succession plan ID');
    const { successorId } = req.params;

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const plan = await SuccessionPlan.findOne({ _id: id, ...baseQuery });

    if (!plan) {
        throw new CustomException('Succession plan not found', 404);
    }

    const successorIndex = plan.successors?.findIndex(
        s => s.successorId === successorId || s._id.toString() === successorId
    );

    if (successorIndex === -1 || successorIndex === undefined) {
        throw new CustomException('Successor not found', 404);
    }

    plan.successors.splice(successorIndex, 1);
    plan.updatedBy = userId;
    await plan.save();

    res.status(200).json({
        success: true,
        message: 'Successor removed successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE SUCCESSOR READINESS
// ═══════════════════════════════════════════════════════════════

const updateSuccessorReadiness = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const id = sanitizeObjectId(req.params.id, 'Succession plan ID');
    const { successorId } = req.params;

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const plan = await SuccessionPlan.findOne({ _id: id, ...baseQuery });

    if (!plan) {
        throw new CustomException('Succession plan not found', 404);
    }

    const successorIndex = plan.successors?.findIndex(
        s => s.successorId === successorId || s._id.toString() === successorId
    );

    if (successorIndex === -1 || successorIndex === undefined) {
        throw new CustomException('Successor not found', 404);
    }

    // Define allowed fields
    const allowedFields = [
        'readinessLevel',
        'readinessScore',
        'assessmentMethod',
        'competencyGaps',
        'strengthAreas',
        'overallReadiness',
        'assessmentNotes',
        'nextAssessmentDate'
    ];

    // Validate next assessment date if provided
    if (req.body.nextAssessmentDate && isNaN(Date.parse(req.body.nextAssessmentDate))) {
        throw new CustomException('Invalid next assessment date format', 400);
    }

    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    plan.successors[successorIndex].readinessAssessment = {
        ...plan.successors[successorIndex].readinessAssessment?.toObject?.() || {},
        ...sanitizedData,
        assessmentDate: new Date(),
        assessedBy: userId
    };
    plan.updatedBy = userId;
    await plan.save();

    res.status(200).json({
        success: true,
        message: 'Successor readiness updated successfully',
        data: plan.successors[successorIndex].readinessAssessment
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE SUCCESSOR DEVELOPMENT PLAN
// ═══════════════════════════════════════════════════════════════

const updateSuccessorDevelopmentPlan = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const id = sanitizeObjectId(req.params.id, 'Succession plan ID');
    const { successorId } = req.params;

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const plan = await SuccessionPlan.findOne({ _id: id, ...baseQuery });

    if (!plan) {
        throw new CustomException('Succession plan not found', 404);
    }

    const successorIndex = plan.successors?.findIndex(
        s => s.successorId === successorId || s._id.toString() === successorId
    );

    if (successorIndex === -1 || successorIndex === undefined) {
        throw new CustomException('Successor not found', 404);
    }

    // Define allowed fields
    const allowedFields = [
        'developmentActivities',
        'trainingPrograms',
        'mentorshipPlan',
        'rotationAssignments',
        'targetCompletionDate',
        'progress',
        'milestones',
        'developmentGoals',
        'planNotes'
    ];

    // Validate target completion date if provided
    if (req.body.targetCompletionDate && isNaN(Date.parse(req.body.targetCompletionDate))) {
        throw new CustomException('Invalid target completion date format', 400);
    }

    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    plan.successors[successorIndex].developmentPlan = {
        ...plan.successors[successorIndex].developmentPlan?.toObject?.() || {},
        ...sanitizedData,
        planExists: true
    };
    plan.updatedBy = userId;
    await plan.save();

    res.status(200).json({
        success: true,
        message: 'Successor development plan updated successfully',
        data: plan.successors[successorIndex].developmentPlan
    });
});

// ═══════════════════════════════════════════════════════════════
// SUBMIT FOR APPROVAL
// ═══════════════════════════════════════════════════════════════

const submitForApproval = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const id = sanitizeObjectId(req.params.id, 'Succession plan ID');

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const plan = await SuccessionPlan.findOne({ _id: id, ...baseQuery });

    if (!plan) {
        throw new CustomException('Succession plan not found', 404);
    }

    if (plan.planStatus !== 'draft') {
        throw new CustomException('Only draft plans can be submitted for approval', 400);
    }

    plan.planStatus = 'under_review';
    plan.statusDate = new Date();
    plan.updatedBy = userId;
    await plan.save();

    res.status(200).json({
        success: true,
        message: 'Plan submitted for approval successfully',
        data: plan
    });
});

// ═══════════════════════════════════════════════════════════════
// APPROVE PLAN
// ═══════════════════════════════════════════════════════════════

const approvePlan = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId, user } = req;
    const id = sanitizeObjectId(req.params.id, 'Succession plan ID');

    // Validate comments if provided
    const comments = req.body.comments && typeof req.body.comments === 'string'
        ? req.body.comments
        : undefined;

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const plan = await SuccessionPlan.findOne({ _id: id, ...baseQuery });

    if (!plan) {
        throw new CustomException('Succession plan not found', 404);
    }

    if (plan.planStatus !== 'under_review') {
        throw new CustomException('Only plans under review can be approved', 400);
    }

    plan.planStatus = 'approved';
    plan.statusDate = new Date();
    plan.reviewApproval = plan.reviewApproval || {};
    plan.reviewApproval.finalApproval = true;
    plan.reviewApproval.finalApprovalDate = new Date();
    plan.reviewApproval.finalApprovedBy = user?.firstName ? `${user.firstName} ${user.lastName}` : userId;
    plan.reviewApproval.approvals = plan.reviewApproval.approvals || [];
    plan.reviewApproval.approvals.push({
        approvalLevel: 'final',
        approverId: userId,
        approverName: user?.firstName ? `${user.firstName} ${user.lastName}` : 'Approver',
        approved: true,
        approvalDate: new Date(),
        comments
    });
    plan.updatedBy = userId;
    await plan.save();

    res.status(200).json({
        success: true,
        message: 'Plan approved successfully',
        data: plan
    });
});

// ═══════════════════════════════════════════════════════════════
// REJECT PLAN
// ═══════════════════════════════════════════════════════════════

const rejectPlan = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId, user } = req;
    const id = sanitizeObjectId(req.params.id, 'Succession plan ID');

    // Validate and sanitize comments and reason
    const comments = req.body.comments && typeof req.body.comments === 'string'
        ? req.body.comments
        : undefined;
    const reason = req.body.reason && typeof req.body.reason === 'string'
        ? req.body.reason
        : undefined;

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const plan = await SuccessionPlan.findOne({ _id: id, ...baseQuery });

    if (!plan) {
        throw new CustomException('Succession plan not found', 404);
    }

    if (plan.planStatus !== 'under_review') {
        throw new CustomException('Only plans under review can be rejected', 400);
    }

    plan.planStatus = 'draft';
    plan.statusDate = new Date();
    plan.reviewApproval = plan.reviewApproval || {};
    plan.reviewApproval.approvals = plan.reviewApproval.approvals || [];
    plan.reviewApproval.approvals.push({
        approvalLevel: 'rejection',
        approverId: userId,
        approverName: user?.firstName ? `${user.firstName} ${user.lastName}` : 'Reviewer',
        approved: false,
        approvalDate: new Date(),
        comments: comments || reason
    });
    plan.updatedBy = userId;
    await plan.save();

    res.status(200).json({
        success: true,
        message: 'Plan rejected and returned to draft',
        data: plan
    });
});

// ═══════════════════════════════════════════════════════════════
// ACTIVATE PLAN
// ═══════════════════════════════════════════════════════════════

const activatePlan = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const id = sanitizeObjectId(req.params.id, 'Succession plan ID');

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const plan = await SuccessionPlan.findOne({ _id: id, ...baseQuery });

    if (!plan) {
        throw new CustomException('Succession plan not found', 404);
    }

    if (plan.planStatus !== 'approved') {
        throw new CustomException('Only approved plans can be activated', 400);
    }

    plan.planStatus = 'active';
    plan.statusDate = new Date();
    plan.updatedBy = userId;
    await plan.save();

    res.status(200).json({
        success: true,
        message: 'Plan activated successfully',
        data: plan
    });
});

// ═══════════════════════════════════════════════════════════════
// ARCHIVE PLAN
// ═══════════════════════════════════════════════════════════════

const archivePlan = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const id = sanitizeObjectId(req.params.id, 'Succession plan ID');

    // Validate reason if provided
    const reason = req.body.reason && typeof req.body.reason === 'string'
        ? req.body.reason
        : undefined;

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const plan = await SuccessionPlan.findOne({ _id: id, ...baseQuery });

    if (!plan) {
        throw new CustomException('Succession plan not found', 404);
    }

    plan.planStatus = 'archived';
    plan.statusDate = new Date();
    if (reason) {
        plan.notes = plan.notes || {};
        plan.notes.plannerNotes = `${plan.notes.plannerNotes || ''}\n[${new Date().toISOString()}] Archived: ${reason}`;
    }
    plan.updatedBy = userId;
    await plan.save();

    res.status(200).json({
        success: true,
        message: 'Plan archived successfully',
        data: plan
    });
});

// ═══════════════════════════════════════════════════════════════
// ADD REVIEW
// ═══════════════════════════════════════════════════════════════

const addReview = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId, user } = req;
    const id = sanitizeObjectId(req.params.id, 'Succession plan ID');

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const plan = await SuccessionPlan.findOne({ _id: id, ...baseQuery });

    if (!plan) {
        throw new CustomException('Succession plan not found', 404);
    }

    // Define allowed fields
    const allowedFields = [
        'reviewType',
        'reviewOutcome',
        'reviewFindings',
        'recommendations',
        'actionItems',
        'planEffectiveness',
        'benchStrengthReview',
        'successorProgressReview',
        'riskAssessmentReview',
        'reviewComments'
    ];

    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    const reviewId = `REV-${plan.planNumber}-${(plan.reviewApproval?.reviews?.length || 0) + 1}`;

    plan.reviewApproval = plan.reviewApproval || {};
    plan.reviewApproval.reviews = plan.reviewApproval.reviews || [];
    plan.reviewApproval.reviews.push({
        reviewId,
        reviewDate: new Date(),
        reviewedBy: userId,
        reviewerName: user?.firstName ? `${user.firstName} ${user.lastName}` : 'Reviewer',
        ...sanitizedData
    });
    plan.reviewApproval.lastReviewDate = new Date();
    plan.planDetails = plan.planDetails || {};
    plan.planDetails.lastReviewDate = new Date();

    // Set next review date based on frequency
    const reviewFrequency = plan.planDetails.reviewFrequency || 'annual';
    const nextReview = new Date();
    switch (reviewFrequency) {
        case 'quarterly':
            nextReview.setMonth(nextReview.getMonth() + 3);
            break;
        case 'semi_annual':
            nextReview.setMonth(nextReview.getMonth() + 6);
            break;
        case 'annual':
            nextReview.setFullYear(nextReview.getFullYear() + 1);
            break;
        case 'biennial':
            nextReview.setFullYear(nextReview.getFullYear() + 2);
            break;
    }
    plan.planDetails.nextReviewDate = nextReview;
    plan.reviewApproval.nextReviewDate = nextReview;

    plan.updatedBy = userId;
    await plan.save();

    res.status(201).json({
        success: true,
        message: 'Review added successfully',
        data: plan.reviewApproval.reviews[plan.reviewApproval.reviews.length - 1]
    });
});

// ═══════════════════════════════════════════════════════════════
// ADD ACTION
// ═══════════════════════════════════════════════════════════════

const addAction = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const id = sanitizeObjectId(req.params.id, 'Succession plan ID');

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const plan = await SuccessionPlan.findOne({ _id: id, ...baseQuery });

    if (!plan) {
        throw new CustomException('Succession plan not found', 404);
    }

    // Define allowed fields
    const allowedFields = [
        'actionType',
        'actionDescription',
        'actionOwner',
        'assignedTo',
        'priority',
        'status',
        'targetDate',
        'completionDate',
        'actionNotes',
        'relatedSuccessorId'
    ];

    // Input validation
    if (!req.body.actionDescription || typeof req.body.actionDescription !== 'string') {
        throw new CustomException('Action description is required', 400);
    }

    // Validate target date if provided
    if (req.body.targetDate && isNaN(Date.parse(req.body.targetDate))) {
        throw new CustomException('Invalid target date format', 400);
    }

    // Validate completion date if provided
    if (req.body.completionDate && isNaN(Date.parse(req.body.completionDate))) {
        throw new CustomException('Invalid completion date format', 400);
    }

    // Validate assignedTo if provided
    if (req.body.assignedTo) {
        req.body.assignedTo = sanitizeObjectId(req.body.assignedTo, 'Assigned to user ID');
    }

    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    const actionId = `ACT-${plan.planNumber}-${(plan.actionPlan?.actions?.length || 0) + 1}`;

    plan.actionPlan = plan.actionPlan || {};
    plan.actionPlan.actions = plan.actionPlan.actions || [];
    plan.actionPlan.actions.push({
        actionId,
        ...sanitizedData
    });
    plan.updatedBy = userId;
    await plan.save();

    res.status(201).json({
        success: true,
        message: 'Action added successfully',
        data: plan.actionPlan.actions[plan.actionPlan.actions.length - 1]
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE ACTION
// ═══════════════════════════════════════════════════════════════

const updateAction = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const id = sanitizeObjectId(req.params.id, 'Succession plan ID');
    const { actionId } = req.params;

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const plan = await SuccessionPlan.findOne({ _id: id, ...baseQuery });

    if (!plan) {
        throw new CustomException('Succession plan not found', 404);
    }

    const actionIndex = plan.actionPlan?.actions?.findIndex(
        a => a.actionId === actionId || a._id.toString() === actionId
    );

    if (actionIndex === -1 || actionIndex === undefined) {
        throw new CustomException('Action not found', 404);
    }

    // Define allowed fields
    const allowedFields = [
        'actionType',
        'actionDescription',
        'actionOwner',
        'assignedTo',
        'priority',
        'status',
        'targetDate',
        'completionDate',
        'actionNotes',
        'relatedSuccessorId'
    ];

    // Validate target date if provided
    if (req.body.targetDate && isNaN(Date.parse(req.body.targetDate))) {
        throw new CustomException('Invalid target date format', 400);
    }

    // Validate completion date if provided
    if (req.body.completionDate && isNaN(Date.parse(req.body.completionDate))) {
        throw new CustomException('Invalid completion date format', 400);
    }

    // Validate assignedTo if provided
    if (req.body.assignedTo) {
        req.body.assignedTo = sanitizeObjectId(req.body.assignedTo, 'Assigned to user ID');
    }

    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    plan.actionPlan.actions[actionIndex] = {
        ...plan.actionPlan.actions[actionIndex].toObject?.() || plan.actionPlan.actions[actionIndex],
        ...sanitizedData
    };
    plan.updatedBy = userId;
    await plan.save();

    res.status(200).json({
        success: true,
        message: 'Action updated successfully',
        data: plan.actionPlan.actions[actionIndex]
    });
});

// ═══════════════════════════════════════════════════════════════
// ADD DOCUMENT
// ═══════════════════════════════════════════════════════════════

const addDocument = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const id = sanitizeObjectId(req.params.id, 'Succession plan ID');

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const plan = await SuccessionPlan.findOne({ _id: id, ...baseQuery });

    if (!plan) {
        throw new CustomException('Succession plan not found', 404);
    }

    // Define allowed fields
    const allowedFields = [
        'documentName',
        'documentType',
        'documentUrl',
        'fileSize',
        'description',
        'category',
        'isConfidential'
    ];

    // Input validation
    if (!req.body.documentName || typeof req.body.documentName !== 'string') {
        throw new CustomException('Document name is required', 400);
    }

    if (!req.body.documentUrl || typeof req.body.documentUrl !== 'string') {
        throw new CustomException('Document URL is required', 400);
    }

    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    plan.documents = plan.documents || [];
    plan.documents.push({
        ...sanitizedData,
        uploadedOn: new Date(),
        uploadedBy: userId
    });
    plan.updatedBy = userId;
    await plan.save();

    res.status(201).json({
        success: true,
        message: 'Document added successfully',
        data: plan.documents[plan.documents.length - 1]
    });
});

// ═══════════════════════════════════════════════════════════════
// EXPORT SUCCESSION PLANS
// ═══════════════════════════════════════════════════════════════

const exportSuccessionPlans = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;
    const { format = 'json', planStatus, criticalityLevel } = req.query;

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const query = { ...baseQuery };

    if (planStatus) query.planStatus = planStatus;
    if (criticalityLevel) query['criticalPosition.criticalityAssessment.criticalityLevel'] = criticalityLevel;

    const plans = await SuccessionPlan.find(query)
        .populate('criticalPosition.positionId', 'positionNumber jobTitle')
        .populate('incumbent.employeeId', 'firstName lastName')
        .sort({ planNumber: 1 })
        .lean();

    if (format === 'csv') {
        // SECURITY: Import sanitization function to prevent CSV injection
        const { sanitizeForCSV } = require('../utils/securityUtils');

        const csvHeader = [
            'Plan ID',
            'Plan Number',
            'Position Title',
            'Incumbent Name',
            'Criticality',
            'Risk Level',
            'Bench Strength',
            'Successors Count',
            'Ready Now Count',
            'Status',
            'Next Review Date'
        ].join(',');

        const csvRows = plans.map(p => [
            sanitizeForCSV(p.successionPlanId),
            sanitizeForCSV(p.planNumber),
            `"${sanitizeForCSV(p.criticalPosition?.positionTitle || '')}"`,
            `"${sanitizeForCSV(p.incumbent?.employeeName || '')}"`,
            sanitizeForCSV(p.criticalPosition?.criticalityAssessment?.criticalityLevel || ''),
            sanitizeForCSV(p.criticalPosition?.vacancyRisk?.riskLevel || ''),
            sanitizeForCSV(p.benchStrength?.overallBenchStrength || ''),
            sanitizeForCSV(p.successorsCount || 0),
            sanitizeForCSV(p.readyNowCount || 0),
            sanitizeForCSV(p.planStatus),
            sanitizeForCSV(p.planDetails?.nextReviewDate ? new Date(p.planDetails.nextReviewDate).toISOString().split('T')[0] : '')
        ].join(','));

        const csv = [csvHeader, ...csvRows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=succession-plans.csv');
        return res.send(csv);
    }

    res.status(200).json({
        success: true,
        data: plans,
        total: plans.length,
        exportedAt: new Date().toISOString()
    });
});

module.exports = {
    getSuccessionPlans,
    getSuccessionPlanStats,
    getPlansNeedingReview,
    getHighRiskPlans,
    getCriticalWithoutSuccessors,
    getByPosition,
    getByIncumbent,
    getSuccessionPlan,
    createSuccessionPlan,
    updateSuccessionPlan,
    deleteSuccessionPlan,
    bulkDeleteSuccessionPlans,
    addSuccessor,
    updateSuccessor,
    removeSuccessor,
    updateSuccessorReadiness,
    updateSuccessorDevelopmentPlan,
    submitForApproval,
    approvePlan,
    rejectPlan,
    activatePlan,
    archivePlan,
    addReview,
    addAction,
    updateAction,
    addDocument,
    exportSuccessionPlans
};
