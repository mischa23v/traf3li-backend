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
    snoozeReminder,
    delegateReminder,
    getUpcomingReminders,
    getOverdueReminders,
    getSnoozedDueReminders,
    getDelegatedReminders,
    getReminderStats,
    bulkDeleteReminders,
    bulkUpdateReminders
} = require('../controllers/reminder.controller');

const app = express.Router();

// Static routes (must be before parameterized routes)
app.get('/stats', userMiddleware, getReminderStats);
app.get('/upcoming', userMiddleware, getUpcomingReminders);
app.get('/overdue', userMiddleware, getOverdueReminders);
app.get('/snoozed-due', userMiddleware, getSnoozedDueReminders);
app.get('/delegated', userMiddleware, getDelegatedReminders);

// Bulk operations
app.put('/bulk', userMiddleware, bulkUpdateReminders);
app.delete('/bulk', userMiddleware, bulkDeleteReminders);

// Reminder CRUD
app.post('/', userMiddleware, createReminder);
app.get('/', userMiddleware, getReminders);
app.get('/:id', userMiddleware, getReminder);
app.put('/:id', userMiddleware, updateReminder);
app.patch('/:id', userMiddleware, updateReminder);
app.delete('/:id', userMiddleware, deleteReminder);

// Reminder actions
app.post('/:id/complete', userMiddleware, completeReminder);
app.post('/:id/dismiss', userMiddleware, dismissReminder);
app.post('/:id/snooze', userMiddleware, snoozeReminder);
app.post('/:id/delegate', userMiddleware, delegateReminder);

module.exports = app;
