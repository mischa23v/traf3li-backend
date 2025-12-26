/**
 * Quality Module Routes
 *
 * Comprehensive quality management API routes for inspections, templates,
 * CAPA (Corrective and Preventive Actions), statistics, and settings.
 *
 * Base route: /api/quality
 */

const express = require('express');
const { userMiddleware } = require('../middlewares');
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
    getStats
);

// Get quality settings
router.get('/settings',
    userMiddleware,
    getSettings
);

// Update quality settings
router.put('/settings',
    userMiddleware,
    validateUpdateSettings,
    updateSettings
);

// ============ INSPECTION ROUTES ============

// Get all inspections (with filters)
router.get('/inspections',
    userMiddleware,
    getInspections
);

// Create inspection
router.post('/inspections',
    userMiddleware,
    validateCreateInspection,
    createInspection
);

// Get single inspection
router.get('/inspections/:id',
    userMiddleware,
    getInspectionById
);

// Update inspection
router.put('/inspections/:id',
    userMiddleware,
    validateUpdateInspection,
    updateInspection
);

// Submit inspection
router.post('/inspections/:id/submit',
    userMiddleware,
    submitInspection
);

// Delete inspection
router.delete('/inspections/:id',
    userMiddleware,
    deleteInspection
);

// ============ TEMPLATE ROUTES ============

// Get all templates
router.get('/templates',
    userMiddleware,
    getTemplates
);

// Create template
router.post('/templates',
    userMiddleware,
    validateCreateTemplate,
    createTemplate
);

// Get single template
router.get('/templates/:id',
    userMiddleware,
    getTemplateById
);

// Update template
router.put('/templates/:id',
    userMiddleware,
    validateUpdateTemplate,
    updateTemplate
);

// Delete template
router.delete('/templates/:id',
    userMiddleware,
    deleteTemplate
);

// ============ ACTION ROUTES (CAPA) ============

// Get all actions
router.get('/actions',
    userMiddleware,
    getActions
);

// Create action
router.post('/actions',
    userMiddleware,
    validateCreateAction,
    createAction
);

// Get single action
router.get('/actions/:id',
    userMiddleware,
    getActionById
);

// Update action
router.put('/actions/:id',
    userMiddleware,
    validateUpdateAction,
    updateAction
);

// Delete action
router.delete('/actions/:id',
    userMiddleware,
    deleteAction
);

module.exports = router;
