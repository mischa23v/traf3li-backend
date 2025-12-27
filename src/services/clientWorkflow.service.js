/**
 * Client Workflow Service
 *
 * Comprehensive service for managing client-related workflows including:
 * - Client onboarding and progress tracking
 * - Credit management and approval workflows
 * - Client tier upgrades/downgrades
 * - Dormancy detection and alerts
 * - Client reactivation campaigns
 * - Health scoring and risk assessment
 * - Client segmentation
 * - Lifecycle stage management
 *
 * SECURITY: All operations enforce multi-tenant isolation via firmId
 */

const mongoose = require('mongoose');
const Client = require('../models/client.model');
const Activity = require('../models/activity.model');
const Lead = require('../models/lead.model');
const { CustomException } = require('../utils');
const { sanitizeObjectId } = require('../utils/securityUtils');
const AuditLogService = require('./auditLog.service');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// EMBEDDED SCHEMAS
// ═══════════════════════════════════════════════════════════════

/**
 * Client Onboarding Progress Schema
 * Tracks completion of onboarding steps for new clients
 */
const ClientOnboardingProgressSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', required: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'OnboardingPlan' },
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
    status: {
        type: String,
        enum: ['in_progress', 'completed', 'cancelled'],
        default: 'in_progress'
    },
    steps: [{
        stepId: String,
        name: String,
        description: String,
        status: {
            type: String,
            enum: ['pending', 'in_progress', 'completed', 'skipped'],
            default: 'pending'
        },
        completedAt: Date,
        completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        skippedReason: String,
        notes: String
    }],
    progress: { type: Number, default: 0, min: 0, max: 100 },
    completedSteps: { type: Number, default: 0 },
    totalSteps: { type: Number, default: 0 },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

ClientOnboardingProgressSchema.index({ firmId: 1, clientId: 1 });
ClientOnboardingProgressSchema.index({ firmId: 1, status: 1 });

/**
 * Credit Request Schema
 * Tracks credit limit increase/decrease requests and approvals
 */
const CreditRequestSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', required: true },
    requestType: {
        type: String,
        enum: ['increase', 'decrease'],
        required: true
    },
    currentLimit: { type: Number, required: true },
    requestedAmount: { type: Number, required: true },
    approvedAmount: Number,
    reason: String,
    justification: String,
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending'
    },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requestedAt: { type: Date, default: Date.now },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewNotes: String,
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },
    attachments: [{
        fileName: String,
        fileUrl: String,
        fileType: String
    }]
}, { timestamps: true });

CreditRequestSchema.index({ firmId: 1, clientId: 1 });
CreditRequestSchema.index({ firmId: 1, status: 1, requestedAt: -1 });

/**
 * Tier Change Schema
 * Tracks client tier upgrade/downgrade history
 */
const TierChangeSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', required: true },
    fromTier: {
        type: String,
        enum: ['standard', 'premium', 'vip'],
        required: true
    },
    toTier: {
        type: String,
        enum: ['standard', 'premium', 'vip'],
        required: true
    },
    changeType: {
        type: String,
        enum: ['upgrade', 'downgrade', 'no_change'],
        required: true
    },
    reason: String,
    effectiveDate: { type: Date, default: Date.now },
    scheduledDate: Date,
    isScheduled: { type: Boolean, default: false },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, default: Date.now },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String,
    metrics: {
        lifetimeValue: Number,
        activeCases: Number,
        totalPaid: Number,
        averagePaymentTime: Number
    }
}, { timestamps: true });

TierChangeSchema.index({ firmId: 1, clientId: 1, changedAt: -1 });
TierChangeSchema.index({ firmId: 1, isScheduled: 1, scheduledDate: 1 });

/**
 * Reactivation Attempt Schema
 * Tracks attempts to reactivate dormant clients
 */
const ReactivationAttemptSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', required: true },
    strategy: {
        type: String,
        enum: ['email', 'phone_call', 'sms', 'whatsapp', 'meeting', 'special_offer', 'other'],
        required: true
    },
    attemptDate: { type: Date, default: Date.now },
    attemptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    result: {
        type: String,
        enum: ['successful', 'no_response', 'declined', 'scheduled_followup', 'needs_callback'],
        required: true
    },
    notes: String,
    nextFollowUpDate: Date,
    contactMethod: String,
    offerDetails: String,
    responseReceived: { type: Boolean, default: false },
    reactivated: { type: Boolean, default: false },
    reactivatedAt: Date
}, { timestamps: true });

ReactivationAttemptSchema.index({ firmId: 1, clientId: 1, attemptDate: -1 });
ReactivationAttemptSchema.index({ firmId: 1, reactivated: 1 });

/**
 * Health Score History Schema
 * Tracks client health score changes over time
 */
const HealthScoreHistorySchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    grade: {
        type: String,
        enum: ['A', 'B', 'C', 'D', 'F'],
        required: true
    },
    factors: {
        paymentHistory: { type: Number, min: 0, max: 100 },
        caseActivity: { type: Number, min: 0, max: 100 },
        communication: { type: Number, min: 0, max: 100 },
        profitability: { type: Number, min: 0, max: 100 },
        satisfaction: { type: Number, min: 0, max: 100 },
        retention: { type: Number, min: 0, max: 100 }
    },
    riskFlags: [{
        type: String,
        flag: String,
        severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
        description: String
    }],
    recommendations: [String],
    calculatedAt: { type: Date, default: Date.now },
    calculatedBy: String,
    metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

HealthScoreHistorySchema.index({ firmId: 1, clientId: 1, calculatedAt: -1 });
HealthScoreHistorySchema.index({ firmId: 1, grade: 1 });

// Create models from schemas
const ClientOnboardingProgress = mongoose.model('ClientOnboardingProgress', ClientOnboardingProgressSchema);
const CreditRequest = mongoose.model('CreditRequest', CreditRequestSchema);
const TierChange = mongoose.model('TierChange', TierChangeSchema);
const ReactivationAttempt = mongoose.model('ReactivationAttempt', ReactivationAttemptSchema);
const HealthScoreHistory = mongoose.model('HealthScoreHistory', HealthScoreHistorySchema);

// ═══════════════════════════════════════════════════════════════
// CLIENT WORKFLOW SERVICE CLASS
// ═══════════════════════════════════════════════════════════════

class ClientWorkflowService {
    // ═══════════════════════════════════════════════════════════════
    // 1. CLIENT ONBOARDING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Start onboarding process for a client
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @param {String} lawyerId - Lawyer/User ID
     * @param {String} onboardingPlanId - Optional onboarding plan template ID
     * @returns {Promise<Object>} - Onboarding progress record
     */
    async startOnboarding(clientId, firmId, lawyerId, onboardingPlanId = null) {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedClientId = sanitizeObjectId(clientId);
            const sanitizedFirmId = sanitizeObjectId(firmId);
            const sanitizedLawyerId = sanitizeObjectId(lawyerId);

            if (!sanitizedClientId || !sanitizedFirmId || !sanitizedLawyerId) {
                throw CustomException('Invalid client, firm, or lawyer ID', 400);
            }

            // SECURITY: Verify client exists and belongs to firm
            const client = await Client.findOne({
                _id: sanitizedClientId,
                firmId: sanitizedFirmId
            });

            if (!client) {
                throw CustomException('Client not found', 404);
            }

            // Check if onboarding already exists
            const existing = await ClientOnboardingProgress.findOne({
                clientId: sanitizedClientId,
                firmId: sanitizedFirmId,
                status: 'in_progress'
            });

            if (existing) {
                throw CustomException('Onboarding already in progress for this client', 400);
            }

            // Default onboarding steps if no plan provided
            const defaultSteps = [
                { stepId: '1', name: 'Verify Identity', description: 'Verify client identity documents' },
                { stepId: '2', name: 'Collect Documents', description: 'Collect required legal documents' },
                { stepId: '3', name: 'Complete KYC', description: 'Complete Know Your Client checks' },
                { stepId: '4', name: 'Setup Billing', description: 'Setup billing information and payment terms' },
                { stepId: '5', name: 'Conflict Check', description: 'Perform conflict of interest check' },
                { stepId: '6', name: 'Engagement Letter', description: 'Send and sign engagement letter' },
                { stepId: '7', name: 'System Setup', description: 'Setup client in all necessary systems' }
            ];

            // Create onboarding progress
            const onboarding = await ClientOnboardingProgress.create({
                clientId: sanitizedClientId,
                firmId: sanitizedFirmId,
                planId: onboardingPlanId ? sanitizeObjectId(onboardingPlanId) : null,
                startedAt: new Date(),
                status: 'in_progress',
                steps: defaultSteps.map(step => ({
                    ...step,
                    status: 'pending'
                })),
                progress: 0,
                completedSteps: 0,
                totalSteps: defaultSteps.length,
                assignedTo: sanitizedLawyerId
            });

            // Log to audit
            await AuditLogService.log(
                'start_client_onboarding',
                'client',
                sanitizedClientId,
                null,
                {
                    firmId: sanitizedFirmId,
                    userId: sanitizedLawyerId,
                    details: { onboardingId: onboarding._id, totalSteps: defaultSteps.length }
                }
            );

            logger.info(`Client onboarding started for client ${sanitizedClientId}`);

            return onboarding;
        } catch (error) {
            logger.error('ClientWorkflowService.startOnboarding failed:', error.message);
            throw error;
        }
    }

    /**
     * Complete an onboarding step
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @param {String} lawyerId - Lawyer/User ID
     * @param {String} stepId - Step ID to complete
     * @param {String} notes - Optional notes
     * @returns {Promise<Object>} - Updated onboarding progress
     */
    async completeOnboardingStep(clientId, firmId, lawyerId, stepId, notes = '') {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedClientId = sanitizeObjectId(clientId);
            const sanitizedFirmId = sanitizeObjectId(firmId);
            const sanitizedLawyerId = sanitizeObjectId(lawyerId);

            if (!sanitizedClientId || !sanitizedFirmId || !sanitizedLawyerId) {
                throw CustomException('Invalid client, firm, or lawyer ID', 400);
            }

            // SECURITY: Find onboarding with firm isolation
            const onboarding = await ClientOnboardingProgress.findOne({
                clientId: sanitizedClientId,
                firmId: sanitizedFirmId,
                status: 'in_progress'
            });

            if (!onboarding) {
                throw CustomException('Onboarding not found or already completed', 404);
            }

            // Find and update the step
            const stepIndex = onboarding.steps.findIndex(s => s.stepId === stepId);
            if (stepIndex === -1) {
                throw CustomException('Step not found', 404);
            }

            if (onboarding.steps[stepIndex].status === 'completed') {
                throw CustomException('Step already completed', 400);
            }

            // Update step
            onboarding.steps[stepIndex].status = 'completed';
            onboarding.steps[stepIndex].completedAt = new Date();
            onboarding.steps[stepIndex].completedBy = sanitizedLawyerId;
            onboarding.steps[stepIndex].notes = notes;

            // Calculate progress
            const completedCount = onboarding.steps.filter(s => s.status === 'completed').length;
            onboarding.completedSteps = completedCount;
            onboarding.progress = Math.round((completedCount / onboarding.totalSteps) * 100);

            await onboarding.save();

            logger.info(`Onboarding step ${stepId} completed for client ${sanitizedClientId}`);

            return onboarding;
        } catch (error) {
            logger.error('ClientWorkflowService.completeOnboardingStep failed:', error.message);
            throw error;
        }
    }

    /**
     * Skip an onboarding step
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @param {String} lawyerId - Lawyer/User ID
     * @param {String} stepId - Step ID to skip
     * @param {String} reason - Reason for skipping
     * @returns {Promise<Object>} - Updated onboarding progress
     */
    async skipOnboardingStep(clientId, firmId, lawyerId, stepId, reason) {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedClientId = sanitizeObjectId(clientId);
            const sanitizedFirmId = sanitizeObjectId(firmId);
            const sanitizedLawyerId = sanitizeObjectId(lawyerId);

            if (!sanitizedClientId || !sanitizedFirmId || !sanitizedLawyerId) {
                throw CustomException('Invalid client, firm, or lawyer ID', 400);
            }

            if (!reason) {
                throw CustomException('Reason for skipping is required', 400);
            }

            // SECURITY: Find onboarding with firm isolation
            const onboarding = await ClientOnboardingProgress.findOne({
                clientId: sanitizedClientId,
                firmId: sanitizedFirmId,
                status: 'in_progress'
            });

            if (!onboarding) {
                throw CustomException('Onboarding not found or already completed', 404);
            }

            // Find and update the step
            const stepIndex = onboarding.steps.findIndex(s => s.stepId === stepId);
            if (stepIndex === -1) {
                throw CustomException('Step not found', 404);
            }

            // Update step
            onboarding.steps[stepIndex].status = 'skipped';
            onboarding.steps[stepIndex].completedAt = new Date();
            onboarding.steps[stepIndex].completedBy = sanitizedLawyerId;
            onboarding.steps[stepIndex].skippedReason = reason;

            // Recalculate progress (skipped steps don't count toward completion)
            const completedCount = onboarding.steps.filter(s => s.status === 'completed').length;
            onboarding.completedSteps = completedCount;
            onboarding.progress = Math.round((completedCount / onboarding.totalSteps) * 100);

            await onboarding.save();

            logger.info(`Onboarding step ${stepId} skipped for client ${sanitizedClientId}`);

            return onboarding;
        } catch (error) {
            logger.error('ClientWorkflowService.skipOnboardingStep failed:', error.message);
            throw error;
        }
    }

    /**
     * Get onboarding progress for a client
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} - Onboarding progress
     */
    async getOnboardingProgress(clientId, firmId) {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedClientId = sanitizeObjectId(clientId);
            const sanitizedFirmId = sanitizeObjectId(firmId);

            if (!sanitizedClientId || !sanitizedFirmId) {
                throw CustomException('Invalid client or firm ID', 400);
            }

            // SECURITY: Find with firm isolation
            const onboarding = await ClientOnboardingProgress.findOne({
                clientId: sanitizedClientId,
                firmId: sanitizedFirmId
            })
                .populate('assignedTo', 'firstName lastName email')
                .lean();

            if (!onboarding) {
                return null;
            }

            return onboarding;
        } catch (error) {
            logger.error('ClientWorkflowService.getOnboardingProgress failed:', error.message);
            throw error;
        }
    }

    /**
     * Complete onboarding process
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @param {String} lawyerId - Lawyer/User ID
     * @returns {Promise<Object>} - Completed onboarding
     */
    async completeOnboarding(clientId, firmId, lawyerId) {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedClientId = sanitizeObjectId(clientId);
            const sanitizedFirmId = sanitizeObjectId(firmId);
            const sanitizedLawyerId = sanitizeObjectId(lawyerId);

            if (!sanitizedClientId || !sanitizedFirmId || !sanitizedLawyerId) {
                throw CustomException('Invalid client, firm, or lawyer ID', 400);
            }

            // SECURITY: Find onboarding with firm isolation
            const onboarding = await ClientOnboardingProgress.findOne({
                clientId: sanitizedClientId,
                firmId: sanitizedFirmId,
                status: 'in_progress'
            });

            if (!onboarding) {
                throw CustomException('Onboarding not found or already completed', 404);
            }

            // Mark as completed
            onboarding.status = 'completed';
            onboarding.completedAt = new Date();
            onboarding.progress = 100;

            await onboarding.save();

            // Log to audit
            await AuditLogService.log(
                'complete_client_onboarding',
                'client',
                sanitizedClientId,
                null,
                {
                    firmId: sanitizedFirmId,
                    userId: sanitizedLawyerId,
                    details: { onboardingId: onboarding._id }
                }
            );

            logger.info(`Client onboarding completed for client ${sanitizedClientId}`);

            return onboarding;
        } catch (error) {
            logger.error('ClientWorkflowService.completeOnboarding failed:', error.message);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 2. CREDIT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Update credit status for a client
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @param {String} lawyerId - Lawyer/User ID
     * @param {String} newStatus - New credit status (good, warning, hold, blacklisted)
     * @param {String} reason - Reason for status change
     * @returns {Promise<Object>} - Updated client
     */
    async updateCreditStatus(clientId, firmId, lawyerId, newStatus, reason) {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedClientId = sanitizeObjectId(clientId);
            const sanitizedFirmId = sanitizeObjectId(firmId);
            const sanitizedLawyerId = sanitizeObjectId(lawyerId);

            if (!sanitizedClientId || !sanitizedFirmId || !sanitizedLawyerId) {
                throw CustomException('Invalid client, firm, or lawyer ID', 400);
            }

            // Validate status
            const validStatuses = ['good', 'warning', 'hold', 'blacklisted'];
            if (!validStatuses.includes(newStatus)) {
                throw CustomException('Invalid credit status', 400);
            }

            // SECURITY: Find and update client with firm isolation
            const client = await Client.findOne({
                _id: sanitizedClientId,
                firmId: sanitizedFirmId
            });

            if (!client) {
                throw CustomException('Client not found', 404);
            }

            const oldStatus = client.billing?.creditStatus || 'good';

            // Update credit status
            if (!client.billing) {
                client.billing = {};
            }
            client.billing.creditStatus = newStatus;
            client.billing.creditHold = (newStatus === 'hold' || newStatus === 'blacklisted');

            await client.save();

            // Log to audit
            await AuditLogService.log(
                'update_credit_status',
                'client',
                sanitizedClientId,
                { before: { creditStatus: oldStatus }, after: { creditStatus: newStatus } },
                {
                    firmId: sanitizedFirmId,
                    userId: sanitizedLawyerId,
                    details: { reason, oldStatus, newStatus }
                }
            );

            logger.info(`Credit status updated for client ${sanitizedClientId}: ${oldStatus} -> ${newStatus}`);

            return client;
        } catch (error) {
            logger.error('ClientWorkflowService.updateCreditStatus failed:', error.message);
            throw error;
        }
    }

    /**
     * Request credit limit increase
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @param {String} lawyerId - Lawyer/User ID requesting
     * @param {Number} requestedAmount - Requested new credit limit
     * @param {String} justification - Justification for increase
     * @returns {Promise<Object>} - Credit request
     */
    async requestCreditIncrease(clientId, firmId, lawyerId, requestedAmount, justification = '') {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedClientId = sanitizeObjectId(clientId);
            const sanitizedFirmId = sanitizeObjectId(firmId);
            const sanitizedLawyerId = sanitizeObjectId(lawyerId);

            if (!sanitizedClientId || !sanitizedFirmId || !sanitizedLawyerId) {
                throw CustomException('Invalid client, firm, or lawyer ID', 400);
            }

            // Validate amount
            if (!requestedAmount || requestedAmount <= 0) {
                throw CustomException('Invalid requested amount', 400);
            }

            // SECURITY: Verify client exists with firm isolation
            const client = await Client.findOne({
                _id: sanitizedClientId,
                firmId: sanitizedFirmId
            });

            if (!client) {
                throw CustomException('Client not found', 404);
            }

            const currentLimit = client.billing?.creditLimit || 0;

            if (requestedAmount <= currentLimit) {
                throw CustomException('Requested amount must be greater than current limit', 400);
            }

            // Create credit request
            const request = await CreditRequest.create({
                clientId: sanitizedClientId,
                firmId: sanitizedFirmId,
                requestType: 'increase',
                currentLimit: currentLimit,
                requestedAmount: requestedAmount,
                justification: justification,
                status: 'pending',
                requestedBy: sanitizedLawyerId,
                requestedAt: new Date(),
                priority: 'normal'
            });

            // Log to audit
            await AuditLogService.log(
                'request_credit_increase',
                'client',
                sanitizedClientId,
                null,
                {
                    firmId: sanitizedFirmId,
                    userId: sanitizedLawyerId,
                    details: { requestId: request._id, currentLimit, requestedAmount }
                }
            );

            logger.info(`Credit increase requested for client ${sanitizedClientId}: ${currentLimit} -> ${requestedAmount}`);

            return request;
        } catch (error) {
            logger.error('ClientWorkflowService.requestCreditIncrease failed:', error.message);
            throw error;
        }
    }

    /**
     * Approve credit increase request
     * @param {String} requestId - Credit request ID
     * @param {String} firmId - Firm ID
     * @param {String} approverId - Approver user ID
     * @param {Number} approvedAmount - Approved amount (may differ from requested)
     * @param {String} notes - Approval notes
     * @returns {Promise<Object>} - Updated client and request
     */
    async approveCreditIncrease(requestId, firmId, approverId, approvedAmount, notes = '') {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedRequestId = sanitizeObjectId(requestId);
            const sanitizedFirmId = sanitizeObjectId(firmId);
            const sanitizedApproverId = sanitizeObjectId(approverId);

            if (!sanitizedRequestId || !sanitizedFirmId || !sanitizedApproverId) {
                throw CustomException('Invalid request, firm, or approver ID', 400);
            }

            // Validate amount
            if (!approvedAmount || approvedAmount <= 0) {
                throw CustomException('Invalid approved amount', 400);
            }

            // SECURITY: Find request with firm isolation
            const request = await CreditRequest.findOne({
                _id: sanitizedRequestId,
                firmId: sanitizedFirmId
            });

            if (!request) {
                throw CustomException('Credit request not found', 404);
            }

            if (request.status !== 'pending') {
                throw CustomException('Request already processed', 400);
            }

            // Update request
            request.status = 'approved';
            request.approvedAmount = approvedAmount;
            request.reviewedBy = sanitizedApproverId;
            request.reviewedAt = new Date();
            request.reviewNotes = notes;

            await request.save();

            // Update client credit limit - SECURITY: Use firm isolation
            const client = await Client.findOne({
                _id: request.clientId,
                firmId: sanitizedFirmId
            });

            if (!client) {
                throw CustomException('Client not found', 404);
            }

            const oldLimit = client.billing?.creditLimit || 0;

            if (!client.billing) {
                client.billing = {};
            }
            client.billing.creditLimit = approvedAmount;

            await client.save();

            // Log to audit
            await AuditLogService.log(
                'approve_credit_increase',
                'client',
                request.clientId.toString(),
                { before: { creditLimit: oldLimit }, after: { creditLimit: approvedAmount } },
                {
                    firmId: sanitizedFirmId,
                    userId: sanitizedApproverId,
                    details: { requestId: sanitizedRequestId, oldLimit, newLimit: approvedAmount }
                }
            );

            logger.info(`Credit increase approved for client ${request.clientId}: ${oldLimit} -> ${approvedAmount}`);

            return { request, client };
        } catch (error) {
            logger.error('ClientWorkflowService.approveCreditIncrease failed:', error.message);
            throw error;
        }
    }

    /**
     * Reject credit increase request
     * @param {String} requestId - Credit request ID
     * @param {String} firmId - Firm ID
     * @param {String} approverId - Approver user ID
     * @param {String} reason - Rejection reason
     * @returns {Promise<Object>} - Updated request
     */
    async rejectCreditIncrease(requestId, firmId, approverId, reason) {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedRequestId = sanitizeObjectId(requestId);
            const sanitizedFirmId = sanitizeObjectId(firmId);
            const sanitizedApproverId = sanitizeObjectId(approverId);

            if (!sanitizedRequestId || !sanitizedFirmId || !sanitizedApproverId) {
                throw CustomException('Invalid request, firm, or approver ID', 400);
            }

            if (!reason) {
                throw CustomException('Rejection reason is required', 400);
            }

            // SECURITY: Find request with firm isolation
            const request = await CreditRequest.findOne({
                _id: sanitizedRequestId,
                firmId: sanitizedFirmId
            });

            if (!request) {
                throw CustomException('Credit request not found', 404);
            }

            if (request.status !== 'pending') {
                throw CustomException('Request already processed', 400);
            }

            // Update request
            request.status = 'rejected';
            request.reviewedBy = sanitizedApproverId;
            request.reviewedAt = new Date();
            request.reviewNotes = reason;

            await request.save();

            // Log to audit
            await AuditLogService.log(
                'reject_credit_increase',
                'client',
                request.clientId.toString(),
                null,
                {
                    firmId: sanitizedFirmId,
                    userId: sanitizedApproverId,
                    details: { requestId: sanitizedRequestId, reason }
                }
            );

            logger.info(`Credit increase rejected for client ${request.clientId}`);

            return request;
        } catch (error) {
            logger.error('ClientWorkflowService.rejectCreditIncrease failed:', error.message);
            throw error;
        }
    }

    /**
     * Check if amount is within client's credit limit
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @param {Number} amount - Amount to check
     * @returns {Promise<Object>} - Check result with available credit
     */
    async checkCreditLimit(clientId, firmId, amount) {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedClientId = sanitizeObjectId(clientId);
            const sanitizedFirmId = sanitizeObjectId(firmId);

            if (!sanitizedClientId || !sanitizedFirmId) {
                throw CustomException('Invalid client or firm ID', 400);
            }

            // SECURITY: Find client with firm isolation
            const client = await Client.findOne({
                _id: sanitizedClientId,
                firmId: sanitizedFirmId
            });

            if (!client) {
                throw CustomException('Client not found', 404);
            }

            const creditLimit = client.billing?.creditLimit || 0;
            const currentBalance = client.billing?.creditBalance || 0;
            const availableCredit = creditLimit - currentBalance;
            const withinLimit = amount <= availableCredit;

            return {
                withinLimit,
                creditLimit,
                currentBalance,
                availableCredit,
                requestedAmount: amount,
                shortfall: withinLimit ? 0 : (amount - availableCredit)
            };
        } catch (error) {
            logger.error('ClientWorkflowService.checkCreditLimit failed:', error.message);
            throw error;
        }
    }

    /**
     * Get credit history for a client
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Array>} - Credit request history
     */
    async getCreditHistory(clientId, firmId) {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedClientId = sanitizeObjectId(clientId);
            const sanitizedFirmId = sanitizeObjectId(firmId);

            if (!sanitizedClientId || !sanitizedFirmId) {
                throw CustomException('Invalid client or firm ID', 400);
            }

            // SECURITY: Find with firm isolation
            const history = await CreditRequest.find({
                clientId: sanitizedClientId,
                firmId: sanitizedFirmId
            })
                .populate('requestedBy', 'firstName lastName email')
                .populate('reviewedBy', 'firstName lastName email')
                .sort({ requestedAt: -1 })
                .lean();

            return history;
        } catch (error) {
            logger.error('ClientWorkflowService.getCreditHistory failed:', error.message);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. CLIENT UPGRADE/DOWNGRADE
    // ═══════════════════════════════════════════════════════════════

    /**
     * Upgrade client tier
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @param {String} lawyerId - Lawyer/User ID
     * @param {String} newTier - New tier (standard, premium, vip)
     * @param {String} reason - Reason for upgrade
     * @returns {Promise<Object>} - Updated client and tier change record
     */
    async upgradeClient(clientId, firmId, lawyerId, newTier, reason = '') {
        try {
            return await this._changeTier(clientId, firmId, lawyerId, newTier, reason, 'upgrade');
        } catch (error) {
            logger.error('ClientWorkflowService.upgradeClient failed:', error.message);
            throw error;
        }
    }

    /**
     * Downgrade client tier
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @param {String} lawyerId - Lawyer/User ID
     * @param {String} newTier - New tier (standard, premium, vip)
     * @param {String} reason - Reason for downgrade
     * @returns {Promise<Object>} - Updated client and tier change record
     */
    async downgradeClient(clientId, firmId, lawyerId, newTier, reason = '') {
        try {
            return await this._changeTier(clientId, firmId, lawyerId, newTier, reason, 'downgrade');
        } catch (error) {
            logger.error('ClientWorkflowService.downgradeClient failed:', error.message);
            throw error;
        }
    }

    /**
     * Schedule tier change for future date
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @param {String} lawyerId - Lawyer/User ID
     * @param {String} newTier - New tier
     * @param {Date} effectiveDate - When change should take effect
     * @param {String} reason - Reason for change
     * @returns {Promise<Object>} - Scheduled tier change record
     */
    async scheduleTierChange(clientId, firmId, lawyerId, newTier, effectiveDate, reason = '') {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedClientId = sanitizeObjectId(clientId);
            const sanitizedFirmId = sanitizeObjectId(firmId);
            const sanitizedLawyerId = sanitizeObjectId(lawyerId);

            if (!sanitizedClientId || !sanitizedFirmId || !sanitizedLawyerId) {
                throw CustomException('Invalid client, firm, or lawyer ID', 400);
            }

            // Validate tier
            const validTiers = ['standard', 'premium', 'vip'];
            if (!validTiers.includes(newTier)) {
                throw CustomException('Invalid tier', 400);
            }

            // Validate date
            const scheduledDate = new Date(effectiveDate);
            if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
                throw CustomException('Effective date must be in the future', 400);
            }

            // SECURITY: Find client with firm isolation
            const client = await Client.findOne({
                _id: sanitizedClientId,
                firmId: sanitizedFirmId
            });

            if (!client) {
                throw CustomException('Client not found', 404);
            }

            const currentTier = client.clientTier || 'standard';

            if (currentTier === newTier) {
                throw CustomException('Client is already at this tier', 400);
            }

            // Determine change type
            const tierOrder = { standard: 1, premium: 2, vip: 3 };
            const changeType = tierOrder[newTier] > tierOrder[currentTier] ? 'upgrade' : 'downgrade';

            // Create scheduled tier change
            const tierChange = await TierChange.create({
                clientId: sanitizedClientId,
                firmId: sanitizedFirmId,
                fromTier: currentTier,
                toTier: newTier,
                changeType: changeType,
                reason: reason,
                scheduledDate: scheduledDate,
                isScheduled: true,
                changedBy: sanitizedLawyerId,
                changedAt: new Date(),
                metrics: {
                    lifetimeValue: client.lifetimeValue || 0,
                    activeCases: client.activeCases || 0,
                    totalPaid: client.totalPaid || 0
                }
            });

            logger.info(`Tier change scheduled for client ${sanitizedClientId}: ${currentTier} -> ${newTier} on ${scheduledDate}`);

            return tierChange;
        } catch (error) {
            logger.error('ClientWorkflowService.scheduleTierChange failed:', error.message);
            throw error;
        }
    }

    /**
     * Get tier change history for a client
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Array>} - Tier change history
     */
    async getTierHistory(clientId, firmId) {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedClientId = sanitizeObjectId(clientId);
            const sanitizedFirmId = sanitizeObjectId(firmId);

            if (!sanitizedClientId || !sanitizedFirmId) {
                throw CustomException('Invalid client or firm ID', 400);
            }

            // SECURITY: Find with firm isolation
            const history = await TierChange.find({
                clientId: sanitizedClientId,
                firmId: sanitizedFirmId
            })
                .populate('changedBy', 'firstName lastName email')
                .populate('approvedBy', 'firstName lastName email')
                .sort({ changedAt: -1 })
                .lean();

            return history;
        } catch (error) {
            logger.error('ClientWorkflowService.getTierHistory failed:', error.message);
            throw error;
        }
    }

    /**
     * Internal method to change client tier
     * @private
     */
    async _changeTier(clientId, firmId, lawyerId, newTier, reason, changeType) {
        // SECURITY: Sanitize and validate IDs
        const sanitizedClientId = sanitizeObjectId(clientId);
        const sanitizedFirmId = sanitizeObjectId(firmId);
        const sanitizedLawyerId = sanitizeObjectId(lawyerId);

        if (!sanitizedClientId || !sanitizedFirmId || !sanitizedLawyerId) {
            throw CustomException('Invalid client, firm, or lawyer ID', 400);
        }

        // Validate tier
        const validTiers = ['standard', 'premium', 'vip'];
        if (!validTiers.includes(newTier)) {
            throw CustomException('Invalid tier', 400);
        }

        // SECURITY: Find and update client with firm isolation
        const client = await Client.findOne({
            _id: sanitizedClientId,
            firmId: sanitizedFirmId
        });

        if (!client) {
            throw CustomException('Client not found', 404);
        }

        const oldTier = client.clientTier || 'standard';

        if (oldTier === newTier) {
            throw CustomException('Client is already at this tier', 400);
        }

        // Verify change type matches
        const tierOrder = { standard: 1, premium: 2, vip: 3 };
        const actualChangeType = tierOrder[newTier] > tierOrder[oldTier] ? 'upgrade' : 'downgrade';

        if (actualChangeType !== changeType) {
            throw CustomException(`Cannot ${changeType} from ${oldTier} to ${newTier}`, 400);
        }

        // Update client tier
        client.clientTier = newTier;
        await client.save();

        // Create tier change record
        const tierChange = await TierChange.create({
            clientId: sanitizedClientId,
            firmId: sanitizedFirmId,
            fromTier: oldTier,
            toTier: newTier,
            changeType: changeType,
            reason: reason,
            effectiveDate: new Date(),
            changedBy: sanitizedLawyerId,
            changedAt: new Date(),
            metrics: {
                lifetimeValue: client.lifetimeValue || 0,
                activeCases: client.activeCases || 0,
                totalPaid: client.totalPaid || 0
            }
        });

        // Log to audit
        await AuditLogService.log(
            `${changeType}_client_tier`,
            'client',
            sanitizedClientId,
            { before: { clientTier: oldTier }, after: { clientTier: newTier } },
            {
                firmId: sanitizedFirmId,
                userId: sanitizedLawyerId,
                details: { oldTier, newTier, reason }
            }
        );

        logger.info(`Client tier ${changeType}d: ${sanitizedClientId} from ${oldTier} to ${newTier}`);

        return { client, tierChange };
    }

    // ═══════════════════════════════════════════════════════════════
    // 4. DORMANCY DETECTION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Check for dormant clients (no activity in specified days)
     * @param {String} firmId - Firm ID
     * @param {Number} dormancyDays - Days of inactivity to consider dormant (default 90)
     * @returns {Promise<Array>} - List of dormant clients
     */
    async checkDormancy(firmId, dormancyDays = 90) {
        try {
            // SECURITY: Sanitize firm ID
            const sanitizedFirmId = sanitizeObjectId(firmId);

            if (!sanitizedFirmId) {
                throw CustomException('Invalid firm ID', 400);
            }

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - dormancyDays);

            // SECURITY: Find clients with firm isolation
            const dormantClients = await Client.find({
                firmId: sanitizedFirmId,
                status: 'active',
                $or: [
                    { lastActivityAt: { $lt: cutoffDate } },
                    { lastActivityAt: { $exists: false } }
                ]
            })
                .select('clientNumber firstName lastName companyName email phone lastActivityAt lastContactedAt')
                .lean();

            logger.info(`Found ${dormantClients.length} dormant clients for firm ${sanitizedFirmId}`);

            return dormantClients;
        } catch (error) {
            logger.error('ClientWorkflowService.checkDormancy failed:', error.message);
            throw error;
        }
    }

    /**
     * Mark client as dormant
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @param {String} lawyerId - Lawyer/User ID
     * @returns {Promise<Object>} - Updated client
     */
    async markAsDormant(clientId, firmId, lawyerId) {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedClientId = sanitizeObjectId(clientId);
            const sanitizedFirmId = sanitizeObjectId(firmId);
            const sanitizedLawyerId = sanitizeObjectId(lawyerId);

            if (!sanitizedClientId || !sanitizedFirmId || !sanitizedLawyerId) {
                throw CustomException('Invalid client, firm, or lawyer ID', 400);
            }

            // SECURITY: Find and update client with firm isolation
            const client = await Client.findOneAndUpdate(
                {
                    _id: sanitizedClientId,
                    firmId: sanitizedFirmId
                },
                {
                    $set: {
                        status: 'inactive',
                        updatedBy: sanitizedLawyerId
                    }
                },
                { new: true }
            );

            if (!client) {
                throw CustomException('Client not found', 404);
            }

            // Log to audit
            await AuditLogService.log(
                'mark_client_dormant',
                'client',
                sanitizedClientId,
                { before: { status: 'active' }, after: { status: 'inactive' } },
                {
                    firmId: sanitizedFirmId,
                    userId: sanitizedLawyerId,
                    details: { reason: 'dormancy' }
                }
            );

            logger.info(`Client ${sanitizedClientId} marked as dormant`);

            return client;
        } catch (error) {
            logger.error('ClientWorkflowService.markAsDormant failed:', error.message);
            throw error;
        }
    }

    /**
     * Get list of dormant clients with filtering
     * @param {String} firmId - Firm ID
     * @param {Object} options - Filter options
     * @returns {Promise<Array>} - Dormant clients
     */
    async getDormantClients(firmId, options = {}) {
        try {
            // SECURITY: Sanitize firm ID
            const sanitizedFirmId = sanitizeObjectId(firmId);

            if (!sanitizedFirmId) {
                throw CustomException('Invalid firm ID', 400);
            }

            const query = {
                firmId: sanitizedFirmId,
                status: 'inactive'
            };

            // Apply filters
            if (options.tier) {
                query.clientTier = options.tier;
            }

            if (options.dormantSince) {
                query.lastActivityAt = { $lt: new Date(options.dormantSince) };
            }

            // SECURITY: Find with firm isolation
            const clients = await Client.find(query)
                .select('clientNumber firstName lastName companyName email phone lastActivityAt clientTier lifetimeValue')
                .sort({ lastActivityAt: 1 })
                .limit(options.limit || 100)
                .lean();

            return clients;
        } catch (error) {
            logger.error('ClientWorkflowService.getDormantClients failed:', error.message);
            throw error;
        }
    }

    /**
     * Get last activity date for a client
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} - Last activity information
     */
    async getLastActivityDate(clientId, firmId) {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedClientId = sanitizeObjectId(clientId);
            const sanitizedFirmId = sanitizeObjectId(firmId);

            if (!sanitizedClientId || !sanitizedFirmId) {
                throw CustomException('Invalid client or firm ID', 400);
            }

            // SECURITY: Find client with firm isolation
            const client = await Client.findOne({
                _id: sanitizedClientId,
                firmId: sanitizedFirmId
            })
                .select('lastActivityAt lastContactedAt activityCount')
                .lean();

            if (!client) {
                throw CustomException('Client not found', 404);
            }

            const daysSinceActivity = client.lastActivityAt
                ? Math.floor((Date.now() - new Date(client.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24))
                : null;

            return {
                lastActivityAt: client.lastActivityAt,
                lastContactedAt: client.lastContactedAt,
                daysSinceActivity: daysSinceActivity,
                activityCount: client.activityCount || 0
            };
        } catch (error) {
            logger.error('ClientWorkflowService.getLastActivityDate failed:', error.message);
            throw error;
        }
    }

    /**
     * Send dormancy alert (placeholder for notification integration)
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} - Alert result
     */
    async sendDormancyAlert(clientId, firmId) {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedClientId = sanitizeObjectId(clientId);
            const sanitizedFirmId = sanitizeObjectId(firmId);

            if (!sanitizedClientId || !sanitizedFirmId) {
                throw CustomException('Invalid client or firm ID', 400);
            }

            // TODO: Integrate with notification service
            // For now, just log the alert

            logger.info(`Dormancy alert for client ${sanitizedClientId}`);

            return {
                success: true,
                message: 'Dormancy alert logged (notification integration pending)'
            };
        } catch (error) {
            logger.error('ClientWorkflowService.sendDormancyAlert failed:', error.message);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 5. CLIENT REACTIVATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Start reactivation campaign for dormant client
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @param {String} lawyerId - Lawyer/User ID
     * @param {String} strategy - Reactivation strategy
     * @returns {Promise<Object>} - Reactivation campaign details
     */
    async startReactivation(clientId, firmId, lawyerId, strategy = 'email') {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedClientId = sanitizeObjectId(clientId);
            const sanitizedFirmId = sanitizeObjectId(firmId);
            const sanitizedLawyerId = sanitizeObjectId(lawyerId);

            if (!sanitizedClientId || !sanitizedFirmId || !sanitizedLawyerId) {
                throw CustomException('Invalid client, firm, or lawyer ID', 400);
            }

            // Validate strategy
            const validStrategies = ['email', 'phone_call', 'sms', 'whatsapp', 'meeting', 'special_offer', 'other'];
            if (!validStrategies.includes(strategy)) {
                throw CustomException('Invalid reactivation strategy', 400);
            }

            // SECURITY: Verify client exists with firm isolation
            const client = await Client.findOne({
                _id: sanitizedClientId,
                firmId: sanitizedFirmId
            });

            if (!client) {
                throw CustomException('Client not found', 404);
            }

            // Create initial reactivation attempt
            const attempt = await ReactivationAttempt.create({
                clientId: sanitizedClientId,
                firmId: sanitizedFirmId,
                strategy: strategy,
                attemptDate: new Date(),
                attemptedBy: sanitizedLawyerId,
                result: 'no_response', // Default until updated
                notes: `Reactivation campaign started with ${strategy} strategy`,
                responseReceived: false,
                reactivated: false
            });

            // Log to audit
            await AuditLogService.log(
                'start_reactivation',
                'client',
                sanitizedClientId,
                null,
                {
                    firmId: sanitizedFirmId,
                    userId: sanitizedLawyerId,
                    details: { strategy, attemptId: attempt._id }
                }
            );

            logger.info(`Reactivation campaign started for client ${sanitizedClientId} with strategy: ${strategy}`);

            return attempt;
        } catch (error) {
            logger.error('ClientWorkflowService.startReactivation failed:', error.message);
            throw error;
        }
    }

    /**
     * Log reactivation attempt
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @param {String} lawyerId - Lawyer/User ID
     * @param {String} method - Contact method used
     * @param {String} result - Result of attempt
     * @param {String} notes - Additional notes
     * @returns {Promise<Object>} - Reactivation attempt record
     */
    async logReactivationAttempt(clientId, firmId, lawyerId, method, result, notes = '') {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedClientId = sanitizeObjectId(clientId);
            const sanitizedFirmId = sanitizeObjectId(firmId);
            const sanitizedLawyerId = sanitizeObjectId(lawyerId);

            if (!sanitizedClientId || !sanitizedFirmId || !sanitizedLawyerId) {
                throw CustomException('Invalid client, firm, or lawyer ID', 400);
            }

            // Validate result
            const validResults = ['successful', 'no_response', 'declined', 'scheduled_followup', 'needs_callback'];
            if (!validResults.includes(result)) {
                throw CustomException('Invalid attempt result', 400);
            }

            // Create attempt record
            const attempt = await ReactivationAttempt.create({
                clientId: sanitizedClientId,
                firmId: sanitizedFirmId,
                strategy: method,
                attemptDate: new Date(),
                attemptedBy: sanitizedLawyerId,
                result: result,
                notes: notes,
                responseReceived: result !== 'no_response',
                reactivated: result === 'successful'
            });

            logger.info(`Reactivation attempt logged for client ${sanitizedClientId}: ${result}`);

            return attempt;
        } catch (error) {
            logger.error('ClientWorkflowService.logReactivationAttempt failed:', error.message);
            throw error;
        }
    }

    /**
     * Mark client as reactivated
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @param {String} lawyerId - Lawyer/User ID
     * @returns {Promise<Object>} - Updated client
     */
    async markAsReactivated(clientId, firmId, lawyerId) {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedClientId = sanitizeObjectId(clientId);
            const sanitizedFirmId = sanitizeObjectId(firmId);
            const sanitizedLawyerId = sanitizeObjectId(lawyerId);

            if (!sanitizedClientId || !sanitizedFirmId || !sanitizedLawyerId) {
                throw CustomException('Invalid client, firm, or lawyer ID', 400);
            }

            // SECURITY: Update client with firm isolation
            const client = await Client.findOneAndUpdate(
                {
                    _id: sanitizedClientId,
                    firmId: sanitizedFirmId
                },
                {
                    $set: {
                        status: 'active',
                        lastActivityAt: new Date(),
                        updatedBy: sanitizedLawyerId
                    }
                },
                { new: true }
            );

            if (!client) {
                throw CustomException('Client not found', 404);
            }

            // Update most recent reactivation attempt
            await ReactivationAttempt.findOneAndUpdate(
                {
                    clientId: sanitizedClientId,
                    firmId: sanitizedFirmId
                },
                {
                    $set: {
                        reactivated: true,
                        reactivatedAt: new Date()
                    }
                },
                { sort: { attemptDate: -1 } }
            );

            // Log to audit
            await AuditLogService.log(
                'reactivate_client',
                'client',
                sanitizedClientId,
                { before: { status: 'inactive' }, after: { status: 'active' } },
                {
                    firmId: sanitizedFirmId,
                    userId: sanitizedLawyerId,
                    details: { reason: 'reactivation_campaign' }
                }
            );

            logger.info(`Client ${sanitizedClientId} reactivated`);

            return client;
        } catch (error) {
            logger.error('ClientWorkflowService.markAsReactivated failed:', error.message);
            throw error;
        }
    }

    /**
     * Get reactivation history for a client
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Array>} - Reactivation attempt history
     */
    async getReactivationHistory(clientId, firmId) {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedClientId = sanitizeObjectId(clientId);
            const sanitizedFirmId = sanitizeObjectId(firmId);

            if (!sanitizedClientId || !sanitizedFirmId) {
                throw CustomException('Invalid client or firm ID', 400);
            }

            // SECURITY: Find with firm isolation
            const history = await ReactivationAttempt.find({
                clientId: sanitizedClientId,
                firmId: sanitizedFirmId
            })
                .populate('attemptedBy', 'firstName lastName email')
                .sort({ attemptDate: -1 })
                .lean();

            return history;
        } catch (error) {
            logger.error('ClientWorkflowService.getReactivationHistory failed:', error.message);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 6. CLIENT HEALTH SCORING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Calculate health score for a client
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} - Health score with factors
     */
    async calculateHealthScore(clientId, firmId) {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedClientId = sanitizeObjectId(clientId);
            const sanitizedFirmId = sanitizeObjectId(firmId);

            if (!sanitizedClientId || !sanitizedFirmId) {
                throw CustomException('Invalid client or firm ID', 400);
            }

            // SECURITY: Find client with firm isolation
            const client = await Client.findOne({
                _id: sanitizedClientId,
                firmId: sanitizedFirmId
            });

            if (!client) {
                throw CustomException('Client not found', 404);
            }

            // Calculate individual factors (0-100 scale)
            const factors = {
                paymentHistory: this._calculatePaymentScore(client),
                caseActivity: this._calculateActivityScore(client),
                communication: this._calculateCommunicationScore(client),
                profitability: this._calculateProfitabilityScore(client),
                satisfaction: this._calculateSatisfactionScore(client),
                retention: this._calculateRetentionScore(client)
            };

            // Overall score (weighted average)
            const weights = {
                paymentHistory: 0.25,
                caseActivity: 0.20,
                communication: 0.15,
                profitability: 0.20,
                satisfaction: 0.10,
                retention: 0.10
            };

            const overallScore = Object.keys(factors).reduce((sum, key) => {
                return sum + (factors[key] * weights[key]);
            }, 0);

            // Determine grade
            let grade;
            if (overallScore >= 90) grade = 'A';
            else if (overallScore >= 80) grade = 'B';
            else if (overallScore >= 70) grade = 'C';
            else if (overallScore >= 60) grade = 'D';
            else grade = 'F';

            // Identify risk flags
            const riskFlags = this._identifyRiskFlags(client, factors);

            // Generate recommendations
            const recommendations = this._generateRecommendations(factors, riskFlags);

            return {
                clientId: sanitizedClientId,
                score: Math.round(overallScore),
                grade,
                factors,
                riskFlags,
                recommendations,
                calculatedAt: new Date()
            };
        } catch (error) {
            logger.error('ClientWorkflowService.calculateHealthScore failed:', error.message);
            throw error;
        }
    }

    /**
     * Get individual health factors for a client
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} - Health factors breakdown
     */
    async getHealthFactors(clientId, firmId) {
        try {
            const healthScore = await this.calculateHealthScore(clientId, firmId);
            return healthScore.factors;
        } catch (error) {
            logger.error('ClientWorkflowService.getHealthFactors failed:', error.message);
            throw error;
        }
    }

    /**
     * Update and save health score for a client
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} - Saved health score history
     */
    async updateHealthScore(clientId, firmId) {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedClientId = sanitizeObjectId(clientId);
            const sanitizedFirmId = sanitizeObjectId(firmId);

            if (!sanitizedClientId || !sanitizedFirmId) {
                throw CustomException('Invalid client or firm ID', 400);
            }

            // Calculate health score
            const healthScore = await this.calculateHealthScore(sanitizedClientId, sanitizedFirmId);

            // Save to history
            const historyRecord = await HealthScoreHistory.create({
                clientId: sanitizedClientId,
                firmId: sanitizedFirmId,
                score: healthScore.score,
                grade: healthScore.grade,
                factors: healthScore.factors,
                riskFlags: healthScore.riskFlags,
                recommendations: healthScore.recommendations,
                calculatedAt: new Date(),
                calculatedBy: 'system'
            });

            logger.info(`Health score updated for client ${sanitizedClientId}: ${healthScore.score} (${healthScore.grade})`);

            return historyRecord;
        } catch (error) {
            logger.error('ClientWorkflowService.updateHealthScore failed:', error.message);
            throw error;
        }
    }

    /**
     * Get at-risk clients below threshold score
     * @param {String} firmId - Firm ID
     * @param {Number} threshold - Score threshold (default 60)
     * @returns {Promise<Array>} - At-risk clients
     */
    async getAtRiskClients(firmId, threshold = 60) {
        try {
            // SECURITY: Sanitize firm ID
            const sanitizedFirmId = sanitizeObjectId(firmId);

            if (!sanitizedFirmId) {
                throw CustomException('Invalid firm ID', 400);
            }

            // Get latest health scores for each client
            const atRiskClients = await HealthScoreHistory.aggregate([
                {
                    $match: {
                        firmId: new mongoose.Types.ObjectId(sanitizedFirmId),
                        score: { $lt: threshold }
                    }
                },
                {
                    $sort: { clientId: 1, calculatedAt: -1 }
                },
                {
                    $group: {
                        _id: '$clientId',
                        latestScore: { $first: '$$ROOT' }
                    }
                },
                {
                    $replaceRoot: { newRoot: '$latestScore' }
                },
                {
                    $sort: { score: 1 }
                }
            ]);

            // Populate client details
            const clientIds = atRiskClients.map(record => record.clientId);
            const clients = await Client.find({
                _id: { $in: clientIds },
                firmId: sanitizedFirmId
            })
                .select('clientNumber firstName lastName companyName email phone clientTier lifetimeValue')
                .lean();

            // Merge client details with scores
            const results = atRiskClients.map(scoreRecord => {
                const client = clients.find(c => c._id.toString() === scoreRecord.clientId.toString());
                return {
                    ...client,
                    healthScore: scoreRecord
                };
            });

            logger.info(`Found ${results.length} at-risk clients for firm ${sanitizedFirmId}`);

            return results;
        } catch (error) {
            logger.error('ClientWorkflowService.getAtRiskClients failed:', error.message);
            throw error;
        }
    }

    /**
     * Schedule periodic health checks (placeholder for cron integration)
     * @param {String} firmId - Firm ID
     * @param {String} frequency - Check frequency (daily, weekly, monthly)
     * @returns {Promise<Object>} - Schedule confirmation
     */
    async scheduleHealthCheck(firmId, frequency = 'weekly') {
        try {
            // SECURITY: Sanitize firm ID
            const sanitizedFirmId = sanitizeObjectId(firmId);

            if (!sanitizedFirmId) {
                throw CustomException('Invalid firm ID', 400);
            }

            // TODO: Integrate with job scheduler (Bull, Agenda, etc.)
            // For now, just log the schedule

            logger.info(`Health check scheduled for firm ${sanitizedFirmId}: ${frequency}`);

            return {
                success: true,
                message: `Health check scheduled: ${frequency} (scheduler integration pending)`
            };
        } catch (error) {
            logger.error('ClientWorkflowService.scheduleHealthCheck failed:', error.message);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 7. CLIENT SEGMENTATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Assign client to segment
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @param {String} lawyerId - Lawyer/User ID
     * @param {String} segmentId - Segment ID (tag ID)
     * @returns {Promise<Object>} - Updated client
     */
    async assignToSegment(clientId, firmId, lawyerId, segmentId) {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedClientId = sanitizeObjectId(clientId);
            const sanitizedFirmId = sanitizeObjectId(firmId);
            const sanitizedSegmentId = sanitizeObjectId(segmentId);

            if (!sanitizedClientId || !sanitizedFirmId || !sanitizedSegmentId) {
                throw CustomException('Invalid client, firm, or segment ID', 400);
            }

            // SECURITY: Update client with firm isolation
            const client = await Client.findOneAndUpdate(
                {
                    _id: sanitizedClientId,
                    firmId: sanitizedFirmId
                },
                {
                    $addToSet: { tagIds: sanitizedSegmentId }
                },
                { new: true }
            );

            if (!client) {
                throw CustomException('Client not found', 404);
            }

            logger.info(`Client ${sanitizedClientId} assigned to segment ${sanitizedSegmentId}`);

            return client;
        } catch (error) {
            logger.error('ClientWorkflowService.assignToSegment failed:', error.message);
            throw error;
        }
    }

    /**
     * Remove client from segment
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @param {String} lawyerId - Lawyer/User ID
     * @param {String} segmentId - Segment ID (tag ID)
     * @returns {Promise<Object>} - Updated client
     */
    async removeFromSegment(clientId, firmId, lawyerId, segmentId) {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedClientId = sanitizeObjectId(clientId);
            const sanitizedFirmId = sanitizeObjectId(firmId);
            const sanitizedSegmentId = sanitizeObjectId(segmentId);

            if (!sanitizedClientId || !sanitizedFirmId || !sanitizedSegmentId) {
                throw CustomException('Invalid client, firm, or segment ID', 400);
            }

            // SECURITY: Update client with firm isolation
            const client = await Client.findOneAndUpdate(
                {
                    _id: sanitizedClientId,
                    firmId: sanitizedFirmId
                },
                {
                    $pull: { tagIds: sanitizedSegmentId }
                },
                { new: true }
            );

            if (!client) {
                throw CustomException('Client not found', 404);
            }

            logger.info(`Client ${sanitizedClientId} removed from segment ${sanitizedSegmentId}`);

            return client;
        } catch (error) {
            logger.error('ClientWorkflowService.removeFromSegment failed:', error.message);
            throw error;
        }
    }

    /**
     * Auto-segment clients based on rules
     * @param {String} firmId - Firm ID
     * @param {Object} rules - Segmentation rules
     * @returns {Promise<Object>} - Segmentation results
     */
    async autoSegment(firmId, rules = {}) {
        try {
            // SECURITY: Sanitize firm ID
            const sanitizedFirmId = sanitizeObjectId(firmId);

            if (!sanitizedFirmId) {
                throw CustomException('Invalid firm ID', 400);
            }

            // Example auto-segmentation rules
            const results = {
                highValue: 0,
                atRisk: 0,
                newClients: 0,
                dormant: 0
            };

            // High Value Clients (LTV > threshold)
            if (rules.highValueThreshold) {
                const highValueClients = await Client.updateMany(
                    {
                        firmId: sanitizedFirmId,
                        lifetimeValue: { $gte: rules.highValueThreshold }
                    },
                    {
                        $addToSet: { tags: 'high_value' }
                    }
                );
                results.highValue = highValueClients.modifiedCount;
            }

            // New Clients (created within last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const newClients = await Client.updateMany(
                {
                    firmId: sanitizedFirmId,
                    createdAt: { $gte: thirtyDaysAgo }
                },
                {
                    $addToSet: { tags: 'new_client' }
                }
            );
            results.newClients = newClients.modifiedCount;

            // Dormant Clients (no activity in 90 days)
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            const dormantClients = await Client.updateMany(
                {
                    firmId: sanitizedFirmId,
                    status: 'active',
                    lastActivityAt: { $lt: ninetyDaysAgo }
                },
                {
                    $addToSet: { tags: 'dormant' }
                }
            );
            results.dormant = dormantClients.modifiedCount;

            logger.info(`Auto-segmentation completed for firm ${sanitizedFirmId}:`, results);

            return results;
        } catch (error) {
            logger.error('ClientWorkflowService.autoSegment failed:', error.message);
            throw error;
        }
    }

    /**
     * Get clients in a segment
     * @param {String} segmentId - Segment ID (tag ID)
     * @param {String} firmId - Firm ID
     * @returns {Promise<Array>} - Clients in segment
     */
    async getSegmentMembers(segmentId, firmId) {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedSegmentId = sanitizeObjectId(segmentId);
            const sanitizedFirmId = sanitizeObjectId(firmId);

            if (!sanitizedSegmentId || !sanitizedFirmId) {
                throw CustomException('Invalid segment or firm ID', 400);
            }

            // SECURITY: Find with firm isolation
            const clients = await Client.find({
                firmId: sanitizedFirmId,
                tagIds: sanitizedSegmentId
            })
                .select('clientNumber firstName lastName companyName email phone clientTier lifetimeValue status')
                .lean();

            return clients;
        } catch (error) {
            logger.error('ClientWorkflowService.getSegmentMembers failed:', error.message);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 8. CLIENT LIFECYCLE
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get current lifecycle stage for a client
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} - Lifecycle stage information
     */
    async getLifecycleStage(clientId, firmId) {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedClientId = sanitizeObjectId(clientId);
            const sanitizedFirmId = sanitizeObjectId(firmId);

            if (!sanitizedClientId || !sanitizedFirmId) {
                throw CustomException('Invalid client or firm ID', 400);
            }

            // SECURITY: Find client with firm isolation
            const client = await Client.findOne({
                _id: sanitizedClientId,
                firmId: sanitizedFirmId
            })
                .select('createdAt status activeCases totalPaid lifetimeValue lastActivityAt')
                .lean();

            if (!client) {
                throw CustomException('Client not found', 404);
            }

            // Determine lifecycle stage based on client attributes
            let stage = 'new';
            let stageName = 'New Client';

            const daysSinceCreation = Math.floor((Date.now() - new Date(client.createdAt).getTime()) / (1000 * 60 * 60 * 24));

            if (client.status === 'inactive') {
                stage = 'churned';
                stageName = 'Churned';
            } else if (!client.lastActivityAt || daysSinceCreation > 90) {
                stage = 'at_risk';
                stageName = 'At Risk';
            } else if ((client.lifetimeValue || 0) > 100000 && (client.activeCases || 0) > 5) {
                stage = 'advocate';
                stageName = 'Advocate';
            } else if ((client.activeCases || 0) > 0) {
                stage = 'active';
                stageName = 'Active';
            } else if (daysSinceCreation > 30) {
                stage = 'established';
                stageName = 'Established';
            }

            return {
                stage,
                stageName,
                daysSinceCreation,
                metrics: {
                    activeCases: client.activeCases || 0,
                    totalPaid: client.totalPaid || 0,
                    lifetimeValue: client.lifetimeValue || 0,
                    lastActivityAt: client.lastActivityAt
                }
            };
        } catch (error) {
            logger.error('ClientWorkflowService.getLifecycleStage failed:', error.message);
            throw error;
        }
    }

    /**
     * Progress client to new lifecycle stage (placeholder)
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @param {String} lawyerId - Lawyer/User ID
     * @param {String} newStage - New lifecycle stage
     * @returns {Promise<Object>} - Result
     */
    async progressLifecycle(clientId, firmId, lawyerId, newStage) {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedClientId = sanitizeObjectId(clientId);
            const sanitizedFirmId = sanitizeObjectId(firmId);

            if (!sanitizedClientId || !sanitizedFirmId) {
                throw CustomException('Invalid client or firm ID', 400);
            }

            // TODO: Implement lifecycle stage tracking
            // For now, just return success

            logger.info(`Lifecycle progressed for client ${sanitizedClientId} to ${newStage}`);

            return {
                success: true,
                message: 'Lifecycle stage progression logged (full implementation pending)'
            };
        } catch (error) {
            logger.error('ClientWorkflowService.progressLifecycle failed:', error.message);
            throw error;
        }
    }

    /**
     * Get lifecycle history (placeholder)
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Array>} - Lifecycle history
     */
    async getLifecycleHistory(clientId, firmId) {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedClientId = sanitizeObjectId(clientId);
            const sanitizedFirmId = sanitizeObjectId(firmId);

            if (!sanitizedClientId || !sanitizedFirmId) {
                throw CustomException('Invalid client or firm ID', 400);
            }

            // TODO: Implement lifecycle history tracking
            // For now, return empty array

            return [];
        } catch (error) {
            logger.error('ClientWorkflowService.getLifecycleHistory failed:', error.message);
            throw error;
        }
    }

    /**
     * Calculate lifetime value for a client
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} - Lifetime value calculation
     */
    async calculateLifetimeValue(clientId, firmId) {
        try {
            // SECURITY: Sanitize and validate IDs
            const sanitizedClientId = sanitizeObjectId(clientId);
            const sanitizedFirmId = sanitizeObjectId(firmId);

            if (!sanitizedClientId || !sanitizedFirmId) {
                throw CustomException('Invalid client or firm ID', 400);
            }

            // SECURITY: Find client with firm isolation
            const client = await Client.findOne({
                _id: sanitizedClientId,
                firmId: sanitizedFirmId
            })
                .select('totalPaid activeCases createdAt')
                .lean();

            if (!client) {
                throw CustomException('Client not found', 404);
            }

            const totalRevenue = client.totalPaid || 0;
            const activeCases = client.activeCases || 0;
            const daysSinceCreation = Math.floor((Date.now() - new Date(client.createdAt).getTime()) / (1000 * 60 * 60 * 24));
            const monthsSinceCreation = daysSinceCreation / 30;

            // Simple LTV calculation: total revenue + projected future revenue
            const averageRevenuePerMonth = monthsSinceCreation > 0 ? totalRevenue / monthsSinceCreation : 0;
            const projectedFutureRevenue = averageRevenuePerMonth * 12; // Project next 12 months

            const lifetimeValue = totalRevenue + projectedFutureRevenue;

            return {
                totalRevenue,
                averageRevenuePerMonth: Math.round(averageRevenuePerMonth),
                projectedFutureRevenue: Math.round(projectedFutureRevenue),
                lifetimeValue: Math.round(lifetimeValue),
                activeCases,
                monthsSinceCreation: Math.round(monthsSinceCreation)
            };
        } catch (error) {
            logger.error('ClientWorkflowService.calculateLifetimeValue failed:', error.message);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE HELPER METHODS FOR HEALTH SCORING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Calculate payment history score
     * @private
     */
    _calculatePaymentScore(client) {
        const creditStatus = client.billing?.creditStatus || 'good';
        const totalPaid = client.totalPaid || 0;
        const totalOutstanding = client.totalOutstanding || 0;

        let score = 100;

        // Deduct based on credit status
        if (creditStatus === 'blacklisted') score -= 50;
        else if (creditStatus === 'hold') score -= 30;
        else if (creditStatus === 'warning') score -= 15;

        // Deduct based on outstanding balance
        if (totalPaid > 0) {
            const outstandingRatio = totalOutstanding / totalPaid;
            if (outstandingRatio > 0.5) score -= 20;
            else if (outstandingRatio > 0.3) score -= 10;
        }

        return Math.max(0, score);
    }

    /**
     * Calculate activity score
     * @private
     */
    _calculateActivityScore(client) {
        const activeCases = client.activeCases || 0;
        const lastActivityAt = client.lastActivityAt;

        let score = 50;

        // Add score for active cases
        score += Math.min(30, activeCases * 10);

        // Add/deduct based on last activity
        if (lastActivityAt) {
            const daysSinceActivity = Math.floor((Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceActivity < 7) score += 20;
            else if (daysSinceActivity < 30) score += 10;
            else if (daysSinceActivity > 90) score -= 20;
            else if (daysSinceActivity > 60) score -= 10;
        } else {
            score -= 20;
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Calculate communication score
     * @private
     */
    _calculateCommunicationScore(client) {
        const activityCount = client.activityCount || 0;
        const callCount = client.callCount || 0;
        const emailCount = client.emailCount || 0;

        let score = 50;

        // Add score for communication frequency
        const totalCommunications = activityCount + callCount + emailCount;
        score += Math.min(50, totalCommunications * 2);

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Calculate profitability score
     * @private
     */
    _calculateProfitabilityScore(client) {
        const lifetimeValue = client.lifetimeValue || 0;
        const totalPaid = client.totalPaid || 0;

        let score = 50;

        // Add score based on LTV
        if (lifetimeValue > 500000) score += 50; // > 5000 SAR
        else if (lifetimeValue > 100000) score += 30; // > 1000 SAR
        else if (lifetimeValue > 50000) score += 20; // > 500 SAR
        else if (lifetimeValue > 10000) score += 10; // > 100 SAR

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Calculate satisfaction score (placeholder)
     * @private
     */
    _calculateSatisfactionScore(client) {
        // TODO: Integrate with satisfaction survey data
        // For now, use client rating if available
        const rating = client.clientRating || 3;
        return (rating / 5) * 100;
    }

    /**
     * Calculate retention score
     * @private
     */
    _calculateRetentionScore(client) {
        const createdAt = new Date(client.createdAt);
        const monthsSinceCreation = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30));

        let score = 50;

        // Add score for tenure
        score += Math.min(30, monthsSinceCreation * 2);

        // Add score if active
        if (client.status === 'active') {
            score += 20;
        } else {
            score -= 30;
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Identify risk flags
     * @private
     */
    _identifyRiskFlags(client, factors) {
        const flags = [];

        if (factors.paymentHistory < 50) {
            flags.push({
                flag: 'poor_payment_history',
                severity: 'high',
                description: 'Client has poor payment history'
            });
        }

        if (factors.caseActivity < 40) {
            flags.push({
                flag: 'low_activity',
                severity: 'medium',
                description: 'Client has low case activity'
            });
        }

        if (factors.communication < 30) {
            flags.push({
                flag: 'poor_communication',
                severity: 'medium',
                description: 'Limited communication with client'
            });
        }

        if (client.billing?.creditStatus === 'hold' || client.billing?.creditStatus === 'blacklisted') {
            flags.push({
                flag: 'credit_hold',
                severity: 'critical',
                description: 'Client has credit hold'
            });
        }

        return flags;
    }

    /**
     * Generate recommendations
     * @private
     */
    _generateRecommendations(factors, riskFlags) {
        const recommendations = [];

        if (factors.paymentHistory < 70) {
            recommendations.push('Review payment terms and follow up on outstanding invoices');
        }

        if (factors.caseActivity < 50) {
            recommendations.push('Schedule meeting to discuss new cases or ongoing needs');
        }

        if (factors.communication < 60) {
            recommendations.push('Increase communication frequency with client');
        }

        if (factors.profitability < 50) {
            recommendations.push('Explore upsell opportunities or review pricing');
        }

        if (riskFlags.some(f => f.severity === 'critical' || f.severity === 'high')) {
            recommendations.push('Immediate action required - client at high risk of churn');
        }

        return recommendations;
    }
}

// Export singleton instance
module.exports = new ClientWorkflowService();
