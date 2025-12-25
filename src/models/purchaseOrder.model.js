const mongoose = require('mongoose');

// Purchase Order Item sub-schema
const purchaseOrderItemSchema = new mongoose.Schema({
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
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    qty: {
        type: Number,
        required: true,
        min: 0.01
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
    discount: {
        type: Number,
        default: 0,
        min: 0
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
    },
    receivedQty: {
        type: Number,
        default: 0,
        min: 0
    },
    billedQty: {
        type: Number,
        default: 0,
        min: 0
    },
    warehouse: {
        type: String,
        trim: true
    },
    requiredDate: {
        type: Date
    }
}, { _id: true });

const purchaseOrderSchema = new mongoose.Schema({
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
    purchaseOrderId: {
        type: String,
        unique: true,
        index: true
    },

    // PO Number (user-friendly)
    poNumber: {
        type: String,
        unique: true,
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
    items: [purchaseOrderItemSchema],

    // Dates
    orderDate: {
        type: Date,
        default: Date.now,
        index: true
    },
    requiredDate: {
        type: Date
    },
    expectedDeliveryDate: {
        type: Date
    },

    // Totals
    totalQty: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        default: 0
    },
    discountAmount: {
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

    // Tax
    taxTemplateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TaxTemplate'
    },

    // Currency
    currency: {
        type: String,
        default: 'SAR'
    },
    exchangeRate: {
        type: Number,
        default: 1
    },

    // Status
    status: {
        type: String,
        enum: ['draft', 'submitted', 'approved', 'received', 'billed', 'cancelled', 'closed'],
        default: 'draft',
        index: true
    },
    docStatus: {
        type: Number,
        enum: [0, 1, 2],  // 0 = Draft, 1 = Submitted, 2 = Cancelled
        default: 0
    },

    // Fulfillment tracking
    percentReceived: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    percentBilled: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },

    // Terms
    paymentTerms: {
        type: String,
        trim: true
    },
    termsAndConditions: {
        type: String,
        trim: true,
        maxlength: 5000
    },

    // References
    materialRequestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MaterialRequest'
    },
    rfqId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RFQ'
    },
    quotationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SupplierQuotation'
    },

    // Additional Information
    remarks: {
        type: String,
        trim: true,
        maxlength: 2000
    },
    company: {
        type: String,
        trim: true
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
purchaseOrderSchema.index({ lawyerId: 1, status: 1 });
purchaseOrderSchema.index({ firmId: 1, status: 1 });
purchaseOrderSchema.index({ firmId: 1, lawyerId: 1 });
purchaseOrderSchema.index({ supplierId: 1, orderDate: -1 });
purchaseOrderSchema.index({ orderDate: -1 });
purchaseOrderSchema.index({ materialRequestId: 1 });
purchaseOrderSchema.index({ rfqId: 1 });

// Pre-save hook to generate PO ID and calculate totals
purchaseOrderSchema.pre('save', async function(next) {
    // Generate PO ID if new
    if (!this.purchaseOrderId && this.isNew) {
        const Counter = require('./counter.model');
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        const counterId = this.firmId
            ? `purchase_order_${this.firmId}_${year}`
            : `purchase_order_global_${year}`;

        const seq = await Counter.getNextSequence(counterId);
        this.purchaseOrderId = `PO-${year}${month}${day}-${String(seq).padStart(4, '0')}`;

        // Set poNumber same as purchaseOrderId if not provided
        if (!this.poNumber) {
            this.poNumber = this.purchaseOrderId;
        }
    }

    // Calculate item totals
    let totalQty = 0;
    let totalAmount = 0;
    let discountAmount = 0;
    let taxAmount = 0;

    for (const item of this.items) {
        item.amount = item.qty * item.rate;
        item.taxAmount = (item.amount - item.discount) * (item.taxRate / 100);
        item.netAmount = item.amount - item.discount + item.taxAmount;

        totalQty += item.qty;
        totalAmount += item.amount;
        discountAmount += item.discount;
        taxAmount += item.taxAmount;
    }

    this.totalQty = totalQty;
    this.totalAmount = totalAmount;
    this.discountAmount = discountAmount;
    this.taxAmount = taxAmount;
    this.grandTotal = totalAmount - discountAmount + taxAmount;

    // Calculate fulfillment percentages
    if (this.items.length > 0) {
        let totalReceivedQty = 0;
        let totalBilledQty = 0;
        let totalOrderedQty = 0;

        for (const item of this.items) {
            totalReceivedQty += item.receivedQty || 0;
            totalBilledQty += item.billedQty || 0;
            totalOrderedQty += item.qty;
        }

        this.percentReceived = totalOrderedQty > 0 ? (totalReceivedQty / totalOrderedQty) * 100 : 0;
        this.percentBilled = totalOrderedQty > 0 ? (totalBilledQty / totalOrderedQty) * 100 : 0;

        // Auto-update status based on fulfillment
        if (this.percentReceived >= 100 && this.status === 'approved') {
            this.status = 'received';
        }
        if (this.percentBilled >= 100 && this.status === 'received') {
            this.status = 'billed';
        }
    }

    next();
});

// Static method: Get purchase order summary
purchaseOrderSchema.statics.getPOSummary = async function(lawyerId, filters = {}) {
    const matchStage = { lawyerId: new mongoose.Types.ObjectId(lawyerId) };

    if (filters.startDate) matchStage.orderDate = { $gte: new Date(filters.startDate) };
    if (filters.endDate) {
        matchStage.orderDate = matchStage.orderDate || {};
        matchStage.orderDate.$lte = new Date(filters.endDate);
    }
    if (filters.supplierId) matchStage.supplierId = new mongoose.Types.ObjectId(filters.supplierId);
    if (filters.status) matchStage.status = filters.status;

    const summary = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalAmount: { $sum: '$grandTotal' },
                avgOrderValue: { $avg: '$grandTotal' }
            }
        }
    ]);

    const byStatus = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$grandTotal' }
            }
        }
    ]);

    return {
        summary: summary[0] || { totalOrders: 0, totalAmount: 0, avgOrderValue: 0 },
        byStatus
    };
};

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
