const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Work Order Model
 * Represents a manufacturing order to produce a specific quantity of an item
 * based on a BOM. Tracks production progress, materials, and operations.
 */

// ============ SUB-SCHEMAS ============

const RequiredItemSchema = new Schema({
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
    uom: {
        type: String,
        default: 'Unit'
    },
    sourceWarehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse'
    },
    rate: {
        type: Number,
        default: 0
    },
    amount: {
        type: Number,
        default: 0
    }
}, { _id: true });

const WorkOrderOperationSchema = new Schema({
    operation: {
        type: String,
        required: true
    },
    workstation: {
        type: Schema.Types.ObjectId,
        ref: 'Workstation'
    },
    plannedTime: {
        type: Number,
        default: 0,
        min: 0,
        comment: 'In minutes'
    },
    actualTime: {
        type: Number,
        default: 0,
        min: 0,
        comment: 'In minutes'
    },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed'],
        default: 'pending'
    },
    completedQty: {
        type: Number,
        default: 0,
        min: 0
    },
    sequence: {
        type: Number,
        default: 0
    }
}, { _id: true });

// ============ MAIN WORK ORDER SCHEMA ============

const workOrderSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // Auto-generated Work Order ID (Format: WO-YYYYMMDD-XXXX)
    workOrderId: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },

    workOrderNumber: {
        type: String,
        trim: true
    },

    // Item to manufacture
    itemId: {
        type: Schema.Types.ObjectId,
        ref: 'Item',
        required: true,
        index: true
    },
    itemCode: {
        type: String,
        required: true
    },
    itemName: {
        type: String,
        required: true
    },

    // BOM reference
    bomId: {
        type: Schema.Types.ObjectId,
        ref: 'BOM',
        required: true,
        index: true
    },
    bomNumber: String,

    // Quantity
    qty: {
        type: Number,
        required: true,
        min: 0
    },
    producedQty: {
        type: Number,
        default: 0,
        min: 0
    },
    uom: {
        type: String,
        default: 'Unit'
    },

    // Dates
    plannedStartDate: {
        type: Date,
        index: true
    },
    plannedEndDate: {
        type: Date,
        index: true
    },
    actualStartDate: Date,
    actualEndDate: Date,

    // Warehouses
    targetWarehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: true
    },
    workInProgressWarehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse'
    },
    sourceWarehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse'
    },

    // Status
    status: {
        type: String,
        enum: ['draft', 'submitted', 'not_started', 'in_progress', 'completed', 'stopped', 'cancelled'],
        default: 'draft',
        index: true
    },

    // Document status (0=Draft, 1=Submitted, 2=Cancelled)
    docStatus: {
        type: Number,
        enum: [0, 1, 2],
        default: 0,
        index: true
    },

    // References
    salesOrderId: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        index: true
    },
    materialRequestId: {
        type: Schema.Types.ObjectId,
        ref: 'MaterialRequest'
    },

    // Required materials
    requiredItems: [RequiredItemSchema],

    // Operations to perform
    operations: [WorkOrderOperationSchema],

    remarks: {
        type: String,
        maxlength: 1000
    },

    company: String,

    // Ownership
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }

}, {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ============ INDEXES ============
workOrderSchema.index({ firmId: 1, status: 1 });
workOrderSchema.index({ firmId: 1, docStatus: 1 });
workOrderSchema.index({ firmId: 1, plannedStartDate: 1 });
workOrderSchema.index({ workOrderId: 1 });
workOrderSchema.index({ itemId: 1, status: 1 });
workOrderSchema.index({ bomId: 1 });
workOrderSchema.index({ salesOrderId: 1 });

// ============ VIRTUALS ============

// Calculate completion percentage
workOrderSchema.virtual('completionPercentage').get(function() {
    if (!this.qty || this.qty === 0) return 0;
    return Math.min(100, Math.round((this.producedQty / this.qty) * 100));
});

// Check if overdue
workOrderSchema.virtual('isOverdue').get(function() {
    if (this.status === 'completed' || this.status === 'cancelled') return false;
    if (!this.plannedEndDate) return false;
    return new Date() > this.plannedEndDate;
});

// Remaining quantity
workOrderSchema.virtual('remainingQty').get(function() {
    return Math.max(0, this.qty - this.producedQty);
});

// ============ PRE-SAVE MIDDLEWARE ============

workOrderSchema.pre('save', async function(next) {
    // Auto-generate Work Order ID if not provided
    if (this.isNew && !this.workOrderId) {
        const Counter = require('./counter.model');
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        const counterId = this.firmId
            ? `workorder_${this.firmId}_${year}${month}${day}`
            : `workorder_global_${year}${month}${day}`;

        const seq = await Counter.getNextSequence(counterId);
        this.workOrderId = `WO-${year}${month}${day}-${String(seq).padStart(4, '0')}`;
    }

    // Auto-generate workOrderNumber if not provided
    if (!this.workOrderNumber) {
        this.workOrderNumber = this.workOrderId;
    }

    // Calculate item amounts
    this.requiredItems.forEach(item => {
        item.amount = (item.requiredQty || 0) * (item.rate || 0);
    });

    // Update status based on production
    if (this.producedQty >= this.qty && this.status === 'in_progress') {
        this.status = 'completed';
        if (!this.actualEndDate) {
            this.actualEndDate = new Date();
        }
    }

    next();
});

// ============ STATIC METHODS ============

/**
 * Get work orders by status
 */
workOrderSchema.statics.getByStatus = function(status, firmId = null) {
    const query = { status };
    if (firmId) query.firmId = firmId;

    return this.find(query)
        .populate('itemId', 'itemCode itemName')
        .populate('bomId', 'bomNumber')
        .populate('targetWarehouse', 'name')
        .sort({ plannedStartDate: 1 });
};

/**
 * Get overdue work orders
 */
workOrderSchema.statics.getOverdueOrders = function(firmId = null) {
    const query = {
        status: { $in: ['not_started', 'in_progress'] },
        plannedEndDate: { $lt: new Date() }
    };
    if (firmId) query.firmId = firmId;

    return this.find(query)
        .populate('itemId', 'itemCode itemName')
        .sort({ plannedEndDate: 1 });
};

/**
 * Create work order from BOM
 */
workOrderSchema.statics.createFromBOM = async function(data) {
    const BOM = require('./bom.model');

    const bom = await BOM.findById(data.bomId).populate('items.itemId');
    if (!bom) throw new Error('BOM not found');

    const workOrder = new this({
        ...data,
        itemId: bom.itemId,
        itemCode: bom.itemCode,
        itemName: bom.itemName,
        bomNumber: bom.bomNumber,
        requiredItems: bom.items.map(item => ({
            itemId: item.itemId._id,
            itemCode: item.itemCode,
            itemName: item.itemName,
            requiredQty: item.qty * data.qty,
            uom: item.uom,
            sourceWarehouse: item.sourceWarehouse,
            rate: item.rate,
            amount: item.qty * data.qty * item.rate
        })),
        operations: bom.operations.map(op => ({
            operation: op.operation,
            workstation: op.workstation,
            plannedTime: op.timeInMins,
            status: 'pending',
            sequence: op.sequence
        }))
    });

    return workOrder;
};

// ============ INSTANCE METHODS ============

/**
 * Start production
 */
workOrderSchema.methods.startProduction = async function() {
    if (this.status !== 'submitted' && this.status !== 'not_started') {
        throw new Error('Cannot start production. Work order must be submitted first.');
    }

    this.status = 'in_progress';
    this.actualStartDate = new Date();
    await this.save();

    return this;
};

/**
 * Complete production
 */
workOrderSchema.methods.completeProduction = async function(completedQty) {
    this.producedQty = completedQty || this.qty;
    this.status = 'completed';
    this.actualEndDate = new Date();
    await this.save();

    return this;
};

module.exports = mongoose.model('WorkOrder', workOrderSchema);
