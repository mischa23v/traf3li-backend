const mongoose = require('mongoose');
const encryptionPlugin = require('./plugins/encryption.plugin');
const logger = require('../utils/logger');

/**
 * LDAP Configuration Model
 *
 * Manages LDAP/Active Directory integration settings for enterprise firms.
 * Enables user authentication and synchronization with corporate directory services.
 *
 * Security Features:
 * - Encrypted bind password storage (AES-256-GCM)
 * - Connection validation before enabling
 * - Audit trail for configuration changes
 */

const ldapConfigSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM ASSOCIATION
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        unique: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // BASIC CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    name: {
        type: String,
        default: 'LDAP',
        trim: true,
        maxlength: 100
    },

    // ═══════════════════════════════════════════════════════════════
    // CONNECTION SETTINGS
    // ═══════════════════════════════════════════════════════════════
    serverUrl: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: function(v) {
                // Validate LDAP URL format (ldap:// or ldaps://)
                return /^ldaps?:\/\/[a-zA-Z0-9.-]+(:[0-9]{1,5})?$/.test(v);
            },
            message: props => `${props.value} is not a valid LDAP URL. Use format: ldap://server:port or ldaps://server:port`
        }
        // e.g., ldap://ldap.example.com:389 or ldaps://ldap.example.com:636
    },

    // ═══════════════════════════════════════════════════════════════
    // BIND CREDENTIALS (Admin account for LDAP queries)
    // ═══════════════════════════════════════════════════════════════
    bindDn: {
        type: String,
        trim: true,
        maxlength: 500
        // e.g., cn=admin,dc=example,dc=com
        // Optional: Anonymous bind if not provided
    },
    bindPassword: {
        type: String,
        select: false  // Never return in queries by default
        // Plain password - will be encrypted by plugin
    },
    // Encrypted version stored separately by encryption plugin
    // bindPassword_encrypted: { encrypted, iv, authTag }

    // ═══════════════════════════════════════════════════════════════
    // SEARCH CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    baseDn: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
        // e.g., dc=example,dc=com
        // Base DN where user searches begin
    },
    userFilter: {
        type: String,
        default: '(uid={username})',
        trim: true,
        maxlength: 500
        // LDAP filter for user authentication
        // {username} is replaced with login username
        // Common filters:
        // - (uid={username})           - OpenLDAP
        // - (sAMAccountName={username}) - Active Directory
        // - (mail={username})          - Email-based
    },
    groupFilter: {
        type: String,
        trim: true,
        maxlength: 500,
        default: '(member={userDn})'
        // LDAP filter for group membership
        // {userDn} is replaced with user's DN
        // e.g., (member={userDn}) or (memberOf={userDn})
    },

    // ═══════════════════════════════════════════════════════════════
    // ATTRIBUTE MAPPING (LDAP -> Application)
    // ═══════════════════════════════════════════════════════════════
    attributeMapping: {
        username: {
            type: String,
            default: 'uid',
            trim: true
            // Common: uid (OpenLDAP), sAMAccountName (AD)
        },
        email: {
            type: String,
            default: 'mail',
            trim: true
            // Usually: mail
        },
        firstName: {
            type: String,
            default: 'givenName',
            trim: true
            // Usually: givenName
        },
        lastName: {
            type: String,
            default: 'sn',
            trim: true
            // Usually: sn (surname)
        },
        displayName: {
            type: String,
            default: 'cn',
            trim: true
            // Usually: cn (common name) or displayName
        },
        phone: {
            type: String,
            default: 'telephoneNumber',
            trim: true
            // Usually: telephoneNumber or mobile
        },
        memberOf: {
            type: String,
            default: 'memberOf',
            trim: true
            // Group membership attribute
            // AD: memberOf, OpenLDAP: memberOf (with overlay)
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // GROUP TO ROLE MAPPING
    // ═══════════════════════════════════════════════════════════════
    groupMapping: {
        type: Map,
        of: String,
        default: {}
        // Maps LDAP group DN to application role
        // Example:
        // {
        //   "cn=lawyers,ou=groups,dc=example,dc=com": "lawyer",
        //   "cn=partners,ou=groups,dc=example,dc=com": "partner",
        //   "cn=admins,ou=groups,dc=example,dc=com": "admin"
        // }
    },
    defaultRole: {
        type: String,
        enum: ['lawyer', 'paralegal', 'secretary', 'accountant', 'partner'],
        default: 'lawyer'
        // Default role for users without group mapping
    },

    // ═══════════════════════════════════════════════════════════════
    // SECURITY & TLS SETTINGS
    // ═══════════════════════════════════════════════════════════════
    useSsl: {
        type: Boolean,
        default: false
        // Use LDAPS (LDAP over SSL/TLS) - port 636
        // Recommended for production
    },
    useStarttls: {
        type: Boolean,
        default: true
        // Use STARTTLS to upgrade connection to TLS
        // Alternative to LDAPS - port 389 with TLS upgrade
    },
    verifyCertificate: {
        type: Boolean,
        default: true
        // Verify LDAP server's TLS certificate
        // Set to false only for self-signed certs in dev
    },
    tlsCaCert: {
        type: String,
        select: false
        // Custom CA certificate (PEM format)
        // For self-signed or internal CA certificates
    },

    // ═══════════════════════════════════════════════════════════════
    // BEHAVIOR & FEATURES
    // ═══════════════════════════════════════════════════════════════
    isEnabled: {
        type: Boolean,
        default: false,
        index: true
        // Master switch for LDAP authentication
        // Users can only use LDAP login when enabled
    },
    autoProvisionUsers: {
        type: Boolean,
        default: true
        // Just-In-Time (JIT) provisioning
        // Create user account on first successful LDAP login
    },
    updateUserAttributes: {
        type: Boolean,
        default: true
        // Update user profile from LDAP on each login
        // Keeps email, name, phone in sync with directory
    },
    allowLocalFallback: {
        type: Boolean,
        default: true
        // Allow password login if LDAP auth fails
        // Useful during LDAP server outages
    },

    // ═══════════════════════════════════════════════════════════════
    // SYNC CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    syncIntervalHours: {
        type: Number,
        default: 24,
        min: 1,
        max: 168  // Max 1 week
        // How often to run automatic user sync
    },
    lastSyncAt: {
        type: Date,
        default: null
    },
    lastSyncStatus: {
        type: String,
        enum: ['success', 'failed', 'partial', null],
        default: null
    },
    lastSyncError: {
        type: String,
        default: null,
        maxlength: 1000
    },
    lastSyncStats: {
        usersCreated: { type: Number, default: 0 },
        usersUpdated: { type: Number, default: 0 },
        usersFailed: { type: Number, default: 0 },
        duration: { type: Number, default: 0 }  // milliseconds
    },

    // ═══════════════════════════════════════════════════════════════
    // CONNECTION TESTING
    // ═══════════════════════════════════════════════════════════════
    lastConnectionTest: {
        testedAt: Date,
        testedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        success: Boolean,
        message: String,
        responseTime: Number  // milliseconds
    },

    // ═══════════════════════════════════════════════════════════════
    // ADVANCED OPTIONS
    // ═══════════════════════════════════════════════════════════════
    timeout: {
        type: Number,
        default: 5000,
        min: 1000,
        max: 30000
        // Connection timeout in milliseconds
    },
    searchScope: {
        type: String,
        enum: ['base', 'one', 'sub'],
        default: 'sub'
        // LDAP search scope
        // - base: search only base DN
        // - one: search one level below base DN
        // - sub: search entire subtree (most common)
    },
    pageSize: {
        type: Number,
        default: 100,
        min: 10,
        max: 1000
        // Number of results per page for large directories
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT TRAIL
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    configHistory: [{
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        action: {
            type: String,
            enum: ['created', 'updated', 'enabled', 'disabled', 'tested']
        },
        changes: { type: Map, of: mongoose.Schema.Types.Mixed },
        notes: String
    }]
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
ldapConfigSchema.index({ firmId: 1, isEnabled: 1 });
ldapConfigSchema.index({ lastSyncAt: 1 });

// ═══════════════════════════════════════════════════════════════
// ENCRYPTION PLUGIN
// ═══════════════════════════════════════════════════════════════
// Encrypt bind password using AES-256-GCM
ldapConfigSchema.plugin(encryptionPlugin, {
    fields: ['bindPassword', 'tlsCaCert'],
    searchableFields: []  // Passwords should never be searchable
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Record configuration change in audit history
 */
ldapConfigSchema.methods.recordChange = function(action, changedBy, changes = {}, notes = '') {
    if (!this.configHistory) {
        this.configHistory = [];
    }

    this.configHistory.push({
        changedAt: new Date(),
        changedBy,
        action,
        changes: new Map(Object.entries(changes)),
        notes
    });

    // Keep only last 50 history entries
    if (this.configHistory.length > 50) {
        this.configHistory = this.configHistory.slice(-50);
    }

    return this;
};

/**
 * Sanitize config for logging (remove sensitive data)
 */
ldapConfigSchema.methods.toSafeObject = function() {
    const obj = this.toObject();

    // Remove sensitive fields
    delete obj.bindPassword;
    delete obj.bindPassword_encrypted;
    delete obj.tlsCaCert;
    delete obj.tlsCaCert_encrypted;

    return obj;
};

/**
 * Check if configuration is complete and valid
 */
ldapConfigSchema.methods.isConfigurationComplete = function() {
    return !!(
        this.serverUrl &&
        this.baseDn &&
        this.userFilter &&
        this.attributeMapping?.username &&
        this.attributeMapping?.email
    );
};

/**
 * Get user-friendly status
 */
ldapConfigSchema.methods.getStatus = function() {
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
            message: 'LDAP authentication is disabled',
            canEnable: true
        };
    }

    if (this.lastConnectionTest?.success === false) {
        return {
            status: 'error',
            message: 'Last connection test failed',
            canEnable: false,
            error: this.lastConnectionTest.message
        };
    }

    return {
        status: 'active',
        message: 'LDAP authentication is active',
        canEnable: true,
        lastSync: this.lastSyncAt,
        lastTest: this.lastConnectionTest?.testedAt
    };
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get LDAP configuration for a firm
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<LdapConfig|null>} LDAP configuration or null
 */
ldapConfigSchema.statics.getConfig = async function(firmId) {
    if (!firmId) {
        throw new Error('Firm ID is required');
    }

    try {
        const config = await this.findOne({ firmId })
            .select('+bindPassword +tlsCaCert')  // Include encrypted fields
            .populate('createdBy', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email');

        return config;
    } catch (error) {
        logger.error('Error fetching LDAP config:', error);
        throw new Error('Failed to fetch LDAP configuration');
    }
};

/**
 * Get active LDAP configuration for a firm
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<LdapConfig|null>} Active LDAP configuration or null
 */
ldapConfigSchema.statics.getActiveConfig = async function(firmId) {
    if (!firmId) {
        throw new Error('Firm ID is required');
    }

    return this.findOne({
        firmId,
        isEnabled: true
    }).select('+bindPassword +tlsCaCert');
};

/**
 * Test LDAP connection and authentication
 * @param {Object} config - LDAP configuration object
 * @param {Object} options - Test options
 * @param {String} options.testUser - Optional username to test authentication
 * @param {String} options.testPassword - Password for test user
 * @returns {Promise<Object>} Test result { success, message, details }
 */
ldapConfigSchema.statics.testConnection = async function(config, options = {}) {
    const { testUser, testPassword } = options;

    // Validation
    if (!config) {
        return {
            success: false,
            message: 'Configuration is required',
            details: null
        };
    }

    if (!config.serverUrl || !config.baseDn) {
        return {
            success: false,
            message: 'Server URL and Base DN are required',
            details: null
        };
    }

    // Check if ldapjs is available
    let ldap;
    try {
        ldap = require('ldapjs');
    } catch (error) {
        return {
            success: false,
            message: 'LDAP library not installed. Run: npm install ldapjs',
            details: { error: error.message }
        };
    }

    const startTime = Date.now();
    let client = null;

    try {
        // Create LDAP client
        const clientOptions = {
            url: config.serverUrl,
            timeout: config.timeout || 5000,
            connectTimeout: config.timeout || 5000,
            tlsOptions: {
                rejectUnauthorized: config.verifyCertificate !== false
            }
        };

        // Add custom CA cert if provided
        if (config.tlsCaCert) {
            clientOptions.tlsOptions.ca = [config.tlsCaCert];
        }

        client = ldap.createClient(clientOptions);

        // Promise wrapper for LDAP operations
        const ldapBind = (dn, password) => {
            return new Promise((resolve, reject) => {
                client.bind(dn, password, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        };

        const ldapSearch = (base, options) => {
            return new Promise((resolve, reject) => {
                client.search(base, options, (err, res) => {
                    if (err) return reject(err);

                    const entries = [];
                    res.on('searchEntry', (entry) => entries.push(entry));
                    res.on('error', reject);
                    res.on('end', () => resolve(entries));
                });
            });
        };

        // Handle STARTTLS
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

        // Test 1: Bind with admin credentials (if provided)
        if (config.bindDn && config.bindPassword) {
            try {
                await ldapBind(config.bindDn, config.bindPassword);
            } catch (bindError) {
                return {
                    success: false,
                    message: 'Admin bind failed',
                    details: {
                        error: bindError.message,
                        bindDn: config.bindDn
                    },
                    responseTime: Date.now() - startTime
                };
            }
        }

        // Test 2: Search base DN
        try {
            await ldapSearch(config.baseDn, {
                scope: 'base',
                filter: '(objectClass=*)',
                attributes: ['dn']
            });
        } catch (searchError) {
            return {
                success: false,
                message: 'Base DN search failed',
                details: {
                    error: searchError.message,
                    baseDn: config.baseDn
                },
                responseTime: Date.now() - startTime
            };
        }

        // Test 3: User authentication (if credentials provided)
        if (testUser && testPassword) {
            try {
                // Search for user
                const userFilter = config.userFilter.replace('{username}', testUser);
                const searchOptions = {
                    scope: config.searchScope || 'sub',
                    filter: userFilter,
                    attributes: Object.values(config.attributeMapping || {})
                };

                const users = await ldapSearch(config.baseDn, searchOptions);

                if (users.length === 0) {
                    return {
                        success: false,
                        message: `User '${testUser}' not found in directory`,
                        details: {
                            filter: userFilter,
                            baseDn: config.baseDn
                        },
                        responseTime: Date.now() - startTime
                    };
                }

                if (users.length > 1) {
                    return {
                        success: false,
                        message: `Multiple users found for '${testUser}'. Filter must return unique result.`,
                        details: {
                            count: users.length,
                            filter: userFilter
                        },
                        responseTime: Date.now() - startTime
                    };
                }

                // Get user DN
                const userDn = users[0].objectName;

                // Test user authentication
                try {
                    await ldapBind(userDn, testPassword);
                } catch (authError) {
                    return {
                        success: false,
                        message: 'User authentication failed',
                        details: {
                            error: authError.message,
                            userDn
                        },
                        responseTime: Date.now() - startTime
                    };
                }

                return {
                    success: true,
                    message: 'Connection successful. User authentication verified.',
                    details: {
                        serverUrl: config.serverUrl,
                        baseDn: config.baseDn,
                        userDn,
                        usedStarttls: config.useStarttls,
                        usedSsl: config.useSsl
                    },
                    responseTime: Date.now() - startTime
                };
            } catch (error) {
                return {
                    success: false,
                    message: 'User authentication test failed',
                    details: { error: error.message },
                    responseTime: Date.now() - startTime
                };
            }
        }

        // Basic connection test passed
        return {
            success: true,
            message: 'Connection successful. Server is reachable and base DN is valid.',
            details: {
                serverUrl: config.serverUrl,
                baseDn: config.baseDn,
                usedStarttls: config.useStarttls,
                usedSsl: config.useSsl,
                adminBindUsed: !!(config.bindDn && config.bindPassword)
            },
            responseTime: Date.now() - startTime
        };

    } catch (error) {
        return {
            success: false,
            message: 'Connection failed',
            details: {
                error: error.message,
                serverUrl: config.serverUrl
            },
            responseTime: Date.now() - startTime
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
};

/**
 * Authenticate user against LDAP
 * @param {ObjectId} firmId - Firm ID
 * @param {String} username - Username to authenticate
 * @param {String} password - Password to authenticate
 * @returns {Promise<Object>} Authentication result { success, user, message }
 */
ldapConfigSchema.statics.authenticateUser = async function(firmId, username, password) {
    if (!firmId || !username || !password) {
        return {
            success: false,
            message: 'Firm ID, username, and password are required'
        };
    }

    // Get active LDAP config
    const config = await this.getActiveConfig(firmId);
    if (!config) {
        return {
            success: false,
            message: 'LDAP is not configured or not enabled for this firm'
        };
    }

    // Check if ldapjs is available
    let ldap;
    try {
        ldap = require('ldapjs');
    } catch (error) {
        return {
            success: false,
            message: 'LDAP library not available'
        };
    }

    let client = null;

    try {
        // Create LDAP client
        const clientOptions = {
            url: config.serverUrl,
            timeout: config.timeout || 5000,
            connectTimeout: config.timeout || 5000,
            tlsOptions: {
                rejectUnauthorized: config.verifyCertificate !== false
            }
        };

        if (config.tlsCaCert) {
            clientOptions.tlsOptions.ca = [config.tlsCaCert];
        }

        client = ldap.createClient(clientOptions);

        // Promise wrappers
        const ldapBind = (dn, pwd) => {
            return new Promise((resolve, reject) => {
                client.bind(dn, pwd, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        };

        const ldapSearch = (base, options) => {
            return new Promise((resolve, reject) => {
                client.search(base, options, (err, res) => {
                    if (err) return reject(err);

                    const entries = [];
                    res.on('searchEntry', (entry) => entries.push(entry));
                    res.on('error', reject);
                    res.on('end', () => resolve(entries));
                });
            });
        };

        // STARTTLS if configured
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

        // Bind with admin credentials if provided
        if (config.bindDn && config.bindPassword) {
            await ldapBind(config.bindDn, config.bindPassword);
        }

        // Search for user
        const userFilter = config.userFilter.replace('{username}', username);
        const searchOptions = {
            scope: config.searchScope || 'sub',
            filter: userFilter,
            attributes: Object.values(config.attributeMapping || {})
        };

        const users = await ldapSearch(config.baseDn, searchOptions);

        if (users.length === 0) {
            return {
                success: false,
                message: 'User not found in directory'
            };
        }

        if (users.length > 1) {
            return {
                success: false,
                message: 'Multiple users found. Contact administrator.'
            };
        }

        const userEntry = users[0];
        const userDn = userEntry.objectName;

        // Authenticate user
        try {
            await ldapBind(userDn, password);
        } catch (authError) {
            return {
                success: false,
                message: 'Invalid username or password'
            };
        }

        // Extract user attributes
        const attrs = config.attributeMapping || {};
        const userData = {
            username: userEntry.object[attrs.username] || username,
            email: userEntry.object[attrs.email],
            firstName: userEntry.object[attrs.firstName],
            lastName: userEntry.object[attrs.lastName],
            displayName: userEntry.object[attrs.displayName],
            phone: userEntry.object[attrs.phone],
            memberOf: userEntry.object[attrs.memberOf] || [],
            dn: userDn
        };

        // Determine role from group mapping
        let role = config.defaultRole || 'lawyer';
        if (config.groupMapping && config.groupMapping.size > 0) {
            for (const [groupDn, mappedRole] of config.groupMapping) {
                if (Array.isArray(userData.memberOf)) {
                    if (userData.memberOf.includes(groupDn)) {
                        role = mappedRole;
                        break;
                    }
                } else if (userData.memberOf === groupDn) {
                    role = mappedRole;
                    break;
                }
            }
        }

        userData.role = role;

        return {
            success: true,
            message: 'Authentication successful',
            user: userData
        };

    } catch (error) {
        return {
            success: false,
            message: 'LDAP authentication failed',
            error: error.message
        };
    } finally {
        if (client) {
            try {
                client.unbind();
            } catch (error) {
                // Ignore unbind errors
            }
        }
    }
};

/**
 * Find configurations that need sync
 * @returns {Promise<Array>} Configurations due for sync
 */
ldapConfigSchema.statics.findDueForSync = async function() {
    const now = new Date();

    return this.find({
        isEnabled: true,
        $or: [
            { lastSyncAt: null },
            {
                lastSyncAt: {
                    $lt: new Date(now - (this.syncIntervalHours || 24) * 60 * 60 * 1000)
                }
            }
        ]
    });
};

module.exports = mongoose.model('LdapConfig', ldapConfigSchema);
