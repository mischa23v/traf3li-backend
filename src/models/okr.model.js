/**
 * OKR (Objectives & Key Results) Model
 *
 * Enterprise goal management inspired by:
 * - Google OKR methodology
 * - Workday Goals
 * - Lattice OKRs
 * - 15Five
 *
 * Features:
 * - Cascading objectives (company → team → individual)
 * - Key results with measurable targets
 * - Progress tracking
 * - Check-ins and updates
 * - Alignment visualization
 */

const mongoose = require('mongoose');
const Counter = require('./counter.model');

// ═══════════════════════════════════════════════════════════════
// KEY RESULT SCHEMA
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// GOOGLE-STYLE SCORING REFERENCE
// ═══════════════════════════════════════════════════════════════
// 0.0 - 0.3: Failed to make real progress (Red)
// 0.4 - 0.6: Made progress but fell short (Yellow)
// 0.7 - 1.0: Delivered (Green)
//
// Committed OKRs: Target score = 1.0 (100% completion expected)
// Aspirational OKRs: Target score = 0.7 (70% completion is success)
// ═══════════════════════════════════════════════════════════════

const keyResultSchema = new mongoose.Schema({
    keyResultId: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    titleAr: String,
    description: String,
    descriptionAr: String,

    // Measurement
    metricType: {
        type: String,
        enum: [
            'percentage',    // 0-100%
            'number',        // Numeric target
            'currency',      // Money value
            'boolean',       // Yes/No completion
            'milestone'      // Milestone-based
        ],
        default: 'percentage'
    },
    targetValue: { type: Number, required: true },
    currentValue: { type: Number, default: 0 },
    startValue: { type: Number, default: 0 },
    unit: String, // e.g., 'SAR', 'users', 'deals', '%'

    // Google-style Score (0.0 to 1.0)
    score: {
        type: Number,
        default: 0,
        min: 0,
        max: 1
    },
    // Score grade for visualization
    scoreGrade: {
        type: String,
        enum: ['red', 'yellow', 'green'],
        default: 'red'
    },

    // Progress (0-100%)
    progress: { type: Number, default: 0, min: 0, max: 100 },
    status: {
        type: String,
        enum: ['not_started', 'on_track', 'at_risk', 'behind', 'completed', 'cancelled'],
        default: 'not_started'
    },

    // Confidence Rating (0.0 to 1.0)
    // How confident are you that you will achieve this KR?
    confidence: {
        type: Number,
        default: 0.5,
        min: 0,
        max: 1
    },
    confidenceHistory: [{
        date: { type: Date, default: Date.now },
        confidence: Number,
        notes: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],

    // Weight for scoring
    weight: { type: Number, default: 1, min: 0.1, max: 10 },

    // Owner
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    ownerName: String,
    ownerNameAr: String,

    // Updates history
    updates: [{
        date: { type: Date, default: Date.now },
        previousValue: Number,
        newValue: Number,
        previousScore: Number,
        newScore: Number,
        note: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],

    // Milestones (for milestone-based KRs)
    milestones: [{
        milestoneId: String,
        title: String,
        titleAr: String,
        dueDate: Date,
        completed: { type: Boolean, default: false },
        completedAt: Date,
        weight: { type: Number, default: 1 }
    }],

    // Dates
    dueDate: Date,
    completedDate: Date
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// CFR SCHEMA (Conversations, Feedback, Recognition)
// Google's continuous performance management framework
// ═══════════════════════════════════════════════════════════════

const cfrSchema = new mongoose.Schema({
    cfrId: String,
    type: {
        type: String,
        enum: ['conversation', 'feedback', 'recognition'],
        required: true
    },

    // For conversations/1:1s
    conversationDetails: {
        topic: String,
        topicAr: String,
        scheduledDate: Date,
        actualDate: Date,
        duration: Number, // minutes
        agenda: [String],
        keyDiscussions: String,
        actionItems: [{
            item: String,
            owner: String,
            dueDate: Date,
            completed: Boolean
        }],
        nextMeetingDate: Date
    },

    // For feedback (both directions)
    feedbackDetails: {
        feedbackType: {
            type: String,
            enum: ['positive', 'constructive', 'developmental', 'recognition']
        },
        feedbackDirection: {
            type: String,
            enum: ['manager_to_employee', 'employee_to_manager', 'peer_to_peer']
        },
        content: String,
        contentAr: String,
        relatedKeyResultId: String,
        relatedCompetency: String,
        isPrivate: { type: Boolean, default: false }
    },

    // For recognition
    recognitionDetails: {
        recognitionType: {
            type: String,
            enum: ['kudos', 'achievement', 'milestone', 'values', 'teamwork', 'innovation', 'customer_focus']
        },
        message: String,
        messageAr: String,
        companyValue: String, // Which company value this aligns with
        isPublic: { type: Boolean, default: true },
        likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        likeCount: { type: Number, default: 0 }
    },

    // Common fields
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fromUserName: String,
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    toUserName: String,

    date: { type: Date, default: Date.now },
    visibility: {
        type: String,
        enum: ['private', 'team', 'department', 'company'],
        default: 'private'
    }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// OKR SCHEMA
// ═══════════════════════════════════════════════════════════════

const okrSchema = new mongoose.Schema({
    okrId: {
        type: String,
        unique: true,
        index: true
    },

    // Objective details
    title: {
        type: String,
        required: [true, 'Objective title is required'],
        trim: true
    },
    titleAr: String,
    description: String,
    descriptionAr: String,

    // Level/Scope
    level: {
        type: String,
        enum: ['company', 'department', 'team', 'individual'],
        required: true,
        index: true
    },

    // Period
    period: {
        type: String,
        enum: ['annual', 'semi_annual', 'quarterly', 'monthly', 'custom'],
        required: true
    },
    periodYear: { type: Number, required: true, index: true },
    periodQuarter: { type: Number, min: 1, max: 4 }, // For quarterly OKRs
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    // Alignment (parent OKR for cascading)
    parentOkrId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OKR',
        index: true
    },
    childOkrIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OKR'
    }],

    // Key Results
    keyResults: [keyResultSchema],

    // Owner
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        index: true
    },
    ownerName: String,
    ownerNameAr: String,
    ownerType: {
        type: String,
        enum: ['individual', 'team', 'department', 'company']
    },

    // For team/department OKRs
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },

    // ═══════════════════════════════════════════════════════════════
    // GOOGLE-STYLE OKR TYPE
    // ═══════════════════════════════════════════════════════════════
    okrType: {
        type: String,
        enum: [
            'committed',     // Must achieve 100% - tied to business commitments
            'aspirational',  // Stretch goals - 70% achievement is success
            'learning'       // Experimental - process of learning matters
        ],
        default: 'committed',
        index: true
    },

    // Target score based on OKR type
    targetScore: {
        type: Number,
        default: 1.0,  // Committed = 1.0, Aspirational = 0.7, Learning = varies
        min: 0,
        max: 1
    },

    // Status & Progress
    status: {
        type: String,
        enum: ['draft', 'active', 'on_track', 'at_risk', 'behind', 'completed', 'cancelled', 'deferred'],
        default: 'draft',
        index: true
    },
    overallProgress: { type: Number, default: 0, min: 0, max: 100 },

    // Google-style Score (0.0 to 1.0)
    overallScore: { type: Number, min: 0, max: 1, default: 0 },
    scoreGrade: {
        type: String,
        enum: ['red', 'yellow', 'green'],
        default: 'red'
    },
    scoreLabel: String,  // 'Needs Attention', 'Making Progress', 'On Track'
    scoreLabelAr: String,

    // Average team confidence
    avgConfidence: { type: Number, min: 0, max: 1, default: 0.5 },

    // ═══════════════════════════════════════════════════════════════
    // WEEKLY CHECK-INS (Google PPP Format: Progress, Plans, Problems)
    // ═══════════════════════════════════════════════════════════════
    checkIns: [{
        checkInId: String,
        weekNumber: Number,
        weekStartDate: Date,
        date: { type: Date, default: Date.now },

        // Current status
        overallProgress: Number,
        overallScore: Number,
        status: String,
        confidence: { type: Number, min: 0, max: 1 },

        // PPP Format
        progress: {  // What did we accomplish?
            summary: String,
            summaryAr: String,
            accomplishments: [String],
            accomplishmentsAr: [String]
        },
        plans: {  // What will we do next?
            summary: String,
            summaryAr: String,
            nextActions: [String],
            nextActionsAr: [String]
        },
        problems: {  // What's blocking us?
            summary: String,
            summaryAr: String,
            blockers: [{
                blocker: String,
                blockerAr: String,
                severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
                needsEscalation: Boolean
            }],
            risksIdentified: [String]
        },

        // Key Result specific updates
        keyResultUpdates: [{
            keyResultId: String,
            previousValue: Number,
            newValue: Number,
            previousScore: Number,
            newScore: Number,
            confidence: Number,
            note: String
        }],

        // Mood/sentiment check (optional)
        teamMood: {
            type: String,
            enum: ['very_positive', 'positive', 'neutral', 'concerned', 'struggling']
        },
        moodNote: String,

        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdByName: String
    }],

    // ═══════════════════════════════════════════════════════════════
    // CFRs (Conversations, Feedback, Recognition)
    // ═══════════════════════════════════════════════════════════════
    cfrs: [cfrSchema],

    // CFR Summary stats
    cfrStats: {
        totalConversations: { type: Number, default: 0 },
        totalFeedback: { type: Number, default: 0 },
        totalRecognitions: { type: Number, default: 0 },
        lastConversationDate: Date,
        lastFeedbackDate: Date,
        lastRecognitionDate: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // SCORING HISTORY (Track score changes over time)
    // ═══════════════════════════════════════════════════════════════
    scoreHistory: [{
        date: { type: Date, default: Date.now },
        score: Number,
        grade: String,
        weekNumber: Number,
        confidence: Number,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],

    // ═══════════════════════════════════════════════════════════════
    // GRADING AT PERIOD END
    // ═══════════════════════════════════════════════════════════════
    finalGrade: {
        score: { type: Number, min: 0, max: 1 },
        grade: { type: String, enum: ['red', 'yellow', 'green'] },
        achievementStatus: {
            type: String,
            enum: ['exceeded', 'achieved', 'partially_achieved', 'not_achieved', 'cancelled']
        },
        gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        gradedAt: Date,
        retrospectiveNotes: String,
        retrospectiveNotesAr: String,
        lessonsLearned: [String],
        carriedForward: Boolean,
        nextPeriodOkrId: { type: mongoose.Schema.Types.ObjectId, ref: 'OKR' }
    },

    // Visibility
    visibility: {
        type: String,
        enum: ['public', 'department', 'team', 'private'],
        default: 'public'
    },

    // Tags and Categories
    tags: [String],
    category: {
        type: String,
        enum: ['growth', 'efficiency', 'quality', 'innovation', 'customer', 'people', 'financial', 'operational', 'strategic', 'learning'],
        index: true
    },
    categoryLabel: String,
    categoryLabelAr: String,

    // Strategic priority
    priority: {
        type: String,
        enum: ['critical', 'high', 'medium', 'low'],
        default: 'medium'
    },

    // Cross-functional dependencies
    dependencies: [{
        okrId: { type: mongoose.Schema.Types.ObjectId, ref: 'OKR' },
        okrTitle: String,
        dependencyType: { type: String, enum: ['blocks', 'blocked_by', 'related'] },
        notes: String
    }],

    // Contributors (for team OKRs)
    contributors: [{
        employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        employeeName: String,
        role: { type: String, enum: ['owner', 'contributor', 'supporter', 'informed'] },
        addedAt: { type: Date, default: Date.now }
    }]

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
// 9-BOX GRID ASSESSMENT SCHEMA
// ═══════════════════════════════════════════════════════════════

const nineBoxSchema = new mongoose.Schema({
    assessmentId: {
        type: String,
        unique: true,
        index: true
    },

    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
        index: true
    },
    employeeName: String,
    employeeNameAr: String,
    employeeNumber: String,

    // Assessment period
    periodYear: { type: Number, required: true, index: true },
    periodType: {
        type: String,
        enum: ['annual', 'semi_annual', 'quarterly'],
        default: 'annual'
    },
    periodQuarter: Number,

    // Performance Rating (X-axis: 1-3)
    performanceRating: {
        type: Number,
        required: true,
        min: 1,
        max: 3,
        enum: [1, 2, 3] // 1=Low, 2=Medium, 3=High
    },
    performanceLabel: {
        type: String,
        enum: ['low', 'moderate', 'high']
    },
    performanceNotes: String,
    performanceNotesAr: String,

    // Potential Rating (Y-axis: 1-3)
    potentialRating: {
        type: Number,
        required: true,
        min: 1,
        max: 3,
        enum: [1, 2, 3] // 1=Low, 2=Medium, 3=High
    },
    potentialLabel: {
        type: String,
        enum: ['low', 'moderate', 'high']
    },
    potentialNotes: String,
    potentialNotesAr: String,

    // 9-Box Position (calculated from performance x potential)
    boxPosition: {
        type: Number,
        min: 1,
        max: 9,
        index: true
    },
    boxLabel: {
        type: String,
        enum: [
            'bad_hire',           // Box 1: Low Performance, Low Potential
            'grinder',            // Box 2: Low Performance, Moderate Potential
            'dilemma',            // Box 3: Low Performance, High Potential
            'up_or_out',          // Box 4: Moderate Performance, Low Potential
            'core_player',        // Box 5: Moderate Performance, Moderate Potential
            'high_potential',     // Box 6: Moderate Performance, High Potential
            'solid_performer',    // Box 7: High Performance, Low Potential
            'high_performer',     // Box 8: High Performance, Moderate Potential
            'star'                // Box 9: High Performance, High Potential
        ]
    },
    boxLabelAr: String,

    // Action plan based on box position
    recommendedActions: [{
        action: String,
        actionAr: String,
        priority: { type: String, enum: ['high', 'medium', 'low'] },
        dueDate: Date,
        status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' }
    }],

    // Supporting data
    performanceReviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'PerformanceReview' },
    recentOkrScore: Number, // From OKR completion
    skillAssessmentScore: Number,

    // Succession planning flags
    isSuccessionCandidate: { type: Boolean, default: false },
    targetRoles: [String],
    readinessLevel: {
        type: String,
        enum: ['ready_now', 'ready_1_year', 'ready_2_years', 'ready_3_plus_years']
    },

    // Risk assessment
    flightRisk: {
        type: String,
        enum: ['low', 'medium', 'high']
    },
    retentionPriority: {
        type: String,
        enum: ['critical', 'high', 'medium', 'low']
    },

    // Assessor
    assessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assessedDate: { type: Date, default: Date.now },

    // Review/calibration
    calibrated: { type: Boolean, default: false },
    calibratedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    calibratedDate: Date,
    calibrationNotes: String,

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

okrSchema.index({ firmId: 1, periodYear: 1, status: 1 });
okrSchema.index({ firmId: 1, ownerId: 1, periodYear: 1 });
okrSchema.index({ firmId: 1, level: 1, periodYear: 1 });
okrSchema.index({ firmId: 1, departmentId: 1, periodYear: 1 });

nineBoxSchema.index({ firmId: 1, periodYear: 1, boxPosition: 1 });
nineBoxSchema.index({ firmId: 1, employeeId: 1, periodYear: 1 }, { unique: true });
nineBoxSchema.index({ firmId: 1, isSuccessionCandidate: 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

okrSchema.pre('save', async function(next) {
    if (this.isNew && !this.okrId) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { model: 'OKR', firmId: this.firmId },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.okrId = `OKR-${String(counter.seq).padStart(4, '0')}`;
        } catch (error) {
            return next(error);
        }
    }

    // Set target score based on OKR type
    if (this.isNew || this.isModified('okrType')) {
        switch (this.okrType) {
            case 'committed':
                this.targetScore = 1.0;  // Must achieve 100%
                break;
            case 'aspirational':
                this.targetScore = 0.7;  // 70% is success for stretch goals
                break;
            case 'learning':
                this.targetScore = 0.5;  // Focus on learning, 50% is acceptable
                break;
            default:
                this.targetScore = 1.0;
        }
    }

    // Calculate scores for each key result
    if (this.keyResults && this.keyResults.length > 0) {
        this.keyResults.forEach(kr => {
            // Calculate score based on progress toward target
            if (kr.targetValue && kr.targetValue !== 0) {
                const range = kr.targetValue - (kr.startValue || 0);
                const achieved = (kr.currentValue || 0) - (kr.startValue || 0);
                kr.score = range > 0 ? Math.min(1, Math.max(0, parseFloat((achieved / range).toFixed(2)))) : 0;
            } else if (kr.metricType === 'boolean') {
                kr.score = kr.currentValue >= 1 ? 1.0 : 0.0;
            } else if (kr.metricType === 'milestone' && kr.milestones && kr.milestones.length > 0) {
                // Calculate milestone completion
                const totalWeight = kr.milestones.reduce((sum, m) => sum + (m.weight || 1), 0);
                const completedWeight = kr.milestones
                    .filter(m => m.completed)
                    .reduce((sum, m) => sum + (m.weight || 1), 0);
                kr.score = totalWeight > 0 ? parseFloat((completedWeight / totalWeight).toFixed(2)) : 0;
            }

            // Set progress (0-100%)
            kr.progress = Math.round((kr.score || 0) * 100);

            // Set Google-style score grade (Red/Yellow/Green)
            if (kr.score >= 0.7) {
                kr.scoreGrade = 'green';
            } else if (kr.score >= 0.4) {
                kr.scoreGrade = 'yellow';
            } else {
                kr.scoreGrade = 'red';
            }

            // Update status based on score and confidence
            if (kr.score >= 1.0) {
                kr.status = 'completed';
            } else if (kr.score >= 0.7 || (kr.confidence && kr.confidence >= 0.7)) {
                kr.status = 'on_track';
            } else if (kr.score >= 0.4 || (kr.confidence && kr.confidence >= 0.4)) {
                kr.status = 'at_risk';
            } else if (kr.score > 0) {
                kr.status = 'behind';
            } else {
                kr.status = 'not_started';
            }
        });

        // Calculate overall score (weighted average of KR scores)
        const totalWeight = this.keyResults.reduce((sum, kr) => sum + (kr.weight || 1), 0);
        const weightedScore = this.keyResults.reduce((sum, kr) => {
            return sum + ((kr.score || 0) * (kr.weight || 1));
        }, 0);
        this.overallScore = totalWeight > 0 ? parseFloat((weightedScore / totalWeight).toFixed(2)) : 0;
        this.overallProgress = Math.round(this.overallScore * 100);

        // Calculate average confidence
        const confidences = this.keyResults.filter(kr => kr.confidence != null).map(kr => kr.confidence);
        this.avgConfidence = confidences.length > 0
            ? parseFloat((confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(2))
            : 0.5;

        // Set overall score grade
        if (this.overallScore >= 0.7) {
            this.scoreGrade = 'green';
            this.scoreLabel = 'On Track';
            this.scoreLabelAr = 'على المسار الصحيح';
        } else if (this.overallScore >= 0.4) {
            this.scoreGrade = 'yellow';
            this.scoreLabel = 'Making Progress';
            this.scoreLabelAr = 'يحرز تقدماً';
        } else {
            this.scoreGrade = 'red';
            this.scoreLabel = 'Needs Attention';
            this.scoreLabelAr = 'يحتاج اهتمام';
        }

        // Update status based on score and dates
        if (this.status !== 'draft' && this.status !== 'cancelled' && this.status !== 'deferred') {
            const now = new Date();
            const totalDays = (this.endDate - this.startDate) / (1000 * 60 * 60 * 24);
            const daysElapsed = Math.max(0, (now - this.startDate) / (1000 * 60 * 60 * 24));
            const expectedProgress = totalDays > 0 ? Math.min(1, daysElapsed / totalDays) : 0;

            // Evaluate based on both score and expected progress
            if (this.overallScore >= 1.0) {
                this.status = 'completed';
            } else if (this.overallScore >= expectedProgress - 0.1 || this.avgConfidence >= 0.7) {
                this.status = 'on_track';
            } else if (this.overallScore >= expectedProgress - 0.25 || this.avgConfidence >= 0.4) {
                this.status = 'at_risk';
            } else {
                this.status = 'behind';
            }

            // For aspirational OKRs, be more lenient with status
            if (this.okrType === 'aspirational' && this.overallScore >= 0.5) {
                if (this.status === 'behind') this.status = 'at_risk';
                if (this.status === 'at_risk' && this.overallScore >= 0.6) this.status = 'on_track';
            }
        }
    }

    // Update CFR stats
    if (this.cfrs && this.cfrs.length > 0) {
        this.cfrStats.totalConversations = this.cfrs.filter(c => c.type === 'conversation').length;
        this.cfrStats.totalFeedback = this.cfrs.filter(c => c.type === 'feedback').length;
        this.cfrStats.totalRecognitions = this.cfrs.filter(c => c.type === 'recognition').length;

        const conversations = this.cfrs.filter(c => c.type === 'conversation');
        const feedback = this.cfrs.filter(c => c.type === 'feedback');
        const recognitions = this.cfrs.filter(c => c.type === 'recognition');

        if (conversations.length > 0) {
            this.cfrStats.lastConversationDate = conversations[conversations.length - 1].date;
        }
        if (feedback.length > 0) {
            this.cfrStats.lastFeedbackDate = feedback[feedback.length - 1].date;
        }
        if (recognitions.length > 0) {
            this.cfrStats.lastRecognitionDate = recognitions[recognitions.length - 1].date;
        }
    }

    next();
});

nineBoxSchema.pre('save', async function(next) {
    if (this.isNew && !this.assessmentId) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { model: 'NineBox', firmId: this.firmId },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.assessmentId = `9BOX-${String(counter.seq).padStart(4, '0')}`;
        } catch (error) {
            return next(error);
        }
    }

    // Calculate box position from performance and potential ratings
    // Box mapping: (performance - 1) * 3 + potential
    // This gives: Box 1 (1,1), Box 2 (1,2), Box 3 (1,3), Box 4 (2,1), etc.
    this.boxPosition = (this.performanceRating - 1) * 3 + this.potentialRating;

    // Set labels
    const performanceLabels = { 1: 'low', 2: 'moderate', 3: 'high' };
    const potentialLabels = { 1: 'low', 2: 'moderate', 3: 'high' };

    this.performanceLabel = performanceLabels[this.performanceRating];
    this.potentialLabel = potentialLabels[this.potentialRating];

    // Set box label
    const boxLabels = {
        1: 'bad_hire',
        2: 'grinder',
        3: 'dilemma',
        4: 'up_or_out',
        5: 'core_player',
        6: 'high_potential',
        7: 'solid_performer',
        8: 'high_performer',
        9: 'star'
    };

    const boxLabelsAr = {
        1: 'توظيف خاطئ',
        2: 'مجتهد',
        3: 'معضلة',
        4: 'ترقية أو إنهاء',
        5: 'لاعب أساسي',
        6: 'إمكانات عالية',
        7: 'أداء ثابت',
        8: 'أداء عالي',
        9: 'نجم'
    };

    this.boxLabel = boxLabels[this.boxPosition];
    this.boxLabelAr = boxLabelsAr[this.boxPosition];

    // Auto-set succession candidate for top performers
    if (this.boxPosition >= 6) {
        this.isSuccessionCandidate = true;
    }

    // Auto-set retention priority
    if (this.boxPosition === 9) {
        this.retentionPriority = 'critical';
    } else if (this.boxPosition >= 7) {
        this.retentionPriority = 'high';
    } else if (this.boxPosition >= 5) {
        this.retentionPriority = 'medium';
    } else {
        this.retentionPriority = 'low';
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATICS
// ═══════════════════════════════════════════════════════════════

okrSchema.statics.getActiveOKRs = function(firmId, periodYear) {
    return this.find({
        firmId,
        periodYear,
        status: { $in: ['active', 'on_track', 'at_risk', 'behind'] }
    }).sort({ level: 1, createdAt: -1 });
};

okrSchema.statics.getOKRTree = async function(firmId, periodYear) {
    // Get company-level OKRs first
    const companyOKRs = await this.find({
        firmId,
        periodYear,
        level: 'company'
    }).lean();

    // Recursively build tree
    const buildTree = async (parentId) => {
        const children = await this.find({
            firmId,
            periodYear,
            parentOkrId: parentId
        }).lean();

        for (const child of children) {
            child.children = await buildTree(child._id);
        }

        return children;
    };

    for (const okr of companyOKRs) {
        okr.children = await buildTree(okr._id);
    }

    return companyOKRs;
};

nineBoxSchema.statics.getDistribution = async function(firmId, periodYear) {
    return this.aggregate([
        { $match: { firmId: new mongoose.Types.ObjectId(firmId), periodYear } },
        {
            $group: {
                _id: '$boxPosition',
                count: { $sum: 1 },
                employees: {
                    $push: {
                        employeeId: '$employeeId',
                        employeeName: '$employeeName',
                        employeeNameAr: '$employeeNameAr'
                    }
                }
            }
        },
        { $sort: { _id: 1 } }
    ]);
};

/**
 * Get recommended development actions based on box position
 * Following HR best practices for each 9-box category
 */
nineBoxSchema.statics.getDevelopmentRecommendations = function(boxPosition) {
    const recommendations = {
        1: { // Bad Hire - Low Performance, Low Potential
            label: 'Bad Hire',
            labelAr: 'توظيف خاطئ',
            strategy: 'Performance Improvement or Exit',
            strategyAr: 'تحسين الأداء أو إنهاء الخدمة',
            actions: [
                'Create immediate performance improvement plan (PIP)',
                'Set clear 30-60-90 day expectations',
                'Provide intensive coaching and support',
                'Consider role reassignment if skills mismatch',
                'Document all performance discussions',
                'Prepare transition plan if no improvement'
            ],
            actionsAr: [
                'إنشاء خطة تحسين أداء فورية',
                'تحديد توقعات واضحة لـ 30-60-90 يوم',
                'توفير تدريب ودعم مكثف',
                'النظر في إعادة تعيين الدور',
                'توثيق جميع مناقشات الأداء',
                'إعداد خطة انتقالية'
            ],
            timeframe: '30-90 days',
            investmentLevel: 'Low',
            managerFocus: 'Weekly check-ins, clear documentation'
        },
        2: { // Grinder - Low Performance, Moderate Potential
            label: 'Grinder',
            labelAr: 'مجتهد',
            strategy: 'Focused Development',
            strategyAr: 'تطوير مركّز',
            actions: [
                'Identify specific skill gaps',
                'Provide targeted training programs',
                'Assign a mentor or coach',
                'Set stretch assignments with support',
                'Regular feedback on progress',
                'Consider different role that matches strengths'
            ],
            actionsAr: [
                'تحديد فجوات المهارات المحددة',
                'توفير برامج تدريبية مستهدفة',
                'تعيين موجه أو مدرب',
                'تكليف بمهام تحدي مع الدعم',
                'ملاحظات منتظمة على التقدم',
                'النظر في دور مختلف يناسب نقاط القوة'
            ],
            timeframe: '6-12 months',
            investmentLevel: 'Moderate',
            managerFocus: 'Bi-weekly coaching, skill development'
        },
        3: { // Dilemma - Low Performance, High Potential
            label: 'Dilemma',
            labelAr: 'معضلة',
            strategy: 'Diagnose and Develop',
            strategyAr: 'تشخيص وتطوير',
            actions: [
                'Investigate root cause of low performance',
                'Check for role-fit issues',
                'Consider if personal issues affecting work',
                'Provide executive coaching',
                'Explore cross-functional opportunities',
                'Create challenging project assignments'
            ],
            actionsAr: [
                'التحقيق في السبب الجذري لانخفاض الأداء',
                'التحقق من مشاكل ملاءمة الدور',
                'النظر في تأثير المشاكل الشخصية',
                'توفير تدريب تنفيذي',
                'استكشاف فرص متعددة الوظائف',
                'إنشاء مهام مشاريع تحدي'
            ],
            timeframe: '3-6 months',
            investmentLevel: 'High',
            managerFocus: 'Deep investigation, accelerated development'
        },
        4: { // Up or Out - Moderate Performance, Low Potential
            label: 'Up or Out',
            labelAr: 'ترقية أو إنهاء',
            strategy: 'Maintain or Transition',
            strategyAr: 'الحفاظ أو الانتقال',
            actions: [
                'Maximize current role contribution',
                'Recognize and reward consistently',
                'Provide stability-focused assignments',
                'Consider specialist track vs management',
                'Transparent career discussion',
                'Plan for graceful transition if needed'
            ],
            actionsAr: [
                'تعظيم المساهمة في الدور الحالي',
                'الاعتراف والمكافأة باستمرار',
                'توفير مهام تركز على الاستقرار',
                'النظر في مسار التخصص مقابل الإدارة',
                'مناقشة مهنية شفافة',
                'التخطيط لانتقال سلس إذا لزم الأمر'
            ],
            timeframe: 'Ongoing',
            investmentLevel: 'Low-Moderate',
            managerFocus: 'Recognition, clear expectations'
        },
        5: { // Core Player - Moderate Performance, Moderate Potential
            label: 'Core Player',
            labelAr: 'لاعب أساسي',
            strategy: 'Develop and Engage',
            strategyAr: 'تطوير وإشراك',
            actions: [
                'Provide ongoing skill development',
                'Rotate through different assignments',
                'Include in cross-functional projects',
                'Regular career development discussions',
                'Recognize contributions publicly',
                'Consider for team lead opportunities'
            ],
            actionsAr: [
                'توفير تطوير مهارات مستمر',
                'التناوب عبر مهام مختلفة',
                'الإشراك في مشاريع متعددة الوظائف',
                'مناقشات تطوير مهني منتظمة',
                'الاعتراف بالمساهمات علنياً',
                'النظر في فرص قيادة الفريق'
            ],
            timeframe: '12 months',
            investmentLevel: 'Moderate',
            managerFocus: 'Development, engagement, stretch goals'
        },
        6: { // High Potential - Moderate Performance, High Potential
            label: 'High Potential',
            labelAr: 'إمكانات عالية',
            strategy: 'Accelerated Development',
            strategyAr: 'تطوير متسارع',
            actions: [
                'Fast-track to leadership development program',
                'Assign executive sponsor/mentor',
                'Provide high-visibility project assignments',
                'Include in strategic planning sessions',
                'Cross-functional rotation program',
                'Create individual development plan (IDP)'
            ],
            actionsAr: [
                'المسار السريع لبرنامج تطوير القيادة',
                'تعيين راعي/موجه تنفيذي',
                'تكليف بمشاريع عالية الظهور',
                'الإشراك في جلسات التخطيط الاستراتيجي',
                'برنامج تناوب متعدد الوظائف',
                'إنشاء خطة تطوير فردية'
            ],
            timeframe: '6-12 months',
            investmentLevel: 'High',
            managerFocus: 'Accelerated growth, exposure, stretch assignments'
        },
        7: { // Solid Performer - High Performance, Low Potential
            label: 'Solid Performer',
            labelAr: 'أداء ثابت',
            strategy: 'Recognize and Retain',
            strategyAr: 'الاعتراف والاحتفاظ',
            actions: [
                'Recognize as subject matter expert',
                'Leverage for knowledge transfer',
                'Consider as mentor for others',
                'Provide competitive compensation',
                'Offer work-life balance flexibility',
                'Create technical expert career path'
            ],
            actionsAr: [
                'الاعتراف كخبير موضوعي',
                'الاستفادة لنقل المعرفة',
                'النظر كموجه للآخرين',
                'توفير تعويض تنافسي',
                'تقديم مرونة التوازن بين العمل والحياة',
                'إنشاء مسار وظيفي للخبير التقني'
            ],
            timeframe: 'Ongoing',
            investmentLevel: 'Moderate',
            managerFocus: 'Recognition, retention, knowledge sharing'
        },
        8: { // High Performer - High Performance, Moderate Potential
            label: 'High Performer',
            labelAr: 'أداء عالي',
            strategy: 'Invest and Grow',
            strategyAr: 'الاستثمار والنمو',
            actions: [
                'Provide leadership development training',
                'Assign to strategic initiatives',
                'Include in succession planning',
                'Create visibility with senior leadership',
                'Offer promotion path clarity',
                'Consider for expanded role scope'
            ],
            actionsAr: [
                'توفير تدريب تطوير القيادة',
                'تكليف بمبادرات استراتيجية',
                'الإشراك في تخطيط التعاقب',
                'إنشاء ظهور مع القيادة العليا',
                'تقديم وضوح مسار الترقية',
                'النظر في توسيع نطاق الدور'
            ],
            timeframe: '6-12 months',
            investmentLevel: 'High',
            managerFocus: 'Growth opportunities, succession planning'
        },
        9: { // Star - High Performance, High Potential
            label: 'Star',
            labelAr: 'نجم',
            strategy: 'Retain and Accelerate',
            strategyAr: 'الاحتفاظ والتسريع',
            actions: [
                'Fast-track for executive positions',
                'Assign C-level mentor/sponsor',
                'Include in board-level presentations',
                'Provide executive compensation packages',
                'Create customized development path',
                'Priority succession candidate'
            ],
            actionsAr: [
                'المسار السريع للمناصب التنفيذية',
                'تعيين موجه/راعي من المستوى التنفيذي',
                'الإشراك في عروض مستوى مجلس الإدارة',
                'توفير حزم تعويض تنفيذية',
                'إنشاء مسار تطوير مخصص',
                'مرشح أولوية للتعاقب'
            ],
            timeframe: '3-6 months',
            investmentLevel: 'Very High',
            managerFocus: 'Maximum investment, retention, rapid advancement'
        }
    };

    return recommendations[boxPosition] || null;
};

/**
 * Get succession candidates for a specific role level
 */
nineBoxSchema.statics.getSuccessionCandidates = async function(firmId, options = {}) {
    const query = {
        firmId: new mongoose.Types.ObjectId(firmId),
        isSuccessionCandidate: true
    };

    if (options.periodYear) query.periodYear = options.periodYear;
    if (options.readinessLevel) query.readinessLevel = options.readinessLevel;
    if (options.minBoxPosition) query.boxPosition = { $gte: options.minBoxPosition };

    return this.find(query)
        .populate('employeeId', 'employeeId firstName lastName department designation')
        .sort({ boxPosition: -1, readinessLevel: 1 });
};

/**
 * Get talent pool statistics
 */
nineBoxSchema.statics.getTalentPoolStats = async function(firmId, periodYear) {
    const stats = await this.aggregate([
        {
            $match: {
                firmId: new mongoose.Types.ObjectId(firmId),
                periodYear
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                stars: { $sum: { $cond: [{ $eq: ['$boxPosition', 9] }, 1, 0] } },
                highPerformers: { $sum: { $cond: [{ $eq: ['$boxPosition', 8] }, 1, 0] } },
                highPotentials: { $sum: { $cond: [{ $eq: ['$boxPosition', 6] }, 1, 0] } },
                corePlayers: { $sum: { $cond: [{ $eq: ['$boxPosition', 5] }, 1, 0] } },
                successionCandidates: { $sum: { $cond: ['$isSuccessionCandidate', 1, 0] } },
                flightRiskHigh: { $sum: { $cond: [{ $eq: ['$flightRisk', 'high'] }, 1, 0] } },
                retentionCritical: { $sum: { $cond: [{ $eq: ['$retentionPriority', 'critical'] }, 1, 0] } },
                readyNow: { $sum: { $cond: [{ $eq: ['$readinessLevel', 'ready_now'] }, 1, 0] } },
                readyIn1Year: { $sum: { $cond: [{ $eq: ['$readinessLevel', 'ready_1_year'] }, 1, 0] } }
            }
        }
    ]);

    if (stats.length === 0) {
        return {
            total: 0,
            stars: 0,
            highPerformers: 0,
            highPotentials: 0,
            corePlayers: 0,
            topTalent: 0,
            topTalentPercentage: 0,
            successionCandidates: 0,
            flightRiskHigh: 0,
            retentionCritical: 0,
            readyNow: 0,
            readyIn1Year: 0
        };
    }

    const result = stats[0];
    result.topTalent = result.stars + result.highPerformers + result.highPotentials;
    result.topTalentPercentage = result.total > 0
        ? parseFloat(((result.topTalent / result.total) * 100).toFixed(1))
        : 0;

    return result;
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

const OKR = mongoose.model('OKR', okrSchema);
const NineBoxAssessment = mongoose.model('NineBoxAssessment', nineBoxSchema);

module.exports = { OKR, NineBoxAssessment };
