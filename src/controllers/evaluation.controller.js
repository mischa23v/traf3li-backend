const { Evaluation, Employee } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const mongoose = require('mongoose');

/**
 * Create evaluation
 * POST /api/evaluations
 */
const createEvaluation = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    const {
        employeeId,
        evaluationType,
        periodStart,
        periodEnd,
        evaluatorId,
        goals,
        goalsWeight,
        competencies,
        competenciesWeight,
        is360Review,
        feedbackWeight,
        dueDate,
        notes
    } = req.body;

    // Validate required fields
    if (!employeeId || !evaluationType || !periodStart || !periodEnd) {
        throw new CustomException('الحقول المطلوبة: الموظف، نوع التقييم، فترة التقييم', 400);
    }

    // Verify employee belongs to lawyer
    const employee = await Employee.findById(employeeId);
    if (!employee || employee.lawyerId.toString() !== lawyerId) {
        throw new CustomException('الموظف غير موجود أو لا يمكنك الوصول إليه', 404);
    }

    // Check for existing evaluation for same period
    const existingEvaluation = await Evaluation.findOne({
        employeeId,
        evaluationType,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        status: { $ne: 'cancelled' }
    });

    if (existingEvaluation) {
        throw new CustomException('يوجد تقييم لهذه الفترة بالفعل', 400);
    }

    const evaluation = await Evaluation.create({
        lawyerId,
        employeeId,
        evaluationType,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        evaluatorId,
        evaluatorUserId: lawyerId,
        goals: goals || [],
        goalsWeight: goalsWeight || 50,
        competencies: competencies || [],
        competenciesWeight: competenciesWeight || 50,
        is360Review: is360Review || false,
        feedbackWeight: feedbackWeight || 0,
        dueDate,
        notes,
        createdBy: lawyerId
    });

    res.status(201).json({
        success: true,
        message: 'تم إنشاء التقييم بنجاح',
        data: evaluation
    });
});

/**
 * Get all evaluations
 * GET /api/evaluations
 */
const getEvaluations = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const {
        employeeId,
        evaluationType,
        status,
        year,
        page = 1,
        limit = 50
    } = req.query;

    const query = { lawyerId };

    if (employeeId) query.employeeId = employeeId;
    if (evaluationType) query.evaluationType = evaluationType;
    if (status) query.status = status;

    if (year) {
        query.periodStart = {
            $gte: new Date(year, 0, 1),
            $lte: new Date(year, 11, 31)
        };
    }

    const evaluations = await Evaluation.find(query)
        .populate('employeeId', 'firstName lastName employeeId department position')
        .populate('evaluatorId', 'firstName lastName employeeId')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Evaluation.countDocuments(query);

    res.status(200).json({
        success: true,
        data: evaluations,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get evaluation by ID
 * GET /api/evaluations/:id
 */
const getEvaluation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const evaluation = await Evaluation.findById(id)
        .populate('employeeId', 'firstName lastName employeeId department position hireDate')
        .populate('evaluatorId', 'firstName lastName employeeId position')
        .populate('reviewedBy', 'firstName lastName');

    if (!evaluation) {
        throw new CustomException('التقييم غير موجود', 404);
    }

    if (evaluation.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا التقييم', 403);
    }

    // Get previous evaluations for comparison
    const previousEvaluations = await Evaluation.find({
        employeeId: evaluation.employeeId._id,
        _id: { $ne: id },
        status: 'completed'
    })
    .select('evaluationType periodEnd overallRating overallScore performanceLevel')
    .sort({ periodEnd: -1 })
    .limit(5);

    res.status(200).json({
        success: true,
        data: {
            evaluation,
            previousEvaluations
        }
    });
});

/**
 * Update evaluation
 * PUT /api/evaluations/:id
 */
const updateEvaluation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const evaluation = await Evaluation.findById(id);

    if (!evaluation) {
        throw new CustomException('التقييم غير موجود', 404);
    }

    if (evaluation.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا التقييم', 403);
    }

    if (evaluation.status === 'completed') {
        throw new CustomException('لا يمكن تعديل تقييم مكتمل', 400);
    }

    const allowedFields = [
        'evaluationType', 'periodStart', 'periodEnd', 'evaluatorId',
        'goals', 'goalsWeight', 'competencies', 'competenciesWeight',
        'is360Review', 'feedbackWeight', 'strengths', 'areasForImprovement',
        'developmentPlan', 'trainingRecommendations', 'recommendPromotion',
        'promotionDetails', 'recommendSalaryIncrease', 'salaryIncreasePercentage',
        'recommendBonus', 'bonusAmount', 'dueDate', 'notes'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            evaluation[field] = req.body[field];
        }
    });

    await evaluation.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث التقييم بنجاح',
        data: evaluation
    });
});

/**
 * Add goal to evaluation
 * POST /api/evaluations/:id/goals
 */
const addGoal = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const { title, description, weight, targetValue, dueDate } = req.body;

    const evaluation = await Evaluation.findById(id);

    if (!evaluation) {
        throw new CustomException('التقييم غير موجود', 404);
    }

    if (evaluation.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا التقييم', 403);
    }

    if (!title) {
        throw new CustomException('عنوان الهدف مطلوب', 400);
    }

    evaluation.goals.push({
        title,
        description,
        weight: weight || 1,
        targetValue,
        status: 'not_started',
        dueDate
    });

    await evaluation.save();

    res.status(201).json({
        success: true,
        message: 'تم إضافة الهدف بنجاح',
        data: evaluation.goals
    });
});

/**
 * Update goal in evaluation
 * PATCH /api/evaluations/:id/goals/:goalId
 */
const updateGoal = asyncHandler(async (req, res) => {
    const { id, goalId } = req.params;
    const lawyerId = req.userID;

    const evaluation = await Evaluation.findById(id);

    if (!evaluation) {
        throw new CustomException('التقييم غير موجود', 404);
    }

    if (evaluation.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا التقييم', 403);
    }

    const goal = evaluation.goals.id(goalId);
    if (!goal) {
        throw new CustomException('الهدف غير موجود', 404);
    }

    const allowedFields = ['title', 'description', 'weight', 'targetValue', 'achievedValue', 'status', 'rating', 'comments', 'dueDate'];
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            goal[field] = req.body[field];
        }
    });

    await evaluation.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث الهدف بنجاح',
        data: evaluation.goals
    });
});

/**
 * Add competency to evaluation
 * POST /api/evaluations/:id/competencies
 */
const addCompetency = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const { name, nameAr, category, rating, weight, comments } = req.body;

    const evaluation = await Evaluation.findById(id);

    if (!evaluation) {
        throw new CustomException('التقييم غير موجود', 404);
    }

    if (evaluation.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا التقييم', 403);
    }

    if (!name || !rating) {
        throw new CustomException('اسم الكفاءة والتقييم مطلوبان', 400);
    }

    evaluation.competencies.push({
        name,
        nameAr,
        category: category || 'other',
        rating,
        weight: weight || 1,
        comments
    });

    await evaluation.save();

    res.status(201).json({
        success: true,
        message: 'تم إضافة الكفاءة بنجاح',
        data: evaluation.competencies
    });
});

/**
 * Add 360 feedback
 * POST /api/evaluations/:id/feedback
 */
const addFeedback = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const {
        feedbackFrom,
        feedbackFromName,
        relationship,
        ratings,
        strengths,
        areasForImprovement,
        additionalComments,
        isAnonymous
    } = req.body;

    const evaluation = await Evaluation.findById(id);

    if (!evaluation) {
        throw new CustomException('التقييم غير موجود', 404);
    }

    if (evaluation.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا التقييم', 403);
    }

    if (!evaluation.is360Review) {
        throw new CustomException('هذا التقييم ليس تقييم 360', 400);
    }

    if (!relationship) {
        throw new CustomException('نوع العلاقة مطلوب', 400);
    }

    evaluation.feedbacks.push({
        feedbackFrom,
        feedbackFromName,
        relationship,
        ratings: ratings || [],
        strengths,
        areasForImprovement,
        additionalComments,
        isAnonymous: isAnonymous || false,
        submittedAt: new Date()
    });

    await evaluation.save();

    res.status(201).json({
        success: true,
        message: 'تم إضافة التغذية الراجعة بنجاح',
        data: evaluation.feedbacks
    });
});

/**
 * Submit self assessment
 * POST /api/evaluations/:id/self-assessment
 */
const submitSelfAssessment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const { achievements, challenges, goals, feedback } = req.body;

    const evaluation = await Evaluation.findById(id);

    if (!evaluation) {
        throw new CustomException('التقييم غير موجود', 404);
    }

    if (evaluation.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا التقييم', 403);
    }

    evaluation.selfAssessment = {
        achievements,
        challenges,
        goals,
        feedback,
        submittedAt: new Date()
    };

    if (evaluation.status === 'self_assessment') {
        evaluation.status = 'in_progress';
    }

    await evaluation.save();

    res.status(200).json({
        success: true,
        message: 'تم إرسال التقييم الذاتي بنجاح',
        data: evaluation.selfAssessment
    });
});

/**
 * Submit evaluation for review
 * POST /api/evaluations/:id/submit
 */
const submitEvaluation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const evaluation = await Evaluation.findById(id);

    if (!evaluation) {
        throw new CustomException('التقييم غير موجود', 404);
    }

    if (evaluation.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا التقييم', 403);
    }

    if (!['draft', 'in_progress'].includes(evaluation.status)) {
        throw new CustomException('التقييم ليس في حالة تسمح بالإرسال', 400);
    }

    // Validate that there are goals or competencies
    if (evaluation.goals.length === 0 && evaluation.competencies.length === 0) {
        throw new CustomException('يجب إضافة أهداف أو كفاءات قبل الإرسال', 400);
    }

    evaluation.status = 'pending_review';
    await evaluation.save();

    res.status(200).json({
        success: true,
        message: 'تم إرسال التقييم للمراجعة',
        data: evaluation
    });
});

/**
 * Complete evaluation
 * POST /api/evaluations/:id/complete
 */
const completeEvaluation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const { reviewerComments } = req.body;

    const evaluation = await Evaluation.findById(id);

    if (!evaluation) {
        throw new CustomException('التقييم غير موجود', 404);
    }

    if (evaluation.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا التقييم', 403);
    }

    evaluation.status = 'pending_acknowledgment';
    evaluation.reviewedBy = lawyerId;
    evaluation.reviewedAt = new Date();
    evaluation.reviewerComments = reviewerComments;

    await evaluation.save();

    res.status(200).json({
        success: true,
        message: 'تم اعتماد التقييم، في انتظار إقرار الموظف',
        data: evaluation
    });
});

/**
 * Employee acknowledge evaluation
 * POST /api/evaluations/:id/acknowledge
 */
const acknowledgeEvaluation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const { employeeComments, disagrees } = req.body;

    const evaluation = await Evaluation.findById(id);

    if (!evaluation) {
        throw new CustomException('التقييم غير موجود', 404);
    }

    if (evaluation.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا التقييم', 403);
    }

    evaluation.employeeAcknowledged = true;
    evaluation.employeeAcknowledgedAt = new Date();
    evaluation.employeeComments = employeeComments;
    evaluation.employeeDisagrees = disagrees || false;
    evaluation.status = 'completed';
    evaluation.completedAt = new Date();

    await evaluation.save();

    res.status(200).json({
        success: true,
        message: 'تم إقرار التقييم بنجاح',
        data: evaluation
    });
});

/**
 * Get evaluation history for employee
 * GET /api/evaluations/employee/:employeeId/history
 */
const getEvaluationHistory = asyncHandler(async (req, res) => {
    const { employeeId } = req.params;
    const lawyerId = req.userID;

    // Verify employee belongs to lawyer
    const employee = await Employee.findById(employeeId);
    if (!employee || employee.lawyerId.toString() !== lawyerId) {
        throw new CustomException('الموظف غير موجود أو لا يمكنك الوصول إليه', 404);
    }

    const history = await Evaluation.getEvaluationHistory(employeeId);

    res.status(200).json({
        success: true,
        data: history
    });
});

/**
 * Get pending evaluations
 * GET /api/evaluations/pending
 */
const getPendingEvaluations = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    const pending = await Evaluation.getPendingEvaluations(lawyerId);

    res.status(200).json({
        success: true,
        data: pending
    });
});

/**
 * Get evaluation statistics
 * GET /api/evaluations/stats
 */
const getEvaluationStats = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const { year = new Date().getFullYear() } = req.query;

    const stats = await Evaluation.getEvaluationStats(lawyerId, parseInt(year));

    const byType = await Evaluation.aggregate([
        {
            $match: {
                lawyerId: new mongoose.Types.ObjectId(lawyerId),
                status: 'completed',
                completedAt: {
                    $gte: new Date(year, 0, 1),
                    $lte: new Date(year, 11, 31)
                }
            }
        },
        {
            $group: {
                _id: '$evaluationType',
                count: { $sum: 1 },
                avgScore: { $avg: '$overallScore' }
            }
        }
    ]);

    const totalCompleted = await Evaluation.countDocuments({
        lawyerId,
        status: 'completed',
        completedAt: {
            $gte: new Date(year, 0, 1),
            $lte: new Date(year, 11, 31)
        }
    });

    const totalPending = await Evaluation.countDocuments({
        lawyerId,
        status: { $in: ['draft', 'in_progress', 'pending_review', 'pending_acknowledgment'] }
    });

    res.status(200).json({
        success: true,
        data: {
            year: parseInt(year),
            totalCompleted,
            totalPending,
            byPerformanceLevel: stats,
            byType
        }
    });
});

/**
 * Delete evaluation
 * DELETE /api/evaluations/:id
 */
const deleteEvaluation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const evaluation = await Evaluation.findById(id);

    if (!evaluation) {
        throw new CustomException('التقييم غير موجود', 404);
    }

    if (evaluation.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا التقييم', 403);
    }

    if (evaluation.status === 'completed') {
        throw new CustomException('لا يمكن حذف تقييم مكتمل', 400);
    }

    await Evaluation.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: 'تم حذف التقييم بنجاح'
    });
});

module.exports = {
    createEvaluation,
    getEvaluations,
    getEvaluation,
    updateEvaluation,
    addGoal,
    updateGoal,
    addCompetency,
    addFeedback,
    submitSelfAssessment,
    submitEvaluation,
    completeEvaluation,
    acknowledgeEvaluation,
    getEvaluationHistory,
    getPendingEvaluations,
    getEvaluationStats,
    deleteEvaluation
};
