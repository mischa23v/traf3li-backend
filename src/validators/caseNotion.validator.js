const { body, param, query, validationResult } = require('express-validator');

// ═══════════════════════════════════════════════════════════════
// CASENOTION VALIDATORS
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

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: true,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

// ═══════════════════════════════════════════════════════════════
// PAGE VALIDATORS
// ═══════════════════════════════════════════════════════════════

exports.validateCreatePage = [
    body('title')
        .notEmpty().withMessage('Title is required')
        .trim()
        .isLength({ max: 500 }).withMessage('Title must be at most 500 characters'),
    body('titleAr')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Arabic title must be at most 500 characters'),
    body('pageType')
        .optional()
        .isIn(PAGE_TYPES).withMessage('Invalid page type'),
    body('icon.type')
        .optional()
        .isIn(['emoji', 'file', 'external']).withMessage('Invalid icon type'),
    body('icon.emoji')
        .optional()
        .isLength({ max: 10 }).withMessage('Emoji too long'),
    body('parentPageId')
        .optional()
        .isMongoId().withMessage('Invalid parent page ID'),
    body('templateId')
        .optional()
        .isMongoId().withMessage('Invalid template ID'),
    handleValidationErrors
];

exports.validateUpdatePage = [
    body('title')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Title must be at most 500 characters'),
    body('titleAr')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Arabic title must be at most 500 characters'),
    body('pageType')
        .optional()
        .isIn(PAGE_TYPES).withMessage('Invalid page type'),
    body('icon.type')
        .optional()
        .isIn(['emoji', 'file', 'external']).withMessage('Invalid icon type'),
    body('cover.type')
        .optional()
        .isIn(['external', 'file', 'gradient']).withMessage('Invalid cover type'),
    handleValidationErrors
];

// ═══════════════════════════════════════════════════════════════
// BLOCK VALIDATORS
// ═══════════════════════════════════════════════════════════════

exports.validateCreateBlock = [
    body('type')
        .notEmpty().withMessage('Block type is required')
        .isIn(BLOCK_TYPES).withMessage('Invalid block type'),
    body('content')
        .optional()
        .isArray().withMessage('Content must be an array'),
    body('parentId')
        .optional()
        .isMongoId().withMessage('Invalid parent block ID'),
    body('afterBlockId')
        .optional()
        .isMongoId().withMessage('Invalid after block ID'),
    handleValidationErrors
];

exports.validateUpdateBlock = [
    body('content')
        .optional()
        .isArray().withMessage('Content must be an array'),
    body('type')
        .optional()
        .isIn(BLOCK_TYPES).withMessage('Invalid block type'),
    body('checked')
        .optional()
        .isBoolean().withMessage('Checked must be a boolean'),
    body('isCollapsed')
        .optional()
        .isBoolean().withMessage('isCollapsed must be a boolean'),
    handleValidationErrors
];

exports.validateMoveBlock = [
    body('targetPageId')
        .optional()
        .isMongoId().withMessage('Invalid target page ID'),
    body('afterBlockId')
        .optional()
        .isMongoId().withMessage('Invalid after block ID'),
    body('parentId')
        .optional()
        .isMongoId().withMessage('Invalid parent block ID'),
    handleValidationErrors
];

// ═══════════════════════════════════════════════════════════════
// OTHER VALIDATORS
// ═══════════════════════════════════════════════════════════════

exports.validateMergePages = [
    body('sourcePageIds')
        .isArray({ min: 2 }).withMessage('At least 2 source pages required')
        .custom(ids => ids.every(id => /^[0-9a-fA-F]{24}$/.test(id))).withMessage('Invalid page IDs'),
    body('targetTitle')
        .notEmpty().withMessage('Target title is required')
        .trim()
        .isLength({ max: 500 }).withMessage('Title must be at most 500 characters'),
    body('deleteSourcePages')
        .optional()
        .isBoolean().withMessage('deleteSourcePages must be a boolean'),
    handleValidationErrors
];

exports.validateSearch = [
    query('q')
        .notEmpty().withMessage('Search query is required')
        .isLength({ min: 2 }).withMessage('Search query must be at least 2 characters'),
    handleValidationErrors
];

exports.validateCreateComment = [
    body('content')
        .notEmpty().withMessage('Comment content is required')
        .isLength({ max: 5000 }).withMessage('Comment must be at most 5000 characters'),
    body('parentCommentId')
        .optional()
        .isMongoId().withMessage('Invalid parent comment ID'),
    body('mentions')
        .optional()
        .isArray().withMessage('Mentions must be an array'),
    handleValidationErrors
];

exports.validateLinkTask = [
    body('taskId')
        .notEmpty().withMessage('Task ID is required')
        .isMongoId().withMessage('Invalid task ID'),
    handleValidationErrors
];

exports.validateApplyTemplate = [
    body('templateId')
        .notEmpty().withMessage('Template ID is required')
        .isMongoId().withMessage('Invalid template ID'),
    handleValidationErrors
];

// ═══════════════════════════════════════════════════════════════
// PARAM VALIDATORS
// ═══════════════════════════════════════════════════════════════

exports.validatePageIdParam = [
    param('pageId')
        .isMongoId().withMessage('Invalid page ID'),
    handleValidationErrors
];

exports.validateBlockIdParam = [
    param('blockId')
        .isMongoId().withMessage('Invalid block ID'),
    handleValidationErrors
];
