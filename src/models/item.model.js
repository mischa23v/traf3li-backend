const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Item Model - Inventory Item Management
 *
 * Supports products, services, consumables, and fixed assets with full
 * inventory tracking, pricing, taxation, and supplier management.
 */

// ============ UOM CONVERSION SCHEMA ============
const uomConversionSchema = new Schema({
    uom: {
        type: String,
        required: true,
        trim: true
    },
    conversionFactor: {
        type: Number,
        required: true,
        min: 0.000001
    }
}, { _id: true });

// ============ SUPPLIER ITEM SCHEMA ============
const supplierItemSchema = new Schema({
    supplierId: {
        type: Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true
    },
    supplierPartNo: {
        type: String,
        trim: true
    },
    leadTimeDays: {
        type: Number,
        default: 0,
        min: 0
    },
    minOrderQty: {
        type: Number,
        default: 1,
        min: 0
    },
    isPreferred: {
        type: Boolean,
        default: false
    }
}, { _id: true });

// ============ MAIN ITEM SCHEMA ============
const itemSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
     },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ============ IDENTIFICATION ============
    itemId: {
        type: String,
        unique: true,
        index: true
    },
    itemCode: {
        type: String,
        required: [true, 'Item code is required'],
        unique: true,
        trim: true,
        uppercase: true,
        index: true
    },
    name: {
        type: String,
        required: [true, 'Item name is required'],
        trim: true,
        maxlength: [200, 'Item name cannot exceed 200 characters']
    },
    nameAr: {
        type: String,
        trim: true,
        maxlength: [200, 'Arabic name cannot exceed 200 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    descriptionAr: {
        type: String,
        trim: true,
        maxlength: [2000, 'Arabic description cannot exceed 2000 characters']
    },

    // ============ CLASSIFICATION ============
    itemType: {
        type: String,
        enum: ['product', 'service', 'consumable', 'fixed_asset'],
        default: 'product',
        index: true
    },
    itemGroup: {
        type: String,
        trim: true,
        index: true
    },
    brand: {
        type: String,
        trim: true
    },
    manufacturer: {
        type: String,
        trim: true
    },

    // ============ PRODUCT CODES ============
    sku: {
        type: String,
        trim: true,
        uppercase: true,
        index: true
    },
    barcode: {
        type: String,
        trim: true,
        index: true
    },
    hsnCode: {
        type: String,
        trim: true
    },

    // ============ UNITS OF MEASURE ============
    stockUom: {
        type: String,
        required: [true, 'Stock UOM is required'],
        trim: true
    },
    purchaseUom: {
        type: String,
        trim: true
    },
    salesUom: {
        type: String,
        trim: true
    },
    uomConversions: [uomConversionSchema],

    // ============ PRICING ============
    standardRate: {
        type: Number,
        required: [true, 'Standard rate is required'],
        min: 0,
        default: 0
    },
    valuationRate: {
        type: Number,
        min: 0,
        default: 0
    },
    lastPurchaseRate: {
        type: Number,
        min: 0,
        default: 0
    },
    currency: {
        type: String,
        default: 'SAR',
        uppercase: true
    },

    // ============ TAXATION ============
    taxRate: {
        type: Number,
        min: 0,
        max: 100,
        default: 15  // 15% Saudi VAT
    },
    taxTemplateId: {
        type: Schema.Types.ObjectId,
        ref: 'TaxTemplate'
    },
    isZeroRated: {
        type: Boolean,
        default: false
    },
    isExempt: {
        type: Boolean,
        default: false
    },

    // ============ INVENTORY SETTINGS ============
    isStockItem: {
        type: Boolean,
        default: true,
        index: true
    },
    hasVariants: {
        type: Boolean,
        default: false
    },
    hasBatchNo: {
        type: Boolean,
        default: false,
        index: true
    },
    hasSerialNo: {
        type: Boolean,
        default: false,
        index: true
    },
    hasExpiryDate: {
        type: Boolean,
        default: false
    },
    shelfLifeInDays: {
        type: Number,
        min: 0
    },
    warrantyPeriod: {
        type: Number,
        min: 0
    },

    // ============ REORDER SETTINGS ============
    safetyStock: {
        type: Number,
        min: 0,
        default: 0
    },
    reorderLevel: {
        type: Number,
        min: 0,
        default: 0
    },
    reorderQty: {
        type: Number,
        min: 0,
        default: 0
    },
    leadTimeDays: {
        type: Number,
        min: 0,
        default: 0
    },

    // ============ VALUATION ============
    valuationMethod: {
        type: String,
        enum: ['fifo', 'moving_average', 'lifo'],
        default: 'fifo',
        index: true
    },

    // ============ STATUS ============
    status: {
        type: String,
        enum: ['active', 'inactive', 'discontinued'],
        default: 'active',
        index: true
    },
    disabled: {
        type: Boolean,
        default: false,
        index: true
    },

    // ============ MEDIA ============
    image: {
        type: String,
        trim: true
    },
    images: [{
        type: String,
        trim: true
    }],

    // ============ PHYSICAL ATTRIBUTES ============
    weightPerUnit: {
        type: Number,
        min: 0
    },
    weightUom: {
        type: String,
        trim: true,
        default: 'kg'
    },

    // ============ SUPPLIER MANAGEMENT ============
    defaultSupplier: {
        type: Schema.Types.ObjectId,
        ref: 'Vendor'
    },
    supplierItems: [supplierItemSchema],

    // ============ ADDITIONAL ============
    tags: [{
        type: String,
        trim: true
    }],
    customFields: {
        type: Map,
        of: Schema.Types.Mixed
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
itemSchema.index({ firmId: 1, itemCode: 1 }, { unique: true });
itemSchema.index({ firmId: 1, status: 1, itemType: 1 });
itemSchema.index({ firmId: 1, itemGroup: 1, status: 1 });
itemSchema.index({ firmId: 1, isStockItem: 1, status: 1 });
itemSchema.index({ barcode: 1 });
itemSchema.index({ sku: 1 });
itemSchema.index({ name: 'text', nameAr: 'text', description: 'text' });

// ============ VIRTUALS ============
itemSchema.virtual('displayName').get(function() {
    return this.name || this.itemCode;
});

itemSchema.virtual('isService').get(function() {
    return this.itemType === 'service';
});

// ============ STATICS ============
/**
 * Generate unique item ID using atomic counter
 * Format: ITM-YYYYMMDD-XXXX (e.g., ITM-20250101-0001)
 */
itemSchema.statics.generateItemId = async function(firmId = null) {
    const Counter = require('./counter.model');
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    const counterId = firmId
        ? `item_${firmId}_${dateStr}`
        : `item_global_${dateStr}`;

    const seq = await Counter.getNextSequence(counterId);
    return `ITM-${dateStr}-${String(seq).padStart(4, '0')}`;
};

/**
 * Find items needing reorder
 */
itemSchema.statics.getReorderItems = async function(firmId = null) {
    const Bin = mongoose.model('Bin');

    const query = {
        isStockItem: true,
        status: 'active',
        disabled: false,
        reorderLevel: { $gt: 0 }
    };

    if (firmId) {
        query.firmId = firmId;
    }

    const items = await this.find(query).lean();
    const reorderItems = [];

    for (const item of items) {
        const bins = await Bin.find({ itemId: item._id });
        const totalQty = bins.reduce((sum, bin) => sum + (bin.actualQty || 0), 0);

        if (totalQty <= item.reorderLevel) {
            reorderItems.push({
                ...item,
                currentStock: totalQty,
                shortfall: item.reorderLevel - totalQty
            });
        }
    }

    return reorderItems;
};

/**
 * Get item by code
 */
itemSchema.statics.findByCode = function(itemCode, firmId = null) {
    const query = { itemCode: itemCode.toUpperCase() };
    if (firmId) {
        query.firmId = firmId;
    }
    return this.findOne(query);
};

// ============ PRE-SAVE MIDDLEWARE ============
itemSchema.pre('save', async function(next) {
    try {
        // Auto-generate item ID if not provided
        if (this.isNew && !this.itemId) {
            this.itemId = await this.constructor.generateItemId(this.firmId);
        }

        // Uppercase item code
        if (this.itemCode) {
            this.itemCode = this.itemCode.toUpperCase();
        }

        // Set default UOMs
        if (!this.purchaseUom) {
            this.purchaseUom = this.stockUom;
        }
        if (!this.salesUom) {
            this.salesUom = this.stockUom;
        }

        // Auto-set isStockItem based on itemType
        if (this.itemType === 'service') {
            this.isStockItem = false;
        } else if (this.itemType === 'product') {
            this.isStockItem = true;
        }

        next();
    } catch (error) {
        next(error);
    }
});

// ============ METHODS ============
/**
 * Get current stock across all warehouses
 */
itemSchema.methods.getCurrentStock = async function() {
    const Bin = mongoose.model('Bin');

    const bins = await Bin.find({ itemId: this._id });
    const totalQty = bins.reduce((sum, bin) => sum + (bin.actualQty || 0), 0);

    return totalQty;
};

/**
 * Get stock by warehouse
 */
itemSchema.methods.getStockByWarehouse = async function(warehouseId) {
    const Bin = mongoose.model('Bin');

    const bin = await Bin.findOne({
        itemId: this._id,
        warehouseId: warehouseId
    });

    return bin ? bin.actualQty : 0;
};

/**
 * Check if item needs reorder
 */
itemSchema.methods.needsReorder = async function() {
    if (!this.isStockItem || !this.reorderLevel) {
        return false;
    }

    const currentStock = await this.getCurrentStock();
    return currentStock <= this.reorderLevel;
};

module.exports = mongoose.model('Item', itemSchema);
