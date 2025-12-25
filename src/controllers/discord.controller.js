const discordService = require('../services/discord.service');
const DiscordIntegration = require('../models/discordIntegration.model');
const User = require('../models/user.model');
const { CustomException } = require('../utils');
const { encrypt } = require('../utils/encryption');
const logger = require('../utils/contextLogger');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

/**
 * Get Discord OAuth authorization URL
 * @route GET /api/integrations/discord/auth-url
 */
const getAuthUrl = async (request, response) => {
    try {
        const userId = request.userID || request.userId;

        // Get user to extract firmId
        const user = await User.findById(userId).select('firmId');
        if (!user) {
            throw CustomException('User not found', 404);
        }

        if (!user.firmId) {
            throw CustomException('User must be associated with a firm to use Discord integration', 400);
        }

        const authUrl = discordService.getAuthUrl(user.firmId.toString(), userId);

        return response.status(200).json({
            error: false,
            message: 'Discord authorization URL generated successfully',
            authUrl
        });
    } catch (error) {
        logger.error('Failed to generate Discord auth URL', {
            userId: request.userID,
            error: error.message
        });

        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to generate authorization URL'
        });
    }
};

/**
 * Handle Discord OAuth callback
 * @route GET /api/integrations/discord/callback
 */
const handleCallback = async (request, response) => {
    try {
        const { code, state, guild_id } = request.query;

        if (!code || !state) {
            throw CustomException('Missing authorization code or state parameter', 400);
        }

        // Verify state
        const stateData = discordService.verifyState(state);
        const { firmId, userId } = stateData;

        // Exchange code for tokens
        const tokenResponse = await discordService.exchangeCode(code);

        // Encrypt tokens before storing
        const encryptedAccessToken = encrypt(tokenResponse.access_token);
        const encryptedRefreshToken = tokenResponse.refresh_token
            ? encrypt(tokenResponse.refresh_token)
            : null;

        // Calculate token expiration
        const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

        // Get user's guilds
        const guilds = await discordService.listGuilds(encryptedAccessToken);

        // If guild_id is provided, use it; otherwise, user must select later
        let selectedGuild = null;
        if (guild_id) {
            selectedGuild = guilds.find(g => g.id === guild_id);
        }

        if (!selectedGuild) {
            // For now, just store tokens and let user select guild in next step
            // In production, you might want to redirect to a guild selection page

            // Store partial integration
            const integration = await DiscordIntegration.findOneAndUpdate(
                { firmId },
                {
                    firmId,
                    userId,
                    accessToken: encryptedAccessToken,
                    refreshToken: encryptedRefreshToken,
                    expiresAt,
                    isActive: false, // Not active until guild is selected
                    'metadata.guilds': guilds,
                    'metadata.pendingSetup': true
                },
                { upsert: true, new: true }
            );

            // Redirect to frontend for guild selection
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            return response.redirect(
                `${frontendUrl}/settings/integrations/discord/setup?step=select-guild`
            );
        }

        // Create webhook in the selected guild
        // (This requires additional channel selection step in production)
        // For now, we'll just store the guild info

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return response.redirect(
            `${frontendUrl}/settings/integrations/discord?status=success`
        );
    } catch (error) {
        logger.error('Discord OAuth callback failed', {
            error: error.message
        });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return response.redirect(
            `${frontendUrl}/settings/integrations/discord?status=error&message=${encodeURIComponent(error.message)}`
        );
    }
};

/**
 * Complete Discord integration setup
 * @route POST /api/integrations/discord/complete-setup
 */
const completeSetup = async (request, response) => {
    try {
        const userId = request.userID || request.userId;

        // Get user's firm
        const user = await User.findById(userId).select('firmId');
        if (!user || !user.firmId) {
            throw CustomException('User must be associated with a firm', 400);
        }

        const firmId = user.firmId.toString();

        // Get allowed fields
        const allowedFields = ['guildId', 'channelId', 'webhookName'];
        const sanitizedInput = pickAllowedFields(request.body, allowedFields);

        const { guildId, channelId, webhookName } = sanitizedInput;

        if (!guildId || !channelId) {
            throw CustomException('Guild ID and Channel ID are required', 400);
        }

        // Get existing integration
        const integration = await DiscordIntegration.findOne({ firmId })
            .select('+accessToken +refreshToken');

        if (!integration || !integration.accessToken) {
            throw CustomException('OAuth flow not completed. Please authorize with Discord first.', 400);
        }

        // Get guild info
        const guilds = await discordService.listGuilds(integration.accessToken);
        const selectedGuild = guilds.find(g => g.id === guildId);

        if (!selectedGuild) {
            throw CustomException('Selected guild not found or not accessible', 404);
        }

        // Get channels in guild
        const channels = await discordService.listChannels(integration.accessToken, guildId);
        const selectedChannel = channels.find(c => c.id === channelId);

        if (!selectedChannel) {
            throw CustomException('Selected channel not found or not accessible', 404);
        }

        // Create webhook
        const webhook = await discordService.createWebhook(
            integration.accessToken,
            channelId,
            webhookName || 'Traf3li Notifications'
        );

        // Encrypt webhook data
        const encryptedWebhookUrl = encrypt(webhook.url);
        const encryptedWebhookToken = encrypt(webhook.token);

        // Update integration
        integration.guildId = guildId;
        integration.guildName = selectedGuild.name;
        integration.guildIcon = selectedGuild.icon;
        integration.webhookUrl = encryptedWebhookUrl;
        integration.webhookId = webhook.id;
        integration.webhookToken = encryptedWebhookToken;
        integration.webhookChannelId = channelId;
        integration.webhookChannelName = selectedChannel.name;
        integration.channels = channels;
        integration.botPermissions = selectedGuild.permissions || 0;
        integration.isActive = true;
        integration.connectedAt = new Date();
        integration.lastSyncAt = new Date();
        integration.metadata.delete('pendingSetup');

        await integration.save();

        logger.info('Discord integration completed', {
            firmId,
            userId,
            guildId,
            channelId
        });

        return response.status(200).json({
            error: false,
            message: 'Discord integration setup completed successfully',
            integration: integration.toSafeObject()
        });
    } catch (error) {
        logger.error('Failed to complete Discord setup', {
            userId: request.userID,
            error: error.message
        });

        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to complete Discord integration setup'
        });
    }
};

/**
 * Get Discord integration status
 * @route GET /api/integrations/discord/status
 */
const getStatus = async (request, response) => {
    try {
        const userId = request.userID || request.userId;

        // Get user's firm
        const user = await User.findById(userId).select('firmId');
        if (!user || !user.firmId) {
            return response.status(200).json({
                error: false,
                connected: false,
                message: 'No firm association found'
            });
        }

        const firmId = user.firmId.toString();

        // Get integration
        const integration = await DiscordIntegration.findOne({ firmId });

        if (!integration) {
            return response.status(200).json({
                error: false,
                connected: false,
                message: 'Discord integration not configured'
            });
        }

        return response.status(200).json({
            error: false,
            connected: integration.isActive,
            integration: integration.toSafeObject()
        });
    } catch (error) {
        logger.error('Failed to get Discord status', {
            userId: request.userID,
            error: error.message
        });

        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to get Discord integration status'
        });
    }
};

/**
 * Disconnect Discord integration
 * @route POST /api/integrations/discord/disconnect
 */
const disconnect = async (request, response) => {
    try {
        const userId = request.userID || request.userId;

        // Get user's firm
        const user = await User.findById(userId).select('firmId');
        if (!user || !user.firmId) {
            throw CustomException('User must be associated with a firm', 400);
        }

        const result = await discordService.disconnect(user.firmId.toString());

        logger.info('Discord integration disconnected', {
            firmId: user.firmId.toString(),
            userId
        });

        return response.status(200).json({
            error: false,
            ...result
        });
    } catch (error) {
        logger.error('Failed to disconnect Discord', {
            userId: request.userID,
            error: error.message
        });

        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to disconnect Discord integration'
        });
    }
};

/**
 * Send test message to Discord
 * @route POST /api/integrations/discord/test
 */
const testConnection = async (request, response) => {
    try {
        const userId = request.userID || request.userId;

        // Get user's firm
        const user = await User.findById(userId).select('firmId');
        if (!user || !user.firmId) {
            throw CustomException('User must be associated with a firm', 400);
        }

        const result = await discordService.testConnection(user.firmId.toString());

        return response.status(result.success ? 200 : 400).json({
            error: !result.success,
            ...result
        });
    } catch (error) {
        logger.error('Failed to test Discord connection', {
            userId: request.userID,
            error: error.message
        });

        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to test Discord connection'
        });
    }
};

/**
 * Get user's Discord guilds
 * @route GET /api/integrations/discord/guilds
 */
const listGuilds = async (request, response) => {
    try {
        const userId = request.userID || request.userId;

        // Get user's firm
        const user = await User.findById(userId).select('firmId');
        if (!user || !user.firmId) {
            throw CustomException('User must be associated with a firm', 400);
        }

        const firmId = user.firmId.toString();

        // Get integration
        const integration = await DiscordIntegration.findOne({ firmId })
            .select('+accessToken');

        if (!integration || !integration.accessToken) {
            throw CustomException('Discord not connected. Please authorize first.', 400);
        }

        const guilds = await discordService.listGuilds(integration.accessToken);

        return response.status(200).json({
            error: false,
            message: 'Discord guilds retrieved successfully',
            guilds
        });
    } catch (error) {
        logger.error('Failed to list Discord guilds', {
            userId: request.userID,
            error: error.message
        });

        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to retrieve Discord servers'
        });
    }
};

/**
 * Get channels in a Discord guild
 * @route GET /api/integrations/discord/guilds/:guildId/channels
 */
const listChannels = async (request, response) => {
    try {
        const userId = request.userID || request.userId;
        const { guildId } = request.params;

        if (!guildId) {
            throw CustomException('Guild ID is required', 400);
        }

        // Get user's firm
        const user = await User.findById(userId).select('firmId');
        if (!user || !user.firmId) {
            throw CustomException('User must be associated with a firm', 400);
        }

        const firmId = user.firmId.toString();

        // Get integration
        const integration = await DiscordIntegration.findOne({ firmId })
            .select('+accessToken');

        if (!integration || !integration.accessToken) {
            throw CustomException('Discord not connected. Please authorize first.', 400);
        }

        const channels = await discordService.listChannels(integration.accessToken, guildId);

        return response.status(200).json({
            error: false,
            message: 'Discord channels retrieved successfully',
            channels
        });
    } catch (error) {
        logger.error('Failed to list Discord channels', {
            userId: request.userID,
            guildId: request.params.guildId,
            error: error.message
        });

        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to retrieve Discord channels'
        });
    }
};

/**
 * Update Discord sync settings
 * @route PUT /api/integrations/discord/settings
 */
const updateSettings = async (request, response) => {
    try {
        const userId = request.userID || request.userId;

        // Get user's firm
        const user = await User.findById(userId).select('firmId');
        if (!user || !user.firmId) {
            throw CustomException('User must be associated with a firm', 400);
        }

        const firmId = user.firmId.toString();

        // Get integration
        const integration = await DiscordIntegration.findOne({ firmId });

        if (!integration) {
            throw CustomException('Discord integration not found', 404);
        }

        // Allowed settings fields
        const allowedFields = [
            'events',
            'mentionRole',
            'embedColor',
            'includeDetails',
            'maxNotificationsPerHour',
            'digestMode'
        ];

        const sanitizedSettings = pickAllowedFields(request.body, allowedFields);

        // Update settings
        await integration.updateSettings(sanitizedSettings);

        logger.info('Discord settings updated', {
            firmId,
            userId
        });

        return response.status(200).json({
            error: false,
            message: 'Discord settings updated successfully',
            settings: integration.syncSettings
        });
    } catch (error) {
        logger.error('Failed to update Discord settings', {
            userId: request.userID,
            error: error.message
        });

        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to update Discord settings'
        });
    }
};

/**
 * Send custom message to Discord
 * @route POST /api/integrations/discord/message
 */
const sendMessage = async (request, response) => {
    try {
        const userId = request.userID || request.userId;

        // Get user's firm
        const user = await User.findById(userId).select('firmId');
        if (!user || !user.firmId) {
            throw CustomException('User must be associated with a firm', 400);
        }

        const firmId = user.firmId.toString();

        // Get allowed fields
        const allowedFields = ['content', 'embed', 'username', 'avatarUrl'];
        const sanitizedInput = pickAllowedFields(request.body, allowedFields);

        const { content, embed } = sanitizedInput;

        if (!content && !embed) {
            throw CustomException('Either content or embed is required', 400);
        }

        // Get integration
        const integration = await DiscordIntegration.findOne({ firmId })
            .select('+webhookUrl +webhookToken');

        if (!integration) {
            throw CustomException('Discord integration not found', 404);
        }

        if (!integration.isActive) {
            throw CustomException('Discord integration is not active', 400);
        }

        let result;
        if (embed) {
            result = await discordService.sendEmbed(
                integration.webhookUrl,
                integration.webhookToken,
                embed,
                sanitizedInput
            );
        } else {
            result = await discordService.sendMessage(
                integration.webhookUrl,
                integration.webhookToken,
                content,
                sanitizedInput
            );
        }

        // Record success
        await integration.recordSuccess();

        return response.status(200).json({
            error: false,
            message: 'Message sent to Discord successfully',
            result
        });
    } catch (error) {
        logger.error('Failed to send Discord message', {
            userId: request.userID,
            error: error.message
        });

        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to send message to Discord'
        });
    }
};

/**
 * Handle incoming Discord webhook events
 * @route POST /api/integrations/discord/webhook
 */
const handleWebhook = async (request, response) => {
    try {
        // Verify webhook signature if configured
        // For now, just log the event

        logger.info('Discord webhook received', {
            headers: request.headers,
            body: request.body
        });

        // Acknowledge receipt
        return response.status(200).json({
            error: false,
            message: 'Webhook received'
        });
    } catch (error) {
        logger.error('Failed to handle Discord webhook', {
            error: error.message
        });

        return response.status(500).json({
            error: true,
            message: 'Failed to process webhook'
        });
    }
};

module.exports = {
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
};
