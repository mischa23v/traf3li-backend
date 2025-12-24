const UnifiedTimelineService = require('../services/unifiedTimeline.service');
const { sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');
const CustomException = require('../utils/CustomException');

/**
 * Timeline Controller
 *
 * Handles unified timeline endpoints for entity activity history.
 * Aggregates activities from multiple sources (Activity, CrmActivity, Case, Invoice, etc.)
 * into a unified chronological view.
 */

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate entity type
 * @param {String} entityType - Entity type to validate
 * @returns {Boolean} Is valid
 */
const validateEntityType = (entityType) => {
    const validEntityTypes = ['client', 'contact', 'lead', 'case', 'organization'];
    return validEntityTypes.includes(entityType);
};

/**
 * Validate and parse query parameters
 * @param {Object} query - Request query parameters
 * @returns {Object} Validated options
 */
const parseQueryOptions = (query) => {
    const options = {};

    // Parse limit
    if (query.limit) {
        const limit = parseInt(query.limit, 10);
        if (isNaN(limit) || limit < 1 || limit > 200) {
            throw new CustomException('Invalid limit parameter. Must be between 1 and 200', 400);
        }
        options.limit = limit;
    }

    // Parse cursor for pagination
    if (query.cursor) {
        const cursorDate = new Date(query.cursor);
        if (isNaN(cursorDate.getTime())) {
            throw new CustomException('Invalid cursor parameter. Must be a valid date', 400);
        }
        options.cursor = cursorDate;
    }

    // Parse date filters
    if (query.dateFrom) {
        const dateFrom = new Date(query.dateFrom);
        if (isNaN(dateFrom.getTime())) {
            throw new CustomException('Invalid dateFrom parameter. Must be a valid date', 400);
        }
        options.dateFrom = dateFrom;
    }

    if (query.dateTo) {
        const dateTo = new Date(query.dateTo);
        if (isNaN(dateTo.getTime())) {
            throw new CustomException('Invalid dateTo parameter. Must be a valid date', 400);
        }
        options.dateTo = dateTo;
    }

    // Validate date range
    if (options.dateFrom && options.dateTo && options.dateFrom > options.dateTo) {
        throw new CustomException('dateFrom cannot be after dateTo', 400);
    }

    // Parse types filter (comma-separated string to array)
    if (query.types) {
        const types = query.types.split(',').map(t => t.trim()).filter(t => t);
        if (types.length > 0) {
            options.types = types;
        }
    }

    return options;
};

// ============================================
// CONTROLLER METHODS
// ============================================

/**
 * Get unified timeline for an entity
 * GET /api/timeline/:entityType/:entityId
 *
 * Query params:
 * - limit: Number of items per page (default: 50, max: 200)
 * - cursor: Pagination cursor (ISO date string)
 * - dateFrom: Filter activities from this date (ISO date string)
 * - dateTo: Filter activities to this date (ISO date string)
 * - types: Comma-separated activity types (e.g., "call,email,meeting")
 */
const getTimeline = async (req, res) => {
    try {
        const { entityType, entityId } = req.params;
        const userId = req.userID;
        const firmId = req.firmId || req.user?.firmId;

        // Validate entity type
        if (!validateEntityType(entityType)) {
            return res.status(400).json({
                success: false,
                message: `Invalid entity type. Must be one of: client, contact, lead, case, organization`
            });
        }

        // Validate entity ID format
        const sanitizedEntityId = sanitizeObjectId(entityId);
        if (!sanitizedEntityId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid entity ID format'
            });
        }

        // Parse and validate query parameters
        let options;
        try {
            options = parseQueryOptions(req.query);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        // Add firmId to options for multi-tenancy filtering
        if (firmId) {
            options.firmId = firmId;
        }

        // TODO: Add IDOR protection - verify entity ownership
        // This should verify that the user has access to the specified entity
        // For now, the service will filter by firmId

        logger.info('Getting timeline', {
            userId,
            entityType,
            entityId: sanitizedEntityId,
            options
        });

        // Get timeline from service
        const timeline = await UnifiedTimelineService.getTimeline(
            entityType,
            sanitizedEntityId,
            options
        );

        return res.status(200).json({
            success: true,
            data: {
                items: timeline.items,
                pagination: {
                    hasMore: timeline.hasMore,
                    nextCursor: timeline.nextCursor,
                    total: timeline.total
                }
            }
        });
    } catch (error) {
        logger.error('Timeline controller - getTimeline error:', error);

        // Handle specific error types
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid ID format'
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve timeline'
        });
    }
};

/**
 * Get timeline summary for an entity
 * GET /api/timeline/:entityType/:entityId/summary
 *
 * Query params:
 * - dateFrom: Filter activities from this date (ISO date string)
 * - dateTo: Filter activities to this date (ISO date string)
 */
const getTimelineSummary = async (req, res) => {
    try {
        const { entityType, entityId } = req.params;
        const userId = req.userID;
        const firmId = req.firmId || req.user?.firmId;

        // Validate entity type
        if (!validateEntityType(entityType)) {
            return res.status(400).json({
                success: false,
                message: `Invalid entity type. Must be one of: client, contact, lead, case, organization`
            });
        }

        // Validate entity ID format
        const sanitizedEntityId = sanitizeObjectId(entityId);
        if (!sanitizedEntityId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid entity ID format'
            });
        }

        // Parse date filters
        const options = {};
        if (req.query.dateFrom) {
            const dateFrom = new Date(req.query.dateFrom);
            if (isNaN(dateFrom.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid dateFrom parameter. Must be a valid date'
                });
            }
            options.dateFrom = dateFrom;
        }

        if (req.query.dateTo) {
            const dateTo = new Date(req.query.dateTo);
            if (isNaN(dateTo.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid dateTo parameter. Must be a valid date'
                });
            }
            options.dateTo = dateTo;
        }

        // Validate date range
        if (options.dateFrom && options.dateTo && options.dateFrom > options.dateTo) {
            return res.status(400).json({
                success: false,
                message: 'dateFrom cannot be after dateTo'
            });
        }

        // TODO: Add IDOR protection - verify entity ownership
        // This should verify that the user has access to the specified entity

        logger.info('Getting timeline summary', {
            userId,
            entityType,
            entityId: sanitizedEntityId,
            options
        });

        // Get timeline summary from service
        const summary = await UnifiedTimelineService.getTimelineSummary(
            entityType,
            sanitizedEntityId,
            firmId,
            options
        );

        return res.status(200).json({
            success: true,
            data: summary
        });
    } catch (error) {
        logger.error('Timeline controller - getTimelineSummary error:', error);

        // Handle specific error types
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid ID format'
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve timeline summary'
        });
    }
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
    getTimeline,
    getTimelineSummary
};
