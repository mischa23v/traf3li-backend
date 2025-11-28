const mongoose = require('mongoose');

// Reaction schema
const reactionSchema = new mongoose.Schema({
    emoji: {
        type: String,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const wikiCommentSchema = new mongoose.Schema({
    // Reference to the page
    pageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WikiPage',
        required: true,
        index: true
    },

    // Comment content
    content: {
        type: String,
        required: true,
        maxlength: 5000
    },

    // Thread support (reply to another comment)
    parentCommentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WikiComment'
    },
    replyCount: {
        type: Number,
        default: 0
    },

    // Inline comment support (like Google Docs)
    isInline: {
        type: Boolean,
        default: false
    },
    selectionStart: Number,
    selectionEnd: Number,
    quotedText: {
        type: String,
        maxlength: 1000
    },
    blockId: String, // Reference to specific content block

    // Status
    status: {
        type: String,
        enum: ['active', 'resolved', 'deleted'],
        default: 'active',
        index: true
    },
    resolvedAt: Date,
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    resolveNote: String,

    // Author
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Mentions
    mentions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // Reactions
    reactions: [reactionSchema],

    // Editing
    isEdited: {
        type: Boolean,
        default: false
    },
    editedAt: Date,
    editHistory: [{
        content: String,
        editedAt: Date
    }],

    // Case reference for faster queries
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        index: true
    }
}, {
    timestamps: true,
    versionKey: false
});

// Indexes
wikiCommentSchema.index({ pageId: 1, createdAt: -1 });
wikiCommentSchema.index({ pageId: 1, status: 1 });
wikiCommentSchema.index({ parentCommentId: 1 });
wikiCommentSchema.index({ userId: 1, createdAt: -1 });
wikiCommentSchema.index({ mentions: 1, createdAt: -1 });
wikiCommentSchema.index({ caseId: 1, createdAt: -1 });

// Static: Get comments for a page
wikiCommentSchema.statics.getPageComments = async function(pageId, options = {}) {
    const query = {
        pageId: new mongoose.Types.ObjectId(pageId),
        parentCommentId: { $exists: false } // Only top-level comments
    };

    if (options.status) {
        query.status = options.status;
    } else {
        query.status = { $ne: 'deleted' };
    }

    if (options.isInline !== undefined) {
        query.isInline = options.isInline;
    }

    let cursor = this.find(query)
        .populate('userId', 'firstName lastName avatar')
        .populate('resolvedBy', 'firstName lastName')
        .sort({ createdAt: options.sort === 'asc' ? 1 : -1 });

    if (options.limit) cursor = cursor.limit(options.limit);
    if (options.skip) cursor = cursor.skip(options.skip);

    const comments = await cursor.lean();

    // Fetch replies for each comment
    for (const comment of comments) {
        if (comment.replyCount > 0) {
            comment.replies = await this.find({
                parentCommentId: comment._id,
                status: { $ne: 'deleted' }
            })
            .populate('userId', 'firstName lastName avatar')
            .sort({ createdAt: 1 })
            .lean();
        } else {
            comment.replies = [];
        }
    }

    return comments;
};

// Static: Get inline comments for a page
wikiCommentSchema.statics.getInlineComments = async function(pageId) {
    return await this.find({
        pageId: new mongoose.Types.ObjectId(pageId),
        isInline: true,
        status: { $ne: 'deleted' }
    })
    .populate('userId', 'firstName lastName avatar')
    .sort({ selectionStart: 1 })
    .lean();
};

// Static: Get comment count for a page
wikiCommentSchema.statics.getCommentCount = async function(pageId) {
    return await this.countDocuments({
        pageId: new mongoose.Types.ObjectId(pageId),
        status: { $ne: 'deleted' }
    });
};

// Static: Get unresolved comment count
wikiCommentSchema.statics.getUnresolvedCount = async function(pageId) {
    return await this.countDocuments({
        pageId: new mongoose.Types.ObjectId(pageId),
        status: 'active'
    });
};

// Static: Get mentions for a user
wikiCommentSchema.statics.getUserMentions = async function(userId, options = {}) {
    const query = {
        mentions: new mongoose.Types.ObjectId(userId),
        status: { $ne: 'deleted' }
    };

    return await this.find(query)
        .populate('userId', 'firstName lastName avatar')
        .populate('pageId', 'title urlSlug caseId')
        .sort({ createdAt: -1 })
        .limit(options.limit || 20);
};

// Static: Get recent activity for a case
wikiCommentSchema.statics.getCaseCommentActivity = async function(caseId, limit = 20) {
    return await this.find({
        caseId: new mongoose.Types.ObjectId(caseId),
        status: { $ne: 'deleted' }
    })
    .populate('userId', 'firstName lastName avatar')
    .populate('pageId', 'title urlSlug')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Instance: Add reply
wikiCommentSchema.methods.addReply = async function(userId, content, mentions = []) {
    const reply = new this.constructor({
        pageId: this.pageId,
        parentCommentId: this._id,
        userId,
        content,
        mentions,
        caseId: this.caseId
    });

    await reply.save();

    // Update reply count
    this.replyCount += 1;
    await this.save();

    return reply;
};

// Instance: Resolve comment
wikiCommentSchema.methods.resolve = async function(userId, note) {
    this.status = 'resolved';
    this.resolvedAt = new Date();
    this.resolvedBy = userId;
    this.resolveNote = note;

    // Also resolve all replies
    await this.constructor.updateMany(
        { parentCommentId: this._id },
        { status: 'resolved', resolvedAt: new Date(), resolvedBy: userId }
    );

    return await this.save();
};

// Instance: Reopen comment
wikiCommentSchema.methods.reopen = async function() {
    this.status = 'active';
    this.resolvedAt = undefined;
    this.resolvedBy = undefined;
    this.resolveNote = undefined;

    return await this.save();
};

// Instance: Edit comment
wikiCommentSchema.methods.edit = async function(newContent) {
    // Save old content to history
    if (!this.editHistory) this.editHistory = [];
    this.editHistory.push({
        content: this.content,
        editedAt: new Date()
    });

    this.content = newContent;
    this.isEdited = true;
    this.editedAt = new Date();

    return await this.save();
};

// Instance: Add reaction
wikiCommentSchema.methods.addReaction = async function(userId, emoji) {
    // Remove existing reaction from this user
    this.reactions = this.reactions.filter(
        r => r.userId.toString() !== userId.toString()
    );

    // Add new reaction
    this.reactions.push({ emoji, userId });

    return await this.save();
};

// Instance: Remove reaction
wikiCommentSchema.methods.removeReaction = async function(userId) {
    this.reactions = this.reactions.filter(
        r => r.userId.toString() !== userId.toString()
    );

    return await this.save();
};

// Instance: Soft delete
wikiCommentSchema.methods.softDelete = async function() {
    this.status = 'deleted';

    // Also soft delete all replies
    await this.constructor.updateMany(
        { parentCommentId: this._id },
        { status: 'deleted' }
    );

    // Update parent reply count if this is a reply
    if (this.parentCommentId) {
        await this.constructor.findByIdAndUpdate(
            this.parentCommentId,
            { $inc: { replyCount: -1 } }
        );
    }

    return await this.save();
};

// Post-save hook to update page comment count
wikiCommentSchema.post('save', async function() {
    const WikiPage = mongoose.model('WikiPage');
    const count = await this.constructor.countDocuments({
        pageId: this.pageId,
        status: { $ne: 'deleted' }
    });
    await WikiPage.findByIdAndUpdate(this.pageId, { commentCount: count });
});

module.exports = mongoose.model('WikiComment', wikiCommentSchema);
