const express = require('express');
const { userMiddleware } = require('../middlewares');
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
router.get('/auth-url', userMiddleware, getAuthUrl);

// OAuth callback (public - Zoom redirects here)
router.get('/callback', handleCallback);

// Disconnect (protected)
router.post('/disconnect', userMiddleware, disconnect);

// Get connection status (protected)
router.get('/status', userMiddleware, getStatus);

// ═══════════════════════════════════════════════════════════════
// MEETING OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Create meeting
router.post('/meetings', userMiddleware, createMeeting);

// List meetings
router.get('/meetings', userMiddleware, listMeetings);

// Get meeting details
router.get('/meetings/:meetingId', userMiddleware, getMeeting);

// Update meeting
router.put('/meetings/:meetingId', userMiddleware, updateMeeting);

// Delete meeting
router.delete('/meetings/:meetingId', userMiddleware, deleteMeeting);

// ═══════════════════════════════════════════════════════════════
// RECORDINGS
// ═══════════════════════════════════════════════════════════════

// Get all recordings
router.get('/recordings', userMiddleware, getRecordings);

// Get recordings for specific meeting (optional route parameter)
router.get('/recordings/:meetingId', userMiddleware, getRecordings);

// ═══════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════

// Update default meeting settings
router.put('/settings', userMiddleware, updateSettings);

// Test connection
router.post('/test', userMiddleware, testConnection);

// ═══════════════════════════════════════════════════════════════
// WEBHOOK (Public - Zoom posts here)
// ═══════════════════════════════════════════════════════════════

// Handle webhook notifications from Zoom
router.post('/webhook', handleWebhook);

module.exports = router;
