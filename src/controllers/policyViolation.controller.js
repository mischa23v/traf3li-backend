/**
 * Policy Violation Controller - Policy Enforcement and Violation Management
 *
 * This controller manages policy violations across the system with:
 * - Comprehensive violation tracking and filtering
 * - Multi-level violation resolution workflow
 * - Override request and approval system
 * - Escalation mechanisms
 * - Dashboard analytics and reporting
 * - Bulk operations for efficiency
 *
 * Integrates with the policy enforcement service for centralized violation management.
 */

const { TeamActivityLog } = require('../models');
const PolicyEnforcementService = require('../services/policyEnforcement.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// ═══════════════════════════════════════════════════════════════
// POLICY VIOLATION LISTING AND DETAILS
// ═══════════════════════════════════════════════════════════════

/**
 * List policy violations with filters
 * GET /api/policy-violations
 */
const listViolations = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Mass assignment protection
    const filters = pickAllowedFields(req.query, [
        'status',
        'severity',
        'entityType',
        'entityId',
        'policyType',
        'startDate',
        'endDate',
        'assignedTo',
        'createdBy',
        'page',
        'limit',
        'sortBy',
        'sortOrder'
    ]);

    // Validate and sanitize pagination
    const page = Math.max(parseInt(filters.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(filters.limit) || 50, 1), 100);
    const skip = (page - 1) * limit;

    // Validate status filter
    if (filters.status) {
        const validStatuses = ['open', 'acknowledged', 'pending_override', 'override_approved',
                               'override_rejected', 'resolved', 'escalated', 'closed'];
        if (!validStatuses.includes(filters.status)) {
            throw CustomException('حالة غير صالحة', 400);
        }
    }

    // Validate severity filter
    if (filters.severity) {
        const validSeverities = ['low', 'medium', 'high', 'critical'];
        if (!validSeverities.includes(filters.severity)) {
            throw CustomException('مستوى خطورة غير صالح', 400);
        }
    }

    // Sanitize ID filters
    if (filters.entityId) {
        filters.entityId = sanitizeObjectId(filters.entityId);
        if (!filters.entityId) {
            throw CustomException('معرف الكيان غير صالح', 400);
        }
    }

    if (filters.assignedTo) {
        filters.assignedTo = sanitizeObjectId(filters.assignedTo);
        if (!filters.assignedTo) {
            throw CustomException('معرف المستخدم المعين غير صالح', 400);
        }
    }

    if (filters.createdBy) {
        filters.createdBy = sanitizeObjectId(filters.createdBy);
        if (!filters.createdBy) {
            throw CustomException('معرف منشئ الانتهاك غير صالح', 400);
        }
    }

    // Use PolicyEnforcementService to get violations
    const result = await PolicyEnforcementService.listViolations(firmId, {
        ...filters,
        skip,
        limit,
        sortBy: filters.sortBy || 'createdAt',
        sortOrder: filters.sortOrder || 'desc'
    });

    res.json({
        success: true,
        data: result.violations,
        pagination: {
            total: result.total,
            page,
            limit,
            pages: Math.ceil(result.total / limit)
        }
    });
});

/**
 * Get single violation with full details
 * GET /api/policy-violations/:id
 */
const getViolation = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Sanitize and verify violation ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف الانتهاك غير صالح', 400);
    }

    // IDOR protection - verify firmId
    const violation = await PolicyEnforcementService.getViolationById(sanitizedId, firmId);

    if (!violation) {
        throw CustomException('الانتهاك غير موجود', 404);
    }

    res.json({
        success: true,
        data: violation
    });
});

/**
 * Get violations for specific entity
 * GET /api/policy-violations/entity/:entityType/:entityId
 */
const getViolationsForEntity = asyncHandler(async (req, res) => {
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
        'expense', 'invoice', 'payment', 'refund', 'credit_note', 'debit_note',
        'purchase_order', 'bill', 'quote', 'contract', 'deal', 'leave_request',
        'time_off', 'reimbursement', 'advance', 'loan', 'asset', 'transfer'
    ];

    if (!validEntityTypes.includes(entityType)) {
        throw CustomException('نوع الكيان غير صالح', 400);
    }

    // Sanitize entityId
    const sanitizedEntityId = sanitizeObjectId(entityId);
    if (!sanitizedEntityId) {
        throw CustomException('معرف الكيان غير صالح', 400);
    }

    // Mass assignment protection for query params
    const { status, severity, page = 1, limit = 50 } = pickAllowedFields(req.query, [
        'status',
        'severity',
        'page',
        'limit'
    ]);

    // Validate and sanitize pagination
    const sanitizedPage = Math.max(parseInt(page) || 1, 1);
    const sanitizedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    // Get violations for entity
    const result = await PolicyEnforcementService.getViolationsForEntity(
        firmId,
        entityType,
        sanitizedEntityId,
        {
            status,
            severity,
            skip,
            limit: sanitizedLimit
        }
    );

    res.json({
        success: true,
        data: result.violations,
        pagination: {
            total: result.total,
            page: sanitizedPage,
            limit: sanitizedLimit,
            pages: Math.ceil(result.total / sanitizedLimit)
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// VIOLATION WORKFLOW ACTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Acknowledge a violation
 * POST /api/policy-violations/:id/acknowledge
 */
const acknowledgeViolation = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Sanitize violation ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف الانتهاك غير صالح', 400);
    }

    // Mass assignment protection
    const { notes } = pickAllowedFields(req.body, ['notes']);

    // Acknowledge the violation
    const violation = await PolicyEnforcementService.acknowledgeViolation(
        sanitizedId,
        firmId,
        userId,
        {
            notes: notes || '',
            ipAddress: req.ip || req.connection?.remoteAddress || 'unknown'
        }
    );

    if (!violation) {
        throw CustomException('فشل في الاعتراف بالانتهاك', 500);
    }

    // Log activity
    await TeamActivityLog.log({
        firmId,
        userId,
        action: 'acknowledge',
        targetType: 'policy_violation',
        targetId: violation._id,
        details: {
            entityType: violation.entityType,
            entityId: violation.entityId,
            policyType: violation.policyType,
            severity: violation.severity
        },
        timestamp: new Date()
    });

    res.json({
        success: true,
        message: 'تم الاعتراف بالانتهاك بنجاح',
        data: violation
    });
});

/**
 * Request override for a violation
 * POST /api/policy-violations/:id/request-override
 */
const requestOverride = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Sanitize violation ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف الانتهاك غير صالح', 400);
    }

    // Mass assignment protection
    const { reason, justification, attachments } = pickAllowedFields(req.body, [
        'reason',
        'justification',
        'attachments'
    ]);

    // Validate required fields
    if (!reason || !justification) {
        throw CustomException('السبب والمبرر مطلوبان لطلب التجاوز', 400);
    }

    if (justification.length < 20) {
        throw CustomException('يجب أن يكون المبرر 20 حرفاً على الأقل', 400);
    }

    // Request override
    const violation = await PolicyEnforcementService.requestOverride(
        sanitizedId,
        firmId,
        userId,
        {
            reason,
            justification,
            attachments: attachments || [],
            ipAddress: req.ip || req.connection?.remoteAddress || 'unknown'
        }
    );

    if (!violation) {
        throw CustomException('فشل في طلب التجاوز', 500);
    }

    // Log activity
    await TeamActivityLog.log({
        firmId,
        userId,
        action: 'request_override',
        targetType: 'policy_violation',
        targetId: violation._id,
        details: {
            entityType: violation.entityType,
            entityId: violation.entityId,
            policyType: violation.policyType,
            severity: violation.severity,
            reason
        },
        timestamp: new Date()
    });

    res.json({
        success: true,
        message: 'تم إرسال طلب التجاوز بنجاح',
        data: violation
    });
});

/**
 * Approve override request (requires approver role)
 * POST /api/policy-violations/:id/approve-override
 */
const approveOverride = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Only owner/admin can approve overrides
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('فقط مالك أو مدير المكتب يمكنه الموافقة على التجاوزات', 403);
    }

    // Sanitize violation ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف الانتهاك غير صالح', 400);
    }

    // Mass assignment protection
    const { comments, conditions } = pickAllowedFields(req.body, ['comments', 'conditions']);

    // Approve override
    const violation = await PolicyEnforcementService.approveOverride(
        sanitizedId,
        firmId,
        userId,
        {
            comments: comments || '',
            conditions: conditions || [],
            ipAddress: req.ip || req.connection?.remoteAddress || 'unknown'
        }
    );

    if (!violation) {
        throw CustomException('فشل في الموافقة على التجاوز', 500);
    }

    // Log activity
    await TeamActivityLog.log({
        firmId,
        userId,
        action: 'approve_override',
        targetType: 'policy_violation',
        targetId: violation._id,
        details: {
            entityType: violation.entityType,
            entityId: violation.entityId,
            policyType: violation.policyType,
            severity: violation.severity
        },
        timestamp: new Date()
    });

    res.json({
        success: true,
        message: 'تمت الموافقة على التجاوز بنجاح',
        data: violation
    });
});

/**
 * Reject override request
 * POST /api/policy-violations/:id/reject-override
 */
const rejectOverride = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Only owner/admin can reject overrides
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('فقط مالك أو مدير المكتب يمكنه رفض التجاوزات', 403);
    }

    // Sanitize violation ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف الانتهاك غير صالح', 400);
    }

    // Mass assignment protection
    const { reason } = pickAllowedFields(req.body, ['reason']);

    // Validate required fields
    if (!reason) {
        throw CustomException('سبب الرفض مطلوب', 400);
    }

    if (reason.length < 10) {
        throw CustomException('يجب أن يكون سبب الرفض 10 أحرف على الأقل', 400);
    }

    // Reject override
    const violation = await PolicyEnforcementService.rejectOverride(
        sanitizedId,
        firmId,
        userId,
        {
            reason,
            ipAddress: req.ip || req.connection?.remoteAddress || 'unknown'
        }
    );

    if (!violation) {
        throw CustomException('فشل في رفض التجاوز', 500);
    }

    // Log activity
    await TeamActivityLog.log({
        firmId,
        userId,
        action: 'reject_override',
        targetType: 'policy_violation',
        targetId: violation._id,
        details: {
            entityType: violation.entityType,
            entityId: violation.entityId,
            policyType: violation.policyType,
            severity: violation.severity,
            reason
        },
        timestamp: new Date()
    });

    res.json({
        success: true,
        message: 'تم رفض طلب التجاوز',
        data: violation
    });
});

/**
 * Resolve a violation
 * POST /api/policy-violations/:id/resolve
 */
const resolveViolation = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Sanitize violation ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف الانتهاك غير صالح', 400);
    }

    // Mass assignment protection
    const { resolution, resolutionNotes, actionsTaken } = pickAllowedFields(req.body, [
        'resolution',
        'resolutionNotes',
        'actionsTaken'
    ]);

    // Validate required fields
    if (!resolution || !resolutionNotes) {
        throw CustomException('الحل والملاحظات مطلوبة', 400);
    }

    if (resolutionNotes.length < 10) {
        throw CustomException('يجب أن تكون ملاحظات الحل 10 أحرف على الأقل', 400);
    }

    // Resolve violation
    const violation = await PolicyEnforcementService.resolveViolation(
        sanitizedId,
        firmId,
        userId,
        {
            resolution,
            resolutionNotes,
            actionsTaken: actionsTaken || [],
            ipAddress: req.ip || req.connection?.remoteAddress || 'unknown'
        }
    );

    if (!violation) {
        throw CustomException('فشل في حل الانتهاك', 500);
    }

    // Log activity
    await TeamActivityLog.log({
        firmId,
        userId,
        action: 'resolve',
        targetType: 'policy_violation',
        targetId: violation._id,
        details: {
            entityType: violation.entityType,
            entityId: violation.entityId,
            policyType: violation.policyType,
            severity: violation.severity,
            resolution
        },
        timestamp: new Date()
    });

    res.json({
        success: true,
        message: 'تم حل الانتهاك بنجاح',
        data: violation
    });
});

/**
 * Escalate violation to manager
 * POST /api/policy-violations/:id/escalate
 */
const escalateViolation = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Sanitize violation ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف الانتهاك غير صالح', 400);
    }

    // Mass assignment protection
    const { escalateTo, reason, priority } = pickAllowedFields(req.body, [
        'escalateTo',
        'reason',
        'priority'
    ]);

    // Validate required fields
    if (!reason) {
        throw CustomException('سبب التصعيد مطلوب', 400);
    }

    if (reason.length < 10) {
        throw CustomException('يجب أن يكون سبب التصعيد 10 أحرف على الأقل', 400);
    }

    // Sanitize escalateTo if provided
    let sanitizedEscalateTo = null;
    if (escalateTo) {
        sanitizedEscalateTo = sanitizeObjectId(escalateTo);
        if (!sanitizedEscalateTo) {
            throw CustomException('معرف المستخدم المصعد إليه غير صالح', 400);
        }
    }

    // Escalate violation
    const violation = await PolicyEnforcementService.escalateViolation(
        sanitizedId,
        firmId,
        userId,
        {
            escalateTo: sanitizedEscalateTo,
            reason,
            priority: priority || 'high',
            ipAddress: req.ip || req.connection?.remoteAddress || 'unknown'
        }
    );

    if (!violation) {
        throw CustomException('فشل في تصعيد الانتهاك', 500);
    }

    // Log activity
    await TeamActivityLog.log({
        firmId,
        userId,
        action: 'escalate',
        targetType: 'policy_violation',
        targetId: violation._id,
        details: {
            entityType: violation.entityType,
            entityId: violation.entityId,
            policyType: violation.policyType,
            severity: violation.severity,
            escalatedTo: sanitizedEscalateTo,
            reason
        },
        timestamp: new Date()
    });

    res.json({
        success: true,
        message: 'تم تصعيد الانتهاك بنجاح',
        data: violation
    });
});

// ═══════════════════════════════════════════════════════════════
// ANALYTICS AND REPORTING
// ═══════════════════════════════════════════════════════════════

/**
 * Get dashboard statistics
 * GET /api/policy-violations/dashboard
 */
const getDashboardStats = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Mass assignment protection
    const { startDate, endDate } = pickAllowedFields(req.query, ['startDate', 'endDate']);

    // Get dashboard stats
    const stats = await PolicyEnforcementService.getDashboardStats(firmId, {
        startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: endDate ? new Date(endDate) : new Date()
    });

    res.json({
        success: true,
        data: stats
    });
});

/**
 * Generate violation report
 * GET /api/policy-violations/report
 */
const generateReport = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Only owner/admin can generate reports
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('فقط مالك أو مدير المكتب يمكنه إنشاء التقارير', 403);
    }

    // Mass assignment protection
    const filters = pickAllowedFields(req.query, [
        'startDate',
        'endDate',
        'status',
        'severity',
        'entityType',
        'policyType',
        'groupBy',
        'format'
    ]);

    // Validate format
    const format = filters.format || 'json';
    if (!['json', 'csv', 'pdf'].includes(format)) {
        throw CustomException('صيغة التقرير غير صالحة', 400);
    }

    // Generate report
    const report = await PolicyEnforcementService.generateReport(firmId, {
        startDate: filters.startDate ? new Date(filters.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: filters.endDate ? new Date(filters.endDate) : new Date(),
        status: filters.status,
        severity: filters.severity,
        entityType: filters.entityType,
        policyType: filters.policyType,
        groupBy: filters.groupBy || 'severity',
        format
    });

    // Set appropriate content type based on format
    if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="violations-report-${Date.now()}.csv"`);
    } else if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="violations-report-${Date.now()}.pdf"`);
    }

    res.json({
        success: true,
        data: report
    });
});

// ═══════════════════════════════════════════════════════════════
// BULK OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Bulk acknowledge violations
 * POST /api/policy-violations/bulk-acknowledge
 */
const bulkAcknowledge = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Mass assignment protection
    const { violationIds, notes } = pickAllowedFields(req.body, ['violationIds', 'notes']);

    // Validate required fields
    if (!violationIds || !Array.isArray(violationIds) || violationIds.length === 0) {
        throw CustomException('يجب تحديد انتهاك واحد على الأقل', 400);
    }

    // Limit bulk operations to 100 violations at a time
    if (violationIds.length > 100) {
        throw CustomException('لا يمكن معالجة أكثر من 100 انتهاك في وقت واحد', 400);
    }

    // Sanitize all violation IDs
    const sanitizedIds = violationIds.map(id => sanitizeObjectId(id)).filter(Boolean);

    if (sanitizedIds.length !== violationIds.length) {
        throw CustomException('بعض معرفات الانتهاكات غير صالحة', 400);
    }

    // Bulk acknowledge violations
    const result = await PolicyEnforcementService.bulkAcknowledge(
        sanitizedIds,
        firmId,
        userId,
        {
            notes: notes || '',
            ipAddress: req.ip || req.connection?.remoteAddress || 'unknown'
        }
    );

    // Log activity
    await TeamActivityLog.log({
        firmId,
        userId,
        action: 'bulk_acknowledge',
        targetType: 'policy_violation',
        details: {
            count: result.acknowledged,
            failed: result.failed,
            violationIds: sanitizedIds
        },
        timestamp: new Date()
    });

    res.json({
        success: true,
        message: `تم الاعتراف بـ ${result.acknowledged} انتهاك بنجاح`,
        data: {
            acknowledged: result.acknowledged,
            failed: result.failed,
            errors: result.errors || []
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // Listing and details
    listViolations,
    getViolation,
    getViolationsForEntity,

    // Workflow actions
    acknowledgeViolation,
    requestOverride,
    approveOverride,
    rejectOverride,
    resolveViolation,
    escalateViolation,

    // Analytics and reporting
    getDashboardStats,
    generateReport,

    // Bulk operations
    bulkAcknowledge
};
