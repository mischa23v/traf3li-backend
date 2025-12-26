const mongoose = require('mongoose');
const Counter = require('./counter.model');

/**
 * Ticket Communication Model - Separate Collection for Ticket Communications
 *
 * This model provides an alternative to embedded communications in the Ticket model.
 * Use this for better scalability when tickets have many communications.
 * Allows for better querying, pagination, and real-time updates of conversations.
 */

// ═══════════════════════════════════════════════════════════════
// ATTACHMENT SUBDOCUMENT
// ═══════════════════════════════════════════════════════════════
const attachmentSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: true,
        trim: true
    },

    fileUrl: {
        type: String,
        required: true,
        trim: true
    },

    fileSize: {
        type: Number,
        comment: 'File size in bytes'
    },

    mimeType: {
        type: String,
        trim: true
    },

    uploadedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true, versionKey: false });

// ═══════════════════════════════════════════════════════════════
// TICKET COMMUNICATION SCHEMA
// ═══════════════════════════════════════════════════════════════
const ticketCommunicationSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    communicationId: {
        type: String,
        unique: true,
        required: true,
        index: true,
        comment: 'Auto-generated communication ID (e.g., COMM-0001)'
    },

    // ═══════════════════════════════════════════════════════════════
    // TICKET REFERENCE
    // ═══════════════════════════════════════════════════════════════
    ticketId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ticket',
        required: true,
        index: true,
        comment: 'Reference to the parent ticket'
    },

    ticketNumber: {
        type: Number,
        required: false,
        index: true,
        comment: 'Ticket number for easier querying'
    },

    // ═══════════════════════════════════════════════════════════════
    // SENDER INFORMATION
    // ═══════════════════════════════════════════════════════════════
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        index: true,
        comment: 'User ID of the sender (null for system messages)'
    },

    senderName: {
        type: String,
        required: true,
        trim: true,
        comment: 'Display name of the sender'
    },

    senderEmail: {
        type: String,
        trim: true,
        lowercase: true,
        comment: 'Email address of the sender'
    },

    senderType: {
        type: String,
        enum: ['customer', 'agent', 'system'],
        required: true,
        index: true,
        comment: 'Type of sender'
    },

    // ═══════════════════════════════════════════════════════════════
    // MESSAGE CONTENT
    // ═══════════════════════════════════════════════════════════════
    content: {
        type: String,
        required: true,
        comment: 'Message content'
    },

    contentType: {
        type: String,
        enum: ['text', 'html'],
        default: 'text',
        comment: 'Content format type'
    },

    subject: {
        type: String,
        trim: true,
        comment: 'Subject line (for email communications)'
    },

    // ═══════════════════════════════════════════════════════════════
    // ATTACHMENTS
    // ═══════════════════════════════════════════════════════════════
    attachments: {
        type: [attachmentSchema],
        default: [],
        comment: 'Files attached to this communication'
    },

    // ═══════════════════════════════════════════════════════════════
    // CHANNEL & VISIBILITY
    // ═══════════════════════════════════════════════════════════════
    sentVia: {
        type: String,
        enum: ['email', 'portal', 'phone', 'chat', 'whatsapp', 'api'],
        default: 'portal',
        index: true,
        comment: 'Channel through which the message was sent'
    },

    isInternal: {
        type: Boolean,
        default: false,
        index: true,
        comment: 'True for internal notes not visible to customers'
    },

    // ═══════════════════════════════════════════════════════════════
    // DELIVERY & READ STATUS
    // ═══════════════════════════════════════════════════════════════
    deliveryStatus: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'failed', 'bounced'],
        default: 'sent',
        index: true,
        comment: 'Delivery status for external communications'
    },

    isRead: {
        type: Boolean,
        default: false,
        index: true,
        comment: 'Whether the message has been read by the recipient'
    },

    readAt: {
        type: Date,
        comment: 'When the message was read'
    },

    readBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        comment: 'Who read the message'
    },

    // ═══════════════════════════════════════════════════════════════
    // EMAIL METADATA
    // ═══════════════════════════════════════════════════════════════
    emailMetadata: {
        messageId: {
            type: String,
            comment: 'Email message ID'
        },
        inReplyTo: {
            type: String,
            comment: 'Email In-Reply-To header'
        },
        references: {
            type: [String],
            comment: 'Email References header'
        },
        cc: {
            type: [String],
            comment: 'CC recipients'
        },
        bcc: {
            type: [String],
            comment: 'BCC recipients'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // RESPONSE TRACKING
    // ═══════════════════════════════════════════════════════════════
    inReplyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TicketCommunication',
        comment: 'Communication this is replying to'
    },

    isFirstResponse: {
        type: Boolean,
        default: false,
        comment: 'Whether this is the first agent response to the ticket'
    },

    // ═══════════════════════════════════════════════════════════════
    // TIMESTAMPS
    // ═══════════════════════════════════════════════════════════════
    timestamp: {
        type: Date,
        default: Date.now,
        required: true,
        index: true,
        comment: 'When the communication was created'
    },

    sentAt: {
        type: Date,
        comment: 'When the communication was actually sent (for scheduled messages)'
    },

    // ═══════════════════════════════════════════════════════════════
    // AI & AUTOMATION
    // ═══════════════════════════════════════════════════════════════
    isAutomated: {
        type: Boolean,
        default: false,
        comment: 'Whether this was sent by automation/bot'
    },

    automationSource: {
        type: String,
        comment: 'Source of automation (e.g., "auto-reply", "workflow", "ai-agent")'
    },

    aiGenerated: {
        type: Boolean,
        default: false,
        comment: 'Whether content was AI-generated'
    },

    aiMetadata: {
        model: {
            type: String,
            comment: 'AI model used'
        },
        confidence: {
            type: Number,
            min: 0,
            max: 1,
            comment: 'AI confidence score'
        },
        suggestedBy: {
            type: String,
            comment: 'AI suggestion context'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // SENTIMENT ANALYSIS
    // ═══════════════════════════════════════════════════════════════
    sentiment: {
        score: {
            type: Number,
            min: -1,
            max: 1,
            comment: 'Sentiment score (-1 to 1, negative to positive)'
        },
        label: {
            type: String,
            enum: ['very_negative', 'negative', 'neutral', 'positive', 'very_positive'],
            comment: 'Sentiment label'
        },
        analyzedAt: {
            type: Date,
            comment: 'When sentiment was analyzed'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANCY
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true,
        comment: 'Firm this communication belongs to'
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT FIELDS
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        comment: 'User who created this communication'
    },

    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        comment: 'User who last updated this communication'
    }
}, {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
ticketCommunicationSchema.index({ firmId: 1, ticketId: 1, timestamp: -1 });
ticketCommunicationSchema.index({ firmId: 1, sender: 1, timestamp: -1 });
ticketCommunicationSchema.index({ firmId: 1, senderType: 1, timestamp: -1 });
ticketCommunicationSchema.index({ firmId: 1, sentVia: 1, timestamp: -1 });
ticketCommunicationSchema.index({ firmId: 1, isInternal: 1, timestamp: -1 });
ticketCommunicationSchema.index({ firmId: 1, deliveryStatus: 1 });
ticketCommunicationSchema.index({ firmId: 1, isRead: 1 });
ticketCommunicationSchema.index({ ticketNumber: 1, timestamp: -1 });
ticketCommunicationSchema.index({ 'emailMetadata.messageId': 1 });

// Text search index
ticketCommunicationSchema.index({
    content: 'text',
    subject: 'text'
});

// ═══════════════════════════════════════════════════════════════
// VIRTUAL FIELDS
// ═══════════════════════════════════════════════════════════════
ticketCommunicationSchema.virtual('hasAttachments').get(function() {
    return this.attachments && this.attachments.length > 0;
});

ticketCommunicationSchema.virtual('attachmentCount').get(function() {
    return this.attachments ? this.attachments.length : 0;
});

ticketCommunicationSchema.virtual('isExternal').get(function() {
    return !this.isInternal;
});

ticketCommunicationSchema.virtual('timeSinceSent').get(function() {
    if (this.sentAt || this.timestamp) {
        return Date.now() - (this.sentAt || this.timestamp).getTime();
    }
    return null;
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate next communication ID
 * @returns {Promise<String>} - Formatted communication ID (e.g., COMM-0001)
 */
ticketCommunicationSchema.statics.generateCommunicationId = async function() {
    const seq = await Counter.getNextSequence('ticketCommunication');
    return `COMM-${String(seq).padStart(6, '0')}`;
};

/**
 * Get communications for a ticket
 */
ticketCommunicationSchema.statics.getTicketCommunications = async function(ticketId, options = {}) {
    const query = { ticketId };

    if (options.includeInternal === false) {
        query.isInternal = false;
    }

    if (options.senderType) {
        query.senderType = options.senderType;
    }

    const sort = options.ascending ? { timestamp: 1 } : { timestamp: -1 };
    const limit = options.limit || 100;
    const skip = options.skip || 0;

    return await this.find(query)
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .populate('sender', 'firstName lastName email avatar')
        .populate('readBy', 'firstName lastName')
        .lean();
};

/**
 * Get unread communications for a user
 */
ticketCommunicationSchema.statics.getUnreadCommunications = async function(userId, firmId) {
    return await this.find({
        firmId,
        isRead: false,
        senderType: { $ne: 'system' },
        sender: { $ne: userId }
    })
        .sort({ timestamp: -1 })
        .populate('ticketId', 'ticketId ticketNumber subject')
        .populate('sender', 'firstName lastName email')
        .lean();
};

/**
 * Get communications by channel
 */
ticketCommunicationSchema.statics.getByChannel = async function(firmId, channel, dateRange = {}) {
    const query = { firmId, sentVia: channel };

    if (dateRange.startDate || dateRange.endDate) {
        query.timestamp = {};
        if (dateRange.startDate) query.timestamp.$gte = new Date(dateRange.startDate);
        if (dateRange.endDate) query.timestamp.$lte = new Date(dateRange.endDate);
    }

    return await this.find(query)
        .sort({ timestamp: -1 })
        .populate('ticketId', 'ticketId ticketNumber subject')
        .lean();
};

/**
 * Get communication statistics
 */
ticketCommunicationSchema.statics.getStats = async function(firmId, dateRange = {}) {
    const matchQuery = { firmId };

    if (dateRange.startDate || dateRange.endDate) {
        matchQuery.timestamp = {};
        if (dateRange.startDate) matchQuery.timestamp.$gte = new Date(dateRange.startDate);
        if (dateRange.endDate) matchQuery.timestamp.$lte = new Date(dateRange.endDate);
    }

    const stats = await this.aggregate([
        { $match: matchQuery },
        {
            $facet: {
                byChannel: [
                    { $group: { _id: '$sentVia', count: { $sum: 1 } } }
                ],
                bySenderType: [
                    { $group: { _id: '$senderType', count: { $sum: 1 } } }
                ],
                byDeliveryStatus: [
                    { $group: { _id: '$deliveryStatus', count: { $sum: 1 } } }
                ],
                total: [
                    { $count: 'count' }
                ],
                unreadCount: [
                    { $match: { isRead: false } },
                    { $count: 'count' }
                ],
                avgSentiment: [
                    { $match: { 'sentiment.score': { $exists: true } } },
                    {
                        $group: {
                            _id: null,
                            avgSentiment: { $avg: '$sentiment.score' }
                        }
                    }
                ]
            }
        }
    ]);

    const result = stats[0];

    return {
        total: result.total[0]?.count || 0,
        unreadCount: result.unreadCount[0]?.count || 0,
        byChannel: result.byChannel,
        bySenderType: result.bySenderType,
        byDeliveryStatus: result.byDeliveryStatus,
        avgSentiment: result.avgSentiment[0]?.avgSentiment || null
    };
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Mark communication as read
 */
ticketCommunicationSchema.methods.markAsRead = async function(userId = null) {
    this.isRead = true;
    this.readAt = new Date();
    if (userId) {
        this.readBy = userId;
    }
    await this.save();
    return this;
};

/**
 * Mark communication as unread
 */
ticketCommunicationSchema.methods.markAsUnread = async function() {
    this.isRead = false;
    this.readAt = null;
    this.readBy = null;
    await this.save();
    return this;
};

/**
 * Update delivery status
 */
ticketCommunicationSchema.methods.updateDeliveryStatus = async function(status) {
    this.deliveryStatus = status;
    if (status === 'delivered') {
        this.sentAt = this.sentAt || new Date();
    }
    await this.save();
    return this;
};

/**
 * Add sentiment analysis
 */
ticketCommunicationSchema.methods.addSentiment = async function(score, label) {
    this.sentiment = {
        score,
        label,
        analyzedAt: new Date()
    };
    await this.save();
    return this;
};

/**
 * Add attachment
 */
ticketCommunicationSchema.methods.addAttachment = async function(attachmentData) {
    this.attachments.push({
        fileName: attachmentData.fileName,
        fileUrl: attachmentData.fileUrl,
        fileSize: attachmentData.fileSize,
        mimeType: attachmentData.mimeType,
        uploadedAt: new Date()
    });
    await this.save();
    return this.attachments[this.attachments.length - 1];
};

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE HOOKS
// ═══════════════════════════════════════════════════════════════

// Pre-save hook to auto-generate communication ID
ticketCommunicationSchema.pre('save', async function(next) {
    if (this.isNew && !this.communicationId) {
        this.communicationId = await this.constructor.generateCommunicationId();
    }
    next();
});

// Pre-save hook to set sentAt if not set
ticketCommunicationSchema.pre('save', function(next) {
    if (this.isNew && !this.sentAt) {
        this.sentAt = this.timestamp || new Date();
    }
    next();
});

// Pre-save hook to set createdBy from sender if not set
ticketCommunicationSchema.pre('save', function(next) {
    if (this.isNew && !this.createdBy && this.sender) {
        this.createdBy = this.sender;
    }
    next();
});

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════
module.exports = mongoose.model('TicketCommunication', ticketCommunicationSchema);
