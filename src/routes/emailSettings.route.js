const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
  // SMTP Config
  getSmtpConfig,
  saveSmtpConfig,
  testSmtpConnection,
  // Email Templates
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
  // Email Signatures
  getSignatures,
  createSignature,
  updateSignature,
  deleteSignature,
  setDefaultSignature
} = require('../controllers/emailSettings.controller');

const router = express.Router();

/**
 * Email Settings Routes
 * All routes require authentication and firm membership
 */

// ═══════════════════════════════════════════════════════════════
// SMTP CONFIGURATION ROUTES
// ═══════════════════════════════════════════════════════════════

// Get SMTP configuration (admin/owner only)
router.get('/smtp', userMiddleware, getSmtpConfig);

// Save or update SMTP configuration (admin/owner only)
router.put('/smtp', userMiddleware, saveSmtpConfig);

// Test SMTP connection (admin/owner only)
router.post('/smtp/test', userMiddleware, testSmtpConnection);

// ═══════════════════════════════════════════════════════════════
// EMAIL TEMPLATE ROUTES
// ═══════════════════════════════════════════════════════════════

// Get all email templates
router.get('/templates', userMiddleware, getTemplates);

// Get single email template
router.get('/templates/:id', userMiddleware, getTemplate);

// Create new email template (admin/owner only)
router.post('/templates', userMiddleware, createTemplate);

// Update email template (admin/owner only)
router.put('/templates/:id', userMiddleware, updateTemplate);

// Delete email template (admin/owner only)
router.delete('/templates/:id', userMiddleware, deleteTemplate);

// Preview email template with sample data
router.post('/templates/:id/preview', userMiddleware, previewTemplate);

// ═══════════════════════════════════════════════════════════════
// EMAIL SIGNATURE ROUTES (User-specific)
// ═══════════════════════════════════════════════════════════════

// Get all signatures for the user
router.get('/signatures', userMiddleware, getSignatures);

// Create new signature
router.post('/signatures', userMiddleware, createSignature);

// Update signature
router.put('/signatures/:id', userMiddleware, updateSignature);

// Delete signature
router.delete('/signatures/:id', userMiddleware, deleteSignature);

// Set signature as default
router.put('/signatures/:id/default', userMiddleware, setDefaultSignature);

module.exports = router;
