/**
 * Password History Model
 *
 * Tracks historical passwords for each user to prevent password reuse.
 * Stores hashed passwords with creation timestamps.
 * Automatically limits to last N passwords per user (configurable, default 12).
 */

const mongoose = require('mongoose');

const passwordHistorySchema = new mongoose.Schema({
    // User reference
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Hashed password (bcrypt)
    passwordHash: {
        type: String,
        required: true
    },

    // When this password was set
    createdAt: {
        type: Date,
        default: Date.now,
        required: true,
        index: true
    }
}, {
    versionKey: false,
    timestamps: false // Using manual createdAt field
});

// Compound index for efficient queries
passwordHistorySchema.index({ userId: 1, createdAt: -1 });

// TTL index - automatically delete records older than 2 years (730 days)
// This keeps the database clean while maintaining sufficient history
passwordHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 }); // 730 days

/**
 * Static method to add a password to history
 * Automatically maintains the history limit per user
 *
 * @param {ObjectId} userId - User ID
 * @param {string} passwordHash - Bcrypt hashed password
 * @param {number} maxHistory - Maximum number of passwords to keep (default: 12)
 * @returns {Promise<Object>} - Created password history record
 */
passwordHistorySchema.statics.addPasswordToHistory = async function(userId, passwordHash, maxHistory = 12) {
    // Add new password to history
    const newRecord = await this.create({
        userId,
        passwordHash,
        createdAt: new Date()
    });

    // Count total passwords for this user
    const count = await this.countDocuments({ userId });

    // If exceeds limit, delete oldest entries
    if (count > maxHistory) {
        const excess = count - maxHistory;

        // Get oldest password IDs to delete
        const oldestPasswords = await this.find({ userId })
            .sort({ createdAt: 1 })
            .limit(excess)
            .select('_id')
            .lean();

        const idsToDelete = oldestPasswords.map(p => p._id);

        // Delete oldest passwords
        await this.deleteMany({ _id: { $in: idsToDelete } });
    }

    return newRecord;
};

/**
 * Static method to get user's password history
 *
 * @param {ObjectId} userId - User ID
 * @param {number} limit - Number of recent passwords to retrieve (default: 12)
 * @returns {Promise<Array>} - Array of password history records
 */
passwordHistorySchema.statics.getUserPasswordHistory = async function(userId, limit = 12) {
    return this.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

/**
 * Static method to check if a password exists in user's history
 *
 * @param {ObjectId} userId - User ID
 * @param {string} plainPassword - Plain text password to check
 * @param {number} historyCount - Number of recent passwords to check (default: 12)
 * @returns {Promise<boolean>} - True if password was found in history
 */
passwordHistorySchema.statics.isPasswordInHistory = async function(userId, plainPassword, historyCount = 12) {
    const bcrypt = require('bcrypt');

    const history = await this.getUserPasswordHistory(userId, historyCount);

    for (const record of history) {
        const matches = await bcrypt.compare(plainPassword, record.passwordHash);
        if (matches) {
            return true;
        }
    }

    return false;
};

/**
 * Static method to clear user's password history
 * Useful when user account is deleted or on admin request
 *
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} - Delete result
 */
passwordHistorySchema.statics.clearUserHistory = async function(userId) {
    return this.deleteMany({ userId });
};

/**
 * Static method to get password history count for a user
 *
 * @param {ObjectId} userId - User ID
 * @returns {Promise<number>} - Count of password history records
 */
passwordHistorySchema.statics.getHistoryCount = async function(userId) {
    return this.countDocuments({ userId });
};

module.exports = mongoose.model('PasswordHistory', passwordHistorySchema);
