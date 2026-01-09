/**
 * CRM Reports Transactions Routes
 *
 * CRM transaction reports and analytics.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - GET /transactions                    - Get transaction report
 * - GET /transactions/summary            - Get transactions summary
 * - GET /transactions/export             - Export transactions
 * - GET /:reportType/export              - Export specific report type
 * - GET /transactions/by-period          - Get transactions by period
 * - GET /transactions/trends             - Get transaction trends
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

// Valid report types
const VALID_REPORT_TYPES = [
    'transactions', 'pipeline', 'conversion', 'revenue',
    'lead_source', 'sales_rep', 'product', 'region'
];

/**
 * GET /transactions - Get transaction report
 */
router.get('/transactions', async (req, res, next) => {
    try {
        const { page, limit } = sanitizePagination(req.query);
        const { startDate, endDate, type, status, salesRep, minAmount, maxAmount } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('crm.transactions').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let transactions = firm.crm?.transactions || [];

        // Apply date filters
        if (startDate) {
            const start = new Date(startDate);
            transactions = transactions.filter(t => new Date(t.date || t.createdAt) >= start);
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            transactions = transactions.filter(t => new Date(t.date || t.createdAt) <= end);
        }

        // Apply other filters
        if (type) {
            transactions = transactions.filter(t => t.type === type);
        }

        if (status) {
            transactions = transactions.filter(t => t.status === status);
        }

        if (salesRep) {
            const safeSalesRep = sanitizeObjectId(salesRep, 'salesRep');
            transactions = transactions.filter(t => t.salesRepId?.toString() === safeSalesRep.toString());
        }

        if (minAmount) {
            transactions = transactions.filter(t => (t.amount || 0) >= parseFloat(minAmount));
        }

        if (maxAmount) {
            transactions = transactions.filter(t => (t.amount || 0) <= parseFloat(maxAmount));
        }

        // Sort by date descending
        transactions.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

        const total = transactions.length;
        const paginatedTransactions = transactions.slice((page - 1) * limit, page * limit);

        // Calculate summary
        const summary = {
            totalTransactions: total,
            totalAmount: transactions.reduce((s, t) => s + (t.amount || 0), 0),
            averageAmount: total > 0 ? transactions.reduce((s, t) => s + (t.amount || 0), 0) / total : 0,
            byType: {},
            byStatus: {}
        };

        transactions.forEach(t => {
            const type = t.type || 'unknown';
            const status = t.status || 'unknown';

            if (!summary.byType[type]) summary.byType[type] = { count: 0, amount: 0 };
            summary.byType[type].count++;
            summary.byType[type].amount += t.amount || 0;

            if (!summary.byStatus[status]) summary.byStatus[status] = { count: 0, amount: 0 };
            summary.byStatus[status].count++;
            summary.byStatus[status].amount += t.amount || 0;
        });

        res.json({
            success: true,
            data: paginatedTransactions,
            summary,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /transactions/summary - Get transactions summary
 */
router.get('/transactions/summary', async (req, res, next) => {
    try {
        const { startDate, endDate, groupBy = 'month' } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('crm.transactions').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let transactions = firm.crm?.transactions || [];

        // Apply date filters
        if (startDate) {
            const start = new Date(startDate);
            transactions = transactions.filter(t => new Date(t.date || t.createdAt) >= start);
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            transactions = transactions.filter(t => new Date(t.date || t.createdAt) <= end);
        }

        // Group by period
        const grouped = {};

        transactions.forEach(t => {
            const date = new Date(t.date || t.createdAt);
            let key;

            switch (groupBy) {
                case 'day':
                    key = date.toISOString().split('T')[0];
                    break;
                case 'week':
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    key = weekStart.toISOString().split('T')[0];
                    break;
                case 'month':
                default:
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    break;
                case 'quarter':
                    const quarter = Math.ceil((date.getMonth() + 1) / 3);
                    key = `${date.getFullYear()}-Q${quarter}`;
                    break;
                case 'year':
                    key = String(date.getFullYear());
                    break;
            }

            if (!grouped[key]) {
                grouped[key] = {
                    period: key,
                    count: 0,
                    totalAmount: 0,
                    wonCount: 0,
                    wonAmount: 0,
                    lostCount: 0
                };
            }

            grouped[key].count++;
            grouped[key].totalAmount += t.amount || 0;

            if (t.status === 'won' || t.status === 'closed_won') {
                grouped[key].wonCount++;
                grouped[key].wonAmount += t.amount || 0;
            } else if (t.status === 'lost' || t.status === 'closed_lost') {
                grouped[key].lostCount++;
            }
        });

        // Convert to array and sort
        const summary = Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));

        // Calculate aggregates
        const totals = {
            totalTransactions: transactions.length,
            totalAmount: transactions.reduce((s, t) => s + (t.amount || 0), 0),
            averageAmount: transactions.length > 0
                ? transactions.reduce((s, t) => s + (t.amount || 0), 0) / transactions.length
                : 0,
            wonRate: transactions.length > 0
                ? (transactions.filter(t => t.status === 'won' || t.status === 'closed_won').length / transactions.length) * 100
                : 0
        };

        res.json({
            success: true,
            data: {
                periods: summary,
                totals,
                groupedBy: groupBy
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /transactions/export - Export transactions
 */
router.get('/transactions/export', async (req, res, next) => {
    try {
        const { startDate, endDate, format = 'json' } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('crm.transactions').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let transactions = firm.crm?.transactions || [];

        // Apply date filters
        if (startDate) {
            const start = new Date(startDate);
            transactions = transactions.filter(t => new Date(t.date || t.createdAt) >= start);
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            transactions = transactions.filter(t => new Date(t.date || t.createdAt) <= end);
        }

        // Prepare export data
        const exportData = transactions.map(t => ({
            id: t._id,
            date: t.date || t.createdAt,
            type: t.type,
            status: t.status,
            amount: t.amount,
            currency: t.currency || 'SAR',
            customer: t.customerName,
            product: t.productName,
            salesRep: t.salesRepName,
            notes: t.notes
        }));

        res.json({
            success: true,
            data: exportData,
            meta: {
                exportedAt: new Date().toISOString(),
                recordCount: exportData.length,
                dateRange: { startDate, endDate }
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:reportType/export - Export specific report type
 */
router.get('/:reportType/export', async (req, res, next) => {
    try {
        const { reportType } = req.params;
        const { startDate, endDate } = req.query;

        if (!VALID_REPORT_TYPES.includes(reportType)) {
            throw CustomException(`Invalid report type. Must be one of: ${VALID_REPORT_TYPES.join(', ')}`, 400);
        }

        const firm = await Firm.findOne(req.firmQuery).select('crm').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let exportData;

        switch (reportType) {
            case 'pipeline':
                exportData = generatePipelineReport(firm.crm, startDate, endDate);
                break;
            case 'conversion':
                exportData = generateConversionReport(firm.crm, startDate, endDate);
                break;
            case 'revenue':
                exportData = generateRevenueReport(firm.crm, startDate, endDate);
                break;
            case 'lead_source':
                exportData = generateLeadSourceReport(firm.crm, startDate, endDate);
                break;
            case 'sales_rep':
                exportData = generateSalesRepReport(firm.crm, startDate, endDate);
                break;
            default:
                exportData = { message: 'Report type not yet implemented', data: [] };
        }

        res.json({
            success: true,
            reportType,
            data: exportData,
            meta: {
                exportedAt: new Date().toISOString(),
                dateRange: { startDate, endDate }
            }
        });
    } catch (error) {
        next(error);
    }
});

// Helper functions for report generation
function generatePipelineReport(crm, startDate, endDate) {
    const deals = crm?.deals || [];
    const stages = {};

    deals.forEach(d => {
        const stage = d.stage || 'unknown';
        if (!stages[stage]) {
            stages[stage] = { count: 0, totalValue: 0, avgDaysInStage: 0, deals: [] };
        }
        stages[stage].count++;
        stages[stage].totalValue += d.value || 0;
        stages[stage].deals.push({
            id: d._id,
            name: d.name,
            value: d.value,
            probability: d.probability
        });
    });

    return {
        totalDeals: deals.length,
        totalPipelineValue: deals.reduce((s, d) => s + (d.value || 0), 0),
        byStage: stages
    };
}

function generateConversionReport(crm, startDate, endDate) {
    const leads = crm?.leads || [];
    const opportunities = crm?.opportunities || [];
    const deals = crm?.deals || [];

    return {
        totalLeads: leads.length,
        convertedToOpportunity: opportunities.filter(o => o.sourceLeadId).length,
        convertedToDeal: deals.filter(d => d.sourceLeadId || d.sourceOpportunityId).length,
        conversionRates: {
            leadToOpportunity: leads.length > 0
                ? (opportunities.filter(o => o.sourceLeadId).length / leads.length * 100).toFixed(2) + '%'
                : '0%',
            opportunityToDeal: opportunities.length > 0
                ? (deals.filter(d => d.sourceOpportunityId).length / opportunities.length * 100).toFixed(2) + '%'
                : '0%'
        }
    };
}

function generateRevenueReport(crm, startDate, endDate) {
    let transactions = crm?.transactions || [];

    if (startDate) {
        transactions = transactions.filter(t => new Date(t.date) >= new Date(startDate));
    }
    if (endDate) {
        transactions = transactions.filter(t => new Date(t.date) <= new Date(endDate));
    }

    const wonTransactions = transactions.filter(t => t.status === 'won' || t.status === 'closed_won');

    return {
        totalRevenue: wonTransactions.reduce((s, t) => s + (t.amount || 0), 0),
        transactionCount: wonTransactions.length,
        averageDealSize: wonTransactions.length > 0
            ? wonTransactions.reduce((s, t) => s + (t.amount || 0), 0) / wonTransactions.length
            : 0,
        byProduct: groupByField(wonTransactions, 'productName', 'amount'),
        byCustomer: groupByField(wonTransactions, 'customerName', 'amount')
    };
}

function generateLeadSourceReport(crm, startDate, endDate) {
    const leads = crm?.leads || [];
    const bySource = {};

    leads.forEach(l => {
        const source = l.source || 'unknown';
        if (!bySource[source]) {
            bySource[source] = { count: 0, converted: 0 };
        }
        bySource[source].count++;
        if (l.status === 'converted') {
            bySource[source].converted++;
        }
    });

    // Calculate conversion rates
    Object.keys(bySource).forEach(source => {
        bySource[source].conversionRate = bySource[source].count > 0
            ? (bySource[source].converted / bySource[source].count * 100).toFixed(2) + '%'
            : '0%';
    });

    return {
        totalLeads: leads.length,
        bySource
    };
}

function generateSalesRepReport(crm, startDate, endDate) {
    let transactions = crm?.transactions || [];

    if (startDate) {
        transactions = transactions.filter(t => new Date(t.date) >= new Date(startDate));
    }
    if (endDate) {
        transactions = transactions.filter(t => new Date(t.date) <= new Date(endDate));
    }

    const byRep = {};

    transactions.forEach(t => {
        const rep = t.salesRepName || t.salesRepId?.toString() || 'unassigned';
        if (!byRep[rep]) {
            byRep[rep] = { deals: 0, won: 0, lost: 0, totalValue: 0, wonValue: 0 };
        }
        byRep[rep].deals++;
        byRep[rep].totalValue += t.amount || 0;

        if (t.status === 'won' || t.status === 'closed_won') {
            byRep[rep].won++;
            byRep[rep].wonValue += t.amount || 0;
        } else if (t.status === 'lost' || t.status === 'closed_lost') {
            byRep[rep].lost++;
        }
    });

    // Calculate win rates
    Object.keys(byRep).forEach(rep => {
        const closed = byRep[rep].won + byRep[rep].lost;
        byRep[rep].winRate = closed > 0
            ? (byRep[rep].won / closed * 100).toFixed(2) + '%'
            : '0%';
    });

    return { byRep };
}

function groupByField(items, field, valueField) {
    const grouped = {};
    items.forEach(item => {
        const key = item[field] || 'unknown';
        if (!grouped[key]) grouped[key] = 0;
        grouped[key] += item[valueField] || 0;
    });
    return grouped;
}

/**
 * GET /transactions/by-period - Get transactions by period
 */
router.get('/transactions/by-period', async (req, res, next) => {
    try {
        const { period = 'month', year } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('crm.transactions').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let transactions = firm.crm?.transactions || [];

        if (year) {
            transactions = transactions.filter(t => {
                const date = new Date(t.date || t.createdAt);
                return date.getFullYear() === parseInt(year);
            });
        }

        // Group by period
        const byPeriod = {};
        transactions.forEach(t => {
            const date = new Date(t.date || t.createdAt);
            let key;

            if (period === 'month') {
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            } else if (period === 'quarter') {
                const q = Math.ceil((date.getMonth() + 1) / 3);
                key = `${date.getFullYear()}-Q${q}`;
            } else {
                key = String(date.getFullYear());
            }

            if (!byPeriod[key]) {
                byPeriod[key] = { count: 0, amount: 0, won: 0, lost: 0 };
            }
            byPeriod[key].count++;
            byPeriod[key].amount += t.amount || 0;
            if (t.status === 'won') byPeriod[key].won++;
            if (t.status === 'lost') byPeriod[key].lost++;
        });

        res.json({
            success: true,
            data: byPeriod,
            period
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /transactions/trends - Get transaction trends
 */
router.get('/transactions/trends', async (req, res, next) => {
    try {
        const { months = 12 } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('crm.transactions').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const transactions = firm.crm?.transactions || [];
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - parseInt(months));

        const recentTransactions = transactions.filter(t =>
            new Date(t.date || t.createdAt) >= cutoffDate
        );

        // Monthly trends
        const monthlyTrends = {};
        recentTransactions.forEach(t => {
            const date = new Date(t.date || t.createdAt);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyTrends[key]) {
                monthlyTrends[key] = { month: key, count: 0, amount: 0 };
            }
            monthlyTrends[key].count++;
            monthlyTrends[key].amount += t.amount || 0;
        });

        const trends = Object.values(monthlyTrends).sort((a, b) => a.month.localeCompare(b.month));

        // Calculate growth
        if (trends.length >= 2) {
            const latest = trends[trends.length - 1];
            const previous = trends[trends.length - 2];

            latest.countGrowth = previous.count > 0
                ? ((latest.count - previous.count) / previous.count * 100).toFixed(2)
                : 0;
            latest.amountGrowth = previous.amount > 0
                ? ((latest.amount - previous.amount) / previous.amount * 100).toFixed(2)
                : 0;
        }

        res.json({
            success: true,
            data: {
                trends,
                period: `Last ${months} months`
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
