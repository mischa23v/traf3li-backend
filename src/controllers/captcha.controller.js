/**
 * CAPTCHA Controller
 *
 * Handles CAPTCHA verification endpoints for multiple providers:
 * - Google reCAPTCHA v2/v3
 * - hCaptcha
 * - Cloudflare Turnstile
 *
 * Provides endpoints to verify CAPTCHA tokens and get provider status.
 */

const captchaService = require('../services/captcha.service');
const logger = require('../utils/logger');

/**
 * Verify CAPTCHA token
 *
 * POST /api/auth/verify-captcha
 *
 * This endpoint verifies a CAPTCHA token from the client.
 * Supports multiple providers and returns detailed verification results.
 *
 * @param {Object} request - Express request object
 * @param {Object} request.body - Request body
 * @param {string} request.body.provider - CAPTCHA provider ('recaptcha', 'hcaptcha', 'turnstile')
 * @param {string} request.body.token - CAPTCHA token from client
 * @param {Object} response - Express response object
 *
 * @returns {Object} - Verification result
 *
 * Request body:
 * {
 *   "provider": "recaptcha",
 *   "token": "03AGdBq24..."
 * }
 *
 * Response (success):
 * {
 *   "error": false,
 *   "message": "CAPTCHA verified successfully",
 *   "verified": true,
 *   "provider": "recaptcha",
 *   "providerName": "Google reCAPTCHA",
 *   "score": 0.9 // For reCAPTCHA v3 only
 * }
 *
 * Response (failure):
 * {
 *   "error": true,
 *   "message": "CAPTCHA verification failed",
 *   "verified": false,
 *   "provider": "recaptcha",
 *   "errorCodes": ["invalid-input-response"],
 *   "details": "..."
 * }
 */
const verifyCaptcha = async (request, response) => {
    try {
        const { provider, token } = request.body;

        // Validate required fields
        if (!provider) {
            return response.status(400).json({
                error: true,
                message: 'CAPTCHA provider is required',
                messageAr: 'مزود CAPTCHA مطلوب',
                code: 'PROVIDER_REQUIRED',
                validProviders: Object.keys(captchaService.PROVIDERS)
            });
        }

        if (!token) {
            return response.status(400).json({
                error: true,
                message: 'CAPTCHA token is required',
                messageAr: 'رمز CAPTCHA مطلوب',
                code: 'TOKEN_REQUIRED'
            });
        }

        // Validate provider
        if (!captchaService.PROVIDERS[provider]) {
            return response.status(400).json({
                error: true,
                message: `Invalid CAPTCHA provider: ${provider}`,
                messageAr: `مزود CAPTCHA غير صالح: ${provider}`,
                code: 'INVALID_PROVIDER',
                validProviders: Object.keys(captchaService.PROVIDERS)
            });
        }

        // Check if provider is enabled
        if (!captchaService.isProviderEnabled(provider)) {
            logger.warn(`Attempt to use disabled CAPTCHA provider: ${provider}`);
            return response.status(503).json({
                error: true,
                message: `CAPTCHA provider "${provider}" is not configured or enabled`,
                messageAr: `مزود CAPTCHA "${provider}" غير مكوّن أو مفعّل`,
                code: 'PROVIDER_NOT_CONFIGURED',
                enabledProviders: captchaService.getEnabledProviders().map(p => p.key)
            });
        }

        // Get client IP address (for verification)
        const remoteIp = request.ip ||
                        request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                        request.headers['x-real-ip'] ||
                        request.connection?.remoteAddress ||
                        null;

        // Log verification attempt
        logger.info('CAPTCHA verification request received', {
            provider,
            hasToken: !!token,
            remoteIp,
            userAgent: request.headers['user-agent']
        });

        // Verify CAPTCHA with the provider
        const result = await captchaService.verifyCaptcha(provider, token, remoteIp);

        // Check verification result
        if (result.success) {
            // Verification successful
            logger.info('CAPTCHA verification successful', {
                provider,
                providerName: result.providerName,
                score: result.score,
                remoteIp
            });

            const responseData = {
                error: false,
                message: 'CAPTCHA verified successfully',
                messageAr: 'تم التحقق من CAPTCHA بنجاح',
                verified: true,
                provider: result.provider,
                providerName: result.providerName
            };

            // Include score for reCAPTCHA v3
            if (result.score !== undefined) {
                responseData.score = result.score;
            }

            // Include action for reCAPTCHA v3
            if (result.action) {
                responseData.action = result.action;
            }

            // Include hostname
            if (result.hostname) {
                responseData.hostname = result.hostname;
            }

            // Include challenge timestamp
            if (result.challengeTimestamp) {
                responseData.challengeTimestamp = result.challengeTimestamp;
            }

            return response.status(200).json(responseData);

        } else {
            // Verification failed
            logger.warn('CAPTCHA verification failed', {
                provider,
                errorCodes: result.errorCodes,
                message: result.message,
                remoteIp
            });

            return response.status(400).json({
                error: true,
                message: result.message || 'CAPTCHA verification failed',
                messageAr: 'فشل التحقق من CAPTCHA',
                verified: false,
                provider: result.provider,
                providerName: result.providerName,
                errorCodes: result.errorCodes || [],
                code: 'VERIFICATION_FAILED',
                details: getErrorMessage(result.errorCodes)
            });
        }

    } catch (error) {
        // Handle unexpected errors
        logger.error('CAPTCHA verification error', {
            error: error.message,
            stack: error.stack
        });

        // Check if it's a configuration error
        if (error.message.includes('not configured') || error.message.includes('Invalid CAPTCHA provider')) {
            return response.status(503).json({
                error: true,
                message: error.message,
                messageAr: 'خطأ في تكوين CAPTCHA',
                code: 'PROVIDER_ERROR',
                enabledProviders: captchaService.getEnabledProviders().map(p => p.key)
            });
        }

        return response.status(500).json({
            error: true,
            message: 'Internal server error during CAPTCHA verification',
            messageAr: 'خطأ داخلي في الخادم أثناء التحقق من CAPTCHA',
            code: 'INTERNAL_ERROR'
        });
    }
};

/**
 * Get enabled CAPTCHA providers
 *
 * GET /api/auth/captcha/providers
 *
 * Returns a list of configured and enabled CAPTCHA providers.
 * This endpoint helps clients know which providers are available.
 *
 * @param {Object} request - Express request object
 * @param {Object} response - Express response object
 *
 * @returns {Object} - List of enabled providers
 *
 * Response:
 * {
 *   "error": false,
 *   "providers": [
 *     {
 *       "key": "recaptcha",
 *       "name": "Google reCAPTCHA",
 *       "hasMinScore": true
 *     },
 *     {
 *       "key": "hcaptcha",
 *       "name": "hCaptcha",
 *       "hasMinScore": false
 *     }
 *   ],
 *   "count": 2,
 *   "defaultProvider": "recaptcha"
 * }
 */
const getEnabledProviders = async (request, response) => {
    try {
        const enabledProviders = captchaService.getEnabledProviders();

        logger.info('CAPTCHA providers list requested', {
            count: enabledProviders.length,
            providers: enabledProviders.map(p => p.key)
        });

        // Determine default provider (first enabled provider)
        const defaultProvider = enabledProviders.length > 0 ? enabledProviders[0].key : null;

        return response.status(200).json({
            error: false,
            message: `Found ${enabledProviders.length} enabled CAPTCHA provider(s)`,
            messageAr: `تم العثور على ${enabledProviders.length} مزود CAPTCHA مفعّل`,
            providers: enabledProviders,
            count: enabledProviders.length,
            defaultProvider,
            allProviders: Object.keys(captchaService.PROVIDERS)
        });

    } catch (error) {
        logger.error('Error getting CAPTCHA providers', {
            error: error.message,
            stack: error.stack
        });

        return response.status(500).json({
            error: true,
            message: 'Failed to get CAPTCHA providers',
            messageAr: 'فشل الحصول على مزودي CAPTCHA',
            code: 'INTERNAL_ERROR'
        });
    }
};

/**
 * Get CAPTCHA provider status
 *
 * GET /api/auth/captcha/status/:provider
 *
 * Returns the status of a specific CAPTCHA provider.
 *
 * @param {Object} request - Express request object
 * @param {string} request.params.provider - Provider key
 * @param {Object} response - Express response object
 *
 * @returns {Object} - Provider status
 *
 * Response:
 * {
 *   "error": false,
 *   "provider": "recaptcha",
 *   "enabled": true,
 *   "configured": true,
 *   "config": {
 *     "name": "Google reCAPTCHA",
 *     "verifyUrl": "...",
 *     "minScore": 0.5
 *   }
 * }
 */
const getProviderStatus = async (request, response) => {
    try {
        const { provider } = request.params;

        // Validate provider
        if (!provider || !captchaService.PROVIDERS[provider]) {
            return response.status(400).json({
                error: true,
                message: `Invalid CAPTCHA provider: ${provider}`,
                messageAr: `مزود CAPTCHA غير صالح: ${provider}`,
                code: 'INVALID_PROVIDER',
                validProviders: Object.keys(captchaService.PROVIDERS)
            });
        }

        const enabled = captchaService.isProviderEnabled(provider);
        const config = captchaService.getProviderConfig(provider);

        logger.info('CAPTCHA provider status requested', {
            provider,
            enabled
        });

        return response.status(200).json({
            error: false,
            provider,
            enabled,
            configured: enabled, // If enabled, it's configured
            config: config || {}
        });

    } catch (error) {
        logger.error('Error getting CAPTCHA provider status', {
            error: error.message,
            stack: error.stack
        });

        return response.status(500).json({
            error: true,
            message: 'Failed to get CAPTCHA provider status',
            messageAr: 'فشل الحصول على حالة مزود CAPTCHA',
            code: 'INTERNAL_ERROR'
        });
    }
};

/**
 * Helper: Get user-friendly error message from error codes
 *
 * @param {Array<string>} errorCodes - Array of error codes from provider
 * @returns {string} - User-friendly error message
 */
const getErrorMessage = (errorCodes) => {
    if (!errorCodes || errorCodes.length === 0) {
        return 'Unknown error';
    }

    const errorMessages = {
        'missing-input-secret': 'The secret parameter is missing',
        'invalid-input-secret': 'The secret parameter is invalid or malformed',
        'missing-input-response': 'The response parameter (token) is missing',
        'invalid-input-response': 'The response parameter (token) is invalid or malformed',
        'bad-request': 'The request is invalid or malformed',
        'timeout-or-duplicate': 'The response is no longer valid (timeout or duplicate)',
        'invalid-token': 'The token is invalid or has expired',
        'score-too-low': 'The CAPTCHA score is below the required threshold',
        'network-error': 'Failed to connect to CAPTCHA provider',
        'provider-error': 'CAPTCHA provider returned an error',
        'verification-error': 'CAPTCHA verification failed',
        'all-providers-failed': 'All CAPTCHA providers failed'
    };

    return errorCodes.map(code => errorMessages[code] || code).join('; ');
};

module.exports = {
    verifyCaptcha,
    getEnabledProviders,
    getProviderStatus
};
