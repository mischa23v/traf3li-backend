const oauthService = require('../services/oauth.service');
const { CustomException } = require('../utils');
const logger = require('../utils/contextLogger');
const { getCookieConfig } = require('../utils/cookieConfig');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const authWebhookService = require('../services/authWebhook.service');

/**
 * Allowed OAuth provider types
 */
const ALLOWED_PROVIDER_TYPES = ['google', 'microsoft', 'facebook', 'apple', 'okta', 'azure', 'auth0', 'custom', 'twitter', 'linkedin', 'github'];

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
 * Supports two formats:
 * 1. Legacy random hex state: [A-Za-z0-9_-]+ (min 32 chars)
 * 2. HMAC-signed state: base64payload.hexsignature (Gold Standard pattern)
 *
 * @param {string} state - State parameter
 * @returns {boolean} - Whether state is valid
 */
const validateStateParameter = (state) => {
    if (!state || typeof state !== 'string') {
        return false;
    }

    // Minimum length of 32 characters for security
    if (state.length < 32) {
        return false;
    }

    // Check for HMAC-signed state format: base64payload.hexsignature
    // Format: [base64 with optional padding].64-char-hex-signature
    if (state.includes('.')) {
        const parts = state.split('.');
        if (parts.length === 2) {
            const [payload, signature] = parts;
            // Payload: base64 (A-Z, a-z, 0-9, -, _, =)
            // Signature: 64-char hex (0-9, a-f) for SHA256 HMAC
            const base64Regex = /^[A-Za-z0-9_\-=]+$/;
            const hexRegex = /^[a-f0-9]{64}$/;
            if (base64Regex.test(payload) && hexRegex.test(signature)) {
                return true;
            }
        }
        // If it has dots but doesn't match HMAC format, it's invalid
        return false;
    }

    // Legacy format: alphanumeric, dash, underscore (URL-safe base64)
    const legacyStateRegex = /^[A-Za-z0-9_-]+$/;
    return legacyStateRegex.test(state);
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
        // Aggressive logging for SSO debugging
        // eslint-disable-next-line no-console
        console.log('[SSO] getEnabledProviders called:', {
            path: request.path,
            method: request.method,
            query: request.query,
            headers: {
                origin: request.headers.origin,
                referer: request.headers.referer
            },
            user: request.user ? 'authenticated' : 'unauthenticated',
            userID: request.userID || 'none'
        });

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
        const { returnUrl, firmId, use_pkce } = request.query;

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

        // Parse PKCE flag (for mobile apps)
        // Can be: use_pkce=true, use_pkce=1, use_pkce=yes
        const usePKCE = use_pkce === 'true' || use_pkce === '1' || use_pkce === 'yes';

        if (usePKCE) {
            logger.info('PKCE requested for OAuth flow', {
                provider: validatedProviderType,
                clientType: request.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'web'
            });
        }

        // Generate authorization URL with CSRF protection (state parameter) and optional PKCE
        const authUrl = await oauthService.getAuthorizationUrl(
            validatedProviderType,
            validatedReturnUrl,
            validatedFirmId,
            usePKCE
        );

        return response.status(200).json({
            error: false,
            message: 'Authorization URL generated successfully',
            authUrl,
            pkceEnabled: usePKCE
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

        // Trigger OAuth linked webhook (fire-and-forget)
        (async () => {
            try {
                const { User } = require('../models');
                // NOTE: Bypass firmIsolation filter - webhook needs to work for solo lawyers without firmId
                const user = await User.findById(userId).select('_id email username firmId').setOptions({ bypassFirmFilter: true }).lean();
                if (user) {
                    await authWebhookService.triggerOAuthLinkedWebhook(user, request, {
                        provider: result.provider || validatedProviderType,
                        providerUserId: result.providerUserId,
                        firmId: user.firmId?.toString() || null
                    });
                }
            } catch (error) {
                logger.error('Failed to trigger OAuth linked webhook', {
                    error: error.message,
                    userId
                });
                // Don't fail linking if webhook fails
            }
        })();

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

        // Trigger OAuth unlinked webhook (fire-and-forget)
        (async () => {
            try {
                const { User } = require('../models');
                // NOTE: Bypass firmIsolation filter - webhook needs to work for solo lawyers without firmId
                const user = await User.findById(userId).select('_id email username firmId').setOptions({ bypassFirmFilter: true }).lean();
                if (user) {
                    await authWebhookService.triggerOAuthUnlinkedWebhook(user, request, {
                        provider: validatedProviderType,
                        firmId: user.firmId?.toString() || null
                    });
                }
            } catch (error) {
                logger.error('Failed to trigger OAuth unlinked webhook', {
                    error: error.message,
                    userId
                });
                // Don't fail unlinking if webhook fails
            }
        })();

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

/**
 * Initiate SSO login flow (POST endpoint for frontend)
 * @route POST /api/auth/sso/initiate
 * @description Frontend-friendly endpoint that accepts provider in request body
 *              and returns authorization URL for redirect
 */
const initiateSSO = async (request, response) => {
    try {
        // Aggressive logging for SSO debugging
        // eslint-disable-next-line no-console
        console.log('[SSO] initiateSSO called:', {
            body: request.body,
            path: request.path,
            method: request.method,
            headers: {
                origin: request.headers.origin,
                referer: request.headers.referer,
                'content-type': request.headers['content-type'],
                'x-csrf-token': request.headers['x-csrf-token'] ? 'present' : 'missing'
            },
            cookies: Object.keys(request.cookies || {}),
            user: request.user ? 'authenticated' : 'unauthenticated',
            userID: request.userID || 'none'
        });

        const { provider, returnUrl, firmId, use_pkce } = request.body;

        // Validate provider
        const validatedProviderType = validateProviderType(provider);
        if (!validatedProviderType) {
            throw CustomException('Invalid OAuth provider type', 400);
        }

        // Validate and sanitize returnUrl (internal redirect only)
        let validatedReturnUrl = '/';
        if (returnUrl) {
            const sanitized = validateRedirectUri(returnUrl, false);
            if (sanitized) {
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

        // Parse PKCE flag
        const usePKCE = use_pkce === true || use_pkce === 'true';

        // Generate authorization URL with CSRF protection
        const authorizationUrl = await oauthService.getAuthorizationUrl(
            validatedProviderType,
            validatedReturnUrl,
            validatedFirmId,
            usePKCE
        );

        logger.info('SSO initiate request processed', {
            provider: validatedProviderType,
            pkceEnabled: usePKCE
        });

        return response.status(200).json({
            error: false,
            message: 'Authorization URL generated successfully',
            authorizationUrl,
            pkceEnabled: usePKCE
        });
    } catch (error) {
        logger.error('Failed to initiate SSO', { error: error.message });
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to initiate SSO flow'
        });
    }
};

/**
 * Handle OAuth callback (POST endpoint for frontend)
 * @route POST /api/auth/sso/callback
 * @description Frontend-friendly endpoint that accepts code/state in request body
 *              and returns user data + token instead of redirecting
 */
const callbackPost = async (request, response) => {
    try {
        const { provider, code, state } = request.body;

        // eslint-disable-next-line no-console
        console.log('[SSO CALLBACK] ========== START ==========');
        // eslint-disable-next-line no-console
        console.log('[SSO CALLBACK] Request body:', {
            provider,
            codeLength: code?.length,
            stateLength: state?.length,
            hasCode: !!code,
            hasState: !!state
        });

        // Validate provider type
        const validatedProviderType = validateProviderType(provider);
        if (!validatedProviderType) {
            throw CustomException('Invalid OAuth provider type', 400);
        }

        // Validate required parameters
        if (!code || !state) {
            throw CustomException('Missing authorization code or state parameter', 400);
        }

        // Validate authorization code format
        if (!validateAuthCode(code)) {
            throw CustomException('Invalid authorization code format', 400);
        }

        // Validate state parameter for CSRF protection
        if (!validateStateParameter(state)) {
            throw CustomException('Invalid state parameter - CSRF validation failed', 400);
        }

        // Get client IP and user agent
        const ipAddress = request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
        const userAgent = request.headers['user-agent'] || 'unknown';

        // eslint-disable-next-line no-console
        console.log('[SSO CALLBACK] Calling oauthService.handleCallback...');

        // Handle the OAuth callback
        const result = await oauthService.handleCallback(
            validatedProviderType,
            code,
            state,
            ipAddress,
            userAgent
        );

        // eslint-disable-next-line no-console
        console.log('[SSO CALLBACK] handleCallback result:', {
            hasToken: !!result.token,
            tokenLength: result.token?.length,
            tokenPreview: result.token?.substring(0, 20) + '...',
            isNewUser: result.isNewUser,
            userId: result.user?.id,
            userEmail: result.user?.email,
            hasUser: !!result.user
        });

        logger.info('SSO callback processed successfully', {
            provider: validatedProviderType,
            isNewUser: result.isNewUser,
            userId: result.user?.id
        });

        // For existing users, set both accessToken and refreshToken cookies (matching regular login)
        if (!result.isNewUser && result.token) {
            const accessCookieConfig = getCookieConfig(request, 'access');
            const refreshCookieConfig = getCookieConfig(request, 'refresh');
            // eslint-disable-next-line no-console
            console.log('[SSO CALLBACK] Setting cookies:', {
                accessTokenLength: result.token.length,
                hasRefreshToken: !!result.refreshToken,
                refreshTokenLength: result.refreshToken?.length
            });
            response.cookie('accessToken', result.token, accessCookieConfig);
            if (result.refreshToken) {
                response.cookie('refreshToken', result.refreshToken, refreshCookieConfig);
            }
        } else {
            // eslint-disable-next-line no-console
            console.log('[SSO CALLBACK] NOT setting cookies:', {
                isNewUser: result.isNewUser,
                hasToken: !!result.token
            });
        }

        const responseData = {
            error: false,
            message: result.isNewUser ? 'New user detected, please complete registration' : 'Authentication successful',
            user: result.user,
            isNewUser: result.isNewUser,
            registrationRequired: result.isNewUser,  // Explicit flag for frontend clarity
            // OAuth 2.0 standard format (snake_case) - Industry standard for tokens
            access_token: result.isNewUser ? null : result.token,
            refresh_token: result.isNewUser ? null : result.refreshToken || null,
            token_type: 'Bearer',
            expires_in: 900, // 15 minutes in seconds (standard access token lifetime)
            // Backwards compatibility (camelCase) - for existing frontend code
            accessToken: result.isNewUser ? null : result.token,
            refreshToken: result.isNewUser ? null : result.refreshToken || null
        };

        // Add clear logging for new user detection
        if (result.isNewUser) {
            // eslint-disable-next-line no-console
            console.log('[SSO CALLBACK] NEW USER - Registration required:', {
                email: result.user?.email,
                registrationRequired: true,
                tokenProvided: false,
                provider: validatedProviderType,
                autoCreateUsers: false
            });
        }

        // eslint-disable-next-line no-console
        console.log('[SSO CALLBACK] Sending response:', {
            error: responseData.error,
            message: responseData.message,
            hasUser: !!responseData.user,
            isNewUser: responseData.isNewUser,
            registrationRequired: responseData.registrationRequired,
            hasAccessToken: !!responseData.accessToken,
            accessTokenLength: responseData.accessToken?.length,
            hasRefreshToken: !!responseData.refreshToken
        });
        // eslint-disable-next-line no-console
        console.log('[SSO CALLBACK] ========== END ==========');

        // Return response matching frontend expectations
        return response.status(200).json(responseData);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[SSO CALLBACK] ERROR:', {
            message: error.message,
            status: error.status,
            stack: error.stack
        });
        logger.error('SSO callback failed', { error: error.message });
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'SSO callback failed'
        });
    }
};

module.exports = {
    getEnabledProviders,
    authorize,
    callback,
    linkAccount,
    unlinkAccount,
    getLinkedAccounts,
    initiateSSO,
    callbackPost
};
