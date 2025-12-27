const TelegramIntegration = require('../models/telegramIntegration.model');
const axios = require('axios');
const logger = require('../utils/logger');
const { wrapExternalCall } = require('../utils/externalServiceWrapper');
const crypto = require('crypto');

/**
 * Telegram Bot Service
 *
 * Provides integration with Telegram Bot API for sending notifications,
 * receiving messages, and handling bot commands.
 *
 * Features:
 * - Send text messages, photos, documents
 * - Set and remove webhooks
 * - Handle incoming updates
 * - Parse and execute bot commands
 * - Format notifications for different event types
 */

class TelegramService {
    constructor() {
        this.baseUrl = 'https://api.telegram.org';
    }

    // ═══════════════════════════════════════════════════════════
    // BOT CONFIGURATION
    // ═══════════════════════════════════════════════════════════

    /**
     * Get bot info from Telegram API
     */
    async getBotInfo(botToken) {
        try {
            const url = `${this.baseUrl}/bot${botToken}/getMe`;

            const response = await wrapExternalCall('telegram', async () => {
                return await axios.get(url);
            });

            if (!response.data.ok) {
                throw new Error(response.data.description || 'Failed to get bot info');
            }

            return response.data.result;
        } catch (error) {
            logger.error('Error getting bot info:', error);
            throw new Error(`Failed to get bot info: ${error.message}`);
        }
    }

    /**
     * Set webhook URL
     */
    async setWebhook(botToken, webhookUrl, options = {}) {
        try {
            const url = `${this.baseUrl}/bot${botToken}/setWebhook`;

            const payload = {
                url: webhookUrl,
                max_connections: options.maxConnections || 40,
                allowed_updates: options.allowedUpdates || ['message', 'callback_query', 'inline_query']
            };

            if (options.secretToken) {
                payload.secret_token = options.secretToken;
            }

            const response = await wrapExternalCall('telegram', async () => {
                return await axios.post(url, payload);
            });

            if (!response.data.ok) {
                throw new Error(response.data.description || 'Failed to set webhook');
            }

            return response.data.result;
        } catch (error) {
            logger.error('Error setting webhook:', error);
            throw new Error(`Failed to set webhook: ${error.message}`);
        }
    }

    /**
     * Remove webhook (use for polling or disconnect)
     */
    async deleteWebhook(botToken) {
        try {
            const url = `${this.baseUrl}/bot${botToken}/deleteWebhook`;

            const response = await wrapExternalCall('telegram', async () => {
                return await axios.post(url, { drop_pending_updates: true });
            });

            if (!response.data.ok) {
                throw new Error(response.data.description || 'Failed to delete webhook');
            }

            return response.data.result;
        } catch (error) {
            logger.error('Error deleting webhook:', error);
            throw new Error(`Failed to delete webhook: ${error.message}`);
        }
    }

    /**
     * Get webhook info
     */
    async getWebhookInfo(botToken) {
        try {
            const url = `${this.baseUrl}/bot${botToken}/getWebhookInfo`;

            const response = await wrapExternalCall('telegram', async () => {
                return await axios.get(url);
            });

            if (!response.data.ok) {
                throw new Error(response.data.description || 'Failed to get webhook info');
            }

            return response.data.result;
        } catch (error) {
            logger.error('Error getting webhook info:', error);
            throw new Error(`Failed to get webhook info: ${error.message}`);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // MESSAGE SENDING
    // ═══════════════════════════════════════════════════════════

    /**
     * Send text message
     */
    async sendMessage(botToken, chatId, text, options = {}) {
        try {
            const url = `${this.baseUrl}/bot${botToken}/sendMessage`;

            const payload = {
                chat_id: chatId,
                text: this.truncateMessage(text),
                parse_mode: options.parseMode || 'HTML',
                disable_web_page_preview: options.disableWebPagePreview || false,
                disable_notification: options.disableNotification || false
            };

            if (options.replyToMessageId) {
                payload.reply_to_message_id = options.replyToMessageId;
            }

            if (options.replyMarkup) {
                payload.reply_markup = options.replyMarkup;
            }

            const response = await wrapExternalCall('telegram', async () => {
                return await axios.post(url, payload);
            });

            if (!response.data.ok) {
                throw new Error(response.data.description || 'Failed to send message');
            }

            return response.data.result;
        } catch (error) {
            logger.error('Error sending message:', error);
            throw new Error(`Failed to send message: ${error.message}`);
        }
    }

    /**
     * Send photo
     */
    async sendPhoto(botToken, chatId, photo, options = {}) {
        try {
            const url = `${this.baseUrl}/bot${botToken}/sendPhoto`;

            const payload = {
                chat_id: chatId,
                photo: photo, // Can be file_id, URL, or file upload
                caption: options.caption ? this.truncateMessage(options.caption, 1024) : undefined,
                parse_mode: options.parseMode || 'HTML',
                disable_notification: options.disableNotification || false
            };

            const response = await wrapExternalCall('telegram', async () => {
                return await axios.post(url, payload);
            });

            if (!response.data.ok) {
                throw new Error(response.data.description || 'Failed to send photo');
            }

            return response.data.result;
        } catch (error) {
            logger.error('Error sending photo:', error);
            throw new Error(`Failed to send photo: ${error.message}`);
        }
    }

    /**
     * Send document
     */
    async sendDocument(botToken, chatId, document, options = {}) {
        try {
            const url = `${this.baseUrl}/bot${botToken}/sendDocument`;

            const payload = {
                chat_id: chatId,
                document: document, // Can be file_id, URL, or file upload
                caption: options.caption ? this.truncateMessage(options.caption, 1024) : undefined,
                parse_mode: options.parseMode || 'HTML',
                disable_notification: options.disableNotification || false
            };

            if (options.fileName) {
                payload.filename = options.fileName;
            }

            const response = await wrapExternalCall('telegram', async () => {
                return await axios.post(url, payload);
            });

            if (!response.data.ok) {
                throw new Error(response.data.description || 'Failed to send document');
            }

            return response.data.result;
        } catch (error) {
            logger.error('Error sending document:', error);
            throw new Error(`Failed to send document: ${error.message}`);
        }
    }

    /**
     * Get updates (polling mode - fallback when webhook isn't set)
     */
    async getUpdates(botToken, offset = 0, limit = 100) {
        try {
            const url = `${this.baseUrl}/bot${botToken}/getUpdates`;

            const payload = {
                offset,
                limit,
                timeout: 30,
                allowed_updates: ['message', 'callback_query', 'inline_query']
            };

            const response = await wrapExternalCall('telegram', async () => {
                return await axios.post(url, payload, { timeout: 35000 });
            });

            if (!response.data.ok) {
                throw new Error(response.data.description || 'Failed to get updates');
            }

            return response.data.result;
        } catch (error) {
            logger.error('Error getting updates:', error);
            throw new Error(`Failed to get updates: ${error.message}`);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // NOTIFICATION FORMATTING
    // ═══════════════════════════════════════════════════════════

    /**
     * Format and send notification based on event type
     */
    async sendNotification(firmId, eventType, eventData) {
        try {
            const integration = await TelegramIntegration.getByFirm(firmId);

            if (!integration || !integration.isActive) {
                logger.info(`No active Telegram integration for firm ${firmId}`);
                return null;
            }

            // Check if notification is enabled
            if (!integration.isNotificationEnabled(eventType)) {
                logger.info(`Notification type ${eventType} is disabled for firm ${firmId}`);
                return null;
            }

            // Check notification schedule
            if (!integration.isWithinNotificationSchedule()) {
                logger.info(`Outside notification schedule for firm ${firmId}`);
                return null;
            }

            // Get target chat ID
            const chatId = eventData.chatId || integration.defaultChatId;
            if (!chatId) {
                logger.warn(`No chat ID available for notification to firm ${firmId}`);
                return null;
            }

            // Format message based on event type
            const message = this.formatNotificationMessage(eventType, eventData);

            // Send message
            const result = await this.sendMessage(
                integration.botToken,
                chatId,
                message,
                { parseMode: 'HTML', disableWebPagePreview: true }
            );

            // Update stats
            integration.stats.notificationsSent += 1;
            await integration.save();

            return result;
        } catch (error) {
            logger.error('Error sending notification:', error);

            // Record error in integration
            const integration = await TelegramIntegration.findOne({ firmId });
            if (integration) {
                await integration.recordError(error);
            }

            throw error;
        }
    }

    /**
     * Format notification message based on event type
     */
    formatNotificationMessage(eventType, data) {
        switch (eventType) {
            case 'caseCreated':
                return `📋 <b>New Case Created</b>\n\n` +
                       `<b>Case:</b> ${this.escape(data.caseNumber)}\n` +
                       `<b>Title:</b> ${this.escape(data.title || 'N/A')}\n` +
                       `<b>Client:</b> ${this.escape(data.clientName || 'N/A')}\n` +
                       `<b>Status:</b> ${this.escape(data.status || 'New')}`;

            case 'caseStatusChanged':
                return `🔄 <b>Case Status Changed</b>\n\n` +
                       `<b>Case:</b> ${this.escape(data.caseNumber)}\n` +
                       `<b>Old Status:</b> ${this.escape(data.oldStatus)}\n` +
                       `<b>New Status:</b> ${this.escape(data.newStatus)}`;

            case 'caseHearing':
                return `⚖️ <b>Upcoming Hearing</b>\n\n` +
                       `<b>Case:</b> ${this.escape(data.caseNumber)}\n` +
                       `<b>Date:</b> ${this.escape(data.hearingDate)}\n` +
                       `<b>Court:</b> ${this.escape(data.courtName || 'N/A')}\n` +
                       `<b>Notes:</b> ${this.escape(data.notes || 'None')}`;

            case 'invoiceCreated':
                return `🧾 <b>New Invoice Created</b>\n\n` +
                       `<b>Invoice:</b> ${this.escape(data.invoiceNumber)}\n` +
                       `<b>Client:</b> ${this.escape(data.clientName)}\n` +
                       `<b>Amount:</b> ${this.escape(data.amount)} ${this.escape(data.currency || 'SAR')}\n` +
                       `<b>Due Date:</b> ${this.escape(data.dueDate)}`;

            case 'invoicePaid':
                return `✅ <b>Invoice Paid</b>\n\n` +
                       `<b>Invoice:</b> ${this.escape(data.invoiceNumber)}\n` +
                       `<b>Amount:</b> ${this.escape(data.amount)} ${this.escape(data.currency || 'SAR')}\n` +
                       `<b>Payment Method:</b> ${this.escape(data.paymentMethod || 'N/A')}`;

            case 'invoiceOverdue':
                return `⚠️ <b>Invoice Overdue</b>\n\n` +
                       `<b>Invoice:</b> ${this.escape(data.invoiceNumber)}\n` +
                       `<b>Client:</b> ${this.escape(data.clientName)}\n` +
                       `<b>Amount:</b> ${this.escape(data.amount)} ${this.escape(data.currency || 'SAR')}\n` +
                       `<b>Days Overdue:</b> ${data.daysOverdue}`;

            case 'taskAssigned':
                return `✏️ <b>Task Assigned to You</b>\n\n` +
                       `<b>Task:</b> ${this.escape(data.title)}\n` +
                       `<b>Due Date:</b> ${this.escape(data.dueDate || 'Not set')}\n` +
                       `<b>Priority:</b> ${this.escape(data.priority || 'Normal')}\n` +
                       `<b>Assigned By:</b> ${this.escape(data.assignedBy)}`;

            case 'taskDue':
                return `⏰ <b>Task Due Soon</b>\n\n` +
                       `<b>Task:</b> ${this.escape(data.title)}\n` +
                       `<b>Due Date:</b> ${this.escape(data.dueDate)}\n` +
                       `<b>Priority:</b> ${this.escape(data.priority || 'Normal')}`;

            case 'taskOverdue':
                return `🚨 <b>Task Overdue</b>\n\n` +
                       `<b>Task:</b> ${this.escape(data.title)}\n` +
                       `<b>Due Date:</b> ${this.escape(data.dueDate)}\n` +
                       `<b>Days Overdue:</b> ${data.daysOverdue}`;

            case 'paymentReceived':
                return `💰 <b>Payment Received</b>\n\n` +
                       `<b>Amount:</b> ${this.escape(data.amount)} ${this.escape(data.currency || 'SAR')}\n` +
                       `<b>Client:</b> ${this.escape(data.clientName)}\n` +
                       `<b>Method:</b> ${this.escape(data.paymentMethod || 'N/A')}`;

            case 'leadCreated':
                return `🎯 <b>New Lead</b>\n\n` +
                       `<b>Name:</b> ${this.escape(data.name)}\n` +
                       `<b>Source:</b> ${this.escape(data.source || 'N/A')}\n` +
                       `<b>Phone:</b> ${this.escape(data.phone || 'N/A')}\n` +
                       `<b>Status:</b> ${this.escape(data.status || 'New')}`;

            case 'leadConverted':
                return `🎉 <b>Lead Converted to Client</b>\n\n` +
                       `<b>Lead:</b> ${this.escape(data.leadName)}\n` +
                       `<b>Client:</b> ${this.escape(data.clientName)}`;

            default:
                return `🔔 <b>Notification</b>\n\n${this.escape(JSON.stringify(data, null, 2))}`;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // WEBHOOK HANDLING
    // ═══════════════════════════════════════════════════════════

    /**
     * Handle incoming webhook update
     */
    async handleWebhook(firmId, update, secretToken) {
        try {
            const integration = await TelegramIntegration.getByFirm(firmId);

            if (!integration || !integration.isActive) {
                throw new Error('No active Telegram integration found');
            }

            // Verify webhook secret token - ALWAYS required if webhook is configured
            if (integration.webhookSecret) {
                if (!secretToken) {
                    logger.warn(`Webhook request missing secret token for firm ${firmId}`);
                    throw new Error('Missing webhook secret token');
                }
                if (secretToken !== integration.webhookSecret) {
                    logger.warn(`Invalid webhook secret token for firm ${firmId}`);
                    throw new Error('Invalid webhook secret token');
                }
            }

            // Update last received timestamp
            await integration.incrementMessageReceived();

            // Handle different update types
            if (update.message) {
                return await this.handleMessage(integration, update.message);
            } else if (update.callback_query) {
                return await this.handleCallbackQuery(integration, update.callback_query);
            } else if (update.inline_query) {
                return await this.handleInlineQuery(integration, update.inline_query);
            }

            return { success: true, message: 'Update received but not processed' };
        } catch (error) {
            logger.error('Error handling webhook:', error);
            throw error;
        }
    }

    /**
     * Handle incoming message
     */
    async handleMessage(integration, message) {
        try {
            const chatId = message.chat.id;
            const chatType = message.chat.type;
            const username = message.chat.username;
            const title = message.chat.title;

            // Add chat if not already known
            await integration.addChat(String(chatId), chatType, title, username);

            // Handle commands
            if (message.text && message.text.startsWith('/')) {
                return await this.handleCommand(integration, message);
            }

            // Handle regular messages
            const response = `Message received. Use /help to see available commands.`;
            await this.sendMessage(integration.botToken, chatId, response);

            return { success: true, type: 'message', chatId };
        } catch (error) {
            logger.error('Error handling message:', error);
            throw error;
        }
    }

    /**
     * Handle bot commands
     */
    async handleCommand(integration, message) {
        try {
            const chatId = message.chat.id;
            const text = message.text;
            const [command, ...args] = text.split(' ');

            await integration.incrementCommandProcessed();

            let response = '';

            switch (command.toLowerCase()) {
                case '/start':
                    response = `👋 <b>Welcome to ${integration.botName || 'Traf3li Bot'}!</b>\n\n` +
                               `This bot is connected to your law firm management system.\n\n` +
                               `Use /help to see available commands.`;
                    break;

                case '/help':
                    response = this.getHelpMessage(integration);
                    break;

                case '/status':
                    if (!integration.enabledCommands.status) {
                        response = '❌ This command is disabled.';
                    } else {
                        response = await this.getStatusMessage(integration);
                    }
                    break;

                case '/cases':
                    if (!integration.enabledCommands.cases) {
                        response = '❌ This command is disabled.';
                    } else {
                        response = await this.getCasesMessage(integration);
                    }
                    break;

                case '/tasks':
                    if (!integration.enabledCommands.tasks) {
                        response = '❌ This command is disabled.';
                    } else {
                        response = await this.getTasksMessage(integration);
                    }
                    break;

                case '/stats':
                    if (!integration.enabledCommands.stats) {
                        response = '❌ This command is disabled.';
                    } else {
                        response = this.getStatsMessage(integration);
                    }
                    break;

                default:
                    response = `❓ Unknown command: ${command}\n\nUse /help to see available commands.`;
            }

            await this.sendMessage(integration.botToken, chatId, response, { parseMode: 'HTML' });

            return { success: true, type: 'command', command, chatId };
        } catch (error) {
            logger.error('Error handling command:', error);
            throw error;
        }
    }

    /**
     * Get help message
     */
    getHelpMessage(integration) {
        let commands = [
            '/start - Start the bot',
            '/help - Show this help message'
        ];

        if (integration.enabledCommands.status) {
            commands.push('/status - Get system status');
        }
        if (integration.enabledCommands.cases) {
            commands.push('/cases - View recent cases');
        }
        if (integration.enabledCommands.tasks) {
            commands.push('/tasks - View pending tasks');
        }
        if (integration.enabledCommands.stats) {
            commands.push('/stats - View bot statistics');
        }

        return `<b>Available Commands:</b>\n\n${commands.join('\n')}`;
    }

    /**
     * Get status message
     */
    async getStatusMessage(integration) {
        return `✅ <b>System Status</b>\n\n` +
               `<b>Bot:</b> Active\n` +
               `<b>Notifications:</b> ${integration.isActive ? 'Enabled' : 'Disabled'}\n` +
               `<b>Connected Since:</b> ${integration.connectedAt.toLocaleDateString()}`;
    }

    /**
     * Get cases message (placeholder - implement based on your Case model)
     */
    async getCasesMessage(integration) {
        return `📋 <b>Recent Cases</b>\n\n` +
               `This feature will show your recent cases.\n` +
               `Feature coming soon!`;
    }

    /**
     * Get tasks message (placeholder - implement based on your Task model)
     */
    async getTasksMessage(integration) {
        return `✏️ <b>Pending Tasks</b>\n\n` +
               `This feature will show your pending tasks.\n` +
               `Feature coming soon!`;
    }

    /**
     * Get stats message
     */
    getStatsMessage(integration) {
        return `📊 <b>Bot Statistics</b>\n\n` +
               `<b>Messages Sent:</b> ${integration.stats.messagesSent}\n` +
               `<b>Messages Received:</b> ${integration.stats.messagesReceived}\n` +
               `<b>Commands Processed:</b> ${integration.stats.commandsProcessed}\n` +
               `<b>Notifications Sent:</b> ${integration.stats.notificationsSent}\n` +
               `<b>Errors:</b> ${integration.stats.errorCount}`;
    }

    /**
     * Handle callback query (button presses)
     */
    async handleCallbackQuery(integration, callbackQuery) {
        // Implement callback query handling if needed
        return { success: true, type: 'callback_query' };
    }

    /**
     * Handle inline query
     */
    async handleInlineQuery(integration, inlineQuery) {
        // Implement inline query handling if needed
        return { success: true, type: 'inline_query' };
    }

    // ═══════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════

    /**
     * Escape HTML special characters for Telegram
     */
    escape(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /**
     * Truncate message to Telegram's limit
     */
    truncateMessage(text, maxLength = 4096) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    /**
     * Generate random webhook secret
     */
    generateWebhookSecret() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Test connection by sending a test message
     */
    async testConnection(botToken, chatId) {
        try {
            const testMessage = '✅ <b>Test Message</b>\n\nYour Telegram bot is connected successfully!';

            const result = await this.sendMessage(botToken, chatId, testMessage, {
                parseMode: 'HTML'
            });

            return { success: true, result };
        } catch (error) {
            logger.error('Error testing connection:', error);
            throw new Error(`Connection test failed: ${error.message}`);
        }
    }
}

module.exports = new TelegramService();
