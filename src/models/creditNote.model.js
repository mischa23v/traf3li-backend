/**
 * Credit Note Model
 *
 * Credit notes are issued to customers to reduce the amount they owe.
 * They can be for returns, discounts, or corrections.
 * Compliant with ZATCA Phase 2 e-invoicing requirements.
 */

const mongoose = require('mongoose');

const creditNoteItemSchema = new mongoose.Schema({
    description: { type: String, required: true, trim: true },
    descriptionAr: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 0.01 },
    unitPrice: { type: Number, required: true, min: 0 }, // In halalas
    discountAmount: { type: Number, default: 0 }, // In halalas
    taxRate: { type: Number, default: 15, min: 0, max: 100 },
    taxAmount: { type: Number, default: 0 }, // In halalas
    total: { type: Number, required: true }, // In halalas
    originalInvoiceItemId: { type: mongoose.Schema.Types.ObjectId }
}, { _id: true });

const creditNoteSchema = new mongoose.Schema({
    // Multi-tenancy
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // Credit Note Number (auto-generated)
    creditNoteNumber: {
        type: String,
        required: true,
        index: true
    },

    // Reference to Original Invoice
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        required: true,
        index: true
    },
    invoiceNumber: { type: String },

    // Client Information
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true,
        index: true
    },
    clientName: { type: String },
    clientNameAr: { type: String },
    clientVatNumber: { type: String },

    // Case Reference (optional)
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case'
    },

    // Credit Note Details
    creditNoteDate: { type: Date, default: Date.now, index: true },
    creditType: {
        type: String,
        enum: ['full', 'partial'],
        required: true
    },

    // Reason
    reasonCategory: {
        type: String,
        enum: [
            'error',           // Billing error
            'discount',        // Post-sale discount
            'return',          // Service cancellation/return
            'cancellation',    // Contract cancellation
            'adjustment',      // Price adjustment
            'duplicate',       // Duplicate invoice
            'other'
        ],
        required: true
    },
    reason: { type: String, trim: true },
    reasonAr: { type: String, trim: true },

    // Line Items
    items: {
        type: [creditNoteItemSchema],
        validate: {
            validator: function(items) {
                return items && items.length > 0;
            },
            message: 'Credit note must have at least one item'
        }
    },

    // Financial Amounts (all in halalas)
    subtotal: { type: Number, required: true },
    discountTotal: { type: Number, default: 0 },
    vatRate: { type: Number, default: 15 },
    vatAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },

    // Status
    status: {
        type: String,
        enum: ['draft', 'issued', 'applied', 'void'],
        default: 'draft',
        index: true
    },

    // ZATCA E-Invoicing
    zatcaSubmissionStatus: {
        type: String,
        enum: ['not_required', 'pending', 'submitted', 'accepted', 'rejected', 'warning'],
        default: 'pending'
    },
    zatcaInvoiceHash: { type: String },
    zatcaQrCode: { type: String },
    zatcaUuid: { type: String },
    zatcaSubmittedAt: { type: Date },
    zatcaResponse: { type: mongoose.Schema.Types.Mixed },
    zatcaWarnings: [{ type: String }],

    // GL Entry Reference
    glEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'GeneralLedger' },
    journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },

    // Audit Trail
    issuedAt: { type: Date },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    appliedAt: { type: Date },
    appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    appliedToInvoices: [{
        invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
        amount: { type: Number },
        appliedAt: { type: Date }
    }],
    voidedAt: { type: Date },
    voidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    voidReason: { type: String },

    // Additional Information
    notes: { type: String, trim: true },
    notesAr: { type: String, trim: true },
    internalNotes: { type: String, trim: true },
    attachments: [{
        name: { type: String },
        url: { type: String },
        uploadedAt: { type: Date, default: Date.now }
    }],

    // History/Audit Log
    history: [{
        action: { type: String, required: true },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        performedAt: { type: Date, default: Date.now },
        details: { type: mongoose.Schema.Types.Mixed },
        ipAddress: { type: String }
    }],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true,
    versionKey: false
});

// Indexes
creditNoteSchema.index({ firmId: 1, creditNoteNumber: 1 }, { unique: true });
creditNoteSchema.index({ firmId: 1, status: 1 });
creditNoteSchema.index({ firmId: 1, clientId: 1 });
creditNoteSchema.index({ firmId: 1, creditNoteDate: -1 });
creditNoteSchema.index({ lawyerId: 1, creditNoteNumber: 1 }, { unique: true, sparse: true });

/**
 * Generate credit note number
 */
creditNoteSchema.statics.generateNumber = async function(firmId, lawyerId) {
    const year = new Date().getFullYear();
    const query = {};
    if (firmId) {
        query.firmId = firmId;
    } else if (lawyerId) {
        query.lawyerId = lawyerId;
    }

    const lastCN = await this.findOne({
        ...query,
        creditNoteNumber: { $regex: `^CN-${year}-` }
    }).sort({ creditNoteNumber: -1 });

    let sequence = 1;
    if (lastCN) {
        const match = lastCN.creditNoteNumber.match(/CN-\d{4}-(\d+)/);
        if (match) {
            sequence = parseInt(match[1], 10) + 1;
        }
    }

    return `CN-${year}-${String(sequence).padStart(4, '0')}`;
};

/**
 * Calculate totals
 */
creditNoteSchema.methods.calculateTotals = function() {
    let subtotal = 0;
    let discountTotal = 0;
    let vatAmount = 0;

    this.items.forEach(item => {
        const lineTotal = item.quantity * item.unitPrice;
        const lineDiscount = item.discountAmount || 0;
        const taxableAmount = lineTotal - lineDiscount;
        const lineTax = Math.round((taxableAmount * (item.taxRate || this.vatRate)) / 100);

        item.taxAmount = lineTax;
        item.total = taxableAmount + lineTax;

        subtotal += lineTotal;
        discountTotal += lineDiscount;
        vatAmount += lineTax;
    });

    this.subtotal = subtotal;
    this.discountTotal = discountTotal;
    this.vatAmount = vatAmount;
    this.total = subtotal - discountTotal + vatAmount;

    return this;
};

/**
 * Issue credit note
 */
creditNoteSchema.methods.issue = async function(userId) {
    if (this.status !== 'draft') {
        throw new Error('Only draft credit notes can be issued');
    }

    this.status = 'issued';
    this.issuedAt = new Date();
    this.issuedBy = userId;
    this.history.push({
        action: 'issued',
        performedBy: userId,
        details: { total: this.total }
    });

    await this.save();
    return this;
};

/**
 * Apply credit note to invoice balance
 */
creditNoteSchema.methods.apply = async function(userId, session = null) {
    if (this.status !== 'issued') {
        throw new Error('Only issued credit notes can be applied');
    }

    const Invoice = mongoose.model('Invoice');
    const options = session ? { session } : {};

    // Update original invoice balance
    const invoice = await Invoice.findById(this.invoiceId);
    if (invoice) {
        invoice.creditNotesTotal = (invoice.creditNotesTotal || 0) + this.total;
        invoice.balanceDue = Math.max(0, (invoice.balanceDue || invoice.totalAmount) - this.total);

        if (invoice.balanceDue <= 0) {
            invoice.status = 'paid';
            invoice.paidAt = new Date();
        }
        await invoice.save(options);

        this.appliedToInvoices.push({
            invoiceId: invoice._id,
            amount: this.total,
            appliedAt: new Date()
        });
    }

    this.status = 'applied';
    this.appliedAt = new Date();
    this.appliedBy = userId;
    this.history.push({
        action: 'applied',
        performedBy: userId,
        details: { invoiceId: this.invoiceId, amount: this.total }
    });

    await this.save(options);
    return this;
};

/**
 * Void credit note
 */
creditNoteSchema.methods.void = async function(reason, userId) {
    if (this.status === 'applied') {
        throw new Error('Applied credit notes cannot be voided. Create a debit note instead.');
    }
    if (this.status === 'void') {
        throw new Error('Credit note is already voided');
    }

    this.status = 'void';
    this.voidedAt = new Date();
    this.voidedBy = userId;
    this.voidReason = reason;
    this.history.push({
        action: 'voided',
        performedBy: userId,
        details: { reason }
    });

    await this.save();
    return this;
};

module.exports = mongoose.model('CreditNote', creditNoteSchema);
