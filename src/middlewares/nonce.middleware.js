const crypto = require('crypto');

/**
 * Nonce Generation Middleware for CSP
 *
 * Generates a cryptographically secure nonce for Content Security Policy
 * This allows inline scripts to execute only when they have the correct nonce attribute
 *
 * Usage:
 * - Middleware generates a unique nonce per request
 * - Nonce is stored in res.locals.cspNonce
 * - Include nonce in CSP header: script-src 'nonce-{nonce}'
 * - Add nonce attribute to inline scripts: <script nonce="{nonce}">
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src
 */
const generateNonce = (req, res, next) => {
    // Generate cryptographically secure random nonce (128 bits)
    // Base64 encoding for CSP compatibility
    const nonce = crypto.randomBytes(16).toString('base64');

    // Store nonce in response locals for use in templates/CSP header
    res.locals.cspNonce = nonce;

    // Optional: Add nonce to request object for logging/debugging
    req.cspNonce = nonce;

    next();
};

/**
 * Get the current request's CSP nonce
 * Utility function to retrieve nonce from response locals
 *
 * @param {object} res - Express response object
 * @returns {string|null} CSP nonce or null if not set
 */
const getCspNonce = (res) => {
    return res.locals.cspNonce || null;
};

module.exports = {
    generateNonce,
    getCspNonce
};
