const mongoose = require('mongoose');

// Helper function to escape regex special characters
const escapeRegex = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Referral fee payment schema
const feePaymentSchema = new mongoose.Schema({
    amount: { type: Number },
    currency: { type: String, default: 'SAR' },
    paidAt: { type: Date, default: Date.now },
    method: {
        type: String,
        enum: ['cash', 'bank_transfer', 'check', 'other']
    },
    reference: String,
    notes: String,
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: true, timestamps: true });

const referralSchema = new mongoose.Schema({
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
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    referralId: {
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
    // REFERRER INFORMATION
    // ═══════════════════════════════════════════════════════════════
    referrerType: {
        type: String,
        enum: ['individual', 'organization', 'employee', 'client'],
        default: 'individual'
    },
    referrerName: {
        type: String,
        required: false,
        trim: true
    },
    referrerContactId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact'
    },
    referrerOrganizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization'
    },
    referrerEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    referrerPhone: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // REFERRED LEAD/CLIENT
    // ═══════════════════════════════════════════════════════════════
    referredLeadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead'
    },
    referredClientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
    },
    referredName: {
        type: String,
        required: false,
        trim: true
    },
    referredEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    referredPhone: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // REFERRAL DETAILS
    // ═══════════════════════════════════════════════════════════════
    referralDate: {
        type: Date,
        default: Date.now
    },
    source: {
        type: String,
        trim: true  // How referrer heard about us
    },

    // Legacy fields for backward compatibility
    type: {
        type: String,
        enum: [
            'client',       // عميل حالي
            'lawyer',       // محامي
            'law_firm',     // مكتب محاماة
            'contact',      // جهة اتصال
            'employee',     // موظف
            'partner',      // شريك
            'organization', // منظمة
            'individual',   // فرد
            'other'
        ]
    },
    // Source reference (polymorphic)
    sourceType: {
        type: String,
        enum: ['Client', 'Contact', 'Organization', 'User', 'External']
    },
    sourceId: {
        type: mongoose.Schema.Types.ObjectId
    },
    // For external referrers not in the system
    externalSource: {
        name: String,
        nameAr: String,
        email: String,
        phone: String,
        company: String,
        relationship: String
    },
    name: {
        type: String,
        trim: true
    },
    nameAr: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        maxlength: 2000
    },

    // ═══════════════════════════════════════════════════════════════
    // PRACTICE AREA & CASE INFO
    // ═══════════════════════════════════════════════════════════════
    practiceArea: {
        type: String,
        trim: true
    },
    caseType: {
        type: String,
        trim: true
    },
    estimatedValue: {
        type: Number,  // In halalas
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS & TRACKING
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: [
            'pending',      // معلق
            'contacted',    // تم التواصل
            'qualified',    // مؤهل
            'converted',    // تم التحويل
            'rejected',     // مرفوض
            'expired',      // منتهي الصلاحية
            'active',       // نشط (legacy)
            'inactive',     // غير نشط (legacy)
            'archived'      // مؤرشف (legacy)
        ],
        default: 'pending'
    },

    // Statistics
    totalReferrals: { type: Number, default: 0 },
    successfulReferrals: { type: Number, default: 0 }, // Converted to clients
    pendingReferrals: { type: Number, default: 0 },

    // ═══════════════════════════════════════════════════════════════
    // FINANCIAL
    // ═══════════════════════════════════════════════════════════════
    hasFeeAgreement: { type: Boolean, default: false },
    feeType: {
        type: String,
        enum: ['percentage', 'fixed', 'tiered', 'none'],
        default: 'none'
    },
    feePercentage: { type: Number, min: 0, max: 100 },
    feeFixedAmount: Number,
    feeCurrency: { type: String, default: 'SAR' },
    feeTiers: [{
        minValue: Number,
        maxValue: Number,
        percentage: Number,
        fixedAmount: Number
    }],
    feeNotes: String,

    // Totals (all in halalas)
    totalFeesOwed: { type: Number, default: 0 },
    totalFeesPaid: { type: Number, default: 0 },
    feePayments: [feePaymentSchema],

    // Commission Status
    commissionStatus: {
        type: String,
        enum: ['pending', 'approved', 'paid', 'void'],
        default: 'pending'
    },
    commissionAmount: { type: Number, default: 0 },  // Calculated amount (halalas)
    paidAmount: { type: Number, default: 0 },         // Amount already paid (halalas)
    paidDate: { type: Date },
    paymentMethod: { type: String, trim: true },
    paymentReference: { type: String, trim: true },

    // ═══════════════════════════════════════════════════════════════
    // AGREEMENT
    // ═══════════════════════════════════════════════════════════════
    hasAgreement: { type: Boolean, default: false },
    agreementDate: { type: Date },
    agreementExpiryDate: { type: Date },
    agreementDocument: { type: String, trim: true },  // File URL

    // ═══════════════════════════════════════════════════════════════
    // BANKING (for commission payment)
    // ═══════════════════════════════════════════════════════════════
    bankName: { type: String, trim: true },
    iban: { type: String, trim: true, maxlength: 24 },
    accountHolderName: { type: String, trim: true },

    // ═══════════════════════════════════════════════════════════════
    // ASSIGNMENT
    // ═══════════════════════════════════════════════════════════════
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'  // Staff ID handling this referral
    },
    followUpDate: { type: Date },

    // ═══════════════════════════════════════════════════════════════
    // REFERRED ENTITIES
    // ═══════════════════════════════════════════════════════════════
    referredLeads: [{
        leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
        referredAt: { type: Date, default: Date.now },
        status: {
            type: String,
            enum: ['pending', 'converted', 'lost']
        },
        convertedAt: Date,
        caseValue: Number,
        feeAmount: Number,
        feePaid: { type: Boolean, default: false }
    }],

    referredClients: [{
        clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
        leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
        referredAt: { type: Date, default: Date.now },
        totalCaseValue: { type: Number, default: 0 },
        totalFeesDue: { type: Number, default: 0 },
        totalFeesPaid: { type: Number, default: 0 }
    }],

    // ═══════════════════════════════════════════════════════════════
    // ENGAGEMENT
    // ═══════════════════════════════════════════════════════════════
    lastReferralDate: Date,
    lastContactDate: Date,
    nextFollowUpDate: Date,
    notes: { type: String, maxlength: 5000 },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    tags: [{ type: String, trim: true }],
    rating: { type: Number, min: 1, max: 5 },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'vip'],
        default: 'normal'
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
referralSchema.index({ lawyerId: 1, status: 1 });
referralSchema.index({ firmId: 1, status: 1 });
referralSchema.index({ lawyerId: 1, referrerType: 1 });
referralSchema.index({ lawyerId: 1, commissionStatus: 1 });
referralSchema.index({ lawyerId: 1, practiceArea: 1 });
referralSchema.index({ lawyerId: 1, type: 1 });
referralSchema.index({ lawyerId: 1, 'sourceType': 1, 'sourceId': 1 });
referralSchema.index({ referrerName: 'text', referredName: 'text', name: 'text', 'externalSource.name': 'text' });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════
referralSchema.virtual('conversionRate').get(function() {
    if (this.totalReferrals === 0) return 0;
    return ((this.successfulReferrals / this.totalReferrals) * 100).toFixed(2);
});

referralSchema.virtual('outstandingFees').get(function() {
    return this.totalFeesOwed - this.totalFeesPaid;
});

referralSchema.set('toJSON', { virtuals: true });
referralSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
referralSchema.pre('save', async function(next) {
    if (!this.referralId) {
        const year = new Date().getFullYear();
        const count = await this.constructor.countDocuments({
            lawyerId: this.lawyerId,
            createdAt: { $gte: new Date(year, 0, 1) }
        });
        this.referralId = `REF-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    // Update statistics
    this.totalReferrals = this.referredLeads?.length || 0;
    this.successfulReferrals = this.referredLeads?.filter(r => r.status === 'converted').length || 0;
    this.pendingReferrals = this.referredLeads?.filter(r => r.status === 'pending').length || 0;

    // Calculate total fees paid
    this.totalFeesPaid = this.feePayments?.reduce((sum, p) => sum + p.amount, 0) || 0;

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get referrals with filters
referralSchema.statics.getReferrals = async function(lawyerId, filters = {}) {
    const query = { lawyerId: new mongoose.Types.ObjectId(lawyerId) };

    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.hasFeeAgreement !== undefined) query.hasFeeAgreement = filters.hasFeeAgreement;

    if (filters.search) {
        query.$or = [
            { name: { $regex: escapeRegex(filters.search), $options: 'i' } },
            { nameAr: { $regex: escapeRegex(filters.search), $options: 'i' } },
            { 'externalSource.name': { $regex: escapeRegex(filters.search), $options: 'i' } }
        ];
    }

    return await this.find(query)
        .sort({ totalReferrals: -1, createdAt: -1 })
        .limit(filters.limit || 50)
        .skip(filters.skip || 0);
};

// Get top referrers
referralSchema.statics.getTopReferrers = async function(lawyerId, limit = 10) {
    return await this.find({
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        status: 'active',
        totalReferrals: { $gt: 0 }
    })
    .sort({ successfulReferrals: -1, totalReferrals: -1 })
    .limit(limit);
};

// Get referral statistics
referralSchema.statics.getStats = async function(lawyerId, dateRange = {}) {
    const matchQuery = { lawyerId: new mongoose.Types.ObjectId(lawyerId) };

    if (dateRange.start) matchQuery.createdAt = { $gte: new Date(dateRange.start) };
    if (dateRange.end) matchQuery.createdAt = { ...matchQuery.createdAt, $lte: new Date(dateRange.end) };

    const stats = await this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: null,
                totalReferrers: { $sum: 1 },
                activeReferrers: {
                    $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                },
                totalReferrals: { $sum: '$totalReferrals' },
                successfulReferrals: { $sum: '$successfulReferrals' },
                totalFeesOwed: { $sum: '$totalFeesOwed' },
                totalFeesPaid: { $sum: '$totalFeesPaid' }
            }
        }
    ]);

    // By type
    const byType = await this.aggregate([
        { $match: { ...matchQuery, status: 'active' } },
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 },
                referrals: { $sum: '$totalReferrals' },
                conversions: { $sum: '$successfulReferrals' }
            }
        },
        { $sort: { referrals: -1 } }
    ]);

    return {
        ...(stats[0] || {}),
        byType,
        outstandingFees: (stats[0]?.totalFeesOwed || 0) - (stats[0]?.totalFeesPaid || 0)
    };
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Add a referral
referralSchema.methods.addReferral = async function(leadId, caseValue = 0) {
    this.referredLeads.push({
        leadId,
        status: 'pending',
        caseValue
    });

    this.lastReferralDate = new Date();

    // Calculate fee if applicable
    if (this.hasFeeAgreement && caseValue > 0) {
        let feeAmount = 0;
        if (this.feeType === 'percentage') {
            feeAmount = (caseValue * this.feePercentage) / 100;
        } else if (this.feeType === 'fixed') {
            feeAmount = this.feeFixedAmount;
        } else if (this.feeType === 'tiered') {
            const tier = this.feeTiers.find(t =>
                caseValue >= (t.minValue || 0) && caseValue <= (t.maxValue || Infinity)
            );
            if (tier) {
                feeAmount = tier.percentage
                    ? (caseValue * tier.percentage) / 100
                    : tier.fixedAmount || 0;
            }
        }

        const referral = this.referredLeads[this.referredLeads.length - 1];
        referral.feeAmount = feeAmount;
        this.totalFeesOwed += feeAmount;
    }

    return await this.save();
};

// Mark referral as converted
referralSchema.methods.convertReferral = async function(leadId, clientId) {
    const referral = this.referredLeads.find(r => r.leadId.toString() === leadId.toString());
    if (!referral) throw new Error('Referral not found');

    referral.status = 'converted';
    referral.convertedAt = new Date();

    // Add to referred clients
    this.referredClients.push({
        clientId,
        leadId,
        totalCaseValue: referral.caseValue,
        totalFeesDue: referral.feeAmount
    });

    return await this.save();
};

// Record fee payment
referralSchema.methods.recordFeePayment = async function(paymentData, userId) {
    this.feePayments.push({
        ...paymentData,
        recordedBy: userId
    });

    // Update referral lead as paid if fully paid
    const totalPaid = this.feePayments.reduce((sum, p) => sum + p.amount, 0);

    return await this.save();
};

// Calculate fee for a case
referralSchema.methods.calculateFee = function(caseValue) {
    if (!this.hasFeeAgreement || this.feeType === 'none') return 0;

    if (this.feeType === 'percentage') {
        return (caseValue * this.feePercentage) / 100;
    } else if (this.feeType === 'fixed') {
        return this.feeFixedAmount;
    } else if (this.feeType === 'tiered') {
        const tier = this.feeTiers.find(t =>
            caseValue >= (t.minValue || 0) && caseValue <= (t.maxValue || Infinity)
        );
        if (tier) {
            return tier.percentage
                ? (caseValue * tier.percentage) / 100
                : tier.fixedAmount || 0;
        }
    }

    return 0;
};

module.exports = mongoose.model('Referral', referralSchema);
