const axios = require('axios');
const BaseTransport = require('./baseTransport');
const logger = require('../../utils/logger');

/**
 * HTTP/HTTPS Transport for webhook delivery
 */
class HTTPTransport extends BaseTransport {
    constructor() {
        super();
        this.name = 'http';
        this.protocols = ['http', 'https'];

        // Create axios instance with defaults
        this.client = axios.create({
            timeout: 30000, // 30 seconds default
            maxRedirects: 5,
            validateStatus: (status) => status >= 200 && status < 500,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Traf3li-Webhook/1.0'
            }
        });
    }

    /**
     * Deliver webhook via HTTP/HTTPS POST
     * @param {Object} webhook - Webhook configuration
     * @param {Object} payload - Event payload
     * @param {String} signature - HMAC/JWS signature
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Delivery result
     */
    async deliver(webhook, payload, signature, options = {}) {
        const startTime = Date.now();
        const url = webhook.url;
        const timeout = options.timeout || webhook.syncConfig?.timeout || 30000;

        try {
            // Prepare headers
            const headers = {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': signature,
                'X-Webhook-Event': payload.event || options.event,
                'X-Webhook-Timestamp': payload.timestamp || new Date().toISOString(),
                'X-Webhook-Delivery-Id': options.deliveryId || this._generateDeliveryId()
            };

            // Add idempotency key if provided
            if (options.idempotencyKey) {
                headers['X-Idempotency-Key'] = options.idempotencyKey;
            }

            // Add custom headers from webhook config
            if (webhook.headers && webhook.headers instanceof Map) {
                webhook.headers.forEach((value, key) => {
                    headers[key] = value;
                });
            } else if (webhook.headers && typeof webhook.headers === 'object') {
                Object.entries(webhook.headers).forEach(([key, value]) => {
                    headers[key] = value;
                });
            }

            // Make the request
            const response = await this.client.post(url, payload, {
                headers,
                timeout
            });

            const duration = Date.now() - startTime;
            const success = response.status >= 200 && response.status < 300;

            this.logDelivery(url, payload.event, success, duration);

            return {
                success,
                statusCode: response.status,
                duration,
                response: response.data,
                headers: response.headers
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            this.logDelivery(url, payload.event, false, duration);

            // Handle timeout errors
            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                return {
                    success: false,
                    duration,
                    error: 'Request timeout',
                    errorCode: 'TIMEOUT',
                    retryable: true
                };
            }

            // Handle network errors
            if (this.isRetryableError(error)) {
                return {
                    success: false,
                    duration,
                    error: error.message,
                    errorCode: error.code,
                    retryable: true
                };
            }

            // Handle HTTP errors with response
            if (error.response) {
                return {
                    success: false,
                    statusCode: error.response.status,
                    duration,
                    error: error.message,
                    response: error.response.data,
                    retryable: error.response.status >= 500
                };
            }

            return this.handleError(error);
        }
    }

    /**
     * Deliver synchronous webhook and wait for response
     * @param {Object} webhook - Webhook configuration
     * @param {Object} payload - Event payload
     * @param {String} signature - Signature
     * @param {Object} options - Options including expectedSchema
     * @returns {Promise<Object>} - Response data or error
     */
    async deliverSync(webhook, payload, signature, options = {}) {
        const result = await this.deliver(webhook, payload, signature, options);

        if (!result.success) {
            return {
                success: false,
                error: result.error,
                fallback: true
            };
        }

        // Validate response schema if expected
        if (options.expectedSchema && result.response) {
            const validationResult = this._validateResponseSchema(result.response, options.expectedSchema);
            if (!validationResult.valid) {
                logger.warn('Webhook response schema validation failed:', validationResult.errors);
                return {
                    success: false,
                    error: 'Response schema validation failed',
                    validationErrors: validationResult.errors,
                    fallback: true
                };
            }
        }

        return {
            success: true,
            data: result.response,
            duration: result.duration
        };
    }

    /**
     * Generate unique delivery ID
     * @private
     */
    _generateDeliveryId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Validate response against expected schema
     * @param {Object} response - Response data
     * @param {Object} schema - Expected schema { fieldName: 'type' }
     * @returns {Object} - { valid: Boolean, errors: Array }
     * @private
     */
    _validateResponseSchema(response, schema) {
        const errors = [];

        for (const [field, expectedType] of Object.entries(schema)) {
            if (!Object.prototype.hasOwnProperty.call(response, field)) {
                errors.push(`Missing required field: ${field}`);
                continue;
            }

            const actualType = Array.isArray(response[field]) ? 'array' : typeof response[field];
            if (actualType !== expectedType) {
                errors.push(`Field ${field} expected ${expectedType}, got ${actualType}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Check health of HTTP transport
     */
    async getHealth() {
        return {
            transport: this.name,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            details: {
                timeout: this.client.defaults.timeout,
                maxRedirects: this.client.defaults.maxRedirects
            }
        };
    }
}

module.exports = new HTTPTransport();
