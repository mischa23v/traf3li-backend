const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Job Posting Model
 * MODULE 7: التوظيف ونظام تتبع المتقدمين (Recruitment & ATS)
 * Saudi Labor Law Compliance: Articles 53, 98-102, 109
 */

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Job Requirement Schema
const JobRequirementSchema = new Schema({
    category: {
        type: String,
        enum: ['education', 'experience', 'certification', 'other'],
        required: true
    },
    requirement: { type: String, required: true },
    requirementAr: String,
    isRequired: { type: Boolean, default: true },
    yearsRequired: Number, // For experience requirements
    details: String,
    detailsAr: String
}, { _id: false });

// Skill Schema
const SkillSchema = new Schema({
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
    isRequired: { type: Boolean, default: true },
    yearsExperience: Number,
    weight: { type: Number, default: 1, min: 1, max: 10 }
}, { _id: false });

// Language Requirement Schema
const LanguageRequirementSchema = new Schema({
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
    isRequired: { type: Boolean, default: true }
}, { _id: false });

// Salary Range Schema (Saudi Labor Law Article 90)
const SalaryRangeSchema = new Schema({
    currency: { type: String, default: 'SAR' },
    minSalary: { type: Number, required: true },
    maxSalary: { type: Number, required: true },
    paymentFrequency: {
        type: String,
        enum: ['monthly', 'biweekly', 'weekly', 'annual'],
        default: 'monthly'
    },
    includesHousing: { type: Boolean, default: false },
    housingAllowance: Number,
    includesTransportation: { type: Boolean, default: false },
    transportationAllowance: Number,
    includesOtherAllowances: { type: Boolean, default: false },
    otherAllowances: [{
        name: String,
        nameAr: String,
        amount: Number
    }],
    negotiable: { type: Boolean, default: true },
    displaySalary: { type: Boolean, default: false } // Show salary in posting
}, { _id: false });

// Hiring Stage Schema
const HiringStageSchema = new Schema({
    stageOrder: { type: Number, required: true },
    stageName: { type: String, required: true },
    stageNameAr: String,
    stageType: {
        type: String,
        enum: ['screening', 'phone_interview', 'technical_interview', 'hr_interview',
               'panel_interview', 'assessment', 'background_check', 'reference_check',
               'offer', 'negotiation', 'onboarding'],
        required: true
    },
    description: String,
    descriptionAr: String,
    duration: Number, // Estimated duration in minutes
    isRequired: { type: Boolean, default: true },
    interviewers: [{
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        name: String,
        nameAr: String,
        role: String
    }],
    assessmentType: String, // For assessment stages
    passingScore: Number, // Minimum score to pass
    scorecard: [{
        criterion: String,
        criterionAr: String,
        maxScore: Number,
        weight: Number
    }]
}, { _id: false });

// Interview Panel Schema
const InterviewPanelSchema = new Schema({
    panelName: String,
    panelNameAr: String,
    members: [{
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        name: String,
        nameAr: String,
        role: String,
        department: String,
        isLead: { type: Boolean, default: false }
    }]
}, { _id: false });

// Posting Channel Schema
const PostingChannelSchema = new Schema({
    channel: {
        type: String,
        enum: ['company_website', 'linkedin', 'indeed', 'bayt', 'glassdoor',
               'monster', 'naukrigulf', 'gulftalent', 'internal', 'referral',
               'recruitment_agency', 'university', 'job_fair', 'social_media', 'other'],
        required: true
    },
    channelName: String,
    channelNameAr: String,
    postingUrl: String,
    postedAt: Date,
    expiresAt: Date,
    isActive: { type: Boolean, default: true },
    applicationsReceived: { type: Number, default: 0 },
    cost: Number,
    notes: String
}, { _id: false });

// Responsibility Schema
const ResponsibilitySchema = new Schema({
    responsibility: { type: String, required: true },
    responsibilityAr: String,
    priority: {
        type: String,
        enum: ['primary', 'secondary', 'occasional'],
        default: 'primary'
    },
    percentageOfTime: Number // Estimated % of time spent
}, { _id: false });

// Benefit Schema
const BenefitSchema = new Schema({
    benefitType: {
        type: String,
        enum: ['health_insurance', 'dental', 'vision', 'life_insurance',
               'annual_leave', 'sick_leave', 'maternity_leave', 'paternity_leave',
               'retirement', 'bonus', 'stock_options', 'training', 'education',
               'housing', 'transportation', 'phone', 'laptop', 'gym',
               'flexible_hours', 'remote_work', 'annual_ticket', 'end_of_service', 'other'],
        required: true
    },
    benefitName: String,
    benefitNameAr: String,
    description: String,
    descriptionAr: String,
    value: String // Description of benefit value
}, { _id: false });

// Assessment Config Schema
const AssessmentConfigSchema = new Schema({
    assessmentType: {
        type: String,
        enum: ['technical_test', 'aptitude_test', 'personality_test',
               'case_study', 'coding_challenge', 'writing_sample',
               'presentation', 'group_exercise', 'simulation'],
        required: true
    },
    assessmentName: String,
    assessmentNameAr: String,
    provider: String, // e.g., HackerRank, TestGorilla
    duration: Number, // Minutes
    passingScore: Number,
    maxScore: Number,
    instructions: String,
    instructionsAr: String,
    isRequired: { type: Boolean, default: true },
    weight: { type: Number, default: 1 }
}, { _id: false });

// Approval Step Schema
const ApprovalStepSchema = new Schema({
    stepOrder: Number,
    stepName: String,
    stepNameAr: String,
    approverId: { type: Schema.Types.ObjectId, ref: 'User' },
    approverName: String,
    approverNameAr: String,
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'skipped'],
        default: 'pending'
    },
    comments: String,
    commentsAr: String,
    approvedAt: Date
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// MAIN JOB POSTING SCHEMA
// ═══════════════════════════════════════════════════════════════

const JobPostingSchema = new Schema({
    // Unique Job ID
    jobId: {
        type: String,
        unique: true,
        required: true
    },

    // ─────────────────────────────────────────────────────────────
    // BASIC JOB INFO
    // ─────────────────────────────────────────────────────────────
    title: { type: String, required: true },
    titleAr: String,

    description: { type: String, required: true },
    descriptionAr: String,

    shortDescription: String, // For job boards
    shortDescriptionAr: String,

    // Department & Position
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', index: true },
    departmentName: String,
    departmentNameAr: String,

    positionLevel: {
        type: String,
        enum: ['intern', 'entry', 'junior', 'mid', 'senior', 'lead',
               'manager', 'director', 'vp', 'c_level', 'partner'],
        default: 'mid'
    },

    reportsTo: {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        name: String,
        nameAr: String,
        title: String
    },

    // Job Category
    category: {
        type: String,
        enum: ['legal', 'finance', 'hr', 'it', 'operations', 'marketing',
               'sales', 'admin', 'executive', 'consulting', 'research', 'other'],
        default: 'legal'
    },

    // For legal positions
    practiceArea: {
        type: String,
        enum: ['corporate', 'litigation', 'real_estate', 'ip', 'labor',
               'banking_finance', 'tax', 'criminal', 'family', 'immigration',
               'arbitration', 'compliance', 'general_practice', 'other']
    },

    // ─────────────────────────────────────────────────────────────
    // EMPLOYMENT DETAILS (Saudi Labor Law Compliance)
    // ─────────────────────────────────────────────────────────────
    employmentType: {
        type: String,
        enum: ['full_time', 'part_time', 'contract', 'temporary', 'internship', 'freelance'],
        required: true,
        default: 'full_time'
    },

    contractDuration: {
        type: String,
        enum: ['permanent', 'fixed_term', 'project_based'],
        default: 'permanent'
    },

    contractLength: Number, // In months for fixed-term

    // Saudi Labor Law Article 53 - Probation Period (max 90 days, extendable to 180)
    probationPeriod: {
        duration: { type: Number, default: 90, max: 180 }, // Days
        isExtendable: { type: Boolean, default: true },
        maxExtension: { type: Number, default: 90 }
    },

    // Saudi Labor Law Article 98 - Working Hours (48/week, 36 during Ramadan)
    workingHours: {
        hoursPerWeek: { type: Number, default: 48, max: 48 },
        ramadanHoursPerWeek: { type: Number, default: 36, max: 36 },
        hoursPerDay: { type: Number, default: 8, max: 8 },
        shiftType: {
            type: String,
            enum: ['day', 'night', 'rotating', 'flexible'],
            default: 'day'
        },
        scheduleNotes: String
    },

    // Work Location
    workLocation: {
        type: {
            type: String,
            enum: ['onsite', 'remote', 'hybrid'],
            default: 'onsite'
        },
        city: String,
        cityAr: String,
        country: { type: String, default: 'Saudi Arabia' },
        countryAr: { type: String, default: 'المملكة العربية السعودية' },
        address: String,
        addressAr: String,
        remotePercentage: Number, // For hybrid
        travelRequired: { type: Boolean, default: false },
        travelPercentage: Number
    },

    // Nationality Requirements (Saudization/Nitaqat)
    nationalityRequirements: {
        saudiOnly: { type: Boolean, default: false },
        gccAllowed: { type: Boolean, default: true },
        specificNationalities: [String],
        visaSponsorshipAvailable: { type: Boolean, default: true }
    },

    // ─────────────────────────────────────────────────────────────
    // REQUIREMENTS & QUALIFICATIONS
    // ─────────────────────────────────────────────────────────────
    requirements: [JobRequirementSchema],

    // Education
    educationRequirements: {
        minimumLevel: {
            type: String,
            enum: ['high_school', 'diploma', 'bachelor', 'master', 'phd', 'professional'],
            default: 'bachelor'
        },
        preferredLevel: String,
        fieldOfStudy: [String],
        preferredInstitutions: [String],
        isRequired: { type: Boolean, default: true }
    },

    // Experience
    experienceRequirements: {
        minimumYears: { type: Number, default: 0 },
        maximumYears: Number, // For junior roles
        preferredYears: Number,
        specificExperience: [String],
        industryExperience: [String]
    },

    // Skills
    skills: [SkillSchema],

    // Languages
    languageRequirements: [LanguageRequirementSchema],

    // Certifications/Licenses
    certifications: [{
        name: String,
        nameAr: String,
        isRequired: { type: Boolean, default: false },
        issuingBody: String
    }],

    // Legal Specific Requirements
    legalRequirements: {
        barAdmission: { type: Boolean, default: false },
        barJurisdictions: [String],
        scaLicense: { type: Boolean, default: false }, // Saudi Council of Attorneys
        minimumCasesHandled: Number,
        courtExperience: [String]
    },

    // ─────────────────────────────────────────────────────────────
    // RESPONSIBILITIES
    // ─────────────────────────────────────────────────────────────
    responsibilities: [ResponsibilitySchema],

    // ─────────────────────────────────────────────────────────────
    // COMPENSATION & BENEFITS
    // ─────────────────────────────────────────────────────────────
    salary: SalaryRangeSchema,

    benefits: [BenefitSchema],

    // Saudi Labor Law Article 109 - End of Service Benefits
    endOfServiceBenefits: {
        included: { type: Boolean, default: true },
        calculationMethod: {
            type: String,
            enum: ['standard', 'enhanced'],
            default: 'standard'
        },
        details: String
    },

    // ─────────────────────────────────────────────────────────────
    // HIRING PROCESS
    // ─────────────────────────────────────────────────────────────
    hiringStages: [HiringStageSchema],

    interviewPanels: [InterviewPanelSchema],

    assessments: [AssessmentConfigSchema],

    // Estimated Timeline
    targetHireDate: Date,
    applicationDeadline: Date,
    estimatedProcessDays: { type: Number, default: 30 },

    // ─────────────────────────────────────────────────────────────
    // RECRUITMENT TEAM
    // ─────────────────────────────────────────────────────────────
    recruitmentTeam: {
        hiringManager: {
            userId: { type: Schema.Types.ObjectId, ref: 'User' },
            name: String,
            nameAr: String,
            email: String
        },
        recruiter: {
            userId: { type: Schema.Types.ObjectId, ref: 'User' },
            name: String,
            nameAr: String,
            email: String
        },
        hrContact: {
            userId: { type: Schema.Types.ObjectId, ref: 'User' },
            name: String,
            nameAr: String,
            email: String
        },
        additionalReviewers: [{
            userId: { type: Schema.Types.ObjectId, ref: 'User' },
            name: String,
            nameAr: String,
            role: String
        }]
    },

    // External Recruiters
    externalRecruiters: [{
        agencyName: String,
        contactPerson: String,
        email: String,
        phone: String,
        feePercentage: Number,
        feeAmount: Number,
        contractSigned: { type: Boolean, default: false }
    }],

    // ─────────────────────────────────────────────────────────────
    // POSTING & VISIBILITY
    // ─────────────────────────────────────────────────────────────
    postingChannels: [PostingChannelSchema],

    visibility: {
        type: String,
        enum: ['internal', 'external', 'both', 'confidential'],
        default: 'both'
    },

    isConfidential: { type: Boolean, default: false },
    confidentialReason: String,

    // ─────────────────────────────────────────────────────────────
    // APPROVALS
    // ─────────────────────────────────────────────────────────────
    requiresApproval: { type: Boolean, default: true },

    approvalSteps: [ApprovalStepSchema],

    approvalStatus: {
        type: String,
        enum: ['draft', 'pending_approval', 'approved', 'rejected'],
        default: 'draft'
    },

    approvalHistory: [{
        action: String,
        actionBy: { type: Schema.Types.ObjectId, ref: 'User' },
        actionByName: String,
        timestamp: { type: Date, default: Date.now },
        comments: String
    }],

    // ─────────────────────────────────────────────────────────────
    // STATUS & TRACKING
    // ─────────────────────────────────────────────────────────────
    status: {
        type: String,
        enum: ['draft', 'pending_approval', 'open', 'on_hold', 'filled', 'cancelled', 'closed'],
        default: 'draft',
        index: true
    },

    statusHistory: [{
        status: String,
        changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        changedByName: String,
        timestamp: { type: Date, default: Date.now },
        reason: String
    }],

    publishedAt: Date,
    closedAt: Date,
    filledAt: Date,

    // Headcount
    openings: { type: Number, default: 1, min: 1 },
    filled: { type: Number, default: 0 },
    remaining: { type: Number, default: 1 },

    // Priority
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },

    // ─────────────────────────────────────────────────────────────
    // STATISTICS
    // ─────────────────────────────────────────────────────────────
    statistics: {
        totalApplications: { type: Number, default: 0 },
        newApplications: { type: Number, default: 0 },
        screenedApplications: { type: Number, default: 0 },
        interviewedCandidates: { type: Number, default: 0 },
        offersExtended: { type: Number, default: 0 },
        offersAccepted: { type: Number, default: 0 },
        offersDeclined: { type: Number, default: 0 },
        hires: { type: Number, default: 0 },
        rejectedApplications: { type: Number, default: 0 },
        withdrawnApplications: { type: Number, default: 0 },
        averageTimeToHire: Number, // Days
        costPerHire: Number
    },

    // ─────────────────────────────────────────────────────────────
    // NOTES & INTERNAL INFO
    // ─────────────────────────────────────────────────────────────
    internalNotes: String,

    tags: [String],

    // Budget
    recruitmentBudget: {
        allocated: Number,
        spent: { type: Number, default: 0 },
        currency: { type: String, default: 'SAR' }
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

JobPostingSchema.index({ firmId: 1, status: 1 });
JobPostingSchema.index({ firmId: 1, departmentId: 1 });
JobPostingSchema.index({ firmId: 1, category: 1 });
JobPostingSchema.index({ firmId: 1, createdAt: -1 });
JobPostingSchema.index({ firmId: 1, applicationDeadline: 1 });
JobPostingSchema.index({ status: 1, visibility: 1 });
JobPostingSchema.index({ title: 'text', description: 'text' });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════

// Days since posted
JobPostingSchema.virtual('daysSincePosted').get(function() {
    if (!this.publishedAt) return null;
    const now = new Date();
    const posted = new Date(this.publishedAt);
    return Math.floor((now - posted) / (1000 * 60 * 60 * 24));
});

// Days until deadline
JobPostingSchema.virtual('daysUntilDeadline').get(function() {
    if (!this.applicationDeadline) return null;
    const now = new Date();
    const deadline = new Date(this.applicationDeadline);
    return Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
});

// Is deadline passed
JobPostingSchema.virtual('isDeadlinePassed').get(function() {
    if (!this.applicationDeadline) return false;
    return new Date() > new Date(this.applicationDeadline);
});

// Application rate (applications per day)
JobPostingSchema.virtual('applicationRate').get(function() {
    if (!this.publishedAt || !this.statistics?.totalApplications) return 0;
    const days = this.daysSincePosted || 1;
    return parseFloat((this.statistics.totalApplications / days).toFixed(2));
});

// Conversion rate (hires / applications)
JobPostingSchema.virtual('conversionRate').get(function() {
    if (!this.statistics?.totalApplications || this.statistics.totalApplications === 0) return 0;
    return parseFloat(((this.statistics.hires / this.statistics.totalApplications) * 100).toFixed(2));
});

// Enable virtuals
JobPostingSchema.set('toJSON', { virtuals: true });
JobPostingSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

JobPostingSchema.pre('save', async function(next) {
    // Generate job ID
    if (this.isNew && !this.jobId) {
        const year = new Date().getFullYear();
        const count = await mongoose.model('JobPosting').countDocuments({
            firmId: this.firmId,
            createdAt: {
                $gte: new Date(year, 0, 1),
                $lt: new Date(year + 1, 0, 1)
            }
        });
        this.jobId = `JOB-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    // Update remaining openings
    this.remaining = Math.max(0, this.openings - this.filled);

    // Auto-close if all positions filled
    if (this.remaining === 0 && this.status === 'open') {
        this.status = 'filled';
        this.filledAt = new Date();
    }

    // Set published date when status changes to open
    if (this.isModified('status') && this.status === 'open' && !this.publishedAt) {
        this.publishedAt = new Date();
    }

    // Set closed date when status changes to closed/cancelled
    if (this.isModified('status') && ['closed', 'cancelled', 'filled'].includes(this.status) && !this.closedAt) {
        this.closedAt = new Date();
    }

    this.updatedAt = new Date();
    next();
});

// ═══════════════════════════════════════════════════════════════
// METHODS
// ═══════════════════════════════════════════════════════════════

// Update application statistics
JobPostingSchema.methods.updateStatistics = async function(statType, increment = 1) {
    const validStats = ['totalApplications', 'newApplications', 'screenedApplications',
                       'interviewedCandidates', 'offersExtended', 'offersAccepted',
                       'offersDeclined', 'hires', 'rejectedApplications', 'withdrawnApplications'];

    if (validStats.includes(statType)) {
        this.statistics[statType] = (this.statistics[statType] || 0) + increment;

        // Update filled count if a hire is made
        if (statType === 'hires' && increment > 0) {
            this.filled = (this.filled || 0) + increment;
        }

        await this.save();
    }
    return this;
};

// Add status history
JobPostingSchema.methods.changeStatus = async function(newStatus, userId, userName, reason) {
    this.statusHistory.push({
        status: newStatus,
        changedBy: userId,
        changedByName: userName,
        reason: reason
    });
    this.status = newStatus;
    await this.save();
    return this;
};

// Check if job is accepting applications
JobPostingSchema.methods.isAcceptingApplications = function() {
    if (this.status !== 'open') return false;
    if (this.remaining <= 0) return false;
    if (this.applicationDeadline && new Date() > new Date(this.applicationDeadline)) return false;
    return true;
};

// Get required skills
JobPostingSchema.methods.getRequiredSkills = function() {
    return this.skills.filter(s => s.isRequired);
};

// Calculate fit score for an applicant
JobPostingSchema.methods.calculateFitScore = function(applicantData) {
    let score = 0;
    let maxScore = 0;

    // Skills match
    this.skills.forEach(skill => {
        const weight = skill.weight || 1;
        maxScore += weight * 10;

        const applicantSkill = applicantData.skills?.find(
            s => s.skillName.toLowerCase() === skill.skillName.toLowerCase()
        );

        if (applicantSkill) {
            const levels = { basic: 2.5, intermediate: 5, advanced: 7.5, expert: 10 };
            const applicantLevel = levels[applicantSkill.proficiencyLevel] || 0;
            const requiredLevel = levels[skill.proficiencyLevel] || 5;
            score += weight * Math.min(10, (applicantLevel / requiredLevel) * 10);
        }
    });

    // Experience match
    if (this.experienceRequirements?.minimumYears) {
        maxScore += 20;
        const applicantYears = applicantData.yearsOfExperience || 0;
        if (applicantYears >= this.experienceRequirements.minimumYears) {
            score += 20;
        } else if (applicantYears > 0) {
            score += (applicantYears / this.experienceRequirements.minimumYears) * 20;
        }
    }

    // Education match
    if (this.educationRequirements?.minimumLevel) {
        maxScore += 20;
        const eduLevels = { high_school: 1, diploma: 2, bachelor: 3, master: 4, phd: 5, professional: 5 };
        const required = eduLevels[this.educationRequirements.minimumLevel] || 3;
        const applicant = eduLevels[applicantData.educationLevel] || 0;
        if (applicant >= required) {
            score += 20;
        } else if (applicant > 0) {
            score += (applicant / required) * 20;
        }
    }

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get open jobs
JobPostingSchema.statics.getOpenJobs = function(firmId, filters = {}) {
    const query = {
        firmId,
        status: 'open'
    };

    if (filters.departmentId) query.departmentId = filters.departmentId;
    if (filters.category) query.category = filters.category;
    if (filters.employmentType) query.employmentType = filters.employmentType;
    if (filters.positionLevel) query.positionLevel = filters.positionLevel;

    return this.find(query)
        .sort({ priority: -1, publishedAt: -1 });
};

// Get jobs by status
JobPostingSchema.statics.getByStatus = function(firmId, status) {
    return this.find({ firmId, status })
        .sort({ updatedAt: -1 });
};

// Get recruitment statistics
JobPostingSchema.statics.getRecruitmentStats = async function(firmId, dateRange = {}) {
    const matchStage = { firmId: new mongoose.Types.ObjectId(firmId) };

    if (dateRange.startDate) {
        matchStage.createdAt = { $gte: new Date(dateRange.startDate) };
    }
    if (dateRange.endDate) {
        matchStage.createdAt = { ...matchStage.createdAt, $lte: new Date(dateRange.endDate) };
    }

    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalJobs: { $sum: 1 },
                openJobs: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
                filledJobs: { $sum: { $cond: [{ $eq: ['$status', 'filled'] }, 1, 0] } },
                totalApplications: { $sum: '$statistics.totalApplications' },
                totalHires: { $sum: '$statistics.hires' },
                totalOpenings: { $sum: '$openings' },
                totalFilled: { $sum: '$filled' },
                avgTimeToHire: { $avg: '$statistics.averageTimeToHire' },
                totalRecruitmentCost: { $sum: '$statistics.costPerHire' }
            }
        }
    ]);

    return stats[0] || {
        totalJobs: 0,
        openJobs: 0,
        filledJobs: 0,
        totalApplications: 0,
        totalHires: 0,
        totalOpenings: 0,
        totalFilled: 0,
        avgTimeToHire: 0,
        totalRecruitmentCost: 0
    };
};

// Get jobs nearing deadline
JobPostingSchema.statics.getJobsNearingDeadline = function(firmId, daysThreshold = 7) {
    const now = new Date();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + daysThreshold);

    return this.find({
        firmId,
        status: 'open',
        applicationDeadline: {
            $gte: now,
            $lte: threshold
        }
    }).sort({ applicationDeadline: 1 });
};

// Search jobs
JobPostingSchema.statics.searchJobs = function(firmId, searchTerm, filters = {}) {
    const query = {
        firmId,
        $text: { $search: searchTerm }
    };

    if (filters.status) query.status = filters.status;
    if (filters.departmentId) query.departmentId = filters.departmentId;
    if (filters.category) query.category = filters.category;

    return this.find(query, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } });
};

module.exports = mongoose.model('JobPosting', JobPostingSchema);
