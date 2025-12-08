const crypto = require('crypto');
const axios = require('axios');
const Webhook = require('../models/webhook.model');
const WebhookDelivery = require('../models/webhookDelivery.model');

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
                console.log(`No active webhooks found for event: ${event} in firm: ${firmId}`);
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
                console.error('Error in webhook deliveries:', err);
            });

            return {
                triggered: filteredWebhooks.length,
                webhooks: filteredWebhooks.map(w => w._id)
            };
        } catch (error) {
            console.error('Error triggering webhooks:', error);
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
                console.log(`Webhook ${webhookId} is inactive, skipping delivery`);
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
            console.error('Error in webhook delivery:', error);
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
            // Make HTTP request
            const response = await axios.post(webhook.url, payload, {
                headers,
                timeout: 30000, // 30 seconds timeout
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
                console.warn(`Webhook delivery failed with status ${response.status}`);
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

            console.error('Webhook delivery error:', error.message);

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

            console.log(`Found ${deliveries.length} webhook deliveries to retry`);

            for (const delivery of deliveries) {
                try {
                    const webhook = delivery.webhookId;

                    if (!webhook || !webhook.isActive) {
                        console.log(`Skipping retry for inactive webhook ${delivery.webhookId}`);
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
                    console.error(`Error retrying delivery ${delivery._id}:`, error);
                }
            }

            return deliveries.length;
        } catch (error) {
            console.error('Error in retryFailed:', error);
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
            console.log(`Webhook ${webhookId} auto-disabled due to high failure rate`);
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
}

module.exports = new WebhookService();
