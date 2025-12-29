/**
 * Billing Invoice Model
 *
 * Manages subscription billing invoices (different from client invoices).
 * Used for firm subscription management and payment processing with Stripe.
 */

const mongoose = require('mongoose');

const billingInvoiceSchema = new mongoose.Schema({
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
     },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    subscriptionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription'
    },

    invoiceNumber: {
        type: String,
        unique: true,
        sparse: true
    },

    // Amounts in cents
    subtotalCents: { type: Number, required: true },
    taxCents: { type: Number, default: 0 },
    discountCents: { type: Number, default: 0 },
    totalCents: { type: Number, required: true },

    currency: { type: String, default: 'USD' },

    status: {
        type: String,
        enum: ['draft', 'open', 'paid', 'void', 'uncollectible'],
        default: 'draft',
        index: true
    },

    // Dates
    invoiceDate: { type: Date, default: Date.now },
    dueDate: Date,
    paidAt: Date,

    // Period
    periodStart: Date,
    periodEnd: Date,

    // Line items
    lineItems: [{
        description: String,
        quantity: Number,
        unitAmountCents: Number,
        amountCents: Number
    }],

    // Stripe
    stripeInvoiceId: String,
    stripePaymentIntentId: String,

    // PDF
    pdfUrl: String,
    hostedInvoiceUrl: String,

    // Notes
    notes: String,

    // Attempt tracking
    attemptCount: { type: Number, default: 0 },
    lastAttemptAt: Date,
    lastError: String
}, {
    timestamps: true,
    versionKey: false
});

// ============ INDEXES ============
billingInvoiceSchema.index({ firmId: 1, status: 1, createdAt: -1 });
billingInvoiceSchema.index({ stripeInvoiceId: 1 });
billingInvoiceSchema.index({ invoiceDate: -1 });
billingInvoiceSchema.index({ dueDate: 1, status: 1 });
billingInvoiceSchema.index({ periodStart: 1, periodEnd: 1 });

// ============ PRE-SAVE HOOKS ============
billingInvoiceSchema.pre('save', async function(next) {
    if (!this.invoiceNumber) {
        const count = await this.constructor.countDocuments();
        this.invoiceNumber = `BILL-${Date.now()}-${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

// ============ STATIC METHODS ============

/**
 * Get billing invoices by firm with filtering and pagination
 * @param {ObjectId} firmId - Firm ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Invoices with pagination info
 */
billingInvoiceSchema.statics.getByFirm = async function(firmId, options = {}) {
    const {
        status,
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sort = '-createdAt',
        populate = false
    } = options;

    const query = { firmId };

    // Add status filter
    if (status) {
        if (Array.isArray(status)) {
            query.status = { $in: status };
        } else {
            query.status = status;
        }
    }

    // Add date range filter
    if (startDate || endDate) {
        query.invoiceDate = {};
        if (startDate) query.invoiceDate.$gte = new Date(startDate);
        if (endDate) query.invoiceDate.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const totalCount = await this.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // Build query
    let queryBuilder = this.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit);

    // Add populate if requested
    if (populate) {
        queryBuilder = queryBuilder
            .populate('firmId', 'name email')
            .populate('subscriptionId');
    }

    const invoices = await queryBuilder.lean();

    return {
        invoices,
        pagination: {
            page,
            limit,
            totalCount,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        }
    };
};

/**
 * Get invoice statistics for a firm
 * @param {ObjectId} firmId - Firm ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Statistics
 */
billingInvoiceSchema.statics.getStatsByFirm = async function(firmId, options = {}) {
    const { startDate, endDate } = options;

    const matchStage = { firmId: new mongoose.Types.ObjectId(firmId) };

    // Add date range filter
    if (startDate || endDate) {
        matchStage.invoiceDate = {};
        if (startDate) matchStage.invoiceDate.$gte = new Date(startDate);
        if (endDate) matchStage.invoiceDate.$lte = new Date(endDate);
    }

    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalInvoices: { $sum: 1 },
                totalAmountCents: { $sum: '$totalCents' },
                paidCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] }
                },
                paidAmountCents: {
                    $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$totalCents', 0] }
                },
                openCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] }
                },
                openAmountCents: {
                    $sum: { $cond: [{ $eq: ['$status', 'open'] }, '$totalCents', 0] }
                },
                voidCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'void'] }, 1, 0] }
                },
                uncollectibleCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'uncollectible'] }, 1, 0] }
                },
                uncollectibleAmountCents: {
                    $sum: { $cond: [{ $eq: ['$status', 'uncollectible'] }, '$totalCents', 0] }
                }
            }
        }
    ]);

    return stats[0] || {
        totalInvoices: 0,
        totalAmountCents: 0,
        paidCount: 0,
        paidAmountCents: 0,
        openCount: 0,
        openAmountCents: 0,
        voidCount: 0,
        uncollectibleCount: 0,
        uncollectibleAmountCents: 0
    };
};

/**
 * Get overdue invoices
 * @param {ObjectId} firmId - Optional firm ID filter
 * @returns {Promise<Array>} Overdue invoices
 */
billingInvoiceSchema.statics.getOverdueInvoices = async function(firmId = null) {
    const query = {
        status: 'open',
        dueDate: { $lt: new Date() }
    };

    if (firmId) {
        query.firmId = new mongoose.Types.ObjectId(firmId);
    }

    return this.find(query)
        .populate('firmId', 'name email')
        .sort({ dueDate: 1 })
        .lean();
};

/**
 * Get upcoming invoices (due within next N days)
 * @param {Number} days - Number of days to look ahead
 * @param {ObjectId} firmId - Optional firm ID filter
 * @returns {Promise<Array>} Upcoming invoices
 */
billingInvoiceSchema.statics.getUpcomingInvoices = async function(days = 7, firmId = null) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const query = {
        status: 'open',
        dueDate: { $gte: now, $lte: futureDate }
    };

    if (firmId) {
        query.firmId = new mongoose.Types.ObjectId(firmId);
    }

    return this.find(query)
        .populate('firmId', 'name email')
        .sort({ dueDate: 1 })
        .lean();
};

/**
 * Get invoice by Stripe invoice ID
 * @param {String} stripeInvoiceId - Stripe invoice ID
 * @returns {Promise<Object|null>} Invoice or null
 */
billingInvoiceSchema.statics.getByStripeInvoiceId = async function(stripeInvoiceId) {
    return this.findOne({ stripeInvoiceId }).lean();
};

/**
 * Get invoices for a billing period
 * @param {ObjectId} firmId - Firm ID
 * @param {Date} periodStart - Period start date
 * @param {Date} periodEnd - Period end date
 * @returns {Promise<Array>} Invoices in period
 */
billingInvoiceSchema.statics.getByPeriod = async function(firmId, periodStart, periodEnd) {
    return this.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        periodStart: { $gte: new Date(periodStart) },
        periodEnd: { $lte: new Date(periodEnd) }
    })
    .sort({ periodStart: -1 })
    .lean();
};

/**
 * Get total revenue for a firm
 * @param {ObjectId} firmId - Firm ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Revenue statistics
 */
billingInvoiceSchema.statics.getRevenue = async function(firmId, options = {}) {
    const { startDate, endDate, groupBy = 'month' } = options;

    const matchStage = {
        firmId: new mongoose.Types.ObjectId(firmId),
        status: 'paid'
    };

    if (startDate || endDate) {
        matchStage.paidAt = {};
        if (startDate) matchStage.paidAt.$gte = new Date(startDate);
        if (endDate) matchStage.paidAt.$lte = new Date(endDate);
    }

    let groupByFormat;
    switch (groupBy) {
        case 'day':
            groupByFormat = { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } };
            break;
        case 'week':
            groupByFormat = { $dateToString: { format: '%Y-W%V', date: '$paidAt' } };
            break;
        case 'year':
            groupByFormat = { $dateToString: { format: '%Y', date: '$paidAt' } };
            break;
        case 'month':
        default:
            groupByFormat = { $dateToString: { format: '%Y-%m', date: '$paidAt' } };
            break;
    }

    const revenue = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: groupByFormat,
                totalRevenueCents: { $sum: '$totalCents' },
                invoiceCount: { $sum: 1 },
                avgInvoiceCents: { $avg: '$totalCents' }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    const total = revenue.reduce((sum, item) => sum + item.totalRevenueCents, 0);

    return {
        revenue,
        totalRevenueCents: total,
        groupBy
    };
};

/**
 * Search invoices
 * @param {Object} filters - Search filters
 * @returns {Promise<Array>} Matching invoices
 */
billingInvoiceSchema.statics.search = async function(filters = {}) {
    const {
        firmId,
        invoiceNumber,
        status,
        minAmount,
        maxAmount,
        startDate,
        endDate,
        limit = 50
    } = filters;

    const query = {};

    if (firmId) query.firmId = new mongoose.Types.ObjectId(firmId);
    if (invoiceNumber) query.invoiceNumber = new RegExp(invoiceNumber, 'i');
    if (status) query.status = status;

    if (minAmount || maxAmount) {
        query.totalCents = {};
        if (minAmount) query.totalCents.$gte = minAmount;
        if (maxAmount) query.totalCents.$lte = maxAmount;
    }

    if (startDate || endDate) {
        query.invoiceDate = {};
        if (startDate) query.invoiceDate.$gte = new Date(startDate);
        if (endDate) query.invoiceDate.$lte = new Date(endDate);
    }

    return this.find(query)
        .populate('firmId', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

/**
 * Get failed payment attempts
 * @param {ObjectId} firmId - Optional firm ID filter
 * @param {Number} minAttempts - Minimum attempt count
 * @returns {Promise<Array>} Invoices with failed attempts
 */
billingInvoiceSchema.statics.getFailedPaymentAttempts = async function(firmId = null, minAttempts = 1) {
    const query = {
        status: 'open',
        attemptCount: { $gte: minAttempts },
        lastError: { $exists: true }
    };

    if (firmId) {
        query.firmId = new mongoose.Types.ObjectId(firmId);
    }

    return this.find(query)
        .populate('firmId', 'name email')
        .sort({ lastAttemptAt: -1 })
        .lean();
};

// ============ INSTANCE METHODS ============

/**
 * Mark invoice as paid
 * @param {Date} paidAt - Payment date
 * @returns {Promise<Object>} Updated invoice
 */
billingInvoiceSchema.methods.markAsPaid = async function(paidAt = new Date()) {
    if (this.status === 'paid') {
        throw new Error('Invoice is already paid');
    }

    if (this.status === 'void') {
        throw new Error('Cannot mark void invoice as paid');
    }

    this.status = 'paid';
    this.paidAt = paidAt;
    this.lastError = null; // Clear any errors

    await this.save();
    return this;
};

/**
 * Void the invoice
 * @param {String} reason - Reason for voiding
 * @returns {Promise<Object>} Updated invoice
 */
billingInvoiceSchema.methods.voidInvoice = async function(reason = null) {
    if (this.status === 'paid') {
        throw new Error('Cannot void a paid invoice. Issue a refund instead.');
    }

    if (this.status === 'void') {
        throw new Error('Invoice is already void');
    }

    this.status = 'void';
    if (reason) {
        this.notes = this.notes ? `${this.notes}\nVoid reason: ${reason}` : `Void reason: ${reason}`;
    }

    await this.save();
    return this;
};

/**
 * Mark invoice as uncollectible
 * @param {String} reason - Reason for marking uncollectible
 * @returns {Promise<Object>} Updated invoice
 */
billingInvoiceSchema.methods.markAsUncollectible = async function(reason = null) {
    if (this.status === 'paid') {
        throw new Error('Cannot mark paid invoice as uncollectible');
    }

    if (this.status === 'void') {
        throw new Error('Cannot mark void invoice as uncollectible');
    }

    this.status = 'uncollectible';
    if (reason) {
        this.notes = this.notes ? `${this.notes}\nUncollectible reason: ${reason}` : `Uncollectible reason: ${reason}`;
    }

    await this.save();
    return this;
};

/**
 * Record a payment attempt
 * @param {Boolean} success - Whether attempt was successful
 * @param {String} error - Error message if failed
 * @returns {Promise<Object>} Updated invoice
 */
billingInvoiceSchema.methods.recordPaymentAttempt = async function(success, error = null) {
    this.attemptCount = (this.attemptCount || 0) + 1;
    this.lastAttemptAt = new Date();

    if (!success && error) {
        this.lastError = error;
    } else if (success) {
        this.lastError = null;
    }

    await this.save();
    return this;
};

/**
 * Update Stripe information
 * @param {Object} stripeData - Stripe invoice data
 * @returns {Promise<Object>} Updated invoice
 */
billingInvoiceSchema.methods.updateStripeInfo = async function(stripeData) {
    const {
        stripeInvoiceId,
        stripePaymentIntentId,
        pdfUrl,
        hostedInvoiceUrl,
        status
    } = stripeData;

    if (stripeInvoiceId) this.stripeInvoiceId = stripeInvoiceId;
    if (stripePaymentIntentId) this.stripePaymentIntentId = stripePaymentIntentId;
    if (pdfUrl) this.pdfUrl = pdfUrl;
    if (hostedInvoiceUrl) this.hostedInvoiceUrl = hostedInvoiceUrl;

    // Map Stripe status to our status
    if (status) {
        const statusMap = {
            'draft': 'draft',
            'open': 'open',
            'paid': 'paid',
            'void': 'void',
            'uncollectible': 'uncollectible'
        };
        this.status = statusMap[status] || this.status;
    }

    await this.save();
    return this;
};

/**
 * Get invoice age in days
 * @returns {Number} Age in days
 */
billingInvoiceSchema.methods.getAge = function() {
    const now = new Date();
    const created = this.invoiceDate || this.createdAt;
    const diffTime = Math.abs(now - created);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Check if invoice is overdue
 * @returns {Boolean}
 */
billingInvoiceSchema.methods.isOverdue = function() {
    if (!this.dueDate || this.status !== 'open') {
        return false;
    }
    return new Date() > this.dueDate;
};

/**
 * Get days overdue
 * @returns {Number} Days overdue (0 if not overdue)
 */
billingInvoiceSchema.methods.getDaysOverdue = function() {
    if (!this.isOverdue()) {
        return 0;
    }
    const now = new Date();
    const diffTime = now - this.dueDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Calculate total from line items
 * @returns {Object} Calculated amounts
 */
billingInvoiceSchema.methods.calculateTotal = function() {
    let subtotal = 0;

    if (this.lineItems && this.lineItems.length > 0) {
        subtotal = this.lineItems.reduce((sum, item) => {
            return sum + (item.amountCents || 0);
        }, 0);
    }

    const total = subtotal - (this.discountCents || 0) + (this.taxCents || 0);

    return {
        subtotalCents: subtotal,
        discountCents: this.discountCents || 0,
        taxCents: this.taxCents || 0,
        totalCents: total
    };
};

/**
 * Get formatted amounts in dollars
 * @returns {Object} Formatted amounts
 */
billingInvoiceSchema.methods.getFormattedAmounts = function() {
    return {
        subtotal: (this.subtotalCents / 100).toFixed(2),
        discount: (this.discountCents / 100).toFixed(2),
        tax: (this.taxCents / 100).toFixed(2),
        total: (this.totalCents / 100).toFixed(2),
        currency: this.currency
    };
};

/**
 * Get invoice summary
 * @returns {Object} Invoice summary
 */
billingInvoiceSchema.methods.getSummary = function() {
    return {
        id: this._id,
        invoiceNumber: this.invoiceNumber,
        status: this.status,
        amounts: this.getFormattedAmounts(),
        dates: {
            invoiceDate: this.invoiceDate,
            dueDate: this.dueDate,
            paidAt: this.paidAt,
            period: {
                start: this.periodStart,
                end: this.periodEnd
            }
        },
        isOverdue: this.isOverdue(),
        daysOverdue: this.getDaysOverdue(),
        age: this.getAge(),
        attemptCount: this.attemptCount,
        lastError: this.lastError
    };
};

module.exports = mongoose.model('BillingInvoice', billingInvoiceSchema);
