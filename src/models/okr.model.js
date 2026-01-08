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

    // Progress
    progress: { type: Number, default: 0, min: 0, max: 100 },
    status: {
        type: String,
        enum: ['not_started', 'on_track', 'at_risk', 'behind', 'completed', 'cancelled'],
        default: 'not_started'
    },

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
        note: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],

    // Dates
    dueDate: Date,
    completedDate: Date
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

    // Status & Progress
    status: {
        type: String,
        enum: ['draft', 'active', 'on_track', 'at_risk', 'behind', 'completed', 'cancelled'],
        default: 'draft',
        index: true
    },
    overallProgress: { type: Number, default: 0, min: 0, max: 100 },
    overallScore: { type: Number, min: 0, max: 1 }, // 0.0 to 1.0

    // Check-ins
    checkIns: [{
        date: { type: Date, default: Date.now },
        overallProgress: Number,
        status: String,
        summary: String,
        summaryAr: String,
        challenges: String,
        nextSteps: String,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],

    // Visibility
    visibility: {
        type: String,
        enum: ['public', 'department', 'team', 'private'],
        default: 'public'
    },

    // Tags for filtering
    tags: [String],
    category: String, // e.g., 'growth', 'efficiency', 'quality', 'innovation'

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

    // Calculate overall progress from key results
    if (this.keyResults && this.keyResults.length > 0) {
        const totalWeight = this.keyResults.reduce((sum, kr) => sum + (kr.weight || 1), 0);
        const weightedProgress = this.keyResults.reduce((sum, kr) => {
            return sum + (kr.progress * (kr.weight || 1));
        }, 0);
        this.overallProgress = totalWeight > 0 ? Math.round(weightedProgress / totalWeight) : 0;

        // Calculate overall score (0.0 to 1.0)
        this.overallScore = this.overallProgress / 100;

        // Update status based on progress and dates
        if (this.status !== 'draft' && this.status !== 'cancelled') {
            const now = new Date();
            const totalDays = (this.endDate - this.startDate) / (1000 * 60 * 60 * 24);
            const daysElapsed = (now - this.startDate) / (1000 * 60 * 60 * 24);
            const expectedProgress = Math.min(100, (daysElapsed / totalDays) * 100);

            if (this.overallProgress >= 100) {
                this.status = 'completed';
            } else if (this.overallProgress >= expectedProgress - 10) {
                this.status = 'on_track';
            } else if (this.overallProgress >= expectedProgress - 25) {
                this.status = 'at_risk';
            } else {
                this.status = 'behind';
            }
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

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

const OKR = mongoose.model('OKR', okrSchema);
const NineBoxAssessment = mongoose.model('NineBoxAssessment', nineBoxSchema);

module.exports = { OKR, NineBoxAssessment };
