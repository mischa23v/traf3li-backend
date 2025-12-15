const mongoose = require('mongoose');

/**
 * Notification Settings Model
 *
 * User-specific notification preferences for channels and notification types.
 */

// Type preference sub-schema
const typePreferenceSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true
    },
    email: {
        type: Boolean,
        default: true
    },
    sms: {
        type: Boolean,
        default: false
    },
    push: {
        type: Boolean,
        default: true
    },
    inApp: {
        type: Boolean,
        default: true
    }
}, { _id: false });

const notificationSettingsSchema = new mongoose.Schema({
    // User reference
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },

    // Firm reference (optional for multi-tenancy)
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },

    // Global channel preferences
    emailEnabled: {
        type: Boolean,
        default: true
    },
    smsEnabled: {
        type: Boolean,
        default: false
    },
    pushEnabled: {
        type: Boolean,
        default: true
    },
    inAppEnabled: {
        type: Boolean,
        default: true
    },

    // Email settings
    emailAddress: {
        type: String,
        trim: true
    },
    emailDigest: {
        type: String,
        enum: ['immediate', 'daily', 'weekly', 'none'],
        default: 'immediate'
    },
    emailDigestTime: {
        type: String, // HH:mm format
        default: '09:00'
    },

    // SMS settings
    phoneNumber: {
        type: String,
        trim: true
    },
    smsUrgentOnly: {
        type: Boolean,
        default: true
    },

    // Quiet hours (do not disturb)
    quietHoursEnabled: {
        type: Boolean,
        default: false
    },
    quietHoursStart: {
        type: String, // HH:mm format
        default: '22:00'
    },
    quietHoursEnd: {
        type: String, // HH:mm format
        default: '08:00'
    },
    quietHoursExceptions: [{
        type: String,
        enum: ['urgent', 'payment', 'deadline']
    }],

    // Type-specific preferences
    preferences: [typePreferenceSchema],

    // Categories to mute (completely disable)
    mutedTypes: [{
        type: String
    }],

    // Language preference for notifications
    preferredLanguage: {
        type: String,
        enum: ['en', 'ar', 'both'],
        default: 'both'
    },

    // Sound settings
    soundEnabled: {
        type: Boolean,
        default: true
    },
    soundName: {
        type: String,
        default: 'default'
    },

    // Badge settings (for mobile)
    badgeEnabled: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes
notificationSettingsSchema.index({ userId: 1 }, { unique: true });
notificationSettingsSchema.index({ firmId: 1 });

/**
 * Static: Get or create settings for user
 */
notificationSettingsSchema.statics.getOrCreate = async function(userId, firmId = null) {
    let settings = await this.findOne({ userId });

    if (!settings) {
        settings = await this.create({
            userId,
            firmId,
            preferences: this.getDefaultPreferences()
        });
    }

    return settings;
};

/**
 * Static: Get default type preferences
 */
notificationSettingsSchema.statics.getDefaultPreferences = function() {
    return [
        { type: 'invoice', email: true, sms: false, push: true, inApp: true },
        { type: 'invoice_approval_required', email: true, sms: false, push: true, inApp: true },
        { type: 'payment', email: true, sms: true, push: true, inApp: true },
        { type: 'task', email: true, sms: false, push: true, inApp: true },
        { type: 'task_assigned', email: true, sms: false, push: true, inApp: true },
        { type: 'deadline', email: true, sms: true, push: true, inApp: true },
        { type: 'hearing', email: true, sms: true, push: true, inApp: true },
        { type: 'hearing_reminder', email: true, sms: true, push: true, inApp: true },
        { type: 'case', email: true, sms: false, push: true, inApp: true },
        { type: 'case_update', email: false, sms: false, push: true, inApp: true },
        { type: 'message', email: false, sms: false, push: true, inApp: true },
        { type: 'time_entry_submitted', email: true, sms: false, push: true, inApp: true },
        { type: 'time_entry_approved', email: false, sms: false, push: true, inApp: true },
        { type: 'time_entry_rejected', email: true, sms: false, push: true, inApp: true },
        { type: 'expense_submitted', email: true, sms: false, push: true, inApp: true },
        { type: 'expense_approved', email: false, sms: false, push: true, inApp: true },
        { type: 'expense_rejected', email: true, sms: false, push: true, inApp: true },
        { type: 'recurring_invoice', email: true, sms: false, push: true, inApp: true },
        { type: 'credit_note', email: true, sms: false, push: true, inApp: true },
        { type: 'debit_note', email: true, sms: false, push: true, inApp: true },
        { type: 'system', email: false, sms: false, push: false, inApp: true },
        { type: 'reminder', email: true, sms: false, push: true, inApp: true },
        { type: 'alert', email: true, sms: true, push: true, inApp: true }
    ];
};

/**
 * Instance: Get preference for a specific type
 */
notificationSettingsSchema.methods.getPreferenceForType = function(type) {
    // Check if type is muted
    if (this.mutedTypes.includes(type)) {
        return { type, email: false, sms: false, push: false, inApp: false };
    }

    // Find specific preference
    const pref = this.preferences.find(p => p.type === type);
    if (pref) {
        return {
            type,
            email: this.emailEnabled && pref.email,
            sms: this.smsEnabled && pref.sms,
            push: this.pushEnabled && pref.push,
            inApp: this.inAppEnabled && pref.inApp
        };
    }

    // Return defaults based on global settings
    return {
        type,
        email: this.emailEnabled,
        sms: false, // SMS defaults to off unless explicitly enabled
        push: this.pushEnabled,
        inApp: this.inAppEnabled
    };
};

/**
 * Instance: Check if notification should be sent via channel
 */
notificationSettingsSchema.methods.shouldSendVia = function(type, channel, priority = 'normal') {
    // Check quiet hours
    if (this.quietHoursEnabled && !this.quietHoursExceptions.includes(type)) {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const inQuietHours = this.isInQuietHours(currentTime);
        if (inQuietHours && priority !== 'urgent') {
            return false;
        }
    }

    const pref = this.getPreferenceForType(type);
    return pref[channel] || false;
};

/**
 * Instance: Check if current time is within quiet hours
 */
notificationSettingsSchema.methods.isInQuietHours = function(currentTime) {
    const start = this.quietHoursStart;
    const end = this.quietHoursEnd;

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (start > end) {
        return currentTime >= start || currentTime < end;
    }

    return currentTime >= start && currentTime < end;
};

/**
 * Instance: Update preference for a type
 */
notificationSettingsSchema.methods.updatePreference = async function(type, channels) {
    const existingIndex = this.preferences.findIndex(p => p.type === type);

    if (existingIndex >= 0) {
        this.preferences[existingIndex] = { type, ...channels };
    } else {
        this.preferences.push({ type, ...channels });
    }

    await this.save();
    return this;
};

/**
 * Instance: Mute a notification type
 */
notificationSettingsSchema.methods.muteType = async function(type) {
    if (!this.mutedTypes.includes(type)) {
        this.mutedTypes.push(type);
        await this.save();
    }
    return this;
};

/**
 * Instance: Unmute a notification type
 */
notificationSettingsSchema.methods.unmuteType = async function(type) {
    this.mutedTypes = this.mutedTypes.filter(t => t !== type);
    await this.save();
    return this;
};

/**
 * Instance: Get channels to use for a notification
 */
notificationSettingsSchema.methods.getChannelsForNotification = function(type, priority = 'normal') {
    const channels = [];

    if (this.shouldSendVia(type, 'inApp', priority)) {
        channels.push('in_app');
    }
    if (this.shouldSendVia(type, 'email', priority)) {
        channels.push('email');
    }
    if (this.shouldSendVia(type, 'push', priority)) {
        channels.push('push');
    }
    if (this.shouldSendVia(type, 'sms', priority)) {
        // SMS only for urgent or if not urgent-only setting
        if (priority === 'urgent' || !this.smsUrgentOnly) {
            channels.push('sms');
        }
    }

    return channels;
};

module.exports = mongoose.model('NotificationSettings', notificationSettingsSchema);
