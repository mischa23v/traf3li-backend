const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Criticality Factor Schema
const criticalityFactorSchema = new mongoose.Schema({
    factor: {
        type: String,
        enum: ['revenue_impact', 'operational_impact', 'client_impact', 'regulatory_impact',
               'strategic_importance', 'unique_expertise', 'hard_to_replace', 'succession_gap']
    },
    rating: { type: Number, min: 1, max: 5 },
    weight: Number,
    justification: String
}, { _id: true });

// Impact Area Schema
const impactAreaSchema = new mongoose.Schema({
    area: {
        type: String,
        enum: ['revenue', 'operations', 'clients', 'team_morale', 'strategy',
               'compliance', 'reputation', 'innovation']
    },
    impactDescription: String,
    severity: { type: String, enum: ['high', 'medium', 'low'] },
    quantifiableImpact: {
        metric: String,
        estimatedLoss: Number,
        timeframe: String
    }
}, { _id: true });

// Risk Factor Schema
const riskFactorSchema = new mongoose.Schema({
    factor: {
        type: String,
        enum: ['incumbent_retirement', 'incumbent_health', 'flight_risk', 'no_successors',
               'long_time_to_fill', 'competitive_market', 'unique_skills', 'institutional_knowledge']
    },
    riskRating: { type: String, enum: ['high', 'medium', 'low'] },
    mitigation: String
}, { _id: true });

// Readiness Factor Schema
const readinessFactorSchema = new mongoose.Schema({
    factor: {
        type: String,
        enum: ['technical_skills', 'leadership_skills', 'experience', 'competencies',
               'cultural_fit', 'performance_history', 'potential']
    },
    currentLevel: { type: String, enum: ['below', 'meets', 'exceeds'] },
    targetLevel: { type: String, enum: ['below', 'meets', 'exceeds'] },
    gap: { type: String, enum: ['large', 'moderate', 'small', 'none'] },
    rating: { type: Number, min: 1, max: 5 },
    comments: String
}, { _id: true });

// Qualification Gap Schema
const qualificationGapSchema = new mongoose.Schema({
    gapType: {
        type: String,
        enum: ['education', 'experience', 'skill', 'competency', 'certification']
    },
    gapDescription: String,
    severity: { type: String, enum: ['critical', 'important', 'minor'] },
    bridgeable: { type: Boolean, default: true },
    timeToClose: Number,
    developmentPlan: String
}, { _id: true });

// Development Objective Schema
const developmentObjectiveSchema = new mongoose.Schema({
    objectiveId: String,
    objective: { type: String, required: false },
    objectiveAr: String,
    objectiveType: {
        type: String,
        enum: ['skill_development', 'experience_gain', 'knowledge_acquisition',
               'competency_building', 'exposure', 'certification']
    },
    priority: { type: String, enum: ['critical', 'high', 'medium', 'low'] },
    targetDate: Date,
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed', 'on_hold'],
        default: 'not_started'
    },
    completionPercentage: { type: Number, default: 0 },
    owner: String
}, { _id: true });

// Development Activity Schema
const developmentActivitySchema = new mongoose.Schema({
    activityId: String,
    activityType: {
        type: String,
        enum: ['training', 'mentoring', 'coaching', 'job_rotation', 'stretch_assignment',
               'acting_role', 'shadowing', 'special_project', 'education', 'certification']
    },
    activityDescription: String,
    skillsTargeted: [String],
    startDate: Date,
    endDate: Date,
    duration: Number,
    status: {
        type: String,
        enum: ['planned', 'in_progress', 'completed', 'cancelled'],
        default: 'planned'
    },
    cost: Number,
    effectiveness: {
        assessed: { type: Boolean, default: false },
        effectivenessRating: { type: String, enum: ['high', 'medium', 'low'] },
        outcomes: String
    }
}, { _id: true });

// Stretch Assignment Schema
const stretchAssignmentSchema = new mongoose.Schema({
    assignmentName: String,
    assignmentType: {
        type: String,
        enum: ['project_lead', 'task_force', 'committee', 'cross_functional', 'new_initiative']
    },
    startDate: Date,
    endDate: Date,
    skillsDeveloped: [String],
    outcome: String,
    successLevel: { type: String, enum: ['exceeded', 'met', 'below'] }
}, { _id: true });

// Successor Schema
const successorSchema = new mongoose.Schema({
    successorId: { type: String, required: false },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    employeeNumber: String,
    employeeName: { type: String, required: false },
    employeeNameAr: String,
    currentJobTitle: String,
    currentDepartment: String,
    currentJobLevel: String,
    targetJobLevel: String,
    levelGap: Number,

    // Readiness Assessment
    readinessAssessment: {
        readinessLevel: {
            type: String,
            enum: ['ready_now', 'ready_1_year', 'ready_2_3_years', 'ready_4_5_years', 'long_term', 'not_ready'],
            default: 'not_ready'
        },
        readinessLevelAr: String,
        readinessScore: { type: Number, min: 0, max: 100 },
        assessmentDate: Date,
        assessedBy: String,
        readinessFactors: [readinessFactorSchema],
        overallReadiness: { type: String, enum: ['ready', 'nearly_ready', 'developing', 'not_ready'] }
    },

    // Ranking
    successorRanking: {
        rank: { type: Number, required: false },
        rankingType: {
            type: String,
            enum: ['primary', 'backup', 'emergency', 'long_term']
        },
        rankingRationale: String,
        probability: Number
    },

    // Qualifications Match
    qualificationsMatch: {
        overallMatch: Number,
        educationMatch: { type: String, enum: ['exceeds', 'meets', 'gaps'] },
        experienceMatch: { type: String, enum: ['exceeds', 'meets', 'gaps'] },
        skillsMatch: { type: String, enum: ['exceeds', 'meets', 'gaps'] },
        competenciesMatch: { type: String, enum: ['exceeds', 'meets', 'gaps'] },
        gaps: [qualificationGapSchema],
        strengths: [{
            strengthArea: String,
            strengthDescription: String,
            advantage: { type: String, enum: ['significant', 'moderate', 'slight'] }
        }]
    },

    // Performance & Potential
    performancePotential: {
        currentPerformance: {
            latestRating: Number,
            ratingLabel: String,
            ratingPeriod: String,
            consistentPerformer: { type: Boolean, default: false },
            performanceHistory: [{
                period: String,
                rating: Number
            }],
            averageRating: Number
        },
        potential: {
            potentialRating: { type: String, enum: ['high', 'medium', 'low'] },
            promotable: { type: Boolean, default: false },
            careerAspirations: String,
            nineBoxPosition: String,
            highPotential: { type: Boolean, default: false }
        },
        trackRecord: {
            promotions: Number,
            lastPromotionDate: Date,
            lateralMoves: Number,
            projectLeadershipExperience: { type: Boolean, default: false },
            specialAssignments: [String]
        }
    },

    // Development Plan
    developmentPlan: {
        planExists: { type: Boolean, default: false },
        developmentObjectives: [developmentObjectiveSchema],
        developmentActivities: [developmentActivitySchema],
        totalDevelopmentCost: Number,
        planProgress: Number,
        onTrack: { type: Boolean, default: true },
        nextReviewDate: Date
    },

    // Mentoring & Coaching
    mentoringCoaching: {
        hasMentor: { type: Boolean, default: false },
        mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        mentorName: String,
        mentoringStartDate: Date,
        mentoringFrequency: String,
        mentoringFocus: [String],
        hasCoach: { type: Boolean, default: false },
        coachType: { type: String, enum: ['internal', 'external'] },
        coachName: String,
        coachingFocus: [String],
        sponsorship: {
            hasSponsor: { type: Boolean, default: false },
            sponsorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
            sponsorName: String,
            sponsorLevel: String
        }
    },

    // Experience Building
    experienceBuilding: {
        stretchAssignments: [stretchAssignmentSchema],
        actingRoles: [{
            positionTitle: String,
            startDate: Date,
            endDate: Date,
            duration: Number,
            performanceInRole: String,
            keyLearnings: String
        }],
        jobRotations: [{
            department: String,
            role: String,
            startDate: Date,
            endDate: Date,
            purposeOfRotation: String,
            competenciesGained: [String]
        }],
        crossFunctionalExposure: {
            departmentsWorkedWith: [String],
            functionsExposedTo: [String],
            geographicExposure: [String],
            clientExposure: [String]
        }
    },

    // Readiness Indicators
    readinessIndicators: {
        positiveIndicators: [{
            indicator: String,
            evidence: String
        }],
        concerns: [{
            concern: String,
            severity: { type: String, enum: ['high', 'medium', 'low'] },
            mitigation: String
        }],
        redFlags: [{
            redFlag: String,
            blocking: { type: Boolean, default: false },
            resolution: String
        }]
    },

    // Mobility & Availability
    mobilityAvailability: {
        geographicMobility: { type: Boolean, default: false },
        willingToRelocate: { type: Boolean, default: false },
        relocateLocations: [String],
        relocationRestrictions: String,
        availability: {
            availableDate: Date,
            noticePeriod: Number,
            contractualObligations: { type: Boolean, default: false },
            personalCommitments: String
        },
        travelWillingness: { type: Boolean, default: true },
        travelLimitations: String
    },

    // Interest & Commitment
    interestCommitment: {
        expressedInterest: { type: Boolean, default: false },
        interestLevel: { type: String, enum: ['high', 'medium', 'low', 'unknown'] },
        careerAspirations: String,
        committed: { type: Boolean, default: false },
        discussedWithSuccessor: { type: Boolean, default: false },
        discussionDate: Date,
        successorComments: String,
        reservations: [String]
    },

    // Risk Factors
    riskFactors: {
        flightRisk: { type: String, enum: ['high', 'medium', 'low'] },
        competingOffers: { type: Boolean, default: false },
        externalRecruitment: { type: Boolean, default: false },
        familyConsiderations: String,
        healthConcerns: { type: Boolean, default: false },
        retentionActions: [{
            action: String,
            actionDate: Date,
            effectiveness: String
        }]
    },

    // Assessment Notes
    assessmentNotes: {
        strengths: String,
        developmentNeeds: String,
        recommendationForSuccession: String,
        confidenceLevel: { type: String, enum: ['high', 'medium', 'low'] },
        alternativeRoles: [String],
        assessorComments: String
    }
}, { _id: true });

// Knowledge Area Schema
const knowledgeAreaSchema = new mongoose.Schema({
    knowledgeArea: String,
    criticalityLevel: { type: String, enum: ['critical', 'important', 'nice_to_have'] },
    currentDocumentation: { type: String, enum: ['complete', 'partial', 'minimal', 'none'] },
    documentationGap: { type: String, enum: ['high', 'medium', 'low', 'none'] },
    transferMethod: {
        type: String,
        enum: ['documentation', 'mentoring', 'shadowing', 'training', 'job_rotation', 'multiple']
    },
    transferTimeline: Number,
    transferStatus: { type: String, enum: ['not_started', 'in_progress', 'completed'] },
    transferProgress: Number
}, { _id: true });

// Emergency Scenario Schema
const emergencyScenarioSchema = new mongoose.Schema({
    scenarioType: {
        type: String,
        enum: ['sudden_departure', 'illness', 'death', 'termination', 'other']
    },
    scenarioDescription: String,
    likelihood: { type: String, enum: ['high', 'medium', 'low'] },
    impact: { type: String, enum: ['severe', 'significant', 'moderate', 'minimal'] },
    emergencySuccessor: {
        employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        employeeName: String,
        currentRole: String,
        assignmentType: { type: String, enum: ['acting', 'interim', 'permanent'] },
        readiness: { type: String, enum: ['ready', 'limited_ready', 'not_ready'] },
        supportRequired: String,
        maxDuration: Number
    },
    contingencyActions: [{
        action: String,
        actionType: { type: String, enum: ['immediate', 'short_term', 'medium_term'] },
        responsible: String,
        timeline: String,
        priority: { type: String, enum: ['critical', 'high', 'medium', 'low'] }
    }],
    communicationPlan: {
        stakeholders: [String],
        messagingKey: String,
        announcementTimeline: String
    }
}, { _id: true });

// Action Item Schema
const actionItemSchema = new mongoose.Schema({
    actionId: String,
    actionType: {
        type: String,
        enum: ['development', 'recruitment', 'retention', 'knowledge_transfer',
               'documentation', 'assessment', 'communication', 'policy_change']
    },
    actionDescription: String,
    actionDescriptionAr: String,
    priority: { type: String, enum: ['critical', 'high', 'medium', 'low'] },
    responsible: String,
    responsibleRole: String,
    targetDate: Date,
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled'],
        default: 'not_started'
    },
    completionDate: Date,
    progress: Number,
    budget: Number,
    dependencies: [String],
    risks: [String],
    outcomes: String
}, { _id: true });

// Review Entry Schema
const reviewEntrySchema = new mongoose.Schema({
    reviewId: String,
    reviewDate: Date,
    reviewType: {
        type: String,
        enum: ['quarterly', 'semi_annual', 'annual', 'ad_hoc', 'talent_review']
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewerName: String,
    reviewerTitle: String,
    reviewFindings: String,
    changesRecommended: { type: Boolean, default: false },
    recommendedChanges: [String],
    actionItems: [String],
    nextReviewDate: Date,
    reviewDocument: String
}, { _id: true });

// Document Schema
const documentSchema = new mongoose.Schema({
    documentType: {
        type: String,
        enum: ['succession_plan', 'readiness_assessment', 'development_plan',
               'knowledge_transfer_plan', 'emergency_plan', 'talent_review',
               'approval_document', 'org_chart', 'competency_matrix', 'other']
    },
    documentName: String,
    documentNameAr: String,
    fileUrl: String,
    version: String,
    effectiveDate: Date,
    expiryDate: Date,
    uploadedOn: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    confidential: { type: Boolean, default: true },
    accessLevel: {
        type: String,
        enum: ['restricted', 'management', 'hr', 'public'],
        default: 'restricted'
    }
}, { _id: true });

// Communication Entry Schema
const communicationEntrySchema = new mongoose.Schema({
    communicationId: String,
    communicationType: {
        type: String,
        enum: ['email', 'meeting', 'presentation', 'memo', 'portal_update']
    },
    date: Date,
    purpose: {
        type: String,
        enum: ['plan_announcement', 'successor_notification', 'development_plan',
               'progress_update', 'transition_announcement', 'stakeholder_update']
    },
    audience: {
        type: String,
        enum: ['incumbent', 'successors', 'management', 'board', 'hr', 'department', 'all']
    },
    confidential: { type: Boolean, default: true },
    communicatedBy: String,
    subject: String,
    message: String,
    attachments: [String],
    responseRequired: { type: Boolean, default: false }
}, { _id: true });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const successionPlanSchema = new mongoose.Schema({
    // ==================== IDENTIFICATION ====================
    successionPlanId: { type: String, unique: true, sparse: true },
    planNumber: { type: String, unique: true, sparse: true },

    // ==================== MULTI-TENANCY ====================
    firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', index: true },
    lawyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    // ==================== PLAN DETAILS ====================
    planDetails: {
        planName: String,
        planNameAr: String,
        planType: {
            type: String,
            enum: ['position_specific', 'department_wide', 'enterprise_wide',
                   'leadership_pipeline', 'critical_roles', 'emergency'],
            default: 'position_specific'
        },
        planScope: {
            type: String,
            enum: ['single_position', 'multiple_positions', 'job_family',
                   'organizational_unit', 'entire_organization'],
            default: 'single_position'
        },
        planningHorizon: {
            type: String,
            enum: ['immediate', 'short_term', 'medium_term', 'long_term']
        },
        planningPeriod: {
            startDate: Date,
            endDate: Date,
            planDuration: Number
        },
        planOwner: {
            employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
            employeeName: String,
            jobTitle: String,
            department: String
        },
        planPurpose: String,
        planPurposeAr: String,
        businessJustification: String,
        reviewFrequency: {
            type: String,
            enum: ['quarterly', 'semi_annual', 'annual', 'biennial', 'as_needed'],
            default: 'annual'
        },
        lastReviewDate: Date,
        nextReviewDate: Date,
        reviewedBy: String
    },

    // ==================== CRITICAL POSITION ====================
    criticalPosition: {
        positionId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPosition', required: false, index: true },
        positionNumber: String,
        positionTitle: { type: String, required: false },
        positionTitleAr: String,
        jobLevel: String,
        jobGrade: String,
        departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrganizationalUnit' },
        departmentName: String,
        divisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrganizationalUnit' },
        divisionName: String,
        businessUnit: String,
        location: String,
        positionType: {
            type: String,
            enum: ['executive', 'senior_management', 'management', 'professional', 'technical', 'specialized']
        },
        reportsTo: {
            positionId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPosition' },
            positionTitle: String,
            incumbentName: String
        },
        directReports: Number,
        indirectReports: Number,

        // Criticality Assessment
        criticalityAssessment: {
            criticalityLevel: {
                type: String,
                enum: ['critical', 'important', 'standard', 'low'],
                required: false
            },
            criticalityRating: { type: Number, min: 1, max: 10 },
            criticalityFactors: [criticalityFactorSchema],
            totalCriticalityScore: Number,
            assessedDate: Date,
            assessedBy: String
        },

        // Impact of Vacancy
        impactOfVacancy: {
            impactLevel: { type: String, enum: ['severe', 'significant', 'moderate', 'minimal'] },
            impactAreas: [impactAreaSchema],
            overallImpactDescription: String
        },

        // Vacancy Risk
        vacancyRisk: {
            riskLevel: { type: String, enum: ['high', 'medium', 'low'], required: false },
            riskFactors: [riskFactorSchema],
            estimatedTimeToReplace: {
                timeframe: Number,
                basis: { type: String, enum: ['historical_data', 'market_analysis', 'expert_estimate'] },
                confidence: { type: String, enum: ['high', 'medium', 'low'] }
            },
            costOfVacancy: {
                directCosts: Number,
                indirectCosts: Number,
                totalEstimatedCost: Number,
                costPerDay: Number
            }
        }
    },

    // ==================== INCUMBENT ====================
    incumbent: {
        employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: false, index: true },
        employeeNumber: String,
        employeeName: { type: String, required: false },
        employeeNameAr: String,
        nationalId: String,
        email: String,
        phone: String,
        currentJobTitle: String,
        dateInPosition: Date,
        tenureInPosition: Number,
        dateInOrganization: Date,
        totalTenure: Number,
        dateOfBirth: Date,
        currentAge: Number,

        // Retirement
        retirementEligibility: {
            eligible: { type: Boolean, default: false },
            eligibilityDate: Date,
            plannedRetirementDate: Date,
            yearsUntilRetirement: Number,
            retirementRisk: { type: String, enum: ['high', 'medium', 'low'] }
        },

        // Performance
        currentPerformance: {
            latestRating: Number,
            ratingLabel: String,
            ratingDate: Date,
            consistentHighPerformer: { type: Boolean, default: false },
            performanceTrend: { type: String, enum: ['improving', 'stable', 'declining'] },
            strengths: [String],
            developmentAreas: [String]
        },

        // Potential
        potential: {
            potentialRating: { type: String, enum: ['high', 'medium', 'low'] },
            promotable: { type: Boolean, default: false },
            promotabilityTimeline: String,
            nineBoxPosition: {
                performance: { type: String, enum: ['high', 'medium', 'low'] },
                potential: { type: String, enum: ['high', 'medium', 'low'] },
                category: {
                    type: String,
                    enum: ['star', 'high_professional', 'growth_employee', 'key_player',
                           'core_player', 'inconsistent_player', 'high_potential',
                           'solid_performer', 'under_performer']
                }
            }
        },

        // Retention Risk
        retentionRisk: {
            flightRisk: { type: String, enum: ['high', 'medium', 'low'] },
            riskFactors: [{
                factor: {
                    type: String,
                    enum: ['compensation', 'career_growth', 'engagement', 'market_demand',
                           'personal_circumstances', 'offers_received']
                },
                riskLevel: { type: String, enum: ['high', 'medium', 'low'] }
            }],
            retentionStrategies: [{
                strategy: String,
                strategyType: {
                    type: String,
                    enum: ['compensation', 'recognition', 'development', 'special_project',
                           'promotion', 'flexibility']
                },
                implemented: { type: Boolean, default: false },
                implementationDate: Date,
                effectiveness: { type: String, enum: ['high', 'medium', 'low'] }
            }],
            retentionPlan: {
                planInPlace: { type: Boolean, default: false },
                planUrl: String,
                lastReviewDate: Date
            }
        },

        // Critical Knowledge
        criticalKnowledge: {
            uniqueExpertise: [{
                expertiseArea: String,
                criticalityLevel: { type: String, enum: ['critical', 'important', 'nice_to_have'] },
                replaceability: { type: String, enum: ['easy', 'moderate', 'difficult', 'very_difficult'] },
                documentationLevel: {
                    type: String,
                    enum: ['well_documented', 'partially_documented', 'poorly_documented', 'not_documented']
                }
            }],
            institutionalKnowledge: {
                yearsOfInstitutionalKnowledge: Number,
                knowledgeAreas: [String],
                transferability: { type: String, enum: ['easy', 'moderate', 'difficult'] }
            },
            relationships: {
                keyClientRelationships: Number,
                keyVendorRelationships: Number,
                keyInternalRelationships: Number,
                relationshipTransferability: { type: String, enum: ['easy', 'moderate', 'difficult'] }
            }
        },

        // Incumbent Perspective
        incumbentPerspective: {
            successionDiscussed: { type: Boolean, default: false },
            discussionDate: Date,
            willingToMentor: { type: Boolean, default: false },
            recommendedSuccessors: [{
                employeeName: String,
                employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
                recommendation: String
            }],
            knowledgeTransferPlan: {
                planExists: { type: Boolean, default: false },
                planUrl: String,
                startDate: Date,
                targetCompletionDate: Date,
                completionPercentage: Number
            },
            transitionTimeline: {
                preferredTimeline: String,
                noticePeriod: Number,
                transitionSupport: { type: Boolean, default: false },
                supportDuration: Number
            }
        }
    },

    // ==================== SUCCESSORS ====================
    successors: [successorSchema],
    successorsCount: { type: Number, default: 0 },
    readyNowCount: { type: Number, default: 0 },

    // ==================== BENCH STRENGTH ====================
    benchStrength: {
        overallBenchStrength: {
            type: String,
            enum: ['strong', 'adequate', 'weak', 'none']
        },
        benchStrengthRating: Number,
        readinessDistribution: {
            readyNow: { type: Number, default: 0 },
            ready1Year: { type: Number, default: 0 },
            ready2to3Years: { type: Number, default: 0 },
            ready4to5Years: { type: Number, default: 0 },
            longTerm: { type: Number, default: 0 },
            notReady: { type: Number, default: 0 },
            total: { type: Number, default: 0 }
        },
        successorQuality: {
            highQuality: { type: Number, default: 0 },
            mediumQuality: { type: Number, default: 0 },
            developingQuality: { type: Number, default: 0 },
            averageReadinessScore: Number,
            diversityOfSuccessors: {
                genderDiverse: { type: Boolean, default: false },
                nationalityDiverse: { type: Boolean, default: false },
                backgroundDiverse: { type: Boolean, default: false },
                diversityScore: Number
            }
        },
        gapAnalysis: {
            hasGaps: { type: Boolean, default: false },
            gaps: [{
                gapType: {
                    type: String,
                    enum: ['no_successors', 'no_ready_successors', 'quality_gap',
                           'diversity_gap', 'experience_gap', 'skill_gap']
                },
                gapDescription: String,
                severity: { type: String, enum: ['critical', 'high', 'medium', 'low'] },
                mitigation: String,
                targetDate: Date
            }],
            criticalGaps: Number
        },
        benchStrengthVsTarget: {
            targetSuccessors: Number,
            actualSuccessors: Number,
            targetReadyNow: Number,
            actualReadyNow: Number,
            gap: Number,
            adequateCoverage: { type: Boolean, default: false }
        }
    },

    // ==================== TALENT POOL ====================
    talentPool: {
        poolMembers: [{
            employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
            employeeName: String,
            currentRole: String,
            poolCategory: {
                type: String,
                enum: ['high_potential', 'key_talent', 'subject_matter_expert',
                       'emerging_leader', 'technical_expert']
            },
            readinessForTargetRole: String,
            developmentStage: { type: String, enum: ['early', 'mid', 'advanced'] },
            addedToPoolDate: Date,
            poolStatus: { type: String, enum: ['active', 'graduated', 'exited'] }
        }],
        poolManagement: {
            poolSize: Number,
            optimalPoolSize: Number,
            poolTurnover: Number,
            graduationRate: Number,
            retentionRate: Number,
            poolHealth: { type: String, enum: ['healthy', 'adequate', 'at_risk'] }
        }
    },

    // ==================== KNOWLEDGE TRANSFER ====================
    knowledgeTransfer: {
        knowledgeTransferRequired: { type: Boolean, default: false },
        criticalKnowledgeAreas: [knowledgeAreaSchema],
        transferPlan: {
            planExists: { type: Boolean, default: false },
            planStartDate: Date,
            targetCompletionDate: Date,
            transferActivities: [{
                activityType: {
                    type: String,
                    enum: ['documentation', 'meeting', 'training_session', 'shadowing', 'handover', 'review']
                },
                activityDescription: String,
                knowledgeArea: String,
                scheduledDate: Date,
                duration: Number,
                participants: [String],
                completed: { type: Boolean, default: false },
                completionDate: Date,
                effectiveness: { type: String, enum: ['high', 'medium', 'low'] }
            }],
            overallProgress: { type: Number, default: 0 },
            onSchedule: { type: Boolean, default: true },
            risks: [{
                risk: String,
                mitigation: String
            }]
        },
        documentation: {
            documentsRequired: Number,
            documentsCompleted: Number,
            documents: [{
                documentType: {
                    type: String,
                    enum: ['process', 'procedure', 'contact_list', 'system_guide',
                           'decision_matrix', 'best_practices', 'other']
                },
                documentName: String,
                status: { type: String, enum: ['not_started', 'in_progress', 'completed', 'reviewed'] },
                completionDate: Date,
                documentUrl: String,
                quality: { type: String, enum: ['excellent', 'good', 'adequate', 'poor'] }
            }],
            documentationComplete: { type: Boolean, default: false }
        },
        relationshipTransfer: {
            keyRelationships: [{
                relationshipType: {
                    type: String,
                    enum: ['client', 'vendor', 'partner', 'regulator', 'internal_stakeholder', 'team_member']
                },
                contactName: String,
                organization: String,
                relationshipImportance: { type: String, enum: ['critical', 'important', 'moderate'] },
                transferMethod: {
                    type: String,
                    enum: ['introduction_meeting', 'joint_calls', 'handoff_memo', 'gradual_transition']
                },
                transferred: { type: Boolean, default: false },
                transferDate: Date,
                transitionQuality: { type: String, enum: ['smooth', 'adequate', 'difficult'] }
            }],
            totalRelationships: Number,
            transferredRelationships: Number,
            transferProgress: Number
        }
    },

    // ==================== EMERGENCY SUCCESSION ====================
    emergencySuccession: {
        emergencyPlanExists: { type: Boolean, default: false },
        emergencyScenarios: [emergencyScenarioSchema],
        emergencyReadiness: {
            readinessLevel: { type: String, enum: ['high', 'medium', 'low'] },
            lastTested: Date,
            testResults: String,
            improvementsNeeded: [String]
        }
    },

    // ==================== LAW FIRM SPECIFIC ====================
    lawFirmSuccession: {
        isLawFirmPosition: { type: Boolean, default: false },
        partnerSuccession: {
            partnerTier: {
                type: String,
                enum: ['equity_partner', 'non_equity_partner', 'senior_associate', 'counsel']
            },
            partnerTrack: { type: Boolean, default: false },
            trackTimeline: Number,
            partnershipCriteria: [{
                criterion: {
                    type: String,
                    enum: ['origination', 'billable_hours', 'realization_rate',
                           'client_development', 'practice_area_expertise', 'leadership']
                },
                requirement: String,
                currentStatus: { type: String, enum: ['meets', 'approaching', 'needs_development'] }
            }],
            partnerVote: {
                voteRequired: { type: Boolean, default: false },
                votingPartners: Number,
                votesNeeded: Number,
                voteDate: Date
            }
        },
        bookOfBusiness: {
            hasBook: { type: Boolean, default: false },
            totalBookValue: Number,
            clientCount: Number,
            originationCredits: Number,
            clientTransition: {
                transitionRequired: { type: Boolean, default: false },
                keyClients: [{
                    clientName: String,
                    annualBillings: Number,
                    relationshipLength: Number,
                    relationshipStrength: { type: String, enum: ['strong', 'moderate', 'weak'] },
                    transitionPlan: {
                        successorAttorney: String,
                        transitionMethod: {
                            type: String,
                            enum: ['introduction', 'co_counsel', 'gradual_handoff', 'immediate']
                        },
                        transitionTimeline: Number,
                        clientNotified: { type: Boolean, default: false },
                        clientApproval: Boolean,
                        riskLevel: { type: String, enum: ['high', 'medium', 'low'] }
                    },
                    transitionStatus: { type: String, enum: ['not_started', 'in_progress', 'completed'] }
                }],
                clientRetentionRisk: { type: String, enum: ['high', 'medium', 'low'] },
                estimatedClientRetention: Number
            },
            originationTransfer: {
                transferMethod: {
                    type: String,
                    enum: ['immediate', 'gradual', 'shared_credit', 'retain_credit']
                },
                newOriginator: String,
                creditSplitPercentage: Number,
                transitionPeriod: Number
            }
        },
        practiceAreaContinuity: {
            practiceArea: String,
            criticalToFirm: { type: Boolean, default: false },
            coverage: {
                totalAttorneys: Number,
                seniorAttorneys: Number,
                successorAttorneys: [{
                    attorneyName: String,
                    yearsInPracticeArea: Number,
                    expertiseLevel: { type: String, enum: ['developing', 'competent', 'expert'] },
                    readinessForLeadership: String
                }],
                adequateCoverage: { type: Boolean, default: false }
            },
            knowledgePreservation: {
                precedentsDocumented: { type: Boolean, default: false },
                formLibraryComplete: { type: Boolean, default: false },
                matterManagementDocumented: { type: Boolean, default: false },
                clientPreferencesDocumented: { type: Boolean, default: false },
                bestPracticesDocumented: { type: Boolean, default: false }
            },
            marketPosition: {
                firmReputation: { type: String, enum: ['leading', 'strong', 'developing'] },
                marketShare: Number,
                competitiveAdvantage: String,
                successionImpactOnMarket: { type: String, enum: ['minimal', 'moderate', 'significant'] }
            }
        },
        rainmaking: {
            isRainmaker: { type: Boolean, default: false },
            annualOriginationTarget: Number,
            actualOrigination: Number,
            networkStrength: { type: String, enum: ['exceptional', 'strong', 'moderate', 'limited'] },
            businessDevelopmentSuccession: {
                successors: [{
                    attorneyName: String,
                    currentOriginationPerformance: Number,
                    networkBuilding: { type: String, enum: ['strong', 'developing', 'needs_work'] },
                    industryReputation: { type: String, enum: ['established', 'building', 'early'] },
                    mentoringProvided: { type: Boolean, default: false }
                }],
                transitionStrategy: String,
                firmSupportRequired: [String]
            }
        },
        leadershipRoles: [{
            role: {
                type: String,
                enum: ['managing_partner', 'practice_group_leader', 'office_managing_partner',
                       'department_head', 'committee_chair']
            },
            roleDescription: String,
            termLength: Number,
            termExpiry: Date,
            electionProcess: String,
            successors: [{
                candidateName: String,
                qualifications: String,
                firmSupport: { type: String, enum: ['strong', 'moderate', 'limited'] }
            }]
        }]
    },

    // ==================== ACTION PLAN ====================
    actionPlan: {
        overallStrategy: String,
        strategicPriorities: [String],
        actions: [actionItemSchema],
        totalActions: { type: Number, default: 0 },
        completedActions: { type: Number, default: 0 },
        planProgress: { type: Number, default: 0 },
        onTrack: { type: Boolean, default: true },
        blockers: [{
            blocker: String,
            impact: { type: String, enum: ['high', 'medium', 'low'] },
            resolution: String
        }],
        nextMilestone: {
            milestone: String,
            targetDate: Date
        }
    },

    // ==================== METRICS ====================
    metrics: {
        coverageMetrics: {
            positionsCovered: Number,
            positionsUncovered: Number,
            coverageRate: Number,
            targetCoverageRate: Number,
            adequateCoverage: { type: Boolean, default: false }
        },
        readinessMetrics: {
            readyNowPercentage: Number,
            averageReadinessTime: Number,
            readinessGap: Number,
            readinessImprovement: {
                previousAssessment: Number,
                currentAssessment: Number,
                improvement: Number,
                trend: { type: String, enum: ['improving', 'stable', 'declining'] }
            }
        },
        qualityMetrics: {
            averageSuccessorQuality: Number,
            diversityScore: Number,
            internalVsExternal: {
                internalSuccessors: Number,
                externalSuccessors: Number,
                internalPercentage: Number
            }
        },
        developmentMetrics: {
            averageDevelopmentTime: Number,
            developmentInvestment: Number,
            developmentROI: Number,
            developmentSuccess: {
                successfulTransitions: Number,
                totalTransitions: Number,
                successRate: Number
            }
        },
        riskMetrics: {
            overallRiskScore: Number,
            criticalPositionsAtRisk: Number,
            retentionRiskScore: Number,
            timeToReplaceRisk: Number
        },
        effectivenessMetrics: {
            planCompleteness: Number,
            planAccuracy: Number,
            successfulSuccessions: Number,
            totalSuccessions: Number,
            successionSuccessRate: Number,
            newHirePerformance: {
                averageRating: Number,
                retentionRate1Year: Number,
                retentionRate3Year: Number
            }
        }
    },

    // ==================== REVIEW & APPROVAL ====================
    reviewApproval: {
        reviews: [reviewEntrySchema],
        lastReviewDate: Date,
        nextReviewDate: Date,
        approvals: [{
            approvalLevel: String,
            approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            approverName: String,
            approverTitle: String,
            approvalRequired: { type: Boolean, default: true },
            approved: { type: Boolean, default: false },
            approvalDate: Date,
            conditions: [String],
            comments: String
        }],
        finalApproval: { type: Boolean, default: false },
        finalApprovalDate: Date,
        finalApprovedBy: String
    },

    // ==================== STATUS ====================
    planStatus: {
        type: String,
        enum: ['draft', 'under_review', 'approved', 'active', 'archived', 'expired'],
        default: 'draft',
        index: true
    },
    statusDate: Date,

    // ==================== COMMUNICATIONS ====================
    communications: [communicationEntrySchema],

    // ==================== DOCUMENTS ====================
    documents: [documentSchema],

    // ==================== NOTES ====================
    notes: {
        plannerNotes: String,
        hrNotes: String,
        managementNotes: String,
        confidentialNotes: String,
        lessonsLearned: String
    },
    internalNotes: String,

    // ==================== RELATED RECORDS ====================
    relatedRecords: {
        positionId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPosition' },
        incumbentEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        successorEmployeeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
        departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrganizationalUnit' },
        developmentPlanIds: [String],
        performanceReviewIds: [String],
        talentPoolId: String
    },

    // ==================== AUDIT ====================
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: { createdAt: 'createdOn', updatedAt: 'updatedOn' },
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

successionPlanSchema.index({ firmId: 1, planStatus: 1 });
successionPlanSchema.index({ lawyerId: 1, planStatus: 1 });
successionPlanSchema.index({ planNumber: 1 });
successionPlanSchema.index({ 'criticalPosition.positionId': 1 });
successionPlanSchema.index({ 'incumbent.employeeId': 1 });
successionPlanSchema.index({ 'criticalPosition.criticalityAssessment.criticalityLevel': 1 });
successionPlanSchema.index({ 'criticalPosition.vacancyRisk.riskLevel': 1 });
successionPlanSchema.index({ 'planDetails.nextReviewDate': 1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════

// Check if plan needs review
successionPlanSchema.virtual('needsReview').get(function() {
    if (!this.planDetails?.nextReviewDate) return false;
    return new Date() >= this.planDetails.nextReviewDate;
});

// Calculate overall risk
successionPlanSchema.virtual('overallRisk').get(function() {
    const criticality = this.criticalPosition?.criticalityAssessment?.criticalityLevel;
    const vacancyRisk = this.criticalPosition?.vacancyRisk?.riskLevel;
    const benchStrength = this.benchStrength?.overallBenchStrength;

    if (criticality === 'critical' && (vacancyRisk === 'high' || benchStrength === 'none')) {
        return 'critical';
    }
    if (criticality === 'critical' || vacancyRisk === 'high') {
        return 'high';
    }
    if (criticality === 'important' || vacancyRisk === 'medium') {
        return 'medium';
    }
    return 'low';
});

// Enable virtuals in JSON
successionPlanSchema.set('toJSON', { virtuals: true });
successionPlanSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

successionPlanSchema.pre('save', async function(next) {
    // Auto-generate successionPlanId
    if (!this.successionPlanId) {
        const year = new Date().getFullYear();
        const query = this.firmId ? { firmId: this.firmId } : { lawyerId: this.lawyerId };
        const count = await this.constructor.countDocuments({
            ...query,
            successionPlanId: new RegExp(`^SUC-${year}-`)
        });
        this.successionPlanId = `SUC-${year}-${String(count + 1).padStart(3, '0')}`;
    }

    // Auto-generate planNumber if not provided
    if (!this.planNumber) {
        const query = this.firmId ? { firmId: this.firmId } : { lawyerId: this.lawyerId };
        const count = await this.constructor.countDocuments(query);
        this.planNumber = `SP-${String(count + 1).padStart(5, '0')}`;
    }

    // Update successor counts
    if (this.successors) {
        this.successorsCount = this.successors.length;
        this.readyNowCount = this.successors.filter(
            s => s.readinessAssessment?.readinessLevel === 'ready_now'
        ).length;

        // Update bench strength readiness distribution
        if (this.benchStrength) {
            this.benchStrength.readinessDistribution = {
                readyNow: this.successors.filter(s => s.readinessAssessment?.readinessLevel === 'ready_now').length,
                ready1Year: this.successors.filter(s => s.readinessAssessment?.readinessLevel === 'ready_1_year').length,
                ready2to3Years: this.successors.filter(s => s.readinessAssessment?.readinessLevel === 'ready_2_3_years').length,
                ready4to5Years: this.successors.filter(s => s.readinessAssessment?.readinessLevel === 'ready_4_5_years').length,
                longTerm: this.successors.filter(s => s.readinessAssessment?.readinessLevel === 'long_term').length,
                notReady: this.successors.filter(s => s.readinessAssessment?.readinessLevel === 'not_ready').length,
                total: this.successors.length
            };

            // Determine overall bench strength
            if (this.benchStrength.readinessDistribution.readyNow >= 2) {
                this.benchStrength.overallBenchStrength = 'strong';
            } else if (this.benchStrength.readinessDistribution.readyNow >= 1) {
                this.benchStrength.overallBenchStrength = 'adequate';
            } else if (this.benchStrength.readinessDistribution.ready1Year >= 1) {
                this.benchStrength.overallBenchStrength = 'weak';
            } else {
                this.benchStrength.overallBenchStrength = 'none';
            }
        }
    }

    // Update action plan progress
    if (this.actionPlan?.actions?.length > 0) {
        this.actionPlan.totalActions = this.actionPlan.actions.length;
        this.actionPlan.completedActions = this.actionPlan.actions.filter(a => a.status === 'completed').length;
        this.actionPlan.planProgress = Math.round(
            (this.actionPlan.completedActions / this.actionPlan.totalActions) * 100
        );
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get plans needing review
successionPlanSchema.statics.getPlansNeedingReview = async function(firmId, lawyerId) {
    const query = firmId ? { firmId } : { lawyerId };
    return this.find({
        ...query,
        'planDetails.nextReviewDate': { $lte: new Date() },
        planStatus: { $nin: ['archived', 'expired'] }
    });
};

// Get high risk plans
successionPlanSchema.statics.getHighRiskPlans = async function(firmId, lawyerId) {
    const query = firmId ? { firmId } : { lawyerId };
    return this.find({
        ...query,
        $or: [
            { 'criticalPosition.vacancyRisk.riskLevel': 'high' },
            { 'criticalPosition.criticalityAssessment.criticalityLevel': 'critical', readyNowCount: 0 }
        ],
        planStatus: { $nin: ['archived', 'expired'] }
    });
};

// Get critical positions without successors
successionPlanSchema.statics.getCriticalWithoutSuccessors = async function(firmId, lawyerId) {
    const query = firmId ? { firmId } : { lawyerId };
    return this.find({
        ...query,
        'criticalPosition.criticalityAssessment.criticalityLevel': { $in: ['critical', 'important'] },
        successorsCount: 0,
        planStatus: { $nin: ['archived', 'expired'] }
    });
};

module.exports = mongoose.model('SuccessionPlan', successionPlanSchema);
