const mongoose = require('mongoose');
const encryptionPlugin = require('./plugins/encryption.plugin');

/**
 * Zoom Integration Model
 *
 * Stores OAuth tokens and settings for Zoom integration
 * per user and firm.
 *
 * Security Features:
 * - Encrypted access/refresh tokens (AES-256-GCM)
 * - Token expiry tracking
 * - Meeting settings and preferences
 */

const zoomIntegrationSchema = new mongoose.Schema({
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

    tokenExpiresAt: {
        type: Date,
        required: true,
        index: true
        // When the access token expires
    },

    scopes: {
        type: [String],
        default: []
        // Granted OAuth scopes
    },

    // ═══════════════════════════════════════════════════════════════
    // ZOOM USER INFO
    // ═══════════════════════════════════════════════════════════════
    zoomUserId: {
        type: String,
        required: true,
        index: true
        // Zoom user ID
    },

    email: {
        type: String,
        required: true
        // Zoom account email
    },

    accountId: {
        type: String
        // Zoom account ID
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

    disconnectedAt: {
        type: Date
    },

    disconnectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    disconnectReason: {
        type: String
    },

    // ═══════════════════════════════════════════════════════════════
    // DEFAULT MEETING SETTINGS
    // ═══════════════════════════════════════════════════════════════
    meetingSettings: {
        // Host video
        hostVideo: {
            type: Boolean,
            default: true
        },
        // Participant video
        participantVideo: {
            type: Boolean,
            default: true
        },
        // Join before host
        joinBeforeHost: {
            type: Boolean,
            default: false
        },
        // Mute upon entry
        muteUponEntry: {
            type: Boolean,
            default: false
        },
        // Waiting room
        waitingRoom: {
            type: Boolean,
            default: true
        },
        // Auto recording
        autoRecording: {
            type: String,
            enum: ['none', 'local', 'cloud'],
            default: 'none'
        },
        // Meeting authentication
        meetingAuthentication: {
            type: Boolean,
            default: false
        },
        // Default duration (minutes)
        defaultDuration: {
            type: Number,
            default: 60
        },
        // Audio options
        audio: {
            type: String,
            enum: ['both', 'telephony', 'voip'],
            default: 'both'
        },
        // Allow screen sharing
        allowScreenSharing: {
            type: Boolean,
            default: true
        },
        // Enable breakout rooms
        breakoutRoom: {
            type: Boolean,
            default: false
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // WEBHOOK SUBSCRIPTION
    // ═══════════════════════════════════════════════════════════════
    webhook: {
        subscriptionId: String,
        eventTypes: [String],
        status: {
            type: String,
            enum: ['active', 'inactive', 'error'],
            default: 'inactive'
        },
        createdAt: Date,
        lastEventAt: Date
        // Zoom webhook subscription details
    },

    // ═══════════════════════════════════════════════════════════════
    // USAGE STATISTICS
    // ═══════════════════════════════════════════════════════════════
    stats: {
        totalMeetingsCreated: {
            type: Number,
            default: 0
        },
        totalMeetingsHosted: {
            type: Number,
            default: 0
        },
        totalParticipants: {
            type: Number,
            default: 0
        },
        totalMinutes: {
            type: Number,
            default: 0
        },
        lastMeetingAt: {
            type: Date
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    lastSyncedAt: {
        type: Date
    },

    lastSyncError: {
        type: String
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
zoomIntegrationSchema.index({ userId: 1, firmId: 1 }, { unique: true });
zoomIntegrationSchema.index({ userId: 1, isActive: 1 });
zoomIntegrationSchema.index({ zoomUserId: 1 });
zoomIntegrationSchema.index({ tokenExpiresAt: 1 });
zoomIntegrationSchema.index({ email: 1 });

// ═══════════════════════════════════════════════════════════════
// PLUGINS
// ═══════════════════════════════════════════════════════════════
// Apply encryption to sensitive fields
zoomIntegrationSchema.plugin(encryptionPlugin, {
    fields: ['accessToken', 'refreshToken']
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if access token is expired
 */
zoomIntegrationSchema.methods.isTokenExpired = function() {
    return this.tokenExpiresAt && new Date() >= this.tokenExpiresAt;
};

/**
 * Check if token will expire soon (within 5 minutes)
 */
zoomIntegrationSchema.methods.isTokenExpiringSoon = function() {
    if (!this.tokenExpiresAt) return true;
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return fiveMinutesFromNow >= this.tokenExpiresAt;
};

/**
 * Mark as disconnected
 */
zoomIntegrationSchema.methods.disconnect = function(userId, reason) {
    this.isActive = false;
    this.disconnectedAt = new Date();
    this.disconnectedBy = userId;
    this.disconnectReason = reason;
    if (this.webhook) {
        this.webhook.status = 'inactive';
    }
    return this.save();
};

/**
 * Update meeting statistics
 */
zoomIntegrationSchema.methods.updateMeetingStats = function(meetingData) {
    if (!this.stats) this.stats = {};

    if (meetingData.created) {
        this.stats.totalMeetingsCreated = (this.stats.totalMeetingsCreated || 0) + 1;
    }

    if (meetingData.hosted) {
        this.stats.totalMeetingsHosted = (this.stats.totalMeetingsHosted || 0) + 1;
        this.stats.lastMeetingAt = new Date();
    }

    if (meetingData.participants) {
        this.stats.totalParticipants = (this.stats.totalParticipants || 0) + meetingData.participants;
    }

    if (meetingData.duration) {
        this.stats.totalMinutes = (this.stats.totalMinutes || 0) + meetingData.duration;
    }

    return this.save();
};

/**
 * Update meeting settings
 */
zoomIntegrationSchema.methods.updateSettings = function(settings) {
    if (!this.meetingSettings) this.meetingSettings = {};

    Object.keys(settings).forEach(key => {
        if (this.meetingSettings[key] !== undefined) {
            this.meetingSettings[key] = settings[key];
        }
    });

    this.markModified('meetingSettings');
    return this.save();
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Find active integration for user
 */
zoomIntegrationSchema.statics.findActiveIntegration = async function(userId, firmId = null) {
    return await this.findOne({
        userId,
        firmId,
        isActive: true
    }).select('+accessToken +refreshToken');
};

/**
 * Find integrations with expired tokens
 */
zoomIntegrationSchema.statics.findExpiredTokens = async function() {
    return await this.find({
        isActive: true,
        tokenExpiresAt: { $lte: new Date() }
    }).select('+refreshToken');
};

/**
 * Find integration by Zoom user ID
 */
zoomIntegrationSchema.statics.findByZoomUserId = async function(zoomUserId) {
    return await this.findOne({
        zoomUserId,
        isActive: true
    });
};

/**
 * Get integration stats
 */
zoomIntegrationSchema.statics.getStats = async function(firmId = null) {
    const match = firmId ? { firmId } : {};

    const stats = await this.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                active: { $sum: { $cond: ['$isActive', 1, 0] } },
                totalMeetingsCreated: { $sum: '$stats.totalMeetingsCreated' },
                totalMeetingsHosted: { $sum: '$stats.totalMeetingsHosted' },
                totalParticipants: { $sum: '$stats.totalParticipants' },
                totalMinutes: { $sum: '$stats.totalMinutes' }
            }
        }
    ]);

    return stats[0] || {
        total: 0,
        active: 0,
        totalMeetingsCreated: 0,
        totalMeetingsHosted: 0,
        totalParticipants: 0,
        totalMinutes: 0
    };
};

module.exports = mongoose.model('ZoomIntegration', zoomIntegrationSchema);
