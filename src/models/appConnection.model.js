/**
 * App Connection Model
 *
 * Unified model for tracking all third-party app integrations and connections.
 * This model serves as a registry/metadata store for app connections, while
 * actual OAuth tokens and app-specific data are stored in individual integration models.
 *
 * Security Features:
 * - Firm isolation
 * - Connection status tracking
 * - Error logging
 * - Sync history
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const appConnectionSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // TENANT ISOLATION
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // APP IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    appId: {
        type: String,
        required: true,
        index: true,
        enum: [
            // Communication
            'slack', 'discord', 'telegram', 'zoom', 'whatsapp',
            // Productivity
            'github', 'trello', 'notion',
            // Email
            'gmail',
            // Accounting
            'quickbooks', 'xero',
            // Calendars
            'google-calendar', 'microsoft-calendar',
            // Storage
            'google-drive', 'dropbox', 'onedrive',
            // E-Signatures
            'docusign',
            // Payments
            'stripe'
        ]
    },

    appName: {
        type: String,
        required: true
    },

    appDescription: {
        type: String
    },

    appIcon: {
        type: String // URL to app icon/logo
    },

    // ═══════════════════════════════════════════════════════════════
    // CONNECTION STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['connected', 'disconnected', 'error', 'pending'],
        default: 'pending',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // USER TRACKING
    // ═══════════════════════════════════════════════════════════════
    connectedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    disconnectedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },

    // ═══════════════════════════════════════════════════════════════
    // TIMESTAMPS
    // ═══════════════════════════════════════════════════════════════
    connectedAt: {
        type: Date,
        default: Date.now
    },

    disconnectedAt: {
        type: Date
    },

    lastSyncAt: {
        type: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // ERROR TRACKING
    // ═══════════════════════════════════════════════════════════════
    lastError: {
        message: String,
        code: String,
        occurredAt: Date,
        resolved: {
            type: Boolean,
            default: false
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // APP-SPECIFIC SETTINGS
    // ═══════════════════════════════════════════════════════════════
    settings: {
        type: Map,
        of: Schema.Types.Mixed,
        default: {}
        // Flexible schema for app-specific configuration
        // Example: { autoSync: true, syncInterval: 'hourly', notifications: true }
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA (Account info, email, workspace name, etc.)
    // ═══════════════════════════════════════════════════════════════
    metadata: {
        type: Map,
        of: Schema.Types.Mixed,
        default: {}
        // Example: { accountName: 'John Doe', email: 'john@example.com', workspaceName: 'My Firm' }
    },

    // ═══════════════════════════════════════════════════════════════
    // INTEGRATION REFERENCE
    // ═══════════════════════════════════════════════════════════════
    // Reference to the specific integration model (e.g., SlackIntegration, DiscordIntegration)
    integrationRef: {
        type: Schema.Types.ObjectId,
        refPath: 'integrationModel'
    },

    integrationModel: {
        type: String,
        enum: [
            'SlackIntegration',
            'DiscordIntegration',
            'TelegramIntegration',
            'ZoomIntegration',
            'GithubIntegration',
            'GmailIntegration',
            'TrelloIntegration',
            'GoogleCalendarIntegration',
            'WhatsappConversation' // For WhatsApp integration
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // STATISTICS
    // ═══════════════════════════════════════════════════════════════
    stats: {
        totalSyncs: {
            type: Number,
            default: 0
        },
        successfulSyncs: {
            type: Number,
            default: 0
        },
        failedSyncs: {
            type: Number,
            default: 0
        },
        lastSuccessfulSyncAt: Date,
        lastFailedSyncAt: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // FLAGS
    // ═══════════════════════════════════════════════════════════════
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    autoSync: {
        type: Boolean,
        default: false
    },

    // ═══════════════════════════════════════════════════════════════
    // ADDITIONAL INFO
    // ═══════════════════════════════════════════════════════════════
    disconnectReason: {
        type: String
    },

    notes: {
        type: String
    }

}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
appConnectionSchema.index({ firmId: 1, appId: 1 }, { unique: true });
appConnectionSchema.index({ firmId: 1, status: 1 });
appConnectionSchema.index({ connectedBy: 1 });
appConnectionSchema.index({ isActive: 1, status: 1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════
appConnectionSchema.virtual('isConnected').get(function() {
    return this.status === 'connected' && this.isActive && !this.disconnectedAt;
});

appConnectionSchema.virtual('successRate').get(function() {
    const total = this.stats.totalSyncs;
    if (total === 0) return 100;

    return Math.round((this.stats.successfulSyncs / total) * 100);
});

appConnectionSchema.virtual('daysSinceConnection').get(function() {
    if (!this.connectedAt) return 0;
    const diffTime = Math.abs(Date.now() - this.connectedAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Mark connection as connected
 */
appConnectionSchema.methods.markConnected = async function(userId, metadata = {}) {
    this.status = 'connected';
    this.isActive = true;
    this.connectedAt = new Date();
    this.connectedBy = userId;
    this.disconnectedAt = null;
    this.disconnectedBy = null;
    this.disconnectReason = null;

    if (Object.keys(metadata).length > 0) {
        this.metadata = new Map(Object.entries(metadata));
    }

    return await this.save();
};

/**
 * Mark connection as disconnected
 */
appConnectionSchema.methods.markDisconnected = async function(userId, reason = null) {
    this.status = 'disconnected';
    this.isActive = false;
    this.disconnectedAt = new Date();
    this.disconnectedBy = userId;
    this.disconnectReason = reason;

    return await this.save();
};

/**
 * Mark connection as error
 */
appConnectionSchema.methods.markError = async function(error) {
    this.status = 'error';
    this.lastError = {
        message: error.message || 'Unknown error',
        code: error.code || 'UNKNOWN',
        occurredAt: new Date(),
        resolved: false
    };
    this.stats.failedSyncs += 1;
    this.stats.lastFailedSyncAt = new Date();

    return await this.save();
};

/**
 * Record successful sync
 */
appConnectionSchema.methods.recordSuccessfulSync = async function() {
    this.lastSyncAt = new Date();
    this.stats.totalSyncs += 1;
    this.stats.successfulSyncs += 1;
    this.stats.lastSuccessfulSyncAt = new Date();

    // Clear error if exists
    if (this.lastError && !this.lastError.resolved) {
        this.lastError.resolved = true;
    }

    // Update status to connected if it was in error
    if (this.status === 'error') {
        this.status = 'connected';
    }

    return await this.save();
};

/**
 * Update app settings
 */
appConnectionSchema.methods.updateSettings = async function(settings) {
    if (!settings || typeof settings !== 'object') {
        throw new Error('Settings must be an object');
    }

    const currentSettings = this.settings ? Object.fromEntries(this.settings) : {};
    this.settings = new Map(Object.entries({ ...currentSettings, ...settings }));

    return await this.save();
};

/**
 * Update app metadata
 */
appConnectionSchema.methods.updateMetadata = async function(metadata) {
    if (!metadata || typeof metadata !== 'object') {
        throw new Error('Metadata must be an object');
    }

    const currentMetadata = this.metadata ? Object.fromEntries(this.metadata) : {};
    this.metadata = new Map(Object.entries({ ...currentMetadata, ...metadata }));

    return await this.save();
};

/**
 * Get safe object for API responses
 */
appConnectionSchema.methods.toSafeObject = function() {
    return {
        id: this._id,
        firmId: this.firmId,
        appId: this.appId,
        appName: this.appName,
        appDescription: this.appDescription,
        appIcon: this.appIcon,
        status: this.status,
        isConnected: this.isConnected,
        connectedBy: this.connectedBy,
        connectedAt: this.connectedAt,
        disconnectedAt: this.disconnectedAt,
        lastSyncAt: this.lastSyncAt,
        lastError: this.lastError,
        settings: this.settings ? Object.fromEntries(this.settings) : {},
        metadata: this.metadata ? Object.fromEntries(this.metadata) : {},
        stats: {
            ...this.stats,
            successRate: this.successRate,
            daysSinceConnection: this.daysSinceConnection
        },
        isActive: this.isActive,
        autoSync: this.autoSync,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Find connection by firm and app
 */
appConnectionSchema.statics.findByFirmAndApp = async function(firmId, appId) {
    return await this.findOne({ firmId, appId });
};

/**
 * Find all connected apps for a firm
 */
appConnectionSchema.statics.findConnectedApps = async function(firmId) {
    return await this.find({
        firmId,
        status: 'connected',
        isActive: true
    }).sort({ connectedAt: -1 });
};

/**
 * Find all apps for a firm (any status)
 */
appConnectionSchema.statics.findAllAppsByFirm = async function(firmId, status = null) {
    const query = { firmId };

    if (status) {
        query.status = status;
    }

    return await this.find(query).sort({ createdAt: -1 });
};

/**
 * Check if app is connected for firm
 */
appConnectionSchema.statics.isAppConnected = async function(firmId, appId) {
    const connection = await this.findOne({
        firmId,
        appId,
        status: 'connected',
        isActive: true
    });

    return !!connection;
};

/**
 * Get connection stats for firm
 */
appConnectionSchema.statics.getFirmStats = async function(firmId) {
    const connections = await this.find({ firmId });

    const stats = {
        total: connections.length,
        connected: 0,
        disconnected: 0,
        error: 0,
        pending: 0,
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0
    };

    connections.forEach(conn => {
        stats[conn.status] = (stats[conn.status] || 0) + 1;
        stats.totalSyncs += conn.stats.totalSyncs || 0;
        stats.successfulSyncs += conn.stats.successfulSyncs || 0;
        stats.failedSyncs += conn.stats.failedSyncs || 0;
    });

    return stats;
};

/**
 * Get apps due for sync (for background jobs)
 */
appConnectionSchema.statics.getAppsForSync = async function() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    return await this.find({
        status: 'connected',
        isActive: true,
        autoSync: true,
        $or: [
            { lastSyncAt: { $exists: false } },
            { lastSyncAt: { $lt: oneHourAgo } }
        ]
    });
};

module.exports = mongoose.model('AppConnection', appConnectionSchema);
