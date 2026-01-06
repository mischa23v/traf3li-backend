const mongoose = require('mongoose');

/**
 * UserCompanyAccess Model - Cross-Company Access Control
 *
 * Manages user access to multiple companies/firms in a hierarchy.
 * Users can have different roles in different companies.
 * This enables parent company admins to access child company data.
 */

const userCompanyAccessSchema = new mongoose.Schema({
    // The user being granted access
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // The firm/company they're being granted access to
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },

    // Role for this specific company access
    role: {
        type: String,
        enum: ['owner', 'admin', 'manager', 'employee', 'viewer'],
        default: 'viewer'
    },

    // Specific permissions for this access (overrides role defaults)
    permissions: [{
        type: String,
        enum: [
            'view_clients', 'edit_clients',
            'view_cases', 'edit_cases',
            'view_invoices', 'edit_invoices',
            'view_reports',
            'view_team',
            'manage_settings'
        ]
    }],

    // Can user access child companies of this firm?
    canAccessChildren: {
        type: Boolean,
        default: false
    },

    // Can user access parent company data?
    canAccessParent: {
        type: Boolean,
        default: false
    },

    // Is this the user's default/primary company?
    isDefault: {
        type: Boolean,
        default: false
    },

    // Access status
    status: {
        type: String,
        enum: ['active', 'inactive', 'pending', 'revoked'],
        default: 'active',
        index: true
    },

    // Who granted this access
    grantedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // When access was granted
    grantedAt: {
        type: Date,
        default: Date.now
    },

    // Access expiration (optional)
    expiresAt: {
        type: Date,
        default: null
    },

    // Notes about this access grant
    notes: String
}, {
    versionKey: false,
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
userCompanyAccessSchema.index({ userId: 1, firmId: 1 }, { unique: true });
userCompanyAccessSchema.index({ userId: 1, status: 1 });
userCompanyAccessSchema.index({ firmId: 1, status: 1 });
userCompanyAccessSchema.index({ userId: 1, isDefault: 1 });
userCompanyAccessSchema.index({ expiresAt: 1 }, { sparse: true });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get all accessible companies for a user
userCompanyAccessSchema.statics.getAccessibleCompanies = async function(userId) {
    const accesses = await this.find({
        userId,
        status: 'active',
        $or: [
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
        ]
    })
    .populate('firmId', '_id name nameArabic nameEnglish code logo level status industry parentFirmId')
    .lean();

    return accesses.map(a => ({
        ...a.firmId,
        accessRole: a.role,
        accessPermissions: a.permissions,
        canAccessChildren: a.canAccessChildren,
        canAccessParent: a.canAccessParent,
        isDefault: a.isDefault
    }));
};

// Get user's access to a specific company
userCompanyAccessSchema.statics.getAccess = async function(userId, firmId) {
    return this.findOne({
        userId,
        firmId,
        status: 'active',
        $or: [
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
        ]
    }).lean();
};

// Check if user has access to a company
userCompanyAccessSchema.statics.hasAccess = async function(userId, firmId) {
    const access = await this.getAccess(userId, firmId);
    return !!access;
};

// Grant access to a company
userCompanyAccessSchema.statics.grantAccess = async function(userId, firmId, options = {}) {
    const {
        role = 'viewer',
        permissions = [],
        canAccessChildren = false,
        canAccessParent = false,
        isDefault = false,
        grantedBy,
        expiresAt = null,
        notes = ''
    } = options;

    // If setting as default, unset other defaults
    if (isDefault) {
        await this.updateMany(
            { userId, isDefault: true },
            { $set: { isDefault: false } }
        );
    }

    return this.findOneAndUpdate(
        { userId, firmId },
        {
            $set: {
                role,
                permissions,
                canAccessChildren,
                canAccessParent,
                isDefault,
                status: 'active',
                grantedBy,
                grantedAt: new Date(),
                expiresAt,
                notes
            }
        },
        { upsert: true, new: true }
    );
};

// Update access
userCompanyAccessSchema.statics.updateAccess = async function(userId, firmId, updates) {
    const allowedUpdates = ['role', 'permissions', 'canAccessChildren', 'canAccessParent', 'isDefault', 'status', 'expiresAt', 'notes'];
    const updateObj = {};

    for (const key of allowedUpdates) {
        if (updates[key] !== undefined) {
            updateObj[key] = updates[key];
        }
    }

    // If setting as default, unset other defaults
    if (updates.isDefault) {
        await this.updateMany(
            { userId, firmId: { $ne: firmId }, isDefault: true },
            { $set: { isDefault: false } }
        );
    }

    return this.findOneAndUpdate(
        { userId, firmId },
        { $set: updateObj },
        { new: true }
    );
};

// Revoke access
userCompanyAccessSchema.statics.revokeAccess = async function(userId, firmId) {
    return this.findOneAndUpdate(
        { userId, firmId },
        { $set: { status: 'revoked' } },
        { new: true }
    );
};

// Get all users with access to a company
userCompanyAccessSchema.statics.getCompanyAccessList = async function(firmId) {
    return this.find({
        firmId,
        status: 'active',
        $or: [
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
        ]
    })
    .populate('userId', '_id firstName lastName email image')
    .populate('grantedBy', '_id firstName lastName')
    .lean();
};

// Get user's default company
userCompanyAccessSchema.statics.getDefaultCompany = async function(userId) {
    const access = await this.findOne({
        userId,
        isDefault: true,
        status: 'active'
    }).populate('firmId').lean();

    return access?.firmId || null;
};

// Set default company for user
userCompanyAccessSchema.statics.setDefaultCompany = async function(userId, firmId) {
    // Unset all defaults
    await this.updateMany(
        { userId, isDefault: true },
        { $set: { isDefault: false } }
    );

    // Set new default
    return this.findOneAndUpdate(
        { userId, firmId },
        { $set: { isDefault: true } },
        { new: true }
    );
};

// Clean up expired accesses
userCompanyAccessSchema.statics.cleanupExpired = async function() {
    return this.updateMany(
        {
            expiresAt: { $lt: new Date() },
            status: 'active'
        },
        { $set: { status: 'revoked' } }
    );
};

module.exports = mongoose.model('UserCompanyAccess', userCompanyAccessSchema);
