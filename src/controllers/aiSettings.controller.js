/**
 * AI Settings Controller
 * Manages firm-level API keys for AI services
 */

const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const AISettingsService = require('../services/aiSettings.service');

/**
 * Get AI settings for the firm
 * GET /api/settings/ai
 */
const getAISettings = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('Firm ID required', 400);
    }

    // Only admin/owner can view settings
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('Only firm owners and admins can view AI settings', 403);
    }

    const settings = await AISettingsService.getSettings(firmId);

    res.json({
        success: true,
        data: settings
    });
});

/**
 * Save an API key for a provider
 * POST /api/settings/ai/keys
 * Body: { provider: 'openai' | 'anthropic' | 'google', apiKey: 'sk-...' }
 */
const saveApiKey = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { provider, apiKey } = req.body;

    if (!firmId) {
        throw CustomException('Firm ID required', 400);
    }

    // Only admin/owner can manage API keys
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('Only firm owners and admins can manage API keys', 403);
    }

    // Validate input
    if (!provider || !['openai', 'anthropic', 'google'].includes(provider)) {
        throw CustomException('Valid provider required (openai, anthropic, or google)', 400);
    }

    if (!apiKey || apiKey.trim().length < 10) {
        throw CustomException('Valid API key required', 400);
    }

    const result = await AISettingsService.saveApiKey(firmId, provider, apiKey.trim());

    if (!result.success) {
        throw CustomException(result.message, 400);
    }

    res.json({
        success: true,
        message: `${provider} API key saved and validated successfully`,
        data: {
            provider: result.provider,
            features: result.features
        }
    });
});

/**
 * Remove an API key for a provider
 * DELETE /api/settings/ai/keys/:provider
 */
const removeApiKey = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { provider } = req.params;

    if (!firmId) {
        throw CustomException('Firm ID required', 400);
    }

    // Only admin/owner can manage API keys
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('Only firm owners and admins can manage API keys', 403);
    }

    if (!provider || !['openai', 'anthropic', 'google'].includes(provider)) {
        throw CustomException('Valid provider required', 400);
    }

    const result = await AISettingsService.removeApiKey(firmId, provider);

    res.json({
        success: true,
        message: result.message,
        data: {
            features: result.features
        }
    });
});

/**
 * Validate an API key without saving
 * POST /api/settings/ai/validate
 * Body: { provider: 'openai' | 'anthropic' | 'google', apiKey: 'sk-...' }
 */
const validateApiKey = asyncHandler(async (req, res) => {
    const { provider, apiKey } = req.body;

    // Only admin/owner can validate keys
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('Only firm owners and admins can validate API keys', 403);
    }

    if (!provider || !['openai', 'anthropic', 'google'].includes(provider)) {
        throw CustomException('Valid provider required', 400);
    }

    if (!apiKey || apiKey.trim().length < 10) {
        throw CustomException('Valid API key required', 400);
    }

    // Validate without saving
    let validation;
    const axios = require('axios');
    const Anthropic = require('@anthropic-ai/sdk');

    switch (provider) {
        case 'openai':
            try {
                const response = await axios.get('https://api.openai.com/v1/models', {
                    headers: { 'Authorization': `Bearer ${apiKey}` },
                    timeout: 10000
                });
                validation = { valid: true, message: 'API key is valid' };
            } catch (error) {
                validation = {
                    valid: error.response?.status === 429,
                    message: error.response?.status === 401 ? 'Invalid API key' : 'Validation failed'
                };
            }
            break;

        case 'anthropic':
            try {
                const anthropic = new Anthropic({ apiKey });
                await anthropic.messages.create({
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 10,
                    messages: [{ role: 'user', content: 'test' }]
                });
                validation = { valid: true, message: 'API key is valid' };
            } catch (error) {
                validation = {
                    valid: error.status === 429,
                    message: error.status === 401 ? 'Invalid API key' : 'Validation failed'
                };
            }
            break;

        case 'google':
            try {
                await axios.get(`https://speech.googleapis.com/v1/operations?key=${apiKey}`, { timeout: 10000 });
                validation = { valid: true, message: 'API key is valid' };
            } catch (error) {
                validation = {
                    valid: error.response?.status === 404,
                    message: error.response?.status === 403 ? 'Invalid API key' : 'API key appears valid'
                };
            }
            break;
    }

    res.json({
        success: true,
        data: {
            provider,
            valid: validation.valid,
            message: validation.message
        }
    });
});

/**
 * Update AI preferences
 * PATCH /api/settings/ai/preferences
 * Body: { defaultLanguage?, preferredSpeechProvider?, preferredNlpProvider? }
 */
const updatePreferences = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const preferences = req.body;

    if (!firmId) {
        throw CustomException('Firm ID required', 400);
    }

    // Only admin/owner can update preferences
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('Only firm owners and admins can update AI preferences', 403);
    }

    const updated = await AISettingsService.updatePreferences(firmId, preferences);

    res.json({
        success: true,
        message: 'Preferences updated',
        data: updated
    });
});

/**
 * Get feature status (what's enabled based on configured keys)
 * GET /api/settings/ai/features
 */
const getFeatureStatus = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('Firm ID required', 400);
    }

    const status = await AISettingsService.getFeatureStatus(firmId);

    res.json({
        success: true,
        data: status
    });
});

/**
 * Get usage statistics
 * GET /api/settings/ai/usage
 */
const getUsageStats = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('Firm ID required', 400);
    }

    // Only admin/owner can view usage
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('Only firm owners and admins can view usage statistics', 403);
    }

    const settings = await AISettingsService.getSettings(firmId);

    res.json({
        success: true,
        data: {
            openai: {
                usageThisMonth: settings.openai.usageThisMonth,
                lastValidated: settings.openai.lastValidated
            },
            anthropic: {
                usageThisMonth: settings.anthropic.usageThisMonth,
                lastValidated: settings.anthropic.lastValidated
            }
        }
    });
});

module.exports = {
    getAISettings,
    saveApiKey,
    removeApiKey,
    validateApiKey,
    updatePreferences,
    getFeatureStatus,
    getUsageStats
};
