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
const { generateAppleClientSecret, decodeAppleIdToken, mapAppleUserInfo } = require('./appleOAuth.helper');

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
        scopes: ['openid', 'profile', 'email'],
        pkceSupport: 'optional' // Google supports but doesn't require PKCE
    },
    microsoft: {
        authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        userinfoUrl: 'https://graph.microsoft.com/v1.0/me',
        scopes: ['openid', 'profile', 'email', 'User.Read'],
        pkceSupport: 'optional' // Microsoft supports but doesn't require PKCE
    },
    facebook: {
        authorizationUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
        userinfoUrl: 'https://graph.facebook.com/me?fields=id,name,email,picture',
        scopes: ['email', 'public_profile'],
        pkceSupport: 'optional' // Facebook supports PKCE for enhanced security
    },
    apple: {
        authorizationUrl: 'https://appleid.apple.com/auth/authorize',
        tokenUrl: 'https://appleid.apple.com/auth/token',
        userinfoUrl: null, // Apple returns user info in id_token JWT, not a userinfo endpoint
        scopes: ['name', 'email'],
        responseMode: 'form_post', // Apple requires this
        pkceSupport: 'none' // Apple doesn't support PKCE
    },
    twitter: {
        authorizationUrl: 'https://twitter.com/i/oauth2/authorize',
        tokenUrl: 'https://api.twitter.com/2/oauth2/token',
        userinfoUrl: 'https://api.twitter.com/2/users/me?user.fields=id,name,username,profile_image_url',
        scopes: ['tweet.read', 'users.read', 'offline.access'],
        pkceSupport: 'required' // Twitter requires PKCE
    },
    linkedin: {
        authorizationUrl: 'https://www.linkedin.com/oauth/v2/authorization',
        tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
        userinfoUrl: 'https://api.linkedin.com/v2/userinfo',
        scopes: ['openid', 'profile', 'email']
    },
    github: {
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userinfoUrl: 'https://api.github.com/user',
        scopes: ['read:user', 'user:email'],
        pkceSupport: 'optional' // GitHub supports PKCE
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
     * Generate PKCE code verifier
     * Random URL-safe string between 43-128 characters
     * @returns {string} Code verifier (base64url encoded)
     */
    generateCodeVerifier() {
        // Generate 32 random bytes, which will result in a 43-character base64url string
        // This meets the minimum length requirement of 43 characters
        return crypto.randomBytes(32)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    /**
     * Generate PKCE code challenge from verifier
     * SHA256 hash of the verifier, base64url encoded
     * @param {string} verifier - Code verifier
     * @returns {string} Code challenge (base64url encoded)
     */
    generateCodeChallenge(verifier) {
        return crypto.createHash('sha256')
            .update(verifier)
            .digest('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    /**
     * Check if PKCE is required for a provider
     * @param {string} providerType - Provider type
     * @returns {boolean} True if PKCE is required
     */
    isPKCERequired(providerType) {
        const config = PROVIDER_CONFIGS[providerType];
        return config?.pkceSupport === 'required';
    }

    /**
     * Check if PKCE is supported for a provider
     * @param {string} providerType - Provider type
     * @returns {boolean} True if PKCE is supported (required or optional)
     */
    isPKCESupported(providerType) {
        const config = PROVIDER_CONFIGS[providerType];
        return config?.pkceSupport === 'required' || config?.pkceSupport === 'optional';
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

        // Handle env-based provider IDs (e.g., "env-google" -> "google")
        let actualProviderId = providerId;
        if (typeof providerId === 'string' && providerId.startsWith('env-')) {
            actualProviderId = providerId.replace('env-', '');
        }

        // Check if providerId is actually a provider type (google, microsoft, facebook, etc.)
        if (['google', 'microsoft', 'facebook', 'okta', 'auth0', 'custom', 'apple', 'twitter', 'linkedin', 'github'].includes(actualProviderId)) {
            // Get provider by type and firm
            provider = await SsoProvider.getActiveProvider(firmId, actualProviderId);

            // Fallback to environment variables if no database provider found
            if (!provider) {
                const envProvider = this.getProviderFromEnv(actualProviderId);
                if (envProvider) {
                    provider = envProvider;
                }
            }
        } else {
            // Get provider by ID
            provider = await SsoProvider.findOne({ _id: providerId, $or: [{ firmId }, { firmId: null }] }).select('+clientSecret');
        }

        if (!provider) {
            throw CustomException('SSO provider not found. Please configure the provider in the database or environment variables.', 404);
        }

        if (!provider.isEnabled) {
            throw CustomException('SSO provider is disabled', 400);
        }

        // Get provider-specific URLs using the model method or from config
        const urls = provider.getOAuthUrls ? provider.getOAuthUrls() : {
            authorizationUrl: PROVIDER_CONFIGS[provider.providerType]?.authorizationUrl,
            tokenUrl: PROVIDER_CONFIGS[provider.providerType]?.tokenUrl,
            userinfoUrl: PROVIDER_CONFIGS[provider.providerType]?.userinfoUrl
        };

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
     * Get provider configuration from environment variables
     * @param {string} providerType - Provider type (google, microsoft, github, etc.)
     * @returns {object|null} Provider-like configuration object or null
     */
    getProviderFromEnv(providerType) {
        const envPrefix = {
            google: 'GOOGLE_SSO',
            microsoft: 'MICROSOFT_SSO',
            github: 'GITHUB_SSO',
            facebook: 'FACEBOOK_SSO',
            twitter: 'TWITTER_SSO',
            linkedin: 'LINKEDIN_SSO',
            apple: 'APPLE_SSO'
        }[providerType];

        if (!envPrefix) {
            return null;
        }

        const clientId = process.env[`${envPrefix}_CLIENT_ID`];
        const clientSecret = process.env[`${envPrefix}_CLIENT_SECRET`];
        const redirectUri = process.env[`${envPrefix}_REDIRECT_URI`];

        if (!clientId || !clientSecret) {
            logger.debug(`No environment variables found for ${providerType} OAuth`, {
                hasClientId: !!clientId,
                hasClientSecret: !!clientSecret
            });
            return null;
        }

        logger.info(`Using environment variables for ${providerType} OAuth provider`);

        // Return a provider-like object (without Mongoose methods)
        return {
            _id: `env-${providerType}`,
            name: `${providerType.charAt(0).toUpperCase() + providerType.slice(1)} (Environment)`,
            providerType,
            clientId,
            clientSecret,
            isEnabled: true,
            firmId: null,
            redirectUri,
            scopes: PROVIDER_CONFIGS[providerType]?.scopes || ['openid', 'email', 'profile'],
            autoCreateUsers: false,
            allowedDomains: [],
            defaultRole: 'lawyer', // Default to lawyer for legal practice management app
            // Mock the isEmailDomainAllowed method
            isEmailDomainAllowed: function(email) {
                // Allow all domains for env-based providers
                return true;
            }
        };
    }

    /**
     * Get authorization URL for OAuth flow
     * @param {string} providerId - Provider ID or provider type
     * @param {string} returnUrl - URL to return to after authentication
     * @param {string} firmId - Optional firm ID
     * @param {boolean} usePKCE - Whether to use PKCE (Proof Key for Code Exchange)
     * @returns {string} Authorization URL
     */
    async getAuthorizationUrl(providerId, returnUrl = '/', firmId = null, usePKCE = false) {
        const config = await this.getProviderConfig(providerId, firmId);

        // Generate state for CSRF protection
        const state = this.generateState();

        // Build redirect URI
        // Priority: 1. Provider-specific env var, 2. Provider config, 3. Backend default
        let redirectUri;
        if (config.provider.redirectUri) {
            // Use redirect URI from provider config (includes env-based providers)
            redirectUri = config.provider.redirectUri;
        } else {
            // Fallback to backend callback endpoint
            const baseUrl = process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000';
            redirectUri = `${baseUrl}/api/auth/sso/${providerId}/callback`;
        }

        // Validate return URL to prevent open redirect attacks
        const safeReturnUrl = validateReturnUrl(returnUrl);

        // Determine if PKCE should be used
        const providerType = config.provider.providerType;
        const pkceRequired = this.isPKCERequired(providerType);
        const pkceSupported = this.isPKCESupported(providerType);
        const shouldUsePKCE = pkceRequired || (usePKCE && pkceSupported);

        // Generate PKCE parameters if enabled
        let codeVerifier = null;
        let codeChallenge = null;

        if (shouldUsePKCE) {
            codeVerifier = this.generateCodeVerifier();
            codeChallenge = this.generateCodeChallenge(codeVerifier);

            logger.info('PKCE enabled for OAuth flow', {
                provider: config.provider.name,
                providerType,
                required: pkceRequired,
                codeVerifierLength: codeVerifier.length,
                codeChallengeLength: codeChallenge.length
            });
        }

        // Store state with metadata (including code_verifier if PKCE is used)
        await this.storeState(state, {
            providerId: config.provider._id.toString(),
            providerType: config.provider.providerType,
            returnUrl: safeReturnUrl,
            firmId: config.provider.firmId,
            redirectUri,
            codeVerifier, // Store for token exchange
            usePKCE: shouldUsePKCE,
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

        // Add PKCE parameters if enabled
        if (shouldUsePKCE && codeChallenge) {
            params.append('code_challenge', codeChallenge);
            params.append('code_challenge_method', 'S256');
        }

        return `${config.authorizationUrl}?${params.toString()}`;
    }

    /**
     * Exchange authorization code for tokens
     * @param {string} providerId - Provider ID
     * @param {string} code - Authorization code
     * @param {string} redirectUri - Redirect URI used in authorization
     * @returns {object} Token response
     */
    async exchangeCodeForTokens(providerId, code, redirectUri, codeVerifier = null) {
        const config = await this.getProviderConfig(providerId);

        try {
            // For Apple, generate client_secret as a JWT
            let clientSecret = config.clientSecret;
            if (config.provider.providerType === 'apple') {
                // Apple requires client_secret as a JWT signed with private key
                const teamId = process.env.APPLE_TEAM_ID;
                const keyId = process.env.APPLE_KEY_ID;
                const privateKey = process.env.APPLE_PRIVATE_KEY;

                if (!teamId || !keyId || !privateKey) {
                    throw CustomException('Apple Sign-In is not configured. Missing APPLE_TEAM_ID, APPLE_KEY_ID, or APPLE_PRIVATE_KEY', 500);
                }

                clientSecret = generateAppleClientSecret(teamId, config.clientId, keyId, privateKey);
            }

            // Build request parameters
            const params = new URLSearchParams({
                client_id: config.clientId,
                client_secret: clientSecret,
                code,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            });

            // Add PKCE code_verifier if provided
            if (codeVerifier) {
                params.append('code_verifier', codeVerifier);

                logger.info('Including PKCE code_verifier in token exchange', {
                    provider: config.provider.name,
                    codeVerifierLength: codeVerifier.length
                });
            }

            // Build headers
            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded'
            };

            // GitHub requires Accept: application/json header for token response
            if (config.provider.providerType === 'github') {
                headers['Accept'] = 'application/json';
            }

            const response = await axios.post(config.tokenUrl, params.toString(), {
                headers
            });

            return response.data;
        } catch (error) {
            logger.error('Token exchange failed', {
                provider: config.provider.name,
                error: error.response?.data || error.message,
                usedPKCE: !!codeVerifier
            });
            throw CustomException('Failed to exchange authorization code for tokens', 400);
        }
    }

    /**
     * Get user info from provider
     * @param {object} provider - Provider configuration
     * @param {string} accessToken - Access token
     * @param {string} idToken - ID token (optional, used by Apple)
     * @returns {object} User info
     */
    async getUserInfo(provider, accessToken, idToken = null) {
        // For Apple, user info is in the id_token JWT, not from userinfo endpoint
        if (provider.providerType === 'apple' && idToken) {
            const decoded = decodeAppleIdToken(idToken);
            return mapAppleUserInfo(decoded);
        }

        const config = PROVIDER_CONFIGS[provider.providerType] || {};
        const userinfoUrl = provider.userinfoUrl || config.userinfoUrl;

        try {
            const response = await axios.get(userinfoUrl, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            let userData = response.data;

            // For GitHub, fetch email separately if not provided in user profile
            if (provider.providerType === 'github' && !userData.email) {
                try {
                    const emailResponse = await axios.get('https://api.github.com/user/emails', {
                        headers: {
                            Authorization: `Bearer ${accessToken}`
                        }
                    });

                    // Find primary verified email
                    const primaryEmail = emailResponse.data.find(e => e.primary && e.verified);
                    if (primaryEmail) {
                        userData.email = primaryEmail.email;
                    } else {
                        // Fallback to first verified email
                        const verifiedEmail = emailResponse.data.find(e => e.verified);
                        if (verifiedEmail) {
                            userData.email = verifiedEmail.email;
                        }
                    }
                } catch (emailError) {
                    logger.warn('Failed to fetch GitHub user emails', {
                        error: emailError.message
                    });
                }
            }

            return this.mapUserInfo(provider.name, userData, provider.attributeMapping);
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
        } else if (providerType === 'facebook') {
            // Parse Facebook name into firstName and lastName
            const nameParts = (data.name || '').split(' ');
            const firstName = nameParts[0] || 'User';
            const lastName = nameParts.slice(1).join(' ') || 'User';

            userInfo = {
                externalId: data.id,
                email: data.email,
                firstName: firstName,
                lastName: lastName,
                displayName: data.name,
                picture: data.picture?.data?.url || null, // Facebook returns picture as nested object
                emailVerified: true // Facebook verifies emails
            };
        } else if (providerType === 'github') {
            // Parse GitHub name into firstName and lastName
            const nameParts = (data.name || data.login || '').split(' ');
            const firstName = nameParts[0] || data.login || 'User';
            const lastName = nameParts.slice(1).join(' ') || 'User';

            userInfo = {
                externalId: data.id?.toString() || data.node_id,
                email: data.email, // May be null if not public, requires separate /user/emails call
                firstName: firstName,
                lastName: lastName,
                displayName: data.name || data.login,
                picture: data.avatar_url,
                username: data.login,
                emailVerified: !!data.email // GitHub may not provide email if not public
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

        // Retrieve code_verifier if PKCE was used
        const codeVerifier = stateData.codeVerifier || null;

        if (stateData.usePKCE && !codeVerifier) {
            logger.error('PKCE was used but code_verifier not found in state', {
                provider: config.provider.name
            });
            throw CustomException('PKCE verification failed: code_verifier missing', 400);
        }

        // Exchange code for tokens using the redirect URI from state and code_verifier (if PKCE)
        const tokens = await this.exchangeCodeForTokens(
            stateData.providerId,
            code,
            stateData.redirectUri,
            codeVerifier
        );

        // Get user info
        const userInfo = await this.getUserInfo(config.provider, tokens.access_token, tokens.id_token);

        // Check if this is an env-based provider (skip SSO link operations)
        const isEnvProvider = typeof config.provider._id === 'string' && config.provider._id.startsWith('env-');

        // Find existing SSO link (skip for env-based providers)
        let ssoLink = null;
        if (!isEnvProvider) {
            ssoLink = await SsoUserLink.findByExternalId(userInfo.externalId, config.provider._id);
        }

        let user;
        let isNewUser = false;

        if (ssoLink) {
            // Existing SSO link - get user
            user = await User.findById(ssoLink.userId).setOptions({ bypassFirmFilter: true });

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
            user = await User.findOne({ email: userInfo.email.toLowerCase() }).setOptions({ bypassFirmFilter: true });

            if (user) {
                // Check if domain is allowed for auto-linking
                if (!config.provider.isEmailDomainAllowed(userInfo.email)) {
                    throw CustomException('Email domain not allowed for SSO authentication', 403);
                }

                // User exists - create SSO link (skip for env-based providers)
                if (!isEnvProvider) {
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
                } else {
                    logger.info('Skipping SSO link creation for env-based provider', {
                        provider: config.provider.name,
                        userId: user._id
                    });
                }
            } else if (config.provider.autoCreateUsers) {
                // Check if domain is allowed for auto-provisioning
                if (!config.provider.isEmailDomainAllowed(userInfo.email)) {
                    throw CustomException('Email domain not allowed for auto-provisioning', 403);
                }

                // Auto-provision new user
                isNewUser = true;
                user = await this.createUserFromSSO(userInfo, config.provider);

                // Create SSO link (skip for env-based providers)
                if (!isEnvProvider) {
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
                }
            } else {
                // User doesn't exist - return OAuth profile data for registration
                // Frontend will redirect to sign-up with pre-filled data
                logger.info('New user detected via OAuth, returning profile for registration', {
                    email: userInfo.email,
                    provider: config.provider.name
                });

                return {
                    token: null,
                    user: {
                        email: userInfo.email,
                        firstName: userInfo.firstName || 'User',
                        lastName: userInfo.lastName || 'User',
                        avatar: userInfo.picture
                    },
                    isNewUser: true,
                    returnUrl: stateData.returnUrl || '/'
                };
            }
        }

        // Only lawyers are allowed to login to the dashboard
        // Clients and other non-lawyer roles are not permitted
        if (user.role !== 'lawyer') {
            logger.warn('Non-lawyer SSO login attempt blocked', {
                userId: user._id,
                email: user.email,
                role: user.role,
                provider: config.provider.name,
                ipAddress
            });

            throw CustomException('هذه اللوحة مخصصة للمحامين فقط - This dashboard is for lawyers only', 403);
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

        // Build user data matching normal login response
        const userData = {
            id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isSeller: user.isSeller || false,
            isSoloLawyer: user.isSoloLawyer || false,
            lawyerWorkMode: user.lawyerWorkMode,
            lawyerMode: user.lawyerMode,
            firmId: user.firmId || null,
            firmRole: user.firmRole || null,
            firmStatus: user.firmStatus || null,
            image: user.image,
            phone: user.phone,
            country: user.country,
            timezone: user.timezone
        };

        // If user has a firm, get firm details (like normal login does)
        if (user.firmId) {
            try {
                const firm = await Firm.findById(user.firmId)
                    .select('name nameEnglish licenseNumber status members subscription');

                if (firm) {
                    userData.firm = {
                        id: firm._id,
                        name: firm.name,
                        nameEnglish: firm.nameEnglish,
                        status: firm.status
                    };

                    // Get user's permissions from firm members
                    const member = firm.members?.find(m => m.userId?.toString() === user._id.toString());
                    if (member) {
                        userData.firmPermissions = member.permissions || {};
                    }
                }
            } catch (firmError) {
                logger.warn('Failed to fetch firm details for OAuth login', {
                    userId: user._id,
                    firmId: user.firmId,
                    error: firmError.message
                });
            }
        }

        return {
            token,
            user: userData,
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

        // For this legal practice management app, SSO users should always be lawyers
        // unless they're joining a specific firm with a different role
        const role = provider.firmId ? (provider.defaultRole || 'lawyer') : 'lawyer';
        const isSoloLawyer = !provider.firmId; // Solo lawyer if not joining a firm

        const userData = {
            username,
            email: userInfo.email.toLowerCase(),
            password: hashedPassword,
            firstName: userInfo.firstName || 'User',
            lastName: userInfo.lastName || 'User',
            phone: '', // Will be filled by user later
            role: role,
            isSeller: role === 'lawyer',
            isSoloLawyer: isSoloLawyer,
            lawyerWorkMode: isSoloLawyer ? 'solo' : null,
            country: 'Saudi Arabia',
            image: userInfo.picture,

            // Mark as SSO user
            isSSOUser: true,
            ssoProvider: provider.name,

            // Firm association
            firmId: provider.firmId,
            firmRole: provider.firmId ? (provider.defaultRole || 'lawyer') : null,
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
        // NOTE: Bypass firmIsolation filter - OAuth linking works for solo lawyers without firmId
        const user = await User.findById(userId).setOptions({ bypassFirmFilter: true });
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
        const userInfo = await this.getUserInfo(config.provider, tokens.access_token, tokens.id_token);

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
            await User.findOneAndUpdate(
                { _id: userId, firmId: user.firmId },
                {
                    isSSOUser: true,
                    ssoProvider: config.provider.providerType
                }
            );
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
        // NOTE: Bypass firmIsolation filter - OAuth unlinking works for solo lawyers without firmId
        const user = await User.findById(userId).select('password email firmId').setOptions({ bypassFirmFilter: true });
        if (!user) {
            throw CustomException('User not found', 404);
        }

        // Check if user has a password (don't allow unlinking if no password)
        if (!user.password) {
            throw CustomException('Cannot unlink SSO: no password set. Please set a password first.', 400);
        }

        // Find the link
        let link;
        if (['google', 'microsoft', 'facebook', 'okta', 'auth0', 'custom', 'apple', 'twitter', 'linkedin', 'github'].includes(providerIdOrType)) {
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
            await User.findOneAndUpdate(
                { _id: userId, firmId: user.firmId },
                {
                    isSSOUser: false,
                    ssoProvider: null
                }
            );
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
