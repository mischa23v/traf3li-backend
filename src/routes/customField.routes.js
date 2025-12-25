const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    // Field definition management
    createField,
    getFields,
    getField,
    updateField,
    deleteField,

    // Field value management
    getEntityValues,
    setEntityValue,
    setEntityValues,
    deleteEntityValue,
    deleteEntityValues,

    // Search & filtering
    searchByField,

    // Bulk operations
    bulkUpdateValues,

    // Statistics & analytics
    getFieldStats,

    // Import / export
    exportFields,
    importFields,

    // Dependencies & validation
    checkDependencies,
    validateValue
} = require('../controllers/customField.controller');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (MUST BE BEFORE /:id ROUTES!)
// ═══════════════════════════════════════════════════════════════

// Export fields
router.get('/export', userMiddleware, exportFields);

// Import fields
router.post('/import', userMiddleware, importFields);

// Search by custom field value
router.post('/search', userMiddleware, searchByField);

// Bulk update values
router.post('/bulk-update', userMiddleware, bulkUpdateValues);

// Check dependencies
router.get('/dependencies/:entityType/:entityId', userMiddleware, checkDependencies);

// ═══════════════════════════════════════════════════════════════
// FIELD VALUE ROUTES
// ═══════════════════════════════════════════════════════════════

// Get custom field values for an entity
router.get('/values/:entityType/:entityId', userMiddleware, getEntityValues);

// Set custom field value for an entity
router.post('/values/:entityType/:entityId', userMiddleware, setEntityValue);

// Set multiple custom field values for an entity (bulk)
router.post('/values/:entityType/:entityId/bulk', userMiddleware, setEntityValues);

// Delete all custom field values for an entity
router.delete('/values/:entityType/:entityId', userMiddleware, deleteEntityValues);

// Delete specific custom field value
router.delete('/values/:entityType/:entityId/:fieldId', userMiddleware, deleteEntityValue);

// ═══════════════════════════════════════════════════════════════
// FIELD DEFINITION CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// Get all custom fields for an entity type
router.get('/', userMiddleware, getFields);

// Create a new custom field
router.post('/', userMiddleware, createField);

// Get specific custom field
router.get('/:id', userMiddleware, getField);

// Update custom field
router.patch('/:id', userMiddleware, updateField);

// Delete custom field
router.delete('/:id', userMiddleware, deleteField);

// ═══════════════════════════════════════════════════════════════
// FIELD ACTION ROUTES
// ═══════════════════════════════════════════════════════════════

// Get field statistics
router.get('/:id/stats', userMiddleware, getFieldStats);

// Validate custom field value
router.post('/:id/validate', userMiddleware, validateValue);

module.exports = router;
