/**
 * Example Temporal Workflow
 *
 * This is a template workflow demonstrating the basic structure
 * of a Temporal workflow in this application.
 *
 * Workflows are durable functions that orchestrate activities.
 * They are deterministic and can be suspended and resumed.
 */

const { proxyActivities, sleep } = require('@temporalio/workflow');

// Configure activity options
const activities = proxyActivities({
  startToCloseTimeout: '1 minute',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '100s',
    maximumAttempts: 5,
  },
});

/**
 * Example workflow function
 * @param {Object} params - Workflow parameters
 * @param {string} params.userId - User ID
 * @param {string} params.action - Action to perform
 * @returns {Promise<Object>} Workflow result
 */
async function exampleWorkflow({ userId, action }) {
  console.log(`Starting example workflow for user ${userId} with action ${action}`);

  try {
    // Step 1: Execute an activity
    const result1 = await activities.exampleActivity({ userId, action });

    // Step 2: Wait for some time (demonstrates durability)
    await sleep('10s');

    // Step 3: Execute another activity
    const result2 = await activities.anotherExampleActivity({ userId, data: result1 });

    return {
      success: true,
      userId,
      action,
      results: {
        step1: result1,
        step2: result2,
      },
    };
  } catch (error) {
    console.error('Workflow failed:', error);
    throw error;
  }
}

module.exports = { exampleWorkflow };
