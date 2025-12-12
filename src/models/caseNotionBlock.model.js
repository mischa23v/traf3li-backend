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
