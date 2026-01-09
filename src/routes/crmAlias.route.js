/**
 * CRM Alias Routes
 *
 * Routes at /api/crm to match frontend expected paths
 * Maps to existing controllers and provides CRM aliases
 *
 * Security:
 * - Multi-tenant isolation via req.firmQuery
 * - Mass assignment protection via pickAllowedFields
 * - ID sanitization via sanitizeObjectId
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Lead = require('../models/lead.model');
const Appointment = require('../models/appointment.model');
const CrmPipeline = require('../models/crmPipeline.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ═══════════════════════════════════════════════════════════════
// LEAD SOURCES
// ═══════════════════════════════════════════════════════════════

const ALLOWED_SOURCE_FIELDS = [
    'name', 'nameAr', 'code', 'description', 'color', 'icon',
    'isActive', 'sortOrder', 'conversionRate', 'avgDealValue'
];

/**
 * GET /api/crm/lead-sources
 * List all lead sources
 */
router.get('/lead-sources', async (req, res) => {
    try {
        // Lead sources are typically stored in pipeline or firm settings
        const pipelines = await CrmPipeline.find({ ...req.firmQuery })
            .select('leadSources');

        const sources = pipelines.flatMap(p => p.leadSources || []);

        return res.json({
            success: true,
            count: sources.length,
            data: sources
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/crm/lead-sources
 * Create lead source
 */
router.post('/lead-sources', async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, ALLOWED_SOURCE_FIELDS);

        if (!allowedFields.name) {
            throw CustomException('Source name is required', 400);
        }

        // Get default pipeline
        const pipeline = await CrmPipeline.findOne({
            ...req.firmQuery,
            isDefault: true
        });

        if (!pipeline) {
            throw CustomException('No default pipeline found. Create a pipeline first.', 400);
        }

        const sourceId = new mongoose.Types.ObjectId();
        const sourceData = {
            _id: sourceId,
            ...allowedFields,
            createdAt: new Date(),
            createdBy: req.userID
        };

        await CrmPipeline.findOneAndUpdate(
            { _id: pipeline._id, ...req.firmQuery },
            { $push: { leadSources: sourceData } }
        );

        return res.status(201).json({
            success: true,
            message: 'Lead source created successfully',
            data: sourceData
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

// ═══════════════════════════════════════════════════════════════
// SALES STAGES
// ═══════════════════════════════════════════════════════════════

const ALLOWED_STAGE_FIELDS = [
    'name', 'nameAr', 'code', 'description', 'color', 'probability',
    'isActive', 'sortOrder', 'isWonStage', 'isLostStage', 'rottenDays'
];

/**
 * GET /api/crm/sales-stages
 * List all sales stages
 */
router.get('/sales-stages', async (req, res) => {
    try {
        const pipelines = await CrmPipeline.find({ ...req.firmQuery })
            .select('stages');

        const stages = pipelines.flatMap(p => p.stages || []);

        return res.json({
            success: true,
            count: stages.length,
            data: stages
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/crm/sales-stages
 * Create sales stage
 */
router.post('/sales-stages', async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, ALLOWED_STAGE_FIELDS);

        if (!allowedFields.name) {
            throw CustomException('Stage name is required', 400);
        }

        const pipeline = await CrmPipeline.findOne({
            ...req.firmQuery,
            isDefault: true
        });

        if (!pipeline) {
            throw CustomException('No default pipeline found. Create a pipeline first.', 400);
        }

        const stageId = new mongoose.Types.ObjectId();
        const stageData = {
            _id: stageId,
            ...allowedFields,
            createdAt: new Date(),
            createdBy: req.userID
        };

        await CrmPipeline.findOneAndUpdate(
            { _id: pipeline._id, ...req.firmQuery },
            { $push: { stages: stageData } }
        );

        return res.status(201).json({
            success: true,
            message: 'Sales stage created successfully',
            data: stageData
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

// ═══════════════════════════════════════════════════════════════
// LEADS (Alias for /api/leads)
// ═══════════════════════════════════════════════════════════════

const ALLOWED_LEAD_FIELDS = [
    'firstName', 'lastName', 'email', 'phone', 'company', 'title',
    'source', 'status', 'stage', 'estimatedValue', 'probability',
    'notes', 'tags', 'assignedTo', 'expectedCloseDate', 'customFields'
];

/**
 * GET /api/crm/leads
 * List leads (alias)
 */
router.get('/leads', async (req, res) => {
    try {
        const { search, status, stage, source, assignedTo } = req.query;
        const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 100 });

        const query = { ...req.firmQuery };

        if (status) query.status = status;
        if (stage) query.stage = stage;
        if (source) query.source = source;

        if (assignedTo) {
            const sanitizedAssignedTo = sanitizeObjectId(assignedTo);
            if (sanitizedAssignedTo) query.assignedTo = sanitizedAssignedTo;
        }

        if (search && search.trim()) {
            const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
            query.$or = [
                { firstName: searchRegex },
                { lastName: searchRegex },
                { email: searchRegex },
                { company: searchRegex }
            ];
        }

        const [leads, total] = await Promise.all([
            Lead.find(query)
                .populate('assignedTo', 'firstName lastName email')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Lead.countDocuments(query)
        ]);

        return res.json({
            success: true,
            count: leads.length,
            data: leads,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/crm/leads
 * Create lead (alias)
 */
router.post('/leads', async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, ALLOWED_LEAD_FIELDS);

        if (!allowedFields.email && !allowedFields.phone) {
            throw CustomException('Email or phone is required', 400);
        }

        const lead = await Lead.create(req.addFirmId({
            ...allowedFields,
            createdBy: req.userID
        }));

        return res.status(201).json({
            success: true,
            message: 'Lead created successfully',
            data: lead
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

// ═══════════════════════════════════════════════════════════════
// APPOINTMENTS (Alias for /api/appointments)
// ═══════════════════════════════════════════════════════════════

const ALLOWED_APPOINTMENT_FIELDS = [
    'title', 'description', 'startTime', 'endTime', 'duration',
    'type', 'status', 'location', 'meetingUrl', 'attendees',
    'relatedTo', 'relatedId', 'assignedTo', 'reminder', 'notes'
];

/**
 * GET /api/crm/appointments
 * List appointments (alias)
 */
router.get('/appointments', async (req, res) => {
    try {
        const { startDate, endDate, status, type, assignedTo } = req.query;
        const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 100 });

        const query = { ...req.firmQuery };

        if (status) query.status = status;
        if (type) query.type = type;

        if (assignedTo) {
            const sanitizedAssignedTo = sanitizeObjectId(assignedTo);
            if (sanitizedAssignedTo) query.assignedTo = sanitizedAssignedTo;
        }

        if (startDate || endDate) {
            query.startTime = {};
            if (startDate) query.startTime.$gte = new Date(startDate);
            if (endDate) query.startTime.$lte = new Date(endDate);
        }

        const [appointments, total] = await Promise.all([
            Appointment.find(query)
                .populate('assignedTo', 'firstName lastName email')
                .populate('attendees.user', 'firstName lastName email')
                .skip(skip)
                .limit(limit)
                .sort({ startTime: 1 }),
            Appointment.countDocuments(query)
        ]);

        return res.json({
            success: true,
            count: appointments.length,
            data: appointments,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/crm/appointments
 * Create appointment (alias)
 */
router.post('/appointments', async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, ALLOWED_APPOINTMENT_FIELDS);

        if (!allowedFields.title) {
            throw CustomException('Appointment title is required', 400);
        }

        if (!allowedFields.startTime) {
            throw CustomException('Start time is required', 400);
        }

        // Set default duration if not provided
        if (!allowedFields.duration && !allowedFields.endTime) {
            allowedFields.duration = 30; // 30 minutes default
        }

        const appointment = await Appointment.create(req.addFirmId({
            ...allowedFields,
            createdBy: req.userID
        }));

        return res.status(201).json({
            success: true,
            message: 'Appointment created successfully',
            data: appointment
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

// ═══════════════════════════════════════════════════════════════
// CRM REPORTS ALIAS (maps to /api/crm/reports/...)
// ═══════════════════════════════════════════════════════════════

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

/**
 * GET /api/crm/reports/revenue/analysis
 * Revenue analysis report
 */
router.get('/reports/revenue/analysis', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);
        const { startDate, endDate, groupBy = 'month' } = req.query;

        const matchStage = { ...firmFilter, status: 'won' };

        if (startDate || endDate) {
            matchStage.closedAt = {};
            if (startDate) matchStage.closedAt.$gte = new Date(startDate);
            if (endDate) matchStage.closedAt.$lte = new Date(endDate);
        }

        const groupByFormat = groupBy === 'week' ? '%Y-W%V' :
            groupBy === 'day' ? '%Y-%m-%d' : '%Y-%m';

        const analysis = await Lead.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: { $dateToString: { format: groupByFormat, date: '$closedAt' } },
                    revenue: { $sum: '$estimatedValue' },
                    deals: { $sum: 1 },
                    avgDealSize: { $avg: '$estimatedValue' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const totals = {
            totalRevenue: analysis.reduce((sum, a) => sum + (a.revenue || 0), 0),
            totalDeals: analysis.reduce((sum, a) => sum + a.deals, 0)
        };

        return res.json({
            success: true,
            data: {
                periods: analysis,
                ...totals,
                avgDealSize: totals.totalDeals > 0 ? totals.totalRevenue / totals.totalDeals : 0
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm/reports/revenue/quota-attainment
 * Quota attainment report
 */
router.get('/reports/revenue/quota-attainment', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);
        const { year, quarter } = req.query;

        const targetYear = year ? parseInt(year) : new Date().getFullYear();

        const pipeline = await Lead.aggregate([
            {
                $match: {
                    ...firmFilter,
                    status: 'won',
                    closedAt: {
                        $gte: new Date(`${targetYear}-01-01`),
                        $lte: new Date(`${targetYear}-12-31`)
                    }
                }
            },
            {
                $group: {
                    _id: {
                        month: { $month: '$closedAt' },
                        rep: '$assignedTo'
                    },
                    achieved: { $sum: '$estimatedValue' }
                }
            }
        ]);

        return res.json({
            success: true,
            data: {
                year: targetYear,
                attainment: pipeline
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm/reports/revenue/win-rate
 * Win rate report
 */
router.get('/reports/revenue/win-rate', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);
        const { startDate, endDate } = req.query;

        const matchStage = {
            ...firmFilter,
            status: { $in: ['won', 'lost'] }
        };

        if (startDate || endDate) {
            matchStage.closedAt = {};
            if (startDate) matchStage.closedAt.$gte = new Date(startDate);
            if (endDate) matchStage.closedAt.$lte = new Date(endDate);
        }

        const results = await Lead.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
                    lost: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } },
                    total: { $sum: 1 }
                }
            }
        ]);

        const data = results[0] || { won: 0, lost: 0, total: 0 };

        return res.json({
            success: true,
            data: {
                ...data,
                winRate: data.total > 0 ? (data.won / data.total * 100).toFixed(2) : 0
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm/reports/revenue/deal-size
 * Deal size distribution report
 */
router.get('/reports/revenue/deal-size', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        const distribution = await Lead.aggregate([
            { $match: { ...firmFilter, status: 'won' } },
            {
                $bucket: {
                    groupBy: '$estimatedValue',
                    boundaries: [0, 10000, 50000, 100000, 500000, 1000000, Infinity],
                    default: 'Other',
                    output: {
                        count: { $sum: 1 },
                        totalValue: { $sum: '$estimatedValue' }
                    }
                }
            }
        ]);

        return res.json({
            success: true,
            data: distribution
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm/reports/performance/leaderboard
 * Sales leaderboard
 */
router.get('/reports/performance/leaderboard', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);
        const { period = 'month' } = req.query;

        const now = new Date();
        let startDate;

        if (period === 'week') {
            startDate = new Date(now.setDate(now.getDate() - 7));
        } else if (period === 'quarter') {
            startDate = new Date(now.setMonth(now.getMonth() - 3));
        } else if (period === 'year') {
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        } else {
            startDate = new Date(now.setMonth(now.getMonth() - 1));
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
                    totalRevenue: { $sum: '$estimatedValue' },
                    dealsWon: { $sum: 1 },
                    avgDealSize: { $avg: '$estimatedValue' }
                }
            },
            { $sort: { totalRevenue: -1 } },
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
 * GET /api/crm/reports/performance/team
 * Team performance report
 */
router.get('/reports/performance/team', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        const teamStats = await Lead.aggregate([
            { $match: firmFilter },
            {
                $group: {
                    _id: '$assignedTo',
                    totalLeads: { $sum: 1 },
                    wonDeals: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
                    lostDeals: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } },
                    totalValue: { $sum: '$estimatedValue' },
                    wonValue: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'won'] }, '$estimatedValue', 0]
                        }
                    }
                }
            }
        ]);

        return res.json({
            success: true,
            data: teamStats
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm/reports/performance/rep-scorecard/:userId
 * Individual rep scorecard
 */
router.get('/reports/performance/rep-scorecard/:userId', async (req, res) => {
    try {
        const sanitizedUserId = sanitizeObjectId(req.params.userId);
        if (!sanitizedUserId) {
            throw CustomException('Invalid user ID format', 400);
        }

        const firmFilter = buildFirmFilter(req);

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
                    wonDeals: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
                    lostDeals: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } },
                    openDeals: {
                        $sum: {
                            $cond: [{ $nin: ['$status', ['won', 'lost']] }, 1, 0]
                        }
                    },
                    totalRevenue: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'won'] }, '$estimatedValue', 0]
                        }
                    },
                    pipelineValue: {
                        $sum: {
                            $cond: [{ $nin: ['$status', ['won', 'lost']] }, '$estimatedValue', 0]
                        }
                    }
                }
            }
        ]);

        const data = scorecard[0] || {
            totalLeads: 0,
            wonDeals: 0,
            lostDeals: 0,
            openDeals: 0,
            totalRevenue: 0,
            pipelineValue: 0
        };

        data.winRate = (data.wonDeals + data.lostDeals) > 0
            ? ((data.wonDeals / (data.wonDeals + data.lostDeals)) * 100).toFixed(2)
            : 0;

        return res.json({
            success: true,
            data
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm/reports/performance/activity-metrics
 * Activity metrics report
 */
router.get('/reports/performance/activity-metrics', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);
        const { startDate, endDate } = req.query;

        const matchStage = { ...firmFilter };

        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) matchStage.createdAt.$lte = new Date(endDate);
        }

        const appointmentMetrics = await Appointment.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            }
        ]);

        return res.json({
            success: true,
            data: {
                activities: appointmentMetrics
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm/reports/customer/lifetime-value
 * Customer lifetime value report
 */
router.get('/reports/customer/lifetime-value', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        const ltv = await Lead.aggregate([
            { $match: { ...firmFilter, status: 'won' } },
            {
                $group: {
                    _id: '$company',
                    totalValue: { $sum: '$estimatedValue' },
                    dealCount: { $sum: 1 },
                    avgDealSize: { $avg: '$estimatedValue' },
                    firstDeal: { $min: '$closedAt' },
                    lastDeal: { $max: '$closedAt' }
                }
            },
            { $sort: { totalValue: -1 } },
            { $limit: 50 }
        ]);

        return res.json({
            success: true,
            data: ltv
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm/reports/customer/churn
 * Customer churn report
 */
router.get('/reports/customer/churn', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        // Simplified churn analysis - customers who haven't had deals in 12 months
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const atRisk = await Lead.aggregate([
            { $match: { ...firmFilter, status: 'won' } },
            {
                $group: {
                    _id: '$company',
                    lastDeal: { $max: '$closedAt' },
                    totalDeals: { $sum: 1 }
                }
            },
            { $match: { lastDeal: { $lt: twelveMonthsAgo } } },
            { $sort: { lastDeal: -1 } }
        ]);

        return res.json({
            success: true,
            data: {
                atRiskCustomers: atRisk,
                count: atRisk.length
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm/reports/customer/health-score
 * Customer health score report
 */
router.get('/reports/customer/health-score', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        const customers = await Lead.aggregate([
            { $match: { ...firmFilter, status: 'won' } },
            {
                $group: {
                    _id: '$company',
                    totalValue: { $sum: '$estimatedValue' },
                    dealCount: { $sum: 1 },
                    lastDeal: { $max: '$closedAt' }
                }
            },
            {
                $addFields: {
                    // Simple health score based on recency and frequency
                    healthScore: {
                        $multiply: [
                            { $min: [{ $divide: ['$dealCount', 5] }, 1] },
                            100
                        ]
                    }
                }
            },
            { $sort: { healthScore: -1 } },
            { $limit: 100 }
        ]);

        return res.json({
            success: true,
            data: customers
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm/reports/customer/engagement
 * Customer engagement report
 */
router.get('/reports/customer/engagement', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        // Count leads and appointments per customer
        const engagement = await Lead.aggregate([
            { $match: firmFilter },
            {
                $group: {
                    _id: '$company',
                    leads: { $sum: 1 },
                    wonDeals: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } }
                }
            },
            { $sort: { leads: -1 } },
            { $limit: 50 }
        ]);

        return res.json({
            success: true,
            data: engagement
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm/reports/win-loss/analysis
 * Win/loss analysis report
 */
router.get('/reports/win-loss/analysis', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        const analysis = await Lead.aggregate([
            { $match: { ...firmFilter, status: { $in: ['won', 'lost'] } } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalValue: { $sum: '$estimatedValue' },
                    avgValue: { $avg: '$estimatedValue' }
                }
            }
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
 * GET /api/crm/reports/win-loss/lost-deals
 * Lost deals analysis
 */
router.get('/reports/win-loss/lost-deals', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);
        const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 50 });

        const [lostDeals, total] = await Promise.all([
            Lead.find({ ...firmFilter, status: 'lost' })
                .populate('assignedTo', 'firstName lastName')
                .skip(skip)
                .limit(limit)
                .sort({ closedAt: -1 }),
            Lead.countDocuments({ ...firmFilter, status: 'lost' })
        ]);

        return res.json({
            success: true,
            count: lostDeals.length,
            data: lostDeals,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm/reports/win-loss/competitors
 * Competitor analysis in losses
 */
router.get('/reports/win-loss/competitors', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        const competitors = await Lead.aggregate([
            { $match: { ...firmFilter, status: 'lost', lostToCompetitor: { $exists: true, $ne: null } } },
            {
                $group: {
                    _id: '$lostToCompetitor',
                    lossCount: { $sum: 1 },
                    totalLostValue: { $sum: '$estimatedValue' }
                }
            },
            { $sort: { lossCount: -1 } }
        ]);

        return res.json({
            success: true,
            data: competitors
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm/reports/territory/performance
 * Territory performance report
 */
router.get('/reports/territory/performance', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        const performance = await Lead.aggregate([
            { $match: firmFilter },
            {
                $group: {
                    _id: '$territory',
                    totalLeads: { $sum: 1 },
                    wonDeals: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
                    revenue: {
                        $sum: { $cond: [{ $eq: ['$status', 'won'] }, '$estimatedValue', 0] }
                    },
                    pipelineValue: {
                        $sum: { $cond: [{ $nin: ['$status', ['won', 'lost']] }, '$estimatedValue', 0] }
                    }
                }
            },
            { $sort: { revenue: -1 } }
        ]);

        return res.json({
            success: true,
            data: performance
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm/reports/territory/regional-sales
 * Regional sales report
 */
router.get('/reports/territory/regional-sales', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        const regional = await Lead.aggregate([
            { $match: { ...firmFilter, status: 'won' } },
            {
                $group: {
                    _id: { region: '$region', territory: '$territory' },
                    revenue: { $sum: '$estimatedValue' },
                    deals: { $sum: 1 }
                }
            },
            { $sort: { revenue: -1 } }
        ]);

        return res.json({
            success: true,
            data: regional
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/crm/reports/territory/geographic-pipeline
 * Geographic pipeline report
 */
router.get('/reports/territory/geographic-pipeline', async (req, res) => {
    try {
        const firmFilter = buildFirmFilter(req);

        const geographic = await Lead.aggregate([
            { $match: { ...firmFilter, status: { $nin: ['won', 'lost'] } } },
            {
                $group: {
                    _id: { country: '$country', city: '$city' },
                    pipelineValue: { $sum: '$estimatedValue' },
                    dealCount: { $sum: 1 }
                }
            },
            { $sort: { pipelineValue: -1 } }
        ]);

        return res.json({
            success: true,
            data: geographic
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

module.exports = router;
