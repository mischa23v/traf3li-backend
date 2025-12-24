/**
 * Payout Service for Stripe Connect
 *
 * Manages lawyer payouts through Stripe Connect:
 * - Connect account creation and onboarding
 * - Payout processing
 * - Commission calculations
 * - Payout history
 *
 * Features:
 * - Express Connect accounts for fast onboarding
 * - Account Links for verification
 * - Dashboard access for lawyers
 * - Automatic payout scheduling
 * - Commission tracking
 */

const Stripe = require('stripe');
const { withCircuitBreaker } = require('../utils/circuitBreaker');
const logger = require('../utils/logger');
const { User, Payout } = require('../models');

// Initialize Stripe with API key
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16',
        timeout: 30000,
        maxNetworkRetries: 2,
        telemetry: false
    });
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if Stripe is configured
 */
function isConfigured() {
    return !!stripe;
}

/**
 * Convert amount to cents (Stripe requires amounts in smallest currency unit)
 */
function toCents(amount, currency = 'sar') {
    const zeroDecimalCurrencies = ['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'];

    if (zeroDecimalCurrencies.includes(currency.toLowerCase())) {
        return Math.round(amount);
    }

    return Math.round(amount * 100);
}

/**
 * Convert cents to main currency unit
 */
function fromCents(cents, currency = 'sar') {
    const zeroDecimalCurrencies = ['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'];

    if (zeroDecimalCurrencies.includes(currency.toLowerCase())) {
        return cents;
    }

    return cents / 100;
}

// ═══════════════════════════════════════════════════════════════
// PAYOUT SERVICE CLASS
// ═══════════════════════════════════════════════════════════════

class PayoutService {
    constructor() {
        this.stripe = stripe;
    }

    /**
     * Check if Stripe is configured
     */
    isConfigured() {
        return isConfigured();
    }

    // ═══════════════════════════════════════════════════════════════
    // STRIPE CONNECT ACCOUNT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create a Stripe Connect account for a lawyer
     * @param {string} lawyerId - Lawyer's user ID
     * @returns {Promise<Object>} - Account details
     */
    async createConnectAccount(lawyerId) {
        if (!this.isConfigured()) {
            throw new Error('Stripe not configured. Please set STRIPE_SECRET_KEY environment variable.');
        }

        const lawyer = await User.findById(lawyerId);
        if (!lawyer) {
            throw new Error('Lawyer not found');
        }

        if (lawyer.role !== 'lawyer') {
            throw new Error('User is not a lawyer');
        }

        // Check if account already exists
        if (lawyer.stripeConnectAccountId) {
            const existingAccount = await this.getConnectAccount(lawyer.stripeConnectAccountId);
            return existingAccount;
        }

        return withCircuitBreaker('stripe', async () => {
            // Create Express Connect account
            const account = await this.stripe.accounts.create({
                type: 'express',
                country: 'SA', // Saudi Arabia
                email: lawyer.email,
                capabilities: {
                    transfers: { requested: true },
                    card_payments: { requested: false } // Lawyers only receive payouts
                },
                business_type: 'individual',
                individual: {
                    email: lawyer.email,
                    first_name: lawyer.firstName,
                    last_name: lawyer.lastName,
                    phone: lawyer.phone
                },
                business_profile: {
                    product_description: 'Legal services',
                    mcc: '8111', // Legal services MCC code
                    url: process.env.FRONTEND_URL || 'https://traf3li.com'
                },
                metadata: {
                    lawyerId: lawyerId.toString(),
                    platform: 'traf3li'
                }
            });

            // Update lawyer record
            lawyer.stripeConnectAccountId = account.id;
            lawyer.stripeAccountStatus = 'pending';
            lawyer.stripeOnboardingComplete = false;
            await lawyer.save();

            logger.info('Stripe Connect account created', {
                lawyerId,
                accountId: account.id,
                email: lawyer.email
            });

            return {
                accountId: account.id,
                status: 'pending',
                requiresOnboarding: true
            };
        });
    }

    /**
     * Create an Account Link for onboarding
     * @param {string} accountId - Stripe Connect account ID
     * @param {string} returnUrl - URL to redirect after completion
     * @param {string} refreshUrl - URL to redirect if link expires
     * @returns {Promise<Object>} - Account link details
     */
    async createAccountLink(accountId, returnUrl, refreshUrl) {
        if (!this.isConfigured()) {
            throw new Error('Stripe not configured');
        }

        return withCircuitBreaker('stripe', async () => {
            const accountLink = await this.stripe.accountLinks.create({
                account: accountId,
                refresh_url: refreshUrl || `${process.env.FRONTEND_URL}/lawyer/stripe/refresh`,
                return_url: returnUrl || `${process.env.FRONTEND_URL}/lawyer/stripe/callback`,
                type: 'account_onboarding'
            });

            logger.info('Account link created', {
                accountId,
                url: accountLink.url
            });

            return {
                url: accountLink.url,
                created: new Date(accountLink.created * 1000),
                expiresAt: new Date(accountLink.expires_at * 1000)
            };
        });
    }

    /**
     * Create a login link to Stripe Dashboard
     * @param {string} accountId - Stripe Connect account ID
     * @returns {Promise<Object>} - Dashboard login link
     */
    async createDashboardLink(accountId) {
        if (!this.isConfigured()) {
            throw new Error('Stripe not configured');
        }

        return withCircuitBreaker('stripe', async () => {
            const loginLink = await this.stripe.accounts.createLoginLink(accountId);

            logger.info('Dashboard login link created', { accountId });

            return {
                url: loginLink.url,
                created: new Date(loginLink.created * 1000)
            };
        });
    }

    /**
     * Get Connect account details
     * @param {string} accountId - Stripe Connect account ID
     * @returns {Promise<Object>} - Account details
     */
    async getConnectAccount(accountId) {
        if (!this.isConfigured()) {
            throw new Error('Stripe not configured');
        }

        return withCircuitBreaker('stripe', async () => {
            const account = await this.stripe.accounts.retrieve(accountId);

            return {
                id: account.id,
                email: account.email,
                country: account.country,
                defaultCurrency: account.default_currency,
                chargesEnabled: account.charges_enabled,
                payoutsEnabled: account.payouts_enabled,
                detailsSubmitted: account.details_submitted,
                requirements: {
                    currentlyDue: account.requirements?.currently_due || [],
                    eventuallyDue: account.requirements?.eventually_due || [],
                    pastDue: account.requirements?.past_due || [],
                    pendingVerification: account.requirements?.pending_verification || []
                },
                created: new Date(account.created * 1000)
            };
        });
    }

    /**
     * Update Connect account status in database
     * @param {string} accountId - Stripe Connect account ID
     * @param {Object} accountData - Updated account data from Stripe
     */
    async updateAccountStatus(accountId, accountData) {
        const lawyer = await User.findOne({ stripeConnectAccountId: accountId });

        if (!lawyer) {
            logger.warn('Lawyer not found for Stripe account', { accountId });
            return null;
        }

        // Update account status
        if (accountData.payouts_enabled && accountData.details_submitted) {
            lawyer.stripePayoutEnabled = true;
            lawyer.stripeOnboardingComplete = true;
            lawyer.stripeOnboardingCompletedAt = new Date();
            lawyer.stripeAccountStatus = 'active';
        } else if (accountData.requirements?.disabled_reason) {
            lawyer.stripePayoutEnabled = false;
            lawyer.stripeAccountStatus = 'disabled';
        } else if (accountData.requirements?.currently_due?.length > 0) {
            lawyer.stripeAccountStatus = 'restricted';
        } else {
            lawyer.stripeAccountStatus = 'pending';
        }

        await lawyer.save();

        logger.info('Lawyer account status updated', {
            lawyerId: lawyer._id,
            accountId,
            status: lawyer.stripeAccountStatus,
            payoutsEnabled: lawyer.stripePayoutEnabled
        });

        return lawyer;
    }

    // ═══════════════════════════════════════════════════════════════
    // PAYOUT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Calculate platform commission
     * @param {number} amount - Gross amount
     * @param {number} rate - Commission rate (percentage)
     * @returns {Object} - Commission breakdown
     */
    calculateCommission(amount, rate = 10) {
        const commission = (amount * rate) / 100;
        const netAmount = amount - commission;

        return {
            grossAmount: amount,
            commissionRate: rate,
            platformCommission: commission,
            netAmount
        };
    }

    /**
     * Create a payout for a lawyer
     * @param {Object} params - Payout parameters
     * @param {string} params.lawyerId - Lawyer's user ID
     * @param {number} params.amount - Gross amount to pay out
     * @param {string} params.currency - Currency code (default: SAR)
     * @param {string} params.description - Payout description
     * @param {Array} params.paymentIds - Related payment IDs
     * @param {Array} params.invoiceIds - Related invoice IDs
     * @param {Object} params.metadata - Additional metadata
     * @returns {Promise<Object>} - Created payout
     */
    async createPayout(params) {
        if (!this.isConfigured()) {
            throw new Error('Stripe not configured');
        }

        const {
            lawyerId,
            amount,
            currency = 'SAR',
            description,
            paymentIds = [],
            invoiceIds = [],
            caseIds = [],
            metadata = {},
            createdBy
        } = params;

        // Get lawyer details
        const lawyer = await User.findById(lawyerId);
        if (!lawyer) {
            throw new Error('Lawyer not found');
        }

        if (!lawyer.stripeConnectAccountId) {
            throw new Error('Lawyer does not have a Stripe Connect account');
        }

        if (!lawyer.stripePayoutEnabled || !lawyer.stripeOnboardingComplete) {
            throw new Error('Lawyer is not eligible for payouts. Please complete onboarding.');
        }

        // Calculate commission
        const commissionRate = lawyer.platformCommissionRate || 10;
        const commission = this.calculateCommission(amount, commissionRate);

        // Create payout record
        const payout = new Payout({
            firmId: lawyer.firmId,
            lawyerId,
            grossAmount: amount,
            platformCommission: commission.platformCommission,
            commissionRate: commission.commissionRate,
            netAmount: commission.netAmount,
            currency: currency.toUpperCase(),
            stripeConnectAccountId: lawyer.stripeConnectAccountId,
            description,
            paymentIds,
            invoiceIds,
            caseIds,
            metadata,
            createdBy,
            status: 'pending'
        });

        await payout.save();

        logger.info('Payout created', {
            payoutId: payout._id,
            payoutNumber: payout.payoutNumber,
            lawyerId,
            grossAmount: amount,
            netAmount: commission.netAmount,
            commissionRate
        });

        // Attempt to process the payout immediately
        try {
            await this.processPayout(payout._id.toString());
        } catch (error) {
            logger.error('Failed to process payout immediately', {
                payoutId: payout._id,
                error: error.message
            });
            // Payout remains in pending status for retry later
        }

        return payout;
    }

    /**
     * Process a pending payout
     * @param {string} payoutId - Payout ID
     * @returns {Promise<Object>} - Updated payout
     */
    async processPayout(payoutId) {
        if (!this.isConfigured()) {
            throw new Error('Stripe not configured');
        }

        const payout = await Payout.findById(payoutId);
        if (!payout) {
            throw new Error('Payout not found');
        }

        if (payout.status !== 'pending') {
            throw new Error(`Payout is not pending. Current status: ${payout.status}`);
        }

        // Update status to processing
        payout.status = 'processing';
        payout.processedAt = new Date();
        await payout.save();

        try {
            return await withCircuitBreaker('stripe', async () => {
                // Create a transfer to the connected account
                const transfer = await this.stripe.transfers.create({
                    amount: toCents(payout.netAmount, payout.currency),
                    currency: payout.currency.toLowerCase(),
                    destination: payout.stripeConnectAccountId,
                    description: payout.description || `Payout ${payout.payoutNumber}`,
                    metadata: {
                        payoutId: payoutId.toString(),
                        payoutNumber: payout.payoutNumber,
                        lawyerId: payout.lawyerId.toString(),
                        ...payout.metadata
                    }
                });

                // Update payout with Stripe details
                payout.stripeTransferId = transfer.id;
                payout.stripeBalanceTransactionId = transfer.balance_transaction;
                payout.status = 'paid';
                payout.paidAt = new Date();
                await payout.save();

                logger.info('Payout processed successfully', {
                    payoutId,
                    payoutNumber: payout.payoutNumber,
                    transferId: transfer.id,
                    amount: payout.netAmount
                });

                return payout;
            });
        } catch (error) {
            // Mark as failed
            payout.status = 'failed';
            payout.failureReason = error.message;
            payout.failureCode = error.code;
            payout.failureDate = new Date();
            payout.retryCount += 1;
            await payout.save();

            logger.error('Payout processing failed', {
                payoutId,
                error: error.message,
                code: error.code
            });

            throw error;
        }
    }

    /**
     * Get payout history for a lawyer
     * @param {string} lawyerId - Lawyer's user ID
     * @param {Object} filters - Filter options
     * @returns {Promise<Array>} - List of payouts
     */
    async getPayoutHistory(lawyerId, filters = {}) {
        const query = { lawyerId };

        if (filters.status) {
            query.status = filters.status;
        }

        if (filters.startDate || filters.endDate) {
            query.requestedAt = {};
            if (filters.startDate) query.requestedAt.$gte = new Date(filters.startDate);
            if (filters.endDate) query.requestedAt.$lte = new Date(filters.endDate);
        }

        const limit = parseInt(filters.limit) || 50;
        const page = parseInt(filters.page) || 1;
        const skip = (page - 1) * limit;

        const [payouts, total] = await Promise.all([
            Payout.find(query)
                .populate('createdBy', 'firstName lastName')
                .populate('approvedBy', 'firstName lastName')
                .sort({ requestedAt: -1 })
                .limit(limit)
                .skip(skip)
                .lean(),
            Payout.countDocuments(query)
        ]);

        return {
            payouts,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get payout details
     * @param {string} payoutId - Payout ID
     * @returns {Promise<Object>} - Payout details
     */
    async getPayoutDetails(payoutId) {
        const payout = await Payout.findById(payoutId)
            .populate('lawyerId', 'firstName lastName email stripeConnectAccountId')
            .populate('createdBy', 'firstName lastName')
            .populate('approvedBy', 'firstName lastName')
            .populate('cancelledBy', 'firstName lastName');

        if (!payout) {
            throw new Error('Payout not found');
        }

        return payout;
    }

    /**
     * Cancel a payout
     * @param {string} payoutId - Payout ID
     * @param {string} userId - User cancelling the payout
     * @param {string} reason - Cancellation reason
     * @returns {Promise<Object>} - Cancelled payout
     */
    async cancelPayout(payoutId, userId, reason) {
        const payout = await Payout.findById(payoutId);

        if (!payout) {
            throw new Error('Payout not found');
        }

        await payout.cancel(userId, reason);

        logger.info('Payout cancelled', {
            payoutId,
            payoutNumber: payout.payoutNumber,
            cancelledBy: userId,
            reason
        });

        return payout;
    }

    /**
     * Retry a failed payout
     * @param {string} payoutId - Payout ID
     * @returns {Promise<Object>} - Retried payout
     */
    async retryPayout(payoutId) {
        const payout = await Payout.findById(payoutId);

        if (!payout) {
            throw new Error('Payout not found');
        }

        await payout.retry();

        logger.info('Payout retry initiated', {
            payoutId,
            payoutNumber: payout.payoutNumber,
            retryCount: payout.retryCount
        });

        // Attempt to process again
        await this.processPayout(payoutId);

        return payout;
    }

    /**
     * Get lawyer payout statistics
     * @param {string} lawyerId - Lawyer's user ID
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} - Payout statistics
     */
    async getLawyerStats(lawyerId, filters = {}) {
        return await Payout.getLawyerStats(lawyerId, filters);
    }
}

// Export singleton instance
module.exports = new PayoutService();

// Also export class for testing
module.exports.PayoutService = PayoutService;
module.exports.isConfigured = isConfigured;
module.exports.toCents = toCents;
module.exports.fromCents = fromCents;
