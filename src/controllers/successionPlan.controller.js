const SuccessionPlan = require('../models/successionPlan.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

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

    const baseQuery = firmId ? { firmId } : { lawyerId };
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
    const baseQuery = firmId ? { firmId } : { lawyerId };

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
    const { positionId } = req.params;

    const baseQuery = firmId ? { firmId } : { lawyerId };
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
    const { incumbentId } = req.params;

    const baseQuery = firmId ? { firmId } : { lawyerId };
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
    const { id } = req.params;

    const baseQuery = firmId ? { firmId } : { lawyerId };
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

    const plan = new SuccessionPlan({
        ...req.body,
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
    const { id } = req.params;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const plan = await SuccessionPlan.findOne({ _id: id, ...baseQuery });

    if (!plan) {
        throw new CustomException('Succession plan not found', 404);
    }

    // Remove immutable fields from update
    const { firmId: _, lawyerId: __, successionPlanId, createdBy, ...updateData } = req.body;

    Object.assign(plan, updateData, { updatedBy: userId });
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
    const { id } = req.params;

    const baseQuery = firmId ? { firmId } : { lawyerId };
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

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const result = await SuccessionPlan.deleteMany({
        _id: { $in: ids },
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
    const { id } = req.params;
    const successorData = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const plan = await SuccessionPlan.findOne({ _id: id, ...baseQuery });

    if (!plan) {
        throw new CustomException('Succession plan not found', 404);
    }

    // Generate successor ID
    const successorId = `SUCC-${plan.planNumber}-${(plan.successors?.length || 0) + 1}`;

    plan.successors = plan.successors || [];
    plan.successors.push({
        successorId,
        ...successorData,
        readinessAssessment: {
            ...successorData.readinessAssessment,
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
    const { id, successorId } = req.params;
    const successorData = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
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

    plan.successors[successorIndex] = {
        ...plan.successors[successorIndex].toObject?.() || plan.successors[successorIndex],
        ...successorData
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
    const { id, successorId } = req.params;

    const baseQuery = firmId ? { firmId } : { lawyerId };
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
    const { id, successorId } = req.params;
    const readinessData = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
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

    plan.successors[successorIndex].readinessAssessment = {
        ...plan.successors[successorIndex].readinessAssessment?.toObject?.() || {},
        ...readinessData,
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
    const { id, successorId } = req.params;
    const developmentData = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
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

    plan.successors[successorIndex].developmentPlan = {
        ...plan.successors[successorIndex].developmentPlan?.toObject?.() || {},
        ...developmentData,
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
    const { id } = req.params;

    const baseQuery = firmId ? { firmId } : { lawyerId };
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
    const { id } = req.params;
    const { comments } = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
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
    const { id } = req.params;
    const { comments, reason } = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
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
    const { id } = req.params;

    const baseQuery = firmId ? { firmId } : { lawyerId };
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
    const { id } = req.params;
    const { reason } = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
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
    const { id } = req.params;
    const reviewData = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const plan = await SuccessionPlan.findOne({ _id: id, ...baseQuery });

    if (!plan) {
        throw new CustomException('Succession plan not found', 404);
    }

    const reviewId = `REV-${plan.planNumber}-${(plan.reviewApproval?.reviews?.length || 0) + 1}`;

    plan.reviewApproval = plan.reviewApproval || {};
    plan.reviewApproval.reviews = plan.reviewApproval.reviews || [];
    plan.reviewApproval.reviews.push({
        reviewId,
        reviewDate: new Date(),
        reviewedBy: userId,
        reviewerName: user?.firstName ? `${user.firstName} ${user.lastName}` : 'Reviewer',
        ...reviewData
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
    const { id } = req.params;
    const actionData = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const plan = await SuccessionPlan.findOne({ _id: id, ...baseQuery });

    if (!plan) {
        throw new CustomException('Succession plan not found', 404);
    }

    const actionId = `ACT-${plan.planNumber}-${(plan.actionPlan?.actions?.length || 0) + 1}`;

    plan.actionPlan = plan.actionPlan || {};
    plan.actionPlan.actions = plan.actionPlan.actions || [];
    plan.actionPlan.actions.push({
        actionId,
        ...actionData
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
    const { id, actionId } = req.params;
    const actionData = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
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

    plan.actionPlan.actions[actionIndex] = {
        ...plan.actionPlan.actions[actionIndex].toObject?.() || plan.actionPlan.actions[actionIndex],
        ...actionData
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
    const { id } = req.params;
    const documentData = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const plan = await SuccessionPlan.findOne({ _id: id, ...baseQuery });

    if (!plan) {
        throw new CustomException('Succession plan not found', 404);
    }

    plan.documents = plan.documents || [];
    plan.documents.push({
        ...documentData,
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

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const query = { ...baseQuery };

    if (planStatus) query.planStatus = planStatus;
    if (criticalityLevel) query['criticalPosition.criticalityAssessment.criticalityLevel'] = criticalityLevel;

    const plans = await SuccessionPlan.find(query)
        .populate('criticalPosition.positionId', 'positionNumber jobTitle')
        .populate('incumbent.employeeId', 'firstName lastName')
        .sort({ planNumber: 1 })
        .lean();

    if (format === 'csv') {
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
            p.successionPlanId,
            p.planNumber,
            `"${p.criticalPosition?.positionTitle || ''}"`,
            `"${p.incumbent?.employeeName || ''}"`,
            p.criticalPosition?.criticalityAssessment?.criticalityLevel || '',
            p.criticalPosition?.vacancyRisk?.riskLevel || '',
            p.benchStrength?.overallBenchStrength || '',
            p.successorsCount || 0,
            p.readyNowCount || 0,
            p.planStatus,
            p.planDetails?.nextReviewDate ? new Date(p.planDetails.nextReviewDate).toISOString().split('T')[0] : ''
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
