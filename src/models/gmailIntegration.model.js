const mongoose = require('mongoose');
const encryptionPlugin = require('./plugins/encryption.plugin');

/**
 * Gmail Integration Model
 *
 * Stores OAuth tokens and settings for Gmail integration
 * per user and firm.
 *
 * Security Features:
 * - Encrypted access/refresh tokens (AES-256-GCM)
 * - Token expiry tracking
 * - Email sync and auto-link settings
 */

const gmailIntegrationSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // USER & FIRM ASSOCIATION
    // ═══════════════════════════════════════════════════════════════
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
        // null for personal integrations, set for firm-wide
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ═══════════════════════════════════════════════════════════════
    // OAUTH TOKENS (encrypted)
    // ═══════════════════════════════════════════════════════════════
    accessToken: {
        type: String,
        required: true,
        select: false  // Never return in queries by default
        // Will be encrypted by plugin
    },

    refreshToken: {
        type: String,
        required: true,
        select: false  // Never return in queries by default
        // Will be encrypted by plugin
    },

    tokenType: {
        type: String,
        default: 'Bearer'
    },

    expiresAt: {
        type: Date,
        required: true,
        index: true
        // When the access token expires
    },

    scope: {
        type: String
        // Granted OAuth scopes
    },

    // ═══════════════════════════════════════════════════════════════
    // GMAIL ACCOUNT INFO
    // ═══════════════════════════════════════════════════════════════
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true
    },

    historyId: {
        type: String
        // Last history ID from Gmail API (for incremental sync)
    },

    // ═══════════════════════════════════════════════════════════════
    // CONNECTION STATUS
    // ═══════════════════════════════════════════════════════════════
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    lastSyncAt: {
        type: Date
        // Last successful sync timestamp
    },

    lastSyncError: {
        type: String
        // Last sync error message (if any)
    },

    connectedAt: {
        type: Date,
        default: Date.now
    },

    // ═══════════════════════════════════════════════════════════════
    // PUSH NOTIFICATIONS (Gmail Watch)
    // ═══════════════════════════════════════════════════════════════
    watchExpiration: {
        type: Date
        // When the Gmail watch/push notification expires
    },

    watchHistoryId: {
        type: String
        // History ID when watch was set up
    },

    // ═══════════════════════════════════════════════════════════════
    // SYNC SETTINGS
    // ═══════════════════════════════════════════════════════════════
    syncSettings: {
        // Labels to sync (empty = sync all)
        labelsToSync: [{
            type: String
        }],

        // Skip labels (e.g., SPAM, TRASH)
        skipLabels: {
            type: [String],
            default: ['SPAM', 'TRASH', 'DRAFT']
        },

        // Auto-link emails to clients by matching email addresses
        autoLinkToClients: {
            type: Boolean,
            default: true
        },

        // Auto-link emails to cases by email address or subject keywords
        autoLinkToCases: {
            type: Boolean,
            default: false
        },

        // Sync attachments
        syncAttachments: {
            type: Boolean,
            default: true
        },

        // Maximum attachment size to sync (in MB)
        maxAttachmentSize: {
            type: Number,
            default: 25  // 25MB
        },

        // Sync sent emails
        syncSent: {
            type: Boolean,
            default: true
        },

        // Sync received emails
        syncReceived: {
            type: Boolean,
            default: true
        },

        // Auto-archive synced emails in Gmail
        autoArchive: {
            type: Boolean,
            default: false
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // SYNC STATISTICS
    // ═══════════════════════════════════════════════════════════════
    syncStats: {
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
        emailsImported: {
            type: Number,
            default: 0
        },
        emailsSent: {
            type: Number,
            default: 0
        },
        attachmentsSynced: {
            type: Number,
            default: 0
        },
        lastSyncCount: {
            type: Number,
            default: 0
        }
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
gmailIntegrationSchema.index({ userId: 1, firmId: 1 }, { unique: true });
gmailIntegrationSchema.index({ userId: 1, isActive: 1 });
gmailIntegrationSchema.index({ email: 1 });
gmailIntegrationSchema.index({ expiresAt: 1 });
gmailIntegrationSchema.index({ watchExpiration: 1 });

// ═══════════════════════════════════════════════════════════════
// PLUGINS
// ═══════════════════════════════════════════════════════════════
// Apply encryption to sensitive fields
gmailIntegrationSchema.plugin(encryptionPlugin, {
    fields: ['accessToken', 'refreshToken']
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if access token is expired
 */
gmailIntegrationSchema.methods.isTokenExpired = function() {
    return this.expiresAt && new Date() >= this.expiresAt;
};

/**
 * Check if token will expire soon (within 5 minutes)
 */
gmailIntegrationSchema.methods.isTokenExpiringSoon = function() {
    if (!this.expiresAt) return true;
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return fiveMinutesFromNow >= this.expiresAt;
};

/**
 * Check if watch/push notification needs renewal (within 24 hours)
 */
gmailIntegrationSchema.methods.needsWatchRenewal = function() {
    if (!this.watchExpiration) return true;
    const twentyFourHoursFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return twentyFourHoursFromNow >= this.watchExpiration;
};

/**
 * Mark as disconnected
 */
gmailIntegrationSchema.methods.disconnect = function(userId, reason) {
    this.isActive = false;
    this.disconnectedAt = new Date();
    this.disconnectedBy = userId;
    this.disconnectReason = reason;
    return this.save();
};

/**
 * Update sync stats
 */
gmailIntegrationSchema.methods.updateSyncStats = function(success, emailCount = 0, attachmentCount = 0, sentCount = 0) {
    this.syncStats.totalSyncs += 1;
    if (success) {
        this.syncStats.successfulSyncs += 1;
        this.syncStats.emailsImported += emailCount;
        this.syncStats.emailsSent += sentCount;
        this.syncStats.attachmentsSynced += attachmentCount;
        this.syncStats.lastSyncCount = emailCount;
        this.lastSyncAt = new Date();
        this.lastSyncError = null;
    } else {
        this.syncStats.failedSyncs += 1;
    }
    return this.save();
};

/**
 * Update watch expiration
 */
gmailIntegrationSchema.methods.updateWatchExpiration = function(expirationTimestamp, historyId) {
    this.watchExpiration = new Date(parseInt(expirationTimestamp));
    this.watchHistoryId = historyId;
    return this.save();
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Find active integration for user
 */
gmailIntegrationSchema.statics.findActiveIntegration = async function(userId, firmId = null) {
    return await this.findOne({
        userId,
        firmId,
        isActive: true
    }).select('+accessToken +refreshToken');
};

/**
 * Find integrations with expired tokens
 */
gmailIntegrationSchema.statics.findExpiredTokens = async function() {
    return await this.find({
        isActive: true,
        expiresAt: { $lte: new Date() }
    }).select('+refreshToken');
};

/**
 * Find integrations needing watch renewal
 */
gmailIntegrationSchema.statics.findExpiredWatches = async function() {
    const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    return await this.find({
        isActive: true,
        $or: [
            { watchExpiration: null },
            { watchExpiration: { $lte: oneDayFromNow } }
        ]
    });
};

/**
 * Get integration stats
 */
gmailIntegrationSchema.statics.getStats = async function(firmId = null) {
    const match = firmId ? { firmId } : {};

    const stats = await this.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                active: { $sum: { $cond: ['$isActive', 1, 0] } },
                withWatch: {
                    $sum: {
                        $cond: [
                            { $and: [
                                { $ne: ['$watchExpiration', null] },
                                { $gte: ['$watchExpiration', new Date()] }
                            ]},
                            1,
                            0
                        ]
                    }
                },
                totalSyncs: { $sum: '$syncStats.totalSyncs' },
                successfulSyncs: { $sum: '$syncStats.successfulSyncs' },
                failedSyncs: { $sum: '$syncStats.failedSyncs' },
                emailsImported: { $sum: '$syncStats.emailsImported' },
                emailsSent: { $sum: '$syncStats.emailsSent' },
                attachmentsSynced: { $sum: '$syncStats.attachmentsSynced' }
            }
        }
    ]);

    return stats[0] || {
        total: 0,
        active: 0,
        withWatch: 0,
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        emailsImported: 0,
        emailsSent: 0,
        attachmentsSynced: 0
    };
};

module.exports = mongoose.model('GmailIntegration', gmailIntegrationSchema);
