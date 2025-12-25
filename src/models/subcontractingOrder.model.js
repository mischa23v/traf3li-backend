const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Subcontracting Order Model
 *
 * Manages subcontracting orders where raw materials are sent to suppliers
 * for processing and finished goods are received back.
 *
 * Features:
 * - Auto-generated order IDs (SCO-YYYYMMDD-XXXX)
 * - Track service items, raw materials, and finished goods
 * - Material transfer and consumption tracking
 * - Supplier warehouse management
 * - Multi-warehouse support
 * - Receipt tracking and percentage completion
 */

// ============ SERVICE ITEM SCHEMA ============
const ServiceItemSchema = new Schema({
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
    description: String,
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
        required: true,
        min: 0
    },
    amount: {
        type: Number,
        default: 0
    }
}, { _id: true });

// ============ RAW MATERIAL SCHEMA ============
const RawMaterialSchema = new Schema({
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
    requiredQty: {
        type: Number,
        required: true,
        min: 0
    },
    transferredQty: {
        type: Number,
        default: 0,
        min: 0
    },
    consumedQty: {
        type: Number,
        default: 0,
        min: 0
    },
    returnedQty: {
        type: Number,
        default: 0,
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
    sourceWarehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse'
    },
    batchNo: String,
    serialNo: String
}, { _id: true });

// ============ FINISHED GOODS SCHEMA ============
const FinishedGoodsSchema = new Schema({
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
    receivedQty: {
        type: Number,
        default: 0,
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
    targetWarehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse'
    },
    batchNo: String,
    serialNo: String
}, { _id: true });

// ============ MAIN SUBCONTRACTING ORDER SCHEMA ============
const subcontractingOrderSchema = new Schema({
    // ============ FIRM (Multi-Tenancy) ============
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
    },

    // ============ ORDER IDENTIFICATION ============
    subcontractingOrderId: {
        type: String,
        unique: true,
        index: true
    },
    orderNumber: {
        type: String,
        required: true,
        unique: true,
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

    // ============ ORDER ITEMS ============
    serviceItems: [ServiceItemSchema],
    rawMaterials: [RawMaterialSchema],
    finishedGoods: [FinishedGoodsSchema],

    // ============ DATES ============
    orderDate: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    },
    requiredDate: {
        type: Date,
        index: true
    },

    // ============ WAREHOUSE REFERENCES ============
    supplierWarehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse'
    },
    rawMaterialWarehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse'
    },
    finishedGoodsWarehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse'
    },

    // ============ TOTALS ============
    totalServiceCost: {
        type: Number,
        default: 0
    },
    totalRawMaterialCost: {
        type: Number,
        default: 0
    },
    grandTotal: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        default: 'SAR'
    },

    // ============ STATUS ============
    status: {
        type: String,
        enum: ['draft', 'submitted', 'partially_received', 'completed', 'cancelled'],
        default: 'draft',
        index: true
    },
    docStatus: {
        type: Number,
        enum: [0, 1, 2],  // 0=Draft, 1=Submitted, 2=Cancelled
        default: 0
    },
    percentReceived: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },

    // ============ REFERENCES ============
    purchaseOrderId: {
        type: Schema.Types.ObjectId,
        ref: 'PurchaseOrder'
    },

    // ============ ADDITIONAL INFO ============
    remarks: {
        type: String,
        maxlength: 1000
    },
    company: String,

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
subcontractingOrderSchema.index({ subcontractingOrderId: 1 });
subcontractingOrderSchema.index({ orderNumber: 1 });
subcontractingOrderSchema.index({ supplierId: 1, status: 1 });
subcontractingOrderSchema.index({ orderDate: -1 });
subcontractingOrderSchema.index({ status: 1, orderDate: -1 });
subcontractingOrderSchema.index({ firmId: 1, status: 1, orderDate: -1 });
subcontractingOrderSchema.index({ firmId: 1, supplierId: 1 });

// ============ VIRTUALS ============
subcontractingOrderSchema.virtual('isOverdue').get(function() {
    if (this.status === 'completed' || this.status === 'cancelled') {
        return false;
    }
    return this.requiredDate && new Date() > this.requiredDate;
});

subcontractingOrderSchema.virtual('isCompleted').get(function() {
    return this.status === 'completed' || this.percentReceived >= 100;
});

// ============ STATICS ============
/**
 * Generate unique subcontracting order ID
 * Format: SCO-YYYYMMDD-XXXX
 */
subcontractingOrderSchema.statics.generateOrderId = async function(firmId = null) {
    const Counter = require('./counter.model');
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // Create counter ID: subcontracting_{firmId}_{date}
    const counterId = firmId
        ? `subcontracting_${firmId}_${dateStr}`
        : `subcontracting_global_${dateStr}`;

    const seq = await Counter.getNextSequence(counterId);

    return `SCO-${dateStr}-${String(seq).padStart(4, '0')}`;
};

/**
 * Get orders by status
 */
subcontractingOrderSchema.statics.getOrdersByStatus = function(status, firmId = null) {
    const query = { status };
    if (firmId) query.firmId = firmId;
    return this.find(query).sort({ orderDate: -1 });
};

/**
 * Get orders by supplier
 */
subcontractingOrderSchema.statics.getOrdersBySupplier = function(supplierId, firmId = null) {
    const query = { supplierId };
    if (firmId) query.firmId = firmId;
    return this.find(query).sort({ orderDate: -1 });
};

/**
 * Get pending orders (not completed or cancelled)
 */
subcontractingOrderSchema.statics.getPendingOrders = function(firmId = null) {
    const query = {
        status: { $in: ['draft', 'submitted', 'partially_received'] }
    };
    if (firmId) query.firmId = firmId;
    return this.find(query).sort({ orderDate: -1 });
};

// ============ PRE-SAVE MIDDLEWARE ============
subcontractingOrderSchema.pre('save', async function(next) {
    // Auto-generate order ID if not provided
    if (this.isNew && !this.subcontractingOrderId) {
        this.subcontractingOrderId = await this.constructor.generateOrderId(this.firmId);

        // Sync orderNumber with subcontractingOrderId if not set
        if (!this.orderNumber) {
            this.orderNumber = this.subcontractingOrderId;
        }
    }

    // Calculate service items total
    this.totalServiceCost = this.serviceItems.reduce((sum, item) => {
        item.amount = (item.qty || 0) * (item.rate || 0);
        return sum + item.amount;
    }, 0);

    // Calculate raw materials total
    this.totalRawMaterialCost = this.rawMaterials.reduce((sum, item) => {
        item.amount = (item.requiredQty || 0) * (item.rate || 0);
        return sum + item.amount;
    }, 0);

    // Calculate grand total (service cost + raw material cost)
    this.grandTotal = this.totalServiceCost + this.totalRawMaterialCost;

    // Calculate percent received based on finished goods
    if (this.finishedGoods.length > 0) {
        const totalQty = this.finishedGoods.reduce((sum, item) => sum + (item.qty || 0), 0);
        const receivedQty = this.finishedGoods.reduce((sum, item) => sum + (item.receivedQty || 0), 0);

        if (totalQty > 0) {
            this.percentReceived = Math.min(100, Math.round((receivedQty / totalQty) * 100));
        }
    }

    // Update status based on percent received
    if (this.percentReceived >= 100 && this.status !== 'cancelled') {
        this.status = 'completed';
        this.docStatus = 1;
    } else if (this.percentReceived > 0 && this.status === 'submitted') {
        this.status = 'partially_received';
    }

    // Sync docStatus with status
    if (this.status === 'draft') {
        this.docStatus = 0;
    } else if (this.status === 'cancelled') {
        this.docStatus = 2;
    } else if (this.status === 'submitted' || this.status === 'partially_received' || this.status === 'completed') {
        this.docStatus = 1;
    }

    next();
});

// ============ METHODS ============
/**
 * Submit the order
 */
subcontractingOrderSchema.methods.submit = async function(userId) {
    if (this.status !== 'draft') {
        throw new Error('Only draft orders can be submitted');
    }

    this.status = 'submitted';
    this.docStatus = 1;
    this.updatedBy = userId;

    return await this.save();
};

/**
 * Cancel the order
 */
subcontractingOrderSchema.methods.cancel = async function(userId, reason = '') {
    if (this.status === 'completed') {
        throw new Error('Cannot cancel completed order');
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
 * Update received quantities for finished goods
 */
subcontractingOrderSchema.methods.updateReceivedQty = async function(itemId, receivedQty, userId) {
    const item = this.finishedGoods.find(fg => fg.itemId.toString() === itemId.toString());

    if (!item) {
        throw new Error('Item not found in finished goods');
    }

    item.receivedQty = Math.min(receivedQty, item.qty);
    this.updatedBy = userId;

    return await this.save();
};

/**
 * Update consumed/returned quantities for raw materials
 */
subcontractingOrderSchema.methods.updateMaterialConsumption = async function(itemId, consumedQty, returnedQty, userId) {
    const item = this.rawMaterials.find(rm => rm.itemId.toString() === itemId.toString());

    if (!item) {
        throw new Error('Item not found in raw materials');
    }

    item.consumedQty = Math.min(consumedQty || 0, item.transferredQty);
    item.returnedQty = Math.min(returnedQty || 0, item.transferredQty - item.consumedQty);
    this.updatedBy = userId;

    return await this.save();
};

// ═══════════════════════════════════════════════════════════════
// FIRM ISOLATION PLUGIN (RLS-like enforcement)
// ═══════════════════════════════════════════════════════════════
const firmIsolationPlugin = require('./plugins/firmIsolation.plugin');

/**
 * Apply Row-Level Security (RLS) plugin to enforce firm-level data isolation.
 */
subcontractingOrderSchema.plugin(firmIsolationPlugin);

module.exports = mongoose.model('SubcontractingOrder', subcontractingOrderSchema);
