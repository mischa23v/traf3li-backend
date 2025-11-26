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
    getStatistics
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

// Add note
app.post('/:_id/note', userMiddleware, addNote);

// Delete note
app.delete('/:_id/note/:noteId', userMiddleware, deleteNote);

// Add document
app.post('/:_id/document', userMiddleware, addDocument);

// Delete document
app.delete('/:_id/document/:documentId', userMiddleware, deleteDocument);

// Add hearing
app.post('/:_id/hearing', userMiddleware, addHearing);

// Update hearing
app.patch('/:_id/hearing/:hearingId', userMiddleware, updateHearing);

// Delete hearing
app.delete('/:_id/hearing/:hearingId', userMiddleware, deleteHearing);

// Add timeline event
app.post('/:_id/timeline', userMiddleware, addTimelineEvent);

// Delete timeline event
app.delete('/:_id/timeline/:eventId', userMiddleware, deleteTimelineEvent);

// Add claim
app.post('/:_id/claim', userMiddleware, addClaim);

// Delete claim
app.delete('/:_id/claim/:claimId', userMiddleware, deleteClaim);

// Update status
app.patch('/:_id/status', userMiddleware, updateStatus);

// Update outcome
app.patch('/:_id/outcome', userMiddleware, updateOutcome);

module.exports = app;
