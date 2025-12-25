const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const zoomService = require('../services/zoom.service');
const ZoomIntegration = require('../models/zoomIntegration.model');
const { pickAllowedFields } = require('../utils/securityUtils');

/**
 * Zoom Controller
 *
 * Handles all Zoom integration endpoints
 */

// ═══════════════════════════════════════════════════════════════
// OAUTH FLOW
// ═══════════════════════════════════════════════════════════════

/**
 * Get OAuth authorization URL
 * GET /api/zoom/auth-url
 */
const getAuthUrl = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const authUrl = await zoomService.getAuthUrl(userId, firmId);

    res.status(200).json({
        success: true,
        authUrl
    });
});

/**
 * Handle OAuth callback
 * GET /api/zoom/callback
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

    const result = await zoomService.handleCallback(code, state);

    // Redirect to success page
    res.redirect(`${process.env.FRONTEND_URL || process.env.DASHBOARD_URL}/settings/integrations?zoom=connected`);
});

/**
 * Disconnect Zoom
 * POST /api/zoom/disconnect
 */
const disconnect = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const result = await zoomService.disconnect(userId, firmId);

    res.status(200).json({
        success: true,
        message: 'Zoom disconnected successfully'
    });
});

/**
 * Get integration status
 * GET /api/zoom/status
 */
const getStatus = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const integration = await ZoomIntegration.findOne({ userId, firmId });

    if (!integration) {
        return res.status(200).json({
            success: true,
            connected: false
        });
    }

    res.status(200).json({
        success: true,
        connected: integration.isActive,
        data: {
            isActive: integration.isActive,
            connectedAt: integration.connectedAt,
            email: integration.email,
            zoomUserId: integration.zoomUserId,
            meetingSettings: integration.meetingSettings,
            stats: integration.stats,
            lastSyncedAt: integration.lastSyncedAt
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// MEETING OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new meeting
 * POST /api/zoom/meetings
 */
const createMeeting = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const allowedFields = [
        'topic',
        'title',
        'type',
        'startTime',
        'start_time',
        'duration',
        'timezone',
        'password',
        'agenda',
        'description',
        'settings',
        'recurrence',
        'caseId',
        'clientId'
    ];

    const meetingData = pickAllowedFields(req.body, allowedFields);

    // Check if instant meeting or scheduled
    if (meetingData.type === 1 || req.body.instant) {
        const meeting = await zoomService.createInstantMeeting(userId, meetingData, firmId);
        return res.status(201).json({
            success: true,
            message: 'Instant meeting created successfully',
            data: meeting
        });
    }

    // Check if meeting for case/client
    if (meetingData.caseId || meetingData.clientId) {
        const meeting = await zoomService.scheduleMeetingForCase(userId, meetingData, firmId);
        return res.status(201).json({
            success: true,
            message: 'Meeting scheduled for case successfully',
            data: meeting
        });
    }

    // Regular scheduled meeting
    const meeting = await zoomService.createMeeting(userId, meetingData, firmId);

    res.status(201).json({
        success: true,
        message: 'Meeting created successfully',
        data: meeting
    });
});

/**
 * Get meeting details
 * GET /api/zoom/meetings/:meetingId
 */
const getMeeting = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { meetingId } = req.params;

    const meeting = await zoomService.getMeeting(userId, meetingId, firmId);

    res.status(200).json({
        success: true,
        data: meeting
    });
});

/**
 * List user's meetings
 * GET /api/zoom/meetings
 */
const listMeetings = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { type, page, pageSize } = req.query;

    const options = {
        type: type || 'scheduled',
        page: parseInt(page) || 1,
        pageSize: parseInt(pageSize) || 30
    };

    const meetings = await zoomService.listMeetings(userId, options, firmId);

    res.status(200).json({
        success: true,
        data: meetings.meetings || [],
        pagination: {
            page: meetings.page_number,
            pageSize: meetings.page_size,
            totalRecords: meetings.total_records,
            pageCount: meetings.page_count
        }
    });
});

/**
 * Update meeting
 * PUT /api/zoom/meetings/:meetingId
 */
const updateMeeting = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { meetingId } = req.params;

    const allowedFields = [
        'topic',
        'title',
        'type',
        'startTime',
        'start_time',
        'duration',
        'timezone',
        'password',
        'agenda',
        'description',
        'settings',
        'recurrence'
    ];

    const updateData = pickAllowedFields(req.body, allowedFields);

    const result = await zoomService.updateMeeting(userId, meetingId, updateData, firmId);

    res.status(200).json({
        success: true,
        message: 'Meeting updated successfully',
        data: result
    });
});

/**
 * Delete meeting
 * DELETE /api/zoom/meetings/:meetingId
 */
const deleteMeeting = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { meetingId } = req.params;

    await zoomService.deleteMeeting(userId, meetingId, firmId);

    res.status(200).json({
        success: true,
        message: 'Meeting deleted successfully'
    });
});

/**
 * Get meeting recordings
 * GET /api/zoom/recordings
 * GET /api/zoom/recordings/:meetingId
 */
const getRecordings = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { meetingId } = req.params;

    const recordings = await zoomService.getRecordings(userId, meetingId, firmId);

    res.status(200).json({
        success: true,
        data: recordings
    });
});

// ═══════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * Update default meeting settings
 * PUT /api/zoom/settings
 */
const updateSettings = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const allowedFields = [
        'hostVideo',
        'participantVideo',
        'joinBeforeHost',
        'muteUponEntry',
        'waitingRoom',
        'autoRecording',
        'meetingAuthentication',
        'defaultDuration',
        'audio',
        'allowScreenSharing',
        'breakoutRoom'
    ];

    const settings = pickAllowedFields(req.body, allowedFields);

    const result = await zoomService.updateSettings(userId, settings, firmId);

    res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        data: result
    });
});

/**
 * Test Zoom connection
 * POST /api/zoom/test
 */
const testConnection = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const result = await zoomService.testConnection(userId, firmId);

    res.status(200).json(result);
});

// ═══════════════════════════════════════════════════════════════
// WEBHOOK
// ═══════════════════════════════════════════════════════════════

/**
 * Handle webhook from Zoom
 * POST /api/zoom/webhook
 */
const handleWebhook = asyncHandler(async (req, res) => {
    const payload = req.body;
    const headers = req.headers;

    // Zoom webhook validation
    if (payload.event === 'endpoint.url_validation') {
        // Return the plainToken in the response for validation
        return res.status(200).json({
            plainToken: payload.payload.plainToken,
            encryptedToken: payload.payload.encryptedToken
        });
    }

    await zoomService.handleWebhook(payload, headers);

    // Zoom expects 200 OK response
    res.status(200).send('OK');
});

module.exports = {
    // OAuth
    getAuthUrl,
    handleCallback,
    disconnect,
    getStatus,

    // Meeting operations
    createMeeting,
    getMeeting,
    listMeetings,
    updateMeeting,
    deleteMeeting,
    getRecordings,

    // Settings
    updateSettings,
    testConnection,

    // Webhook
    handleWebhook
};
