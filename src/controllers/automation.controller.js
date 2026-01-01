const { Automation } = require('../models');
const QueueService = require('../services/queue.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get firmId from user context
 */
const getFirmId = (req) => {
    return req.firmId || req.user?.firmId || null;
};

/**
 * Validate automation trigger configuration
 */
const validateTrigger = (trigger) => {
    if (!trigger || typeof trigger !== 'object') {
        throw CustomException('تكوين المشغل مطلوب | Trigger configuration is required', 400);
    }

    if (!trigger.type) {
        throw CustomException('نوع المشغل مطلوب | Trigger type is required', 400);
    }

    const validTriggerTypes = [
        'record_created',
        'record_updated',
        'field_changed',
        'time_based',
        'webhook',
        'form_submitted',
        'status_changed',
        'date_arrived'
    ];

    if (!validTriggerTypes.includes(trigger.type)) {
        throw CustomException('نوع المشغل غير صالح | Invalid trigger type', 400);
    }

    // Validate time_based trigger has schedule
    if (trigger.type === 'time_based' && !trigger.schedule) {
        throw CustomException('المشغل الزمني يتطلب جدولاً | time_based trigger requires a schedule', 400);
    }

    // Validate field_changed trigger has watchFields
    if (trigger.type === 'field_changed') {
        if (!trigger.watchFields || !Array.isArray(trigger.watchFields) || trigger.watchFields.length === 0) {
            throw CustomException('مشغل تغيير الحقل يتطلب حقول مراقبة | field_changed trigger requires watch fields', 400);
        }
    }

    // Validate conditions array if present
    if (trigger.conditions && !Array.isArray(trigger.conditions)) {
        throw CustomException('الشروط يجب أن تكون مصفوفة | Conditions must be an array', 400);
    }

    return true;
};

/**
 * Validate automation actions configuration
 */
const validateActions = (actions) => {
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
        throw CustomException('إجراء واحد على الأقل مطلوب | At least one action is required', 400);
    }

    const validActionTypes = [
        'update_record',
        'create_record',
        'send_email',
        'send_notification',
        'create_task',
        'update_field',
        'call_webhook',
        'send_slack',
        'assign_to',
        'add_to_campaign',
        'create_activity',
        'delay'
    ];

    actions.forEach((action, index) => {
        if (!action.type) {
            throw CustomException(`الإجراء ${index + 1} يفتقد النوع | Action ${index + 1} is missing type`, 400);
        }

        if (!validActionTypes.includes(action.type)) {
            throw CustomException(`نوع الإجراء ${action.type} غير صالح | Invalid action type: ${action.type}`, 400);
        }

        if (!action.config || typeof action.config !== 'object') {
            throw CustomException(`الإجراء ${index + 1} يفتقد التكوين | Action ${index + 1} is missing configuration`, 400);
        }
    });

    return true;
};

// ============================================
// CONTROLLER FUNCTIONS
// ============================================

/**
 * List automations
 * GET /api/automations
 */
const listAutomations = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('معرف الشركة مطلوب | Firm ID is required', 400);
    }

    // SECURITY: Sanitize and validate pagination parameters
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    // Build query with IDOR protection
    const query = { firmId: sanitizeObjectId(firmId) };

    // Optional filters with input validation
    if (req.query.entityType) {
        const validEntityTypes = ['lead', 'deal', 'contact', 'case', 'task', 'invoice'];
        if (validEntityTypes.includes(req.query.entityType)) {
            query.entityType = req.query.entityType;
        }
    }

    if (req.query.enabled !== undefined) {
        query.enabled = req.query.enabled === 'true';
    }

    if (req.query.isActive !== undefined) {
        query.isActive = req.query.isActive === 'true';
    }

    if (req.query.category && typeof req.query.category === 'string') {
        query.category = req.query.category.substring(0, 100); // Prevent excessive input
    }

    if (req.query.triggerType) {
        query['trigger.type'] = req.query.triggerType;
    }

    // Execute query
    const automations = await Automation.find(query)
        .sort({ priority: 1, createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email')
        .lean();

    const total = await Automation.countDocuments(query);

    res.status(200).json({
        success: true,
        data: automations,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

/**
 * Create automation
 * POST /api/automations
 */
const createAutomation = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('معرف الشركة مطلوب | Firm ID is required', 400);
    }

    // SECURITY: Mass assignment protection
    const allowedFields = [
        'name',
        'description',
        'entityType',
        'trigger',
        'actions',
        'enabled',
        'rateLimit',
        'priority',
        'timeout',
        'tags',
        'category'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Validate required fields
    if (!safeData.name || typeof safeData.name !== 'string') {
        throw CustomException('الاسم مطلوب | Name is required', 400);
    }

    if (!safeData.entityType) {
        throw CustomException('نوع الكيان مطلوب | Entity type is required', 400);
    }

    const validEntityTypes = ['lead', 'deal', 'contact', 'case', 'task', 'invoice'];
    if (!validEntityTypes.includes(safeData.entityType)) {
        throw CustomException('نوع الكيان غير صالح | Invalid entity type', 400);
    }

    // Validate trigger and actions
    validateTrigger(safeData.trigger);
    validateActions(safeData.actions);

    // SECURITY: Validate assign_to actions have users from the same firm
    const User = require('../models').User;
    for (const action of safeData.actions) {
        if (action.type === 'assign_to' && action.config?.userId) {
            const targetUser = await User.findOne({
                _id: sanitizeObjectId(action.config.userId),
                firmId: firmId
            }).select('_id').lean();

            if (!targetUser) {
                throw CustomException(
                    'المستخدم المعين غير موجود في هذا المكتب | Assigned user does not belong to this firm',
                    400
                );
            }
        }
    }

    // SECURITY: Input sanitization
    const automationData = {
        firmId: sanitizeObjectId(firmId),
        name: safeData.name.substring(0, 200),
        description: safeData.description ? safeData.description.substring(0, 1000) : '',
        entityType: safeData.entityType,
        trigger: safeData.trigger,
        actions: safeData.actions,
        enabled: safeData.enabled !== undefined ? Boolean(safeData.enabled) : true,
        rateLimit: safeData.rateLimit || {},
        priority: safeData.priority ? Math.max(1, Math.min(100, parseInt(safeData.priority))) : 10,
        timeout: safeData.timeout ? Math.max(1000, Math.min(300000, parseInt(safeData.timeout))) : 30000,
        tags: Array.isArray(safeData.tags) ? safeData.tags.slice(0, 20) : [],
        category: safeData.category ? safeData.category.substring(0, 100) : '',
        createdBy: userId
    };

    const automation = await Automation.create(automationData);

    // Audit log
    QueueService.logAudit({
        firmId,
        userId,
        userEmail: req.user?.email || '',
        userRole: req.user?.role || 'lawyer',
        userName: req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : '',
        action: 'create',
        resource: 'Automation',
        resourceId: automation._id,
        details: {
            automationName: automation.name,
            entityType: automation.entityType
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
    });

    res.status(201).json({
        success: true,
        message: 'تم إنشاء الأتمتة بنجاح | Automation created successfully',
        data: automation
    });
});

/**
 * Get automation by ID
 * GET /api/automations/:id
 */
const getAutomation = asyncHandler(async (req, res) => {
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
    const automation = await Automation.findOne({
        _id: sanitizedId,
        firmId: sanitizeObjectId(firmId)
    })
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email')
        .populate('disabledBy', 'firstName lastName');

    if (!automation) {
        throw CustomException('الأتمتة غير موجودة | Automation not found', 404);
    }

    res.status(200).json({
        success: true,
        data: automation
    });
});

/**
 * Update automation
 * PUT /api/automations/:id
 */
const updateAutomation = asyncHandler(async (req, res) => {
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
    const automation = await Automation.findOne({
        _id: sanitizedId,
        firmId: sanitizeObjectId(firmId)
    });

    if (!automation) {
        throw CustomException('الأتمتة غير موجودة | Automation not found', 404);
    }

    // SECURITY: Mass assignment protection
    const allowedFields = [
        'name',
        'description',
        'entityType',
        'trigger',
        'actions',
        'enabled',
        'rateLimit',
        'priority',
        'timeout',
        'tags',
        'category'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Validate if trigger or actions are being updated
    if (safeData.trigger) {
        validateTrigger(safeData.trigger);
        automation.trigger = safeData.trigger;
    }

    if (safeData.actions) {
        validateActions(safeData.actions);

        // SECURITY: Validate assign_to actions have users from the same firm
        const User = require('../models').User;
        for (const action of safeData.actions) {
            if (action.type === 'assign_to' && action.config?.userId) {
                const targetUser = await User.findOne({
                    _id: sanitizeObjectId(action.config.userId),
                    firmId: firmId
                }).select('_id').lean();

                if (!targetUser) {
                    throw CustomException(
                        'المستخدم المعين غير موجود في هذا المكتب | Assigned user does not belong to this firm',
                        400
                    );
                }
            }
        }

        automation.actions = safeData.actions;
    }

    // Update other fields
    if (safeData.name !== undefined) {
        automation.name = safeData.name.substring(0, 200);
    }

    if (safeData.description !== undefined) {
        automation.description = safeData.description.substring(0, 1000);
    }

    if (safeData.entityType !== undefined) {
        const validEntityTypes = ['lead', 'deal', 'contact', 'case', 'task', 'invoice'];
        if (validEntityTypes.includes(safeData.entityType)) {
            automation.entityType = safeData.entityType;
        }
    }

    if (safeData.enabled !== undefined) {
        automation.enabled = Boolean(safeData.enabled);
    }

    if (safeData.rateLimit !== undefined) {
        automation.rateLimit = safeData.rateLimit;
    }

    if (safeData.priority !== undefined) {
        automation.priority = Math.max(1, Math.min(100, parseInt(safeData.priority)));
    }

    if (safeData.timeout !== undefined) {
        automation.timeout = Math.max(1000, Math.min(300000, parseInt(safeData.timeout)));
    }

    if (safeData.tags !== undefined && Array.isArray(safeData.tags)) {
        automation.tags = safeData.tags.slice(0, 20);
    }

    if (safeData.category !== undefined) {
        automation.category = safeData.category.substring(0, 100);
    }

    automation.updatedBy = userId;
    await automation.save();

    // Audit log
    QueueService.logAudit({
        firmId,
        userId,
        userEmail: req.user?.email || '',
        userRole: req.user?.role || 'lawyer',
        userName: req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : '',
        action: 'update',
        resource: 'Automation',
        resourceId: automation._id,
        details: {
            automationName: automation.name,
            updatedFields: Object.keys(safeData)
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
    });

    res.status(200).json({
        success: true,
        message: 'تم تحديث الأتمتة بنجاح | Automation updated successfully',
        data: automation
    });
});

/**
 * Delete automation
 * DELETE /api/automations/:id
 */
const deleteAutomation = asyncHandler(async (req, res) => {
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
    const automation = await Automation.findOneAndDelete({
        _id: sanitizedId,
        firmId: sanitizeObjectId(firmId)
    });

    if (!automation) {
        throw CustomException('الأتمتة غير موجودة | Automation not found', 404);
    }

    // Audit log
    QueueService.logAudit({
        firmId,
        userId,
        userEmail: req.user?.email || '',
        userRole: req.user?.role || 'lawyer',
        userName: req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : '',
        action: 'delete',
        resource: 'Automation',
        resourceId: automation._id,
        details: {
            automationName: automation.name,
            entityType: automation.entityType
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
    });

    res.status(200).json({
        success: true,
        message: 'تم حذف الأتمتة بنجاح | Automation deleted successfully'
    });
});

/**
 * Enable automation
 * POST /api/automations/:id/enable
 */
const enableAutomation = asyncHandler(async (req, res) => {
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
    const automation = await Automation.findOne({
        _id: sanitizedId,
        firmId: sanitizeObjectId(firmId)
    });

    if (!automation) {
        throw CustomException('الأتمتة غير موجودة | Automation not found', 404);
    }

    await automation.enable(userId);

    // Audit log
    QueueService.logAudit({
        firmId,
        userId,
        userEmail: req.user?.email || '',
        userRole: req.user?.role || 'lawyer',
        userName: req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : '',
        action: 'update',
        resource: 'Automation',
        resourceId: automation._id,
        details: {
            automationName: automation.name,
            action: 'enabled'
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
    });

    res.status(200).json({
        success: true,
        message: 'تم تفعيل الأتمتة بنجاح | Automation enabled successfully',
        data: automation
    });
});

/**
 * Disable automation
 * POST /api/automations/:id/disable
 */
const disableAutomation = asyncHandler(async (req, res) => {
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
    const automation = await Automation.findOne({
        _id: sanitizedId,
        firmId: sanitizeObjectId(firmId)
    });

    if (!automation) {
        throw CustomException('الأتمتة غير موجودة | Automation not found', 404);
    }

    const reason = safeData.reason ? safeData.reason.substring(0, 500) : 'Manually disabled';
    await automation.disable(userId, reason);

    // Audit log
    QueueService.logAudit({
        firmId,
        userId,
        userEmail: req.user?.email || '',
        userRole: req.user?.role || 'lawyer',
        userName: req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : '',
        action: 'update',
        resource: 'Automation',
        resourceId: automation._id,
        details: {
            automationName: automation.name,
            action: 'disabled',
            reason
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
    });

    res.status(200).json({
        success: true,
        message: 'تم تعطيل الأتمتة بنجاح | Automation disabled successfully',
        data: automation
    });
});

/**
 * Test automation (dry run)
 * POST /api/automations/:id/test
 */
const testAutomation = asyncHandler(async (req, res) => {
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
    const allowedFields = ['testRecord'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // SECURITY: IDOR Protection - Verify ownership via firmId
    const automation = await Automation.findOne({
        _id: sanitizedId,
        firmId: sanitizeObjectId(firmId)
    });

    if (!automation) {
        throw CustomException('الأتمتة غير موجودة | Automation not found', 404);
    }

    // Validate test record
    if (!safeData.testRecord || typeof safeData.testRecord !== 'object') {
        throw CustomException('سجل الاختبار مطلوب | Test record is required', 400);
    }

    // Perform dry run evaluation
    const conditionsMet = await automation.evaluateConditions(safeData.testRecord);

    const testResult = {
        automationId: automation._id,
        automationName: automation.name,
        testMode: true,
        conditionsMet,
        wouldExecute: conditionsMet && automation.enabled && automation.isActive,
        actions: automation.actions.map(action => ({
            type: action.type,
            order: action.order,
            config: action.config,
            continueOnError: action.continueOnError
        })),
        triggerInfo: {
            type: automation.trigger.type,
            conditions: automation.trigger.conditions,
            schedule: automation.trigger.schedule,
            watchFields: automation.trigger.watchFields
        },
        timestamp: new Date()
    };

    res.status(200).json({
        success: true,
        message: 'تم اختبار الأتمتة بنجاح (وضع التجريب - لم يتم التنفيذ) | Automation tested successfully (dry run - not executed)',
        data: testResult
    });
});

/**
 * Get automation statistics
 * GET /api/automations/:id/stats
 */
const getAutomationStats = asyncHandler(async (req, res) => {
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
    const automation = await Automation.findOne({
        _id: sanitizedId,
        firmId: sanitizeObjectId(firmId)
    });

    if (!automation) {
        throw CustomException('الأتمتة غير موجودة | Automation not found', 404);
    }

    const stats = {
        automationId: automation._id,
        automationName: automation.name,
        totalRuns: automation.stats?.totalRuns || 0,
        successfulRuns: automation.stats?.successfulRuns || 0,
        failedRuns: automation.stats?.failedRuns || 0,
        successRate: automation.successRate || 0,
        failureRate: automation.failureRate || 0,
        lastRun: automation.stats?.lastRun || null,
        lastError: automation.stats?.lastError || null,
        lastErrorAt: automation.stats?.lastErrorAt || null,
        averageExecutionTime: automation.stats?.averageExecutionTime || 0,
        enabled: automation.enabled,
        isActive: automation.isActive
    };

    res.status(200).json({
        success: true,
        data: stats
    });
});

/**
 * Get execution logs
 * GET /api/automations/:id/logs
 */
const getExecutionLogs = asyncHandler(async (req, res) => {
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
    const automation = await Automation.findOne({
        _id: sanitizedId,
        firmId: sanitizeObjectId(firmId)
    });

    if (!automation) {
        throw CustomException('الأتمتة غير موجودة | Automation not found', 404);
    }

    // SECURITY: Sanitize and validate pagination parameters
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    // Build query
    const logsQuery = {
        firmId: sanitizeObjectId(firmId),
        resource: 'Automation',
        resourceId: sanitizedId
    };

    // Optional filters
    if (req.query.action) {
        logsQuery.action = req.query.action;
    }

    if (req.query.startDate) {
        logsQuery.createdAt = logsQuery.createdAt || {};
        logsQuery.createdAt.$gte = new Date(req.query.startDate);
    }

    if (req.query.endDate) {
        logsQuery.createdAt = logsQuery.createdAt || {};
        logsQuery.createdAt.$lte = new Date(req.query.endDate);
    }

    // Fetch logs
    const logs = await AuditLog.find(logsQuery)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('userId', 'firstName lastName email')
        .lean();

    const total = await AuditLog.countDocuments(logsQuery);

    res.status(200).json({
        success: true,
        data: logs,
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
    listAutomations,
    createAutomation,
    getAutomation,
    updateAutomation,
    deleteAutomation,
    enableAutomation,
    disableAutomation,
    testAutomation,
    getAutomationStats,
    getExecutionLogs
};
