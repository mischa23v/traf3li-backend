/**
 * Chart Reports Controller
 *
 * Provides monthly chart data for Cases, Revenue, and Tasks.
 * Used by frontend dashboard charts.
 *
 * NOTE: Tenant context (req.firmQuery) is set by authenticatedApi middleware.
 * The globalFirmIsolation Mongoose plugin enforces tenant filters on all queries.
 * See .claude/FIRM_ISOLATION.md for patterns.
 */

const Case = require('../models/case.model');
const Invoice = require('../models/invoice.model');
const Expense = require('../models/expense.model');
const Task = require('../models/task.model');
const asyncHandler = require('../utils/asyncHandler');
const { pickAllowedFields } = require('../utils/securityUtils');
const mongoose = require('mongoose');

// Month abbreviations
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Get Cases Chart Data
 * GET /api/v1/reports/cases-chart?months=12
 *
 * Returns monthly breakdown of cases: total, opened, closed, pending
 */
const getCasesChart = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const allowedParams = pickAllowedFields(req.query, ['months']);
    const months = Math.min(Math.max(parseInt(allowedParams.months) || 12, 1), 24);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    // Build tenant filter from req.firmQuery
    const tenantFilter = {};
    if (req.firmQuery) {
        if (req.firmQuery.firmId) {
            tenantFilter.firmId = new mongoose.Types.ObjectId(req.firmQuery.firmId);
        }
        if (req.firmQuery.lawyerId) {
            tenantFilter.lawyerId = new mongoose.Types.ObjectId(req.firmQuery.lawyerId);
        }
    }

    // Aggregate cases by month
    const casesData = await Case.aggregate([
        {
            $match: {
                ...tenantFilter,
                createdAt: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' }
                },
                total: { $sum: 1 },
                opened: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
                    }
                },
                closed: {
                    $sum: {
                        $cond: [
                            { $in: ['$status', ['closed', 'completed', 'won', 'lost', 'settled']] },
                            1,
                            0
                        ]
                    }
                },
                pending: {
                    $sum: {
                        $cond: [
                            { $in: ['$status', ['on-hold', 'appeal', 'settlement']] },
                            1,
                            0
                        ]
                    }
                }
            }
        },
        {
            $sort: { '_id.year': 1, '_id.month': 1 }
        }
    ]);

    // Build result with all months (including empty ones)
    const data = [];
    const tempDate = new Date(startDate);

    while (tempDate <= endDate) {
        const year = tempDate.getFullYear();
        const month = tempDate.getMonth() + 1; // MongoDB months are 1-indexed
        const monthName = MONTH_NAMES[month - 1];

        // Find matching data or use defaults
        const monthData = casesData.find(
            d => d._id.year === year && d._id.month === month
        );

        data.push({
            month: monthName,
            total: monthData?.total || 0,
            opened: monthData?.opened || 0,
            closed: monthData?.closed || 0,
            pending: monthData?.pending || 0
        });

        tempDate.setMonth(tempDate.getMonth() + 1);
    }

    res.status(200).json({
        success: true,
        report: 'Cases Chart',
        period: {
            months,
            startDate: startDate.toISOString().split('T')[0]
        },
        data
    });
});

/**
 * Get Revenue Chart Data
 * GET /api/v1/reports/revenue-chart?months=12
 *
 * Returns monthly breakdown: revenue, collected, expenses, profit, invoiceCount, collectionRate
 */
const getRevenueChart = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const allowedParams = pickAllowedFields(req.query, ['months']);
    const months = Math.min(Math.max(parseInt(allowedParams.months) || 12, 1), 24);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    // Build tenant filter from req.firmQuery
    const tenantFilter = {};
    if (req.firmQuery) {
        if (req.firmQuery.firmId) {
            tenantFilter.firmId = new mongoose.Types.ObjectId(req.firmQuery.firmId);
        }
        if (req.firmQuery.lawyerId) {
            tenantFilter.lawyerId = new mongoose.Types.ObjectId(req.firmQuery.lawyerId);
        }
    }

    // Aggregate invoices by month
    const invoiceData = await Invoice.aggregate([
        {
            $match: {
                ...tenantFilter,
                issueDate: { $gte: startDate, $lte: endDate },
                status: { $nin: ['draft', 'void', 'cancelled'] }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$issueDate' },
                    month: { $month: '$issueDate' }
                },
                revenue: { $sum: '$totalAmount' },
                collected: { $sum: '$amountPaid' },
                invoiceCount: { $sum: 1 }
            }
        },
        {
            $sort: { '_id.year': 1, '_id.month': 1 }
        }
    ]);

    // Aggregate expenses by month
    const expenseData = await Expense.aggregate([
        {
            $match: {
                ...tenantFilter,
                date: { $gte: startDate, $lte: endDate },
                status: { $ne: 'void' }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$date' },
                    month: { $month: '$date' }
                },
                expenses: { $sum: '$amount' }
            }
        },
        {
            $sort: { '_id.year': 1, '_id.month': 1 }
        }
    ]);

    // Build result with all months
    const data = [];
    const tempDate = new Date(startDate);

    while (tempDate <= endDate) {
        const year = tempDate.getFullYear();
        const month = tempDate.getMonth() + 1;
        const monthName = MONTH_NAMES[month - 1];

        // Find matching invoice data
        const invoiceMonth = invoiceData.find(
            d => d._id.year === year && d._id.month === month
        );

        // Find matching expense data
        const expenseMonth = expenseData.find(
            d => d._id.year === year && d._id.month === month
        );

        const revenue = invoiceMonth?.revenue || 0;
        const collected = invoiceMonth?.collected || 0;
        const expenses = expenseMonth?.expenses || 0;
        const profit = collected - expenses;
        const collectionRate = revenue > 0 ? Math.round((collected / revenue) * 100) : 0;

        data.push({
            month: monthName,
            revenue,
            collected,
            expenses,
            profit,
            invoiceCount: invoiceMonth?.invoiceCount || 0,
            collectionRate
        });

        tempDate.setMonth(tempDate.getMonth() + 1);
    }

    res.status(200).json({
        success: true,
        report: 'Revenue Chart',
        period: {
            months,
            startDate: startDate.toISOString().split('T')[0]
        },
        data
    });
});

/**
 * Get Tasks Chart Data
 * GET /api/v1/reports/tasks-chart?months=12
 *
 * Returns monthly breakdown: total, completed, inProgress, pending, overdue, completionRate
 */
const getTasksChart = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const allowedParams = pickAllowedFields(req.query, ['months']);
    const months = Math.min(Math.max(parseInt(allowedParams.months) || 12, 1), 24);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    // Build tenant filter from req.firmQuery
    const tenantFilter = {};
    if (req.firmQuery) {
        if (req.firmQuery.firmId) {
            tenantFilter.firmId = new mongoose.Types.ObjectId(req.firmQuery.firmId);
        }
        if (req.firmQuery.lawyerId) {
            tenantFilter.lawyerId = new mongoose.Types.ObjectId(req.firmQuery.lawyerId);
        }
    }

    // Aggregate tasks by month
    const tasksData = await Task.aggregate([
        {
            $match: {
                ...tenantFilter,
                createdAt: { $gte: startDate, $lte: endDate },
                isTemplate: { $ne: true }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' }
                },
                total: { $sum: 1 },
                completed: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'done'] }, 1, 0]
                    }
                },
                inProgress: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0]
                    }
                },
                pending: {
                    $sum: {
                        $cond: [
                            { $in: ['$status', ['todo', 'backlog']] },
                            1,
                            0
                        ]
                    }
                },
                overdue: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $ne: ['$status', 'done'] },
                                    { $ne: ['$status', 'canceled'] },
                                    { $ne: ['$dueDate', null] },
                                    { $lt: ['$dueDate', new Date()] }
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
            $sort: { '_id.year': 1, '_id.month': 1 }
        }
    ]);

    // Build result with all months
    const data = [];
    const tempDate = new Date(startDate);

    while (tempDate <= endDate) {
        const year = tempDate.getFullYear();
        const month = tempDate.getMonth() + 1;
        const monthName = MONTH_NAMES[month - 1];

        // Find matching data
        const monthData = tasksData.find(
            d => d._id.year === year && d._id.month === month
        );

        const total = monthData?.total || 0;
        const completed = monthData?.completed || 0;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        data.push({
            month: monthName,
            total,
            completed,
            inProgress: monthData?.inProgress || 0,
            pending: monthData?.pending || 0,
            overdue: monthData?.overdue || 0,
            completionRate
        });

        tempDate.setMonth(tempDate.getMonth() + 1);
    }

    res.status(200).json({
        success: true,
        report: 'Tasks Chart',
        period: {
            months,
            startDate: startDate.toISOString().split('T')[0]
        },
        data
    });
});

module.exports = {
    getCasesChart,
    getRevenueChart,
    getTasksChart
};
