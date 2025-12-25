const qualityService = require('../services/quality.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// INSPECTION ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get inspections with filters
 * GET /api/quality/inspections
 */
const getInspections = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('Firm ID is required', 403);
    }

    // Mass assignment protection
    const allowedQuery = pickAllowedFields(req.query, [
        'inspectionType',
        'status',
        'itemId',
        'referenceType',
        'dateFrom',
        'dateTo',
        'page',
        'limit',
        'sortBy',
        'sortOrder'
    ]);

    // Sanitize ObjectIds
    if (allowedQuery.itemId) {
        allowedQuery.itemId = sanitizeObjectId(allowedQuery.itemId);
    }

    const result = await qualityService.getInspections(allowedQuery, firmId);

    return res.status(200).send({
        error: false,
        ...result
    });
});

/**
 * Get inspection by ID
 * GET /api/quality/inspections/:id
 */
const getInspectionById = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('Firm ID is required', 403);
    }

    if (!id) {
        throw CustomException('Inspection ID is required', 400);
    }

    const sanitizedId = sanitizeObjectId(id);
    const inspection = await qualityService.getInspectionById(sanitizedId, firmId);

    return res.status(200).send({
        error: false,
        inspection
    });
});

/**
 * Create inspection
 * POST /api/quality/inspections
 */
const createInspection = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('Firm ID is required', 403);
    }

    // Mass assignment protection
    const allowedFields = [
        'referenceType',
        'referenceId',
        'referenceNumber',
        'itemId',
        'itemCode',
        'itemName',
        'batchNo',
        'inspectionType',
        'sampleSize',
        'inspectionDate',
        'templateId',
        'readings',
        'acceptedQty',
        'rejectedQty',
        'remarks'
    ];
    const sanitizedBody = pickAllowedFields(req.body, allowedFields);

    // Input validation - Required fields
    if (!sanitizedBody.referenceType) {
        throw CustomException('Reference type is required', 400);
    }
    if (!sanitizedBody.referenceId) {
        throw CustomException('Reference ID is required', 400);
    }
    if (!sanitizedBody.itemId) {
        throw CustomException('Item ID is required', 400);
    }
    if (!sanitizedBody.inspectionType) {
        throw CustomException('Inspection type is required', 400);
    }
    if (!sanitizedBody.sampleSize || sanitizedBody.sampleSize < 0) {
        throw CustomException('Valid sample size is required', 400);
    }

    // Sanitize ObjectIds
    sanitizedBody.referenceId = sanitizeObjectId(sanitizedBody.referenceId);
    sanitizedBody.itemId = sanitizeObjectId(sanitizedBody.itemId);
    if (sanitizedBody.templateId) {
        sanitizedBody.templateId = sanitizeObjectId(sanitizedBody.templateId);
    }

    // Validate inspection type
    const validTypes = ['incoming', 'outgoing', 'in_process'];
    if (!validTypes.includes(sanitizedBody.inspectionType)) {
        throw CustomException('Invalid inspection type', 400);
    }

    // Validate reference type
    const validReferenceTypes = ['purchase_receipt', 'delivery_note', 'stock_entry', 'production'];
    if (!validReferenceTypes.includes(sanitizedBody.referenceType)) {
        throw CustomException('Invalid reference type', 400);
    }

    // Create inspection
    const inspection = await qualityService.createInspection(sanitizedBody, firmId, userId);

    return res.status(201).send({
        error: false,
        message: 'Inspection created successfully',
        inspection
    });
});

/**
 * Update inspection
 * PUT /api/quality/inspections/:id
 */
const updateInspection = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('Firm ID is required', 403);
    }

    if (!id) {
        throw CustomException('Inspection ID is required', 400);
    }

    const sanitizedId = sanitizeObjectId(id);

    // Mass assignment protection
    const allowedFields = [
        'sampleSize',
        'inspectionDate',
        'readings',
        'acceptedQty',
        'rejectedQty',
        'remarks',
        'status'
    ];
    const sanitizedBody = pickAllowedFields(req.body, allowedFields);

    // Validate sample size if provided
    if (sanitizedBody.sampleSize !== undefined && sanitizedBody.sampleSize < 0) {
        throw CustomException('Sample size must be a positive number', 400);
    }

    // Validate status if provided
    if (sanitizedBody.status) {
        const validStatuses = ['pending', 'accepted', 'rejected', 'partially_accepted'];
        if (!validStatuses.includes(sanitizedBody.status)) {
            throw CustomException('Invalid status', 400);
        }
    }

    // Update inspection
    const inspection = await qualityService.updateInspection(
        sanitizedId,
        sanitizedBody,
        firmId,
        userId
    );

    return res.status(200).send({
        error: false,
        message: 'Inspection updated successfully',
        inspection
    });
});

/**
 * Submit inspection
 * POST /api/quality/inspections/:id/submit
 */
const submitInspection = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('Firm ID is required', 403);
    }

    if (!id) {
        throw CustomException('Inspection ID is required', 400);
    }

    const sanitizedId = sanitizeObjectId(id);

    // Submit inspection
    const inspection = await qualityService.submitInspection(sanitizedId, firmId, userId);

    return res.status(200).send({
        error: false,
        message: 'Inspection submitted successfully',
        inspection
    });
});

/**
 * Delete inspection
 * DELETE /api/quality/inspections/:id
 */
const deleteInspection = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('Firm ID is required', 403);
    }

    if (!id) {
        throw CustomException('Inspection ID is required', 400);
    }

    const sanitizedId = sanitizeObjectId(id);

    await qualityService.deleteInspection(sanitizedId, firmId);

    return res.status(200).send({
        error: false,
        message: 'Inspection deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// TEMPLATE ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get templates
 * GET /api/quality/templates
 */
const getTemplates = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('Firm ID is required', 403);
    }

    const templates = await qualityService.getTemplates(firmId);

    return res.status(200).send({
        error: false,
        templates
    });
});

/**
 * Get template by ID
 * GET /api/quality/templates/:id
 */
const getTemplateById = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('Firm ID is required', 403);
    }

    if (!id) {
        throw CustomException('Template ID is required', 400);
    }

    const sanitizedId = sanitizeObjectId(id);
    const template = await qualityService.getTemplateById(sanitizedId, firmId);

    return res.status(200).send({
        error: false,
        template
    });
});

/**
 * Create template
 * POST /api/quality/templates
 */
const createTemplate = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('Firm ID is required', 403);
    }

    // Mass assignment protection
    const allowedFields = [
        'name',
        'nameAr',
        'description',
        'itemId',
        'itemGroup',
        'parameters',
        'isActive'
    ];
    const sanitizedBody = pickAllowedFields(req.body, allowedFields);

    // Input validation - Required fields
    if (!sanitizedBody.name || typeof sanitizedBody.name !== 'string') {
        throw CustomException('Template name is required', 400);
    }

    // Validate name length
    const trimmedName = sanitizedBody.name.trim();
    if (trimmedName.length < 2) {
        throw CustomException('Template name must be at least 2 characters', 400);
    }
    if (trimmedName.length > 200) {
        throw CustomException('Template name must not exceed 200 characters', 400);
    }
    sanitizedBody.name = trimmedName;

    // Validate parameters
    if (!sanitizedBody.parameters || !Array.isArray(sanitizedBody.parameters)) {
        throw CustomException('Parameters array is required', 400);
    }

    if (sanitizedBody.parameters.length === 0) {
        throw CustomException('At least one parameter is required', 400);
    }

    // Validate each parameter
    for (const param of sanitizedBody.parameters) {
        if (!param.parameterName || typeof param.parameterName !== 'string') {
            throw CustomException('Parameter name is required for all parameters', 400);
        }
    }

    // Sanitize ObjectIds
    if (sanitizedBody.itemId) {
        sanitizedBody.itemId = sanitizeObjectId(sanitizedBody.itemId);
    }

    // Create template
    const template = await qualityService.createTemplate(sanitizedBody, firmId, userId);

    return res.status(201).send({
        error: false,
        message: 'Template created successfully',
        template
    });
});

/**
 * Update template
 * PUT /api/quality/templates/:id
 */
const updateTemplate = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('Firm ID is required', 403);
    }

    if (!id) {
        throw CustomException('Template ID is required', 400);
    }

    const sanitizedId = sanitizeObjectId(id);

    // Mass assignment protection
    const allowedFields = [
        'name',
        'nameAr',
        'description',
        'itemId',
        'itemGroup',
        'parameters',
        'isActive'
    ];
    const sanitizedBody = pickAllowedFields(req.body, allowedFields);

    // Validate name if provided
    if (sanitizedBody.name) {
        if (typeof sanitizedBody.name !== 'string') {
            throw CustomException('Template name must be a string', 400);
        }

        const trimmedName = sanitizedBody.name.trim();
        if (trimmedName.length < 2) {
            throw CustomException('Template name must be at least 2 characters', 400);
        }
        if (trimmedName.length > 200) {
            throw CustomException('Template name must not exceed 200 characters', 400);
        }
        sanitizedBody.name = trimmedName;
    }

    // Validate parameters if provided
    if (sanitizedBody.parameters) {
        if (!Array.isArray(sanitizedBody.parameters)) {
            throw CustomException('Parameters must be an array', 400);
        }

        if (sanitizedBody.parameters.length === 0) {
            throw CustomException('At least one parameter is required', 400);
        }

        for (const param of sanitizedBody.parameters) {
            if (!param.parameterName || typeof param.parameterName !== 'string') {
                throw CustomException('Parameter name is required for all parameters', 400);
            }
        }
    }

    // Sanitize ObjectIds
    if (sanitizedBody.itemId) {
        sanitizedBody.itemId = sanitizeObjectId(sanitizedBody.itemId);
    }

    // Update template
    const template = await qualityService.updateTemplate(
        sanitizedId,
        sanitizedBody,
        firmId,
        userId
    );

    return res.status(200).send({
        error: false,
        message: 'Template updated successfully',
        template
    });
});

/**
 * Delete template
 * DELETE /api/quality/templates/:id
 */
const deleteTemplate = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('Firm ID is required', 403);
    }

    if (!id) {
        throw CustomException('Template ID is required', 400);
    }

    const sanitizedId = sanitizeObjectId(id);

    await qualityService.deleteTemplate(sanitizedId, firmId);

    return res.status(200).send({
        error: false,
        message: 'Template deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// ACTION ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get actions with filters
 * GET /api/quality/actions
 */
const getActions = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('Firm ID is required', 403);
    }

    // Mass assignment protection
    const allowedQuery = pickAllowedFields(req.query, [
        'status',
        'actionType',
        'responsiblePerson',
        'dateFrom',
        'dateTo',
        'page',
        'limit',
        'sortBy',
        'sortOrder'
    ]);

    // Sanitize ObjectIds
    if (allowedQuery.responsiblePerson) {
        allowedQuery.responsiblePerson = sanitizeObjectId(allowedQuery.responsiblePerson);
    }

    const result = await qualityService.getActions(allowedQuery, firmId);

    return res.status(200).send({
        error: false,
        ...result
    });
});

/**
 * Get action by ID
 * GET /api/quality/actions/:id
 */
const getActionById = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('Firm ID is required', 403);
    }

    if (!id) {
        throw CustomException('Action ID is required', 400);
    }

    const sanitizedId = sanitizeObjectId(id);
    const action = await qualityService.getActionById(sanitizedId, firmId);

    return res.status(200).send({
        error: false,
        action
    });
});

/**
 * Create action
 * POST /api/quality/actions
 */
const createAction = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('Firm ID is required', 403);
    }

    // Mass assignment protection
    const allowedFields = [
        'actionType',
        'inspectionId',
        'itemId',
        'problem',
        'rootCause',
        'action',
        'responsiblePerson',
        'targetDate',
        'remarks'
    ];
    const sanitizedBody = pickAllowedFields(req.body, allowedFields);

    // Input validation - Required fields
    if (!sanitizedBody.actionType) {
        throw CustomException('Action type is required', 400);
    }
    if (!sanitizedBody.problem || typeof sanitizedBody.problem !== 'string') {
        throw CustomException('Problem description is required', 400);
    }
    if (!sanitizedBody.action || typeof sanitizedBody.action !== 'string') {
        throw CustomException('Action description is required', 400);
    }
    if (!sanitizedBody.responsiblePerson) {
        throw CustomException('Responsible person is required', 400);
    }
    if (!sanitizedBody.targetDate) {
        throw CustomException('Target date is required', 400);
    }

    // Validate action type
    const validActionTypes = ['corrective', 'preventive'];
    if (!validActionTypes.includes(sanitizedBody.actionType)) {
        throw CustomException('Invalid action type. Must be corrective or preventive', 400);
    }

    // Validate problem length
    const trimmedProblem = sanitizedBody.problem.trim();
    if (trimmedProblem.length < 10) {
        throw CustomException('Problem description must be at least 10 characters', 400);
    }
    if (trimmedProblem.length > 5000) {
        throw CustomException('Problem description must not exceed 5000 characters', 400);
    }
    sanitizedBody.problem = trimmedProblem;

    // Validate action length
    const trimmedAction = sanitizedBody.action.trim();
    if (trimmedAction.length < 10) {
        throw CustomException('Action description must be at least 10 characters', 400);
    }
    if (trimmedAction.length > 5000) {
        throw CustomException('Action description must not exceed 5000 characters', 400);
    }
    sanitizedBody.action = trimmedAction;

    // Validate target date
    const targetDate = new Date(sanitizedBody.targetDate);
    if (isNaN(targetDate.getTime())) {
        throw CustomException('Invalid target date', 400);
    }

    // Sanitize ObjectIds
    if (sanitizedBody.inspectionId) {
        sanitizedBody.inspectionId = sanitizeObjectId(sanitizedBody.inspectionId);
    }
    if (sanitizedBody.itemId) {
        sanitizedBody.itemId = sanitizeObjectId(sanitizedBody.itemId);
    }
    sanitizedBody.responsiblePerson = sanitizeObjectId(sanitizedBody.responsiblePerson);

    // Create action
    const action = await qualityService.createAction(sanitizedBody, firmId, userId);

    return res.status(201).send({
        error: false,
        message: 'Quality action created successfully',
        action
    });
});

/**
 * Update action
 * PUT /api/quality/actions/:id
 */
const updateAction = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('Firm ID is required', 403);
    }

    if (!id) {
        throw CustomException('Action ID is required', 400);
    }

    const sanitizedId = sanitizeObjectId(id);

    // Mass assignment protection
    const allowedFields = [
        'problem',
        'rootCause',
        'action',
        'responsiblePerson',
        'targetDate',
        'completionDate',
        'status',
        'verification',
        'verifiedBy',
        'verifiedDate',
        'remarks'
    ];
    const sanitizedBody = pickAllowedFields(req.body, allowedFields);

    // Validate problem length if provided
    if (sanitizedBody.problem) {
        if (typeof sanitizedBody.problem !== 'string') {
            throw CustomException('Problem description must be a string', 400);
        }

        const trimmedProblem = sanitizedBody.problem.trim();
        if (trimmedProblem.length < 10) {
            throw CustomException('Problem description must be at least 10 characters', 400);
        }
        if (trimmedProblem.length > 5000) {
            throw CustomException('Problem description must not exceed 5000 characters', 400);
        }
        sanitizedBody.problem = trimmedProblem;
    }

    // Validate action length if provided
    if (sanitizedBody.action) {
        if (typeof sanitizedBody.action !== 'string') {
            throw CustomException('Action description must be a string', 400);
        }

        const trimmedAction = sanitizedBody.action.trim();
        if (trimmedAction.length < 10) {
            throw CustomException('Action description must be at least 10 characters', 400);
        }
        if (trimmedAction.length > 5000) {
            throw CustomException('Action description must not exceed 5000 characters', 400);
        }
        sanitizedBody.action = trimmedAction;
    }

    // Validate status if provided
    if (sanitizedBody.status) {
        const validStatuses = ['open', 'in_progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(sanitizedBody.status)) {
            throw CustomException('Invalid status', 400);
        }
    }

    // Sanitize ObjectIds
    if (sanitizedBody.responsiblePerson) {
        sanitizedBody.responsiblePerson = sanitizeObjectId(sanitizedBody.responsiblePerson);
    }
    if (sanitizedBody.verifiedBy) {
        sanitizedBody.verifiedBy = sanitizeObjectId(sanitizedBody.verifiedBy);
    }

    // Update action
    const action = await qualityService.updateAction(
        sanitizedId,
        sanitizedBody,
        firmId,
        userId
    );

    return res.status(200).send({
        error: false,
        message: 'Quality action updated successfully',
        action
    });
});

/**
 * Delete action
 * DELETE /api/quality/actions/:id
 */
const deleteAction = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('Firm ID is required', 403);
    }

    if (!id) {
        throw CustomException('Action ID is required', 400);
    }

    const sanitizedId = sanitizeObjectId(id);

    await qualityService.deleteAction(sanitizedId, firmId);

    return res.status(200).send({
        error: false,
        message: 'Quality action deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// STATS & SETTINGS ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get quality statistics
 * GET /api/quality/stats
 */
const getStats = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('Firm ID is required', 403);
    }

    const stats = await qualityService.getStats(firmId);

    return res.status(200).send({
        error: false,
        stats
    });
});

/**
 * Get quality settings
 * GET /api/quality/settings
 */
const getSettings = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('Firm ID is required', 403);
    }

    const settings = await qualityService.getSettings(firmId);

    return res.status(200).send({
        error: false,
        settings
    });
});

/**
 * Update quality settings
 * PUT /api/quality/settings
 */
const updateSettings = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('Firm ID is required', 403);
    }

    // Mass assignment protection
    const allowedFields = [
        'autoInspectionOnReceipt',
        'defaultTemplateId',
        'failedInspectionAction',
        'enableBatchTracking',
        'inspectionThresholds',
        'notifications',
        'qualityScoring',
        'documentation',
        'integration'
    ];
    const sanitizedBody = pickAllowedFields(req.body, allowedFields);

    // Validate failedInspectionAction if provided
    if (sanitizedBody.failedInspectionAction) {
        const validActions = ['reject', 'hold', 'notify'];
        if (!validActions.includes(sanitizedBody.failedInspectionAction)) {
            throw CustomException('Invalid failed inspection action', 400);
        }
    }

    // Sanitize ObjectIds
    if (sanitizedBody.defaultTemplateId) {
        sanitizedBody.defaultTemplateId = sanitizeObjectId(sanitizedBody.defaultTemplateId);
    }

    // Update settings
    const settings = await qualityService.updateSettings(sanitizedBody, firmId, userId);

    return res.status(200).send({
        error: false,
        message: 'Quality settings updated successfully',
        settings
    });
});

module.exports = {
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

    // Actions
    getActions,
    getActionById,
    createAction,
    updateAction,
    deleteAction,

    // Stats & Settings
    getStats,
    getSettings,
    updateSettings
};
