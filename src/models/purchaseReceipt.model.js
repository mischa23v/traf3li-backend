const mongoose = require('mongoose');

// Purchase Receipt Item sub-schema
const purchaseReceiptItemSchema = new mongoose.Schema({
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
    warehouse: {
        type: String,
        trim: true
    },
    batchNo: {
        type: String,
        trim: true
    },
    serialNo: {
        type: String,
        trim: true
    },
    acceptedQty: {
        type: Number,
        default: 0,
        min: 0
    },
    rejectedQty: {
        type: Number,
        default: 0,
        min: 0
    },
    rejectionReason: {
        type: String,
        trim: true,
        maxlength: 500
    }
}, { _id: true });

const purchaseReceiptSchema = new mongoose.Schema({
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
    purchaseReceiptId: {
        type: String,
        unique: true,
        index: true
    },

    // Receipt Number
    receiptNumber: {
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

    // Purchase Order Reference
    purchaseOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PurchaseOrder',
        index: true
    },

    // Posting Information
    postingDate: {
        type: Date,
        default: Date.now,
        index: true
    },
    postingTime: {
        type: String,
        default: function() {
            const now = new Date();
            return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        }
    },

    // Items
    items: [purchaseReceiptItemSchema],

    // Totals
    totalQty: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        default: 0
    },

    // Status
    status: {
        type: String,
        enum: ['draft', 'submitted', 'cancelled'],
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
purchaseReceiptSchema.index({ lawyerId: 1, status: 1 });
purchaseReceiptSchema.index({ firmId: 1, status: 1 });
purchaseReceiptSchema.index({ firmId: 1, lawyerId: 1 });
purchaseReceiptSchema.index({ supplierId: 1, postingDate: -1 });
purchaseReceiptSchema.index({ purchaseOrderId: 1 });
purchaseReceiptSchema.index({ postingDate: -1 });

// Pre-save hook to generate receipt ID and calculate totals
purchaseReceiptSchema.pre('save', async function(next) {
    // Generate receipt ID if new
    if (!this.purchaseReceiptId && this.isNew) {
        const Counter = require('./counter.model');
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        const counterId = this.firmId
            ? `purchase_receipt_${this.firmId}_${year}`
            : `purchase_receipt_global_${year}`;

        const seq = await Counter.getNextSequence(counterId);
        this.purchaseReceiptId = `PR-${year}${month}${day}-${String(seq).padStart(4, '0')}`;

        // Set receiptNumber same as purchaseReceiptId if not provided
        if (!this.receiptNumber) {
            this.receiptNumber = this.purchaseReceiptId;
        }
    }

    // Calculate totals
    let totalQty = 0;
    let totalAmount = 0;

    for (const item of this.items) {
        // Calculate accepted/rejected quantities
        if (item.acceptedQty === 0 && item.rejectedQty === 0) {
            item.acceptedQty = item.qty;
        }

        item.amount = item.qty * item.rate;
        totalQty += item.qty;
        totalAmount += item.amount;
    }

    this.totalQty = totalQty;
    this.totalAmount = totalAmount;

    next();
});

// Post-save hook to update Purchase Order received quantities
purchaseReceiptSchema.post('save', async function(doc) {
    if (doc.purchaseOrderId && doc.status === 'submitted') {
        const PurchaseOrder = mongoose.model('PurchaseOrder');
        const po = await PurchaseOrder.findById(doc.purchaseOrderId);

        if (po) {
            // Update received quantities in PO items
            for (const receiptItem of doc.items) {
                const poItem = po.items.find(item =>
                    item.itemId && receiptItem.itemId &&
                    item.itemId.toString() === receiptItem.itemId.toString()
                );

                if (poItem) {
                    poItem.receivedQty = (poItem.receivedQty || 0) + receiptItem.acceptedQty;
                }
            }

            await po.save();
        }
    }
});

module.exports = mongoose.model('PurchaseReceipt', purchaseReceiptSchema);
