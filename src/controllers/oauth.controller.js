const oauthService = require('../services/oauth.service');
const { CustomException } = require('../utils');
const logger = require('../utils/contextLogger');
const { getCookieConfig } = require('./auth.controller');

/**
 * Get enabled OAuth providers
 * @route GET /api/auth/sso/providers
 */
const getEnabledProviders = async (request, response) => {
    try {
        // Get firmId from authenticated user if available
        const firmId = request.user?.firmId || request.query.firmId || null;

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

        // Generate authorization URL
        const authUrl = await oauthService.getAuthorizationUrl(
            providerType,
            returnUrl || '/',
            firmId || null
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

        // Check for OAuth errors
        if (oauthError) {
            logger.warn('OAuth authorization failed', {
                provider: providerType,
                error: oauthError,
                description: error_description
            });

            // Redirect to frontend with error
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            return response.redirect(
                `${frontendUrl}/auth/sso/error?error=${encodeURIComponent(oauthError)}&description=${encodeURIComponent(error_description || 'OAuth authorization failed')}`
            );
        }

        if (!code || !state) {
            throw CustomException('Missing authorization code or state', 400);
        }

        // Get client IP and user agent
        const ipAddress = request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
        const userAgent = request.headers['user-agent'] || 'unknown';

        // Handle the OAuth callback
        const result = await oauthService.handleCallback(
            providerType,
            code,
            state,
            ipAddress,
            userAgent
        );

        // Set cookie with token
        const cookieConfig = getCookieConfig(request);
        response.cookie('accessToken', result.token, cookieConfig);

        // Redirect to frontend with success
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const redirectUrl = result.returnUrl || '/dashboard';

        return response.redirect(
            `${frontendUrl}${redirectUrl}?sso=success&isNewUser=${result.isNewUser}`
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
        const { providerType, code, redirectUri } = request.body;
        const userId = request.userID || request.userId;

        if (!providerType || !code || !redirectUri) {
            throw CustomException('Provider type, code, and redirectUri are required', 400);
        }

        const result = await oauthService.linkAccount(userId, providerType, code, redirectUri);

        return response.status(200).json({
            error: false,
            message: 'OAuth account linked successfully',
            messageAr: 'تم ربط حساب OAuth بنجاح',
            ...result
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

        const result = await oauthService.unlinkAccount(userId, providerType);

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
