/**
 * Telegram Bot Integration Routes
 *
 * API routes for managing Telegram bot integration, webhooks, and notifications.
 * Allows firms to connect their Telegram bot and receive real-time notifications.
 *
 * Base route: /api/telegram
 */

const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const {
    connect,
    disconnect,
    getStatus,
    sendMessage,
    listChats,
    updateSettings,
    handleWebhook,
    testConnection,
    sendPhoto,
    sendDocument
} = require('../controllers/telegram.controller');

const router = express.Router();

// ============ WEBHOOK ENDPOINT (PUBLIC - NO AUTH) ============
// Must come before userMiddleware to allow Telegram to post updates
// POST /api/telegram/webhook/:firmId
router.post('/webhook/:firmId', handleWebhook);

// ============ APPLY MIDDLEWARE ============
// All other routes require authentication and firm filtering
router.use(userMiddleware);
router.use(firmFilter);

// ============ BOT MANAGEMENT ============

// Connect bot with token
// POST /api/telegram/connect
router.post('/connect', connect);

// Disconnect bot
// POST /api/telegram/disconnect
router.post('/disconnect', disconnect);

// Get bot status and configuration
// GET /api/telegram/status
router.get('/status', getStatus);

// Test connection by sending test message
// POST /api/telegram/test
router.post('/test', testConnection);

// ============ SETTINGS MANAGEMENT ============

// Update notification settings
// PUT /api/telegram/settings
router.put('/settings', updateSettings);

// Also support PATCH for partial updates
router.patch('/settings', updateSettings);

// ============ CHAT MANAGEMENT ============

// List known chat IDs
// GET /api/telegram/chats
router.get('/chats', listChats);

// ============ MESSAGE SENDING ============

// Send text message
// POST /api/telegram/message
router.post('/message', sendMessage);

// Send photo
// POST /api/telegram/photo
router.post('/photo', sendPhoto);

// Send document
// POST /api/telegram/document
router.post('/document', sendDocument);

module.exports = router;
