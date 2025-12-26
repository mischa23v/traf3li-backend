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

// SECURITY: Removed public access - legal documents require authentication
// Get all documents (protected - authenticated users only)
app.get('/', userMiddleware, getDocuments);

// SECURITY: Removed public access - legal documents require authentication
// Get single document (protected - authenticated users only)
app.get('/:_id', userMiddleware, getDocument);

// Update document
app.patch('/:_id', userMiddleware, updateDocument);

// Delete document
app.delete('/:_id', userMiddleware, deleteDocument);

// SECURITY: Removed public access - document downloads require authentication
// Increment download count (protected - authenticated users only)
app.post('/:_id/download', userMiddleware, incrementDownload);

module.exports = app;
