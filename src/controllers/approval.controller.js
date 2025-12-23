/**
 * Approval Controller - Approval Workflow System
 *
 * Implements enterprise-grade approval workflows:
 * - Configurable approval rules per firm
 * - Pending approval management
 * - Approve/Reject actions
 * - Approval history
 */

const { ApprovalRule, ApprovalRequest, TeamActivityLog } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// ═══════════════════════════════════════════════════════════════
// APPROVAL RULES MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Get approval rules for the firm
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
 * Update approval rules
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
        details: { rulesCount: rules?.length || 0 },
        timestamp: new Date()
    });

    res.json({
        success: true,
        message: 'تم تحديث قواعد الموافقات بنجاح',
        data: updated
    });
});

/**
 * Add a new approval rule
 * POST /api/approvals/rules
 */
const addApprovalRule = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    if (req.firmRole !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه إضافة قواعد الموافقات', 403);
    }

    // Mass assignment protection - only allow specific fields for approval rules
    const rule = pickAllowedFields(req.body, [
        'module',
        'action',
        'requiredApprovers',
        'requiredRoles',
        'approvalsNeeded',
        'conditions',
        'description'
    ]);

    if (!rule.module || !rule.action) {
        throw CustomException('الوحدة والإجراء مطلوبان', 400);
    }

    const updated = await ApprovalRule.addRule(firmId, rule, userId);

    res.status(201).json({
        success: true,
        message: 'تم إضافة قاعدة الموافقة بنجاح',
        data: updated
    });
});

/**
 * Delete an approval rule
 * DELETE /api/approvals/rules/:ruleId
 */
const deleteApprovalRule = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;
    const { ruleId } = req.params;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    if (req.firmRole !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه حذف قواعد الموافقات', 403);
    }

    // Sanitize rule ID
    const sanitizedRuleId = sanitizeObjectId(ruleId);
    if (!sanitizedRuleId) {
        throw CustomException('معرف القاعدة غير صالح', 400);
    }

    const updated = await ApprovalRule.deleteRule(firmId, sanitizedRuleId, userId);

    res.json({
        success: true,
        message: 'تم حذف قاعدة الموافقة بنجاح',
        data: updated
    });
});

/**
 * Get default rule templates
 * GET /api/approvals/templates
 */
const getRuleTemplates = asyncHandler(async (req, res) => {
    const templates = ApprovalRule.getDefaultTemplates();

    res.json({
        success: true,
        data: templates
    });
});

// ═══════════════════════════════════════════════════════════════
// PENDING APPROVALS
// ═══════════════════════════════════════════════════════════════

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
    const userRole = req.firmRole;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    const { page = 1, limit = 50 } = req.query;

    const pending = await ApprovalRequest.getPendingForApprover(firmId, userId, userRole, {
        limit: Math.min(parseInt(limit) || 50, 100),
        skip: ((parseInt(page) || 1) - 1) * (parseInt(limit) || 50)
    });

    res.json({
        success: true,
        data: pending
    });
});

/**
 * Get my approval requests (requests I submitted)
 * GET /api/approvals/my-requests
 */
const getMyRequests = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    const { page = 1, limit = 50, status } = req.query;

    const requests = await ApprovalRequest.getMyRequests(firmId, userId, {
        limit: Math.min(parseInt(limit) || 50, 100),
        skip: ((parseInt(page) || 1) - 1) * (parseInt(limit) || 50),
        status
    });

    res.json({
        success: true,
        data: requests
    });
});

/**
 * Get approval request details
 * GET /api/approvals/:id
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

// ═══════════════════════════════════════════════════════════════
// APPROVAL ACTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Approve a request
 * POST /api/approvals/:id/approve
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
 * Reject a request
 * POST /api/approvals/:id/reject
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

/**
 * Cancel a request (by requester)
 * POST /api/approvals/:id/cancel
 */
const cancelRequest = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;
    const { id } = req.params;

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
        status: 'pending' // Prevent cancelling already processed requests
    });

    if (!request) {
        throw CustomException('طلب الموافقة غير موجود أو تمت معالجته بالفعل', 404);
    }

    // IDOR protection - only requester can cancel their own request
    if (request.requestedBy.toString() !== userId.toString()) {
        throw CustomException('يمكنك فقط إلغاء طلباتك الخاصة', 403);
    }

    const cancelled = await ApprovalRequest.cancel(sanitizedId, userId);

    // Log activity
    await TeamActivityLog.log({
        firmId,
        userId,
        action: 'delete',
        targetType: 'approval_request',
        targetId: request._id,
        details: { module: request.module, action: request.action },
        timestamp: new Date()
    });

    res.json({
        success: true,
        message: 'تم إلغاء الطلب',
        data: cancelled
    });
});

/**
 * Get approval statistics
 * GET /api/approvals/stats
 */
const getApprovalStats = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    const stats = await ApprovalRequest.getStats(firmId);

    res.json({
        success: true,
        stats
    });
});

/**
 * Check if an action requires approval
 * POST /api/approvals/check
 */
const checkApprovalRequired = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    // Mass assignment protection - only allow specific fields
    const { module, action, context } = pickAllowedFields(req.body, ['module', 'action', 'context']);

    if (!firmId) {
        return res.json({
            success: true,
            requiresApproval: false
        });
    }

    if (!module || !action) {
        throw CustomException('الوحدة والإجراء مطلوبان', 400);
    }

    const result = await ApprovalRule.requiresApproval(firmId, module, action, context || {});

    res.json({
        success: true,
        ...result
    });
});

module.exports = {
    getApprovalRules,
    updateApprovalRules,
    addApprovalRule,
    deleteApprovalRule,
    getRuleTemplates,
    getPendingApprovals,
    getMyRequests,
    getApprovalRequest,
    approveRequest,
    rejectRequest,
    cancelRequest,
    getApprovalStats,
    checkApprovalRequired
};
