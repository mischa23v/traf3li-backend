const express = require('express');
const { userMiddleware } = require('../middlewares');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
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

app.use(apiRateLimiter);

// Location-based reminder routes (must be before parameterized routes)
app.get('/location/summary', userMiddleware, getLocationRemindersSummary);
app.get('/location/locations', userMiddleware, getUserLocations);
app.post('/location', userMiddleware, createLocationReminder);
app.post('/location/check', userMiddleware, checkLocationTriggers);
app.post('/location/nearby', userMiddleware, getNearbyReminders);
app.post('/location/save', userMiddleware, saveUserLocation);
app.post('/location/distance', userMiddleware, calculateDistance);
app.put('/location/locations/:locationId', userMiddleware, updateUserLocation);
app.delete('/location/locations/:locationId', userMiddleware, deleteUserLocation);
app.post('/location/:reminderId/reset', userMiddleware, resetLocationTrigger);

// Static routes (must be before parameterized routes)
app.get('/stats', userMiddleware, getReminderStats);
app.get('/upcoming', userMiddleware, getUpcomingReminders);
app.get('/overdue', userMiddleware, getOverdueReminders);
app.get('/snoozed-due', userMiddleware, getSnoozedDueReminders);
app.get('/delegated', userMiddleware, getDelegatedReminders);

// NLP endpoints (must be before parameterized routes)
app.post('/parse', userMiddleware, createReminderFromNaturalLanguage);
app.post('/voice', userMiddleware, createReminderFromVoice);

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
