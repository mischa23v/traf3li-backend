/**
 * Sales Quota Controller
 *
 * Enterprise-grade quota management endpoints.
 * All endpoints enforce multi-tenant isolation via req.firmQuery.
 */

const mongoose = require('mongoose');
const SalesQuota = require('../models/salesQuota.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

const ALLOWED_FIELDS = [
    'name', 'nameAr', 'description', 'userId', 'teamId', 'isCompanyWide',
    'period', 'startDate', 'endDate', 'target', 'currency',
    'breakdownByType', 'dealsTarget', 'activityTargets', 'pipelineTargets',
    'status', 'notes'
];

/**
 * Create a new sales quota
 * POST /api/sales-quotas
 */
const createQuota = async (req, res) => {
    try {
        const data = pickAllowedFields(req.body, ALLOWED_FIELDS);

        // Add tenant context
        req.addFirmId(data);

        // Validate dates
        if (new Date(data.startDate) >= new Date(data.endDate)) {
            throw CustomException('End date must be after start date', 400);
        }

        // Validate target
        if (!data.target || data.target <= 0) {
            throw CustomException('Target must be greater than 0', 400);
        }

        data.createdBy = req.userID;
        data.status = 'active';

        const quota = await SalesQuota.create(data);

        res.status(201).json({
            success: true,
            data: quota,
            message: 'Quota created successfully'
        });
    } catch (error) {
        console.error('[SalesQuota] Create error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to create quota'
        });
    }
};

/**
 * Get all quotas with filters
 * GET /api/sales-quotas
 */
const getQuotas = async (req, res) => {
    try {
        const {
            userId,
            teamId,
            period,
            status,
            startDate,
            endDate,
            page = 1,
            limit = 20,
            sort = '-startDate'
        } = req.query;

        const query = { ...req.firmQuery };

        if (userId) query.userId = sanitizeObjectId(userId);
        if (teamId) query.teamId = sanitizeObjectId(teamId);
        if (period) query.period = period;
        if (status) query.status = status;

        if (startDate || endDate) {
            query.startDate = {};
            if (startDate) query.startDate.$gte = new Date(startDate);
            if (endDate) query.endDate = { $lte: new Date(endDate) };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [quotas, total] = await Promise.all([
            SalesQuota.find(query)
                .populate('userId', 'firstName lastName email')
                .populate('teamId', 'name')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            SalesQuota.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: quotas,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('[SalesQuota] Get all error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve quotas'
        });
    }
};

/**
 * Get a single quota
 * GET /api/sales-quotas/:id
 */
const getQuota = async (req, res) => {
    try {
        const id = sanitizeObjectId(req.params.id);

        const quota = await SalesQuota.findOne({
            _id: id,
            ...req.firmQuery
        })
            .populate('userId', 'firstName lastName email')
            .populate('teamId', 'name')
            .populate('linkedDeals.dealId', 'firstName lastName estimatedValue status');

        if (!quota) {
            throw CustomException('Quota not found', 404);
        }

        res.json({
            success: true,
            data: quota
        });
    } catch (error) {
        console.error('[SalesQuota] Get one error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to retrieve quota'
        });
    }
};

/**
 * Update a quota
 * PUT /api/sales-quotas/:id
 */
const updateQuota = async (req, res) => {
    try {
        const id = sanitizeObjectId(req.params.id);
        const data = pickAllowedFields(req.body, ALLOWED_FIELDS);

        const quota = await SalesQuota.findOne({
            _id: id,
            ...req.firmQuery
        });

        if (!quota) {
            throw CustomException('Quota not found', 404);
        }

        // Track target adjustments
        if (data.target && data.target !== quota.target) {
            quota.adjustments.push({
                date: new Date(),
                previousTarget: quota.target,
                newTarget: data.target,
                reason: data.adjustmentReason || 'Manual adjustment',
                adjustedBy: req.userID
            });
        }

        Object.assign(quota, data);
        quota.updatedBy = req.userID;

        await quota.save();

        res.json({
            success: true,
            data: quota,
            message: 'Quota updated successfully'
        });
    } catch (error) {
        console.error('[SalesQuota] Update error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to update quota'
        });
    }
};

/**
 * Delete a quota
 * DELETE /api/sales-quotas/:id
 */
const deleteQuota = async (req, res) => {
    try {
        const id = sanitizeObjectId(req.params.id);

        const quota = await SalesQuota.findOneAndDelete({
            _id: id,
            ...req.firmQuery
        });

        if (!quota) {
            throw CustomException('Quota not found', 404);
        }

        res.json({
            success: true,
            message: 'Quota deleted successfully'
        });
    } catch (error) {
        console.error('[SalesQuota] Delete error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to delete quota'
        });
    }
};

/**
 * Record deal achievement
 * POST /api/sales-quotas/:id/record-deal
 */
const recordDeal = async (req, res) => {
    try {
        const id = sanitizeObjectId(req.params.id);
        const { dealValue, dealType = 'newBusiness', dealId } = req.body;

        if (!dealValue || dealValue <= 0) {
            throw CustomException('Deal value must be greater than 0', 400);
        }

        const quota = await SalesQuota.findOne({
            _id: id,
            ...req.firmQuery,
            status: 'active'
        });

        if (!quota) {
            throw CustomException('Active quota not found', 404);
        }

        await quota.recordDeal(dealValue, dealType, dealId ? sanitizeObjectId(dealId) : null);

        res.json({
            success: true,
            data: {
                achieved: quota.achieved,
                progressPercentage: quota.progressPercentage,
                remaining: quota.remaining
            },
            message: 'Deal recorded successfully'
        });
    } catch (error) {
        console.error('[SalesQuota] Record deal error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to record deal'
        });
    }
};

/**
 * Get leaderboard
 * GET /api/sales-quotas/leaderboard
 */
const getLeaderboard = async (req, res) => {
    try {
        const { period, limit = 10 } = req.query;
        const firmId = req.firmId;

        if (!firmId) {
            throw CustomException('Firm context required', 400);
        }

        const leaderboard = await SalesQuota.getLeaderboard(firmId, {
            period,
            limit: parseInt(limit)
        });

        res.json({
            success: true,
            data: leaderboard
        });
    } catch (error) {
        console.error('[SalesQuota] Leaderboard error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to get leaderboard'
        });
    }
};

/**
 * Get team summary
 * GET /api/sales-quotas/team-summary
 */
const getTeamSummary = async (req, res) => {
    try {
        const { teamId, period } = req.query;
        const firmId = req.firmId;

        if (!firmId) {
            throw CustomException('Firm context required', 400);
        }

        const teamQuotas = await SalesQuota.getTeamQuotas(
            teamId ? sanitizeObjectId(teamId) : null,
            firmId,
            period
        );

        // Calculate team totals
        const summary = {
            totalTarget: 0,
            totalAchieved: 0,
            memberCount: teamQuotas.length,
            members: []
        };

        for (const quota of teamQuotas) {
            summary.totalTarget += quota.target || 0;
            summary.totalAchieved += quota.achieved || 0;
            summary.members.push({
                userId: quota.userId?._id,
                userName: quota.userId ? `${quota.userId.firstName} ${quota.userId.lastName}` : 'Unknown',
                target: quota.target,
                achieved: quota.achieved,
                progressPercentage: quota.progressPercentage
            });
        }

        summary.teamProgressPercentage = summary.totalTarget > 0
            ? Math.round((summary.totalAchieved / summary.totalTarget) * 100)
            : 0;

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('[SalesQuota] Team summary error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to get team summary'
        });
    }
};

/**
 * Get my current quota
 * GET /api/sales-quotas/my-quota
 */
const getMyQuota = async (req, res) => {
    try {
        const firmId = req.firmId;
        const userId = req.userID;

        const quota = await SalesQuota.getCurrentQuota(userId, firmId);

        if (!quota) {
            return res.json({
                success: true,
                data: null,
                message: 'No active quota found'
            });
        }

        res.json({
            success: true,
            data: {
                ...quota.toObject(),
                progressPercentage: quota.progressPercentage,
                remaining: quota.remaining,
                daysRemaining: quota.daysRemaining,
                dailyTargetRequired: quota.dailyTargetRequired,
                isOnTrack: quota.isOnTrack,
                attainmentStatus: quota.attainmentStatus
            }
        });
    } catch (error) {
        console.error('[SalesQuota] My quota error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get quota'
        });
    }
};

/**
 * Get period comparison
 * GET /api/sales-quotas/period-comparison
 */
const getPeriodComparison = async (req, res) => {
    try {
        const { userId, periods = 4 } = req.query;
        const firmId = req.firmId;

        if (!firmId) {
            throw CustomException('Firm context required', 400);
        }

        const query = {
            firmId: new mongoose.Types.ObjectId(firmId),
            status: { $in: ['completed', 'exceeded'] }
        };

        if (userId) {
            query.userId = sanitizeObjectId(userId);
        }

        const historicalQuotas = await SalesQuota.find(query)
            .sort({ endDate: -1 })
            .limit(parseInt(periods))
            .lean();

        const comparison = historicalQuotas.map(q => ({
            period: `${q.period} - ${new Date(q.startDate).toLocaleDateString()}`,
            target: q.target,
            achieved: q.achieved,
            progressPercentage: q.target > 0 ? Math.round((q.achieved / q.target) * 100) : 0,
            status: q.status
        }));

        res.json({
            success: true,
            data: comparison.reverse()
        });
    } catch (error) {
        console.error('[SalesQuota] Period comparison error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to get period comparison'
        });
    }
};

module.exports = {
    createQuota,
    getQuotas,
    getQuota,
    updateQuota,
    deleteQuota,
    recordDeal,
    getLeaderboard,
    getTeamSummary,
    getMyQuota,
    getPeriodComparison
};
