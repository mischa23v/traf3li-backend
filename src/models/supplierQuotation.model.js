const mongoose = require('mongoose');

// Supplier Quotation Item sub-schema
const quotationItemSchema = new mongoose.Schema({
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item'
    },
    itemCode: {
        type: String,
        trim: true
    },
    itemName: {
        type: String,
        trim: true,
        maxlength: 300
    },
    qty: {
        type: Number,
        required: true,
        min: 0.01
    },
    rate: {
        type: Number,
        required: true,
        min: 0
    },
    amount: {
        type: Number,
        default: 0
    },
    leadTimeDays: {
        type: Number,
        min: 0,
        default: 0
    }
}, { _id: true });

const supplierQuotationSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
    },

    // Auto-generated ID
    quotationId: {
        type: String,
        unique: true,
        index: true
    },

    // RFQ Reference
    rfqId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RFQ',
        required: true,
        index: true
    },

    // Supplier Information
    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true,
        index: true
    },
    supplierName: {
        type: String,
        trim: true
    },

    // Items
    items: [quotationItemSchema],

    // Dates
    quotationDate: {
        type: Date,
        default: Date.now,
        index: true
    },
    validTill: {
        type: Date
    },

    // Total
    totalAmount: {
        type: Number,
        default: 0
    },

    // Status
    status: {
        type: String,
        enum: ['draft', 'submitted', 'accepted', 'rejected', 'expired'],
        default: 'submitted',
        index: true
    },

    // User Tracking
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
supplierQuotationSchema.index({ lawyerId: 1, status: 1 });
supplierQuotationSchema.index({ firmId: 1, status: 1 });
supplierQuotationSchema.index({ firmId: 1, lawyerId: 1 });
supplierQuotationSchema.index({ supplierId: 1, quotationDate: -1 });
supplierQuotationSchema.index({ rfqId: 1 });

// Pre-save hook to generate quotation ID and calculate totals
supplierQuotationSchema.pre('save', async function(next) {
    // Generate quotation ID if new
    if (!this.quotationId && this.isNew) {
        const Counter = require('./counter.model');
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        const counterId = this.firmId
            ? `supplier_quotation_${this.firmId}_${year}`
            : `supplier_quotation_global_${year}`;

        const seq = await Counter.getNextSequence(counterId);
        this.quotationId = `SQ-${year}${month}${day}-${String(seq).padStart(4, '0')}`;
    }

    // Calculate totals
    let totalAmount = 0;
    for (const item of this.items) {
        item.amount = item.qty * item.rate;
        totalAmount += item.amount;
    }
    this.totalAmount = totalAmount;

    // Check if expired
    if (this.validTill && new Date() > this.validTill && this.status === 'submitted') {
        this.status = 'expired';
    }

    next();
});

// Post-save hook to update RFQ with quotation
supplierQuotationSchema.post('save', async function(doc) {
    if (doc.rfqId && doc.status === 'submitted') {
        const RFQ = mongoose.model('RFQ');
        const rfq = await RFQ.findById(doc.rfqId);

        if (rfq) {
            // Update the supplier entry with quotation ID
            const supplier = rfq.suppliers.find(s =>
                s.supplierId && doc.supplierId &&
                s.supplierId.toString() === doc.supplierId.toString()
            );

            if (supplier) {
                supplier.quotationId = doc._id;
                await rfq.save();
            }
        }
    }
});

// Static method: Compare quotations for an RFQ
supplierQuotationSchema.statics.compareQuotations = async function(rfqId) {
    const quotations = await this.find({
        rfqId: new mongoose.Types.ObjectId(rfqId),
        status: { $in: ['submitted', 'accepted'] }
    })
    .populate('supplierId', 'name supplierId')
    .sort({ totalAmount: 1 });

    return quotations.map(q => ({
        quotationId: q.quotationId,
        supplier: q.supplierId,
        totalAmount: q.totalAmount,
        validTill: q.validTill,
        items: q.items,
        status: q.status
    }));
};

module.exports = mongoose.model('SupplierQuotation', supplierQuotationSchema);
