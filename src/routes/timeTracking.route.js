const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
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

    // Weekly view
    getWeeklyEntries,

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
app.post('/timer/start', userMiddleware, firmFilter, startTimer);
app.post('/timer/pause', userMiddleware, firmFilter, pauseTimer);
app.post('/timer/resume', userMiddleware, firmFilter, resumeTimer);
app.post('/timer/stop', userMiddleware, firmFilter, stopTimer);
app.get('/timer/status', userMiddleware, firmFilter, getTimerStatus);

// Static routes (must be before parameterized routes)
app.get('/weekly', userMiddleware, firmFilter, getWeeklyEntries);
app.get('/stats', userMiddleware, firmFilter, getTimeStats);
app.delete('/entries/bulk', userMiddleware, firmFilter, bulkDeleteTimeEntries);

// Time entry routes
app.post('/entries', userMiddleware, firmFilter, createTimeEntry);
app.get('/entries', userMiddleware, firmFilter, getTimeEntries);
app.get('/entries/:id', userMiddleware, firmFilter, getTimeEntry);
app.put('/entries/:id', userMiddleware, firmFilter, updateTimeEntry);
app.patch('/entries/:id', userMiddleware, firmFilter, updateTimeEntry);
app.delete('/entries/:id', userMiddleware, firmFilter, deleteTimeEntry);

// Approval routes
app.post('/entries/:id/approve', userMiddleware, firmFilter, approveTimeEntry);
app.post('/entries/:id/reject', userMiddleware, firmFilter, rejectTimeEntry);

module.exports = app;
