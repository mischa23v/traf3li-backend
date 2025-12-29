const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// PAGE ACTIVITY MODEL
// Activity log for page changes and collaboration
// ═══════════════════════════════════════════════════════════════

const ACTIVITY_ACTIONS = [
    'created', 'edited', 'deleted', 'restored', 'shared', 'unshared',
    'commented', 'mentioned', 'block_added', 'block_deleted', 'block_moved',
    'template_applied', 'archived', 'favorited', 'pinned'
];

const pageActivitySchema = new mongoose.Schema({
    pageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CaseNotionPage',
        required: true,
        index: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
     },

    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: String,

    action: {
        type: String,
        enum: ACTIVITY_ACTIONS,
        required: true
    },

    details: mongoose.Schema.Types.Mixed,
    blockId: { type: mongoose.Schema.Types.ObjectId, ref: 'CaseNotionBlock' }
}, { timestamps: { createdAt: true, updatedAt: false } });

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

pageActivitySchema.index({ pageId: 1, createdAt: -1 });
pageActivitySchema.index({ userId: 1, createdAt: -1 });
pageActivitySchema.index({ action: 1 });
pageActivitySchema.index({ firmId: 1, createdAt: -1 });

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = mongoose.model('PageActivity', pageActivitySchema);
module.exports.ACTIVITY_ACTIONS = ACTIVITY_ACTIONS;
