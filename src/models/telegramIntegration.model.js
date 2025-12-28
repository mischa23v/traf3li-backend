const mongoose = require('mongoose');

/**
 * Telegram Integration Model
 *
 * Stores Telegram bot configuration and settings for firm-level integrations.
 * Each firm can connect one Telegram bot to receive notifications and interact
 * with their case management system.
 */

// Chat schema for storing known chat IDs
const chatSchema = new mongoose.Schema({
    chatId: {
        type: String,
        required: true
    },
    chatType: {
        type: String,
        enum: ['private', 'group', 'supergroup', 'channel'],
        default: 'private'
    },
    title: {
        type: String,
        required: false
    },
    username: {
        type: String,
        required: false
    },
    addedAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { _id: false });

// Notification settings schema
const notificationSettingsSchema = new mongoose.Schema({
    // Case notifications
    caseCreated: { type: Boolean, default: false },
    caseUpdated: { type: Boolean, default: false },
    caseStatusChanged: { type: Boolean, default: true },
    caseAssigned: { type: Boolean, default: true },
    caseHearing: { type: Boolean, default: true },
    caseDeadline: { type: Boolean, default: true },

    // Invoice notifications
    invoiceCreated: { type: Boolean, default: false },
    invoicePaid: { type: Boolean, default: true },
    invoiceOverdue: { type: Boolean, default: true },
    invoicePartiallyPaid: { type: Boolean, default: false },

    // Task notifications
    taskCreated: { type: Boolean, default: false },
    taskAssigned: { type: Boolean, default: true },
    taskDue: { type: Boolean, default: true },
    taskCompleted: { type: Boolean, default: false },
    taskOverdue: { type: Boolean, default: true },

    // Payment notifications
    paymentReceived: { type: Boolean, default: true },
    paymentFailed: { type: Boolean, default: true },

    // Client notifications
    clientCreated: { type: Boolean, default: false },
    clientMessageReceived: { type: Boolean, default: true },

    // Lead notifications
    leadCreated: { type: Boolean, default: true },
    leadConverted: { type: Boolean, default: true },
    leadStatusChanged: { type: Boolean, default: false },

    // Document notifications
    documentUploaded: { type: Boolean, default: false },
    documentShared: { type: Boolean, default: true },

    // System notifications
    systemAlerts: { type: Boolean, default: true },
    dailySummary: { type: Boolean, default: false },
    weeklySummary: { type: Boolean, default: false }
}, { _id: false });

const telegramIntegrationSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM REFERENCE
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
    // ═══════════════════════════════════════════════════════════════
    // BOT CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    botToken: {
        type: String,
        required: true,
        select: false  // Don't include by default for security
    },

    botUsername: {
        type: String,
        required: false
    },

    botName: {
        type: String,
        required: false
    },

    botId: {
        type: String,
        required: false
    },

    // ═══════════════════════════════════════════════════════════════
    // WEBHOOK CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    webhookUrl: {
        type: String,
        required: false
    },

    webhookSecret: {
        type: String,
        required: false,
        select: false
    },

    webhookSetAt: {
        type: Date,
        required: false
    },

    // ═══════════════════════════════════════════════════════════════
    // CHAT IDS (Known chats that can receive messages)
    // ═══════════════════════════════════════════════════════════════
    chatIds: [chatSchema],

    // Default chat for notifications (if not specified)
    defaultChatId: {
        type: String,
        required: false
    },

    // ═══════════════════════════════════════════════════════════════
    // NOTIFICATION SETTINGS
    // ═══════════════════════════════════════════════════════════════
    notificationSettings: {
        type: notificationSettingsSchema,
        default: () => ({})
    },

    // Notification schedule (when to send)
    notificationSchedule: {
        businessHoursOnly: { type: Boolean, default: false },
        startHour: { type: Number, default: 9, min: 0, max: 23 },
        endHour: { type: Number, default: 18, min: 0, max: 23 },
        timezone: { type: String, default: 'Asia/Riyadh' },
        daysOfWeek: {
            type: [Number],
            default: [1, 2, 3, 4, 5], // Monday to Friday
            validate: {
                validator: function(days) {
                    return days.every(d => d >= 0 && d <= 6);
                },
                message: 'Days of week must be 0-6 (Sunday-Saturday)'
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // BOT COMMANDS & FEATURES
    // ═══════════════════════════════════════════════════════════════
    enabledCommands: {
        status: { type: Boolean, default: true },
        cases: { type: Boolean, default: true },
        tasks: { type: Boolean, default: true },
        invoices: { type: Boolean, default: true },
        clients: { type: Boolean, default: true },
        help: { type: Boolean, default: true },
        stats: { type: Boolean, default: true }
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS & METADATA
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
        type: Date,
        required: false
    },

    lastMessageSentAt: {
        type: Date,
        required: false
    },

    lastMessageReceivedAt: {
        type: Date,
        required: false
    },

    lastErrorAt: {
        type: Date,
        required: false
    },

    lastError: {
        type: String,
        required: false
    },

    // ═══════════════════════════════════════════════════════════════
    // STATISTICS
    // ═══════════════════════════════════════════════════════════════
    stats: {
        messagesSent: { type: Number, default: 0 },
        messagesReceived: { type: Number, default: 0 },
        commandsProcessed: { type: Number, default: 0 },
        notificationsSent: { type: Number, default: 0 },
        errorCount: { type: Number, default: 0 },
        lastResetAt: { type: Date, default: Date.now }
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT FIELDS
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
telegramIntegrationSchema.index({ firmId: 1, isActive: 1 });
telegramIntegrationSchema.index({ 'chatIds.chatId': 1 });

// ═══════════════════════════════════════════════════════════════
// ENCRYPTION PLUGIN - Encrypt sensitive fields
// ═══════════════════════════════════════════════════════════════
const encryptionPlugin = require('./plugins/encryption.plugin');

telegramIntegrationSchema.plugin(encryptionPlugin, {
    fields: ['botToken', 'webhookSecret'],
    searchableFields: []  // These don't need to be searchable
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Add a new chat ID
 */
telegramIntegrationSchema.methods.addChat = function(chatId, chatType, title, username) {
    const existingChat = this.chatIds.find(c => c.chatId === chatId);

    if (existingChat) {
        existingChat.title = title || existingChat.title;
        existingChat.username = username || existingChat.username;
        existingChat.chatType = chatType || existingChat.chatType;
        existingChat.isActive = true;
    } else {
        this.chatIds.push({
            chatId,
            chatType: chatType || 'private',
            title,
            username,
            addedAt: new Date(),
            isActive: true
        });
    }

    return this.save();
};

/**
 * Remove a chat ID
 */
telegramIntegrationSchema.methods.removeChat = function(chatId) {
    this.chatIds = this.chatIds.filter(c => c.chatId !== chatId);

    // Clear default chat if it was removed
    if (this.defaultChatId === chatId) {
        this.defaultChatId = null;
    }

    return this.save();
};

/**
 * Get active chats
 */
telegramIntegrationSchema.methods.getActiveChats = function() {
    return this.chatIds.filter(c => c.isActive);
};

/**
 * Update notification settings
 */
telegramIntegrationSchema.methods.updateNotificationSettings = function(settings) {
    this.notificationSettings = {
        ...this.notificationSettings.toObject(),
        ...settings
    };
    return this.save();
};

/**
 * Increment message counter
 */
telegramIntegrationSchema.methods.incrementMessageSent = function() {
    this.stats.messagesSent += 1;
    this.lastMessageSentAt = new Date();
    return this.save();
};

/**
 * Increment received counter
 */
telegramIntegrationSchema.methods.incrementMessageReceived = function() {
    this.stats.messagesReceived += 1;
    this.lastMessageReceivedAt = new Date();
    return this.save();
};

/**
 * Increment command counter
 */
telegramIntegrationSchema.methods.incrementCommandProcessed = function() {
    this.stats.commandsProcessed += 1;
    return this.save();
};

/**
 * Record error
 */
telegramIntegrationSchema.methods.recordError = function(error) {
    this.stats.errorCount += 1;
    this.lastErrorAt = new Date();
    this.lastError = error.message || String(error);
    return this.save();
};

/**
 * Check if notification type is enabled
 */
telegramIntegrationSchema.methods.isNotificationEnabled = function(notificationType) {
    return this.notificationSettings[notificationType] === true;
};

/**
 * Check if within notification schedule
 */
telegramIntegrationSchema.methods.isWithinNotificationSchedule = function() {
    if (!this.notificationSchedule.businessHoursOnly) {
        return true;
    }

    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();

    // Check day of week
    if (!this.notificationSchedule.daysOfWeek.includes(dayOfWeek)) {
        return false;
    }

    // Check hour
    if (hour < this.notificationSchedule.startHour || hour >= this.notificationSchedule.endHour) {
        return false;
    }

    return true;
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get active integration for a firm
 */
telegramIntegrationSchema.statics.getByFirm = async function(firmId) {
    return this.findOne({ firmId, isActive: true }).select('+botToken');
};

/**
 * Check if firm has Telegram integration
 */
telegramIntegrationSchema.statics.hasIntegration = async function(firmId) {
    const count = await this.countDocuments({ firmId, isActive: true });
    return count > 0;
};

module.exports = mongoose.model('TelegramIntegration', telegramIntegrationSchema);
