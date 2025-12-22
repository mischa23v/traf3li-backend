const ldap = require('ldapjs');
const LdapConfig = require('../models/ldapConfig.model');
const User = require('../models/user.model');
const Firm = require('../models/firm.model');
const { decrypt, encrypt } = require('../utils/encryption');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { getDefaultPermissions } = require('../config/permissions.config');

const { JWT_SECRET } = process.env;

/**
 * LDAP Service
 *
 * Handles LDAP/Active Directory authentication and user synchronization
 *
 * Features:
 * - User authentication via LDAP
 * - Just-in-Time (JIT) user provisioning
 * - User attribute synchronization
 * - Group-based role mapping
 * - Connection testing
 * - Bulk user synchronization
 */
class LdapService {
    /**
     * Create LDAP client with configuration
     * @param {Object} config - LDAP configuration
     * @returns {Object} LDAP client
     */
    createClient(config) {
        if (!config || !config.serverUrl) {
            throw new Error('LDAP configuration is required');
        }

        const clientOptions = {
            url: config.serverUrl,
            timeout: config.timeout || 5000,
            connectTimeout: config.timeout || 5000,
            reconnect: false
        };

        // Configure TLS/SSL
        if (config.useSsl || config.serverUrl.startsWith('ldaps://')) {
            clientOptions.tlsOptions = {
                rejectUnauthorized: config.verifyCertificate !== false
            };

            // Add custom CA certificate if provided
            if (config.tlsCaCert) {
                clientOptions.tlsOptions.ca = [config.tlsCaCert];
            }
        }

        return ldap.createClient(clientOptions);
    }

    /**
     * Bind to LDAP server with credentials
     * @param {Object} client - LDAP client
     * @param {String} dn - Distinguished Name
     * @param {String} password - Password
     * @returns {Promise<void>}
     */
    async bind(client, dn, password) {
        return new Promise((resolve, reject) => {
            client.bind(dn, password, (err) => {
                if (err) {
                    reject(new Error(`LDAP bind failed: ${err.message}`));
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Search for user in LDAP
     * @param {Object} client - LDAP client
     * @param {String} baseDn - Base DN for search
     * @param {String} filter - LDAP search filter
     * @param {Object} config - LDAP configuration
     * @returns {Promise<Array>} Search results
     */
    async searchUser(client, baseDn, filter, config = {}) {
        return new Promise((resolve, reject) => {
            const searchOptions = {
                scope: config.searchScope || 'sub',
                filter: filter,
                attributes: Object.values(config.attributeMapping || {
                    username: 'uid',
                    email: 'mail',
                    firstName: 'givenName',
                    lastName: 'sn',
                    displayName: 'cn',
                    phone: 'telephoneNumber',
                    memberOf: 'memberOf'
                }),
                paged: false
            };

            client.search(baseDn, searchOptions, (err, res) => {
                if (err) {
                    return reject(new Error(`LDAP search failed: ${err.message}`));
                }

                const entries = [];

                res.on('searchEntry', (entry) => {
                    entries.push({
                        dn: entry.objectName,
                        attributes: entry.object
                    });
                });

                res.on('error', (error) => {
                    reject(new Error(`LDAP search error: ${error.message}`));
                });

                res.on('end', (result) => {
                    if (result.status !== 0) {
                        reject(new Error(`LDAP search failed with status: ${result.status}`));
                    } else {
                        resolve(entries);
                    }
                });
            });
        });
    }

    /**
     * Authenticate user via LDAP and return JWT token
     * @param {String} firmId - Firm ID
     * @param {String} username - Username
     * @param {String} password - Password
     * @returns {Promise<Object>} { success, user, token, message }
     */
    async authenticate(firmId, username, password) {
        let client = null;

        try {
            // 1. Get LDAP config for firm
            const config = await LdapConfig.getActiveConfig(firmId);

            if (!config) {
                return {
                    success: false,
                    message: 'LDAP authentication is not configured or enabled for this firm'
                };
            }

            if (!config.isConfigurationComplete()) {
                return {
                    success: false,
                    message: 'LDAP configuration is incomplete'
                };
            }

            // 2. Create LDAP client
            client = this.createClient(config);

            // Handle STARTTLS
            if (config.useStarttls && !config.useSsl) {
                await new Promise((resolve, reject) => {
                    client.starttls({
                        rejectUnauthorized: config.verifyCertificate !== false
                    }, null, (err) => {
                        if (err) reject(new Error(`STARTTLS failed: ${err.message}`));
                        else resolve();
                    });
                });
            }

            // 3. Bind with service account (if configured)
            if (config.bindDn && config.bindPassword_encrypted) {
                const decryptedPassword = decrypt(
                    `${config.bindPassword_encrypted.iv}:${config.bindPassword_encrypted.authTag}:${config.bindPassword_encrypted.encrypted}`
                );
                await this.bind(client, config.bindDn, decryptedPassword);
            }

            // 4. Search for user
            const userFilter = config.userFilter.replace('{username}', username);
            const users = await this.searchUser(client, config.baseDn, userFilter, config);

            if (users.length === 0) {
                return {
                    success: false,
                    message: 'Invalid username or password'
                };
            }

            if (users.length > 1) {
                return {
                    success: false,
                    message: 'Multiple users found. Please contact your administrator.'
                };
            }

            const ldapUser = users[0];
            const userDn = ldapUser.dn;

            // 5. Bind as user to verify password
            try {
                await this.bind(client, userDn, password);
            } catch (authError) {
                return {
                    success: false,
                    message: 'Invalid username or password'
                };
            }

            // 6. Map LDAP attributes to user data
            const attrs = config.attributeMapping || {};
            const ldapAttributes = ldapUser.attributes;

            const userData = {
                username: ldapAttributes[attrs.username] || username,
                email: ldapAttributes[attrs.email],
                firstName: ldapAttributes[attrs.firstName] || 'User',
                lastName: ldapAttributes[attrs.lastName] || 'User',
                displayName: ldapAttributes[attrs.displayName] || `${ldapAttributes[attrs.firstName]} ${ldapAttributes[attrs.lastName]}`,
                phone: ldapAttributes[attrs.phone] || '',
                memberOf: ldapAttributes[attrs.memberOf] || [],
                ldapDn: userDn
            };

            // Validate required fields
            if (!userData.email) {
                return {
                    success: false,
                    message: 'Email not found in LDAP directory. Please contact your administrator.'
                };
            }

            // Determine role from group mapping
            let firmRole = config.defaultFirmRole || 'lawyer';
            if (config.groupMapping && config.groupMapping.size > 0) {
                for (const [groupDn, mappedRole] of config.groupMapping) {
                    if (Array.isArray(userData.memberOf)) {
                        if (userData.memberOf.includes(groupDn)) {
                            firmRole = mappedRole;
                            break;
                        }
                    } else if (userData.memberOf === groupDn) {
                        firmRole = mappedRole;
                        break;
                    }
                }
            }

            // 7. Find or create local user
            let user = await User.findOne({
                email: userData.email.toLowerCase(),
                firmId: firmId
            });

            const firm = await Firm.findById(firmId);
            if (!firm) {
                return {
                    success: false,
                    message: 'Firm not found'
                };
            }

            if (!user) {
                // Create new user via JIT provisioning
                if (!config.autoProvisionUsers) {
                    return {
                        success: false,
                        message: 'User does not exist and auto-provisioning is disabled'
                    };
                }

                // Generate random password (won't be used for LDAP users)
                const randomPassword = crypto.randomBytes(32).toString('hex');
                const hashedPassword = await bcrypt.hash(randomPassword, 12);

                user = new User({
                    username: userData.username,
                    email: userData.email.toLowerCase(),
                    password: hashedPassword,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    phone: userData.phone,
                    role: config.defaultRole || 'lawyer',
                    firmId: firmId,
                    firmRole: firmRole,
                    firmStatus: 'active',
                    country: 'Saudi Arabia',
                    isSSOUser: true,
                    ssoProvider: 'ldap',
                    ssoExternalId: userDn,
                    createdViaSSO: true,
                    lastLogin: new Date()
                });

                await user.save();

                // Add user to firm members
                try {
                    firm.members.push({
                        userId: user._id,
                        role: firmRole,
                        permissions: getDefaultPermissions(firmRole),
                        joinedAt: new Date(),
                        status: 'active'
                    });
                    await firm.save();
                } catch (firmError) {
                    console.error('Error adding user to firm:', firmError);
                }
            } else {
                // Update existing user attributes (if enabled)
                if (config.updateUserAttributes) {
                    user.firstName = userData.firstName;
                    user.lastName = userData.lastName;
                    user.phone = userData.phone || user.phone;
                    user.firmRole = firmRole;
                    user.lastLogin = new Date();
                    await user.save();

                    // Update firm member role if changed
                    const memberIndex = firm.members.findIndex(m =>
                        m.userId.toString() === user._id.toString()
                    );
                    if (memberIndex >= 0 && firm.members[memberIndex].role !== firmRole) {
                        firm.members[memberIndex].role = firmRole;
                        firm.members[memberIndex].permissions = getDefaultPermissions(firmRole);
                        await firm.save();
                    }
                } else {
                    user.lastLogin = new Date();
                    await user.save();
                }
            }

            // 8. Generate JWT token
            const token = jwt.sign({
                _id: user._id,
                isSeller: user.isSeller
            }, JWT_SECRET, { expiresIn: '7 days' });

            // Return user data (excluding password)
            const { password: pwd, ...userDataResponse } = user.toObject();

            return {
                success: true,
                message: 'Authentication successful',
                user: userDataResponse,
                token: token
            };

        } catch (error) {
            console.error('LDAP authentication error:', error);
            return {
                success: false,
                message: 'LDAP authentication failed',
                error: error.message
            };
        } finally {
            // Always close the connection
            if (client) {
                try {
                    client.unbind();
                } catch (error) {
                    // Ignore unbind errors
                }
            }
        }
    }

    /**
     * Test LDAP connection
     * @param {Object} config - LDAP configuration object
     * @returns {Promise<Object>} { success, message, details, responseTime }
     */
    async testConnection(config) {
        return LdapConfig.testConnection(config);
    }

    /**
     * Test user authentication (without creating user)
     * @param {String} firmId - Firm ID
     * @param {String} username - Username to test
     * @param {String} password - Password to test
     * @returns {Promise<Object>} { success, message, user }
     */
    async testUserAuth(firmId, username, password) {
        let client = null;

        try {
            // Get LDAP config
            const config = await LdapConfig.getActiveConfig(firmId);

            if (!config) {
                return {
                    success: false,
                    message: 'LDAP is not configured or enabled'
                };
            }

            // Create client
            client = this.createClient(config);

            // STARTTLS
            if (config.useStarttls && !config.useSsl) {
                await new Promise((resolve, reject) => {
                    client.starttls({
                        rejectUnauthorized: config.verifyCertificate !== false
                    }, null, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }

            // Bind with admin credentials
            if (config.bindDn && config.bindPassword_encrypted) {
                const decryptedPassword = decrypt(
                    `${config.bindPassword_encrypted.iv}:${config.bindPassword_encrypted.authTag}:${config.bindPassword_encrypted.encrypted}`
                );
                await this.bind(client, config.bindDn, decryptedPassword);
            }

            // Search for user
            const userFilter = config.userFilter.replace('{username}', username);
            const users = await this.searchUser(client, config.baseDn, userFilter, config);

            if (users.length === 0) {
                return {
                    success: false,
                    message: 'User not found in LDAP directory'
                };
            }

            if (users.length > 1) {
                return {
                    success: false,
                    message: 'Multiple users found. Filter must return unique result.'
                };
            }

            const ldapUser = users[0];
            const userDn = ldapUser.dn;

            // Test user authentication
            try {
                await this.bind(client, userDn, password);
            } catch (authError) {
                return {
                    success: false,
                    message: 'Invalid username or password'
                };
            }

            // Get user attributes
            const attrs = config.attributeMapping || {};
            const userData = {
                username: ldapUser.attributes[attrs.username] || username,
                email: ldapUser.attributes[attrs.email],
                firstName: ldapUser.attributes[attrs.firstName],
                lastName: ldapUser.attributes[attrs.lastName],
                displayName: ldapUser.attributes[attrs.displayName],
                phone: ldapUser.attributes[attrs.phone],
                dn: userDn
            };

            return {
                success: true,
                message: 'User authentication successful',
                user: userData
            };

        } catch (error) {
            return {
                success: false,
                message: 'Authentication test failed',
                error: error.message
            };
        } finally {
            if (client) {
                try {
                    client.unbind();
                } catch (error) {
                    // Ignore
                }
            }
        }
    }

    /**
     * Sync users from LDAP to local database
     * @param {String} firmId - Firm ID
     * @param {Object} options - Sync options
     * @returns {Promise<Object>} { success, stats, message }
     */
    async syncUsers(firmId, options = {}) {
        const startTime = Date.now();
        let client = null;
        const stats = {
            usersCreated: 0,
            usersUpdated: 0,
            usersFailed: 0,
            errors: []
        };

        try {
            // Get LDAP config
            const config = await LdapConfig.getConfig(firmId);

            if (!config) {
                return {
                    success: false,
                    message: 'LDAP configuration not found',
                    stats
                };
            }

            if (!config.isEnabled) {
                return {
                    success: false,
                    message: 'LDAP is disabled',
                    stats
                };
            }

            // Create client
            client = this.createClient(config);

            // STARTTLS
            if (config.useStarttls && !config.useSsl) {
                await new Promise((resolve, reject) => {
                    client.starttls({
                        rejectUnauthorized: config.verifyCertificate !== false
                    }, null, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }

            // Bind with admin credentials
            if (config.bindDn && config.bindPassword_encrypted) {
                const decryptedPassword = decrypt(
                    `${config.bindPassword_encrypted.iv}:${config.bindPassword_encrypted.authTag}:${config.bindPassword_encrypted.encrypted}`
                );
                await this.bind(client, config.bindDn, decryptedPassword);
            }

            // Search for all users
            const allUsersFilter = options.filter || '(objectClass=person)';
            const users = await this.searchUser(client, config.baseDn, allUsersFilter, config);

            const firm = await Firm.findById(firmId);
            if (!firm) {
                return {
                    success: false,
                    message: 'Firm not found',
                    stats
                };
            }

            // Process each user
            for (const ldapUser of users) {
                try {
                    const attrs = config.attributeMapping || {};
                    const attributes = ldapUser.attributes;

                    // Skip users without email
                    const email = attributes[attrs.email];
                    if (!email) {
                        stats.usersFailed++;
                        stats.errors.push(`Skipped user ${ldapUser.dn}: No email address`);
                        continue;
                    }

                    const userData = {
                        username: attributes[attrs.username] || email.split('@')[0],
                        email: email.toLowerCase(),
                        firstName: attributes[attrs.firstName] || 'User',
                        lastName: attributes[attrs.lastName] || 'User',
                        phone: attributes[attrs.phone] || '',
                        memberOf: attributes[attrs.memberOf] || [],
                        ldapDn: ldapUser.dn
                    };

                    // Determine role from group mapping
                    let firmRole = config.defaultFirmRole || 'lawyer';
                    if (config.groupMapping && config.groupMapping.size > 0) {
                        for (const [groupDn, mappedRole] of config.groupMapping) {
                            if (Array.isArray(userData.memberOf) && userData.memberOf.includes(groupDn)) {
                                firmRole = mappedRole;
                                break;
                            }
                        }
                    }

                    // Find or create user
                    let user = await User.findOne({
                        email: userData.email,
                        firmId: firmId
                    });

                    if (!user) {
                        // Create new user
                        const randomPassword = crypto.randomBytes(32).toString('hex');
                        const hashedPassword = await bcrypt.hash(randomPassword, 12);

                        user = new User({
                            username: userData.username,
                            email: userData.email,
                            password: hashedPassword,
                            firstName: userData.firstName,
                            lastName: userData.lastName,
                            phone: userData.phone,
                            role: config.defaultRole || 'lawyer',
                            firmId: firmId,
                            firmRole: firmRole,
                            firmStatus: 'active',
                            country: 'Saudi Arabia',
                            isSSOUser: true,
                            ssoProvider: 'ldap',
                            ssoExternalId: userData.ldapDn,
                            createdViaSSO: true
                        });

                        await user.save();

                        // Add to firm
                        firm.members.push({
                            userId: user._id,
                            role: firmRole,
                            permissions: getDefaultPermissions(firmRole),
                            joinedAt: new Date(),
                            status: 'active'
                        });

                        stats.usersCreated++;
                    } else {
                        // Update existing user
                        user.firstName = userData.firstName;
                        user.lastName = userData.lastName;
                        user.phone = userData.phone || user.phone;
                        user.firmRole = firmRole;
                        await user.save();

                        // Update firm member role
                        const memberIndex = firm.members.findIndex(m =>
                            m.userId.toString() === user._id.toString()
                        );
                        if (memberIndex >= 0) {
                            firm.members[memberIndex].role = firmRole;
                            firm.members[memberIndex].permissions = getDefaultPermissions(firmRole);
                        }

                        stats.usersUpdated++;
                    }
                } catch (userError) {
                    stats.usersFailed++;
                    stats.errors.push(`Failed to sync user ${ldapUser.dn}: ${userError.message}`);
                }
            }

            await firm.save();

            // Update sync status
            config.lastSyncAt = new Date();
            config.lastSyncStatus = stats.usersFailed === 0 ? 'success' : 'partial';
            config.lastSyncError = stats.usersFailed > 0 ? stats.errors.join('; ') : null;
            config.lastSyncStats = {
                usersCreated: stats.usersCreated,
                usersUpdated: stats.usersUpdated,
                usersFailed: stats.usersFailed,
                duration: Date.now() - startTime
            };
            await config.save();

            return {
                success: true,
                message: `Synced ${users.length} users (${stats.usersCreated} created, ${stats.usersUpdated} updated, ${stats.usersFailed} failed)`,
                stats: {
                    total: users.length,
                    ...stats,
                    duration: Date.now() - startTime
                }
            };

        } catch (error) {
            // Update sync status with error
            try {
                const config = await LdapConfig.getConfig(firmId);
                if (config) {
                    config.lastSyncAt = new Date();
                    config.lastSyncStatus = 'failed';
                    config.lastSyncError = error.message;
                    config.lastSyncStats = {
                        ...stats,
                        duration: Date.now() - startTime
                    };
                    await config.save();
                }
            } catch (updateError) {
                console.error('Failed to update sync status:', updateError);
            }

            return {
                success: false,
                message: 'User synchronization failed',
                error: error.message,
                stats
            };
        } finally {
            if (client) {
                try {
                    client.unbind();
                } catch (error) {
                    // Ignore
                }
            }
        }
    }
}

module.exports = new LdapService();
