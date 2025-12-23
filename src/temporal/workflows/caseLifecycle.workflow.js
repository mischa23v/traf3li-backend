const { proxyActivities, sleep, setHandler, condition, defineSignal, defineQuery } = require('@temporalio/workflow');

// Define signals for workflow control
const completeRequirementSignal = defineSignal('completeRequirement');
const transitionStageSignal = defineSignal('transitionStage');
const addDeadlineSignal = defineSignal('addDeadline');
const pauseWorkflowSignal = defineSignal('pauseWorkflow');
const resumeWorkflowSignal = defineSignal('resumeWorkflow');
const addCourtDateSignal = defineSignal('addCourtDate');

// Define queries for workflow state
const getWorkflowStateQuery = defineQuery('getWorkflowState');
const getCurrentStageQuery = defineQuery('getCurrentStage');
const getRequirementsQuery = defineQuery('getRequirements');

/**
 * Case Lifecycle Temporal Workflow
 *
 * Manages the complete lifecycle of legal cases with:
 * - Stage-based progression through case templates
 * - Document requirement tracking
 * - Deadline monitoring with automated reminders
 * - Court date handling
 * - Milestone notifications
 * - Workflow pause/resume capabilities
 *
 * This workflow can run for months (legal cases are long-running)
 */
async function caseLifecycleWorkflow({ caseId, caseType, workflowTemplateId }) {
  // Proxy activities with appropriate timeouts for long-running operations
  const activities = proxyActivities({
    startToCloseTimeout: '5 minutes',
    retry: {
      initialInterval: '1 second',
      maximumInterval: '30 seconds',
      maximumAttempts: 3,
    },
  });

  // Workflow state
  let workflowState = {
    caseId,
    caseType,
    workflowTemplateId,
    currentStage: null,
    currentStageId: null,
    stages: [],
    completedRequirements: [],
    deadlines: [],
    courtDates: [],
    isPaused: false,
    pausedAt: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
    notifications: [],
  };

  let stageTransitionRequested = false;
  let nextStageInfo = null;
  let requirementCompleted = false;
  let completedRequirementInfo = null;
  let newDeadline = null;
  let newCourtDate = null;

  // Signal handlers
  setHandler(completeRequirementSignal, (requirement) => {
    requirementCompleted = true;
    completedRequirementInfo = requirement;
  });

  setHandler(transitionStageSignal, (stageInfo) => {
    stageTransitionRequested = true;
    nextStageInfo = stageInfo;
  });

  setHandler(addDeadlineSignal, (deadline) => {
    newDeadline = deadline;
  });

  setHandler(pauseWorkflowSignal, () => {
    workflowState.isPaused = true;
    workflowState.pausedAt = new Date().toISOString();
  });

  setHandler(resumeWorkflowSignal, () => {
    workflowState.isPaused = false;
    workflowState.pausedAt = null;
  });

  setHandler(addCourtDateSignal, (courtDate) => {
    newCourtDate = courtDate;
  });

  // Query handlers
  setHandler(getWorkflowStateQuery, () => workflowState);
  setHandler(getCurrentStageQuery, () => ({
    stage: workflowState.currentStage,
    stageId: workflowState.currentStageId,
    enteredAt: workflowState.currentStageEnteredAt,
  }));
  setHandler(getRequirementsQuery, () => ({
    completed: workflowState.completedRequirements,
    pending: getCurrentPendingRequirements(workflowState),
  }));

  try {
    // 1. Load workflow template
    const template = await activities.getWorkflowTemplate(workflowTemplateId);
    workflowState.stages = template.stages;

    // 2. Find initial stage
    const initialStage = template.stages.find(s => s.isInitial) || template.stages[0];
    if (!initialStage) {
      throw new Error('No initial stage found in workflow template');
    }

    // 3. Enter initial stage
    await enterStage(initialStage, activities, workflowState);

    // 4. Main workflow loop - runs until case reaches final stage
    while (!isFinalStage(workflowState.currentStage)) {
      // Check if workflow is paused
      if (workflowState.isPaused) {
        await activities.logCaseActivity(caseId, 'workflow_paused', {
          pausedAt: workflowState.pausedAt,
        });

        // Wait until workflow is resumed
        await condition(() => !workflowState.isPaused);

        await activities.logCaseActivity(caseId, 'workflow_resumed', {
          resumedAt: new Date().toISOString(),
        });
      }

      // Handle new deadlines
      if (newDeadline) {
        workflowState.deadlines.push({
          ...newDeadline,
          addedAt: new Date().toISOString(),
        });
        newDeadline = null;
        await activities.logCaseActivity(caseId, 'deadline_added', {
          deadline: workflowState.deadlines[workflowState.deadlines.length - 1],
        });
      }

      // Handle new court dates
      if (newCourtDate) {
        workflowState.courtDates.push({
          ...newCourtDate,
          addedAt: new Date().toISOString(),
        });

        // Create reminders for court date
        await activities.createCourtDateReminder(caseId, newCourtDate);

        await activities.logCaseActivity(caseId, 'court_date_added', {
          courtDate: newCourtDate,
        });

        newCourtDate = null;
      }

      // Handle requirement completion
      if (requirementCompleted && completedRequirementInfo) {
        workflowState.completedRequirements.push({
          ...completedRequirementInfo,
          completedAt: new Date().toISOString(),
          stageId: workflowState.currentStageId,
        });

        await activities.logCaseActivity(caseId, 'requirement_completed', {
          requirement: completedRequirementInfo,
          stage: workflowState.currentStage,
        });

        requirementCompleted = false;
        completedRequirementInfo = null;

        // Check if all requirements for current stage are met
        const allRequirementsMet = await activities.checkStageRequirements(
          caseId,
          workflowState.currentStageId,
          workflowState.completedRequirements
        );

        // Auto-transition if stage has auto-transition enabled and all requirements are met
        if (allRequirementsMet && workflowState.currentStage.autoTransition) {
          const nextStage = getNextStage(workflowState);
          if (nextStage) {
            stageTransitionRequested = true;
            nextStageInfo = {
              stageId: nextStage._id.toString(),
              notes: 'Auto-transitioned after completing all requirements',
            };
          }
        }
      }

      // Handle stage transition
      if (stageTransitionRequested && nextStageInfo) {
        const nextStage = workflowState.stages.find(
          s => s._id.toString() === nextStageInfo.stageId
        );

        if (nextStage) {
          // Exit current stage
          await exitStage(workflowState.currentStage, activities, workflowState);

          // Enter new stage
          await enterStage(nextStage, activities, workflowState, nextStageInfo.notes);
        }

        stageTransitionRequested = false;
        nextStageInfo = null;
      }

      // Check and send deadline reminders
      await checkDeadlineReminders(activities, workflowState);

      // Check and send court date reminders
      await checkCourtDateReminders(activities, workflowState);

      // Sleep for 1 hour before next check (configurable based on needs)
      await sleep('1 hour');
    }

    // Workflow complete - reached final stage
    workflowState.completedAt = new Date().toISOString();
    await activities.updateCaseStatus(caseId, 'completed');
    await activities.logCaseActivity(caseId, 'workflow_completed', {
      completedAt: workflowState.completedAt,
      finalStage: workflowState.currentStage,
    });

    return {
      success: true,
      workflowState,
    };

  } catch (error) {
    await activities.logCaseActivity(caseId, 'workflow_error', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Enter a new stage
 */
async function enterStage(stage, activities, workflowState, notes) {
  const { caseId } = workflowState;

  // Update workflow state
  workflowState.currentStage = stage;
  workflowState.currentStageId = stage._id.toString();
  workflowState.currentStageEnteredAt = new Date().toISOString();

  // Call activity to update database
  await activities.enterStage(caseId, stage._id.toString(), stage.name);

  // Send notification if configured
  if (stage.notifyOnEntry) {
    await activities.notifyStageTransition(caseId, stage.name, 'entered', notes);
  }

  // Notify assigned team
  await activities.notifyAssignedTeam(caseId, stage.name, 'Stage entered');

  // Log activity
  await activities.logCaseActivity(caseId, 'stage_entered', {
    stage: stage.name,
    stageId: stage._id.toString(),
    notes,
    requirements: stage.requirements,
  });
}

/**
 * Exit current stage
 */
async function exitStage(stage, activities, workflowState) {
  const { caseId } = workflowState;

  // Call activity to update database
  await activities.exitStage(caseId, stage._id.toString());

  // Send notification if configured
  if (stage.notifyOnExit) {
    await activities.notifyStageTransition(caseId, stage.name, 'exited');
  }

  // Log activity
  await activities.logCaseActivity(caseId, 'stage_exited', {
    stage: stage.name,
    stageId: stage._id.toString(),
    duration: getDurationInStage(workflowState),
  });
}

/**
 * Check if current stage is a final stage
 */
function isFinalStage(stage) {
  return stage && stage.isFinal === true;
}

/**
 * Get next stage in workflow
 */
function getNextStage(workflowState) {
  const currentOrder = workflowState.currentStage.order;
  return workflowState.stages.find(s => s.order === currentOrder + 1);
}

/**
 * Get pending requirements for current stage
 */
function getCurrentPendingRequirements(workflowState) {
  if (!workflowState.currentStage) return [];

  const stageRequirements = workflowState.currentStage.requirements || [];
  const completedIds = workflowState.completedRequirements
    .filter(cr => cr.stageId === workflowState.currentStageId)
    .map(cr => cr.requirementId);

  return stageRequirements.filter(req => !completedIds.includes(req._id.toString()));
}

/**
 * Get duration in current stage (in hours)
 */
function getDurationInStage(workflowState) {
  if (!workflowState.currentStageEnteredAt) return 0;

  const enteredAt = new Date(workflowState.currentStageEnteredAt);
  const now = new Date();
  const durationMs = now - enteredAt;
  return Math.round(durationMs / (1000 * 60 * 60)); // hours
}

/**
 * Check and send deadline reminders
 */
async function checkDeadlineReminders(activities, workflowState) {
  const now = new Date();

  for (const deadline of workflowState.deadlines) {
    if (deadline.reminded) continue;

    const deadlineDate = new Date(deadline.date);
    const daysUntilDeadline = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

    // Send reminder 7 days, 3 days, and 1 day before deadline
    if (daysUntilDeadline <= 7 && daysUntilDeadline > 0) {
      await activities.sendDeadlineReminder(
        workflowState.caseId,
        deadline,
        daysUntilDeadline
      );
      deadline.reminded = true;
    }

    // Send overdue notification
    if (daysUntilDeadline < 0 && !deadline.overdueNotified) {
      await activities.sendDeadlineReminder(
        workflowState.caseId,
        deadline,
        daysUntilDeadline
      );
      deadline.overdueNotified = true;
    }
  }
}

/**
 * Check and send court date reminders
 */
async function checkCourtDateReminders(activities, workflowState) {
  const now = new Date();

  for (const courtDate of workflowState.courtDates) {
    if (courtDate.reminded) continue;

    const dateTime = new Date(courtDate.date);
    const hoursUntilCourtDate = Math.ceil((dateTime - now) / (1000 * 60 * 60));

    // Send reminder 48 hours and 24 hours before court date
    if ((hoursUntilCourtDate <= 48 && hoursUntilCourtDate > 24) ||
        (hoursUntilCourtDate <= 24 && hoursUntilCourtDate > 0)) {
      await activities.createCourtDateReminder(
        workflowState.caseId,
        courtDate,
        hoursUntilCourtDate
      );
      courtDate.reminded = true;
    }
  }
}

module.exports = {
  caseLifecycleWorkflow,
  // Export signals and queries for client use
  completeRequirementSignal,
  transitionStageSignal,
  addDeadlineSignal,
  pauseWorkflowSignal,
  resumeWorkflowSignal,
  addCourtDateSignal,
  getWorkflowStateQuery,
  getCurrentStageQuery,
  getRequirementsQuery,
};
