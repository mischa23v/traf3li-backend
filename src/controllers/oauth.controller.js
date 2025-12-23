const oauthService = require('../services/oauth.service');
const { CustomException } = require('../utils');
const logger = require('../utils/contextLogger');
const { getCookieConfig } = require('./auth.controller');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

/**
 * Allowed OAuth provider types
 */
const ALLOWED_PROVIDER_TYPES = ['google', 'microsoft', 'okta', 'azure', 'auth0', 'custom'];

/**
 * Validate and sanitize redirect URI
 * Prevents open redirect vulnerabilities
 *
 * @param {string} uri - URI to validate
 * @param {boolean} allowExternal - Whether to allow external URLs
 * @returns {string|null} - Validated URI or null if invalid
 */
const validateRedirectUri = (uri, allowExternal = false) => {
    if (!uri || typeof uri !== 'string') {
        return null;
    }

    // Remove dangerous characters
    const sanitized = uri.trim().replace(/[\r\n\t]/g, '');

    // If allowing external URLs, validate against allowed domains
    if (allowExternal) {
        try {
            const url = new URL(sanitized);
            const allowedDomains = process.env.ALLOWED_OAUTH_REDIRECT_DOMAINS?.split(',') || [];
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

            // Check if domain is in allowed list or is the frontend URL
            const isAllowed = allowedDomains.some(domain =>
                url.origin === domain.trim() || url.hostname === domain.trim()
            ) || url.origin === frontendUrl;

            if (!isAllowed) {
                return null;
            }

            return sanitized;
        } catch {
            // Invalid URL format
            return null;
        }
    }

    // For internal redirects, ensure it starts with / and doesn't contain protocol
    if (!sanitized.startsWith('/')) {
        return null;
    }

    // Prevent protocol-relative URLs and absolute URLs
    if (sanitized.startsWith('//') || sanitized.includes('://')) {
        return null;
    }

    // Prevent javascript: and data: URIs
    if (/^(javascript|data|vbscript|file):/i.test(sanitized)) {
        return null;
    }

    return sanitized;
};

/**
 * Validate OAuth provider type
 *
 * @param {string} providerType - Provider type to validate
 * @returns {string|null} - Validated provider type or null
 */
const validateProviderType = (providerType) => {
    if (!providerType || typeof providerType !== 'string') {
        return null;
    }

    const sanitized = providerType.trim().toLowerCase();
    return ALLOWED_PROVIDER_TYPES.includes(sanitized) ? sanitized : null;
};

/**
 * Validate OAuth state parameter
 * Prevents CSRF attacks
 *
 * @param {string} state - State parameter
 * @returns {boolean} - Whether state is valid
 */
const validateStateParameter = (state) => {
    if (!state || typeof state !== 'string') {
        return false;
    }

    // State should be a secure random string (typically base64url encoded)
    // Minimum length of 32 characters for security
    if (state.length < 32) {
        return false;
    }

    // Should only contain alphanumeric, dash, underscore (URL-safe base64)
    const stateRegex = /^[A-Za-z0-9_-]+$/;
    return stateRegex.test(state);
};

/**
 * Validate authorization code
 *
 * @param {string} code - Authorization code
 * @returns {boolean} - Whether code is valid format
 */
const validateAuthCode = (code) => {
    if (!code || typeof code !== 'string') {
        return false;
    }

    // Code should be reasonable length and format
    if (code.length < 10 || code.length > 2048) {
        return false;
    }

    // Should not contain dangerous characters
    const dangerousPattern = /[<>'";\r\n]/;
    return !dangerousPattern.test(code);
};

/**
 * Get enabled OAuth providers
 * @route GET /api/auth/sso/providers
 */
const getEnabledProviders = async (request, response) => {
    try {
        // Get firmId from authenticated user if available
        let firmId = request.user?.firmId || request.query.firmId || null;

        // Validate and sanitize firmId if provided
        if (firmId) {
            firmId = sanitizeObjectId(firmId);
            if (!firmId) {
                throw CustomException('Invalid firm ID format', 400);
            }
        }

        const providers = await oauthService.getEnabledProviders(firmId);

        return response.status(200).json({
            error: false,
            message: 'OAuth providers retrieved successfully',
            providers: providers.map(p => ({
                id: p._id,
                name: p.name,
                providerType: p.providerType,
                isEnabled: p.isEnabled
            }))
        });
    } catch (error) {
        logger.error('Failed to get OAuth providers', { error: error.message });
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to get OAuth providers'
        });
    }
};

/**
 * Start OAuth authorization flow
 * @route GET /api/auth/sso/:providerType/authorize
 */
const authorize = async (request, response) => {
    try {
        const { providerType } = request.params;
        const { returnUrl, firmId } = request.query;

        // Validate provider type
        const validatedProviderType = validateProviderType(providerType);
        if (!validatedProviderType) {
            throw CustomException('Invalid OAuth provider type', 400);
        }

        // Validate and sanitize returnUrl (internal redirect only)
        let validatedReturnUrl = '/';
        if (returnUrl) {
            const sanitized = validateRedirectUri(returnUrl, false);
            if (!sanitized) {
                logger.warn('Invalid return URL provided in OAuth authorize', {
                    provider: validatedProviderType,
                    returnUrl
                });
                // Use default instead of rejecting to avoid breaking user flow
                validatedReturnUrl = '/';
            } else {
                validatedReturnUrl = sanitized;
            }
        }

        // Validate and sanitize firmId
        let validatedFirmId = null;
        if (firmId) {
            validatedFirmId = sanitizeObjectId(firmId);
            if (!validatedFirmId) {
                throw CustomException('Invalid firm ID format', 400);
            }
        }

        // Generate authorization URL with CSRF protection (state parameter)
        const authUrl = await oauthService.getAuthorizationUrl(
            validatedProviderType,
            validatedReturnUrl,
            validatedFirmId
        );

        return response.status(200).json({
            error: false,
            message: 'Authorization URL generated successfully',
            authUrl
        });
    } catch (error) {
        logger.error('Failed to generate authorization URL', { error: error.message });
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to start OAuth flow'
        });
    }
};

/**
 * Handle OAuth callback
 * @route GET /api/auth/sso/:providerType/callback
 */
const callback = async (request, response) => {
    try {
        const { providerType } = request.params;
        const { code, state, error: oauthError, error_description } = request.query;

        // Validate provider type
        const validatedProviderType = validateProviderType(providerType);
        if (!validatedProviderType) {
            logger.error('Invalid provider type in OAuth callback', { providerType });
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            return response.redirect(
                `${frontendUrl}/auth/sso/error?error=invalid_provider&description=${encodeURIComponent('Invalid OAuth provider')}`
            );
        }

        // Check for OAuth errors
        if (oauthError) {
            logger.warn('OAuth authorization failed', {
                provider: validatedProviderType,
                error: oauthError,
                description: error_description
            });

            // Redirect to frontend with error
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            return response.redirect(
                `${frontendUrl}/auth/sso/error?error=${encodeURIComponent(oauthError)}&description=${encodeURIComponent(error_description || 'OAuth authorization failed')}`
            );
        }

        // Validate required parameters
        if (!code || !state) {
            logger.error('Missing OAuth callback parameters', {
                provider: validatedProviderType,
                hasCode: !!code,
                hasState: !!state
            });
            throw CustomException('Missing authorization code or state parameter', 400);
        }

        // Validate authorization code format
        if (!validateAuthCode(code)) {
            logger.error('Invalid authorization code format in OAuth callback', {
                provider: validatedProviderType
            });
            throw CustomException('Invalid authorization code format', 400);
        }

        // Validate state parameter for CSRF protection
        if (!validateStateParameter(state)) {
            logger.error('Invalid state parameter in OAuth callback - possible CSRF attack', {
                provider: validatedProviderType,
                stateLength: state?.length
            });
            throw CustomException('Invalid state parameter - CSRF validation failed', 400);
        }

        // Get client IP and user agent
        const ipAddress = request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
        const userAgent = request.headers['user-agent'] || 'unknown';

        // Handle the OAuth callback with validated parameters
        // The service layer should verify state matches stored value
        const result = await oauthService.handleCallback(
            validatedProviderType,
            code,
            state,
            ipAddress,
            userAgent
        );

        // Validate returnUrl from result before redirecting
        let safeReturnUrl = '/dashboard';
        if (result.returnUrl) {
            const validated = validateRedirectUri(result.returnUrl, false);
            if (validated) {
                safeReturnUrl = validated;
            } else {
                logger.warn('Invalid return URL in OAuth result, using default', {
                    provider: validatedProviderType,
                    returnUrl: result.returnUrl
                });
            }
        }

        // Set secure cookie with token (httpOnly, secure flags set by getCookieConfig)
        const cookieConfig = getCookieConfig(request);
        response.cookie('accessToken', result.token, cookieConfig);

        // Redirect to frontend with success
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        return response.redirect(
            `${frontendUrl}${safeReturnUrl}?sso=success&isNewUser=${!!result.isNewUser}`
        );
    } catch (error) {
        logger.error('OAuth callback failed', { error: error.message });

        // Redirect to frontend with error
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return response.redirect(
            `${frontendUrl}/auth/sso/error?error=callback_failed&description=${encodeURIComponent(error.message)}`
        );
    }
};

/**
 * Link OAuth account to existing user
 * @route POST /api/auth/sso/link
 */
const linkAccount = async (request, response) => {
    try {
        // Use allowlist approach to prevent mass assignment
        const allowedFields = ['providerType', 'code', 'redirectUri', 'state'];
        const sanitizedInput = pickAllowedFields(request.body, allowedFields);

        const { providerType, code, redirectUri, state } = sanitizedInput;
        const userId = request.userID || request.userId;

        // Validate required parameters
        if (!providerType || !code || !redirectUri) {
            throw CustomException('Provider type, code, and redirectUri are required', 400);
        }

        // Validate provider type
        const validatedProviderType = validateProviderType(providerType);
        if (!validatedProviderType) {
            throw CustomException('Invalid OAuth provider type', 400);
        }

        // Validate authorization code
        if (!validateAuthCode(code)) {
            logger.error('Invalid authorization code in link account', {
                userId,
                provider: validatedProviderType
            });
            throw CustomException('Invalid authorization code format', 400);
        }

        // Validate redirect URI (allow external for OAuth flow)
        const validatedRedirectUri = validateRedirectUri(redirectUri, true);
        if (!validatedRedirectUri) {
            logger.error('Invalid redirect URI in link account', {
                userId,
                provider: validatedProviderType,
                redirectUri
            });
            throw CustomException('Invalid or unauthorized redirect URI', 400);
        }

        // Validate state if provided (for CSRF protection)
        if (state && !validateStateParameter(state)) {
            logger.error('Invalid state parameter in link account', {
                userId,
                provider: validatedProviderType
            });
            throw CustomException('Invalid state parameter', 400);
        }

        const result = await oauthService.linkAccount(
            userId,
            validatedProviderType,
            code,
            validatedRedirectUri,
            state
        );

        // Filter result to only include safe fields (don't expose tokens)
        const safeResult = pickAllowedFields(result, [
            'provider',
            'providerUserId',
            'email',
            'displayName',
            'linkedAt'
        ]);

        return response.status(200).json({
            error: false,
            message: 'OAuth account linked successfully',
            messageAr: 'تم ربط حساب OAuth بنجاح',
            ...safeResult
        });
    } catch (error) {
        logger.error('Failed to link OAuth account', { error: error.message });
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to link OAuth account',
            messageAr: error.message || 'فشل ربط حساب OAuth'
        });
    }
};

/**
 * Unlink OAuth account from user
 * @route DELETE /api/auth/sso/unlink/:providerType
 */
const unlinkAccount = async (request, response) => {
    try {
        const { providerType } = request.params;
        const userId = request.userID || request.userId;

        // Validate provider type
        const validatedProviderType = validateProviderType(providerType);
        if (!validatedProviderType) {
            throw CustomException('Invalid OAuth provider type', 400);
        }

        const result = await oauthService.unlinkAccount(userId, validatedProviderType);

        return response.status(200).json({
            error: false,
            message: 'OAuth account unlinked successfully',
            messageAr: 'تم إلغاء ربط حساب OAuth بنجاح',
            ...result
        });
    } catch (error) {
        logger.error('Failed to unlink OAuth account', { error: error.message });
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to unlink OAuth account',
            messageAr: error.message || 'فشل إلغاء ربط حساب OAuth'
        });
    }
};

/**
 * Get user's linked OAuth accounts
 * @route GET /api/auth/sso/linked
 */
const getLinkedAccounts = async (request, response) => {
    try {
        const userId = request.userID || request.userId;

        const links = await oauthService.getUserLinkedProviders(userId);

        return response.status(200).json({
            error: false,
            message: 'Linked accounts retrieved successfully',
            links: links.map(link => link.toSafeObject())
        });
    } catch (error) {
        logger.error('Failed to get linked accounts', { error: error.message });
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to get linked accounts'
        });
    }
};

module.exports = {
    getEnabledProviders,
    authorize,
    callback,
    linkAccount,
    unlinkAccount,
    getLinkedAccounts
};
