const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Subcontracting Settings Model
 *
 * Centralized configuration for subcontracting operations per firm.
 * Defines default warehouses, automation settings, and business rules.
 *
 * Features:
 * - Default warehouse configurations
 * - Auto-receipt creation settings
 * - Material return tracking
 * - Quality inspection requirements
 * - One settings document per firm
 */

const subcontractingSettingsSchema = new Schema({
    // ============ FIRM REFERENCE ============
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        unique: true,
        index: true
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ============ DEFAULT WAREHOUSES ============
    defaultSupplierWarehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse',
        description: 'Default warehouse at supplier location'
    },
    defaultRawMaterialWarehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse',
        description: 'Default warehouse for storing raw materials before transfer'
    },
    defaultFinishedGoodsWarehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse',
        description: 'Default warehouse for receiving finished goods'
    },

    // ============ AUTOMATION SETTINGS ============
    autoCreateReceipt: {
        type: Boolean,
        default: false,
        description: 'Automatically create receipt when finished goods are delivered'
    },
    trackReturnedMaterials: {
        type: Boolean,
        default: true,
        description: 'Track materials returned from supplier'
    },
    requireQualityInspection: {
        type: Boolean,
        default: false,
        description: 'Require quality inspection before accepting finished goods'
    },

    // ============ METADATA ============
    lastUpdatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    versionKey: false,
    timestamps: true
});

// ============ INDEXES ============
subcontractingSettingsSchema.index({ firmId: 1 });

// ============ STATICS ============
/**
 * Get settings for a firm (creates default if not exists)
 */
subcontractingSettingsSchema.statics.getSettings = async function(firmId) {
    let settings = await this.findOne({ firmId });

    // Create default settings if not exist
    if (!settings) {
        settings = await this.create({
            firmId,
            autoCreateReceipt: false,
            trackReturnedMaterials: true,
            requireQualityInspection: false
        });
    }

    return settings;
};

/**
 * Update settings for a firm
 */
subcontractingSettingsSchema.statics.updateSettings = async function(firmId, updates, userId) {
    const settings = await this.findOneAndUpdate(
        { firmId },
        { ...updates, lastUpdatedBy: userId },
        { new: true, upsert: true, runValidators: true }
    );

    return settings;
};

/**
 * Get default warehouses for a firm
 */
subcontractingSettingsSchema.statics.getDefaultWarehouses = async function(firmId) {
    const settings = await this.getSettings(firmId);

    return {
        supplierWarehouse: settings.defaultSupplierWarehouse,
        rawMaterialWarehouse: settings.defaultRawMaterialWarehouse,
        finishedGoodsWarehouse: settings.defaultFinishedGoodsWarehouse
    };
};

/**
 * Check if auto-receipt creation is enabled
 */
subcontractingSettingsSchema.statics.isAutoReceiptEnabled = async function(firmId) {
    const settings = await this.getSettings(firmId);
    return settings.autoCreateReceipt;
};

/**
 * Check if quality inspection is required
 */
subcontractingSettingsSchema.statics.isQualityInspectionRequired = async function(firmId) {
    const settings = await this.getSettings(firmId);
    return settings.requireQualityInspection;
};

/**
 * Check if material return tracking is enabled
 */
subcontractingSettingsSchema.statics.isReturnTrackingEnabled = async function(firmId) {
    const settings = await this.getSettings(firmId);
    return settings.trackReturnedMaterials;
};

// ============ METHODS ============
/**
 * Set default supplier warehouse
 */
subcontractingSettingsSchema.methods.setDefaultSupplierWarehouse = async function(warehouseId, userId) {
    this.defaultSupplierWarehouse = warehouseId;
    this.lastUpdatedBy = userId;
    return await this.save();
};

/**
 * Set default raw material warehouse
 */
subcontractingSettingsSchema.methods.setDefaultRawMaterialWarehouse = async function(warehouseId, userId) {
    this.defaultRawMaterialWarehouse = warehouseId;
    this.lastUpdatedBy = userId;
    return await this.save();
};

/**
 * Set default finished goods warehouse
 */
subcontractingSettingsSchema.methods.setDefaultFinishedGoodsWarehouse = async function(warehouseId, userId) {
    this.defaultFinishedGoodsWarehouse = warehouseId;
    this.lastUpdatedBy = userId;
    return await this.save();
};

/**
 * Enable/disable auto-receipt creation
 */
subcontractingSettingsSchema.methods.setAutoCreateReceipt = async function(enabled, userId) {
    this.autoCreateReceipt = enabled;
    this.lastUpdatedBy = userId;
    return await this.save();
};

/**
 * Enable/disable quality inspection requirement
 */
subcontractingSettingsSchema.methods.setQualityInspectionRequired = async function(required, userId) {
    this.requireQualityInspection = required;
    this.lastUpdatedBy = userId;
    return await this.save();
};

/**
 * Enable/disable returned materials tracking
 */
subcontractingSettingsSchema.methods.setReturnTrackingEnabled = async function(enabled, userId) {
    this.trackReturnedMaterials = enabled;
    this.lastUpdatedBy = userId;
    return await this.save();
};

module.exports = mongoose.model('SubcontractingSettings', subcontractingSettingsSchema);
