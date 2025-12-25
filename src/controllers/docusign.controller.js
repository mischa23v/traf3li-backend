const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const docusignService = require('../services/docusign.service');
const DocuSignIntegration = require('../models/docusignIntegration.model');
const { pickAllowedFields } = require('../utils/securityUtils');

/**
 * DocuSign Controller
 *
 * Handles all DocuSign e-signature integration endpoints.
 * Critical for law firms - enables document signing by clients.
 */

// ═══════════════════════════════════════════════════════════════
// OAUTH FLOW
// ═══════════════════════════════════════════════════════════════

/**
 * Get OAuth authorization URL
 * GET /api/docusign/auth-url
 */
const getAuthUrl = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const authUrl = await docusignService.getAuthUrl(userId, firmId);

    res.status(200).json({
        success: true,
        authUrl
    });
});

/**
 * Handle OAuth callback
 * GET /api/docusign/callback
 */
const handleCallback = asyncHandler(async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
        // User denied access or error occurred
        return res.redirect(`${process.env.FRONTEND_URL || process.env.DASHBOARD_URL}/settings/integrations?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
        throw CustomException('Invalid callback parameters', 400);
    }

    const result = await docusignService.handleCallback(code, state);

    // Redirect to success page
    res.redirect(`${process.env.FRONTEND_URL || process.env.DASHBOARD_URL}/settings/integrations?docusign=connected`);
});

/**
 * Disconnect DocuSign
 * POST /api/docusign/disconnect
 */
const disconnect = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const result = await docusignService.disconnect(userId, firmId);

    res.status(200).json({
        success: true,
        message: 'DocuSign disconnected successfully'
    });
});

/**
 * Get integration status
 * GET /api/docusign/status
 */
const getStatus = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const status = await docusignService.getStatus(userId, firmId);

    res.status(200).json({
        success: true,
        ...status
    });
});

// ═══════════════════════════════════════════════════════════════
// ENVELOPE OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Send document for signature (create envelope)
 * POST /api/docusign/envelopes
 */
const sendForSignature = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const allowedFields = [
        'emailSubject',
        'emailBlurb',
        'status',
        'documents',
        'recipients',
        'carbonCopies',
        'linkedTo'
    ];

    const envelopeData = pickAllowedFields(req.body, allowedFields);

    // Validate required fields
    if (!envelopeData.emailSubject) {
        throw CustomException('Email subject is required', 400);
    }

    if (!envelopeData.documents || envelopeData.documents.length === 0) {
        throw CustomException('At least one document is required', 400);
    }

    if (!envelopeData.recipients || envelopeData.recipients.length === 0) {
        throw CustomException('At least one recipient is required', 400);
    }

    const envelope = await docusignService.createEnvelope(userId, envelopeData, firmId);

    res.status(201).json({
        success: true,
        message: 'Envelope created and sent successfully',
        data: envelope
    });
});

/**
 * Create envelope from template
 * POST /api/docusign/envelopes/from-template
 */
const useTemplate = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const allowedFields = [
        'templateId',
        'emailSubject',
        'emailBlurb',
        'status',
        'recipients',
        'linkedTo'
    ];

    const templateData = pickAllowedFields(req.body, allowedFields);

    // Validate required fields
    if (!templateData.templateId) {
        throw CustomException('Template ID is required', 400);
    }

    if (!templateData.emailSubject) {
        throw CustomException('Email subject is required', 400);
    }

    if (!templateData.recipients || templateData.recipients.length === 0) {
        throw CustomException('At least one recipient is required', 400);
    }

    const envelope = await docusignService.createEnvelopeFromTemplate(userId, templateData, firmId);

    res.status(201).json({
        success: true,
        message: 'Envelope created from template successfully',
        data: envelope
    });
});

/**
 * Get envelope details
 * GET /api/docusign/envelopes/:envelopeId
 */
const getEnvelope = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { envelopeId } = req.params;

    const envelope = await docusignService.getEnvelope(userId, envelopeId, firmId);

    res.status(200).json({
        success: true,
        data: envelope
    });
});

/**
 * List envelopes
 * GET /api/docusign/envelopes
 */
const listEnvelopes = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { fromDate, status, count, startPosition } = req.query;

    const options = {
        fromDate,
        status,
        count: parseInt(count) || 100,
        startPosition: parseInt(startPosition) || 0
    };

    const envelopes = await docusignService.listEnvelopes(userId, options, firmId);

    res.status(200).json({
        success: true,
        data: envelopes.envelopes || [],
        pagination: {
            totalSetSize: envelopes.totalSetSize,
            resultSetSize: envelopes.resultSetSize,
            startPosition: envelopes.startPosition,
            endPosition: envelopes.endPosition
        }
    });
});

/**
 * Download signed documents
 * GET /api/docusign/envelopes/:envelopeId/documents
 */
const downloadDocument = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { envelopeId } = req.params;

    const result = await docusignService.downloadDocuments(userId, envelopeId, firmId);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
});

/**
 * Void envelope
 * POST /api/docusign/envelopes/:envelopeId/void
 */
const voidEnvelope = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { envelopeId } = req.params;
    const { reason } = req.body;

    if (!reason) {
        throw CustomException('Void reason is required', 400);
    }

    await docusignService.voidEnvelope(userId, envelopeId, reason, firmId);

    res.status(200).json({
        success: true,
        message: 'Envelope voided successfully'
    });
});

/**
 * Resend envelope
 * POST /api/docusign/envelopes/:envelopeId/resend
 */
const resendEnvelope = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { envelopeId } = req.params;

    await docusignService.resendEnvelope(userId, envelopeId, firmId);

    res.status(200).json({
        success: true,
        message: 'Envelope resent successfully'
    });
});

/**
 * Get signing URL for embedded signing
 * POST /api/docusign/envelopes/:envelopeId/signing-url
 */
const getSigningUrl = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { envelopeId } = req.params;

    const allowedFields = [
        'email',
        'userName',
        'clientUserId',
        'returnUrl'
    ];

    const recipientData = pickAllowedFields(req.body, allowedFields);

    // Validate required fields
    if (!recipientData.email) {
        throw CustomException('Recipient email is required', 400);
    }

    if (!recipientData.userName) {
        throw CustomException('Recipient name is required', 400);
    }

    const result = await docusignService.getRecipientView(userId, envelopeId, recipientData, firmId);

    res.status(200).json({
        success: true,
        message: 'Signing URL generated successfully',
        data: {
            url: result.url
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// TEMPLATE OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * List templates
 * GET /api/docusign/templates
 */
const listTemplates = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const templates = await docusignService.listTemplates(userId, firmId);

    res.status(200).json({
        success: true,
        data: templates.envelopeTemplates || []
    });
});

/**
 * Add template to defaults
 * POST /api/docusign/templates/defaults
 */
const addDefaultTemplate = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const allowedFields = [
        'templateId',
        'templateName',
        'description',
        'type',
        'isDefault'
    ];

    const templateData = pickAllowedFields(req.body, allowedFields);

    if (!templateData.templateId) {
        throw CustomException('Template ID is required', 400);
    }

    const integration = await DocuSignIntegration.findActiveIntegration(userId, firmId);

    if (!integration) {
        throw CustomException('DocuSign not connected', 404);
    }

    await integration.addTemplate(templateData);

    res.status(200).json({
        success: true,
        message: 'Template added to defaults successfully',
        data: integration.defaultTemplates
    });
});

/**
 * Remove template from defaults
 * DELETE /api/docusign/templates/defaults/:templateId
 */
const removeDefaultTemplate = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { templateId } = req.params;

    const integration = await DocuSignIntegration.findActiveIntegration(userId, firmId);

    if (!integration) {
        throw CustomException('DocuSign not connected', 404);
    }

    await integration.removeTemplate(templateId);

    res.status(200).json({
        success: true,
        message: 'Template removed from defaults successfully',
        data: integration.defaultTemplates
    });
});

// ═══════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * Update notification settings
 * PUT /api/docusign/settings
 */
const updateSettings = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const allowedFields = [
        'webhooksEnabled',
        'events',
        'emailNotifications',
        'inAppNotifications'
    ];

    const settings = pickAllowedFields(req.body, allowedFields);

    const result = await docusignService.updateSettings(userId, settings, firmId);

    res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        data: result
    });
});

// ═══════════════════════════════════════════════════════════════
// WEBHOOK
// ═══════════════════════════════════════════════════════════════

/**
 * Handle webhook from DocuSign
 * POST /api/docusign/webhook
 */
const handleWebhook = asyncHandler(async (req, res) => {
    const payload = req.body;
    const headers = req.headers;

    // DocuSign sends XML by default, but can be configured to send JSON
    // This handler assumes JSON webhook configuration

    await docusignService.handleWebhook(payload, headers);

    // DocuSign expects 200 OK response
    res.status(200).send('OK');
});

module.exports = {
    // OAuth
    getAuthUrl,
    handleCallback,
    disconnect,
    getStatus,

    // Envelope operations
    sendForSignature,
    useTemplate,
    getEnvelope,
    listEnvelopes,
    downloadDocument,
    voidEnvelope,
    resendEnvelope,
    getSigningUrl,

    // Template operations
    listTemplates,
    addDefaultTemplate,
    removeDefaultTemplate,

    // Settings
    updateSettings,

    // Webhook
    handleWebhook
};
