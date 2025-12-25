const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Manufacturing Settings Model
 * Stores firm-specific manufacturing configuration and preferences.
 * One document per firm.
 */

const manufacturingSettingsSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy) - Primary Key
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        unique: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // DEFAULT WAREHOUSES
    // ═══════════════════════════════════════════════════════════════

    // Default warehouse for finished goods
    defaultWarehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse'
    },

    // Default warehouse for work-in-progress items
    workInProgressWarehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse'
    },

    // ═══════════════════════════════════════════════════════════════
    // AUTOMATION SETTINGS
    // ═══════════════════════════════════════════════════════════════

    // Auto-create job cards when work order is submitted
    autoCreateJobCards: {
        type: Boolean,
        default: true
    },

    // Automatically consume raw materials when production is completed
    backflushRawMaterials: {
        type: Boolean,
        default: false
    },

    // Enable capacity planning features
    capacityPlanningEnabled: {
        type: Boolean,
        default: false
    },

    // ═══════════════════════════════════════════════════════════════
    // WORK ORDER SETTINGS
    // ═══════════════════════════════════════════════════════════════

    // Allow over-production (produce more than planned quantity)
    allowOverProduction: {
        type: Boolean,
        default: false
    },

    // Over-production percentage allowed
    overProductionPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },

    // Allow work orders without BOM
    allowWorkOrderWithoutBOM: {
        type: Boolean,
        default: false
    },

    // ═══════════════════════════════════════════════════════════════
    // MATERIAL CONSUMPTION SETTINGS
    // ═══════════════════════════════════════════════════════════════

    // Material consumption method
    materialConsumptionMethod: {
        type: String,
        enum: ['manual', 'backflush', 'real_time'],
        default: 'manual'
    },

    // Allow material transfer before work order starts
    allowMaterialTransferBeforeStart: {
        type: Boolean,
        default: true
    },

    // ═══════════════════════════════════════════════════════════════
    // COSTING SETTINGS
    // ═══════════════════════════════════════════════════════════════

    // Update item cost after production
    updateItemCostAfterProduction: {
        type: Boolean,
        default: true
    },

    // Default valuation method
    valuationMethod: {
        type: String,
        enum: ['FIFO', 'LIFO', 'moving_average', 'standard_cost'],
        default: 'FIFO'
    },

    // ═══════════════════════════════════════════════════════════════
    // QUALITY CONTROL SETTINGS
    // ═══════════════════════════════════════════════════════════════

    // Enable quality inspection for finished goods
    enableQualityInspection: {
        type: Boolean,
        default: false
    },

    // Default quality inspection template
    defaultQualityTemplate: {
        type: Schema.Types.ObjectId,
        ref: 'QualityTemplate'
    },

    // ═══════════════════════════════════════════════════════════════
    // SCHEDULING SETTINGS
    // ═══════════════════════════════════════════════════════════════

    // Default lead time for manufacturing (in days)
    defaultManufacturingLeadTime: {
        type: Number,
        default: 7,
        min: 0
    },

    // Scheduling method
    schedulingMethod: {
        type: String,
        enum: ['forward', 'backward', 'manual'],
        default: 'forward'
    },

    // ═══════════════════════════════════════════════════════════════
    // NOTIFICATION SETTINGS
    // ═══════════════════════════════════════════════════════════════

    // Notify when work order is overdue
    notifyOnOverdue: {
        type: Boolean,
        default: true
    },

    // Notify when material is short
    notifyOnMaterialShortage: {
        type: Boolean,
        default: true
    },

    // Notify on production completion
    notifyOnProductionComplete: {
        type: Boolean,
        default: false
    },

    // ═══════════════════════════════════════════════════════════════
    // CUSTOM FIELDS
    // ═══════════════════════════════════════════════════════════════

    // Additional custom settings (JSON)
    customSettings: {
        type: Schema.Types.Mixed,
        default: {}
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════

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
manufacturingSettingsSchema.index({ firmId: 1 }, { unique: true });

// ============ STATIC METHODS ============

/**
 * Get settings for a firm (create with defaults if not exists)
 */
manufacturingSettingsSchema.statics.getOrCreateSettings = async function(firmId) {
    let settings = await this.findOne({ firmId });

    if (!settings) {
        settings = new this({
            firmId,
            autoCreateJobCards: true,
            backflushRawMaterials: false,
            capacityPlanningEnabled: false,
            allowOverProduction: false,
            overProductionPercentage: 0,
            materialConsumptionMethod: 'manual',
            updateItemCostAfterProduction: true,
            valuationMethod: 'FIFO',
            defaultManufacturingLeadTime: 7,
            schedulingMethod: 'forward',
            notifyOnOverdue: true,
            notifyOnMaterialShortage: true
        });
        await settings.save();
    }

    return settings;
};

/**
 * Update settings for a firm
 */
manufacturingSettingsSchema.statics.updateSettings = async function(firmId, updates, userId = null) {
    let settings = await this.findOne({ firmId });

    if (!settings) {
        settings = new this({ firmId, ...updates });
    } else {
        Object.assign(settings, updates);
    }

    if (userId) {
        settings.updatedBy = userId;
    }

    await settings.save();
    return settings;
};

// ============ INSTANCE METHODS ============

/**
 * Check if a feature is enabled
 */
manufacturingSettingsSchema.methods.isFeatureEnabled = function(featureName) {
    return this[featureName] === true;
};

/**
 * Get custom setting
 */
manufacturingSettingsSchema.methods.getCustomSetting = function(key, defaultValue = null) {
    return this.customSettings?.[key] || defaultValue;
};

/**
 * Set custom setting
 */
manufacturingSettingsSchema.methods.setCustomSetting = async function(key, value) {
    if (!this.customSettings) {
        this.customSettings = {};
    }
    this.customSettings[key] = value;
    await this.save();
    return this;
};

// ═══════════════════════════════════════════════════════════════
// FIRM ISOLATION PLUGIN (RLS-like enforcement)
// ═══════════════════════════════════════════════════════════════
const firmIsolationPlugin = require('./plugins/firmIsolation.plugin');
manufacturingSettingsSchema.plugin(firmIsolationPlugin);

module.exports = mongoose.model('ManufacturingSettings', manufacturingSettingsSchema);
