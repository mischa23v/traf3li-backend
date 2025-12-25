/**
 * Apps Controller
 *
 * Handles HTTP requests for the unified Apps API
 */

const AppsService = require('../services/apps.service');
const logger = require('../utils/logger');
const auditLogService = require('../services/auditLog.service');

/**
 * List all available apps with their connection status
 * GET /api/apps
 */
const listApps = async (req, res) => {
    try {
        const firmId = req.firmId;
        const userId = req.userID;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'FIRM_REQUIRED',
                    message: 'Firm ID is required',
                    messageAr: 'معرف المكتب مطلوب'
                }
            });
        }

        const result = await AppsService.getAvailableApps(firmId);

        // Log the action
        await auditLogService.log(
            'apps_list_viewed',
            'integration',
            userId,
            firmId,
            {
                userId,
                firmId,
                totalApps: result.total,
                connectedApps: result.connected,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                severity: 'low'
            }
        );

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('Failed to list apps', { error: error.message });

        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to list apps',
                messageAr: 'فشل في عرض التطبيقات'
            }
        });
    }
};

/**
 * Get specific app details and status
 * GET /api/apps/:appId
 */
const getApp = async (req, res) => {
    try {
        const firmId = req.firmId;
        const userId = req.userID;
        const { appId } = req.params;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'FIRM_REQUIRED',
                    message: 'Firm ID is required',
                    messageAr: 'معرف المكتب مطلوب'
                }
            });
        }

        if (!appId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'APP_ID_REQUIRED',
                    message: 'App ID is required',
                    messageAr: 'معرف التطبيق مطلوب'
                }
            });
        }

        const result = await AppsService.getAppStatus(firmId, appId);

        // Log the action
        await auditLogService.log(
            'app_details_viewed',
            'integration',
            userId,
            firmId,
            {
                userId,
                firmId,
                appId,
                appName: result.app.name,
                status: result.app.status,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                severity: 'low'
            }
        );

        return res.status(200).json({
            success: true,
            data: result.app
        });
    } catch (error) {
        logger.error('Failed to get app details', { error: error.message, appId: req.params.appId });

        if (error.message === 'App not found') {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'APP_NOT_FOUND',
                    message: 'App not found',
                    messageAr: 'التطبيق غير موجود'
                }
            });
        }

        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get app details',
                messageAr: 'فشل في جلب تفاصيل التطبيق'
            }
        });
    }
};

/**
 * Start connection flow for an app (get OAuth URL)
 * POST /api/apps/:appId/connect
 */
const connectApp = async (req, res) => {
    try {
        const firmId = req.firmId;
        const userId = req.userID;
        const { appId } = req.params;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'FIRM_REQUIRED',
                    message: 'Firm ID is required',
                    messageAr: 'معرف المكتب مطلوب'
                }
            });
        }

        const result = await AppsService.getAppAuthUrl(firmId, appId, userId);

        // Log the action
        await auditLogService.log(
            'app_connection_initiated',
            'integration',
            userId,
            firmId,
            {
                userId,
                firmId,
                appId,
                appName: result.appName,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                severity: 'medium'
            }
        );

        return res.status(200).json({
            success: true,
            data: {
                authUrl: result.authUrl,
                appId: result.appId,
                appName: result.appName,
                message: 'Redirect to auth URL to complete connection',
                messageAr: 'قم بالتوجيه إلى رابط المصادقة لإكمال الاتصال'
            }
        });
    } catch (error) {
        logger.error('Failed to initiate app connection', { error: error.message, appId: req.params.appId });

        if (error.message === 'App not found') {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'APP_NOT_FOUND',
                    message: 'App not found',
                    messageAr: 'التطبيق غير موجود'
                }
            });
        }

        if (error.message === 'App does not support OAuth') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'OAUTH_NOT_SUPPORTED',
                    message: 'App does not support OAuth',
                    messageAr: 'التطبيق لا يدعم OAuth'
                }
            });
        }

        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to initiate app connection',
                messageAr: 'فشل في بدء الاتصال بالتطبيق'
            }
        });
    }
};

/**
 * Disconnect an app
 * POST /api/apps/:appId/disconnect
 */
const disconnectApp = async (req, res) => {
    try {
        const firmId = req.firmId;
        const userId = req.userID;
        const { appId } = req.params;
        const { reason } = req.body;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'FIRM_REQUIRED',
                    message: 'Firm ID is required',
                    messageAr: 'معرف المكتب مطلوب'
                }
            });
        }

        const result = await AppsService.disconnectApp(firmId, appId, userId, reason);

        // Log the action
        await auditLogService.log(
            'app_disconnected',
            'integration',
            userId,
            firmId,
            {
                userId,
                firmId,
                appId,
                appName: result.app.appName,
                reason,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                severity: 'medium'
            }
        );

        return res.status(200).json({
            success: true,
            data: {
                message: result.message,
                messageAr: 'تم قطع الاتصال بالتطبيق بنجاح',
                app: result.app
            }
        });
    } catch (error) {
        logger.error('Failed to disconnect app', { error: error.message, appId: req.params.appId });

        if (error.message === 'App connection not found') {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'CONNECTION_NOT_FOUND',
                    message: 'App connection not found',
                    messageAr: 'اتصال التطبيق غير موجود'
                }
            });
        }

        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to disconnect app',
                messageAr: 'فشل في قطع الاتصال بالتطبيق'
            }
        });
    }
};

/**
 * Get app settings
 * GET /api/apps/:appId/settings
 */
const getAppSettings = async (req, res) => {
    try {
        const firmId = req.firmId;
        const userId = req.userID;
        const { appId } = req.params;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'FIRM_REQUIRED',
                    message: 'Firm ID is required',
                    messageAr: 'معرف المكتب مطلوب'
                }
            });
        }

        const result = await AppsService.getAppStatus(firmId, appId);

        if (!result.app.isConnected) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'APP_NOT_CONNECTED',
                    message: 'App is not connected',
                    messageAr: 'التطبيق غير متصل'
                }
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                appId: result.app.id,
                appName: result.app.name,
                settings: result.app.settings,
                metadata: result.app.metadata
            }
        });
    } catch (error) {
        logger.error('Failed to get app settings', { error: error.message, appId: req.params.appId });

        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get app settings',
                messageAr: 'فشل في جلب إعدادات التطبيق'
            }
        });
    }
};

/**
 * Update app settings
 * PUT /api/apps/:appId/settings
 */
const updateAppSettings = async (req, res) => {
    try {
        const firmId = req.firmId;
        const userId = req.userID;
        const { appId } = req.params;
        const { settings } = req.body;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'FIRM_REQUIRED',
                    message: 'Firm ID is required',
                    messageAr: 'معرف المكتب مطلوب'
                }
            });
        }

        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_SETTINGS',
                    message: 'Settings must be an object',
                    messageAr: 'الإعدادات يجب أن تكون كائن'
                }
            });
        }

        const result = await AppsService.updateAppSettings(firmId, appId, settings);

        // Log the action
        await auditLogService.log(
            'app_settings_updated',
            'integration',
            userId,
            firmId,
            {
                userId,
                firmId,
                appId,
                settingsKeys: Object.keys(settings),
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                severity: 'low'
            }
        );

        return res.status(200).json({
            success: true,
            data: {
                message: result.message,
                messageAr: 'تم تحديث الإعدادات بنجاح',
                settings: result.settings
            }
        });
    } catch (error) {
        logger.error('Failed to update app settings', { error: error.message, appId: req.params.appId });

        if (error.message === 'App connection not found') {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'CONNECTION_NOT_FOUND',
                    message: 'App connection not found',
                    messageAr: 'اتصال التطبيق غير موجود'
                }
            });
        }

        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to update app settings',
                messageAr: 'فشل في تحديث إعدادات التطبيق'
            }
        });
    }
};

/**
 * Trigger manual sync for an app
 * POST /api/apps/:appId/sync
 */
const syncApp = async (req, res) => {
    try {
        const firmId = req.firmId;
        const userId = req.userID;
        const { appId } = req.params;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'FIRM_REQUIRED',
                    message: 'Firm ID is required',
                    messageAr: 'معرف المكتب مطلوب'
                }
            });
        }

        const result = await AppsService.syncApp(firmId, appId);

        // Log the action
        await auditLogService.log(
            'app_sync_triggered',
            'integration',
            userId,
            firmId,
            {
                userId,
                firmId,
                appId,
                lastSyncAt: result.lastSyncAt,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                severity: 'low'
            }
        );

        return res.status(200).json({
            success: true,
            data: {
                message: result.message,
                messageAr: 'تم بدء المزامنة بنجاح',
                lastSyncAt: result.lastSyncAt
            }
        });
    } catch (error) {
        logger.error('Failed to sync app', { error: error.message, appId: req.params.appId });

        if (error.message === 'App connection not found') {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'CONNECTION_NOT_FOUND',
                    message: 'App connection not found',
                    messageAr: 'اتصال التطبيق غير موجود'
                }
            });
        }

        if (error.message === 'App is not connected') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'APP_NOT_CONNECTED',
                    message: 'App is not connected',
                    messageAr: 'التطبيق غير متصل'
                }
            });
        }

        return res.status(500).json({
            success: false,
            error: {
                code: 'SYNC_FAILED',
                message: 'Failed to sync app',
                messageAr: 'فشل في مزامنة التطبيق'
            }
        });
    }
};

/**
 * Test app connection
 * POST /api/apps/:appId/test
 */
const testApp = async (req, res) => {
    try {
        const firmId = req.firmId;
        const userId = req.userID;
        const { appId } = req.params;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'FIRM_REQUIRED',
                    message: 'Firm ID is required',
                    messageAr: 'معرف المكتب مطلوب'
                }
            });
        }

        const result = await AppsService.testApp(firmId, appId);

        // Log the action
        await auditLogService.log(
            'app_connection_tested',
            'integration',
            userId,
            firmId,
            {
                userId,
                firmId,
                appId,
                testSuccess: result.test.success,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                severity: 'low'
            }
        );

        return res.status(200).json({
            success: true,
            data: {
                test: result.test,
                message: result.test.success ? 'Connection test successful' : 'Connection test failed',
                messageAr: result.test.success ? 'نجح اختبار الاتصال' : 'فشل اختبار الاتصال'
            }
        });
    } catch (error) {
        logger.error('Failed to test app connection', { error: error.message, appId: req.params.appId });

        if (error.message === 'App connection not found') {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'CONNECTION_NOT_FOUND',
                    message: 'App connection not found',
                    messageAr: 'اتصال التطبيق غير موجود'
                }
            });
        }

        if (error.message === 'App is not connected') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'APP_NOT_CONNECTED',
                    message: 'App is not connected',
                    messageAr: 'التطبيق غير متصل'
                }
            });
        }

        return res.status(500).json({
            success: false,
            error: {
                code: 'TEST_FAILED',
                message: 'Failed to test app connection',
                messageAr: 'فشل في اختبار الاتصال بالتطبيق'
            }
        });
    }
};

/**
 * Get app categories
 * GET /api/apps/categories
 */
const getCategories = async (req, res) => {
    try {
        const result = AppsService.getCategories();

        return res.status(200).json({
            success: true,
            data: result.categories
        });
    } catch (error) {
        logger.error('Failed to get app categories', { error: error.message });

        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get app categories',
                messageAr: 'فشل في جلب فئات التطبيقات'
            }
        });
    }
};

/**
 * Get firm integration statistics
 * GET /api/apps/stats
 */
const getStats = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'FIRM_REQUIRED',
                    message: 'Firm ID is required',
                    messageAr: 'معرف المكتب مطلوب'
                }
            });
        }

        const result = await AppsService.getFirmStats(firmId);

        return res.status(200).json({
            success: true,
            data: result.stats
        });
    } catch (error) {
        logger.error('Failed to get firm stats', { error: error.message });

        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get integration statistics',
                messageAr: 'فشل في جلب إحصائيات التكاملات'
            }
        });
    }
};

module.exports = {
    listApps,
    getApp,
    connectApp,
    disconnectApp,
    getAppSettings,
    updateAppSettings,
    syncApp,
    testApp,
    getCategories,
    getStats
};
