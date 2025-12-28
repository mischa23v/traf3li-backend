const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Inventory Settings Model - Firm-level Inventory Configuration
 *
 * Stores inventory management preferences and defaults for each firm.
 */

const inventorySettingsSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy) - Required for Settings
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        unique: true,
        required: true,
        index: true
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ============ DEFAULT WAREHOUSE ============
    defaultWarehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse'
    },

    // ============ VALUATION ============
    defaultValuationMethod: {
        type: String,
        enum: ['fifo', 'moving_average', 'lifo'],
        default: 'fifo'
    },

    // ============ BATCH & SERIAL ============
    autoCreateBatch: {
        type: Boolean,
        default: false
    },
    autoCreateSerialNo: {
        type: Boolean,
        default: false
    },
    batchNumberSeries: {
        type: String,
        trim: true,
        default: 'BATCH-.#####'
    },
    serialNumberSeries: {
        type: String,
        trim: true,
        default: 'SN-.##########'
    },

    // ============ NEGATIVE STOCK ============
    allowNegativeStock: {
        type: Boolean,
        default: false
    },

    // ============ DEFAULT UOM ============
    defaultUom: {
        type: String,
        default: 'PCS',
        trim: true,
        uppercase: true
    },

    // ============ STOCK AGING ============
    enableStockAging: {
        type: Boolean,
        default: false
    },
    agingBasedOn: {
        type: String,
        enum: ['fifo', 'lifo'],
        default: 'fifo'
    },

    // ============ PRICE SETTINGS ============
    showItemPriceInListing: {
        type: Boolean,
        default: true
    },
    allowItemToBeAddedMultipleTimes: {
        type: Boolean,
        default: false
    },

    // ============ REORDER SETTINGS ============
    autoCreatePurchaseOrder: {
        type: Boolean,
        default: false
    },
    reorderEmailNotification: {
        type: Boolean,
        default: true
    },
    reorderEmailRecipients: [{
        type: String,
        trim: true,
        lowercase: true
    }],

    // ============ STOCK RECONCILIATION ============
    freezeStockEntries: {
        type: String,
        enum: ['never', 'yearly', 'monthly', 'weekly'],
        default: 'never'
    },
    roleAllowedToOverrideStopAction: {
        type: String,
        trim: true
    },

    // ============ QUALITY INSPECTION ============
    enableQualityInspection: {
        type: Boolean,
        default: false
    },
    inspectionRequiredBeforeDelivery: {
        type: Boolean,
        default: false
    },
    inspectionRequiredBeforePurchase: {
        type: Boolean,
        default: false
    },

    // ============ TOLERANCE ============
    overDeliveryAllowance: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    overReceiptAllowance: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },

    // ============ WAREHOUSE SETTINGS ============
    defaultTransitWarehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse'
    },
    enableWarehouseWiseStockBalance: {
        type: Boolean,
        default: true
    },

    // ============ REPORTING ============
    includeUomInReport: {
        type: Boolean,
        default: true
    },
    convertItemDescToCleanHtml: {
        type: Boolean,
        default: false
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
inventorySettingsSchema.index({ firmId: 1 }, { unique: true });

// ============ STATICS ============
/**
 * Get settings for firm (create if not exists)
 */
inventorySettingsSchema.statics.getSettings = async function(firmId) {
    let settings = await this.findOne({ firmId });

    if (!settings) {
        settings = new this({ firmId });
        await settings.save();
    }

    return settings;
};

/**
 * Update settings for firm
 */
inventorySettingsSchema.statics.updateSettings = async function(firmId, updates, userId = null) {
    let settings = await this.findOne({ firmId });

    if (!settings) {
        settings = new this({ firmId, ...updates });
        if (userId) settings.createdBy = userId;
    } else {
        Object.assign(settings, updates);
        if (userId) settings.updatedBy = userId;
    }

    await settings.save();
    return settings;
};

// ============ METHODS ============
/**
 * Check if negative stock is allowed
 */
inventorySettingsSchema.methods.isNegativeStockAllowed = function() {
    return this.allowNegativeStock === true;
};

/**
 * Get default warehouse
 */
inventorySettingsSchema.methods.getDefaultWarehouse = async function() {
    if (this.defaultWarehouse) {
        const Warehouse = mongoose.model('Warehouse');
        return await Warehouse.findById(this.defaultWarehouse);
    }
    return null;
};

module.exports = mongoose.model('InventorySettings', inventorySettingsSchema);
