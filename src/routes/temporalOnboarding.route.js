/**
 * Temporal Onboarding Routes
 *
 * REST API endpoints for managing employee onboarding workflows via Temporal.
 *
 * Endpoints:
 * - POST   /api/employees/:id/start-onboarding              - Start onboarding workflow
 * - POST   /api/employees/:id/onboarding/complete-documents - Signal document submission
 * - POST   /api/employees/:id/onboarding/complete-training  - Signal training completion
 * - POST   /api/employees/:id/onboarding/complete-review    - Signal review completion
 * - GET    /api/employees/:id/onboarding/status             - Get onboarding status
 * - POST   /api/employees/:id/onboarding/skip-phase         - Skip a phase
 * - DELETE /api/employees/:id/onboarding/cancel             - Cancel onboarding workflow
 */

const express = require('express');
const router = express.Router();
const temporalClient = require('../temporal/client');
const Onboarding = require('../models/onboarding.model');
const Employee = require('../models/employee.model');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/permissions');
const logger = require('../utils/logger');

/**
 * @route   POST /api/employees/:id/start-onboarding
 * @desc    Start employee onboarding Temporal workflow
 * @access  Private (HR only)
 */
router.post('/:id/start-onboarding', protect, restrictTo('admin', 'hr'), async (req, res) => {
  try {
    const employeeId = req.params.id;
    const { onboardingId, role, config } = req.body;

    // Validate employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Validate onboarding record exists
    const onboarding = await Onboarding.findById(onboardingId);
    if (!onboarding) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding record not found'
      });
    }

    // Check if workflow already exists
    if (onboarding.temporalWorkflowId) {
      // Try to get status of existing workflow
      try {
        const status = await temporalClient.describeWorkflow(onboarding.temporalWorkflowId);
        if (status.status.name === 'RUNNING') {
          return res.status(400).json({
            success: false,
            message: 'Onboarding workflow already running',
            workflowId: onboarding.temporalWorkflowId,
            status: status.status.name
          });
        }
      } catch (error) {
        // Workflow doesn't exist or is completed, continue to start new one
        logger.info('Previous workflow not found or completed, starting new one');
      }
    }

    // Start Temporal workflow
    const workflowParams = {
      employeeId,
      onboardingId,
      startDate: onboarding.startDate || new Date(),
      role: role || employee.employment?.jobTitle?.toLowerCase() || 'employee',
      config: {
        probationDays: onboarding.probation?.probationPeriod || 90,
        documentReminderIntervalDays: 3,
        trainingReminderIntervalDays: 7,
        skipPreBoarding: config?.skipPreBoarding || false,
        skipTraining: config?.skipTraining || false,
        ...config
      }
    };

    const handle = await temporalClient.startOnboardingWorkflow(workflowParams);

    // Update onboarding record with workflow ID
    await Onboarding.findByIdAndUpdate(onboardingId, {
      temporalWorkflowId: handle.workflowId,
      temporalRunId: handle.firstExecutionRunId,
      status: 'in_progress',
      'notes.internalNotes': `Temporal workflow started: ${handle.workflowId}`
    });

    logger.info(`Onboarding workflow started for employee ${employeeId}`, {
      workflowId: handle.workflowId,
      runId: handle.firstExecutionRunId
    });

    res.status(200).json({
      success: true,
      message: 'Onboarding workflow started successfully',
      data: {
        workflowId: handle.workflowId,
        runId: handle.firstExecutionRunId,
        employeeId,
        onboardingId
      }
    });
  } catch (error) {
    logger.error('Failed to start onboarding workflow', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Failed to start onboarding workflow',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/employees/:id/onboarding/complete-documents
 * @desc    Signal workflow that documents have been submitted
 * @access  Private (HR only)
 */
router.post('/:id/onboarding/complete-documents', protect, restrictTo('admin', 'hr'), async (req, res) => {
  try {
    const employeeId = req.params.id;
    const { verifiedCount, pendingCount } = req.body;

    // Get onboarding record with workflow ID
    const onboarding = await Onboarding.findOne({ employeeId });
    if (!onboarding || !onboarding.temporalWorkflowId) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding workflow not found'
      });
    }

    // Send signal to workflow
    await temporalClient.signalDocumentsSubmitted(onboarding.temporalWorkflowId, {
      verifiedCount: verifiedCount || 0,
      pendingCount: pendingCount || 0
    });

    // Update onboarding record
    await Onboarding.findByIdAndUpdate(onboarding._id, {
      'preBoarding.documentsCollection.documentationComplete': true,
      'preBoarding.documentsCollection.allDocumentsCollected': pendingCount === 0
    });

    logger.info(`Documents submission signaled for employee ${employeeId}`);

    res.status(200).json({
      success: true,
      message: 'Documents submission signaled successfully',
      data: {
        workflowId: onboarding.temporalWorkflowId,
        verifiedCount,
        pendingCount
      }
    });
  } catch (error) {
    logger.error('Failed to signal documents submission', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Failed to signal documents submission',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/employees/:id/onboarding/complete-training
 * @desc    Signal workflow that training has been completed
 * @access  Private (HR only)
 */
router.post('/:id/onboarding/complete-training', protect, restrictTo('admin', 'hr'), async (req, res) => {
  try {
    const employeeId = req.params.id;
    const { sessionsCompleted } = req.body;

    // Get onboarding record with workflow ID
    const onboarding = await Onboarding.findOne({ employeeId });
    if (!onboarding || !onboarding.temporalWorkflowId) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding workflow not found'
      });
    }

    // Send signal to workflow
    await temporalClient.signalTrainingCompleted(onboarding.temporalWorkflowId, {
      sessionsCompleted: sessionsCompleted || 0
    });

    // Update onboarding record
    await Onboarding.findByIdAndUpdate(onboarding._id, {
      'firstWeek.systemsTraining.allTrainingsCompleted': true
    });

    logger.info(`Training completion signaled for employee ${employeeId}`);

    res.status(200).json({
      success: true,
      message: 'Training completion signaled successfully',
      data: {
        workflowId: onboarding.temporalWorkflowId,
        sessionsCompleted
      }
    });
  } catch (error) {
    logger.error('Failed to signal training completion', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Failed to signal training completion',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/employees/:id/onboarding/complete-review
 * @desc    Signal workflow that a review has been completed
 * @access  Private (HR or Manager)
 */
router.post('/:id/onboarding/complete-review', protect, restrictTo('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const employeeId = req.params.id;
    const { reviewType, outcome } = req.body;

    // Validate review type
    const validReviewTypes = ['30_day', '60_day', '90_day', 'final'];
    if (!validReviewTypes.includes(reviewType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review type',
        validTypes: validReviewTypes
      });
    }

    // Get onboarding record with workflow ID
    const onboarding = await Onboarding.findOne({ employeeId });
    if (!onboarding || !onboarding.temporalWorkflowId) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding workflow not found'
      });
    }

    // Send signal to workflow
    await temporalClient.signalReviewCompleted(onboarding.temporalWorkflowId, {
      reviewType,
      outcome: outcome || 'continue'
    });

    logger.info(`Review completion signaled for employee ${employeeId}`, {
      reviewType,
      outcome
    });

    res.status(200).json({
      success: true,
      message: 'Review completion signaled successfully',
      data: {
        workflowId: onboarding.temporalWorkflowId,
        reviewType,
        outcome
      }
    });
  } catch (error) {
    logger.error('Failed to signal review completion', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Failed to signal review completion',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/employees/:id/onboarding/status
 * @desc    Get onboarding workflow status and progress
 * @access  Private
 */
router.get('/:id/onboarding/status', protect, async (req, res) => {
  try {
    const employeeId = req.params.id;

    // Get onboarding record with workflow ID
    const onboarding = await Onboarding.findOne({ employeeId })
      .populate('employeeId', 'personalInfo employment')
      .populate('managerId', 'firstName lastName email');

    if (!onboarding) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding record not found'
      });
    }

    if (!onboarding.temporalWorkflowId) {
      return res.status(200).json({
        success: true,
        message: 'Onboarding not started in Temporal',
        data: {
          onboardingId: onboarding._id,
          status: onboarding.status,
          completion: onboarding.completion,
          workflowStarted: false
        }
      });
    }

    // Get workflow status
    const workflowStatus = await temporalClient.describeWorkflow(onboarding.temporalWorkflowId);

    // Query workflow progress (if running)
    let progress = null;
    let currentPhase = null;
    let pendingTasks = null;

    if (workflowStatus.status.name === 'RUNNING') {
      try {
        progress = await temporalClient.queryOnboardingProgress(onboarding.temporalWorkflowId);
        currentPhase = await temporalClient.queryCurrentPhase(onboarding.temporalWorkflowId);
        pendingTasks = await temporalClient.queryPendingTasks(onboarding.temporalWorkflowId);
      } catch (error) {
        logger.warn('Failed to query workflow state', { error: error.message });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        onboardingId: onboarding._id,
        employeeId: onboarding.employeeId,
        workflowId: onboarding.temporalWorkflowId,
        workflowStatus: workflowStatus.status.name,
        startTime: workflowStatus.startTime,
        closeTime: workflowStatus.closeTime,
        currentPhase,
        progress,
        pendingTasks,
        onboardingRecord: {
          status: onboarding.status,
          completion: onboarding.completion,
          probation: onboarding.probation,
          startDate: onboarding.startDate
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get onboarding status', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get onboarding status',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/employees/:id/onboarding/skip-phase
 * @desc    Skip a phase in the onboarding workflow
 * @access  Private (HR only)
 */
router.post('/:id/onboarding/skip-phase', protect, restrictTo('admin', 'hr'), async (req, res) => {
  try {
    const employeeId = req.params.id;
    const { phase } = req.body;

    // Validate phase
    const validPhases = ['pre_boarding', 'documentation', 'training', 'probation'];
    if (!validPhases.includes(phase)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phase',
        validPhases
      });
    }

    // Get onboarding record with workflow ID
    const onboarding = await Onboarding.findOne({ employeeId });
    if (!onboarding || !onboarding.temporalWorkflowId) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding workflow not found'
      });
    }

    // Send signal to workflow
    await temporalClient.signalSkipPhase(onboarding.temporalWorkflowId, phase);

    logger.info(`Phase skip signaled for employee ${employeeId}`, { phase });

    res.status(200).json({
      success: true,
      message: `Phase "${phase}" will be skipped`,
      data: {
        workflowId: onboarding.temporalWorkflowId,
        phase
      }
    });
  } catch (error) {
    logger.error('Failed to signal phase skip', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Failed to signal phase skip',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/employees/:id/onboarding/cancel
 * @desc    Cancel onboarding workflow
 * @access  Private (HR only)
 */
router.delete('/:id/onboarding/cancel', protect, restrictTo('admin', 'hr'), async (req, res) => {
  try {
    const employeeId = req.params.id;

    // Get onboarding record with workflow ID
    const onboarding = await Onboarding.findOne({ employeeId });
    if (!onboarding || !onboarding.temporalWorkflowId) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding workflow not found'
      });
    }

    // Cancel workflow
    await temporalClient.cancelWorkflow(onboarding.temporalWorkflowId);

    // Update onboarding record
    await Onboarding.findByIdAndUpdate(onboarding._id, {
      status: 'cancelled',
      'notes.internalNotes': `Workflow cancelled by ${req.user.firstName} ${req.user.lastName} at ${new Date().toISOString()}`
    });

    logger.info(`Onboarding workflow cancelled for employee ${employeeId}`, {
      workflowId: onboarding.temporalWorkflowId,
      cancelledBy: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Onboarding workflow cancelled successfully',
      data: {
        workflowId: onboarding.temporalWorkflowId,
        employeeId
      }
    });
  } catch (error) {
    logger.error('Failed to cancel onboarding workflow', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Failed to cancel onboarding workflow',
      error: error.message
    });
  }
});

module.exports = router;
