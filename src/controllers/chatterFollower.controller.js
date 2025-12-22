const { ChatterFollower, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Get all followers for a record
 * GET /api/chatter-followers/:model/:recordId/followers
 */
const getFollowers = asyncHandler(async (req, res) => {
    const { res_model, res_id, page = 1, limit = 50 } = req.query;
    const firmId = req.firmId;

    if (!res_model || !res_id) {
        throw CustomException('نموذج المورد ومعرف المورد مطلوبان', 400);
    }

    const query = {
        firmId,
        res_model,
        res_id
    };

    const followers = await ChatterFollower.find(query)
        .populate('user_id', 'firstName lastName email avatar')
        .populate('added_by', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await ChatterFollower.countDocuments(query);

    res.status(200).json({
        success: true,
        data: followers,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Add a follower to a record
 * POST /api/chatter-followers/:model/:recordId/followers
 */
const addFollower = asyncHandler(async (req, res) => {
    const { res_model, res_id, user_id, notification_type = 'all' } = req.body;
    const userId = req.userID;
    const firmId = req.firmId;

    if (!res_model || !res_id || !user_id) {
        throw CustomException('نموذج المورد ومعرف المورد ومعرف المتابع مطلوبان', 400);
    }

    // Check if follower already exists
    const existingFollower = await ChatterFollower.findOne({
        firmId,
        res_model,
        res_id,
        user_id
    });

    if (existingFollower) {
        throw CustomException('المتابع موجود بالفعل لهذا السجل', 400);
    }

    // Verify the user exists and belongs to the same firm
    const targetUser = await User.findOne({ _id: user_id, firmId });
    if (!targetUser) {
        throw CustomException('المستخدم غير موجود أو لا ينتمي إلى نفس المكتب', 404);
    }

    const follower = await ChatterFollower.create({
        firmId,
        res_model,
        res_id,
        user_id,
        notification_type,
        follow_type: 'manual',
        added_by: userId
    });

    await follower.populate([
        { path: 'user_id', select: 'firstName lastName email avatar' },
        { path: 'added_by', select: 'firstName lastName' }
    ]);

    res.status(201).json({
        success: true,
        message: 'تم إضافة المتابع بنجاح',
        data: follower
    });
});

/**
 * Remove a follower
 * DELETE /api/chatter-followers/:model/:recordId/followers/:userId
 */
const removeFollower = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;

    const follower = await ChatterFollower.findOne({ _id: id, firmId });

    if (!follower) {
        throw CustomException('المتابع غير موجود', 404);
    }

    await ChatterFollower.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: 'تم إزالة المتابع بنجاح'
    });
});

/**
 * Update follower's notification settings
 * PATCH /api/chatter-followers/:model/:recordId/followers/:userId/preferences
 */
const updateNotificationPreference = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { notification_type } = req.body;
    const firmId = req.firmId;
    const userId = req.userID;

    if (!notification_type) {
        throw CustomException('تفضيل الإشعارات مطلوب', 400);
    }

    const validTypes = ['all', 'mentions', 'none'];
    if (!validTypes.includes(notification_type)) {
        throw CustomException('تفضيل الإشعارات غير صالح. القيم المسموح بها: all, mentions, none', 400);
    }

    const follower = await ChatterFollower.findOne({ _id: id, firmId });

    if (!follower) {
        throw CustomException('المتابع غير موجود', 404);
    }

    // Only the follower themselves can update their notification preference
    if (follower.user_id.toString() !== userId.toString()) {
        throw CustomException('غير مصرح لك بتحديث تفضيلات الإشعارات لهذا المتابع', 403);
    }

    follower.notification_type = notification_type;
    await follower.save();

    await follower.populate([
        { path: 'user_id', select: 'firstName lastName email avatar' },
        { path: 'added_by', select: 'firstName lastName' }
    ]);

    res.status(200).json({
        success: true,
        message: 'تم تحديث تفضيلات الإشعارات بنجاح',
        data: follower
    });
});

/**
 * Get records the current user is following
 * GET /api/chatter-followers/my-followed
 */
const getMyFollowedRecords = asyncHandler(async (req, res) => {
    const { res_model, page = 1, limit = 50 } = req.query;
    const userId = req.userID;
    const firmId = req.firmId;

    const query = {
        firmId,
        user_id: userId
    };

    if (res_model) {
        query.res_model = res_model;
    }

    const followedRecords = await ChatterFollower.find(query)
        .populate('user_id', 'firstName lastName email avatar')
        .populate('added_by', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await ChatterFollower.countDocuments(query);

    res.status(200).json({
        success: true,
        data: followedRecords,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Add multiple followers at once
 * POST /api/chatter-followers/:model/:recordId/followers/bulk
 */
const bulkAddFollowers = asyncHandler(async (req, res) => {
    const { res_model, res_id, user_ids, notification_type = 'all' } = req.body;
    const userId = req.userID;
    const firmId = req.firmId;

    if (!res_model || !res_id || !user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
        throw CustomException('نموذج المورد ومعرف المورد ومعرفات المتابعين مطلوبة', 400);
    }

    // Verify all users exist and belong to the same firm
    const users = await User.find({ _id: { $in: user_ids }, firmId });
    if (users.length !== user_ids.length) {
        throw CustomException('بعض المستخدمين غير موجودين أو لا ينتمون إلى نفس المكتب', 404);
    }

    // Get existing followers to avoid duplicates
    const existingFollowers = await ChatterFollower.find({
        firmId,
        res_model,
        res_id,
        user_id: { $in: user_ids }
    }).select('user_id');

    const existingUserIds = existingFollowers.map(f => f.user_id.toString());
    const newUserIds = user_ids.filter(id => !existingUserIds.includes(id.toString()));

    if (newUserIds.length === 0) {
        throw CustomException('جميع المتابعين موجودون بالفعل لهذا السجل', 400);
    }

    // Create new followers
    const followersToCreate = newUserIds.map(uid => ({
        firmId,
        res_model,
        res_id,
        user_id: uid,
        notification_type,
        follow_type: 'manual',
        added_by: userId
    }));

    const createdFollowers = await ChatterFollower.insertMany(followersToCreate);

    // Populate the created followers
    const populatedFollowers = await ChatterFollower.find({
        _id: { $in: createdFollowers.map(f => f._id) }
    })
        .populate('user_id', 'firstName lastName email avatar')
        .populate('added_by', 'firstName lastName');

    res.status(201).json({
        success: true,
        message: `تم إضافة ${createdFollowers.length} متابع بنجاح`,
        data: {
            added: createdFollowers.length,
            skipped: existingUserIds.length,
            followers: populatedFollowers
        }
    });
});

/**
 * Toggle follow status for current user
 * POST /api/chatter-followers/:model/:recordId/toggle-follow
 */
const toggleFollow = asyncHandler(async (req, res) => {
    const { res_model, res_id, notification_type = 'all' } = req.body;
    const userId = req.userID;
    const firmId = req.firmId;

    if (!res_model || !res_id) {
        throw CustomException('نموذج المورد ومعرف المورد مطلوبان', 400);
    }

    const existingFollower = await ChatterFollower.findOne({
        firmId,
        res_model,
        res_id,
        user_id: userId
    });

    if (existingFollower) {
        // Unfollow
        await ChatterFollower.findByIdAndDelete(existingFollower._id);

        res.status(200).json({
            success: true,
            message: 'تم إلغاء المتابعة بنجاح',
            data: {
                isFollowing: false,
                res_model,
                res_id
            }
        });
    } else {
        // Follow
        const follower = await ChatterFollower.create({
            firmId,
            res_model,
            res_id,
            user_id: userId,
            notification_type,
            follow_type: 'manual',
            added_by: userId
        });

        await follower.populate([
            { path: 'user_id', select: 'firstName lastName email avatar' },
            { path: 'added_by', select: 'firstName lastName' }
        ]);

        res.status(201).json({
            success: true,
            message: 'تم المتابعة بنجاح',
            data: {
                isFollowing: true,
                follower
            }
        });
    }
});

module.exports = {
    getFollowers,
    addFollower,
    removeFollower,
    updateNotificationPreference,
    getMyFollowedRecords,
    bulkAddFollowers,
    toggleFollow
};
