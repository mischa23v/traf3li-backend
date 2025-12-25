const SupportService = require('../services/support.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

/**
 * Get firmId from user context
 */
const getFirmId = (req) => {
    return req.firmId || req.user?.firmId || null;
};

// ═══════════════════════════════════════════════════════════════
// TICKET MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Get tickets with filters
 * GET /api/support/tickets
 */
const getTickets = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);
    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    const query = {
        status: req.query.status,
        priority: req.query.priority,
        ticketType: req.query.ticketType,
        assignedTo: req.query.assignedTo ? sanitizeObjectId(req.query.assignedTo) : undefined,
        raisedBy: req.query.raisedBy ? sanitizeObjectId(req.query.raisedBy) : undefined,
        clientId: req.query.clientId ? sanitizeObjectId(req.query.clientId) : undefined,
        search: req.query.search,
        page: req.query.page,
        limit: req.query.limit,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder
    };

    // Remove undefined values
    Object.keys(query).forEach(key => query[key] === undefined && delete query[key]);

    const result = await SupportService.getTickets(query, firmId);

    res.status(200).json({
        success: true,
        data: result.tickets,
        pagination: result.pagination
    });
});

/**
 * Get single ticket
 * GET /api/support/tickets/:id
 */
const getTicket = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid ticket ID', 400);
    }

    const ticket = await SupportService.getTicketById(sanitizedId, firmId);

    res.status(200).json({
        success: true,
        data: ticket
    });
});

/**
 * Create ticket
 * POST /api/support/tickets
 */
const createTicket = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    // Mass assignment protection
    const allowedFields = [
        'subject',
        'description',
        'priority',
        'ticketType',
        'raisedBy',
        'clientId',
        'tags',
        'customFields'
    ];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Validate required fields
    if (!sanitizedData.subject || typeof sanitizedData.subject !== 'string') {
        throw CustomException('Subject is required and must be a string', 400);
    }

    if (!sanitizedData.description || typeof sanitizedData.description !== 'string') {
        throw CustomException('Description is required and must be a string', 400);
    }

    // Validate subject and description length
    const trimmedSubject = sanitizedData.subject.trim();
    if (trimmedSubject.length < 3) {
        throw CustomException('Subject must be at least 3 characters', 400);
    }
    if (trimmedSubject.length > 500) {
        throw CustomException('Subject must not exceed 500 characters', 400);
    }

    const trimmedDescription = sanitizedData.description.trim();
    if (trimmedDescription.length < 10) {
        throw CustomException('Description must be at least 10 characters', 400);
    }
    if (trimmedDescription.length > 10000) {
        throw CustomException('Description must not exceed 10000 characters', 400);
    }

    sanitizedData.subject = trimmedSubject;
    sanitizedData.description = trimmedDescription;

    // Sanitize ObjectIds
    if (sanitizedData.raisedBy) {
        sanitizedData.raisedBy = sanitizeObjectId(sanitizedData.raisedBy);
    } else {
        // Default to current user if not provided
        sanitizedData.raisedBy = userId;
    }

    if (sanitizedData.clientId) {
        sanitizedData.clientId = sanitizeObjectId(sanitizedData.clientId);
    }

    // Validate priority
    if (sanitizedData.priority) {
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (!validPriorities.includes(sanitizedData.priority)) {
            throw CustomException('Invalid priority. Must be: low, medium, high, or urgent', 400);
        }
    }

    // Validate ticketType
    if (sanitizedData.ticketType) {
        const validTypes = ['question', 'problem', 'feature_request', 'incident', 'service_request'];
        if (!validTypes.includes(sanitizedData.ticketType)) {
            throw CustomException('Invalid ticket type', 400);
        }
    }

    const ticket = await SupportService.createTicket(sanitizedData, firmId, userId);

    res.status(201).json({
        success: true,
        message: 'Ticket created successfully',
        data: ticket
    });
});

/**
 * Update ticket
 * PUT /api/support/tickets/:id
 */
const updateTicket = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid ticket ID', 400);
    }

    // Mass assignment protection
    const allowedFields = [
        'subject',
        'description',
        'priority',
        'ticketType',
        'status',
        'tags',
        'customFields'
    ];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Validate subject if provided
    if (sanitizedData.subject) {
        if (typeof sanitizedData.subject !== 'string') {
            throw CustomException('Subject must be a string', 400);
        }
        const trimmedSubject = sanitizedData.subject.trim();
        if (trimmedSubject.length < 3 || trimmedSubject.length > 500) {
            throw CustomException('Subject must be between 3 and 500 characters', 400);
        }
        sanitizedData.subject = trimmedSubject;
    }

    // Validate description if provided
    if (sanitizedData.description) {
        if (typeof sanitizedData.description !== 'string') {
            throw CustomException('Description must be a string', 400);
        }
        const trimmedDescription = sanitizedData.description.trim();
        if (trimmedDescription.length < 10 || trimmedDescription.length > 10000) {
            throw CustomException('Description must be between 10 and 10000 characters', 400);
        }
        sanitizedData.description = trimmedDescription;
    }

    // Validate priority if provided
    if (sanitizedData.priority) {
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (!validPriorities.includes(sanitizedData.priority)) {
            throw CustomException('Invalid priority', 400);
        }
    }

    // Validate status if provided
    if (sanitizedData.status) {
        const validStatuses = ['open', 'replied', 'resolved', 'closed', 'on_hold'];
        if (!validStatuses.includes(sanitizedData.status)) {
            throw CustomException('Invalid status', 400);
        }
    }

    // Validate ticketType if provided
    if (sanitizedData.ticketType) {
        const validTypes = ['question', 'problem', 'feature_request', 'incident', 'service_request'];
        if (!validTypes.includes(sanitizedData.ticketType)) {
            throw CustomException('Invalid ticket type', 400);
        }
    }

    const ticket = await SupportService.updateTicket(sanitizedId, sanitizedData, firmId, userId);

    res.status(200).json({
        success: true,
        message: 'Ticket updated successfully',
        data: ticket
    });
});

/**
 * Delete ticket
 * DELETE /api/support/tickets/:id
 */
const deleteTicket = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid ticket ID', 400);
    }

    await SupportService.deleteTicket(sanitizedId, firmId);

    res.status(200).json({
        success: true,
        message: 'Ticket deleted successfully'
    });
});

/**
 * Reply to ticket
 * POST /api/support/tickets/:id/reply
 */
const replyToTicket = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid ticket ID', 400);
    }

    // Mass assignment protection
    const allowedFields = ['content'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    if (!sanitizedData.content || typeof sanitizedData.content !== 'string') {
        throw CustomException('Reply content is required and must be a string', 400);
    }

    const trimmedContent = sanitizedData.content.trim();
    if (trimmedContent.length < 1) {
        throw CustomException('Reply content cannot be empty', 400);
    }
    if (trimmedContent.length > 10000) {
        throw CustomException('Reply content must not exceed 10000 characters', 400);
    }

    const ticket = await SupportService.replyToTicket(sanitizedId, trimmedContent, userId, firmId);

    res.status(200).json({
        success: true,
        message: 'Reply added successfully',
        data: ticket
    });
});

/**
 * Resolve ticket
 * POST /api/support/tickets/:id/resolve
 */
const resolveTicket = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid ticket ID', 400);
    }

    const ticket = await SupportService.resolveTicket(sanitizedId, firmId, userId);

    res.status(200).json({
        success: true,
        message: 'Ticket resolved successfully',
        data: ticket
    });
});

/**
 * Close ticket
 * POST /api/support/tickets/:id/close
 */
const closeTicket = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid ticket ID', 400);
    }

    const ticket = await SupportService.closeTicket(sanitizedId, firmId, userId);

    res.status(200).json({
        success: true,
        message: 'Ticket closed successfully',
        data: ticket
    });
});

// ═══════════════════════════════════════════════════════════════
// SLA MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Get SLAs
 * GET /api/support/slas
 */
const getSLAs = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    const slas = await SupportService.getSLAs(firmId);

    res.status(200).json({
        success: true,
        data: slas
    });
});

/**
 * Get single SLA
 * GET /api/support/slas/:id
 */
const getSLA = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid SLA ID', 400);
    }

    const sla = await SupportService.getSLAById(sanitizedId, firmId);

    res.status(200).json({
        success: true,
        data: sla
    });
});

/**
 * Create SLA
 * POST /api/support/slas
 */
const createSLA = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    // Mass assignment protection
    const allowedFields = [
        'name',
        'nameAr',
        'description',
        'descriptionAr',
        'priority',
        'supportType',
        'firstResponseMinutes',
        'resolutionMinutes',
        'workingHours',
        'workingDays',
        'holidays',
        'warningThreshold',
        'isDefault',
        'applicableTicketTypes',
        'applicableChannels',
        'escalationEnabled',
        'escalationLevels'
    ];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Validate required fields
    if (!sanitizedData.name || typeof sanitizedData.name !== 'string') {
        throw CustomException('SLA name is required and must be a string', 400);
    }

    if (!sanitizedData.priority) {
        throw CustomException('Priority is required', 400);
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(sanitizedData.priority)) {
        throw CustomException('Invalid priority', 400);
    }

    if (!sanitizedData.firstResponseMinutes || typeof sanitizedData.firstResponseMinutes !== 'number') {
        throw CustomException('First response minutes is required and must be a number', 400);
    }

    if (!sanitizedData.resolutionMinutes || typeof sanitizedData.resolutionMinutes !== 'number') {
        throw CustomException('Resolution minutes is required and must be a number', 400);
    }

    if (sanitizedData.firstResponseMinutes <= 0) {
        throw CustomException('First response minutes must be greater than 0', 400);
    }

    if (sanitizedData.resolutionMinutes <= 0) {
        throw CustomException('Resolution minutes must be greater than 0', 400);
    }

    const sla = await SupportService.createSLA(sanitizedData, firmId, userId);

    res.status(201).json({
        success: true,
        message: 'SLA created successfully',
        data: sla
    });
});

/**
 * Update SLA
 * PUT /api/support/slas/:id
 */
const updateSLA = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid SLA ID', 400);
    }

    // Mass assignment protection
    const allowedFields = [
        'name',
        'nameAr',
        'description',
        'descriptionAr',
        'priority',
        'supportType',
        'firstResponseMinutes',
        'resolutionMinutes',
        'workingHours',
        'workingDays',
        'holidays',
        'warningThreshold',
        'isDefault',
        'status',
        'applicableTicketTypes',
        'applicableChannels',
        'escalationEnabled',
        'escalationLevels'
    ];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Validate priority if provided
    if (sanitizedData.priority) {
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (!validPriorities.includes(sanitizedData.priority)) {
            throw CustomException('Invalid priority', 400);
        }
    }

    // Validate status if provided
    if (sanitizedData.status) {
        const validStatuses = ['active', 'inactive'];
        if (!validStatuses.includes(sanitizedData.status)) {
            throw CustomException('Invalid status', 400);
        }
    }

    // Validate minutes if provided
    if (sanitizedData.firstResponseMinutes !== undefined) {
        if (typeof sanitizedData.firstResponseMinutes !== 'number' || sanitizedData.firstResponseMinutes <= 0) {
            throw CustomException('First response minutes must be a positive number', 400);
        }
    }

    if (sanitizedData.resolutionMinutes !== undefined) {
        if (typeof sanitizedData.resolutionMinutes !== 'number' || sanitizedData.resolutionMinutes <= 0) {
            throw CustomException('Resolution minutes must be a positive number', 400);
        }
    }

    const sla = await SupportService.updateSLA(sanitizedId, sanitizedData, firmId, userId);

    res.status(200).json({
        success: true,
        message: 'SLA updated successfully',
        data: sla
    });
});

/**
 * Delete SLA
 * DELETE /api/support/slas/:id
 */
const deleteSLA = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid SLA ID', 400);
    }

    await SupportService.deleteSLA(sanitizedId, firmId);

    res.status(200).json({
        success: true,
        message: 'SLA deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// STATISTICS & SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * Get statistics
 * GET /api/support/stats
 */
const getStats = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    const stats = await SupportService.getStats(firmId);

    res.status(200).json({
        success: true,
        data: stats
    });
});

/**
 * Get settings
 * GET /api/support/settings
 */
const getSettings = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    const settings = await SupportService.getSettings(firmId);

    res.status(200).json({
        success: true,
        data: settings
    });
});

/**
 * Update settings
 * PUT /api/support/settings
 */
const updateSettings = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    // Mass assignment protection
    const allowedFields = [
        'defaultSlaId',
        'autoAssignTickets',
        'defaultAssignee',
        'ticketPrefixFormat',
        'ticketNumberingStartFrom',
        'emailNotifications',
        'workingHours',
        'workingDays',
        'holidays',
        'customerPortal',
        'automation',
        'defaultPriority',
        'priorityEscalation',
        'enabledTicketTypes',
        'defaultTags',
        'requiredFields',
        'integrations',
        'branding',
        'allowDuplicateTickets',
        'duplicateDetectionEnabled',
        'mergeTicketsEnabled',
        'internalNotesEnabled'
    ];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Sanitize ObjectIds if present
    if (sanitizedData.defaultSlaId) {
        sanitizedData.defaultSlaId = sanitizeObjectId(sanitizedData.defaultSlaId);
    }

    if (sanitizedData.defaultAssignee) {
        sanitizedData.defaultAssignee = sanitizeObjectId(sanitizedData.defaultAssignee);
    }

    // Validate defaultPriority if provided
    if (sanitizedData.defaultPriority) {
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (!validPriorities.includes(sanitizedData.defaultPriority)) {
            throw CustomException('Invalid default priority', 400);
        }
    }

    const settings = await SupportService.updateSettings(sanitizedData, firmId, userId);

    res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        data: settings
    });
});

module.exports = {
    // Ticket CRUD
    getTickets,
    getTicket,
    createTicket,
    updateTicket,
    deleteTicket,

    // Ticket actions
    replyToTicket,
    resolveTicket,
    closeTicket,

    // SLA CRUD
    getSLAs,
    getSLA,
    createSLA,
    updateSLA,
    deleteSLA,

    // Stats & Settings
    getStats,
    getSettings,
    updateSettings
};
