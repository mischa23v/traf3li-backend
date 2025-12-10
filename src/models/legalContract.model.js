const mongoose = require('mongoose');

const legalContractSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },

    // ═══════════════════════════════════════════════════════════════
    // BASIC CONTRACT INFO
    // ═══════════════════════════════════════════════════════════════
    contractNumber: {
        type: String,
        unique: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        maxlength: 500
    },
    titleAr: String,
    description: String,
    descriptionAr: String,

    // Contract Type
    contractType: {
        type: String,
        enum: [
            // Commercial contracts
            'sale', 'purchase', 'lease', 'rental', 'service', 'employment',
            'partnership', 'joint_venture', 'agency', 'franchise', 'distribution',
            'construction', 'maintenance', 'supply', 'consulting', 'license',
            // Legal documents
            'power_of_attorney', 'settlement', 'release', 'non_disclosure',
            'non_compete', 'guarantee', 'mortgage', 'pledge',
            // Personal status
            'marriage_contract', 'divorce_agreement', 'custody_agreement',
            'alimony_agreement', 'inheritance_distribution', 'waqf_deed', 'will',
            // Other
            'memorandum_of_understanding', 'letter_of_intent', 'other'
        ],
        required: true
    },
    contractTypeAr: String,

    // ═══════════════════════════════════════════════════════════════
    // PARTIES (الأطراف)
    // ═══════════════════════════════════════════════════════════════
    parties: [{
        role: {
            type: String,
            enum: ['party_one', 'party_two', 'first_party', 'second_party',
                   'seller', 'buyer', 'lessor', 'lessee', 'employer', 'employee',
                   'principal', 'agent', 'guarantor', 'beneficiary', 'witness']
        },
        roleAr: String,  // الطرف الأول, الطرف الثاني, etc.

        partyType: {
            type: String,
            enum: ['individual', 'company', 'government']
        },

        // Individual Info
        fullNameArabic: String,  // الاسم الرباعي
        firstName: String,
        fatherName: String,
        grandfatherName: String,
        familyName: String,
        fullNameEnglish: String,
        nationality: String,
        nationalId: String,
        identityType: {
            type: String,
            enum: ['national_id', 'iqama', 'visitor_id', 'gcc_id', 'passport']
        },
        idExpiryDate: Date,
        gender: { type: String, enum: ['male', 'female'] },
        dateOfBirth: Date,
        profession: String,

        // Company Info
        companyName: String,
        companyNameEnglish: String,
        crNumber: String,  // Commercial Registration
        unifiedNumber: String,
        crExpiryDate: Date,
        capital: Number,
        mainActivity: String,

        // Authorized Representative (for companies)
        authorizedRep: {
            name: String,
            nationalId: String,
            position: String,
            authorizationType: String  // POA, Board Resolution, etc.
        },

        // Contact
        phone: String,
        email: String,

        // National Address (العنوان الوطني)
        nationalAddress: {
            buildingNumber: String,
            streetName: String,
            district: String,
            city: String,
            region: String,
            postalCode: String,
            additionalNumber: String,
            shortAddress: String,
            country: { type: String, default: 'Saudi Arabia' }
        },

        // Signature
        signatureStatus: {
            type: String,
            enum: ['pending', 'signed', 'declined', 'not_required']
        },
        signedDate: Date,
        signatureMethod: {
            type: String,
            enum: ['physical', 'electronic', 'nafath', 'absher']
        },
        signatureReference: String
    }],

    // ═══════════════════════════════════════════════════════════════
    // CONTRACT DETAILS
    // ═══════════════════════════════════════════════════════════════

    // Dates
    draftDate: Date,
    executionDate: Date,  // تاريخ التنفيذ
    effectiveDate: Date,  // تاريخ السريان
    expiryDate: Date,  // تاريخ الانتهاء
    executionDateHijri: String,
    effectiveDateHijri: String,
    expiryDateHijri: String,

    // Duration
    duration: {
        value: Number,
        unit: { type: String, enum: ['days', 'weeks', 'months', 'years'] },
        autoRenew: { type: Boolean, default: false },
        renewalTerms: String,
        noticePeriod: {
            value: Number,
            unit: { type: String, enum: ['days', 'weeks', 'months'] }
        }
    },

    // Financial Terms
    financialTerms: {
        totalValue: Number,
        currency: { type: String, default: 'SAR' },
        paymentSchedule: [{
            description: String,
            amount: Number,
            dueDate: Date,
            paid: { type: Boolean, default: false },
            paidDate: Date,
            paymentReference: String
        }],
        advancePayment: Number,
        retentionAmount: Number,
        penaltyClause: {
            hasClause: { type: Boolean, default: false },
            dailyPenalty: Number,
            maxPenalty: Number,
            description: String
        },
        vatIncluded: { type: Boolean, default: true },
        vatAmount: Number
    },

    // ═══════════════════════════════════════════════════════════════
    // CONTRACT CONTENT
    // ═══════════════════════════════════════════════════════════════
    content: {
        preamble: String,  // مقدمة العقد
        preambleAr: String,
        recitals: String,  // التمهيد
        recitalsAr: String,

        clauses: [{
            clauseNumber: String,
            titleAr: String,
            titleEn: String,
            textAr: String,
            textEn: String,
            isEdited: { type: Boolean, default: false },
            editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            editedAt: Date
        }],

        schedules: [{
            scheduleNumber: String,
            title: String,
            content: String,
            attachmentUrl: String
        }],

        signatures: {
            signatureBlockAr: String,
            signatureBlockEn: String
        }
    },

    // Template
    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ContractTemplate'
    },
    isTemplate: { type: Boolean, default: false },
    templateName: String,

    // Language
    language: {
        type: String,
        enum: ['ar', 'en', 'bilingual'],
        default: 'ar'
    },
    textDirection: {
        type: String,
        enum: ['rtl', 'ltr'],
        default: 'rtl'
    },

    // ═══════════════════════════════════════════════════════════════
    // NAJIZ INTEGRATION (وزارة العدل)
    // ═══════════════════════════════════════════════════════════════
    najizIntegration: {
        // Notarization Status
        isNotarized: { type: Boolean, default: false },
        notarizationType: {
            type: String,
            enum: ['notary_public', 'court', 'embassy', 'virtual_notary']
        },
        notaryNumber: String,  // رقم الكاتب العدل
        notarizationNumber: String,  // رقم التوثيق
        notarizationDate: Date,
        notarizationDateHijri: String,
        notaryCity: String,
        notaryBranch: String,

        // Electronic Documentation
        electronicDeedNumber: String,  // رقم الصك الإلكتروني
        verificationCode: String,  // رمز التحقق
        qrCode: String,  // QR code for verification

        // For specific contract types
        // Marriage Contract
        marriageRegistration: {
            registrationNumber: String,
            registrationDate: Date,
            maazounName: String,  // مأذون
            maazounNumber: String,
            witnesses: [{
                name: String,
                nationalId: String
            }]
        },

        // Real Estate
        realEstateTransfer: {
            deedNumber: String,  // رقم الصك
            oldDeedNumber: String,
            propertyType: String,
            propertyLocation: {
                city: String,
                district: String,
                plotNumber: String,
                planNumber: String
            },
            propertyArea: Number,  // in sqm
            transferDate: Date
        },

        // Power of Attorney
        poaDetails: {
            poaNumber: String,
            poaType: { type: String, enum: ['general', 'specific', 'litigation'] },
            authorizations: [String],  // المرافعة, البيع, الشراء, etc.
            limitations: String,
            validFrom: Date,
            validUntil: Date,
            isRevoked: { type: Boolean, default: false },
            revocationDate: Date,
            revocationNumber: String
        },

        // Sync Status
        lastSyncedAt: Date,
        syncStatus: { type: String, enum: ['synced', 'pending', 'error', 'not_applicable'] }
    },

    // ═══════════════════════════════════════════════════════════════
    // ENFORCEMENT (التنفيذ)
    // ═══════════════════════════════════════════════════════════════
    enforcement: {
        isEnforceable: { type: Boolean, default: false },  // Notarized contracts are enforceable

        enforcementRequest: {
            hasRequest: { type: Boolean, default: false },
            requestNumber: String,
            requestDate: Date,
            court: String,
            status: { type: String, enum: ['pending', 'accepted', 'in_progress', 'completed', 'rejected'] },
            amount: Number
        },

        breachDetails: {
            hasBreach: { type: Boolean, default: false },
            breachDate: Date,
            breachingParty: String,
            breachDescription: String,
            breachType: { type: String, enum: ['non_payment', 'non_performance', 'delay', 'quality', 'other'] },
            noticeServed: { type: Boolean, default: false },
            noticeDate: Date,
            cureDeadline: Date
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // DISPUTE RESOLUTION
    // ═══════════════════════════════════════════════════════════════
    disputeResolution: {
        method: {
            type: String,
            enum: ['litigation', 'arbitration', 'mediation', 'reconciliation'],
            default: 'litigation'
        },

        governingLaw: { type: String, default: 'Saudi Arabian Law' },
        jurisdiction: { type: String, default: 'Saudi Arabia' },
        court: String,  // e.g., "Commercial Court, Riyadh"

        arbitration: {
            isArbitrable: { type: Boolean, default: false },
            arbitrationCenter: String,  // e.g., "Saudi Center for Commercial Arbitration"
            arbitrationRules: String,
            seat: String,  // Location of arbitration
            language: String,
            numberOfArbitrators: { type: Number, enum: [1, 3] }
        },

        mediation: {
            isMediatable: { type: Boolean, default: false },
            mediationCenter: String
        },

        // Active dispute
        activeDispute: {
            hasDispute: { type: Boolean, default: false },
            caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },
            caseNumber: String,
            filingDate: Date,
            status: String
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS & WORKFLOW
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: [
            'draft', 'under_review', 'pending_approval', 'approved',
            'pending_signature', 'partially_signed', 'fully_signed',
            'active', 'expired', 'terminated', 'suspended',
            'in_dispute', 'in_enforcement', 'completed', 'archived'
        ],
        default: 'draft'
    },

    statusHistory: [{
        status: String,
        date: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: String,
        notes: String
    }],

    // Workflow
    workflow: {
        currentStep: String,
        steps: [{
            name: String,
            status: { type: String, enum: ['pending', 'in_progress', 'completed', 'skipped'] },
            assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            dueDate: Date,
            completedDate: Date,
            completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        }],
        approvers: [{
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            status: { type: String, enum: ['pending', 'approved', 'rejected'] },
            date: Date,
            comments: String
        }]
    },

    // ═══════════════════════════════════════════════════════════════
    // LINKED RECORDS
    // ═══════════════════════════════════════════════════════════════
    linkedRecords: {
        caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },
        clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
        invoiceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }],
        documentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
        relatedContracts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LegalContract' }]
    },

    // ═══════════════════════════════════════════════════════════════
    // ATTACHMENTS
    // ═══════════════════════════════════════════════════════════════
    attachments: [{
        fileName: String,
        fileUrl: String,
        fileKey: String,
        fileType: String,
        fileSize: Number,
        category: {
            type: String,
            enum: ['contract_draft', 'signed_copy', 'amendment', 'schedule',
                   'supporting_document', 'id_copy', 'cr_copy', 'poa_copy', 'other']
        },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
        description: String
    }],

    // ═══════════════════════════════════════════════════════════════
    // AMENDMENTS
    // ═══════════════════════════════════════════════════════════════
    amendments: [{
        amendmentNumber: String,
        date: Date,
        description: String,
        changes: [{
            clauseNumber: String,
            originalText: String,
            amendedText: String
        }],
        effectiveDate: Date,
        signedByAll: { type: Boolean, default: false },
        documentUrl: String
    }],

    // ═══════════════════════════════════════════════════════════════
    // REMINDERS & ALERTS
    // ═══════════════════════════════════════════════════════════════
    reminders: [{
        type: { type: String, enum: ['expiry', 'renewal', 'payment', 'milestone', 'custom'] },
        date: Date,
        daysBefore: Number,
        message: String,
        recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        sent: { type: Boolean, default: false },
        sentAt: Date
    }],

    // ═══════════════════════════════════════════════════════════════
    // NOTES & TAGS
    // ═══════════════════════════════════════════════════════════════
    notes: [{
        text: String,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now }
    }],

    internalNotes: String,
    tags: [{ type: String, trim: true }],

    // ═══════════════════════════════════════════════════════════════
    // VERSION CONTROL
    // ═══════════════════════════════════════════════════════════════
    version: {
        type: Number,
        default: 1
    },
    previousVersions: [{
        version: Number,
        content: mongoose.Schema.Types.Mixed,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changedAt: Date,
        changeNote: String
    }],

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lawyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]

}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
legalContractSchema.index({ firmId: 1, status: 1 });
legalContractSchema.index({ firmId: 1, contractType: 1 });
legalContractSchema.index({ lawyerId: 1, status: 1 });
legalContractSchema.index({ 'linkedRecords.caseId': 1 });
legalContractSchema.index({ 'linkedRecords.clientId': 1 });
legalContractSchema.index({ 'parties.nationalId': 1 });
legalContractSchema.index({ 'parties.crNumber': 1 });
legalContractSchema.index({ 'najizIntegration.notarizationNumber': 1 });
legalContractSchema.index({ 'najizIntegration.electronicDeedNumber': 1 });
legalContractSchema.index({ expiryDate: 1 });
legalContractSchema.index({ status: 1, expiryDate: 1 });
legalContractSchema.index({ title: 'text', titleAr: 'text', description: 'text' });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
legalContractSchema.pre('save', async function(next) {
    // Generate contract number
    if (this.isNew && !this.contractNumber) {
        const count = await this.constructor.countDocuments() + 1;
        const year = new Date().getFullYear();
        this.contractNumber = `CTR-${year}-${String(count).padStart(6, '0')}`;
    }

    // Track status changes
    if (this.isModified('status')) {
        this.statusHistory.push({
            status: this.status,
            date: new Date(),
            changedBy: this.updatedBy
        });
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if contract is expired
 */
legalContractSchema.methods.isExpired = function() {
    if (!this.expiryDate) return false;
    return new Date() > this.expiryDate;
};

/**
 * Check if all parties have signed
 */
legalContractSchema.methods.isFullySigned = function() {
    return this.parties.every(party =>
        party.signatureStatus === 'signed' || party.signatureStatus === 'not_required'
    );
};

/**
 * Add amendment
 */
legalContractSchema.methods.addAmendment = function(amendmentData, userId) {
    const amendmentNumber = `AMD-${this.amendments.length + 1}`;
    this.amendments.push({
        amendmentNumber,
        ...amendmentData,
        date: new Date()
    });
    this.version += 1;
    this.updatedBy = userId;
    return this.save();
};

/**
 * Create version snapshot
 */
legalContractSchema.methods.createVersion = function(userId, note) {
    this.previousVersions.push({
        version: this.version,
        content: this.content,
        changedBy: userId,
        changedAt: new Date(),
        changeNote: note
    });
    this.version += 1;
    return this.save();
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get expiring contracts
 */
legalContractSchema.statics.getExpiringContracts = async function(firmId, days = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return await this.find({
        firmId,
        status: 'active',
        expiryDate: { $lte: futureDate, $gte: new Date() }
    }).sort({ expiryDate: 1 });
};

/**
 * Get contracts by client
 */
legalContractSchema.statics.getByClient = async function(clientId) {
    return await this.find({
        'linkedRecords.clientId': clientId
    }).sort({ createdAt: -1 });
};

/**
 * Get contract statistics
 */
legalContractSchema.statics.getStatistics = async function(firmId) {
    return await this.aggregate([
        { $match: { firmId: new mongoose.Types.ObjectId(firmId) } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalValue: { $sum: '$financialTerms.totalValue' }
            }
        }
    ]);
};

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════
legalContractSchema.virtual('displayTitle').get(function() {
    return this.titleAr || this.title;
});

legalContractSchema.virtual('daysUntilExpiry').get(function() {
    if (!this.expiryDate) return null;
    const diff = this.expiryDate - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

legalContractSchema.virtual('partyCount').get(function() {
    return this.parties?.length || 0;
});

legalContractSchema.set('toJSON', { virtuals: true });
legalContractSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('LegalContract', legalContractSchema);
