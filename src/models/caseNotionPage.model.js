const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// CASENOTION PAGE MODEL
// Notion-like pages for legal case documentation
// ═══════════════════════════════════════════════════════════════

const pageIconSchema = new mongoose.Schema({
    type: { type: String, enum: ['emoji', 'file', 'external'] },
    emoji: String,
    url: String
}, { _id: false });

const pageCoverSchema = new mongoose.Schema({
    type: { type: String, enum: ['external', 'file', 'gradient'] },
    url: String,
    gradient: String
}, { _id: false });

const backlinkSchema = new mongoose.Schema({
    pageId: { type: mongoose.Schema.Types.ObjectId, ref: 'CaseNotionPage' },
    blockId: { type: mongoose.Schema.Types.ObjectId },
    pageTitle: String
}, { _id: false });

const shareSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    permission: { type: String, enum: ['view', 'comment', 'edit'] }
}, { _id: false });

const databasePropertySchema = new mongoose.Schema({
    name: String,
    type: {
        type: String,
        enum: ['text', 'number', 'select', 'multi_select', 'date', 'person', 'checkbox', 'url', 'email', 'phone', 'relation', 'formula', 'rollup']
    },
    options: [{
        value: String,
        color: String
    }]
}, { _id: false });

const databaseConfigSchema = new mongoose.Schema({
    viewType: {
        type: String,
        enum: ['table', 'board', 'timeline', 'calendar', 'gallery', 'list', 'chart']
    },
    properties: [databasePropertySchema],
    filters: [mongoose.Schema.Types.Mixed],
    sorts: [{
        property: String,
        direction: { type: String, enum: ['asc', 'desc'] }
    }],
    groupBy: String
}, { _id: false });

const PAGE_TYPES = [
    'general', 'strategy', 'timeline', 'evidence', 'arguments',
    'research', 'meeting_notes', 'correspondence', 'witnesses',
    'discovery', 'pleadings', 'settlement', 'brainstorm'
];

const caseNotionPageSchema = new mongoose.Schema({
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        required: true,
        index: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    title: { type: String, required: true, maxlength: 500 },
    titleAr: { type: String, maxlength: 500 },

    pageType: {
        type: String,
        enum: PAGE_TYPES,
        default: 'general'
    },

    icon: pageIconSchema,
    cover: pageCoverSchema,

    // Wiki features
    parentPageId: { type: mongoose.Schema.Types.ObjectId, ref: 'CaseNotionPage' },
    childPageIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CaseNotionPage' }],
    backlinks: [backlinkSchema],

    // Database views
    hasDatabase: { type: Boolean, default: false },
    databaseConfig: databaseConfigSchema,

    // Template
    isTemplate: { type: Boolean, default: false },
    templateCategory: String,

    // Favorites/Pins
    isFavorite: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },

    // Sharing
    isPublic: { type: Boolean, default: false },
    sharedWith: [shareSchema],

    // Version control
    version: { type: Number, default: 1 },
    lastVersionAt: Date,

    // Metadata
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    archivedAt: Date,
    deletedAt: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

caseNotionPageSchema.index({ caseId: 1, pageType: 1 });
caseNotionPageSchema.index({ caseId: 1, isFavorite: 1 });
caseNotionPageSchema.index({ caseId: 1, isPinned: 1 });
caseNotionPageSchema.index({ caseId: 1, archivedAt: 1 });
caseNotionPageSchema.index({ firmId: 1, isTemplate: 1 });
caseNotionPageSchema.index({ lawyerId: 1, isTemplate: 1 });
caseNotionPageSchema.index({ title: 'text', titleAr: 'text' });
caseNotionPageSchema.index({ parentPageId: 1 });
caseNotionPageSchema.index({ createdAt: -1 });
caseNotionPageSchema.index({ updatedAt: -1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════

caseNotionPageSchema.virtual('blocks', {
    ref: 'CaseNotionBlock',
    localField: '_id',
    foreignField: 'pageId'
});

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = mongoose.model('CaseNotionPage', caseNotionPageSchema);
module.exports.PAGE_TYPES = PAGE_TYPES;
