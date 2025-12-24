const disputeService = require('../services/dispute.service');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

/**
 * Create a new dispute
 * POST /api/disputes
 */
const createDispute = async (request, response) => {
    try {
        // Mass Assignment Protection
        const allowedFields = [
            'firmId',
            'caseId',
            'paymentId',
            'clientId',
            'lawyerId',
            'type',
            'priority',
            'description',
            'clientEvidence'
        ];
        const sanitizedBody = pickAllowedFields(request.body, allowedFields);

        // Input Validation - Required Fields
        if (!sanitizedBody.clientId) {
            throw CustomException('Client ID is required', 400);
        }
        if (!sanitizedBody.lawyerId) {
            throw CustomException('Lawyer ID is required', 400);
        }
        if (!sanitizedBody.type) {
            throw CustomException('Dispute type is required', 400);
        }
        if (!sanitizedBody.description || typeof sanitizedBody.description !== 'string') {
            throw CustomException('Description is required and must be a string', 400);
        }

        // Sanitize ObjectIds
        if (sanitizedBody.firmId) {
            sanitizedBody.firmId = sanitizeObjectId(sanitizedBody.firmId);
        }
        if (sanitizedBody.caseId) {
            sanitizedBody.caseId = sanitizeObjectId(sanitizedBody.caseId);
        }
        if (sanitizedBody.paymentId) {
            sanitizedBody.paymentId = sanitizeObjectId(sanitizedBody.paymentId);
        }
        sanitizedBody.clientId = sanitizeObjectId(sanitizedBody.clientId);
        sanitizedBody.lawyerId = sanitizeObjectId(sanitizedBody.lawyerId);

        // Validate description length
        const trimmedDescription = sanitizedBody.description.trim();
        if (trimmedDescription.length < 10) {
            throw CustomException('Description must be at least 10 characters', 400);
        }
        if (trimmedDescription.length > 5000) {
            throw CustomException('Description must not exceed 5000 characters', 400);
        }
        sanitizedBody.description = trimmedDescription;

        // Validate type
        const validTypes = ['service_quality', 'payment', 'communication', 'scope', 'other'];
        if (!validTypes.includes(sanitizedBody.type)) {
            throw CustomException('Invalid dispute type', 400);
        }

        // Validate priority if provided
        if (sanitizedBody.priority) {
            const validPriorities = ['low', 'medium', 'high', 'urgent'];
            if (!validPriorities.includes(sanitizedBody.priority)) {
                throw CustomException('Invalid priority', 400);
            }
        }

        // Create dispute
        const dispute = await disputeService.createDispute(sanitizedBody, request.userID);

        return response.status(201).send({
            error: false,
            message: 'Dispute created successfully',
            dispute
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error creating dispute:', message);
        return response.status(status).send({
            error: true,
            message
        });
    }
};

/**
 * Get disputes with filters
 * GET /api/disputes
 */
const getDisputes = async (request, response) => {
    try {
        const filters = {};
        const options = {};

        // Extract filters from query
        if (request.query.firmId) {
            filters.firmId = sanitizeObjectId(request.query.firmId);
        }
        if (request.query.status) {
            filters.status = request.query.status;
        }
        if (request.query.type) {
            filters.type = request.query.type;
        }
        if (request.query.priority) {
            filters.priority = request.query.priority;
        }
        if (request.query.clientId) {
            filters.clientId = sanitizeObjectId(request.query.clientId);
        }
        if (request.query.lawyerId) {
            filters.lawyerId = sanitizeObjectId(request.query.lawyerId);
        }
        if (request.query.mediatorId) {
            filters.mediatorId = sanitizeObjectId(request.query.mediatorId);
        }
        if (request.query.caseId) {
            filters.caseId = sanitizeObjectId(request.query.caseId);
        }
        if (request.query.paymentId) {
            filters.paymentId = sanitizeObjectId(request.query.paymentId);
        }
        if (request.query.startDate) {
            filters.startDate = request.query.startDate;
        }
        if (request.query.endDate) {
            filters.endDate = request.query.endDate;
        }

        // Extract pagination options
        if (request.query.page) {
            options.page = parseInt(request.query.page, 10);
        }
        if (request.query.limit) {
            options.limit = parseInt(request.query.limit, 10);
        }
        if (request.query.sortBy) {
            options.sortBy = request.query.sortBy;
        }
        if (request.query.sortOrder) {
            options.sortOrder = request.query.sortOrder;
        }

        const result = await disputeService.getDisputes(filters, options);

        return response.status(200).send({
            error: false,
            ...result
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error fetching disputes:', message);
        return response.status(status).send({
            error: true,
            message
        });
    }
};

/**
 * Get dispute by ID
 * GET /api/disputes/:id
 */
const getDisputeById = async (request, response) => {
    try {
        const { id } = request.params;

        if (!id) {
            throw CustomException('Dispute ID is required', 400);
        }

        const disputeId = sanitizeObjectId(id);
        const dispute = await disputeService.getDisputeById(disputeId);

        return response.status(200).send({
            error: false,
            dispute
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error fetching dispute:', message);
        return response.status(status).send({
            error: true,
            message
        });
    }
};

/**
 * Lawyer responds to dispute
 * POST /api/disputes/:id/respond
 */
const lawyerRespond = async (request, response) => {
    try {
        const { id } = request.params;

        if (!id) {
            throw CustomException('Dispute ID is required', 400);
        }

        const disputeId = sanitizeObjectId(id);

        // Mass Assignment Protection
        const allowedFields = ['response', 'evidence'];
        const sanitizedBody = pickAllowedFields(request.body, allowedFields);

        if (!sanitizedBody.response || typeof sanitizedBody.response !== 'string') {
            throw CustomException('Response is required and must be a string', 400);
        }

        // Validate response length
        const trimmedResponse = sanitizedBody.response.trim();
        if (trimmedResponse.length < 10) {
            throw CustomException('Response must be at least 10 characters', 400);
        }
        if (trimmedResponse.length > 5000) {
            throw CustomException('Response must not exceed 5000 characters', 400);
        }

        const responseData = {
            response: trimmedResponse,
            evidence: sanitizedBody.evidence || []
        };

        const dispute = await disputeService.lawyerRespond(
            disputeId,
            responseData,
            request.userID
        );

        return response.status(200).send({
            error: false,
            message: 'Response submitted successfully',
            dispute
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error submitting lawyer response:', message);
        return response.status(status).send({
            error: true,
            message
        });
    }
};

/**
 * Escalate dispute
 * POST /api/disputes/:id/escalate
 */
const escalateDispute = async (request, response) => {
    try {
        const { id } = request.params;

        if (!id) {
            throw CustomException('Dispute ID is required', 400);
        }

        const disputeId = sanitizeObjectId(id);

        // Mass Assignment Protection
        const allowedFields = ['reason', 'mediatorId'];
        const sanitizedBody = pickAllowedFields(request.body, allowedFields);

        if (!sanitizedBody.reason || typeof sanitizedBody.reason !== 'string') {
            throw CustomException('Escalation reason is required and must be a string', 400);
        }

        // Validate reason length
        const trimmedReason = sanitizedBody.reason.trim();
        if (trimmedReason.length < 10) {
            throw CustomException('Reason must be at least 10 characters', 400);
        }
        if (trimmedReason.length > 1000) {
            throw CustomException('Reason must not exceed 1000 characters', 400);
        }

        const escalationData = {
            reason: trimmedReason,
            mediatorId: sanitizedBody.mediatorId
                ? sanitizeObjectId(sanitizedBody.mediatorId)
                : null
        };

        const dispute = await disputeService.escalateDispute(
            disputeId,
            escalationData,
            request.userID
        );

        return response.status(200).send({
            error: false,
            message: 'Dispute escalated successfully',
            dispute
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error escalating dispute:', message);
        return response.status(status).send({
            error: true,
            message
        });
    }
};

/**
 * Resolve dispute (admin/mediator only)
 * POST /api/disputes/:id/resolve
 */
const resolveDispute = async (request, response) => {
    try {
        const { id } = request.params;

        if (!id) {
            throw CustomException('Dispute ID is required', 400);
        }

        const disputeId = sanitizeObjectId(id);

        // Mass Assignment Protection
        const allowedFields = ['outcome', 'refundAmount', 'description'];
        const sanitizedBody = pickAllowedFields(request.body, allowedFields);

        if (!sanitizedBody.outcome) {
            throw CustomException('Resolution outcome is required', 400);
        }

        // Validate outcome
        const validOutcomes = [
            'client_favor',
            'lawyer_favor',
            'partial_refund',
            'full_refund',
            'no_action'
        ];
        if (!validOutcomes.includes(sanitizedBody.outcome)) {
            throw CustomException('Invalid resolution outcome', 400);
        }

        // Validate refund amount if provided
        if (sanitizedBody.refundAmount !== undefined) {
            const refundAmount = parseFloat(sanitizedBody.refundAmount);
            if (isNaN(refundAmount) || refundAmount < 0) {
                throw CustomException('Refund amount must be a positive number', 400);
            }
            sanitizedBody.refundAmount = refundAmount;
        }

        // Validate description if provided
        if (sanitizedBody.description) {
            if (typeof sanitizedBody.description !== 'string') {
                throw CustomException('Description must be a string', 400);
            }
            if (sanitizedBody.description.length > 2000) {
                throw CustomException('Description must not exceed 2000 characters', 400);
            }
        }

        const dispute = await disputeService.resolveDispute(
            disputeId,
            sanitizedBody,
            request.userID
        );

        return response.status(200).send({
            error: false,
            message: 'Dispute resolved successfully',
            dispute
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error resolving dispute:', message);
        return response.status(status).send({
            error: true,
            message
        });
    }
};

/**
 * Add evidence to dispute
 * POST /api/disputes/:id/evidence
 */
const addEvidence = async (request, response) => {
    try {
        const { id } = request.params;

        if (!id) {
            throw CustomException('Dispute ID is required', 400);
        }

        const disputeId = sanitizeObjectId(id);

        // Mass Assignment Protection
        const allowedFields = ['type', 'url', 'filename', 'fileKey', 'description', 'userRole'];
        const sanitizedBody = pickAllowedFields(request.body, allowedFields);

        if (!sanitizedBody.url || typeof sanitizedBody.url !== 'string') {
            throw CustomException('Evidence URL is required', 400);
        }

        if (!sanitizedBody.userRole) {
            throw CustomException('User role is required (client or lawyer)', 400);
        }

        // Validate user role
        const validRoles = ['client', 'lawyer'];
        if (!validRoles.includes(sanitizedBody.userRole)) {
            throw CustomException('Invalid user role. Must be client or lawyer', 400);
        }

        const evidenceData = {
            type: sanitizedBody.type || 'document',
            url: sanitizedBody.url,
            filename: sanitizedBody.filename,
            fileKey: sanitizedBody.fileKey,
            description: sanitizedBody.description
        };

        const dispute = await disputeService.addEvidence(
            disputeId,
            evidenceData,
            request.userID,
            sanitizedBody.userRole
        );

        return response.status(200).send({
            error: false,
            message: 'Evidence added successfully',
            dispute
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error adding evidence:', message);
        return response.status(status).send({
            error: true,
            message
        });
    }
};

/**
 * Get dispute statistics
 * GET /api/disputes/stats
 */
const getDisputeStats = async (request, response) => {
    try {
        const filters = {};

        if (request.query.firmId) {
            filters.firmId = sanitizeObjectId(request.query.firmId);
        }
        if (request.query.lawyerId) {
            filters.lawyerId = sanitizeObjectId(request.query.lawyerId);
        }
        if (request.query.clientId) {
            filters.clientId = sanitizeObjectId(request.query.clientId);
        }
        if (request.query.startDate) {
            filters.startDate = request.query.startDate;
        }
        if (request.query.endDate) {
            filters.endDate = request.query.endDate;
        }

        const stats = await disputeService.getDisputeStats(filters);

        return response.status(200).send({
            error: false,
            stats
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error fetching dispute stats:', message);
        return response.status(status).send({
            error: true,
            message
        });
    }
};

/**
 * Get disputes by type
 * GET /api/disputes/by-type
 */
const getDisputesByType = async (request, response) => {
    try {
        const filters = {};

        if (request.query.firmId) {
            filters.firmId = sanitizeObjectId(request.query.firmId);
        }
        if (request.query.startDate) {
            filters.startDate = request.query.startDate;
        }
        if (request.query.endDate) {
            filters.endDate = request.query.endDate;
        }

        const disputesByType = await disputeService.getDisputesByType(filters);

        return response.status(200).send({
            error: false,
            disputesByType
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error fetching disputes by type:', message);
        return response.status(status).send({
            error: true,
            message
        });
    }
};

/**
 * Add mediator note
 * POST /api/disputes/:id/mediator-note
 */
const addMediatorNote = async (request, response) => {
    try {
        const { id } = request.params;

        if (!id) {
            throw CustomException('Dispute ID is required', 400);
        }

        const disputeId = sanitizeObjectId(id);

        // Mass Assignment Protection
        const allowedFields = ['note'];
        const sanitizedBody = pickAllowedFields(request.body, allowedFields);

        if (!sanitizedBody.note || typeof sanitizedBody.note !== 'string') {
            throw CustomException('Note is required and must be a string', 400);
        }

        // Validate note length
        const trimmedNote = sanitizedBody.note.trim();
        if (trimmedNote.length < 5) {
            throw CustomException('Note must be at least 5 characters', 400);
        }
        if (trimmedNote.length > 2000) {
            throw CustomException('Note must not exceed 2000 characters', 400);
        }

        const dispute = await disputeService.addMediatorNote(
            disputeId,
            trimmedNote,
            request.userID
        );

        return response.status(200).send({
            error: false,
            message: 'Mediator note added successfully',
            dispute
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error adding mediator note:', message);
        return response.status(status).send({
            error: true,
            message
        });
    }
};

module.exports = {
    createDispute,
    getDisputes,
    getDisputeById,
    lawyerRespond,
    escalateDispute,
    resolveDispute,
    addEvidence,
    getDisputeStats,
    getDisputesByType,
    addMediatorNote
};
