/**
 * Quality Module Routes
 *
 * Comprehensive quality management API routes for inspections, templates,
 * CAPA (Corrective and Preventive Actions), statistics, and settings.
 *
 * Base route: /api/quality
 */

const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const {
    validateCreateInspection,
    validateUpdateInspection,
    validateCreateTemplate,
    validateUpdateTemplate,
    validateCreateAction,
    validateUpdateAction,
    validateUpdateSettings
} = require('../validators/quality.validator');
const {
    // Inspections
    getInspections,
    getInspectionById,
    createInspection,
    updateInspection,
    submitInspection,
    deleteInspection,

    // Templates
    getTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,

    // Actions (CAPA)
    getActions,
    getActionById,
    createAction,
    updateAction,
    deleteAction,

    // Stats & Settings
    getStats,
    getSettings,
    updateSettings
} = require('../controllers/quality.controller');

const router = express.Router();

// ============ STATISTICS & REPORTS ============
// These need to be before /:id routes to avoid conflicts

// Get quality statistics
router.get('/stats',
    userMiddleware,
    firmFilter,
    getStats
);

// Get quality settings
router.get('/settings',
    userMiddleware,
    firmFilter,
    getSettings
);

// Update quality settings
router.put('/settings',
    userMiddleware,
    firmFilter,
    validateUpdateSettings,
    updateSettings
);

// ============ INSPECTION ROUTES ============

// Get all inspections (with filters)
router.get('/inspections',
    userMiddleware,
    firmFilter,
    getInspections
);

// Create inspection
router.post('/inspections',
    userMiddleware,
    firmFilter,
    validateCreateInspection,
    createInspection
);

// Get single inspection
router.get('/inspections/:id',
    userMiddleware,
    firmFilter,
    getInspectionById
);

// Update inspection
router.put('/inspections/:id',
    userMiddleware,
    firmFilter,
    validateUpdateInspection,
    updateInspection
);

// Submit inspection
router.post('/inspections/:id/submit',
    userMiddleware,
    firmFilter,
    submitInspection
);

// Delete inspection
router.delete('/inspections/:id',
    userMiddleware,
    firmFilter,
    deleteInspection
);

// ============ TEMPLATE ROUTES ============

// Get all templates
router.get('/templates',
    userMiddleware,
    firmFilter,
    getTemplates
);

// Create template
router.post('/templates',
    userMiddleware,
    firmFilter,
    validateCreateTemplate,
    createTemplate
);

// Get single template
router.get('/templates/:id',
    userMiddleware,
    firmFilter,
    getTemplateById
);

// Update template
router.put('/templates/:id',
    userMiddleware,
    firmFilter,
    validateUpdateTemplate,
    updateTemplate
);

// Delete template
router.delete('/templates/:id',
    userMiddleware,
    firmFilter,
    deleteTemplate
);

// ============ ACTION ROUTES (CAPA) ============

// Get all actions
router.get('/actions',
    userMiddleware,
    firmFilter,
    getActions
);

// Create action
router.post('/actions',
    userMiddleware,
    firmFilter,
    validateCreateAction,
    createAction
);

// Get single action
router.get('/actions/:id',
    userMiddleware,
    firmFilter,
    getActionById
);

// Update action
router.put('/actions/:id',
    userMiddleware,
    firmFilter,
    validateUpdateAction,
    updateAction
);

// Delete action
router.delete('/actions/:id',
    userMiddleware,
    firmFilter,
    deleteAction
);

module.exports = router;
