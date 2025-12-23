/**
 * Case Lifecycle Workflow - Usage Examples
 *
 * This file demonstrates how to use the Case Lifecycle Temporal Workflow
 * in various scenarios.
 */

const temporalClient = require('../client');
const Case = require('../../models/case.model');
const WorkflowTemplate = require('../../models/workflowTemplate.model');
const CaseStageProgress = require('../../models/caseStageProgress.model');

/**
 * Example 1: Start a basic case workflow
 */
async function startBasicCaseWorkflow() {
  try {
    // Assume we have a case ID
    const caseId = '64f1a2b3c4d5e6f7g8h9i0j1';

    // Find the default workflow template for labor cases
    const template = await WorkflowTemplate.findOne({
      caseCategory: 'labor',
      isDefault: true,
      isActive: true,
    });

    if (!template) {
      throw new Error('No default labor workflow template found');
    }

    // Start the workflow
    const handle = await temporalClient.startCaseLifecycleWorkflow(
      {
        caseId: caseId.toString(),
        caseType: 'labor',
        workflowTemplateId: template._id.toString(),
      },
      {
        workflowId: `case-lifecycle-${caseId}`,
        workflowExecutionTimeout: '365 days', // 1 year max
      }
    );

    console.log('✅ Workflow started successfully');
    console.log('Workflow ID:', handle.workflowId);
    console.log('Run ID:', handle.firstExecutionRunId);

    return handle;
  } catch (error) {
    console.error('❌ Error starting workflow:', error);
    throw error;
  }
}

/**
 * Example 2: Complete a requirement
 */
async function completeRequirement(caseId, requirementId) {
  try {
    const workflowId = `case-lifecycle-${caseId}`;

    // Import signal from workflow
    const { completeRequirementSignal } = require('../workflows/caseLifecycle.workflow');

    await temporalClient.signalWorkflow(
      workflowId,
      completeRequirementSignal,
      {
        requirementId: requirementId.toString(),
        name: 'Document uploaded',
        completedBy: 'user123',
        metadata: {
          stageId: 'stage123',
          documentUrl: 'https://example.com/doc.pdf',
        },
      }
    );

    console.log('✅ Requirement completed successfully');
  } catch (error) {
    console.error('❌ Error completing requirement:', error);
    throw error;
  }
}

/**
 * Example 3: Transition to next stage
 */
async function transitionToNextStage(caseId, nextStageId) {
  try {
    const workflowId = `case-lifecycle-${caseId}`;

    const { transitionStageSignal } = require('../workflows/caseLifecycle.workflow');

    await temporalClient.signalWorkflow(
      workflowId,
      transitionStageSignal,
      {
        stageId: nextStageId.toString(),
        notes: 'All requirements met, proceeding to next stage',
        requestedBy: 'user123',
      }
    );

    console.log('✅ Stage transition initiated');
  } catch (error) {
    console.error('❌ Error transitioning stage:', error);
    throw error;
  }
}

/**
 * Example 4: Add a deadline with reminders
 */
async function addCaseDeadline(caseId, deadlineInfo) {
  try {
    const workflowId = `case-lifecycle-${caseId}`;

    const { addDeadlineSignal } = require('../workflows/caseLifecycle.workflow');

    await temporalClient.signalWorkflow(
      workflowId,
      addDeadlineSignal,
      {
        title: deadlineInfo.title,
        date: deadlineInfo.date.toISOString(),
        description: deadlineInfo.description || '',
        addedBy: 'user123',
      }
    );

    console.log('✅ Deadline added successfully');
    console.log('Reminders will be sent at 7, 3, and 1 day(s) before deadline');
  } catch (error) {
    console.error('❌ Error adding deadline:', error);
    throw error;
  }
}

/**
 * Example 5: Add a court date
 */
async function addCourtDate(caseId, courtDateInfo) {
  try {
    const workflowId = `case-lifecycle-${caseId}`;

    const { addCourtDateSignal } = require('../workflows/caseLifecycle.workflow');

    await temporalClient.signalWorkflow(
      workflowId,
      addCourtDateSignal,
      {
        title: courtDateInfo.title,
        date: courtDateInfo.date.toISOString(),
        location: courtDateInfo.location || '',
        notes: courtDateInfo.notes || '',
        addedBy: 'user123',
      }
    );

    console.log('✅ Court date added successfully');
    console.log('Reminders will be sent at 48 and 24 hours before court date');
  } catch (error) {
    console.error('❌ Error adding court date:', error);
    throw error;
  }
}

/**
 * Example 6: Query workflow state
 */
async function queryWorkflowState(caseId) {
  try {
    const workflowId = `case-lifecycle-${caseId}`;

    const { getWorkflowStateQuery } = require('../workflows/caseLifecycle.workflow');

    const state = await temporalClient.queryWorkflow(
      workflowId,
      getWorkflowStateQuery
    );

    console.log('✅ Workflow state retrieved');
    console.log('Current Stage:', state.currentStage?.name);
    console.log('Completed Requirements:', state.completedRequirements.length);
    console.log('Active Deadlines:', state.deadlines.length);
    console.log('Court Dates:', state.courtDates.length);
    console.log('Is Paused:', state.isPaused);

    return state;
  } catch (error) {
    console.error('❌ Error querying workflow:', error);
    throw error;
  }
}

/**
 * Example 7: Pause workflow (for case hold)
 */
async function pauseCaseWorkflow(caseId, reason) {
  try {
    const workflowId = `case-lifecycle-${caseId}`;

    const { pauseWorkflowSignal } = require('../workflows/caseLifecycle.workflow');

    await temporalClient.signalWorkflow(workflowId, pauseWorkflowSignal);

    // Also update database
    await CaseStageProgress.findOneAndUpdate(
      { caseId },
      { status: 'paused' }
    );

    console.log('✅ Workflow paused:', reason);
  } catch (error) {
    console.error('❌ Error pausing workflow:', error);
    throw error;
  }
}

/**
 * Example 8: Resume workflow
 */
async function resumeCaseWorkflow(caseId) {
  try {
    const workflowId = `case-lifecycle-${caseId}`;

    const { resumeWorkflowSignal } = require('../workflows/caseLifecycle.workflow');

    await temporalClient.signalWorkflow(workflowId, resumeWorkflowSignal);

    // Also update database
    await CaseStageProgress.findOneAndUpdate(
      { caseId },
      { status: 'active' }
    );

    console.log('✅ Workflow resumed');
  } catch (error) {
    console.error('❌ Error resuming workflow:', error);
    throw error;
  }
}

/**
 * Example 9: Complete case workflow scenario
 */
async function completeCaseWorkflowScenario() {
  console.log('\n🔄 Starting complete case workflow scenario...\n');

  try {
    // 1. Start workflow
    console.log('Step 1: Starting workflow...');
    const handle = await startBasicCaseWorkflow();
    const caseId = handle.workflowId.split('-').pop();

    // 2. Wait a bit for workflow to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Query initial state
    console.log('\nStep 2: Querying initial state...');
    await queryWorkflowState(caseId);

    // 4. Add a court date
    console.log('\nStep 3: Adding court date...');
    await addCourtDate(caseId, {
      title: 'First hearing',
      date: new Date('2025-03-15T10:00:00Z'),
      location: 'Courtroom 3B, Main Courthouse',
      notes: 'Bring all evidence documents',
    });

    // 5. Add a deadline
    console.log('\nStep 4: Adding deadline...');
    await addCaseDeadline(caseId, {
      title: 'File response brief',
      date: new Date('2025-03-10T17:00:00Z'),
      description: 'Deadline to respond to defendant\'s motion',
    });

    // 6. Complete a requirement
    console.log('\nStep 5: Completing requirement...');
    await completeRequirement(caseId, 'req123');

    // 7. Query final state
    console.log('\nStep 6: Querying final state...');
    const finalState = await queryWorkflowState(caseId);

    console.log('\n✅ Complete scenario executed successfully!');
    console.log('Final workflow state:', JSON.stringify(finalState, null, 2));

  } catch (error) {
    console.error('\n❌ Scenario failed:', error);
    throw error;
  }
}

/**
 * Example 10: Monitor workflow execution
 */
async function monitorWorkflowExecution(caseId, intervalSeconds = 60) {
  console.log(`\n👀 Monitoring workflow for case ${caseId}...`);
  console.log(`Checking every ${intervalSeconds} seconds. Press Ctrl+C to stop.\n`);

  const workflowId = `case-lifecycle-${caseId}`;

  const interval = setInterval(async () => {
    try {
      const description = await temporalClient.describeWorkflow(workflowId);
      const state = await queryWorkflowState(caseId);

      console.log(`[${new Date().toISOString()}] Workflow Status:`);
      console.log(`  Status: ${description.status.name}`);
      console.log(`  Current Stage: ${state.currentStage?.name || 'Unknown'}`);
      console.log(`  Runtime: ${Math.round(description.executionTime / 3600)} hours`);
      console.log(`  Completed Requirements: ${state.completedRequirements.length}`);
      console.log(`  Active Deadlines: ${state.deadlines.length}`);
      console.log(`  Is Paused: ${state.isPaused}`);
      console.log('---');

      if (description.status.name === 'COMPLETED') {
        console.log('✅ Workflow completed!');
        clearInterval(interval);
      }
    } catch (error) {
      console.error('Error monitoring workflow:', error.message);
    }
  }, intervalSeconds * 1000);
}

// Export all examples
module.exports = {
  startBasicCaseWorkflow,
  completeRequirement,
  transitionToNextStage,
  addCaseDeadline,
  addCourtDate,
  queryWorkflowState,
  pauseCaseWorkflow,
  resumeCaseWorkflow,
  completeCaseWorkflowScenario,
  monitorWorkflowExecution,
};

// Run example if executed directly
if (require.main === module) {
  console.log('Case Lifecycle Workflow Examples');
  console.log('=================================\n');
  console.log('Available examples:');
  console.log('1. startBasicCaseWorkflow()');
  console.log('2. completeRequirement(caseId, requirementId)');
  console.log('3. transitionToNextStage(caseId, stageId)');
  console.log('4. addCaseDeadline(caseId, deadlineInfo)');
  console.log('5. addCourtDate(caseId, courtDateInfo)');
  console.log('6. queryWorkflowState(caseId)');
  console.log('7. pauseCaseWorkflow(caseId, reason)');
  console.log('8. resumeCaseWorkflow(caseId)');
  console.log('9. completeCaseWorkflowScenario()');
  console.log('10. monitorWorkflowExecution(caseId)\n');

  // Uncomment to run a specific example:
  // completeCaseWorkflowScenario();
}
