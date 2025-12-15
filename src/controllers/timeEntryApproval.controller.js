const TimeEntry = require('../models/timeEntry.model');
const Notification = require('../models/notification.model');
const asyncHandler = require('../middlewares/asyncHandler.middleware');
const CustomException = require('../exceptions/customException');

/**
 * Submit time entry for approval
 * POST /api/time-entries/:id/submit
 */
const submitTimeEntry = asyncHandler(async (req, res) => {
    const { managerId } = req.body;

    const entry = await TimeEntry.findOne({
        _id: req.params.id,
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
        await Notification.createNotification({
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
    const entry = await TimeEntry.findOne({
        _id: req.params.id,
        firmId: req.firmId
    });

    if (!entry) {
        throw new CustomException(
            'Time entry not found',
            'إدخال الوقت غير موجود',
            404
        );
    }

    if (entry.status !== 'submitted') {
        throw new CustomException(
            'Only submitted entries can be approved',
            'يمكن الموافقة فقط على الإدخالات المقدمة',
            400
        );
    }

    await entry.approve(req.userID);

    // Notify creator
    await Notification.createNotification({
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
    const { reason } = req.body;

    if (!reason) {
        throw new CustomException(
            'Rejection reason is required',
            'سبب الرفض مطلوب',
            400
        );
    }

    const entry = await TimeEntry.findOne({
        _id: req.params.id,
        firmId: req.firmId
    });

    if (!entry) {
        throw new CustomException(
            'Time entry not found',
            'إدخال الوقت غير موجود',
            404
        );
    }

    if (entry.status !== 'submitted') {
        throw new CustomException(
            'Only submitted entries can be rejected',
            'يمكن رفض الإدخالات المقدمة فقط',
            400
        );
    }

    await entry.reject(reason, req.userID);

    // Notify creator
    await Notification.createNotification({
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
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new CustomException(
            'Entry IDs are required',
            'معرفات الإدخالات مطلوبة',
            400
        );
    }

    const result = await TimeEntry.bulkApprove(ids, req.userID);

    // Get entries to notify users
    const entries = await TimeEntry.find({ _id: { $in: ids } });
    const userIds = [...new Set(entries.map(e => (e.assigneeId || e.userId)?.toString()))];

    for (const userId of userIds) {
        if (userId) {
            await Notification.createNotification({
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
    const { ids, reason } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new CustomException(
            'Entry IDs are required',
            'معرفات الإدخالات مطلوبة',
            400
        );
    }

    if (!reason) {
        throw new CustomException(
            'Rejection reason is required',
            'سبب الرفض مطلوب',
            400
        );
    }

    const result = await TimeEntry.bulkReject(ids, reason, req.userID);

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
    const { managerId } = req.query;

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
    const { reason } = req.body;

    if (!reason) {
        throw new CustomException(
            'Lock reason is required',
            'سبب القفل مطلوب',
            400
        );
    }

    const entry = await TimeEntry.findOne({
        _id: req.params.id,
        firmId: req.firmId
    });

    if (!entry) {
        throw new CustomException(
            'Time entry not found',
            'إدخال الوقت غير موجود',
            404
        );
    }

    await entry.lock(reason, req.userID);

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
    const entry = await TimeEntry.findOne({
        _id: req.params.id,
        firmId: req.firmId
    });

    if (!entry) {
        throw new CustomException(
            'Time entry not found',
            'إدخال الوقت غير موجود',
            404
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
    const { startDate, endDate, reason } = req.body;

    if (!startDate || !endDate) {
        throw new CustomException(
            'Start and end dates are required',
            'تاريخ البداية والنهاية مطلوبان',
            400
        );
    }

    const result = await TimeEntry.lockForPeriod(
        req.firmId,
        new Date(startDate),
        new Date(endDate),
        reason || 'Period closed',
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
