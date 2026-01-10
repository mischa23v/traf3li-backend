const samlService = require('../services/saml.service');
const { Firm, User } = require('../models');
const { CustomException } = require('../utils');
const jwt = require('jsonwebtoken');
const auditLogService = require('../services/auditLog.service');
const { getCookieConfig, getHttpOnlyRefreshCookieConfig, REFRESH_TOKEN_COOKIE_NAME } = require('../utils/cookieConfig');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');
const { generateAccessToken } = require('../utils/generateToken');
const refreshTokenService = require('../services/refreshToken.service');

const { JWT_SECRET } = process.env;

/**
 * Validates if a URL is from an allowed domain
 * @param {string} url - URL to validate
 * @returns {boolean} Whether the URL is valid
 */
const isValidRedirectUrl = (url) => {
    if (!url || typeof url !== 'string') {
        return false;
    }

    // Allow relative URLs starting with /
    if (url.startsWith('/')) {
        // Prevent open redirects - ensure it's a single slash and path
        return /^\/[^\/\\]/.test(url);
    }

    // For absolute URLs, validate against allowed domains
    const allowedDomains = [
        process.env.DASHBOARD_URL || 'https://dashboard.traf3li.com',
        process.env.FRONTEND_URL || 'https://traf3li.com'
    ];

    try {
        const urlObj = new URL(url);
        return allowedDomains.some(domain => {
            const domainObj = new URL(domain);
            return urlObj.origin === domainObj.origin;
        });
    } catch (error) {
        return false;
    }
};

/**
 * Validates SAML SSO URL format
 * @param {string} url - URL to validate
 * @returns {boolean} Whether the URL is valid
 */
const isValidSSOUrl = (url) => {
    if (!url || typeof url !== 'string') {
        return false;
    }

    // Must be HTTPS for security
    if (!url.startsWith('https://')) {
        return false;
    }

    try {
        const urlObj = new URL(url);
        // Basic validation - must have valid hostname
        return urlObj.hostname && urlObj.hostname.includes('.');
    } catch (error) {
        return false;
    }
};

/**
 * Validates X.509 certificate format
 * @param {string} cert - Certificate to validate
 * @returns {boolean} Whether the certificate is valid
 */
const isValidCertificate = (cert) => {
    if (!cert || typeof cert !== 'string') {
        return false;
    }

    // Remove whitespace
    const trimmedCert = cert.trim();

    // Check for PEM format markers
    const hasPemMarkers = trimmedCert.includes('BEGIN CERTIFICATE') &&
                         trimmedCert.includes('END CERTIFICATE');

    // Check for base64 content (if no PEM markers, assume it's raw base64)
    const base64Regex = /^[A-Za-z0-9+/=\s\n\r-]+$/;
    const hasValidContent = base64Regex.test(trimmedCert.replace(/BEGIN CERTIFICATE|END CERTIFICATE|-/g, ''));

    return hasPemMarkers || hasValidContent;
};

/**
 * SAML Controller - Enterprise SSO Authentication
 *
 * Endpoints:
 * - GET /api/auth/saml/metadata/:firmId - Service Provider metadata
 * - GET /api/auth/saml/login/:firmId - Initiate SSO login
 * - POST /api/auth/saml/acs/:firmId - Assertion Consumer Service
 * - GET /api/auth/saml/logout/:firmId - Initiate Single Logout
 * - POST /api/auth/saml/sls/:firmId - Single Logout Service
 *
 * Admin endpoints:
 * - GET /api/auth/saml/config - Get SAML configuration
 * - PUT /api/auth/saml/config - Update SAML configuration
 * - POST /api/auth/saml/config/test - Test SAML configuration
 */

/**
 * Get Service Provider metadata XML
 * @route GET /api/auth/saml/metadata/:firmId
 */
const getSPMetadata = async (request, response) => {
    try {
        // IDOR Protection: Sanitize firmId
        const firmId = sanitizeObjectId(request.params.firmId);
        if (!firmId) {
            throw CustomException('Invalid firm ID', 400);
        }

        const metadata = await samlService.generateSPMetadata(firmId);

        response.header('Content-Type', 'application/xml');
        return response.status(200).send(metadata);
    } catch (error) {
        logger.error('Get SP metadata error:', error);
        return response.status(error.status || 500).send({
            error: true,
            message: error.message || 'Failed to generate SP metadata'
        });
    }
};

/**
 * Initiate SSO login
 * @route GET /api/auth/saml/login/:firmId
 */
const initiateLogin = async (request, response) => {
    try {
        // IDOR Protection: Sanitize firmId
        const firmId = sanitizeObjectId(request.params.firmId);
        if (!firmId) {
            throw CustomException('Invalid firm ID', 400);
        }

        // Security: Validate redirect URL against whitelist
        let relayState = request.query.RelayState || '/';
        if (!isValidRedirectUrl(relayState)) {
            relayState = '/dashboard'; // Default to safe location
        }

        // Validate firm exists and SSO is enabled
        const firm = await Firm.findById(firmId);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.enterpriseSettings?.ssoEnabled) {
            throw CustomException('SSO is not enabled for this firm', 400);
        }

        // Create SAML strategy and authenticate
        const strategy = await samlService.createSAMLStrategy(firmId);

        // Generate AuthnRequest
        strategy.authenticate(request, {
            additionalParams: {
                RelayState: relayState
            }
        });
    } catch (error) {
        logger.error('Initiate SSO login error:', error);
        return response.status(error.status || 500).send({
            error: true,
            message: error.message || 'Failed to initiate SSO login'
        });
    }
};

/**
 * Assertion Consumer Service - Handle SAML response
 * @route POST /api/auth/saml/acs/:firmId
 */
const assertionConsumerService = async (request, response) => {
    try {
        // IDOR Protection: Sanitize firmId
        const firmId = sanitizeObjectId(request.params.firmId);
        if (!firmId) {
            throw CustomException('Invalid firm ID', 400);
        }

        // Security: Validate redirect URL against whitelist
        let relayState = request.body.RelayState || '/dashboard';
        if (!isValidRedirectUrl(relayState)) {
            relayState = '/dashboard'; // Default to safe location
        }

        // Validate firm
        const firm = await Firm.findById(firmId);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.enterpriseSettings?.ssoEnabled) {
            throw CustomException('SSO is not enabled for this firm', 400);
        }

        // Create SAML strategy
        const strategy = await samlService.createSAMLStrategy(firmId);

        // Validate SAML response
        strategy.authenticate(request, async (error, user, info) => {
            if (error) {
                logger.error('SAML authentication error:', error);

                await auditLogService.log(
                    'sso_login_failed',
                    'user',
                    null,
                    firmId,
                    {
                        firmId,
                        errorMessage: error.message,
                        ipAddress: request.ip,
                        userAgent: request.headers['user-agent'],
                        severity: 'high'
                    }
                );

                // Redirect to login page with error
                const frontendUrl = process.env.DASHBOARD_URL || 'https://dashboard.traf3li.com';
                return response.redirect(`${frontendUrl}/login?error=sso_failed&message=${encodeURIComponent(error.message)}`);
            }

            if (!user) {
                logger.error('SAML authentication failed: No user returned');

                const frontendUrl = process.env.DASHBOARD_URL || 'https://dashboard.traf3li.com';
                return response.redirect(`${frontendUrl}/login?error=sso_failed&message=Authentication failed`);
            }

            try {
                // Update last SSO login
                user.lastSSOLogin = new Date();
                user.lastLogin = new Date();

                // ═══════════════════════════════════════════════════════════════
                // AUTO-VERIFY EMAIL ON SAML SSO LOGIN (Gold Standard)
                // ═══════════════════════════════════════════════════════════════
                // SAML IdP has verified the email address. Auto-verify in our system.
                // ═══════════════════════════════════════════════════════════════
                if (!user.isEmailVerified) {
                    user.isEmailVerified = true;
                    user.emailVerifiedAt = new Date();
                    logger.info('Email auto-verified via SAML SSO login', {
                        userId: user._id,
                        email: user.email
                    });
                }

                await user.save();

                // Generate JWT access token using proper utility (15-min expiry, custom claims)
                const token = await generateAccessToken(user, { firm });

                // Generate refresh token
                const deviceInfo = {
                    userAgent: request.headers['user-agent'] || 'SAML SSO',
                    ip: request.ip || 'unknown'
                };
                const refreshToken = await refreshTokenService.createRefreshToken(
                    user._id.toString(),
                    deviceInfo,
                    user.firmId
                );

                // Get cookie config
                const cookieConfig = getCookieConfig(request);
                const refreshCookieConfig = getHttpOnlyRefreshCookieConfig(request);

                // Build user data with firm information
                const userData = await buildUserData(user);

                // Log successful SSO login
                await auditLogService.log(
                    'sso_login_success',
                    'user',
                    user._id,
                    firmId,
                    {
                        userId: user._id,
                        userEmail: user.email,
                        userRole: user.role,
                        userName: `${user.firstName} ${user.lastName}`,
                        firmId,
                        ssoProvider: firm.enterpriseSettings.ssoProvider,
                        ipAddress: request.ip,
                        userAgent: request.headers['user-agent'],
                        severity: 'low',
                        createdViaJIT: user.createdViaSSO
                    }
                );

                // Set cookies and redirect to frontend
                response.cookie('accessToken', token, cookieConfig);
                response.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, refreshCookieConfig);

                const frontendUrl = process.env.DASHBOARD_URL || 'https://dashboard.traf3li.com';
                return response.redirect(`${frontendUrl}${relayState}?sso=success`);

            } catch (postAuthError) {
                logger.error('Post-authentication error:', postAuthError);

                const frontendUrl = process.env.DASHBOARD_URL || 'https://dashboard.traf3li.com';
                return response.redirect(`${frontendUrl}/login?error=sso_failed&message=Post-authentication error`);
            }
        });

    } catch (error) {
        logger.error('ACS error:', error);
        const frontendUrl = process.env.DASHBOARD_URL || 'https://dashboard.traf3li.com';
        return response.redirect(`${frontendUrl}/login?error=sso_failed&message=${encodeURIComponent(error.message)}`);
    }
};

/**
 * Initiate Single Logout
 * @route GET /api/auth/saml/logout/:firmId
 */
const initiateSingleLogout = async (request, response) => {
    try {
        // IDOR Protection: Sanitize firmId
        const firmId = sanitizeObjectId(request.params.firmId);
        if (!firmId) {
            throw CustomException('Invalid firm ID', 400);
        }

        // Validate firm
        const firm = await Firm.findById(firmId);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        // Create SAML strategy
        const strategy = await samlService.createSAMLStrategy(firmId);

        // Get user from token
        const { accessToken } = request.cookies;
        let user = null;

        if (accessToken) {
            try {
                const verification = jwt.verify(accessToken, JWT_SECRET);
                user = await User.findById(verification._id);
            } catch (error) {
                logger.error('Token verification error:', error);
            }
        }

        // Generate logout request
        if (user) {
            strategy.logout(request, (error, requestUrl) => {
                if (error) {
                    logger.error('Logout error:', error);
                    return response.status(500).send({
                        error: true,
                        message: 'Failed to initiate logout'
                    });
                }

                // Clear cookie
                const cookieConfig = getCookieConfig(request);
                response.clearCookie('accessToken', cookieConfig);

                // Redirect to IdP logout
                return response.redirect(requestUrl);
            });
        } else {
            // No active session, just clear cookie and redirect
            const cookieConfig = getCookieConfig(request);
            response.clearCookie('accessToken', cookieConfig);

            const frontendUrl = process.env.DASHBOARD_URL || 'https://dashboard.traf3li.com';
            return response.redirect(`${frontendUrl}/login?logout=success`);
        }

    } catch (error) {
        logger.error('Initiate logout error:', error);
        return response.status(error.status || 500).send({
            error: true,
            message: error.message || 'Failed to initiate logout'
        });
    }
};

/**
 * Single Logout Service - Handle logout response from IdP
 * @route POST /api/auth/saml/sls/:firmId
 */
const singleLogoutService = async (request, response) => {
    try {
        // IDOR Protection: Sanitize firmId
        const firmId = sanitizeObjectId(request.params.firmId);
        if (!firmId) {
            throw CustomException('Invalid firm ID', 400);
        }

        // Create SAML strategy
        const strategy = await samlService.createSAMLStrategy(firmId);

        // Process logout response
        strategy.logout(request, (error) => {
            if (error) {
                logger.error('SLS error:', error);
                return response.status(500).send({
                    error: true,
                    message: 'Logout failed'
                });
            }

            // Clear cookie
            const cookieConfig = getCookieConfig(request);
            response.clearCookie('accessToken', cookieConfig);

            // Redirect to login page
            const frontendUrl = process.env.DASHBOARD_URL || 'https://dashboard.traf3li.com';
            return response.redirect(`${frontendUrl}/login?logout=success`);
        });

    } catch (error) {
        logger.error('SLS error:', error);
        const frontendUrl = process.env.DASHBOARD_URL || 'https://dashboard.traf3li.com';
        return response.redirect(`${frontendUrl}/login?error=logout_failed`);
    }
};

/**
 * Get SAML configuration for current firm (Admin only)
 * @route GET /api/auth/saml/config
 */
const getSAMLConfig = async (request, response) => {
    try {
        // Get user's firm
        const user = await User.findById(request.userID);
        if (!user || !user.firmId) {
            throw CustomException('User not associated with a firm', 400);
        }

        // IDOR Protection: Sanitize firmId
        const firmId = sanitizeObjectId(user.firmId);
        if (!firmId) {
            throw CustomException('Invalid firm ID', 400);
        }

        // Check if user is admin or owner
        const firm = await Firm.findById(firmId);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const member = firm.members.find(m => m.userId.toString() === user._id.toString());
        if (!member || !['owner', 'admin'].includes(member.role)) {
            throw CustomException('Insufficient permissions. Only firm owners and admins can manage SSO.', 403);
        }

        // Get SAML configuration (without sensitive data)
        const config = {
            ssoEnabled: firm.enterpriseSettings?.ssoEnabled || false,
            ssoProvider: firm.enterpriseSettings?.ssoProvider || null,
            ssoEntityId: firm.enterpriseSettings?.ssoEntityId || null,
            ssoSsoUrl: firm.enterpriseSettings?.ssoSsoUrl || null,
            ssoMetadataUrl: firm.enterpriseSettings?.ssoMetadataUrl || null,
            hasCertificate: !!firm.enterpriseSettings?.ssoCertificate,

            // Service Provider URLs
            spEntityId: `${process.env.BACKEND_URL || 'https://api.traf3li.com'}/api/auth/saml/${firm._id}`,
            spAcsUrl: `${process.env.BACKEND_URL || 'https://api.traf3li.com'}/api/auth/saml/acs/${firm._id}`,
            spSloUrl: `${process.env.BACKEND_URL || 'https://api.traf3li.com'}/api/auth/saml/sls/${firm._id}`,
            spMetadataUrl: `${process.env.BACKEND_URL || 'https://api.traf3li.com'}/api/auth/saml/metadata/${firm._id}`
        };

        return response.status(200).send({
            error: false,
            message: 'Success',
            config
        });

    } catch (error) {
        logger.error('Get SAML config error:', error);
        return response.status(error.status || 500).send({
            error: true,
            message: error.message || 'Failed to get SAML configuration'
        });
    }
};

/**
 * Update SAML configuration (Admin only)
 * @route PUT /api/auth/saml/config
 */
const updateSAMLConfig = async (request, response) => {
    try {
        // Mass Assignment Protection: Define allowed fields
        const allowedFields = [
            'ssoEnabled',
            'ssoProvider',
            'ssoEntityId',
            'ssoSsoUrl',
            'ssoCertificate',
            'ssoMetadataUrl'
        ];
        const sanitizedData = pickAllowedFields(request.body, allowedFields);

        // Get user's firm
        const user = await User.findById(request.userID);
        if (!user || !user.firmId) {
            throw CustomException('User not associated with a firm', 400);
        }

        // IDOR Protection: Sanitize firmId
        const firmId = sanitizeObjectId(user.firmId);
        if (!firmId) {
            throw CustomException('Invalid firm ID', 400);
        }

        // Check if user is admin or owner
        const firm = await Firm.findById(firmId);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const member = firm.members.find(m => m.userId.toString() === user._id.toString());
        if (!member || !['owner', 'admin'].includes(member.role)) {
            throw CustomException('Insufficient permissions. Only firm owners and admins can manage SSO.', 403);
        }

        // Input Validation: Validate SAML-specific fields
        if (sanitizedData.ssoSsoUrl && !isValidSSOUrl(sanitizedData.ssoSsoUrl)) {
            throw CustomException('Invalid SSO URL. Must be a valid HTTPS URL.', 400);
        }

        if (sanitizedData.ssoMetadataUrl && !isValidSSOUrl(sanitizedData.ssoMetadataUrl)) {
            throw CustomException('Invalid metadata URL. Must be a valid HTTPS URL.', 400);
        }

        if (sanitizedData.ssoCertificate && !isValidCertificate(sanitizedData.ssoCertificate)) {
            throw CustomException('Invalid X.509 certificate format.', 400);
        }

        if (sanitizedData.ssoProvider && typeof sanitizedData.ssoProvider !== 'string') {
            throw CustomException('Invalid SSO provider.', 400);
        }

        if (sanitizedData.ssoEntityId && typeof sanitizedData.ssoEntityId !== 'string') {
            throw CustomException('Invalid entity ID.', 400);
        }

        // Update SAML configuration
        const updatedFirm = await samlService.updateSAMLConfig(firmId, sanitizedData);

        // Log configuration change
        await auditLogService.log(
            'sso_config_updated',
            'firm',
            user._id,
            firmId,
            {
                userId: user._id,
                userEmail: user.email,
                userName: `${user.firstName} ${user.lastName}`,
                firmId: firmId,
                ssoProvider: sanitizedData.ssoProvider,
                ssoEnabled: sanitizedData.ssoEnabled,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent'],
                severity: 'medium'
            }
        );

        return response.status(200).send({
            error: false,
            message: 'SAML configuration updated successfully',
            config: {
                ssoEnabled: updatedFirm.enterpriseSettings.ssoEnabled,
                ssoProvider: updatedFirm.enterpriseSettings.ssoProvider,
                ssoEntityId: updatedFirm.enterpriseSettings.ssoEntityId,
                ssoSsoUrl: updatedFirm.enterpriseSettings.ssoSsoUrl,
                ssoMetadataUrl: updatedFirm.enterpriseSettings.ssoMetadataUrl
            }
        });

    } catch (error) {
        logger.error('Update SAML config error:', error);
        return response.status(error.status || 500).send({
            error: true,
            message: error.message || 'Failed to update SAML configuration'
        });
    }
};

/**
 * Test SAML configuration (Admin only)
 * @route POST /api/auth/saml/config/test
 */
const testSAMLConfig = async (request, response) => {
    try {
        // Get user's firm
        const user = await User.findById(request.userID);
        if (!user || !user.firmId) {
            throw CustomException('User not associated with a firm', 400);
        }

        // IDOR Protection: Sanitize firmId
        const firmId = sanitizeObjectId(user.firmId);
        if (!firmId) {
            throw CustomException('Invalid firm ID', 400);
        }

        // Check if user is admin or owner
        const firm = await Firm.findById(firmId);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const member = firm.members.find(m => m.userId.toString() === user._id.toString());
        if (!member || !['owner', 'admin'].includes(member.role)) {
            throw CustomException('Insufficient permissions', 403);
        }

        // Validate SAML configuration
        const config = await samlService.getFirmSAMLConfig(firmId);
        const validation = samlService.validateSAMLConfig(config);

        if (!validation.valid) {
            return response.status(400).send({
                error: true,
                message: 'Invalid SAML configuration',
                errors: validation.errors
            });
        }

        // Try to create SAML strategy (this validates the configuration)
        try {
            await samlService.createSAMLStrategy(firmId);

            return response.status(200).send({
                error: false,
                message: 'SAML configuration is valid',
                valid: true
            });
        } catch (strategyError) {
            return response.status(400).send({
                error: true,
                message: 'Failed to create SAML strategy',
                details: strategyError.message,
                valid: false
            });
        }

    } catch (error) {
        logger.error('Test SAML config error:', error);
        return response.status(error.status || 500).send({
            error: true,
            message: error.message || 'Failed to test SAML configuration'
        });
    }
};

/**
 * Helper function to build complete user data with firm information
 * @param {object} user - User object
 * @returns {object} Complete user data
 */
async function buildUserData(user) {
    const userData = {
        ...user.toObject(),
        isSoloLawyer: user.isSoloLawyer || false,
        lawyerWorkMode: user.lawyerWorkMode || null
    };

    // If user is a lawyer with a firm, get firm information
    if ((user.role === 'lawyer' || user.isSeller) && user.firmId) {
        try {
            const firm = await Firm.findById(user.firmId)
                .select('name nameEnglish licenseNumber status members subscription');

            if (firm) {
                const member = firm.members.find(
                    m => m.userId.toString() === user._id.toString()
                );

                userData.firm = {
                    id: firm._id,
                    name: firm.name,
                    nameEn: firm.nameEnglish,
                    status: firm.status
                };
                userData.firmRole = member?.role || user.firmRole;
                userData.firmStatus = member?.status || user.firmStatus;

                // Include permissions
                if (member) {
                    const { getDefaultPermissions } = require('../config/permissions.config');
                    userData.permissions = member.permissions || getDefaultPermissions(member.role);
                }

                // Tenant context
                userData.tenant = {
                    id: firm._id,
                    name: firm.name,
                    nameEn: firm.nameEnglish,
                    status: firm.status,
                    subscription: {
                        plan: firm.subscription?.plan || 'free',
                        status: firm.subscription?.status || 'trial'
                    }
                };
            }
        } catch (firmError) {
            logger.info('Error fetching firm:', firmError.message);
        }
    }

    return userData;
}

module.exports = {
    getSPMetadata,
    initiateLogin,
    assertionConsumerService,
    initiateSingleLogout,
    singleLogoutService,
    getSAMLConfig,
    updateSAMLConfig,
    testSAMLConfig
};
