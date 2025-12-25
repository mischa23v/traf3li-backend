/**
 * Apps Service
 *
 * Unified service for managing all third-party app integrations.
 * Orchestrates connections across different integration types (Slack, Discord, etc.)
 * and provides a consistent API for the frontend.
 *
 * This service acts as a facade over individual integration services.
 */

const AppConnection = require('../models/appConnection.model');
const SlackIntegration = require('../models/slackIntegration.model');
const DiscordIntegration = require('../models/discordIntegration.model');
const TelegramIntegration = require('../models/telegramIntegration.model');
const ZoomIntegration = require('../models/zoomIntegration.model');
const GithubIntegration = require('../models/githubIntegration.model');
const GmailIntegration = require('../models/gmailIntegration.model');
const TrelloIntegration = require('../models/trelloIntegration.model');
const GoogleCalendarIntegration = require('../models/googleCalendarIntegration.model');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// APP REGISTRY - Define all available apps
// ═══════════════════════════════════════════════════════════════

const AVAILABLE_APPS = {
    // Communication Apps
    slack: {
        id: 'slack',
        name: 'Slack',
        description: 'Team communication and notifications',
        icon: 'https://cdn.worldvectorlogo.com/logos/slack-new-logo.svg',
        category: 'communication',
        model: SlackIntegration,
        modelName: 'SlackIntegration',
        hasOAuth: true,
        authUrl: '/api/integrations/slack/auth',
        features: ['notifications', 'channels', 'messages']
    },
    discord: {
        id: 'discord',
        name: 'Discord',
        description: 'Voice, video, and text communication',
        icon: 'https://cdn.worldvectorlogo.com/logos/discord-6.svg',
        category: 'communication',
        model: DiscordIntegration,
        modelName: 'DiscordIntegration',
        hasOAuth: true,
        authUrl: '/api/integrations/discord/auth-url',
        features: ['notifications', 'webhooks', 'channels']
    },
    telegram: {
        id: 'telegram',
        name: 'Telegram',
        description: 'Fast and secure messaging',
        icon: 'https://cdn.worldvectorlogo.com/logos/telegram-1.svg',
        category: 'communication',
        model: TelegramIntegration,
        modelName: 'TelegramIntegration',
        hasOAuth: false,
        features: ['notifications', 'bot']
    },
    zoom: {
        id: 'zoom',
        name: 'Zoom',
        description: 'Video conferencing and meetings',
        icon: 'https://cdn.worldvectorlogo.com/logos/zoom-communications-logo.svg',
        category: 'communication',
        model: ZoomIntegration,
        modelName: 'ZoomIntegration',
        hasOAuth: true,
        authUrl: '/api/integrations/zoom/auth',
        features: ['meetings', 'calendar']
    },
    whatsapp: {
        id: 'whatsapp',
        name: 'WhatsApp Business',
        description: 'Business messaging and customer support',
        icon: 'https://cdn.worldvectorlogo.com/logos/whatsapp-logo-1.svg',
        category: 'communication',
        model: null, // Uses WhatsappConversation model
        modelName: 'WhatsappConversation',
        hasOAuth: false,
        features: ['messaging', 'broadcasts', 'templates']
    },

    // Productivity Apps
    github: {
        id: 'github',
        name: 'GitHub',
        description: 'Code hosting and collaboration',
        icon: 'https://cdn.worldvectorlogo.com/logos/github-icon-1.svg',
        category: 'productivity',
        model: GithubIntegration,
        modelName: 'GithubIntegration',
        hasOAuth: true,
        authUrl: '/api/integrations/github/auth',
        features: ['repositories', 'issues', 'pull-requests']
    },
    trello: {
        id: 'trello',
        name: 'Trello',
        description: 'Project management and task tracking',
        icon: 'https://cdn.worldvectorlogo.com/logos/trello.svg',
        category: 'productivity',
        model: TrelloIntegration,
        modelName: 'TrelloIntegration',
        hasOAuth: true,
        authUrl: '/api/integrations/trello/auth',
        features: ['boards', 'cards', 'tasks']
    },
    notion: {
        id: 'notion',
        name: 'Notion',
        description: 'All-in-one workspace for notes and docs',
        icon: 'https://cdn.worldvectorlogo.com/logos/notion-logo-1.svg',
        category: 'productivity',
        model: null, // To be implemented
        modelName: null,
        hasOAuth: true,
        features: ['pages', 'databases', 'sync']
    },

    // Email Apps
    gmail: {
        id: 'gmail',
        name: 'Gmail',
        description: 'Email integration and sync',
        icon: 'https://cdn.worldvectorlogo.com/logos/gmail-icon.svg',
        category: 'email',
        model: GmailIntegration,
        modelName: 'GmailIntegration',
        hasOAuth: true,
        authUrl: '/api/integrations/gmail/auth',
        features: ['send', 'receive', 'sync']
    },

    // Accounting Apps
    quickbooks: {
        id: 'quickbooks',
        name: 'QuickBooks',
        description: 'Accounting and invoicing software',
        icon: 'https://cdn.worldvectorlogo.com/logos/quickbooks-1.svg',
        category: 'accounting',
        model: null, // Uses existing QuickBooks integration
        modelName: null,
        hasOAuth: true,
        authUrl: '/api/integrations/quickbooks/auth',
        features: ['invoices', 'customers', 'payments', 'sync']
    },
    xero: {
        id: 'xero',
        name: 'Xero',
        description: 'Cloud accounting software',
        icon: 'https://cdn.worldvectorlogo.com/logos/xero-1.svg',
        category: 'accounting',
        model: null, // Uses existing Xero integration
        modelName: null,
        hasOAuth: true,
        authUrl: '/api/integrations/xero/auth',
        features: ['invoices', 'contacts', 'payments', 'sync']
    },

    // Calendar Apps
    'google-calendar': {
        id: 'google-calendar',
        name: 'Google Calendar',
        description: 'Calendar integration and sync',
        icon: 'https://cdn.worldvectorlogo.com/logos/google-calendar.svg',
        category: 'calendar',
        model: GoogleCalendarIntegration,
        modelName: 'GoogleCalendarIntegration',
        hasOAuth: true,
        authUrl: '/api/integrations/google-calendar/auth',
        features: ['events', 'sync', 'reminders']
    },
    'microsoft-calendar': {
        id: 'microsoft-calendar',
        name: 'Microsoft Calendar',
        description: 'Outlook calendar integration',
        icon: 'https://cdn.worldvectorlogo.com/logos/microsoft-5.svg',
        category: 'calendar',
        model: null, // To be implemented
        modelName: null,
        hasOAuth: true,
        features: ['events', 'sync', 'reminders']
    },

    // Storage Apps
    'google-drive': {
        id: 'google-drive',
        name: 'Google Drive',
        description: 'Cloud storage and file sharing',
        icon: 'https://cdn.worldvectorlogo.com/logos/google-drive-2020.svg',
        category: 'storage',
        model: null, // To be implemented
        modelName: null,
        hasOAuth: true,
        features: ['upload', 'sync', 'share']
    },
    dropbox: {
        id: 'dropbox',
        name: 'Dropbox',
        description: 'File hosting and collaboration',
        icon: 'https://cdn.worldvectorlogo.com/logos/dropbox-1.svg',
        category: 'storage',
        model: null, // To be implemented
        modelName: null,
        hasOAuth: true,
        features: ['upload', 'sync', 'share']
    },
    onedrive: {
        id: 'onedrive',
        name: 'OneDrive',
        description: 'Microsoft cloud storage',
        icon: 'https://cdn.worldvectorlogo.com/logos/onedrive-1.svg',
        category: 'storage',
        model: null, // To be implemented
        modelName: null,
        hasOAuth: true,
        features: ['upload', 'sync', 'share']
    },

    // E-Signature Apps
    docusign: {
        id: 'docusign',
        name: 'DocuSign',
        description: 'Electronic signature and document management',
        icon: 'https://cdn.worldvectorlogo.com/logos/docusign.svg',
        category: 'e-signature',
        model: null, // To be implemented
        modelName: null,
        hasOAuth: true,
        features: ['sign', 'send', 'templates']
    },

    // Payment Apps
    stripe: {
        id: 'stripe',
        name: 'Stripe',
        description: 'Payment processing and billing',
        icon: 'https://cdn.worldvectorlogo.com/logos/stripe-4.svg',
        category: 'payment',
        model: null, // Uses existing Stripe integration
        modelName: null,
        hasOAuth: true,
        features: ['payments', 'invoices', 'subscriptions']
    }
};

// ═══════════════════════════════════════════════════════════════
// SERVICE METHODS
// ═══════════════════════════════════════════════════════════════

class AppsService {
    /**
     * Get all available apps with their connection status for a firm
     */
    static async getAvailableApps(firmId) {
        try {
            // Get all existing connections for this firm
            const connections = await AppConnection.find({ firmId }).lean();

            // Build a map of appId -> connection
            const connectionMap = {};
            connections.forEach(conn => {
                connectionMap[conn.appId] = conn;
            });

            // Return all available apps with status
            const apps = Object.values(AVAILABLE_APPS).map(app => {
                const connection = connectionMap[app.id];

                return {
                    id: app.id,
                    name: app.name,
                    description: app.description,
                    icon: app.icon,
                    category: app.category,
                    features: app.features,
                    hasOAuth: app.hasOAuth,
                    authUrl: app.authUrl,
                    status: connection?.status || 'disconnected',
                    isConnected: connection?.status === 'connected' && connection?.isActive,
                    connectedAt: connection?.connectedAt,
                    lastSyncAt: connection?.lastSyncAt,
                    metadata: connection?.metadata ? Object.fromEntries(connection.metadata) : null,
                    connectionId: connection?._id
                };
            });

            return {
                success: true,
                apps,
                total: apps.length,
                connected: apps.filter(a => a.isConnected).length
            };
        } catch (error) {
            logger.error('Failed to get available apps', { error: error.message, firmId });
            throw new Error('Failed to get available apps');
        }
    }

    /**
     * Get connected apps for a firm
     */
    static async getConnectedApps(firmId) {
        try {
            const connections = await AppConnection.findConnectedApps(firmId);

            const apps = connections.map(conn => {
                const appInfo = AVAILABLE_APPS[conn.appId];

                return {
                    id: conn.appId,
                    name: conn.appName,
                    description: conn.appDescription,
                    icon: conn.appIcon,
                    category: appInfo?.category,
                    status: conn.status,
                    connectedAt: conn.connectedAt,
                    connectedBy: conn.connectedBy,
                    lastSyncAt: conn.lastSyncAt,
                    metadata: conn.metadata ? Object.fromEntries(conn.metadata) : {},
                    settings: conn.settings ? Object.fromEntries(conn.settings) : {},
                    stats: conn.stats,
                    connectionId: conn._id
                };
            });

            return {
                success: true,
                apps,
                total: apps.length
            };
        } catch (error) {
            logger.error('Failed to get connected apps', { error: error.message, firmId });
            throw new Error('Failed to get connected apps');
        }
    }

    /**
     * Get status of a specific app
     */
    static async getAppStatus(firmId, appId) {
        try {
            // Validate app exists
            const appInfo = AVAILABLE_APPS[appId];
            if (!appInfo) {
                throw new Error('App not found');
            }

            // Get connection record
            const connection = await AppConnection.findByFirmAndApp(firmId, appId);

            if (!connection) {
                return {
                    success: true,
                    app: {
                        id: appId,
                        name: appInfo.name,
                        description: appInfo.description,
                        icon: appInfo.icon,
                        category: appInfo.category,
                        features: appInfo.features,
                        hasOAuth: appInfo.hasOAuth,
                        authUrl: appInfo.authUrl,
                        status: 'disconnected',
                        isConnected: false
                    }
                };
            }

            // Get integration-specific details if model exists
            let integrationDetails = null;
            if (appInfo.model) {
                try {
                    const integration = await appInfo.model.findOne({
                        firmId,
                        isActive: true
                    });

                    if (integration && integration.toSafeObject) {
                        integrationDetails = integration.toSafeObject();
                    }
                } catch (err) {
                    logger.warn('Failed to get integration details', { error: err.message, appId });
                }
            }

            return {
                success: true,
                app: {
                    id: connection.appId,
                    name: connection.appName,
                    description: connection.appDescription,
                    icon: connection.appIcon,
                    category: appInfo.category,
                    features: appInfo.features,
                    hasOAuth: appInfo.hasOAuth,
                    authUrl: appInfo.authUrl,
                    status: connection.status,
                    isConnected: connection.isConnected,
                    connectedAt: connection.connectedAt,
                    connectedBy: connection.connectedBy,
                    disconnectedAt: connection.disconnectedAt,
                    lastSyncAt: connection.lastSyncAt,
                    lastError: connection.lastError,
                    metadata: connection.metadata ? Object.fromEntries(connection.metadata) : {},
                    settings: connection.settings ? Object.fromEntries(connection.settings) : {},
                    stats: connection.stats,
                    integrationDetails,
                    connectionId: connection._id
                }
            };
        } catch (error) {
            logger.error('Failed to get app status', { error: error.message, firmId, appId });
            throw error;
        }
    }

    /**
     * Get OAuth URL for connecting an app
     */
    static async getAppAuthUrl(firmId, appId, userId) {
        try {
            const appInfo = AVAILABLE_APPS[appId];
            if (!appInfo) {
                throw new Error('App not found');
            }

            if (!appInfo.hasOAuth) {
                throw new Error('App does not support OAuth');
            }

            // Create or update connection record as pending
            let connection = await AppConnection.findByFirmAndApp(firmId, appId);

            if (!connection) {
                connection = new AppConnection({
                    firmId,
                    appId,
                    appName: appInfo.name,
                    appDescription: appInfo.description,
                    appIcon: appInfo.icon,
                    status: 'pending',
                    connectedBy: userId,
                    integrationModel: appInfo.modelName
                });
            } else {
                connection.status = 'pending';
                connection.connectedBy = userId;
            }

            await connection.save();

            return {
                success: true,
                authUrl: appInfo.authUrl,
                appId,
                appName: appInfo.name
            };
        } catch (error) {
            logger.error('Failed to get auth URL', { error: error.message, firmId, appId });
            throw error;
        }
    }

    /**
     * Disconnect an app
     */
    static async disconnectApp(firmId, appId, userId, reason = null) {
        try {
            const connection = await AppConnection.findByFirmAndApp(firmId, appId);

            if (!connection) {
                throw new Error('App connection not found');
            }

            // Mark connection as disconnected
            await connection.markDisconnected(userId, reason);

            // Disconnect the actual integration if model exists
            const appInfo = AVAILABLE_APPS[appId];
            if (appInfo && appInfo.model) {
                try {
                    const integration = await appInfo.model.findOne({
                        firmId,
                        isActive: true
                    });

                    if (integration && integration.disconnect) {
                        await integration.disconnect(userId, reason);
                    } else if (integration) {
                        integration.isActive = false;
                        await integration.save();
                    }
                } catch (err) {
                    logger.warn('Failed to disconnect integration', { error: err.message, appId });
                }
            }

            logger.info('App disconnected successfully', { firmId, appId, userId });

            return {
                success: true,
                message: 'App disconnected successfully',
                app: connection.toSafeObject()
            };
        } catch (error) {
            logger.error('Failed to disconnect app', { error: error.message, firmId, appId });
            throw error;
        }
    }

    /**
     * Trigger sync for an app
     */
    static async syncApp(firmId, appId) {
        try {
            const connection = await AppConnection.findByFirmAndApp(firmId, appId);

            if (!connection) {
                throw new Error('App connection not found');
            }

            if (connection.status !== 'connected') {
                throw new Error('App is not connected');
            }

            // Record sync attempt
            await connection.recordSuccessfulSync();

            logger.info('App sync triggered', { firmId, appId });

            return {
                success: true,
                message: 'Sync triggered successfully',
                lastSyncAt: connection.lastSyncAt
            };
        } catch (error) {
            logger.error('Failed to sync app', { error: error.message, firmId, appId });

            // Record sync failure
            try {
                const connection = await AppConnection.findByFirmAndApp(firmId, appId);
                if (connection) {
                    await connection.markError(error);
                }
            } catch (err) {
                logger.error('Failed to record sync error', { error: err.message });
            }

            throw error;
        }
    }

    /**
     * Update app settings
     */
    static async updateAppSettings(firmId, appId, settings) {
        try {
            const connection = await AppConnection.findByFirmAndApp(firmId, appId);

            if (!connection) {
                throw new Error('App connection not found');
            }

            await connection.updateSettings(settings);

            logger.info('App settings updated', { firmId, appId });

            return {
                success: true,
                message: 'Settings updated successfully',
                settings: connection.settings ? Object.fromEntries(connection.settings) : {}
            };
        } catch (error) {
            logger.error('Failed to update app settings', { error: error.message, firmId, appId });
            throw error;
        }
    }

    /**
     * Test app connection
     */
    static async testApp(firmId, appId) {
        try {
            const connection = await AppConnection.findByFirmAndApp(firmId, appId);

            if (!connection) {
                throw new Error('App connection not found');
            }

            if (connection.status !== 'connected') {
                throw new Error('App is not connected');
            }

            // Test connection based on app type
            const appInfo = AVAILABLE_APPS[appId];
            let testResult = {
                success: true,
                message: 'Connection is active',
                timestamp: new Date()
            };

            // If app has a model, try to get integration details
            if (appInfo && appInfo.model) {
                try {
                    const integration = await appInfo.model.findOne({
                        firmId,
                        isActive: true
                    });

                    if (!integration) {
                        testResult.success = false;
                        testResult.message = 'Integration not found';
                    }
                } catch (err) {
                    testResult.success = false;
                    testResult.message = err.message;
                }
            }

            return {
                success: true,
                test: testResult
            };
        } catch (error) {
            logger.error('Failed to test app connection', { error: error.message, firmId, appId });
            throw error;
        }
    }

    /**
     * Get app categories
     */
    static getCategories() {
        const categories = {};

        Object.values(AVAILABLE_APPS).forEach(app => {
            if (!categories[app.category]) {
                categories[app.category] = {
                    name: app.category,
                    apps: []
                };
            }
            categories[app.category].apps.push({
                id: app.id,
                name: app.name,
                icon: app.icon
            });
        });

        return {
            success: true,
            categories: Object.values(categories)
        };
    }

    /**
     * Get firm integration statistics
     */
    static async getFirmStats(firmId) {
        try {
            const stats = await AppConnection.getFirmStats(firmId);

            return {
                success: true,
                stats
            };
        } catch (error) {
            logger.error('Failed to get firm stats', { error: error.message, firmId });
            throw error;
        }
    }
}

module.exports = AppsService;
