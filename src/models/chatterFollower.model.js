const mongoose = require('mongoose');

const chatterFollowerSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
     },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ═══════════════════════════════════════════════════════════════
    // RESOURCE REFERENCE (Polymorphic)
    // ═══════════════════════════════════════════════════════════════
    res_model: {
        type: String,
        required: true,
        index: true,
        trim: true
        // Examples: 'Case', 'Client', 'Lead', 'Task', 'Invoice', 'Expense', etc.
    },
    res_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
        // The document ID of the resource
    },

    // ═══════════════════════════════════════════════════════════════
    // FOLLOWER USER
    // ═══════════════════════════════════════════════════════════════
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // NOTIFICATION PREFERENCES
    // ═══════════════════════════════════════════════════════════════
    notification_type: {
        type: String,
        enum: ['all', 'mentions', 'none'],
        default: 'all'
    },

    // ═══════════════════════════════════════════════════════════════
    // FOLLOW TRACKING
    // ═══════════════════════════════════════════════════════════════
    follow_type: {
        type: String,
        enum: ['manual', 'auto_creator', 'auto_assigned', 'auto_mentioned'],
        default: 'manual'
    },
    added_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
        // Who added them (null if auto)
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
// Compound unique index - prevents duplicate followers
chatterFollowerSchema.index({ res_model: 1, res_id: 1, user_id: 1 }, { unique: true });

// Efficient queries for getting followers by resource
chatterFollowerSchema.index({ firmId: 1, res_model: 1, res_id: 1 });

// Efficient queries for getting records followed by a user
chatterFollowerSchema.index({ firmId: 1, user_id: 1 });

// Query by notification type
chatterFollowerSchema.index({ user_id: 1, notification_type: 1 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all followers for a specific record
 * @param {String} resModel - Model name (e.g., 'Case', 'Client')
 * @param {ObjectId|String} resId - Document ID
 * @param {ObjectId|String} firmId - Firm ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of follower documents
 */
chatterFollowerSchema.statics.getFollowers = async function(resModel, resId, firmId, options = {}) {
    try {
        if (!resModel || !resId || !firmId) {
            throw new Error('resModel, resId, and firmId are required');
        }

        const query = {
            res_model: resModel,
            res_id: new mongoose.Types.ObjectId(resId),
            firmId: new mongoose.Types.ObjectId(firmId)
        };

        // Filter by notification type if provided
        if (options.notification_type) {
            query.notification_type = options.notification_type;
        }

        // Filter by follow type if provided
        if (options.follow_type) {
            query.follow_type = options.follow_type;
        }

        const followers = await this.find(query)
            .populate('user_id', 'firstName lastName email avatar')
            .populate('added_by', 'firstName lastName avatar')
            .sort({ createdAt: -1 })
            .lean();

        return followers;
    } catch (error) {
        throw new Error(`Error fetching followers: ${error.message}`);
    }
};

/**
 * Add a follower to a record
 * @param {Object} data - Follower data
 * @returns {Promise<Object>} Created follower document
 */
chatterFollowerSchema.statics.addFollower = async function(data) {
    try {
        const {
            firmId,
            res_model,
            res_id,
            user_id,
            notification_type = 'all',
            follow_type = 'manual',
            added_by = null
        } = data;

        // Validate required fields
        if (!firmId || !res_model || !res_id || !user_id) {
            throw new Error('firmId, res_model, res_id, and user_id are required');
        }

        // Check if already following (use findOneAndUpdate with upsert for idempotency)
        const follower = await this.findOneAndUpdate(
            {
                res_model,
                res_id: new mongoose.Types.ObjectId(res_id),
                user_id: new mongoose.Types.ObjectId(user_id)
            },
            {
                firmId: new mongoose.Types.ObjectId(firmId),
                res_model,
                res_id: new mongoose.Types.ObjectId(res_id),
                user_id: new mongoose.Types.ObjectId(user_id),
                notification_type,
                follow_type,
                added_by: added_by ? new mongoose.Types.ObjectId(added_by) : null
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );

        // Populate references before returning
        await follower.populate([
            { path: 'user_id', select: 'firstName lastName email avatar' },
            { path: 'added_by', select: 'firstName lastName avatar' }
        ]);

        return follower;
    } catch (error) {
        if (error.code === 11000) {
            throw new Error('User is already following this record');
        }
        throw new Error(`Error adding follower: ${error.message}`);
    }
};

/**
 * Remove a follower from a record
 * @param {String} resModel - Model name (e.g., 'Case', 'Client')
 * @param {ObjectId|String} resId - Document ID
 * @param {ObjectId|String} userId - User ID to remove
 * @returns {Promise<Object>} Result with success status
 */
chatterFollowerSchema.statics.removeFollower = async function(resModel, resId, userId) {
    try {
        if (!resModel || !resId || !userId) {
            throw new Error('resModel, resId, and userId are required');
        }

        const result = await this.findOneAndDelete({
            res_model: resModel,
            res_id: new mongoose.Types.ObjectId(resId),
            user_id: new mongoose.Types.ObjectId(userId)
        });

        if (!result) {
            throw new Error('Follower relationship not found');
        }

        return {
            success: true,
            message: 'Follower removed successfully',
            follower: result
        };
    } catch (error) {
        throw new Error(`Error removing follower: ${error.message}`);
    }
};

/**
 * Check if a user is following a specific record
 * @param {String} resModel - Model name (e.g., 'Case', 'Client')
 * @param {ObjectId|String} resId - Document ID
 * @param {ObjectId|String} userId - User ID to check
 * @returns {Promise<Boolean>} True if following, false otherwise
 */
chatterFollowerSchema.statics.isFollowing = async function(resModel, resId, userId) {
    try {
        if (!resModel || !resId || !userId) {
            return false;
        }

        const follower = await this.findOne({
            res_model: resModel,
            res_id: new mongoose.Types.ObjectId(resId),
            user_id: new mongoose.Types.ObjectId(userId)
        }).lean();

        return !!follower;
    } catch (error) {
        throw new Error(`Error checking follower status: ${error.message}`);
    }
};

/**
 * Automatically add the creator as a follower
 * @param {String} resModel - Model name (e.g., 'Case', 'Client')
 * @param {ObjectId|String} resId - Document ID
 * @param {ObjectId|String} userId - Creator user ID
 * @param {ObjectId|String} firmId - Firm ID
 * @returns {Promise<Object>} Created follower document
 */
chatterFollowerSchema.statics.autoFollowCreator = async function(resModel, resId, userId, firmId) {
    try {
        if (!resModel || !resId || !userId || !firmId) {
            throw new Error('resModel, resId, userId, and firmId are required');
        }

        return await this.addFollower({
            firmId,
            res_model: resModel,
            res_id: resId,
            user_id: userId,
            notification_type: 'all',
            follow_type: 'auto_creator',
            added_by: null
        });
    } catch (error) {
        // Silently fail if already following - this is expected behavior
        if (error.message.includes('already following')) {
            return null;
        }
        throw new Error(`Error auto-following creator: ${error.message}`);
    }
};

/**
 * Get all records followed by a user
 * @param {ObjectId|String} userId - User ID
 * @param {ObjectId|String} firmId - Firm ID
 * @param {String} resModel - Optional: filter by specific model
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of followed records
 */
chatterFollowerSchema.statics.getFollowedRecords = async function(userId, firmId, resModel = null, options = {}) {
    try {
        if (!userId || !firmId) {
            throw new Error('userId and firmId are required');
        }

        const query = {
            user_id: new mongoose.Types.ObjectId(userId),
            firmId: new mongoose.Types.ObjectId(firmId)
        };

        // Filter by specific model if provided
        if (resModel) {
            query.res_model = resModel;
        }

        // Filter by notification type if provided
        if (options.notification_type) {
            query.notification_type = options.notification_type;
        }

        const limit = options.limit || 100;
        const skip = options.skip || 0;

        const followedRecords = await this.find(query)
            .populate('user_id', 'firstName lastName email avatar')
            .populate('added_by', 'firstName lastName avatar')
            .sort({ updatedAt: -1 })
            .limit(limit)
            .skip(skip)
            .lean();

        return followedRecords;
    } catch (error) {
        throw new Error(`Error fetching followed records: ${error.message}`);
    }
};

/**
 * Update notification preferences for a follower
 * @param {String} resModel - Model name (e.g., 'Case', 'Client')
 * @param {ObjectId|String} resId - Document ID
 * @param {ObjectId|String} userId - User ID
 * @param {String} notificationType - New notification type ('all', 'mentions', 'none')
 * @returns {Promise<Object>} Updated follower document
 */
chatterFollowerSchema.statics.updateNotificationPreference = async function(resModel, resId, userId, notificationType) {
    try {
        if (!resModel || !resId || !userId || !notificationType) {
            throw new Error('resModel, resId, userId, and notificationType are required');
        }

        if (!['all', 'mentions', 'none'].includes(notificationType)) {
            throw new Error('Invalid notification type. Must be: all, mentions, or none');
        }

        const follower = await this.findOneAndUpdate(
            {
                res_model: resModel,
                res_id: new mongoose.Types.ObjectId(resId),
                user_id: new mongoose.Types.ObjectId(userId)
            },
            {
                notification_type: notificationType
            },
            {
                new: true
            }
        );

        if (!follower) {
            throw new Error('Follower relationship not found');
        }

        await follower.populate([
            { path: 'user_id', select: 'firstName lastName email avatar' },
            { path: 'added_by', select: 'firstName lastName avatar' }
        ]);

        return follower;
    } catch (error) {
        throw new Error(`Error updating notification preference: ${error.message}`);
    }
};

/**
 * Get follower count for a specific record
 * @param {String} resModel - Model name (e.g., 'Case', 'Client')
 * @param {ObjectId|String} resId - Document ID
 * @param {ObjectId|String} firmId - Firm ID
 * @returns {Promise<Number>} Follower count
 */
chatterFollowerSchema.statics.getFollowerCount = async function(resModel, resId, firmId) {
    try {
        if (!resModel || !resId || !firmId) {
            throw new Error('resModel, resId, and firmId are required');
        }

        const count = await this.countDocuments({
            res_model: resModel,
            res_id: new mongoose.Types.ObjectId(resId),
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        return count;
    } catch (error) {
        throw new Error(`Error counting followers: ${error.message}`);
    }
};

/**
 * Bulk add followers to a record
 * @param {String} resModel - Model name
 * @param {ObjectId|String} resId - Document ID
 * @param {ObjectId|String} firmId - Firm ID
 * @param {Array<ObjectId|String>} userIds - Array of user IDs to add as followers
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} Array of created/updated follower documents
 */
chatterFollowerSchema.statics.bulkAddFollowers = async function(resModel, resId, firmId, userIds, options = {}) {
    try {
        if (!resModel || !resId || !firmId || !userIds || !Array.isArray(userIds)) {
            throw new Error('resModel, resId, firmId, and userIds array are required');
        }

        const {
            notification_type = 'all',
            follow_type = 'manual',
            added_by = null
        } = options;

        const followers = [];

        for (const userId of userIds) {
            try {
                const follower = await this.addFollower({
                    firmId,
                    res_model: resModel,
                    res_id: resId,
                    user_id: userId,
                    notification_type,
                    follow_type,
                    added_by
                });
                followers.push(follower);
            } catch (error) {
                // Continue if user is already following
                if (!error.message.includes('already following')) {
                    throw error;
                }
            }
        }

        return followers;
    } catch (error) {
        throw new Error(`Error bulk adding followers: ${error.message}`);
    }
};

/**
 * Remove all followers from a record
 * @param {String} resModel - Model name
 * @param {ObjectId|String} resId - Document ID
 * @returns {Promise<Object>} Result with deleted count
 */
chatterFollowerSchema.statics.removeAllFollowers = async function(resModel, resId) {
    try {
        if (!resModel || !resId) {
            throw new Error('resModel and resId are required');
        }

        const result = await this.deleteMany({
            res_model: resModel,
            res_id: new mongoose.Types.ObjectId(resId)
        });

        return {
            success: true,
            deletedCount: result.deletedCount,
            message: `Removed ${result.deletedCount} follower(s)`
        };
    } catch (error) {
        throw new Error(`Error removing all followers: ${error.message}`);
    }
};

module.exports = mongoose.model('ChatterFollower', chatterFollowerSchema);
