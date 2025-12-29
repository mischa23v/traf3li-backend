const mongoose = require('mongoose');
const encryptionPlugin = require('./plugins/encryption.plugin');

/**
 * Google Calendar Integration Model
 *
 * Stores OAuth tokens and settings for Google Calendar integration
 * per user and firm.
 *
 * Security Features:
 * - Encrypted access/refresh tokens (AES-256-GCM)
 * - Token expiry tracking
 * - Auto-sync settings
 */

const googleCalendarIntegrationSchema = new mongoose.Schema({
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
     },


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
        type: String,
        // Granted OAuth scopes
    },

    // ═══════════════════════════════════════════════════════════════
    // CONNECTION STATUS
    // ═══════════════════════════════════════════════════════════════
    isConnected: {
        type: Boolean,
        default: true,
        index: true
    },

    lastSyncedAt: {
        type: Date
        // Last successful sync timestamp
    },

    lastSyncError: {
        type: String
        // Last sync error message (if any)
    },

    // ═══════════════════════════════════════════════════════════════
    // CALENDAR SELECTION
    // ═══════════════════════════════════════════════════════════════
    selectedCalendars: [{
        calendarId: {
            type: String,
            required: true
            // Google Calendar ID
        },
        name: String,
        backgroundColor: String,
        isPrimary: {
            type: Boolean,
            default: false
        },
        syncEnabled: {
            type: Boolean,
            default: true
        }
    }],

    primaryCalendarId: {
        type: String
        // Default calendar for creating events
    },

    // ═══════════════════════════════════════════════════════════════
    // AUTO-SYNC SETTINGS
    // ═══════════════════════════════════════════════════════════════
    autoSync: {
        enabled: {
            type: Boolean,
            default: false
        },
        direction: {
            type: String,
            enum: ['both', 'import_only', 'export_only'],
            default: 'both'
            // both: bidirectional sync
            // import_only: only sync from Google to TRAF3LI
            // export_only: only sync from TRAF3LI to Google
        },
        syncInterval: {
            type: Number,
            default: 15
            // Sync interval in minutes
        },
        conflictResolution: {
            type: String,
            enum: ['google_wins', 'traf3li_wins', 'newest_wins', 'manual'],
            default: 'newest_wins'
        },
        syncPastEvents: {
            type: Boolean,
            default: false
            // Whether to sync past events
        },
        syncDaysBack: {
            type: Number,
            default: 30
            // How many days back to sync (if syncPastEvents is true)
        },
        syncDaysForward: {
            type: Number,
            default: 90
            // How many days forward to sync
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // WEBHOOK/PUSH NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════
    webhook: {
        channelId: String,
        resourceId: String,
        resourceUri: String,
        expiresAt: Date,
        token: String
        // Google Calendar push notification channel details
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
        eventsImported: {
            type: Number,
            default: 0
        },
        eventsExported: {
            type: Number,
            default: 0
        },
        lastImportCount: {
            type: Number,
            default: 0
        },
        lastExportCount: {
            type: Number,
            default: 0
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    connectedAt: {
        type: Date,
        default: Date.now
    },

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
googleCalendarIntegrationSchema.index({ userId: 1, firmId: 1 }, { unique: true });
googleCalendarIntegrationSchema.index({ userId: 1, isConnected: 1 });
googleCalendarIntegrationSchema.index({ expiresAt: 1 });
googleCalendarIntegrationSchema.index({ 'autoSync.enabled': 1 });

// ═══════════════════════════════════════════════════════════════
// PLUGINS
// ═══════════════════════════════════════════════════════════════
// Apply encryption to sensitive fields
googleCalendarIntegrationSchema.plugin(encryptionPlugin, {
    fields: ['accessToken', 'refreshToken']
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if access token is expired
 */
googleCalendarIntegrationSchema.methods.isTokenExpired = function() {
    return this.expiresAt && new Date() >= this.expiresAt;
};

/**
 * Check if token will expire soon (within 5 minutes)
 */
googleCalendarIntegrationSchema.methods.isTokenExpiringSoon = function() {
    if (!this.expiresAt) return true;
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return fiveMinutesFromNow >= this.expiresAt;
};

/**
 * Mark as disconnected
 */
googleCalendarIntegrationSchema.methods.disconnect = function(userId, reason) {
    this.isConnected = false;
    this.disconnectedAt = new Date();
    this.disconnectedBy = userId;
    this.disconnectReason = reason;
    if (this.autoSync) {
        this.autoSync.enabled = false;
    }
    return this.save();
};

/**
 * Update sync stats
 */
googleCalendarIntegrationSchema.methods.updateSyncStats = function(success, imported = 0, exported = 0) {
    this.syncStats.totalSyncs += 1;
    if (success) {
        this.syncStats.successfulSyncs += 1;
        this.syncStats.eventsImported += imported;
        this.syncStats.eventsExported += exported;
        this.syncStats.lastImportCount = imported;
        this.syncStats.lastExportCount = exported;
        this.lastSyncedAt = new Date();
        this.lastSyncError = null;
    } else {
        this.syncStats.failedSyncs += 1;
    }
    return this.save();
};

/**
 * Add or update selected calendar
 */
googleCalendarIntegrationSchema.methods.addCalendar = function(calendarData) {
    const existing = this.selectedCalendars.find(c => c.calendarId === calendarData.calendarId);

    if (existing) {
        Object.assign(existing, calendarData);
    } else {
        this.selectedCalendars.push(calendarData);
    }

    // Set as primary if it's the first calendar or explicitly marked
    if (this.selectedCalendars.length === 1 || calendarData.isPrimary) {
        this.primaryCalendarId = calendarData.calendarId;
    }

    return this.save();
};

/**
 * Remove calendar from selection
 */
googleCalendarIntegrationSchema.methods.removeCalendar = function(calendarId) {
    this.selectedCalendars = this.selectedCalendars.filter(c => c.calendarId !== calendarId);

    // Update primary if removed
    if (this.primaryCalendarId === calendarId) {
        this.primaryCalendarId = this.selectedCalendars.length > 0
            ? this.selectedCalendars[0].calendarId
            : null;
    }

    return this.save();
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Find active integration for user
 */
googleCalendarIntegrationSchema.statics.findActiveIntegration = async function(userId, firmId = null) {
    return await this.findOne({
        userId,
        firmId,
        isConnected: true
    }).select('+accessToken +refreshToken');
};

/**
 * Find integrations with expired tokens
 */
googleCalendarIntegrationSchema.statics.findExpiredTokens = async function() {
    return await this.find({
        isConnected: true,
        expiresAt: { $lte: new Date() }
    }).select('+refreshToken');
};

/**
 * Find integrations needing sync
 */
googleCalendarIntegrationSchema.statics.findPendingSync = async function() {
    const now = new Date();

    return await this.find({
        isConnected: true,
        'autoSync.enabled': true,
        $or: [
            { lastSyncedAt: null },
            {
                lastSyncedAt: {
                    $lte: new Date(now.getTime() - this.autoSync.syncInterval * 60 * 1000)
                }
            }
        ]
    });
};

/**
 * Get integration stats
 */
googleCalendarIntegrationSchema.statics.getStats = async function(firmId = null) {
    const match = firmId ? { firmId } : {};

    const stats = await this.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                active: { $sum: { $cond: ['$isConnected', 1, 0] } },
                autoSyncEnabled: { $sum: { $cond: ['$autoSync.enabled', 1, 0] } },
                totalSyncs: { $sum: '$syncStats.totalSyncs' },
                successfulSyncs: { $sum: '$syncStats.successfulSyncs' },
                failedSyncs: { $sum: '$syncStats.failedSyncs' },
                eventsImported: { $sum: '$syncStats.eventsImported' },
                eventsExported: { $sum: '$syncStats.eventsExported' }
            }
        }
    ]);

    return stats[0] || {
        total: 0,
        active: 0,
        autoSyncEnabled: 0,
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        eventsImported: 0,
        eventsExported: 0
    };
};

module.exports = mongoose.model('GoogleCalendarIntegration', googleCalendarIntegrationSchema);
