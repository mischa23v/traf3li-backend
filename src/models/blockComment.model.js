const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// BLOCK COMMENT MODEL
// Comments and discussions on blocks
// ═══════════════════════════════════════════════════════════════

const blockCommentSchema = new mongoose.Schema({
    blockId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CaseNotionBlock',
        required: true,
        index: true
    },
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

    content: { type: String, required: true, maxlength: 5000 },
    parentCommentId: { type: mongoose.Schema.Types.ObjectId, ref: 'BlockComment' },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    isResolved: { type: Boolean, default: false },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

blockCommentSchema.index({ blockId: 1, createdAt: -1 });
blockCommentSchema.index({ pageId: 1, isResolved: 1 });
blockCommentSchema.index({ parentCommentId: 1 });
blockCommentSchema.index({ firmId: 1, createdAt: -1 });

module.exports = mongoose.model('BlockComment', blockCommentSchema);
