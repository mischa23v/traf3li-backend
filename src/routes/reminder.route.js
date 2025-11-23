const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createReminder,
    getReminders,
    getReminder,
    updateReminder,
    deleteReminder,
    completeReminder,
    dismissReminder,
    getUpcomingReminders,
    getOverdueReminders,
    bulkDeleteReminders
} = require('../controllers/reminder.controller');

const app = express.Router();

// Reminder CRUD
app.post('/', userMiddleware, createReminder);
app.get('/', userMiddleware, getReminders);

// Special queries
app.get('/upcoming', userMiddleware, getUpcomingReminders);
app.get('/overdue', userMiddleware, getOverdueReminders);

// Single reminder
app.get('/:id', userMiddleware, getReminder);
app.put('/:id', userMiddleware, updateReminder);
app.delete('/:id', userMiddleware, deleteReminder);

// Reminder actions
app.post('/:id/complete', userMiddleware, completeReminder);
app.post('/:id/dismiss', userMiddleware, dismissReminder);

// Bulk operations
app.delete('/bulk', userMiddleware, bulkDeleteReminders);

module.exports = app;
