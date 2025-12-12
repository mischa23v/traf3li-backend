const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const { cacheResponse, invalidateCache } = require('../middlewares/cache.middleware');
const {
    validateCreatePage,
    validateUpdatePage,
    validateCreateBlock,
    validateUpdateBlock,
    validateMoveBlock,
    validateMergePages,
    validateSearch,
    validateCreateComment,
    validateLinkTask,
    validateApplyTemplate,
    validatePageIdParam,
    validateBlockIdParam
} = require('../validators/caseNotion.validator');
const { canAccessCase, canEditPage } = require('../middlewares/caseNotion.middleware');
const caseNotionController = require('../controllers/caseNotion.controller');

const router = express.Router();

// Cache TTL
const NOTION_CACHE_TTL = 300;

// ═══════════════════════════════════════════════════════════════
// CASE LIST WITH NOTION STATS (for /dashboard/notion page)
// ═══════════════════════════════════════════════════════════════

// List all cases with notion pages count
router.get('/notion/cases',
    userMiddleware, firmFilter,
    cacheResponse(NOTION_CACHE_TTL),
    caseNotionController.listCasesWithNotion
);

// ═══════════════════════════════════════════════════════════════
// PAGE ROUTES
// ═══════════════════════════════════════════════════════════════

// List pages for a case
router.get('/cases/:caseId/notion/pages',
    userMiddleware, firmFilter, canAccessCase,
    cacheResponse(NOTION_CACHE_TTL),
    caseNotionController.listPages
);

// Get single page with blocks
router.get('/cases/:caseId/notion/pages/:pageId',
    userMiddleware, firmFilter, canAccessCase, validatePageIdParam,
    cacheResponse(NOTION_CACHE_TTL),
    caseNotionController.getPage
);

// Create page
router.post('/cases/:caseId/notion/pages',
    userMiddleware, firmFilter, canAccessCase,
    validateCreatePage,
    invalidateCache(['notion:case:{caseId}:*']),
    caseNotionController.createPage
);

// Update page
router.patch('/cases/:caseId/notion/pages/:pageId',
    userMiddleware, firmFilter, canAccessCase, canEditPage, validatePageIdParam,
    validateUpdatePage,
    invalidateCache(['notion:case:{caseId}:*', 'notion:page:{pageId}:*']),
    caseNotionController.updatePage
);

// Delete page (soft delete)
router.delete('/cases/:caseId/notion/pages/:pageId',
    userMiddleware, firmFilter, canAccessCase, canEditPage, validatePageIdParam,
    invalidateCache(['notion:case:{caseId}:*', 'notion:page:{pageId}:*']),
    caseNotionController.deletePage
);

// Archive page
router.post('/cases/:caseId/notion/pages/:pageId/archive',
    userMiddleware, firmFilter, canAccessCase, canEditPage, validatePageIdParam,
    invalidateCache(['notion:case:{caseId}:*', 'notion:page:{pageId}:*']),
    caseNotionController.archivePage
);

// Restore page
router.post('/cases/:caseId/notion/pages/:pageId/restore',
    userMiddleware, firmFilter, canAccessCase, canEditPage, validatePageIdParam,
    invalidateCache(['notion:case:{caseId}:*', 'notion:page:{pageId}:*']),
    caseNotionController.restorePage
);

// Duplicate page
router.post('/cases/:caseId/notion/pages/:pageId/duplicate',
    userMiddleware, firmFilter, canAccessCase, validatePageIdParam,
    invalidateCache(['notion:case:{caseId}:*']),
    caseNotionController.duplicatePage
);

// Toggle favorite
router.post('/cases/:caseId/notion/pages/:pageId/favorite',
    userMiddleware, firmFilter, canAccessCase, validatePageIdParam,
    invalidateCache(['notion:case:{caseId}:*', 'notion:page:{pageId}:*']),
    caseNotionController.toggleFavorite
);

// Toggle pin
router.post('/cases/:caseId/notion/pages/:pageId/pin',
    userMiddleware, firmFilter, canAccessCase, validatePageIdParam,
    invalidateCache(['notion:case:{caseId}:*', 'notion:page:{pageId}:*']),
    caseNotionController.togglePin
);

// Merge pages
router.post('/cases/:caseId/notion/pages/merge',
    userMiddleware, firmFilter, canAccessCase,
    validateMergePages,
    invalidateCache(['notion:case:{caseId}:*']),
    caseNotionController.mergePages
);

// ═══════════════════════════════════════════════════════════════
// BLOCK ROUTES
// ═══════════════════════════════════════════════════════════════

// Get blocks for a page
router.get('/cases/:caseId/notion/pages/:pageId/blocks',
    userMiddleware, firmFilter, canAccessCase, validatePageIdParam,
    cacheResponse(NOTION_CACHE_TTL),
    caseNotionController.getBlocks
);

// Create block
router.post('/cases/:caseId/notion/pages/:pageId/blocks',
    userMiddleware, firmFilter, canAccessCase, canEditPage, validatePageIdParam,
    validateCreateBlock,
    invalidateCache(['notion:page:{pageId}:*']),
    caseNotionController.createBlock
);

// Update block
router.patch('/cases/:caseId/notion/blocks/:blockId',
    userMiddleware, firmFilter, canAccessCase, validateBlockIdParam,
    validateUpdateBlock,
    invalidateCache(['notion:block:{blockId}:*']),
    caseNotionController.updateBlock
);

// Delete block
router.delete('/cases/:caseId/notion/blocks/:blockId',
    userMiddleware, firmFilter, canAccessCase, validateBlockIdParam,
    invalidateCache(['notion:block:{blockId}:*']),
    caseNotionController.deleteBlock
);

// Move block
router.post('/cases/:caseId/notion/blocks/:blockId/move',
    userMiddleware, firmFilter, canAccessCase, validateBlockIdParam,
    validateMoveBlock,
    invalidateCache(['notion:block:{blockId}:*']),
    caseNotionController.moveBlock
);

// Lock block for editing
router.post('/cases/:caseId/notion/blocks/:blockId/lock',
    userMiddleware, firmFilter, canAccessCase, validateBlockIdParam,
    caseNotionController.lockBlock
);

// Unlock block
router.post('/cases/:caseId/notion/blocks/:blockId/unlock',
    userMiddleware, firmFilter, canAccessCase, validateBlockIdParam,
    caseNotionController.unlockBlock
);

// ═══════════════════════════════════════════════════════════════
// SYNCED BLOCK ROUTES
// ═══════════════════════════════════════════════════════════════

// Create synced block
router.post('/cases/:caseId/notion/synced-blocks',
    userMiddleware, firmFilter, canAccessCase,
    caseNotionController.createSyncedBlock
);

// Get synced block
router.get('/cases/:caseId/notion/synced-blocks/:blockId',
    userMiddleware, firmFilter, canAccessCase, validateBlockIdParam,
    caseNotionController.getSyncedBlock
);

// Unsync block
router.post('/cases/:caseId/notion/synced-blocks/:blockId/unsync',
    userMiddleware, firmFilter, canAccessCase, validateBlockIdParam,
    caseNotionController.unsyncBlock
);

// ═══════════════════════════════════════════════════════════════
// COMMENT ROUTES
// ═══════════════════════════════════════════════════════════════

// Get comments for block
router.get('/cases/:caseId/notion/blocks/:blockId/comments',
    userMiddleware, firmFilter, canAccessCase, validateBlockIdParam,
    caseNotionController.getComments
);

// Add comment
router.post('/cases/:caseId/notion/blocks/:blockId/comments',
    userMiddleware, firmFilter, canAccessCase, validateBlockIdParam,
    validateCreateComment,
    caseNotionController.addComment
);

// Resolve comment
router.post('/cases/:caseId/notion/comments/:commentId/resolve',
    userMiddleware, firmFilter, canAccessCase,
    caseNotionController.resolveComment
);

// Delete comment
router.delete('/cases/:caseId/notion/comments/:commentId',
    userMiddleware, firmFilter, canAccessCase,
    caseNotionController.deleteComment
);

// ═══════════════════════════════════════════════════════════════
// ACTIVITY ROUTES
// ═══════════════════════════════════════════════════════════════

// Get page activity
router.get('/cases/:caseId/notion/pages/:pageId/activity',
    userMiddleware, firmFilter, canAccessCase, validatePageIdParam,
    caseNotionController.getPageActivity
);

// ═══════════════════════════════════════════════════════════════
// SEARCH ROUTES
// ═══════════════════════════════════════════════════════════════

// Search within case
router.get('/cases/:caseId/notion/search',
    userMiddleware, firmFilter, canAccessCase,
    validateSearch,
    caseNotionController.search
);

// ═══════════════════════════════════════════════════════════════
// EXPORT ROUTES
// ═══════════════════════════════════════════════════════════════

// Export to PDF
router.get('/cases/:caseId/notion/pages/:pageId/export/pdf',
    userMiddleware, firmFilter, canAccessCase, validatePageIdParam,
    caseNotionController.exportPdf
);

// Export to Markdown
router.get('/cases/:caseId/notion/pages/:pageId/export/markdown',
    userMiddleware, firmFilter, canAccessCase, validatePageIdParam,
    caseNotionController.exportMarkdown
);

// Export to HTML
router.get('/cases/:caseId/notion/pages/:pageId/export/html',
    userMiddleware, firmFilter, canAccessCase, validatePageIdParam,
    caseNotionController.exportHtml
);

// ═══════════════════════════════════════════════════════════════
// TEMPLATE ROUTES
// ═══════════════════════════════════════════════════════════════

// Get templates
router.get('/notion/templates',
    userMiddleware, firmFilter,
    caseNotionController.getTemplates
);

// Apply template
router.post('/cases/:caseId/notion/pages/:pageId/apply-template',
    userMiddleware, firmFilter, canAccessCase, canEditPage, validatePageIdParam,
    validateApplyTemplate,
    invalidateCache(['notion:page:{pageId}:*']),
    caseNotionController.applyTemplate
);

// Save as template
router.post('/cases/:caseId/notion/pages/:pageId/save-as-template',
    userMiddleware, firmFilter, canAccessCase, validatePageIdParam,
    caseNotionController.saveAsTemplate
);

// ═══════════════════════════════════════════════════════════════
// TASK LINKING ROUTES
// ═══════════════════════════════════════════════════════════════

// Link task to block
router.post('/cases/:caseId/notion/blocks/:blockId/link-task',
    userMiddleware, firmFilter, canAccessCase, validateBlockIdParam,
    validateLinkTask,
    caseNotionController.linkTask
);

// Unlink task from block
router.post('/cases/:caseId/notion/blocks/:blockId/unlink-task',
    userMiddleware, firmFilter, canAccessCase, validateBlockIdParam,
    validateLinkTask,
    caseNotionController.unlinkTask
);

// Create task from block
router.post('/cases/:caseId/notion/blocks/:blockId/create-task',
    userMiddleware, firmFilter, canAccessCase, validateBlockIdParam,
    caseNotionController.createTaskFromBlock
);

module.exports = router;
