/**
 * Custom Claims Service - Supabase-style JWT Claims
 *
 * Generates custom claims for JWT tokens following Supabase Auth patterns.
 * Supports static, dynamic, and conditional claims based on user state,
 * firm settings, and business logic.
 *
 * Features:
 * - User-specific custom claims
 * - Firm-level claim configuration
 * - Role-based claims
 * - Permission-based claims
 * - Subscription tier claims
 * - Dynamic claim transformation
 *
 * @module customClaims.service
 */

const logger = require('../utils/logger');

/**
 * Claim Types:
 * - STATIC: Always included, never change
 * - DYNAMIC: Computed at token generation time
 * - CONDITIONAL: Included only when conditions are met
 */
const CLAIM_TYPE = {
    STATIC: 'static',
    DYNAMIC: 'dynamic',
    CONDITIONAL: 'conditional'
};

/**
 * Standard claim keys following Supabase patterns
 */
const STANDARD_CLAIMS = {
    // Identity claims
    USER_ID: 'user_id',
    EMAIL: 'email',
    EMAIL_VERIFIED: 'email_verified',
    PHONE: 'phone',
    PHONE_VERIFIED: 'phone_verified',

    // Role & permissions
    ROLE: 'role',
    ROLES: 'roles', // Array of roles
    PERMISSIONS: 'permissions',

    // Organization
    FIRM_ID: 'firm_id',
    FIRM_ROLE: 'firm_role',
    FIRM_STATUS: 'firm_status',

    // Subscription
    SUBSCRIPTION_TIER: 'subscription_tier',
    SUBSCRIPTION_STATUS: 'subscription_status',

    // Security
    MFA_ENABLED: 'mfa_enabled',
    SSO_PROVIDER: 'sso_provider',

    // Custom metadata
    USER_METADATA: 'user_metadata',
    APP_METADATA: 'app_metadata'
};

/**
 * Get standard claims for a user
 * These are the core claims that should always be present
 *
 * @param {Object} user - User object from database
 * @param {Object} context - Additional context (firm, permissions, etc.)
 * @returns {Object} Standard claims object
 */
const getStandardClaims = (user, context = {}) => {
    try {
        const claims = {
            // Identity
            [STANDARD_CLAIMS.USER_ID]: user._id.toString(),
            [STANDARD_CLAIMS.EMAIL]: user.email,
            [STANDARD_CLAIMS.EMAIL_VERIFIED]: user.isEmailVerified || false,

            // Role
            [STANDARD_CLAIMS.ROLE]: user.role || 'client',
        };

        // Phone (if available)
        if (user.phone) {
            claims[STANDARD_CLAIMS.PHONE] = user.phone;
            claims[STANDARD_CLAIMS.PHONE_VERIFIED] = false; // Can be extended later
        }

        // Firm information
        if (user.firmId) {
            claims[STANDARD_CLAIMS.FIRM_ID] = user.firmId.toString();
            claims[STANDARD_CLAIMS.FIRM_ROLE] = user.firmRole || null;
            claims[STANDARD_CLAIMS.FIRM_STATUS] = user.firmStatus || 'active';
        }

        // Security claims
        claims[STANDARD_CLAIMS.MFA_ENABLED] = user.mfaEnabled || false;

        if (user.ssoProvider) {
            claims[STANDARD_CLAIMS.SSO_PROVIDER] = user.ssoProvider;
        }

        // Subscription information (from firm or user)
        if (context.firm) {
            claims[STANDARD_CLAIMS.SUBSCRIPTION_TIER] = context.firm.subscription?.plan || 'free';
            claims[STANDARD_CLAIMS.SUBSCRIPTION_STATUS] = context.firm.subscription?.status || 'trial';
        }

        return claims;
    } catch (error) {
        logger.error('Error generating standard claims:', error);
        return {
            [STANDARD_CLAIMS.USER_ID]: user._id.toString(),
            [STANDARD_CLAIMS.EMAIL]: user.email,
            [STANDARD_CLAIMS.ROLE]: user.role || 'client'
        };
    }
};

/**
 * Get user-specific custom claims
 * These are claims stored directly on the user object
 *
 * @param {Object} user - User object with customClaims field
 * @returns {Object} User custom claims
 */
const getUserCustomClaims = (user) => {
    try {
        if (!user.customClaims || typeof user.customClaims !== 'object') {
            return {};
        }

        // Return a copy to prevent mutations
        return { ...user.customClaims };
    } catch (error) {
        logger.error('Error getting user custom claims:', error);
        return {};
    }
};

/**
 * Get firm-level custom claims
 * These are claims configured at the firm level
 *
 * @param {Object} firm - Firm object
 * @param {Object} user - User object
 * @returns {Object} Firm custom claims
 */
const getFirmCustomClaims = (firm, user) => {
    try {
        if (!firm) {
            return {};
        }

        const claims = {};

        // Firm settings as claims
        if (firm.settings) {
            claims.firm_timezone = firm.settings.timezone || 'Asia/Riyadh';
            claims.firm_language = firm.settings.language || 'ar';
        }

        // Enterprise settings
        if (firm.enterpriseSettings) {
            // Security policies
            if (firm.enterpriseSettings.enforce2FA) {
                claims.mfa_required = true;
            }

            // Data residency
            if (firm.enterpriseSettings.dataResidency?.primaryRegion) {
                claims.data_region = firm.enterpriseSettings.dataResidency.primaryRegion;
            }
        }

        // Member-specific claims from firm
        const member = firm.members?.find(m => m.userId.toString() === user._id.toString());
        if (member) {
            claims.firm_department = member.department || null;
            claims.firm_title = member.title || null;

            // Permissions as claims
            if (member.permissions) {
                claims.firm_permissions = member.permissions;
            }
        }

        return claims;
    } catch (error) {
        logger.error('Error getting firm custom claims:', error);
        return {};
    }
};

/**
 * Get dynamic claims based on user state
 * These are computed at token generation time
 *
 * @param {Object} user - User object
 * @param {Object} context - Additional context
 * @returns {Object} Dynamic claims
 */
const getDynamicClaims = (user, context = {}) => {
    try {
        const claims = {};

        // Account age (in days)
        if (user.createdAt) {
            const accountAgeDays = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
            claims.account_age_days = accountAgeDays;
        }

        // Last login timestamp
        if (user.lastLogin) {
            claims.last_login_at = new Date(user.lastLogin).toISOString();
        }

        // KYC status
        if (user.kycStatus) {
            claims.kyc_status = user.kycStatus;
            claims.kyc_verified = user.kycStatus === 'verified';
        }

        // Lawyer-specific claims
        if (user.role === 'lawyer' && user.lawyerProfile) {
            claims.lawyer_verified = user.lawyerProfile.verified || false;
            claims.lawyer_licensed = user.lawyerProfile.isLicensed || false;
            claims.lawyer_mode = user.lawyerMode || null;

            if (user.lawyerProfile.specialization?.length > 0) {
                claims.specializations = user.lawyerProfile.specialization;
            }
        }

        // Stripe payout status
        if (user.stripeConnectAccountId) {
            claims.stripe_connected = true;
            claims.stripe_payout_enabled = user.stripePayoutEnabled || false;
            claims.stripe_status = user.stripeAccountStatus || 'pending';
        }

        // Password expiration warning
        if (user.passwordExpiresAt) {
            const daysUntilExpiry = Math.floor((new Date(user.passwordExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (daysUntilExpiry <= 7) {
                claims.password_expires_soon = true;
                claims.password_expires_in_days = daysUntilExpiry;
            }
        }

        // Must change password flag
        if (user.mustChangePassword) {
            claims.must_change_password = true;
        }

        return claims;
    } catch (error) {
        logger.error('Error generating dynamic claims:', error);
        return {};
    }
};

/**
 * Get conditional claims based on user state and business rules
 * These claims are only included when certain conditions are met
 *
 * @param {Object} user - User object
 * @param {Object} context - Additional context
 * @returns {Object} Conditional claims
 */
const getConditionalClaims = (user, context = {}) => {
    try {
        const claims = {};

        // Admin-only claims
        if (user.role === 'admin') {
            claims.is_admin = true;
            claims.admin_level = 'full';
        }

        // Firm owner claims
        if (context.firm && context.firm.ownerId?.toString() === user._id.toString()) {
            claims.is_firm_owner = true;
            claims.firm_owner_permissions = 'all';
        }

        // Solo lawyer claims
        if (user.isSoloLawyer) {
            claims.is_solo_lawyer = true;
            claims.lawyer_work_mode = user.lawyerWorkMode || 'solo';
        }

        // Trial user
        if (context.firm?.subscription?.status === 'trial') {
            claims.is_trial_user = true;
            if (context.firm.subscription.trialEndsAt) {
                claims.trial_ends_at = new Date(context.firm.subscription.trialEndsAt).toISOString();
            }
        }

        // Departed employee - restricted access
        if (user.firmRole === 'departed') {
            claims.is_departed = true;
            claims.departed_at = user.departedAt ? new Date(user.departedAt).toISOString() : null;
            claims.access_level = 'read_only';
        }

        // SSO user
        if (user.isSSOUser) {
            claims.is_sso_user = true;
            claims.created_via_sso = user.createdViaSSO || false;
        }

        return claims;
    } catch (error) {
        logger.error('Error generating conditional claims:', error);
        return {};
    }
};

/**
 * Apply claim transformation rules
 * Allows for custom transformations defined in user.customClaims
 *
 * @param {Object} claims - Current claims object
 * @param {Object} transformRules - Transformation rules
 * @returns {Object} Transformed claims
 */
const applyTransformationRules = (claims, transformRules) => {
    try {
        if (!transformRules || typeof transformRules !== 'object') {
            return claims;
        }

        const transformedClaims = { ...claims };

        // Example transformation rules:
        // - rename: { old_key: 'new_key' }
        // - compute: { key: function }
        // - filter: { key: condition }

        if (transformRules.rename) {
            Object.keys(transformRules.rename).forEach(oldKey => {
                if (transformedClaims[oldKey] !== undefined) {
                    const newKey = transformRules.rename[oldKey];
                    transformedClaims[newKey] = transformedClaims[oldKey];
                    delete transformedClaims[oldKey];
                }
            });
        }

        return transformedClaims;
    } catch (error) {
        logger.error('Error applying transformation rules:', error);
        return claims;
    }
};

/**
 * Get all custom claims for a user
 * Main function that combines all claim sources
 *
 * @param {string|Object} userId - User ID or user object
 * @param {Object} context - Additional context (firm, permissions, etc.)
 * @returns {Promise<Object>} Complete custom claims object
 */
const getCustomClaims = async (userId, context = {}) => {
    try {
        let user;

        // If userId is already a user object, use it
        if (typeof userId === 'object' && userId._id) {
            user = userId;
        } else {
            // Otherwise, fetch the user
            // NOTE: Bypass firmIsolation filter - custom claims work for solo lawyers without firmId
            const User = require('../models/user.model');
            user = await User.findById(userId).select(
                'email isEmailVerified phone role firmId firmRole firmStatus ' +
                'mfaEnabled ssoProvider customClaims createdAt lastLogin ' +
                'kycStatus lawyerProfile lawyerMode isSoloLawyer lawyerWorkMode ' +
                'stripeConnectAccountId stripePayoutEnabled stripeAccountStatus ' +
                'passwordExpiresAt mustChangePassword isSSOUser createdViaSSO departedAt'
            ).setOptions({ bypassFirmFilter: true }).lean();

            if (!user) {
                logger.warn(`User not found for custom claims: ${userId}`);
                return {};
            }
        }

        // Fetch firm if not provided in context
        let firm = context.firm;
        if (!firm && user.firmId) {
            const Firm = require('../models/firm.model');
            firm = await Firm.findById(user.firmId)
                .select('subscription settings enterpriseSettings members ownerId')
                .lean();
        }

        // Build complete claims object
        const claims = {};

        // 1. Standard claims (always included)
        Object.assign(claims, getStandardClaims(user, { firm }));

        // 2. User-specific custom claims
        Object.assign(claims, getUserCustomClaims(user));

        // 3. Firm-level custom claims
        if (firm) {
            Object.assign(claims, getFirmCustomClaims(firm, user));
        }

        // 4. Dynamic claims
        Object.assign(claims, getDynamicClaims(user, { firm }));

        // 5. Conditional claims
        Object.assign(claims, getConditionalClaims(user, { firm }));

        // 6. Apply transformation rules (if any)
        if (user.customClaims?.transformRules) {
            return applyTransformationRules(claims, user.customClaims.transformRules);
        }

        return claims;
    } catch (error) {
        logger.error('Error getting custom claims:', error);
        // Return minimal claims on error
        return {
            user_id: typeof userId === 'object' ? userId._id?.toString() : userId,
            error: 'CLAIMS_GENERATION_FAILED'
        };
    }
};

/**
 * Validate custom claims object
 * Ensures claims meet security and size requirements
 *
 * @param {Object} claims - Claims object to validate
 * @returns {Object} Validation result { valid: boolean, errors: [] }
 */
const validateCustomClaims = (claims) => {
    const errors = [];

    try {
        if (!claims || typeof claims !== 'object') {
            errors.push('Claims must be an object');
            return { valid: false, errors };
        }

        // Check size limit (JWT tokens should be reasonably sized)
        const claimsString = JSON.stringify(claims);
        if (claimsString.length > 8192) { // 8KB limit
            errors.push('Claims object too large (max 8KB)');
        }

        // Validate reserved claim names
        const reservedClaims = ['iss', 'sub', 'aud', 'exp', 'iat', 'nbf', 'jti'];
        Object.keys(claims).forEach(key => {
            if (reservedClaims.includes(key)) {
                errors.push(`Cannot use reserved claim name: ${key}`);
            }
        });

        // Validate claim values
        Object.entries(claims).forEach(([key, value]) => {
            // Check for undefined (not allowed in JSON)
            if (value === undefined) {
                errors.push(`Claim ${key} has undefined value`);
            }

            // Check for circular references
            try {
                JSON.stringify(value);
            } catch (e) {
                errors.push(`Claim ${key} contains circular reference or non-serializable value`);
            }
        });

        return {
            valid: errors.length === 0,
            errors
        };
    } catch (error) {
        logger.error('Error validating custom claims:', error);
        return {
            valid: false,
            errors: ['Validation failed: ' + error.message]
        };
    }
};

/**
 * Set custom claims for a user
 * Admin function to update user's custom claims
 *
 * @param {string} userId - User ID
 * @param {Object} claims - Custom claims to set
 * @param {Object} options - Options { merge: boolean, validate: boolean }
 * @returns {Promise<Object>} Updated user custom claims
 */
const setCustomClaims = async (userId, claims, options = {}) => {
    try {
        const { merge = true, validate = true } = options;

        // Validate claims if requested
        if (validate) {
            const validation = validateCustomClaims(claims);
            if (!validation.valid) {
                throw new Error(`Invalid claims: ${validation.errors.join(', ')}`);
            }
        }

        // NOTE: Bypass firmIsolation filter - custom claims work for solo lawyers without firmId
        const User = require('../models/user.model');
        const user = await User.findById(userId).setOptions({ bypassFirmFilter: true });

        if (!user) {
            throw new Error('User not found');
        }

        if (merge && user.customClaims) {
            // Merge with existing claims
            user.customClaims = {
                ...user.customClaims,
                ...claims
            };
        } else {
            // Replace existing claims
            user.customClaims = claims;
        }

        await user.save();

        logger.info(`Custom claims updated for user ${userId}`);

        return user.customClaims;
    } catch (error) {
        logger.error('Error setting custom claims:', error);
        throw error;
    }
};

/**
 * Delete custom claims for a user
 *
 * @param {string} userId - User ID
 * @param {Array<string>} claimKeys - Specific claim keys to delete (optional)
 * @returns {Promise<void>}
 */
const deleteCustomClaims = async (userId, claimKeys = null) => {
    try {
        // NOTE: Bypass firmIsolation filter - custom claims work for solo lawyers without firmId
        const User = require('../models/user.model');
        const user = await User.findById(userId).setOptions({ bypassFirmFilter: true });

        if (!user) {
            throw new Error('User not found');
        }

        if (claimKeys && Array.isArray(claimKeys)) {
            // Delete specific claims
            if (user.customClaims) {
                claimKeys.forEach(key => {
                    delete user.customClaims[key];
                });
            }
        } else {
            // Delete all custom claims
            user.customClaims = {};
        }

        await user.save();

        logger.info(`Custom claims deleted for user ${userId}`);
    } catch (error) {
        logger.error('Error deleting custom claims:', error);
        throw error;
    }
};

module.exports = {
    // Main functions
    getCustomClaims,
    setCustomClaims,
    deleteCustomClaims,
    validateCustomClaims,

    // Utility functions
    getStandardClaims,
    getUserCustomClaims,
    getFirmCustomClaims,
    getDynamicClaims,
    getConditionalClaims,

    // Constants
    CLAIM_TYPE,
    STANDARD_CLAIMS
};
