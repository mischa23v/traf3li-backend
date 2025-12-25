const crypto = require('crypto');
const axios = require('axios');
const Webhook = require('../models/webhook.model');
const WebhookDelivery = require('../models/webhookDelivery.model');
const { validateWebhookUrl } = require('../utils/urlValidator');
const logger = require('../utils/logger');

/**
 * Webhook Service
 * Handles webhook registration, triggering, delivery, and retry logic
 */
class WebhookService {
    /**
     * Register a new webhook
     * @param {Object} webhookData - Webhook configuration
     * @returns {Promise<Webhook>}
     */
    async register(webhookData) {
        const { url, events, firmId, createdBy, name, description, headers, retryPolicy, filters, metadata } = webhookData;

        // Generate a random secret for signature verification
        const secret = this.generateSecret();

        const webhook = await Webhook.create({
            firmId,
            url,
            name,
            description,
            events,
            secret,
            headers: headers || {},
            retryPolicy: retryPolicy || {},
            filters: filters || {},
            metadata: metadata || {},
            createdBy,
            isActive: true
        });

        return webhook;
    }

    /**
     * Trigger webhooks for a specific event
     * @param {String} event - Event type (e.g., 'client.created')
     * @param {Object} payload - Event payload
     * @param {ObjectId} firmId - Firm ID
     * @param {Object} options - Additional options
     */
    async trigger(event, payload, firmId, options = {}) {
        try {
            // Get active webhooks subscribed to this event
            const webhooks = await Webhook.getActiveWebhooksForEvent(event, firmId);

            if (webhooks.length === 0) {
                logger.info(`No active webhooks found for event: ${event} in firm: ${firmId}`);
                return;
            }

            // Apply filters if provided
            const filteredWebhooks = this.applyFilters(webhooks, payload, options);

            // Trigger all filtered webhooks asynchronously
            const deliveryPromises = filteredWebhooks.map(webhook =>
                this.deliver(webhook._id, event, payload, options)
            );

            // Don't wait for deliveries to complete (fire and forget)
            // But catch any errors to prevent unhandled rejections
            Promise.allSettled(deliveryPromises).catch(err => {
                logger.error('Error in webhook deliveries:', err);
            });

            return {
                triggered: filteredWebhooks.length,
                webhooks: filteredWebhooks.map(w => w._id)
            };
        } catch (error) {
            logger.error('Error triggering webhooks:', error);
            throw error;
        }
    }

    /**
     * Deliver webhook to endpoint
     * @param {ObjectId} webhookId - Webhook ID
     * @param {String} event - Event type
     * @param {Object} payload - Event payload
     * @param {Object} options - Additional options
     */
    async deliver(webhookId, event, payload, options = {}) {
        const startTime = Date.now();

        try {
            // Get webhook details
            const webhook = await Webhook.findById(webhookId).select('+secret');

            if (!webhook) {
                throw new Error('Webhook not found');
            }

            if (!webhook.isActive) {
                logger.info(`Webhook ${webhookId} is inactive, skipping delivery`);
                return;
            }

            // Prepare payload with metadata
            const deliveryPayload = {
                event,
                timestamp: new Date().toISOString(),
                data: payload,
                firmId: webhook.firmId
            };

            // Calculate payload size
            const payloadString = JSON.stringify(deliveryPayload);
            const payloadSize = Buffer.byteLength(payloadString, 'utf8');

            // Generate signature
            const signature = this.generateSignature(deliveryPayload, webhook.secret);

            // Prepare headers
            const headers = {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': signature,
                'X-Webhook-Event': event,
                'X-Webhook-ID': webhookId.toString(),
                'X-Webhook-Timestamp': deliveryPayload.timestamp,
                'User-Agent': 'Traf3li-Webhook/1.0'
            };

            // Add custom headers from webhook configuration
            if (webhook.headers) {
                webhook.headers.forEach((value, key) => {
                    headers[key] = value;
                });
            }

            // Determine entity type and ID from payload
            const { entityType, entityId } = this.extractEntityInfo(event, payload);

            // Create delivery record
            const delivery = await WebhookDelivery.create({
                firmId: webhook.firmId,
                webhookId: webhook._id,
                event,
                payload: deliveryPayload,
                payloadSize,
                entityType,
                entityId,
                url: webhook.url,
                method: 'POST',
                headers,
                signature,
                maxAttempts: webhook.retryPolicy?.maxAttempts || 3,
                status: 'pending'
            });

            // Attempt delivery
            await this.attemptDelivery(delivery, webhook, headers, deliveryPayload);

            return delivery;
        } catch (error) {
            logger.error('Error in webhook delivery:', error);
            throw error;
        }
    }

    /**
     * Attempt webhook delivery
     * @param {WebhookDelivery} delivery - Delivery record
     * @param {Webhook} webhook - Webhook configuration
     * @param {Object} headers - HTTP headers
     * @param {Object} payload - Delivery payload
     */
    async attemptDelivery(delivery, webhook, headers, payload) {
        const startTime = Date.now();

        try {
            // DNS Rebinding Protection: Re-validate URL before each delivery
            // This prevents attacks where DNS resolution changes between webhook creation and delivery
            try {
                await validateWebhookUrl(webhook.url, {
                    allowHttp: process.env.NODE_ENV !== 'production',
                    resolveDNS: true
                });
            } catch (validationError) {
                // URL validation failed at delivery time
                logger.error(`URL validation failed for webhook ${webhook._id}:`, validationError.message);

                // Record failed attempt with validation error
                await delivery.recordAttempt({
                    status: 'failed',
                    httpStatus: null,
                    duration: Date.now() - startTime,
                    error: `URL validation failed: ${validationError.message}`,
                    errorDetails: JSON.stringify({
                        type: 'SSRF_PROTECTION',
                        message: validationError.message
                    })
                });

                // Update webhook statistics
                await webhook.updateStatistics(false, Date.now() - startTime);

                // Auto-disable webhook if URL is no longer valid
                if (webhook.isActive) {
                    await webhook.disable(
                        `URL validation failed: ${validationError.message}`,
                        null
                    );
                    logger.info(`Webhook ${webhook._id} auto-disabled due to URL validation failure`);
                }

                return false;
            }

            // Make HTTP request with SSRF protection
            const response = await axios.post(webhook.url, payload, {
                headers,
                timeout: 30000, // 30 seconds timeout
                maxRedirects: 5, // Limit redirects to prevent redirect-based SSRF attacks
                validateStatus: (status) => status < 500 // Accept all non-5xx as valid
            });

            const duration = Date.now() - startTime;

            // Check if response indicates success (2xx status codes)
            const success = response.status >= 200 && response.status < 300;

            // Record attempt
            await delivery.recordAttempt({
                status: success ? 'success' : 'failed',
                httpStatus: response.status,
                duration,
                error: success ? null : `HTTP ${response.status}: ${response.statusText}`
            });

            // Update webhook statistics
            await webhook.updateStatistics(success, duration);

            // Store response
            delivery.response = {
                status: response.status,
                statusText: response.statusText,
                body: typeof response.data === 'string'
                    ? response.data.substring(0, 5000)
                    : JSON.stringify(response.data).substring(0, 5000),
                headers: response.headers
            };

            await delivery.save();

            if (!success) {
                logger.warn(`Webhook delivery failed with status ${response.status}`);
            }

            return success;
        } catch (error) {
            const duration = Date.now() - startTime;

            // Extract error details
            const errorDetails = {
                code: error.code,
                message: error.message,
                stack: error.stack
            };

            // Determine if error is retryable
            const isNetworkError = error.code === 'ECONNREFUSED' ||
                                   error.code === 'ETIMEDOUT' ||
                                   error.code === 'ENOTFOUND';

            // Record failed attempt
            await delivery.recordAttempt({
                status: 'failed',
                httpStatus: error.response?.status,
                duration,
                error: error.message,
                errorDetails: JSON.stringify(errorDetails)
            });

            // Update webhook statistics
            await webhook.updateStatistics(false, duration);

            logger.error('Webhook delivery error:', error.message);

            return false;
        }
    }

    /**
     * Retry failed webhooks
     */
    async retryFailed() {
        try {
            // Get deliveries that need retry
            const deliveries = await WebhookDelivery.getPendingRetries();

            logger.info(`Found ${deliveries.length} webhook deliveries to retry`);

            for (const delivery of deliveries) {
                try {
                    const webhook = delivery.webhookId;

                    if (!webhook || !webhook.isActive) {
                        logger.info(`Skipping retry for inactive webhook ${delivery.webhookId}`);
                        continue;
                    }

                    // Prepare headers
                    const headers = {
                        'Content-Type': 'application/json',
                        'X-Webhook-Signature': delivery.signature,
                        'X-Webhook-Event': delivery.event,
                        'X-Webhook-ID': webhook._id.toString(),
                        'X-Webhook-Timestamp': new Date().toISOString(),
                        'X-Webhook-Retry': delivery.currentAttempt + 1,
                        'User-Agent': 'Traf3li-Webhook/1.0'
                    };

                    // Add custom headers
                    if (webhook.headers) {
                        webhook.headers.forEach((value, key) => {
                            headers[key] = value;
                        });
                    }

                    // Attempt delivery
                    await this.attemptDelivery(delivery, webhook, headers, delivery.payload);
                } catch (error) {
                    logger.error(`Error retrying delivery ${delivery._id}:`, error);
                }
            }

            return deliveries.length;
        } catch (error) {
            logger.error('Error in retryFailed:', error);
            throw error;
        }
    }

    /**
     * Get delivery history for a webhook
     * @param {ObjectId} webhookId - Webhook ID
     * @param {Object} options - Query options
     */
    async getDeliveryHistory(webhookId, options = {}) {
        return await WebhookDelivery.getDeliveriesForWebhook(webhookId, options);
    }

    /**
     * Verify webhook signature
     * @param {Object} payload - Request payload
     * @param {String} signature - Received signature
     * @param {String} secret - Webhook secret
     * @returns {Boolean}
     */
    verifySignature(payload, signature, secret) {
        const expectedSignature = this.generateSignature(payload, secret);

        // Use timing-safe comparison to prevent timing attacks
        try {
            return crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            );
        } catch {
            return false;
        }
    }

    /**
     * Generate HMAC signature for payload
     * @param {Object} payload - Data to sign
     * @param {String} secret - Secret key
     * @returns {String} - HMAC signature
     */
    generateSignature(payload, secret) {
        const payloadString = typeof payload === 'string'
            ? payload
            : JSON.stringify(payload);

        return crypto
            .createHmac('sha256', secret)
            .update(payloadString)
            .digest('hex');
    }

    /**
     * Generate random secret for webhook
     * @returns {String}
     */
    generateSecret() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Apply filters to webhooks
     * @param {Array} webhooks - List of webhooks
     * @param {Object} payload - Event payload
     * @param {Object} options - Additional options
     * @returns {Array} - Filtered webhooks
     */
    applyFilters(webhooks, payload, options) {
        return webhooks.filter(webhook => {
            if (!webhook.filters || Object.keys(webhook.filters).length === 0) {
                return true; // No filters, include webhook
            }

            const filters = webhook.filters;

            // Filter by client IDs
            if (filters.clientIds && filters.clientIds.length > 0) {
                const clientId = payload.clientId || payload.data?.clientId;
                if (!clientId || !filters.clientIds.some(id => id.toString() === clientId.toString())) {
                    return false;
                }
            }

            // Filter by case IDs
            if (filters.caseIds && filters.caseIds.length > 0) {
                const caseId = payload.caseId || payload.data?.caseId;
                if (!caseId || !filters.caseIds.some(id => id.toString() === caseId.toString())) {
                    return false;
                }
            }

            // Filter by status
            if (filters.statuses && filters.statuses.length > 0) {
                const status = payload.status || payload.data?.status;
                if (!status || !filters.statuses.includes(status)) {
                    return false;
                }
            }

            // Filter by amount range
            if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
                const amount = payload.amount || payload.data?.amount || payload.data?.totalAmount;
                if (amount !== undefined) {
                    if (filters.minAmount !== undefined && amount < filters.minAmount) {
                        return false;
                    }
                    if (filters.maxAmount !== undefined && amount > filters.maxAmount) {
                        return false;
                    }
                }
            }

            return true;
        });
    }

    /**
     * Extract entity information from event and payload
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
            entityType: ['client', 'case', 'invoice', 'payment', 'lead'].includes(entityType) ? entityType : null,
            entityId
        };
    }

    /**
     * Test webhook - sends a test event
     * @param {ObjectId} webhookId - Webhook ID
     * @param {Object} testData - Optional test data
     */
    async testWebhook(webhookId, testData = {}) {
        const webhook = await Webhook.findById(webhookId).select('+secret');

        if (!webhook) {
            throw new Error('Webhook not found');
        }

        const testPayload = {
            test: true,
            message: 'This is a test webhook delivery',
            timestamp: new Date().toISOString(),
            ...testData
        };

        // Use the first subscribed event for testing
        const testEvent = webhook.events[0] || 'test.event';

        return await this.deliver(webhookId, testEvent, testPayload, { isTest: true });
    }

    /**
     * Disable webhook due to repeated failures
     * @param {ObjectId} webhookId - Webhook ID
     * @param {String} reason - Reason for disabling
     */
    async autoDisableWebhook(webhookId, reason) {
        const webhook = await Webhook.findById(webhookId);

        if (!webhook) {
            return;
        }

        // Check failure rate
        if (webhook.failureRate > 80 && webhook.statistics.totalDeliveries > 10) {
            await webhook.disable(reason || 'High failure rate detected', null);
            logger.info(`Webhook ${webhookId} auto-disabled due to high failure rate`);
        }
    }

    /**
     * Get webhook statistics
     * @param {ObjectId} firmId - Firm ID
     */
    async getStats(firmId) {
        const webhookStats = await Webhook.getWebhookStats(firmId);
        const deliveryStats = await WebhookDelivery.getDeliveryStats({ firmId });

        return {
            webhooks: webhookStats,
            deliveries: deliveryStats
        };
    }

    /**
     * Create webhook
     * @param {Object} data - Webhook data
     * @param {String} userId - User ID creating the webhook
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} - Created webhook
     */
    async createWebhook(data, userId, firmId) {
        const { url, events, name, description, headers, retryPolicy, filters, metadata, timeout } = data;

        // Generate a random secret for signature verification
        const secret = this.generateSecret();

        const webhook = await Webhook.create({
            firmId,
            url,
            name,
            description,
            events,
            secret,
            headers: headers || {},
            retryPolicy: retryPolicy || {},
            filters: filters || {},
            metadata: metadata || {},
            syncConfig: {
                timeout: timeout || 20000
            },
            createdBy: userId,
            isActive: true
        });

        return webhook;
    }

    /**
     * Update webhook
     * @param {String} webhookId - Webhook ID
     * @param {Object} data - Update data
     * @returns {Promise<Object>} - Updated webhook
     */
    async updateWebhook(webhookId, data) {
        const webhook = await Webhook.findById(webhookId);

        if (!webhook) {
            throw new Error('Webhook not found');
        }

        // Update allowed fields
        const allowedFields = ['name', 'description', 'events', 'headers', 'retryPolicy', 'filters', 'metadata', 'isActive'];
        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                webhook[field] = data[field];
            }
        });

        // Update timeout if provided
        if (data.timeout !== undefined) {
            webhook.syncConfig = webhook.syncConfig || {};
            webhook.syncConfig.timeout = data.timeout;
        }

        await webhook.save();
        return webhook;
    }

    /**
     * Delete webhook
     * @param {String} webhookId - Webhook ID
     * @returns {Promise<void>}
     */
    async deleteWebhook(webhookId) {
        const webhook = await Webhook.findById(webhookId);

        if (!webhook) {
            throw new Error('Webhook not found');
        }

        await webhook.deleteOne();

        // Also delete associated deliveries
        await WebhookDelivery.deleteMany({ webhookId });
    }

    /**
     * Get webhooks for a firm
     * @param {String} firmId - Firm ID
     * @returns {Promise<Array>} - List of webhooks
     */
    async getWebhooks(firmId) {
        return await Webhook.find({ firmId })
            .select('-secret') // Don't return secrets
            .sort({ createdAt: -1 });
    }

    /**
     * Trigger webhook for a specific event
     * This is a convenience method that wraps the trigger method
     * @param {String} event - Event type
     * @param {Object} payload - Event payload
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} - Trigger result
     */
    async triggerWebhook(event, payload, firmId) {
        return await this.trigger(event, payload, firmId);
    }

    /**
     * Process delivery (attempt to deliver a pending webhook)
     * @param {String} deliveryId - Delivery ID
     * @returns {Promise<Object>} - Delivery result
     */
    async processDelivery(deliveryId) {
        const delivery = await WebhookDelivery.findById(deliveryId).populate('webhookId');

        if (!delivery) {
            throw new Error('Delivery not found');
        }

        if (!delivery.webhookId) {
            throw new Error('Associated webhook not found');
        }

        // Prepare headers
        const headers = {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': delivery.signature,
            'X-Webhook-Event': delivery.event,
            'X-Webhook-ID': delivery.webhookId._id.toString(),
            'X-Webhook-Timestamp': new Date().toISOString(),
            'User-Agent': 'Traf3li-Webhook/1.0'
        };

        // Add custom headers
        if (delivery.webhookId.headers) {
            delivery.webhookId.headers.forEach((value, key) => {
                headers[key] = value;
            });
        }

        // Attempt delivery
        await this.attemptDelivery(delivery, delivery.webhookId, headers, delivery.payload);

        return delivery;
    }

    /**
     * Retry a specific delivery
     * @param {String} deliveryId - Delivery ID
     * @returns {Promise<Object>} - Delivery result
     */
    async retryDelivery(deliveryId) {
        const delivery = await WebhookDelivery.findById(deliveryId).populate('webhookId');

        if (!delivery) {
            throw new Error('Delivery not found');
        }

        if (!delivery.webhookId) {
            throw new Error('Associated webhook not found');
        }

        if (!delivery.canRetry) {
            throw new Error('Delivery cannot be retried (max attempts reached or already succeeded)');
        }

        // Prepare headers
        const headers = {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': delivery.signature,
            'X-Webhook-Event': delivery.event,
            'X-Webhook-ID': delivery.webhookId._id.toString(),
            'X-Webhook-Timestamp': new Date().toISOString(),
            'X-Webhook-Retry': delivery.currentAttempt + 1,
            'User-Agent': 'Traf3li-Webhook/1.0'
        };

        // Add custom headers
        if (delivery.webhookId.headers) {
            delivery.webhookId.headers.forEach((value, key) => {
                headers[key] = value;
            });
        }

        // Attempt delivery
        await this.attemptDelivery(delivery, delivery.webhookId, headers, delivery.payload);

        return delivery;
    }

    /**
     * Sign payload with webhook secret
     * @param {Object} payload - Payload to sign
     * @param {String} secret - Webhook secret
     * @returns {String} - HMAC signature
     */
    signPayload(payload, secret) {
        return this.generateSignature(payload, secret);
    }
}

module.exports = new WebhookService();
