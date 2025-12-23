const BaseTransport = require('./baseTransport');
const logger = require('../../utils/logger');

/**
 * Google Cloud Pub/Sub Transport for webhook delivery
 *
 * URL format: gcpubsub://[project-id]/[topic-name]
 * Example: gcpubsub://my-project/webhook-events
 */
class PubSubTransport extends BaseTransport {
    constructor() {
        super();
        this.name = 'pubsub';
        this.protocols = ['gcpubsub'];
        this._pubsubClient = null;
    }

    /**
     * Get or create Pub/Sub client lazily
     * @private
     */
    _getClient() {
        if (!this._pubsubClient) {
            try {
                const { PubSub } = require('@google-cloud/pubsub');
                this._pubsubClient = new PubSub({
                    projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID
                });
            } catch (error) {
                logger.error('Google Cloud Pub/Sub SDK not installed. Run: npm install @google-cloud/pubsub');
                throw new Error('Google Cloud Pub/Sub SDK not available');
            }
        }
        return this._pubsubClient;
    }

    /**
     * Parse Pub/Sub URL into components
     * @param {String} url - Pub/Sub URL (gcpubsub://project-id/topic-name)
     * @returns {Object} - { projectId, topicName }
     */
    parsePubSubUrl(url) {
        // gcpubsub://my-project/my-topic
        const match = url.match(/^gcpubsub:\/\/([^/]+)\/(.+)$/);

        if (!match) {
            throw new Error(`Invalid Pub/Sub URL format: ${url}. Expected: gcpubsub://project-id/topic-name`);
        }

        const [, projectId, topicName] = match;

        return {
            projectId,
            topicName,
            fullTopicName: `projects/${projectId}/topics/${topicName}`
        };
    }

    /**
     * Deliver webhook via Google Cloud Pub/Sub
     * @param {Object} webhook - Webhook configuration
     * @param {Object} payload - Event payload
     * @param {String} signature - HMAC signature
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Delivery result
     */
    async deliver(webhook, payload, signature, options = {}) {
        const startTime = Date.now();
        const url = webhook.url;

        try {
            const client = this._getClient();
            const pubsubConfig = this.parsePubSubUrl(url);

            // Get or create topic reference
            const topic = client.topic(pubsubConfig.topicName, {
                // Enable message ordering if we have an ordering key
                enableMessageOrdering: !!options.orderingKey
            });

            // Prepare message attributes
            const attributes = {
                webhookEvent: payload.event || options.event || 'unknown',
                webhookSignature: signature,
                timestamp: payload.timestamp || new Date().toISOString(),
                firmId: String(payload.firmId || options.firmId || ''),
                contentType: 'application/json'
            };

            // Add idempotency key if provided
            if (options.idempotencyKey) {
                attributes.idempotencyKey = options.idempotencyKey;
            }

            // Prepare message
            const messageData = Buffer.from(JSON.stringify(payload));

            const messageOptions = {
                data: messageData,
                attributes
            };

            // Add ordering key if provided (for FIFO-like behavior)
            if (options.orderingKey) {
                messageOptions.orderingKey = options.orderingKey;
            }

            // Publish message
            const messageId = await topic.publishMessage(messageOptions);

            const duration = Date.now() - startTime;
            this.logDelivery(url, payload.event, true, duration);

            return {
                success: true,
                duration,
                messageId,
                transport: 'pubsub',
                topic: pubsubConfig.topicName
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            this.logDelivery(url, payload.event, false, duration);

            logger.error('Pub/Sub delivery error:', error);

            return {
                success: false,
                duration,
                error: error.message,
                errorCode: error.code,
                retryable: this._isRetryablePubSubError(error),
                transport: 'pubsub'
            };
        }
    }

    /**
     * Check if Pub/Sub error is retryable
     * @param {Error} error - Error object
     * @returns {Boolean}
     * @private
     */
    _isRetryablePubSubError(error) {
        // gRPC error codes that are retryable
        const retryableCodes = [
            1,  // CANCELLED
            4,  // DEADLINE_EXCEEDED
            8,  // RESOURCE_EXHAUSTED
            10, // ABORTED
            13, // INTERNAL
            14  // UNAVAILABLE
        ];

        return retryableCodes.includes(error.code) || this.isRetryableError(error);
    }

    /**
     * Validate Pub/Sub URL
     * @param {String} url - URL to validate
     * @returns {Boolean}
     */
    validateUrl(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }

        try {
            this.parsePubSubUrl(url);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get health status
     */
    async getHealth() {
        try {
            this._getClient();
            return {
                transport: this.name,
                status: 'healthy',
                timestamp: new Date().toISOString(),
                details: {
                    sdkAvailable: true,
                    projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID || 'not-set'
                }
            };
        } catch (error) {
            return {
                transport: this.name,
                status: 'degraded',
                timestamp: new Date().toISOString(),
                error: error.message,
                details: {
                    sdkAvailable: false
                }
            };
        }
    }
}

module.exports = new PubSubTransport();
