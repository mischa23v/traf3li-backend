const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
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
router.get('/auth-url', userMiddleware, firmFilter, getAuthUrl);

// OAuth callback (public - DocuSign redirects here)
router.get('/callback', handleCallback);

// Disconnect (protected)
router.post('/disconnect', userMiddleware, firmFilter, disconnect);

// Get connection status (protected)
router.get('/status', userMiddleware, firmFilter, getStatus);

// ═══════════════════════════════════════════════════════════════
// ENVELOPE OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Send document for signature (create envelope)
router.post('/envelopes', userMiddleware, firmFilter, sendForSignature);

// Create envelope from template
router.post('/envelopes/from-template', userMiddleware, firmFilter, useTemplate);

// List envelopes
router.get('/envelopes', userMiddleware, firmFilter, listEnvelopes);

// Get envelope details
router.get('/envelopes/:envelopeId', userMiddleware, firmFilter, getEnvelope);

// Download signed documents
router.get('/envelopes/:envelopeId/documents', userMiddleware, firmFilter, downloadDocument);

// Void envelope
router.post('/envelopes/:envelopeId/void', userMiddleware, firmFilter, voidEnvelope);

// Resend envelope
router.post('/envelopes/:envelopeId/resend', userMiddleware, firmFilter, resendEnvelope);

// Get signing URL (for embedded signing)
router.post('/envelopes/:envelopeId/signing-url', userMiddleware, firmFilter, getSigningUrl);

// ═══════════════════════════════════════════════════════════════
// TEMPLATE OPERATIONS
// ═══════════════════════════════════════════════════════════════

// List templates
router.get('/templates', userMiddleware, firmFilter, listTemplates);

// Add template to defaults
router.post('/templates/defaults', userMiddleware, firmFilter, addDefaultTemplate);

// Remove template from defaults
router.delete('/templates/defaults/:templateId', userMiddleware, firmFilter, removeDefaultTemplate);

// ═══════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════

// Update notification settings
router.put('/settings', userMiddleware, firmFilter, updateSettings);

// ═══════════════════════════════════════════════════════════════
// WEBHOOK (Public - DocuSign posts here)
// ═══════════════════════════════════════════════════════════════

// Handle webhook notifications from DocuSign
router.post('/webhook', handleWebhook);

module.exports = router;
