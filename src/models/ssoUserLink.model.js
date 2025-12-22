const mongoose = require('mongoose');

/**
 * SSO User Link Model
 *
 * Links users to OAuth SSO providers and tracks external identities.
 * Enables single user to have multiple SSO provider connections.
 *
 * Use Cases:
 * - User can login with Google or Microsoft
 * - Track which SSO identity corresponds to which user
 * - Support for multiple external identities per user
 * - Audit trail of SSO usage
 */

const ssoUserLinkSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // USER ASSOCIATION
    // ═══════════════════════════════════════════════════════════════
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
        // Internal user ID in our system
    },

    // ═══════════════════════════════════════════════════════════════
    // SSO PROVIDER ASSOCIATION
    // ═══════════════════════════════════════════════════════════════
    providerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SsoProvider',
        required: true,
        index: true
        // Reference to OAuth provider configuration
    },

    providerType: {
        type: String,
        enum: ['google', 'microsoft', 'okta', 'auth0', 'custom'],
        required: true,
        index: true
        // Cached provider type for faster queries
    },

    // ═══════════════════════════════════════════════════════════════
    // EXTERNAL IDENTITY
    // ═══════════════════════════════════════════════════════════════
    externalId: {
        type: String,
        required: true,
        index: true
        // Unique user identifier from SSO provider
        // Usually the 'sub' claim in OAuth/OIDC
        // e.g., "108812345678901234567" (Google)
        //       "00u1a2b3c4d5e6f7g8h9" (Okta)
    },

    externalEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true
        // Email address from SSO provider
        // Used for matching and verification
    },

    externalUsername: {
        type: String,
        trim: true
        // Username from SSO provider (if available)
    },

    // ═══════════════════════════════════════════════════════════════
    // PROFILE DATA FROM SSO
    // ═══════════════════════════════════════════════════════════════
    externalProfile: {
        firstName: String,
        lastName: String,
        displayName: String,
        avatar: String,
        locale: String,
        timezone: String
        // Additional profile data from OAuth provider
        // Can be used to update user profile on login
    },

    // ═══════════════════════════════════════════════════════════════
    // PROVISIONING INFO
    // ═══════════════════════════════════════════════════════════════
    isProvisioned: {
        type: Boolean,
        default: false
        // Was this user created via JIT provisioning?
        // true = user was auto-created on first SSO login
        // false = user existed before SSO linkage
    },

    provisionedAt: {
        type: Date,
        default: null
        // When was the user provisioned via this SSO provider?
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    isActive: {
        type: Boolean,
        default: true,
        index: true
        // Can this SSO link be used for authentication?
        // false = link is disabled (user can't login via this provider)
    },

    isPrimary: {
        type: Boolean,
        default: false
        // Is this the primary SSO method for this user?
        // Used for default login method
    },

    // ═══════════════════════════════════════════════════════════════
    // AUTHENTICATION TRACKING
    // ═══════════════════════════════════════════════════════════════
    lastLoginAt: {
        type: Date,
        default: null,
        index: true
        // Last successful login via this SSO provider
    },

    loginCount: {
        type: Number,
        default: 0
        // Total number of logins via this SSO provider
    },

    lastLoginIp: {
        type: String
        // IP address of last SSO login
    },

    lastLoginUserAgent: {
        type: String
        // User agent of last SSO login
    },

    // ═══════════════════════════════════════════════════════════════
    // OAUTH TOKENS (Optional - for API access)
    // ═══════════════════════════════════════════════════════════════
    // Note: These are not encrypted in this model
    // If you need to store refresh tokens securely, use encryption plugin
    accessToken: {
        type: String,
        select: false
        // OAuth access token (if stored)
        // Usually short-lived, should be encrypted if stored
    },

    accessTokenExpiresAt: {
        type: Date,
        select: false
        // When does the access token expire?
    },

    refreshToken: {
        type: String,
        select: false
        // OAuth refresh token (if stored)
        // Long-lived, MUST be encrypted if stored
    },

    tokenScopes: {
        type: [String],
        select: false
        // Scopes granted in the access token
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
        // Additional metadata from SSO provider
        // Can store custom claims, groups, roles, etc.
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT TRAIL
    // ═══════════════════════════════════════════════════════════════
    linkedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
        // Who created this SSO link?
        // null = auto-linked via JIT provisioning
    },

    linkedAt: {
        type: Date,
        default: Date.now
        // When was this SSO link created?
    },

    deactivatedAt: {
        type: Date,
        default: null
        // When was this SSO link deactivated?
    },

    deactivatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
        // Who deactivated this SSO link?
    },

    deactivationReason: {
        type: String,
        maxlength: 500
        // Why was this SSO link deactivated?
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
// Unique constraint: one external ID per provider
ssoUserLinkSchema.index(
    { providerId: 1, externalId: 1 },
    { unique: true }
);

// Compound indexes for common queries
ssoUserLinkSchema.index({ userId: 1, providerType: 1 });
ssoUserLinkSchema.index({ userId: 1, isActive: 1 });
ssoUserLinkSchema.index({ externalEmail: 1, providerType: 1 });
ssoUserLinkSchema.index({ providerId: 1, isActive: 1 });

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Record a successful login via this SSO link
 */
ssoUserLinkSchema.methods.recordLogin = async function(ip, userAgent) {
    this.lastLoginAt = new Date();
    this.loginCount = (this.loginCount || 0) + 1;
    this.lastLoginIp = ip || null;
    this.lastLoginUserAgent = userAgent || null;

    await this.save();
    return this;
};

/**
 * Update external profile data from OAuth provider
 */
ssoUserLinkSchema.methods.updateProfile = async function(profileData) {
    if (!profileData) return this;

    // Update external profile fields
    if (profileData.firstName) this.externalProfile.firstName = profileData.firstName;
    if (profileData.lastName) this.externalProfile.lastName = profileData.lastName;
    if (profileData.displayName) this.externalProfile.displayName = profileData.displayName;
    if (profileData.avatar) this.externalProfile.avatar = profileData.avatar;
    if (profileData.locale) this.externalProfile.locale = profileData.locale;
    if (profileData.timezone) this.externalProfile.timezone = profileData.timezone;

    // Update email if changed
    if (profileData.email && profileData.email !== this.externalEmail) {
        this.externalEmail = profileData.email.toLowerCase();
    }

    await this.save();
    return this;
};

/**
 * Deactivate this SSO link
 */
ssoUserLinkSchema.methods.deactivate = async function(deactivatedBy, reason) {
    this.isActive = false;
    this.deactivatedAt = new Date();
    this.deactivatedBy = deactivatedBy || null;
    this.deactivationReason = reason || null;

    await this.save();
    return this;
};

/**
 * Reactivate this SSO link
 */
ssoUserLinkSchema.methods.reactivate = async function() {
    this.isActive = true;
    this.deactivatedAt = null;
    this.deactivatedBy = null;
    this.deactivationReason = null;

    await this.save();
    return this;
};

/**
 * Check if SSO link is usable for authentication
 */
ssoUserLinkSchema.methods.canAuthenticate = function() {
    return this.isActive && !this.deactivatedAt;
};

/**
 * Get safe representation (without tokens)
 */
ssoUserLinkSchema.methods.toSafeObject = function() {
    const obj = this.toObject();

    // Remove sensitive fields
    delete obj.accessToken;
    delete obj.refreshToken;
    delete obj.tokenScopes;
    delete obj.accessTokenExpiresAt;

    return obj;
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Find SSO link by external ID and provider
 * @param {String} externalId - External user ID from provider
 * @param {ObjectId} providerId - Provider ID
 * @returns {Promise<SsoUserLink|null>}
 */
ssoUserLinkSchema.statics.findByExternalId = async function(externalId, providerId) {
    if (!externalId || !providerId) {
        return null;
    }

    return this.findOne({
        externalId,
        providerId,
        isActive: true
    }).populate('userId', 'username email firstName lastName firmId firmRole');
};

/**
 * Find SSO link by external email and provider type
 * @param {String} email - External email from provider
 * @param {String} providerType - Provider type (google, microsoft, etc.)
 * @returns {Promise<SsoUserLink|null>}
 */
ssoUserLinkSchema.statics.findByEmail = async function(email, providerType) {
    if (!email || !providerType) {
        return null;
    }

    return this.findOne({
        externalEmail: email.toLowerCase(),
        providerType,
        isActive: true
    }).populate('userId', 'username email firstName lastName firmId firmRole');
};

/**
 * Get all SSO links for a user
 * @param {ObjectId} userId - User ID
 * @param {Boolean} activeOnly - Return only active links
 * @returns {Promise<Array>}
 */
ssoUserLinkSchema.statics.getUserLinks = async function(userId, activeOnly = true) {
    if (!userId) {
        return [];
    }

    const query = { userId };
    if (activeOnly) {
        query.isActive = true;
    }

    return this.find(query)
        .populate('providerId', 'name providerType isEnabled')
        .sort({ isPrimary: -1, lastLoginAt: -1 });
};

/**
 * Check if user has SSO link with provider
 * @param {ObjectId} userId - User ID
 * @param {String} providerType - Provider type
 * @returns {Promise<Boolean>}
 */
ssoUserLinkSchema.statics.hasProviderLink = async function(userId, providerType) {
    if (!userId || !providerType) {
        return false;
    }

    const count = await this.countDocuments({
        userId,
        providerType,
        isActive: true
    });

    return count > 0;
};

/**
 * Set a link as primary for user
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} linkId - SSO Link ID to set as primary
 * @returns {Promise<void>}
 */
ssoUserLinkSchema.statics.setPrimaryLink = async function(userId, linkId) {
    if (!userId || !linkId) {
        throw new Error('User ID and Link ID are required');
    }

    // Remove primary flag from all user's links
    await this.updateMany(
        { userId },
        { $set: { isPrimary: false } }
    );

    // Set the specified link as primary
    await this.findByIdAndUpdate(linkId, {
        $set: { isPrimary: true }
    });
};

/**
 * Create or update SSO link for user
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} providerId - Provider ID
 * @param {Object} externalData - External user data from OAuth
 * @returns {Promise<SsoUserLink>}
 */
ssoUserLinkSchema.statics.createOrUpdate = async function(userId, providerId, externalData) {
    if (!userId || !providerId || !externalData) {
        throw new Error('User ID, Provider ID, and external data are required');
    }

    const { externalId, email, providerType, profile } = externalData;

    if (!externalId || !email || !providerType) {
        throw new Error('External ID, email, and provider type are required');
    }

    // Try to find existing link
    let link = await this.findOne({
        providerId,
        externalId
    });

    if (link) {
        // Update existing link
        link.userId = userId;
        link.externalEmail = email.toLowerCase();
        link.providerType = providerType;
        link.isActive = true;

        if (profile) {
            link.externalProfile = {
                firstName: profile.firstName || link.externalProfile?.firstName,
                lastName: profile.lastName || link.externalProfile?.lastName,
                displayName: profile.displayName || link.externalProfile?.displayName,
                avatar: profile.avatar || link.externalProfile?.avatar,
                locale: profile.locale || link.externalProfile?.locale,
                timezone: profile.timezone || link.externalProfile?.timezone
            };
        }

        await link.save();
    } else {
        // Create new link
        link = await this.create({
            userId,
            providerId,
            providerType,
            externalId,
            externalEmail: email.toLowerCase(),
            externalUsername: externalData.username,
            externalProfile: profile || {},
            isProvisioned: externalData.isProvisioned || false,
            provisionedAt: externalData.isProvisioned ? new Date() : null,
            linkedBy: externalData.linkedBy || null,
            isActive: true,
            isPrimary: false
        });
    }

    return link;
};

/**
 * Get SSO login statistics for a provider
 * @param {ObjectId} providerId - Provider ID
 * @param {Number} days - Number of days to look back
 * @returns {Promise<Object>}
 */
ssoUserLinkSchema.statics.getProviderStats = async function(providerId, days = 30) {
    if (!providerId) {
        throw new Error('Provider ID is required');
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totalLinks, activeLinks, recentLogins, provisionedUsers] = await Promise.all([
        this.countDocuments({ providerId }),
        this.countDocuments({ providerId, isActive: true }),
        this.countDocuments({
            providerId,
            lastLoginAt: { $gte: since }
        }),
        this.countDocuments({
            providerId,
            isProvisioned: true
        })
    ]);

    return {
        totalLinks,
        activeLinks,
        recentLogins,
        provisionedUsers,
        period: `${days} days`
    };
};

module.exports = mongoose.model('SsoUserLink', ssoUserLinkSchema);
