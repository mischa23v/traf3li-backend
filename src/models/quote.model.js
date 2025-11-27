const mongoose = require('mongoose');

const quoteItemSchema = new mongoose.Schema({
    itemName: { type: String, required: true },
    itemNameAr: { type: String },
    description: { type: String },
    descriptionAr: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 }
}, { _id: false });

const quoteSchema = new mongoose.Schema({
    // Numbering
    quoteNumber: {
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
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Items
    items: [quoteItemSchema],

    // Amounts
    subTotal: {
        type: Number,
        required: true
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
    taxTotal: {
        type: Number,
        required: true
    },
    total: {
        type: Number,
        required: true
    },

    // Currency
    currency: {
        type: String,
        default: 'SAR'
    },

    // Status
    status: {
        type: String,
        enum: ['draft', 'pending', 'sent', 'accepted', 'declined', 'cancelled', 'on_hold', 'expired'],
        default: 'draft'
    },

    // Dates
    date: {
        type: Date,
        default: Date.now
    },
    expiredDate: {
        type: Date,
        required: true
    },
    sentDate: {
        type: Date
    },

    // Conversion
    convertedToInvoice: {
        type: Boolean,
        default: false
    },
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice'
    },

    // Flags
    isExpired: {
        type: Boolean,
        default: false
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
    pdfFile: {
        type: String
    },
    attachments: [{
        type: String
    }]
}, {
    versionKey: false,
    timestamps: true
});

// Pre-save hook to check expiration
quoteSchema.pre('save', function(next) {
    if (this.expiredDate && this.status !== 'accepted' && this.status !== 'declined') {
        this.isExpired = new Date() > new Date(this.expiredDate);
        if (this.isExpired && this.status === 'sent') {
            this.status = 'expired';
        }
    }
    next();
});

// Indexes
quoteSchema.index({ quoteNumber: 1 });
quoteSchema.index({ createdBy: 1, status: 1 });
quoteSchema.index({ clientId: 1, status: 1 });
quoteSchema.index({ caseId: 1 });
quoteSchema.index({ expiredDate: 1 });

// Static method to generate quote number
quoteSchema.statics.generateQuoteNumber = async function(prefix = 'QOT-', includeYear = true) {
    const year = new Date().getFullYear();
    const yearStr = includeYear ? `${year}-` : '';

    // Find the latest quote of this year
    const latestQuote = await this.findOne(
        includeYear ? { year } : {},
        { quoteNumber: 1 },
        { sort: { createdAt: -1 } }
    );

    let nextNumber = 1;
    if (latestQuote && latestQuote.quoteNumber) {
        const match = latestQuote.quoteNumber.match(/(\d+)$/);
        if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
        }
    }

    return `${prefix}${yearStr}${String(nextNumber).padStart(4, '0')}`;
};

module.exports = mongoose.model('Quote', quoteSchema);
