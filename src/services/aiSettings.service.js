const crypto = require('crypto');
const Firm = require('../models/firm.model');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const logger = require('../utils/logger');

/**
 * AI Settings Service
 * Manages firm-level API keys for AI services (OpenAI, Anthropic, Google)
 * Handles encryption, validation, and retrieval of API keys
 */

// Encryption key from environment (must be 32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.AI_KEYS_ENCRYPTION_SECRET;
if (!ENCRYPTION_KEY) {
  throw new Error('AI_KEYS_ENCRYPTION_SECRET environment variable must be set');
}
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt an API key
 * @param {string} apiKey - Plain text API key
 * @returns {string} Encrypted key with IV and auth tag
 */
function encryptApiKey(apiKey) {
    if (!apiKey) return null;

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf8').slice(0, 32), iv);

    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an API key
 * @param {string} encryptedData - Encrypted key string
 * @returns {string|null} Decrypted API key
 */
function decryptApiKey(encryptedData) {
    if (!encryptedData) return null;

    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 3) return null;

        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];

        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf8').slice(0, 32), iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        logger.error('Error decrypting API key:', error.message);
        return null;
    }
}

/**
 * Mask an API key for display (show only first and last 4 chars)
 * @param {string} apiKey - Full API key
 * @returns {string} Masked key like "sk-...abcd"
 */
function maskApiKey(apiKey) {
    if (!apiKey || apiKey.length < 12) return '****';
    return `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`;
}

/**
 * Validate OpenAI API key by making a test request
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<Object>} Validation result
 */
async function validateOpenAIKey(apiKey) {
    try {
        const response = await axios.get('https://api.openai.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
            timeout: 10000
        });

        // Check if whisper model is available
        const hasWhisper = response.data.data.some(model => model.id.includes('whisper'));

        return {
            valid: true,
            hasWhisper,
            message: hasWhisper ? 'API key valid with Whisper access' : 'API key valid (Whisper access not confirmed)'
        };
    } catch (error) {
        if (error.response?.status === 401) {
            return { valid: false, message: 'Invalid API key' };
        }
        if (error.response?.status === 429) {
            return { valid: true, message: 'API key valid (rate limited, but working)' };
        }
        return { valid: false, message: error.message || 'Validation failed' };
    }
}

/**
 * Validate Anthropic API key by making a test request
 * @param {string} apiKey - Anthropic API key
 * @returns {Promise<Object>} Validation result
 */
async function validateAnthropicKey(apiKey) {
    try {
        const anthropic = new Anthropic({ apiKey });

        // Make a minimal test request
        await anthropic.messages.create({
            model: 'claude-3-haiku-20240307', // Use cheapest model for validation
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hi' }]
        });

        return { valid: true, message: 'API key valid' };
    } catch (error) {
        if (error.status === 401) {
            return { valid: false, message: 'Invalid API key' };
        }
        if (error.status === 429) {
            return { valid: true, message: 'API key valid (rate limited, but working)' };
        }
        return { valid: false, message: error.message || 'Validation failed' };
    }
}

/**
 * Validate Google Cloud API key
 * @param {string} apiKey - Google Cloud API key
 * @returns {Promise<Object>} Validation result
 */
async function validateGoogleKey(apiKey) {
    try {
        // Test with Speech-to-Text API
        const response = await axios.get(
            `https://speech.googleapis.com/v1/operations?key=${apiKey}`,
            { timeout: 10000 }
        );

        return { valid: true, message: 'API key valid' };
    } catch (error) {
        if (error.response?.status === 403 || error.response?.status === 401) {
            return { valid: false, message: 'Invalid API key or Speech-to-Text API not enabled' };
        }
        // 404 is actually OK - means the API is accessible
        if (error.response?.status === 404) {
            return { valid: true, message: 'API key valid' };
        }
        return { valid: false, message: error.message || 'Validation failed' };
    }
}

class AISettingsService {
    /**
     * Get AI settings for a firm (with masked API keys)
     * @param {string} firmId - Firm ID
     * @returns {Promise<Object>} AI settings with masked keys
     */
    static async getSettings(firmId) {
        const firm = await Firm.findById(firmId).select('aiSettings');

        if (!firm) {
            throw new Error('Firm not found');
        }

        const settings = firm.aiSettings || {};

        // Return settings with masked keys
        return {
            openai: {
                isConfigured: settings.openai?.isConfigured || false,
                apiKeyMasked: settings.openai?.apiKey ? maskApiKey(decryptApiKey(settings.openai.apiKey)) : null,
                lastValidated: settings.openai?.lastValidated,
                usageThisMonth: settings.openai?.usageThisMonth || 0
            },
            anthropic: {
                isConfigured: settings.anthropic?.isConfigured || false,
                apiKeyMasked: settings.anthropic?.apiKey ? maskApiKey(decryptApiKey(settings.anthropic.apiKey)) : null,
                lastValidated: settings.anthropic?.lastValidated,
                usageThisMonth: settings.anthropic?.usageThisMonth || 0
            },
            google: {
                isConfigured: settings.google?.isConfigured || false,
                apiKeyMasked: settings.google?.apiKey ? maskApiKey(decryptApiKey(settings.google.apiKey)) : null,
                lastValidated: settings.google?.lastValidated
            },
            features: settings.features || {
                nlpTaskCreation: false,
                voiceToTask: false,
                smartScheduling: false,
                aiAssistant: false
            },
            preferences: settings.preferences || {
                defaultLanguage: 'ar',
                preferredSpeechProvider: 'openai',
                preferredNlpProvider: 'anthropic'
            }
        };
    }

    /**
     * Save and validate an API key
     * @param {string} firmId - Firm ID
     * @param {string} provider - 'openai' | 'anthropic' | 'google'
     * @param {string} apiKey - Plain text API key
     * @returns {Promise<Object>} Validation result and updated settings
     */
    static async saveApiKey(firmId, provider, apiKey) {
        const firm = await Firm.findById(firmId);

        if (!firm) {
            throw new Error('Firm not found');
        }

        // Initialize aiSettings if not exists
        if (!firm.aiSettings) {
            firm.aiSettings = {
                openai: {},
                anthropic: {},
                google: {},
                features: {},
                preferences: {}
            };
        }

        // Validate the API key
        let validation;
        switch (provider) {
            case 'openai':
                validation = await validateOpenAIKey(apiKey);
                break;
            case 'anthropic':
                validation = await validateAnthropicKey(apiKey);
                break;
            case 'google':
                validation = await validateGoogleKey(apiKey);
                break;
            default:
                throw new Error('Invalid provider');
        }

        if (!validation.valid) {
            return {
                success: false,
                message: validation.message,
                provider
            };
        }

        // Encrypt and save the API key
        const encryptedKey = encryptApiKey(apiKey);

        firm.aiSettings[provider] = {
            apiKey: encryptedKey,
            isConfigured: true,
            lastValidated: new Date(),
            usageThisMonth: firm.aiSettings[provider]?.usageThisMonth || 0
        };

        // Auto-enable features based on configured keys
        this._updateFeatureFlags(firm);

        await firm.save();

        return {
            success: true,
            message: validation.message,
            provider,
            features: firm.aiSettings.features
        };
    }

    /**
     * Remove an API key
     * @param {string} firmId - Firm ID
     * @param {string} provider - 'openai' | 'anthropic' | 'google'
     * @returns {Promise<Object>} Result
     */
    static async removeApiKey(firmId, provider) {
        const firm = await Firm.findById(firmId);

        if (!firm) {
            throw new Error('Firm not found');
        }

        if (!firm.aiSettings?.[provider]) {
            return { success: true, message: 'API key not configured' };
        }

        // Clear the API key
        firm.aiSettings[provider] = {
            apiKey: null,
            isConfigured: false,
            lastValidated: null,
            usageThisMonth: 0
        };

        // Update feature flags
        this._updateFeatureFlags(firm);

        await firm.save();

        return {
            success: true,
            message: `${provider} API key removed`,
            features: firm.aiSettings.features
        };
    }

    /**
     * Update AI preferences
     * @param {string} firmId - Firm ID
     * @param {Object} preferences - Preferences to update
     * @returns {Promise<Object>} Updated preferences
     */
    static async updatePreferences(firmId, preferences) {
        const firm = await Firm.findById(firmId);

        if (!firm) {
            throw new Error('Firm not found');
        }

        if (!firm.aiSettings) {
            firm.aiSettings = { preferences: {} };
        }

        // Update only allowed preference fields
        const allowedFields = ['defaultLanguage', 'preferredSpeechProvider', 'preferredNlpProvider'];

        for (const field of allowedFields) {
            if (preferences[field] !== undefined) {
                firm.aiSettings.preferences[field] = preferences[field];
            }
        }

        await firm.save();

        return firm.aiSettings.preferences;
    }

    /**
     * Get decrypted API key for a provider (internal use only)
     * @param {string} firmId - Firm ID
     * @param {string} provider - 'openai' | 'anthropic' | 'google'
     * @returns {Promise<string|null>} Decrypted API key or null
     */
    static async getApiKey(firmId, provider) {
        const firm = await Firm.findById(firmId).select(`aiSettings.${provider}`);

        if (!firm?.aiSettings?.[provider]?.apiKey) {
            return null;
        }

        return decryptApiKey(firm.aiSettings[provider].apiKey);
    }

    /**
     * Check if a feature is enabled for a firm
     * @param {string} firmId - Firm ID
     * @param {string} feature - Feature name
     * @returns {Promise<boolean>} Whether feature is enabled
     */
    static async isFeatureEnabled(firmId, feature) {
        const firm = await Firm.findById(firmId).select('aiSettings.features');
        return firm?.aiSettings?.features?.[feature] || false;
    }

    /**
     * Get feature status for a firm
     * @param {string} firmId - Firm ID
     * @returns {Promise<Object>} Feature status with requirements
     */
    static async getFeatureStatus(firmId) {
        const firm = await Firm.findById(firmId).select('aiSettings');

        const settings = firm?.aiSettings || {};

        return {
            nlpTaskCreation: {
                enabled: settings.features?.nlpTaskCreation || false,
                requires: ['anthropic'],
                configured: settings.anthropic?.isConfigured || false
            },
            voiceToTask: {
                enabled: settings.features?.voiceToTask || false,
                requires: ['openai', 'anthropic'],
                configured: {
                    openai: settings.openai?.isConfigured || false,
                    anthropic: settings.anthropic?.isConfigured || false
                }
            },
            smartScheduling: {
                enabled: settings.features?.smartScheduling || false,
                requires: [], // No external API needed
                configured: true
            },
            aiAssistant: {
                enabled: settings.features?.aiAssistant || false,
                requires: ['anthropic'],
                configured: settings.anthropic?.isConfigured || false
            }
        };
    }

    /**
     * Increment usage counter for a provider
     * @param {string} firmId - Firm ID
     * @param {string} provider - Provider name
     * @param {number} tokens - Number of tokens used
     */
    static async incrementUsage(firmId, provider, tokens = 1) {
        await Firm.findByIdAndUpdate(firmId, {
            $inc: { [`aiSettings.${provider}.usageThisMonth`]: tokens }
        });
    }

    /**
     * Reset monthly usage counters (call from cron job)
     */
    static async resetMonthlyUsage() {
        await Firm.updateMany(
            {},
            {
                $set: {
                    'aiSettings.openai.usageThisMonth': 0,
                    'aiSettings.anthropic.usageThisMonth': 0
                }
            }
        );
    }

    /**
     * Update feature flags based on configured API keys
     * @private
     */
    static _updateFeatureFlags(firm) {
        const openaiConfigured = firm.aiSettings?.openai?.isConfigured || false;
        const anthropicConfigured = firm.aiSettings?.anthropic?.isConfigured || false;

        firm.aiSettings.features = {
            // NLP requires Anthropic
            nlpTaskCreation: anthropicConfigured,
            // Voice-to-Task requires OpenAI (Whisper) + Anthropic (NLP)
            voiceToTask: openaiConfigured && anthropicConfigured,
            // Smart Scheduling works without external APIs
            smartScheduling: true,
            // AI Assistant requires Anthropic
            aiAssistant: anthropicConfigured
        };
    }
}

module.exports = AISettingsService;
module.exports.encryptApiKey = encryptApiKey;
module.exports.decryptApiKey = decryptApiKey;
module.exports.maskApiKey = maskApiKey;
