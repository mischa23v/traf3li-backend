/**
 * Organization Template Routes
 *
 * Routes for managing organization templates:
 * - Admin routes for CRUD operations
 * - Public routes for viewing and selecting templates
 * - Template application and comparison endpoints
 */

const express = require('express');
const {
    userMiddleware,
    requireAdmin
} = require('../middlewares');
const { auditAction } = require('../middlewares/auditLog.middleware');
const {
    // Admin endpoints
    createTemplate,
    listTemplates,
    getTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplateToFirm,
    compareWithTemplate,
    cloneTemplate,
    setAsDefault,
    getTemplateStats,

    // Public endpoints
    getAvailableTemplates,
    getDefaultTemplate,
    previewTemplate
} = require('../controllers/organizationTemplate.controller');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// PUBLIC ROUTES (Authenticated users)
// ═══════════════════════════════════════════════════════════════

// Get available templates for firm creation
router.get(
    '/available',
    userMiddleware,
    getAvailableTemplates
);

// Get the default template
router.get(
    '/default',
    userMiddleware,
    getDefaultTemplate
);

// Preview template configuration
router.get(
    '/:id/preview',
    userMiddleware,
    previewTemplate
);

// ═══════════════════════════════════════════════════════════════
// ADMIN ROUTES (Admin only)
// ═══════════════════════════════════════════════════════════════

// Get template statistics
router.get(
    '/admin/stats',
    userMiddleware,
    requireAdmin,
    getTemplateStats
);

// List all templates
router.get(
    '/admin',
    userMiddleware,
    requireAdmin,
    listTemplates
);

// Create new template
router.post(
    '/admin',
    userMiddleware,
    requireAdmin,
    auditAction('create_organization_template', 'organization_template', {
        severity: 'high',
        category: 'configuration'
    }),
    createTemplate
);

// Get single template
router.get(
    '/admin/:id',
    userMiddleware,
    requireAdmin,
    getTemplate
);

// Update template
router.put(
    '/admin/:id',
    userMiddleware,
    requireAdmin,
    auditAction('update_organization_template', 'organization_template', {
        severity: 'high',
        category: 'configuration',
        captureChanges: true
    }),
    updateTemplate
);

// Delete template
router.delete(
    '/admin/:id',
    userMiddleware,
    requireAdmin,
    auditAction('delete_organization_template', 'organization_template', {
        severity: 'high',
        category: 'configuration'
    }),
    deleteTemplate
);

// Clone template
router.post(
    '/admin/:id/clone',
    userMiddleware,
    requireAdmin,
    auditAction('clone_organization_template', 'organization_template', {
        severity: 'medium',
        category: 'configuration'
    }),
    cloneTemplate
);

// Set as default template
router.post(
    '/admin/:id/set-default',
    userMiddleware,
    requireAdmin,
    auditAction('set_default_template', 'organization_template', {
        severity: 'high',
        category: 'configuration'
    }),
    setAsDefault
);

// Apply template to firm
router.post(
    '/admin/:id/apply/:firmId',
    userMiddleware,
    requireAdmin,
    auditAction('apply_template_to_firm', 'organization_template', {
        severity: 'critical',
        category: 'configuration',
        captureChanges: true
    }),
    applyTemplateToFirm
);

// Compare firm with template
router.get(
    '/admin/:id/compare/:firmId',
    userMiddleware,
    requireAdmin,
    compareWithTemplate
);

module.exports = router;
