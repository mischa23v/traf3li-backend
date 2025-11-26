const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createFollowup,
    getFollowups,
    getFollowup,
    updateFollowup,
    deleteFollowup,
    getFollowupsByEntity,
    getFollowupStats,
    getOverdueFollowups,
    getUpcomingFollowups,
    getTodayFollowups,
    completeFollowup,
    cancelFollowup,
    rescheduleFollowup,
    addNote,
    bulkComplete,
    bulkDelete
} = require('../controllers/followup.controller');

const app = express.Router();

// Special queries (must be before :id routes)
app.get('/upcoming', userMiddleware, getUpcomingFollowups);
app.get('/overdue', userMiddleware, getOverdueFollowups);
app.get('/today', userMiddleware, getTodayFollowups);
app.get('/stats', userMiddleware, getFollowupStats);
app.get('/entity/:entityType/:entityId', userMiddleware, getFollowupsByEntity);

// Bulk operations
app.post('/bulk-complete', userMiddleware, bulkComplete);
app.post('/bulk-delete', userMiddleware, bulkDelete);

// CRUD operations
app.get('/', userMiddleware, getFollowups);
app.post('/', userMiddleware, createFollowup);

app.get('/:id', userMiddleware, getFollowup);
app.patch('/:id', userMiddleware, updateFollowup);
app.delete('/:id', userMiddleware, deleteFollowup);

// Status operations
app.post('/:id/complete', userMiddleware, completeFollowup);
app.post('/:id/cancel', userMiddleware, cancelFollowup);
app.post('/:id/reschedule', userMiddleware, rescheduleFollowup);
app.post('/:id/notes', userMiddleware, addNote);

module.exports = app;
