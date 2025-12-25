/**
 * Playbook Service - Incident Response Playbook Management
 *
 * This service provides a high-level API for managing incident response playbooks
 * and their executions. Implements automated incident handling with step-by-step
 * workflows, escalation paths, and execution tracking.
 *
 * Features:
 * - Playbook creation and management
 * - Automatic playbook matching based on incident criteria
 * - Step-by-step execution tracking
 * - Retry logic for failed steps
 * - Escalation support
 * - Execution history and analytics
 */

const mongoose = require('mongoose');
const Playbook = require('../models/playbook.model');
const IncidentExecution = require('../models/incidentExecution.model');
const Incident = require('../models/incident.model');
const logger = require('../utils/logger');

class PlaybookService {
  /**
   * Create a new playbook
   * @param {Object} data - Playbook data
   * @param {String} userId - User creating the playbook
   * @returns {Promise<Object|null>} - Created playbook or null
   */
  async createPlaybook(data, userId) {
    try {
      // Validate required fields
      if (!data.name || !data.category || !data.severity || !data.steps) {
        logger.error('PlaybookService.createPlaybook: Missing required fields');
        return null;
      }

      if (!Array.isArray(data.steps) || data.steps.length === 0) {
        logger.error('PlaybookService.createPlaybook: Steps must be a non-empty array');
        return null;
      }

      // Create playbook
      const playbook = await Playbook.create({
        ...data,
        createdBy: userId,
        updatedBy: userId,
        version: 1
      });

      logger.info('PlaybookService.createPlaybook: Playbook created', {
        playbookId: playbook._id,
        name: playbook.name,
        category: playbook.category,
        severity: playbook.severity
      });

      return playbook;
    } catch (error) {
      logger.error('PlaybookService.createPlaybook failed:', error.message);
      return null;
    }
  }

  /**
   * Update a playbook
   * @param {String} playbookId - Playbook ID
   * @param {Object} data - Updated data
   * @param {String} userId - User updating
   * @returns {Promise<Object|null>} - Updated playbook or null
   */
  async updatePlaybook(playbookId, data, userId) {
    try {
      const playbook = await Playbook.findById(playbookId);

      if (!playbook) {
        logger.error('PlaybookService.updatePlaybook: Playbook not found');
        return null;
      }

      // Update allowed fields
      const allowedFields = [
        'name', 'description', 'category', 'severity',
        'triggerConditions', 'steps', 'escalationPath', 'isActive'
      ];

      allowedFields.forEach(field => {
        if (data[field] !== undefined) {
          playbook[field] = data[field];
        }
      });

      playbook.updatedBy = userId;
      await playbook.save();

      logger.info('PlaybookService.updatePlaybook: Playbook updated', {
        playbookId: playbook._id,
        name: playbook.name
      });

      return playbook;
    } catch (error) {
      logger.error('PlaybookService.updatePlaybook failed:', error.message);
      return null;
    }
  }

  /**
   * Delete a playbook
   * @param {String} playbookId - Playbook ID
   * @returns {Promise<Boolean>} - Success status
   */
  async deletePlaybook(playbookId) {
    try {
      // Check for active executions
      const activeExecutions = await IncidentExecution.countDocuments({
        playbookId,
        status: 'running'
      });

      if (activeExecutions > 0) {
        logger.error('PlaybookService.deletePlaybook: Cannot delete playbook with active executions');
        return false;
      }

      await Playbook.findByIdAndDelete(playbookId);

      logger.info('PlaybookService.deletePlaybook: Playbook deleted', { playbookId });

      return true;
    } catch (error) {
      logger.error('PlaybookService.deletePlaybook failed:', error.message);
      return false;
    }
  }

  /**
   * Get playbooks with filters
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} - Playbooks
   */
  async getPlaybooks(filters = {}) {
    try {
      const query = {};

      if (filters.firmId) {
        query.firmId = filters.firmId;
      }

      if (filters.category) {
        query.category = filters.category;
      }

      if (filters.severity) {
        query.severity = filters.severity;
      }

      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      const playbooks = await Playbook.find(query)
        .sort({ category: 1, severity: -1, createdAt: -1 })
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName')
        .populate('escalationPath', 'firstName lastName email')
        .lean();

      return playbooks;
    } catch (error) {
      logger.error('PlaybookService.getPlaybooks failed:', error.message);
      return [];
    }
  }

  /**
   * Start playbook execution for an incident
   * @param {String} incidentId - Incident ID
   * @param {String} playbookId - Playbook ID
   * @param {String} userId - User starting execution
   * @returns {Promise<Object|null>} - Execution instance or null
   */
  async startExecution(incidentId, playbookId, userId) {
    try {
      // Fetch incident and playbook
      const [incident, playbook] = await Promise.all([
        Incident.findById(incidentId).lean(),
        Playbook.findById(playbookId).lean()
      ]);

      if (!incident) {
        logger.error('PlaybookService.startExecution: Incident not found');
        return null;
      }

      if (!playbook) {
        logger.error('PlaybookService.startExecution: Playbook not found');
        return null;
      }

      if (!playbook.isActive) {
        logger.error('PlaybookService.startExecution: Playbook is not active');
        return null;
      }

      // Create execution instance
      const execution = await IncidentExecution.create({
        firmId: incident.firmId,
        incidentId,
        playbookId,
        executedBy: userId,
        status: 'running',
        currentStep: 1,
        totalSteps: playbook.steps.length,
        startedAt: new Date()
      });

      // Initialize step results
      playbook.steps.forEach(step => {
        execution.stepResults.push({
          stepOrder: step.order,
          stepTitle: step.title,
          status: 'pending'
        });
      });

      await execution.save();

      logger.info('PlaybookService.startExecution: Execution started', {
        executionId: execution._id,
        incidentId,
        playbookId
      });

      return await IncidentExecution.findById(execution._id)
        .populate('playbookId', 'name category severity steps')
        .populate('executedBy', 'firstName lastName')
        .lean();
    } catch (error) {
      logger.error('PlaybookService.startExecution failed:', error.message);
      return null;
    }
  }

  /**
   * Advance to next step
   * @param {String} executionId - Execution ID
   * @param {Object} result - Current step result
   * @returns {Promise<Object|null>} - Updated execution or null
   */
  async advanceStep(executionId, result = {}) {
    try {
      const execution = await IncidentExecution.findById(executionId)
        .populate('playbookId');

      if (!execution) {
        logger.error('PlaybookService.advanceStep: Execution not found');
        return null;
      }

      if (execution.status !== 'running') {
        logger.error('PlaybookService.advanceStep: Execution is not running');
        return null;
      }

      const playbook = execution.playbookId;
      const currentStep = playbook.steps.find(s => s.order === execution.currentStep);

      if (!currentStep) {
        logger.error('PlaybookService.advanceStep: Current step not found');
        return null;
      }

      // Complete current step
      await execution.completeStep(
        execution.currentStep,
        result.success !== false,
        result.data || {},
        result.error || null
      );

      // Check if this was the last step
      if (execution.currentStep >= execution.totalSteps) {
        // Complete execution
        await execution.complete(result.userId || execution.executedBy, result.notes || '');

        logger.info('PlaybookService.advanceStep: Execution completed', {
          executionId: execution._id
        });

        return await IncidentExecution.findById(executionId)
          .populate('playbookId', 'name category severity')
          .populate('executedBy', 'firstName lastName')
          .populate('completedBy', 'firstName lastName')
          .lean();
      }

      // Determine next step
      let nextStepOrder = execution.currentStep + 1;

      if (currentStep.onSuccess && currentStep.onSuccess.nextStep) {
        nextStepOrder = currentStep.onSuccess.nextStep;
      }

      // Start next step
      const nextStep = playbook.steps.find(s => s.order === nextStepOrder);

      if (nextStep) {
        await execution.startStep(
          nextStep.order,
          nextStep.title,
          result.userId || execution.executedBy
        );

        logger.info('PlaybookService.advanceStep: Advanced to next step', {
          executionId: execution._id,
          currentStep: nextStep.order,
          stepTitle: nextStep.title
        });
      }

      return await IncidentExecution.findById(executionId)
        .populate('playbookId', 'name category severity steps')
        .populate('executedBy', 'firstName lastName')
        .lean();
    } catch (error) {
      logger.error('PlaybookService.advanceStep failed:', error.message);
      return null;
    }
  }

  /**
   * Skip a step
   * @param {String} executionId - Execution ID
   * @param {String} reason - Skip reason
   * @returns {Promise<Object|null>} - Updated execution or null
   */
  async skipStep(executionId, reason) {
    try {
      const execution = await IncidentExecution.findById(executionId)
        .populate('playbookId');

      if (!execution) {
        logger.error('PlaybookService.skipStep: Execution not found');
        return null;
      }

      if (execution.status !== 'running') {
        logger.error('PlaybookService.skipStep: Execution is not running');
        return null;
      }

      await execution.skipStep(execution.currentStep, reason);

      // Advance to next step
      return await this.advanceStep(executionId, {
        success: true,
        notes: `Step ${execution.currentStep} skipped: ${reason}`
      });
    } catch (error) {
      logger.error('PlaybookService.skipStep failed:', error.message);
      return null;
    }
  }

  /**
   * Abort execution
   * @param {String} executionId - Execution ID
   * @param {String} userId - User aborting
   * @param {String} reason - Abort reason
   * @returns {Promise<Object|null>} - Updated execution or null
   */
  async abortExecution(executionId, userId, reason) {
    try {
      const execution = await IncidentExecution.findById(executionId);

      if (!execution) {
        logger.error('PlaybookService.abortExecution: Execution not found');
        return null;
      }

      if (execution.status !== 'running') {
        logger.error('PlaybookService.abortExecution: Execution is not running');
        return null;
      }

      await execution.abort(userId, reason);

      logger.info('PlaybookService.abortExecution: Execution aborted', {
        executionId: execution._id,
        reason
      });

      return await IncidentExecution.findById(executionId)
        .populate('playbookId', 'name category severity')
        .populate('executedBy', 'firstName lastName')
        .populate('abortedBy', 'firstName lastName')
        .lean();
    } catch (error) {
      logger.error('PlaybookService.abortExecution failed:', error.message);
      return null;
    }
  }

  /**
   * Retry a failed step
   * @param {String} executionId - Execution ID
   * @param {Number} stepIndex - Step index to retry
   * @returns {Promise<Object|null>} - Updated execution or null
   */
  async retryStep(executionId, stepIndex) {
    try {
      const execution = await IncidentExecution.findById(executionId)
        .populate('playbookId');

      if (!execution) {
        logger.error('PlaybookService.retryStep: Execution not found');
        return null;
      }

      const stepResult = execution.stepResults.find(r => r.stepOrder === stepIndex);

      if (!stepResult) {
        logger.error('PlaybookService.retryStep: Step result not found');
        return null;
      }

      if (stepResult.status !== 'failed') {
        logger.error('PlaybookService.retryStep: Can only retry failed steps');
        return null;
      }

      const playbook = execution.playbookId;
      const step = playbook.steps.find(s => s.order === stepIndex);

      if (!step) {
        logger.error('PlaybookService.retryStep: Step not found in playbook');
        return null;
      }

      // Check retry limit
      if (stepResult.retryCount >= (step.onFailure?.maxRetries || 3)) {
        logger.error('PlaybookService.retryStep: Max retries exceeded');
        return null;
      }

      // Increment retry count
      stepResult.retryCount += 1;
      stepResult.status = 'running';
      stepResult.startedAt = new Date();
      stepResult.completedAt = null;
      stepResult.error = null;

      await execution.save();

      logger.info('PlaybookService.retryStep: Step retry initiated', {
        executionId: execution._id,
        stepIndex,
        retryCount: stepResult.retryCount
      });

      return await IncidentExecution.findById(executionId)
        .populate('playbookId', 'name category severity steps')
        .populate('executedBy', 'firstName lastName')
        .lean();
    } catch (error) {
      logger.error('PlaybookService.retryStep failed:', error.message);
      return null;
    }
  }

  /**
   * Get execution status
   * @param {String} executionId - Execution ID
   * @returns {Promise<Object|null>} - Execution status or null
   */
  async getExecutionStatus(executionId) {
    try {
      const execution = await IncidentExecution.findById(executionId)
        .populate('playbookId', 'name category severity steps')
        .populate('incidentId', 'title status impact')
        .populate('executedBy', 'firstName lastName')
        .populate('completedBy', 'firstName lastName')
        .populate('abortedBy', 'firstName lastName')
        .populate('escalatedTo', 'firstName lastName email')
        .lean();

      if (!execution) {
        logger.error('PlaybookService.getExecutionStatus: Execution not found');
        return null;
      }

      return execution;
    } catch (error) {
      logger.error('PlaybookService.getExecutionStatus failed:', error.message);
      return null;
    }
  }

  /**
   * Get execution history for incident
   * @param {String} incidentId - Incident ID
   * @returns {Promise<Array>} - Execution history
   */
  async getExecutionHistory(incidentId) {
    try {
      const executions = await IncidentExecution.find({ incidentId })
        .sort({ startedAt: -1 })
        .populate('playbookId', 'name category severity')
        .populate('executedBy', 'firstName lastName')
        .populate('completedBy', 'firstName lastName')
        .populate('escalatedTo', 'firstName lastName email')
        .lean();

      return executions;
    } catch (error) {
      logger.error('PlaybookService.getExecutionHistory failed:', error.message);
      return [];
    }
  }

  /**
   * Find matching playbook for incident
   * @param {String} incidentType - Incident type/category
   * @param {String} severity - Incident severity
   * @param {String} firmId - Firm ID (optional)
   * @returns {Promise<Object|null>} - Matching playbook or null
   */
  async matchPlaybook(incidentType, severity, firmId = null) {
    try {
      const playbooks = await Playbook.findMatching(incidentType, severity, firmId);

      if (!playbooks || playbooks.length === 0) {
        logger.info('PlaybookService.matchPlaybook: No matching playbook found', {
          incidentType,
          severity
        });
        return null;
      }

      // Return the first (most recent version) matching playbook
      const matchedPlaybook = playbooks[0];

      logger.info('PlaybookService.matchPlaybook: Playbook matched', {
        playbookId: matchedPlaybook._id,
        name: matchedPlaybook.name,
        incidentType,
        severity
      });

      return matchedPlaybook;
    } catch (error) {
      logger.error('PlaybookService.matchPlaybook failed:', error.message);
      return null;
    }
  }

  /**
   * Escalate execution
   * @param {String} executionId - Execution ID
   * @param {String} userId - User to escalate to
   * @param {String} reason - Escalation reason
   * @returns {Promise<Object|null>} - Updated execution or null
   */
  async escalateExecution(executionId, userId, reason) {
    try {
      const execution = await IncidentExecution.findById(executionId);

      if (!execution) {
        logger.error('PlaybookService.escalateExecution: Execution not found');
        return null;
      }

      await execution.escalate(userId, reason);

      logger.info('PlaybookService.escalateExecution: Execution escalated', {
        executionId: execution._id,
        escalatedTo: userId,
        reason
      });

      return await IncidentExecution.findById(executionId)
        .populate('playbookId', 'name category severity')
        .populate('executedBy', 'firstName lastName')
        .populate('escalatedTo', 'firstName lastName email')
        .lean();
    } catch (error) {
      logger.error('PlaybookService.escalateExecution failed:', error.message);
      return null;
    }
  }

  /**
   * Get playbook statistics
   * @param {String} firmId - Firm ID (optional)
   * @returns {Promise<Object>} - Statistics
   */
  async getPlaybookStats(firmId = null) {
    try {
      return await Playbook.getStats(firmId);
    } catch (error) {
      logger.error('PlaybookService.getPlaybookStats failed:', error.message);
      return {
        total: 0,
        active: 0,
        byCategory: [],
        bySeverity: []
      };
    }
  }

  /**
   * Get execution statistics
   * @param {String} firmId - Firm ID (optional)
   * @param {Object} dateRange - Date range filter
   * @returns {Promise<Object>} - Statistics
   */
  async getExecutionStats(firmId = null, dateRange = {}) {
    try {
      return await IncidentExecution.getStats(firmId, dateRange);
    } catch (error) {
      logger.error('PlaybookService.getExecutionStats failed:', error.message);
      return {
        total: 0,
        byStatus: [],
        avgDurationMs: null,
        successRate: 0
      };
    }
  }
}

// Export singleton instance
module.exports = new PlaybookService();
