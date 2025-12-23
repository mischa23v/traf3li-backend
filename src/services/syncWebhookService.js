const Webhook = require('../models/webhook.model');
const { deliverSync } = require('./webhookTransports');
const { generateSignature, generateJWSSignature } = require('./webhookSignature');
const webhookPayloadResolver = require('./webhookPayloadResolver');
const logger = require('../utils/logger');
const CustomException = require('../utils/CustomException');

/**
 * Circuit Breaker State
 * Tracks failures per webhook to prevent cascade failures
 */
const circuitBreakerState = new Map();

/**
 * Synchronous Webhook Service
 *
 * Handles blocking webhook calls that expect a response,
 * such as tax calculation, payment validation, etc.
 */
class SyncWebhookService {
    constructor() {
        this.defaultTimeout = 20000; // 20 seconds
        this.maxTimeout = 60000; // 60 seconds
    }

    /**
     * Trigger a synchronous webhook and wait for response
     *
     * @param {String} event - Event type (e.g., 'invoice.calculate_tax')
     * @param {Object} payload - Event payload
     * @param {Object} options - Options
     * @param {String} options.firmId - Firm ID for multi-tenancy
     * @param {Number} options.timeout - Custom timeout in ms
     * @param {Object} options.fallback - Fallback configuration
     * @returns {Promise<Object>} - { success, data, fallback, error }
     */
    async triggerSync(event, payload, options = {}) {
        const { firmId, timeout, fallback } = options;

        if (!firmId) {
            throw new CustomException(
                'firmId is required for sync webhooks | معرف الشركة مطلوب للـ webhooks المتزامنة',
                400
            );
        }

        // Find active sync webhook for this event
        const webhook = await Webhook.findOne({
            firmId,
            events: event,
            type: 'sync',
            isActive: true
        }).select('+secret');

        if (!webhook) {
            // No webhook configured - use fallback if provided
            if (fallback?.defaultValue !== undefined) {
                return {
                    success: true,
                    data: fallback.defaultValue,
                    fallback: true,
                    reason: 'No webhook configured'
                };
            }

            // No fallback - return null (caller decides what to do)
            return {
                success: false,
                error: 'No sync webhook configured for this event',
                fallback: false
            };
        }

        // Check circuit breaker
        if (this._isCircuitOpen(webhook._id)) {
            logger.warn(`Circuit breaker open for webhook ${webhook._id}`);
            return this._handleFallback(webhook, 'Circuit breaker open', fallback);
        }

        try {
            // Prepare payload
            let resolvedPayload = payload;

            // Apply payload query if configured
            if (webhook.payloadQuery) {
                resolvedPayload = webhookPayloadResolver.resolvePayload(
                    payload,
                    webhook.payloadQuery
                );
            }

            // Wrap payload with metadata
            const fullPayload = {
                event,
                timestamp: new Date().toISOString(),
                data: resolvedPayload,
                firmId: firmId.toString(),
                sync: true
            };

            // Generate signature
            const signature = webhook.useJWS
                ? await generateJWSSignature(fullPayload, webhook.secret)
                : generateSignature(fullPayload, webhook.secret);

            // Calculate timeout
            const effectiveTimeout = Math.min(
                timeout || webhook.syncConfig?.timeout || this.defaultTimeout,
                this.maxTimeout
            );

            // Deliver synchronously
            const result = await deliverSync(webhook, fullPayload, signature, {
                timeout: effectiveTimeout,
                event,
                firmId,
                expectedSchema: webhook.syncConfig?.expectedResponseSchema,
                idempotencyKey: options.idempotencyKey
            });

            // Update circuit breaker state
            if (result.success) {
                this._recordSuccess(webhook._id);
            } else {
                this._recordFailure(webhook._id, webhook.syncConfig?.circuitBreaker);
            }

            // Update webhook statistics
            await webhook.updateStatistics(result.success, result.duration || 0);

            if (result.success) {
                return {
                    success: true,
                    data: result.data,
                    duration: result.duration,
                    fallback: false
                };
            }

            // Delivery failed - use fallback
            return this._handleFallback(webhook, result.error, fallback);

        } catch (error) {
            logger.error('Sync webhook error:', error);
            this._recordFailure(webhook._id, webhook.syncConfig?.circuitBreaker);

            return this._handleFallback(webhook, error.message, fallback);
        }
    }

    /**
     * Trigger tax calculation webhook
     *
     * @param {Object} invoice - Invoice data
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} - { taxAmount, taxRate, breakdown }
     */
    async calculateTax(invoice, firmId) {
        const result = await this.triggerSync('invoice.calculate_tax', { invoice }, {
            firmId,
            fallback: {
                defaultValue: this._getDefaultTaxCalculation(invoice)
            }
        });

        if (result.success) {
            return result.data;
        }

        // Use fallback
        return result.data || this._getDefaultTaxCalculation(invoice);
    }

    /**
     * Trigger payment validation webhook
     *
     * @param {Object} payment - Payment data
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} - { valid, message, adjustments }
     */
    async validatePayment(payment, firmId) {
        const result = await this.triggerSync('payment.validate', { payment }, {
            firmId,
            fallback: {
                defaultValue: { valid: true, message: 'Default validation passed' }
            }
        });

        if (result.success) {
            return result.data;
        }

        // Fallback to basic validation
        return {
            valid: payment.amount > 0,
            message: 'Fallback validation',
            fallback: true
        };
    }

    /**
     * Trigger shipping calculation webhook
     *
     * @param {Object} order - Order data with items and destination
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} - { cost, method, estimatedDays }
     */
    async calculateShipping(order, firmId) {
        const result = await this.triggerSync('shipping.calculate', { order }, {
            firmId,
            fallback: {
                defaultValue: this._getDefaultShippingCalculation(order)
            }
        });

        return result.success ? result.data : result.data;
    }

    /**
     * Trigger discount validation webhook
     *
     * @param {Object} discount - Discount/coupon data
     * @param {Object} cart - Cart/order context
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} - { valid, discountAmount, message }
     */
    async validateDiscount(discount, cart, firmId) {
        const result = await this.triggerSync('discount.validate', { discount, cart }, {
            firmId,
            fallback: {
                defaultValue: { valid: false, message: 'Discount validation unavailable' }
            }
        });

        return result.success ? result.data : result.data;
    }

    /**
     * Handle fallback when webhook fails
     * @private
     */
    _handleFallback(webhook, error, providedFallback) {
        const fallbackConfig = webhook.syncConfig?.fallback || {};
        const strategy = fallbackConfig.strategy || 'error';

        switch (strategy) {
            case 'default_value':
                return {
                    success: true,
                    data: providedFallback?.defaultValue ?? fallbackConfig.defaultValue,
                    fallback: true,
                    reason: error
                };

            case 'skip':
                return {
                    success: true,
                    data: null,
                    fallback: true,
                    skipped: true,
                    reason: error
                };

            case 'error':
            default:
                return {
                    success: false,
                    error: fallbackConfig.errorMessage || error,
                    errorAr: fallbackConfig.errorMessageAr,
                    fallback: true
                };
        }
    }

    /**
     * Default tax calculation fallback
     * @private
     */
    _getDefaultTaxCalculation(invoice) {
        // Default 15% VAT (Saudi Arabia standard)
        const subtotal = invoice.subtotal || invoice.amount || 0;
        const taxRate = 0.15;
        const taxAmount = subtotal * taxRate;

        return {
            taxAmount,
            taxRate,
            breakdown: [{
                type: 'VAT',
                rate: taxRate,
                amount: taxAmount,
                description: 'Value Added Tax (Default)'
            }],
            fallback: true
        };
    }

    /**
     * Default shipping calculation fallback
     * @private
     */
    _getDefaultShippingCalculation(order) {
        // Basic flat rate shipping
        const itemCount = order.items?.length || 1;
        const baseRate = 15; // SAR
        const perItemRate = 5;

        return {
            cost: baseRate + (itemCount * perItemRate),
            currency: 'SAR',
            method: 'standard',
            estimatedDays: 5,
            fallback: true
        };
    }

    /**
     * Check if circuit breaker is open for a webhook
     * @private
     */
    _isCircuitOpen(webhookId) {
        const state = circuitBreakerState.get(webhookId.toString());

        if (!state) {
            return false;
        }

        // Check if circuit should reset
        if (state.openedAt && Date.now() - state.openedAt > state.resetTimeout) {
            // Half-open: allow one request through
            state.halfOpen = true;
            return false;
        }

        return state.open;
    }

    /**
     * Record successful delivery
     * @private
     */
    _recordSuccess(webhookId) {
        const key = webhookId.toString();
        const state = circuitBreakerState.get(key);

        if (state) {
            if (state.halfOpen) {
                // Circuit was half-open and succeeded - close it
                circuitBreakerState.delete(key);
            } else {
                // Reset failure count
                state.failures = 0;
                state.windowStart = Date.now();
            }
        }
    }

    /**
     * Record failed delivery
     * @private
     */
    _recordFailure(webhookId, config = {}) {
        const key = webhookId.toString();
        const now = Date.now();
        let state = circuitBreakerState.get(key);

        const failureThreshold = config.failureThreshold || 5;
        const failureWindow = config.failureWindow || 60000;
        const resetTimeout = config.resetTimeout || 30000;

        if (!state) {
            state = {
                failures: 0,
                windowStart: now,
                open: false,
                halfOpen: false,
                resetTimeout
            };
            circuitBreakerState.set(key, state);
        }

        // Check if window has expired
        if (now - state.windowStart > failureWindow) {
            state.failures = 0;
            state.windowStart = now;
        }

        state.failures++;

        // Check if threshold exceeded
        if (state.failures >= failureThreshold) {
            state.open = true;
            state.openedAt = now;
            logger.warn(`Circuit breaker opened for webhook ${webhookId} after ${state.failures} failures`);
        }
    }

    /**
     * Get circuit breaker status for a webhook
     */
    getCircuitStatus(webhookId) {
        const state = circuitBreakerState.get(webhookId.toString());

        if (!state) {
            return { status: 'closed', failures: 0 };
        }

        return {
            status: state.open ? 'open' : (state.halfOpen ? 'half-open' : 'closed'),
            failures: state.failures,
            openedAt: state.openedAt,
            resetTimeout: state.resetTimeout
        };
    }

    /**
     * Reset circuit breaker for a webhook
     */
    resetCircuit(webhookId) {
        circuitBreakerState.delete(webhookId.toString());
        return { reset: true };
    }

    /**
     * Get all circuit breaker states
     */
    getAllCircuitStates() {
        const states = {};
        circuitBreakerState.forEach((state, key) => {
            states[key] = {
                status: state.open ? 'open' : (state.halfOpen ? 'half-open' : 'closed'),
                failures: state.failures,
                openedAt: state.openedAt
            };
        });
        return states;
    }
}

module.exports = new SyncWebhookService();
