/**
 * Microsoft Calendar Integration Routes
 *
 * Handles Microsoft 365 Calendar integration endpoints:
 * - OAuth 2.0 flow for calendar access
 * - Calendar and event management
 * - Bidirectional sync operations
 * - Auto-sync configuration
 *
 * Base route: /api/microsoft-calendar
 */

const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const { checkPermission } = require('../middlewares/authorize.middleware');
const { createRateLimiter } = require('../middlewares/rateLimiter.middleware');

// ═══════════════════════════════════════════════════════════════
// CONTROLLERS
// ═══════════════════════════════════════════════════════════════

const {
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
    disableAutoSync
} = require('../controllers/microsoftCalendar.controller');

// ═══════════════════════════════════════════════════════════════
// RATE LIMITERS
// ═══════════════════════════════════════════════════════════════

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

// Sync operations rate limiter - prevent excessive API calls to Microsoft
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

// Calendar operations rate limiter
const calendarRateLimiter = createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 calendar operations per minute
    message: {
        success: false,
        error: 'طلبات كثيرة جداً',
        error_en: 'Too many requests',
        code: 'CALENDAR_RATE_LIMIT_EXCEEDED',
    },
});

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// AUTHENTICATION ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/microsoft-calendar/auth
 * @desc    Initiate Microsoft Calendar OAuth flow
 * @access  Private (requires authentication)
 */
router.get('/auth',
    userMiddleware,
    firmFilter,
    oauthRateLimiter,
    getAuthUrl
);

/**
 * @route   GET /api/microsoft-calendar/callback
 * @desc    Handle Microsoft Calendar OAuth callback
 * @access  Public (Microsoft calls this)
 */
router.get('/callback',
    oauthRateLimiter,
    handleCallback
);

/**
 * @route   POST /api/microsoft-calendar/refresh-token
 * @desc    Manually refresh Microsoft Calendar access token
 * @access  Private
 */
router.post('/refresh-token',
    userMiddleware,
    firmFilter,
    refreshToken
);

/**
 * @route   POST /api/microsoft-calendar/disconnect
 * @desc    Disconnect Microsoft Calendar integration
 * @access  Private
 */
router.post('/disconnect',
    userMiddleware,
    firmFilter,
    disconnect
);

/**
 * @route   GET /api/microsoft-calendar/status
 * @desc    Get Microsoft Calendar connection status
 * @access  Private
 */
router.get('/status',
    userMiddleware,
    firmFilter,
    getStatus
);

// ═══════════════════════════════════════════════════════════════
// CALENDAR OPERATIONS ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/microsoft-calendar/calendars
 * @desc    Get user's Microsoft calendars
 * @access  Private
 */
router.get('/calendars',
    userMiddleware,
    firmFilter,
    calendarRateLimiter,
    getCalendars
);

/**
 * @route   GET /api/microsoft-calendar/events
 * @desc    Get events from Microsoft Calendar
 * @access  Private
 * @query   calendarId - Optional calendar ID
 * @query   startDate - Optional start date (ISO 8601)
 * @query   endDate - Optional end date (ISO 8601)
 */
router.get('/events',
    userMiddleware,
    firmFilter,
    calendarRateLimiter,
    getEvents
);

/**
 * @route   POST /api/microsoft-calendar/events
 * @desc    Create event in Microsoft Calendar
 * @access  Private
 * @body    eventData - Event data
 * @body    calendarId - Optional calendar ID
 */
router.post('/events',
    userMiddleware,
    firmFilter,
    calendarRateLimiter,
    createEvent
);

/**
 * @route   PUT /api/microsoft-calendar/events/:eventId
 * @desc    Update event in Microsoft Calendar
 * @access  Private
 * @param   eventId - Microsoft event ID
 * @body    eventData - Updated event data
 * @body    calendarId - Calendar ID
 */
router.put('/events/:eventId',
    userMiddleware,
    firmFilter,
    calendarRateLimiter,
    updateEvent
);

/**
 * @route   DELETE /api/microsoft-calendar/events/:eventId
 * @desc    Delete event from Microsoft Calendar
 * @access  Private
 * @param   eventId - Microsoft event ID
 * @query   calendarId - Calendar ID
 */
router.delete('/events/:eventId',
    userMiddleware,
    firmFilter,
    calendarRateLimiter,
    deleteEvent
);

// ═══════════════════════════════════════════════════════════════
// SYNC OPERATIONS ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   POST /api/microsoft-calendar/sync/from-microsoft
 * @desc    Sync events from Microsoft Calendar to TRAF3LI
 * @access  Private
 * @body    calendarId - Optional calendar ID
 * @body    startDate - Optional start date
 * @body    endDate - Optional end date
 */
router.post('/sync/from-microsoft',
    userMiddleware,
    firmFilter,
    syncRateLimiter,
    syncFromMicrosoft
);

/**
 * @route   POST /api/microsoft-calendar/sync/to-microsoft/:eventId
 * @desc    Sync TRAF3LI event to Microsoft Calendar
 * @access  Private
 * @param   eventId - TRAF3LI event ID
 */
router.post('/sync/to-microsoft/:eventId',
    userMiddleware,
    firmFilter,
    syncRateLimiter,
    syncToMicrosoft
);

/**
 * @route   POST /api/microsoft-calendar/sync/enable-auto-sync
 * @desc    Enable automatic synchronization
 * @access  Private
 * @body    syncInterval - Sync interval (manual, hourly, daily)
 * @body    syncDirection - Sync direction (to_microsoft, from_microsoft, bidirectional)
 * @body    defaultCalendarId - Default calendar ID for sync
 * @body    syncPastDays - Number of past days to sync (default: 30)
 * @body    syncFutureDays - Number of future days to sync (default: 90)
 */
router.post('/sync/enable-auto-sync',
    userMiddleware,
    firmFilter,
    enableAutoSync
);

/**
 * @route   POST /api/microsoft-calendar/sync/disable-auto-sync
 * @desc    Disable automatic synchronization
 * @access  Private
 */
router.post('/sync/disable-auto-sync',
    userMiddleware,
    firmFilter,
    disableAutoSync
);

module.exports = router;
