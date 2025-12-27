/**
 * Client Workflow Controller
 * Security: All operations enforce multi-tenant isolation via firmQuery
 *
 * Exposes clientWorkflow.service.js methods as API endpoints for:
 * - Client onboarding workflows
 * - Credit management and approval
 * - Client tier upgrades/downgrades
 * - Dormancy detection and alerts
 * - Client reactivation campaigns
 * - Health scoring and risk assessment
 * - Client segmentation
 * - Lifecycle stage management
 */

const clientWorkflowService = require('../services/clientWorkflow.service');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ==================== CLIENT ONBOARDING ====================

/**
 * Start client onboarding
 * POST /api/client-workflow/start-onboarding/:clientId
 */
const startOnboarding = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);
        const { onboardingPlanId } = req.body;

        const onboarding = await clientWorkflowService.startOnboarding(
            sanitizedClientId,
            req.firmId,
            req.userID,
            onboardingPlanId
        );

        return res.status(201).json({
            error: false,
            message: 'Client onboarding started',
            data: onboarding
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Complete onboarding step
 * POST /api/client-workflow/complete-step/:clientId
 */
const completeOnboardingStep = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);
        const { stepId, notes } = req.body;

        if (!stepId) {
            throw CustomException('Step ID is required', 400);
        }

        const onboarding = await clientWorkflowService.completeOnboardingStep(
            sanitizedClientId,
            req.firmId,
            req.userID,
            stepId,
            notes
        );

        return res.status(200).json({
            error: false,
            message: 'Onboarding step completed',
            data: onboarding
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Skip onboarding step
 * POST /api/client-workflow/skip-step/:clientId
 */
const skipOnboardingStep = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);
        const { stepId, reason } = req.body;

        if (!stepId || !reason) {
            throw CustomException('Step ID and reason are required', 400);
        }

        const onboarding = await clientWorkflowService.skipOnboardingStep(
            sanitizedClientId,
            req.firmId,
            req.userID,
            stepId,
            reason
        );

        return res.status(200).json({
            error: false,
            message: 'Onboarding step skipped',
            data: onboarding
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get onboarding progress
 * GET /api/client-workflow/onboarding-progress/:clientId
 */
const getOnboardingProgress = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);

        const progress = await clientWorkflowService.getOnboardingProgress(
            sanitizedClientId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            data: progress
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Complete onboarding
 * POST /api/client-workflow/complete-onboarding/:clientId
 */
const completeOnboarding = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);

        const onboarding = await clientWorkflowService.completeOnboarding(
            sanitizedClientId,
            req.firmId,
            req.userID
        );

        return res.status(200).json({
            error: false,
            message: 'Client onboarding completed',
            data: onboarding
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

// ==================== CREDIT MANAGEMENT ====================

/**
 * Update credit status
 * POST /api/client-workflow/update-credit-status/:clientId
 */
const updateCreditStatus = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);
        const { newStatus, reason } = req.body;

        if (!newStatus) {
            throw CustomException('New status is required', 400);
        }

        const client = await clientWorkflowService.updateCreditStatus(
            sanitizedClientId,
            req.firmId,
            req.userID,
            newStatus,
            reason
        );

        return res.status(200).json({
            error: false,
            message: 'Credit status updated',
            data: client
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Request credit increase
 * POST /api/client-workflow/request-credit-increase/:clientId
 */
const requestCreditIncrease = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);
        const { requestedAmount, justification } = req.body;

        if (!requestedAmount) {
            throw CustomException('Requested amount is required', 400);
        }

        const request = await clientWorkflowService.requestCreditIncrease(
            sanitizedClientId,
            req.firmId,
            req.userID,
            requestedAmount,
            justification
        );

        return res.status(201).json({
            error: false,
            message: 'Credit increase requested',
            data: request
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Approve credit increase
 * POST /api/client-workflow/approve-credit-increase/:requestId
 */
const approveCreditIncrease = async (req, res) => {
    try {
        const sanitizedRequestId = sanitizeObjectId(req.params.requestId);
        const { approvedAmount, notes } = req.body;

        if (!approvedAmount) {
            throw CustomException('Approved amount is required', 400);
        }

        const result = await clientWorkflowService.approveCreditIncrease(
            sanitizedRequestId,
            req.firmId,
            req.userID,
            approvedAmount,
            notes
        );

        return res.status(200).json({
            error: false,
            message: 'Credit increase approved',
            data: result
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Reject credit increase
 * POST /api/client-workflow/reject-credit-increase/:requestId
 */
const rejectCreditIncrease = async (req, res) => {
    try {
        const sanitizedRequestId = sanitizeObjectId(req.params.requestId);
        const { reason } = req.body;

        if (!reason) {
            throw CustomException('Rejection reason is required', 400);
        }

        const request = await clientWorkflowService.rejectCreditIncrease(
            sanitizedRequestId,
            req.firmId,
            req.userID,
            reason
        );

        return res.status(200).json({
            error: false,
            message: 'Credit increase rejected',
            data: request
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Check credit limit
 * GET /api/client-workflow/check-credit-limit/:clientId
 */
const checkCreditLimit = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);
        const { amount } = req.query;

        if (!amount) {
            throw CustomException('Amount is required', 400);
        }

        const result = await clientWorkflowService.checkCreditLimit(
            sanitizedClientId,
            req.firmId,
            parseFloat(amount)
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
 * Get credit history
 * GET /api/client-workflow/credit-history/:clientId
 */
const getCreditHistory = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);

        const history = await clientWorkflowService.getCreditHistory(
            sanitizedClientId,
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

// ==================== CLIENT TIER MANAGEMENT ====================

/**
 * Upgrade client tier
 * POST /api/client-workflow/upgrade-tier/:clientId
 */
const upgradeClient = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);
        const { newTier, reason } = req.body;

        if (!newTier) {
            throw CustomException('New tier is required', 400);
        }

        const result = await clientWorkflowService.upgradeClient(
            sanitizedClientId,
            req.firmId,
            req.userID,
            newTier,
            reason
        );

        return res.status(200).json({
            error: false,
            message: 'Client tier upgraded',
            data: result
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Downgrade client tier
 * POST /api/client-workflow/downgrade-tier/:clientId
 */
const downgradeClient = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);
        const { newTier, reason } = req.body;

        if (!newTier) {
            throw CustomException('New tier is required', 400);
        }

        const result = await clientWorkflowService.downgradeClient(
            sanitizedClientId,
            req.firmId,
            req.userID,
            newTier,
            reason
        );

        return res.status(200).json({
            error: false,
            message: 'Client tier downgraded',
            data: result
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Schedule tier change
 * POST /api/client-workflow/schedule-tier-change/:clientId
 */
const scheduleTierChange = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);
        const { newTier, effectiveDate, reason } = req.body;

        if (!newTier || !effectiveDate) {
            throw CustomException('New tier and effective date are required', 400);
        }

        const tierChange = await clientWorkflowService.scheduleTierChange(
            sanitizedClientId,
            req.firmId,
            req.userID,
            newTier,
            effectiveDate,
            reason
        );

        return res.status(201).json({
            error: false,
            message: 'Tier change scheduled',
            data: tierChange
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get tier history
 * GET /api/client-workflow/tier-history/:clientId
 */
const getTierHistory = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);

        const history = await clientWorkflowService.getTierHistory(
            sanitizedClientId,
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

// ==================== DORMANCY DETECTION ====================

/**
 * Check for dormant clients
 * GET /api/client-workflow/check-dormancy
 */
const checkDormancy = async (req, res) => {
    try {
        const { dormancyDays } = req.query;

        const dormantClients = await clientWorkflowService.checkDormancy(
            req.firmId,
            dormancyDays ? parseInt(dormancyDays) : 90
        );

        return res.status(200).json({
            error: false,
            data: dormantClients
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Mark client as dormant
 * POST /api/client-workflow/mark-dormant/:clientId
 */
const markAsDormant = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);

        const client = await clientWorkflowService.markAsDormant(
            sanitizedClientId,
            req.firmId,
            req.userID
        );

        return res.status(200).json({
            error: false,
            message: 'Client marked as dormant',
            data: client
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get dormant clients
 * GET /api/client-workflow/dormant-clients
 */
const getDormantClients = async (req, res) => {
    try {
        const { tier, dormantSince, limit } = req.query;

        const clients = await clientWorkflowService.getDormantClients(
            req.firmId,
            { tier, dormantSince, limit: limit ? parseInt(limit) : 100 }
        );

        return res.status(200).json({
            error: false,
            data: clients
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get last activity date
 * GET /api/client-workflow/last-activity/:clientId
 */
const getLastActivityDate = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);

        const result = await clientWorkflowService.getLastActivityDate(
            sanitizedClientId,
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
 * Send dormancy alert
 * POST /api/client-workflow/send-dormancy-alert/:clientId
 */
const sendDormancyAlert = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);

        const result = await clientWorkflowService.sendDormancyAlert(
            sanitizedClientId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            message: 'Dormancy alert sent',
            data: result
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

// ==================== CLIENT REACTIVATION ====================

/**
 * Start reactivation campaign
 * POST /api/client-workflow/start-reactivation/:clientId
 */
const startReactivation = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);
        const { strategy } = req.body;

        const attempt = await clientWorkflowService.startReactivation(
            sanitizedClientId,
            req.firmId,
            req.userID,
            strategy
        );

        return res.status(201).json({
            error: false,
            message: 'Reactivation campaign started',
            data: attempt
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Log reactivation attempt
 * POST /api/client-workflow/log-reactivation-attempt/:clientId
 */
const logReactivationAttempt = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);
        const { method, result, notes } = req.body;

        if (!method || !result) {
            throw CustomException('Method and result are required', 400);
        }

        const attempt = await clientWorkflowService.logReactivationAttempt(
            sanitizedClientId,
            req.firmId,
            req.userID,
            method,
            result,
            notes
        );

        return res.status(201).json({
            error: false,
            message: 'Reactivation attempt logged',
            data: attempt
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Mark client as reactivated
 * POST /api/client-workflow/mark-reactivated/:clientId
 */
const markAsReactivated = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);

        const client = await clientWorkflowService.markAsReactivated(
            sanitizedClientId,
            req.firmId,
            req.userID
        );

        return res.status(200).json({
            error: false,
            message: 'Client reactivated',
            data: client
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get reactivation history
 * GET /api/client-workflow/reactivation-history/:clientId
 */
const getReactivationHistory = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);

        const history = await clientWorkflowService.getReactivationHistory(
            sanitizedClientId,
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

// ==================== CLIENT HEALTH SCORING ====================

/**
 * Calculate health score
 * GET /api/client-workflow/health-score/:clientId
 */
const calculateHealthScore = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);

        const score = await clientWorkflowService.calculateHealthScore(
            sanitizedClientId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            data: score
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get health factors
 * GET /api/client-workflow/health-factors/:clientId
 */
const getHealthFactors = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);

        const factors = await clientWorkflowService.getHealthFactors(
            sanitizedClientId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            data: factors
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Update health score
 * POST /api/client-workflow/update-health-score/:clientId
 */
const updateHealthScore = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);

        const historyRecord = await clientWorkflowService.updateHealthScore(
            sanitizedClientId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            message: 'Health score updated',
            data: historyRecord
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get at-risk clients
 * GET /api/client-workflow/at-risk-clients
 */
const getAtRiskClients = async (req, res) => {
    try {
        const { threshold } = req.query;

        const clients = await clientWorkflowService.getAtRiskClients(
            req.firmId,
            threshold ? parseInt(threshold) : 60
        );

        return res.status(200).json({
            error: false,
            data: clients
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Schedule health check
 * POST /api/client-workflow/schedule-health-check
 */
const scheduleHealthCheck = async (req, res) => {
    try {
        const { frequency } = req.body;

        const result = await clientWorkflowService.scheduleHealthCheck(
            req.firmId,
            frequency || 'weekly'
        );

        return res.status(200).json({
            error: false,
            message: 'Health check scheduled',
            data: result
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

// ==================== CLIENT SEGMENTATION ====================

/**
 * Assign client to segment
 * POST /api/client-workflow/assign-segment/:clientId
 */
const assignToSegment = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);
        const { segmentId } = req.body;

        if (!segmentId) {
            throw CustomException('Segment ID is required', 400);
        }

        const client = await clientWorkflowService.assignToSegment(
            sanitizedClientId,
            req.firmId,
            req.userID,
            segmentId
        );

        return res.status(200).json({
            error: false,
            message: 'Client assigned to segment',
            data: client
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Remove client from segment
 * POST /api/client-workflow/remove-segment/:clientId
 */
const removeFromSegment = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);
        const { segmentId } = req.body;

        if (!segmentId) {
            throw CustomException('Segment ID is required', 400);
        }

        const client = await clientWorkflowService.removeFromSegment(
            sanitizedClientId,
            req.firmId,
            req.userID,
            segmentId
        );

        return res.status(200).json({
            error: false,
            message: 'Client removed from segment',
            data: client
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Auto-segment clients
 * POST /api/client-workflow/auto-segment
 */
const autoSegment = async (req, res) => {
    try {
        const { rules } = req.body;

        const results = await clientWorkflowService.autoSegment(
            req.firmId,
            rules || {}
        );

        return res.status(200).json({
            error: false,
            message: 'Auto-segmentation completed',
            data: results
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get segment members
 * GET /api/client-workflow/segment-members/:segmentId
 */
const getSegmentMembers = async (req, res) => {
    try {
        const sanitizedSegmentId = sanitizeObjectId(req.params.segmentId);

        const clients = await clientWorkflowService.getSegmentMembers(
            sanitizedSegmentId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            data: clients
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

// ==================== CLIENT LIFECYCLE ====================

/**
 * Get lifecycle stage
 * GET /api/client-workflow/lifecycle-stage/:clientId
 */
const getLifecycleStage = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);

        const stage = await clientWorkflowService.getLifecycleStage(
            sanitizedClientId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            data: stage
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Progress lifecycle
 * POST /api/client-workflow/progress-lifecycle/:clientId
 */
const progressLifecycle = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);
        const { newStage } = req.body;

        if (!newStage) {
            throw CustomException('New stage is required', 400);
        }

        const result = await clientWorkflowService.progressLifecycle(
            sanitizedClientId,
            req.firmId,
            req.userID,
            newStage
        );

        return res.status(200).json({
            error: false,
            message: 'Lifecycle progressed',
            data: result
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get lifecycle history
 * GET /api/client-workflow/lifecycle-history/:clientId
 */
const getLifecycleHistory = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);

        const history = await clientWorkflowService.getLifecycleHistory(
            sanitizedClientId,
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
 * Calculate lifetime value
 * GET /api/client-workflow/lifetime-value/:clientId
 */
const calculateLifetimeValue = async (req, res) => {
    try {
        const sanitizedClientId = sanitizeObjectId(req.params.clientId);

        const ltv = await clientWorkflowService.calculateLifetimeValue(
            sanitizedClientId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            data: ltv
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

module.exports = {
    // Onboarding
    startOnboarding,
    completeOnboardingStep,
    skipOnboardingStep,
    getOnboardingProgress,
    completeOnboarding,
    // Credit Management
    updateCreditStatus,
    requestCreditIncrease,
    approveCreditIncrease,
    rejectCreditIncrease,
    checkCreditLimit,
    getCreditHistory,
    // Tier Management
    upgradeClient,
    downgradeClient,
    scheduleTierChange,
    getTierHistory,
    // Dormancy Detection
    checkDormancy,
    markAsDormant,
    getDormantClients,
    getLastActivityDate,
    sendDormancyAlert,
    // Reactivation
    startReactivation,
    logReactivationAttempt,
    markAsReactivated,
    getReactivationHistory,
    // Health Scoring
    calculateHealthScore,
    getHealthFactors,
    updateHealthScore,
    getAtRiskClients,
    scheduleHealthCheck,
    // Segmentation
    assignToSegment,
    removeFromSegment,
    autoSegment,
    getSegmentMembers,
    // Lifecycle
    getLifecycleStage,
    progressLifecycle,
    getLifecycleHistory,
    calculateLifetimeValue
};
