/**
 * Churn Analytics Service
 *
 * Provides comprehensive churn analysis, customer health scoring,
 * retention metrics, and intervention tracking for subscription management.
 *
 * Features:
 * - Dashboard summary metrics
 * - Health score distribution and trends
 * - Churn rate calculations (monthly/quarterly/annual)
 * - Cohort analysis and retention curves
 * - Intervention effectiveness tracking
 * - Revenue at risk calculations
 * - Net Revenue Retention (NRR)
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Models
const Subscription = require('../models/subscription.model');
const Firm = require('../models/firm.model');
const Invoice = require('../models/invoice.model');
const Payment = require('../models/payment.model');

class ChurnAnalyticsService {
    /**
     * Get overall churn health metrics for dashboard
     * @param {String} firmId - Optional firm ID filter (for admin view)
     * @returns {Promise<Object>} Dashboard summary
     */
    static async getDashboardSummary(firmId = null) {
        try {
            // SECURITY: Require firmId for multi-tenant isolation
            if (!firmId) {
                logger.warn('ChurnAnalytics.getDashboardSummary called without firmId');
                return {
                    totalSubscriptions: 0,
                    atRiskCount: 0,
                    recentChurns: 0,
                    churnRate: 0,
                    netRevenueRetention: 0
                };
            }

            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

            const matchStage = { firmId: new mongoose.Types.ObjectId(firmId) };

            // Get current subscription stats
            const subscriptionStats = await Subscription.aggregate([
                { $match: matchStage },
                {
                    $facet: {
                        total: [
                            { $count: 'count' }
                        ],
                        byStatus: [
                            {
                                $group: {
                                    _id: '$status',
                                    count: { $sum: 1 },
                                    mrr: { $sum: { $cond: [
                                        { $eq: ['$billingCycle', 'monthly'] },
                                        1,
                                        { $divide: [1, 12] } // Yearly converted to monthly
                                    ]}}
                                }
                            }
                        ],
                        atRisk: [
                            {
                                $match: {
                                    $or: [
                                        { cancelAtPeriodEnd: true },
                                        { status: 'past_due' },
                                        {
                                            status: 'trialing',
                                            trialEnd: { $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) }
                                        }
                                    ]
                                }
                            },
                            { $count: 'count' }
                        ],
                        recentChurns: [
                            {
                                $match: {
                                    status: 'canceled',
                                    canceledAt: { $gte: thirtyDaysAgo }
                                }
                            },
                            { $count: 'count' }
                        ],
                        churnedRevenue: [
                            {
                                $match: {
                                    status: 'canceled',
                                    canceledAt: { $gte: thirtyDaysAgo }
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    totalMRR: { $sum: { $cond: [
                                        { $eq: ['$billingCycle', 'monthly'] },
                                        1,
                                        { $divide: [1, 12] }
                                    ]}}
                                }
                            }
                        ]
                    }
                }
            ]);

            const stats = subscriptionStats[0];
            const totalSubs = stats.total[0]?.count || 0;
            const atRiskCount = stats.atRisk[0]?.count || 0;
            const recentChurnsCount = stats.recentChurns[0]?.count || 0;
            const churnedMRR = stats.churnedRevenue[0]?.totalMRR || 0;

            // Calculate health score distribution
            const healthDistribution = await this.getHealthScoreDistribution(firmId);

            // Calculate current MRR
            const activeStatuses = ['active', 'trialing'];
            const activeSubs = stats.byStatus.filter(s => activeStatuses.includes(s._id));
            const totalMRR = activeSubs.reduce((sum, s) => sum + (s.mrr || 0), 0);

            // Calculate churn rate for last 30 days
            const churnRate = totalSubs > 0 ? (recentChurnsCount / totalSubs) * 100 : 0;

            return {
                overview: {
                    totalSubscriptions: totalSubs,
                    activeSubscriptions: activeSubs.reduce((sum, s) => sum + s.count, 0),
                    atRiskCount,
                    atRiskPercentage: totalSubs > 0 ? (atRiskCount / totalSubs) * 100 : 0,
                    churnedLast30Days: recentChurnsCount,
                    churnRate: parseFloat(churnRate.toFixed(2))
                },
                revenue: {
                    totalMRR,
                    atRiskMRR: await this.getAtRiskRevenue(firmId),
                    churnedMRRLast30Days: churnedMRR,
                    retentionRate: 100 - churnRate
                },
                healthDistribution,
                statusBreakdown: stats.byStatus,
                period: {
                    start: thirtyDaysAgo,
                    end: now
                }
            };
        } catch (error) {
            logger.error('Error getting dashboard summary', { error: error.message, firmId });
            throw error;
        }
    }

    /**
     * Get count of subscriptions by health score risk tier
     * @param {String} firmId - Optional firm ID filter
     * @returns {Promise<Object>} Distribution by risk tier
     */
    static async getHealthScoreDistribution(firmId = null) {
        try {
            // SECURITY: Require firmId for multi-tenant isolation
            if (!firmId) {
                logger.warn('ChurnAnalytics.getHealthScoreDistribution called without firmId');
                return { healthy: 0, moderate: 0, atRisk: 0, critical: 0, total: 0 };
            }
            // SECURITY: Require firmId - if missing, caller should return early
            const matchStage = { firmId: new mongoose.Types.ObjectId(firmId) };

            // Calculate health scores dynamically
            const subscriptions = await Subscription.aggregate([
                { $match: { ...matchStage, status: { $in: ['active', 'trialing'] } } },
                { $limit: 10000 },
                {
                    $lookup: {
                        from: 'invoices',
                        localField: 'firmId',
                        foreignField: 'firmId',
                        as: 'invoices'
                    }
                },
                {
                    $lookup: {
                        from: 'payments',
                        localField: 'firmId',
                        foreignField: 'firmId',
                        as: 'payments'
                    }
                }
            ]);

            // Calculate health scores
            const distribution = {
                healthy: 0,      // 80-100
                moderate: 0,     // 50-79
                atRisk: 0,       // 30-49
                critical: 0      // 0-29
            };

            subscriptions.forEach(sub => {
                const score = this._calculateHealthScore(sub);

                if (score >= 80) distribution.healthy++;
                else if (score >= 50) distribution.moderate++;
                else if (score >= 30) distribution.atRisk++;
                else distribution.critical++;
            });

            return {
                ...distribution,
                total: subscriptions.length
            };
        } catch (error) {
            logger.error('Error getting health score distribution', { error: error.message, firmId });
            throw error;
        }
    }

    /**
     * Get health score trend over time
     * @param {Number} days - Number of days to look back (default 90)
     * @param {String} firmId - Optional firm ID filter
     * @returns {Promise<Array>} Daily average health scores
     */
    static async getHealthScoreTrend(days = 90, firmId = null) {
        try {
            // SECURITY: Require firmId for multi-tenant isolation
            if (!firmId) {
                logger.warn('ChurnAnalytics.getHealthScoreTrend called without firmId');
                return [];
            }

            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

            // Since we don't have historical health scores stored,
            // we'll calculate trends based on subscription status changes
            // SECURITY: Require firmId - if missing, caller should return early
            const matchStage = { firmId: new mongoose.Types.ObjectId(firmId) };

            const trend = await Subscription.aggregate([
                {
                    $match: {
                        ...matchStage,
                        createdAt: { $lte: endDate }
                    }
                },
                {
                    $project: {
                        date: '$createdAt',
                        status: 1,
                        cancelAtPeriodEnd: 1,
                        score: {
                            $switch: {
                                branches: [
                                    { case: { $eq: ['$status', 'active'] }, then: 85 },
                                    { case: { $eq: ['$status', 'trialing'] }, then: 70 },
                                    { case: { $eq: ['$status', 'past_due'] }, then: 40 },
                                    { case: { $or: [{ $eq: ['$cancelAtPeriodEnd', true] }] }, then: 35 }
                                ],
                                default: 60
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: '%Y-%m-%d',
                                date: { $dateTrunc: { date: new Date(), unit: 'day' } }
                            }
                        },
                        averageScore: { $avg: '$score' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } },
                { $limit: 1000 }
            ]);

            return trend.map(item => ({
                date: item._id,
                averageScore: parseFloat(item.averageScore.toFixed(2)),
                subscriptionCount: item.count
            }));
        } catch (error) {
            logger.error('Error getting health score trend', { error: error.message, days, firmId });
            throw error;
        }
    }

    /**
     * Calculate MRR at risk of churning
     * @param {String} firmId - Optional firm ID filter
     * @returns {Promise<Number>} MRR at risk
     */
    static async getAtRiskRevenue(firmId = null) {
        try {
            // SECURITY: Require firmId for multi-tenant isolation
            if (!firmId) {
                logger.warn('ChurnAnalytics.getAtRiskRevenue called without firmId');
                return 0;
            }

            const now = new Date();
            const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

            // SECURITY: Require firmId - if missing, caller should return early
            const matchStage = { firmId: new mongoose.Types.ObjectId(firmId) };

            const result = await Subscription.aggregate([
                {
                    $match: {
                        ...matchStage,
                        $or: [
                            { cancelAtPeriodEnd: true },
                            { status: 'past_due' },
                            {
                                status: 'trialing',
                                trialEnd: { $lte: sevenDaysFromNow }
                            }
                        ]
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

            return result[0]?.totalMRR || 0;
        } catch (error) {
            logger.error('Error getting at-risk revenue', { error: error.message, firmId });
            throw error;
        }
    }

    /**
     * Calculate churn rate for a given period
     * @param {String} period - 'monthly', 'quarterly', or 'annual'
     * @param {String} firmId - Optional firm ID filter
     * @returns {Promise<Object>} Churn rate and related metrics
     */
    static async getChurnRate(period = 'monthly', firmId = null) {
        try {
            // SECURITY: Require firmId for multi-tenant isolation
            if (!firmId) {
                logger.warn('ChurnAnalytics.getChurnRate called without firmId');
                return { period: 'N/A', metrics: { churnRate: 0, retentionRate: 0 } };
            }

            const now = new Date();
            let startDate;
            let periodLabel;

            switch (period) {
                case 'monthly':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    periodLabel = 'This Month';
                    break;
                case 'quarterly':
                    const quarter = Math.floor(now.getMonth() / 3);
                    startDate = new Date(now.getFullYear(), quarter * 3, 1);
                    periodLabel = `Q${quarter + 1} ${now.getFullYear()}`;
                    break;
                case 'annual':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    periodLabel = `${now.getFullYear()}`;
                    break;
                default:
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    periodLabel = 'This Month';
            }

            // SECURITY: Require firmId - if missing, caller should return early
            const matchStage = { firmId: new mongoose.Types.ObjectId(firmId) };

            // Get subscriptions at start of period
            const startCount = await Subscription.countDocuments({
                ...matchStage,
                createdAt: { $lt: startDate },
                $or: [
                    { status: { $ne: 'canceled' } },
                    { canceledAt: { $gte: startDate } }
                ]
            });

            // Get churned subscriptions during period
            const churnedCount = await Subscription.countDocuments({
                ...matchStage,
                status: 'canceled',
                canceledAt: { $gte: startDate, $lte: now }
            });

            // Get new subscriptions during period
            const newCount = await Subscription.countDocuments({
                ...matchStage,
                createdAt: { $gte: startDate, $lte: now }
            });

            // Calculate rates
            const churnRate = startCount > 0 ? (churnedCount / startCount) * 100 : 0;
            const retentionRate = 100 - churnRate;

            // Calculate MRR churned
            const churnedMRR = await Subscription.aggregate([
                {
                    $match: {
                        ...matchStage,
                        status: 'canceled',
                        canceledAt: { $gte: startDate, $lte: now }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: {
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
                period: periodLabel,
                startDate,
                endDate: now,
                metrics: {
                    subscriptionsAtStart: startCount,
                    newSubscriptions: newCount,
                    churned: churnedCount,
                    churnRate: parseFloat(churnRate.toFixed(2)),
                    retentionRate: parseFloat(retentionRate.toFixed(2)),
                    mrrChurned: churnedMRR[0]?.total || 0
                }
            };
        } catch (error) {
            logger.error('Error calculating churn rate', { error: error.message, period, firmId });
            throw error;
        }
    }

    /**
     * Get churn rate trend over multiple periods
     * @param {Number} months - Number of months to look back (default 12)
     * @param {String} firmId - Optional firm ID filter
     * @returns {Promise<Array>} Monthly churn rates
     */
    static async getChurnTrend(months = 12, firmId = null) {
        try {
            // SECURITY: Require firmId for multi-tenant isolation
            if (!firmId) {
                logger.warn('ChurnAnalytics.getChurnTrend called without firmId');
                return [];
            }

            const now = new Date();
            // SECURITY: Require firmId - if missing, caller should return early
            const matchStage = { firmId: new mongoose.Types.ObjectId(firmId) };

            const trend = [];

            for (let i = months - 1; i >= 0; i--) {
                const periodStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const periodEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

                // Count active at start
                const activeAtStart = await Subscription.countDocuments({
                    ...matchStage,
                    createdAt: { $lt: periodStart },
                    $or: [
                        { status: { $ne: 'canceled' } },
                        { canceledAt: { $gte: periodStart } }
                    ]
                });

                // Count churned during period
                const churned = await Subscription.countDocuments({
                    ...matchStage,
                    status: 'canceled',
                    canceledAt: { $gte: periodStart, $lte: periodEnd }
                });

                const churnRate = activeAtStart > 0 ? (churned / activeAtStart) * 100 : 0;

                trend.push({
                    month: periodStart.toISOString().slice(0, 7),
                    activeAtStart,
                    churned,
                    churnRate: parseFloat(churnRate.toFixed(2))
                });
            }

            return trend;
        } catch (error) {
            logger.error('Error getting churn trend', { error: error.message, months, firmId });
            throw error;
        }
    }

    /**
     * Get breakdown of churn reasons
     * @param {String} period - Time period ('monthly', 'quarterly', 'annual')
     * @param {String} firmId - Optional firm ID filter
     * @returns {Promise<Array>} Churn reasons with counts
     */
    static async getChurnReasonBreakdown(period = 'monthly', firmId = null) {
        try {
            // SECURITY: Require firmId for multi-tenant isolation
            if (!firmId) {
                logger.warn('ChurnAnalytics.getChurnReasonBreakdown called without firmId');
                return [];
            }

            const { startDate } = this._getPeriodDates(period);
            // SECURITY: Require firmId - if missing, caller should return early
            const matchStage = { firmId: new mongoose.Types.ObjectId(firmId) };

            const breakdown = await Subscription.aggregate([
                {
                    $match: {
                        ...matchStage,
                        status: 'canceled',
                        canceledAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: {
                            $ifNull: ['$cancellationReason', 'Not specified']
                        },
                        count: { $sum: 1 },
                        mrrLost: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$billingCycle', 'monthly'] },
                                    1,
                                    { $divide: [1, 12] }
                                ]
                            }
                        }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 1000 }
            ]);

            return breakdown.map(item => ({
                reason: item._id,
                count: item.count,
                mrrLost: parseFloat(item.mrrLost.toFixed(2))
            }));
        } catch (error) {
            logger.error('Error getting churn reason breakdown', { error: error.message, period, firmId });
            throw error;
        }
    }

    /**
     * Get churn rate by customer segment
     * @param {String} segmentField - Field to segment by ('planId', 'billingCycle')
     * @param {String} period - Time period
     * @param {String} firmId - Optional firm ID filter
     * @returns {Promise<Array>} Churn rates by segment
     */
    static async getChurnBySegment(segmentField = 'planId', period = 'monthly', firmId = null) {
        try {
            // SECURITY: Require firmId for multi-tenant isolation
            if (!firmId) {
                logger.warn('ChurnAnalytics.getChurnBySegment called without firmId');
                return [];
            }

            const { startDate } = this._getPeriodDates(period);
            // SECURITY: Require firmId - if missing, caller should return early
            const matchStage = { firmId: new mongoose.Types.ObjectId(firmId) };

            // Get all subscriptions grouped by segment
            const segments = await Subscription.aggregate([
                {
                    $match: {
                        ...matchStage,
                        createdAt: { $lt: startDate }
                    }
                },
                {
                    $group: {
                        _id: `$${segmentField}`,
                        totalAtStart: { $sum: 1 },
                        churned: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$status', 'canceled'] },
                                            { $gte: ['$canceledAt', startDate] }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                },
                {
                    $project: {
                        segment: '$_id',
                        totalAtStart: 1,
                        churned: 1,
                        churnRate: {
                            $cond: [
                                { $gt: ['$totalAtStart', 0] },
                                { $multiply: [{ $divide: ['$churned', '$totalAtStart'] }, 100] },
                                0
                            ]
                        }
                    }
                },
                { $sort: { churnRate: -1 } },
                { $limit: 1000 }
            ]);

            return segments.map(seg => ({
                segment: seg.segment,
                totalAtStart: seg.totalAtStart,
                churned: seg.churned,
                churnRate: parseFloat(seg.churnRate.toFixed(2))
            }));
        } catch (error) {
            logger.error('Error getting churn by segment', { error: error.message, segmentField, firmId });
            throw error;
        }
    }

    /**
     * Calculate Net Revenue Retention (NRR)
     * @param {String} period - Time period
     * @param {String} firmId - Optional firm ID filter
     * @returns {Promise<Object>} NRR calculation
     */
    static async getNetRevenueRetention(period = 'monthly', firmId = null) {
        try {
            // SECURITY: Require firmId for multi-tenant isolation
            if (!firmId) {
                logger.warn('ChurnAnalytics.getNetRevenueRetention called without firmId');
                return { nrr: 100, startingMRR: 0, churnedMRR: 0 };
            }

            const { startDate, endDate } = this._getPeriodDates(period);
            // SECURITY: Require firmId - if missing, caller should return early
            const matchStage = { firmId: new mongoose.Types.ObjectId(firmId) };

            // Get MRR at start of period
            const startMRR = await Subscription.aggregate([
                {
                    $match: {
                        ...matchStage,
                        createdAt: { $lt: startDate },
                        $or: [
                            { status: { $ne: 'canceled' } },
                            { canceledAt: { $gte: startDate } }
                        ]
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: {
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

            // Get churned MRR
            const churnedMRR = await Subscription.aggregate([
                {
                    $match: {
                        ...matchStage,
                        status: 'canceled',
                        canceledAt: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: {
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

            const startingMRR = startMRR[0]?.total || 0;
            const churnedRevenue = churnedMRR[0]?.total || 0;

            // NRR = (Starting MRR - Churned MRR) / Starting MRR * 100
            const nrr = startingMRR > 0 ? ((startingMRR - churnedRevenue) / startingMRR) * 100 : 100;

            return {
                period,
                startDate,
                endDate,
                startingMRR,
                churnedMRR: churnedRevenue,
                netRevenueRetention: parseFloat(nrr.toFixed(2))
            };
        } catch (error) {
            logger.error('Error calculating NRR', { error: error.message, period, firmId });
            throw error;
        }
    }

    /**
     * Get cohort retention analysis
     * @param {String} cohortMonth - Month of cohort (YYYY-MM)
     * @param {Number} months - Months to track (default 12)
     * @param {String} firmId - Optional firm ID filter
     * @returns {Promise<Object>} Cohort retention data
     */
    static async getCohortRetention(cohortMonth, months = 12, firmId = null) {
        try {
            // SECURITY: Require firmId for multi-tenant isolation
            if (!firmId) {
                logger.warn('ChurnAnalytics.getCohortRetention called without firmId');
                return { cohort: cohortMonth, cohortSize: 0, retention: [] };
            }

            const cohortDate = new Date(cohortMonth + '-01');
            const cohortEndDate = new Date(cohortDate.getFullYear(), cohortDate.getMonth() + 1, 0);
            // SECURITY: Require firmId - if missing, caller should return early
            const matchStage = { firmId: new mongoose.Types.ObjectId(firmId) };

            // Get all subscriptions from this cohort
            const cohortSubscriptions = await Subscription.find({
                ...matchStage,
                createdAt: { $gte: cohortDate, $lte: cohortEndDate }
            }).select('_id createdAt canceledAt status');

            const cohortSize = cohortSubscriptions.length;
            const retention = [];

            for (let i = 0; i < months; i++) {
                const checkDate = new Date(cohortDate.getFullYear(), cohortDate.getMonth() + i + 1, 0);

                const activeCount = cohortSubscriptions.filter(sub => {
                    const stillActive = sub.status !== 'canceled' ||
                                      (sub.canceledAt && sub.canceledAt > checkDate);
                    return stillActive;
                }).length;

                const retentionRate = cohortSize > 0 ? (activeCount / cohortSize) * 100 : 0;

                retention.push({
                    month: i,
                    date: checkDate.toISOString().slice(0, 7),
                    activeSubscriptions: activeCount,
                    retentionRate: parseFloat(retentionRate.toFixed(2))
                });
            }

            return {
                cohort: cohortMonth,
                cohortSize,
                retention
            };
        } catch (error) {
            logger.error('Error getting cohort retention', { error: error.message, cohortMonth, firmId });
            throw error;
        }
    }

    /**
     * Get churn curve showing when customers typically churn
     * @param {String} firmId - Optional firm ID filter
     * @returns {Promise<Array>} Churn distribution by tenure
     */
    static async getCohortChurnCurve(firmId = null) {
        try {
            // SECURITY: Require firmId for multi-tenant isolation
            if (!firmId) {
                logger.warn('ChurnAnalytics.getCohortChurnCurve called without firmId');
                return [];
            }
            // SECURITY: Require firmId - if missing, caller should return early
            const matchStage = { firmId: new mongoose.Types.ObjectId(firmId) };

            const churnedSubscriptions = await Subscription.aggregate([
                {
                    $match: {
                        ...matchStage,
                        status: 'canceled',
                        canceledAt: { $exists: true },
                        createdAt: { $exists: true }
                    }
                },
                {
                    $project: {
                        tenureMonths: {
                            $floor: {
                                $divide: [
                                    { $subtract: ['$canceledAt', '$createdAt'] },
                                    1000 * 60 * 60 * 24 * 30
                                ]
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: '$tenureMonths',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } },
                { $limit: 1000 }
            ]);

            return churnedSubscriptions.map(item => ({
                tenureMonths: item._id,
                churnCount: item.count
            }));
        } catch (error) {
            logger.error('Error getting churn curve', { error: error.message, firmId });
            throw error;
        }
    }

    /**
     * Calculate average time to churn
     * @param {String} firmId - Optional firm ID filter
     * @returns {Promise<Object>} Time to churn metrics
     */
    static async getTimeToChurn(firmId = null) {
        try {
            // SECURITY: Require firmId for multi-tenant isolation
            if (!firmId) {
                logger.warn('ChurnAnalytics.getTimeToChurn called without firmId');
                return { averageDays: 0, averageMonths: 0, totalChurned: 0 };
            }
            // SECURITY: Require firmId - if missing, caller should return early
            const matchStage = { firmId: new mongoose.Types.ObjectId(firmId) };

            const result = await Subscription.aggregate([
                {
                    $match: {
                        ...matchStage,
                        status: 'canceled',
                        canceledAt: { $exists: true },
                        createdAt: { $exists: true }
                    }
                },
                {
                    $project: {
                        tenureDays: {
                            $divide: [
                                { $subtract: ['$canceledAt', '$createdAt'] },
                                1000 * 60 * 60 * 24
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgTenureDays: { $avg: '$tenureDays' },
                        minTenureDays: { $min: '$tenureDays' },
                        maxTenureDays: { $max: '$tenureDays' },
                        count: { $sum: 1 }
                    }
                }
            ]);

            const stats = result[0] || {};

            return {
                averageDays: stats.avgTenureDays ? parseFloat(stats.avgTenureDays.toFixed(1)) : 0,
                averageMonths: stats.avgTenureDays ? parseFloat((stats.avgTenureDays / 30).toFixed(1)) : 0,
                minDays: stats.minTenureDays || 0,
                maxDays: stats.maxTenureDays || 0,
                totalChurned: stats.count || 0
            };
        } catch (error) {
            logger.error('Error calculating time to churn', { error: error.message, firmId });
            throw error;
        }
    }

    /**
     * Get list of at-risk customers for export/intervention
     * @param {String} firmId - Optional firm ID filter
     * @returns {Promise<Array>} List of at-risk subscriptions
     */
    static async getChurnRiskList(firmId = null) {
        try {
            // SECURITY: Require firmId for multi-tenant isolation
            if (!firmId) {
                logger.warn('ChurnAnalytics.getChurnRiskList called without firmId');
                return [];
            }

            const now = new Date();
            const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            // SECURITY: Require firmId - if missing, caller should return early
            const matchStage = { firmId: new mongoose.Types.ObjectId(firmId) };

            const atRiskSubscriptions = await Subscription.find({
                ...matchStage,
                $or: [
                    { cancelAtPeriodEnd: true },
                    { status: 'past_due' },
                    {
                        status: 'trialing',
                        trialEnd: { $lte: sevenDaysFromNow }
                    }
                ]
            })
            .populate('firmId', 'name email phone')
            .populate('createdBy', 'firstName lastName email')
            .lean();

            return atRiskSubscriptions.map(sub => {
                const riskFactors = [];
                if (sub.cancelAtPeriodEnd) riskFactors.push('Scheduled for cancellation');
                if (sub.status === 'past_due') riskFactors.push('Payment overdue');
                if (sub.status === 'trialing' && sub.trialEnd <= sevenDaysFromNow) {
                    riskFactors.push('Trial ending soon');
                }

                return {
                    subscriptionId: sub._id,
                    firmId: sub.firmId?._id,
                    firmName: sub.firmId?.name,
                    firmEmail: sub.firmId?.email,
                    firmPhone: sub.firmId?.phone,
                    planId: sub.planId,
                    status: sub.status,
                    billingCycle: sub.billingCycle,
                    currentPeriodEnd: sub.currentPeriodEnd,
                    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
                    trialEnd: sub.trialEnd,
                    riskFactors,
                    riskLevel: sub.status === 'past_due' ? 'Critical' :
                               sub.cancelAtPeriodEnd ? 'High' : 'Medium',
                    createdAt: sub.createdAt
                };
            });
        } catch (error) {
            logger.error('Error getting churn risk list', { error: error.message, firmId });
            throw error;
        }
    }

    // ========== HELPER METHODS ==========

    /**
     * Calculate health score for a subscription
     * @private
     */
    static _calculateHealthScore(subscription) {
        let score = 100;

        // Deduct points based on status
        if (subscription.status === 'past_due') score -= 50;
        if (subscription.status === 'canceled') score = 0;
        if (subscription.cancelAtPeriodEnd) score -= 30;

        // Deduct points for trial ending soon
        if (subscription.status === 'trialing' && subscription.trialEnd) {
            const daysUntilEnd = Math.ceil((subscription.trialEnd - new Date()) / (1000 * 60 * 60 * 24));
            if (daysUntilEnd <= 3) score -= 40;
            else if (daysUntilEnd <= 7) score -= 20;
        }

        // Check payment history
        if (subscription.invoices && subscription.invoices.length > 0) {
            const overdueInvoices = subscription.invoices.filter(inv =>
                inv.status === 'overdue' || inv.balanceDue > 0
            ).length;
            score -= overdueInvoices * 10;
        }

        // Check usage
        if (subscription.usage) {
            const usageRatio = subscription.usage.apiCallsThisMonth / 1000; // Normalize
            if (usageRatio < 0.1) score -= 15; // Low usage
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Get period dates based on period type
     * @private
     */
    static _getPeriodDates(period) {
        const now = new Date();
        let startDate;

        switch (period) {
            case 'monthly':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'quarterly':
                const quarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), quarter * 3, 1);
                break;
            case 'annual':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        return { startDate, endDate: now };
    }
}

module.exports = ChurnAnalyticsService;
