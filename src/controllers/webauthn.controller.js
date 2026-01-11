/**
 * WebAuthn Controller
 *
 * Handles WebAuthn/FIDO2 authentication endpoints for hardware security keys
 * and biometric authentication.
 *
 * Endpoints:
 * - POST /api/auth/webauthn/register/start - Start registration flow
 * - POST /api/auth/webauthn/register/finish - Complete registration
 * - POST /api/auth/webauthn/authenticate/start - Start authentication flow
 * - POST /api/auth/webauthn/authenticate/finish - Complete authentication
 * - GET /api/auth/webauthn/credentials - List user's registered keys
 * - DELETE /api/auth/webauthn/credentials/:id - Remove a key
 */

const asyncHandler = require('express-async-handler');
const webauthnService = require('../services/webauthn.service');
const auditLogService = require('../services/auditLog.service');
const { CustomException } = require('../utils');
const jwt = require('jsonwebtoken');
const { User, Firm } = require('../models');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const { getCookieConfig, getHttpOnlyRefreshCookieConfig, REFRESH_TOKEN_COOKIE_NAME } = require('../utils/cookieConfig');
const crypto = require('crypto');
const { generateAccessToken } = require('../utils/generateToken');
const refreshTokenService = require('../services/refreshToken.service');
const logger = require('../utils/logger');

const { JWT_SECRET, WEBAUTHN_ORIGIN } = process.env;

/**
 * Verify the origin matches expected domain for WebAuthn
 */
const verifyOrigin = (req) => {
    const origin = req.headers.origin || req.headers.referer;

    if (!origin) {
        throw new CustomException('Origin header is required for WebAuthn operations', 400);
    }

    const expectedOrigin = WEBAUTHN_ORIGIN || `${req.protocol}://${req.get('host')}`;

    try {
        const originUrl = new URL(origin);
        const expectedUrl = new URL(expectedOrigin);

        if (originUrl.origin !== expectedUrl.origin) {
            throw new CustomException('Invalid origin for WebAuthn operation', 403);
        }
    } catch (error) {
        if (error instanceof CustomException) throw error;
        throw new CustomException('Invalid origin format', 400);
    }
};

/**
 * Timing-safe string comparison
 */
const timingSafeEqual = (a, b) => {
    if (typeof a !== 'string' || typeof b !== 'string') {
        return false;
    }

    if (a.length !== b.length) {
        return false;
    }

    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);

    return crypto.timingSafeEqual(bufferA, bufferB);
};

/**
 * Start WebAuthn registration flow
 * POST /api/auth/webauthn/register/start
 *
 * Authenticated endpoint - user must be logged in to register a new credential
 */
const startRegistration = asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
        throw new CustomException('Authentication required', 401);
    }

    // Verify origin for WebAuthn security
    verifyOrigin(req);

    // Generate registration options
    const options = await webauthnService.generateRegistrationOptions(user);

    // Log audit event
    await auditLogService.log({
        action: 'webauthn_registration_started',
        userId: user._id,
        firmId: user.firmId,
        details: {
            rpId: options.rp?.id,
            userVerification: options.authenticatorSelection?.userVerification
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
    });

    res.status(200).json({
        success: true,
        data: options
    });
});

/**
 * Complete WebAuthn registration
 * POST /api/auth/webauthn/register/finish
 *
 * Request body: { credential, credentialName }
 */
const finishRegistration = asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
        throw new CustomException('Authentication required', 401);
    }

    // Verify origin for WebAuthn security
    verifyOrigin(req);

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['credential', 'credentialName'];
    const sanitizedBody = pickAllowedFields(req.body, allowedFields);
    const { credential, credentialName } = sanitizedBody;

    // Input validation - credential data
    if (!credential) {
        throw new CustomException('Credential data is required', 400);
    }

    if (typeof credential !== 'object') {
        throw new CustomException('Invalid credential format', 400);
    }

    // Validate required credential fields
    if (!credential.id || !credential.rawId || !credential.response || !credential.type) {
        throw new CustomException('Incomplete credential data', 400);
    }

    if (credential.type !== 'public-key') {
        throw new CustomException('Invalid credential type', 400);
    }

    // Validate credential response
    if (!credential.response.attestationObject || !credential.response.clientDataJSON) {
        throw new CustomException('Invalid credential response', 400);
    }

    // Validate credentialName if provided
    if (credentialName !== undefined && credentialName !== null) {
        if (typeof credentialName !== 'string') {
            throw new CustomException('Credential name must be a string', 400);
        }
        if (credentialName.trim().length > 100) {
            throw new CustomException('Credential name must not exceed 100 characters', 400);
        }
    }

    // Verify and store the credential
    const verifiedCredential = await webauthnService.verifyRegistration(
        credential,
        user._id,
        credentialName
    );

    // Log audit event
    await auditLogService.log({
        action: 'webauthn_registration_completed',
        userId: user._id,
        firmId: user.firmId,
        details: {
            credentialId: verifiedCredential.id,
            credentialName: verifiedCredential.name,
            deviceType: verifiedCredential.deviceType,
            transports: verifiedCredential.transports
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
    });

    res.status(201).json({
        success: true,
        message: 'Security key registered successfully',
        data: verifiedCredential
    });
});

/**
 * Start WebAuthn authentication flow
 * POST /api/auth/webauthn/authenticate/start
 *
 * Request body: { email or username }
 * Public endpoint - used for login
 */
const startAuthentication = asyncHandler(async (req, res) => {
    // Verify origin for WebAuthn security
    verifyOrigin(req);

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['email', 'username'];
    const sanitizedBody = pickAllowedFields(req.body, allowedFields);
    const { email, username } = sanitizedBody;

    // Input validation
    if (!email && !username) {
        throw new CustomException('Email or username is required', 400);
    }

    // Validate email format if provided
    if (email && typeof email !== 'string') {
        throw new CustomException('Invalid email format', 400);
    }

    // Validate username format if provided
    if (username && typeof username !== 'string') {
        throw new CustomException('Invalid username format', 400);
    }

    // Additional validation for length
    if (email && email.length > 255) {
        throw new CustomException('Email too long', 400);
    }

    if (username && username.length > 100) {
        throw new CustomException('Username too long', 400);
    }

    // Find user by email or username
    // SECURITY: bypassFirmFilter needed - authentication must find user without knowing firmId
    const user = await User.findOne({
        $or: [
            { email: email?.toLowerCase() },
            { username: username?.toLowerCase() }
        ]
    }).setOptions({ bypassFirmFilter: true });

    if (!user) {
        // Return generic error to prevent user enumeration
        throw new CustomException('Invalid credentials', 401);
    }

    // Generate authentication options
    const options = await webauthnService.generateAuthenticationOptions(user);

    // Log audit event
    await auditLogService.log({
        action: 'webauthn_authentication_started',
        userId: user._id,
        firmId: user.firmId,
        details: {
            rpId: options.rpId,
            allowCredentialsCount: options.allowCredentials?.length || 0
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
    });

    res.status(200).json({
        success: true,
        data: {
            options,
            userId: user._id // Client needs this to complete authentication
        }
    });
});

/**
 * Complete WebAuthn authentication
 * POST /api/auth/webauthn/authenticate/finish
 *
 * Request body: { credential, userId }
 */
const finishAuthentication = asyncHandler(async (req, res) => {
    // Verify origin for WebAuthn security
    verifyOrigin(req);

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['credential', 'userId'];
    const sanitizedBody = pickAllowedFields(req.body, allowedFields);
    const { credential, userId } = sanitizedBody;

    // Input validation
    if (!credential || !userId) {
        throw new CustomException('Credential and userId are required', 400);
    }

    // IDOR Protection - sanitize userId
    const sanitizedUserId = sanitizeObjectId(userId, 'User ID');

    // Validate credential structure
    if (typeof credential !== 'object') {
        throw new CustomException('Invalid credential format', 400);
    }

    // Validate required credential fields for authentication
    if (!credential.id || !credential.rawId || !credential.response || !credential.type) {
        throw new CustomException('Incomplete credential data', 400);
    }

    if (credential.type !== 'public-key') {
        throw new CustomException('Invalid credential type', 400);
    }

    // Validate authentication response
    if (!credential.response.authenticatorData || !credential.response.clientDataJSON || !credential.response.signature) {
        throw new CustomException('Invalid authentication response', 400);
    }

    // Verify the authentication
    const verification = await webauthnService.verifyAuthentication(credential, sanitizedUserId);

    if (!verification.verified) {
        throw new CustomException('Authentication failed', 401);
    }

    // Get user details
    const user = await User.findById(sanitizedUserId).select('-password');

    if (!user) {
        throw new CustomException('User not found', 404);
    }

    // Check if account is locked or inactive
    if (user.firmStatus === 'suspended') {
        throw new CustomException('Account is suspended', 403);
    }

    if (user.dataAnonymized) {
        throw new CustomException('Account has been anonymized', 403);
    }

    // ═══════════════════════════════════════════════════════════════
    // EMAIL VERIFICATION CHECK (Gold Standard)
    // ═══════════════════════════════════════════════════════════════
    // WebAuthn is device-based and does NOT prove email ownership.
    // Enforce email verification for non-legacy users.
    // ═══════════════════════════════════════════════════════════════
    if (!user.isEmailVerified) {
        const enforcementDateStr = process.env.EMAIL_VERIFICATION_ENFORCEMENT_DATE || '2025-02-01';
        const enforcementDate = new Date(enforcementDateStr);
        const userCreatedAt = user.createdAt ? new Date(user.createdAt) : new Date(0);
        const isLegacyUser = isNaN(enforcementDate.getTime()) || userCreatedAt < enforcementDate;

        if (!isLegacyUser) {
            logger.warn('WebAuthn login blocked: email not verified', {
                userId: user._id,
                email: user.email
            });

            // Mask email for security
            let maskedEmail = '***@***.***';
            if (user.email && user.email.includes('@')) {
                const [localPart, domain] = user.email.split('@');
                const maskedLocal = localPart.length > 2
                    ? localPart[0] + '***' + localPart[localPart.length - 1]
                    : localPart[0] + '***';
                maskedEmail = `${maskedLocal}@${domain}`;
            }

            return res.status(403).json({
                success: false,
                message: 'Please verify your email to continue',
                messageAr: 'يرجى تفعيل بريدك الإلكتروني للمتابعة',
                code: 'EMAIL_NOT_VERIFIED',
                email: maskedEmail
            });
        }
    }

    // Get firm context for custom claims (if user belongs to a firm)
    let firm = null;
    if (user.firmId) {
        try {
            firm = await Firm.findById(user.firmId)
                .select('name nameEnglish licenseNumber status members subscription');
        } catch (firmErr) {
            logger.warn('Failed to fetch firm for WebAuthn token generation', { error: firmErr.message });
        }
    }

    // Generate JWT access token using proper utility (15-min expiry, custom claims)
    const token = await generateAccessToken(user, { firm });

    // Generate refresh token
    const deviceInfo = {
        userAgent: req.headers['user-agent'] || 'WebAuthn',
        ip: req.ip || 'unknown'
    };
    const refreshToken = await refreshTokenService.createRefreshToken(
        user._id.toString(),
        deviceInfo,
        user.firmId
    );

    // Log audit event
    await auditLogService.log({
        action: 'webauthn_authentication_completed',
        userId: user._id,
        firmId: user.firmId,
        details: {
            credentialId: verification.credential.id,
            credentialName: verification.credential.name,
            deviceType: verification.credential.deviceType
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
    });

    // Set HTTP-only cookies for JWT using secure centralized configuration
    const accessCookieConfig = getCookieConfig(req, 'access');
    const refreshCookieConfig = getHttpOnlyRefreshCookieConfig(req);
    res.cookie('accessToken', token, accessCookieConfig);
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, refreshCookieConfig);

    // BFF Pattern: Tokens in httpOnly cookies ONLY - never in response body
    res.status(200).json({
        success: true,
        message: 'Authentication successful',
        // Token metadata only (NOT the actual tokens)
        token_type: 'Bearer',
        expires_in: 900, // 15 minutes in seconds
        // SECURITY: access_token and refresh_token are httpOnly cookies ONLY
        // Frontend uses credentials: 'include' to auto-attach cookies
        data: {
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                firmId: user.firmId,
                firmRole: user.firmRole
            },
            credential: verification.credential
        }
    });
});

/**
 * Get user's registered credentials
 * GET /api/auth/webauthn/credentials
 *
 * Authenticated endpoint
 */
const getCredentials = asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
        throw new CustomException('Authentication required', 401);
    }

    const credentials = await webauthnService.getUserCredentials(user._id);

    res.status(200).json({
        success: true,
        data: credentials
    });
});

/**
 * Delete a credential
 * DELETE /api/auth/webauthn/credentials/:id
 *
 * Authenticated endpoint
 */
const deleteCredential = asyncHandler(async (req, res) => {
    const user = req.user;
    const { id } = req.params;

    if (!user) {
        throw new CustomException('Authentication required', 401);
    }

    if (!id) {
        throw new CustomException('Credential ID is required', 400);
    }

    // IDOR Protection - sanitize credential ID
    const sanitizedCredentialId = sanitizeObjectId(id, 'Credential ID');

    // Verify ownership is handled in the service layer, but sanitize first
    await webauthnService.deleteCredential(sanitizedCredentialId, user._id);

    // Log audit event
    await auditLogService.log({
        action: 'webauthn_credential_deleted',
        userId: user._id,
        firmId: user.firmId,
        details: {
            credentialId: sanitizedCredentialId
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
    });

    res.status(200).json({
        success: true,
        message: 'Credential deleted successfully'
    });
});

/**
 * Update credential name
 * PATCH /api/auth/webauthn/credentials/:id
 *
 * Authenticated endpoint
 * Request body: { name }
 */
const updateCredentialName = asyncHandler(async (req, res) => {
    const user = req.user;
    const { id } = req.params;

    if (!user) {
        throw new CustomException('Authentication required', 401);
    }

    if (!id) {
        throw new CustomException('Credential ID is required', 400);
    }

    // IDOR Protection - sanitize credential ID
    const sanitizedCredentialId = sanitizeObjectId(id, 'Credential ID');

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['name'];
    const sanitizedBody = pickAllowedFields(req.body, allowedFields);
    const { name } = sanitizedBody;

    // Input validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new CustomException('Credential name is required', 400);
    }

    if (name.trim().length > 100) {
        throw new CustomException('Credential name must not exceed 100 characters', 400);
    }

    const WebAuthnCredential = require('../models/webauthnCredential.model');

    // IDOR Protection - Use findOne with userId instead of findById
    const credential = await WebAuthnCredential.findOne({
        _id: sanitizedCredentialId,
        userId: user._id
    });

    if (!credential) {
        throw new CustomException('Credential not found', 404);
    }

    if (credential.isRevoked) {
        throw new CustomException('Cannot update a revoked credential', 400);
    }

    const oldName = credential.name;
    credential.name = name.trim();
    await credential.save();

    // Log audit event
    await auditLogService.log({
        action: 'webauthn_credential_updated',
        userId: user._id,
        firmId: user.firmId,
        details: {
            credentialId: sanitizedCredentialId,
            oldName,
            newName: credential.name
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
    });

    res.status(200).json({
        success: true,
        message: 'Credential name updated successfully',
        data: {
            id: credential._id,
            name: credential.name
        }
    });
});

module.exports = {
    startRegistration,
    finishRegistration,
    startAuthentication,
    finishAuthentication,
    getCredentials,
    deleteCredential,
    updateCredentialName
};
