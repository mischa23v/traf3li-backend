/**
 * Approval Workflow Controller
 * Security: All operations enforce multi-tenant isolation via firmQuery
 *
 * Exposes approvalWorkflow.service.js methods as API endpoints for:
 * - Approval request creation and management
 * - Approval chain templates
 * - Approval rules configuration
 * - Approval processing (approve, reject, delegate)
 * - Approval metrics and analytics
 * - Auto-approval functionality
 * - Notification and reminder management
 */

const approvalWorkflowService = require('../services/approvalWorkflow.service');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ==================== APPROVAL REQUEST CREATION ====================

/**
 * Create approval request
 * POST /api/approval-workflow/create
 */
const createApprovalRequest = async (req, res) => {
    try {
        const { entityType, entityId, approverIds, data } = req.body;

        if (!entityType || !entityId || !approverIds || !data) {
            throw CustomException('Entity type, entity ID, approver IDs, and data are required', 400);
        }

        const request = await approvalWorkflowService.createApprovalRequest(
            entityType,
            entityId,
            req.firmId,
            req.userID,
            approverIds,
            data
        );

        return res.status(201).json({
            error: false,
            message: 'Approval request created',
            data: request
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get approval request
 * GET /api/approval-workflow/request/:requestId
 */
const getApprovalRequest = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.requestId);

        const request = await approvalWorkflowService.getApprovalRequest(
            sanitizedId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            data: request
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Cancel approval request
 * POST /api/approval-workflow/cancel/:requestId
 */
const cancelApprovalRequest = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.requestId);
        const { reason } = req.body;

        if (!reason) {
            throw CustomException('Cancellation reason is required', 400);
        }

        const request = await approvalWorkflowService.cancelApprovalRequest(
            sanitizedId,
            req.firmId,
            req.userID,
            reason
        );

        return res.status(200).json({
            error: false,
            message: 'Approval request cancelled',
            data: request
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

// ==================== APPROVAL CHAIN MANAGEMENT ====================

/**
 * Create approval chain template
 * POST /api/approval-workflow/create-chain
 */
const createApprovalChain = async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, [
            'name',
            'description',
            'entityTypes',
            'steps',
            'isDefault',
            'requireAllApprovals',
            'allowParallelApproval'
        ]);

        const chain = await approvalWorkflowService.createApprovalChain(
            allowedFields,
            req.firmId,
            req.userID
        );

        return res.status(201).json({
            error: false,
            message: 'Approval chain created',
            data: chain
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Update approval chain
 * POST /api/approval-workflow/update-chain/:chainId
 */
const updateApprovalChain = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.chainId);
        const allowedFields = pickAllowedFields(req.body, [
            'name',
            'description',
            'entityTypes',
            'steps',
            'isDefault',
            'requireAllApprovals',
            'allowParallelApproval',
            'isActive'
        ]);

        const chain = await approvalWorkflowService.updateApprovalChain(
            sanitizedId,
            req.firmId,
            req.userID,
            allowedFields
        );

        return res.status(200).json({
            error: false,
            message: 'Approval chain updated',
            data: chain
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Delete approval chain
 * DELETE /api/approval-workflow/delete-chain/:chainId
 */
const deleteApprovalChain = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.chainId);

        const success = await approvalWorkflowService.deleteApprovalChain(
            sanitizedId,
            req.firmId,
            req.userID
        );

        return res.status(200).json({
            error: false,
            message: success ? 'Approval chain deleted' : 'Chain not found'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get approval chains
 * GET /api/approval-workflow/chains
 */
const getApprovalChains = async (req, res) => {
    try {
        const { entityType } = req.query;

        const chains = await approvalWorkflowService.getApprovalChains(
            req.firmId,
            entityType
        );

        return res.status(200).json({
            error: false,
            data: chains
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Apply approval chain to request
 * POST /api/approval-workflow/apply-chain/:requestId
 */
const applyApprovalChain = async (req, res) => {
    try {
        const sanitizedRequestId = sanitizeObjectId(req.params.requestId);
        const { chainId } = req.body;

        if (!chainId) {
            throw CustomException('Chain ID is required', 400);
        }

        const request = await approvalWorkflowService.applyApprovalChain(
            sanitizedRequestId,
            chainId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            message: 'Approval chain applied',
            data: request
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

// ==================== APPROVAL PROCESSING ====================

/**
 * Approve request
 * POST /api/approval-workflow/approve/:requestId
 */
const approve = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.requestId);
        const { notes } = req.body;

        const request = await approvalWorkflowService.approve(
            sanitizedId,
            req.firmId,
            req.userID,
            notes
        );

        return res.status(200).json({
            error: false,
            message: 'Request approved',
            data: request
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Reject request
 * POST /api/approval-workflow/reject/:requestId
 */
const reject = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.requestId);
        const { reason } = req.body;

        if (!reason) {
            throw CustomException('Rejection reason is required', 400);
        }

        const request = await approvalWorkflowService.reject(
            sanitizedId,
            req.firmId,
            req.userID,
            reason
        );

        return res.status(200).json({
            error: false,
            message: 'Request rejected',
            data: request
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Request more information
 * POST /api/approval-workflow/request-info/:requestId
 */
const requestMoreInfo = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.requestId);
        const { questions } = req.body;

        if (!questions) {
            throw CustomException('Questions/information needed is required', 400);
        }

        const request = await approvalWorkflowService.requestMoreInfo(
            sanitizedId,
            req.firmId,
            req.userID,
            questions
        );

        return res.status(200).json({
            error: false,
            message: 'More information requested',
            data: request
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Delegate approval
 * POST /api/approval-workflow/delegate/:requestId
 */
const delegate = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.requestId);
        const { delegateId, reason } = req.body;

        if (!delegateId) {
            throw CustomException('Delegate user ID is required', 400);
        }

        const request = await approvalWorkflowService.delegate(
            sanitizedId,
            req.firmId,
            req.userID,
            delegateId,
            reason
        );

        return res.status(200).json({
            error: false,
            message: 'Approval delegated',
            data: request
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Escalate approval
 * POST /api/approval-workflow/escalate/:requestId
 */
const escalate = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.requestId);
        const { reason } = req.body;

        if (!reason) {
            throw CustomException('Escalation reason is required', 400);
        }

        const request = await approvalWorkflowService.escalate(
            sanitizedId,
            req.firmId,
            reason
        );

        return res.status(200).json({
            error: false,
            message: 'Request escalated',
            data: request
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

// ==================== APPROVAL QUERIES ====================

/**
 * Get pending approvals for approver
 * GET /api/approval-workflow/pending-approvals
 */
const getPendingApprovals = async (req, res) => {
    try {
        const approvals = await approvalWorkflowService.getPendingApprovals(
            req.firmId,
            req.userID
        );

        return res.status(200).json({
            error: false,
            data: approvals
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get my submitted requests
 * GET /api/approval-workflow/my-requests
 */
const getMyRequests = async (req, res) => {
    try {
        const requests = await approvalWorkflowService.getMyRequests(
            req.firmId,
            req.userID
        );

        return res.status(200).json({
            error: false,
            data: requests
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get approval history for entity
 * GET /api/approval-workflow/history/:entityType/:entityId
 */
const getApprovalHistory = async (req, res) => {
    try {
        const { entityType, entityId } = req.params;

        const history = await approvalWorkflowService.getApprovalHistory(
            entityType,
            entityId,
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
 * Get approval statistics
 * GET /api/approval-workflow/stats
 */
const getApprovalStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const stats = await approvalWorkflowService.getApprovalStats(
            req.firmId,
            { startDate, endDate }
        );

        return res.status(200).json({
            error: false,
            data: stats
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

// ==================== APPROVAL RULES ====================

/**
 * Create approval rule
 * POST /api/approval-workflow/create-rule
 */
const createApprovalRule = async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, [
            'name',
            'description',
            'module',
            'action',
            'conditions',
            'approvers',
            'priority',
            'isActive'
        ]);

        const rule = await approvalWorkflowService.createApprovalRule(
            allowedFields,
            req.firmId,
            req.userID
        );

        return res.status(201).json({
            error: false,
            message: 'Approval rule created',
            data: rule
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Update approval rule
 * POST /api/approval-workflow/update-rule/:ruleId
 */
const updateApprovalRule = async (req, res) => {
    try {
        const sanitizedRuleId = sanitizeObjectId(req.params.ruleId);
        const allowedFields = pickAllowedFields(req.body, [
            'name',
            'description',
            'module',
            'action',
            'conditions',
            'approvers',
            'priority',
            'isActive'
        ]);

        const rule = await approvalWorkflowService.updateApprovalRule(
            sanitizedRuleId,
            req.firmId,
            req.userID,
            allowedFields
        );

        return res.status(200).json({
            error: false,
            message: 'Approval rule updated',
            data: rule
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Delete approval rule
 * DELETE /api/approval-workflow/delete-rule/:ruleId
 */
const deleteApprovalRule = async (req, res) => {
    try {
        const sanitizedRuleId = sanitizeObjectId(req.params.ruleId);

        const result = await approvalWorkflowService.deleteApprovalRule(
            sanitizedRuleId,
            req.firmId,
            req.userID
        );

        return res.status(200).json({
            error: false,
            message: 'Approval rule deleted',
            data: result
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Evaluate rules for entity
 * POST /api/approval-workflow/evaluate-rules
 */
const evaluateRules = async (req, res) => {
    try {
        const { entityType, entityData } = req.body;

        if (!entityType || !entityData) {
            throw CustomException('Entity type and data are required', 400);
        }

        const evaluation = await approvalWorkflowService.evaluateRules(
            entityType,
            entityData,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            data: evaluation
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get applicable rules for entity type
 * GET /api/approval-workflow/applicable-rules/:entityType
 */
const getApplicableRules = async (req, res) => {
    try {
        const { entityType } = req.params;

        const rules = await approvalWorkflowService.getApplicableRules(
            entityType,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            data: rules
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

// ==================== NOTIFICATIONS ====================

/**
 * Notify approvers
 * POST /api/approval-workflow/notify-approvers/:requestId
 */
const notifyApprovers = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.requestId);

        const success = await approvalWorkflowService.notifyApprovers(
            sanitizedId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            message: success ? 'Approvers notified' : 'Notification failed'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Notify requestor
 * POST /api/approval-workflow/notify-requestor/:requestId
 */
const notifyRequestor = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.requestId);
        const { action } = req.body;

        if (!action) {
            throw CustomException('Action is required', 400);
        }

        const success = await approvalWorkflowService.notifyRequestor(
            sanitizedId,
            req.firmId,
            action
        );

        return res.status(200).json({
            error: false,
            message: success ? 'Requestor notified' : 'Notification failed'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Send reminder
 * POST /api/approval-workflow/send-reminder/:requestId
 */
const sendReminder = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.requestId);

        const success = await approvalWorkflowService.sendReminder(
            sanitizedId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            message: success ? 'Reminder sent' : 'Reminder failed'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get overdue approvals
 * GET /api/approval-workflow/overdue
 */
const getOverdueApprovals = async (req, res) => {
    try {
        const { overdueHours } = req.query;

        const approvals = await approvalWorkflowService.getOverdueApprovals(
            req.firmId,
            overdueHours ? parseInt(overdueHours) : 24
        );

        return res.status(200).json({
            error: false,
            data: approvals
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

// ==================== AUTO-APPROVAL ====================

/**
 * Set auto-approval rule
 * POST /api/approval-workflow/set-auto-approval
 */
const setAutoApprovalRule = async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, [
            'name',
            'description',
            'module',
            'action',
            'conditions',
            'approvers',
            'autoApproveAfterHours',
            'priority',
            'isActive'
        ]);

        const rule = await approvalWorkflowService.setAutoApprovalRule(
            allowedFields,
            req.firmId,
            req.userID
        );

        return res.status(201).json({
            error: false,
            message: 'Auto-approval rule set',
            data: rule
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Check auto-approval eligibility
 * GET /api/approval-workflow/check-auto-approval/:requestId
 */
const checkAutoApproval = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.requestId);

        const canAutoApprove = await approvalWorkflowService.checkAutoApproval(
            sanitizedId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            data: { canAutoApprove }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Process auto-approval
 * POST /api/approval-workflow/process-auto-approval/:requestId
 */
const processAutoApproval = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.requestId);

        const request = await approvalWorkflowService.processAutoApproval(
            sanitizedId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            message: 'Auto-approval processed',
            data: request
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

// ==================== APPROVAL METRICS ====================

/**
 * Get average approval time
 * GET /api/approval-workflow/average-time
 */
const getAverageApprovalTime = async (req, res) => {
    try {
        const { entityType, startDate, endDate } = req.query;

        const averageTime = await approvalWorkflowService.getAverageApprovalTime(
            req.firmId,
            entityType,
            { startDate, endDate }
        );

        return res.status(200).json({
            error: false,
            data: { averageHours: averageTime }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get approval rates
 * GET /api/approval-workflow/rates
 */
const getApprovalRates = async (req, res) => {
    try {
        const { entityType, startDate, endDate } = req.query;

        const rates = await approvalWorkflowService.getApprovalRates(
            req.firmId,
            entityType,
            { startDate, endDate }
        );

        return res.status(200).json({
            error: false,
            data: rates
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get approval bottlenecks
 * GET /api/approval-workflow/bottlenecks
 */
const getBottlenecks = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const bottlenecks = await approvalWorkflowService.getBottlenecks(
            req.firmId,
            { startDate, endDate }
        );

        return res.status(200).json({
            error: false,
            data: bottlenecks
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

module.exports = {
    // Request Management
    createApprovalRequest,
    getApprovalRequest,
    cancelApprovalRequest,
    // Chain Management
    createApprovalChain,
    updateApprovalChain,
    deleteApprovalChain,
    getApprovalChains,
    applyApprovalChain,
    // Processing
    approve,
    reject,
    requestMoreInfo,
    delegate,
    escalate,
    // Queries
    getPendingApprovals,
    getMyRequests,
    getApprovalHistory,
    getApprovalStats,
    // Rules
    createApprovalRule,
    updateApprovalRule,
    deleteApprovalRule,
    evaluateRules,
    getApplicableRules,
    // Notifications
    notifyApprovers,
    notifyRequestor,
    sendReminder,
    getOverdueApprovals,
    // Auto-Approval
    setAutoApprovalRule,
    checkAutoApproval,
    processAutoApproval,
    // Metrics
    getAverageApprovalTime,
    getApprovalRates,
    getBottlenecks
};
