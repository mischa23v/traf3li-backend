const logger = require('../../utils/logger');

/**
 * Base Transport Class
 * Provides common interface and functionality for all webhook transports
 */
class BaseTransport {
    constructor() {
        this.name = 'base';
        this.protocols = [];
    }

    /**
     * Deliver webhook payload
     * Must be implemented by subclasses
     * @param {Object} webhook - Webhook configuration
     * @param {Object} payload - Event payload
     * @param {String} signature - HMAC signature
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Delivery result { success, duration, response, error }
     */
    async deliver(webhook, payload, signature, options = {}) {
        throw new Error('deliver() must be implemented by subclass');
    }

    /**
     * Validate URL for this transport
     * @param {String} url - URL to validate
     * @returns {Boolean} - True if valid
     */
    validateUrl(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }

        try {
            const parsedUrl = new URL(url);
            return this.protocols.includes(parsedUrl.protocol.replace(':', ''));
        } catch (error) {
            return false;
        }
    }

    /**
     * Parse URL and extract transport-specific details
     * @param {String} url - URL to parse
     * @returns {Object} - Parsed URL details
     */
    parseUrl(url) {
        try {
            return new URL(url);
        } catch (error) {
            throw new Error(`Invalid URL: ${url}`);
        }
    }

    /**
     * Get health status of transport
     * @returns {Promise<Object>} - Health status
     */
    async getHealth() {
        return {
            transport: this.name,
            status: 'healthy',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Prepare delivery payload with metadata
     * @param {String} event - Event type
     * @param {Object} payload - Event payload
     * @param {ObjectId} firmId - Firm ID
     * @returns {Object} - Formatted payload
     */
    preparePayload(event, payload, firmId) {
        return {
            event,
            timestamp: new Date().toISOString(),
            data: payload,
            firmId: firmId?.toString()
        };
    }

    /**
     * Calculate payload size
     * @param {Object} payload - Payload object
     * @returns {Number} - Size in bytes
     */
    calculatePayloadSize(payload) {
        const payloadString = JSON.stringify(payload);
        return Buffer.byteLength(payloadString, 'utf8');
    }

    /**
     * Log delivery attempt
     * @param {String} url - Destination URL
     * @param {String} event - Event type
     * @param {Boolean} success - Success status
     * @param {Number} duration - Duration in ms
     */
    logDelivery(url, event, success, duration) {
        const level = success ? 'info' : 'warn';
        logger[level](`[${this.name.toUpperCase()}] Webhook delivery ${success ? 'succeeded' : 'failed'}`, {
            transport: this.name,
            url: this.sanitizeUrl(url),
            event,
            success,
            duration: `${duration}ms`
        });
    }

    /**
     * Sanitize URL for logging (remove sensitive data)
     * @param {String} url - URL to sanitize
     * @returns {String} - Sanitized URL
     */
    sanitizeUrl(url) {
        try {
            const parsed = new URL(url);
            // Remove auth credentials if present
            return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
        } catch (error) {
            return 'invalid-url';
        }
    }

    /**
     * Handle delivery error
     * @param {Error} error - Error object
     * @param {String} url - Destination URL
     * @returns {Object} - Error details
     */
    handleError(error) {
        logger.error(`[${this.name.toUpperCase()}] Webhook delivery error:`, {
            transport: this.name,
            error: error.message,
            code: error.code,
            stack: error.stack
        });

        return {
            success: false,
            error: error.message,
            errorCode: error.code,
            errorDetails: {
                message: error.message,
                code: error.code,
                name: error.name
            }
        };
    }

    /**
     * Check if error is retryable
     * @param {Error} error - Error object
     * @returns {Boolean} - True if retryable
     */
    isRetryableError(error) {
        // Network errors are typically retryable
        const retryableCodes = [
            'ECONNREFUSED',
            'ETIMEDOUT',
            'ENOTFOUND',
            'ECONNRESET',
            'EPIPE',
            'ENETUNREACH',
            'EAI_AGAIN'
        ];

        return retryableCodes.includes(error.code);
    }

    /**
     * Extract entity information from payload
     * @param {String} event - Event type
     * @param {Object} payload - Event payload
     * @returns {Object} - { entityType, entityId }
     */
    extractEntityInfo(event, payload) {
        const eventParts = event.split('.');
        const entityType = eventParts[0]; // e.g., 'client', 'case', 'invoice'

        // Try to find entity ID in various payload structures
        const entityId =
            payload._id ||
            payload.id ||
            payload.data?._id ||
            payload.data?.id ||
            payload[`${entityType}Id`] ||
            null;

        return {
            entityType: ['client', 'case', 'invoice', 'payment', 'lead'].includes(entityType)
                ? entityType
                : null,
            entityId
        };
    }
}

module.exports = BaseTransport;
