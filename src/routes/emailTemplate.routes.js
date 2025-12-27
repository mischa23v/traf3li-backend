/**
 * Email Template Routes
 *
 * All routes require authentication and firm filtering.
 * Provides endpoints for managing email templates in a multi-tenant legal CRM.
 */

const express = require('express');
const router = express.Router();
const emailTemplateController = require('../controllers/emailTemplate.controller');
const { userMiddleware } = require('../middlewares');

// Apply authentication to all routes
router.use(userMiddleware);

// ═══════════════════════════════════════════════════════════════
// UTILITY ROUTES (must be before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// GET /api/email-templates/variables - Get all available variables
router.get('/variables', emailTemplateController.getAvailableVariables);

// GET /api/email-templates/trigger/:triggerEvent - Get templates by trigger event
router.get('/trigger/:triggerEvent', emailTemplateController.getByTrigger);

// ═══════════════════════════════════════════════════════════════
// CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/email-templates - Get all email templates with filters
router.get('/', emailTemplateController.getTemplates);

// POST /api/email-templates - Create new email template
router.post('/', emailTemplateController.createTemplate);

// GET /api/email-templates/:id - Get single email template
router.get('/:id', emailTemplateController.getTemplateById);

// PUT /api/email-templates/:id - Update email template
router.put('/:id', emailTemplateController.updateTemplate);

// DELETE /api/email-templates/:id - Delete email template
router.delete('/:id', emailTemplateController.deleteTemplate);

// ═══════════════════════════════════════════════════════════════
// ACTION ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/email-templates/:id/preview - Preview/render template with sample data
router.post('/:id/preview', emailTemplateController.previewTemplate);

// POST /api/email-templates/:id/duplicate - Duplicate an email template
router.post('/:id/duplicate', emailTemplateController.duplicateTemplate);

// POST /api/email-templates/:id/test - Send test email
router.post('/:id/test', emailTemplateController.testSend);

module.exports = router;
