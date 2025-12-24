/**
 * Stripe Payment Service
 *
 * Provides comprehensive Stripe integration for the TRAF3LI platform:
 * - Payment intent creation and management
 * - Customer management
 * - Subscription handling
 * - Refund processing
 * - Webhook signature verification
 * - Invoice handling
 *
 * Features:
 * - Circuit breaker protection for resilience
 * - Retry logic with exponential backoff
 * - Comprehensive error handling
 * - Audit logging for all operations
 * - Multi-currency support (SAR, USD, EUR)
 */

const Stripe = require('stripe');
const { withCircuitBreaker } = require('../utils/circuitBreaker');
const logger = require('../utils/logger');

// Initialize Stripe with API key
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16',
        timeout: 30000, // 30 seconds
        maxNetworkRetries: 2,
        telemetry: false // Disable telemetry for privacy
    });
}

// ═══════════════════════════════════════════════════════════════
// WEBHOOK IDEMPOTENCY
// ═══════════════════════════════════════════════════════════════
// Track processed webhook events to prevent duplicate processing
// In production, this should use Redis or a database for persistence
const processedWebhookEvents = new Map();
const WEBHOOK_EVENT_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_PROCESSED_EVENTS = 10000;

// Cleanup old processed events periodically
const webhookCleanupInterval = setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;

    processedWebhookEvents.forEach((timestamp, eventId) => {
        if (now - timestamp > WEBHOOK_EVENT_TTL) {
            processedWebhookEvents.delete(eventId);
            cleanedCount++;
        }
    });

    // Emergency cleanup if map is too large
    if (processedWebhookEvents.size > MAX_PROCESSED_EVENTS) {
        const entriesToRemove = processedWebhookEvents.size - MAX_PROCESSED_EVENTS;
        let removed = 0;
        for (const key of processedWebhookEvents.keys()) {
            if (removed >= entriesToRemove) break;
            processedWebhookEvents.delete(key);
            removed++;
        }
        logger.warn('Webhook idempotency cache emergency cleanup', { removed });
    }

    if (cleanedCount > 0) {
        logger.debug('Webhook idempotency cache cleanup', {
            cleanedCount,
            currentSize: processedWebhookEvents.size
        });
    }
}, 60 * 60 * 1000); // Every hour

webhookCleanupInterval.unref();

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if Stripe is configured
 * @returns {boolean}
 */
function isConfigured() {
    return !!stripe;
}

/**
 * Convert amount to cents (Stripe requires amounts in smallest currency unit)
 * @param {number} amount - Amount in main currency units
 * @param {string} currency - Currency code
 * @returns {number} - Amount in smallest currency unit
 */
function toCents(amount, currency = 'sar') {
    // Zero-decimal currencies (don't multiply by 100)
    const zeroDecimalCurrencies = ['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'];

    if (zeroDecimalCurrencies.includes(currency.toLowerCase())) {
        return Math.round(amount);
    }

    return Math.round(amount * 100);
}

/**
 * Convert cents to main currency unit
 * @param {number} cents - Amount in smallest currency unit
 * @param {string} currency - Currency code
 * @returns {number} - Amount in main currency units
 */
function fromCents(cents, currency = 'sar') {
    const zeroDecimalCurrencies = ['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'];

    if (zeroDecimalCurrencies.includes(currency.toLowerCase())) {
        return cents;
    }

    return cents / 100;
}

// ═══════════════════════════════════════════════════════════════
// STRIPE SERVICE CLASS
// ═══════════════════════════════════════════════════════════════

class StripeService {
    constructor() {
        this.stripe = stripe;
    }

    /**
     * Check if Stripe is configured
     * @returns {boolean}
     */
    isConfigured() {
        return isConfigured();
    }

    // ═══════════════════════════════════════════════════════════════
    // PAYMENT INTENTS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create a payment intent
     * @param {Object} params - Payment intent parameters
     * @param {number} params.amount - Amount in main currency units
     * @param {string} params.currency - Currency code (default: 'sar')
     * @param {string} params.customerId - Stripe customer ID (optional)
     * @param {Object} params.metadata - Additional metadata
     * @param {string} params.description - Payment description
     * @param {string} params.receiptEmail - Email for receipt
     * @returns {Promise<Object>} - Payment intent object
     */
    async createPaymentIntent(params) {
        if (!this.isConfigured()) {
            throw new Error('Stripe not configured. Please set STRIPE_SECRET_KEY environment variable.');
        }

        const {
            amount,
            currency = 'sar',
            customerId,
            metadata = {},
            description,
            receiptEmail,
            paymentMethodTypes = ['card']
        } = params;

        const paymentIntentParams = {
            amount: toCents(amount, currency),
            currency: currency.toLowerCase(),
            metadata,
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: 'never'
            }
        };

        if (customerId) {
            paymentIntentParams.customer = customerId;
        }

        if (description) {
            paymentIntentParams.description = description;
        }

        if (receiptEmail) {
            paymentIntentParams.receipt_email = receiptEmail;
        }

        return withCircuitBreaker('stripe', async () => {
            const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentParams);

            logger.info('Payment intent created', {
                paymentIntentId: paymentIntent.id,
                amount,
                currency,
                status: paymentIntent.status
            });

            return {
                id: paymentIntent.id,
                clientSecret: paymentIntent.client_secret,
                amount: fromCents(paymentIntent.amount, currency),
                currency: paymentIntent.currency,
                status: paymentIntent.status,
                metadata: paymentIntent.metadata
            };
        });
    }

    /**
     * Retrieve a payment intent
     * @param {string} paymentIntentId - Payment intent ID
     * @returns {Promise<Object>} - Payment intent object
     */
    async getPaymentIntent(paymentIntentId) {
        if (!this.isConfigured()) {
            throw new Error('Stripe not configured');
        }

        return withCircuitBreaker('stripe', async () => {
            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
            return {
                id: paymentIntent.id,
                amount: fromCents(paymentIntent.amount, paymentIntent.currency),
                currency: paymentIntent.currency,
                status: paymentIntent.status,
                customerId: paymentIntent.customer,
                metadata: paymentIntent.metadata,
                created: new Date(paymentIntent.created * 1000)
            };
        });
    }

    /**
     * Confirm a payment intent
     * @param {string} paymentIntentId - Payment intent ID
     * @param {string} paymentMethodId - Payment method ID
     * @returns {Promise<Object>} - Confirmed payment intent
     */
    async confirmPaymentIntent(paymentIntentId, paymentMethodId) {
        if (!this.isConfigured()) {
            throw new Error('Stripe not configured');
        }

        return withCircuitBreaker('stripe', async () => {
            const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, {
                payment_method: paymentMethodId
            });

            logger.info('Payment intent confirmed', {
                paymentIntentId,
                status: paymentIntent.status
            });

            return {
                id: paymentIntent.id,
                status: paymentIntent.status,
                amount: fromCents(paymentIntent.amount, paymentIntent.currency),
                currency: paymentIntent.currency
            };
        });
    }

    /**
     * Cancel a payment intent
     * @param {string} paymentIntentId - Payment intent ID
     * @param {string} cancellationReason - Reason for cancellation
     * @returns {Promise<Object>} - Cancelled payment intent
     */
    async cancelPaymentIntent(paymentIntentId, cancellationReason = 'requested_by_customer') {
        if (!this.isConfigured()) {
            throw new Error('Stripe not configured');
        }

        return withCircuitBreaker('stripe', async () => {
            const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId, {
                cancellation_reason: cancellationReason
            });

            logger.info('Payment intent cancelled', {
                paymentIntentId,
                reason: cancellationReason
            });

            return {
                id: paymentIntent.id,
                status: paymentIntent.status
            };
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // REFUNDS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create a refund
     * @param {Object} params - Refund parameters
     * @param {string} params.paymentIntentId - Payment intent ID to refund
     * @param {number} params.amount - Amount to refund (optional, full refund if not specified)
     * @param {string} params.reason - Refund reason
     * @param {Object} params.metadata - Additional metadata
     * @returns {Promise<Object>} - Refund object
     */
    async createRefund(params) {
        if (!this.isConfigured()) {
            throw new Error('Stripe not configured');
        }

        const {
            paymentIntentId,
            amount,
            reason = 'requested_by_customer',
            metadata = {}
        } = params;

        const refundParams = {
            payment_intent: paymentIntentId,
            reason,
            metadata
        };

        if (amount !== undefined) {
            // Get the original payment to determine currency
            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
            refundParams.amount = toCents(amount, paymentIntent.currency);
        }

        return withCircuitBreaker('stripe', async () => {
            const refund = await this.stripe.refunds.create(refundParams);

            logger.info('Refund created', {
                refundId: refund.id,
                paymentIntentId,
                amount: refund.amount,
                status: refund.status
            });

            return {
                id: refund.id,
                amount: fromCents(refund.amount, refund.currency),
                currency: refund.currency,
                status: refund.status,
                reason: refund.reason,
                paymentIntentId
            };
        });
    }

    /**
     * Get refund details
     * @param {string} refundId - Refund ID
     * @returns {Promise<Object>} - Refund object
     */
    async getRefund(refundId) {
        if (!this.isConfigured()) {
            throw new Error('Stripe not configured');
        }

        return withCircuitBreaker('stripe', async () => {
            const refund = await this.stripe.refunds.retrieve(refundId);
            return {
                id: refund.id,
                amount: fromCents(refund.amount, refund.currency),
                currency: refund.currency,
                status: refund.status,
                reason: refund.reason,
                created: new Date(refund.created * 1000)
            };
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // CUSTOMERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create a Stripe customer
     * @param {Object} params - Customer parameters
     * @param {string} params.email - Customer email
     * @param {string} params.name - Customer name
     * @param {string} params.phone - Customer phone
     * @param {Object} params.metadata - Additional metadata
     * @returns {Promise<Object>} - Customer object
     */
    async createCustomer(params) {
        if (!this.isConfigured()) {
            throw new Error('Stripe not configured');
        }

        const { email, name, phone, metadata = {} } = params;

        return withCircuitBreaker('stripe', async () => {
            const customer = await this.stripe.customers.create({
                email,
                name,
                phone,
                metadata
            });

            logger.info('Stripe customer created', {
                customerId: customer.id,
                email
            });

            return {
                id: customer.id,
                email: customer.email,
                name: customer.name,
                created: new Date(customer.created * 1000)
            };
        });
    }

    /**
     * Get a Stripe customer
     * @param {string} customerId - Stripe customer ID
     * @returns {Promise<Object>} - Customer object
     */
    async getCustomer(customerId) {
        if (!this.isConfigured()) {
            throw new Error('Stripe not configured');
        }

        return withCircuitBreaker('stripe', async () => {
            const customer = await this.stripe.customers.retrieve(customerId);
            return {
                id: customer.id,
                email: customer.email,
                name: customer.name,
                phone: customer.phone,
                metadata: customer.metadata,
                created: new Date(customer.created * 1000)
            };
        });
    }

    /**
     * Update a Stripe customer
     * @param {string} customerId - Stripe customer ID
     * @param {Object} params - Update parameters
     * @returns {Promise<Object>} - Updated customer object
     */
    async updateCustomer(customerId, params) {
        if (!this.isConfigured()) {
            throw new Error('Stripe not configured');
        }

        const { email, name, phone, metadata } = params;
        const updateParams = {};

        if (email) updateParams.email = email;
        if (name) updateParams.name = name;
        if (phone) updateParams.phone = phone;
        if (metadata) updateParams.metadata = metadata;

        return withCircuitBreaker('stripe', async () => {
            const customer = await this.stripe.customers.update(customerId, updateParams);

            logger.info('Stripe customer updated', { customerId });

            return {
                id: customer.id,
                email: customer.email,
                name: customer.name
            };
        });
    }

    /**
     * Delete a Stripe customer
     * @param {string} customerId - Stripe customer ID
     * @returns {Promise<Object>} - Deletion confirmation
     */
    async deleteCustomer(customerId) {
        if (!this.isConfigured()) {
            throw new Error('Stripe not configured');
        }

        return withCircuitBreaker('stripe', async () => {
            const deleted = await this.stripe.customers.del(customerId);

            logger.info('Stripe customer deleted', { customerId });

            return {
                id: deleted.id,
                deleted: deleted.deleted
            };
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // PAYMENT METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Attach a payment method to a customer
     * @param {string} paymentMethodId - Payment method ID
     * @param {string} customerId - Customer ID
     * @returns {Promise<Object>} - Attached payment method
     */
    async attachPaymentMethod(paymentMethodId, customerId) {
        if (!this.isConfigured()) {
            throw new Error('Stripe not configured');
        }

        return withCircuitBreaker('stripe', async () => {
            const paymentMethod = await this.stripe.paymentMethods.attach(
                paymentMethodId,
                { customer: customerId }
            );

            logger.info('Payment method attached', {
                paymentMethodId,
                customerId
            });

            return {
                id: paymentMethod.id,
                type: paymentMethod.type,
                card: paymentMethod.card ? {
                    brand: paymentMethod.card.brand,
                    last4: paymentMethod.card.last4,
                    expMonth: paymentMethod.card.exp_month,
                    expYear: paymentMethod.card.exp_year
                } : null
            };
        });
    }

    /**
     * Detach a payment method from a customer
     * @param {string} paymentMethodId - Payment method ID
     * @returns {Promise<Object>} - Detached payment method
     */
    async detachPaymentMethod(paymentMethodId) {
        if (!this.isConfigured()) {
            throw new Error('Stripe not configured');
        }

        return withCircuitBreaker('stripe', async () => {
            const paymentMethod = await this.stripe.paymentMethods.detach(paymentMethodId);

            logger.info('Payment method detached', { paymentMethodId });

            return {
                id: paymentMethod.id,
                type: paymentMethod.type
            };
        });
    }

    /**
     * List customer payment methods
     * @param {string} customerId - Customer ID
     * @param {string} type - Payment method type (default: 'card')
     * @returns {Promise<Array>} - List of payment methods
     */
    async listPaymentMethods(customerId, type = 'card') {
        if (!this.isConfigured()) {
            throw new Error('Stripe not configured');
        }

        return withCircuitBreaker('stripe', async () => {
            const paymentMethods = await this.stripe.paymentMethods.list({
                customer: customerId,
                type
            });

            return paymentMethods.data.map(pm => ({
                id: pm.id,
                type: pm.type,
                card: pm.card ? {
                    brand: pm.card.brand,
                    last4: pm.card.last4,
                    expMonth: pm.card.exp_month,
                    expYear: pm.card.exp_year
                } : null
            }));
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // SUBSCRIPTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create a subscription
     * @param {Object} params - Subscription parameters
     * @param {string} params.customerId - Customer ID
     * @param {string} params.priceId - Price ID
     * @param {Object} params.metadata - Additional metadata
     * @returns {Promise<Object>} - Subscription object
     */
    async createSubscription(params) {
        if (!this.isConfigured()) {
            throw new Error('Stripe not configured');
        }

        const { customerId, priceId, metadata = {}, paymentBehavior = 'default_incomplete' } = params;

        return withCircuitBreaker('stripe', async () => {
            const subscription = await this.stripe.subscriptions.create({
                customer: customerId,
                items: [{ price: priceId }],
                metadata,
                payment_behavior: paymentBehavior,
                expand: ['latest_invoice.payment_intent']
            });

            logger.info('Subscription created', {
                subscriptionId: subscription.id,
                customerId,
                status: subscription.status
            });

            return {
                id: subscription.id,
                status: subscription.status,
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                clientSecret: subscription.latest_invoice?.payment_intent?.client_secret
            };
        });
    }

    /**
     * Cancel a subscription
     * @param {string} subscriptionId - Subscription ID
     * @param {boolean} cancelAtPeriodEnd - Cancel at end of period
     * @returns {Promise<Object>} - Cancelled subscription
     */
    async cancelSubscription(subscriptionId, cancelAtPeriodEnd = true) {
        if (!this.isConfigured()) {
            throw new Error('Stripe not configured');
        }

        return withCircuitBreaker('stripe', async () => {
            let subscription;

            if (cancelAtPeriodEnd) {
                subscription = await this.stripe.subscriptions.update(subscriptionId, {
                    cancel_at_period_end: true
                });
            } else {
                subscription = await this.stripe.subscriptions.cancel(subscriptionId);
            }

            logger.info('Subscription cancelled', {
                subscriptionId,
                cancelAtPeriodEnd,
                status: subscription.status
            });

            return {
                id: subscription.id,
                status: subscription.status,
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null
            };
        });
    }

    /**
     * Get subscription details
     * @param {string} subscriptionId - Subscription ID
     * @returns {Promise<Object>} - Subscription object
     */
    async getSubscription(subscriptionId) {
        if (!this.isConfigured()) {
            throw new Error('Stripe not configured');
        }

        return withCircuitBreaker('stripe', async () => {
            const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

            return {
                id: subscription.id,
                status: subscription.status,
                customerId: subscription.customer,
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                items: subscription.items.data.map(item => ({
                    id: item.id,
                    priceId: item.price.id,
                    quantity: item.quantity
                }))
            };
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // WEBHOOKS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Verify webhook signature
     * @param {string|Buffer} payload - Raw request body
     * @param {string} signature - Stripe-Signature header
     * @returns {Object} - Verified event object
     */
    verifyWebhookSignature(payload, signature) {
        if (!this.isConfigured()) {
            throw new Error('Stripe not configured');
        }

        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            throw new Error('Stripe webhook secret not configured. Please set STRIPE_WEBHOOK_SECRET environment variable.');
        }

        try {
            const event = this.stripe.webhooks.constructEvent(
                payload,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET
            );

            logger.info('Webhook signature verified', {
                eventType: event.type,
                eventId: event.id
            });

            return event;
        } catch (error) {
            logger.error('Webhook signature verification failed', {
                error: error.message
            });
            throw new Error(`Webhook signature verification failed: ${error.message}`);
        }
    }

    /**
     * Handle webhook event with idempotency check
     * @param {Object} event - Stripe event object
     * @returns {Promise<Object>} - Handling result
     */
    async handleWebhookEvent(event) {
        const eventType = event.type;
        const eventId = event.id;
        const eventData = event.data.object;

        // Idempotency check - prevent duplicate processing
        if (processedWebhookEvents.has(eventId)) {
            logger.info('Webhook event already processed (idempotency check)', {
                eventType,
                eventId
            });
            return {
                handled: true,
                duplicate: true,
                eventType,
                eventId
            };
        }

        // Mark event as being processed
        processedWebhookEvents.set(eventId, Date.now());

        logger.info('Processing webhook event', {
            eventType,
            eventId
        });

        switch (eventType) {
            case 'payment_intent.succeeded':
                return this._handlePaymentSuccess(eventData);

            case 'payment_intent.payment_failed':
                return this._handlePaymentFailure(eventData);

            case 'invoice.paid':
                return this._handleInvoicePaid(eventData);

            case 'invoice.payment_failed':
                return this._handleInvoicePaymentFailed(eventData);

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                return this._handleSubscriptionChange(eventData, eventType);

            case 'charge.refunded':
                return this._handleRefund(eventData);

            default:
                logger.info(`Unhandled webhook event type: ${eventType}`);
                return { handled: false, eventType };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // WEBHOOK EVENT HANDLERS (INTERNAL)
    // ═══════════════════════════════════════════════════════════════

    async _handlePaymentSuccess(paymentIntent) {
        logger.info('Payment succeeded', {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            metadata: paymentIntent.metadata
        });

        // Emit event for other services to handle
        // This would typically update invoice status, send receipts, etc.

        return {
            handled: true,
            action: 'payment_success',
            paymentIntentId: paymentIntent.id,
            amount: fromCents(paymentIntent.amount, paymentIntent.currency),
            metadata: paymentIntent.metadata
        };
    }

    async _handlePaymentFailure(paymentIntent) {
        logger.warn('Payment failed', {
            paymentIntentId: paymentIntent.id,
            error: paymentIntent.last_payment_error?.message
        });

        return {
            handled: true,
            action: 'payment_failed',
            paymentIntentId: paymentIntent.id,
            error: paymentIntent.last_payment_error?.message
        };
    }

    async _handleInvoicePaid(invoice) {
        logger.info('Invoice paid', {
            invoiceId: invoice.id,
            customerId: invoice.customer,
            amountPaid: invoice.amount_paid
        });

        return {
            handled: true,
            action: 'invoice_paid',
            invoiceId: invoice.id,
            customerId: invoice.customer,
            amount: fromCents(invoice.amount_paid, invoice.currency)
        };
    }

    async _handleInvoicePaymentFailed(invoice) {
        logger.warn('Invoice payment failed', {
            invoiceId: invoice.id,
            customerId: invoice.customer
        });

        return {
            handled: true,
            action: 'invoice_payment_failed',
            invoiceId: invoice.id,
            customerId: invoice.customer
        };
    }

    async _handleSubscriptionChange(subscription, eventType) {
        const action = eventType.split('.')[2]; // created, updated, deleted

        logger.info('Subscription changed', {
            subscriptionId: subscription.id,
            customerId: subscription.customer,
            action,
            status: subscription.status
        });

        return {
            handled: true,
            action: `subscription_${action}`,
            subscriptionId: subscription.id,
            customerId: subscription.customer,
            status: subscription.status
        };
    }

    async _handleRefund(charge) {
        logger.info('Charge refunded', {
            chargeId: charge.id,
            amountRefunded: charge.amount_refunded
        });

        return {
            handled: true,
            action: 'refund',
            chargeId: charge.id,
            amountRefunded: fromCents(charge.amount_refunded, charge.currency)
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // UTILITY METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get Stripe balance
     * @returns {Promise<Object>} - Balance object
     */
    async getBalance() {
        if (!this.isConfigured()) {
            throw new Error('Stripe not configured');
        }

        return withCircuitBreaker('stripe', async () => {
            const balance = await this.stripe.balance.retrieve();

            return {
                available: balance.available.map(b => ({
                    amount: fromCents(b.amount, b.currency),
                    currency: b.currency
                })),
                pending: balance.pending.map(b => ({
                    amount: fromCents(b.amount, b.currency),
                    currency: b.currency
                }))
            };
        });
    }

    /**
     * List recent charges
     * @param {Object} options - List options
     * @returns {Promise<Array>} - List of charges
     */
    async listCharges(options = {}) {
        if (!this.isConfigured()) {
            throw new Error('Stripe not configured');
        }

        const { limit = 10, customerId } = options;
        const listParams = { limit };

        if (customerId) {
            listParams.customer = customerId;
        }

        return withCircuitBreaker('stripe', async () => {
            const charges = await this.stripe.charges.list(listParams);

            return charges.data.map(charge => ({
                id: charge.id,
                amount: fromCents(charge.amount, charge.currency),
                currency: charge.currency,
                status: charge.status,
                description: charge.description,
                customerId: charge.customer,
                created: new Date(charge.created * 1000)
            }));
        });
    }
}

// Export singleton instance
module.exports = new StripeService();

// Also export class for testing
module.exports.StripeService = StripeService;
module.exports.isConfigured = isConfigured;
module.exports.toCents = toCents;
module.exports.fromCents = fromCents;
