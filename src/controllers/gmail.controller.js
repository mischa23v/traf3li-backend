const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const gmailService = require('../services/gmail.service');
const GmailIntegration = require('../models/gmailIntegration.model');
const { pickAllowedFields } = require('../utils/securityUtils');

/**
 * Gmail Controller
 *
 * Handles all Gmail integration endpoints
 */

// ═══════════════════════════════════════════════════════════════
// OAUTH FLOW
// ═══════════════════════════════════════════════════════════════

/**
 * Get OAuth authorization URL
 * GET /api/gmail/auth
 */
const getAuthUrl = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const authUrl = await gmailService.getAuthUrl(userId, firmId);

    res.status(200).json({
        success: true,
        authUrl
    });
});

/**
 * Handle OAuth callback
 * GET /api/gmail/callback
 */
const handleCallback = asyncHandler(async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
        // User denied access or error occurred
        return res.redirect(`${process.env.FRONTEND_URL || process.env.DASHBOARD_URL}/settings/integrations?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
        throw CustomException('Invalid callback parameters', 400);
    }

    const result = await gmailService.handleCallback(code, state);

    // Redirect to success page
    res.redirect(`${process.env.FRONTEND_URL || process.env.DASHBOARD_URL}/settings/integrations?gmail=connected`);
});

/**
 * Disconnect Gmail
 * POST /api/gmail/disconnect
 */
const disconnect = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const result = await gmailService.disconnect(userId, firmId);

    res.status(200).json({
        success: true,
        message: 'Gmail disconnected successfully'
    });
});

/**
 * Get integration status
 * GET /api/gmail/status
 */
const getStatus = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const integration = await GmailIntegration.findOne({ userId, firmId });

    if (!integration) {
        return res.status(200).json({
            success: true,
            connected: false
        });
    }

    res.status(200).json({
        success: true,
        connected: integration.isActive,
        data: {
            isActive: integration.isActive,
            email: integration.email,
            connectedAt: integration.connectedAt,
            lastSyncAt: integration.lastSyncAt,
            syncSettings: integration.syncSettings,
            syncStats: integration.syncStats,
            watchExpiration: integration.watchExpiration
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// MESSAGE OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * List messages
 * GET /api/gmail/messages
 */
const listMessages = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const options = {
        maxResults: parseInt(req.query.maxResults) || 50,
        pageToken: req.query.pageToken,
        q: req.query.q || '',
        labelIds: req.query.labelIds ? req.query.labelIds.split(',') : []
    };

    const result = await gmailService.listMessages(userId, options, firmId);

    res.status(200).json({
        success: true,
        data: result
    });
});

/**
 * Get message details
 * GET /api/gmail/messages/:messageId
 */
const getMessage = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { messageId } = req.params;

    const message = await gmailService.getMessage(userId, messageId, firmId);

    res.status(200).json({
        success: true,
        data: message
    });
});

/**
 * Send email
 * POST /api/gmail/messages/send
 */
const sendEmail = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const allowedFields = ['to', 'cc', 'bcc', 'subject', 'body'];
    const emailData = pickAllowedFields(req.body, allowedFields);

    if (!emailData.to || !emailData.subject || !emailData.body) {
        throw CustomException('To, subject, and body are required', 400);
    }

    const result = await gmailService.sendEmail(userId, emailData, firmId);

    res.status(200).json({
        success: true,
        message: 'Email sent successfully',
        data: result
    });
});

/**
 * Reply to email
 * POST /api/gmail/messages/:messageId/reply
 */
const replyToEmail = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { messageId } = req.params;

    const allowedFields = ['to', 'cc', 'bcc', 'subject', 'body'];
    const replyData = pickAllowedFields(req.body, allowedFields);

    if (!replyData.body) {
        throw CustomException('Reply body is required', 400);
    }

    const result = await gmailService.replyToEmail(userId, messageId, replyData, firmId);

    res.status(200).json({
        success: true,
        message: 'Reply sent successfully',
        data: result
    });
});

/**
 * Search messages
 * GET /api/gmail/messages/search
 */
const searchMessages = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { q } = req.query;

    if (!q) {
        throw CustomException('Search query (q) is required', 400);
    }

    const options = {
        maxResults: parseInt(req.query.maxResults) || 50,
        pageToken: req.query.pageToken
    };

    const result = await gmailService.searchMessages(userId, q, options, firmId);

    res.status(200).json({
        success: true,
        data: result
    });
});

/**
 * Get email thread
 * GET /api/gmail/threads/:threadId
 */
const getThread = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { threadId } = req.params;

    const thread = await gmailService.getThread(userId, threadId, firmId);

    res.status(200).json({
        success: true,
        data: thread
    });
});

// ═══════════════════════════════════════════════════════════════
// DRAFT OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create draft
 * POST /api/gmail/drafts
 */
const createDraft = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const allowedFields = ['to', 'cc', 'bcc', 'subject', 'body'];
    const emailData = pickAllowedFields(req.body, allowedFields);

    if (!emailData.to || !emailData.subject || !emailData.body) {
        throw CustomException('To, subject, and body are required', 400);
    }

    const result = await gmailService.createDraft(userId, emailData, firmId);

    res.status(201).json({
        success: true,
        message: 'Draft created successfully',
        data: result
    });
});

/**
 * List drafts
 * GET /api/gmail/drafts
 */
const listDrafts = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const drafts = await gmailService.listDrafts(userId, firmId);

    res.status(200).json({
        success: true,
        data: drafts,
        count: drafts.length
    });
});

// ═══════════════════════════════════════════════════════════════
// LABEL OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get labels
 * GET /api/gmail/labels
 */
const listLabels = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const labels = await gmailService.getLabels(userId, firmId);

    res.status(200).json({
        success: true,
        data: labels,
        count: labels.length
    });
});

/**
 * Create label
 * POST /api/gmail/labels
 */
const createLabel = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const allowedFields = ['name', 'labelListVisibility', 'messageListVisibility'];
    const labelData = pickAllowedFields(req.body, allowedFields);

    if (!labelData.name) {
        throw CustomException('Label name is required', 400);
    }

    const result = await gmailService.createLabel(userId, labelData, firmId);

    res.status(201).json({
        success: true,
        message: 'Label created successfully',
        data: result
    });
});

// ═══════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * Update sync settings
 * PUT /api/gmail/settings
 */
const updateSettings = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const allowedFields = [
        'labelsToSync',
        'skipLabels',
        'autoLinkToClients',
        'autoLinkToCases',
        'syncAttachments',
        'maxAttachmentSize',
        'syncSent',
        'syncReceived',
        'autoArchive'
    ];

    const settings = pickAllowedFields(req.body, allowedFields);

    const result = await gmailService.updateSettings(userId, settings, firmId);

    res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        data: result
    });
});

/**
 * Set up push notifications
 * POST /api/gmail/watch
 */
const setupWatch = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const result = await gmailService.setupWatch(userId, firmId);

    res.status(200).json({
        success: true,
        message: 'Gmail watch set up successfully',
        data: result
    });
});

/**
 * Stop push notifications
 * DELETE /api/gmail/watch
 */
const stopWatch = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    await gmailService.stopWatch(userId, firmId);

    res.status(200).json({
        success: true,
        message: 'Gmail watch stopped successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// WEBHOOK
// ═══════════════════════════════════════════════════════════════

/**
 * Handle webhook from Gmail (Pub/Sub push notifications)
 * POST /api/gmail/webhook
 */
const handleWebhook = asyncHandler(async (req, res) => {
    const notification = req.body;

    // Verify this is a valid Gmail Pub/Sub notification
    if (!notification || !notification.message) {
        throw CustomException('Invalid webhook request', 400);
    }

    await gmailService.handleWebhook(notification);

    // Pub/Sub expects 200 OK response
    res.status(200).send('OK');
});

module.exports = {
    // OAuth
    getAuthUrl,
    handleCallback,
    disconnect,
    getStatus,

    // Messages
    listMessages,
    getMessage,
    sendEmail,
    replyToEmail,
    searchMessages,
    getThread,

    // Drafts
    createDraft,
    listDrafts,

    // Labels
    listLabels,
    createLabel,

    // Settings
    updateSettings,
    setupWatch,
    stopWatch,

    // Webhook
    handleWebhook
};
