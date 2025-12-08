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

    const { rules, settings } = req.body;

    const updated = await ApprovalRule.upsertRules(firmId, { rules, settings }, userId);

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

    const rule = req.body;

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

    const updated = await ApprovalRule.deleteRule(firmId, ruleId, userId);

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

    const request = await ApprovalRequest.findOne({ _id: id, firmId })
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
    const { comment } = req.body;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Verify request belongs to this firm
    const request = await ApprovalRequest.findOne({ _id: id, firmId });
    if (!request) {
        throw CustomException('طلب الموافقة غير موجود', 404);
    }

    // Check if user can approve (is in approvers list or has role)
    const canApprove = request.requiredApprovers.some(a => a.toString() === userId.toString()) ||
        request.requiredRoles.includes(req.firmRole) ||
        ['owner', 'admin'].includes(req.firmRole);

    if (!canApprove) {
        throw CustomException('ليس لديك صلاحية للموافقة على هذا الطلب', 403);
    }

    const approved = await ApprovalRequest.approve(id, userId, comment);

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
    const { reason } = req.body;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Verify request belongs to this firm
    const request = await ApprovalRequest.findOne({ _id: id, firmId });
    if (!request) {
        throw CustomException('طلب الموافقة غير موجود', 404);
    }

    // Check if user can reject
    const canReject = request.requiredApprovers.some(a => a.toString() === userId.toString()) ||
        request.requiredRoles.includes(req.firmRole) ||
        ['owner', 'admin'].includes(req.firmRole);

    if (!canReject) {
        throw CustomException('ليس لديك صلاحية لرفض هذا الطلب', 403);
    }

    if (!reason) {
        throw CustomException('سبب الرفض مطلوب', 400);
    }

    const rejected = await ApprovalRequest.reject(id, userId, reason);

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

    // Verify request belongs to this firm
    const request = await ApprovalRequest.findOne({ _id: id, firmId });
    if (!request) {
        throw CustomException('طلب الموافقة غير موجود', 404);
    }

    const cancelled = await ApprovalRequest.cancel(id, userId);

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
    const { module, action, context } = req.body;

    if (!firmId) {
        return res.json({
            success: true,
            requiresApproval: false
        });
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
