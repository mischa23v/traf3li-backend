const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Asset Settings Model - Asset Module Configuration
 * Firm-specific settings for asset management
 */

const assetSettingsSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANCY
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
    // ═══════════════════════════════════════════════════════════════
    // DEPRECIATION SETTINGS
    // ═══════════════════════════════════════════════════════════════
    autoDepreciation: {
        type: Boolean,
        default: false
    },
    depreciationFrequency: {
        type: String,
        enum: ['monthly', 'quarterly', 'half_yearly', 'yearly'],
        default: 'yearly'
    },

    // ═══════════════════════════════════════════════════════════════
    // MAINTENANCE ALERTS
    // ═══════════════════════════════════════════════════════════════
    enableMaintenanceAlerts: {
        type: Boolean,
        default: true
    },
    maintenanceAlertDays: {
        type: Number,
        default: 7,
        min: 1,
        max: 90
    },

    // ═══════════════════════════════════════════════════════════════
    // WARRANTY ALERTS
    // ═══════════════════════════════════════════════════════════════
    enableWarrantyAlerts: {
        type: Boolean,
        default: true
    },
    warrantyAlertDays: {
        type: Number,
        default: 30,
        min: 1,
        max: 365
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT
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

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
assetSettingsSchema.index({ firmId: 1 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get or create settings for a firm
 */
assetSettingsSchema.statics.getOrCreateSettings = async function(firmId, userId = null) {
    let settings = await this.findOne({ firmId });

    if (!settings) {
        settings = new this({
            firmId,
            autoDepreciation: false,
            depreciationFrequency: 'yearly',
            enableMaintenanceAlerts: true,
            maintenanceAlertDays: 7,
            enableWarrantyAlerts: true,
            warrantyAlertDays: 30,
            createdBy: userId
        });
        await settings.save();
    }

    return settings;
};

/**
 * Update settings
 */
assetSettingsSchema.statics.updateSettings = async function(firmId, updates, userId) {
    const settings = await this.getOrCreateSettings(firmId, userId);

    Object.keys(updates).forEach(key => {
        if (settings.schema.paths[key]) {
            settings[key] = updates[key];
        }
    });

    settings.updatedBy = userId;
    await settings.save();

    return settings;
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Enable auto depreciation
 */
assetSettingsSchema.methods.enableAutoDepreciation = async function(frequency = 'yearly', userId = null) {
    this.autoDepreciation = true;
    this.depreciationFrequency = frequency;
    if (userId) this.updatedBy = userId;
    await this.save();
    return this;
};

/**
 * Disable auto depreciation
 */
assetSettingsSchema.methods.disableAutoDepreciation = async function(userId = null) {
    this.autoDepreciation = false;
    if (userId) this.updatedBy = userId;
    await this.save();
    return this;
};

/**
 * Update alert settings
 */
assetSettingsSchema.methods.updateAlertSettings = async function(alertSettings, userId = null) {
    if (alertSettings.enableMaintenanceAlerts !== undefined) {
        this.enableMaintenanceAlerts = alertSettings.enableMaintenanceAlerts;
    }
    if (alertSettings.maintenanceAlertDays !== undefined) {
        this.maintenanceAlertDays = alertSettings.maintenanceAlertDays;
    }
    if (alertSettings.enableWarrantyAlerts !== undefined) {
        this.enableWarrantyAlerts = alertSettings.enableWarrantyAlerts;
    }
    if (alertSettings.warrantyAlertDays !== undefined) {
        this.warrantyAlertDays = alertSettings.warrantyAlertDays;
    }
    if (userId) this.updatedBy = userId;
    await this.save();
    return this;
};

// ═══════════════════════════════════════════════════════════════
// FIRM ISOLATION PLUGIN (RLS-like enforcement)
// ═══════════════════════════════════════════════════════════════
// Removed firmIsolationPlugin - using direct RLS queries instead

module.exports = mongoose.model('AssetSettings', assetSettingsSchema);
