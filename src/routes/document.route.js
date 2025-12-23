const express = require('express');
const { userMiddleware } = require('../middlewares');
const { auditAction } = require('../middlewares/auditLog.middleware');
const { uploadRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    getUploadUrl,
    confirmUpload,
    getDocuments,
    getDocument,
    updateDocument,
    deleteDocument,
    getDocumentsByCase,
    getDocumentsByClient,
    getDocumentStats,
    downloadDocument,
    generateShareLink,
    revokeShareLink,
    uploadVersion,
    getVersionHistory,
    restoreVersion,
    searchDocuments,
    getRecentDocuments,
    bulkDeleteDocuments,
    moveDocument
} = require('../controllers/document.controller');

const app = express.Router();

// Upload operations
app.post('/upload', uploadRateLimiter, userMiddleware, auditAction('upload_document', 'document', { severity: 'medium' }), getUploadUrl);
app.post('/confirm', uploadRateLimiter, userMiddleware, auditAction('upload_document', 'document', { severity: 'medium' }), confirmUpload);

// Search and stats (must be before :id routes)
app.get('/search', userMiddleware, auditAction('search_query', 'search', { severity: 'low', skipGET: false }), searchDocuments);
app.get('/stats', userMiddleware, getDocumentStats);
app.get('/recent', userMiddleware, getRecentDocuments);

// By case/client
app.get('/case/:caseId', userMiddleware, getDocumentsByCase);
app.get('/client/:clientId', userMiddleware, getDocumentsByClient);

// Bulk operations
app.post('/bulk-delete', userMiddleware, auditAction('bulk_delete_documents', 'document', { severity: 'critical', captureChanges: true }), bulkDeleteDocuments);

// CRUD operations
app.get('/', userMiddleware, getDocuments);

app.get('/:id', userMiddleware, auditAction('view_document', 'document', { severity: 'low', skipGET: false }), getDocument);
app.patch('/:id', userMiddleware, auditAction('update_document', 'document', { severity: 'medium', captureChanges: true }), updateDocument);
app.delete('/:id', userMiddleware, auditAction('delete_document', 'document', { severity: 'high', captureChanges: true }), deleteDocument);

// Download
app.get('/:id/download', userMiddleware, auditAction('download_document', 'document', { severity: 'low', skipGET: false }), downloadDocument);

// Version operations
app.get('/:id/versions', userMiddleware, getVersionHistory);
app.post('/:id/versions', uploadRateLimiter, userMiddleware, auditAction('upload_document_version', 'document', { severity: 'medium' }), uploadVersion);
app.post('/:id/versions/:versionId/restore', userMiddleware, auditAction('restore_document_version', 'document', { severity: 'high', captureChanges: true }), restoreVersion);

// Share operations
app.post('/:id/share', userMiddleware, auditAction('share_document', 'document', { severity: 'high' }), generateShareLink);
app.post('/:id/revoke-share', userMiddleware, auditAction('revoke_document_share', 'document', { severity: 'medium' }), revokeShareLink);

// Move
app.post('/:id/move', userMiddleware, auditAction('update_document', 'document', { severity: 'medium', captureChanges: true }), moveDocument);

module.exports = app;
