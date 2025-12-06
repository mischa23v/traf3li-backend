const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Performance Management Model
 * MODULE 6: إدارة الأداء
 * Saudi Labor Law Compliance (Articles 64, 65, 77, 80, 81)
 */

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Review Period Schema
const ReviewPeriodSchema = new Schema({
    periodType: {
        type: String,
        enum: ['annual', 'mid_year', 'quarterly', 'probation', 'project', 'ad_hoc'],
        required: true
    },
    periodName: String, // "2025 Annual Review", "Q1 2025"
    periodNameAr: String,
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reviewDueDate: { type: Date, required: true },
    selfAssessmentDueDate: Date
}, { _id: false });

// Self Assessment Schema
const SelfAssessmentSchema = new Schema({
    required: { type: Boolean, default: true },
    submitted: { type: Boolean, default: false },
    submittedOn: Date,
    dueDate: Date,

    // Self rating
    selfRating: { type: Number, min: 1, max: 5 },
    selfRatingScale: { type: String, enum: ['1-5', '1-100'], default: '1-5' },

    // Accomplishments
    accomplishments: String,
    accomplishmentsAr: String,

    keyAchievements: [{
        achievement: String,
        achievementAr: String,
        impact: String,
        date: Date
    }],

    // Challenges
    challenges: String,
    challengesAr: String,

    // Strengths (employee perspective)
    strengths: String,
    strengthsAr: String,

    // Development needs
    developmentNeeds: String,
    developmentNeedsAr: String,

    // Career aspirations
    careerAspirations: String,
    careerAspirationsAr: String,

    // Training requests
    trainingRequests: [{
        trainingType: String,
        reason: String,
        priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
    }],

    // Additional comments
    additionalComments: String,
    additionalCommentsAr: String
}, { _id: false });

// Competency Rating Schema
const CompetencyRatingSchema = new Schema({
    competencyId: { type: String, required: true },
    competencyName: { type: String, required: true },
    competencyNameAr: String,

    competencyCategory: {
        type: String,
        enum: ['core', 'leadership', 'technical', 'behavioral', 'functional', 'legal', 'client_service'],
        required: true
    },

    competencyDescription: String,
    competencyDescriptionAr: String,

    // Rating levels
    ratingScale: { type: String, enum: ['1-5', '1-100'], default: '1-5' },

    // Ratings
    selfRating: { type: Number, min: 1, max: 5 },
    managerRating: { type: Number, min: 1, max: 5 },
    finalRating: { type: Number, min: 1, max: 5 },

    // Rating labels
    ratingLabel: String,
    ratingLabelAr: String,

    // Behaviors observed
    behaviorsObserved: [{
        behavior: String,
        frequency: { type: String, enum: ['never', 'rarely', 'sometimes', 'often', 'always'] }
    }],

    // Comments
    managerComments: String,
    managerCommentsAr: String,
    selfComments: String,

    // Development notes
    developmentNotes: String,

    // Weight
    weight: { type: Number, default: 10, min: 0, max: 100 },
    weightedScore: Number,

    // Examples
    examples: [String]
}, { _id: false });

// Goal Schema
const GoalSchema = new Schema({
    goalId: { type: String, required: true },
    goalName: { type: String, required: true },
    goalNameAr: String,

    goalType: {
        type: String,
        enum: ['individual', 'team', 'company', 'project', 'developmental'],
        default: 'individual'
    },

    goalCategory: {
        type: String,
        enum: ['financial', 'operational', 'client', 'learning', 'quality']
    },

    goalDescription: String,
    goalDescriptionAr: String,

    // Target
    targetMetric: String,
    targetValue: Number,
    targetUnit: String,

    // Achievement
    actualValue: Number,
    achievementPercentage: { type: Number, default: 0 },

    // Rating
    ratingScale: { type: String, enum: ['1-5', '1-100'], default: '1-5' },
    selfRating: { type: Number, min: 1, max: 5 },
    managerRating: { type: Number, min: 1, max: 5 },
    finalRating: { type: Number, min: 1, max: 5 },

    // Status
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed', 'exceeded', 'not_achieved'],
        default: 'not_started'
    },

    // Dates
    startDate: Date,
    targetDate: Date,
    completionDate: Date,

    // Comments
    employeeComments: String,
    managerComments: String,

    // Challenges
    challenges: String,
    supportNeeded: String,

    // Evidence
    evidenceProvided: { type: Boolean, default: false },
    evidenceUrls: [String],

    // Weight
    weight: { type: Number, default: 20, min: 0, max: 100 },
    weightedScore: Number
}, { _id: false });

// KPI Schema
const KPISchema = new Schema({
    kpiId: { type: String, required: true },
    kpiName: { type: String, required: true },
    kpiNameAr: String,

    kpiCategory: {
        type: String,
        enum: ['financial', 'operational', 'customer', 'quality', 'efficiency']
    },

    // Measurement
    metric: String,
    unit: String,

    // Targets
    target: { type: Number, required: true },
    threshold: Number, // Minimum acceptable
    stretch: Number, // Exceptional performance

    // Actual
    actual: { type: Number, default: 0 },

    // Performance
    achievementPercentage: { type: Number, default: 0 },

    performanceLevel: {
        type: String,
        enum: ['below_threshold', 'meets_threshold', 'meets_target', 'exceeds_target', 'stretch']
    },

    // Score
    score: Number,
    weight: { type: Number, default: 10, min: 0, max: 100 },
    weightedScore: Number,

    // Trend
    trend: { type: String, enum: ['improving', 'stable', 'declining'] },
    previousPeriodValue: Number,

    // Rating
    rating: { type: Number, min: 1, max: 5 },

    // Comments
    comments: String
}, { _id: false });

// Attorney Metrics Schema (Law Firm Specific)
const AttorneyMetricsSchema = new Schema({
    // Case Performance
    caseMetrics: {
        totalCasesHandled: { type: Number, default: 0 },
        activeCases: { type: Number, default: 0 },
        casesWon: { type: Number, default: 0 },
        casesLost: { type: Number, default: 0 },
        casesPending: { type: Number, default: 0 },
        casesSettled: { type: Number, default: 0 },
        winRate: { type: Number, default: 0 },
        settlementRate: { type: Number, default: 0 },
        averageCaseValue: { type: Number, default: 0 },
        totalCaseValue: { type: Number, default: 0 },
        averageCaseDuration: { type: Number, default: 0 },
        casesByType: [{
            caseType: String,
            count: Number,
            winRate: Number
        }],
        casesByPracticeArea: [{
            practiceArea: String,
            count: Number,
            performance: Number
        }]
    },

    // Client Metrics
    clientMetrics: {
        totalClients: { type: Number, default: 0 },
        newClients: { type: Number, default: 0 },
        retainedClients: { type: Number, default: 0 },
        lostClients: { type: Number, default: 0 },
        clientRetentionRate: { type: Number, default: 0 },
        clientGrowthRate: { type: Number, default: 0 },
        clientSatisfactionScore: Number,
        clientSatisfactionResponses: Number,
        referralsReceived: { type: Number, default: 0 },
        complaints: { type: Number, default: 0 },
        complimentsReceived: { type: Number, default: 0 }
    },

    // Billing Metrics
    billingMetrics: {
        totalBillableHours: { type: Number, default: 0 },
        totalNonBillableHours: { type: Number, default: 0 },
        totalHours: { type: Number, default: 0 },
        utilizationRate: { type: Number, default: 0 },
        realizationRate: { type: Number, default: 0 },
        averageHourlyRate: { type: Number, default: 0 },
        totalBilled: { type: Number, default: 0 },
        totalCollected: { type: Number, default: 0 },
        outstandingAR: { type: Number, default: 0 },
        billingTarget: { type: Number, default: 0 },
        billingAchievement: { type: Number, default: 0 },
        writeOffs: { type: Number, default: 0 },
        writeOffRate: { type: Number, default: 0 },
        monthlyBillingTrend: [{
            month: String,
            billed: Number,
            collected: Number
        }]
    },

    // Legal Work Quality
    legalWorkQuality: {
        documentQualityScore: Number,
        documentReviewCount: Number,
        researchQualityScore: Number,
        researchAssignments: { type: Number, default: 0 },
        briefsSubmitted: { type: Number, default: 0 },
        briefsAccepted: { type: Number, default: 0 },
        briefsRejected: { type: Number, default: 0 },
        courtAppearances: { type: Number, default: 0 },
        courtPerformanceScore: Number,
        errorsFound: { type: Number, default: 0 },
        revisionsRequired: { type: Number, default: 0 },
        ethicsViolations: { type: Number, default: 0 },
        complianceIssues: { type: Number, default: 0 }
    },

    // Business Development
    businessDevelopment: {
        newBusinessGenerated: { type: Number, default: 0 },
        proposalsSubmitted: { type: Number, default: 0 },
        proposalsWon: { type: Number, default: 0 },
        winRate: { type: Number, default: 0 },
        networkingEvents: { type: Number, default: 0 },
        presentationsGiven: { type: Number, default: 0 },
        articlesPublished: { type: Number, default: 0 },
        referralsSent: { type: Number, default: 0 },
        referralsReceived: { type: Number, default: 0 }
    },

    // Knowledge Contribution
    knowledgeContribution: {
        legalMemosDrafted: { type: Number, default: 0 },
        precedentsDocumented: { type: Number, default: 0 },
        trainingSessionsConducted: { type: Number, default: 0 },
        mentoringHours: { type: Number, default: 0 },
        knowledgeBaseContributions: { type: Number, default: 0 }
    },

    // Overall score
    overallAttorneyScore: Number
}, { _id: false });

// Strength Schema
const StrengthSchema = new Schema({
    strengthId: String,
    strengthArea: { type: String, required: true },
    strengthAreaAr: String,

    category: {
        type: String,
        enum: ['technical', 'behavioral', 'leadership', 'communication', 'other']
    },

    description: String,
    descriptionAr: String,

    examples: [{
        example: String,
        date: Date,
        impact: String
    }],

    leverageOpportunities: String
}, { _id: false });

// Area for Improvement Schema
const ImprovementAreaSchema = new Schema({
    improvementId: String,
    improvementArea: { type: String, required: true },
    improvementAreaAr: String,

    category: {
        type: String,
        enum: ['technical', 'behavioral', 'leadership', 'communication', 'other']
    },

    currentLevel: String,
    desiredLevel: String,

    description: String,
    descriptionAr: String,

    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },

    impact: String,

    examples: [{
        example: String,
        date: Date
    }],

    developmentActions: [{
        action: String,
        timeline: String,
        resources: String
    }]
}, { _id: false });

// Development Plan Item Schema
const DevelopmentPlanItemSchema = new Schema({
    itemId: String,
    objectiveName: { type: String, required: true },
    objectiveNameAr: String,

    category: {
        type: String,
        enum: ['skill_development', 'knowledge_acquisition', 'behavior_change', 'career_progression', 'certification']
    },

    description: String,
    descriptionAr: String,

    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },

    // Timeline
    startDate: Date,
    targetDate: Date,

    // Actions
    developmentActions: [{
        actionId: String,
        actionType: {
            type: String,
            enum: ['training', 'mentoring', 'coaching', 'stretch_assignment', 'job_rotation', 'self_study', 'certification', 'conference']
        },
        actionDescription: String,
        trainingName: String,
        trainingProvider: String,
        trainingDuration: Number,
        trainingCost: Number,
        mentor: String,
        mentorRole: String,
        assignmentDetails: String,
        timeline: String,
        resources: String,
        status: {
            type: String,
            enum: ['not_started', 'in_progress', 'completed', 'cancelled'],
            default: 'not_started'
        },
        completionDate: Date,
        outcome: String,
        effectiveness: { type: Number, min: 1, max: 5 }
    }],

    // Success metrics
    successMetrics: [{
        metric: String,
        target: String,
        measurementMethod: String
    }],

    // Progress
    progress: { type: Number, default: 0, min: 0, max: 100 },
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed', 'on_hold'],
        default: 'not_started'
    },

    // Review
    lastReviewDate: Date,
    nextReviewDate: Date
}, { _id: false });

// Development Plan Schema
const DevelopmentPlanSchema = new Schema({
    required: { type: Boolean, default: true },

    items: [DevelopmentPlanItemSchema],

    trainingRecommendations: [String],

    mentorAssigned: {
        mentorId: { type: Schema.Types.ObjectId, ref: 'Employee' },
        mentorName: String,
        mentorNameAr: String,
        startDate: Date
    },

    careerPath: {
        currentRole: String,
        targetRole: String,
        timeframe: String,
        gapAnalysis: [String]
    },

    // Career aspirations
    careerAspirations: {
        shortTerm: String,
        mediumTerm: String,
        longTerm: String,
        targetRole: String,
        targetLevel: String,
        readiness: String,
        gapsToAddress: [String]
    },

    // Succession planning
    successionPlanning: {
        isSuccessor: { type: Boolean, default: false },
        successorFor: [String],
        readiness: {
            type: String,
            enum: ['ready_now', 'ready_1year', 'ready_2years', 'future_potential']
        },
        developmentNeeded: String
    }
}, { _id: false });

// Feedback Provider Schema (360)
const FeedbackProviderSchema = new Schema({
    providerId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    providerName: String,
    providerNameAr: String,
    providerRole: String,

    relationship: {
        type: String,
        enum: ['peer', 'direct_report', 'cross_functional', 'client', 'subordinate'],
        required: true
    },

    requestedAt: { type: Date, default: Date.now },
    completedAt: Date,

    status: {
        type: String,
        enum: ['pending', 'completed', 'declined'],
        default: 'pending'
    },

    anonymous: { type: Boolean, default: true }
}, { _id: false });

// Feedback Response Schema (360)
const FeedbackResponseSchema = new Schema({
    providerId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },

    ratings: [{
        competencyId: String,
        competency: String,
        rating: { type: Number, min: 1, max: 5 },
        comments: String
    }],

    overallRating: { type: Number, min: 1, max: 5 },

    strengths: String,
    areasForImprovement: String,
    specificFeedback: String,

    submittedAt: { type: Date, default: Date.now },
    anonymous: { type: Boolean, default: true }
}, { _id: false });

// 360 Feedback Schema
const Feedback360Schema = new Schema({
    enabled: { type: Boolean, default: false },

    providers: [FeedbackProviderSchema],
    responses: [FeedbackResponseSchema],

    // Aggregated ratings
    aggregatedRatings: [{
        competencyId: String,
        avgRating: Number,
        responseCount: Number
    }],

    // Summary
    summary: {
        commonStrengths: [String],
        commonDevelopmentAreas: [String],
        overallSentiment: { type: String, enum: ['positive', 'mixed', 'negative'] }
    },

    // Aggregated 360 scores
    aggregated360Scores: {
        selfRating: Number,
        managerRating: Number,
        peerAverageRating: Number,
        directReportsAverageRating: Number,
        clientAverageRating: Number,
        overall360Rating: Number,
        strengthsConsensus: [String],
        improvementConsensus: [String],
        selfVsOthersGap: Number
    }
}, { _id: false });

// Manager Assessment Schema
const ManagerAssessmentSchema = new Schema({
    completedAt: Date,

    // Overall comments
    overallComments: String,
    overallCommentsAr: String,

    // Key achievements
    keyAchievements: [{
        achievement: String,
        achievementAr: String,
        impact: String,
        date: Date
    }],

    // Performance highlights
    performanceHighlights: String,
    performanceHighlightsAr: String,

    // Areas assessment
    areasExceeded: [String],
    areasMet: [String],
    areasBelow: [String],

    // Detailed assessments
    improvementProgress: String,
    behavioralObservations: String,
    workQualityAssessment: String,
    collaborationAssessment: String,
    initiativeAssessment: String,
    adaptabilityAssessment: String,
    leadershipAssessment: String,
    technicalSkillsAssessment: String,
    communicationAssessment: String,
    attendanceAssessment: String,
    professionalismAssessment: String,

    // Overall rating
    overallRating: {
        type: String,
        enum: ['exceptional', 'exceeds_expectations', 'meets_expectations', 'needs_improvement', 'unsatisfactory']
    },
    ratingJustification: String,

    // Potential assessment
    potentialAssessment: {
        type: String,
        enum: ['high_potential', 'promotable', 'valued_contributor', 'development_needed']
    }
}, { _id: false });

// Recommendation Schema
const RecommendationSchema = new Schema({
    // Performance recommendation
    performanceRecommendation: {
        type: String,
        enum: ['exceeds', 'meets', 'needs_improvement', 'unsatisfactory']
    },

    // Promotion
    promotionRecommended: { type: Boolean, default: false },
    promotionTimeline: String,
    promotionToRole: String,
    promotionReadiness: String,
    promotionJustification: String,

    // Salary increase
    salaryIncreaseRecommended: { type: Boolean, default: false },
    salaryIncreasePercentage: Number,
    salaryIncreaseAmount: Number,
    salaryIncreaseJustification: String,
    salaryIncreaseEffectiveDate: Date,

    // Bonus
    bonusRecommended: { type: Boolean, default: false },
    bonusAmount: Number,
    bonusPercentage: Number,
    bonusJustification: String,

    // Development recommendations
    developmentRecommendations: [{
        recommendation: String,
        priority: { type: String, enum: ['low', 'medium', 'high'] },
        timeline: String
    }],

    // Role change
    roleChangeRecommended: { type: Boolean, default: false },
    suggestedRole: String,
    roleChangeReason: String,

    // Probation recommendation
    probationRecommendation: { type: String, enum: ['confirm', 'extend', 'terminate'] },

    // PIP
    pipRequired: { type: Boolean, default: false },
    pipReason: String,
    pipDuration: Number,
    pipObjectives: [String]
}, { _id: false });

// Employee Response Schema
const EmployeeResponseSchema = new Schema({
    responseProvided: { type: Boolean, default: false },
    responseDate: Date,

    agreesWithReview: Boolean,

    agreement: {
        overallRating: { type: String, enum: ['agree', 'partially_agree', 'disagree'] },
        competencies: { type: String, enum: ['agree', 'partially_agree', 'disagree'] },
        goals: { type: String, enum: ['agree', 'partially_agree', 'disagree'] }
    },

    employeeComments: String,
    employeeCommentsAr: String,

    disagreementAreas: [String],
    disagreementExplanation: String,

    additionalAchievements: String,
    supportRequested: String,
    careerGoalsAlignment: String,

    acknowledged: { type: Boolean, default: false },
    acknowledgedDate: Date,
    signature: String
}, { _id: false });

// Dispute Schema
const DisputeSchema = new Schema({
    disputed: { type: Boolean, default: false },
    disputeDate: Date,

    disputeReason: String,
    disputeDetails: String,

    disputeAreas: [{
        area: String,
        currentRating: Number,
        disputedRating: Number,
        justification: String,
        evidence: [String]
    }],

    disputeStatus: {
        type: String,
        enum: ['submitted', 'under_review', 'resolved', 'escalated'],
        default: 'submitted'
    },

    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewDate: Date,

    resolution: String,
    resolutionDate: Date,

    finalDecision: {
        type: String,
        enum: ['original_upheld', 'rating_adjusted', 'review_redone']
    },

    adjustedRating: Number,
    adjustmentReason: String
}, { _id: false });

// Approval Step Schema
const ApprovalStepSchema = new Schema({
    stepNumber: { type: Number, required: true },
    stepName: String,

    approverRole: { type: String, required: true },
    approverId: { type: Schema.Types.ObjectId, ref: 'User' },
    approverName: String,

    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'sent_back', 'skipped'],
        default: 'pending'
    },

    actionDate: Date,
    comments: String,

    changesRequested: [{
        field: String,
        requestedChange: String
    }]
}, { _id: false });

// Calibration Data Schema
const CalibrationDataSchema = new Schema({
    calibrated: { type: Boolean, default: false },
    calibrationDate: Date,

    calibrationSessionId: { type: Schema.Types.ObjectId, ref: 'CalibrationSession' },
    calibrationSession: String,
    calibrationParticipants: [String],

    preCalibrationRating: {
        type: String,
        enum: ['exceptional', 'exceeds_expectations', 'meets_expectations', 'needs_improvement', 'unsatisfactory']
    },
    postCalibrationRating: {
        type: String,
        enum: ['exceptional', 'exceeds_expectations', 'meets_expectations', 'needs_improvement', 'unsatisfactory']
    },

    calibratedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    ratingAdjusted: { type: Boolean, default: false },
    adjustmentReason: String,

    comparativeRanking: Number,
    distributionBucket: String,

    distributionCheck: {
        exceeds: Number,
        meets: Number,
        needsImprovement: Number,
        unsatisfactory: Number,
        meetsTarget: Boolean
    },

    calibrationNotes: String
}, { _id: false });

// Probation Review Schema
const ProbationReviewSchema = new Schema({
    isProbationReview: { type: Boolean, default: false },
    probationDay: Number, // 30, 60, 90
    probationEndDate: Date,

    recommendation: {
        type: String,
        enum: ['confirm', 'extend', 'terminate', 'pending']
    },

    extensionDays: Number,
    extensionReason: String,
    terminationReason: String
}, { _id: false });

// Document Schema
const ReviewDocumentSchema = new Schema({
    documentType: {
        type: String,
        enum: ['review_form', 'self_assessment', 'pip_document', 'development_plan', 'evidence', 'supporting_document', 'other']
    },
    documentName: String,
    fileName: String,
    fileUrl: String,
    fileSize: Number,
    uploadedOn: { type: Date, default: Date.now },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// MAIN PERFORMANCE REVIEW SCHEMA
// ═══════════════════════════════════════════════════════════════

const PerformanceReviewSchema = new Schema({
    // Unique Identifier
    reviewId: {
        type: String,
        unique: true
    },
    reviewNumber: String,

    // ─────────────────────────────────────────────────────────────
    // Employee Information
    // ─────────────────────────────────────────────────────────────
    employeeId: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
        index: true
    },
    employeeName: String,
    employeeNameAr: String,
    employeeNumber: String,

    department: String,
    departmentAr: String,
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', index: true },

    position: String,
    positionAr: String,

    // ─────────────────────────────────────────────────────────────
    // Reviewer Information
    // ─────────────────────────────────────────────────────────────
    reviewerId: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
        index: true
    },
    reviewerName: String,
    reviewerNameAr: String,
    reviewerTitle: String,

    // Manager (same as reviewer or different)
    managerId: { type: Schema.Types.ObjectId, ref: 'Employee', index: true },
    managerName: String,
    managerNameAr: String,

    // ─────────────────────────────────────────────────────────────
    // Review Type & Period
    // ─────────────────────────────────────────────────────────────
    reviewType: {
        type: String,
        enum: ['annual', 'mid_year', 'quarterly', 'monthly', 'probation', 'project_completion', '360_degree', 'peer_review', 'ad_hoc'],
        required: true,
        index: true
    },

    reviewPeriod: ReviewPeriodSchema,

    reviewCycle: String,
    reviewLanguage: { type: String, enum: ['arabic', 'english', 'both'], default: 'both' },

    // Probation specific
    probationReview: ProbationReviewSchema,

    // Project specific
    projectReview: {
        isProjectReview: { type: Boolean, default: false },
        projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
        projectName: String,
        projectCompletionDate: Date,
        projectOutcome: String
    },

    // Template
    templateId: { type: Schema.Types.ObjectId, ref: 'ReviewTemplate' },

    // ─────────────────────────────────────────────────────────────
    // Status
    // ─────────────────────────────────────────────────────────────
    status: {
        type: String,
        enum: ['draft', 'self_assessment', 'self_assessment_pending', 'manager_review', 'manager_review_pending', 'calibration', 'completed', 'acknowledged', 'disputed'],
        default: 'draft',
        index: true
    },
    statusAr: String,

    // ─────────────────────────────────────────────────────────────
    // Key Dates
    // ─────────────────────────────────────────────────────────────
    dueDate: Date,
    completedOn: Date,
    acknowledgedOn: Date,

    // ─────────────────────────────────────────────────────────────
    // Self Assessment
    // ─────────────────────────────────────────────────────────────
    selfAssessment: SelfAssessmentSchema,

    // ─────────────────────────────────────────────────────────────
    // Competencies Assessment
    // ─────────────────────────────────────────────────────────────
    competencies: [CompetencyRatingSchema],
    competencyFramework: String,

    // ─────────────────────────────────────────────────────────────
    // Goals & Objectives
    // ─────────────────────────────────────────────────────────────
    goals: [GoalSchema],

    // ─────────────────────────────────────────────────────────────
    // KPIs
    // ─────────────────────────────────────────────────────────────
    kpis: [KPISchema],

    // ─────────────────────────────────────────────────────────────
    // Attorney Metrics (Law Firm Specific)
    // ─────────────────────────────────────────────────────────────
    isAttorney: { type: Boolean, default: false },
    attorneyMetrics: AttorneyMetricsSchema,

    // ─────────────────────────────────────────────────────────────
    // Strengths & Improvements
    // ─────────────────────────────────────────────────────────────
    strengths: [StrengthSchema],
    areasForImprovement: [ImprovementAreaSchema],

    // ─────────────────────────────────────────────────────────────
    // Development Plan
    // ─────────────────────────────────────────────────────────────
    developmentPlan: DevelopmentPlanSchema,

    // ─────────────────────────────────────────────────────────────
    // 360 Feedback
    // ─────────────────────────────────────────────────────────────
    feedback360: Feedback360Schema,

    // ─────────────────────────────────────────────────────────────
    // Manager Assessment
    // ─────────────────────────────────────────────────────────────
    managerAssessment: ManagerAssessmentSchema,

    // ─────────────────────────────────────────────────────────────
    // Recommendations
    // ─────────────────────────────────────────────────────────────
    recommendations: RecommendationSchema,

    // ─────────────────────────────────────────────────────────────
    // Overall Rating & Score
    // ─────────────────────────────────────────────────────────────
    overallRating: { type: Number, min: 1, max: 5 },
    overallScore: { type: Number, min: 0, max: 5 },
    ratingScale: { type: String, enum: ['1-5', '1-100'], default: '1-5' },

    finalRating: {
        type: String,
        enum: ['exceptional', 'exceeds_expectations', 'meets_expectations', 'needs_improvement', 'unsatisfactory'],
        index: true
    },
    finalRatingAr: String,

    ratingLabel: String,
    ratingLabelAr: String,

    // ─────────────────────────────────────────────────────────────
    // Calculated Scores
    // ─────────────────────────────────────────────────────────────
    scores: {
        competencyAverage: Number,
        weightedCompetencyScore: Number,
        goalsAverage: Number,
        weightedGoalsScore: Number,
        totalGoalsAchievement: Number,
        kpiAverage: Number,
        weightedKPIScore: Number
    },

    // ─────────────────────────────────────────────────────────────
    // Employee Response
    // ─────────────────────────────────────────────────────────────
    employeeResponse: EmployeeResponseSchema,

    // ─────────────────────────────────────────────────────────────
    // Dispute
    // ─────────────────────────────────────────────────────────────
    dispute: DisputeSchema,

    // ─────────────────────────────────────────────────────────────
    // Approval Workflow
    // ─────────────────────────────────────────────────────────────
    approvalWorkflow: [ApprovalStepSchema],
    currentApprovalStep: Number,
    finalApprovalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    finalApprover: { type: Schema.Types.ObjectId, ref: 'User' },
    finalApprovalDate: Date,

    // ─────────────────────────────────────────────────────────────
    // Calibration
    // ─────────────────────────────────────────────────────────────
    calibration: CalibrationDataSchema,

    // ─────────────────────────────────────────────────────────────
    // Next Steps & Follow-up
    // ─────────────────────────────────────────────────────────────
    nextSteps: {
        nextReviewDate: Date,
        nextReviewType: String,

        followUpMeetings: [{
            meetingPurpose: String,
            scheduledDate: Date,
            completedDate: Date,
            outcome: String
        }],

        actionItems: [{
            actionId: String,
            action: String,
            owner: String,
            dueDate: Date,
            status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
            completionDate: Date
        }],

        nextPeriodGoals: [{
            goalName: String,
            targetMetric: String,
            targetValue: Number,
            dueDate: Date
        }]
    },

    // ─────────────────────────────────────────────────────────────
    // Documents
    // ─────────────────────────────────────────────────────────────
    documents: [ReviewDocumentSchema],

    // ─────────────────────────────────────────────────────────────
    // Analytics & Benchmarking
    // ─────────────────────────────────────────────────────────────
    analytics: {
        teamAverage: Number,
        positionVsTeam: { type: String, enum: ['above', 'at', 'below'] },
        departmentAverage: Number,
        positionVsDepartment: { type: String, enum: ['above', 'at', 'below'] },
        roleAverage: Number,
        positionVsRole: { type: String, enum: ['above', 'at', 'below'] },
        trend: { type: String, enum: ['improving', 'stable', 'declining'] },
        previousReviewRating: Number,
        ratingChange: Number,
        percentileRank: Number
    },

    // ─────────────────────────────────────────────────────────────
    // Notes
    // ─────────────────────────────────────────────────────────────
    notes: {
        reviewerNotes: String,
        hrNotes: String,
        calibrationNotes: String,
        systemNotes: [String]
    },

    // ─────────────────────────────────────────────────────────────
    // Related Records
    // ─────────────────────────────────────────────────────────────
    relatedRecords: {
        previousReviewId: { type: Schema.Types.ObjectId, ref: 'PerformanceReview' },
        nextScheduledReviewId: { type: Schema.Types.ObjectId, ref: 'PerformanceReview' },
        relatedGoalIds: [{ type: Schema.Types.ObjectId }],
        relatedTrainingIds: [{ type: Schema.Types.ObjectId }],
        relatedPromotionIds: [{ type: Schema.Types.ObjectId }],
        relatedDisciplinaryIds: [{ type: Schema.Types.ObjectId }],
        compensationChangeId: { type: Schema.Types.ObjectId },
        promotionId: { type: Schema.Types.ObjectId },
        pipId: { type: Schema.Types.ObjectId },
        trainingPlanId: { type: Schema.Types.ObjectId }
    },

    // ─────────────────────────────────────────────────────────────
    // Multi-tenancy
    // ─────────────────────────────────────────────────────────────
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // ─────────────────────────────────────────────────────────────
    // Audit
    // ─────────────────────────────────────────────────────────────
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastModifiedAt: Date,

    // Soft delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

PerformanceReviewSchema.index({ firmId: 1, employeeId: 1, 'reviewPeriod.startDate': -1 });
PerformanceReviewSchema.index({ firmId: 1, reviewerId: 1, status: 1 });
PerformanceReviewSchema.index({ firmId: 1, departmentId: 1, reviewType: 1, status: 1 });
PerformanceReviewSchema.index({ firmId: 1, 'reviewPeriod.reviewDueDate': 1, status: 1 });
PerformanceReviewSchema.index({ firmId: 1, finalRating: 1 });
PerformanceReviewSchema.index({ firmId: 1, createdAt: -1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════

// Calculate competency average score
PerformanceReviewSchema.virtual('competencyAvgScore').get(function() {
    if (!this.competencies || this.competencies.length === 0) return null;
    const rated = this.competencies.filter(c => c.managerRating);
    if (rated.length === 0) return null;

    let totalWeight = 0;
    let weightedSum = 0;

    rated.forEach(c => {
        const weight = c.weight || 10;
        weightedSum += c.managerRating * weight;
        totalWeight += weight;
    });

    return totalWeight > 0 ? parseFloat((weightedSum / totalWeight).toFixed(2)) : null;
});

// Calculate goals achievement percentage
PerformanceReviewSchema.virtual('goalsAchievement').get(function() {
    if (!this.goals || this.goals.length === 0) return null;
    const achieved = this.goals.filter(g => g.status === 'completed' || g.status === 'exceeded').length;
    return parseFloat(((achieved / this.goals.length) * 100).toFixed(1));
});

// Calculate KPI achievement average
PerformanceReviewSchema.virtual('kpiAvgAchievement').get(function() {
    if (!this.kpis || this.kpis.length === 0) return null;
    const withActual = this.kpis.filter(k => k.actual !== undefined);
    if (withActual.length === 0) return null;

    const totalAchievement = withActual.reduce((sum, k) => sum + (k.achievementPercentage || 0), 0);
    return parseFloat((totalAchievement / withActual.length).toFixed(1));
});

// Check if review is overdue
PerformanceReviewSchema.virtual('isOverdue').get(function() {
    if (this.status === 'completed' || this.status === 'acknowledged') return false;
    return new Date() > new Date(this.reviewPeriod?.reviewDueDate || this.dueDate);
});

// Days until due
PerformanceReviewSchema.virtual('daysUntilDue').get(function() {
    if (this.status === 'completed' || this.status === 'acknowledged') return null;
    const now = new Date();
    const due = new Date(this.reviewPeriod?.reviewDueDate || this.dueDate);
    const diffTime = due - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

PerformanceReviewSchema.pre('save', async function(next) {
    // Generate review ID
    if (this.isNew && !this.reviewId) {
        const year = new Date().getFullYear();
        const count = await mongoose.model('PerformanceReview').countDocuments({
            firmId: this.firmId,
            createdAt: {
                $gte: new Date(year, 0, 1),
                $lt: new Date(year + 1, 0, 1)
            }
        });
        this.reviewId = `REV-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    // Generate goal IDs
    if (this.goals) {
        this.goals.forEach((goal, idx) => {
            if (!goal.goalId) {
                goal.goalId = `GOAL-${this.reviewId}-${idx + 1}`;
            }
        });
    }

    // Generate KPI IDs
    if (this.kpis) {
        this.kpis.forEach((kpi, idx) => {
            if (!kpi.kpiId) {
                kpi.kpiId = `KPI-${this.reviewId}-${idx + 1}`;
            }
            // Calculate achievement percentage
            if (kpi.target && kpi.actual !== undefined) {
                kpi.achievementPercentage = parseFloat(((kpi.actual / kpi.target) * 100).toFixed(1));

                // Determine performance level
                if (kpi.achievementPercentage < 60) kpi.performanceLevel = 'below_threshold';
                else if (kpi.achievementPercentage < 80) kpi.performanceLevel = 'meets_threshold';
                else if (kpi.achievementPercentage < 100) kpi.performanceLevel = 'meets_target';
                else if (kpi.achievementPercentage < 120) kpi.performanceLevel = 'exceeds_target';
                else kpi.performanceLevel = 'stretch';

                // Calculate rating from achievement
                if (kpi.achievementPercentage >= 120) kpi.rating = 5;
                else if (kpi.achievementPercentage >= 100) kpi.rating = 4;
                else if (kpi.achievementPercentage >= 80) kpi.rating = 3;
                else if (kpi.achievementPercentage >= 60) kpi.rating = 2;
                else kpi.rating = 1;
            }
        });
    }

    // Update status Arabic translation
    const statusTranslations = {
        'draft': 'مسودة',
        'self_assessment': 'التقييم الذاتي',
        'self_assessment_pending': 'بانتظار التقييم الذاتي',
        'manager_review': 'مراجعة المدير',
        'manager_review_pending': 'بانتظار مراجعة المدير',
        'calibration': 'المعايرة',
        'completed': 'مكتمل',
        'acknowledged': 'تم الإقرار',
        'disputed': 'متنازع عليه'
    };
    this.statusAr = statusTranslations[this.status] || this.status;

    // Update final rating Arabic translation
    const ratingTranslations = {
        'exceptional': 'استثنائي',
        'exceeds_expectations': 'يتجاوز التوقعات',
        'meets_expectations': 'يلبي التوقعات',
        'needs_improvement': 'يحتاج تحسين',
        'unsatisfactory': 'غير مرضي'
    };
    if (this.finalRating) {
        this.finalRatingAr = ratingTranslations[this.finalRating];
    }

    this.lastModifiedAt = new Date();

    next();
});

// Pre-find: Exclude soft deleted
PerformanceReviewSchema.pre(/^find/, function(next) {
    if (this.getQuery().includeDeleted !== true) {
        this.where({ isDeleted: false });
    }
    next();
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Calculate and update overall score
PerformanceReviewSchema.methods.calculateOverallScore = function() {
    let totalWeight = 0;
    let weightedSum = 0;

    // Competencies (typically 40% weight)
    if (this.competencies && this.competencies.length > 0) {
        const compAvg = this.competencyAvgScore;
        if (compAvg) {
            weightedSum += compAvg * 40;
            totalWeight += 40;
        }
    }

    // Goals (typically 40% weight)
    if (this.goals && this.goals.length > 0) {
        const goalsRated = this.goals.filter(g => g.managerRating);
        if (goalsRated.length > 0) {
            let goalTotalWeight = 0;
            let goalWeightedSum = 0;
            goalsRated.forEach(g => {
                const weight = g.weight || 20;
                goalWeightedSum += g.managerRating * weight;
                goalTotalWeight += weight;
            });
            if (goalTotalWeight > 0) {
                const goalsAvg = goalWeightedSum / goalTotalWeight;
                weightedSum += goalsAvg * 40;
                totalWeight += 40;
            }
        }
    }

    // KPIs (typically 20% weight)
    if (this.kpis && this.kpis.length > 0) {
        const kpisRated = this.kpis.filter(k => k.rating);
        if (kpisRated.length > 0) {
            let kpiTotalWeight = 0;
            let kpiWeightedSum = 0;
            kpisRated.forEach(k => {
                const weight = k.weight || 10;
                kpiWeightedSum += k.rating * weight;
                kpiTotalWeight += weight;
            });
            if (kpiTotalWeight > 0) {
                const kpisAvg = kpiWeightedSum / kpiTotalWeight;
                weightedSum += kpisAvg * 20;
                totalWeight += 20;
            }
        }
    }

    if (totalWeight > 0) {
        this.overallScore = parseFloat((weightedSum / totalWeight).toFixed(2));
    }

    // Update scores object
    this.scores = {
        competencyAverage: this.competencyAvgScore,
        goalsAverage: this.goals?.length > 0 ?
            this.goals.filter(g => g.managerRating).reduce((sum, g) => sum + g.managerRating, 0) /
            this.goals.filter(g => g.managerRating).length : null,
        totalGoalsAchievement: this.goalsAchievement,
        kpiAverage: this.kpiAvgAchievement
    };

    return this.overallScore;
};

// Determine rating from score
PerformanceReviewSchema.methods.determineRatingFromScore = function() {
    if (!this.overallScore) return null;

    if (this.overallScore >= 4.5) return 'exceptional';
    if (this.overallScore >= 3.5) return 'exceeds_expectations';
    if (this.overallScore >= 2.5) return 'meets_expectations';
    if (this.overallScore >= 1.5) return 'needs_improvement';
    return 'unsatisfactory';
};

// Transition status
PerformanceReviewSchema.methods.transitionTo = function(newStatus) {
    const validTransitions = {
        'draft': ['self_assessment', 'self_assessment_pending'],
        'self_assessment_pending': ['self_assessment'],
        'self_assessment': ['manager_review', 'manager_review_pending'],
        'manager_review_pending': ['manager_review'],
        'manager_review': ['calibration', 'completed'],
        'calibration': ['completed'],
        'completed': ['acknowledged', 'disputed'],
        'acknowledged': ['disputed'],
        'disputed': ['completed', 'acknowledged']
    };

    if (!validTransitions[this.status]?.includes(newStatus)) {
        throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
    }

    this.status = newStatus;
    return this;
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get reviews by period year
PerformanceReviewSchema.statics.getByPeriodYear = function(year, firmId, filters = {}) {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    return this.find({
        firmId,
        'reviewPeriod.startDate': { $gte: startOfYear, $lte: endOfYear },
        isDeleted: false,
        ...filters
    }).sort({ createdAt: -1 });
};

// Get rating distribution
PerformanceReviewSchema.statics.getRatingDistribution = async function(firmId, year, departmentId) {
    const match = {
        firmId: mongoose.Types.ObjectId(firmId),
        status: { $in: ['completed', 'acknowledged'] },
        finalRating: { $ne: null },
        isDeleted: false
    };

    if (year) {
        match['reviewPeriod.startDate'] = {
            $gte: new Date(year, 0, 1),
            $lte: new Date(year, 11, 31, 23, 59, 59)
        };
    }

    if (departmentId) {
        match.departmentId = mongoose.Types.ObjectId(departmentId);
    }

    const result = await this.aggregate([
        { $match: match },
        {
            $group: {
                _id: '$finalRating',
                count: { $sum: 1 }
            }
        }
    ]);

    const total = result.reduce((sum, r) => sum + r.count, 0);

    return result.map(r => ({
        rating: r._id,
        count: r.count,
        percentage: total > 0 ? parseFloat(((r.count / total) * 100).toFixed(1)) : 0
    }));
};

// Get overdue reviews
PerformanceReviewSchema.statics.getOverdueReviews = function(firmId) {
    return this.find({
        firmId,
        status: { $nin: ['completed', 'acknowledged'] },
        $or: [
            { 'reviewPeriod.reviewDueDate': { $lt: new Date() } },
            { dueDate: { $lt: new Date() } }
        ],
        isDeleted: false
    }).populate('employeeId', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic employeeId');
};

// Get employee performance history
PerformanceReviewSchema.statics.getEmployeeHistory = function(employeeId, firmId) {
    return this.find({
        employeeId,
        firmId,
        status: { $in: ['completed', 'acknowledged'] },
        isDeleted: false
    })
    .sort({ 'reviewPeriod.endDate': -1 })
    .select('reviewId reviewType reviewPeriod finalRating overallScore selfAssessment.developmentNeeds managerAssessment.areasExceeded managerAssessment.areasBelow');
};

module.exports = mongoose.model('PerformanceReview', PerformanceReviewSchema);
