const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const googleCalendarService = require('../services/googleCalendar.service');
const GoogleCalendarIntegration = require('../models/googleCalendarIntegration.model');
const { pickAllowedFields } = require('../utils/securityUtils');

/**
 * Google Calendar Controller
 *
 * Handles all Google Calendar integration endpoints
 */

// ═══════════════════════════════════════════════════════════════
// OAUTH FLOW
// ═══════════════════════════════════════════════════════════════

/**
 * Get OAuth authorization URL
 * GET /api/google-calendar/auth
 */
const getAuthUrl = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const authUrl = await googleCalendarService.getAuthUrl(userId, firmId);

    res.status(200).json({
        success: true,
        authUrl
    });
});

/**
 * Handle OAuth callback
 * GET /api/google-calendar/callback
 */
const handleCallback = asyncHandler(async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
        // User denied access or error occurred
        return res.redirect(`${process.env.FRONTEND_URL || process.env.DASHBOARD_URL}/settings/integrations?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
        throw CustomException('Invalid callback parameters', 400);
    }

    const result = await googleCalendarService.handleCallback(code, state);

    // Redirect to success page
    res.redirect(`${process.env.FRONTEND_URL || process.env.DASHBOARD_URL}/settings/integrations?google_calendar=connected`);
});

/**
 * Disconnect Google Calendar
 * POST /api/google-calendar/disconnect
 */
const disconnect = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const result = await googleCalendarService.disconnect(userId, firmId);

    res.status(200).json({
        success: true,
        message: 'Google Calendar disconnected successfully'
    });
});

/**
 * Get integration status
 * GET /api/google-calendar/status
 *
 * Response format matches spec:
 * - email: Connected Google account email
 * - expiresAt: Token expiry time
 * - scopes: Array of granted OAuth scopes
 * - calendars: Full list of available calendars
 * - selectedCalendars: User's selected calendars
 */
const getStatus = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const integration = await GoogleCalendarIntegration.findOne({ userId, firmId });

    if (!integration) {
        return res.status(200).json({
            success: true,
            connected: false,
            data: null
        });
    }

    // Parse scopes from space-separated string to array
    const scopes = integration.scope ? integration.scope.split(' ') : [];

    // Fetch calendars from Google if connected (non-blocking)
    let calendars = [];
    if (integration.isConnected) {
        try {
            calendars = await googleCalendarService.getCalendars(userId, firmId);
        } catch (error) {
            // Non-blocking - return empty calendars if fetch fails
            calendars = [];
        }
    }

    res.status(200).json({
        success: true,
        connected: integration.isConnected,
        data: {
            isConnected: integration.isConnected,
            email: integration.email || null,
            displayName: integration.displayName || null,
            expiresAt: integration.expiresAt,
            scopes,
            calendars,
            selectedCalendars: integration.selectedCalendars,
            primaryCalendarId: integration.primaryCalendarId,
            showExternalEvents: integration.showExternalEvents !== false, // Default true
            autoSync: integration.autoSync,
            syncStats: integration.syncStats,
            connectedAt: integration.connectedAt,
            lastSyncedAt: integration.lastSyncedAt
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// CALENDAR OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get list of calendars
 * GET /api/google-calendar/calendars
 */
const getCalendars = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const calendars = await googleCalendarService.getCalendars(userId, firmId);

    res.status(200).json({
        success: true,
        data: calendars
    });
});

/**
 * Get events from a calendar
 * GET /api/google-calendar/calendars/:calendarId/events
 */
const getEvents = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { calendarId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        throw CustomException('Start date and end date are required', 400);
    }

    const events = await googleCalendarService.getEvents(
        userId,
        calendarId,
        new Date(startDate),
        new Date(endDate),
        firmId
    );

    res.status(200).json({
        success: true,
        data: events,
        count: events.length
    });
});

/**
 * Create event in Google Calendar
 * POST /api/google-calendar/calendars/:calendarId/events
 */
const createEvent = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { calendarId } = req.params;

    const allowedFields = [
        'title', 'description', 'startDateTime', 'endDateTime',
        'allDay', 'timezone', 'location', 'attendees', 'reminders'
    ];

    const eventData = pickAllowedFields(req.body, allowedFields);

    const googleEvent = await googleCalendarService.createEvent(userId, calendarId, eventData, firmId);

    res.status(201).json({
        success: true,
        message: 'Event created in Google Calendar',
        data: googleEvent
    });
});

/**
 * Update event in Google Calendar
 * PUT /api/google-calendar/calendars/:calendarId/events/:eventId
 */
const updateEvent = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { calendarId, eventId } = req.params;

    const allowedFields = [
        'title', 'description', 'startDateTime', 'endDateTime',
        'allDay', 'timezone', 'location', 'attendees', 'reminders'
    ];

    const eventData = pickAllowedFields(req.body, allowedFields);

    const googleEvent = await googleCalendarService.updateEvent(userId, calendarId, eventId, eventData, firmId);

    res.status(200).json({
        success: true,
        message: 'Event updated in Google Calendar',
        data: googleEvent
    });
});

/**
 * Delete event from Google Calendar
 * DELETE /api/google-calendar/calendars/:calendarId/events/:eventId
 */
const deleteEvent = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { calendarId, eventId } = req.params;

    await googleCalendarService.deleteEvent(userId, calendarId, eventId, firmId);

    res.status(200).json({
        success: true,
        message: 'Event deleted from Google Calendar'
    });
});

// ═══════════════════════════════════════════════════════════════
// CALENDAR SELECTION & SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * Update selected calendars
 * PUT /api/google-calendar/settings/calendars
 */
const updateSelectedCalendars = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { calendars, primaryCalendarId } = req.body;

    if (!Array.isArray(calendars)) {
        throw CustomException('Calendars must be an array', 400);
    }

    const integration = await GoogleCalendarIntegration.findActiveIntegration(userId, firmId);

    if (!integration) {
        throw CustomException('Google Calendar not connected', 404);
    }

    // Update selected calendars
    integration.selectedCalendars = calendars.map(cal => ({
        calendarId: cal.calendarId,
        name: cal.name,
        backgroundColor: cal.backgroundColor,
        isPrimary: cal.isPrimary || false,
        syncEnabled: cal.syncEnabled !== false
    }));

    // Update primary calendar
    if (primaryCalendarId) {
        integration.primaryCalendarId = primaryCalendarId;
    } else if (integration.selectedCalendars.length > 0) {
        integration.primaryCalendarId = integration.selectedCalendars[0].calendarId;
    }

    await integration.save();

    res.status(200).json({
        success: true,
        message: 'Calendar selection updated',
        data: {
            selectedCalendars: integration.selectedCalendars,
            primaryCalendarId: integration.primaryCalendarId
        }
    });
});

/**
 * Toggle showing external Google Calendar events in Traf3li calendar
 * PUT /api/google-calendar/settings/show-external-events
 *
 * When enabled, events from Google Calendar (that weren't created in Traf3li)
 * will appear in the calendar view with a distinct "external" marker
 */
const toggleShowExternalEvents = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { showExternalEvents } = req.body;

    if (typeof showExternalEvents !== 'boolean') {
        throw CustomException('showExternalEvents must be a boolean', 400);
    }

    const integration = await GoogleCalendarIntegration.findActiveIntegration(userId, firmId);

    if (!integration) {
        throw CustomException('Google Calendar not connected', 404);
    }

    integration.showExternalEvents = showExternalEvents;
    await integration.save();

    res.status(200).json({
        success: true,
        message: `External events ${showExternalEvents ? 'enabled' : 'disabled'}`,
        data: {
            showExternalEvents: integration.showExternalEvents
        }
    });
});

/**
 * Set up push notifications
 * POST /api/google-calendar/watch/:calendarId
 */
const watchCalendar = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { calendarId } = req.params;

    const result = await googleCalendarService.watchCalendar(userId, calendarId, firmId);

    res.status(200).json({
        success: true,
        message: 'Calendar watch set up successfully',
        data: result
    });
});

/**
 * Stop push notifications
 * DELETE /api/google-calendar/watch/:channelId
 */
const stopWatch = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { channelId } = req.params;

    await googleCalendarService.stopWebhook(userId, firmId, channelId);

    res.status(200).json({
        success: true,
        message: 'Calendar watch stopped successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// SYNC OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Sync events from Google to TRAF3LI
 * POST /api/google-calendar/sync/import
 */
const syncFromGoogle = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const result = await googleCalendarService.syncFromGoogle(userId, firmId);

    res.status(200).json({
        success: true,
        message: `Successfully imported ${result.imported} event(s) from Google Calendar`,
        data: result
    });
});

/**
 * Sync TRAF3LI event to Google
 * POST /api/google-calendar/sync/export/:eventId
 * POST /api/google-calendar/export (eventId in body - spec compatibility)
 */
const syncToGoogle = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    // Support eventId from params (original) or body (spec compatibility)
    const eventId = req.params.eventId || req.body.eventId;

    if (!eventId) {
        throw CustomException('eventId is required', 400);
    }

    const result = await googleCalendarService.syncToGoogle(userId, eventId, firmId);

    res.status(200).json({
        success: true,
        message: `Event ${result.action} in Google Calendar`,
        data: result
    });
});

/**
 * Enable auto-sync
 * POST /api/google-calendar/sync/auto/enable
 */
const enableAutoSync = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const allowedFields = [
        'direction',
        'syncInterval',
        'conflictResolution',
        'syncPastEvents',
        'syncDaysBack',
        'syncDaysForward'
    ];

    const settings = pickAllowedFields(req.body, allowedFields);

    const result = await googleCalendarService.enableAutoSync(userId, settings, firmId);

    res.status(200).json({
        success: true,
        message: 'Auto-sync enabled successfully',
        data: result
    });
});

/**
 * Disable auto-sync
 * POST /api/google-calendar/sync/auto/disable
 */
const disableAutoSync = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    await googleCalendarService.disableAutoSync(userId, firmId);

    res.status(200).json({
        success: true,
        message: 'Auto-sync disabled successfully'
    });
});

/**
 * Get auto-sync settings
 * GET /api/google-calendar/sync/settings
 */
const getSyncSettings = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const integration = await GoogleCalendarIntegration.findActiveIntegration(userId, firmId);

    if (!integration) {
        throw CustomException('Google Calendar not connected', 404);
    }

    res.status(200).json({
        success: true,
        data: {
            autoSync: integration.autoSync,
            syncStats: integration.syncStats,
            lastSyncedAt: integration.lastSyncedAt,
            lastSyncError: integration.lastSyncError
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// WEBHOOK
// ═══════════════════════════════════════════════════════════════

/**
 * Handle webhook from Google Calendar
 * POST /api/google-calendar/webhook
 */
const handleWebhook = asyncHandler(async (req, res) => {
    const headers = req.headers;
    const payload = req.body;

    // Verify this is a valid Google webhook
    const resourceState = headers['x-goog-resource-state'];

    if (!resourceState) {
        throw CustomException('Invalid webhook request', 400);
    }

    await googleCalendarService.handleWebhook(payload, headers);

    // Google expects 200 OK response
    res.status(200).send('OK');
});

module.exports = {
    // OAuth
    getAuthUrl,
    handleCallback,
    disconnect,
    getStatus,

    // Calendar operations
    getCalendars,
    getEvents,
    createEvent,
    updateEvent,
    deleteEvent,

    // Settings
    updateSelectedCalendars,
    toggleShowExternalEvents,
    watchCalendar,
    stopWatch,

    // Sync
    syncFromGoogle,
    syncToGoogle,
    enableAutoSync,
    disableAutoSync,
    getSyncSettings,

    // Webhook
    handleWebhook
};
