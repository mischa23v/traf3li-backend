const mongoose = require('mongoose');
const encryptionPlugin = require('./plugins/encryption.plugin');
const logger = require('../utils/logger');

/**
 * OAuth SSO Provider Model
 *
 * Manages OAuth 2.0 authentication providers (Google, Microsoft, Okta, Auth0, etc.)
 * Complements existing SAML authentication with modern OAuth providers.
 *
 * Security Features:
 * - Encrypted client secret storage (AES-256-GCM)
 * - Connection validation before enabling
 * - Audit trail for configuration changes
 * - Support for global and firm-specific providers
 */

const ssoProviderSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM ASSOCIATION
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
        // null = global provider (available to all firms)
        // set = firm-specific provider
    },

    // ═══════════════════════════════════════════════════════════════
    // PROVIDER IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
        // e.g., "Google Workspace", "Microsoft Azure AD", "Okta"
    },

    providerType: {
        type: String,
        enum: ['google', 'microsoft', 'okta', 'auth0', 'custom'],
        required: true
        // Determines which OAuth flow and endpoints to use
    },

    // ═══════════════════════════════════════════════════════════════
    // OAUTH CREDENTIALS
    // ═══════════════════════════════════════════════════════════════
    clientId: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
        // OAuth 2.0 Client ID from the provider
    },

    clientSecret: {
        type: String,
        required: true,
        select: false  // Never return in queries by default
        // Plain secret - will be encrypted by plugin
        // OAuth 2.0 Client Secret (encrypted in DB)
    },

    // ═══════════════════════════════════════════════════════════════
    // OAUTH URLS (for custom providers)
    // ═══════════════════════════════════════════════════════════════
    // For well-known providers (google, microsoft, okta), these are auto-configured
    // For custom providers, admin must provide these endpoints
    authorizationUrl: {
        type: String,
        trim: true,
        maxlength: 500
        // e.g., https://custom-idp.example.com/oauth/authorize
    },

    tokenUrl: {
        type: String,
        trim: true,
        maxlength: 500
        // e.g., https://custom-idp.example.com/oauth/token
    },

    userinfoUrl: {
        type: String,
        trim: true,
        maxlength: 500
        // e.g., https://custom-idp.example.com/oauth/userinfo
    },

    // ═══════════════════════════════════════════════════════════════
    // OAUTH SCOPES
    // ═══════════════════════════════════════════════════════════════
    scopes: {
        type: [String],
        default: ['openid', 'email', 'profile']
        // OAuth scopes to request from provider
        // Common scopes: openid, email, profile, offline_access
    },

    // ═══════════════════════════════════════════════════════════════
    // ATTRIBUTE MAPPING (OAuth claims -> Application fields)
    // ═══════════════════════════════════════════════════════════════
    attributeMapping: {
        id: {
            type: String,
            default: 'sub'
            // Unique user identifier in provider
            // Common: sub (OIDC standard)
        },
        email: {
            type: String,
            default: 'email'
            // Email address claim
        },
        firstName: {
            type: String,
            default: 'given_name'
            // First name claim
        },
        lastName: {
            type: String,
            default: 'family_name'
            // Last name claim
        },
        avatar: {
            type: String,
            default: 'picture'
            // Profile picture URL claim
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // USER PROVISIONING SETTINGS
    // ═══════════════════════════════════════════════════════════════
    autoCreateUsers: {
        type: Boolean,
        default: false
        // Just-In-Time (JIT) provisioning
        // Create user account on first successful OAuth login
    },

    allowedDomains: {
        type: [String],
        default: []
        // Email domain whitelist for auto-provisioning
        // e.g., ['example.com', 'company.com']
        // Empty array = allow all domains
    },

    defaultRole: {
        type: String,
        enum: ['lawyer', 'paralegal', 'secretary', 'accountant'],
        default: 'lawyer'
        // Default role for auto-provisioned users
    },

    // ═══════════════════════════════════════════════════════════════
    // DOMAIN-BASED SSO ROUTING
    // ═══════════════════════════════════════════════════════════════
    priority: {
        type: Number,
        default: 0
        // Priority for domain routing when multiple providers match
        // Higher number = higher priority (0 = lowest)
        // Use case: Firm has both Google and Okta for different domains
    },

    autoRedirect: {
        type: Boolean,
        default: false
        // Whether to auto-redirect users to this provider
        // Only works if domain is verified
        // false = show SSO button, true = auto-redirect
    },

    domainVerified: {
        type: Boolean,
        default: false
        // Whether the domain ownership has been verified
        // Required for auto-redirect to work (security measure)
    },

    verificationToken: {
        type: String,
        default: null
        // DNS TXT record token for domain verification
        // e.g., 'traf3li-verify=abc123def456'
    },

    verificationMethod: {
        type: String,
        enum: ['dns', 'email', 'manual', null],
        default: null
        // Method used for domain verification
        // dns = DNS TXT record, email = email confirmation, manual = admin verified
    },

    verifiedAt: {
        type: Date,
        default: null
        // When the domain was verified
    },

    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
        // Admin user who verified the domain
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS & CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    isEnabled: {
        type: Boolean,
        default: false,
        index: true
        // Master switch for this OAuth provider
        // Users can only login via this provider when enabled
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT TRAIL
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    lastTestedAt: {
        type: Date,
        default: null
        // Last time OAuth flow was successfully tested
    },

    lastTestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
ssoProviderSchema.index({ firmId: 1, providerType: 1 });
ssoProviderSchema.index({ firmId: 1, isEnabled: 1 });
ssoProviderSchema.index({ allowedDomains: 1, isEnabled: 1 }); // For domain-based routing
ssoProviderSchema.index({ allowedDomains: 1, isEnabled: 1, priority: -1 }); // For prioritized domain routing

// ═══════════════════════════════════════════════════════════════
// ENCRYPTION PLUGIN
// ═══════════════════════════════════════════════════════════════
// Encrypt client secret using AES-256-GCM
ssoProviderSchema.plugin(encryptionPlugin, {
    fields: ['clientSecret'],
    searchableFields: []  // Secrets should never be searchable
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get OAuth URLs for this provider
 * For well-known providers, returns standard endpoints
 * For custom providers, returns configured URLs
 */
ssoProviderSchema.methods.getOAuthUrls = function() {
    // Custom provider - use configured URLs
    if (this.providerType === 'custom') {
        return {
            authorizationUrl: this.authorizationUrl,
            tokenUrl: this.tokenUrl,
            userinfoUrl: this.userinfoUrl
        };
    }

    // Well-known providers - return standard endpoints
    const wellKnownUrls = {
        google: {
            authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
            tokenUrl: 'https://oauth2.googleapis.com/token',
            userinfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo'
        },
        microsoft: {
            authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
            tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            userinfoUrl: 'https://graph.microsoft.com/v1.0/me'
        },
        okta: {
            // Okta URLs are tenant-specific, should be in custom URLs
            authorizationUrl: this.authorizationUrl || '',
            tokenUrl: this.tokenUrl || '',
            userinfoUrl: this.userinfoUrl || ''
        },
        auth0: {
            // Auth0 URLs are tenant-specific, should be in custom URLs
            authorizationUrl: this.authorizationUrl || '',
            tokenUrl: this.tokenUrl || '',
            userinfoUrl: this.userinfoUrl || ''
        }
    };

    return wellKnownUrls[this.providerType] || {};
};

/**
 * Check if email domain is allowed for auto-provisioning
 */
ssoProviderSchema.methods.isEmailDomainAllowed = function(email) {
    if (!email || typeof email !== 'string') {
        return false;
    }

    // If no domain restrictions, allow all
    if (!this.allowedDomains || this.allowedDomains.length === 0) {
        return true;
    }

    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (!emailDomain) {
        return false;
    }

    return this.allowedDomains.some(domain =>
        domain.toLowerCase() === emailDomain
    );
};

/**
 * Check if configuration is complete and valid
 */
ssoProviderSchema.methods.isConfigurationComplete = function() {
    const hasBasicConfig = !!(
        this.name &&
        this.providerType &&
        this.clientId &&
        this.clientSecret
    );

    // Custom provider requires explicit URLs
    if (this.providerType === 'custom') {
        return hasBasicConfig &&
            this.authorizationUrl &&
            this.tokenUrl &&
            this.userinfoUrl;
    }

    // Well-known providers only need basic config
    return hasBasicConfig;
};

/**
 * Sanitize provider for logging (remove sensitive data)
 */
ssoProviderSchema.methods.toSafeObject = function() {
    const obj = this.toObject();

    // Remove sensitive fields
    delete obj.clientSecret;
    delete obj.clientSecret_encrypted;

    return obj;
};

/**
 * Get user-friendly status
 */
ssoProviderSchema.methods.getStatus = function() {
    if (!this.isConfigurationComplete()) {
        return {
            status: 'incomplete',
            message: 'Configuration is incomplete',
            canEnable: false
        };
    }

    if (!this.isEnabled) {
        return {
            status: 'disabled',
            message: 'OAuth provider is disabled',
            canEnable: true
        };
    }

    return {
        status: 'active',
        message: 'OAuth provider is active',
        canEnable: true,
        lastTest: this.lastTestedAt
    };
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get OAuth provider for a firm
 * @param {ObjectId} firmId - Firm ID
 * @param {String} providerType - Provider type (google, microsoft, etc.)
 * @returns {Promise<SsoProvider|null>} OAuth provider or null
 */
ssoProviderSchema.statics.getProvider = async function(firmId, providerType) {
    if (!providerType) {
        throw new Error('Provider type is required');
    }

    try {
        // First, try to find firm-specific provider
        let provider = null;
        if (firmId) {
            provider = await this.findOne({
                firmId,
                providerType
            }).select('+clientSecret');
        }

        // Fallback to global provider
        if (!provider) {
            provider = await this.findOne({
                firmId: null,
                providerType
            }).select('+clientSecret');
        }

        return provider;
    } catch (error) {
        logger.error('Error fetching OAuth provider:', error);
        throw new Error('Failed to fetch OAuth provider configuration');
    }
};

/**
 * Get active OAuth provider for a firm
 * @param {ObjectId} firmId - Firm ID
 * @param {String} providerType - Provider type
 * @returns {Promise<SsoProvider|null>} Active OAuth provider or null
 */
ssoProviderSchema.statics.getActiveProvider = async function(firmId, providerType) {
    if (!providerType) {
        throw new Error('Provider type is required');
    }

    // Try firm-specific provider first
    let provider = null;
    if (firmId) {
        provider = await this.findOne({
            firmId,
            providerType,
            isEnabled: true
        }).select('+clientSecret');
    }

    // Fallback to global provider
    if (!provider) {
        provider = await this.findOne({
            firmId: null,
            providerType,
            isEnabled: true
        }).select('+clientSecret');
    }

    return provider;
};

/**
 * List all enabled providers for a firm
 * @param {ObjectId} firmId - Firm ID (optional)
 * @returns {Promise<Array>} List of enabled OAuth providers
 */
ssoProviderSchema.statics.listEnabledProviders = async function(firmId) {
    const query = { isEnabled: true };

    // Include both firm-specific and global providers
    if (firmId) {
        query.$or = [
            { firmId: firmId },
            { firmId: null }
        ];
    } else {
        query.firmId = null;
    }

    return this.find(query)
        .select('-clientSecret')  // Don't include secret in list
        .sort({ createdAt: -1 });
};

/**
 * Find providers by email domain (for SSO routing)
 * @param {String} domain - Email domain (e.g., 'biglaw.com')
 * @param {ObjectId} firmId - Optional firm ID for firm-specific providers
 * @returns {Promise<Array>} List of matching providers sorted by priority
 */
ssoProviderSchema.statics.findByDomain = async function(domain, firmId = null) {
    if (!domain || typeof domain !== 'string') {
        return [];
    }

    const normalizedDomain = domain.toLowerCase().trim();

    const query = {
        isEnabled: true,
        allowedDomains: normalizedDomain
    };

    // Include both firm-specific and global providers
    if (firmId) {
        query.$or = [
            { firmId: firmId },
            { firmId: null }
        ];
    } else {
        query.firmId = null;
    }

    try {
        return await this.find(query)
            .select('+clientSecret')  // Include secret for auth flow
            .sort({ priority: -1, createdAt: -1 });  // Higher priority first
    } catch (error) {
        logger.error('Error finding providers by domain:', error);
        return [];
    }
};

/**
 * Get highest priority provider for a domain
 * @param {String} domain - Email domain
 * @param {ObjectId} firmId - Optional firm ID
 * @returns {Promise<SsoProvider|null>} Provider or null
 */
ssoProviderSchema.statics.getProviderForDomain = async function(domain, firmId = null) {
    const providers = await this.findByDomain(domain, firmId);
    return providers.length > 0 ? providers[0] : null;
};

module.exports = mongoose.model('SsoProvider', ssoProviderSchema);
