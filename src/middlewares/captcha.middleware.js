/**
 * CAPTCHA Verification Middleware
 *
 * Validates CAPTCHA tokens before allowing sensitive operations like:
 * - User registration
 * - User login (after failed attempts or always, configurable)
 * - Password reset requests
 *
 * Supports multiple CAPTCHA providers:
 * - Google reCAPTCHA v2/v3
 * - hCaptcha
 * - Cloudflare Turnstile
 *
 * CAPTCHA token can be provided in:
 * - Request body: captchaToken, captchaProvider
 * - Request header: X-Captcha-Token, X-Captcha-Provider
 *
 * Environment Variables:
 * - CAPTCHA_REQUIRED_ON_REGISTER: true/false (default: true)
 * - CAPTCHA_REQUIRED_ON_LOGIN: true/false/'after_failures' (default: 'after_failures')
 * - CAPTCHA_REQUIRED_ON_FORGOT_PASSWORD: true/false (default: true)
 * - CAPTCHA_FAILED_LOGIN_THRESHOLD: number (default: 3)
 * - CAPTCHA_DEFAULT_PROVIDER: string (default: 'recaptcha')
 */

const captchaService = require('../services/captcha.service');
const accountLockoutService = require('../services/accountLockout.service');
const logger = require('../utils/contextLogger');
const auditLogService = require('../services/auditLog.service');

// Environment configuration with defaults
const CAPTCHA_CONFIG = {
    requiredOnRegister: process.env.CAPTCHA_REQUIRED_ON_REGISTER === 'true',
    requiredOnLogin: process.env.CAPTCHA_REQUIRED_ON_LOGIN || 'after_failures',
    requiredOnForgotPassword: process.env.CAPTCHA_REQUIRED_ON_FORGOT_PASSWORD === 'true',
    failedLoginThreshold: parseInt(process.env.CAPTCHA_FAILED_LOGIN_THRESHOLD) || 3,
    defaultProvider: process.env.CAPTCHA_DEFAULT_PROVIDER || 'recaptcha'
};

/**
 * Get CAPTCHA token and provider from request
 * Checks both request body and headers
 *
 * @param {Object} request - Express request object
 * @returns {Object} - { token: string|null, provider: string|null }
 */
const getCaptchaFromRequest = (request) => {
    // Check request body first
    let token = request.body?.captchaToken || request.body?.captcha_token;
    let provider = request.body?.captchaProvider || request.body?.captcha_provider;

    // Check headers if not in body
    if (!token) {
        token = request.headers['x-captcha-token'];
    }
    if (!provider) {
        provider = request.headers['x-captcha-provider'];
    }

    // Use default provider if not specified
    if (token && !provider) {
        provider = CAPTCHA_CONFIG.defaultProvider;
    }

    return { token, provider };
};

/**
 * Check if CAPTCHA is required based on context
 *
 * @param {string} context - 'register', 'login', 'forgot-password'
 * @param {Object} request - Express request object
 * @returns {Promise<boolean>} - True if CAPTCHA is required
 */
const isCaptchaRequired = async (context, request) => {
    switch (context) {
        case 'register':
            return CAPTCHA_CONFIG.requiredOnRegister;

        case 'forgot-password':
            return CAPTCHA_CONFIG.requiredOnForgotPassword;

        case 'login':
            // Check if always required
            if (CAPTCHA_CONFIG.requiredOnLogin === 'true' || CAPTCHA_CONFIG.requiredOnLogin === true) {
                return true;
            }

            // Check if required after failed attempts
            if (CAPTCHA_CONFIG.requiredOnLogin === 'after_failures') {
                const identifier = request.body?.username || request.body?.email;
                const ipAddress = request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown';

                if (identifier) {
                    try {
                        // Check failed attempts count
                        const emailAttempts = await accountLockoutService.getFailedAttempts(identifier);
                        const ipAttempts = await accountLockoutService.getIPFailedAttempts(ipAddress);

                        // Require CAPTCHA if either identifier or IP has too many failures
                        const maxAttempts = Math.max(emailAttempts, ipAttempts);
                        return maxAttempts >= CAPTCHA_CONFIG.failedLoginThreshold;
                    } catch (error) {
                        logger.warn('Failed to check login attempts for CAPTCHA requirement', {
                            error: error.message,
                            identifier,
                            ipAddress
                        });
                        // On error, be cautious and require CAPTCHA
                        return true;
                    }
                }
            }

            return false;

        default:
            return false;
    }
};

/**
 * Verify CAPTCHA token
 * This is the main verification function called by middleware
 *
 * @param {string} provider - CAPTCHA provider name
 * @param {string} token - CAPTCHA token
 * @param {string} remoteIp - Client IP address
 * @returns {Promise<Object>} - Verification result
 */
const verifyCaptchaToken = async (provider, token, remoteIp) => {
    try {
        // Verify using captcha service
        const result = await captchaService.verifyCaptcha(provider, token, remoteIp);

        // Log verification result
        if (result.success) {
            logger.info('CAPTCHA verification successful', {
                provider: result.provider,
                score: result.score,
                remoteIp
            });
        } else {
            logger.warn('CAPTCHA verification failed', {
                provider: result.provider,
                errorCodes: result.errorCodes,
                remoteIp
            });
        }

        return result;
    } catch (error) {
        logger.error('CAPTCHA verification error', {
            error: error.message,
            provider,
            remoteIp
        });

        // Return failure result on error
        return {
            success: false,
            provider,
            errorCodes: ['verification-error'],
            message: error.message || 'CAPTCHA verification failed'
        };
    }
};

/**
 * CAPTCHA Middleware Factory
 * Creates middleware for specific context (register, login, forgot-password)
 *
 * @param {string} context - 'register', 'login', 'forgot-password'
 * @returns {Function} - Express middleware
 */
const captchaMiddleware = (context) => {
    return async (request, response, next) => {
        try {
            // Check if CAPTCHA is required for this context
            const required = await isCaptchaRequired(context, request);

            if (!required) {
                // CAPTCHA not required, proceed
                logger.debug(`CAPTCHA not required for context: ${context}`);
                return next();
            }

            // Get CAPTCHA token and provider from request
            const { token, provider } = getCaptchaFromRequest(request);

            // Get client IP for verification
            const remoteIp = request.ip ||
                request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                request.headers['x-real-ip'] ||
                request.connection?.remoteAddress ||
                'unknown';

            // Check if token is provided
            if (!token) {
                logger.warn('CAPTCHA token missing', {
                    context,
                    remoteIp,
                    userAgent: request.headers['user-agent']?.substring(0, 200)
                });

                // Get enabled providers for error response
                const enabledProviders = captchaService.getEnabledProviders();

                // Log missing CAPTCHA attempt
                await auditLogService.log(
                    'captcha_missing',
                    'security',
                    null,
                    null,
                    {
                        context,
                        remoteIp,
                        userAgent: request.headers['user-agent']?.substring(0, 200),
                        severity: 'medium'
                    }
                );

                return response.status(400).json({
                    error: true,
                    message: 'التحقق من CAPTCHA مطلوب',
                    messageEn: 'CAPTCHA verification required',
                    code: 'CAPTCHA_REQUIRED',
                    enabledProviders: enabledProviders.map(p => p.key),
                    defaultProvider: CAPTCHA_CONFIG.defaultProvider
                });
            }

            // Check if provider is provided
            if (!provider) {
                logger.warn('CAPTCHA provider missing', {
                    context,
                    remoteIp,
                    hasToken: !!token
                });

                return response.status(400).json({
                    error: true,
                    message: 'مزود CAPTCHA مطلوب',
                    messageEn: 'CAPTCHA provider required',
                    code: 'CAPTCHA_PROVIDER_REQUIRED',
                    validProviders: Object.keys(captchaService.PROVIDERS)
                });
            }

            // Verify the CAPTCHA token
            const verificationResult = await verifyCaptchaToken(provider, token, remoteIp);

            if (!verificationResult.success) {
                // CAPTCHA verification failed
                logger.warn('CAPTCHA verification failed in middleware', {
                    context,
                    provider: verificationResult.provider,
                    errorCodes: verificationResult.errorCodes,
                    remoteIp
                });

                // Log failed verification
                await auditLogService.log(
                    'captcha_verification_failed',
                    'security',
                    null,
                    null,
                    {
                        context,
                        provider: verificationResult.provider,
                        errorCodes: verificationResult.errorCodes,
                        remoteIp,
                        userAgent: request.headers['user-agent']?.substring(0, 200),
                        severity: 'medium'
                    }
                );

                return response.status(400).json({
                    error: true,
                    message: 'فشل التحقق من CAPTCHA',
                    messageEn: 'CAPTCHA verification failed',
                    code: 'CAPTCHA_VERIFICATION_FAILED',
                    verified: false,
                    provider: verificationResult.provider,
                    providerName: verificationResult.providerName,
                    errorCodes: verificationResult.errorCodes || [],
                    details: verificationResult.message
                });
            }

            // CAPTCHA verified successfully
            logger.info('CAPTCHA verified successfully in middleware', {
                context,
                provider: verificationResult.provider,
                score: verificationResult.score,
                remoteIp
            });

            // Log successful verification
            await auditLogService.log(
                'captcha_verification_success',
                'security',
                null,
                null,
                {
                    context,
                    provider: verificationResult.provider,
                    score: verificationResult.score,
                    remoteIp,
                    userAgent: request.headers['user-agent']?.substring(0, 200),
                    severity: 'low'
                }
            );

            // Store verification result in request for later use if needed
            request.captchaVerified = true;
            request.captchaProvider = verificationResult.provider;
            request.captchaScore = verificationResult.score;

            // Proceed to next middleware
            next();
        } catch (error) {
            logger.error('CAPTCHA middleware error', {
                error: error.message,
                stack: error.stack,
                context
            });

            // On error, fail securely by blocking the request
            return response.status(500).json({
                error: true,
                message: 'خطأ في التحقق من CAPTCHA',
                messageEn: 'CAPTCHA verification error',
                code: 'CAPTCHA_ERROR'
            });
        }
    };
};

/**
 * Middleware for registration endpoint
 * Validates CAPTCHA before user registration
 */
const captchaRegister = captchaMiddleware('register');

/**
 * Middleware for login endpoint
 * Validates CAPTCHA based on configuration and failed attempts
 */
const captchaLogin = captchaMiddleware('login');

/**
 * Middleware for forgot password endpoint
 * Validates CAPTCHA before sending password reset email
 */
const captchaForgotPassword = captchaMiddleware('forgot-password');

/**
 * Generic CAPTCHA middleware
 * Can be used for any endpoint that needs CAPTCHA protection
 *
 * Usage:
 *   app.post('/endpoint', captchaProtect, handler)
 */
const captchaProtect = async (request, response, next) => {
    try {
        const { token, provider } = getCaptchaFromRequest(request);

        // Get client IP
        const remoteIp = request.ip ||
            request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            request.headers['x-real-ip'] ||
            'unknown';

        // Token is required
        if (!token) {
            const enabledProviders = captchaService.getEnabledProviders();
            return response.status(400).json({
                error: true,
                message: 'التحقق من CAPTCHA مطلوب',
                messageEn: 'CAPTCHA verification required',
                code: 'CAPTCHA_REQUIRED',
                enabledProviders: enabledProviders.map(p => p.key)
            });
        }

        // Provider is required
        if (!provider) {
            return response.status(400).json({
                error: true,
                message: 'مزود CAPTCHA مطلوب',
                messageEn: 'CAPTCHA provider required',
                code: 'CAPTCHA_PROVIDER_REQUIRED',
                validProviders: Object.keys(captchaService.PROVIDERS)
            });
        }

        // Verify CAPTCHA
        const result = await verifyCaptchaToken(provider, token, remoteIp);

        if (!result.success) {
            return response.status(400).json({
                error: true,
                message: 'فشل التحقق من CAPTCHA',
                messageEn: 'CAPTCHA verification failed',
                code: 'CAPTCHA_VERIFICATION_FAILED',
                verified: false,
                provider: result.provider,
                errorCodes: result.errorCodes || []
            });
        }

        // Store verification in request
        request.captchaVerified = true;
        request.captchaProvider = result.provider;
        request.captchaScore = result.score;

        next();
    } catch (error) {
        logger.error('CAPTCHA protect middleware error', {
            error: error.message
        });

        return response.status(500).json({
            error: true,
            message: 'خطأ في التحقق من CAPTCHA',
            messageEn: 'CAPTCHA verification error',
            code: 'CAPTCHA_ERROR'
        });
    }
};

module.exports = {
    captchaRegister,
    captchaLogin,
    captchaForgotPassword,
    captchaProtect,
    captchaMiddleware,
    isCaptchaRequired,
    getCaptchaFromRequest,
    CAPTCHA_CONFIG
};
