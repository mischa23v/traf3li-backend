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
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Security constants
const MAX_TOKEN_LENGTH = 2000; // Maximum reasonable CAPTCHA token length
const MAX_PROVIDER_LENGTH = 50;
const ALLOWED_PROVIDER_CHARS = /^[a-z0-9_-]+$/i; // Only alphanumeric, underscore, hyphen
const TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/; // Only alphanumeric, underscore, hyphen (common for CAPTCHA tokens)

// Rate limiting tracking (in-memory for demonstration, should use Redis in production)
const verificationAttempts = new Map();
const MAX_ATTEMPTS_PER_MINUTE = 10;
const RATE_LIMIT_WINDOW = 60000; // 1 minute

/**
 * Validate and sanitize CAPTCHA token input
 *
 * @param {string} token - CAPTCHA token to validate
 * @returns {Object} - Validation result { valid: boolean, error: string }
 */
const validateCaptchaToken = (token) => {
    // Check if token exists and is a string
    if (!token || typeof token !== 'string') {
        return { valid: false, error: 'Token must be a non-empty string' };
    }

    // Check token length to prevent DoS attacks
    if (token.length > MAX_TOKEN_LENGTH) {
        return { valid: false, error: `Token exceeds maximum length of ${MAX_TOKEN_LENGTH} characters` };
    }

    // Check minimum length (CAPTCHA tokens are typically quite long)
    if (token.length < 20) {
        return { valid: false, error: 'Token is too short to be valid' };
    }

    // Validate token format to prevent injection attacks
    // Most CAPTCHA tokens use base64-like characters
    if (!TOKEN_PATTERN.test(token)) {
        return { valid: false, error: 'Token contains invalid characters' };
    }

    // Additional check: token should not contain obvious SQL injection patterns
    const sqlInjectionPatterns = /(\bOR\b|\bAND\b|--|\/\*|\*\/|;|'|"|<|>)/i;
    if (sqlInjectionPatterns.test(token)) {
        return { valid: false, error: 'Token contains potentially malicious content' };
    }

    return { valid: true };
};

/**
 * Validate and sanitize provider name
 *
 * @param {string} provider - Provider name to validate
 * @returns {Object} - Validation result { valid: boolean, error: string }
 */
const validateProvider = (provider) => {
    if (!provider || typeof provider !== 'string') {
        return { valid: false, error: 'Provider must be a non-empty string' };
    }

    if (provider.length > MAX_PROVIDER_LENGTH) {
        return { valid: false, error: 'Provider name is too long' };
    }

    if (!ALLOWED_PROVIDER_CHARS.test(provider)) {
        return { valid: false, error: 'Provider name contains invalid characters' };
    }

    return { valid: true };
};

/**
 * Check rate limiting for CAPTCHA verification attempts
 *
 * @param {string} identifier - IP address or user identifier
 * @returns {Object} - Rate limit status { allowed: boolean, remaining: number }
 */
const checkRateLimit = (identifier) => {
    const now = Date.now();
    const attempts = verificationAttempts.get(identifier) || [];

    // Clean up old attempts outside the window
    const recentAttempts = attempts.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);

    // Check if rate limit exceeded
    if (recentAttempts.length >= MAX_ATTEMPTS_PER_MINUTE) {
        return {
            allowed: false,
            remaining: 0,
            resetTime: Math.ceil((recentAttempts[0] + RATE_LIMIT_WINDOW - now) / 1000)
        };
    }

    // Add current attempt
    recentAttempts.push(now);
    verificationAttempts.set(identifier, recentAttempts);

    return {
        allowed: true,
        remaining: MAX_ATTEMPTS_PER_MINUTE - recentAttempts.length,
        resetTime: Math.ceil(RATE_LIMIT_WINDOW / 1000)
    };
};

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
        // Sanitize input - only allow expected fields
        const sanitizedBody = pickAllowedFields(request.body, ['provider', 'token']);
        const { provider, token } = sanitizedBody;

        // Get client IP for rate limiting and verification
        const remoteIp = request.ip ||
                        request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                        request.headers['x-real-ip'] ||
                        request.connection?.remoteAddress ||
                        'unknown';

        // Check rate limiting FIRST to prevent abuse
        const rateLimit = checkRateLimit(remoteIp);

        // Set rate limit headers for client awareness
        response.setHeader('X-RateLimit-Limit', MAX_ATTEMPTS_PER_MINUTE);
        response.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
        response.setHeader('X-RateLimit-Reset', rateLimit.resetTime);

        if (!rateLimit.allowed) {
            logger.warn('CAPTCHA verification rate limit exceeded', {
                remoteIp,
                resetTime: rateLimit.resetTime
            });

            return response.status(429).json({
                error: true,
                message: 'Too many CAPTCHA verification attempts. Please try again later.',
                messageAr: 'عدد كبير جداً من محاولات التحقق من CAPTCHA. يرجى المحاولة مرة أخرى لاحقاً.',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: rateLimit.resetTime
            });
        }

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

        // Validate and sanitize provider input
        const providerValidation = validateProvider(provider);
        if (!providerValidation.valid) {
            logger.warn('Invalid CAPTCHA provider format', {
                provider,
                error: providerValidation.error,
                remoteIp
            });

            return response.status(400).json({
                error: true,
                message: `Invalid CAPTCHA provider: ${providerValidation.error}`,
                messageAr: `مزود CAPTCHA غير صالح`,
                code: 'INVALID_PROVIDER_FORMAT',
                validProviders: Object.keys(captchaService.PROVIDERS)
            });
        }

        // Validate and sanitize token input
        const tokenValidation = validateCaptchaToken(token);
        if (!tokenValidation.valid) {
            logger.warn('Invalid CAPTCHA token format', {
                error: tokenValidation.error,
                tokenLength: token?.length,
                remoteIp
            });

            return response.status(400).json({
                error: true,
                message: `Invalid CAPTCHA token: ${tokenValidation.error}`,
                messageAr: 'رمز CAPTCHA غير صالح',
                code: 'INVALID_TOKEN_FORMAT'
            });
        }

        // Validate provider exists
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
            logger.warn(`Attempt to use disabled CAPTCHA provider: ${provider}`, {
                provider,
                remoteIp
            });
            return response.status(503).json({
                error: true,
                message: `CAPTCHA provider "${provider}" is not configured or enabled`,
                messageAr: `مزود CAPTCHA "${provider}" غير مكوّن أو مفعّل`,
                code: 'PROVIDER_NOT_CONFIGURED',
                enabledProviders: captchaService.getEnabledProviders().map(p => p.key)
            });
        }

        // Log verification attempt (with sanitized data)
        logger.info('CAPTCHA verification request received', {
            provider,
            hasToken: !!token,
            tokenLength: token.length,
            remoteIp,
            userAgent: request.headers['user-agent']?.substring(0, 200) // Truncate UA to prevent log injection
        });

        // Verify CAPTCHA with the provider
        // Add timing to detect potential timing attacks
        const startTime = Date.now();
        const result = await captchaService.verifyCaptcha(provider, token, remoteIp);
        const verificationTime = Date.now() - startTime;

        // Log suspicious timing (potential timing attack or bypass attempt)
        if (verificationTime < 100) {
            logger.warn('CAPTCHA verification completed suspiciously fast', {
                provider,
                verificationTime,
                remoteIp
            });
        }

        // Check verification result
        if (result.success) {
            // Verification successful
            logger.info('CAPTCHA verification successful', {
                provider,
                providerName: result.providerName,
                score: result.score,
                verificationTime,
                remoteIp
            });

            // Sanitize response data to prevent information leakage
            const responseData = {
                error: false,
                message: 'CAPTCHA verified successfully',
                messageAr: 'تم التحقق من CAPTCHA بنجاح',
                verified: true,
                provider: result.provider,
                providerName: result.providerName
            };

            // Include score for reCAPTCHA v3 (only if valid number)
            if (result.score !== undefined && typeof result.score === 'number') {
                responseData.score = Math.round(result.score * 100) / 100; // Round to 2 decimals
            }

            // Include action for reCAPTCHA v3 (sanitized)
            if (result.action && typeof result.action === 'string') {
                responseData.action = result.action.substring(0, 100); // Limit length
            }

            // Include hostname (sanitized)
            if (result.hostname && typeof result.hostname === 'string') {
                responseData.hostname = result.hostname.substring(0, 253); // Max DNS length
            }

            // Include challenge timestamp (validated)
            if (result.challengeTimestamp) {
                const challengeTime = new Date(result.challengeTimestamp);
                const now = new Date();
                const timeDiff = now - challengeTime;

                // Warn if challenge is too old (potential replay attack)
                if (timeDiff > 300000) { // 5 minutes
                    logger.warn('CAPTCHA challenge timestamp is old', {
                        challengeTimestamp: result.challengeTimestamp,
                        timeDiff,
                        remoteIp
                    });
                }

                responseData.challengeTimestamp = result.challengeTimestamp;
            }

            return response.status(200).json(responseData);

        } else {
            // Verification failed
            logger.warn('CAPTCHA verification failed', {
                provider,
                errorCodes: result.errorCodes,
                message: result.message,
                verificationTime,
                remoteIp
            });

            // Use constant-time comparison for error responses to prevent timing attacks
            // Return generic error to prevent information leakage about why it failed
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

        // Validate provider format first
        const providerValidation = validateProvider(provider);
        if (!providerValidation.valid) {
            logger.warn('Invalid CAPTCHA provider format in status request', {
                provider,
                error: providerValidation.error
            });

            return response.status(400).json({
                error: true,
                message: `Invalid CAPTCHA provider: ${providerValidation.error}`,
                messageAr: `مزود CAPTCHA غير صالح`,
                code: 'INVALID_PROVIDER_FORMAT',
                validProviders: Object.keys(captchaService.PROVIDERS)
            });
        }

        // Validate provider exists
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
