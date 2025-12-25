/**
 * QuickBooks Integration Controller
 *
 * Handles QuickBooks OAuth authentication, data synchronization,
 * field mapping, and conflict resolution.
 */

const logger = require('../utils/logger');
const quickbooksService = require('../services/quickbooks.service');

// ============================================================================
// AUTHENTICATION HANDLERS
// ============================================================================

/**
 * Initiate QuickBooks OAuth flow
 * Redirects user to QuickBooks authorization page
 */
const initiateQuickBooksAuth = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        const authUrl = await quickbooksService.getAuthUrl(firmId);

        return res.status(200).json({
            success: true,
            data: {
                authUrl
            },
            message: 'تم إنشاء رابط المصادقة بنجاح',
            message_en: 'Auth URL generated successfully'
        });
    } catch (error) {
        logger.error('Error initiating QuickBooks auth:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل بدء مصادقة QuickBooks',
            error_en: error.message_en || 'Failed to initiate QuickBooks authentication'
        });
    }
};

/**
 * Handle QuickBooks OAuth callback
 * Exchanges authorization code for access token
 */
const handleQuickBooksCallback = async (req, res) => {
    try {
        const { code, state, realmId } = req.query;

        if (!code || !state || !realmId) {
            return res.status(400).json({
                success: false,
                error: 'معلمات OAuth المطلوبة مفقودة',
                error_en: 'Missing required OAuth parameters'
            });
        }

        const result = await quickbooksService.handleCallback(code, realmId, state);

        // Redirect to frontend success page
        const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/integrations/quickbooks/success`;
        return res.redirect(redirectUrl);
    } catch (error) {
        logger.error('Error handling QuickBooks callback:', error);

        // Redirect to frontend error page
        const errorUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/integrations/quickbooks/error?message=${encodeURIComponent(error.message)}`;
        return res.redirect(errorUrl);
    }
};

/**
 * Disconnect QuickBooks integration
 */
const disconnectQuickBooks = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        await quickbooksService.disconnect(firmId);

        return res.status(200).json({
            success: true,
            message: 'تم فصل QuickBooks بنجاح',
            message_en: 'QuickBooks disconnected successfully'
        });
    } catch (error) {
        logger.error('Error disconnecting QuickBooks:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل فصل QuickBooks',
            error_en: error.message_en || 'Failed to disconnect QuickBooks'
        });
    }
};

/**
 * Get QuickBooks connection status
 */
const getQuickBooksStatus = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        const status = await quickbooksService.getConnectionStatus(firmId);

        return res.status(200).json({
            success: true,
            data: status
        });
    } catch (error) {
        logger.error('Error getting QuickBooks status:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل الحصول على حالة QuickBooks',
            error_en: error.message_en || 'Failed to get QuickBooks status'
        });
    }
};

/**
 * Manually refresh QuickBooks access token
 */
const refreshQuickBooksToken = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        const result = await quickbooksService.refreshToken(firmId);

        return res.status(200).json({
            success: true,
            data: result,
            message: 'تم تحديث رمز QuickBooks بنجاح',
            message_en: 'QuickBooks token refreshed successfully'
        });
    } catch (error) {
        logger.error('Error refreshing QuickBooks token:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل تحديث رمز QuickBooks',
            error_en: error.message_en || 'Failed to refresh QuickBooks token'
        });
    }
};

// ============================================================================
// SYNC HANDLERS
// ============================================================================

const syncQuickBooksInvoices = async (req, res) => {
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

        const result = await quickbooksService.syncInvoices(firmId, lastSyncDate);

        return res.status(200).json({
            success: true,
            data: result,
            message: 'تمت مزامنة الفواتير بنجاح',
            message_en: 'Invoices synced successfully'
        });
    } catch (error) {
        logger.error('Error syncing QuickBooks invoices:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل مزامنة فواتير QuickBooks',
            error_en: error.message_en || 'Failed to sync QuickBooks invoices'
        });
    }
};

const syncQuickBooksCustomers = async (req, res) => {
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

        const result = await quickbooksService.syncCustomers(firmId, direction);

        return res.status(200).json({
            success: true,
            data: result,
            message: 'تمت مزامنة العملاء بنجاح',
            message_en: 'Customers synced successfully'
        });
    } catch (error) {
        logger.error('Error syncing QuickBooks customers:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل مزامنة عملاء QuickBooks',
            error_en: error.message_en || 'Failed to sync QuickBooks customers'
        });
    }
};

const syncQuickBooksVendors = async (req, res) => {
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

        const result = await quickbooksService.syncVendors(firmId, direction);

        return res.status(200).json({
            success: true,
            data: result,
            message: 'تمت مزامنة الموردين بنجاح',
            message_en: 'Vendors synced successfully'
        });
    } catch (error) {
        logger.error('Error syncing QuickBooks vendors:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل مزامنة موردين QuickBooks',
            error_en: error.message_en || 'Failed to sync QuickBooks vendors'
        });
    }
};

const syncQuickBooksAccounts = async (req, res) => {
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

        const result = await quickbooksService.syncChartOfAccounts(firmId, direction);

        return res.status(200).json({
            success: true,
            data: result,
            message: 'تمت مزامنة الحسابات بنجاح',
            message_en: 'Accounts synced successfully'
        });
    } catch (error) {
        logger.error('Error syncing QuickBooks accounts:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل مزامنة حسابات QuickBooks',
            error_en: error.message_en || 'Failed to sync QuickBooks accounts'
        });
    }
};

const syncQuickBooksPayments = async (req, res) => {
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

        const result = await quickbooksService.syncPayments(firmId, lastSyncDate);

        return res.status(200).json({
            success: true,
            data: result,
            message: 'تمت مزامنة المدفوعات بنجاح',
            message_en: 'Payments synced successfully'
        });
    } catch (error) {
        logger.error('Error syncing QuickBooks payments:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل مزامنة مدفوعات QuickBooks',
            error_en: error.message_en || 'Failed to sync QuickBooks payments'
        });
    }
};

const syncQuickBooksExpenses = async (req, res) => {
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

        const result = await quickbooksService.syncBills(firmId, lastSyncDate);

        return res.status(200).json({
            success: true,
            data: result,
            message: 'تمت مزامنة المصروفات بنجاح',
            message_en: 'Expenses synced successfully'
        });
    } catch (error) {
        logger.error('Error syncing QuickBooks expenses:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل مزامنة مصروفات QuickBooks',
            error_en: error.message_en || 'Failed to sync QuickBooks expenses'
        });
    }
};

const syncAllQuickBooksData = async (req, res) => {
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
            quickbooksService.syncChartOfAccounts(firmId),
            quickbooksService.syncCustomers(firmId),
            quickbooksService.syncVendors(firmId),
            quickbooksService.syncInvoices(firmId),
            quickbooksService.syncPayments(firmId),
            quickbooksService.syncBills(firmId)
        ]);

        const syncResults = {
            accounts: results[0].status === 'fulfilled' ? results[0].value : { error: results[0].reason?.message },
            customers: results[1].status === 'fulfilled' ? results[1].value : { error: results[1].reason?.message },
            vendors: results[2].status === 'fulfilled' ? results[2].value : { error: results[2].reason?.message },
            invoices: results[3].status === 'fulfilled' ? results[3].value : { error: results[3].reason?.message },
            payments: results[4].status === 'fulfilled' ? results[4].value : { error: results[4].reason?.message },
            bills: results[5].status === 'fulfilled' ? results[5].value : { error: results[5].reason?.message }
        };

        return res.status(200).json({
            success: true,
            data: syncResults,
            message: 'تمت المزامنة الكاملة بنجاح',
            message_en: 'Full sync completed successfully'
        });
    } catch (error) {
        logger.error('Error syncing all QuickBooks data:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل المزامنة الكاملة لـ QuickBooks',
            error_en: error.message_en || 'Failed to sync all QuickBooks data'
        });
    }
};

const getQuickBooksSyncHistory = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        const syncStatus = await quickbooksService.getSyncStatus(firmId);
        const syncErrors = await quickbooksService.getSyncErrors(firmId);

        return res.status(200).json({
            success: true,
            data: {
                ...syncStatus,
                errors: syncErrors
            }
        });
    } catch (error) {
        logger.error('Error getting QuickBooks sync history:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل الحصول على سجل مزامنة QuickBooks',
            error_en: error.message_en || 'Failed to get QuickBooks sync history'
        });
    }
};

// ============================================================================
// MAPPING HANDLERS
// ============================================================================

const getQuickBooksFieldMappings = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        // Field mappings are typically stored in firm settings
        const Firm = require('../models/firm.model');
        const firm = await Firm.findById(firmId).select('integrations.quickbooks.fieldMappings');

        return res.status(200).json({
            success: true,
            data: firm?.integrations?.quickbooks?.fieldMappings || {}
        });
    } catch (error) {
        logger.error('Error getting QuickBooks field mappings:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل الحصول على تعيينات حقول QuickBooks',
            error_en: error.message_en || 'Failed to get QuickBooks field mappings'
        });
    }
};

const updateQuickBooksFieldMappings = async (req, res) => {
    try {
        const firmId = req.firmId;
        const { mappings } = req.body;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        const Firm = require('../models/firm.model');
        await Firm.findByIdAndUpdate(firmId, {
            'integrations.quickbooks.fieldMappings': mappings
        });

        return res.status(200).json({
            success: true,
            message: 'تم تحديث تعيينات الحقول بنجاح',
            message_en: 'Field mappings updated successfully'
        });
    } catch (error) {
        logger.error('Error updating QuickBooks field mappings:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل تحديث تعيينات حقول QuickBooks',
            error_en: error.message_en || 'Failed to update QuickBooks field mappings'
        });
    }
};

const getQuickBooksAccountMappings = async (req, res) => {
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
        const firm = await Firm.findById(firmId).select('integrations.quickbooks.accountMappings');

        return res.status(200).json({
            success: true,
            data: firm?.integrations?.quickbooks?.accountMappings || {}
        });
    } catch (error) {
        logger.error('Error getting QuickBooks account mappings:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل الحصول على تعيينات حسابات QuickBooks',
            error_en: error.message_en || 'Failed to get QuickBooks account mappings'
        });
    }
};

const updateQuickBooksAccountMappings = async (req, res) => {
    try {
        const firmId = req.firmId;
        const { mappings } = req.body;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        const Firm = require('../models/firm.model');
        await Firm.findByIdAndUpdate(firmId, {
            'integrations.quickbooks.accountMappings': mappings
        });

        return res.status(200).json({
            success: true,
            message: 'تم تحديث تعيينات الحسابات بنجاح',
            message_en: 'Account mappings updated successfully'
        });
    } catch (error) {
        logger.error('Error updating QuickBooks account mappings:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل تحديث تعيينات حسابات QuickBooks',
            error_en: error.message_en || 'Failed to update QuickBooks account mappings'
        });
    }
};

// ============================================================================
// CONFLICT RESOLUTION HANDLERS
// ============================================================================

const getQuickBooksConflicts = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        const conflicts = await quickbooksService.getConflicts(firmId);

        return res.status(200).json({
            success: true,
            data: conflicts
        });
    } catch (error) {
        logger.error('Error getting QuickBooks conflicts:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل الحصول على تعارضات QuickBooks',
            error_en: error.message_en || 'Failed to get QuickBooks conflicts'
        });
    }
};

const resolveQuickBooksConflict = async (req, res) => {
    try {
        const firmId = req.firmId;
        const { conflictId } = req.params;
        const { resolution } = req.body;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        if (!resolution) {
            return res.status(400).json({
                success: false,
                error: 'استراتيجية الحل مطلوبة',
                error_en: 'Resolution strategy is required'
            });
        }

        const result = await quickbooksService.resolveConflict(firmId, conflictId, resolution);

        return res.status(200).json({
            success: true,
            data: result,
            message: 'تم حل التعارض بنجاح',
            message_en: 'Conflict resolved successfully'
        });
    } catch (error) {
        logger.error('Error resolving QuickBooks conflict:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل حل تعارض QuickBooks',
            error_en: error.message_en || 'Failed to resolve QuickBooks conflict'
        });
    }
};

const bulkResolveQuickBooksConflicts = async (req, res) => {
    try {
        const firmId = req.firmId;
        const { conflicts, resolution } = req.body;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        if (!conflicts || !Array.isArray(conflicts)) {
            return res.status(400).json({
                success: false,
                error: 'قائمة التعارضات مطلوبة',
                error_en: 'Conflicts array is required'
            });
        }

        const results = await Promise.allSettled(
            conflicts.map(conflictId =>
                quickbooksService.resolveConflict(firmId, conflictId, resolution)
            )
        );

        const resolved = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        return res.status(200).json({
            success: true,
            data: {
                resolved,
                failed,
                results: results.map((r, i) => ({
                    conflictId: conflicts[i],
                    status: r.status,
                    error: r.status === 'rejected' ? r.reason?.message : null
                }))
            },
            message: `تم حل ${resolved} من ${conflicts.length} تعارضات`,
            message_en: `Resolved ${resolved} of ${conflicts.length} conflicts`
        });
    } catch (error) {
        logger.error('Error bulk resolving QuickBooks conflicts:', error);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message || 'فشل حل تعارضات QuickBooks بشكل جماعي',
            error_en: error.message_en || 'Failed to bulk resolve QuickBooks conflicts'
        });
    }
};

module.exports = {
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
};
