const BaseTransport = require('./baseTransport');
const httpTransport = require('./httpTransport');
const sqsTransport = require('./sqsTransport');
const pubsubTransport = require('./pubsubTransport');
const azureTransport = require('./azureTransport');
const logger = require('../../utils/logger');

/**
 * Transport Registry
 * Maps URL schemes to their respective transport implementations
 */
const TRANSPORT_REGISTRY = {
    'http': httpTransport,
    'https': httpTransport,
    'awssqs': sqsTransport,
    'gcpubsub': pubsubTransport,
    'azure': azureTransport,
    'azuresb': azureTransport
};

/**
 * Get transport for a given URL
 * @param {String} url - Webhook target URL
 * @returns {BaseTransport} - Transport instance
 */
function getTransport(url) {
    if (!url || typeof url !== 'string') {
        throw new Error('Invalid webhook URL');
    }

    try {
        const protocol = new URL(url).protocol.replace(':', '');
        const transport = TRANSPORT_REGISTRY[protocol];

        if (!transport) {
            throw new Error(`Unsupported transport protocol: ${protocol}`);
        }

        return transport;
    } catch (error) {
        if (error.message.includes('Unsupported transport')) {
            throw error;
        }
        throw new Error(`Invalid webhook URL: ${error.message}`);
    }
}

/**
 * Detect transport type from URL
 * @param {String} url - Webhook target URL
 * @returns {String} - Transport name (http, sqs, pubsub, azure)
 */
function detectTransport(url) {
    try {
        const transport = getTransport(url);
        return transport.name;
    } catch (error) {
        return null;
    }
}

/**
 * Validate URL for any supported transport
 * @param {String} url - URL to validate
 * @returns {Object} - { valid: Boolean, transport: String, error: String }
 */
function validateUrl(url) {
    try {
        const transport = getTransport(url);
        const valid = transport.validateUrl(url);

        return {
            valid,
            transport: transport.name,
            error: valid ? null : 'URL validation failed'
        };
    } catch (error) {
        return {
            valid: false,
            transport: null,
            error: error.message
        };
    }
}

/**
 * Deliver webhook using appropriate transport
 * @param {Object} webhook - Webhook configuration
 * @param {Object} payload - Event payload
 * @param {String} signature - HMAC/JWS signature
 * @param {Object} options - Delivery options
 * @returns {Promise<Object>} - Delivery result
 */
async function deliver(webhook, payload, signature, options = {}) {
    const transport = getTransport(webhook.url);
    return transport.deliver(webhook, payload, signature, options);
}

/**
 * Deliver synchronous webhook (HTTP only)
 * @param {Object} webhook - Webhook configuration
 * @param {Object} payload - Event payload
 * @param {String} signature - Signature
 * @param {Object} options - Options
 * @returns {Promise<Object>} - Response or error
 */
async function deliverSync(webhook, payload, signature, options = {}) {
    const transport = getTransport(webhook.url);

    // Only HTTP transport supports synchronous webhooks
    if (transport.name !== 'http') {
        throw new Error(`Synchronous webhooks only supported for HTTP/HTTPS. Got: ${transport.name}`);
    }

    return transport.deliverSync(webhook, payload, signature, options);
}

/**
 * Get health status of all transports
 * @returns {Promise<Object>} - Health status for each transport
 */
async function getHealthStatus() {
    const transports = [httpTransport, sqsTransport, pubsubTransport, azureTransport];
    const results = {};

    await Promise.all(
        transports.map(async (transport) => {
            try {
                results[transport.name] = await transport.getHealth();
            } catch (error) {
                results[transport.name] = {
                    transport: transport.name,
                    status: 'error',
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        })
    );

    return results;
}

/**
 * Get list of supported protocols
 * @returns {Array<String>}
 */
function getSupportedProtocols() {
    return Object.keys(TRANSPORT_REGISTRY);
}

/**
 * Get transport documentation
 * @returns {Object}
 */
function getTransportDocs() {
    return {
        http: {
            name: 'HTTP/HTTPS',
            protocols: ['http', 'https'],
            description: 'Standard HTTP webhook delivery',
            urlFormat: 'https://example.com/webhook',
            example: 'https://api.example.com/webhooks/receive',
            features: ['Synchronous support', 'Custom headers', 'Retry on failure']
        },
        sqs: {
            name: 'AWS SQS',
            protocols: ['awssqs'],
            description: 'Amazon Simple Queue Service',
            urlFormat: 'awssqs://[region]/[account-id]/[queue-name]',
            example: 'awssqs://us-east-1/123456789012/webhook-queue',
            features: ['FIFO queues', 'Message deduplication', 'At-least-once delivery'],
            requirements: ['@aws-sdk/client-sqs', 'AWS credentials configured']
        },
        pubsub: {
            name: 'Google Cloud Pub/Sub',
            protocols: ['gcpubsub'],
            description: 'Google Cloud Pub/Sub messaging',
            urlFormat: 'gcpubsub://[project-id]/[topic-name]',
            example: 'gcpubsub://my-project/webhook-events',
            features: ['Message ordering', 'At-least-once delivery', 'Global availability'],
            requirements: ['@google-cloud/pubsub', 'GCP credentials configured']
        },
        azure: {
            name: 'Azure Service Bus',
            protocols: ['azure', 'azuresb'],
            description: 'Azure Service Bus messaging',
            urlFormat: 'azure://[namespace].servicebus.windows.net/[queue-or-topic]',
            example: 'azure://my-namespace.servicebus.windows.net/webhook-queue',
            features: ['Sessions (FIFO)', 'Scheduled messages', 'Dead-lettering'],
            requirements: ['@azure/service-bus', 'AZURE_SERVICE_BUS_CONNECTION_STRING']
        }
    };
}

module.exports = {
    BaseTransport,
    httpTransport,
    sqsTransport,
    pubsubTransport,
    azureTransport,
    getTransport,
    detectTransport,
    validateUrl,
    deliver,
    deliverSync,
    getHealthStatus,
    getSupportedProtocols,
    getTransportDocs,
    TRANSPORT_REGISTRY
};
