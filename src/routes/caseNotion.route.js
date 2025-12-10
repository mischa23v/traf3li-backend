const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const {
    // Page endpoints
    createPage,
    getPage,
    updatePage,
    deletePage,
    duplicatePage,
    movePage,
    getCasePages,
    searchPages,
    getRecentPages,
    toggleFavorite,
    // Block endpoints
    createBlock,
    updateBlock,
    deleteBlock,
    moveBlock,
    duplicateBlock,
    getPageBlocks,
    convertBlockType,
    nestBlock,
    unnestBlock,
    searchBlocks,
    // Synced block endpoints
    createSyncedBlock,
    getSyncedBlocks,
    getSyncedBlock,
    updateSyncedBlock,
    deleteSyncedBlock,
    insertSyncedBlock,
    getSyncedBlockInstances,
    // Database view endpoints
    createView,
    getViews,
    getView,
    updateView,
    deleteView,
    executeView,
    setDefaultView,
    // Template endpoints
    createTemplate,
    getTemplates,
    createFromTemplate,
    // AI endpoints
    aiAutofill,
    aiSummarize,
    aiAnswer,
    aiSuggestContent,
    // Collaboration endpoints
    lockBlock,
    unlockBlock,
    getActiveLocks,
    // Export/Import
    exportPage,
    importMarkdown,
    getBacklinks
} = require('../controllers/caseNotion.controller');

const router = express.Router();

/**
 * @fileoverview CaseNotion Routes
 *
 * This module defines all routes for the CaseNotion feature, which provides a Notion-like
 * collaborative documentation system for legal cases. It includes page management, block-level
 * editing, database views, templates, AI assistance, and collaboration features.
 *
 * All routes require authentication (userMiddleware) and firm context (firmFilter).
 *
 * @module routes/caseNotion
 * @requires express
 * @requires ../middlewares
 * @requires ../controllers/caseNotion.controller
 */

// ============================================
// PAGE ROUTES
// ============================================

/**
 * @route GET /api/case-notion/pages/recent
 * @group Pages - Page management operations
 * @description Get recently accessed or modified pages for the current user within their firm
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @returns {Array} 200 - Array of recent pages with metadata
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 500 - Server error
 */
router.get('/pages/recent', userMiddleware, firmFilter, getRecentPages);

/**
 * @route POST /api/case-notion/pages
 * @group Pages - Page management operations
 * @description Create a new page within a case or as a child of another page
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @bodyParam {string} caseId - ID of the case this page belongs to
 * @bodyParam {string} [parentPageId] - Optional parent page ID for nested pages
 * @bodyParam {string} title - Page title
 * @bodyParam {Object} [icon] - Page icon configuration
 * @bodyParam {Object} [cover] - Page cover configuration
 * @bodyParam {Array} [blocks] - Initial page content blocks
 * @returns {Object} 201 - Created page object
 * @returns {Error} 400 - Invalid request data
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 404 - Case or parent page not found
 * @returns {Error} 500 - Server error
 */
router.post('/pages', userMiddleware, firmFilter, createPage);

/**
 * @route GET /api/case-notion/pages/:pageId
 * @group Pages - Page management operations
 * @description Get a specific page with its metadata and content blocks
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} pageId - Page ID
 * @returns {Object} 200 - Page object with blocks
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden - Page belongs to different firm
 * @returns {Error} 404 - Page not found
 * @returns {Error} 500 - Server error
 */
router.get('/pages/:pageId', userMiddleware, firmFilter, getPage);

/**
 * @route PATCH /api/case-notion/pages/:pageId
 * @group Pages - Page management operations
 * @description Update page metadata (title, icon, cover, properties)
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} pageId - Page ID
 * @bodyParam {string} [title] - Updated page title
 * @bodyParam {Object} [icon] - Updated page icon
 * @bodyParam {Object} [cover] - Updated page cover
 * @bodyParam {Object} [properties] - Updated page properties
 * @returns {Object} 200 - Updated page object
 * @returns {Error} 400 - Invalid update data
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Page not found
 * @returns {Error} 500 - Server error
 */
router.patch('/pages/:pageId', userMiddleware, firmFilter, updatePage);

/**
 * @route DELETE /api/case-notion/pages/:pageId
 * @group Pages - Page management operations
 * @description Delete a page and optionally all its child pages
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} pageId - Page ID
 * @queryParam {boolean} [cascade=false] - If true, delete all child pages
 * @returns {Object} 200 - Deletion confirmation
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Page not found
 * @returns {Error} 500 - Server error
 */
router.delete('/pages/:pageId', userMiddleware, firmFilter, deletePage);

/**
 * @route POST /api/case-notion/pages/:pageId/duplicate
 * @group Pages - Page management operations
 * @description Create a duplicate of a page with all its content and structure
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} pageId - Page ID to duplicate
 * @bodyParam {boolean} [includeChildren=true] - Include child pages in duplication
 * @bodyParam {string} [title] - Custom title for the duplicate (defaults to "Copy of [original]")
 * @returns {Object} 201 - Duplicated page object
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Page not found
 * @returns {Error} 500 - Server error
 */
router.post('/pages/:pageId/duplicate', userMiddleware, firmFilter, duplicatePage);

/**
 * @route POST /api/case-notion/pages/:pageId/move
 * @group Pages - Page management operations
 * @description Move a page to a different parent or case
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} pageId - Page ID to move
 * @bodyParam {string} [newParentPageId] - New parent page ID (null for root level)
 * @bodyParam {string} [newCaseId] - Move to a different case
 * @bodyParam {number} [position] - Position in the new parent's children array
 * @returns {Object} 200 - Updated page object with new location
 * @returns {Error} 400 - Invalid move operation
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Page or target not found
 * @returns {Error} 500 - Server error
 */
router.post('/pages/:pageId/move', userMiddleware, firmFilter, movePage);

/**
 * @route POST /api/case-notion/pages/:pageId/favorite
 * @group Pages - Page management operations
 * @description Toggle favorite status for a page (user-specific)
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} pageId - Page ID
 * @returns {Object} 200 - Updated favorite status
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Page not found
 * @returns {Error} 500 - Server error
 */
router.post('/pages/:pageId/favorite', userMiddleware, firmFilter, toggleFavorite);

/**
 * @route GET /api/case-notion/pages/:pageId/blocks
 * @group Pages - Page management operations
 * @description Get all content blocks for a specific page
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} pageId - Page ID
 * @queryParam {boolean} [includeNested=true] - Include nested child blocks
 * @returns {Array} 200 - Array of block objects
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Page not found
 * @returns {Error} 500 - Server error
 */
router.get('/pages/:pageId/blocks', userMiddleware, firmFilter, getPageBlocks);

/**
 * @route POST /api/case-notion/pages/:pageId/blocks
 * @group Pages - Page management operations
 * @description Create a new content block within a page
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} pageId - Page ID
 * @bodyParam {string} type - Block type (paragraph, heading1, heading2, heading3, bulleted_list, numbered_list, todo, toggle, quote, callout, code, table, image, file, etc.)
 * @bodyParam {Object} content - Block content based on type
 * @bodyParam {string} [parentBlockId] - Parent block ID for nested blocks
 * @bodyParam {number} [position] - Position in the parent's children array
 * @returns {Object} 201 - Created block object
 * @returns {Error} 400 - Invalid block data
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Page not found
 * @returns {Error} 500 - Server error
 */
router.post('/pages/:pageId/blocks', userMiddleware, firmFilter, createBlock);

/**
 * @route GET /api/case-notion/pages/:pageId/views
 * @group Pages - Page management operations
 * @description Get all database views for a page (if page is a database)
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} pageId - Page ID
 * @returns {Array} 200 - Array of view objects
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Page not found
 * @returns {Error} 500 - Server error
 */
router.get('/pages/:pageId/views', userMiddleware, firmFilter, getViews);

/**
 * @route POST /api/case-notion/pages/:pageId/views
 * @group Pages - Page management operations
 * @description Create a new database view for a page
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} pageId - Page ID
 * @bodyParam {string} name - View name
 * @bodyParam {string} type - View type (table, board, list, calendar, gallery, timeline)
 * @bodyParam {Object} [filter] - View filter configuration
 * @bodyParam {Object} [sort] - View sort configuration
 * @bodyParam {Array} [visibleProperties] - Properties to display
 * @returns {Object} 201 - Created view object
 * @returns {Error} 400 - Invalid view configuration
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Page not found
 * @returns {Error} 500 - Server error
 */
router.post('/pages/:pageId/views', userMiddleware, firmFilter, createView);

/**
 * @route GET /api/case-notion/pages/:pageId/locks
 * @group Pages - Page management operations
 * @description Get all active block locks on a page for collaboration awareness
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} pageId - Page ID
 * @returns {Array} 200 - Array of active lock objects with user info
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Page not found
 * @returns {Error} 500 - Server error
 */
router.get('/pages/:pageId/locks', userMiddleware, firmFilter, getActiveLocks);

/**
 * @route GET /api/case-notion/pages/:pageId/export
 * @group Pages - Page management operations
 * @description Export a page to various formats (markdown, HTML, PDF)
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} pageId - Page ID
 * @queryParam {string} format - Export format (markdown, html, pdf)
 * @queryParam {boolean} [includeChildren=false] - Include child pages in export
 * @returns {Object} 200 - Exported content or download URL
 * @returns {Error} 400 - Invalid format
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Page not found
 * @returns {Error} 500 - Server error
 */
router.get('/pages/:pageId/export', userMiddleware, firmFilter, exportPage);

/**
 * @route POST /api/case-notion/pages/:pageId/save-as-template
 * @group Pages - Page management operations
 * @description Save a page as a reusable template for the firm
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} pageId - Page ID
 * @bodyParam {string} name - Template name
 * @bodyParam {string} [description] - Template description
 * @bodyParam {string} [category] - Template category
 * @bodyParam {Array} [tags] - Template tags
 * @returns {Object} 201 - Created template object
 * @returns {Error} 400 - Invalid template data
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Page not found
 * @returns {Error} 500 - Server error
 */
router.post('/pages/:pageId/save-as-template', userMiddleware, firmFilter, createTemplate);

/**
 * @route GET /api/case-notion/pages/:pageId/backlinks
 * @group Pages - Page management operations
 * @description Get all pages that link to this page
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} pageId - Page ID
 * @returns {Array} 200 - Array of pages containing links to this page
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Page not found
 * @returns {Error} 500 - Server error
 */
router.get('/pages/:pageId/backlinks', userMiddleware, firmFilter, getBacklinks);

/**
 * @route POST /api/case-notion/pages/:pageId/ai-summarize
 * @group Pages - Page management operations
 * @description Generate an AI summary of the page content
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} pageId - Page ID
 * @bodyParam {number} [maxLength] - Maximum summary length in words
 * @bodyParam {string} [style] - Summary style (brief, detailed, bullet_points)
 * @returns {Object} 200 - AI-generated summary
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Page not found
 * @returns {Error} 500 - Server error
 */
router.post('/pages/:pageId/ai-summarize', userMiddleware, firmFilter, aiSummarize);

/**
 * @route POST /api/case-notion/pages/:pageId/ai-suggest
 * @group Pages - Page management operations
 * @description Get AI suggestions for content to add to the page
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} pageId - Page ID
 * @bodyParam {string} [context] - Additional context for suggestions
 * @bodyParam {string} [type] - Type of suggestions (next_steps, related_topics, questions)
 * @returns {Object} 200 - AI-generated content suggestions
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Page not found
 * @returns {Error} 500 - Server error
 */
router.post('/pages/:pageId/ai-suggest', userMiddleware, firmFilter, aiSuggestContent);

// ============================================
// CASE ROUTES (pages for a specific case)
// ============================================

/**
 * @route GET /api/case-notion/cases/:caseId/pages
 * @group Cases - Case-specific page operations
 * @description Get all pages associated with a specific case
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} caseId - Case ID
 * @queryParam {boolean} [includeArchived=false] - Include archived pages
 * @queryParam {string} [sortBy=updatedAt] - Sort field
 * @queryParam {string} [sortOrder=desc] - Sort order (asc, desc)
 * @returns {Array} 200 - Array of page objects
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden - Case belongs to different firm
 * @returns {Error} 404 - Case not found
 * @returns {Error} 500 - Server error
 */
router.get('/cases/:caseId/pages', userMiddleware, firmFilter, getCasePages);

/**
 * @route GET /api/case-notion/cases/:caseId/search
 * @group Cases - Case-specific page operations
 * @description Search pages within a specific case
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} caseId - Case ID
 * @queryParam {string} q - Search query
 * @queryParam {Array} [filters] - Additional filters
 * @queryParam {number} [limit=20] - Result limit
 * @queryParam {number} [offset=0] - Result offset for pagination
 * @returns {Object} 200 - Search results with pages and metadata
 * @returns {Error} 400 - Missing or invalid query
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Case not found
 * @returns {Error} 500 - Server error
 */
router.get('/cases/:caseId/search', userMiddleware, firmFilter, searchPages);

/**
 * @route GET /api/case-notion/cases/:caseId/blocks/search
 * @group Cases - Case-specific page operations
 * @description Search content blocks within all pages of a case
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} caseId - Case ID
 * @queryParam {string} q - Search query
 * @queryParam {Array} [blockTypes] - Filter by block types
 * @queryParam {number} [limit=20] - Result limit
 * @queryParam {number} [offset=0] - Result offset for pagination
 * @returns {Object} 200 - Search results with blocks and parent page info
 * @returns {Error} 400 - Missing or invalid query
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Case not found
 * @returns {Error} 500 - Server error
 */
router.get('/cases/:caseId/blocks/search', userMiddleware, firmFilter, searchBlocks);

/**
 * @route POST /api/case-notion/cases/:caseId/import
 * @group Cases - Case-specific page operations
 * @description Import markdown content as a new page in the case
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} caseId - Case ID
 * @bodyParam {string} markdown - Markdown content to import
 * @bodyParam {string} [title] - Page title (extracted from markdown if not provided)
 * @bodyParam {string} [parentPageId] - Parent page ID for nested import
 * @returns {Object} 201 - Created page object from imported content
 * @returns {Error} 400 - Invalid markdown or import data
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Case not found
 * @returns {Error} 500 - Server error
 */
router.post('/cases/:caseId/import', userMiddleware, firmFilter, importMarkdown);

/**
 * @route POST /api/case-notion/cases/:caseId/ai-answer
 * @group Cases - Case-specific page operations
 * @description Ask AI a question based on all pages within a case
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} caseId - Case ID
 * @bodyParam {string} question - Question to ask
 * @bodyParam {Array} [pageIds] - Limit context to specific pages
 * @bodyParam {boolean} [includeSources=true] - Include source citations
 * @returns {Object} 200 - AI-generated answer with sources
 * @returns {Error} 400 - Invalid question
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Case not found
 * @returns {Error} 500 - Server error
 */
router.post('/cases/:caseId/ai-answer', userMiddleware, firmFilter, aiAnswer);

// ============================================
// BLOCK ROUTES
// ============================================

/**
 * @route PATCH /api/case-notion/blocks/:blockId
 * @group Blocks - Content block operations
 * @description Update a content block's content or properties
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} blockId - Block ID
 * @bodyParam {Object} [content] - Updated block content
 * @bodyParam {Object} [properties] - Updated block properties
 * @bodyParam {Object} [formatting] - Updated text formatting
 * @returns {Object} 200 - Updated block object
 * @returns {Error} 400 - Invalid update data
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Block not found
 * @returns {Error} 409 - Block is locked by another user
 * @returns {Error} 500 - Server error
 */
router.patch('/blocks/:blockId', userMiddleware, firmFilter, updateBlock);

/**
 * @route DELETE /api/case-notion/blocks/:blockId
 * @group Blocks - Content block operations
 * @description Delete a content block
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} blockId - Block ID
 * @queryParam {boolean} [cascade=true] - Delete child blocks as well
 * @returns {Object} 200 - Deletion confirmation
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Block not found
 * @returns {Error} 409 - Block is locked by another user
 * @returns {Error} 500 - Server error
 */
router.delete('/blocks/:blockId', userMiddleware, firmFilter, deleteBlock);

/**
 * @route POST /api/case-notion/blocks/:blockId/move
 * @group Blocks - Content block operations
 * @description Move a block to a different location in the page or to another page
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} blockId - Block ID to move
 * @bodyParam {string} [newParentBlockId] - New parent block ID
 * @bodyParam {string} [newPageId] - Move to a different page
 * @bodyParam {number} position - Position in the new parent's children array
 * @returns {Object} 200 - Updated block object with new location
 * @returns {Error} 400 - Invalid move operation
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Block or target not found
 * @returns {Error} 409 - Block is locked by another user
 * @returns {Error} 500 - Server error
 */
router.post('/blocks/:blockId/move', userMiddleware, firmFilter, moveBlock);

/**
 * @route POST /api/case-notion/blocks/:blockId/duplicate
 * @group Blocks - Content block operations
 * @description Duplicate a block and optionally its children
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} blockId - Block ID to duplicate
 * @bodyParam {boolean} [includeChildren=true] - Include child blocks
 * @bodyParam {number} [position] - Position for the duplicate
 * @returns {Object} 201 - Duplicated block object
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Block not found
 * @returns {Error} 500 - Server error
 */
router.post('/blocks/:blockId/duplicate', userMiddleware, firmFilter, duplicateBlock);

/**
 * @route POST /api/case-notion/blocks/:blockId/convert
 * @group Blocks - Content block operations
 * @description Convert a block to a different type (e.g., paragraph to heading)
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} blockId - Block ID
 * @bodyParam {string} newType - Target block type
 * @bodyParam {Object} [options] - Conversion options
 * @returns {Object} 200 - Converted block object
 * @returns {Error} 400 - Invalid conversion
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Block not found
 * @returns {Error} 409 - Block is locked by another user
 * @returns {Error} 500 - Server error
 */
router.post('/blocks/:blockId/convert', userMiddleware, firmFilter, convertBlockType);

/**
 * @route POST /api/case-notion/blocks/:blockId/nest
 * @group Blocks - Content block operations
 * @description Nest a block under another block (indent)
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} blockId - Block ID to nest
 * @bodyParam {string} newParentBlockId - New parent block ID
 * @bodyParam {number} [position] - Position in parent's children
 * @returns {Object} 200 - Updated block object
 * @returns {Error} 400 - Invalid nesting operation
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Block not found
 * @returns {Error} 409 - Block is locked by another user
 * @returns {Error} 500 - Server error
 */
router.post('/blocks/:blockId/nest', userMiddleware, firmFilter, nestBlock);

/**
 * @route POST /api/case-notion/blocks/:blockId/unnest
 * @group Blocks - Content block operations
 * @description Unnest a block to a higher level (outdent)
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} blockId - Block ID to unnest
 * @bodyParam {number} [position] - Position in new parent's children
 * @returns {Object} 200 - Updated block object
 * @returns {Error} 400 - Cannot unnest (already at root level)
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Block not found
 * @returns {Error} 409 - Block is locked by another user
 * @returns {Error} 500 - Server error
 */
router.post('/blocks/:blockId/unnest', userMiddleware, firmFilter, unnestBlock);

/**
 * @route POST /api/case-notion/blocks/:blockId/lock
 * @group Blocks - Content block operations
 * @description Lock a block for editing (collaboration feature)
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} blockId - Block ID to lock
 * @returns {Object} 200 - Lock confirmation with lock ID
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Block not found
 * @returns {Error} 409 - Block is already locked by another user
 * @returns {Error} 500 - Server error
 */
router.post('/blocks/:blockId/lock', userMiddleware, firmFilter, lockBlock);

/**
 * @route POST /api/case-notion/blocks/:blockId/unlock
 * @group Blocks - Content block operations
 * @description Unlock a block (collaboration feature)
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} blockId - Block ID to unlock
 * @returns {Object} 200 - Unlock confirmation
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden - Can only unlock own locks
 * @returns {Error} 404 - Block not found or not locked
 * @returns {Error} 500 - Server error
 */
router.post('/blocks/:blockId/unlock', userMiddleware, firmFilter, unlockBlock);

/**
 * @route POST /api/case-notion/blocks/:blockId/ai-autofill
 * @group Blocks - Content block operations
 * @description Use AI to automatically fill or suggest content for a block
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} blockId - Block ID
 * @bodyParam {string} [prompt] - Custom prompt for AI
 * @bodyParam {string} [context] - Additional context
 * @bodyParam {boolean} [autoApply=false] - Automatically apply suggestions
 * @returns {Object} 200 - AI-generated content suggestions
 * @returns {Error} 400 - Invalid block type for autofill
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Block not found
 * @returns {Error} 500 - Server error
 */
router.post('/blocks/:blockId/ai-autofill', userMiddleware, firmFilter, aiAutofill);

// ============================================
// SYNCED BLOCK ROUTES
// ============================================

/**
 * @route GET /api/case-notion/synced-blocks
 * @group Synced Blocks - Reusable content block operations
 * @description Get all synced blocks (reusable content) for the firm
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @queryParam {string} [category] - Filter by category
 * @queryParam {Array} [tags] - Filter by tags
 * @queryParam {string} [search] - Search query
 * @returns {Array} 200 - Array of synced block objects
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 500 - Server error
 */
router.get('/synced-blocks', userMiddleware, firmFilter, getSyncedBlocks);

/**
 * @route POST /api/case-notion/synced-blocks
 * @group Synced Blocks - Reusable content block operations
 * @description Create a new synced block (reusable content)
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @bodyParam {string} name - Synced block name
 * @bodyParam {string} [description] - Description
 * @bodyParam {Array} blocks - Content blocks
 * @bodyParam {string} [category] - Category
 * @bodyParam {Array} [tags] - Tags
 * @returns {Object} 201 - Created synced block object
 * @returns {Error} 400 - Invalid synced block data
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 500 - Server error
 */
router.post('/synced-blocks', userMiddleware, firmFilter, createSyncedBlock);

/**
 * @route GET /api/case-notion/synced-blocks/:syncedBlockId
 * @group Synced Blocks - Reusable content block operations
 * @description Get a specific synced block with its content
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} syncedBlockId - Synced block ID
 * @returns {Object} 200 - Synced block object with content
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Synced block not found
 * @returns {Error} 500 - Server error
 */
router.get('/synced-blocks/:syncedBlockId', userMiddleware, firmFilter, getSyncedBlock);

/**
 * @route PATCH /api/case-notion/synced-blocks/:syncedBlockId
 * @group Synced Blocks - Reusable content block operations
 * @description Update a synced block (updates all instances)
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} syncedBlockId - Synced block ID
 * @bodyParam {string} [name] - Updated name
 * @bodyParam {string} [description] - Updated description
 * @bodyParam {Array} [blocks] - Updated content blocks
 * @bodyParam {string} [category] - Updated category
 * @bodyParam {Array} [tags] - Updated tags
 * @returns {Object} 200 - Updated synced block object
 * @returns {Error} 400 - Invalid update data
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Synced block not found
 * @returns {Error} 500 - Server error
 */
router.patch('/synced-blocks/:syncedBlockId', userMiddleware, firmFilter, updateSyncedBlock);

/**
 * @route DELETE /api/case-notion/synced-blocks/:syncedBlockId
 * @group Synced Blocks - Reusable content block operations
 * @description Delete a synced block
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} syncedBlockId - Synced block ID
 * @queryParam {boolean} [deleteInstances=false] - Also delete all instances
 * @returns {Object} 200 - Deletion confirmation
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Synced block not found
 * @returns {Error} 500 - Server error
 */
router.delete('/synced-blocks/:syncedBlockId', userMiddleware, firmFilter, deleteSyncedBlock);

/**
 * @route POST /api/case-notion/synced-blocks/:syncedBlockId/insert
 * @group Synced Blocks - Reusable content block operations
 * @description Insert an instance of a synced block into a page
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} syncedBlockId - Synced block ID
 * @bodyParam {string} pageId - Target page ID
 * @bodyParam {string} [parentBlockId] - Parent block ID
 * @bodyParam {number} [position] - Position in parent's children
 * @returns {Object} 201 - Created block instance
 * @returns {Error} 400 - Invalid insertion parameters
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Synced block or page not found
 * @returns {Error} 500 - Server error
 */
router.post('/synced-blocks/:syncedBlockId/insert', userMiddleware, firmFilter, insertSyncedBlock);

/**
 * @route GET /api/case-notion/synced-blocks/:syncedBlockId/instances
 * @group Synced Blocks - Reusable content block operations
 * @description Get all instances (usages) of a synced block across pages
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} syncedBlockId - Synced block ID
 * @returns {Array} 200 - Array of block instances with page info
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Synced block not found
 * @returns {Error} 500 - Server error
 */
router.get('/synced-blocks/:syncedBlockId/instances', userMiddleware, firmFilter, getSyncedBlockInstances);

// ============================================
// VIEW ROUTES
// ============================================

/**
 * @route GET /api/case-notion/views/:viewId
 * @group Views - Database view operations
 * @description Get a specific database view configuration
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} viewId - View ID
 * @returns {Object} 200 - View object with configuration
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - View not found
 * @returns {Error} 500 - Server error
 */
router.get('/views/:viewId', userMiddleware, firmFilter, getView);

/**
 * @route PATCH /api/case-notion/views/:viewId
 * @group Views - Database view operations
 * @description Update a database view's configuration
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} viewId - View ID
 * @bodyParam {string} [name] - Updated view name
 * @bodyParam {Object} [filter] - Updated filter configuration
 * @bodyParam {Object} [sort] - Updated sort configuration
 * @bodyParam {Array} [visibleProperties] - Updated visible properties
 * @bodyParam {Object} [viewSettings] - Type-specific view settings
 * @returns {Object} 200 - Updated view object
 * @returns {Error} 400 - Invalid view configuration
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - View not found
 * @returns {Error} 500 - Server error
 */
router.patch('/views/:viewId', userMiddleware, firmFilter, updateView);

/**
 * @route DELETE /api/case-notion/views/:viewId
 * @group Views - Database view operations
 * @description Delete a database view
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} viewId - View ID
 * @returns {Object} 200 - Deletion confirmation
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - View not found
 * @returns {Error} 500 - Server error
 */
router.delete('/views/:viewId', userMiddleware, firmFilter, deleteView);

/**
 * @route GET /api/case-notion/views/:viewId/data
 * @group Views - Database view operations
 * @description Execute a view and get filtered/sorted data
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} viewId - View ID
 * @queryParam {number} [limit] - Result limit
 * @queryParam {number} [offset] - Result offset for pagination
 * @returns {Object} 200 - View data with applied filters and sorts
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - View not found
 * @returns {Error} 500 - Server error
 */
router.get('/views/:viewId/data', userMiddleware, firmFilter, executeView);

/**
 * @route POST /api/case-notion/views/:viewId/set-default
 * @group Views - Database view operations
 * @description Set a view as the default view for its page
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} viewId - View ID
 * @returns {Object} 200 - Updated view object
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - View not found
 * @returns {Error} 500 - Server error
 */
router.post('/views/:viewId/set-default', userMiddleware, firmFilter, setDefaultView);

// ============================================
// TEMPLATE ROUTES
// ============================================

/**
 * @route GET /api/case-notion/templates
 * @group Templates - Page template operations
 * @description Get all available templates for the firm
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @queryParam {string} [category] - Filter by category
 * @queryParam {Array} [tags] - Filter by tags
 * @queryParam {string} [search] - Search query
 * @returns {Array} 200 - Array of template objects
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 500 - Server error
 */
router.get('/templates', userMiddleware, firmFilter, getTemplates);

/**
 * @route POST /api/case-notion/templates/:templateId/use
 * @group Templates - Page template operations
 * @description Create a new page from a template
 * @middleware userMiddleware - Validates authentication
 * @middleware firmFilter - Filters by user's firm
 * @param {string} templateId - Template ID
 * @bodyParam {string} caseId - Case ID for the new page
 * @bodyParam {string} [parentPageId] - Parent page ID
 * @bodyParam {string} [title] - Custom title (overrides template title)
 * @bodyParam {Object} [variables] - Template variables to fill in
 * @returns {Object} 201 - Created page from template
 * @returns {Error} 400 - Invalid template usage
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 404 - Template or case not found
 * @returns {Error} 500 - Server error
 */
router.post('/templates/:templateId/use', userMiddleware, firmFilter, createFromTemplate);

module.exports = router;
