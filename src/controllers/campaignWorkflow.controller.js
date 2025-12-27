/**
 * Campaign Workflow Controller
 * Security: All operations enforce multi-tenant isolation via firmQuery
 *
 * Exposes campaignWorkflow.service.js methods as API endpoints for:
 * - Campaign creation and management
 * - Contact list building
 * - Campaign launch and scheduling
 * - Email tracking (opens, clicks, bounces)
 * - Campaign attribution and ROI
 * - A/B testing
 * - Campaign analytics and reporting
 */

const CampaignWorkflowService = require('../services/campaignWorkflow.service');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Create campaign
 * POST /api/campaign-workflow/create
 */
const createCampaign = async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, [
            'name',
            'type',
            'description',
            'startDate',
            'endDate',
            'budget',
            'goals',
            'targetAudience',
            'tags'
        ]);

        const campaign = await CampaignWorkflowService.createCampaign(
            allowedFields,
            req.firmId,
            req.userID
        );

        return res.status(201).json({
            error: false,
            message: 'Campaign created successfully',
            data: campaign
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Duplicate campaign
 * POST /api/campaign-workflow/duplicate/:id
 */
const duplicateCampaign = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const campaign = await CampaignWorkflowService.duplicateCampaign(
            sanitizedId,
            req.firmId,
            req.userID
        );

        return res.status(201).json({
            error: false,
            message: 'Campaign duplicated successfully',
            data: campaign
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Archive campaign
 * POST /api/campaign-workflow/archive/:id
 */
const archiveCampaign = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const campaign = await CampaignWorkflowService.archiveCampaign(
            sanitizedId,
            req.firmId,
            req.userID
        );

        return res.status(200).json({
            error: false,
            message: 'Campaign archived',
            data: campaign
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Delete campaign
 * DELETE /api/campaign-workflow/delete/:id
 */
const deleteCampaign = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        await CampaignWorkflowService.deleteCampaign(
            sanitizedId,
            req.firmId,
            req.userID
        );

        return res.status(200).json({
            error: false,
            message: 'Campaign deleted successfully'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Add contacts to campaign
 * POST /api/campaign-workflow/add-contacts/:id
 */
const addContactsToCampaign = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { contactIds } = req.body;

        if (!contactIds || !Array.isArray(contactIds)) {
            throw CustomException('Contact IDs array is required', 400);
        }

        const campaign = await CampaignWorkflowService.addContactsToCampaign(
            sanitizedId,
            contactIds,
            req.firmId,
            req.userID
        );

        return res.status(200).json({
            error: false,
            message: 'Contacts added to campaign',
            data: campaign
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Remove contacts from campaign
 * POST /api/campaign-workflow/remove-contacts/:id
 */
const removeContactsFromCampaign = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { contactIds } = req.body;

        if (!contactIds || !Array.isArray(contactIds)) {
            throw CustomException('Contact IDs array is required', 400);
        }

        const campaign = await CampaignWorkflowService.removeContactsFromCampaign(
            sanitizedId,
            contactIds,
            req.firmId,
            req.userID
        );

        return res.status(200).json({
            error: false,
            message: 'Contacts removed from campaign',
            data: campaign
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Import contact list
 * POST /api/campaign-workflow/import-list/:id
 */
const importContactList = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { listId } = req.body;

        if (!listId) {
            throw CustomException('Contact list ID is required', 400);
        }

        const campaign = await CampaignWorkflowService.importContactList(
            sanitizedId,
            listId,
            req.firmId,
            req.userID
        );

        return res.status(200).json({
            error: false,
            message: 'Contact list imported',
            data: campaign
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Build dynamic list
 * POST /api/campaign-workflow/build-dynamic-list/:id
 */
const buildDynamicList = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { filters } = req.body;

        if (!filters) {
            throw CustomException('Filters are required for dynamic list', 400);
        }

        const campaign = await CampaignWorkflowService.buildDynamicList(
            sanitizedId,
            filters,
            req.firmId,
            req.userID
        );

        return res.status(200).json({
            error: false,
            message: 'Dynamic list built',
            data: campaign
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Refresh dynamic list
 * POST /api/campaign-workflow/refresh-dynamic-list/:id
 */
const refreshDynamicList = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const campaign = await CampaignWorkflowService.refreshDynamicList(
            sanitizedId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            message: 'Dynamic list refreshed',
            data: campaign
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Validate campaign
 * POST /api/campaign-workflow/validate/:id
 */
const validateCampaign = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const validation = await CampaignWorkflowService.validateCampaign(
            sanitizedId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            data: validation
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Schedule campaign
 * POST /api/campaign-workflow/schedule/:id
 */
const scheduleCampaign = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { scheduledDateTime } = req.body;

        if (!scheduledDateTime) {
            throw CustomException('Scheduled date/time is required', 400);
        }

        const campaign = await CampaignWorkflowService.scheduleCampaign(
            sanitizedId,
            scheduledDateTime,
            req.firmId,
            req.userID
        );

        return res.status(200).json({
            error: false,
            message: 'Campaign scheduled',
            data: campaign
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Launch campaign
 * POST /api/campaign-workflow/launch/:id
 */
const launchCampaign = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const campaign = await CampaignWorkflowService.launchCampaign(
            sanitizedId,
            req.firmId,
            req.userID
        );

        return res.status(200).json({
            error: false,
            message: 'Campaign launched',
            data: campaign
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Pause campaign
 * POST /api/campaign-workflow/pause/:id
 */
const pauseCampaign = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const campaign = await CampaignWorkflowService.pauseCampaign(
            sanitizedId,
            req.firmId,
            req.userID
        );

        return res.status(200).json({
            error: false,
            message: 'Campaign paused',
            data: campaign
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Resume campaign
 * POST /api/campaign-workflow/resume/:id
 */
const resumeCampaign = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const campaign = await CampaignWorkflowService.resumeCampaign(
            sanitizedId,
            req.firmId,
            req.userID
        );

        return res.status(200).json({
            error: false,
            message: 'Campaign resumed',
            data: campaign
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Send campaign emails
 * POST /api/campaign-workflow/send-emails/:id
 */
const sendCampaignEmails = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const result = await CampaignWorkflowService.sendCampaignEmails(
            sanitizedId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            message: 'Campaign emails sent',
            data: result
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Send test email
 * POST /api/campaign-workflow/send-test/:id
 */
const sendTestEmail = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { testEmail } = req.body;

        if (!testEmail) {
            throw CustomException('Test email address is required', 400);
        }

        await CampaignWorkflowService.sendTestEmail(
            sanitizedId,
            testEmail,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            message: 'Test email sent'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Track email open
 * POST /api/campaign-workflow/track-open/:trackingId
 */
const trackOpen = async (req, res) => {
    try {
        const { trackingId } = req.params;

        await CampaignWorkflowService.trackOpen(trackingId);

        // Return tracking pixel
        res.set('Content-Type', 'image/gif');
        return res.status(200).send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Track email click
 * POST /api/campaign-workflow/track-click/:trackingId
 */
const trackClick = async (req, res) => {
    try {
        const { trackingId } = req.params;
        const { url } = req.body;

        if (!url) {
            throw CustomException('URL is required', 400);
        }

        await CampaignWorkflowService.trackClick(trackingId, url);

        return res.status(200).json({
            error: false,
            message: 'Click tracked'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Track unsubscribe
 * POST /api/campaign-workflow/track-unsubscribe/:trackingId
 */
const trackUnsubscribe = async (req, res) => {
    try {
        const { trackingId } = req.params;

        await CampaignWorkflowService.trackUnsubscribe(trackingId);

        return res.status(200).json({
            error: false,
            message: 'Unsubscribed successfully'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Track bounce
 * POST /api/campaign-workflow/track-bounce/:trackingId
 */
const trackBounce = async (req, res) => {
    try {
        const { trackingId } = req.params;
        const { bounceType, bounceReason } = req.body;

        await CampaignWorkflowService.trackBounce(
            trackingId,
            bounceType,
            bounceReason
        );

        return res.status(200).json({
            error: false,
            message: 'Bounce tracked'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Track reply
 * POST /api/campaign-workflow/track-reply/:trackingId
 */
const trackReply = async (req, res) => {
    try {
        const { trackingId } = req.params;

        await CampaignWorkflowService.trackReply(trackingId);

        return res.status(200).json({
            error: false,
            message: 'Reply tracked'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Attribute lead to campaign
 * POST /api/campaign-workflow/attribute-lead/:campaignId
 */
const attributeLeadToCampaign = async (req, res) => {
    try {
        const sanitizedCampaignId = sanitizeObjectId(req.params.campaignId);
        const { leadId } = req.body;

        if (!leadId) {
            throw CustomException('Lead ID is required', 400);
        }

        const attribution = await CampaignWorkflowService.attributeLeadToCampaign(
            sanitizedCampaignId,
            leadId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            message: 'Lead attributed to campaign',
            data: attribution
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Attribute conversion
 * POST /api/campaign-workflow/attribute-conversion/:campaignId
 */
const attributeConversion = async (req, res) => {
    try {
        const sanitizedCampaignId = sanitizeObjectId(req.params.campaignId);
        const { leadId, conversionType, value } = req.body;

        if (!leadId || !conversionType) {
            throw CustomException('Lead ID and conversion type are required', 400);
        }

        const attribution = await CampaignWorkflowService.attributeConversion(
            sanitizedCampaignId,
            leadId,
            conversionType,
            value,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            message: 'Conversion attributed',
            data: attribution
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Calculate campaign ROI
 * GET /api/campaign-workflow/calculate-roi/:id
 */
const calculateCampaignROI = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const roi = await CampaignWorkflowService.calculateCampaignROI(
            sanitizedId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            data: roi
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get attribution
 * GET /api/campaign-workflow/attribution/:id
 */
const getAttribution = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const attribution = await CampaignWorkflowService.getAttribution(
            sanitizedId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            data: attribution
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Create A/B test
 * POST /api/campaign-workflow/create-ab-test/:id
 */
const createABTest = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { variants, testMetric, splitPercentage } = req.body;

        if (!variants || !Array.isArray(variants)) {
            throw CustomException('Variants array is required', 400);
        }

        const test = await CampaignWorkflowService.createABTest(
            sanitizedId,
            variants,
            testMetric,
            splitPercentage,
            req.firmId,
            req.userID
        );

        return res.status(201).json({
            error: false,
            message: 'A/B test created',
            data: test
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get variant stats
 * GET /api/campaign-workflow/variant-stats/:testId
 */
const getVariantStats = async (req, res) => {
    try {
        const sanitizedTestId = sanitizeObjectId(req.params.testId);

        const stats = await CampaignWorkflowService.getVariantStats(
            sanitizedTestId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            data: stats
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Declare winner
 * POST /api/campaign-workflow/declare-winner/:testId
 */
const declareWinner = async (req, res) => {
    try {
        const sanitizedTestId = sanitizeObjectId(req.params.testId);
        const { winnerVariantId } = req.body;

        if (!winnerVariantId) {
            throw CustomException('Winner variant ID is required', 400);
        }

        const test = await CampaignWorkflowService.declareWinner(
            sanitizedTestId,
            winnerVariantId,
            req.firmId,
            req.userID
        );

        return res.status(200).json({
            error: false,
            message: 'Winner declared',
            data: test
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get campaign stats
 * GET /api/campaign-workflow/stats/:id
 */
const getCampaignStats = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const stats = await CampaignWorkflowService.getCampaignStats(
            sanitizedId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            data: stats
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get engagement metrics
 * GET /api/campaign-workflow/engagement/:id
 */
const getEngagementMetrics = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const metrics = await CampaignWorkflowService.getEngagementMetrics(
            sanitizedId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            data: metrics
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get delivery report
 * GET /api/campaign-workflow/delivery-report/:id
 */
const getDeliveryReport = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const report = await CampaignWorkflowService.getDeliveryReport(
            sanitizedId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            data: report
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Export campaign report
 * GET /api/campaign-workflow/export-report/:id
 */
const exportCampaignReport = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { format } = req.query;

        const report = await CampaignWorkflowService.exportCampaignReport(
            sanitizedId,
            format || 'pdf',
            req.firmId
        );

        return res.status(200).json({
            error: false,
            data: report
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

module.exports = {
    createCampaign,
    duplicateCampaign,
    archiveCampaign,
    deleteCampaign,
    addContactsToCampaign,
    removeContactsFromCampaign,
    importContactList,
    buildDynamicList,
    refreshDynamicList,
    validateCampaign,
    scheduleCampaign,
    launchCampaign,
    pauseCampaign,
    resumeCampaign,
    sendCampaignEmails,
    sendTestEmail,
    trackOpen,
    trackClick,
    trackUnsubscribe,
    trackBounce,
    trackReply,
    attributeLeadToCampaign,
    attributeConversion,
    calculateCampaignROI,
    getAttribution,
    createABTest,
    getVariantStats,
    declareWinner,
    getCampaignStats,
    getEngagementMetrics,
    getDeliveryReport,
    exportCampaignReport
};
