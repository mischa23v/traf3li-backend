/**
 * Sales Reports Service
 *
 * Comprehensive server-side report generation
 * Inspired by: Odoo, ERPNext, Dolibarr, OFBiz, iDempiere
 *
 * Reports:
 * - Sales Summary Report
 * - Quotation Analysis Report
 * - Order Analysis Report
 * - Revenue by Period Report
 * - Sales by Rep Report
 * - Product Performance Report
 * - Commission Report
 * - Pipeline Report
 * - Forecast Report
 *
 * Backend does 90% of work - frontend just displays
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

class SalesReportsService {
    // ═══════════════════════════════════════════════════════════
    // SALES SUMMARY REPORT
    // ═══════════════════════════════════════════════════════════

    /**
     * Generate sales summary report
     */
    static async getSalesSummaryReport(firmQuery, options = {}) {
        const SalesOrder = mongoose.model('SalesOrder');
        const Quote = mongoose.model('Quote');
        const { startDate, endDate } = this.getDateRange(options);

        const [orderSummary, quoteSummary, topProducts, topCustomers] = await Promise.all([
            // Order summary
            SalesOrder.aggregate([
                {
                    $match: {
                        ...firmQuery,
                        orderDate: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        totalRevenue: { $sum: '$grandTotal' },
                        totalCost: { $sum: '$totalCost' },
                        totalMargin: { $sum: '$totalMargin' },
                        avgOrderValue: { $avg: '$grandTotal' },
                        completed: { $sum: { $cond: [{ $in: ['$status', ['completed', 'invoiced', 'closed']] }, 1, 0] } },
                        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                        totalPaid: { $sum: '$totalPaid' },
                        totalOutstanding: { $sum: '$balanceDue' }
                    }
                }
            ]),

            // Quote summary
            Quote.aggregate([
                {
                    $match: {
                        ...firmQuery,
                        createdAt: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalQuotes: { $sum: 1 },
                        totalValue: { $sum: '$totals.grandTotal' },
                        avgValue: { $avg: '$totals.grandTotal' },
                        accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
                        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
                        expired: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
                        pending: { $sum: { $cond: [{ $in: ['$status', ['draft', 'sent', 'viewed']] }, 1, 0] } }
                    }
                }
            ]),

            // Top products
            this.getTopProducts(firmQuery, startDate, endDate, 5),

            // Top customers
            this.getTopCustomers(firmQuery, startDate, endDate, 5)
        ]);

        const orders = orderSummary[0] || this.emptyOrderSummary();
        const quotes = quoteSummary[0] || this.emptyQuoteSummary();

        return {
            reportType: 'sales_summary',
            period: { startDate, endDate },
            orders: {
                count: orders.totalOrders,
                revenue: Math.round(orders.totalRevenue),
                cost: Math.round(orders.totalCost),
                margin: Math.round(orders.totalMargin),
                marginPercent: orders.totalRevenue > 0 ? Math.round((orders.totalMargin / orders.totalRevenue) * 100) : 0,
                avgValue: Math.round(orders.avgOrderValue),
                completed: orders.completed,
                cancelled: orders.cancelled,
                completionRate: orders.totalOrders > 0 ? Math.round((orders.completed / orders.totalOrders) * 100) : 0,
                paid: Math.round(orders.totalPaid),
                outstanding: Math.round(orders.totalOutstanding)
            },
            quotes: {
                count: quotes.totalQuotes,
                value: Math.round(quotes.totalValue),
                avgValue: Math.round(quotes.avgValue),
                accepted: quotes.accepted,
                rejected: quotes.rejected,
                expired: quotes.expired,
                pending: quotes.pending,
                conversionRate: (quotes.accepted + quotes.rejected) > 0
                    ? Math.round((quotes.accepted / (quotes.accepted + quotes.rejected)) * 100)
                    : 0
            },
            topProducts,
            topCustomers,
            generatedAt: new Date()
        };
    }

    // ═══════════════════════════════════════════════════════════
    // REVENUE BY PERIOD REPORT
    // ═══════════════════════════════════════════════════════════

    /**
     * Generate revenue by period report
     */
    static async getRevenueByPeriodReport(firmQuery, options = {}) {
        const SalesOrder = mongoose.model('SalesOrder');
        const { startDate, endDate, groupBy = 'month' } = options;

        const dateFormat = {
            day: '%Y-%m-%d',
            week: '%Y-W%V',
            month: '%Y-%m',
            quarter: '%Y-Q%q',
            year: '%Y'
        };

        const revenue = await SalesOrder.aggregate([
            {
                $match: {
                    ...firmQuery,
                    orderDate: { $gte: startDate, $lte: endDate },
                    status: { $in: ['completed', 'invoiced', 'closed'] }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: dateFormat[groupBy] || dateFormat.month, date: '$orderDate' } },
                    revenue: { $sum: '$grandTotal' },
                    orders: { $sum: 1 },
                    avgOrder: { $avg: '$grandTotal' },
                    margin: { $sum: '$totalMargin' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const totalRevenue = revenue.reduce((sum, r) => sum + r.revenue, 0);
        const totalOrders = revenue.reduce((sum, r) => sum + r.orders, 0);

        return {
            reportType: 'revenue_by_period',
            period: { startDate, endDate },
            groupBy,
            data: revenue.map(r => ({
                period: r._id,
                revenue: Math.round(r.revenue),
                orders: r.orders,
                avgOrder: Math.round(r.avgOrder),
                margin: Math.round(r.margin),
                revenuePercent: totalRevenue > 0 ? Math.round((r.revenue / totalRevenue) * 100) : 0
            })),
            totals: {
                revenue: Math.round(totalRevenue),
                orders: totalOrders,
                avgOrder: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0
            },
            generatedAt: new Date()
        };
    }

    // ═══════════════════════════════════════════════════════════
    // SALES BY REP REPORT
    // ═══════════════════════════════════════════════════════════

    /**
     * Generate sales by rep report
     */
    static async getSalesByRepReport(firmQuery, options = {}) {
        const SalesOrder = mongoose.model('SalesOrder');
        const { startDate, endDate } = this.getDateRange(options);

        const salesByRep = await SalesOrder.aggregate([
            {
                $match: {
                    ...firmQuery,
                    orderDate: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: '$salesPersonId',
                    name: { $first: '$salesPersonName' },
                    orders: { $sum: 1 },
                    revenue: { $sum: '$grandTotal' },
                    cost: { $sum: '$totalCost' },
                    margin: { $sum: '$totalMargin' },
                    avgOrder: { $avg: '$grandTotal' },
                    completed: { $sum: { $cond: [{ $in: ['$status', ['completed', 'invoiced', 'closed']] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                    commission: { $sum: '$commissionAmount' }
                }
            },
            { $sort: { revenue: -1 } }
        ]);

        const totalRevenue = salesByRep.reduce((sum, r) => sum + r.revenue, 0);

        return {
            reportType: 'sales_by_rep',
            period: { startDate, endDate },
            data: salesByRep.map(r => ({
                salesPersonId: r._id,
                name: r.name || 'Unassigned',
                orders: r.orders,
                revenue: Math.round(r.revenue),
                revenuePercent: totalRevenue > 0 ? Math.round((r.revenue / totalRevenue) * 100) : 0,
                cost: Math.round(r.cost),
                margin: Math.round(r.margin),
                marginPercent: r.revenue > 0 ? Math.round((r.margin / r.revenue) * 100) : 0,
                avgOrder: Math.round(r.avgOrder),
                completed: r.completed,
                cancelled: r.cancelled,
                conversionRate: r.orders > 0 ? Math.round((r.completed / r.orders) * 100) : 0,
                commission: Math.round(r.commission)
            })),
            totals: {
                reps: salesByRep.length,
                totalRevenue: Math.round(totalRevenue),
                avgRevenuePerRep: salesByRep.length > 0 ? Math.round(totalRevenue / salesByRep.length) : 0
            },
            generatedAt: new Date()
        };
    }

    // ═══════════════════════════════════════════════════════════
    // QUOTATION ANALYSIS REPORT
    // ═══════════════════════════════════════════════════════════

    /**
     * Generate quotation analysis report
     */
    static async getQuotationAnalysisReport(firmQuery, options = {}) {
        const Quote = mongoose.model('Quote');
        const { startDate, endDate } = this.getDateRange(options);

        const [byStatus, byMonth, conversionTime] = await Promise.all([
            // By status
            Quote.aggregate([
                {
                    $match: {
                        ...firmQuery,
                        createdAt: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        value: { $sum: '$totals.grandTotal' },
                        avgValue: { $avg: '$totals.grandTotal' }
                    }
                }
            ]),

            // By month
            Quote.aggregate([
                {
                    $match: {
                        ...firmQuery,
                        createdAt: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                        count: { $sum: 1 },
                        value: { $sum: '$totals.grandTotal' },
                        accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
                        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } }
                    }
                },
                { $sort: { _id: 1 } }
            ]),

            // Average conversion time
            Quote.aggregate([
                {
                    $match: {
                        ...firmQuery,
                        status: 'accepted',
                        respondedAt: { $exists: true }
                    }
                },
                {
                    $project: {
                        conversionDays: {
                            $divide: [
                                { $subtract: ['$respondedAt', '$sentAt'] },
                                1000 * 60 * 60 * 24
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgDays: { $avg: '$conversionDays' },
                        minDays: { $min: '$conversionDays' },
                        maxDays: { $max: '$conversionDays' }
                    }
                }
            ])
        ]);

        return {
            reportType: 'quotation_analysis',
            period: { startDate, endDate },
            byStatus: byStatus.reduce((acc, s) => {
                acc[s._id] = {
                    count: s.count,
                    value: Math.round(s.value),
                    avgValue: Math.round(s.avgValue)
                };
                return acc;
            }, {}),
            byMonth: byMonth.map(m => ({
                month: m._id,
                count: m.count,
                value: Math.round(m.value),
                accepted: m.accepted,
                rejected: m.rejected,
                conversionRate: (m.accepted + m.rejected) > 0 ? Math.round((m.accepted / (m.accepted + m.rejected)) * 100) : 0
            })),
            conversionMetrics: {
                avgDays: Math.round(conversionTime[0]?.avgDays || 0),
                minDays: Math.round(conversionTime[0]?.minDays || 0),
                maxDays: Math.round(conversionTime[0]?.maxDays || 0)
            },
            generatedAt: new Date()
        };
    }

    // ═══════════════════════════════════════════════════════════
    // COMMISSION REPORT
    // ═══════════════════════════════════════════════════════════

    /**
     * Generate commission report
     */
    static async getCommissionReport(firmQuery, options = {}) {
        const SalesOrder = mongoose.model('SalesOrder');
        const { startDate, endDate } = this.getDateRange(options);

        const commissions = await SalesOrder.aggregate([
            {
                $match: {
                    ...firmQuery,
                    status: { $in: ['completed', 'invoiced', 'closed'] },
                    completedAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: '$salesPersonId',
                    name: { $first: '$salesPersonName' },
                    orders: { $sum: 1 },
                    revenue: { $sum: '$grandTotal' },
                    commission: { $sum: '$commissionAmount' }
                }
            },
            { $sort: { commission: -1 } }
        ]);

        const totalCommission = commissions.reduce((sum, c) => sum + c.commission, 0);
        const totalRevenue = commissions.reduce((sum, c) => sum + c.revenue, 0);

        return {
            reportType: 'commission',
            period: { startDate, endDate },
            data: commissions.map(c => ({
                salesPersonId: c._id,
                name: c.name || 'Unassigned',
                orders: c.orders,
                revenue: Math.round(c.revenue),
                commission: Math.round(c.commission),
                rate: c.revenue > 0 ? Math.round((c.commission / c.revenue) * 100 * 100) / 100 : 0
            })),
            totals: {
                totalCommission: Math.round(totalCommission),
                totalRevenue: Math.round(totalRevenue),
                avgRate: totalRevenue > 0 ? Math.round((totalCommission / totalRevenue) * 100 * 100) / 100 : 0,
                reps: commissions.length
            },
            generatedAt: new Date()
        };
    }

    // ═══════════════════════════════════════════════════════════
    // PRODUCT PERFORMANCE REPORT
    // ═══════════════════════════════════════════════════════════

    /**
     * Generate product performance report
     */
    static async getProductPerformanceReport(firmQuery, options = {}) {
        const SalesOrder = mongoose.model('SalesOrder');
        const { startDate, endDate } = this.getDateRange(options);

        const products = await SalesOrder.aggregate([
            {
                $match: {
                    ...firmQuery,
                    orderDate: { $gte: startDate, $lte: endDate }
                }
            },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.productId',
                    name: { $first: '$items.productName' },
                    quantity: { $sum: '$items.quantity' },
                    revenue: { $sum: '$items.total' },
                    orders: { $addToSet: '$_id' },
                    avgPrice: { $avg: '$items.unitPrice' }
                }
            },
            {
                $project: {
                    name: 1,
                    quantity: 1,
                    revenue: 1,
                    orderCount: { $size: '$orders' },
                    avgPrice: 1
                }
            },
            { $sort: { revenue: -1 } },
            { $limit: 20 }
        ]);

        const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0);

        return {
            reportType: 'product_performance',
            period: { startDate, endDate },
            data: products.map(p => ({
                productId: p._id,
                name: p.name || 'Unknown Product',
                quantity: p.quantity,
                revenue: Math.round(p.revenue),
                revenuePercent: totalRevenue > 0 ? Math.round((p.revenue / totalRevenue) * 100) : 0,
                orderCount: p.orderCount,
                avgPrice: Math.round(p.avgPrice)
            })),
            totals: {
                products: products.length,
                totalRevenue: Math.round(totalRevenue)
            },
            generatedAt: new Date()
        };
    }

    // ═══════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════

    static async getTopProducts(firmQuery, startDate, endDate, limit = 5) {
        const SalesOrder = mongoose.model('SalesOrder');

        const products = await SalesOrder.aggregate([
            {
                $match: {
                    ...firmQuery,
                    orderDate: { $gte: startDate, $lte: endDate }
                }
            },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.productId',
                    name: { $first: '$items.productName' },
                    revenue: { $sum: '$items.total' },
                    quantity: { $sum: '$items.quantity' }
                }
            },
            { $sort: { revenue: -1 } },
            { $limit: limit }
        ]);

        return products.map(p => ({
            productId: p._id,
            name: p.name || 'Unknown',
            revenue: Math.round(p.revenue),
            quantity: p.quantity
        }));
    }

    static async getTopCustomers(firmQuery, startDate, endDate, limit = 5) {
        const SalesOrder = mongoose.model('SalesOrder');

        const customers = await SalesOrder.aggregate([
            {
                $match: {
                    ...firmQuery,
                    orderDate: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: '$customerId',
                    name: { $first: '$customerName' },
                    orders: { $sum: 1 },
                    revenue: { $sum: '$grandTotal' }
                }
            },
            { $sort: { revenue: -1 } },
            { $limit: limit }
        ]);

        return customers.map(c => ({
            customerId: c._id,
            name: c.name || 'Unknown',
            orders: c.orders,
            revenue: Math.round(c.revenue)
        }));
    }

    static getDateRange(options) {
        const now = new Date();
        return {
            startDate: options.startDate || new Date(now.getFullYear(), now.getMonth(), 1),
            endDate: options.endDate || now
        };
    }

    static emptyOrderSummary() {
        return {
            totalOrders: 0, totalRevenue: 0, totalCost: 0, totalMargin: 0,
            avgOrderValue: 0, completed: 0, cancelled: 0, totalPaid: 0, totalOutstanding: 0
        };
    }

    static emptyQuoteSummary() {
        return {
            totalQuotes: 0, totalValue: 0, avgValue: 0,
            accepted: 0, rejected: 0, expired: 0, pending: 0
        };
    }

    /**
     * Get all available reports
     */
    static async getAllReports(firmQuery, options = {}) {
        const [
            summary,
            revenueByPeriod,
            salesByRep,
            quotationAnalysis,
            commission,
            productPerformance
        ] = await Promise.all([
            this.getSalesSummaryReport(firmQuery, options),
            this.getRevenueByPeriodReport(firmQuery, { ...options, groupBy: 'month' }),
            this.getSalesByRepReport(firmQuery, options),
            this.getQuotationAnalysisReport(firmQuery, options),
            this.getCommissionReport(firmQuery, options),
            this.getProductPerformanceReport(firmQuery, options)
        ]);

        return {
            summary,
            revenueByPeriod,
            salesByRep,
            quotationAnalysis,
            commission,
            productPerformance,
            generatedAt: new Date()
        };
    }
}

module.exports = SalesReportsService;
