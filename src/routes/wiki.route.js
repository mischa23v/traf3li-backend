const express = require('express');
const router = express.Router();
const wikiController = require('../controllers/wiki.controller');
const { userMiddleware } = require('../middlewares');

// Apply authentication to all routes
router.use(userMiddleware);

// ============================================
// PAGE ROUTES
// ============================================

// List pages for a case
router.get('/cases/:caseId/wiki', wikiController.listPages);

// Get page tree for a case
router.get('/cases/:caseId/wiki/tree', wikiController.getPageTree);

// Create a new page
router.post('/cases/:caseId/wiki', wikiController.createPage);

// Search pages in a case
router.get('/cases/:caseId/wiki/search', wikiController.search);

// Get pinned pages for a case
router.get('/cases/:caseId/wiki/pinned', wikiController.getPinnedPages);

// Get link graph for a case
router.get('/cases/:caseId/wiki/graph', wikiController.getLinkGraph);

// Initialize default collections for a case
router.post('/cases/:caseId/wiki/init-collections', wikiController.initializeDefaultCollections);

// Get a single page
router.get('/wiki/:pageId', wikiController.getPage);

// Update a page
router.put('/wiki/:pageId', wikiController.updatePage);

// Delete a page
router.delete('/wiki/:pageId', wikiController.deletePage);

// Move a page
router.put('/wiki/:pageId/move', wikiController.movePage);

// Toggle pin status
router.post('/wiki/:pageId/pin', wikiController.togglePin);

// ============================================
// VERSION CONTROL ROUTES
// ============================================

// Get page history
router.get('/wiki/:pageId/history', wikiController.getHistory);

// Get specific revision
router.get('/wiki/:pageId/revisions/:version', wikiController.getRevision);

// Compare versions
router.get('/wiki/:pageId/diff', wikiController.compareVersions);

// Restore version
router.post('/wiki/:pageId/restore/:version', wikiController.restoreVersion);

// ============================================
// COLLECTION ROUTES
// ============================================

// List collections for a case
router.get('/cases/:caseId/wiki/collections', wikiController.listCollections);

// Create collection
router.post('/cases/:caseId/wiki/collections', wikiController.createCollection);

// Update collection
router.put('/wiki/collections/:collectionId', wikiController.updateCollection);

// Delete collection
router.delete('/wiki/collections/:collectionId', wikiController.deleteCollection);

// ============================================
// BACKLINK ROUTES
// ============================================

// Get backlinks for a page
router.get('/wiki/:pageId/backlinks', wikiController.getBacklinks);

// Get outgoing links from a page
router.get('/wiki/:pageId/links', wikiController.getOutgoingLinks);

// ============================================
// COMMENT ROUTES
// ============================================

// Get comments for a page
router.get('/wiki/:pageId/comments', wikiController.getComments);

// Add comment
router.post('/wiki/:pageId/comments', wikiController.addComment);

// Update comment
router.put('/wiki/comments/:commentId', wikiController.updateComment);

// Delete comment
router.delete('/wiki/comments/:commentId', wikiController.deleteComment);

// Resolve comment
router.post('/wiki/comments/:commentId/resolve', wikiController.resolveComment);

// ============================================
// ATTACHMENT ROUTES
// ============================================

// List attachments for a page
router.get('/wiki/:pageId/attachments', wikiController.listAttachments);

// Get upload URL for attachment
router.post('/wiki/:pageId/attachments/upload', wikiController.getAttachmentUploadUrl);

// Confirm attachment upload
router.post('/wiki/:pageId/attachments/confirm', wikiController.confirmAttachmentUpload);

// Get download URL for attachment
router.get('/wiki/:pageId/attachments/:attachmentId/download', wikiController.getAttachmentDownloadUrl);

// Update attachment metadata
router.put('/wiki/:pageId/attachments/:attachmentId', wikiController.updateAttachment);

// Delete attachment
router.delete('/wiki/:pageId/attachments/:attachmentId', wikiController.deleteAttachment);

// Seal/unseal attachment
router.post('/wiki/:pageId/attachments/:attachmentId/seal', wikiController.sealAttachment);

// ============================================
// ATTACHMENT VERSIONING ROUTES
// ============================================

// Get upload URL for new version
router.post('/wiki/:pageId/attachments/:attachmentId/versions/upload', wikiController.getAttachmentVersionUploadUrl);

// Confirm new version upload
router.post('/wiki/:pageId/attachments/:attachmentId/versions/confirm', wikiController.confirmAttachmentVersionUpload);

// Get attachment version history
router.get('/wiki/:pageId/attachments/:attachmentId/versions', wikiController.getAttachmentVersionHistory);

// Download specific version
router.get('/wiki/:pageId/attachments/:attachmentId/versions/:versionNumber/download', wikiController.downloadAttachmentVersion);

// Restore previous version
router.post('/wiki/:pageId/attachments/:attachmentId/versions/:versionNumber/restore', wikiController.restoreAttachmentVersion);

// ============================================
// SEAL/UNSEAL ROUTES
// ============================================

// Seal page
router.post('/wiki/:pageId/seal', wikiController.sealPage);

// Unseal page
router.post('/wiki/:pageId/unseal', wikiController.unsealPage);

// ============================================
// TEMPLATE ROUTES
// ============================================

// List templates
router.get('/wiki/templates', wikiController.listTemplates);

// Create from template
router.post('/wiki/templates/:templateId/create', wikiController.createFromTemplate);

// ============================================
// GLOBAL ROUTES
// ============================================

// Global search across all cases
router.get('/wiki/search', wikiController.globalSearch);

// Get recent pages
router.get('/wiki/recent', wikiController.getRecentPages);

// ============================================
// EXPORT ROUTES (PDF, LaTeX, Markdown)
// ============================================

// Export page as PDF (with Arabic/RTL support)
router.get('/wiki/:pageId/export/pdf', wikiController.exportToPdf);

// Export page as LaTeX
router.get('/wiki/:pageId/export/latex', wikiController.exportToLatex);

// Export page as Markdown
router.get('/wiki/:pageId/export/markdown', wikiController.exportToMarkdown);

// Get HTML preview for export
router.get('/wiki/:pageId/export/preview', wikiController.getHtmlPreview);

// ============================================
// CALENDAR SETTINGS
// ============================================

// Update calendar settings for a page
router.put('/wiki/:pageId/calendar', wikiController.updateCalendarSettings);

// ============================================
// VOICE MEMO ROUTES
// ============================================

// List voice memos for a page
router.get('/wiki/:pageId/voice-memos', wikiController.listVoiceMemos);

// Get upload URL for voice memo
router.post('/wiki/:pageId/voice-memos/upload', wikiController.getVoiceMemoUploadUrl);

// Confirm voice memo upload
router.post('/wiki/:pageId/voice-memos/confirm', wikiController.confirmVoiceMemoUpload);

// Get voice memo stream/download URL
router.get('/wiki/:pageId/voice-memos/:memoId/url', wikiController.getVoiceMemoUrl);

// Update voice memo metadata
router.put('/wiki/:pageId/voice-memos/:memoId', wikiController.updateVoiceMemo);

// Delete voice memo
router.delete('/wiki/:pageId/voice-memos/:memoId', wikiController.deleteVoiceMemo);

// Seal/unseal voice memo
router.post('/wiki/:pageId/voice-memos/:memoId/seal', wikiController.sealVoiceMemo);

module.exports = router;
