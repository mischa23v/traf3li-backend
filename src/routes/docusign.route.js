const express = require('express');
const { userMiddleware } = require('../middlewares');
const { createWebhookAuth, preserveRawBody } = require('../middlewares/webhookAuth.middleware');
const {
    getAuthUrl,
    handleCallback,
    disconnect,
    getStatus,
    sendForSignature,
    useTemplate,
    getEnvelope,
    listEnvelopes,
    downloadDocument,
    voidEnvelope,
    resendEnvelope,
    getSigningUrl,
    listTemplates,
    addDefaultTemplate,
    removeDefaultTemplate,
    updateSettings,
    handleWebhook
} = require('../controllers/docusign.controller');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// OAUTH FLOW (Public callback, rest protected)
// ═══════════════════════════════════════════════════════════════

// OAuth authorization URL (protected)
router.get('/auth-url', userMiddleware, getAuthUrl);

// OAuth callback (public - DocuSign redirects here)
router.get('/callback', handleCallback);

// Disconnect (protected)
router.post('/disconnect', userMiddleware, disconnect);

// Get connection status (protected)
router.get('/status', userMiddleware, getStatus);

// ═══════════════════════════════════════════════════════════════
// ENVELOPE OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Send document for signature (create envelope)
router.post('/envelopes', userMiddleware, sendForSignature);

// Create envelope from template
router.post('/envelopes/from-template', userMiddleware, useTemplate);

// List envelopes
router.get('/envelopes', userMiddleware, listEnvelopes);

// Get envelope details
router.get('/envelopes/:envelopeId', userMiddleware, getEnvelope);

// Download signed documents
router.get('/envelopes/:envelopeId/documents', userMiddleware, downloadDocument);

// Void envelope
router.post('/envelopes/:envelopeId/void', userMiddleware, voidEnvelope);

// Resend envelope
router.post('/envelopes/:envelopeId/resend', userMiddleware, resendEnvelope);

// Get signing URL (for embedded signing)
router.post('/envelopes/:envelopeId/signing-url', userMiddleware, getSigningUrl);

// ═══════════════════════════════════════════════════════════════
// TEMPLATE OPERATIONS
// ═══════════════════════════════════════════════════════════════

// List templates
router.get('/templates', userMiddleware, listTemplates);

// Add template to defaults
router.post('/templates/defaults', userMiddleware, addDefaultTemplate);

// Remove template from defaults
router.delete('/templates/defaults/:templateId', userMiddleware, removeDefaultTemplate);

// ═══════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════

// Update notification settings
router.put('/settings', userMiddleware, updateSettings);

// ═══════════════════════════════════════════════════════════════
// WEBHOOK (Public - DocuSign posts here)
// ═══════════════════════════════════════════════════════════════

// Handle webhook notifications from DocuSign
// SECURITY: Validates HMAC signature using DOCUSIGN_WEBHOOK_SECRET
// preserveRawBody middleware captures raw request body for signature validation
// createWebhookAuth('docusign') validates the x-docusign-signature-1 header
router.post('/webhook', preserveRawBody, createWebhookAuth('docusign'), handleWebhook);

module.exports = router;
