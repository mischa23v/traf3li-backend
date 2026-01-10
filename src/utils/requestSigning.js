/**
 * Request Signing Utility (AWS Signature V4 Pattern)
 *
 * Provides HMAC-SHA256 request signing for sensitive API operations.
 * Prevents replay attacks and ensures request integrity.
 *
 * Enterprise Pattern: AWS Signature V4, Google Cloud API signing
 *
 * Usage:
 *   Frontend: Include X-Signature and X-Timestamp headers
 *   Backend: Use requireSignedRequest middleware on sensitive endpoints
 *
 * @see https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html
 */

const crypto = require('crypto');
const logger = require('./logger');

// Try to import cache service for nonce tracking
let cacheService;
try {
    cacheService = require('../services/cache.service');
} catch (e) {
    // Cache service not available - nonce tracking disabled
    cacheService = null;
}

// Configuration
const CONFIG = {
    // Maximum age of a signed request (5 minutes)
    MAX_REQUEST_AGE_MS: 5 * 60 * 1000,

    // Nonce cache TTL (slightly longer than max request age)
    NONCE_TTL_SECONDS: 6 * 60,

    // Header names
    HEADERS: {
        SIGNATURE: 'x-signature',
        TIMESTAMP: 'x-timestamp',
        NONCE: 'x-request-nonce'  // Required for replay protection
    },

    // Secret key for signing (use dedicated key in production)
    getSigningSecret: () => {
        return process.env.REQUEST_SIGNING_SECRET || process.env.JWT_SECRET;
    }
};

/**
 * Serialize object with sorted keys for consistent hashing
 * @param {any} obj - Object to serialize
 * @returns {string} - JSON string with sorted keys
 */
function stableStringify(obj) {
    if (obj === null || obj === undefined) {
        return 'null';
    }
    if (typeof obj !== 'object') {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return '[' + obj.map(stableStringify).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    return '{' + keys.map(key => `"${key}":${stableStringify(obj[key])}`).join(',') + '}';
}

/**
 * Sign a request (for client-side use or testing)
 *
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} path - Request path with query string (e.g., /api/billing/invoices?page=1)
 * @param {Object} body - Request body (for POST/PUT/PATCH)
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @param {string} secretKey - Signing secret
 * @param {string} nonce - Unique request identifier (REQUIRED for replay protection)
 * @returns {string} - HMAC-SHA256 signature
 */
function signRequest(method, path, body, timestamp, secretKey, nonce = '') {
    // Create canonical request string with sorted body keys
    const bodyHash = crypto
        .createHash('sha256')
        .update(stableStringify(body || {}))
        .digest('hex');

    const stringToSign = [
        method.toUpperCase(),
        path,  // Should include query string
        timestamp.toString(),
        nonce,
        bodyHash
    ].join('\n');

    // Generate HMAC-SHA256 signature
    return crypto
        .createHmac('sha256', secretKey)
        .update(stringToSign)
        .digest('hex');
}

/**
 * Check if nonce has been used (replay protection)
 * @param {string} nonce - Request nonce
 * @returns {Promise<boolean>} - True if nonce is new (not replayed)
 */
async function checkNonceNotUsed(nonce) {
    if (!cacheService || !nonce) {
        return true; // Cannot check without cache or nonce
    }

    const cacheKey = `req:nonce:${nonce}`;
    const exists = await cacheService.get(cacheKey);

    if (exists) {
        return false; // Nonce already used - replay attack
    }

    // Mark nonce as used
    await cacheService.set(cacheKey, '1', CONFIG.NONCE_TTL_SECONDS);
    return true;
}

/**
 * Verify a signed request
 *
 * @param {Object} req - Express request object
 * @param {string} secretKey - Signing secret
 * @param {Object} options - Verification options
 * @param {boolean} options.requireNonce - Require nonce for replay protection (default: true)
 * @returns {Promise<Object>} - Verification result { valid, reason, details }
 */
async function verifyRequest(req, secretKey, options = {}) {
    const { requireNonce = true } = options;
    const providedSignature = req.headers[CONFIG.HEADERS.SIGNATURE];
    const timestamp = req.headers[CONFIG.HEADERS.TIMESTAMP];
    const nonce = req.headers[CONFIG.HEADERS.NONCE] || '';

    // Check required headers
    if (!providedSignature) {
        return {
            valid: false,
            reason: 'MISSING_SIGNATURE',
            details: 'X-Signature header is required'
        };
    }

    if (!timestamp) {
        return {
            valid: false,
            reason: 'MISSING_TIMESTAMP',
            details: 'X-Timestamp header is required'
        };
    }

    // Check nonce for replay protection
    if (requireNonce && !nonce) {
        return {
            valid: false,
            reason: 'MISSING_NONCE',
            details: 'X-Request-Nonce header is required for replay protection'
        };
    }

    // Validate timestamp format
    const requestTime = parseInt(timestamp, 10);
    if (isNaN(requestTime)) {
        return {
            valid: false,
            reason: 'INVALID_TIMESTAMP',
            details: 'X-Timestamp must be a valid Unix timestamp in milliseconds'
        };
    }

    // Check timestamp freshness (prevent replay attacks)
    const now = Date.now();
    const age = Math.abs(now - requestTime);

    if (age > CONFIG.MAX_REQUEST_AGE_MS) {
        return {
            valid: false,
            reason: 'EXPIRED_REQUEST',
            details: `Request timestamp expired. Max age: ${CONFIG.MAX_REQUEST_AGE_MS / 1000}s, Actual age: ${Math.round(age / 1000)}s`
        };
    }

    // Check nonce hasn't been used before (replay protection)
    if (nonce && cacheService) {
        const nonceIsNew = await checkNonceNotUsed(nonce);
        if (!nonceIsNew) {
            return {
                valid: false,
                reason: 'NONCE_REUSED',
                details: 'Request nonce has already been used - possible replay attack'
            };
        }
    }

    // Calculate expected signature (include full URL with query string)
    const expectedSignature = signRequest(
        req.method,
        req.originalUrl || req.path,
        req.body,
        requestTime,
        secretKey,
        nonce
    );

    // Timing-safe comparison to prevent timing attacks
    let signaturesMatch = false;
    try {
        signaturesMatch = crypto.timingSafeEqual(
            Buffer.from(providedSignature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    } catch (error) {
        // Buffer length mismatch or invalid hex
        return {
            valid: false,
            reason: 'INVALID_SIGNATURE_FORMAT',
            details: 'Signature format is invalid'
        };
    }

    if (!signaturesMatch) {
        return {
            valid: false,
            reason: 'SIGNATURE_MISMATCH',
            details: 'Request signature does not match'
        };
    }

    return {
        valid: true,
        reason: 'SIGNATURE_VALID',
        details: 'Request signature verified successfully',
        requestAge: age
    };
}

/**
 * Middleware: Require signed request for sensitive operations
 *
 * Usage:
 *   router.delete('/account', requireSignedRequest(), deleteAccount);
 *   router.post('/transfer', requireSignedRequest({ logAttempts: true }), transferFunds);
 *
 * @param {Object} options - Middleware options
 * @param {boolean} options.logAttempts - Log failed verification attempts
 * @param {boolean} options.allowMissing - Allow requests without signature (for gradual rollout)
 * @returns {Function} - Express middleware
 */
function requireSignedRequest(options = {}) {
    const { logAttempts = true, allowMissing = false, requireNonce = true } = options;

    return async (req, res, next) => {
        try {
            const secretKey = CONFIG.getSigningSecret();

            // Check if signature headers are present
            const hasSignature = req.headers[CONFIG.HEADERS.SIGNATURE];

            // Allow missing signatures during gradual rollout
            if (!hasSignature && allowMissing) {
                logger.warn('Request missing signature (allowed during rollout)', {
                    method: req.method,
                    path: req.originalUrl,
                    userId: req.userID,
                    ip: req.ip
                });
                return next();
            }

            // Verify the request (async for nonce checking)
            const result = await verifyRequest(req, secretKey, { requireNonce });

            if (!result.valid) {
                if (logAttempts) {
                    logger.warn('Signed request verification failed', {
                        reason: result.reason,
                        details: result.details,
                        method: req.method,
                        path: req.originalUrl,
                        userId: req.userID,
                        ip: req.ip,
                        userAgent: req.headers['user-agent']
                    });
                }

                return res.status(401).json({
                    error: true,
                    message: 'طلب غير صالح - التوقيع مطلوب',
                    messageEn: 'Invalid request - signature required',
                    code: result.reason,
                    details: process.env.NODE_ENV === 'development' ? result.details : undefined
                });
            }

            // Attach verification result to request for logging
            req.signatureVerified = true;
            req.signatureAge = result.requestAge;

            next();
        } catch (error) {
            logger.error('Request signing middleware error:', error);
            // Fail closed - reject on errors
            return res.status(500).json({
                error: true,
                message: 'خطأ في التحقق من الطلب',
                messageEn: 'Request verification error',
                code: 'VERIFICATION_ERROR'
            });
        }
    };
}

/**
 * Generate signing instructions for frontend developers
 *
 * @param {string} method - HTTP method
 * @param {string} path - API endpoint path
 * @returns {Object} - Instructions and example code
 */
function getSigningInstructions(method, path) {
    return {
        headers: {
            required: [CONFIG.HEADERS.SIGNATURE, CONFIG.HEADERS.TIMESTAMP],
            optional: [CONFIG.HEADERS.NONCE]
        },
        algorithm: 'HMAC-SHA256',
        stringToSign: `${method}\\n${path}\\n{timestamp}\\n{nonce}\\n{sha256(body)}`,
        maxAge: `${CONFIG.MAX_REQUEST_AGE_MS / 1000} seconds`,
        example: {
            javascript: `
const crypto = require('crypto');

function signRequest(method, path, body, secret) {
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString('hex');
    const bodyHash = crypto.createHash('sha256')
        .update(JSON.stringify(body || {}))
        .digest('hex');

    const stringToSign = [method, path, timestamp, nonce, bodyHash].join('\\n');
    const signature = crypto.createHmac('sha256', secret)
        .update(stringToSign)
        .digest('hex');

    return {
        'X-Signature': signature,
        'X-Timestamp': timestamp.toString(),
        'X-Request-Nonce': nonce
    };
}
            `.trim()
        }
    };
}

module.exports = {
    signRequest,
    verifyRequest,
    requireSignedRequest,
    getSigningInstructions,
    stableStringify,  // Export for frontend to use same serialization
    CONFIG
};
