const mongoose = require('mongoose');

// Key contact sub-schema
const keyContactSchema = new mongoose.Schema({
    contactId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact'
    },
    role: {
        type: String,
        trim: true  // e.g., 'CEO', 'Legal Counsel', 'Procurement'
    },
    isPrimary: {
        type: Boolean,
        default: false
    }
}, { _id: false });

const organizationSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // LEGAL NAMES
    // ═══════════════════════════════════════════════════════════════
    legalName: {
        type: String,
        required: false,
        trim: true,
        maxlength: 200
    },
    legalNameAr: {
        type: String,
        trim: true,
        maxlength: 200
    },
    tradeName: {
        type: String,
        trim: true,
        maxlength: 200
    },
    tradeNameAr: {
        type: String,
        trim: true,
        maxlength: 200
    },
    // Legacy field for backward compatibility
    name: {
        type: String,
        trim: true
    },
    nameAr: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // ENTITY TYPE
    // ═══════════════════════════════════════════════════════════════
    type: {
        type: String,
        enum: [
            'llc', 'joint_stock', 'partnership', 'sole_proprietorship',
            'branch', 'government', 'nonprofit', 'professional', 'holding',
            'company', 'court', 'law_firm', 'other'
        ],
        required: false
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'dissolved', 'pending', 'archived'],
        default: 'active'
    },

    // ═══════════════════════════════════════════════════════════════
    // INDUSTRY & CLASSIFICATION
    // ═══════════════════════════════════════════════════════════════
    industry: {
        type: String,
        trim: true
    },
    subIndustry: {
        type: String,
        trim: true
    },
    size: {
        type: String,
        enum: ['micro', 'small', 'medium', 'large', 'enterprise', null],
        default: null
    },
    employeeCount: {
        type: Number
    },

    // ═══════════════════════════════════════════════════════════════
    // SAUDI REGISTRATION (CRITICAL)
    // ═══════════════════════════════════════════════════════════════
    commercialRegistration: {
        type: String,
        trim: true,
        maxlength: 10  // 10 digits
    },
    crIssueDate: {
        type: Date
    },
    crExpiryDate: {
        type: Date
    },
    crIssuingCity: {
        type: String,
        trim: true
    },
    vatNumber: {
        type: String,
        trim: true,
        maxlength: 15  // 15 digits starting with 3
    },
    unifiedNumber: {
        type: String,
        trim: true  // 700 number
    },
    municipalLicense: {
        type: String,
        trim: true
    },
    chamberMembership: {
        type: String,
        trim: true
    },
    // Legacy field for backward compatibility
    registrationNumber: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // CONTACT INFORMATION
    // ═══════════════════════════════════════════════════════════════
    phone: {
        type: String,
        trim: true
    },
    fax: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    website: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // ADDRESS
    // ═══════════════════════════════════════════════════════════════
    address: {
        type: String,
        trim: true
    },
    buildingNumber: {
        type: String,
        trim: true
    },
    district: {
        type: String,
        trim: true
    },
    city: {
        type: String,
        trim: true
    },
    province: {
        type: String,
        trim: true
    },
    postalCode: {
        type: String,
        trim: true
    },
    country: {
        type: String,
        default: 'المملكة العربية السعودية'
    },
    nationalAddress: {
        type: String,
        trim: true  // Saudi National Address
    },
    poBox: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // CORPORATE STRUCTURE
    // ═══════════════════════════════════════════════════════════════
    parentCompany: {
        type: String,
        trim: true
    },
    parentOrganizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        index: true
    },
    subsidiaries: [{
        type: String,
        trim: true
    }],
    subsidiaryOrganizations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization'
    }],
    hierarchyLevel: {
        type: String,
        enum: ['parent', 'subsidiary', 'standalone'],
        default: 'standalone'
    },
    foundedDate: {
        type: Date
    },
    // D&B / Company Intelligence
    dunsNumber: {
        type: String,
        trim: true
    },
    naicsCode: {
        type: String,
        trim: true
    },
    sicCode: {
        type: String,
        trim: true
    },
    stockSymbol: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // FINANCIAL INFORMATION (all in halalas)
    // ═══════════════════════════════════════════════════════════════
    capital: {
        type: Number  // In halalas
    },
    annualRevenue: {
        type: Number  // In halalas
    },
    creditLimit: {
        type: Number  // In halalas
    },
    paymentTerms: {
        type: Number,  // Days (e.g., 30, 60, 90)
        default: 30
    },

    // ═══════════════════════════════════════════════════════════════
    // BANKING INFORMATION
    // ═══════════════════════════════════════════════════════════════
    bankName: {
        type: String,
        trim: true
    },
    iban: {
        type: String,
        trim: true,
        maxlength: 24  // SA + 22 characters
    },
    accountHolderName: {
        type: String,
        trim: true
    },
    swiftCode: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // BILLING PREFERENCES
    // ═══════════════════════════════════════════════════════════════
    billingType: {
        type: String,
        enum: ['hourly', 'fixed', 'contingency', 'retainer', null],
        default: null
    },
    preferredPaymentMethod: {
        type: String,
        enum: ['bank_transfer', 'check', 'cash', 'credit_card', null],
        default: null
    },
    billingCycle: {
        type: String,
        enum: ['monthly', 'quarterly', 'upon_completion', null],
        default: null
    },
    billingEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    billingContact: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact'
    },

    // ═══════════════════════════════════════════════════════════════
    // CONFLICT CHECK
    // ═══════════════════════════════════════════════════════════════
    conflictCheckStatus: {
        type: String,
        enum: ['not_checked', 'clear', 'potential_conflict', 'confirmed_conflict'],
        default: 'not_checked'
    },
    conflictNotes: {
        type: String,
        maxlength: 2000
    },
    conflictCheckDate: {
        type: Date
    },
    conflictCheckedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // ═══════════════════════════════════════════════════════════════
    // KEY CONTACTS
    // ═══════════════════════════════════════════════════════════════
    keyContacts: [keyContactSchema],

    // ═══════════════════════════════════════════════════════════════
    // TAGS & CATEGORIES
    // ═══════════════════════════════════════════════════════════════
    tags: [{
        type: String,
        trim: true
    }],
    practiceAreas: [{
        type: String,
        trim: true
    }],

    // ═══════════════════════════════════════════════════════════════
    // NOTES & DESCRIPTION
    // ═══════════════════════════════════════════════════════════════
    notes: {
        type: String,
        maxlength: 5000
    },
    description: {
        type: String,
        maxlength: 2000
    },

    // ═══════════════════════════════════════════════════════════════
    // LINKED ENTITIES
    // ═══════════════════════════════════════════════════════════════
    linkedClients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
    }],
    linkedContacts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact'
    }],
    linkedCases: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case'
    }],

    // ═══════════════════════════════════════════════════════════════
    // BUSINESS INTELLIGENCE (iDempiere pattern)
    // ═══════════════════════════════════════════════════════════════
    businessIntelligence: {
        potentialLTV: { type: Number, default: 0 },
        actualLTV: { type: Number, default: 0 },
        totalRevenue: { type: Number, default: 0 },
        shareOfWallet: { type: Number, min: 0, max: 100 },
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
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // STAGE TRACKING (Odoo pattern)
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
    // SLA & CONTRACT
    // ═══════════════════════════════════════════════════════════════
    sla: {
        slaLevel: {
            type: String,
            enum: ['bronze', 'silver', 'gold', 'platinum', 'enterprise', 'custom']
        },
        slaExpiryDate: Date,
        contractValue: { type: Number, default: 0 },
        contractStartDate: Date,
        contractEndDate: Date,
        contractRenewalDate: Date,
        autoRenew: { type: Boolean, default: false }
    },

    // ═══════════════════════════════════════════════════════════════
    // MARKETING
    // ═══════════════════════════════════════════════════════════════
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign'
    },
    marketingScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    engagementScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    lastMarketingTouch: Date,
    leadSource: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // INTEGRATION (External System Sync)
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
    // TERRITORY & ASSIGNMENT
    // ═══════════════════════════════════════════════════════════════
    territoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Territory',
        index: true
    },
    salesTeamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SalesTeam',
        index: true
    },
    accountManagerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // CUSTOM FIELDS (Structured)
    // ═══════════════════════════════════════════════════════════════
    customFields: {
        field1: { type: String, trim: true },
        field2: { type: String, trim: true },
        field3: { type: String, trim: true },
        field4: { type: String, trim: true },
        field5: { type: String, trim: true },
        number1: { type: Number },
        number2: { type: Number },
        date1: Date,
        date2: Date,
        checkbox1: { type: Boolean, default: false },
        checkbox2: { type: Boolean, default: false },
        dropdown1: { type: String, trim: true },
        textarea1: { type: String, maxlength: 5000 }
    },

    // ═══════════════════════════════════════════════════════════════
    // FOLLOW-UP TRACKING
    // ═══════════════════════════════════════════════════════════════
    followUp: {
        nextDate: Date,
        notes: { type: String, maxlength: 2000 },
        count: { type: Number, default: 0 },
        lastContactDate: Date,
        lastContactMethod: {
            type: String,
            enum: ['phone', 'email', 'whatsapp', 'meeting', 'sms', 'other']
        },
        lastContactBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    versionKey: false,
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
organizationSchema.index({ lawyerId: 1, status: 1 });
organizationSchema.index({ firmId: 1, status: 1 });
organizationSchema.index({ lawyerId: 1, type: 1 });
organizationSchema.index({ lawyerId: 1, industry: 1 });
organizationSchema.index({ lawyerId: 1, conflictCheckStatus: 1 });
organizationSchema.index({ lawyerId: 1, createdAt: -1 });
organizationSchema.index({ commercialRegistration: 1 });
organizationSchema.index({ vatNumber: 1 });
organizationSchema.index({
    legalName: 'text',
    legalNameAr: 'text',
    tradeName: 'text',
    tradeNameAr: 'text',
    email: 'text',
    name: 'text',
    nameAr: 'text'
});

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════
organizationSchema.virtual('displayName').get(function() {
    return this.tradeName || this.legalName || this.name;
});

organizationSchema.virtual('displayNameAr').get(function() {
    return this.tradeNameAr || this.legalNameAr || this.nameAr;
});

// Ensure virtuals are included in JSON
organizationSchema.set('toJSON', { virtuals: true });
organizationSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
organizationSchema.pre('save', function(next) {
    // Sync legacy fields with new fields
    if (this.legalName && !this.name) {
        this.name = this.legalName;
    }
    if (this.legalNameAr && !this.nameAr) {
        this.nameAr = this.legalNameAr;
    }
    if (this.commercialRegistration && !this.registrationNumber) {
        this.registrationNumber = this.commercialRegistration;
    }
    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Search organizations
organizationSchema.statics.searchOrganizations = async function(lawyerId, searchTerm, filters = {}) {
    const query = {
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        status: { $ne: 'archived' }
    };

    if (searchTerm) {
        query.$or = [
            { legalName: { $regex: searchTerm, $options: 'i' } },
            { legalNameAr: { $regex: searchTerm, $options: 'i' } },
            { tradeName: { $regex: searchTerm, $options: 'i' } },
            { tradeNameAr: { $regex: searchTerm, $options: 'i' } },
            { name: { $regex: searchTerm, $options: 'i' } },
            { nameAr: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } },
            { commercialRegistration: { $regex: searchTerm, $options: 'i' } },
            { vatNumber: { $regex: searchTerm, $options: 'i' } }
        ];
    }

    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.industry) query.industry = filters.industry;
    if (filters.conflictCheckStatus) query.conflictCheckStatus = filters.conflictCheckStatus;
    if (filters.tags && filters.tags.length > 0) query.tags = { $in: filters.tags };

    const sort = {};
    sort[filters.sortBy || 'createdAt'] = filters.sortOrder === 'asc' ? 1 : -1;

    return await this.find(query)
        .populate('keyContacts.contactId', 'firstName lastName email phone')
        .populate('billingContact', 'firstName lastName email phone')
        .sort(sort)
        .limit(filters.limit || 50)
        .skip(filters.skip || 0);
};

// Get organizations with pagination
organizationSchema.statics.getOrganizations = async function(lawyerId, filters = {}) {
    const query = {};

    // Multi-tenancy: firmId first, then lawyerId fallback
    if (filters.firmId) {
        query.firmId = new mongoose.Types.ObjectId(filters.firmId);
    } else {
        query.lawyerId = new mongoose.Types.ObjectId(lawyerId);
    }

    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.industry) query.industry = filters.industry;
    if (filters.conflictCheckStatus) query.conflictCheckStatus = filters.conflictCheckStatus;
    if (filters.tags && filters.tags.length > 0) query.tags = { $in: filters.tags };

    if (filters.search) {
        query.$or = [
            { legalName: { $regex: filters.search, $options: 'i' } },
            { legalNameAr: { $regex: filters.search, $options: 'i' } },
            { tradeName: { $regex: filters.search, $options: 'i' } },
            { tradeNameAr: { $regex: filters.search, $options: 'i' } },
            { name: { $regex: filters.search, $options: 'i' } },
            { nameAr: { $regex: filters.search, $options: 'i' } },
            { email: { $regex: filters.search, $options: 'i' } },
            { commercialRegistration: { $regex: filters.search, $options: 'i' } },
            { vatNumber: { $regex: filters.search, $options: 'i' } }
        ];
    }

    const sort = {};
    sort[filters.sortBy || 'createdAt'] = filters.sortOrder === 'asc' ? 1 : -1;

    return await this.find(query)
        .populate('keyContacts.contactId', 'firstName lastName email phone')
        .populate('billingContact', 'firstName lastName email phone')
        .sort(sort)
        .limit(filters.limit || 50)
        .skip(filters.skip || 0);
};

// Conflict check method
organizationSchema.statics.checkConflicts = async function(lawyerId, checkData) {
    const matches = [];
    const searchTerms = [];

    // Build search terms from check data
    if (checkData.names && checkData.names.length > 0) {
        searchTerms.push(...checkData.names);
    }
    if (checkData.email) searchTerms.push(checkData.email);
    if (checkData.commercialRegistration) searchTerms.push(checkData.commercialRegistration);
    if (checkData.vatNumber) searchTerms.push(checkData.vatNumber);

    // Search for matches
    for (const term of searchTerms) {
        const results = await this.find({
            lawyerId: new mongoose.Types.ObjectId(lawyerId),
            $or: [
                { legalName: { $regex: term, $options: 'i' } },
                { legalNameAr: { $regex: term, $options: 'i' } },
                { tradeName: { $regex: term, $options: 'i' } },
                { email: { $regex: term, $options: 'i' } },
                { commercialRegistration: term },
                { vatNumber: term }
            ]
        }).populate('linkedCases', 'caseNumber title');

        for (const org of results) {
            if (!matches.find(m => m.entityId.toString() === org._id.toString())) {
                matches.push({
                    entityType: 'organization',
                    entityId: org._id,
                    entityName: org.displayName,
                    matchType: org.commercialRegistration === checkData.commercialRegistration ? 'id' :
                               org.vatNumber === checkData.vatNumber ? 'id' :
                               org.email === checkData.email ? 'email' : 'name',
                    matchScore: org.commercialRegistration === checkData.commercialRegistration ? 100 :
                                org.vatNumber === checkData.vatNumber ? 100 :
                                org.email === checkData.email ? 90 : 70,
                    caseNumbers: org.linkedCases?.map(c => c.caseNumber) || []
                });
            }
        }
    }

    return matches;
};

module.exports = mongoose.model('Organization', organizationSchema);
