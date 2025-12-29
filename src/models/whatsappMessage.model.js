const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// WHATSAPP MESSAGE MODEL - INDIVIDUAL MESSAGES
// ═══════════════════════════════════════════════════════════════

const whatsappMessageSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: false,
        index: true
     },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WhatsAppConversation',
        required: false,
        index: true
    },

    // WhatsApp message ID (from provider)
    messageId: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // MESSAGE DIRECTION & TYPE
    // ═══════════════════════════════════════════════════════════════
    direction: {
        type: String,
        enum: ['inbound', 'outbound'],
        required: false,
        index: true
    },

    type: {
        type: String,
        enum: [
            'text',
            'template',
            'image',
            'video',
            'document',
            'audio',
            'location',
            'contact',
            'sticker',
            'interactive', // Buttons, lists
            'reaction',
            'unknown'
        ],
        required: false,
        default: 'text'
    },

    // ═══════════════════════════════════════════════════════════════
    // MESSAGE CONTENT
    // ═══════════════════════════════════════════════════════════════
    content: {
        // Text messages
        text: String,

        // Template messages
        templateName: String,
        templateId: String,
        templateLanguage: String,
        templateVariables: [String],

        // Media messages
        mediaUrl: String,
        mediaId: String, // Provider media ID
        mimeType: String,
        fileName: String,
        fileSize: Number,
        caption: String,
        thumbnailUrl: String,

        // Location messages
        location: {
            latitude: Number,
            longitude: Number,
            name: String,
            address: String
        },

        // Contact messages
        contact: {
            name: {
                formatted: String,
                first: String,
                last: String
            },
            phones: [{
                phone: String,
                type: String
            }],
            emails: [{
                email: String,
                type: String
            }],
            organization: String
        },

        // Interactive messages (buttons/lists)
        interactive: {
            type: { type: String, enum: ['button', 'list'] },
            header: String,
            body: String,
            footer: String,
            buttons: [{
                id: String,
                title: String
            }],
            sections: [{
                title: String,
                rows: [{
                    id: String,
                    title: String,
                    description: String
                }]
            }]
        },

        // Reaction
        reaction: {
            emoji: String,
            messageId: String // ID of message being reacted to
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // CONTACT INFORMATION
    // ═══════════════════════════════════════════════════════════════
    senderPhone: {
        type: String,
        required: false
    },

    recipientPhone: {
        type: String,
        required: false
    },

    // For outbound messages
    sentBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS TRACKING
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'read', 'failed', 'deleted'],
        default: 'pending',
        index: true
    },

    // Status history for tracking
    statusHistory: [{
        status: String,
        timestamp: Date,
        errorCode: String,
        errorMessage: String
    }],

    sentAt: Date,
    deliveredAt: Date,
    readAt: Date,
    failedAt: Date,

    errorCode: String,
    errorMessage: String,

    // ═══════════════════════════════════════════════════════════════
    // REPLY CONTEXT
    // ═══════════════════════════════════════════════════════════════
    replyTo: {
        messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppMessage' },
        text: String // Preview of replied message
    },

    // Forwarded message
    isForwarded: { type: Boolean, default: false },
    forwardedFrom: String,

    // ═══════════════════════════════════════════════════════════════
    // PROVIDER DATA
    // ═══════════════════════════════════════════════════════════════
    provider: {
        type: String,
        enum: ['meta', 'msg91', 'twilio'],
        default: 'meta'
    },

    providerMessageId: String,
    providerTimestamp: Date,
    providerData: mongoose.Schema.Types.Mixed,

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },

    // Indicates if message was sent outside 24-hour window (requires template)
    outsideWindow: { type: Boolean, default: false },

    // Auto-generated message
    isAutoReply: { type: Boolean, default: false },
    isBotMessage: { type: Boolean, default: false },

    // Campaign/bulk messaging
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign'
    },

    // Tags for organization
    tags: [{ type: String, trim: true }],

    // Internal notes
    notes: String,

    // ═══════════════════════════════════════════════════════════════
    // ANALYTICS & TRACKING
    // ═══════════════════════════════════════════════════════════════
    tracking: {
        // For template messages with links
        linkClicked: { type: Boolean, default: false },
        linkClickedAt: Date,

        // Button interactions
        buttonClicked: String,
        buttonClickedAt: Date,

        // Response metrics
        responseTime: Number, // Minutes to respond (for inbound messages)
        respondedAt: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // SOFT DELETE
    // ═══════════════════════════════════════════════════════════════
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
whatsappMessageSchema.index({ firmId: 1, conversationId: 1, timestamp: -1 });
whatsappMessageSchema.index({ firmId: 1, direction: 1, status: 1 });
whatsappMessageSchema.index({ firmId: 1, type: 1 });
whatsappMessageSchema.index({ messageId: 1 }, { unique: true, sparse: true });
whatsappMessageSchema.index({ providerMessageId: 1 });
whatsappMessageSchema.index({ senderPhone: 1, timestamp: -1 });
whatsappMessageSchema.index({ recipientPhone: 1, timestamp: -1 });
whatsappMessageSchema.index({ 'content.text': 'text' }); // Full-text search

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
whatsappMessageSchema.pre('save', async function(next) {
    // Update conversation when message is saved
    if (this.isNew) {
        const WhatsAppConversation = mongoose.model('WhatsAppConversation');
        const conversation = await WhatsAppConversation.findById(this.conversationId);

        if (conversation) {
            const messageText = this.content.text ||
                              this.content.caption ||
                              `[${this.type}]`;

            await conversation.updateLastMessage(messageText, this.direction);
        }
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// POST-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
whatsappMessageSchema.post('save', async function(doc) {
    // Track behavioral scoring for lead
    if (doc.direction === 'inbound' && doc.status !== 'failed') {
        const WhatsAppConversation = mongoose.model('WhatsAppConversation');
        const conversation = await WhatsAppConversation.findById(doc.conversationId);

        if (conversation && conversation.leadId) {
            // Track WhatsApp engagement in lead scoring
            const LeadScoringService = require('../services/leadScoring.service');
            try {
                await LeadScoringService.trackWhatsAppMessage(conversation.leadId);
            } catch (error) {
                logger.error('Error tracking WhatsApp message for lead scoring:', error);
            }
        }
    }
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get messages for conversation
whatsappMessageSchema.statics.getConversationMessages = async function(conversationId, options = {}) {
    const query = {
        conversationId: new mongoose.Types.ObjectId(conversationId),
        isDeleted: false
    };

    if (options.beforeDate) {
        query.timestamp = { $lt: new Date(options.beforeDate) };
    }

    return await this.find(query)
        .populate('sentBy', 'firstName lastName avatar')
        .populate('replyTo.messageId', 'content.text timestamp')
        .sort({ timestamp: options.order === 'asc' ? 1 : -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0);
};

// Get message statistics
whatsappMessageSchema.statics.getStats = async function(firmId, dateRange = {}) {
    const matchQuery = {
        firmId: new mongoose.Types.ObjectId(firmId),
        isDeleted: false
    };

    if (dateRange.start) {
        matchQuery.timestamp = { $gte: new Date(dateRange.start) };
    }
    if (dateRange.end) {
        matchQuery.timestamp = { ...matchQuery.timestamp, $lte: new Date(dateRange.end) };
    }

    const byDirection = await this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$direction',
                count: { $sum: 1 },
                delivered: {
                    $sum: { $cond: [{ $in: ['$status', ['delivered', 'read']] }, 1, 0] }
                },
                failed: {
                    $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                }
            }
        }
    ]);

    const byType = await this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } }
    ]);

    const byStatus = await this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    // Response time analysis (for outbound messages replying to inbound)
    const responseTimeAnalysis = await this.aggregate([
        {
            $match: {
                ...matchQuery,
                direction: 'outbound',
                'tracking.responseTime': { $exists: true }
            }
        },
        {
            $group: {
                _id: null,
                avgResponseTime: { $avg: '$tracking.responseTime' },
                minResponseTime: { $min: '$tracking.responseTime' },
                maxResponseTime: { $max: '$tracking.responseTime' }
            }
        }
    ]);

    return {
        total: await this.countDocuments(matchQuery),
        byDirection,
        byType,
        byStatus,
        responseTime: responseTimeAnalysis[0] || null
    };
};

// Search messages
whatsappMessageSchema.statics.searchMessages = async function(firmId, searchText, options = {}) {
    const query = {
        firmId: new mongoose.Types.ObjectId(firmId),
        isDeleted: false,
        $text: { $search: searchText }
    };

    if (options.conversationId) {
        query.conversationId = new mongoose.Types.ObjectId(options.conversationId);
    }

    return await this.find(query)
        .populate('conversationId', 'phoneNumber contactName')
        .sort({ score: { $meta: 'textScore' }, timestamp: -1 })
        .limit(options.limit || 20);
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Update message status
whatsappMessageSchema.methods.updateStatus = async function(newStatus, errorInfo = null) {
    this.status = newStatus;

    // Add to status history
    this.statusHistory.push({
        status: newStatus,
        timestamp: new Date(),
        errorCode: errorInfo?.code,
        errorMessage: errorInfo?.message
    });

    // Update specific timestamp
    switch (newStatus) {
        case 'sent':
            this.sentAt = new Date();
            break;
        case 'delivered':
            this.deliveredAt = new Date();
            break;
        case 'read':
            this.readAt = new Date();
            break;
        case 'failed':
            this.failedAt = new Date();
            this.errorCode = errorInfo?.code;
            this.errorMessage = errorInfo?.message;
            break;
    }

    return await this.save();
};

// Get message preview
whatsappMessageSchema.methods.getPreview = function(maxLength = 100) {
    let preview = '';

    switch (this.type) {
        case 'text':
            preview = this.content.text || '';
            break;
        case 'template':
            preview = `Template: ${this.content.templateName}`;
            break;
        case 'image':
            preview = this.content.caption || '[Image]';
            break;
        case 'video':
            preview = this.content.caption || '[Video]';
            break;
        case 'document':
            preview = `[Document: ${this.content.fileName || 'file'}]`;
            break;
        case 'audio':
            preview = '[Audio message]';
            break;
        case 'location':
            preview = `[Location: ${this.content.location?.name || 'Shared location'}]`;
            break;
        case 'contact':
            preview = `[Contact: ${this.content.contact?.name?.formatted || 'Contact card'}]`;
            break;
        default:
            preview = `[${this.type}]`;
    }

    return preview.substring(0, maxLength);
};

module.exports = mongoose.model('WhatsAppMessage', whatsappMessageSchema);
