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
        console.error('Get LDAP config error:', error);
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
        } = request.body;

        // Validation
        if (!serverUrl || !baseDn) {
            return response.status(400).json({
                error: true,
                message: 'Server URL and Base DN are required'
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

        // Only update password if provided
        if (bindPassword) {
            config.bindPassword = bindPassword; // Will be encrypted by plugin
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
        console.error('Save LDAP config error:', error);
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

        const { testUser, testPassword } = request.body;

        // Get config
        const config = await LdapConfig.getConfig(firmId);

        if (!config) {
            return response.status(404).json({
                error: true,
                message: 'LDAP configuration not found'
            });
        }

        // Test connection
        const testOptions = {};
        if (testUser && testPassword) {
            testOptions.testUser = testUser;
            testOptions.testPassword = testPassword;
        }

        const result = await ldapService.testConnection(config.toObject(), testOptions);

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
        console.error('Test LDAP connection error:', error);
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

        const { username, password } = request.body;

        if (!username || !password) {
            return response.status(400).json({
                error: true,
                message: 'Username and password are required'
            });
        }

        // Test authentication
        const result = await ldapService.testUserAuth(firmId, username, password);

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
        console.error('Test LDAP auth error:', error);
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

        const { filter } = request.body;

        // Sync users
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
        console.error('Sync LDAP users error:', error);
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
        const { firmId, username, password } = request.body;

        if (!firmId || !username || !password) {
            return response.status(400).json({
                error: true,
                message: 'Firm ID, username, and password are required'
            });
        }

        // Authenticate via LDAP
        const result = await ldapService.authenticate(firmId, username, password);

        if (!result.success) {
            // Log failed login attempt
            await auditLogService.log(
                'ldap_login_failed',
                'user',
                null,
                null,
                {
                    firmId,
                    username,
                    message: result.message,
                    severity: 'high'
                }
            );

            return response.status(401).json({
                error: true,
                message: result.message
            });
        }

        // Log successful login
        await auditLogService.log(
            'ldap_login_success',
            'user',
            result.user._id,
            result.user._id,
            {
                firmId,
                username,
                userId: result.user._id,
                severity: 'medium'
            }
        );

        // Set cookie (similar to regular login)
        const isProductionEnv = process.env.NODE_ENV === 'production' ||
                                process.env.NODE_ENV === 'prod' ||
                                process.env.RENDER === 'true';

        response.cookie('token', result.token, {
            httpOnly: true,
            sameSite: isProductionEnv ? 'none' : 'lax',
            secure: isProductionEnv,
            maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days
            path: '/'
        });

        return response.status(200).json({
            error: false,
            message: result.message,
            data: result.user,
            token: result.token
        });

    } catch (error) {
        console.error('LDAP login error:', error);
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
