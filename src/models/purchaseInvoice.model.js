const mongoose = require('mongoose');

// Purchase Invoice Item sub-schema
const purchaseInvoiceItemSchema = new mongoose.Schema({
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
        required: true,
        trim: true,
        maxlength: 300
    },
    qty: {
        type: Number,
        required: true,
        min: 0
    },
    uom: {
        type: String,
        trim: true,
        default: 'Unit'
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
    taxRate: {
        type: Number,
        default: 0,
        min: 0
    },
    taxAmount: {
        type: Number,
        default: 0
    },
    netAmount: {
        type: Number,
        default: 0
    }
}, { _id: true });

const purchaseInvoiceSchema = new mongoose.Schema({
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
    purchaseInvoiceId: {
        type: String,
        unique: true,
        index: true
    },

    // Invoice Numbers
    invoiceNumber: {
        type: String,
        unique: true,
        index: true
    },
    supplierInvoiceNo: {
        type: String,
        trim: true,
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

    // References
    purchaseOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PurchaseOrder',
        index: true
    },
    purchaseReceiptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PurchaseReceipt',
        index: true
    },

    // Dates
    postingDate: {
        type: Date,
        default: Date.now,
        index: true
    },
    dueDate: {
        type: Date,
        index: true
    },

    // Items
    items: [purchaseInvoiceItemSchema],

    // Totals
    totalQty: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        default: 0
    },
    taxAmount: {
        type: Number,
        default: 0
    },
    grandTotal: {
        type: Number,
        default: 0
    },

    // Payment Status
    isPaid: {
        type: Boolean,
        default: false
    },
    amountPaid: {
        type: Number,
        default: 0
    },
    outstandingAmount: {
        type: Number,
        default: 0
    },

    // Status
    status: {
        type: String,
        enum: ['draft', 'submitted', 'paid', 'cancelled'],
        default: 'draft',
        index: true
    },
    docStatus: {
        type: Number,
        enum: [0, 1, 2],  // 0 = Draft, 1 = Submitted, 2 = Cancelled
        default: 0
    },

    // Additional Information
    remarks: {
        type: String,
        trim: true,
        maxlength: 2000
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
purchaseInvoiceSchema.index({ lawyerId: 1, status: 1 });
purchaseInvoiceSchema.index({ firmId: 1, status: 1 });
purchaseInvoiceSchema.index({ firmId: 1, lawyerId: 1 });
purchaseInvoiceSchema.index({ supplierId: 1, postingDate: -1 });
purchaseInvoiceSchema.index({ purchaseOrderId: 1 });
purchaseInvoiceSchema.index({ postingDate: -1 });
purchaseInvoiceSchema.index({ dueDate: 1 });

// Pre-save hook to generate invoice ID and calculate totals
purchaseInvoiceSchema.pre('save', async function(next) {
    // Generate invoice ID if new
    if (!this.purchaseInvoiceId && this.isNew) {
        const Counter = require('./counter.model');
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        const counterId = this.firmId
            ? `purchase_invoice_${this.firmId}_${year}`
            : `purchase_invoice_global_${year}`;

        const seq = await Counter.getNextSequence(counterId);
        this.purchaseInvoiceId = `PI-${year}${month}${day}-${String(seq).padStart(4, '0')}`;

        // Set invoiceNumber same as purchaseInvoiceId if not provided
        if (!this.invoiceNumber) {
            this.invoiceNumber = this.purchaseInvoiceId;
        }
    }

    // Calculate totals
    let totalQty = 0;
    let totalAmount = 0;
    let taxAmount = 0;

    for (const item of this.items) {
        item.amount = item.qty * item.rate;
        item.taxAmount = item.amount * (item.taxRate / 100);
        item.netAmount = item.amount + item.taxAmount;

        totalQty += item.qty;
        totalAmount += item.amount;
        taxAmount += item.taxAmount;
    }

    this.totalQty = totalQty;
    this.totalAmount = totalAmount;
    this.taxAmount = taxAmount;
    this.grandTotal = totalAmount + taxAmount;

    // Calculate outstanding amount
    this.outstandingAmount = this.grandTotal - this.amountPaid;

    // Update payment status
    if (this.outstandingAmount <= 0 && this.grandTotal > 0) {
        this.isPaid = true;
        if (this.status === 'submitted') {
            this.status = 'paid';
        }
    } else {
        this.isPaid = false;
    }

    next();
});

// Post-save hook to update Purchase Order billed quantities
purchaseInvoiceSchema.post('save', async function(doc) {
    if (doc.purchaseOrderId && doc.status === 'submitted') {
        const PurchaseOrder = mongoose.model('PurchaseOrder');
        const po = await PurchaseOrder.findOne({
            _id: doc.purchaseOrderId,
            firmId: doc.firmId
        });

        if (po) {
            // Update billed quantities in PO items
            for (const invoiceItem of doc.items) {
                const poItem = po.items.find(item =>
                    item.itemId && invoiceItem.itemId &&
                    item.itemId.toString() === invoiceItem.itemId.toString()
                );

                if (poItem) {
                    poItem.billedQty = (poItem.billedQty || 0) + invoiceItem.qty;
                }
            }

            await po.save();
        }
    }
});

// Static method: Get invoice summary
purchaseInvoiceSchema.statics.getInvoiceSummary = async function(lawyerId, filters = {}) {
    const matchStage = { lawyerId: new mongoose.Types.ObjectId(lawyerId) };

    if (filters.startDate) matchStage.postingDate = { $gte: new Date(filters.startDate) };
    if (filters.endDate) {
        matchStage.postingDate = matchStage.postingDate || {};
        matchStage.postingDate.$lte = new Date(filters.endDate);
    }
    if (filters.supplierId) matchStage.supplierId = new mongoose.Types.ObjectId(filters.supplierId);
    if (filters.status) matchStage.status = filters.status;

    const summary = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalInvoices: { $sum: 1 },
                totalAmount: { $sum: '$grandTotal' },
                totalPaid: { $sum: '$amountPaid' },
                totalOutstanding: { $sum: '$outstandingAmount' }
            }
        }
    ]);

    return summary[0] || {
        totalInvoices: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalOutstanding: 0
    };
};

module.exports = mongoose.model('PurchaseInvoice', purchaseInvoiceSchema);
