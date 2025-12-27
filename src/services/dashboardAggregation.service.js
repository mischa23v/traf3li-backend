const mongoose = require('mongoose');
const Lead = require('../models/lead.model');
const Client = require('../models/client.model');
const Quote = require('../models/quote.model');
const CrmActivity = require('../models/crmActivity.model');
const logger = require('../utils/logger');

/**
 * Dashboard Aggregation Service
 * Provides real-time metrics and analytics for CRM dashboards
 */
class DashboardAggregationService {
    /**
     * Get main dashboard metrics
     * @param {ObjectId} firmId - Firm ID for multi-tenancy
     * @param {Object} options - Date range and filter options
     */
    async getDashboardMetrics(firmId, options = {}) {
        const { startDate, endDate, userId, teamId, territoryId } = options;

        const dateFilter = this.buildDateFilter(startDate, endDate);
        const baseQuery = { firmId: new mongoose.Types.ObjectId(firmId), ...dateFilter };

        if (userId) baseQuery.assignedTo = new mongoose.Types.ObjectId(userId);
        if (teamId) baseQuery.salesTeamId = new mongoose.Types.ObjectId(teamId);
        if (territoryId) baseQuery.territoryId = new mongoose.Types.ObjectId(territoryId);

        const [
            leadMetrics,
            pipelineMetrics,
            quoteMetrics,
            activityMetrics,
            conversionMetrics
        ] = await Promise.all([
            this.getLeadMetrics(baseQuery),
            this.getPipelineMetrics(baseQuery),
            this.getQuoteMetrics(baseQuery),
            this.getActivityMetrics(baseQuery),
            this.getConversionMetrics(baseQuery)
        ]);

        return {
            leads: leadMetrics,
            pipeline: pipelineMetrics,
            quotes: quoteMetrics,
            activities: activityMetrics,
            conversion: conversionMetrics,
            generatedAt: new Date()
        };
    }

    /**
     * Get lead-specific metrics
     */
    async getLeadMetrics(baseQuery) {
        const [total, byStatus, bySource, recentLeads] = await Promise.all([
            Lead.countDocuments(baseQuery),
            Lead.aggregate([
                { $match: baseQuery },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            Lead.aggregate([
                { $match: baseQuery },
                { $group: { _id: '$source.type', count: { $sum: 1 } } }
            ]),
            Lead.find(baseQuery)
                .sort({ createdAt: -1 })
                .limit(5)
                .select('leadId firstName lastName companyName status createdAt')
                .lean()
        ]);

        const statusMap = {};
        byStatus.forEach(s => { statusMap[s._id] = s.count; });

        const sourceMap = {};
        bySource.forEach(s => { sourceMap[s._id || 'unknown'] = s.count; });

        return {
            total,
            new: statusMap.new || 0,
            contacted: statusMap.contacted || 0,
            qualified: statusMap.qualified || 0,
            won: statusMap.won || 0,
            lost: statusMap.lost || 0,
            bySource: sourceMap,
            recent: recentLeads
        };
    }

    /**
     * Get pipeline metrics
     */
    async getPipelineMetrics(baseQuery) {
        const pipelineQuery = { ...baseQuery, status: { $nin: ['won', 'lost'] } };

        const [totalValue, byStage, weightedValue, avgDealSize] = await Promise.all([
            Lead.aggregate([
                { $match: pipelineQuery },
                { $group: { _id: null, total: { $sum: '$estimatedValue' } } }
            ]),
            Lead.aggregate([
                { $match: pipelineQuery },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        value: { $sum: '$estimatedValue' }
                    }
                }
            ]),
            Lead.aggregate([
                { $match: pipelineQuery },
                {
                    $group: {
                        _id: null,
                        weighted: { $sum: { $multiply: ['$estimatedValue', { $divide: ['$probability', 100] }] } }
                    }
                }
            ]),
            Lead.aggregate([
                { $match: { ...baseQuery, status: 'won' } },
                { $group: { _id: null, avg: { $avg: '$estimatedValue' } } }
            ])
        ]);

        return {
            totalValue: totalValue[0]?.total || 0,
            weightedValue: weightedValue[0]?.weighted || 0,
            avgDealSize: avgDealSize[0]?.avg || 0,
            byStage: byStage.map(s => ({
                stage: s._id,
                count: s.count,
                value: s.value
            }))
        };
    }

    /**
     * Get quote metrics
     */
    async getQuoteMetrics(baseQuery) {
        // Adjust query for Quote model
        const quoteQuery = {
            firmId: baseQuery.firmId,
            createdAt: baseQuery.createdAt
        };

        const [total, byStatus, totalValue, acceptedValue] = await Promise.all([
            Quote.countDocuments(quoteQuery),
            Quote.aggregate([
                { $match: quoteQuery },
                { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$grandTotal' } } }
            ]),
            Quote.aggregate([
                { $match: quoteQuery },
                { $group: { _id: null, total: { $sum: '$grandTotal' } } }
            ]),
            Quote.aggregate([
                { $match: { ...quoteQuery, status: 'accepted' } },
                { $group: { _id: null, total: { $sum: '$grandTotal' } } }
            ])
        ]);

        const statusMap = {};
        byStatus.forEach(s => { statusMap[s._id] = { count: s.count, value: s.value }; });

        return {
            total,
            totalValue: totalValue[0]?.total || 0,
            acceptedValue: acceptedValue[0]?.total || 0,
            acceptanceRate: total > 0 ? ((statusMap.accepted?.count || 0) / total * 100).toFixed(1) : 0,
            byStatus: statusMap
        };
    }

    /**
     * Get activity metrics
     */
    async getActivityMetrics(baseQuery) {
        const activityQuery = {
            firmId: baseQuery.firmId,
            createdAt: baseQuery.createdAt
        };

        const [total, byType, completed, overdue, todayDue] = await Promise.all([
            CrmActivity.countDocuments(activityQuery),
            CrmActivity.aggregate([
                { $match: activityQuery },
                { $group: { _id: '$type', count: { $sum: 1 } } }
            ]),
            CrmActivity.countDocuments({ ...activityQuery, status: 'completed' }),
            CrmActivity.countDocuments({
                ...activityQuery,
                status: { $ne: 'completed' },
                dueDate: { $lt: new Date() }
            }),
            CrmActivity.countDocuments({
                ...activityQuery,
                status: { $ne: 'completed' },
                dueDate: {
                    $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    $lt: new Date(new Date().setHours(23, 59, 59, 999))
                }
            })
        ]);

        const typeMap = {};
        byType.forEach(t => { typeMap[t._id] = t.count; });

        return {
            total,
            completed,
            completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0,
            overdue,
            dueToday: todayDue,
            byType: typeMap
        };
    }

    /**
     * Get conversion metrics
     */
    async getConversionMetrics(baseQuery) {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

        const periodQuery = {
            ...baseQuery,
            createdAt: { $gte: thirtyDaysAgo }
        };

        const [totalLeads, convertedLeads, avgCycleTime] = await Promise.all([
            Lead.countDocuments(periodQuery),
            Lead.countDocuments({ ...periodQuery, convertedToClient: true }),
            Lead.aggregate([
                { $match: { ...periodQuery, status: 'won', actualCloseDate: { $exists: true } } },
                {
                    $project: {
                        cycleTime: {
                            $divide: [
                                { $subtract: ['$actualCloseDate', '$createdAt'] },
                                1000 * 60 * 60 * 24 // Convert to days
                            ]
                        }
                    }
                },
                { $group: { _id: null, avg: { $avg: '$cycleTime' } } }
            ])
        ]);

        return {
            totalLeads,
            converted: convertedLeads,
            conversionRate: totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0,
            avgSalesCycleDays: Math.round(avgCycleTime[0]?.avg || 0)
        };
    }

    /**
     * Get sales funnel data
     */
    async getSalesFunnel(firmId, options = {}) {
        const dateFilter = this.buildDateFilter(options.startDate, options.endDate);
        const baseQuery = { firmId: new mongoose.Types.ObjectId(firmId), ...dateFilter };

        const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won'];

        const funnel = await Lead.aggregate([
            { $match: baseQuery },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    value: { $sum: '$estimatedValue' }
                }
            }
        ]);

        const funnelMap = {};
        funnel.forEach(f => { funnelMap[f._id] = f; });

        // Calculate conversion rates between stages
        const result = stages.map((stage, index) => {
            const current = funnelMap[stage] || { count: 0, value: 0 };
            const previous = index > 0 ? (funnelMap[stages[index - 1]] || { count: 0 }) : { count: current.count };

            return {
                stage,
                count: current.count,
                value: current.value,
                conversionFromPrevious: previous.count > 0
                    ? ((current.count / previous.count) * 100).toFixed(1)
                    : 0
            };
        });

        return result;
    }

    /**
     * Get team performance metrics
     */
    async getTeamPerformance(firmId, options = {}) {
        const dateFilter = this.buildDateFilter(options.startDate, options.endDate);
        const baseQuery = { firmId: new mongoose.Types.ObjectId(firmId), ...dateFilter };

        const performance = await Lead.aggregate([
            { $match: baseQuery },
            {
                $group: {
                    _id: '$assignedTo',
                    totalLeads: { $sum: 1 },
                    wonDeals: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
                    lostDeals: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } },
                    totalValue: { $sum: '$estimatedValue' },
                    wonValue: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, '$estimatedValue', 0] } }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    userId: '$_id',
                    userName: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
                    totalLeads: 1,
                    wonDeals: 1,
                    lostDeals: 1,
                    totalValue: 1,
                    wonValue: 1,
                    winRate: {
                        $cond: [
                            { $gt: [{ $add: ['$wonDeals', '$lostDeals'] }, 0] },
                            { $multiply: [{ $divide: ['$wonDeals', { $add: ['$wonDeals', '$lostDeals'] }] }, 100] },
                            0
                        ]
                    }
                }
            },
            { $sort: { wonValue: -1 } }
        ]);

        return performance;
    }

    /**
     * Get lead source analysis
     */
    async getLeadSourceAnalysis(firmId, options = {}) {
        const dateFilter = this.buildDateFilter(options.startDate, options.endDate);
        const baseQuery = { firmId: new mongoose.Types.ObjectId(firmId), ...dateFilter };

        const analysis = await Lead.aggregate([
            { $match: baseQuery },
            {
                $group: {
                    _id: '$source.type',
                    totalLeads: { $sum: 1 },
                    converted: { $sum: { $cond: ['$convertedToClient', 1, 0] } },
                    won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
                    totalValue: { $sum: '$estimatedValue' },
                    wonValue: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, '$estimatedValue', 0] } }
                }
            },
            {
                $project: {
                    source: '$_id',
                    totalLeads: 1,
                    converted: 1,
                    won: 1,
                    totalValue: 1,
                    wonValue: 1,
                    conversionRate: {
                        $cond: [
                            { $gt: ['$totalLeads', 0] },
                            { $multiply: [{ $divide: ['$converted', '$totalLeads'] }, 100] },
                            0
                        ]
                    },
                    avgDealValue: {
                        $cond: [
                            { $gt: ['$won', 0] },
                            { $divide: ['$wonValue', '$won'] },
                            0
                        ]
                    }
                }
            },
            { $sort: { totalLeads: -1 } }
        ]);

        return analysis;
    }

    /**
     * Get win/loss analysis
     */
    async getWinLossAnalysis(firmId, options = {}) {
        const dateFilter = this.buildDateFilter(options.startDate, options.endDate);
        const baseQuery = {
            firmId: new mongoose.Types.ObjectId(firmId),
            status: { $in: ['won', 'lost'] },
            ...dateFilter
        };

        const [overview, lostReasons, byCompetitor] = await Promise.all([
            Lead.aggregate([
                { $match: baseQuery },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        value: { $sum: '$estimatedValue' }
                    }
                }
            ]),
            Lead.aggregate([
                { $match: { ...baseQuery, status: 'lost' } },
                { $group: { _id: '$lostReason', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            Lead.aggregate([
                { $match: { ...baseQuery, lostToCompetitor: { $exists: true, $ne: '' } } },
                { $group: { _id: '$lostToCompetitor', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ])
        ]);

        const overviewMap = {};
        overview.forEach(o => { overviewMap[o._id] = o; });

        const won = overviewMap.won || { count: 0, value: 0 };
        const lost = overviewMap.lost || { count: 0, value: 0 };

        return {
            won: won.count,
            lost: lost.count,
            winRate: (won.count + lost.count) > 0
                ? ((won.count / (won.count + lost.count)) * 100).toFixed(1)
                : 0,
            wonValue: won.value,
            lostValue: lost.value,
            lostReasons: lostReasons.map(r => ({ reason: r._id || 'unspecified', count: r.count })),
            topCompetitors: byCompetitor.map(c => ({ competitor: c._id, losses: c.count }))
        };
    }

    /**
     * Build date filter
     */
    buildDateFilter(startDate, endDate) {
        const filter = {};

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        return filter;
    }
}

module.exports = new DashboardAggregationService();
