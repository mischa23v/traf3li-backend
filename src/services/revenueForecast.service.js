/**
 * Revenue Forecast Service
 *
 * Enterprise-grade revenue forecasting with pipeline analysis.
 * Provides weighted pipeline value, forecast by period, and trend analysis.
 *
 * Features:
 * - Weighted pipeline calculation
 * - Forecast by stage probability
 * - Time-based forecasting
 * - Trend analysis and velocity tracking
 * - Accuracy measurement
 */

const mongoose = require('mongoose');
const Lead = require('../models/lead.model');
const Pipeline = require('../models/pipeline.model');

class RevenueForecastService {
    /**
     * Get comprehensive revenue forecast
     */
    async getForecast(firmId, options = {}) {
        const {
            startDate,
            endDate,
            pipelineId,
            assignedTo,
            groupBy = 'stage'
        } = options;

        const match = {
            firmId: new mongoose.Types.ObjectId(firmId),
            status: { $nin: ['lost', 'converted', 'archived'] },
            estimatedValue: { $gt: 0 }
        };

        if (startDate) {
            match.expectedCloseDate = { $gte: new Date(startDate) };
        }
        if (endDate) {
            match.expectedCloseDate = { ...match.expectedCloseDate, $lte: new Date(endDate) };
        }
        if (pipelineId) {
            match.pipelineId = new mongoose.Types.ObjectId(pipelineId);
        }
        if (assignedTo) {
            match.assignedTo = new mongoose.Types.ObjectId(assignedTo);
        }

        const leads = await Lead.find(match)
            .populate('pipelineStageId', 'name nameAr probability order')
            .populate('assignedTo', 'firstName lastName')
            .lean();

        // Calculate totals
        let totalExpected = 0;
        let totalWeighted = 0;
        let totalBestCase = 0;
        let totalWorstCase = 0;

        const byStage = {};
        const byOwner = {};
        const byMonth = {};

        for (const lead of leads) {
            const probability = lead.probability || lead.pipelineStageId?.probability || 0;
            const weighted = lead.estimatedValue * (probability / 100);
            const bestCase = lead.estimatedValue * (Math.min(100, probability + 20) / 100);
            const worstCase = lead.estimatedValue * (Math.max(0, probability - 20) / 100);

            totalExpected += lead.estimatedValue;
            totalWeighted += weighted;
            totalBestCase += bestCase;
            totalWorstCase += worstCase;

            // Group by stage
            const stageKey = lead.pipelineStageId?._id?.toString() || 'unassigned';
            if (!byStage[stageKey]) {
                byStage[stageKey] = {
                    stageId: stageKey,
                    stageName: lead.pipelineStageId?.name || 'Unassigned',
                    stageNameAr: lead.pipelineStageId?.nameAr || 'غير محدد',
                    probability: probability,
                    order: lead.pipelineStageId?.order || 999,
                    count: 0,
                    totalExpected: 0,
                    totalWeighted: 0
                };
            }
            byStage[stageKey].count++;
            byStage[stageKey].totalExpected += lead.estimatedValue;
            byStage[stageKey].totalWeighted += weighted;

            // Group by owner
            const ownerKey = lead.assignedTo?._id?.toString() || 'unassigned';
            if (!byOwner[ownerKey]) {
                byOwner[ownerKey] = {
                    ownerId: ownerKey,
                    ownerName: lead.assignedTo
                        ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`
                        : 'Unassigned',
                    count: 0,
                    totalExpected: 0,
                    totalWeighted: 0
                };
            }
            byOwner[ownerKey].count++;
            byOwner[ownerKey].totalExpected += lead.estimatedValue;
            byOwner[ownerKey].totalWeighted += weighted;

            // Group by expected close month
            if (lead.expectedCloseDate) {
                const monthKey = new Date(lead.expectedCloseDate).toISOString().substring(0, 7);
                if (!byMonth[monthKey]) {
                    byMonth[monthKey] = {
                        period: monthKey,
                        count: 0,
                        totalExpected: 0,
                        totalWeighted: 0
                    };
                }
                byMonth[monthKey].count++;
                byMonth[monthKey].totalExpected += lead.estimatedValue;
                byMonth[monthKey].totalWeighted += weighted;
            }
        }

        return {
            summary: {
                totalLeads: leads.length,
                totalExpected,
                totalWeighted,
                totalBestCase,
                totalWorstCase,
                avgProbability: leads.length > 0
                    ? Math.round(leads.reduce((sum, l) => sum + (l.probability || 0), 0) / leads.length)
                    : 0,
                currency: 'SAR'
            },
            byStage: Object.values(byStage).sort((a, b) => a.order - b.order),
            byOwner: Object.values(byOwner).sort((a, b) => b.totalWeighted - a.totalWeighted),
            byMonth: Object.values(byMonth).sort((a, b) => a.period.localeCompare(b.period))
        };
    }

    /**
     * Get forecast by time period
     */
    async getForecastByPeriod(firmId, options = {}) {
        const { months = 6, pipelineId } = options;
        const periods = [];
        const now = new Date();

        for (let i = 0; i < months; i++) {
            const startDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const endDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 0);

            const match = {
                firmId: new mongoose.Types.ObjectId(firmId),
                status: { $nin: ['lost', 'converted', 'archived'] },
                expectedCloseDate: { $gte: startDate, $lte: endDate }
            };

            if (pipelineId) {
                match.pipelineId = new mongoose.Types.ObjectId(pipelineId);
            }

            const leads = await Lead.find(match)
                .select('estimatedValue probability')
                .lean();

            let expected = 0;
            let weighted = 0;

            for (const lead of leads) {
                expected += lead.estimatedValue || 0;
                weighted += (lead.estimatedValue || 0) * ((lead.probability || 0) / 100);
            }

            periods.push({
                period: startDate.toISOString().substring(0, 7),
                month: startDate.toLocaleString('default', { month: 'short' }),
                year: startDate.getFullYear(),
                expected,
                weighted,
                count: leads.length,
                isCurrent: i === 0,
                isQuarterEnd: (startDate.getMonth() + 1) % 3 === 0
            });
        }

        // Calculate quarter totals
        const quarters = [];
        for (let i = 0; i < periods.length; i += 3) {
            const quarterPeriods = periods.slice(i, i + 3);
            if (quarterPeriods.length === 3) {
                quarters.push({
                    quarter: `Q${Math.floor(i / 3) + 1}`,
                    expected: quarterPeriods.reduce((sum, p) => sum + p.expected, 0),
                    weighted: quarterPeriods.reduce((sum, p) => sum + p.weighted, 0),
                    count: quarterPeriods.reduce((sum, p) => sum + p.count, 0)
                });
            }
        }

        return { periods, quarters };
    }

    /**
     * Get pipeline velocity metrics
     */
    async getPipelineVelocity(firmId, options = {}) {
        const { days = 90, pipelineId } = options;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const match = {
            firmId: new mongoose.Types.ObjectId(firmId),
            status: { $in: ['won', 'converted'] },
            convertedAt: { $gte: startDate }
        };

        if (pipelineId) {
            match.pipelineId = new mongoose.Types.ObjectId(pipelineId);
        }

        const wonLeads = await Lead.find(match)
            .select('estimatedValue createdAt convertedAt')
            .lean();

        if (wonLeads.length === 0) {
            return {
                avgDaysToClose: 0,
                avgDealSize: 0,
                velocity: 0,
                wonDeals: 0,
                totalRevenue: 0,
                period: `${days} days`
            };
        }

        let totalDaysToClose = 0;
        let totalRevenue = 0;

        for (const lead of wonLeads) {
            const daysToClose = Math.ceil(
                (new Date(lead.convertedAt) - new Date(lead.createdAt)) / (1000 * 60 * 60 * 24)
            );
            totalDaysToClose += daysToClose;
            totalRevenue += lead.estimatedValue || 0;
        }

        const avgDaysToClose = Math.round(totalDaysToClose / wonLeads.length);
        const avgDealSize = Math.round(totalRevenue / wonLeads.length);

        // Velocity = (Number of Deals × Average Deal Size) / Sales Cycle Length
        const velocity = avgDaysToClose > 0
            ? Math.round((wonLeads.length * avgDealSize) / avgDaysToClose)
            : 0;

        return {
            avgDaysToClose,
            avgDealSize,
            velocity,
            wonDeals: wonLeads.length,
            totalRevenue,
            period: `${days} days`,
            currency: 'SAR'
        };
    }

    /**
     * Get forecast trends
     */
    async getForecastTrends(firmId, options = {}) {
        const { months = 6 } = options;
        const now = new Date();

        // Get historical win rates by month
        const trends = await Lead.aggregate([
            {
                $match: {
                    firmId: new mongoose.Types.ObjectId(firmId),
                    status: { $in: ['won', 'converted', 'lost'] },
                    updatedAt: {
                        $gte: new Date(now.getFullYear(), now.getMonth() - months, 1)
                    }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$updatedAt' },
                        month: { $month: '$updatedAt' }
                    },
                    won: {
                        $sum: {
                            $cond: [{ $in: ['$status', ['won', 'converted']] }, 1, 0]
                        }
                    },
                    lost: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'lost'] }, 1, 0]
                        }
                    },
                    wonValue: {
                        $sum: {
                            $cond: [
                                { $in: ['$status', ['won', 'converted']] },
                                { $ifNull: ['$estimatedValue', 0] },
                                0
                            ]
                        }
                    },
                    lostValue: {
                        $sum: {
                            $cond: [
                                { $eq: ['$status', 'lost'] },
                                { $ifNull: ['$estimatedValue', 0] },
                                0
                            ]
                        }
                    }
                }
            },
            {
                $project: {
                    period: {
                        $concat: [
                            { $toString: '$_id.year' },
                            '-',
                            {
                                $cond: [
                                    { $lt: ['$_id.month', 10] },
                                    { $concat: ['0', { $toString: '$_id.month' }] },
                                    { $toString: '$_id.month' }
                                ]
                            }
                        ]
                    },
                    won: 1,
                    lost: 1,
                    total: { $add: ['$won', '$lost'] },
                    winRate: {
                        $cond: [
                            { $eq: [{ $add: ['$won', '$lost'] }, 0] },
                            0,
                            {
                                $multiply: [
                                    { $divide: ['$won', { $add: ['$won', '$lost'] }] },
                                    100
                                ]
                            }
                        ]
                    },
                    wonValue: 1,
                    lostValue: 1
                }
            },
            { $sort: { period: 1 } }
        ]);

        // Calculate trend direction
        const trendData = trends.map((t, i) => ({
            ...t,
            winRate: Math.round(t.winRate),
            trend: i > 0 ? (t.winRate > trends[i - 1].winRate ? 'up' : t.winRate < trends[i - 1].winRate ? 'down' : 'stable') : 'stable'
        }));

        // Calculate overall trend
        let overallTrend = 'stable';
        if (trendData.length >= 2) {
            const firstHalf = trendData.slice(0, Math.floor(trendData.length / 2));
            const secondHalf = trendData.slice(Math.floor(trendData.length / 2));
            const firstAvg = firstHalf.reduce((sum, t) => sum + t.winRate, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((sum, t) => sum + t.winRate, 0) / secondHalf.length;
            overallTrend = secondAvg > firstAvg ? 'improving' : secondAvg < firstAvg ? 'declining' : 'stable';
        }

        return {
            trends: trendData,
            overallTrend,
            avgWinRate: trendData.length > 0
                ? Math.round(trendData.reduce((sum, t) => sum + t.winRate, 0) / trendData.length)
                : 0
        };
    }

    /**
     * Get forecast by category (commit, best case, pipeline)
     */
    async getForecastByCategory(firmId, options = {}) {
        const { quarter, year = new Date().getFullYear() } = options;

        // Calculate quarter dates
        const quarterStartMonth = quarter ? (quarter - 1) * 3 : new Date().getMonth();
        const startDate = new Date(year, quarterStartMonth, 1);
        const endDate = new Date(year, quarterStartMonth + 3, 0);

        const leads = await Lead.aggregate([
            {
                $match: {
                    firmId: new mongoose.Types.ObjectId(firmId),
                    status: { $nin: ['lost', 'archived'] },
                    expectedCloseDate: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $lookup: {
                    from: 'pipelinestages',
                    localField: 'pipelineStageId',
                    foreignField: '_id',
                    as: 'stage'
                }
            },
            { $unwind: { path: '$stage', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    effectiveProbability: { $ifNull: ['$probability', '$stage.probability', 0] },
                    forecastCategory: {
                        $switch: {
                            branches: [
                                {
                                    case: { $in: ['$status', ['won', 'converted']] },
                                    then: 'closed'
                                },
                                {
                                    case: { $gte: [{ $ifNull: ['$probability', '$stage.probability', 0] }, 90] },
                                    then: 'commit'
                                },
                                {
                                    case: { $gte: [{ $ifNull: ['$probability', '$stage.probability', 0] }, 70] },
                                    then: 'best_case'
                                }
                            ],
                            default: 'pipeline'
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$forecastCategory',
                    count: { $sum: 1 },
                    value: { $sum: '$estimatedValue' },
                    weighted: {
                        $sum: {
                            $multiply: ['$estimatedValue', { $divide: ['$effectiveProbability', 100] }]
                        }
                    }
                }
            }
        ]);

        const categories = {
            closed: { count: 0, value: 0, weighted: 0 },
            commit: { count: 0, value: 0, weighted: 0 },
            best_case: { count: 0, value: 0, weighted: 0 },
            pipeline: { count: 0, value: 0, weighted: 0 }
        };

        for (const cat of leads) {
            if (categories[cat._id]) {
                categories[cat._id] = {
                    count: cat.count,
                    value: cat.value,
                    weighted: cat.weighted
                };
            }
        }

        return {
            period: quarter ? `Q${quarter} ${year}` : `Current Quarter`,
            startDate,
            endDate,
            categories,
            totals: {
                count: Object.values(categories).reduce((sum, c) => sum + c.count, 0),
                value: Object.values(categories).reduce((sum, c) => sum + c.value, 0),
                weighted: Object.values(categories).reduce((sum, c) => sum + c.weighted, 0)
            },
            currency: 'SAR'
        };
    }

    /**
     * Compare forecast to quota
     */
    async compareForecastToQuota(firmId, userId, options = {}) {
        const SalesQuota = require('../models/salesQuota.model');

        // Get current quota
        const quota = await SalesQuota.getCurrentQuota(userId, firmId);

        if (!quota) {
            return { hasQuota: false, message: 'No active quota found' };
        }

        // Get forecast for quota period
        const forecast = await this.getForecast(firmId, {
            startDate: quota.startDate,
            endDate: quota.endDate,
            assignedTo: userId
        });

        return {
            hasQuota: true,
            quota: {
                target: quota.target,
                achieved: quota.achieved,
                remaining: quota.remaining,
                progressPercentage: quota.progressPercentage,
                daysRemaining: quota.daysRemaining
            },
            forecast: {
                weighted: forecast.summary.totalWeighted,
                expected: forecast.summary.totalExpected,
                bestCase: forecast.summary.totalBestCase,
                pipelineCount: forecast.summary.totalLeads
            },
            analysis: {
                forecastVsTarget: Math.round((forecast.summary.totalWeighted / quota.target) * 100),
                gapToTarget: quota.remaining - forecast.summary.totalWeighted,
                onTrack: forecast.summary.totalWeighted >= quota.remaining,
                dailyRequired: quota.dailyTargetRequired
            },
            currency: 'SAR'
        };
    }
}

module.exports = new RevenueForecastService();
