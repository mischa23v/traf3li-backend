/**
 * Employee Survey Model
 *
 * Enterprise employee engagement survey system
 * Inspired by: Culture Amp, Qualtrics, BambooHR, Peakon
 *
 * Features:
 * - Multiple survey types (engagement, pulse, exit, onboarding, 360)
 * - Question templates with various response types
 * - Anonymous/named responses
 * - Response analytics
 * - Benchmarking
 */

const mongoose = require('mongoose');
const Counter = require('./counter.model');

// ═══════════════════════════════════════════════════════════════
// SURVEY TEMPLATE SCHEMA
// ═══════════════════════════════════════════════════════════════

const questionSchema = new mongoose.Schema({
    questionId: { type: String, required: true },
    questionText: { type: String, required: true },
    questionTextAr: String,
    questionType: {
        type: String,
        enum: [
            'rating',           // 1-5 or 1-10 scale
            'nps',              // Net Promoter Score (0-10)
            'multiple_choice',  // Single select
            'checkbox',         // Multi select
            'text',             // Free text
            'yes_no',           // Yes/No
            'scale',            // Custom scale (e.g., strongly agree to strongly disagree)
            'ranking',          // Rank items
            'matrix',           // Matrix/grid questions
            'date'              // Date picker
        ],
        required: true
    },
    category: {
        type: String,
        enum: [
            'engagement',
            'satisfaction',
            'culture',
            'leadership',
            'growth',
            'compensation',
            'work_life_balance',
            'communication',
            'teamwork',
            'recognition',
            'diversity',
            'safety',
            'onboarding',
            'exit',
            'custom'
        ],
        default: 'custom'
    },
    options: [{
        value: { type: String, required: true },
        label: { type: String, required: true },
        labelAr: String,
        weight: Number // For scoring
    }],
    scaleConfig: {
        min: { type: Number, default: 1 },
        max: { type: Number, default: 5 },
        minLabel: String,
        minLabelAr: String,
        maxLabel: String,
        maxLabelAr: String
    },
    required: { type: Boolean, default: true },
    conditionalLogic: {
        enabled: { type: Boolean, default: false },
        showIf: {
            questionId: String,
            operator: { type: String, enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains'] },
            value: mongoose.Schema.Types.Mixed
        }
    },
    helpText: String,
    helpTextAr: String,
    order: { type: Number, default: 0 }
}, { _id: false });

const surveyTemplateSchema = new mongoose.Schema({
    templateId: {
        type: String,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: [true, 'Survey template name is required'],
        trim: true
    },
    nameAr: String,
    description: String,
    descriptionAr: String,

    surveyType: {
        type: String,
        enum: [
            'engagement',       // Annual/semi-annual engagement
            'pulse',           // Quick pulse checks
            'onboarding',      // New hire surveys
            'exit',            // Exit interviews
            '360_feedback',    // 360 degree feedback
            'satisfaction',    // General satisfaction
            'culture',         // Culture assessment
            'custom'           // Custom surveys
        ],
        required: true,
        index: true
    },

    questions: [questionSchema],
    sections: [{
        sectionId: String,
        title: String,
        titleAr: String,
        description: String,
        descriptionAr: String,
        questionIds: [String],
        order: Number
    }],

    // Scoring configuration
    scoring: {
        enabled: { type: Boolean, default: true },
        maxScore: { type: Number, default: 100 },
        benchmarks: {
            excellent: { type: Number, default: 80 },
            good: { type: Number, default: 60 },
            average: { type: Number, default: 40 },
            poor: { type: Number, default: 20 }
        }
    },

    // Settings
    settings: {
        allowAnonymous: { type: Boolean, default: true },
        showProgressBar: { type: Boolean, default: true },
        allowSkip: { type: Boolean, default: false },
        randomizeQuestions: { type: Boolean, default: false },
        estimatedDuration: { type: Number, default: 10 } // minutes
    },

    isActive: { type: Boolean, default: true, index: true },
    isDefault: { type: Boolean, default: false },

    // Multi-tenant
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// SURVEY INSTANCE SCHEMA
// ═══════════════════════════════════════════════════════════════

const surveySchema = new mongoose.Schema({
    surveyId: {
        type: String,
        unique: true,
        index: true
    },
    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SurveyTemplate'
    },

    // Survey details
    title: {
        type: String,
        required: [true, 'Survey title is required'],
        trim: true
    },
    titleAr: String,
    description: String,
    descriptionAr: String,

    surveyType: {
        type: String,
        enum: ['engagement', 'pulse', 'onboarding', 'exit', '360_feedback', 'satisfaction', 'culture', 'custom'],
        required: true,
        index: true
    },

    // Questions (copied from template or custom)
    questions: [questionSchema],
    sections: [{
        sectionId: String,
        title: String,
        titleAr: String,
        description: String,
        descriptionAr: String,
        questionIds: [String],
        order: Number
    }],

    // Timing
    status: {
        type: String,
        enum: ['draft', 'scheduled', 'active', 'paused', 'closed', 'archived'],
        default: 'draft',
        index: true
    },
    startDate: { type: Date, index: true },
    endDate: { type: Date, index: true },
    reminderFrequency: {
        type: String,
        enum: ['none', 'daily', 'every_2_days', 'weekly'],
        default: 'weekly'
    },
    lastReminderSent: Date,

    // Target audience
    targetAudience: {
        type: {
            type: String,
            enum: ['all', 'department', 'role', 'custom'],
            default: 'all'
        },
        departments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
        roles: [String],
        employeeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
        excludedEmployeeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }]
    },

    // Settings
    settings: {
        isAnonymous: { type: Boolean, default: true },
        showProgressBar: { type: Boolean, default: true },
        allowSaveDraft: { type: Boolean, default: true },
        requireCompletion: { type: Boolean, default: false },
        notifyOnSubmission: { type: Boolean, default: true },
        estimatedDuration: { type: Number, default: 10 }
    },

    // Scoring
    scoring: {
        enabled: { type: Boolean, default: true },
        maxScore: { type: Number, default: 100 }
    },

    // Statistics (updated on response submission)
    statistics: {
        totalInvited: { type: Number, default: 0 },
        totalResponses: { type: Number, default: 0 },
        completedResponses: { type: Number, default: 0 },
        partialResponses: { type: Number, default: 0 },
        abandonedResponses: { type: Number, default: 0 },
        responseRate: { type: Number, default: 0 },
        avgScore: { type: Number, default: 0 },
        medianScore: { type: Number, default: 0 },
        lastResponseAt: Date,
        avgTimeSpentSeconds: { type: Number, default: 0 }
    },

    // ═══════════════════════════════════════════════════════════════
    // NPS ANALYTICS (Net Promoter Score)
    // ═══════════════════════════════════════════════════════════════
    npsAnalytics: {
        npsScore: { type: Number, default: null },  // -100 to +100
        promoters: { type: Number, default: 0 },     // 9-10 ratings
        passives: { type: Number, default: 0 },      // 7-8 ratings
        detractors: { type: Number, default: 0 },    // 0-6 ratings
        promoterPercentage: { type: Number, default: 0 },
        passivePercentage: { type: Number, default: 0 },
        detractorPercentage: { type: Number, default: 0 },
        totalNpsResponses: { type: Number, default: 0 },
        npsQuestionId: String,  // Which question is the NPS question
        trend: {
            type: String,
            enum: ['improving', 'stable', 'declining', 'new'],
            default: 'new'
        },
        previousNpsScore: Number,
        npsChange: Number
    },

    // ═══════════════════════════════════════════════════════════════
    // eNPS (Employee Net Promoter Score)
    // ═══════════════════════════════════════════════════════════════
    enpsAnalytics: {
        enpsScore: { type: Number, default: null },
        questionText: { type: String, default: 'How likely are you to recommend this company as a place to work?' },
        questionTextAr: { type: String, default: 'ما مدى احتمالية أن توصي بهذه الشركة كمكان للعمل؟' },
        promoters: { type: Number, default: 0 },
        passives: { type: Number, default: 0 },
        detractors: { type: Number, default: 0 },
        totalResponses: { type: Number, default: 0 }
    },

    // ═══════════════════════════════════════════════════════════════
    // SENTIMENT ANALYSIS
    // ═══════════════════════════════════════════════════════════════
    sentimentAnalysis: {
        overallSentiment: {
            type: String,
            enum: ['very_positive', 'positive', 'neutral', 'negative', 'very_negative'],
            default: 'neutral'
        },
        sentimentScore: { type: Number, default: 0, min: -1, max: 1 },
        totalTextResponses: { type: Number, default: 0 },
        analyzedResponses: { type: Number, default: 0 },
        positiveCount: { type: Number, default: 0 },
        neutralCount: { type: Number, default: 0 },
        negativeCount: { type: Number, default: 0 },
        keyThemes: [{
            theme: String,
            themeAr: String,
            count: Number,
            sentiment: { type: String, enum: ['positive', 'neutral', 'negative'] },
            sampleQuotes: [String]
        }],
        topPositiveKeywords: [{ word: String, count: Number }],
        topNegativeKeywords: [{ word: String, count: Number }],
        wordCloud: [{ word: String, weight: Number }]
    },

    // ═══════════════════════════════════════════════════════════════
    // CATEGORY/DIMENSION SCORES
    // ═══════════════════════════════════════════════════════════════
    categoryScores: [{
        category: {
            type: String,
            enum: [
                'engagement', 'satisfaction', 'culture', 'leadership',
                'growth', 'compensation', 'work_life_balance', 'communication',
                'teamwork', 'recognition', 'diversity', 'safety',
                'onboarding', 'exit', 'custom'
            ]
        },
        categoryLabel: String,
        categoryLabelAr: String,
        totalQuestions: { type: Number, default: 0 },
        respondedQuestions: { type: Number, default: 0 },
        avgScore: { type: Number, default: 0 },
        medianScore: { type: Number, default: 0 },
        minScore: { type: Number, default: 0 },
        maxScore: { type: Number, default: 0 },
        stdDeviation: { type: Number, default: 0 },
        favorabilityRate: { type: Number, default: 0 },  // % of positive responses
        benchmarkDiff: { type: Number, default: 0 },     // Diff from industry benchmark
        previousScore: Number,
        trend: { type: String, enum: ['up', 'same', 'down'] }
    }],

    // ═══════════════════════════════════════════════════════════════
    // DEMOGRAPHIC BREAKDOWN
    // ═══════════════════════════════════════════════════════════════
    demographicAnalysis: {
        byDepartment: [{
            departmentId: mongoose.Schema.Types.ObjectId,
            departmentName: String,
            responseCount: Number,
            avgScore: Number,
            npsScore: Number,
            participationRate: Number
        }],
        byTenure: [{
            tenure: String,  // '<1 year', '1-3 years', '3-5 years', '5+ years'
            responseCount: Number,
            avgScore: Number,
            npsScore: Number
        }],
        byRole: [{
            role: String,
            responseCount: Number,
            avgScore: Number,
            npsScore: Number
        }],
        byLocation: [{
            location: String,
            responseCount: Number,
            avgScore: Number,
            npsScore: Number
        }]
    },

    // ═══════════════════════════════════════════════════════════════
    // BENCHMARKING
    // ═══════════════════════════════════════════════════════════════
    benchmarks: {
        industryBenchmark: Number,
        industryType: String,
        companyPreviousBenchmark: Number,
        companyPreviousPeriod: String,
        nationalBenchmark: Number,
        globalBenchmark: Number,
        comparisonDate: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // HISTORICAL COMPARISON
    // ═══════════════════════════════════════════════════════════════
    historicalData: [{
        period: String,
        surveyId: mongoose.Schema.Types.ObjectId,
        avgScore: Number,
        npsScore: Number,
        responseRate: Number,
        categoryScores: [{
            category: String,
            score: Number
        }]
    }],

    // ═══════════════════════════════════════════════════════════════
    // ACTION PLANS
    // ═══════════════════════════════════════════════════════════════
    actionPlans: [{
        actionId: String,
        title: String,
        titleAr: String,
        description: String,
        descriptionAr: String,
        category: String,
        priority: {
            type: String,
            enum: ['critical', 'high', 'medium', 'low'],
            default: 'medium'
        },
        status: {
            type: String,
            enum: ['planned', 'in_progress', 'completed', 'cancelled', 'deferred'],
            default: 'planned'
        },
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        assignedToName: String,
        dueDate: Date,
        completedDate: Date,
        relatedQuestionIds: [String],
        notes: String,
        impact: {
            type: String,
            enum: ['high', 'medium', 'low']
        },
        effort: {
            type: String,
            enum: ['high', 'medium', 'low']
        },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now }
    }],

    // Multi-tenant
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// SURVEY RESPONSE SCHEMA
// ═══════════════════════════════════════════════════════════════

const surveyResponseSchema = new mongoose.Schema({
    responseId: {
        type: String,
        unique: true,
        index: true
    },
    surveyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Survey',
        required: true,
        index: true
    },

    // Respondent (null if anonymous)
    respondentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        index: true
    },
    isAnonymous: { type: Boolean, default: false },

    // For non-anonymous, store demographic data
    respondentMetadata: {
        department: String,
        departmentId: mongoose.Schema.Types.ObjectId,
        role: String,
        tenure: String, // e.g., '<1 year', '1-3 years', '3-5 years', '5+ years'
        location: String
    },

    // Answers
    answers: [{
        questionId: { type: String, required: true },
        questionType: String,
        value: mongoose.Schema.Types.Mixed, // Depends on question type
        textResponse: String, // For text questions
        selectedOptions: [String], // For multiple choice/checkbox
        rating: Number, // For rating/NPS/scale
        ranking: [String], // For ranking questions
        matrixResponses: [{
            rowId: String,
            columnId: String,
            value: mongoose.Schema.Types.Mixed
        }],
        skipped: { type: Boolean, default: false },
        answeredAt: { type: Date, default: Date.now }
    }],

    // Status
    status: {
        type: String,
        enum: ['in_progress', 'completed', 'abandoned'],
        default: 'in_progress',
        index: true
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
    lastActivityAt: { type: Date, default: Date.now },
    timeSpentSeconds: { type: Number, default: 0 },

    // Scoring
    totalScore: Number,
    scorePercentage: Number,
    categoryScores: [{
        category: String,
        score: Number,
        maxScore: Number,
        percentage: Number
    }],

    // Sentiment analysis (for text responses)
    sentimentAnalysis: {
        overallSentiment: { type: String, enum: ['positive', 'neutral', 'negative'] },
        sentimentScore: Number, // -1 to 1
        keyThemes: [String]
    },

    // Multi-tenant
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    }
}, {
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

surveyTemplateSchema.index({ firmId: 1, surveyType: 1, isActive: 1 });
surveySchema.index({ firmId: 1, status: 1, surveyType: 1 });
surveySchema.index({ firmId: 1, startDate: 1, endDate: 1 });
surveyResponseSchema.index({ surveyId: 1, status: 1 });
surveyResponseSchema.index({ surveyId: 1, respondentId: 1 }, { unique: true, sparse: true });
surveyResponseSchema.index({ firmId: 1, respondentId: 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

surveyTemplateSchema.pre('save', async function(next) {
    if (this.isNew && !this.templateId) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { model: 'SurveyTemplate', firmId: this.firmId },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.templateId = `STPL-${String(counter.seq).padStart(4, '0')}`;
        } catch (error) {
            return next(error);
        }
    }
    next();
});

surveySchema.pre('save', async function(next) {
    if (this.isNew && !this.surveyId) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { model: 'Survey', firmId: this.firmId },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.surveyId = `SRV-${String(counter.seq).padStart(4, '0')}`;
        } catch (error) {
            return next(error);
        }
    }
    next();
});

surveyResponseSchema.pre('save', async function(next) {
    if (this.isNew && !this.responseId) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { model: 'SurveyResponse', firmId: this.firmId },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.responseId = `SRSP-${String(counter.seq).padStart(6, '0')}`;
        } catch (error) {
            return next(error);
        }
    }
    next();
});

// ═══════════════════════════════════════════════════════════════
// SURVEY INVITATION SCHEMA
// Track who was invited to complete surveys
// ═══════════════════════════════════════════════════════════════

const surveyInvitationSchema = new mongoose.Schema({
    surveyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Survey',
        required: true,
        index: true
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
        index: true
    },
    email: String,
    employeeName: String,
    department: String,
    departmentId: mongoose.Schema.Types.ObjectId,

    // Invitation tracking
    status: {
        type: String,
        enum: ['pending', 'sent', 'opened', 'started', 'completed', 'expired', 'opted_out'],
        default: 'pending',
        index: true
    },

    // Timing
    invitedAt: { type: Date, default: Date.now },
    sentAt: Date,
    openedAt: Date,
    startedAt: Date,
    completedAt: Date,

    // Reminders
    remindersSent: { type: Number, default: 0 },
    lastReminderAt: Date,
    nextReminderAt: Date,

    // Access token for anonymous surveys
    accessToken: {
        type: String,
        unique: true,
        sparse: true
    },
    tokenExpiresAt: Date,

    // Response reference
    responseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SurveyResponse'
    },

    // Opt-out tracking
    optedOutAt: Date,
    optOutReason: String,

    // Multi-tenant
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    }
}, {
    timestamps: true
});

surveyInvitationSchema.index({ surveyId: 1, employeeId: 1 }, { unique: true });
surveyInvitationSchema.index({ surveyId: 1, status: 1 });
surveyInvitationSchema.index({ accessToken: 1 });

// ═══════════════════════════════════════════════════════════════
// STATICS
// ═══════════════════════════════════════════════════════════════

surveySchema.statics.getActiveSurveys = function(firmId) {
    return this.find({
        firmId,
        status: 'active',
        startDate: { $lte: new Date() },
        $or: [
            { endDate: null },
            { endDate: { $gte: new Date() } }
        ]
    }).sort({ startDate: -1 });
};

surveyResponseSchema.statics.calculateSurveyStats = async function(surveyId) {
    const responses = await this.find({ surveyId });

    const totalResponses = responses.length;
    const completedResponses = responses.filter(r => r.status === 'completed').length;
    const partialResponses = responses.filter(r => r.status === 'in_progress').length;
    const abandonedResponses = responses.filter(r => r.status === 'abandoned').length;

    const completedWithScores = responses.filter(r => r.status === 'completed' && r.scorePercentage != null);
    const avgScore = completedWithScores.length > 0
        ? completedWithScores.reduce((sum, r) => sum + r.scorePercentage, 0) / completedWithScores.length
        : 0;

    // Calculate median score
    let medianScore = 0;
    if (completedWithScores.length > 0) {
        const sorted = completedWithScores.map(r => r.scorePercentage).sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        medianScore = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    // Calculate average time spent
    const avgTimeSpentSeconds = completedResponses > 0
        ? responses.filter(r => r.status === 'completed' && r.timeSpentSeconds)
            .reduce((sum, r) => sum + r.timeSpentSeconds, 0) / completedResponses
        : 0;

    return {
        totalResponses,
        completedResponses,
        partialResponses,
        abandonedResponses,
        avgScore: parseFloat(avgScore.toFixed(1)),
        medianScore: parseFloat(medianScore.toFixed(1)),
        avgTimeSpentSeconds: Math.round(avgTimeSpentSeconds)
    };
};

/**
 * Calculate NPS (Net Promoter Score) for a survey
 * NPS = % Promoters - % Detractors
 * Scale: -100 to +100
 */
surveyResponseSchema.statics.calculateNPS = async function(surveyId, npsQuestionId = null) {
    const responses = await this.find({
        surveyId,
        status: 'completed'
    });

    let npsRatings = [];

    responses.forEach(response => {
        response.answers.forEach(answer => {
            // Find NPS questions (type 'nps' or specific questionId)
            if (answer.questionType === 'nps' || answer.questionId === npsQuestionId) {
                if (answer.rating !== null && answer.rating !== undefined) {
                    npsRatings.push(answer.rating);
                }
            }
        });
    });

    if (npsRatings.length === 0) {
        return {
            npsScore: null,
            promoters: 0,
            passives: 0,
            detractors: 0,
            totalResponses: 0,
            promoterPercentage: 0,
            passivePercentage: 0,
            detractorPercentage: 0
        };
    }

    // NPS categorization (0-10 scale)
    // Promoters: 9-10
    // Passives: 7-8
    // Detractors: 0-6
    const promoters = npsRatings.filter(r => r >= 9).length;
    const passives = npsRatings.filter(r => r >= 7 && r <= 8).length;
    const detractors = npsRatings.filter(r => r <= 6).length;
    const total = npsRatings.length;

    const promoterPercentage = parseFloat(((promoters / total) * 100).toFixed(1));
    const passivePercentage = parseFloat(((passives / total) * 100).toFixed(1));
    const detractorPercentage = parseFloat(((detractors / total) * 100).toFixed(1));

    // NPS Score = % Promoters - % Detractors
    const npsScore = Math.round(promoterPercentage - detractorPercentage);

    return {
        npsScore,
        promoters,
        passives,
        detractors,
        totalResponses: total,
        promoterPercentage,
        passivePercentage,
        detractorPercentage
    };
};

/**
 * Calculate category scores for a survey
 */
surveyResponseSchema.statics.calculateCategoryScores = async function(surveyId, questions) {
    const responses = await this.find({
        surveyId,
        status: 'completed'
    });

    // Group questions by category
    const questionsByCategory = {};
    questions.forEach(q => {
        const category = q.category || 'custom';
        if (!questionsByCategory[category]) {
            questionsByCategory[category] = [];
        }
        questionsByCategory[category].push(q);
    });

    const categoryScores = [];

    for (const [category, categoryQuestions] of Object.entries(questionsByCategory)) {
        const questionIds = categoryQuestions.map(q => q.questionId);
        const scores = [];

        responses.forEach(response => {
            response.answers.forEach(answer => {
                if (questionIds.includes(answer.questionId) && answer.rating != null) {
                    scores.push(answer.rating);
                }
            });
        });

        if (scores.length > 0) {
            const sorted = [...scores].sort((a, b) => a - b);
            const sum = scores.reduce((a, b) => a + b, 0);
            const avg = sum / scores.length;
            const mid = Math.floor(sorted.length / 2);
            const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

            // Calculate standard deviation
            const squareDiffs = scores.map(score => Math.pow(score - avg, 2));
            const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / scores.length;
            const stdDeviation = Math.sqrt(avgSquareDiff);

            // Calculate favorability (assuming 5-point scale, 4-5 is favorable)
            const favorable = scores.filter(s => s >= 4).length;
            const favorabilityRate = parseFloat(((favorable / scores.length) * 100).toFixed(1));

            categoryScores.push({
                category,
                totalQuestions: categoryQuestions.length,
                respondedQuestions: scores.length,
                avgScore: parseFloat(avg.toFixed(2)),
                medianScore: parseFloat(median.toFixed(2)),
                minScore: Math.min(...scores),
                maxScore: Math.max(...scores),
                stdDeviation: parseFloat(stdDeviation.toFixed(2)),
                favorabilityRate
            });
        }
    }

    return categoryScores;
};

/**
 * Get demographic breakdown for a survey
 */
surveyResponseSchema.statics.getDemographicAnalysis = async function(surveyId) {
    const responses = await this.find({
        surveyId,
        status: 'completed'
    });

    const byDepartment = {};
    const byTenure = {};
    const byRole = {};
    const byLocation = {};

    responses.forEach(response => {
        const meta = response.respondentMetadata || {};

        // By Department
        if (meta.department) {
            if (!byDepartment[meta.department]) {
                byDepartment[meta.department] = { scores: [], departmentId: meta.departmentId };
            }
            if (response.scorePercentage != null) {
                byDepartment[meta.department].scores.push(response.scorePercentage);
            }
        }

        // By Tenure
        if (meta.tenure) {
            if (!byTenure[meta.tenure]) {
                byTenure[meta.tenure] = { scores: [] };
            }
            if (response.scorePercentage != null) {
                byTenure[meta.tenure].scores.push(response.scorePercentage);
            }
        }

        // By Role
        if (meta.role) {
            if (!byRole[meta.role]) {
                byRole[meta.role] = { scores: [] };
            }
            if (response.scorePercentage != null) {
                byRole[meta.role].scores.push(response.scorePercentage);
            }
        }

        // By Location
        if (meta.location) {
            if (!byLocation[meta.location]) {
                byLocation[meta.location] = { scores: [] };
            }
            if (response.scorePercentage != null) {
                byLocation[meta.location].scores.push(response.scorePercentage);
            }
        }
    });

    const calculateGroupStats = (groupData) => {
        return Object.entries(groupData).map(([key, data]) => ({
            name: key,
            departmentId: data.departmentId,
            responseCount: data.scores.length,
            avgScore: data.scores.length > 0
                ? parseFloat((data.scores.reduce((a, b) => a + b, 0) / data.scores.length).toFixed(1))
                : 0
        }));
    };

    return {
        byDepartment: calculateGroupStats(byDepartment).map(d => ({
            departmentId: d.departmentId,
            departmentName: d.name,
            responseCount: d.responseCount,
            avgScore: d.avgScore
        })),
        byTenure: calculateGroupStats(byTenure).map(t => ({
            tenure: t.name,
            responseCount: t.responseCount,
            avgScore: t.avgScore
        })),
        byRole: calculateGroupStats(byRole).map(r => ({
            role: r.name,
            responseCount: r.responseCount,
            avgScore: r.avgScore
        })),
        byLocation: calculateGroupStats(byLocation).map(l => ({
            location: l.name,
            responseCount: l.responseCount,
            avgScore: l.avgScore
        }))
    };
};

/**
 * Simple sentiment analysis for text responses
 * Returns aggregated sentiment data
 */
surveyResponseSchema.statics.analyzeSentiment = async function(surveyId) {
    const responses = await this.find({
        surveyId,
        status: 'completed'
    });

    // Positive and negative word lists (simplified)
    const positiveWords = [
        'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'best',
        'happy', 'satisfied', 'helpful', 'supportive', 'appreciate', 'thank', 'positive',
        'enjoy', 'improvement', 'growth', 'opportunity', 'flexible', 'collaborative'
    ];
    const negativeWords = [
        'bad', 'poor', 'terrible', 'awful', 'horrible', 'hate', 'worst', 'disappointed',
        'unhappy', 'frustrated', 'stress', 'difficult', 'problem', 'issue', 'concern',
        'negative', 'lack', 'insufficient', 'unfair', 'overworked', 'burnout'
    ];

    let totalTextResponses = 0;
    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;
    const wordFrequency = {};
    const allTextResponses = [];

    responses.forEach(response => {
        response.answers.forEach(answer => {
            if (answer.textResponse && answer.textResponse.trim()) {
                totalTextResponses++;
                const text = answer.textResponse.toLowerCase();
                allTextResponses.push(text);

                // Count word frequencies
                const words = text.split(/\s+/);
                words.forEach(word => {
                    const cleanWord = word.replace(/[^\w]/g, '');
                    if (cleanWord.length > 3) {
                        wordFrequency[cleanWord] = (wordFrequency[cleanWord] || 0) + 1;
                    }
                });

                // Simple sentiment classification
                const positiveMatches = positiveWords.filter(w => text.includes(w)).length;
                const negativeMatches = negativeWords.filter(w => text.includes(w)).length;

                if (positiveMatches > negativeMatches) {
                    positiveCount++;
                } else if (negativeMatches > positiveMatches) {
                    negativeCount++;
                } else {
                    neutralCount++;
                }
            }
        });
    });

    // Calculate sentiment score (-1 to 1)
    const sentimentScore = totalTextResponses > 0
        ? parseFloat(((positiveCount - negativeCount) / totalTextResponses).toFixed(2))
        : 0;

    // Determine overall sentiment
    let overallSentiment = 'neutral';
    if (sentimentScore >= 0.5) overallSentiment = 'very_positive';
    else if (sentimentScore >= 0.2) overallSentiment = 'positive';
    else if (sentimentScore <= -0.5) overallSentiment = 'very_negative';
    else if (sentimentScore <= -0.2) overallSentiment = 'negative';

    // Get top keywords for word cloud
    const sortedWords = Object.entries(wordFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)
        .map(([word, count]) => ({ word, weight: count }));

    // Identify positive and negative keywords
    const topPositiveKeywords = sortedWords
        .filter(w => positiveWords.includes(w.word))
        .slice(0, 10);
    const topNegativeKeywords = sortedWords
        .filter(w => negativeWords.includes(w.word))
        .slice(0, 10);

    return {
        overallSentiment,
        sentimentScore,
        totalTextResponses,
        analyzedResponses: totalTextResponses,
        positiveCount,
        neutralCount,
        negativeCount,
        wordCloud: sortedWords,
        topPositiveKeywords,
        topNegativeKeywords
    };
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

const SurveyTemplate = mongoose.model('SurveyTemplate', surveyTemplateSchema);
const Survey = mongoose.model('Survey', surveySchema);
const SurveyResponse = mongoose.model('SurveyResponse', surveyResponseSchema);
const SurveyInvitation = mongoose.model('SurveyInvitation', surveyInvitationSchema);

module.exports = { SurveyTemplate, Survey, SurveyResponse, SurveyInvitation };
