const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    // ─────────────────────────────────────────────────────────
    // FIRM (Multi-Tenancy)
    // ─────────────────────────────────────────────────────────
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
    },

    // ─────────────────────────────────────────────────────────
    // BASIC INFO
    // ─────────────────────────────────────────────────────────
    clientNumber: {
        type: String,
        unique: true,
        index: true
    },
    clientType: {
        type: String,
        enum: ['individual', 'company'],
        required: true,
        default: 'individual'
    },

    // ─────────────────────────────────────────────────────────
    // INDIVIDUAL FIELDS
    // ─────────────────────────────────────────────────────────
    nationalId: {
        type: String,
        index: true,
        trim: true
    },
    firstName: { type: String, trim: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    fullNameArabic: { type: String, trim: true },
    fullNameEnglish: { type: String, trim: true },
    gender: { type: String, enum: ['male', 'female', null] },
    nationality: { type: String, trim: true },
    dateOfBirth: Date,
    dateOfBirthHijri: String,
    idStatus: String,
    idIssueDate: Date,
    idExpiryDate: Date,

    // ─────────────────────────────────────────────────────────
    // COMPANY FIELDS (from Wathq API)
    // ─────────────────────────────────────────────────────────
    crNumber: {
        type: String,
        index: true,
        trim: true
    },
    companyName: { type: String, trim: true },
    companyNameEnglish: { type: String, trim: true },
    unifiedNumber: String,
    crStatus: String,
    entityDuration: Number,
    capital: Number,
    companyPhone: String,
    crIssueDate: Date,
    crExpiryDate: Date,
    mainActivity: String,
    website: String,
    ecommerceLink: String,
    companyCity: String,
    companyAddress: String,
    owners: [{
        name: String,
        nationalId: String,
        nationality: String,
        share: Number
    }],
    managers: [{
        name: String,
        nationalId: String,
        position: String
    }],
    wathqVerified: { type: Boolean, default: false },
    wathqVerifiedAt: Date,

    // Legal Representative (for companies)
    legalRepresentative: {
        name: String,
        nationalId: String,
        position: String,
        phone: String,
        email: String
    },

    // ─────────────────────────────────────────────────────────
    // CONTACT INFO
    // ─────────────────────────────────────────────────────────
    phone: {
        type: String,
        required: true,
        trim: true
    },
    alternatePhone: String,
    whatsapp: String,
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    secondaryEmail: String,
    preferredContact: {
        type: String,
        enum: ['phone', 'email', 'whatsapp', 'sms'],
        default: 'phone'
    },
    preferredTime: {
        type: String,
        enum: ['morning', 'noon', 'evening', 'anytime'],
        default: 'anytime'
    },
    preferredLanguage: {
        type: String,
        enum: ['ar', 'en'],
        default: 'ar'
    },

    // ─────────────────────────────────────────────────────────
    // ADDRESS (Saudi National Address format)
    // ─────────────────────────────────────────────────────────
    address: {
        city: String,
        district: String,
        street: String,
        buildingNumber: String,
        postalCode: String,
        additionalNumber: String,
        unitNumber: String,
        fullAddress: String,
        country: { type: String, default: 'Saudi Arabia' }
    },
    mailingAddress: {
        isDifferent: { type: Boolean, default: false },
        city: String,
        fullAddress: String
    },

    // ─────────────────────────────────────────────────────────
    // POWER OF ATTORNEY (from MOJ API)
    // ─────────────────────────────────────────────────────────
    powerOfAttorney: {
        hasPOA: { type: Boolean, default: false },
        attorneyId: String,
        attorneyName: String,
        attorneyType: String,
        attorneyGender: String,
        attorneyStatus: String,
        attorneyResidence: String,
        attorneyWorkplace: String,
        source: { type: String, enum: ['notary', 'embassy', 'court', 'other', null] },
        poaNumber: String,
        notaryNumber: String,
        issueDate: Date,
        expiryDate: Date,
        attorneyPhone: String,
        attorneyEmail: String,
        powers: [String],
        limitations: String,
        mojVerified: { type: Boolean, default: false },
        mojVerifiedAt: Date
    },

    // ─────────────────────────────────────────────────────────
    // CASE ASSIGNMENT (Firm Mode)
    // ─────────────────────────────────────────────────────────
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    assignments: {
        responsibleLawyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        assistantLawyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        paralegalId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        researcherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        departmentId: String,
        officeId: String
    },
    clientSource: {
        type: String,
        enum: ['website', 'referral', 'returning', 'ads', 'social', 'walkin', 'platform', 'external', 'cold_call', 'event'],
        default: 'external'
    },
    referredBy: String,
    referralCommission: Number,

    // Platform user link
    platformUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // ─────────────────────────────────────────────────────────
    // BILLING INFO (Linked to Finance)
    // ─────────────────────────────────────────────────────────
    billing: {
        type: {
            type: String,
            enum: ['hourly', 'flat_fee', 'contingency', 'retainer'],
            default: 'hourly'
        },
        hourlyRate: Number,
        currency: { type: String, default: 'SAR' },
        paymentTerms: {
            type: String,
            enum: ['immediate', 'net_15', 'net_30', 'net_45', 'net_60'],
            default: 'net_30'
        },
        creditLimit: Number,
        creditBalance: { type: Number, default: 0 },
        creditHold: { type: Boolean, default: false },
        discount: {
            hasDiscount: { type: Boolean, default: false },
            percent: Number,
            reason: String
        },
        invoiceDelivery: { type: String, enum: ['email', 'mail', 'hand'], default: 'email' },
        invoiceLanguage: { type: String, enum: ['ar', 'en', 'both'], default: 'ar' }
    },
    vatRegistration: {
        isRegistered: { type: Boolean, default: false },
        vatNumber: String
    },

    // ─────────────────────────────────────────────────────────
    // EMPLOYMENT (Individual)
    // ─────────────────────────────────────────────────────────
    employment: {
        profession: String,
        employer: String,
        workPhone: String,
        workAddress: String,
        monthlyIncome: Number,
        eligibleForLegalAid: { type: Boolean, default: false }
    },

    // ─────────────────────────────────────────────────────────
    // EMERGENCY CONTACT
    // ─────────────────────────────────────────────────────────
    emergencyContact: {
        name: String,
        relation: String,
        phone: String,
        altPhone: String,
        email: String,
        address: String
    },

    // ─────────────────────────────────────────────────────────
    // COMMUNICATION PREFERENCES
    // ─────────────────────────────────────────────────────────
    notifications: {
        allowEmail: { type: Boolean, default: true },
        allowSms: { type: Boolean, default: true },
        allowWhatsapp: { type: Boolean, default: true },
        allowPhone: { type: Boolean, default: true },
        caseUpdates: { type: Boolean, default: true },
        hearings: { type: Boolean, default: true },
        invoices: { type: Boolean, default: true },
        payments: { type: Boolean, default: true },
        newsletter: { type: Boolean, default: false }
    },

    // ─────────────────────────────────────────────────────────
    // CONFLICT CHECK (Firm Mode)
    // ─────────────────────────────────────────────────────────
    conflictCheck: {
        checked: { type: Boolean, default: false },
        checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        checkDate: Date,
        hasConflict: { type: Boolean, default: false },
        details: String,
        resolution: String,
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },

    // ─────────────────────────────────────────────────────────
    // STATUS & FLAGS
    // ─────────────────────────────────────────────────────────
    flags: {
        isVip: { type: Boolean, default: false },
        isHighRisk: { type: Boolean, default: false },
        needsApproval: { type: Boolean, default: false },
        isBlacklisted: { type: Boolean, default: false },
        blacklistReason: String
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'archived', 'pending'],
        default: 'active'
    },

    // ─────────────────────────────────────────────────────────
    // NOTES & TAGS
    // ─────────────────────────────────────────────────────────
    generalNotes: String,
    internalNotes: String,
    tags: [{ type: String, trim: true }],

    // ─────────────────────────────────────────────────────────
    // CRM FIELDS
    // ─────────────────────────────────────────────────────────
    convertedFromLead: { type: Boolean, default: false },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    convertedAt: Date,
    referralId: { type: mongoose.Schema.Types.ObjectId, ref: 'Referral' },
    referralName: String,

    // Organization & Contact Relationships
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

    lifetimeValue: { type: Number, default: 0 },
    clientRating: { type: Number, min: 1, max: 5 },
    clientTier: {
        type: String,
        enum: ['standard', 'premium', 'vip'],
        default: 'standard'
    },

    // Activity tracking
    lastContactedAt: Date,
    lastActivityAt: Date,
    nextFollowUpDate: Date,
    nextFollowUpNote: String,
    activityCount: { type: Number, default: 0 },
    callCount: { type: Number, default: 0 },
    emailCount: { type: Number, default: 0 },
    meetingCount: { type: Number, default: 0 },

    // User's preferred timezone for date/time display
    timezone: { type: String, default: 'Asia/Riyadh' },

    // ─────────────────────────────────────────────────────────
    // STATISTICS
    // ─────────────────────────────────────────────────────────
    totalCases: { type: Number, default: 0 },
    activeCases: { type: Number, default: 0 },
    totalInvoices: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    totalOutstanding: { type: Number, default: 0 },
    lastInteraction: Date,

    // ─────────────────────────────────────────────────────────
    // ATTACHMENTS
    // ─────────────────────────────────────────────────────────
    attachments: [{
        fileName: String,
        fileUrl: String,
        fileType: String,
        fileSize: Number,
        category: {
            type: String,
            enum: ['id', 'cr', 'poa', 'contract', 'other'],
            default: 'other'
        },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now }
    }],

    // ─────────────────────────────────────────────────────────
    // METADATA
    // ─────────────────────────────────────────────────────────
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true,
    versionKey: false
});

// ─────────────────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────────────────
clientSchema.index({ nationalId: 1 });
clientSchema.index({ crNumber: 1 });
clientSchema.index({ email: 1 });
clientSchema.index({ phone: 1 });
clientSchema.index({ lawyerId: 1, status: 1 });
clientSchema.index({ lawyerId: 1, clientTier: 1 });
clientSchema.index({ lawyerId: 1, clientSource: 1 });
clientSchema.index({ lawyerId: 1, nextFollowUpDate: 1 });
clientSchema.index({ lawyerId: 1, organizationId: 1 });
clientSchema.index({ lawyerId: 1, contactId: 1 });
clientSchema.index({ 'assignments.responsibleLawyerId': 1 });
clientSchema.index({ status: 1 });
clientSchema.index({ tags: 1 });
clientSchema.index({ fullNameArabic: 'text', companyName: 'text', email: 'text' });

// ─────────────────────────────────────────────────────────
// GENERATE CLIENT NUMBER
// ─────────────────────────────────────────────────────────
clientSchema.pre('save', async function(next) {
    if (this.isNew && !this.clientNumber) {
        const count = await this.constructor.countDocuments() + 1;
        this.clientNumber = `CLT-${String(count).padStart(5, '0')}`;
    }
    next();
});

// ─────────────────────────────────────────────────────────
// VIRTUAL: DISPLAY NAME
// ─────────────────────────────────────────────────────────
clientSchema.virtual('displayName').get(function() {
    if (this.clientType === 'individual') {
        return this.fullNameArabic || `${this.firstName || ''} ${this.lastName || ''}`.trim();
    }
    return this.companyName;
});

clientSchema.virtual('displayNameEn').get(function() {
    if (this.clientType === 'individual') {
        return this.fullNameEnglish;
    }
    return this.companyNameEnglish;
});

// Enable virtuals in JSON
clientSchema.set('toJSON', { virtuals: true });
clientSchema.set('toObject', { virtuals: true });

// ─────────────────────────────────────────────────────────
// MIDDLEWARE HOOKS
// ─────────────────────────────────────────────────────────

/**
 * Cascade delete documents when client is deleted (single delete)
 */
clientSchema.post('findOneAndDelete', async function(doc) {
    if (doc) {
        try {
            const Document = mongoose.model('Document');
            const { deleteObject, BUCKETS } = require('../configs/s3');

            // Find all documents associated with this client
            const documents = await Document.find({ clientId: doc._id });

            // Delete files from S3
            for (const document of documents) {
                try {
                    await deleteObject(BUCKETS.general, document.fileKey);
                } catch (err) {
                    console.error(`S3 delete error for document ${document._id}:`, err);
                }
            }

            // Delete document records from database
            await Document.deleteMany({ clientId: doc._id });

            console.log(`Deleted ${documents.length} documents for client ${doc._id}`);
        } catch (error) {
            console.error('Error cleaning up documents for deleted client:', error);
        }
    }
});

/**
 * Cascade delete documents when clients are bulk deleted
 */
clientSchema.pre('deleteMany', async function() {
    try {
        const Document = mongoose.model('Document');
        const { deleteObject, BUCKETS } = require('../configs/s3');

        // Get the filter conditions used in deleteMany
        const filter = this.getFilter();

        // Find clients that will be deleted
        const clients = await this.model.find(filter);
        const clientIds = clients.map(client => client._id);

        if (clientIds.length > 0) {
            // Find all documents associated with these clients
            const documents = await Document.find({ clientId: { $in: clientIds } });

            // Delete files from S3
            for (const document of documents) {
                try {
                    await deleteObject(BUCKETS.general, document.fileKey);
                } catch (err) {
                    console.error(`S3 delete error for document ${document._id}:`, err);
                }
            }

            // Delete document records from database
            await Document.deleteMany({ clientId: { $in: clientIds } });

            console.log(`Deleted ${documents.length} documents for ${clientIds.length} clients`);
        }
    } catch (error) {
        console.error('Error cleaning up documents for bulk deleted clients:', error);
    }
});

// ─────────────────────────────────────────────────────────
// STATIC METHODS
// ─────────────────────────────────────────────────────────

/**
 * Search clients by term
 */
clientSchema.statics.searchClients = async function(lawyerId, searchTerm, filters = {}) {
    const query = {
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        status: { $ne: 'archived' }
    };

    if (searchTerm) {
        query.$or = [
            { fullNameArabic: { $regex: searchTerm, $options: 'i' } },
            { companyName: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } },
            { phone: { $regex: searchTerm, $options: 'i' } },
            { clientNumber: { $regex: searchTerm, $options: 'i' } },
            { nationalId: { $regex: searchTerm, $options: 'i' } },
            { crNumber: { $regex: searchTerm, $options: 'i' } }
        ];
    }

    if (filters.clientType) query.clientType = filters.clientType;
    if (filters.status) query.status = filters.status;

    return await this.find(query)
        .sort({ lastInteraction: -1, createdAt: -1 })
        .limit(filters.limit || 50);
};

/**
 * Run conflict check against existing clients
 */
clientSchema.statics.runConflictCheck = async function(lawyerId, clientData) {
    const conflicts = [];

    // Check by national ID
    if (clientData.nationalId) {
        const existing = await this.findOne({
            lawyerId,
            nationalId: clientData.nationalId,
            _id: { $ne: clientData._id }
        });
        if (existing) {
            conflicts.push({
                type: 'nationalId',
                message: 'عميل موجود بنفس رقم الهوية',
                existingClient: existing._id
            });
        }
    }

    // Check by CR number
    if (clientData.crNumber) {
        const existing = await this.findOne({
            lawyerId,
            crNumber: clientData.crNumber,
            _id: { $ne: clientData._id }
        });
        if (existing) {
            conflicts.push({
                type: 'crNumber',
                message: 'شركة موجودة بنفس رقم السجل التجاري',
                existingClient: existing._id
            });
        }
    }

    // Check by email
    if (clientData.email) {
        const existing = await this.findOne({
            lawyerId,
            email: clientData.email,
            _id: { $ne: clientData._id }
        });
        if (existing) {
            conflicts.push({
                type: 'email',
                message: 'عميل موجود بنفس البريد الإلكتروني',
                existingClient: existing._id
            });
        }
    }

    // Check by phone
    if (clientData.phone) {
        const existing = await this.findOne({
            lawyerId,
            phone: clientData.phone,
            _id: { $ne: clientData._id }
        });
        if (existing) {
            conflicts.push({
                type: 'phone',
                message: 'عميل موجود بنفس رقم الهاتف',
                existingClient: existing._id
            });
        }
    }

    return conflicts;
};

// ─────────────────────────────────────────────────────────
// ENCRYPTION PLUGIN
// ─────────────────────────────────────────────────────────
const encryptionPlugin = require('./plugins/encryption.plugin');

// Apply encryption to sensitive fields
clientSchema.plugin(encryptionPlugin, {
    fields: [
        'nationalId',  // National ID for individuals
    ],
    searchableFields: [
        'nationalId',  // Allow searching by encrypted national ID
    ]
});

// ─────────────────────────────────────────────────────────
// INSTANCE METHODS
// ─────────────────────────────────────────────────────────

/**
 * Update client balance based on invoices and payments
 * Calculates: Total Invoiced - Total Payments Received = Balance Due
 */
clientSchema.methods.updateBalance = async function() {
    const Invoice = mongoose.model('Invoice');
    const Payment = mongoose.model('Payment');

    // Calculate total invoiced amount (excluding void, cancelled, and draft invoices)
    const invoiceResult = await Invoice.aggregate([
        {
            $match: {
                clientId: this._id,
                status: { $nin: ['void', 'cancelled', 'draft'] }
            }
        },
        {
            $group: {
                _id: null,
                totalInvoiced: { $sum: '$totalAmount' },
                totalPaid: { $sum: '$amountPaid' }
            }
        }
    ]);

    // Calculate total payments received (completed payments only)
    const paymentResult = await Payment.aggregate([
        {
            $match: {
                $or: [
                    { clientId: this._id },
                    { customerId: this._id }
                ],
                status: { $in: ['completed', 'reconciled'] },
                paymentType: 'customer_payment',
                isRefund: { $ne: true }
            }
        },
        {
            $group: {
                _id: null,
                totalPayments: { $sum: '$amount' }
            }
        }
    ]);

    // Calculate refunds (reduce from payments)
    const refundResult = await Payment.aggregate([
        {
            $match: {
                $or: [
                    { clientId: this._id },
                    { customerId: this._id }
                ],
                status: { $in: ['completed', 'reconciled'] },
                isRefund: true
            }
        },
        {
            $group: {
                _id: null,
                totalRefunds: { $sum: '$amount' }
            }
        }
    ]);

    const totalInvoiced = invoiceResult[0]?.totalInvoiced || 0;
    const totalPayments = paymentResult[0]?.totalPayments || 0;
    const totalRefunds = refundResult[0]?.totalRefunds || 0;

    // Calculate balance: Total Invoiced - (Total Payments - Total Refunds)
    const balance = totalInvoiced - (totalPayments - totalRefunds);

    // Update client's billing balance
    if (!this.billing) {
        this.billing = {};
    }
    this.billing.creditBalance = balance;

    // Update statistics
    this.totalPaid = totalPayments - totalRefunds;
    this.totalOutstanding = balance;

    await this.save();

    return {
        totalInvoiced,
        totalPayments,
        totalRefunds,
        balance
    };
};

module.exports = mongoose.model('Client', clientSchema);
