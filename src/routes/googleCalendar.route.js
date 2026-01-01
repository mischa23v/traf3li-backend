const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    getAuthUrl,
    handleCallback,
    disconnect,
    getStatus,
    getCalendars,
    getEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    updateSelectedCalendars,
    toggleShowExternalEvents,
    watchCalendar,
    stopWatch,
    syncFromGoogle,
    syncToGoogle,
    enableAutoSync,
    disableAutoSync,
    getSyncSettings,
    handleWebhook
} = require('../controllers/googleCalendar.controller');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// OAUTH FLOW (Public callback, rest protected)
// ═══════════════════════════════════════════════════════════════

// OAuth authorization URL (protected)
router.get('/auth', userMiddleware, getAuthUrl);

// OAuth callback (public - Google redirects here)
router.get('/callback', handleCallback);

// Disconnect (protected)
router.post('/disconnect', userMiddleware, disconnect);

// Get connection status (protected)
router.get('/status', userMiddleware, getStatus);

// ═══════════════════════════════════════════════════════════════
// CALENDAR OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Get list of calendars
router.get('/calendars', userMiddleware, getCalendars);

// Get events from a specific calendar
router.get('/calendars/:calendarId/events', userMiddleware, getEvents);

// Create event in Google Calendar
router.post('/calendars/:calendarId/events', userMiddleware, createEvent);

// Update event in Google Calendar
router.put('/calendars/:calendarId/events/:eventId', userMiddleware, updateEvent);

// Delete event from Google Calendar
router.delete('/calendars/:calendarId/events/:eventId', userMiddleware, deleteEvent);

// ═══════════════════════════════════════════════════════════════
// CALENDAR SELECTION & SETTINGS
// ═══════════════════════════════════════════════════════════════

// Update selected calendars
router.put('/settings/calendars', userMiddleware, updateSelectedCalendars);

// Toggle showing external events in Traf3li calendar
router.put('/settings/show-external-events', userMiddleware, toggleShowExternalEvents);

// Set up push notifications for a calendar
router.post('/watch/:calendarId', userMiddleware, watchCalendar);

// Stop push notifications
router.delete('/watch/:channelId', userMiddleware, stopWatch);

// ═══════════════════════════════════════════════════════════════
// SYNC OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Sync from Google to TRAF3LI (import)
router.post('/sync/import', userMiddleware, syncFromGoogle);
router.post('/import', userMiddleware, syncFromGoogle); // Alias for spec compatibility

// Sync TRAF3LI event to Google (export)
router.post('/sync/export/:eventId', userMiddleware, syncToGoogle);
router.post('/export', userMiddleware, syncToGoogle); // Alias for spec compatibility (eventId in body)

// Enable auto-sync
router.post('/sync/auto/enable', userMiddleware, enableAutoSync);

// Disable auto-sync
router.post('/sync/auto/disable', userMiddleware, disableAutoSync);

// Get sync settings and stats
router.get('/sync/settings', userMiddleware, getSyncSettings);

// ═══════════════════════════════════════════════════════════════
// WEBHOOK (Public - Google posts here)
// ═══════════════════════════════════════════════════════════════

// Handle webhook notifications from Google
router.post('/webhook', handleWebhook);

module.exports = router;
