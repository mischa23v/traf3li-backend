/**
 * QuickBooks Online Integration Service
 *
 * Provides comprehensive QuickBooks Online API integration for the TRAF3LI platform:
 * - OAuth 2.0 authentication and token management
 * - Bidirectional sync for accounts, customers, vendors, invoices, payments, bills, and items
 * - Data mapping between TRAF3LI and QuickBooks formats
 * - Conflict detection and resolution
 * - Comprehensive error handling and retry logic
 *
 * Required packages:
 * - intuit-oauth: For OAuth 2.0 authentication with Intuit
 * - node-quickbooks: For QuickBooks Online API operations
 *
 * Environment variables:
 * - QUICKBOOKS_CLIENT_ID: QuickBooks OAuth client ID
 * - QUICKBOOKS_CLIENT_SECRET: QuickBooks OAuth client secret
 * - QUICKBOOKS_REDIRECT_URI: OAuth callback URL
 * - QUICKBOOKS_ENVIRONMENT: 'sandbox' or 'production'
 */

const OAuthClient = require('intuit-oauth');
const QuickBooks = require('node-quickbooks');
const { CustomException } = require('../utils');
const { encrypt, decrypt } = require('../utils/encryption');
const logger = require('../utils/logger');
const cacheService = require('./cache.service');

// Models
const Firm = require('../models/firm.model');
const Account = require('../models/account.model');
const Client = require('../models/client.model');
const Vendor = require('../models/vendor.model');
const Invoice = require('../models/invoice.model');
const Payment = require('../models/payment.model');
const Bill = require('../models/bill.model');

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const QB_CONFIG = {
    clientId: process.env.QUICKBOOKS_CLIENT_ID,
    clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET,
    redirectUri: process.env.QUICKBOOKS_REDIRECT_URI || 'http://localhost:5000/api/integrations/quickbooks/callback',
    environment: process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox', // 'sandbox' or 'production'
    scopes: [
        'com.intuit.quickbooks.accounting',
        'com.intuit.quickbooks.payment'
    ]
};

// QuickBooks API endpoints
const QB_BASE_URL = {
    sandbox: 'https://sandbox-quickbooks.api.intuit.com',
    production: 'https://quickbooks.api.intuit.com'
};

// Sync directions
const SYNC_DIRECTIONS = {
    TO_QB: 'to_qb',
    FROM_QB: 'from_qb',
    BOTH: 'both'
};

// Conflict resolution strategies
const CONFLICT_RESOLUTION = {
    QB_WINS: 'qb_wins',
    TRAF3LI_WINS: 'traf3li_wins',
    MANUAL: 'manual',
    NEWEST_WINS: 'newest_wins'
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if QuickBooks is configured
 */
function isConfigured() {
    return !!(QB_CONFIG.clientId && QB_CONFIG.clientSecret);
}

/**
 * Get OAuth client instance
 */
function getOAuthClient() {
    if (!isConfigured()) {
        throw CustomException('QuickBooks not configured. Please set QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET.', 500);
    }

    return new OAuthClient({
        clientId: QB_CONFIG.clientId,
        clientSecret: QB_CONFIG.clientSecret,
        environment: QB_CONFIG.environment,
        redirectUri: QB_CONFIG.redirectUri
    });
}

/**
 * Get QuickBooks API client instance
 */
function getQBClient(accessToken, realmId, refreshToken = null) {
    const useSandbox = QB_CONFIG.environment === 'sandbox';
    const minorversion = 65; // QuickBooks API minor version

    return new QuickBooks(
        QB_CONFIG.clientId,
        QB_CONFIG.clientSecret,
        accessToken,
        false, // no token secret needed for OAuth 2.0
        realmId,
        useSandbox,
        true, // debug mode
        minorversion,
        '2.0', // OAuth version
        refreshToken
    );
}

/**
 * Store QuickBooks connection data in firm model
 */
async function storeConnectionData(firmId, data) {
    const encryptedAccessToken = encrypt(data.accessToken);
    const encryptedRefreshToken = encrypt(data.refreshToken);

    await Firm.findByIdAndUpdate(firmId, {
        'integrations.quickbooks': {
            isConnected: true,
            realmId: data.realmId,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            expiresAt: new Date(Date.now() + data.expiresIn * 1000),
            refreshTokenExpiresAt: new Date(Date.now() + data.refreshExpiresIn * 1000),
            connectedAt: new Date(),
            lastSyncAt: null,
            companyName: data.companyName || null,
            settings: {
                autoSync: false,
                syncInterval: 'manual', // 'manual', 'hourly', 'daily'
                defaultConflictResolution: CONFLICT_RESOLUTION.MANUAL
            }
        }
    });

    logger.info('QuickBooks connection stored', { firmId, realmId: data.realmId });
}

/**
 * Get QuickBooks connection data from firm
 */
async function getConnectionData(firmId) {
    const firm = await Firm.findById(firmId).select('integrations.quickbooks');

    if (!firm || !firm.integrations?.quickbooks?.isConnected) {
        throw CustomException('QuickBooks not connected for this firm', 404);
    }

    const qbData = firm.integrations.quickbooks;

    return {
        realmId: qbData.realmId,
        accessToken: decrypt(qbData.accessToken),
        refreshToken: decrypt(qbData.refreshToken),
        expiresAt: qbData.expiresAt,
        refreshTokenExpiresAt: qbData.refreshTokenExpiresAt,
        settings: qbData.settings || {}
    };
}

/**
 * Store sync conflict
 */
async function storeSyncConflict(firmId, entityType, entityId, qbData, traf3liData, reason) {
    await Firm.findByIdAndUpdate(firmId, {
        $push: {
            'integrations.quickbooks.conflicts': {
                entityType,
                entityId,
                qbData,
                traf3liData,
                reason,
                status: 'pending',
                createdAt: new Date()
            }
        }
    });

    logger.warn('Sync conflict detected', {
        firmId,
        entityType,
        entityId,
        reason
    });
}

/**
 * Retry wrapper for QB API calls
 */
async function retryQBOperation(operation, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            // Don't retry on authentication errors
            if (error.fault?.error?.[0]?.code === '401' || error.statusCode === 401) {
                throw error;
            }

            // Don't retry on client errors (400 series except 429)
            if (error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
                throw error;
            }

            if (attempt < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
                logger.warn(`QB API call failed, retrying in ${delay}ms`, {
                    attempt,
                    maxRetries,
                    error: error.message
                });
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}

// ═══════════════════════════════════════════════════════════════
// QUICKBOOKS SERVICE CLASS
// ═══════════════════════════════════════════════════════════════

class QuickBooksService {
    constructor() {
        this.oauthClient = null;
    }

    /**
     * Check if QuickBooks is configured
     */
    isConfigured() {
        return isConfigured();
    }

    // ═══════════════════════════════════════════════════════════════
    // OAUTH FLOW
    // ═══════════════════════════════════════════════════════════════

    /**
     * Generate OAuth authorization URL
     * @param {string} firmId - Firm ID
     * @returns {string} - Authorization URL
     */
    async getAuthUrl(firmId) {
        if (!this.isConfigured()) {
            throw CustomException('QuickBooks integration not configured', 500);
        }

        const oauthClient = getOAuthClient();

        // Generate state token for CSRF protection
        const state = require('crypto').randomBytes(32).toString('hex');

        // Store state in cache with firmId
        await cacheService.set(`qb:oauth:state:${state}`, { firmId }, 900); // 15 minutes

        // Generate authorization URL
        const authUrl = oauthClient.authorizeUri({
            scope: QB_CONFIG.scopes,
            state
        });

        logger.info('QuickBooks auth URL generated', { firmId });

        return authUrl;
    }

    /**
     * Handle OAuth callback
     * @param {string} code - Authorization code
     * @param {string} realmId - QuickBooks company/realm ID
     * @param {string} state - State token
     * @returns {object} - Connection result
     */
    async handleCallback(code, realmId, state) {
        if (!this.isConfigured()) {
            throw CustomException('QuickBooks integration not configured', 500);
        }

        // Verify state token
        const stateData = await cacheService.get(`qb:oauth:state:${state}`);
        if (!stateData) {
            throw CustomException('Invalid or expired state token', 400);
        }

        const { firmId } = stateData;

        // Delete state token (one-time use)
        await cacheService.del(`qb:oauth:state:${state}`);

        const oauthClient = getOAuthClient();

        try {
            // Exchange authorization code for tokens
            const authResponse = await oauthClient.createToken(code);
            const token = authResponse.getJson();

            // Get company info
            const qb = getQBClient(token.access_token, realmId, token.refresh_token);

            let companyName = null;
            try {
                const companyInfo = await new Promise((resolve, reject) => {
                    qb.getCompanyInfo(realmId, (err, info) => {
                        if (err) reject(err);
                        else resolve(info);
                    });
                });
                companyName = companyInfo?.CompanyName;
            } catch (error) {
                logger.warn('Failed to fetch company info', { error: error.message });
            }

            // Store connection data
            await storeConnectionData(firmId, {
                accessToken: token.access_token,
                refreshToken: token.refresh_token,
                expiresIn: token.expires_in,
                refreshExpiresIn: token.x_refresh_token_expires_in,
                realmId,
                companyName
            });

            logger.info('QuickBooks connected successfully', {
                firmId,
                realmId,
                companyName
            });

            return {
                success: true,
                firmId,
                realmId,
                companyName,
                connectedAt: new Date()
            };
        } catch (error) {
            logger.error('QuickBooks OAuth callback failed', {
                error: error.message,
                firmId
            });
            throw CustomException('Failed to connect to QuickBooks: ' + error.message, 500);
        }
    }

    /**
     * Refresh expired access token
     * @param {string} firmId - Firm ID
     * @returns {object} - New token data
     */
    async refreshToken(firmId) {
        if (!this.isConfigured()) {
            throw CustomException('QuickBooks integration not configured', 500);
        }

        const connectionData = await getConnectionData(firmId);
        const oauthClient = getOAuthClient();

        // Set refresh token
        oauthClient.setToken({
            refresh_token: connectionData.refreshToken
        });

        try {
            // Refresh the token
            const authResponse = await oauthClient.refresh();
            const token = authResponse.getJson();

            // Update stored tokens
            await storeConnectionData(firmId, {
                accessToken: token.access_token,
                refreshToken: token.refresh_token,
                expiresIn: token.expires_in,
                refreshExpiresIn: token.x_refresh_token_expires_in,
                realmId: connectionData.realmId
            });

            logger.info('QuickBooks token refreshed', { firmId });

            return {
                success: true,
                expiresAt: new Date(Date.now() + token.expires_in * 1000)
            };
        } catch (error) {
            logger.error('QuickBooks token refresh failed', {
                error: error.message,
                firmId
            });
            throw CustomException('Failed to refresh QuickBooks token: ' + error.message, 500);
        }
    }

    /**
     * Disconnect QuickBooks integration
     * @param {string} firmId - Firm ID
     * @returns {object} - Disconnection result
     */
    async disconnect(firmId) {
        const connectionData = await getConnectionData(firmId);
        const oauthClient = getOAuthClient();

        try {
            // Revoke tokens
            oauthClient.setToken({
                access_token: connectionData.accessToken,
                refresh_token: connectionData.refreshToken
            });

            await oauthClient.revoke({
                access_token: connectionData.accessToken
            });
        } catch (error) {
            // Log but don't fail if revocation fails
            logger.warn('QuickBooks token revocation failed', {
                error: error.message,
                firmId
            });
        }

        // Remove connection data from firm
        await Firm.findByIdAndUpdate(firmId, {
            $unset: { 'integrations.quickbooks': '' }
        });

        logger.info('QuickBooks disconnected', { firmId });

        return {
            success: true,
            disconnectedAt: new Date()
        };
    }

    /**
     * Get active QuickBooks client (handles token refresh)
     */
    async getActiveClient(firmId) {
        const connectionData = await getConnectionData(firmId);

        // Check if token is expired or about to expire (within 5 minutes)
        const expiresAt = new Date(connectionData.expiresAt);
        const now = new Date();
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

        if (expiresAt < fiveMinutesFromNow) {
            logger.info('QuickBooks token expired or expiring soon, refreshing', { firmId });
            await this.refreshToken(firmId);
            // Get updated connection data
            const updatedData = await getConnectionData(firmId);
            return getQBClient(updatedData.accessToken, updatedData.realmId, updatedData.refreshToken);
        }

        return getQBClient(connectionData.accessToken, connectionData.realmId, connectionData.refreshToken);
    }

    // ═══════════════════════════════════════════════════════════════
    // SYNC OPERATIONS - CHART OF ACCOUNTS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Sync chart of accounts
     * @param {string} firmId - Firm ID
     * @param {string} direction - Sync direction ('to_qb', 'from_qb', 'both')
     * @returns {object} - Sync result
     */
    async syncChartOfAccounts(firmId, direction = SYNC_DIRECTIONS.BOTH) {
        const qb = await this.getActiveClient(firmId);
        const connectionData = await getConnectionData(firmId);
        const results = {
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [],
            conflicts: []
        };

        try {
            if (direction === SYNC_DIRECTIONS.FROM_QB || direction === SYNC_DIRECTIONS.BOTH) {
                // Sync from QuickBooks to TRAF3LI
                const qbAccounts = await retryQBOperation(() => {
                    return new Promise((resolve, reject) => {
                        qb.findAccounts({
                            fetchAll: true
                        }, (err, accounts) => {
                            if (err) reject(err);
                            else resolve(accounts.QueryResponse?.Account || []);
                        });
                    });
                });

                for (const qbAccount of qbAccounts) {
                    try {
                        const mappedAccount = this.mapQBToAccount(qbAccount, firmId);

                        // Check if account already exists
                        const existingAccount = await Account.findOne({
                            firmId,
                            'integrations.quickbooks.id': qbAccount.Id
                        });

                        if (existingAccount) {
                            // Check for conflicts
                            if (existingAccount.updatedAt > new Date(qbAccount.MetaData.LastUpdatedTime)) {
                                await storeSyncConflict(
                                    firmId,
                                    'account',
                                    existingAccount._id,
                                    qbAccount,
                                    existingAccount.toObject(),
                                    'Local changes newer than QuickBooks'
                                );
                                results.conflicts.push({
                                    type: 'account',
                                    id: existingAccount._id,
                                    name: existingAccount.name
                                });
                                results.skipped++;
                                continue;
                            }

                            // Update existing account
                            await Account.findByIdAndUpdate(existingAccount._id, {
                                ...mappedAccount,
                                'integrations.quickbooks': {
                                    id: qbAccount.Id,
                                    syncToken: qbAccount.SyncToken,
                                    lastSyncedAt: new Date()
                                }
                            });
                            results.updated++;
                        } else {
                            // Create new account
                            await Account.create({
                                ...mappedAccount,
                                'integrations.quickbooks': {
                                    id: qbAccount.Id,
                                    syncToken: qbAccount.SyncToken,
                                    lastSyncedAt: new Date()
                                }
                            });
                            results.created++;
                        }
                    } catch (error) {
                        logger.error('Failed to sync account from QB', {
                            accountId: qbAccount.Id,
                            error: error.message
                        });
                        results.errors.push({
                            type: 'account',
                            id: qbAccount.Id,
                            error: error.message
                        });
                    }
                }
            }

            if (direction === SYNC_DIRECTIONS.TO_QB || direction === SYNC_DIRECTIONS.BOTH) {
                // Sync from TRAF3LI to QuickBooks
                const localAccounts = await Account.find({
                    firmId,
                    $or: [
                        { 'integrations.quickbooks.id': { $exists: false } },
                        { 'integrations.quickbooks.id': null }
                    ]
                });

                for (const account of localAccounts) {
                    try {
                        const qbAccountData = this.mapAccountToQB(account);

                        const createdAccount = await retryQBOperation(() => {
                            return new Promise((resolve, reject) => {
                                qb.createAccount(qbAccountData, (err, qbAccount) => {
                                    if (err) reject(err);
                                    else resolve(qbAccount);
                                });
                            });
                        });

                        // Update local account with QB ID
                        await Account.findByIdAndUpdate(account._id, {
                            'integrations.quickbooks': {
                                id: createdAccount.Id,
                                syncToken: createdAccount.SyncToken,
                                lastSyncedAt: new Date()
                            }
                        });

                        results.created++;
                    } catch (error) {
                        logger.error('Failed to create account in QB', {
                            accountId: account._id,
                            error: error.message
                        });
                        results.errors.push({
                            type: 'account',
                            id: account._id.toString(),
                            error: error.message
                        });
                    }
                }
            }

            // Update last sync time
            await Firm.findByIdAndUpdate(firmId, {
                'integrations.quickbooks.lastSyncAt': new Date(),
                'integrations.quickbooks.lastSyncResults.accounts': results
            });

            logger.info('Chart of accounts sync completed', { firmId, results });

            return results;
        } catch (error) {
            logger.error('Chart of accounts sync failed', {
                firmId,
                error: error.message
            });
            throw CustomException('Failed to sync chart of accounts: ' + error.message, 500);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SYNC OPERATIONS - CUSTOMERS/CLIENTS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Sync customers/clients
     * @param {string} firmId - Firm ID
     * @param {string} direction - Sync direction
     * @returns {object} - Sync result
     */
    async syncCustomers(firmId, direction = SYNC_DIRECTIONS.BOTH) {
        const qb = await this.getActiveClient(firmId);
        const results = {
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [],
            conflicts: []
        };

        try {
            if (direction === SYNC_DIRECTIONS.FROM_QB || direction === SYNC_DIRECTIONS.BOTH) {
                // Sync from QuickBooks to TRAF3LI
                const qbCustomers = await retryQBOperation(() => {
                    return new Promise((resolve, reject) => {
                        qb.findCustomers({
                            fetchAll: true
                        }, (err, customers) => {
                            if (err) reject(err);
                            else resolve(customers.QueryResponse?.Customer || []);
                        });
                    });
                });

                for (const qbCustomer of qbCustomers) {
                    try {
                        const mappedClient = this.mapQBToCustomer(qbCustomer, firmId);

                        const existingClient = await Client.findOne({
                            firmId,
                            'integrations.quickbooks.id': qbCustomer.Id
                        });

                        if (existingClient) {
                            if (existingClient.updatedAt > new Date(qbCustomer.MetaData.LastUpdatedTime)) {
                                await storeSyncConflict(
                                    firmId,
                                    'customer',
                                    existingClient._id,
                                    qbCustomer,
                                    existingClient.toObject(),
                                    'Local changes newer than QuickBooks'
                                );
                                results.conflicts.push({
                                    type: 'customer',
                                    id: existingClient._id,
                                    name: existingClient.name
                                });
                                results.skipped++;
                                continue;
                            }

                            await Client.findByIdAndUpdate(existingClient._id, {
                                ...mappedClient,
                                'integrations.quickbooks': {
                                    id: qbCustomer.Id,
                                    syncToken: qbCustomer.SyncToken,
                                    lastSyncedAt: new Date()
                                }
                            });
                            results.updated++;
                        } else {
                            await Client.create({
                                ...mappedClient,
                                'integrations.quickbooks': {
                                    id: qbCustomer.Id,
                                    syncToken: qbCustomer.SyncToken,
                                    lastSyncedAt: new Date()
                                }
                            });
                            results.created++;
                        }
                    } catch (error) {
                        logger.error('Failed to sync customer from QB', {
                            customerId: qbCustomer.Id,
                            error: error.message
                        });
                        results.errors.push({
                            type: 'customer',
                            id: qbCustomer.Id,
                            error: error.message
                        });
                    }
                }
            }

            if (direction === SYNC_DIRECTIONS.TO_QB || direction === SYNC_DIRECTIONS.BOTH) {
                // Sync from TRAF3LI to QuickBooks
                const localClients = await Client.find({
                    firmId,
                    $or: [
                        { 'integrations.quickbooks.id': { $exists: false } },
                        { 'integrations.quickbooks.id': null }
                    ]
                });

                for (const client of localClients) {
                    try {
                        const qbCustomerData = this.mapCustomerToQB(client);

                        const createdCustomer = await retryQBOperation(() => {
                            return new Promise((resolve, reject) => {
                                qb.createCustomer(qbCustomerData, (err, customer) => {
                                    if (err) reject(err);
                                    else resolve(customer);
                                });
                            });
                        });

                        await Client.findByIdAndUpdate(client._id, {
                            'integrations.quickbooks': {
                                id: createdCustomer.Id,
                                syncToken: createdCustomer.SyncToken,
                                lastSyncedAt: new Date()
                            }
                        });

                        results.created++;
                    } catch (error) {
                        logger.error('Failed to create customer in QB', {
                            clientId: client._id,
                            error: error.message
                        });
                        results.errors.push({
                            type: 'customer',
                            id: client._id.toString(),
                            error: error.message
                        });
                    }
                }
            }

            await Firm.findByIdAndUpdate(firmId, {
                'integrations.quickbooks.lastSyncAt': new Date(),
                'integrations.quickbooks.lastSyncResults.customers': results
            });

            logger.info('Customers sync completed', { firmId, results });

            return results;
        } catch (error) {
            logger.error('Customers sync failed', {
                firmId,
                error: error.message
            });
            throw CustomException('Failed to sync customers: ' + error.message, 500);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SYNC OPERATIONS - VENDORS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Sync vendors
     * @param {string} firmId - Firm ID
     * @param {string} direction - Sync direction
     * @returns {object} - Sync result
     */
    async syncVendors(firmId, direction = SYNC_DIRECTIONS.BOTH) {
        const qb = await this.getActiveClient(firmId);
        const results = {
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [],
            conflicts: []
        };

        try {
            if (direction === SYNC_DIRECTIONS.FROM_QB || direction === SYNC_DIRECTIONS.BOTH) {
                const qbVendors = await retryQBOperation(() => {
                    return new Promise((resolve, reject) => {
                        qb.findVendors({
                            fetchAll: true
                        }, (err, vendors) => {
                            if (err) reject(err);
                            else resolve(vendors.QueryResponse?.Vendor || []);
                        });
                    });
                });

                for (const qbVendor of qbVendors) {
                    try {
                        const mappedVendor = this.mapQBToVendor(qbVendor, firmId);

                        const existingVendor = await Vendor.findOne({
                            firmId,
                            'integrations.quickbooks.id': qbVendor.Id
                        });

                        if (existingVendor) {
                            if (existingVendor.updatedAt > new Date(qbVendor.MetaData.LastUpdatedTime)) {
                                await storeSyncConflict(
                                    firmId,
                                    'vendor',
                                    existingVendor._id,
                                    qbVendor,
                                    existingVendor.toObject(),
                                    'Local changes newer than QuickBooks'
                                );
                                results.conflicts.push({
                                    type: 'vendor',
                                    id: existingVendor._id,
                                    name: existingVendor.name
                                });
                                results.skipped++;
                                continue;
                            }

                            await Vendor.findByIdAndUpdate(existingVendor._id, {
                                ...mappedVendor,
                                'integrations.quickbooks': {
                                    id: qbVendor.Id,
                                    syncToken: qbVendor.SyncToken,
                                    lastSyncedAt: new Date()
                                }
                            });
                            results.updated++;
                        } else {
                            await Vendor.create({
                                ...mappedVendor,
                                'integrations.quickbooks': {
                                    id: qbVendor.Id,
                                    syncToken: qbVendor.SyncToken,
                                    lastSyncedAt: new Date()
                                }
                            });
                            results.created++;
                        }
                    } catch (error) {
                        logger.error('Failed to sync vendor from QB', {
                            vendorId: qbVendor.Id,
                            error: error.message
                        });
                        results.errors.push({
                            type: 'vendor',
                            id: qbVendor.Id,
                            error: error.message
                        });
                    }
                }
            }

            if (direction === SYNC_DIRECTIONS.TO_QB || direction === SYNC_DIRECTIONS.BOTH) {
                const localVendors = await Vendor.find({
                    firmId,
                    $or: [
                        { 'integrations.quickbooks.id': { $exists: false } },
                        { 'integrations.quickbooks.id': null }
                    ]
                });

                for (const vendor of localVendors) {
                    try {
                        const qbVendorData = this.mapVendorToQB(vendor);

                        const createdVendor = await retryQBOperation(() => {
                            return new Promise((resolve, reject) => {
                                qb.createVendor(qbVendorData, (err, vendor) => {
                                    if (err) reject(err);
                                    else resolve(vendor);
                                });
                            });
                        });

                        await Vendor.findByIdAndUpdate(vendor._id, {
                            'integrations.quickbooks': {
                                id: createdVendor.Id,
                                syncToken: createdVendor.SyncToken,
                                lastSyncedAt: new Date()
                            }
                        });

                        results.created++;
                    } catch (error) {
                        logger.error('Failed to create vendor in QB', {
                            vendorId: vendor._id,
                            error: error.message
                        });
                        results.errors.push({
                            type: 'vendor',
                            id: vendor._id.toString(),
                            error: error.message
                        });
                    }
                }
            }

            await Firm.findByIdAndUpdate(firmId, {
                'integrations.quickbooks.lastSyncAt': new Date(),
                'integrations.quickbooks.lastSyncResults.vendors': results
            });

            logger.info('Vendors sync completed', { firmId, results });

            return results;
        } catch (error) {
            logger.error('Vendors sync failed', {
                firmId,
                error: error.message
            });
            throw CustomException('Failed to sync vendors: ' + error.message, 500);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SYNC OPERATIONS - INVOICES
    // ═══════════════════════════════════════════════════════════════

    /**
     * Sync invoices
     * @param {string} firmId - Firm ID
     * @param {Date} lastSyncDate - Only sync invoices modified after this date
     * @returns {object} - Sync result
     */
    async syncInvoices(firmId, lastSyncDate = null) {
        const qb = await this.getActiveClient(firmId);
        const results = {
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [],
            conflicts: []
        };

        try {
            // Build query for modified invoices
            let query = {};
            if (lastSyncDate) {
                const formattedDate = lastSyncDate.toISOString().split('T')[0];
                query = {
                    where: `MetaData.LastUpdatedTime > '${formattedDate}'`
                };
            } else {
                query = { fetchAll: true };
            }

            const qbInvoices = await retryQBOperation(() => {
                return new Promise((resolve, reject) => {
                    qb.findInvoices(query, (err, invoices) => {
                        if (err) reject(err);
                        else resolve(invoices.QueryResponse?.Invoice || []);
                    });
                });
            });

            for (const qbInvoice of qbInvoices) {
                try {
                    const mappedInvoice = await this.mapQBToInvoice(qbInvoice, firmId);

                    const existingInvoice = await Invoice.findOne({
                        firmId,
                        'integrations.quickbooks.id': qbInvoice.Id
                    });

                    if (existingInvoice) {
                        if (existingInvoice.updatedAt > new Date(qbInvoice.MetaData.LastUpdatedTime)) {
                            await storeSyncConflict(
                                firmId,
                                'invoice',
                                existingInvoice._id,
                                qbInvoice,
                                existingInvoice.toObject(),
                                'Local changes newer than QuickBooks'
                            );
                            results.conflicts.push({
                                type: 'invoice',
                                id: existingInvoice._id,
                                number: existingInvoice.invoiceNumber
                            });
                            results.skipped++;
                            continue;
                        }

                        await Invoice.findByIdAndUpdate(existingInvoice._id, {
                            ...mappedInvoice,
                            'integrations.quickbooks': {
                                id: qbInvoice.Id,
                                syncToken: qbInvoice.SyncToken,
                                lastSyncedAt: new Date()
                            }
                        });
                        results.updated++;
                    } else {
                        await Invoice.create({
                            ...mappedInvoice,
                            'integrations.quickbooks': {
                                id: qbInvoice.Id,
                                syncToken: qbInvoice.SyncToken,
                                lastSyncedAt: new Date()
                            }
                        });
                        results.created++;
                    }
                } catch (error) {
                    logger.error('Failed to sync invoice from QB', {
                        invoiceId: qbInvoice.Id,
                        error: error.message
                    });
                    results.errors.push({
                        type: 'invoice',
                        id: qbInvoice.Id,
                        error: error.message
                    });
                }
            }

            await Firm.findByIdAndUpdate(firmId, {
                'integrations.quickbooks.lastSyncAt': new Date(),
                'integrations.quickbooks.lastSyncResults.invoices': results
            });

            logger.info('Invoices sync completed', { firmId, results });

            return results;
        } catch (error) {
            logger.error('Invoices sync failed', {
                firmId,
                error: error.message
            });
            throw CustomException('Failed to sync invoices: ' + error.message, 500);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SYNC OPERATIONS - PAYMENTS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Sync payments
     * @param {string} firmId - Firm ID
     * @param {Date} lastSyncDate - Only sync payments modified after this date
     * @returns {object} - Sync result
     */
    async syncPayments(firmId, lastSyncDate = null) {
        const qb = await this.getActiveClient(firmId);
        const results = {
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [],
            conflicts: []
        };

        try {
            let query = {};
            if (lastSyncDate) {
                const formattedDate = lastSyncDate.toISOString().split('T')[0];
                query = {
                    where: `MetaData.LastUpdatedTime > '${formattedDate}'`
                };
            } else {
                query = { fetchAll: true };
            }

            const qbPayments = await retryQBOperation(() => {
                return new Promise((resolve, reject) => {
                    qb.findPayments(query, (err, payments) => {
                        if (err) reject(err);
                        else resolve(payments.QueryResponse?.Payment || []);
                    });
                });
            });

            for (const qbPayment of qbPayments) {
                try {
                    const mappedPayment = await this.mapQBToPayment(qbPayment, firmId);

                    const existingPayment = await Payment.findOne({
                        firmId,
                        'integrations.quickbooks.id': qbPayment.Id
                    });

                    if (existingPayment) {
                        if (existingPayment.updatedAt > new Date(qbPayment.MetaData.LastUpdatedTime)) {
                            await storeSyncConflict(
                                firmId,
                                'payment',
                                existingPayment._id,
                                qbPayment,
                                existingPayment.toObject(),
                                'Local changes newer than QuickBooks'
                            );
                            results.conflicts.push({
                                type: 'payment',
                                id: existingPayment._id
                            });
                            results.skipped++;
                            continue;
                        }

                        await Payment.findByIdAndUpdate(existingPayment._id, {
                            ...mappedPayment,
                            'integrations.quickbooks': {
                                id: qbPayment.Id,
                                syncToken: qbPayment.SyncToken,
                                lastSyncedAt: new Date()
                            }
                        });
                        results.updated++;
                    } else {
                        await Payment.create({
                            ...mappedPayment,
                            'integrations.quickbooks': {
                                id: qbPayment.Id,
                                syncToken: qbPayment.SyncToken,
                                lastSyncedAt: new Date()
                            }
                        });
                        results.created++;
                    }
                } catch (error) {
                    logger.error('Failed to sync payment from QB', {
                        paymentId: qbPayment.Id,
                        error: error.message
                    });
                    results.errors.push({
                        type: 'payment',
                        id: qbPayment.Id,
                        error: error.message
                    });
                }
            }

            await Firm.findByIdAndUpdate(firmId, {
                'integrations.quickbooks.lastSyncAt': new Date(),
                'integrations.quickbooks.lastSyncResults.payments': results
            });

            logger.info('Payments sync completed', { firmId, results });

            return results;
        } catch (error) {
            logger.error('Payments sync failed', {
                firmId,
                error: error.message
            });
            throw CustomException('Failed to sync payments: ' + error.message, 500);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SYNC OPERATIONS - BILLS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Sync bills/expenses
     * @param {string} firmId - Firm ID
     * @param {Date} lastSyncDate - Only sync bills modified after this date
     * @returns {object} - Sync result
     */
    async syncBills(firmId, lastSyncDate = null) {
        const qb = await this.getActiveClient(firmId);
        const results = {
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [],
            conflicts: []
        };

        try {
            let query = {};
            if (lastSyncDate) {
                const formattedDate = lastSyncDate.toISOString().split('T')[0];
                query = {
                    where: `MetaData.LastUpdatedTime > '${formattedDate}'`
                };
            } else {
                query = { fetchAll: true };
            }

            const qbBills = await retryQBOperation(() => {
                return new Promise((resolve, reject) => {
                    qb.findBills(query, (err, bills) => {
                        if (err) reject(err);
                        else resolve(bills.QueryResponse?.Bill || []);
                    });
                });
            });

            for (const qbBill of qbBills) {
                try {
                    const mappedBill = await this.mapQBToBill(qbBill, firmId);

                    const existingBill = await Bill.findOne({
                        firmId,
                        'integrations.quickbooks.id': qbBill.Id
                    });

                    if (existingBill) {
                        if (existingBill.updatedAt > new Date(qbBill.MetaData.LastUpdatedTime)) {
                            await storeSyncConflict(
                                firmId,
                                'bill',
                                existingBill._id,
                                qbBill,
                                existingBill.toObject(),
                                'Local changes newer than QuickBooks'
                            );
                            results.conflicts.push({
                                type: 'bill',
                                id: existingBill._id
                            });
                            results.skipped++;
                            continue;
                        }

                        await Bill.findByIdAndUpdate(existingBill._id, {
                            ...mappedBill,
                            'integrations.quickbooks': {
                                id: qbBill.Id,
                                syncToken: qbBill.SyncToken,
                                lastSyncedAt: new Date()
                            }
                        });
                        results.updated++;
                    } else {
                        await Bill.create({
                            ...mappedBill,
                            'integrations.quickbooks': {
                                id: qbBill.Id,
                                syncToken: qbBill.SyncToken,
                                lastSyncedAt: new Date()
                            }
                        });
                        results.created++;
                    }
                } catch (error) {
                    logger.error('Failed to sync bill from QB', {
                        billId: qbBill.Id,
                        error: error.message
                    });
                    results.errors.push({
                        type: 'bill',
                        id: qbBill.Id,
                        error: error.message
                    });
                }
            }

            await Firm.findByIdAndUpdate(firmId, {
                'integrations.quickbooks.lastSyncAt': new Date(),
                'integrations.quickbooks.lastSyncResults.bills': results
            });

            logger.info('Bills sync completed', { firmId, results });

            return results;
        } catch (error) {
            logger.error('Bills sync failed', {
                firmId,
                error: error.message
            });
            throw CustomException('Failed to sync bills: ' + error.message, 500);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SYNC OPERATIONS - ITEMS (Products/Services)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Sync items (products/services)
     * @param {string} firmId - Firm ID
     * @param {string} direction - Sync direction
     * @returns {object} - Sync result
     */
    async syncItems(firmId, direction = SYNC_DIRECTIONS.BOTH) {
        const qb = await this.getActiveClient(firmId);
        const results = {
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [],
            conflicts: []
        };

        try {
            if (direction === SYNC_DIRECTIONS.FROM_QB || direction === SYNC_DIRECTIONS.BOTH) {
                const qbItems = await retryQBOperation(() => {
                    return new Promise((resolve, reject) => {
                        qb.findItems({
                            fetchAll: true
                        }, (err, items) => {
                            if (err) reject(err);
                            else resolve(items.QueryResponse?.Item || []);
                        });
                    });
                });

                // Store items in firm settings or a separate model
                // This is simplified - you may want to create a separate Item model
                await Firm.findByIdAndUpdate(firmId, {
                    'integrations.quickbooks.items': qbItems.map(item => ({
                        id: item.Id,
                        name: item.Name,
                        type: item.Type,
                        description: item.Description,
                        unitPrice: item.UnitPrice,
                        active: item.Active,
                        syncToken: item.SyncToken,
                        lastSyncedAt: new Date()
                    }))
                });

                results.created = qbItems.length;
            }

            logger.info('Items sync completed', { firmId, results });

            return results;
        } catch (error) {
            logger.error('Items sync failed', {
                firmId,
                error: error.message
            });
            throw CustomException('Failed to sync items: ' + error.message, 500);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // MAPPING FUNCTIONS - QB TO TRAF3LI
    // ═══════════════════════════════════════════════════════════════

    /**
     * Map QuickBooks Account to TRAF3LI Account
     */
    mapQBToAccount(qbAccount, firmId) {
        // Map QB account types to TRAF3LI account types
        const typeMapping = {
            'Bank': 'asset',
            'Other Current Asset': 'asset',
            'Fixed Asset': 'asset',
            'Other Asset': 'asset',
            'Accounts Receivable': 'asset',
            'Accounts Payable': 'liability',
            'Credit Card': 'liability',
            'Long Term Liability': 'liability',
            'Other Current Liability': 'liability',
            'Equity': 'equity',
            'Income': 'revenue',
            'Other Income': 'revenue',
            'Expense': 'expense',
            'Cost of Goods Sold': 'expense',
            'Other Expense': 'expense'
        };

        return {
            firmId,
            code: qbAccount.AcctNum || qbAccount.Id,
            name: qbAccount.Name,
            nameAr: qbAccount.Name, // QB doesn't support Arabic names
            type: typeMapping[qbAccount.AccountType] || 'expense',
            subtype: qbAccount.AccountSubType,
            description: qbAccount.Description || '',
            currency: qbAccount.CurrencyRef?.value || 'SAR',
            balance: qbAccount.CurrentBalance || 0,
            balanceInHalalas: Math.round((qbAccount.CurrentBalance || 0) * 100),
            isActive: qbAccount.Active !== false,
            parentAccount: qbAccount.ParentRef?.value || null
        };
    }

    /**
     * Map QuickBooks Customer to TRAF3LI Client
     */
    mapQBToCustomer(qbCustomer, firmId) {
        return {
            firmId,
            name: qbCustomer.DisplayName || qbCustomer.FullyQualifiedName,
            nameAr: qbCustomer.DisplayName,
            email: qbCustomer.PrimaryEmailAddr?.Address || '',
            phone: qbCustomer.PrimaryPhone?.FreeFormNumber || qbCustomer.Mobile?.FreeFormNumber || '',
            type: 'individual',
            status: qbCustomer.Active !== false ? 'active' : 'inactive',
            address: {
                street: qbCustomer.BillAddr?.Line1 || '',
                city: qbCustomer.BillAddr?.City || '',
                state: qbCustomer.BillAddr?.CountrySubDivisionCode || '',
                postalCode: qbCustomer.BillAddr?.PostalCode || '',
                country: qbCustomer.BillAddr?.Country || 'Saudi Arabia'
            },
            balance: qbCustomer.Balance || 0,
            balanceInHalalas: Math.round((qbCustomer.Balance || 0) * 100),
            notes: qbCustomer.Notes || ''
        };
    }

    /**
     * Map QuickBooks Vendor to TRAF3LI Vendor
     */
    mapQBToVendor(qbVendor, firmId) {
        return {
            firmId,
            name: qbVendor.DisplayName || qbVendor.FullyQualifiedName,
            nameAr: qbVendor.DisplayName,
            email: qbVendor.PrimaryEmailAddr?.Address || '',
            phone: qbVendor.PrimaryPhone?.FreeFormNumber || qbVendor.Mobile?.FreeFormNumber || '',
            category: 'general',
            status: qbVendor.Active !== false ? 'active' : 'inactive',
            address: {
                street: qbVendor.BillAddr?.Line1 || '',
                city: qbVendor.BillAddr?.City || '',
                state: qbVendor.BillAddr?.CountrySubDivisionCode || '',
                postalCode: qbVendor.BillAddr?.PostalCode || '',
                country: qbVendor.BillAddr?.Country || 'Saudi Arabia'
            },
            balance: qbVendor.Balance || 0,
            balanceInHalalas: Math.round((qbVendor.Balance || 0) * 100)
        };
    }

    /**
     * Map QuickBooks Invoice to TRAF3LI Invoice
     */
    async mapQBToInvoice(qbInvoice, firmId) {
        // Find client by QB customer ID
        const client = await Client.findOne({
            firmId,
            'integrations.quickbooks.id': qbInvoice.CustomerRef?.value
        });

        const items = (qbInvoice.Line || [])
            .filter(line => line.DetailType === 'SalesItemLineDetail')
            .map(line => ({
                description: line.Description || line.SalesItemLineDetail?.ItemRef?.name || '',
                descriptionAr: line.Description || '',
                quantity: line.SalesItemLineDetail?.Qty || 1,
                unitPrice: line.SalesItemLineDetail?.UnitPrice || 0,
                unitPriceInHalalas: Math.round((line.SalesItemLineDetail?.UnitPrice || 0) * 100),
                total: line.Amount || 0,
                totalInHalalas: Math.round((line.Amount || 0) * 100)
            }));

        return {
            firmId,
            clientId: client?._id || null,
            invoiceNumber: qbInvoice.DocNumber,
            date: new Date(qbInvoice.TxnDate),
            dueDate: new Date(qbInvoice.DueDate || qbInvoice.TxnDate),
            status: this.mapQBInvoiceStatus(qbInvoice),
            items,
            subtotal: qbInvoice.TotalAmt - (qbInvoice.TxnTaxDetail?.TotalTax || 0),
            subtotalInHalalas: Math.round((qbInvoice.TotalAmt - (qbInvoice.TxnTaxDetail?.TotalTax || 0)) * 100),
            taxAmount: qbInvoice.TxnTaxDetail?.TotalTax || 0,
            taxAmountInHalalas: Math.round((qbInvoice.TxnTaxDetail?.TotalTax || 0) * 100),
            total: qbInvoice.TotalAmt || 0,
            totalInHalalas: Math.round((qbInvoice.TotalAmt || 0) * 100),
            balance: qbInvoice.Balance || 0,
            balanceInHalalas: Math.round((qbInvoice.Balance || 0) * 100),
            currency: qbInvoice.CurrencyRef?.value || 'SAR',
            notes: qbInvoice.CustomerMemo?.value || ''
        };
    }

    /**
     * Map QuickBooks invoice status to TRAF3LI status
     */
    mapQBInvoiceStatus(qbInvoice) {
        if (qbInvoice.Balance === 0 && qbInvoice.TotalAmt > 0) {
            return 'paid';
        } else if (qbInvoice.Balance > 0 && qbInvoice.Balance < qbInvoice.TotalAmt) {
            return 'partial';
        } else if (new Date(qbInvoice.DueDate) < new Date()) {
            return 'overdue';
        } else {
            return 'sent';
        }
    }

    /**
     * Map QuickBooks Payment to TRAF3LI Payment
     */
    async mapQBToPayment(qbPayment, firmId) {
        // Find client by QB customer ID
        const client = await Client.findOne({
            firmId,
            'integrations.quickbooks.id': qbPayment.CustomerRef?.value
        });

        // Find invoice by QB invoice ID if linked
        let invoice = null;
        if (qbPayment.Line && qbPayment.Line.length > 0) {
            const linkedInvoiceId = qbPayment.Line[0].LinkedTxn?.[0]?.TxnId;
            if (linkedInvoiceId) {
                invoice = await Invoice.findOne({
                    firmId,
                    'integrations.quickbooks.id': linkedInvoiceId
                });
            }
        }

        return {
            firmId,
            clientId: client?._id || null,
            invoiceId: invoice?._id || null,
            amount: qbPayment.TotalAmt || 0,
            amountInHalalas: Math.round((qbPayment.TotalAmt || 0) * 100),
            paymentDate: new Date(qbPayment.TxnDate),
            paymentMethod: this.mapQBPaymentMethod(qbPayment.PaymentMethodRef?.name),
            referenceNumber: qbPayment.PaymentRefNum || '',
            notes: qbPayment.PrivateNote || '',
            currency: qbPayment.CurrencyRef?.value || 'SAR'
        };
    }

    /**
     * Map QuickBooks payment method to TRAF3LI payment method
     */
    mapQBPaymentMethod(qbMethod) {
        const methodMapping = {
            'Cash': 'cash',
            'Check': 'check',
            'Credit Card': 'credit_card',
            'Bank Transfer': 'bank_transfer',
            'Wire Transfer': 'bank_transfer'
        };

        return methodMapping[qbMethod] || 'other';
    }

    /**
     * Map QuickBooks Bill to TRAF3LI Bill
     */
    async mapQBToBill(qbBill, firmId) {
        // Find vendor by QB vendor ID
        const vendor = await Vendor.findOne({
            firmId,
            'integrations.quickbooks.id': qbBill.VendorRef?.value
        });

        const items = (qbBill.Line || [])
            .filter(line => line.DetailType === 'AccountBasedExpenseLineDetail' || line.DetailType === 'ItemBasedExpenseLineDetail')
            .map(line => ({
                description: line.Description || '',
                descriptionAr: line.Description || '',
                amount: line.Amount || 0,
                amountInHalalas: Math.round((line.Amount || 0) * 100),
                accountId: line.AccountBasedExpenseLineDetail?.AccountRef?.value || null
            }));

        return {
            firmId,
            vendorId: vendor?._id || null,
            billNumber: qbBill.DocNumber,
            date: new Date(qbBill.TxnDate),
            dueDate: new Date(qbBill.DueDate || qbBill.TxnDate),
            status: qbBill.Balance === 0 ? 'paid' : 'unpaid',
            items,
            subtotal: qbBill.TotalAmt - (qbBill.TxnTaxDetail?.TotalTax || 0),
            subtotalInHalalas: Math.round((qbBill.TotalAmt - (qbBill.TxnTaxDetail?.TotalTax || 0)) * 100),
            taxAmount: qbBill.TxnTaxDetail?.TotalTax || 0,
            taxAmountInHalalas: Math.round((qbBill.TxnTaxDetail?.TotalTax || 0) * 100),
            total: qbBill.TotalAmt || 0,
            totalInHalalas: Math.round((qbBill.TotalAmt || 0) * 100),
            balance: qbBill.Balance || 0,
            balanceInHalalas: Math.round((qbBill.Balance || 0) * 100),
            currency: qbBill.CurrencyRef?.value || 'SAR',
            notes: qbBill.PrivateNote || ''
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // MAPPING FUNCTIONS - TRAF3LI TO QB
    // ═══════════════════════════════════════════════════════════════

    /**
     * Map TRAF3LI Account to QuickBooks Account
     */
    mapAccountToQB(account) {
        const typeMapping = {
            'asset': 'Other Current Asset',
            'liability': 'Other Current Liability',
            'equity': 'Equity',
            'revenue': 'Income',
            'expense': 'Expense'
        };

        return {
            Name: account.name,
            AccountType: typeMapping[account.type] || 'Expense',
            AccountSubType: account.subtype || undefined,
            Description: account.description || '',
            AcctNum: account.code || '',
            Active: account.isActive !== false
        };
    }

    /**
     * Map TRAF3LI Client to QuickBooks Customer
     */
    mapCustomerToQB(client) {
        return {
            DisplayName: client.name,
            PrimaryEmailAddr: client.email ? { Address: client.email } : undefined,
            PrimaryPhone: client.phone ? { FreeFormNumber: client.phone } : undefined,
            BillAddr: client.address ? {
                Line1: client.address.street || '',
                City: client.address.city || '',
                CountrySubDivisionCode: client.address.state || '',
                PostalCode: client.address.postalCode || '',
                Country: client.address.country || 'Saudi Arabia'
            } : undefined,
            Notes: client.notes || '',
            Active: client.status === 'active'
        };
    }

    /**
     * Map TRAF3LI Vendor to QuickBooks Vendor
     */
    mapVendorToQB(vendor) {
        return {
            DisplayName: vendor.name,
            PrimaryEmailAddr: vendor.email ? { Address: vendor.email } : undefined,
            PrimaryPhone: vendor.phone ? { FreeFormNumber: vendor.phone } : undefined,
            BillAddr: vendor.address ? {
                Line1: vendor.address.street || '',
                City: vendor.address.city || '',
                CountrySubDivisionCode: vendor.address.state || '',
                PostalCode: vendor.address.postalCode || '',
                Country: vendor.address.country || 'Saudi Arabia'
            } : undefined,
            Active: vendor.status === 'active'
        };
    }

    /**
     * Map TRAF3LI Invoice to QuickBooks Invoice
     */
    async mapInvoiceToQB(invoice) {
        // Get client's QB ID
        const client = await Client.findById(invoice.clientId);
        if (!client?.integrations?.quickbooks?.id) {
            throw CustomException('Client must be synced to QuickBooks first', 400);
        }

        // Map line items
        const lines = (invoice.items || []).map((item, index) => ({
            DetailType: 'SalesItemLineDetail',
            Amount: item.total || (item.unitPrice * item.quantity),
            Description: item.description,
            SalesItemLineDetail: {
                Qty: item.quantity || 1,
                UnitPrice: item.unitPrice || 0,
                // You may need to map to actual QB Item IDs
                ItemRef: {
                    name: 'Services' // Default item, adjust as needed
                }
            }
        }));

        return {
            CustomerRef: {
                value: client.integrations.quickbooks.id
            },
            DocNumber: invoice.invoiceNumber,
            TxnDate: invoice.date.toISOString().split('T')[0],
            DueDate: invoice.dueDate ? invoice.dueDate.toISOString().split('T')[0] : undefined,
            Line: lines,
            CustomerMemo: invoice.notes ? {
                value: invoice.notes
            } : undefined
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // CONFLICT RESOLUTION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get sync conflicts
     * @param {string} firmId - Firm ID
     * @returns {array} - List of conflicts
     */
    async getConflicts(firmId) {
        const firm = await Firm.findById(firmId).select('integrations.quickbooks.conflicts');

        if (!firm?.integrations?.quickbooks?.conflicts) {
            return [];
        }

        return firm.integrations.quickbooks.conflicts.filter(c => c.status === 'pending');
    }

    /**
     * Resolve conflict
     * @param {string} firmId - Firm ID
     * @param {string} conflictId - Conflict ID
     * @param {string} resolution - Resolution strategy
     * @returns {object} - Resolution result
     */
    async resolveConflict(firmId, conflictId, resolution) {
        const firm = await Firm.findById(firmId);
        const conflict = firm.integrations.quickbooks.conflicts.id(conflictId);

        if (!conflict) {
            throw CustomException('Conflict not found', 404);
        }

        if (conflict.status !== 'pending') {
            throw CustomException('Conflict already resolved', 400);
        }

        let result;

        switch (resolution) {
            case CONFLICT_RESOLUTION.QB_WINS:
                // Update local entity with QB data
                result = await this.applyQBData(firmId, conflict);
                break;

            case CONFLICT_RESOLUTION.TRAF3LI_WINS:
                // Update QB entity with local data
                result = await this.applyLocalData(firmId, conflict);
                break;

            case CONFLICT_RESOLUTION.NEWEST_WINS:
                // Compare timestamps and apply newer data
                const qbDate = new Date(conflict.qbData.MetaData?.LastUpdatedTime);
                const localDate = new Date(conflict.traf3liData.updatedAt);

                if (qbDate > localDate) {
                    result = await this.applyQBData(firmId, conflict);
                } else {
                    result = await this.applyLocalData(firmId, conflict);
                }
                break;

            default:
                throw CustomException('Invalid resolution strategy', 400);
        }

        // Mark conflict as resolved
        conflict.status = 'resolved';
        conflict.resolvedAt = new Date();
        conflict.resolution = resolution;
        await firm.save();

        logger.info('Conflict resolved', {
            firmId,
            conflictId,
            resolution
        });

        return {
            success: true,
            resolution,
            result
        };
    }

    /**
     * Apply QuickBooks data to local entity
     */
    async applyQBData(firmId, conflict) {
        const { entityType, entityId, qbData } = conflict;

        switch (entityType) {
            case 'account':
                const mappedAccount = this.mapQBToAccount(qbData, firmId);
                return await Account.findByIdAndUpdate(entityId, mappedAccount, { new: true });

            case 'customer':
                const mappedCustomer = this.mapQBToCustomer(qbData, firmId);
                return await Client.findByIdAndUpdate(entityId, mappedCustomer, { new: true });

            case 'vendor':
                const mappedVendor = this.mapQBToVendor(qbData, firmId);
                return await Vendor.findByIdAndUpdate(entityId, mappedVendor, { new: true });

            case 'invoice':
                const mappedInvoice = await this.mapQBToInvoice(qbData, firmId);
                return await Invoice.findByIdAndUpdate(entityId, mappedInvoice, { new: true });

            case 'payment':
                const mappedPayment = await this.mapQBToPayment(qbData, firmId);
                return await Payment.findByIdAndUpdate(entityId, mappedPayment, { new: true });

            case 'bill':
                const mappedBill = await this.mapQBToBill(qbData, firmId);
                return await Bill.findByIdAndUpdate(entityId, mappedBill, { new: true });

            default:
                throw CustomException('Unsupported entity type', 400);
        }
    }

    /**
     * Apply local data to QuickBooks entity
     */
    async applyLocalData(firmId, conflict) {
        const qb = await this.getActiveClient(firmId);
        const { entityType, entityId, traf3liData, qbData } = conflict;

        // Implementation would depend on entity type
        // This is a simplified example
        logger.info('Applying local data to QB', { entityType, entityId });

        // You would update the QB entity here using the QB API
        // and return the result

        return { success: true };
    }

    // ═══════════════════════════════════════════════════════════════
    // STATUS AND MONITORING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get connection status
     * @param {string} firmId - Firm ID
     * @returns {object} - Connection status
     */
    async getConnectionStatus(firmId) {
        try {
            const firm = await Firm.findById(firmId).select('integrations.quickbooks');

            if (!firm?.integrations?.quickbooks?.isConnected) {
                return {
                    connected: false,
                    status: 'disconnected'
                };
            }

            const qbData = firm.integrations.quickbooks;
            const now = new Date();
            const tokenExpired = new Date(qbData.expiresAt) < now;
            const refreshTokenExpired = new Date(qbData.refreshTokenExpiresAt) < now;

            return {
                connected: true,
                status: tokenExpired ? (refreshTokenExpired ? 'expired' : 'needs_refresh') : 'active',
                realmId: qbData.realmId,
                companyName: qbData.companyName,
                connectedAt: qbData.connectedAt,
                lastSyncAt: qbData.lastSyncAt,
                expiresAt: qbData.expiresAt,
                refreshTokenExpiresAt: qbData.refreshTokenExpiresAt,
                settings: qbData.settings
            };
        } catch (error) {
            logger.error('Failed to get connection status', {
                firmId,
                error: error.message
            });
            throw CustomException('Failed to get connection status: ' + error.message, 500);
        }
    }

    /**
     * Get last sync status
     * @param {string} firmId - Firm ID
     * @returns {object} - Sync status
     */
    async getSyncStatus(firmId) {
        const firm = await Firm.findById(firmId).select('integrations.quickbooks');

        if (!firm?.integrations?.quickbooks?.isConnected) {
            throw CustomException('QuickBooks not connected', 404);
        }

        const qbData = firm.integrations.quickbooks;

        return {
            lastSyncAt: qbData.lastSyncAt,
            lastSyncResults: qbData.lastSyncResults || {},
            conflictsCount: qbData.conflicts?.filter(c => c.status === 'pending').length || 0
        };
    }

    /**
     * Get sync errors
     * @param {string} firmId - Firm ID
     * @returns {array} - List of sync errors
     */
    async getSyncErrors(firmId) {
        const firm = await Firm.findById(firmId).select('integrations.quickbooks');

        if (!firm?.integrations?.quickbooks?.isConnected) {
            throw CustomException('QuickBooks not connected', 404);
        }

        const results = firm.integrations.quickbooks.lastSyncResults || {};
        const errors = [];

        // Collect all errors from different sync operations
        Object.keys(results).forEach(operation => {
            if (results[operation].errors) {
                errors.push(...results[operation].errors.map(err => ({
                    operation,
                    ...err
                })));
            }
        });

        return errors;
    }
}

// Export singleton instance
module.exports = new QuickBooksService();

// Export constants for use in routes/controllers
module.exports.SYNC_DIRECTIONS = SYNC_DIRECTIONS;
module.exports.CONFLICT_RESOLUTION = CONFLICT_RESOLUTION;
