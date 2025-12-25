/**
 * Auth Webhook Service
 *
 * Handles authentication event webhooks for user authentication events.
 * Triggers webhooks for login, logout, registration, password reset, MFA, OAuth, etc.
 *
 * Events are delivered using the existing webhook.service.js infrastructure.
 */

const webhookService = require('./webhook.service');
const logger = require('../utils/logger');

/**
 * Auth Event Types
 * These events can be subscribed to via webhooks
 */
const AUTH_EVENT_TYPES = {
    // Authentication events
    LOGIN: 'auth.login',
    LOGOUT: 'auth.logout',
    LOGOUT_ALL: 'auth.logout_all',
    REGISTER: 'auth.register',

    // Password events
    PASSWORD_RESET_REQUESTED: 'auth.password_reset_requested',
    PASSWORD_RESET_COMPLETED: 'auth.password_reset_completed',
    PASSWORD_CHANGED: 'auth.password_changed',

    // MFA events
    MFA_ENABLED: 'auth.mfa_enabled',
    MFA_DISABLED: 'auth.mfa_disabled',
    MFA_VERIFIED: 'auth.mfa_verified',
    MFA_BACKUP_CODE_USED: 'auth.mfa_backup_code_used',
    MFA_BACKUP_CODES_REGENERATED: 'auth.mfa_backup_codes_regenerated',

    // Account security events
    ACCOUNT_LOCKED: 'auth.account_locked',
    ACCOUNT_UNLOCKED: 'auth.account_unlocked',

    // Verification events
    EMAIL_VERIFIED: 'auth.email_verified',
    EMAIL_VERIFICATION_SENT: 'auth.email_verification_sent',
    PHONE_VERIFIED: 'auth.phone_verified',

    // OAuth/SSO events
    OAUTH_LINKED: 'auth.oauth_linked',
    OAUTH_UNLINKED: 'auth.oauth_unlinked',
    OAUTH_LOGIN: 'auth.oauth_login',

    // Token events
    TOKEN_REFRESHED: 'auth.token_refreshed',
    TOKEN_REVOKED: 'auth.token_revoked',

    // Session events
    SESSION_CREATED: 'auth.session_created',
    SESSION_EXPIRED: 'auth.session_expired',
    SESSION_TERMINATED: 'auth.session_terminated',

    // Magic link events
    MAGIC_LINK_SENT: 'auth.magic_link_sent',
    MAGIC_LINK_VERIFIED: 'auth.magic_link_verified'
};

/**
 * Trigger an auth webhook event
 *
 * @param {string} eventType - One of AUTH_EVENT_TYPES
 * @param {string} userId - User ID (ObjectId as string)
 * @param {Object} metadata - Event metadata
 * @param {string} metadata.email - User email
 * @param {string} metadata.username - Username
 * @param {string} [metadata.firmId] - Firm ID if user belongs to a firm
 * @param {string} [metadata.ipAddress] - IP address of the request
 * @param {string} [metadata.userAgent] - User agent string
 * @param {string} [metadata.deviceId] - Device identifier
 * @param {string} [metadata.location] - Geographic location (country, city, etc.)
 * @param {Object} [metadata.extra] - Any additional event-specific data
 * @returns {Promise<Object>} - Webhook trigger result
 */
async function triggerAuthWebhook(eventType, userId, metadata = {}) {
    try {
        // Validate event type
        const validEventTypes = Object.values(AUTH_EVENT_TYPES);
        if (!validEventTypes.includes(eventType)) {
            logger.warn('Invalid auth webhook event type', { eventType });
            return { triggered: 0, error: 'Invalid event type' };
        }

        // Build webhook payload
        const payload = {
            eventType,
            userId,
            timestamp: new Date().toISOString(),
            user: {
                id: userId,
                email: metadata.email,
                username: metadata.username,
                firmId: metadata.firmId || null
            },
            context: {
                ipAddress: metadata.ipAddress || null,
                userAgent: metadata.userAgent || null,
                deviceId: metadata.deviceId || null,
                location: metadata.location || null,
                timestamp: new Date().toISOString()
            },
            // Event-specific metadata
            metadata: metadata.extra || {}
        };

        // Determine firmId for webhook filtering
        // For firm-based webhooks, only trigger for the user's firm
        // For global admin webhooks, firmId can be null
        const firmId = metadata.firmId || null;

        // Trigger webhook using existing webhook service
        // If firmId is null, only global/admin webhooks will be triggered
        const result = await webhookService.trigger(eventType, payload, firmId);

        // Log webhook trigger for debugging
        if (result && result.triggered > 0) {
            logger.debug('Auth webhook triggered', {
                eventType,
                userId,
                firmId,
                webhooksTriggered: result.triggered
            });
        }

        return result;
    } catch (error) {
        logger.error('Failed to trigger auth webhook', {
            error: error.message,
            eventType,
            userId
        });

        // Don't throw - webhook failures should not break auth flow
        return { triggered: 0, error: error.message };
    }
}

/**
 * Helper function to extract device info from request
 *
 * @param {Object} request - Express request object
 * @returns {Object} - Device information
 */
function extractDeviceInfo(request) {
    return {
        ipAddress: request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
        userAgent: request.headers['user-agent'] || 'unknown',
        deviceId: request.headers['x-device-id'] || null,
        browser: request.headers['sec-ch-ua'] || null,
        os: request.headers['sec-ch-ua-platform'] || null,
        deviceType: request.headers['sec-ch-ua-mobile'] === '?1' ? 'mobile' : 'desktop',
        location: {
            country: request.headers['cf-ipcountry'] || null,
            city: request.headers['cf-ipcity'] || null,
            region: request.headers['cf-ipregion'] || null
        }
    };
}

/**
 * Helper function to build metadata from request and user
 *
 * @param {Object} user - User object
 * @param {Object} request - Express request object
 * @param {Object} [extra] - Additional metadata
 * @returns {Object} - Complete metadata object
 */
function buildMetadata(user, request, extra = {}) {
    const deviceInfo = extractDeviceInfo(request);

    return {
        email: user.email,
        username: user.username,
        firmId: user.firmId?.toString() || null,
        ipAddress: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent,
        deviceId: deviceInfo.deviceId,
        location: deviceInfo.location,
        extra: {
            ...extra,
            device: {
                browser: deviceInfo.browser,
                os: deviceInfo.os,
                type: deviceInfo.deviceType
            }
        }
    };
}

/**
 * Convenience functions for common auth events
 */

/**
 * Trigger login webhook
 */
async function triggerLoginWebhook(user, request, extra = {}) {
    const metadata = buildMetadata(user, request, {
        ...extra,
        loginMethod: extra.loginMethod || 'password',
        mfaUsed: extra.mfaUsed || false
    });

    return await triggerAuthWebhook(AUTH_EVENT_TYPES.LOGIN, user._id.toString(), metadata);
}

/**
 * Trigger logout webhook
 */
async function triggerLogoutWebhook(user, request, extra = {}) {
    const metadata = buildMetadata(user, request, extra);
    return await triggerAuthWebhook(AUTH_EVENT_TYPES.LOGOUT, user._id.toString(), metadata);
}

/**
 * Trigger logout all devices webhook
 */
async function triggerLogoutAllWebhook(user, request, extra = {}) {
    const metadata = buildMetadata(user, request, extra);
    return await triggerAuthWebhook(AUTH_EVENT_TYPES.LOGOUT_ALL, user._id.toString(), metadata);
}

/**
 * Trigger registration webhook
 */
async function triggerRegisterWebhook(user, request, extra = {}) {
    const metadata = buildMetadata(user, request, {
        ...extra,
        accountType: user.role || 'client',
        isSeller: user.isSeller || false,
        isSoloLawyer: user.isSoloLawyer || false
    });

    return await triggerAuthWebhook(AUTH_EVENT_TYPES.REGISTER, user._id.toString(), metadata);
}

/**
 * Trigger password reset requested webhook
 */
async function triggerPasswordResetRequestedWebhook(user, request, extra = {}) {
    const metadata = buildMetadata(user, request, extra);
    return await triggerAuthWebhook(AUTH_EVENT_TYPES.PASSWORD_RESET_REQUESTED, user._id.toString(), metadata);
}

/**
 * Trigger password reset completed webhook
 */
async function triggerPasswordResetCompletedWebhook(user, request, extra = {}) {
    const metadata = buildMetadata(user, request, extra);
    return await triggerAuthWebhook(AUTH_EVENT_TYPES.PASSWORD_RESET_COMPLETED, user._id.toString(), metadata);
}

/**
 * Trigger MFA enabled webhook
 */
async function triggerMFAEnabledWebhook(user, request, extra = {}) {
    const metadata = buildMetadata(user, request, {
        ...extra,
        mfaMethod: extra.mfaMethod || 'totp',
        backupCodesGenerated: extra.backupCodesGenerated || 0
    });

    return await triggerAuthWebhook(AUTH_EVENT_TYPES.MFA_ENABLED, user._id.toString(), metadata);
}

/**
 * Trigger MFA disabled webhook
 */
async function triggerMFADisabledWebhook(user, request, extra = {}) {
    const metadata = buildMetadata(user, request, extra);
    return await triggerAuthWebhook(AUTH_EVENT_TYPES.MFA_DISABLED, user._id.toString(), metadata);
}

/**
 * Trigger MFA backup code used webhook
 */
async function triggerMFABackupCodeUsedWebhook(user, request, extra = {}) {
    const metadata = buildMetadata(user, request, {
        ...extra,
        remainingCodes: extra.remainingCodes || 0
    });

    return await triggerAuthWebhook(AUTH_EVENT_TYPES.MFA_BACKUP_CODE_USED, user._id.toString(), metadata);
}

/**
 * Trigger OAuth linked webhook
 */
async function triggerOAuthLinkedWebhook(user, request, extra = {}) {
    const metadata = buildMetadata(user, request, {
        ...extra,
        provider: extra.provider || 'unknown',
        providerUserId: extra.providerUserId || null
    });

    return await triggerAuthWebhook(AUTH_EVENT_TYPES.OAUTH_LINKED, user._id.toString(), metadata);
}

/**
 * Trigger OAuth unlinked webhook
 */
async function triggerOAuthUnlinkedWebhook(user, request, extra = {}) {
    const metadata = buildMetadata(user, request, {
        ...extra,
        provider: extra.provider || 'unknown'
    });

    return await triggerAuthWebhook(AUTH_EVENT_TYPES.OAUTH_UNLINKED, user._id.toString(), metadata);
}

/**
 * Trigger email verified webhook
 */
async function triggerEmailVerifiedWebhook(user, request, extra = {}) {
    const metadata = buildMetadata(user, request, extra);
    return await triggerAuthWebhook(AUTH_EVENT_TYPES.EMAIL_VERIFIED, user._id.toString(), metadata);
}

/**
 * Trigger magic link verified webhook
 */
async function triggerMagicLinkVerifiedWebhook(user, request, extra = {}) {
    const metadata = buildMetadata(user, request, {
        ...extra,
        purpose: extra.purpose || 'login'
    });

    return await triggerAuthWebhook(AUTH_EVENT_TYPES.MAGIC_LINK_VERIFIED, user._id.toString(), metadata);
}

module.exports = {
    // Event types enum
    AUTH_EVENT_TYPES,

    // Core trigger function
    triggerAuthWebhook,

    // Helper functions
    extractDeviceInfo,
    buildMetadata,

    // Convenience functions for specific events
    triggerLoginWebhook,
    triggerLogoutWebhook,
    triggerLogoutAllWebhook,
    triggerRegisterWebhook,
    triggerPasswordResetRequestedWebhook,
    triggerPasswordResetCompletedWebhook,
    triggerMFAEnabledWebhook,
    triggerMFADisabledWebhook,
    triggerMFABackupCodeUsedWebhook,
    triggerOAuthLinkedWebhook,
    triggerOAuthUnlinkedWebhook,
    triggerEmailVerifiedWebhook,
    triggerMagicLinkVerifiedWebhook
};
