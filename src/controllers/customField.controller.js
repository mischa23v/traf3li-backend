const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const customFieldService = require('../services/customField.service');
const CustomField = require('../models/customField.model');
const CustomFieldValue = require('../models/customFieldValue.model');

// ═══════════════════════════════════════════════════════════════
// FIELD DEFINITION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Create a custom field
 * POST /api/custom-fields
 */
const createField = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection
    const allowedFields = [
        'name', 'nameAr', 'fieldKey', 'description', 'entityType', 'fieldType',
        'options', 'defaultValue', 'isRequired', 'isUnique', 'validation',
        'dependencies', 'conditionalValidation', 'isSearchable', 'isFilterable',
        'showInList', 'showInDetail', 'showInCreate', 'showInEdit', 'order',
        'group', 'placeholder', 'placeholderAr', 'helpText', 'helpTextAr',
        'isComputed', 'formula'
    ];
    const fieldData = pickAllowedFields(req.body, allowedFields);

    // Validate required fields
    if (!fieldData.name || !fieldData.entityType || !fieldData.fieldType) {
        throw CustomException('Name, entity type, and field type are required', 400);
    }

    // Create field
    const field = await customFieldService.createField(fieldData, userId, firmId);

    res.status(201).json({
        success: true,
        message: 'Custom field created successfully',
        data: field
    });
});

/**
 * Get all custom fields for an entity type
 * GET /api/custom-fields?entityType=client
 */
const getFields = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { entityType, showInList, showInDetail, isActive } = req.query;

    if (!entityType) {
        throw CustomException('Entity type is required', 400);
    }

    const options = {};
    if (showInList !== undefined) options.showInList = showInList === 'true';
    if (showInDetail !== undefined) options.showInDetail = showInDetail === 'true';
    if (isActive !== undefined) options.isActive = isActive === 'true';

    const fields = await customFieldService.getFields(entityType, firmId, options);

    res.status(200).json({
        success: true,
        data: fields
    });
});

/**
 * Get a single custom field
 * GET /api/custom-fields/:id
 */
const getField = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const sanitizedId = sanitizeObjectId(id);

    // IDOR protection - verify firmId ownership
    const field = await CustomField.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    });

    if (!field) {
        throw CustomException('Custom field not found', 404);
    }

    res.status(200).json({
        success: true,
        data: field
    });
});

/**
 * Update a custom field
 * PATCH /api/custom-fields/:id
 */
const updateField = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    const sanitizedId = sanitizeObjectId(id);

    // Mass assignment protection
    const allowedFields = [
        'name', 'nameAr', 'fieldKey', 'description', 'fieldType',
        'options', 'defaultValue', 'isRequired', 'isUnique', 'validation',
        'dependencies', 'conditionalValidation', 'isSearchable', 'isFilterable',
        'showInList', 'showInDetail', 'showInCreate', 'showInEdit', 'order',
        'group', 'placeholder', 'placeholderAr', 'helpText', 'helpTextAr',
        'isComputed', 'formula', 'isActive'
    ];
    const updateData = pickAllowedFields(req.body, allowedFields);

    // Update field
    const field = await customFieldService.updateField(sanitizedId, updateData, userId, firmId);

    res.status(200).json({
        success: true,
        message: 'Custom field updated successfully',
        data: field
    });
});

/**
 * Delete a custom field
 * DELETE /api/custom-fields/:id
 */
const deleteField = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;

    const sanitizedId = sanitizeObjectId(id);

    // Delete field
    await customFieldService.deleteField(sanitizedId, firmId);

    res.status(200).json({
        success: true,
        message: 'Custom field deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// FIELD VALUE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Get custom field values for an entity
 * GET /api/custom-fields/values/:entityType/:entityId
 */
const getEntityValues = asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.params;
    const firmId = req.firmId;

    const sanitizedEntityId = sanitizeObjectId(entityId);

    // Get fields with values
    const fieldsWithValues = await customFieldService.getFieldsWithValues(
        entityType,
        sanitizedEntityId,
        firmId
    );

    res.status(200).json({
        success: true,
        data: fieldsWithValues
    });
});

/**
 * Set custom field value for an entity
 * POST /api/custom-fields/values/:entityType/:entityId
 */
const setEntityValue = asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.params;
    const { fieldId, value } = req.body;
    const userId = req.userID;
    const firmId = req.firmId;

    if (!fieldId) {
        throw CustomException('Field ID is required', 400);
    }

    const sanitizedEntityId = sanitizeObjectId(entityId);
    const sanitizedFieldId = sanitizeObjectId(fieldId);

    // Set value
    const result = await customFieldService.setValue(
        sanitizedFieldId,
        sanitizedEntityId,
        value,
        userId,
        firmId,
        entityType
    );

    res.status(200).json({
        success: true,
        message: 'Custom field value set successfully',
        data: result
    });
});

/**
 * Set multiple custom field values for an entity
 * POST /api/custom-fields/values/:entityType/:entityId/bulk
 */
const setEntityValues = asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.params;
    const { fieldValues } = req.body;
    const userId = req.userID;
    const firmId = req.firmId;

    if (!fieldValues || typeof fieldValues !== 'object') {
        throw CustomException('Field values object is required', 400);
    }

    const sanitizedEntityId = sanitizeObjectId(entityId);

    // Set multiple values
    const result = await customFieldService.setValues(
        entityType,
        sanitizedEntityId,
        fieldValues,
        userId,
        firmId
    );

    res.status(200).json({
        success: true,
        message: `Set ${result.results.length} custom field value(s)`,
        data: result
    });
});

/**
 * Delete custom field value
 * DELETE /api/custom-fields/values/:entityType/:entityId/:fieldId
 */
const deleteEntityValue = asyncHandler(async (req, res) => {
    const { entityType, entityId, fieldId } = req.params;

    const sanitizedEntityId = sanitizeObjectId(entityId);
    const sanitizedFieldId = sanitizeObjectId(fieldId);

    // Delete value
    await CustomFieldValue.deleteOne({
        ...req.firmQuery,
        fieldId: sanitizedFieldId,
        entityId: sanitizedEntityId,
        entityType
    });

    res.status(200).json({
        success: true,
        message: 'Custom field value deleted successfully'
    });
});

/**
 * Delete all custom field values for an entity
 * DELETE /api/custom-fields/values/:entityType/:entityId
 */
const deleteEntityValues = asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.params;
    const firmId = req.firmId;

    const sanitizedEntityId = sanitizeObjectId(entityId);

    // Delete all values
    const count = await customFieldService.deleteEntityValues(
        entityType,
        sanitizedEntityId,
        firmId
    );

    res.status(200).json({
        success: true,
        message: `Deleted ${count} custom field value(s)`
    });
});

// ═══════════════════════════════════════════════════════════════
// SEARCH & FILTERING
// ═══════════════════════════════════════════════════════════════

/**
 * Search entities by custom field value
 * POST /api/custom-fields/search
 */
const searchByField = asyncHandler(async (req, res) => {
    const { fieldId, value, exact } = req.body;
    const firmId = req.firmId;

    if (!fieldId || value === undefined) {
        throw CustomException('Field ID and value are required', 400);
    }

    const sanitizedFieldId = sanitizeObjectId(fieldId);

    // Search
    const results = await customFieldService.searchByCustomField(
        sanitizedFieldId,
        value,
        firmId,
        { exact: exact === true }
    );

    res.status(200).json({
        success: true,
        data: results
    });
});

// ═══════════════════════════════════════════════════════════════
// BULK OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Bulk update custom field values
 * POST /api/custom-fields/bulk-update
 */
const bulkUpdateValues = asyncHandler(async (req, res) => {
    const { entityType, entityIds, fieldId, value } = req.body;
    const userId = req.userID;
    const firmId = req.firmId;

    if (!entityType || !entityIds || !Array.isArray(entityIds) || !fieldId) {
        throw CustomException('Entity type, entity IDs array, and field ID are required', 400);
    }

    const sanitizedFieldId = sanitizeObjectId(fieldId);
    const sanitizedEntityIds = entityIds.map(id => sanitizeObjectId(id));

    // Bulk update
    const result = await customFieldService.bulkSetValues(
        entityType,
        sanitizedEntityIds,
        sanitizedFieldId,
        value,
        userId,
        firmId
    );

    res.status(200).json({
        success: true,
        message: `Updated ${result.modified + result.inserted} custom field value(s)`,
        data: result
    });
});

// ═══════════════════════════════════════════════════════════════
// STATISTICS & ANALYTICS
// ═══════════════════════════════════════════════════════════════

/**
 * Get field statistics
 * GET /api/custom-fields/:id/stats
 */
const getFieldStats = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;

    const sanitizedId = sanitizeObjectId(id);

    // Get stats
    const stats = await customFieldService.getFieldStats(sanitizedId, firmId);

    res.status(200).json({
        success: true,
        data: stats
    });
});

// ═══════════════════════════════════════════════════════════════
// IMPORT / EXPORT
// ═══════════════════════════════════════════════════════════════

/**
 * Export custom fields configuration
 * GET /api/custom-fields/export?entityType=client
 */
const exportFields = asyncHandler(async (req, res) => {
    const { entityType } = req.query;
    const firmId = req.firmId;

    if (!entityType) {
        throw CustomException('Entity type is required', 400);
    }

    // Export fields
    const fields = await customFieldService.exportFields(entityType, firmId);

    res.status(200).json({
        success: true,
        data: fields
    });
});

/**
 * Import custom fields configuration
 * POST /api/custom-fields/import
 */
const importFields = asyncHandler(async (req, res) => {
    const { entityType, fields, overwrite } = req.body;
    const userId = req.userID;
    const firmId = req.firmId;

    if (!entityType || !fields || !Array.isArray(fields)) {
        throw CustomException('Entity type and fields array are required', 400);
    }

    // Import fields
    const result = await customFieldService.importFields(
        entityType,
        fields,
        userId,
        firmId,
        { overwrite: overwrite === true }
    );

    res.status(200).json({
        success: true,
        message: `Imported ${result.created.length} field(s), updated ${result.updated.length} field(s)`,
        data: result
    });
});

// ═══════════════════════════════════════════════════════════════
// DEPENDENCIES & VALIDATION
// ═══════════════════════════════════════════════════════════════

/**
 * Check field dependencies for an entity
 * GET /api/custom-fields/dependencies/:entityType/:entityId
 */
const checkDependencies = asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.params;
    const firmId = req.firmId;

    const sanitizedEntityId = sanitizeObjectId(entityId);

    // Check dependencies
    const visibility = await customFieldService.checkDependencies(
        entityType,
        sanitizedEntityId,
        firmId
    );

    res.status(200).json({
        success: true,
        data: visibility
    });
});

/**
 * Validate custom field value
 * POST /api/custom-fields/:id/validate
 */
const validateValue = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { value } = req.body;

    const sanitizedId = sanitizeObjectId(id);

    // Get field
    const field = await CustomField.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    });

    if (!field) {
        throw CustomException('Custom field not found', 404);
    }

    // Validate
    const validation = field.validateValue(value);

    res.status(200).json({
        success: true,
        data: validation
    });
});

module.exports = {
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
};
