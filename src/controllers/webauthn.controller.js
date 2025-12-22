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
const { User } = require('../models');

const { JWT_SECRET } = process.env;

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
    const { credential, credentialName } = req.body;

    if (!user) {
        throw new CustomException('Authentication required', 401);
    }

    if (!credential) {
        throw new CustomException('Credential data is required', 400);
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
    const { email, username } = req.body;

    if (!email && !username) {
        throw new CustomException('Email or username is required', 400);
    }

    // Find user by email or username
    const user = await User.findOne({
        $or: [
            { email: email?.toLowerCase() },
            { username: username?.toLowerCase() }
        ]
    });

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
    const { credential, userId } = req.body;

    if (!credential || !userId) {
        throw new CustomException('Credential and userId are required', 400);
    }

    // Verify the authentication
    const verification = await webauthnService.verifyAuthentication(credential, userId);

    if (!verification.verified) {
        throw new CustomException('Authentication failed', 401);
    }

    // Get user details
    const user = await User.findById(userId).select('-password');

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

    // Generate JWT token
    const token = jwt.sign(
        {
            userId: user._id,
            email: user.email,
            role: user.role,
            firmId: user.firmId,
            firmRole: user.firmRole
        },
        JWT_SECRET,
        { expiresIn: '7d' }
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

    // Set HTTP-only cookie for JWT
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
        success: true,
        message: 'Authentication successful',
        data: {
            token,
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

    await webauthnService.deleteCredential(id, user._id);

    // Log audit event
    await auditLogService.log({
        action: 'webauthn_credential_deleted',
        userId: user._id,
        firmId: user.firmId,
        details: {
            credentialId: id
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
    const { name } = req.body;

    if (!user) {
        throw new CustomException('Authentication required', 401);
    }

    if (!id) {
        throw new CustomException('Credential ID is required', 400);
    }

    if (!name || name.trim().length === 0) {
        throw new CustomException('Credential name is required', 400);
    }

    const WebAuthnCredential = require('../models/webauthnCredential.model');
    const credential = await WebAuthnCredential.findById(id);

    if (!credential) {
        throw new CustomException('Credential not found', 404);
    }

    // Verify the credential belongs to the user
    if (credential.userId.toString() !== user._id.toString()) {
        throw new CustomException('Unauthorized to update this credential', 403);
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
            credentialId: id,
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
