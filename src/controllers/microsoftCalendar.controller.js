/**
 * Microsoft Calendar Integration Controller
 *
 * Handles Microsoft 365 Calendar integration endpoints:
 * - OAuth authentication flow
 * - Calendar and event management
 * - Sync operations
 * - Auto-sync configuration
 */

const microsoftCalendarService = require('../services/microsoftCalendar.service');
const logger = require('../utils/logger');
const { CustomException } = require('../utils');

// ═══════════════════════════════════════════════════════════════
// AUTHENTICATION HANDLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Initiate Microsoft Calendar OAuth flow
 * GET /api/microsoft-calendar/auth
 */
const getAuthUrl = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const firmId = req.user.firmId?.toString() || req.firmId?.toString();

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID required'
            });
        }

        const { authUrl, state } = await microsoftCalendarService.getAuthUrl(userId, firmId);

        return res.status(200).json({
            success: true,
            data: {
                authUrl,
                state
            }
        });
    } catch (error) {
        logger.error('Error generating Microsoft Calendar auth URL:', error);
        return res.status(500).json({
            success: false,
            error: 'فشل بدء مصادقة Microsoft Calendar',
            error_en: 'Failed to initiate Microsoft Calendar authentication',
            details: error.message
        });
    }
};

/**
 * Handle Microsoft Calendar OAuth callback
 * GET /api/microsoft-calendar/callback
 */
const handleCallback = async (req, res) => {
    try {
        const { code, state, error, error_description } = req.query;

        // Handle OAuth errors
        if (error) {
            logger.error('Microsoft Calendar OAuth error:', { error, error_description });
            return res.redirect(`${process.env.FRONTEND_URL || process.env.DASHBOARD_URL}/settings/integrations?error=${error}&message=${encodeURIComponent(error_description || 'Authentication failed')}`);
        }

        if (!code || !state) {
            return res.status(400).json({
                success: false,
                error: 'رمز التفويض والحالة مطلوبان',
                error_en: 'Authorization code and state required'
            });
        }

        const result = await microsoftCalendarService.handleCallback(code, state);

        // Redirect to success page
        return res.redirect(`${process.env.FRONTEND_URL || process.env.DASHBOARD_URL}/settings/integrations?success=true&integration=microsoft-calendar`);
    } catch (error) {
        logger.error('Error handling Microsoft Calendar callback:', error);
        return res.redirect(`${process.env.FRONTEND_URL || process.env.DASHBOARD_URL}/settings/integrations?error=callback_failed&message=${encodeURIComponent(error.message)}`);
    }
};

/**
 * Refresh Microsoft Calendar access token
 * POST /api/microsoft-calendar/refresh-token
 */
const refreshToken = async (req, res) => {
    try {
        const userId = req.user._id.toString();

        const result = await microsoftCalendarService.refreshToken(userId);

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('Error refreshing Microsoft Calendar token:', error);
        return res.status(500).json({
            success: false,
            error: 'فشل تحديث رمز الوصول',
            error_en: 'Failed to refresh access token',
            details: error.message
        });
    }
};

/**
 * Disconnect Microsoft Calendar integration
 * POST /api/microsoft-calendar/disconnect
 */
const disconnect = async (req, res) => {
    try {
        const userId = req.user._id.toString();

        const result = await microsoftCalendarService.disconnect(userId);

        return res.status(200).json({
            success: true,
            message: 'تم فصل Microsoft Calendar بنجاح',
            message_en: 'Microsoft Calendar disconnected successfully',
            data: result
        });
    } catch (error) {
        logger.error('Error disconnecting Microsoft Calendar:', error);
        return res.status(500).json({
            success: false,
            error: 'فشل فصل Microsoft Calendar',
            error_en: 'Failed to disconnect Microsoft Calendar',
            details: error.message
        });
    }
};

/**
 * Get Microsoft Calendar connection status
 * GET /api/microsoft-calendar/status
 */
const getStatus = async (req, res) => {
    try {
        const userId = req.user._id.toString();

        const status = await microsoftCalendarService.getConnectionStatus(userId);

        return res.status(200).json({
            success: true,
            data: status
        });
    } catch (error) {
        logger.error('Error getting Microsoft Calendar status:', error);
        return res.status(500).json({
            success: false,
            error: 'فشل الحصول على حالة الاتصال',
            error_en: 'Failed to get connection status',
            details: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// CALENDAR OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get user's Microsoft calendars
 * GET /api/microsoft-calendar/calendars
 */
const getCalendars = async (req, res) => {
    try {
        const userId = req.user._id.toString();

        const calendars = await microsoftCalendarService.getCalendars(userId);

        return res.status(200).json({
            success: true,
            data: calendars
        });
    } catch (error) {
        logger.error('Error getting Microsoft calendars:', error);
        return res.status(500).json({
            success: false,
            error: 'فشل الحصول على التقاويم',
            error_en: 'Failed to get calendars',
            details: error.message
        });
    }
};

/**
 * Get events from Microsoft Calendar
 * GET /api/microsoft-calendar/events
 */
const getEvents = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { calendarId, startDate, endDate } = req.query;

        const start = startDate ? new Date(startDate) : new Date();
        const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const events = await microsoftCalendarService.getEvents(
            userId,
            calendarId || null,
            start,
            end
        );

        return res.status(200).json({
            success: true,
            data: events
        });
    } catch (error) {
        logger.error('Error getting Microsoft Calendar events:', error);
        return res.status(500).json({
            success: false,
            error: 'فشل الحصول على الأحداث',
            error_en: 'Failed to get events',
            details: error.message
        });
    }
};

/**
 * Create event in Microsoft Calendar
 * POST /api/microsoft-calendar/events
 */
const createEvent = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { calendarId, ...eventData } = req.body;

        const msEvent = await microsoftCalendarService.createEvent(
            userId,
            calendarId || null,
            eventData
        );

        return res.status(201).json({
            success: true,
            message: 'تم إنشاء الحدث بنجاح',
            message_en: 'Event created successfully',
            data: msEvent
        });
    } catch (error) {
        logger.error('Error creating Microsoft Calendar event:', error);
        return res.status(500).json({
            success: false,
            error: 'فشل إنشاء الحدث',
            error_en: 'Failed to create event',
            details: error.message
        });
    }
};

/**
 * Update event in Microsoft Calendar
 * PUT /api/microsoft-calendar/events/:eventId
 */
const updateEvent = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { eventId } = req.params;
        const { calendarId, ...eventData } = req.body;

        const msEvent = await microsoftCalendarService.updateEvent(
            userId,
            calendarId,
            eventId,
            eventData
        );

        return res.status(200).json({
            success: true,
            message: 'تم تحديث الحدث بنجاح',
            message_en: 'Event updated successfully',
            data: msEvent
        });
    } catch (error) {
        logger.error('Error updating Microsoft Calendar event:', error);
        return res.status(500).json({
            success: false,
            error: 'فشل تحديث الحدث',
            error_en: 'Failed to update event',
            details: error.message
        });
    }
};

/**
 * Delete event from Microsoft Calendar
 * DELETE /api/microsoft-calendar/events/:eventId
 */
const deleteEvent = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { eventId } = req.params;
        const { calendarId } = req.query;

        await microsoftCalendarService.deleteEvent(userId, calendarId, eventId);

        return res.status(200).json({
            success: true,
            message: 'تم حذف الحدث بنجاح',
            message_en: 'Event deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting Microsoft Calendar event:', error);
        return res.status(500).json({
            success: false,
            error: 'فشل حذف الحدث',
            error_en: 'Failed to delete event',
            details: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// SYNC OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Sync events from Microsoft to TRAF3LI
 * POST /api/microsoft-calendar/sync/from-microsoft
 */
const syncFromMicrosoft = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const options = req.body;

        const result = await microsoftCalendarService.syncFromMicrosoft(userId, options);

        return res.status(200).json({
            success: true,
            message: 'تمت المزامنة من Microsoft Calendar بنجاح',
            message_en: 'Successfully synced from Microsoft Calendar',
            data: result
        });
    } catch (error) {
        logger.error('Error syncing from Microsoft Calendar:', error);
        return res.status(500).json({
            success: false,
            error: 'فشلت المزامنة من Microsoft Calendar',
            error_en: 'Failed to sync from Microsoft Calendar',
            details: error.message
        });
    }
};

/**
 * Sync TRAF3LI event to Microsoft Calendar
 * POST /api/microsoft-calendar/sync/to-microsoft/:eventId
 * POST /api/microsoft-calendar/export (eventId in body - spec compatibility)
 */
const syncToMicrosoft = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        // Support eventId from params (original) or body (spec compatibility)
        const eventId = req.params.eventId || req.body.eventId;

        if (!eventId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الحدث مطلوب',
                error_en: 'eventId is required'
            });
        }

        const result = await microsoftCalendarService.syncToMicrosoft(userId, eventId);

        return res.status(200).json({
            success: true,
            message: 'تمت المزامنة إلى Microsoft Calendar بنجاح',
            message_en: 'Successfully synced to Microsoft Calendar',
            data: result
        });
    } catch (error) {
        logger.error('Error syncing to Microsoft Calendar:', error);
        return res.status(500).json({
            success: false,
            error: 'فشلت المزامنة إلى Microsoft Calendar',
            error_en: 'Failed to sync to Microsoft Calendar',
            details: error.message
        });
    }
};

/**
 * Enable auto-sync
 * POST /api/microsoft-calendar/sync/enable-auto-sync
 */
const enableAutoSync = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const settings = req.body;

        const result = await microsoftCalendarService.enableAutoSync(userId, settings);

        return res.status(200).json({
            success: true,
            message: 'تم تمكين المزامنة التلقائية',
            message_en: 'Auto-sync enabled successfully',
            data: result
        });
    } catch (error) {
        logger.error('Error enabling auto-sync:', error);
        return res.status(500).json({
            success: false,
            error: 'فشل تمكين المزامنة التلقائية',
            error_en: 'Failed to enable auto-sync',
            details: error.message
        });
    }
};

/**
 * Disable auto-sync
 * POST /api/microsoft-calendar/sync/disable-auto-sync
 */
const disableAutoSync = async (req, res) => {
    try {
        const userId = req.user._id.toString();

        const result = await microsoftCalendarService.disableAutoSync(userId);

        return res.status(200).json({
            success: true,
            message: 'تم تعطيل المزامنة التلقائية',
            message_en: 'Auto-sync disabled successfully',
            data: result
        });
    } catch (error) {
        logger.error('Error disabling auto-sync:', error);
        return res.status(500).json({
            success: false,
            error: 'فشل تعطيل المزامنة التلقائية',
            error_en: 'Failed to disable auto-sync',
            details: error.message
        });
    }
};

/**
 * Get sync settings
 * GET /api/microsoft-calendar/sync/settings
 *
 * Returns current auto-sync settings and statistics
 */
const getSyncSettings = async (req, res) => {
    try {
        const userId = req.user._id.toString();

        const status = await microsoftCalendarService.getConnectionStatus(userId);

        if (!status.connected) {
            return res.status(404).json({
                success: false,
                error: 'Microsoft Calendar غير متصل',
                error_en: 'Microsoft Calendar not connected'
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                autoSyncEnabled: status.syncSettings?.enabled || false,
                syncDirection: status.syncSettings?.syncDirection || 'bidirectional',
                syncInterval: status.syncSettings?.syncInterval || 'manual',
                selectedCalendars: status.syncSettings?.defaultCalendarId ? [status.syncSettings.defaultCalendarId] : [],
                syncPastDays: status.syncSettings?.syncPastDays || 30,
                syncFutureDays: status.syncSettings?.syncFutureDays || 90,
                lastSyncAt: status.syncSettings?.lastSync || status.lastSyncedAt
            }
        });
    } catch (error) {
        logger.error('Error getting Microsoft Calendar sync settings:', error);
        return res.status(500).json({
            success: false,
            error: 'فشل الحصول على إعدادات المزامنة',
            error_en: 'Failed to get sync settings',
            details: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // Auth
    getAuthUrl,
    handleCallback,
    refreshToken,
    disconnect,
    getStatus,

    // Calendar Operations
    getCalendars,
    getEvents,
    createEvent,
    updateEvent,
    deleteEvent,

    // Sync Operations
    syncFromMicrosoft,
    syncToMicrosoft,
    enableAutoSync,
    disableAutoSync,
    getSyncSettings
};
