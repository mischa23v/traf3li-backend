const TimeEntry = require('../models/timeEntry.model');
const QueueService = require('../services/queue.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

/**
 * Submit time entry for approval
 * POST /api/time-entries/:id/submit
 */
const submitTimeEntry = asyncHandler(async (req, res) => {
    // IDOR Protection: Sanitize ID
    const entryId = sanitizeObjectId(req.params.id, 'Time entry ID');

    // Mass Assignment Protection
    const allowedFields = ['managerId'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Input Validation: Validate managerId if provided
    let managerId = sanitizedData.managerId;
    if (managerId) {
        managerId = sanitizeObjectId(managerId, 'Manager ID');
    }

    const entry = await TimeEntry.findOne({
        _id: entryId,
        firmId: req.firmId
    });

    if (!entry) {
        throw new CustomException(
            'Time entry not found',
            'إدخال الوقت غير موجود',
            404
        );
    }

    // Only creator can submit their own entries
    if (!entry.assigneeId.equals(req.userID) && !entry.userId?.equals(req.userID)) {
        throw new CustomException(
            'You can only submit your own time entries',
            'يمكنك فقط تقديم إدخالات الوقت الخاصة بك',
            403
        );
    }

    await entry.submit(req.userID, managerId);

    // Notify manager
    if (managerId || entry.assignedManager) {
        QueueService.createNotification({
            firmId: req.firmId,
            userId: managerId || entry.assignedManager,
            type: 'time_entry_submitted',
            title: 'Time Entry Pending Approval',
            titleAr: 'إدخال وقت ينتظر الموافقة',
            message: `Time entry submitted for approval: ${entry.description || entry.entryId}`,
            messageAr: `تم تقديم إدخال الوقت للموافقة: ${entry.description || entry.entryId}`,
            entityType: 'time_entry',
            entityId: entry._id,
            link: `/time-entries/${entry._id}`,
            actionRequired: true
        });
    }

    res.status(200).json({
        success: true,
        message: 'Time entry submitted for approval',
        messageAr: 'تم تقديم إدخال الوقت للموافقة',
        data: entry
    });
});

/**
 * Approve time entry
 * POST /api/time-entries/:id/approve
 */
const approveTimeEntry = asyncHandler(async (req, res) => {
    // IDOR Protection: Sanitize ID
    const entryId = sanitizeObjectId(req.params.id, 'Time entry ID');

    const entry = await TimeEntry.findOne({
        _id: entryId,
        firmId: req.firmId
    });

    if (!entry) {
        throw new CustomException(
            'Time entry not found',
            'إدخال الوقت غير موجود',
            404
        );
    }

    // Input Validation: Verify status
    if (entry.status !== 'submitted') {
        throw new CustomException(
            'Only submitted entries can be approved',
            'يمكن الموافقة فقط على الإدخالات المقدمة',
            400
        );
    }

    // Authorization: Verify approver has permission (manager or assigned manager)
    const isAssignedManager = entry.assignedManager && entry.assignedManager.equals(req.userID);
    const isAdmin = req.role === 'admin' || req.role === 'super_admin';

    if (!isAssignedManager && !isAdmin) {
        throw new CustomException(
            'You do not have permission to approve this time entry',
            'ليس لديك إذن للموافقة على إدخال الوقت هذا',
            403
        );
    }

    await entry.approve(req.userID);

    // Notify creator
    QueueService.createNotification({
        firmId: req.firmId,
        userId: entry.assigneeId || entry.userId,
        type: 'time_entry_approved',
        title: 'Time Entry Approved',
        titleAr: 'تمت الموافقة على إدخال الوقت',
        message: `Your time entry has been approved: ${entry.description || entry.entryId}`,
        messageAr: `تمت الموافقة على إدخال الوقت الخاص بك: ${entry.description || entry.entryId}`,
        entityType: 'time_entry',
        entityId: entry._id,
        link: `/time-entries/${entry._id}`
    });

    res.status(200).json({
        success: true,
        message: 'Time entry approved',
        messageAr: 'تمت الموافقة على إدخال الوقت',
        data: entry
    });
});

/**
 * Reject time entry
 * POST /api/time-entries/:id/reject
 */
const rejectTimeEntry = asyncHandler(async (req, res) => {
    // IDOR Protection: Sanitize ID
    const entryId = sanitizeObjectId(req.params.id, 'Time entry ID');

    // Mass Assignment Protection
    const allowedFields = ['reason'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Input Validation: Validate reason
    const { reason } = sanitizedData;
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        throw new CustomException(
            'Rejection reason is required',
            'سبب الرفض مطلوب',
            400
        );
    }

    if (reason.length > 1000) {
        throw new CustomException(
            'Rejection reason is too long (max 1000 characters)',
            'سبب الرفض طويل جدًا (الحد الأقصى 1000 حرف)',
            400
        );
    }

    const entry = await TimeEntry.findOne({
        _id: entryId,
        firmId: req.firmId
    });

    if (!entry) {
        throw new CustomException(
            'Time entry not found',
            'إدخال الوقت غير موجود',
            404
        );
    }

    // Input Validation: Verify status
    if (entry.status !== 'submitted') {
        throw new CustomException(
            'Only submitted entries can be rejected',
            'يمكن رفض الإدخالات المقدمة فقط',
            400
        );
    }

    // Authorization: Verify approver has permission (manager or assigned manager)
    const isAssignedManager = entry.assignedManager && entry.assignedManager.equals(req.userID);
    const isAdmin = req.role === 'admin' || req.role === 'super_admin';

    if (!isAssignedManager && !isAdmin) {
        throw new CustomException(
            'You do not have permission to reject this time entry',
            'ليس لديك إذن لرفض إدخال الوقت هذا',
            403
        );
    }

    await entry.reject(reason.trim(), req.userID);

    // Notify creator
    QueueService.createNotification({
        firmId: req.firmId,
        userId: entry.assigneeId || entry.userId,
        type: 'time_entry_rejected',
        title: 'Time Entry Rejected',
        titleAr: 'تم رفض إدخال الوقت',
        message: `Your time entry was rejected: ${reason}`,
        messageAr: `تم رفض إدخال الوقت الخاص بك: ${reason}`,
        entityType: 'time_entry',
        entityId: entry._id,
        link: `/time-entries/${entry._id}`,
        priority: 'high'
    });

    res.status(200).json({
        success: true,
        message: 'Time entry rejected',
        messageAr: 'تم رفض إدخال الوقت',
        data: entry
    });
});

/**
 * Bulk approve time entries
 * POST /api/time-entries/bulk-approve
 */
const bulkApproveTimeEntries = asyncHandler(async (req, res) => {
    // Mass Assignment Protection
    const allowedFields = ['ids'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Input Validation: Validate ids array
    const { ids } = sanitizedData;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new CustomException(
            'Entry IDs are required',
            'معرفات الإدخالات مطلوبة',
            400
        );
    }

    if (ids.length > 100) {
        throw new CustomException(
            'Cannot approve more than 100 entries at once',
            'لا يمكن الموافقة على أكثر من 100 إدخال في وقت واحد',
            400
        );
    }

    // IDOR Protection: Sanitize all IDs
    const sanitizedIds = ids.map((id, index) =>
        sanitizeObjectId(id, `Entry ID at index ${index}`)
    );

    // Verify all entries belong to the same firm
    const entries = await TimeEntry.find({
        _id: { $in: sanitizedIds },
        firmId: req.firmId
    });

    if (entries.length !== sanitizedIds.length) {
        throw new CustomException(
            'Some time entries were not found or do not belong to your firm',
            'لم يتم العثور على بعض إدخالات الوقت أو لا تنتمي إلى شركتك',
            404
        );
    }

    // Authorization: Verify user has permission to approve
    const isAdmin = req.role === 'admin' || req.role === 'super_admin';

    // Check if user is assigned manager for all entries
    const unauthorizedEntries = entries.filter(entry => {
        const isAssignedManager = entry.assignedManager && entry.assignedManager.equals(req.userID);
        return !isAssignedManager && !isAdmin;
    });

    if (unauthorizedEntries.length > 0) {
        throw new CustomException(
            'You do not have permission to approve some of these time entries',
            'ليس لديك إذن للموافقة على بعض إدخالات الوقت هذه',
            403
        );
    }

    const result = await TimeEntry.bulkApprove(sanitizedIds, req.userID);

    // Notify users
    const userIds = [...new Set(entries.map(e => (e.assigneeId || e.userId)?.toString()))];

    for (const userId of userIds) {
        if (userId) {
            QueueService.createNotification({
                firmId: req.firmId,
                userId,
                type: 'time_entry_approved',
                title: 'Time Entries Approved',
                titleAr: 'تمت الموافقة على إدخالات الوقت',
                message: 'Your time entries have been approved',
                messageAr: 'تمت الموافقة على إدخالات الوقت الخاصة بك'
            });
        }
    }

    res.status(200).json({
        success: true,
        message: `${result.modifiedCount} time entries approved`,
        messageAr: `تمت الموافقة على ${result.modifiedCount} إدخال وقت`,
        data: { count: result.modifiedCount }
    });
});

/**
 * Bulk reject time entries
 * POST /api/time-entries/bulk-reject
 */
const bulkRejectTimeEntries = asyncHandler(async (req, res) => {
    // Mass Assignment Protection
    const allowedFields = ['ids', 'reason'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Input Validation: Validate ids array
    const { ids, reason } = sanitizedData;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new CustomException(
            'Entry IDs are required',
            'معرفات الإدخالات مطلوبة',
            400
        );
    }

    if (ids.length > 100) {
        throw new CustomException(
            'Cannot reject more than 100 entries at once',
            'لا يمكن رفض أكثر من 100 إدخال في وقت واحد',
            400
        );
    }

    // Input Validation: Validate reason
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        throw new CustomException(
            'Rejection reason is required',
            'سبب الرفض مطلوب',
            400
        );
    }

    if (reason.length > 1000) {
        throw new CustomException(
            'Rejection reason is too long (max 1000 characters)',
            'سبب الرفض طويل جدًا (الحد الأقصى 1000 حرف)',
            400
        );
    }

    // IDOR Protection: Sanitize all IDs
    const sanitizedIds = ids.map((id, index) =>
        sanitizeObjectId(id, `Entry ID at index ${index}`)
    );

    // Verify all entries belong to the same firm
    const entries = await TimeEntry.find({
        _id: { $in: sanitizedIds },
        firmId: req.firmId
    });

    if (entries.length !== sanitizedIds.length) {
        throw new CustomException(
            'Some time entries were not found or do not belong to your firm',
            'لم يتم العثور على بعض إدخالات الوقت أو لا تنتمي إلى شركتك',
            404
        );
    }

    // Authorization: Verify user has permission to reject
    const isAdmin = req.role === 'admin' || req.role === 'super_admin';

    // Check if user is assigned manager for all entries
    const unauthorizedEntries = entries.filter(entry => {
        const isAssignedManager = entry.assignedManager && entry.assignedManager.equals(req.userID);
        return !isAssignedManager && !isAdmin;
    });

    if (unauthorizedEntries.length > 0) {
        throw new CustomException(
            'You do not have permission to reject some of these time entries',
            'ليس لديك إذن لرفض بعض إدخالات الوقت هذه',
            403
        );
    }

    const result = await TimeEntry.bulkReject(sanitizedIds, reason.trim(), req.userID);

    res.status(200).json({
        success: true,
        message: `${result.modifiedCount} time entries rejected`,
        messageAr: `تم رفض ${result.modifiedCount} إدخال وقت`,
        data: { count: result.modifiedCount }
    });
});

/**
 * Get pending approval entries
 * GET /api/time-entries/pending-approval
 */
const getPendingApproval = asyncHandler(async (req, res) => {
    // Input Validation: Validate managerId if provided
    let managerId = req.query.managerId;
    if (managerId) {
        managerId = sanitizeObjectId(managerId, 'Manager ID');
    }

    const entries = await TimeEntry.getPendingApproval(
        req.firmId,
        managerId || req.userID
    );

    res.status(200).json({
        success: true,
        data: entries
    });
});

/**
 * Lock time entry
 * POST /api/time-entries/:id/lock
 */
const lockTimeEntry = asyncHandler(async (req, res) => {
    // IDOR Protection: Sanitize ID
    const entryId = sanitizeObjectId(req.params.id, 'Time entry ID');

    // Mass Assignment Protection
    const allowedFields = ['reason'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Input Validation: Validate reason
    const { reason } = sanitizedData;
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        throw new CustomException(
            'Lock reason is required',
            'سبب القفل مطلوب',
            400
        );
    }

    if (reason.length > 500) {
        throw new CustomException(
            'Lock reason is too long (max 500 characters)',
            'سبب القفل طويل جدًا (الحد الأقصى 500 حرف)',
            400
        );
    }

    const entry = await TimeEntry.findOne({
        _id: entryId,
        firmId: req.firmId
    });

    if (!entry) {
        throw new CustomException(
            'Time entry not found',
            'إدخال الوقت غير موجود',
            404
        );
    }

    // Authorization: Only admin can lock entries
    const isAdmin = req.role === 'admin' || req.role === 'super_admin';
    if (!isAdmin) {
        throw new CustomException(
            'Only administrators can lock time entries',
            'يمكن للمسؤولين فقط قفل إدخالات الوقت',
            403
        );
    }

    await entry.lock(reason.trim(), req.userID);

    res.status(200).json({
        success: true,
        message: 'Time entry locked',
        messageAr: 'تم قفل إدخال الوقت',
        data: entry
    });
});

/**
 * Unlock time entry (admin only)
 * POST /api/time-entries/:id/unlock
 */
const unlockTimeEntry = asyncHandler(async (req, res) => {
    // IDOR Protection: Sanitize ID
    const entryId = sanitizeObjectId(req.params.id, 'Time entry ID');

    const entry = await TimeEntry.findOne({
        _id: entryId,
        firmId: req.firmId
    });

    if (!entry) {
        throw new CustomException(
            'Time entry not found',
            'إدخال الوقت غير موجود',
            404
        );
    }

    // Authorization: Only admin can unlock entries
    const isAdmin = req.role === 'admin' || req.role === 'super_admin';
    if (!isAdmin) {
        throw new CustomException(
            'Only administrators can unlock time entries',
            'يمكن للمسؤولين فقط إلغاء قفل إدخالات الوقت',
            403
        );
    }

    await entry.unlock(req.userID);

    res.status(200).json({
        success: true,
        message: 'Time entry unlocked',
        messageAr: 'تم إلغاء قفل إدخال الوقت',
        data: entry
    });
});

/**
 * Lock entries for a fiscal period
 * POST /api/time-entries/lock-period
 */
const lockPeriod = asyncHandler(async (req, res) => {
    // Mass Assignment Protection
    const allowedFields = ['startDate', 'endDate', 'reason'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Input Validation: Validate dates
    const { startDate, endDate, reason } = sanitizedData;

    if (!startDate || !endDate) {
        throw new CustomException(
            'Start and end dates are required',
            'تاريخ البداية والنهاية مطلوبان',
            400
        );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime())) {
        throw new CustomException(
            'Invalid start date',
            'تاريخ البداية غير صالح',
            400
        );
    }

    if (isNaN(end.getTime())) {
        throw new CustomException(
            'Invalid end date',
            'تاريخ النهاية غير صالح',
            400
        );
    }

    if (start > end) {
        throw new CustomException(
            'Start date must be before end date',
            'يجب أن يكون تاريخ البداية قبل تاريخ النهاية',
            400
        );
    }

    // Validate reason if provided
    let lockReason = reason || 'Period closed';
    if (typeof lockReason !== 'string') {
        lockReason = 'Period closed';
    } else if (lockReason.length > 500) {
        throw new CustomException(
            'Lock reason is too long (max 500 characters)',
            'سبب القفل طويل جدًا (الحد الأقصى 500 حرف)',
            400
        );
    }

    // Authorization: Only admin can lock periods
    const isAdmin = req.role === 'admin' || req.role === 'super_admin';
    if (!isAdmin) {
        throw new CustomException(
            'Only administrators can lock periods',
            'يمكن للمسؤولين فقط قفل الفترات',
            403
        );
    }

    const result = await TimeEntry.lockForPeriod(
        req.firmId,
        start,
        end,
        lockReason.trim(),
        req.userID
    );

    res.status(200).json({
        success: true,
        message: `${result.modifiedCount} time entries locked`,
        messageAr: `تم قفل ${result.modifiedCount} إدخال وقت`,
        data: { count: result.modifiedCount }
    });
});

module.exports = {
    submitTimeEntry,
    approveTimeEntry,
    rejectTimeEntry,
    bulkApproveTimeEntries,
    bulkRejectTimeEntries,
    getPendingApproval,
    lockTimeEntry,
    unlockTimeEntry,
    lockPeriod
};
