/**
 * LDAP Controller
 *
 * Handles LDAP/Active Directory configuration and authentication endpoints
 *
 * Features:
 * - Get/save LDAP configuration
 * - Test LDAP connection
 * - Test user authentication
 * - Sync users from LDAP
 * - LDAP login endpoint
 */

const ldapService = require('../services/ldap.service');
const LdapConfig = require('../models/ldapConfig.model');
const auditLogService = require('../services/auditLog.service');
const { encryptField } = require('../utils/encryption');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const { getCookieConfig } = require('../utils/cookieConfig');
const Firm = require('../models/firm.model');
const logger = require('../utils/logger');

/**
 * Validate LDAP filter to prevent injection attacks
 */
const validateLdapFilter = (filter) => {
    if (!filter) return true;

    // Check for dangerous characters and patterns
    const dangerousPatterns = [
        /[;&|`$]/,  // Shell metacharacters
        /\.\./,      // Directory traversal
        /\x00/,      // Null bytes
    ];

    for (const pattern of dangerousPatterns) {
        if (pattern.test(filter)) {
            return false;
        }
    }

    // Ensure filter has balanced parentheses
    let count = 0;
    for (const char of filter) {
        if (char === '(') count++;
        if (char === ')') count--;
        if (count < 0) return false;
    }

    return count === 0;
};

/**
 * Sanitize LDAP input to prevent injection
 */
const sanitizeLdapInput = (input) => {
    if (!input || typeof input !== 'string') return input;

    // Escape LDAP special characters
    return input
        .replace(/\\/g, '\\5c')
        .replace(/\*/g, '\\2a')
        .replace(/\(/g, '\\28')
        .replace(/\)/g, '\\29')
        .replace(/\0/g, '\\00');
};

/**
 * Validate LDAP URL format
 */
const validateLdapUrl = (url) => {
    if (!url) return false;

    const ldapUrlPattern = /^ldaps?:\/\/[a-zA-Z0-9.-]+(:[0-9]{1,5})?$/;
    return ldapUrlPattern.test(url);
};

/**
 * Validate Distinguished Name (DN) format
 */
const validateDn = (dn) => {
    if (!dn) return false;

    // Basic DN validation - should contain valid DN components
    const dnPattern = /^([a-zA-Z]+=.+)(,\s*[a-zA-Z]+=.+)*$/;
    return dnPattern.test(dn) && !dn.includes('..') && !dn.includes('\0');
};

/**
 * Verify user has access to firm
 */
const verifyFirmAccess = async (userId, firmId) => {
    const sanitizedFirmId = sanitizeObjectId(firmId);
    const sanitizedUserId = sanitizeObjectId(userId);

    if (!sanitizedFirmId || !sanitizedUserId) {
        throw new CustomException('Invalid firm or user ID', 400);
    }

    const firm = await Firm.findOne({
        _id: sanitizedFirmId,
        $or: [
            { owner: sanitizedUserId },
            { admins: sanitizedUserId },
            { members: sanitizedUserId }
        ]
    });

    if (!firm) {
        throw new CustomException('Access denied: You do not have permission to access this firm', 403);
    }

    return firm;
};

/**
 * Get LDAP configuration for firm
 * GET /api/admin/ldap/config
 *
 * @access Admin only
 */
const getConfig = async (request, response) => {
    try {
        const userId = request.userID || request.user?._id;
        const firmId = request.firmId;

        if (!firmId) {
            return response.status(400).json({
                error: true,
                message: 'Firm ID is required'
            });
        }

        // IDOR Protection: Verify user has access to this firm
        await verifyFirmAccess(userId, firmId);

        // Get config
        let config = await LdapConfig.getConfig(firmId);

        if (!config) {
            // Return default config template
            return response.status(200).json({
                error: false,
                config: {
                    isEnabled: false,
                    serverUrl: '',
                    baseDn: '',
                    bindDn: '',
                    userFilter: '(uid={username})',
                    attributeMapping: {
                        username: 'uid',
                        email: 'mail',
                        firstName: 'givenName',
                        lastName: 'sn',
                        displayName: 'cn',
                        phone: 'telephoneNumber',
                        memberOf: 'memberOf'
                    },
                    useSsl: false,
                    useStarttls: true,
                    verifyCertificate: true,
                    autoProvisionUsers: true,
                    updateUserAttributes: true,
                    defaultRole: 'lawyer',
                    timeout: 5000,
                    searchScope: 'sub'
                },
                exists: false
            });
        }

        // Return safe config (without sensitive data)
        const safeConfig = config.toSafeObject();

        // Add status information
        const status = config.getStatus();

        return response.status(200).json({
            error: false,
            config: safeConfig,
            status: status,
            exists: true
        });

    } catch (error) {
        logger.error('Get LDAP config error:', error);
        return response.status(500).json({
            error: true,
            message: 'Failed to retrieve LDAP configuration',
            details: error.message
        });
    }
};

/**
 * Save LDAP configuration
 * POST /api/admin/ldap/config
 *
 * @access Admin only
 */
const saveConfig = async (request, response) => {
    try {
        const userId = request.userID || request.user?._id;
        const firmId = request.firmId;

        if (!firmId) {
            return response.status(400).json({
                error: true,
                message: 'Firm ID is required'
            });
        }

        // IDOR Protection: Verify user has access to this firm
        await verifyFirmAccess(userId, firmId);

        // Mass Assignment Protection: Only allow specific fields
        const allowedFields = [
            'name',
            'serverUrl',
            'baseDn',
            'bindDn',
            'bindPassword',
            'userFilter',
            'groupFilter',
            'attributeMapping',
            'groupMapping',
            'defaultRole',
            'useSsl',
            'useStarttls',
            'verifyCertificate',
            'tlsCaCert',
            'isEnabled',
            'autoProvisionUsers',
            'updateUserAttributes',
            'allowLocalFallback',
            'timeout',
            'searchScope',
            'pageSize'
        ];

        const sanitizedData = pickAllowedFields(request.body, allowedFields);

        const {
            name,
            serverUrl,
            baseDn,
            bindDn,
            bindPassword,
            userFilter,
            groupFilter,
            attributeMapping,
            groupMapping,
            defaultRole,
            useSsl,
            useStarttls,
            verifyCertificate,
            tlsCaCert,
            isEnabled,
            autoProvisionUsers,
            updateUserAttributes,
            allowLocalFallback,
            timeout,
            searchScope,
            pageSize
        } = sanitizedData;

        // Input Validation
        if (!serverUrl || !baseDn) {
            return response.status(400).json({
                error: true,
                message: 'Server URL and Base DN are required'
            });
        }

        // Validate LDAP URL format
        if (!validateLdapUrl(serverUrl)) {
            return response.status(400).json({
                error: true,
                message: 'Invalid LDAP server URL format. Must be ldap:// or ldaps:// followed by hostname and optional port'
            });
        }

        // Validate Base DN format
        if (!validateDn(baseDn)) {
            return response.status(400).json({
                error: true,
                message: 'Invalid Base DN format'
            });
        }

        // Validate Bind DN if provided
        if (bindDn && !validateDn(bindDn)) {
            return response.status(400).json({
                error: true,
                message: 'Invalid Bind DN format'
            });
        }

        // Validate LDAP filters to prevent injection
        if (userFilter && !validateLdapFilter(userFilter)) {
            return response.status(400).json({
                error: true,
                message: 'Invalid user filter format. Contains potentially dangerous characters'
            });
        }

        if (groupFilter && !validateLdapFilter(groupFilter)) {
            return response.status(400).json({
                error: true,
                message: 'Invalid group filter format. Contains potentially dangerous characters'
            });
        }

        // Validate timeout value
        if (timeout !== undefined && (typeof timeout !== 'number' || timeout < 1000 || timeout > 60000)) {
            return response.status(400).json({
                error: true,
                message: 'Timeout must be a number between 1000 and 60000 milliseconds'
            });
        }

        // Validate page size
        if (pageSize !== undefined && (typeof pageSize !== 'number' || pageSize < 1 || pageSize > 1000)) {
            return response.status(400).json({
                error: true,
                message: 'Page size must be a number between 1 and 1000'
            });
        }

        // Validate default role
        const validRoles = ['admin', 'lawyer', 'paralegal', 'secretary', 'accountant', 'client'];
        if (defaultRole && !validRoles.includes(defaultRole)) {
            return response.status(400).json({
                error: true,
                message: `Invalid default role. Must be one of: ${validRoles.join(', ')}`
            });
        }

        // Validate search scope
        const validScopes = ['base', 'one', 'sub'];
        if (searchScope && !validScopes.includes(searchScope)) {
            return response.status(400).json({
                error: true,
                message: `Invalid search scope. Must be one of: ${validScopes.join(', ')}`
            });
        }

        // Find or create config
        let config = await LdapConfig.findOne({ firmId });
        const isNew = !config;

        if (!config) {
            config = new LdapConfig({
                firmId,
                createdBy: userId
            });
        }

        // Update fields
        if (name !== undefined) config.name = name;
        if (serverUrl !== undefined) config.serverUrl = serverUrl;
        if (baseDn !== undefined) config.baseDn = baseDn;
        if (bindDn !== undefined) config.bindDn = bindDn;

        // Secure Credential Protection: Only update password if provided and validate strength
        if (bindPassword) {
            // Ensure password is a string and has minimum length
            if (typeof bindPassword !== 'string' || bindPassword.length < 8) {
                return response.status(400).json({
                    error: true,
                    message: 'Bind password must be at least 8 characters long'
                });
            }
            // Password will be encrypted by the model's encryption plugin
            config.bindPassword = bindPassword;
        }

        if (userFilter !== undefined) config.userFilter = userFilter;
        if (groupFilter !== undefined) config.groupFilter = groupFilter;
        if (attributeMapping !== undefined) config.attributeMapping = attributeMapping;
        if (groupMapping !== undefined) config.groupMapping = new Map(Object.entries(groupMapping));
        if (defaultRole !== undefined) config.defaultRole = defaultRole;
        if (useSsl !== undefined) config.useSsl = useSsl;
        if (useStarttls !== undefined) config.useStarttls = useStarttls;
        if (verifyCertificate !== undefined) config.verifyCertificate = verifyCertificate;
        if (tlsCaCert !== undefined) config.tlsCaCert = tlsCaCert;
        if (isEnabled !== undefined) config.isEnabled = isEnabled;
        if (autoProvisionUsers !== undefined) config.autoProvisionUsers = autoProvisionUsers;
        if (updateUserAttributes !== undefined) config.updateUserAttributes = updateUserAttributes;
        if (allowLocalFallback !== undefined) config.allowLocalFallback = allowLocalFallback;
        if (timeout !== undefined) config.timeout = timeout;
        if (searchScope !== undefined) config.searchScope = searchScope;
        if (pageSize !== undefined) config.pageSize = pageSize;

        config.updatedBy = userId;

        // Record change in history
        config.recordChange(
            isNew ? 'created' : 'updated',
            userId,
            { serverUrl, baseDn, isEnabled },
            isNew ? 'Initial configuration' : 'Configuration updated'
        );

        await config.save();

        // Log audit event
        await auditLogService.log(
            isNew ? 'ldap_config_created' : 'ldap_config_updated',
            'ldap_config',
            config._id,
            userId,
            {
                firmId,
                isEnabled: config.isEnabled,
                serverUrl: config.serverUrl,
                severity: 'high'
            }
        );

        return response.status(200).json({
            error: false,
            message: isNew ? 'LDAP configuration created successfully' : 'LDAP configuration updated successfully',
            config: config.toSafeObject()
        });

    } catch (error) {
        logger.error('Save LDAP config error:', error);
        return response.status(500).json({
            error: true,
            message: 'Failed to save LDAP configuration',
            details: error.message
        });
    }
};

/**
 * Test LDAP connection
 * POST /api/admin/ldap/test
 *
 * @access Admin only
 */
const testConnection = async (request, response) => {
    try {
        const userId = request.userID || request.user?._id;
        const firmId = request.firmId;

        if (!firmId) {
            return response.status(400).json({
                error: true,
                message: 'Firm ID is required'
            });
        }

        // IDOR Protection: Verify user has access to this firm
        await verifyFirmAccess(userId, firmId);

        // Mass Assignment Protection: Only allow specific fields
        const allowedFields = ['testUser', 'testPassword'];
        const sanitizedData = pickAllowedFields(request.body, allowedFields);
        const { testUser, testPassword } = sanitizedData;

        // Sanitize test credentials to prevent injection
        const sanitizedTestUser = testUser ? sanitizeLdapInput(testUser) : null;

        // Get config
        const config = await LdapConfig.getConfig(firmId);

        if (!config) {
            return response.status(404).json({
                error: true,
                message: 'LDAP configuration not found'
            });
        }

        // Test connection with sanitized credentials
        const testOptions = {};
        if (sanitizedTestUser && testPassword) {
            testOptions.testUser = sanitizedTestUser;
            testOptions.testPassword = testPassword;
        }

        // Response Leakage Protection: Pass document directly instead of toObject()
        // This prevents accidental exposure of encrypted fields if result is logged
        const result = await ldapService.testConnection(config, testOptions);

        // Update config with test result
        config.lastConnectionTest = {
            testedAt: new Date(),
            testedBy: userId,
            success: result.success,
            message: result.message,
            responseTime: result.responseTime
        };
        await config.save();

        // Log audit event
        await auditLogService.log(
            'ldap_connection_tested',
            'ldap_config',
            config._id,
            userId,
            {
                firmId,
                success: result.success,
                message: result.message,
                severity: 'medium'
            }
        );

        return response.status(result.success ? 200 : 400).json({
            error: !result.success,
            ...result
        });

    } catch (error) {
        logger.error('Test LDAP connection error:', error);
        return response.status(500).json({
            error: true,
            message: 'Connection test failed',
            details: error.message
        });
    }
};

/**
 * Test user authentication
 * POST /api/admin/ldap/test-auth
 *
 * @access Admin only
 */
const testAuth = async (request, response) => {
    try {
        const userId = request.userID || request.user?._id;
        const firmId = request.firmId;

        if (!firmId) {
            return response.status(400).json({
                error: true,
                message: 'Firm ID is required'
            });
        }

        // IDOR Protection: Verify user has access to this firm
        await verifyFirmAccess(userId, firmId);

        // Mass Assignment Protection: Only allow specific fields
        const allowedFields = ['username', 'password'];
        const sanitizedData = pickAllowedFields(request.body, allowedFields);
        const { username, password } = sanitizedData;

        if (!username || !password) {
            return response.status(400).json({
                error: true,
                message: 'Username and password are required'
            });
        }

        // Sanitize username to prevent LDAP injection
        const sanitizedUsername = sanitizeLdapInput(username);

        // Test authentication with sanitized username
        const result = await ldapService.testUserAuth(firmId, sanitizedUsername, password);

        // Log audit event
        await auditLogService.log(
            'ldap_auth_tested',
            'user',
            userId,
            userId,
            {
                firmId,
                username,
                success: result.success,
                severity: 'medium'
            }
        );

        return response.status(result.success ? 200 : 400).json({
            error: !result.success,
            ...result
        });

    } catch (error) {
        logger.error('Test LDAP auth error:', error);
        return response.status(500).json({
            error: true,
            message: 'Authentication test failed',
            details: error.message
        });
    }
};

/**
 * Sync users from LDAP
 * POST /api/admin/ldap/sync
 *
 * @access Admin only
 */
const syncUsers = async (request, response) => {
    try {
        const userId = request.userID || request.user?._id;
        const firmId = request.firmId;

        if (!firmId) {
            return response.status(400).json({
                error: true,
                message: 'Firm ID is required'
            });
        }

        // IDOR Protection: Verify user has access to this firm
        await verifyFirmAccess(userId, firmId);

        // Mass Assignment Protection: Only allow specific fields
        const allowedFields = ['filter'];
        const sanitizedData = pickAllowedFields(request.body, allowedFields);
        const { filter } = sanitizedData;

        // Validate and sanitize filter to prevent LDAP injection
        if (filter && !validateLdapFilter(filter)) {
            return response.status(400).json({
                error: true,
                message: 'Invalid filter format. Contains potentially dangerous characters'
            });
        }

        // Sync users with validated filter
        const result = await ldapService.syncUsers(firmId, { filter });

        // Log audit event
        await auditLogService.log(
            'ldap_users_synced',
            'ldap_config',
            firmId,
            userId,
            {
                firmId,
                success: result.success,
                stats: result.stats,
                severity: 'high'
            }
        );

        return response.status(result.success ? 200 : 400).json({
            error: !result.success,
            ...result
        });

    } catch (error) {
        logger.error('Sync LDAP users error:', error);
        return response.status(500).json({
            error: true,
            message: 'User synchronization failed',
            details: error.message
        });
    }
};

/**
 * LDAP login endpoint
 * POST /api/auth/ldap/login
 *
 * @access Public
 */
const login = async (request, response) => {
    try {
        // Mass Assignment Protection: Only allow specific fields
        const allowedFields = ['firmId', 'username', 'password'];
        const sanitizedData = pickAllowedFields(request.body, allowedFields);
        const { firmId, username, password } = sanitizedData;

        if (!firmId || !username || !password) {
            return response.status(400).json({
                error: true,
                message: 'Firm ID, username, and password are required'
            });
        }

        // Sanitize inputs to prevent injection attacks
        const sanitizedFirmId = sanitizeObjectId(firmId);
        const sanitizedUsername = sanitizeLdapInput(username);

        if (!sanitizedFirmId) {
            return response.status(400).json({
                error: true,
                message: 'Invalid Firm ID'
            });
        }

        // Validate username format
        if (!sanitizedUsername || sanitizedUsername.length === 0 || sanitizedUsername.length > 255) {
            return response.status(400).json({
                error: true,
                message: 'Invalid username format'
            });
        }

        // Authenticate via LDAP with sanitized inputs
        const result = await ldapService.authenticate(sanitizedFirmId, sanitizedUsername, password);

        if (!result.success) {
            // Log failed login attempt with sanitized data
            await auditLogService.log(
                'ldap_login_failed',
                'user',
                null,
                null,
                {
                    firmId: sanitizedFirmId,
                    username: sanitizedUsername,
                    message: result.message,
                    severity: 'high'
                }
            );

            return response.status(401).json({
                error: true,
                message: result.message
            });
        }

        // Log successful login with sanitized data
        await auditLogService.log(
            'ldap_login_success',
            'user',
            result.user._id,
            result.user._id,
            {
                firmId: sanitizedFirmId,
                username: sanitizedUsername,
                userId: result.user._id,
                severity: 'medium'
            }
        );

        // Set cookies using secure centralized configuration
        const accessCookieConfig = getCookieConfig(request, 'access');
        const refreshCookieConfig = getCookieConfig(request, 'refresh');

        response.cookie('accessToken', result.token, accessCookieConfig);
        response.cookie('refreshToken', result.refreshToken, refreshCookieConfig);

        return response.status(200).json({
            error: false,
            message: result.message,
            // OAuth 2.0 standard format (snake_case) - Industry standard for tokens
            access_token: result.access_token,
            refresh_token: result.refresh_token,
            token_type: result.token_type || 'Bearer',
            expires_in: result.expires_in || 900,
            // Backwards compatibility (camelCase)
            accessToken: result.token,
            refreshToken: result.refreshToken,
            user: result.user,
            data: result.user // Legacy field for backwards compat
        });

    } catch (error) {
        logger.error('LDAP login error:', error);
        return response.status(500).json({
            error: true,
            message: 'Login failed',
            details: error.message
        });
    }
};

module.exports = {
    getConfig,
    saveConfig,
    testConnection,
    testAuth,
    syncUsers,
    login
};
