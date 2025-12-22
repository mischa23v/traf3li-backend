const mongoose = require('mongoose');

const emailSignatureSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },

    name: {
        type: String,
        required: true,
        trim: true
    },

    contentHtml: {
        type: String,
        required: true
    },

    isDefault: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    versionKey: false
});

// Indexes
emailSignatureSchema.index({ userId: 1, firmId: 1 });
emailSignatureSchema.index({ userId: 1, isDefault: 1 });

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

/**
 * Ensure only one default signature per user
 */
emailSignatureSchema.pre('save', async function(next) {
    if (this.isDefault && this.isModified('isDefault')) {
        // Unset other default signatures for this user
        await this.constructor.updateMany(
            {
                userId: this.userId,
                _id: { $ne: this._id },
                isDefault: true
            },
            {
                $set: { isDefault: false }
            }
        );
    }
    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get default signature for a user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} Default signature or null
 */
emailSignatureSchema.statics.getDefault = async function(userId) {
    return await this.findOne({ userId, isDefault: true });
};

/**
 * Get all signatures for a user
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} firmId - Optional firm ID filter
 * @returns {Promise<Array>} Array of signatures
 */
emailSignatureSchema.statics.getByUser = async function(userId, firmId = null) {
    const query = { userId };
    if (firmId) {
        query.firmId = firmId;
    }
    return await this.find(query).sort({ isDefault: -1, name: 1 });
};

/**
 * Set signature as default for user
 * @param {ObjectId} signatureId - Signature ID
 * @param {ObjectId} userId - User ID (for verification)
 * @returns {Promise<Object>} Updated signature
 */
emailSignatureSchema.statics.setDefault = async function(signatureId, userId) {
    const signature = await this.findOne({ _id: signatureId, userId });

    if (!signature) {
        throw new Error('Signature not found or does not belong to user');
    }

    // Unset other defaults
    await this.updateMany(
        { userId, _id: { $ne: signatureId } },
        { $set: { isDefault: false } }
    );

    // Set this one as default
    signature.isDefault = true;
    await signature.save();

    return signature;
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Set this signature as default
 * @returns {Promise<Object>} Updated signature
 */
emailSignatureSchema.methods.setAsDefault = async function() {
    return this.constructor.setDefault(this._id, this.userId);
};

module.exports = mongoose.model('EmailSignature', emailSignatureSchema);
