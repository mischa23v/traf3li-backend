/**
 * Analytics Controller
 *
 * Handles analytics endpoints for event tracking and analytics queries.
 */

const AnalyticsService = require('../services/analytics.service');
const AnalyticsEvent = require('../models/analyticsEvent.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

/**
 * Track event (from frontend)
 * POST /api/analytics/events
 */
const trackEvent = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection
    const allowedFields = ['eventType', 'eventName', 'properties', 'metadata', 'duration'];
    const eventData = pickAllowedFields(req.body, allowedFields);

    // Validation
    if (!eventData.eventType || !eventData.eventName) {
        throw CustomException('Event type and name are required', 400);
    }

    // Validate event type
    const validEventTypes = [
        'page_view', 'feature_used', 'action_completed', 'error',
        'api_call', 'search', 'form_submit', 'login', 'logout',
        'signup', 'user_action', 'custom'
    ];

    if (!validEventTypes.includes(eventData.eventType)) {
        throw CustomException('Invalid event type', 400);
    }

    // Track the event
    const event = await AnalyticsService.trackEvent(
        eventData.eventType,
        eventData.eventName,
        userId,
        firmId,
        eventData.properties || {},
        {
            ...eventData.metadata,
            userAgent: req.headers['user-agent'],
            ip: req.ip || req.headers['x-forwarded-for']?.split(',')[0],
            sessionId: req.sessionID
        }
    );

    if (!event) {
        throw CustomException('Failed to track event', 500);
    }

    res.status(201).json({
        success: true,
        message: 'Event tracked successfully',
        data: { eventId: event._id }
    });
});

/**
 * Get analytics dashboard
 * GET /api/analytics/dashboard
 */
const getDashboard = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { start, end } = req.query;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    const dateRange = {};
    if (start) dateRange.start = new Date(start);
    if (end) dateRange.end = new Date(end);

    const dashboard = await AnalyticsService.getAnalyticsSummary(firmId, dateRange);

    if (!dashboard) {
        throw CustomException('Failed to fetch dashboard data', 500);
    }

    res.status(200).json({
        success: true,
        data: dashboard
    });
});

/**
 * Get feature usage stats
 * GET /api/analytics/features
 */
const getFeatureUsage = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { start, end } = req.query;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    const dateRange = {};
    if (start) dateRange.start = new Date(start);
    if (end) dateRange.end = new Date(end);

    const features = await AnalyticsService.getFeatureUsageStats(firmId, dateRange);

    res.status(200).json({
        success: true,
        data: features,
        count: features.length
    });
});

/**
 * Get engagement metrics
 * GET /api/analytics/engagement
 */
const getEngagement = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { start, end } = req.query;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    const dateRange = {};
    if (start) dateRange.start = new Date(start);
    if (end) dateRange.end = new Date(end);

    const engagement = await AnalyticsService.getUserEngagementMetrics(firmId, dateRange);

    res.status(200).json({
        success: true,
        data: engagement
    });
});

/**
 * Get funnel analysis
 * GET /api/analytics/funnel
 */
const getFunnel = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { steps, start, end } = req.query;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    if (!steps) {
        throw CustomException('Funnel steps are required', 400);
    }

    // Parse steps (comma-separated string or JSON array)
    let funnelSteps = [];
    try {
        funnelSteps = typeof steps === 'string'
            ? (steps.startsWith('[') ? JSON.parse(steps) : steps.split(','))
            : steps;
    } catch (error) {
        throw CustomException('Invalid funnel steps format', 400);
    }

    const dateRange = {};
    if (start) dateRange.start = new Date(start);
    if (end) dateRange.end = new Date(end);

    const funnel = await AnalyticsService.getFunnelAnalysis(firmId, funnelSteps, dateRange);

    res.status(200).json({
        success: true,
        data: funnel
    });
});

/**
 * Get retention cohorts
 * GET /api/analytics/retention
 */
const getRetention = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { start, end } = req.query;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    const dateRange = {};
    if (start) dateRange.start = new Date(start);
    if (end) dateRange.end = new Date(end);

    const retention = await AnalyticsService.getRetentionCohorts(firmId, dateRange);

    res.status(200).json({
        success: true,
        data: retention,
        count: retention.length
    });
});

/**
 * Get user journey
 * GET /api/analytics/users/:userId/journey
 */
const getUserJourney = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const firmId = req.firmId;
    const { start, end } = req.query;

    // Sanitize user ID
    const sanitizedUserId = sanitizeObjectId(userId);

    // IDOR protection - verify user belongs to same firm
    const requestingUserId = req.userID;
    if (sanitizedUserId !== requestingUserId) {
        // Only admins/owners can view other users' journeys
        const User = require('../models/user.model');
        const requestingUser = await User.findById(requestingUserId).lean();

        if (!requestingUser || requestingUser.firmRole !== 'owner' && requestingUser.firmRole !== 'admin') {
            throw CustomException('Unauthorized to view this user journey', 403);
        }
    }

    const dateRange = {};
    if (start) dateRange.start = new Date(start);
    if (end) dateRange.end = new Date(end);

    const journey = await AnalyticsService.getUserJourney(sanitizedUserId, dateRange);

    res.status(200).json({
        success: true,
        data: journey,
        count: journey.length
    });
});

/**
 * Get event counts
 * GET /api/analytics/events/counts
 */
const getEventCounts = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { eventType, start, end } = req.query;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    const dateRange = {};
    if (start) dateRange.start = new Date(start);
    if (end) dateRange.end = new Date(end);

    const counts = await AnalyticsService.getEventCounts(firmId, eventType, dateRange);

    res.status(200).json({
        success: true,
        data: counts
    });
});

/**
 * Get popular features
 * GET /api/analytics/features/popular
 */
const getPopularFeatures = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { start, end, limit = 10 } = req.query;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    const dateRange = {};
    if (start) dateRange.start = new Date(start);
    if (end) dateRange.end = new Date(end);

    const features = await AnalyticsService.getPopularFeatures(
        firmId,
        dateRange,
        parseInt(limit)
    );

    res.status(200).json({
        success: true,
        data: features,
        count: features.length
    });
});

/**
 * Get dropoff points
 * GET /api/analytics/dropoff
 */
const getDropoffPoints = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { workflow, start, end } = req.query;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    if (!workflow) {
        throw CustomException('Workflow steps are required', 400);
    }

    // Parse workflow (comma-separated string or JSON array)
    let workflowSteps = [];
    try {
        workflowSteps = typeof workflow === 'string'
            ? (workflow.startsWith('[') ? JSON.parse(workflow) : workflow.split(','))
            : workflow;
    } catch (error) {
        throw CustomException('Invalid workflow format', 400);
    }

    const dateRange = {};
    if (start) dateRange.start = new Date(start);
    if (end) dateRange.end = new Date(end);

    const dropoffs = await AnalyticsService.getDropoffPoints(firmId, workflowSteps, dateRange);

    res.status(200).json({
        success: true,
        data: dropoffs,
        count: dropoffs.length
    });
});

/**
 * Export analytics data
 * GET /api/analytics/export
 */
const exportAnalytics = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { eventType, start, end, format = 'json' } = req.query;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    // Parse date range
    const dateRange = {
        start: start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: end ? new Date(end) : new Date()
    };

    // Build query
    const query = {
        firmId: sanitizeObjectId(firmId),
        timestamp: { $gte: dateRange.start, $lte: dateRange.end }
    };

    if (eventType) {
        query.eventType = eventType;
    }

    // Fetch events
    const events = await AnalyticsEvent.find(query)
        .select('-__v')
        .sort({ timestamp: -1 })
        .limit(10000)
        .lean();

    // Format response based on requested format
    if (format === 'csv') {
        // Convert to CSV
        const csv = convertToCSV(events);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=analytics-${Date.now()}.csv`);
        res.status(200).send(csv);
    } else {
        // Return JSON
        res.status(200).json({
            success: true,
            data: events,
            count: events.length,
            dateRange
        });
    }
});

/**
 * Convert events to CSV format
 * @private
 */
function convertToCSV(events) {
    if (events.length === 0) return '';

    const headers = ['timestamp', 'eventType', 'eventName', 'userId', 'firmId', 'sessionId', 'duration'];
    const rows = events.map(event => {
        return [
            event.timestamp,
            event.eventType,
            event.eventName,
            event.userId || '',
            event.firmId || '',
            event.sessionId || '',
            event.duration || ''
        ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
}

module.exports = {
    trackEvent,
    getDashboard,
    getFeatureUsage,
    getEngagement,
    getFunnel,
    getRetention,
    getUserJourney,
    getEventCounts,
    getPopularFeatures,
    getDropoffPoints,
    exportAnalytics
};
