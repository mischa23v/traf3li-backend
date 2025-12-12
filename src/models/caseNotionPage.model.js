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

// ═══════════════════════════════════════════════════════════════
// WHITEBOARD CONFIGURATION SCHEMA
// ═══════════════════════════════════════════════════════════════

const whiteboardConfigSchema = new mongoose.Schema({
    // Canvas dimensions
    canvasWidth: { type: Number, default: 5000 },
    canvasHeight: { type: Number, default: 5000 },

    // Viewport/Camera state (like tldraw's TLCamera)
    zoom: { type: Number, default: 1, min: 0.1, max: 4 },
    panX: { type: Number, default: 0 },
    panY: { type: Number, default: 0 },

    // Grid system
    gridEnabled: { type: Boolean, default: true },
    snapToGrid: { type: Boolean, default: true },
    gridSize: { type: Number, default: 20 },
    gridColor: { type: String, default: '#e5e7eb' },

    // Snap settings (like ReactFlow)
    snapToObjects: { type: Boolean, default: true },
    snapDistance: { type: Number, default: 5 },

    // Background
    backgroundColor: { type: String, default: '#ffffff' },
    backgroundPattern: {
        type: String,
        enum: ['none', 'dots', 'lines', 'cross'],
        default: 'dots'
    },

    // Constraints (like ReactFlow translateExtent)
    minZoom: { type: Number, default: 0.1 },
    maxZoom: { type: Number, default: 4 },
    panBounds: {
        minX: { type: Number, default: -10000 },
        maxX: { type: Number, default: 10000 },
        minY: { type: Number, default: -10000 },
        maxY: { type: Number, default: 10000 }
    },

    // Default element settings
    defaultStrokeColor: { type: String, default: '#000000' },
    defaultFillColor: { type: String, default: '#ffffff' },
    defaultStrokeWidth: { type: Number, default: 2 },

    // Collaboration
    showOtherCursors: { type: Boolean, default: true },
    showOtherSelections: { type: Boolean, default: true }
}, { _id: false });

const VIEW_MODES = ['document', 'whiteboard'];

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

    // ═══════════════════════════════════════════════════════════════
    // WHITEBOARD CONFIGURATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * View mode: document (traditional) or whiteboard (canvas)
     */
    viewMode: {
        type: String,
        enum: VIEW_MODES,
        default: 'document'
    },

    /**
     * Whiteboard canvas configuration
     */
    whiteboardConfig: {
        type: whiteboardConfigSchema,
        default: () => ({})
    },

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
module.exports.VIEW_MODES = VIEW_MODES;
