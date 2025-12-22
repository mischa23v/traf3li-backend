/**
 * Billing Controller
 *
 * Comprehensive billing management for firm subscriptions including:
 * - Subscription management (create, change, cancel, reactivate)
 * - Payment method management (add, remove, set default)
 * - Invoice management (list, view, download)
 * - Usage tracking
 * - Stripe integration and webhook handling
 */

const mongoose = require('mongoose');
const Subscription = require('../models/subscription.model');
const SubscriptionPlan = require('../models/subscriptionPlan.model');
const PaymentMethod = require('../models/paymentMethod.model');
const BillingInvoice = require('../models/billingInvoice.model');
const { Firm } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { CustomException } = require('../utils');
const logger = require('../utils/contextLogger');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ═══════════════════════════════════════════════════════════════
// SUBSCRIPTION PLANS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all available subscription plans
 * GET /api/billing/plans
 */
exports.getPlans = asyncHandler(async (req, res) => {
    const { includeAll = false } = req.query;

    let plans;
    if (includeAll === 'true') {
        // Admin/testing: Get all active plans
        plans = await SubscriptionPlan.getActivePlans();
    } else {
        // Public plans only
        plans = await SubscriptionPlan.getPublicPlans();
    }

    res.json({
        success: true,
        data: plans,
        count: plans.length
    });
});

// ═══════════════════════════════════════════════════════════════
// SUBSCRIPTION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Get current subscription details
 * GET /api/billing/subscription
 */
exports.getCurrentSubscription = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('Firm not found', 404);
    }

    // Get subscription
    const subscription = await Subscription.findOne({ firmId })
        .populate('firmId', 'name email')
        .lean();

    if (!subscription) {
        throw CustomException('Subscription not found', 404);
    }

    // Get plan details
    const plan = await SubscriptionPlan.getPlanById(subscription.planId);

    // Get payment method
    const paymentMethods = await PaymentMethod.find({ firmId, isDefault: true }).limit(1).lean();
    const defaultPaymentMethod = paymentMethods[0] || null;

    res.json({
        success: true,
        data: {
            subscription: {
                ...subscription,
                plan,
                isActive: subscription.status === 'active' || subscription.status === 'trialing',
                isTrialing: subscription.status === 'trialing',
                isPastDue: subscription.status === 'past_due',
                isCanceled: subscription.status === 'canceled',
                willCancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                daysUntilRenewal: subscription.currentPeriodEnd
                    ? Math.ceil((new Date(subscription.currentPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24))
                    : null
            },
            paymentMethod: defaultPaymentMethod,
            usage: subscription.usage
        }
    });
});

/**
 * Create a new subscription
 * POST /api/billing/subscription
 */
exports.createSubscription = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;
    const { planId, billingCycle = 'monthly', paymentMethodId } = req.body;

    if (!firmId) {
        throw CustomException('Firm not found', 404);
    }

    // Validate plan
    const plan = await SubscriptionPlan.getPlanById(planId);
    if (!plan) {
        throw CustomException('Invalid plan selected', 400);
    }

    // Check if firm already has a subscription
    const existingSubscription = await Subscription.findOne({ firmId });
    if (existingSubscription) {
        throw CustomException('Firm already has an active subscription. Use the change subscription endpoint instead.', 400);
    }

    // Get firm details
    const firm = await Firm.findById(firmId);
    if (!firm) {
        throw CustomException('Firm not found', 404);
    }

    // For paid plans, require payment method
    if (!plan.isFree() && !paymentMethodId) {
        throw CustomException('Payment method is required for paid plans', 400);
    }

    let stripeCustomerId = firm.stripeCustomerId;
    let stripeSubscriptionId = null;

    // Create or get Stripe customer
    if (!stripeCustomerId) {
        try {
            const stripeCustomer = await stripe.customers.create({
                email: firm.email,
                name: firm.name,
                metadata: {
                    firmId: firmId.toString()
                }
            });
            stripeCustomerId = stripeCustomer.id;

            // Update firm with Stripe customer ID
            await Firm.findByIdAndUpdate(firmId, { stripeCustomerId });
        } catch (error) {
            logger.error('Failed to create Stripe customer', { error: error.message, firmId });
            throw CustomException('Failed to create billing account. Please try again.', 500);
        }
    }

    // For paid plans, create Stripe subscription
    if (!plan.isFree() && paymentMethodId) {
        try {
            // Attach payment method to customer
            await stripe.paymentMethods.attach(paymentMethodId, {
                customer: stripeCustomerId
            });

            // Set as default payment method
            await stripe.customers.update(stripeCustomerId, {
                invoice_settings: {
                    default_payment_method: paymentMethodId
                }
            });

            // Determine price ID
            const stripePriceId = billingCycle === 'yearly' ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;

            if (!stripePriceId) {
                throw CustomException('Plan pricing not configured properly', 500);
            }

            // Create Stripe subscription
            const stripeSubscription = await stripe.subscriptions.create({
                customer: stripeCustomerId,
                items: [{ price: stripePriceId }],
                trial_period_days: plan.trialDays || 0,
                payment_behavior: 'default_incomplete',
                expand: ['latest_invoice.payment_intent'],
                metadata: {
                    firmId: firmId.toString(),
                    planId: plan.planId
                }
            });

            stripeSubscriptionId = stripeSubscription.id;

            // Store payment method in our database
            await PaymentMethod.create({
                firmId,
                type: 'card',
                stripePaymentMethodId: paymentMethodId,
                isDefault: true,
                addedBy: userId
            });

        } catch (error) {
            logger.error('Failed to create Stripe subscription', { error: error.message, firmId, planId });
            throw CustomException(error.message || 'Failed to create subscription. Please try again.', 500);
        }
    }

    // Create subscription in database
    const now = new Date();
    const trialEnd = plan.trialDays ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000) : null;
    const periodEnd = new Date(now.getTime() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000);

    const subscription = await Subscription.create({
        firmId,
        planId: plan.planId,
        status: plan.trialDays && !plan.isFree() ? 'trialing' : 'active',
        billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialStart: plan.trialDays ? now : null,
        trialEnd,
        stripeCustomerId,
        stripeSubscriptionId,
        createdBy: userId,
        usage: {
            users: 0,
            cases: 0,
            clients: 0,
            storageUsedMB: 0,
            apiCallsThisMonth: 0,
            lastUsageReset: now
        }
    });

    res.status(201).json({
        success: true,
        message: 'Subscription created successfully',
        data: {
            subscription,
            plan
        }
    });
});

/**
 * Change subscription plan
 * PUT /api/billing/subscription
 */
exports.changeSubscription = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;
    const { planId, billingCycle } = req.body;

    if (!firmId) {
        throw CustomException('Firm not found', 404);
    }

    // Get current subscription
    const subscription = await Subscription.findOne({ firmId });
    if (!subscription) {
        throw CustomException('No active subscription found', 404);
    }

    // Validate new plan
    const newPlan = await SubscriptionPlan.getPlanById(planId);
    if (!newPlan) {
        throw CustomException('Invalid plan selected', 400);
    }

    const currentPlan = await SubscriptionPlan.getPlanById(subscription.planId);

    // Compare plans
    const comparison = await SubscriptionPlan.comparePlans(subscription.planId, planId);
    if (!comparison.valid) {
        throw CustomException(comparison.error || 'Cannot compare plans', 400);
    }

    // If changing billing cycle only (same plan)
    if (subscription.planId === planId && billingCycle && billingCycle !== subscription.billingCycle) {
        if (subscription.stripeSubscriptionId) {
            try {
                const stripePriceId = billingCycle === 'yearly'
                    ? newPlan.stripePriceIdYearly
                    : newPlan.stripePriceIdMonthly;

                await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
                    items: [{
                        id: (await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId)).items.data[0].id,
                        price: stripePriceId
                    }],
                    proration_behavior: 'always_invoice'
                });
            } catch (error) {
                logger.error('Failed to update Stripe subscription billing cycle', { error: error.message, firmId });
                throw CustomException('Failed to update billing cycle. Please try again.', 500);
            }
        }

        subscription.billingCycle = billingCycle;
        subscription.updatedBy = userId;
        await subscription.save();

        return res.json({
            success: true,
            message: 'Billing cycle updated successfully',
            data: { subscription, plan: newPlan }
        });
    }

    // Update Stripe subscription if exists
    if (subscription.stripeSubscriptionId && !newPlan.isFree()) {
        try {
            const newStripePriceId = (billingCycle || subscription.billingCycle) === 'yearly'
                ? newPlan.stripePriceIdYearly
                : newPlan.stripePriceIdMonthly;

            if (!newStripePriceId) {
                throw CustomException('Plan pricing not configured properly', 500);
            }

            const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);

            await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
                items: [{
                    id: stripeSubscription.items.data[0].id,
                    price: newStripePriceId
                }],
                proration_behavior: comparison.isUpgrade ? 'always_invoice' : 'create_prorations',
                metadata: {
                    firmId: firmId.toString(),
                    planId: newPlan.planId
                }
            });
        } catch (error) {
            logger.error('Failed to update Stripe subscription', { error: error.message, firmId });
            throw CustomException('Failed to update subscription. Please try again.', 500);
        }
    }

    // Update subscription in database
    subscription.planId = planId;
    if (billingCycle) {
        subscription.billingCycle = billingCycle;
    }
    subscription.updatedBy = userId;
    await subscription.save();

    res.json({
        success: true,
        message: `Successfully ${comparison.isUpgrade ? 'upgraded' : 'downgraded'} to ${newPlan.name}`,
        data: {
            subscription,
            plan: newPlan,
            comparison
        }
    });
});

/**
 * Cancel subscription
 * DELETE /api/billing/subscription
 */
exports.cancelSubscription = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;
    const { immediately = false, reason } = req.body;

    if (!firmId) {
        throw CustomException('Firm not found', 404);
    }

    // Get current subscription
    const subscription = await Subscription.findOne({ firmId });
    if (!subscription) {
        throw CustomException('No active subscription found', 404);
    }

    if (subscription.status === 'canceled') {
        throw CustomException('Subscription is already canceled', 400);
    }

    // Cancel in Stripe
    if (subscription.stripeSubscriptionId) {
        try {
            if (immediately) {
                await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
            } else {
                await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
                    cancel_at_period_end: true
                });
            }
        } catch (error) {
            logger.error('Failed to cancel Stripe subscription', { error: error.message, firmId });
            throw CustomException('Failed to cancel subscription. Please try again.', 500);
        }
    }

    // Update subscription
    if (immediately) {
        subscription.status = 'canceled';
        subscription.canceledAt = new Date();
    } else {
        subscription.cancelAtPeriodEnd = true;
    }

    if (reason) {
        subscription.cancellationReason = reason;
    }
    subscription.updatedBy = userId;
    await subscription.save();

    res.json({
        success: true,
        message: immediately
            ? 'Subscription canceled immediately'
            : 'Subscription will be canceled at the end of the billing period',
        data: {
            subscription,
            canceledAt: subscription.canceledAt,
            activeUntil: subscription.currentPeriodEnd
        }
    });
});

/**
 * Reactivate a canceled subscription
 * POST /api/billing/subscription/reactivate
 */
exports.reactivateSubscription = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('Firm not found', 404);
    }

    // Get current subscription
    const subscription = await Subscription.findOne({ firmId });
    if (!subscription) {
        throw CustomException('No subscription found', 404);
    }

    // Check if subscription can be reactivated
    if (subscription.status === 'active' && !subscription.cancelAtPeriodEnd) {
        throw CustomException('Subscription is already active', 400);
    }

    // Reactivate in Stripe if exists
    if (subscription.stripeSubscriptionId) {
        try {
            const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);

            if (stripeSubscription.cancel_at_period_end) {
                await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
                    cancel_at_period_end: false
                });
            } else if (stripeSubscription.status === 'canceled') {
                // If fully canceled, would need to create a new subscription
                throw CustomException('Subscription has been fully canceled. Please create a new subscription.', 400);
            }
        } catch (error) {
            logger.error('Failed to reactivate Stripe subscription', { error: error.message, firmId });

            if (error.status === 400) {
                throw error;
            }

            throw CustomException('Failed to reactivate subscription. Please try again.', 500);
        }
    }

    // Update subscription
    subscription.cancelAtPeriodEnd = false;
    subscription.status = 'active';
    subscription.canceledAt = null;
    subscription.cancellationReason = null;
    subscription.updatedBy = userId;
    await subscription.save();

    res.json({
        success: true,
        message: 'Subscription reactivated successfully',
        data: { subscription }
    });
});

// ═══════════════════════════════════════════════════════════════
// PAYMENT METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all payment methods for firm
 * GET /api/billing/payment-methods
 */
exports.getPaymentMethods = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('Firm not found', 404);
    }

    const paymentMethods = await PaymentMethod.getByFirm(firmId);

    res.json({
        success: true,
        data: paymentMethods,
        count: paymentMethods.length
    });
});

/**
 * Add a new payment method
 * POST /api/billing/payment-methods
 */
exports.addPaymentMethod = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;
    const { paymentMethodId, setAsDefault = false } = req.body;

    if (!firmId) {
        throw CustomException('Firm not found', 404);
    }

    if (!paymentMethodId) {
        throw CustomException('Payment method ID is required', 400);
    }

    // Get firm and subscription
    const firm = await Firm.findById(firmId);
    const subscription = await Subscription.findOne({ firmId });

    if (!firm) {
        throw CustomException('Firm not found', 404);
    }

    let stripeCustomerId = firm.stripeCustomerId;

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
        try {
            const stripeCustomer = await stripe.customers.create({
                email: firm.email,
                name: firm.name,
                metadata: { firmId: firmId.toString() }
            });
            stripeCustomerId = stripeCustomer.id;
            await Firm.findByIdAndUpdate(firmId, { stripeCustomerId });
        } catch (error) {
            logger.error('Failed to create Stripe customer', { error: error.message, firmId });
            throw CustomException('Failed to create billing account. Please try again.', 500);
        }
    }

    // Attach payment method to customer in Stripe
    let stripePaymentMethod;
    try {
        stripePaymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
            customer: stripeCustomerId
        });
    } catch (error) {
        logger.error('Failed to attach payment method', { error: error.message, firmId });
        throw CustomException('Failed to add payment method. Please try again.', 500);
    }

    // Check if this should be the default (either explicitly requested or first payment method)
    const existingPaymentMethods = await PaymentMethod.find({ firmId });
    const shouldBeDefault = setAsDefault || existingPaymentMethods.length === 0;

    // If setting as default, update Stripe customer
    if (shouldBeDefault) {
        try {
            await stripe.customers.update(stripeCustomerId, {
                invoice_settings: { default_payment_method: paymentMethodId }
            });
        } catch (error) {
            logger.error('Failed to set default payment method in Stripe', { error: error.message, firmId });
        }
    }

    // Extract card details
    const cardDetails = stripePaymentMethod.card ? {
        brand: stripePaymentMethod.card.brand,
        last4: stripePaymentMethod.card.last4,
        expMonth: stripePaymentMethod.card.exp_month,
        expYear: stripePaymentMethod.card.exp_year,
        country: stripePaymentMethod.card.country,
        funding: stripePaymentMethod.card.funding
    } : {};

    // Save payment method in database
    const paymentMethod = await PaymentMethod.create({
        firmId,
        type: stripePaymentMethod.type === 'card' ? 'card' : 'bank_account',
        card: cardDetails,
        stripePaymentMethodId: paymentMethodId,
        isDefault: shouldBeDefault,
        addedBy: userId,
        billingAddress: stripePaymentMethod.billing_details
    });

    // If set as default, unset other defaults
    if (shouldBeDefault) {
        await PaymentMethod.updateMany(
            { firmId, _id: { $ne: paymentMethod._id } },
            { $set: { isDefault: false } }
        );
    }

    res.status(201).json({
        success: true,
        message: 'Payment method added successfully',
        data: paymentMethod
    });
});

/**
 * Remove a payment method
 * DELETE /api/billing/payment-methods/:id
 */
exports.removePaymentMethod = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('Firm not found', 404);
    }

    if (!id) {
        throw CustomException('Payment method ID is required', 400);
    }

    // Find payment method
    const paymentMethod = await PaymentMethod.findOne({ _id: id, firmId });
    if (!paymentMethod) {
        throw CustomException('Payment method not found', 404);
    }

    // Check if it's the default and there are active subscriptions
    if (paymentMethod.isDefault) {
        const subscription = await Subscription.findOne({ firmId, status: { $in: ['active', 'trialing'] } });
        const otherPaymentMethods = await PaymentMethod.countDocuments({ firmId, _id: { $ne: id } });

        if (subscription && otherPaymentMethods === 0) {
            throw CustomException('Cannot remove the only payment method while subscription is active', 400);
        }
    }

    // Detach from Stripe
    if (paymentMethod.stripePaymentMethodId) {
        try {
            await stripe.paymentMethods.detach(paymentMethod.stripePaymentMethodId);
        } catch (error) {
            logger.error('Failed to detach payment method from Stripe', { error: error.message, firmId });
            // Continue anyway - we'll delete from our database
        }
    }

    // Delete from database
    await PaymentMethod.deleteOne({ _id: id, firmId });

    // If this was the default, set another as default
    if (paymentMethod.isDefault) {
        const anotherMethod = await PaymentMethod.findOne({ firmId });
        if (anotherMethod) {
            await PaymentMethod.setDefault(firmId, anotherMethod._id);
        }
    }

    res.json({
        success: true,
        message: 'Payment method removed successfully'
    });
});

/**
 * Set default payment method
 * PUT /api/billing/payment-methods/:id/default
 */
exports.setDefaultPaymentMethod = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('Firm not found', 404);
    }

    if (!id) {
        throw CustomException('Payment method ID is required', 400);
    }

    // Verify payment method exists and belongs to firm
    const paymentMethod = await PaymentMethod.findOne({ _id: id, firmId });
    if (!paymentMethod) {
        throw CustomException('Payment method not found', 404);
    }

    // Update in Stripe
    const firm = await Firm.findById(firmId);
    if (firm.stripeCustomerId && paymentMethod.stripePaymentMethodId) {
        try {
            await stripe.customers.update(firm.stripeCustomerId, {
                invoice_settings: { default_payment_method: paymentMethod.stripePaymentMethodId }
            });
        } catch (error) {
            logger.error('Failed to set default payment method in Stripe', { error: error.message, firmId });
            throw CustomException('Failed to set default payment method. Please try again.', 500);
        }
    }

    // Update in database
    const updatedPaymentMethod = await PaymentMethod.setDefault(firmId, id);

    res.json({
        success: true,
        message: 'Default payment method updated successfully',
        data: updatedPaymentMethod
    });
});

/**
 * Create Setup Intent for adding cards
 * POST /api/billing/setup-intent
 */
exports.createSetupIntent = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('Firm not found', 404);
    }

    const firm = await Firm.findById(firmId);
    if (!firm) {
        throw CustomException('Firm not found', 404);
    }

    let stripeCustomerId = firm.stripeCustomerId;

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
        try {
            const stripeCustomer = await stripe.customers.create({
                email: firm.email,
                name: firm.name,
                metadata: { firmId: firmId.toString() }
            });
            stripeCustomerId = stripeCustomer.id;
            await Firm.findByIdAndUpdate(firmId, { stripeCustomerId });
        } catch (error) {
            logger.error('Failed to create Stripe customer', { error: error.message, firmId });
            throw CustomException('Failed to create billing account. Please try again.', 500);
        }
    }

    // Create Setup Intent
    try {
        const setupIntent = await stripe.setupIntents.create({
            customer: stripeCustomerId,
            payment_method_types: ['card'],
            metadata: { firmId: firmId.toString() }
        });

        res.json({
            success: true,
            data: {
                clientSecret: setupIntent.client_secret,
                setupIntentId: setupIntent.id
            }
        });
    } catch (error) {
        logger.error('Failed to create setup intent', { error: error.message, firmId });
        throw CustomException('Failed to initialize payment method setup. Please try again.', 500);
    }
});

// ═══════════════════════════════════════════════════════════════
// INVOICES
// ═══════════════════════════════════════════════════════════════

/**
 * Get all invoices for firm
 * GET /api/billing/invoices
 */
exports.getInvoices = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const {
        status,
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sort = '-createdAt'
    } = req.query;

    if (!firmId) {
        throw CustomException('Firm not found', 404);
    }

    const result = await BillingInvoice.getByFirm(firmId, {
        status,
        startDate,
        endDate,
        page: parseInt(page),
        limit: parseInt(limit),
        sort,
        populate: true
    });

    res.json({
        success: true,
        data: result.invoices,
        pagination: result.pagination
    });
});

/**
 * Get single invoice details
 * GET /api/billing/invoices/:id
 */
exports.getInvoice = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('Firm not found', 404);
    }

    if (!id) {
        throw CustomException('Invoice ID is required', 400);
    }

    const invoice = await BillingInvoice.findOne({ _id: id, firmId })
        .populate('firmId', 'name email')
        .populate('subscriptionId')
        .lean();

    if (!invoice) {
        throw CustomException('Invoice not found', 404);
    }

    res.json({
        success: true,
        data: invoice
    });
});

/**
 * Download invoice PDF
 * GET /api/billing/invoices/:id/pdf
 */
exports.downloadInvoicePdf = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('Firm not found', 404);
    }

    if (!id) {
        throw CustomException('Invoice ID is required', 400);
    }

    const invoice = await BillingInvoice.findOne({ _id: id, firmId });
    if (!invoice) {
        throw CustomException('Invoice not found', 404);
    }

    // If we have a PDF URL from Stripe, redirect to it
    if (invoice.pdfUrl) {
        return res.redirect(invoice.pdfUrl);
    }

    // If we have a hosted invoice URL, redirect to it
    if (invoice.hostedInvoiceUrl) {
        return res.redirect(invoice.hostedInvoiceUrl);
    }

    // Try to get from Stripe
    if (invoice.stripeInvoiceId) {
        try {
            const stripeInvoice = await stripe.invoices.retrieve(invoice.stripeInvoiceId);

            if (stripeInvoice.invoice_pdf) {
                // Update our record with the PDF URL
                invoice.pdfUrl = stripeInvoice.invoice_pdf;
                await invoice.save();

                return res.redirect(stripeInvoice.invoice_pdf);
            }
        } catch (error) {
            logger.error('Failed to retrieve Stripe invoice PDF', { error: error.message, invoiceId: id });
        }
    }

    throw CustomException('Invoice PDF not available', 404);
});

// ═══════════════════════════════════════════════════════════════
// USAGE
// ═══════════════════════════════════════════════════════════════

/**
 * Get usage statistics for firm
 * GET /api/billing/usage
 */
exports.getUsage = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('Firm not found', 404);
    }

    const subscription = await Subscription.findOne({ firmId });
    if (!subscription) {
        throw CustomException('Subscription not found', 404);
    }

    // Get plan details
    const plan = await SubscriptionPlan.getPlanById(subscription.planId);
    if (!plan) {
        throw CustomException('Plan not found', 404);
    }

    // Calculate usage percentages
    const usage = subscription.usage || {};
    const limits = plan.limits || {};

    const usageWithLimits = {
        users: {
            current: usage.users || 0,
            limit: limits.users || -1,
            percentage: limits.users > 0 ? Math.round(((usage.users || 0) / limits.users) * 100) : 0,
            unlimited: limits.users === -1
        },
        cases: {
            current: usage.cases || 0,
            limit: limits.cases || -1,
            percentage: limits.cases > 0 ? Math.round(((usage.cases || 0) / limits.cases) * 100) : 0,
            unlimited: limits.cases === -1
        },
        clients: {
            current: usage.clients || 0,
            limit: limits.clients || -1,
            percentage: limits.clients > 0 ? Math.round(((usage.clients || 0) / limits.clients) * 100) : 0,
            unlimited: limits.clients === -1
        },
        storage: {
            currentMB: usage.storageUsedMB || 0,
            currentGB: ((usage.storageUsedMB || 0) / 1024).toFixed(2),
            limitGB: limits.storageGB || -1,
            percentage: limits.storageGB > 0 ? Math.round(((usage.storageUsedMB || 0) / (limits.storageGB * 1024)) * 100) : 0,
            unlimited: limits.storageGB === -1
        },
        apiCalls: {
            current: usage.apiCallsThisMonth || 0,
            limit: limits.apiCallsPerMonth || -1,
            percentage: limits.apiCallsPerMonth > 0 ? Math.round(((usage.apiCallsThisMonth || 0) / limits.apiCallsPerMonth) * 100) : 0,
            unlimited: limits.apiCallsPerMonth === -1,
            resetsAt: subscription.currentPeriodEnd
        }
    };

    res.json({
        success: true,
        data: {
            usage: usageWithLimits,
            plan: {
                planId: plan.planId,
                name: plan.name,
                limits: plan.limits
            },
            lastReset: usage.lastUsageReset,
            nextReset: subscription.currentPeriodEnd
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// STRIPE WEBHOOK
// ═══════════════════════════════════════════════════════════════

/**
 * Handle Stripe webhook events
 * POST /api/billing/webhook
 */
exports.handleStripeWebhook = asyncHandler(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        logger.error('Stripe webhook secret not configured');
        return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        logger.error('Webhook signature verification failed', { error: err.message });
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    logger.info('Stripe webhook received', { type: event.type, id: event.id });

    try {
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await handleSubscriptionUpdate(event.data.object);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;

            case 'invoice.payment_succeeded':
                await handleInvoicePaymentSucceeded(event.data.object);
                break;

            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(event.data.object);
                break;

            case 'invoice.created':
            case 'invoice.finalized':
                await handleInvoiceCreatedOrFinalized(event.data.object);
                break;

            case 'payment_method.attached':
                logger.info('Payment method attached', { paymentMethodId: event.data.object.id });
                break;

            case 'payment_method.detached':
                logger.info('Payment method detached', { paymentMethodId: event.data.object.id });
                break;

            default:
                logger.info('Unhandled webhook event type', { type: event.type });
        }

        res.json({ received: true });
    } catch (error) {
        logger.error('Error processing webhook', { type: event.type, error: error.message });
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// ═══════════════════════════════════════════════════════════════
// WEBHOOK HANDLERS (Internal)
// ═══════════════════════════════════════════════════════════════

/**
 * Handle subscription update from Stripe
 */
async function handleSubscriptionUpdate(stripeSubscription) {
    const { customer, id, status, current_period_start, current_period_end, cancel_at_period_end, metadata } = stripeSubscription;

    // Find subscription by Stripe ID
    const subscription = await Subscription.findOne({ stripeSubscriptionId: id });
    if (!subscription) {
        logger.warn('Subscription not found for Stripe subscription', { stripeSubscriptionId: id });
        return;
    }

    // Map Stripe status to our status
    const statusMap = {
        'active': 'active',
        'trialing': 'trialing',
        'past_due': 'past_due',
        'canceled': 'canceled',
        'incomplete': 'incomplete',
        'incomplete_expired': 'canceled',
        'unpaid': 'past_due'
    };

    subscription.status = statusMap[status] || subscription.status;
    subscription.currentPeriodStart = new Date(current_period_start * 1000);
    subscription.currentPeriodEnd = new Date(current_period_end * 1000);
    subscription.cancelAtPeriodEnd = cancel_at_period_end;

    if (status === 'canceled') {
        subscription.canceledAt = new Date();
    }

    await subscription.save();
    logger.info('Subscription updated from webhook', { subscriptionId: subscription._id, status: subscription.status });
}

/**
 * Handle subscription deletion from Stripe
 */
async function handleSubscriptionDeleted(stripeSubscription) {
    const { id } = stripeSubscription;

    const subscription = await Subscription.findOne({ stripeSubscriptionId: id });
    if (!subscription) {
        logger.warn('Subscription not found for deletion', { stripeSubscriptionId: id });
        return;
    }

    subscription.status = 'canceled';
    subscription.canceledAt = new Date();
    await subscription.save();

    logger.info('Subscription canceled from webhook', { subscriptionId: subscription._id });
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaymentSucceeded(stripeInvoice) {
    const { id, subscription: stripeSubscriptionId, amount_paid, paid, status } = stripeInvoice;

    // Update billing invoice if exists
    let billingInvoice = await BillingInvoice.findOne({ stripeInvoiceId: id });

    if (billingInvoice) {
        billingInvoice.status = 'paid';
        billingInvoice.paidAt = new Date();
        billingInvoice.lastError = null;
        await billingInvoice.save();

        logger.info('Billing invoice marked as paid', { invoiceId: billingInvoice._id });
    } else {
        // Create billing invoice record if it doesn't exist
        const subscription = await Subscription.findOne({ stripeSubscriptionId });

        if (subscription) {
            billingInvoice = await BillingInvoice.create({
                firmId: subscription.firmId,
                subscriptionId: subscription._id,
                stripeInvoiceId: id,
                stripePaymentIntentId: stripeInvoice.payment_intent,
                totalCents: amount_paid,
                subtotalCents: stripeInvoice.subtotal,
                taxCents: stripeInvoice.tax || 0,
                currency: stripeInvoice.currency.toUpperCase(),
                status: 'paid',
                paidAt: new Date(),
                invoiceDate: new Date(stripeInvoice.created * 1000),
                dueDate: stripeInvoice.due_date ? new Date(stripeInvoice.due_date * 1000) : null,
                periodStart: stripeInvoice.period_start ? new Date(stripeInvoice.period_start * 1000) : null,
                periodEnd: stripeInvoice.period_end ? new Date(stripeInvoice.period_end * 1000) : null,
                pdfUrl: stripeInvoice.invoice_pdf,
                hostedInvoiceUrl: stripeInvoice.hosted_invoice_url
            });

            logger.info('Billing invoice created from successful payment', { invoiceId: billingInvoice._id });
        }
    }

    // Update subscription status if needed
    if (stripeSubscriptionId) {
        const subscription = await Subscription.findOne({ stripeSubscriptionId });
        if (subscription && subscription.status === 'past_due') {
            subscription.status = 'active';
            await subscription.save();
            logger.info('Subscription reactivated after payment', { subscriptionId: subscription._id });
        }
    }
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(stripeInvoice) {
    const { id, subscription: stripeSubscriptionId, attempt_count, last_finalization_error } = stripeInvoice;

    // Update billing invoice if exists
    let billingInvoice = await BillingInvoice.findOne({ stripeInvoiceId: id });

    if (billingInvoice) {
        billingInvoice.attemptCount = attempt_count || 0;
        billingInvoice.lastAttemptAt = new Date();
        billingInvoice.lastError = last_finalization_error?.message || 'Payment failed';
        await billingInvoice.save();

        logger.warn('Billing invoice payment failed', {
            invoiceId: billingInvoice._id,
            attemptCount: attempt_count,
            error: last_finalization_error?.message
        });
    }

    // Update subscription status
    if (stripeSubscriptionId) {
        const subscription = await Subscription.findOne({ stripeSubscriptionId });
        if (subscription && subscription.status !== 'past_due') {
            subscription.status = 'past_due';
            await subscription.save();
            logger.warn('Subscription marked as past due', { subscriptionId: subscription._id });
        }
    }
}

/**
 * Handle invoice creation or finalization
 */
async function handleInvoiceCreatedOrFinalized(stripeInvoice) {
    const { id, subscription: stripeSubscriptionId, status, total, subtotal } = stripeInvoice;

    // Find subscription
    const subscription = await Subscription.findOne({ stripeSubscriptionId });
    if (!subscription) {
        logger.warn('Subscription not found for invoice', { stripeSubscriptionId });
        return;
    }

    // Check if billing invoice already exists
    let billingInvoice = await BillingInvoice.findOne({ stripeInvoiceId: id });

    if (!billingInvoice) {
        // Create new billing invoice
        billingInvoice = await BillingInvoice.create({
            firmId: subscription.firmId,
            subscriptionId: subscription._id,
            stripeInvoiceId: id,
            stripePaymentIntentId: stripeInvoice.payment_intent,
            totalCents: total,
            subtotalCents: subtotal,
            taxCents: stripeInvoice.tax || 0,
            discountCents: stripeInvoice.total_discount_amounts?.[0]?.amount || 0,
            currency: stripeInvoice.currency.toUpperCase(),
            status: status === 'paid' ? 'paid' : 'open',
            invoiceDate: new Date(stripeInvoice.created * 1000),
            dueDate: stripeInvoice.due_date ? new Date(stripeInvoice.due_date * 1000) : null,
            periodStart: stripeInvoice.period_start ? new Date(stripeInvoice.period_start * 1000) : null,
            periodEnd: stripeInvoice.period_end ? new Date(stripeInvoice.period_end * 1000) : null,
            pdfUrl: stripeInvoice.invoice_pdf,
            hostedInvoiceUrl: stripeInvoice.hosted_invoice_url,
            lineItems: stripeInvoice.lines?.data?.map(line => ({
                description: line.description,
                quantity: line.quantity,
                unitAmountCents: line.price?.unit_amount || 0,
                amountCents: line.amount
            })) || []
        });

        logger.info('Billing invoice created from webhook', { invoiceId: billingInvoice._id, status });
    } else {
        // Update existing invoice
        await billingInvoice.updateStripeInfo({
            stripeInvoiceId: id,
            stripePaymentIntentId: stripeInvoice.payment_intent,
            pdfUrl: stripeInvoice.invoice_pdf,
            hostedInvoiceUrl: stripeInvoice.hosted_invoice_url,
            status: stripeInvoice.status
        });

        logger.info('Billing invoice updated from webhook', { invoiceId: billingInvoice._id });
    }
}
