/**
 * Xero Sync Controller
 *
 * Handles Xero integration endpoints including:
 * - OAuth authentication flow
 * - Connection management
 * - Data synchronization (accounts, contacts, invoices, payments, bills, bank transactions)
 * - Webhook handling
 * - Sync status monitoring
 *
 * All operations are scoped to the authenticated user's firm.
 */

const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const xeroService = require('../services/xero.service');
const logger = require('../utils/logger');
const auditLogService = require('../services/auditLog.service');

// ═══════════════════════════════════════════════════════════════
// OAUTH & CONNECTION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Get OAuth authorization URL
 * GET /api/integrations/xero/auth-url
 */
const getAuthUrl = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('Firm ID is required for Xero integration', 400);
    }

    // Check if Xero is configured
    if (!xeroService.isConfigured()) {
        throw CustomException('Xero integration is not configured. Please contact system administrator.', 503);
    }

    try {
        const { authUrl, state } = await xeroService.getAuthUrl(firmId);

        // Log activity
        await auditLogService.log({
            userId,
            firmId,
            action: 'xero_auth_initiated',
            resource: 'XeroIntegration',
            details: { firmId },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        logger.info('Xero OAuth URL generated', { firmId, userId });

        return res.json({
            success: true,
            data: {
                authUrl,
                state
            },
            message: 'Authorization URL generated successfully'
        });
    } catch (error) {
        logger.error('Failed to generate Xero auth URL', {
            firmId,
            userId,
            error: error.message
        });
        throw CustomException(`Failed to generate authorization URL: ${error.message}`, 500);
    }
});

/**
 * Handle OAuth callback
 * GET /api/integrations/xero/callback
 */
const handleCallback = asyncHandler(async (req, res) => {
    const { code, state } = req.query;

    if (!code || !state) {
        throw CustomException('Missing authorization code or state', 400);
    }

    try {
        const result = await xeroService.handleCallback(code, state);

        logger.info('Xero OAuth callback handled successfully', {
            tenantId: result.tenantId,
            tenantName: result.tenantName
        });

        // Redirect to frontend success page
        const redirectUrl = `${process.env.FRONTEND_URL || process.env.CLIENT_URL}/integrations/xero/success?tenant=${encodeURIComponent(result.tenantName)}`;
        return res.redirect(redirectUrl);
    } catch (error) {
        logger.error('Xero OAuth callback failed', {
            error: error.message
        });

        // Redirect to frontend error page
        const redirectUrl = `${process.env.FRONTEND_URL || process.env.CLIENT_URL}/integrations/xero/error?message=${encodeURIComponent(error.message)}`;
        return res.redirect(redirectUrl);
    }
});

/**
 * Disconnect Xero integration
 * POST /api/integrations/xero/disconnect
 */
const disconnect = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    try {
        await xeroService.disconnect(firmId);

        // Log activity
        await auditLogService.log({
            userId,
            firmId,
            action: 'xero_disconnected',
            resource: 'XeroIntegration',
            details: { firmId },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        logger.info('Xero disconnected', { firmId, userId });

        return res.json({
            success: true,
            message: 'Xero integration disconnected successfully',
            message_ar: 'تم فصل ربط Xero بنجاح'
        });
    } catch (error) {
        logger.error('Failed to disconnect Xero', {
            firmId,
            userId,
            error: error.message
        });
        throw CustomException(`Failed to disconnect Xero: ${error.message}`, 500);
    }
});

/**
 * Get Xero connection status
 * GET /api/integrations/xero/status
 */
const getStatus = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    try {
        const status = await xeroService.getConnectionStatus(firmId);

        return res.json({
            success: true,
            data: status
        });
    } catch (error) {
        logger.error('Failed to get Xero status', {
            firmId,
            error: error.message
        });
        throw CustomException(`Failed to get connection status: ${error.message}`, 500);
    }
});

/**
 * Get connected Xero organizations/tenants
 * GET /api/integrations/xero/tenants
 */
const getTenants = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    try {
        const tenants = await xeroService.getTenants(firmId);

        return res.json({
            success: true,
            data: tenants,
            count: tenants.length
        });
    } catch (error) {
        logger.error('Failed to get Xero tenants', {
            firmId,
            error: error.message
        });

        // Handle token expiration
        if (error.message.includes('expired')) {
            return res.status(401).json({
                success: false,
                error: 'Token expired',
                message: 'Your Xero connection has expired. Please reconnect.',
                requiresReauth: true
            });
        }

        throw CustomException(`Failed to get tenants: ${error.message}`, 500);
    }
});

// ═══════════════════════════════════════════════════════════════
// DATA SYNCHRONIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Sync Chart of Accounts
 * POST /api/integrations/xero/sync/accounts
 */
const syncChartOfAccounts = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;
    const { direction = 'from_xero' } = req.body;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    try {
        const result = await xeroService.syncChartOfAccounts(firmId, direction);

        // Log activity
        await auditLogService.log({
            userId,
            firmId,
            action: 'xero_sync_accounts',
            resource: 'XeroIntegration',
            details: {
                firmId,
                direction,
                imported: result.imported,
                exported: result.exported,
                errors: result.errors.length
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        logger.info('Chart of Accounts synced', {
            firmId,
            userId,
            result
        });

        return res.json({
            success: true,
            data: result,
            message: 'Chart of Accounts synchronized successfully',
            message_ar: 'تم مزامنة دليل الحسابات بنجاح'
        });
    } catch (error) {
        logger.error('Failed to sync Chart of Accounts', {
            firmId,
            userId,
            error: error.message
        });
        throw CustomException(`Failed to sync Chart of Accounts: ${error.message}`, 500);
    }
});

/**
 * Sync Contacts (Customers/Vendors)
 * POST /api/integrations/xero/sync/contacts
 */
const syncContacts = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;
    const { direction = 'bidirectional' } = req.body;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    try {
        const result = await xeroService.syncContacts(firmId, direction);

        // Log activity
        await auditLogService.log({
            userId,
            firmId,
            action: 'xero_sync_contacts',
            resource: 'XeroIntegration',
            details: {
                firmId,
                direction,
                imported: result.imported,
                exported: result.exported,
                errors: result.errors.length
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        logger.info('Contacts synced', {
            firmId,
            userId,
            result
        });

        return res.json({
            success: true,
            data: result,
            message: 'Contacts synchronized successfully',
            message_ar: 'تم مزامنة جهات الاتصال بنجاح'
        });
    } catch (error) {
        logger.error('Failed to sync contacts', {
            firmId,
            userId,
            error: error.message
        });
        throw CustomException(`Failed to sync contacts: ${error.message}`, 500);
    }
});

/**
 * Sync Invoices
 * POST /api/integrations/xero/sync/invoices
 */
const syncInvoices = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;
    const { lastSyncDate } = req.body;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    try {
        const parsedDate = lastSyncDate ? new Date(lastSyncDate) : null;
        const result = await xeroService.syncInvoices(firmId, parsedDate);

        // Log activity
        await auditLogService.log({
            userId,
            firmId,
            action: 'xero_sync_invoices',
            resource: 'XeroIntegration',
            details: {
                firmId,
                imported: result.imported,
                exported: result.exported,
                updated: result.updated,
                errors: result.errors.length,
                lastSyncDate: parsedDate
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        logger.info('Invoices synced', {
            firmId,
            userId,
            result
        });

        return res.json({
            success: true,
            data: result,
            message: 'Invoices synchronized successfully',
            message_ar: 'تم مزامنة الفواتير بنجاح'
        });
    } catch (error) {
        logger.error('Failed to sync invoices', {
            firmId,
            userId,
            error: error.message
        });
        throw CustomException(`Failed to sync invoices: ${error.message}`, 500);
    }
});

/**
 * Sync Payments
 * POST /api/integrations/xero/sync/payments
 */
const syncPayments = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;
    const { lastSyncDate } = req.body;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    try {
        const parsedDate = lastSyncDate ? new Date(lastSyncDate) : null;
        const result = await xeroService.syncPayments(firmId, parsedDate);

        // Log activity
        await auditLogService.log({
            userId,
            firmId,
            action: 'xero_sync_payments',
            resource: 'XeroIntegration',
            details: {
                firmId,
                imported: result.imported,
                errors: result.errors.length,
                lastSyncDate: parsedDate
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        logger.info('Payments synced', {
            firmId,
            userId,
            result
        });

        return res.json({
            success: true,
            data: result,
            message: 'Payments synchronized successfully',
            message_ar: 'تم مزامنة المدفوعات بنجاح'
        });
    } catch (error) {
        logger.error('Failed to sync payments', {
            firmId,
            userId,
            error: error.message
        });
        throw CustomException(`Failed to sync payments: ${error.message}`, 500);
    }
});

/**
 * Sync Bills
 * POST /api/integrations/xero/sync/bills
 */
const syncBills = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;
    const { lastSyncDate } = req.body;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    try {
        const parsedDate = lastSyncDate ? new Date(lastSyncDate) : null;
        const result = await xeroService.syncBills(firmId, parsedDate);

        // Log activity
        await auditLogService.log({
            userId,
            firmId,
            action: 'xero_sync_bills',
            resource: 'XeroIntegration',
            details: {
                firmId,
                imported: result.imported,
                errors: result.errors.length,
                lastSyncDate: parsedDate
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        logger.info('Bills synced', {
            firmId,
            userId,
            result
        });

        return res.json({
            success: true,
            data: result,
            message: 'Bills synchronized successfully',
            message_ar: 'تم مزامنة الفواتير الواردة بنجاح'
        });
    } catch (error) {
        logger.error('Failed to sync bills', {
            firmId,
            userId,
            error: error.message
        });
        throw CustomException(`Failed to sync bills: ${error.message}`, 500);
    }
});

/**
 * Sync Bank Transactions
 * POST /api/integrations/xero/sync/bank-transactions
 */
const syncBankTransactions = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;
    const { lastSyncDate } = req.body;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    try {
        const parsedDate = lastSyncDate ? new Date(lastSyncDate) : null;
        const result = await xeroService.syncBankTransactions(firmId, parsedDate);

        // Log activity
        await auditLogService.log({
            userId,
            firmId,
            action: 'xero_sync_bank_transactions',
            resource: 'XeroIntegration',
            details: {
                firmId,
                imported: result.imported,
                errors: result.errors.length,
                lastSyncDate: parsedDate
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        logger.info('Bank transactions synced', {
            firmId,
            userId,
            result
        });

        return res.json({
            success: true,
            data: result,
            message: 'Bank transactions synchronized successfully',
            message_ar: 'تم مزامنة المعاملات البنكية بنجاح'
        });
    } catch (error) {
        logger.error('Failed to sync bank transactions', {
            firmId,
            userId,
            error: error.message
        });
        throw CustomException(`Failed to sync bank transactions: ${error.message}`, 500);
    }
});

/**
 * Full sync - Sync all data types
 * POST /api/integrations/xero/sync/all
 */
const syncAll = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;
    const { lastSyncDate } = req.body;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    try {
        const parsedDate = lastSyncDate ? new Date(lastSyncDate) : null;

        // Run all syncs in parallel
        const results = await Promise.allSettled([
            xeroService.syncChartOfAccounts(firmId, 'from_xero'),
            xeroService.syncContacts(firmId, 'bidirectional'),
            xeroService.syncInvoices(firmId, parsedDate),
            xeroService.syncPayments(firmId, parsedDate),
            xeroService.syncBills(firmId, parsedDate),
            xeroService.syncBankTransactions(firmId, parsedDate)
        ]);

        // Process results
        const syncResults = {
            chartOfAccounts: results[0].status === 'fulfilled' ? results[0].value : { errors: [results[0].reason?.message] },
            contacts: results[1].status === 'fulfilled' ? results[1].value : { errors: [results[1].reason?.message] },
            invoices: results[2].status === 'fulfilled' ? results[2].value : { errors: [results[2].reason?.message] },
            payments: results[3].status === 'fulfilled' ? results[3].value : { errors: [results[3].reason?.message] },
            bills: results[4].status === 'fulfilled' ? results[4].value : { errors: [results[4].reason?.message] },
            bankTransactions: results[5].status === 'fulfilled' ? results[5].value : { errors: [results[5].reason?.message] }
        };

        const totalImported = Object.values(syncResults).reduce((sum, r) => sum + (r.imported || 0), 0);
        const totalExported = Object.values(syncResults).reduce((sum, r) => sum + (r.exported || 0), 0);
        const totalErrors = Object.values(syncResults).reduce((sum, r) => sum + (r.errors?.length || 0), 0);

        // Log activity
        await auditLogService.log({
            userId,
            firmId,
            action: 'xero_sync_all',
            resource: 'XeroIntegration',
            details: {
                firmId,
                totalImported,
                totalExported,
                totalErrors,
                lastSyncDate: parsedDate
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        logger.info('Full Xero sync completed', {
            firmId,
            userId,
            totalImported,
            totalExported,
            totalErrors
        });

        return res.json({
            success: totalErrors === 0,
            data: {
                results: syncResults,
                summary: {
                    totalImported,
                    totalExported,
                    totalErrors,
                    completedAt: new Date()
                }
            },
            message: totalErrors === 0
                ? 'All data synchronized successfully'
                : `Sync completed with ${totalErrors} error(s)`,
            message_ar: totalErrors === 0
                ? 'تم مزامنة جميع البيانات بنجاح'
                : `اكتملت المزامنة مع ${totalErrors} خطأ`
        });
    } catch (error) {
        logger.error('Failed to perform full sync', {
            firmId,
            userId,
            error: error.message
        });
        throw CustomException(`Failed to perform full sync: ${error.message}`, 500);
    }
});

// ═══════════════════════════════════════════════════════════════
// SYNC STATUS & MONITORING
// ═══════════════════════════════════════════════════════════════

/**
 * Get sync status
 * GET /api/integrations/xero/sync/status
 */
const getSyncStatus = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    try {
        const status = await xeroService.getSyncStatus(firmId);

        return res.json({
            success: true,
            data: status
        });
    } catch (error) {
        logger.error('Failed to get sync status', {
            firmId,
            error: error.message
        });
        throw CustomException(`Failed to get sync status: ${error.message}`, 500);
    }
});

/**
 * Get sync errors
 * GET /api/integrations/xero/sync/errors
 */
const getSyncErrors = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { limit = 50, offset = 0 } = req.query;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    try {
        // TODO: Implement error tracking in database
        // For now, return empty array as placeholder
        const errors = [];

        return res.json({
            success: true,
            data: errors,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: errors.length
            }
        });
    } catch (error) {
        logger.error('Failed to get sync errors', {
            firmId,
            error: error.message
        });
        throw CustomException(`Failed to get sync errors: ${error.message}`, 500);
    }
});

// ═══════════════════════════════════════════════════════════════
// WEBHOOK HANDLING
// ═══════════════════════════════════════════════════════════════

/**
 * Handle Xero webhook
 * POST /api/integrations/xero/webhook
 */
const handleWebhook = asyncHandler(async (req, res) => {
    const signature = req.headers['x-xero-signature'];
    const payload = req.body;

    // Extract firm ID from webhook payload or query params
    // Note: In production, you'd need to map tenantId to firmId
    const firmId = req.query.firmId || req.body.firmId;

    if (!firmId) {
        logger.warn('Webhook received without firm ID', {
            tenantId: payload?.events?.[0]?.tenantId
        });
        // Return 200 to acknowledge receipt even if we can't process
        return res.json({ received: true });
    }

    if (!signature) {
        logger.warn('Webhook received without signature', { firmId });
        throw CustomException('Missing webhook signature', 401);
    }

    try {
        const result = await xeroService.handleWebhook(payload, signature, firmId);

        logger.info('Xero webhook processed', {
            firmId,
            processed: result.processed,
            eventsCount: payload.events?.length || 0
        });

        // Xero expects a 200 OK response
        return res.json({
            success: true,
            received: true,
            processed: result.processed
        });
    } catch (error) {
        logger.error('Failed to process Xero webhook', {
            firmId,
            error: error.message,
            signature: signature?.substring(0, 10) + '...'
        });

        // For security reasons, return 401 for signature failures
        if (error.message.includes('signature')) {
            return res.status(401).json({
                success: false,
                error: 'Invalid signature'
            });
        }

        // For other errors, acknowledge receipt but log the error
        return res.json({
            received: true,
            processed: false,
            error: error.message
        });
    }
});

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // OAuth & Connection
    getAuthUrl,
    handleCallback,
    disconnect,
    getStatus,
    getTenants,

    // Data Sync
    syncChartOfAccounts,
    syncContacts,
    syncInvoices,
    syncPayments,
    syncBills,
    syncBankTransactions,
    syncAll,

    // Status & Monitoring
    getSyncStatus,
    getSyncErrors,

    // Webhooks
    handleWebhook
};
