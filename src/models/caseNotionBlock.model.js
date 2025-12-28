const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// CASENOTION BLOCK MODEL
// Block-based content for Notion-like pages
// ═══════════════════════════════════════════════════════════════

const richTextAnnotationSchema = new mongoose.Schema({
    bold: { type: Boolean, default: false },
    italic: { type: Boolean, default: false },
    strikethrough: { type: Boolean, default: false },
    underline: { type: Boolean, default: false },
    code: { type: Boolean, default: false },
    color: { type: String, default: 'default' }
}, { _id: false });

const richTextItemSchema = new mongoose.Schema({
    type: { type: String, enum: ['text', 'mention', 'equation'], default: 'text' },
    text: {
        content: String,
        link: String
    },
    mention: {
        type: { type: String, enum: ['user', 'page', 'date', 'task', 'case', 'client'] },
        id: String,
        name: String
    },
    equation: {
        expression: String
    },
    annotations: richTextAnnotationSchema,
    plainText: String
}, { _id: false });

const tableDataSchema = new mongoose.Schema({
    headers: [String],
    rows: [[String]],
    hasHeaderRow: { type: Boolean, default: true },
    hasHeaderColumn: { type: Boolean, default: false }
}, { _id: false });

const BLOCK_TYPES = [
    'text', 'heading_1', 'heading_2', 'heading_3',
    'bulleted_list', 'numbered_list', 'todo', 'toggle',
    'quote', 'callout', 'divider', 'code', 'table',
    'image', 'file', 'bookmark', 'embed', 'synced_block',
    'template', 'column_list', 'column', 'link_to_page',
    'mention', 'equation', 'timeline_entry', 'party_statement',
    'evidence_item', 'legal_citation'
];

const PARTY_TYPES = ['plaintiff', 'defendant', 'witness', 'expert', 'judge'];
const EVIDENCE_TYPES = ['document', 'testimony', 'physical', 'digital', 'expert_opinion'];
const CITATION_TYPES = ['law', 'regulation', 'case_precedent', 'legal_principle'];

// Block color options for whiteboard visual styling
const BLOCK_COLORS = ['default', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray'];

// Priority levels for blocks
const PRIORITY_LEVELS = ['low', 'medium', 'high', 'urgent'];

const caseNotionBlockSchema = new mongoose.Schema({
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
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    type: { type: String, enum: BLOCK_TYPES, required: true },
    content: [richTextItemSchema],
    properties: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Hierarchy
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'CaseNotionBlock' },
    order: { type: Number, default: 0 },
    indent: { type: Number, default: 0 },
    isCollapsed: { type: Boolean, default: false },

    // Synced blocks
    isSyncedBlock: { type: Boolean, default: false },
    syncedFromBlockId: { type: mongoose.Schema.Types.ObjectId, ref: 'CaseNotionBlock' },

    // Todo blocks
    checked: Boolean,

    // Code blocks
    language: String,

    // Callout/Quote blocks
    icon: String,
    color: String,

    // Table blocks
    tableData: tableDataSchema,

    // File/Image blocks
    fileUrl: String,
    fileName: String,
    caption: String,

    // Party statement blocks (Legal-specific)
    partyType: { type: String, enum: PARTY_TYPES },
    statementDate: Date,

    // Evidence blocks (Legal-specific)
    evidenceType: { type: String, enum: EVIDENCE_TYPES },
    evidenceDate: Date,
    evidenceSource: String,

    // Legal citation blocks (Legal-specific)
    citationType: { type: String, enum: CITATION_TYPES },
    citationReference: String,

    // Timeline blocks
    eventDate: Date,
    eventType: String,

    // Linked tasks
    linkedTaskIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],

    // ═══════════════════════════════════════════════════════════════
    // WHITEBOARD/CANVAS POSITIONING
    // ═══════════════════════════════════════════════════════════════

    /**
     * X position on canvas (pixels from left edge)
     * Default: 0 - blocks start at origin
     */
    canvasX: {
        type: Number,
        default: 0,
        min: 0,
        max: 10000
    },

    /**
     * Y position on canvas (pixels from top edge)
     * Default: 0 - blocks start at origin
     */
    canvasY: {
        type: Number,
        default: 0,
        min: 0,
        max: 10000
    },

    /**
     * Width of block on canvas (pixels)
     * Min: 150, Default: 200, Max: 800
     */
    canvasWidth: {
        type: Number,
        default: 200,
        min: 150,
        max: 800
    },

    /**
     * Height of block on canvas (pixels)
     * Min: 100, Default: 150, Max: 600
     */
    canvasHeight: {
        type: Number,
        default: 150,
        min: 100,
        max: 600
    },

    // ═══════════════════════════════════════════════════════════════
    // VISUAL STYLING (WHITEBOARD)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Block background color for visual categorization
     */
    blockColor: {
        type: String,
        enum: BLOCK_COLORS,
        default: 'default'
    },

    /**
     * Priority level for the block
     */
    priority: {
        type: String,
        enum: [...PRIORITY_LEVELS, null],
        default: null
    },

    // ═══════════════════════════════════════════════════════════════
    // SHAPE TYPE SYSTEM (Excalidraw/tldraw inspired)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Shape type for whiteboard elements
     * 'note' = existing document block (default)
     */
    shapeType: {
        type: String,
        enum: ['note', 'rectangle', 'ellipse', 'diamond', 'triangle', 'hexagon',
               'star', 'arrow', 'line', 'sticky', 'frame', 'image', 'embed', 'text_shape'],
        default: 'note'
    },

    // ═══════════════════════════════════════════════════════════════
    // ROTATION & OPACITY
    // ═══════════════════════════════════════════════════════════════

    /**
     * Rotation angle in radians (0 to 2π)
     */
    angle: {
        type: Number,
        default: 0,
        min: 0,
        max: 6.283185  // 2π radians (full rotation)
    },

    /**
     * Opacity level (0-100%)
     */
    opacity: {
        type: Number,
        default: 100,
        min: 0,
        max: 100
    },

    // ═══════════════════════════════════════════════════════════════
    // LAYERING (Fractional Z-Index)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Fractional indexing for z-order (like Excalidraw)
     * Uses string-based fractional indexing for efficient reordering
     */
    zIndex: {
        type: String,
        default: 'a0'
    },

    // ═══════════════════════════════════════════════════════════════
    // ENHANCED VISUAL STYLING (Excalidraw-inspired)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Stroke/border color (hex format)
     */
    strokeColor: {
        type: String,
        default: '#000000'
    },

    /**
     * Stroke width in pixels
     */
    strokeWidth: {
        type: Number,
        default: 2,
        min: 1,
        max: 20
    },

    /**
     * Fill style for shapes
     */
    fillStyle: {
        type: String,
        enum: ['solid', 'hachure', 'cross-hatch', 'none'],
        default: 'solid'
    },

    /**
     * Roughness level (0=clean, 2=hand-drawn)
     */
    roughness: {
        type: Number,
        default: 0,
        min: 0,
        max: 2
    },

    // ═══════════════════════════════════════════════════════════════
    // VERSION CONTROL FOR COLLABORATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Version number for optimistic locking
     */
    version: {
        type: Number,
        default: 1
    },

    /**
     * Random nonce for version detection
     */
    versionNonce: {
        type: Number,
        default: () => Math.floor(Math.random() * 1000000)
    },

    /**
     * Soft delete flag for collaboration
     */
    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // FRAME SUPPORT (Container for other blocks)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Whether this block is a frame (container)
     */
    isFrame: {
        type: Boolean,
        default: false
    },

    /**
     * Child blocks within this frame
     */
    frameChildren: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CaseNotionBlock'
    }],

    /**
     * Display name for the frame
     */
    frameName: {
        type: String,
        maxlength: 100
    },

    // ═══════════════════════════════════════════════════════════════
    // CONNECTION SYSTEM (Bidirectional connections)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Elements bound to this block (arrows, lines, text)
     */
    boundElements: [{
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'BlockConnection' },
        type: { type: String, enum: ['arrow', 'line', 'text'] }
    }],

    /**
     * Connection handles for this block
     */
    handles: [{
        id: { type: String, required: true },
        position: { type: String, enum: ['top', 'right', 'bottom', 'left', 'center'], required: true },
        type: { type: String, enum: ['source', 'target', 'both'], default: 'both' },
        offsetX: { type: Number, default: 0 },
        offsetY: { type: Number, default: 0 }
    }],

    // ═══════════════════════════════════════════════════════════════
    // ARROW-SPECIFIC FIELDS (for shapeType='arrow')
    // ═══════════════════════════════════════════════════════════════

    /**
     * Arrow start configuration
     */
    arrowStart: {
        type: { type: String, enum: ['none', 'arrow', 'triangle', 'circle', 'diamond', 'bar'] },
        boundElementId: mongoose.Schema.Types.ObjectId
    },

    /**
     * Arrow end configuration
     */
    arrowEnd: {
        type: { type: String, enum: ['none', 'arrow', 'triangle', 'circle', 'diamond', 'bar'] },
        boundElementId: mongoose.Schema.Types.ObjectId
    },

    /**
     * Arrow path points (for curved/multi-segment arrows)
     */
    arrowPoints: [{
        x: Number,
        y: Number
    }],

    // ═══════════════════════════════════════════════════════════════
    // ENTITY LINKING (WHITEBOARD)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Link to a case timeline event
     */
    linkedEventId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },

    /**
     * Link to a case task (single reference for whiteboard, linkedTaskIds for multiple)
     */
    linkedTaskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        default: null
    },

    /**
     * Link to a case hearing
     */
    linkedHearingId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },

    /**
     * Link to a case document
     */
    linkedDocumentId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },

    // ═══════════════════════════════════════════════════════════════
    // GROUPING (WHITEBOARD)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Group ID for visually grouping related blocks
     */
    groupId: {
        type: String,
        default: null
    },

    /**
     * Group name for display
     */
    groupName: {
        type: String,
        default: null
    },

    // Collaboration
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lockedAt: Date,
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastEditedAt: Date
}, { timestamps: true });

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

caseNotionBlockSchema.index({ pageId: 1, order: 1 });
caseNotionBlockSchema.index({ pageId: 1, parentId: 1 });
caseNotionBlockSchema.index({ syncedFromBlockId: 1 });
caseNotionBlockSchema.index({ 'content.plainText': 'text' });
caseNotionBlockSchema.index({ type: 1 });
caseNotionBlockSchema.index({ lockedBy: 1 });

// Whiteboard/canvas indexes
caseNotionBlockSchema.index({ pageId: 1, canvasX: 1, canvasY: 1 });
caseNotionBlockSchema.index({ linkedEventId: 1 });
caseNotionBlockSchema.index({ linkedTaskId: 1 });
caseNotionBlockSchema.index({ linkedHearingId: 1 });
caseNotionBlockSchema.index({ linkedDocumentId: 1 });
caseNotionBlockSchema.index({ groupId: 1 });

// New whiteboard indexes (for z-ordering, soft deletes, and frames)
caseNotionBlockSchema.index({ pageId: 1, zIndex: 1 });
caseNotionBlockSchema.index({ pageId: 1, isDeleted: 1 });
caseNotionBlockSchema.index({ isFrame: 1, frameChildren: 1 });
caseNotionBlockSchema.index({ firmId: 1, createdAt: -1 });

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = mongoose.model('CaseNotionBlock', caseNotionBlockSchema);
module.exports.BLOCK_TYPES = BLOCK_TYPES;
module.exports.PARTY_TYPES = PARTY_TYPES;
module.exports.EVIDENCE_TYPES = EVIDENCE_TYPES;
module.exports.CITATION_TYPES = CITATION_TYPES;
module.exports.BLOCK_COLORS = BLOCK_COLORS;
module.exports.PRIORITY_LEVELS = PRIORITY_LEVELS;
