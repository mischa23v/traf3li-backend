const TelegramIntegration = require('../models/telegramIntegration.model');
const telegramService = require('../services/telegram.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

/**
 * Telegram Bot Integration Controller
 *
 * Handles all Telegram bot operations including:
 * - Bot connection/disconnection
 * - Webhook management
 * - Message sending
 * - Notification settings
 * - Status monitoring
 */

/**
 * Connect Telegram bot with token
 * POST /api/telegram/connect
 */
const connect = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;

    // Input validation
    const allowedFields = ['botToken', 'webhookUrl', 'defaultChatId', 'notificationSettings', 'enabledCommands'];
    const sanitizedInput = pickAllowedFields(req.body, allowedFields);
    const { botToken, webhookUrl, defaultChatId, notificationSettings, enabledCommands } = sanitizedInput;

    if (!botToken) {
        throw CustomException('Bot token is required', 400);
    }

    if (typeof botToken !== 'string' || botToken.trim().length === 0) {
        throw CustomException('Invalid bot token format', 400);
    }

    // Check if integration already exists
    const existingIntegration = await TelegramIntegration.findOne({ firmId });

    if (existingIntegration && existingIntegration.isActive) {
        throw CustomException('Telegram integration already exists. Please disconnect first.', 400);
    }

    try {
        // Verify bot token by getting bot info
        const botInfo = await telegramService.getBotInfo(botToken);

        // Set webhook if URL provided
        let webhookResult = null;
        const webhookSecret = telegramService.generateWebhookSecret();

        if (webhookUrl) {
            webhookResult = await telegramService.setWebhook(botToken, webhookUrl, {
                secretToken: webhookSecret
            });
        }

        // Create or update integration
        let integration;

        if (existingIntegration) {
            // Reactivate existing integration
            existingIntegration.botToken = botToken;
            existingIntegration.botUsername = botInfo.username;
            existingIntegration.botName = botInfo.first_name;
            existingIntegration.botId = String(botInfo.id);
            existingIntegration.webhookUrl = webhookUrl || null;
            existingIntegration.webhookSecret = webhookUrl ? webhookSecret : null;
            existingIntegration.webhookSetAt = webhookUrl ? new Date() : null;
            existingIntegration.defaultChatId = defaultChatId || null;
            existingIntegration.isActive = true;
            existingIntegration.connectedAt = new Date();
            existingIntegration.updatedBy = userId;

            if (notificationSettings) {
                existingIntegration.notificationSettings = {
                    ...existingIntegration.notificationSettings.toObject(),
                    ...notificationSettings
                };
            }

            if (enabledCommands) {
                existingIntegration.enabledCommands = {
                    ...existingIntegration.enabledCommands.toObject(),
                    ...enabledCommands
                };
            }

            integration = await existingIntegration.save();
        } else {
            // Create new integration
            integration = await TelegramIntegration.create({
                firmId,
                botToken,
                botUsername: botInfo.username,
                botName: botInfo.first_name,
                botId: String(botInfo.id),
                webhookUrl: webhookUrl || null,
                webhookSecret: webhookUrl ? webhookSecret : null,
                webhookSetAt: webhookUrl ? new Date() : null,
                defaultChatId: defaultChatId || null,
                notificationSettings: notificationSettings || {},
                enabledCommands: enabledCommands || {},
                isActive: true,
                createdBy: userId
            });
        }

        // Return response without sensitive data
        const response = integration.toObject();
        delete response.botToken;
        delete response.webhookSecret;

        res.status(201).json({
            success: true,
            message: 'Telegram bot connected successfully',
            data: {
                integration: response,
                botInfo: {
                    id: botInfo.id,
                    username: botInfo.username,
                    firstName: botInfo.first_name,
                    canJoinGroups: botInfo.can_join_groups,
                    canReadAllGroupMessages: botInfo.can_read_all_group_messages,
                    supportsInlineQueries: botInfo.supports_inline_queries
                },
                webhook: webhookResult ? { set: true } : { set: false }
            }
        });
    } catch (error) {
        logger.error('Error connecting Telegram bot:', error);

        // Provide user-friendly error messages
        if (error.message.includes('Unauthorized')) {
            throw CustomException('Invalid bot token. Please check your bot token and try again.', 400);
        }

        throw CustomException(`Failed to connect bot: ${error.message}`, 500);
    }
});

/**
 * Disconnect Telegram bot
 * POST /api/telegram/disconnect
 */
const disconnect = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;

    const integration = await TelegramIntegration.findOne({ firmId }).select('+botToken');

    if (!integration) {
        throw CustomException('No Telegram integration found', 404);
    }

    try {
        // Remove webhook if set
        if (integration.webhookUrl) {
            await telegramService.deleteWebhook(integration.botToken);
        }

        // Deactivate integration
        integration.isActive = false;
        integration.disconnectedAt = new Date();
        integration.updatedBy = userId;
        await integration.save();

        res.json({
            success: true,
            message: 'Telegram bot disconnected successfully'
        });
    } catch (error) {
        logger.error('Error disconnecting Telegram bot:', error);
        throw CustomException(`Failed to disconnect bot: ${error.message}`, 500);
    }
});

/**
 * Get bot status and information
 * GET /api/telegram/status
 */
const getStatus = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    const integration = await TelegramIntegration.findOne({ firmId }).select('+botToken');

    if (!integration) {
        return res.json({
            success: true,
            data: {
                connected: false,
                integration: null
            }
        });
    }

    try {
        // Get current webhook info
        let webhookInfo = null;
        if (integration.isActive) {
            webhookInfo = await telegramService.getWebhookInfo(integration.botToken);
        }

        // Prepare response
        const response = integration.toObject();
        delete response.botToken;
        delete response.webhookSecret;

        res.json({
            success: true,
            data: {
                connected: integration.isActive,
                integration: response,
                webhook: webhookInfo ? {
                    url: webhookInfo.url,
                    hasCustomCertificate: webhookInfo.has_custom_certificate,
                    pendingUpdateCount: webhookInfo.pending_update_count,
                    lastErrorDate: webhookInfo.last_error_date,
                    lastErrorMessage: webhookInfo.last_error_message,
                    maxConnections: webhookInfo.max_connections
                } : null
            }
        });
    } catch (error) {
        logger.error('Error getting Telegram status:', error);

        // Return integration data even if webhook check fails
        const response = integration.toObject();
        delete response.botToken;
        delete response.webhookSecret;

        res.json({
            success: true,
            data: {
                connected: integration.isActive,
                integration: response,
                webhook: null,
                error: 'Failed to fetch webhook info'
            }
        });
    }
});

/**
 * Send message to specific chat
 * POST /api/telegram/message
 */
const sendMessage = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    // Input validation
    const allowedFields = ['chatId', 'text', 'parseMode', 'disableWebPagePreview', 'disableNotification'];
    const sanitizedInput = pickAllowedFields(req.body, allowedFields);
    const { chatId, text, parseMode, disableWebPagePreview, disableNotification } = sanitizedInput;

    if (!chatId) {
        throw CustomException('Chat ID is required', 400);
    }

    if (!text) {
        throw CustomException('Message text is required', 400);
    }

    if (typeof text !== 'string' || text.trim().length === 0) {
        throw CustomException('Message text must be a non-empty string', 400);
    }

    const integration = await TelegramIntegration.findOne({ firmId, isActive: true }).select('+botToken');

    if (!integration) {
        throw CustomException('No active Telegram integration found', 404);
    }

    try {
        const result = await telegramService.sendMessage(
            integration.botToken,
            chatId,
            text,
            {
                parseMode: parseMode || 'HTML',
                disableWebPagePreview: disableWebPagePreview || false,
                disableNotification: disableNotification || false
            }
        );

        await integration.incrementMessageSent();

        res.json({
            success: true,
            message: 'Message sent successfully',
            data: {
                messageId: result.message_id,
                chatId: result.chat.id,
                date: result.date
            }
        });
    } catch (error) {
        logger.error('Error sending Telegram message:', error);
        await integration.recordError(error);
        throw CustomException(`Failed to send message: ${error.message}`, 500);
    }
});

/**
 * List known chats
 * GET /api/telegram/chats
 */
const listChats = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    const integration = await TelegramIntegration.findOne({ firmId });

    if (!integration) {
        throw CustomException('No Telegram integration found', 404);
    }

    const activeChats = integration.getActiveChats();

    res.json({
        success: true,
        data: {
            chats: activeChats,
            defaultChatId: integration.defaultChatId,
            total: activeChats.length
        }
    });
});

/**
 * Update notification settings
 * PUT /api/telegram/settings
 */
const updateSettings = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;

    // Input validation
    const allowedFields = [
        'notificationSettings',
        'notificationSchedule',
        'enabledCommands',
        'defaultChatId'
    ];
    const sanitizedInput = pickAllowedFields(req.body, allowedFields);
    const { notificationSettings, notificationSchedule, enabledCommands, defaultChatId } = sanitizedInput;

    const integration = await TelegramIntegration.findOne({ firmId });

    if (!integration) {
        throw CustomException('No Telegram integration found', 404);
    }

    // Update settings
    if (notificationSettings) {
        if (typeof notificationSettings !== 'object') {
            throw CustomException('Notification settings must be an object', 400);
        }
        integration.notificationSettings = {
            ...integration.notificationSettings.toObject(),
            ...notificationSettings
        };
    }

    if (notificationSchedule) {
        if (typeof notificationSchedule !== 'object') {
            throw CustomException('Notification schedule must be an object', 400);
        }
        integration.notificationSchedule = {
            ...integration.notificationSchedule.toObject(),
            ...notificationSchedule
        };
    }

    if (enabledCommands) {
        if (typeof enabledCommands !== 'object') {
            throw CustomException('Enabled commands must be an object', 400);
        }
        integration.enabledCommands = {
            ...integration.enabledCommands.toObject(),
            ...enabledCommands
        };
    }

    if (defaultChatId !== undefined) {
        integration.defaultChatId = defaultChatId;
    }

    integration.updatedBy = userId;
    await integration.save();

    // Return response without sensitive data
    const response = integration.toObject();
    delete response.botToken;
    delete response.webhookSecret;

    res.json({
        success: true,
        message: 'Settings updated successfully',
        data: response
    });
});

/**
 * Handle incoming webhook from Telegram
 * POST /api/telegram/webhook/:firmId
 *
 * Security: Validates X-Telegram-Bot-Api-Secret-Token header against stored webhook secret
 */
const handleWebhook = asyncHandler(async (req, res) => {
    const { firmId } = req.params;
    const update = req.body;

    // Extract and validate Telegram webhook secret token from header
    // This token is set when configuring the webhook and must match for security
    const secretToken = req.headers['x-telegram-bot-api-secret-token'];

    // Validate firmId
    const sanitizedFirmId = sanitizeObjectId(firmId);
    if (!sanitizedFirmId) {
        throw CustomException('Invalid firm ID', 400);
    }

    // Validate update structure
    if (!update || typeof update !== 'object' || !update.update_id) {
        throw CustomException('Invalid update structure', 400);
    }

    try {
        // Service layer will validate the secret token against stored value
        const result = await telegramService.handleWebhook(sanitizedFirmId, update, secretToken);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('Error handling Telegram webhook:', error);

        // Return 200 to Telegram to prevent retries on our errors
        res.json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Test connection by sending test message
 * POST /api/telegram/test
 */
const testConnection = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    // Input validation
    const allowedFields = ['chatId'];
    const sanitizedInput = pickAllowedFields(req.body, allowedFields);
    const { chatId } = sanitizedInput;

    const integration = await TelegramIntegration.findOne({ firmId, isActive: true }).select('+botToken');

    if (!integration) {
        throw CustomException('No active Telegram integration found', 404);
    }

    // Use provided chatId or default
    const targetChatId = chatId || integration.defaultChatId;

    if (!targetChatId) {
        throw CustomException('No chat ID available. Please provide a chat ID or set a default chat.', 400);
    }

    try {
        const result = await telegramService.testConnection(integration.botToken, targetChatId);

        res.json({
            success: true,
            message: 'Test message sent successfully',
            data: {
                chatId: targetChatId,
                result: result.result
            }
        });
    } catch (error) {
        logger.error('Error testing Telegram connection:', error);
        await integration.recordError(error);
        throw CustomException(`Connection test failed: ${error.message}`, 500);
    }
});

/**
 * Send photo
 * POST /api/telegram/photo
 */
const sendPhoto = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    // Input validation
    const allowedFields = ['chatId', 'photo', 'caption', 'parseMode', 'disableNotification'];
    const sanitizedInput = pickAllowedFields(req.body, allowedFields);
    const { chatId, photo, caption, parseMode, disableNotification } = sanitizedInput;

    if (!chatId) {
        throw CustomException('Chat ID is required', 400);
    }

    if (!photo) {
        throw CustomException('Photo URL or file ID is required', 400);
    }

    const integration = await TelegramIntegration.findOne({ firmId, isActive: true }).select('+botToken');

    if (!integration) {
        throw CustomException('No active Telegram integration found', 404);
    }

    try {
        const result = await telegramService.sendPhoto(
            integration.botToken,
            chatId,
            photo,
            {
                caption: caption || undefined,
                parseMode: parseMode || 'HTML',
                disableNotification: disableNotification || false
            }
        );

        await integration.incrementMessageSent();

        res.json({
            success: true,
            message: 'Photo sent successfully',
            data: {
                messageId: result.message_id,
                chatId: result.chat.id
            }
        });
    } catch (error) {
        logger.error('Error sending Telegram photo:', error);
        await integration.recordError(error);
        throw CustomException(`Failed to send photo: ${error.message}`, 500);
    }
});

/**
 * Send document
 * POST /api/telegram/document
 */
const sendDocument = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    // Input validation
    const allowedFields = ['chatId', 'document', 'caption', 'fileName', 'parseMode', 'disableNotification'];
    const sanitizedInput = pickAllowedFields(req.body, allowedFields);
    const { chatId, document, caption, fileName, parseMode, disableNotification } = sanitizedInput;

    if (!chatId) {
        throw CustomException('Chat ID is required', 400);
    }

    if (!document) {
        throw CustomException('Document URL or file ID is required', 400);
    }

    const integration = await TelegramIntegration.findOne({ firmId, isActive: true }).select('+botToken');

    if (!integration) {
        throw CustomException('No active Telegram integration found', 404);
    }

    try {
        const result = await telegramService.sendDocument(
            integration.botToken,
            chatId,
            document,
            {
                caption: caption || undefined,
                fileName: fileName || undefined,
                parseMode: parseMode || 'HTML',
                disableNotification: disableNotification || false
            }
        );

        await integration.incrementMessageSent();

        res.json({
            success: true,
            message: 'Document sent successfully',
            data: {
                messageId: result.message_id,
                chatId: result.chat.id
            }
        });
    } catch (error) {
        logger.error('Error sending Telegram document:', error);
        await integration.recordError(error);
        throw CustomException(`Failed to send document: ${error.message}`, 500);
    }
});

module.exports = {
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
};
