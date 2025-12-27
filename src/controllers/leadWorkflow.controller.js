/**
 * Lead Workflow Controller
 * Security: All operations enforce multi-tenant isolation via firmQuery
 *
 * Exposes leadWorkflow.service.js methods as API endpoints for:
 * - Lead conversion (to opportunity, client, quote)
 * - Lead assignment and reassignment
 * - Lead qualification (BANT scoring)
 * - Lead nurturing campaigns
 * - Stage progression
 * - Workflow history and statistics
 */

const leadWorkflowService = require('../services/leadWorkflow.service');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Convert lead to opportunity
 * POST /api/lead-workflow/convert-to-opportunity/:id
 */
const convertToOpportunity = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const allowedFields = pickAllowedFields(req.body, ['notes']);

        const lead = await leadWorkflowService.convertToOpportunity(
            sanitizedId,
            req.firmId,
            req.userID,
            allowedFields
        );

        return res.status(200).json({
            error: false,
            message: 'Lead converted to opportunity successfully',
            data: lead
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Convert lead to client
 * POST /api/lead-workflow/convert-to-client/:id
 */
const convertToClient = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const allowedFields = pickAllowedFields(req.body, [
            'createCase',
            'caseTitle',
            'notes'
        ]);

        const result = await leadWorkflowService.convertToClient(
            sanitizedId,
            req.firmId,
            req.userID,
            allowedFields
        );

        return res.status(200).json({
            error: false,
            message: 'Lead converted to client successfully',
            data: result
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Create quote from lead
 * POST /api/lead-workflow/create-quote/:id
 */
const createQuote = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const allowedFields = pickAllowedFields(req.body, [
            'title',
            'description',
            'validUntil',
            'items',
            'notes',
            'internalNotes'
        ]);

        const result = await leadWorkflowService.createQuoteFromLead(
            sanitizedId,
            req.firmId,
            req.userID,
            allowedFields
        );

        return res.status(201).json({
            error: false,
            message: 'Quote created from lead successfully',
            data: result
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Assign lead to lawyer
 * POST /api/lead-workflow/assign/:id
 */
const assignLead = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { assigneeId } = req.body;

        if (!assigneeId) {
            throw CustomException('Assignee ID is required', 400);
        }

        const lead = await leadWorkflowService.assignToLawyer(
            sanitizedId,
            req.firmId,
            req.userID,
            assigneeId
        );

        return res.status(200).json({
            error: false,
            message: 'Lead assigned successfully',
            data: lead
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Reassign lead to different lawyer
 * POST /api/lead-workflow/reassign/:id
 */
const reassignLead = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { newAssigneeId, reason } = req.body;

        if (!newAssigneeId) {
            throw CustomException('New assignee ID is required', 400);
        }

        const lead = await leadWorkflowService.reassignLead(
            sanitizedId,
            req.firmId,
            req.userID,
            newAssigneeId,
            reason
        );

        return res.status(200).json({
            error: false,
            message: 'Lead reassigned successfully',
            data: lead
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Bulk assign leads
 * POST /api/lead-workflow/bulk-assign
 */
const bulkAssign = async (req, res) => {
    try {
        const { leadIds, assigneeId } = req.body;

        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            throw CustomException('Lead IDs array is required', 400);
        }

        if (!assigneeId) {
            throw CustomException('Assignee ID is required', 400);
        }

        const result = await leadWorkflowService.bulkAssign(
            leadIds,
            req.firmId,
            req.userID,
            assigneeId
        );

        return res.status(200).json({
            error: false,
            message: 'Bulk assignment completed',
            data: result
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Qualify lead using BANT
 * POST /api/lead-workflow/qualify/:id
 */
const qualifyLead = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const allowedFields = pickAllowedFields(req.body, [
            'budget',
            'budgetAmount',
            'budgetNotes',
            'authority',
            'authorityNotes',
            'need',
            'needDescription',
            'timeline',
            'timelineNotes',
            'notes'
        ]);

        const lead = await leadWorkflowService.qualifyLead(
            sanitizedId,
            req.firmId,
            req.userID,
            allowedFields
        );

        return res.status(200).json({
            error: false,
            message: 'Lead qualified successfully',
            data: lead
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Disqualify lead
 * POST /api/lead-workflow/disqualify/:id
 */
const disqualifyLead = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { reason } = req.body;

        const lead = await leadWorkflowService.disqualifyLead(
            sanitizedId,
            req.firmId,
            req.userID,
            reason
        );

        return res.status(200).json({
            error: false,
            message: 'Lead disqualified',
            data: lead
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get qualification score
 * GET /api/lead-workflow/qualification-score/:id
 */
const getQualificationScore = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const lead = await leadWorkflowService.calculateQualificationScore(
            sanitizedId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            data: {
                leadId: lead._id,
                leadScore: lead.leadScore,
                qualification: lead.qualification
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Start nurturing campaign
 * POST /api/lead-workflow/start-nurturing/:id
 */
const startNurturing = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { activityPlanId } = req.body;

        if (!activityPlanId) {
            throw CustomException('Activity plan ID is required', 400);
        }

        const lead = await leadWorkflowService.startNurturingCampaign(
            sanitizedId,
            req.firmId,
            req.userID,
            activityPlanId
        );

        return res.status(200).json({
            error: false,
            message: 'Nurturing campaign started',
            data: lead
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Pause nurturing campaign
 * POST /api/lead-workflow/pause-nurturing/:id
 */
const pauseNurturing = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const lead = await leadWorkflowService.pauseNurturing(
            sanitizedId,
            req.firmId,
            req.userID
        );

        return res.status(200).json({
            error: false,
            message: 'Nurturing campaign paused',
            data: lead
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Resume nurturing campaign
 * POST /api/lead-workflow/resume-nurturing/:id
 */
const resumeNurturing = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const lead = await leadWorkflowService.resumeNurturing(
            sanitizedId,
            req.firmId,
            req.userID
        );

        return res.status(200).json({
            error: false,
            message: 'Nurturing campaign resumed',
            data: lead
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get next nurturing step
 * GET /api/lead-workflow/next-nurturing-step/:id
 */
const getNextNurturingStep = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const result = await leadWorkflowService.getNextNurturingStep(
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
 * Move to specific stage
 * POST /api/lead-workflow/move-stage/:id
 */
const moveToStage = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { stage } = req.body;

        if (!stage) {
            throw CustomException('Stage is required', 400);
        }

        const lead = await leadWorkflowService.moveToStage(
            sanitizedId,
            req.firmId,
            req.userID,
            stage
        );

        return res.status(200).json({
            error: false,
            message: 'Lead stage updated',
            data: lead
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Progress to next stage
 * POST /api/lead-workflow/progress-stage/:id
 */
const progressStage = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const lead = await leadWorkflowService.progressToNextStage(
            sanitizedId,
            req.firmId,
            req.userID
        );

        return res.status(200).json({
            error: false,
            message: 'Lead progressed to next stage',
            data: lead
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Mark lead as won
 * POST /api/lead-workflow/mark-won/:id
 */
const markAsWon = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const allowedFields = pickAllowedFields(req.body, [
            'closeDate',
            'value',
            'notes'
        ]);

        const lead = await leadWorkflowService.markAsWon(
            sanitizedId,
            req.firmId,
            req.userID,
            allowedFields
        );

        return res.status(200).json({
            error: false,
            message: 'Lead marked as won',
            data: lead
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Mark lead as lost
 * POST /api/lead-workflow/mark-lost/:id
 */
const markAsLost = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { lostReasonId } = req.body;
        const allowedFields = pickAllowedFields(req.body, [
            'reason',
            'details',
            'notes',
            'lostDate',
            'competitor'
        ]);

        const lead = await leadWorkflowService.markAsLost(
            sanitizedId,
            req.firmId,
            req.userID,
            lostReasonId,
            allowedFields
        );

        return res.status(200).json({
            error: false,
            message: 'Lead marked as lost',
            data: lead
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get workflow history
 * GET /api/lead-workflow/workflow-history/:id
 */
const getWorkflowHistory = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const history = await leadWorkflowService.getWorkflowHistory(
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
 * Get workflow statistics
 * GET /api/lead-workflow/workflow-stats
 */
const getWorkflowStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const stats = await leadWorkflowService.getWorkflowStats(
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

module.exports = {
    convertToOpportunity,
    convertToClient,
    createQuote,
    assignLead,
    reassignLead,
    bulkAssign,
    qualifyLead,
    disqualifyLead,
    getQualificationScore,
    startNurturing,
    pauseNurturing,
    resumeNurturing,
    getNextNurturingStep,
    moveToStage,
    progressStage,
    markAsWon,
    markAsLost,
    getWorkflowHistory,
    getWorkflowStats
};
