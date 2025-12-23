const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Webhook Signature Service
 *
 * Supports two signature types:
 * 1. HMAC-SHA256 (legacy, default)
 * 2. JWS (JSON Web Signature) - more modern approach
 */

/**
 * Generate HMAC-SHA256 signature
 *
 * @param {Object|String} payload - Payload to sign
 * @param {String} secret - Secret key
 * @returns {String} - Hex-encoded signature
 */
function generateSignature(payload, secret) {
    const payloadString = typeof payload === 'string'
        ? payload
        : JSON.stringify(payload);

    return crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex');
}

/**
 * Verify HMAC-SHA256 signature
 *
 * @param {Object|String} payload - Payload to verify
 * @param {String} signature - Received signature
 * @param {String} secret - Secret key
 * @returns {Boolean} - True if valid
 */
function verifySignature(payload, signature, secret) {
    const expectedSignature = generateSignature(payload, secret);

    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch (error) {
        return false;
    }
}

/**
 * Generate JWS (JSON Web Signature)
 *
 * Uses compact serialization: header.payload.signature
 * Algorithm: HS256 (HMAC with SHA-256)
 *
 * @param {Object} payload - Payload to sign
 * @param {String} secret - Secret key
 * @param {Object} options - Additional options
 * @returns {String} - JWS token
 */
function generateJWSSignature(payload, secret, options = {}) {
    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };

    // Add timestamp to prevent replay attacks
    const jwtPayload = {
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (options.expiresIn || 300), // 5 min default
        jti: options.jti || generateJti()
    };

    // Base64url encode header and payload
    const encodedHeader = base64urlEncode(JSON.stringify(header));
    const encodedPayload = base64urlEncode(JSON.stringify(jwtPayload));

    // Create signature
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto
        .createHmac('sha256', secret)
        .update(signatureInput)
        .digest();

    const encodedSignature = base64urlEncode(signature);

    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * Verify JWS signature
 *
 * @param {String} jws - JWS token
 * @param {String} secret - Secret key
 * @param {Object} options - Verification options
 * @returns {Object} - { valid, payload, error }
 */
function verifyJWSSignature(jws, secret, options = {}) {
    try {
        if (!jws || typeof jws !== 'string') {
            return { valid: false, error: 'Invalid JWS format' };
        }

        const parts = jws.split('.');
        if (parts.length !== 3) {
            return { valid: false, error: 'Invalid JWS structure' };
        }

        const [encodedHeader, encodedPayload, encodedSignature] = parts;

        // Verify header
        const header = JSON.parse(base64urlDecode(encodedHeader));
        if (header.alg !== 'HS256') {
            return { valid: false, error: `Unsupported algorithm: ${header.alg}` };
        }

        // Verify signature
        const signatureInput = `${encodedHeader}.${encodedPayload}`;
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(signatureInput)
            .digest();

        const receivedSignature = Buffer.from(base64urlDecode(encodedSignature, 'binary'), 'binary');

        const isValidSignature = crypto.timingSafeEqual(
            expectedSignature,
            receivedSignature
        );

        if (!isValidSignature) {
            return { valid: false, error: 'Invalid signature' };
        }

        // Parse payload
        const payload = JSON.parse(base64urlDecode(encodedPayload));

        // Verify expiration unless disabled
        if (!options.ignoreExpiration && payload.exp) {
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp < now) {
                return { valid: false, error: 'Token expired', payload };
            }
        }

        // Verify not before (if present)
        if (payload.nbf) {
            const now = Math.floor(Date.now() / 1000);
            if (payload.nbf > now) {
                return { valid: false, error: 'Token not yet valid', payload };
            }
        }

        return { valid: true, payload };

    } catch (error) {
        logger.error('JWS verification error:', error);
        return { valid: false, error: error.message };
    }
}

/**
 * Generate signature based on webhook configuration
 *
 * @param {Object} payload - Payload to sign
 * @param {String} secret - Secret key
 * @param {Object} options - Options including signature type
 * @returns {String} - Signature (HMAC hex or JWS)
 */
function generateWebhookSignature(payload, secret, options = {}) {
    const { useJWS = false, ...jwsOptions } = options;

    if (useJWS) {
        return generateJWSSignature(payload, secret, jwsOptions);
    }

    return generateSignature(payload, secret);
}

/**
 * Verify webhook signature (auto-detects type)
 *
 * @param {Object} payload - Payload to verify
 * @param {String} signature - Received signature
 * @param {String} secret - Secret key
 * @param {Object} options - Verification options
 * @returns {Object} - { valid, type, payload?, error? }
 */
function verifyWebhookSignature(payload, signature, secret, options = {}) {
    // Detect signature type
    if (signature && signature.split('.').length === 3) {
        // Looks like JWS
        const result = verifyJWSSignature(signature, secret, options);
        return { ...result, type: 'jws' };
    }

    // Assume HMAC
    const valid = verifySignature(payload, signature, secret);
    return { valid, type: 'hmac', error: valid ? null : 'Invalid HMAC signature' };
}

/**
 * Generate unique JTI (JWT ID) for preventing replay attacks
 * @private
 */
function generateJti() {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Base64url encode
 * @private
 */
function base64urlEncode(input) {
    const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
    return buffer
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

/**
 * Base64url decode
 * @private
 */
function base64urlDecode(input, encoding = 'utf8') {
    let base64 = input
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    // Add padding
    const pad = base64.length % 4;
    if (pad) {
        base64 += '='.repeat(4 - pad);
    }

    return Buffer.from(base64, 'base64').toString(encoding);
}

/**
 * Create signature header value with algorithm prefix
 * Format: "sha256=abc123" or "jws=xxx.yyy.zzz"
 *
 * @param {Object} payload - Payload to sign
 * @param {String} secret - Secret key
 * @param {Object} options - Options
 * @returns {String} - Prefixed signature
 */
function createSignatureHeader(payload, secret, options = {}) {
    const { useJWS = false, ...signOptions } = options;

    if (useJWS) {
        const jws = generateJWSSignature(payload, secret, signOptions);
        return `jws=${jws}`;
    }

    const hmac = generateSignature(payload, secret);
    return `sha256=${hmac}`;
}

/**
 * Parse signature header value
 *
 * @param {String} header - Signature header value
 * @returns {Object} - { type, signature }
 */
function parseSignatureHeader(header) {
    if (!header || typeof header !== 'string') {
        return { type: null, signature: null };
    }

    if (header.startsWith('jws=')) {
        return { type: 'jws', signature: header.slice(4) };
    }

    if (header.startsWith('sha256=')) {
        return { type: 'hmac', signature: header.slice(7) };
    }

    // Assume raw HMAC signature for backwards compatibility
    return { type: 'hmac', signature: header };
}

module.exports = {
    // HMAC functions
    generateSignature,
    verifySignature,

    // JWS functions
    generateJWSSignature,
    verifyJWSSignature,

    // Unified functions
    generateWebhookSignature,
    verifyWebhookSignature,

    // Header utilities
    createSignatureHeader,
    parseSignatureHeader,

    // Helpers
    generateJti,
    base64urlEncode,
    base64urlDecode
};
