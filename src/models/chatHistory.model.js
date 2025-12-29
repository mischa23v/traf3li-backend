const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Message schema for individual messages within a conversation
const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'assistant', 'system'],
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    },
    tokens: {
        type: Number,
        min: 0
    }
}, { _id: true });

// Main chat history schema
const chatHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
     },

    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    provider: {
        type: String,
        enum: ['anthropic', 'openai'],
        required: true,
        default: 'anthropic'
    },
    conversationId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: () => uuidv4()
    },
    title: {
        type: String,
        trim: true,
        maxlength: 200
    },
    messages: {
        type: [messageSchema],
        default: [],
        validate: {
            validator: function(messages) {
                return messages.length <= 1000; // Limit to 1000 messages per conversation
            },
            message: 'A conversation cannot have more than 1000 messages'
        }
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    status: {
        type: String,
        enum: ['active', 'archived'],
        default: 'active',
        index: true
    },
    lastMessageAt: {
        type: Date,
        index: true
    },
    totalTokens: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    versionKey: false,
    timestamps: true
});

// Compound indexes for efficient queries
chatHistorySchema.index({ userId: 1, firmId: 1 });
chatHistorySchema.index({ userId: 1, firmId: 1, status: 1, lastMessageAt: -1 });
chatHistorySchema.index({ conversationId: 1, firmId: 1 });
chatHistorySchema.index({ lastMessageAt: -1 });
chatHistorySchema.index({ createdAt: -1 });

// Pre-save hook to auto-generate title if not provided
chatHistorySchema.pre('save', function(next) {
    // Auto-generate title from first user message if not set
    if (!this.title && this.messages.length > 0) {
        const firstUserMessage = this.messages.find(msg => msg.role === 'user');
        if (firstUserMessage) {
            // Take first 50 characters of first user message as title
            this.title = firstUserMessage.content.substring(0, 50).trim();
            if (firstUserMessage.content.length > 50) {
                this.title += '...';
            }
        }
    }

    // Update lastMessageAt if messages exist
    if (this.messages.length > 0) {
        const lastMessage = this.messages[this.messages.length - 1];
        this.lastMessageAt = lastMessage.timestamp;
    }

    next();
});

// Instance method: Add a message to the conversation
chatHistorySchema.methods.addMessage = async function(role, content, tokens = null) {
    if (!['user', 'assistant', 'system'].includes(role)) {
        throw new Error('Invalid message role. Must be "user", "assistant", or "system"');
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
        throw new Error('Message content is required and must be a non-empty string');
    }

    const message = {
        role,
        content: content.trim(),
        timestamp: new Date(),
        tokens: tokens || undefined
    };

    this.messages.push(message);
    this.lastMessageAt = message.timestamp;

    // Update total tokens if provided
    if (tokens && typeof tokens === 'number' && tokens > 0) {
        this.totalTokens = (this.totalTokens || 0) + tokens;
    }

    // Auto-generate title if this is the first user message
    if (!this.title && role === 'user' && this.messages.filter(m => m.role === 'user').length === 1) {
        this.title = content.substring(0, 50).trim();
        if (content.length > 50) {
            this.title += '...';
        }
    }

    await this.save();
    return message;
};

// Instance method: Archive the conversation
chatHistorySchema.methods.archive = async function() {
    this.status = 'archived';
    await this.save();
    return this;
};

// Instance method: Unarchive the conversation
chatHistorySchema.methods.unarchive = async function() {
    this.status = 'active';
    await this.save();
    return this;
};

// Instance method: Update conversation title
chatHistorySchema.methods.updateTitle = async function(newTitle) {
    if (!newTitle || typeof newTitle !== 'string') {
        throw new Error('Title must be a non-empty string');
    }
    this.title = newTitle.trim().substring(0, 200);
    await this.save();
    return this;
};

// Instance method: Get message count
chatHistorySchema.methods.getMessageCount = function() {
    return {
        total: this.messages.length,
        byRole: {
            user: this.messages.filter(m => m.role === 'user').length,
            assistant: this.messages.filter(m => m.role === 'assistant').length,
            system: this.messages.filter(m => m.role === 'system').length
        }
    };
};

// Instance method: Clear all messages (soft delete - keeps conversation metadata)
chatHistorySchema.methods.clearMessages = async function() {
    this.messages = [];
    this.totalTokens = 0;
    this.lastMessageAt = null;
    await this.save();
    return this;
};

// Static method: Get paginated list of conversations
chatHistorySchema.statics.getConversations = async function(userId, firmId, options = {}) {
    const {
        page = 1,
        limit = 20,
        status = 'active',
        sortBy = 'lastMessageAt',
        sortOrder = 'desc',
        search = null,
        provider = null
    } = options;

    const query = {
        userId: new mongoose.Types.ObjectId(userId),
        firmId: new mongoose.Types.ObjectId(firmId)
    };

    // Filter by status
    if (status) {
        query.status = status;
    }

    // Filter by provider
    if (provider && ['anthropic', 'openai'].includes(provider)) {
        query.provider = provider;
    }

    // Search in title or message content
    if (search && search.trim().length > 0) {
        query.$or = [
            { title: { $regex: search.trim(), $options: 'i' } },
            { 'messages.content': { $regex: search.trim(), $options: 'i' } }
        ];
    }

    const skip = (page - 1) * limit;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [conversations, total] = await Promise.all([
        this.find(query)
            .select('conversationId title provider status lastMessageAt totalTokens createdAt updatedAt')
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .lean(),
        this.countDocuments(query)
    ]);

    // Add message count to each conversation
    const conversationsWithCount = await Promise.all(
        conversations.map(async (conv) => {
            const fullConv = await this.findOne({ conversationId: conv.conversationId });
            return {
                ...conv,
                messageCount: fullConv ? fullConv.messages.length : 0
            };
        })
    );

    return {
        conversations: conversationsWithCount,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasMore: page * limit < total
        }
    };
};

// Static method: Get full conversation by conversationId
chatHistorySchema.statics.getByConversationId = async function(conversationId, firmId = null) {
    const query = { conversationId };

    if (firmId) {
        query.firmId = new mongoose.Types.ObjectId(firmId);
    }

    const conversation = await this.findOne(query)
        .populate('userId', 'firstName lastName email')
        .populate('firmId', 'name');

    return conversation;
};

// Static method: Get conversation statistics
chatHistorySchema.statics.getStats = async function(userId, firmId) {
    const stats = await this.aggregate([
        {
            $match: {
                userId: new mongoose.Types.ObjectId(userId),
                firmId: new mongoose.Types.ObjectId(firmId)
            }
        },
        {
            $group: {
                _id: null,
                totalConversations: { $sum: 1 },
                activeConversations: {
                    $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                },
                archivedConversations: {
                    $sum: { $cond: [{ $eq: ['$status', 'archived'] }, 1, 0] }
                },
                totalMessages: { $sum: { $size: '$messages' } },
                totalTokens: { $sum: '$totalTokens' },
                anthropicConversations: {
                    $sum: { $cond: [{ $eq: ['$provider', 'anthropic'] }, 1, 0] }
                },
                openaiConversations: {
                    $sum: { $cond: [{ $eq: ['$provider', 'openai'] }, 1, 0] }
                }
            }
        }
    ]);

    return stats.length > 0 ? stats[0] : {
        totalConversations: 0,
        activeConversations: 0,
        archivedConversations: 0,
        totalMessages: 0,
        totalTokens: 0,
        anthropicConversations: 0,
        openaiConversations: 0
    };
};

// Static method: Delete old archived conversations (for cleanup)
chatHistorySchema.statics.deleteOldArchivedConversations = async function(daysOld = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.deleteMany({
        status: 'archived',
        updatedAt: { $lt: cutoffDate }
    });

    return {
        deleted: result.deletedCount,
        cutoffDate
    };
};

// Static method: Get recent conversations
chatHistorySchema.statics.getRecentConversations = async function(userId, firmId, limit = 10) {
    return await this.find({
        userId: new mongoose.Types.ObjectId(userId),
        firmId: new mongoose.Types.ObjectId(firmId),
        status: 'active'
    })
    .select('conversationId title provider lastMessageAt totalTokens')
    .sort({ lastMessageAt: -1 })
    .limit(limit)
    .lean();
};

// Static method: Search across all conversations
chatHistorySchema.statics.searchConversations = async function(userId, firmId, searchQuery, options = {}) {
    const { limit = 20, page = 1 } = options;

    if (!searchQuery || searchQuery.trim().length === 0) {
        throw new Error('Search query is required');
    }

    const query = {
        userId: new mongoose.Types.ObjectId(userId),
        firmId: new mongoose.Types.ObjectId(firmId),
        $or: [
            { title: { $regex: searchQuery.trim(), $options: 'i' } },
            { 'messages.content': { $regex: searchQuery.trim(), $options: 'i' } }
        ]
    };

    const skip = (page - 1) * limit;

    const [results, total] = await Promise.all([
        this.find(query)
            .select('conversationId title provider status lastMessageAt')
            .sort({ lastMessageAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        this.countDocuments(query)
    ]);

    return {
        results,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
};

// Static method: Bulk archive conversations
chatHistorySchema.statics.bulkArchive = async function(conversationIds, userId, firmId) {
    const result = await this.updateMany(
        {
            conversationId: { $in: conversationIds },
            userId: new mongoose.Types.ObjectId(userId),
            firmId: new mongoose.Types.ObjectId(firmId)
        },
        {
            $set: { status: 'archived', updatedAt: new Date() }
        }
    );

    return {
        modified: result.modifiedCount,
        matched: result.matchedCount
    };
};

// Static method: Get token usage summary
chatHistorySchema.statics.getTokenUsage = async function(userId, firmId, startDate = null, endDate = null) {
    const matchQuery = {
        userId: new mongoose.Types.ObjectId(userId),
        firmId: new mongoose.Types.ObjectId(firmId)
    };

    if (startDate || endDate) {
        matchQuery.createdAt = {};
        if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
        if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    const usage = await this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$provider',
                totalTokens: { $sum: '$totalTokens' },
                conversationCount: { $sum: 1 }
            }
        }
    ]);

    const summary = {
        anthropic: { totalTokens: 0, conversationCount: 0 },
        openai: { totalTokens: 0, conversationCount: 0 },
        total: { totalTokens: 0, conversationCount: 0 }
    };

    usage.forEach(item => {
        summary[item._id] = {
            totalTokens: item.totalTokens,
            conversationCount: item.conversationCount
        };
        summary.total.totalTokens += item.totalTokens;
        summary.total.conversationCount += item.conversationCount;
    });

    return summary;
};

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
