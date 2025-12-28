const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Stock Ledger Entry Model - Immutable Stock Transaction Log
 *
 * Read-only ledger that tracks every stock movement.
 * Auto-populated by stock transactions (Stock Entry, Sales Invoice, Purchase Receipt, etc.)
 * This is the single source of truth for stock quantities and valuations.
 */

const stockLedgerSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ============ IDENTIFICATION ============
    stockLedgerId: {
        type: String,
        unique: true,
        index: true
    },

    // ============ ITEM & WAREHOUSE ============
    itemId: {
        type: Schema.Types.ObjectId,
        ref: 'Item',
        required: true,
        index: true
    },
    itemCode: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    warehouseId: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: true,
        index: true
    },
    warehouseName: {
        type: String,
        trim: true
    },

    // ============ POSTING DATE/TIME ============
    postingDate: {
        type: Date,
        required: true,
        index: true
    },
    postingTime: {
        type: String,
        trim: true
    },

    // ============ VOUCHER REFERENCE ============
    voucherType: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    voucherId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true
    },
    voucherNo: {
        type: String,
        trim: true,
        index: true
    },

    // ============ QUANTITY ============
    actualQty: {
        type: Number,
        required: true,
        default: 0
    },
    qtyAfterTransaction: {
        type: Number,
        default: 0
    },

    // ============ RATES & VALUATION ============
    incomingRate: {
        type: Number,
        default: 0,
        min: 0
    },
    outgoingRate: {
        type: Number,
        default: 0,
        min: 0
    },
    valuationRate: {
        type: Number,
        default: 0,
        min: 0
    },
    stockValue: {
        type: Number,
        default: 0
    },
    stockValueDifference: {
        type: Number,
        default: 0
    },

    // ============ BATCH/SERIAL TRACKING ============
    batchNo: {
        type: String,
        trim: true,
        index: true
    },
    serialNo: {
        type: String,
        trim: true,
        index: true
    },

    // ============ COMPANY ============
    company: {
        type: String,
        trim: true
    },

    // ============ AUDIT ============
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }

}, {
    timestamps: { createdAt: true, updatedAt: false },  // Only createdAt, no updates
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ============ INDEXES ============
stockLedgerSchema.index({ firmId: 1, itemId: 1, warehouseId: 1, postingDate: -1 });
stockLedgerSchema.index({ firmId: 1, itemId: 1, postingDate: -1 });
stockLedgerSchema.index({ firmId: 1, warehouseId: 1, postingDate: -1 });
stockLedgerSchema.index({ voucherId: 1, voucherType: 1 });
stockLedgerSchema.index({ batchNo: 1 });
stockLedgerSchema.index({ serialNo: 1 });
stockLedgerSchema.index({ postingDate: -1, postingTime: -1 });

// ============ VIRTUALS ============
stockLedgerSchema.virtual('isIncoming').get(function() {
    return this.actualQty > 0;
});

stockLedgerSchema.virtual('isOutgoing').get(function() {
    return this.actualQty < 0;
});

// ============ STATICS ============
/**
 * Generate unique stock ledger ID
 */
stockLedgerSchema.statics.generateStockLedgerId = async function() {
    const Counter = require('./counter.model');
    const seq = await Counter.getNextSequence('stockledger');
    return `SLE-${String(seq).padStart(10, '0')}`;
};

/**
 * Create a stock ledger entry with automatic valuation
 */
stockLedgerSchema.statics.createEntry = async function(data) {
    const {
        firmId,
        itemId,
        itemCode,
        warehouseId,
        postingDate,
        postingTime,
        voucherType,
        voucherId,
        voucherNo,
        actualQty,
        incomingRate = 0,
        outgoingRate = 0,
        valuationRate = 0,
        batchNo,
        serialNo,
        company
    } = data;

    // Get warehouse name
    const Warehouse = mongoose.model('Warehouse');
    const warehouse = await Warehouse.findById(warehouseId);
    const warehouseName = warehouse ? warehouse.name : '';

    // Get current stock and valuation
    const previousEntry = await this.findOne({
        itemId,
        warehouseId
    }).sort({ postingDate: -1, postingTime: -1, createdAt: -1 });

    const previousQty = previousEntry ? previousEntry.qtyAfterTransaction : 0;
    const previousValue = previousEntry ? previousEntry.stockValue : 0;

    // Calculate new quantity
    const qtyAfterTransaction = previousQty + actualQty;

    // Calculate valuation rate based on method (default: FIFO/Moving Average)
    let finalValuationRate = valuationRate;
    let stockValue = 0;
    let stockValueDifference = 0;

    if (actualQty > 0) {
        // Incoming stock - use incoming rate
        finalValuationRate = incomingRate || valuationRate;
        stockValue = qtyAfterTransaction * finalValuationRate;
        stockValueDifference = actualQty * finalValuationRate;
    } else if (actualQty < 0) {
        // Outgoing stock - use existing valuation rate
        finalValuationRate = outgoingRate || (previousEntry ? previousEntry.valuationRate : 0);
        stockValue = qtyAfterTransaction * finalValuationRate;
        stockValueDifference = actualQty * finalValuationRate;
    } else {
        // No quantity change
        finalValuationRate = previousEntry ? previousEntry.valuationRate : 0;
        stockValue = previousValue;
        stockValueDifference = 0;
    }

    // For moving average, recalculate valuation rate
    if (actualQty > 0 && previousQty > 0) {
        // Moving average: (previous_value + new_value) / total_qty
        const newValue = actualQty * incomingRate;
        finalValuationRate = (previousValue + newValue) / qtyAfterTransaction;
        stockValue = qtyAfterTransaction * finalValuationRate;
        stockValueDifference = stockValue - previousValue;
    }

    // Generate stock ledger ID
    const stockLedgerId = await this.generateStockLedgerId();

    // Create entry
    const entry = new this({
        firmId,
        stockLedgerId,
        itemId,
        itemCode,
        warehouseId,
        warehouseName,
        postingDate,
        postingTime,
        voucherType,
        voucherId,
        voucherNo,
        actualQty,
        qtyAfterTransaction,
        incomingRate,
        outgoingRate,
        valuationRate: finalValuationRate,
        stockValue,
        stockValueDifference,
        batchNo,
        serialNo,
        company
    });

    await entry.save();
    return entry;
};

/**
 * Get stock balance for item in warehouse
 */
stockLedgerSchema.statics.getStockBalance = async function(itemId, warehouseId, asOfDate = null) {
    const query = { itemId, warehouseId };

    if (asOfDate) {
        query.postingDate = { $lte: new Date(asOfDate) };
    }

    const lastEntry = await this.findOne(query)
        .sort({ postingDate: -1, postingTime: -1, createdAt: -1 });

    return {
        qty: lastEntry ? lastEntry.qtyAfterTransaction : 0,
        valuationRate: lastEntry ? lastEntry.valuationRate : 0,
        stockValue: lastEntry ? lastEntry.stockValue : 0,
        asOfDate: asOfDate || new Date()
    };
};

/**
 * Get stock ledger report
 */
stockLedgerSchema.statics.getStockLedgerReport = async function(filters = {}) {
    const {
        itemId,
        warehouseId,
        fromDate,
        toDate,
        voucherType,
        firmId
    } = filters;

    const query = {};

    if (firmId) query.firmId = firmId;
    if (itemId) query.itemId = itemId;
    if (warehouseId) query.warehouseId = warehouseId;
    if (voucherType) query.voucherType = voucherType;

    if (fromDate || toDate) {
        query.postingDate = {};
        if (fromDate) query.postingDate.$gte = new Date(fromDate);
        if (toDate) query.postingDate.$lte = new Date(toDate);
    }

    return await this.find(query)
        .sort({ postingDate: 1, postingTime: 1, createdAt: 1 })
        .populate('itemId', 'itemCode name')
        .populate('warehouseId', 'name')
        .lean();
};

/**
 * Get stock summary by item
 */
stockLedgerSchema.statics.getStockSummary = async function(firmId = null) {
    const matchStage = firmId ? { firmId } : {};

    const result = await this.aggregate([
        { $match: matchStage },
        { $sort: { postingDate: -1, postingTime: -1, createdAt: -1 } },
        {
            $group: {
                _id: {
                    itemId: '$itemId',
                    warehouseId: '$warehouseId'
                },
                lastEntry: { $first: '$$ROOT' }
            }
        },
        {
            $replaceRoot: { newRoot: '$lastEntry' }
        },
        {
            $group: {
                _id: '$itemId',
                totalQty: { $sum: '$qtyAfterTransaction' },
                totalValue: { $sum: '$stockValue' },
                warehouses: {
                    $push: {
                        warehouseId: '$warehouseId',
                        qty: '$qtyAfterTransaction',
                        valuationRate: '$valuationRate',
                        stockValue: '$stockValue'
                    }
                }
            }
        }
    ]);

    return result;
};

// ============ PRE-SAVE MIDDLEWARE ============
stockLedgerSchema.pre('save', async function(next) {
    try {
        // Auto-generate stock ledger ID if not provided
        if (this.isNew && !this.stockLedgerId) {
            this.stockLedgerId = await this.constructor.generateStockLedgerId();
        }

        // Set posting time if not set
        if (!this.postingTime) {
            const now = new Date();
            this.postingTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        }

        next();
    } catch (error) {
        next(error);
    }
});

// ============ PREVENT UPDATES ============
stockLedgerSchema.pre('updateOne', function(next) {
    const error = new Error('Stock Ledger entries cannot be updated');
    error.statusCode = 403;
    next(error);
});

stockLedgerSchema.pre('findOneAndUpdate', function(next) {
    const error = new Error('Stock Ledger entries cannot be updated');
    error.statusCode = 403;
    next(error);
});

stockLedgerSchema.pre('updateMany', function(next) {
    const error = new Error('Stock Ledger entries cannot be updated');
    error.statusCode = 403;
    next(error);
});

module.exports = mongoose.model('StockLedger', stockLedgerSchema);
