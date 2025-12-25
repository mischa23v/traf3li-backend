const slackService = require('../services/slack.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/contextLogger');

// ═══════════════════════════════════════════════════════════════
// OAUTH ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get Slack OAuth authorization URL
 * GET /api/slack/auth-url
 */
const getAuthUrl = asyncHandler(async (req, res) => {
    const userId = sanitizeObjectId(req.userID);
    const firmId = sanitizeObjectId(req.firmId);

    if (!userId || !firmId) {
        throw CustomException('Unauthorized', 401);
    }

    const authUrl = await slackService.getAuthUrl(userId, firmId);

    res.status(200).json({
        success: true,
        data: {
            authUrl
        }
    });
});

/**
 * Handle Slack OAuth callback
 * GET /api/slack/callback?code=...&state=...
 */
const handleCallback = asyncHandler(async (req, res) => {
    const { code, state, error } = req.query;

    // Handle OAuth errors
    if (error) {
        logger.error('Slack OAuth error', { error });
        return res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?slack_error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
        throw CustomException('Missing code or state parameter', 400);
    }

    try {
        const result = await slackService.exchangeCode(code, state);

        logger.info('Slack OAuth callback successful', {
            teamName: result.integration.teamName
        });

        // Redirect to frontend with success
        res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?slack_connected=true&team=${encodeURIComponent(result.integration.teamName)}`);
    } catch (error) {
        logger.error('Slack OAuth callback failed', { error: error.message });

        // Redirect to frontend with error
        res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?slack_error=${encodeURIComponent(error.message)}`);
    }
});

// ═══════════════════════════════════════════════════════════════
// CONNECTION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Disconnect Slack integration
 * POST /api/slack/disconnect
 */
const disconnect = asyncHandler(async (req, res) => {
    const userId = sanitizeObjectId(req.userID);
    const firmId = sanitizeObjectId(req.firmId);

    if (!userId || !firmId) {
        throw CustomException('Unauthorized', 401);
    }

    const result = await slackService.disconnect(firmId, userId);

    res.status(200).json({
        success: true,
        message: 'Slack integration disconnected successfully'
    });
});

/**
 * Get Slack connection status
 * GET /api/slack/status
 */
const getStatus = asyncHandler(async (req, res) => {
    const firmId = sanitizeObjectId(req.firmId);

    if (!firmId) {
        throw CustomException('Unauthorized', 401);
    }

    const status = await slackService.getStatus(firmId);

    res.status(200).json({
        success: true,
        data: status
    });
});

/**
 * Test Slack connection
 * POST /api/slack/test
 */
const testConnection = asyncHandler(async (req, res) => {
    const firmId = sanitizeObjectId(req.firmId);

    if (!firmId) {
        throw CustomException('Unauthorized', 401);
    }

    const result = await slackService.testConnection(firmId);

    res.status(200).json({
        success: true,
        message: result.message,
        data: {
            teamName: result.teamName,
            user: result.user
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// MESSAGING
// ═══════════════════════════════════════════════════════════════

/**
 * Send message to Slack channel
 * POST /api/slack/message
 * Body: { channelId, text, blocks?, attachments? }
 */
const sendMessage = asyncHandler(async (req, res) => {
    const firmId = sanitizeObjectId(req.firmId);
    const { channelId, text, blocks, attachments, threadTs } = req.body;

    if (!firmId) {
        throw CustomException('Unauthorized', 401);
    }

    if (!channelId || !text) {
        throw CustomException('channelId and text are required', 400);
    }

    // Validate channelId format (Slack channel IDs start with C, G, or D)
    if (!/^[CGD][A-Z0-9]{8,}$/.test(channelId)) {
        throw CustomException('Invalid Slack channel ID format', 400);
    }

    // Limit text length
    if (text.length > 4000) {
        throw CustomException('Message text too long (max 4000 characters)', 400);
    }

    const options = {};
    if (blocks) options.blocks = blocks;
    if (attachments) options.attachments = attachments;
    if (threadTs) options.thread_ts = threadTs;

    const result = await slackService.sendMessage(firmId, channelId, text, options);

    res.status(200).json({
        success: true,
        message: 'Message sent successfully',
        data: {
            messageId: result.messageId,
            channel: result.channel
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// CHANNEL OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * List Slack channels
 * GET /api/slack/channels
 */
const listChannels = asyncHandler(async (req, res) => {
    const firmId = sanitizeObjectId(req.firmId);

    if (!firmId) {
        throw CustomException('Unauthorized', 401);
    }

    const channels = await slackService.listChannels(firmId);

    res.status(200).json({
        success: true,
        data: channels
    });
});

/**
 * Create Slack channel
 * POST /api/slack/channels
 * Body: { name, isPrivate? }
 */
const createChannel = asyncHandler(async (req, res) => {
    const firmId = sanitizeObjectId(req.firmId);
    const { name, isPrivate } = req.body;

    if (!firmId) {
        throw CustomException('Unauthorized', 401);
    }

    if (!name) {
        throw CustomException('Channel name is required', 400);
    }

    // Validate channel name format (lowercase, no spaces, max 80 chars)
    if (!/^[a-z0-9_-]{1,80}$/.test(name)) {
        throw CustomException(
            'Invalid channel name. Use only lowercase letters, numbers, hyphens, and underscores (max 80 characters)',
            400
        );
    }

    const channel = await slackService.createChannel(firmId, name, isPrivate || false);

    res.status(201).json({
        success: true,
        message: 'Channel created successfully',
        data: channel
    });
});

// ═══════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * Update Slack integration settings
 * PUT /api/slack/settings
 * Body: { notifications?, defaultChannelId?, mentionOnUrgent?, useThreads? }
 */
const updateSettings = asyncHandler(async (req, res) => {
    const firmId = sanitizeObjectId(req.firmId);
    const { notifications, defaultChannelId, defaultChannelName, mentionOnUrgent, useThreads } = req.body;

    if (!firmId) {
        throw CustomException('Unauthorized', 401);
    }

    const settings = {};

    if (notifications) {
        // Validate notification preferences
        const validNotificationTypes = [
            'caseUpdates',
            'invoiceReminders',
            'taskAssignments',
            'hearingReminders',
            'paymentReceived',
            'documentUploaded',
            'clientMessages'
        ];

        const invalidKeys = Object.keys(notifications).filter(
            key => !validNotificationTypes.includes(key)
        );

        if (invalidKeys.length > 0) {
            throw CustomException(
                `Invalid notification types: ${invalidKeys.join(', ')}`,
                400
            );
        }

        settings.notifications = notifications;
    }

    if (defaultChannelId) {
        // Validate channel ID format
        if (!/^[CGD][A-Z0-9]{8,}$/.test(defaultChannelId)) {
            throw CustomException('Invalid Slack channel ID format', 400);
        }

        settings.defaultChannelId = defaultChannelId;
        settings.defaultChannelName = defaultChannelName;
    }

    if (mentionOnUrgent !== undefined) {
        settings.mentionOnUrgent = Boolean(mentionOnUrgent);
    }

    if (useThreads !== undefined) {
        settings.useThreads = Boolean(useThreads);
    }

    const result = await slackService.updateSettings(firmId, settings);

    res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        data: result.settings
    });
});

/**
 * Get Slack integration settings
 * GET /api/slack/settings
 */
const getSettings = asyncHandler(async (req, res) => {
    const firmId = sanitizeObjectId(req.firmId);

    if (!firmId) {
        throw CustomException('Unauthorized', 401);
    }

    const status = await slackService.getStatus(firmId);

    if (!status.connected) {
        throw CustomException('Slack not connected', 404);
    }

    res.status(200).json({
        success: true,
        data: status.settings
    });
});

// ═══════════════════════════════════════════════════════════════
// WEBHOOK HANDLER
// ═══════════════════════════════════════════════════════════════

/**
 * Handle incoming webhooks from Slack
 * POST /api/slack/webhook
 */
const handleWebhook = asyncHandler(async (req, res) => {
    const payload = req.body;
    const headers = req.headers;

    // Handle URL verification challenge
    if (payload.type === 'url_verification') {
        return res.status(200).json({
            challenge: payload.challenge
        });
    }

    // Process webhook asynchronously
    slackService.handleIncomingWebhook(payload, headers)
        .then(() => {
            logger.info('Slack webhook processed successfully');
        })
        .catch(error => {
            logger.error('Failed to process Slack webhook', { error: error.message });
        });

    // Respond immediately to Slack (required within 3 seconds)
    res.status(200).json({ success: true });
});

// ═══════════════════════════════════════════════════════════════
// USER INFO
// ═══════════════════════════════════════════════════════════════

/**
 * Get Slack user info
 * GET /api/slack/users/:slackUserId
 */
const getUserInfo = asyncHandler(async (req, res) => {
    const firmId = sanitizeObjectId(req.firmId);
    const { slackUserId } = req.params;

    if (!firmId) {
        throw CustomException('Unauthorized', 401);
    }

    if (!slackUserId) {
        throw CustomException('Slack user ID is required', 400);
    }

    // Validate Slack user ID format (starts with U or W)
    if (!/^[UW][A-Z0-9]{8,}$/.test(slackUserId)) {
        throw CustomException('Invalid Slack user ID format', 400);
    }

    const userInfo = await slackService.getUserInfo(firmId, slackUserId);

    res.status(200).json({
        success: true,
        data: userInfo
    });
});

module.exports = {
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
};
