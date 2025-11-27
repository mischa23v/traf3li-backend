const mongoose = require('mongoose');

const userAppSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    appId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'App',
        required: true,
        index: true
    },
    connected: {
        type: Boolean,
        default: false
    },
    // Encrypted OAuth tokens, API keys, etc.
    credentials: {
        accessToken: String,
        refreshToken: String,
        expiresAt: Date,
        apiKey: String,
        webhookUrl: String,
        extra: mongoose.Schema.Types.Mixed
    },
    // User-specific settings for this app
    settings: {
        notifications: {
            type: Boolean,
            default: true
        },
        syncEnabled: {
            type: Boolean,
            default: true
        },
        syncFrequency: {
            type: String,
            enum: ['realtime', 'hourly', 'daily', 'manual'],
            default: 'realtime'
        },
        extra: mongoose.Schema.Types.Mixed
    },
    connectedAt: {
        type: Date
    },
    lastSyncAt: {
        type: Date
    },
    syncStatus: {
        type: String,
        enum: ['idle', 'syncing', 'error', 'success'],
        default: 'idle'
    },
    errorMessage: String
}, {
    timestamps: true,
    versionKey: false
});

// Compound index for unique user-app combinations
userAppSchema.index({ userId: 1, appId: 1 }, { unique: true });

module.exports = mongoose.model('UserApp', userAppSchema);
