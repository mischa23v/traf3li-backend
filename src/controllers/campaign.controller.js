/**
 * Campaign Controller
 *
 * Security: All operations enforce multi-tenant isolation via firmQuery
 * Handles marketing campaign management for legal CRM
 */

const Campaign = require('../models/campaign.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ═══════════════════════════════════════════════════════════════
// SECURITY CONSTANTS
// ═══════════════════════════════════════════════════════════════

/**
 * Allowed fields for campaign creation
 */
const ALLOWED_CREATE_FIELDS = [
    'name',
    'nameAr',
    'description',
    'type',
    'channel',
    'startDate',
    'endDate',
    'budget',
    'targets',
    'utm',
    'parentCampaignId',
    'ownerId',
    'teamId',
    'targetAudience',
    'emailSettings',
    'tags',
    'notes'
];

/**
 * Allowed fields for campaign updates
 */
const ALLOWED_UPDATE_FIELDS = [
    'name',
    'nameAr',
    'description',
    'type',
    'channel',
    'startDate',
    'endDate',
    'budget',
    'targets',
    'utm',
    'parentCampaignId',
    'ownerId',
    'teamId',
    'targetAudience',
    'emailSettings',
    'tags',
    'notes'
];

/**
 * Valid campaign statuses for filtering
 */
const VALID_STATUSES = ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'];

/**
 * Valid campaign types for filtering
 */
const VALID_TYPES = ['email', 'social', 'event', 'webinar', 'referral', 'advertising', 'content', 'other'];

// ═══════════════════════════════════════════════════════════════
// CREATE CAMPAIGN
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new campaign
 * @route POST /api/campaigns
 */
const createCampaign = async (req, res) => {
    try {
        const firmId = req.firmId;
        const userId = req.userID;

        // Validate required fields
        const { name, type, startDate, ownerId } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw CustomException('Campaign name is required', 400);
        }

        if (!type || !VALID_TYPES.includes(type)) {
            throw CustomException('Valid campaign type is required', 400);
        }

        if (!startDate || !Date.parse(startDate)) {
            throw CustomException('Valid start date is required', 400);
        }

        if (!ownerId || typeof ownerId !== 'string') {
            throw CustomException('Campaign owner is required', 400);
        }

        // Mass assignment protection
        const allowedFields = pickAllowedFields(req.body, ALLOWED_CREATE_FIELDS);

        // Sanitize ObjectId fields
        const sanitizedOwnerId = sanitizeObjectId(allowedFields.ownerId);
        if (!sanitizedOwnerId) {
            throw CustomException('Invalid owner ID', 400);
        }

        const sanitizedTeamId = allowedFields.teamId ? sanitizeObjectId(allowedFields.teamId) : null;
        const sanitizedParentCampaignId = allowedFields.parentCampaignId
            ? sanitizeObjectId(allowedFields.parentCampaignId)
            : null;
        const sanitizedTemplateId = allowedFields.emailSettings?.templateId
            ? sanitizeObjectId(allowedFields.emailSettings.templateId)
            : null;
        const sanitizedContactListId = allowedFields.emailSettings?.contactListId
            ? sanitizeObjectId(allowedFields.emailSettings.contactListId)
            : null;

        // Verify parent campaign exists and belongs to firm if provided
        if (sanitizedParentCampaignId) {
            const parentCampaign = await Campaign.findOne({
                _id: sanitizedParentCampaignId,
                ...req.firmQuery
            });

            if (!parentCampaign) {
                throw CustomException('Parent campaign not found', 404);
            }
        }

        // Build campaign data with firm context
        const campaignData = {
            ...allowedFields,
            ownerId: sanitizedOwnerId,
            teamId: sanitizedTeamId,
            parentCampaignId: sanitizedParentCampaignId,
            firmId,
            createdBy: userId
        };

        // Update email settings with sanitized IDs
        if (campaignData.emailSettings) {
            if (sanitizedTemplateId) {
                campaignData.emailSettings.templateId = sanitizedTemplateId;
            }
            if (sanitizedContactListId) {
                campaignData.emailSettings.contactListId = sanitizedContactListId;
            }
        }

        // Create campaign
        const campaign = new Campaign(campaignData);
        await campaign.save();

        // Fetch with population for response
        const populated = await Campaign.getCampaignById(campaign._id, firmId);

        return res.status(201).json({
            error: false,
            message: 'Campaign created successfully',
            data: populated
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error creating campaign:', message);
        return res.status(status).json({ error: true, message });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET CAMPAIGNS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all campaigns with filters
 * @route GET /api/campaigns
 */
const getCampaigns = async (req, res) => {
    try {
        const firmId = req.firmId;
        const { search, status, type, ownerId, teamId, page = 1, limit = 20 } = req.query;

        // Build query with firm isolation
        const query = { ...req.firmQuery };

        // Safe search with escaped regex
        if (search && typeof search === 'string') {
            const escapedSearch = escapeRegex(search.trim());
            query.$or = [
                { name: { $regex: escapedSearch, $options: 'i' } },
                { nameAr: { $regex: escapedSearch, $options: 'i' } },
                { campaignId: { $regex: escapedSearch, $options: 'i' } }
            ];
        }

        // Validate status against allowlist
        if (status && VALID_STATUSES.includes(status)) {
            query.status = status;
        }

        // Validate type against allowlist
        if (type && VALID_TYPES.includes(type)) {
            query.type = type;
        }

        // Filter by owner if provided
        if (ownerId) {
            const sanitizedOwnerId = sanitizeObjectId(ownerId);
            if (sanitizedOwnerId) {
                query.ownerId = sanitizedOwnerId;
            }
        }

        // Filter by team if provided
        if (teamId) {
            const sanitizedTeamId = sanitizeObjectId(teamId);
            if (sanitizedTeamId) {
                query.teamId = sanitizedTeamId;
            }
        }

        // Pagination with safe limits
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;

        // Execute query
        const [campaigns, total] = await Promise.all([
            Campaign.find(query)
                .populate('ownerId', 'firstName lastName email avatar')
                .populate('teamId', 'name')
                .populate('parentCampaignId', 'name campaignId')
                .populate('createdBy', 'firstName lastName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Campaign.countDocuments(query)
        ]);

        return res.json({
            error: false,
            data: campaigns,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error fetching campaigns:', message);
        return res.status(status).json({ error: true, message });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET CAMPAIGN BY ID
// ═══════════════════════════════════════════════════════════════

/**
 * Get single campaign by ID
 * @route GET /api/campaigns/:id
 */
const getCampaignById = async (req, res) => {
    try {
        const firmId = req.firmId;
        const sanitizedId = sanitizeObjectId(req.params.id);

        if (!sanitizedId) {
            throw CustomException('Invalid campaign ID', 400);
        }

        // IDOR Protection: Query includes firmQuery
        const campaign = await Campaign.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        })
            .populate('ownerId', 'firstName lastName email avatar phone')
            .populate('teamId', 'name members')
            .populate('parentCampaignId', 'name campaignId status')
            .populate('createdBy', 'firstName lastName')
            .populate('updatedBy', 'firstName lastName')
            .populate('launchedBy', 'firstName lastName')
            .populate('completedBy', 'firstName lastName')
            .populate('emailSettings.templateId', 'name subject');

        if (!campaign) {
            throw CustomException('Campaign not found', 404);
        }

        return res.json({ error: false, data: campaign });
    } catch ({ message, status = 500 }) {
        logger.error('Error fetching campaign:', message);
        return res.status(status).json({ error: true, message });
    }
};

// ═══════════════════════════════════════════════════════════════
// UPDATE CAMPAIGN
// ═══════════════════════════════════════════════════════════════

/**
 * Update campaign
 * @route PUT /api/campaigns/:id
 */
const updateCampaign = async (req, res) => {
    try {
        const firmId = req.firmId;
        const userId = req.userID;
        const sanitizedId = sanitizeObjectId(req.params.id);

        if (!sanitizedId) {
            throw CustomException('Invalid campaign ID', 400);
        }

        // Mass assignment protection
        const allowedFields = pickAllowedFields(req.body, ALLOWED_UPDATE_FIELDS);

        // Sanitize ObjectId fields if present
        if (allowedFields.ownerId) {
            allowedFields.ownerId = sanitizeObjectId(allowedFields.ownerId);
            if (!allowedFields.ownerId) {
                throw CustomException('Invalid owner ID', 400);
            }
        }

        if (allowedFields.teamId) {
            allowedFields.teamId = sanitizeObjectId(allowedFields.teamId);
        }

        if (allowedFields.parentCampaignId) {
            const sanitizedParentId = sanitizeObjectId(allowedFields.parentCampaignId);
            if (sanitizedParentId) {
                // Verify parent campaign exists and belongs to firm
                const parentCampaign = await Campaign.findOne({
                    _id: sanitizedParentId,
                    ...req.firmQuery
                });
                if (!parentCampaign) {
                    throw CustomException('Parent campaign not found', 404);
                }
                allowedFields.parentCampaignId = sanitizedParentId;
            } else {
                delete allowedFields.parentCampaignId;
            }
        }

        // Sanitize email settings IDs if present
        if (allowedFields.emailSettings) {
            if (allowedFields.emailSettings.templateId) {
                allowedFields.emailSettings.templateId = sanitizeObjectId(allowedFields.emailSettings.templateId);
            }
            if (allowedFields.emailSettings.contactListId) {
                allowedFields.emailSettings.contactListId = sanitizeObjectId(allowedFields.emailSettings.contactListId);
            }
        }

        // IDOR Protection: Query-level ownership check
        const campaign = await Campaign.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            {
                $set: {
                    ...allowedFields,
                    updatedBy: userId
                }
            },
            { new: true, runValidators: true }
        )
            .populate('ownerId', 'firstName lastName email avatar')
            .populate('teamId', 'name')
            .populate('parentCampaignId', 'name campaignId')
            .populate('emailSettings.templateId', 'name');

        if (!campaign) {
            throw CustomException('Campaign not found', 404);
        }

        return res.json({
            error: false,
            message: 'Campaign updated successfully',
            data: campaign
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error updating campaign:', message);
        return res.status(status).json({ error: true, message });
    }
};

// ═══════════════════════════════════════════════════════════════
// DELETE CAMPAIGN
// ═══════════════════════════════════════════════════════════════

/**
 * Delete campaign
 * @route DELETE /api/campaigns/:id
 */
const deleteCampaign = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        if (!sanitizedId) {
            throw CustomException('Invalid campaign ID', 400);
        }

        // Check if campaign has child campaigns
        const hasChildren = await Campaign.exists({
            parentCampaignId: sanitizedId,
            ...req.firmQuery
        });

        if (hasChildren) {
            throw CustomException('Cannot delete campaign with child campaigns', 400);
        }

        // IDOR Protection: Query-level ownership check
        const campaign = await Campaign.findOneAndDelete({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!campaign) {
            throw CustomException('Campaign not found', 404);
        }

        return res.json({
            error: false,
            message: 'Campaign deleted successfully'
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error deleting campaign:', message);
        return res.status(status).json({ error: true, message });
    }
};

// ═══════════════════════════════════════════════════════════════
// LAUNCH CAMPAIGN
// ═══════════════════════════════════════════════════════════════

/**
 * Launch a campaign (change status to active)
 * @route POST /api/campaigns/:id/launch
 */
const launchCampaign = async (req, res) => {
    try {
        const userId = req.userID;
        const sanitizedId = sanitizeObjectId(req.params.id);

        if (!sanitizedId) {
            throw CustomException('Invalid campaign ID', 400);
        }

        // IDOR Protection: Verify campaign belongs to user's firm
        const campaign = await Campaign.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!campaign) {
            throw CustomException('Campaign not found', 404);
        }

        // Validate campaign can be launched
        if (campaign.status === 'active') {
            throw CustomException('Campaign is already active', 400);
        }

        if (['completed', 'cancelled'].includes(campaign.status)) {
            throw CustomException('Cannot launch a completed or cancelled campaign', 400);
        }

        // Update status to active
        campaign.status = 'active';
        campaign.launchedAt = new Date();
        campaign.launchedBy = userId;
        campaign.updatedBy = userId;

        await campaign.save();

        // Populate for response
        await campaign.populate([
            { path: 'ownerId', select: 'firstName lastName email avatar' },
            { path: 'launchedBy', select: 'firstName lastName' }
        ]);

        return res.json({
            error: false,
            message: 'Campaign launched successfully',
            data: campaign
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error launching campaign:', message);
        return res.status(status).json({ error: true, message });
    }
};

// ═══════════════════════════════════════════════════════════════
// PAUSE CAMPAIGN
// ═══════════════════════════════════════════════════════════════

/**
 * Pause an active campaign
 * @route POST /api/campaigns/:id/pause
 */
const pauseCampaign = async (req, res) => {
    try {
        const userId = req.userID;
        const sanitizedId = sanitizeObjectId(req.params.id);

        if (!sanitizedId) {
            throw CustomException('Invalid campaign ID', 400);
        }

        // IDOR Protection: Query-level ownership check
        const campaign = await Campaign.findOneAndUpdate(
            {
                _id: sanitizedId,
                ...req.firmQuery,
                status: 'active'
            },
            {
                $set: {
                    status: 'paused',
                    updatedBy: userId
                }
            },
            { new: true }
        ).populate('ownerId', 'firstName lastName email avatar');

        if (!campaign) {
            throw CustomException('Campaign not found or not active', 404);
        }

        return res.json({
            error: false,
            message: 'Campaign paused successfully',
            data: campaign
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error pausing campaign:', message);
        return res.status(status).json({ error: true, message });
    }
};

// ═══════════════════════════════════════════════════════════════
// RESUME CAMPAIGN
// ═══════════════════════════════════════════════════════════════

/**
 * Resume a paused campaign
 * @route POST /api/campaigns/:id/resume
 */
const resumeCampaign = async (req, res) => {
    try {
        const userId = req.userID;
        const sanitizedId = sanitizeObjectId(req.params.id);

        if (!sanitizedId) {
            throw CustomException('Invalid campaign ID', 400);
        }

        // IDOR Protection: Query-level ownership check
        const campaign = await Campaign.findOneAndUpdate(
            {
                _id: sanitizedId,
                ...req.firmQuery,
                status: 'paused'
            },
            {
                $set: {
                    status: 'active',
                    updatedBy: userId
                }
            },
            { new: true }
        ).populate('ownerId', 'firstName lastName email avatar');

        if (!campaign) {
            throw CustomException('Campaign not found or not paused', 404);
        }

        return res.json({
            error: false,
            message: 'Campaign resumed successfully',
            data: campaign
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error resuming campaign:', message);
        return res.status(status).json({ error: true, message });
    }
};

// ═══════════════════════════════════════════════════════════════
// COMPLETE CAMPAIGN
// ═══════════════════════════════════════════════════════════════

/**
 * Mark campaign as completed
 * @route POST /api/campaigns/:id/complete
 */
const completeCampaign = async (req, res) => {
    try {
        const userId = req.userID;
        const sanitizedId = sanitizeObjectId(req.params.id);

        if (!sanitizedId) {
            throw CustomException('Invalid campaign ID', 400);
        }

        // IDOR Protection: Verify campaign belongs to user's firm
        const campaign = await Campaign.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!campaign) {
            throw CustomException('Campaign not found', 404);
        }

        if (campaign.status === 'completed') {
            throw CustomException('Campaign is already completed', 400);
        }

        if (campaign.status === 'cancelled') {
            throw CustomException('Cannot complete a cancelled campaign', 400);
        }

        // Update status to completed
        campaign.status = 'completed';
        campaign.completedAt = new Date();
        campaign.completedBy = userId;
        campaign.updatedBy = userId;

        await campaign.save();

        // Populate for response
        await campaign.populate([
            { path: 'ownerId', select: 'firstName lastName email avatar' },
            { path: 'completedBy', select: 'firstName lastName' }
        ]);

        return res.json({
            error: false,
            message: 'Campaign completed successfully',
            data: campaign
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error completing campaign:', message);
        return res.status(status).json({ error: true, message });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET CAMPAIGN STATS
// ═══════════════════════════════════════════════════════════════

/**
 * Get campaign statistics and ROI
 * @route GET /api/campaigns/:id/stats
 */
const getCampaignStats = async (req, res) => {
    try {
        const firmId = req.firmId;
        const sanitizedId = sanitizeObjectId(req.params.id);

        if (!sanitizedId) {
            throw CustomException('Invalid campaign ID', 400);
        }

        // IDOR Protection: Verify campaign belongs to user's firm
        const campaign = await Campaign.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!campaign) {
            throw CustomException('Campaign not found', 404);
        }

        // Calculate comprehensive stats using static method
        const stats = await Campaign.calculateROI(sanitizedId, firmId);

        return res.json({
            error: false,
            data: stats
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error fetching campaign stats:', message);
        return res.status(status).json({ error: true, message });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET CAMPAIGN LEADS
// ═══════════════════════════════════════════════════════════════

/**
 * Get leads generated by a campaign
 * @route GET /api/campaigns/:id/leads
 */
const getCampaignLeads = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { page = 1, limit = 20 } = req.query;

        if (!sanitizedId) {
            throw CustomException('Invalid campaign ID', 400);
        }

        // IDOR Protection: Verify campaign belongs to user's firm
        const campaign = await Campaign.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!campaign) {
            throw CustomException('Campaign not found', 404);
        }

        // Pagination with safe limits
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;

        // Note: This assumes a Lead model exists with a campaignId field
        // If Lead model is not available, this will need to be adjusted
        const Lead = mongoose.model('Lead');

        const query = {
            ...req.firmQuery,
            campaignId: sanitizedId
        };

        const [leads, total] = await Promise.all([
            Lead.find(query)
                .populate('assignedTo', 'firstName lastName email')
                .populate('createdBy', 'firstName lastName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Lead.countDocuments(query)
        ]);

        return res.json({
            error: false,
            data: leads,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error fetching campaign leads:', message);
        return res.status(status).json({ error: true, message });
    }
};

// ═══════════════════════════════════════════════════════════════
// DUPLICATE CAMPAIGN
// ═══════════════════════════════════════════════════════════════

/**
 * Duplicate an existing campaign
 * @route POST /api/campaigns/:id/duplicate
 */
const duplicateCampaign = async (req, res) => {
    try {
        const firmId = req.firmId;
        const userId = req.userID;
        const sanitizedId = sanitizeObjectId(req.params.id);

        if (!sanitizedId) {
            throw CustomException('Invalid campaign ID', 400);
        }

        // IDOR Protection: Verify campaign belongs to user's firm
        const originalCampaign = await Campaign.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!originalCampaign) {
            throw CustomException('Campaign not found', 404);
        }

        // Create duplicate campaign data
        const duplicateData = {
            name: `${originalCampaign.name} (Copy)`,
            nameAr: originalCampaign.nameAr ? `${originalCampaign.nameAr} (نسخة)` : undefined,
            description: originalCampaign.description,
            type: originalCampaign.type,
            channel: originalCampaign.channel,
            startDate: originalCampaign.startDate,
            endDate: originalCampaign.endDate,
            status: 'draft', // Always start as draft
            budget: originalCampaign.budget,
            targets: originalCampaign.targets,
            utm: originalCampaign.utm,
            parentCampaignId: originalCampaign.parentCampaignId,
            ownerId: originalCampaign.ownerId,
            teamId: originalCampaign.teamId,
            targetAudience: originalCampaign.targetAudience,
            emailSettings: originalCampaign.emailSettings,
            tags: originalCampaign.tags,
            notes: originalCampaign.notes,
            firmId,
            createdBy: userId
        };

        // Create new campaign
        const newCampaign = new Campaign(duplicateData);
        await newCampaign.save();

        // Fetch with population for response
        const populated = await Campaign.getCampaignById(newCampaign._id, firmId);

        return res.status(201).json({
            error: false,
            message: 'Campaign duplicated successfully',
            data: populated
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error duplicating campaign:', message);
        return res.status(status).json({ error: true, message });
    }
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    createCampaign,
    getCampaigns,
    getCampaignById,
    updateCampaign,
    deleteCampaign,
    launchCampaign,
    pauseCampaign,
    resumeCampaign,
    completeCampaign,
    getCampaignStats,
    getCampaignLeads,
    duplicateCampaign
};
