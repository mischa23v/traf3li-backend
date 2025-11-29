const mongoose = require('mongoose');

// Goal schema for performance objectives
const goalSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    weight: { type: Number, default: 1, min: 0, max: 100 }, // Weight in overall evaluation
    targetValue: String,
    achievedValue: String,
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed', 'exceeded', 'not_met'],
        default: 'not_started'
    },
    rating: { type: Number, min: 1, max: 5 },
    comments: String,
    dueDate: Date
}, { _id: true });

// Competency rating schema
const competencySchema = new mongoose.Schema({
    name: { type: String, required: true },
    nameAr: String,
    category: {
        type: String,
        enum: [
            'technical',        // المهارات الفنية
            'communication',    // التواصل
            'leadership',       // القيادة
            'teamwork',         // العمل الجماعي
            'problem_solving',  // حل المشكلات
            'time_management',  // إدارة الوقت
            'adaptability',     // التكيف
            'initiative',       // المبادرة
            'customer_focus',   // التركيز على العميل
            'other'
        ],
        default: 'other'
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    weight: { type: Number, default: 1 },
    comments: String
}, { _id: true });

// Feedback schema for 360 reviews
const feedbackSchema = new mongoose.Schema({
    feedbackFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    feedbackFromName: String,
    relationship: {
        type: String,
        enum: ['manager', 'peer', 'subordinate', 'self', 'client', 'external'],
        required: true
    },
    ratings: [{
        criteria: String,
        rating: { type: Number, min: 1, max: 5 }
    }],
    strengths: String,
    areasForImprovement: String,
    additionalComments: String,
    submittedAt: { type: Date, default: Date.now },
    isAnonymous: { type: Boolean, default: false }
}, { _id: true });

const evaluationSchema = new mongoose.Schema({
    // Auto-generated evaluation ID
    evaluationId: {
        type: String,
        unique: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // EMPLOYEE REFERENCE - مرجع الموظف
    // ═══════════════════════════════════════════════════════════════
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // EVALUATION PERIOD - فترة التقييم
    // ═══════════════════════════════════════════════════════════════
    evaluationType: {
        type: String,
        enum: [
            'annual',           // تقييم سنوي
            'semi_annual',      // تقييم نصف سنوي
            'quarterly',        // تقييم ربع سنوي
            'probation',        // تقييم فترة التجربة
            'project',          // تقييم مشروع
            'promotion',        // تقييم ترقية
            'performance_improvement', // تقييم تحسين الأداء
            'special'           // تقييم خاص
        ],
        required: true
    },

    periodStart: {
        type: Date,
        required: true
    },
    periodEnd: {
        type: Date,
        required: true
    },

    // ═══════════════════════════════════════════════════════════════
    // EVALUATOR - المُقيّم
    // ═══════════════════════════════════════════════════════════════
    evaluatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    evaluatorUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // ═══════════════════════════════════════════════════════════════
    // GOALS & OBJECTIVES - الأهداف
    // ═══════════════════════════════════════════════════════════════
    goals: [goalSchema],
    goalsWeight: { type: Number, default: 50 }, // Weight of goals in overall score
    goalsScore: { type: Number, default: 0 },

    // ═══════════════════════════════════════════════════════════════
    // COMPETENCIES - الكفاءات
    // ═══════════════════════════════════════════════════════════════
    competencies: [competencySchema],
    competenciesWeight: { type: Number, default: 50 }, // Weight of competencies in overall score
    competenciesScore: { type: Number, default: 0 },

    // ═══════════════════════════════════════════════════════════════
    // 360 FEEDBACK - التغذية الراجعة 360
    // ═══════════════════════════════════════════════════════════════
    is360Review: { type: Boolean, default: false },
    feedbacks: [feedbackSchema],
    feedbackScore: { type: Number, default: 0 },
    feedbackWeight: { type: Number, default: 0 },

    // ═══════════════════════════════════════════════════════════════
    // OVERALL RATING - التقييم الإجمالي
    // ═══════════════════════════════════════════════════════════════
    overallRating: {
        type: Number,
        min: 1,
        max: 5
    },
    overallScore: {
        type: Number,
        min: 0,
        max: 100
    },
    performanceLevel: {
        type: String,
        enum: [
            'exceptional',      // استثنائي (5)
            'exceeds',          // يفوق التوقعات (4)
            'meets',            // يلبي التوقعات (3)
            'needs_improvement', // يحتاج تحسين (2)
            'unsatisfactory'    // غير مُرضٍ (1)
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // COMMENTS & DEVELOPMENT - التعليقات والتطوير
    // ═══════════════════════════════════════════════════════════════
    strengths: {
        type: String,
        maxlength: 2000
    },
    areasForImprovement: {
        type: String,
        maxlength: 2000
    },
    developmentPlan: {
        type: String,
        maxlength: 2000
    },
    trainingRecommendations: [{
        title: String,
        description: String,
        priority: {
            type: String,
            enum: ['high', 'medium', 'low'],
            default: 'medium'
        },
        deadline: Date
    }],

    // Employee self-assessment
    selfAssessment: {
        achievements: String,
        challenges: String,
        goals: String,
        feedback: String,
        submittedAt: Date
    },

    // Employee acknowledgment
    employeeComments: {
        type: String,
        maxlength: 2000
    },
    employeeAcknowledged: { type: Boolean, default: false },
    employeeAcknowledgedAt: Date,
    employeeDisagrees: { type: Boolean, default: false },

    // ═══════════════════════════════════════════════════════════════
    // PROMOTION & SALARY RECOMMENDATION - التوصيات
    // ═══════════════════════════════════════════════════════════════
    recommendPromotion: { type: Boolean, default: false },
    promotionDetails: String,
    recommendSalaryIncrease: { type: Boolean, default: false },
    salaryIncreasePercentage: Number,
    recommendBonus: { type: Boolean, default: false },
    bonusAmount: Number,

    // ═══════════════════════════════════════════════════════════════
    // STATUS & WORKFLOW - الحالة وسير العمل
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: [
            'draft',            // مسودة
            'self_assessment',  // التقييم الذاتي
            'in_progress',      // قيد التنفيذ
            'pending_review',   // بانتظار المراجعة
            'pending_acknowledgment', // بانتظار الإقرار
            'completed',        // مكتمل
            'cancelled'         // ملغي
        ],
        default: 'draft',
        index: true
    },

    dueDate: Date,
    completedAt: Date,

    // Reviewer (HR or senior manager)
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewedAt: Date,
    reviewerComments: String,

    // ═══════════════════════════════════════════════════════════════
    // METADATA - البيانات الوصفية
    // ═══════════════════════════════════════════════════════════════
    notes: {
        type: String,
        maxlength: 2000
    },

    // Attachments
    attachments: [{
        fileName: String,
        fileUrl: String,
        fileKey: String,
        uploadedAt: { type: Date, default: Date.now }
    }],

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
evaluationSchema.index({ employeeId: 1, periodStart: -1 });
evaluationSchema.index({ lawyerId: 1, status: 1 });
evaluationSchema.index({ lawyerId: 1, evaluationType: 1 });

// Generate evaluation ID before saving
evaluationSchema.pre('save', async function(next) {
    if (!this.evaluationId) {
        const year = new Date().getFullYear();
        const count = await this.constructor.countDocuments({
            lawyerId: this.lawyerId,
            createdAt: { $gte: new Date(year, 0, 1) }
        });
        this.evaluationId = `EVAL-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    // Calculate scores
    this.calculateScores();

    next();
});

// Method to calculate all scores
evaluationSchema.methods.calculateScores = function() {
    // Calculate goals score
    if (this.goals.length > 0) {
        const totalWeight = this.goals.reduce((sum, g) => sum + (g.weight || 1), 0);
        const weightedSum = this.goals.reduce((sum, g) => {
            return sum + ((g.rating || 0) * (g.weight || 1));
        }, 0);
        this.goalsScore = totalWeight > 0 ? (weightedSum / totalWeight) * 20 : 0; // Scale to 100
    }

    // Calculate competencies score
    if (this.competencies.length > 0) {
        const totalWeight = this.competencies.reduce((sum, c) => sum + (c.weight || 1), 0);
        const weightedSum = this.competencies.reduce((sum, c) => {
            return sum + ((c.rating || 0) * (c.weight || 1));
        }, 0);
        this.competenciesScore = totalWeight > 0 ? (weightedSum / totalWeight) * 20 : 0; // Scale to 100
    }

    // Calculate feedback score
    if (this.feedbacks.length > 0) {
        const avgRatings = this.feedbacks.map(f => {
            const ratings = f.ratings.map(r => r.rating).filter(r => r);
            return ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
        });
        this.feedbackScore = avgRatings.reduce((a, b) => a + b, 0) / avgRatings.length * 20;
    }

    // Calculate overall score
    let totalWeight = 0;
    let weightedScore = 0;

    if (this.goalsWeight > 0 && this.goals.length > 0) {
        weightedScore += this.goalsScore * (this.goalsWeight / 100);
        totalWeight += this.goalsWeight;
    }

    if (this.competenciesWeight > 0 && this.competencies.length > 0) {
        weightedScore += this.competenciesScore * (this.competenciesWeight / 100);
        totalWeight += this.competenciesWeight;
    }

    if (this.feedbackWeight > 0 && this.feedbacks.length > 0) {
        weightedScore += this.feedbackScore * (this.feedbackWeight / 100);
        totalWeight += this.feedbackWeight;
    }

    this.overallScore = totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 0;

    // Set overall rating (1-5)
    this.overallRating = Math.round(this.overallScore / 20);
    if (this.overallRating < 1) this.overallRating = 1;
    if (this.overallRating > 5) this.overallRating = 5;

    // Set performance level
    if (this.overallRating >= 5) this.performanceLevel = 'exceptional';
    else if (this.overallRating >= 4) this.performanceLevel = 'exceeds';
    else if (this.overallRating >= 3) this.performanceLevel = 'meets';
    else if (this.overallRating >= 2) this.performanceLevel = 'needs_improvement';
    else this.performanceLevel = 'unsatisfactory';
};

// Static method: Get evaluation history for employee
evaluationSchema.statics.getEvaluationHistory = async function(employeeId) {
    return await this.find({
        employeeId: new mongoose.Types.ObjectId(employeeId),
        status: 'completed'
    })
    .sort({ periodEnd: -1 })
    .populate('evaluatorId', 'firstName lastName');
};

// Static method: Get pending evaluations
evaluationSchema.statics.getPendingEvaluations = async function(lawyerId) {
    return await this.find({
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        status: { $in: ['draft', 'self_assessment', 'in_progress', 'pending_review'] }
    })
    .populate('employeeId', 'firstName lastName employeeId department')
    .sort({ dueDate: 1 });
};

// Static method: Get evaluation statistics
evaluationSchema.statics.getEvaluationStats = async function(lawyerId, year) {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    return await this.aggregate([
        {
            $match: {
                lawyerId: new mongoose.Types.ObjectId(lawyerId),
                status: 'completed',
                completedAt: { $gte: startOfYear, $lte: endOfYear }
            }
        },
        {
            $group: {
                _id: '$performanceLevel',
                count: { $sum: 1 },
                avgScore: { $avg: '$overallScore' }
            }
        }
    ]);
};

module.exports = mongoose.model('Evaluation', evaluationSchema);
