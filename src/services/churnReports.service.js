/**
 * Churn Reports Service
 *
 * Generates comprehensive churn and retention reports for management,
 * stakeholders, and automated distribution. Supports multiple export formats
 * and scheduled report delivery.
 *
 * Features:
 * - Weekly automated churn summaries
 * - Monthly retention reports
 * - Customer health deep dives
 * - At-risk customer lists
 * - Scheduled report management
 * - Multi-format export (CSV, PDF, JSON)
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const ChurnAnalyticsService = require('./churnAnalytics.service');

// Models
const Subscription = require('../models/subscription.model');
const Firm = require('../models/firm.model');
const Invoice = require('../models/invoice.model');
const Payment = require('../models/payment.model');

class ChurnReportsService {
    /**
     * Generate weekly churn summary report
     * @param {String} firmId - Optional firm ID filter
     * @returns {Promise<Object>} Weekly report data
     */
    static async generateWeeklyChurnReport(firmId = null) {
        try {
            const now = new Date();
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            logger.info('Generating weekly churn report', { firmId, weekStart: weekAgo, weekEnd: now });

            const matchStage = firmId ? { firmId: new mongoose.Types.ObjectId(firmId) } : {};

            // Get week's churn statistics
            const weeklyStats = await Subscription.aggregate([
                {
                    $facet: {
                        churned: [
                            {
                                $match: {
                                    ...matchStage,
                                    status: 'canceled',
                                    canceledAt: { $gte: weekAgo, $lte: now }
                                }
                            },
                            { $limit: 10000 },
                            {
                                $group: {
                                    _id: null,
                                    count: { $sum: 1 },
                                    mrrLost: {
                                        $sum: {
                                            $cond: [
                                                { $eq: ['$billingCycle', 'monthly'] },
                                                1,
                                                { $divide: [1, 12] }
                                            ]
                                        }
                                    },
                                    reasons: {
                                        $push: {
                                            reason: '$cancellationReason',
                                            planId: '$planId',
                                            canceledAt: '$canceledAt'
                                        }
                                    }
                                }
                            }
                        ],
                        newSubscriptions: [
                            {
                                $match: {
                                    ...matchStage,
                                    createdAt: { $gte: weekAgo, $lte: now }
                                }
                            },
                            { $count: 'count' }
                        ],
                        atRisk: [
                            {
                                $match: {
                                    ...matchStage,
                                    $or: [
                                        { cancelAtPeriodEnd: true },
                                        { status: 'past_due' }
                                    ]
                                }
                            },
                            { $count: 'count' }
                        ],
                        reactivations: [
                            {
                                $match: {
                                    ...matchStage,
                                    status: 'active',
                                    updatedAt: { $gte: weekAgo, $lte: now },
                                    // Reactivated from canceled
                                    canceledAt: { $exists: true }
                                }
                            },
                            { $count: 'count' }
                        ]
                    }
                }
            ]);

            const stats = weeklyStats[0];
            const churnedData = stats.churned[0] || { count: 0, mrrLost: 0, reasons: [] };
            const newSubs = stats.newSubscriptions[0]?.count || 0;
            const atRiskCount = stats.atRisk[0]?.count || 0;
            const reactivations = stats.reactivations[0]?.count || 0;

            // Group churn reasons
            const reasonCounts = {};
            churnedData.reasons.forEach(r => {
                const reason = r.reason || 'Not specified';
                reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
            });

            // Get top churned plans
            const planCounts = {};
            churnedData.reasons.forEach(r => {
                const plan = r.planId || 'Unknown';
                planCounts[plan] = (planCounts[plan] || 0) + 1;
            });

            // Calculate net change
            const netChange = newSubs - churnedData.count + reactivations;

            return {
                reportType: 'weekly_churn_summary',
                generatedAt: now,
                period: {
                    start: weekAgo,
                    end: now,
                    days: 7
                },
                summary: {
                    totalChurned: churnedData.count,
                    mrrLost: parseFloat(churnedData.mrrLost.toFixed(2)),
                    newSubscriptions: newSubs,
                    reactivations,
                    netChange,
                    currentAtRisk: atRiskCount
                },
                churnReasons: Object.entries(reasonCounts)
                    .map(([reason, count]) => ({ reason, count }))
                    .sort((a, b) => b.count - a.count),
                topChurnedPlans: Object.entries(planCounts)
                    .map(([plan, count]) => ({ plan, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5),
                insights: this._generateWeeklyInsights(churnedData.count, newSubs, atRiskCount, reactivations)
            };
        } catch (error) {
            logger.error('Error generating weekly churn report', { error: error.message, firmId });
            throw error;
        }
    }

    /**
     * Generate monthly retention report
     * @param {String} month - Month in YYYY-MM format (default: current month)
     * @param {String} firmId - Optional firm ID filter
     * @returns {Promise<Object>} Monthly retention report
     */
    static async generateMonthlyRetentionReport(month = null, firmId = null) {
        try {
            const now = new Date();
            const reportMonth = month ? new Date(month + '-01') : new Date(now.getFullYear(), now.getMonth(), 1);
            const monthEnd = new Date(reportMonth.getFullYear(), reportMonth.getMonth() + 1, 0);

            logger.info('Generating monthly retention report', { month: reportMonth.toISOString().slice(0, 7), firmId });

            const matchStage = firmId ? { firmId: new mongoose.Types.ObjectId(firmId) } : {};

            // Get comprehensive monthly metrics
            const monthlyMetrics = await Subscription.aggregate([
                {
                    $facet: {
                        startOfMonth: [
                            {
                                $match: {
                                    ...matchStage,
                                    createdAt: { $lt: reportMonth },
                                    $or: [
                                        { status: { $ne: 'canceled' } },
                                        { canceledAt: { $gte: reportMonth } }
                                    ]
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    count: { $sum: 1 },
                                    mrr: {
                                        $sum: {
                                            $cond: [
                                                { $eq: ['$billingCycle', 'monthly'] },
                                                1,
                                                { $divide: [1, 12] }
                                            ]
                                        }
                                    }
                                }
                            }
                        ],
                        endOfMonth: [
                            {
                                $match: {
                                    ...matchStage,
                                    createdAt: { $lte: monthEnd },
                                    $or: [
                                        { status: { $ne: 'canceled' } },
                                        { canceledAt: { $gt: monthEnd } }
                                    ]
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    count: { $sum: 1 },
                                    mrr: {
                                        $sum: {
                                            $cond: [
                                                { $eq: ['$billingCycle', 'monthly'] },
                                                1,
                                                { $divide: [1, 12] }
                                            ]
                                        }
                                    }
                                }
                            }
                        ],
                        churned: [
                            {
                                $match: {
                                    ...matchStage,
                                    status: 'canceled',
                                    canceledAt: { $gte: reportMonth, $lte: monthEnd }
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    count: { $sum: 1 },
                                    mrr: {
                                        $sum: {
                                            $cond: [
                                                { $eq: ['$billingCycle', 'monthly'] },
                                                1,
                                                { $divide: [1, 12] }
                                            ]
                                        }
                                    }
                                }
                            }
                        ],
                        newSubscriptions: [
                            {
                                $match: {
                                    ...matchStage,
                                    createdAt: { $gte: reportMonth, $lte: monthEnd }
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    count: { $sum: 1 },
                                    mrr: {
                                        $sum: {
                                            $cond: [
                                                { $eq: ['$billingCycle', 'monthly'] },
                                                1,
                                                { $divide: [1, 12] }
                                            ]
                                        }
                                    }
                                }
                            }
                        ],
                        byPlan: [
                            {
                                $match: {
                                    ...matchStage,
                                    createdAt: { $lte: monthEnd },
                                    $or: [
                                        { status: { $ne: 'canceled' } },
                                        { canceledAt: { $gt: monthEnd } }
                                    ]
                                }
                            },
                            {
                                $group: {
                                    _id: '$planId',
                                    count: { $sum: 1 },
                                    mrr: {
                                        $sum: {
                                            $cond: [
                                                { $eq: ['$billingCycle', 'monthly'] },
                                                1,
                                                { $divide: [1, 12] }
                                            ]
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            ]);

            const metrics = monthlyMetrics[0];
            const startData = metrics.startOfMonth[0] || { count: 0, mrr: 0 };
            const endData = metrics.endOfMonth[0] || { count: 0, mrr: 0 };
            const churnedData = metrics.churned[0] || { count: 0, mrr: 0 };
            const newData = metrics.newSubscriptions[0] || { count: 0, mrr: 0 };

            // Calculate retention rates
            const customerRetentionRate = startData.count > 0
                ? ((startData.count - churnedData.count) / startData.count) * 100
                : 100;

            const revenueRetentionRate = startData.mrr > 0
                ? ((startData.mrr - churnedData.mrr) / startData.mrr) * 100
                : 100;

            const netRevenueRetention = startData.mrr > 0
                ? ((endData.mrr - newData.mrr) / startData.mrr) * 100
                : 100;

            // Get cohort data for this month
            const cohortAnalysis = await ChurnAnalyticsService.getCohortRetention(
                reportMonth.toISOString().slice(0, 7),
                3,
                firmId
            );

            return {
                reportType: 'monthly_retention',
                generatedAt: new Date(),
                period: {
                    month: reportMonth.toISOString().slice(0, 7),
                    start: reportMonth,
                    end: monthEnd
                },
                metrics: {
                    subscriptionsAtStart: startData.count,
                    subscriptionsAtEnd: endData.count,
                    newSubscriptions: newData.count,
                    churned: churnedData.count,
                    netChange: endData.count - startData.count,
                    mrrAtStart: parseFloat(startData.mrr.toFixed(2)),
                    mrrAtEnd: parseFloat(endData.mrr.toFixed(2)),
                    mrrChurned: parseFloat(churnedData.mrr.toFixed(2)),
                    mrrFromNew: parseFloat(newData.mrr.toFixed(2)),
                    netMrrChange: parseFloat((endData.mrr - startData.mrr).toFixed(2))
                },
                retentionRates: {
                    customerRetentionRate: parseFloat(customerRetentionRate.toFixed(2)),
                    revenueRetentionRate: parseFloat(revenueRetentionRate.toFixed(2)),
                    netRevenueRetention: parseFloat(netRevenueRetention.toFixed(2))
                },
                planDistribution: metrics.byPlan.map(p => ({
                    plan: p._id,
                    subscriptions: p.count,
                    mrr: parseFloat(p.mrr.toFixed(2))
                })),
                cohortAnalysis,
                insights: this._generateMonthlyInsights(
                    customerRetentionRate,
                    revenueRetentionRate,
                    netRevenueRetention,
                    churnedData.count,
                    newData.count
                )
            };
        } catch (error) {
            logger.error('Error generating monthly retention report', { error: error.message, month, firmId });
            throw error;
        }
    }

    /**
     * Generate detailed health report for a specific customer
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} Customer health deep dive
     */
    static async generateCustomerHealthReport(firmId) {
        try {
            logger.info('Generating customer health report', { firmId });

            // Get subscription details
            const subscription = await Subscription.findOne({ firmId })
                .populate('firmId')
                .populate('createdBy')
                .lean();

            if (!subscription) {
                throw new Error('Subscription not found for firm');
            }

            // Get invoice history
            const invoices = await Invoice.find({ firmId })
                .sort({ createdAt: -1 })
                .limit(12)
                .lean();

            // Get payment history
            const payments = await Payment.find({ firmId })
                .sort({ paymentDate: -1 })
                .limit(12)
                .lean();

            // Calculate health metrics
            const overdueInvoices = invoices.filter(inv => inv.status === 'overdue').length;
            const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
            const totalPaid = payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
            const paymentRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 100;

            // Calculate average payment time
            const invoicesWithPayments = invoices.filter(inv => inv.paidDate && inv.issueDate);
            const avgPaymentDays = invoicesWithPayments.length > 0
                ? invoicesWithPayments.reduce((sum, inv) => {
                    const days = Math.floor((inv.paidDate - inv.issueDate) / (1000 * 60 * 60 * 24));
                    return sum + days;
                }, 0) / invoicesWithPayments.length
                : 0;

            // Calculate tenure
            const tenureDays = Math.floor((new Date() - subscription.createdAt) / (1000 * 60 * 60 * 24));
            const tenureMonths = Math.floor(tenureDays / 30);

            // Determine health score
            let healthScore = 100;
            if (subscription.status === 'past_due') healthScore -= 50;
            if (subscription.cancelAtPeriodEnd) healthScore -= 40;
            if (overdueInvoices > 0) healthScore -= overdueInvoices * 10;
            if (paymentRate < 90) healthScore -= 20;
            if (avgPaymentDays > 45) healthScore -= 15;
            healthScore = Math.max(0, Math.min(100, healthScore));

            // Determine risk level
            let riskLevel = 'Low';
            let riskColor = 'green';
            if (healthScore < 30) {
                riskLevel = 'Critical';
                riskColor = 'red';
            } else if (healthScore < 50) {
                riskLevel = 'High';
                riskColor = 'orange';
            } else if (healthScore < 70) {
                riskLevel = 'Medium';
                riskColor = 'yellow';
            }

            // Identify risk factors
            const riskFactors = [];
            if (subscription.status === 'past_due') riskFactors.push('Payment overdue');
            if (subscription.cancelAtPeriodEnd) riskFactors.push('Scheduled for cancellation');
            if (overdueInvoices > 0) riskFactors.push(`${overdueInvoices} overdue invoice(s)`);
            if (paymentRate < 90) riskFactors.push('Low payment rate');
            if (avgPaymentDays > 45) riskFactors.push('Slow payment history');
            if (tenureMonths < 3) riskFactors.push('New customer (< 3 months)');

            // Generate recommendations
            const recommendations = this._generateHealthRecommendations(
                healthScore,
                subscription,
                overdueInvoices,
                paymentRate,
                avgPaymentDays
            );

            return {
                reportType: 'customer_health_report',
                generatedAt: new Date(),
                customer: {
                    firmId: subscription.firmId._id,
                    firmName: subscription.firmId.name,
                    email: subscription.firmId.email,
                    phone: subscription.firmId.phone
                },
                subscription: {
                    id: subscription._id,
                    planId: subscription.planId,
                    status: subscription.status,
                    billingCycle: subscription.billingCycle,
                    currentPeriodStart: subscription.currentPeriodStart,
                    currentPeriodEnd: subscription.currentPeriodEnd,
                    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                    trialEnd: subscription.trialEnd,
                    createdAt: subscription.createdAt,
                    tenureDays,
                    tenureMonths
                },
                healthMetrics: {
                    healthScore,
                    riskLevel,
                    riskColor,
                    riskFactors
                },
                financialMetrics: {
                    totalInvoices: invoices.length,
                    totalInvoiced,
                    totalPaid,
                    paymentRate: parseFloat(paymentRate.toFixed(2)),
                    overdueInvoices,
                    averagePaymentDays: parseFloat(avgPaymentDays.toFixed(1)),
                    lastPaymentDate: payments[0]?.paymentDate || null,
                    lastInvoiceDate: invoices[0]?.createdAt || null
                },
                recentActivity: {
                    recentInvoices: invoices.slice(0, 5).map(inv => ({
                        invoiceNumber: inv.invoiceNumber,
                        date: inv.issueDate,
                        amount: inv.totalAmount,
                        status: inv.status,
                        dueDate: inv.dueDate
                    })),
                    recentPayments: payments.slice(0, 5).map(pay => ({
                        paymentNumber: pay.paymentNumber,
                        date: pay.paymentDate,
                        amount: pay.amount,
                        method: pay.paymentMethod,
                        status: pay.status
                    }))
                },
                recommendations
            };
        } catch (error) {
            logger.error('Error generating customer health report', { error: error.message, firmId });
            throw error;
        }
    }

    /**
     * Generate at-risk customers report
     * @param {String} firmId - Optional firm ID filter
     * @returns {Promise<Object>} At-risk report
     */
    static async generateAtRiskReport(firmId = null) {
        try {
            logger.info('Generating at-risk report', { firmId });

            // Get at-risk list
            const atRiskList = await ChurnAnalyticsService.getChurnRiskList(firmId);

            // Group by risk level
            const byRiskLevel = {
                Critical: atRiskList.filter(s => s.riskLevel === 'Critical'),
                High: atRiskList.filter(s => s.riskLevel === 'High'),
                Medium: atRiskList.filter(s => s.riskLevel === 'Medium')
            };

            // Calculate potential MRR loss
            const potentialMRRLoss = await Subscription.aggregate([
                {
                    $match: {
                        _id: { $in: atRiskList.map(s => s.subscriptionId) }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalMRR: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$billingCycle', 'monthly'] },
                                    1,
                                    { $divide: [1, 12] }
                                ]
                            }
                        }
                    }
                }
            ]);

            return {
                reportType: 'at_risk_customers',
                generatedAt: new Date(),
                summary: {
                    totalAtRisk: atRiskList.length,
                    criticalCount: byRiskLevel.Critical.length,
                    highCount: byRiskLevel.High.length,
                    mediumCount: byRiskLevel.Medium.length,
                    potentialMRRLoss: potentialMRRLoss[0]?.totalMRR || 0
                },
                customers: {
                    critical: byRiskLevel.Critical,
                    high: byRiskLevel.High,
                    medium: byRiskLevel.Medium
                },
                actionItems: this._generateAtRiskActionItems(byRiskLevel)
            };
        } catch (error) {
            logger.error('Error generating at-risk report', { error: error.message, firmId });
            throw error;
        }
    }

    /**
     * Export report in specified format
     * @param {Object} reportData - Report data to export
     * @param {String} format - Export format ('csv', 'json', 'pdf')
     * @param {Object} filters - Additional filters
     * @returns {Promise<Object>} Exported report
     */
    static async exportChurnReport(reportData, format = 'json', filters = {}) {
        try {
            logger.info('Exporting churn report', { format, reportType: reportData.reportType });

            switch (format.toLowerCase()) {
                case 'json':
                    return {
                        format: 'json',
                        data: reportData,
                        filename: `${reportData.reportType}_${Date.now()}.json`
                    };

                case 'csv':
                    const csv = this._convertToCSV(reportData);
                    return {
                        format: 'csv',
                        data: csv,
                        filename: `${reportData.reportType}_${Date.now()}.csv`
                    };

                case 'pdf':
                    // PDF generation would require additional library (pdfkit, puppeteer, etc.)
                    // For now, return structured data for PDF generation
                    return {
                        format: 'pdf',
                        data: reportData,
                        filename: `${reportData.reportType}_${Date.now()}.pdf`,
                        note: 'PDF generation requires additional implementation'
                    };

                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }
        } catch (error) {
            logger.error('Error exporting report', { error: error.message, format });
            throw error;
        }
    }

    /**
     * Generate executive summary report
     * @param {String} period - Time period ('monthly', 'quarterly')
     * @param {String} firmId - Optional firm ID filter
     * @returns {Promise<Object>} Executive summary
     */
    static async generateExecutiveReport(period = 'monthly', firmId = null) {
        try {
            logger.info('Generating executive report', { period, firmId });

            // Get comprehensive metrics
            const [
                dashboardSummary,
                churnRate,
                nrr,
                healthDistribution,
                churnReasons
            ] = await Promise.all([
                ChurnAnalyticsService.getDashboardSummary(firmId),
                ChurnAnalyticsService.getChurnRate(period, firmId),
                ChurnAnalyticsService.getNetRevenueRetention(period, firmId),
                ChurnAnalyticsService.getHealthScoreDistribution(firmId),
                ChurnAnalyticsService.getChurnReasonBreakdown(period, firmId)
            ]);

            return {
                reportType: 'executive_summary',
                generatedAt: new Date(),
                period: period,
                keyMetrics: {
                    totalSubscriptions: dashboardSummary.overview.totalSubscriptions,
                    activeSubscriptions: dashboardSummary.overview.activeSubscriptions,
                    totalMRR: dashboardSummary.revenue.totalMRR,
                    churnRate: churnRate.metrics.churnRate,
                    retentionRate: churnRate.metrics.retentionRate,
                    netRevenueRetention: nrr.netRevenueRetention,
                    atRiskCount: dashboardSummary.overview.atRiskCount,
                    atRiskMRR: dashboardSummary.revenue.atRiskMRR
                },
                trends: {
                    churnedLastPeriod: churnRate.metrics.churned,
                    newSubscriptionsLastPeriod: churnRate.metrics.newSubscriptions,
                    mrrChurned: churnRate.metrics.mrrChurned
                },
                healthOverview: healthDistribution,
                topChurnReasons: churnReasons.slice(0, 5),
                executiveInsights: this._generateExecutiveInsights(
                    dashboardSummary,
                    churnRate,
                    nrr,
                    healthDistribution
                )
            };
        } catch (error) {
            logger.error('Error generating executive report', { error: error.message, period, firmId });
            throw error;
        }
    }

    // ========== HELPER METHODS ==========

    /**
     * Generate weekly insights
     * @private
     */
    static _generateWeeklyInsights(churned, newSubs, atRisk, reactivations) {
        const insights = [];

        if (churned > newSubs) {
            insights.push({
                type: 'warning',
                message: `Churn exceeded new subscriptions by ${churned - newSubs} this week`,
                priority: 'high'
            });
        }

        if (atRisk > 10) {
            insights.push({
                type: 'alert',
                message: `${atRisk} subscriptions are currently at risk of churning`,
                priority: 'high'
            });
        }

        if (reactivations > 0) {
            insights.push({
                type: 'positive',
                message: `${reactivations} subscription(s) were reactivated this week`,
                priority: 'medium'
            });
        }

        if (churned === 0) {
            insights.push({
                type: 'positive',
                message: 'No churn occurred this week',
                priority: 'low'
            });
        }

        return insights;
    }

    /**
     * Generate monthly insights
     * @private
     */
    static _generateMonthlyInsights(customerRetention, revenueRetention, nrr, churned, newSubs) {
        const insights = [];

        if (customerRetention >= 95) {
            insights.push({
                type: 'positive',
                message: 'Excellent customer retention rate',
                priority: 'low'
            });
        } else if (customerRetention < 85) {
            insights.push({
                type: 'warning',
                message: 'Customer retention below target (85%)',
                priority: 'high'
            });
        }

        if (nrr > 100) {
            insights.push({
                type: 'positive',
                message: 'Net Revenue Retention above 100% - strong expansion',
                priority: 'medium'
            });
        } else if (nrr < 90) {
            insights.push({
                type: 'alert',
                message: 'Net Revenue Retention below 90% - review pricing and expansion strategy',
                priority: 'high'
            });
        }

        if (newSubs > churned * 2) {
            insights.push({
                type: 'positive',
                message: 'New subscriptions significantly outpacing churn',
                priority: 'medium'
            });
        }

        return insights;
    }

    /**
     * Generate health recommendations
     * @private
     */
    static _generateHealthRecommendations(healthScore, subscription, overdueInvoices, paymentRate, avgPaymentDays) {
        const recommendations = [];

        if (subscription.status === 'past_due') {
            recommendations.push({
                priority: 'critical',
                action: 'Contact customer immediately regarding overdue payment',
                category: 'payment'
            });
        }

        if (subscription.cancelAtPeriodEnd) {
            recommendations.push({
                priority: 'high',
                action: 'Schedule retention call to understand cancellation reason and offer solutions',
                category: 'retention'
            });
        }

        if (overdueInvoices > 2) {
            recommendations.push({
                priority: 'high',
                action: 'Review payment terms and consider payment plan options',
                category: 'payment'
            });
        }

        if (paymentRate < 90) {
            recommendations.push({
                priority: 'medium',
                action: 'Implement automated payment reminders and follow-up process',
                category: 'payment'
            });
        }

        if (avgPaymentDays > 45) {
            recommendations.push({
                priority: 'medium',
                action: 'Consider offering early payment discounts or shorter payment terms',
                category: 'payment'
            });
        }

        if (healthScore < 50 && recommendations.length === 0) {
            recommendations.push({
                priority: 'high',
                action: 'Schedule health check call to identify and address concerns',
                category: 'engagement'
            });
        }

        return recommendations;
    }

    /**
     * Generate at-risk action items
     * @private
     */
    static _generateAtRiskActionItems(byRiskLevel) {
        const actionItems = [];

        if (byRiskLevel.Critical.length > 0) {
            actionItems.push({
                priority: 'critical',
                action: `Immediately contact ${byRiskLevel.Critical.length} critical-risk customers`,
                customers: byRiskLevel.Critical.map(c => ({ firmId: c.firmId, firmName: c.firmName }))
            });
        }

        if (byRiskLevel.High.length > 0) {
            actionItems.push({
                priority: 'high',
                action: `Schedule retention calls for ${byRiskLevel.High.length} high-risk customers`,
                customers: byRiskLevel.High.map(c => ({ firmId: c.firmId, firmName: c.firmName }))
            });
        }

        if (byRiskLevel.Medium.length > 0) {
            actionItems.push({
                priority: 'medium',
                action: `Send engagement campaigns to ${byRiskLevel.Medium.length} medium-risk customers`,
                customers: byRiskLevel.Medium.map(c => ({ firmId: c.firmId, firmName: c.firmName }))
            });
        }

        return actionItems;
    }

    /**
     * Generate executive insights
     * @private
     */
    static _generateExecutiveInsights(dashboard, churnRate, nrr, healthDistribution) {
        const insights = [];

        // Churn rate analysis
        if (churnRate.metrics.churnRate > 5) {
            insights.push({
                category: 'Churn',
                severity: 'high',
                insight: `Churn rate at ${churnRate.metrics.churnRate}% exceeds healthy threshold (5%)`,
                recommendation: 'Implement proactive retention program and review product/service quality'
            });
        } else if (churnRate.metrics.churnRate < 2) {
            insights.push({
                category: 'Churn',
                severity: 'positive',
                insight: `Excellent churn rate at ${churnRate.metrics.churnRate}%`,
                recommendation: 'Maintain current customer success initiatives'
            });
        }

        // NRR analysis
        if (nrr.netRevenueRetention > 110) {
            insights.push({
                category: 'Revenue',
                severity: 'positive',
                insight: `Strong NRR at ${nrr.netRevenueRetention}% indicates healthy expansion`,
                recommendation: 'Continue focus on upsell and expansion strategies'
            });
        } else if (nrr.netRevenueRetention < 95) {
            insights.push({
                category: 'Revenue',
                severity: 'high',
                insight: `NRR below 95% indicates revenue leakage`,
                recommendation: 'Review pricing strategy and identify expansion opportunities'
            });
        }

        // Health distribution analysis
        const criticalPercentage = healthDistribution.total > 0
            ? (healthDistribution.critical / healthDistribution.total) * 100
            : 0;

        if (criticalPercentage > 10) {
            insights.push({
                category: 'Customer Health',
                severity: 'high',
                insight: `${criticalPercentage.toFixed(1)}% of customers in critical health status`,
                recommendation: 'Allocate resources to intensive intervention for critical accounts'
            });
        }

        // At-risk revenue
        const atRiskPercentage = dashboard.revenue.totalMRR > 0
            ? (dashboard.revenue.atRiskMRR / dashboard.revenue.totalMRR) * 100
            : 0;

        if (atRiskPercentage > 15) {
            insights.push({
                category: 'Revenue Risk',
                severity: 'high',
                insight: `${atRiskPercentage.toFixed(1)}% of MRR is at risk`,
                recommendation: 'Prioritize retention efforts on high-value at-risk accounts'
            });
        }

        return insights;
    }

    /**
     * Convert report data to CSV format
     * @private
     */
    static _convertToCSV(reportData) {
        // Simple CSV conversion - can be enhanced based on report type
        if (reportData.reportType === 'weekly_churn_summary') {
            let csv = 'Metric,Value\n';
            csv += `Total Churned,${reportData.summary.totalChurned}\n`;
            csv += `MRR Lost,${reportData.summary.mrrLost}\n`;
            csv += `New Subscriptions,${reportData.summary.newSubscriptions}\n`;
            csv += `Net Change,${reportData.summary.netChange}\n`;
            csv += `At Risk,${reportData.summary.currentAtRisk}\n\n`;
            csv += 'Churn Reasons\n';
            csv += 'Reason,Count\n';
            reportData.churnReasons.forEach(r => {
                csv += `${r.reason},${r.count}\n`;
            });
            return csv;
        }

        // Default: stringify JSON
        return JSON.stringify(reportData, null, 2);
    }
}

module.exports = ChurnReportsService;
