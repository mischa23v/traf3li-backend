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
    updateOutcome 
} = require('../controllers/case.controller');
const app = express.Router();

// Create case
app.post('/', userMiddleware, createCase);

// Get all cases
app.get('/', userMiddleware, getCases);

// Get single case
app.get('/:_id', userMiddleware, getCase);

// Update case
app.patch('/:_id', userMiddleware, updateCase);

// Add note
app.post('/:_id/note', userMiddleware, addNote);

// Add document
app.post('/:_id/document', userMiddleware, addDocument);

// Add hearing
app.post('/:_id/hearing', userMiddleware, addHearing);

// Update status
app.patch('/:_id/status', userMiddleware, updateStatus);

// Update outcome
app.patch('/:_id/outcome', userMiddleware, updateOutcome);

module.exports = app;
