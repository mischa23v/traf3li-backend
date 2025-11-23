const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    // Timer operations
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    getTimerStatus,

    // Time entry CRUD
    createTimeEntry,
    getTimeEntries,
    getTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,

    // Approval workflow
    approveTimeEntry,
    rejectTimeEntry,

    // Analytics
    getTimeStats,

    // Bulk operations
    bulkDeleteTimeEntries
} = require('../controllers/timeTracking.controller');

const app = express.Router();

// Timer routes
app.post('/timer/start', userMiddleware, startTimer);
app.post('/timer/pause', userMiddleware, pauseTimer);
app.post('/timer/resume', userMiddleware, resumeTimer);
app.post('/timer/stop', userMiddleware, stopTimer);
app.get('/timer/status', userMiddleware, getTimerStatus);

// Time entry routes
app.post('/entries', userMiddleware, createTimeEntry);
app.get('/entries', userMiddleware, getTimeEntries);
app.get('/entries/:id', userMiddleware, getTimeEntry);
app.put('/entries/:id', userMiddleware, updateTimeEntry);
app.delete('/entries/:id', userMiddleware, deleteTimeEntry);

// Approval routes
app.post('/entries/:id/approve', userMiddleware, approveTimeEntry);
app.post('/entries/:id/reject', userMiddleware, rejectTimeEntry);

// Statistics
app.get('/stats', userMiddleware, getTimeStats);

// Bulk operations
app.delete('/entries/bulk', userMiddleware, bulkDeleteTimeEntries);

module.exports = app;
