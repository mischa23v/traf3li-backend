/**
 * Down Payment Model - Enterprise Gold Standard
 *
 * Manages advance payments/deposits with:
 * - Percentage or fixed amount calculation
 * - Invoice generation for down payment
 * - Application to final invoices
 * - Refund tracking
 * - VAT handling
 *
 * Multi-tenant: firmId for firms, lawyerId for solo lawyers
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ═══════════════════════════════════════════════════════════════════════════════
// APPLICATION RECORD SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const ApplicationSchema = new Schema({
    applicationId: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
    invoiceNumber: { type: String, maxlength: 50 },
    invoiceDate: Date,
    invoiceTotal: { type: Number, min: 0 },
    appliedAmount: { type: Number, required: true, min: 0 },
    appliedDate: { type: Date, default: Date.now },
    appliedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    appliedByName: { type: String, maxlength: 200 },
    notes: { type: String, maxlength: 500 }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// REFUND RECORD SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const RefundRecordSchema = new Schema({
    refundId: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    refundAmount: { type: Number, required: true, min: 0 },
    refundDate: { type: Date, default: Date.now },
    refundReason: { type: String, maxlength: 500 },
    refundMethod: {
        type: String,
        enum: ['bank_transfer', 'cheque', 'cash', 'credit_note', 'original_method'],
        default: 'original_method'
    },
    refundReference: { type: String, maxlength: 100 },
    creditNoteId: { type: Schema.Types.ObjectId, ref: 'CreditNote' },
    creditNoteNumber: { type: String, maxlength: 50 },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    processedByName: { type: String, maxlength: 200 },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    notes: { type: String, maxlength: 1000 }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT RECORD SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const PaymentRecordSchema = new Schema({
    paymentId: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    paymentAmount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, default: Date.now },
    paymentMethod: {
        type: String,
        enum: ['cash', 'bank_transfer', 'credit_card', 'cheque', 'mada', 'apple_pay', 'stc_pay', 'other'],
        required: true
    },
    paymentReference: { type: String, maxlength: 200 },
    bankAccountId: { type: Schema.Types.ObjectId, ref: 'BankAccount' },
    bankName: { type: String, maxlength: 100 },
    chequeNumber: { type: String, maxlength: 50 },
    chequeDate: Date,
    transactionId: { type: String, maxlength: 100 },
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    receivedByName: { type: String, maxlength: 200 },
    notes: { type: String, maxlength: 500 }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORY ENTRY SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const HistoryEntrySchema = new Schema({
    action: { type: String, required: true, maxlength: 100 },
    timestamp: { type: Date, default: Date.now },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    performedByName: { type: String, maxlength: 200 },
    details: { type: String, maxlength: 2000 },
    oldValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DOWN PAYMENT SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const downPaymentSchema = new Schema({
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
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    downPaymentNumber: {
        type: String,
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // SOURCE DOCUMENT
    // ═══════════════════════════════════════════════════════════════
    sourceType: {
        type: String,
        enum: ['quote', 'sales_order', 'manual'],
        required: true
    },
    sourceId: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'sourceType'
    },
    sourceNumber: { type: String, maxlength: 50 },
    sourceDate: Date,
    sourceTotalAmount: { type: Number, min: 0 },

    // ═══════════════════════════════════════════════════════════════
    // CUSTOMER
    // ═══════════════════════════════════════════════════════════════
    customerId: {
        type: Schema.Types.ObjectId,
        ref: 'Client',
        required: true,
        index: true
    },
    customerName: { type: String, maxlength: 300 },
    customerNameAr: { type: String, maxlength: 300 },
    customerEmail: { type: String, maxlength: 200 },
    customerPhone: { type: String, maxlength: 50 },
    customerVatNumber: { type: String, maxlength: 50 },

    // ═══════════════════════════════════════════════════════════════
    // DOWN PAYMENT CALCULATION
    // ═══════════════════════════════════════════════════════════════
    calculationType: {
        type: String,
        enum: ['percentage', 'fixed_amount'],
        required: true
    },
    percentageValue: {
        type: Number,
        min: 0,
        max: 100
    },
    fixedAmountValue: {
        type: Number,
        min: 0
    },

    // Calculated/Final Amount
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'SAR',
        maxlength: 3
    },

    // ═══════════════════════════════════════════════════════════════
    // VAT HANDLING
    // ═══════════════════════════════════════════════════════════════
    vatRate: {
        type: Number,
        default: 15,
        min: 0,
        max: 100
    },
    vatAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    amountExcludingVat: {
        type: Number,
        min: 0
    },
    amountIncludingVat: {
        type: Number,
        min: 0
    },
    vatIncluded: {
        type: Boolean,
        default: true
    },

    // ═══════════════════════════════════════════════════════════════
    // DOWN PAYMENT INVOICE
    // ═══════════════════════════════════════════════════════════════
    invoiceId: {
        type: Schema.Types.ObjectId,
        ref: 'Invoice',
        index: true
    },
    invoiceNumber: { type: String, maxlength: 50 },
    invoiceDate: Date,
    invoiceStatus: {
        type: String,
        enum: ['not_generated', 'draft', 'sent', 'paid', 'cancelled'],
        default: 'not_generated'
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS TRACKING
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: [
            'draft',
            'pending',
            'partially_paid',
            'paid',
            'partially_applied',
            'fully_applied',
            'partially_refunded',
            'refunded',
            'cancelled'
        ],
        default: 'draft',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // PAYMENT TRACKING
    // ═══════════════════════════════════════════════════════════════
    payments: [PaymentRecordSchema],
    paidAmount: { type: Number, default: 0, min: 0 },
    paidDate: Date,
    paymentDueDate: Date,

    // ═══════════════════════════════════════════════════════════════
    // APPLICATION TO INVOICES
    // ═══════════════════════════════════════════════════════════════
    applications: [ApplicationSchema],
    appliedAmount: { type: Number, default: 0, min: 0 },

    // ═══════════════════════════════════════════════════════════════
    // REFUNDS
    // ═══════════════════════════════════════════════════════════════
    refunds: [RefundRecordSchema],
    refundedAmount: { type: Number, default: 0, min: 0 },
    refundInvoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },

    // ═══════════════════════════════════════════════════════════════
    // DATES
    // ═══════════════════════════════════════════════════════════════
    requestedDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    expiryDate: Date, // After which down payment request expires

    // ═══════════════════════════════════════════════════════════════
    // TERMS
    // ═══════════════════════════════════════════════════════════════
    termsAndConditions: { type: String, maxlength: 5000 },
    termsAndConditionsAr: { type: String, maxlength: 5000 },
    refundPolicy: { type: String, maxlength: 2000 },
    refundPolicyAr: { type: String, maxlength: 2000 },

    // ═══════════════════════════════════════════════════════════════
    // NOTES
    // ═══════════════════════════════════════════════════════════════
    notes: { type: String, maxlength: 2000 },
    notesAr: { type: String, maxlength: 2000 },
    internalNotes: { type: String, maxlength: 2000 },

    // ═══════════════════════════════════════════════════════════════
    // CANCELLATION
    // ═══════════════════════════════════════════════════════════════
    cancellationReason: { type: String, maxlength: 1000 },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: Date,

    // ═══════════════════════════════════════════════════════════════
    // HISTORY & AUDIT
    // ═══════════════════════════════════════════════════════════════
    history: [HistoryEntrySchema],

    // ═══════════════════════════════════════════════════════════════
    // DOCUMENTS
    // ═══════════════════════════════════════════════════════════════
    pdfUrl: { type: String, maxlength: 500 },
    receiptUrl: { type: String, maxlength: 500 },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════════════════════
downPaymentSchema.index({ firmId: 1, downPaymentNumber: 1 }, { unique: true });
downPaymentSchema.index({ firmId: 1, status: 1 });
downPaymentSchema.index({ firmId: 1, customerId: 1 });
downPaymentSchema.index({ firmId: 1, sourceId: 1 });
downPaymentSchema.index({ firmId: 1, dueDate: 1 });
downPaymentSchema.index({ lawyerId: 1, status: 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════════════════════
downPaymentSchema.virtual('remainingAmount').get(function() {
    return Math.max(0, this.paidAmount - this.appliedAmount - this.refundedAmount);
});

downPaymentSchema.virtual('balanceToPay').get(function() {
    return Math.max(0, this.amount - this.paidAmount);
});

downPaymentSchema.virtual('isFullyPaid').get(function() {
    return this.paidAmount >= this.amount;
});

downPaymentSchema.virtual('isFullyApplied').get(function() {
    return this.appliedAmount >= this.paidAmount;
});

downPaymentSchema.virtual('isOverdue').get(function() {
    if (!this.dueDate) return false;
    return !['paid', 'fully_applied', 'refunded', 'cancelled'].includes(this.status) &&
           new Date() > this.dueDate;
});

downPaymentSchema.virtual('isExpired').get(function() {
    if (!this.expiryDate) return false;
    return this.status === 'pending' && new Date() > this.expiryDate;
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════════════════════
downPaymentSchema.pre('save', async function(next) {
    try {
        // Generate down payment number if new
        if (this.isNew && !this.downPaymentNumber) {
            const Counter = require('./counter.model');
            const year = new Date().getFullYear();
            const counterId = `downpayment_${this.firmId}_${year}`;
            const seq = await Counter.getNextSequence(counterId);
            this.downPaymentNumber = `DP-${year}-${String(seq).padStart(5, '0')}`;
        }

        // Calculate VAT amounts
        if (this.vatIncluded) {
            this.amountIncludingVat = this.amount;
            this.amountExcludingVat = this.amount / (1 + this.vatRate / 100);
            this.vatAmount = this.amount - this.amountExcludingVat;
        } else {
            this.amountExcludingVat = this.amount;
            this.vatAmount = this.amount * (this.vatRate / 100);
            this.amountIncludingVat = this.amount + this.vatAmount;
        }

        // Round amounts
        this.amountExcludingVat = Math.round(this.amountExcludingVat * 100) / 100;
        this.vatAmount = Math.round(this.vatAmount * 100) / 100;
        this.amountIncludingVat = Math.round(this.amountIncludingVat * 100) / 100;

        // Update totals from records
        this.paidAmount = this.payments.reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
        this.appliedAmount = this.applications.reduce((sum, a) => sum + (a.appliedAmount || 0), 0);
        this.refundedAmount = this.refunds.reduce((sum, r) => sum + (r.refundAmount || 0), 0);

        // Update status based on amounts
        this.updateStatus();

        next();
    } catch (error) {
        next(error);
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Update status based on current state
 */
downPaymentSchema.methods.updateStatus = function() {
    if (this.status === 'cancelled') return;

    if (this.refundedAmount > 0 && this.refundedAmount >= this.paidAmount) {
        this.status = 'refunded';
    } else if (this.refundedAmount > 0) {
        this.status = 'partially_refunded';
    } else if (this.appliedAmount > 0 && this.appliedAmount >= this.paidAmount) {
        this.status = 'fully_applied';
    } else if (this.appliedAmount > 0) {
        this.status = 'partially_applied';
    } else if (this.paidAmount >= this.amount) {
        this.status = 'paid';
    } else if (this.paidAmount > 0) {
        this.status = 'partially_paid';
    } else if (this.status === 'draft') {
        // Keep as draft
    } else {
        this.status = 'pending';
    }
};

/**
 * Add history entry
 */
downPaymentSchema.methods.addHistory = function(action, userId, userName, details, oldValue = null, newValue = null) {
    this.history.push({
        action,
        performedBy: userId,
        performedByName: userName,
        details,
        oldValue,
        newValue,
        timestamp: new Date()
    });
};

/**
 * Record a payment
 */
downPaymentSchema.methods.recordPayment = async function(payment, userId, userName) {
    if (this.paidAmount >= this.amount) {
        throw new Error('Down payment is already fully paid');
    }

    const remainingBalance = this.amount - this.paidAmount;
    if (payment.amount > remainingBalance) {
        throw new Error(`Payment amount exceeds remaining balance of ${remainingBalance}`);
    }

    this.payments.push({
        paymentAmount: payment.amount,
        paymentDate: payment.date || new Date(),
        paymentMethod: payment.method,
        paymentReference: payment.reference,
        bankAccountId: payment.bankAccountId,
        bankName: payment.bankName,
        chequeNumber: payment.chequeNumber,
        chequeDate: payment.chequeDate,
        transactionId: payment.transactionId,
        receivedBy: userId,
        receivedByName: userName,
        notes: payment.notes
    });

    if (!this.paidDate && this.paidAmount + payment.amount >= this.amount) {
        this.paidDate = new Date();
    }

    this.addHistory('payment_received', userId, userName,
        `Payment of ${payment.amount} ${this.currency} received via ${payment.method}`);

    return this.save();
};

/**
 * Apply to invoice
 */
downPaymentSchema.methods.applyToInvoice = async function(invoice, amount, userId, userName) {
    const availableAmount = this.remainingAmount;
    if (amount > availableAmount) {
        throw new Error(`Cannot apply more than available amount: ${availableAmount}`);
    }

    this.applications.push({
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        invoiceTotal: invoice.grandTotal,
        appliedAmount: amount,
        appliedBy: userId,
        appliedByName: userName
    });

    this.addHistory('applied_to_invoice', userId, userName,
        `Applied ${amount} ${this.currency} to invoice ${invoice.invoiceNumber}`);

    return this.save();
};

/**
 * Process refund
 */
downPaymentSchema.methods.processRefund = async function(refund, userId, userName, approvedBy = null) {
    const availableForRefund = this.paidAmount - this.appliedAmount - this.refundedAmount;
    if (refund.amount > availableForRefund) {
        throw new Error(`Cannot refund more than available amount: ${availableForRefund}`);
    }

    this.refunds.push({
        refundAmount: refund.amount,
        refundDate: refund.date || new Date(),
        refundReason: refund.reason,
        refundMethod: refund.method || 'original_method',
        refundReference: refund.reference,
        creditNoteId: refund.creditNoteId,
        creditNoteNumber: refund.creditNoteNumber,
        processedBy: userId,
        processedByName: userName,
        approvedBy: approvedBy,
        approvedAt: approvedBy ? new Date() : null,
        notes: refund.notes
    });

    this.addHistory('refund_processed', userId, userName,
        `Refund of ${refund.amount} ${this.currency} processed: ${refund.reason}`);

    return this.save();
};

/**
 * Cancel down payment
 */
downPaymentSchema.methods.cancel = async function(userId, userName, reason) {
    if (['paid', 'fully_applied'].includes(this.status)) {
        throw new Error('Cannot cancel paid or applied down payment');
    }

    this.status = 'cancelled';
    this.cancelledAt = new Date();
    this.cancelledBy = userId;
    this.cancellationReason = reason;

    this.addHistory('cancelled', userId, userName, `Cancelled: ${reason}`);

    return this.save();
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get down payments with filters
 */
downPaymentSchema.statics.getDownPayments = async function(firmQuery, filters = {}) {
    const query = { ...firmQuery };

    if (filters.status) {
        query.status = Array.isArray(filters.status) ? { $in: filters.status } : filters.status;
    }

    if (filters.customerId) {
        query.customerId = new mongoose.Types.ObjectId(filters.customerId);
    }

    if (filters.sourceId) {
        query.sourceId = new mongoose.Types.ObjectId(filters.sourceId);
    }

    const page = parseInt(filters.page) || 1;
    const limit = Math.min(parseInt(filters.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const [downPayments, total] = await Promise.all([
        this.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('customerId', 'firstName lastName companyName')
            .populate('createdBy', 'firstName lastName')
            .lean(),
        this.countDocuments(query)
    ]);

    return {
        downPayments,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
};

/**
 * Get available down payments for a customer (for applying to invoices)
 */
downPaymentSchema.statics.getAvailableForCustomer = async function(firmQuery, customerId) {
    return this.find({
        ...firmQuery,
        customerId: new mongoose.Types.ObjectId(customerId),
        status: { $in: ['paid', 'partially_applied'] }
    })
    .select('downPaymentNumber amount paidAmount appliedAmount refundedAmount currency sourceNumber')
    .sort({ createdAt: 1 })
    .lean()
    .then(dps => dps.filter(dp => {
        const available = dp.paidAmount - dp.appliedAmount - dp.refundedAmount;
        return available > 0;
    }).map(dp => ({
        ...dp,
        availableAmount: dp.paidAmount - dp.appliedAmount - dp.refundedAmount
    })));
};

module.exports = mongoose.model('DownPayment', downPaymentSchema);
