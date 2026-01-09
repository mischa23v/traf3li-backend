/**
 * Chatter Followers Extended Routes
 *
 * Follower management for Odoo-style chatter functionality.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - GET /:resModel/:resId        - Get followers for a record
 * - POST /                       - Add follower
 * - DELETE /:followerId          - Remove follower
 * - PATCH /:followerId/preferences - Update follower preferences
 * - POST /bulk-add               - Bulk add followers
 * - POST /bulk-remove            - Bulk remove followers
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const User = require('../models/user.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Valid resource models that can have followers
const VALID_RESOURCE_MODELS = [
    'case', 'task', 'lead', 'contact', 'invoice', 'document',
    'opportunity', 'ticket', 'project', 'appointment'
];

// Allowed preference fields
const ALLOWED_PREFERENCE_FIELDS = [
    'emailNotifications', 'pushNotifications', 'digestFrequency',
    'notifyOnComment', 'notifyOnStatusChange', 'notifyOnAssignment',
    'notifyOnMention', 'notifyOnAttachment'
];

/**
 * GET /:resModel/:resId - Get followers for a record
 */
router.get('/:resModel/:resId', async (req, res, next) => {
    try {
        const { resModel, resId } = req.params;
        const { page, limit } = sanitizePagination(req.query);

        if (!VALID_RESOURCE_MODELS.includes(resModel)) {
            throw CustomException(`Invalid resource model. Must be one of: ${VALID_RESOURCE_MODELS.join(', ')}`, 400);
        }

        const safeResId = sanitizeObjectId(resId, 'resId');

        const firm = await Firm.findOne(req.firmQuery).select('chatter.followers').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        // Filter followers for this resource
        let followers = (firm.chatter?.followers || []).filter(
            f => f.resModel === resModel && f.resId?.toString() === safeResId.toString()
        );

        const total = followers.length;

        // Paginate
        followers = followers.slice((page - 1) * limit, page * limit);

        // Get user details
        const userIds = followers.map(f => f.userId).filter(Boolean);
        const users = await User.find({ _id: { $in: userIds } })
            .select('firstName lastName email avatar')
            .lean();

        const usersMap = {};
        users.forEach(u => {
            usersMap[u._id.toString()] = u;
        });

        // Enrich followers with user details
        const enrichedFollowers = followers.map(f => ({
            ...f,
            user: usersMap[f.userId?.toString()] || null
        }));

        res.json({
            success: true,
            data: enrichedFollowers,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST / - Add follower
 */
router.post('/', async (req, res, next) => {
    try {
        const { resModel, resId, userId, email, preferences } = req.body;

        if (!resModel || !resId) {
            throw CustomException('Resource model and ID are required', 400);
        }

        if (!VALID_RESOURCE_MODELS.includes(resModel)) {
            throw CustomException(`Invalid resource model. Must be one of: ${VALID_RESOURCE_MODELS.join(', ')}`, 400);
        }

        if (!userId && !email) {
            throw CustomException('Either userId or email is required', 400);
        }

        const safeResId = sanitizeObjectId(resId, 'resId');
        let safeUserId = userId ? sanitizeObjectId(userId, 'userId') : null;

        // Look up user by email if userId not provided
        if (!safeUserId && email) {
            const user = await User.findOne({ email: email.toLowerCase() }).select('_id').lean();
            if (!user) {
                throw CustomException('User with this email not found', 404);
            }
            safeUserId = user._id;
        }

        const firm = await Firm.findOne(req.firmQuery).select('chatter.followers');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.chatter) firm.chatter = {};
        if (!firm.chatter.followers) firm.chatter.followers = [];

        // Check if already following
        const existing = firm.chatter.followers.find(
            f => f.resModel === resModel &&
                f.resId?.toString() === safeResId.toString() &&
                f.userId?.toString() === safeUserId.toString()
        );

        if (existing) {
            throw CustomException('User is already following this record', 400);
        }

        const follower = {
            _id: new mongoose.Types.ObjectId(),
            resModel,
            resId: safeResId,
            userId: safeUserId,
            preferences: preferences ? pickAllowedFields(preferences, ALLOWED_PREFERENCE_FIELDS) : {
                emailNotifications: true,
                notifyOnComment: true,
                notifyOnStatusChange: true,
                notifyOnMention: true
            },
            followedAt: new Date(),
            followedBy: req.userID
        };

        firm.chatter.followers.push(follower);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Follower added',
            data: follower
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:followerId - Remove follower
 */
router.delete('/:followerId', async (req, res, next) => {
    try {
        const followerId = sanitizeObjectId(req.params.followerId, 'followerId');

        const firm = await Firm.findOne(req.firmQuery).select('chatter.followers');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const followerIndex = (firm.chatter?.followers || []).findIndex(
            f => f._id?.toString() === followerId.toString()
        );

        if (followerIndex === -1) {
            throw CustomException('Follower not found', 404);
        }

        firm.chatter.followers.splice(followerIndex, 1);
        await firm.save();

        res.json({
            success: true,
            message: 'Follower removed'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /:followerId/preferences - Update follower preferences
 */
router.patch('/:followerId/preferences', async (req, res, next) => {
    try {
        const followerId = sanitizeObjectId(req.params.followerId, 'followerId');
        const safePreferences = pickAllowedFields(req.body, ALLOWED_PREFERENCE_FIELDS);

        const firm = await Firm.findOne(req.firmQuery).select('chatter.followers');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const follower = (firm.chatter?.followers || []).find(
            f => f._id?.toString() === followerId.toString()
        );

        if (!follower) {
            throw CustomException('Follower not found', 404);
        }

        // Only allow updating own preferences (unless admin)
        if (follower.userId?.toString() !== req.userID && !req.isAdmin) {
            throw CustomException('Can only update your own follower preferences', 403);
        }

        if (!follower.preferences) follower.preferences = {};
        Object.assign(follower.preferences, safePreferences);
        follower.preferencesUpdatedAt = new Date();

        await firm.save();

        res.json({
            success: true,
            message: 'Preferences updated',
            data: follower.preferences
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /bulk-add - Bulk add followers
 */
router.post('/bulk-add', async (req, res, next) => {
    try {
        const { resModel, resId, userIds, defaultPreferences } = req.body;

        if (!resModel || !resId) {
            throw CustomException('Resource model and ID are required', 400);
        }

        if (!VALID_RESOURCE_MODELS.includes(resModel)) {
            throw CustomException(`Invalid resource model. Must be one of: ${VALID_RESOURCE_MODELS.join(', ')}`, 400);
        }

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            throw CustomException('User IDs array is required', 400);
        }

        if (userIds.length > 50) {
            throw CustomException('Maximum 50 followers can be added at once', 400);
        }

        const safeResId = sanitizeObjectId(resId, 'resId');
        const safeUserIds = userIds.map(id => sanitizeObjectId(id, 'userId'));

        const firm = await Firm.findOne(req.firmQuery).select('chatter.followers');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.chatter) firm.chatter = {};
        if (!firm.chatter.followers) firm.chatter.followers = [];

        // Get existing follower user IDs for this resource
        const existingUserIds = new Set(
            firm.chatter.followers
                .filter(f => f.resModel === resModel && f.resId?.toString() === safeResId.toString())
                .map(f => f.userId?.toString())
        );

        const added = [];
        const skipped = [];

        const prefs = defaultPreferences ? pickAllowedFields(defaultPreferences, ALLOWED_PREFERENCE_FIELDS) : {
            emailNotifications: true,
            notifyOnComment: true,
            notifyOnStatusChange: true,
            notifyOnMention: true
        };

        for (const userId of safeUserIds) {
            if (existingUserIds.has(userId.toString())) {
                skipped.push(userId.toString());
                continue;
            }

            const follower = {
                _id: new mongoose.Types.ObjectId(),
                resModel,
                resId: safeResId,
                userId,
                preferences: { ...prefs },
                followedAt: new Date(),
                followedBy: req.userID
            };

            firm.chatter.followers.push(follower);
            added.push(userId.toString());
        }

        await firm.save();

        res.status(201).json({
            success: true,
            message: `Added ${added.length} follower(s)`,
            data: {
                added: added.length,
                skipped: skipped.length,
                skippedIds: skipped
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /bulk-remove - Bulk remove followers
 */
router.post('/bulk-remove', async (req, res, next) => {
    try {
        const { resModel, resId, userIds, followerIds } = req.body;

        const firm = await Firm.findOne(req.firmQuery).select('chatter.followers');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let removed = 0;

        if (followerIds && Array.isArray(followerIds)) {
            // Remove by follower IDs
            if (followerIds.length > 50) {
                throw CustomException('Maximum 50 followers can be removed at once', 400);
            }

            const safeFollowerIds = new Set(
                followerIds.map(id => sanitizeObjectId(id, 'followerId').toString())
            );

            const initialCount = firm.chatter.followers.length;
            firm.chatter.followers = firm.chatter.followers.filter(
                f => !safeFollowerIds.has(f._id?.toString())
            );
            removed = initialCount - firm.chatter.followers.length;

        } else if (resModel && resId && userIds && Array.isArray(userIds)) {
            // Remove by resource + user IDs
            if (!VALID_RESOURCE_MODELS.includes(resModel)) {
                throw CustomException(`Invalid resource model. Must be one of: ${VALID_RESOURCE_MODELS.join(', ')}`, 400);
            }

            if (userIds.length > 50) {
                throw CustomException('Maximum 50 followers can be removed at once', 400);
            }

            const safeResId = sanitizeObjectId(resId, 'resId').toString();
            const safeUserIds = new Set(
                userIds.map(id => sanitizeObjectId(id, 'userId').toString())
            );

            const initialCount = firm.chatter.followers.length;
            firm.chatter.followers = firm.chatter.followers.filter(f => {
                if (f.resModel !== resModel) return true;
                if (f.resId?.toString() !== safeResId) return true;
                return !safeUserIds.has(f.userId?.toString());
            });
            removed = initialCount - firm.chatter.followers.length;

        } else {
            throw CustomException('Either followerIds or (resModel + resId + userIds) is required', 400);
        }

        await firm.save();

        res.json({
            success: true,
            message: `Removed ${removed} follower(s)`,
            data: { removed }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
