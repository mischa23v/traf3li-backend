/**
 * Integrations Routes
 *
 * Handles third-party accounting integrations including QuickBooks and Xero.
 * Provides OAuth authentication, data synchronization, mapping, and webhook handling.
 *
 * Base route: /api/integrations
 */

const express = require('express');
const { userMiddleware } = require('../middlewares');
const { checkPermission } = require('../middlewares/authorize.middleware');
const { createRateLimiter } = require('../middlewares/rateLimiter.middleware');

// ============================================================================
// CONTROLLERS - Import integration controllers (to be implemented)
// ============================================================================

// QuickBooks Controllers
const {
    // Auth
    initiateQuickBooksAuth,
    handleQuickBooksCallback,
    disconnectQuickBooks,
    getQuickBooksStatus,
    refreshQuickBooksToken,

    // Sync
    syncQuickBooksInvoices,
    syncQuickBooksCustomers,
    syncQuickBooksVendors,
    syncQuickBooksAccounts,
    syncQuickBooksPayments,
    syncQuickBooksExpenses,
    syncAllQuickBooksData,
    getQuickBooksSyncHistory,

    // Mapping
    getQuickBooksFieldMappings,
    updateQuickBooksFieldMappings,
    getQuickBooksAccountMappings,
    updateQuickBooksAccountMappings,

    // Conflicts
    getQuickBooksConflicts,
    resolveQuickBooksConflict,
    bulkResolveQuickBooksConflicts
} = require('../controllers/quickbooks.controller');

// Xero Controllers
const {
    // Auth
    initiateXeroAuth,
    handleXeroCallback,
    disconnectXero,
    getXeroStatus,
    refreshXeroToken,

    // Sync
    syncXeroInvoices,
    syncXeroContacts,
    syncXeroAccounts,
    syncXeroPayments,
    syncXeroExpenses,
    syncAllXeroData,
    getXeroSyncHistory,

    // Webhook
    handleXeroWebhook,
    getXeroWebhookStatus
} = require('../controllers/xero.controller');

// ============================================================================
// VALIDATORS - Integration validation middleware (to be implemented)
// ============================================================================

const {
    validateSyncParams,
    validateFieldMapping,
    validateAccountMapping,
    validateConflictResolution
} = require('../validators/integration.validator');

// ============================================================================
// RATE LIMITERS
// ============================================================================

// Sync operations rate limiter - prevent excessive API calls to third-party services
const syncRateLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 sync operations per 5 minutes
    message: {
        success: false,
        error: 'عمليات مزامنة كثيرة جداً - حاول مرة أخرى بعد 5 دقائق',
        error_en: 'Too many sync operations - Try again after 5 minutes',
        code: 'SYNC_RATE_LIMIT_EXCEEDED',
    },
});

// OAuth callback rate limiter - prevent abuse of OAuth flow
const oauthRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 OAuth attempts per 15 minutes
    message: {
        success: false,
        error: 'محاولات مصادقة كثيرة جداً - حاول مرة أخرى لاحقاً',
        error_en: 'Too many authentication attempts - Please try again later',
        code: 'OAUTH_RATE_LIMIT_EXCEEDED',
    },
});

// Webhook rate limiter - allow high volume for legitimate webhooks
const webhookRateLimiter = createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 webhook calls per minute
    message: {
        success: false,
        error: 'طلبات كثيرة جداً',
        error_en: 'Too many requests',
        code: 'WEBHOOK_RATE_LIMIT_EXCEEDED',
    },
});

// Discord Controllers
const {
    getAuthUrl: getDiscordAuthUrl,
    handleCallback: handleDiscordCallback,
    completeSetup: completeDiscordSetup,
    getStatus: getDiscordStatus,
    disconnect: disconnectDiscord,
    testConnection: testDiscordConnection,
    listGuilds: listDiscordGuilds,
    listChannels: listDiscordChannels,
    updateSettings: updateDiscordSettings,
    sendMessage: sendDiscordMessage,
    handleWebhook: handleDiscordWebhook
} = require('../controllers/discord.controller');

const router = express.Router();

// ============================================================================
// QUICKBOOKS ROUTES
// ============================================================================

/**
 * QuickBooks Authentication Routes
 * Handles OAuth 2.0 flow for QuickBooks integration
 */

// Initiate QuickBooks OAuth flow
router.get('/quickbooks/auth',
    userMiddleware,
    checkPermission('manage:integrations'),
    oauthRateLimiter,
    initiateQuickBooksAuth
);

// QuickBooks OAuth callback (no auth middleware - OAuth provider calls this)
router.get('/quickbooks/callback',
    oauthRateLimiter,
    handleQuickBooksCallback
);

// Disconnect QuickBooks integration
router.post('/quickbooks/disconnect',
    userMiddleware,
    checkPermission('manage:integrations'),
    disconnectQuickBooks
);

// Get QuickBooks connection status
router.get('/quickbooks/status',
    userMiddleware,
    checkPermission('manage:integrations'),
    getQuickBooksStatus
);

// Manually refresh QuickBooks access token
router.post('/quickbooks/refresh-token',
    userMiddleware,
    checkPermission('manage:integrations'),
    refreshQuickBooksToken
);

/**
 * QuickBooks Sync Routes
 * Handles data synchronization between system and QuickBooks
 */

// Sync all data from QuickBooks
router.post('/quickbooks/sync/all',
    userMiddleware,
    checkPermission('manage:integrations'),
    syncRateLimiter,
    validateSyncParams,
    syncAllQuickBooksData
);

// Sync invoices from QuickBooks
router.post('/quickbooks/sync/invoices',
    userMiddleware,
    checkPermission('manage:integrations'),
    syncRateLimiter,
    validateSyncParams,
    syncQuickBooksInvoices
);

// Sync customers from QuickBooks
router.post('/quickbooks/sync/customers',
    userMiddleware,
    checkPermission('manage:integrations'),
    syncRateLimiter,
    validateSyncParams,
    syncQuickBooksCustomers
);

// Sync vendors from QuickBooks
router.post('/quickbooks/sync/vendors',
    userMiddleware,
    checkPermission('manage:integrations'),
    syncRateLimiter,
    validateSyncParams,
    syncQuickBooksVendors
);

// Sync chart of accounts from QuickBooks
router.post('/quickbooks/sync/accounts',
    userMiddleware,
    checkPermission('manage:integrations'),
    syncRateLimiter,
    validateSyncParams,
    syncQuickBooksAccounts
);

// Sync payments from QuickBooks
router.post('/quickbooks/sync/payments',
    userMiddleware,
    checkPermission('manage:integrations'),
    syncRateLimiter,
    validateSyncParams,
    syncQuickBooksPayments
);

// Sync expenses from QuickBooks
router.post('/quickbooks/sync/expenses',
    userMiddleware,
    checkPermission('manage:integrations'),
    syncRateLimiter,
    validateSyncParams,
    syncQuickBooksExpenses
);

// Get QuickBooks sync history
router.get('/quickbooks/sync/history',
    userMiddleware,
    checkPermission('manage:integrations'),
    getQuickBooksSyncHistory
);

/**
 * QuickBooks Mapping Routes
 * Handles field and account mappings between systems
 */

// Get field mappings configuration
router.get('/quickbooks/mappings/fields',
    userMiddleware,
    checkPermission('manage:integrations'),
    getQuickBooksFieldMappings
);

// Update field mappings configuration
router.put('/quickbooks/mappings/fields',
    userMiddleware,
    checkPermission('manage:integrations'),
    validateFieldMapping,
    updateQuickBooksFieldMappings
);

// Get account mappings (chart of accounts mapping)
router.get('/quickbooks/mappings/accounts',
    userMiddleware,
    checkPermission('manage:integrations'),
    getQuickBooksAccountMappings
);

// Update account mappings
router.put('/quickbooks/mappings/accounts',
    userMiddleware,
    checkPermission('manage:integrations'),
    validateAccountMapping,
    updateQuickBooksAccountMappings
);

/**
 * QuickBooks Conflict Resolution Routes
 * Handles data conflicts during synchronization
 */

// Get all unresolved conflicts
router.get('/quickbooks/conflicts',
    userMiddleware,
    checkPermission('manage:integrations'),
    getQuickBooksConflicts
);

// Resolve a single conflict
router.post('/quickbooks/conflicts/:conflictId/resolve',
    userMiddleware,
    checkPermission('manage:integrations'),
    validateConflictResolution,
    resolveQuickBooksConflict
);

// Bulk resolve conflicts
router.post('/quickbooks/conflicts/bulk-resolve',
    userMiddleware,
    checkPermission('manage:integrations'),
    validateConflictResolution,
    bulkResolveQuickBooksConflicts
);

// ============================================================================
// XERO ROUTES
// ============================================================================

/**
 * Xero Authentication Routes
 * Handles OAuth 2.0 flow for Xero integration
 */

// Initiate Xero OAuth flow
router.get('/xero/auth',
    userMiddleware,
    checkPermission('manage:integrations'),
    oauthRateLimiter,
    initiateXeroAuth
);

// Xero OAuth callback (no auth middleware - OAuth provider calls this)
router.get('/xero/callback',
    oauthRateLimiter,
    handleXeroCallback
);

// Disconnect Xero integration
router.post('/xero/disconnect',
    userMiddleware,
    checkPermission('manage:integrations'),
    disconnectXero
);

// Get Xero connection status
router.get('/xero/status',
    userMiddleware,
    checkPermission('manage:integrations'),
    getXeroStatus
);

// Manually refresh Xero access token
router.post('/xero/refresh-token',
    userMiddleware,
    checkPermission('manage:integrations'),
    refreshXeroToken
);

/**
 * Xero Sync Routes
 * Handles data synchronization between system and Xero
 */

// Sync all data from Xero
router.post('/xero/sync/all',
    userMiddleware,
    checkPermission('manage:integrations'),
    syncRateLimiter,
    validateSyncParams,
    syncAllXeroData
);

// Sync invoices from Xero
router.post('/xero/sync/invoices',
    userMiddleware,
    checkPermission('manage:integrations'),
    syncRateLimiter,
    validateSyncParams,
    syncXeroInvoices
);

// Sync contacts from Xero
router.post('/xero/sync/contacts',
    userMiddleware,
    checkPermission('manage:integrations'),
    syncRateLimiter,
    validateSyncParams,
    syncXeroContacts
);

// Sync chart of accounts from Xero
router.post('/xero/sync/accounts',
    userMiddleware,
    checkPermission('manage:integrations'),
    syncRateLimiter,
    validateSyncParams,
    syncXeroAccounts
);

// Sync payments from Xero
router.post('/xero/sync/payments',
    userMiddleware,
    checkPermission('manage:integrations'),
    syncRateLimiter,
    validateSyncParams,
    syncXeroPayments
);

// Sync expenses from Xero
router.post('/xero/sync/expenses',
    userMiddleware,
    checkPermission('manage:integrations'),
    syncRateLimiter,
    validateSyncParams,
    syncXeroExpenses
);

// Get Xero sync history
router.get('/xero/sync/history',
    userMiddleware,
    checkPermission('manage:integrations'),
    getXeroSyncHistory
);

/**
 * Xero Webhook Routes
 * Handles real-time updates from Xero via webhooks
 */

// Xero webhook endpoint (unauthenticated - Xero calls this)
// Xero signs webhook payloads with a key that we verify in the controller
router.post('/xero/webhook',
    webhookRateLimiter,
    handleXeroWebhook
);

// Get webhook status and configuration (authenticated)
router.get('/xero/webhook/status',
    userMiddleware,
    checkPermission('manage:integrations'),
    getXeroWebhookStatus
);

// ============================================================================
// DISCORD ROUTES
// ============================================================================

/**
 * Discord Integration Routes
 * Handles Discord bot integration for case notifications and updates
 */

// Get Discord OAuth authorization URL
router.get('/discord/auth-url',
    userMiddleware,
    checkPermission('manage:integrations'),
    oauthRateLimiter,
    getDiscordAuthUrl
);

// Discord OAuth callback (no auth middleware - OAuth provider calls this)
router.get('/discord/callback',
    oauthRateLimiter,
    handleDiscordCallback
);

// Complete Discord integration setup
router.post('/discord/complete-setup',
    userMiddleware,
    checkPermission('manage:integrations'),
    completeDiscordSetup
);

// Get Discord connection status
router.get('/discord/status',
    userMiddleware,
    checkPermission('manage:integrations'),
    getDiscordStatus
);

// Disconnect Discord integration
router.post('/discord/disconnect',
    userMiddleware,
    checkPermission('manage:integrations'),
    disconnectDiscord
);

// Test Discord connection
router.post('/discord/test',
    userMiddleware,
    checkPermission('manage:integrations'),
    testDiscordConnection
);

// List user's Discord servers
router.get('/discord/guilds',
    userMiddleware,
    checkPermission('manage:integrations'),
    listDiscordGuilds
);

// List channels in a Discord server
router.get('/discord/guilds/:guildId/channels',
    userMiddleware,
    checkPermission('manage:integrations'),
    listDiscordChannels
);

// Update Discord notification settings
router.put('/discord/settings',
    userMiddleware,
    checkPermission('manage:integrations'),
    updateDiscordSettings
);

// Send custom message to Discord
router.post('/discord/message',
    userMiddleware,
    checkPermission('manage:integrations'),
    sendDiscordMessage
);

// Incoming Discord webhook (unauthenticated - Discord calls this)
router.post('/discord/webhook',
    webhookRateLimiter,
    handleDiscordWebhook
);

module.exports = router;
