/**
 * Quote Workflow Controller
 * Security: All operations enforce multi-tenant isolation via firmQuery
 *
 * Exposes quoteWorkflow.service.js methods as API endpoints for:
 * - Quote creation from leads/clients
 * - Quote versioning and revisions
 * - Quote approval workflows
 * - Quote sending and tracking
 * - Client acceptance/rejection
 * - Quote to invoice conversion
 * - Expiry management
 * - Metrics and analytics
 */

const quoteWorkflowService = require('../services/quoteWorkflow.service');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Create quote from lead
 * POST /api/quote-workflow/from-lead/:leadId
 */
const createFromLead = async (req, res) => {
    try {
        const sanitizedLeadId = sanitizeObjectId(req.params.leadId);
        const allowedFields = pickAllowedFields(req.body, [
            'title',
            'description',
            'validUntil',
            'items',
            'notes',
            'internalNotes',
            'terms'
        ]);

        const quote = await quoteWorkflowService.createQuoteFromLead(
            sanitizedLeadId,
            req.firmId,
            req.userID,
            allowedFields
        );

        return res.status(201).json({
            error: false,
            message: 'Quote created from lead successfully',
            data: quote
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Create quote from client
 * POST /api/quote-workflow/from-client/:clientId
 */
const createFromClient = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);
        const allowedFields = pickAllowedFields(req.body, [
            'title',
            'description',
            'validUntil',
            'items',
            'notes',
            'internalNotes',
            'terms'
        ]);

        const quote = await quoteWorkflowService.createQuoteFromClient(
            sanitizedClientId,
            req.firmId,
            req.userID,
            allowedFields
        );

        return res.status(201).json({
            error: false,
            message: 'Quote created from client successfully',
            data: quote
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Duplicate quote
 * POST /api/quote-workflow/duplicate/:id
 */
const duplicateQuote = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const quote = await quoteWorkflowService.duplicateQuote(
            sanitizedId,
            req.firmId,
            req.userID
        );

        return res.status(201).json({
            error: false,
            message: 'Quote duplicated successfully',
            data: quote
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Create revision of quote
 * POST /api/quote-workflow/revision/:id
 */
const createRevision = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const allowedFields = pickAllowedFields(req.body, [
            'changes',
            'notes'
        ]);

        const quote = await quoteWorkflowService.createRevision(
            sanitizedId,
            req.firmId,
            req.userID,
            allowedFields.changes,
            allowedFields.notes
        );

        return res.status(201).json({
            error: false,
            message: 'Quote revision created successfully',
            data: quote
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get version history
 * GET /api/quote-workflow/version-history/:id
 */
const getVersionHistory = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const history = await quoteWorkflowService.getVersionHistory(
            sanitizedId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            data: history
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Compare versions
 * GET /api/quote-workflow/compare-versions/:id
 */
const compareVersions = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { versionA, versionB } = req.query;

        if (!versionA || !versionB) {
            throw CustomException('Both version numbers are required', 400);
        }

        const comparison = await quoteWorkflowService.compareVersions(
            sanitizedId,
            req.firmId,
            parseInt(versionA),
            parseInt(versionB)
        );

        return res.status(200).json({
            error: false,
            data: comparison
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Submit for approval
 * POST /api/quote-workflow/submit-approval/:id
 */
const submitForApproval = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { approverIds } = req.body;

        if (!approverIds || !Array.isArray(approverIds)) {
            throw CustomException('Approver IDs array is required', 400);
        }

        const result = await quoteWorkflowService.submitForApproval(
            sanitizedId,
            req.firmId,
            req.userID,
            approverIds
        );

        return res.status(200).json({
            error: false,
            message: 'Quote submitted for approval',
            data: result
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Approve quote
 * POST /api/quote-workflow/approve/:id
 */
const approveQuote = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { notes } = req.body;

        const quote = await quoteWorkflowService.approveQuote(
            sanitizedId,
            req.firmId,
            req.userID,
            notes
        );

        return res.status(200).json({
            error: false,
            message: 'Quote approved successfully',
            data: quote
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Reject quote
 * POST /api/quote-workflow/reject/:id
 */
const rejectQuote = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { reason } = req.body;

        if (!reason) {
            throw CustomException('Rejection reason is required', 400);
        }

        const quote = await quoteWorkflowService.rejectQuote(
            sanitizedId,
            req.firmId,
            req.userID,
            reason
        );

        return res.status(200).json({
            error: false,
            message: 'Quote rejected',
            data: quote
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get approval status
 * GET /api/quote-workflow/approval-status/:id
 */
const getApprovalStatus = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const status = await quoteWorkflowService.getApprovalStatus(
            sanitizedId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            data: status
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get pending approvals
 * GET /api/quote-workflow/pending-approvals
 */
const getPendingApprovals = async (req, res) => {
    try {
        const quotes = await quoteWorkflowService.getPendingApprovals(
            req.firmId,
            req.userID
        );

        return res.status(200).json({
            error: false,
            data: quotes
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Send quote to client
 * POST /api/quote-workflow/send/:id
 */
const sendQuote = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const allowedFields = pickAllowedFields(req.body, [
            'emailSubject',
            'emailMessage',
            'sendMethod',
            'expiresInDays'
        ]);

        const quote = await quoteWorkflowService.sendToClient(
            sanitizedId,
            req.firmId,
            req.userID,
            allowedFields
        );

        return res.status(200).json({
            error: false,
            message: 'Quote sent to client successfully',
            data: quote
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Resend quote to client
 * POST /api/quote-workflow/resend/:id
 */
const resendQuote = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const quote = await quoteWorkflowService.resendToClient(
            sanitizedId,
            req.firmId,
            req.userID
        );

        return res.status(200).json({
            error: false,
            message: 'Quote resent to client',
            data: quote
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get view link for client
 * GET /api/quote-workflow/view-link/:id
 */
const getViewLink = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const link = await quoteWorkflowService.generateViewLink(
            sanitizedId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            data: { viewLink: link }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Track quote view (public endpoint - no auth)
 * POST /api/quote-workflow/track-view/:id
 */
const trackView = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { token } = req.body;

        if (!token) {
            throw CustomException('View token is required', 400);
        }

        const quote = await quoteWorkflowService.trackView(
            sanitizedId,
            token
        );

        return res.status(200).json({
            error: false,
            message: 'View tracked',
            data: quote
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Client accepts quote (public endpoint)
 * POST /api/quote-workflow/accept/:id
 */
const clientAccept = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { token, signature } = req.body;

        if (!token) {
            throw CustomException('Access token is required', 400);
        }

        const quote = await quoteWorkflowService.clientAccept(
            sanitizedId,
            token,
            signature
        );

        return res.status(200).json({
            error: false,
            message: 'Quote accepted successfully',
            data: quote
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Client rejects quote (public endpoint)
 * POST /api/quote-workflow/client-reject/:id
 */
const clientReject = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { token, reason } = req.body;

        if (!token) {
            throw CustomException('Access token is required', 400);
        }

        const quote = await quoteWorkflowService.clientReject(
            sanitizedId,
            token,
            reason
        );

        return res.status(200).json({
            error: false,
            message: 'Quote rejected',
            data: quote
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Client requests changes (public endpoint)
 * POST /api/quote-workflow/request-changes/:id
 */
const requestChanges = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { token, requestedChanges } = req.body;

        if (!token) {
            throw CustomException('Access token is required', 400);
        }

        if (!requestedChanges) {
            throw CustomException('Requested changes are required', 400);
        }

        const quote = await quoteWorkflowService.clientRequestChanges(
            sanitizedId,
            token,
            requestedChanges
        );

        return res.status(200).json({
            error: false,
            message: 'Change request submitted',
            data: quote
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Convert quote to invoice
 * POST /api/quote-workflow/convert-to-invoice/:id
 */
const convertToInvoice = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const allowedFields = pickAllowedFields(req.body, [
            'dueDate',
            'paymentTerms',
            'notes'
        ]);

        const result = await quoteWorkflowService.convertToInvoice(
            sanitizedId,
            req.firmId,
            req.userID,
            allowedFields
        );

        return res.status(201).json({
            error: false,
            message: 'Quote converted to invoice successfully',
            data: result
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Check if quote is expired
 * GET /api/quote-workflow/check-expiry/:id
 */
const checkExpiry = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const result = await quoteWorkflowService.checkExpiry(
            sanitizedId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            data: result
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Extend validity period
 * POST /api/quote-workflow/extend-validity/:id
 */
const extendValidity = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { newValidUntil } = req.body;

        if (!newValidUntil) {
            throw CustomException('New validity date is required', 400);
        }

        const quote = await quoteWorkflowService.extendValidity(
            sanitizedId,
            req.firmId,
            req.userID,
            newValidUntil
        );

        return res.status(200).json({
            error: false,
            message: 'Quote validity extended',
            data: quote
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Process expired quotes (batch operation)
 * POST /api/quote-workflow/process-expired
 */
const processExpired = async (req, res) => {
    try {
        const result = await quoteWorkflowService.processExpiredQuotes(req.firmId);

        return res.status(200).json({
            error: false,
            message: 'Expired quotes processed',
            data: result
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get quote metrics
 * GET /api/quote-workflow/metrics
 */
const getMetrics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const metrics = await quoteWorkflowService.getQuoteMetrics(
            req.firmId,
            { startDate, endDate }
        );

        return res.status(200).json({
            error: false,
            data: metrics
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get conversion rate
 * GET /api/quote-workflow/conversion-rate
 */
const getConversionRate = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const rate = await quoteWorkflowService.getConversionRate(
            req.firmId,
            { startDate, endDate }
        );

        return res.status(200).json({
            error: false,
            data: { conversionRate: rate }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

module.exports = {
    createFromLead,
    createFromClient,
    duplicateQuote,
    createRevision,
    getVersionHistory,
    compareVersions,
    submitForApproval,
    approveQuote,
    rejectQuote,
    getApprovalStatus,
    getPendingApprovals,
    sendQuote,
    resendQuote,
    getViewLink,
    trackView,
    clientAccept,
    clientReject,
    requestChanges,
    convertToInvoice,
    checkExpiry,
    extendValidity,
    processExpired,
    getMetrics,
    getConversionRate
};
