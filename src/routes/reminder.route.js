const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
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
    bulkUpdateReminders,
    createReminderFromNaturalLanguage,
    createReminderFromVoice
} = require('../controllers/reminder.controller');

const {
    createLocationReminder,
    checkLocationTriggers,
    getNearbyReminders,
    saveUserLocation,
    getUserLocations,
    updateUserLocation,
    deleteUserLocation,
    getLocationRemindersSummary,
    resetLocationTrigger,
    calculateDistance
} = require('../controllers/locationReminder.controller');

const app = express.Router();

// Location-based reminder routes (must be before parameterized routes)
app.get('/location/summary', userMiddleware, firmFilter, getLocationRemindersSummary);
app.get('/location/locations', userMiddleware, firmFilter, getUserLocations);
app.post('/location', userMiddleware, firmFilter, createLocationReminder);
app.post('/location/check', userMiddleware, firmFilter, checkLocationTriggers);
app.post('/location/nearby', userMiddleware, firmFilter, getNearbyReminders);
app.post('/location/save', userMiddleware, firmFilter, saveUserLocation);
app.post('/location/distance', userMiddleware, firmFilter, calculateDistance);
app.put('/location/locations/:locationId', userMiddleware, firmFilter, updateUserLocation);
app.delete('/location/locations/:locationId', userMiddleware, firmFilter, deleteUserLocation);
app.post('/location/:reminderId/reset', userMiddleware, firmFilter, resetLocationTrigger);

// Static routes (must be before parameterized routes)
app.get('/stats', userMiddleware, firmFilter, getReminderStats);
app.get('/upcoming', userMiddleware, firmFilter, getUpcomingReminders);
app.get('/overdue', userMiddleware, firmFilter, getOverdueReminders);
app.get('/snoozed-due', userMiddleware, firmFilter, getSnoozedDueReminders);
app.get('/delegated', userMiddleware, firmFilter, getDelegatedReminders);

// NLP endpoints (must be before parameterized routes)
app.post('/parse', userMiddleware, firmFilter, createReminderFromNaturalLanguage);
app.post('/voice', userMiddleware, firmFilter, createReminderFromVoice);

// Bulk operations
app.put('/bulk', userMiddleware, firmFilter, bulkUpdateReminders);
app.delete('/bulk', userMiddleware, firmFilter, bulkDeleteReminders);

// Reminder CRUD
app.post('/', userMiddleware, firmFilter, createReminder);
app.get('/', userMiddleware, firmFilter, getReminders);
app.get('/:id', userMiddleware, firmFilter, getReminder);
app.put('/:id', userMiddleware, firmFilter, updateReminder);
app.patch('/:id', userMiddleware, firmFilter, updateReminder);
app.delete('/:id', userMiddleware, firmFilter, deleteReminder);

// Reminder actions
app.post('/:id/complete', userMiddleware, firmFilter, completeReminder);
app.post('/:id/dismiss', userMiddleware, firmFilter, dismissReminder);
app.post('/:id/snooze', userMiddleware, firmFilter, snoozeReminder);
app.post('/:id/delegate', userMiddleware, firmFilter, delegateReminder);

module.exports = app;
