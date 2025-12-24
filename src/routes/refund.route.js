/**
 * Refund Routes
 *
 * API endpoints for refund management:
 * - Customer refund requests
 * - Admin approval/rejection
 * - Refund history
 * - Statistics and reporting
 */

const express = require('express');
const router = express.Router();
const refundController = require('../controllers/refund.controller');

// Note: Add your authentication and authorization middleware
// Example: const { authenticate, authorize } = require('../middleware/auth');

// ═══════════════════════════════════════════════════════════════
// CUSTOMER ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/refunds/eligibility/:paymentId
 * @desc    Check refund eligibility for a payment
 * @access  Private (Customer)
 */
router.get(
    '/eligibility/:paymentId',
    // authenticate,
    refundController.checkEligibility
);

/**
 * @route   POST /api/refunds/request
 * @desc    Request a refund
 * @access  Private (Customer)
 * @body    { paymentId, reason, reasonDetails, customAmount?, refundMethod? }
 */
router.post(
    '/request',
    // authenticate,
    refundController.requestRefund
);

/**
 * @route   GET /api/refunds/history
 * @desc    Get refund history for current user
 * @access  Private (Customer)
 * @query   { limit?, skip?, status?, startDate?, endDate? }
 */
router.get(
    '/history',
    // authenticate,
    refundController.getMyRefunds
);

/**
 * @route   GET /api/refunds/:id
 * @desc    Get specific refund details
 * @access  Private (Customer/Admin)
 */
router.get(
    '/:id',
    // authenticate,
    refundController.getRefundDetails
);

// ═══════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/admin/refunds
 * @desc    Get all refunds with filters
 * @access  Private (Admin)
 * @query   { status?, customerId?, startDate?, endDate?, limit?, skip? }
 */
router.get(
    '/admin/all',
    // authenticate,
    // authorize('admin', 'manager'),
    refundController.getAllRefunds
);

/**
 * @route   GET /api/admin/refunds/pending
 * @desc    Get all pending refund requests
 * @access  Private (Admin)
 * @query   { limit?, skip? }
 */
router.get(
    '/admin/pending',
    // authenticate,
    // authorize('admin', 'manager'),
    refundController.getPendingRefunds
);

/**
 * @route   GET /api/admin/refunds/statistics
 * @desc    Get refund statistics
 * @access  Private (Admin)
 * @query   { firmId?, startDate?, endDate?, customerId? }
 */
router.get(
    '/admin/statistics',
    // authenticate,
    // authorize('admin', 'manager'),
    refundController.getStatistics
);

/**
 * @route   POST /api/admin/refunds/:id/approve
 * @desc    Approve a refund request
 * @access  Private (Admin)
 * @body    { approvedAmount?, notes?, executeImmediately? }
 */
router.post(
    '/admin/:id/approve',
    // authenticate,
    // authorize('admin', 'manager'),
    refundController.approveRefund
);

/**
 * @route   POST /api/admin/refunds/:id/reject
 * @desc    Reject a refund request
 * @access  Private (Admin)
 * @body    { reason }
 */
router.post(
    '/admin/:id/reject',
    // authenticate,
    // authorize('admin', 'manager'),
    refundController.rejectRefund
);

/**
 * @route   POST /api/admin/refunds/:id/execute
 * @desc    Execute/process an approved refund
 * @access  Private (Admin)
 */
router.post(
    '/admin/:id/execute',
    // authenticate,
    // authorize('admin', 'finance'),
    refundController.executeRefund
);

/**
 * @route   POST /api/admin/refunds/:id/retry
 * @desc    Retry a failed refund
 * @access  Private (Admin)
 */
router.post(
    '/admin/:id/retry',
    // authenticate,
    // authorize('admin', 'finance'),
    refundController.retryRefund
);

module.exports = router;
