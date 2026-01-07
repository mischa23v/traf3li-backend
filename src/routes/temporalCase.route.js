const express = require('express');
const { userMiddleware } = require('../middlewares');
const temporalClient = require('../temporal/client');
const Case = require('../models/case.model');
const CaseStageProgress = require('../models/caseStageProgress.model');
const WorkflowTemplate = require('../models/workflowTemplate.model');
const logger = require('../utils/logger');
const asyncHandler = require('express-async-handler');
const {
  completeRequirementSignal,
  transitionStageSignal,
  addDeadlineSignal,
  pauseWorkflowSignal,
  resumeWorkflowSignal,
  addCourtDateSignal,
  getWorkflowStateQuery,
  getCurrentStageQuery,
  getRequirementsQuery,
} = require('../temporal/workflows/caseLifecycle.workflow');

const router = express.Router();

router.post(
  '/:id/start-workflow',
  userMiddleware,
  asyncHandler(async (req, res) => {
    const { id: caseId } = req.params;
    const { workflowTemplateId } = req.body;

    // Validate case exists
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'Case not found',
      });
    }

    // Validate workflow template exists
    const template = await WorkflowTemplate.findById(workflowTemplateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Workflow template not found',
      });
    }

    // Check if workflow already exists
    const existingProgress = await CaseStageProgress.findOne({ caseId });
    if (existingProgress) {
      return res.status(400).json({
        success: false,
        message: 'Workflow already initialized for this case',
      });
    }

    // Initialize stage progress
    const initialStage = template.stages.find(s => s.isInitial) || template.stages[0];
    if (!initialStage) {
      return res.status(400).json({
        success: false,
        message: 'No initial stage found in workflow template',
      });
    }

    await CaseStageProgress.initializeForCase(
      caseId,
      workflowTemplateId,
      initialStage._id,
      initialStage.name
    );

    // Start Temporal workflow
    const workflowId = `case-lifecycle-${caseId}`;
    const handle = await temporalClient.startCaseLifecycleWorkflow(
      {
        caseId: caseId.toString(),
        caseType: caseDoc.category,
        workflowTemplateId: workflowTemplateId.toString(),
      },
      {
        workflowId,
        // Workflow can run for up to 1 year (legal cases are long-running)
        workflowExecutionTimeout: '365 days',
        // Store workflow ID in case for reference
      }
    );

    // Update case with workflow ID
    await Case.findByIdAndUpdate(caseId, {
      $set: {
        'metadata.workflowId': workflowId,
      },
    });

    logger.info(`Case lifecycle workflow started for case ${caseId}`, {
      workflowId,
      runId: handle.firstExecutionRunId,
    });

    res.json({
      success: true,
      message: 'Case lifecycle workflow started successfully',
      workflowId,
      runId: handle.firstExecutionRunId,
    });
  })
);

router.post(
  '/:id/workflow/complete-requirement',
  userMiddleware,
  asyncHandler(async (req, res) => {
    const { id: caseId } = req.params;
    const { requirementId, metadata = {} } = req.body;

    // Get workflow ID
    const workflowId = `case-lifecycle-${caseId}`;

    // Send signal to workflow
    await temporalClient.signalWorkflow(
      workflowId,
      completeRequirementSignal,
      {
        requirementId: requirementId.toString(),
        name: metadata.name || 'Requirement',
        completedBy: req.user._id.toString(),
        metadata,
      }
    );

    // Also update in database
    await CaseStageProgress.completeRequirement(
      caseId,
      metadata.stageId,
      requirementId,
      req.user._id,
      metadata
    );

    logger.info(`Requirement completed for case ${caseId}`, {
      requirementId,
      userId: req.user._id,
    });

    res.json({
      success: true,
      message: 'Requirement completed successfully',
    });
  })
);

router.post(
  '/:id/workflow/transition-stage',
  userMiddleware,
  asyncHandler(async (req, res) => {
    const { id: caseId } = req.params;
    const { stageId, notes } = req.body;

    // Get workflow ID
    const workflowId = `case-lifecycle-${caseId}`;

    // Send signal to workflow
    await temporalClient.signalWorkflow(
      workflowId,
      transitionStageSignal,
      {
        stageId: stageId.toString(),
        notes: notes || '',
        requestedBy: req.user._id.toString(),
      }
    );

    logger.info(`Stage transition requested for case ${caseId}`, {
      stageId,
      userId: req.user._id,
    });

    res.json({
      success: true,
      message: 'Stage transition initiated',
    });
  })
);

router.get(
  '/:id/workflow/status',
  userMiddleware,
  asyncHandler(async (req, res) => {
    const { id: caseId } = req.params;

    // Get workflow ID
    const workflowId = `case-lifecycle-${caseId}`;

    try {
      // Get workflow description
      const description = await temporalClient.describeWorkflow(workflowId);

      // Query workflow state
      const workflowState = await temporalClient.queryWorkflow(
        workflowId,
        getWorkflowStateQuery
      );

      // Get current stage
      const currentStage = await temporalClient.queryWorkflow(
        workflowId,
        getCurrentStageQuery
      );

      // Get requirements
      const requirements = await temporalClient.queryWorkflow(
        workflowId,
        getRequirementsQuery
      );

      // Get database progress
      const progress = await CaseStageProgress.findOne({ caseId });

      res.json({
        success: true,
        status: {
          workflowId,
          status: description.status.name,
          startTime: description.startTime,
          executionTime: description.executionTime,
          historyLength: description.historyLength,
        },
        workflowState,
        currentStage,
        requirements,
        databaseProgress: progress,
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: 'Workflow not found. Has it been started?',
        });
      }
      throw error;
    }
  })
);

router.post(
  '/:id/workflow/add-deadline',
  userMiddleware,
  asyncHandler(async (req, res) => {
    const { id: caseId } = req.params;
    const { title, date, description } = req.body;

    // Get workflow ID
    const workflowId = `case-lifecycle-${caseId}`;

    // Send signal to workflow
    await temporalClient.signalWorkflow(
      workflowId,
      addDeadlineSignal,
      {
        title,
        date: new Date(date).toISOString(),
        description: description || '',
        addedBy: req.user._id.toString(),
      }
    );

    logger.info(`Deadline added for case ${caseId}`, {
      title,
      date,
      userId: req.user._id,
    });

    res.json({
      success: true,
      message: 'Deadline added successfully',
    });
  })
);

router.post(
  '/:id/workflow/add-court-date',
  userMiddleware,
  asyncHandler(async (req, res) => {
    const { id: caseId } = req.params;
    const { title, date, location, notes } = req.body;

    // Get workflow ID
    const workflowId = `case-lifecycle-${caseId}`;

    // Send signal to workflow
    await temporalClient.signalWorkflow(
      workflowId,
      addCourtDateSignal,
      {
        title: title || 'Hearing',
        date: new Date(date).toISOString(),
        location: location || '',
        notes: notes || '',
        addedBy: req.user._id.toString(),
      }
    );

    logger.info(`Court date added for case ${caseId}`, {
      title,
      date,
      location,
      userId: req.user._id,
    });

    res.json({
      success: true,
      message: 'Court date added successfully',
    });
  })
);

router.post(
  '/:id/workflow/pause',
  userMiddleware,
  asyncHandler(async (req, res) => {
    const { id: caseId } = req.params;

    // Get workflow ID
    const workflowId = `case-lifecycle-${caseId}`;

    // Send signal to workflow
    await temporalClient.signalWorkflow(workflowId, pauseWorkflowSignal);

    // Update database
    await CaseStageProgress.findOneAndUpdate(
      { caseId },
      { status: 'paused' }
    );

    logger.info(`Workflow paused for case ${caseId}`, {
      userId: req.user._id,
    });

    res.json({
      success: true,
      message: 'Workflow paused successfully',
    });
  })
);

router.post(
  '/:id/workflow/resume',
  userMiddleware,
  asyncHandler(async (req, res) => {
    const { id: caseId } = req.params;

    // Get workflow ID
    const workflowId = `case-lifecycle-${caseId}`;

    // Send signal to workflow
    await temporalClient.signalWorkflow(workflowId, resumeWorkflowSignal);

    // Update database
    await CaseStageProgress.findOneAndUpdate(
      { caseId },
      { status: 'active' }
    );

    logger.info(`Workflow resumed for case ${caseId}`, {
      userId: req.user._id,
    });

    res.json({
      success: true,
      message: 'Workflow resumed successfully',
    });
  })
);

router.post(
  '/:id/workflow/cancel',
  userMiddleware,
  asyncHandler(async (req, res) => {
    const { id: caseId } = req.params;

    // Get workflow ID
    const workflowId = `case-lifecycle-${caseId}`;

    // Cancel workflow
    await temporalClient.cancelWorkflow(workflowId);

    // Update database
    await CaseStageProgress.findOneAndUpdate(
      { caseId },
      { status: 'cancelled' }
    );

    logger.info(`Workflow cancelled for case ${caseId}`, {
      userId: req.user._id,
    });

    res.json({
      success: true,
      message: 'Workflow cancelled successfully',
    });
  })
);

module.exports = router;
