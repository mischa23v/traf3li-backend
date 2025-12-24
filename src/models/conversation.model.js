const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════════════════════
// OMNICHANNEL INBOX - CONVERSATION MODEL
// ═══════════════════════════════════════════════════════════════════════════════

// Message schema for embedded messages in conversations
const messageSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // MESSAGE DIRECTION & TYPE
    // ═══════════════════════════════════════════════════════════════
    direction: {
        type: String,
        enum: ['inbound', 'outbound'],
        required: true
    },

    // ═══════════════════════════════════════════════════════════════
    // MESSAGE CONTENT
    // ═══════════════════════════════════════════════════════════════
    content: {
        type: String,
        required: true
    },

    contentType: {
        type: String,
        enum: ['text', 'html', 'attachment'],
        default: 'text'
    },

    // ═══════════════════════════════════════════════════════════════
    // ATTACHMENTS
    // ═══════════════════════════════════════════════════════════════
    attachments: [{
        fileName: { type: String, required: true },
        fileSize: Number,
        mimeType: String,
        url: String,
        thumbnailUrl: String,
        uploadedAt: { type: Date, default: Date.now }
    }],

    // ═══════════════════════════════════════════════════════════════
    // MESSAGE TIMESTAMPS & TRACKING
    // ═══════════════════════════════════════════════════════════════
    sentAt: {
        type: Date,
        default: Date.now,
        required: true
    },

    deliveredAt: {
        type: Date
    },

    readAt: {
        type: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // SENDER INFORMATION
    // ═══════════════════════════════════════════════════════════════
    sentBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Inbound messages won't have a user
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    _id: true,
    timestamps: true
});

// Main conversation schema
const conversationSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // CONTACT REFERENCE
    // ═══════════════════════════════════════════════════════════════
    contactId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // CHANNEL INFORMATION
    // ═══════════════════════════════════════════════════════════════
    channel: {
        type: String,
        enum: ['email', 'whatsapp', 'sms', 'live_chat', 'instagram', 'facebook', 'twitter'],
        required: true,
        index: true
    },

    channelIdentifier: {
        type: String,
        required: false, // Channel-specific identifier (email address, phone number, etc.)
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // CONVERSATION STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['open', 'snoozed', 'closed'],
        default: 'open',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // ASSIGNMENT
    // ═══════════════════════════════════════════════════════════════
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        index: true
    },

    team: {
        type: mongoose.Schema.Types.ObjectId,
        required: false, // Reference to Team model if it exists, otherwise ObjectId
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // PRIORITY & SLA
    // ═══════════════════════════════════════════════════════════════
    priority: {
        type: String,
        enum: ['urgent', 'high', 'normal', 'low'],
        default: 'normal',
        required: true,
        index: true
    },

    slaInstanceId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false, // Reference to SLAInstance model when implemented
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // MESSAGES
    // ═══════════════════════════════════════════════════════════════
    messages: [messageSchema],

    // ═══════════════════════════════════════════════════════════════
    // TAGS & CUSTOM FIELDS
    // ═══════════════════════════════════════════════════════════════
    tags: [{
        type: String,
        trim: true
    }],

    customFields: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // ═══════════════════════════════════════════════════════════════
    // CONVERSATION TIMESTAMPS
    // ═══════════════════════════════════════════════════════════════
    lastMessageAt: {
        type: Date,
        index: true
    },

    firstResponseAt: {
        type: Date // When the first outbound message was sent
    },

    snoozeUntil: {
        type: Date,
        index: true
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════════════════════
// INDEXES FOR PERFORMANCE
// ═══════════════════════════════════════════════════════════════════════════════
conversationSchema.index({ firmId: 1, status: 1 });
conversationSchema.index({ firmId: 1, assignedTo: 1 });
conversationSchema.index({ firmId: 1, channel: 1 });
conversationSchema.index({ firmId: 1, contactId: 1 });
conversationSchema.index({ firmId: 1, lastMessageAt: -1 });
conversationSchema.index({ firmId: 1, priority: 1, status: 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE - Update lastMessageAt when messages are added
// ═══════════════════════════════════════════════════════════════════════════════
conversationSchema.pre('save', function(next) {
    if (this.messages && this.messages.length > 0) {
        // Find the most recent message timestamp
        const sortedMessages = this.messages.sort((a, b) =>
            new Date(b.sentAt) - new Date(a.sentAt)
        );
        this.lastMessageAt = sortedMessages[0].sentAt;

        // Set firstResponseAt if not set and there's an outbound message
        if (!this.firstResponseAt) {
            const firstOutbound = this.messages.find(msg => msg.direction === 'outbound');
            if (firstOutbound) {
                this.firstResponseAt = firstOutbound.sentAt;
            }
        }
    }
    next();
});

// ═══════════════════════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Add a message to the conversation
 * @param {Object} messageData - Message data object
 * @returns {Object} The added message
 */
conversationSchema.methods.addMessage = function(messageData) {
    this.messages.push(messageData);
    this.lastMessageAt = messageData.sentAt || new Date();

    // Set firstResponseAt if this is the first outbound message
    if (!this.firstResponseAt && messageData.direction === 'outbound') {
        this.firstResponseAt = messageData.sentAt || new Date();
    }

    return this.messages[this.messages.length - 1];
};

/**
 * Assign conversation to a user
 * @param {ObjectId} userId - User ID to assign to
 */
conversationSchema.methods.assignTo = function(userId) {
    this.assignedTo = userId;
};

/**
 * Snooze conversation until a specific date
 * @param {Date} untilDate - Date to snooze until
 */
conversationSchema.methods.snooze = function(untilDate) {
    this.status = 'snoozed';
    this.snoozeUntil = untilDate;
};

/**
 * Close the conversation
 */
conversationSchema.methods.close = function() {
    this.status = 'closed';
};

/**
 * Reopen the conversation
 */
conversationSchema.methods.reopen = function() {
    this.status = 'open';
    this.snoozeUntil = null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Find or create a conversation for a contact on a specific channel
 * @param {Object} params - Search parameters
 * @returns {Object} Conversation document
 */
conversationSchema.statics.findOrCreate = async function({ firmId, contactId, channel, channelIdentifier }) {
    let conversation = await this.findOne({
        firmId,
        contactId,
        channel,
        status: { $in: ['open', 'snoozed'] }
    });

    if (!conversation) {
        conversation = await this.create({
            firmId,
            contactId,
            channel,
            channelIdentifier,
            status: 'open',
            messages: []
        });
    }

    return conversation;
};

/**
 * Get unread conversations for a user
 * @param {ObjectId} firmId - Firm ID
 * @param {ObjectId} userId - User ID
 * @returns {Array} Array of conversations
 */
conversationSchema.statics.getUnreadForUser = async function(firmId, userId) {
    return this.find({
        firmId,
        assignedTo: userId,
        status: 'open',
        'messages.readAt': null
    }).sort({ lastMessageAt: -1 });
};

// ═══════════════════════════════════════════════════════════════════════════════
// FIRM ISOLATION PLUGIN (RLS-like enforcement)
// ═══════════════════════════════════════════════════════════════════════════════
const firmIsolationPlugin = require('./plugins/firmIsolation.plugin');

/**
 * Apply Row-Level Security (RLS) plugin to enforce firm-level data isolation.
 * This ensures all queries automatically filter by firmId from the request context.
 */
conversationSchema.plugin(firmIsolationPlugin);

module.exports = mongoose.model('Conversation', conversationSchema);
