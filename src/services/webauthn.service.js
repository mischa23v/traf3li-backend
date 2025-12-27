/**
 * WebAuthn Service
 *
 * Provides WebAuthn/FIDO2 authentication services for hardware security keys
 * and biometric authentication (Touch ID, Face ID, Windows Hello, etc.).
 *
 * Uses @simplewebauthn/server for WebAuthn protocol handling.
 * Stores challenges in Redis with 5-minute TTL for security.
 * Stores credentials in MongoDB for persistence.
 */

const {
    generateRegistrationOptions: generateRegOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions: generateAuthOptions,
    verifyAuthenticationResponse
} = require('@simplewebauthn/server');
const WebAuthnCredential = require('../models/webauthnCredential.model');
const cacheService = require('./cache.service');
const { CustomException } = require('../utils');
const logger = require('../utils/logger');

// Configuration
const RP_NAME = process.env.WEBAUTHN_RP_NAME || 'Traf3li';
const RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';
const ORIGIN = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000';
const CHALLENGE_TTL = 300; // 5 minutes in seconds

/**
 * Generate registration options for a new credential
 *
 * @param {Object} user - User object with id, email, and username
 * @returns {Promise<Object>} Registration options to send to client
 */
const generateRegistrationOptions = async (user) => {
    try {
        if (!user || !user._id) {
            throw new CustomException('User is required for registration', 400);
        }

        // Get user's existing credentials to exclude them from new registration
        const existingCredentials = await WebAuthnCredential.findActiveByUserId(user._id);

        const excludeCredentials = existingCredentials.map(cred => ({
            id: cred.credentialId,
            type: 'public-key',
            transports: cred.transports
        }));

        // Generate registration options
        const options = await generateRegOptions({
            rpName: RP_NAME,
            rpID: RP_ID,
            userID: user._id.toString(),
            userName: user.email || user.username,
            userDisplayName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,

            // Challenge timeout
            timeout: CHALLENGE_TTL * 1000, // Convert to milliseconds

            // Attestation type: 'none' is most compatible, 'direct' provides device info
            attestationType: 'none',

            // Exclude existing credentials to prevent duplicate registration
            excludeCredentials,

            // Authenticator selection criteria
            authenticatorSelection: {
                // Accept both platform (built-in) and cross-platform (USB) authenticators
                authenticatorAttachment: undefined,

                // Require user verification (PIN, biometric, etc.)
                userVerification: 'preferred',

                // Require resident key (credential stored on authenticator)
                // 'preferred' allows both resident and non-resident keys
                residentKey: 'preferred',

                // Legacy option for older browsers
                requireResidentKey: false
            },

            // Supported algorithms (ES256 is most widely supported)
            supportedAlgorithmIDs: [-7, -257] // ES256 (ECDSA), RS256 (RSA)
        });

        // Store challenge in Redis with 5-minute TTL
        const challengeKey = `webauthn:challenge:register:${user._id}`;
        await cacheService.set(challengeKey, options.challenge, CHALLENGE_TTL);

        return options;
    } catch (error) {
        logger.error('Error generating registration options:', error);
        throw new CustomException(
            error.message || 'Failed to generate registration options',
            error.statusCode || 500
        );
    }
};

/**
 * Verify registration response and store credential
 *
 * @param {Object} credential - Registration credential from client
 * @param {string} userId - User ID
 * @param {string} credentialName - User-friendly name for the credential
 * @returns {Promise<Object>} Verified credential object
 */
const verifyRegistration = async (credential, userId, credentialName) => {
    try {
        if (!credential || !userId) {
            throw new CustomException('Credential and user ID are required', 400);
        }

        // Retrieve and validate challenge from Redis
        const challengeKey = `webauthn:challenge:register:${userId}`;
        const expectedChallenge = await cacheService.get(challengeKey);

        if (!expectedChallenge) {
            throw new CustomException(
                'Registration challenge expired or not found. Please try again.',
                400
            );
        }

        // Verify the registration response
        const verification = await verifyRegistrationResponse({
            response: credential,
            expectedChallenge,
            expectedOrigin: ORIGIN,
            expectedRPID: RP_ID,
            requireUserVerification: false // Set to true for stricter security
        });

        if (!verification.verified) {
            throw new CustomException('Registration verification failed', 400);
        }

        const { registrationInfo } = verification;

        // Extract credential data
        const {
            credentialID,
            credentialPublicKey,
            counter,
            credentialDeviceType,
            credentialBackedUp,
            aaguid
        } = registrationInfo;

        // Convert credentialID buffer to base64url string
        const credentialIdBase64 = Buffer.from(credentialID).toString('base64url');
        const publicKeyBase64 = Buffer.from(credentialPublicKey).toString('base64url');

        // Check if credential already exists
        const existingCredential = await WebAuthnCredential.findOne({
            credentialId: credentialIdBase64
        });

        if (existingCredential) {
            throw new CustomException('This credential is already registered', 409);
        }

        // Determine device type and transports
        const deviceType = credentialDeviceType === 'singleDevice' ? 'platform' : 'cross-platform';

        // Extract transports from the credential response
        const transports = credential.response?.transports || [];

        // Create and save the credential
        const newCredential = new WebAuthnCredential({
            credentialId: credentialIdBase64,
            credentialPublicKey: publicKeyBase64,
            counter,
            deviceType,
            transports,
            userId,
            name: credentialName || `${deviceType === 'platform' ? 'Biometric' : 'Security Key'} ${new Date().toLocaleDateString()}`,
            aaguid: aaguid ? Buffer.from(aaguid).toString('hex') : undefined,
            userVerified: verification.verified,
            backedUp: credentialBackedUp
        });

        await newCredential.save();

        // Delete the challenge from Redis
        await cacheService.del(challengeKey);

        return {
            id: newCredential._id,
            credentialId: newCredential.credentialId,
            name: newCredential.name,
            deviceType: newCredential.deviceType,
            transports: newCredential.transports,
            createdAt: newCredential.createdAt
        };
    } catch (error) {
        logger.error('Error verifying registration:', error);
        throw new CustomException(
            error.message || 'Failed to verify registration',
            error.statusCode || 500
        );
    }
};

/**
 * Generate authentication options for existing credential
 *
 * @param {Object} user - User object with id
 * @returns {Promise<Object>} Authentication options to send to client
 */
const generateAuthenticationOptions = async (user) => {
    try {
        if (!user || !user._id) {
            throw new CustomException('User is required for authentication', 400);
        }

        // Get user's active credentials
        const userCredentials = await WebAuthnCredential.findActiveByUserId(user._id);

        if (userCredentials.length === 0) {
            throw new CustomException(
                'No credentials registered. Please register a security key first.',
                404
            );
        }

        // Convert credentials to expected format
        const allowCredentials = userCredentials.map(cred => ({
            id: cred.credentialId,
            type: 'public-key',
            transports: cred.transports
        }));

        // Generate authentication options
        const options = await generateAuthOptions({
            rpID: RP_ID,

            // Challenge timeout
            timeout: CHALLENGE_TTL * 1000,

            // Allow only user's registered credentials
            allowCredentials,

            // User verification preference
            userVerification: 'preferred'
        });

        // Store challenge in Redis with 5-minute TTL
        const challengeKey = `webauthn:challenge:authenticate:${user._id}`;
        await cacheService.set(challengeKey, options.challenge, CHALLENGE_TTL);

        return options;
    } catch (error) {
        logger.error('Error generating authentication options:', error);
        throw new CustomException(
            error.message || 'Failed to generate authentication options',
            error.statusCode || 500
        );
    }
};

/**
 * Verify authentication response
 *
 * @param {Object} credential - Authentication credential from client
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Verification result with credential info
 */
const verifyAuthentication = async (credential, userId) => {
    try {
        if (!credential || !userId) {
            throw new CustomException('Credential and user ID are required', 400);
        }

        // Retrieve and validate challenge from Redis
        const challengeKey = `webauthn:challenge:authenticate:${userId}`;
        const expectedChallenge = await cacheService.get(challengeKey);

        if (!expectedChallenge) {
            throw new CustomException(
                'Authentication challenge expired or not found. Please try again.',
                400
            );
        }

        // Get the credential ID from the response
        const credentialIdBase64 = credential.id || credential.rawId;

        // Find the credential in database
        const dbCredential = await WebAuthnCredential.findByCredentialId(credentialIdBase64);

        if (!dbCredential) {
            throw new CustomException('Credential not found or has been revoked', 404);
        }

        // Verify the credential belongs to the user
        if (dbCredential.userId.toString() !== userId.toString()) {
            throw new CustomException('Credential does not belong to this user', 403);
        }

        // Convert stored public key back to buffer
        const credentialPublicKey = Buffer.from(dbCredential.credentialPublicKey, 'base64url');

        // Verify the authentication response
        const verification = await verifyAuthenticationResponse({
            response: credential,
            expectedChallenge,
            expectedOrigin: ORIGIN,
            expectedRPID: RP_ID,
            authenticator: {
                credentialID: Buffer.from(dbCredential.credentialId, 'base64url'),
                credentialPublicKey,
                counter: dbCredential.counter
            },
            requireUserVerification: false
        });

        if (!verification.verified) {
            throw new CustomException('Authentication verification failed', 401);
        }

        // Update credential counter and last used timestamp
        const { authenticationInfo } = verification;
        dbCredential.counter = authenticationInfo.newCounter;
        await dbCredential.markAsUsed();

        // Delete the challenge from Redis
        await cacheService.del(challengeKey);

        return {
            verified: true,
            credential: {
                id: dbCredential._id,
                credentialId: dbCredential.credentialId,
                name: dbCredential.name,
                deviceType: dbCredential.deviceType,
                lastUsedAt: dbCredential.lastUsedAt
            }
        };
    } catch (error) {
        logger.error('Error verifying authentication:', error);
        throw new CustomException(
            error.message || 'Failed to verify authentication',
            error.statusCode || 500
        );
    }
};

/**
 * Get all credentials for a user
 *
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of user's credentials
 */
const getUserCredentials = async (userId) => {
    try {
        const credentials = await WebAuthnCredential.findActiveByUserId(userId);

        return credentials.map(cred => ({
            id: cred._id,
            credentialId: cred.credentialId,
            name: cred.name,
            deviceType: cred.deviceType,
            transports: cred.transports,
            createdAt: cred.createdAt,
            lastUsedAt: cred.lastUsedAt,
            backedUp: cred.backedUp
        }));
    } catch (error) {
        logger.error('Error getting user credentials:', error);
        throw new CustomException('Failed to retrieve credentials', 500);
    }
};

/**
 * Delete/revoke a credential
 *
 * @param {string} credentialId - Credential ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<boolean>} Success status
 */
const deleteCredential = async (credentialId, userId) => {
    try {
        const credential = await WebAuthnCredential.findOne({ _id: credentialId, userId });

        if (!credential) {
            throw new CustomException('Credential not found', 404);
        }

        // Check if this is the user's last credential
        const userCredentials = await WebAuthnCredential.findActiveByUserId(userId);

        if (userCredentials.length === 1) {
            throw new CustomException(
                'Cannot delete your last credential. Please register another credential first.',
                400
            );
        }

        // Revoke the credential instead of deleting for audit purposes
        await credential.revoke();

        return true;
    } catch (error) {
        logger.error('Error deleting credential:', error);
        throw new CustomException(
            error.message || 'Failed to delete credential',
            error.statusCode || 500
        );
    }
};

module.exports = {
    generateRegistrationOptions,
    verifyRegistration,
    generateAuthenticationOptions,
    verifyAuthentication,
    getUserCredentials,
    deleteCredential
};
