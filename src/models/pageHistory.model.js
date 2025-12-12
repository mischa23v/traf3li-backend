/**
 * Page History Model for Undo/Redo Support
 * Based on Excalidraw's history stack pattern
 */

const mongoose = require('mongoose');

const pageHistorySchema = new mongoose.Schema({
    pageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CaseNotionPage',
        required: true,
        index: true
    },

    // User who made the change
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Type of change
    actionType: {
        type: String,
        enum: [
            'create_element',
            'delete_element',
            'update_element',
            'move_element',
            'resize_element',
            'rotate_element',
            'style_element',
            'create_connection',
            'delete_connection',
            'update_connection',
            'batch_update',
            'group',
            'ungroup'
        ],
        required: true
    },

    // Element IDs affected
    elementIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CaseNotionBlock'
    }],

    // Connection IDs affected
    connectionIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BlockConnection'
    }],

    // State before the change (for undo)
    previousState: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },

    // State after the change (for redo)
    newState: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },

    // Timestamp
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },

    // Whether this action has been undone
    isUndone: {
        type: Boolean,
        default: false
    },

    // Sequence number for ordering
    sequence: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

// Compound index for efficient history queries
pageHistorySchema.index({ pageId: 1, userId: 1, timestamp: -1 });
pageHistorySchema.index({ pageId: 1, sequence: -1 });

// Clean up old history (keep last 100 actions per page per user)
pageHistorySchema.statics.cleanupOldHistory = async function(pageId, userId, keepCount = 100) {
    const count = await this.countDocuments({ pageId, userId });
    if (count > keepCount) {
        const toDelete = await this.find({ pageId, userId })
            .sort({ sequence: 1 })
            .limit(count - keepCount)
            .select('_id');
        await this.deleteMany({ _id: { $in: toDelete.map(d => d._id) } });
    }
};

// Get undo stack for a user on a page
pageHistorySchema.statics.getUndoStack = async function(pageId, userId, limit = 50) {
    return this.find({
        pageId,
        userId,
        isUndone: false
    })
    .sort({ sequence: -1 })
    .limit(limit);
};

// Get redo stack for a user on a page
pageHistorySchema.statics.getRedoStack = async function(pageId, userId, limit = 50) {
    return this.find({
        pageId,
        userId,
        isUndone: true
    })
    .sort({ sequence: -1 })
    .limit(limit);
};

module.exports = mongoose.model('PageHistory', pageHistorySchema);
