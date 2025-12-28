/**
 * Sales Dashboard Service
 *
 * Aggregated dashboard endpoints for Sales module
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

class SalesDashboardService {
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
            recentQuotes,
            recentOrders,
            upcomingTasks
        ] = await Promise.all([
            this.getHeroStats(firmQuery, dateRange),
            this.getRecentQuotes(firmQuery, 5),
            this.getRecentOrders(firmQuery, 5),
            this.getUpcomingTasks(firmQuery, 5)
        ]);

        return {
            viewMode: 'basic',
            period,
            dateRange,
            heroStats,
            recentQuotes,
            recentOrders,
            upcomingTasks,
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
            quoteAnalytics,
            orderAnalytics,
            pipelineMetrics,
            forecast,
            performanceByRep,
            trends,
            recentActivity
        ] = await Promise.all([
            this.getHeroStats(firmQuery, dateRange),
            this.getQuoteAnalytics(firmQuery, dateRange),
            this.getOrderAnalytics(firmQuery, dateRange),
            this.getPipelineMetrics(firmQuery),
            this.getForecastSummary(firmQuery),
            this.getPerformanceByRep(firmQuery, dateRange),
            this.getTrends(firmQuery, 8),
            this.getRecentActivity(firmQuery, 10)
        ]);

        return {
            viewMode: 'advanced',
            period,
            dateRange,
            heroStats,
            quoteAnalytics,
            orderAnalytics,
            pipelineMetrics,
            forecast,
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
        const SalesOrder = mongoose.model('SalesOrder');
        const Quote = mongoose.model('Quote');

        const [orderStats, quoteStats, previousOrderStats] = await Promise.all([
            // Current period orders
            SalesOrder.aggregate([
                {
                    $match: {
                        ...firmQuery,
                        orderDate: { $gte: dateRange.startDate, $lte: dateRange.endDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        totalRevenue: { $sum: '$grandTotal' },
                        avgOrderValue: { $avg: '$grandTotal' },
                        completedOrders: {
                            $sum: { $cond: [{ $in: ['$status', ['completed', 'invoiced', 'closed']] }, 1, 0] }
                        },
                        cancelledOrders: {
                            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
                        }
                    }
                }
            ]),

            // Current period quotes
            Quote.aggregate([
                {
                    $match: {
                        ...firmQuery,
                        createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalQuotes: { $sum: 1 },
                        totalValue: { $sum: '$totals.grandTotal' },
                        accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
                        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
                        pending: { $sum: { $cond: [{ $in: ['$status', ['sent', 'viewed', 'draft']] }, 1, 0] } }
                    }
                }
            ]),

            // Previous period orders (for comparison)
            SalesOrder.aggregate([
                {
                    $match: {
                        ...firmQuery,
                        orderDate: { $gte: dateRange.previousStartDate, $lte: dateRange.previousEndDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$grandTotal' },
                        totalOrders: { $sum: 1 }
                    }
                }
            ])
        ]);

        const currentOrder = orderStats[0] || { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0, completedOrders: 0, cancelledOrders: 0 };
        const currentQuote = quoteStats[0] || { totalQuotes: 0, totalValue: 0, accepted: 0, rejected: 0, pending: 0 };
        const previousOrder = previousOrderStats[0] || { totalRevenue: 0, totalOrders: 0 };

        // Calculate changes
        const revenueChange = previousOrder.totalRevenue > 0
            ? Math.round(((currentOrder.totalRevenue - previousOrder.totalRevenue) / previousOrder.totalRevenue) * 100)
            : 0;

        const ordersChange = previousOrder.totalOrders > 0
            ? Math.round(((currentOrder.totalOrders - previousOrder.totalOrders) / previousOrder.totalOrders) * 100)
            : 0;

        const quoteConversionRate = (currentQuote.accepted + currentQuote.rejected) > 0
            ? Math.round((currentQuote.accepted / (currentQuote.accepted + currentQuote.rejected)) * 100)
            : 0;

        return {
            revenue: {
                current: Math.round(currentOrder.totalRevenue),
                previous: Math.round(previousOrder.totalRevenue),
                change: revenueChange,
                trend: revenueChange > 0 ? 'up' : revenueChange < 0 ? 'down' : 'stable'
            },
            orders: {
                total: currentOrder.totalOrders,
                completed: currentOrder.completedOrders,
                cancelled: currentOrder.cancelledOrders,
                avgValue: Math.round(currentOrder.avgOrderValue),
                change: ordersChange
            },
            quotes: {
                total: currentQuote.totalQuotes,
                value: Math.round(currentQuote.totalValue),
                accepted: currentQuote.accepted,
                pending: currentQuote.pending,
                conversionRate: quoteConversionRate
            }
        };
    }

    // ═══════════════════════════════════════════════════════════
    // QUOTE ANALYTICS
    // ═══════════════════════════════════════════════════════════

    /**
     * Get quote analytics
     */
    static async getQuoteAnalytics(firmQuery, dateRange) {
        const Quote = mongoose.model('Quote');

        const analytics = await Quote.aggregate([
            {
                $match: {
                    ...firmQuery,
                    createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalValue: { $sum: '$totals.grandTotal' },
                    avgValue: { $avg: '$totals.grandTotal' }
                }
            }
        ]);

        const statusMap = {};
        analytics.forEach(a => {
            statusMap[a._id] = {
                count: a.count,
                value: Math.round(a.totalValue),
                avgValue: Math.round(a.avgValue)
            };
        });

        // Get expiring soon
        const expiringSoon = await Quote.countDocuments({
            ...firmQuery,
            status: { $in: ['sent', 'viewed'] },
            validUntil: {
                $gte: new Date(),
                $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        });

        return {
            byStatus: statusMap,
            expiringSoon,
            totals: {
                count: analytics.reduce((sum, a) => sum + a.count, 0),
                value: Math.round(analytics.reduce((sum, a) => sum + a.totalValue, 0))
            }
        };
    }

    // ═══════════════════════════════════════════════════════════
    // ORDER ANALYTICS
    // ═══════════════════════════════════════════════════════════

    /**
     * Get order analytics
     */
    static async getOrderAnalytics(firmQuery, dateRange) {
        const SalesOrder = mongoose.model('SalesOrder');

        const [byStatus, byPayment, byDelivery] = await Promise.all([
            // By status
            SalesOrder.aggregate([
                {
                    $match: {
                        ...firmQuery,
                        orderDate: { $gte: dateRange.startDate, $lte: dateRange.endDate }
                    }
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        value: { $sum: '$grandTotal' }
                    }
                }
            ]),

            // By payment status
            SalesOrder.aggregate([
                {
                    $match: {
                        ...firmQuery,
                        orderDate: { $gte: dateRange.startDate, $lte: dateRange.endDate }
                    }
                },
                {
                    $group: {
                        _id: '$paymentStatus',
                        count: { $sum: 1 },
                        value: { $sum: '$grandTotal' },
                        paid: { $sum: '$totalPaid' },
                        outstanding: { $sum: '$balanceDue' }
                    }
                }
            ]),

            // By delivery status
            SalesOrder.aggregate([
                {
                    $match: {
                        ...firmQuery,
                        orderDate: { $gte: dateRange.startDate, $lte: dateRange.endDate }
                    }
                },
                {
                    $group: {
                        _id: '$deliveryStatus',
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        return {
            byStatus: byStatus.reduce((acc, s) => {
                acc[s._id] = { count: s.count, value: Math.round(s.value) };
                return acc;
            }, {}),
            byPayment: byPayment.reduce((acc, s) => {
                acc[s._id] = {
                    count: s.count,
                    value: Math.round(s.value),
                    paid: Math.round(s.paid),
                    outstanding: Math.round(s.outstanding)
                };
                return acc;
            }, {}),
            byDelivery: byDelivery.reduce((acc, s) => {
                acc[s._id] = s.count;
                return acc;
            }, {}),
            totalOutstanding: Math.round(byPayment.reduce((sum, s) => sum + (s.outstanding || 0), 0))
        };
    }

    // ═══════════════════════════════════════════════════════════
    // PIPELINE METRICS
    // ═══════════════════════════════════════════════════════════

    /**
     * Get pipeline metrics summary
     */
    static async getPipelineMetrics(firmQuery) {
        const Lead = mongoose.model('Lead');

        const pipeline = await Lead.aggregate([
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
                    value: { $sum: { $ifNull: ['$estimatedValue', 0] } }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const totalValue = pipeline.reduce((sum, s) => sum + s.value, 0);
        const totalCount = pipeline.reduce((sum, s) => sum + s.count, 0);

        // Calculate weighted value
        const probabilities = {
            new: 10, contacted: 20, qualified: 40, proposal: 60, negotiation: 80
        };
        const weightedValue = pipeline.reduce((sum, s) => {
            return sum + (s.value * ((probabilities[s._id] || 50) / 100));
        }, 0);

        return {
            stages: pipeline.map(s => ({
                stage: s._id,
                count: s.count,
                value: Math.round(s.value),
                percentage: totalCount > 0 ? Math.round((s.count / totalCount) * 100) : 0
            })),
            totals: {
                count: totalCount,
                value: Math.round(totalValue),
                weightedValue: Math.round(weightedValue)
            }
        };
    }

    // ═══════════════════════════════════════════════════════════
    // FORECAST SUMMARY
    // ═══════════════════════════════════════════════════════════

    /**
     * Get forecast summary
     */
    static async getForecastSummary(firmQuery) {
        const Lead = mongoose.model('Lead');
        const SalesOrder = mongoose.model('SalesOrder');

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const [pipeline, monthlyActual] = await Promise.all([
            // Active pipeline
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
                        totalValue: { $sum: { $ifNull: ['$estimatedValue', 0] } },
                        count: { $sum: 1 }
                    }
                }
            ]),

            // Month actual
            SalesOrder.aggregate([
                {
                    $match: {
                        ...firmQuery,
                        status: { $in: ['completed', 'invoiced', 'closed'] },
                        completedAt: { $gte: monthStart, $lte: monthEnd }
                    }
                },
                {
                    $group: {
                        _id: null,
                        actual: { $sum: '$grandTotal' }
                    }
                }
            ])
        ]);

        const pipelineData = pipeline[0] || { totalValue: 0, count: 0 };
        const actualData = monthlyActual[0] || { actual: 0 };

        // Calculate weighted forecast
        const weightedPipeline = Math.round(pipelineData.totalValue * 0.5);

        return {
            monthToDate: Math.round(actualData.actual),
            pipelineValue: Math.round(pipelineData.totalValue),
            weightedPipeline,
            forecast: {
                best: Math.round(actualData.actual + pipelineData.totalValue),
                mostLikely: Math.round(actualData.actual + weightedPipeline),
                worst: Math.round(actualData.actual + weightedPipeline * 0.5)
            },
            pipelineDeals: pipelineData.count
        };
    }

    // ═══════════════════════════════════════════════════════════
    // PERFORMANCE BY REP
    // ═══════════════════════════════════════════════════════════

    /**
     * Get performance by sales rep
     */
    static async getPerformanceByRep(firmQuery, dateRange) {
        const SalesOrder = mongoose.model('SalesOrder');

        const performance = await SalesOrder.aggregate([
            {
                $match: {
                    ...firmQuery,
                    status: { $in: ['completed', 'invoiced', 'closed'] },
                    completedAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
                }
            },
            {
                $group: {
                    _id: '$salesPersonId',
                    name: { $first: '$salesPersonName' },
                    orders: { $sum: 1 },
                    revenue: { $sum: '$grandTotal' },
                    avgDeal: { $avg: '$grandTotal' }
                }
            },
            { $sort: { revenue: -1 } },
            { $limit: 10 }
        ]);

        return performance.map(p => ({
            salesPersonId: p._id,
            name: p.name || 'Unassigned',
            orders: p.orders,
            revenue: Math.round(p.revenue),
            avgDeal: Math.round(p.avgDeal)
        }));
    }

    // ═══════════════════════════════════════════════════════════
    // TRENDS
    // ═══════════════════════════════════════════════════════════

    /**
     * Get trends over time
     */
    static async getTrends(firmQuery, weeks = 8) {
        const SalesOrder = mongoose.model('SalesOrder');
        const now = new Date();
        const trends = [];

        for (let i = weeks - 1; i >= 0; i--) {
            const weekEnd = new Date(now - i * 7 * 24 * 60 * 60 * 1000);
            const weekStart = new Date(weekEnd - 7 * 24 * 60 * 60 * 1000);

            const weekStats = await SalesOrder.aggregate([
                {
                    $match: {
                        ...firmQuery,
                        orderDate: { $gte: weekStart, $lt: weekEnd }
                    }
                },
                {
                    $group: {
                        _id: null,
                        orders: { $sum: 1 },
                        revenue: { $sum: '$grandTotal' }
                    }
                }
            ]);

            const stats = weekStats[0] || { orders: 0, revenue: 0 };
            trends.push({
                week: weekStart.toISOString().split('T')[0],
                orders: stats.orders,
                revenue: Math.round(stats.revenue)
            });
        }

        return trends;
    }

    // ═══════════════════════════════════════════════════════════
    // RECENT ITEMS
    // ═══════════════════════════════════════════════════════════

    /**
     * Get recent quotes
     */
    static async getRecentQuotes(firmQuery, limit = 5) {
        const Quote = mongoose.model('Quote');

        return Quote.find(firmQuery)
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('quoteId title status totals.grandTotal customerInfo.name validUntil createdAt')
            .lean();
    }

    /**
     * Get recent orders
     */
    static async getRecentOrders(firmQuery, limit = 5) {
        const SalesOrder = mongoose.model('SalesOrder');

        return SalesOrder.find(firmQuery)
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('orderNumber customerName status grandTotal paymentStatus orderDate')
            .lean();
    }

    /**
     * Get upcoming tasks
     */
    static async getUpcomingTasks(firmQuery, limit = 5) {
        const Task = mongoose.model('Task');

        const tasks = await Task.find({
            ...firmQuery,
            status: { $ne: 'completed' },
            dueDate: { $gte: new Date() }
        })
        .sort({ dueDate: 1 })
        .limit(limit)
        .select('title dueDate priority status entityType entityId')
        .lean();

        return tasks;
    }

    /**
     * Get recent activity
     */
    static async getRecentActivity(firmQuery, limit = 10) {
        const CrmActivity = mongoose.model('CrmActivity');

        return CrmActivity.find({
            ...firmQuery,
            entityType: { $in: ['quote', 'order', 'lead'] }
        })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('type subject entityType entityId createdAt createdBy')
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

module.exports = SalesDashboardService;
