const mongoose = require('mongoose');
const logger = require('../utils/logger');
const {
    arabicNameSchema,
    nationalAddressSchema,
    sponsorSchema,
    poBoxSchema,
    IDENTITY_TYPES,
    GCC_COUNTRIES,
    GENDERS,
    MARITAL_STATUSES,
    LEGAL_FORMS,
    RISK_LEVELS,
    CONFLICT_CHECK_STATUSES,
    VERIFICATION_SOURCES
} = require('./schemas/najiz.schema');

// Lead source tracking
const leadSourceSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['website', 'referral', 'social_media', 'advertising', 'cold_call', 'walk_in', 'event', 'other'],
        required: false
    },
    referralId: { type: mongoose.Schema.Types.ObjectId, ref: 'Referral' },
    referralName: String,
    campaign: String,
    medium: String, // google, facebook, linkedin, etc.
    notes: String
}, { _id: false });

// Intake information schema
const intakeInfoSchema = new mongoose.Schema({
    practiceArea: { type: String, trim: true },
    caseType: {
        type: String,
        enum: [
            'civil', 'criminal', 'family', 'commercial', 'labor',
            'real_estate', 'administrative', 'execution', 'other'
        ]
    },
    caseDescription: String,
    urgency: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent', 'critical'],
        default: 'normal'
    },
    estimatedValue: Number,
    opposingParty: String,
    courtName: String,
    courtDeadline: Date,
    statuteOfLimitations: Date,
    currentStatus: String, // Brief description of current legal situation
    desiredOutcome: String,
    deadline: Date,
    hasDocuments: Boolean,
    conflictCheckCompleted: { type: Boolean, default: false },
    conflictCheckResult: {
        type: String,
        enum: ['clear', 'potential_conflict', 'conflict'],
    },
    conflictCheckNotes: String,
    intakeFormId: { type: mongoose.Schema.Types.ObjectId, ref: 'IntakeForm' },
    intakeCompletedAt: Date
}, { _id: false });

// Qualification schema with BANT scoring breakdown
const qualificationSchema = new mongoose.Schema({
    // BANT Fields
    budget: {
        type: String,
        enum: ['unknown', 'low', 'medium', 'high', 'premium']
    },
    budgetAmount: { type: Number },  // Specific amount in halalas
    budgetNotes: { type: String, maxlength: 500 },

    authority: {
        type: String,
        enum: ['unknown', 'decision_maker', 'influencer', 'researcher']
    },
    authorityNotes: { type: String, maxlength: 500 },

    need: {
        type: String,
        enum: ['unknown', 'urgent', 'planning', 'exploring']
    },
    needDescription: { type: String, maxlength: 1000 },

    timeline: {
        type: String,
        enum: ['unknown', 'immediate', 'this_month', 'this_quarter', 'this_year', 'no_timeline']
    },
    timelineNotes: { type: String, maxlength: 500 },

    // Score Breakdown (0-150 points total)
    scoreBreakdown: {
        budgetScore: { type: Number, default: 0, min: 0, max: 30 },      // 0-30 points
        authorityScore: { type: Number, default: 0, min: 0, max: 30 },  // 0-30 points
        needScore: { type: Number, default: 0, min: 0, max: 30 },       // 0-30 points
        timelineScore: { type: Number, default: 0, min: 0, max: 30 },   // 0-30 points
        engagementScore: { type: Number, default: 0, min: 0, max: 15 }, // 0-15 points
        fitScore: { type: Number, default: 0, min: 0, max: 15 }         // 0-15 points
    },

    // Overall lead score (computed from scoreBreakdown)
    score: { type: Number, default: 0, min: 0, max: 150 },

    notes: String,
    qualifiedAt: Date,
    qualifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

const leadSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
    },

    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    leadId: {
        type: String,
        unique: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // CONTACT INFORMATION
    // ═══════════════════════════════════════════════════════════════
    type: {
        type: String,
        enum: ['individual', 'company'],
        default: 'individual'
    },
    // Individual fields
    salutation: {
        type: String,
        enum: ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Eng', 'Sheikh', 'Prince', 'Princess']
    },
    firstName: {
        type: String,
        trim: true
    },
    lastName: {
        type: String,
        trim: true
    },
    displayName: { type: String, trim: true },
    preferredName: { type: String, trim: true },
    // Company fields
    companyName: {
        type: String,
        trim: true
    },
    companyNameAr: {
        type: String,
        trim: true
    },
    companyType: {
        type: String,
        enum: ['sme', 'enterprise', 'government', 'startup', 'ngo', 'law_firm', 'other']
    },
    contactPerson: {
        type: String,
        trim: true
    },
    jobTitle: { type: String, trim: true },
    department: { type: String, trim: true },
    industry: {
        type: String,
        trim: true
    },
    industryCode: {
        type: String,
        trim: true
    },
    numberOfEmployees: {
        type: String,
        enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
    },
    employeeCount: { type: Number },
    annualRevenue: {
        type: Number
    },
    companyLinkedinUrl: { type: String, trim: true },
    // Common fields
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    alternateEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: false,
        trim: true
    },
    alternatePhone: {
        type: String,
        trim: true
    },
    whatsapp: {
        type: String,
        trim: true
    },
    mobile: {
        type: String,
        trim: true
    },
    fax: {
        type: String,
        trim: true
    },
    website: {
        type: String,
        trim: true
    },
    linkedinUrl: { type: String, trim: true },
    twitterHandle: { type: String, trim: true },
    preferredContactMethod: {
        type: String,
        enum: ['phone', 'email', 'whatsapp', 'in_person', 'sms']
    },
    bestTimeToCall: {
        type: String,
        enum: ['morning', 'afternoon', 'evening', 'anytime']
    },
    address: {
        street: String,
        city: String,
        state: String,
        stateCode: String,
        postalCode: String,
        country: { type: String, default: 'Saudi Arabia' }
    },
    nationalId: String,
    commercialRegistration: String,

    // ═══════════════════════════════════════════════════════════════
    // COMPANY INTELLIGENCE (iDempiere, Dolibarr patterns)
    // ═══════════════════════════════════════════════════════════════
    companyIntelligence: {
        dunsNumber: { type: String, trim: true },           // D&B business identifier
        naicsCode: { type: String, trim: true },            // North American Industry Classification
        sicCode: { type: String, trim: true },              // Standard Industrial Classification
        yearEstablished: { type: String, trim: true },
        stockSymbol: { type: String, trim: true },          // Stock ticker (iDempiere)
        parentCompany: { type: String, trim: true },
        subsidiaries: [{ type: String, trim: true }]
    },

    // ═══════════════════════════════════════════════════════════════
    // BUSINESS INTELLIGENCE (iDempiere patterns)
    // ═══════════════════════════════════════════════════════════════
    businessIntelligence: {
        potentialLTV: { type: Number, default: 0 },         // Potential lifetime value
        actualLTV: { type: Number, default: 0 },            // Actual lifetime value
        acquisitionCost: { type: Number, default: 0 },      // Cost to acquire
        shareOfWallet: { type: Number, min: 0, max: 100 },  // % of customer's spend
        creditLimit: { type: Number, default: 0 },
        creditUsed: { type: Number, default: 0 },
        creditRating: {
            type: String,
            enum: ['aaa', 'aa', 'a', 'bbb', 'bb', 'b', 'c', 'unknown']
        },
        paymentRating: {
            type: String,
            enum: ['excellent', 'good', 'average', 'poor', 'bad', 'unknown']
        },
        priceLevel: {
            type: String,
            enum: ['discount', 'standard', 'premium', 'vip'],
            default: 'standard'
        },
        firstSaleDate: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // RECURRING REVENUE (Odoo patterns)
    // ═══════════════════════════════════════════════════════════════
    recurring: {
        revenue: { type: Number, default: 0 },              // Monthly recurring revenue
        plan: { type: String, trim: true }                  // Subscription plan type
    },

    // ═══════════════════════════════════════════════════════════════
    // NAJIZ IDENTITY FIELDS
    // ═══════════════════════════════════════════════════════════════
    fullNameArabic: { type: String, maxlength: 200 },
    fullNameEnglish: { type: String, maxlength: 200 },
    arabicName: arabicNameSchema,
    salutationAr: { type: String, maxlength: 50 },
    identityType: { type: String, enum: IDENTITY_TYPES, default: 'national_id' },
    iqamaNumber: { type: String, match: /^2\d{9}$/, sparse: true, index: true },
    gccId: { type: String, maxlength: 20 },
    gccCountry: { type: String, enum: GCC_COUNTRIES },
    borderNumber: { type: String, maxlength: 20 },
    visitorId: { type: String, maxlength: 20 },
    passportNumber: { type: String, maxlength: 20 },
    passportCountry: { type: String, maxlength: 100 },
    passportIssueDate: Date,
    passportExpiryDate: Date,
    identityIssueDate: Date,
    identityExpiryDate: Date,

    // Personal details
    dateOfBirth: Date,
    dateOfBirthHijri: { type: String, match: /^1[34]\d{2}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|30)$/ },
    placeOfBirth: { type: String, maxlength: 100 },
    gender: { type: String, enum: GENDERS },
    maritalStatus: { type: String, enum: MARITAL_STATUSES },
    nationality: { type: String, maxlength: 100 },
    nationalityCode: { type: String, maxlength: 3 },

    // Sponsor (for Iqama holders)
    sponsor: sponsorSchema,

    // ═══════════════════════════════════════════════════════════════
    // NAJIZ COMPANY FIELDS
    // ═══════════════════════════════════════════════════════════════
    crNumber: { type: String, match: /^\d{10}$/, sparse: true, index: true },
    unifiedNumber: { type: String, maxlength: 20 },
    vatNumber: { type: String, match: /^3\d{14}$/ },
    legalForm: { type: String, enum: LEGAL_FORMS },
    legalFormAr: { type: String, maxlength: 100 },
    capital: { type: Number, min: 0 },
    capitalCurrency: { type: String, default: 'SAR' },
    crExpiryDate: Date,
    authorizedPerson: { type: String, maxlength: 200 },
    authorizedPersonAr: { type: String, maxlength: 200 },
    authorizedPersonIdentityType: { type: String, enum: IDENTITY_TYPES },
    authorizedPersonIdentityNumber: { type: String, maxlength: 20 },

    // ═══════════════════════════════════════════════════════════════
    // NAJIZ ADDRESSES
    // ═══════════════════════════════════════════════════════════════
    nationalAddress: nationalAddressSchema,
    workAddress: nationalAddressSchema,
    headquartersAddress: nationalAddressSchema,
    branchAddresses: [nationalAddressSchema],
    poBox: poBoxSchema,

    // ═══════════════════════════════════════════════════════════════
    // NAJIZ COMMUNICATION & RISK
    // ═══════════════════════════════════════════════════════════════
    preferredLanguage: { type: String, enum: ['ar', 'en'], default: 'ar' },
    doNotContact: { type: Boolean, default: false },
    doNotEmail: { type: Boolean, default: false },
    doNotCall: { type: Boolean, default: false },
    doNotSMS: { type: Boolean, default: false },
    riskLevel: { type: String, enum: RISK_LEVELS },
    isBlacklisted: { type: Boolean, default: false },
    blacklistReason: String,
    conflictCheckStatus: {
        type: String,
        enum: CONFLICT_CHECK_STATUSES,
        default: 'not_checked'
    },
    conflictNotes: String,
    conflictCheckDate: Date,

    // ═══════════════════════════════════════════════════════════════
    // NAJIZ VERIFICATION
    // ═══════════════════════════════════════════════════════════════
    isVerified: { type: Boolean, default: false },
    verificationSource: { type: String, enum: VERIFICATION_SOURCES },
    verifiedAt: Date,
    verificationData: mongoose.Schema.Types.Mixed,

    // ═══════════════════════════════════════════════════════════════
    // ORGANIZATION & CONTACT RELATIONSHIPS
    // ═══════════════════════════════════════════════════════════════
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        index: true
    },
    contactId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // PIPELINE & STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: [
            'new',           // جديد
            'contacted',     // تم التواصل
            'qualified',     // مؤهل
            'proposal',      // عرض السعر
            'negotiation',   // التفاوض
            'won',           // فاز
            'lost',          // خسر
            'dormant'        // خامل
        ],
        default: 'new',
        index: true
    },
    pipelineId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pipeline'
    },
    pipelineStageId: {
        type: mongoose.Schema.Types.ObjectId
    },
    probability: {
        type: Number,
        default: 10,
        min: 0,
        max: 100
    },
    expectedCloseDate: Date,
    actualCloseDate: Date,
    lostReason: {
        type: String,
        enum: ['price', 'competitor', 'no_response', 'not_qualified', 'timing', 'other']
    },
    lostReasonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LostReason'
    },
    lostReasonDetails: String,
    lostDate: Date,
    lostToCompetitor: String,
    lostNotes: String,
    lostAtStage: { type: String },
    stageChangedAt: Date,

    // ═══════════════════════════════════════════════════════════════
    // STAGE TRACKING (Odoo patterns)
    // ═══════════════════════════════════════════════════════════════
    stageTracking: {
        dateOpened: Date,
        dateLastStageUpdate: Date,
        stageHistory: [{
            stage: { type: String },
            date: { type: Date, default: Date.now },
            changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            notes: { type: String }
        }]
    },

    // ═══════════════════════════════════════════════════════════════
    // CONVERSION TRACKING (Salesforce patterns)
    // ═══════════════════════════════════════════════════════════════
    conversion: {
        isConverted: { type: Boolean, default: false },
        convertedClientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
        convertedContactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
        convertedOpportunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity' },
        convertedDate: Date,
        convertedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },

    // ═══════════════════════════════════════════════════════════════
    // FORECAST MANAGEMENT
    // ═══════════════════════════════════════════════════════════════
    forecastCategory: {
        type: String,
        enum: ['pipeline', 'best_case', 'commit', 'closed_won', 'omitted'],
        default: 'pipeline'
    },
    forecastCategoryAuto: { type: Boolean, default: true },
    forecastOverrideReason: String,
    forecastOverrideBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    forecastOverrideAt: Date,

    // ═══════════════════════════════════════════════════════════════
    // SOURCE & ACQUISITION
    // ═══════════════════════════════════════════════════════════════
    source: leadSourceSchema,
    utm: {
        source: { type: String, trim: true },
        medium: { type: String, trim: true },
        campaign: { type: String, trim: true },
        term: { type: String, trim: true },
        content: { type: String, trim: true }
    },

    // ═══════════════════════════════════════════════════════════════
    // MARKETING (ERPNext, Salesforce patterns)
    // ═══════════════════════════════════════════════════════════════
    marketing: {
        leadMagnet: { type: String, trim: true },
        landingPageUrl: { type: String, trim: true },
        marketingScore: { type: Number, default: 0 },
        engagementScore: { type: Number, default: 0 },
        lastMarketingTouch: Date,
        campaignResponses: [{
            campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
            respondedAt: Date,
            response: String
        }]
    },

    // ═══════════════════════════════════════════════════════════════
    // CONFLICT CHECK (Law Firm patterns)
    // ═══════════════════════════════════════════════════════════════
    conflictCheck: {
        status: {
            type: String,
            enum: ['not_checked', 'pending', 'clear', 'potential', 'confirmed', 'waived'],
            default: 'not_checked'
        },
        checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        checkedDate: Date,
        notes: String,
        waiverRequested: { type: Boolean, default: false },
        waiverRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        waiverRequestedAt: Date,
        waiverApproved: { type: Boolean },
        waiverApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        waiverApprovedAt: Date,
        waiverNotes: String,
        conflicts: [{
            entityType: { type: String, enum: ['client', 'lead', 'case', 'contact'] },
            entityId: { type: mongoose.Schema.Types.ObjectId },
            entityName: String,
            matchType: { type: String, enum: ['nationalId', 'crNumber', 'phone', 'email', 'companyName', 'name'] },
            severity: { type: String, enum: ['block', 'warn', 'info'] }
        }]
    },

    // ═══════════════════════════════════════════════════════════════
    // INTAKE & CASE INFORMATION
    // ═══════════════════════════════════════════════════════════════
    intake: intakeInfoSchema,

    // ═══════════════════════════════════════════════════════════════
    // QUALIFICATION (BANT)
    // ═══════════════════════════════════════════════════════════════
    qualification: qualificationSchema,

    // ═══════════════════════════════════════════════════════════════
    // VALUE
    // ═══════════════════════════════════════════════════════════════
    estimatedValue: {
        type: Number,
        default: 0
    },
    weightedRevenue: {
        type: Number,
        default: 0
    },
    recurringRevenue: {
        amount: { type: Number },
        interval: {
            type: String,
            enum: ['monthly', 'quarterly', 'yearly']
        }
    },
    currency: {
        type: String,
        default: 'SAR'
    },
    proposedFeeType: {
        type: String,
        enum: ['hourly', 'fixed', 'contingency', 'retainer', 'hybrid']
    },
    proposedAmount: Number,

    // ═══════════════════════════════════════════════════════════════
    // ASSIGNMENT
    // ═══════════════════════════════════════════════════════════════
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    backupAssignee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    teamMembers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    assignedTeam: { type: String, trim: true },
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign'
    },
    territoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Territory'
    },
    territory: { type: String, trim: true },
    region: { type: String, trim: true },
    salesTeamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SalesTeam'
    },
    escalationPath: { type: String, trim: true },

    // ═══════════════════════════════════════════════════════════════
    // STAKEHOLDER MAPPING
    // ═══════════════════════════════════════════════════════════════
    stakeholders: [{
        contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
        role: {
            type: String,
            enum: ['champion', 'decision_maker', 'influencer', 'user', 'blocker', 'economic_buyer', 'technical_buyer', 'coach']
        },
        influence: { type: Number, min: 1, max: 10 },
        sentiment: {
            type: String,
            enum: ['strongly_positive', 'positive', 'neutral', 'negative', 'strongly_negative', 'unknown'],
            default: 'unknown'
        },
        engagementScore: Number,
        lastEngagement: Date,
        notes: String,
        addedAt: { type: Date, default: Date.now },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],

    // ═══════════════════════════════════════════════════════════════
    // DEAL HEALTH & INTELLIGENCE
    // ═══════════════════════════════════════════════════════════════
    dealHealth: {
        score: { type: Number, min: 0, max: 100 },
        grade: { type: String, enum: ['A', 'B', 'C', 'D', 'F'] },
        lastCalculatedAt: Date,
        factors: {
            activityRecency: Number,
            engagementVelocity: Number,
            stageProgression: Number,
            stakeholderCoverage: Number,
            nextStepClarity: Number,
            competitorRisk: Number
        },
        recommendations: [{
            priority: { type: String, enum: ['high', 'medium', 'low'] },
            message: String
        }],
        isStuck: { type: Boolean, default: false },
        stuckSince: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // ACTIVITY TRACKING
    // ═══════════════════════════════════════════════════════════════
    lastContactedAt: Date,
    lastActivityAt: Date,
    nextFollowUpDate: Date,
    nextFollowUpNote: String,
    activityCount: { type: Number, default: 0 },
    callCount: { type: Number, default: 0 },
    emailCount: { type: Number, default: 0 },
    meetingCount: { type: Number, default: 0 },

    // ═══════════════════════════════════════════════════════════════
    // METRICS
    // ═══════════════════════════════════════════════════════════════
    metrics: {
        daysToAssign: { type: Number },
        daysToClose: { type: Number },
        firstResponseTime: { type: Number }, // in minutes
        totalActivities: { type: Number, default: 0 },
        lastActivityDaysAgo: { type: Number }
    },

    // ═══════════════════════════════════════════════════════════════
    // CONVERSION
    // ═══════════════════════════════════════════════════════════════
    convertedToClient: { type: Boolean, default: false },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
    },
    convertedAt: Date,
    convertedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case'
    },

    // ═══════════════════════════════════════════════════════════════
    // LEAD SCORING (0-150 points)
    // ═══════════════════════════════════════════════════════════════
    leadScore: { type: Number, default: 0, min: 0, max: 150 },

    // ═══════════════════════════════════════════════════════════════
    // COMPETITION TRACKING
    // ═══════════════════════════════════════════════════════════════
    competition: {
        competitorNames: [{ type: String, trim: true }],
        competitorNotes: { type: String, maxlength: 1000 },
        ourAdvantages: { type: String, maxlength: 1000 },
        theirAdvantages: { type: String, maxlength: 1000 }
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    tags: [{ type: String, trim: true }],
    tagIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tag'
    }],
    practiceArea: { type: String, trim: true },
    notes: { type: String, maxlength: 5000 },
    internalNotes: { type: String, maxlength: 5000 },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },
    isVIP: { type: Boolean, default: false },
    customFields: mongoose.Schema.Types.Mixed,

    // ═══════════════════════════════════════════════════════════════
    // INTEGRATION (External systems)
    // ═══════════════════════════════════════════════════════════════
    integration: {
        externalId: { type: String, trim: true },
        sourceSystem: { type: String, trim: true },
        lastSyncDate: Date,
        syncStatus: {
            type: String,
            enum: ['synced', 'pending', 'failed', 'never']
        },
        syncErrors: [{ type: String }]
    },

    // ═══════════════════════════════════════════════════════════════
    // DATA QUALITY
    // ═══════════════════════════════════════════════════════════════
    dataQuality: {
        emailValid: { type: Boolean },
        phoneValid: { type: Boolean },
        enriched: { type: Boolean, default: false },
        enrichedAt: { type: Date },
        enrichmentSource: { type: String }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
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
leadSchema.index({ lawyerId: 1, status: 1 });
leadSchema.index({ lawyerId: 1, 'source.type': 1 });
leadSchema.index({ lawyerId: 1, assignedTo: 1 });
leadSchema.index({ lawyerId: 1, nextFollowUpDate: 1 });
leadSchema.index({ lawyerId: 1, convertedToClient: 1 });
leadSchema.index({ lawyerId: 1, createdAt: -1 });
leadSchema.index({ lawyerId: 1, organizationId: 1 });
leadSchema.index({ lawyerId: 1, contactId: 1 });
leadSchema.index({ firstName: 'text', lastName: 'text', companyName: 'text', email: 'text', phone: 'text' });
// Compound indexes for multi-tenant dashboard queries
leadSchema.index({ firmId: 1, status: 1, createdAt: -1 });
leadSchema.index({ firmId: 1, lawyerId: 1, status: 1 });
leadSchema.index({ firmId: 1, convertedToClient: 1, createdAt: -1 });
leadSchema.index({ firmId: 1, assignedTo: 1, status: 1 });
leadSchema.index({ firmId: 1, nextFollowUpDate: 1 });

// Najiz Indexes
leadSchema.index({ nationalId: 1 }, { sparse: true });
leadSchema.index({ iqamaNumber: 1 }, { sparse: true });
leadSchema.index({ crNumber: 1 }, { sparse: true });
leadSchema.index({ vatNumber: 1 }, { sparse: true });
leadSchema.index({ 'arabicName.fullName': 'text' });
leadSchema.index({ 'nationalAddress.regionCode': 1 });
leadSchema.index({ identityType: 1 });
leadSchema.index({ conflictCheckStatus: 1 });
leadSchema.index({ isVerified: 1 });
leadSchema.index({ riskLevel: 1 });

// Forecast & Deal Health Indexes
leadSchema.index({ forecastCategory: 1 });
leadSchema.index({ 'dealHealth.score': 1 });
leadSchema.index({ firmId: 1, forecastCategory: 1, expectedCloseDate: 1 });
leadSchema.index({ firmId: 1, 'dealHealth.grade': 1 });

// Campaign, Territory, Sales Team, Lost Reason, and Tag Indexes
leadSchema.index({ campaignId: 1 });
leadSchema.index({ territoryId: 1 });
leadSchema.index({ salesTeamId: 1 });
leadSchema.index({ lostReasonId: 1 });
leadSchema.index({ tagIds: 1 });
leadSchema.index({ firmId: 1, campaignId: 1, status: 1 });
leadSchema.index({ firmId: 1, territoryId: 1, status: 1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════
leadSchema.virtual('displayName').get(function() {
    if (this.type === 'company') {
        return this.companyName || this.companyNameAr;
    }
    return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

leadSchema.virtual('daysSinceCreated').get(function() {
    return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

leadSchema.virtual('daysSinceContact').get(function() {
    if (!this.lastContactedAt) return null;
    return Math.floor((Date.now() - this.lastContactedAt) / (1000 * 60 * 60 * 24));
});

leadSchema.set('toJSON', { virtuals: true });
leadSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
leadSchema.pre('save', async function(next) {
    // Generate lead ID
    if (!this.leadId) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const count = await this.constructor.countDocuments({
            lawyerId: this.lawyerId,
            createdAt: {
                $gte: new Date(year, date.getMonth(), 1),
                $lt: new Date(year, date.getMonth() + 1, 1)
            }
        });
        this.leadId = `LEAD-${year}${month}-${String(count + 1).padStart(4, '0')}`;
    }

    // Calculate weighted revenue
    if (this.estimatedValue !== undefined && this.probability !== undefined) {
        this.weightedRevenue = this.estimatedValue * (this.probability / 100);
    }

    // Calculate metrics.lastActivityDaysAgo
    if (!this.metrics) {
        this.metrics = {};
    }
    if (this.lastActivityAt) {
        const daysSinceActivity = Math.floor((Date.now() - this.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24));
        this.metrics.lastActivityDaysAgo = daysSinceActivity;
    }

    // Calculate lead score with breakdown if qualification data exists
    if (this.qualification) {
        // BANT scoring (0-30 points each)
        const scoring = {
            budget: { unknown: 0, low: 8, medium: 15, high: 23, premium: 30 },
            authority: { unknown: 0, researcher: 8, influencer: 18, decision_maker: 30 },
            need: { unknown: 0, exploring: 8, planning: 18, urgent: 30 },
            timeline: { unknown: 0, no_timeline: 0, this_year: 8, this_quarter: 15, this_month: 23, immediate: 30 }
        };

        const budgetScore = scoring.budget[this.qualification.budget] || 0;
        const authorityScore = scoring.authority[this.qualification.authority] || 0;
        const needScore = scoring.need[this.qualification.need] || 0;
        const timelineScore = scoring.timeline[this.qualification.timeline] || 0;

        // Engagement score (based on activity - 0-15 points)
        const engagementScore = Math.min(15, Math.floor(
            (this.activityCount || 0) * 1.5 +
            (this.callCount || 0) * 2 +
            (this.meetingCount || 0) * 3
        ));

        // Fit score (based on estimated value and intake completion - 0-15 points)
        let fitScore = 0;
        if (this.estimatedValue > 0) fitScore += 5;
        if (this.estimatedValue > 50000) fitScore += 5;  // > 500 SAR
        if (this.intake?.conflictCheckCompleted) fitScore += 3;
        if (this.intake?.caseType) fitScore += 2;
        fitScore = Math.min(15, fitScore);

        // Store breakdown
        if (!this.qualification.scoreBreakdown) {
            this.qualification.scoreBreakdown = {};
        }
        this.qualification.scoreBreakdown.budgetScore = budgetScore;
        this.qualification.scoreBreakdown.authorityScore = authorityScore;
        this.qualification.scoreBreakdown.needScore = needScore;
        this.qualification.scoreBreakdown.timelineScore = timelineScore;
        this.qualification.scoreBreakdown.engagementScore = engagementScore;
        this.qualification.scoreBreakdown.fitScore = fitScore;

        // Total score (0-150)
        const totalScore = budgetScore + authorityScore + needScore + timelineScore + engagementScore + fitScore;
        this.qualification.score = totalScore;
        this.leadScore = totalScore;
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get leads with filters
leadSchema.statics.getLeads = async function(lawyerId, filters = {}) {
    // Build base query - prioritize firmId for multi-tenancy, fallback to lawyerId
    const query = filters.firmId
        ? { firmId: new mongoose.Types.ObjectId(filters.firmId) }
        : { lawyerId: new mongoose.Types.ObjectId(lawyerId) };

    if (filters.status) query.status = filters.status;
    if (filters.source) query['source.type'] = filters.source;
    if (filters.assignedTo) query.assignedTo = new mongoose.Types.ObjectId(filters.assignedTo);
    if (filters.pipelineId) query.pipelineId = new mongoose.Types.ObjectId(filters.pipelineId);
    if (filters.convertedToClient !== undefined) query.convertedToClient = filters.convertedToClient;

    if (filters.search) {
        query.$or = [
            { firstName: { $regex: filters.search, $options: 'i' } },
            { lastName: { $regex: filters.search, $options: 'i' } },
            { companyName: { $regex: filters.search, $options: 'i' } },
            { email: { $regex: filters.search, $options: 'i' } },
            { phone: { $regex: filters.search, $options: 'i' } },
            { leadId: { $regex: filters.search, $options: 'i' } }
        ];
    }

    // Date filters
    if (filters.createdAfter) {
        query.createdAt = { ...query.createdAt, $gte: new Date(filters.createdAfter) };
    }
    if (filters.createdBefore) {
        query.createdAt = { ...query.createdAt, $lte: new Date(filters.createdBefore) };
    }

    const sort = {};
    sort[filters.sortBy || 'createdAt'] = filters.sortOrder === 'asc' ? 1 : -1;

    return await this.find(query)
        .populate('assignedTo', 'firstName lastName avatar')
        .populate('source.referralId', 'name')
        .populate('organizationId', 'legalName tradeName type')
        .populate('contactId', 'firstName lastName email phone')
        .sort(sort)
        .limit(filters.limit || 50)
        .skip(filters.skip || 0);
};

// Get pipeline statistics
leadSchema.statics.getPipelineStats = async function(lawyerId, dateRange = {}) {
    // Build base query - prioritize firmId for multi-tenancy, fallback to lawyerId
    const matchQuery = dateRange.firmId
        ? { firmId: new mongoose.Types.ObjectId(dateRange.firmId) }
        : { lawyerId: new mongoose.Types.ObjectId(lawyerId) };

    if (dateRange.start) matchQuery.createdAt = { $gte: new Date(dateRange.start) };
    if (dateRange.end) matchQuery.createdAt = { ...matchQuery.createdAt, $lte: new Date(dateRange.end) };

    const stats = await this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalValue: { $sum: '$estimatedValue' },
                avgValue: { $avg: '$estimatedValue' }
            }
        }
    ]);

    // Conversion rate
    const total = await this.countDocuments(matchQuery);
    const converted = await this.countDocuments({ ...matchQuery, convertedToClient: true });

    return {
        byStatus: stats,
        total,
        converted,
        conversionRate: total > 0 ? ((converted / total) * 100).toFixed(2) : 0
    };
};

// Get leads needing follow-up
leadSchema.statics.getNeedingFollowUp = async function(lawyerId, limit = 20, firmId = null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build base query - prioritize firmId for multi-tenancy, fallback to lawyerId
    const baseQuery = firmId
        ? { firmId: new mongoose.Types.ObjectId(firmId) }
        : { lawyerId: new mongoose.Types.ObjectId(lawyerId) };

    return await this.find({
        ...baseQuery,
        convertedToClient: false,
        status: { $nin: ['won', 'lost'] },
        $or: [
            { nextFollowUpDate: { $lte: today } },
            { lastContactedAt: { $lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, // No contact in 7 days
            { lastContactedAt: { $exists: false } }
        ]
    })
    .sort({ nextFollowUpDate: 1, createdAt: 1 })
    .limit(limit);
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Convert lead to client (comprehensive field transfer - NO DATA LOSS)
leadSchema.methods.convertToClient = async function(userId, options = {}) {
    const Client = mongoose.model('Client');
    const Case = mongoose.model('Case');
    const CrmActivity = mongoose.model('CrmActivity');

    // ═══════════════════════════════════════════════════════════════
    // BUILD INTERNAL NOTES WITH BANT QUALIFICATION DATA
    // This preserves the lead qualification data for future reference
    // ═══════════════════════════════════════════════════════════════
    let internalNotes = '';

    if (this.qualification) {
        internalNotes += '=== LEAD QUALIFICATION (BANT) ===\n\n';

        if (this.qualification.budget) {
            internalNotes += `Budget: ${this.qualification.budget}`;
            if (this.qualification.budgetAmount) {
                internalNotes += ` (${this.qualification.budgetAmount} halalas)`;
            }
            internalNotes += '\n';
            if (this.qualification.budgetNotes) {
                internalNotes += `  Notes: ${this.qualification.budgetNotes}\n`;
            }
        }

        if (this.qualification.authority) {
            internalNotes += `Authority: ${this.qualification.authority}\n`;
            if (this.qualification.authorityNotes) {
                internalNotes += `  Notes: ${this.qualification.authorityNotes}\n`;
            }
        }

        if (this.qualification.need) {
            internalNotes += `Need: ${this.qualification.need}\n`;
            if (this.qualification.needDescription) {
                internalNotes += `  Description: ${this.qualification.needDescription}\n`;
            }
        }

        if (this.qualification.timeline) {
            internalNotes += `Timeline: ${this.qualification.timeline}\n`;
            if (this.qualification.timelineNotes) {
                internalNotes += `  Notes: ${this.qualification.timelineNotes}\n`;
            }
        }

        if (this.qualification.score !== undefined) {
            internalNotes += `\nLead Score: ${this.qualification.score}/150\n`;
            if (this.qualification.scoreBreakdown) {
                internalNotes += 'Score Breakdown:\n';
                internalNotes += `  Budget: ${this.qualification.scoreBreakdown.budgetScore || 0}/30\n`;
                internalNotes += `  Authority: ${this.qualification.scoreBreakdown.authorityScore || 0}/30\n`;
                internalNotes += `  Need: ${this.qualification.scoreBreakdown.needScore || 0}/30\n`;
                internalNotes += `  Timeline: ${this.qualification.scoreBreakdown.timelineScore || 0}/30\n`;
                internalNotes += `  Engagement: ${this.qualification.scoreBreakdown.engagementScore || 0}/15\n`;
                internalNotes += `  Fit: ${this.qualification.scoreBreakdown.fitScore || 0}/15\n`;
            }
        }

        if (this.qualification.notes) {
            internalNotes += `\nQualification Notes: ${this.qualification.notes}\n`;
        }

        if (this.qualification.qualifiedAt) {
            internalNotes += `Qualified At: ${this.qualification.qualifiedAt.toISOString()}\n`;
        }

        internalNotes += '\n';
    }

    // Add lead source details for attribution tracking
    if (this.source) {
        internalNotes += '=== LEAD SOURCE ATTRIBUTION ===\n\n';
        internalNotes += `Source Type: ${this.source.type}\n`;
        if (this.source.referralName) {
            internalNotes += `Referral: ${this.source.referralName}\n`;
        }
        if (this.source.campaign) {
            internalNotes += `Campaign: ${this.source.campaign}\n`;
        }
        if (this.source.medium) {
            internalNotes += `Medium: ${this.source.medium}\n`;
        }
        if (this.source.notes) {
            internalNotes += `Source Notes: ${this.source.notes}\n`;
        }
        internalNotes += '\n';
    }

    // Add lead ID and conversion info
    internalNotes += `Original Lead ID: ${this.leadId || this._id}\n`;
    internalNotes += `Converted from Lead: ${new Date().toISOString()}\n`;

    // ═══════════════════════════════════════════════════════════════
    // COMPREHENSIVE FIELD MAPPING: Lead → Client
    // All shared fields transfer automatically - NO DUPLICATE ENTRY
    // ═══════════════════════════════════════════════════════════════
    const clientData = {
        lawyerId: this.lawyerId,
        firmId: this.firmId,
        leadId: this._id,
        createdBy: userId,

        // Client Type
        clientType: this.type === 'company' ? 'company' : 'individual',

        // Individual fields
        firstName: this.firstName,
        lastName: this.lastName,
        fullNameArabic: this.type === 'individual' ? `${this.firstName || ''} ${this.lastName || ''}`.trim() : undefined,

        // Company fields
        companyName: this.companyName,
        companyNameArabic: this.companyNameAr,
        crNumber: this.commercialRegistration,

        // Contact info
        email: this.email,
        phone: this.phone,
        alternatePhone: this.alternatePhone,
        whatsapp: this.whatsapp,

        // Address
        address: this.address,

        // IDs
        nationalId: this.nationalId,

        // ═══════════════════════════════════════════════════════════════
        // NAJIZ IDENTITY FIELDS - SAUDI GOVERNMENT PORTAL COMPLIANCE
        // ═══════════════════════════════════════════════════════════════
        arabicName: this.arabicName,
        identityType: this.identityType,
        iqamaNumber: this.iqamaNumber,
        gccId: this.gccId,
        gccCountry: this.gccCountry,
        passportNumber: this.passportNumber,
        passportCountry: this.passportCountry,
        passportExpiryDate: this.passportExpiryDate,
        borderNumber: this.borderNumber,
        dateOfBirth: this.dateOfBirth,
        dateOfBirthHijri: this.dateOfBirthHijri,
        gender: this.gender,
        maritalStatus: this.maritalStatus,
        nationality: this.nationality,
        nationalityCode: this.nationalityCode,
        sponsor: this.sponsor,

        // ═══════════════════════════════════════════════════════════════
        // NAJIZ COMPANY FIELDS
        // ═══════════════════════════════════════════════════════════════
        companyNameAr: this.companyNameAr,
        legalForm: this.legalForm,
        authorizedPerson: this.authorizedPerson,
        capital: this.capital,
        vatNumber: this.vatNumber,
        unifiedNumber: this.unifiedNumber,

        // ═══════════════════════════════════════════════════════════════
        // NAJIZ NATIONAL ADDRESSES
        // ═══════════════════════════════════════════════════════════════
        nationalAddress: this.nationalAddress,
        workAddress: this.workAddress,
        headquartersAddress: this.headquartersAddress,
        poBox: this.poBox,

        // ═══════════════════════════════════════════════════════════════
        // NAJIZ COMMUNICATION PREFERENCES
        // ═══════════════════════════════════════════════════════════════
        doNotContact: this.doNotContact,
        doNotEmail: this.doNotEmail,
        doNotCall: this.doNotCall,
        doNotSMS: this.doNotSMS,

        // ═══════════════════════════════════════════════════════════════
        // NAJIZ RISK & VERIFICATION
        // ═══════════════════════════════════════════════════════════════
        riskLevel: this.riskLevel,
        conflictCheckStatus: this.conflictCheckStatus,
        conflictNotes: this.conflictNotes,
        conflictCheckDate: this.conflictCheckDate,
        isVerified: this.isVerified,
        verificationSource: this.verificationSource,
        verifiedAt: this.verifiedAt,

        // ═══════════════════════════════════════════════════════════════
        // SOURCE TRACKING - FULL ATTRIBUTION DATA
        // ═══════════════════════════════════════════════════════════════
        clientSource: this.source?.type || 'referral',
        referralId: this.source?.referralId,
        referralName: this.source?.referralName,

        // Organization & Contact Relationships
        organizationId: this.organizationId,
        contactId: this.contactId,

        // ═══════════════════════════════════════════════════════════════
        // ACTIVITY TRACKING - TRANSFER ALL ACTIVITY COUNTS & DATES
        // ═══════════════════════════════════════════════════════════════
        lastContactedAt: this.lastContactedAt,
        lastActivityAt: this.lastActivityAt,
        nextFollowUpDate: this.nextFollowUpDate,
        nextFollowUpNote: this.nextFollowUpNote,
        activityCount: this.activityCount || 0,
        callCount: this.callCount || 0,
        emailCount: this.emailCount || 0,
        meetingCount: this.meetingCount || 0,

        // Notes - keep general notes in generalNotes field
        generalNotes: this.notes,

        // ═══════════════════════════════════════════════════════════════
        // INTERNAL NOTES - BANT QUALIFICATION & SOURCE ATTRIBUTION
        // Preserved for future reference and attribution tracking
        // ═══════════════════════════════════════════════════════════════
        internalNotes: internalNotes,

        tags: this.tags,

        // Billing (from lead's proposed fee)
        billing: this.proposedFeeType ? {
            type: this.proposedFeeType === 'fixed' ? 'flat_fee' : this.proposedFeeType,
            hourlyRate: this.proposedFeeType === 'hourly' ? this.proposedAmount : undefined,
            flatFee: this.proposedFeeType === 'fixed' ? this.proposedAmount : undefined,
            retainerAmount: this.proposedFeeType === 'retainer' ? this.proposedAmount : undefined
        } : undefined,

        // ═══════════════════════════════════════════════════════════════
        // ASSIGNMENTS - TRANSFER TEAM MEMBERS TO TEAM ASSIGNMENTS
        // ═══════════════════════════════════════════════════════════════
        assignments: {},

        // Initial status
        status: 'active',
        convertedFromLead: true,
        convertedAt: new Date()
    };

    // Build assignments object with team members
    if (this.assignedTo) {
        clientData.assignments.responsibleLawyerId = this.assignedTo;
    }

    // Transfer team members to appropriate assignment roles
    if (this.teamMembers && this.teamMembers.length > 0) {
        // First team member becomes assistant lawyer if no responsible lawyer
        if (!clientData.assignments.responsibleLawyerId && this.teamMembers[0]) {
            clientData.assignments.responsibleLawyerId = this.teamMembers[0];
        } else if (this.teamMembers[0]) {
            clientData.assignments.assistantLawyerId = this.teamMembers[0];
        }

        // Second team member becomes paralegal
        if (this.teamMembers[1]) {
            clientData.assignments.paralegalId = this.teamMembers[1];
        }

        // Third team member becomes researcher
        if (this.teamMembers[2]) {
            clientData.assignments.researcherId = this.teamMembers[2];
        }
    }

    // Remove assignments if empty
    if (Object.keys(clientData.assignments).length === 0) {
        delete clientData.assignments;
    }

    // Remove undefined fields
    Object.keys(clientData).forEach(key => {
        if (clientData[key] === undefined) delete clientData[key];
    });

    // Create client
    const client = await Client.create(clientData);

    // ═══════════════════════════════════════════════════════════════
    // TRANSFER ACTIVITY HISTORY - UPDATE ALL LEAD ACTIVITIES TO CLIENT
    // This preserves the complete activity timeline
    // ═══════════════════════════════════════════════════════════════
    try {
        const activityUpdateResult = await CrmActivity.updateMany(
            {
                entityType: 'lead',
                entityId: this._id
            },
            {
                $set: {
                    entityType: 'client',
                    entityId: client._id,
                    entityName: client.displayName || client.companyName
                }
            }
        );

        // Log the activity transfer for audit purposes
        if (activityUpdateResult.modifiedCount > 0) {
            await CrmActivity.create({
                lawyerId: this.lawyerId,
                type: 'lead_converted',
                entityType: 'client',
                entityId: client._id,
                entityName: client.displayName || client.companyName,
                title: `Lead converted to client`,
                description: `Lead ${this.leadId} converted to client ${client.clientNumber}. ${activityUpdateResult.modifiedCount} activities transferred.`,
                performedBy: userId,
                status: 'completed',
                completedAt: new Date()
            });
        }
    } catch (error) {
        logger.error('Error transferring activities:', error);
        // Continue with conversion even if activity transfer fails
    }

    // ═══════════════════════════════════════════════════════════════
    // OPTIONAL: Create Case from Lead's Intake Info
    // ═══════════════════════════════════════════════════════════════
    let createdCase = null;
    if (options.createCase && this.intake) {
        const caseData = {
            lawyerId: this.lawyerId,
            clientId: client._id,
            title: options.caseTitle || this.intake.caseDescription || `قضية ${client.displayName || client.companyName}`,
            description: this.intake.currentStatus,
            category: this.intake.caseType || 'other',
            priority: this.intake.urgency === 'urgent' ? 'critical' :
                      this.intake.urgency === 'high' ? 'high' :
                      this.intake.urgency === 'low' ? 'low' : 'medium',
            claimAmount: this.intake.estimatedValue || this.estimatedValue,
            court: this.intake.courtName,
            status: 'active',
            source: 'external',
            notes: this.intake.desiredOutcome ? [{
                text: `الهدف المطلوب: ${this.intake.desiredOutcome}`,
                createdBy: userId,
                createdAt: new Date()
            }] : []
        };

        // Handle opposing party
        if (this.intake.opposingParty) {
            caseData.laborCaseDetails = {
                company: { name: this.intake.opposingParty }
            };
        }

        createdCase = await Case.create(caseData);
        this.caseId = createdCase._id;
    }

    // Update lead
    this.convertedToClient = true;
    this.clientId = client._id;
    this.convertedAt = new Date();
    this.convertedBy = userId;
    this.status = 'won';
    this.actualCloseDate = new Date();
    await this.save();

    return { client, case: createdCase };
};

// Update status with history
leadSchema.methods.updateStatus = async function(newStatus, userId, notes) {
    const CrmActivity = mongoose.model('CrmActivity');

    const oldStatus = this.status;
    this.status = newStatus;
    this.lastModifiedBy = userId;

    // Update probability based on status
    const probabilityMap = {
        'new': 10,
        'contacted': 20,
        'qualified': 40,
        'proposal': 60,
        'negotiation': 80,
        'won': 100,
        'lost': 0,
        'dormant': 5
    };
    this.probability = probabilityMap[newStatus] || this.probability;

    await this.save();

    // Log activity
    await CrmActivity.create({
        lawyerId: this.lawyerId,
        type: 'status_change',
        entityType: 'lead',
        entityId: this._id,
        title: `Status changed from ${oldStatus} to ${newStatus}`,
        description: notes,
        performedBy: userId
    });

    return this;
};

module.exports = mongoose.model('Lead', leadSchema);
