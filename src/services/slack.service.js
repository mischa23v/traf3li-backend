const { WebClient } = require('@slack/web-api');
const axios = require('axios');
const crypto = require('crypto');
const SlackIntegration = require('../models/slackIntegration.model');
const { CustomException } = require('../utils');
const logger = require('../utils/contextLogger');
const { wrapExternalCall } = require('../utils/externalServiceWrapper');

const {
    SLACK_CLIENT_ID,
    SLACK_CLIENT_SECRET,
    SLACK_SIGNING_SECRET,
    BACKEND_URL,
    API_URL
} = process.env;

// Validate required environment variables
if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET) {
    logger.warn('Slack integration not configured. Set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET in environment variables.');
}

const REDIRECT_URI = `${BACKEND_URL || API_URL || 'http://localhost:5000'}/api/slack/callback`;

// OAuth scopes needed
const OAUTH_SCOPES = [
    'chat:write',
    'channels:read',
    'groups:read',
    'users:read',
    'incoming-webhook',
    'chat:write.public'
];

/**
 * Slack Service
 *
 * Handles OAuth flow, messaging, and integration with Slack workspaces
 */
class SlackService {
    /**
     * Create Slack Web Client for authenticated requests
     */
    createClient(token) {
        return new WebClient(token);
    }

    // ═══════════════════════════════════════════════════════════════
    // OAUTH FLOW
    // ═══════════════════════════════════════════════════════════════

    /**
     * Generate OAuth URL for user to authorize
     * @param {string} userId - User ID
     * @param {string} firmId - Firm ID
     * @returns {string} Authorization URL
     */
    async getAuthUrl(userId, firmId) {
        // Generate state for CSRF protection
        const state = crypto.randomBytes(32).toString('hex');

        // Store state data
        const stateData = {
            userId,
            firmId,
            timestamp: Date.now()
        };

        // In production, store this in Redis or cache
        // For now, we'll include it in the state parameter (base64 encoded)
        const encodedState = Buffer.from(JSON.stringify(stateData)).toString('base64');

        const authUrl = new URL('https://slack.com/oauth/v2/authorize');
        authUrl.searchParams.append('client_id', SLACK_CLIENT_ID);
        authUrl.searchParams.append('scope', OAUTH_SCOPES.join(','));
        authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
        authUrl.searchParams.append('state', encodedState);

        return authUrl.toString();
    }

    /**
     * Exchange authorization code for access tokens
     * @param {string} code - Authorization code
     * @param {string} state - State parameter
     * @returns {object} Integration result
     */
    async exchangeCode(code, state) {
        // Decode and validate state
        let stateData;
        try {
            stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        } catch (error) {
            throw CustomException('Invalid state parameter', 400);
        }

        const { userId, firmId, timestamp } = stateData;

        // Validate state timestamp (prevent replay attacks)
        const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
        if (timestamp < fifteenMinutesAgo) {
            throw CustomException('Authorization expired. Please try again.', 400);
        }

        try {
            // Exchange code for token
            const response = await wrapExternalCall('slack', async () => {
                return await axios.post('https://slack.com/api/oauth.v2.access', null, {
                    params: {
                        client_id: SLACK_CLIENT_ID,
                        client_secret: SLACK_CLIENT_SECRET,
                        code,
                        redirect_uri: REDIRECT_URI
                    }
                });
            });

            const data = response.data;

            if (!data.ok) {
                throw new Error(data.error || 'OAuth exchange failed');
            }

            // Extract tokens and workspace info
            const {
                access_token,
                scope,
                team,
                authed_user,
                incoming_webhook,
                bot_user_id
            } = data;

            // Find or create integration
            let integration = await SlackIntegration.findOne({ firmId, userId });

            if (integration) {
                // Update existing integration
                integration.accessToken = access_token;
                integration.botAccessToken = data.bot_user_id ? access_token : null;
                integration.botUserId = bot_user_id || null;
                integration.teamId = team.id;
                integration.teamName = team.name;
                integration.scope = scope;
                integration.isActive = true;
                integration.connectedAt = new Date();
                integration.disconnectedAt = null;
                integration.disconnectedBy = null;
                integration.disconnectReason = null;

                // Update webhook if available
                if (incoming_webhook) {
                    integration.webhookUrl = incoming_webhook.url;
                    integration.webhookChannel = incoming_webhook.channel;
                    integration.webhookChannelId = incoming_webhook.channel_id;
                }

                await integration.save();
            } else {
                // Create new integration
                integration = await SlackIntegration.create({
                    firmId,
                    userId,
                    accessToken: access_token,
                    botAccessToken: data.bot_user_id ? access_token : null,
                    botUserId: bot_user_id || null,
                    teamId: team.id,
                    teamName: team.name,
                    scope,
                    webhookUrl: incoming_webhook?.url,
                    webhookChannel: incoming_webhook?.channel,
                    webhookChannelId: incoming_webhook?.channel_id,
                    isActive: true,
                    connectedAt: new Date()
                });
            }

            // Fetch and store available channels
            try {
                const channels = await this.listChannels(firmId);

                // Add primary channel
                if (channels.length > 0) {
                    const defaultChannel = incoming_webhook?.channel_id
                        ? channels.find(c => c.id === incoming_webhook.channel_id)
                        : channels[0];

                    if (defaultChannel) {
                        await integration.addChannel({
                            channelId: defaultChannel.id,
                            channelName: defaultChannel.name,
                            enabled: true
                        });

                        integration.syncSettings.defaultChannelId = defaultChannel.id;
                        integration.syncSettings.defaultChannelName = defaultChannel.name;
                        await integration.save();
                    }
                }
            } catch (error) {
                logger.warn('Failed to fetch Slack channels', { error: error.message });
            }

            logger.info('Slack integration connected successfully', { firmId, userId, teamId: team.id });

            return {
                success: true,
                integration: {
                    teamName: integration.teamName,
                    teamId: integration.teamId,
                    connectedAt: integration.connectedAt
                }
            };
        } catch (error) {
            logger.error('Slack OAuth exchange failed', {
                error: error.message,
                userId,
                firmId
            });

            throw CustomException('Failed to connect Slack', 500);
        }
    }

    /**
     * Refresh tokens (Slack tokens don't expire, but included for consistency)
     * @param {string} firmId - Firm ID
     * @returns {object} Result
     */
    async refreshToken(firmId) {
        const integration = await SlackIntegration.findActiveIntegration(firmId);

        if (!integration) {
            throw CustomException('Slack not connected', 404);
        }

        // Slack tokens don't expire, but we can verify the connection
        try {
            const client = this.createClient(integration.accessToken);
            await client.auth.test();

            logger.info('Slack token verified', { firmId });

            return {
                success: true,
                message: 'Slack connection verified'
            };
        } catch (error) {
            logger.error('Slack token verification failed', {
                error: error.message,
                firmId
            });

            // Mark as disconnected if verification fails
            await integration.disconnect(integration.userId, 'Token verification failed');

            throw CustomException('Slack connection invalid. Please reconnect.', 401);
        }
    }

    /**
     * Disconnect Slack integration
     * @param {string} firmId - Firm ID
     * @param {string} userId - User ID who is disconnecting
     * @returns {object} Result
     */
    async disconnect(firmId, userId) {
        const integration = await SlackIntegration.findOne({ firmId });

        if (!integration) {
            throw CustomException('Slack not connected', 404);
        }

        // Revoke token with Slack
        try {
            await wrapExternalCall('slack', async () => {
                return await axios.post('https://slack.com/api/auth.revoke', null, {
                    headers: {
                        'Authorization': `Bearer ${integration.accessToken}`
                    }
                });
            });
        } catch (error) {
            logger.warn('Failed to revoke Slack token', { error: error.message });
            // Continue with disconnection even if revocation fails
        }

        await integration.disconnect(userId, 'User disconnected');

        logger.info('Slack integration disconnected', { firmId, userId });

        return { success: true };
    }

    // ═══════════════════════════════════════════════════════════════
    // MESSAGING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Send message to a Slack channel
     * @param {string} firmId - Firm ID
     * @param {string} channelId - Slack channel ID
     * @param {string} text - Message text
     * @param {object} options - Additional options (blocks, attachments, etc.)
     * @returns {object} Message result
     */
    async sendMessage(firmId, channelId, text, options = {}) {
        const integration = await SlackIntegration.findActiveIntegration(firmId);

        if (!integration) {
            throw CustomException('Slack not connected', 404);
        }

        try {
            const client = this.createClient(integration.botAccessToken || integration.accessToken);

            const messageParams = {
                channel: channelId,
                text,
                ...options
            };

            const result = await wrapExternalCall('slack', async () => {
                return await client.chat.postMessage(messageParams);
            });

            if (!result.ok) {
                throw new Error(result.error || 'Failed to send message');
            }

            // Update stats
            await integration.incrementStats(true);

            logger.info('Message sent to Slack', { firmId, channelId, ts: result.ts });

            return {
                success: true,
                messageId: result.ts,
                channel: result.channel
            };
        } catch (error) {
            logger.error('Failed to send Slack message', {
                error: error.message,
                firmId,
                channelId
            });

            await integration.recordError(error);

            throw CustomException('Failed to send message to Slack', 500);
        }
    }

    /**
     * Send direct message to a Slack user
     * @param {string} firmId - Firm ID
     * @param {string} userId - Slack user ID
     * @param {string} text - Message text
     * @param {object} options - Additional options
     * @returns {object} Message result
     */
    async sendDirectMessage(firmId, userId, text, options = {}) {
        const integration = await SlackIntegration.findActiveIntegration(firmId);

        if (!integration) {
            throw CustomException('Slack not connected', 404);
        }

        try {
            const client = this.createClient(integration.botAccessToken || integration.accessToken);

            // Open DM channel
            const dmChannel = await client.conversations.open({
                users: userId
            });

            if (!dmChannel.ok) {
                throw new Error('Failed to open DM channel');
            }

            // Send message
            const result = await this.sendMessage(firmId, dmChannel.channel.id, text, options);

            logger.info('Direct message sent to Slack user', { firmId, userId });

            return result;
        } catch (error) {
            logger.error('Failed to send Slack DM', {
                error: error.message,
                firmId,
                userId
            });

            throw CustomException('Failed to send direct message', 500);
        }
    }

    /**
     * Post notification to Slack
     * @param {string} firmId - Firm ID
     * @param {string} type - Notification type
     * @param {object} data - Notification data
     * @returns {object} Result
     */
    async postNotification(firmId, type, data) {
        const integration = await SlackIntegration.findActiveIntegration(firmId);

        if (!integration) {
            throw CustomException('Slack not connected', 404);
        }

        // Check if notification type is enabled
        if (!integration.isNotificationEnabled(type)) {
            logger.debug('Notification type disabled', { firmId, type });
            return { success: false, reason: 'Notification type disabled' };
        }

        // Get channel to post to
        const channelId = integration.syncSettings.defaultChannelId;
        if (!channelId) {
            throw CustomException('No default channel configured', 400);
        }

        // Build notification message
        const message = this.buildNotificationMessage(type, data, integration);

        try {
            const result = await this.sendMessage(firmId, channelId, message.text, message.options);

            // Update notification stats
            integration.stats.totalNotificationsSent += 1;
            await integration.save();

            return result;
        } catch (error) {
            logger.error('Failed to post notification to Slack', {
                error: error.message,
                firmId,
                type
            });

            throw error;
        }
    }

    /**
     * Build notification message based on type
     */
    buildNotificationMessage(type, data, integration) {
        const { mentionOnUrgent } = integration.syncSettings;

        let text = '';
        let blocks = [];

        switch (type) {
            case 'caseUpdates':
                text = `Case Update: ${data.caseNumber}`;
                blocks = [
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: `Case Update: ${data.caseNumber}`
                        }
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*Client:* ${data.clientName}\n*Status:* ${data.status}\n*Update:* ${data.message}`
                        }
                    }
                ];
                break;

            case 'invoiceReminders':
                text = `Invoice Reminder: ${data.invoiceNumber}`;
                blocks = [
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: `Invoice Reminder`
                        }
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*Invoice:* ${data.invoiceNumber}\n*Client:* ${data.clientName}\n*Amount:* ${data.amount}\n*Due Date:* ${data.dueDate}`
                        }
                    }
                ];
                if (data.isOverdue && mentionOnUrgent) {
                    text = `<!channel> ${text} - OVERDUE`;
                }
                break;

            case 'taskAssignments':
                text = `New Task Assignment: ${data.taskTitle}`;
                blocks = [
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: `New Task Assignment`
                        }
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*Task:* ${data.taskTitle}\n*Assigned to:* ${data.assignedTo}\n*Due:* ${data.dueDate}\n*Priority:* ${data.priority}`
                        }
                    }
                ];
                if (data.priority === 'urgent' && mentionOnUrgent) {
                    text = `<!channel> ${text}`;
                }
                break;

            case 'hearingReminders':
                text = `Hearing Reminder: ${data.caseNumber}`;
                blocks = [
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: `Hearing Reminder`
                        }
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*Case:* ${data.caseNumber}\n*Court:* ${data.court}\n*Date/Time:* ${data.dateTime}\n*Location:* ${data.location}`
                        }
                    }
                ];
                if (mentionOnUrgent) {
                    text = `<!channel> ${text}`;
                }
                break;

            case 'paymentReceived':
                text = `Payment Received: ${data.amount}`;
                blocks = [
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: `Payment Received`
                        }
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*Amount:* ${data.amount}\n*Client:* ${data.clientName}\n*Invoice:* ${data.invoiceNumber}\n*Payment Method:* ${data.paymentMethod}`
                        }
                    }
                ];
                break;

            default:
                text = data.message || 'Notification';
                blocks = [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: data.message || 'Notification'
                        }
                    }
                ];
        }

        return {
            text,
            options: {
                blocks,
                unfurl_links: false,
                unfurl_media: false
            }
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // CHANNEL OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * List available Slack channels
     * @param {string} firmId - Firm ID
     * @returns {array} List of channels
     */
    async listChannels(firmId) {
        const integration = await SlackIntegration.findActiveIntegration(firmId);

        if (!integration) {
            throw CustomException('Slack not connected', 404);
        }

        try {
            const client = this.createClient(integration.accessToken);

            // Get public channels
            const publicChannels = await wrapExternalCall('slack', async () => {
                return await client.conversations.list({
                    types: 'public_channel',
                    exclude_archived: true,
                    limit: 1000
                });
            });

            // Get private channels the bot is in
            const privateChannels = await wrapExternalCall('slack', async () => {
                return await client.conversations.list({
                    types: 'private_channel',
                    exclude_archived: true,
                    limit: 1000
                });
            });

            const allChannels = [
                ...(publicChannels.channels || []),
                ...(privateChannels.channels || [])
            ];

            return allChannels.map(channel => ({
                id: channel.id,
                name: channel.name,
                isPrivate: channel.is_private,
                isMember: channel.is_member,
                memberCount: channel.num_members
            }));
        } catch (error) {
            logger.error('Failed to fetch Slack channels', {
                error: error.message,
                firmId
            });

            throw CustomException('Failed to fetch channels from Slack', 500);
        }
    }

    /**
     * Create a new Slack channel
     * @param {string} firmId - Firm ID
     * @param {string} name - Channel name
     * @param {boolean} isPrivate - Whether channel is private
     * @returns {object} Created channel
     */
    async createChannel(firmId, name, isPrivate = false) {
        const integration = await SlackIntegration.findActiveIntegration(firmId);

        if (!integration) {
            throw CustomException('Slack not connected', 404);
        }

        try {
            const client = this.createClient(integration.accessToken);

            const result = await wrapExternalCall('slack', async () => {
                return await client.conversations.create({
                    name,
                    is_private: isPrivate
                });
            });

            if (!result.ok) {
                throw new Error(result.error || 'Failed to create channel');
            }

            logger.info('Slack channel created', { firmId, channelId: result.channel.id, name });

            return {
                id: result.channel.id,
                name: result.channel.name,
                isPrivate: result.channel.is_private
            };
        } catch (error) {
            logger.error('Failed to create Slack channel', {
                error: error.message,
                firmId,
                name
            });

            throw CustomException('Failed to create channel in Slack', 500);
        }
    }

    /**
     * Get user information from Slack
     * @param {string} firmId - Firm ID
     * @param {string} slackUserId - Slack user ID
     * @returns {object} User info
     */
    async getUserInfo(firmId, slackUserId) {
        const integration = await SlackIntegration.findActiveIntegration(firmId);

        if (!integration) {
            throw CustomException('Slack not connected', 404);
        }

        try {
            const client = this.createClient(integration.accessToken);

            const result = await wrapExternalCall('slack', async () => {
                return await client.users.info({
                    user: slackUserId
                });
            });

            if (!result.ok) {
                throw new Error(result.error || 'Failed to get user info');
            }

            const user = result.user;

            return {
                id: user.id,
                name: user.name,
                realName: user.real_name,
                email: user.profile.email,
                displayName: user.profile.display_name,
                isBot: user.is_bot,
                timezone: user.tz
            };
        } catch (error) {
            logger.error('Failed to get Slack user info', {
                error: error.message,
                firmId,
                slackUserId
            });

            throw CustomException('Failed to get user info from Slack', 500);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // WEBHOOK HANDLING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Handle incoming webhook from Slack
     * @param {object} payload - Webhook payload
     * @param {object} headers - Request headers
     * @returns {object} Result
     */
    async handleIncomingWebhook(payload, headers) {
        // Verify webhook signature
        if (SLACK_SIGNING_SECRET) {
            const isValid = this.verifyWebhookSignature(payload, headers);
            if (!isValid) {
                throw CustomException('Invalid webhook signature', 401);
            }
        }

        // Handle URL verification challenge
        if (payload.type === 'url_verification') {
            return {
                challenge: payload.challenge
            };
        }

        // Handle event callback
        if (payload.type === 'event_callback') {
            const event = payload.event;

            // Process different event types
            switch (event.type) {
                case 'message':
                    await this.handleMessageEvent(event, payload.team_id);
                    break;
                case 'app_mention':
                    await this.handleAppMention(event, payload.team_id);
                    break;
                default:
                    logger.debug('Unhandled Slack event type', { type: event.type });
            }
        }

        return { success: true };
    }

    /**
     * Verify webhook signature from Slack
     */
    verifyWebhookSignature(payload, headers) {
        const timestamp = headers['x-slack-request-timestamp'];
        const signature = headers['x-slack-signature'];

        if (!timestamp || !signature) {
            return false;
        }

        // Prevent replay attacks
        const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
        if (parseInt(timestamp) < fiveMinutesAgo) {
            return false;
        }

        // Compute expected signature
        const sigBasestring = `v0:${timestamp}:${JSON.stringify(payload)}`;
        const hmac = crypto.createHmac('sha256', SLACK_SIGNING_SECRET);
        hmac.update(sigBasestring);
        const expectedSignature = `v0=${hmac.digest('hex')}`;

        // Compare signatures
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }

    /**
     * Handle message event from Slack
     */
    async handleMessageEvent(event, teamId) {
        logger.info('Slack message received', { teamId, channel: event.channel });

        // Find integration by team ID
        const integration = await SlackIntegration.findByTeamId(teamId);

        if (!integration) {
            logger.warn('No integration found for team', { teamId });
            return;
        }

        // Process message (e.g., create task, log interaction, etc.)
        // Implementation depends on your business logic
    }

    /**
     * Handle app mention event from Slack
     */
    async handleAppMention(event, teamId) {
        logger.info('App mentioned in Slack', { teamId, channel: event.channel });

        // Auto-respond to mentions if configured
        // Implementation depends on your business logic
    }

    // ═══════════════════════════════════════════════════════════════
    // SETTINGS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Update sync settings
     * @param {string} firmId - Firm ID
     * @param {object} settings - Settings to update
     * @returns {object} Updated integration
     */
    async updateSettings(firmId, settings) {
        const integration = await SlackIntegration.findActiveIntegration(firmId);

        if (!integration) {
            throw CustomException('Slack not connected', 404);
        }

        // Update notification preferences
        if (settings.notifications) {
            await integration.updateNotificationPreferences(settings.notifications);
        }

        // Update default channel
        if (settings.defaultChannelId) {
            integration.syncSettings.defaultChannelId = settings.defaultChannelId;
            integration.syncSettings.defaultChannelName = settings.defaultChannelName;
        }

        // Update other settings
        if (settings.mentionOnUrgent !== undefined) {
            integration.syncSettings.mentionOnUrgent = settings.mentionOnUrgent;
        }

        if (settings.useThreads !== undefined) {
            integration.syncSettings.useThreads = settings.useThreads;
        }

        await integration.save();

        logger.info('Slack settings updated', { firmId });

        return {
            success: true,
            settings: integration.syncSettings
        };
    }

    /**
     * Get connection status
     * @param {string} firmId - Firm ID
     * @returns {object} Status
     */
    async getStatus(firmId) {
        const integration = await SlackIntegration.findOne({ firmId });

        if (!integration) {
            return {
                connected: false
            };
        }

        return {
            connected: integration.isActive,
            teamName: integration.teamName,
            teamId: integration.teamId,
            connectedAt: integration.connectedAt,
            lastSyncAt: integration.lastSyncAt,
            stats: integration.stats,
            settings: integration.syncSettings
        };
    }

    /**
     * Test Slack connection
     * @param {string} firmId - Firm ID
     * @returns {object} Test result
     */
    async testConnection(firmId) {
        const integration = await SlackIntegration.findActiveIntegration(firmId);

        if (!integration) {
            throw CustomException('Slack not connected', 404);
        }

        try {
            const client = this.createClient(integration.accessToken);

            // Test authentication
            const authTest = await client.auth.test();

            if (!authTest.ok) {
                throw new Error('Authentication test failed');
            }

            // Try sending a test message
            const testChannelId = integration.syncSettings.defaultChannelId;
            if (testChannelId) {
                await this.sendMessage(firmId, testChannelId, 'Test message from TRAF3LI - Slack integration working!', {
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: ':white_check_mark: *Test Successful*\n\nYour TRAF3LI Slack integration is working correctly!'
                            }
                        }
                    ]
                });
            }

            logger.info('Slack connection test successful', { firmId });

            return {
                success: true,
                message: 'Slack connection is working',
                teamName: authTest.team,
                user: authTest.user
            };
        } catch (error) {
            logger.error('Slack connection test failed', {
                error: error.message,
                firmId
            });

            throw CustomException('Slack connection test failed', 500);
        }
    }
}

module.exports = new SlackService();
