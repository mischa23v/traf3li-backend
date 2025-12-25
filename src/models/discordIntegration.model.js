/**
 * Discord Integration Model
 *
 * Manages Discord bot integration for case notifications and updates
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const discordIntegrationSchema = new Schema({
    // ============ TENANT ISOLATION ============
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },

    // ============ USER REFERENCE ============
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // ============ OAUTH TOKENS ============
    // Encrypted OAuth tokens
    accessToken: {
        type: String,
        required: true,
        select: false // Don't include by default for security
    },

    refreshToken: {
        type: String,
        select: false
    },

    tokenType: {
        type: String,
        default: 'Bearer'
    },

    expiresAt: {
        type: Date
    },

    // ============ GUILD/SERVER INFO ============
    guildId: {
        type: String,
        required: true,
        index: true
    },

    guildName: {
        type: String,
        required: true
    },

    guildIcon: {
        type: String
    },

    // ============ WEBHOOK CONFIGURATION ============
    webhookUrl: {
        type: String,
        required: true,
        select: false // Sensitive data
    },

    webhookId: {
        type: String,
        required: true
    },

    webhookToken: {
        type: String,
        required: true,
        select: false // Sensitive data
    },

    webhookChannelId: {
        type: String,
        required: true
    },

    webhookChannelName: {
        type: String,
        required: true
    },

    // ============ BOT PERMISSIONS ============
    botPermissions: {
        type: Number, // Discord permission bitfield
        default: 0
    },

    // ============ AVAILABLE CHANNELS ============
    channels: [{
        id: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        type: {
            type: Number, // Discord channel type (0=text, 2=voice, etc)
            required: true
        },
        position: {
            type: Number
        },
        parentId: {
            type: String // Category ID
        }
    }],

    // ============ SYNC SETTINGS ============
    syncSettings: {
        // What events to notify about
        events: {
            caseCreated: {
                type: Boolean,
                default: true
            },
            caseUpdated: {
                type: Boolean,
                default: true
            },
            caseStatusChanged: {
                type: Boolean,
                default: true
            },
            caseAssigned: {
                type: Boolean,
                default: true
            },
            deadlineApproaching: {
                type: Boolean,
                default: true
            },
            taskCreated: {
                type: Boolean,
                default: true
            },
            taskCompleted: {
                type: Boolean,
                default: true
            },
            documentUploaded: {
                type: Boolean,
                default: false
            },
            paymentReceived: {
                type: Boolean,
                default: false
            },
            appointmentScheduled: {
                type: Boolean,
                default: false
            }
        },

        // Notification preferences
        mentionRole: {
            type: String, // Discord role ID to mention
            default: null
        },

        embedColor: {
            type: String, // Hex color for embeds
            default: '#5865F2' // Discord Blurple
        },

        includeDetails: {
            type: Boolean,
            default: true
        },

        // Rate limiting
        maxNotificationsPerHour: {
            type: Number,
            default: 50
        },

        // Digest mode (batch notifications)
        digestMode: {
            enabled: {
                type: Boolean,
                default: false
            },
            interval: {
                type: Number, // Minutes between digests
                default: 60
            }
        }
    },

    // ============ STATUS ============
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
        type: Date,
        default: Date.now
    },

    // ============ STATS ============
    stats: {
        totalNotificationsSent: {
            type: Number,
            default: 0
        },
        lastNotificationSentAt: {
            type: Date
        },
        failedNotifications: {
            type: Number,
            default: 0
        },
        lastErrorAt: {
            type: Date
        },
        lastError: {
            type: String
        }
    },

    // ============ METADATA ============
    metadata: {
        type: Map,
        of: Schema.Types.Mixed,
        default: {}
    }

}, {
    timestamps: true,
    versionKey: false
});

// ============ INDEXES ============
discordIntegrationSchema.index({ firmId: 1, isActive: 1 });
discordIntegrationSchema.index({ firmId: 1, guildId: 1 }, { unique: true });
discordIntegrationSchema.index({ userId: 1 });
discordIntegrationSchema.index({ isActive: 1, lastSyncAt: 1 });

// ============ VIRTUALS ============
discordIntegrationSchema.virtual('isTokenExpired').get(function() {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
});

discordIntegrationSchema.virtual('notificationRate').get(function() {
    if (!this.stats.totalNotificationsSent || !this.connectedAt) return 0;

    const hoursSinceConnection = (Date.now() - this.connectedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceConnection === 0) return 0;

    return Math.round(this.stats.totalNotificationsSent / hoursSinceConnection);
});

discordIntegrationSchema.virtual('successRate').get(function() {
    const total = this.stats.totalNotificationsSent;
    if (total === 0) return 100;

    const successful = total - this.stats.failedNotifications;
    return Math.round((successful / total) * 100);
});

// ============ STATICS ============

/**
 * Get active integration for a firm
 */
discordIntegrationSchema.statics.getActiveFirmIntegration = async function(firmId) {
    return await this.findOne({
        firmId: new mongoose.Types.ObjectId(firmId),
        isActive: true
    })
    .select('+accessToken +refreshToken +webhookUrl +webhookToken')
    .lean();
};

/**
 * Get all active integrations
 */
discordIntegrationSchema.statics.getActiveIntegrations = async function() {
    return await this.find({ isActive: true })
    .select('+webhookUrl +webhookToken')
    .lean();
};

/**
 * Get integration by guild
 */
discordIntegrationSchema.statics.getByGuild = async function(firmId, guildId) {
    return await this.findOne({
        firmId: new mongoose.Types.ObjectId(firmId),
        guildId
    })
    .select('+accessToken +refreshToken +webhookUrl +webhookToken')
    .lean();
};

/**
 * Get integration statistics for a firm
 */
discordIntegrationSchema.statics.getFirmStats = async function(firmId) {
    const integration = await this.findOne({
        firmId: new mongoose.Types.ObjectId(firmId),
        isActive: true
    });

    if (!integration) {
        return {
            connected: false,
            totalNotifications: 0,
            successRate: 0,
            lastSyncAt: null
        };
    }

    return {
        connected: true,
        guildName: integration.guildName,
        channelName: integration.webhookChannelName,
        totalNotifications: integration.stats.totalNotificationsSent,
        failedNotifications: integration.stats.failedNotifications,
        successRate: integration.successRate,
        notificationRate: integration.notificationRate,
        lastSyncAt: integration.lastSyncAt,
        connectedAt: integration.connectedAt
    };
};

/**
 * Deactivate integration
 */
discordIntegrationSchema.statics.deactivateIntegration = async function(firmId) {
    return await this.findOneAndUpdate(
        { firmId: new mongoose.Types.ObjectId(firmId) },
        {
            isActive: false,
            'metadata.deactivatedAt': new Date(),
            'metadata.deactivatedBy': 'user'
        },
        { new: true }
    );
};

// ============ METHODS ============

/**
 * Record successful notification
 */
discordIntegrationSchema.methods.recordSuccess = async function() {
    this.stats.totalNotificationsSent += 1;
    this.stats.lastNotificationSentAt = new Date();
    this.lastSyncAt = new Date();
    await this.save();
};

/**
 * Record failed notification
 */
discordIntegrationSchema.methods.recordFailure = async function(error) {
    this.stats.failedNotifications += 1;
    this.stats.lastErrorAt = new Date();
    this.stats.lastError = error ? error.toString().substring(0, 500) : 'Unknown error';
    await this.save();
};

/**
 * Update sync settings
 */
discordIntegrationSchema.methods.updateSettings = async function(settings) {
    if (settings.events) {
        this.syncSettings.events = { ...this.syncSettings.events, ...settings.events };
    }

    if (settings.mentionRole !== undefined) {
        this.syncSettings.mentionRole = settings.mentionRole;
    }

    if (settings.embedColor) {
        this.syncSettings.embedColor = settings.embedColor;
    }

    if (settings.includeDetails !== undefined) {
        this.syncSettings.includeDetails = settings.includeDetails;
    }

    if (settings.maxNotificationsPerHour) {
        this.syncSettings.maxNotificationsPerHour = settings.maxNotificationsPerHour;
    }

    if (settings.digestMode) {
        this.syncSettings.digestMode = {
            ...this.syncSettings.digestMode,
            ...settings.digestMode
        };
    }

    await this.save();
    return this;
};

/**
 * Check if notification is allowed based on rate limits
 */
discordIntegrationSchema.methods.canSendNotification = function() {
    if (!this.isActive) return false;

    // Check rate limit
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentNotifications = this.stats.lastNotificationSentAt > oneHourAgo
        ? this.stats.totalNotificationsSent
        : 0;

    return recentNotifications < this.syncSettings.maxNotificationsPerHour;
};

/**
 * Get safe object for API responses (no sensitive data)
 */
discordIntegrationSchema.methods.toSafeObject = function() {
    return {
        id: this._id,
        firmId: this.firmId,
        userId: this.userId,
        guildId: this.guildId,
        guildName: this.guildName,
        guildIcon: this.guildIcon,
        webhookChannelId: this.webhookChannelId,
        webhookChannelName: this.webhookChannelName,
        channels: this.channels,
        syncSettings: this.syncSettings,
        isActive: this.isActive,
        connectedAt: this.connectedAt,
        lastSyncAt: this.lastSyncAt,
        stats: this.stats,
        successRate: this.successRate,
        notificationRate: this.notificationRate,
        isTokenExpired: this.isTokenExpired,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
};

module.exports = mongoose.model('DiscordIntegration', discordIntegrationSchema);
