const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    getAuthUrl,
    handleCallback,
    disconnect,
    getStatus,
    testConnection,
    sendMessage,
    listChannels,
    createChannel,
    updateSettings,
    getSettings,
    handleWebhook,
    getUserInfo
} = require('../controllers/slack.controller');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// OAUTH ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * Get OAuth authorization URL
 * GET /api/slack/auth-url
 *
 * Returns the Slack OAuth URL that users should visit to authorize
 * the integration.
 */
router.get('/auth-url', userMiddleware, getAuthUrl);

/**
 * OAuth callback handler
 * GET /api/slack/callback?code=...&state=...
 *
 * Handles the OAuth redirect from Slack after user authorizes.
 * Exchanges the authorization code for access tokens.
 * Redirects back to frontend with success/error status.
 */
router.get('/callback', handleCallback);

// ═══════════════════════════════════════════════════════════════
// CONNECTION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Get connection status
 * GET /api/slack/status
 *
 * Returns the current Slack integration status including:
 * - Connection state
 * - Workspace info
 * - Statistics
 * - Settings
 */
router.get('/status', userMiddleware, getStatus);

/**
 * Disconnect Slack integration
 * POST /api/slack/disconnect
 *
 * Revokes access tokens and disconnects the Slack integration.
 */
router.post('/disconnect', userMiddleware, disconnect);

/**
 * Test Slack connection
 * POST /api/slack/test
 *
 * Sends a test message to verify the integration is working.
 * Useful for troubleshooting connection issues.
 */
router.post('/test', userMiddleware, testConnection);

// ═══════════════════════════════════════════════════════════════
// MESSAGING
// ═══════════════════════════════════════════════════════════════

/**
 * Send message to Slack channel
 * POST /api/slack/message
 *
 * Body:
 * {
 *   "channelId": "C01234567",
 *   "text": "Message text",
 *   "blocks": [...],        // Optional: Slack Block Kit blocks
 *   "attachments": [...],   // Optional: Message attachments
 *   "threadTs": "1234.5678" // Optional: Reply in thread
 * }
 */
router.post('/message', userMiddleware, sendMessage);

// ═══════════════════════════════════════════════════════════════
// CHANNEL OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * List available Slack channels
 * GET /api/slack/channels
 *
 * Returns list of public and private channels that the bot has access to.
 */
router.get('/channels', userMiddleware, listChannels);

/**
 * Create new Slack channel
 * POST /api/slack/channels
 *
 * Body:
 * {
 *   "name": "channel-name",     // Required: lowercase, hyphens/underscores allowed
 *   "isPrivate": false          // Optional: default false
 * }
 */
router.post('/channels', userMiddleware, createChannel);

// ═══════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * Get integration settings
 * GET /api/slack/settings
 *
 * Returns current notification preferences and sync settings.
 */
router.get('/settings', userMiddleware, getSettings);

/**
 * Update integration settings
 * PUT /api/slack/settings
 *
 * Body:
 * {
 *   "notifications": {
 *     "caseUpdates": true,
 *     "invoiceReminders": true,
 *     "taskAssignments": true,
 *     "hearingReminders": true,
 *     "paymentReceived": true,
 *     "documentUploaded": false,
 *     "clientMessages": true
 *   },
 *   "defaultChannelId": "C01234567",
 *   "defaultChannelName": "general",
 *   "mentionOnUrgent": true,
 *   "useThreads": false
 * }
 */
router.put('/settings', userMiddleware, updateSettings);

// ═══════════════════════════════════════════════════════════════
// WEBHOOK ENDPOINT
// ═══════════════════════════════════════════════════════════════

/**
 * Incoming webhook handler
 * POST /api/slack/webhook
 *
 * Receives events from Slack (messages, mentions, etc.)
 * This endpoint is called by Slack, not by the frontend.
 *
 * Note: No authentication middleware - Slack signature verification
 * is handled in the controller.
 */
router.post('/webhook', handleWebhook);

// ═══════════════════════════════════════════════════════════════
// USER INFO
// ═══════════════════════════════════════════════════════════════

/**
 * Get Slack user information
 * GET /api/slack/users/:slackUserId
 *
 * Retrieves user profile from Slack workspace.
 */
router.get('/users/:slackUserId', userMiddleware, getUserInfo);

module.exports = router;
