const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// WHATSAPP CONVERSATION MODEL - CONVERSATION THREADS
// ═══════════════════════════════════════════════════════════════

const whatsappConversationSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: false,
        index: true
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // Unique conversation ID
    conversationId: {
        type: String,
        unique: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // RELATED ENTITIES
    // ═══════════════════════════════════════════════════════════════
    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
        index: true
    },

    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        index: true
    },

    contactId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact',
        index: true
    },

    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // CONTACT INFORMATION
    // ═══════════════════════════════════════════════════════════════
    phoneNumber: {
        type: String,
        required: false,
        index: true,
        trim: true
    },

    // Denormalized contact info for quick display
    contactName: String,
    contactType: {
        type: String,
        enum: ['lead', 'client', 'contact', 'unknown'],
        default: 'unknown'
    },

    // ═══════════════════════════════════════════════════════════════
    // CONVERSATION STATE
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['active', 'closed', 'pending', 'archived'],
        default: 'active',
        index: true
    },

    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },

    // ═══════════════════════════════════════════════════════════════
    // MESSAGE TRACKING
    // ═══════════════════════════════════════════════════════════════
    messageCount: { type: Number, default: 0 },
    unreadCount: { type: Number, default: 0 },

    lastMessageAt: Date,
    lastMessageText: String, // Preview of last message
    lastMessageDirection: {
        type: String,
        enum: ['inbound', 'outbound']
    },

    firstMessageAt: Date,

    // ═══════════════════════════════════════════════════════════════
    // WHATSAPP 24-HOUR WINDOW
    // ═══════════════════════════════════════════════════════════════
    window: {
        isOpen: { type: Boolean, default: false },
        expiresAt: Date,
        lastOpenedAt: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // ASSIGNMENT & HANDLING
    // ═══════════════════════════════════════════════════════════════
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    assignedAt: Date,
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Queue/department
    department: String,

    // Team members with access
    teamMembers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // ═══════════════════════════════════════════════════════════════
    // CONVERSATION METADATA
    // ═══════════════════════════════════════════════════════════════
    tags: [{ type: String, trim: true }],

    subject: String, // Optional subject/title
    notes: String,

    // Conversation labels (like Gmail labels)
    labels: [{
        type: String,
        enum: [
            'new_inquiry',
            'appointment',
            'follow_up',
            'urgent',
            'payment',
            'document_request',
            'complaint',
            'general_question',
            'spam'
        ]
    }],

    // ═══════════════════════════════════════════════════════════════
    // RESPONSE METRICS
    // ═══════════════════════════════════════════════════════════════
    metrics: {
        firstResponseTime: Number, // Minutes
        avgResponseTime: Number, // Minutes
        totalResponses: { type: Number, default: 0 },
        responseRate: Number, // Percentage
        lastResponseAt: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // AUTO-REPLY & AUTOMATION
    // ═══════════════════════════════════════════════════════════════
    automation: {
        autoReplyEnabled: { type: Boolean, default: false },
        autoReplySent: { type: Boolean, default: false },
        autoReplyAt: Date,

        botHandling: { type: Boolean, default: false },
        escalatedToHuman: { type: Boolean, default: false },
        escalatedAt: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // PROVIDER DATA
    // ═══════════════════════════════════════════════════════════════
    provider: {
        type: String,
        enum: ['meta', 'msg91', 'twilio'],
        default: 'meta'
    },

    providerConversationId: String, // Provider's conversation ID
    providerData: mongoose.Schema.Types.Mixed,

    // ═══════════════════════════════════════════════════════════════
    // CLOSURE
    // ═══════════════════════════════════════════════════════════════
    closedAt: Date,
    closedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    closeReason: {
        type: String,
        enum: [
            'resolved',
            'converted_to_client',
            'not_interested',
            'no_response',
            'spam',
            'duplicate',
            'other'
        ]
    },
    closeNotes: String,

    // ═══════════════════════════════════════════════════════════════
    // QUALITY & SATISFACTION
    // ═══════════════════════════════════════════════════════════════
    satisfaction: {
        rating: { type: Number, min: 1, max: 5 },
        feedback: String,
        ratedAt: Date
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
whatsappConversationSchema.index({ firmId: 1, status: 1, lastMessageAt: -1 });
whatsappConversationSchema.index({ firmId: 1, assignedTo: 1, status: 1 });
whatsappConversationSchema.index({ firmId: 1, phoneNumber: 1 });
whatsappConversationSchema.index({ firmId: 1, unreadCount: -1 });
whatsappConversationSchema.index({ conversationId: 1 }, { unique: true });
whatsappConversationSchema.index({ leadId: 1 });
whatsappConversationSchema.index({ clientId: 1 });
whatsappConversationSchema.index({ 'window.expiresAt': 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
whatsappConversationSchema.pre('save', async function(next) {
    // Generate conversation ID if not exists
    if (!this.conversationId) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const count = await this.constructor.countDocuments({
            createdAt: {
                $gte: new Date(year, date.getMonth(), date.getDate()),
                $lt: new Date(year, date.getMonth(), date.getDate() + 1)
            }
        });
        this.conversationId = `WA-${year}${month}${day}-${String(count + 1).padStart(4, '0')}`;
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get or create conversation by phone number
whatsappConversationSchema.statics.getOrCreate = async function(firmId, phoneNumber, entityData = {}) {
    let conversation = await this.findOne({ firmId, phoneNumber, status: { $ne: 'archived' } });

    if (!conversation) {
        conversation = await this.create({
            firmId,
            phoneNumber,
            leadId: entityData.leadId,
            clientId: entityData.clientId,
            contactId: entityData.contactId,
            contactName: entityData.contactName,
            contactType: entityData.contactType || 'unknown',
            firstMessageAt: new Date()
        });
    }

    return conversation;
};

// Get active conversations
whatsappConversationSchema.statics.getActiveConversations = async function(firmId, filters = {}) {
    const query = {
        firmId: new mongoose.Types.ObjectId(firmId),
        status: 'active'
    };

    if (filters.assignedTo) {
        query.assignedTo = new mongoose.Types.ObjectId(filters.assignedTo);
    }

    if (filters.unreadOnly) {
        query.unreadCount = { $gt: 0 };
    }

    if (filters.labels && filters.labels.length > 0) {
        query.labels = { $in: filters.labels };
    }

    return await this.find(query)
        .populate('assignedTo', 'firstName lastName avatar')
        .populate('leadId', 'firstName lastName companyName')
        .populate('clientId', 'firstName lastName companyName')
        .sort({ lastMessageAt: -1 })
        .limit(filters.limit || 50)
        .skip(filters.skip || 0);
};

// Get conversation statistics
whatsappConversationSchema.statics.getStats = async function(firmId, dateRange = {}) {
    const matchQuery = { firmId: new mongoose.Types.ObjectId(firmId) };

    if (dateRange.start) {
        matchQuery.createdAt = { $gte: new Date(dateRange.start) };
    }
    if (dateRange.end) {
        matchQuery.createdAt = { ...matchQuery.createdAt, $lte: new Date(dateRange.end) };
    }

    const byStatus = await this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalMessages: { $sum: '$messageCount' },
                avgResponseTime: { $avg: '$metrics.avgResponseTime' }
            }
        }
    ]);

    const unread = await this.aggregate([
        { $match: { ...matchQuery, unreadCount: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$unreadCount' }, conversations: { $sum: 1 } } }
    ]);

    const total = await this.countDocuments(matchQuery);

    return {
        total,
        byStatus,
        unread: unread[0] || { total: 0, conversations: 0 }
    };
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Open 24-hour window
whatsappConversationSchema.methods.openWindow = function() {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    this.window.isOpen = true;
    this.window.expiresAt = expiresAt;
    this.window.lastOpenedAt = now;

    return this.save();
};

// Check if window is open
whatsappConversationSchema.methods.isWindowOpen = function() {
    if (!this.window.isOpen) return false;
    if (!this.window.expiresAt) return false;
    return new Date() < this.window.expiresAt;
};

// Mark messages as read
whatsappConversationSchema.methods.markAsRead = function() {
    this.unreadCount = 0;
    return this.save();
};

// Update last message
whatsappConversationSchema.methods.updateLastMessage = function(messageText, direction) {
    this.lastMessageAt = new Date();
    this.lastMessageText = messageText.substring(0, 200); // Preview
    this.lastMessageDirection = direction;
    this.messageCount += 1;

    if (direction === 'inbound') {
        this.unreadCount += 1;
        // Open 24-hour window on inbound message
        this.openWindow();
    }

    return this.save();
};

// Calculate response time
whatsappConversationSchema.methods.updateResponseMetrics = function(responseTimeMinutes) {
    if (!this.metrics.firstResponseTime) {
        this.metrics.firstResponseTime = responseTimeMinutes;
    }

    const totalResponses = this.metrics.totalResponses || 0;
    const currentAvg = this.metrics.avgResponseTime || 0;

    this.metrics.avgResponseTime = ((currentAvg * totalResponses) + responseTimeMinutes) / (totalResponses + 1);
    this.metrics.totalResponses = totalResponses + 1;
    this.metrics.lastResponseAt = new Date();

    return this.save();
};

module.exports = mongoose.model('WhatsAppConversation', whatsappConversationSchema);
