const express = require('express');
const { userMiddleware } = require('../middlewares');
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
    userMiddleware,
    cacheResponse(NOTION_CACHE_TTL),
    caseNotionController.listCasesWithNotion
);

// ═══════════════════════════════════════════════════════════════
// PAGE ROUTES
// ═══════════════════════════════════════════════════════════════

// List pages for a case
router.get('/cases/:caseId/notion/pages',
    userMiddleware, canAccessCase,
    cacheResponse(NOTION_CACHE_TTL),
    caseNotionController.listPages
);

// Get single page with blocks
router.get('/cases/:caseId/notion/pages/:pageId',
    userMiddleware, canAccessCase, validatePageIdParam,
    cacheResponse(NOTION_CACHE_TTL),
    caseNotionController.getPage
);

// Create page
router.post('/cases/:caseId/notion/pages',
    userMiddleware, canAccessCase,
    validateCreatePage,
    invalidateCache(['notion:case:{caseId}:*']),
    caseNotionController.createPage
);

// Update page
router.patch('/cases/:caseId/notion/pages/:pageId',
    userMiddleware, canAccessCase, canEditPage, validatePageIdParam,
    validateUpdatePage,
    invalidateCache(['notion:case:{caseId}:*', 'notion:page:{pageId}:*']),
    caseNotionController.updatePage
);

// Delete page (soft delete)
router.delete('/cases/:caseId/notion/pages/:pageId',
    userMiddleware, canAccessCase, canEditPage, validatePageIdParam,
    invalidateCache(['notion:case:{caseId}:*', 'notion:page:{pageId}:*']),
    caseNotionController.deletePage
);

// Archive page
router.post('/cases/:caseId/notion/pages/:pageId/archive',
    userMiddleware, canAccessCase, canEditPage, validatePageIdParam,
    invalidateCache(['notion:case:{caseId}:*', 'notion:page:{pageId}:*']),
    caseNotionController.archivePage
);

// Restore page
router.post('/cases/:caseId/notion/pages/:pageId/restore',
    userMiddleware, canAccessCase, canEditPage, validatePageIdParam,
    invalidateCache(['notion:case:{caseId}:*', 'notion:page:{pageId}:*']),
    caseNotionController.restorePage
);

// Duplicate page
router.post('/cases/:caseId/notion/pages/:pageId/duplicate',
    userMiddleware, canAccessCase, validatePageIdParam,
    invalidateCache(['notion:case:{caseId}:*']),
    caseNotionController.duplicatePage
);

// Toggle favorite
router.post('/cases/:caseId/notion/pages/:pageId/favorite',
    userMiddleware, canAccessCase, validatePageIdParam,
    invalidateCache(['notion:case:{caseId}:*', 'notion:page:{pageId}:*']),
    caseNotionController.toggleFavorite
);

// Toggle pin
router.post('/cases/:caseId/notion/pages/:pageId/pin',
    userMiddleware, canAccessCase, validatePageIdParam,
    invalidateCache(['notion:case:{caseId}:*', 'notion:page:{pageId}:*']),
    caseNotionController.togglePin
);

// Merge pages
router.post('/cases/:caseId/notion/pages/merge',
    userMiddleware, canAccessCase,
    validateMergePages,
    invalidateCache(['notion:case:{caseId}:*']),
    caseNotionController.mergePages
);

// ═══════════════════════════════════════════════════════════════
// BLOCK ROUTES
// ═══════════════════════════════════════════════════════════════

// Get blocks for a page
router.get('/cases/:caseId/notion/pages/:pageId/blocks',
    userMiddleware, canAccessCase, validatePageIdParam,
    cacheResponse(NOTION_CACHE_TTL),
    caseNotionController.getBlocks
);

// Create block
router.post('/cases/:caseId/notion/pages/:pageId/blocks',
    userMiddleware, canAccessCase, canEditPage, validatePageIdParam,
    validateCreateBlock,
    invalidateCache(['notion:page:{pageId}:*']),
    caseNotionController.createBlock
);

// Update block
router.patch('/cases/:caseId/notion/blocks/:blockId',
    userMiddleware, canAccessCase, validateBlockIdParam,
    validateUpdateBlock,
    invalidateCache(['notion:block:{blockId}:*']),
    caseNotionController.updateBlock
);

// Delete block
router.delete('/cases/:caseId/notion/blocks/:blockId',
    userMiddleware, canAccessCase, validateBlockIdParam,
    invalidateCache(['notion:block:{blockId}:*']),
    caseNotionController.deleteBlock
);

// Move block
router.post('/cases/:caseId/notion/blocks/:blockId/move',
    userMiddleware, canAccessCase, validateBlockIdParam,
    validateMoveBlock,
    invalidateCache(['notion:block:{blockId}:*']),
    caseNotionController.moveBlock
);

// Lock block for editing
router.post('/cases/:caseId/notion/blocks/:blockId/lock',
    userMiddleware, canAccessCase, validateBlockIdParam,
    caseNotionController.lockBlock
);

// Unlock block
router.post('/cases/:caseId/notion/blocks/:blockId/unlock',
    userMiddleware, canAccessCase, validateBlockIdParam,
    caseNotionController.unlockBlock
);

// ═══════════════════════════════════════════════════════════════
// SYNCED BLOCK ROUTES
// ═══════════════════════════════════════════════════════════════

// Create synced block
router.post('/cases/:caseId/notion/synced-blocks',
    userMiddleware, canAccessCase,
    caseNotionController.createSyncedBlock
);

// Get synced block
router.get('/cases/:caseId/notion/synced-blocks/:blockId',
    userMiddleware, canAccessCase, validateBlockIdParam,
    caseNotionController.getSyncedBlock
);

// Unsync block
router.post('/cases/:caseId/notion/synced-blocks/:blockId/unsync',
    userMiddleware, canAccessCase, validateBlockIdParam,
    caseNotionController.unsyncBlock
);

// ═══════════════════════════════════════════════════════════════
// COMMENT ROUTES
// ═══════════════════════════════════════════════════════════════

// Get comments for block
router.get('/cases/:caseId/notion/blocks/:blockId/comments',
    userMiddleware, canAccessCase, validateBlockIdParam,
    caseNotionController.getComments
);

// Add comment
router.post('/cases/:caseId/notion/blocks/:blockId/comments',
    userMiddleware, canAccessCase, validateBlockIdParam,
    validateCreateComment,
    caseNotionController.addComment
);

// Resolve comment
router.post('/cases/:caseId/notion/comments/:commentId/resolve',
    userMiddleware, canAccessCase,
    caseNotionController.resolveComment
);

// Delete comment
router.delete('/cases/:caseId/notion/comments/:commentId',
    userMiddleware, canAccessCase,
    caseNotionController.deleteComment
);

// ═══════════════════════════════════════════════════════════════
// ACTIVITY ROUTES
// ═══════════════════════════════════════════════════════════════

// Get page activity
router.get('/cases/:caseId/notion/pages/:pageId/activity',
    userMiddleware, canAccessCase, validatePageIdParam,
    caseNotionController.getPageActivity
);

// ═══════════════════════════════════════════════════════════════
// SEARCH ROUTES
// ═══════════════════════════════════════════════════════════════

// Search within case
router.get('/cases/:caseId/notion/search',
    userMiddleware, canAccessCase,
    validateSearch,
    caseNotionController.search
);

// ═══════════════════════════════════════════════════════════════
// EXPORT ROUTES
// ═══════════════════════════════════════════════════════════════

// Export to PDF
router.get('/cases/:caseId/notion/pages/:pageId/export/pdf',
    userMiddleware, canAccessCase, validatePageIdParam,
    caseNotionController.exportPdf
);

// Export to Markdown
router.get('/cases/:caseId/notion/pages/:pageId/export/markdown',
    userMiddleware, canAccessCase, validatePageIdParam,
    caseNotionController.exportMarkdown
);

// Export to HTML
router.get('/cases/:caseId/notion/pages/:pageId/export/html',
    userMiddleware, canAccessCase, validatePageIdParam,
    caseNotionController.exportHtml
);

// ═══════════════════════════════════════════════════════════════
// TEMPLATE ROUTES
// ═══════════════════════════════════════════════════════════════

// Get templates
router.get('/notion/templates',
    userMiddleware,
    caseNotionController.getTemplates
);

// Apply template
router.post('/cases/:caseId/notion/pages/:pageId/apply-template',
    userMiddleware, canAccessCase, canEditPage, validatePageIdParam,
    validateApplyTemplate,
    invalidateCache(['notion:page:{pageId}:*']),
    caseNotionController.applyTemplate
);

// Save as template
router.post('/cases/:caseId/notion/pages/:pageId/save-as-template',
    userMiddleware, canAccessCase, validatePageIdParam,
    caseNotionController.saveAsTemplate
);

// ═══════════════════════════════════════════════════════════════
// TASK LINKING ROUTES
// ═══════════════════════════════════════════════════════════════

// Link task to block
router.post('/cases/:caseId/notion/blocks/:blockId/link-task',
    userMiddleware, canAccessCase, validateBlockIdParam,
    validateLinkTask,
    caseNotionController.linkTask
);

// Unlink task from block
router.post('/cases/:caseId/notion/blocks/:blockId/unlink-task',
    userMiddleware, canAccessCase, validateBlockIdParam,
    validateLinkTask,
    caseNotionController.unlinkTask
);

// Create task from block
router.post('/cases/:caseId/notion/blocks/:blockId/create-task',
    userMiddleware, canAccessCase, validateBlockIdParam,
    caseNotionController.createTaskFromBlock
);

// ═══════════════════════════════════════════════════════════════
// WHITEBOARD - BLOCK POSITION/SIZE/STYLING ROUTES
// ═══════════════════════════════════════════════════════════════

// Update block position
router.patch('/cases/:caseId/notion/blocks/:blockId/position',
    userMiddleware, canAccessCase, validateBlockIdParam,
    invalidateCache(['notion:block:{blockId}:*']),
    caseNotionController.updateBlockPosition
);

// Update block size
router.patch('/cases/:caseId/notion/blocks/:blockId/size',
    userMiddleware, canAccessCase, validateBlockIdParam,
    invalidateCache(['notion:block:{blockId}:*']),
    caseNotionController.updateBlockSize
);

// Update block color
router.patch('/cases/:caseId/notion/blocks/:blockId/color',
    userMiddleware, canAccessCase, validateBlockIdParam,
    invalidateCache(['notion:block:{blockId}:*']),
    caseNotionController.updateBlockColor
);

// Update block priority
router.patch('/cases/:caseId/notion/blocks/:blockId/priority',
    userMiddleware, canAccessCase, validateBlockIdParam,
    invalidateCache(['notion:block:{blockId}:*']),
    caseNotionController.updateBlockPriority
);

// ═══════════════════════════════════════════════════════════════
// WHITEBOARD - ENTITY LINKING ROUTES
// ═══════════════════════════════════════════════════════════════

// Link block to event
router.post('/cases/:caseId/notion/blocks/:blockId/link-event',
    userMiddleware, canAccessCase, validateBlockIdParam,
    invalidateCache(['notion:block:{blockId}:*']),
    caseNotionController.linkBlockToEvent
);

// Link block to hearing
router.post('/cases/:caseId/notion/blocks/:blockId/link-hearing',
    userMiddleware, canAccessCase, validateBlockIdParam,
    invalidateCache(['notion:block:{blockId}:*']),
    caseNotionController.linkBlockToHearing
);

// Link block to document
router.post('/cases/:caseId/notion/blocks/:blockId/link-document',
    userMiddleware, canAccessCase, validateBlockIdParam,
    invalidateCache(['notion:block:{blockId}:*']),
    caseNotionController.linkBlockToDocument
);

// Unlink all entities from block
router.delete('/cases/:caseId/notion/blocks/:blockId/unlink',
    userMiddleware, canAccessCase, validateBlockIdParam,
    invalidateCache(['notion:block:{blockId}:*']),
    caseNotionController.unlinkBlock
);

// ═══════════════════════════════════════════════════════════════
// WHITEBOARD - CONNECTION ROUTES
// ═══════════════════════════════════════════════════════════════

// Get connections for page
router.get('/cases/:caseId/notion/pages/:pageId/connections',
    userMiddleware, canAccessCase, validatePageIdParam,
    cacheResponse(NOTION_CACHE_TTL),
    caseNotionController.getConnections
);

// Create connection
router.post('/cases/:caseId/notion/pages/:pageId/connections',
    userMiddleware, canAccessCase, canEditPage, validatePageIdParam,
    invalidateCache(['notion:page:{pageId}:*']),
    caseNotionController.createConnection
);

// Update connection
router.patch('/cases/:caseId/notion/connections/:connectionId',
    userMiddleware, canAccessCase,
    caseNotionController.updateConnection
);

// Delete connection
router.delete('/cases/:caseId/notion/connections/:connectionId',
    userMiddleware, canAccessCase,
    caseNotionController.deleteConnection
);

// ═══════════════════════════════════════════════════════════════
// WHITEBOARD - PAGE VIEW MODE ROUTES
// ═══════════════════════════════════════════════════════════════

// Update page view mode
router.patch('/cases/:caseId/notion/pages/:pageId/view-mode',
    userMiddleware, canAccessCase, canEditPage, validatePageIdParam,
    invalidateCache(['notion:page:{pageId}:*']),
    caseNotionController.updateViewMode
);

// Update whiteboard config
router.patch('/cases/:caseId/notion/pages/:pageId/whiteboard-config',
    userMiddleware, canAccessCase, canEditPage, validatePageIdParam,
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
    userMiddleware, canAccessCase,
    caseNotionController.createShape
);

/**
 * Create an arrow/connector shape
 */
router.post('/cases/:caseId/notion/pages/:pageId/arrows',
    userMiddleware, canAccessCase,
    caseNotionController.createArrow
);

/**
 * Create a frame (container)
 */
router.post('/cases/:caseId/notion/pages/:pageId/frames',
    userMiddleware, canAccessCase,
    caseNotionController.createFrame
);

/**
 * Update element z-index
 */
router.patch('/cases/:caseId/notion/blocks/:blockId/z-index',
    userMiddleware, canAccessCase, validateBlockIdParam,
    caseNotionController.updateZIndex
);

/**
 * Batch update multiple elements
 */
router.patch('/cases/:caseId/notion/pages/:pageId/batch-update',
    userMiddleware, canAccessCase,
    caseNotionController.batchUpdateElements
);

/**
 * Get connections affected by element move
 */
router.get('/cases/:caseId/notion/blocks/:blockId/connections',
    userMiddleware, canAccessCase, validateBlockIdParam,
    caseNotionController.updateConnectionPaths
);

/**
 * Update element rotation
 */
router.patch('/cases/:caseId/notion/blocks/:blockId/rotation',
    userMiddleware, canAccessCase, validateBlockIdParam,
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
    userMiddleware, canAccessCase, validateBlockIdParam,
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
    userMiddleware, canAccessCase, validateBlockIdParam,
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
    userMiddleware, canAccessCase,
    caseNotionController.addToFrame
);

/**
 * Remove element from frame
 */
router.delete('/cases/:caseId/notion/frames/:frameId/children/:elementId',
    userMiddleware, canAccessCase,
    caseNotionController.removeFromFrame
);

/**
 * Get all elements in a frame
 */
router.get('/cases/:caseId/notion/frames/:frameId/children',
    userMiddleware, canAccessCase,
    caseNotionController.getFrameChildren
);

/**
 * Auto-detect elements inside frame bounds
 */
router.post('/cases/:caseId/notion/frames/:frameId/auto-detect',
    userMiddleware, canAccessCase,
    caseNotionController.autoDetectFrameChildren
);

/**
 * Move frame with all children
 */
router.patch('/cases/:caseId/notion/frames/:frameId/move',
    userMiddleware, canAccessCase,
    caseNotionController.moveFrameWithChildren
);

// ═══════════════════════════════════════════════════════════════
// UNDO/REDO ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * Undo last action
 */
router.post('/cases/:caseId/notion/pages/:pageId/undo',
    userMiddleware, canAccessCase,
    caseNotionController.undo
);

/**
 * Redo last undone action
 */
router.post('/cases/:caseId/notion/pages/:pageId/redo',
    userMiddleware, canAccessCase,
    caseNotionController.redo
);

/**
 * Get undo/redo status
 */
router.get('/cases/:caseId/notion/pages/:pageId/history-status',
    userMiddleware, canAccessCase,
    caseNotionController.getHistoryStatus
);

// ═══════════════════════════════════════════════════════════════
// MULTI-SELECT OPERATION ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * Duplicate selected elements
 */
router.post('/cases/:caseId/notion/pages/:pageId/duplicate',
    userMiddleware, canAccessCase,
    caseNotionController.duplicateElements
);

/**
 * Delete selected elements
 */
router.delete('/cases/:caseId/notion/pages/:pageId/bulk-delete',
    userMiddleware, canAccessCase,
    caseNotionController.bulkDeleteElements
);

/**
 * Group selected elements
 */
router.post('/cases/:caseId/notion/pages/:pageId/group',
    userMiddleware, canAccessCase,
    caseNotionController.groupElements
);

/**
 * Ungroup elements
 */
router.post('/cases/:caseId/notion/pages/:pageId/ungroup',
    userMiddleware, canAccessCase,
    caseNotionController.ungroupElements
);

/**
 * Align selected elements
 */
router.post('/cases/:caseId/notion/pages/:pageId/align',
    userMiddleware, canAccessCase,
    caseNotionController.alignElements
);

/**
 * Distribute elements evenly
 */
router.post('/cases/:caseId/notion/pages/:pageId/distribute',
    userMiddleware, canAccessCase,
    caseNotionController.distributeElements
);

module.exports = router;
