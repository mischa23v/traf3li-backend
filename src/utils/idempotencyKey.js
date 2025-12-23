const crypto = require('crypto');

/**
 * Idempotency Key Utilities
 *
 * Generates and validates idempotency keys for webhook payloads
 * to prevent duplicate processing of the same event.
 *
 * Format: {prefix}-{entityType}-{entityId}-{timestamp}-{random}
 * Example: wh-invoice-507f1f77bcf86cd799439011-1703318400000-a1b2c3
 */

/**
 * Generate an idempotency key for a webhook event
 *
 * @param {Object} options - Key generation options
 * @param {String} options.event - Event type (e.g., 'invoice.created')
 * @param {String} options.entityId - Entity ID being affected
 * @param {String} options.firmId - Firm ID for multi-tenancy
 * @param {Date} options.timestamp - Event timestamp (default: now)
 * @returns {String} - Idempotency key
 */
function generateIdempotencyKey(options = {}) {
    const {
        event = 'unknown',
        entityId = '',
        firmId = '',
        timestamp = new Date()
    } = options;

    const ts = timestamp instanceof Date ? timestamp.getTime() : timestamp;
    const random = crypto.randomBytes(4).toString('hex');

    // Extract entity type from event (e.g., 'invoice' from 'invoice.created')
    const entityType = event.split('.')[0] || 'entity';

    // Create components
    const components = [
        'wh',                           // Prefix
        entityType,                     // Entity type
        entityId ? String(entityId).slice(-12) : 'x',  // Last 12 chars of entity ID
        firmId ? String(firmId).slice(-8) : 'x',       // Last 8 chars of firm ID
        ts,                             // Timestamp
        random                          // Random suffix
    ];

    return components.join('-');
}

/**
 * Generate a deterministic idempotency key based on payload content
 * Same payload will always generate the same key (within time window)
 *
 * @param {Object} payload - Event payload
 * @param {Object} options - Options
 * @param {Number} options.windowMinutes - Time window for deduplication (default: 60)
 * @returns {String} - Deterministic idempotency key
 */
function generateDeterministicKey(payload, options = {}) {
    const { windowMinutes = 60 } = options;

    // Round timestamp to window for deterministic generation
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    const windowStart = Math.floor(now / windowMs) * windowMs;

    // Create hash of payload content
    const contentToHash = {
        event: payload.event,
        entityId: payload.data?._id || payload.data?.id || payload.entityId,
        firmId: payload.firmId,
        window: windowStart
    };

    const hash = crypto
        .createHash('sha256')
        .update(JSON.stringify(contentToHash))
        .digest('hex')
        .slice(0, 16);

    return `wh-det-${hash}-${windowStart}`;
}

/**
 * Parse an idempotency key to extract its components
 *
 * @param {String} key - Idempotency key to parse
 * @returns {Object} - Parsed components or null if invalid
 */
function parseIdempotencyKey(key) {
    if (!key || typeof key !== 'string') {
        return null;
    }

    // Check if deterministic key
    if (key.startsWith('wh-det-')) {
        const parts = key.split('-');
        return {
            type: 'deterministic',
            hash: parts[2],
            window: parseInt(parts[3], 10),
            raw: key
        };
    }

    // Parse standard key: wh-{entityType}-{entityId}-{firmId}-{timestamp}-{random}
    const parts = key.split('-');
    if (parts.length !== 6 || parts[0] !== 'wh') {
        return null;
    }

    return {
        type: 'standard',
        prefix: parts[0],
        entityType: parts[1],
        entityId: parts[2],
        firmId: parts[3],
        timestamp: parseInt(parts[4], 10),
        random: parts[5],
        raw: key
    };
}

/**
 * Validate an idempotency key format
 *
 * @param {String} key - Key to validate
 * @returns {Boolean} - True if valid format
 */
function validateIdempotencyKey(key) {
    const parsed = parseIdempotencyKey(key);
    if (!parsed) {
        return false;
    }

    // Validate deterministic key
    if (parsed.type === 'deterministic') {
        return parsed.hash && parsed.hash.length === 16 && !isNaN(parsed.window);
    }

    // Validate standard key
    return (
        parsed.entityType &&
        parsed.entityId &&
        !isNaN(parsed.timestamp) &&
        parsed.random &&
        parsed.random.length === 8
    );
}

/**
 * Check if an idempotency key is expired
 *
 * @param {String} key - Idempotency key
 * @param {Number} maxAgeMinutes - Maximum age in minutes (default: 1440 = 24 hours)
 * @returns {Boolean} - True if expired
 */
function isKeyExpired(key, maxAgeMinutes = 1440) {
    const parsed = parseIdempotencyKey(key);
    if (!parsed) {
        return true; // Invalid keys are considered expired
    }

    const now = Date.now();
    const maxAgeMs = maxAgeMinutes * 60 * 1000;
    const keyTimestamp = parsed.type === 'deterministic' ? parsed.window : parsed.timestamp;

    return (now - keyTimestamp) > maxAgeMs;
}

/**
 * Generate idempotency key for webhook payload
 * Adds the key to the payload object
 *
 * @param {Object} payload - Webhook payload
 * @param {Object} options - Generation options
 * @returns {Object} - Payload with idempotencyKey added
 */
function addIdempotencyKey(payload, options = {}) {
    const key = options.deterministic
        ? generateDeterministicKey(payload, options)
        : generateIdempotencyKey({
            event: payload.event,
            entityId: payload.data?._id || payload.data?.id,
            firmId: payload.firmId,
            timestamp: payload.timestamp
        });

    return {
        ...payload,
        idempotencyKey: key,
        metadata: {
            ...payload.metadata,
            idempotencyKey: key
        }
    };
}

/**
 * Extract idempotency key from webhook headers
 *
 * @param {Object} headers - Request headers
 * @returns {String|null} - Idempotency key or null
 */
function extractFromHeaders(headers) {
    const headerNames = [
        'x-idempotency-key',
        'idempotency-key',
        'x-request-id',
        'x-correlation-id'
    ];

    for (const name of headerNames) {
        const value = headers[name] || headers[name.toLowerCase()];
        if (value) {
            return value;
        }
    }

    return null;
}

/**
 * Create a cache key for idempotency storage
 *
 * @param {String} webhookId - Webhook ID
 * @param {String} idempotencyKey - Idempotency key
 * @returns {String} - Cache key
 */
function createCacheKey(webhookId, idempotencyKey) {
    return `idem:${webhookId}:${idempotencyKey}`;
}

module.exports = {
    generateIdempotencyKey,
    generateDeterministicKey,
    parseIdempotencyKey,
    validateIdempotencyKey,
    isKeyExpired,
    addIdempotencyKey,
    extractFromHeaders,
    createCacheKey
};
