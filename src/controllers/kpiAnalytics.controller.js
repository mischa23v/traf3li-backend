const mongoose = require('mongoose');
const { Case, Invoice, Document, User } = require('../models');
const TimeEntry = require('../models/timeEntry.model');
const { CustomException } = require('../utils');

/**
 * Get KPI Dashboard - All key metrics for firm performance
 * GET /api/analytics/kpi-dashboard
 */
const getKPIDashboard = async (req, res) => {
    try {
        const firmId = req.firmId;
        const { period = '30' } = req.query; // days

        if (!firmId) {
            throw CustomException('Firm ID is required', 400);
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        // Parallel queries for performance
        const [
            caseStats,
            revenueStats,
            activationStats
        ] = await Promise.all([
            // Case Throughput Stats
            Case.aggregate([
                { $match: { firmId: new mongoose.Types.ObjectId(firmId) } },
                {
                    $group: {
                        _id: null,
                        totalCases: { $sum: 1 },
                        activeCases: {
                            $sum: { $cond: [{ $in: ['$status', ['active', 'open', 'in_progress', 'ongoing']] }, 1, 0] }
                        },
                        closedCases: {
                            $sum: { $cond: [{ $in: ['$status', ['closed', 'completed']] }, 1, 0] }
                        },
                        avgCycleTime: {
                            $avg: {
                                $cond: [
                                    { $in: ['$status', ['closed', 'completed']] },
                                    '$daysOpen',
                                    null
                                ]
                            }
                        },
                        closedThisPeriod: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $in: ['$status', ['closed', 'completed']] },
                                            { $gte: ['$dateClosed', startDate] }
                                        ]
                                    },
                                    1, 0
                                ]
                            }
                        },
                        openedThisPeriod: {
                            $sum: {
                                $cond: [
                                    { $gte: ['$createdAt', startDate] },
                                    1, 0
                                ]
                            }
                        },
                        wonCases: {
                            $sum: { $cond: [{ $eq: ['$outcome', 'won'] }, 1, 0] }
                        },
                        lostCases: {
                            $sum: { $cond: [{ $eq: ['$outcome', 'lost'] }, 1, 0] }
                        },
                        settledCases: {
                            $sum: { $cond: [{ $eq: ['$outcome', 'settled'] }, 1, 0] }
                        }
                    }
                }
            ]),

            // Revenue Stats
            Invoice.aggregate([
                { $match: { firmId: new mongoose.Types.ObjectId(firmId) } },
                {
                    $group: {
                        _id: null,
                        totalInvoiced: { $sum: '$total' },
                        totalPaid: { $sum: '$amountPaid' },
                        invoicedThisPeriod: {
                            $sum: {
                                $cond: [{ $gte: ['$createdAt', startDate] }, '$total', 0]
                            }
                        },
                        paidThisPeriod: {
                            $sum: {
                                $cond: [{ $gte: ['$paidDate', startDate] }, '$amountPaid', 0]
                            }
                        },
                        invoiceCount: { $sum: 1 },
                        invoicesThisPeriod: {
                            $sum: {
                                $cond: [{ $gte: ['$createdAt', startDate] }, 1, 0]
                            }
                        }
                    }
                }
            ]),

            // User Activation Stats (time entries, documents)
            Promise.all([
                TimeEntry.countDocuments({
                    firmId: new mongoose.Types.ObjectId(firmId),
                    createdAt: { $gte: startDate }
                }),
                Document.countDocuments({
                    firmId: new mongoose.Types.ObjectId(firmId),
                    createdAt: { $gte: startDate }
                }),
                TimeEntry.aggregate([
                    {
                        $match: {
                            firmId: new mongoose.Types.ObjectId(firmId),
                            createdAt: { $gte: startDate }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalHours: { $sum: '$duration' }
                        }
                    }
                ])
            ])
        ]);

        const cases = caseStats[0] || {};
        const revenue = revenueStats[0] || {};
        const [timeEntriesCount, documentsCount, timeHoursResult] = activationStats;
        const totalHours = timeHoursResult[0]?.totalHours || 0;

        // Calculate derived metrics
        const collectionRate = revenue.totalInvoiced > 0
            ? Math.round((revenue.totalPaid / revenue.totalInvoiced) * 100)
            : 0;

        const revenuePerCase = cases.closedCases > 0
            ? Math.round(revenue.totalPaid / cases.closedCases)
            : 0;

        // Calculate success rate from completed cases
        const completedCases = (cases.wonCases || 0) + (cases.lostCases || 0) + (cases.settledCases || 0);
        const successRate = completedCases > 0
            ? Math.round(((cases.wonCases || 0) / completedCases) * 100)
            : 0;

        res.json({
            error: false,
            data: {
                // Case Throughput
                caseMetrics: {
                    total: cases.totalCases || 0,
                    active: cases.activeCases || 0,
                    closed: cases.closedCases || 0,
                    closedThisPeriod: cases.closedThisPeriod || 0,
                    openedThisPeriod: cases.openedThisPeriod || 0,
                    avgCycleTime: Math.round(cases.avgCycleTime || 0),
                    won: cases.wonCases || 0,
                    lost: cases.lostCases || 0,
                    settled: cases.settledCases || 0,
                    successRate
                },

                // Revenue
                revenueMetrics: {
                    totalInvoiced: revenue.totalInvoiced || 0,
                    totalPaid: revenue.totalPaid || 0,
                    invoicedThisPeriod: revenue.invoicedThisPeriod || 0,
                    paidThisPeriod: revenue.paidThisPeriod || 0,
                    collectionRate,
                    revenuePerCase,
                    invoiceCount: revenue.invoiceCount || 0,
                    invoicesThisPeriod: revenue.invoicesThisPeriod || 0
                },

                // User Activation
                activationMetrics: {
                    timeEntriesThisPeriod: timeEntriesCount,
                    documentsThisPeriod: documentsCount,
                    billableHoursThisPeriod: Math.round(totalHours / 60), // Convert minutes to hours
                    activationRate: cases.totalCases > 0
                        ? Math.round((cases.activeCases / cases.totalCases) * 100)
                        : 0
                },

                // Meta
                period: parseInt(period),
                generatedAt: new Date()
            }
        });
    } catch ({ message, status = 500 }) {
        res.status(status).json({ error: true, message });
    }
};

/**
 * Get Revenue by Case - Detailed revenue breakdown per case
 * GET /api/analytics/revenue-by-case
 */
const getRevenueByCase = async (req, res) => {
    try {
        const { startDate, endDate, limit = 50, page = 1 } = req.query;
        const firmId = req.firmId;

        if (!firmId) {
            throw CustomException('Firm ID is required', 400);
        }

        const matchStage = {
            firmId: new mongoose.Types.ObjectId(firmId),
            caseId: { $exists: true, $ne: null }
        };

        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) matchStage.createdAt.$lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const revenueByCase = await Invoice.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$caseId',
                    totalInvoiced: { $sum: '$total' },
                    totalPaid: { $sum: '$amountPaid' },
                    invoiceCount: { $sum: 1 },
                    lastInvoiceDate: { $max: '$createdAt' }
                }
            },
            {
                $lookup: {
                    from: 'cases',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'case'
                }
            },
            { $unwind: '$case' },
            {
                $project: {
                    caseId: '$_id',
                    caseNumber: '$case.caseNumber',
                    caseTitle: '$case.title',
                    caseStatus: '$case.status',
                    caseOutcome: '$case.outcome',
                    totalInvoiced: 1,
                    totalPaid: 1,
                    invoiceCount: 1,
                    lastInvoiceDate: 1,
                    outstanding: { $subtract: ['$totalInvoiced', '$totalPaid'] },
                    collectionRate: {
                        $cond: [
                            { $eq: ['$totalInvoiced', 0] },
                            0,
                            { $multiply: [{ $divide: ['$totalPaid', '$totalInvoiced'] }, 100] }
                        ]
                    }
                }
            },
            { $sort: { totalInvoiced: -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) }
        ]);

        // Get total count for pagination
        const totalCount = await Invoice.aggregate([
            { $match: matchStage },
            { $group: { _id: '$caseId' } },
            { $count: 'total' }
        ]);

        const total = totalCount[0]?.total || 0;

        res.json({
            error: false,
            data: revenueByCase,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch ({ message, status = 500 }) {
        res.status(status).json({ error: true, message });
    }
};

/**
 * Get Case Throughput - Detailed case statistics
 * GET /api/analytics/case-throughput
 */
const getCaseThroughput = async (req, res) => {
    try {
        const firmId = req.firmId;
        const { period = '30', groupBy = 'week' } = req.query;

        if (!firmId) {
            throw CustomException('Firm ID is required', 400);
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        // Get cases grouped by time period
        const dateGroupFormat = groupBy === 'day'
            ? { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            : groupBy === 'month'
                ? { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
                : { // week
                    $dateToString: {
                        format: '%Y-W%V',
                        date: '$createdAt'
                    }
                };

        const throughputData = await Case.aggregate([
            {
                $match: {
                    firmId: new mongoose.Types.ObjectId(firmId),
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: dateGroupFormat,
                    opened: { $sum: 1 },
                    closed: {
                        $sum: {
                            $cond: [{ $in: ['$status', ['closed', 'completed']] }, 1, 0]
                        }
                    },
                    avgDaysOpen: { $avg: '$daysOpen' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Get by category breakdown
        const byCategory = await Case.aggregate([
            {
                $match: {
                    firmId: new mongoose.Types.ObjectId(firmId),
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    avgCycleTime: { $avg: '$daysOpen' },
                    closed: {
                        $sum: {
                            $cond: [{ $in: ['$status', ['closed', 'completed']] }, 1, 0]
                        }
                    }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Get by outcome breakdown
        const byOutcome = await Case.aggregate([
            {
                $match: {
                    firmId: new mongoose.Types.ObjectId(firmId),
                    outcome: { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: '$outcome',
                    count: { $sum: 1 },
                    avgCycleTime: { $avg: '$daysOpen' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        res.json({
            error: false,
            data: {
                timeline: throughputData,
                byCategory,
                byOutcome,
                period: parseInt(period),
                groupBy
            }
        });
    } catch ({ message, status = 500 }) {
        res.status(status).json({ error: true, message });
    }
};

/**
 * Get User Activation Metrics
 * GET /api/analytics/user-activation
 */
const getUserActivation = async (req, res) => {
    try {
        const firmId = req.firmId;
        const { period = '30' } = req.query;

        if (!firmId) {
            throw CustomException('Firm ID is required', 400);
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        // Get user activity breakdown
        const [timeEntryStats, documentStats, caseActivityStats] = await Promise.all([
            // Time entries by user
            TimeEntry.aggregate([
                {
                    $match: {
                        firmId: new mongoose.Types.ObjectId(firmId),
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: '$userId',
                        totalEntries: { $sum: 1 },
                        totalMinutes: { $sum: '$duration' },
                        billableMinutes: {
                            $sum: {
                                $cond: ['$billable', '$duration', 0]
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
                        userId: '$_id',
                        userName: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
                        totalEntries: 1,
                        totalHours: { $divide: ['$totalMinutes', 60] },
                        billableHours: { $divide: ['$billableMinutes', 60] }
                    }
                },
                { $sort: { totalHours: -1 } }
            ]),

            // Documents by user
            Document.aggregate([
                {
                    $match: {
                        firmId: new mongoose.Types.ObjectId(firmId),
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: '$uploadedBy',
                        documentCount: { $sum: 1 }
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
                        documentCount: 1
                    }
                },
                { $sort: { documentCount: -1 } }
            ]),

            // Cases handled by user
            Case.aggregate([
                {
                    $match: {
                        firmId: new mongoose.Types.ObjectId(firmId),
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: '$lawyerId',
                        casesCreated: { $sum: 1 },
                        casesClosed: {
                            $sum: {
                                $cond: [{ $in: ['$status', ['closed', 'completed']] }, 1, 0]
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
                        userId: '$_id',
                        userName: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
                        casesCreated: 1,
                        casesClosed: 1
                    }
                },
                { $sort: { casesCreated: -1 } }
            ])
        ]);

        res.json({
            error: false,
            data: {
                timeEntries: timeEntryStats,
                documents: documentStats,
                cases: caseActivityStats,
                period: parseInt(period)
            }
        });
    } catch ({ message, status = 500 }) {
        res.status(status).json({ error: true, message });
    }
};

module.exports = {
    getKPIDashboard,
    getRevenueByCase,
    getCaseThroughput,
    getUserActivation
};
