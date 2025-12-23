const mongoose = require('mongoose');
const Case = require('../../models/case.model');
const WorkflowTemplate = require('../../models/workflowTemplate.model');
const CaseStageProgress = require('../../models/caseStageProgress.model');
const logger = require('../../utils/logger');

/**
 * Case Lifecycle Activities
 *
 * These activities perform database operations and external integrations
 * for the case lifecycle workflow.
 */

/**
 * Get workflow template by ID
 */
async function getWorkflowTemplate(workflowTemplateId) {
  try {
    const template = await WorkflowTemplate.findById(workflowTemplateId);

    if (!template) {
      throw new Error(`Workflow template not found: ${workflowTemplateId}`);
    }

    if (!template.isActive) {
      throw new Error(`Workflow template is not active: ${workflowTemplateId}`);
    }

    return template.toObject();
  } catch (error) {
    logger.error('Error fetching workflow template:', error);
    throw error;
  }
}

/**
 * Enter a new stage
 */
async function enterStage(caseId, stageId, stageName) {
  try {
    // Update case stage progress
    const progress = await CaseStageProgress.findOne({ caseId });

    if (!progress) {
      throw new Error(`No workflow progress found for case: ${caseId}`);
    }

    const now = new Date();

    // Update current stage history to set exit time
    const currentHistory = progress.stageHistory.find(
      h => h.stageId.toString() === progress.currentStageId.toString() && !h.exitedAt
    );

    if (currentHistory) {
      currentHistory.exitedAt = now;
      currentHistory.duration = Math.round((now - currentHistory.enteredAt) / (1000 * 60 * 60));
    }

    // Add new stage to history
    progress.stageHistory.push({
      stageId,
      stageName,
      enteredAt: now,
    });

    progress.currentStageId = stageId;
    progress.currentStageName = stageName;
    await progress.save();

    // Update case model
    await Case.findByIdAndUpdate(caseId, {
      currentStage: stageName,
      pipelineStage: stageName,
      stageEnteredAt: now,
      $push: {
        stageHistory: {
          stage: stageName,
          enteredAt: now,
        },
      },
    });

    logger.info(`Case ${caseId} entered stage: ${stageName}`);
  } catch (error) {
    logger.error(`Error entering stage for case ${caseId}:`, error);
    throw error;
  }
}

/**
 * Exit current stage
 */
async function exitStage(caseId, stageId) {
  try {
    const progress = await CaseStageProgress.findOne({ caseId });

    if (!progress) {
      throw new Error(`No workflow progress found for case: ${caseId}`);
    }

    const now = new Date();

    // Find the current stage history entry and update exit time
    const stageHistoryEntry = progress.stageHistory.find(
      h => h.stageId.toString() === stageId && !h.exitedAt
    );

    if (stageHistoryEntry) {
      stageHistoryEntry.exitedAt = now;
      stageHistoryEntry.duration = Math.round(
        (now - stageHistoryEntry.enteredAt) / (1000 * 60 * 60)
      );
      await progress.save();
    }

    // Update case stage history
    const caseDoc = await Case.findById(caseId);
    if (caseDoc && caseDoc.stageHistory.length > 0) {
      const lastStageEntry = caseDoc.stageHistory[caseDoc.stageHistory.length - 1];
      if (!lastStageEntry.exitedAt) {
        lastStageEntry.exitedAt = now;
        await caseDoc.save();
      }
    }

    logger.info(`Case ${caseId} exited stage: ${stageId}`);
  } catch (error) {
    logger.error(`Error exiting stage for case ${caseId}:`, error);
    throw error;
  }
}

/**
 * Check if all requirements for a stage are completed
 */
async function checkStageRequirements(caseId, stageId, completedRequirements) {
  try {
    const progress = await CaseStageProgress.findOne({ caseId }).populate('workflowId');

    if (!progress) {
      throw new Error(`No workflow progress found for case: ${caseId}`);
    }

    const template = progress.workflowId;
    const stage = template.stages.find(s => s._id.toString() === stageId);

    if (!stage) {
      throw new Error(`Stage not found: ${stageId}`);
    }

    // Get required requirements for this stage
    const requiredRequirements = stage.requirements.filter(r => r.isRequired);

    if (requiredRequirements.length === 0) {
      return true; // No requirements, stage is complete
    }

    // Check if all required requirements are completed
    const completedIds = completedRequirements
      .filter(cr => cr.stageId === stageId)
      .map(cr => cr.requirementId);

    const allCompleted = requiredRequirements.every(req =>
      completedIds.includes(req._id.toString())
    );

    return allCompleted;
  } catch (error) {
    logger.error(`Error checking stage requirements for case ${caseId}:`, error);
    throw error;
  }
}

/**
 * Send stage transition notification
 */
async function notifyStageTransition(caseId, stageName, action, notes) {
  try {
    const caseDoc = await Case.findById(caseId)
      .populate('lawyerId', 'name email')
      .populate('clientId', 'name email');

    if (!caseDoc) {
      throw new Error(`Case not found: ${caseId}`);
    }

    // TODO: Integrate with notification service (email, SMS, push)
    // For now, just log the notification
    logger.info(`Notification: Case ${caseDoc.title || caseId} ${action} stage: ${stageName}`, {
      lawyer: caseDoc.lawyerId?.email,
      client: caseDoc.clientId?.email,
      notes,
    });

    // Add notification to case
    await Case.findByIdAndUpdate(caseId, {
      $push: {
        notes: {
          text: `${action === 'entered' ? 'Entered' : 'Exited'} stage: ${stageName}${notes ? ` - ${notes}` : ''}`,
          date: new Date(),
          isPrivate: false,
        },
      },
    });
  } catch (error) {
    logger.error(`Error sending stage transition notification for case ${caseId}:`, error);
    // Don't throw - notifications are not critical
  }
}

/**
 * Send deadline reminder
 */
async function sendDeadlineReminder(caseId, deadline, daysUntil) {
  try {
    const caseDoc = await Case.findById(caseId)
      .populate('lawyerId', 'name email')
      .populate('clientId', 'name email');

    if (!caseDoc) {
      throw new Error(`Case not found: ${caseId}`);
    }

    const isOverdue = daysUntil < 0;
    const message = isOverdue
      ? `Deadline OVERDUE: ${deadline.title} was due ${Math.abs(daysUntil)} days ago`
      : `Deadline reminder: ${deadline.title} is due in ${daysUntil} days`;

    // TODO: Integrate with notification service (email, SMS, push)
    logger.info(`Deadline reminder for case ${caseDoc.title || caseId}:`, {
      message,
      deadline,
      lawyer: caseDoc.lawyerId?.email,
    });

    // Add note to case
    await Case.findByIdAndUpdate(caseId, {
      $push: {
        notes: {
          text: message,
          date: new Date(),
          isPrivate: false,
        },
      },
    });
  } catch (error) {
    logger.error(`Error sending deadline reminder for case ${caseId}:`, error);
    // Don't throw - reminders are not critical
  }
}

/**
 * Create court date reminder
 */
async function createCourtDateReminder(caseId, courtDate, hoursUntil) {
  try {
    const caseDoc = await Case.findById(caseId)
      .populate('lawyerId', 'name email')
      .populate('clientId', 'name email');

    if (!caseDoc) {
      throw new Error(`Case not found: ${caseId}`);
    }

    const message = hoursUntil
      ? `Court date reminder: ${courtDate.title || 'Hearing'} in ${hoursUntil} hours`
      : `Court date scheduled: ${courtDate.title || 'Hearing'} on ${new Date(courtDate.date).toLocaleDateString()}`;

    // TODO: Integrate with notification service (email, SMS, push)
    logger.info(`Court date reminder for case ${caseDoc.title || caseId}:`, {
      message,
      courtDate,
      lawyer: caseDoc.lawyerId?.email,
      client: caseDoc.clientId?.email,
    });

    // Add to case hearings if not already present
    const existingHearing = caseDoc.hearings.find(
      h => h.date && h.date.getTime() === new Date(courtDate.date).getTime()
    );

    if (!existingHearing) {
      await Case.findByIdAndUpdate(caseId, {
        $push: {
          hearings: {
            date: new Date(courtDate.date),
            location: courtDate.location,
            notes: courtDate.notes,
            status: 'scheduled',
          },
        },
      });
    }

    // Add note to case
    await Case.findByIdAndUpdate(caseId, {
      $push: {
        notes: {
          text: message,
          date: new Date(),
          isPrivate: false,
        },
      },
    });
  } catch (error) {
    logger.error(`Error creating court date reminder for case ${caseId}:`, error);
    // Don't throw - reminders are not critical
  }
}

/**
 * Update case status
 */
async function updateCaseStatus(caseId, status) {
  try {
    await Case.findByIdAndUpdate(caseId, {
      status,
      $push: {
        statusHistory: {
          status,
          changedAt: new Date(),
        },
      },
    });

    logger.info(`Case ${caseId} status updated to: ${status}`);
  } catch (error) {
    logger.error(`Error updating case status for case ${caseId}:`, error);
    throw error;
  }
}

/**
 * Notify assigned team about stage change
 */
async function notifyAssignedTeam(caseId, stageName, message) {
  try {
    const caseDoc = await Case.findById(caseId)
      .populate('lawyerId', 'name email')
      .populate('firmId', 'name');

    if (!caseDoc) {
      throw new Error(`Case not found: ${caseId}`);
    }

    // TODO: Integrate with team notification system
    logger.info(`Team notification for case ${caseDoc.title || caseId}:`, {
      stage: stageName,
      message,
      lawyer: caseDoc.lawyerId?.email,
      firm: caseDoc.firmId?.name,
    });
  } catch (error) {
    logger.error(`Error notifying assigned team for case ${caseId}:`, error);
    // Don't throw - notifications are not critical
  }
}

/**
 * Log case activity
 */
async function logCaseActivity(caseId, activityType, metadata) {
  try {
    // Add note to case with activity details
    const noteText = formatActivityNote(activityType, metadata);

    await Case.findByIdAndUpdate(caseId, {
      $push: {
        notes: {
          text: noteText,
          date: new Date(),
          isPrivate: true, // Workflow logs are private
        },
      },
    });

    logger.info(`Activity logged for case ${caseId}:`, {
      activityType,
      metadata,
    });
  } catch (error) {
    logger.error(`Error logging case activity for case ${caseId}:`, error);
    // Don't throw - logging is not critical
  }
}

/**
 * Format activity note text
 */
function formatActivityNote(activityType, metadata) {
  const timestamp = new Date().toISOString();

  switch (activityType) {
    case 'workflow_started':
      return `[Workflow] Started at ${timestamp}`;
    case 'workflow_completed':
      return `[Workflow] Completed at ${timestamp}`;
    case 'workflow_paused':
      return `[Workflow] Paused at ${timestamp}`;
    case 'workflow_resumed':
      return `[Workflow] Resumed at ${timestamp}`;
    case 'stage_entered':
      return `[Workflow] Entered stage: ${metadata.stage}${metadata.notes ? ` - ${metadata.notes}` : ''}`;
    case 'stage_exited':
      return `[Workflow] Exited stage: ${metadata.stage} (Duration: ${metadata.duration} hours)`;
    case 'requirement_completed':
      return `[Workflow] Requirement completed: ${metadata.requirement.name} in stage ${metadata.stage}`;
    case 'deadline_added':
      return `[Workflow] Deadline added: ${metadata.deadline.title} on ${new Date(metadata.deadline.date).toLocaleDateString()}`;
    case 'court_date_added':
      return `[Workflow] Court date added: ${metadata.courtDate.title || 'Hearing'} on ${new Date(metadata.courtDate.date).toLocaleDateString()}`;
    case 'workflow_error':
      return `[Workflow] Error: ${metadata.error}`;
    default:
      return `[Workflow] ${activityType}: ${JSON.stringify(metadata)}`;
  }
}

module.exports = {
  getWorkflowTemplate,
  enterStage,
  exitStage,
  checkStageRequirements,
  notifyStageTransition,
  sendDeadlineReminder,
  createCourtDateReminder,
  updateCaseStatus,
  notifyAssignedTeam,
  logCaseActivity,
};
