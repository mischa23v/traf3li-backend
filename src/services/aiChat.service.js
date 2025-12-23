const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const AISettingsService = require('./aiSettings.service');
const logger = require('../utils/logger');

/**
 * AI Chat Service
 * Provides unified chat interface for multiple AI providers (Anthropic Claude, OpenAI GPT)
 * Handles API key management, usage tracking, and error handling
 */

// Default system prompt for legal context
const DEFAULT_SYSTEM_PROMPT = "You are an AI assistant for a law firm management system. Help users with legal tasks, case management, scheduling, and general productivity. Be professional, accurate, and helpful. If asked about specific legal advice, remind users to consult with a qualified attorney.";

// Default models for each provider
const DEFAULT_MODELS = {
    anthropic: 'claude-3-5-sonnet-20241022',
    openai: 'gpt-4o'
};

class AIChatService {
    /**
     * Main chat method - routes to appropriate provider
     * @param {Array} messages - Array of {role, content} objects
     * @param {Object} options - Chat options
     * @param {string} options.provider - 'anthropic' | 'openai' (default: 'anthropic')
     * @param {string} options.firmId - Required for API key lookup
     * @param {string} options.model - Optional model override
     * @param {number} options.maxTokens - Max response tokens (default: 1024)
     * @param {number} options.temperature - Response temperature (default: 0.7)
     * @param {string} options.systemPrompt - Optional system prompt for context
     * @returns {Promise<Object>} { content, tokens, model }
     */
    static async chat(messages, options = {}) {
        const {
            provider = 'anthropic',
            firmId,
            model,
            maxTokens = 1024,
            temperature = 0.7,
            systemPrompt
        } = options;

        if (!firmId) {
            throw new Error('firmId is required for chat requests');
        }

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            throw new Error('messages array is required and cannot be empty');
        }

        // Route to appropriate provider
        if (provider === 'anthropic') {
            return this.chatWithClaude(messages, firmId, {
                model,
                maxTokens,
                temperature,
                systemPrompt
            });
        } else if (provider === 'openai') {
            return this.chatWithGPT(messages, firmId, {
                model,
                maxTokens,
                temperature,
                systemPrompt
            });
        } else {
            throw new Error(`Unsupported provider: ${provider}. Use 'anthropic' or 'openai'`);
        }
    }

    /**
     * Chat with Claude (Anthropic)
     * @param {Array} messages - Array of {role, content} objects
     * @param {string} firmId - Firm ID for API key lookup
     * @param {Object} options - Chat options
     * @returns {Promise<Object>} { content, tokens, model }
     */
    static async chatWithClaude(messages, firmId, options = {}) {
        const {
            model = DEFAULT_MODELS.anthropic,
            maxTokens = 1024,
            temperature = 0.7,
            systemPrompt = DEFAULT_SYSTEM_PROMPT
        } = options;

        // Get API key from firm settings
        const apiKey = await AISettingsService.getApiKey(firmId, 'anthropic');

        if (!apiKey) {
            throw new Error('Anthropic API key not configured for this firm. Please configure it in AI Settings.');
        }

        try {
            const anthropic = new Anthropic({ apiKey });

            // Make the chat request
            const response = await anthropic.messages.create({
                model,
                max_tokens: maxTokens,
                temperature,
                system: systemPrompt,
                messages: messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                }))
            });

            // Extract response content
            const content = response.content[0]?.text || '';

            // Calculate token usage
            const tokens = response.usage?.input_tokens + response.usage?.output_tokens || 0;

            // Track usage
            await AISettingsService.incrementUsage(firmId, 'anthropic', tokens);

            return {
                content,
                tokens: {
                    input: response.usage?.input_tokens || 0,
                    output: response.usage?.output_tokens || 0,
                    total: tokens
                },
                model: response.model
            };
        } catch (error) {
            return this._handleError(error, 'anthropic');
        }
    }

    /**
     * Chat with GPT (OpenAI)
     * @param {Array} messages - Array of {role, content} objects
     * @param {string} firmId - Firm ID for API key lookup
     * @param {Object} options - Chat options
     * @returns {Promise<Object>} { content, tokens, model }
     */
    static async chatWithGPT(messages, firmId, options = {}) {
        const {
            model = DEFAULT_MODELS.openai,
            maxTokens = 1024,
            temperature = 0.7,
            systemPrompt = DEFAULT_SYSTEM_PROMPT
        } = options;

        // Get API key from firm settings
        const apiKey = await AISettingsService.getApiKey(firmId, 'openai');

        if (!apiKey) {
            throw new Error('OpenAI API key not configured for this firm. Please configure it in AI Settings.');
        }

        try {
            // Prepare messages with system prompt
            const formattedMessages = [
                { role: 'system', content: systemPrompt },
                ...messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                }))
            ];

            // Make the chat request using axios
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model,
                    messages: formattedMessages,
                    max_tokens: maxTokens,
                    temperature
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000 // 60 second timeout
                }
            );

            // Extract response content
            const content = response.data.choices[0]?.message?.content || '';

            // Calculate token usage
            const usage = response.data.usage || {};
            const tokens = usage.total_tokens || 0;

            // Track usage
            await AISettingsService.incrementUsage(firmId, 'openai', tokens);

            return {
                content,
                tokens: {
                    input: usage.prompt_tokens || 0,
                    output: usage.completion_tokens || 0,
                    total: tokens
                },
                model: response.data.model
            };
        } catch (error) {
            return this._handleError(error, 'openai');
        }
    }

    /**
     * Streaming chat - yields response chunks in real-time
     * @param {Array} messages - Array of {role, content} objects
     * @param {Object} options - Chat options (same as chat method)
     * @returns {AsyncGenerator} Yields { content, done } chunks
     */
    static async *streamChat(messages, options = {}) {
        const {
            provider = 'anthropic',
            firmId,
            model,
            maxTokens = 1024,
            temperature = 0.7,
            systemPrompt = DEFAULT_SYSTEM_PROMPT
        } = options;

        if (!firmId) {
            throw new Error('firmId is required for chat requests');
        }

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            throw new Error('messages array is required and cannot be empty');
        }

        if (provider === 'anthropic') {
            yield* this._streamClaude(messages, firmId, {
                model,
                maxTokens,
                temperature,
                systemPrompt
            });
        } else if (provider === 'openai') {
            yield* this._streamGPT(messages, firmId, {
                model,
                maxTokens,
                temperature,
                systemPrompt
            });
        } else {
            throw new Error(`Unsupported provider: ${provider}. Use 'anthropic' or 'openai'`);
        }
    }

    /**
     * Stream chat with Claude
     * @private
     */
    static async *_streamClaude(messages, firmId, options = {}) {
        const {
            model = DEFAULT_MODELS.anthropic,
            maxTokens = 1024,
            temperature = 0.7,
            systemPrompt = DEFAULT_SYSTEM_PROMPT
        } = options;

        const apiKey = await AISettingsService.getApiKey(firmId, 'anthropic');

        if (!apiKey) {
            throw new Error('Anthropic API key not configured for this firm. Please configure it in AI Settings.');
        }

        try {
            const anthropic = new Anthropic({ apiKey });

            const stream = await anthropic.messages.stream({
                model,
                max_tokens: maxTokens,
                temperature,
                system: systemPrompt,
                messages: messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                }))
            });

            let totalTokens = 0;

            for await (const chunk of stream) {
                if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
                    yield {
                        content: chunk.delta.text,
                        done: false
                    };
                }

                if (chunk.type === 'message_stop') {
                    const message = await stream.finalMessage();
                    totalTokens = (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0);
                }
            }

            // Track usage after streaming completes
            if (totalTokens > 0) {
                await AISettingsService.incrementUsage(firmId, 'anthropic', totalTokens);
            }

            yield { content: '', done: true, tokens: totalTokens };
        } catch (error) {
            throw this._handleError(error, 'anthropic');
        }
    }

    /**
     * Stream chat with GPT
     * @private
     */
    static async *_streamGPT(messages, firmId, options = {}) {
        const {
            model = DEFAULT_MODELS.openai,
            maxTokens = 1024,
            temperature = 0.7,
            systemPrompt = DEFAULT_SYSTEM_PROMPT
        } = options;

        const apiKey = await AISettingsService.getApiKey(firmId, 'openai');

        if (!apiKey) {
            throw new Error('OpenAI API key not configured for this firm. Please configure it in AI Settings.');
        }

        try {
            const formattedMessages = [
                { role: 'system', content: systemPrompt },
                ...messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                }))
            ];

            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model,
                    messages: formattedMessages,
                    max_tokens: maxTokens,
                    temperature,
                    stream: true
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    responseType: 'stream',
                    timeout: 60000
                }
            );

            let fullContent = '';

            for await (const chunk of response.data) {
                const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (line.includes('[DONE]')) {
                        continue;
                    }

                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);

                        if (data === '[DONE]') {
                            continue;
                        }

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices[0]?.delta?.content;

                            if (content) {
                                fullContent += content;
                                yield {
                                    content,
                                    done: false
                                };
                            }
                        } catch (parseError) {
                            // Skip invalid JSON chunks
                            continue;
                        }
                    }
                }
            }

            // Estimate token usage (rough approximation: 1 token ≈ 4 characters)
            const estimatedTokens = Math.ceil(fullContent.length / 4);
            await AISettingsService.incrementUsage(firmId, 'openai', estimatedTokens);

            yield { content: '', done: true, tokens: estimatedTokens };
        } catch (error) {
            throw this._handleError(error, 'openai');
        }
    }

    /**
     * Generate a conversation title from the first few messages
     * @param {Array} messages - Array of {role, content} objects
     * @param {string} firmId - Firm ID for API key lookup
     * @param {string} provider - Provider to use (default: 'anthropic')
     * @returns {Promise<string>} Generated title (5-10 words)
     */
    static async generateTitle(messages, firmId, provider = 'anthropic') {
        if (!messages || messages.length === 0) {
            return 'New Conversation';
        }

        // Take first 3 messages for context
        const contextMessages = messages.slice(0, 3);

        // Create a prompt to generate a title
        const titlePrompt = [
            ...contextMessages,
            {
                role: 'user',
                content: 'Based on the conversation above, generate a short, descriptive title of 5-10 words. Return ONLY the title, nothing else.'
            }
        ];

        try {
            const response = await this.chat(titlePrompt, {
                provider,
                firmId,
                maxTokens: 50,
                temperature: 0.5
            });

            // Clean up the title (remove quotes, periods, etc.)
            let title = response.content.trim();
            title = title.replace(/^["']|["']$/g, ''); // Remove surrounding quotes
            title = title.replace(/\.$/, ''); // Remove trailing period

            // Limit to reasonable length
            if (title.length > 100) {
                title = title.substring(0, 97) + '...';
            }

            return title || 'New Conversation';
        } catch (error) {
            logger.error('Error generating conversation title:', error.message);
            // Fallback: use first message content (truncated)
            const firstUserMessage = messages.find(m => m.role === 'user');
            if (firstUserMessage) {
                const content = firstUserMessage.content.substring(0, 50);
                return content.length < firstUserMessage.content.length ? content + '...' : content;
            }
            return 'New Conversation';
        }
    }

    /**
     * Check which AI providers are configured for a firm
     * @param {string} firmId - Firm ID
     * @returns {Promise<Object>} { anthropic: boolean, openai: boolean }
     */
    static async getAvailableProviders(firmId) {
        try {
            const [anthropicKey, openaiKey] = await Promise.all([
                AISettingsService.getApiKey(firmId, 'anthropic'),
                AISettingsService.getApiKey(firmId, 'openai')
            ]);

            return {
                anthropic: !!anthropicKey,
                openai: !!openaiKey
            };
        } catch (error) {
            logger.error('Error checking available providers:', error.message);
            return {
                anthropic: false,
                openai: false
            };
        }
    }

    /**
     * Handle errors gracefully
     * @private
     * @param {Error} error - Error object
     * @param {string} provider - Provider name
     * @throws {Error} Formatted error
     */
    static _handleError(error, provider) {
        logger.error(`AI Chat Error (${provider}):`, error.message);

        // Anthropic errors
        if (error.status === 401) {
            throw new Error(`Invalid ${provider} API key. Please check your AI Settings.`);
        }

        if (error.status === 429 || error.response?.status === 429) {
            throw new Error(`${provider} rate limit exceeded. Please try again later.`);
        }

        if (error.status === 400 || error.response?.status === 400) {
            throw new Error(`Invalid request to ${provider}. Please check your input.`);
        }

        if (error.status === 500 || error.response?.status === 500) {
            throw new Error(`${provider} service is currently unavailable. Please try again later.`);
        }

        // Network errors
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            throw new Error(`Request to ${provider} timed out. Please try again.`);
        }

        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            throw new Error(`Cannot connect to ${provider}. Please check your network connection.`);
        }

        // Generic error (don't expose internal details)
        throw new Error(`AI chat service error. Please try again or contact support.`);
    }
}

// Export as singleton instance
module.exports = AIChatService;
