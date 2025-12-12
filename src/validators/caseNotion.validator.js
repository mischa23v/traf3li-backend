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
        blockIdParam: blockIdParamSchema
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

    // Generic validate function
    validate
};
