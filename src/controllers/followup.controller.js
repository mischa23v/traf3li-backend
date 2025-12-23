const { Followup, Case, Client } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

/**
 * Create follow-up
 * POST /api/followups
 */
const createFollowup = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'title', 'description', 'type', 'priority', 'dueDate', 'dueTime',
        'entityType', 'entityId', 'assignedTo', 'remindBefore', 'recurring'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Validate required fields
    if (!safeData.title || !safeData.type || !safeData.dueDate || !safeData.entityType || !safeData.entityId) {
        throw CustomException('العنوان والنوع وتاريخ الاستحقاق ونوع الكيان ومعرف الكيان مطلوبة', 400);
    }

    // Validate title length
    if (safeData.title.trim().length === 0 || safeData.title.length > 200) {
        throw CustomException('العنوان يجب أن يكون بين 1 و 200 حرف', 400);
    }

    // Validate description length if provided
    if (safeData.description && safeData.description.length > 2000) {
        throw CustomException('الوصف يجب ألا يتجاوز 2000 حرف', 400);
    }

    // Validate date
    const dueDateObj = new Date(safeData.dueDate);
    if (isNaN(dueDateObj.getTime())) {
        throw CustomException('تاريخ الاستحقاق غير صالح', 400);
    }

    // Sanitize entityId
    const sanitizedEntityId = sanitizeObjectId(safeData.entityId);
    if (!sanitizedEntityId) {
        throw CustomException('معرف الكيان غير صالح', 400);
    }

    // IDOR Protection: Verify entity ownership based on entityType
    if (safeData.entityType === 'Case') {
        const caseEntity = await Case.findOne({ _id: sanitizedEntityId, lawyerId });
        if (!caseEntity) {
            throw CustomException('القضية غير موجودة أو ليس لديك صلاحية للوصول إليها', 403);
        }
    } else if (safeData.entityType === 'Client') {
        const clientEntity = await Client.findOne({ _id: sanitizedEntityId, lawyerId });
        if (!clientEntity) {
            throw CustomException('العميل غير موجود أو ليس لديك صلاحية للوصول إليه', 403);
        }
    }

    // Sanitize assignedTo if provided
    if (safeData.assignedTo) {
        const sanitizedAssignedTo = sanitizeObjectId(safeData.assignedTo);
        if (!sanitizedAssignedTo) {
            throw CustomException('معرف المستخدم المعين غير صالح', 400);
        }
        safeData.assignedTo = sanitizedAssignedTo;
    }

    const followup = await Followup.create({
        lawyerId,
        title: safeData.title.trim(),
        description: safeData.description,
        type: safeData.type,
        priority: safeData.priority || 'medium',
        dueDate: dueDateObj,
        dueTime: safeData.dueTime,
        entityType: safeData.entityType,
        entityId: sanitizedEntityId,
        assignedTo: safeData.assignedTo || lawyerId,
        remindBefore: safeData.remindBefore,
        recurring: safeData.recurring || { enabled: false }
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

    // Sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف المتابعة غير صالح', 400);
    }

    // IDOR Protection: Verify followup ownership
    const followup = await Followup.findOne({ _id: sanitizedId, lawyerId })
        .populate('assignedTo', 'firstName lastName')
        .populate('completedBy', 'firstName lastName')
        .populate('history.performedBy', 'firstName lastName');

    if (!followup) {
        throw CustomException('المتابعة غير موجودة أو ليس لديك صلاحية للوصول إليها', 404);
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

    // Sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف المتابعة غير صالح', 400);
    }

    // IDOR Protection: Verify followup ownership
    const followup = await Followup.findOne({ _id: sanitizedId, lawyerId });

    if (!followup) {
        throw CustomException('المتابعة غير موجودة أو ليس لديك صلاحية للوصول إليها', 404);
    }

    // Prevent modification of completed or cancelled followups
    if (followup.status === 'completed' || followup.status === 'cancelled') {
        throw CustomException('لا يمكن تعديل متابعة مكتملة أو ملغاة', 403);
    }

    // Mass assignment protection
    const allowedFields = [
        'title', 'description', 'type', 'priority', 'dueDate', 'dueTime',
        'assignedTo', 'remindBefore', 'recurring'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Validate title if provided
    if (safeData.title !== undefined) {
        if (safeData.title.trim().length === 0 || safeData.title.length > 200) {
            throw CustomException('العنوان يجب أن يكون بين 1 و 200 حرف', 400);
        }
        followup.title = safeData.title.trim();
    }

    // Validate description if provided
    if (safeData.description !== undefined) {
        if (safeData.description && safeData.description.length > 2000) {
            throw CustomException('الوصف يجب ألا يتجاوز 2000 حرف', 400);
        }
        followup.description = safeData.description;
    }

    // Validate date if provided
    if (safeData.dueDate !== undefined) {
        const dueDateObj = new Date(safeData.dueDate);
        if (isNaN(dueDateObj.getTime())) {
            throw CustomException('تاريخ الاستحقاق غير صالح', 400);
        }
        followup.dueDate = dueDateObj;
    }

    // Validate and sanitize assignedTo if provided
    if (safeData.assignedTo !== undefined) {
        const sanitizedAssignedTo = sanitizeObjectId(safeData.assignedTo);
        if (!sanitizedAssignedTo) {
            throw CustomException('معرف المستخدم المعين غير صالح', 400);
        }
        followup.assignedTo = sanitizedAssignedTo;
    }

    // Update other fields
    ['type', 'priority', 'dueTime', 'remindBefore', 'recurring'].forEach(field => {
        if (safeData[field] !== undefined) {
            followup[field] = safeData[field];
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

    // Sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف المتابعة غير صالح', 400);
    }

    // IDOR Protection: Only delete followups owned by the user
    const followup = await Followup.findOneAndDelete({ _id: sanitizedId, lawyerId });

    if (!followup) {
        throw CustomException('المتابعة غير موجودة أو ليس لديك صلاحية للوصول إليها', 404);
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

    // Sanitize entityId
    const sanitizedEntityId = sanitizeObjectId(entityId);
    if (!sanitizedEntityId) {
        throw CustomException('معرف الكيان غير صالح', 400);
    }

    // IDOR Protection: Verify entity ownership
    if (entityType === 'Case') {
        const caseEntity = await Case.findOne({ _id: sanitizedEntityId, lawyerId });
        if (!caseEntity) {
            throw CustomException('القضية غير موجودة أو ليس لديك صلاحية للوصول إليها', 403);
        }
    } else if (entityType === 'Client') {
        const clientEntity = await Client.findOne({ _id: sanitizedEntityId, lawyerId });
        if (!clientEntity) {
            throw CustomException('العميل غير موجود أو ليس لديك صلاحية للوصول إليه', 403);
        }
    }

    const followups = await Followup.getByEntity(lawyerId, entityType, sanitizedEntityId);

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
    const lawyerId = req.userID;

    // Sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف المتابعة غير صالح', 400);
    }

    // Mass assignment protection
    const safeData = pickAllowedFields(req.body, ['completionNotes']);

    // Validate completionNotes if provided
    if (safeData.completionNotes && safeData.completionNotes.length > 2000) {
        throw CustomException('ملاحظات الإكمال يجب ألا تتجاوز 2000 حرف', 400);
    }

    // IDOR Protection: Verify followup ownership
    const followup = await Followup.findOne({ _id: sanitizedId, lawyerId });

    if (!followup) {
        throw CustomException('المتابعة غير موجودة أو ليس لديك صلاحية للوصول إليها', 404);
    }

    // Prevent completing already completed followups
    if (followup.status === 'completed') {
        throw CustomException('المتابعة مكتملة بالفعل', 400);
    }

    followup.status = 'completed';
    followup.completedAt = new Date();
    followup.completedBy = lawyerId;
    followup.completionNotes = safeData.completionNotes;

    followup.history.push({
        action: 'completed',
        note: safeData.completionNotes,
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
    const lawyerId = req.userID;

    // Sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف المتابعة غير صالح', 400);
    }

    // Mass assignment protection
    const safeData = pickAllowedFields(req.body, ['reason']);

    // Validate reason if provided
    if (safeData.reason && safeData.reason.length > 500) {
        throw CustomException('سبب الإلغاء يجب ألا يتجاوز 500 حرف', 400);
    }

    // IDOR Protection: Verify followup ownership
    const followup = await Followup.findOne({ _id: sanitizedId, lawyerId });

    if (!followup) {
        throw CustomException('المتابعة غير موجودة أو ليس لديك صلاحية للوصول إليها', 404);
    }

    // Prevent cancelling already cancelled or completed followups
    if (followup.status === 'cancelled') {
        throw CustomException('المتابعة ملغاة بالفعل', 400);
    }
    if (followup.status === 'completed') {
        throw CustomException('لا يمكن إلغاء متابعة مكتملة', 400);
    }

    followup.status = 'cancelled';

    followup.history.push({
        action: 'cancelled',
        note: safeData.reason,
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
    const lawyerId = req.userID;

    // Sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف المتابعة غير صالح', 400);
    }

    // Mass assignment protection
    const safeData = pickAllowedFields(req.body, ['newDueDate', 'newDueTime', 'reason']);

    // Validate required fields
    if (!safeData.newDueDate) {
        throw CustomException('تاريخ الاستحقاق الجديد مطلوب', 400);
    }

    // Validate new due date
    const newDueDateObj = new Date(safeData.newDueDate);
    if (isNaN(newDueDateObj.getTime())) {
        throw CustomException('تاريخ الاستحقاق الجديد غير صالح', 400);
    }

    // Validate reason if provided
    if (safeData.reason && safeData.reason.length > 500) {
        throw CustomException('سبب إعادة الجدولة يجب ألا يتجاوز 500 حرف', 400);
    }

    // IDOR Protection: Verify followup ownership
    const followup = await Followup.findOne({ _id: sanitizedId, lawyerId });

    if (!followup) {
        throw CustomException('المتابعة غير موجودة أو ليس لديك صلاحية للوصول إليها', 404);
    }

    // Prevent rescheduling completed or cancelled followups
    if (followup.status === 'completed') {
        throw CustomException('لا يمكن إعادة جدولة متابعة مكتملة', 400);
    }
    if (followup.status === 'cancelled') {
        throw CustomException('لا يمكن إعادة جدولة متابعة ملغاة', 400);
    }

    const previousDueDate = followup.dueDate;

    followup.dueDate = newDueDateObj;
    if (safeData.newDueTime) followup.dueTime = safeData.newDueTime;
    followup.status = 'pending'; // Reset to pending after reschedule

    followup.history.push({
        action: 'rescheduled',
        note: safeData.reason,
        previousDueDate,
        newDueDate: newDueDateObj,
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
    const lawyerId = req.userID;

    // Sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف المتابعة غير صالح', 400);
    }

    // Mass assignment protection
    const safeData = pickAllowedFields(req.body, ['note']);

    // Validate note
    if (!safeData.note || safeData.note.trim().length === 0) {
        throw CustomException('الملاحظة مطلوبة', 400);
    }

    if (safeData.note.length > 2000) {
        throw CustomException('الملاحظة يجب ألا تتجاوز 2000 حرف', 400);
    }

    // IDOR Protection: Verify followup ownership
    const followup = await Followup.findOne({ _id: sanitizedId, lawyerId });

    if (!followup) {
        throw CustomException('المتابعة غير موجودة أو ليس لديك صلاحية للوصول إليها', 404);
    }

    followup.history.push({
        action: 'note_added',
        note: safeData.note.trim(),
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
    const lawyerId = req.userID;

    // Mass assignment protection
    const safeData = pickAllowedFields(req.body, ['followupIds', 'completionNotes']);

    // Validate followupIds
    if (!safeData.followupIds || !Array.isArray(safeData.followupIds) || safeData.followupIds.length === 0) {
        throw CustomException('معرفات المتابعات مطلوبة', 400);
    }

    // Limit bulk operations to prevent abuse
    if (safeData.followupIds.length > 100) {
        throw CustomException('لا يمكن إكمال أكثر من 100 متابعة في وقت واحد', 400);
    }

    // Validate completionNotes if provided
    if (safeData.completionNotes && safeData.completionNotes.length > 2000) {
        throw CustomException('ملاحظات الإكمال يجب ألا تتجاوز 2000 حرف', 400);
    }

    // Sanitize all IDs
    const sanitizedIds = safeData.followupIds
        .map(id => sanitizeObjectId(id))
        .filter(id => id !== null);

    if (sanitizedIds.length === 0) {
        throw CustomException('لا توجد معرفات صالحة', 400);
    }

    // IDOR Protection: Only update followups owned by the user
    const result = await Followup.updateMany(
        {
            _id: { $in: sanitizedIds },
            lawyerId,
            status: { $nin: ['completed', 'cancelled'] } // Only update pending/rescheduled
        },
        {
            status: 'completed',
            completedAt: new Date(),
            completedBy: lawyerId,
            completionNotes: safeData.completionNotes,
            $push: {
                history: {
                    action: 'completed',
                    note: safeData.completionNotes,
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
    const lawyerId = req.userID;

    // Mass assignment protection
    const safeData = pickAllowedFields(req.body, ['followupIds']);

    // Validate followupIds
    if (!safeData.followupIds || !Array.isArray(safeData.followupIds) || safeData.followupIds.length === 0) {
        throw CustomException('معرفات المتابعات مطلوبة', 400);
    }

    // Limit bulk operations to prevent abuse
    if (safeData.followupIds.length > 100) {
        throw CustomException('لا يمكن حذف أكثر من 100 متابعة في وقت واحد', 400);
    }

    // Sanitize all IDs
    const sanitizedIds = safeData.followupIds
        .map(id => sanitizeObjectId(id))
        .filter(id => id !== null);

    if (sanitizedIds.length === 0) {
        throw CustomException('لا توجد معرفات صالحة', 400);
    }

    // IDOR Protection: Only delete followups owned by the user
    const result = await Followup.deleteMany({
        _id: { $in: sanitizedIds },
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
