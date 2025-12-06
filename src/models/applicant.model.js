const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Applicant Model
 * MODULE 7: التوظيف ونظام تتبع المتقدمين (Recruitment & ATS)
 * Saudi Labor Law Compliance: Articles 53, 98-102, 109
 */

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Education Schema
const EducationSchema = new Schema({
    degree: {
        type: String,
        enum: ['high_school', 'diploma', 'bachelor', 'master', 'phd', 'professional', 'other'],
        required: true
    },
    degreeName: String,
    degreeNameAr: String,
    institution: { type: String, required: true },
    institutionAr: String,
    country: String,
    countryAr: String,
    fieldOfStudy: String,
    fieldOfStudyAr: String,
    startDate: Date,
    endDate: Date,
    graduationYear: Number,
    gpa: Number,
    maxGpa: { type: Number, default: 4.0 },
    honors: String,
    honorsAr: String,
    verified: { type: Boolean, default: false },
    verificationDate: Date,
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { _id: true });

// Work Experience Schema
const WorkExperienceSchema = new Schema({
    company: { type: String, required: true },
    companyAr: String,
    industry: String,
    position: { type: String, required: true },
    positionAr: String,
    department: String,
    departmentAr: String,
    location: String,
    locationAr: String,
    country: String,
    employmentType: {
        type: String,
        enum: ['full_time', 'part_time', 'contract', 'internship', 'freelance'],
        default: 'full_time'
    },
    startDate: { type: Date, required: true },
    endDate: Date,
    isCurrent: { type: Boolean, default: false },
    responsibilities: [String],
    responsibilitiesAr: [String],
    achievements: [String],
    achievementsAr: [String],
    reasonForLeaving: String,
    supervisorName: String,
    supervisorPhone: String,
    supervisorEmail: String,
    canContact: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    verificationDate: Date,
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { _id: true });

// Skill Schema
const ApplicantSkillSchema = new Schema({
    skillName: { type: String, required: true },
    skillNameAr: String,
    category: {
        type: String,
        enum: ['technical', 'soft', 'language', 'legal', 'software', 'other'],
        default: 'technical'
    },
    proficiencyLevel: {
        type: String,
        enum: ['basic', 'intermediate', 'advanced', 'expert'],
        default: 'intermediate'
    },
    yearsOfExperience: Number,
    certifiedIn: { type: Boolean, default: false },
    certificationName: String,
    lastUsed: Date
}, { _id: false });

// Language Schema
const LanguageSchema = new Schema({
    language: { type: String, required: true },
    languageAr: String,
    readingLevel: {
        type: String,
        enum: ['none', 'basic', 'intermediate', 'advanced', 'native'],
        default: 'intermediate'
    },
    writingLevel: {
        type: String,
        enum: ['none', 'basic', 'intermediate', 'advanced', 'native'],
        default: 'intermediate'
    },
    speakingLevel: {
        type: String,
        enum: ['none', 'basic', 'intermediate', 'advanced', 'native'],
        default: 'intermediate'
    },
    isNative: { type: Boolean, default: false },
    certifications: [{
        name: String,
        score: String,
        date: Date
    }]
}, { _id: false });

// Certification Schema
const CertificationSchema = new Schema({
    name: { type: String, required: true },
    nameAr: String,
    issuingOrganization: String,
    issuingOrganizationAr: String,
    issueDate: Date,
    expirationDate: Date,
    credentialId: String,
    credentialUrl: String,
    verified: { type: Boolean, default: false },
    verificationDate: Date
}, { _id: true });

// Reference Schema
const ReferenceSchema = new Schema({
    name: { type: String, required: true },
    nameAr: String,
    relationship: {
        type: String,
        enum: ['supervisor', 'colleague', 'client', 'professor', 'mentor', 'other'],
        required: true
    },
    company: String,
    companyAr: String,
    position: String,
    positionAr: String,
    email: String,
    phone: String,
    preferredContact: {
        type: String,
        enum: ['email', 'phone', 'any'],
        default: 'email'
    },
    notes: String,
    // Reference check results
    contacted: { type: Boolean, default: false },
    contactedDate: Date,
    contactedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    response: {
        received: { type: Boolean, default: false },
        receivedDate: Date,
        overallRating: {
            type: String,
            enum: ['excellent', 'good', 'satisfactory', 'poor', 'no_response']
        },
        wouldRehire: { type: Boolean },
        strengths: [String],
        areasForImprovement: [String],
        comments: String,
        redFlags: [String]
    }
}, { _id: true });

// Document Schema
const ApplicantDocumentSchema = new Schema({
    documentType: {
        type: String,
        enum: ['resume', 'cover_letter', 'portfolio', 'certificate', 'transcript',
               'id', 'passport', 'visa', 'work_permit', 'driving_license',
               'reference_letter', 'writing_sample', 'other'],
        required: true
    },
    documentName: String,
    documentNameAr: String,
    fileName: String,
    fileUrl: String,
    fileSize: Number,
    mimeType: String,
    uploadedAt: { type: Date, default: Date.now },
    verified: { type: Boolean, default: false },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,
    notes: String
}, { _id: true });

// Interview Schema
const InterviewSchema = new Schema({
    interviewId: String,
    jobPostingId: { type: Schema.Types.ObjectId, ref: 'JobPosting' },
    stage: String,
    stageOrder: Number,
    interviewType: {
        type: String,
        enum: ['phone', 'video', 'in_person', 'panel', 'technical', 'hr', 'final'],
        required: true
    },
    scheduledDate: { type: Date, required: true },
    scheduledEndTime: Date,
    duration: Number, // Minutes
    timezone: { type: String, default: 'Asia/Riyadh' },
    location: String, // For in-person
    meetingLink: String, // For video
    phoneNumber: String, // For phone
    interviewers: [{
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        name: String,
        nameAr: String,
        role: String,
        email: String
    }],
    status: {
        type: String,
        enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled', 'no_show'],
        default: 'scheduled'
    },
    // Interview Results
    feedback: [{
        interviewerId: { type: Schema.Types.ObjectId, ref: 'User' },
        interviewerName: String,
        submittedAt: Date,
        overallRating: { type: Number, min: 1, max: 5 },
        recommendation: {
            type: String,
            enum: ['strong_hire', 'hire', 'maybe', 'no_hire', 'strong_no_hire']
        },
        strengths: [String],
        weaknesses: [String],
        cultureFit: { type: Number, min: 1, max: 5 },
        technicalSkills: { type: Number, min: 1, max: 5 },
        communication: { type: Number, min: 1, max: 5 },
        experience: { type: Number, min: 1, max: 5 },
        detailedNotes: String,
        questions: [{
            question: String,
            answer: String,
            rating: Number
        }]
    }],
    aggregatedScore: Number,
    finalRecommendation: String,
    notes: String,
    notesAr: String,
    cancelReason: String,
    rescheduledFrom: Date
}, { _id: true });

// Assessment Schema
const AssessmentSchema = new Schema({
    assessmentId: String,
    assessmentType: {
        type: String,
        enum: ['technical_test', 'aptitude_test', 'personality_test',
               'case_study', 'coding_challenge', 'writing_sample',
               'presentation', 'group_exercise', 'simulation'],
        required: true
    },
    assessmentName: String,
    assessmentNameAr: String,
    provider: String,
    sentAt: Date,
    deadline: Date,
    completedAt: Date,
    status: {
        type: String,
        enum: ['pending', 'sent', 'in_progress', 'completed', 'expired', 'cancelled'],
        default: 'pending'
    },
    score: Number,
    maxScore: Number,
    percentile: Number,
    passed: { type: Boolean },
    reportUrl: String,
    notes: String,
    detailedResults: Schema.Types.Mixed // Flexible for different assessment types
}, { _id: true });

// Offer Schema
const OfferSchema = new Schema({
    offerId: String,
    jobPostingId: { type: Schema.Types.ObjectId, ref: 'JobPosting' },
    status: {
        type: String,
        enum: ['draft', 'pending_approval', 'approved', 'sent', 'accepted',
               'declined', 'negotiating', 'expired', 'withdrawn'],
        default: 'draft'
    },
    // Compensation
    salary: {
        amount: Number,
        currency: { type: String, default: 'SAR' },
        frequency: { type: String, enum: ['monthly', 'annual'], default: 'monthly' }
    },
    housingAllowance: Number,
    transportationAllowance: Number,
    otherAllowances: [{
        name: String,
        amount: Number
    }],
    totalCompensation: Number,
    // Benefits
    benefits: [String],
    // Employment Terms
    startDate: Date,
    positionTitle: String,
    positionTitleAr: String,
    department: String,
    departmentAr: String,
    reportsTo: String,
    employmentType: String,
    probationPeriod: Number, // Days
    workLocation: String,
    workSchedule: String,
    // Conditions
    conditions: [String],
    contingencies: [String], // e.g., background check, reference check
    // Timeline
    offerValidUntil: Date,
    sentAt: Date,
    respondedAt: Date,
    // Response
    candidateResponse: String,
    declineReason: String,
    negotiationNotes: String,
    counterOffer: {
        salary: Number,
        requests: [String],
        receivedAt: Date
    },
    // Approvals
    approvals: [{
        approverId: { type: Schema.Types.ObjectId, ref: 'User' },
        approverName: String,
        status: { type: String, enum: ['pending', 'approved', 'rejected'] },
        approvedAt: Date,
        comments: String
    }],
    // Document
    offerLetterUrl: String,
    signedOfferUrl: String,
    // Created by
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
}, { _id: true });

// Activity/Timeline Schema
const ApplicantActivitySchema = new Schema({
    activityType: {
        type: String,
        enum: ['application_submitted', 'status_change', 'stage_change', 'note_added',
               'document_uploaded', 'email_sent', 'email_received', 'call_made',
               'interview_scheduled', 'interview_completed', 'assessment_sent',
               'assessment_completed', 'reference_checked', 'offer_sent',
               'offer_accepted', 'offer_declined', 'hired', 'rejected', 'withdrawn',
               'tag_added', 'tag_removed', 'rating_updated', 'assigned', 'other'],
        required: true
    },
    description: { type: String, required: true },
    descriptionAr: String,
    previousValue: String,
    newValue: String,
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    performedByName: String,
    timestamp: { type: Date, default: Date.now },
    metadata: Schema.Types.Mixed
}, { _id: true });

// Note Schema
const ApplicantNoteSchema = new Schema({
    noteType: {
        type: String,
        enum: ['general', 'interview', 'assessment', 'reference', 'offer', 'concern', 'private'],
        default: 'general'
    },
    content: { type: String, required: true },
    contentAr: String,
    isPrivate: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date
}, { _id: true });

// Communication Schema
const CommunicationSchema = new Schema({
    type: {
        type: String,
        enum: ['email', 'phone', 'sms', 'whatsapp', 'in_person', 'video_call'],
        required: true
    },
    direction: {
        type: String,
        enum: ['inbound', 'outbound'],
        required: true
    },
    subject: String,
    content: String,
    contentAr: String,
    templateUsed: String,
    sentAt: Date,
    receivedAt: Date,
    sentBy: { type: Schema.Types.ObjectId, ref: 'User' },
    sentByName: String,
    status: {
        type: String,
        enum: ['draft', 'sent', 'delivered', 'read', 'replied', 'bounced', 'failed'],
        default: 'sent'
    },
    attachments: [{
        fileName: String,
        fileUrl: String
    }],
    callDuration: Number, // For phone calls, in seconds
    callNotes: String
}, { _id: true });

// ═══════════════════════════════════════════════════════════════
// MAIN APPLICANT SCHEMA
// ═══════════════════════════════════════════════════════════════

const ApplicantSchema = new Schema({
    // Unique Applicant ID
    applicantId: {
        type: String,
        unique: true,
        required: true
    },

    // ─────────────────────────────────────────────────────────────
    // PERSONAL INFORMATION
    // ─────────────────────────────────────────────────────────────
    firstName: { type: String, required: true },
    firstNameAr: String,
    lastName: { type: String, required: true },
    lastNameAr: String,
    middleName: String,
    middleNameAr: String,
    fullName: String, // Auto-generated
    fullNameAr: String,

    email: { type: String, required: true, lowercase: true },
    emailSecondary: String,
    phone: { type: String, required: true },
    phoneSecondary: String,
    whatsapp: String,

    // Demographics
    dateOfBirth: Date,
    gender: {
        type: String,
        enum: ['male', 'female', 'other', 'prefer_not_to_say']
    },
    nationality: String,
    nationalityAr: String,
    nationalId: String, // Saudi ID or Iqama
    passportNumber: String,
    passportExpiry: Date,

    // Location
    currentLocation: {
        city: String,
        cityAr: String,
        country: String,
        countryAr: String,
        address: String,
        addressAr: String,
        postalCode: String
    },

    willingToRelocate: { type: Boolean, default: false },
    preferredLocations: [String],

    // Work Authorization (Saudi Labor Law compliance)
    workAuthorization: {
        status: {
            type: String,
            enum: ['citizen', 'resident', 'work_visa', 'visit_visa', 'requires_sponsorship', 'other']
        },
        visaType: String,
        visaExpiry: Date,
        iqamaNumber: String,
        iqamaExpiry: Date,
        sponsorTransferRequired: { type: Boolean, default: false },
        canWorkImmediately: { type: Boolean, default: true }
    },

    // Profile
    profilePhoto: String,
    linkedinUrl: String,
    portfolioUrl: String,
    websiteUrl: String,
    githubUrl: String,
    otherUrls: [{
        platform: String,
        url: String
    }],

    // ─────────────────────────────────────────────────────────────
    // PROFESSIONAL INFORMATION
    // ─────────────────────────────────────────────────────────────
    currentPosition: {
        title: String,
        titleAr: String,
        company: String,
        companyAr: String,
        startDate: Date,
        isCurrentlyEmployed: { type: Boolean, default: true }
    },

    totalYearsExperience: { type: Number, default: 0 },
    relevantYearsExperience: Number,

    education: [EducationSchema],
    highestEducation: {
        type: String,
        enum: ['high_school', 'diploma', 'bachelor', 'master', 'phd', 'professional']
    },

    workExperience: [WorkExperienceSchema],

    skills: [ApplicantSkillSchema],

    languages: [LanguageSchema],

    certifications: [CertificationSchema],

    // For legal positions
    legalCredentials: {
        barAdmissions: [{
            jurisdiction: String,
            admissionDate: Date,
            barNumber: String,
            status: { type: String, enum: ['active', 'inactive', 'suspended'] },
            verified: { type: Boolean, default: false }
        }],
        scaLicense: {
            hasLicense: { type: Boolean, default: false },
            licenseNumber: String,
            issueDate: Date,
            expiryDate: Date,
            category: String,
            verified: { type: Boolean, default: false }
        },
        practiceAreas: [String],
        casesHandled: Number,
        courtExperience: [String]
    },

    // ─────────────────────────────────────────────────────────────
    // JOB APPLICATIONS
    // ─────────────────────────────────────────────────────────────
    applications: [{
        jobPostingId: { type: Schema.Types.ObjectId, ref: 'JobPosting', required: true },
        jobTitle: String,
        jobTitleAr: String,
        appliedAt: { type: Date, default: Date.now },
        source: {
            type: String,
            enum: ['company_website', 'linkedin', 'indeed', 'bayt', 'glassdoor',
                   'referral', 'recruitment_agency', 'job_fair', 'direct', 'other'],
            default: 'company_website'
        },
        sourceName: String, // e.g., referrer name
        coverLetter: String,
        coverLetterAr: String,
        customAnswers: [{
            question: String,
            answer: String
        }],
        // Current status in pipeline
        currentStage: {
            type: String,
            enum: ['applied', 'screening', 'phone_interview', 'technical_interview',
                   'hr_interview', 'panel_interview', 'assessment', 'reference_check',
                   'background_check', 'offer', 'negotiation', 'hired', 'rejected', 'withdrawn'],
            default: 'applied'
        },
        stageHistory: [{
            stage: String,
            enteredAt: Date,
            exitedAt: Date,
            outcome: String,
            notes: String
        }],
        status: {
            type: String,
            enum: ['active', 'on_hold', 'hired', 'rejected', 'withdrawn'],
            default: 'active'
        },
        rejectionReason: String,
        rejectionReasonAr: String,
        withdrawalReason: String,
        // Fit Score
        fitScore: Number,
        aiScreeningScore: Number,
        // Assignment
        assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
        assignedToName: String,
        // Dates
        lastActivityAt: Date,
        closedAt: Date,
        hiredAt: Date
    }],

    // Current/Primary Application (for quick access)
    primaryApplication: { type: Schema.Types.ObjectId, ref: 'JobPosting' },

    // ─────────────────────────────────────────────────────────────
    // INTERVIEWS
    // ─────────────────────────────────────────────────────────────
    interviews: [InterviewSchema],

    // ─────────────────────────────────────────────────────────────
    // ASSESSMENTS
    // ─────────────────────────────────────────────────────────────
    assessments: [AssessmentSchema],

    // ─────────────────────────────────────────────────────────────
    // REFERENCES
    // ─────────────────────────────────────────────────────────────
    references: [ReferenceSchema],

    // ─────────────────────────────────────────────────────────────
    // OFFERS
    // ─────────────────────────────────────────────────────────────
    offers: [OfferSchema],

    // ─────────────────────────────────────────────────────────────
    // DOCUMENTS
    // ─────────────────────────────────────────────────────────────
    documents: [ApplicantDocumentSchema],
    resumeUrl: String,
    resumeText: String, // Parsed resume text for searching

    // ─────────────────────────────────────────────────────────────
    // COMMUNICATION
    // ─────────────────────────────────────────────────────────────
    communications: [CommunicationSchema],

    preferredCommunication: {
        type: String,
        enum: ['email', 'phone', 'whatsapp'],
        default: 'email'
    },

    // ─────────────────────────────────────────────────────────────
    // NOTES & ACTIVITIES
    // ─────────────────────────────────────────────────────────────
    notes: [ApplicantNoteSchema],

    activities: [ApplicantActivitySchema],

    // ─────────────────────────────────────────────────────────────
    // RATINGS & EVALUATIONS
    // ─────────────────────────────────────────────────────────────
    overallRating: {
        type: Number,
        min: 1,
        max: 5
    },

    ratings: {
        technicalSkills: { type: Number, min: 1, max: 5 },
        communication: { type: Number, min: 1, max: 5 },
        experience: { type: Number, min: 1, max: 5 },
        cultureFit: { type: Number, min: 1, max: 5 },
        leadership: { type: Number, min: 1, max: 5 },
        problemSolving: { type: Number, min: 1, max: 5 }
    },

    recommendation: {
        type: String,
        enum: ['strong_hire', 'hire', 'maybe', 'no_hire', 'strong_no_hire']
    },

    // ─────────────────────────────────────────────────────────────
    // SALARY EXPECTATIONS
    // ─────────────────────────────────────────────────────────────
    salaryExpectations: {
        minimum: Number,
        desired: Number,
        currency: { type: String, default: 'SAR' },
        frequency: { type: String, enum: ['monthly', 'annual'], default: 'monthly' },
        negotiable: { type: Boolean, default: true },
        currentSalary: Number,
        includesAllowances: { type: Boolean, default: false }
    },

    // ─────────────────────────────────────────────────────────────
    // AVAILABILITY
    // ─────────────────────────────────────────────────────────────
    availability: {
        noticePeriod: Number, // Days
        availableFrom: Date,
        preferredStartDate: Date,
        interviewAvailability: String, // e.g., "Weekdays 9am-5pm"
        timezone: { type: String, default: 'Asia/Riyadh' }
    },

    // ─────────────────────────────────────────────────────────────
    // BACKGROUND CHECK
    // ─────────────────────────────────────────────────────────────
    backgroundCheck: {
        status: {
            type: String,
            enum: ['not_started', 'in_progress', 'completed', 'issues_found', 'cleared'],
            default: 'not_started'
        },
        provider: String,
        initiatedAt: Date,
        completedAt: Date,
        results: {
            criminal: { type: String, enum: ['clear', 'issues', 'pending'] },
            employment: { type: String, enum: ['verified', 'discrepancy', 'pending'] },
            education: { type: String, enum: ['verified', 'discrepancy', 'pending'] },
            credit: { type: String, enum: ['good', 'issues', 'pending'] },
            identity: { type: String, enum: ['verified', 'issues', 'pending'] }
        },
        notes: String,
        reportUrl: String
    },

    // ─────────────────────────────────────────────────────────────
    // TAGS & CATEGORIZATION
    // ─────────────────────────────────────────────────────────────
    tags: [String],

    talentPool: {
        type: String,
        enum: ['hot', 'warm', 'cold', 'passive', 'active', 'blacklisted']
    },

    isBlacklisted: { type: Boolean, default: false },
    blacklistReason: String,
    blacklistedAt: Date,
    blacklistedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    // ─────────────────────────────────────────────────────────────
    // ONBOARDING (When hired)
    // ─────────────────────────────────────────────────────────────
    onboarding: {
        employeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
        hiredForJobId: { type: Schema.Types.ObjectId, ref: 'JobPosting' },
        startDate: Date,
        onboardingStatus: {
            type: String,
            enum: ['pending', 'in_progress', 'completed'],
            default: 'pending'
        },
        onboardingChecklist: [{
            item: String,
            itemAr: String,
            completed: { type: Boolean, default: false },
            completedAt: Date,
            completedBy: { type: Schema.Types.ObjectId, ref: 'User' }
        }]
    },

    // ─────────────────────────────────────────────────────────────
    // GDPR / DATA CONSENT
    // ─────────────────────────────────────────────────────────────
    consent: {
        dataProcessing: { type: Boolean, default: false },
        dataProcessingDate: Date,
        marketing: { type: Boolean, default: false },
        marketingDate: Date,
        talentPoolRetention: { type: Boolean, default: false },
        retentionPeriod: Number, // Months
        dataRetentionExpiry: Date
    },

    // ─────────────────────────────────────────────────────────────
    // MULTI-TENANCY
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
        required: true,
        index: true
    },

    // ─────────────────────────────────────────────────────────────
    // AUDIT FIELDS
    // ─────────────────────────────────────────────────────────────
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }

}, {
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

ApplicantSchema.index({ firmId: 1, email: 1 }, { unique: true });
ApplicantSchema.index({ firmId: 1, 'applications.jobPostingId': 1 });
ApplicantSchema.index({ firmId: 1, 'applications.currentStage': 1 });
ApplicantSchema.index({ firmId: 1, 'applications.status': 1 });
ApplicantSchema.index({ firmId: 1, createdAt: -1 });
ApplicantSchema.index({ firmId: 1, talentPool: 1 });
ApplicantSchema.index({ firmId: 1, tags: 1 });
ApplicantSchema.index({ fullName: 'text', email: 'text', resumeText: 'text' });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

ApplicantSchema.pre('save', async function(next) {
    // Generate applicant ID
    if (this.isNew && !this.applicantId) {
        const year = new Date().getFullYear();
        const count = await mongoose.model('Applicant').countDocuments({
            firmId: this.firmId,
            createdAt: {
                $gte: new Date(year, 0, 1),
                $lt: new Date(year + 1, 0, 1)
            }
        });
        this.applicantId = `APP-${year}-${String(count + 1).padStart(5, '0')}`;
    }

    // Generate full name
    const nameParts = [this.firstName, this.middleName, this.lastName].filter(Boolean);
    this.fullName = nameParts.join(' ');

    const namePartsAr = [this.firstNameAr, this.middleNameAr, this.lastNameAr].filter(Boolean);
    this.fullNameAr = namePartsAr.join(' ') || this.fullName;

    // Calculate highest education
    if (this.education && this.education.length > 0) {
        const eduOrder = { phd: 6, professional: 5, master: 4, bachelor: 3, diploma: 2, high_school: 1, other: 0 };
        let highest = 'other';
        this.education.forEach(edu => {
            if (eduOrder[edu.degree] > eduOrder[highest]) {
                highest = edu.degree;
            }
        });
        this.highestEducation = highest;
    }

    // Calculate total years of experience
    if (this.workExperience && this.workExperience.length > 0) {
        let totalMonths = 0;
        this.workExperience.forEach(exp => {
            const start = new Date(exp.startDate);
            const end = exp.isCurrent ? new Date() : new Date(exp.endDate);
            const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
            totalMonths += Math.max(0, months);
        });
        this.totalYearsExperience = Math.round(totalMonths / 12 * 10) / 10;
    }

    this.updatedAt = new Date();
    next();
});

// ═══════════════════════════════════════════════════════════════
// METHODS
// ═══════════════════════════════════════════════════════════════

// Add application
ApplicantSchema.methods.addApplication = async function(jobPostingId, jobTitle, source, coverLetter) {
    // Check if already applied
    const existing = this.applications.find(
        app => app.jobPostingId.toString() === jobPostingId.toString()
    );

    if (existing) {
        throw new Error('Already applied to this job');
    }

    this.applications.push({
        jobPostingId,
        jobTitle,
        source,
        coverLetter,
        currentStage: 'applied',
        status: 'active',
        stageHistory: [{
            stage: 'applied',
            enteredAt: new Date()
        }]
    });

    // Set as primary if first application
    if (this.applications.length === 1) {
        this.primaryApplication = jobPostingId;
    }

    await this.save();
    return this;
};

// Update application stage
ApplicantSchema.methods.updateApplicationStage = async function(jobPostingId, newStage, outcome, notes) {
    const app = this.applications.find(
        a => a.jobPostingId.toString() === jobPostingId.toString()
    );

    if (!app) {
        throw new Error('Application not found');
    }

    // Close current stage
    const currentStageHistory = app.stageHistory.find(
        sh => sh.stage === app.currentStage && !sh.exitedAt
    );
    if (currentStageHistory) {
        currentStageHistory.exitedAt = new Date();
        currentStageHistory.outcome = outcome;
        currentStageHistory.notes = notes;
    }

    // Add new stage
    app.stageHistory.push({
        stage: newStage,
        enteredAt: new Date()
    });

    app.currentStage = newStage;
    app.lastActivityAt = new Date();

    // Update status if final stages
    if (newStage === 'hired') {
        app.status = 'hired';
        app.hiredAt = new Date();
        app.closedAt = new Date();
    } else if (newStage === 'rejected') {
        app.status = 'rejected';
        app.closedAt = new Date();
    } else if (newStage === 'withdrawn') {
        app.status = 'withdrawn';
        app.closedAt = new Date();
    }

    await this.save();
    return this;
};

// Add activity
ApplicantSchema.methods.addActivity = async function(activityType, description, performedBy, performedByName, metadata) {
    this.activities.push({
        activityType,
        description,
        performedBy,
        performedByName,
        metadata
    });
    await this.save();
    return this;
};

// Add note
ApplicantSchema.methods.addNote = async function(noteType, content, createdBy, createdByName, isPrivate = false) {
    this.notes.push({
        noteType,
        content,
        createdBy,
        createdByName,
        isPrivate
    });
    await this.save();
    return this;
};

// Schedule interview
ApplicantSchema.methods.scheduleInterview = async function(interviewData) {
    const interviewId = `INT-${this.applicantId}-${this.interviews.length + 1}`;
    this.interviews.push({
        ...interviewData,
        interviewId,
        status: 'scheduled'
    });
    await this.save();
    return this;
};

// Create offer
ApplicantSchema.methods.createOffer = async function(offerData, createdBy) {
    const offerId = `OFR-${this.applicantId}-${this.offers.length + 1}`;
    this.offers.push({
        ...offerData,
        offerId,
        createdBy,
        status: 'draft'
    });
    await this.save();
    return this;
};

// Calculate overall rating from interviews
ApplicantSchema.methods.calculateOverallRating = function() {
    const completedInterviews = this.interviews.filter(i => i.status === 'completed' && i.feedback.length > 0);

    if (completedInterviews.length === 0) return null;

    let totalRating = 0;
    let ratingCount = 0;

    completedInterviews.forEach(interview => {
        interview.feedback.forEach(fb => {
            if (fb.overallRating) {
                totalRating += fb.overallRating;
                ratingCount++;
            }
        });
    });

    this.overallRating = ratingCount > 0 ? Math.round((totalRating / ratingCount) * 10) / 10 : null;
    return this.overallRating;
};

// Check if applicant can be contacted
ApplicantSchema.methods.canContact = function() {
    return this.consent.dataProcessing && !this.isBlacklisted;
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get applicants by job posting
ApplicantSchema.statics.getByJobPosting = function(firmId, jobPostingId, status) {
    const query = {
        firmId,
        'applications.jobPostingId': jobPostingId
    };

    if (status) {
        query['applications.status'] = status;
    }

    return this.find(query).sort({ 'applications.appliedAt': -1 });
};

// Get applicants by stage
ApplicantSchema.statics.getByStage = function(firmId, jobPostingId, stage) {
    return this.find({
        firmId,
        'applications': {
            $elemMatch: {
                jobPostingId,
                currentStage: stage,
                status: 'active'
            }
        }
    }).sort({ 'applications.lastActivityAt': -1 });
};

// Get pipeline counts
ApplicantSchema.statics.getPipelineCounts = async function(firmId, jobPostingId) {
    const pipeline = await this.aggregate([
        {
            $match: {
                firmId: new mongoose.Types.ObjectId(firmId),
                'applications.jobPostingId': new mongoose.Types.ObjectId(jobPostingId),
                'applications.status': 'active'
            }
        },
        { $unwind: '$applications' },
        {
            $match: {
                'applications.jobPostingId': new mongoose.Types.ObjectId(jobPostingId),
                'applications.status': 'active'
            }
        },
        {
            $group: {
                _id: '$applications.currentStage',
                count: { $sum: 1 }
            }
        }
    ]);

    const stages = ['applied', 'screening', 'phone_interview', 'technical_interview',
                   'hr_interview', 'panel_interview', 'assessment', 'reference_check',
                   'background_check', 'offer', 'negotiation', 'hired', 'rejected', 'withdrawn'];

    const result = {};
    stages.forEach(stage => {
        const found = pipeline.find(p => p._id === stage);
        result[stage] = found ? found.count : 0;
    });

    return result;
};

// Search applicants
ApplicantSchema.statics.searchApplicants = function(firmId, searchTerm, filters = {}) {
    const query = {
        firmId,
        $text: { $search: searchTerm }
    };

    if (filters.status) query['applications.status'] = filters.status;
    if (filters.stage) query['applications.currentStage'] = filters.stage;
    if (filters.tags && filters.tags.length > 0) query.tags = { $in: filters.tags };
    if (filters.talentPool) query.talentPool = filters.talentPool;

    return this.find(query, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } });
};

// Get talent pool
ApplicantSchema.statics.getTalentPool = function(firmId, poolType) {
    return this.find({
        firmId,
        talentPool: poolType,
        isBlacklisted: { $ne: true },
        'consent.talentPoolRetention': true
    }).sort({ overallRating: -1, totalYearsExperience: -1 });
};

// Get applicants needing follow-up (no activity in X days)
ApplicantSchema.statics.getNeedingFollowUp = function(firmId, daysInactive = 7) {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - daysInactive);

    return this.find({
        firmId,
        'applications.status': 'active',
        $or: [
            { 'applications.lastActivityAt': { $lt: threshold } },
            { 'applications.lastActivityAt': { $exists: false } }
        ]
    }).sort({ 'applications.lastActivityAt': 1 });
};

// Get recruitment statistics
ApplicantSchema.statics.getRecruitmentStats = async function(firmId, dateRange = {}) {
    const matchStage = { firmId: new mongoose.Types.ObjectId(firmId) };

    if (dateRange.startDate) {
        matchStage.createdAt = { $gte: new Date(dateRange.startDate) };
    }
    if (dateRange.endDate) {
        matchStage.createdAt = { ...matchStage.createdAt, $lte: new Date(dateRange.endDate) };
    }

    const stats = await this.aggregate([
        { $match: matchStage },
        { $unwind: '$applications' },
        {
            $group: {
                _id: null,
                totalApplicants: { $addToSet: '$_id' },
                totalApplications: { $sum: 1 },
                hiredCount: { $sum: { $cond: [{ $eq: ['$applications.status', 'hired'] }, 1, 0] } },
                rejectedCount: { $sum: { $cond: [{ $eq: ['$applications.status', 'rejected'] }, 1, 0] } },
                activeCount: { $sum: { $cond: [{ $eq: ['$applications.status', 'active'] }, 1, 0] } },
                withdrawnCount: { $sum: { $cond: [{ $eq: ['$applications.status', 'withdrawn'] }, 1, 0] } },
                avgFitScore: { $avg: '$applications.fitScore' }
            }
        },
        {
            $project: {
                totalApplicants: { $size: '$totalApplicants' },
                totalApplications: 1,
                hiredCount: 1,
                rejectedCount: 1,
                activeCount: 1,
                withdrawnCount: 1,
                avgFitScore: { $round: ['$avgFitScore', 1] }
            }
        }
    ]);

    return stats[0] || {
        totalApplicants: 0,
        totalApplications: 0,
        hiredCount: 0,
        rejectedCount: 0,
        activeCount: 0,
        withdrawnCount: 0,
        avgFitScore: 0
    };
};

module.exports = mongoose.model('Applicant', ApplicantSchema);
