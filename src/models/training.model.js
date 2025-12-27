const mongoose = require('mongoose');

/**
 * Training Model - HR Management
 * Module 13: التدريب والتطوير (Training & Development)
 * Comprehensive training management for employees including CLE tracking for attorneys
 */

// ═══════════════════════════════════════════════════════════════
// TRAINING POLICIES (Configurable)
// ═══════════════════════════════════════════════════════════════

const TRAINING_POLICIES = {
    approvalThresholds: {
        level1: 5000, // Manager approval for costs up to 5000 SAR
        level2: 15000, // Department head for costs up to 15000 SAR
        level3: 50000 // Director/CEO for costs above 15000 SAR
    },
    attendanceRequirements: {
        minimumPercentage: 80, // 80% attendance required
        graceMinutes: 15 // Late arrival grace period
    },
    assessmentRequirements: {
        passingScore: 70, // 70% passing score
        maxRetakes: 2 // Maximum retake attempts
    },
    cleRequirements: { // Continuing Legal Education for attorneys
        annualCredits: 15,
        ethicsCredits: 3,
        specialtyCredits: 5
    },
    complianceGracePeriod: 30 // Days grace period for mandatory training
};

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Approval workflow step schema
const approvalStepSchema = new mongoose.Schema({
    stepNumber: { type: Number, required: false },
    stepName: { type: String, required: false },
    stepNameAr: String,
    approverRole: { type: String, required: false },
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approverName: String,
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'conditional', 'skipped'],
        default: 'pending'
    },
    actionDate: Date,
    decision: {
        type: String,
        enum: ['approve', 'reject', 'approve_with_conditions', 'defer']
    },
    comments: String,
    budgetApproval: {
        budgetAvailable: Boolean,
        budgetSource: String,
        costCenter: String
    },
    notificationSent: { type: Boolean, default: false }
}, { _id: true });

// Session/Schedule schema
const sessionSchema = new mongoose.Schema({
    sessionNumber: { type: Number, required: false },
    sessionDate: { type: Date, required: false },
    startTime: String,
    endTime: String,
    duration: Number, // Hours
    topic: String,
    topicAr: String,
    mandatory: { type: Boolean, default: true },
    attended: Boolean,
    checkInTime: String,
    checkOutTime: String,
    attendanceMethod: {
        type: String,
        enum: ['physical_signin', 'biometric', 'virtual_checkin', 'ip_verification', 'manual']
    },
    late: { type: Boolean, default: false },
    lateMinutes: { type: Number, default: 0 },
    earlyExit: { type: Boolean, default: false },
    earlyExitMinutes: { type: Number, default: 0 },
    excused: { type: Boolean, default: false },
    excuseReason: String,
    notes: String
}, { _id: true });

// Assessment schema
const assessmentSchema = new mongoose.Schema({
    assessmentId: { type: String, required: false },
    assessmentType: {
        type: String,
        enum: ['pre_assessment', 'quiz', 'mid_term', 'final_exam', 'project', 'presentation', 'practical', 'post_assessment'],
        required: false
    },
    assessmentTitle: { type: String, required: false },
    assessmentDate: Date,
    attemptNumber: { type: Number, default: 1 },
    maxAttempts: Number,
    score: Number,
    maxScore: Number,
    percentageScore: Number,
    passingScore: { type: Number, default: 70 },
    passed: Boolean,
    grade: String,
    timeAllowed: Number, // Minutes
    timeSpent: Number,
    feedback: String,
    areasOfStrength: [String],
    areasForImprovement: [String],
    retakeRequired: Boolean,
    retakeDate: Date,
    resultUrl: String,
    certificateUrl: String
}, { _id: true });

// Document schema
const documentSchema = new mongoose.Schema({
    documentType: {
        type: String,
        enum: ['registration_form', 'confirmation_email', 'invitation', 'pre_work',
            'training_materials', 'slides', 'handouts', 'certificate', 'transcript',
            'evaluation_form', 'attendance_sheet', 'exam_results', 'invoice', 'receipt', 'other']
    },
    documentName: String,
    documentNameAr: String,
    fileUrl: String,
    fileName: String,
    fileSize: Number,
    uploadedOn: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    accessLevel: {
        type: String,
        enum: ['employee', 'manager', 'hr', 'trainer', 'all'],
        default: 'all'
    },
    downloadable: { type: Boolean, default: true },
    downloaded: { type: Boolean, default: false },
    downloadDate: Date,
    downloadCount: { type: Number, default: 0 },
    expiryDate: Date
}, { _id: true });

// Communication schema
const communicationSchema = new mongoose.Schema({
    communicationId: String,
    communicationType: {
        type: String,
        enum: ['email', 'sms', 'calendar_invite', 'reminder', 'notification']
    },
    date: { type: Date, default: Date.now },
    purpose: {
        type: String,
        enum: ['registration_confirmation', 'pre_work_reminder', 'session_reminder',
            'attendance_confirmation', 'completion_notification', 'certificate_delivery',
            'evaluation_request', 'follow_up', 'other']
    },
    recipient: String,
    subject: String,
    message: String,
    attachments: [String],
    sent: { type: Boolean, default: false },
    sentDate: Date,
    delivered: { type: Boolean, default: false },
    deliveryDate: Date,
    opened: Boolean,
    openDate: Date,
    responded: Boolean,
    responseDate: Date
}, { _id: true });

// Payment record schema
const paymentRecordSchema = new mongoose.Schema({
    paymentDate: { type: Date, required: false },
    amount: { type: Number, required: false },
    paymentMethod: {
        type: String,
        enum: ['bank_transfer', 'credit_card', 'check', 'invoice'],
        required: false
    },
    paymentReference: String,
    paidBy: {
        type: String,
        enum: ['company', 'employee'],
        required: false
    },
    receiptUrl: String
}, { _id: true });

// Additional cost schema
const additionalCostSchema = new mongoose.Schema({
    costType: {
        type: String,
        enum: ['materials', 'exam_fee', 'certification_fee', 'membership',
            'travel', 'accommodation', 'meals', 'equipment', 'software', 'other']
    },
    description: String,
    amount: { type: Number, required: false },
    billable: { type: Boolean, default: false }
}, { _id: true });

// Follow-up action schema
const followUpActionSchema = new mongoose.Schema({
    actionId: String,
    actionType: {
        type: String,
        enum: ['apply_learning', 'share_knowledge', 'mentor_others',
            'project', 'certification_exam', 'advanced_training']
    },
    description: String,
    dueDate: Date,
    owner: String,
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed'],
        default: 'pending'
    },
    completionDate: Date,
    outcome: String
}, { _id: true });

// ═══════════════════════════════════════════════════════════════
// MAIN TRAINING SCHEMA
// ═══════════════════════════════════════════════════════════════

const trainingSchema = new mongoose.Schema({
    // Multi-tenancy
    firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', index: true },
    lawyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    trainingId: { type: String, unique: true, required: false },
    trainingNumber: { type: String, unique: true, required: false },

    // ═══════════════════════════════════════════════════════════════
    // EMPLOYEE INFORMATION
    // ═══════════════════════════════════════════════════════════════
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: false },
    employeeNumber: { type: String, required: false },
    employeeName: { type: String, required: false },
    employeeNameAr: String,
    department: String,
    jobTitle: String,

    // ═══════════════════════════════════════════════════════════════
    // TRAINING DETAILS
    // ═══════════════════════════════════════════════════════════════
    trainingTitle: { type: String, required: false },
    trainingTitleAr: String,
    trainingDescription: String,
    trainingDescriptionAr: String,
    trainingType: {
        type: String,
        enum: ['internal', 'external', 'online', 'certification', 'conference', 'workshop', 'mentoring', 'on_the_job'],
        required: false
    },
    trainingCategory: {
        type: String,
        enum: ['technical', 'soft_skills', 'leadership', 'management', 'compliance',
            'safety', 'product_knowledge', 'systems', 'legal_professional',
            'business_development', 'language', 'other'],
        required: false
    },
    deliveryMethod: {
        type: String,
        enum: ['classroom', 'virtual_live', 'self_paced_online', 'blended', 'on_the_job', 'simulation', 'workshop', 'seminar'],
        default: 'classroom'
    },
    difficultyLevel: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'expert'],
        default: 'intermediate'
    },
    urgency: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },

    // Training objectives and outcomes
    trainingObjectives: [{
        objective: String,
        objectiveAr: String
    }],
    learningOutcomes: [{
        outcome: String,
        outcomeAr: String,
        bloomsTaxonomyLevel: {
            type: String,
            enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']
        }
    }],

    // ═══════════════════════════════════════════════════════════════
    // REQUEST INFORMATION
    // ═══════════════════════════════════════════════════════════════
    requestDate: { type: Date, default: Date.now },
    requestedBy: {
        type: String,
        enum: ['employee', 'manager', 'hr', 'learning_admin'],
        default: 'employee'
    },
    businessJustification: String,
    businessJustificationAr: String,
    requestStatus: {
        type: String,
        enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'on_hold'],
        default: 'submitted'
    },

    // Business justification details
    justificationDetails: {
        alignsWithBusinessGoals: { type: Boolean, default: false },
        alignsWithCareerPath: { type: Boolean, default: false },
        addressesPerformanceGap: { type: Boolean, default: false },
        mandatoryCompliance: { type: Boolean, default: false },
        expectedBenefits: String,
        expectedBenefitsAr: String,
        urgencyReason: String,
        expectedROI: {
            productivityIncrease: Number, // %
            errorReduction: Number, // %
            revenueImpact: Number,
            qualitativeImpact: String
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // DATES & DURATION
    // ═══════════════════════════════════════════════════════════════
    startDate: { type: Date, required: false },
    endDate: { type: Date, required: false },
    duration: {
        totalHours: { type: Number, required: false },
        totalDays: Number,
        sessionsCount: Number,
        hoursPerSession: Number,
        studyTime: Number // For online courses
    },

    // ═══════════════════════════════════════════════════════════════
    // LOCATION & LOGISTICS
    // ═══════════════════════════════════════════════════════════════
    locationType: {
        type: String,
        enum: ['on_site', 'off_site', 'virtual', 'hybrid'],
        default: 'on_site'
    },
    venue: {
        venueName: String,
        venueAddress: String,
        city: String,
        country: String,
        room: String,
        capacity: Number,
        facilities: [String]
    },
    virtualDetails: {
        platform: {
            type: String,
            enum: ['zoom', 'teams', 'webex', 'google_meet', 'other']
        },
        meetingLink: String,
        meetingId: String,
        passcode: String,
        recordingAvailable: { type: Boolean, default: false },
        recordingUrl: String
    },
    travelRequired: { type: Boolean, default: false },
    travelDetails: {
        destination: String,
        departureDate: Date,
        returnDate: Date,
        accommodationRequired: Boolean,
        accommodationNights: Number,
        estimatedTravelCost: Number,
        travelApprovalRequired: { type: Boolean, default: false },
        travelApproved: { type: Boolean, default: false }
    },
    technicalRequirements: {
        software: [String],
        hardware: [String],
        internetSpeed: String,
        setupCompleted: { type: Boolean, default: false }
    },

    // ═══════════════════════════════════════════════════════════════
    // PROVIDER INFORMATION
    // ═══════════════════════════════════════════════════════════════
    provider: {
        providerType: {
            type: String,
            enum: ['internal', 'external', 'online_platform', 'university', 'professional_association', 'consultant']
        },
        providerName: String,
        providerNameAr: String,
        contactPerson: String,
        contactEmail: String,
        contactPhone: String,
        website: String,
        accredited: Boolean,
        accreditingBody: String,
        accreditationNumber: String,
        rating: Number,
        previouslyUsed: { type: Boolean, default: false },
        lastUsedDate: Date,
        recommendedByOthers: Boolean,
        // For online platforms
        platformName: String,
        platformType: {
            type: String,
            enum: ['udemy', 'coursera', 'linkedin_learning', 'pluralsight', 'skillsoft', 'custom_lms', 'other']
        },
        subscriptionType: {
            type: String,
            enum: ['individual', 'corporate', 'per_course']
        },
        // Contract details
        hasContract: Boolean,
        contractNumber: String,
        contractStartDate: Date,
        contractEndDate: Date,
        discountApplicable: Boolean,
        discountPercentage: Number,
        // Internal trainer details
        trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        trainerName: String,
        trainerQualifications: String
    },

    // ═══════════════════════════════════════════════════════════════
    // ATTORNEY CLE (Continuing Legal Education) DETAILS
    // ═══════════════════════════════════════════════════════════════
    cleDetails: {
        isCLE: { type: Boolean, default: false },
        cleCredits: Number,
        cleHours: Number,
        cleCategory: {
            type: String,
            enum: ['legal_ethics', 'substantive_law', 'professional_skills', 'practice_management', 'technology', 'general']
        },
        barApprovalNumber: String,
        approvedByBar: { type: Boolean, default: false },
        barJurisdiction: String,
        ethicsCredits: Number,
        specialtyArea: String,
        specialtyCredits: Number,
        // Practice area development
        practiceArea: {
            type: String,
            enum: ['corporate', 'litigation', 'real_estate', 'family', 'criminal',
                'labor', 'intellectual_property', 'tax', 'banking', 'insurance', 'other']
        },
        skillLevel: {
            type: String,
            enum: ['foundation', 'intermediate', 'advanced', 'expert']
        },
        targetedCompetencies: [String],
        // Court certification
        isCertification: { type: Boolean, default: false },
        courtType: String,
        courtJurisdiction: String,
        certificationNumber: String,
        certificationExpiry: Date,
        // Legal technology
        isLegalTech: { type: Boolean, default: false },
        technologyType: {
            type: String,
            enum: ['case_management', 'legal_research', 'document_automation',
                'e_discovery', 'time_billing', 'practice_management', 'other']
        },
        softwareName: String
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['requested', 'approved', 'rejected', 'enrolled', 'in_progress', 'completed', 'cancelled', 'failed'],
        default: 'requested'
    },

    // ═══════════════════════════════════════════════════════════════
    // APPROVAL WORKFLOW
    // ═══════════════════════════════════════════════════════════════
    approvalWorkflow: {
        required: { type: Boolean, default: true },
        workflowSteps: [approvalStepSchema],
        currentStep: { type: Number, default: 1 },
        totalSteps: Number,
        finalStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'conditional'],
            default: 'pending'
        },
        finalApprover: String,
        finalApprovalDate: Date,
        rejectionReason: String,
        // Conditions tracking
        conditions: [{
            condition: String,
            met: { type: Boolean, default: false },
            metDate: Date,
            evidence: String
        }]
    },

    // ═══════════════════════════════════════════════════════════════
    // ENROLLMENT
    // ═══════════════════════════════════════════════════════════════
    enrollment: {
        enrolled: { type: Boolean, default: false },
        enrollmentDate: Date,
        enrollmentBy: String,
        enrollmentMethod: {
            type: String,
            enum: ['manual', 'self_service', 'bulk', 'automatic']
        },
        registrationNumber: String,
        registrationRequired: { type: Boolean, default: false },
        registered: { type: Boolean, default: false },
        registrationDate: Date,
        confirmationReceived: { type: Boolean, default: false },
        confirmationNumber: String,
        confirmationEmail: String,
        // Seat reservation
        seatReserved: { type: Boolean, default: false },
        reservationDate: Date,
        seatNumber: String,
        waitlisted: { type: Boolean, default: false },
        waitlistPosition: Number,
        // Pre-work
        preWorkRequired: { type: Boolean, default: false },
        preWorkAssignments: [{
            assignmentName: String,
            dueDate: Date,
            completed: { type: Boolean, default: false },
            completionDate: Date,
            submissionUrl: String
        }],
        preWorkCompleted: { type: Boolean, default: false },
        // Access credentials (for online)
        accessCredentials: {
            username: String,
            loginUrl: String,
            accessGranted: { type: Boolean, default: false },
            accessGrantedDate: Date,
            firstLogin: Date,
            accessExpiry: Date
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // SESSIONS & ATTENDANCE
    // ═══════════════════════════════════════════════════════════════
    sessions: [sessionSchema],
    attendanceSummary: {
        totalSessions: { type: Number, default: 0 },
        attendedSessions: { type: Number, default: 0 },
        missedSessions: { type: Number, default: 0 },
        attendancePercentage: { type: Number, default: 0 },
        minimumRequired: { type: Number, default: 80 },
        meetsMinimum: { type: Boolean, default: false },
        totalHoursAttended: { type: Number, default: 0 }
    },
    makeUpSessions: [{
        originalSession: Number,
        makeUpDate: Date,
        completed: { type: Boolean, default: false },
        approved: { type: Boolean, default: false },
        approvedBy: String
    }],

    // ═══════════════════════════════════════════════════════════════
    // PROGRESS TRACKING (for online/self-paced courses)
    // ═══════════════════════════════════════════════════════════════
    progress: {
        totalModules: Number,
        completedModules: { type: Number, default: 0 },
        modules: [{
            moduleNumber: Number,
            moduleTitle: String,
            status: {
                type: String,
                enum: ['not_started', 'in_progress', 'completed'],
                default: 'not_started'
            },
            startDate: Date,
            completionDate: Date,
            duration: Number,
            timeSpent: Number,
            score: Number,
            passed: Boolean
        }],
        progressPercentage: { type: Number, default: 0 },
        lastAccessDate: Date,
        totalTimeSpent: Number, // Hours
        // Engagement metrics
        videosWatched: Number,
        documentsRead: Number,
        quizzesTaken: Number,
        forumPosts: Number
    },
    // Milestones
    milestones: [{
        milestoneId: String,
        milestoneName: String,
        targetDate: Date,
        achieved: { type: Boolean, default: false },
        achievementDate: Date,
        criteria: String
    }],

    // ═══════════════════════════════════════════════════════════════
    // ASSESSMENTS
    // ═══════════════════════════════════════════════════════════════
    assessments: [assessmentSchema],

    // ═══════════════════════════════════════════════════════════════
    // COMPLETION
    // ═══════════════════════════════════════════════════════════════
    completion: {
        completed: { type: Boolean, default: false },
        completionDate: Date,
        completionCriteria: {
            attendanceRequired: { type: Boolean, default: true },
            attendanceMet: Boolean,
            assessmentRequired: { type: Boolean, default: false },
            assessmentPassed: Boolean,
            minimumScore: Number,
            scoreMet: Boolean,
            projectRequired: { type: Boolean, default: false },
            projectCompleted: Boolean,
            allCriteriaMet: { type: Boolean, default: false }
        },
        finalResults: {
            overallScore: Number,
            grade: String,
            passed: { type: Boolean, default: false },
            rank: Number,
            totalParticipants: Number,
            percentileRank: Number
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // CERTIFICATE
    // ═══════════════════════════════════════════════════════════════
    certificate: {
        issued: { type: Boolean, default: false },
        issueDate: Date,
        certificateNumber: String,
        certificateUrl: String,
        certificateType: {
            type: String,
            enum: ['completion', 'achievement', 'professional', 'accredited']
        },
        validFrom: Date,
        validUntil: Date,
        renewalRequired: Boolean,
        renewalDueDate: Date,
        cleCredits: Number,
        cpdPoints: Number,
        verificationUrl: String,
        delivered: { type: Boolean, default: false },
        deliveryDate: Date,
        deliveryMethod: {
            type: String,
            enum: ['email', 'mail', 'download', 'hand_delivery']
        },
        // Badge
        badge: {
            badgeName: String,
            badgeUrl: String,
            shareableLink: String
        },
        // Transcript
        transcript: {
            available: { type: Boolean, default: false },
            transcriptUrl: String
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // EVALUATION (Kirkpatrick Model)
    // ═══════════════════════════════════════════════════════════════
    evaluation: {
        // Level 1 - Reaction
        evaluationCompleted: { type: Boolean, default: false },
        evaluationDate: Date,
        ratings: {
            overallSatisfaction: { type: Number, min: 1, max: 5 },
            contentRelevance: { type: Number, min: 1, max: 5 },
            contentQuality: { type: Number, min: 1, max: 5 },
            instructorKnowledge: { type: Number, min: 1, max: 5 },
            instructorEffectiveness: { type: Number, min: 1, max: 5 },
            materialsQuality: { type: Number, min: 1, max: 5 },
            facilityRating: { type: Number, min: 1, max: 5 },
            logisticsRating: { type: Number, min: 1, max: 5 },
            recommendToOthers: { type: Number, min: 1, max: 5 },
            valueForMoney: { type: Number, min: 1, max: 5 }
        },
        openEndedFeedback: {
            whatWasGood: String,
            whatCouldImprove: String,
            mostUsefulTopics: String,
            leastUsefulTopics: String,
            additionalTopicsNeeded: String,
            willApplyLearning: Boolean,
            applicationPlans: String,
            additionalComments: String
        },
        // Level 2 - Learning
        level2Learning: {
            assessed: { type: Boolean, default: false },
            assessmentDate: Date,
            knowledgeGain: {
                preTestScore: Number,
                postTestScore: Number,
                improvement: Number,
                targetImprovement: Number,
                targetMet: Boolean
            },
            skillsDemonstrated: [{
                skill: String,
                demonstrated: Boolean,
                proficiencyLevel: {
                    type: String,
                    enum: ['beginner', 'competent', 'proficient', 'expert']
                }
            }],
            learningObjectivesMet: [{
                objective: String,
                met: Boolean,
                evidenceOfLearning: String
            }]
        },
        // Level 3 - Behavior (Post-training)
        level3Behavior: {
            assessed: { type: Boolean, default: false },
            assessmentDate: Date,
            behaviorChanges: [{
                targetedBehavior: String,
                observed: Boolean,
                frequency: {
                    type: String,
                    enum: ['never', 'rarely', 'sometimes', 'often', 'always']
                },
                observedBy: String,
                observationDate: Date,
                examples: String
            }],
            skillsApplication: {
                appliedOnJob: Boolean,
                applicationPercentage: Number,
                barriers: [String],
                enablers: [String],
                supportNeeded: String
            },
            managerAssessment: {
                improvementObserved: Boolean,
                rating: Number,
                specificImprovements: String,
                recommendationForOthers: Boolean
            }
        },
        // Level 4 - Results (Business impact)
        level4Results: {
            assessed: { type: Boolean, default: false },
            assessmentDate: Date,
            businessImpact: {
                productivityIncrease: Number, // %
                qualityImprovement: Number, // %
                errorReduction: Number, // %
                timeToCompletionReduction: Number, // %
                customerSatisfactionIncrease: Number,
                revenueImpact: Number,
                costSavings: Number,
                otherMeasurableImpacts: [{
                    metric: String,
                    baseline: Number,
                    current: Number,
                    improvement: Number
                }]
            },
            roi: {
                totalBenefits: Number,
                totalCosts: Number,
                netBenefits: Number,
                roiPercentage: Number,
                paybackPeriod: Number // Months
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // COSTS
    // ═══════════════════════════════════════════════════════════════
    costs: {
        trainingFee: {
            baseFee: { type: Number, default: 0 },
            currency: { type: String, default: 'SAR' },
            discount: {
                discountType: {
                    type: String,
                    enum: ['early_bird', 'group', 'corporate', 'promotional']
                },
                discountPercentage: Number,
                discountAmount: Number
            },
            netTrainingFee: { type: Number, default: 0 }
        },
        additionalCosts: [additionalCostSchema],
        totalAdditionalCosts: { type: Number, default: 0 },
        totalCost: { type: Number, default: 0 },
        costAllocation: {
            companyPaid: { type: Number, default: 0 },
            companyPercentage: Number,
            employeePaid: { type: Number, default: 0 },
            employeePercentage: Number,
            sponsor: {
                sponsorName: String,
                sponsorAmount: Number
            }
        },
        budgetTracking: {
            budgetYear: Number,
            costCenter: String,
            departmentBudget: String,
            budgetAllocated: Number,
            budgetUsed: Number,
            budgetRemaining: Number,
            budgetApprovalRequired: { type: Boolean, default: false },
            budgetApproved: { type: Boolean, default: false },
            approvedBy: String
        },
        payment: {
            paymentRequired: { type: Boolean, default: true },
            paymentStatus: {
                type: String,
                enum: ['pending', 'partial', 'paid', 'refunded'],
                default: 'pending'
            },
            payments: [paymentRecordSchema],
            totalPaid: { type: Number, default: 0 },
            outstandingAmount: { type: Number, default: 0 }
        },
        reimbursement: {
            reimbursementRequired: { type: Boolean, default: false },
            reimbursementAmount: { type: Number, default: 0 },
            reimbursed: { type: Boolean, default: false },
            reimbursementDate: Date,
            reimbursementReference: String
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // COMPLIANCE TRACKING
    // ═══════════════════════════════════════════════════════════════
    complianceTracking: {
        isMandatory: { type: Boolean, default: false },
        mandatoryReason: {
            type: String,
            enum: ['regulatory', 'legal', 'safety', 'company_policy', 'role_requirement', 'license_renewal']
        },
        complianceDeadline: Date,
        gracePeriod: Number, // Days
        overdue: { type: Boolean, default: false },
        daysOverdue: { type: Number, default: 0 },
        consequencesOfNonCompliance: String,
        regulatoryBody: {
            bodyName: String,
            requirementReference: String,
            reportingRequired: Boolean,
            reportSubmitted: { type: Boolean, default: false },
            reportDate: Date
        },
        renewal: {
            renewalRequired: { type: Boolean, default: false },
            renewalFrequency: {
                type: String,
                enum: ['annual', 'biennial', 'triennial']
            },
            nextRenewalDate: Date,
            renewalReminder: {
                reminderSet: { type: Boolean, default: false },
                reminderDays: Number // Days before expiry
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // POST-TRAINING
    // ═══════════════════════════════════════════════════════════════
    postTraining: {
        followUpActions: [followUpActionSchema],
        knowledgeSharing: {
            required: { type: Boolean, default: false },
            sharingMethod: {
                type: String,
                enum: ['presentation', 'workshop', 'lunch_and_learn', 'documentation', 'mentoring', 'other']
            },
            sharingCompleted: { type: Boolean, default: false },
            sharingDate: Date,
            attendees: [String],
            attendeeCount: Number,
            materialsCreated: [String],
            feedback: String
        },
        actionPlan: {
            created: { type: Boolean, default: false },
            createdDate: Date,
            actions: [{
                action: String,
                targetDate: Date,
                resources: String,
                support: String,
                completed: { type: Boolean, default: false },
                completionDate: Date,
                impact: String
            }],
            reviewDate: Date,
            reviewedBy: String,
            allCompleted: { type: Boolean, default: false }
        },
        mentoringOthers: {
            required: { type: Boolean, default: false },
            menteesAssigned: [{
                menteeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
                menteeName: String,
                mentoringStartDate: Date,
                sessions: Number,
                ongoing: { type: Boolean, default: true }
            }]
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // DOCUMENTS & COMMUNICATIONS
    // ═══════════════════════════════════════════════════════════════
    documents: [documentSchema],
    communications: [communicationSchema],

    // ═══════════════════════════════════════════════════════════════
    // NOTES
    // ═══════════════════════════════════════════════════════════════
    notes: {
        employeeNotes: String,
        managerNotes: String,
        hrNotes: String,
        trainerNotes: String,
        internalNotes: String,
        sessionNotes: [{
            sessionNumber: Number,
            noteDate: Date,
            noteBy: String,
            note: String
        }]
    },

    // ═══════════════════════════════════════════════════════════════
    // ANALYTICS
    // ═══════════════════════════════════════════════════════════════
    analytics: {
        // Time metrics
        requestToApprovalTime: Number, // Days
        approvalToEnrollmentTime: Number,
        enrollmentToStartTime: Number,
        totalLeadTime: Number,
        // Engagement metrics
        attendanceRate: Number,
        participationLevel: {
            type: String,
            enum: ['low', 'medium', 'high']
        },
        // Performance metrics
        preTestScore: Number,
        postTestScore: Number,
        scoreImprovement: Number,
        passRate: Boolean,
        // Satisfaction
        satisfactionScore: Number,
        // ROI
        estimatedROI: Number,
        actualROI: Number,
        // Comparison
        vsCompanyAverage: {
            performance: {
                type: String,
                enum: ['above', 'at', 'below']
            },
            satisfaction: {
                type: String,
                enum: ['above', 'at', 'below']
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // RELATED RECORDS
    // ═══════════════════════════════════════════════════════════════
    relatedRecords: {
        requestId: String,
        developmentPlanId: String,
        performanceReviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'PerformanceReview' },
        relatedTrainings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Training' }],
        certificationId: String,
        expenseClaimIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseClaim' }],
        projectIds: [String]
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT FIELDS
    // ═══════════════════════════════════════════════════════════════
    createdOn: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastModifiedOn: Date,
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

// Multi-tenancy indexes
trainingSchema.index({ firmId: 1 });
trainingSchema.index({ lawyerId: 1 });
trainingSchema.index({ firmId: 1, status: 1 });

// Primary lookup indexes
trainingSchema.index({ trainingNumber: 1 });
trainingSchema.index({ trainingId: 1 });
trainingSchema.index({ employeeId: 1, status: 1 });
trainingSchema.index({ status: 1 });

// Filter indexes
trainingSchema.index({ trainingType: 1 });
trainingSchema.index({ trainingCategory: 1 });
trainingSchema.index({ deliveryMethod: 1 });
trainingSchema.index({ 'cleDetails.isCLE': 1 });
trainingSchema.index({ 'complianceTracking.isMandatory': 1 });
trainingSchema.index({ 'complianceTracking.complianceDeadline': 1 });
trainingSchema.index({ 'complianceTracking.overdue': 1 });

// Date indexes
trainingSchema.index({ startDate: 1, endDate: 1 });
trainingSchema.index({ requestDate: -1 });
trainingSchema.index({ createdOn: -1 });

// Approval workflow index
trainingSchema.index({ 'approvalWorkflow.finalStatus': 1 });
trainingSchema.index({ requestStatus: 1 });

// Completion indexes
trainingSchema.index({ 'completion.completed': 1 });
trainingSchema.index({ 'certificate.issued': 1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUAL FIELDS
// ═══════════════════════════════════════════════════════════════

trainingSchema.virtual('durationDays').get(function () {
    if (!this.startDate || !this.endDate) return 0;
    const diffTime = Math.abs(this.endDate - this.startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
});

trainingSchema.virtual('isOverdue').get(function () {
    if (!this.complianceTracking?.complianceDeadline) return false;
    return new Date() > this.complianceTracking.complianceDeadline && !this.completion?.completed;
});

trainingSchema.virtual('attendancePercentage').get(function () {
    if (!this.attendanceSummary?.totalSessions) return 0;
    return Math.round((this.attendanceSummary.attendedSessions / this.attendanceSummary.totalSessions) * 100);
});

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

// Pre-save middleware to update calculations
trainingSchema.pre('save', function (next) {
    // Update last modified date
    this.lastModifiedOn = new Date();

    // Calculate total cost
    const baseFee = this.costs?.trainingFee?.baseFee || 0;
    const discount = this.costs?.trainingFee?.discount?.discountAmount || 0;
    this.costs.trainingFee.netTrainingFee = baseFee - discount;

    const additionalTotal = (this.costs?.additionalCosts || []).reduce((sum, cost) => sum + (cost.amount || 0), 0);
    this.costs.totalAdditionalCosts = additionalTotal;
    this.costs.totalCost = this.costs.trainingFee.netTrainingFee + additionalTotal;

    // Calculate attendance summary
    if (this.sessions && this.sessions.length > 0) {
        this.attendanceSummary.totalSessions = this.sessions.length;
        this.attendanceSummary.attendedSessions = this.sessions.filter(s => s.attended).length;
        this.attendanceSummary.missedSessions = this.sessions.filter(s => s.attended === false).length;
        this.attendanceSummary.attendancePercentage = Math.round(
            (this.attendanceSummary.attendedSessions / this.attendanceSummary.totalSessions) * 100
        );
        this.attendanceSummary.meetsMinimum = this.attendanceSummary.attendancePercentage >= (this.attendanceSummary.minimumRequired || 80);

        // Calculate total hours attended
        this.attendanceSummary.totalHoursAttended = this.sessions
            .filter(s => s.attended)
            .reduce((sum, s) => sum + (s.duration || 0), 0);
    }

    // Calculate progress percentage for online courses
    if (this.progress?.totalModules > 0) {
        this.progress.progressPercentage = Math.round(
            (this.progress.completedModules / this.progress.totalModules) * 100
        );
    }

    // Update overdue status
    if (this.complianceTracking?.complianceDeadline && !this.completion?.completed) {
        const now = new Date();
        const deadline = new Date(this.complianceTracking.complianceDeadline);
        this.complianceTracking.overdue = now > deadline;
        if (this.complianceTracking.overdue) {
            this.complianceTracking.daysOverdue = Math.ceil((now - deadline) / (1000 * 60 * 60 * 24));
        }
    }

    // Calculate outstanding amount
    if (this.costs?.payment) {
        this.costs.payment.outstandingAmount = this.costs.totalCost - (this.costs.payment.totalPaid || 0);
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Generate training number
trainingSchema.statics.generateTrainingNumber = async function (firmId) {
    const year = new Date().getFullYear();
    const prefix = `TRN-${year}-`;

    const query = firmId
        ? { firmId, trainingNumber: new RegExp(`^${prefix}`) }
        : { trainingNumber: new RegExp(`^${prefix}`) };

    const lastTraining = await this.findOne(query)
        .sort({ trainingNumber: -1 })
        .select('trainingNumber');

    let sequence = 1;
    if (lastTraining) {
        const lastNum = parseInt(lastTraining.trainingNumber.split('-')[2]);
        sequence = lastNum + 1;
    }

    return `${prefix}${sequence.toString().padStart(4, '0')}`;
};

// Generate training ID
trainingSchema.statics.generateTrainingId = async function () {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `TRN-${timestamp}-${random}`.toUpperCase();
};

// Get training policies
trainingSchema.statics.getTrainingPolicies = function () {
    return TRAINING_POLICIES;
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Check if training meets completion criteria
trainingSchema.methods.checkCompletionCriteria = function () {
    const criteria = this.completion.completionCriteria;
    const results = {};

    // Check attendance
    if (criteria.attendanceRequired) {
        results.attendanceMet = this.attendanceSummary.meetsMinimum;
    }

    // Check assessment
    if (criteria.assessmentRequired) {
        const finalAssessment = this.assessments.find(a =>
            ['final_exam', 'post_assessment'].includes(a.assessmentType)
        );
        results.assessmentPassed = finalAssessment?.passed || false;
    }

    // Check score
    if (criteria.minimumScore) {
        const finalScore = this.completion.finalResults?.overallScore || 0;
        results.scoreMet = finalScore >= criteria.minimumScore;
    }

    // Check project
    if (criteria.projectRequired) {
        const projectAssessment = this.assessments.find(a => a.assessmentType === 'project');
        results.projectCompleted = projectAssessment?.passed || false;
    }

    // Check if all criteria met
    const allMet = Object.values(results).every(v => v !== false);
    results.allCriteriaMet = allMet;

    return results;
};

// Get approval workflow status
trainingSchema.methods.getApprovalStatus = function () {
    const workflow = this.approvalWorkflow;
    return {
        currentStep: workflow.currentStep,
        totalSteps: workflow.totalSteps,
        status: workflow.finalStatus,
        pendingApprovers: workflow.workflowSteps
            .filter(s => s.status === 'pending')
            .map(s => ({ stepNumber: s.stepNumber, role: s.approverRole })),
        completedSteps: workflow.workflowSteps.filter(s => s.status === 'approved').length
    };
};

// Calculate CLE credits summary
trainingSchema.methods.getCLESummary = function () {
    if (!this.cleDetails?.isCLE) return null;

    return {
        totalCredits: this.cleDetails.cleCredits || 0,
        totalHours: this.cleDetails.cleHours || 0,
        category: this.cleDetails.cleCategory,
        ethicsCredits: this.cleDetails.ethicsCredits || 0,
        specialtyCredits: this.cleDetails.specialtyCredits || 0,
        specialtyArea: this.cleDetails.specialtyArea,
        barApproved: this.cleDetails.approvedByBar,
        barJurisdiction: this.cleDetails.barJurisdiction
    };
};

const Training = mongoose.model('Training', trainingSchema);

module.exports = Training;
