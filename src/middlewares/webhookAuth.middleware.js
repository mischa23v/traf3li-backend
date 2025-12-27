/**
 * Webhook Authentication Middleware
 *
 * Centralized webhook signature validation for all external providers.
 * This middleware validates incoming webhook requests using provider-specific
 * signature verification methods.
 *
 * Supported Providers:
 * - Stripe (stripe-signature header)
 * - Zoom (x-zm-signature header)
 * - DocuSign (x-docusign-signature header)
 * - Slack (x-slack-signature header)
 * - Google (via pub/sub or direct)
 * - GitHub (x-hub-signature-256 header)
 * - Discord (x-signature-ed25519 header)
 * - WhatsApp/Meta (x-hub-signature-256 header)
 * - Xero (x-xero-signature header)
 * - Yakeen (x-webhook-signature or x-signature header)
 * - Wathq (x-webhook-signature or x-signature header)
 * - LeanTech (x-lean-signature header)
 * - Generic HMAC (x-signature or x-webhook-signature header)
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Provider-specific configuration
 */
const PROVIDER_CONFIG = {
    stripe: {
        headerName: 'stripe-signature',
        secretEnvVar: 'STRIPE_WEBHOOK_SECRET',
        algorithm: 'sha256',
        signatureFormat: 'timestamp-based', // Stripe uses t=timestamp,v1=signature format
        timestampTolerance: 300 // 5 minutes
    },
    zoom: {
        headerName: 'x-zm-signature',
        secretEnvVar: 'ZOOM_WEBHOOK_SECRET',
        algorithm: 'sha256',
        signatureFormat: 'v0',
        timestampHeader: 'x-zm-request-timestamp',
        timestampTolerance: 300
    },
    docusign: {
        headerName: 'x-docusign-signature-1',
        secretEnvVar: 'DOCUSIGN_WEBHOOK_SECRET',
        algorithm: 'sha256',
        signatureFormat: 'hmac-base64'
    },
    slack: {
        headerName: 'x-slack-signature',
        secretEnvVar: 'SLACK_SIGNING_SECRET',
        algorithm: 'sha256',
        signatureFormat: 'v0',
        timestampHeader: 'x-slack-request-timestamp',
        timestampTolerance: 300
    },
    github: {
        headerName: 'x-hub-signature-256',
        secretEnvVar: 'GITHUB_WEBHOOK_SECRET',
        algorithm: 'sha256',
        signatureFormat: 'sha256='
    },
    whatsapp: {
        headerName: 'x-hub-signature-256',
        secretEnvVar: 'WHATSAPP_WEBHOOK_SECRET',
        algorithm: 'sha256',
        signatureFormat: 'sha256='
    },
    meta: {
        headerName: 'x-hub-signature-256',
        secretEnvVar: 'META_WEBHOOK_SECRET',
        algorithm: 'sha256',
        signatureFormat: 'sha256='
    },
    xero: {
        headerName: 'x-xero-signature',
        secretEnvVar: 'XERO_WEBHOOK_SECRET',
        algorithm: 'sha256',
        signatureFormat: 'base64'
    },
    discord: {
        headerName: 'x-signature-ed25519',
        secretEnvVar: 'DISCORD_PUBLIC_KEY',
        algorithm: 'ed25519',
        timestampHeader: 'x-signature-timestamp'
    },
    yakeen: {
        headerName: ['x-webhook-signature', 'x-signature'],
        secretEnvVar: 'YAKEEN_WEBHOOK_SECRET',
        algorithm: 'sha256',
        signatureFormat: 'hex'
    },
    wathq: {
        headerName: ['x-webhook-signature', 'x-signature'],
        secretEnvVar: 'WATHQ_WEBHOOK_SECRET',
        algorithm: 'sha256',
        signatureFormat: 'hex'
    },
    leantech: {
        headerName: 'x-lean-signature',
        secretEnvVar: 'LEANTECH_WEBHOOK_SECRET',
        algorithm: 'sha256',
        signatureFormat: 'hex'
    },
    generic: {
        headerName: ['x-webhook-signature', 'x-signature', 'x-hmac-signature'],
        secretEnvVar: null, // Must be provided explicitly
        algorithm: 'sha256',
        signatureFormat: 'hex'
    }
};

/**
 * Get signature from request headers
 * @param {Object} headers - Request headers
 * @param {string|string[]} headerName - Header name(s) to check
 * @returns {string|null} - Signature value
 */
function getSignatureFromHeaders(headers, headerName) {
    const names = Array.isArray(headerName) ? headerName : [headerName];

    for (const name of names) {
        const value = headers[name] || headers[name.toLowerCase()];
        if (value) {
            return value;
        }
    }

    return null;
}

/**
 * Constant-time comparison to prevent timing attacks
 * @param {string|Buffer} a - First value
 * @param {string|Buffer} b - Second value
 * @returns {boolean} - True if equal
 */
function safeCompare(a, b) {
    try {
        const bufA = Buffer.isBuffer(a) ? a : Buffer.from(a, 'utf8');
        const bufB = Buffer.isBuffer(b) ? b : Buffer.from(b, 'utf8');

        if (bufA.length !== bufB.length) {
            return false;
        }

        return crypto.timingSafeEqual(bufA, bufB);
    } catch {
        return false;
    }
}

/**
 * Verify Stripe webhook signature
 * Format: t=timestamp,v1=signature
 */
function verifyStripeSignature(payload, signature, secret, tolerance = 300) {
    if (!signature) {
        return { valid: false, error: 'Missing signature' };
    }

    const elements = signature.split(',');
    const signatureObj = {};

    for (const element of elements) {
        const [key, value] = element.split('=');
        signatureObj[key] = value;
    }

    const timestamp = parseInt(signatureObj.t, 10);
    const receivedSig = signatureObj.v1;

    if (!timestamp || !receivedSig) {
        return { valid: false, error: 'Invalid signature format' };
    }

    // Check timestamp
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > tolerance) {
        return { valid: false, error: 'Timestamp outside tolerance' };
    }

    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');

    if (!safeCompare(expectedSig, receivedSig)) {
        return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true, timestamp };
}

/**
 * Verify Slack/Zoom webhook signature
 * Format: v0=signature
 */
function verifySlackZoomSignature(payload, signature, secret, timestamp, tolerance = 300) {
    if (!signature || !timestamp) {
        return { valid: false, error: 'Missing signature or timestamp' };
    }

    // Check timestamp
    const ts = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > tolerance) {
        return { valid: false, error: 'Timestamp outside tolerance' };
    }

    // Compute expected signature
    const baseString = `v0:${ts}:${payload}`;
    const expectedSig = 'v0=' + crypto
        .createHmac('sha256', secret)
        .update(baseString)
        .digest('hex');

    if (!safeCompare(expectedSig, signature)) {
        return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true, timestamp: ts };
}

/**
 * Verify GitHub/Meta/WhatsApp webhook signature
 * Format: sha256=signature
 */
function verifyGitHubSignature(payload, signature, secret) {
    if (!signature) {
        return { valid: false, error: 'Missing signature' };
    }

    if (!signature.startsWith('sha256=')) {
        return { valid: false, error: 'Invalid signature format' };
    }

    const receivedSig = signature.slice(7);
    const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

    if (!safeCompare(expectedSig, receivedSig)) {
        return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
}

/**
 * Verify generic HMAC signature (hex or base64)
 */
function verifyGenericHMAC(payload, signature, secret, format = 'hex') {
    if (!signature) {
        return { valid: false, error: 'Missing signature' };
    }

    const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
        .digest(format);

    if (!safeCompare(expectedSig, signature)) {
        return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
}

/**
 * Verify Discord Ed25519 signature
 */
function verifyDiscordSignature(payload, signature, timestamp, publicKey) {
    if (!signature || !timestamp || !publicKey) {
        return { valid: false, error: 'Missing signature, timestamp, or public key' };
    }

    try {
        const message = Buffer.from(timestamp + payload);
        const sig = Buffer.from(signature, 'hex');
        const key = Buffer.from(publicKey, 'hex');

        // Node.js 18+ has native Ed25519 support
        const verify = crypto.createVerify('ed25519');
        verify.update(message);
        const isValid = verify.verify(
            { key, format: 'der', type: 'spki' },
            sig
        );

        return { valid: isValid };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

/**
 * Create webhook authentication middleware for a specific provider
 *
 * @param {string} provider - Provider name (stripe, zoom, slack, etc.)
 * @param {Object} options - Additional options
 * @returns {Function} - Express middleware
 */
function createWebhookAuth(provider, options = {}) {
    const config = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.generic;

    return async (req, res, next) => {
        try {
            // Get secret from options or environment
            const secret = options.secret || process.env[config.secretEnvVar];

            if (!secret) {
                logger.error(`Webhook secret not configured for ${provider}`, {
                    envVar: config.secretEnvVar
                });
                return res.status(500).json({
                    success: false,
                    error: 'Webhook configuration error'
                });
            }

            // Get raw body (must be preserved by body-parser)
            const rawBody = req.rawBody || JSON.stringify(req.body);

            // Get signature from headers
            const signature = getSignatureFromHeaders(req.headers, config.headerName);

            if (!signature) {
                logger.warn(`Missing webhook signature for ${provider}`, {
                    ip: req.ip,
                    path: req.path
                });
                return res.status(401).json({
                    success: false,
                    error: 'Missing webhook signature'
                });
            }

            let result;

            // Verify based on provider type
            switch (provider) {
                case 'stripe':
                    result = verifyStripeSignature(
                        rawBody,
                        signature,
                        secret,
                        config.timestampTolerance
                    );
                    break;

                case 'slack':
                case 'zoom': {
                    const timestamp = req.headers[config.timestampHeader];
                    result = verifySlackZoomSignature(
                        rawBody,
                        signature,
                        secret,
                        timestamp,
                        config.timestampTolerance
                    );
                    break;
                }

                case 'github':
                case 'whatsapp':
                case 'meta':
                    result = verifyGitHubSignature(rawBody, signature, secret);
                    break;

                case 'discord': {
                    const timestamp = req.headers[config.timestampHeader];
                    result = verifyDiscordSignature(rawBody, signature, timestamp, secret);
                    break;
                }

                case 'xero':
                case 'docusign':
                    result = verifyGenericHMAC(rawBody, signature, secret, 'base64');
                    break;

                default:
                    // Generic HMAC verification
                    result = verifyGenericHMAC(
                        rawBody,
                        signature,
                        secret,
                        config.signatureFormat === 'base64' ? 'base64' : 'hex'
                    );
            }

            if (!result.valid) {
                logger.warn(`Invalid webhook signature for ${provider}`, {
                    error: result.error,
                    ip: req.ip,
                    path: req.path
                });
                return res.status(401).json({
                    success: false,
                    error: 'Invalid webhook signature'
                });
            }

            // Add verification info to request
            req.webhookVerified = true;
            req.webhookProvider = provider;
            req.webhookTimestamp = result.timestamp;

            logger.info(`Webhook verified for ${provider}`, {
                path: req.path,
                timestamp: result.timestamp
            });

            next();
        } catch (error) {
            logger.error(`Webhook verification error for ${provider}:`, error);
            return res.status(500).json({
                success: false,
                error: 'Webhook verification failed'
            });
        }
    };
}

/**
 * Auto-detect provider and verify webhook
 * Useful for generic webhook endpoints
 */
function autoDetectWebhookAuth(options = {}) {
    return async (req, res, next) => {
        // Try to detect provider from headers
        let provider = null;

        if (req.headers['stripe-signature']) {
            provider = 'stripe';
        } else if (req.headers['x-slack-signature']) {
            provider = 'slack';
        } else if (req.headers['x-zm-signature']) {
            provider = 'zoom';
        } else if (req.headers['x-hub-signature-256']) {
            // Could be GitHub, WhatsApp, or Meta
            if (req.path.includes('github')) {
                provider = 'github';
            } else if (req.path.includes('whatsapp')) {
                provider = 'whatsapp';
            } else {
                provider = 'meta';
            }
        } else if (req.headers['x-docusign-signature-1']) {
            provider = 'docusign';
        } else if (req.headers['x-xero-signature']) {
            provider = 'xero';
        } else if (req.headers['x-signature-ed25519']) {
            provider = 'discord';
        } else if (req.headers['x-lean-signature']) {
            provider = 'leantech';
        } else if (req.headers['x-webhook-signature'] || req.headers['x-signature']) {
            // Try to detect from body or path
            if (req.body?.source === 'yakeen' || req.path.includes('yakeen')) {
                provider = 'yakeen';
            } else if (req.body?.source === 'wathq' || req.path.includes('wathq')) {
                provider = 'wathq';
            } else {
                provider = 'generic';
            }
        }

        if (!provider) {
            logger.warn('Could not detect webhook provider', {
                headers: Object.keys(req.headers),
                path: req.path
            });
            return res.status(401).json({
                success: false,
                error: 'Unknown webhook provider'
            });
        }

        // Use provider-specific verification
        const middleware = createWebhookAuth(provider, options);
        return middleware(req, res, next);
    };
}

/**
 * Require raw body preservation middleware
 * Must be used before JSON body parser for webhook routes
 */
function preserveRawBody(req, res, next) {
    let data = '';

    req.setEncoding('utf8');

    req.on('data', (chunk) => {
        data += chunk;
    });

    req.on('end', () => {
        req.rawBody = data;

        try {
            req.body = JSON.parse(data);
        } catch {
            req.body = {};
        }

        next();
    });
}

module.exports = {
    createWebhookAuth,
    autoDetectWebhookAuth,
    preserveRawBody,

    // Export verification functions for direct use
    verifyStripeSignature,
    verifySlackZoomSignature,
    verifyGitHubSignature,
    verifyGenericHMAC,
    verifyDiscordSignature,

    // Export config for customization
    PROVIDER_CONFIG
};
