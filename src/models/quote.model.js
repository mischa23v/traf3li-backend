/**
 * Quote/Quotation Model
 * Security: Multi-tenant isolation with firmId
 *
 * Complete quotation system for legal CRM with line items, signatures, and PDF support
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ============ LINE ITEM SCHEMA ============
const QuoteItemSchema = new Schema({
    itemId: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product'
    },
    description: {
        type: String,
        required: true,
        maxlength: 1000
    },
    descriptionAr: {
        type: String,
        maxlength: 1000
    },
    quantity: {
        type: Number,
        required: true,
        default: 1,
        min: 0
    },
    unit: {
        type: String,
        enum: ['hour', 'day', 'session', 'case', 'month', 'year', 'unit', 'other'],
        default: 'unit'
    },
    unitPrice: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    discount: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    discountAmount: {
        type: Number,
        min: 0,
        default: 0
    },
    taxRate: {
        type: Number,
        min: 0,
        max: 100,
        default: 15
    },
    taxAmount: {
        type: Number,
        min: 0,
        default: 0
    },
    subtotal: {
        type: Number,
        min: 0,
        default: 0
    },
    total: {
        type: Number,
        min: 0,
        default: 0
    },
    sortOrder: {
        type: Number,
        default: 0
    },
    isOptional: {
        type: Boolean,
        default: false
    },
    notes: {
        type: String,
        maxlength: 500
    }
}, { _id: false });

// ============ CUSTOMER INFO SCHEMA ============
const CustomerInfoSchema = new Schema({
    name: {
        type: String,
        maxlength: 200
    },
    email: {
        type: String,
        maxlength: 200
    },
    phone: {
        type: String,
        maxlength: 50
    },
    company: {
        type: String,
        maxlength: 200
    },
    address: {
        street: String,
        city: String,
        postalCode: String,
        country: { type: String, default: 'Saudi Arabia' }
    }
}, { _id: false });

// ============ PAYMENT TERMS SCHEMA ============
const PaymentTermsSchema = new Schema({
    type: {
        type: String,
        enum: ['immediate', 'net_15', 'net_30', 'net_60', 'custom'],
        default: 'net_30'
    },
    customDays: {
        type: Number,
        min: 0
    },
    depositRequired: {
        type: Boolean,
        default: false
    },
    depositPercent: {
        type: Number,
        min: 0,
        max: 100
    },
    depositAmount: {
        type: Number,
        min: 0
    },
    notes: {
        type: String,
        maxlength: 1000
    }
}, { _id: false });

// ============ SIGNATURE SCHEMA ============
const SignatureSchema = new Schema({
    signedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    signedByName: String,
    signedByEmail: String,
    signedAt: Date,
    signature: String,
    ipAddress: String
}, { _id: false });

// ============ VIEW HISTORY SCHEMA ============
const ViewHistorySchema = new Schema({
    viewedAt: {
        type: Date,
        default: Date.now
    },
    ipAddress: String,
    userAgent: String,
    duration: {
        type: Number,
        default: 0
    }
}, { _id: true });

// ============ TOTALS SCHEMA ============
const TotalsSchema = new Schema({
    subtotal: {
        type: Number,
        default: 0,
        min: 0
    },
    discountTotal: {
        type: Number,
        default: 0,
        min: 0
    },
    taxableAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    taxTotal: {
        type: Number,
        default: 0,
        min: 0
    },
    grandTotal: {
        type: Number,
        default: 0,
        min: 0
    }
}, { _id: false });

// ============ MAIN QUOTE SCHEMA ============
const quoteSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANCY (REQUIRED)
    // ═══════════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════════
    // AUTO-GENERATED ID
    // ═══════════════════════════════════════════════════════════════
    quoteId: {
        type: String,
        unique: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // ENTITY REFERENCES
    // ═══════════════════════════════════════════════════════════════
    leadId: {
        type: Schema.Types.ObjectId,
        ref: 'Lead',
        index: true
    },
    clientId: {
        type: Schema.Types.ObjectId,
        ref: 'Client',
        index: true
    },
    contactId: {
        type: Schema.Types.ObjectId,
        ref: 'Contact',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // BASIC INFORMATION
    // ═══════════════════════════════════════════════════════════════
    title: {
        type: String,
        required: true,
        maxlength: 300,
        trim: true
    },
    titleAr: {
        type: String,
        maxlength: 300,
        trim: true
    },
    description: {
        type: String,
        maxlength: 5000
    },
    descriptionAr: {
        type: String,
        maxlength: 5000
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS & DATES
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'revised'],
        default: 'draft',
        index: true
    },
    quoteDate: {
        type: Date,
        default: Date.now
    },
    validUntil: {
        type: Date,
        index: true
    },
    sentAt: Date,
    viewedAt: Date,
    respondedAt: Date,

    // ═══════════════════════════════════════════════════════════════
    // CUSTOMER INFORMATION
    // ═══════════════════════════════════════════════════════════════
    customerInfo: CustomerInfoSchema,

    // ═══════════════════════════════════════════════════════════════
    // LINE ITEMS
    // ═══════════════════════════════════════════════════════════════
    items: [QuoteItemSchema],

    // ═══════════════════════════════════════════════════════════════
    // TOTALS
    // ═══════════════════════════════════════════════════════════════
    totals: TotalsSchema,

    // ═══════════════════════════════════════════════════════════════
    // CURRENCY & PAYMENT
    // ═══════════════════════════════════════════════════════════════
    currency: {
        type: String,
        default: 'SAR',
        maxlength: 3
    },
    paymentTerms: PaymentTermsSchema,

    // ═══════════════════════════════════════════════════════════════
    // TERMS & CONDITIONS
    // ═══════════════════════════════════════════════════════════════
    termsAndConditions: {
        type: String,
        maxlength: 10000
    },
    termsAndConditionsAr: {
        type: String,
        maxlength: 10000
    },

    // ═══════════════════════════════════════════════════════════════
    // SIGNATURES
    // ═══════════════════════════════════════════════════════════════
    signatures: {
        firmSignature: SignatureSchema,
        clientSignature: SignatureSchema
    },

    // ═══════════════════════════════════════════════════════════════
    // VIEW TRACKING
    // ═══════════════════════════════════════════════════════════════
    viewHistory: [ViewHistorySchema],

    // ═══════════════════════════════════════════════════════════════
    // PDF GENERATION
    // ═══════════════════════════════════════════════════════════════
    pdfUrl: String,
    pdfGeneratedAt: Date,

    // ═══════════════════════════════════════════════════════════════
    // NOTES
    // ═══════════════════════════════════════════════════════════════
    internalNotes: {
        type: String,
        maxlength: 5000,
        select: false
    },
    clientNotes: {
        type: String,
        maxlength: 5000
    },

    // ═══════════════════════════════════════════════════════════════
    // LOST TRACKING
    // ═══════════════════════════════════════════════════════════════
    lostReasonId: {
        type: Schema.Types.ObjectId,
        ref: 'LostReason'
    },
    lostNotes: {
        type: String,
        maxlength: 2000
    },

    // ═══════════════════════════════════════════════════════════════
    // ASSIGNMENT
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedTo: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },

    // ═══════════════════════════════════════════════════════════════
    // VERSIONING
    // ═══════════════════════════════════════════════════════════════
    revisionNumber: {
        type: Number,
        default: 1,
        min: 1
    },
    previousVersionId: {
        type: Schema.Types.ObjectId,
        ref: 'Quote'
    },

    // ═══════════════════════════════════════════════════════════════
    // TAGS
    // ═══════════════════════════════════════════════════════════════
    tags: [{
        type: String,
        trim: true,
        maxlength: 50
    }],

    // ═══════════════════════════════════════════════════════════════
    // PIPELINE & STAGE TRACKING (Odoo/Salesforce pattern)
    // ═══════════════════════════════════════════════════════════════
    pipelineStage: {
        type: String,
        enum: ['qualification', 'needs_analysis', 'proposal', 'negotiation', 'closed_won', 'closed_lost'],
        default: 'proposal'
    },
    probability: {
        type: Number,
        min: 0,
        max: 100,
        default: 50
    },
    expectedCloseDate: Date,
    stageTracking: {
        dateOpened: Date,
        dateLastStageUpdate: Date,
        stageHistory: [{
            stage: { type: String },
            date: { type: Date, default: Date.now },
            changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
            notes: { type: String }
        }]
    },

    // ═══════════════════════════════════════════════════════════════
    // COMPETITOR ANALYSIS (Salesforce pattern)
    // ═══════════════════════════════════════════════════════════════
    competitors: [{
        competitorName: { type: String, trim: true },
        competitorQuoteAmount: { type: Number },
        competitorStrengths: { type: String, maxlength: 1000 },
        competitorWeaknesses: { type: String, maxlength: 1000 },
        isPrimaryCompetitor: { type: Boolean, default: false }
    }],

    // ═══════════════════════════════════════════════════════════════
    // APPROVAL WORKFLOW
    // ═══════════════════════════════════════════════════════════════
    approval: {
        requiresApproval: { type: Boolean, default: false },
        approvalStatus: {
            type: String,
            enum: ['not_required', 'pending', 'approved', 'rejected'],
            default: 'not_required'
        },
        approvalReason: { type: String, maxlength: 1000 },
        approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        approvedAt: Date,
        rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        rejectedAt: Date,
        rejectionReason: { type: String, maxlength: 1000 }
    },

    // ═══════════════════════════════════════════════════════════════
    // MARGIN & PROFITABILITY (iDempiere pattern)
    // ═══════════════════════════════════════════════════════════════
    financials: {
        totalCost: { type: Number, default: 0 },
        grossMargin: { type: Number, default: 0 },
        grossMarginPercent: { type: Number, default: 0 },
        netMargin: { type: Number, default: 0 },
        netMarginPercent: { type: Number, default: 0 },
        profitability: {
            type: String,
            enum: ['low', 'medium', 'high', 'premium']
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // MARKETING SOURCE
    // ═══════════════════════════════════════════════════════════════
    campaignId: {
        type: Schema.Types.ObjectId,
        ref: 'Campaign'
    },
    leadSource: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // CONVERSION TRACKING
    // ═══════════════════════════════════════════════════════════════
    conversion: {
        convertedToOrder: { type: Boolean, default: false },
        orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
        convertedAt: Date,
        convertedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        conversionNotes: { type: String, maxlength: 1000 }
    },

    // ═══════════════════════════════════════════════════════════════
    // INTEGRATION
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
        type: Schema.Types.ObjectId,
        ref: 'Territory',
        index: true
    },
    salesTeamId: {
        type: Schema.Types.ObjectId,
        ref: 'SalesTeam',
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
        lastContactBy: { type: Schema.Types.ObjectId, ref: 'User' }
    }
}, {
    timestamps: true,
    versionKey: false,
    toJSON: {
        virtuals: true,
        transform: (doc, ret) => {
            delete ret.__v;
            delete ret.internalNotes;
            return ret;
        }
    },
    toObject: { virtuals: true }
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
quoteSchema.index({ firmId: 1, status: 1, createdAt: -1 });
quoteSchema.index({ firmId: 1, lawyerId: 1, status: 1 });
quoteSchema.index({ firmId: 1, leadId: 1 });
quoteSchema.index({ firmId: 1, clientId: 1 });
quoteSchema.index({ firmId: 1, contactId: 1 });
quoteSchema.index({ firmId: 1, validUntil: 1 });
quoteSchema.index({ quoteId: 1 });
quoteSchema.index({ 'customerInfo.email': 1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════
quoteSchema.virtual('isExpired').get(function() {
    if (!this.validUntil) return false;
    return this.status !== 'accepted' &&
           this.status !== 'rejected' &&
           new Date() > this.validUntil;
});

quoteSchema.virtual('daysUntilExpiry').get(function() {
    if (!this.validUntil) return null;
    const diff = this.validUntil - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOK
// ═══════════════════════════════════════════════════════════════
quoteSchema.pre('save', async function(next) {
    // Generate quote ID if new (Format: QT-YYYY-#####)
    if (!this.quoteId && this.isNew) {
        const Counter = require('./counter.model');
        const year = new Date().getFullYear();
        const counterId = `quote_${this.firmId}_${year}`;
        const seq = await Counter.getNextSequence(counterId);
        this.quoteId = `QT-${year}-${String(seq).padStart(5, '0')}`;
    }

    // Calculate totals
    this.calculateTotals();

    // Auto-expire if past validUntil date
    if (this.isExpired && this.status === 'sent') {
        this.status = 'expired';
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate quote totals from line items
 */
quoteSchema.methods.calculateTotals = function() {
    if (!this.items || this.items.length === 0) {
        this.totals = {
            subtotal: 0,
            discountTotal: 0,
            taxableAmount: 0,
            taxTotal: 0,
            grandTotal: 0
        };
        return;
    }

    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    // Calculate each item's totals
    this.items.forEach(item => {
        const itemSubtotal = (item.quantity || 0) * (item.unitPrice || 0);
        const itemDiscount = item.discount > 0
            ? (itemSubtotal * item.discount / 100)
            : 0;
        const itemTaxable = itemSubtotal - itemDiscount;
        const itemTax = (itemTaxable * (item.taxRate || 0) / 100);

        item.subtotal = Math.round(itemSubtotal);
        item.discountAmount = Math.round(itemDiscount);
        item.taxAmount = Math.round(itemTax);
        item.total = Math.round(itemTaxable + itemTax);

        subtotal += item.subtotal;
        discountTotal += item.discountAmount;
        taxTotal += item.taxAmount;
    });

    const taxableAmount = subtotal - discountTotal;

    this.totals = {
        subtotal: Math.round(subtotal),
        discountTotal: Math.round(discountTotal),
        taxableAmount: Math.round(taxableAmount),
        taxTotal: Math.round(taxTotal),
        grandTotal: Math.round(taxableAmount + taxTotal)
    };
};

/**
 * Record a view event
 */
quoteSchema.methods.recordView = function(ipAddress, userAgent) {
    this.viewHistory.push({
        viewedAt: new Date(),
        ipAddress,
        userAgent,
        duration: 0
    });

    if (!this.viewedAt) {
        this.viewedAt = new Date();
        if (this.status === 'sent') {
            this.status = 'viewed';
        }
    }

    return this.save();
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get quotes with filters
 * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
 * @param {object} filters - Filter options
 * @returns {Promise<Object>} - Quotes with pagination
 */
quoteSchema.statics.getQuotes = async function(firmId, filters = {}) {
    if (!firmId) throw new Error('firmId is required');

    const query = { firmId: new mongoose.Types.ObjectId(firmId) };

    // Filter by status
    if (filters.status) {
        const validStatuses = ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'revised'];
        if (validStatuses.includes(filters.status)) {
            query.status = filters.status;
        }
    }

    // Filter by entity references
    if (filters.leadId) {
        query.leadId = new mongoose.Types.ObjectId(filters.leadId);
    }
    if (filters.clientId) {
        query.clientId = new mongoose.Types.ObjectId(filters.clientId);
    }
    if (filters.contactId) {
        query.contactId = new mongoose.Types.ObjectId(filters.contactId);
    }
    if (filters.assignedTo) {
        query.assignedTo = new mongoose.Types.ObjectId(filters.assignedTo);
    }

    // Search filter with escaped regex
    if (filters.search) {
        const searchRegex = new RegExp(escapeRegex(filters.search), 'i');
        query.$or = [
            { quoteId: searchRegex },
            { title: searchRegex },
            { titleAr: searchRegex },
            { 'customerInfo.name': searchRegex },
            { 'customerInfo.email': searchRegex },
            { 'customerInfo.company': searchRegex }
        ];
    }

    // Date range filters
    if (filters.dateFrom) {
        query.quoteDate = { ...query.quoteDate, $gte: new Date(filters.dateFrom) };
    }
    if (filters.dateTo) {
        query.quoteDate = { ...query.quoteDate, $lte: new Date(filters.dateTo) };
    }

    // Expiring soon filter
    if (filters.expiringSoon) {
        const daysAhead = parseInt(filters.expiringSoon) || 7;
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);
        query.validUntil = { $lte: futureDate, $gte: new Date() };
        query.status = { $in: ['sent', 'viewed'] };
    }

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = Math.min(parseInt(filters.limit) || 20, 100);
    const skip = (page - 1) * limit;

    // Sort
    const sortField = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortOrder };

    const [quotes, total] = await Promise.all([
        this.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate('leadId', 'firstName lastName companyName email')
            .populate('clientId', 'firstName lastName companyName email')
            .populate('contactId', 'firstName lastName email')
            .populate('assignedTo', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName')
            .populate('lostReasonId', 'reason reasonAr category')
            .lean(),
        this.countDocuments(query)
    ]);

    return {
        quotes,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
    };
};

module.exports = mongoose.model('Quote', quoteSchema);
