/**
 * Payout Routes
 *
 * Routes for lawyer payout management using Stripe Connect.
 * Handles onboarding, payout requests, and payout history.
 *
 * Base route: /api/lawyers
 */

const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
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
} = require('../controllers/payout.controller');

const router = express.Router();

// ============ APPLY MIDDLEWARE ============
// All payout routes require authentication
router.use(userMiddleware);

// ============ STRIPE CONNECT ONBOARDING ============

/**
 * POST /api/lawyers/stripe/connect
 * Start Stripe Connect onboarding process
 * Creates a Connect account and returns onboarding URL
 */
router.post('/stripe/connect', startConnectOnboarding);

/**
 * GET /api/lawyers/stripe/callback
 * Handle OAuth callback after Stripe onboarding
 * Updates account status based on Stripe verification
 */
router.get('/stripe/callback', handleStripeCallback);

/**
 * GET /api/lawyers/stripe/dashboard
 * Get Stripe Express Dashboard access link
 * Allows lawyers to view their Stripe account details
 */
router.get('/stripe/dashboard', getStripeDashboard);

/**
 * GET /api/lawyers/stripe/account
 * Get current Connect account status
 * Returns onboarding status, payout eligibility, etc.
 */
router.get('/stripe/account', getConnectAccountStatus);

// ============ PAYOUT MANAGEMENT ============

/**
 * GET /api/lawyers/payouts/stats
 * Get payout statistics for the lawyer
 * Must come before /:id route to avoid conflicts
 */
router.get('/payouts/stats', getPayoutStats);

/**
 * POST /api/lawyers/payouts/request
 * Request a new payout
 * Creates a payout request and processes it via Stripe
 */
router.post('/payouts/request', requestPayout);

/**
 * GET /api/lawyers/payouts
 * Get payout history for the lawyer
 * Supports filtering by status, date range, pagination
 */
router.get('/payouts', getPayoutHistory);

/**
 * GET /api/lawyers/payouts/:id
 * Get details of a specific payout
 */
router.get('/payouts/:id', getPayoutDetails);

/**
 * POST /api/lawyers/payouts/:id/cancel
 * Cancel a pending payout
 * Only pending payouts can be cancelled
 */
router.post('/payouts/:id/cancel', cancelPayout);

/**
 * POST /api/lawyers/payouts/:id/retry
 * Retry a failed payout
 * Attempts to process the payout again
 */
router.post('/payouts/:id/retry', retryPayout);

module.exports = router;
