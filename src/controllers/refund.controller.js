/**
 * Refund Controller
 *
 * Handles HTTP requests for refund operations:
 * - Check refund eligibility
 * - Request refunds
 * - Approve/reject refunds (admin)
 * - Execute refunds (admin)
 * - View refund history
 * - Get refund statistics
 */

const refundPolicyService = require('../services/refundPolicy.service');
const Refund = require('../models/refund.model');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// CUSTOMER ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Check refund eligibility for a payment
 * GET /api/refunds/eligibility/:paymentId
 */
exports.checkEligibility = async (req, res) => {
    try {
        const { paymentId } = req.params;

        const eligibility = await refundPolicyService.getRefundEligibility(paymentId);

        res.json({
            success: true,
            data: eligibility
        });
    } catch (error) {
        logger.error('Error checking refund eligibility', {
            error: error.message,
            paymentId: req.params.paymentId
        });

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Request a refund
 * POST /api/refunds/request
 */
exports.requestRefund = async (req, res) => {
    try {
        const {
            paymentId,
            reason,
            reasonDetails,
            customAmount,
            refundMethod
        } = req.body;

        const userId = req.user.id;  // From auth middleware

        // Check eligibility first
        const eligibility = await refundPolicyService.getRefundEligibility(paymentId);

        if (!eligibility.eligible && !customAmount) {
            return res.status(400).json({
                success: false,
                message: eligibility.reason,
                data: { eligibility }
            });
        }

        // Process refund
        const result = await refundPolicyService.processRefund(
            paymentId,
            customAmount || null,
            reason,
            userId,
            {
                reasonDetails,
                refundMethod: refundMethod || 'original',
                processImmediately: !eligibility.requiresApproval,
                customerNotes: reasonDetails
            }
        );

        res.status(201).json({
            success: true,
            message: eligibility.requiresApproval
                ? 'Refund request submitted for approval'
                : 'Refund processed successfully',
            data: {
                refund: result.refund,
                requiresApproval: eligibility.requiresApproval
            }
        });
    } catch (error) {
        logger.error('Error requesting refund', {
            error: error.message,
            userId: req.user?.id,
            paymentId: req.body.paymentId
        });

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get refund history for current user
 * GET /api/refunds/history
 */
exports.getMyRefunds = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            limit = 10,
            skip = 0,
            status,
            startDate,
            endDate
        } = req.query;

        const history = await refundPolicyService.getRefundHistory(userId, {
            limit: parseInt(limit),
            skip: parseInt(skip),
            status,
            startDate,
            endDate,
            firmId: req.user.firmId
        });

        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        logger.error('Error getting refund history', {
            error: error.message,
            userId: req.user?.id
        });

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get specific refund details
 * GET /api/refunds/:id
 */
exports.getRefundDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const firmId = req.user.firmId;

        // IDOR Protection: Use findOne with firmId
        const refund = await Refund.findOne({ _id: id, firmId })
            .populate('paymentId', 'paymentNumber amount paymentDate')
            .populate('customerId', 'firstName lastName email')
            .populate('approvedBy', 'firstName lastName')
            .populate('requestedBy', 'firstName lastName');

        if (!refund) {
            return res.status(404).json({
                success: false,
                message: 'Refund not found'
            });
        }

        // Check authorization (customer can only see their own refunds)
        if (!req.user.isAdmin && refund.customerId._id.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to view this refund'
            });
        }

        res.json({
            success: true,
            data: { refund }
        });
    } catch (error) {
        logger.error('Error getting refund details', {
            error: error.message,
            refundId: req.params.id
        });

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all pending refunds (admin)
 * GET /api/admin/refunds/pending
 */
exports.getPendingRefunds = async (req, res) => {
    try {
        const firmId = req.user.firmId;
        const { limit = 50, skip = 0 } = req.query;

        const pending = await refundPolicyService.getPendingRefunds(firmId, {
            limit: parseInt(limit),
            skip: parseInt(skip)
        });

        res.json({
            success: true,
            data: pending
        });
    } catch (error) {
        logger.error('Error getting pending refunds', {
            error: error.message
        });

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Approve a refund (admin)
 * POST /api/admin/refunds/:id/approve
 */
exports.approveRefund = async (req, res) => {
    try {
        const { id } = req.params;
        const { approvedAmount, notes } = req.body;
        const approverId = req.user.id;

        const refund = await refundPolicyService.approveRefund(
            id,
            approverId,
            approvedAmount,
            notes
        );

        // Auto-execute if configured
        if (req.body.executeImmediately) {
            await refundPolicyService.executeRefund(id, approverId);
        }

        res.json({
            success: true,
            message: 'Refund approved successfully',
            data: { refund }
        });
    } catch (error) {
        logger.error('Error approving refund', {
            error: error.message,
            refundId: req.params.id
        });

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Reject a refund (admin)
 * POST /api/admin/refunds/:id/reject
 */
exports.rejectRefund = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const rejectorId = req.user.id;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        const refund = await refundPolicyService.rejectRefund(
            id,
            rejectorId,
            reason
        );

        res.json({
            success: true,
            message: 'Refund rejected',
            data: { refund }
        });
    } catch (error) {
        logger.error('Error rejecting refund', {
            error: error.message,
            refundId: req.params.id
        });

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Execute/process a refund (admin)
 * POST /api/admin/refunds/:id/execute
 */
exports.executeRefund = async (req, res) => {
    try {
        const { id } = req.params;
        const processedBy = req.user.id;

        const refund = await refundPolicyService.executeRefund(id, processedBy);

        res.json({
            success: true,
            message: 'Refund executed successfully',
            data: { refund }
        });
    } catch (error) {
        logger.error('Error executing refund', {
            error: error.message,
            refundId: req.params.id
        });

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get refund statistics (admin)
 * GET /api/admin/refunds/statistics
 */
exports.getStatistics = async (req, res) => {
    try {
        const {
            firmId,
            startDate,
            endDate,
            customerId
        } = req.query;

        const filters = {};
        if (firmId) filters.firmId = firmId;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (customerId) filters.customerId = customerId;

        // Default to user's firm if not specified
        if (!filters.firmId && req.user.firmId) {
            filters.firmId = req.user.firmId;
        }

        const stats = await refundPolicyService.getRefundStatistics(filters);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Error getting refund statistics', {
            error: error.message
        });

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get all refunds (admin) with filters
 * GET /api/admin/refunds
 */
exports.getAllRefunds = async (req, res) => {
    try {
        const {
            status,
            customerId,
            startDate,
            endDate,
            limit = 50,
            skip = 0
        } = req.query;

        const query = { firmId: req.user.firmId };

        if (status) query.status = status;
        if (customerId) query.customerId = customerId;
        if (startDate || endDate) {
            query.refundDate = {};
            if (startDate) query.refundDate.$gte = new Date(startDate);
            if (endDate) query.refundDate.$lte = new Date(endDate);
        }

        const refunds = await Refund.find(query)
            .populate('paymentId', 'paymentNumber amount paymentDate')
            .populate('customerId', 'firstName lastName email')
            .populate('approvedBy', 'firstName lastName')
            .populate('requestedBy', 'firstName lastName')
            .sort({ refundDate: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        const total = await Refund.countDocuments(query);

        res.json({
            success: true,
            data: {
                refunds,
                total,
                limit: parseInt(limit),
                skip: parseInt(skip),
                hasMore: total > parseInt(skip) + parseInt(limit)
            }
        });
    } catch (error) {
        logger.error('Error getting all refunds', {
            error: error.message
        });

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Retry a failed refund (admin)
 * POST /api/admin/refunds/:id/retry
 */
exports.retryRefund = async (req, res) => {
    try {
        const { id } = req.params;
        const processedBy = req.user.id;
        const firmId = req.user.firmId;

        // IDOR Protection: Use findOne with firmId
        const refund = await Refund.findOne({ _id: id, firmId });

        if (!refund) {
            return res.status(404).json({
                success: false,
                message: 'Refund not found'
            });
        }

        if (refund.status !== 'failed') {
            return res.status(400).json({
                success: false,
                message: 'Only failed refunds can be retried'
            });
        }

        if (!refund.failureDetails?.canRetry) {
            return res.status(400).json({
                success: false,
                message: 'This refund cannot be retried (max attempts reached)'
            });
        }

        // Reset to approved status and re-execute
        refund.status = 'approved';
        await refund.save();

        const result = await refundPolicyService.executeRefund(id, processedBy);

        res.json({
            success: true,
            message: 'Refund retry successful',
            data: { refund: result }
        });
    } catch (error) {
        logger.error('Error retrying refund', {
            error: error.message,
            refundId: req.params.id
        });

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
