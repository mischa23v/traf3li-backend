const express = require('express');
const {
    getAuthUrl,
    handleCallback,
    completeSetup,
    getStatus,
    disconnect,
    testConnection,
    listGuilds,
    listChannels,
    updateSettings,
    sendMessage,
    handleWebhook
} = require('../controllers/discord.controller');
const { authenticate } = require('../middlewares');
const { authRateLimiter, publicRateLimiter } = require('../middlewares/rateLimiter.middleware');

const router = express.Router();

/**
 * @openapi
 * /api/integrations/discord/auth-url:
 *   get:
 *     summary: Get Discord OAuth authorization URL
 *     description: Generates the OAuth URL to connect Discord to the firm account
 *     tags:
 *       - Discord Integration
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authorization URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 authUrl:
 *                   type: string
 *                   example: https://discord.com/api/oauth2/authorize?client_id=...
 *       400:
 *         description: User not associated with a firm
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get('/auth-url', authenticate, authRateLimiter, getAuthUrl);

/**
 * @openapi
 * /api/integrations/discord/callback:
 *   get:
 *     summary: Discord OAuth callback
 *     description: Handles the OAuth callback from Discord after user authorization
 *     tags:
 *       - Discord Integration
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Authorization code from Discord
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *         description: State token for CSRF protection
 *       - in: query
 *         name: guild_id
 *         schema:
 *           type: string
 *         description: Optional guild ID if pre-selected
 *     responses:
 *       302:
 *         description: Redirects to frontend with status
 *       400:
 *         description: Invalid callback parameters
 */
router.get('/callback', handleCallback);

/**
 * @openapi
 * /api/integrations/discord/complete-setup:
 *   post:
 *     summary: Complete Discord integration setup
 *     description: Finalizes the Discord integration by selecting guild and channel
 *     tags:
 *       - Discord Integration
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - guildId
 *               - channelId
 *             properties:
 *               guildId:
 *                 type: string
 *                 description: Discord server/guild ID
 *               channelId:
 *                 type: string
 *                 description: Discord channel ID for notifications
 *               webhookName:
 *                 type: string
 *                 description: Custom name for the webhook
 *                 default: Traf3li Notifications
 *     responses:
 *       200:
 *         description: Integration setup completed successfully
 *       400:
 *         description: Invalid request or OAuth not completed
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Guild or channel not found
 */
router.post('/complete-setup', authenticate, authRateLimiter, completeSetup);

/**
 * @openapi
 * /api/integrations/discord/status:
 *   get:
 *     summary: Get Discord integration status
 *     description: Returns the current status of Discord integration for the firm
 *     tags:
 *       - Discord Integration
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 connected:
 *                   type: boolean
 *                   example: true
 *                 integration:
 *                   type: object
 *                   properties:
 *                     guildName:
 *                       type: string
 *                     webhookChannelName:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 *                     connectedAt:
 *                       type: string
 *                       format: date-time
 *                     stats:
 *                       type: object
 *       401:
 *         description: Authentication required
 */
router.get('/status', authenticate, publicRateLimiter, getStatus);

/**
 * @openapi
 * /api/integrations/discord/disconnect:
 *   post:
 *     summary: Disconnect Discord integration
 *     description: Deactivates the Discord integration for the firm
 *     tags:
 *       - Discord Integration
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Integration disconnected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Integration not found
 */
router.post('/disconnect', authenticate, authRateLimiter, disconnect);

/**
 * @openapi
 * /api/integrations/discord/test:
 *   post:
 *     summary: Test Discord connection
 *     description: Sends a test notification to verify the Discord integration
 *     tags:
 *       - Discord Integration
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *       400:
 *         description: Test failed
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Integration not found
 */
router.post('/test', authenticate, authRateLimiter, testConnection);

/**
 * @openapi
 * /api/integrations/discord/guilds:
 *   get:
 *     summary: List user's Discord servers
 *     description: Returns all Discord servers/guilds accessible to the connected account
 *     tags:
 *       - Discord Integration
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Guilds retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 guilds:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       icon:
 *                         type: string
 *                       owner:
 *                         type: boolean
 *                       permissions:
 *                         type: string
 *       400:
 *         description: Discord not connected
 *       401:
 *         description: Authentication required
 */
router.get('/guilds', authenticate, publicRateLimiter, listGuilds);

/**
 * @openapi
 * /api/integrations/discord/guilds/{guildId}/channels:
 *   get:
 *     summary: List channels in a Discord server
 *     description: Returns all text channels in the specified Discord server
 *     tags:
 *       - Discord Integration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: guildId
 *         required: true
 *         schema:
 *           type: string
 *         description: Discord server/guild ID
 *     responses:
 *       200:
 *         description: Channels retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 channels:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       type:
 *                         type: number
 *                       position:
 *                         type: number
 *       400:
 *         description: Invalid guild ID or Discord not connected
 *       401:
 *         description: Authentication required
 */
router.get('/guilds/:guildId/channels', authenticate, publicRateLimiter, listChannels);

/**
 * @openapi
 * /api/integrations/discord/settings:
 *   put:
 *     summary: Update Discord notification settings
 *     description: Updates the notification preferences for Discord integration
 *     tags:
 *       - Discord Integration
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               events:
 *                 type: object
 *                 properties:
 *                   caseCreated:
 *                     type: boolean
 *                   caseUpdated:
 *                     type: boolean
 *                   caseStatusChanged:
 *                     type: boolean
 *                   caseAssigned:
 *                     type: boolean
 *                   deadlineApproaching:
 *                     type: boolean
 *                   taskCreated:
 *                     type: boolean
 *                   taskCompleted:
 *                     type: boolean
 *                   documentUploaded:
 *                     type: boolean
 *                   paymentReceived:
 *                     type: boolean
 *                   appointmentScheduled:
 *                     type: boolean
 *               mentionRole:
 *                 type: string
 *                 description: Discord role ID to mention in notifications
 *               embedColor:
 *                 type: string
 *                 description: Hex color for notification embeds
 *                 example: "#5865F2"
 *               includeDetails:
 *                 type: boolean
 *               maxNotificationsPerHour:
 *                 type: number
 *               digestMode:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                   interval:
 *                     type: number
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       400:
 *         description: Invalid settings
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Integration not found
 */
router.put('/settings', authenticate, authRateLimiter, updateSettings);

/**
 * @openapi
 * /api/integrations/discord/message:
 *   post:
 *     summary: Send custom message to Discord
 *     description: Sends a custom message or embed to the configured Discord channel
 *     tags:
 *       - Discord Integration
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Plain text message (required if embed not provided)
 *               embed:
 *                 type: object
 *                 description: Discord embed object (required if content not provided)
 *                 properties:
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   color:
 *                     type: number
 *                   fields:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         value:
 *                           type: string
 *                         inline:
 *                           type: boolean
 *               username:
 *                 type: string
 *                 description: Custom username for the message
 *               avatarUrl:
 *                 type: string
 *                 description: Custom avatar URL for the message
 *     responses:
 *       200:
 *         description: Message sent successfully
 *       400:
 *         description: Invalid request or integration not active
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Integration not found
 */
router.post('/message', authenticate, authRateLimiter, sendMessage);

/**
 * @openapi
 * /api/integrations/discord/webhook:
 *   post:
 *     summary: Incoming Discord webhook
 *     description: Handles incoming webhook events from Discord (for interactive features)
 *     tags:
 *       - Discord Integration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       500:
 *         description: Failed to process webhook
 */
router.post('/webhook', publicRateLimiter, handleWebhook);

module.exports = router;
