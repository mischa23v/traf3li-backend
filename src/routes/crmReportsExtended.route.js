/**
 * CRM Reports Extended Routes
 *
 * Extended CRM reports at /api/crm-reports for missing report types
 * Adds: revenue analysis, performance, customer, win-loss, territory reports
 *
 * Security:
 * - Multi-tenant isolation via req.firmQuery
 * - ID sanitization via sanitizeObjectId
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Lead = require('../models/lead.model');
const CrmActivity = require('../models/crmActivity.model');
const { CustomException } = require('../utils');
const { sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

// Helper to build firm filter for aggregations
const buildFirmFilter = (req) => {
    const filter = {};
    if (req.firmQuery.firmId) {
        filter.firmId = new mongoose.Types.ObjectId(req.firmQuery.firmId);
    } else if (req.firmQuery.lawyerId) {
        filter.lawyerId = new mongoose.Types.ObjectId(req.firmQuery.lawyerId);
    }
    return filter;
};

// ═══════════════════════════════════════════════════════════════
// PIPELINE REPORTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/crm-reports/pipeline/overview
 * Pipeline overview report
 */
router.get('/pipeline/overview', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);
        const { startDate, endDate } = req.query;

        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);

        const matchStage = { ...firmFilter };
        if (Object.keys(dateFilter).length > 0) {
            matchStage.createdAt = dateFilter;
        }

        const pipeline = await Lead.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalValue: { $sum: '$estimatedValue' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const totalLeads = pipeline.reduce((sum, p) => sum + p.count, 0);
        const totalValue = pipeline.reduce((sum, p) => sum + (p.totalValue || 0), 0);

        return res.json({
            success: true,
            data: {
                stages: pipeline,
                totalLeads,
                totalValue,
                avgDealSize: totalLeads > 0 ? totalValue / totalLeads : 0
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm-reports/pipeline/velocity
 * Pipeline velocity metrics
 */
router.get('/pipeline/velocity', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        const velocity = await Lead.aggregate([
            { $match: { ...firmFilter, status: { $in: ['won', 'closed'] } } },
            {
                $project: {
                    cycleTime: {
                        $divide: [
                            { $subtract: ['$closedAt', '$createdAt'] },
                            1000 * 60 * 60 * 24 // Convert to days
                        ]
                    },
                    value: '$estimatedValue'
                }
            },
            {
                $group: {
                    _id: null,
                    avgCycleTime: { $avg: '$cycleTime' },
                    minCycleTime: { $min: '$cycleTime' },
                    maxCycleTime: { $max: '$cycleTime' },
                    totalDeals: { $sum: 1 },
                    totalValue: { $sum: '$value' }
                }
            }
        ]);

        return res.json({
            success: true,
            data: velocity[0] || {
                avgCycleTime: 0,
                minCycleTime: 0,
                maxCycleTime: 0,
                totalDeals: 0,
                totalValue: 0
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm-reports/pipeline/stage-duration
 * Time spent in each stage
 */
router.get('/pipeline/stage-duration', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        // This would require stage history tracking
        // Returning placeholder data structure
        return res.json({
            success: true,
            data: {
                stages: [],
                avgTotalDuration: 0,
                bottleneckStage: null
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm-reports/pipeline/deal-aging
 * Deal aging analysis
 */
router.get('/pipeline/deal-aging', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        const aging = await Lead.aggregate([
            {
                $match: {
                    ...firmFilter,
                    status: { $nin: ['won', 'lost', 'closed'] }
                }
            },
            {
                $project: {
                    age: {
                        $divide: [
                            { $subtract: [new Date(), '$createdAt'] },
                            1000 * 60 * 60 * 24
                        ]
                    },
                    value: '$estimatedValue',
                    status: 1
                }
            },
            {
                $bucket: {
                    groupBy: '$age',
                    boundaries: [0, 7, 14, 30, 60, 90, Infinity],
                    default: 'Other',
                    output: {
                        count: { $sum: 1 },
                        totalValue: { $sum: '$value' }
                    }
                }
            }
        ]);

        return res.json({
            success: true,
            data: {
                buckets: aging,
                labels: ['0-7 days', '7-14 days', '14-30 days', '30-60 days', '60-90 days', '90+ days']
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm-reports/pipeline/movement
 * Pipeline movement/changes
 */
router.get('/pipeline/movement', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);
        const { days = 30 } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const newDeals = await Lead.countDocuments({
            ...firmFilter,
            createdAt: { $gte: startDate }
        });

        const closedDeals = await Lead.countDocuments({
            ...firmFilter,
            status: { $in: ['won', 'closed'] },
            closedAt: { $gte: startDate }
        });

        const lostDeals = await Lead.countDocuments({
            ...firmFilter,
            status: 'lost',
            closedAt: { $gte: startDate }
        });

        return res.json({
            success: true,
            data: {
                period: `Last ${days} days`,
                newDeals,
                closedDeals,
                lostDeals,
                netChange: newDeals - closedDeals - lostDeals
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

// ═══════════════════════════════════════════════════════════════
// LEADS REPORTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/crm-reports/leads/by-source
 * Leads by source analysis
 */
router.get('/leads/by-source', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        const bySource = await Lead.aggregate([
            { $match: firmFilter },
            {
                $group: {
                    _id: '$source',
                    count: { $sum: 1 },
                    totalValue: { $sum: '$estimatedValue' },
                    converted: {
                        $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] }
                    }
                }
            },
            {
                $project: {
                    source: '$_id',
                    count: 1,
                    totalValue: 1,
                    converted: 1,
                    conversionRate: {
                        $cond: [
                            { $eq: ['$count', 0] },
                            0,
                            { $multiply: [{ $divide: ['$converted', '$count'] }, 100] }
                        ]
                    }
                }
            },
            { $sort: { count: -1 } }
        ]);

        return res.json({
            success: true,
            data: bySource
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm-reports/leads/conversion-funnel
 * Lead conversion funnel
 */
router.get('/leads/conversion-funnel', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        const funnel = await Lead.aggregate([
            { $match: firmFilter },
            {
                $facet: {
                    total: [{ $count: 'count' }],
                    qualified: [
                        { $match: { status: { $in: ['qualified', 'proposal', 'negotiation', 'won'] } } },
                        { $count: 'count' }
                    ],
                    proposal: [
                        { $match: { status: { $in: ['proposal', 'negotiation', 'won'] } } },
                        { $count: 'count' }
                    ],
                    negotiation: [
                        { $match: { status: { $in: ['negotiation', 'won'] } } },
                        { $count: 'count' }
                    ],
                    won: [
                        { $match: { status: 'won' } },
                        { $count: 'count' }
                    ]
                }
            }
        ]);

        const result = funnel[0];
        const stages = [
            { stage: 'Total Leads', count: result.total[0]?.count || 0 },
            { stage: 'Qualified', count: result.qualified[0]?.count || 0 },
            { stage: 'Proposal', count: result.proposal[0]?.count || 0 },
            { stage: 'Negotiation', count: result.negotiation[0]?.count || 0 },
            { stage: 'Won', count: result.won[0]?.count || 0 }
        ];

        return res.json({
            success: true,
            data: {
                stages,
                overallConversion: stages[0].count > 0
                    ? ((stages[4].count / stages[0].count) * 100).toFixed(2)
                    : 0
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm-reports/leads/response-time
 * Lead response time analysis
 */
router.get('/leads/response-time', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        // This would require first-response tracking
        return res.json({
            success: true,
            data: {
                avgResponseTime: 0,
                medianResponseTime: 0,
                distribution: []
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm-reports/leads/velocity-rate
 * Lead velocity rate
 */
router.get('/leads/velocity-rate', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);
        const { months = 3 } = req.query;

        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - parseInt(months));

        const velocity = await Lead.aggregate([
            {
                $match: {
                    ...firmFilter,
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 },
                    totalValue: { $sum: '$estimatedValue' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        return res.json({
            success: true,
            data: velocity
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm-reports/leads/distribution
 * Lead distribution by owner
 */
router.get('/leads/distribution', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        const distribution = await Lead.aggregate([
            { $match: firmFilter },
            {
                $group: {
                    _id: '$assignedTo',
                    count: { $sum: 1 },
                    totalValue: { $sum: '$estimatedValue' },
                    won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'owner'
                }
            },
            { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    ownerName: { $concat: ['$owner.firstName', ' ', '$owner.lastName'] },
                    count: 1,
                    totalValue: 1,
                    won: 1,
                    winRate: {
                        $cond: [
                            { $eq: ['$count', 0] },
                            0,
                            { $multiply: [{ $divide: ['$won', '$count'] }, 100] }
                        ]
                    }
                }
            },
            { $sort: { count: -1 } }
        ]);

        return res.json({
            success: true,
            data: distribution
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

// ═══════════════════════════════════════════════════════════════
// ACTIVITY REPORTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/crm-reports/activities/summary
 * Activity summary
 */
router.get('/activities/summary', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);
        const { days = 30 } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const summary = await CrmActivity.aggregate([
            {
                $match: {
                    ...firmFilter,
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$activityType',
                    count: { $sum: 1 },
                    completed: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const totalActivities = summary.reduce((sum, s) => sum + s.count, 0);
        const completedActivities = summary.reduce((sum, s) => sum + s.completed, 0);

        return res.json({
            success: true,
            data: {
                byType: summary,
                totalActivities,
                completedActivities,
                completionRate: totalActivities > 0
                    ? ((completedActivities / totalActivities) * 100).toFixed(2)
                    : 0
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm-reports/activities/calls
 * Call activity report
 */
router.get('/activities/calls', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        const calls = await CrmActivity.aggregate([
            { $match: { ...firmFilter, activityType: 'call' } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 },
                    totalDuration: { $sum: '$duration' }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: 30 }
        ]);

        return res.json({
            success: true,
            data: calls
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm-reports/activities/emails
 * Email activity report
 */
router.get('/activities/emails', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        const emails = await CrmActivity.aggregate([
            { $match: { ...firmFilter, activityType: 'email' } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    sent: { $sum: 1 },
                    opened: { $sum: { $cond: ['$emailOpened', 1, 0] } },
                    clicked: { $sum: { $cond: ['$emailClicked', 1, 0] } }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: 30 }
        ]);

        return res.json({
            success: true,
            data: emails
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm-reports/activities/meetings
 * Meeting activity report
 */
router.get('/activities/meetings', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        const meetings = await CrmActivity.aggregate([
            { $match: { ...firmFilter, activityType: 'meeting' } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$scheduledAt' } },
                    scheduled: { $sum: 1 },
                    completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: 30 }
        ]);

        return res.json({
            success: true,
            data: meetings
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm-reports/activities/tasks
 * Task activity report
 */
router.get('/activities/tasks', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        const tasks = await CrmActivity.aggregate([
            { $match: { ...firmFilter, activityType: 'task' } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const overdue = await CrmActivity.countDocuments({
            ...firmFilter,
            activityType: 'task',
            status: { $ne: 'completed' },
            dueDate: { $lt: new Date() }
        });

        return res.json({
            success: true,
            data: {
                byStatus: tasks,
                overdue
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

// ═══════════════════════════════════════════════════════════════
// REVENUE REPORTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/crm-reports/revenue/forecast
 * Revenue forecast
 */
router.get('/revenue/forecast', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        const forecast = await Lead.aggregate([
            {
                $match: {
                    ...firmFilter,
                    status: { $nin: ['lost', 'closed'] }
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalValue: { $sum: '$estimatedValue' },
                    weightedValue: {
                        $sum: {
                            $multiply: ['$estimatedValue', { $divide: ['$probability', 100] }]
                        }
                    }
                }
            }
        ]);

        const totalPipeline = forecast.reduce((sum, f) => sum + (f.totalValue || 0), 0);
        const weightedForecast = forecast.reduce((sum, f) => sum + (f.weightedValue || 0), 0);

        return res.json({
            success: true,
            data: {
                byStage: forecast,
                totalPipeline,
                weightedForecast,
                forecastAccuracy: null // Would require historical data
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm-reports/revenue/analysis
 * Revenue analysis
 */
router.get('/revenue/analysis', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        const analysis = await Lead.aggregate([
            { $match: { ...firmFilter, status: 'won' } },
            {
                $group: {
                    _id: {
                        year: { $year: '$closedAt' },
                        month: { $month: '$closedAt' }
                    },
                    revenue: { $sum: '$estimatedValue' },
                    deals: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        return res.json({
            success: true,
            data: analysis
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm-reports/revenue/quota-attainment
 * Quota attainment report
 */
router.get('/revenue/quota-attainment', async (req, res) => {
    try {
        // This would require quota tracking
        return res.json({
            success: true,
            data: {
                attainment: [],
                overallAttainmentRate: 0
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm-reports/revenue/win-rate
 * Win rate analysis
 */
router.get('/revenue/win-rate', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        const rates = await Lead.aggregate([
            {
                $match: {
                    ...firmFilter,
                    status: { $in: ['won', 'lost'] }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$closedAt' },
                        month: { $month: '$closedAt' }
                    },
                    won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
                    lost: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } },
                    total: { $sum: 1 }
                }
            },
            {
                $project: {
                    won: 1,
                    lost: 1,
                    total: 1,
                    winRate: { $multiply: [{ $divide: ['$won', '$total'] }, 100] }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        return res.json({
            success: true,
            data: rates
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm-reports/revenue/deal-size
 * Deal size analysis
 */
router.get('/revenue/deal-size', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        const sizes = await Lead.aggregate([
            { $match: { ...firmFilter, status: 'won' } },
            {
                $group: {
                    _id: null,
                    avgDealSize: { $avg: '$estimatedValue' },
                    minDealSize: { $min: '$estimatedValue' },
                    maxDealSize: { $max: '$estimatedValue' },
                    totalDeals: { $sum: 1 },
                    totalValue: { $sum: '$estimatedValue' }
                }
            }
        ]);

        return res.json({
            success: true,
            data: sizes[0] || {
                avgDealSize: 0,
                minDealSize: 0,
                maxDealSize: 0,
                totalDeals: 0,
                totalValue: 0
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

// ═══════════════════════════════════════════════════════════════
// PERFORMANCE REPORTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/crm-reports/performance/leaderboard
 * Sales leaderboard
 */
router.get('/performance/leaderboard', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);
        const { period = 'month' } = req.query;

        const startDate = new Date();
        if (period === 'month') {
            startDate.setMonth(startDate.getMonth() - 1);
        } else if (period === 'quarter') {
            startDate.setMonth(startDate.getMonth() - 3);
        } else if (period === 'year') {
            startDate.setFullYear(startDate.getFullYear() - 1);
        }

        const leaderboard = await Lead.aggregate([
            {
                $match: {
                    ...firmFilter,
                    status: 'won',
                    closedAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$assignedTo',
                    dealsWon: { $sum: 1 },
                    revenue: { $sum: '$estimatedValue' }
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
                    name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
                    dealsWon: 1,
                    revenue: 1
                }
            },
            { $sort: { revenue: -1 } },
            { $limit: 10 }
        ]);

        return res.json({
            success: true,
            data: leaderboard
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm-reports/performance/team
 * Team performance
 */
router.get('/performance/team', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        const team = await Lead.aggregate([
            { $match: firmFilter },
            {
                $group: {
                    _id: '$assignedTo',
                    totalLeads: { $sum: 1 },
                    won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
                    lost: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } },
                    pipeline: { $sum: '$estimatedValue' },
                    closed: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'won'] }, '$estimatedValue', 0]
                        }
                    }
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
                    name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
                    totalLeads: 1,
                    won: 1,
                    lost: 1,
                    pipeline: 1,
                    closed: 1,
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
                    }
                }
            },
            { $sort: { closed: -1 } }
        ]);

        return res.json({
            success: true,
            data: team
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm-reports/performance/rep-scorecard/:userId
 * Individual rep scorecard
 */
router.get('/performance/rep-scorecard/:userId', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);
        const sanitizedUserId = sanitizeObjectId(req.params.userId);

        if (!sanitizedUserId) {
            throw CustomException('Invalid user ID format', 400);
        }

        const scorecard = await Lead.aggregate([
            {
                $match: {
                    ...firmFilter,
                    assignedTo: new mongoose.Types.ObjectId(sanitizedUserId)
                }
            },
            {
                $group: {
                    _id: null,
                    totalLeads: { $sum: 1 },
                    won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
                    lost: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } },
                    active: {
                        $sum: {
                            $cond: [
                                { $nin: ['$status', ['won', 'lost', 'closed']] },
                                1,
                                0
                            ]
                        }
                    },
                    totalPipeline: { $sum: '$estimatedValue' },
                    closedRevenue: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'won'] }, '$estimatedValue', 0]
                        }
                    }
                }
            }
        ]);

        return res.json({
            success: true,
            data: scorecard[0] || {
                totalLeads: 0,
                won: 0,
                lost: 0,
                active: 0,
                totalPipeline: 0,
                closedRevenue: 0
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm-reports/performance/activity-metrics
 * Activity metrics by rep
 */
router.get('/performance/activity-metrics', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        const metrics = await CrmActivity.aggregate([
            { $match: firmFilter },
            {
                $group: {
                    _id: {
                        user: '$createdBy',
                        type: '$activityType'
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: '$_id.user',
                    activities: {
                        $push: {
                            type: '$_id.type',
                            count: '$count'
                        }
                    },
                    totalActivities: { $sum: '$count' }
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
                    name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
                    activities: 1,
                    totalActivities: 1
                }
            },
            { $sort: { totalActivities: -1 } }
        ]);

        return res.json({
            success: true,
            data: metrics
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

module.exports = router;
