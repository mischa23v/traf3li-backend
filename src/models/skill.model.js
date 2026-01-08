/**
 * Skill & Competency Model
 *
 * Enterprise-grade skill management following industry standards:
 * - SFIA Framework (Skills Framework for the Information Age) - 7 Levels
 * - Odoo HR Skills hierarchy (skill_type → skill → skill_level)
 * - SAP SuccessFactors Competency Matrix
 * - Workday Skills Cloud patterns
 *
 * Features:
 * - SFIA 7-level proficiency framework
 * - Skill Type hierarchies (categories)
 * - Competency Framework (behavioral, leadership, core, functional)
 * - Certification tracking with CPD credits
 * - Skill verification and endorsements
 * - Training linkage and learning paths
 */

const mongoose = require('mongoose');
const Counter = require('./counter.model');

// ═══════════════════════════════════════════════════════════════
// SFIA 7-LEVEL PROFICIENCY FRAMEWORK
// Industry standard for skill assessment
// ═══════════════════════════════════════════════════════════════

const SFIA_LEVELS = [
    {
        level: 1,
        code: 'Follow',
        name: 'Follow',
        nameAr: 'متابع',
        description: 'Works under close direction. Uses little discretion. Expected to seek guidance.',
        descriptionAr: 'يعمل تحت إشراف وثيق. يستخدم القليل من التقدير. يتوقع طلب التوجيه.',
        autonomy: 'Works under supervision',
        complexity: 'Routine tasks',
        businessSkills: 'Learning basic business processes',
        influence: 'Minimal impact on team'
    },
    {
        level: 2,
        code: 'Assist',
        name: 'Assist',
        nameAr: 'مساعد',
        description: 'Works under routine direction. Uses limited discretion. Work is reviewed frequently.',
        descriptionAr: 'يعمل تحت توجيه روتيني. يستخدم تقدير محدود. يتم مراجعة العمل بشكل متكرر.',
        autonomy: 'Works with moderate supervision',
        complexity: 'Routine and straightforward tasks',
        businessSkills: 'Understands basic business processes',
        influence: 'Limited impact within team'
    },
    {
        level: 3,
        code: 'Apply',
        name: 'Apply',
        nameAr: 'تطبيق',
        description: 'Works under general direction. Uses discretion in identifying and responding to complex issues.',
        descriptionAr: 'يعمل تحت توجيه عام. يستخدم التقدير في تحديد القضايا المعقدة والاستجابة لها.',
        autonomy: 'Works with limited supervision',
        complexity: 'Varied work activities',
        businessSkills: 'Demonstrates effective communication',
        influence: 'Interacts with and influences immediate team'
    },
    {
        level: 4,
        code: 'Enable',
        name: 'Enable',
        nameAr: 'تمكين',
        description: 'Works under general guidance. Substantial responsibility. Influences team practices.',
        descriptionAr: 'يعمل تحت توجيه عام. مسؤولية كبيرة. يؤثر على ممارسات الفريق.',
        autonomy: 'Works with broad guidance',
        complexity: 'Complex technical activities',
        businessSkills: 'Facilitates collaboration within team',
        influence: 'Influences practices of immediate team'
    },
    {
        level: 5,
        code: 'Ensure/Advise',
        name: 'Ensure & Advise',
        nameAr: 'ضمان وإرشاد',
        description: 'Works under broad direction. Full accountability for technical work. Advises on scope of work.',
        descriptionAr: 'يعمل تحت توجيه واسع. مسؤولية كاملة عن العمل التقني. ينصح بشأن نطاق العمل.',
        autonomy: 'Full accountability for actions',
        complexity: 'Broad range of complex activities',
        businessSkills: 'Communicates effectively to all levels',
        influence: 'Influences across the organization'
    },
    {
        level: 6,
        code: 'Initiate/Influence',
        name: 'Initiate & Influence',
        nameAr: 'مبادرة وتأثير',
        description: 'Has defined authority and accountability. Establishes organizational objectives.',
        descriptionAr: 'لديه سلطة ومسؤولية محددة. يضع الأهداف التنظيمية.',
        autonomy: 'Defined authority within organization',
        complexity: 'Highly complex work involving innovation',
        businessSkills: 'Champions organizational initiatives',
        influence: 'Significant influence on organizational policy'
    },
    {
        level: 7,
        code: 'Set Strategy/Inspire',
        name: 'Set Strategy & Inspire',
        nameAr: 'وضع استراتيجية وإلهام',
        description: 'Has authority and accountability for all aspects. Sets direction and shapes culture.',
        descriptionAr: 'لديه سلطة ومسؤولية عن جميع الجوانب. يحدد الاتجاه ويشكل الثقافة.',
        autonomy: 'Highest level of authority',
        complexity: 'Strategic leadership and innovation',
        businessSkills: 'Shapes organizational culture',
        influence: 'Inspires and influences across industry'
    }
];

// ═══════════════════════════════════════════════════════════════
// SKILL TYPE SCHEMA (Odoo-style hierarchy)
// ═══════════════════════════════════════════════════════════════

const skillTypeSchema = new mongoose.Schema({
    typeId: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },
    name: {
        type: String,
        required: [true, 'Skill type name is required'],
        trim: true
    },
    nameAr: {
        type: String,
        trim: true
    },
    description: String,
    descriptionAr: String,

    // Parent type for hierarchy (e.g., "Programming" under "Technical")
    parentTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SkillType',
        index: true
    },

    // Type classification
    classification: {
        type: String,
        enum: [
            'technical',           // Hard skills - programming, systems, etc.
            'functional',          // Job-specific skills
            'behavioral',          // Soft skills - communication, teamwork
            'leadership',          // Management and leadership skills
            'industry',            // Industry-specific knowledge
            'certification',       // Certifiable skills
            'language',            // Language proficiency
            'tool',                // Software/tool proficiency
            'regulatory'           // Compliance and regulatory skills
        ],
        default: 'technical',
        index: true
    },

    // Icon/color for UI
    icon: String,
    color: { type: String, default: '#3B82F6' },

    // Ordering
    displayOrder: { type: Number, default: 0 },

    // Status
    isActive: { type: Boolean, default: true },

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

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// SKILL SCHEMA (Enhanced with SFIA)
// ═══════════════════════════════════════════════════════════════

const skillSchema = new mongoose.Schema({
    // Unique identifier
    skillId: {
        type: String,
        unique: true,
        index: true
    },

    // Basic info
    name: {
        type: String,
        required: [true, 'Skill name is required'],
        trim: true
    },
    nameAr: {
        type: String,
        trim: true
    },
    description: String,
    descriptionAr: String,

    // Skill Type reference (hierarchical category)
    skillTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SkillType',
        index: true
    },

    // Legacy category (for backward compatibility)
    category: {
        type: String,
        enum: [
            'technical',
            'legal',
            'language',
            'software',
            'management',
            'communication',
            'analytical',
            'interpersonal',
            'industry_specific',
            'certification',
            'other'
        ],
        required: true,
        index: true
    },
    subcategory: String,

    // SFIA Proficiency levels (7-level framework)
    useSfiaLevels: {
        type: Boolean,
        default: true
    },

    // Custom proficiency levels (if not using SFIA)
    proficiencyLevels: [{
        level: { type: Number, required: true, min: 1, max: 7 },
        code: String,
        name: { type: String, required: true },
        nameAr: String,
        description: String,
        descriptionAr: String,
        autonomy: String,
        complexity: String,
        businessSkills: String,
        influence: String
    }],

    // Minimum proficiency required for role (target level)
    targetProficiency: {
        type: Number,
        min: 1,
        max: 7,
        default: 3
    },

    // Skill tags for search and filtering
    tags: [{
        type: String,
        trim: true
    }],
    tagsAr: [{
        type: String,
        trim: true
    }],

    // Related skills (for skill clusters/paths)
    relatedSkills: [{
        skillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
        relationship: {
            type: String,
            enum: ['prerequisite', 'complementary', 'advanced', 'alternative'],
            default: 'complementary'
        }
    }],

    // Verification & Certification
    isVerifiable: {
        type: Boolean,
        default: false
    },
    verificationMethod: {
        type: String,
        enum: ['certification', 'test', 'assessment', 'portfolio', 'reference', 'none'],
        default: 'none'
    },

    // Certification details (if this skill is certifiable)
    certificationInfo: {
        certificationName: String,
        certificationNameAr: String,
        issuingBody: String,
        issuingBodyAr: String,
        issuingBodyUrl: String,
        validityPeriodMonths: Number,       // How long cert is valid
        renewalRequired: { type: Boolean, default: false },
        cpdCredits: { type: Number, default: 0 },  // Continuing Professional Development credits
        examRequired: { type: Boolean, default: false },
        examUrl: String,
        estimatedCost: Number,               // SAR
        estimatedPrepTime: Number            // Hours
    },

    // Learning resources
    learningResources: [{
        type: { type: String, enum: ['course', 'book', 'video', 'article', 'practice', 'mentorship'] },
        title: String,
        titleAr: String,
        provider: String,
        url: String,
        duration: String,
        cost: Number,
        forLevel: { type: Number, min: 1, max: 7 }  // Target proficiency level
    }],

    // Related training programs
    relatedTrainings: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TrainingProgram'
    }],

    // Job roles that require this skill
    requiredForRoles: [{
        roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobRole' },
        roleName: String,
        requiredLevel: { type: Number, min: 1, max: 7 }
    }],

    // Industry alignment
    industryStandards: [{
        framework: String,  // e.g., "SFIA", "NIST", "ISO"
        standardCode: String,
        standardName: String
    }],

    // Statistics (cached for performance)
    stats: {
        employeesWithSkill: { type: Number, default: 0 },
        avgProficiency: { type: Number, default: 0 },
        verifiedCount: { type: Number, default: 0 },
        lastUpdated: Date
    },

    // Status
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    isCoreSkill: {
        type: Boolean,
        default: false,
        index: true
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

    // Metadata
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// COMPETENCY SCHEMA
// Behavioral, Leadership, and Core Competencies
// ═══════════════════════════════════════════════════════════════

const competencySchema = new mongoose.Schema({
    competencyId: {
        type: String,
        unique: true,
        index: true
    },

    // Basic info
    name: {
        type: String,
        required: [true, 'Competency name is required'],
        trim: true
    },
    nameAr: {
        type: String,
        trim: true
    },
    description: String,
    descriptionAr: String,

    // Competency type
    type: {
        type: String,
        enum: [
            'core',           // Required for all employees
            'leadership',     // Required for managers/leaders
            'functional',     // Job-specific competencies
            'behavioral',     // Soft skills/behaviors
            'strategic'       // Strategic/executive competencies
        ],
        required: true,
        index: true
    },

    // Competency cluster/category
    cluster: {
        type: String,
        enum: [
            'communication',
            'collaboration',
            'problem_solving',
            'decision_making',
            'innovation',
            'customer_focus',
            'results_orientation',
            'leadership',
            'people_development',
            'strategic_thinking',
            'change_management',
            'integrity',
            'adaptability',
            'accountability'
        ],
        index: true
    },
    clusterAr: String,

    // Behavioral indicators for each level (SFIA-aligned)
    behavioralIndicators: [{
        level: { type: Number, required: true, min: 1, max: 7 },
        levelName: String,
        levelNameAr: String,
        indicators: [{ type: String }],
        indicatorsAr: [{ type: String }],
        examples: [{ type: String }],
        examplesAr: [{ type: String }],
        negativeIndicators: [{ type: String }],  // What NOT to do
        negativeIndicatorsAr: [{ type: String }]
    }],

    // Assessment methods
    assessmentMethods: [{
        type: String,
        enum: [
            'self_assessment',
            'manager_assessment',
            'peer_360',
            'behavioral_interview',
            'assessment_center',
            'observation',
            'situational_judgment',
            'case_study'
        ]
    }],

    // Importance/weight for role matching
    importance: {
        type: String,
        enum: ['critical', 'important', 'nice_to_have'],
        default: 'important'
    },
    weight: {
        type: Number,
        min: 0,
        max: 100,
        default: 10
    },

    // Development resources
    developmentActivities: [{
        activity: String,
        activityAr: String,
        type: { type: String, enum: ['training', 'coaching', 'reading', 'experience', 'project', 'mentorship'] },
        forLevel: { type: Number, min: 1, max: 7 },
        estimatedDuration: String
    }],

    // Status
    isActive: { type: Boolean, default: true },
    isMandatory: { type: Boolean, default: false },

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
// SKILL ASSESSMENT SCHEMA (360-Degree)
// ═══════════════════════════════════════════════════════════════

const skillAssessmentSchema = new mongoose.Schema({
    assessmentId: {
        type: String,
        unique: true,
        index: true
    },

    // Who is being assessed
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
        index: true
    },

    // Assessment period
    assessmentPeriod: {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        periodName: String,  // e.g., "Q4 2024", "2024 Annual"
        periodNameAr: String
    },

    // Assessment type
    assessmentType: {
        type: String,
        enum: [
            'annual',
            'quarterly',
            'probation',
            'promotion',
            'project_end',
            'skill_gap',
            '360_review',
            'certification_prep'
        ],
        required: true,
        index: true
    },

    // Skill ratings
    skillRatings: [{
        skillId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Skill',
            required: true
        },
        skillName: String,
        skillNameAr: String,
        category: String,

        // Multi-rater assessment (360-degree)
        selfRating: {
            level: { type: Number, min: 1, max: 7 },
            levelProgress: { type: Number, min: 0, max: 100 },  // 0-100% within level
            confidence: { type: Number, min: 1, max: 5 },       // How confident in rating
            notes: String,
            ratedAt: Date
        },
        managerRating: {
            level: { type: Number, min: 1, max: 7 },
            levelProgress: { type: Number, min: 0, max: 100 },
            notes: String,
            ratedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            ratedAt: Date
        },
        peerRatings: [{
            level: { type: Number, min: 1, max: 7 },
            levelProgress: { type: Number, min: 0, max: 100 },
            notes: String,
            ratedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            relationship: { type: String, enum: ['peer', 'direct_report', 'cross_functional', 'external'] },
            ratedAt: Date
        }],

        // Calculated final rating
        finalRating: {
            level: { type: Number, min: 1, max: 7 },
            levelProgress: { type: Number, min: 0, max: 100 },
            calculationMethod: { type: String, enum: ['weighted_average', 'manager_final', 'consensus'] },
            calibrated: { type: Boolean, default: false },
            calibratedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            calibratedAt: Date
        },

        // Gap analysis
        previousRating: { type: Number, min: 1, max: 7 },
        targetRating: { type: Number, min: 1, max: 7 },
        gap: { type: Number },  // Target - Final
        trend: { type: String, enum: ['improving', 'stable', 'declining'] },

        // Evidence
        evidence: [{
            type: { type: String, enum: ['project', 'certification', 'feedback', 'observation', 'achievement'] },
            description: String,
            date: Date,
            verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        }]
    }],

    // Competency ratings (same structure)
    competencyRatings: [{
        competencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Competency',
            required: true
        },
        competencyName: String,
        competencyNameAr: String,
        type: String,

        selfRating: {
            level: { type: Number, min: 1, max: 7 },
            notes: String,
            ratedAt: Date
        },
        managerRating: {
            level: { type: Number, min: 1, max: 7 },
            notes: String,
            ratedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            ratedAt: Date
        },
        peerRatings: [{
            level: { type: Number, min: 1, max: 7 },
            notes: String,
            ratedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            relationship: String,
            ratedAt: Date
        }],

        finalRating: {
            level: { type: Number, min: 1, max: 7 },
            calibrated: { type: Boolean, default: false }
        },

        // Behavioral evidence
        behavioralExamples: [{
            behavior: String,
            situation: String,
            action: String,
            result: String,
            observedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            observedAt: Date
        }]
    }],

    // Overall assessment
    overallSummary: {
        totalSkillsAssessed: { type: Number, default: 0 },
        avgSkillRating: { type: Number },
        totalCompetenciesAssessed: { type: Number, default: 0 },
        avgCompetencyRating: { type: Number },
        strengthAreas: [{ type: String }],
        strengthAreasAr: [{ type: String }],
        developmentAreas: [{ type: String }],
        developmentAreasAr: [{ type: String }],
        overallNotes: String,
        overallNotesAr: String
    },

    // Development plan from assessment
    developmentPlan: {
        shortTermGoals: [{
            goal: String,
            goalAr: String,
            skillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
            targetLevel: Number,
            dueDate: Date,
            actions: [{ type: String }]
        }],
        longTermGoals: [{
            goal: String,
            goalAr: String,
            targetDate: Date
        }],
        recommendedTraining: [{
            trainingId: { type: mongoose.Schema.Types.ObjectId, ref: 'TrainingProgram' },
            trainingName: String,
            priority: { type: String, enum: ['high', 'medium', 'low'] }
        }],
        mentorAssigned: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }
    },

    // Status
    status: {
        type: String,
        enum: [
            'draft',
            'self_assessment',
            'manager_review',
            'peer_review',
            'calibration',
            'completed',
            'acknowledged'
        ],
        default: 'draft',
        index: true
    },

    // Workflow tracking
    workflow: {
        selfAssessmentDue: Date,
        selfAssessmentCompleted: Date,
        managerReviewDue: Date,
        managerReviewCompleted: Date,
        peerReviewDue: Date,
        peerReviewCompleted: Date,
        calibrationDate: Date,
        acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        acknowledgedAt: Date
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
// INDEXES
// ═══════════════════════════════════════════════════════════════

skillTypeSchema.index({ firmId: 1, name: 1 }, { unique: true });
skillTypeSchema.index({ firmId: 1, classification: 1, isActive: 1 });
skillTypeSchema.index({ firmId: 1, parentTypeId: 1 });

skillSchema.index({ firmId: 1, name: 1 }, { unique: true });
skillSchema.index({ firmId: 1, category: 1, isActive: 1 });
skillSchema.index({ firmId: 1, skillTypeId: 1, isActive: 1 });
skillSchema.index({ firmId: 1, isCoreSkill: 1, isActive: 1 });
skillSchema.index({ firmId: 1, tags: 1 });

competencySchema.index({ firmId: 1, name: 1 }, { unique: true });
competencySchema.index({ firmId: 1, type: 1, isActive: 1 });
competencySchema.index({ firmId: 1, cluster: 1, isActive: 1 });

skillAssessmentSchema.index({ firmId: 1, employeeId: 1, 'assessmentPeriod.startDate': -1 });
skillAssessmentSchema.index({ firmId: 1, assessmentType: 1, status: 1 });
skillAssessmentSchema.index({ firmId: 1, 'workflow.selfAssessmentDue': 1, status: 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

skillTypeSchema.pre('save', async function(next) {
    if (this.isNew && !this.typeId) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { model: 'SkillType', firmId: this.firmId },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.typeId = `ST-${String(counter.seq).padStart(4, '0')}`;
        } catch (error) {
            return next(error);
        }
    }
    next();
});

skillSchema.pre('save', async function(next) {
    if (this.isNew && !this.skillId) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { model: 'Skill', firmId: this.firmId },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.skillId = `SK-${String(counter.seq).padStart(4, '0')}`;
        } catch (error) {
            return next(error);
        }
    }

    // Set SFIA proficiency levels if enabled and not custom set
    if (this.isNew && this.useSfiaLevels && (!this.proficiencyLevels || this.proficiencyLevels.length === 0)) {
        this.proficiencyLevels = SFIA_LEVELS.map(l => ({
            level: l.level,
            code: l.code,
            name: l.name,
            nameAr: l.nameAr,
            description: l.description,
            descriptionAr: l.descriptionAr,
            autonomy: l.autonomy,
            complexity: l.complexity,
            businessSkills: l.businessSkills,
            influence: l.influence
        }));
    }

    next();
});

competencySchema.pre('save', async function(next) {
    if (this.isNew && !this.competencyId) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { model: 'Competency', firmId: this.firmId },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.competencyId = `CP-${String(counter.seq).padStart(4, '0')}`;
        } catch (error) {
            return next(error);
        }
    }
    next();
});

skillAssessmentSchema.pre('save', async function(next) {
    if (this.isNew && !this.assessmentId) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { model: 'SkillAssessment', firmId: this.firmId },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.assessmentId = `SA-${String(counter.seq).padStart(5, '0')}`;
        } catch (error) {
            return next(error);
        }
    }

    // Calculate summary statistics
    if (this.skillRatings && this.skillRatings.length > 0) {
        this.overallSummary.totalSkillsAssessed = this.skillRatings.length;
        const ratedSkills = this.skillRatings.filter(s => s.finalRating?.level);
        if (ratedSkills.length > 0) {
            this.overallSummary.avgSkillRating = parseFloat(
                (ratedSkills.reduce((sum, s) => sum + s.finalRating.level, 0) / ratedSkills.length).toFixed(2)
            );
        }
    }

    if (this.competencyRatings && this.competencyRatings.length > 0) {
        this.overallSummary.totalCompetenciesAssessed = this.competencyRatings.length;
        const ratedCompetencies = this.competencyRatings.filter(c => c.finalRating?.level);
        if (ratedCompetencies.length > 0) {
            this.overallSummary.avgCompetencyRating = parseFloat(
                (ratedCompetencies.reduce((sum, c) => sum + c.finalRating.level, 0) / ratedCompetencies.length).toFixed(2)
            );
        }
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATICS
// ═══════════════════════════════════════════════════════════════

skillSchema.statics.getActiveSkills = function(firmId, category = null) {
    const query = { firmId, isActive: true };
    if (category) query.category = category;

    return this.find(query).sort({ category: 1, name: 1 });
};

skillSchema.statics.getByCategory = function(firmId) {
    return this.aggregate([
        { $match: { firmId: new mongoose.Types.ObjectId(firmId), isActive: true } },
        {
            $group: {
                _id: '$category',
                skills: { $push: { _id: '$_id', name: '$name', nameAr: '$nameAr' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);
};

skillSchema.statics.searchSkills = function(firmId, searchTerm) {
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.find({
        firmId,
        isActive: true,
        $or: [
            { name: { $regex: escapedTerm, $options: 'i' } },
            { nameAr: { $regex: escapedTerm, $options: 'i' } },
            { description: { $regex: escapedTerm, $options: 'i' } },
            { tags: { $regex: escapedTerm, $options: 'i' } }
        ]
    }).limit(20);
};

skillSchema.statics.getCoreSkills = function(firmId) {
    return this.find({ firmId, isActive: true, isCoreSkill: true })
        .sort({ category: 1, name: 1 });
};

skillSchema.statics.getSkillsRequiringCertification = function(firmId) {
    return this.find({
        firmId,
        isActive: true,
        isVerifiable: true,
        'certificationInfo.renewalRequired': true
    }).sort({ name: 1 });
};

competencySchema.statics.getByType = function(firmId, type = null) {
    const query = { firmId, isActive: true };
    if (type) query.type = type;

    return this.find(query).sort({ type: 1, cluster: 1, name: 1 });
};

competencySchema.statics.getMandatoryCompetencies = function(firmId) {
    return this.find({
        firmId,
        isActive: true,
        isMandatory: true
    }).sort({ type: 1, name: 1 });
};

skillTypeSchema.statics.getHierarchy = async function(firmId) {
    const types = await this.find({ firmId, isActive: true }).lean();

    // Build tree structure
    const typeMap = {};
    const roots = [];

    types.forEach(t => {
        typeMap[t._id.toString()] = { ...t, children: [] };
    });

    types.forEach(t => {
        if (t.parentTypeId) {
            const parent = typeMap[t.parentTypeId.toString()];
            if (parent) {
                parent.children.push(typeMap[t._id.toString()]);
            }
        } else {
            roots.push(typeMap[t._id.toString()]);
        }
    });

    return roots;
};

// ═══════════════════════════════════════════════════════════════
// VIRTUALS & JSON
// ═══════════════════════════════════════════════════════════════

skillSchema.set('toJSON', { virtuals: true });
skillSchema.set('toObject', { virtuals: true });
competencySchema.set('toJSON', { virtuals: true });
competencySchema.set('toObject', { virtuals: true });
skillAssessmentSchema.set('toJSON', { virtuals: true });
skillAssessmentSchema.set('toObject', { virtuals: true });
skillTypeSchema.set('toJSON', { virtuals: true });
skillTypeSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

const SkillType = mongoose.model('SkillType', skillTypeSchema);
const Skill = mongoose.model('Skill', skillSchema);
const Competency = mongoose.model('Competency', competencySchema);
const SkillAssessment = mongoose.model('SkillAssessment', skillAssessmentSchema);

// Export SFIA_LEVELS constant for use in other modules
module.exports = {
    SkillType,
    Skill,
    Competency,
    SkillAssessment,
    SFIA_LEVELS
};
