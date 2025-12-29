const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// SYNCED BLOCK MODEL
// Manages block synchronization across pages
// ═══════════════════════════════════════════════════════════════

const syncedBlockSchema = new mongoose.Schema({
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
    originalBlockId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CaseNotionBlock',
        required: true,
        index: true
    },
    originalPageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CaseNotionPage',
        required: true,
        index: true
    },
    syncedToPages: [{
        pageId: { type: mongoose.Schema.Types.ObjectId, ref: 'CaseNotionPage' },
        blockId: { type: mongoose.Schema.Types.ObjectId, ref: 'CaseNotionBlock' }
    }],
    content: [mongoose.Schema.Types.Mixed],
    properties: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

syncedBlockSchema.index({ firmId: 1, createdAt: -1 });
syncedBlockSchema.index({ 'syncedToPages.pageId': 1 });
syncedBlockSchema.index({ 'syncedToPages.blockId': 1 });

module.exports = mongoose.model('SyncedBlock', syncedBlockSchema);
