const asyncHandler = require('express-async-handler');
const { CustomException } = require('../utils');
const { sanitizeObjectId } = require('../utils/securityUtils');
const dashboardService = require('../services/dashboardAggregation.service');

/**
 * CRM Analytics Controller
 * Provides CRM dashboard and reporting endpoints
 */

// GET /api/analytics/crm/dashboard - Main CRM dashboard
exports.getDashboard = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw new CustomException('Account access restricted', 403);
    }

    const firmId = req.firmId;
    const { startDate, endDate, userId, teamId, territoryId } = req.query;

    const options = {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        userId: userId ? sanitizeObjectId(userId) : undefined,
        teamId: teamId ? sanitizeObjectId(teamId) : undefined,
        territoryId: territoryId ? sanitizeObjectId(territoryId) : undefined
    };

    const metrics = await dashboardService.getDashboardMetrics(firmId, options);

    res.json({
        success: true,
        data: metrics
    });
});

// GET /api/analytics/crm/pipeline - Pipeline analysis
exports.getPipelineAnalysis = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw new CustomException('Account access restricted', 403);
    }

    const firmId = req.firmId;
    const { startDate, endDate, pipelineId } = req.query;

    const options = { startDate, endDate, pipelineId };

    // Get detailed pipeline metrics from dashboard service
    const baseQuery = { firmId };
    if (startDate) baseQuery.createdAt = { $gte: new Date(startDate) };
    if (endDate) baseQuery.createdAt = { ...baseQuery.createdAt, $lte: new Date(endDate) };

    const pipeline = await dashboardService.getPipelineMetrics(baseQuery);

    res.json({
        success: true,
        data: pipeline
    });
});

// GET /api/analytics/crm/sales-funnel - Sales funnel visualization
exports.getSalesFunnel = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw new CustomException('Account access restricted', 403);
    }

    const firmId = req.firmId;
    const { startDate, endDate } = req.query;

    const funnel = await dashboardService.getSalesFunnel(firmId, { startDate, endDate });

    res.json({
        success: true,
        data: funnel
    });
});

// GET /api/analytics/crm/forecast - Forecast report
exports.getForecast = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw new CustomException('Account access restricted', 403);
    }

    const SalesForecast = require('../models/salesForecast.model');
    const firmId = req.firmId;
    const { period, year, quarter } = req.query;

    let forecasts;
    if (period === 'current-quarter') {
        forecasts = await SalesForecast.getCurrentQuarter(firmId);
    } else {
        const query = { firmId };
        if (year) query.fiscalYear = parseInt(year);
        if (quarter) query.fiscalQuarter = parseInt(quarter);

        forecasts = await SalesForecast.find(query).sort({ periodStart: -1 });
    }

    res.json({
        success: true,
        data: forecasts
    });
});

// GET /api/analytics/crm/lead-sources - Lead source analysis
exports.getLeadSourceAnalysis = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw new CustomException('Account access restricted', 403);
    }

    const firmId = req.firmId;
    const { startDate, endDate } = req.query;

    const analysis = await dashboardService.getLeadSourceAnalysis(firmId, { startDate, endDate });

    res.json({
        success: true,
        data: analysis
    });
});

// GET /api/analytics/crm/win-loss - Win/loss analysis
exports.getWinLossAnalysis = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw new CustomException('Account access restricted', 403);
    }

    const firmId = req.firmId;
    const { startDate, endDate } = req.query;

    const analysis = await dashboardService.getWinLossAnalysis(firmId, { startDate, endDate });

    res.json({
        success: true,
        data: analysis
    });
});

// GET /api/analytics/crm/activity - Activity report
exports.getActivityReport = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw new CustomException('Account access restricted', 403);
    }

    const firmId = req.firmId;
    const { startDate, endDate } = req.query;

    const baseQuery = { firmId };
    if (startDate) baseQuery.createdAt = { $gte: new Date(startDate) };
    if (endDate) baseQuery.createdAt = { ...baseQuery.createdAt, $lte: new Date(endDate) };

    const activities = await dashboardService.getActivityMetrics(baseQuery);

    res.json({
        success: true,
        data: activities
    });
});

// GET /api/analytics/crm/team-performance - Team performance metrics
exports.getTeamPerformance = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw new CustomException('Account access restricted', 403);
    }

    const firmId = req.firmId;
    const { startDate, endDate, teamId } = req.query;

    const performance = await dashboardService.getTeamPerformance(firmId, {
        startDate,
        endDate,
        teamId: teamId ? sanitizeObjectId(teamId) : undefined
    });

    res.json({
        success: true,
        data: performance
    });
});

// GET /api/analytics/crm/territory - Territory analysis
exports.getTerritoryAnalysis = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw new CustomException('Account access restricted', 403);
    }

    const Lead = require('../models/lead.model');
    const firmId = req.firmId;
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchStage = { firmId };
    if (Object.keys(dateFilter).length) matchStage.createdAt = dateFilter;

    const territoryStats = await Lead.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$territoryId',
                totalLeads: { $sum: 1 },
                won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
                lost: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } },
                totalValue: { $sum: '$estimatedValue' },
                wonValue: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, '$estimatedValue', 0] } }
            }
        },
        {
            $lookup: {
                from: 'territories',
                localField: '_id',
                foreignField: '_id',
                as: 'territory'
            }
        },
        { $unwind: { path: '$territory', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                territoryId: '$_id',
                territoryName: '$territory.name',
                territoryCode: '$territory.code',
                totalLeads: 1,
                won: 1,
                lost: 1,
                totalValue: 1,
                wonValue: 1,
                winRate: {
                    $cond: [
                        { $gt: [{ $add: ['$won', '$lost'] }, 0] },
                        { $multiply: [{ $divide: ['$won', { $add: ['$won', '$lost'] }] }, 100] },
                        0
                    ]
                }
            }
        },
        { $sort: { wonValue: -1 } }
    ]);

    res.json({
        success: true,
        data: territoryStats
    });
});

// GET /api/analytics/crm/campaign-roi - Campaign ROI analysis
exports.getCampaignRoi = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw new CustomException('Account access restricted', 403);
    }

    const Lead = require('../models/lead.model');
    const Campaign = require('../models/campaign.model');
    const firmId = req.firmId;
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Get campaign stats with lead attribution
    const campaignStats = await Lead.aggregate([
        {
            $match: {
                firmId,
                campaignId: { $exists: true, $ne: null },
                ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {})
            }
        },
        {
            $group: {
                _id: '$campaignId',
                leadsGenerated: { $sum: 1 },
                leadsConverted: { $sum: { $cond: ['$convertedToClient', 1, 0] } },
                dealsWon: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
                revenueGenerated: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, '$estimatedValue', 0] } }
            }
        },
        {
            $lookup: {
                from: 'campaigns',
                localField: '_id',
                foreignField: '_id',
                as: 'campaign'
            }
        },
        { $unwind: '$campaign' },
        {
            $project: {
                campaignId: '$_id',
                campaignName: '$campaign.name',
                campaignType: '$campaign.type',
                budgetPlanned: '$campaign.budget.planned',
                budgetActual: '$campaign.budget.actual',
                leadsGenerated: 1,
                leadsConverted: 1,
                dealsWon: 1,
                revenueGenerated: 1,
                conversionRate: {
                    $cond: [
                        { $gt: ['$leadsGenerated', 0] },
                        { $multiply: [{ $divide: ['$leadsConverted', '$leadsGenerated'] }, 100] },
                        0
                    ]
                },
                roi: {
                    $cond: [
                        { $gt: ['$campaign.budget.actual', 0] },
                        { $multiply: [
                            { $divide: [
                                { $subtract: ['$revenueGenerated', '$campaign.budget.actual'] },
                                '$campaign.budget.actual'
                            ] },
                            100
                        ]},
                        0
                    ]
                }
            }
        },
        { $sort: { revenueGenerated: -1 } }
    ]);

    res.json({
        success: true,
        data: campaignStats
    });
});

// GET /api/analytics/crm/first-response - First response time analysis
exports.getFirstResponseTime = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw new CustomException('Account access restricted', 403);
    }

    const Lead = require('../models/lead.model');
    const firmId = req.firmId;
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const responseStats = await Lead.aggregate([
        {
            $match: {
                firmId,
                'metrics.firstResponseTime': { $exists: true, $gt: 0 },
                ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {})
            }
        },
        {
            $group: {
                _id: '$assignedTo',
                avgResponseTime: { $avg: '$metrics.firstResponseTime' },
                minResponseTime: { $min: '$metrics.firstResponseTime' },
                maxResponseTime: { $max: '$metrics.firstResponseTime' },
                totalLeads: { $sum: 1 },
                respondedUnder5Min: { $sum: { $cond: [{ $lte: ['$metrics.firstResponseTime', 5] }, 1, 0] } },
                respondedUnder15Min: { $sum: { $cond: [{ $lte: ['$metrics.firstResponseTime', 15] }, 1, 0] } },
                respondedUnder60Min: { $sum: { $cond: [{ $lte: ['$metrics.firstResponseTime', 60] }, 1, 0] } }
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
                avgResponseTime: { $round: ['$avgResponseTime', 1] },
                minResponseTime: 1,
                maxResponseTime: 1,
                totalLeads: 1,
                slaCompliance: {
                    under5Min: '$respondedUnder5Min',
                    under15Min: '$respondedUnder15Min',
                    under60Min: '$respondedUnder60Min'
                }
            }
        },
        { $sort: { avgResponseTime: 1 } }
    ]);

    // Overall average
    const overall = await Lead.aggregate([
        {
            $match: {
                firmId,
                'metrics.firstResponseTime': { $exists: true, $gt: 0 },
                ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {})
            }
        },
        {
            $group: {
                _id: null,
                avgResponseTime: { $avg: '$metrics.firstResponseTime' },
                totalLeads: { $sum: 1 }
            }
        }
    ]);

    res.json({
        success: true,
        data: {
            overall: overall[0] || { avgResponseTime: 0, totalLeads: 0 },
            byUser: responseStats
        }
    });
});

// GET /api/analytics/crm/conversion-rates - Conversion rates breakdown
exports.getConversionRates = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw new CustomException('Account access restricted', 403);
    }

    const firmId = req.firmId;
    const { startDate, endDate, groupBy = 'source' } = req.query;

    const conversion = await dashboardService.getConversionMetrics({
        firmId,
        createdAt: {
            ...(startDate ? { $gte: new Date(startDate) } : {}),
            ...(endDate ? { $lte: new Date(endDate) } : {})
        }
    });

    res.json({
        success: true,
        data: conversion
    });
});

// GET /api/analytics/crm/cohort - Cohort analysis
exports.getCohortAnalysis = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw new CustomException('Account access restricted', 403);
    }

    const Lead = require('../models/lead.model');
    const firmId = req.firmId;
    const { months = 6 } = req.query;

    const cohorts = [];
    const now = new Date();

    for (let i = 0; i < parseInt(months); i++) {
        const cohortStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const cohortEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const cohortData = await Lead.aggregate([
            {
                $match: {
                    firmId,
                    createdAt: { $gte: cohortStart, $lte: cohortEnd }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    converted: { $sum: { $cond: ['$convertedToClient', 1, 0] } },
                    won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
                    lost: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } },
                    totalValue: { $sum: '$estimatedValue' },
                    wonValue: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, '$estimatedValue', 0] } }
                }
            }
        ]);

        cohorts.push({
            cohort: cohortStart.toISOString().substring(0, 7), // YYYY-MM
            cohortLabel: cohortStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            ...(cohortData[0] || { total: 0, converted: 0, won: 0, lost: 0, totalValue: 0, wonValue: 0 })
        });
    }

    res.json({
        success: true,
        data: cohorts.reverse() // Oldest first
    });
});

// GET /api/analytics/crm/revenue - Revenue analytics
exports.getRevenueAnalytics = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw new CustomException('Account access restricted', 403);
    }

    const Lead = require('../models/lead.model');
    const Quote = require('../models/quote.model');
    const firmId = req.firmId;
    const { startDate, endDate, period = 'monthly' } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Revenue from won deals
    const wonRevenue = await Lead.aggregate([
        {
            $match: {
                firmId,
                status: 'won',
                ...(Object.keys(dateFilter).length ? { actualCloseDate: dateFilter } : {})
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$actualCloseDate' },
                    month: { $month: '$actualCloseDate' }
                },
                revenue: { $sum: '$estimatedValue' },
                deals: { $sum: 1 },
                avgDealSize: { $avg: '$estimatedValue' }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Accepted quotes value
    const quotesValue = await Quote.aggregate([
        {
            $match: {
                firmId,
                status: 'accepted',
                ...(Object.keys(dateFilter).length ? { acceptedAt: dateFilter } : {})
            }
        },
        {
            $group: {
                _id: null,
                totalValue: { $sum: '$grandTotal' },
                count: { $sum: 1 }
            }
        }
    ]);

    res.json({
        success: true,
        data: {
            byPeriod: wonRevenue.map(r => ({
                period: `${r._id.year}-${String(r._id.month).padStart(2, '0')}`,
                revenue: r.revenue,
                deals: r.deals,
                avgDealSize: r.avgDealSize
            })),
            quotesAccepted: quotesValue[0] || { totalValue: 0, count: 0 }
        }
    });
});

// GET /api/analytics/crm/forecast-accuracy - Forecast vs actual comparison
exports.getForecastAccuracy = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw new CustomException('Account access restricted', 403);
    }

    const Lead = require('../models/lead.model');
    const SalesForecast = require('../models/salesForecast.model');
    const firmId = req.firmId;
    const { year, quarters = 4 } = req.query;

    const targetYear = parseInt(year) || new Date().getFullYear();
    const results = [];

    for (let q = 1; q <= Math.min(parseInt(quarters), 4); q++) {
        const quarterStart = new Date(targetYear, (q - 1) * 3, 1);
        const quarterEnd = new Date(targetYear, q * 3, 0);

        // Get forecast for this quarter
        const forecast = await SalesForecast.findOne({
            firmId,
            fiscalYear: targetYear,
            fiscalQuarter: q
        });

        // Get actual won revenue for this quarter
        const actual = await Lead.aggregate([
            {
                $match: {
                    firmId,
                    status: 'won',
                    actualCloseDate: { $gte: quarterStart, $lte: quarterEnd }
                }
            },
            {
                $group: {
                    _id: null,
                    revenue: { $sum: '$estimatedValue' },
                    deals: { $sum: 1 }
                }
            }
        ]);

        const actualRevenue = actual[0]?.revenue || 0;
        const forecastAmount = forecast?.forecastTotal || 0;

        results.push({
            quarter: `Q${q} ${targetYear}`,
            forecast: forecastAmount,
            actual: actualRevenue,
            variance: actualRevenue - forecastAmount,
            accuracy: forecastAmount > 0
                ? Math.round((1 - Math.abs(actualRevenue - forecastAmount) / forecastAmount) * 100)
                : 0
        });
    }

    res.json({
        success: true,
        data: results
    });
});
