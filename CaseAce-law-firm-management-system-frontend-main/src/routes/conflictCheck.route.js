const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    runConflictCheck,
    getConflictChecks,
    getConflictCheck,
    updateConflictCheck,
    resolveMatch,
    deleteConflictCheck,
    quickConflictCheck,
    getConflictStats
} = require('../controllers/conflictCheck.controller');

const app = express.Router();

// Quick check (must be before :id routes)
app.post('/quick', userMiddleware, quickConflictCheck);

// Stats
app.get('/stats', userMiddleware, getConflictStats);

// CRUD operations
app.get('/', userMiddleware, getConflictChecks);
app.post('/', userMiddleware, runConflictCheck);

app.get('/:id', userMiddleware, getConflictCheck);
app.patch('/:id', userMiddleware, updateConflictCheck);
app.delete('/:id', userMiddleware, deleteConflictCheck);

// Match resolution
app.post('/:id/matches/:matchIndex/resolve', userMiddleware, resolveMatch);

module.exports = app;
