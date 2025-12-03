const { Followup } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Create follow-up
 * POST /api/followups
 */
const createFollowup = asyncHandler(async (req, res) => {
    const {
        title, description, type, priority, dueDate, dueTime,
        entityType, entityId, assignedTo, remindBefore, recurring
    } = req.body;
    const lawyerId = req.userID;

    if (!title || !type || !dueDate || !entityType || !entityId) {
        throw CustomException('العنوان والنوع وتاريخ الاستحقاق ونوع الكيان ومعرف الكيان مطلوبة', 400);
    }

    const followup = await Followup.create({
        lawyerId,
        title: title.trim(),
        description,
        type,
        priority: priority || 'medium',
        dueDate,
        dueTime,
        entityType,
        entityId,
        assignedTo: assignedTo || lawyerId,
        remindBefore,
        recurring: recurring || { enabled: false }
    });

    res.status(201).json({
        success: true,
        message: 'تم إنشاء المتابعة بنجاح',
        data: followup
    });
});

/**
 * Get all follow-ups
 * GET /api/followups
 */
const getFollowups = asyncHandler(async (req, res) => {
    const {
        status, type, priority, entityType, entityId,
        startDate, endDate, page = 1, limit = 50
    } = req.query;
    const lawyerId = req.userID;

    const query = { lawyerId };

    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (entityType) query.entityType = entityType;
    if (entityId) query.entityId = entityId;

    if (startDate || endDate) {
        query.dueDate = {};
        if (startDate) query.dueDate.$gte = new Date(startDate);
        if (endDate) query.dueDate.$lte = new Date(endDate);
    }

    const followups = await Followup.find(query)
        .sort({ dueDate: 1, priority: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .populate('assignedTo', 'firstName lastName')
        .populate('completedBy', 'firstName lastName');

    const total = await Followup.countDocuments(query);

    res.status(200).json({
        success: true,
        data: followups,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single follow-up
 * GET /api/followups/:id
 */
const getFollowup = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const followup = await Followup.findOne({ _id: id, lawyerId })
        .populate('assignedTo', 'firstName lastName')
        .populate('completedBy', 'firstName lastName')
        .populate('history.performedBy', 'firstName lastName');

    if (!followup) {
        throw CustomException('المتابعة غير موجودة', 404);
    }

    res.status(200).json({
        success: true,
        data: followup
    });
});

/**
 * Update follow-up
 * PATCH /api/followups/:id
 */
const updateFollowup = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const followup = await Followup.findOne({ _id: id, lawyerId });

    if (!followup) {
        throw CustomException('المتابعة غير موجودة', 404);
    }

    const allowedFields = [
        'title', 'description', 'type', 'priority', 'dueDate', 'dueTime',
        'assignedTo', 'remindBefore', 'recurring'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            followup[field] = req.body[field];
        }
    });

    followup.history.push({
        action: 'updated',
        performedBy: lawyerId,
        performedAt: new Date()
    });

    await followup.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث المتابعة بنجاح',
        data: followup
    });
});

/**
 * Delete follow-up
 * DELETE /api/followups/:id
 */
const deleteFollowup = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const followup = await Followup.findOneAndDelete({ _id: id, lawyerId });

    if (!followup) {
        throw CustomException('المتابعة غير موجودة', 404);
    }

    res.status(200).json({
        success: true,
        message: 'تم حذف المتابعة بنجاح'
    });
});

/**
 * Get follow-ups by entity
 * GET /api/followups/entity/:entityType/:entityId
 */
const getFollowupsByEntity = asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.params;
    const lawyerId = req.userID;

    const followups = await Followup.getByEntity(lawyerId, entityType, entityId);

    res.status(200).json({
        success: true,
        data: followups
    });
});

/**
 * Get follow-up statistics
 * GET /api/followups/stats
 */
const getFollowupStats = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    const stats = await Followup.getStats(lawyerId);

    res.status(200).json({
        success: true,
        data: stats
    });
});

/**
 * Get overdue follow-ups
 * GET /api/followups/overdue
 */
const getOverdueFollowups = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    const followups = await Followup.getOverdue(lawyerId);

    res.status(200).json({
        success: true,
        data: followups,
        count: followups.length
    });
});

/**
 * Get upcoming follow-ups
 * GET /api/followups/upcoming
 */
const getUpcomingFollowups = asyncHandler(async (req, res) => {
    const { days = 7 } = req.query;
    const lawyerId = req.userID;

    const followups = await Followup.getUpcoming(lawyerId, parseInt(days));

    res.status(200).json({
        success: true,
        data: followups,
        count: followups.length
    });
});

/**
 * Get today's follow-ups
 * GET /api/followups/today
 */
const getTodayFollowups = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    const followups = await Followup.getToday(lawyerId);

    res.status(200).json({
        success: true,
        data: followups,
        count: followups.length
    });
});

/**
 * Complete follow-up
 * POST /api/followups/:id/complete
 */
const completeFollowup = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { completionNotes } = req.body;
    const lawyerId = req.userID;

    const followup = await Followup.findOne({ _id: id, lawyerId });

    if (!followup) {
        throw CustomException('المتابعة غير موجودة', 404);
    }

    followup.status = 'completed';
    followup.completedAt = new Date();
    followup.completedBy = lawyerId;
    followup.completionNotes = completionNotes;

    followup.history.push({
        action: 'completed',
        note: completionNotes,
        performedBy: lawyerId,
        performedAt: new Date()
    });

    // Handle recurring
    if (followup.recurring?.enabled) {
        const nextDueDate = calculateNextDueDate(followup.dueDate, followup.recurring.frequency);

        if (!followup.recurring.endDate || nextDueDate <= followup.recurring.endDate) {
            await Followup.create({
                ...followup.toObject(),
                _id: undefined,
                status: 'pending',
                dueDate: nextDueDate,
                completedAt: undefined,
                completedBy: undefined,
                completionNotes: undefined,
                history: []
            });
        }
    }

    await followup.save();

    res.status(200).json({
        success: true,
        message: 'تم إكمال المتابعة بنجاح',
        data: followup
    });
});

/**
 * Cancel follow-up
 * POST /api/followups/:id/cancel
 */
const cancelFollowup = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const lawyerId = req.userID;

    const followup = await Followup.findOne({ _id: id, lawyerId });

    if (!followup) {
        throw CustomException('المتابعة غير موجودة', 404);
    }

    followup.status = 'cancelled';

    followup.history.push({
        action: 'cancelled',
        note: reason,
        performedBy: lawyerId,
        performedAt: new Date()
    });

    await followup.save();

    res.status(200).json({
        success: true,
        message: 'تم إلغاء المتابعة بنجاح',
        data: followup
    });
});

/**
 * Reschedule follow-up
 * POST /api/followups/:id/reschedule
 */
const rescheduleFollowup = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { newDueDate, newDueTime, reason } = req.body;
    const lawyerId = req.userID;

    if (!newDueDate) {
        throw CustomException('تاريخ الاستحقاق الجديد مطلوب', 400);
    }

    const followup = await Followup.findOne({ _id: id, lawyerId });

    if (!followup) {
        throw CustomException('المتابعة غير موجودة', 404);
    }

    const previousDueDate = followup.dueDate;

    followup.status = 'rescheduled';
    followup.dueDate = new Date(newDueDate);
    if (newDueTime) followup.dueTime = newDueTime;
    followup.status = 'pending'; // Reset to pending after reschedule

    followup.history.push({
        action: 'rescheduled',
        note: reason,
        previousDueDate,
        newDueDate: new Date(newDueDate),
        performedBy: lawyerId,
        performedAt: new Date()
    });

    await followup.save();

    res.status(200).json({
        success: true,
        message: 'تم إعادة جدولة المتابعة بنجاح',
        data: followup
    });
});

/**
 * Add note to follow-up
 * POST /api/followups/:id/notes
 */
const addNote = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { note } = req.body;
    const lawyerId = req.userID;

    if (!note) {
        throw CustomException('الملاحظة مطلوبة', 400);
    }

    const followup = await Followup.findOne({ _id: id, lawyerId });

    if (!followup) {
        throw CustomException('المتابعة غير موجودة', 404);
    }

    followup.history.push({
        action: 'note_added',
        note,
        performedBy: lawyerId,
        performedAt: new Date()
    });

    await followup.save();

    res.status(200).json({
        success: true,
        message: 'تم إضافة الملاحظة بنجاح',
        data: followup
    });
});

/**
 * Bulk complete follow-ups
 * POST /api/followups/bulk-complete
 */
const bulkComplete = asyncHandler(async (req, res) => {
    const { followupIds, completionNotes } = req.body;
    const lawyerId = req.userID;

    if (!followupIds || !Array.isArray(followupIds) || followupIds.length === 0) {
        throw CustomException('معرفات المتابعات مطلوبة', 400);
    }

    const result = await Followup.updateMany(
        { _id: { $in: followupIds }, lawyerId },
        {
            status: 'completed',
            completedAt: new Date(),
            completedBy: lawyerId,
            completionNotes,
            $push: {
                history: {
                    action: 'completed',
                    note: completionNotes,
                    performedBy: lawyerId,
                    performedAt: new Date()
                }
            }
        }
    );

    res.status(200).json({
        success: true,
        message: `تم إكمال ${result.modifiedCount} متابعة بنجاح`,
        count: result.modifiedCount
    });
});

/**
 * Bulk delete follow-ups
 * POST /api/followups/bulk-delete
 */
const bulkDelete = asyncHandler(async (req, res) => {
    const { followupIds } = req.body;
    const lawyerId = req.userID;

    if (!followupIds || !Array.isArray(followupIds) || followupIds.length === 0) {
        throw CustomException('معرفات المتابعات مطلوبة', 400);
    }

    const result = await Followup.deleteMany({
        _id: { $in: followupIds },
        lawyerId
    });

    res.status(200).json({
        success: true,
        message: `تم حذف ${result.deletedCount} متابعة بنجاح`,
        count: result.deletedCount
    });
});

// Helper function to calculate next due date
function calculateNextDueDate(currentDate, frequency) {
    const date = new Date(currentDate);

    switch (frequency) {
        case 'daily':
            date.setDate(date.getDate() + 1);
            break;
        case 'weekly':
            date.setDate(date.getDate() + 7);
            break;
        case 'biweekly':
            date.setDate(date.getDate() + 14);
            break;
        case 'monthly':
            date.setMonth(date.getMonth() + 1);
            break;
        case 'quarterly':
            date.setMonth(date.getMonth() + 3);
            break;
    }

    return date;
}

module.exports = {
    createFollowup,
    getFollowups,
    getFollowup,
    updateFollowup,
    deleteFollowup,
    getFollowupsByEntity,
    getFollowupStats,
    getOverdueFollowups,
    getUpcomingFollowups,
    getTodayFollowups,
    completeFollowup,
    cancelFollowup,
    rescheduleFollowup,
    addNote,
    bulkComplete,
    bulkDelete
};
