const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
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
router.get('/auth', userMiddleware, firmFilter, getAuthUrl);

// OAuth callback (public - Google redirects here)
router.get('/callback', handleCallback);

// Disconnect (protected)
router.post('/disconnect', userMiddleware, firmFilter, disconnect);

// Get connection status (protected)
router.get('/status', userMiddleware, firmFilter, getStatus);

// ═══════════════════════════════════════════════════════════════
// CALENDAR OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Get list of calendars
router.get('/calendars', userMiddleware, firmFilter, getCalendars);

// Get events from a specific calendar
router.get('/calendars/:calendarId/events', userMiddleware, firmFilter, getEvents);

// Create event in Google Calendar
router.post('/calendars/:calendarId/events', userMiddleware, firmFilter, createEvent);

// Update event in Google Calendar
router.put('/calendars/:calendarId/events/:eventId', userMiddleware, firmFilter, updateEvent);

// Delete event from Google Calendar
router.delete('/calendars/:calendarId/events/:eventId', userMiddleware, firmFilter, deleteEvent);

// ═══════════════════════════════════════════════════════════════
// CALENDAR SELECTION & SETTINGS
// ═══════════════════════════════════════════════════════════════

// Update selected calendars
router.put('/settings/calendars', userMiddleware, firmFilter, updateSelectedCalendars);

// Set up push notifications for a calendar
router.post('/watch/:calendarId', userMiddleware, firmFilter, watchCalendar);

// Stop push notifications
router.delete('/watch/:channelId', userMiddleware, firmFilter, stopWatch);

// ═══════════════════════════════════════════════════════════════
// SYNC OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Sync from Google to TRAF3LI (import)
router.post('/sync/import', userMiddleware, firmFilter, syncFromGoogle);

// Sync TRAF3LI event to Google (export)
router.post('/sync/export/:eventId', userMiddleware, firmFilter, syncToGoogle);

// Enable auto-sync
router.post('/sync/auto/enable', userMiddleware, firmFilter, enableAutoSync);

// Disable auto-sync
router.post('/sync/auto/disable', userMiddleware, firmFilter, disableAutoSync);

// Get sync settings and stats
router.get('/sync/settings', userMiddleware, firmFilter, getSyncSettings);

// ═══════════════════════════════════════════════════════════════
// WEBHOOK (Public - Google posts here)
// ═══════════════════════════════════════════════════════════════

// Handle webhook notifications from Google
router.post('/webhook', handleWebhook);

module.exports = router;
