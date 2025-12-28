/**
 * Pipeline Metrics Service
 *
 * Server-side pipeline analytics with:
 * - Stage breakdown and distribution
 * - Velocity calculations
 * - Conversion rates
 * - Funnel analysis
 * - Time-in-stage tracking
 *
 * Backend does 90% of work - frontend just displays
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

class PipelineMetricsService {
    // ═══════════════════════════════════════════════════════════
    // STAGE BREAKDOWN
    // ═══════════════════════════════════════════════════════════

    /**
     * Get pipeline stage breakdown
     * @param {object} firmQuery - Firm query for isolation
     * @param {object} dateRange - Date range filter
     * @returns {object} - Stage breakdown
     */
    static async getStageBreakdown(firmQuery, dateRange = {}) {
        const Lead = mongoose.model('Lead');

        const matchQuery = { ...firmQuery };
        if (dateRange.startDate) {
            matchQuery.createdAt = { $gte: new Date(dateRange.startDate) };
        }
        if (dateRange.endDate) {
            matchQuery.createdAt = { ...matchQuery.createdAt, $lte: new Date(dateRange.endDate) };
        }

        const breakdown = await Lead.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalValue: { $sum: { $ifNull: ['$estimatedValue', 0] } },
                    avgValue: { $avg: { $ifNull: ['$estimatedValue', 0] } },
                    avgScore: { $avg: { $ifNull: ['$leadScore', 0] } }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const total = breakdown.reduce((sum, stage) => sum + stage.count, 0);
        const totalValue = breakdown.reduce((sum, stage) => sum + stage.totalValue, 0);

        // Stage order for proper funnel display
        const stageOrder = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'dormant'];

        const stages = stageOrder.map(stageCode => {
            const stageData = breakdown.find(b => b._id === stageCode) || {
                _id: stageCode,
                count: 0,
                totalValue: 0,
                avgValue: 0,
                avgScore: 0
            };

            return {
                stage: stageCode,
                count: stageData.count,
                percentage: total > 0 ? Math.round((stageData.count / total) * 100) : 0,
                totalValue: Math.round(stageData.totalValue),
                avgValue: Math.round(stageData.avgValue),
                avgScore: Math.round(stageData.avgScore),
                valuePercentage: totalValue > 0 ? Math.round((stageData.totalValue / totalValue) * 100) : 0
            };
        });

        return {
            stages,
            summary: {
                totalLeads: total,
                totalValue: Math.round(totalValue),
                avgValue: total > 0 ? Math.round(totalValue / total) : 0,
                activeLeads: breakdown
                    .filter(b => !['won', 'lost', 'dormant'].includes(b._id))
                    .reduce((sum, b) => sum + b.count, 0)
            }
        };
    }

    // ═══════════════════════════════════════════════════════════
    // VELOCITY METRICS
    // ═══════════════════════════════════════════════════════════

    /**
     * Calculate pipeline velocity
     * @param {object} firmQuery - Firm query
     * @param {object} dateRange - Date range
     * @returns {object} - Velocity metrics
     */
    static async getVelocityMetrics(firmQuery, dateRange = {}) {
        const Lead = mongoose.model('Lead');

        const matchQuery = {
            ...firmQuery,
            convertedToClient: true,
            convertedAt: { $exists: true }
        };

        if (dateRange.startDate) {
            matchQuery.convertedAt = { ...matchQuery.convertedAt, $gte: new Date(dateRange.startDate) };
        }
        if (dateRange.endDate) {
            matchQuery.convertedAt = { ...matchQuery.convertedAt, $lte: new Date(dateRange.endDate) };
        }

        const wonLeads = await Lead.aggregate([
            { $match: matchQuery },
            {
                $project: {
                    estimatedValue: 1,
                    conversionTime: {
                        $divide: [
                            { $subtract: ['$convertedAt', '$createdAt'] },
                            1000 * 60 * 60 * 24 // Convert to days
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    totalValue: { $sum: { $ifNull: ['$estimatedValue', 0] } },
                    avgConversionTime: { $avg: '$conversionTime' },
                    minConversionTime: { $min: '$conversionTime' },
                    maxConversionTime: { $max: '$conversionTime' }
                }
            }
        ]);

        const result = wonLeads[0] || {
            count: 0,
            totalValue: 0,
            avgConversionTime: 0,
            minConversionTime: 0,
            maxConversionTime: 0
        };

        // Calculate velocity (value per day)
        const periodDays = dateRange.startDate && dateRange.endDate
            ? Math.ceil((new Date(dateRange.endDate) - new Date(dateRange.startDate)) / (1000 * 60 * 60 * 24))
            : 30;

        return {
            wonDeals: result.count,
            totalValue: Math.round(result.totalValue),
            avgDealSize: result.count > 0 ? Math.round(result.totalValue / result.count) : 0,
            avgConversionDays: Math.round(result.avgConversionTime),
            minConversionDays: Math.round(result.minConversionTime),
            maxConversionDays: Math.round(result.maxConversionTime),
            velocityPerDay: periodDays > 0 ? Math.round(result.totalValue / periodDays) : 0,
            velocityPerWeek: periodDays > 0 ? Math.round((result.totalValue / periodDays) * 7) : 0,
            dealsPerMonth: result.count > 0 && periodDays > 0 ? Math.round((result.count / periodDays) * 30) : 0
        };
    }

    // ═══════════════════════════════════════════════════════════
    // CONVERSION RATES
    // ═══════════════════════════════════════════════════════════

    /**
     * Calculate conversion rates between stages
     * @param {object} firmQuery - Firm query
     * @param {object} dateRange - Date range
     * @returns {object} - Conversion rates
     */
    static async getConversionRates(firmQuery, dateRange = {}) {
        const Lead = mongoose.model('Lead');

        const matchQuery = { ...firmQuery };
        if (dateRange.startDate) {
            matchQuery.createdAt = { $gte: new Date(dateRange.startDate) };
        }
        if (dateRange.endDate) {
            matchQuery.createdAt = { ...matchQuery.createdAt, $lte: new Date(dateRange.endDate) };
        }

        // Get counts for each stage transition
        const stageFlow = [
            { from: 'new', to: 'contacted' },
            { from: 'contacted', to: 'qualified' },
            { from: 'qualified', to: 'proposal' },
            { from: 'proposal', to: 'negotiation' },
            { from: 'negotiation', to: 'won' }
        ];

        const stageCounts = await Lead.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const countMap = {};
        stageCounts.forEach(s => { countMap[s._id] = s.count; });

        // Calculate overall metrics
        const totalCreated = Object.values(countMap).reduce((a, b) => a + b, 0);
        const totalWon = countMap['won'] || 0;
        const totalLost = countMap['lost'] || 0;

        // Calculate stage-to-stage conversions
        // This assumes leads that reached later stages also passed through earlier ones
        const reached = {
            new: totalCreated,
            contacted: (countMap['contacted'] || 0) + (countMap['qualified'] || 0) + (countMap['proposal'] || 0) + (countMap['negotiation'] || 0) + (countMap['won'] || 0),
            qualified: (countMap['qualified'] || 0) + (countMap['proposal'] || 0) + (countMap['negotiation'] || 0) + (countMap['won'] || 0),
            proposal: (countMap['proposal'] || 0) + (countMap['negotiation'] || 0) + (countMap['won'] || 0),
            negotiation: (countMap['negotiation'] || 0) + (countMap['won'] || 0),
            won: countMap['won'] || 0
        };

        const conversions = stageFlow.map(flow => ({
            from: flow.from,
            to: flow.to,
            fromCount: reached[flow.from],
            toCount: reached[flow.to],
            rate: reached[flow.from] > 0 ? Math.round((reached[flow.to] / reached[flow.from]) * 100) : 0
        }));

        return {
            conversions,
            overall: {
                created: totalCreated,
                won: totalWon,
                lost: totalLost,
                winRate: totalCreated > 0 ? Math.round((totalWon / totalCreated) * 100) : 0,
                lossRate: totalCreated > 0 ? Math.round((totalLost / totalCreated) * 100) : 0,
                closeRate: (totalWon + totalLost) > 0 ? Math.round((totalWon / (totalWon + totalLost)) * 100) : 0
            },
            funnel: Object.entries(reached).map(([stage, count]) => ({
                stage,
                count,
                percentage: totalCreated > 0 ? Math.round((count / totalCreated) * 100) : 0
            }))
        };
    }

    // ═══════════════════════════════════════════════════════════
    // TIME IN STAGE
    // ═══════════════════════════════════════════════════════════

    /**
     * Calculate average time spent in each stage
     * @param {object} firmQuery - Firm query
     * @returns {object} - Time in stage metrics
     */
    static async getTimeInStage(firmQuery) {
        const Lead = mongoose.model('Lead');

        // Get leads with status history
        const leads = await Lead.find({
            ...firmQuery,
            'statusHistory.0': { $exists: true }
        }).select('status statusHistory createdAt').lean();

        const stageTimings = {};

        leads.forEach(lead => {
            if (!lead.statusHistory || lead.statusHistory.length === 0) return;

            // Add initial stage from createdAt to first transition
            let previousStatus = 'new';
            let previousTime = lead.createdAt;

            lead.statusHistory.forEach(transition => {
                const duration = (new Date(transition.changedAt) - new Date(previousTime)) / (1000 * 60 * 60 * 24); // days

                if (!stageTimings[previousStatus]) {
                    stageTimings[previousStatus] = { total: 0, count: 0 };
                }
                stageTimings[previousStatus].total += duration;
                stageTimings[previousStatus].count += 1;

                previousStatus = transition.to;
                previousTime = transition.changedAt;
            });
        });

        const results = Object.entries(stageTimings).map(([stage, data]) => ({
            stage,
            avgDays: data.count > 0 ? Math.round(data.total / data.count * 10) / 10 : 0,
            transitions: data.count
        }));

        return {
            stages: results.sort((a, b) => {
                const order = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'dormant'];
                return order.indexOf(a.stage) - order.indexOf(b.stage);
            }),
            totalLeadsAnalyzed: leads.length
        };
    }

    // ═══════════════════════════════════════════════════════════
    // PIPELINE HEALTH
    // ═══════════════════════════════════════════════════════════

    /**
     * Get pipeline health indicators
     * @param {object} firmQuery - Firm query
     * @returns {object} - Health indicators
     */
    static async getPipelineHealth(firmQuery) {
        const Lead = mongoose.model('Lead');
        const now = new Date();
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

        const [
            totalActive,
            staleLeads,
            recentlyCreated,
            recentlyWon,
            recentlyLost
        ] = await Promise.all([
            // Active leads (not won, lost, or dormant)
            Lead.countDocuments({
                ...firmQuery,
                status: { $nin: ['won', 'lost', 'dormant'] }
            }),
            // Stale leads (no activity in 14+ days)
            Lead.countDocuments({
                ...firmQuery,
                status: { $nin: ['won', 'lost', 'dormant'] },
                lastActivityAt: { $lt: new Date(now - 14 * 24 * 60 * 60 * 1000) }
            }),
            // Created in last 7 days
            Lead.countDocuments({
                ...firmQuery,
                createdAt: { $gte: sevenDaysAgo }
            }),
            // Won in last 30 days
            Lead.countDocuments({
                ...firmQuery,
                status: 'won',
                convertedAt: { $gte: thirtyDaysAgo }
            }),
            // Lost in last 30 days
            Lead.countDocuments({
                ...firmQuery,
                status: 'lost',
                lostAt: { $gte: thirtyDaysAgo }
            })
        ]);

        // Calculate health score (0-100)
        let healthScore = 100;

        // Penalize for stale leads
        const staleRatio = totalActive > 0 ? staleLeads / totalActive : 0;
        healthScore -= Math.min(30, staleRatio * 100);

        // Penalize for low conversion
        const conversionRatio = (recentlyWon + recentlyLost) > 0 ? recentlyWon / (recentlyWon + recentlyLost) : 0;
        if (conversionRatio < 0.3) healthScore -= 20;
        else if (conversionRatio < 0.5) healthScore -= 10;

        // Bonus for new lead flow
        if (recentlyCreated > 5) healthScore += 10;

        healthScore = Math.max(0, Math.min(100, healthScore));

        return {
            score: Math.round(healthScore),
            status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'attention' : 'critical',
            indicators: {
                totalActive,
                staleLeads,
                stalePercentage: totalActive > 0 ? Math.round((staleLeads / totalActive) * 100) : 0,
                recentlyCreated,
                recentlyWon,
                recentlyLost,
                winRate: (recentlyWon + recentlyLost) > 0 ? Math.round((recentlyWon / (recentlyWon + recentlyLost)) * 100) : 0
            },
            recommendations: this.generateHealthRecommendations(healthScore, {
                staleLeads,
                totalActive,
                recentlyCreated,
                conversionRatio
            })
        };
    }

    /**
     * Generate health recommendations
     */
    static generateHealthRecommendations(score, metrics) {
        const recommendations = [];

        if (metrics.staleLeads > 5) {
            recommendations.push({
                priority: 'high',
                action: 'follow_up_stale',
                message: `${metrics.staleLeads} leads have been inactive for 14+ days. Follow up immediately.`
            });
        }

        if (metrics.recentlyCreated < 3) {
            recommendations.push({
                priority: 'medium',
                action: 'increase_lead_generation',
                message: 'Lead generation is slow. Consider increasing marketing efforts.'
            });
        }

        if (metrics.conversionRatio < 0.3) {
            recommendations.push({
                priority: 'high',
                action: 'improve_qualification',
                message: 'Conversion rate is below 30%. Review qualification criteria.'
            });
        }

        if (score < 60) {
            recommendations.push({
                priority: 'urgent',
                action: 'pipeline_review',
                message: 'Pipeline health is critical. Immediate review recommended.'
            });
        }

        return recommendations;
    }

    // ═══════════════════════════════════════════════════════════
    // TRENDS
    // ═══════════════════════════════════════════════════════════

    /**
     * Get pipeline trends over time
     * @param {object} firmQuery - Firm query
     * @param {string} period - Period type (week, month, quarter)
     * @param {number} periods - Number of periods
     * @returns {object} - Trend data
     */
    static async getTrends(firmQuery, period = 'week', periods = 12) {
        const Lead = mongoose.model('Lead');

        const periodMs = {
            week: 7 * 24 * 60 * 60 * 1000,
            month: 30 * 24 * 60 * 60 * 1000,
            quarter: 90 * 24 * 60 * 60 * 1000
        };

        const now = new Date();
        const trends = [];

        for (let i = periods - 1; i >= 0; i--) {
            const endDate = new Date(now - i * periodMs[period]);
            const startDate = new Date(endDate - periodMs[period]);

            const [created, won, lost, valueWon] = await Promise.all([
                Lead.countDocuments({
                    ...firmQuery,
                    createdAt: { $gte: startDate, $lt: endDate }
                }),
                Lead.countDocuments({
                    ...firmQuery,
                    status: 'won',
                    convertedAt: { $gte: startDate, $lt: endDate }
                }),
                Lead.countDocuments({
                    ...firmQuery,
                    status: 'lost',
                    lostAt: { $gte: startDate, $lt: endDate }
                }),
                Lead.aggregate([
                    {
                        $match: {
                            ...firmQuery,
                            status: 'won',
                            convertedAt: { $gte: startDate, $lt: endDate }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: { $ifNull: ['$estimatedValue', 0] } }
                        }
                    }
                ])
            ]);

            trends.push({
                period: startDate.toISOString().split('T')[0],
                created,
                won,
                lost,
                valueWon: valueWon[0]?.total || 0,
                winRate: (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : 0
            });
        }

        return {
            period,
            data: trends,
            summary: {
                avgCreated: Math.round(trends.reduce((sum, t) => sum + t.created, 0) / periods),
                avgWon: Math.round(trends.reduce((sum, t) => sum + t.won, 0) / periods),
                avgValue: Math.round(trends.reduce((sum, t) => sum + t.valueWon, 0) / periods),
                trend: this.calculateTrend(trends.map(t => t.valueWon))
            }
        };
    }

    /**
     * Calculate trend direction
     */
    static calculateTrend(values) {
        if (values.length < 2) return 'stable';

        const recent = values.slice(-3).reduce((a, b) => a + b, 0) / 3;
        const earlier = values.slice(0, 3).reduce((a, b) => a + b, 0) / 3;

        const change = earlier > 0 ? ((recent - earlier) / earlier) * 100 : 0;

        if (change > 10) return 'up';
        if (change < -10) return 'down';
        return 'stable';
    }

    // ═══════════════════════════════════════════════════════════
    // COMPREHENSIVE METRICS
    // ═══════════════════════════════════════════════════════════

    /**
     * Get all pipeline metrics in one call
     * @param {object} firmQuery - Firm query
     * @param {object} options - Options
     * @returns {object} - Complete metrics
     */
    static async getComprehensiveMetrics(firmQuery, options = {}) {
        const dateRange = {
            startDate: options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: options.endDate || new Date()
        };

        const [
            stageBreakdown,
            velocity,
            conversions,
            timeInStage,
            health,
            trends
        ] = await Promise.all([
            this.getStageBreakdown(firmQuery, dateRange),
            this.getVelocityMetrics(firmQuery, dateRange),
            this.getConversionRates(firmQuery, dateRange),
            this.getTimeInStage(firmQuery),
            this.getPipelineHealth(firmQuery),
            this.getTrends(firmQuery, 'week', 8)
        ]);

        return {
            stageBreakdown,
            velocity,
            conversions,
            timeInStage,
            health,
            trends,
            generatedAt: new Date(),
            dateRange
        };
    }
}

module.exports = PipelineMetricsService;
