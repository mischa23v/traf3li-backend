const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const {
    createCase,
    getCases,
    getCase,
    updateCase,
    addNote,
    addDocument,
    addHearing,
    updateStatus,
    updateOutcome,
    addTimelineEvent,
    addClaim,
    updateHearing,
    updateProgress,
    deleteCase,
    deleteNote,
    deleteHearing,
    deleteDocument,
    deleteClaim,
    deleteTimelineEvent,
    getStatistics,
    // S3 Document Management
    getDocumentUploadUrl,
    confirmDocumentUpload,
    getDocumentDownloadUrl,
    deleteDocumentWithS3,
    // Notes, Claims, Timeline CRUD
    updateNote,
    updateClaim,
    updateTimelineEvent,
    // Audit
    getCaseAudit,
    // Rich Documents (CKEditor)
    createRichDocument,
    getRichDocuments,
    getRichDocument,
    updateRichDocument,
    deleteRichDocument,
    getRichDocumentVersions,
    restoreRichDocumentVersion,
    // Rich Document Export
    exportRichDocumentToPdf,
    exportRichDocumentToLatex,
    exportRichDocumentToMarkdown,
    getRichDocumentPreview
} = require('../controllers/case.controller');
const app = express.Router();

// Get statistics (must be before /:_id to avoid conflict)
app.get('/statistics', userMiddleware, firmFilter, getStatistics);

// Create case
app.post('/', userMiddleware, firmFilter, createCase);

// Get all cases
app.get('/', userMiddleware, firmFilter, getCases);

// Get single case
app.get('/:_id', userMiddleware, firmFilter, getCase);

// Update case
app.patch('/:_id', userMiddleware, firmFilter, updateCase);

// Delete case
app.delete('/:_id', userMiddleware, firmFilter, deleteCase);

// Update progress
app.patch('/:_id/progress', userMiddleware, firmFilter, updateProgress);

// ==================== NOTES ====================
// Add note
app.post('/:_id/note', userMiddleware, firmFilter, addNote);

// Update note
app.patch('/:_id/notes/:noteId', userMiddleware, firmFilter, updateNote);

// Delete note
app.delete('/:_id/notes/:noteId', userMiddleware, firmFilter, deleteNote);

// ==================== S3 DOCUMENTS ====================
// Get upload URL
app.post('/:_id/documents/upload-url', userMiddleware, firmFilter, getDocumentUploadUrl);

// Confirm upload
app.post('/:_id/documents/confirm', userMiddleware, firmFilter, confirmDocumentUpload);

// Get download URL
app.get('/:_id/documents/:docId/download', userMiddleware, firmFilter, getDocumentDownloadUrl);

// Delete document (with S3)
app.delete('/:_id/documents/:docId', userMiddleware, firmFilter, deleteDocumentWithS3);

// Legacy document endpoints
app.post('/:_id/document', userMiddleware, firmFilter, addDocument);
app.delete('/:_id/document/:documentId', userMiddleware, firmFilter, deleteDocument);

// ==================== HEARINGS ====================
// Add hearing
app.post('/:_id/hearing', userMiddleware, firmFilter, addHearing);

// Update hearing
app.patch('/:_id/hearings/:hearingId', userMiddleware, firmFilter, updateHearing);

// Delete hearing
app.delete('/:_id/hearings/:hearingId', userMiddleware, firmFilter, deleteHearing);

// Legacy hearing update/delete routes
app.patch('/:_id/hearing/:hearingId', userMiddleware, firmFilter, updateHearing);
app.delete('/:_id/hearing/:hearingId', userMiddleware, firmFilter, deleteHearing);

// ==================== TIMELINE ====================
// Add timeline event
app.post('/:_id/timeline', userMiddleware, firmFilter, addTimelineEvent);

// Update timeline event
app.patch('/:_id/timeline/:eventId', userMiddleware, firmFilter, updateTimelineEvent);

// Delete timeline event
app.delete('/:_id/timeline/:eventId', userMiddleware, firmFilter, deleteTimelineEvent);

// ==================== CLAIMS ====================
// Add claim
app.post('/:_id/claim', userMiddleware, firmFilter, addClaim);

// Update claim
app.patch('/:_id/claims/:claimId', userMiddleware, firmFilter, updateClaim);

// Delete claim
app.delete('/:_id/claims/:claimId', userMiddleware, firmFilter, deleteClaim);

// Legacy claim delete route
app.delete('/:_id/claim/:claimId', userMiddleware, firmFilter, deleteClaim);

// ==================== STATUS & OUTCOME ====================
// Update status
app.patch('/:_id/status', userMiddleware, firmFilter, updateStatus);

// Update outcome
app.patch('/:_id/outcome', userMiddleware, firmFilter, updateOutcome);

// ==================== AUDIT ====================
// Get case audit history
app.get('/:_id/audit', userMiddleware, firmFilter, getCaseAudit);

// ==================== RICH DOCUMENTS (CKEditor) ====================
// Create rich document
app.post('/:_id/rich-documents', userMiddleware, firmFilter, createRichDocument);

// Get all rich documents for a case
app.get('/:_id/rich-documents', userMiddleware, firmFilter, getRichDocuments);

// Get single rich document
app.get('/:_id/rich-documents/:docId', userMiddleware, firmFilter, getRichDocument);

// Update rich document
app.patch('/:_id/rich-documents/:docId', userMiddleware, firmFilter, updateRichDocument);

// Delete rich document
app.delete('/:_id/rich-documents/:docId', userMiddleware, firmFilter, deleteRichDocument);

// Get rich document version history
app.get('/:_id/rich-documents/:docId/versions', userMiddleware, firmFilter, getRichDocumentVersions);

// Restore rich document to a previous version
app.post('/:_id/rich-documents/:docId/versions/:versionNumber/restore', userMiddleware, firmFilter, restoreRichDocumentVersion);

// ==================== RICH DOCUMENT EXPORT ====================
// Export to PDF
app.get('/:_id/rich-documents/:docId/export/pdf', userMiddleware, firmFilter, exportRichDocumentToPdf);

// Export to LaTeX
app.get('/:_id/rich-documents/:docId/export/latex', userMiddleware, firmFilter, exportRichDocumentToLatex);

// Export to Markdown
app.get('/:_id/rich-documents/:docId/export/markdown', userMiddleware, firmFilter, exportRichDocumentToMarkdown);

// Get HTML preview
app.get('/:_id/rich-documents/:docId/preview', userMiddleware, firmFilter, getRichDocumentPreview);

module.exports = app;
