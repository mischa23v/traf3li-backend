const BaseTransport = require('./baseTransport');
const logger = require('../../utils/logger');

/**
 * Azure Service Bus Transport for webhook delivery
 *
 * URL format: azure://[namespace].servicebus.windows.net/[queue-or-topic]
 * Example: azure://my-namespace.servicebus.windows.net/webhook-queue
 *
 * For topics with subscriptions:
 * azure://my-namespace.servicebus.windows.net/topic/webhook-events
 */
class AzureTransport extends BaseTransport {
    constructor() {
        super();
        this.name = 'azure';
        this.protocols = ['azure', 'azuresb'];
        this._serviceBusClient = null;
    }

    /**
     * Get or create Service Bus client lazily
     * @private
     */
    _getClient() {
        if (!this._serviceBusClient) {
            try {
                const { ServiceBusClient } = require('@azure/service-bus');

                const connectionString = process.env.AZURE_SERVICE_BUS_CONNECTION_STRING;
                if (!connectionString) {
                    throw new Error('AZURE_SERVICE_BUS_CONNECTION_STRING environment variable not set');
                }

                this._serviceBusClient = new ServiceBusClient(connectionString);
            } catch (error) {
                if (error.message.includes('AZURE_SERVICE_BUS_CONNECTION_STRING')) {
                    throw error;
                }
                logger.error('Azure Service Bus SDK not installed. Run: npm install @azure/service-bus');
                throw new Error('Azure Service Bus SDK not available');
            }
        }
        return this._serviceBusClient;
    }

    /**
     * Parse Azure URL into components
     * @param {String} url - Azure URL (azure://namespace.servicebus.windows.net/queue-or-topic)
     * @returns {Object} - { namespace, entityPath, isQueue }
     */
    parseAzureUrl(url) {
        // azure://my-namespace.servicebus.windows.net/my-queue
        // azure://my-namespace.servicebus.windows.net/topic/my-topic
        const match = url.match(/^(?:azure|azuresb):\/\/([^.]+)\.servicebus\.windows\.net\/(.+)$/);

        if (!match) {
            throw new Error(`Invalid Azure Service Bus URL format: ${url}. Expected: azure://namespace.servicebus.windows.net/queue-or-topic`);
        }

        const [, namespace, entityPath] = match;
        const pathParts = entityPath.split('/');
        const isQueue = pathParts[0] !== 'topic';

        return {
            namespace,
            entityPath: isQueue ? entityPath : pathParts.slice(1).join('/'),
            entityType: isQueue ? 'queue' : 'topic',
            fullyQualifiedNamespace: `${namespace}.servicebus.windows.net`
        };
    }

    /**
     * Deliver webhook via Azure Service Bus
     * @param {Object} webhook - Webhook configuration
     * @param {Object} payload - Event payload
     * @param {String} signature - HMAC signature
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Delivery result
     */
    async deliver(webhook, payload, signature, options = {}) {
        const startTime = Date.now();
        const url = webhook.url;
        let sender = null;

        try {
            const client = this._getClient();
            const azureConfig = this.parseAzureUrl(url);

            // Create sender for queue or topic
            sender = client.createSender(azureConfig.entityPath);

            // Prepare message
            const message = {
                body: payload,
                contentType: 'application/json',
                messageId: options.idempotencyKey || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                applicationProperties: {
                    webhookEvent: payload.event || options.event || 'unknown',
                    webhookSignature: signature,
                    timestamp: payload.timestamp || new Date().toISOString(),
                    firmId: String(payload.firmId || options.firmId || '')
                }
            };

            // Add session ID for session-enabled queues (FIFO-like)
            if (options.sessionId) {
                message.sessionId = options.sessionId;
            }

            // Add scheduled delivery time if specified
            if (options.scheduleAt) {
                message.scheduledEnqueueTimeUtc = new Date(options.scheduleAt);
            }

            // Add time-to-live if specified
            if (options.ttlSeconds) {
                message.timeToLive = options.ttlSeconds * 1000; // Convert to milliseconds
            }

            // Send message
            await sender.sendMessages(message);

            const duration = Date.now() - startTime;
            this.logDelivery(url, payload.event, true, duration);

            return {
                success: true,
                duration,
                messageId: message.messageId,
                transport: 'azure',
                entityPath: azureConfig.entityPath
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            this.logDelivery(url, payload.event, false, duration);

            logger.error('Azure Service Bus delivery error:', error);

            return {
                success: false,
                duration,
                error: error.message,
                errorCode: error.code,
                retryable: this._isRetryableAzureError(error),
                transport: 'azure'
            };

        } finally {
            // Close sender
            if (sender) {
                try {
                    await sender.close();
                } catch (closeError) {
                    logger.warn('Error closing Azure sender:', closeError.message);
                }
            }
        }
    }

    /**
     * Check if Azure error is retryable
     * @param {Error} error - Error object
     * @returns {Boolean}
     * @private
     */
    _isRetryableAzureError(error) {
        const retryableErrors = [
            'ServiceBusyException',
            'ServerBusyException',
            'ServiceUnavailableException',
            'TimeoutException',
            'QuotaExceededException'
        ];

        return retryableErrors.some(e =>
            error.name?.includes(e) ||
            error.code?.includes(e) ||
            error.message?.includes(e)
        ) || this.isRetryableError(error);
    }

    /**
     * Validate Azure URL
     * @param {String} url - URL to validate
     * @returns {Boolean}
     */
    validateUrl(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }

        try {
            this.parseAzureUrl(url);
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
                    connectionConfigured: !!process.env.AZURE_SERVICE_BUS_CONNECTION_STRING
                }
            };
        } catch (error) {
            return {
                transport: this.name,
                status: 'degraded',
                timestamp: new Date().toISOString(),
                error: error.message,
                details: {
                    sdkAvailable: false,
                    connectionConfigured: !!process.env.AZURE_SERVICE_BUS_CONNECTION_STRING
                }
            };
        }
    }

    /**
     * Cleanup resources
     */
    async close() {
        if (this._serviceBusClient) {
            await this._serviceBusClient.close();
            this._serviceBusClient = null;
        }
    }
}

module.exports = new AzureTransport();
