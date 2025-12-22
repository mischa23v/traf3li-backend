const axios = require('axios');
const crypto = require('crypto');
const SsoProvider = require('../models/ssoProvider.model');
const SsoUserLink = require('../models/ssoUserLink.model');
const User = require('../models/user.model');
const Firm = require('../models/firm.model');
const { decrypt, encrypt } = require('../utils/encryption');
const jwt = require('jsonwebtoken');
const cacheService = require('./cache.service');
const logger = require('../utils/contextLogger');
const { CustomException } = require('../utils');
const auditLogService = require('./auditLog.service');

const { JWT_SECRET, FRONTEND_URL, DASHBOARD_URL } = process.env;

// Allowed redirect domains for OAuth callbacks (prevents open redirect attacks)
const ALLOWED_REDIRECT_ORIGINS = [
    FRONTEND_URL,
    DASHBOARD_URL,
    process.env.BACKEND_URL,
    process.env.API_URL
].filter(Boolean).map(url => {
    try {
        return new URL(url).origin;
    } catch {
        return null;
    }
}).filter(Boolean);

/**
 * Validate return URL to prevent open redirect attacks
 * @param {string} returnUrl - URL to validate
 * @returns {string} Safe return URL (defaults to '/' if invalid)
 */
const validateReturnUrl = (returnUrl) => {
    if (!returnUrl || typeof returnUrl !== 'string') {
        return '/';
    }

    // Allow relative URLs (starting with /)
    if (returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
        // Prevent path traversal and protocol-relative URLs
        return returnUrl;
    }

    // For absolute URLs, validate the origin
    try {
        const url = new URL(returnUrl);

        // Check if origin is in allowed list
        if (ALLOWED_REDIRECT_ORIGINS.includes(url.origin)) {
            return returnUrl;
        }

        // Invalid origin - return safe default
        logger.warn('OAuth: Rejected invalid return URL origin', {
            returnUrl,
            origin: url.origin,
            allowedOrigins: ALLOWED_REDIRECT_ORIGINS
        });
        return '/';
    } catch {
        // Invalid URL format
        logger.warn('OAuth: Rejected malformed return URL', { returnUrl });
        return '/';
    }
};

// Provider-specific configurations
const PROVIDER_CONFIGS = {
    google: {
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userinfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
        scopes: ['openid', 'profile', 'email']
    },
    microsoft: {
        authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        userinfoUrl: 'https://graph.microsoft.com/v1.0/me',
        scopes: ['openid', 'profile', 'email', 'User.Read']
    }
};

class OAuthService {
    /**
     * Generate state for CSRF protection
     * @returns {string} Random state token
     */
    generateState() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Store state in cache with expiry (15 minutes)
     * @param {string} state - State token
     * @param {object} data - Data to store with state (returnUrl, firmId, etc.)
     */
    async storeState(state, data) {
        const key = `oauth:state:${state}`;
        await cacheService.set(key, data, 900); // 15 minutes TTL
    }

    /**
     * Verify and consume state
     * @param {string} state - State token to verify
     * @returns {object|null} Stored data or null if invalid
     */
    async verifyState(state) {
        const key = `oauth:state:${state}`;
        const data = await cacheService.get(key);

        if (data) {
            // Delete state after verification (one-time use)
            await cacheService.del(key);
        }

        return data;
    }

    /**
     * Get provider configuration
     * @param {string} providerId - Provider ID or provider type
     * @param {string} firmId - Optional firm ID for firm-specific providers
     * @returns {object} Provider configuration
     */
    async getProviderConfig(providerId, firmId = null) {
        let provider;

        // Check if providerId is actually a provider type (google, microsoft, etc.)
        if (['google', 'microsoft', 'okta', 'auth0', 'custom'].includes(providerId)) {
            // Get provider by type and firm
            provider = await SsoProvider.getActiveProvider(firmId, providerId);
        } else {
            // Get provider by ID
            provider = await SsoProvider.findById(providerId).select('+clientSecret');
        }

        if (!provider) {
            throw CustomException('SSO provider not found', 404);
        }

        if (!provider.isEnabled) {
            throw CustomException('SSO provider is disabled', 400);
        }

        // Get provider-specific URLs using the model method
        const urls = provider.getOAuthUrls();

        return {
            provider,
            clientId: provider.clientId,
            clientSecret: provider.clientSecret, // Already decrypted by encryption plugin
            authorizationUrl: urls.authorizationUrl,
            tokenUrl: urls.tokenUrl,
            userinfoUrl: urls.userinfoUrl,
            scopes: provider.scopes || PROVIDER_CONFIGS[provider.providerType]?.scopes || ['openid', 'profile', 'email']
        };
    }

    /**
     * Get authorization URL for OAuth flow
     * @param {string} providerId - Provider ID or provider type
     * @param {string} returnUrl - URL to return to after authentication
     * @param {string} firmId - Optional firm ID
     * @returns {string} Authorization URL
     */
    async getAuthorizationUrl(providerId, returnUrl = '/', firmId = null) {
        const config = await this.getProviderConfig(providerId, firmId);

        // Generate state for CSRF protection
        const state = this.generateState();

        // Build redirect URI
        const baseUrl = process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000';
        const redirectUri = `${baseUrl}/api/auth/sso/${providerId}/callback`;

        // Validate return URL to prevent open redirect attacks
        const safeReturnUrl = validateReturnUrl(returnUrl);

        // Store state with metadata
        await this.storeState(state, {
            providerId: config.provider._id.toString(),
            providerType: config.provider.providerType,
            returnUrl: safeReturnUrl,
            firmId: config.provider.firmId,
            redirectUri,
            timestamp: Date.now()
        });

        // Build authorization URL
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: config.scopes.join(' '),
            state,
            access_type: 'offline', // For Google refresh tokens
            prompt: 'consent' // Force consent to get refresh token
        });

        return `${config.authorizationUrl}?${params.toString()}`;
    }

    /**
     * Exchange authorization code for tokens
     * @param {string} providerId - Provider ID
     * @param {string} code - Authorization code
     * @param {string} redirectUri - Redirect URI used in authorization
     * @returns {object} Token response
     */
    async exchangeCodeForTokens(providerId, code, redirectUri) {
        const config = await this.getProviderConfig(providerId);

        try {
            // Build request parameters
            const params = new URLSearchParams({
                client_id: config.clientId,
                client_secret: config.clientSecret,
                code,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            });

            const response = await axios.post(config.tokenUrl, params.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            return response.data;
        } catch (error) {
            logger.error('Token exchange failed', {
                provider: config.provider.name,
                error: error.response?.data || error.message
            });
            throw CustomException('Failed to exchange authorization code for tokens', 400);
        }
    }

    /**
     * Get user info from provider
     * @param {object} provider - Provider configuration
     * @param {string} accessToken - Access token
     * @returns {object} User info
     */
    async getUserInfo(provider, accessToken) {
        const config = PROVIDER_CONFIGS[provider.name] || {};
        const userinfoUrl = provider.userinfoUrl || config.userinfoUrl;

        try {
            const response = await axios.get(userinfoUrl, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            return this.mapUserInfo(provider.name, response.data, provider.attributeMapping);
        } catch (error) {
            logger.error('Failed to get user info', {
                provider: provider.name,
                error: error.response?.data || error.message
            });
            throw CustomException('Failed to get user information from provider', 400);
        }
    }

    /**
     * Map provider user info to standard format
     * @param {string} providerType - Provider type
     * @param {object} data - Raw user data from provider
     * @param {object} mapping - Attribute mapping from provider config
     * @returns {object} Mapped user info
     */
    mapUserInfo(providerType, data, mapping = {}) {
        // Default mappings based on OIDC standards
        const map = {
            id: mapping.id || 'sub',
            email: mapping.email || 'email',
            firstName: mapping.firstName || 'given_name',
            lastName: mapping.lastName || 'family_name',
            avatar: mapping.avatar || 'picture'
        };

        // Provider-specific handling
        let userInfo = {};

        if (providerType === 'google') {
            userInfo = {
                externalId: data.sub,
                email: data.email,
                firstName: data.given_name,
                lastName: data.family_name,
                displayName: data.name,
                picture: data.picture,
                emailVerified: data.email_verified,
                locale: data.locale
            };
        } else if (providerType === 'microsoft') {
            userInfo = {
                externalId: data.id,
                email: data.mail || data.userPrincipalName,
                firstName: data.givenName,
                lastName: data.surname,
                displayName: data.displayName,
                picture: null, // Microsoft Graph doesn't return picture in basic profile
                emailVerified: true
            };
        } else {
            // Generic OAuth/OIDC provider
            userInfo = {
                externalId: data[map.id] || data.sub || data.id,
                email: data[map.email],
                firstName: data[map.firstName],
                lastName: data[map.lastName],
                displayName: data.name || `${data[map.firstName]} ${data[map.lastName]}`,
                picture: data[map.avatar]
            };
        }

        return { ...userInfo, rawProfile: data };
    }

    /**
     * Handle OAuth callback
     * @param {string} providerId - Provider ID or provider type
     * @param {string} code - Authorization code
     * @param {string} state - State token
     * @param {string} ipAddress - User IP address
     * @param {string} userAgent - User agent string
     * @returns {object} Authentication result with token and redirect URL
     */
    async handleCallback(providerId, code, state, ipAddress = null, userAgent = null) {
        // Verify state
        const stateData = await this.verifyState(state);
        if (!stateData) {
            throw CustomException('Invalid or expired state token', 400);
        }

        // Get provider config (use the stored provider ID from state)
        const config = await this.getProviderConfig(stateData.providerId);

        // Exchange code for tokens using the redirect URI from state
        const tokens = await this.exchangeCodeForTokens(stateData.providerId, code, stateData.redirectUri);

        // Get user info
        const userInfo = await this.getUserInfo(config.provider, tokens.access_token);

        // Find existing SSO link
        let ssoLink = await SsoUserLink.findByExternalId(userInfo.externalId, config.provider._id);

        let user;
        let isNewUser = false;

        if (ssoLink) {
            // Existing SSO link - get user
            user = await User.findById(ssoLink.userId);

            if (!user) {
                throw CustomException('User account not found', 404);
            }

            // Update SSO link login info
            await ssoLink.recordLogin(ipAddress, userAgent);

            // Update external profile
            await ssoLink.updateProfile({
                email: userInfo.email,
                firstName: userInfo.firstName,
                lastName: userInfo.lastName,
                displayName: userInfo.displayName,
                avatar: userInfo.picture,
                locale: userInfo.locale
            });
        } else {
            // Check if user exists with this email
            user = await User.findOne({ email: userInfo.email.toLowerCase() });

            if (user) {
                // Check if domain is allowed for auto-linking
                if (!config.provider.isEmailDomainAllowed(userInfo.email)) {
                    throw CustomException('Email domain not allowed for SSO authentication', 403);
                }

                // User exists - create SSO link
                ssoLink = await SsoUserLink.createOrUpdate(
                    user._id,
                    config.provider._id,
                    {
                        externalId: userInfo.externalId,
                        email: userInfo.email,
                        providerType: config.provider.providerType,
                        profile: {
                            firstName: userInfo.firstName,
                            lastName: userInfo.lastName,
                            displayName: userInfo.displayName,
                            avatar: userInfo.picture,
                            locale: userInfo.locale
                        },
                        isProvisioned: false
                    }
                );

                await ssoLink.recordLogin(ipAddress, userAgent);
            } else if (config.provider.autoCreateUsers) {
                // Check if domain is allowed for auto-provisioning
                if (!config.provider.isEmailDomainAllowed(userInfo.email)) {
                    throw CustomException('Email domain not allowed for auto-provisioning', 403);
                }

                // Auto-provision new user
                isNewUser = true;
                user = await this.createUserFromSSO(userInfo, config.provider);

                // Create SSO link
                ssoLink = await SsoUserLink.createOrUpdate(
                    user._id,
                    config.provider._id,
                    {
                        externalId: userInfo.externalId,
                        email: userInfo.email,
                        providerType: config.provider.providerType,
                        profile: {
                            firstName: userInfo.firstName,
                            lastName: userInfo.lastName,
                            displayName: userInfo.displayName,
                            avatar: userInfo.picture,
                            locale: userInfo.locale
                        },
                        isProvisioned: true
                    }
                );

                await ssoLink.recordLogin(ipAddress, userAgent);
            } else {
                throw CustomException('No account found with this email. Auto-provisioning is disabled.', 404);
            }
        }

        // Generate JWT token
        const token = jwt.sign({
            _id: user._id,
            isSeller: user.isSeller
        }, JWT_SECRET, { expiresIn: '7 days' });

        // Log successful SSO login
        await auditLogService.log(
            'sso_login_success',
            'user',
            user._id,
            null,
            {
                userId: user._id,
                userEmail: user.email,
                userRole: user.role,
                provider: config.provider.name,
                providerType: config.provider.providerType,
                isNewUser,
                ipAddress,
                userAgent,
                severity: 'low'
            }
        );

        return {
            token,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                firmId: user.firmId,
                firmRole: user.firmRole,
                image: user.image
            },
            isNewUser,
            returnUrl: stateData.returnUrl || '/'
        };
    }

    /**
     * Create new user from SSO login
     * @param {object} userInfo - User info from provider
     * @param {object} provider - Provider configuration
     * @returns {object} Created user
     */
    async createUserFromSSO(userInfo, provider) {
        const bcrypt = require('bcrypt');

        // Generate username from email
        const username = userInfo.email.split('@')[0] + '_' + crypto.randomBytes(4).toString('hex');

        // Generate random password (user won't use it for SSO login)
        const randomPassword = crypto.randomBytes(32).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPassword, 12);

        const userData = {
            username,
            email: userInfo.email.toLowerCase(),
            password: hashedPassword,
            firstName: userInfo.firstName || 'User',
            lastName: userInfo.lastName || 'User',
            phone: '', // Will be filled by user later
            role: provider.defaultRole || 'lawyer',
            isSeller: provider.defaultRole === 'lawyer',
            country: 'Saudi Arabia',
            image: userInfo.picture,

            // Mark as SSO user
            isSSOUser: true,
            ssoProvider: provider.name,

            // Firm association
            firmId: provider.firmId,
            firmRole: provider.defaultRole,
            firmStatus: provider.firmId ? 'active' : null
        };

        const user = new User(userData);
        await user.save();

        // If firm is specified, add user to firm members
        if (provider.firmId) {
            try {
                const firm = await Firm.findById(provider.firmId);
                if (firm) {
                    const { getDefaultPermissions } = require('../config/permissions.config');

                    firm.members.push({
                        userId: user._id,
                        role: provider.defaultRole,
                        permissions: getDefaultPermissions(provider.defaultRole),
                        status: 'active',
                        joinedAt: new Date()
                    });

                    if (provider.defaultRole === 'lawyer' && !firm.lawyers.includes(user._id)) {
                        firm.lawyers.push(user._id);
                    }

                    await firm.save();
                }
            } catch (error) {
                logger.error('Failed to add SSO user to firm', { error: error.message });
            }
        }

        return user;
    }

    /**
     * Link SSO to existing account
     * @param {string} userId - User ID
     * @param {string} providerId - Provider ID or provider type
     * @param {string} code - Authorization code
     * @param {string} redirectUri - Redirect URI
     * @returns {object} Link result
     */
    async linkAccount(userId, providerId, code, redirectUri) {
        const user = await User.findById(userId);
        if (!user) {
            throw CustomException('User not found', 404);
        }

        // Get provider config
        const config = await this.getProviderConfig(providerId, user.firmId);

        // Check if already linked
        const existingLink = await SsoUserLink.hasProviderLink(userId, config.provider.providerType);
        if (existingLink) {
            throw CustomException('Account already linked to this provider', 400);
        }

        // Exchange code for tokens
        const tokens = await this.exchangeCodeForTokens(config.provider._id.toString(), code, redirectUri);

        // Get user info
        const userInfo = await this.getUserInfo(config.provider, tokens.access_token);

        // Verify email matches
        if (userInfo.email.toLowerCase() !== user.email.toLowerCase()) {
            throw CustomException('SSO account email does not match user account email', 400);
        }

        // Check if this external ID is already linked to another user
        const existingProviderLink = await SsoUserLink.findByExternalId(userInfo.externalId, config.provider._id);
        if (existingProviderLink) {
            throw CustomException('This SSO account is already linked to another user', 400);
        }

        // Create SSO link
        const ssoLink = await SsoUserLink.createOrUpdate(
            user._id,
            config.provider._id,
            {
                externalId: userInfo.externalId,
                email: userInfo.email,
                username: userInfo.email.split('@')[0],
                providerType: config.provider.providerType,
                profile: {
                    firstName: userInfo.firstName,
                    lastName: userInfo.lastName,
                    displayName: userInfo.displayName,
                    avatar: userInfo.picture,
                    locale: userInfo.locale
                },
                isProvisioned: false,
                linkedBy: userId
            }
        );

        // Update user SSO flag if not already set
        if (!user.isSSOUser) {
            await User.findByIdAndUpdate(userId, {
                isSSOUser: true,
                ssoProvider: config.provider.providerType
            });
        }

        await auditLogService.log(
            'sso_account_linked',
            'user',
            user._id,
            null,
            {
                userId: user._id,
                userEmail: user.email,
                provider: config.provider.name,
                providerType: config.provider.providerType,
                severity: 'low'
            }
        );

        return {
            success: true,
            link: ssoLink.toSafeObject()
        };
    }

    /**
     * Unlink SSO from account
     * @param {string} userId - User ID
     * @param {string} providerIdOrType - Provider ID or type
     * @returns {object} Unlink result
     */
    async unlinkAccount(userId, providerIdOrType) {
        const user = await User.findById(userId).select('password email firmId');
        if (!user) {
            throw CustomException('User not found', 404);
        }

        // Check if user has a password (don't allow unlinking if no password)
        if (!user.password) {
            throw CustomException('Cannot unlink SSO: no password set. Please set a password first.', 400);
        }

        // Find the link
        let link;
        if (['google', 'microsoft', 'okta', 'auth0', 'custom'].includes(providerIdOrType)) {
            // It's a provider type
            const links = await SsoUserLink.getUserLinks(userId);
            link = links.find(l => l.providerType === providerIdOrType);
        } else {
            // It's a provider ID
            link = await SsoUserLink.findOne({ userId, providerId: providerIdOrType });
        }

        if (!link) {
            throw CustomException('SSO link not found', 404);
        }

        // Deactivate the link
        await link.deactivate(userId, 'User requested unlinking');

        // Check if user has any other active SSO links
        const remainingLinks = await SsoUserLink.getUserLinks(userId, true);
        if (remainingLinks.length === 0) {
            // No more SSO links - update user
            await User.findByIdAndUpdate(userId, {
                isSSOUser: false,
                ssoProvider: null
            });
        }

        await auditLogService.log(
            'sso_account_unlinked',
            'user',
            userId,
            null,
            {
                userId,
                userEmail: user.email,
                provider: link.providerType,
                severity: 'low'
            }
        );

        return {
            success: true
        };
    }

    /**
     * Get enabled providers for a firm
     * @param {string} firmId - Firm ID (null for global providers)
     * @returns {array} List of enabled providers
     */
    async getEnabledProviders(firmId = null) {
        return await SsoProvider.listEnabledProviders(firmId);
    }

    /**
     * Get user's linked SSO accounts
     * @param {string} userId - User ID
     * @returns {array} List of linked providers
     */
    async getUserLinkedProviders(userId) {
        return await SsoUserLink.getUserLinks(userId, true);
    }
}

module.exports = new OAuthService();
