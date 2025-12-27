/**
 * Payout Controller
 *
 * Handles lawyer payout operations using Stripe Connect:
 * - Stripe Connect onboarding
 * - Payout requests and processing
 * - Payout history and statistics
 * - Account management
 */

const payoutService = require('../services/payout.service');
const { User, Payout } = require('../models');
const { CustomException } = require('../utils');
const logger = require('../utils/logger');
const Joi = require('joi');

// ═══════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════

const createPayoutSchema = Joi.object({
    amount: Joi.number().positive().required().messages({
        'number.positive': 'Amount must be positive',
        'any.required': 'Amount is required'
    }),
    currency: Joi.string().length(3).uppercase().optional().default('SAR'),
    description: Joi.string().max(500).optional(),
    paymentIds: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).optional(),
    invoiceIds: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).optional(),
    caseIds: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).optional(),
    metadata: Joi.object().optional()
});

const payoutHistorySchema = Joi.object({
    status: Joi.string().valid('pending', 'processing', 'paid', 'failed', 'cancelled').optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    limit: Joi.number().integer().min(1).max(100).optional().default(50),
    page: Joi.number().integer().min(1).optional().default(1)
}).options({ stripUnknown: true });

const cancelPayoutSchema = Joi.object({
    reason: Joi.string().required().max(500).messages({
        'any.required': 'Cancellation reason is required',
        'string.max': 'Reason must not exceed 500 characters'
    })
});

// ═══════════════════════════════════════════════════════════════
// STRIPE CONNECT ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/lawyers/stripe/connect
 * Start Stripe Connect onboarding
 */
const startConnectOnboarding = async (req, res) => {
    try {
        if (!payoutService.isConfigured()) {
            throw CustomException('Stripe is not configured on this server', 503);
        }

        const lawyerId = req.user._id;

        // Verify user is a lawyer
        if (req.user.role !== 'lawyer') {
            throw CustomException('Only lawyers can create Connect accounts', 403);
        }

        // Create or get existing Connect account
        const accountResult = await payoutService.createConnectAccount(lawyerId.toString());

        // If account needs onboarding, create an account link
        if (accountResult.requiresOnboarding || !accountResult.onboardingComplete) {
            const returnUrl = req.body.returnUrl || `${process.env.FRONTEND_URL}/lawyer/stripe/callback`;
            const refreshUrl = req.body.refreshUrl || `${process.env.FRONTEND_URL}/lawyer/stripe/refresh`;

            const accountLink = await payoutService.createAccountLink(
                accountResult.accountId,
                returnUrl,
                refreshUrl
            );

            logger.info('Stripe Connect onboarding started', {
                lawyerId,
                accountId: accountResult.accountId
            });

            return res.status(200).json({
                error: false,
                message: 'Connect account created. Please complete onboarding.',
                data: {
                    accountId: accountResult.accountId,
                    onboardingUrl: accountLink.url,
                    expiresAt: accountLink.expiresAt
                }
            });
        }

        return res.status(200).json({
            error: false,
            message: 'Connect account already set up',
            data: {
                accountId: accountResult.accountId,
                status: accountResult.status
            }
        });
    } catch (error) {
        logger.error('Error starting Connect onboarding', {
            error: error.message,
            userId: req.user?._id
        });

        return res.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to start Connect onboarding'
        });
    }
};

/**
 * GET /api/lawyers/stripe/callback
 * Handle OAuth callback after Stripe onboarding
 */
const handleStripeCallback = async (req, res) => {
    try {
        const lawyerId = req.user._id;

        const lawyer = await User.findOne({ _id: lawyerId, ...req.firmQuery });
        if (!lawyer || !lawyer.stripeConnectAccountId) {
            throw CustomException('Stripe Connect account not found', 404);
        }

        // Retrieve account status from Stripe
        const accountDetails = await payoutService.getConnectAccount(lawyer.stripeConnectAccountId);

        // Update lawyer record based on account status
        await payoutService.updateAccountStatus(lawyer.stripeConnectAccountId, {
            payouts_enabled: accountDetails.payoutsEnabled,
            details_submitted: accountDetails.detailsSubmitted,
            requirements: accountDetails.requirements
        });

        logger.info('Stripe callback processed', {
            lawyerId,
            accountId: lawyer.stripeConnectAccountId,
            payoutsEnabled: accountDetails.payoutsEnabled
        });

        return res.status(200).json({
            error: false,
            message: accountDetails.payoutsEnabled
                ? 'Onboarding complete! You can now receive payouts.'
                : 'Onboarding in progress. Some requirements still pending.',
            data: {
                accountId: lawyer.stripeConnectAccountId,
                payoutsEnabled: accountDetails.payoutsEnabled,
                detailsSubmitted: accountDetails.detailsSubmitted,
                requirements: accountDetails.requirements
            }
        });
    } catch (error) {
        logger.error('Error handling Stripe callback', {
            error: error.message,
            userId: req.user?._id
        });

        return res.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to process callback'
        });
    }
};

/**
 * GET /api/lawyers/stripe/dashboard
 * Get Stripe dashboard access link
 */
const getStripeDashboard = async (req, res) => {
    try {
        if (!payoutService.isConfigured()) {
            throw CustomException('Stripe is not configured on this server', 503);
        }

        const lawyerId = req.user._id;

        const lawyer = await User.findOne({ _id: lawyerId, ...req.firmQuery });
        if (!lawyer || !lawyer.stripeConnectAccountId) {
            throw CustomException('Stripe Connect account not found. Please complete onboarding first.', 404);
        }

        const dashboardLink = await payoutService.createDashboardLink(lawyer.stripeConnectAccountId);

        logger.info('Dashboard link created', {
            lawyerId,
            accountId: lawyer.stripeConnectAccountId
        });

        return res.status(200).json({
            error: false,
            data: {
                url: dashboardLink.url
            }
        });
    } catch (error) {
        logger.error('Error creating dashboard link', {
            error: error.message,
            userId: req.user?._id
        });

        return res.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to create dashboard link'
        });
    }
};

/**
 * GET /api/lawyers/stripe/account
 * Get current Connect account status
 */
const getConnectAccountStatus = async (req, res) => {
    try {
        const lawyerId = req.user._id;

        const lawyer = await User.findOne({ _id: lawyerId, ...req.firmQuery })
            .select('stripeConnectAccountId stripePayoutEnabled stripeOnboardingComplete stripeAccountStatus stripeOnboardingCompletedAt platformCommissionRate');

        if (!lawyer) {
            throw CustomException('Lawyer not found', 404);
        }

        let accountDetails = null;
        if (lawyer.stripeConnectAccountId && payoutService.isConfigured()) {
            try {
                accountDetails = await payoutService.getConnectAccount(lawyer.stripeConnectAccountId);
            } catch (error) {
                logger.warn('Could not retrieve Stripe account details', {
                    lawyerId,
                    error: error.message
                });
            }
        }

        return res.status(200).json({
            error: false,
            data: {
                hasAccount: !!lawyer.stripeConnectAccountId,
                accountId: lawyer.stripeConnectAccountId,
                payoutsEnabled: lawyer.stripePayoutEnabled,
                onboardingComplete: lawyer.stripeOnboardingComplete,
                accountStatus: lawyer.stripeAccountStatus,
                onboardingCompletedAt: lawyer.stripeOnboardingCompletedAt,
                commissionRate: lawyer.platformCommissionRate,
                stripeDetails: accountDetails
            }
        });
    } catch (error) {
        logger.error('Error getting account status', {
            error: error.message,
            userId: req.user?._id
        });

        return res.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to get account status'
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// PAYOUT MANAGEMENT ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/lawyers/payouts/request
 * Request a payout
 */
const requestPayout = async (req, res) => {
    try {
        if (!payoutService.isConfigured()) {
            throw CustomException('Stripe is not configured on this server', 503);
        }

        // Validate request body
        const { error, value } = createPayoutSchema.validate(req.body);
        if (error) {
            const errors = error.details.map(d => d.message).join(', ');
            throw CustomException(`Validation error: ${errors}`, 400);
        }

        const lawyerId = req.user._id;

        // Verify user is a lawyer
        if (req.user.role !== 'lawyer') {
            throw CustomException('Only lawyers can request payouts', 403);
        }

        // Create payout
        const payout = await payoutService.createPayout({
            lawyerId: lawyerId.toString(),
            amount: value.amount,
            currency: value.currency,
            description: value.description,
            paymentIds: value.paymentIds,
            invoiceIds: value.invoiceIds,
            caseIds: value.caseIds,
            metadata: value.metadata,
            createdBy: lawyerId
        });

        logger.info('Payout requested', {
            lawyerId,
            payoutId: payout._id,
            amount: value.amount
        });

        return res.status(201).json({
            error: false,
            message: 'Payout requested successfully',
            data: {
                payoutId: payout._id,
                payoutNumber: payout.payoutNumber,
                grossAmount: payout.grossAmount,
                platformCommission: payout.platformCommission,
                netAmount: payout.netAmount,
                status: payout.status,
                requestedAt: payout.requestedAt
            }
        });
    } catch (error) {
        logger.error('Error requesting payout', {
            error: error.message,
            userId: req.user?._id
        });

        return res.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to request payout'
        });
    }
};

/**
 * GET /api/lawyers/payouts
 * Get payout history
 */
const getPayoutHistory = async (req, res) => {
    try {
        // Validate query parameters
        const { error, value } = payoutHistorySchema.validate(req.query);
        if (error) {
            const errors = error.details.map(d => d.message).join(', ');
            throw CustomException(`Validation error: ${errors}`, 400);
        }

        const lawyerId = req.user._id;

        const result = await payoutService.getPayoutHistory(lawyerId.toString(), value);

        return res.status(200).json({
            error: false,
            data: {
                payouts: result.payouts,
                pagination: result.pagination
            }
        });
    } catch (error) {
        logger.error('Error getting payout history', {
            error: error.message,
            userId: req.user?._id
        });

        return res.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to get payout history'
        });
    }
};

/**
 * GET /api/lawyers/payouts/:id
 * Get payout details
 */
const getPayoutDetails = async (req, res) => {
    try {
        const payoutId = req.params.id;
        const lawyerId = req.user._id;

        const payout = await payoutService.getPayoutDetails(payoutId);

        // Verify ownership
        if (payout.lawyerId._id.toString() !== lawyerId.toString()) {
            throw CustomException('Resource not found', 404);
        }

        return res.status(200).json({
            error: false,
            data: payout
        });
    } catch (error) {
        logger.error('Error getting payout details', {
            error: error.message,
            payoutId: req.params.id,
            userId: req.user?._id
        });

        return res.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to get payout details'
        });
    }
};

/**
 * POST /api/lawyers/payouts/:id/cancel
 * Cancel a payout
 */
const cancelPayout = async (req, res) => {
    try {
        // Validate request body
        const { error, value } = cancelPayoutSchema.validate(req.body);
        if (error) {
            const errors = error.details.map(d => d.message).join(', ');
            throw CustomException(`Validation error: ${errors}`, 400);
        }

        const payoutId = req.params.id;
        const lawyerId = req.user._id;

        // Get payout and verify ownership
        const payout = await Payout.findOne({ _id: payoutId, ...req.firmQuery });
        if (!payout) {
            throw CustomException('Resource not found', 404);
        }

        if (payout.lawyerId.toString() !== lawyerId.toString()) {
            throw CustomException('Resource not found', 404);
        }

        const cancelledPayout = await payoutService.cancelPayout(
            payoutId,
            lawyerId.toString(),
            value.reason
        );

        logger.info('Payout cancelled', {
            payoutId,
            lawyerId,
            reason: value.reason
        });

        return res.status(200).json({
            error: false,
            message: 'Payout cancelled successfully',
            data: cancelledPayout
        });
    } catch (error) {
        logger.error('Error cancelling payout', {
            error: error.message,
            payoutId: req.params.id,
            userId: req.user?._id
        });

        return res.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to cancel payout'
        });
    }
};

/**
 * POST /api/lawyers/payouts/:id/retry
 * Retry a failed payout
 */
const retryPayout = async (req, res) => {
    try {
        const payoutId = req.params.id;
        const lawyerId = req.user._id;

        // Get payout and verify ownership
        const payout = await Payout.findOne({ _id: payoutId, ...req.firmQuery });
        if (!payout) {
            throw CustomException('Resource not found', 404);
        }

        if (payout.lawyerId.toString() !== lawyerId.toString()) {
            throw CustomException('Resource not found', 404);
        }

        const retriedPayout = await payoutService.retryPayout(payoutId);

        logger.info('Payout retry initiated', {
            payoutId,
            lawyerId
        });

        return res.status(200).json({
            error: false,
            message: 'Payout retry initiated',
            data: retriedPayout
        });
    } catch (error) {
        logger.error('Error retrying payout', {
            error: error.message,
            payoutId: req.params.id,
            userId: req.user?._id
        });

        return res.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to retry payout'
        });
    }
};

/**
 * GET /api/lawyers/payouts/stats
 * Get payout statistics
 */
const getPayoutStats = async (req, res) => {
    try {
        const lawyerId = req.user._id;

        // Parse filter parameters
        const filters = {};
        if (req.query.startDate) filters.startDate = req.query.startDate;
        if (req.query.endDate) filters.endDate = req.query.endDate;

        const stats = await payoutService.getLawyerStats(lawyerId.toString(), filters);

        return res.status(200).json({
            error: false,
            data: stats
        });
    } catch (error) {
        logger.error('Error getting payout stats', {
            error: error.message,
            userId: req.user?._id
        });

        return res.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to get payout statistics'
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // Stripe Connect
    startConnectOnboarding,
    handleStripeCallback,
    getStripeDashboard,
    getConnectAccountStatus,

    // Payout Management
    requestPayout,
    getPayoutHistory,
    getPayoutDetails,
    cancelPayout,
    retryPayout,
    getPayoutStats
};
