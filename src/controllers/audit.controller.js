/**
 * Audit Controller - Activity Log & Compliance API
 *
 * Provides endpoints for:
 * - Firm-wide audit log
 * - Audit log filtering and search
 * - Export for compliance
 * - Activity statistics
 */

const { TeamActivityLog, AuditLog } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// ═══════════════════════════════════════════════════════════════
// SECURITY HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Validate and sanitize audit query parameters
 * Prevents injection attacks and ensures valid input
 */
const validateAuditQueryParams = (query) => {
    const allowedActions = [
        'create', 'read', 'update', 'delete', 'invite', 'accept_invite',
        'revoke_invite', 'suspend', 'activate', 'depart', 'update_permissions',
        'update_role', 'approve', 'reject', 'export', 'login', 'logout'
    ];

    const allowedTargetTypes = [
        'case', 'client', 'invoice', 'document', 'task', 'staff',
        'setting', 'payment', 'expense', 'report', 'audit_log'
    ];

    const allowedStatuses = ['success', 'failed', 'pending'];

    const allowedSortFields = ['timestamp', 'action', 'targetType', 'status', 'userId'];

    const allowedSortOrders = ['asc', 'desc'];

    const allowedFormats = ['json', 'csv'];

    // Sanitize and validate
    const validated = {};

    // Page & Limit (positive integers)
    if (query.page) {
        const page = parseInt(query.page, 10);
        validated.page = (page > 0) ? page : 1;
    }

    if (query.limit) {
        const limit = parseInt(query.limit, 10);
        validated.limit = (limit > 0 && limit <= 100) ? limit : 50;
    }

    // Action (enum validation)
    if (query.action && allowedActions.includes(query.action)) {
        validated.action = query.action;
    }

    // Target Type (enum validation)
    if (query.targetType && allowedTargetTypes.includes(query.targetType)) {
        validated.targetType = query.targetType;
    }

    // Status (enum validation)
    if (query.status && allowedStatuses.includes(query.status)) {
        validated.status = query.status;
    }

    // UserId (ObjectId validation)
    if (query.userId) {
        const sanitizedUserId = sanitizeObjectId(query.userId);
        if (sanitizedUserId) {
            validated.userId = sanitizedUserId;
        }
    }

    // Date validation (ISO 8601 format)
    if (query.startDate) {
        const date = new Date(query.startDate);
        if (!isNaN(date.getTime())) {
            validated.startDate = date.toISOString();
        }
    }

    if (query.endDate) {
        const date = new Date(query.endDate);
        if (!isNaN(date.getTime())) {
            validated.endDate = date.toISOString();
        }
    }

    // Sort field validation
    if (query.sortBy && allowedSortFields.includes(query.sortBy)) {
        validated.sortBy = query.sortBy;
    }

    // Sort order validation
    if (query.sortOrder && allowedSortOrders.includes(query.sortOrder)) {
        validated.sortOrder = query.sortOrder;
    }

    // Days (positive integer, max 365)
    if (query.days) {
        const days = parseInt(query.days, 10);
        validated.days = (days > 0 && days <= 365) ? days : 30;
    }

    // Format validation
    if (query.format && allowedFormats.includes(query.format)) {
        validated.format = query.format;
    }

    return validated;
};

/**
 * Verify firmId ownership - IDOR Protection
 * Ensures the user actually belongs to the firm they're accessing
 */
const verifyFirmOwnership = async (req) => {
    const { FirmMember } = require('../models');

    if (!req.firmId || !req.userID) {
        throw CustomException('معرف المكتب أو المستخدم غير صالح', 400);
    }

    // Verify that the user is actually a member of this firm
    const membership = await FirmMember.findOne({
        firmId: req.firmId,
        userId: req.userID,
        isDeparted: false
    });

    if (!membership) {
        throw CustomException('ليس لديك صلاحية للوصول إلى هذا المكتب', 403);
    }

    return membership;
};

// ═══════════════════════════════════════════════════════════════
// AUDIT LOG ENDPOINTS (READ-ONLY)
// ═══════════════════════════════════════════════════════════════

/**
 * Get firm-wide audit log
 * GET /api/audit
 * READ-ONLY: Audit logs cannot be modified or deleted
 */
const getAuditLog = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // IDOR Protection: Verify user actually belongs to this firm
    await verifyFirmOwnership(req);

    // Only admin/owner can view full audit log
    if (!['owner', 'admin'].includes(req.firmRole) && !req.hasPermission('reports', 'view')) {
        throw CustomException('ليس لديك صلاحية لعرض سجل المراجعة', 403);
    }

    // Input validation: Sanitize and validate all query parameters
    const validatedParams = validateAuditQueryParams(req.query);

    const result = await TeamActivityLog.getAuditLog(firmId, {
        page: validatedParams.page || 1,
        limit: validatedParams.limit || 50,
        action: validatedParams.action,
        targetType: validatedParams.targetType,
        userId: validatedParams.userId,
        startDate: validatedParams.startDate,
        endDate: validatedParams.endDate,
        status: validatedParams.status,
        sortBy: validatedParams.sortBy || 'timestamp',
        sortOrder: validatedParams.sortOrder || 'desc'
    });

    res.json({
        success: true,
        data: result.logs,
        pagination: result.pagination
    });
});

/**
 * Export audit log for compliance
 * GET /api/audit/export
 * READ-ONLY: Audit logs cannot be modified or deleted
 */
const exportAuditLog = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // IDOR Protection: Verify user actually belongs to this firm
    await verifyFirmOwnership(req);

    // Only admin/owner with export permission
    if (!['owner', 'admin'].includes(req.firmRole) && !req.hasSpecialPermission('canExportData')) {
        throw CustomException('ليس لديك صلاحية لتصدير البيانات', 403);
    }

    // Input validation: Sanitize and validate all query parameters
    const validatedParams = validateAuditQueryParams(req.query);

    const { startDate, endDate, action, targetType, format = 'json' } = validatedParams;

    const logs = await TeamActivityLog.exportAuditLog(firmId, {
        startDate,
        endDate,
        action,
        targetType
    });

    // Log this export action
    await TeamActivityLog.log({
        firmId,
        userId: req.userID,
        action: 'export',
        targetType: 'audit_log',
        details: {
            recordCount: logs.length,
            filters: { startDate, endDate, action, targetType }
        },
        timestamp: new Date()
    });

    if (format === 'csv') {
        // Convert to CSV format
        const headers = [
            'Timestamp',
            'User',
            'Action',
            'Target Type',
            'Target Name',
            'Status',
            'IP Address',
            'Details'
        ];

        const csvRows = logs.map(log => [
            log.timestamp?.toISOString() || '',
            log.userName || log.userEmail || '',
            log.action || '',
            log.targetType || '',
            log.targetName || '',
            log.status || '',
            log.ipAddress || '',
            JSON.stringify(log.details || {}).replace(/"/g, '""')
        ]);

        const csv = [
            headers.join(','),
            ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=audit-log-${new Date().toISOString().split('T')[0]}.csv`);
        return res.send(csv);
    }

    res.json({
        success: true,
        data: logs,
        meta: {
            recordCount: logs.length,
            exportedAt: new Date().toISOString(),
            filters: { startDate, endDate, action, targetType }
        }
    });
});

/**
 * Get audit log statistics
 * GET /api/audit/stats
 * READ-ONLY: Audit logs cannot be modified or deleted
 */
const getAuditStats = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // IDOR Protection: Verify user actually belongs to this firm
    await verifyFirmOwnership(req);

    // Input validation: Sanitize and validate all query parameters
    const validatedParams = validateAuditQueryParams(req.query);

    const stats = await TeamActivityLog.getStats(firmId, { days: validatedParams.days || 30 });

    res.json({
        success: true,
        stats
    });
});

/**
 * Get available audit log filter options
 * GET /api/audit/options
 */
const getAuditOptions = asyncHandler(async (req, res) => {
    res.json({
        success: true,
        data: {
            actions: [
                { value: 'create', label: 'إنشاء', labelEn: 'Create' },
                { value: 'read', label: 'قراءة', labelEn: 'Read' },
                { value: 'update', label: 'تحديث', labelEn: 'Update' },
                { value: 'delete', label: 'حذف', labelEn: 'Delete' },
                { value: 'invite', label: 'دعوة', labelEn: 'Invite' },
                { value: 'accept_invite', label: 'قبول دعوة', labelEn: 'Accept Invite' },
                { value: 'revoke_invite', label: 'إلغاء دعوة', labelEn: 'Revoke Invite' },
                { value: 'suspend', label: 'تعليق', labelEn: 'Suspend' },
                { value: 'activate', label: 'تفعيل', labelEn: 'Activate' },
                { value: 'depart', label: 'مغادرة', labelEn: 'Depart' },
                { value: 'update_permissions', label: 'تحديث الصلاحيات', labelEn: 'Update Permissions' },
                { value: 'update_role', label: 'تغيير الدور', labelEn: 'Change Role' },
                { value: 'approve', label: 'موافقة', labelEn: 'Approve' },
                { value: 'reject', label: 'رفض', labelEn: 'Reject' },
                { value: 'export', label: 'تصدير', labelEn: 'Export' },
                { value: 'login', label: 'تسجيل دخول', labelEn: 'Login' },
                { value: 'logout', label: 'تسجيل خروج', labelEn: 'Logout' }
            ],
            targetTypes: [
                { value: 'case', label: 'قضية', labelEn: 'Case' },
                { value: 'client', label: 'عميل', labelEn: 'Client' },
                { value: 'invoice', label: 'فاتورة', labelEn: 'Invoice' },
                { value: 'document', label: 'مستند', labelEn: 'Document' },
                { value: 'task', label: 'مهمة', labelEn: 'Task' },
                { value: 'staff', label: 'عضو فريق', labelEn: 'Staff' },
                { value: 'setting', label: 'إعداد', labelEn: 'Setting' },
                { value: 'payment', label: 'دفعة', labelEn: 'Payment' },
                { value: 'expense', label: 'مصروف', labelEn: 'Expense' },
                { value: 'report', label: 'تقرير', labelEn: 'Report' }
            ],
            statuses: [
                { value: 'success', label: 'ناجح', labelEn: 'Success' },
                { value: 'failed', label: 'فشل', labelEn: 'Failed' },
                { value: 'pending', label: 'معلق', labelEn: 'Pending' }
            ]
        }
    });
});

/**
 * Get user-specific activity log
 * GET /api/audit/user/:userId
 * READ-ONLY: Audit logs cannot be modified or deleted
 */
const getUserAuditLog = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const { userId } = req.params;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // IDOR Protection: Verify user actually belongs to this firm
    await verifyFirmOwnership(req);

    // Sanitize userId parameter
    const sanitizedUserId = sanitizeObjectId(userId);
    if (!sanitizedUserId) {
        throw CustomException('معرف المستخدم غير صالح', 400);
    }

    // Users can view their own activity, admins can view anyone's
    if (sanitizedUserId !== req.userID.toString() && !['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لعرض هذا السجل', 403);
    }

    // Additional IDOR check: Verify the target user belongs to the same firm
    const { FirmMember } = require('../models');
    const targetUserMembership = await FirmMember.findOne({
        firmId: firmId,
        userId: sanitizedUserId,
        isDeparted: false
    });

    if (!targetUserMembership) {
        throw CustomException('المستخدم المطلوب ليس عضواً في هذا المكتب', 404);
    }

    // Input validation: Sanitize and validate all query parameters
    const validatedParams = validateAuditQueryParams(req.query);

    const logs = await TeamActivityLog.getUserActivity(firmId, sanitizedUserId, {
        limit: validatedParams.limit || 50,
        skip: ((validatedParams.page || 1) - 1) * (validatedParams.limit || 50),
        action: validatedParams.action,
        startDate: validatedParams.startDate,
        endDate: validatedParams.endDate
    });

    res.json({
        success: true,
        data: logs
    });
});

module.exports = {
    getAuditLog,
    exportAuditLog,
    getAuditStats,
    getAuditOptions,
    getUserAuditLog
};
