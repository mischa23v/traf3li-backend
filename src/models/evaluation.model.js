const mongoose = require('mongoose');

/**
 * Performance Evaluation Model
 * Tracks employee performance reviews, goals, and feedback
 */

// Rating schema for individual criteria
const ratingSchema = new mongoose.Schema({
    criteriaId: String,
    criteriaName: {
        type: String,
        required: true
    },
    criteriaNameAr: String,
    weight: {
        type: Number,
        default: 1,
        min: 0,
        max: 10
    },
    rating: {
        type: Number,
        min: 1,
        max: 5  // 1: Poor, 2: Below Average, 3: Average, 4: Good, 5: Excellent
    },
    comments: String
}, { _id: false });

// Goal schema
const goalSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    titleAr: String,
    description: String,
    targetDate: Date,
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed', 'cancelled', 'deferred'],
        default: 'not_started'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    completedAt: Date,
    evaluatorComments: String,
    employeeComments: String
}, { _id: true });

const evaluationSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
    },

    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    evaluationId: {
        type: String,
        unique: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // EVALUATION PERIOD
    // ═══════════════════════════════════════════════════════════════
    evaluationType: {
        type: String,
        enum: [
            'annual',           // تقييم سنوي
            'semi_annual',      // نصف سنوي
            'quarterly',        // ربع سنوي
            'probation',        // فترة التجربة
            'project',          // تقييم مشروع
            'promotion',        // تقييم ترقية
            'adhoc'             // تقييم طارئ
        ],
        default: 'annual',
        index: true
    },
    periodStart: {
        type: Date,
        required: true
    },
    periodEnd: {
        type: Date,
        required: true
    },
    title: String,

    // ═══════════════════════════════════════════════════════════════
    // EVALUATOR INFO
    // ═══════════════════════════════════════════════════════════════
    evaluatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    evaluatorRole: {
        type: String,
        enum: ['manager', 'supervisor', 'hr', 'peer', 'self'],
        default: 'manager'
    },

    // ═══════════════════════════════════════════════════════════════
    // RATINGS
    // ═══════════════════════════════════════════════════════════════
    ratings: [ratingSchema],
    overallRating: {
        type: Number,
        min: 1,
        max: 5
    },
    overallRatingLabel: {
        type: String,
        enum: ['poor', 'below_average', 'average', 'good', 'excellent']
    },
    weightedScore: {
        type: Number,
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // COMPETENCIES (Standard evaluation criteria)
    // ═══════════════════════════════════════════════════════════════
    competencies: {
        // Technical Skills
        technicalSkills: ratingSchema,
        // Communication
        communication: ratingSchema,
        // Teamwork
        teamwork: ratingSchema,
        // Problem Solving
        problemSolving: ratingSchema,
        // Time Management
        timeManagement: ratingSchema,
        // Initiative
        initiative: ratingSchema,
        // Leadership (if applicable)
        leadership: ratingSchema,
        // Client Relations
        clientRelations: ratingSchema,
        // Quality of Work
        qualityOfWork: ratingSchema,
        // Attendance & Punctuality
        attendancePunctuality: ratingSchema
    },

    // ═══════════════════════════════════════════════════════════════
    // GOALS & OBJECTIVES
    // ═══════════════════════════════════════════════════════════════
    goals: [goalSchema],
    goalsAchievementRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    nextPeriodGoals: [goalSchema],

    // ═══════════════════════════════════════════════════════════════
    // FEEDBACK & COMMENTS
    // ═══════════════════════════════════════════════════════════════
    strengths: {
        type: String,
        maxlength: 2000
    },
    areasForImprovement: {
        type: String,
        maxlength: 2000
    },
    evaluatorComments: {
        type: String,
        maxlength: 2000
    },
    employeeComments: {
        type: String,
        maxlength: 2000
    },
    developmentPlan: {
        type: String,
        maxlength: 2000
    },
    trainingRecommendations: [{
        type: String
    }],

    // ═══════════════════════════════════════════════════════════════
    // RECOMMENDATIONS
    // ═══════════════════════════════════════════════════════════════
    recommendation: {
        type: String,
        enum: [
            'promotion',            // ترقية
            'salary_increase',      // زيادة راتب
            'bonus',                // مكافأة
            'retain',               // إبقاء
            'performance_plan',     // خطة تحسين الأداء
            'warning',              // إنذار
            'termination',          // إنهاء الخدمة
            'training',             // تدريب
            'no_change'             // لا تغيير
        ]
    },
    recommendedSalaryIncrease: {
        type: Number,  // Percentage
        min: 0,
        max: 100
    },
    recommendedBonus: {
        type: Number
    },
    recommendedPromotion: {
        newTitle: String,
        newGrade: String
    },

    // ═══════════════════════════════════════════════════════════════
    // WORKFLOW STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: [
            'draft',                // مسودة
            'self_evaluation',      // التقييم الذاتي
            'in_progress',          // قيد التقييم
            'pending_review',       // بانتظار المراجعة
            'pending_employee',     // بانتظار الموظف
            'completed',            // مكتمل
            'cancelled'             // ملغي
        ],
        default: 'draft',
        index: true
    },

    // Self Evaluation (filled by employee)
    selfEvaluation: {
        ratings: [ratingSchema],
        overallRating: Number,
        achievements: String,
        challenges: String,
        futureGoals: String,
        submittedAt: Date
    },

    // Acknowledgment
    employeeAcknowledged: {
        type: Boolean,
        default: false
    },
    employeeAcknowledgedAt: Date,
    employeeDisagreed: {
        type: Boolean,
        default: false
    },
    disagreementReason: String,

    // HR Review
    hrReviewed: {
        type: Boolean,
        default: false
    },
    hrReviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    hrReviewedAt: Date,
    hrComments: String,

    // ═══════════════════════════════════════════════════════════════
    // MEETING
    // ═══════════════════════════════════════════════════════════════
    meetingDate: Date,
    meetingNotes: String,
    meetingAttendees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // ═══════════════════════════════════════════════════════════════
    // ATTACHMENTS
    // ═══════════════════════════════════════════════════════════════
    attachments: [{
        fileName: String,
        fileUrl: String,
        fileType: String,
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],

    // ═══════════════════════════════════════════════════════════════
    // LINKED RECORDS
    // ═══════════════════════════════════════════════════════════════
    previousEvaluationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Evaluation'
    },
    payrollImpactId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payroll'
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    dueDate: Date,
    submittedAt: Date,
    completedAt: Date,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
evaluationSchema.index({ lawyerId: 1, employeeId: 1, periodStart: -1 });
evaluationSchema.index({ lawyerId: 1, status: 1 });
evaluationSchema.index({ evaluatorId: 1, status: 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
evaluationSchema.pre('save', async function(next) {
    // Generate evaluation ID
    if (!this.evaluationId) {
        const date = new Date();
        const year = date.getFullYear();
        const count = await this.constructor.countDocuments({
            lawyerId: this.lawyerId,
            createdAt: {
                $gte: new Date(year, 0, 1),
                $lt: new Date(year + 1, 0, 1)
            }
        });
        this.evaluationId = `EVAL-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    // Calculate weighted score and overall rating
    if (this.ratings && this.ratings.length > 0) {
        let totalWeight = 0;
        let weightedSum = 0;

        this.ratings.forEach(rating => {
            if (rating.rating) {
                totalWeight += rating.weight || 1;
                weightedSum += (rating.rating * (rating.weight || 1));
            }
        });

        if (totalWeight > 0) {
            this.weightedScore = weightedSum / totalWeight;
            this.overallRating = Math.round(this.weightedScore);

            // Set label
            const labels = ['poor', 'below_average', 'average', 'good', 'excellent'];
            this.overallRatingLabel = labels[this.overallRating - 1] || 'average';
        }
    }

    // Calculate goals achievement rate
    if (this.goals && this.goals.length > 0) {
        const completedGoals = this.goals.filter(g => g.status === 'completed').length;
        this.goalsAchievementRate = Math.round((completedGoals / this.goals.length) * 100);
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get evaluations for an employee
evaluationSchema.statics.getForEmployee = async function(employeeId, options = {}) {
    const query = { employeeId: new mongoose.Types.ObjectId(employeeId) };

    if (options.status) query.status = options.status;
    if (options.evaluationType) query.evaluationType = options.evaluationType;

    return this.find(query)
        .populate('evaluatorId', 'firstName lastName')
        .sort({ periodEnd: -1 })
        .limit(options.limit || 10);
};

// Get pending evaluations for a manager
evaluationSchema.statics.getPendingForEvaluator = async function(evaluatorId, lawyerId) {
    return this.find({
        lawyerId,
        evaluatorId,
        status: { $in: ['draft', 'in_progress', 'self_evaluation'] }
    })
    .populate('employeeId', 'firstName lastName employeeId department position')
    .sort({ dueDate: 1 });
};

// Get evaluation statistics
evaluationSchema.statics.getStats = async function(lawyerId, year = new Date().getFullYear()) {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);

    const stats = await this.aggregate([
        {
            $match: {
                lawyerId: new mongoose.Types.ObjectId(lawyerId),
                periodEnd: { $gte: yearStart, $lte: yearEnd },
                status: 'completed'
            }
        },
        {
            $group: {
                _id: null,
                totalEvaluations: { $sum: 1 },
                averageRating: { $avg: '$overallRating' },
                averageGoalsAchievement: { $avg: '$goalsAchievementRate' },
                ratingDistribution: {
                    $push: '$overallRating'
                }
            }
        }
    ]);

    if (stats.length === 0) {
        return {
            totalEvaluations: 0,
            averageRating: 0,
            averageGoalsAchievement: 0,
            ratingDistribution: {}
        };
    }

    // Calculate rating distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    stats[0].ratingDistribution.forEach(rating => {
        if (rating >= 1 && rating <= 5) {
            distribution[Math.round(rating)]++;
        }
    });

    return {
        totalEvaluations: stats[0].totalEvaluations,
        averageRating: Math.round(stats[0].averageRating * 100) / 100,
        averageGoalsAchievement: Math.round(stats[0].averageGoalsAchievement),
        ratingDistribution: distribution
    };
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Submit self evaluation
evaluationSchema.methods.submitSelfEvaluation = async function(selfEvalData) {
    this.selfEvaluation = {
        ...selfEvalData,
        submittedAt: new Date()
    };
    this.status = 'in_progress';
    await this.save();
    return this;
};

// Complete evaluation
evaluationSchema.methods.complete = async function(userId) {
    this.status = 'completed';
    this.completedAt = new Date();
    this.updatedBy = userId;
    await this.save();
    return this;
};

// Employee acknowledges evaluation
evaluationSchema.methods.acknowledge = async function(agreed, disagreementReason) {
    this.employeeAcknowledged = true;
    this.employeeAcknowledgedAt = new Date();

    if (!agreed) {
        this.employeeDisagreed = true;
        this.disagreementReason = disagreementReason;
    }

    await this.save();
    return this;
};

module.exports = mongoose.model('Evaluation', evaluationSchema);
