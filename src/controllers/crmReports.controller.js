/**
 * CRM Reports Controller
 *
 * Handles CRM analytics and reporting endpoints.
 */

const mongoose = require('mongoose');
const Lead = require('../models/lead.model');
const Case = require('../models/case.model');
const Client = require('../models/client.model');
const SalesPerson = require('../models/salesPerson.model');
const LostReason = require('../models/lostReason.model');
const Competitor = require('../models/competitor.model');
const SalesStage = require('../models/salesStage.model');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');
const logger = require('../utils/logger');
const crmReportsService = require('../services/crmReports.service');

// ═══════════════════════════════════════════════════════════════
// CAMPAIGN EFFICIENCY REPORT
// ═══════════════════════════════════════════════════════════════

/**
 * Get campaign efficiency report
 */
exports.getCampaignEfficiency = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Mass assignment protection - only allow specific query parameters
        const allowedParams = pickAllowedFields(req.query, [
            'startDate', 'endDate', 'campaign', 'source', 'medium', 'salesPersonId'
        ]);

        const { startDate, endDate, campaign, source, medium, salesPersonId } = allowedParams;

        // Input validation - validate date range
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);

        if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format'
            });
        }

        if (startDateObj > endDateObj) {
            return res.status(400).json({
                success: false,
                message: 'Start date must be before end date'
            });
        }

        // IDOR protection - verify firmId ownership (req.firmId already verified by auth middleware)
        const firmId = req.firmId;
        if (!firmId) {
            return res.status(403).json({
                success: false,
                message: 'Firm ID not found'
            });
        }

        const matchStage = {
            firmId: new mongoose.Types.ObjectId(firmId),
            createdAt: {
                $gte: startDateObj,
                $lte: endDateObj
            }
        };

        // Prevent injection - sanitize string inputs
        if (campaign) matchStage['source.campaign'] = String(campaign).trim();
        if (source) matchStage['source.medium'] = String(source).trim();
        if (medium) matchStage.utmMedium = String(medium).trim();

        // Prevent NoSQL injection - sanitize ObjectId
        if (salesPersonId) {
            const sanitizedSalesPersonId = sanitizeObjectId(salesPersonId);
            if (!sanitizedSalesPersonId) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid salesPersonId format'
                });
            }
            matchStage.salesPersonId = new mongoose.Types.ObjectId(sanitizedSalesPersonId);
        }

        const leadData = await Lead.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        campaign: '$source.campaign',
                        source: '$source.type',
                        medium: '$source.medium'
                    },
                    leadCount: { $sum: 1 },
                    leadIds: { $push: '$_id' }
                }
            }
        ]);

        // For each campaign group, get case and won data
        const campaigns = await Promise.all(leadData.map(async (ld) => {
            const cases = await Case.find({
                leadId: { $in: ld.leadIds },
                firmId
            }).lean();

            const wonCases = cases.filter(c => c.crmStatus === 'won');
            const casesWithQuotes = cases.filter(c => c.quoteIds?.length > 0);

            return {
                campaign: ld._id.campaign || 'Direct',
                source: ld._id.source || 'Direct',
                medium: ld._id.medium || 'None',
                leadCount: ld.leadCount,
                caseCount: cases.length,
                quoteCount: casesWithQuotes.length,
                wonCount: wonCases.length,
                wonValue: wonCases.reduce((sum, c) => sum + (c.estimatedValue || 0), 0),
                leadToCaseRate: ld.leadCount > 0 ? Math.round((cases.length / ld.leadCount) * 100) : 0,
                caseToQuoteRate: cases.length > 0 ? Math.round((casesWithQuotes.length / cases.length) * 100) : 0,
                quoteToWonRate: casesWithQuotes.length > 0 ? Math.round((wonCases.length / casesWithQuotes.length) * 100) : 0
            };
        }));

        // Calculate summary
        const summary = {
            totalLeads: campaigns.reduce((sum, c) => sum + c.leadCount, 0),
            totalCases: campaigns.reduce((sum, c) => sum + c.caseCount, 0),
            totalWon: campaigns.reduce((sum, c) => sum + c.wonCount, 0),
            totalWonValue: campaigns.reduce((sum, c) => sum + c.wonValue, 0),
            avgLeadToCaseRate: campaigns.length > 0
                ? Math.round(campaigns.reduce((sum, c) => sum + c.leadToCaseRate, 0) / campaigns.length)
                : 0,
            avgWinRate: campaigns.length > 0
                ? Math.round(campaigns.reduce((sum, c) => sum + c.quoteToWonRate, 0) / campaigns.length)
                : 0
        };

        res.json({
            success: true,
            data: { campaigns, summary }
        });
    } catch (error) {
        logger.error('Error getting campaign efficiency report:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب تقرير كفاءة الحملات / Error fetching campaign efficiency',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// LEAD OWNER EFFICIENCY REPORT
// ═══════════════════════════════════════════════════════════════

/**
 * Get lead owner efficiency report
 */
exports.getLeadOwnerEfficiency = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Mass assignment protection - only allow specific query parameters
        const allowedParams = pickAllowedFields(req.query, [
            'startDate', 'endDate', 'salesPersonId', 'territoryId', 'leadSourceId'
        ]);

        const { startDate, endDate, salesPersonId, territoryId, leadSourceId } = allowedParams;

        // Input validation - validate date range
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);

        if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format'
            });
        }

        if (startDateObj > endDateObj) {
            return res.status(400).json({
                success: false,
                message: 'Start date must be before end date'
            });
        }

        // IDOR protection - verify firmId ownership
        const firmId = req.firmId;
        if (!firmId) {
            return res.status(403).json({
                success: false,
                message: 'Firm ID not found'
            });
        }

        const matchStage = {
            firmId: new mongoose.Types.ObjectId(firmId),
            createdAt: {
                $gte: startDateObj,
                $lte: endDateObj
            },
            salesPersonId: { $exists: true, $ne: null }
        };

        // Prevent NoSQL injection - sanitize ObjectIds
        if (salesPersonId) {
            const sanitizedSalesPersonId = sanitizeObjectId(salesPersonId);
            if (!sanitizedSalesPersonId) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid salesPersonId format'
                });
            }
            matchStage.salesPersonId = new mongoose.Types.ObjectId(sanitizedSalesPersonId);
        }

        if (territoryId) {
            const sanitizedTerritoryId = sanitizeObjectId(territoryId);
            if (!sanitizedTerritoryId) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid territoryId format'
                });
            }
            matchStage.territoryId = new mongoose.Types.ObjectId(sanitizedTerritoryId);
        }

        const ownerStats = await Lead.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$salesPersonId',
                    leadCount: { $sum: 1 },
                    convertedCount: {
                        $sum: { $cond: [{ $eq: ['$convertedToClient', true] }, 1, 0] }
                    },
                    leadIds: { $push: '$_id' }
                }
            },
            {
                $lookup: {
                    from: 'sales_persons',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'salesPerson'
                }
            },
            { $unwind: '$salesPerson' }
        ]);

        // Enrich with case data
        const owners = await Promise.all(ownerStats.map(async (owner) => {
            const cases = await Case.find({
                salesPersonId: owner._id,
                firmId,
                createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
            }).lean();

            const wonCases = cases.filter(c => c.crmStatus === 'won');
            const lostCases = cases.filter(c => c.crmStatus === 'lost');
            const wonValue = wonCases.reduce((sum, c) => sum + (c.estimatedValue || 0), 0);
            const lostValue = lostCases.reduce((sum, c) => sum + (c.estimatedValue || 0), 0);

            // Get target data
            const target = owner.salesPerson.targets?.find(t => {
                const year = new Date(startDate).getFullYear();
                return t.year === year;
            });

            return {
                salesPersonId: owner._id,
                salesPersonName: owner.salesPerson.name,
                salesPersonNameAr: owner.salesPerson.nameAr,
                leadCount: owner.leadCount,
                caseCount: cases.length,
                wonCount: wonCases.length,
                lostCount: lostCases.length,
                wonValue,
                lostValue,
                conversionRate: owner.leadCount > 0
                    ? Math.round((owner.convertedCount / owner.leadCount) * 100)
                    : 0,
                winRate: wonCases.length + lostCases.length > 0
                    ? Math.round((wonCases.length / (wonCases.length + lostCases.length)) * 100)
                    : 0,
                avgDealSize: wonCases.length > 0 ? Math.round(wonValue / wonCases.length) : 0,
                targetAmount: target?.targetAmount || 0,
                targetAchievement: target?.targetAmount > 0
                    ? Math.round((wonValue / target.targetAmount) * 100)
                    : 0
            };
        }));

        // Sort by won value and add rank
        owners.sort((a, b) => b.wonValue - a.wonValue);
        owners.forEach((owner, index) => {
            owner.rank = index + 1;
        });

        // Calculate summary
        const summary = {
            totalLeads: owners.reduce((sum, o) => sum + o.leadCount, 0),
            totalCases: owners.reduce((sum, o) => sum + o.caseCount, 0),
            totalWon: owners.reduce((sum, o) => sum + o.wonCount, 0),
            totalWonValue: owners.reduce((sum, o) => sum + o.wonValue, 0),
            avgConversionRate: owners.length > 0
                ? Math.round(owners.reduce((sum, o) => sum + o.conversionRate, 0) / owners.length)
                : 0,
            avgWinRate: owners.length > 0
                ? Math.round(owners.reduce((sum, o) => sum + o.winRate, 0) / owners.length)
                : 0
        };

        res.json({
            success: true,
            data: { owners, summary }
        });
    } catch (error) {
        logger.error('Error getting lead owner efficiency report:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب تقرير كفاءة المالكين / Error fetching lead owner efficiency',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// FIRST RESPONSE TIME REPORT
// ═══════════════════════════════════════════════════════════════

/**
 * Get first response time report
 */
exports.getFirstResponseTime = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Mass assignment protection - only allow specific query parameters
        const allowedParams = pickAllowedFields(req.query, [
            'startDate', 'endDate', 'groupBy', 'salesPersonId'
        ]);

        const { startDate, endDate, groupBy = 'day', salesPersonId } = allowedParams;

        // Input validation - validate date range
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);

        if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format'
            });
        }

        if (startDateObj > endDateObj) {
            return res.status(400).json({
                success: false,
                message: 'Start date must be before end date'
            });
        }

        // Input validation - validate groupBy parameter
        const validGroupByValues = ['day', 'week', 'month'];
        if (!validGroupByValues.includes(groupBy)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid groupBy parameter. Must be one of: day, week, month'
            });
        }

        // IDOR protection - verify firmId ownership
        const firmId = req.firmId;
        if (!firmId) {
            return res.status(403).json({
                success: false,
                message: 'Firm ID not found'
            });
        }

        const matchStage = {
            firmId: new mongoose.Types.ObjectId(firmId),
            createdAt: {
                $gte: startDateObj,
                $lte: endDateObj
            },
            firstResponseTime: { $exists: true, $ne: null }
        };

        // Prevent NoSQL injection - sanitize ObjectId
        if (salesPersonId) {
            const sanitizedSalesPersonId = sanitizeObjectId(salesPersonId);
            if (!sanitizedSalesPersonId) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid salesPersonId format'
                });
            }
            matchStage.salesPersonId = new mongoose.Types.ObjectId(sanitizedSalesPersonId);
        }

        // Group by period - prevent injection with validated groupBy
        const dateGroupField = groupBy === 'month'
            ? { $month: '$createdAt' }
            : groupBy === 'week'
                ? { $week: '$createdAt' }
                : { $dayOfMonth: '$createdAt' };

        const byPeriod = await Lead.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        period: dateGroupField,
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    avgResponseTime: { $avg: '$firstResponseTime' },
                    leadCount: { $sum: 1 },
                    responseTimes: { $push: '$firstResponseTime' },
                    within1Hour: {
                        $sum: { $cond: [{ $lte: ['$firstResponseTime', 3600] }, 1, 0] }
                    },
                    within24Hours: {
                        $sum: { $cond: [{ $lte: ['$firstResponseTime', 86400] }, 1, 0] }
                    }
                }
            },
            {
                $project: {
                    date: '$_id',
                    avgResponseTime: { $round: ['$avgResponseTime', 0] },
                    leadCount: 1,
                    within1Hour: { $round: [{ $multiply: [{ $divide: ['$within1Hour', '$leadCount'] }, 100] }, 1] },
                    within24Hours: { $round: [{ $multiply: [{ $divide: ['$within24Hours', '$leadCount'] }, 100] }, 1] }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.period': 1 } }
        ]);

        // Get distribution
        const distribution = await Lead.aggregate([
            { $match: matchStage },
            {
                $bucket: {
                    groupBy: '$firstResponseTime',
                    boundaries: [0, 900, 1800, 3600, 7200, 14400, 28800, 86400, Infinity],
                    default: 'other',
                    output: { count: { $sum: 1 } }
                }
            }
        ]);

        // Format distribution
        const totalLeads = distribution.reduce((sum, d) => sum + d.count, 0);
        const rangeLabels = ['0-15min', '15-30min', '30-60min', '1-2h', '2-4h', '4-8h', '8-24h', '>24h'];
        const formattedDistribution = distribution.map((d, i) => ({
            range: rangeLabels[i] || 'Other',
            count: d.count,
            percentage: totalLeads > 0 ? Math.round((d.count / totalLeads) * 100) : 0
        }));

        // By sales person
        const bySalesPerson = await Lead.aggregate([
            {
                $match: {
                    ...matchStage,
                    salesPersonId: { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: '$salesPersonId',
                    avgResponseTime: { $avg: '$firstResponseTime' },
                    leadsAssigned: { $sum: 1 },
                    leadsResponded: {
                        $sum: { $cond: [{ $gt: ['$firstResponseTime', 0] }, 1, 0] }
                    }
                }
            },
            {
                $lookup: {
                    from: 'sales_persons',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'salesPerson'
                }
            },
            { $unwind: '$salesPerson' },
            {
                $project: {
                    salesPersonId: '$_id',
                    salesPersonName: '$salesPerson.name',
                    avgResponseTime: { $round: ['$avgResponseTime', 0] },
                    leadsAssigned: 1,
                    leadsResponded: 1,
                    responseRate: {
                        $round: [{ $multiply: [{ $divide: ['$leadsResponded', '$leadsAssigned'] }, 100] }, 0]
                    }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                byPeriod,
                bySalesPerson,
                distribution: formattedDistribution
            }
        });
    } catch (error) {
        logger.error('Error getting first response time report:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب تقرير وقت الاستجابة / Error fetching response time report',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// LOST OPPORTUNITY REPORT
// ═══════════════════════════════════════════════════════════════

/**
 * Get lost opportunity analysis report
 */
exports.getLostOpportunity = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Mass assignment protection - only allow specific query parameters
        const allowedParams = pickAllowedFields(req.query, [
            'startDate', 'endDate', 'lostReasonId', 'competitorId', 'salesPersonId'
        ]);

        const { startDate, endDate, lostReasonId, competitorId, salesPersonId } = allowedParams;

        // Input validation - validate date range
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);

        if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format'
            });
        }

        if (startDateObj > endDateObj) {
            return res.status(400).json({
                success: false,
                message: 'Start date must be before end date'
            });
        }

        // IDOR protection - verify firmId ownership
        const firmId = req.firmId;
        if (!firmId) {
            return res.status(403).json({
                success: false,
                message: 'Firm ID not found'
            });
        }

        const matchStage = {
            firmId: new mongoose.Types.ObjectId(firmId),
            crmStatus: 'lost',
            lostDate: {
                $gte: startDateObj,
                $lte: endDateObj
            }
        };

        // Prevent NoSQL injection - sanitize ObjectIds
        if (lostReasonId) {
            const sanitizedLostReasonId = sanitizeObjectId(lostReasonId);
            if (!sanitizedLostReasonId) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid lostReasonId format'
                });
            }
            matchStage.lostReasonId = new mongoose.Types.ObjectId(sanitizedLostReasonId);
        }

        if (competitorId) {
            const sanitizedCompetitorId = sanitizeObjectId(competitorId);
            if (!sanitizedCompetitorId) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid competitorId format'
                });
            }
            matchStage.competitorId = new mongoose.Types.ObjectId(sanitizedCompetitorId);
        }

        if (salesPersonId) {
            const sanitizedSalesPersonId = sanitizeObjectId(salesPersonId);
            if (!sanitizedSalesPersonId) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid salesPersonId format'
                });
            }
            matchStage.salesPersonId = new mongoose.Types.ObjectId(sanitizedSalesPersonId);
        }

        const opportunities = await Case.find(matchStage)
            .populate('leadId', 'firstName lastName companyName')
            .populate('lostReasonId', 'reason reasonAr category')
            .populate('competitorId', 'name nameAr')
            .populate('salesPersonId', 'name nameAr')
            .sort({ lostDate: -1 })
            .lean();

        // Format opportunities
        const formattedOpportunities = opportunities.map(c => ({
            caseId: c._id,
            caseNumber: c.caseNumber,
            leadName: c.leadId?.companyName || `${c.leadId?.firstName || ''} ${c.leadId?.lastName || ''}`.trim(),
            caseType: c.category,
            lostReason: c.lostReasonId?.reason,
            lostReasonAr: c.lostReasonId?.reasonAr,
            lostReasonCategory: c.lostReasonId?.category,
            lostReasonDetails: c.lostReasonDetails,
            competitor: c.competitorId?.name,
            competitorAr: c.competitorId?.nameAr,
            stageWhenLost: c.stageWhenLost,
            estimatedValue: c.estimatedValue || 0,
            daysInPipeline: c.createdAt && c.lostDate
                ? Math.floor((new Date(c.lostDate) - new Date(c.createdAt)) / (1000 * 60 * 60 * 24))
                : 0,
            salesPerson: c.salesPersonId?.name,
            lostDate: c.lostDate
        }));

        // Summary
        const totalLost = formattedOpportunities.length;
        const totalValueLost = formattedOpportunities.reduce((sum, o) => sum + o.estimatedValue, 0);
        const avgDaysToLoss = totalLost > 0
            ? Math.round(formattedOpportunities.reduce((sum, o) => sum + o.daysInPipeline, 0) / totalLost)
            : 0;

        // By reason
        const byReason = await Case.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$lostReasonId',
                    count: { $sum: 1 },
                    value: { $sum: '$estimatedValue' }
                }
            },
            {
                $lookup: {
                    from: 'lost_reasons',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'reason'
                }
            },
            { $unwind: { path: '$reason', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    reason: { $ifNull: ['$reason.reason', 'Unknown'] },
                    reasonAr: { $ifNull: ['$reason.reasonAr', 'غير معروف'] },
                    count: 1,
                    value: 1
                }
            },
            { $sort: { count: -1 } }
        ]);

        // By stage
        const byStage = await Case.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$stageWhenLost',
                    count: { $sum: 1 },
                    value: { $sum: '$estimatedValue' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Find top lost reason and competitor
        const topLostReason = byReason[0]?.reason || 'N/A';
        const topCompetitor = await Case.aggregate([
            { $match: { ...matchStage, competitorId: { $exists: true, $ne: null } } },
            { $group: { _id: '$competitorId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 },
            {
                $lookup: {
                    from: 'competitors',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'competitor'
                }
            },
            { $unwind: '$competitor' }
        ]);

        const summary = {
            totalLost,
            totalValueLost,
            topLostReason,
            topCompetitor: topCompetitor[0]?.competitor?.name || 'N/A',
            avgDaysToLoss
        };

        res.json({
            success: true,
            data: {
                opportunities: formattedOpportunities,
                summary,
                byReason,
                byStage
            }
        });
    } catch (error) {
        logger.error('Error getting lost opportunity report:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب تقرير الفرص المفقودة / Error fetching lost opportunity report',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// SALES PIPELINE REPORT
// ═══════════════════════════════════════════════════════════════

/**
 * Get sales pipeline report
 */
exports.getSalesPipeline = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Mass assignment protection - only allow specific query parameters
        const allowedParams = pickAllowedFields(req.query, [
            'startDate', 'endDate', 'viewBy', 'salesPersonId', 'territoryId'
        ]);

        const { startDate, endDate, viewBy = 'stage', salesPersonId, territoryId } = allowedParams;

        // Input validation - validate date range
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);

        if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format'
            });
        }

        if (startDateObj > endDateObj) {
            return res.status(400).json({
                success: false,
                message: 'Start date must be before end date'
            });
        }

        // Input validation - validate viewBy parameter
        const validViewByValues = ['stage'];
        if (!validViewByValues.includes(viewBy)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid viewBy parameter. Must be: stage'
            });
        }

        // IDOR protection - verify firmId ownership
        const firmId = req.firmId;
        if (!firmId) {
            return res.status(403).json({
                success: false,
                message: 'Firm ID not found'
            });
        }

        const matchStage = {
            firmId: new mongoose.Types.ObjectId(firmId),
            createdAt: {
                $gte: startDateObj,
                $lte: endDateObj
            }
        };

        // Prevent NoSQL injection - sanitize ObjectIds
        if (salesPersonId) {
            const sanitizedSalesPersonId = sanitizeObjectId(salesPersonId);
            if (!sanitizedSalesPersonId) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid salesPersonId format'
                });
            }
            matchStage.salesPersonId = new mongoose.Types.ObjectId(sanitizedSalesPersonId);
        }

        if (territoryId) {
            const sanitizedTerritoryId = sanitizeObjectId(territoryId);
            if (!sanitizedTerritoryId) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid territoryId format'
                });
            }
            matchStage.territoryId = new mongoose.Types.ObjectId(sanitizedTerritoryId);
        }

        // Get stages for reference
        const stages = await SalesStage.find({ firmId, enabled: true }).sort({ order: 1 }).lean();

        let byStage;
        if (viewBy === 'stage') {
            byStage = await Case.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: '$crmPipelineStageId',
                        count: { $sum: 1 },
                        value: { $sum: '$estimatedValue' },
                        avgProbability: { $avg: '$probability' }
                    }
                }
            ]);

            // Enrich with stage info
            byStage = byStage.map(s => {
                const stage = stages.find(st => st._id.toString() === s._id?.toString());
                const weightedValue = Math.round((s.value * (s.avgProbability || 0)) / 100);
                return {
                    stageId: s._id,
                    stageName: stage?.name || 'Unknown',
                    stageNameAr: stage?.nameAr || 'غير معروف',
                    stageColor: stage?.color || '#6B7280',
                    order: stage?.order || 999,
                    count: s.count,
                    value: s.value,
                    weightedValue,
                    probability: Math.round(s.avgProbability || 0)
                };
            });

            byStage.sort((a, b) => a.order - b.order);
        }

        // Calculate summary
        const allCases = await Case.find(matchStage).lean();
        const wonCases = allCases.filter(c => c.crmStatus === 'won');
        const lostCases = allCases.filter(c => c.crmStatus === 'lost');

        const summary = {
            totalCount: allCases.length,
            totalValue: allCases.reduce((sum, c) => sum + (c.estimatedValue || 0), 0),
            weightedValue: allCases.reduce((sum, c) => sum + ((c.estimatedValue || 0) * (c.probability || 0) / 100), 0),
            avgWinRate: wonCases.length + lostCases.length > 0
                ? Math.round((wonCases.length / (wonCases.length + lostCases.length)) * 100)
                : 0,
            avgCycleTime: wonCases.length > 0
                ? Math.round(wonCases.reduce((sum, c) => {
                    if (c.createdAt && c.wonDate) {
                        return sum + Math.floor((new Date(c.wonDate) - new Date(c.createdAt)) / (1000 * 60 * 60 * 24));
                    }
                    return sum;
                }, 0) / wonCases.length)
                : 0
        };

        res.json({
            success: true,
            data: {
                byStage,
                summary
            }
        });
    } catch (error) {
        logger.error('Error getting sales pipeline report:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب تقرير خط الأنابيب / Error fetching pipeline report',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// PROSPECTS ENGAGED REPORT
// ═══════════════════════════════════════════════════════════════

/**
 * Get prospects engaged but not converted report
 */
exports.getProspectsEngaged = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Mass assignment protection - only allow specific query parameters
        const allowedParams = pickAllowedFields(req.query, [
            'daysSinceContact', 'minInteractions', 'salesPersonId', 'page', 'limit'
        ]);

        const {
            daysSinceContact = 60,
            minInteractions = 2,
            salesPersonId,
            page = 1,
            limit = 20
        } = allowedParams;

        // Input validation - validate numeric parameters
        const parsedDaysSinceContact = parseInt(daysSinceContact, 10);
        const parsedMinInteractions = parseInt(minInteractions, 10);

        if (isNaN(parsedDaysSinceContact) || parsedDaysSinceContact < 1 || parsedDaysSinceContact > 3650) {
            return res.status(400).json({
                success: false,
                message: 'Invalid daysSinceContact. Must be between 1 and 3650'
            });
        }

        if (isNaN(parsedMinInteractions) || parsedMinInteractions < 0 || parsedMinInteractions > 1000) {
            return res.status(400).json({
                success: false,
                message: 'Invalid minInteractions. Must be between 0 and 1000'
            });
        }

        // IDOR protection - verify firmId ownership
        const firmId = req.firmId;
        if (!firmId) {
            return res.status(403).json({
                success: false,
                message: 'Firm ID not found'
            });
        }

        // Sanitize pagination parameters
        const { page: sanitizedPage, limit: sanitizedLimit, skip } = sanitizePagination(
            { page, limit },
            { maxLimit: 100, defaultLimit: 20 }
        );

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parsedDaysSinceContact);

        const matchStage = {
            firmId: new mongoose.Types.ObjectId(firmId),
            convertedToClient: false,
            status: { $nin: ['won', 'lost'] },
            activityCount: { $gte: parsedMinInteractions },
            lastContactedAt: { $lte: cutoffDate }
        };

        // Prevent NoSQL injection - sanitize ObjectId
        if (salesPersonId) {
            const sanitizedSalesPersonId = sanitizeObjectId(salesPersonId);
            if (!sanitizedSalesPersonId) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid salesPersonId format'
                });
            }
            matchStage.salesPersonId = new mongoose.Types.ObjectId(sanitizedSalesPersonId);
        }

        const [prospects, total] = await Promise.all([
            Lead.find(matchStage)
                .populate('source.referralId', 'name')
                .populate('assignedTo', 'firstName lastName')
                .populate('salesPersonId', 'name nameAr')
                .sort({ lastContactedAt: 1 })
                .skip(skip)
                .limit(sanitizedLimit)
                .lean(),
            Lead.countDocuments(matchStage)
        ]);

        const formattedProspects = prospects.map(p => ({
            leadId: p._id,
            leadName: p.companyName || `${p.firstName || ''} ${p.lastName || ''}`.trim(),
            company: p.companyName,
            email: p.email,
            phone: p.phone,
            leadSource: p.source?.type,
            lastActivityType: 'contact',
            lastActivityDate: p.lastContactedAt,
            daysSinceContact: Math.floor((new Date() - new Date(p.lastContactedAt)) / (1000 * 60 * 60 * 24)),
            totalInteractions: p.activityCount || 0,
            leadScore: p.leadScore || 0,
            assignedTo: p.assignedTo?.firstName
                ? `${p.assignedTo.firstName} ${p.assignedTo.lastName}`
                : p.salesPersonId?.name,
            status: p.status
        }));

        // Summary
        const summary = {
            totalProspects: total,
            highValueProspects: prospects.filter(p => p.leadScore >= 100).length,
            needsFollowUp: prospects.filter(p => {
                const days = Math.floor((new Date() - new Date(p.lastContactedAt)) / (1000 * 60 * 60 * 24));
                return days > 30;
            }).length,
            avgInteractions: total > 0
                ? Math.round(prospects.reduce((sum, p) => sum + (p.activityCount || 0), 0) / prospects.length)
                : 0
        };

        res.json({
            success: true,
            data: {
                prospects: formattedProspects,
                summary,
                pagination: {
                    page: sanitizedPage,
                    limit: sanitizedLimit,
                    total
                }
            }
        });
    } catch (error) {
        logger.error('Error getting prospects engaged report:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب تقرير العملاء المحتملين / Error fetching prospects report',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// LEAD CONVERSION TIME REPORT
// ═══════════════════════════════════════════════════════════════

/**
 * Get lead conversion time report
 */
exports.getLeadConversionTime = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Mass assignment protection - only allow specific query parameters
        const allowedParams = pickAllowedFields(req.query, [
            'startDate', 'endDate', 'salesPersonId', 'territoryId'
        ]);

        const { startDate, endDate, salesPersonId, territoryId } = allowedParams;

        // Input validation - validate date range
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);

        if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format'
            });
        }

        if (startDateObj > endDateObj) {
            return res.status(400).json({
                success: false,
                message: 'Start date must be before end date'
            });
        }

        // IDOR protection - verify firmId ownership
        const firmId = req.firmId;
        if (!firmId) {
            return res.status(403).json({
                success: false,
                message: 'Firm ID not found'
            });
        }

        // Find clients converted in the date range
        const matchStage = {
            firmId: new mongoose.Types.ObjectId(firmId),
            convertedAt: {
                $gte: startDateObj,
                $lte: endDateObj
            },
            convertedFromLeadId: { $exists: true, $ne: null }
        };

        // Prevent NoSQL injection - sanitize ObjectIds
        if (salesPersonId) {
            const sanitizedSalesPersonId = sanitizeObjectId(salesPersonId);
            if (!sanitizedSalesPersonId) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid salesPersonId format'
                });
            }
            matchStage.salesPersonId = new mongoose.Types.ObjectId(sanitizedSalesPersonId);
        }

        if (territoryId) {
            const sanitizedTerritoryId = sanitizeObjectId(territoryId);
            if (!sanitizedTerritoryId) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid territoryId format'
                });
            }
            matchStage.territoryId = new mongoose.Types.ObjectId(sanitizedTerritoryId);
        }

        const clients = await Client.find(matchStage)
            .populate('convertedFromLeadId', 'createdAt')
            .populate('convertedFromCaseId', 'createdAt crmStatus wonDate category estimatedValue')
            .populate('salesPersonId', 'name nameAr')
            .populate('territoryId', 'name nameAr')
            .lean();

        const conversions = clients.map(c => {
            const leadCreatedAt = c.convertedFromLeadId?.createdAt;
            const caseCreatedAt = c.convertedFromCaseId?.createdAt;
            const wonDate = c.convertedFromCaseId?.wonDate || c.convertedAt;

            const daysLeadToCase = leadCreatedAt && caseCreatedAt
                ? Math.floor((new Date(caseCreatedAt) - new Date(leadCreatedAt)) / (1000 * 60 * 60 * 24))
                : 0;

            const daysCaseToWon = caseCreatedAt && wonDate
                ? Math.floor((new Date(wonDate) - new Date(caseCreatedAt)) / (1000 * 60 * 60 * 24))
                : 0;

            return {
                clientId: c._id,
                clientName: c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
                originalLeadId: c.convertedFromLeadId?._id,
                leadCreatedAt,
                caseCreatedAt,
                wonDate,
                daysLeadToCase,
                daysCaseToWon,
                totalDays: daysLeadToCase + daysCaseToWon,
                caseType: c.convertedFromCaseId?.category,
                wonValue: c.convertedFromCaseId?.estimatedValue || 0,
                salesPerson: c.salesPersonId?.name,
                territory: c.territoryId?.name
            };
        });

        // Calculate summary
        const validConversions = conversions.filter(c => c.totalDays > 0);
        const summary = {
            avgLeadToCaseDays: validConversions.length > 0
                ? Math.round(validConversions.reduce((sum, c) => sum + c.daysLeadToCase, 0) / validConversions.length)
                : 0,
            avgCaseToWonDays: validConversions.length > 0
                ? Math.round(validConversions.reduce((sum, c) => sum + c.daysCaseToWon, 0) / validConversions.length)
                : 0,
            avgTotalDays: validConversions.length > 0
                ? Math.round(validConversions.reduce((sum, c) => sum + c.totalDays, 0) / validConversions.length)
                : 0,
            fastestConversion: validConversions.length > 0
                ? Math.min(...validConversions.map(c => c.totalDays))
                : 0,
            slowestConversion: validConversions.length > 0
                ? Math.max(...validConversions.map(c => c.totalDays))
                : 0,
            totalConversions: conversions.length,
            totalValue: conversions.reduce((sum, c) => sum + c.wonValue, 0)
        };

        // Distribution
        const distribution = [
            { range: '0-30 days', count: 0, percentage: 0 },
            { range: '31-60 days', count: 0, percentage: 0 },
            { range: '61-90 days', count: 0, percentage: 0 },
            { range: '>90 days', count: 0, percentage: 0 }
        ];

        validConversions.forEach(c => {
            if (c.totalDays <= 30) distribution[0].count++;
            else if (c.totalDays <= 60) distribution[1].count++;
            else if (c.totalDays <= 90) distribution[2].count++;
            else distribution[3].count++;
        });

        const total = validConversions.length;
        distribution.forEach(d => {
            d.percentage = total > 0 ? Math.round((d.count / total) * 100) : 0;
        });

        res.json({
            success: true,
            data: {
                conversions,
                summary,
                distribution
            }
        });
    } catch (error) {
        logger.error('Error getting lead conversion time report:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب تقرير وقت التحويل / Error fetching conversion time report',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// QUICK STATS DASHBOARD (NEW)
// ═══════════════════════════════════════════════════════════════

/**
 * Get quick stats for CRM dashboard
 */
exports.getQuickStats = async (req, res) => {
    try {
        const allowedParams = pickAllowedFields(req.query, ['period']);
        const { period = 'month' } = allowedParams;

        const data = await crmReportsService.getQuickStats(req.firmQuery, { period });

        res.json({
            success: true,
            data
        });
    } catch (error) {
        logger.error('Error getting quick stats:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب الإحصائيات السريعة / Error fetching quick stats',
            error: error.message
        });
    }
};

/**
 * Get recent activity for dashboard
 */
exports.getRecentActivity = async (req, res) => {
    try {
        const allowedParams = pickAllowedFields(req.query, ['limit']);
        const limit = Math.min(parseInt(allowedParams.limit) || 5, 20);

        const data = await crmReportsService.getRecentActivity(req.firmQuery, limit);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        logger.error('Error getting recent activity:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب النشاط الأخير / Error fetching recent activity',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// SALES FUNNEL REPORT (NEW)
// ═══════════════════════════════════════════════════════════════

/**
 * Get sales funnel overview
 */
exports.getFunnelOverview = async (req, res) => {
    try {
        const allowedParams = pickAllowedFields(req.query, ['startDate', 'endDate', 'pipelineId']);
        const { startDate, endDate, pipelineId } = allowedParams;

        const filters = { startDate, endDate };
        if (pipelineId) {
            const sanitizedPipelineId = sanitizeObjectId(pipelineId);
            if (!sanitizedPipelineId) {
                return res.status(400).json({ success: false, message: 'Invalid pipelineId format' });
            }
            filters.pipelineId = sanitizedPipelineId;
        }

        const data = await crmReportsService.getFunnelOverview(req.firmQuery, filters);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        logger.error('Error getting funnel overview:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب تقرير القمع / Error fetching funnel report',
            error: error.message
        });
    }
};

/**
 * Get funnel velocity
 */
exports.getFunnelVelocity = async (req, res) => {
    try {
        const allowedParams = pickAllowedFields(req.query, ['startDate', 'endDate']);
        const data = await crmReportsService.getFunnelVelocity(req.firmQuery, allowedParams);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        logger.error('Error getting funnel velocity:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب سرعة القمع / Error fetching funnel velocity',
            error: error.message
        });
    }
};

/**
 * Get funnel bottlenecks
 */
exports.getFunnelBottlenecks = async (req, res) => {
    try {
        const data = await crmReportsService.getFunnelBottlenecks(req.firmQuery);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        logger.error('Error getting funnel bottlenecks:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب اختناقات القمع / Error fetching funnel bottlenecks',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// DEAL AGING REPORT (NEW)
// ═══════════════════════════════════════════════════════════════

/**
 * Get deal aging overview
 */
exports.getAgingOverview = async (req, res) => {
    try {
        const allowedParams = pickAllowedFields(req.query, ['startDate', 'endDate', 'stageId', 'ownerId', 'threshold']);
        const filters = { ...allowedParams };

        if (filters.stageId) {
            const sanitizedStageId = sanitizeObjectId(filters.stageId);
            if (!sanitizedStageId) {
                return res.status(400).json({ success: false, message: 'Invalid stageId format' });
            }
            filters.stageId = sanitizedStageId;
        }

        if (filters.ownerId) {
            const sanitizedOwnerId = sanitizeObjectId(filters.ownerId);
            if (!sanitizedOwnerId) {
                return res.status(400).json({ success: false, message: 'Invalid ownerId format' });
            }
            filters.ownerId = sanitizedOwnerId;
        }

        const data = await crmReportsService.getDealAgingOverview(req.firmQuery, filters);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        logger.error('Error getting aging overview:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب تقرير تقادم الصفقات / Error fetching deal aging report',
            error: error.message
        });
    }
};

/**
 * Get aging by stage
 */
exports.getAgingByStage = async (req, res) => {
    try {
        const allowedParams = pickAllowedFields(req.query, ['threshold']);
        const data = await crmReportsService.getAgingByStage(req.firmQuery, allowedParams);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        logger.error('Error getting aging by stage:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب التقادم حسب المرحلة / Error fetching aging by stage',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// LEADS BY SOURCE REPORT (NEW)
// ═══════════════════════════════════════════════════════════════

/**
 * Get leads by source overview
 */
exports.getLeadsSourceOverview = async (req, res) => {
    try {
        const allowedParams = pickAllowedFields(req.query, ['startDate', 'endDate']);
        const data = await crmReportsService.getLeadsBySourceOverview(req.firmQuery, allowedParams);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        logger.error('Error getting leads source overview:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب تقرير مصادر العملاء / Error fetching leads source report',
            error: error.message
        });
    }
};

/**
 * Get leads by source trend
 */
exports.getLeadsSourceTrend = async (req, res) => {
    try {
        const allowedParams = pickAllowedFields(req.query, ['startDate', 'endDate', 'source']);
        const data = await crmReportsService.getLeadsBySourceTrend(req.firmQuery, allowedParams);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        logger.error('Error getting leads source trend:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب اتجاه المصادر / Error fetching leads source trend',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// WIN/LOSS ANALYSIS REPORT (NEW)
// ═══════════════════════════════════════════════════════════════

/**
 * Get win/loss overview
 */
exports.getWinLossOverview = async (req, res) => {
    try {
        const allowedParams = pickAllowedFields(req.query, ['startDate', 'endDate', 'ownerId']);
        const filters = { ...allowedParams };

        if (filters.ownerId) {
            const sanitizedOwnerId = sanitizeObjectId(filters.ownerId);
            if (!sanitizedOwnerId) {
                return res.status(400).json({ success: false, message: 'Invalid ownerId format' });
            }
            filters.ownerId = sanitizedOwnerId;
        }

        const data = await crmReportsService.getWinLossOverview(req.firmQuery, filters);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        logger.error('Error getting win/loss overview:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب تقرير الفوز/الخسارة / Error fetching win/loss report',
            error: error.message
        });
    }
};

/**
 * Get lost reasons analysis
 */
exports.getLostReasons = async (req, res) => {
    try {
        const allowedParams = pickAllowedFields(req.query, ['startDate', 'endDate']);
        const data = await crmReportsService.getLostReasons(req.firmQuery, allowedParams);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        logger.error('Error getting lost reasons:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب أسباب الخسارة / Error fetching lost reasons',
            error: error.message
        });
    }
};

/**
 * Get win/loss trend
 */
exports.getWinLossTrend = async (req, res) => {
    try {
        const allowedParams = pickAllowedFields(req.query, ['startDate', 'endDate']);
        const data = await crmReportsService.getWinLossTrend(req.firmQuery, allowedParams);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        logger.error('Error getting win/loss trend:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب اتجاه الفوز/الخسارة / Error fetching win/loss trend',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// ACTIVITY ANALYTICS REPORT (NEW)
// ═══════════════════════════════════════════════════════════════

/**
 * Get activity overview
 */
exports.getActivityOverview = async (req, res) => {
    try {
        const allowedParams = pickAllowedFields(req.query, ['startDate', 'endDate', 'ownerId', 'type']);
        const filters = { ...allowedParams };

        if (filters.ownerId) {
            const sanitizedOwnerId = sanitizeObjectId(filters.ownerId);
            if (!sanitizedOwnerId) {
                return res.status(400).json({ success: false, message: 'Invalid ownerId format' });
            }
            filters.ownerId = sanitizedOwnerId;
        }

        const data = await crmReportsService.getActivityOverview(req.firmQuery, filters);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        logger.error('Error getting activity overview:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب تقرير النشاط / Error fetching activity report',
            error: error.message
        });
    }
};

/**
 * Get activity by day of week
 */
exports.getActivityByDayOfWeek = async (req, res) => {
    try {
        const allowedParams = pickAllowedFields(req.query, ['startDate', 'endDate']);
        const data = await crmReportsService.getActivityByDayOfWeek(req.firmQuery, allowedParams);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        logger.error('Error getting activity by day:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب النشاط حسب اليوم / Error fetching activity by day',
            error: error.message
        });
    }
};

/**
 * Get activity by hour
 */
exports.getActivityByHour = async (req, res) => {
    try {
        const allowedParams = pickAllowedFields(req.query, ['startDate', 'endDate']);
        const data = await crmReportsService.getActivityByHour(req.firmQuery, allowedParams);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        logger.error('Error getting activity by hour:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب النشاط حسب الساعة / Error fetching activity by hour',
            error: error.message
        });
    }
};

/**
 * Get activity leaderboard
 */
exports.getActivityLeaderboard = async (req, res) => {
    try {
        const allowedParams = pickAllowedFields(req.query, ['startDate', 'endDate']);
        const data = await crmReportsService.getActivityLeaderboard(req.firmQuery, allowedParams);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        logger.error('Error getting activity leaderboard:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب لوحة الصدارة / Error fetching leaderboard',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// REVENUE FORECAST REPORT (NEW)
// ═══════════════════════════════════════════════════════════════

/**
 * Get revenue forecast overview
 */
exports.getForecastOverview = async (req, res) => {
    try {
        const allowedParams = pickAllowedFields(req.query, ['period', 'ownerId', 'territoryId']);
        const filters = { ...allowedParams };

        if (filters.ownerId) {
            const sanitizedOwnerId = sanitizeObjectId(filters.ownerId);
            if (!sanitizedOwnerId) {
                return res.status(400).json({ success: false, message: 'Invalid ownerId format' });
            }
            filters.ownerId = sanitizedOwnerId;
        }

        if (filters.territoryId) {
            const sanitizedTerritoryId = sanitizeObjectId(filters.territoryId);
            if (!sanitizedTerritoryId) {
                return res.status(400).json({ success: false, message: 'Invalid territoryId format' });
            }
            filters.territoryId = sanitizedTerritoryId;
        }

        const data = await crmReportsService.getRevenueForecastOverview(req.firmQuery, filters);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        logger.error('Error getting forecast overview:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب تقرير التوقعات / Error fetching forecast report',
            error: error.message
        });
    }
};

/**
 * Get forecast by month
 */
exports.getForecastByMonth = async (req, res) => {
    try {
        const allowedParams = pickAllowedFields(req.query, ['year']);
        const data = await crmReportsService.getForecastByMonth(req.firmQuery, allowedParams);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        logger.error('Error getting forecast by month:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب التوقعات الشهرية / Error fetching monthly forecast',
            error: error.message
        });
    }
};

/**
 * Get forecast by rep
 */
exports.getForecastByRep = async (req, res) => {
    try {
        const allowedParams = pickAllowedFields(req.query, ['period']);
        const data = await crmReportsService.getForecastByRep(req.firmQuery, allowedParams);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        logger.error('Error getting forecast by rep:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب التوقعات حسب الممثل / Error fetching forecast by rep',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// EXPORT REPORT (NEW)
// ═══════════════════════════════════════════════════════════════

/**
 * Export report to CSV
 */
exports.exportReport = async (req, res) => {
    try {
        const allowedParams = pickAllowedFields(req.body, ['reportType', 'format', 'filters']);
        const { reportType, format = 'csv', filters = {} } = allowedParams;

        if (!reportType) {
            return res.status(400).json({
                success: false,
                message: 'Report type is required'
            });
        }

        const validReportTypes = ['funnel', 'aging', 'leads-source', 'win-loss', 'activities', 'forecast'];
        if (!validReportTypes.includes(reportType)) {
            return res.status(400).json({
                success: false,
                message: `Invalid report type. Must be one of: ${validReportTypes.join(', ')}`
            });
        }

        const csv = await crmReportsService.exportReport(req.firmQuery, reportType, filters);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=crm-report-${reportType}-${Date.now()}.csv`);
        res.send(csv);
    } catch (error) {
        logger.error('Error exporting report:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تصدير التقرير / Error exporting report',
            error: error.message
        });
    }
};
