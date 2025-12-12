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
const CaseNotionBlock = require('../models/caseNotionBlock.model');

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

// ═══════════════════════════════════════════════════════════════
// WHITEBOARD - BLOCK POSITION/SIZE/STYLING ROUTES
// ═══════════════════════════════════════════════════════════════

// Update block position
router.patch('/cases/:caseId/notion/blocks/:blockId/position',
    userMiddleware, firmFilter, canAccessCase, validateBlockIdParam,
    invalidateCache(['notion:block:{blockId}:*']),
    caseNotionController.updateBlockPosition
);

// Update block size
router.patch('/cases/:caseId/notion/blocks/:blockId/size',
    userMiddleware, firmFilter, canAccessCase, validateBlockIdParam,
    invalidateCache(['notion:block:{blockId}:*']),
    caseNotionController.updateBlockSize
);

// Update block color
router.patch('/cases/:caseId/notion/blocks/:blockId/color',
    userMiddleware, firmFilter, canAccessCase, validateBlockIdParam,
    invalidateCache(['notion:block:{blockId}:*']),
    caseNotionController.updateBlockColor
);

// Update block priority
router.patch('/cases/:caseId/notion/blocks/:blockId/priority',
    userMiddleware, firmFilter, canAccessCase, validateBlockIdParam,
    invalidateCache(['notion:block:{blockId}:*']),
    caseNotionController.updateBlockPriority
);

// ═══════════════════════════════════════════════════════════════
// WHITEBOARD - ENTITY LINKING ROUTES
// ═══════════════════════════════════════════════════════════════

// Link block to event
router.post('/cases/:caseId/notion/blocks/:blockId/link-event',
    userMiddleware, firmFilter, canAccessCase, validateBlockIdParam,
    invalidateCache(['notion:block:{blockId}:*']),
    caseNotionController.linkBlockToEvent
);

// Link block to hearing
router.post('/cases/:caseId/notion/blocks/:blockId/link-hearing',
    userMiddleware, firmFilter, canAccessCase, validateBlockIdParam,
    invalidateCache(['notion:block:{blockId}:*']),
    caseNotionController.linkBlockToHearing
);

// Link block to document
router.post('/cases/:caseId/notion/blocks/:blockId/link-document',
    userMiddleware, firmFilter, canAccessCase, validateBlockIdParam,
    invalidateCache(['notion:block:{blockId}:*']),
    caseNotionController.linkBlockToDocument
);

// Unlink all entities from block
router.delete('/cases/:caseId/notion/blocks/:blockId/unlink',
    userMiddleware, firmFilter, canAccessCase, validateBlockIdParam,
    invalidateCache(['notion:block:{blockId}:*']),
    caseNotionController.unlinkBlock
);

// ═══════════════════════════════════════════════════════════════
// WHITEBOARD - CONNECTION ROUTES
// ═══════════════════════════════════════════════════════════════

// Get connections for page
router.get('/cases/:caseId/notion/pages/:pageId/connections',
    userMiddleware, firmFilter, canAccessCase, validatePageIdParam,
    cacheResponse(NOTION_CACHE_TTL),
    caseNotionController.getConnections
);

// Create connection
router.post('/cases/:caseId/notion/pages/:pageId/connections',
    userMiddleware, firmFilter, canAccessCase, canEditPage, validatePageIdParam,
    invalidateCache(['notion:page:{pageId}:*']),
    caseNotionController.createConnection
);

// Update connection
router.patch('/cases/:caseId/notion/connections/:connectionId',
    userMiddleware, firmFilter, canAccessCase,
    caseNotionController.updateConnection
);

// Delete connection
router.delete('/cases/:caseId/notion/connections/:connectionId',
    userMiddleware, firmFilter, canAccessCase,
    caseNotionController.deleteConnection
);

// ═══════════════════════════════════════════════════════════════
// WHITEBOARD - PAGE VIEW MODE ROUTES
// ═══════════════════════════════════════════════════════════════

// Update page view mode
router.patch('/cases/:caseId/notion/pages/:pageId/view-mode',
    userMiddleware, firmFilter, canAccessCase, canEditPage, validatePageIdParam,
    invalidateCache(['notion:page:{pageId}:*']),
    caseNotionController.updateViewMode
);

// Update whiteboard config
router.patch('/cases/:caseId/notion/pages/:pageId/whiteboard-config',
    userMiddleware, firmFilter, canAccessCase, canEditPage, validatePageIdParam,
    invalidateCache(['notion:page:{pageId}:*']),
    caseNotionController.updateWhiteboardConfig
);

// ═══════════════════════════════════════════════════════════════
// WHITEBOARD SHAPE ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * Create a canvas shape
 */
router.post('/cases/:caseId/notion/pages/:pageId/shapes',
    userMiddleware, firmFilter, canAccessCase,
    caseNotionController.createShape
);

/**
 * Create an arrow/connector shape
 */
router.post('/cases/:caseId/notion/pages/:pageId/arrows',
    userMiddleware, firmFilter, canAccessCase,
    caseNotionController.createArrow
);

/**
 * Create a frame (container)
 */
router.post('/cases/:caseId/notion/pages/:pageId/frames',
    userMiddleware, firmFilter, canAccessCase,
    caseNotionController.createFrame
);

/**
 * Update element z-index
 */
router.patch('/cases/:caseId/notion/blocks/:blockId/z-index',
    userMiddleware, firmFilter, canAccessCase, validateBlockIdParam,
    caseNotionController.updateZIndex
);

/**
 * Batch update multiple elements
 */
router.patch('/cases/:caseId/notion/pages/:pageId/batch-update',
    userMiddleware, firmFilter, canAccessCase,
    caseNotionController.batchUpdateElements
);

/**
 * Get connections affected by element move
 */
router.get('/cases/:caseId/notion/blocks/:blockId/connections',
    userMiddleware, firmFilter, canAccessCase, validateBlockIdParam,
    caseNotionController.updateConnectionPaths
);

/**
 * Update element rotation
 */
router.patch('/cases/:caseId/notion/blocks/:blockId/rotation',
    userMiddleware, firmFilter, canAccessCase, validateBlockIdParam,
    async (req, res) => {
        try {
            const { blockId } = req.params;
            const { angle } = req.body;

            if (angle < 0 || angle > 6.283185) {
                return res.status(400).json({
                    error: true,
                    message: 'Angle must be between 0 and 2π radians'
                });
            }

            const block = await CaseNotionBlock.findByIdAndUpdate(
                blockId,
                {
                    angle,
                    lastEditedBy: req.user._id,
                    lastEditedAt: new Date(),
                    $inc: { version: 1 }
                },
                { new: true }
            );

            if (!block) {
                return res.status(404).json({ error: true, message: 'Block not found' });
            }

            res.json({ success: true, data: block });
        } catch (error) {
            res.status(500).json({ error: true, message: error.message });
        }
    }
);

/**
 * Update element opacity
 */
router.patch('/cases/:caseId/notion/blocks/:blockId/opacity',
    userMiddleware, firmFilter, canAccessCase, validateBlockIdParam,
    async (req, res) => {
        try {
            const { blockId } = req.params;
            const { opacity } = req.body;

            if (opacity < 0 || opacity > 100) {
                return res.status(400).json({
                    error: true,
                    message: 'Opacity must be between 0 and 100'
                });
            }

            const block = await CaseNotionBlock.findByIdAndUpdate(
                blockId,
                {
                    opacity,
                    lastEditedBy: req.user._id,
                    lastEditedAt: new Date(),
                    $inc: { version: 1 }
                },
                { new: true }
            );

            if (!block) {
                return res.status(404).json({ error: true, message: 'Block not found' });
            }

            res.json({ success: true, data: block });
        } catch (error) {
            res.status(500).json({ error: true, message: error.message });
        }
    }
);

/**
 * Update element stroke/fill styling
 */
router.patch('/cases/:caseId/notion/blocks/:blockId/style',
    userMiddleware, firmFilter, canAccessCase, validateBlockIdParam,
    async (req, res) => {
        try {
            const { blockId } = req.params;
            const { strokeColor, strokeWidth, fillStyle, roughness } = req.body;

            const updateData = {
                lastEditedBy: req.user._id,
                lastEditedAt: new Date()
            };

            if (strokeColor) updateData.strokeColor = strokeColor;
            if (strokeWidth) updateData.strokeWidth = strokeWidth;
            if (fillStyle) updateData.fillStyle = fillStyle;
            if (roughness !== undefined) updateData.roughness = roughness;

            const block = await CaseNotionBlock.findByIdAndUpdate(
                blockId,
                { $set: updateData, $inc: { version: 1 } },
                { new: true }
            );

            if (!block) {
                return res.status(404).json({ error: true, message: 'Block not found' });
            }

            res.json({ success: true, data: block });
        } catch (error) {
            res.status(500).json({ error: true, message: error.message });
        }
    }
);

// ═══════════════════════════════════════════════════════════════
// FRAME MANAGEMENT ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * Add element to frame
 */
router.post('/cases/:caseId/notion/frames/:frameId/children',
    userMiddleware, firmFilter, canAccessCase,
    caseNotionController.addToFrame
);

/**
 * Remove element from frame
 */
router.delete('/cases/:caseId/notion/frames/:frameId/children/:elementId',
    userMiddleware, firmFilter, canAccessCase,
    caseNotionController.removeFromFrame
);

/**
 * Get all elements in a frame
 */
router.get('/cases/:caseId/notion/frames/:frameId/children',
    userMiddleware, firmFilter, canAccessCase,
    caseNotionController.getFrameChildren
);

/**
 * Auto-detect elements inside frame bounds
 */
router.post('/cases/:caseId/notion/frames/:frameId/auto-detect',
    userMiddleware, firmFilter, canAccessCase,
    caseNotionController.autoDetectFrameChildren
);

/**
 * Move frame with all children
 */
router.patch('/cases/:caseId/notion/frames/:frameId/move',
    userMiddleware, firmFilter, canAccessCase,
    caseNotionController.moveFrameWithChildren
);

// ═══════════════════════════════════════════════════════════════
// UNDO/REDO ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * Undo last action
 */
router.post('/cases/:caseId/notion/pages/:pageId/undo',
    userMiddleware, firmFilter, canAccessCase,
    caseNotionController.undo
);

/**
 * Redo last undone action
 */
router.post('/cases/:caseId/notion/pages/:pageId/redo',
    userMiddleware, firmFilter, canAccessCase,
    caseNotionController.redo
);

/**
 * Get undo/redo status
 */
router.get('/cases/:caseId/notion/pages/:pageId/history-status',
    userMiddleware, firmFilter, canAccessCase,
    caseNotionController.getHistoryStatus
);

// ═══════════════════════════════════════════════════════════════
// MULTI-SELECT OPERATION ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * Duplicate selected elements
 */
router.post('/cases/:caseId/notion/pages/:pageId/duplicate',
    userMiddleware, firmFilter, canAccessCase,
    caseNotionController.duplicateElements
);

/**
 * Delete selected elements
 */
router.delete('/cases/:caseId/notion/pages/:pageId/bulk-delete',
    userMiddleware, firmFilter, canAccessCase,
    caseNotionController.bulkDeleteElements
);

/**
 * Group selected elements
 */
router.post('/cases/:caseId/notion/pages/:pageId/group',
    userMiddleware, firmFilter, canAccessCase,
    caseNotionController.groupElements
);

/**
 * Ungroup elements
 */
router.post('/cases/:caseId/notion/pages/:pageId/ungroup',
    userMiddleware, firmFilter, canAccessCase,
    caseNotionController.ungroupElements
);

/**
 * Align selected elements
 */
router.post('/cases/:caseId/notion/pages/:pageId/align',
    userMiddleware, firmFilter, canAccessCase,
    caseNotionController.alignElements
);

/**
 * Distribute elements evenly
 */
router.post('/cases/:caseId/notion/pages/:pageId/distribute',
    userMiddleware, firmFilter, canAccessCase,
    caseNotionController.distributeElements
);

module.exports = router;
