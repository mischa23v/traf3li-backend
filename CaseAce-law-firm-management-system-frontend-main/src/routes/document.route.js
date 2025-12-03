const express = require('express');
const { userMiddleware } = require('../middlewares');
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
app.post('/upload', userMiddleware, getUploadUrl);
app.post('/confirm', userMiddleware, confirmUpload);

// Search and stats (must be before :id routes)
app.get('/search', userMiddleware, searchDocuments);
app.get('/stats', userMiddleware, getDocumentStats);
app.get('/recent', userMiddleware, getRecentDocuments);

// By case/client
app.get('/case/:caseId', userMiddleware, getDocumentsByCase);
app.get('/client/:clientId', userMiddleware, getDocumentsByClient);

// Bulk operations
app.post('/bulk-delete', userMiddleware, bulkDeleteDocuments);

// CRUD operations
app.get('/', userMiddleware, getDocuments);

app.get('/:id', userMiddleware, getDocument);
app.patch('/:id', userMiddleware, updateDocument);
app.delete('/:id', userMiddleware, deleteDocument);

// Download
app.get('/:id/download', userMiddleware, downloadDocument);

// Version operations
app.get('/:id/versions', userMiddleware, getVersionHistory);
app.post('/:id/versions', userMiddleware, uploadVersion);
app.post('/:id/versions/:versionId/restore', userMiddleware, restoreVersion);

// Share operations
app.post('/:id/share', userMiddleware, generateShareLink);
app.post('/:id/revoke-share', userMiddleware, revokeShareLink);

// Move
app.post('/:id/move', userMiddleware, moveDocument);

module.exports = app;
