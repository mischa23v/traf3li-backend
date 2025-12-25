const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Quality Settings Model
 *
 * Firm-level quality control settings and preferences.
 * Controls automatic inspection triggers, default templates,
 * and quality control behaviors.
 */

const qualitySettingsSchema = new Schema({
    // ============ FIRM REFERENCE ============
    // One settings document per firm
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        unique: true,
        index: true
    },

    // ============ AUTO-INSPECTION SETTINGS ============
    autoInspectionOnReceipt: {
        type: Boolean,
        default: false
    },

    // ============ DEFAULT TEMPLATE ============
    defaultTemplateId: {
        type: Schema.Types.ObjectId,
        ref: 'QualityTemplate'
    },

    // ============ FAILED INSPECTION ACTION ============
    failedInspectionAction: {
        type: String,
        enum: ['reject', 'hold', 'notify'],
        default: 'notify'
    },

    // ============ BATCH TRACKING ============
    enableBatchTracking: {
        type: Boolean,
        default: true
    },

    // ============ INSPECTION THRESHOLDS ============
    inspectionThresholds: {
        // Minimum sample size percentage
        minSampleSizePercent: {
            type: Number,
            default: 10,
            min: 0,
            max: 100
        },

        // Maximum acceptable defect rate (%)
        maxDefectRate: {
            type: Number,
            default: 5,
            min: 0,
            max: 100
        },

        // Require inspection for high-value items
        highValueThreshold: {
            type: Number,
            default: 10000 // SAR
        }
    },

    // ============ NOTIFICATION SETTINGS ============
    notifications: {
        notifyOnInspectionFail: {
            type: Boolean,
            default: true
        },

        notifyOnActionOverdue: {
            type: Boolean,
            default: true
        },

        inspectionFailRecipients: [{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }],

        actionOverdueRecipients: [{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }]
    },

    // ============ QUALITY SCORING ============
    qualityScoring: {
        enabled: {
            type: Boolean,
            default: false
        },

        // Vendor/Supplier scoring
        vendorScoringEnabled: {
            type: Boolean,
            default: false
        },

        // Item scoring
        itemScoringEnabled: {
            type: Boolean,
            default: false
        }
    },

    // ============ DOCUMENTATION ============
    documentation: {
        requirePhotos: {
            type: Boolean,
            default: false
        },

        requireSignature: {
            type: Boolean,
            default: false
        },

        requireRemarks: {
            type: Boolean,
            default: false
        }
    },

    // ============ INTEGRATION SETTINGS ============
    integration: {
        // Auto-create quality action on failed inspection
        autoCreateAction: {
            type: Boolean,
            default: false
        },

        // Update stock status based on inspection
        updateStockStatus: {
            type: Boolean,
            default: true
        },

        // Block stock transactions for rejected items
        blockRejectedStock: {
            type: Boolean,
            default: true
        }
    },

    // ============ AUDIT ============
    lastUpdatedBy: {
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
qualitySettingsSchema.index({ firmId: 1 });

// ============ STATIC METHODS ============
/**
 * Get quality settings for a firm
 * Creates default settings if not exist
 */
qualitySettingsSchema.statics.getSettings = async function(firmId) {
    let settings = await this.findOne({ firmId });

    // Create default settings if not exist
    if (!settings) {
        settings = await this.create({ firmId });
    }

    return settings;
};

/**
 * Update quality settings for a firm
 */
qualitySettingsSchema.statics.updateSettings = async function(firmId, updates, userId) {
    const settings = await this.findOneAndUpdate(
        { firmId },
        { ...updates, lastUpdatedBy: userId },
        { new: true, upsert: true, runValidators: true }
    );

    return settings;
};

/**
 * Get inspection behavior settings
 */
qualitySettingsSchema.statics.getInspectionBehavior = async function(firmId) {
    const settings = await this.getSettings(firmId);

    return {
        autoInspectionOnReceipt: settings.autoInspectionOnReceipt,
        failedInspectionAction: settings.failedInspectionAction,
        defaultTemplateId: settings.defaultTemplateId
    };
};

/**
 * Check if auto-inspection is enabled
 */
qualitySettingsSchema.statics.isAutoInspectionEnabled = async function(firmId) {
    const settings = await this.getSettings(firmId);
    return settings.autoInspectionOnReceipt;
};

/**
 * Get failed inspection action
 */
qualitySettingsSchema.statics.getFailedInspectionAction = async function(firmId) {
    const settings = await this.getSettings(firmId);
    return settings.failedInspectionAction;
};

// ============ METHODS ============
/**
 * Add notification recipient
 */
qualitySettingsSchema.methods.addNotificationRecipient = function(userId, type = 'inspectionFail') {
    if (!this.notifications) {
        this.notifications = {
            notifyOnInspectionFail: true,
            notifyOnActionOverdue: true,
            inspectionFailRecipients: [],
            actionOverdueRecipients: []
        };
    }

    if (type === 'inspectionFail') {
        if (!this.notifications.inspectionFailRecipients.includes(userId)) {
            this.notifications.inspectionFailRecipients.push(userId);
        }
    } else if (type === 'actionOverdue') {
        if (!this.notifications.actionOverdueRecipients.includes(userId)) {
            this.notifications.actionOverdueRecipients.push(userId);
        }
    }

    return this.save();
};

/**
 * Remove notification recipient
 */
qualitySettingsSchema.methods.removeNotificationRecipient = function(userId, type = 'inspectionFail') {
    if (!this.notifications) {
        return this;
    }

    if (type === 'inspectionFail') {
        this.notifications.inspectionFailRecipients =
            this.notifications.inspectionFailRecipients.filter(id => !id.equals(userId));
    } else if (type === 'actionOverdue') {
        this.notifications.actionOverdueRecipients =
            this.notifications.actionOverdueRecipients.filter(id => !id.equals(userId));
    }

    return this.save();
};

/**
 * Update inspection thresholds
 */
qualitySettingsSchema.methods.updateThresholds = function(thresholds) {
    this.inspectionThresholds = {
        ...this.inspectionThresholds,
        ...thresholds
    };

    return this.save();
};

/**
 * Enable/disable auto-inspection
 */
qualitySettingsSchema.methods.setAutoInspection = function(enabled) {
    this.autoInspectionOnReceipt = enabled;
    return this.save();
};

/**
 * Set default quality template
 */
qualitySettingsSchema.methods.setDefaultTemplate = function(templateId) {
    this.defaultTemplateId = templateId;
    return this.save();
};

// ═══════════════════════════════════════════════════════════════
// FIRM ISOLATION PLUGIN (RLS-like enforcement)
// ═══════════════════════════════════════════════════════════════
const firmIsolationPlugin = require('./plugins/firmIsolation.plugin');
qualitySettingsSchema.plugin(firmIsolationPlugin);

module.exports = mongoose.model('QualitySettings', qualitySettingsSchema);
