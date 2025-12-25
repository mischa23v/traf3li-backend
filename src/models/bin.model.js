const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Bin Model - Warehouse Bin (Stock by Item-Warehouse)
 *
 * Maintains current stock levels for each item in each warehouse.
 * Updated in real-time by stock transactions.
 */

const binSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
    },

    // ============ ITEM & WAREHOUSE ============
    itemId: {
        type: Schema.Types.ObjectId,
        ref: 'Item',
        required: true,
        index: true
    },
    warehouseId: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: true,
        index: true
    },

    // ============ QUANTITIES ============
    actualQty: {
        type: Number,
        default: 0
    },
    plannedQty: {
        type: Number,
        default: 0
    },
    reservedQty: {
        type: Number,
        default: 0,
        min: 0
    },
    orderedQty: {
        type: Number,
        default: 0,
        min: 0
    },
    projectedQty: {
        type: Number,
        default: 0
    },
    indentedQty: {
        type: Number,
        default: 0,
        min: 0
    },

    // ============ VALUATION ============
    valuationRate: {
        type: Number,
        default: 0,
        min: 0
    },
    stockValue: {
        type: Number,
        default: 0
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
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ============ INDEXES ============
binSchema.index({ firmId: 1, itemId: 1, warehouseId: 1 }, { unique: true });
binSchema.index({ firmId: 1, warehouseId: 1 });
binSchema.index({ firmId: 1, itemId: 1 });
binSchema.index({ actualQty: 1 });

// ============ VIRTUALS ============
binSchema.virtual('availableQty').get(function() {
    return this.actualQty - this.reservedQty;
});

binSchema.virtual('incomingQty').get(function() {
    return this.orderedQty + this.plannedQty;
});

// ============ STATICS ============
/**
 * Update stock for item in warehouse
 */
binSchema.statics.updateStock = async function(warehouseId, itemId, qty, rate = 0) {
    // Find or create bin
    let bin = await this.findOne({ itemId, warehouseId });

    if (!bin) {
        bin = new this({
            itemId,
            warehouseId,
            actualQty: 0,
            valuationRate: 0,
            stockValue: 0
        });
    }

    // Update quantities
    const previousQty = bin.actualQty;
    const previousValue = bin.stockValue;

    bin.actualQty = previousQty + qty;

    // Update valuation rate (moving average)
    if (qty > 0 && rate > 0) {
        // Incoming stock
        const newValue = qty * rate;
        const totalValue = previousValue + newValue;
        bin.valuationRate = bin.actualQty > 0 ? totalValue / bin.actualQty : rate;
        bin.stockValue = totalValue;
    } else if (qty < 0) {
        // Outgoing stock
        const outgoingValue = Math.abs(qty) * bin.valuationRate;
        bin.stockValue = previousValue - outgoingValue;
    } else {
        // No change or zero rate
        bin.stockValue = bin.actualQty * bin.valuationRate;
    }

    // Calculate projected quantity
    bin.projectedQty = bin.actualQty + bin.orderedQty - bin.reservedQty - bin.indentedQty;

    await bin.save();
    return bin;
};

/**
 * Reserve stock
 */
binSchema.statics.reserveStock = async function(warehouseId, itemId, qty) {
    const bin = await this.findOne({ itemId, warehouseId });

    if (!bin) {
        throw new Error('No stock found for this item in warehouse');
    }

    if (bin.availableQty < qty) {
        throw new Error('Insufficient available stock');
    }

    bin.reservedQty += qty;
    bin.projectedQty = bin.actualQty + bin.orderedQty - bin.reservedQty - bin.indentedQty;

    await bin.save();
    return bin;
};

/**
 * Release reservation
 */
binSchema.statics.releaseReservation = async function(warehouseId, itemId, qty) {
    const bin = await this.findOne({ itemId, warehouseId });

    if (!bin) {
        throw new Error('Bin not found');
    }

    bin.reservedQty = Math.max(0, bin.reservedQty - qty);
    bin.projectedQty = bin.actualQty + bin.orderedQty - bin.reservedQty - bin.indentedQty;

    await bin.save();
    return bin;
};

/**
 * Get stock summary by item
 */
binSchema.statics.getStockSummaryByItem = async function(itemId, firmId = null) {
    const query = { itemId };
    if (firmId) {
        query.firmId = firmId;
    }

    const bins = await this.find(query).populate('warehouseId', 'name');

    const summary = {
        totalQty: 0,
        totalReserved: 0,
        totalAvailable: 0,
        totalValue: 0,
        warehouses: []
    };

    bins.forEach(bin => {
        summary.totalQty += bin.actualQty;
        summary.totalReserved += bin.reservedQty;
        summary.totalAvailable += bin.availableQty;
        summary.totalValue += bin.stockValue;

        summary.warehouses.push({
            warehouseId: bin.warehouseId._id,
            warehouseName: bin.warehouseId.name,
            actualQty: bin.actualQty,
            reservedQty: bin.reservedQty,
            availableQty: bin.availableQty,
            valuationRate: bin.valuationRate,
            stockValue: bin.stockValue
        });
    });

    return summary;
};

/**
 * Get stock summary by warehouse
 */
binSchema.statics.getStockSummaryByWarehouse = async function(warehouseId, firmId = null) {
    const query = { warehouseId };
    if (firmId) {
        query.firmId = firmId;
    }

    const bins = await this.find(query).populate('itemId', 'itemCode name');

    const summary = {
        totalValue: 0,
        itemCount: 0,
        items: []
    };

    bins.forEach(bin => {
        if (bin.actualQty > 0) {
            summary.itemCount++;
            summary.totalValue += bin.stockValue;

            summary.items.push({
                itemId: bin.itemId._id,
                itemCode: bin.itemId.itemCode,
                itemName: bin.itemId.name,
                actualQty: bin.actualQty,
                reservedQty: bin.reservedQty,
                availableQty: bin.availableQty,
                valuationRate: bin.valuationRate,
                stockValue: bin.stockValue
            });
        }
    });

    return summary;
};

/**
 * Get low stock items
 */
binSchema.statics.getLowStockItems = async function(firmId = null) {
    const Item = mongoose.model('Item');

    const query = {
        isStockItem: true,
        status: 'active',
        disabled: false,
        reorderLevel: { $gt: 0 }
    };

    if (firmId) {
        query.firmId = firmId;
    }

    const items = await Item.find(query).lean();
    const lowStockItems = [];

    for (const item of items) {
        const binQuery = { itemId: item._id };
        if (firmId) {
            binQuery.firmId = firmId;
        }

        const bins = await this.find(binQuery);
        const totalQty = bins.reduce((sum, bin) => sum + (bin.actualQty || 0), 0);

        if (totalQty <= item.reorderLevel) {
            lowStockItems.push({
                itemId: item._id,
                itemCode: item.itemCode,
                itemName: item.name,
                currentStock: totalQty,
                reorderLevel: item.reorderLevel,
                reorderQty: item.reorderQty,
                shortfall: item.reorderLevel - totalQty
            });
        }
    }

    return lowStockItems;
};

// ============ PRE-SAVE MIDDLEWARE ============
binSchema.pre('save', function(next) {
    // Ensure non-negative values
    this.actualQty = Math.max(0, this.actualQty || 0);
    this.reservedQty = Math.max(0, this.reservedQty || 0);
    this.orderedQty = Math.max(0, this.orderedQty || 0);
    this.indentedQty = Math.max(0, this.indentedQty || 0);

    // Calculate projected quantity
    this.projectedQty = this.actualQty + this.orderedQty - this.reservedQty - this.indentedQty;

    // Calculate stock value
    this.stockValue = this.actualQty * (this.valuationRate || 0);

    next();
});

// ============ METHODS ============
/**
 * Check if stock is available
 */
binSchema.methods.hasAvailableStock = function(qty) {
    return this.availableQty >= qty;
};

// ═══════════════════════════════════════════════════════════════
// FIRM ISOLATION PLUGIN (RLS-like enforcement)
// ═══════════════════════════════════════════════════════════════
const firmIsolationPlugin = require('./plugins/firmIsolation.plugin');
binSchema.plugin(firmIsolationPlugin);

module.exports = mongoose.model('Bin', binSchema);
