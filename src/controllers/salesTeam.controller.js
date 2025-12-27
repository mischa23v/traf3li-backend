/**
 * Sales Team Controller
 *
 * Security: All operations enforce multi-tenant isolation via firmQuery
 * Mass assignment protection via pickAllowedFields
 * ID sanitization via sanitizeObjectId
 */

const SalesTeam = require('../models/salesTeam.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Create a new sales team
 * @route POST /api/sales-teams
 */
const createTeam = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;

    // Mass assignment protection - only allow specific fields
    const allowedFields = pickAllowedFields(req.body, [
        'name',
        'nameAr',
        'description',
        'color',
        'icon',
        'leaderId',
        'defaultPipelineId',
        'pipelines',
        'territories',
        'emailAlias',
        'targets',
        'settings',
        'isDefault'
    ]);

    // Validate required fields
    if (!allowedFields.name || typeof allowedFields.name !== 'string') {
        throw CustomException('Team name is required', 400);
    }

    if (!allowedFields.leaderId) {
        throw CustomException('Team leader is required', 400);
    }

    // Sanitize ObjectId fields
    allowedFields.leaderId = sanitizeObjectId(allowedFields.leaderId);
    if (!allowedFields.leaderId) {
        throw CustomException('Invalid leader ID', 400);
    }

    if (allowedFields.defaultPipelineId) {
        allowedFields.defaultPipelineId = sanitizeObjectId(allowedFields.defaultPipelineId);
    }

    if (allowedFields.pipelines && Array.isArray(allowedFields.pipelines)) {
        allowedFields.pipelines = allowedFields.pipelines
            .map(id => sanitizeObjectId(id))
            .filter(Boolean);
    }

    if (allowedFields.territories && Array.isArray(allowedFields.territories)) {
        allowedFields.territories = allowedFields.territories
            .map(id => sanitizeObjectId(id))
            .filter(Boolean);
    }

    // If setting as default, unset other defaults first
    if (allowedFields.isDefault === true) {
        await SalesTeam.updateMany(
            { firmId, isDefault: true },
            { $set: { isDefault: false } }
        );
    }

    // Create team with firm context
    const team = new SalesTeam({
        ...allowedFields,
        firmId,
        members: [{
            userId: allowedFields.leaderId,
            role: 'leader',
            joinedAt: new Date(),
            isActive: true
        }]
    });

    await team.save();

    // Fetch with population for response
    const populated = await SalesTeam.findOne({ _id: team._id, firmId })
        .populate('leaderId', 'firstName lastName email avatar')
        .populate('members.userId', 'firstName lastName email avatar')
        .populate('defaultPipelineId', 'name nameAr')
        .populate('pipelines', 'name nameAr')
        .populate('territories', 'name nameAr');

    return res.status(201).json({
        error: false,
        message: 'Sales team created successfully',
        data: populated
    });
});

/**
 * Get all sales teams
 * @route GET /api/sales-teams
 */
const getTeams = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { search, isActive, leaderId, page = 1, limit = 20 } = req.query;

    // Build query with firm isolation
    const query = { firmId };

    // Safe search with escaped regex
    if (search) {
        const escapedSearch = escapeRegex(search);
        query.$or = [
            { name: { $regex: escapedSearch, $options: 'i' } },
            { nameAr: { $regex: escapedSearch, $options: 'i' } },
            { teamId: { $regex: escapedSearch, $options: 'i' } }
        ];
    }

    // Filter by active status
    if (isActive !== undefined) {
        query.isActive = isActive === 'true' || isActive === true;
    }

    // Filter by leader
    if (leaderId) {
        const sanitizedLeaderId = sanitizeObjectId(leaderId);
        if (sanitizedLeaderId) {
            query.leaderId = sanitizedLeaderId;
        }
    }

    // Pagination
    const parsedPage = Math.max(1, parseInt(page) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (parsedPage - 1) * parsedLimit;

    // Execute query
    const teams = await SalesTeam.find(query)
        .populate('leaderId', 'firstName lastName email avatar')
        .populate('members.userId', 'firstName lastName email avatar')
        .populate('defaultPipelineId', 'name nameAr')
        .populate('pipelines', 'name nameAr')
        .populate('territories', 'name nameAr')
        .sort({ isDefault: -1, name: 1 })
        .skip(skip)
        .limit(parsedLimit);

    const total = await SalesTeam.countDocuments(query);

    return res.json({
        error: false,
        data: teams,
        pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total,
            pages: Math.ceil(total / parsedLimit)
        }
    });
});

/**
 * Get single sales team by ID
 * @route GET /api/sales-teams/:id
 */
const getTeamById = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const sanitizedId = sanitizeObjectId(req.params.id);

    if (!sanitizedId) {
        throw CustomException('Invalid team ID', 400);
    }

    // IDOR Protection: Query includes firmId
    const team = await SalesTeam.findOne({ _id: sanitizedId, firmId })
        .populate('leaderId', 'firstName lastName email avatar')
        .populate('members.userId', 'firstName lastName email avatar')
        .populate('defaultPipelineId', 'name nameAr stages')
        .populate('pipelines', 'name nameAr stages')
        .populate('territories', 'name nameAr');

    if (!team) {
        throw CustomException('Sales team not found', 404);
    }

    return res.json({
        error: false,
        data: team
    });
});

/**
 * Update sales team
 * @route PUT /api/sales-teams/:id
 */
const updateTeam = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const sanitizedId = sanitizeObjectId(req.params.id);

    if (!sanitizedId) {
        throw CustomException('Invalid team ID', 400);
    }

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'name',
        'nameAr',
        'description',
        'color',
        'icon',
        'leaderId',
        'defaultPipelineId',
        'pipelines',
        'territories',
        'emailAlias',
        'targets',
        'settings',
        'isActive',
        'isDefault'
    ]);

    // Sanitize ObjectId fields
    if (allowedFields.leaderId) {
        allowedFields.leaderId = sanitizeObjectId(allowedFields.leaderId);
        if (!allowedFields.leaderId) {
            throw CustomException('Invalid leader ID', 400);
        }
    }

    if (allowedFields.defaultPipelineId) {
        allowedFields.defaultPipelineId = sanitizeObjectId(allowedFields.defaultPipelineId);
    }

    if (allowedFields.pipelines && Array.isArray(allowedFields.pipelines)) {
        allowedFields.pipelines = allowedFields.pipelines
            .map(id => sanitizeObjectId(id))
            .filter(Boolean);
    }

    if (allowedFields.territories && Array.isArray(allowedFields.territories)) {
        allowedFields.territories = allowedFields.territories
            .map(id => sanitizeObjectId(id))
            .filter(Boolean);
    }

    // If setting as default, unset other defaults first
    if (allowedFields.isDefault === true) {
        await SalesTeam.updateMany(
            { firmId, _id: { $ne: sanitizedId }, isDefault: true },
            { $set: { isDefault: false } }
        );
    }

    // IDOR Protection: Query-level ownership check
    const team = await SalesTeam.findOneAndUpdate(
        { _id: sanitizedId, firmId },
        { $set: allowedFields },
        { new: true, runValidators: true }
    )
        .populate('leaderId', 'firstName lastName email avatar')
        .populate('members.userId', 'firstName lastName email avatar')
        .populate('defaultPipelineId', 'name nameAr')
        .populate('pipelines', 'name nameAr')
        .populate('territories', 'name nameAr');

    if (!team) {
        throw CustomException('Sales team not found', 404);
    }

    return res.json({
        error: false,
        message: 'Sales team updated successfully',
        data: team
    });
});

/**
 * Delete sales team
 * @route DELETE /api/sales-teams/:id
 */
const deleteTeam = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const sanitizedId = sanitizeObjectId(req.params.id);

    if (!sanitizedId) {
        throw CustomException('Invalid team ID', 400);
    }

    // IDOR Protection: Query-level ownership check
    const team = await SalesTeam.findOneAndDelete({
        _id: sanitizedId,
        firmId
    });

    if (!team) {
        throw CustomException('Sales team not found', 404);
    }

    // Cannot delete default team
    if (team.isDefault) {
        throw CustomException('Cannot delete default team', 400);
    }

    return res.json({
        error: false,
        message: 'Sales team deleted successfully'
    });
});

/**
 * Add member to team
 * @route POST /api/sales-teams/:id/members
 */
const addMember = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const sanitizedId = sanitizeObjectId(req.params.id);

    if (!sanitizedId) {
        throw CustomException('Invalid team ID', 400);
    }

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, ['userId', 'role']);

    if (!allowedFields.userId) {
        throw CustomException('User ID is required', 400);
    }

    // Sanitize user ID
    allowedFields.userId = sanitizeObjectId(allowedFields.userId);
    if (!allowedFields.userId) {
        throw CustomException('Invalid user ID', 400);
    }

    // Validate role
    const validRoles = ['leader', 'member', 'support'];
    if (allowedFields.role && !validRoles.includes(allowedFields.role)) {
        throw CustomException('Invalid role. Must be leader, member, or support', 400);
    }

    // Verify team exists and belongs to firm
    const team = await SalesTeam.findOne({ _id: sanitizedId, firmId });
    if (!team) {
        throw CustomException('Sales team not found', 404);
    }

    // Check if user is already a member
    const existingIndex = team.members.findIndex(m =>
        m.userId.toString() === allowedFields.userId.toString()
    );

    if (existingIndex !== -1) {
        // Update existing member
        team.members[existingIndex].role = allowedFields.role || team.members[existingIndex].role;
        team.members[existingIndex].isActive = true;
    } else {
        // Add new member
        team.members.push({
            userId: allowedFields.userId,
            role: allowedFields.role || 'member',
            joinedAt: new Date(),
            isActive: true
        });
    }

    await team.save();

    // Return populated team
    const populated = await SalesTeam.findOne({ _id: sanitizedId, firmId })
        .populate('leaderId', 'firstName lastName email avatar')
        .populate('members.userId', 'firstName lastName email avatar');

    return res.status(201).json({
        error: false,
        message: 'Member added successfully',
        data: populated
    });
});

/**
 * Remove member from team
 * @route DELETE /api/sales-teams/:id/members/:userId
 */
const removeMember = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const sanitizedId = sanitizeObjectId(req.params.id);
    const sanitizedUserId = sanitizeObjectId(req.params.userId);

    if (!sanitizedId) {
        throw CustomException('Invalid team ID', 400);
    }

    if (!sanitizedUserId) {
        throw CustomException('Invalid user ID', 400);
    }

    // Verify team exists and belongs to firm
    const team = await SalesTeam.findOne({ _id: sanitizedId, firmId });
    if (!team) {
        throw CustomException('Sales team not found', 404);
    }

    // Cannot remove team leader
    if (team.leaderId.toString() === sanitizedUserId.toString()) {
        throw CustomException('Cannot remove team leader. Assign a new leader first.', 400);
    }

    // Remove member from array
    const initialLength = team.members.length;
    team.members = team.members.filter(m =>
        m.userId.toString() !== sanitizedUserId.toString()
    );

    if (team.members.length === initialLength) {
        throw CustomException('Member not found in team', 404);
    }

    await team.save();

    // Return populated team
    const populated = await SalesTeam.findOne({ _id: sanitizedId, firmId })
        .populate('leaderId', 'firstName lastName email avatar')
        .populate('members.userId', 'firstName lastName email avatar');

    return res.json({
        error: false,
        message: 'Member removed successfully',
        data: populated
    });
});

/**
 * Get team statistics
 * @route GET /api/sales-teams/:id/stats
 */
const getTeamStats = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const sanitizedId = sanitizeObjectId(req.params.id);

    if (!sanitizedId) {
        throw CustomException('Invalid team ID', 400);
    }

    // Verify team exists and belongs to firm
    const team = await SalesTeam.findOne({ _id: sanitizedId, firmId });
    if (!team) {
        throw CustomException('Sales team not found', 404);
    }

    // Update statistics
    await SalesTeam.updateStats(sanitizedId, firmId);

    // Fetch updated team
    const updated = await SalesTeam.findOne({ _id: sanitizedId, firmId })
        .select('stats targets');

    return res.json({
        error: false,
        data: {
            stats: updated.stats,
            targets: updated.targets
        }
    });
});

/**
 * Get team leaderboard (member performance)
 * @route GET /api/sales-teams/:id/leaderboard
 */
const getLeaderboard = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const sanitizedId = sanitizeObjectId(req.params.id);

    if (!sanitizedId) {
        throw CustomException('Invalid team ID', 400);
    }

    // Verify team exists and belongs to firm
    const team = await SalesTeam.findOne({ _id: sanitizedId, firmId })
        .populate('members.userId', 'firstName lastName email avatar');

    if (!team) {
        throw CustomException('Sales team not found', 404);
    }

    // Get member IDs
    const memberIds = team.members.filter(m => m.isActive).map(m => m.userId._id);

    // Calculate performance for each member
    const Lead = require('../models/lead.model');
    const Opportunity = require('../models/opportunity.model');

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const leaderboard = await Promise.all(team.members.filter(m => m.isActive).map(async (member) => {
        const userId = member.userId._id || member.userId;

        // Count leads
        const totalLeads = await Lead.countDocuments({
            firmId,
            assignedTo: userId
        });

        // Count opportunities and won deals
        let totalOpportunities = 0;
        let wonDeals = 0;
        let totalRevenue = 0;

        if (team.settings.useOpportunities && Opportunity) {
            totalOpportunities = await Opportunity.countDocuments({
                firmId,
                assignedTo: userId,
                status: { $in: ['open', 'in_progress'] }
            });

            wonDeals = await Opportunity.countDocuments({
                firmId,
                assignedTo: userId,
                status: 'won',
                closedDate: { $gte: firstDayOfMonth }
            });

            const revenueStats = await Opportunity.aggregate([
                {
                    $match: {
                        firmId: new require('mongoose').Types.ObjectId(firmId),
                        assignedTo: new require('mongoose').Types.ObjectId(userId),
                        status: 'won',
                        closedDate: { $gte: firstDayOfMonth }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$actualValue' }
                    }
                }
            ]);

            totalRevenue = revenueStats[0]?.total || 0;
        }

        return {
            user: member.userId,
            role: member.role,
            stats: {
                totalLeads,
                totalOpportunities,
                wonDeals,
                totalRevenue
            }
        };
    }));

    // Sort by revenue descending
    leaderboard.sort((a, b) => b.stats.totalRevenue - a.stats.totalRevenue);

    return res.json({
        error: false,
        data: leaderboard
    });
});

/**
 * Set team as default
 * @route POST /api/sales-teams/:id/default
 */
const setDefault = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const sanitizedId = sanitizeObjectId(req.params.id);

    if (!sanitizedId) {
        throw CustomException('Invalid team ID', 400);
    }

    // Verify team exists and belongs to firm
    const team = await SalesTeam.findOne({ _id: sanitizedId, firmId });
    if (!team) {
        throw CustomException('Sales team not found', 404);
    }

    // Unset all other defaults
    await SalesTeam.updateMany(
        { firmId, isDefault: true },
        { $set: { isDefault: false } }
    );

    // Set this team as default
    team.isDefault = true;
    team.isActive = true;
    await team.save();

    return res.json({
        error: false,
        message: 'Team set as default successfully',
        data: team
    });
});

module.exports = {
    createTeam,
    getTeams,
    getTeamById,
    updateTeam,
    deleteTeam,
    addMember,
    removeMember,
    getTeamStats,
    getLeaderboard,
    setDefault
};
