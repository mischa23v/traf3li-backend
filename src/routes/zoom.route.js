const express = require('express');
const { userMiddleware } = require('../middlewares');
const { createWebhookAuth } = require('../middlewares/webhookAuth.middleware');
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
// ZOOM WEBHOOK SIGNATURE VALIDATION MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
// Special middleware for Zoom webhooks that:
// 1. Skips validation for endpoint.url_validation events (Zoom's initial setup)
// 2. Validates HMAC-SHA256 signature for all other webhook events
const zoomWebhookAuth = (req, res, next) => {
    // Zoom sends an initial validation request without a signature
    // Check if this is a validation event and skip signature verification
    if (req.body && req.body.event === 'endpoint.url_validation') {
        return next();
    }

    // For all other events, validate the webhook signature
    const webhookValidator = createWebhookAuth('zoom');
    return webhookValidator(req, res, next);
};

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

/**
 * @route   POST /api/zoom/webhook
 * @desc    Handle webhook notifications from Zoom
 * @access  Public (Webhook endpoint - validates HMAC-SHA256 signature)
 * @security Zoom webhook signature verified via x-zm-signature header
 *
 * SECURITY: This endpoint validates Zoom webhook signatures using HMAC-SHA256
 * - Raw body is preserved by express.json() verify function (server.js)
 * - zoomWebhookAuth: Validates x-zm-signature header using ZOOM_WEBHOOK_SECRET
 * - Skips validation for endpoint.url_validation events (Zoom's initial setup)
 *
 * Required Environment Variables:
 * - ZOOM_WEBHOOK_SECRET: Secret token from Zoom App settings
 */
router.post('/webhook', zoomWebhookAuth, handleWebhook);

module.exports = router;
