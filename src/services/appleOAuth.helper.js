const jwt = require('jsonwebtoken');
const logger = require('../utils/contextLogger');
const { CustomException } = require('../utils');

/**
 * Apple Sign-In OAuth Helper Functions
 *
 * These functions provide special handling for Apple's unique OAuth implementation:
 * - JWT-based client secrets (not regular secrets)
 * - User info in id_token (not userinfo endpoint)
 * - Private email relay support
 */

/**
 * Generate Apple client secret JWT
 * Apple requires a JWT signed with a private key instead of a regular client secret
 *
 * @param {string} teamId - Apple Team ID
 * @param {string} clientId - Apple Services ID (client ID)
 * @param {string} keyId - Apple Key ID
 * @param {string} privateKey - Apple private key (PEM format)
 * @returns {string} Signed JWT to use as client_secret
 */
function generateAppleClientSecret(teamId, clientId, keyId, privateKey) {
    const now = Math.floor(Date.now() / 1000);

    const payload = {
        iss: teamId, // Issuer (Team ID)
        iat: now, // Issued at
        exp: now + 15777000, // Expiration (6 months max, using 6 months)
        aud: 'https://appleid.apple.com', // Audience
        sub: clientId // Subject (Services ID / Client ID)
    };

    const header = {
        alg: 'ES256', // Apple requires ES256 algorithm
        kid: keyId // Key ID from Apple developer portal
    };

    // Sign the JWT with the private key
    const token = jwt.sign(payload, privateKey, {
        algorithm: 'ES256',
        header
    });

    return token;
}

/**
 * Decode Apple ID token to extract user information
 * Apple returns user info in the id_token JWT, not via a userinfo endpoint
 *
 * @param {string} idToken - ID token from Apple
 * @returns {object} Decoded token payload
 */
function decodeAppleIdToken(idToken) {
    try {
        // Decode without verification (Apple's public keys can be fetched for verification if needed)
        // In production, you should verify the signature using Apple's public keys
        const decoded = jwt.decode(idToken, { complete: true });

        if (!decoded || !decoded.payload) {
            throw new Error('Invalid Apple ID token');
        }

        return decoded.payload;
    } catch (error) {
        logger.error('Failed to decode Apple ID token', { error: error.message });
        throw CustomException('Failed to decode Apple ID token', 400);
    }
}

/**
 * Map Apple ID token claims to standard user info format
 *
 * @param {object} tokenPayload - Decoded Apple ID token payload
 * @returns {object} Mapped user info
 */
function mapAppleUserInfo(tokenPayload) {
    return {
        externalId: tokenPayload.sub,
        email: tokenPayload.email,
        // Apple may not provide name/picture in id_token after first login
        // Name is only included on the first authorization
        firstName: tokenPayload.given_name || 'User',
        lastName: tokenPayload.family_name || '',
        displayName: tokenPayload.name || tokenPayload.email?.split('@')[0] || 'User',
        picture: null, // Apple doesn't provide profile pictures
        emailVerified: tokenPayload.email_verified || 'true' === tokenPayload.email_verified,
        // Note: Apple email may be a relay (privaterelay.appleid.com)
        isPrivateEmail: tokenPayload.is_private_email || tokenPayload.email?.includes('privaterelay.appleid.com')
    };
}

module.exports = {
    generateAppleClientSecret,
    decodeAppleIdToken,
    mapAppleUserInfo
};
