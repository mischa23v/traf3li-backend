const ssoRoutingService = require('../services/ssoRouting.service');
const { CustomException } = require('../utils');
const logger = require('../utils/contextLogger');
const { sanitizeObjectId } = require('../utils/securityUtils');

/**
 * SSO Routing Controller
 *
 * Handles domain-based SSO routing endpoints for automatic IdP detection.
 * Provides both public endpoints (detect) and admin endpoints (domain config, verification).
 */

/**
 * Validate and sanitize email address
 * @param {String} email - Email to validate
 * @returns {String|null} Sanitized email or null
 */
const validateEmail = (email) => {
    if (!email || typeof email !== 'string') {
        return null;
    }

    // Trim and lowercase
    const sanitized = email.trim().toLowerCase();

    // Length check (max 254 chars per RFC 5321)
    if (sanitized.length > 254 || sanitized.length < 3) {
        return null;
    }

    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized)) {
        return null;
    }

    // Prevent dangerous characters
    const dangerousPattern = /[<>'";\r\n\t]/;
    if (dangerousPattern.test(sanitized)) {
        return null;
    }

    return sanitized;
};

/**
 * Validate domain format
 * @param {String} domain - Domain to validate
 * @returns {String|null} Sanitized domain or null
 */
const validateDomain = (domain) => {
    if (!domain || typeof domain !== 'string') {
        return null;
    }

    const sanitized = domain.trim().toLowerCase();

    // Length check
    if (sanitized.length > 253 || sanitized.length < 3) {
        return null;
    }

    // Domain format validation
    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;
    if (!domainRegex.test(sanitized)) {
        return null;
    }

    return sanitized;
};

/**
 * Detect SSO provider from email address
 * @route POST /api/auth/sso/detect
 * @access Public
 *
 * Request body:
 * {
 *   "email": "user@biglaw.com",
 *   "firmId": "optional-firm-id",
 *   "returnUrl": "/dashboard"
 * }
 *
 * Response:
 * {
 *   "detected": true,
 *   "provider": {
 *     "id": "provider-id",
 *     "name": "BigLaw Okta",
 *     "type": "saml",
 *     "autoRedirect": true
 *   },
 *   "authUrl": "https://...",
 *   "message": "Sign in with your BigLaw account"
 * }
 */
const detectProvider = async (request, response) => {
    try {
        const { email, firmId, returnUrl } = request.body;

        // Validate email
        const validatedEmail = validateEmail(email);
        if (!validatedEmail) {
            logger.warn('Invalid email provided for SSO detection', {
                ip: request.ip,
                email: email?.substring(0, 3) + '***'
            });
            return response.status(400).json({
                error: true,
                message: 'Invalid email address format',
                messageAr: 'صيغة البريد الإلكتروني غير صحيحة'
            });
        }

        // Validate firmId if provided
        let validatedFirmId = null;
        if (firmId) {
            validatedFirmId = sanitizeObjectId(firmId);
            if (!validatedFirmId) {
                return response.status(400).json({
                    error: true,
                    message: 'Invalid firm ID format',
                    messageAr: 'صيغة معرف الشركة غير صحيحة'
                });
            }
        }

        // Validate returnUrl (basic check)
        let validatedReturnUrl = '/';
        if (returnUrl && typeof returnUrl === 'string') {
            const sanitized = returnUrl.trim();
            // Allow relative URLs only
            if (sanitized.startsWith('/') && !sanitized.startsWith('//')) {
                validatedReturnUrl = sanitized;
            }
        }

        // Detect provider
        const result = await ssoRoutingService.detectProvider(
            validatedEmail,
            validatedFirmId,
            validatedReturnUrl
        );

        // Log detection attempt
        logger.info('SSO provider detection attempt', {
            email: validatedEmail.substring(0, 3) + '***',
            domain: ssoRoutingService.extractDomain(validatedEmail),
            detected: result.detected,
            provider: result.provider?.name || null,
            firmId: validatedFirmId,
            ip: request.ip
        });

        return response.status(200).json({
            error: false,
            ...result
        });
    } catch (error) {
        logger.error('SSO detection failed', {
            error: error.message,
            stack: error.stack
        });

        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to detect SSO provider',
            messageAr: error.messageAr || 'فشل اكتشاف موفر SSO'
        });
    }
};

/**
 * Get SSO configuration for a domain (admin endpoint)
 * @route GET /api/auth/sso/domain/:domain
 * @access Admin
 *
 * Response:
 * {
 *   "domain": "biglaw.com",
 *   "providers": [...],
 *   "primaryProvider": {...}
 * }
 */
const getDomainConfig = async (request, response) => {
    try {
        const { domain } = request.params;
        const { firmId } = request.query;

        // Validate domain
        const validatedDomain = validateDomain(domain);
        if (!validatedDomain) {
            return response.status(400).json({
                error: true,
                message: 'Invalid domain format',
                messageAr: 'صيغة النطاق غير صحيحة'
            });
        }

        // Validate firmId if provided
        let validatedFirmId = null;
        if (firmId) {
            validatedFirmId = sanitizeObjectId(firmId);
            if (!validatedFirmId) {
                return response.status(400).json({
                    error: true,
                    message: 'Invalid firm ID format',
                    messageAr: 'صيغة معرف الشركة غير صحيحة'
                });
            }
        }

        // Get domain configuration
        const config = await ssoRoutingService.getDomainConfig(
            validatedDomain,
            validatedFirmId
        );

        logger.info('Domain SSO config retrieved', {
            domain: validatedDomain,
            firmId: validatedFirmId,
            providerCount: config.providers.length,
            userId: request.userID
        });

        return response.status(200).json({
            error: false,
            message: 'Domain configuration retrieved successfully',
            messageAr: 'تم استرداد تكوين النطاق بنجاح',
            ...config
        });
    } catch (error) {
        logger.error('Failed to get domain config', {
            error: error.message,
            domain: request.params.domain
        });

        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to get domain configuration',
            messageAr: error.messageAr || 'فشل الحصول على تكوين النطاق'
        });
    }
};

/**
 * Generate domain verification token
 * @route POST /api/auth/sso/domain/:domain/verify/generate
 * @access Admin
 *
 * Request body:
 * {
 *   "providerId": "provider-id"
 * }
 *
 * Response:
 * {
 *   "domain": "biglaw.com",
 *   "verificationMethod": "dns",
 *   "txtRecord": {
 *     "host": "_traf3li.biglaw.com",
 *     "type": "TXT",
 *     "value": "traf3li-verify=abc123..."
 *   },
 *   "instructions": [...]
 * }
 */
const generateVerificationToken = async (request, response) => {
    try {
        const { domain } = request.params;
        const { providerId } = request.body;

        // Validate domain
        const validatedDomain = validateDomain(domain);
        if (!validatedDomain) {
            return response.status(400).json({
                error: true,
                message: 'Invalid domain format',
                messageAr: 'صيغة النطاق غير صحيحة'
            });
        }

        // Validate providerId
        const validatedProviderId = sanitizeObjectId(providerId);
        if (!validatedProviderId) {
            return response.status(400).json({
                error: true,
                message: 'Invalid provider ID format',
                messageAr: 'صيغة معرف الموفر غير صحيحة'
            });
        }

        // Generate verification token
        const result = await ssoRoutingService.generateVerificationToken(
            validatedProviderId,
            validatedDomain
        );

        logger.info('Domain verification token generated', {
            domain: validatedDomain,
            providerId: validatedProviderId,
            userId: request.userID
        });

        return response.status(200).json({
            error: false,
            message: 'Verification token generated successfully',
            messageAr: 'تم إنشاء رمز التحقق بنجاح',
            ...result
        });
    } catch (error) {
        logger.error('Failed to generate verification token', {
            error: error.message,
            domain: request.params.domain
        });

        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to generate verification token',
            messageAr: error.messageAr || 'فشل إنشاء رمز التحقق'
        });
    }
};

/**
 * Verify domain ownership
 * @route POST /api/auth/sso/domain/:domain/verify
 * @access Admin
 *
 * Request body:
 * {
 *   "providerId": "provider-id"
 * }
 *
 * Response:
 * {
 *   "verified": true,
 *   "message": "Domain verified successfully",
 *   "verifiedAt": "2024-01-01T00:00:00.000Z"
 * }
 */
const verifyDomain = async (request, response) => {
    try {
        const { domain } = request.params;
        const { providerId } = request.body;
        const userId = request.userID || request.userId;

        // Validate domain
        const validatedDomain = validateDomain(domain);
        if (!validatedDomain) {
            return response.status(400).json({
                error: true,
                message: 'Invalid domain format',
                messageAr: 'صيغة النطاق غير صحيحة'
            });
        }

        // Validate providerId
        const validatedProviderId = sanitizeObjectId(providerId);
        if (!validatedProviderId) {
            return response.status(400).json({
                error: true,
                message: 'Invalid provider ID format',
                messageAr: 'صيغة معرف الموفر غير صحيحة'
            });
        }

        // Verify domain
        const result = await ssoRoutingService.verifyDomain(
            validatedProviderId,
            validatedDomain,
            userId
        );

        logger.info('Domain verification attempt', {
            domain: validatedDomain,
            providerId: validatedProviderId,
            verified: result.verified,
            userId
        });

        const statusCode = result.verified ? 200 : 400;

        return response.status(statusCode).json({
            error: !result.verified,
            ...result
        });
    } catch (error) {
        logger.error('Domain verification failed', {
            error: error.message,
            domain: request.params.domain
        });

        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to verify domain',
            messageAr: error.messageAr || 'فشل التحقق من النطاق'
        });
    }
};

/**
 * Manually verify domain (admin override)
 * @route POST /api/auth/sso/domain/:domain/verify/manual
 * @access Admin
 *
 * Request body:
 * {
 *   "providerId": "provider-id"
 * }
 *
 * Response:
 * {
 *   "verified": true,
 *   "message": "Domain verified manually by administrator",
 *   "verificationMethod": "manual"
 * }
 */
const manualVerifyDomain = async (request, response) => {
    try {
        const { domain } = request.params;
        const { providerId } = request.body;
        const userId = request.userID || request.userId;

        // Validate domain
        const validatedDomain = validateDomain(domain);
        if (!validatedDomain) {
            return response.status(400).json({
                error: true,
                message: 'Invalid domain format',
                messageAr: 'صيغة النطاق غير صحيحة'
            });
        }

        // Validate providerId
        const validatedProviderId = sanitizeObjectId(providerId);
        if (!validatedProviderId) {
            return response.status(400).json({
                error: true,
                message: 'Invalid provider ID format',
                messageAr: 'صيغة معرف الموفر غير صحيحة'
            });
        }

        // Manually verify domain
        const result = await ssoRoutingService.manualVerifyDomain(
            validatedProviderId,
            validatedDomain,
            userId
        );

        logger.info('Domain verified manually', {
            domain: validatedDomain,
            providerId: validatedProviderId,
            userId
        });

        return response.status(200).json({
            error: false,
            ...result
        });
    } catch (error) {
        logger.error('Manual domain verification failed', {
            error: error.message,
            domain: request.params.domain
        });

        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to manually verify domain',
            messageAr: error.messageAr || 'فشل التحقق اليدوي من النطاق'
        });
    }
};

/**
 * Invalidate domain cache
 * @route POST /api/auth/sso/domain/:domain/cache/invalidate
 * @access Admin
 *
 * Request body:
 * {
 *   "firmId": "optional-firm-id"
 * }
 */
const invalidateDomainCache = async (request, response) => {
    try {
        const { domain } = request.params;
        const { firmId } = request.body;

        // Validate domain
        const validatedDomain = validateDomain(domain);
        if (!validatedDomain) {
            return response.status(400).json({
                error: true,
                message: 'Invalid domain format',
                messageAr: 'صيغة النطاق غير صحيحة'
            });
        }

        // Validate firmId if provided
        let validatedFirmId = null;
        if (firmId) {
            validatedFirmId = sanitizeObjectId(firmId);
            if (!validatedFirmId) {
                return response.status(400).json({
                    error: true,
                    message: 'Invalid firm ID format',
                    messageAr: 'صيغة معرف الشركة غير صحيحة'
                });
            }
        }

        // Invalidate cache
        await ssoRoutingService.invalidateDomainCache(validatedDomain, validatedFirmId);

        logger.info('Domain cache invalidated', {
            domain: validatedDomain,
            firmId: validatedFirmId,
            userId: request.userID
        });

        return response.status(200).json({
            error: false,
            message: 'Domain cache invalidated successfully',
            messageAr: 'تم إبطال ذاكرة التخزين المؤقت للنطاق بنجاح'
        });
    } catch (error) {
        logger.error('Failed to invalidate domain cache', {
            error: error.message,
            domain: request.params.domain
        });

        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to invalidate domain cache',
            messageAr: error.messageAr || 'فشل إبطال ذاكرة التخزين المؤقت للنطاق'
        });
    }
};

module.exports = {
    detectProvider,
    getDomainConfig,
    generateVerificationToken,
    verifyDomain,
    manualVerifyDomain,
    invalidateDomainCache
};
