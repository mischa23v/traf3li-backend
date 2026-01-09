/**
 * Sales Teams Extended Routes
 *
 * Extended sales team operations - CRUD, member management.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - GET /:id                     - Get sales team by ID
 * - PUT /:id                     - Update sales team
 * - DELETE /:id                  - Delete sales team
 * - POST /:id/members            - Add member to team
 * - DELETE /:id/members/:userId  - Remove member from team
 * - GET /:id/performance         - Get team performance stats
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const User = require('../models/user.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Allowed update fields
const ALLOWED_UPDATE_FIELDS = [
    'name', 'description', 'manager', 'region', 'territory',
    'quota', 'isActive', 'color', 'priority'
];

/**
 * GET /:id - Get sales team by ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const teamId = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery).select('crm.salesTeams').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const team = (firm.crm?.salesTeams || []).find(
            t => t._id?.toString() === teamId.toString()
        );

        if (!team) {
            throw CustomException('Sales team not found', 404);
        }

        // Get member details
        const memberIds = team.members || [];
        let members = [];
        if (memberIds.length > 0) {
            members = await User.find({ _id: { $in: memberIds } })
                .select('firstName lastName email avatar role')
                .lean();
        }

        // Get manager details
        let manager = null;
        if (team.manager) {
            manager = await User.findById(team.manager)
                .select('firstName lastName email avatar')
                .lean();
        }

        res.json({
            success: true,
            data: {
                ...team,
                members,
                manager,
                memberCount: members.length
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /:id - Update sales team
 */
router.put('/:id', async (req, res, next) => {
    try {
        const teamId = sanitizeObjectId(req.params.id, 'id');
        const safeData = pickAllowedFields(req.body, ALLOWED_UPDATE_FIELDS);

        const firm = await Firm.findOne(req.firmQuery).select('crm.salesTeams');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const team = (firm.crm?.salesTeams || []).find(
            t => t._id?.toString() === teamId.toString()
        );

        if (!team) {
            throw CustomException('Sales team not found', 404);
        }

        // Check for duplicate name
        if (safeData.name) {
            const existing = firm.crm.salesTeams.find(
                t => t._id?.toString() !== teamId.toString() &&
                     t.name?.toLowerCase() === safeData.name.toLowerCase()
            );
            if (existing) {
                throw CustomException('A sales team with this name already exists', 400);
            }
        }

        // Validate manager if provided
        if (safeData.manager) {
            safeData.manager = sanitizeObjectId(safeData.manager, 'manager');
        }

        // Apply updates
        Object.assign(team, safeData);
        team.updatedBy = req.userID;
        team.updatedAt = new Date();

        await firm.save();

        res.json({
            success: true,
            message: 'Sales team updated',
            data: team
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:id - Delete sales team
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const teamId = sanitizeObjectId(req.params.id, 'id');
        const { reassignTo } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('crm.salesTeams');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const teamIndex = (firm.crm?.salesTeams || []).findIndex(
            t => t._id?.toString() === teamId.toString()
        );

        if (teamIndex === -1) {
            throw CustomException('Sales team not found', 404);
        }

        const team = firm.crm.salesTeams[teamIndex];

        // Reassign members if specified
        if (reassignTo && team.members && team.members.length > 0) {
            const targetTeamId = sanitizeObjectId(reassignTo, 'reassignTo');
            const targetTeam = firm.crm.salesTeams.find(
                t => t._id?.toString() === targetTeamId.toString()
            );

            if (targetTeam) {
                if (!targetTeam.members) targetTeam.members = [];
                team.members.forEach(memberId => {
                    if (!targetTeam.members.some(m => m.toString() === memberId.toString())) {
                        targetTeam.members.push(memberId);
                    }
                });
            }
        }

        firm.crm.salesTeams.splice(teamIndex, 1);
        await firm.save();

        res.json({
            success: true,
            message: 'Sales team deleted',
            data: {
                deletedTeamId: teamId,
                membersReassigned: reassignTo ? team.members?.length || 0 : 0
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/members - Add member to team
 */
router.post('/:id/members', async (req, res, next) => {
    try {
        const teamId = sanitizeObjectId(req.params.id, 'id');
        const { userId, role } = req.body;

        if (!userId) {
            throw CustomException('User ID is required', 400);
        }

        const safeUserId = sanitizeObjectId(userId, 'userId');

        const firm = await Firm.findOne(req.firmQuery).select('crm.salesTeams');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const team = (firm.crm?.salesTeams || []).find(
            t => t._id?.toString() === teamId.toString()
        );

        if (!team) {
            throw CustomException('Sales team not found', 404);
        }

        if (!team.members) team.members = [];

        // Check if already a member
        if (team.members.some(m => m.toString() === safeUserId.toString())) {
            throw CustomException('User is already a member of this team', 400);
        }

        // Verify user exists
        const user = await User.findById(safeUserId).select('firstName lastName email').lean();
        if (!user) {
            throw CustomException('User not found', 404);
        }

        team.members.push(safeUserId);
        team.updatedAt = new Date();

        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Member added to team',
            data: {
                teamId,
                userId: safeUserId,
                user,
                memberCount: team.members.length
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:id/members/:userId - Remove member from team
 */
router.delete('/:id/members/:userId', async (req, res, next) => {
    try {
        const teamId = sanitizeObjectId(req.params.id, 'id');
        const userId = sanitizeObjectId(req.params.userId, 'userId');

        const firm = await Firm.findOne(req.firmQuery).select('crm.salesTeams');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const team = (firm.crm?.salesTeams || []).find(
            t => t._id?.toString() === teamId.toString()
        );

        if (!team) {
            throw CustomException('Sales team not found', 404);
        }

        if (!team.members) team.members = [];

        const memberIndex = team.members.findIndex(m => m.toString() === userId.toString());
        if (memberIndex === -1) {
            throw CustomException('User is not a member of this team', 404);
        }

        team.members.splice(memberIndex, 1);
        team.updatedAt = new Date();

        await firm.save();

        res.json({
            success: true,
            message: 'Member removed from team',
            data: {
                teamId,
                userId,
                memberCount: team.members.length
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:id/performance - Get team performance stats
 */
router.get('/:id/performance', async (req, res, next) => {
    try {
        const teamId = sanitizeObjectId(req.params.id, 'id');
        const { period = '30d' } = req.query;

        const firm = await Firm.findOne(req.firmQuery)
            .select('crm.salesTeams crm.deals crm.leads')
            .lean();

        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const team = (firm.crm?.salesTeams || []).find(
            t => t._id?.toString() === teamId.toString()
        );

        if (!team) {
            throw CustomException('Sales team not found', 404);
        }

        const memberIds = new Set((team.members || []).map(m => m.toString()));

        // Calculate period
        const days = parseInt(period) || 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        // Count deals
        const deals = (firm.crm?.deals || []).filter(d => {
            const ownerId = d.ownerId?.toString() || d.assignedTo?.toString();
            return memberIds.has(ownerId);
        });

        const recentDeals = deals.filter(d =>
            d.createdAt && new Date(d.createdAt) >= cutoffDate
        );

        const wonDeals = deals.filter(d => d.status === 'won' || d.stage === 'won');
        const recentWonDeals = wonDeals.filter(d =>
            d.wonAt && new Date(d.wonAt) >= cutoffDate
        );

        // Count leads
        const leads = (firm.crm?.leads || []).filter(l => {
            const ownerId = l.ownerId?.toString() || l.assignedTo?.toString();
            return memberIds.has(ownerId);
        });

        const recentLeads = leads.filter(l =>
            l.createdAt && new Date(l.createdAt) >= cutoffDate
        );

        const convertedLeads = leads.filter(l => l.status === 'converted');

        // Calculate revenue
        const totalRevenue = wonDeals.reduce((sum, d) => sum + (d.value || d.amount || 0), 0);
        const recentRevenue = recentWonDeals.reduce((sum, d) => sum + (d.value || d.amount || 0), 0);

        // Quota progress
        const quotaProgress = team.quota && team.quota > 0
            ? Math.round((recentRevenue / team.quota) * 100)
            : null;

        res.json({
            success: true,
            data: {
                teamId,
                teamName: team.name,
                period: `Last ${days} days`,
                performance: {
                    deals: {
                        total: deals.length,
                        recent: recentDeals.length,
                        won: wonDeals.length,
                        recentWon: recentWonDeals.length
                    },
                    leads: {
                        total: leads.length,
                        recent: recentLeads.length,
                        converted: convertedLeads.length,
                        conversionRate: leads.length > 0
                            ? Math.round((convertedLeads.length / leads.length) * 100)
                            : 0
                    },
                    revenue: {
                        total: totalRevenue,
                        recent: recentRevenue,
                        avgDealSize: wonDeals.length > 0
                            ? Math.round(totalRevenue / wonDeals.length)
                            : 0
                    },
                    quota: {
                        target: team.quota || null,
                        progress: quotaProgress,
                        remaining: team.quota ? Math.max(0, team.quota - recentRevenue) : null
                    }
                },
                memberCount: memberIds.size
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
