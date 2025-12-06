const mongoose = require('mongoose');

// Email sub-schema
const emailSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['work', 'personal', 'other'],
        default: 'work'
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    isPrimary: {
        type: Boolean,
        default: false
    },
    canContact: {
        type: Boolean,
        default: true
    }
}, { _id: false });

// Phone sub-schema
const phoneSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['mobile', 'work', 'home', 'fax', 'other'],
        default: 'mobile'
    },
    number: {
        type: String,
        trim: true
    },
    countryCode: {
        type: String,
        default: '+966'
    },
    isPrimary: {
        type: Boolean,
        default: false
    },
    canSMS: {
        type: Boolean,
        default: true
    },
    canWhatsApp: {
        type: Boolean,
        default: true
    }
}, { _id: false });

const contactSchema = new mongoose.Schema({
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
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // BASIC INFO
    // ═══════════════════════════════════════════════════════════════
    salutation: {
        type: String,
        enum: ['mr', 'mrs', 'ms', 'dr', 'eng', 'prof', 'sheikh', 'his_excellency', null],
        default: null
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    middleName: {
        type: String,
        trim: true,
        maxlength: 100
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    preferredName: {
        type: String,
        trim: true,
        maxlength: 100
    },
    suffix: {
        type: String,
        trim: true,
        maxlength: 50
    },
    fullNameArabic: {
        type: String,
        trim: true,
        maxlength: 200
    },

    // ═══════════════════════════════════════════════════════════════
    // TYPE & CLASSIFICATION
    // ═══════════════════════════════════════════════════════════════
    type: {
        type: String,
        enum: ['individual', 'organization', 'court', 'attorney', 'expert', 'government', 'other'],
        required: true,
        default: 'individual'
    },
    primaryRole: {
        type: String,
        enum: [
            'client_contact', 'opposing_party', 'opposing_counsel', 'witness',
            'expert_witness', 'judge', 'court_clerk', 'mediator', 'arbitrator',
            'referral_source', 'vendor', 'other', null
        ],
        default: null
    },
    relationshipTypes: [{
        type: String,
        enum: [
            'current_client', 'former_client', 'prospect', 'adverse_party',
            'related_party', 'referral_source', 'business_contact', 'personal_contact'
        ]
    }],

    // ═══════════════════════════════════════════════════════════════
    // CONTACT INFORMATION
    // ═══════════════════════════════════════════════════════════════
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        trim: true
    },
    alternatePhone: {
        type: String,
        trim: true
    },
    emails: [emailSchema],
    phones: [phoneSchema],

    // ═══════════════════════════════════════════════════════════════
    // EMPLOYMENT/AFFILIATION
    // ═══════════════════════════════════════════════════════════════
    company: {
        type: String,
        trim: true,
        maxlength: 200
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization'
    },
    title: {
        type: String,
        trim: true,
        maxlength: 100
    },
    department: {
        type: String,
        trim: true,
        maxlength: 100
    },

    // ═══════════════════════════════════════════════════════════════
    // SAUDI-SPECIFIC IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    nationalId: {
        type: String,
        trim: true,
        maxlength: 10  // 10-digit Saudi National ID
    },
    iqamaNumber: {
        type: String,
        trim: true,
        maxlength: 10  // Resident ID for non-Saudis
    },
    passportNumber: {
        type: String,
        trim: true,
        maxlength: 20
    },
    passportCountry: {
        type: String,
        trim: true
    },
    dateOfBirth: {
        type: Date
    },
    nationality: {
        type: String,
        default: 'سعودي'
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

    // ═══════════════════════════════════════════════════════════════
    // COMMUNICATION PREFERENCES
    // ═══════════════════════════════════════════════════════════════
    preferredLanguage: {
        type: String,
        enum: ['ar', 'en'],
        default: 'ar'
    },
    preferredContactMethod: {
        type: String,
        enum: ['email', 'phone', 'sms', 'whatsapp', 'in_person', null],
        default: null
    },
    bestTimeToContact: {
        type: String,
        trim: true
    },
    doNotContact: {
        type: Boolean,
        default: false
    },
    doNotEmail: {
        type: Boolean,
        default: false
    },
    doNotCall: {
        type: Boolean,
        default: false
    },
    doNotSMS: {
        type: Boolean,
        default: false
    },

    // ═══════════════════════════════════════════════════════════════
    // CONFLICT CHECK (CRITICAL for law firms)
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
    // STATUS & PRIORITY
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['active', 'inactive', 'archived', 'deceased'],
        default: 'active'
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'vip'],
        default: 'normal'
    },
    vipStatus: {
        type: Boolean,
        default: false
    },

    // ═══════════════════════════════════════════════════════════════
    // RISK ASSESSMENT
    // ═══════════════════════════════════════════════════════════════
    riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high', null],
        default: null
    },
    isBlacklisted: {
        type: Boolean,
        default: false
    },
    blacklistReason: {
        type: String,
        maxlength: 1000
    },

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
    // NOTES
    // ═══════════════════════════════════════════════════════════════
    notes: {
        type: String,
        maxlength: 5000
    },

    // ═══════════════════════════════════════════════════════════════
    // LINKED ENTITIES
    // ═══════════════════════════════════════════════════════════════
    linkedCases: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case'
    }],
    linkedClients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
    }],

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
contactSchema.index({ lawyerId: 1, status: 1 });
contactSchema.index({ firmId: 1, status: 1 });
contactSchema.index({ lawyerId: 1, type: 1 });
contactSchema.index({ lawyerId: 1, primaryRole: 1 });
contactSchema.index({ lawyerId: 1, conflictCheckStatus: 1 });
contactSchema.index({ lawyerId: 1, organizationId: 1 });
contactSchema.index({ lawyerId: 1, createdAt: -1 });
contactSchema.index({ firstName: 'text', lastName: 'text', email: 'text', company: 'text', fullNameArabic: 'text' });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════
contactSchema.virtual('fullName').get(function() {
    const parts = [this.firstName, this.middleName, this.lastName].filter(Boolean);
    return parts.join(' ');
});

contactSchema.virtual('displayName').get(function() {
    if (this.preferredName) return this.preferredName;
    return `${this.firstName} ${this.lastName}`.trim();
});

// Ensure virtuals are included in JSON
contactSchema.set('toJSON', { virtuals: true });
contactSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Search contacts with filters
contactSchema.statics.searchContacts = async function(lawyerId, searchTerm, filters = {}) {
    const query = {
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        status: { $ne: 'archived' }
    };

    if (searchTerm) {
        query.$or = [
            { firstName: { $regex: searchTerm, $options: 'i' } },
            { lastName: { $regex: searchTerm, $options: 'i' } },
            { fullNameArabic: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } },
            { phone: { $regex: searchTerm, $options: 'i' } },
            { company: { $regex: searchTerm, $options: 'i' } },
            { nationalId: { $regex: searchTerm, $options: 'i' } }
        ];
    }

    if (filters.type) query.type = filters.type;
    if (filters.primaryRole) query.primaryRole = filters.primaryRole;
    if (filters.status) query.status = filters.status;
    if (filters.conflictCheckStatus) query.conflictCheckStatus = filters.conflictCheckStatus;
    if (filters.vipStatus !== undefined) query.vipStatus = filters.vipStatus;
    if (filters.organizationId) query.organizationId = new mongoose.Types.ObjectId(filters.organizationId);
    if (filters.tags && filters.tags.length > 0) query.tags = { $in: filters.tags };

    const sort = {};
    sort[filters.sortBy || 'createdAt'] = filters.sortOrder === 'asc' ? 1 : -1;

    return await this.find(query)
        .populate('organizationId', 'legalName tradeName')
        .sort(sort)
        .limit(filters.limit || 50)
        .skip(filters.skip || 0);
};

// Get contacts with pagination
contactSchema.statics.getContacts = async function(lawyerId, filters = {}) {
    const query = {};

    // Multi-tenancy: firmId first, then lawyerId fallback
    if (filters.firmId) {
        query.firmId = new mongoose.Types.ObjectId(filters.firmId);
    } else {
        query.lawyerId = new mongoose.Types.ObjectId(lawyerId);
    }

    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.primaryRole) query.primaryRole = filters.primaryRole;
    if (filters.conflictCheckStatus) query.conflictCheckStatus = filters.conflictCheckStatus;
    if (filters.vipStatus !== undefined) query.vipStatus = filters.vipStatus;
    if (filters.organizationId) query.organizationId = new mongoose.Types.ObjectId(filters.organizationId);
    if (filters.tags && filters.tags.length > 0) query.tags = { $in: filters.tags };

    if (filters.search) {
        query.$or = [
            { firstName: { $regex: filters.search, $options: 'i' } },
            { lastName: { $regex: filters.search, $options: 'i' } },
            { fullNameArabic: { $regex: filters.search, $options: 'i' } },
            { email: { $regex: filters.search, $options: 'i' } },
            { phone: { $regex: filters.search, $options: 'i' } },
            { company: { $regex: filters.search, $options: 'i' } }
        ];
    }

    const sort = {};
    sort[filters.sortBy || 'createdAt'] = filters.sortOrder === 'asc' ? 1 : -1;

    return await this.find(query)
        .populate('organizationId', 'legalName tradeName')
        .sort(sort)
        .limit(filters.limit || 50)
        .skip(filters.skip || 0);
};

// Conflict check method
contactSchema.statics.checkConflicts = async function(lawyerId, checkData) {
    const matches = [];
    const searchTerms = [];

    // Build search terms from check data
    if (checkData.names && checkData.names.length > 0) {
        searchTerms.push(...checkData.names);
    }
    if (checkData.email) searchTerms.push(checkData.email);
    if (checkData.phone) searchTerms.push(checkData.phone);
    if (checkData.nationalId) searchTerms.push(checkData.nationalId);

    // Search for matches
    for (const term of searchTerms) {
        const results = await this.find({
            lawyerId: new mongoose.Types.ObjectId(lawyerId),
            $or: [
                { firstName: { $regex: term, $options: 'i' } },
                { lastName: { $regex: term, $options: 'i' } },
                { fullNameArabic: { $regex: term, $options: 'i' } },
                { email: { $regex: term, $options: 'i' } },
                { phone: { $regex: term, $options: 'i' } },
                { nationalId: term }
            ]
        }).populate('linkedCases', 'caseNumber title');

        for (const contact of results) {
            if (!matches.find(m => m.entityId.toString() === contact._id.toString())) {
                matches.push({
                    entityType: 'contact',
                    entityId: contact._id,
                    entityName: contact.fullName,
                    matchType: contact.nationalId === checkData.nationalId ? 'id' :
                               contact.email === checkData.email ? 'email' :
                               contact.phone === checkData.phone ? 'phone' : 'name',
                    matchScore: contact.nationalId === checkData.nationalId ? 100 :
                                contact.email === checkData.email ? 90 :
                                contact.phone === checkData.phone ? 85 : 70,
                    caseNumbers: contact.linkedCases?.map(c => c.caseNumber) || []
                });
            }
        }
    }

    return matches;
};

module.exports = mongoose.model('Contact', contactSchema);
