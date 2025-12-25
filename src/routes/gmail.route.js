const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
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
router.get('/auth', userMiddleware, firmFilter, getAuthUrl);

// OAuth callback (public - Google redirects here)
router.get('/callback', handleCallback);

// Disconnect (protected)
router.post('/disconnect', userMiddleware, firmFilter, disconnect);

// Get connection status (protected)
router.get('/status', userMiddleware, firmFilter, getStatus);

// ═══════════════════════════════════════════════════════════════
// MESSAGE OPERATIONS
// ═══════════════════════════════════════════════════════════════

// List messages
router.get('/messages', userMiddleware, firmFilter, listMessages);

// Get specific message
router.get('/messages/:messageId', userMiddleware, firmFilter, getMessage);

// Send email
router.post('/messages/send', userMiddleware, firmFilter, sendEmail);

// Reply to email
router.post('/messages/:messageId/reply', userMiddleware, firmFilter, replyToEmail);

// Search messages
router.get('/messages/search', userMiddleware, firmFilter, searchMessages);

// Get email thread
router.get('/threads/:threadId', userMiddleware, firmFilter, getThread);

// ═══════════════════════════════════════════════════════════════
// DRAFT OPERATIONS
// ═══════════════════════════════════════════════════════════════

// List drafts
router.get('/drafts', userMiddleware, firmFilter, listDrafts);

// Create draft
router.post('/drafts', userMiddleware, firmFilter, createDraft);

// ═══════════════════════════════════════════════════════════════
// LABEL OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Get labels
router.get('/labels', userMiddleware, firmFilter, listLabels);

// Create label
router.post('/labels', userMiddleware, firmFilter, createLabel);

// ═══════════════════════════════════════════════════════════════
// SETTINGS & WATCH
// ═══════════════════════════════════════════════════════════════

// Update sync settings
router.put('/settings', userMiddleware, firmFilter, updateSettings);

// Set up push notifications
router.post('/watch', userMiddleware, firmFilter, setupWatch);

// Stop push notifications
router.delete('/watch', userMiddleware, firmFilter, stopWatch);

// ═══════════════════════════════════════════════════════════════
// WEBHOOK (Public - Google Pub/Sub posts here)
// ═══════════════════════════════════════════════════════════════

// Handle webhook notifications from Gmail via Pub/Sub
router.post('/webhook', handleWebhook);

module.exports = router;
