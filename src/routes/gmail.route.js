const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    getAuthUrl,
    handleCallback,
    disconnect,
    getStatus,
    listMessages,
    getMessage,
    sendEmail,
    replyToEmail,
    searchMessages,
    getThread,
    createDraft,
    listDrafts,
    listLabels,
    createLabel,
    updateSettings,
    setupWatch,
    stopWatch,
    handleWebhook
} = require('../controllers/gmail.controller');

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
// MESSAGE OPERATIONS
// ═══════════════════════════════════════════════════════════════

// List messages
router.get('/messages', userMiddleware, listMessages);

// Get specific message
router.get('/messages/:messageId', userMiddleware, getMessage);

// Send email
router.post('/messages/send', userMiddleware, sendEmail);

// Reply to email
router.post('/messages/:messageId/reply', userMiddleware, replyToEmail);

// Search messages
router.get('/messages/search', userMiddleware, searchMessages);

// Get email thread
router.get('/threads/:threadId', userMiddleware, getThread);

// ═══════════════════════════════════════════════════════════════
// DRAFT OPERATIONS
// ═══════════════════════════════════════════════════════════════

// List drafts
router.get('/drafts', userMiddleware, listDrafts);

// Create draft
router.post('/drafts', userMiddleware, createDraft);

// ═══════════════════════════════════════════════════════════════
// LABEL OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Get labels
router.get('/labels', userMiddleware, listLabels);

// Create label
router.post('/labels', userMiddleware, createLabel);

// ═══════════════════════════════════════════════════════════════
// SETTINGS & WATCH
// ═══════════════════════════════════════════════════════════════

// Update sync settings
router.put('/settings', userMiddleware, updateSettings);

// Set up push notifications
router.post('/watch', userMiddleware, setupWatch);

// Stop push notifications
router.delete('/watch', userMiddleware, stopWatch);

// ═══════════════════════════════════════════════════════════════
// WEBHOOK (Public - Google Pub/Sub posts here)
// ═══════════════════════════════════════════════════════════════

// Handle webhook notifications from Gmail via Pub/Sub
router.post('/webhook', handleWebhook);

module.exports = router;
