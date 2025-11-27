const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
    itemName: { type: String, required: true },
    itemNameAr: { type: String },
    description: { type: String },
    descriptionAr: { type: String },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    price: { type: Number, required: true, min: 0 },
    // Backwards compatibility with old schema
    unitPrice: { type: Number },
    total: { type: Number, required: true },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
    // Numbering
    invoiceNumber: {
        type: String,
        required: true,
        unique: true
    },
    year: {
        type: Number,
        default: () => new Date().getFullYear()
    },

    // Relationships
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        required: false
    },
    contractId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Backwards compatibility
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Items
    items: [invoiceItemSchema],

    // Amounts
    subTotal: {
        type: Number,
        required: true
    },
    // Backwards compatibility
    subtotal: {
        type: Number
    },
    discount: {
        type: Number,
        default: 0
    },
    discountType: {
        type: String,
        enum: ['fixed', 'percentage'],
        default: 'fixed'
    },
    taxRate: {
        type: Number,
        default: 15 // VAT 15%
    },
    // Backwards compatibility
    vatRate: {
        type: Number
    },
    taxTotal: {
        type: Number,
        required: true
    },
    // Backwards compatibility
    vatAmount: {
        type: Number
    },
    total: {
        type: Number,
        required: true
    },
    credit: {
        type: Number,
        default: 0 // Store credit applied
    },

    // Currency
    currency: {
        type: String,
        default: 'SAR'
    },

    // Status
    status: {
        type: String,
        enum: ['draft', 'pending', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded', 'on_hold'],
        default: 'draft'
    },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'paid', 'partially'],
        default: 'unpaid'
    },

    // Amounts Paid
    paidAmount: {
        type: Number,
        default: 0
    },
    // Backwards compatibility
    amountPaid: {
        type: Number
    },
    remainingAmount: {
        type: Number
    },
    // Backwards compatibility
    balanceDue: {
        type: Number
    },

    // Dates
    date: {
        type: Date,
        default: Date.now
    },
    // Backwards compatibility
    issueDate: {
        type: Date
    },
    dueDate: {
        type: Date,
        required: true
    },
    sentDate: {
        type: Date
    },
    paidDate: {
        type: Date
    },

    // Flags
    isOverdue: {
        type: Boolean,
        default: false
    },
    approved: {
        type: Boolean,
        default: false
    },

    // Related
    quoteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quote'
    },

    // Content
    notes: {
        type: String
    },
    notesAr: {
        type: String
    },
    terms: {
        type: String
    },
    termsAr: {
        type: String
    },

    // Files
    attachments: [{
        type: String
    }],
    pdfFile: {
        type: String
    },
    // Backwards compatibility
    pdfUrl: {
        type: String
    },

    // Payment Integration
    paymentIntent: {
        type: String
    },

    // History
    history: [{
        action: {
            type: String,
            enum: ['created', 'updated', 'sent', 'viewed', 'paid', 'partially_paid', 'cancelled', 'reminded', 'refunded']
        },
        date: {
            type: Date,
            default: Date.now
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        note: String,
        metadata: {
            type: mongoose.Schema.Types.Mixed
        }
    }]
}, {
    versionKey: false,
    timestamps: true
});

// Pre-save hook for calculations
invoiceSchema.pre('save', function(next) {
    // Auto-calculate isOverdue
    if (this.dueDate && this.paymentStatus !== 'paid') {
        this.isOverdue = new Date() > new Date(this.dueDate);
        if (this.isOverdue && (this.status === 'sent' || this.status === 'pending')) {
            this.status = 'overdue';
        }
    }

    // Calculate remaining amount
    const paidAmt = this.paidAmount || this.amountPaid || 0;
    this.remainingAmount = this.total - paidAmt;
    this.balanceDue = this.remainingAmount; // Backwards compatibility

    // Sync backwards compatibility fields
    if (this.subTotal && !this.subtotal) {
        this.subtotal = this.subTotal;
    }
    if (this.taxRate && !this.vatRate) {
        this.vatRate = this.taxRate;
    }
    if (this.taxTotal && !this.vatAmount) {
        this.vatAmount = this.taxTotal;
    }
    if (this.paidAmount && !this.amountPaid) {
        this.amountPaid = this.paidAmount;
    }
    if (this.createdBy && !this.lawyerId) {
        this.lawyerId = this.createdBy;
    }
    if (this.date && !this.issueDate) {
        this.issueDate = this.date;
    }
    if (this.pdfFile && !this.pdfUrl) {
        this.pdfUrl = this.pdfFile;
    }

    next();
});

// Indexes
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ createdBy: 1, status: 1 });
invoiceSchema.index({ lawyerId: 1, status: 1 });
invoiceSchema.index({ clientId: 1, status: 1 });
invoiceSchema.index({ caseId: 1 });
invoiceSchema.index({ dueDate: 1, status: 1 });
invoiceSchema.index({ paymentStatus: 1 });
invoiceSchema.index({ year: 1 });

// Static method to generate invoice number
invoiceSchema.statics.generateInvoiceNumber = async function(prefix = 'INV-', includeYear = true) {
    const year = new Date().getFullYear();
    const yearStr = includeYear ? `${year}-` : '';

    // Find the latest invoice of this year
    const latestInvoice = await this.findOne(
        includeYear ? { year } : {},
        { invoiceNumber: 1 },
        { sort: { createdAt: -1 } }
    );

    let nextNumber = 1;
    if (latestInvoice && latestInvoice.invoiceNumber) {
        const match = latestInvoice.invoiceNumber.match(/(\d+)$/);
        if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
        }
    }

    return `${prefix}${yearStr}${String(nextNumber).padStart(4, '0')}`;
};

// Static method to get invoice summary
invoiceSchema.statics.getSummary = async function(userId, organizationId) {
    const filter = userId ? { createdBy: userId } : {};

    const result = await this.aggregate([
        { $match: filter },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                draft: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
                pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
                paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
                overdue: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
                partially_paid: { $sum: { $cond: [{ $eq: ['$status', 'partially_paid'] }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                totalAmount: { $sum: '$total' },
                paidAmount: { $sum: { $ifNull: ['$paidAmount', { $ifNull: ['$amountPaid', 0] }] } },
                overdueAmount: {
                    $sum: {
                        $cond: [
                            { $eq: ['$status', 'overdue'] },
                            { $subtract: ['$total', { $ifNull: ['$paidAmount', 0] }] },
                            0
                        ]
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                total: 1,
                draft: 1,
                pending: 1,
                sent: 1,
                paid: 1,
                overdue: 1,
                partially_paid: 1,
                cancelled: 1,
                totalAmount: 1,
                paidAmount: 1,
                unpaidAmount: { $subtract: ['$totalAmount', '$paidAmount'] },
                overdueAmount: 1
            }
        }
    ]);

    return result[0] || {
        total: 0,
        draft: 0,
        pending: 0,
        sent: 0,
        paid: 0,
        overdue: 0,
        partially_paid: 0,
        cancelled: 0,
        totalAmount: 0,
        paidAmount: 0,
        unpaidAmount: 0,
        overdueAmount: 0
    };
};

module.exports = mongoose.model('Invoice', invoiceSchema);
