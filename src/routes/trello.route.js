const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const {
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
} = require('../controllers/trello.controller');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// OAUTH ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * Get OAuth authorization URL
 * GET /api/trello/auth-url
 *
 * Returns the Trello OAuth URL that users should visit to authorize
 * the integration.
 */
router.get('/auth-url', userMiddleware, firmFilter, getAuthUrl);

/**
 * OAuth callback handler
 * GET /api/trello/callback?token=...&state=...
 *
 * Handles the OAuth redirect from Trello after user authorizes.
 * Exchanges the authorization token for access tokens.
 * Redirects back to frontend with success/error status.
 */
router.get('/callback', handleCallback);

// ═══════════════════════════════════════════════════════════════
// CONNECTION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Get connection status
 * GET /api/trello/status
 *
 * Returns the current Trello integration status including:
 * - Connection state
 * - User info
 * - Statistics
 * - Settings
 * - Boards
 */
router.get('/status', userMiddleware, firmFilter, getStatus);

/**
 * Disconnect Trello integration
 * POST /api/trello/disconnect
 *
 * Revokes access tokens and disconnects the Trello integration.
 */
router.post('/disconnect', userMiddleware, firmFilter, disconnect);

// ═══════════════════════════════════════════════════════════════
// BOARD OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * List Trello boards
 * GET /api/trello/boards
 *
 * Returns list of user's Trello boards.
 */
router.get('/boards', userMiddleware, firmFilter, listBoards);

/**
 * Get board details
 * GET /api/trello/boards/:boardId
 *
 * Returns detailed information about a specific board.
 */
router.get('/boards/:boardId', userMiddleware, firmFilter, getBoard);

/**
 * List lists in a board
 * GET /api/trello/boards/:boardId/lists
 *
 * Returns all lists in a specific board.
 */
router.get('/boards/:boardId/lists', userMiddleware, firmFilter, listLists);

// ═══════════════════════════════════════════════════════════════
// LIST OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * List cards in a list
 * GET /api/trello/lists/:listId/cards
 *
 * Returns all cards in a specific list.
 */
router.get('/lists/:listId/cards', userMiddleware, firmFilter, listCards);

// ═══════════════════════════════════════════════════════════════
// CARD OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create new card
 * POST /api/trello/cards
 *
 * Body:
 * {
 *   "listId": "5e8b9f...",      // Required: Trello list ID
 *   "name": "Card title",        // Required: Card name
 *   "desc": "Description",       // Optional: Card description
 *   "due": "2024-12-31",        // Optional: Due date (ISO 8601)
 *   "pos": "top"                // Optional: Position (top, bottom, or number)
 * }
 */
router.post('/cards', userMiddleware, firmFilter, createCard);

/**
 * Update card
 * PUT /api/trello/cards/:cardId
 *
 * Body:
 * {
 *   "name": "Updated title",     // Optional: Card name
 *   "desc": "Updated desc",      // Optional: Card description
 *   "due": "2024-12-31",        // Optional: Due date
 *   "closed": false,            // Optional: Archive status
 *   "idList": "5e8b9f..."       // Optional: Move to list
 * }
 */
router.put('/cards/:cardId', userMiddleware, firmFilter, updateCard);

/**
 * Move card to another list
 * POST /api/trello/cards/:cardId/move
 *
 * Body:
 * {
 *   "listId": "5e8b9f..."       // Required: Target list ID
 * }
 */
router.post('/cards/:cardId/move', userMiddleware, firmFilter, moveCard);

/**
 * Add comment to card
 * POST /api/trello/cards/:cardId/comments
 *
 * Body:
 * {
 *   "text": "Comment text"      // Required: Comment content
 * }
 */
router.post('/cards/:cardId/comments', userMiddleware, firmFilter, addComment);

// ═══════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * Get integration settings
 * GET /api/trello/settings
 *
 * Returns current notification preferences and sync settings.
 */
router.get('/settings', userMiddleware, firmFilter, getSettings);

/**
 * Update integration settings
 * PUT /api/trello/settings
 *
 * Body:
 * {
 *   "notifications": {
 *     "cardCreated": true,
 *     "cardUpdated": true,
 *     "cardMoved": true,
 *     "cardCompleted": true,
 *     "cardArchived": false,
 *     "commentAdded": true,
 *     "dueDateReminder": true
 *   },
 *   "defaultBoardId": "5e8b9f...",
 *   "defaultBoardName": "My Board",
 *   "defaultListId": "5e8b9f...",
 *   "defaultListName": "To Do",
 *   "enabled": true,
 *   "syncInterval": "manual"     // manual, hourly, daily, realtime
 * }
 */
router.put('/settings', userMiddleware, firmFilter, updateSettings);

// ═══════════════════════════════════════════════════════════════
// SYNC WITH TASKS/CASES
// ═══════════════════════════════════════════════════════════════

/**
 * Sync task or case with Trello
 * POST /api/trello/sync
 *
 * Body:
 * {
 *   "taskId": "507f1f77...",    // Required: Task or Case ID
 *   "taskType": "task"          // Required: "task" or "case"
 * }
 *
 * Creates a Trello card from the task/case or updates existing card.
 */
router.post('/sync', userMiddleware, firmFilter, syncWithTasks);

// ═══════════════════════════════════════════════════════════════
// WEBHOOK ENDPOINT
// ═══════════════════════════════════════════════════════════════

/**
 * Incoming webhook handler
 * POST /api/trello/webhook
 * HEAD /api/trello/webhook
 *
 * Receives events from Trello (card created, updated, moved, etc.)
 * This endpoint is called by Trello, not by the frontend.
 *
 * Note: No authentication middleware - webhook validation
 * is handled in the controller.
 */
router.post('/webhook', handleWebhook);
router.head('/webhook', handleWebhook);

module.exports = router;
