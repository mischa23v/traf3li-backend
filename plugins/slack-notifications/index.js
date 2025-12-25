/**
 * Slack Notifications Plugin
 *
 * Sends notifications to Slack channels when specific events occur.
 */

const axios = require('axios');

module.exports = {
    name: 'slack-notifications',
    version: '1.0.0',
    author: 'Traf3li Team',

    /**
     * Initialize plugin with firm settings
     */
    initialize: async (settings) => {
        console.log('[Slack Plugin] Initialized with webhook URL:', settings.webhookUrl ? 'configured' : 'not configured');

        // Validate webhook URL
        if (settings.webhookUrl && !settings.webhookUrl.startsWith('https://hooks.slack.com/')) {
            throw new Error('Invalid Slack webhook URL');
        }

        return {
            success: true,
            message: 'Slack notifications plugin initialized'
        };
    },

    /**
     * Send message to Slack
     */
    sendSlackMessage: async (webhookUrl, message) => {
        try {
            await axios.post(webhookUrl, {
                text: message.text,
                attachments: message.attachments || [],
                channel: message.channel,
                username: message.username || 'Traf3li',
                icon_emoji: message.icon_emoji || ':office:'
            });
            return { success: true };
        } catch (error) {
            console.error('[Slack Plugin] Error sending message:', error.message);
            throw error;
        }
    },

    /**
     * Hook handlers
     */
    hooks: {
        /**
         * Case created event
         */
        'case:created': async (data, firmId, settings) => {
            if (!settings.webhookUrl) {
                console.log('[Slack Plugin] Webhook URL not configured');
                return;
            }

            if (!settings.notifyOnCaseCreated) {
                return;
            }

            const message = {
                text: `New case created: ${data.title}`,
                attachments: [
                    {
                        color: '#36a64f',
                        fields: [
                            {
                                title: 'Case Number',
                                value: data.caseNumber,
                                short: true
                            },
                            {
                                title: 'Client',
                                value: data.clientName,
                                short: true
                            },
                            {
                                title: 'Status',
                                value: data.status,
                                short: true
                            },
                            {
                                title: 'Assigned To',
                                value: data.assignedTo,
                                short: true
                            }
                        ]
                    }
                ]
            };

            await module.exports.sendSlackMessage(settings.webhookUrl, message);
        },

        /**
         * Invoice paid event
         */
        'invoice:paid': async (data, firmId, settings) => {
            if (!settings.webhookUrl) {
                return;
            }

            if (!settings.notifyOnInvoicePaid) {
                return;
            }

            const message = {
                text: `:moneybag: Invoice paid!`,
                attachments: [
                    {
                        color: '#2eb886',
                        fields: [
                            {
                                title: 'Invoice Number',
                                value: data.invoiceNumber,
                                short: true
                            },
                            {
                                title: 'Client',
                                value: data.clientName,
                                short: true
                            },
                            {
                                title: 'Amount',
                                value: `${data.amount} ${data.currency}`,
                                short: true
                            },
                            {
                                title: 'Payment Method',
                                value: data.paymentMethod,
                                short: true
                            }
                        ]
                    }
                ]
            };

            await module.exports.sendSlackMessage(settings.webhookUrl, message);
        },

        /**
         * Task overdue event
         */
        'task:overdue': async (data, firmId, settings) => {
            if (!settings.webhookUrl) {
                return;
            }

            if (!settings.notifyOnTaskOverdue) {
                return;
            }

            const message = {
                text: `:warning: Task overdue!`,
                attachments: [
                    {
                        color: 'danger',
                        fields: [
                            {
                                title: 'Task',
                                value: data.title,
                                short: false
                            },
                            {
                                title: 'Case',
                                value: data.caseName,
                                short: true
                            },
                            {
                                title: 'Assigned To',
                                value: data.assignedTo,
                                short: true
                            },
                            {
                                title: 'Due Date',
                                value: data.dueDate,
                                short: true
                            }
                        ]
                    }
                ]
            };

            await module.exports.sendSlackMessage(settings.webhookUrl, message);
        }
    },

    /**
     * Custom routes
     */
    routes: {
        /**
         * Test Slack connection
         */
        testConnection: async (req, res) => {
            const { webhookUrl } = req.body;

            if (!webhookUrl) {
                return res.status(400).json({
                    success: false,
                    message: 'Webhook URL is required'
                });
            }

            try {
                await module.exports.sendSlackMessage(webhookUrl, {
                    text: 'Test message from Traf3li! :white_check_mark:',
                    attachments: [
                        {
                            color: '#36a64f',
                            text: 'Your Slack integration is working correctly!'
                        }
                    ]
                });

                res.json({
                    success: true,
                    message: 'Test message sent to Slack successfully'
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: 'Failed to send test message',
                    error: error.message
                });
            }
        }
    }
};
