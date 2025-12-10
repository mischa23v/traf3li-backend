const mongoose = require('mongoose');

/**
 * CaseNotion Block Model
 *
 * Represents individual content blocks in a Notion-like editor.
 * Each block is a unit of content that can be reordered, nested, and typed.
 *
 * Key Features:
 * - 50+ block types (text, media, databases, legal-specific)
 * - Hierarchical structure with parent-child relationships
 * - Fractional ordering for easy reordering
 * - Rich text annotations (bold, italic, color, etc.)
 * - Synced blocks for content reuse
 * - Version tracking for conflict resolution
 */

// Rich Text Annotation Schema
const richTextAnnotationSchema = new mongoose.Schema({
    bold: { type: Boolean, default: false },
    italic: { type: Boolean, default: false },
    underline: { type: Boolean, default: false },
    strikethrough: { type: Boolean, default: false },
    code: { type: Boolean, default: false },
    color: {
        type: String,
        enum: [
            'default', 'gray', 'brown', 'orange', 'yellow', 'green',
            'blue', 'purple', 'pink', 'red',
            'gray_background', 'brown_background', 'orange_background',
            'yellow_background', 'green_background', 'blue_background',
            'purple_background', 'pink_background', 'red_background'
        ],
        default: 'default'
    }
}, { _id: false });

// Rich Text Segment Schema
const richTextSegmentSchema = new mongoose.Schema({
    text: { type: String, required: true },
    annotations: { type: richTextAnnotationSchema, default: () => ({}) },
    href: { type: String }, // For links
    mention: {
        type: {
            type: String,
            enum: ['user', 'page', 'date', 'case', 'client', 'document']
        },
        id: { type: mongoose.Schema.Types.ObjectId },
        displayText: { type: String }
    }
}, { _id: false });

// Mention Schema
const mentionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['user', 'page', 'date', 'case', 'client', 'document', 'reminder'],
        required: true
    },
    id: { type: mongoose.Schema.Types.ObjectId },
    displayText: { type: String },
    date: { type: Date } // For date mentions
}, { _id: false });

// Table Cell Schema (for table blocks)
const tableCellSchema = new mongoose.Schema({
    richText: [richTextSegmentSchema],
    plainText: { type: String }
}, { _id: false });

// Table Row Schema
const tableRowSchema = new mongoose.Schema({
    cells: [tableCellSchema]
}, { _id: false });

// Database Property Schema (for inline databases)
const databasePropertySchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: {
        type: String,
        enum: ['title', 'text', 'number', 'select', 'multi_select', 'date', 'person', 'files', 'checkbox', 'url', 'email', 'phone', 'formula', 'relation', 'rollup', 'created_time', 'created_by', 'last_edited_time', 'last_edited_by'],
        required: true
    },
    options: [{
        name: String,
        color: String
    }]
}, { _id: false });

// Main Block Schema
const caseNotionBlockSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // REFERENCES & MULTI-TENANCY
    // ═══════════════════════════════════════════════════════════════
    pageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CaseNotionPage',
        required: true,
        index: true
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        index: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // ═══════════════════════════════════════════════════════════════
    // BLOCK TYPE (50+ types)
    // ═══════════════════════════════════════════════════════════════
    type: {
        type: String,
        required: true,
        enum: [
            // Text Blocks
            'paragraph',
            'heading_1',
            'heading_2',
            'heading_3',
            'quote',
            'callout',

            // List Blocks
            'bulleted_list',
            'numbered_list',
            'to_do',
            'toggle',

            // Media Blocks
            'image',
            'video',
            'audio',
            'file',
            'pdf',
            'embed',
            'bookmark',

            // Advanced Content Blocks
            'code',
            'equation',
            'table',
            'table_row',
            'divider',
            'breadcrumb',
            'table_of_contents',

            // Database Blocks
            'database_inline',
            'database_linked',
            'database_table',
            'database_board',
            'database_list',
            'database_calendar',
            'database_gallery',
            'database_timeline',

            // Layout Blocks
            'column_list',
            'column',
            'synced_block',
            'synced_from',
            'template',
            'template_button',
            'link_to_page',

            // Legal-Specific Blocks
            'legal_citation',
            'case_reference',
            'statute_reference',
            'regulation_reference',
            'deadline_block',
            'court_filing',
            'hearing_notes',
            'deposition_summary',
            'exhibit_reference',
            'witness_statement',
            'expert_opinion',
            'contract_clause',
            'task_embed',
            'document_embed',
            'client_info',
            'opposing_counsel',
            'timeline_event',
            'evidence_log',
            'billing_entry',
            'trust_account_entry',
            'conflict_check',
            'privilege_log',

            // Interactive Blocks
            'button',
            'form',
            'checklist',
            'progress_bar',

            // AI & Automation Blocks
            'ai_generated',
            'summarized_content',
            'extracted_data'
        ],
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // CONTENT (Mixed type - varies by block type)
    // ═══════════════════════════════════════════════════════════════
    content: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
        // Structure varies by type:
        //
        // For text blocks (paragraph, heading, quote):
        // {
        //   text: String,
        //   richText: [richTextSegmentSchema],
        //   plainText: String
        // }
        //
        // For callout:
        // {
        //   text: String,
        //   richText: [richTextSegmentSchema],
        //   icon: String (emoji or icon name),
        //   color: String
        // }
        //
        // For toggle:
        // {
        //   text: String,
        //   richText: [richTextSegmentSchema],
        //   isOpen: Boolean
        // }
        //
        // For to_do:
        // {
        //   text: String,
        //   richText: [richTextSegmentSchema],
        //   checked: Boolean,
        //   assignee: ObjectId
        // }
        //
        // For code:
        // {
        //   code: String,
        //   language: String (javascript, python, java, etc.),
        //   caption: String
        // }
        //
        // For image/video/audio/file:
        // {
        //   url: String,
        //   fileKey: String,
        //   caption: String,
        //   width: Number,
        //   height: Number,
        //   size: Number,
        //   mimeType: String
        // }
        //
        // For embed/bookmark:
        // {
        //   url: String,
        //   caption: String,
        //   title: String,
        //   description: String,
        //   favicon: String,
        //   thumbnail: String
        // }
        //
        // For equation:
        // {
        //   expression: String (LaTeX format)
        // }
        //
        // For table:
        // {
        //   hasColumnHeader: Boolean,
        //   hasRowHeader: Boolean,
        //   rows: [tableRowSchema]
        // }
        //
        // For database_inline:
        // {
        //   title: String,
        //   properties: [databasePropertySchema],
        //   viewType: String (table, board, list, calendar, gallery, timeline)
        // }
        //
        // For database_linked:
        // {
        //   databaseId: ObjectId,
        //   viewId: ObjectId,
        //   viewType: String
        // }
        //
        // For legal_citation:
        // {
        //   citation: String,
        //   caseTitle: String,
        //   court: String,
        //   year: Number,
        //   jurisdiction: String,
        //   source: String (Westlaw, LexisNexis, etc.),
        //   url: String,
        //   pinCite: String (specific page/paragraph)
        // }
        //
        // For case_reference:
        // {
        //   caseId: ObjectId,
        //   caseNumber: String,
        //   caseTitle: String,
        //   displayText: String
        // }
        //
        // For statute_reference:
        // {
        //   statute: String,
        //   section: String,
        //   jurisdiction: String,
        //   year: Number,
        //   url: String
        // }
        //
        // For deadline_block:
        // {
        //   title: String,
        //   dueDate: Date,
        //   priority: String (low, medium, high, critical),
        //   assignee: ObjectId,
        //   status: String (pending, completed, overdue),
        //   reminderDays: Number
        // }
        //
        // For court_filing:
        // {
        //   filingType: String,
        //   court: String,
        //   filingDate: Date,
        //   documentIds: [ObjectId],
        //   status: String (draft, filed, accepted, rejected)
        // }
        //
        // For document_embed:
        // {
        //   documentId: ObjectId,
        //   title: String,
        //   preview: Boolean
        // }
        //
        // For task_embed:
        // {
        //   taskId: ObjectId,
        //   title: String,
        //   status: String,
        //   dueDate: Date
        // }
        //
        // For synced_block (master):
        // {
        //   text: String,
        //   richText: [richTextSegmentSchema],
        //   syncedBlockId: ObjectId (self-reference for tracking)
        // }
        //
        // For synced_from (instance):
        // {
        //   syncedBlockId: ObjectId (reference to master)
        // }
        //
        // For template_button:
        // {
        //   text: String,
        //   templateBlocks: [ObjectId] (blocks to duplicate when clicked)
        // }
        //
        // For column_list:
        // {
        //   columnRatio: [Number] (e.g., [1, 1] for 50/50, [2, 1] for 66/33)
        // }
        //
        // For button:
        // {
        //   text: String,
        //   action: String (navigate, submit, execute),
        //   actionTarget: String,
        //   style: String (primary, secondary, danger)
        // }
        //
        // For progress_bar:
        // {
        //   progress: Number (0-100),
        //   label: String,
        //   color: String
        // }
    },

    // ═══════════════════════════════════════════════════════════════
    // HIERARCHY & ORDERING
    // ═══════════════════════════════════════════════════════════════
    children: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CaseNotionBlock'
    }],
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CaseNotionBlock',
        default: null,
        index: true
    },
    order: {
        type: Number,
        required: true,
        default: 0
        // Uses fractional ordering for easy insertion
        // E.g., blocks at 1.0, 2.0, 3.0 - insert between 1 and 2 at 1.5
    },

    // ═══════════════════════════════════════════════════════════════
    // PROPERTIES & STYLING
    // ═══════════════════════════════════════════════════════════════
    properties: {
        color: {
            type: String,
            enum: [
                'default', 'gray', 'brown', 'orange', 'yellow', 'green',
                'blue', 'purple', 'pink', 'red',
                'gray_background', 'brown_background', 'orange_background',
                'yellow_background', 'green_background', 'blue_background',
                'purple_background', 'pink_background', 'red_background'
            ],
            default: 'default'
        },
        backgroundColor: { type: String },
        width: {
            type: String,
            enum: ['full', 'half', 'third', 'two-thirds', 'quarter'],
            default: 'full'
        },
        alignment: {
            type: String,
            enum: ['left', 'center', 'right', 'justify'],
            default: 'left'
        },
        textDirection: {
            type: String,
            enum: ['ltr', 'rtl', 'auto'],
            default: 'auto'
        },
        language: {
            type: String,
            enum: ['en', 'ar', 'mixed'],
            default: 'en'
        },
        indentLevel: {
            type: Number,
            min: 0,
            max: 10,
            default: 0
        },
        isCollapsed: {
            type: Boolean,
            default: false
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // MENTIONS & REFERENCES
    // ═══════════════════════════════════════════════════════════════
    mentions: [mentionSchema],

    // ═══════════════════════════════════════════════════════════════
    // SYNCED BLOCKS
    // ═══════════════════════════════════════════════════════════════
    syncedFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CaseNotionBlock',
        index: true
        // If set, this block is an instance of a synced block
        // Changes to the master block propagate to all instances
    },
    syncedInstances: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CaseNotionBlock'
        // Track all instances of this synced block (if this is a master)
    }],

    // ═══════════════════════════════════════════════════════════════
    // TEMPLATES
    // ═══════════════════════════════════════════════════════════════
    isTemplate: {
        type: Boolean,
        default: false,
        index: true
    },
    templateName: { type: String },
    templateCategory: {
        type: String,
        enum: ['legal_memo', 'contract', 'pleading', 'motion', 'brief', 'correspondence', 'notes', 'custom']
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    metadata: {
        wordCount: { type: Number, default: 0 },
        characterCount: { type: Number, default: 0 },
        estimatedReadingTime: { type: Number }, // in minutes
        customData: { type: mongoose.Schema.Types.Mixed }
    },

    // ═══════════════════════════════════════════════════════════════
    // VERSIONING & CONFLICT RESOLUTION
    // ═══════════════════════════════════════════════════════════════
    version: {
        type: Number,
        default: 1
        // Increment on each update for optimistic locking
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT TRAIL
    // ═══════════════════════════════════════════════════════════════
    lastEditedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastEditedAt: {
        type: Date,
        default: Date.now
    },

    // ═══════════════════════════════════════════════════════════════
    // SOFT DELETE
    // ═══════════════════════════════════════════════════════════════
    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    },
    deletedAt: { type: Date },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
caseNotionBlockSchema.index({ pageId: 1, order: 1 }); // Fetch blocks in order
caseNotionBlockSchema.index({ pageId: 1, parentId: 1, order: 1 }); // Fetch children in order
caseNotionBlockSchema.index({ caseId: 1, pageId: 1 });
caseNotionBlockSchema.index({ firmId: 1 });
caseNotionBlockSchema.index({ parentId: 1 });
caseNotionBlockSchema.index({ syncedFrom: 1 });
caseNotionBlockSchema.index({ type: 1 });
caseNotionBlockSchema.index({ isTemplate: 1, templateCategory: 1 });
caseNotionBlockSchema.index({ 'content.plainText': 'text' }); // Full-text search
caseNotionBlockSchema.index({ createdAt: -1 });
caseNotionBlockSchema.index({ lastEditedAt: -1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════

/**
 * Virtual: hasChildren
 * Returns true if this block has child blocks
 */
caseNotionBlockSchema.virtual('hasChildren').get(function() {
    return this.children && this.children.length > 0;
});

/**
 * Virtual: depth
 * Calculate nesting depth of this block
 */
caseNotionBlockSchema.virtual('depth').get(function() {
    // This would need to be calculated recursively in practice
    // For now, return a placeholder
    return this.properties?.indentLevel || 0;
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Add a child block to this block
 * @param {Object} blockData - Data for the new child block
 * @returns {Promise<CaseNotionBlock>} - The newly created child block
 */
caseNotionBlockSchema.methods.addChild = async function(blockData) {
    const CaseNotionBlock = mongoose.model('CaseNotionBlock');

    // Get the current max order among children
    const maxOrder = this.children.length > 0
        ? Math.max(...await CaseNotionBlock.find({
            _id: { $in: this.children }
          }).select('order').then(blocks => blocks.map(b => b.order)))
        : 0;

    // Create new child block
    const childBlock = new CaseNotionBlock({
        ...blockData,
        pageId: this.pageId,
        caseId: this.caseId,
        firmId: this.firmId,
        parentId: this._id,
        order: maxOrder + 1,
        createdBy: blockData.createdBy || this.createdBy
    });

    await childBlock.save();

    // Add to parent's children array
    this.children.push(childBlock._id);
    await this.save();

    return childBlock;
};

/**
 * Move this block to a new position
 * @param {Number} newOrder - New order value
 * @returns {Promise<CaseNotionBlock>} - Updated block
 */
caseNotionBlockSchema.methods.moveToPosition = async function(newOrder) {
    this.order = newOrder;
    this.lastEditedAt = new Date();
    await this.save();
    return this;
};

/**
 * Create a duplicate of this block
 * @param {Object} options - Duplication options
 * @returns {Promise<CaseNotionBlock>} - Duplicated block
 */
caseNotionBlockSchema.methods.duplicate = async function(options = {}) {
    const CaseNotionBlock = mongoose.model('CaseNotionBlock');

    const duplicateData = {
        pageId: options.pageId || this.pageId,
        caseId: options.caseId || this.caseId,
        firmId: options.firmId || this.firmId,
        createdBy: options.createdBy || this.createdBy,
        type: this.type,
        content: JSON.parse(JSON.stringify(this.content)), // Deep copy
        parentId: options.parentId || this.parentId,
        order: options.order || this.order,
        properties: JSON.parse(JSON.stringify(this.properties)),
        mentions: JSON.parse(JSON.stringify(this.mentions)),
        metadata: JSON.parse(JSON.stringify(this.metadata))
    };

    const duplicate = new CaseNotionBlock(duplicateData);
    await duplicate.save();

    // Duplicate children if requested
    if (options.includeChildren && this.hasChildren) {
        const children = await CaseNotionBlock.find({
            _id: { $in: this.children }
        }).sort({ order: 1 });

        for (const child of children) {
            await child.duplicate({
                ...options,
                parentId: duplicate._id
            });
        }
    }

    return duplicate;
};

/**
 * Custom JSON representation with populated children
 * @returns {Object} - JSON representation
 */
caseNotionBlockSchema.methods.toJSON = function() {
    const obj = this.toObject();

    // Add virtuals
    obj.hasChildren = this.hasChildren;
    obj.depth = this.depth;

    return obj;
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all blocks for a page, properly nested
 * @param {ObjectId} pageId - Page ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Nested block structure
 */
caseNotionBlockSchema.statics.getPageBlocks = async function(pageId, options = {}) {
    const blocks = await this.find({
        pageId: new mongoose.Types.ObjectId(pageId),
        isDeleted: false
    })
    .sort({ order: 1 })
    .populate('createdBy', 'firstName lastName email')
    .populate('lastEditedBy', 'firstName lastName email')
    .lean();

    // Build nested structure
    const blockMap = new Map();
    const rootBlocks = [];

    // First pass: create map
    blocks.forEach(block => {
        blockMap.set(block._id.toString(), { ...block, children: [] });
    });

    // Second pass: build hierarchy
    blocks.forEach(block => {
        const blockObj = blockMap.get(block._id.toString());

        if (block.parentId) {
            const parent = blockMap.get(block.parentId.toString());
            if (parent) {
                parent.children.push(blockObj);
            }
        } else {
            rootBlocks.push(blockObj);
        }
    });

    return rootBlocks;
};

/**
 * Reorder blocks in batch
 * @param {ObjectId} pageId - Page ID
 * @param {Array} blockOrders - Array of { blockId, order } objects
 * @returns {Promise<void>}
 */
caseNotionBlockSchema.statics.reorderBlocks = async function(pageId, blockOrders) {
    const bulkOps = blockOrders.map(({ blockId, order }) => ({
        updateOne: {
            filter: {
                _id: new mongoose.Types.ObjectId(blockId),
                pageId: new mongoose.Types.ObjectId(pageId)
            },
            update: {
                $set: {
                    order,
                    lastEditedAt: new Date()
                }
            }
        }
    }));

    if (bulkOps.length > 0) {
        await this.bulkWrite(bulkOps);
    }
};

/**
 * Get a block with all nested children
 * @param {ObjectId} blockId - Block ID
 * @returns {Promise<Object>} - Block with nested children
 */
caseNotionBlockSchema.statics.getBlockWithChildren = async function(blockId) {
    const block = await this.findById(blockId)
        .populate('createdBy', 'firstName lastName email')
        .populate('lastEditedBy', 'firstName lastName email')
        .lean();

    if (!block) {
        return null;
    }

    // Recursively fetch children
    const fetchChildren = async (parentBlock) => {
        if (parentBlock.children && parentBlock.children.length > 0) {
            const children = await this.find({
                _id: { $in: parentBlock.children },
                isDeleted: false
            })
            .sort({ order: 1 })
            .lean();

            for (const child of children) {
                await fetchChildren(child);
            }

            parentBlock.children = children;
        }
    };

    await fetchChildren(block);
    return block;
};

/**
 * Search blocks within a case
 * @param {ObjectId} caseId - Case ID
 * @param {String} query - Search query
 * @param {Object} filters - Additional filters
 * @returns {Promise<Array>} - Matching blocks
 */
caseNotionBlockSchema.statics.searchBlocks = async function(caseId, query, filters = {}) {
    const searchQuery = {
        caseId: new mongoose.Types.ObjectId(caseId),
        isDeleted: false
    };

    // Text search
    if (query && query.trim()) {
        searchQuery.$or = [
            { 'content.plainText': { $regex: query, $options: 'i' } },
            { 'content.text': { $regex: query, $options: 'i' } },
            { 'content.code': { $regex: query, $options: 'i' } },
            { 'content.caption': { $regex: query, $options: 'i' } }
        ];
    }

    // Type filter
    if (filters.type) {
        if (Array.isArray(filters.type)) {
            searchQuery.type = { $in: filters.type };
        } else {
            searchQuery.type = filters.type;
        }
    }

    // Page filter
    if (filters.pageId) {
        searchQuery.pageId = new mongoose.Types.ObjectId(filters.pageId);
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
        searchQuery.createdAt = {};
        if (filters.startDate) {
            searchQuery.createdAt.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
            searchQuery.createdAt.$lte = new Date(filters.endDate);
        }
    }

    const results = await this.find(searchQuery)
        .populate('pageId', 'title')
        .populate('createdBy', 'firstName lastName email')
        .populate('lastEditedBy', 'firstName lastName email')
        .sort({ lastEditedAt: -1 })
        .limit(filters.limit || 100)
        .lean();

    return results;
};

/**
 * Update synced block instances when master changes
 * @param {ObjectId} masterBlockId - Master block ID
 * @param {Object} contentUpdate - Updated content
 * @returns {Promise<Number>} - Number of instances updated
 */
caseNotionBlockSchema.statics.updateSyncedInstances = async function(masterBlockId, contentUpdate) {
    const result = await this.updateMany(
        { syncedFrom: new mongoose.Types.ObjectId(masterBlockId) },
        {
            $set: {
                content: contentUpdate,
                lastEditedAt: new Date(),
                version: { $add: ['$version', 1] }
            }
        }
    );

    return result.modifiedCount;
};

/**
 * Get blocks by type
 * @param {ObjectId} pageId - Page ID
 * @param {String|Array} type - Block type(s)
 * @returns {Promise<Array>} - Matching blocks
 */
caseNotionBlockSchema.statics.getBlocksByType = async function(pageId, type) {
    const query = {
        pageId: new mongoose.Types.ObjectId(pageId),
        isDeleted: false
    };

    if (Array.isArray(type)) {
        query.type = { $in: type };
    } else {
        query.type = type;
    }

    return await this.find(query).sort({ order: 1 }).lean();
};

/**
 * Soft delete a block and its children
 * @param {ObjectId} blockId - Block ID
 * @param {ObjectId} userId - User performing deletion
 * @returns {Promise<Number>} - Number of blocks deleted
 */
caseNotionBlockSchema.statics.softDeleteBlock = async function(blockId, userId) {
    const block = await this.findById(blockId);
    if (!block) {
        throw new Error('Block not found');
    }

    const blocksToDelete = [blockId];

    // Recursively find all children
    const findChildren = async (parentId) => {
        const children = await this.find({ parentId }).select('_id');
        for (const child of children) {
            blocksToDelete.push(child._id);
            await findChildren(child._id);
        }
    };

    await findChildren(blockId);

    const result = await this.updateMany(
        { _id: { $in: blocksToDelete } },
        {
            $set: {
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: new mongoose.Types.ObjectId(userId)
            }
        }
    );

    return result.modifiedCount;
};

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Pre-save hook: Update version and edit timestamp
 */
caseNotionBlockSchema.pre('save', function(next) {
    if (this.isModified() && !this.isNew) {
        this.version += 1;
        this.lastEditedAt = new Date();
    }
    next();
});

/**
 * Pre-save hook: Extract plain text from rich text for search
 */
caseNotionBlockSchema.pre('save', function(next) {
    if (this.content && this.content.richText && Array.isArray(this.content.richText)) {
        this.content.plainText = this.content.richText.map(seg => seg.text).join('');
    }
    next();
});

/**
 * Pre-save hook: Calculate word count and character count
 */
caseNotionBlockSchema.pre('save', function(next) {
    if (this.content && this.content.plainText) {
        const text = this.content.plainText;
        this.metadata = this.metadata || {};
        this.metadata.characterCount = text.length;
        this.metadata.wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
        this.metadata.estimatedReadingTime = Math.ceil(this.metadata.wordCount / 200); // 200 words per minute
    }
    next();
});

/**
 * Post-remove hook: Remove references from parent
 */
caseNotionBlockSchema.post('remove', async function(doc) {
    if (doc.parentId) {
        await this.model('CaseNotionBlock').updateOne(
            { _id: doc.parentId },
            { $pull: { children: doc._id } }
        );
    }
});

module.exports = mongoose.model('CaseNotionBlock', caseNotionBlockSchema);
