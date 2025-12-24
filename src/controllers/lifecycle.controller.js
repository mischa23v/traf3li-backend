const { LifecycleWorkflow, LifecycleInstance } = require('../models/lifecycleWorkflow.model');
const lifecycleService = require('../services/lifecycle.service');
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
// WORKFLOW MANAGEMENT
// ============================================

/**
 * List lifecycle workflows
 * GET /api/lifecycle/workflows
 */
const listWorkflows = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('معرف الشركة مطلوب | Firm ID is required', 400);
    }

    // SECURITY: Sanitize and validate pagination parameters
    const { page, limit, skip } = sanitizePagination(req.query, {
        maxLimit: 100,
        defaultLimit: 20,
        defaultPage: 1
    });

    // Build query with IDOR protection
    const query = { firmId: sanitizeObjectId(firmId) };

    // Optional filters with input validation
    if (req.query.entityType) {
        const validEntityTypes = ['employee', 'customer', 'deal', 'client'];
        if (validEntityTypes.includes(req.query.entityType)) {
            query.entityType = req.query.entityType;
        }
    }

    if (req.query.lifecycleType) {
        const validLifecycleTypes = ['onboarding', 'active', 'offboarding', 'lifecycle_event'];
        if (validLifecycleTypes.includes(req.query.lifecycleType)) {
            query.lifecycleType = req.query.lifecycleType;
        }
    }

    if (req.query.isActive !== undefined) {
        query.isActive = req.query.isActive === 'true';
    }

    // Execute query
    const workflows = await LifecycleWorkflow.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('createdBy', 'firstName lastName email')
        .populate('lastModifiedBy', 'firstName lastName email')
        .lean();

    const total = await LifecycleWorkflow.countDocuments(query);

    res.status(200).json({
        success: true,
        data: workflows,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

/**
 * Create lifecycle workflow
 * POST /api/lifecycle/workflows
 */
const createWorkflow = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('معرف الشركة مطلوب | Firm ID is required', 400);
    }

    // SECURITY: Mass assignment protection
    const allowedFields = [
        'name',
        'entityType',
        'lifecycleType',
        'description',
        'stages',
        'notifications',
        'isActive'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Validate required fields
    if (!safeData.name || typeof safeData.name !== 'string') {
        throw CustomException('الاسم مطلوب | Name is required', 400);
    }

    if (!safeData.entityType) {
        throw CustomException('نوع الكيان مطلوب | Entity type is required', 400);
    }

    if (!safeData.lifecycleType) {
        throw CustomException('نوع دورة الحياة مطلوب | Lifecycle type is required', 400);
    }

    const validEntityTypes = ['employee', 'customer', 'deal', 'client'];
    if (!validEntityTypes.includes(safeData.entityType)) {
        throw CustomException('نوع الكيان غير صالح | Invalid entity type', 400);
    }

    const validLifecycleTypes = ['onboarding', 'active', 'offboarding', 'lifecycle_event'];
    if (!validLifecycleTypes.includes(safeData.lifecycleType)) {
        throw CustomException('نوع دورة الحياة غير صالح | Invalid lifecycle type', 400);
    }

    // Validate stages array
    if (safeData.stages && !Array.isArray(safeData.stages)) {
        throw CustomException('المراحل يجب أن تكون مصفوفة | Stages must be an array', 400);
    }

    // SECURITY: Input sanitization
    const workflowData = {
        firmId: sanitizeObjectId(firmId),
        name: sanitizeString(safeData.name).substring(0, 200),
        entityType: safeData.entityType,
        lifecycleType: safeData.lifecycleType,
        description: safeData.description ? sanitizeString(safeData.description).substring(0, 1000) : '',
        stages: safeData.stages || [],
        notifications: safeData.notifications || [],
        isActive: safeData.isActive !== undefined ? Boolean(safeData.isActive) : true,
        createdBy: userId,
        lastModifiedBy: userId
    };

    const workflow = await LifecycleWorkflow.create(workflowData);

    logger.info(`✅ Lifecycle workflow created: ${workflow.name} by user ${userId}`);

    res.status(201).json({
        success: true,
        message: 'تم إنشاء سير العمل بنجاح | Workflow created successfully',
        data: workflow
    });
});

/**
 * Get workflow by ID
 * GET /api/lifecycle/workflows/:id
 */
const getWorkflow = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);

    if (!firmId) {
        throw CustomException('معرف الشركة مطلوب | Firm ID is required', 400);
    }

    // SECURITY: Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صالح | Invalid ID format', 400);
    }

    // SECURITY: IDOR Protection - Verify ownership via firmId
    const workflow = await LifecycleWorkflow.findOne({
        _id: sanitizedId,
        firmId: sanitizeObjectId(firmId)
    })
        .populate('createdBy', 'firstName lastName email')
        .populate('lastModifiedBy', 'firstName lastName email')
        .lean();

    if (!workflow) {
        throw CustomException('سير العمل غير موجود | Workflow not found', 404);
    }

    res.status(200).json({
        success: true,
        data: workflow
    });
});

/**
 * Update workflow
 * PUT /api/lifecycle/workflows/:id
 */
const updateWorkflow = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('معرف الشركة مطلوب | Firm ID is required', 400);
    }

    // SECURITY: Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صالح | Invalid ID format', 400);
    }

    // SECURITY: IDOR Protection - Verify ownership via firmId
    const workflow = await LifecycleWorkflow.findOne({
        _id: sanitizedId,
        firmId: sanitizeObjectId(firmId)
    });

    if (!workflow) {
        throw CustomException('سير العمل غير موجود | Workflow not found', 404);
    }

    // SECURITY: Mass assignment protection
    const allowedFields = [
        'name',
        'description',
        'stages',
        'notifications',
        'isActive'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Update fields
    if (safeData.name !== undefined) {
        if (typeof safeData.name !== 'string') {
            throw CustomException('الاسم يجب أن يكون نصاً | Name must be a string', 400);
        }
        workflow.name = sanitizeString(safeData.name).substring(0, 200);
    }

    if (safeData.description !== undefined) {
        if (typeof safeData.description !== 'string') {
            throw CustomException('الوصف يجب أن يكون نصاً | Description must be a string', 400);
        }
        workflow.description = sanitizeString(safeData.description).substring(0, 1000);
    }

    if (safeData.stages !== undefined) {
        if (!Array.isArray(safeData.stages)) {
            throw CustomException('المراحل يجب أن تكون مصفوفة | Stages must be an array', 400);
        }
        workflow.stages = safeData.stages;
    }

    if (safeData.notifications !== undefined) {
        if (!Array.isArray(safeData.notifications)) {
            throw CustomException('الإشعارات يجب أن تكون مصفوفة | Notifications must be an array', 400);
        }
        workflow.notifications = safeData.notifications;
    }

    if (safeData.isActive !== undefined) {
        workflow.isActive = Boolean(safeData.isActive);
    }

    workflow.lastModifiedBy = userId;
    await workflow.save();

    logger.info(`✅ Lifecycle workflow updated: ${workflow.name} by user ${userId}`);

    res.status(200).json({
        success: true,
        message: 'تم تحديث سير العمل بنجاح | Workflow updated successfully',
        data: workflow
    });
});

/**
 * Delete workflow
 * DELETE /api/lifecycle/workflows/:id
 */
const deleteWorkflow = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('معرف الشركة مطلوب | Firm ID is required', 400);
    }

    // SECURITY: Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صالح | Invalid ID format', 400);
    }

    // Check if workflow is in use
    const inUse = await LifecycleInstance.findOne({
        workflowId: sanitizedId,
        status: 'in_progress'
    });

    if (inUse) {
        throw CustomException('لا يمكن حذف سير العمل لأنه قيد الاستخدام | Cannot delete workflow - instances are in progress', 400);
    }

    // SECURITY: IDOR Protection - Verify ownership via firmId
    const workflow = await LifecycleWorkflow.findOneAndDelete({
        _id: sanitizedId,
        firmId: sanitizeObjectId(firmId)
    });

    if (!workflow) {
        throw CustomException('سير العمل غير موجود | Workflow not found', 404);
    }

    logger.info(`✅ Lifecycle workflow deleted: ${workflow.name} by user ${userId}`);

    res.status(200).json({
        success: true,
        message: 'تم حذف سير العمل بنجاح | Workflow deleted successfully'
    });
});

// ============================================
// WORKFLOW INSTANCE MANAGEMENT
// ============================================

/**
 * Initiate a workflow
 * POST /api/lifecycle/initiate
 */
const initiateWorkflow = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('معرف الشركة مطلوب | Firm ID is required', 400);
    }

    // SECURITY: Mass assignment protection
    const allowedFields = ['workflowId', 'entityType', 'entityId', 'entityName', 'metadata'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Validate required fields
    if (!safeData.workflowId) {
        throw CustomException('معرف سير العمل مطلوب | Workflow ID is required', 400);
    }

    if (!safeData.entityType) {
        throw CustomException('نوع الكيان مطلوب | Entity type is required', 400);
    }

    if (!safeData.entityId) {
        throw CustomException('معرف الكيان مطلوب | Entity ID is required', 400);
    }

    // SECURITY: Sanitize ObjectIds
    const sanitizedWorkflowId = sanitizeObjectId(safeData.workflowId);
    const sanitizedEntityId = sanitizeObjectId(safeData.entityId);

    if (!sanitizedWorkflowId || !sanitizedEntityId) {
        throw CustomException('معرف غير صالح | Invalid ID format', 400);
    }

    // SECURITY: Verify workflow ownership via firmId
    const workflow = await LifecycleWorkflow.findOne({
        _id: sanitizedWorkflowId,
        firmId: sanitizeObjectId(firmId)
    });

    if (!workflow) {
        throw CustomException('سير العمل غير موجود | Workflow not found', 404);
    }

    // Use lifecycle service to initiate workflow
    const instance = await lifecycleService.initiateWorkflow(
        sanitizedWorkflowId,
        safeData.entityType,
        sanitizedEntityId,
        userId,
        firmId,
        {
            entityName: safeData.entityName ? sanitizeString(safeData.entityName) : 'Unknown',
            metadata: safeData.metadata || {}
        }
    );

    logger.info(`✅ Lifecycle workflow initiated: ${workflow.name} for ${safeData.entityType}:${sanitizedEntityId}`);

    res.status(201).json({
        success: true,
        message: 'تم بدء سير العمل بنجاح | Workflow initiated successfully',
        data: instance
    });
});

/**
 * Get active workflows for entity
 * GET /api/lifecycle/:entityType/:entityId
 */
const getActiveWorkflows = asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.params;
    const firmId = getFirmId(req);

    if (!firmId) {
        throw CustomException('معرف الشركة مطلوب | Firm ID is required', 400);
    }

    // Validate entity type
    const validEntityTypes = ['employee', 'customer', 'deal', 'client'];
    if (!validEntityTypes.includes(entityType)) {
        throw CustomException('نوع الكيان غير صالح | Invalid entity type', 400);
    }

    // SECURITY: Sanitize ObjectId
    const sanitizedEntityId = sanitizeObjectId(entityId);
    if (!sanitizedEntityId) {
        throw CustomException('معرف غير صالح | Invalid ID format', 400);
    }

    // Use lifecycle service to get active workflows
    const instances = await lifecycleService.getActiveWorkflows(
        entityType,
        sanitizedEntityId,
        firmId
    );

    res.status(200).json({
        success: true,
        data: instances
    });
});

/**
 * Get workflow instance progress
 * GET /api/lifecycle/instance/:id/progress
 */
const getProgress = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);

    if (!firmId) {
        throw CustomException('معرف الشركة مطلوب | Firm ID is required', 400);
    }

    // SECURITY: Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صالح | Invalid ID format', 400);
    }

    // SECURITY: IDOR Protection - Verify ownership via firmId
    const instance = await LifecycleInstance.findOne({
        _id: sanitizedId,
        firmId: sanitizeObjectId(firmId)
    }).lean();

    if (!instance) {
        throw CustomException('مثيل سير العمل غير موجود | Workflow instance not found', 404);
    }

    // Use lifecycle service to get progress
    const progress = await lifecycleService.getProgress(sanitizedId);

    res.status(200).json({
        success: true,
        data: progress
    });
});

/**
 * Advance to next stage
 * POST /api/lifecycle/instance/:id/advance
 */
const advanceStage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('معرف الشركة مطلوب | Firm ID is required', 400);
    }

    // SECURITY: Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صالح | Invalid ID format', 400);
    }

    // SECURITY: IDOR Protection - Verify ownership via firmId
    const instance = await LifecycleInstance.findOne({
        _id: sanitizedId,
        firmId: sanitizeObjectId(firmId)
    });

    if (!instance) {
        throw CustomException('مثيل سير العمل غير موجود | Workflow instance not found', 404);
    }

    // Use lifecycle service to advance stage
    const updatedInstance = await lifecycleService.advanceStage(sanitizedId, userId);

    logger.info(`✅ Lifecycle stage advanced for instance ${sanitizedId} by user ${userId}`);

    res.status(200).json({
        success: true,
        message: 'تم الانتقال إلى المرحلة التالية بنجاح | Advanced to next stage successfully',
        data: updatedInstance
    });
});

/**
 * Cancel workflow instance
 * POST /api/lifecycle/instance/:id/cancel
 */
const cancelWorkflow = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('معرف الشركة مطلوب | Firm ID is required', 400);
    }

    // SECURITY: Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صالح | Invalid ID format', 400);
    }

    // SECURITY: Mass assignment protection
    const allowedFields = ['reason'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // SECURITY: IDOR Protection - Verify ownership via firmId
    const instance = await LifecycleInstance.findOne({
        _id: sanitizedId,
        firmId: sanitizeObjectId(firmId)
    });

    if (!instance) {
        throw CustomException('مثيل سير العمل غير موجود | Workflow instance not found', 404);
    }

    // Use lifecycle service to cancel workflow
    const reason = safeData.reason ? sanitizeString(safeData.reason).substring(0, 500) : 'No reason provided';
    const cancelledInstance = await lifecycleService.cancelWorkflow(sanitizedId, userId, reason);

    logger.info(`✅ Lifecycle workflow cancelled for instance ${sanitizedId} by user ${userId}`);

    res.status(200).json({
        success: true,
        message: 'تم إلغاء سير العمل بنجاح | Workflow cancelled successfully',
        data: cancelledInstance
    });
});

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Workflow management
    listWorkflows,
    createWorkflow,
    getWorkflow,
    updateWorkflow,
    deleteWorkflow,

    // Instance management
    initiateWorkflow,
    getActiveWorkflows,
    getProgress,
    advanceStage,
    cancelWorkflow
};
