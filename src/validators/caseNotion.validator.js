/**
 * CaseNotion Route Validation Schemas
 * Uses Joi for request validation (consistent with project patterns)
 */

const Joi = require('joi');

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const PAGE_TYPES = [
    'general', 'strategy', 'timeline', 'evidence', 'arguments',
    'research', 'meeting_notes', 'correspondence', 'witnesses',
    'discovery', 'pleadings', 'settlement', 'brainstorm'
];

const BLOCK_TYPES = [
    'text', 'heading_1', 'heading_2', 'heading_3',
    'bulleted_list', 'numbered_list', 'todo', 'toggle',
    'quote', 'callout', 'divider', 'code', 'table',
    'image', 'file', 'bookmark', 'embed', 'synced_block',
    'template', 'column_list', 'column', 'link_to_page',
    'mention', 'equation', 'timeline_entry', 'party_statement',
    'evidence_item', 'legal_citation'
];

const MONGO_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

// ═══════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════

const createPageSchema = Joi.object({
    title: Joi.string()
        .required()
        .trim()
        .max(500)
        .messages({
            'any.required': 'العنوان مطلوب / Title is required',
            'string.max': 'العنوان طويل جداً / Title must be at most 500 characters'
        }),
    titleAr: Joi.string()
        .optional()
        .trim()
        .max(500)
        .messages({
            'string.max': 'العنوان العربي طويل جداً / Arabic title must be at most 500 characters'
        }),
    pageType: Joi.string()
        .optional()
        .valid(...PAGE_TYPES)
        .messages({
            'any.only': 'نوع الصفحة غير صالح / Invalid page type'
        }),
    icon: Joi.object({
        type: Joi.string().valid('emoji', 'file', 'external'),
        emoji: Joi.string().max(10),
        url: Joi.string().uri()
    }).optional(),
    cover: Joi.object({
        type: Joi.string().valid('external', 'file', 'gradient'),
        url: Joi.string().uri(),
        gradient: Joi.string()
    }).optional(),
    parentPageId: Joi.string()
        .pattern(MONGO_ID_PATTERN)
        .optional()
        .messages({
            'string.pattern.base': 'معرف الصفحة الأم غير صالح / Invalid parent page ID'
        }),
    templateId: Joi.string()
        .pattern(MONGO_ID_PATTERN)
        .optional()
        .messages({
            'string.pattern.base': 'معرف القالب غير صالح / Invalid template ID'
        })
});

const updatePageSchema = Joi.object({
    title: Joi.string()
        .optional()
        .trim()
        .max(500),
    titleAr: Joi.string()
        .optional()
        .trim()
        .max(500),
    pageType: Joi.string()
        .optional()
        .valid(...PAGE_TYPES),
    icon: Joi.object({
        type: Joi.string().valid('emoji', 'file', 'external'),
        emoji: Joi.string().max(10),
        url: Joi.string().uri()
    }).optional(),
    cover: Joi.object({
        type: Joi.string().valid('external', 'file', 'gradient'),
        url: Joi.string().uri(),
        gradient: Joi.string()
    }).optional(),
    isFavorite: Joi.boolean().optional(),
    isPinned: Joi.boolean().optional(),
    isArchived: Joi.boolean().optional()
});

const createBlockSchema = Joi.object({
    type: Joi.string()
        .required()
        .valid(...BLOCK_TYPES)
        .messages({
            'any.required': 'نوع البلوك مطلوب / Block type is required',
            'any.only': 'نوع البلوك غير صالح / Invalid block type'
        }),
    content: Joi.array().optional(),
    properties: Joi.object().optional(),
    parentId: Joi.string()
        .pattern(MONGO_ID_PATTERN)
        .optional(),
    afterBlockId: Joi.string()
        .pattern(MONGO_ID_PATTERN)
        .optional(),
    order: Joi.number().optional(),
    indent: Joi.number().optional(),
    checked: Joi.boolean().optional(),
    language: Joi.string().optional(),
    icon: Joi.string().optional(),
    color: Joi.string().optional(),
    tableData: Joi.object().optional(),
    fileUrl: Joi.string().optional(),
    fileName: Joi.string().optional(),
    caption: Joi.string().optional(),
    partyType: Joi.string().valid('plaintiff', 'defendant', 'witness', 'expert', 'judge').optional(),
    statementDate: Joi.date().optional(),
    evidenceType: Joi.string().valid('document', 'testimony', 'physical', 'digital', 'expert_opinion').optional(),
    evidenceDate: Joi.date().optional(),
    evidenceSource: Joi.string().optional(),
    citationType: Joi.string().valid('law', 'regulation', 'case_precedent', 'legal_principle').optional(),
    citationReference: Joi.string().optional(),
    eventDate: Joi.date().optional(),
    eventType: Joi.string().optional()
});

// Block colors and priority for whiteboard
const BLOCK_COLORS = ['default', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray'];
const PRIORITY_LEVELS = ['low', 'medium', 'high', 'urgent'];

// Shape types enum
const SHAPE_TYPES = [
    'note', 'rectangle', 'ellipse', 'diamond', 'triangle', 'hexagon',
    'star', 'arrow', 'line', 'sticky', 'frame', 'image', 'embed', 'text_shape'
];

// Fill styles enum
const FILL_STYLES = ['solid', 'hachure', 'cross-hatch', 'none'];

// Arrow head types
const ARROW_HEAD_TYPES = ['none', 'arrow', 'triangle', 'circle', 'diamond', 'bar'];

// Handle positions
const HANDLE_POSITIONS = ['top', 'right', 'bottom', 'left', 'center'];

// Path types for connections
const PATH_TYPES = ['straight', 'bezier', 'smoothstep', 'step'];

const updateBlockSchema = Joi.object({
    // Support nested data wrapper format
    data: Joi.object().optional(),

    // Basic block fields
    type: Joi.string()
        .optional()
        .valid(...BLOCK_TYPES),
    content: Joi.array().optional(),
    properties: Joi.object().optional(),
    checked: Joi.boolean().optional(),
    isCollapsed: Joi.boolean().optional(),
    language: Joi.string().optional(),
    icon: Joi.string().optional(),
    color: Joi.string().optional(),
    tableData: Joi.object().optional(),
    fileUrl: Joi.string().optional(),
    fileName: Joi.string().optional(),
    caption: Joi.string().optional(),
    order: Joi.number().optional(),
    indent: Joi.number().min(0).max(10).optional(),

    // Legal-specific fields
    partyType: Joi.string().valid('plaintiff', 'defendant', 'witness', 'expert', 'judge').optional(),
    statementDate: Joi.date().optional(),
    evidenceType: Joi.string().valid('document', 'testimony', 'physical', 'digital', 'expert_opinion').optional(),
    evidenceDate: Joi.date().optional(),
    evidenceSource: Joi.string().optional(),
    citationType: Joi.string().valid('law', 'regulation', 'case_precedent', 'legal_principle').optional(),
    citationReference: Joi.string().optional(),
    eventDate: Joi.date().optional(),
    eventType: Joi.string().optional(),

    // Whiteboard canvas positioning
    canvasX: Joi.number().min(0).max(10000).optional(),
    canvasY: Joi.number().min(0).max(10000).optional(),
    canvasWidth: Joi.number().min(150).max(800).optional(),
    canvasHeight: Joi.number().min(100).max(600).optional(),

    // Whiteboard visual styling
    blockColor: Joi.string().valid(...BLOCK_COLORS).optional(),
    priority: Joi.string().valid(...PRIORITY_LEVELS, null).allow(null).optional(),

    // Entity linking
    linkedEventId: Joi.string().pattern(MONGO_ID_PATTERN).allow(null).optional(),
    linkedTaskId: Joi.string().pattern(MONGO_ID_PATTERN).allow(null).optional(),
    linkedHearingId: Joi.string().pattern(MONGO_ID_PATTERN).allow(null).optional(),
    linkedDocumentId: Joi.string().pattern(MONGO_ID_PATTERN).allow(null).optional(),

    // Grouping
    groupId: Joi.string().allow(null).optional(),
    groupName: Joi.string().allow(null).optional()
});

const moveBlockSchema = Joi.object({
    targetPageId: Joi.string()
        .pattern(MONGO_ID_PATTERN)
        .optional(),
    afterBlockId: Joi.string()
        .pattern(MONGO_ID_PATTERN)
        .optional(),
    parentId: Joi.string()
        .pattern(MONGO_ID_PATTERN)
        .optional(),
    newOrder: Joi.number().optional()
});

const mergePagesSchema = Joi.object({
    sourcePageIds: Joi.array()
        .items(Joi.string().pattern(MONGO_ID_PATTERN))
        .min(2)
        .required()
        .messages({
            'array.min': 'يجب تحديد صفحتين على الأقل / At least 2 source pages required',
            'any.required': 'معرفات الصفحات المصدر مطلوبة / Source page IDs are required'
        }),
    targetTitle: Joi.string()
        .required()
        .trim()
        .max(500)
        .messages({
            'any.required': 'العنوان الهدف مطلوب / Target title is required'
        }),
    deleteSourcePages: Joi.boolean().optional().default(false)
});

const searchSchema = Joi.object({
    q: Joi.string()
        .required()
        .min(2)
        .messages({
            'any.required': 'نص البحث مطلوب / Search query is required',
            'string.min': 'نص البحث قصير جداً / Search query must be at least 2 characters'
        })
});

const createCommentSchema = Joi.object({
    content: Joi.string()
        .required()
        .max(5000)
        .messages({
            'any.required': 'محتوى التعليق مطلوب / Comment content is required',
            'string.max': 'التعليق طويل جداً / Comment must be at most 5000 characters'
        }),
    parentCommentId: Joi.string()
        .pattern(MONGO_ID_PATTERN)
        .optional(),
    mentions: Joi.array()
        .items(Joi.string().pattern(MONGO_ID_PATTERN))
        .optional()
});

const linkTaskSchema = Joi.object({
    taskId: Joi.string()
        .pattern(MONGO_ID_PATTERN)
        .required()
        .messages({
            'any.required': 'معرف المهمة مطلوب / Task ID is required',
            'string.pattern.base': 'معرف المهمة غير صالح / Invalid task ID'
        })
});

const applyTemplateSchema = Joi.object({
    templateId: Joi.string()
        .pattern(MONGO_ID_PATTERN)
        .required()
        .messages({
            'any.required': 'معرف القالب مطلوب / Template ID is required',
            'string.pattern.base': 'معرف القالب غير صالح / Invalid template ID'
        })
});

const pageIdParamSchema = Joi.object({
    caseId: Joi.string().pattern(MONGO_ID_PATTERN).required(),
    pageId: Joi.string().pattern(MONGO_ID_PATTERN).required()
}).unknown(true);

const blockIdParamSchema = Joi.object({
    caseId: Joi.string().pattern(MONGO_ID_PATTERN).required(),
    blockId: Joi.string().pattern(MONGO_ID_PATTERN).required()
}).unknown(true);

// Create shape schema
const createShapeSchema = Joi.object({
    shapeType: Joi.string().valid(...SHAPE_TYPES).required(),
    x: Joi.number().min(0).max(10000).required(),
    y: Joi.number().min(0).max(10000).required(),
    width: Joi.number().min(10).max(2000).default(200),
    height: Joi.number().min(10).max(2000).default(150),
    angle: Joi.number().min(0).max(6.283185).default(0),
    opacity: Joi.number().min(0).max(100).default(100),
    strokeColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
    strokeWidth: Joi.number().min(1).max(20).default(2),
    fillStyle: Joi.string().valid(...FILL_STYLES).default('solid'),
    blockColor: Joi.string().valid('default', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray').default('default'),
    text: Joi.string().max(5000).optional(),
    roughness: Joi.number().min(0).max(2).default(0),
    handles: Joi.array().items(Joi.object({
        id: Joi.string().required(),
        position: Joi.string().valid(...HANDLE_POSITIONS).required(),
        type: Joi.string().valid('source', 'target', 'both').default('both'),
        offsetX: Joi.number().default(0),
        offsetY: Joi.number().default(0)
    })).optional()
});

// Create arrow schema
const createArrowSchema = Joi.object({
    startX: Joi.number().min(0).max(10000).required(),
    startY: Joi.number().min(0).max(10000).required(),
    endX: Joi.number().min(0).max(10000).required(),
    endY: Joi.number().min(0).max(10000).required(),
    startType: Joi.string().valid(...ARROW_HEAD_TYPES).default('none'),
    endType: Joi.string().valid(...ARROW_HEAD_TYPES).default('arrow'),
    strokeColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
    strokeWidth: Joi.number().min(1).max(10).default(2),
    sourceBlockId: Joi.string().pattern(MONGO_ID_PATTERN).optional(),
    targetBlockId: Joi.string().pattern(MONGO_ID_PATTERN).optional(),
    sourceHandle: Joi.string().valid(...HANDLE_POSITIONS).optional(),
    targetHandle: Joi.string().valid(...HANDLE_POSITIONS).optional()
});

// Create frame schema
const createFrameSchema = Joi.object({
    x: Joi.number().min(0).max(10000).default(0),
    y: Joi.number().min(0).max(10000).default(0),
    width: Joi.number().min(100).max(5000).default(500),
    height: Joi.number().min(100).max(5000).default(400),
    name: Joi.string().max(100).default('Frame'),
    backgroundColor: Joi.string().valid('default', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray').default('default')
});

// Z-index update schema
const updateZIndexSchema = Joi.object({
    action: Joi.string().valid('front', 'back', 'forward', 'backward').required()
});

// Batch update schema
const batchUpdateSchema = Joi.object({
    updates: Joi.array().items(Joi.object({
        id: Joi.string().pattern(MONGO_ID_PATTERN).required(),
        changes: Joi.object({
            canvasX: Joi.number().min(0).max(10000).optional(),
            canvasY: Joi.number().min(0).max(10000).optional(),
            canvasWidth: Joi.number().min(10).max(2000).optional(),
            canvasHeight: Joi.number().min(10).max(2000).optional(),
            angle: Joi.number().min(0).max(6.283185).optional(),
            opacity: Joi.number().min(0).max(100).optional()
        }).required()
    })).min(1).required()
});

// Enhanced connection schema
const createConnectionSchema = Joi.object({
    sourceBlockId: Joi.string().pattern(MONGO_ID_PATTERN).required(),
    targetBlockId: Joi.string().pattern(MONGO_ID_PATTERN).required(),
    sourceHandle: Joi.object({
        id: Joi.string().optional(),
        position: Joi.string().valid(...HANDLE_POSITIONS).default('right')
    }).optional(),
    targetHandle: Joi.object({
        id: Joi.string().optional(),
        position: Joi.string().valid(...HANDLE_POSITIONS).default('left')
    }).optional(),
    connectionType: Joi.string().valid('arrow', 'line', 'dashed', 'bidirectional').default('arrow'),
    pathType: Joi.string().valid(...PATH_TYPES).default('bezier'),
    label: Joi.string().max(100).optional(),
    color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#6b7280'),
    strokeWidth: Joi.number().min(1).max(10).default(2),
    animated: Joi.boolean().default(false),
    markerStart: Joi.object({
        type: Joi.string().valid('none', 'arrow', 'arrowclosed', 'circle', 'diamond').default('none'),
        color: Joi.string().optional(),
        width: Joi.number().optional(),
        height: Joi.number().optional()
    }).optional(),
    markerEnd: Joi.object({
        type: Joi.string().valid('none', 'arrow', 'arrowclosed', 'circle', 'diamond').default('arrow'),
        color: Joi.string().optional(),
        width: Joi.number().optional(),
        height: Joi.number().optional()
    }).optional()
});

// Style update schema
const updateStyleSchema = Joi.object({
    strokeColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
    strokeWidth: Joi.number().min(1).max(20).optional(),
    fillStyle: Joi.string().valid(...FILL_STYLES).optional(),
    roughness: Joi.number().min(0).max(2).optional()
});

// ═══════════════════════════════════════════════════════════════
// VALIDATION MIDDLEWARE FACTORY
// ═══════════════════════════════════════════════════════════════

const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[source], {
            abortEarly: false,
            stripUnknown: source === 'body'
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                error: true,
                message: 'خطأ في التحقق / Validation error',
                errors
            });
        }

        req[source] = value;
        next();
    };
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // Schemas
    schemas: {
        createPage: createPageSchema,
        updatePage: updatePageSchema,
        createBlock: createBlockSchema,
        updateBlock: updateBlockSchema,
        moveBlock: moveBlockSchema,
        mergePages: mergePagesSchema,
        search: searchSchema,
        createComment: createCommentSchema,
        linkTask: linkTaskSchema,
        applyTemplate: applyTemplateSchema,
        pageIdParam: pageIdParamSchema,
        blockIdParam: blockIdParamSchema,
        createShape: createShapeSchema,
        createArrow: createArrowSchema,
        createFrame: createFrameSchema,
        updateZIndex: updateZIndexSchema,
        batchUpdate: batchUpdateSchema,
        createConnection: createConnectionSchema,
        updateStyle: updateStyleSchema
    },

    // Middleware
    validateCreatePage: validate(createPageSchema),
    validateUpdatePage: validate(updatePageSchema),
    validateCreateBlock: validate(createBlockSchema),
    validateUpdateBlock: validate(updateBlockSchema),
    validateMoveBlock: validate(moveBlockSchema),
    validateMergePages: validate(mergePagesSchema),
    validateSearch: validate(searchSchema, 'query'),
    validateCreateComment: validate(createCommentSchema),
    validateLinkTask: validate(linkTaskSchema),
    validateApplyTemplate: validate(applyTemplateSchema),
    validatePageIdParam: validate(pageIdParamSchema, 'params'),
    validateBlockIdParam: validate(blockIdParamSchema, 'params'),

    // Constants
    PAGE_TYPES,
    BLOCK_TYPES,
    SHAPE_TYPES,
    FILL_STYLES,
    ARROW_HEAD_TYPES,
    HANDLE_POSITIONS,
    PATH_TYPES,

    // Shape validation
    validateCreateShape: validate(createShapeSchema),
    validateCreateArrow: validate(createArrowSchema),
    validateCreateFrame: validate(createFrameSchema),
    validateUpdateZIndex: validate(updateZIndexSchema),
    validateBatchUpdate: validate(batchUpdateSchema),
    validateCreateConnection: validate(createConnectionSchema),
    validateUpdateStyle: validate(updateStyleSchema),

    // Generic validate function
    validate
};
