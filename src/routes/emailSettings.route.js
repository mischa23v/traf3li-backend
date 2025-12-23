const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
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

// Apply rate limiting to all routes
router.use(apiRateLimiter);

/**
 * Email Settings Routes
 * All routes require authentication and firm membership
 */

// ═══════════════════════════════════════════════════════════════
// SMTP CONFIGURATION ROUTES
// ═══════════════════════════════════════════════════════════════

// Get SMTP configuration (admin/owner only)
router.get('/smtp', userMiddleware, firmFilter, getSmtpConfig);

// Save or update SMTP configuration (admin/owner only)
router.put('/smtp', userMiddleware, firmFilter, saveSmtpConfig);

// Test SMTP connection (admin/owner only)
router.post('/smtp/test', userMiddleware, firmFilter, testSmtpConnection);

// ═══════════════════════════════════════════════════════════════
// EMAIL TEMPLATE ROUTES
// ═══════════════════════════════════════════════════════════════

// Get all email templates
router.get('/templates', userMiddleware, firmFilter, getTemplates);

// Get single email template
router.get('/templates/:id', userMiddleware, firmFilter, getTemplate);

// Create new email template (admin/owner only)
router.post('/templates', userMiddleware, firmFilter, createTemplate);

// Update email template (admin/owner only)
router.put('/templates/:id', userMiddleware, firmFilter, updateTemplate);

// Delete email template (admin/owner only)
router.delete('/templates/:id', userMiddleware, firmFilter, deleteTemplate);

// Preview email template with sample data
router.post('/templates/:id/preview', userMiddleware, firmFilter, previewTemplate);

// ═══════════════════════════════════════════════════════════════
// EMAIL SIGNATURE ROUTES (User-specific)
// ═══════════════════════════════════════════════════════════════

// Get all signatures for the user
router.get('/signatures', userMiddleware, firmFilter, getSignatures);

// Create new signature
router.post('/signatures', userMiddleware, firmFilter, createSignature);

// Update signature
router.put('/signatures/:id', userMiddleware, firmFilter, updateSignature);

// Delete signature
router.delete('/signatures/:id', userMiddleware, firmFilter, deleteSignature);

// Set signature as default
router.put('/signatures/:id/default', userMiddleware, firmFilter, setDefaultSignature);

module.exports = router;
