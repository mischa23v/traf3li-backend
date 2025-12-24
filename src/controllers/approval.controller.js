/**
 * Approval Controller - Multi-Level Approval Workflow System
 *
 * This controller implements enterprise-grade approval workflows with:
 * - Configurable multi-level approval chains
 * - Dynamic approver resolution (specific users, roles, managers, dynamic fields)
 * - Flexible approval types (any, all, majority)
 * - Delegation and escalation support
 * - Skip conditions for conditional workflow routing
 * - Comprehensive audit trail
 * - Action execution on approval/rejection
 *
 * NOTE: This file maintains backward compatibility with the old approval system
 * (ApprovalRule/ApprovalRequest) while also supporting the new workflow system
 * (ApprovalWorkflow/ApprovalInstance)
 */

const { ApprovalRule, ApprovalRequest, TeamActivityLog } = require('../models');
const { ApprovalWorkflow, ApprovalInstance } = require('../models/approvalWorkflow.model');
const ApprovalService = require('../services/approval.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// ═══════════════════════════════════════════════════════════════
// APPROVAL WORKFLOW MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * List approval workflows for firm
 * GET /api/approvals/workflows
 */
const listWorkflows = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Mass assignment protection
    const { entityType, isActive, page = 1, limit = 50 } = pickAllowedFields(req.query, [
        'entityType',
        'isActive',
        'page',
        'limit'
    ]);

    // Build query
    const query = { firmId };
    if (entityType) {
        query.entityType = entityType;
    }
    if (isActive !== undefined) {
        query.isActive = isActive === 'true' || isActive === true;
    }

    // Validate and sanitize pagination
    const sanitizedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const sanitizedPage = Math.max(parseInt(page) || 1, 1);
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    // Fetch workflows
    const [workflows, total] = await Promise.all([
        ApprovalWorkflow.find(query)
            .populate('createdBy', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(sanitizedLimit)
            .lean(),
        ApprovalWorkflow.countDocuments(query)
    ]);

    res.json({
        success: true,
        data: workflows,
        pagination: {
            total,
            page: sanitizedPage,
            limit: sanitizedLimit,
            pages: Math.ceil(total / sanitizedLimit)
        }
    });
});

/**
 * Create approval workflow
 * POST /api/approvals/workflows
 */
const createWorkflow = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Only owner/admin can create workflows
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('فقط مالك أو مدير المكتب يمكنه إنشاء قواعد الموافقات', 403);
    }

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'name',
        'description',
        'entityType',
        'triggerConditions',
        'levels',
        'onApproval',
        'onRejection',
        'slaHours',
        'notifyOnPending',
        'auditRequired',
        'isActive'
    ]);

    // Validate required fields
    if (!allowedFields.name || !allowedFields.entityType || !allowedFields.levels) {
        throw CustomException('الاسم ونوع الكيان والمستويات مطلوبة', 400);
    }

    if (!Array.isArray(allowedFields.levels) || allowedFields.levels.length === 0) {
        throw CustomException('يجب تحديد مستوى واحد على الأقل للموافقة', 400);
    }

    // Create workflow
    const workflow = await ApprovalWorkflow.create({
        ...allowedFields,
        firmId,
        createdBy: userId
    });

    // Log activity
    await TeamActivityLog.log({
        firmId,
        userId,
        action: 'create',
        targetType: 'approval_workflow',
        targetId: workflow._id,
        targetName: workflow.name,
        details: { entityType: workflow.entityType },
        timestamp: new Date()
    });

    res.status(201).json({
        success: true,
        message: 'تم إنشاء قاعدة الموافقة بنجاح',
        data: workflow
    });
});

/**
 * Get workflow by ID
 * GET /api/approvals/workflows/:id
 */
const getWorkflow = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Sanitize and verify workflow ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف القاعدة غير صالح', 400);
    }

    // IDOR protection - verify firmId
    const workflow = await ApprovalWorkflow.findOne({ _id: sanitizedId, firmId })
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email')
        .lean();

    if (!workflow) {
        throw CustomException('قاعدة الموافقة غير موجودة', 404);
    }

    res.json({
        success: true,
        data: workflow
    });
});

/**
 * Update approval workflow
 * PUT /api/approvals/workflows/:id
 */
const updateWorkflow = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Only owner/admin can update workflows
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('فقط مالك أو مدير المكتب يمكنه تعديل قواعد الموافقات', 403);
    }

    // Sanitize and verify workflow ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف القاعدة غير صالح', 400);
    }

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'name',
        'description',
        'entityType',
        'triggerConditions',
        'levels',
        'onApproval',
        'onRejection',
        'slaHours',
        'notifyOnPending',
        'auditRequired',
        'isActive'
    ]);

    // IDOR protection - verify firmId
    const workflow = await ApprovalWorkflow.findOne({ _id: sanitizedId, firmId });

    if (!workflow) {
        throw CustomException('قاعدة الموافقة غير موجودة', 404);
    }

    // Update workflow
    Object.assign(workflow, allowedFields);
    workflow.updatedBy = userId;
    await workflow.save();

    // Log activity
    await TeamActivityLog.log({
        firmId,
        userId,
        action: 'update',
        targetType: 'approval_workflow',
        targetId: workflow._id,
        targetName: workflow.name,
        details: { entityType: workflow.entityType },
        timestamp: new Date()
    });

    res.json({
        success: true,
        message: 'تم تحديث قاعدة الموافقة بنجاح',
        data: workflow
    });
});

/**
 * Delete approval workflow
 * DELETE /api/approvals/workflows/:id
 */
const deleteWorkflow = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Only owner can delete workflows
    if (req.firmRole !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه حذف قواعد الموافقات', 403);
    }

    // Sanitize and verify workflow ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف القاعدة غير صالح', 400);
    }

    // IDOR protection - verify firmId
    const workflow = await ApprovalWorkflow.findOne({ _id: sanitizedId, firmId });

    if (!workflow) {
        throw CustomException('قاعدة الموافقة غير موجودة', 404);
    }

    // Check if there are active approval instances
    const activeInstances = await ApprovalInstance.countDocuments({
        workflowId: sanitizedId,
        status: 'pending'
    });

    if (activeInstances > 0) {
        throw CustomException(
            `لا يمكن حذف قاعدة الموافقة لوجود ${activeInstances} طلب موافقة نشط`,
            400
        );
    }

    // Delete workflow
    await workflow.deleteOne();

    // Log activity
    await TeamActivityLog.log({
        firmId,
        userId,
        action: 'delete',
        targetType: 'approval_workflow',
        targetId: workflow._id,
        targetName: workflow.name,
        details: { entityType: workflow.entityType },
        timestamp: new Date()
    });

    res.json({
        success: true,
        message: 'تم حذف قاعدة الموافقة بنجاح'
    });
});

// ═══════════════════════════════════════════════════════════════
// APPROVAL INSTANCE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Initiate approval
 * POST /api/approvals/initiate
 */
const initiateApproval = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Mass assignment protection
    const { workflowId, entityType, entityId } = pickAllowedFields(req.body, [
        'workflowId',
        'entityType',
        'entityId'
    ]);

    // Validate required fields
    if (!workflowId || !entityType || !entityId) {
        throw CustomException('معرف القاعدة ونوع الكيان ومعرف الكيان مطلوبة', 400);
    }

    // Sanitize IDs
    const sanitizedWorkflowId = sanitizeObjectId(workflowId);
    const sanitizedEntityId = sanitizeObjectId(entityId);

    if (!sanitizedWorkflowId || !sanitizedEntityId) {
        throw CustomException('المعرفات المقدمة غير صالحة', 400);
    }

    // Use ApprovalService to initiate approval
    const instance = await ApprovalService.initiateApproval(
        sanitizedWorkflowId,
        entityType,
        sanitizedEntityId,
        userId,
        firmId,
        {
            ipAddress: req.ip || req.connection?.remoteAddress || 'unknown'
        }
    );

    if (!instance) {
        throw CustomException('فشل في بدء عملية الموافقة', 500);
    }

    res.status(201).json({
        success: true,
        message: 'تم بدء عملية الموافقة بنجاح',
        data: instance
    });
});

/**
 * Get pending approvals for current user
 * GET /api/approvals/pending
 */
const getPendingApprovals = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Mass assignment protection
    const { page = 1, limit = 50 } = pickAllowedFields(req.query, ['page', 'limit']);

    // Validate and sanitize pagination
    const sanitizedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const sanitizedPage = Math.max(parseInt(page) || 1, 1);
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    // Use ApprovalService to get pending approvals
    const approvals = await ApprovalService.getPendingApprovals(userId, firmId, {
        limit: sanitizedLimit,
        skip
    });

    res.json({
        success: true,
        data: approvals,
        pagination: {
            page: sanitizedPage,
            limit: sanitizedLimit
        }
    });
});

/**
 * Record decision (approve/reject)
 * POST /api/approvals/:id/decide
 */
const recordDecision = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Sanitize instance ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف الطلب غير صالح', 400);
    }

    // Mass assignment protection
    const { decision, comments } = pickAllowedFields(req.body, ['decision', 'comments']);

    // Validate decision
    if (!decision || !['approved', 'rejected', 'abstained'].includes(decision)) {
        throw CustomException('يجب تحديد قرار صالح (approved, rejected, abstained)', 400);
    }

    // Verify instance belongs to firm (IDOR protection)
    const instance = await ApprovalInstance.findOne({ _id: sanitizedId, firmId });

    if (!instance) {
        throw CustomException('طلب الموافقة غير موجود', 404);
    }

    // Use ApprovalService to record decision
    const updatedInstance = await ApprovalService.recordDecision(
        sanitizedId,
        userId,
        decision,
        comments || '',
        req.ip || req.connection?.remoteAddress || 'unknown',
        {}
    );

    if (!updatedInstance) {
        throw CustomException('فشل في تسجيل القرار', 500);
    }

    res.json({
        success: true,
        message: decision === 'approved' ? 'تمت الموافقة بنجاح' :
                 decision === 'rejected' ? 'تم رفض الطلب' : 'تم تسجيل قرارك',
        data: updatedInstance
    });
});

/**
 * Cancel approval
 * POST /api/approvals/:id/cancel
 */
const cancelApproval = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Sanitize instance ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف الطلب غير صالح', 400);
    }

    // Mass assignment protection
    const { reason } = pickAllowedFields(req.body, ['reason']);

    // Verify instance belongs to firm (IDOR protection)
    const instance = await ApprovalInstance.findOne({ _id: sanitizedId, firmId });

    if (!instance) {
        throw CustomException('طلب الموافقة غير موجود', 404);
    }

    // Use ApprovalService to cancel approval
    const cancelledInstance = await ApprovalService.cancelApproval(
        sanitizedId,
        userId,
        reason || '',
        {
            ipAddress: req.ip || req.connection?.remoteAddress || 'unknown'
        }
    );

    if (!cancelledInstance) {
        throw CustomException('فشل في إلغاء الطلب', 500);
    }

    res.json({
        success: true,
        message: 'تم إلغاء طلب الموافقة بنجاح',
        data: cancelledInstance
    });
});

/**
 * Delegate approval
 * POST /api/approvals/:id/delegate
 */
const delegateApproval = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Sanitize instance ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف الطلب غير صالح', 400);
    }

    // Mass assignment protection
    const { toUserId, reason } = pickAllowedFields(req.body, ['toUserId', 'reason']);

    // Validate toUserId
    if (!toUserId) {
        throw CustomException('يجب تحديد المستخدم المفوض إليه', 400);
    }

    const sanitizedToUserId = sanitizeObjectId(toUserId);
    if (!sanitizedToUserId) {
        throw CustomException('معرف المستخدم غير صالح', 400);
    }

    // Verify instance belongs to firm (IDOR protection)
    const instance = await ApprovalInstance.findOne({ _id: sanitizedId, firmId });

    if (!instance) {
        throw CustomException('طلب الموافقة غير موجود', 404);
    }

    // Use ApprovalService to delegate approval
    const delegatedInstance = await ApprovalService.delegateApproval(
        sanitizedId,
        userId,
        sanitizedToUserId,
        reason || '',
        {
            ipAddress: req.ip || req.connection?.remoteAddress || 'unknown'
        }
    );

    if (!delegatedInstance) {
        throw CustomException('فشل في تفويض الموافقة', 500);
    }

    res.json({
        success: true,
        message: 'تم تفويض الموافقة بنجاح',
        data: delegatedInstance
    });
});

/**
 * Get approval history for entity
 * GET /api/approvals/history/:entityType/:entityId
 */
const getApprovalHistory = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const { entityType, entityId } = req.params;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Validate entityType
    const validEntityTypes = [
        'deal', 'quote', 'expense', 'leave_request', 'invoice',
        'purchase_order', 'contract', 'payment', 'refund', 'time_off', 'reimbursement'
    ];

    if (!validEntityTypes.includes(entityType)) {
        throw CustomException('نوع الكيان غير صالح', 400);
    }

    // Sanitize entityId
    const sanitizedEntityId = sanitizeObjectId(entityId);
    if (!sanitizedEntityId) {
        throw CustomException('معرف الكيان غير صالح', 400);
    }

    // Mass assignment protection
    const { page = 1, limit = 50 } = pickAllowedFields(req.query, ['page', 'limit']);

    // Validate and sanitize pagination
    const sanitizedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const sanitizedPage = Math.max(parseInt(page) || 1, 1);
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    // Use ApprovalService to get approval history
    const history = await ApprovalService.getApprovalHistory(
        entityType,
        sanitizedEntityId,
        firmId,
        {
            limit: sanitizedLimit,
            skip
        }
    );

    res.json({
        success: true,
        data: history,
        pagination: {
            page: sanitizedPage,
            limit: sanitizedLimit
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// BACKWARD COMPATIBILITY - OLD APPROVAL SYSTEM
// These endpoints maintain compatibility with the old approval system
// ═══════════════════════════════════════════════════════════════

/**
 * Get approval rules for the firm (OLD SYSTEM)
 * GET /api/approvals/rules
 */
const getApprovalRules = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    const rules = await ApprovalRule.getForFirm(firmId);

    res.json({
        success: true,
        data: rules
    });
});

/**
 * Update approval rules (OLD SYSTEM)
 * PUT /api/approvals/rules
 */
const updateApprovalRules = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Only owner can modify approval rules
    if (req.firmRole !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه تعديل قواعد الموافقات', 403);
    }

    // Mass assignment protection - only allow specific fields
    const allowedData = pickAllowedFields(req.body, ['rules', 'settings']);

    const updated = await ApprovalRule.upsertRules(firmId, allowedData, userId);

    // Log activity
    await TeamActivityLog.log({
        firmId,
        userId,
        action: 'update',
        targetType: 'setting',
        targetName: 'Approval Rules',
        details: { rulesCount: allowedData.rules?.length || 0 },
        timestamp: new Date()
    });

    res.json({
        success: true,
        message: 'تم تحديث قواعد الموافقات بنجاح',
        data: updated
    });
});

/**
 * Get approval request details (OLD SYSTEM)
 * GET /api/approvals/requests/:id
 */
const getApprovalRequest = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Sanitize and verify request ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف الطلب غير صالح', 400);
    }

    const request = await ApprovalRequest.findOne({ _id: sanitizedId, firmId })
        .populate('requestedBy', 'firstName lastName email avatar')
        .populate('finalizedBy', 'firstName lastName email')
        .populate('decisions.userId', 'firstName lastName email')
        .lean();

    if (!request) {
        throw CustomException('طلب الموافقة غير موجود', 404);
    }

    res.json({
        success: true,
        data: request
    });
});

/**
 * Approve a request (OLD SYSTEM)
 * POST /api/approvals/requests/:id/approve
 */
const approveRequest = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;
    const { id } = req.params;

    // Mass assignment protection - only allow comment field
    const { comment } = pickAllowedFields(req.body, ['comment']);

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Sanitize and verify request ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف الطلب غير صالح', 400);
    }

    // Verify request belongs to this firm and is in pending status
    const request = await ApprovalRequest.findOne({
        _id: sanitizedId,
        firmId,
        status: 'pending' // Prevent approval status manipulation
    });

    if (!request) {
        throw CustomException('طلب الموافقة غير موجود أو تمت معالجته بالفعل', 404);
    }

    // IDOR protection - verify user is authorized as an approver
    const isRequiredApprover = request.requiredApprovers.some(
        approverId => approverId.toString() === userId.toString()
    );
    const hasRequiredRole = request.requiredRoles.includes(req.firmRole);
    const isOwnerOrAdmin = ['owner', 'admin'].includes(req.firmRole);

    // Role-based approval verification
    const canApprove = isRequiredApprover || hasRequiredRole || isOwnerOrAdmin;

    if (!canApprove) {
        throw CustomException('ليس لديك صلاحية للموافقة على هذا الطلب', 403);
    }

    // Prevent users from approving their own requests
    if (request.requestedBy.toString() === userId.toString()) {
        throw CustomException('لا يمكنك الموافقة على طلبك الخاص', 403);
    }

    // Check if user already approved this request
    const alreadyApproved = request.decisions?.some(
        decision => decision.userId.toString() === userId.toString() && decision.decision === 'approved'
    );

    if (alreadyApproved) {
        throw CustomException('لقد وافقت على هذا الطلب بالفعل', 400);
    }

    const approved = await ApprovalRequest.approve(sanitizedId, userId, comment);

    // Log activity
    await TeamActivityLog.log({
        firmId,
        userId,
        action: 'approve',
        targetType: request.targetType,
        targetId: request.targetId,
        details: {
            requestId: id,
            module: request.module,
            action: request.action,
            isFullyApproved: approved.status === 'approved'
        },
        timestamp: new Date()
    });

    res.json({
        success: true,
        message: approved.status === 'approved' ? 'تمت الموافقة على الطلب' : 'تمت إضافة موافقتك',
        data: approved
    });
});

/**
 * Reject a request (OLD SYSTEM)
 * POST /api/approvals/requests/:id/reject
 */
const rejectRequest = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;
    const { id } = req.params;

    // Mass assignment protection - only allow reason field
    const { reason } = pickAllowedFields(req.body, ['reason']);

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    if (!reason) {
        throw CustomException('سبب الرفض مطلوب', 400);
    }

    // Sanitize and verify request ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف الطلب غير صالح', 400);
    }

    // Verify request belongs to this firm and is in pending status
    const request = await ApprovalRequest.findOne({
        _id: sanitizedId,
        firmId,
        status: 'pending' // Prevent approval status manipulation
    });

    if (!request) {
        throw CustomException('طلب الموافقة غير موجود أو تمت معالجته بالفعل', 404);
    }

    // IDOR protection - verify user is authorized as an approver
    const isRequiredApprover = request.requiredApprovers.some(
        approverId => approverId.toString() === userId.toString()
    );
    const hasRequiredRole = request.requiredRoles.includes(req.firmRole);
    const isOwnerOrAdmin = ['owner', 'admin'].includes(req.firmRole);

    // Role-based approval verification
    const canReject = isRequiredApprover || hasRequiredRole || isOwnerOrAdmin;

    if (!canReject) {
        throw CustomException('ليس لديك صلاحية لرفض هذا الطلب', 403);
    }

    // Prevent users from rejecting their own requests
    if (request.requestedBy.toString() === userId.toString()) {
        throw CustomException('لا يمكنك رفض طلبك الخاص', 403);
    }

    const rejected = await ApprovalRequest.reject(sanitizedId, userId, reason);

    // Log activity
    await TeamActivityLog.log({
        firmId,
        userId,
        action: 'reject',
        targetType: request.targetType,
        targetId: request.targetId,
        details: {
            requestId: id,
            module: request.module,
            action: request.action,
            reason
        },
        timestamp: new Date()
    });

    res.json({
        success: true,
        message: 'تم رفض الطلب',
        data: rejected
    });
});

module.exports = {
    // New workflow system
    listWorkflows,
    createWorkflow,
    getWorkflow,
    updateWorkflow,
    deleteWorkflow,
    initiateApproval,
    getPendingApprovals,
    recordDecision,
    cancelApproval,
    delegateApproval,
    getApprovalHistory,

    // Old approval system (backward compatibility)
    getApprovalRules,
    updateApprovalRules,
    getApprovalRequest,
    approveRequest,
    rejectRequest
};
