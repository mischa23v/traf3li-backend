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
        responseRate: { type: Number, default: 0 },
        avgScore: { type: Number, default: 0 },
        npsScore: { type: Number, default: null },
        lastResponseAt: Date
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

    const avgScore = completedResponses > 0
        ? responses.filter(r => r.status === 'completed' && r.scorePercentage != null)
            .reduce((sum, r) => sum + r.scorePercentage, 0) / completedResponses
        : 0;

    return {
        totalResponses,
        completedResponses,
        partialResponses,
        avgScore: parseFloat(avgScore.toFixed(1))
    };
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

const SurveyTemplate = mongoose.model('SurveyTemplate', surveyTemplateSchema);
const Survey = mongoose.model('Survey', surveySchema);
const SurveyResponse = mongoose.model('SurveyResponse', surveyResponseSchema);

module.exports = { SurveyTemplate, Survey, SurveyResponse };
