/**
 * CRM Dashboard Service
 *
 * Aggregated dashboard endpoints for CRM module
 * Single API calls replace 10+ individual calls
 *
 * Supports tiered views:
 * - Basic: Essential metrics for solo lawyers/simple use
 * - Advanced: Full analytics for power users
 *
 * Backend does 90% of work - frontend just displays
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

class CrmDashboardService {
    // ═══════════════════════════════════════════════════════════
    // BASIC VIEW - Essential metrics
    // ═══════════════════════════════════════════════════════════

    /**
     * Get basic dashboard data (single call)
     * @param {object} firmQuery - Firm query for isolation
     * @param {object} options - Options
     * @returns {object} - Basic dashboard data
     */
    static async getBasicDashboard(firmQuery, options = {}) {
        const { period = 'month' } = options;
        const dateRange = this.getDateRange(period);

        const [
            heroStats,
            recentLeads,
            todayTasks,
            upcomingFollowUps
        ] = await Promise.all([
            this.getHeroStats(firmQuery, dateRange),
            this.getRecentLeads(firmQuery, 5),
            this.getTodayTasks(firmQuery),
            this.getUpcomingFollowUps(firmQuery, 5)
        ]);

        return {
            viewMode: 'basic',
            period,
            dateRange,
            heroStats,
            recentLeads,
            todayTasks,
            upcomingFollowUps,
            generatedAt: new Date()
        };
    }

    // ═══════════════════════════════════════════════════════════
    // ADVANCED VIEW - Full analytics
    // ═══════════════════════════════════════════════════════════

    /**
     * Get advanced dashboard data (single call)
     * @param {object} firmQuery - Firm query
     * @param {object} options - Options
     * @returns {object} - Advanced dashboard data
     */
    static async getAdvancedDashboard(firmQuery, options = {}) {
        const { period = 'month' } = options;
        const dateRange = this.getDateRange(period);

        const [
            heroStats,
            pipelineBreakdown,
            leadScoring,
            conversionMetrics,
            activityAnalytics,
            sourceAnalytics,
            performanceByRep,
            trends,
            recentActivity
        ] = await Promise.all([
            this.getHeroStats(firmQuery, dateRange),
            this.getPipelineBreakdown(firmQuery),
            this.getLeadScoringMetrics(firmQuery),
            this.getConversionMetrics(firmQuery, dateRange),
            this.getActivityAnalytics(firmQuery, dateRange),
            this.getSourceAnalytics(firmQuery, dateRange),
            this.getPerformanceByRep(firmQuery, dateRange),
            this.getTrends(firmQuery, 8),
            this.getRecentActivity(firmQuery, 10)
        ]);

        return {
            viewMode: 'advanced',
            period,
            dateRange,
            heroStats,
            pipelineBreakdown,
            leadScoring,
            conversionMetrics,
            activityAnalytics,
            sourceAnalytics,
            performanceByRep,
            trends,
            recentActivity,
            generatedAt: new Date()
        };
    }

    // ═══════════════════════════════════════════════════════════
    // HERO STATS
    // ═══════════════════════════════════════════════════════════

    /**
     * Get hero stats (top-line metrics)
     */
    static async getHeroStats(firmQuery, dateRange) {
        const Lead = mongoose.model('Lead');

        const [currentStats, previousStats, activeStats] = await Promise.all([
            // Current period leads
            Lead.aggregate([
                {
                    $match: {
                        ...firmQuery,
                        createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalLeads: { $sum: 1 },
                        totalValue: { $sum: { $ifNull: ['$estimatedValue', 0] } },
                        avgScore: { $avg: { $ifNull: ['$leadScore', 0] } },
                        won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
                        lost: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } }
                    }
                }
            ]),

            // Previous period leads
            Lead.aggregate([
                {
                    $match: {
                        ...firmQuery,
                        createdAt: { $gte: dateRange.previousStartDate, $lte: dateRange.previousEndDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalLeads: { $sum: 1 },
                        won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } }
                    }
                }
            ]),

            // Active leads (in pipeline)
            Lead.aggregate([
                {
                    $match: {
                        ...firmQuery,
                        status: { $nin: ['won', 'lost'] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        active: { $sum: 1 },
                        activeValue: { $sum: { $ifNull: ['$estimatedValue', 0] } },
                        hot: { $sum: { $cond: [{ $gte: ['$leadScore', 100] }, 1, 0] } },
                        warm: { $sum: { $cond: [{ $and: [{ $gte: ['$leadScore', 60] }, { $lt: ['$leadScore', 100] }] }, 1, 0] } },
                        cold: { $sum: { $cond: [{ $lt: ['$leadScore', 60] }, 1, 0] } }
                    }
                }
            ])
        ]);

        const current = currentStats[0] || { totalLeads: 0, totalValue: 0, avgScore: 0, won: 0, lost: 0 };
        const previous = previousStats[0] || { totalLeads: 0, won: 0 };
        const active = activeStats[0] || { active: 0, activeValue: 0, hot: 0, warm: 0, cold: 0 };

        // Calculate changes
        const leadsChange = previous.totalLeads > 0
            ? Math.round(((current.totalLeads - previous.totalLeads) / previous.totalLeads) * 100)
            : 0;

        const winRate = (current.won + current.lost) > 0
            ? Math.round((current.won / (current.won + current.lost)) * 100)
            : 0;

        return {
            newLeads: {
                count: current.totalLeads,
                change: leadsChange,
                trend: leadsChange > 0 ? 'up' : leadsChange < 0 ? 'down' : 'stable'
            },
            activePipeline: {
                count: active.active,
                value: Math.round(active.activeValue),
                hot: active.hot,
                warm: active.warm,
                cold: active.cold
            },
            conversions: {
                won: current.won,
                lost: current.lost,
                winRate
            },
            performance: {
                avgScore: Math.round(current.avgScore),
                totalValue: Math.round(current.totalValue)
            }
        };
    }

    // ═══════════════════════════════════════════════════════════
    // PIPELINE BREAKDOWN
    // ═══════════════════════════════════════════════════════════

    /**
     * Get pipeline breakdown by stage
     */
    static async getPipelineBreakdown(firmQuery) {
        const Lead = mongoose.model('Lead');

        const breakdown = await Lead.aggregate([
            {
                $match: {
                    ...firmQuery,
                    status: { $nin: ['won', 'lost'] }
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    value: { $sum: { $ifNull: ['$estimatedValue', 0] } },
                    avgScore: { $avg: { $ifNull: ['$leadScore', 0] } },
                    avgDaysInStage: { $avg: { $ifNull: ['$metrics.daysInCurrentStage', 0] } }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const total = breakdown.reduce((sum, s) => sum + s.count, 0);
        const totalValue = breakdown.reduce((sum, s) => sum + s.value, 0);

        // Stage order for proper display
        const stageOrder = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'dormant'];

        return {
            stages: stageOrder.map(stage => {
                const data = breakdown.find(b => b._id === stage) || {
                    _id: stage, count: 0, value: 0, avgScore: 0, avgDaysInStage: 0
                };
                return {
                    stage: data._id,
                    count: data.count,
                    percentage: total > 0 ? Math.round((data.count / total) * 100) : 0,
                    value: Math.round(data.value),
                    valuePercentage: totalValue > 0 ? Math.round((data.value / totalValue) * 100) : 0,
                    avgScore: Math.round(data.avgScore),
                    avgDaysInStage: Math.round(data.avgDaysInStage)
                };
            }),
            totals: {
                count: total,
                value: Math.round(totalValue)
            }
        };
    }

    // ═══════════════════════════════════════════════════════════
    // LEAD SCORING METRICS
    // ═══════════════════════════════════════════════════════════

    /**
     * Get lead scoring metrics
     */
    static async getLeadScoringMetrics(firmQuery) {
        const Lead = mongoose.model('Lead');

        const scoring = await Lead.aggregate([
            {
                $match: {
                    ...firmQuery,
                    status: { $nin: ['won', 'lost'] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalLeads: { $sum: 1 },
                    avgScore: { $avg: { $ifNull: ['$leadScore', 0] } },
                    maxScore: { $max: { $ifNull: ['$leadScore', 0] } },
                    minScore: { $min: { $ifNull: ['$leadScore', 0] } },
                    hot: { $sum: { $cond: [{ $gte: ['$leadScore', 100] }, 1, 0] } },
                    warm: { $sum: { $cond: [{ $and: [{ $gte: ['$leadScore', 60] }, { $lt: ['$leadScore', 100] }] }, 1, 0] } },
                    cold: { $sum: { $cond: [{ $and: [{ $gte: ['$leadScore', 30] }, { $lt: ['$leadScore', 60] }] }, 1, 0] } },
                    ice: { $sum: { $cond: [{ $lt: ['$leadScore', 30] }, 1, 0] } }
                }
            }
        ]);

        const data = scoring[0] || {
            totalLeads: 0, avgScore: 0, maxScore: 0, minScore: 0,
            hot: 0, warm: 0, cold: 0, ice: 0
        };

        return {
            avgScore: Math.round(data.avgScore),
            maxScore: data.maxScore,
            minScore: data.minScore,
            distribution: {
                hot: { count: data.hot, percentage: data.totalLeads > 0 ? Math.round((data.hot / data.totalLeads) * 100) : 0 },
                warm: { count: data.warm, percentage: data.totalLeads > 0 ? Math.round((data.warm / data.totalLeads) * 100) : 0 },
                cold: { count: data.cold, percentage: data.totalLeads > 0 ? Math.round((data.cold / data.totalLeads) * 100) : 0 },
                ice: { count: data.ice, percentage: data.totalLeads > 0 ? Math.round((data.ice / data.totalLeads) * 100) : 0 }
            },
            totalLeads: data.totalLeads
        };
    }

    // ═══════════════════════════════════════════════════════════
    // CONVERSION METRICS
    // ═══════════════════════════════════════════════════════════

    /**
     * Get conversion metrics
     */
    static async getConversionMetrics(firmQuery, dateRange) {
        const Lead = mongoose.model('Lead');

        const [created, converted, lost] = await Promise.all([
            Lead.countDocuments({
                ...firmQuery,
                createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
            }),
            Lead.countDocuments({
                ...firmQuery,
                status: 'won',
                convertedAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
            }),
            Lead.countDocuments({
                ...firmQuery,
                status: 'lost',
                lostAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
            })
        ]);

        const avgConversionTime = await Lead.aggregate([
            {
                $match: {
                    ...firmQuery,
                    status: 'won',
                    convertedAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
                }
            },
            {
                $project: {
                    conversionDays: {
                        $divide: [
                            { $subtract: ['$convertedAt', '$createdAt'] },
                            1000 * 60 * 60 * 24
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    avgDays: { $avg: '$conversionDays' }
                }
            }
        ]);

        return {
            created,
            converted,
            lost,
            conversionRate: (converted + lost) > 0 ? Math.round((converted / (converted + lost)) * 100) : 0,
            avgConversionDays: Math.round(avgConversionTime[0]?.avgDays || 0),
            funnel: [
                { stage: 'Created', count: created, rate: 100 },
                { stage: 'Qualified', count: Math.round(created * 0.6), rate: 60 }, // Estimate
                { stage: 'Proposal', count: Math.round(created * 0.4), rate: 40 },
                { stage: 'Converted', count: converted, rate: created > 0 ? Math.round((converted / created) * 100) : 0 }
            ]
        };
    }

    // ═══════════════════════════════════════════════════════════
    // ACTIVITY ANALYTICS
    // ═══════════════════════════════════════════════════════════

    /**
     * Get activity analytics
     */
    static async getActivityAnalytics(firmQuery, dateRange) {
        const CrmActivity = mongoose.model('CrmActivity');

        const activities = await CrmActivity.aggregate([
            {
                $match: {
                    ...firmQuery,
                    createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
                }
            },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            }
        ]);

        const activityMap = {};
        activities.forEach(a => { activityMap[a._id] = a.count; });

        const total = activities.reduce((sum, a) => sum + a.count, 0);

        return {
            total,
            byType: {
                calls: activityMap.call || 0,
                emails: activityMap.email || 0,
                meetings: activityMap.meeting || 0,
                whatsapp: activityMap.whatsapp || 0,
                notes: activityMap.note || 0,
                tasks: activityMap.task || 0
            },
            avgPerDay: Math.round(total / Math.max(1, Math.ceil((dateRange.endDate - dateRange.startDate) / (1000 * 60 * 60 * 24))))
        };
    }

    // ═══════════════════════════════════════════════════════════
    // SOURCE ANALYTICS
    // ═══════════════════════════════════════════════════════════

    /**
     * Get lead source analytics
     */
    static async getSourceAnalytics(firmQuery, dateRange) {
        const Lead = mongoose.model('Lead');

        const sources = await Lead.aggregate([
            {
                $match: {
                    ...firmQuery,
                    createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
                }
            },
            {
                $group: {
                    _id: '$source',
                    count: { $sum: 1 },
                    value: { $sum: { $ifNull: ['$estimatedValue', 0] } },
                    converted: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const total = sources.reduce((sum, s) => sum + s.count, 0);

        return sources.map(s => ({
            source: s._id || 'Unknown',
            count: s.count,
            percentage: total > 0 ? Math.round((s.count / total) * 100) : 0,
            value: Math.round(s.value),
            converted: s.converted,
            conversionRate: s.count > 0 ? Math.round((s.converted / s.count) * 100) : 0
        }));
    }

    // ═══════════════════════════════════════════════════════════
    // PERFORMANCE BY REP
    // ═══════════════════════════════════════════════════════════

    /**
     * Get performance by rep
     */
    static async getPerformanceByRep(firmQuery, dateRange) {
        const Lead = mongoose.model('Lead');

        const performance = await Lead.aggregate([
            {
                $match: {
                    ...firmQuery,
                    createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate },
                    assignedTo: { $exists: true }
                }
            },
            {
                $group: {
                    _id: '$assignedTo',
                    leads: { $sum: 1 },
                    value: { $sum: { $ifNull: ['$estimatedValue', 0] } },
                    won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
                    lost: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } }
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
            { $sort: { leads: -1 } },
            { $limit: 10 }
        ]);

        return performance.map(p => ({
            userId: p._id,
            name: p.user ? `${p.user.firstName || ''} ${p.user.lastName || ''}`.trim() : 'Unassigned',
            leads: p.leads,
            value: Math.round(p.value),
            won: p.won,
            winRate: (p.won + p.lost) > 0 ? Math.round((p.won / (p.won + p.lost)) * 100) : 0
        }));
    }

    // ═══════════════════════════════════════════════════════════
    // TRENDS
    // ═══════════════════════════════════════════════════════════

    /**
     * Get trends over time
     */
    static async getTrends(firmQuery, weeks = 8) {
        const Lead = mongoose.model('Lead');
        const now = new Date();
        const trends = [];

        for (let i = weeks - 1; i >= 0; i--) {
            const weekEnd = new Date(now - i * 7 * 24 * 60 * 60 * 1000);
            const weekStart = new Date(weekEnd - 7 * 24 * 60 * 60 * 1000);

            const [created, won] = await Promise.all([
                Lead.countDocuments({
                    ...firmQuery,
                    createdAt: { $gte: weekStart, $lt: weekEnd }
                }),
                Lead.countDocuments({
                    ...firmQuery,
                    status: 'won',
                    convertedAt: { $gte: weekStart, $lt: weekEnd }
                })
            ]);

            trends.push({
                week: weekStart.toISOString().split('T')[0],
                created,
                won
            });
        }

        return trends;
    }

    // ═══════════════════════════════════════════════════════════
    // RECENT ITEMS
    // ═══════════════════════════════════════════════════════════

    /**
     * Get recent leads
     */
    static async getRecentLeads(firmQuery, limit = 5) {
        const Lead = mongoose.model('Lead');

        return Lead.find(firmQuery)
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('leadId firstName lastName companyName status leadScore source estimatedValue createdAt')
            .lean();
    }

    /**
     * Get today's tasks
     */
    static async getTodayTasks(firmQuery) {
        const Task = mongoose.model('Task');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const tasks = await Task.find({
            ...firmQuery,
            dueDate: { $gte: today, $lt: tomorrow },
            status: { $ne: 'completed' }
        })
        .sort({ dueDate: 1 })
        .limit(10)
        .select('title dueDate priority status entityType entityId')
        .lean();

        return {
            tasks,
            total: await Task.countDocuments({
                ...firmQuery,
                dueDate: { $gte: today, $lt: tomorrow },
                status: { $ne: 'completed' }
            })
        };
    }

    /**
     * Get upcoming follow-ups
     */
    static async getUpcomingFollowUps(firmQuery, limit = 5) {
        const Lead = mongoose.model('Lead');

        return Lead.find({
            ...firmQuery,
            status: { $nin: ['won', 'lost'] },
            nextFollowUpDate: { $gte: new Date() }
        })
        .sort({ nextFollowUpDate: 1 })
        .limit(limit)
        .select('leadId firstName lastName companyName nextFollowUpDate assignedTo')
        .populate('assignedTo', 'firstName lastName')
        .lean();
    }

    /**
     * Get recent activity
     */
    static async getRecentActivity(firmQuery, limit = 10) {
        const CrmActivity = mongoose.model('CrmActivity');

        return CrmActivity.find({
            ...firmQuery,
            entityType: 'lead'
        })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('type subject entityId createdAt createdBy')
        .populate('createdBy', 'firstName lastName')
        .lean();
    }

    // ═══════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════

    /**
     * Get date range based on period
     */
    static getDateRange(period) {
        const now = new Date();
        let startDate, endDate, previousStartDate, previousEndDate;

        switch (period) {
            case 'week':
                const weekStart = new Date(now);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                weekStart.setHours(0, 0, 0, 0);
                startDate = weekStart;
                endDate = now;
                previousStartDate = new Date(weekStart - 7 * 24 * 60 * 60 * 1000);
                previousEndDate = new Date(weekStart - 1);
                break;

            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = now;
                previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
                break;

            case 'quarter':
                const quarterStart = Math.floor(now.getMonth() / 3) * 3;
                startDate = new Date(now.getFullYear(), quarterStart, 1);
                endDate = now;
                previousStartDate = new Date(now.getFullYear(), quarterStart - 3, 1);
                previousEndDate = new Date(now.getFullYear(), quarterStart, 0);
                break;

            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = now;
                previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
                previousEndDate = new Date(now.getFullYear() - 1, 11, 31);
                break;

            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = now;
                previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
        }

        return { startDate, endDate, previousStartDate, previousEndDate };
    }
}

module.exports = CrmDashboardService;
