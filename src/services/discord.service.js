const axios = require('axios');
const crypto = require('crypto');
const DiscordIntegration = require('../models/discordIntegration.model');
const { encrypt, decrypt } = require('../utils/encryption');
const { CustomException } = require('../utils');
const logger = require('../utils/contextLogger');
const cacheService = require('./cache.service');

const DISCORD_API_BASE = 'https://discord.com/api/v10';
const DISCORD_CDN_BASE = 'https://cdn.discordapp.com';

// OAuth configuration
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || `${process.env.BACKEND_URL}/api/integrations/discord/callback`;

// Discord OAuth scopes
const OAUTH_SCOPES = [
    'identify',
    'guilds',
    'guilds.members.read',
    'webhook.incoming'
];

class DiscordService {
    /**
     * Generate Discord OAuth authorization URL
     * @param {string} firmId - Firm ID
     * @param {string} userId - User ID
     * @returns {Promise<string>} Authorization URL
     */
    async getAuthUrl(firmId, userId) {
        if (!DISCORD_CLIENT_ID) {
            throw CustomException('Discord integration is not configured. Missing DISCORD_CLIENT_ID.', 500);
        }

        // Generate state for CSRF protection (server-side stored)
        const state = await this.generateState(firmId, userId);

        const params = new URLSearchParams({
            client_id: DISCORD_CLIENT_ID,
            redirect_uri: DISCORD_REDIRECT_URI,
            response_type: 'code',
            scope: OAUTH_SCOPES.join(' '),
            state,
            prompt: 'consent'
        });

        return `${DISCORD_API_BASE}/oauth2/authorize?${params.toString()}`;
    }

    /**
     * Generate state token for OAuth CSRF protection
     * @param {string} firmId - Firm ID
     * @param {string} userId - User ID
     * @returns {Promise<string>} State token (cryptographically secure random string)
     */
    async generateState(firmId, userId) {
        // Generate cryptographically secure random state token (32 bytes = 64 hex chars)
        const state = crypto.randomBytes(32).toString('hex');

        // Store state in cache with metadata (15 minutes TTL)
        const key = `discord:oauth:state:${state}`;
        const data = {
            firmId,
            userId,
            timestamp: Date.now()
        };

        await cacheService.set(key, data, 900); // 15 minutes TTL

        logger.debug('Discord OAuth state generated and stored', {
            firmId,
            userId,
            stateLength: state.length
        });

        return state;
    }

    /**
     * Verify and consume state token (one-time use for CSRF protection)
     * @param {string} state - State token
     * @returns {Promise<object>} Decoded state data or throws error
     */
    async verifyState(state) {
        try {
            if (!state || typeof state !== 'string') {
                throw new Error('State parameter is required');
            }

            // Retrieve state data from cache
            const key = `discord:oauth:state:${state}`;
            const data = await cacheService.get(key);

            if (!data) {
                logger.error('Discord OAuth state not found or expired - possible CSRF attack', {
                    stateLength: state?.length
                });
                throw new Error('Invalid or expired state token');
            }

            // Delete state after verification (one-time use - prevents replay attacks)
            await cacheService.del(key);

            logger.debug('Discord OAuth state verified and consumed', {
                firmId: data.firmId,
                userId: data.userId,
                age: Date.now() - data.timestamp
            });

            return data;
        } catch (error) {
            logger.error('Failed to verify Discord OAuth state', {
                error: error.message,
                stateValid: typeof state === 'string' && state.length === 64
            });
            throw CustomException('Invalid or expired state token - CSRF validation failed', 400);
        }
    }

    /**
     * Exchange authorization code for access token
     * @param {string} code - Authorization code
     * @returns {object} Token response
     */
    async exchangeCode(code) {
        if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
            throw CustomException('Discord integration is not configured', 500);
        }

        try {
            const params = new URLSearchParams({
                client_id: DISCORD_CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: DISCORD_REDIRECT_URI
            });

            const response = await axios.post(
                `${DISCORD_API_BASE}/oauth2/token`,
                params.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            return response.data;
        } catch (error) {
            logger.error('Failed to exchange Discord authorization code', {
                error: error.response?.data || error.message
            });
            throw CustomException('Failed to exchange authorization code', 400);
        }
    }

    /**
     * Refresh access token
     * @param {string} refreshToken - Encrypted refresh token
     * @returns {object} New token response
     */
    async refreshToken(refreshToken) {
        if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
            throw CustomException('Discord integration is not configured', 500);
        }

        try {
            // Decrypt refresh token
            const decryptedToken = decrypt(refreshToken);

            const params = new URLSearchParams({
                client_id: DISCORD_CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: decryptedToken
            });

            const response = await axios.post(
                `${DISCORD_API_BASE}/oauth2/token`,
                params.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            return response.data;
        } catch (error) {
            logger.error('Failed to refresh Discord token', {
                error: error.response?.data || error.message
            });
            throw CustomException('Failed to refresh access token', 400);
        }
    }

    /**
     * Get user's Discord guilds (servers)
     * @param {string} accessToken - Encrypted access token
     * @returns {array} List of guilds
     */
    async listGuilds(accessToken) {
        try {
            const decryptedToken = decrypt(accessToken);

            const response = await axios.get(
                `${DISCORD_API_BASE}/users/@me/guilds`,
                {
                    headers: {
                        Authorization: `Bearer ${decryptedToken}`
                    }
                }
            );

            return response.data.map(guild => ({
                id: guild.id,
                name: guild.name,
                icon: guild.icon ? `${DISCORD_CDN_BASE}/icons/${guild.id}/${guild.icon}.png` : null,
                owner: guild.owner,
                permissions: guild.permissions
            }));
        } catch (error) {
            logger.error('Failed to list Discord guilds', {
                error: error.response?.data || error.message
            });
            throw CustomException('Failed to retrieve Discord servers', 400);
        }
    }

    /**
     * Get channels in a guild
     * @param {string} accessToken - Encrypted access token
     * @param {string} guildId - Guild ID
     * @returns {array} List of channels
     */
    async listChannels(accessToken, guildId) {
        try {
            const decryptedToken = decrypt(accessToken);

            const response = await axios.get(
                `${DISCORD_API_BASE}/guilds/${guildId}/channels`,
                {
                    headers: {
                        Authorization: `Bearer ${decryptedToken}`
                    }
                }
            );

            // Filter text channels only
            return response.data
                .filter(channel => channel.type === 0 || channel.type === 5) // Text or announcement
                .map(channel => ({
                    id: channel.id,
                    name: channel.name,
                    type: channel.type,
                    position: channel.position,
                    parentId: channel.parent_id
                }))
                .sort((a, b) => a.position - b.position);
        } catch (error) {
            logger.error('Failed to list Discord channels', {
                guildId,
                error: error.response?.data || error.message
            });
            throw CustomException('Failed to retrieve Discord channels', 400);
        }
    }

    /**
     * Create webhook in a channel
     * @param {string} accessToken - Encrypted access token
     * @param {string} channelId - Channel ID
     * @param {string} name - Webhook name
     * @returns {object} Webhook data
     */
    async createWebhook(accessToken, channelId, name = 'Traf3li Notifications') {
        try {
            const decryptedToken = decrypt(accessToken);

            const response = await axios.post(
                `${DISCORD_API_BASE}/channels/${channelId}/webhooks`,
                { name },
                {
                    headers: {
                        Authorization: `Bearer ${decryptedToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const webhook = response.data;
            return {
                id: webhook.id,
                token: webhook.token,
                url: webhook.url,
                channelId: webhook.channel_id,
                guildId: webhook.guild_id,
                name: webhook.name
            };
        } catch (error) {
            logger.error('Failed to create Discord webhook', {
                channelId,
                error: error.response?.data || error.message
            });
            throw CustomException('Failed to create webhook in Discord channel', 400);
        }
    }

    /**
     * Send message via webhook
     * @param {string} webhookUrl - Encrypted webhook URL
     * @param {string} webhookToken - Encrypted webhook token
     * @param {string} content - Message content
     * @param {object} options - Additional options
     * @returns {object} Response
     */
    async sendMessage(webhookUrl, webhookToken, content, options = {}) {
        try {
            const decryptedUrl = decrypt(webhookUrl);
            const decryptedToken = decrypt(webhookToken);

            const payload = {
                content,
                username: options.username || 'Traf3li',
                avatar_url: options.avatarUrl,
                tts: options.tts || false
            };

            const response = await axios.post(decryptedUrl, payload, {
                params: { wait: true },
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            logger.error('Failed to send Discord message', {
                error: error.response?.data || error.message
            });
            throw CustomException('Failed to send message to Discord', 400);
        }
    }

    /**
     * Send embed message (rich notification)
     * @param {string} webhookUrl - Encrypted webhook URL
     * @param {string} webhookToken - Encrypted webhook token
     * @param {object} embed - Embed data
     * @param {object} options - Additional options
     * @returns {object} Response
     */
    async sendEmbed(webhookUrl, webhookToken, embed, options = {}) {
        try {
            const decryptedUrl = decrypt(webhookUrl);
            const decryptedToken = decrypt(webhookToken);

            const payload = {
                username: options.username || 'Traf3li',
                avatar_url: options.avatarUrl,
                embeds: [embed]
            };

            // Add role mention if specified
            if (options.mentionRole) {
                payload.content = `<@&${options.mentionRole}>`;
            }

            const response = await axios.post(decryptedUrl, payload, {
                params: { wait: true },
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            logger.error('Failed to send Discord embed', {
                error: error.response?.data || error.message
            });
            throw CustomException('Failed to send notification to Discord', 400);
        }
    }

    /**
     * Post case update notification
     * @param {string} firmId - Firm ID
     * @param {string} eventType - Event type (case_created, case_updated, etc.)
     * @param {object} data - Event data
     */
    async postCaseNotification(firmId, eventType, data) {
        try {
            const integration = await DiscordIntegration.getActiveFirmIntegration(firmId);

            if (!integration) {
                logger.debug('No active Discord integration for firm', { firmId });
                return null;
            }

            // Check if this event type is enabled
            const eventKey = this.getEventKey(eventType);
            if (!integration.syncSettings.events[eventKey]) {
                logger.debug('Discord notification disabled for event', { firmId, eventType });
                return null;
            }

            // Check rate limiting
            if (!integration.canSendNotification || !integration.canSendNotification()) {
                logger.warn('Discord rate limit exceeded for firm', { firmId });
                return null;
            }

            // Build embed based on event type
            const embed = this.buildCaseEmbed(eventType, data, integration.syncSettings);

            // Send notification
            const result = await this.sendEmbed(
                integration.webhookUrl,
                integration.webhookToken,
                embed,
                {
                    mentionRole: integration.syncSettings.mentionRole
                }
            );

            // Record success
            const doc = await DiscordIntegration.findById(integration._id);
            if (doc) {
                await doc.recordSuccess();
            }

            return result;
        } catch (error) {
            logger.error('Failed to post Discord notification', {
                firmId,
                eventType,
                error: error.message
            });

            // Record failure
            try {
                const integration = await DiscordIntegration.findOne({ firmId });
                if (integration) {
                    await integration.recordFailure(error);
                }
            } catch (recordError) {
                logger.error('Failed to record Discord notification failure', {
                    error: recordError.message
                });
            }

            throw error;
        }
    }

    /**
     * Get event key from event type
     */
    getEventKey(eventType) {
        const eventMap = {
            'case.created': 'caseCreated',
            'case.updated': 'caseUpdated',
            'case.status_changed': 'caseStatusChanged',
            'case.assigned': 'caseAssigned',
            'case.deadline_approaching': 'deadlineApproaching',
            'task.created': 'taskCreated',
            'task.completed': 'taskCompleted',
            'document.uploaded': 'documentUploaded',
            'payment.received': 'paymentReceived',
            'appointment.scheduled': 'appointmentScheduled'
        };

        return eventMap[eventType] || 'caseUpdated';
    }

    /**
     * Build Discord embed for case event
     */
    buildCaseEmbed(eventType, data, settings) {
        const embed = {
            color: parseInt(settings.embedColor.replace('#', ''), 16),
            timestamp: new Date().toISOString()
        };

        switch (eventType) {
            case 'case.created':
                embed.title = '📋 New Case Created';
                embed.description = `Case **${data.caseNumber}** has been created`;
                embed.fields = [
                    { name: 'Case Number', value: data.caseNumber, inline: true },
                    { name: 'Client', value: data.clientName || 'N/A', inline: true },
                    { name: 'Type', value: data.caseType || 'N/A', inline: true }
                ];
                if (data.assignedTo) {
                    embed.fields.push({ name: 'Assigned To', value: data.assignedTo, inline: true });
                }
                break;

            case 'case.updated':
                embed.title = '📝 Case Updated';
                embed.description = `Case **${data.caseNumber}** has been updated`;
                embed.fields = [
                    { name: 'Case Number', value: data.caseNumber, inline: true },
                    { name: 'Updated By', value: data.updatedBy || 'System', inline: true }
                ];
                if (settings.includeDetails && data.changes) {
                    embed.fields.push({ name: 'Changes', value: data.changes, inline: false });
                }
                break;

            case 'case.status_changed':
                embed.title = '🔄 Case Status Changed';
                embed.description = `Case **${data.caseNumber}** status updated`;
                embed.fields = [
                    { name: 'Case Number', value: data.caseNumber, inline: true },
                    { name: 'New Status', value: data.newStatus || 'N/A', inline: true }
                ];
                if (data.oldStatus) {
                    embed.fields.push({ name: 'Previous Status', value: data.oldStatus, inline: true });
                }
                break;

            case 'case.assigned':
                embed.title = '👤 Case Assigned';
                embed.description = `Case **${data.caseNumber}** has been assigned`;
                embed.fields = [
                    { name: 'Case Number', value: data.caseNumber, inline: true },
                    { name: 'Assigned To', value: data.assignedTo || 'N/A', inline: true },
                    { name: 'Assigned By', value: data.assignedBy || 'System', inline: true }
                ];
                break;

            case 'case.deadline_approaching':
                embed.title = '⏰ Deadline Approaching';
                embed.description = `Case **${data.caseNumber}** has an upcoming deadline`;
                embed.color = 0xFF6B6B; // Red color for urgency
                embed.fields = [
                    { name: 'Case Number', value: data.caseNumber, inline: true },
                    { name: 'Deadline', value: data.deadline || 'N/A', inline: true },
                    { name: 'Days Remaining', value: data.daysRemaining?.toString() || 'N/A', inline: true }
                ];
                break;

            case 'task.created':
                embed.title = '✅ New Task Created';
                embed.description = data.taskTitle || 'A new task has been created';
                embed.fields = [
                    { name: 'Case Number', value: data.caseNumber, inline: true },
                    { name: 'Assigned To', value: data.assignedTo || 'Unassigned', inline: true }
                ];
                if (data.dueDate) {
                    embed.fields.push({ name: 'Due Date', value: data.dueDate, inline: true });
                }
                break;

            case 'task.completed':
                embed.title = '✔️ Task Completed';
                embed.description = data.taskTitle || 'A task has been completed';
                embed.color = 0x43B581; // Green color for success
                embed.fields = [
                    { name: 'Case Number', value: data.caseNumber, inline: true },
                    { name: 'Completed By', value: data.completedBy || 'N/A', inline: true }
                ];
                break;

            case 'payment.received':
                embed.title = '💰 Payment Received';
                embed.description = `Payment received for case **${data.caseNumber}**`;
                embed.color = 0x43B581; // Green color
                embed.fields = [
                    { name: 'Case Number', value: data.caseNumber, inline: true },
                    { name: 'Amount', value: data.amount || 'N/A', inline: true },
                    { name: 'Payment Method', value: data.paymentMethod || 'N/A', inline: true }
                ];
                break;

            default:
                embed.title = '📢 Case Notification';
                embed.description = `Update for case **${data.caseNumber}**`;
                embed.fields = [
                    { name: 'Event', value: eventType, inline: true },
                    { name: 'Case Number', value: data.caseNumber, inline: true }
                ];
        }

        // Add case URL if available
        if (data.caseUrl) {
            embed.url = data.caseUrl;
        }

        return embed;
    }

    /**
     * Test webhook connection
     * @param {string} firmId - Firm ID
     * @returns {object} Test result
     */
    async testConnection(firmId) {
        const integration = await DiscordIntegration.getActiveFirmIntegration(firmId);

        if (!integration) {
            throw CustomException('No Discord integration found for this firm', 404);
        }

        try {
            const embed = {
                title: '✅ Discord Integration Test',
                description: 'Your Traf3li Discord integration is working correctly!',
                color: parseInt(integration.syncSettings.embedColor.replace('#', ''), 16),
                timestamp: new Date().toISOString(),
                fields: [
                    { name: 'Guild', value: integration.guildName, inline: true },
                    { name: 'Channel', value: integration.webhookChannelName, inline: true }
                ]
            };

            await this.sendEmbed(integration.webhookUrl, integration.webhookToken, embed);

            return {
                success: true,
                message: 'Test notification sent successfully'
            };
        } catch (error) {
            logger.error('Discord connection test failed', {
                firmId,
                error: error.message
            });

            return {
                success: false,
                message: 'Failed to send test notification',
                error: error.message
            };
        }
    }

    /**
     * Disconnect Discord integration
     * @param {string} firmId - Firm ID
     */
    async disconnect(firmId) {
        const integration = await DiscordIntegration.findOne({ firmId });

        if (!integration) {
            throw CustomException('No Discord integration found', 404);
        }

        integration.isActive = false;
        integration.metadata.set('disconnectedAt', new Date());
        await integration.save();

        return {
            success: true,
            message: 'Discord integration disconnected successfully'
        };
    }
}

module.exports = new DiscordService();
