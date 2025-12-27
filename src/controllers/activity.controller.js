const { Activity, ActivityType, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

/**
 * Schedule activity
 * POST /api/activities
 */
const scheduleActivity = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    // Mass assignment protection
    const allowedFields = [
        'res_model', 'res_id', 'activity_type_id', 'summary',
        'note', 'date_deadline', 'user_id'
    ];
    const activityData = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (!activityData.res_model || !activityData.res_id || !activityData.activity_type_id) {
        throw CustomException('النموذج والمعرف ونوع النشاط مطلوبان', 400);
    }

    // Validate entity references
    const sanitizedResId = sanitizeObjectId(activityData.res_id);
    const sanitizedActivityTypeId = sanitizeObjectId(activityData.activity_type_id);
    const sanitizedUserId = activityData.user_id ? sanitizeObjectId(activityData.user_id) : lawyerId;

    // Validate date
    let deadline = new Date();
    if (activityData.date_deadline) {
        const parsedDate = new Date(activityData.date_deadline);
        if (isNaN(parsedDate.getTime())) {
            throw CustomException('تاريخ الموعد النهائي غير صالح', 400);
        }
        deadline = parsedDate;
    }

    // Validate activity type exists and belongs to lawyer or is system type
    const activityType = await ActivityType.findOne({
        _id: sanitizedActivityTypeId,
        $or: [{ lawyerId }, { isSystem: true }]
    });
    if (!activityType) {
        throw CustomException('نوع النشاط غير موجود أو غير مصرح به', 404);
    }

    // If user_id is provided, verify user belongs to same firm
    if (activityData.user_id) {
        const user = await User.findOne({ _id: sanitizedUserId, lawyerId });
        if (!user) {
            throw CustomException('المستخدم غير موجود أو لا ينتمي إلى نفس المكتب', 404);
        }
    }

    const activity = await Activity.create({
        lawyerId,
        res_model: activityData.res_model,
        res_id: sanitizedResId,
        activity_type_id: sanitizedActivityTypeId,
        summary: activityData.summary,
        note: activityData.note,
        date_deadline: deadline,
        user_id: sanitizedUserId,
        state: 'planned',
        createdBy: lawyerId
    });

    await activity.populate([
        { path: 'activity_type_id', select: 'name nameAr icon color' },
        { path: 'user_id', select: 'firstName lastName email' },
        { path: 'createdBy', select: 'firstName lastName' }
    ]);

    res.status(201).json({
        success: true,
        message: 'تم جدولة النشاط بنجاح',
        data: activity
    });
});

/**
 * Get activities
 * GET /api/activities
 */
const getActivities = asyncHandler(async (req, res) => {
    const { res_model, res_id, user_id, state, page = 1, limit = 50 } = req.query;
    const lawyerId = req.userID;

    const query = { lawyerId };

    if (res_model) query.res_model = res_model;
    if (res_id) query.res_id = res_id;
    if (user_id) query.user_id = user_id;
    if (state) query.state = state;

    const activities = await Activity.find(query)
        .populate('activity_type_id', 'name nameAr icon color')
        .populate('user_id', 'firstName lastName email avatar')
        .populate('createdBy', 'firstName lastName')
        .sort({ date_deadline: 1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Activity.countDocuments(query);

    res.status(200).json({
        success: true,
        data: activities,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single activity
 * GET /api/activities/:id
 */
const getActivity = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    // Sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);

    // IDOR protection - verify firmId ownership
    const activity = await Activity.findOne({ _id: sanitizedId, lawyerId })
        .populate('activity_type_id', 'name nameAr icon color category')
        .populate('user_id', 'firstName lastName email avatar')
        .populate('createdBy', 'firstName lastName avatar')
        .populate('done_by', 'firstName lastName avatar');

    if (!activity) {
        throw CustomException('النشاط غير موجود', 404);
    }

    res.status(200).json({
        success: true,
        data: activity
    });
});

/**
 * Get current user's activities
 * GET /api/activities/my
 */
const getMyActivities = asyncHandler(async (req, res) => {
    const { state, date_from, date_to, page = 1, limit = 50 } = req.query;
    const userId = req.userID;

    const query = { user_id: userId };

    if (state) {
        query.state = state;
    } else {
        query.state = { $in: ['planned', 'today', 'overdue'] };
    }

    if (date_from || date_to) {
        query.date_deadline = {};
        if (date_from) query.date_deadline.$gte = new Date(date_from);
        if (date_to) query.date_deadline.$lte = new Date(date_to);
    }

    const activities = await Activity.find(query)
        .populate('activity_type_id', 'name nameAr icon color')
        .populate('createdBy', 'firstName lastName')
        .sort({ date_deadline: 1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Activity.countDocuments(query);

    res.status(200).json({
        success: true,
        data: activities,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get activity statistics
 * GET /api/activities/stats
 */
const getActivityStats = asyncHandler(async (req, res) => {
    const userId = req.userID;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
        totalPlanned,
        todayActivities,
        overdueActivities,
        completedThisWeek,
        byType
    ] = await Promise.all([
        Activity.countDocuments({ user_id: userId, state: 'planned' }),
        Activity.countDocuments({
            user_id: userId,
            state: { $in: ['planned', 'today'] },
            date_deadline: { $gte: today, $lt: tomorrow }
        }),
        Activity.countDocuments({
            user_id: userId,
            state: { $in: ['planned', 'today', 'overdue'] },
            date_deadline: { $lt: today }
        }),
        Activity.countDocuments({
            user_id: userId,
            state: 'done',
            done_date: {
                $gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
            }
        }),
        Activity.aggregate([
            {
                $match: {
                    user_id: userId,
                    state: { $in: ['planned', 'today', 'overdue'] }
                }
            },
            {
                $lookup: {
                    from: 'activitytypes',
                    localField: 'activity_type_id',
                    foreignField: '_id',
                    as: 'type_info'
                }
            },
            { $unwind: '$type_info' },
            {
                $group: {
                    _id: '$activity_type_id',
                    count: { $sum: 1 },
                    name: { $first: '$type_info.name' },
                    nameAr: { $first: '$type_info.nameAr' }
                }
            },
            { $sort: { count: -1 } }
        ])
    ]);

    res.status(200).json({
        success: true,
        data: {
            totalPlanned,
            todayActivities,
            overdueActivities,
            completedThisWeek,
            byType
        }
    });
});

/**
 * Mark activity as done
 * POST /api/activities/:id/done
 */
const markAsDone = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const lawyerId = req.userID;

    // Sanitize ID
    const sanitizedId = sanitizeObjectId(id);

    // Mass assignment protection
    const allowedFields = ['feedback'];
    const updateData = pickAllowedFields(req.body, allowedFields);

    // IDOR protection - verify firmId ownership
    const activity = await Activity.findOne({ _id: sanitizedId, lawyerId });

    if (!activity) {
        throw CustomException('النشاط غير موجود', 404);
    }

    // Verify user has permission (either assigned user or firm owner)
    if (activity.user_id.toString() !== userId && activity.lawyerId.toString() !== userId) {
        throw CustomException('النشاط غير موجود', 404);
    }

    activity.state = 'done';
    activity.done_date = new Date();
    activity.done_by = userId;
    if (updateData.feedback) activity.feedback = updateData.feedback;

    await activity.save();

    await activity.populate([
        { path: 'activity_type_id', select: 'name nameAr icon color' },
        { path: 'user_id', select: 'firstName lastName email' },
        { path: 'done_by', select: 'firstName lastName' }
    ]);

    res.status(200).json({
        success: true,
        message: 'تم وضع علامة على النشاط كمنجز',
        data: activity
    });
});

/**
 * Cancel activity
 * POST /api/activities/:id/cancel
 */
const cancelActivity = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const lawyerId = req.userID;

    // Sanitize ID
    const sanitizedId = sanitizeObjectId(id);

    // IDOR protection - verify firmId ownership
    const activity = await Activity.findOne({ _id: sanitizedId, lawyerId });

    if (!activity) {
        throw CustomException('النشاط غير موجود', 404);
    }

    // Verify user has permission
    if (activity.user_id.toString() !== userId && activity.lawyerId.toString() !== userId) {
        throw CustomException('النشاط غير موجود', 404);
    }

    activity.state = 'cancelled';
    activity.cancelled_date = new Date();
    activity.cancelled_by = userId;

    await activity.save();

    res.status(200).json({
        success: true,
        message: 'تم إلغاء النشاط بنجاح',
        data: activity
    });
});

/**
 * Reschedule activity
 * PATCH /api/activities/:id/reschedule
 */
const reschedule = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const lawyerId = req.userID;

    // Sanitize ID
    const sanitizedId = sanitizeObjectId(id);

    // Mass assignment protection
    const allowedFields = ['date_deadline'];
    const updateData = pickAllowedFields(req.body, allowedFields);

    if (!updateData.date_deadline) {
        throw CustomException('الموعد النهائي مطلوب', 400);
    }

    // Validate date
    const parsedDate = new Date(updateData.date_deadline);
    if (isNaN(parsedDate.getTime())) {
        throw CustomException('تاريخ الموعد النهائي غير صالح', 400);
    }

    // IDOR protection - verify firmId ownership
    const activity = await Activity.findOne({ _id: sanitizedId, lawyerId });

    if (!activity) {
        throw CustomException('النشاط غير موجود', 404);
    }

    // Verify user has permission
    if (activity.user_id.toString() !== userId && activity.lawyerId.toString() !== userId) {
        throw CustomException('النشاط غير موجود', 404);
    }

    activity.date_deadline = parsedDate;
    activity.state = 'planned';

    await activity.save();

    await activity.populate([
        { path: 'activity_type_id', select: 'name nameAr icon color' },
        { path: 'user_id', select: 'firstName lastName email' }
    ]);

    res.status(200).json({
        success: true,
        message: 'تم إعادة جدولة النشاط بنجاح',
        data: activity
    });
});

/**
 * Reassign activity
 * PATCH /api/activities/:id/reassign
 */
const reassign = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const currentUserId = req.userID;
    const lawyerId = req.userID;

    // Sanitize IDs
    const sanitizedId = sanitizeObjectId(id);

    // Mass assignment protection
    const allowedFields = ['user_id'];
    const updateData = pickAllowedFields(req.body, allowedFields);

    if (!updateData.user_id) {
        throw CustomException('معرف المستخدم مطلوب', 400);
    }

    const sanitizedUserId = sanitizeObjectId(updateData.user_id);

    // IDOR protection - verify firmId ownership
    const activity = await Activity.findOne({ _id: sanitizedId, lawyerId });

    if (!activity) {
        throw CustomException('النشاط غير موجود', 404);
    }

    // Verify user has permission (only firm owner can reassign)
    if (activity.lawyerId.toString() !== currentUserId) {
        throw CustomException('النشاط غير موجود', 404);
    }

    // Verify the new user exists and belongs to the same firm
    const newUser = await User.findOne({ _id: sanitizedUserId, lawyerId: activity.lawyerId });
    if (!newUser) {
        throw CustomException('المستخدم غير موجود أو لا ينتمي إلى نفس المكتب', 404);
    }

    activity.user_id = sanitizedUserId;

    await activity.save();

    await activity.populate([
        { path: 'activity_type_id', select: 'name nameAr icon color' },
        { path: 'user_id', select: 'firstName lastName email avatar' }
    ]);

    res.status(200).json({
        success: true,
        message: 'تم إعادة تعيين النشاط بنجاح',
        data: activity
    });
});

/**
 * Get activity types
 * GET /api/activities/types
 */
const getActivityTypes = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    const activityTypes = await ActivityType.find({
        $or: [
            { lawyerId },
            { isSystem: true }
        ]
    }).sort({ category: 1, order: 1, name: 1 });

    res.status(200).json({
        success: true,
        data: activityTypes
    });
});

/**
 * Create activity type (admin only)
 * POST /api/activities/types
 */
const createActivityType = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    // Mass assignment protection
    const allowedFields = [
        'name', 'nameAr', 'icon', 'color', 'category',
        'defaultSummary', 'defaultSummaryAr', 'delayCount', 'delayUnit'
    ];
    const typeData = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (!typeData.name || !typeData.nameAr) {
        throw CustomException('الاسم باللغتين مطلوب', 400);
    }

    // Validate delayCount if provided
    if (typeData.delayCount !== undefined && (isNaN(typeData.delayCount) || typeData.delayCount < 0)) {
        throw CustomException('عدد الأيام غير صالح', 400);
    }

    // Validate delayUnit if provided
    const validDelayUnits = ['minutes', 'hours', 'days', 'weeks', 'months'];
    if (typeData.delayUnit && !validDelayUnits.includes(typeData.delayUnit)) {
        throw CustomException('وحدة التأخير غير صالحة', 400);
    }

    const activityType = await ActivityType.create({
        lawyerId,
        name: typeData.name,
        nameAr: typeData.nameAr,
        icon: typeData.icon || 'Bell',
        color: typeData.color || '#3B82F6',
        category: typeData.category || 'other',
        defaultSummary: typeData.defaultSummary,
        defaultSummaryAr: typeData.defaultSummaryAr,
        delayCount: typeData.delayCount || 0,
        delayUnit: typeData.delayUnit || 'days',
        isSystem: false,
        createdBy: lawyerId
    });

    res.status(201).json({
        success: true,
        message: 'تم إنشاء نوع النشاط بنجاح',
        data: activityType
    });
});

/**
 * Update activity type
 * PATCH /api/activities/types/:id
 */
const updateActivityType = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    // Sanitize ID
    const sanitizedId = sanitizeObjectId(id);

    // IDOR protection - verify firmId ownership
    const activityType = await ActivityType.findOne({ _id: sanitizedId, lawyerId });

    if (!activityType) {
        throw CustomException('نوع النشاط غير موجود', 404);
    }

    if (activityType.isSystem) {
        throw CustomException('لا يمكن تعديل نوع النشاط الافتراضي', 400);
    }

    // Mass assignment protection
    const allowedFields = [
        'name', 'nameAr', 'icon', 'color', 'category',
        'defaultSummary', 'defaultSummaryAr', 'delayCount', 'delayUnit', 'isActive'
    ];
    const updateData = pickAllowedFields(req.body, allowedFields);

    // Validate delayCount if provided
    if (updateData.delayCount !== undefined && (isNaN(updateData.delayCount) || updateData.delayCount < 0)) {
        throw CustomException('عدد الأيام غير صالح', 400);
    }

    // Validate delayUnit if provided
    const validDelayUnits = ['minutes', 'hours', 'days', 'weeks', 'months'];
    if (updateData.delayUnit && !validDelayUnits.includes(updateData.delayUnit)) {
        throw CustomException('وحدة التأخير غير صالحة', 400);
    }

    Object.keys(updateData).forEach(field => {
        activityType[field] = updateData[field];
    });

    await activityType.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث نوع النشاط بنجاح',
        data: activityType
    });
});

/**
 * Delete activity type
 * DELETE /api/activities/types/:id
 */
const deleteActivityType = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    // Sanitize ID
    const sanitizedId = sanitizeObjectId(id);

    // IDOR protection - verify firmId ownership
    const activityType = await ActivityType.findOne({ _id: sanitizedId, lawyerId });

    if (!activityType) {
        throw CustomException('نوع النشاط غير موجود', 404);
    }

    if (activityType.isSystem) {
        throw CustomException('لا يمكن حذف نوع النشاط الافتراضي', 400);
    }

    // Check if activity type is in use
    const inUse = await Activity.findOne({ activity_type_id: sanitizedId });
    if (inUse) {
        throw CustomException('لا يمكن حذف نوع النشاط لأنه قيد الاستخدام', 400);
    }

    await ActivityType.findOneAndDelete({ _id: sanitizedId, lawyerId });

    res.status(200).json({
        success: true,
        message: 'تم حذف نوع النشاط بنجاح'
    });
});

/**
 * Get activity summary
 * GET /api/activities/summary
 */
const getActivitySummary = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
        totalPlanned,
        todayActivities,
        overdueActivities,
        completedThisWeek,
        recentActivities
    ] = await Promise.all([
        Activity.countDocuments({ lawyerId, state: 'planned' }),
        Activity.countDocuments({
            lawyerId,
            state: { $in: ['planned', 'today'] },
            date_deadline: { $gte: today, $lt: tomorrow }
        }),
        Activity.countDocuments({
            lawyerId,
            state: { $in: ['planned', 'today', 'overdue'] },
            date_deadline: { $lt: today }
        }),
        Activity.countDocuments({
            lawyerId,
            state: 'done',
            done_date: {
                $gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
            }
        }),
        Activity.find({ lawyerId })
            .populate('activity_type_id', 'name nameAr icon color')
            .populate('user_id', 'firstName lastName email')
            .sort({ date_deadline: 1, createdAt: -1 })
            .limit(5)
    ]);

    res.status(200).json({
        success: true,
        data: {
            totalPlanned,
            todayActivities,
            overdueActivities,
            completedThisWeek,
            recentActivities
        }
    });
});

/**
 * Get entity-specific activities
 * GET /api/activities/entity/:entityType/:entityId
 */
const getEntityActivities = asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.params;
    const { state, page = 1, limit = 20 } = req.query;
    const lawyerId = req.userID;

    // Sanitize entity ID
    const sanitizedEntityId = sanitizeObjectId(entityId);

    // IDOR protection - query includes lawyerId to ensure firm ownership
    const query = {
        lawyerId,
        res_model: entityType,
        res_id: sanitizedEntityId
    };

    if (state) {
        query.state = state;
    }

    const activities = await Activity.find(query)
        .populate('activity_type_id', 'name nameAr icon color')
        .populate('user_id', 'firstName lastName email avatar')
        .populate('createdBy', 'firstName lastName')
        .populate('done_by', 'firstName lastName')
        .sort({ date_deadline: 1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Activity.countDocuments(query);

    res.status(200).json({
        success: true,
        data: activities,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

module.exports = {
    scheduleActivity,
    getActivities,
    getActivity,
    getMyActivities,
    getActivityStats,
    getActivitySummary,
    getEntityActivities,
    markAsDone,
    cancelActivity,
    reschedule,
    reassign,
    getActivityTypes,
    createActivityType,
    updateActivityType,
    deleteActivityType
};
