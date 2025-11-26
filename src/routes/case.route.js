const express = require('express');
const { userMiddleware } = require('../middlewares');
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
    getCaseAudit
} = require('../controllers/case.controller');
const app = express.Router();

// Get statistics (must be before /:_id to avoid conflict)
app.get('/statistics', userMiddleware, getStatistics);

// Create case
app.post('/', userMiddleware, createCase);

// Get all cases
app.get('/', userMiddleware, getCases);

// Get single case
app.get('/:_id', userMiddleware, getCase);

// Update case
app.patch('/:_id', userMiddleware, updateCase);

// Delete case
app.delete('/:_id', userMiddleware, deleteCase);

// Update progress
app.patch('/:_id/progress', userMiddleware, updateProgress);

// ==================== NOTES ====================
// Add note
app.post('/:_id/note', userMiddleware, addNote);

// Update note
app.patch('/:_id/notes/:noteId', userMiddleware, updateNote);

// Delete note
app.delete('/:_id/notes/:noteId', userMiddleware, deleteNote);

// ==================== S3 DOCUMENTS ====================
// Get upload URL
app.post('/:_id/documents/upload-url', userMiddleware, getDocumentUploadUrl);

// Confirm upload
app.post('/:_id/documents/confirm', userMiddleware, confirmDocumentUpload);

// Get download URL
app.get('/:_id/documents/:docId/download', userMiddleware, getDocumentDownloadUrl);

// Delete document (with S3)
app.delete('/:_id/documents/:docId', userMiddleware, deleteDocumentWithS3);

// Legacy document endpoints
app.post('/:_id/document', userMiddleware, addDocument);
app.delete('/:_id/document/:documentId', userMiddleware, deleteDocument);

// ==================== HEARINGS ====================
// Add hearing
app.post('/:_id/hearing', userMiddleware, addHearing);

// Update hearing
app.patch('/:_id/hearings/:hearingId', userMiddleware, updateHearing);

// Delete hearing
app.delete('/:_id/hearings/:hearingId', userMiddleware, deleteHearing);

// Legacy hearing update/delete routes
app.patch('/:_id/hearing/:hearingId', userMiddleware, updateHearing);
app.delete('/:_id/hearing/:hearingId', userMiddleware, deleteHearing);

// ==================== TIMELINE ====================
// Add timeline event
app.post('/:_id/timeline', userMiddleware, addTimelineEvent);

// Update timeline event
app.patch('/:_id/timeline/:eventId', userMiddleware, updateTimelineEvent);

// Delete timeline event
app.delete('/:_id/timeline/:eventId', userMiddleware, deleteTimelineEvent);

// ==================== CLAIMS ====================
// Add claim
app.post('/:_id/claim', userMiddleware, addClaim);

// Update claim
app.patch('/:_id/claims/:claimId', userMiddleware, updateClaim);

// Delete claim
app.delete('/:_id/claims/:claimId', userMiddleware, deleteClaim);

// Legacy claim delete route
app.delete('/:_id/claim/:claimId', userMiddleware, deleteClaim);

// ==================== STATUS & OUTCOME ====================
// Update status
app.patch('/:_id/status', userMiddleware, updateStatus);

// Update outcome
app.patch('/:_id/outcome', userMiddleware, updateOutcome);

// ==================== AUDIT ====================
// Get case audit history
app.get('/:_id/audit', userMiddleware, getCaseAudit);

module.exports = app;
