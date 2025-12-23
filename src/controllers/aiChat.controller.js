/**
 * AI Chat Controller
 * Manages AI-powered chat conversations for users
 */

const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const AIChatService = require('../services/aiChat.service');
const { ChatHistory } = require('../models');
const { v4: uuidv4 } = require('uuid');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

/**
 * Validate and sanitize chat message input
 * Prevents prompt injection and ensures message safety
 */
const validateChatMessage = (message) => {
    if (!message || typeof message !== 'string') {
        throw CustomException('Message is required and must be a string', 400);
    }

    const trimmedMessage = message.trim();

    // Check minimum length
    if (trimmedMessage.length === 0) {
        throw CustomException('Message cannot be empty', 400);
    }

    // Check maximum length to prevent token flooding and prompt injection
    const MAX_MESSAGE_LENGTH = 10000;
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
        throw CustomException(`Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`, 400);
    }

    // Detect potential prompt injection patterns
    const injectionPatterns = [
        /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|commands?)/i,
        /disregard\s+(all\s+)?(previous|prior|above)/i,
        /forget\s+(all\s+)?(previous|prior|above)/i,
        /new\s+(instructions?|prompts?|commands?)\s*:/i,
        /system\s*:\s*you\s+are/i,
        /\[SYSTEM\]/i,
        /\bprompt\s*=\s*/i,
        /jailbreak/i,
        /<\|im_start\|>/i,
        /<\|im_end\|>/i
    ];

    for (const pattern of injectionPatterns) {
        if (pattern.test(trimmedMessage)) {
            throw CustomException('Message contains potentially unsafe content', 400);
        }
    }

    // Remove null bytes and control characters
    const sanitizedMessage = trimmedMessage.replace(/\0/g, '');

    return sanitizedMessage;
};

/**
 * Validate provider and model inputs
 */
const validateProviderAndModel = (provider, model) => {
    const allowedProviders = ['anthropic', 'openai'];

    if (provider && !allowedProviders.includes(provider)) {
        throw CustomException('Invalid provider. Must be "anthropic" or "openai"', 400);
    }

    if (model && typeof model !== 'string') {
        throw CustomException('Model must be a string', 400);
    }

    if (model && model.length > 100) {
        throw CustomException('Model name exceeds maximum length', 400);
    }

    return true;
};

/**
 * Send a message and get AI response
 * POST /api/chat
 * Body: { message, conversationId?, provider?, model? }
 */
const sendMessage = asyncHandler(async (req, res) => {
    // Mass assignment protection - only allow specific fields
    const allowedFields = pickAllowedFields(req.body, ['message', 'conversationId', 'provider', 'model']);
    const { message, conversationId, provider, model } = allowedFields;

    const userId = req.userID;
    const firmId = req.firmId;

    // Validate and sanitize message input (prevent prompt injection)
    const sanitizedMessage = validateChatMessage(message);

    // Validate provider and model
    validateProviderAndModel(provider, model);

    // Check if provider is configured for the firm
    const availableProviders = await AIChatService.getAvailableProviders(firmId);

    if (!availableProviders.anthropic && !availableProviders.openai) {
        throw CustomException('No AI providers are configured for your firm. Please contact your administrator.', 400);
    }

    // Use specified provider or default to first available
    const selectedProvider = provider || (availableProviders.anthropic ? 'anthropic' : 'openai');

    if ((selectedProvider === 'anthropic' && !availableProviders.anthropic) ||
        (selectedProvider === 'openai' && !availableProviders.openai)) {
        throw CustomException(`Provider '${selectedProvider}' is not configured for your firm`, 400);
    }

    // Create or validate conversation
    let conversation;
    let newConversationId = conversationId;

    if (conversationId) {
        // Sanitize conversationId to prevent injection
        const sanitizedConversationId = conversationId;

        // IDOR Protection: Verify conversation exists and user owns it
        conversation = await ChatHistory.findOne({
            conversationId: sanitizedConversationId,
            userId,
            firmId
        });

        if (!conversation) {
            throw CustomException('Conversation not found or you do not have access', 404);
        }

        // Check if conversation is archived
        if (conversation.status === 'archived') {
            throw CustomException('Cannot send messages to an archived conversation', 400);
        }
    } else {
        // Create new conversation with first message
        newConversationId = uuidv4();

        // Generate a title from the first message (truncate if needed)
        const title = sanitizedMessage.length > 50
            ? sanitizedMessage.substring(0, 47) + '...'
            : sanitizedMessage;

        conversation = new ChatHistory({
            conversationId: newConversationId,
            userId,
            firmId,
            title,
            provider: selectedProvider,
            messages: [],
            status: 'active',
            metadata: {
                model: model || null,
                createdAt: new Date()
            }
        });
    }

    // Add user message (use sanitized message)
    conversation.messages.push({
        role: 'user',
        content: sanitizedMessage,
        timestamp: new Date()
    });

    try {
        // Get conversation history for context
        const history = conversation.messages.map(m => ({
            role: m.role,
            content: m.content
        }));

        // Call AI service
        const chatResponse = await AIChatService.chat(history, {
            provider: selectedProvider,
            firmId,
            model: model || null,
            maxTokens: 2048,
            temperature: 0.7
        });

        // Add AI response to conversation
        conversation.messages.push({
            role: 'assistant',
            content: chatResponse.content,
            timestamp: new Date(),
            tokens: chatResponse.tokens?.total || 0
        });

        // Update conversation metadata
        conversation.lastMessageAt = new Date();
        conversation.totalTokens = (conversation.totalTokens || 0) + (chatResponse.tokens?.total || 0);

        if (model && !conversation.metadata.model) {
            conversation.metadata.model = model;
        }

        await conversation.save();

        res.json({
            success: true,
            data: {
                response: chatResponse.content,
                conversationId: newConversationId,
                tokens: chatResponse.tokens,
                model: chatResponse.model
            }
        });
    } catch (error) {
        // Save conversation with error state
        conversation.messages[conversation.messages.length - 1].metadata = {
            error: error.message,
            failed: true
        };
        await conversation.save();

        throw error;
    }
});

/**
 * Stream a message response using Server-Sent Events
 * POST /api/chat/stream
 * Body: { message, conversationId?, provider?, model? }
 */
const streamMessage = asyncHandler(async (req, res) => {
    // Mass assignment protection - only allow specific fields
    const allowedFields = pickAllowedFields(req.body, ['message', 'conversationId', 'provider', 'model']);
    const { message, conversationId, provider, model } = allowedFields;

    const userId = req.userID;
    const firmId = req.firmId;

    // Validate and sanitize message input (prevent prompt injection)
    const sanitizedMessage = validateChatMessage(message);

    // Validate provider and model
    validateProviderAndModel(provider, model);

    // Check if provider is configured for the firm
    const availableProviders = await AIChatService.getAvailableProviders(firmId);

    if (!availableProviders.anthropic && !availableProviders.openai) {
        throw CustomException('No AI providers are configured for your firm. Please contact your administrator.', 400);
    }

    // Use specified provider or default to first available
    const selectedProvider = provider || (availableProviders.anthropic ? 'anthropic' : 'openai');

    if ((selectedProvider === 'anthropic' && !availableProviders.anthropic) ||
        (selectedProvider === 'openai' && !availableProviders.openai)) {
        throw CustomException(`Provider '${selectedProvider}' is not configured for your firm`, 400);
    }

    // Create or validate conversation
    let conversation;
    let newConversationId = conversationId;

    if (conversationId) {
        // Sanitize conversationId to prevent injection
        const sanitizedConversationId = conversationId;

        // IDOR Protection: Verify conversation exists and user owns it
        conversation = await ChatHistory.findOne({
            conversationId: sanitizedConversationId,
            userId,
            firmId
        });

        if (!conversation) {
            throw CustomException('Conversation not found or you do not have access', 404);
        }

        // Check if conversation is archived
        if (conversation.status === 'archived') {
            throw CustomException('Cannot send messages to an archived conversation', 400);
        }
    } else {
        // Create new conversation
        newConversationId = uuidv4();

        // Generate a title from the first message (truncate if needed)
        const title = sanitizedMessage.length > 50
            ? sanitizedMessage.substring(0, 47) + '...'
            : sanitizedMessage;

        conversation = new ChatHistory({
            conversationId: newConversationId,
            userId,
            firmId,
            title,
            provider: selectedProvider,
            messages: [],
            status: 'active',
            metadata: {
                model: model || null,
                createdAt: new Date()
            }
        });
    }

    // Add user message (use sanitized message)
    conversation.messages.push({
        role: 'user',
        content: sanitizedMessage,
        timestamp: new Date()
    });

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering in nginx

    // Get conversation history for context
    const history = conversation.messages.map(m => ({
        role: m.role,
        content: m.content
    }));

    let fullResponse = '';
    let tokenUsage = null;
    let usedModel = null;

    try {
        // Stream from AI service
        const stream = AIChatService.streamChat(history, {
            provider: selectedProvider,
            firmId,
            model: model || null,
            maxTokens: 2048,
            temperature: 0.7
        });

        for await (const chunk of stream) {
            if (chunk.content) {
                fullResponse += chunk.content;
                res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk.content })}\n\n`);
            }
            if (chunk.done) {
                tokenUsage = chunk.tokens;
                usedModel = chunk.model;
            }
        }

        // Send completion event
        res.write(`data: ${JSON.stringify({
            type: 'complete',
            conversationId: newConversationId,
            tokens: tokenUsage,
            model: usedModel
        })}\n\n`);

        // Add complete AI response to conversation
        conversation.messages.push({
            role: 'assistant',
            content: fullResponse,
            timestamp: new Date(),
            tokens: tokenUsage?.total || 0
        });

        // Update conversation metadata
        conversation.lastMessageAt = new Date();
        conversation.totalTokens = (conversation.totalTokens || 0) + (tokenUsage?.total || 0);

        if (model && !conversation.metadata.model) {
            conversation.metadata.model = model;
        }

        await conversation.save();

        // End the stream
        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error) {
        // Send error event
        res.write(`data: ${JSON.stringify({
            type: 'error',
            message: error.message
        })}\n\n`);
        res.end();

        // Save conversation with error
        if (fullResponse) {
            conversation.messages.push({
                role: 'assistant',
                content: fullResponse,
                timestamp: new Date(),
                metadata: { error: error.message, partial: true }
            });
        }
        await conversation.save();
    }
});

/**
 * Get user's conversations with pagination
 * GET /api/chat/conversations
 * Query: page, limit, status
 */
const getConversations = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status } = req.query;
    const userId = req.userID;
    const firmId = req.firmId;

    const query = {
        userId,
        firmId
    };

    if (status) {
        query.status = status;
    }

    const conversations = await ChatHistory.find(query)
        .sort({ lastMessageAt: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .select('conversationId title provider status lastMessageAt totalTokens messages createdAt')
        .lean();

    // Format response with last message preview
    const formattedConversations = conversations.map(conv => {
        const lastMessage = conv.messages && conv.messages.length > 0
            ? conv.messages[conv.messages.length - 1]
            : null;

        return {
            conversationId: conv.conversationId,
            title: conv.title,
            provider: conv.provider,
            status: conv.status,
            lastMessageAt: conv.lastMessageAt,
            totalTokens: conv.totalTokens,
            messageCount: conv.messages ? conv.messages.length : 0,
            createdAt: conv.createdAt,
            lastMessage: lastMessage ? {
                role: lastMessage.role,
                content: lastMessage.content.substring(0, 100) + (lastMessage.content.length > 100 ? '...' : ''),
                timestamp: lastMessage.timestamp
            } : null
        };
    });

    const total = await ChatHistory.countDocuments(query);

    res.json({
        success: true,
        data: formattedConversations,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get a single conversation with all messages
 * GET /api/chat/conversations/:conversationId
 */
const getConversation = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    // Sanitize conversationId
    const sanitizedConversationId = conversationId;

    // IDOR Protection: Verify conversation exists and user owns it
    const conversation = await ChatHistory.findOne({
        conversationId: sanitizedConversationId,
        userId,
        firmId
    }).lean();

    if (!conversation) {
        throw CustomException('Conversation not found or you do not have access', 404);
    }

    res.json({
        success: true,
        data: {
            conversationId: conversation.conversationId,
            title: conversation.title,
            provider: conversation.provider,
            status: conversation.status,
            messages: conversation.messages,
            totalTokens: conversation.totalTokens,
            createdAt: conversation.createdAt,
            lastMessageAt: conversation.lastMessageAt
        }
    });
});

/**
 * Delete (archive) a conversation
 * DELETE /api/chat/conversations/:conversationId
 */
const deleteConversation = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    // Sanitize conversationId
    const sanitizedConversationId = conversationId;

    // IDOR Protection: Verify conversation exists and user owns it
    const conversation = await ChatHistory.findOne({
        conversationId: sanitizedConversationId,
        userId,
        firmId
    });

    if (!conversation) {
        throw CustomException('Conversation not found or you do not have access', 404);
    }

    // Soft delete by archiving
    conversation.status = 'archived';
    await conversation.save();

    res.json({
        success: true,
        message: 'Conversation archived successfully'
    });
});

/**
 * Update conversation title
 * PATCH /api/chat/conversations/:conversationId
 * Body: { title }
 */
const updateConversationTitle = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;

    // Mass assignment protection - only allow title field
    const allowedFields = pickAllowedFields(req.body, ['title']);
    const { title } = allowedFields;

    const userId = req.userID;
    const firmId = req.firmId;

    // Validate input
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
        throw CustomException('Title is required and must be a non-empty string', 400);
    }

    if (title.length > 200) {
        throw CustomException('Title must be less than 200 characters', 400);
    }

    // Sanitize title - remove null bytes and excessive whitespace
    const sanitizedTitle = title.trim().replace(/\0/g, '').replace(/\s{2,}/g, ' ');

    // Sanitize conversationId
    const sanitizedConversationId = conversationId;

    // IDOR Protection: Verify conversation exists and user owns it
    const conversation = await ChatHistory.findOne({
        conversationId: sanitizedConversationId,
        userId,
        firmId
    });

    if (!conversation) {
        throw CustomException('Conversation not found or you do not have access', 404);
    }

    // Update title with sanitized version
    conversation.title = sanitizedTitle;
    await conversation.save();

    res.json({
        success: true,
        message: 'Conversation title updated successfully',
        data: {
            conversationId: conversation.conversationId,
            title: conversation.title
        }
    });
});

/**
 * Get available AI providers for the firm
 * GET /api/chat/providers
 */
const getProviders = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('Firm ID required', 400);
    }

    const providers = await AIChatService.getAvailableProviders(firmId);

    res.json({
        success: true,
        data: {
            anthropic: providers.anthropic,
            openai: providers.openai,
            count: (providers.anthropic ? 1 : 0) + (providers.openai ? 1 : 0)
        }
    });
});

module.exports = {
    sendMessage,
    streamMessage,
    getConversations,
    getConversation,
    deleteConversation,
    updateConversationTitle,
    getProviders
};
