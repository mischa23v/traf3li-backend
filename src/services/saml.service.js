const { Strategy: SamlStrategy } = require('@node-saml/passport-saml');
const { Firm, User } = require('../models');
const { CustomException } = require('../utils');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * SAML/SSO Service for Enterprise Integration
 *
 * Supports:
 * - Azure AD (Microsoft Entra ID)
 * - Okta
 * - Google Workspace
 * - Generic SAML 2.0 IdPs
 *
 * Features:
 * - SP metadata generation
 * - IdP configuration management
 * - SAML assertion parsing and validation
 * - Attribute mapping (email, firstName, lastName, groups)
 * - Just-in-Time (JIT) user provisioning
 * - Multi-tenancy support via firmId
 */

class SAMLService {
    constructor() {
        this.strategies = new Map(); // Cache SAML strategies per firm
    }

    /**
     * Get SAML configuration for a firm
     * @param {string} firmId - Firm ID
     * @returns {object} SAML configuration
     */
    async getFirmSAMLConfig(firmId) {
        const firm = await Firm.findById(firmId).select('enterpriseSettings');

        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.enterpriseSettings?.ssoEnabled) {
            throw CustomException('SSO not enabled for this firm', 400);
        }

        const { enterpriseSettings } = firm;

        return {
            ssoEnabled: enterpriseSettings.ssoEnabled,
            ssoProvider: enterpriseSettings.ssoProvider,
            ssoEntityId: enterpriseSettings.ssoEntityId,
            ssoSsoUrl: enterpriseSettings.ssoSsoUrl,
            ssoCertificate: enterpriseSettings.ssoCertificate,
            ssoMetadataUrl: enterpriseSettings.ssoMetadataUrl
        };
    }

    /**
     * Generate Service Provider metadata XML
     * @param {string} firmId - Firm ID
     * @returns {string} SP metadata XML
     */
    async generateSPMetadata(firmId) {
        const firm = await Firm.findById(firmId);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const baseUrl = process.env.BACKEND_URL || 'https://api.traf3li.com';
        const entityId = `${baseUrl}/api/auth/saml/${firmId}`;
        const acsUrl = `${baseUrl}/api/auth/saml/acs/${firmId}`;
        const sloUrl = `${baseUrl}/api/auth/saml/sls/${firmId}`;

        const metadata = `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     entityID="${entityId}">
  <md:SPSSODescriptor AuthnRequestsSigned="false"
                      WantAssertionsSigned="true"
                      protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">

    <!-- Single Logout Service -->
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                           Location="${sloUrl}"/>

    <!-- Name ID Format -->
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:persistent</md:NameIDFormat>

    <!-- Assertion Consumer Service -->
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                Location="${acsUrl}"
                                index="1"
                                isDefault="true"/>
  </md:SPSSODescriptor>

  <!-- Organization -->
  <md:Organization>
    <md:OrganizationName xml:lang="en">${firm.name || 'Traf3li'}</md:OrganizationName>
    <md:OrganizationDisplayName xml:lang="en">${firm.name || 'Traf3li'}</md:OrganizationDisplayName>
    <md:OrganizationURL xml:lang="en">${firm.website || baseUrl}</md:OrganizationURL>
  </md:Organization>

  <!-- Contact -->
  <md:ContactPerson contactType="technical">
    <md:EmailAddress>${firm.email || 'support@traf3li.com'}</md:EmailAddress>
  </md:ContactPerson>
</md:EntityDescriptor>`;

        return metadata;
    }

    /**
     * Create SAML strategy for a firm
     * @param {string} firmId - Firm ID
     * @returns {SamlStrategy} Passport SAML strategy
     */
    async createSAMLStrategy(firmId) {
        // Check cache first
        if (this.strategies.has(firmId)) {
            return this.strategies.get(firmId);
        }

        const config = await this.getFirmSAMLConfig(firmId);
        const baseUrl = process.env.BACKEND_URL || 'https://api.traf3li.com';

        // SECURITY: Validate that certificate exists before creating strategy
        if (!config.ssoCertificate || !config.ssoCertificate.trim()) {
            throw CustomException('IdP certificate is required for SAML authentication', 400);
        }

        // SECURITY: Validate certificate format
        const cert = config.ssoCertificate.replace(/\\n/g, '\n').trim();
        if (!cert.includes('BEGIN CERTIFICATE') && !cert.includes('END CERTIFICATE')) {
            throw CustomException('Invalid IdP certificate format. Must be PEM encoded.', 400);
        }

        const samlOptions = {
            // Service Provider (SP) settings
            callbackUrl: `${baseUrl}/api/auth/saml/acs/${firmId}`,
            entryPoint: config.ssoSsoUrl,
            issuer: `${baseUrl}/api/auth/saml/${firmId}`,
            audience: `${baseUrl}/api/auth/saml/${firmId}`, // SECURITY: Validate assertion audience

            // Identity Provider (IdP) settings
            cert: cert,
            identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',

            // SECURITY SETTINGS - CRITICAL FOR AUTHENTICATION BYPASS PREVENTION
            wantAssertionsSigned: true,              // SECURITY: Require signed assertions
            wantAuthnResponseSigned: true,           // SECURITY: Require signed responses (defense in depth)
            signatureAlgorithm: 'sha256',            // Use secure signature algorithm
            validateInResponseTo: true,              // SECURITY: Prevent replay attacks
            requestIdExpirationPeriodMs: 3600000,    // SECURITY: Expire requests after 1 hour

            // Logout settings
            logoutUrl: config.ssoSsoUrl,
            logoutCallbackUrl: `${baseUrl}/api/auth/saml/sls/${firmId}`,

            // Additional settings
            acceptedClockSkewMs: 5000,
            disableRequestedAuthnContext: false,
            forceAuthn: false,
            skipRequestCompression: false,
            authnRequestBinding: 'HTTP-POST',

            // Provider-specific settings
            ...(config.ssoProvider === 'azure' && {
                identifierFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
                authnContext: ['urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport']
            }),
            ...(config.ssoProvider === 'okta' && {
                identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
                authnContext: ['urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport']
            }),
            ...(config.ssoProvider === 'google' && {
                identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
            })
        };

        const strategy = new SamlStrategy(
            samlOptions,
            async (profile, done) => {
                try {
                    const user = await this.handleSAMLAssertion(firmId, profile);
                    return done(null, user);
                } catch (error) {
                    return done(error);
                }
            }
        );

        // Cache the strategy
        this.strategies.set(firmId, strategy);

        return strategy;
    }

    /**
     * Parse and map SAML attributes based on provider
     * @param {string} provider - Provider name (azure, okta, google)
     * @param {object} profile - SAML profile
     * @returns {object} Mapped user attributes
     */
    mapSAMLAttributes(provider, profile) {
        const attributes = {};

        // Common attribute mappings
        const commonMappings = {
            email: profile.email || profile.nameID || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
            firstName: profile.firstName || profile.givenName || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'],
            lastName: profile.lastName || profile.surname || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'],
            displayName: profile.displayName || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
        };

        // Provider-specific attribute mappings
        switch (provider) {
            case 'azure':
                attributes.email = profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress']
                    || profile.email || profile.nameID;
                attributes.firstName = profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname']
                    || profile.firstName;
                attributes.lastName = profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname']
                    || profile.lastName;
                attributes.displayName = profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
                    || profile.displayName;
                attributes.groups = profile['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups']
                    || profile.groups || [];
                attributes.objectId = profile['http://schemas.microsoft.com/identity/claims/objectidentifier'];
                break;

            case 'okta':
                attributes.email = profile.email || profile.nameID;
                attributes.firstName = profile.firstName || profile.givenName;
                attributes.lastName = profile.lastName || profile.familyName;
                attributes.displayName = profile.displayName || `${attributes.firstName} ${attributes.lastName}`;
                attributes.groups = profile.groups || [];
                attributes.oktaId = profile.nameID;
                break;

            case 'google':
                attributes.email = profile.email || profile.nameID;
                attributes.firstName = profile.firstName || profile.givenName;
                attributes.lastName = profile.lastName || profile.familyName;
                attributes.displayName = profile.displayName || `${attributes.firstName} ${attributes.lastName}`;
                attributes.googleId = profile.nameID;
                break;

            default:
                // Generic SAML attribute mapping
                attributes.email = commonMappings.email;
                attributes.firstName = commonMappings.firstName;
                attributes.lastName = commonMappings.lastName;
                attributes.displayName = commonMappings.displayName;
                attributes.groups = profile.groups || [];
        }

        // Ensure email is present (required field)
        if (!attributes.email) {
            throw CustomException('Email not found in SAML assertion', 400);
        }

        // Generate firstName and lastName from displayName if missing
        if (!attributes.firstName || !attributes.lastName) {
            const nameParts = (attributes.displayName || attributes.email).split(/\s+/);
            attributes.firstName = attributes.firstName || nameParts[0] || 'User';
            attributes.lastName = attributes.lastName || nameParts.slice(1).join(' ') || 'User';
        }

        return attributes;
    }

    /**
     * Handle SAML assertion and perform JIT user provisioning
     * @param {string} firmId - Firm ID
     * @param {object} profile - SAML profile from assertion
     * @returns {object} User object
     */
    async handleSAMLAssertion(firmId, profile) {
        const firm = await Firm.findById(firmId);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        // Map SAML attributes
        const attributes = this.mapSAMLAttributes(firm.enterpriseSettings.ssoProvider, profile);

        // Find or create user (Just-in-Time provisioning)
        let user = await User.findOne({
            email: attributes.email.toLowerCase(),
            firmId: firmId
        });

        if (!user) {
            // Create new user via JIT provisioning
            user = await this.createJITUser(firmId, attributes);
        } else {
            // Update existing user with latest SAML attributes
            user.firstName = attributes.firstName;
            user.lastName = attributes.lastName;

            // Update last login
            user.lastLogin = new Date();

            await user.save();
        }

        return user;
    }

    /**
     * Create user via Just-in-Time (JIT) provisioning
     * @param {string} firmId - Firm ID
     * @param {object} attributes - Mapped SAML attributes
     * @returns {object} Created user
     */
    async createJITUser(firmId, attributes) {
        const firm = await Firm.findById(firmId);

        // Generate username from email
        const username = attributes.email.split('@')[0] + '_' + crypto.randomBytes(4).toString('hex');

        // Create user with random password (won't be used for SSO login)
        const randomPassword = crypto.randomBytes(32).toString('hex');
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(randomPassword, 12);

        const userData = {
            username: username,
            email: attributes.email.toLowerCase(),
            password: hashedPassword,
            firstName: attributes.firstName,
            lastName: attributes.lastName,
            phone: '', // Will be filled by user later
            role: 'lawyer', // Default role, can be customized
            isSeller: false,
            firmId: firmId,
            firmRole: 'lawyer', // Default firm role
            firmStatus: 'active',
            country: 'Saudi Arabia',

            // Mark as SSO user
            isSSOUser: true,
            ssoProvider: firm.enterpriseSettings.ssoProvider,
            ssoExternalId: attributes.objectId || attributes.oktaId || attributes.googleId,

            // Metadata
            createdViaSSO: true,
            lastLogin: new Date()
        };

        const user = new User(userData);
        await user.save();

        // Add user to firm members
        try {
            const { getDefaultPermissions } = require('../config/permissions.config');

            firm.members.push({
                userId: user._id,
                role: 'lawyer',
                permissions: getDefaultPermissions('lawyer'),
                joinedAt: new Date(),
                status: 'active'
            });

            await firm.save();
        } catch (error) {
            logger.error('Error adding user to firm:', error);
            // Continue even if firm update fails
        }

        return user;
    }

    /**
     * Validate SAML configuration for a firm
     * @param {object} config - SAML configuration
     * @returns {object} Validation result
     */
    validateSAMLConfig(config) {
        const errors = [];

        if (!config.ssoProvider) {
            errors.push('SSO provider is required');
        }

        if (!config.ssoEntityId) {
            errors.push('Entity ID is required');
        }

        if (!config.ssoSsoUrl) {
            errors.push('SSO URL is required');
        }

        if (!config.ssoCertificate) {
            errors.push('Certificate is required');
        }

        // Validate certificate format
        if (config.ssoCertificate) {
            const cert = config.ssoCertificate.trim();
            if (!cert.includes('BEGIN CERTIFICATE') && !cert.includes('END CERTIFICATE')) {
                errors.push('Invalid certificate format. Must be PEM encoded.');
            }
        }

        // Validate URL format
        if (config.ssoSsoUrl) {
            try {
                new URL(config.ssoSsoUrl);
            } catch (error) {
                errors.push('Invalid SSO URL format');
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Update SAML configuration for a firm
     * @param {string} firmId - Firm ID
     * @param {object} config - SAML configuration
     * @returns {object} Updated firm
     */
    async updateSAMLConfig(firmId, config) {
        const firm = await Firm.findById(firmId);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        // Validate configuration
        const validation = this.validateSAMLConfig(config);
        if (!validation.valid) {
            throw CustomException(`Invalid SAML configuration: ${validation.errors.join(', ')}`, 400);
        }

        // Update firm enterprise settings
        firm.enterpriseSettings = firm.enterpriseSettings || {};
        firm.enterpriseSettings.ssoEnabled = config.ssoEnabled !== undefined ? config.ssoEnabled : true;
        firm.enterpriseSettings.ssoProvider = config.ssoProvider;
        firm.enterpriseSettings.ssoEntityId = config.ssoEntityId;
        firm.enterpriseSettings.ssoSsoUrl = config.ssoSsoUrl;
        firm.enterpriseSettings.ssoCertificate = config.ssoCertificate;
        firm.enterpriseSettings.ssoMetadataUrl = config.ssoMetadataUrl || null;

        await firm.save();

        // Invalidate cached strategy
        this.strategies.delete(firmId);

        return firm;
    }

    /**
     * Generate SAML login request URL
     * @param {string} firmId - Firm ID
     * @param {string} relayState - Relay state (optional)
     * @returns {string} Login URL
     */
    async generateLoginURL(firmId, relayState = null) {
        const strategy = await this.createSAMLStrategy(firmId);

        return new Promise((resolve, reject) => {
            strategy.authenticate({
                query: {},
                body: {},
                headers: {}
            }, {
                redirect: (url) => {
                    resolve(url);
                },
                fail: (error) => {
                    reject(error);
                }
            });
        });
    }

    /**
     * Clear cached strategy for a firm
     * @param {string} firmId - Firm ID
     */
    clearStrategyCache(firmId) {
        this.strategies.delete(firmId);
    }

    /**
     * Clear all cached strategies
     */
    clearAllStrategies() {
        this.strategies.clear();
    }
}

// Export singleton instance
module.exports = new SAMLService();
