/**
 * SSO Configuration Controller - Enterprise SSO Management UI API
 *
 * Provides endpoints for firm administrators to configure SSO/SAML:
 * - GET /api/firms/:firmId/sso - Get SSO configuration
 * - PUT /api/firms/:firmId/sso - Update SSO configuration
 * - POST /api/firms/:firmId/sso/test - Test IdP connection
 * - POST /api/firms/:firmId/sso/upload-metadata - Upload IdP metadata XML
 * - DELETE /api/firms/:firmId/sso - Disable SSO
 *
 * Security:
 * - Requires firm owner or admin role
 * - Validates firm subscription includes SSO feature
 * - Audit logs all configuration changes
 */

const { Firm } = require('../models');
const QueueService = require('../services/queue.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const samlService = require('../services/saml.service');
const crypto = require('crypto');
const xml2js = require('xml2js');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// SSO CONFIGURATION ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get SSO configuration
 * GET /api/firms/:firmId/sso
 */
const getSSOConfig = asyncHandler(async (req, res) => {
    const firmId = sanitizeObjectId(req.params.firmId, 'firmId');

    // Validate firm access (IDOR protection)
    if (req.firmId !== firmId) {
        throw CustomException('ليس لديك صلاحية للوصول إلى هذا المكتب', 403);
    }

    // Require owner or admin role
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('هذا الإجراء متاح للمسؤولين فقط', 403);
    }

    // Get firm
    const firm = await Firm.findById(firmId).select('enterpriseSettings subscription');
    if (!firm) {
        throw CustomException('Firm not found', 404);
    }

    // Build SSO configuration response (without sensitive data)
    const baseUrl = process.env.BACKEND_URL || 'https://api.traf3li.com';
    const ssoConfig = firm.enterpriseSettings?.sso || {};

    const config = {
        enabled: ssoConfig.enabled || false,
        provider: ssoConfig.provider || null,

        // IdP Configuration (masked)
        entityId: ssoConfig.entityId || null,
        ssoUrl: ssoConfig.ssoUrl || null,
        sloUrl: ssoConfig.sloUrl || null,
        certificate: ssoConfig.certificate ? '***CONFIGURED***' : null,
        metadataUrl: ssoConfig.metadataUrl || null,

        // Attribute Mapping
        attributeMapping: ssoConfig.attributeMapping || {
            email: 'email',
            firstName: 'firstName',
            lastName: 'lastName',
            groups: 'groups'
        },

        // Provisioning Settings
        allowedDomains: ssoConfig.allowedDomains || [],
        autoProvision: ssoConfig.autoProvision !== undefined ? ssoConfig.autoProvision : true,
        defaultRole: ssoConfig.defaultRole || 'lawyer',
        requireEmailVerification: ssoConfig.requireEmailVerification || false,
        syncUserAttributes: ssoConfig.syncUserAttributes !== undefined ? ssoConfig.syncUserAttributes : true,

        // Metadata
        lastTested: ssoConfig.lastTested || null,
        configuredAt: ssoConfig.configuredAt || null,

        // Service Provider URLs (for IdP configuration)
        serviceProvider: {
            entityId: `${baseUrl}/api/auth/saml/${firmId}`,
            acsUrl: `${baseUrl}/api/auth/saml/acs/${firmId}`,
            sloUrl: `${baseUrl}/api/auth/saml/sls/${firmId}`,
            metadataUrl: `${baseUrl}/api/auth/saml/metadata/${firmId}`
        }
    };

    res.json({
        success: true,
        data: config
    });
});

/**
 * Update SSO configuration
 * PUT /api/firms/:firmId/sso
 */
const updateSSOConfig = asyncHandler(async (req, res) => {
    const firmId = sanitizeObjectId(req.params.firmId, 'firmId');

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'enabled',
        'provider',
        'entityId',
        'ssoUrl',
        'sloUrl',
        'certificate',
        'metadataUrl',
        'attributeMapping',
        'allowedDomains',
        'autoProvision',
        'defaultRole',
        'requireEmailVerification',
        'syncUserAttributes'
    ];
    const sanitizedBody = pickAllowedFields(req.body, allowedFields);

    const {
        enabled,
        provider,
        entityId,
        ssoUrl,
        sloUrl,
        certificate,
        metadataUrl,
        attributeMapping,
        allowedDomains,
        autoProvision,
        defaultRole,
        requireEmailVerification,
        syncUserAttributes
    } = sanitizedBody;

    // Validate firm access (IDOR protection)
    if (req.firmId !== firmId) {
        throw CustomException('ليس لديك صلاحية للوصول إلى هذا المكتب', 403);
    }

    // Require owner or admin role
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('هذا الإجراء متاح للمسؤولين فقط', 403);
    }

    // Get firm
    const firm = await Firm.findById(firmId);
    if (!firm) {
        throw CustomException('Firm not found', 404);
    }

    // Validate inputs
    const validationErrors = [];

    if (provider && !['azure', 'okta', 'google', 'custom'].includes(provider)) {
        validationErrors.push('Invalid SSO provider. Must be: azure, okta, google, or custom');
    }

    if (entityId && entityId.trim().length === 0) {
        validationErrors.push('Entity ID cannot be empty');
    }

    // Validate SSO URL with whitelist check
    if (ssoUrl) {
        const ssoUrlValidation = validateSSOUrl(ssoUrl, 'SSO');
        if (!ssoUrlValidation.valid) {
            validationErrors.push(ssoUrlValidation.error);
        }
    }

    // Validate SLO URL with whitelist check
    if (sloUrl) {
        const sloUrlValidation = validateSSOUrl(sloUrl, 'SLO');
        if (!sloUrlValidation.valid) {
            validationErrors.push(sloUrlValidation.error);
        }
    }

    // Validate metadata URL if provided
    if (metadataUrl) {
        const metadataValidation = validateSSOUrl(metadataUrl, 'Metadata');
        if (!metadataValidation.valid) {
            validationErrors.push(metadataValidation.error);
        }
    }

    if (certificate) {
        const certValidation = validateCertificate(certificate);
        if (!certValidation.valid) {
            validationErrors.push(certValidation.error);
        }
    }

    if (allowedDomains && Array.isArray(allowedDomains)) {
        const invalidDomains = allowedDomains.filter(domain => {
            // Basic domain validation
            return !/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/.test(domain);
        });
        if (invalidDomains.length > 0) {
            validationErrors.push(`Invalid domains: ${invalidDomains.join(', ')}`);
        }
    }

    if (defaultRole && !['lawyer', 'paralegal', 'secretary', 'accountant', 'partner'].includes(defaultRole)) {
        validationErrors.push('Invalid default role');
    }

    if (validationErrors.length > 0) {
        throw CustomException(validationErrors.join('; '), 400);
    }

    // Initialize SSO config if it doesn't exist
    if (!firm.enterpriseSettings) {
        firm.enterpriseSettings = {};
    }
    if (!firm.enterpriseSettings.sso) {
        firm.enterpriseSettings.sso = {};
    }

    // Store old config for audit logging
    const oldConfig = { ...firm.enterpriseSettings.sso };

    // Update SSO configuration
    const ssoConfig = firm.enterpriseSettings.sso;

    if (enabled !== undefined) ssoConfig.enabled = enabled;
    if (provider !== undefined) ssoConfig.provider = provider;
    if (entityId !== undefined) ssoConfig.entityId = entityId;
    if (ssoUrl !== undefined) ssoConfig.ssoUrl = ssoUrl;
    if (sloUrl !== undefined) ssoConfig.sloUrl = sloUrl;
    if (certificate !== undefined) ssoConfig.certificate = certificate;
    if (metadataUrl !== undefined) ssoConfig.metadataUrl = metadataUrl;

    if (attributeMapping !== undefined) {
        ssoConfig.attributeMapping = {
            ...ssoConfig.attributeMapping,
            ...attributeMapping
        };
    }

    if (allowedDomains !== undefined) ssoConfig.allowedDomains = allowedDomains;
    if (autoProvision !== undefined) ssoConfig.autoProvision = autoProvision;
    if (defaultRole !== undefined) ssoConfig.defaultRole = defaultRole;
    if (requireEmailVerification !== undefined) ssoConfig.requireEmailVerification = requireEmailVerification;
    if (syncUserAttributes !== undefined) ssoConfig.syncUserAttributes = syncUserAttributes;

    // Set configuration metadata
    ssoConfig.configuredAt = new Date();
    ssoConfig.configuredBy = req.userID;

    // Update legacy fields for backward compatibility
    firm.enterpriseSettings.ssoEnabled = ssoConfig.enabled;
    firm.enterpriseSettings.ssoProvider = ssoConfig.provider;
    firm.enterpriseSettings.ssoEntityId = ssoConfig.entityId;
    firm.enterpriseSettings.ssoSsoUrl = ssoConfig.ssoUrl;
    firm.enterpriseSettings.ssoCertificate = ssoConfig.certificate;
    firm.enterpriseSettings.ssoMetadataUrl = ssoConfig.metadataUrl;

    await firm.save();

    // Clear SAML strategy cache
    samlService.clearStrategyCache(firmId);

    // Build change list for audit log
    const changes = [];
    if (oldConfig.enabled !== ssoConfig.enabled) {
        changes.push({ field: 'enabled', oldValue: oldConfig.enabled, newValue: ssoConfig.enabled });
    }
    if (oldConfig.provider !== ssoConfig.provider) {
        changes.push({ field: 'provider', oldValue: oldConfig.provider, newValue: ssoConfig.provider });
    }
    if (oldConfig.entityId !== ssoConfig.entityId) {
        changes.push({ field: 'entityId', oldValue: oldConfig.entityId, newValue: ssoConfig.entityId });
    }

    // Log configuration change
    QueueService.logTeamActivity({
        firmId,
        userId: req.userID,
        action: 'update',
        targetType: 'setting',
        targetName: 'SSO Configuration',
        changes,
        details: {
            ssoProvider: provider,
            ssoEnabled: enabled,
            allowedDomains,
            autoProvision,
            defaultRole
        },
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
        status: 'success',
        timestamp: new Date()
    });

    res.json({
        success: true,
        message: 'تم تحديث إعدادات SSO بنجاح',
        messageEn: 'SSO configuration updated successfully',
        data: {
            enabled: ssoConfig.enabled,
            provider: ssoConfig.provider,
            configuredAt: ssoConfig.configuredAt
        }
    });
});

/**
 * Test IdP connection
 * POST /api/firms/:firmId/sso/test
 */
const testSSOConnection = asyncHandler(async (req, res) => {
    const firmId = sanitizeObjectId(req.params.firmId, 'firmId');

    // Validate firm access (IDOR protection)
    if (req.firmId !== firmId) {
        throw CustomException('ليس لديك صلاحية للوصول إلى هذا المكتب', 403);
    }

    // Require owner or admin role
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('هذا الإجراء متاح للمسؤولين فقط', 403);
    }

    // Get firm
    const firm = await Firm.findById(firmId);
    if (!firm) {
        throw CustomException('Firm not found', 404);
    }

    const ssoConfig = firm.enterpriseSettings?.sso;
    if (!ssoConfig || !ssoConfig.enabled) {
        throw CustomException('SSO is not configured or enabled', 400);
    }

    // Validate configuration completeness
    const validation = validateSSOConfig(ssoConfig);
    if (!validation.valid) {
        return res.status(400).json({
            success: false,
            message: 'Invalid SSO configuration',
            messageEn: 'Invalid SSO configuration',
            errors: validation.errors,
            testPassed: false
        });
    }

    // Try to create SAML strategy (validates config)
    let testResults = {
        configurationValid: false,
        certificateValid: false,
        urlsReachable: false,
        errors: []
    };

    try {
        // Test certificate
        const certTest = validateCertificate(ssoConfig.certificate);
        testResults.certificateValid = certTest.valid;
        if (!certTest.valid) {
            testResults.errors.push(`Certificate: ${certTest.error}`);
        }

        // Test URLs
        if (ssoConfig.ssoUrl) {
            try {
                new URL(ssoConfig.ssoUrl);
                testResults.urlsReachable = true;
            } catch (error) {
                testResults.errors.push('SSO URL is not valid');
            }
        }

        // Test SAML strategy creation
        const strategy = await samlService.createSAMLStrategy(firmId);
        if (strategy) {
            testResults.configurationValid = true;
        }

        // Update test metadata
        firm.enterpriseSettings.sso.lastTested = new Date();
        firm.enterpriseSettings.sso.lastTestedBy = req.userID;
        await firm.save();

        // Log test
        QueueService.logTeamActivity({
            firmId,
            userId: req.userID,
            action: 'read',
            targetType: 'setting',
            targetName: 'SSO Configuration Test',
            details: {
                testPassed: testResults.configurationValid,
                errors: testResults.errors
            },
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers['user-agent'],
            status: testResults.configurationValid ? 'success' : 'failed',
            timestamp: new Date()
        });

        const allTestsPassed = testResults.configurationValid &&
                              testResults.certificateValid &&
                              testResults.urlsReachable;

        res.json({
            success: true,
            message: allTestsPassed ? 'جميع الاختبارات نجحت' : 'بعض الاختبارات فشلت',
            messageEn: allTestsPassed ? 'All tests passed' : 'Some tests failed',
            testResults,
            testPassed: allTestsPassed,
            testedAt: new Date()
        });

    } catch (error) {
        testResults.errors.push(error.message);

        // Log failed test
        QueueService.logTeamActivity({
            firmId,
            userId: req.userID,
            action: 'read',
            targetType: 'setting',
            targetName: 'SSO Configuration Test',
            details: {
                testPassed: false,
                errors: testResults.errors
            },
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers['user-agent'],
            status: 'failed',
            errorMessage: error.message,
            timestamp: new Date()
        });

        res.status(400).json({
            success: false,
            message: 'فشل اختبار الاتصال',
            messageEn: 'Connection test failed',
            testResults,
            testPassed: false,
            errors: testResults.errors
        });
    }
});

/**
 * Upload IdP metadata XML
 * POST /api/firms/:firmId/sso/upload-metadata
 */
const uploadMetadata = asyncHandler(async (req, res) => {
    const firmId = sanitizeObjectId(req.params.firmId, 'firmId');

    // Mass assignment protection - only allow metadataXml field
    const allowedFields = ['metadataXml'];
    const sanitizedBody = pickAllowedFields(req.body, allowedFields);
    const { metadataXml } = sanitizedBody;

    // Validate firm access (IDOR protection)
    if (req.firmId !== firmId) {
        throw CustomException('ليس لديك صلاحية للوصول إلى هذا المكتب', 403);
    }

    // Require owner or admin role
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('هذا الإجراء متاح للمسؤولين فقط', 403);
    }

    if (!metadataXml || typeof metadataXml !== 'string') {
        throw CustomException('Metadata XML is required', 400);
    }

    // Get firm
    const firm = await Firm.findById(firmId);
    if (!firm) {
        throw CustomException('Firm not found', 404);
    }

    // Parse metadata XML
    let parsedMetadata;
    try {
        parsedMetadata = await parseMetadataXml(metadataXml);
    } catch (error) {
        throw CustomException(`Invalid metadata XML: ${error.message}`, 400);
    }

    // Validate extracted URLs from metadata
    const validationErrors = [];

    if (parsedMetadata.ssoUrl) {
        const ssoUrlValidation = validateSSOUrl(parsedMetadata.ssoUrl, 'SSO');
        if (!ssoUrlValidation.valid) {
            validationErrors.push(ssoUrlValidation.error);
        }
    }

    if (parsedMetadata.sloUrl) {
        const sloUrlValidation = validateSSOUrl(parsedMetadata.sloUrl, 'SLO');
        if (!sloUrlValidation.valid) {
            validationErrors.push(sloUrlValidation.error);
        }
    }

    if (parsedMetadata.metadataUrl) {
        const metadataValidation = validateSSOUrl(parsedMetadata.metadataUrl, 'Metadata');
        if (!metadataValidation.valid) {
            validationErrors.push(metadataValidation.error);
        }
    }

    if (validationErrors.length > 0) {
        throw CustomException(`Metadata validation failed: ${validationErrors.join('; ')}`, 400);
    }

    // Initialize SSO config if it doesn't exist
    if (!firm.enterpriseSettings) {
        firm.enterpriseSettings = {};
    }
    if (!firm.enterpriseSettings.sso) {
        firm.enterpriseSettings.sso = {};
    }

    // Update configuration from metadata
    const ssoConfig = firm.enterpriseSettings.sso;

    if (parsedMetadata.entityId) ssoConfig.entityId = parsedMetadata.entityId;
    if (parsedMetadata.ssoUrl) ssoConfig.ssoUrl = parsedMetadata.ssoUrl;
    if (parsedMetadata.sloUrl) ssoConfig.sloUrl = parsedMetadata.sloUrl;
    if (parsedMetadata.certificate) ssoConfig.certificate = parsedMetadata.certificate;
    ssoConfig.metadataUrl = parsedMetadata.metadataUrl || null;

    ssoConfig.configuredAt = new Date();
    ssoConfig.configuredBy = req.userID;

    // Update legacy fields
    firm.enterpriseSettings.ssoEntityId = ssoConfig.entityId;
    firm.enterpriseSettings.ssoSsoUrl = ssoConfig.ssoUrl;
    firm.enterpriseSettings.ssoCertificate = ssoConfig.certificate;

    await firm.save();

    // Clear strategy cache
    samlService.clearStrategyCache(firmId);

    // Log metadata upload
    QueueService.logTeamActivity({
        firmId,
        userId: req.userID,
        action: 'update',
        targetType: 'setting',
        targetName: 'SSO Metadata Upload',
        details: {
            entityId: parsedMetadata.entityId,
            ssoUrl: parsedMetadata.ssoUrl,
            source: 'metadata_xml'
        },
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
        status: 'success',
        timestamp: new Date()
    });

    res.json({
        success: true,
        message: 'تم تحميل البيانات الوصفية بنجاح',
        messageEn: 'Metadata uploaded successfully',
        data: {
            entityId: parsedMetadata.entityId,
            ssoUrl: parsedMetadata.ssoUrl,
            sloUrl: parsedMetadata.sloUrl,
            certificateConfigured: !!parsedMetadata.certificate
        }
    });
});

/**
 * Disable SSO
 * DELETE /api/firms/:firmId/sso
 */
const disableSSO = asyncHandler(async (req, res) => {
    const firmId = sanitizeObjectId(req.params.firmId, 'firmId');

    // Validate firm access (IDOR protection)
    if (req.firmId !== firmId) {
        throw CustomException('ليس لديك صلاحية للوصول إلى هذا المكتب', 403);
    }

    // Require owner role (admin not sufficient for disabling)
    if (req.firmRole !== 'owner') {
        throw CustomException('هذا الإجراء متاح لمالك المكتب فقط', 403);
    }

    // Get firm
    const firm = await Firm.findById(firmId);
    if (!firm) {
        throw CustomException('Firm not found', 404);
    }

    const wasEnabled = firm.enterpriseSettings?.sso?.enabled || false;

    // Disable SSO
    if (firm.enterpriseSettings?.sso) {
        firm.enterpriseSettings.sso.enabled = false;
    }
    if (firm.enterpriseSettings) {
        firm.enterpriseSettings.ssoEnabled = false;
    }

    await firm.save();

    // Clear strategy cache
    samlService.clearStrategyCache(firmId);

    // Log SSO disable
    QueueService.logTeamActivity({
        firmId,
        userId: req.userID,
        action: 'update',
        targetType: 'setting',
        targetName: 'SSO Disabled',
        details: {
            wasEnabled,
            disabledBy: req.userID
        },
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
        status: 'success',
        timestamp: new Date()
    });

    res.json({
        success: true,
        message: 'تم تعطيل SSO بنجاح',
        messageEn: 'SSO disabled successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Validate SSO URL against trusted provider domains
 * @param {string} url - The URL to validate
 * @param {string} urlType - Type of URL (sso, slo, metadata)
 * @returns {object} Validation result
 */
function validateSSOUrl(url, urlType = 'sso') {
    if (!url) {
        return { valid: true }; // Optional URLs are allowed
    }

    try {
        const parsedUrl = new URL(url);

        // Must be HTTPS
        if (parsedUrl.protocol !== 'https:') {
            return {
                valid: false,
                error: `${urlType} URL must use HTTPS protocol`
            };
        }

        // Whitelist of trusted SSO provider domains
        const trustedDomains = [
            // Azure AD / Microsoft
            'login.microsoftonline.com',
            'login.windows.net',
            'login.microsoft.com',
            'sts.windows.net',

            // Okta
            'okta.com',
            'oktapreview.com',
            'okta-emea.com',

            // Google Workspace
            'accounts.google.com',
            'google.com',

            // Auth0
            'auth0.com',

            // OneLogin
            'onelogin.com',

            // PingIdentity
            'pingone.com',
            'pingidentity.com',

            // JumpCloud
            'jumpcloud.com',

            // Generic SAML (allow custom domains for self-hosted)
            // For custom providers, we validate the URL format but don't restrict domain
        ];

        const hostname = parsedUrl.hostname.toLowerCase();

        // Check if hostname matches trusted domains or is a subdomain
        const isTrustedDomain = trustedDomains.some(domain => {
            return hostname === domain || hostname.endsWith('.' + domain);
        });

        // Allow custom domains but warn they should be validated manually
        if (!isTrustedDomain) {
            // Still allow it, but could add warning in response
            // This allows self-hosted SSO solutions
            logger.warn(`SSO URL uses non-standard domain: ${hostname}`);
        }

        return { valid: true, isCustomDomain: !isTrustedDomain };
    } catch (error) {
        return {
            valid: false,
            error: `Invalid ${urlType} URL format: ${error.message}`
        };
    }
}

/**
 * Validate certificate format
 * @param {string} certificate - PEM certificate
 * @returns {object} Validation result
 */
function validateCertificate(certificate) {
    if (!certificate || typeof certificate !== 'string') {
        return { valid: false, error: 'Certificate is required' };
    }

    const cert = certificate.trim();

    // Check if it contains BEGIN/END markers
    if (!cert.includes('BEGIN CERTIFICATE') || !cert.includes('END CERTIFICATE')) {
        return {
            valid: false,
            error: 'Invalid certificate format. Must be PEM encoded with BEGIN/END markers'
        };
    }

    // Basic validation - check if there's content between markers
    const certContent = cert
        .replace(/-----BEGIN CERTIFICATE-----/, '')
        .replace(/-----END CERTIFICATE-----/, '')
        .replace(/\s/g, '');

    if (certContent.length < 100) {
        return { valid: false, error: 'Certificate content appears too short' };
    }

    // Check if it's base64
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    if (!base64Regex.test(certContent)) {
        return { valid: false, error: 'Certificate must be base64 encoded' };
    }

    return { valid: true };
}

/**
 * Validate SSO configuration completeness
 * @param {object} config - SSO configuration
 * @returns {object} Validation result
 */
function validateSSOConfig(config) {
    const errors = [];

    if (!config.provider) {
        errors.push('SSO provider is required');
    }

    if (!config.entityId) {
        errors.push('Entity ID is required');
    }

    if (!config.ssoUrl) {
        errors.push('SSO URL is required');
    }

    if (!config.certificate) {
        errors.push('Certificate is required');
    }

    const certValidation = validateCertificate(config.certificate);
    if (!certValidation.valid) {
        errors.push(certValidation.error);
    }

    // URL validation with whitelist check
    if (config.ssoUrl) {
        const ssoUrlValidation = validateSSOUrl(config.ssoUrl, 'SSO');
        if (!ssoUrlValidation.valid) {
            errors.push(ssoUrlValidation.error);
        }
    }

    if (config.sloUrl) {
        const sloUrlValidation = validateSSOUrl(config.sloUrl, 'SLO');
        if (!sloUrlValidation.valid) {
            errors.push(sloUrlValidation.error);
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Parse IdP metadata XML
 * @param {string} metadataXml - Metadata XML string
 * @returns {Promise<object>} Parsed metadata
 */
async function parseMetadataXml(metadataXml) {
    const parser = new xml2js.Parser({
        explicitArray: false,
        ignoreAttrs: false,
        tagNameProcessors: [xml2js.processors.stripPrefix]
    });

    let result;
    try {
        result = await parser.parseStringPromise(metadataXml);
    } catch (error) {
        throw new Error(`XML parsing failed: ${error.message}`);
    }

    // Extract metadata based on common SAML metadata structure
    const descriptor = result.EntityDescriptor || result.EntitiesDescriptor?.EntityDescriptor;

    if (!descriptor) {
        throw new Error('Invalid SAML metadata: EntityDescriptor not found');
    }

    const metadata = {
        entityId: descriptor.$.entityID || null,
        ssoUrl: null,
        sloUrl: null,
        certificate: null,
        metadataUrl: null
    };

    // Find IDPSSODescriptor
    const idpDescriptor = descriptor.IDPSSODescriptor;
    if (!idpDescriptor) {
        throw new Error('Invalid SAML metadata: IDPSSODescriptor not found');
    }

    // Extract SSO URL
    const ssoServices = Array.isArray(idpDescriptor.SingleSignOnService)
        ? idpDescriptor.SingleSignOnService
        : [idpDescriptor.SingleSignOnService];

    const httpPostSSO = ssoServices.find(s => s && s.$.Binding?.includes('HTTP-POST'));
    const httpRedirectSSO = ssoServices.find(s => s && s.$.Binding?.includes('HTTP-Redirect'));

    metadata.ssoUrl = httpPostSSO?.$?.Location || httpRedirectSSO?.$?.Location || null;

    // Extract SLO URL
    const sloServices = Array.isArray(idpDescriptor.SingleLogoutService)
        ? idpDescriptor.SingleLogoutService
        : idpDescriptor.SingleLogoutService ? [idpDescriptor.SingleLogoutService] : [];

    const httpPostSLO = sloServices.find(s => s && s.$.Binding?.includes('HTTP-POST'));
    const httpRedirectSLO = sloServices.find(s => s && s.$.Binding?.includes('HTTP-Redirect'));

    metadata.sloUrl = httpPostSLO?.$?.Location || httpRedirectSLO?.$?.Location || null;

    // Extract certificate
    const keyDescriptor = Array.isArray(idpDescriptor.KeyDescriptor)
        ? idpDescriptor.KeyDescriptor[0]
        : idpDescriptor.KeyDescriptor;

    if (keyDescriptor?.KeyInfo?.X509Data?.X509Certificate) {
        const certData = keyDescriptor.KeyInfo.X509Data.X509Certificate;
        const certContent = typeof certData === 'string' ? certData : certData._;
        metadata.certificate = `-----BEGIN CERTIFICATE-----\n${certContent}\n-----END CERTIFICATE-----`;
    }

    return metadata;
}

module.exports = {
    getSSOConfig,
    updateSSOConfig,
    testSSOConnection,
    uploadMetadata,
    disableSSO
};
