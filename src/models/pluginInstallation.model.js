const mongoose = require('mongoose');

/**
 * Plugin Installation Model
 *
 * Tracks plugin installations per firm.
 * Each firm can install multiple plugins with their own settings.
 */

const pluginInstallationSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // REFERENCES
    // ═══════════════════════════════════════════════════════════════
    pluginId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plugin',
        required: true,
        index: true,
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true,
     },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    isEnabled: {
        type: Boolean,
        default: true,
        index: true,
        // Whether the plugin is enabled for this firm
    },

    // ═══════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    settings: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
        // Firm-specific plugin settings
        // These override or complement the default plugin settings
    },

    // ═══════════════════════════════════════════════════════════════
    // INSTALLATION METADATA
    // ═══════════════════════════════════════════════════════════════
    installedAt: {
        type: Date,
        default: Date.now,
        required: true,
    },
    installedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        // User who installed the plugin
    },
    lastUpdatedAt: {
        type: Date,
        default: Date.now,
    },
    lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        // User who last updated the plugin settings
    },

    // ═══════════════════════════════════════════════════════════════
    // VERSIONING
    // ═══════════════════════════════════════════════════════════════
    installedVersion: {
        type: String,
        // Version of the plugin when it was installed
    },
    currentVersion: {
        type: String,
        // Current version (for tracking updates)
    },

    // ═══════════════════════════════════════════════════════════════
    // ERROR TRACKING
    // ═══════════════════════════════════════════════════════════════
    lastError: {
        message: {
            type: String,
        },
        timestamp: {
            type: Date,
        },
        stack: {
            type: String,
        },
    },
    errorCount: {
        type: Number,
        default: 0,
        // Count of errors since last reset
    },

    // ═══════════════════════════════════════════════════════════════
    // USAGE STATISTICS
    // ═══════════════════════════════════════════════════════════════
    statistics: {
        lastUsed: {
            type: Date,
        },
        usageCount: {
            type: Number,
            default: 0,
            // Total number of times the plugin has been triggered/used
        },
        hookExecutions: {
            type: Number,
            default: 0,
            // Number of hook executions
        },
        apiCalls: {
            type: Number,
            default: 0,
            // Number of API calls made through plugin routes
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // PERMISSIONS OVERRIDE
    // ═══════════════════════════════════════════════════════════════
    permissionsOverride: {
        type: [String],
        default: null,
        // Optional: Override default plugin permissions for this firm
        // Null means use plugin's default permissions
    },
}, {
    versionKey: false,
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
// Ensure one installation per plugin per firm
pluginInstallationSchema.index({ pluginId: 1, firmId: 1 }, { unique: true });
pluginInstallationSchema.index({ firmId: 1, isEnabled: 1 });
pluginInstallationSchema.index({ pluginId: 1, isEnabled: 1 });

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Enable the plugin installation
 */
pluginInstallationSchema.methods.enable = async function(userId) {
    this.isEnabled = true;
    this.lastUpdatedAt = new Date();
    this.lastUpdatedBy = userId;
    return this.save();
};

/**
 * Disable the plugin installation
 */
pluginInstallationSchema.methods.disable = async function(userId) {
    this.isEnabled = false;
    this.lastUpdatedAt = new Date();
    this.lastUpdatedBy = userId;
    return this.save();
};

/**
 * Update plugin settings
 */
pluginInstallationSchema.methods.updateSettings = async function(settings, userId) {
    this.settings = { ...this.settings, ...settings };
    this.lastUpdatedAt = new Date();
    this.lastUpdatedBy = userId;
    return this.save();
};

/**
 * Record an error
 */
pluginInstallationSchema.methods.recordError = async function(error) {
    this.lastError = {
        message: error.message,
        timestamp: new Date(),
        stack: error.stack
    };
    this.errorCount += 1;

    // Auto-disable if too many errors
    if (this.errorCount >= 10) {
        this.isEnabled = false;
    }

    return this.save();
};

/**
 * Clear error count
 */
pluginInstallationSchema.methods.clearErrors = async function() {
    this.errorCount = 0;
    this.lastError = undefined;
    return this.save();
};

/**
 * Track usage
 */
pluginInstallationSchema.methods.trackUsage = async function(type = 'general') {
    if (!this.statistics) {
        this.statistics = {
            usageCount: 0,
            hookExecutions: 0,
            apiCalls: 0
        };
    }

    this.statistics.lastUsed = new Date();
    this.statistics.usageCount += 1;

    if (type === 'hook') {
        this.statistics.hookExecutions += 1;
    } else if (type === 'api') {
        this.statistics.apiCalls += 1;
    }

    return this.save();
};

/**
 * Update version
 */
pluginInstallationSchema.methods.updateVersion = async function(version) {
    this.currentVersion = version;
    this.lastUpdatedAt = new Date();
    return this.save();
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get enabled installations for a firm
 */
pluginInstallationSchema.statics.getEnabledForFirm = function(firmId) {
    return this.find({ firmId, isEnabled: true })
        .populate('pluginId')
        .sort({ installedAt: -1 });
};

/**
 * Get all installations for a firm
 */
pluginInstallationSchema.statics.getAllForFirm = function(firmId) {
    return this.find({ firmId })
        .populate('pluginId')
        .populate('installedBy', 'firstName lastName email')
        .populate('lastUpdatedBy', 'firstName lastName email')
        .sort({ installedAt: -1 });
};

/**
 * Check if plugin is installed for firm
 */
pluginInstallationSchema.statics.isInstalled = async function(pluginId, firmId) {
    const count = await this.countDocuments({ pluginId, firmId });
    return count > 0;
};

/**
 * Get installation for plugin and firm
 */
pluginInstallationSchema.statics.getInstallation = function(pluginId, firmId) {
    return this.findOne({ pluginId, firmId })
        .populate('pluginId')
        .populate('installedBy', 'firstName lastName email')
        .populate('lastUpdatedBy', 'firstName lastName email');
};

/**
 * Get installations by plugin
 */
pluginInstallationSchema.statics.getByPlugin = function(pluginId) {
    return this.find({ pluginId, isEnabled: true })
        .populate('firmId', 'name')
        .sort({ installedAt: -1 });
};

module.exports = mongoose.model('PluginInstallation', pluginInstallationSchema);
