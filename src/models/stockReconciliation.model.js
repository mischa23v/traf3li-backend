const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Stock Reconciliation Model - Physical Stock Count
 *
 * Adjusts system stock to match physical count.
 * Used for periodic inventory audits and corrections.
 */

// ============ RECONCILIATION ITEM SCHEMA ============
const reconciliationItemSchema = new Schema({
    itemId: {
        type: Schema.Types.ObjectId,
        ref: 'Item',
        required: true
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
    warehouseId: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: true
    },
    currentQty: {
        type: Number,
        default: 0
    },
    qty: {
        type: Number,
        required: true,
        min: 0
    },
    quantityDifference: {
        type: Number,
        default: 0
    },
    currentValuationRate: {
        type: Number,
        default: 0,
        min: 0
    },
    valuationRate: {
        type: Number,
        min: 0
    },
    currentAmount: {
        type: Number,
        default: 0
    },
    amount: {
        type: Number,
        default: 0
    },
    amountDifference: {
        type: Number,
        default: 0
    }
}, { _id: true });

// ============ MAIN STOCK RECONCILIATION SCHEMA ============
const stockReconciliationSchema = new Schema({
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
    reconciliationId: {
        type: String,
        unique: true,
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

    // ============ ITEMS ============
    items: [reconciliationItemSchema],

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
stockReconciliationSchema.index({ firmId: 1, reconciliationId: 1 }, { unique: true });
stockReconciliationSchema.index({ firmId: 1, status: 1 });
stockReconciliationSchema.index({ firmId: 1, postingDate: -1 });

// ============ VIRTUALS ============
stockReconciliationSchema.virtual('isSubmitted').get(function() {
    return this.status === 'submitted' && this.docStatus === 1;
});

stockReconciliationSchema.virtual('totalDifference').get(function() {
    return this.items.reduce((sum, item) => sum + (item.quantityDifference || 0), 0);
});

// ============ STATICS ============
/**
 * Generate unique reconciliation ID
 * Format: SR-YYYYMMDD-XXXX (e.g., SR-20250101-0001)
 */
stockReconciliationSchema.statics.generateReconciliationId = async function(firmId = null) {
    const Counter = require('./counter.model');
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    const counterId = firmId
        ? `reconciliation_${firmId}_${dateStr}`
        : `reconciliation_global_${dateStr}`;

    const seq = await Counter.getNextSequence(counterId);
    return `SR-${dateStr}-${String(seq).padStart(4, '0')}`;
};

// ============ PRE-SAVE MIDDLEWARE ============
stockReconciliationSchema.pre('save', async function(next) {
    try {
        // Auto-generate reconciliation ID if not provided
        if (this.isNew && !this.reconciliationId) {
            this.reconciliationId = await this.constructor.generateReconciliationId(this.firmId);
        }

        // Get current stock for each item and calculate differences
        const Bin = mongoose.model('Bin');

        for (const item of this.items) {
            const bin = await Bin.findOne({
                itemId: item.itemId,
                warehouseId: item.warehouseId
            });

            if (bin) {
                item.currentQty = bin.actualQty;
                item.currentValuationRate = bin.valuationRate;
                item.currentAmount = bin.stockValue;
            } else {
                item.currentQty = 0;
                item.currentValuationRate = 0;
                item.currentAmount = 0;
            }

            // Use current valuation rate if not provided
            if (!item.valuationRate) {
                item.valuationRate = item.currentValuationRate;
            }

            // Calculate differences
            item.quantityDifference = item.qty - item.currentQty;
            item.amount = item.qty * item.valuationRate;
            item.amountDifference = item.amount - item.currentAmount;
        }

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
 * Submit reconciliation (adjust stock)
 */
stockReconciliationSchema.methods.submit = async function(userId) {
    if (this.status === 'submitted') {
        throw new Error('Reconciliation already submitted');
    }

    if (this.status === 'cancelled') {
        throw new Error('Cannot submit cancelled reconciliation');
    }

    if (!this.items || this.items.length === 0) {
        throw new Error('Cannot submit reconciliation without items');
    }

    // Create stock entries for adjustments
    await this.createStockAdjustments();

    // Update status
    this.status = 'submitted';
    this.docStatus = 1;
    this.submittedBy = userId;
    this.submittedAt = new Date();

    await this.save();
    return this;
};

/**
 * Cancel reconciliation
 */
stockReconciliationSchema.methods.cancel = async function(userId) {
    if (this.status === 'cancelled') {
        throw new Error('Reconciliation already cancelled');
    }

    if (this.status !== 'submitted') {
        throw new Error('Can only cancel submitted reconciliations');
    }

    // Reverse stock adjustments
    await this.reverseStockAdjustments();

    // Update status
    this.status = 'cancelled';
    this.docStatus = 2;
    this.cancelledBy = userId;
    this.cancelledAt = new Date();

    await this.save();
    return this;
};

/**
 * Create stock adjustments
 */
stockReconciliationSchema.methods.createStockAdjustments = async function() {
    const StockLedger = mongoose.model('StockLedger');
    const Bin = mongoose.model('Bin');

    for (const item of this.items) {
        if (item.quantityDifference !== 0) {
            // Create stock ledger entry
            await StockLedger.createEntry({
                firmId: this.firmId,
                itemId: item.itemId,
                itemCode: item.itemCode,
                warehouseId: item.warehouseId,
                postingDate: this.postingDate,
                postingTime: this.postingTime,
                voucherType: 'Stock Reconciliation',
                voucherId: this._id,
                voucherNo: this.reconciliationId,
                actualQty: item.quantityDifference,
                incomingRate: item.quantityDifference > 0 ? item.valuationRate : 0,
                outgoingRate: item.quantityDifference < 0 ? item.valuationRate : 0,
                valuationRate: item.valuationRate
            });

            // Update bin
            await Bin.updateStock(item.warehouseId, item.itemId, item.quantityDifference, item.valuationRate);
        }
    }
};

/**
 * Reverse stock adjustments
 */
stockReconciliationSchema.methods.reverseStockAdjustments = async function() {
    const StockLedger = mongoose.model('StockLedger');
    const Bin = mongoose.model('Bin');

    for (const item of this.items) {
        if (item.quantityDifference !== 0) {
            // Create reversal entry
            await StockLedger.createEntry({
                firmId: this.firmId,
                itemId: item.itemId,
                itemCode: item.itemCode,
                warehouseId: item.warehouseId,
                postingDate: new Date(),
                postingTime: new Date().toTimeString().slice(0, 8),
                voucherType: 'Stock Reconciliation - Cancelled',
                voucherId: this._id,
                voucherNo: this.reconciliationId,
                actualQty: -item.quantityDifference,
                incomingRate: item.quantityDifference < 0 ? item.valuationRate : 0,
                outgoingRate: item.quantityDifference > 0 ? item.valuationRate : 0,
                valuationRate: item.valuationRate
            });

            // Update bin (reverse)
            await Bin.updateStock(item.warehouseId, item.itemId, -item.quantityDifference, item.valuationRate);
        }
    }
};

module.exports = mongoose.model('StockReconciliation', stockReconciliationSchema);
