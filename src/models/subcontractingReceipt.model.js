const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Subcontracting Receipt Model
 *
 * Records the receipt of finished goods from suppliers and tracks
 * returned/consumed raw materials in subcontracting operations.
 *
 * Features:
 * - Auto-generated receipt IDs (SCR-YYYYMMDD-XXXX)
 * - Link to subcontracting orders
 * - Track finished goods received with quality inspection
 * - Track returned materials
 * - Track consumed materials
 * - Quality control (accepted/rejected quantities)
 */

// ============ FINISHED GOODS SCHEMA ============
const FinishedGoodsReceiptSchema = new Schema({
    itemId: {
        type: Schema.Types.ObjectId,
        ref: 'Item',
        required: true
    },
    itemCode: {
        type: String,
        required: true
    },
    itemName: {
        type: String,
        required: true
    },
    qty: {
        type: Number,
        required: true,
        min: 0
    },
    uom: {
        type: String,
        default: 'Nos'
    },
    rate: {
        type: Number,
        default: 0,
        min: 0
    },
    amount: {
        type: Number,
        default: 0
    },
    warehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse'
    },
    batchNo: String,
    serialNo: String,
    acceptedQty: {
        type: Number,
        default: 0,
        min: 0
    },
    rejectedQty: {
        type: Number,
        default: 0,
        min: 0
    }
}, { _id: true });

// ============ RETURNED MATERIALS SCHEMA ============
const ReturnedMaterialSchema = new Schema({
    itemId: {
        type: Schema.Types.ObjectId,
        ref: 'Item',
        required: true
    },
    itemCode: {
        type: String,
        required: true
    },
    itemName: {
        type: String,
        required: true
    },
    qty: {
        type: Number,
        required: true,
        min: 0
    },
    uom: {
        type: String,
        default: 'Nos'
    },
    warehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse'
    },
    batchNo: String,
    serialNo: String
}, { _id: true });

// ============ CONSUMED MATERIALS SCHEMA ============
const ConsumedMaterialSchema = new Schema({
    itemId: {
        type: Schema.Types.ObjectId,
        ref: 'Item',
        required: true
    },
    itemCode: {
        type: String,
        required: true
    },
    itemName: {
        type: String,
        required: true
    },
    qty: {
        type: Number,
        required: true,
        min: 0
    },
    uom: {
        type: String,
        default: 'Nos'
    },
    batchNo: String,
    serialNo: String
}, { _id: true });

// ============ MAIN SUBCONTRACTING RECEIPT SCHEMA ============
const subcontractingReceiptSchema = new Schema({
    // ============ FIRM (Multi-Tenancy) ============
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
    },

    // ============ RECEIPT IDENTIFICATION ============
    receiptId: {
        type: String,
        unique: true,
        index: true
    },
    receiptNumber: {
        type: String,
        unique: true,
        index: true
    },

    // ============ ORDER REFERENCE ============
    subcontractingOrderId: {
        type: Schema.Types.ObjectId,
        ref: 'SubcontractingOrder',
        required: true,
        index: true
    },
    orderNumber: {
        type: String,
        required: true,
        index: true
    },

    // ============ SUPPLIER INFO ============
    supplierId: {
        type: Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true,
        index: true
    },
    supplierName: {
        type: String,
        required: true
    },

    // ============ POSTING INFO ============
    postingDate: {
        type: Date,
        required: true,
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

    // ============ RECEIPT ITEMS ============
    finishedGoods: [FinishedGoodsReceiptSchema],
    returnedMaterials: [ReturnedMaterialSchema],
    consumedMaterials: [ConsumedMaterialSchema],

    // ============ TOTALS ============
    totalAmount: {
        type: Number,
        default: 0
    },

    // ============ STATUS ============
    status: {
        type: String,
        enum: ['draft', 'submitted', 'cancelled'],
        default: 'draft',
        index: true
    },
    docStatus: {
        type: Number,
        enum: [0, 1, 2],  // 0=Draft, 1=Submitted, 2=Cancelled
        default: 0
    },

    // ============ ADDITIONAL INFO ============
    remarks: {
        type: String,
        maxlength: 1000
    },

    // ============ AUDIT ============
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    versionKey: false,
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ============ INDEXES ============
subcontractingReceiptSchema.index({ receiptId: 1 });
subcontractingReceiptSchema.index({ receiptNumber: 1 });
subcontractingReceiptSchema.index({ subcontractingOrderId: 1 });
subcontractingReceiptSchema.index({ supplierId: 1, status: 1 });
subcontractingReceiptSchema.index({ postingDate: -1 });
subcontractingReceiptSchema.index({ status: 1, postingDate: -1 });
subcontractingReceiptSchema.index({ firmId: 1, status: 1, postingDate: -1 });
subcontractingReceiptSchema.index({ firmId: 1, subcontractingOrderId: 1 });

// ============ VIRTUALS ============
subcontractingReceiptSchema.virtual('totalAccepted').get(function() {
    return this.finishedGoods.reduce((sum, item) => sum + (item.acceptedQty || 0), 0);
});

subcontractingReceiptSchema.virtual('totalRejected').get(function() {
    return this.finishedGoods.reduce((sum, item) => sum + (item.rejectedQty || 0), 0);
});

subcontractingReceiptSchema.virtual('qualityRate').get(function() {
    const totalQty = this.finishedGoods.reduce((sum, item) => sum + (item.qty || 0), 0);
    const acceptedQty = this.totalAccepted;

    if (totalQty === 0) return 100;
    return Math.round((acceptedQty / totalQty) * 100);
});

// ============ STATICS ============
/**
 * Generate unique receipt ID
 * Format: SCR-YYYYMMDD-XXXX
 */
subcontractingReceiptSchema.statics.generateReceiptId = async function(firmId = null) {
    const Counter = require('./counter.model');
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // Create counter ID: subcontracting_receipt_{firmId}_{date}
    const counterId = firmId
        ? `subcontracting_receipt_${firmId}_${dateStr}`
        : `subcontracting_receipt_global_${dateStr}`;

    const seq = await Counter.getNextSequence(counterId);

    return `SCR-${dateStr}-${String(seq).padStart(4, '0')}`;
};

/**
 * Get receipts by order
 */
subcontractingReceiptSchema.statics.getReceiptsByOrder = function(subcontractingOrderId, firmId = null) {
    const query = { subcontractingOrderId };
    if (firmId) query.firmId = firmId;
    return this.find(query).sort({ postingDate: -1 });
};

/**
 * Get receipts by supplier
 */
subcontractingReceiptSchema.statics.getReceiptsBySupplier = function(supplierId, firmId = null) {
    const query = { supplierId };
    if (firmId) query.firmId = firmId;
    return this.find(query).sort({ postingDate: -1 });
};

/**
 * Get receipts by status
 */
subcontractingReceiptSchema.statics.getReceiptsByStatus = function(status, firmId = null) {
    const query = { status };
    if (firmId) query.firmId = firmId;
    return this.find(query).sort({ postingDate: -1 });
};

/**
 * Get receipts summary for an order
 */
subcontractingReceiptSchema.statics.getOrderReceiptsSummary = async function(subcontractingOrderId, firmId = null) {
    const query = {
        subcontractingOrderId,
        status: 'submitted'
    };
    if (firmId) query.firmId = firmId;

    const receipts = await this.find(query);

    const summary = {
        totalReceipts: receipts.length,
        totalAccepted: 0,
        totalRejected: 0,
        totalReturned: 0,
        totalConsumed: 0,
        totalAmount: 0
    };

    receipts.forEach(receipt => {
        summary.totalAccepted += receipt.totalAccepted;
        summary.totalRejected += receipt.totalRejected;
        summary.totalReturned += receipt.returnedMaterials.reduce((sum, item) => sum + (item.qty || 0), 0);
        summary.totalConsumed += receipt.consumedMaterials.reduce((sum, item) => sum + (item.qty || 0), 0);
        summary.totalAmount += receipt.totalAmount || 0;
    });

    return summary;
};

// ============ PRE-SAVE MIDDLEWARE ============
subcontractingReceiptSchema.pre('save', async function(next) {
    // Auto-generate receipt ID if not provided
    if (this.isNew && !this.receiptId) {
        this.receiptId = await this.constructor.generateReceiptId(this.firmId);

        // Sync receiptNumber with receiptId if not set
        if (!this.receiptNumber) {
            this.receiptNumber = this.receiptId;
        }
    }

    // Calculate finished goods amounts and set accepted qty to qty if not set
    this.finishedGoods.forEach(item => {
        // Default accepted qty to full qty if not set
        if (item.acceptedQty === undefined || item.acceptedQty === 0) {
            item.acceptedQty = item.qty;
        }

        // Default rejected qty if not set
        if (item.rejectedQty === undefined) {
            item.rejectedQty = 0;
        }

        // Ensure accepted + rejected <= total qty
        if (item.acceptedQty + item.rejectedQty > item.qty) {
            item.rejectedQty = item.qty - item.acceptedQty;
        }

        // Calculate amount
        item.amount = (item.qty || 0) * (item.rate || 0);
    });

    // Calculate total amount from finished goods
    this.totalAmount = this.finishedGoods.reduce((sum, item) => sum + (item.amount || 0), 0);

    // Sync docStatus with status
    if (this.status === 'draft') {
        this.docStatus = 0;
    } else if (this.status === 'submitted') {
        this.docStatus = 1;
    } else if (this.status === 'cancelled') {
        this.docStatus = 2;
    }

    next();
});

// ============ POST-SAVE MIDDLEWARE ============
/**
 * Update subcontracting order when receipt is submitted
 */
subcontractingReceiptSchema.post('save', async function(doc, next) {
    // Only update order if receipt is submitted
    if (doc.status === 'submitted' && doc.subcontractingOrderId) {
        try {
            const SubcontractingOrder = mongoose.model('SubcontractingOrder');
            const order = await SubcontractingOrder.findById(doc.subcontractingOrderId);

            if (order) {
                // Update received quantities in the order
                doc.finishedGoods.forEach(receiptItem => {
                    const orderItem = order.finishedGoods.find(
                        item => item.itemId.toString() === receiptItem.itemId.toString()
                    );

                    if (orderItem) {
                        // Add accepted quantity to received quantity
                        orderItem.receivedQty = (orderItem.receivedQty || 0) + (receiptItem.acceptedQty || 0);
                    }
                });

                // Update material consumption
                doc.consumedMaterials.forEach(consumedItem => {
                    const rawMaterial = order.rawMaterials.find(
                        item => item.itemId.toString() === consumedItem.itemId.toString()
                    );

                    if (rawMaterial) {
                        rawMaterial.consumedQty = (rawMaterial.consumedQty || 0) + (consumedItem.qty || 0);
                    }
                });

                // Update returned materials
                doc.returnedMaterials.forEach(returnedItem => {
                    const rawMaterial = order.rawMaterials.find(
                        item => item.itemId.toString() === returnedItem.itemId.toString()
                    );

                    if (rawMaterial) {
                        rawMaterial.returnedQty = (rawMaterial.returnedQty || 0) + (returnedItem.qty || 0);
                    }
                });

                await order.save();
            }
        } catch (error) {
            console.error('Error updating subcontracting order:', error);
        }
    }

    next();
});

// ============ METHODS ============
/**
 * Submit the receipt
 */
subcontractingReceiptSchema.methods.submit = async function(userId) {
    if (this.status !== 'draft') {
        throw new Error('Only draft receipts can be submitted');
    }

    this.status = 'submitted';
    this.docStatus = 1;
    this.updatedBy = userId;

    return await this.save();
};

/**
 * Cancel the receipt
 */
subcontractingReceiptSchema.methods.cancel = async function(userId, reason = '') {
    if (this.status === 'submitted') {
        throw new Error('Cannot cancel submitted receipt. Please create a return instead.');
    }

    this.status = 'cancelled';
    this.docStatus = 2;
    this.updatedBy = userId;

    if (reason) {
        this.remarks = (this.remarks ? this.remarks + '\n' : '') + `Cancelled: ${reason}`;
    }

    return await this.save();
};

/**
 * Update quality inspection results
 */
subcontractingReceiptSchema.methods.updateQualityInspection = async function(itemId, acceptedQty, rejectedQty, userId) {
    const item = this.finishedGoods.find(fg => fg.itemId.toString() === itemId.toString());

    if (!item) {
        throw new Error('Item not found in finished goods');
    }

    if (acceptedQty + rejectedQty > item.qty) {
        throw new Error('Accepted + Rejected quantity cannot exceed total quantity');
    }

    item.acceptedQty = acceptedQty;
    item.rejectedQty = rejectedQty;
    this.updatedBy = userId;

    return await this.save();
};

module.exports = mongoose.model('SubcontractingReceipt', subcontractingReceiptSchema);
