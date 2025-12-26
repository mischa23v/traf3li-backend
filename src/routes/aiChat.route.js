/**
 * AI Chat Routes
 *
 * Provides endpoints for AI-powered chat functionality, including:
 * - Sending messages to AI assistants
 * - Streaming responses via Server-Sent Events (SSE)
 * - Managing conversation history
 * - Provider configuration and selection
 *
 * All routes require user authentication and firm context filtering.
 *
 * @module routes/aiChat
 */

const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    sendMessage,
    streamMessage,
    getConversations,
    getConversation,
    deleteConversation,
    updateConversationTitle,
    getProviders
} = require('../controllers/aiChat.controller');

const router = express.Router();

// =============================================================================
// Provider Configuration Routes
// =============================================================================

/**
 * GET /ai-chat/providers
 *
 * Retrieves the list of available AI providers configured for the firm.
 * Returns provider details including name, model, and capabilities.
 *
 * @auth Required - userMiddleware
 * @filter firmFilter - Filters by authenticated user's firm
 * @returns {Object[]} Array of available AI providers
 */
router.get('/providers', userMiddleware, getProviders);

// =============================================================================
// Message Routes
// =============================================================================

/**
 * POST /ai-chat
 *
 * Sends a message to the AI assistant and receives a complete response.
 * Use this endpoint for traditional request-response pattern.
 *
 * @auth Required - userMiddleware
 * @filter firmFilter - Filters by authenticated user's firm
 * @body {string} message - The user's message
 * @body {string} [conversationId] - Optional conversation ID to continue existing conversation
 * @body {string} [provider] - Optional provider selection (defaults to firm's primary provider)
 * @returns {Object} Response containing AI message and conversation metadata
 */
router.post('/', userMiddleware, sendMessage);

/**
 * POST /ai-chat/stream
 *
 * Sends a message to the AI assistant and receives a streaming response via SSE.
 * Use this endpoint for real-time token-by-token streaming responses.
 *
 * @auth Required - userMiddleware
 * @filter firmFilter - Filters by authenticated user's firm
 * @body {string} message - The user's message
 * @body {string} [conversationId] - Optional conversation ID to continue existing conversation
 * @body {string} [provider] - Optional provider selection (defaults to firm's primary provider)
 * @returns {EventStream} Server-Sent Events stream with AI response tokens
 */
router.post('/stream', userMiddleware, streamMessage);

// =============================================================================
// Conversation Management Routes
// =============================================================================

/**
 * GET /ai-chat/conversations
 *
 * Retrieves all conversations for the authenticated user within their firm.
 * Returns conversations sorted by most recent activity.
 *
 * @auth Required - userMiddleware
 * @filter firmFilter - Filters by authenticated user's firm
 * @query {number} [page=1] - Page number for pagination
 * @query {number} [limit=20] - Number of conversations per page
 * @returns {Object} Paginated list of conversations with metadata
 */
router.get('/conversations', userMiddleware, getConversations);

/**
 * GET /ai-chat/conversations/:conversationId
 *
 * Retrieves a specific conversation including full message history.
 * User must be the owner of the conversation and within the same firm.
 *
 * @auth Required - userMiddleware
 * @filter firmFilter - Filters by authenticated user's firm
 * @param {string} conversationId - The conversation ID
 * @returns {Object} Conversation object with complete message history
 */
router.get('/conversations/:conversationId', userMiddleware, getConversation);

/**
 * PATCH /ai-chat/conversations/:conversationId
 *
 * Updates the title of a specific conversation.
 * User must be the owner of the conversation.
 *
 * @auth Required - userMiddleware
 * @filter firmFilter - Filters by authenticated user's firm
 * @param {string} conversationId - The conversation ID
 * @body {string} title - The new conversation title
 * @returns {Object} Updated conversation object
 */
router.patch('/conversations/:conversationId', userMiddleware, updateConversationTitle);

/**
 * DELETE /ai-chat/conversations/:conversationId
 *
 * Deletes (archives) a specific conversation.
 * This is typically a soft delete - the conversation is marked as deleted
 * but may be retained for audit purposes.
 *
 * @auth Required - userMiddleware
 * @filter firmFilter - Filters by authenticated user's firm
 * @param {string} conversationId - The conversation ID
 * @returns {Object} Success confirmation message
 */
router.delete('/conversations/:conversationId', userMiddleware, deleteConversation);

// =============================================================================
// Export Router
// =============================================================================

module.exports = router;
