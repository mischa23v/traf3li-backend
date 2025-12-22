/**
 * CAPTCHA Verification Service
 *
 * Provides verification for multiple CAPTCHA providers:
 * - Google reCAPTCHA v2/v3
 * - hCaptcha
 * - Cloudflare Turnstile
 *
 * This service abstracts CAPTCHA verification allowing the application
 * to support multiple providers and switch between them as needed.
 */

const axios = require('axios');
const logger = require('../utils/logger');

/**
 * CAPTCHA provider configurations
 * Each provider has a verification URL and secret key from environment variables
 */
const PROVIDERS = {
    recaptcha: {
        verifyUrl: 'https://www.google.com/recaptcha/api/siteverify',
        secretKey: process.env.RECAPTCHA_SECRET_KEY,
        name: 'Google reCAPTCHA',
        minScore: parseFloat(process.env.RECAPTCHA_MIN_SCORE) || 0.5 // For reCAPTCHA v3
    },
    hcaptcha: {
        verifyUrl: 'https://hcaptcha.com/siteverify',
        secretKey: process.env.HCAPTCHA_SECRET_KEY,
        name: 'hCaptcha'
    },
    turnstile: {
        verifyUrl: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        secretKey: process.env.TURNSTILE_SECRET_KEY,
        name: 'Cloudflare Turnstile'
    }
};

/**
 * Verify CAPTCHA token with specified provider
 *
 * @param {string} provider - Provider name ('recaptcha', 'hcaptcha', 'turnstile')
 * @param {string} token - CAPTCHA token from client
 * @param {string|null} remoteIp - Optional client IP address for verification
 * @returns {Promise<Object>} - { success: boolean, score?: number, errorCodes?: string[], provider: string }
 *
 * @throws {Error} - If provider is invalid or verification request fails
 *
 * @example
 * const result = await verifyCaptcha('recaptcha', 'token123', '192.168.1.1');
 * if (result.success) {
 *   console.log('CAPTCHA verified successfully');
 *   if (result.score) {
 *     console.log('Score:', result.score); // For reCAPTCHA v3
 *   }
 * }
 */
const verifyCaptcha = async (provider, token, remoteIp = null) => {
    try {
        // Validate provider
        if (!provider || !PROVIDERS[provider]) {
            logger.warn(`Invalid CAPTCHA provider requested: ${provider}`);
            throw new Error(`Invalid CAPTCHA provider: ${provider}. Valid providers are: ${Object.keys(PROVIDERS).join(', ')}`);
        }

        const providerConfig = PROVIDERS[provider];

        // Check if provider is configured (has secret key)
        if (!providerConfig.secretKey) {
            logger.error(`CAPTCHA provider "${provider}" is not configured. Missing secret key in environment variables.`);
            throw new Error(`CAPTCHA provider "${provider}" is not configured. Please configure ${provider.toUpperCase()}_SECRET_KEY in environment variables.`);
        }

        // Validate token
        if (!token || typeof token !== 'string' || token.trim() === '') {
            logger.warn(`Invalid CAPTCHA token provided for provider: ${provider}`);
            return {
                success: false,
                errorCodes: ['invalid-token'],
                provider,
                message: 'Invalid or missing CAPTCHA token'
            };
        }

        // Build verification request payload
        const payload = {
            secret: providerConfig.secretKey,
            response: token
        };

        // Add remoteip if provided (optional but recommended)
        if (remoteIp) {
            payload.remoteip = remoteIp;
        }

        // Log verification attempt (without sensitive data)
        logger.info(`Verifying CAPTCHA with provider: ${provider}`, {
            provider,
            hasRemoteIp: !!remoteIp,
            tokenLength: token.length
        });

        // Make verification request to provider
        // CAPTCHA providers require form data in POST body, not query params
        const formData = new URLSearchParams(payload).toString();

        const response = await axios.post(
            providerConfig.verifyUrl,
            formData,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 10000 // 10 second timeout
            }
        );

        const data = response.data;

        // Log verification response (without sensitive data)
        logger.info(`CAPTCHA verification response from ${provider}`, {
            provider,
            success: data.success,
            hasScore: !!data.score,
            hasErrorCodes: !!data['error-codes']
        });

        // Build verification result
        const result = {
            success: data.success || false,
            provider,
            providerName: providerConfig.name
        };

        // Include score for reCAPTCHA v3
        if (data.score !== undefined) {
            result.score = data.score;

            // Check if score meets minimum threshold for reCAPTCHA v3
            if (provider === 'recaptcha' && result.score < providerConfig.minScore) {
                logger.warn(`reCAPTCHA score below threshold: ${result.score} < ${providerConfig.minScore}`);
                result.success = false;
                result.errorCodes = ['score-too-low'];
                result.message = `CAPTCHA score too low: ${result.score}`;
            }
        }

        // Include error codes if present
        if (data['error-codes'] && Array.isArray(data['error-codes'])) {
            result.errorCodes = data['error-codes'];
        }

        // Include challenge timestamp for some providers
        if (data.challenge_ts) {
            result.challengeTimestamp = data.challenge_ts;
        }

        // Include hostname for reCAPTCHA
        if (data.hostname) {
            result.hostname = data.hostname;
        }

        // Include action for reCAPTCHA v3
        if (data.action) {
            result.action = data.action;
        }

        // Log verification result
        if (result.success) {
            logger.info(`CAPTCHA verification successful for provider: ${provider}`, {
                provider,
                score: result.score
            });
        } else {
            logger.warn(`CAPTCHA verification failed for provider: ${provider}`, {
                provider,
                errorCodes: result.errorCodes
            });
        }

        return result;

    } catch (error) {
        // Handle axios/network errors
        if (error.response) {
            // Provider returned an error response
            logger.error(`CAPTCHA provider ${provider} returned error`, {
                provider,
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            });

            return {
                success: false,
                provider,
                errorCodes: ['provider-error'],
                message: `CAPTCHA provider error: ${error.response.statusText}`,
                details: error.response.data
            };
        } else if (error.request) {
            // Request was made but no response received
            logger.error(`No response from CAPTCHA provider ${provider}`, {
                provider,
                error: error.message
            });

            return {
                success: false,
                provider,
                errorCodes: ['network-error'],
                message: 'Failed to connect to CAPTCHA provider'
            };
        } else if (error.message.includes('Invalid CAPTCHA provider') || error.message.includes('not configured')) {
            // Re-throw configuration errors
            throw error;
        } else {
            // Other errors (validation, etc.)
            logger.error(`CAPTCHA verification error for provider ${provider}`, {
                provider,
                error: error.message,
                stack: error.stack
            });

            return {
                success: false,
                provider,
                errorCodes: ['verification-error'],
                message: error.message || 'CAPTCHA verification failed'
            };
        }
    }
};

/**
 * Get list of enabled CAPTCHA providers
 * A provider is considered enabled if it has a secret key configured
 *
 * @returns {Array<Object>} - Array of enabled provider objects with name and key
 *
 * @example
 * const enabled = getEnabledProviders();
 * console.log(enabled); // [{ key: 'recaptcha', name: 'Google reCAPTCHA' }, ...]
 */
const getEnabledProviders = () => {
    const enabled = [];

    for (const [key, config] of Object.entries(PROVIDERS)) {
        if (config.secretKey && config.secretKey.trim() !== '') {
            enabled.push({
                key,
                name: config.name,
                hasMinScore: !!config.minScore
            });
        }
    }

    logger.info(`Enabled CAPTCHA providers: ${enabled.map(p => p.name).join(', ') || 'None'}`);

    return enabled;
};

/**
 * Check if a specific provider is configured and enabled
 *
 * @param {string} provider - Provider key to check
 * @returns {boolean} - True if provider is configured with a secret key
 *
 * @example
 * if (isProviderEnabled('recaptcha')) {
 *   // Use reCAPTCHA
 * }
 */
const isProviderEnabled = (provider) => {
    if (!provider || !PROVIDERS[provider]) {
        return false;
    }

    return !!(PROVIDERS[provider].secretKey && PROVIDERS[provider].secretKey.trim() !== '');
};

/**
 * Get provider configuration (without secret key)
 *
 * @param {string} provider - Provider key
 * @returns {Object|null} - Provider config without secret key, or null if not found
 *
 * @example
 * const config = getProviderConfig('recaptcha');
 * console.log(config); // { name: 'Google reCAPTCHA', verifyUrl: '...', ... }
 */
const getProviderConfig = (provider) => {
    if (!provider || !PROVIDERS[provider]) {
        return null;
    }

    const config = { ...PROVIDERS[provider] };
    delete config.secretKey; // Don't expose secret key

    return config;
};

/**
 * Verify CAPTCHA with fallback providers
 * Tries multiple providers in order until one succeeds
 *
 * @param {string} token - CAPTCHA token
 * @param {Array<string>} providers - Array of provider keys to try in order
 * @param {string|null} remoteIp - Optional client IP
 * @returns {Promise<Object>} - Verification result from first successful provider
 *
 * @example
 * const result = await verifyCaptchaWithFallback('token', ['recaptcha', 'hcaptcha'], '192.168.1.1');
 */
const verifyCaptchaWithFallback = async (token, providers, remoteIp = null) => {
    const errors = [];

    for (const provider of providers) {
        if (!isProviderEnabled(provider)) {
            logger.warn(`Skipping disabled provider in fallback: ${provider}`);
            continue;
        }

        try {
            const result = await verifyCaptcha(provider, token, remoteIp);

            if (result.success) {
                logger.info(`CAPTCHA verified successfully with fallback provider: ${provider}`);
                return result;
            }

            errors.push({
                provider,
                errorCodes: result.errorCodes,
                message: result.message
            });

        } catch (error) {
            logger.error(`Fallback provider ${provider} failed:`, error.message);
            errors.push({
                provider,
                errorCodes: ['provider-failed'],
                message: error.message
            });
        }
    }

    // All providers failed
    logger.error('All fallback CAPTCHA providers failed', { errors });

    return {
        success: false,
        errorCodes: ['all-providers-failed'],
        message: 'CAPTCHA verification failed with all providers',
        attempts: errors
    };
};

module.exports = {
    verifyCaptcha,
    getEnabledProviders,
    isProviderEnabled,
    getProviderConfig,
    verifyCaptchaWithFallback,
    PROVIDERS // Export for testing/debugging (secrets are in env vars)
};
