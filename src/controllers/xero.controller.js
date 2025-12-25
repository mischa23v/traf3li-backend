/**
 * Xero Integration Controller
 *
 * Handles Xero OAuth authentication, data synchronization,
 * and webhook processing.
 */

const logger = require('../utils/logger');
const xeroService = require('../services/xero.service');

// ============================================================================
// AUTHENTICATION HANDLERS
// ============================================================================

/**
 * Initiate Xero OAuth flow
 * Redirects user to Xero authorization page
 */
const initiateXeroAuth = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        const { authUrl, state } = await xeroService.getAuthUrl(firmId);

        return res.status(200).json({
            success: true,
            data: {
                authUrl,
                state
            },
            message: 'تم إنشاء رابط المصادقة بنجاح',
            message_en: 'Auth URL generated successfully'
        });
    } catch (error) {
        logger.error('Error initiating Xero auth:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل بدء مصادقة Xero',
            error_en: error.message_en || 'Failed to initiate Xero authentication'
        });
    }
};

/**
 * Handle Xero OAuth callback
 * Exchanges authorization code for access token
 */
const handleXeroCallback = async (req, res) => {
    try {
        const { code, state } = req.query;

        if (!code || !state) {
            return res.status(400).json({
                success: false,
                error: 'معلمات OAuth المطلوبة مفقودة',
                error_en: 'Missing required OAuth parameters'
            });
        }

        const result = await xeroService.handleCallback(code, state);

        // Redirect to frontend success page
        const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/integrations/xero/success`;
        return res.redirect(redirectUrl);
    } catch (error) {
        logger.error('Error handling Xero callback:', error);

        // Redirect to frontend error page
        const errorUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/integrations/xero/error?message=${encodeURIComponent(error.message)}`;
        return res.redirect(errorUrl);
    }
};

/**
 * Disconnect Xero integration
 */
const disconnectXero = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        await xeroService.disconnect(firmId);

        return res.status(200).json({
            success: true,
            message: 'تم فصل Xero بنجاح',
            message_en: 'Xero disconnected successfully'
        });
    } catch (error) {
        logger.error('Error disconnecting Xero:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل فصل Xero',
            error_en: error.message_en || 'Failed to disconnect Xero'
        });
    }
};

/**
 * Get Xero connection status
 */
const getXeroStatus = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        const status = await xeroService.getConnectionStatus(firmId);

        return res.status(200).json({
            success: true,
            data: status
        });
    } catch (error) {
        logger.error('Error getting Xero status:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل الحصول على حالة Xero',
            error_en: error.message_en || 'Failed to get Xero status'
        });
    }
};

/**
 * Manually refresh Xero access token
 */
const refreshXeroToken = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        const result = await xeroService.refreshToken(firmId);

        return res.status(200).json({
            success: true,
            data: result,
            message: 'تم تحديث رمز Xero بنجاح',
            message_en: 'Xero token refreshed successfully'
        });
    } catch (error) {
        logger.error('Error refreshing Xero token:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل تحديث رمز Xero',
            error_en: error.message_en || 'Failed to refresh Xero token'
        });
    }
};

// ============================================================================
// SYNC HANDLERS
// ============================================================================

const syncXeroInvoices = async (req, res) => {
    try {
        const firmId = req.firmId;
        const { lastSyncDate } = req.body;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        const result = await xeroService.syncInvoices(firmId, lastSyncDate);

        return res.status(200).json({
            success: true,
            data: result,
            message: 'تمت مزامنة الفواتير بنجاح',
            message_en: 'Invoices synced successfully'
        });
    } catch (error) {
        logger.error('Error syncing Xero invoices:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل مزامنة فواتير Xero',
            error_en: error.message_en || 'Failed to sync Xero invoices'
        });
    }
};

const syncXeroContacts = async (req, res) => {
    try {
        const firmId = req.firmId;
        const { direction } = req.body;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        const result = await xeroService.syncContacts(firmId, direction);

        return res.status(200).json({
            success: true,
            data: result,
            message: 'تمت مزامنة جهات الاتصال بنجاح',
            message_en: 'Contacts synced successfully'
        });
    } catch (error) {
        logger.error('Error syncing Xero contacts:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل مزامنة جهات اتصال Xero',
            error_en: error.message_en || 'Failed to sync Xero contacts'
        });
    }
};

const syncXeroAccounts = async (req, res) => {
    try {
        const firmId = req.firmId;
        const { direction } = req.body;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        const result = await xeroService.syncChartOfAccounts(firmId, direction);

        return res.status(200).json({
            success: true,
            data: result,
            message: 'تمت مزامنة الحسابات بنجاح',
            message_en: 'Accounts synced successfully'
        });
    } catch (error) {
        logger.error('Error syncing Xero accounts:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل مزامنة حسابات Xero',
            error_en: error.message_en || 'Failed to sync Xero accounts'
        });
    }
};

const syncXeroPayments = async (req, res) => {
    try {
        const firmId = req.firmId;
        const { lastSyncDate } = req.body;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        const result = await xeroService.syncPayments(firmId, lastSyncDate);

        return res.status(200).json({
            success: true,
            data: result,
            message: 'تمت مزامنة المدفوعات بنجاح',
            message_en: 'Payments synced successfully'
        });
    } catch (error) {
        logger.error('Error syncing Xero payments:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل مزامنة مدفوعات Xero',
            error_en: error.message_en || 'Failed to sync Xero payments'
        });
    }
};

const syncXeroExpenses = async (req, res) => {
    try {
        const firmId = req.firmId;
        const { lastSyncDate } = req.body;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        const result = await xeroService.syncBills(firmId, lastSyncDate);

        return res.status(200).json({
            success: true,
            data: result,
            message: 'تمت مزامنة المصروفات بنجاح',
            message_en: 'Expenses synced successfully'
        });
    } catch (error) {
        logger.error('Error syncing Xero expenses:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل مزامنة مصروفات Xero',
            error_en: error.message_en || 'Failed to sync Xero expenses'
        });
    }
};

const syncAllXeroData = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        // Perform all syncs in parallel
        const results = await Promise.allSettled([
            xeroService.syncChartOfAccounts(firmId),
            xeroService.syncContacts(firmId),
            xeroService.syncInvoices(firmId),
            xeroService.syncPayments(firmId),
            xeroService.syncBills(firmId),
            xeroService.syncBankTransactions(firmId)
        ]);

        const syncResults = {
            accounts: results[0].status === 'fulfilled' ? results[0].value : { error: results[0].reason?.message },
            contacts: results[1].status === 'fulfilled' ? results[1].value : { error: results[1].reason?.message },
            invoices: results[2].status === 'fulfilled' ? results[2].value : { error: results[2].reason?.message },
            payments: results[3].status === 'fulfilled' ? results[3].value : { error: results[3].reason?.message },
            bills: results[4].status === 'fulfilled' ? results[4].value : { error: results[4].reason?.message },
            bankTransactions: results[5].status === 'fulfilled' ? results[5].value : { error: results[5].reason?.message }
        };

        return res.status(200).json({
            success: true,
            data: syncResults,
            message: 'تمت المزامنة الكاملة بنجاح',
            message_en: 'Full sync completed successfully'
        });
    } catch (error) {
        logger.error('Error syncing all Xero data:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل المزامنة الكاملة لـ Xero',
            error_en: error.message_en || 'Failed to sync all Xero data'
        });
    }
};

const getXeroSyncHistory = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        const syncStatus = await xeroService.getSyncStatus(firmId);

        return res.status(200).json({
            success: true,
            data: syncStatus
        });
    } catch (error) {
        logger.error('Error getting Xero sync history:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل الحصول على سجل مزامنة Xero',
            error_en: error.message_en || 'Failed to get Xero sync history'
        });
    }
};

// ============================================================================
// WEBHOOK HANDLERS
// ============================================================================

/**
 * Handle Xero webhook events
 * Called by Xero when data changes in their system
 */
const handleXeroWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-xero-signature'];
        const payload = req.body;

        if (!signature) {
            logger.warn('Xero webhook received without signature');
            return res.status(401).json({
                success: false,
                error: 'Missing webhook signature'
            });
        }

        // Extract firmId from webhook payload or headers
        // Note: The firmId may need to be determined from the tenant ID in the webhook
        const events = payload.events || [];

        // Process webhook asynchronously
        // Return 200 immediately to Xero, then process in background
        res.status(200).json({ success: true });

        // Process events in background
        for (const event of events) {
            try {
                const { tenantId } = event;

                // Find firm by tenantId
                const Firm = require('../models/firm.model');
                const firm = await Firm.findOne({
                    'integrations.xero.tenantId': tenantId
                });

                if (!firm) {
                    logger.warn('Received webhook for unknown tenant', { tenantId });
                    continue;
                }

                await xeroService.handleWebhook(payload, signature, firm._id);
            } catch (error) {
                logger.error('Error processing Xero webhook event:', {
                    error: error.message,
                    event
                });
            }
        }
    } catch (error) {
        logger.error('Error handling Xero webhook:', error);
        // Still return 200 to prevent Xero from retrying
        return res.status(200).json({
            success: false,
            error: 'Webhook processing failed but acknowledged'
        });
    }
};

/**
 * Get Xero webhook status and configuration
 */
const getXeroWebhookStatus = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        const Firm = require('../models/firm.model');
        const firm = await Firm.findById(firmId).select('integrations.xero.webhookConfig');

        const webhookConfig = firm?.integrations?.xero?.webhookConfig || {
            enabled: false,
            lastReceivedAt: null,
            eventsProcessed: 0
        };

        return res.status(200).json({
            success: true,
            data: webhookConfig
        });
    } catch (error) {
        logger.error('Error getting Xero webhook status:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل الحصول على حالة Xero webhook',
            error_en: error.message_en || 'Failed to get Xero webhook status'
        });
    }
};

module.exports = {
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
};
