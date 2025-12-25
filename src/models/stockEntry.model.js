const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Stock Entry Model - Stock Movement Transactions
 *
 * Tracks all stock movements including receipts, issues, transfers,
 * manufacturing, and repacking operations.
 */

// ============ STOCK ENTRY ITEM SCHEMA ============
const stockEntryItemSchema = new Schema({
    itemId: {
        type: Schema.Types.ObjectId,
        ref: 'Item',
        required: true,
        index: true
    },
    itemCode: {
        type: String,
        required: true,
        trim: true
    },
    itemName: {
        type: String,
        required: true,
        trim: true
    },
    qty: {
        type: Number,
        required: true,
        min: 0.000001
    },
    uom: {
        type: String,
        required: true,
        trim: true
    },
    conversionFactor: {
        type: Number,
        default: 1,
        min: 0.000001
    },
    stockQty: {
        type: Number,
        required: true,
        min: 0.000001
    },
    rate: {
        type: Number,
        min: 0,
        default: 0
    },
    amount: {
        type: Number,
        default: 0
    },
    sourceWarehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse'
    },
    targetWarehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse'
    },
    batchNo: {
        type: String,
        trim: true
    },
    serialNo: {
        type: String,
        trim: true
    },
    expiryDate: {
        type: Date
    }
}, { _id: true });

// ============ MAIN STOCK ENTRY SCHEMA ============
const stockEntrySchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
    },

    // ============ IDENTIFICATION ============
    stockEntryId: {
        type: String,
        unique: true,
        index: true
    },

    // ============ ENTRY TYPE ============
    entryType: {
        type: String,
        enum: ['receipt', 'issue', 'transfer', 'manufacture', 'repack', 'material_consumption'],
        required: true,
        index: true
    },

    // ============ POSTING DATE/TIME ============
    postingDate: {
        type: Date,
        required: [true, 'Posting date is required'],
        index: true
    },
    postingTime: {
        type: String,
        trim: true
    },

    // ============ WAREHOUSES ============
    fromWarehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse',
        index: true
    },
    toWarehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse',
        index: true
    },

    // ============ ITEMS ============
    items: [stockEntryItemSchema],

    // ============ TOTALS ============
    totalQty: {
        type: Number,
        default: 0,
        min: 0
    },
    totalAmount: {
        type: Number,
        default: 0,
        min: 0
    },

    // ============ REFERENCES ============
    referenceType: {
        type: String,
        trim: true
    },
    referenceId: {
        type: Schema.Types.ObjectId
    },
    purchaseOrderId: {
        type: Schema.Types.ObjectId,
        ref: 'PurchaseOrder'
    },
    salesOrderId: {
        type: Schema.Types.ObjectId,
        ref: 'SalesOrder'
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
        enum: [0, 1, 2],  // 0: Draft, 1: Submitted, 2: Cancelled
        default: 0,
        index: true
    },

    // ============ ADDITIONAL ============
    remarks: {
        type: String,
        trim: true,
        maxlength: [1000, 'Remarks cannot exceed 1000 characters']
    },
    company: {
        type: String,
        trim: true
    },

    // ============ AUDIT ============
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    submittedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    submittedAt: {
        type: Date
    },
    cancelledBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    cancelledAt: {
        type: Date
    }

}, {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ============ INDEXES ============
stockEntrySchema.index({ firmId: 1, stockEntryId: 1 }, { unique: true });
stockEntrySchema.index({ firmId: 1, entryType: 1, status: 1 });
stockEntrySchema.index({ firmId: 1, postingDate: -1 });
stockEntrySchema.index({ fromWarehouse: 1, status: 1 });
stockEntrySchema.index({ toWarehouse: 1, status: 1 });
stockEntrySchema.index({ 'items.itemId': 1, status: 1 });
stockEntrySchema.index({ purchaseOrderId: 1 });
stockEntrySchema.index({ salesOrderId: 1 });

// ============ VIRTUALS ============
stockEntrySchema.virtual('isSubmitted').get(function() {
    return this.status === 'submitted' && this.docStatus === 1;
});

stockEntrySchema.virtual('isCancelled').get(function() {
    return this.status === 'cancelled' && this.docStatus === 2;
});

// ============ STATICS ============
/**
 * Generate unique stock entry ID using atomic counter
 * Format: SE-YYYYMMDD-XXXX (e.g., SE-20250101-0001)
 */
stockEntrySchema.statics.generateStockEntryId = async function(firmId = null) {
    const Counter = require('./counter.model');
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    const counterId = firmId
        ? `stockentry_${firmId}_${dateStr}`
        : `stockentry_global_${dateStr}`;

    const seq = await Counter.getNextSequence(counterId);
    return `SE-${dateStr}-${String(seq).padStart(4, '0')}`;
};

/**
 * Get stock entries by date range
 */
stockEntrySchema.statics.getByDateRange = function(startDate, endDate, firmId = null) {
    const query = {
        postingDate: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        },
        status: 'submitted'
    };

    if (firmId) {
        query.firmId = firmId;
    }

    return this.find(query).sort({ postingDate: -1 });
};

// ============ PRE-SAVE MIDDLEWARE ============
stockEntrySchema.pre('save', async function(next) {
    try {
        // Auto-generate stock entry ID if not provided
        if (this.isNew && !this.stockEntryId) {
            this.stockEntryId = await this.constructor.generateStockEntryId(this.firmId);
        }

        // Calculate totals
        this.totalQty = this.items.reduce((sum, item) => sum + (item.qty || 0), 0);
        this.totalAmount = this.items.reduce((sum, item) => sum + (item.amount || 0), 0);

        // Calculate stock qty for each item (qty * conversion factor)
        this.items.forEach(item => {
            item.stockQty = (item.qty || 0) * (item.conversionFactor || 1);
            item.amount = (item.stockQty || 0) * (item.rate || 0);
        });

        // Set posting time if not set
        if (!this.postingTime && this.isModified('postingDate')) {
            const now = new Date();
            this.postingTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        }

        next();
    } catch (error) {
        next(error);
    }
});

// ============ METHODS ============
/**
 * Submit stock entry (post to stock ledger)
 */
stockEntrySchema.methods.submit = async function(userId) {
    if (this.status === 'submitted') {
        throw new Error('Stock entry already submitted');
    }

    if (this.status === 'cancelled') {
        throw new Error('Cannot submit cancelled stock entry');
    }

    if (!this.items || this.items.length === 0) {
        throw new Error('Cannot submit stock entry without items');
    }

    // Validate warehouses based on entry type
    if (this.entryType === 'transfer') {
        if (!this.fromWarehouse || !this.toWarehouse) {
            throw new Error('Transfer requires both source and target warehouse');
        }
        if (this.fromWarehouse.toString() === this.toWarehouse.toString()) {
            throw new Error('Source and target warehouse cannot be the same');
        }
    } else if (this.entryType === 'receipt') {
        if (!this.toWarehouse) {
            throw new Error('Receipt requires target warehouse');
        }
    } else if (this.entryType === 'issue') {
        if (!this.fromWarehouse) {
            throw new Error('Issue requires source warehouse');
        }
    }

    // Post to stock ledger
    await this.postToStockLedger();

    // Update status
    this.status = 'submitted';
    this.docStatus = 1;
    this.submittedBy = userId;
    this.submittedAt = new Date();

    await this.save();
    return this;
};

/**
 * Cancel stock entry (reverse stock ledger entries)
 */
stockEntrySchema.methods.cancel = async function(userId) {
    if (this.status === 'cancelled') {
        throw new Error('Stock entry already cancelled');
    }

    if (this.status !== 'submitted') {
        throw new Error('Can only cancel submitted stock entries');
    }

    // Reverse stock ledger entries
    await this.reverseStockLedger();

    // Update status
    this.status = 'cancelled';
    this.docStatus = 2;
    this.cancelledBy = userId;
    this.cancelledAt = new Date();

    await this.save();
    return this;
};

/**
 * Post to stock ledger
 */
stockEntrySchema.methods.postToStockLedger = async function() {
    const StockLedger = mongoose.model('StockLedger');
    const Bin = mongoose.model('Bin');

    for (const item of this.items) {
        const actualQty = item.stockQty || 0;

        // For transfers, create two ledger entries
        if (this.entryType === 'transfer') {
            // Outgoing from source warehouse
            await StockLedger.createEntry({
                firmId: this.firmId,
                itemId: item.itemId,
                itemCode: item.itemCode,
                warehouseId: this.fromWarehouse,
                postingDate: this.postingDate,
                postingTime: this.postingTime,
                voucherType: 'Stock Entry',
                voucherId: this._id,
                voucherNo: this.stockEntryId,
                actualQty: -actualQty,
                outgoingRate: item.rate,
                valuationRate: item.rate,
                batchNo: item.batchNo,
                serialNo: item.serialNo
            });

            // Incoming to target warehouse
            await StockLedger.createEntry({
                firmId: this.firmId,
                itemId: item.itemId,
                itemCode: item.itemCode,
                warehouseId: this.toWarehouse,
                postingDate: this.postingDate,
                postingTime: this.postingTime,
                voucherType: 'Stock Entry',
                voucherId: this._id,
                voucherNo: this.stockEntryId,
                actualQty: actualQty,
                incomingRate: item.rate,
                valuationRate: item.rate,
                batchNo: item.batchNo,
                serialNo: item.serialNo
            });

            // Update bins
            await Bin.updateStock(this.fromWarehouse, item.itemId, -actualQty, item.rate);
            await Bin.updateStock(this.toWarehouse, item.itemId, actualQty, item.rate);

        } else if (this.entryType === 'receipt') {
            // Incoming to warehouse
            await StockLedger.createEntry({
                firmId: this.firmId,
                itemId: item.itemId,
                itemCode: item.itemCode,
                warehouseId: this.toWarehouse,
                postingDate: this.postingDate,
                postingTime: this.postingTime,
                voucherType: 'Stock Entry',
                voucherId: this._id,
                voucherNo: this.stockEntryId,
                actualQty: actualQty,
                incomingRate: item.rate,
                valuationRate: item.rate,
                batchNo: item.batchNo,
                serialNo: item.serialNo
            });

            // Update bin
            await Bin.updateStock(this.toWarehouse, item.itemId, actualQty, item.rate);

        } else if (this.entryType === 'issue') {
            // Outgoing from warehouse
            await StockLedger.createEntry({
                firmId: this.firmId,
                itemId: item.itemId,
                itemCode: item.itemCode,
                warehouseId: this.fromWarehouse,
                postingDate: this.postingDate,
                postingTime: this.postingTime,
                voucherType: 'Stock Entry',
                voucherId: this._id,
                voucherNo: this.stockEntryId,
                actualQty: -actualQty,
                outgoingRate: item.rate,
                valuationRate: item.rate,
                batchNo: item.batchNo,
                serialNo: item.serialNo
            });

            // Update bin
            await Bin.updateStock(this.fromWarehouse, item.itemId, -actualQty, item.rate);
        }
    }
};

/**
 * Reverse stock ledger entries
 */
stockEntrySchema.methods.reverseStockLedger = async function() {
    const StockLedger = mongoose.model('StockLedger');
    const Bin = mongoose.model('Bin');

    // Find all stock ledger entries for this stock entry
    const ledgerEntries = await StockLedger.find({
        voucherId: this._id,
        voucherType: 'Stock Entry'
    });

    // Reverse each entry
    for (const entry of ledgerEntries) {
        await StockLedger.createEntry({
            firmId: entry.firmId,
            itemId: entry.itemId,
            itemCode: entry.itemCode,
            warehouseId: entry.warehouseId,
            postingDate: new Date(),
            postingTime: new Date().toTimeString().slice(0, 8),
            voucherType: 'Stock Entry - Cancelled',
            voucherId: this._id,
            voucherNo: this.stockEntryId,
            actualQty: -entry.actualQty,
            outgoingRate: entry.actualQty > 0 ? entry.incomingRate : 0,
            incomingRate: entry.actualQty < 0 ? entry.outgoingRate : 0,
            valuationRate: entry.valuationRate,
            batchNo: entry.batchNo,
            serialNo: entry.serialNo
        });

        // Update bin (reverse)
        await Bin.updateStock(entry.warehouseId, entry.itemId, -entry.actualQty, entry.valuationRate);
    }
};

// ═══════════════════════════════════════════════════════════════
// FIRM ISOLATION PLUGIN (RLS-like enforcement)
// ═══════════════════════════════════════════════════════════════
const firmIsolationPlugin = require('./plugins/firmIsolation.plugin');
stockEntrySchema.plugin(firmIsolationPlugin);

module.exports = mongoose.model('StockEntry', stockEntrySchema);
