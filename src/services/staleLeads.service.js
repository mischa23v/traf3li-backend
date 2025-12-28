/**
 * Stale Leads Service
 *
 * Enterprise-grade stale/dormant lead detection and management.
 * Identifies leads that haven't progressed through the pipeline.
 *
 * Features:
 * - Configurable staleness thresholds per stage
 * - Multi-level staleness (warning, stale, dormant)
 * - Re-engagement recommendations
 * - Automated notifications
 */

const mongoose = require('mongoose');
const Lead = require('../models/lead.model');
const CRMTransaction = require('../models/crmTransaction.model');

class StaleLeadsService {
    // Default thresholds (days)
    static THRESHOLDS = {
        warning: 7,
        stale: 14,
        dormant: 30,
        dead: 60
    };

    // Stage-specific thresholds (can be overridden per firm)
    static STAGE_THRESHOLDS = {
        new: { warning: 3, stale: 7, dormant: 14 },
        contacted: { warning: 5, stale: 10, dormant: 21 },
        qualified: { warning: 7, stale: 14, dormant: 30 },
        proposal: { warning: 10, stale: 21, dormant: 45 },
        negotiation: { warning: 14, stale: 30, dormant: 60 }
    };

    /**
     * Get stale leads for a firm
     * @param {ObjectId} firmId - Firm ID
     * @param {Object} options - Query options
     */
    async getStaleLeads(firmId, options = {}) {
        const {
            threshold = 'warning',
            stageId = null,
            assignedTo = null,
            limit = 50,
            offset = 0,
            includeDetails = true
        } = options;

        const thresholdDays = StaleLeadsService.THRESHOLDS[threshold] || 7;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);

        const query = {
            firmId: new mongoose.Types.ObjectId(firmId),
            status: { $nin: ['won', 'lost', 'converted', 'archived'] },
            $or: [
                { lastActivityAt: { $lt: cutoffDate } },
                { lastActivityAt: { $exists: false } },
                { 'pipelineStage.enteredAt': { $lt: cutoffDate } }
            ]
        };

        if (stageId) {
            query.pipelineStageId = new mongoose.Types.ObjectId(stageId);
        }
        if (assignedTo) {
            query.assignedTo = new mongoose.Types.ObjectId(assignedTo);
        }

        const selectFields = includeDetails
            ? 'firstName lastName email phone status pipelineStageId assignedTo lastActivityAt lastContactedAt estimatedValue createdAt'
            : 'firstName lastName status lastActivityAt';

        const [leads, total] = await Promise.all([
            Lead.find(query)
                .select(selectFields)
                .populate('pipelineStageId', 'name nameAr order')
                .populate('assignedTo', 'firstName lastName email')
                .sort({ lastActivityAt: 1 })
                .skip(offset)
                .limit(limit)
                .lean(),
            Lead.countDocuments(query)
        ]);

        // Enrich with staleness info
        const enrichedLeads = leads.map(lead => ({
            ...lead,
            daysInactive: this._calculateDaysInactive(lead),
            staleLevel: this._getStaleLevel(lead),
            recommendation: this._getRecommendation(lead)
        }));

        return {
            leads: enrichedLeads,
            total,
            pagination: { limit, offset, hasMore: offset + leads.length < total }
        };
    }

    /**
     * Get stale leads for solo lawyer
     */
    async getStaleLeadsForLawyer(lawyerId, options = {}) {
        const {
            threshold = 'warning',
            limit = 50,
            offset = 0
        } = options;

        const thresholdDays = StaleLeadsService.THRESHOLDS[threshold] || 7;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);

        const query = {
            lawyerId: new mongoose.Types.ObjectId(lawyerId),
            status: { $nin: ['won', 'lost', 'converted', 'archived'] },
            $or: [
                { lastActivityAt: { $lt: cutoffDate } },
                { lastActivityAt: { $exists: false } }
            ]
        };

        const [leads, total] = await Promise.all([
            Lead.find(query)
                .select('firstName lastName email phone status pipelineStageId lastActivityAt estimatedValue')
                .populate('pipelineStageId', 'name nameAr')
                .sort({ lastActivityAt: 1 })
                .skip(offset)
                .limit(limit)
                .lean(),
            Lead.countDocuments(query)
        ]);

        return {
            leads: leads.map(lead => ({
                ...lead,
                daysInactive: this._calculateDaysInactive(lead),
                staleLevel: this._getStaleLevel(lead)
            })),
            total
        };
    }

    /**
     * Get staleness summary for firm
     */
    async getStaleSummary(firmId) {
        const now = new Date();
        const thresholds = StaleLeadsService.THRESHOLDS;

        const warningCutoff = new Date(now - thresholds.warning * 24 * 60 * 60 * 1000);
        const staleCutoff = new Date(now - thresholds.stale * 24 * 60 * 60 * 1000);
        const dormantCutoff = new Date(now - thresholds.dormant * 24 * 60 * 60 * 1000);
        const deadCutoff = new Date(now - thresholds.dead * 24 * 60 * 60 * 1000);

        const baseQuery = {
            firmId: new mongoose.Types.ObjectId(firmId),
            status: { $nin: ['won', 'lost', 'converted', 'archived'] }
        };

        const [fresh, warning, stale, dormant, dead, total] = await Promise.all([
            // Fresh: activity within warning threshold
            Lead.countDocuments({
                ...baseQuery,
                lastActivityAt: { $gte: warningCutoff }
            }),
            // Warning: between warning and stale
            Lead.countDocuments({
                ...baseQuery,
                lastActivityAt: { $lt: warningCutoff, $gte: staleCutoff }
            }),
            // Stale: between stale and dormant
            Lead.countDocuments({
                ...baseQuery,
                lastActivityAt: { $lt: staleCutoff, $gte: dormantCutoff }
            }),
            // Dormant: between dormant and dead
            Lead.countDocuments({
                ...baseQuery,
                lastActivityAt: { $lt: dormantCutoff, $gte: deadCutoff }
            }),
            // Dead: beyond dead threshold
            Lead.countDocuments({
                ...baseQuery,
                $or: [
                    { lastActivityAt: { $lt: deadCutoff } },
                    { lastActivityAt: { $exists: false } }
                ]
            }),
            // Total active leads
            Lead.countDocuments(baseQuery)
        ]);

        // Calculate value at risk
        const valueAtRisk = await Lead.aggregate([
            {
                $match: {
                    ...baseQuery,
                    $or: [
                        { lastActivityAt: { $lt: staleCutoff } },
                        { lastActivityAt: { $exists: false } }
                    ],
                    estimatedValue: { $gt: 0 }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$estimatedValue' },
                    count: { $sum: 1 }
                }
            }
        ]);

        return {
            total,
            breakdown: {
                fresh: { count: fresh, percentage: Math.round((fresh / total) * 100) || 0 },
                warning: { count: warning, percentage: Math.round((warning / total) * 100) || 0 },
                stale: { count: stale, percentage: Math.round((stale / total) * 100) || 0 },
                dormant: { count: dormant, percentage: Math.round((dormant / total) * 100) || 0 },
                dead: { count: dead, percentage: Math.round((dead / total) * 100) || 0 }
            },
            valueAtRisk: {
                amount: valueAtRisk[0]?.total || 0,
                leadCount: valueAtRisk[0]?.count || 0,
                currency: 'SAR'
            },
            thresholds: StaleLeadsService.THRESHOLDS
        };
    }

    /**
     * Get staleness by stage
     */
    async getStalenessbyStage(firmId, pipelineId = null) {
        const match = {
            firmId: new mongoose.Types.ObjectId(firmId),
            status: { $nin: ['won', 'lost', 'converted', 'archived'] }
        };

        if (pipelineId) {
            match.pipelineId = new mongoose.Types.ObjectId(pipelineId);
        }

        const now = new Date();

        const results = await Lead.aggregate([
            { $match: match },
            {
                $lookup: {
                    from: 'pipelinestages',
                    localField: 'pipelineStageId',
                    foreignField: '_id',
                    as: 'stage'
                }
            },
            { $unwind: { path: '$stage', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    daysInactive: {
                        $divide: [
                            { $subtract: [now, { $ifNull: ['$lastActivityAt', '$createdAt'] }] },
                            1000 * 60 * 60 * 24
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: '$pipelineStageId',
                    stageName: { $first: '$stage.name' },
                    stageOrder: { $first: '$stage.order' },
                    total: { $sum: 1 },
                    fresh: {
                        $sum: { $cond: [{ $lt: ['$daysInactive', 7] }, 1, 0] }
                    },
                    warning: {
                        $sum: { $cond: [{ $and: [{ $gte: ['$daysInactive', 7] }, { $lt: ['$daysInactive', 14] }] }, 1, 0] }
                    },
                    stale: {
                        $sum: { $cond: [{ $and: [{ $gte: ['$daysInactive', 14] }, { $lt: ['$daysInactive', 30] }] }, 1, 0] }
                    },
                    dormant: {
                        $sum: { $cond: [{ $gte: ['$daysInactive', 30] }, 1, 0] }
                    },
                    avgDaysInactive: { $avg: '$daysInactive' },
                    totalValue: { $sum: { $ifNull: ['$estimatedValue', 0] } }
                }
            },
            { $sort: { stageOrder: 1 } }
        ]);

        return results;
    }

    /**
     * Get leads needing immediate attention
     */
    async getLeadsNeedingAttention(firmId, options = {}) {
        const { limit = 10 } = options;
        const now = new Date();
        const staleCutoff = new Date(now - 14 * 24 * 60 * 60 * 1000);

        const leads = await Lead.aggregate([
            {
                $match: {
                    firmId: new mongoose.Types.ObjectId(firmId),
                    status: { $nin: ['won', 'lost', 'converted', 'archived'] },
                    $or: [
                        { lastActivityAt: { $lt: staleCutoff } },
                        { lastActivityAt: { $exists: false } }
                    ]
                }
            },
            {
                $addFields: {
                    urgencyScore: {
                        $add: [
                            // Value factor (higher value = higher urgency)
                            { $multiply: [{ $ifNull: ['$estimatedValue', 0] }, 0.01] },
                            // Days inactive (more days = higher urgency, max 100)
                            {
                                $min: [
                                    100,
                                    {
                                        $divide: [
                                            { $subtract: [now, { $ifNull: ['$lastActivityAt', '$createdAt'] }] },
                                            1000 * 60 * 60 * 24
                                        ]
                                    }
                                ]
                            },
                            // Hot leads get priority
                            { $cond: [{ $eq: ['$leadScore.category', 'hot'] }, 50, 0] }
                        ]
                    }
                }
            },
            { $sort: { urgencyScore: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'pipelinestages',
                    localField: 'pipelineStageId',
                    foreignField: '_id',
                    as: 'stage'
                }
            },
            { $unwind: { path: '$stage', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'assignedTo',
                    foreignField: '_id',
                    as: 'owner'
                }
            },
            { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    firstName: 1,
                    lastName: 1,
                    email: 1,
                    phone: 1,
                    estimatedValue: 1,
                    lastActivityAt: 1,
                    stageName: '$stage.name',
                    ownerName: { $concat: ['$owner.firstName', ' ', '$owner.lastName'] },
                    urgencyScore: 1,
                    daysInactive: {
                        $divide: [
                            { $subtract: [now, { $ifNull: ['$lastActivityAt', '$createdAt'] }] },
                            1000 * 60 * 60 * 24
                        ]
                    }
                }
            }
        ]);

        return leads.map(lead => ({
            ...lead,
            daysInactive: Math.floor(lead.daysInactive),
            recommendation: this._getRecommendationFromScore(lead.urgencyScore)
        }));
    }

    /**
     * Update lead staleness flags (batch job)
     */
    async updateStaleFlags(firmId = null) {
        const now = new Date();
        const thresholds = StaleLeadsService.THRESHOLDS;

        const match = {
            status: { $nin: ['won', 'lost', 'converted', 'archived'] }
        };

        if (firmId) {
            match.firmId = new mongoose.Types.ObjectId(firmId);
        }

        // Update stale flags in batches
        const leads = await Lead.find(match)
            .select('_id lastActivityAt staleLevel')
            .lean();

        let updated = 0;

        for (const lead of leads) {
            const daysInactive = this._calculateDaysInactive(lead);
            let newStaleLevel = 'fresh';

            if (daysInactive >= thresholds.dead) {
                newStaleLevel = 'dead';
            } else if (daysInactive >= thresholds.dormant) {
                newStaleLevel = 'dormant';
            } else if (daysInactive >= thresholds.stale) {
                newStaleLevel = 'stale';
            } else if (daysInactive >= thresholds.warning) {
                newStaleLevel = 'warning';
            }

            if (lead.staleLevel !== newStaleLevel) {
                await Lead.updateOne(
                    { _id: lead._id },
                    { $set: { staleLevel: newStaleLevel, staleLevelUpdatedAt: now } }
                );
                updated++;
            }
        }

        return { processed: leads.length, updated };
    }

    /**
     * Log re-engagement activity
     */
    async logReengagement(leadId, firmId, userId, activityType) {
        await CRMTransaction.log({
            firmId,
            type: 'lead_reengaged',
            category: 'lead',
            entityType: 'lead',
            entityId: leadId,
            description: `Lead re-engaged via ${activityType}`,
            performedBy: userId,
            metadata: { activityType, previousStaleLevel: 'stale' }
        });

        // Update lead's last activity
        await Lead.updateOne(
            { _id: leadId },
            {
                $set: {
                    lastActivityAt: new Date(),
                    staleLevel: 'fresh'
                }
            }
        );
    }

    // Private helper methods

    _calculateDaysInactive(lead) {
        const lastActivity = lead.lastActivityAt || lead.createdAt;
        if (!lastActivity) return 999;
        const now = new Date();
        const diff = now - new Date(lastActivity);
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    _getStaleLevel(lead) {
        const days = this._calculateDaysInactive(lead);
        const thresholds = StaleLeadsService.THRESHOLDS;

        if (days >= thresholds.dead) return 'dead';
        if (days >= thresholds.dormant) return 'dormant';
        if (days >= thresholds.stale) return 'stale';
        if (days >= thresholds.warning) return 'warning';
        return 'fresh';
    }

    _getRecommendation(lead) {
        const staleLevel = this._getStaleLevel(lead);

        switch (staleLevel) {
            case 'warning':
                return {
                    action: 'follow_up',
                    message: 'Schedule a follow-up call or email',
                    priority: 'medium'
                };
            case 'stale':
                return {
                    action: 're_engage',
                    message: 'Send personalized outreach or offer value',
                    priority: 'high'
                };
            case 'dormant':
                return {
                    action: 'nurture_campaign',
                    message: 'Add to nurture campaign or reassess qualification',
                    priority: 'high'
                };
            case 'dead':
                return {
                    action: 'archive_or_revive',
                    message: 'Consider archiving or final outreach attempt',
                    priority: 'low'
                };
            default:
                return {
                    action: 'maintain',
                    message: 'Continue current engagement',
                    priority: 'normal'
                };
        }
    }

    _getRecommendationFromScore(urgencyScore) {
        if (urgencyScore > 150) return 'Urgent: High-value lead needs immediate attention';
        if (urgencyScore > 100) return 'High Priority: Schedule follow-up today';
        if (urgencyScore > 50) return 'Medium Priority: Follow up this week';
        return 'Low Priority: Add to nurture sequence';
    }
}

module.exports = new StaleLeadsService();
