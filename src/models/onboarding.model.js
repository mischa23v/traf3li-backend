const mongoose = require('mongoose');

/**
 * Onboarding Model - HR Management
 * Module 8: التأهيل والإعداد الوظيفي
 * Saudi Labor Law Compliance (Article 53 - Probation)
 */

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Document schema for pre-boarding documents
const documentSchema = new mongoose.Schema({
    documentType: {
        type: String,
        enum: ['national_id', 'passport', 'iqama', 'degree', 'certificate',
            'bar_admission', 'medical_certificate', 'vaccine_certificate',
            'bank_letter', 'photo', 'other']
    },
    documentName: String,
    documentNameAr: String,
    required: { type: Boolean, default: true },
    submitted: { type: Boolean, default: false },
    submittedDate: Date,
    verified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verificationDate: Date,
    fileUrl: String,
    expiryDate: Date,
    notes: String
}, { _id: true });

// Pre-boarding task schema
const preboardingTaskSchema = new mongoose.Schema({
    taskId: String,
    taskName: { type: String },
    taskNameAr: String,
    category: {
        type: String,
        enum: ['documents', 'it', 'workspace', 'communication', 'other'],
        default: 'other'
    },
    responsible: String,
    responsibleRole: String,
    dueDate: Date,
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'blocked'],
        default: 'pending'
    },
    completedDate: Date,
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String
}, { _id: true });

// Equipment schema
const equipmentSchema = new mongoose.Schema({
    equipmentType: {
        type: String,
        enum: ['laptop', 'desktop', 'monitor', 'keyboard', 'mouse',
            'phone', 'headset', 'other']
    },
    equipmentId: String,
    serialNumber: String,
    provided: { type: Boolean, default: false },
    providedDate: Date,
    acknowledged: { type: Boolean, default: false }
}, { _id: true });

// System access schema
const systemAccessSchema = new mongoose.Schema({
    systemName: { type: String },
    accessGranted: { type: Boolean, default: false },
    firstLogin: { type: Boolean, default: false },
    firstLoginDate: Date,
    trainingRequired: { type: Boolean, default: false },
    trainingCompleted: { type: Boolean, default: false }
}, { _id: true });

// Topic covered schema
const topicCoveredSchema = new mongoose.Schema({
    topic: { type: String },
    topicAr: String,
    covered: { type: Boolean, default: false }
}, { _id: false });

// Policy schema
const policySchema = new mongoose.Schema({
    policyName: { type: String },
    policyNameAr: String,
    category: {
        type: String,
        enum: ['hr', 'it', 'security', 'safety', 'ethics', 'legal', 'other'],
        default: 'other'
    },
    reviewed: { type: Boolean, default: false },
    reviewedDate: Date,
    acknowledged: { type: Boolean, default: false },
    acknowledgedDate: Date,
    policyUrl: String,
    testRequired: { type: Boolean, default: false },
    testPassed: Boolean,
    testScore: Number
}, { _id: true });

// Training session schema
const trainingSessionSchema = new mongoose.Schema({
    sessionId: String,
    systemName: String,
    moduleName: String,
    moduleNameAr: String,
    category: {
        type: String,
        enum: ['mandatory', 'role_specific', 'compliance', 'technical', 'soft_skills'],
        default: 'mandatory'
    },
    trainingType: {
        type: String,
        enum: ['classroom', 'online', 'shadowing', 'hands_on', 'reading', 'group', 'individual', 'self_paced'],
        default: 'online'
    },
    trainer: String,
    scheduledDate: Date,
    duration: Number, // Minutes
    conducted: { type: Boolean, default: false },
    completedDate: Date,
    materials: [String],
    handsOnPractice: { type: Boolean, default: false },
    testRequired: { type: Boolean, default: false },
    testCompleted: Boolean,
    testScore: Number,
    proficiencyLevel: {
        type: String,
        enum: ['beginner', 'basic', 'competent', 'intermediate', 'advanced'],
        default: 'beginner'
    }
}, { _id: true });

// Goal schema
const goalSchema = new mongoose.Schema({
    goalId: String,
    goalName: { type: String },
    goalType: {
        type: String,
        enum: ['30_day', '60_day', '90_day', 'probation'],
        default: '30_day'
    },
    targetMetric: String,
    targetValue: Number,
    dueDate: Date,
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed'],
        default: 'not_started'
    }
}, { _id: true });

// Checklist task schema
const checklistTaskSchema = new mongoose.Schema({
    taskId: String,
    taskName: { type: String },
    taskNameAr: String,
    description: String,
    responsible: {
        type: String,
        enum: ['hr', 'it', 'manager', 'employee', 'facilities', 'finance', 'other'],
        default: 'hr'
    },
    responsiblePerson: String,
    dueDate: Date,
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed', 'blocked', 'not_applicable'],
        default: 'not_started'
    },
    completedDate: Date,
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verificationRequired: { type: Boolean, default: false },
    verified: Boolean,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    blockedReason: String,
    attachments: [String],
    notes: String
}, { _id: true });

// Checklist category schema
const checklistCategorySchema = new mongoose.Schema({
    categoryId: String,
    categoryName: { type: String },
    categoryNameAr: String,
    tasks: [checklistTaskSchema],
    completionPercentage: { type: Number, default: 0 }
}, { _id: true });

// Probation review schema
const probationReviewSchema = new mongoose.Schema({
    reviewId: String,
    reviewType: {
        type: String,
        enum: ['30_day', '60_day', '90_day', 'final', 'ad_hoc']
    },
    reviewDay: Number,
    scheduledDate: { type: Date },
    conducted: { type: Boolean, default: false },
    conductedDate: Date,
    conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Performance assessment
    performanceAssessment: {
        workQuality: { type: Number, min: 1, max: 5 },
        productivity: { type: Number, min: 1, max: 5 },
        reliability: { type: Number, min: 1, max: 5 },
        teamwork: { type: Number, min: 1, max: 5 },
        communication: { type: Number, min: 1, max: 5 },
        initiative: { type: Number, min: 1, max: 5 },
        adaptability: { type: Number, min: 1, max: 5 },
        professionalism: { type: Number, min: 1, max: 5 },
        overallRating: { type: Number, min: 1, max: 5 }
    },

    // Competency ratings
    competencyRatings: [{
        competency: String,
        rating: { type: Number, min: 1, max: 5 },
        comments: String
    }],

    // Goals progress
    goalsProgress: [{
        goalName: String,
        achievementPercentage: Number,
        onTrack: Boolean
    }],

    // Feedback
    strengths: [String],
    areasForImprovement: [String],
    managerComments: String,
    employeeComments: String,

    // Recommendation
    recommendation: {
        type: String,
        enum: ['on_track', 'needs_improvement', 'at_risk',
            'recommend_confirmation', 'recommend_termination']
    },
    recommendationReason: String,

    // Action items
    actionItems: [{
        action: String,
        owner: String,
        dueDate: Date,
        status: {
            type: String,
            enum: ['pending', 'in_progress', 'completed'],
            default: 'pending'
        }
    }],

    nextReviewDate: Date,
    reviewDocument: String,

    employeeAcknowledged: { type: Boolean, default: false },
    acknowledgedDate: Date
}, { _id: true });

// Employee feedback session schema
const feedbackSessionSchema = new mongoose.Schema({
    sessionDate: { type: Date, default: Date.now },
    sessionType: {
        type: String,
        enum: ['first_day', 'first_week', 'first_month', '30_day', '60_day', '90_day']
    },
    overallSatisfaction: { type: Number, min: 1, max: 5 },
    experienceRatings: {
        preboarding: { type: Number, min: 1, max: 5 },
        firstDay: { type: Number, min: 1, max: 5 },
        training: { type: Number, min: 1, max: 5 },
        managerSupport: { type: Number, min: 1, max: 5 },
        teamIntegration: { type: Number, min: 1, max: 5 },
        resources: { type: Number, min: 1, max: 5 },
        clarity: { type: Number, min: 1, max: 5 }
    },
    positiveAspects: String,
    challenges: String,
    suggestions: String,
    questionsOrConcerns: String,
    wouldRecommend: Boolean
}, { _id: true });

// Onboarding document schema
const onboardingDocumentSchema = new mongoose.Schema({
    documentType: {
        type: String,
        enum: ['contract', 'handbook_acknowledgment', 'policy_acknowledgment',
            'training_certificate', 'equipment_acknowledgment', 'id_badge',
            'probation_review', 'confirmation_letter', 'other']
    },
    documentName: String,
    documentNameAr: String,
    required: { type: Boolean, default: false },
    fileUrl: String,
    uploadedOn: Date,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    signed: { type: Boolean, default: false },
    signedDate: Date,
    signature: String,
    expiryDate: Date
}, { _id: true });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const onboardingSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    onboardingId: {
        type: String,
        unique: true,
        sparse: true
    },
    onboardingNumber: String,

    // ═══════════════════════════════════════════════════════════════
    // EMPLOYEE INFO
    // ═══════════════════════════════════════════════════════════════
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    employeeNumber: String,
    employeeName: { type: String },
    employeeNameAr: String,
    nationalId: String,
    email: String,
    phone: String,

    jobTitle: { type: String },
    jobTitleAr: String,
    department: String,
    location: String,

    employmentType: {
        type: String,
        enum: ['full_time', 'part_time', 'contract', 'temporary'],
        default: 'full_time'
    },
    contractType: {
        type: String,
        enum: ['indefinite', 'fixed_term'],
        default: 'indefinite'
    },

    hireDate: Date,

    // Manager info
    managerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    managerName: { type: String },
    managerEmail: String,

    // Transfer/promotion
    isTransfer: { type: Boolean, default: false },
    isPromotion: { type: Boolean, default: false },
    previousDepartment: String,
    previousRole: String,

    // ═══════════════════════════════════════════════════════════════
    // DATES
    // ═══════════════════════════════════════════════════════════════
    startDate: { type: Date },
    completionTargetDate: Date,

    // ═══════════════════════════════════════════════════════════════
    // PROBATION (Saudi Labor Law - Article 53) - MAX 180 days, NO extension
    // ═══════════════════════════════════════════════════════════════
    probation: {
        probationPeriod: { type: Number, default: 90, max: 180 }, // Days, max 180
        probationStartDate: Date,
        probationEndDate: Date,
        onProbation: { type: Boolean, default: true },
        probationStatus: {
            type: String,
            enum: ['active', 'passed', 'failed'],
            default: 'active'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // COMPLETION TRACKING
    // ═══════════════════════════════════════════════════════════════
    completion: {
        tasksCompleted: { type: Number, default: 0 },
        tasksTotal: { type: Number, default: 0 },
        completionPercentage: { type: Number, default: 0 }
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'],
        default: 'pending'
    },

    // ═══════════════════════════════════════════════════════════════
    // PRE-BOARDING (Before First Day)
    // ═══════════════════════════════════════════════════════════════
    preBoarding: {
        // Welcome package
        welcomePackage: {
            sent: { type: Boolean, default: false },
            sentDate: Date,
            welcomeEmail: {
                sent: { type: Boolean, default: false },
                sentDate: Date,
                openedDate: Date
            },
            welcomeKit: {
                sent: { type: Boolean, default: false },
                contents: [String],
                trackingNumber: String,
                deliveredDate: Date
            },
            companyHandbook: {
                sent: { type: Boolean, default: false },
                format: {
                    type: String,
                    enum: ['pdf', 'physical', 'portal'],
                    default: 'pdf'
                },
                acknowledgedDate: Date
            }
        },

        // Documents collection
        documentsCollection: {
            documentsRequired: [documentSchema],
            allDocumentsCollected: { type: Boolean, default: false },
            documentationComplete: { type: Boolean, default: false }
        },

        // Contract signing
        contractSigning: {
            contractSent: { type: Boolean, default: false },
            contractSentDate: Date,
            contractType: {
                type: String,
                enum: ['indefinite', 'fixed_term'],
                default: 'indefinite'
            },
            contractDuration: Number,
            contractUrl: String,
            contractSigned: { type: Boolean, default: false },
            signedDate: Date,
            signedContractUrl: String,
            contractNumber: String
        },

        // IT account setup
        itAccountSetup: {
            requested: { type: Boolean, default: false },
            requestDate: Date,
            emailCreated: { type: Boolean, default: false },
            emailAddress: String,
            systemAccessCreated: { type: Boolean, default: false },
            credentialsSent: { type: Boolean, default: false },
            credentialsSentDate: Date,
            completed: { type: Boolean, default: false },
            completedDate: Date
        },

        // Workstation preparation
        workstationPrep: {
            requested: { type: Boolean, default: false },
            location: String,
            deskNumber: String,
            assigned: { type: Boolean, default: false },
            assignedDate: Date,
            equipmentReady: { type: Boolean, default: false },
            completed: { type: Boolean, default: false }
        },

        // Pre-boarding tasks
        preboardingTasks: [preboardingTaskSchema],

        preboardingComplete: { type: Boolean, default: false },
        preboardingCompletionDate: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // FIRST DAY
    // ═══════════════════════════════════════════════════════════════
    firstDay: {
        date: Date,

        // Arrival
        arrival: {
            expectedTime: String,
            actualArrivalTime: Date,
            greeterAssigned: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            greeterName: String,
            welcomed: { type: Boolean, default: false }
        },

        // ID Badge
        idBadge: {
            issued: { type: Boolean, default: false },
            badgeNumber: String,
            issuedDate: Date,
            photoTaken: { type: Boolean, default: false },
            accessLevels: [String]
        },

        // Workstation setup
        workstation: {
            shown: { type: Boolean, default: false },
            location: String,
            deskNumber: String,
            equipmentProvided: [equipmentSchema],
            setupComplete: { type: Boolean, default: false }
        },

        // IT login
        itLogin: {
            email: {
                accessed: { type: Boolean, default: false },
                firstLoginDate: Date
            },
            systems: [systemAccessSchema],
            vpn: {
                setup: { type: Boolean, default: false },
                tested: { type: Boolean, default: false }
            },
            allSystemsAccessed: { type: Boolean, default: false }
        },

        // Orientation session
        orientation: {
            conducted: { type: Boolean, default: false },
            conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            duration: Number, // Minutes
            topicsCovered: [topicCoveredSchema],
            materialsProvided: [String],
            completed: { type: Boolean, default: false }
        },

        // Team introduction
        teamIntroduction: {
            conducted: { type: Boolean, default: false },
            teamMembersIntroduced: { type: Number, default: 0 },
            teamMeetingHeld: { type: Boolean, default: false },
            iceBreaker: Boolean,
            completed: { type: Boolean, default: false }
        },

        // Welcome lunch
        welcomeLunch: {
            scheduled: { type: Boolean, default: false },
            attendees: [String],
            completed: { type: Boolean, default: false }
        },

        // HR meeting
        hrMeeting: {
            scheduled: { type: Boolean, default: false },
            scheduledTime: Date,
            conducted: { type: Boolean, default: false },
            conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            topicsCovered: [{
                topic: {
                    type: String,
                    enum: ['policies', 'benefits', 'payroll', 'leave', 'performance',
                        'code_of_conduct', 'labor_law', 'other']
                },
                covered: { type: Boolean, default: false }
            }],
            questionsAnswered: String,
            completed: { type: Boolean, default: false }
        },

        // First day tasks
        firstDayTasks: [{
            taskId: String,
            taskName: String,
            taskNameAr: String,
            category: {
                type: String,
                enum: ['arrival', 'setup', 'meetings', 'training', 'other'],
                default: 'other'
            },
            dueTime: String,
            completed: { type: Boolean, default: false },
            completedTime: Date,
            notes: String
        }],

        // First day feedback
        firstDayFeedback: {
            provided: { type: Boolean, default: false },
            rating: { type: Number, min: 1, max: 5 },
            experience: String,
            challenges: String,
            suggestions: String
        },

        firstDayComplete: { type: Boolean, default: false }
    },

    // ═══════════════════════════════════════════════════════════════
    // FIRST WEEK
    // ═══════════════════════════════════════════════════════════════
    firstWeek: {
        weekNumber: { type: Number, default: 1 },
        weekStartDate: Date,
        weekEndDate: Date,

        // Policies review
        policiesReview: {
            required: { type: Boolean, default: true },
            policies: [policySchema],
            allPoliciesReviewed: { type: Boolean, default: false }
        },

        // Saudi labor law training (REQUIRED)
        laborLawTraining: {
            required: { type: Boolean, default: true },
            scheduled: { type: Boolean, default: false },
            scheduledDate: Date,
            conducted: { type: Boolean, default: false },
            conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            topicsCovered: [{
                topic: String,
                article: String, // Saudi Labor Law article
                covered: { type: Boolean, default: false }
            }],
            keyTopics: {
                workingHours: { type: Boolean, default: false }, // Articles 98-108
                leaveEntitlements: { type: Boolean, default: false }, // Articles 109-117
                disciplinaryProcedures: { type: Boolean, default: false }, // Articles 66-80
                endOfService: { type: Boolean, default: false }, // Articles 84-87
                womenRights: { type: Boolean, default: false }, // Articles 149-160
                employeeRights: { type: Boolean, default: false },
                employerRights: { type: Boolean, default: false }
            },
            materialProvided: String,
            testRequired: { type: Boolean, default: false },
            testCompleted: Boolean,
            testScore: Number,
            passingScore: Number,
            certificateIssued: Boolean,
            completed: { type: Boolean, default: false },
            completedDate: Date
        },

        // Safety training
        safetyTraining: {
            required: { type: Boolean, default: false },
            scheduled: { type: Boolean, default: false },
            conducted: { type: Boolean, default: false },
            conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            topicsCovered: [String],
            safetyEquipmentIssued: [{
                equipmentType: String,
                quantity: Number,
                issuedDate: Date
            }],
            testRequired: { type: Boolean, default: false },
            testPassed: Boolean,
            certificateIssued: Boolean,
            completed: { type: Boolean, default: false }
        },

        // Systems training
        systemsTraining: {
            trainingSessions: [trainingSessionSchema],
            allTrainingsCompleted: { type: Boolean, default: false }
        },

        // Role clarification
        roleClarification: {
            jobDescriptionReviewed: { type: Boolean, default: false },
            responsibilitiesDiscussed: { type: Boolean, default: false },
            expectationsClarified: { type: Boolean, default: false },
            kpisDiscussed: { type: Boolean, default: false },
            performanceStandardsReviewed: { type: Boolean, default: false },
            questionsAnswered: { type: Boolean, default: false },
            completed: { type: Boolean, default: false }
        },

        // Goals setting
        goalsSetting: {
            required: { type: Boolean, default: true },
            goalsSet: { type: Boolean, default: false },
            goals: [goalSchema],
            goalDocumentSigned: { type: Boolean, default: false }
        },

        // Buddy assignment
        buddyAssignment: {
            assigned: { type: Boolean, default: false },
            buddyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
            buddyName: String,
            buddyRole: {
                type: String,
                enum: ['peer_buddy', 'mentor', 'coach'],
                default: 'peer_buddy'
            },
            assignmentDate: Date,
            introducedToBuddy: { type: Boolean, default: false },
            meetingSchedule: String,
            checkIns: [{
                checkInDate: Date,
                duration: Number,
                topics: String,
                notes: String
            }]
        },

        // First week tasks
        firstWeekTasks: [{
            taskId: String,
            taskName: String,
            taskNameAr: String,
            category: {
                type: String,
                enum: ['training', 'setup', 'meetings', 'learning', 'other'],
                default: 'other'
            },
            dueDate: Date,
            priority: {
                type: String,
                enum: ['low', 'medium', 'high'],
                default: 'medium'
            },
            completed: { type: Boolean, default: false },
            completedDate: Date,
            notes: String
        }],

        // Weekly check-in
        weeklyCheckIn: {
            scheduled: { type: Boolean, default: false },
            scheduledDate: Date,
            conducted: { type: Boolean, default: false },
            conductedDate: Date,
            conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            employeeFeedback: {
                howIsItGoing: String,
                challenges: String,
                support: String,
                questions: String,
                rating: { type: Number, min: 1, max: 5 }
            },
            managerNotes: String,
            actionItems: [{
                action: String,
                owner: String,
                dueDate: Date
            }]
        },

        firstWeekComplete: { type: Boolean, default: false },
        firstWeekCompletionDate: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // FIRST MONTH
    // ═══════════════════════════════════════════════════════════════
    firstMonth: {
        monthStartDate: Date,
        monthEndDate: Date,

        // Weekly check-ins
        weeklyCheckIns: [{
            weekNumber: Number,
            checkInDate: Date,
            conducted: { type: Boolean, default: false },
            conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            topics: [{
                topic: String,
                discussed: { type: Boolean, default: false }
            }],
            employeeFeedback: {
                progressRating: { type: Number, min: 1, max: 5 },
                challenges: String,
                wins: String,
                supportNeeded: String
            },
            managerFeedback: {
                performanceObservations: String,
                strengths: String,
                areasForDevelopment: String,
                guidance: String
            },
            actionItems: [{
                action: String,
                owner: String,
                dueDate: Date,
                completed: { type: Boolean, default: false }
            }],
            notes: String
        }],

        // Role-specific training
        roleSpecificTraining: {
            trainingModules: [trainingSessionSchema],
            allTrainingCompleted: { type: Boolean, default: false }
        },

        // Initial feedback
        initialFeedback: {
            scheduled: { type: Boolean, default: false },
            scheduledDate: Date,
            conducted: { type: Boolean, default: false },
            conductedDate: Date,
            feedbackAreas: {
                workQuality: { rating: Number, comments: String },
                productivity: { rating: Number, comments: String },
                teamwork: { rating: Number, comments: String },
                communication: { rating: Number, comments: String },
                initiative: { rating: Number, comments: String },
                learning: { rating: Number, comments: String }
            },
            overallRating: { type: Number, min: 1, max: 5 },
            strengths: [String],
            areasForImprovement: [String],
            developmentPlan: [{
                area: String,
                action: String,
                timeline: String
            }],
            employeeComments: String,
            feedbackDocument: String
        },

        firstMonthComplete: { type: Boolean, default: false },
        firstMonthCompletionDate: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // PROBATION TRACKING - NO EXTENSION (Saudi Labor Law Article 53)
    // ═══════════════════════════════════════════════════════════════
    probationTracking: {
        probationInfo: {
            probationPeriod: { type: Number, max: 180 }, // Max 180 days
            probationStartDate: Date,
            probationEndDate: Date,
            currentStatus: {
                type: String,
                enum: ['active', 'passed', 'failed'],
                default: 'active'
            }
        },

        // Milestones
        milestones: [{
            milestoneId: String,
            milestoneType: {
                type: String,
                enum: ['30_day', '60_day', '90_day', 'final']
            },
            milestoneDay: Number,
            milestoneDate: Date,
            reviewRequired: { type: Boolean, default: true },
            objectives: [{
                objective: String,
                achieved: { type: Boolean, default: false },
                notes: String
            }],
            completed: { type: Boolean, default: false },
            completedDate: Date
        }],

        // Probation reviews
        probationReviews: [probationReviewSchema],

        // Final review
        finalReview: {
            scheduled: { type: Boolean, default: false },
            scheduledDate: Date,
            conducted: { type: Boolean, default: false },
            conductedDate: Date,
            reviewers: [{
                reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                reviewerName: String,
                reviewerRole: String,
                recommendation: {
                    type: String,
                    enum: ['confirm', 'terminate']
                },
                comments: String
            }],

            // Final assessment
            finalAssessment: {
                technicalCompetence: { type: Number, min: 1, max: 5 },
                jobKnowledge: { type: Number, min: 1, max: 5 },
                workQuality: { type: Number, min: 1, max: 5 },
                productivity: { type: Number, min: 1, max: 5 },
                reliability: { type: Number, min: 1, max: 5 },
                teamwork: { type: Number, min: 1, max: 5 },
                communication: { type: Number, min: 1, max: 5 },
                professionalism: { type: Number, min: 1, max: 5 },
                culturalFit: { type: Number, min: 1, max: 5 },
                overallRating: { type: Number, min: 1, max: 5 }
            },

            keyAchievements: [String],
            challengesOvercome: [String],
            developmentAreas: [String],

            // Decision - NO extension option
            decision: {
                type: String,
                enum: ['confirm', 'terminate']
            },
            decisionReason: String,

            // If confirmed
            confirmation: {
                confirmationDate: Date,
                confirmationLetter: String,
                salaryReview: {
                    salaryAdjusted: Boolean,
                    newSalary: Number,
                    adjustmentPercentage: Number,
                    effectiveDate: Date
                },
                benefitsActivation: {
                    date: Date,
                    benefits: [String]
                }
            },

            // If terminated
            termination: {
                terminationDate: Date,
                terminationReason: String,
                terminationArticle: String, // Saudi Labor Law article
                severancePayable: { type: Boolean, default: false },
                severanceAmount: Number,
                noticeGiven: Boolean,
                noticePeriod: Number
            },

            // Approvals
            approvals: [{
                approverRole: String,
                approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                approverName: String,
                approved: { type: Boolean, default: false },
                approvalDate: Date
            }],

            employeeAcknowledged: { type: Boolean, default: false },
            acknowledgedDate: Date,
            employeeComments: String,

            hrProcessed: { type: Boolean, default: false },
            processedDate: Date,
            processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // ONBOARDING CHECKLIST
    // ═══════════════════════════════════════════════════════════════
    onboardingChecklist: {
        categories: [checklistCategorySchema],
        overallCompletion: { type: Number, default: 0 },
        criticalTasksCompleted: { type: Boolean, default: false },
        blockedTasks: { type: Number, default: 0 }
    },

    // ═══════════════════════════════════════════════════════════════
    // TRAINING COMPLETION
    // ═══════════════════════════════════════════════════════════════
    trainingCompletion: {
        requiredTrainings: { type: Number, default: 0 },
        completedTrainings: { type: Number, default: 0 },
        trainings: [{
            trainingId: String,
            trainingName: String,
            category: {
                type: String,
                enum: ['mandatory', 'role_specific', 'compliance', 'technical', 'soft_skills']
            },
            required: { type: Boolean, default: true },
            completed: { type: Boolean, default: false },
            completionDate: Date,
            certificateIssued: Boolean,
            certificateUrl: String,
            expiryDate: Date
        }],
        allMandatoryCompleted: { type: Boolean, default: false }
    },

    // ═══════════════════════════════════════════════════════════════
    // EMPLOYEE FEEDBACK
    // ═══════════════════════════════════════════════════════════════
    employeeFeedback: {
        feedbackSessions: [feedbackSessionSchema],
        aggregatedFeedback: {
            averageSatisfaction: Number,
            commonChallenges: [String],
            commonSuggestions: [String]
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // COMPLETION & HANDOFF
    // ═══════════════════════════════════════════════════════════════
    onboardingCompletion: {
        allTasksCompleted: { type: Boolean, default: false },
        completionDate: Date,
        probationStatus: {
            type: String,
            enum: ['ongoing', 'passed', 'failed'],
            default: 'ongoing'
        },
        onboardingSuccessful: { type: Boolean, default: false },

        finalReview: {
            conducted: { type: Boolean, default: false },
            conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            conductedDate: Date,
            overallAssessment: String,
            readyForFullRole: { type: Boolean, default: false },
            outstandingItems: [String],
            handoffToManager: { type: Boolean, default: false },
            handoffDate: Date
        },

        confirmationLetter: {
            issued: { type: Boolean, default: false },
            issueDate: Date,
            letterUrl: String
        },

        onboardingClosed: { type: Boolean, default: false },
        closedDate: Date,
        closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },

    // ═══════════════════════════════════════════════════════════════
    // DOCUMENTS
    // ═══════════════════════════════════════════════════════════════
    documents: [onboardingDocumentSchema],

    // ═══════════════════════════════════════════════════════════════
    // NOTES
    // ═══════════════════════════════════════════════════════════════
    notes: {
        hrNotes: String,
        managerNotes: String,
        itNotes: String,
        internalNotes: String,
        concerns: String,
        escalations: String
    },

    // ═══════════════════════════════════════════════════════════════
    // METRICS
    // ═══════════════════════════════════════════════════════════════
    metrics: {
        totalDurationDays: Number,
        timeToProductivity: Number, // Days
        trainingHoursCompleted: Number,
        checkInsCompleted: Number,
        satisfactionScore: Number,
        retentionRisk: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'low'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // RELATED RECORDS
    // ═══════════════════════════════════════════════════════════════
    relatedRecords: {
        applicantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Applicant' },
        recruitmentId: String,
        equipmentAssignmentIds: [String],
        trainingRecordIds: [String],
        performanceReviewIds: [String]
    },

    // ═══════════════════════════════════════════════════════════════
    // OWNERSHIP - Multi-tenancy
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastModifiedBy: {
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
onboardingSchema.index({ firmId: 1, status: 1 });
onboardingSchema.index({ lawyerId: 1, status: 1 });
onboardingSchema.index({ employeeId: 1 });
onboardingSchema.index({ onboardingId: 1 });
onboardingSchema.index({ 'probation.probationStatus': 1 });
onboardingSchema.index({ startDate: 1 });
onboardingSchema.index({ 'probation.probationEndDate': 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

// Generate onboarding ID and calculate probation dates
onboardingSchema.pre('save', async function(next) {
    // Generate onboarding ID
    if (!this.onboardingId) {
        const year = new Date().getFullYear();
        const count = await this.constructor.countDocuments({
            $or: [
                { firmId: this.firmId },
                { lawyerId: this.lawyerId }
            ],
            createdAt: {
                $gte: new Date(year, 0, 1),
                $lt: new Date(year + 1, 0, 1)
            }
        });
        this.onboardingId = `ONB-${year}-${String(count + 1).padStart(3, '0')}`;
        this.onboardingNumber = this.onboardingId;
    }

    // Calculate probation dates
    if (this.startDate && !this.probation.probationStartDate) {
        this.probation.probationStartDate = this.startDate;
    }

    if (this.probation.probationStartDate && this.probation.probationPeriod && !this.probation.probationEndDate) {
        const endDate = new Date(this.probation.probationStartDate);
        endDate.setDate(endDate.getDate() + this.probation.probationPeriod);
        this.probation.probationEndDate = endDate;
    }

    // Copy probation info to tracking
    if (this.probation) {
        this.probationTracking.probationInfo.probationPeriod = this.probation.probationPeriod;
        this.probationTracking.probationInfo.probationStartDate = this.probation.probationStartDate;
        this.probationTracking.probationInfo.probationEndDate = this.probation.probationEndDate;
        this.probationTracking.probationInfo.currentStatus = this.probation.probationStatus;
    }

    // Set first week dates
    if (this.startDate && !this.firstWeek.weekStartDate) {
        this.firstWeek.weekStartDate = this.startDate;
        const weekEnd = new Date(this.startDate);
        weekEnd.setDate(weekEnd.getDate() + 6);
        this.firstWeek.weekEndDate = weekEnd;
    }

    // Set first month dates
    if (this.startDate && !this.firstMonth.monthStartDate) {
        this.firstMonth.monthStartDate = this.startDate;
        const monthEnd = new Date(this.startDate);
        monthEnd.setDate(monthEnd.getDate() + 29);
        this.firstMonth.monthEndDate = monthEnd;
    }

    // Set first day date
    if (this.startDate && !this.firstDay.date) {
        this.firstDay.date = this.startDate;
    }

    // Calculate completion percentage
    this.calculateCompletionPercentage();

    next();
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Calculate completion percentage
onboardingSchema.methods.calculateCompletionPercentage = function() {
    let totalTasks = 0;
    let completedTasks = 0;

    // Pre-boarding tasks
    if (this.preBoarding?.preboardingTasks?.length > 0) {
        totalTasks += this.preBoarding.preboardingTasks.length;
        completedTasks += this.preBoarding.preboardingTasks.filter(t => t.status === 'completed').length;
    }

    // First day tasks
    if (this.firstDay?.firstDayTasks?.length > 0) {
        totalTasks += this.firstDay.firstDayTasks.length;
        completedTasks += this.firstDay.firstDayTasks.filter(t => t.completed).length;
    }

    // First week tasks
    if (this.firstWeek?.firstWeekTasks?.length > 0) {
        totalTasks += this.firstWeek.firstWeekTasks.length;
        completedTasks += this.firstWeek.firstWeekTasks.filter(t => t.completed).length;
    }

    // Checklist tasks
    if (this.onboardingChecklist?.categories?.length > 0) {
        this.onboardingChecklist.categories.forEach(category => {
            if (category.tasks?.length > 0) {
                totalTasks += category.tasks.length;
                completedTasks += category.tasks.filter(t => t.status === 'completed').length;
            }
        });
    }

    // Update completion
    this.completion.tasksTotal = totalTasks;
    this.completion.tasksCompleted = completedTasks;
    this.completion.completionPercentage = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

    // Update checklist overall completion
    if (this.onboardingChecklist?.categories?.length > 0) {
        let categoryTotal = 0;
        this.onboardingChecklist.categories.forEach(category => {
            if (category.tasks?.length > 0) {
                const catCompleted = category.tasks.filter(t => t.status === 'completed').length;
                category.completionPercentage = Math.round((catCompleted / category.tasks.length) * 100);
                categoryTotal += category.completionPercentage;
            }
        });
        this.onboardingChecklist.overallCompletion = Math.round(categoryTotal / this.onboardingChecklist.categories.length);

        // Count blocked tasks
        let blockedCount = 0;
        this.onboardingChecklist.categories.forEach(category => {
            if (category.tasks) {
                blockedCount += category.tasks.filter(t => t.status === 'blocked').length;
            }
        });
        this.onboardingChecklist.blockedTasks = blockedCount;
    }

    return this.completion.completionPercentage;
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get onboardings for firm or solo lawyer
onboardingSchema.statics.getOnboardings = function(firmId, lawyerId, filters = {}) {
    const query = {};
    if (firmId) {
        query.firmId = firmId;
    } else if (lawyerId) {
        query.lawyerId = lawyerId;
    }
    return this.find({ ...query, ...filters })
        .populate('employeeId', 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish')
        .populate('managerId', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 });
};

// Get stats
onboardingSchema.statics.getStats = async function(firmId, lawyerId) {
    const query = {};
    if (firmId) {
        query.firmId = firmId;
    } else if (lawyerId) {
        query.lawyerId = lawyerId;
    }

    const [stats] = await this.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                totalOnboardings: { $sum: 1 },
                byStatus: {
                    $push: '$status'
                },
                byProbationStatus: {
                    $push: '$probation.probationStatus'
                },
                avgCompletionRate: { $avg: '$completion.completionPercentage' }
            }
        }
    ]);

    if (!stats) {
        return {
            totalOnboardings: 0,
            byStatus: [],
            byProbationStatus: [],
            averageCompletionRate: 0,
            overdueOnboardings: 0,
            upcomingProbationReviews: 0,
            thisMonth: { started: 0, completed: 0, cancelled: 0 }
        };
    }

    // Count by status
    const statusCounts = {};
    stats.byStatus.forEach(s => {
        statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    // Count by probation status
    const probationStatusCounts = {};
    stats.byProbationStatus.forEach(s => {
        probationStatusCounts[s] = (probationStatusCounts[s] || 0) + 1;
    });

    // Get overdue count
    const overdueCount = await this.countDocuments({
        ...query,
        status: { $in: ['pending', 'in_progress'] },
        completionTargetDate: { $lt: new Date() }
    });

    // Get upcoming probation reviews (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const upcomingReviews = await this.countDocuments({
        ...query,
        'probation.onProbation': true,
        'probation.probationEndDate': { $lte: thirtyDaysFromNow, $gte: new Date() }
    });

    // Get this month's stats
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthStarted = await this.countDocuments({
        ...query,
        createdAt: { $gte: startOfMonth }
    });

    const thisMonthCompleted = await this.countDocuments({
        ...query,
        status: 'completed',
        'onboardingCompletion.completionDate': { $gte: startOfMonth }
    });

    const thisMonthCancelled = await this.countDocuments({
        ...query,
        status: 'cancelled',
        updatedAt: { $gte: startOfMonth }
    });

    return {
        totalOnboardings: stats.totalOnboardings,
        byStatus: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
        byProbationStatus: Object.entries(probationStatusCounts).map(([status, count]) => ({ status, count })),
        averageCompletionRate: Math.round(stats.avgCompletionRate || 0),
        overdueOnboardings: overdueCount,
        upcomingProbationReviews: upcomingReviews,
        thisMonth: {
            started: thisMonthStarted,
            completed: thisMonthCompleted,
            cancelled: thisMonthCancelled
        }
    };
};

// Get upcoming reviews
onboardingSchema.statics.getUpcomingReviews = async function(firmId, lawyerId, days = 30) {
    const query = {};
    if (firmId) {
        query.firmId = firmId;
    } else if (lawyerId) {
        query.lawyerId = lawyerId;
    }
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.find({
        ...query,
        'probation.onProbation': true,
        'probation.probationEndDate': { $lte: futureDate, $gte: new Date() }
    })
        .populate('employeeId', 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish')
        .populate('managerId', 'firstName lastName')
        .sort({ 'probation.probationEndDate': 1 });
};

// Ensure virtuals are included in JSON
onboardingSchema.set('toJSON', { virtuals: true });
onboardingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Onboarding', onboardingSchema);
