/**
 * Refund Policy Automation Service
 *
 * Automates refund processing based on configurable policies:
 * - Automatic refund eligibility calculation
 * - Policy-based refund percentage determination
 * - Service completion tracking
 * - Integration with payment gateway (Stripe)
 * - Approval workflow management
 *
 * Features:
 * - Automated policy evaluation
 * - Multi-gateway support (Stripe, manual refunds)
 * - Comprehensive audit logging
 * - Refund history tracking
 * - Service completion percentage tracking
 */

const mongoose = require('mongoose');
const Refund = require('../models/refund.model');
const Payment = require('../models/payment.model');
const Case = require('../models/case.model');
const Invoice = require('../models/invoice.model');
const stripeService = require('./stripe.service');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// REFUND POLICY RULES
// ═══════════════════════════════════════════════════════════════
const REFUND_POLICIES = {
    // Full refund if service not started and within 24 hours
    FULL_REFUND: {
        priority: 1,  // Higher priority = checked first
        conditions: {
            serviceStarted: false,
            timeSincePurchase: { max: 24 * 60 * 60 * 1000 } // 24 hours
        },
        refundPercent: 100,
        requiresApproval: false,  // Auto-approve
        description: 'Full refund - Service not started within 24 hours'
    },

    // 75% refund if service not started within 7 days
    PARTIAL_75: {
        priority: 2,
        conditions: {
            serviceStarted: false,
            timeSincePurchase: { max: 7 * 24 * 60 * 60 * 1000 } // 7 days
        },
        refundPercent: 75,
        requiresApproval: true,
        description: '75% refund - Service not started within 7 days'
    },

    // 50% refund if less than 25% service completed
    PARTIAL_50: {
        priority: 3,
        conditions: {
            serviceCompletionPercent: { max: 25 }
        },
        refundPercent: 50,
        requiresApproval: true,
        description: '50% refund - Less than 25% service completed'
    },

    // 25% refund if less than 50% service completed
    PARTIAL_25: {
        priority: 4,
        conditions: {
            serviceCompletionPercent: { max: 50 }
        },
        refundPercent: 25,
        requiresApproval: true,
        description: '25% refund - Less than 50% service completed'
    },

    // No refund after 50% completion
    NO_REFUND: {
        priority: 5,
        conditions: {
            serviceCompletionPercent: { min: 50 }
        },
        refundPercent: 0,
        requiresApproval: false,  // Auto-reject
        description: 'No refund - More than 50% service completed'
    }
};

// ═══════════════════════════════════════════════════════════════
// REFUND POLICY SERVICE CLASS
// ═══════════════════════════════════════════════════════════════
class RefundPolicyService {
    constructor() {
        this.policies = REFUND_POLICIES;
    }

    // ═══════════════════════════════════════════════════════════════
    // CORE POLICY METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get refund eligibility for a payment
     * @param {ObjectId|string} paymentId - Payment ID
     * @param {ObjectId|string} firmId - Firm ID
     * @returns {Promise<Object>} - Eligibility details
     */
    async getRefundEligibility(paymentId, firmId) {
        try {
            // Get payment details
            const payment = await Payment.findOne({ _id: paymentId, firmId })
                .populate('customerId', 'firstName lastName email')
                .populate('invoiceId')
                .populate('caseId');

            if (!payment) {
                throw new Error('Payment not found');
            }

            // Check if already refunded
            if (payment.status === 'refunded' || payment.isRefund) {
                return {
                    eligible: false,
                    reason: 'Payment already refunded',
                    refundPercent: 0,
                    refundAmount: 0,
                    policy: null
                };
            }

            // Check if payment is completed
            if (payment.status !== 'completed' && payment.status !== 'reconciled') {
                return {
                    eligible: false,
                    reason: 'Payment not completed yet',
                    refundPercent: 0,
                    refundAmount: 0,
                    policy: null
                };
            }

            // Get service tracking details
            const serviceTracking = await this._getServiceTracking(payment);

            // Evaluate policies
            const matchedPolicy = this._evaluatePolicies(serviceTracking);

            // Calculate refund amount
            const refundAmount = (payment.amount * matchedPolicy.refundPercent) / 100;

            return {
                eligible: matchedPolicy.refundPercent > 0,
                reason: matchedPolicy.description,
                policy: matchedPolicy.name,
                refundPercent: matchedPolicy.refundPercent,
                refundAmount,
                originalAmount: payment.amount,
                currency: payment.currency,
                requiresApproval: matchedPolicy.requiresApproval,
                serviceTracking,
                payment: {
                    id: payment._id,
                    paymentNumber: payment.paymentNumber,
                    paymentDate: payment.paymentDate,
                    customer: payment.customerId
                }
            };
        } catch (error) {
            logger.error('Error getting refund eligibility', {
                paymentId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Calculate refund amount based on policy
     * @param {ObjectId|string} paymentId - Payment ID
     * @param {ObjectId|string} firmId - Firm ID
     * @param {string} reason - Refund reason
     * @returns {Promise<Object>} - Calculated refund details
     */
    async calculateRefundAmount(paymentId, firmId, reason = 'policy_based') {
        try {
            const eligibility = await this.getRefundEligibility(paymentId, firmId);

            if (!eligibility.eligible) {
                return {
                    success: false,
                    eligible: false,
                    reason: eligibility.reason,
                    refundAmount: 0
                };
            }

            return {
                success: true,
                eligible: true,
                refundAmount: eligibility.refundAmount,
                refundPercent: eligibility.refundPercent,
                originalAmount: eligibility.originalAmount,
                currency: eligibility.currency,
                policy: eligibility.policy,
                requiresApproval: eligibility.requiresApproval,
                reason: eligibility.reason
            };
        } catch (error) {
            logger.error('Error calculating refund amount', {
                paymentId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Process a refund
     * @param {ObjectId|string} paymentId - Payment ID
     * @param {ObjectId|string} firmId - Firm ID
     * @param {number} amount - Refund amount (optional, uses policy if not provided)
     * @param {string} reason - Refund reason
     * @param {ObjectId|string} requestedBy - User requesting refund
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Created refund object
     */
    async processRefund(paymentId, firmId, amount = null, reason = 'policy_based', requestedBy, options = {}) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Get payment
            const payment = await Payment.findOne({ _id: paymentId, firmId }).session(session);
            if (!payment) {
                throw new Error('Payment not found');
            }

            // Get eligibility
            const eligibility = await this.getRefundEligibility(paymentId, firmId);

            if (!eligibility.eligible && !options.forceProcess) {
                throw new Error(`Refund not eligible: ${eligibility.reason}`);
            }

            // Determine refund amount
            const refundAmount = amount || eligibility.refundAmount;

            if (refundAmount > payment.amount) {
                throw new Error('Refund amount cannot exceed original payment amount');
            }

            // Get service tracking
            const serviceTracking = await this._getServiceTracking(payment);

            // Create refund record
            const refund = new Refund({
                firmId: payment.firmId,
                paymentId: payment._id,
                originalAmount: payment.amount,
                currency: payment.currency,
                requestedAmount: refundAmount,
                approvedAmount: eligibility.requiresApproval ? null : refundAmount,
                reason,
                reasonDetails: options.reasonDetails || eligibility.reason,
                refundType: refundAmount === payment.amount ? 'full' : 'partial',
                refundMethod: options.refundMethod || 'original',
                customerId: payment.customerId || payment.clientId,
                lawyerId: payment.lawyerId,
                requestedBy,
                createdBy: requestedBy,
                requiresApproval: eligibility.requiresApproval && !options.autoApprove,
                status: eligibility.requiresApproval && !options.autoApprove ? 'pending' : 'approved',
                policyApplied: {
                    policyName: eligibility.policy,
                    refundPercent: eligibility.refundPercent,
                    conditions: eligibility.serviceTracking,
                    calculatedAt: new Date()
                },
                serviceTracking: {
                    caseId: payment.caseId,
                    invoiceId: payment.invoiceId,
                    serviceStarted: serviceTracking.serviceStarted,
                    serviceStartDate: serviceTracking.serviceStartDate,
                    serviceCompletionPercent: serviceTracking.serviceCompletionPercent,
                    purchaseDate: payment.paymentDate,
                    timeSincePurchase: serviceTracking.timeSincePurchase
                },
                internalNotes: options.internalNotes,
                customerNotes: options.customerNotes
            });

            // Auto-approve if policy allows
            if (!eligibility.requiresApproval || options.autoApprove) {
                refund.status = 'approved';
                refund.approvedBy = requestedBy;
                refund.approvedAt = new Date();
                refund.approvedAmount = refundAmount;
            }

            await refund.save({ session });

            // If auto-approved, process immediately
            if (refund.status === 'approved' && options.processImmediately) {
                await this._executeRefund(refund, payment, session);
            }

            await session.commitTransaction();

            logger.info('Refund processed', {
                refundId: refund._id,
                refundNumber: refund.refundNumber,
                paymentId,
                amount: refundAmount,
                status: refund.status
            });

            return {
                success: true,
                refund: await Refund.findOne({ _id: refund._id, firmId })
                    .populate('customerId', 'firstName lastName email')
                    .populate('paymentId', 'paymentNumber amount')
            };
        } catch (error) {
            await session.abortTransaction();
            logger.error('Error processing refund', {
                paymentId,
                error: error.message
            });
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Get refund history for a user
     * @param {ObjectId|string} userId - User ID (customer)
     * @param {Object} options - Query options
     * @returns {Promise<Array>} - List of refunds
     */
    async getRefundHistory(userId, options = {}) {
        try {
            const {
                limit = 50,
                skip = 0,
                status = null,
                startDate = null,
                endDate = null,
                firmId = null
            } = options;

            const query = { customerId: userId };

            if (status) {
                query.status = status;
            }

            if (firmId) {
                query.firmId = firmId;
            }

            if (startDate || endDate) {
                query.refundDate = {};
                if (startDate) query.refundDate.$gte = new Date(startDate);
                if (endDate) query.refundDate.$lte = new Date(endDate);
            }

            const refunds = await Refund.find(query)
                .populate('paymentId', 'paymentNumber amount paymentDate')
                .populate('approvedBy', 'firstName lastName')
                .populate('requestedBy', 'firstName lastName')
                .sort({ refundDate: -1 })
                .limit(limit)
                .skip(skip);

            const total = await Refund.countDocuments(query);

            return {
                refunds,
                total,
                limit,
                skip,
                hasMore: total > skip + limit
            };
        } catch (error) {
            logger.error('Error getting refund history', {
                userId,
                error: error.message
            });
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // APPROVAL & PROCESSING METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Approve a refund request
     * @param {ObjectId|string} refundId - Refund ID
     * @param {ObjectId|string} firmId - Firm ID
     * @param {ObjectId|string} approverId - User approving
     * @param {number} approvedAmount - Approved amount (optional)
     * @param {string} notes - Approval notes
     * @returns {Promise<Object>} - Updated refund
     */
    async approveRefund(refundId, firmId, approverId, approvedAmount = null, notes = '') {
        try {
            const refund = await Refund.findOne({ _id: refundId, firmId });
            if (!refund) {
                throw new Error('Refund not found');
            }

            await refund.approve(approverId, approvedAmount, notes);

            logger.info('Refund approved', {
                refundId,
                refundNumber: refund.refundNumber,
                approvedBy: approverId,
                amount: refund.approvedAmount
            });

            return refund;
        } catch (error) {
            logger.error('Error approving refund', {
                refundId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Reject a refund request
     * @param {ObjectId|string} refundId - Refund ID
     * @param {ObjectId|string} firmId - Firm ID
     * @param {ObjectId|string} rejectorId - User rejecting
     * @param {string} reason - Rejection reason
     * @returns {Promise<Object>} - Updated refund
     */
    async rejectRefund(refundId, firmId, rejectorId, reason) {
        try {
            const refund = await Refund.findOne({ _id: refundId, firmId });
            if (!refund) {
                throw new Error('Refund not found');
            }

            await refund.reject(rejectorId, reason);

            logger.info('Refund rejected', {
                refundId,
                refundNumber: refund.refundNumber,
                rejectedBy: rejectorId,
                reason
            });

            return refund;
        } catch (error) {
            logger.error('Error rejecting refund', {
                refundId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Execute an approved refund
     * @param {ObjectId|string} refundId - Refund ID
     * @param {ObjectId|string} firmId - Firm ID
     * @param {ObjectId|string} processedBy - User processing
     * @returns {Promise<Object>} - Processed refund
     */
    async executeRefund(refundId, firmId, processedBy) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const refund = await Refund.findOne({ _id: refundId, firmId })
                .populate('paymentId')
                .session(session);

            if (!refund) {
                throw new Error('Refund not found');
            }

            if (refund.status !== 'approved') {
                throw new Error('Only approved refunds can be executed');
            }

            const payment = refund.paymentId;
            if (!payment) {
                throw new Error('Associated payment not found');
            }

            // Start processing
            await refund.startProcessing(processedBy);

            // Execute the refund
            await this._executeRefund(refund, payment, session);

            await session.commitTransaction();

            logger.info('Refund executed successfully', {
                refundId,
                refundNumber: refund.refundNumber,
                amount: refund.processedAmount
            });

            return await Refund.findOne({ _id: refundId, firmId })
                .populate('paymentId')
                .populate('customerId', 'firstName lastName email');
        } catch (error) {
            await session.abortTransaction();
            logger.error('Error executing refund', {
                refundId,
                error: error.message
            });

            // Mark refund as failed
            const refund = await Refund.findOne({ _id: refundId, firmId });
            if (refund) {
                await refund.fail(error.message);
            }

            throw error;
        } finally {
            session.endSession();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // STATISTICS & REPORTING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get refund statistics
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} - Statistics
     */
    async getRefundStatistics(filters = {}) {
        try {
            const stats = await Refund.getRefundStats(filters);
            const policyStats = await Refund.getRefundsByPolicy(filters);

            return {
                overview: stats,
                byPolicy: policyStats,
                averageRefundPercent: policyStats.length > 0
                    ? policyStats.reduce((sum, p) => sum + p.avgRefundPercent, 0) / policyStats.length
                    : 0
            };
        } catch (error) {
            logger.error('Error getting refund statistics', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get pending refund requests
     * @param {ObjectId|string} firmId - Firm ID (optional)
     * @param {Object} options - Query options
     * @returns {Promise<Array>} - Pending refunds
     */
    async getPendingRefunds(firmId = null, options = {}) {
        try {
            const { limit = 50, skip = 0 } = options;
            const query = { status: 'pending' };

            if (firmId) {
                query.firmId = firmId;
            }

            const refunds = await Refund.find(query)
                .populate('paymentId', 'paymentNumber amount paymentDate')
                .populate('customerId', 'firstName lastName email')
                .populate('requestedBy', 'firstName lastName')
                .sort({ createdAt: 1 })  // Oldest first
                .limit(limit)
                .skip(skip);

            const total = await Refund.countDocuments(query);

            return {
                refunds,
                total,
                limit,
                skip,
                hasMore: total > skip + limit
            };
        } catch (error) {
            logger.error('Error getting pending refunds', {
                error: error.message
            });
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // INTERNAL HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get service tracking details for a payment
     * @private
     */
    async _getServiceTracking(payment) {
        let serviceStarted = false;
        let serviceStartDate = null;
        let serviceCompletionPercent = 0;

        // Check if service has started based on case status
        if (payment.caseId) {
            const caseData = await Case.findOne({ _id: payment.caseId, firmId: payment.firmId });
            if (caseData) {
                // Service is considered started if case has any progress
                serviceStarted = caseData.status !== 'new' && caseData.status !== 'pending';
                serviceStartDate = caseData.createdAt;

                // Calculate completion percentage based on status
                const statusCompletionMap = {
                    'new': 0,
                    'pending': 0,
                    'active': 25,
                    'in_progress': 40,
                    'hearing_scheduled': 50,
                    'verdict_pending': 75,
                    'completed': 100,
                    'closed': 100,
                    'won': 100,
                    'lost': 100
                };

                serviceCompletionPercent = statusCompletionMap[caseData.status] || 0;

                // If progress is explicitly set, use that
                if (caseData.progress !== undefined && caseData.progress !== null) {
                    serviceCompletionPercent = caseData.progress;
                }
            }
        }

        // Check invoice status as fallback
        if (!serviceStarted && payment.invoiceId) {
            const invoice = await Invoice.findOne({ _id: payment.invoiceId, firmId: payment.firmId });
            if (invoice) {
                // Service started if invoice has any time entries or expenses
                if (invoice.lineItems && invoice.lineItems.length > 0) {
                    const hasTimeOrExpense = invoice.lineItems.some(
                        item => item.type === 'time' || item.type === 'expense'
                    );
                    serviceStarted = hasTimeOrExpense;
                }
            }
        }

        // Calculate time since purchase
        const purchaseDate = payment.paymentDate || payment.createdAt;
        const timeSincePurchase = Date.now() - new Date(purchaseDate).getTime();

        return {
            serviceStarted,
            serviceStartDate,
            serviceCompletionPercent,
            timeSincePurchase,
            purchaseDate
        };
    }

    /**
     * Evaluate refund policies against service tracking
     * @private
     */
    _evaluatePolicies(serviceTracking) {
        // Sort policies by priority
        const sortedPolicies = Object.entries(this.policies)
            .sort((a, b) => a[1].priority - b[1].priority);

        // Find first matching policy
        for (const [policyName, policy] of sortedPolicies) {
            if (this._matchesPolicy(serviceTracking, policy.conditions)) {
                return {
                    name: policyName,
                    ...policy
                };
            }
        }

        // Default to NO_REFUND if no policy matches
        return {
            name: 'NO_REFUND',
            ...this.policies.NO_REFUND
        };
    }

    /**
     * Check if service tracking matches policy conditions
     * @private
     */
    _matchesPolicy(serviceTracking, conditions) {
        // Check serviceStarted condition
        if (conditions.serviceStarted !== undefined) {
            if (serviceTracking.serviceStarted !== conditions.serviceStarted) {
                return false;
            }
        }

        // Check timeSincePurchase condition
        if (conditions.timeSincePurchase) {
            if (conditions.timeSincePurchase.max !== undefined) {
                if (serviceTracking.timeSincePurchase > conditions.timeSincePurchase.max) {
                    return false;
                }
            }
            if (conditions.timeSincePurchase.min !== undefined) {
                if (serviceTracking.timeSincePurchase < conditions.timeSincePurchase.min) {
                    return false;
                }
            }
        }

        // Check serviceCompletionPercent condition
        if (conditions.serviceCompletionPercent) {
            if (conditions.serviceCompletionPercent.max !== undefined) {
                if (serviceTracking.serviceCompletionPercent > conditions.serviceCompletionPercent.max) {
                    return false;
                }
            }
            if (conditions.serviceCompletionPercent.min !== undefined) {
                if (serviceTracking.serviceCompletionPercent < conditions.serviceCompletionPercent.min) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Execute refund through payment gateway or manual process
     * @private
     */
    async _executeRefund(refund, payment, session) {
        try {
            // Determine refund method
            const gatewayProvider = payment.gatewayProvider;

            if (!refund.processingDetails) {
                refund.processingDetails = {};
            }
            refund.processingDetails.gatewayProvider = gatewayProvider || 'manual';

            // Process based on gateway
            if (gatewayProvider === 'stripe' && stripeService.isConfigured() && payment.transactionId) {
                // Process Stripe refund
                const stripeRefund = await stripeService.createRefund({
                    paymentIntentId: payment.transactionId,
                    amount: refund.approvedAmount,
                    reason: this._mapReasonToStripe(refund.reason),
                    metadata: {
                        refundId: refund._id.toString(),
                        refundNumber: refund.refundNumber,
                        paymentId: payment._id.toString()
                    }
                });

                refund.processingDetails.gatewayRefundId = stripeRefund.id;
                refund.processingDetails.gatewayResponse = stripeRefund;
            }

            // Update payment status
            payment.status = 'refunded';
            payment.refundDate = new Date();
            payment.refundReason = refund.reason;
            payment.isRefund = true;

            if (!payment.refundDetails) {
                payment.refundDetails = {};
            }
            payment.refundDetails.originalPaymentId = payment._id;
            payment.refundDetails.reason = refund.reason;
            payment.refundDetails.method = refund.refundMethod;

            await payment.save({ session });

            // Mark refund as completed
            await refund.complete(
                refund.processingDetails.gatewayRefundId,
                refund.processingDetails.gatewayResponse
            );

            return refund;
        } catch (error) {
            logger.error('Error executing refund transaction', {
                refundId: refund._id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Map internal refund reason to Stripe refund reason
     * @private
     */
    _mapReasonToStripe(reason) {
        const reasonMap = {
            'duplicate': 'duplicate',
            'overpayment': 'requested_by_customer',
            'service_cancelled': 'requested_by_customer',
            'service_not_started': 'requested_by_customer',
            'client_request': 'requested_by_customer',
            'poor_service': 'requested_by_customer',
            'error': 'fraudulent',
            'policy_based': 'requested_by_customer',
            'other': 'requested_by_customer'
        };

        return reasonMap[reason] || 'requested_by_customer';
    }
}

// Export singleton instance
const refundPolicyService = new RefundPolicyService();
module.exports = refundPolicyService;

// Also export class for testing
module.exports.RefundPolicyService = RefundPolicyService;
module.exports.REFUND_POLICIES = REFUND_POLICIES;
