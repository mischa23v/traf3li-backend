const BaseTransport = require('./baseTransport');
const logger = require('../../utils/logger');

/**
 * AWS SQS Transport for webhook delivery
 * Supports both standard and FIFO queues
 *
 * URL format: awssqs://[region]/[account-id]/[queue-name]
 * Example: awssqs://us-east-1/123456789012/my-webhook-queue
 *
 * For FIFO queues, append .fifo to queue name:
 * awssqs://us-east-1/123456789012/my-webhook-queue.fifo
 */
class SQSTransport extends BaseTransport {
    constructor() {
        super();
        this.name = 'sqs';
        this.protocols = ['awssqs'];
        this._sqsClient = null;
    }

    /**
     * Get or create SQS client lazily
     * @private
     */
    _getClient() {
        if (!this._sqsClient) {
            try {
                // Dynamically import AWS SDK to avoid loading if not used
                const { SQSClient } = require('@aws-sdk/client-sqs');

                this._sqsClient = new SQSClient({
                    region: process.env.AWS_REGION || 'us-east-1'
                });
            } catch (error) {
                logger.error('AWS SDK not installed. Run: npm install @aws-sdk/client-sqs');
                throw new Error('AWS SDK not available');
            }
        }
        return this._sqsClient;
    }

    /**
     * Parse SQS URL into components
     * @param {String} url - SQS URL (awssqs://region/account-id/queue-name)
     * @returns {Object} - { region, accountId, queueName, queueUrl, isFifo }
     */
    parseSQSUrl(url) {
        // awssqs://us-east-1/123456789012/my-queue
        const match = url.match(/^awssqs:\/\/([^/]+)\/([^/]+)\/(.+)$/);

        if (!match) {
            throw new Error(`Invalid SQS URL format: ${url}. Expected: awssqs://region/account-id/queue-name`);
        }

        const [, region, accountId, queueName] = match;
        const isFifo = queueName.endsWith('.fifo');

        return {
            region,
            accountId,
            queueName,
            queueUrl: `https://sqs.${region}.amazonaws.com/${accountId}/${queueName}`,
            isFifo
        };
    }

    /**
     * Deliver webhook via AWS SQS
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
            const { SendMessageCommand } = require('@aws-sdk/client-sqs');
            const client = this._getClient();
            const sqsConfig = this.parseSQSUrl(url);

            // Prepare message attributes
            const messageAttributes = {
                'WebhookEvent': {
                    DataType: 'String',
                    StringValue: payload.event || options.event || 'unknown'
                },
                'WebhookSignature': {
                    DataType: 'String',
                    StringValue: signature
                },
                'Timestamp': {
                    DataType: 'String',
                    StringValue: payload.timestamp || new Date().toISOString()
                },
                'FirmId': {
                    DataType: 'String',
                    StringValue: String(payload.firmId || options.firmId || '')
                }
            };

            // Add idempotency key if provided
            if (options.idempotencyKey) {
                messageAttributes['IdempotencyKey'] = {
                    DataType: 'String',
                    StringValue: options.idempotencyKey
                };
            }

            // Prepare message params
            const params = {
                QueueUrl: sqsConfig.queueUrl,
                MessageBody: JSON.stringify(payload),
                MessageAttributes: messageAttributes
            };

            // For FIFO queues, add required parameters
            if (sqsConfig.isFifo) {
                // Use event type as message group for ordering
                params.MessageGroupId = payload.event || 'webhook';

                // Use idempotency key or generate deduplication ID
                params.MessageDeduplicationId = options.idempotencyKey ||
                    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            }

            // Send message
            const command = new SendMessageCommand(params);
            const result = await client.send(command);

            const duration = Date.now() - startTime;
            this.logDelivery(url, payload.event, true, duration);

            return {
                success: true,
                duration,
                messageId: result.MessageId,
                sequenceNumber: result.SequenceNumber,
                transport: 'sqs'
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            this.logDelivery(url, payload.event, false, duration);

            logger.error('SQS delivery error:', error);

            return {
                success: false,
                duration,
                error: error.message,
                errorCode: error.code || error.name,
                retryable: this._isRetryableSQSError(error),
                transport: 'sqs'
            };
        }
    }

    /**
     * Check if SQS error is retryable
     * @param {Error} error - Error object
     * @returns {Boolean}
     * @private
     */
    _isRetryableSQSError(error) {
        const retryableErrors = [
            'ServiceUnavailable',
            'ThrottlingException',
            'RequestThrottled',
            'ProvisionedThroughputExceededException',
            'InternalServerError'
        ];

        return retryableErrors.includes(error.name) ||
               retryableErrors.includes(error.code) ||
               this.isRetryableError(error);
    }

    /**
     * Validate SQS URL
     * @param {String} url - URL to validate
     * @returns {Boolean}
     */
    validateUrl(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }

        try {
            this.parseSQSUrl(url);
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
            // Just check if we can create client
            this._getClient();
            return {
                transport: this.name,
                status: 'healthy',
                timestamp: new Date().toISOString(),
                details: {
                    sdkAvailable: true,
                    region: process.env.AWS_REGION || 'us-east-1'
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

module.exports = new SQSTransport();
