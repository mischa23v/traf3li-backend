const axios = require('axios');
const crypto = require('crypto');
const OAuth = require('oauth-1.0a');
const TrelloIntegration = require('../models/trelloIntegration.model');
const Case = require('../models/case.model');
const Task = require('../models/task.model');
const { CustomException } = require('../utils');
const logger = require('../utils/contextLogger');
const { wrapExternalCall } = require('../utils/externalServiceWrapper');
const cacheService = require('./cache.service');

const {
    TRELLO_API_KEY,
    TRELLO_API_SECRET,
    BACKEND_URL,
    API_URL
} = process.env;

// Validate required environment variables
if (!TRELLO_API_KEY || !TRELLO_API_SECRET) {
    logger.warn('Trello integration not configured. Set TRELLO_API_KEY and TRELLO_API_SECRET in environment variables.');
}

const TRELLO_BASE_URL = 'https://api.trello.com/1';
const TRELLO_AUTH_URL = 'https://trello.com/1/authorize';
const TRELLO_REQUEST_TOKEN_URL = 'https://trello.com/1/OAuthGetRequestToken';
const TRELLO_ACCESS_TOKEN_URL = 'https://trello.com/1/OAuthGetAccessToken';

const CALLBACK_URL = `${BACKEND_URL || API_URL || 'http://localhost:5000'}/api/trello/callback`;

/**
 * Trello Service
 *
 * Handles OAuth 1.0a flow, board/card operations, and sync with tasks/cases
 */
class TrelloService {
    constructor() {
        // Initialize OAuth 1.0a client
        this.oauth = OAuth({
            consumer: {
                key: TRELLO_API_KEY,
                secret: TRELLO_API_SECRET
            },
            signature_method: 'HMAC-SHA1',
            hash_function(base_string, key) {
                return crypto
                    .createHmac('sha1', key)
                    .update(base_string)
                    .digest('base64');
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // OAUTH 1.0a FLOW
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get OAuth authorization URL (OAuth 1.0a - Step 1)
     * @param {string} userId - User ID
     * @param {string} firmId - Firm ID
     * @returns {string} Authorization URL
     */
    async getAuthUrl(userId, firmId) {
        try {
            // Generate state for CSRF protection
            const state = crypto.randomBytes(32).toString('hex');

            // Store state data in cache
            const stateData = {
                userId,
                firmId,
                timestamp: Date.now()
            };

            await cacheService.set(`trello:state:${state}`, stateData, 900); // 15 minutes

            // For OAuth 1.0a, Trello uses a simpler flow
            // We don't need request tokens, just redirect with app key and callback
            const authUrl = new URL(TRELLO_AUTH_URL);
            authUrl.searchParams.append('key', TRELLO_API_KEY);
            authUrl.searchParams.append('name', 'TRAF3LI Legal Management');
            authUrl.searchParams.append('scope', 'read,write');
            authUrl.searchParams.append('expiration', 'never');
            authUrl.searchParams.append('response_type', 'token');
            authUrl.searchParams.append('callback_method', 'fragment');
            authUrl.searchParams.append('return_url', `${CALLBACK_URL}?state=${state}`);

            logger.info('Trello auth URL generated', { userId, firmId });

            return authUrl.toString();
        } catch (error) {
            logger.error('Failed to generate Trello auth URL', {
                error: error.message,
                userId,
                firmId
            });
            throw CustomException('Failed to generate Trello authorization URL', 500);
        }
    }

    /**
     * Exchange authorization code for access tokens (OAuth 1.0a - Step 2)
     * @param {string} token - OAuth token from Trello
     * @param {string} state - State parameter
     * @returns {object} Integration result
     */
    async exchangeCode(token, state) {
        try {
            // Verify state
            const stateData = await cacheService.get(`trello:state:${state}`);

            if (!stateData) {
                throw CustomException('Invalid or expired state parameter', 400);
            }

            const { userId, firmId } = stateData;

            // Delete state after verification
            await cacheService.del(`trello:state:${state}`);

            // Get member information using the token
            const memberInfo = await this.getMemberInfo(token);

            // Find or create integration
            let integration = await TrelloIntegration.findOne({ firmId, userId });

            if (integration) {
                // Update existing integration
                integration.accessToken = token;
                integration.tokenSecret = ''; // Trello tokens don't have secrets in this flow
                integration.trelloMemberId = memberInfo.id;
                integration.fullName = memberInfo.fullName;
                integration.username = memberInfo.username;
                integration.avatarUrl = memberInfo.avatarUrl;
                integration.isActive = true;
                integration.connectedAt = new Date();
                integration.disconnectedAt = null;
                integration.disconnectedBy = null;
                integration.disconnectReason = null;

                await integration.save();
            } else {
                // Create new integration
                integration = await TrelloIntegration.create({
                    firmId,
                    userId,
                    accessToken: token,
                    tokenSecret: '', // Trello tokens don't have secrets in this flow
                    trelloMemberId: memberInfo.id,
                    fullName: memberInfo.fullName,
                    username: memberInfo.username,
                    avatarUrl: memberInfo.avatarUrl,
                    isActive: true,
                    connectedAt: new Date()
                });
            }

            // Fetch and store user's boards
            try {
                const boards = await this.listBoards(firmId);

                // Add first few boards
                for (const board of boards.slice(0, 10)) {
                    await integration.addBoard({
                        boardId: board.id,
                        name: board.name,
                        shortUrl: board.shortUrl,
                        url: board.url,
                        closed: board.closed
                    });
                }
            } catch (error) {
                logger.warn('Failed to fetch Trello boards', { error: error.message });
            }

            logger.info('Trello integration connected successfully', {
                firmId,
                userId,
                memberId: memberInfo.id
            });

            return {
                success: true,
                integration: {
                    fullName: integration.fullName,
                    username: integration.username,
                    connectedAt: integration.connectedAt
                }
            };
        } catch (error) {
            logger.error('Trello OAuth exchange failed', {
                error: error.message
            });

            throw CustomException('Failed to connect Trello', 500);
        }
    }

    /**
     * Get member information from Trello
     * @param {string} token - Access token
     * @returns {object} Member info
     */
    async getMemberInfo(token) {
        try {
            const response = await this.makeAuthenticatedRequest(
                'GET',
                '/members/me',
                null,
                token
            );

            return {
                id: response.id,
                fullName: response.fullName,
                username: response.username,
                avatarUrl: response.avatarUrl,
                email: response.email
            };
        } catch (error) {
            logger.error('Failed to get Trello member info', { error: error.message });
            throw CustomException('Failed to get member information', 500);
        }
    }

    /**
     * Make authenticated request to Trello API
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {object} data - Request data
     * @param {string} token - Access token (optional, will fetch from DB if not provided)
     * @param {string} firmId - Firm ID (required if token not provided)
     * @returns {object} Response data
     */
    async makeAuthenticatedRequest(method, endpoint, data = null, token = null, firmId = null) {
        try {
            // Get token from DB if not provided
            if (!token && firmId) {
                const integration = await TrelloIntegration.findActiveIntegration(firmId);
                if (!integration) {
                    throw CustomException('Trello not connected', 404);
                }
                token = integration.accessToken;
            }

            if (!token) {
                throw CustomException('No access token available', 401);
            }

            const url = `${TRELLO_BASE_URL}${endpoint}`;
            const params = new URLSearchParams();
            params.append('key', TRELLO_API_KEY);
            params.append('token', token);

            let requestUrl = url;
            let requestData = data;

            if (method === 'GET' && data) {
                Object.keys(data).forEach(key => {
                    params.append(key, data[key]);
                });
                requestUrl = `${url}?${params.toString()}`;
                requestData = null;
            } else {
                requestUrl = `${url}?${params.toString()}`;
            }

            const response = await wrapExternalCall('trello', async () => {
                return await axios({
                    method,
                    url: requestUrl,
                    data: requestData,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            });

            return response.data;
        } catch (error) {
            logger.error('Trello API request failed', {
                error: error.message,
                endpoint,
                method
            });

            if (error.response?.status === 401) {
                throw CustomException('Trello authentication failed. Please reconnect.', 401);
            }

            throw CustomException('Trello API request failed', 500);
        }
    }

    /**
     * Disconnect Trello integration
     * @param {string} firmId - Firm ID
     * @param {string} userId - User ID who is disconnecting
     * @returns {object} Result
     */
    async disconnect(firmId, userId) {
        const integration = await TrelloIntegration.findOne({ firmId });

        if (!integration) {
            throw CustomException('Trello not connected', 404);
        }

        // Revoke webhooks
        try {
            for (const webhook of integration.webhooks) {
                if (webhook.active) {
                    await this.deleteWebhook(webhook.webhookId, integration.accessToken);
                }
            }
        } catch (error) {
            logger.warn('Failed to delete Trello webhooks', { error: error.message });
        }

        await integration.disconnect(userId, 'User disconnected');

        logger.info('Trello integration disconnected', { firmId, userId });

        return { success: true };
    }

    // ═══════════════════════════════════════════════════════════════
    // BOARD OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * List user's Trello boards
     * @param {string} firmId - Firm ID
     * @returns {array} List of boards
     */
    async listBoards(firmId) {
        const boards = await this.makeAuthenticatedRequest(
            'GET',
            '/members/me/boards',
            { filter: 'open', fields: 'id,name,shortUrl,url,closed' },
            null,
            firmId
        );

        return boards;
    }

    /**
     * Get board details
     * @param {string} firmId - Firm ID
     * @param {string} boardId - Board ID
     * @returns {object} Board details
     */
    async getBoard(firmId, boardId) {
        const board = await this.makeAuthenticatedRequest(
            'GET',
            `/boards/${boardId}`,
            { fields: 'id,name,desc,shortUrl,url,closed' },
            null,
            firmId
        );

        return board;
    }

    // ═══════════════════════════════════════════════════════════════
    // LIST OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * List lists in a board
     * @param {string} firmId - Firm ID
     * @param {string} boardId - Board ID
     * @returns {array} List of lists
     */
    async listLists(firmId, boardId) {
        const lists = await this.makeAuthenticatedRequest(
            'GET',
            `/boards/${boardId}/lists`,
            { filter: 'open', fields: 'id,name,closed,pos' },
            null,
            firmId
        );

        return lists;
    }

    // ═══════════════════════════════════════════════════════════════
    // CARD OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * List cards in a list
     * @param {string} firmId - Firm ID
     * @param {string} listId - List ID
     * @returns {array} List of cards
     */
    async listCards(firmId, listId) {
        const cards = await this.makeAuthenticatedRequest(
            'GET',
            `/lists/${listId}/cards`,
            { fields: 'id,name,desc,due,dueComplete,idList,idBoard,closed,url,shortUrl' },
            null,
            firmId
        );

        return cards;
    }

    /**
     * Create a new card
     * @param {string} firmId - Firm ID
     * @param {string} listId - List ID
     * @param {object} cardData - Card data
     * @returns {object} Created card
     */
    async createCard(firmId, listId, cardData) {
        const { name, desc, due, pos } = cardData;

        const data = {
            idList: listId,
            name,
            desc,
            due,
            pos
        };

        const card = await this.makeAuthenticatedRequest(
            'POST',
            '/cards',
            data,
            null,
            firmId
        );

        // Update stats
        const integration = await TrelloIntegration.findActiveIntegration(firmId);
        if (integration) {
            await integration.incrementStats('created', true);
        }

        logger.info('Trello card created', { firmId, cardId: card.id });

        return card;
    }

    /**
     * Update a card
     * @param {string} firmId - Firm ID
     * @param {string} cardId - Card ID
     * @param {object} updates - Card updates
     * @returns {object} Updated card
     */
    async updateCard(firmId, cardId, updates) {
        const card = await this.makeAuthenticatedRequest(
            'PUT',
            `/cards/${cardId}`,
            updates,
            null,
            firmId
        );

        // Update stats
        const integration = await TrelloIntegration.findActiveIntegration(firmId);
        if (integration) {
            await integration.incrementStats('updated', true);
        }

        logger.info('Trello card updated', { firmId, cardId });

        return card;
    }

    /**
     * Move card to another list
     * @param {string} firmId - Firm ID
     * @param {string} cardId - Card ID
     * @param {string} listId - Target list ID
     * @returns {object} Updated card
     */
    async moveCard(firmId, cardId, listId) {
        return await this.updateCard(firmId, cardId, { idList: listId });
    }

    /**
     * Add comment to a card
     * @param {string} firmId - Firm ID
     * @param {string} cardId - Card ID
     * @param {string} text - Comment text
     * @returns {object} Created comment
     */
    async addComment(firmId, cardId, text) {
        const comment = await this.makeAuthenticatedRequest(
            'POST',
            `/cards/${cardId}/actions/comments`,
            { text },
            null,
            firmId
        );

        // Update stats
        const integration = await TrelloIntegration.findActiveIntegration(firmId);
        if (integration) {
            await integration.incrementStats('comment', true);
        }

        logger.info('Comment added to Trello card', { firmId, cardId });

        return comment;
    }

    // ═══════════════════════════════════════════════════════════════
    // WEBHOOK HANDLING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create webhook for a board
     * @param {string} firmId - Firm ID
     * @param {string} boardId - Board ID
     * @returns {object} Created webhook
     */
    async createWebhook(firmId, boardId) {
        const integration = await TrelloIntegration.findActiveIntegration(firmId);

        if (!integration) {
            throw CustomException('Trello not connected', 404);
        }

        const callbackUrl = `${BACKEND_URL || API_URL}/api/trello/webhook`;

        const webhook = await this.makeAuthenticatedRequest(
            'POST',
            '/webhooks',
            {
                description: `TRAF3LI webhook for board ${boardId}`,
                callbackURL: callbackUrl,
                idModel: boardId
            },
            integration.accessToken
        );

        // Store webhook
        await integration.addWebhook({
            webhookId: webhook.id,
            boardId,
            callbackUrl,
            active: true
        });

        logger.info('Trello webhook created', { firmId, boardId, webhookId: webhook.id });

        return webhook;
    }

    /**
     * Delete webhook
     * @param {string} webhookId - Webhook ID
     * @param {string} token - Access token
     * @returns {object} Result
     */
    async deleteWebhook(webhookId, token) {
        await this.makeAuthenticatedRequest(
            'DELETE',
            `/webhooks/${webhookId}`,
            null,
            token
        );

        logger.info('Trello webhook deleted', { webhookId });

        return { success: true };
    }

    /**
     * Handle incoming webhook from Trello
     * @param {object} payload - Webhook payload
     * @param {object} headers - Request headers
     * @returns {object} Result
     */
    async handleWebhook(payload, headers) {
        try {
            const { action, model } = payload;

            if (!action) {
                return { success: true };
            }

            // Find integration by model ID (board/card)
            const integration = await TrelloIntegration.findOne({
                'webhooks.boardId': model.id,
                isActive: true
            });

            if (!integration) {
                logger.warn('No integration found for webhook', { modelId: model.id });
                return { success: true };
            }

            // Process different action types
            switch (action.type) {
                case 'createCard':
                    await this.handleCardCreated(integration, action);
                    break;
                case 'updateCard':
                    await this.handleCardUpdated(integration, action);
                    break;
                case 'commentCard':
                    await this.handleCardCommented(integration, action);
                    break;
                default:
                    logger.debug('Unhandled Trello webhook action', { type: action.type });
            }

            return { success: true };
        } catch (error) {
            logger.error('Failed to process Trello webhook', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle card created event
     */
    async handleCardCreated(integration, action) {
        if (!integration.isNotificationEnabled('cardCreated')) {
            return;
        }

        const card = action.data.card;
        logger.info('Trello card created', {
            firmId: integration.firmId,
            cardId: card.id,
            cardName: card.name
        });

        // Check if we should sync this card
        // Implementation depends on sync settings
    }

    /**
     * Handle card updated event
     */
    async handleCardUpdated(integration, action) {
        if (!integration.isNotificationEnabled('cardUpdated')) {
            return;
        }

        const card = action.data.card;
        const oldData = action.data.old;

        logger.info('Trello card updated', {
            firmId: integration.firmId,
            cardId: card.id,
            changes: Object.keys(oldData)
        });

        // Check for list changes (card moved)
        if (oldData.idList && integration.isNotificationEnabled('cardMoved')) {
            logger.info('Trello card moved', {
                firmId: integration.firmId,
                cardId: card.id,
                fromList: oldData.idList,
                toList: card.idList
            });
        }

        // Sync with task/case if mapping exists
        const mapping = integration.getMappingByCardId(card.id);
        if (mapping && mapping.autoSync) {
            await this.syncCardToTask(integration, card, mapping);
        }
    }

    /**
     * Handle card commented event
     */
    async handleCardCommented(integration, action) {
        if (!integration.isNotificationEnabled('commentAdded')) {
            return;
        }

        const card = action.data.card;
        const comment = action.data.text;

        logger.info('Comment added to Trello card', {
            firmId: integration.firmId,
            cardId: card.id
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // SYNC WITH TASKS/CASES
    // ═══════════════════════════════════════════════════════════════

    /**
     * Sync Trello card to task/case
     * @param {object} integration - Integration instance
     * @param {object} card - Trello card
     * @param {object} mapping - Task mapping
     * @returns {object} Result
     */
    async syncCardToTask(integration, card, mapping) {
        try {
            if (mapping.taskType === 'case') {
                const caseDoc = await Case.findOne({ _id: mapping.taskId, firmId: integration.firmId });
                if (caseDoc) {
                    // Update case fields based on card
                    // Implementation depends on your case model
                    logger.info('Synced Trello card to case', {
                        caseId: caseDoc._id,
                        cardId: card.id
                    });
                }
            } else if (mapping.taskType === 'task') {
                const task = await Task.findOne({ _id: mapping.taskId, firmId: integration.firmId });
                if (task) {
                    // Update task fields based on card
                    // Implementation depends on your task model
                    logger.info('Synced Trello card to task', {
                        taskId: task._id,
                        cardId: card.id
                    });
                }
            }

            // Update last sync time
            mapping.lastSyncAt = new Date();
            await integration.save();

            return { success: true };
        } catch (error) {
            logger.error('Failed to sync card to task', {
                error: error.message,
                cardId: card.id,
                taskId: mapping.taskId
            });
            throw error;
        }
    }

    /**
     * Sync task/case to Trello card
     * @param {string} firmId - Firm ID
     * @param {string} taskId - Task/Case ID
     * @param {string} taskType - 'case' or 'task'
     * @returns {object} Result
     */
    async syncTaskToCard(firmId, taskId, taskType) {
        const integration = await TrelloIntegration.findActiveIntegration(firmId);

        if (!integration) {
            throw CustomException('Trello not connected', 404);
        }

        // Check if mapping exists
        let mapping = integration.getMappingByTaskId(taskId, taskType);

        if (!mapping) {
            // Create new card and mapping
            const defaultListId = integration.syncSettings.defaultListId;

            if (!defaultListId) {
                throw CustomException('No default list configured', 400);
            }

            // Get task/case data
            let taskData;
            if (taskType === 'case') {
                taskData = await Case.findOne({ _id: taskId, firmId });
            } else {
                taskData = await Task.findOne({ _id: taskId, firmId });
            }

            if (!taskData) {
                throw CustomException('Task/Case not found', 404);
            }

            // Create card
            const card = await this.createCard(firmId, defaultListId, {
                name: taskData.title || taskData.name || 'Untitled',
                desc: taskData.description || '',
                due: taskData.dueDate || null
            });

            // Create mapping
            await integration.addTaskMapping({
                taskId,
                taskType,
                cardId: card.id,
                boardId: integration.syncSettings.defaultBoardId,
                listId: defaultListId,
                syncDirection: 'bidirectional',
                autoSync: true
            });

            logger.info('Created Trello card from task', {
                firmId,
                taskId,
                taskType,
                cardId: card.id
            });

            return { success: true, card, created: true };
        }

        // Update existing card
        // Implementation depends on sync direction and settings

        return { success: true, updated: true };
    }

    /**
     * Get connection status
     * @param {string} firmId - Firm ID
     * @returns {object} Status
     */
    async getStatus(firmId) {
        const integration = await TrelloIntegration.findOne({ firmId });

        if (!integration) {
            return {
                connected: false
            };
        }

        return {
            connected: integration.isActive,
            fullName: integration.fullName,
            username: integration.username,
            trelloMemberId: integration.trelloMemberId,
            connectedAt: integration.connectedAt,
            lastSyncAt: integration.lastSyncAt,
            stats: integration.stats,
            settings: integration.syncSettings,
            boards: integration.boards,
            mappings: integration.taskMapping.length
        };
    }

    /**
     * Update sync settings
     * @param {string} firmId - Firm ID
     * @param {object} settings - Settings to update
     * @returns {object} Updated integration
     */
    async updateSettings(firmId, settings) {
        const integration = await TrelloIntegration.findActiveIntegration(firmId);

        if (!integration) {
            throw CustomException('Trello not connected', 404);
        }

        // Update notification preferences
        if (settings.notifications) {
            await integration.updateNotificationPreferences(settings.notifications);
        }

        // Update default board/list
        if (settings.defaultBoardId) {
            integration.syncSettings.defaultBoardId = settings.defaultBoardId;
            integration.syncSettings.defaultBoardName = settings.defaultBoardName;
        }

        if (settings.defaultListId) {
            integration.syncSettings.defaultListId = settings.defaultListId;
            integration.syncSettings.defaultListName = settings.defaultListName;
        }

        // Update sync settings
        if (settings.enabled !== undefined) {
            integration.syncSettings.enabled = settings.enabled;
        }

        if (settings.syncInterval) {
            integration.syncSettings.syncInterval = settings.syncInterval;
        }

        await integration.save();

        logger.info('Trello settings updated', { firmId });

        return {
            success: true,
            settings: integration.syncSettings
        };
    }
}

module.exports = new TrelloService();
