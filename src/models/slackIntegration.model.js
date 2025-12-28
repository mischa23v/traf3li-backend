const mongoose = require('mongoose');
const encryptionPlugin = require('./plugins/encryption.plugin');

/**
 * Slack Integration Model
 *
 * Stores OAuth tokens and settings for Slack workspace integration
 * per firm and user.
 *
 * Security Features:
 * - Encrypted access/bot tokens (AES-256-GCM)
 * - Firm isolation
 * - Sync settings for notifications
 */

const slackIntegrationSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // USER & FIRM ASSOCIATION
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
        // User who connected the Slack workspace
    },

    // ═══════════════════════════════════════════════════════════════
    // SLACK WORKSPACE INFO
    // ═══════════════════════════════════════════════════════════════
    teamId: {
        type: String,
        required: true,
        index: true
        // Slack workspace/team ID
    },

    teamName: {
        type: String,
        required: true
        // Slack workspace/team name
    },

    // ═══════════════════════════════════════════════════════════════
    // OAUTH TOKENS (encrypted)
    // ═══════════════════════════════════════════════════════════════
    accessToken: {
        type: String,
        required: true,
        select: false  // Never return in queries by default
        // User OAuth access token - will be encrypted by plugin
    },

    botUserId: {
        type: String
        // Bot user ID (e.g., U01234567)
    },

    botAccessToken: {
        type: String,
        select: false  // Never return in queries by default
        // Bot user OAuth token - will be encrypted by plugin
    },

    scope: {
        type: String,
        // Granted OAuth scopes (comma-separated)
    },

    // ═══════════════════════════════════════════════════════════════
    // WEBHOOK CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    webhookUrl: {
        type: String,
        select: false  // Encrypted
        // Incoming webhook URL
    },

    webhookChannel: {
        type: String
        // Channel name for webhook (e.g., #general)
    },

    webhookChannelId: {
        type: String
        // Channel ID for webhook (e.g., C01234567)
    },

    // ═══════════════════════════════════════════════════════════════
    // SYNC SETTINGS
    // ═══════════════════════════════════════════════════════════════
    syncSettings: {
        // Channels to sync notifications to
        channels: [{
            channelId: String,
            channelName: String,
            enabled: {
                type: Boolean,
                default: true
            }
        }],

        // Notification preferences
        notifications: {
            caseUpdates: {
                type: Boolean,
                default: true
            },
            invoiceReminders: {
                type: Boolean,
                default: true
            },
            taskAssignments: {
                type: Boolean,
                default: true
            },
            hearingReminders: {
                type: Boolean,
                default: true
            },
            paymentReceived: {
                type: Boolean,
                default: true
            },
            documentUploaded: {
                type: Boolean,
                default: false
            },
            clientMessages: {
                type: Boolean,
                default: true
            }
        },

        // Default channel for notifications
        defaultChannelId: String,
        defaultChannelName: String,

        // Notification format
        mentionOnUrgent: {
            type: Boolean,
            default: true
            // Mention @channel for urgent notifications
        },

        useThreads: {
            type: Boolean,
            default: false
            // Use threads for related notifications
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // CONNECTION STATUS
    // ═══════════════════════════════════════════════════════════════
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    connectedAt: {
        type: Date,
        default: Date.now
    },

    lastSyncAt: {
        type: Date
        // Last time a notification was sent
    },

    lastError: {
        message: String,
        code: String,
        occurredAt: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // STATISTICS
    // ═══════════════════════════════════════════════════════════════
    stats: {
        totalMessagesSent: {
            type: Number,
            default: 0
        },
        totalNotificationsSent: {
            type: Number,
            default: 0
        },
        failedMessages: {
            type: Number,
            default: 0
        },
        lastMessageSentAt: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    disconnectedAt: {
        type: Date
    },

    disconnectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    disconnectReason: {
        type: String
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
slackIntegrationSchema.index({ firmId: 1, isActive: 1 });
slackIntegrationSchema.index({ firmId: 1, userId: 1 }, { unique: true });
slackIntegrationSchema.index({ teamId: 1 });

// ═══════════════════════════════════════════════════════════════
// PLUGINS
// ═══════════════════════════════════════════════════════════════
// Apply encryption to sensitive fields
slackIntegrationSchema.plugin(encryptionPlugin, {
    fields: ['accessToken', 'botAccessToken', 'webhookUrl']
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if integration is active and connected
 */
slackIntegrationSchema.methods.isConnected = function() {
    return this.isActive && !this.disconnectedAt;
};

/**
 * Disconnect integration
 */
slackIntegrationSchema.methods.disconnect = async function(userId, reason) {
    this.isActive = false;
    this.disconnectedAt = new Date();
    this.disconnectedBy = userId;
    this.disconnectReason = reason;
    return await this.save();
};

/**
 * Update last sync timestamp
 */
slackIntegrationSchema.methods.recordSync = async function() {
    this.lastSyncAt = new Date();
    return await this.save();
};

/**
 * Increment message stats
 */
slackIntegrationSchema.methods.incrementStats = async function(success = true) {
    if (success) {
        this.stats.totalMessagesSent += 1;
        this.stats.lastMessageSentAt = new Date();
        this.lastSyncAt = new Date();
        this.lastError = null;
    } else {
        this.stats.failedMessages += 1;
    }
    return await this.save();
};

/**
 * Record error
 */
slackIntegrationSchema.methods.recordError = async function(error) {
    this.lastError = {
        message: error.message || 'Unknown error',
        code: error.code || 'UNKNOWN',
        occurredAt: new Date()
    };
    this.stats.failedMessages += 1;
    return await this.save();
};

/**
 * Add or update channel in sync settings
 */
slackIntegrationSchema.methods.addChannel = function(channelData) {
    const existing = this.syncSettings.channels.find(c => c.channelId === channelData.channelId);

    if (existing) {
        Object.assign(existing, channelData);
    } else {
        this.syncSettings.channels.push(channelData);
    }

    return this.save();
};

/**
 * Remove channel from sync settings
 */
slackIntegrationSchema.methods.removeChannel = function(channelId) {
    this.syncSettings.channels = this.syncSettings.channels.filter(c => c.channelId !== channelId);

    // Update default channel if removed
    if (this.syncSettings.defaultChannelId === channelId) {
        this.syncSettings.defaultChannelId = this.syncSettings.channels.length > 0
            ? this.syncSettings.channels[0].channelId
            : null;
        this.syncSettings.defaultChannelName = this.syncSettings.channels.length > 0
            ? this.syncSettings.channels[0].channelName
            : null;
    }

    return this.save();
};

/**
 * Update notification preferences
 */
slackIntegrationSchema.methods.updateNotificationPreferences = function(preferences) {
    Object.assign(this.syncSettings.notifications, preferences);
    return this.save();
};

/**
 * Check if notification type is enabled
 */
slackIntegrationSchema.methods.isNotificationEnabled = function(notificationType) {
    return this.syncSettings.notifications[notificationType] !== false;
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Find active integration for firm
 */
slackIntegrationSchema.statics.findActiveIntegration = async function(firmId) {
    return await this.findOne({
        firmId,
        isActive: true
    }).select('+accessToken +botAccessToken +webhookUrl');
};

/**
 * Find by team ID
 */
slackIntegrationSchema.statics.findByTeamId = async function(teamId) {
    return await this.findOne({ teamId, isActive: true });
};

/**
 * Get integration stats for firm
 */
slackIntegrationSchema.statics.getStats = async function(firmId) {
    const integration = await this.findOne({ firmId, isActive: true });

    if (!integration) {
        return null;
    }

    return {
        teamName: integration.teamName,
        connectedAt: integration.connectedAt,
        lastSyncAt: integration.lastSyncAt,
        totalMessagesSent: integration.stats.totalMessagesSent,
        totalNotificationsSent: integration.stats.totalNotificationsSent,
        failedMessages: integration.stats.failedMessages,
        lastMessageSentAt: integration.stats.lastMessageSentAt,
        channelsConfigured: integration.syncSettings.channels.length
    };
};

/**
 * Check if firm has active Slack integration
 */
slackIntegrationSchema.statics.hasActiveIntegration = async function(firmId) {
    const count = await this.countDocuments({ firmId, isActive: true });
    return count > 0;
};

module.exports = mongoose.model('SlackIntegration', slackIntegrationSchema);
