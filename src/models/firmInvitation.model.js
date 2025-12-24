/**
 * Firm Invitation Model
 *
 * Handles invitations for lawyers to join law firms.
 * Supports the invitation workflow including creation, validation, and acceptance.
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const firmInvitationSchema = new mongoose.Schema({
    // Unique invitation code (e.g., INV-ABC123XYZ)
    code: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // The firm sending the invitation
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },

    // Email of the person being invited
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true
    },

    // Role the invited user will have in the firm
    role: {
        type: String,
        enum: ['admin', 'partner', 'lawyer', 'paralegal', 'secretary', 'accountant'],
        default: 'lawyer',
        required: true
    },

    // Custom permissions (optional, otherwise uses role defaults)
    permissions: {
        clients: { type: String, enum: ['none', 'view', 'edit', 'full'], default: null },
        cases: { type: String, enum: ['none', 'view', 'edit', 'full'], default: null },
        leads: { type: String, enum: ['none', 'view', 'edit', 'full'], default: null },
        invoices: { type: String, enum: ['none', 'view', 'edit', 'full'], default: null },
        payments: { type: String, enum: ['none', 'view', 'edit', 'full'], default: null },
        expenses: { type: String, enum: ['none', 'view', 'edit', 'full'], default: null },
        documents: { type: String, enum: ['none', 'view', 'edit', 'full'], default: null },
        tasks: { type: String, enum: ['none', 'view', 'edit', 'full'], default: null },
        events: { type: String, enum: ['none', 'view', 'edit', 'full'], default: null },
        timeTracking: { type: String, enum: ['none', 'view', 'edit', 'full'], default: null },
        reports: { type: String, enum: ['none', 'view', 'edit', 'full'], default: null },
        settings: { type: String, enum: ['none', 'view', 'edit', 'full'], default: null },
        team: { type: String, enum: ['none', 'view', 'edit', 'full'], default: null },
        hr: { type: String, enum: ['none', 'view', 'edit', 'full'], default: null }
    },

    // Optional message from the inviter
    message: {
        type: String,
        maxlength: 500
    },

    // Invitation status
    status: {
        type: String,
        enum: ['pending', 'accepted', 'expired', 'cancelled', 'declined'],
        default: 'pending',
        index: true
    },

    // Expiration date
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },

    // User who sent the invitation
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // When the invitation was accepted
    acceptedAt: {
        type: Date,
        default: null
    },

    // User who accepted the invitation
    acceptedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    // When the invitation was cancelled
    cancelledAt: {
        type: Date,
        default: null
    },

    // User who cancelled the invitation
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    // Number of times the invitation email was sent
    emailSentCount: {
        type: Number,
        default: 1
    },

    // Last time the invitation email was sent
    lastEmailSentAt: {
        type: Date,
        default: Date.now
    }
}, {
    versionKey: false,
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
firmInvitationSchema.index({ firmId: 1, email: 1 });
firmInvitationSchema.index({ firmId: 1, status: 1 });
firmInvitationSchema.index({ expiresAt: 1, status: 1 });

// TTL index to auto-delete expired/completed invitations
// Delete 90 days after expiration to maintain audit trail for accepted/rejected invitations
firmInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a unique invitation code
 */
firmInvitationSchema.statics.generateCode = function() {
    const randomPart = crypto.randomBytes(6).toString('base64')
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 9)
        .toUpperCase();
    return `INV-${randomPart}`;
};

/**
 * Find a valid (non-expired, pending) invitation by code
 */
firmInvitationSchema.statics.findValidByCode = async function(code) {
    const invitation = await this.findOne({
        code: code.toUpperCase(),
        status: 'pending',
        expiresAt: { $gt: new Date() }
    }).populate('firmId', 'name nameEnglish licenseNumber')
      .populate('invitedBy', 'firstName lastName');

    return invitation;
};

/**
 * Check if there's an active invitation for an email in a firm
 */
firmInvitationSchema.statics.hasActiveInvitation = async function(firmId, email) {
    const count = await this.countDocuments({
        firmId,
        email: email.toLowerCase(),
        status: 'pending',
        expiresAt: { $gt: new Date() }
    });
    return count > 0;
};

/**
 * Mark expired invitations as expired (for cleanup job)
 */
firmInvitationSchema.statics.markExpired = async function() {
    const result = await this.updateMany(
        {
            status: 'pending',
            expiresAt: { $lt: new Date() }
        },
        {
            $set: { status: 'expired' }
        }
    );
    return result.modifiedCount;
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if the invitation is valid (not expired and pending)
 */
firmInvitationSchema.methods.isValid = function() {
    return this.status === 'pending' && this.expiresAt > new Date();
};

/**
 * Accept the invitation
 */
firmInvitationSchema.methods.accept = async function(userId) {
    if (!this.isValid()) {
        throw new Error('Invitation is no longer valid');
    }

    this.status = 'accepted';
    this.acceptedAt = new Date();
    this.acceptedBy = userId;

    await this.save();
    return this;
};

/**
 * Cancel the invitation
 */
firmInvitationSchema.methods.cancel = async function(userId) {
    if (this.status !== 'pending') {
        throw new Error('Only pending invitations can be cancelled');
    }

    this.status = 'cancelled';
    this.cancelledAt = new Date();
    this.cancelledBy = userId;

    await this.save();
    return this;
};

/**
 * Decline the invitation
 */
firmInvitationSchema.methods.decline = async function(userId) {
    if (!this.isValid()) {
        throw new Error('Invitation is no longer valid');
    }

    this.status = 'declined';
    this.acceptedAt = new Date(); // Store when it was declined
    this.acceptedBy = userId; // Store who declined it

    await this.save();
    return this;
};

/**
 * Resend the invitation email (updates tracking)
 */
firmInvitationSchema.methods.markEmailSent = async function() {
    this.emailSentCount += 1;
    this.lastEmailSentAt = new Date();
    await this.save();
    return this;
};

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

firmInvitationSchema.pre('save', function(next) {
    // Ensure code is uppercase
    if (this.code) {
        this.code = this.code.toUpperCase();
    }
    next();
});

module.exports = mongoose.model('FirmInvitation', firmInvitationSchema);
