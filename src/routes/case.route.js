const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const {
    validateCreateCase,
    validateUpdateCase,
    validateUpdateStatus,
    validateAssignLawyer,
    validateAddParty,
    validateLinkDocument,
    validateAddNote,
    validateUpdateNote,
    validateAddHearing,
    validateUpdateHearing,
    validateAddTimelineEvent,
    validateUpdateTimelineEvent,
    validateAddClaim,
    validateUpdateClaim,
    validateUpdateOutcome,
    validateUpdateProgress,
    validateDocumentUploadUrl,
    validateConfirmDocumentUpload,
    validateCreateRichDocument,
    validateUpdateRichDocument,
    validateObjectIdParam,
    validateNestedIdParam
} = require('../validators/case.validator');
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
app.post('/', userMiddleware, firmFilter, validateCreateCase, createCase);

// Get all cases
app.get('/', userMiddleware, firmFilter, getCases);

// Get single case
app.get('/:_id', userMiddleware, firmFilter, validateObjectIdParam, getCase);

// Update case
app.patch('/:_id', userMiddleware, firmFilter, validateObjectIdParam, validateUpdateCase, updateCase);

// Delete case
app.delete('/:_id', userMiddleware, firmFilter, validateObjectIdParam, deleteCase);

// Update progress
app.patch('/:_id/progress', userMiddleware, firmFilter, validateObjectIdParam, validateUpdateProgress, updateProgress);

// ==================== NOTES ====================
// Add note
app.post('/:_id/note', userMiddleware, firmFilter, validateObjectIdParam, validateAddNote, addNote);

// Update note
app.patch('/:_id/notes/:noteId', userMiddleware, firmFilter, validateNestedIdParam, validateUpdateNote, updateNote);

// Delete note
app.delete('/:_id/notes/:noteId', userMiddleware, firmFilter, validateNestedIdParam, deleteNote);

// ==================== S3 DOCUMENTS ====================
// Get upload URL
app.post('/:_id/documents/upload-url', userMiddleware, firmFilter, validateObjectIdParam, validateDocumentUploadUrl, getDocumentUploadUrl);

// Confirm upload
app.post('/:_id/documents/confirm', userMiddleware, firmFilter, validateObjectIdParam, validateConfirmDocumentUpload, confirmDocumentUpload);

// Get download URL
app.get('/:_id/documents/:docId/download', userMiddleware, firmFilter, validateNestedIdParam, getDocumentDownloadUrl);

// Delete document (with S3)
app.delete('/:_id/documents/:docId', userMiddleware, firmFilter, validateNestedIdParam, deleteDocumentWithS3);

// Legacy document endpoints
app.post('/:_id/document', userMiddleware, firmFilter, validateObjectIdParam, addDocument);
app.delete('/:_id/document/:documentId', userMiddleware, firmFilter, validateNestedIdParam, deleteDocument);

// ==================== HEARINGS ====================
// Add hearing
app.post('/:_id/hearing', userMiddleware, firmFilter, validateObjectIdParam, validateAddHearing, addHearing);

// Update hearing
app.patch('/:_id/hearings/:hearingId', userMiddleware, firmFilter, validateNestedIdParam, validateUpdateHearing, updateHearing);

// Delete hearing
app.delete('/:_id/hearings/:hearingId', userMiddleware, firmFilter, validateNestedIdParam, deleteHearing);

// Legacy hearing update/delete routes
app.patch('/:_id/hearing/:hearingId', userMiddleware, firmFilter, validateNestedIdParam, validateUpdateHearing, updateHearing);
app.delete('/:_id/hearing/:hearingId', userMiddleware, firmFilter, validateNestedIdParam, deleteHearing);

// ==================== TIMELINE ====================
// Add timeline event
app.post('/:_id/timeline', userMiddleware, firmFilter, validateObjectIdParam, validateAddTimelineEvent, addTimelineEvent);

// Update timeline event
app.patch('/:_id/timeline/:eventId', userMiddleware, firmFilter, validateNestedIdParam, validateUpdateTimelineEvent, updateTimelineEvent);

// Delete timeline event
app.delete('/:_id/timeline/:eventId', userMiddleware, firmFilter, validateNestedIdParam, deleteTimelineEvent);

// ==================== CLAIMS ====================
// Add claim
app.post('/:_id/claim', userMiddleware, firmFilter, validateObjectIdParam, validateAddClaim, addClaim);

// Update claim
app.patch('/:_id/claims/:claimId', userMiddleware, firmFilter, validateNestedIdParam, validateUpdateClaim, updateClaim);

// Delete claim
app.delete('/:_id/claims/:claimId', userMiddleware, firmFilter, validateNestedIdParam, deleteClaim);

// Legacy claim delete route
app.delete('/:_id/claim/:claimId', userMiddleware, firmFilter, validateNestedIdParam, deleteClaim);

// ==================== STATUS & OUTCOME ====================
// Update status
app.patch('/:_id/status', userMiddleware, firmFilter, validateObjectIdParam, validateUpdateStatus, updateStatus);

// Update outcome
app.patch('/:_id/outcome', userMiddleware, firmFilter, validateObjectIdParam, validateUpdateOutcome, updateOutcome);

// ==================== AUDIT ====================
// Get case audit history
app.get('/:_id/audit', userMiddleware, firmFilter, validateObjectIdParam, getCaseAudit);

// ==================== RICH DOCUMENTS (CKEditor) ====================
// Create rich document
app.post('/:_id/rich-documents', userMiddleware, firmFilter, validateObjectIdParam, validateCreateRichDocument, createRichDocument);

// Get all rich documents for a case
app.get('/:_id/rich-documents', userMiddleware, firmFilter, validateObjectIdParam, getRichDocuments);

// Get single rich document
app.get('/:_id/rich-documents/:docId', userMiddleware, firmFilter, validateNestedIdParam, getRichDocument);

// Update rich document
app.patch('/:_id/rich-documents/:docId', userMiddleware, firmFilter, validateNestedIdParam, validateUpdateRichDocument, updateRichDocument);

// Delete rich document
app.delete('/:_id/rich-documents/:docId', userMiddleware, firmFilter, validateNestedIdParam, deleteRichDocument);

// Get rich document version history
app.get('/:_id/rich-documents/:docId/versions', userMiddleware, firmFilter, validateNestedIdParam, getRichDocumentVersions);

// Restore rich document to a previous version
app.post('/:_id/rich-documents/:docId/versions/:versionNumber/restore', userMiddleware, firmFilter, validateNestedIdParam, restoreRichDocumentVersion);

// ==================== RICH DOCUMENT EXPORT ====================
// Export to PDF
app.get('/:_id/rich-documents/:docId/export/pdf', userMiddleware, firmFilter, validateNestedIdParam, exportRichDocumentToPdf);

// Export to LaTeX
app.get('/:_id/rich-documents/:docId/export/latex', userMiddleware, firmFilter, validateNestedIdParam, exportRichDocumentToLatex);

// Export to Markdown
app.get('/:_id/rich-documents/:docId/export/markdown', userMiddleware, firmFilter, validateNestedIdParam, exportRichDocumentToMarkdown);

// Get HTML preview
app.get('/:_id/rich-documents/:docId/preview', userMiddleware, firmFilter, validateNestedIdParam, getRichDocumentPreview);

module.exports = app;
