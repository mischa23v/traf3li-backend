const { ChatterFollower, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Get all followers for a record
 * GET /api/chatter/followers
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
        .populate('partner_id', 'firstName lastName email avatar')
        .populate('createdBy', 'firstName lastName')
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
 * POST /api/chatter/followers
 */
const addFollower = asyncHandler(async (req, res) => {
    const { res_model, res_id, partner_id, notification_preference = 'all' } = req.body;
    const userId = req.userID;
    const firmId = req.firmId;

    if (!res_model || !res_id || !partner_id) {
        throw CustomException('نموذج المورد ومعرف المورد ومعرف المتابع مطلوبان', 400);
    }

    // Check if follower already exists
    const existingFollower = await ChatterFollower.findOne({
        firmId,
        res_model,
        res_id,
        partner_id
    });

    if (existingFollower) {
        throw CustomException('المتابع موجود بالفعل لهذا السجل', 400);
    }

    // Verify the partner exists and belongs to the same firm
    const partner = await User.findOne({ _id: partner_id, firmId });
    if (!partner) {
        throw CustomException('المستخدم غير موجود أو لا ينتمي إلى نفس المكتب', 404);
    }

    const follower = await ChatterFollower.create({
        firmId,
        res_model,
        res_id,
        partner_id,
        notification_preference,
        is_active: true,
        createdBy: userId
    });

    await follower.populate([
        { path: 'partner_id', select: 'firstName lastName email avatar' },
        { path: 'createdBy', select: 'firstName lastName' }
    ]);

    res.status(201).json({
        success: true,
        message: 'تم إضافة المتابع بنجاح',
        data: follower
    });
});

/**
 * Remove a follower
 * DELETE /api/chatter/followers/:id
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
 * PATCH /api/chatter/followers/:id/notification-preference
 */
const updateNotificationPreference = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { notification_preference } = req.body;
    const firmId = req.firmId;
    const userId = req.userID;

    if (!notification_preference) {
        throw CustomException('تفضيل الإشعارات مطلوب', 400);
    }

    const validPreferences = ['all', 'mentions', 'none'];
    if (!validPreferences.includes(notification_preference)) {
        throw CustomException('تفضيل الإشعارات غير صالح. القيم المسموح بها: all, mentions, none', 400);
    }

    const follower = await ChatterFollower.findOne({ _id: id, firmId });

    if (!follower) {
        throw CustomException('المتابع غير موجود', 404);
    }

    // Only the follower themselves can update their notification preference
    if (follower.partner_id.toString() !== userId.toString()) {
        throw CustomException('غير مصرح لك بتحديث تفضيلات الإشعارات لهذا المتابع', 403);
    }

    follower.notification_preference = notification_preference;
    await follower.save();

    await follower.populate([
        { path: 'partner_id', select: 'firstName lastName email avatar' },
        { path: 'createdBy', select: 'firstName lastName' }
    ]);

    res.status(200).json({
        success: true,
        message: 'تم تحديث تفضيلات الإشعارات بنجاح',
        data: follower
    });
});

/**
 * Get records the current user is following
 * GET /api/chatter/followers/my-followed
 */
const getMyFollowedRecords = asyncHandler(async (req, res) => {
    const { res_model, page = 1, limit = 50 } = req.query;
    const userId = req.userID;
    const firmId = req.firmId;

    const query = {
        firmId,
        partner_id: userId,
        is_active: true
    };

    if (res_model) {
        query.res_model = res_model;
    }

    const followedRecords = await ChatterFollower.find(query)
        .populate('partner_id', 'firstName lastName email avatar')
        .populate('createdBy', 'firstName lastName')
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
 * POST /api/chatter/followers/bulk
 */
const bulkAddFollowers = asyncHandler(async (req, res) => {
    const { res_model, res_id, partner_ids, notification_preference = 'all' } = req.body;
    const userId = req.userID;
    const firmId = req.firmId;

    if (!res_model || !res_id || !partner_ids || !Array.isArray(partner_ids) || partner_ids.length === 0) {
        throw CustomException('نموذج المورد ومعرف المورد ومعرفات المتابعين مطلوبة', 400);
    }

    // Verify all partners exist and belong to the same firm
    const partners = await User.find({ _id: { $in: partner_ids }, firmId });
    if (partners.length !== partner_ids.length) {
        throw CustomException('بعض المستخدمين غير موجودين أو لا ينتمون إلى نفس المكتب', 404);
    }

    // Get existing followers to avoid duplicates
    const existingFollowers = await ChatterFollower.find({
        firmId,
        res_model,
        res_id,
        partner_id: { $in: partner_ids }
    }).select('partner_id');

    const existingPartnerIds = existingFollowers.map(f => f.partner_id.toString());
    const newPartnerIds = partner_ids.filter(id => !existingPartnerIds.includes(id.toString()));

    if (newPartnerIds.length === 0) {
        throw CustomException('جميع المتابعين موجودون بالفعل لهذا السجل', 400);
    }

    // Create new followers
    const followersToCreate = newPartnerIds.map(partner_id => ({
        firmId,
        res_model,
        res_id,
        partner_id,
        notification_preference,
        is_active: true,
        createdBy: userId
    }));

    const createdFollowers = await ChatterFollower.insertMany(followersToCreate);

    // Populate the created followers
    const populatedFollowers = await ChatterFollower.find({
        _id: { $in: createdFollowers.map(f => f._id) }
    })
        .populate('partner_id', 'firstName lastName email avatar')
        .populate('createdBy', 'firstName lastName');

    res.status(201).json({
        success: true,
        message: `تم إضافة ${createdFollowers.length} متابع بنجاح`,
        data: {
            added: createdFollowers.length,
            skipped: existingPartnerIds.length,
            followers: populatedFollowers
        }
    });
});

/**
 * Toggle follow status for current user
 * POST /api/chatter/followers/toggle
 */
const toggleFollow = asyncHandler(async (req, res) => {
    const { res_model, res_id, notification_preference = 'all' } = req.body;
    const userId = req.userID;
    const firmId = req.firmId;

    if (!res_model || !res_id) {
        throw CustomException('نموذج المورد ومعرف المورد مطلوبان', 400);
    }

    const existingFollower = await ChatterFollower.findOne({
        firmId,
        res_model,
        res_id,
        partner_id: userId
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
            partner_id: userId,
            notification_preference,
            is_active: true,
            createdBy: userId
        });

        await follower.populate([
            { path: 'partner_id', select: 'firstName lastName email avatar' },
            { path: 'createdBy', select: 'firstName lastName' }
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
