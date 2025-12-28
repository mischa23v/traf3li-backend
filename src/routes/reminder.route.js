const express = require('express');
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
app.get('/location/summary', getLocationRemindersSummary);
app.get('/location/locations', getUserLocations);
app.post('/location', createLocationReminder);
app.post('/location/check', checkLocationTriggers);
app.post('/location/nearby', getNearbyReminders);
app.post('/location/save', saveUserLocation);
app.post('/location/distance', calculateDistance);
app.put('/location/locations/:locationId', updateUserLocation);
app.delete('/location/locations/:locationId', deleteUserLocation);
app.post('/location/:reminderId/reset', resetLocationTrigger);

// Static routes (must be before parameterized routes)
app.get('/stats', getReminderStats);
app.get('/upcoming', getUpcomingReminders);
app.get('/overdue', getOverdueReminders);
app.get('/snoozed-due', getSnoozedDueReminders);
app.get('/delegated', getDelegatedReminders);

// NLP endpoints (must be before parameterized routes)
app.post('/parse', createReminderFromNaturalLanguage);
app.post('/voice', createReminderFromVoice);

// Bulk operations
app.put('/bulk', bulkUpdateReminders);
app.delete('/bulk', bulkDeleteReminders);

// Reminder CRUD
app.post('/', createReminder);
app.get('/', getReminders);
app.get('/:id', getReminder);
app.put('/:id', updateReminder);
app.patch('/:id', updateReminder);
app.delete('/:id', deleteReminder);

// Reminder actions
app.post('/:id/complete', completeReminder);
app.post('/:id/dismiss', dismissReminder);
app.post('/:id/snooze', snoozeReminder);
app.post('/:id/delegate', delegateReminder);

module.exports = app;
