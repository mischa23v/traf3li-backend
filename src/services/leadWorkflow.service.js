/**
 * Lead Workflow Service
 * Security: All methods require firmId parameter for multi-tenant isolation
 *
 * Comprehensive lead workflow management including:
 * - Lead conversion (to opportunity, client, quote)
 * - Lead assignment and reassignment
 * - Lead qualification (BANT scoring)
 * - Lead nurturing campaigns
 * - Stage progression and tracking
 * - Event tracking and metrics calculation
 */

const mongoose = require('mongoose');
const Lead = require('../models/lead.model');
const Client = require('../models/client.model');
const Contact = require('../models/contact.model');
const Quote = require('../models/quote.model');
const Activity = require('../models/activity.model');
const ActivityPlan = require('../models/activityPlan.model');
const LostReason = require('../models/lostReason.model');
const { CustomException } = require('../utils');
const { sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class LeadWorkflowService {
    // ═══════════════════════════════════════════════════════════════
    // LEAD CONVERSION WORKFLOW
    // ═══════════════════════════════════════════════════════════════

    /**
     * Convert lead to opportunity stage
     * @param {String} leadId - Lead ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} lawyerId - Lawyer ID performing the action
     * @param {Object} options - Optional conversion options
     * @returns {Promise<Object>} Updated lead
     */
    async convertToOpportunity(leadId, firmId, lawyerId, options = {}) {
        if (!firmId) throw new Error('firmId is required');
        if (!leadId) throw new Error('leadId is required');
        if (!lawyerId) throw new Error('lawyerId is required');

        const sanitizedLeadId = sanitizeObjectId(leadId);
        const sanitizedLawyerId = sanitizeObjectId(lawyerId);

        // Find lead with firm isolation
        const lead = await Lead.findOne({
            _id: sanitizedLeadId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!lead) {
            throw CustomException('Lead not found', 404);
        }

        // Validate current status
        if (lead.status === 'won') {
            throw CustomException('Lead already won/converted', 400);
        }

        // Update lead to opportunity stage
        lead.status = 'qualified';
        lead.probability = 40; // Standard probability for qualified stage
        lead.stageChangedAt = new Date();
        lead.lastModifiedBy = sanitizedLawyerId;

        // Track event
        await this._trackWorkflowEvent(lead, {
            eventType: 'converted_to_opportunity',
            performedBy: sanitizedLawyerId,
            previousValue: lead.status,
            newValue: 'qualified',
            notes: options.notes || 'Converted to opportunity stage'
        });

        // Calculate metrics
        this._updateMetrics(lead);

        await lead.save();

        logger.info('LeadWorkflow: Converted to opportunity', {
            leadId: lead._id,
            firmId,
            lawyerId
        });

        return lead;
    }

    /**
     * Convert lead to client with comprehensive data preservation
     * @param {String} leadId - Lead ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} lawyerId - Lawyer ID performing the action
     * @param {Object} clientData - Additional client data (optional)
     * @returns {Promise<Object>} Object containing { client, lead, case }
     */
    async convertToClient(leadId, firmId, lawyerId, clientData = {}) {
        if (!firmId) throw new Error('firmId is required');
        if (!leadId) throw new Error('leadId is required');
        if (!lawyerId) throw new Error('lawyerId is required');

        const sanitizedLeadId = sanitizeObjectId(leadId);
        const sanitizedLawyerId = sanitizeObjectId(lawyerId);

        // Find lead with firm isolation
        const lead = await Lead.findOne({
            _id: sanitizedLeadId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!lead) {
            throw CustomException('Lead not found', 404);
        }

        // Check if already converted
        if (lead.convertedToClient) {
            throw CustomException('Lead already converted to client', 400);
        }

        // Use the lead's built-in convertToClient method (preserves all data)
        const conversionOptions = {
            createCase: clientData.createCase || false,
            caseTitle: clientData.caseTitle
        };

        const result = await lead.convertToClient(sanitizedLawyerId, conversionOptions);

        // Track conversion event
        await this._trackWorkflowEvent(lead, {
            eventType: 'converted_to_client',
            performedBy: sanitizedLawyerId,
            previousValue: 'lead',
            newValue: 'client',
            notes: clientData.notes || 'Lead converted to client'
        });

        // Calculate daysToClose metric
        const daysToClose = Math.floor(
            (new Date() - lead.createdAt) / (1000 * 60 * 60 * 24)
        );
        lead.metrics = lead.metrics || {};
        lead.metrics.daysToClose = daysToClose;
        await lead.save();

        logger.info('LeadWorkflow: Converted to client', {
            leadId: lead._id,
            clientId: result.client._id,
            firmId,
            lawyerId,
            daysToClose
        });

        return {
            client: result.client,
            case: result.case,
            lead: lead
        };
    }

    /**
     * Create quote from lead
     * @param {String} leadId - Lead ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} lawyerId - Lawyer ID performing the action
     * @param {Object} quoteData - Quote data
     * @returns {Promise<Object>} Created quote and updated lead
     */
    async createQuoteFromLead(leadId, firmId, lawyerId, quoteData = {}) {
        if (!firmId) throw new Error('firmId is required');
        if (!leadId) throw new Error('leadId is required');
        if (!lawyerId) throw new Error('lawyerId is required');

        const sanitizedLeadId = sanitizeObjectId(leadId);
        const sanitizedLawyerId = sanitizeObjectId(lawyerId);

        // Find lead with firm isolation
        const lead = await Lead.findOne({
            _id: sanitizedLeadId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!lead) {
            throw CustomException('Lead not found', 404);
        }

        // Prepare quote data from lead
        const quote = new Quote({
            firmId: new mongoose.Types.ObjectId(firmId),
            lawyerId: sanitizedLawyerId,
            leadId: lead._id,

            // Customer information
            customerType: lead.type,
            customer: {
                name: lead.type === 'company'
                    ? lead.companyName
                    : `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
                email: lead.email,
                phone: lead.phone,
                address: lead.address?.fullAddress || '',
                nationalId: lead.nationalId,
                crNumber: lead.commercialRegistration
            },

            // Quote details
            title: quoteData.title || `Quote for ${lead.displayName}`,
            description: quoteData.description || lead.intake?.caseDescription,
            validUntil: quoteData.validUntil || this._calculateValidUntil(30), // 30 days default

            // Line items
            items: quoteData.items || [],

            // Status
            status: 'draft',

            // Notes
            notes: quoteData.notes || lead.notes,
            internalNotes: quoteData.internalNotes,

            // Audit
            createdBy: sanitizedLawyerId
        });

        await quote.save();

        // Update lead status to proposal stage
        lead.status = 'proposal';
        lead.probability = 60;
        lead.stageChangedAt = new Date();
        lead.lastModifiedBy = sanitizedLawyerId;

        // Track event
        await this._trackWorkflowEvent(lead, {
            eventType: 'quote_created',
            performedBy: sanitizedLawyerId,
            previousValue: lead.status,
            newValue: 'proposal',
            notes: `Quote ${quote.quoteNumber} created`,
            metadata: { quoteId: quote._id }
        });

        await lead.save();

        logger.info('LeadWorkflow: Quote created from lead', {
            leadId: lead._id,
            quoteId: quote._id,
            firmId,
            lawyerId
        });

        return { quote, lead };
    }

    // ═══════════════════════════════════════════════════════════════
    // LEAD ASSIGNMENT WORKFLOW
    // ═══════════════════════════════════════════════════════════════

    /**
     * Assign lead to a lawyer
     * @param {String} leadId - Lead ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} lawyerId - Current lawyer ID (performing the action)
     * @param {String} assigneeId - Assignee lawyer ID
     * @returns {Promise<Object>} Updated lead
     */
    async assignToLawyer(leadId, firmId, lawyerId, assigneeId) {
        if (!firmId) throw new Error('firmId is required');
        if (!leadId) throw new Error('leadId is required');
        if (!assigneeId) throw new Error('assigneeId is required');

        const sanitizedLeadId = sanitizeObjectId(leadId);
        const sanitizedLawyerId = sanitizeObjectId(lawyerId);
        const sanitizedAssigneeId = sanitizeObjectId(assigneeId);

        // Find lead with firm isolation
        const lead = await Lead.findOne({
            _id: sanitizedLeadId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!lead) {
            throw CustomException('Lead not found', 404);
        }

        const previousAssignee = lead.assignedTo;
        lead.assignedTo = sanitizedAssigneeId;
        lead.lastModifiedBy = sanitizedLawyerId;

        // Calculate daysToAssign if this is the first assignment
        if (!previousAssignee && !lead.metrics?.daysToAssign) {
            const daysToAssign = Math.floor(
                (new Date() - lead.createdAt) / (1000 * 60 * 60 * 24)
            );
            lead.metrics = lead.metrics || {};
            lead.metrics.daysToAssign = daysToAssign;
        }

        // Track event
        await this._trackWorkflowEvent(lead, {
            eventType: 'assigned',
            performedBy: sanitizedLawyerId,
            previousValue: previousAssignee?.toString(),
            newValue: sanitizedAssigneeId.toString(),
            notes: 'Lead assigned'
        });

        await lead.save();

        logger.info('LeadWorkflow: Lead assigned', {
            leadId: lead._id,
            assigneeId,
            firmId,
            lawyerId
        });

        return lead;
    }

    /**
     * Reassign lead to different lawyer with reason tracking
     * @param {String} leadId - Lead ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} lawyerId - Current lawyer ID
     * @param {String} newAssigneeId - New assignee lawyer ID
     * @param {String} reason - Reason for reassignment
     * @returns {Promise<Object>} Updated lead
     */
    async reassignLead(leadId, firmId, lawyerId, newAssigneeId, reason) {
        if (!firmId) throw new Error('firmId is required');
        if (!leadId) throw new Error('leadId is required');
        if (!newAssigneeId) throw new Error('newAssigneeId is required');

        const sanitizedLeadId = sanitizeObjectId(leadId);
        const sanitizedLawyerId = sanitizeObjectId(lawyerId);
        const sanitizedNewAssigneeId = sanitizeObjectId(newAssigneeId);

        // Find lead with firm isolation
        const lead = await Lead.findOne({
            _id: sanitizedLeadId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!lead) {
            throw CustomException('Lead not found', 404);
        }

        const previousAssignee = lead.assignedTo;
        lead.assignedTo = sanitizedNewAssigneeId;
        lead.lastModifiedBy = sanitizedLawyerId;

        // Track event with reason
        await this._trackWorkflowEvent(lead, {
            eventType: 'reassigned',
            performedBy: sanitizedLawyerId,
            previousValue: previousAssignee?.toString(),
            newValue: sanitizedNewAssigneeId.toString(),
            notes: reason || 'Lead reassigned'
        });

        await lead.save();

        logger.info('LeadWorkflow: Lead reassigned', {
            leadId: lead._id,
            previousAssignee,
            newAssigneeId,
            reason,
            firmId
        });

        return lead;
    }

    /**
     * Bulk assign leads to a lawyer
     * @param {Array<String>} leadIds - Array of lead IDs
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} lawyerId - Current lawyer ID
     * @param {String} assigneeId - Assignee lawyer ID
     * @returns {Promise<Object>} Result with success/failure counts
     */
    async bulkAssign(leadIds, firmId, lawyerId, assigneeId) {
        if (!firmId) throw new Error('firmId is required');
        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            throw new Error('leadIds array is required');
        }
        if (!assigneeId) throw new Error('assigneeId is required');

        const sanitizedAssigneeId = sanitizeObjectId(assigneeId);
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        for (const leadId of leadIds) {
            try {
                await this.assignToLawyer(leadId, firmId, lawyerId, assigneeId);
                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push({
                    leadId,
                    error: error.message
                });
            }
        }

        logger.info('LeadWorkflow: Bulk assign completed', {
            total: leadIds.length,
            success: results.success,
            failed: results.failed,
            firmId,
            assigneeId
        });

        return results;
    }

    // ═══════════════════════════════════════════════════════════════
    // LEAD QUALIFICATION WORKFLOW (BANT)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Qualify lead using BANT methodology
     * @param {String} leadId - Lead ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} lawyerId - Lawyer ID performing qualification
     * @param {Object} bantScores - BANT qualification data
     * @returns {Promise<Object>} Updated lead with qualification scores
     */
    async qualifyLead(leadId, firmId, lawyerId, bantScores) {
        if (!firmId) throw new Error('firmId is required');
        if (!leadId) throw new Error('leadId is required');
        if (!lawyerId) throw new Error('lawyerId is required');
        if (!bantScores) throw new Error('bantScores is required');

        const sanitizedLeadId = sanitizeObjectId(leadId);
        const sanitizedLawyerId = sanitizeObjectId(lawyerId);

        // Find lead with firm isolation
        const lead = await Lead.findOne({
            _id: sanitizedLeadId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!lead) {
            throw CustomException('Lead not found', 404);
        }

        // Update qualification data
        lead.qualification = lead.qualification || {};

        if (bantScores.budget !== undefined) {
            lead.qualification.budget = bantScores.budget;
            lead.qualification.budgetAmount = bantScores.budgetAmount;
            lead.qualification.budgetNotes = bantScores.budgetNotes;
        }

        if (bantScores.authority !== undefined) {
            lead.qualification.authority = bantScores.authority;
            lead.qualification.authorityNotes = bantScores.authorityNotes;
        }

        if (bantScores.need !== undefined) {
            lead.qualification.need = bantScores.need;
            lead.qualification.needDescription = bantScores.needDescription;
        }

        if (bantScores.timeline !== undefined) {
            lead.qualification.timeline = bantScores.timeline;
            lead.qualification.timelineNotes = bantScores.timelineNotes;
        }

        if (bantScores.notes) {
            lead.qualification.notes = bantScores.notes;
        }

        lead.qualification.qualifiedAt = new Date();
        lead.qualification.qualifiedBy = sanitizedLawyerId;

        // Update lead status to qualified
        const previousStatus = lead.status;
        lead.status = 'qualified';
        lead.probability = 40;
        lead.stageChangedAt = new Date();
        lead.lastModifiedBy = sanitizedLawyerId;

        // The lead's pre-save hook will automatically calculate the score
        await lead.save();

        // Track event
        await this._trackWorkflowEvent(lead, {
            eventType: 'qualified',
            performedBy: sanitizedLawyerId,
            previousValue: previousStatus,
            newValue: 'qualified',
            notes: `Lead qualified with BANT score: ${lead.leadScore}/150`,
            metadata: {
                score: lead.leadScore,
                scoreBreakdown: lead.qualification.scoreBreakdown
            }
        });

        logger.info('LeadWorkflow: Lead qualified', {
            leadId: lead._id,
            score: lead.leadScore,
            firmId,
            lawyerId
        });

        return lead;
    }

    /**
     * Disqualify lead with reason
     * @param {String} leadId - Lead ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} lawyerId - Lawyer ID performing action
     * @param {String} reason - Disqualification reason
     * @returns {Promise<Object>} Updated lead
     */
    async disqualifyLead(leadId, firmId, lawyerId, reason) {
        if (!firmId) throw new Error('firmId is required');
        if (!leadId) throw new Error('leadId is required');
        if (!lawyerId) throw new Error('lawyerId is required');

        const sanitizedLeadId = sanitizeObjectId(leadId);
        const sanitizedLawyerId = sanitizeObjectId(lawyerId);

        // Find lead with firm isolation
        const lead = await Lead.findOne({
            _id: sanitizedLeadId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!lead) {
            throw CustomException('Lead not found', 404);
        }

        const previousStatus = lead.status;
        lead.status = 'lost';
        lead.lostReason = 'not_qualified';
        lead.lostReasonDetails = reason || 'Lead disqualified';
        lead.lostDate = new Date();
        lead.probability = 0;
        lead.actualCloseDate = new Date();
        lead.lastModifiedBy = sanitizedLawyerId;

        // Track event
        await this._trackWorkflowEvent(lead, {
            eventType: 'disqualified',
            performedBy: sanitizedLawyerId,
            previousValue: previousStatus,
            newValue: 'lost',
            notes: reason || 'Lead disqualified'
        });

        await lead.save();

        logger.info('LeadWorkflow: Lead disqualified', {
            leadId: lead._id,
            reason,
            firmId,
            lawyerId
        });

        return lead;
    }

    /**
     * Auto-calculate lead qualification score
     * @param {String} leadId - Lead ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @returns {Promise<Object>} Lead with calculated score
     */
    async calculateQualificationScore(leadId, firmId) {
        if (!firmId) throw new Error('firmId is required');
        if (!leadId) throw new Error('leadId is required');

        const sanitizedLeadId = sanitizeObjectId(leadId);

        // Find lead with firm isolation
        const lead = await Lead.findOne({
            _id: sanitizedLeadId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!lead) {
            throw CustomException('Lead not found', 404);
        }

        // The score is automatically calculated by the lead model's pre-save hook
        // We just need to trigger a save
        await lead.save();

        logger.info('LeadWorkflow: Qualification score calculated', {
            leadId: lead._id,
            score: lead.leadScore,
            firmId
        });

        return lead;
    }

    // ═══════════════════════════════════════════════════════════════
    // LEAD NURTURING WORKFLOW
    // ═══════════════════════════════════════════════════════════════

    /**
     * Start nurturing campaign for lead
     * @param {String} leadId - Lead ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} lawyerId - Lawyer ID
     * @param {String} activityPlanId - Activity plan/sequence ID
     * @returns {Promise<Object>} Lead with nurturing started
     */
    async startNurturingCampaign(leadId, firmId, lawyerId, activityPlanId) {
        if (!firmId) throw new Error('firmId is required');
        if (!leadId) throw new Error('leadId is required');
        if (!lawyerId) throw new Error('lawyerId is required');
        if (!activityPlanId) throw new Error('activityPlanId is required');

        const sanitizedLeadId = sanitizeObjectId(leadId);
        const sanitizedLawyerId = sanitizeObjectId(lawyerId);
        const sanitizedPlanId = sanitizeObjectId(activityPlanId);

        // Find lead with firm isolation
        const lead = await Lead.findOne({
            _id: sanitizedLeadId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!lead) {
            throw CustomException('Lead not found', 404);
        }

        // Find activity plan with firm isolation
        const activityPlan = await ActivityPlan.findOne({
            _id: sanitizedPlanId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!activityPlan) {
            throw CustomException('Activity plan not found', 404);
        }

        // Store nurturing info in custom fields
        if (!lead.customFields) {
            lead.customFields = {};
        }
        lead.customFields.nurturingCampaign = {
            activityPlanId: sanitizedPlanId,
            activityPlanName: activityPlan.name,
            startedAt: new Date(),
            startedBy: sanitizedLawyerId,
            status: 'active',
            currentStep: 0,
            completedSteps: []
        };

        lead.lastModifiedBy = sanitizedLawyerId;

        // Track event
        await this._trackWorkflowEvent(lead, {
            eventType: 'nurturing_started',
            performedBy: sanitizedLawyerId,
            previousValue: null,
            newValue: activityPlan.name,
            notes: `Started nurturing campaign: ${activityPlan.name}`,
            metadata: { activityPlanId: sanitizedPlanId }
        });

        await lead.save();

        logger.info('LeadWorkflow: Nurturing campaign started', {
            leadId: lead._id,
            activityPlanId,
            firmId,
            lawyerId
        });

        return lead;
    }

    /**
     * Pause nurturing campaign
     * @param {String} leadId - Lead ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} lawyerId - Lawyer ID
     * @returns {Promise<Object>} Updated lead
     */
    async pauseNurturing(leadId, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');
        if (!leadId) throw new Error('leadId is required');
        if (!lawyerId) throw new Error('lawyerId is required');

        const sanitizedLeadId = sanitizeObjectId(leadId);
        const sanitizedLawyerId = sanitizeObjectId(lawyerId);

        // Find lead with firm isolation
        const lead = await Lead.findOne({
            _id: sanitizedLeadId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!lead) {
            throw CustomException('Lead not found', 404);
        }

        if (!lead.customFields?.nurturingCampaign) {
            throw CustomException('No active nurturing campaign', 400);
        }

        lead.customFields.nurturingCampaign.status = 'paused';
        lead.customFields.nurturingCampaign.pausedAt = new Date();
        lead.customFields.nurturingCampaign.pausedBy = sanitizedLawyerId;
        lead.lastModifiedBy = sanitizedLawyerId;

        // Track event
        await this._trackWorkflowEvent(lead, {
            eventType: 'nurturing_paused',
            performedBy: sanitizedLawyerId,
            previousValue: 'active',
            newValue: 'paused',
            notes: 'Nurturing campaign paused'
        });

        await lead.save();

        logger.info('LeadWorkflow: Nurturing paused', {
            leadId: lead._id,
            firmId,
            lawyerId
        });

        return lead;
    }

    /**
     * Resume nurturing campaign
     * @param {String} leadId - Lead ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} lawyerId - Lawyer ID
     * @returns {Promise<Object>} Updated lead
     */
    async resumeNurturing(leadId, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');
        if (!leadId) throw new Error('leadId is required');
        if (!lawyerId) throw new Error('lawyerId is required');

        const sanitizedLeadId = sanitizeObjectId(leadId);
        const sanitizedLawyerId = sanitizeObjectId(lawyerId);

        // Find lead with firm isolation
        const lead = await Lead.findOne({
            _id: sanitizedLeadId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!lead) {
            throw CustomException('Lead not found', 404);
        }

        if (!lead.customFields?.nurturingCampaign) {
            throw CustomException('No nurturing campaign to resume', 400);
        }

        lead.customFields.nurturingCampaign.status = 'active';
        lead.customFields.nurturingCampaign.resumedAt = new Date();
        lead.customFields.nurturingCampaign.resumedBy = sanitizedLawyerId;
        lead.lastModifiedBy = sanitizedLawyerId;

        // Track event
        await this._trackWorkflowEvent(lead, {
            eventType: 'nurturing_resumed',
            performedBy: sanitizedLawyerId,
            previousValue: 'paused',
            newValue: 'active',
            notes: 'Nurturing campaign resumed'
        });

        await lead.save();

        logger.info('LeadWorkflow: Nurturing resumed', {
            leadId: lead._id,
            firmId,
            lawyerId
        });

        return lead;
    }

    /**
     * Get next nurturing step for lead
     * @param {String} leadId - Lead ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @returns {Promise<Object>} Next step information
     */
    async getNextNurturingStep(leadId, firmId) {
        if (!firmId) throw new Error('firmId is required');
        if (!leadId) throw new Error('leadId is required');

        const sanitizedLeadId = sanitizeObjectId(leadId);

        // Find lead with firm isolation
        const lead = await Lead.findOne({
            _id: sanitizedLeadId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!lead) {
            throw CustomException('Lead not found', 404);
        }

        const campaign = lead.customFields?.nurturingCampaign;
        if (!campaign || campaign.status !== 'active') {
            return { hasNext: false, message: 'No active nurturing campaign' };
        }

        // Find activity plan
        const activityPlan = await ActivityPlan.findOne({
            _id: campaign.activityPlanId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!activityPlan) {
            return { hasNext: false, message: 'Activity plan not found' };
        }

        const currentStepIndex = campaign.currentStep || 0;
        if (currentStepIndex >= activityPlan.steps.length) {
            return { hasNext: false, message: 'All steps completed' };
        }

        const nextStep = activityPlan.steps[currentStepIndex];
        return {
            hasNext: true,
            step: nextStep,
            stepNumber: currentStepIndex + 1,
            totalSteps: activityPlan.steps.length,
            activityPlan: {
                id: activityPlan._id,
                name: activityPlan.name
            }
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // STAGE PROGRESSION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Move lead to specific stage
     * @param {String} leadId - Lead ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} lawyerId - Lawyer ID
     * @param {String} newStage - New stage/status
     * @returns {Promise<Object>} Updated lead
     */
    async moveToStage(leadId, firmId, lawyerId, newStage) {
        if (!firmId) throw new Error('firmId is required');
        if (!leadId) throw new Error('leadId is required');
        if (!lawyerId) throw new Error('lawyerId is required');
        if (!newStage) throw new Error('newStage is required');

        const sanitizedLeadId = sanitizeObjectId(leadId);
        const sanitizedLawyerId = sanitizeObjectId(lawyerId);

        // Validate stage
        const validStages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'dormant'];
        if (!validStages.includes(newStage)) {
            throw CustomException(`Invalid stage: ${newStage}`, 400);
        }

        // Find lead with firm isolation
        const lead = await Lead.findOne({
            _id: sanitizedLeadId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!lead) {
            throw CustomException('Lead not found', 404);
        }

        const previousStage = lead.status;
        lead.status = newStage;
        lead.stageChangedAt = new Date();
        lead.lastModifiedBy = sanitizedLawyerId;

        // Update probability based on stage
        const probabilityMap = {
            'new': 10,
            'contacted': 20,
            'qualified': 40,
            'proposal': 60,
            'negotiation': 80,
            'won': 100,
            'lost': 0,
            'dormant': 5
        };
        lead.probability = probabilityMap[newStage] || lead.probability;

        // Track event
        await this._trackWorkflowEvent(lead, {
            eventType: 'stage_changed',
            performedBy: sanitizedLawyerId,
            previousValue: previousStage,
            newValue: newStage,
            notes: `Stage changed from ${previousStage} to ${newStage}`
        });

        // Update metrics
        this._updateMetrics(lead);

        await lead.save();

        logger.info('LeadWorkflow: Stage changed', {
            leadId: lead._id,
            previousStage,
            newStage,
            firmId,
            lawyerId
        });

        return lead;
    }

    /**
     * Auto-progress lead to next stage
     * @param {String} leadId - Lead ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} lawyerId - Lawyer ID
     * @returns {Promise<Object>} Updated lead
     */
    async progressToNextStage(leadId, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');
        if (!leadId) throw new Error('leadId is required');
        if (!lawyerId) throw new Error('lawyerId is required');

        const sanitizedLeadId = sanitizeObjectId(leadId);

        // Find lead with firm isolation
        const lead = await Lead.findOne({
            _id: sanitizedLeadId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!lead) {
            throw CustomException('Lead not found', 404);
        }

        // Define stage progression
        const stageProgression = {
            'new': 'contacted',
            'contacted': 'qualified',
            'qualified': 'proposal',
            'proposal': 'negotiation',
            'negotiation': 'won'
        };

        const nextStage = stageProgression[lead.status];
        if (!nextStage) {
            throw CustomException(`Cannot progress from stage: ${lead.status}`, 400);
        }

        return this.moveToStage(leadId, firmId, lawyerId, nextStage);
    }

    /**
     * Mark lead as won with details
     * @param {String} leadId - Lead ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} lawyerId - Lawyer ID
     * @param {Object} wonDetails - Win details
     * @returns {Promise<Object>} Updated lead
     */
    async markAsWon(leadId, firmId, lawyerId, wonDetails = {}) {
        if (!firmId) throw new Error('firmId is required');
        if (!leadId) throw new Error('leadId is required');
        if (!lawyerId) throw new Error('lawyerId is required');

        const sanitizedLeadId = sanitizeObjectId(leadId);
        const sanitizedLawyerId = sanitizeObjectId(lawyerId);

        // Find lead with firm isolation
        const lead = await Lead.findOne({
            _id: sanitizedLeadId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!lead) {
            throw CustomException('Lead not found', 404);
        }

        const previousStage = lead.status;
        lead.status = 'won';
        lead.probability = 100;
        lead.actualCloseDate = wonDetails.closeDate || new Date();
        lead.stageChangedAt = new Date();
        lead.lastModifiedBy = sanitizedLawyerId;

        // Calculate daysToClose
        const daysToClose = Math.floor(
            (lead.actualCloseDate - lead.createdAt) / (1000 * 60 * 60 * 24)
        );
        lead.metrics = lead.metrics || {};
        lead.metrics.daysToClose = daysToClose;

        // Track event
        await this._trackWorkflowEvent(lead, {
            eventType: 'won',
            performedBy: sanitizedLawyerId,
            previousValue: previousStage,
            newValue: 'won',
            notes: wonDetails.notes || 'Lead marked as won',
            metadata: {
                closeDate: lead.actualCloseDate,
                daysToClose,
                wonValue: wonDetails.value || lead.estimatedValue
            }
        });

        await lead.save();

        logger.info('LeadWorkflow: Lead marked as won', {
            leadId: lead._id,
            daysToClose,
            value: wonDetails.value || lead.estimatedValue,
            firmId,
            lawyerId
        });

        return lead;
    }

    /**
     * Mark lead as lost with reason
     * @param {String} leadId - Lead ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} lawyerId - Lawyer ID
     * @param {String} lostReasonId - Lost reason ID (optional)
     * @param {Object} lostDetails - Lost details
     * @returns {Promise<Object>} Updated lead
     */
    async markAsLost(leadId, firmId, lawyerId, lostReasonId, lostDetails = {}) {
        if (!firmId) throw new Error('firmId is required');
        if (!leadId) throw new Error('leadId is required');
        if (!lawyerId) throw new Error('lawyerId is required');

        const sanitizedLeadId = sanitizeObjectId(leadId);
        const sanitizedLawyerId = sanitizeObjectId(lawyerId);

        // Find lead with firm isolation
        const lead = await Lead.findOne({
            _id: sanitizedLeadId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!lead) {
            throw CustomException('Lead not found', 404);
        }

        const previousStage = lead.status;
        lead.status = 'lost';
        lead.probability = 0;
        lead.lostDate = lostDetails.lostDate || new Date();
        lead.actualCloseDate = lead.lostDate;
        lead.lostNotes = lostDetails.notes;
        lead.lostToCompetitor = lostDetails.competitor;
        lead.stageChangedAt = new Date();
        lead.lastModifiedBy = sanitizedLawyerId;

        // Handle lost reason
        if (lostReasonId) {
            const sanitizedReasonId = sanitizeObjectId(lostReasonId);

            // Verify lost reason exists and belongs to firm
            const lostReason = await LostReason.findOne({
                _id: sanitizedReasonId,
                firmId: new mongoose.Types.ObjectId(firmId)
            });

            if (lostReason) {
                lead.lostReasonId = sanitizedReasonId;
                lead.lostReason = null; // Clear old string field

                // Increment usage count
                await LostReason.incrementUsage(sanitizedReasonId, firmId);
            }
        } else if (lostDetails.reason) {
            lead.lostReason = lostDetails.reason;
        }

        lead.lostReasonDetails = lostDetails.details || lostDetails.notes;

        // Track event
        await this._trackWorkflowEvent(lead, {
            eventType: 'lost',
            performedBy: sanitizedLawyerId,
            previousValue: previousStage,
            newValue: 'lost',
            notes: lostDetails.notes || 'Lead marked as lost',
            metadata: {
                lostReasonId,
                lostReason: lostDetails.reason,
                competitor: lostDetails.competitor
            }
        });

        await lead.save();

        logger.info('LeadWorkflow: Lead marked as lost', {
            leadId: lead._id,
            lostReasonId,
            reason: lostDetails.reason,
            firmId,
            lawyerId
        });

        return lead;
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Track workflow event in lead's custom fields
     * @private
     * @param {Object} lead - Lead document
     * @param {Object} event - Event data
     */
    async _trackWorkflowEvent(lead, event) {
        if (!lead.customFields) {
            lead.customFields = {};
        }
        if (!lead.customFields.workflowEvents) {
            lead.customFields.workflowEvents = [];
        }

        lead.customFields.workflowEvents.push({
            eventType: event.eventType,
            timestamp: new Date(),
            performedBy: event.performedBy,
            previousValue: event.previousValue,
            newValue: event.newValue,
            notes: event.notes,
            metadata: event.metadata || {}
        });

        // Keep only last 50 events to prevent document from growing too large
        if (lead.customFields.workflowEvents.length > 50) {
            lead.customFields.workflowEvents = lead.customFields.workflowEvents.slice(-50);
        }
    }

    /**
     * Update lead metrics
     * @private
     * @param {Object} lead - Lead document
     */
    _updateMetrics(lead) {
        if (!lead.metrics) {
            lead.metrics = {};
        }

        // Update lastActivityDaysAgo
        if (lead.lastActivityAt) {
            const daysSinceActivity = Math.floor(
                (Date.now() - lead.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24)
            );
            lead.metrics.lastActivityDaysAgo = daysSinceActivity;
        }

        // Update totalActivities
        lead.metrics.totalActivities = (lead.activityCount || 0) +
                                        (lead.callCount || 0) +
                                        (lead.emailCount || 0) +
                                        (lead.meetingCount || 0);
    }

    /**
     * Calculate valid until date for quote
     * @private
     * @param {Number} days - Number of days
     * @returns {Date} Valid until date
     */
    _calculateValidUntil(days) {
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + days);
        return validUntil;
    }

    /**
     * Get workflow event history for a lead
     * @param {String} leadId - Lead ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @returns {Promise<Array>} Workflow events
     */
    async getWorkflowHistory(leadId, firmId) {
        if (!firmId) throw new Error('firmId is required');
        if (!leadId) throw new Error('leadId is required');

        const sanitizedLeadId = sanitizeObjectId(leadId);

        // Find lead with firm isolation
        const lead = await Lead.findOne({
            _id: sanitizedLeadId,
            firmId: new mongoose.Types.ObjectId(firmId)
        }).select('customFields');

        if (!lead) {
            throw CustomException('Lead not found', 404);
        }

        return lead.customFields?.workflowEvents || [];
    }

    /**
     * Get workflow statistics for a firm
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Workflow statistics
     */
    async getWorkflowStats(firmId, options = {}) {
        if (!firmId) throw new Error('firmId is required');

        const { startDate, endDate } = options;
        const matchQuery = {
            firmId: new mongoose.Types.ObjectId(firmId)
        };

        if (startDate || endDate) {
            matchQuery.createdAt = {};
            if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
            if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
        }

        const stats = await Lead.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    totalLeads: { $sum: 1 },
                    convertedToClient: {
                        $sum: { $cond: ['$convertedToClient', 1, 0] }
                    },
                    wonLeads: {
                        $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] }
                    },
                    lostLeads: {
                        $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] }
                    },
                    avgDaysToAssign: { $avg: '$metrics.daysToAssign' },
                    avgDaysToClose: { $avg: '$metrics.daysToClose' },
                    avgLeadScore: { $avg: '$leadScore' },
                    totalEstimatedValue: { $sum: '$estimatedValue' },
                    totalWeightedRevenue: { $sum: '$weightedRevenue' }
                }
            }
        ]);

        const result = stats[0] || {
            totalLeads: 0,
            convertedToClient: 0,
            wonLeads: 0,
            lostLeads: 0,
            avgDaysToAssign: 0,
            avgDaysToClose: 0,
            avgLeadScore: 0,
            totalEstimatedValue: 0,
            totalWeightedRevenue: 0
        };

        // Calculate conversion rates
        result.conversionRate = result.totalLeads > 0
            ? ((result.convertedToClient / result.totalLeads) * 100).toFixed(2)
            : 0;
        result.winRate = result.totalLeads > 0
            ? ((result.wonLeads / result.totalLeads) * 100).toFixed(2)
            : 0;

        return result;
    }
}

// Export singleton instance
module.exports = new LeadWorkflowService();
