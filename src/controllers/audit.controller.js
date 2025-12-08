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

// ═══════════════════════════════════════════════════════════════
// AUDIT LOG ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get firm-wide audit log
 * GET /api/audit
 */
const getAuditLog = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Only admin/owner can view full audit log
    if (!['owner', 'admin'].includes(req.firmRole) && !req.hasPermission('reports', 'view')) {
        throw CustomException('ليس لديك صلاحية لعرض سجل المراجعة', 403);
    }

    const {
        page = 1,
        limit = 50,
        action,
        targetType,
        userId,
        startDate,
        endDate,
        status,
        sortBy = 'timestamp',
        sortOrder = 'desc'
    } = req.query;

    const result = await TeamActivityLog.getAuditLog(firmId, {
        page: parseInt(page) || 1,
        limit: Math.min(parseInt(limit) || 50, 100),
        action,
        targetType,
        userId,
        startDate,
        endDate,
        status,
        sortBy,
        sortOrder
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
 */
const exportAuditLog = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Only admin/owner with export permission
    if (!['owner', 'admin'].includes(req.firmRole) && !req.hasSpecialPermission('canExportData')) {
        throw CustomException('ليس لديك صلاحية لتصدير البيانات', 403);
    }

    const { startDate, endDate, action, targetType, format = 'json' } = req.query;

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
 */
const getAuditStats = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    const { days = 30 } = req.query;

    const stats = await TeamActivityLog.getStats(firmId, { days: parseInt(days) || 30 });

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

    // Users can view their own activity, admins can view anyone's
    if (userId !== req.userID.toString() && !['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لعرض هذا السجل', 403);
    }

    const { page = 1, limit = 50, action, startDate, endDate } = req.query;

    const logs = await TeamActivityLog.getUserActivity(firmId, userId, {
        limit: Math.min(parseInt(limit) || 50, 100),
        skip: ((parseInt(page) || 1) - 1) * (parseInt(limit) || 50),
        action,
        startDate,
        endDate
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
