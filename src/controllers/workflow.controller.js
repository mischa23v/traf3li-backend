const WorkflowTemplate = require('../models/workflowTemplate.model');
const WorkflowInstance = require('../models/workflowInstance.model');
const workflowService = require('../services/workflow.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeString, sanitizePagination, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get firmId from user context
 */
const getFirmId = (req) => {
    return req.firmId || req.user?.firmId || null;
};

// ============================================
// TEMPLATE MANAGEMENT
// ============================================

/**
 * List workflow templates
 * GET /api/workflows/templates
 */
const listTemplates = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException("E91A 'D41C) E7DH( | Firm ID is required", 400);
    }

    // SECURITY: Sanitize and validate pagination parameters
    const { page, limit, skip } = sanitizePagination(req.query, {
        maxLimit: 100,
        defaultLimit: 20,
        defaultPage: 1
    });

    // Build filters
    const filters = {};

    if (req.query.category) {
        const validCategories = ['legal', 'finance', 'hr', 'client_onboarding', 'case_management', 'custom'];
        if (validCategories.includes(req.query.category)) {
            filters.category = req.query.category;
        }
    }

    if (req.query.isActive !== undefined) {
        filters.isActive = req.query.isActive === 'true';
    }

    if (req.query.triggerType) {
        const validTriggers = ['manual', 'event', 'schedule', 'condition'];
        if (validTriggers.includes(req.query.triggerType)) {
            filters.triggerType = req.query.triggerType;
        }
    }

    // Get templates
    const templates = await workflowService.getTemplates(firmId, filters);

    // Apply pagination in memory (or adjust service to handle it)
    const paginatedTemplates = templates.slice(skip, skip + limit);

    res.status(200).json({
        success: true,
        data: paginatedTemplates,
        pagination: {
            page,
            limit,
            total: templates.length,
            pages: Math.ceil(templates.length / limit)
        }
    });
});

/**
 * Create workflow template
 * POST /api/workflows/templates
 */
const createTemplate = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException("E91A 'D41C) E7DH( | Firm ID is required", 400);
    }

    // SECURITY: Mass assignment protection
    const allowedFields = [
        'name',
        'nameAr',
        'description',
        'category',
        'triggerType',
        'triggerConfig',
        'steps',
        'variables',
        'permissions',
        'isActive',
        'tags',
        'icon',
        'color'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Validate required fields
    if (!safeData.name || typeof safeData.name !== 'string') {
        throw CustomException("'D'3E E7DH( | Name is required", 400);
    }

    if (!safeData.category) {
        throw CustomException("'D*5FJA E7DH( | Category is required", 400);
    }

    const validCategories = ['legal', 'finance', 'hr', 'client_onboarding', 'case_management', 'custom'];
    if (!validCategories.includes(safeData.category)) {
        throw CustomException("'D*5FJA :J1 5'D- | Invalid category", 400);
    }

    // Sanitize strings
    safeData.name = sanitizeString(safeData.name);
    if (safeData.description) {
        safeData.description = sanitizeString(safeData.description);
    }

    // Create template
    const template = await workflowService.createTemplate(safeData, userId, firmId);

    logger.info(` Workflow template created: ${template.name} by user ${userId}`);

    res.status(201).json({
        success: true,
        message: "*E %F4'! B'D( 3J1 'D9ED (F,'- | Template created successfully",
        data: template
    });
});

/**
 * Get template by ID
 * GET /api/workflows/templates/:id
 */
const getTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);

    if (!firmId) {
        throw CustomException("E91A 'D41C) E7DH( | Firm ID is required", 400);
    }

    // SECURITY: Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException("E91A :J1 5'D- | Invalid ID format", 400);
    }

    // SECURITY: IDOR Protection - Verify ownership
    const template = await WorkflowTemplate.findOne({
        _id: sanitizedId,
        $or: [
            { firmId: sanitizeObjectId(firmId) },
            { isSystem: true }
        ]
    })
        .populate('createdBy', 'firstName lastName email')
        .populate('lastModifiedBy', 'firstName lastName email')
        .lean();

    if (!template) {
        throw CustomException("B'D( 3J1 'D9ED :J1 EH,H/ | Template not found", 404);
    }

    res.status(200).json({
        success: true,
        data: template
    });
});

/**
 * Update template
 * PUT /api/workflows/templates/:id
 */
const updateTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException("E91A 'D41C) E7DH( | Firm ID is required", 400);
    }

    // SECURITY: Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException("E91A :J1 5'D- | Invalid ID format", 400);
    }

    // SECURITY: IDOR Protection - Verify ownership
    const template = await WorkflowTemplate.findOne({
        _id: sanitizedId,
        firmId: sanitizeObjectId(firmId)
    });

    if (!template) {
        throw CustomException("B'D( 3J1 'D9ED :J1 EH,H/ | Template not found", 404);
    }

    // SECURITY: Mass assignment protection
    const allowedFields = [
        'name',
        'nameAr',
        'description',
        'triggerConfig',
        'steps',
        'variables',
        'permissions',
        'isActive',
        'tags',
        'icon',
        'color'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Sanitize strings
    if (safeData.name) {
        safeData.name = sanitizeString(safeData.name);
    }
    if (safeData.description) {
        safeData.description = sanitizeString(safeData.description);
    }

    safeData.lastModifiedBy = userId;

    // Update template
    const updatedTemplate = await workflowService.updateTemplate(sanitizedId, safeData);

    logger.info(` Workflow template updated: ${updatedTemplate.name} by user ${userId}`);

    res.status(200).json({
        success: true,
        message: "*E *-/J+ B'D( 3J1 'D9ED (F,'- | Template updated successfully",
        data: updatedTemplate
    });
});

/**
 * Delete template
 * DELETE /api/workflows/templates/:id
 */
const deleteTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException("E91A 'D41C) E7DH( | Firm ID is required", 400);
    }

    // SECURITY: Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException("E91A :J1 5'D- | Invalid ID format", 400);
    }

    // Delete template
    await workflowService.deleteTemplate(sanitizedId);

    logger.info(` Workflow template deleted: ${sanitizedId} by user ${userId}`);

    res.status(200).json({
        success: true,
        message: "*E -0A B'D( 3J1 'D9ED (F,'- | Template deleted successfully"
    });
});

// ============================================
// INSTANCE MANAGEMENT
// ============================================

/**
 * Start a workflow instance
 * POST /api/workflows/instances
 */
const startWorkflow = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException("E91A 'D41C) E7DH( | Firm ID is required", 400);
    }

    // SECURITY: Mass assignment protection
    const allowedFields = ['templateId', 'entityType', 'entityId', 'variables'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Validate required fields
    if (!safeData.templateId) {
        throw CustomException("E91A 'DB'D( E7DH( | Template ID is required", 400);
    }

    if (!safeData.entityType) {
        throw CustomException("FH9 'DCJ'F E7DH( | Entity type is required", 400);
    }

    if (!safeData.entityId) {
        throw CustomException("E91A 'DCJ'F E7DH( | Entity ID is required", 400);
    }

    // SECURITY: Sanitize ObjectIds
    const sanitizedTemplateId = sanitizeObjectId(safeData.templateId);
    const sanitizedEntityId = sanitizeObjectId(safeData.entityId);

    if (!sanitizedTemplateId || !sanitizedEntityId) {
        throw CustomException("E91A :J1 5'D- | Invalid ID format", 400);
    }

    // Start workflow
    const instance = await workflowService.startWorkflow(
        sanitizedTemplateId,
        safeData.entityType,
        sanitizedEntityId,
        safeData.variables || {},
        userId
    );

    logger.info(` Workflow started: ${instance.name} for ${safeData.entityType}:${sanitizedEntityId}`);

    res.status(201).json({
        success: true,
        message: "*E (/! 3J1 'D9ED (F,'- | Workflow started successfully",
        data: instance
    });
});

/**
 * Get workflow instance status
 * GET /api/workflows/instances/:id
 */
const getWorkflowStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);

    if (!firmId) {
        throw CustomException("E91A 'D41C) E7DH( | Firm ID is required", 400);
    }

    // SECURITY: Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException("E91A :J1 5'D- | Invalid ID format", 400);
    }

    // SECURITY: IDOR Protection - Verify ownership
    const instance = await WorkflowInstance.findOne({
        _id: sanitizedId,
        firmId: sanitizeObjectId(firmId)
    }).lean();

    if (!instance) {
        throw CustomException("E+JD 3J1 'D9ED :J1 EH,H/ | Workflow instance not found", 404);
    }

    // Get status
    const status = await workflowService.getWorkflowStatus(sanitizedId);

    res.status(200).json({
        success: true,
        data: status
    });
});

/**
 * Pause workflow
 * POST /api/workflows/instances/:id/pause
 */
const pauseWorkflow = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException("E91A 'D41C) E7DH( | Firm ID is required", 400);
    }

    // SECURITY: Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException("E91A :J1 5'D- | Invalid ID format", 400);
    }

    // SECURITY: IDOR Protection - Verify ownership
    const instance = await WorkflowInstance.findOne({
        _id: sanitizedId,
        firmId: sanitizeObjectId(firmId)
    });

    if (!instance) {
        throw CustomException("E+JD 3J1 'D9ED :J1 EH,H/ | Workflow instance not found", 404);
    }

    // Pause workflow
    const pausedInstance = await workflowService.pauseWorkflow(sanitizedId);

    logger.info(` Workflow paused: ${pausedInstance.name} by user ${userId}`);

    res.status(200).json({
        success: true,
        message: "*E %JB'A 3J1 'D9ED E$B*'K (F,'- | Workflow paused successfully",
        data: pausedInstance
    });
});

/**
 * Resume workflow
 * POST /api/workflows/instances/:id/resume
 */
const resumeWorkflow = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException("E91A 'D41C) E7DH( | Firm ID is required", 400);
    }

    // SECURITY: Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException("E91A :J1 5'D- | Invalid ID format", 400);
    }

    // SECURITY: IDOR Protection - Verify ownership
    const instance = await WorkflowInstance.findOne({
        _id: sanitizedId,
        firmId: sanitizeObjectId(firmId)
    });

    if (!instance) {
        throw CustomException("E+JD 3J1 'D9ED :J1 EH,H/ | Workflow instance not found", 404);
    }

    // Resume workflow
    const resumedInstance = await workflowService.resumeWorkflow(sanitizedId);

    logger.info(` Workflow resumed: ${resumedInstance.name} by user ${userId}`);

    res.status(200).json({
        success: true,
        message: "*E '3*&F'A 3J1 'D9ED (F,'- | Workflow resumed successfully",
        data: resumedInstance
    });
});

/**
 * Cancel workflow
 * POST /api/workflows/instances/:id/cancel
 */
const cancelWorkflow = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException("E91A 'D41C) E7DH( | Firm ID is required", 400);
    }

    // SECURITY: Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException("E91A :J1 5'D- | Invalid ID format", 400);
    }

    // SECURITY: Mass assignment protection
    const allowedFields = ['reason'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // SECURITY: IDOR Protection - Verify ownership
    const instance = await WorkflowInstance.findOne({
        _id: sanitizedId,
        firmId: sanitizeObjectId(firmId)
    });

    if (!instance) {
        throw CustomException("E+JD 3J1 'D9ED :J1 EH,H/ | Workflow instance not found", 404);
    }

    // Cancel workflow
    const reason = safeData.reason ? sanitizeString(safeData.reason) : 'No reason provided';
    const cancelledInstance = await workflowService.cancelWorkflow(sanitizedId, reason);

    logger.info(` Workflow cancelled: ${cancelledInstance.name} by user ${userId}`);

    res.status(200).json({
        success: true,
        message: "*E %D:'! 3J1 'D9ED (F,'- | Workflow cancelled successfully",
        data: cancelledInstance
    });
});

/**
 * Advance workflow to next step
 * POST /api/workflows/instances/:id/advance
 */
const advanceStep = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException("E91A 'D41C) E7DH( | Firm ID is required", 400);
    }

    // SECURITY: Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException("E91A :J1 5'D- | Invalid ID format", 400);
    }

    // SECURITY: IDOR Protection - Verify ownership
    const instance = await WorkflowInstance.findOne({
        _id: sanitizedId,
        firmId: sanitizeObjectId(firmId)
    });

    if (!instance) {
        throw CustomException("E+JD 3J1 'D9ED :J1 EH,H/ | Workflow instance not found", 404);
    }

    // SECURITY: Mass assignment protection
    const allowedFields = ['stepResult'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Advance step
    const stepResult = safeData.stepResult || { completedBy: userId };
    const updatedInstance = await workflowService.advanceStep(sanitizedId, stepResult);

    logger.info(` Workflow step advanced for instance ${sanitizedId} by user ${userId}`);

    res.status(200).json({
        success: true,
        message: "*E 'D'F*B'D %DI 'D.7H) 'D*'DJ) (F,'- | Advanced to next step successfully",
        data: updatedInstance
    });
});

/**
 * Get active workflows for entity
 * GET /api/workflows/entity/:entityType/:entityId
 */
const getActiveWorkflows = asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.params;
    const firmId = getFirmId(req);

    if (!firmId) {
        throw CustomException("E91A 'D41C) E7DH( | Firm ID is required", 400);
    }

    // Validate entity type
    const validEntityTypes = ['case', 'client', 'invoice', 'task', 'lead', 'deal', 'employee', 'custom'];
    if (!validEntityTypes.includes(entityType)) {
        throw CustomException("FH9 'DCJ'F :J1 5'D- | Invalid entity type", 400);
    }

    // SECURITY: Sanitize ObjectId
    const sanitizedEntityId = sanitizeObjectId(entityId);
    if (!sanitizedEntityId) {
        throw CustomException("E91A :J1 5'D- | Invalid ID format", 400);
    }

    // Get active workflows
    const instances = await workflowService.getActiveWorkflows(entityType, sanitizedEntityId);

    res.status(200).json({
        success: true,
        data: instances
    });
});

/**
 * List workflow instances
 * GET /api/workflows/instances
 */
const listInstances = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);

    if (!firmId) {
        throw CustomException("E91A 'D41C) E7DH( | Firm ID is required", 400);
    }

    // SECURITY: Sanitize and validate pagination parameters
    const { page, limit, skip } = sanitizePagination(req.query, {
        maxLimit: 100,
        defaultLimit: 20,
        defaultPage: 1
    });

    // Build query
    const query = { firmId: sanitizeObjectId(firmId) };

    if (req.query.status) {
        const validStatuses = ['pending', 'running', 'paused', 'completed', 'failed', 'cancelled'];
        if (validStatuses.includes(req.query.status)) {
            query.status = req.query.status;
        }
    }

    if (req.query.templateId) {
        query.templateId = sanitizeObjectId(req.query.templateId);
    }

    if (req.query.entityType) {
        query.entityType = req.query.entityType;
    }

    // Execute query
    const instances = await WorkflowInstance.find(query)
        .populate('templateId', 'name category')
        .populate('startedBy', 'firstName lastName email')
        .sort({ startedAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

    const total = await WorkflowInstance.countDocuments(query);

    res.status(200).json({
        success: true,
        data: instances,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Template management
    listTemplates,
    createTemplate,
    getTemplate,
    updateTemplate,
    deleteTemplate,

    // Instance management
    startWorkflow,
    getWorkflowStatus,
    pauseWorkflow,
    resumeWorkflow,
    cancelWorkflow,
    advanceStep,
    getActiveWorkflows,
    listInstances
};
