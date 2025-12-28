/**
 * Commission Service - Enterprise Commission Management
 * Security: All methods require firmId parameter for multi-tenant isolation
 *
 * Handles comprehensive commission operations:
 * - Commission calculation
 * - Settlement processing
 * - Approval workflows
 * - Clawback handling
 * - Payment processing
 * - Analytics and reporting
 *
 * Inspired by: SAP Incentive Management, Oracle ICM, Xactly
 */

const CommissionPlan = require('../models/commissionPlan.model');
const CommissionSettlement = require('../models/commissionSettlement.model');
const SalesOrder = require('../models/salesOrder.model');
const Invoice = require('../models/invoice.model');
const Payment = require('../models/payment.model');
const SalesSettings = require('../models/salesSettings.model');
const User = require('../models/user.model');
const { CustomException } = require('../utils');
const { sanitizeObjectId } = require('../utils/securityUtils');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

class CommissionService {
    // ═══════════════════════════════════════════════════════════════
    // 1. COMMISSION PLANS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get commission plan by ID
     * @param {string} planId - Plan ID
     * @param {object} firmQuery - Firm query filter
     */
    async getPlanById(planId, firmQuery) {
        const sanitizedId = sanitizeObjectId(planId);

        const plan = await CommissionPlan.findOne({
            _id: sanitizedId,
            ...firmQuery
        });

        if (!plan) {
            throw CustomException('Commission plan not found', 404);
        }

        return plan;
    }

    /**
     * Get all commission plans
     * @param {object} firmQuery - Firm query filter
     * @param {object} filters - Filter options
     */
    async getPlans(firmQuery, filters = {}) {
        const query = { ...firmQuery };

        if (filters.status) {
            query.status = filters.status;
        }

        if (filters.type) {
            query.type = filters.type;
        }

        return CommissionPlan.find(query)
            .sort({ name: 1 })
            .lean();
    }

    /**
     * Create commission plan
     * @param {object} planData - Plan data
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async createPlan(planData, firmQuery, userId) {
        const plan = new CommissionPlan({
            ...planData,
            firmId: firmQuery.firmId,
            createdBy: new mongoose.Types.ObjectId(userId)
        });

        await plan.save();

        logger.info(`Commission plan ${plan.name} created`);
        return plan;
    }

    /**
     * Update commission plan
     * @param {string} planId - Plan ID
     * @param {object} updates - Updates
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async updatePlan(planId, updates, firmQuery, userId) {
        const sanitizedId = sanitizeObjectId(planId);

        const plan = await CommissionPlan.findOneAndUpdate(
            { _id: sanitizedId, ...firmQuery },
            {
                $set: {
                    ...updates,
                    updatedBy: new mongoose.Types.ObjectId(userId)
                }
            },
            { new: true }
        );

        if (!plan) {
            throw CustomException('Commission plan not found', 404);
        }

        logger.info(`Commission plan ${plan.name} updated`);
        return plan;
    }

    /**
     * Assign plan to salesperson
     * @param {string} planId - Plan ID
     * @param {string} salespersonId - Salesperson ID
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async assignPlanToSalesperson(planId, salespersonId, firmQuery, userId) {
        const sanitizedPlanId = sanitizeObjectId(planId);
        const sanitizedSalespersonId = sanitizeObjectId(salespersonId);

        const plan = await CommissionPlan.findOne({
            _id: sanitizedPlanId,
            ...firmQuery
        });

        if (!plan) {
            throw CustomException('Commission plan not found', 404);
        }

        // Check if already assigned
        const alreadyAssigned = plan.applicableTo.salespersons?.some(
            sp => sp.toString() === sanitizedSalespersonId
        );

        if (!alreadyAssigned) {
            plan.applicableTo.salespersons = [
                ...(plan.applicableTo.salespersons || []),
                new mongoose.Types.ObjectId(sanitizedSalespersonId)
            ];
            await plan.save();
        }

        logger.info(`Plan ${plan.name} assigned to salesperson ${salespersonId}`);
        return plan;
    }

    // ═══════════════════════════════════════════════════════════════
    // 2. COMMISSION CALCULATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Calculate commission for a transaction
     * @param {string} transactionType - Type: sales_order, invoice, payment
     * @param {string} transactionId - Transaction ID
     * @param {object} firmQuery - Firm query filter
     */
    async calculateForTransaction(transactionType, transactionId, firmQuery) {
        const sanitizedId = sanitizeObjectId(transactionId);

        // Get transaction
        let transaction;
        let commissionableAmount;
        let salespersonId;
        let productCategory;

        switch (transactionType) {
            case 'sales_order':
                transaction = await SalesOrder.findOne({
                    _id: sanitizedId,
                    ...firmQuery
                });
                if (!transaction) throw CustomException('Sales order not found', 404);
                commissionableAmount = transaction.totals.grandTotal;
                salespersonId = transaction.salespersonId;
                break;

            case 'invoice':
                transaction = await Invoice.findOne({
                    _id: sanitizedId,
                    ...firmQuery
                });
                if (!transaction) throw CustomException('Invoice not found', 404);
                commissionableAmount = transaction.totalAmount;
                salespersonId = transaction.lawyerId;
                break;

            case 'payment':
                transaction = await Payment.findOne({
                    _id: sanitizedId,
                    ...firmQuery
                });
                if (!transaction) throw CustomException('Payment not found', 404);
                commissionableAmount = transaction.amount;
                salespersonId = transaction.receivedBy;
                break;

            default:
                throw CustomException('Invalid transaction type', 400);
        }

        // Get applicable commission plan for salesperson
        const plan = await CommissionPlan.findOne({
            ...firmQuery,
            status: 'active',
            $or: [
                { 'applicableTo.allSalespersons': true },
                { 'applicableTo.salespersons': salespersonId }
            ]
        });

        if (!plan) {
            return {
                transactionId: sanitizedId,
                transactionType,
                commissionableAmount,
                planId: null,
                commission: 0,
                message: 'No applicable commission plan found'
            };
        }

        // Calculate commission based on plan type
        const commission = await plan.calculateCommission(
            commissionableAmount,
            transaction,
            productCategory
        );

        return {
            transactionId: sanitizedId,
            transactionType,
            commissionableAmount,
            salespersonId,
            planId: plan._id,
            planName: plan.name,
            planType: plan.type,
            ...commission
        };
    }

    /**
     * Calculate commissions for period
     * @param {string} salespersonId - Salesperson ID
     * @param {Date} periodStart - Period start
     * @param {Date} periodEnd - Period end
     * @param {object} firmQuery - Firm query filter
     */
    async calculateForPeriod(salespersonId, periodStart, periodEnd, firmQuery) {
        const sanitizedSalespersonId = sanitizeObjectId(salespersonId);

        // Get commission settings
        const settings = await SalesSettings.findByFirm(firmQuery.firmId);
        const calculateOn = settings?.commission?.calculateOn || 'payment_received';

        let transactions = [];

        // Get transactions based on calculation basis
        switch (calculateOn) {
            case 'order_confirmed':
                transactions = await SalesOrder.find({
                    ...firmQuery,
                    salespersonId: sanitizedSalespersonId,
                    status: { $in: ['confirmed', 'processing', 'shipped', 'completed'] },
                    confirmedAt: { $gte: periodStart, $lte: periodEnd }
                });
                break;

            case 'order_invoiced':
                transactions = await Invoice.find({
                    ...firmQuery,
                    lawyerId: sanitizedSalespersonId,
                    status: { $in: ['sent', 'paid', 'partially_paid'] },
                    createdAt: { $gte: periodStart, $lte: periodEnd }
                });
                break;

            case 'payment_received':
                transactions = await Payment.find({
                    ...firmQuery,
                    receivedBy: sanitizedSalespersonId,
                    status: 'completed',
                    paymentDate: { $gte: periodStart, $lte: periodEnd }
                });
                break;
        }

        // Calculate commission for each transaction
        const commissionLines = [];
        let totalCommission = 0;

        for (const tx of transactions) {
            const sourceType = tx.constructor.modelName.toLowerCase();
            const result = await this.calculateForTransaction(
                sourceType === 'salesorder' ? 'sales_order' : sourceType,
                tx._id.toString(),
                firmQuery
            );

            if (result.commission > 0) {
                commissionLines.push({
                    sourceType: result.transactionType,
                    sourceId: result.transactionId,
                    sourceDate: tx.createdAt || tx.confirmedAt || tx.paymentDate,
                    baseAmount: result.commissionableAmount,
                    commissionableAmount: result.commissionableAmount,
                    rate: result.rate || 0,
                    calculatedAmount: result.commission,
                    finalAmount: result.commission,
                    planId: result.planId,
                    planName: result.planName,
                    status: 'pending'
                });

                totalCommission += result.commission;
            }
        }

        return {
            salespersonId: sanitizedSalespersonId,
            periodStart,
            periodEnd,
            transactionCount: transactions.length,
            lines: commissionLines,
            totalCommission
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. SETTLEMENT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create settlement for period
     * @param {string} salespersonId - Salesperson ID
     * @param {Date} periodStart - Period start
     * @param {Date} periodEnd - Period end
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async createSettlement(salespersonId, periodStart, periodEnd, firmQuery, userId) {
        const sanitizedSalespersonId = sanitizeObjectId(salespersonId);

        // Check for existing settlement
        const existing = await CommissionSettlement.findOne({
            ...firmQuery,
            salespersonId: sanitizedSalespersonId,
            periodStart: { $lte: periodEnd },
            periodEnd: { $gte: periodStart },
            status: { $nin: ['cancelled'] }
        });

        if (existing) {
            throw CustomException('Settlement already exists for this period', 400);
        }

        // Get salesperson details
        const salesperson = await User.findById(sanitizedSalespersonId);
        if (!salesperson) {
            throw CustomException('Salesperson not found', 404);
        }

        // Calculate commissions for period
        const calculations = await this.calculateForPeriod(
            salespersonId,
            periodStart,
            periodEnd,
            firmQuery
        );

        // Get settings for holdback
        const settings = await SalesSettings.findByFirm(firmQuery.firmId);
        const holdbackPercentage = settings?.commission?.holdbackPercentage || 0;

        // Create settlement
        const settlement = new CommissionSettlement({
            firmId: firmQuery.firmId,
            salespersonId: sanitizedSalespersonId,
            salespersonName: `${salesperson.firstName} ${salesperson.lastName}`,
            salespersonEmail: salesperson.email,

            periodType: 'monthly',
            periodStart,
            periodEnd,
            periodLabel: this.getPeriodLabel(periodStart),

            lines: calculations.lines.map(line => ({
                ...line,
                sourceModel: this.getSourceModel(line.sourceType)
            })),

            summary: {
                totalTransactions: calculations.lines.length,
                totalBaseAmount: calculations.lines.reduce((sum, l) => sum + l.baseAmount, 0),
                totalCommissionableAmount: calculations.lines.reduce((sum, l) => sum + l.commissionableAmount, 0),
                grossCommission: calculations.totalCommission,
                holdbackPercentage,
                holdbackAmount: calculations.totalCommission * (holdbackPercentage / 100),
                netCommission: calculations.totalCommission,
                payableAmount: calculations.totalCommission * (1 - holdbackPercentage / 100)
            },

            status: 'calculated',
            calculatedAt: new Date(),
            calculatedBy: new mongoose.Types.ObjectId(userId),
            createdBy: new mongoose.Types.ObjectId(userId)
        });

        await settlement.save();

        logger.info(`Commission settlement ${settlement.settlementNumber} created for ${salesperson.email}`);
        return settlement;
    }

    /**
     * Submit settlement for approval
     * @param {string} settlementId - Settlement ID
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async submitForApproval(settlementId, firmQuery, userId) {
        const sanitizedId = sanitizeObjectId(settlementId);

        const settlement = await CommissionSettlement.findOne({
            _id: sanitizedId,
            ...firmQuery
        });

        if (!settlement) {
            throw CustomException('Settlement not found', 404);
        }

        settlement.submitForApproval(userId);
        await settlement.save();

        logger.info(`Settlement ${settlement.settlementNumber} submitted for approval`);
        return settlement;
    }

    /**
     * Approve settlement
     * @param {string} settlementId - Settlement ID
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     * @param {string} notes - Approval notes
     */
    async approveSettlement(settlementId, firmQuery, userId, notes = '') {
        const sanitizedId = sanitizeObjectId(settlementId);

        const settlement = await CommissionSettlement.findOne({
            _id: sanitizedId,
            ...firmQuery
        });

        if (!settlement) {
            throw CustomException('Settlement not found', 404);
        }

        settlement.approve(userId, notes);
        await settlement.save();

        logger.info(`Settlement ${settlement.settlementNumber} approved`);
        return settlement;
    }

    /**
     * Reject settlement
     * @param {string} settlementId - Settlement ID
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     * @param {string} reason - Rejection reason
     */
    async rejectSettlement(settlementId, firmQuery, userId, reason) {
        const sanitizedId = sanitizeObjectId(settlementId);

        const settlement = await CommissionSettlement.findOne({
            _id: sanitizedId,
            ...firmQuery
        });

        if (!settlement) {
            throw CustomException('Settlement not found', 404);
        }

        settlement.reject(userId, reason);
        await settlement.save();

        logger.info(`Settlement ${settlement.settlementNumber} rejected`);
        return settlement;
    }

    /**
     * Schedule payment for settlement
     * @param {string} settlementId - Settlement ID
     * @param {Date} paymentDate - Scheduled payment date
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async schedulePayment(settlementId, paymentDate, firmQuery, userId) {
        const sanitizedId = sanitizeObjectId(settlementId);

        const settlement = await CommissionSettlement.findOne({
            _id: sanitizedId,
            ...firmQuery
        });

        if (!settlement) {
            throw CustomException('Settlement not found', 404);
        }

        settlement.schedulePayment(paymentDate);
        await settlement.save();

        logger.info(`Payment scheduled for settlement ${settlement.settlementNumber}`);
        return settlement;
    }

    /**
     * Record payment for settlement
     * @param {string} settlementId - Settlement ID
     * @param {object} paymentDetails - Payment details
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async recordPayment(settlementId, paymentDetails, firmQuery, userId) {
        const sanitizedId = sanitizeObjectId(settlementId);

        const settlement = await CommissionSettlement.findOne({
            _id: sanitizedId,
            ...firmQuery
        });

        if (!settlement) {
            throw CustomException('Settlement not found', 404);
        }

        settlement.recordPayment(userId, paymentDetails);
        await settlement.save();

        logger.info(`Payment recorded for settlement ${settlement.settlementNumber}`);
        return settlement;
    }

    // ═══════════════════════════════════════════════════════════════
    // 4. CLAWBACK PROCESSING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Process clawback
     * @param {string} settlementId - Original settlement ID
     * @param {object} clawbackData - Clawback data
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async processClawback(settlementId, clawbackData, firmQuery, userId) {
        const sanitizedId = sanitizeObjectId(settlementId);

        // Find the settlement with the original commission
        const settlement = await CommissionSettlement.findOne({
            _id: sanitizedId,
            ...firmQuery
        });

        if (!settlement) {
            throw CustomException('Settlement not found', 404);
        }

        // Find the line to clawback
        const line = settlement.lines.id(clawbackData.lineId);
        if (!line) {
            throw CustomException('Commission line not found', 404);
        }

        // Get clawback percentage based on settings
        const settings = await SalesSettings.findByFirm(firmQuery.firmId);
        const clawbackPercentage = clawbackData.percentage ||
            (settings?.commission?.clawbackPercentage || 100);

        const clawbackAmount = line.calculatedAmount * (clawbackPercentage / 100);

        // Add clawback entry
        settlement.addClawback({
            originalLineId: line._id,
            sourceType: line.sourceType,
            sourceId: line.sourceId,
            sourceReference: line.sourceReference,
            reason: clawbackData.reason,
            description: clawbackData.description,
            originalAmount: line.calculatedAmount,
            clawbackAmount,
            clawbackPercentage,
            eventDate: clawbackData.eventDate || new Date(),
            processedAt: new Date(),
            processedBy: new mongoose.Types.ObjectId(userId),
            status: 'applied'
        });

        // Update line status
        line.status = 'clawback';
        line.clawbackAmount = clawbackAmount;

        // Recalculate summary
        settlement.calculateSummary();

        await settlement.save();

        logger.info(`Clawback of ${clawbackAmount} processed for settlement ${settlement.settlementNumber}`);
        return settlement;
    }

    /**
     * Get clawback eligible transactions
     * @param {object} firmQuery - Firm query filter
     * @param {Date} beforeDate - Clawback deadline
     */
    async getClawbackEligible(firmQuery, beforeDate = null) {
        const settings = await SalesSettings.findByFirm(firmQuery.firmId);
        const clawbackWindowDays = settings?.commission?.clawbackWindowDays || 90;

        const cutoffDate = beforeDate || new Date();
        const windowStart = new Date(cutoffDate);
        windowStart.setDate(windowStart.getDate() - clawbackWindowDays);

        return CommissionSettlement.find({
            ...firmQuery,
            status: 'paid',
            'lines.status': 'paid',
            'lines.clawbackEligible': true,
            'lines.clawbackDeadline': { $gte: cutoffDate }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // 5. REPORTING & ANALYTICS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get commission summary by salesperson
     * @param {object} firmQuery - Firm query filter
     * @param {object} dateRange - Date range
     */
    async getSummaryBySalesperson(firmQuery, dateRange = {}) {
        const matchQuery = { ...firmQuery };

        if (dateRange.start) {
            matchQuery.periodStart = { $gte: new Date(dateRange.start) };
        }
        if (dateRange.end) {
            matchQuery.periodEnd = { $lte: new Date(dateRange.end) };
        }

        return CommissionSettlement.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$salespersonId',
                    salespersonName: { $first: '$salespersonName' },
                    settlementCount: { $sum: 1 },
                    totalGrossCommission: { $sum: '$summary.grossCommission' },
                    totalNetCommission: { $sum: '$summary.netCommission' },
                    totalPaid: { $sum: '$summary.previouslyPaid' },
                    totalClawbacks: { $sum: '$summary.clawbacksApplied' }
                }
            },
            { $sort: { totalGrossCommission: -1 } }
        ]);
    }

    /**
     * Get monthly commission trend
     * @param {object} firmQuery - Firm query filter
     * @param {number} year - Year
     */
    async getMonthlyTrend(firmQuery, year) {
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31, 23, 59, 59);

        return CommissionSettlement.aggregate([
            {
                $match: {
                    ...firmQuery,
                    periodStart: { $gte: yearStart },
                    periodEnd: { $lte: yearEnd }
                }
            },
            {
                $group: {
                    _id: { $month: '$periodStart' },
                    month: { $first: { $month: '$periodStart' } },
                    settlementCount: { $sum: 1 },
                    grossCommission: { $sum: '$summary.grossCommission' },
                    netCommission: { $sum: '$summary.netCommission' },
                    paid: { $sum: '$summary.previouslyPaid' }
                }
            },
            { $sort: { month: 1 } }
        ]);
    }

    /**
     * Get pending settlements
     * @param {object} firmQuery - Firm query filter
     */
    async getPendingSettlements(firmQuery) {
        return CommissionSettlement.find({
            ...firmQuery,
            status: { $in: ['calculated', 'pending_approval'] }
        })
            .populate('salespersonId', 'firstName lastName email')
            .sort({ periodEnd: -1 });
    }

    /**
     * Get pending payments
     * @param {object} firmQuery - Firm query filter
     */
    async getPendingPayments(firmQuery) {
        return CommissionSettlement.findPendingPayment(firmQuery.firmId);
    }

    /**
     * Generate commission statement
     * @param {string} settlementId - Settlement ID
     * @param {object} firmQuery - Firm query filter
     */
    async generateStatement(settlementId, firmQuery) {
        const sanitizedId = sanitizeObjectId(settlementId);

        const settlement = await CommissionSettlement.findOne({
            _id: sanitizedId,
            ...firmQuery
        }).populate('salespersonId', 'firstName lastName email');

        if (!settlement) {
            throw CustomException('Settlement not found', 404);
        }

        return settlement.generateStatement();
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    getPeriodLabel(date) {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }

    getSourceModel(sourceType) {
        const models = {
            'sales_order': 'SalesOrder',
            'invoice': 'Invoice',
            'payment': 'Payment',
            'subscription': 'Subscription'
        };
        return models[sourceType] || 'SalesOrder';
    }
}

module.exports = new CommissionService();
