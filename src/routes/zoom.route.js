const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const {
    getAuthUrl,
    handleCallback,
    disconnect,
    getStatus,
    createMeeting,
    getMeeting,
    listMeetings,
    updateMeeting,
    deleteMeeting,
    getRecordings,
    updateSettings,
    testConnection,
    handleWebhook
} = require('../controllers/zoom.controller');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// OAUTH FLOW (Public callback, rest protected)
// ═══════════════════════════════════════════════════════════════

// OAuth authorization URL (protected)
router.get('/auth-url', userMiddleware, firmFilter, getAuthUrl);

// OAuth callback (public - Zoom redirects here)
router.get('/callback', handleCallback);

// Disconnect (protected)
router.post('/disconnect', userMiddleware, firmFilter, disconnect);

// Get connection status (protected)
router.get('/status', userMiddleware, firmFilter, getStatus);

// ═══════════════════════════════════════════════════════════════
// MEETING OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Create meeting
router.post('/meetings', userMiddleware, firmFilter, createMeeting);

// List meetings
router.get('/meetings', userMiddleware, firmFilter, listMeetings);

// Get meeting details
router.get('/meetings/:meetingId', userMiddleware, firmFilter, getMeeting);

// Update meeting
router.put('/meetings/:meetingId', userMiddleware, firmFilter, updateMeeting);

// Delete meeting
router.delete('/meetings/:meetingId', userMiddleware, firmFilter, deleteMeeting);

// ═══════════════════════════════════════════════════════════════
// RECORDINGS
// ═══════════════════════════════════════════════════════════════

// Get all recordings
router.get('/recordings', userMiddleware, firmFilter, getRecordings);

// Get recordings for specific meeting (optional route parameter)
router.get('/recordings/:meetingId', userMiddleware, firmFilter, getRecordings);

// ═══════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════

// Update default meeting settings
router.put('/settings', userMiddleware, firmFilter, updateSettings);

// Test connection
router.post('/test', userMiddleware, firmFilter, testConnection);

// ═══════════════════════════════════════════════════════════════
// WEBHOOK (Public - Zoom posts here)
// ═══════════════════════════════════════════════════════════════

// Handle webhook notifications from Zoom
router.post('/webhook', handleWebhook);

module.exports = router;
