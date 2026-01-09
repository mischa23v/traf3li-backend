/**
 * Drip Campaigns Routes
 *
 * Email marketing drip campaign management.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - GET /                        - Get all drip campaigns
 * - GET /:id                     - Get drip campaign by ID
 * - POST /                       - Create drip campaign
 * - PUT /:id                     - Update drip campaign
 * - DELETE /:id                  - Delete drip campaign
 * - POST /:id/start              - Start drip campaign
 * - POST /:id/pause              - Pause drip campaign
 * - POST /:id/stop               - Stop drip campaign
 * - GET /:id/analytics           - Get campaign analytics
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Allowed fields for drip campaigns
const ALLOWED_CAMPAIGN_FIELDS = [
    'name', 'description', 'targetAudience', 'triggerType', 'triggerConditions',
    'emails', 'schedule', 'goals', 'tags', 'isActive', 'startDate', 'endDate'
];

// Allowed fields for email steps
const ALLOWED_EMAIL_FIELDS = [
    'subject', 'body', 'templateId', 'delay', 'delayUnit',
    'conditions', 'sendTime', 'trackOpens', 'trackClicks'
];

// Valid trigger types
const VALID_TRIGGER_TYPES = ['signup', 'purchase', 'abandoned_cart', 'inactivity', 'date', 'custom'];
const VALID_DELAY_UNITS = ['minutes', 'hours', 'days', 'weeks'];

/**
 * GET / - Get all drip campaigns
 */
router.get('/', async (req, res, next) => {
    try {
        const { page, limit, skip } = sanitizePagination(req.query.page, req.query.limit);
        const { status, triggerType, search } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('emailMarketing.dripCampaigns').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let campaigns = firm.emailMarketing?.dripCampaigns || [];

        if (status) {
            campaigns = campaigns.filter(c => c.status === status);
        }
        if (triggerType) {
            campaigns = campaigns.filter(c => c.triggerType === triggerType);
        }
        if (search) {
            const pattern = escapeRegex(search).toLowerCase();
            campaigns = campaigns.filter(c =>
                c.name?.toLowerCase().includes(pattern) ||
                c.description?.toLowerCase().includes(pattern)
            );
        }

        campaigns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const total = campaigns.length;
        const paginatedCampaigns = campaigns.slice(skip, skip + limit);

        res.json({
            success: true,
            data: paginatedCampaigns,
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
 * GET /:id - Get drip campaign by ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const campaignId = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery).select('emailMarketing.dripCampaigns').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const campaign = (firm.emailMarketing?.dripCampaigns || []).find(
            c => c._id?.toString() === campaignId.toString()
        );

        if (!campaign) {
            throw CustomException('Drip campaign not found', 404);
        }

        res.json({
            success: true,
            data: campaign
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST / - Create drip campaign
 */
router.post('/', async (req, res, next) => {
    try {
        const safeData = pickAllowedFields(req.body, ALLOWED_CAMPAIGN_FIELDS);

        if (!safeData.name) {
            throw CustomException('Campaign name is required', 400);
        }

        if (safeData.triggerType && !VALID_TRIGGER_TYPES.includes(safeData.triggerType)) {
            throw CustomException(`Invalid trigger type. Must be one of: ${VALID_TRIGGER_TYPES.join(', ')}`, 400);
        }

        // Validate email steps
        if (safeData.emails && Array.isArray(safeData.emails)) {
            safeData.emails = safeData.emails.map((email, index) => {
                const safeEmail = pickAllowedFields(email, ALLOWED_EMAIL_FIELDS);
                if (!safeEmail.subject && !safeEmail.templateId) {
                    throw CustomException(`Email step ${index + 1} must have subject or templateId`, 400);
                }
                if (safeEmail.delayUnit && !VALID_DELAY_UNITS.includes(safeEmail.delayUnit)) {
                    throw CustomException(`Invalid delay unit for email ${index + 1}`, 400);
                }
                return {
                    _id: new mongoose.Types.ObjectId(),
                    ...safeEmail,
                    order: index,
                    delay: safeEmail.delay || 0,
                    delayUnit: safeEmail.delayUnit || 'days'
                };
            });
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.emailMarketing) firm.emailMarketing = {};
        if (!firm.emailMarketing.dripCampaigns) firm.emailMarketing.dripCampaigns = [];

        const campaign = {
            _id: new mongoose.Types.ObjectId(),
            ...safeData,
            status: 'draft',
            statistics: {
                totalSent: 0,
                totalOpened: 0,
                totalClicked: 0,
                totalConverted: 0,
                totalUnsubscribed: 0
            },
            createdBy: req.userID,
            createdAt: new Date()
        };

        firm.emailMarketing.dripCampaigns.push(campaign);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Drip campaign created',
            data: campaign
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /:id - Update drip campaign
 */
router.put('/:id', async (req, res, next) => {
    try {
        const campaignId = sanitizeObjectId(req.params.id, 'id');
        const safeData = pickAllowedFields(req.body, ALLOWED_CAMPAIGN_FIELDS);

        if (safeData.triggerType && !VALID_TRIGGER_TYPES.includes(safeData.triggerType)) {
            throw CustomException(`Invalid trigger type. Must be one of: ${VALID_TRIGGER_TYPES.join(', ')}`, 400);
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const campaignIndex = (firm.emailMarketing?.dripCampaigns || []).findIndex(
            c => c._id?.toString() === campaignId.toString()
        );

        if (campaignIndex === -1) {
            throw CustomException('Drip campaign not found', 404);
        }

        const campaign = firm.emailMarketing.dripCampaigns[campaignIndex];

        // Cannot update running campaigns
        if (campaign.status === 'running') {
            throw CustomException('Cannot update a running campaign. Pause it first.', 400);
        }

        // Validate and process email steps
        if (safeData.emails && Array.isArray(safeData.emails)) {
            safeData.emails = safeData.emails.map((email, index) => {
                const safeEmail = pickAllowedFields(email, ALLOWED_EMAIL_FIELDS);
                return {
                    _id: email._id ? sanitizeObjectId(email._id, 'emailId') : new mongoose.Types.ObjectId(),
                    ...safeEmail,
                    order: index,
                    delay: safeEmail.delay || 0,
                    delayUnit: safeEmail.delayUnit || 'days'
                };
            });
        }

        Object.assign(firm.emailMarketing.dripCampaigns[campaignIndex], safeData, {
            updatedBy: req.userID,
            updatedAt: new Date()
        });

        await firm.save();

        res.json({
            success: true,
            message: 'Drip campaign updated',
            data: firm.emailMarketing.dripCampaigns[campaignIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:id - Delete drip campaign
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const campaignId = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const campaignIndex = (firm.emailMarketing?.dripCampaigns || []).findIndex(
            c => c._id?.toString() === campaignId.toString()
        );

        if (campaignIndex === -1) {
            throw CustomException('Drip campaign not found', 404);
        }

        const campaign = firm.emailMarketing.dripCampaigns[campaignIndex];

        // Cannot delete running campaigns
        if (campaign.status === 'running') {
            throw CustomException('Cannot delete a running campaign. Stop it first.', 400);
        }

        firm.emailMarketing.dripCampaigns.splice(campaignIndex, 1);
        await firm.save();

        res.json({
            success: true,
            message: 'Drip campaign deleted'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/start - Start drip campaign
 */
router.post('/:id/start', async (req, res, next) => {
    try {
        const campaignId = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const campaign = (firm.emailMarketing?.dripCampaigns || []).find(
            c => c._id?.toString() === campaignId.toString()
        );

        if (!campaign) {
            throw CustomException('Drip campaign not found', 404);
        }

        if (campaign.status === 'running') {
            throw CustomException('Campaign is already running', 400);
        }

        // Validate campaign is ready to start
        if (!campaign.emails || campaign.emails.length === 0) {
            throw CustomException('Campaign must have at least one email step', 400);
        }

        campaign.status = 'running';
        campaign.startedAt = new Date();
        campaign.startedBy = req.userID;
        campaign.updatedAt = new Date();

        await firm.save();

        res.json({
            success: true,
            message: 'Drip campaign started',
            data: campaign
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/pause - Pause drip campaign
 */
router.post('/:id/pause', async (req, res, next) => {
    try {
        const campaignId = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const campaign = (firm.emailMarketing?.dripCampaigns || []).find(
            c => c._id?.toString() === campaignId.toString()
        );

        if (!campaign) {
            throw CustomException('Drip campaign not found', 404);
        }

        if (campaign.status !== 'running') {
            throw CustomException('Campaign is not running', 400);
        }

        campaign.status = 'paused';
        campaign.pausedAt = new Date();
        campaign.pausedBy = req.userID;
        campaign.updatedAt = new Date();

        await firm.save();

        res.json({
            success: true,
            message: 'Drip campaign paused',
            data: campaign
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/stop - Stop drip campaign
 */
router.post('/:id/stop', async (req, res, next) => {
    try {
        const campaignId = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const campaign = (firm.emailMarketing?.dripCampaigns || []).find(
            c => c._id?.toString() === campaignId.toString()
        );

        if (!campaign) {
            throw CustomException('Drip campaign not found', 404);
        }

        if (campaign.status === 'draft' || campaign.status === 'stopped') {
            throw CustomException('Campaign is not active', 400);
        }

        campaign.status = 'stopped';
        campaign.stoppedAt = new Date();
        campaign.stoppedBy = req.userID;
        campaign.updatedAt = new Date();

        await firm.save();

        res.json({
            success: true,
            message: 'Drip campaign stopped',
            data: campaign
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:id/analytics - Get campaign analytics
 */
router.get('/:id/analytics', async (req, res, next) => {
    try {
        const campaignId = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery).select('emailMarketing.dripCampaigns').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const campaign = (firm.emailMarketing?.dripCampaigns || []).find(
            c => c._id?.toString() === campaignId.toString()
        );

        if (!campaign) {
            throw CustomException('Drip campaign not found', 404);
        }

        const stats = campaign.statistics || {};

        // Calculate rates
        const totalSent = stats.totalSent || 0;
        const openRate = totalSent > 0 ? Math.round(((stats.totalOpened || 0) / totalSent) * 100) : 0;
        const clickRate = totalSent > 0 ? Math.round(((stats.totalClicked || 0) / totalSent) * 100) : 0;
        const conversionRate = totalSent > 0 ? Math.round(((stats.totalConverted || 0) / totalSent) * 100) : 0;
        const unsubscribeRate = totalSent > 0 ? Math.round(((stats.totalUnsubscribed || 0) / totalSent) * 100) : 0;

        // Per-email statistics
        const emailStats = (campaign.emails || []).map((email, index) => ({
            order: index + 1,
            subject: email.subject,
            sent: email.statistics?.sent || 0,
            opened: email.statistics?.opened || 0,
            clicked: email.statistics?.clicked || 0,
            openRate: email.statistics?.sent > 0
                ? Math.round((email.statistics.opened / email.statistics.sent) * 100)
                : 0,
            clickRate: email.statistics?.sent > 0
                ? Math.round((email.statistics.clicked / email.statistics.sent) * 100)
                : 0
        }));

        res.json({
            success: true,
            data: {
                campaignId: campaign._id,
                campaignName: campaign.name,
                status: campaign.status,
                startedAt: campaign.startedAt,
                overview: {
                    totalSent,
                    totalOpened: stats.totalOpened || 0,
                    totalClicked: stats.totalClicked || 0,
                    totalConverted: stats.totalConverted || 0,
                    totalUnsubscribed: stats.totalUnsubscribed || 0,
                    openRate,
                    clickRate,
                    conversionRate,
                    unsubscribeRate
                },
                emailStats,
                goals: campaign.goals || [],
                funnel: {
                    sent: totalSent,
                    opened: stats.totalOpened || 0,
                    clicked: stats.totalClicked || 0,
                    converted: stats.totalConverted || 0
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
