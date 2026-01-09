/**
 * Sales Teams Routes
 *
 * Sales team CRUD and member management.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - GET /                        - List sales teams
 * - GET /:id                     - Get sales team by ID
 * - POST /                       - Create sales team
 * - PUT /:id                     - Update sales team
 * - DELETE /:id                  - Delete sales team
 * - POST /:id/members            - Add members to team
 * - DELETE /:id/members/:userId  - Remove member from team
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const User = require('../models/user.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Allowed fields for sales teams
const ALLOWED_TEAM_FIELDS = [
    'name', 'description', 'leaderId', 'territory', 'quota',
    'targetRevenue', 'isActive', 'tags', 'metadata'
];

/**
 * GET / - List sales teams
 */
router.get('/', async (req, res, next) => {
    try {
        const { page, limit } = sanitizePagination(req.query);
        const { search, isActive, territory } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('crm.salesTeams').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let teams = firm.crm?.salesTeams || [];

        // Apply filters
        if (isActive !== undefined) {
            const active = isActive === 'true';
            teams = teams.filter(t => t.isActive === active);
        }

        if (territory) {
            teams = teams.filter(t => t.territory === territory);
        }

        if (search) {
            const pattern = escapeRegex(search).toLowerCase();
            teams = teams.filter(t =>
                t.name?.toLowerCase().includes(pattern) ||
                t.description?.toLowerCase().includes(pattern)
            );
        }

        const total = teams.length;
        teams = teams.slice((page - 1) * limit, page * limit);

        // Get leader details
        const leaderIds = teams.map(t => t.leaderId).filter(Boolean);
        const leaders = await User.find({ _id: { $in: leaderIds } })
            .select('firstName lastName email')
            .lean();

        const leadersMap = {};
        leaders.forEach(l => {
            leadersMap[l._id.toString()] = l;
        });

        const enrichedTeams = teams.map(t => ({
            ...t,
            leader: leadersMap[t.leaderId?.toString()] || null,
            memberCount: (t.members || []).length
        }));

        res.json({
            success: true,
            data: enrichedTeams,
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
        const memberIds = (team.members || []).map(m => m.userId || m);
        const members = await User.find({ _id: { $in: memberIds } })
            .select('firstName lastName email avatar')
            .lean();

        // Get leader details
        let leader = null;
        if (team.leaderId) {
            leader = await User.findById(team.leaderId)
                .select('firstName lastName email avatar')
                .lean();
        }

        res.json({
            success: true,
            data: {
                ...team,
                leader,
                members: members.map(m => ({
                    ...m,
                    role: (team.members || []).find(
                        tm => (tm.userId || tm).toString() === m._id.toString()
                    )?.role || 'member'
                }))
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST / - Create sales team
 */
router.post('/', async (req, res, next) => {
    try {
        const safeData = pickAllowedFields(req.body, ALLOWED_TEAM_FIELDS);

        if (!safeData.name) {
            throw CustomException('Team name is required', 400);
        }

        // Validate leader if provided
        if (safeData.leaderId) {
            safeData.leaderId = sanitizeObjectId(safeData.leaderId, 'leaderId');
        }

        const firm = await Firm.findOne(req.firmQuery).select('crm.salesTeams');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.crm) firm.crm = {};
        if (!firm.crm.salesTeams) firm.crm.salesTeams = [];

        // Check for duplicate name
        const existing = firm.crm.salesTeams.find(
            t => t.name?.toLowerCase() === safeData.name.toLowerCase()
        );

        if (existing) {
            throw CustomException('A team with this name already exists', 400);
        }

        const team = {
            _id: new mongoose.Types.ObjectId(),
            ...safeData,
            isActive: safeData.isActive !== false,
            members: [],
            createdBy: req.userID,
            createdAt: new Date()
        };

        // Add leader as first member if specified
        if (team.leaderId) {
            team.members.push({
                userId: team.leaderId,
                role: 'leader',
                addedAt: new Date(),
                addedBy: req.userID
            });
        }

        firm.crm.salesTeams.push(team);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Sales team created',
            data: team
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
        const safeData = pickAllowedFields(req.body, ALLOWED_TEAM_FIELDS);

        // Validate leader if provided
        if (safeData.leaderId) {
            safeData.leaderId = sanitizeObjectId(safeData.leaderId, 'leaderId');
        }

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

        // Check for duplicate name
        if (safeData.name) {
            const existing = firm.crm.salesTeams.find(
                (t, idx) => idx !== teamIndex && t.name?.toLowerCase() === safeData.name.toLowerCase()
            );

            if (existing) {
                throw CustomException('A team with this name already exists', 400);
            }
        }

        const team = firm.crm.salesTeams[teamIndex];
        const previousLeaderId = team.leaderId?.toString();

        Object.assign(team, safeData, {
            updatedBy: req.userID,
            updatedAt: new Date()
        });

        // Update leader role in members if leader changed
        if (safeData.leaderId && safeData.leaderId.toString() !== previousLeaderId) {
            // Remove old leader role
            team.members = team.members.map(m => {
                if ((m.userId || m).toString() === previousLeaderId) {
                    return { ...m, role: 'member' };
                }
                return m;
            });

            // Add/update new leader
            const newLeaderMember = team.members.find(
                m => (m.userId || m).toString() === safeData.leaderId.toString()
            );

            if (newLeaderMember) {
                newLeaderMember.role = 'leader';
            } else {
                team.members.push({
                    userId: safeData.leaderId,
                    role: 'leader',
                    addedAt: new Date(),
                    addedBy: req.userID
                });
            }
        }

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
        const { force } = req.query;

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

        // Check if team has members
        if ((team.members || []).length > 0 && force !== 'true') {
            throw CustomException('Cannot delete team with members. Use force=true or remove members first.', 400);
        }

        firm.crm.salesTeams.splice(teamIndex, 1);
        await firm.save();

        res.json({
            success: true,
            message: 'Sales team deleted'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/members - Add members to team
 */
router.post('/:id/members', async (req, res, next) => {
    try {
        const teamId = sanitizeObjectId(req.params.id, 'id');
        const { userIds, role = 'member' } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            throw CustomException('User IDs array is required', 400);
        }

        if (userIds.length > 50) {
            throw CustomException('Maximum 50 members can be added at once', 400);
        }

        const safeUserIds = userIds.map(id => sanitizeObjectId(id, 'userId'));

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

        const existingMemberIds = new Set(
            team.members.map(m => (m.userId || m).toString())
        );

        const added = [];
        const skipped = [];

        for (const userId of safeUserIds) {
            if (existingMemberIds.has(userId.toString())) {
                skipped.push(userId.toString());
                continue;
            }

            team.members.push({
                userId,
                role,
                addedAt: new Date(),
                addedBy: req.userID
            });
            added.push(userId.toString());
        }

        if (added.length > 0) {
            team.updatedAt = new Date();
            team.updatedBy = req.userID;
            await firm.save();
        }

        res.status(201).json({
            success: true,
            message: `Added ${added.length} member(s)`,
            data: {
                added: added.length,
                skipped: skipped.length,
                totalMembers: team.members.length
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

        const memberIndex = (team.members || []).findIndex(
            m => (m.userId || m).toString() === userId.toString()
        );

        if (memberIndex === -1) {
            throw CustomException('Member not found in team', 404);
        }

        // Check if removing leader
        const member = team.members[memberIndex];
        if ((member.role === 'leader' || member.userId?.toString() === team.leaderId?.toString())) {
            throw CustomException('Cannot remove team leader. Assign a new leader first.', 400);
        }

        team.members.splice(memberIndex, 1);
        team.updatedAt = new Date();
        team.updatedBy = req.userID;

        await firm.save();

        res.json({
            success: true,
            message: 'Member removed from team',
            data: {
                remainingMembers: team.members.length
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
