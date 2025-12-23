const express = require('express');
const { userMiddleware } = require('../middlewares');
const { authenticate } = require('../middlewares');
const { 
    createDocument, 
    getDocuments, 
    getDocument, 
    updateDocument, 
    deleteDocument, 
    incrementDownload 
} = require('../controllers/legalDocument.controller');
const app = express.Router();

// Create document
app.post('/', userMiddleware, createDocument);

// Get all documents (public + auth-based filtering)
app.get('/', getDocuments);

// Get single document
app.get('/:_id', getDocument);

// Update document
app.patch('/:_id', userMiddleware, updateDocument);

// Delete document
app.delete('/:_id', userMiddleware, deleteDocument);

// Increment download count
app.post('/:_id/download', incrementDownload);

module.exports = app;
