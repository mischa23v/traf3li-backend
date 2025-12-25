const trelloService = require('../services/trello.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/contextLogger');

// ═══════════════════════════════════════════════════════════════
// OAUTH ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get Trello OAuth authorization URL
 * GET /api/trello/auth-url
 */
const getAuthUrl = asyncHandler(async (req, res) => {
    const userId = sanitizeObjectId(req.userID);
    const firmId = sanitizeObjectId(req.firmId);

    if (!userId || !firmId) {
        throw CustomException('Unauthorized', 401);
    }

    const authUrl = await trelloService.getAuthUrl(userId, firmId);

    res.status(200).json({
        success: true,
        data: {
            authUrl
        }
    });
});

/**
 * Handle Trello OAuth callback
 * GET /api/trello/callback?token=...&state=...
 */
const handleCallback = asyncHandler(async (req, res) => {
    const { token, state, error } = req.query;

    // Handle OAuth errors
    if (error) {
        logger.error('Trello OAuth error', { error });
        return res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?trello_error=${encodeURIComponent(error)}`);
    }

    if (!token || !state) {
        throw CustomException('Missing token or state parameter', 400);
    }

    try {
        const result = await trelloService.exchangeCode(token, state);

        logger.info('Trello OAuth callback successful', {
            fullName: result.integration.fullName
        });

        // Redirect to frontend with success
        res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?trello_connected=true&user=${encodeURIComponent(result.integration.fullName)}`);
    } catch (error) {
        logger.error('Trello OAuth callback failed', { error: error.message });

        // Redirect to frontend with error
        res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?trello_error=${encodeURIComponent(error.message)}`);
    }
});

// ═══════════════════════════════════════════════════════════════
// CONNECTION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Disconnect Trello integration
 * POST /api/trello/disconnect
 */
const disconnect = asyncHandler(async (req, res) => {
    const userId = sanitizeObjectId(req.userID);
    const firmId = sanitizeObjectId(req.firmId);

    if (!userId || !firmId) {
        throw CustomException('Unauthorized', 401);
    }

    const result = await trelloService.disconnect(firmId, userId);

    res.status(200).json({
        success: true,
        message: 'Trello integration disconnected successfully'
    });
});

/**
 * Get Trello connection status
 * GET /api/trello/status
 */
const getStatus = asyncHandler(async (req, res) => {
    const firmId = sanitizeObjectId(req.firmId);

    if (!firmId) {
        throw CustomException('Unauthorized', 401);
    }

    const status = await trelloService.getStatus(firmId);

    res.status(200).json({
        success: true,
        data: status
    });
});

// ═══════════════════════════════════════════════════════════════
// BOARD OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * List Trello boards
 * GET /api/trello/boards
 */
const listBoards = asyncHandler(async (req, res) => {
    const firmId = sanitizeObjectId(req.firmId);

    if (!firmId) {
        throw CustomException('Unauthorized', 401);
    }

    const boards = await trelloService.listBoards(firmId);

    res.status(200).json({
        success: true,
        data: boards
    });
});

/**
 * Get board details
 * GET /api/trello/boards/:boardId
 */
const getBoard = asyncHandler(async (req, res) => {
    const firmId = sanitizeObjectId(req.firmId);
    const { boardId } = req.params;

    if (!firmId) {
        throw CustomException('Unauthorized', 401);
    }

    if (!boardId) {
        throw CustomException('Board ID is required', 400);
    }

    // Validate Trello board ID format (24 hex characters)
    if (!/^[a-f0-9]{24}$/i.test(boardId)) {
        throw CustomException('Invalid Trello board ID format', 400);
    }

    const board = await trelloService.getBoard(firmId, boardId);

    res.status(200).json({
        success: true,
        data: board
    });
});

// ═══════════════════════════════════════════════════════════════
// LIST OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * List lists in a board
 * GET /api/trello/boards/:boardId/lists
 */
const listLists = asyncHandler(async (req, res) => {
    const firmId = sanitizeObjectId(req.firmId);
    const { boardId } = req.params;

    if (!firmId) {
        throw CustomException('Unauthorized', 401);
    }

    if (!boardId) {
        throw CustomException('Board ID is required', 400);
    }

    // Validate Trello board ID format
    if (!/^[a-f0-9]{24}$/i.test(boardId)) {
        throw CustomException('Invalid Trello board ID format', 400);
    }

    const lists = await trelloService.listLists(firmId, boardId);

    res.status(200).json({
        success: true,
        data: lists
    });
});

// ═══════════════════════════════════════════════════════════════
// CARD OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * List cards in a list
 * GET /api/trello/lists/:listId/cards
 */
const listCards = asyncHandler(async (req, res) => {
    const firmId = sanitizeObjectId(req.firmId);
    const { listId } = req.params;

    if (!firmId) {
        throw CustomException('Unauthorized', 401);
    }

    if (!listId) {
        throw CustomException('List ID is required', 400);
    }

    // Validate Trello list ID format
    if (!/^[a-f0-9]{24}$/i.test(listId)) {
        throw CustomException('Invalid Trello list ID format', 400);
    }

    const cards = await trelloService.listCards(firmId, listId);

    res.status(200).json({
        success: true,
        data: cards
    });
});

/**
 * Create a new card
 * POST /api/trello/cards
 * Body: { listId, name, desc?, due?, pos? }
 */
const createCard = asyncHandler(async (req, res) => {
    const firmId = sanitizeObjectId(req.firmId);
    const { listId, name, desc, due, pos } = req.body;

    if (!firmId) {
        throw CustomException('Unauthorized', 401);
    }

    if (!listId || !name) {
        throw CustomException('listId and name are required', 400);
    }

    // Validate Trello list ID format
    if (!/^[a-f0-9]{24}$/i.test(listId)) {
        throw CustomException('Invalid Trello list ID format', 400);
    }

    // Validate card name length
    if (name.length > 16384) {
        throw CustomException('Card name too long (max 16384 characters)', 400);
    }

    // Validate description length
    if (desc && desc.length > 16384) {
        throw CustomException('Card description too long (max 16384 characters)', 400);
    }

    const cardData = {
        name,
        desc,
        due,
        pos
    };

    const card = await trelloService.createCard(firmId, listId, cardData);

    res.status(201).json({
        success: true,
        message: 'Card created successfully',
        data: card
    });
});

/**
 * Update a card
 * PUT /api/trello/cards/:cardId
 * Body: { name?, desc?, due?, closed?, idList? }
 */
const updateCard = asyncHandler(async (req, res) => {
    const firmId = sanitizeObjectId(req.firmId);
    const { cardId } = req.params;
    const { name, desc, due, closed, idList } = req.body;

    if (!firmId) {
        throw CustomException('Unauthorized', 401);
    }

    if (!cardId) {
        throw CustomException('Card ID is required', 400);
    }

    // Validate Trello card ID format
    if (!/^[a-f0-9]{24}$/i.test(cardId)) {
        throw CustomException('Invalid Trello card ID format', 400);
    }

    // Build updates object
    const updates = {};
    if (name !== undefined) {
        if (name.length > 16384) {
            throw CustomException('Card name too long (max 16384 characters)', 400);
        }
        updates.name = name;
    }
    if (desc !== undefined) {
        if (desc.length > 16384) {
            throw CustomException('Card description too long (max 16384 characters)', 400);
        }
        updates.desc = desc;
    }
    if (due !== undefined) updates.due = due;
    if (closed !== undefined) updates.closed = Boolean(closed);
    if (idList !== undefined) {
        if (!/^[a-f0-9]{24}$/i.test(idList)) {
            throw CustomException('Invalid Trello list ID format', 400);
        }
        updates.idList = idList;
    }

    if (Object.keys(updates).length === 0) {
        throw CustomException('No updates provided', 400);
    }

    const card = await trelloService.updateCard(firmId, cardId, updates);

    res.status(200).json({
        success: true,
        message: 'Card updated successfully',
        data: card
    });
});

/**
 * Move card to another list
 * POST /api/trello/cards/:cardId/move
 * Body: { listId }
 */
const moveCard = asyncHandler(async (req, res) => {
    const firmId = sanitizeObjectId(req.firmId);
    const { cardId } = req.params;
    const { listId } = req.body;

    if (!firmId) {
        throw CustomException('Unauthorized', 401);
    }

    if (!cardId || !listId) {
        throw CustomException('Card ID and list ID are required', 400);
    }

    // Validate Trello IDs
    if (!/^[a-f0-9]{24}$/i.test(cardId)) {
        throw CustomException('Invalid Trello card ID format', 400);
    }

    if (!/^[a-f0-9]{24}$/i.test(listId)) {
        throw CustomException('Invalid Trello list ID format', 400);
    }

    const card = await trelloService.moveCard(firmId, cardId, listId);

    res.status(200).json({
        success: true,
        message: 'Card moved successfully',
        data: card
    });
});

/**
 * Add comment to a card
 * POST /api/trello/cards/:cardId/comments
 * Body: { text }
 */
const addComment = asyncHandler(async (req, res) => {
    const firmId = sanitizeObjectId(req.firmId);
    const { cardId } = req.params;
    const { text } = req.body;

    if (!firmId) {
        throw CustomException('Unauthorized', 401);
    }

    if (!cardId || !text) {
        throw CustomException('Card ID and comment text are required', 400);
    }

    // Validate Trello card ID format
    if (!/^[a-f0-9]{24}$/i.test(cardId)) {
        throw CustomException('Invalid Trello card ID format', 400);
    }

    // Validate comment length
    if (text.length > 16384) {
        throw CustomException('Comment too long (max 16384 characters)', 400);
    }

    const comment = await trelloService.addComment(firmId, cardId, text);

    res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        data: comment
    });
});

// ═══════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * Update Trello integration settings
 * PUT /api/trello/settings
 * Body: { notifications?, defaultBoardId?, defaultListId?, enabled?, syncInterval? }
 */
const updateSettings = asyncHandler(async (req, res) => {
    const firmId = sanitizeObjectId(req.firmId);
    const {
        notifications,
        defaultBoardId,
        defaultBoardName,
        defaultListId,
        defaultListName,
        enabled,
        syncInterval
    } = req.body;

    if (!firmId) {
        throw CustomException('Unauthorized', 401);
    }

    const settings = {};

    if (notifications) {
        // Validate notification preferences
        const validNotificationTypes = [
            'cardCreated',
            'cardUpdated',
            'cardMoved',
            'cardCompleted',
            'cardArchived',
            'commentAdded',
            'dueDateReminder'
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

    if (defaultBoardId) {
        // Validate Trello board ID format
        if (!/^[a-f0-9]{24}$/i.test(defaultBoardId)) {
            throw CustomException('Invalid Trello board ID format', 400);
        }

        settings.defaultBoardId = defaultBoardId;
        settings.defaultBoardName = defaultBoardName;
    }

    if (defaultListId) {
        // Validate Trello list ID format
        if (!/^[a-f0-9]{24}$/i.test(defaultListId)) {
            throw CustomException('Invalid Trello list ID format', 400);
        }

        settings.defaultListId = defaultListId;
        settings.defaultListName = defaultListName;
    }

    if (enabled !== undefined) {
        settings.enabled = Boolean(enabled);
    }

    if (syncInterval) {
        const validIntervals = ['manual', 'hourly', 'daily', 'realtime'];
        if (!validIntervals.includes(syncInterval)) {
            throw CustomException(
                `Invalid sync interval. Must be one of: ${validIntervals.join(', ')}`,
                400
            );
        }

        settings.syncInterval = syncInterval;
    }

    const result = await trelloService.updateSettings(firmId, settings);

    res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        data: result.settings
    });
});

/**
 * Get Trello integration settings
 * GET /api/trello/settings
 */
const getSettings = asyncHandler(async (req, res) => {
    const firmId = sanitizeObjectId(req.firmId);

    if (!firmId) {
        throw CustomException('Unauthorized', 401);
    }

    const status = await trelloService.getStatus(firmId);

    if (!status.connected) {
        throw CustomException('Trello not connected', 404);
    }

    res.status(200).json({
        success: true,
        data: status.settings
    });
});

// ═══════════════════════════════════════════════════════════════
// SYNC WITH TASKS
// ═══════════════════════════════════════════════════════════════

/**
 * Sync task/case with Trello
 * POST /api/trello/sync
 * Body: { taskId, taskType }
 */
const syncWithTasks = asyncHandler(async (req, res) => {
    const firmId = sanitizeObjectId(req.firmId);
    const { taskId, taskType } = req.body;

    if (!firmId) {
        throw CustomException('Unauthorized', 401);
    }

    if (!taskId || !taskType) {
        throw CustomException('taskId and taskType are required', 400);
    }

    // Validate task type
    if (!['case', 'task'].includes(taskType)) {
        throw CustomException('taskType must be either "case" or "task"', 400);
    }

    // Validate taskId
    const sanitizedTaskId = sanitizeObjectId(taskId);
    if (!sanitizedTaskId) {
        throw CustomException('Invalid task ID', 400);
    }

    const result = await trelloService.syncTaskToCard(firmId, sanitizedTaskId, taskType);

    res.status(200).json({
        success: true,
        message: result.created ? 'Card created and synced' : 'Card synced',
        data: result
    });
});

// ═══════════════════════════════════════════════════════════════
// WEBHOOK HANDLER
// ═══════════════════════════════════════════════════════════════

/**
 * Handle incoming webhooks from Trello
 * POST /api/trello/webhook
 * HEAD /api/trello/webhook (for webhook verification)
 */
const handleWebhook = asyncHandler(async (req, res) => {
    // Trello sends HEAD request to verify webhook endpoint
    if (req.method === 'HEAD') {
        return res.status(200).end();
    }

    const payload = req.body;
    const headers = req.headers;

    // Process webhook asynchronously
    trelloService.handleWebhook(payload, headers)
        .then(() => {
            logger.info('Trello webhook processed successfully');
        })
        .catch(error => {
            logger.error('Failed to process Trello webhook', { error: error.message });
        });

    // Respond immediately to Trello
    res.status(200).json({ success: true });
});

module.exports = {
    getAuthUrl,
    handleCallback,
    disconnect,
    getStatus,
    listBoards,
    getBoard,
    listLists,
    listCards,
    createCard,
    updateCard,
    moveCard,
    addComment,
    updateSettings,
    getSettings,
    syncWithTasks,
    handleWebhook
};
