/**
 * Temporal Client - Singleton client for starting, signaling, and querying workflows
 *
 * Provides helper methods for each workflow type with built-in retry logic and error handling.
 *
 * Usage:
 *   const temporalClient = require('./temporal/client');
 *   const client = await temporalClient.getClient();
 *
 *   // Start an invoice approval workflow
 *   const handle = await temporalClient.startInvoiceApprovalWorkflow({
 *     invoiceId: '123',
 *     amount: 5000,
 *     approvers: ['user1', 'user2']
 *   });
 */

const { Client, Connection } = require('@temporalio/client');
const logger = require('../utils/logger');
const { TASK_QUEUES } = require('./worker');

// Singleton client instance
let clientInstance = null;
let connectionInstance = null;

/**
 * Get or create the Temporal client singleton
 * @returns {Promise<Client>} Temporal client instance
 */
async function getClient() {
  if (clientInstance) {
    return clientInstance;
  }

  try {
    const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
    const namespace = process.env.TEMPORAL_NAMESPACE || 'default';

    logger.info('Connecting to Temporal server', { address, namespace });

    // Create connection
    connectionInstance = await Connection.connect({ address });

    // Create client
    clientInstance = new Client({
      connection: connectionInstance,
      namespace,
    });

    logger.info('Temporal client connected successfully');

    return clientInstance;
  } catch (error) {
    logger.error('Failed to connect to Temporal server', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Close the Temporal client connection
 */
async function closeClient() {
  if (connectionInstance) {
    await connectionInstance.close();
    connectionInstance = null;
    clientInstance = null;
    logger.info('Temporal client connection closed');
  }
}

/**
 * Retry wrapper for workflow operations
 * @param {Function} operation - Async operation to retry
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {number} delayMs - Delay between retries in milliseconds (default: 1000)
 * @returns {Promise<any>} Result of the operation
 */
async function withRetry(operation, maxRetries = 3, delayMs = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      logger.warn('Temporal operation failed, retrying', {
        attempt,
        maxRetries,
        error: error.message
      });

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError;
}

/**
 * Start an Invoice Approval workflow
 * @param {Object} params - Workflow parameters
 * @param {string} params.invoiceId - Invoice ID
 * @param {number} params.amount - Invoice amount
 * @param {string[]} params.approvers - List of approver user IDs
 * @param {string} params.firmId - Firm ID
 * @param {Object} options - Workflow options
 * @returns {Promise<WorkflowHandle>} Workflow handle
 */
async function startInvoiceApprovalWorkflow(params, options = {}) {
  return withRetry(async () => {
    const client = await getClient();
    const workflowId = options.workflowId || `invoice-approval-${params.invoiceId}-${Date.now()}`;

    logger.info('Starting invoice approval workflow', {
      workflowId,
      invoiceId: params.invoiceId,
      amount: params.amount
    });

    const handle = await client.workflow.start('invoiceApprovalWorkflow', {
      taskQueue: TASK_QUEUES.INVOICE_APPROVAL,
      workflowId,
      args: [params],
      ...options
    });

    logger.info('Invoice approval workflow started', {
      workflowId: handle.workflowId,
      runId: handle.firstExecutionRunId
    });

    return handle;
  });
}

/**
 * Start an Employee Onboarding workflow
 * @param {Object} params - Workflow parameters
 * @param {string} params.employeeId - Employee ID
 * @param {string} params.onboardingId - Onboarding record ID
 * @param {Date} params.startDate - Start date
 * @param {string} params.role - Job role (for role-based templates)
 * @param {Object} params.config - Onboarding configuration
 * @param {Object} options - Workflow options
 * @returns {Promise<WorkflowHandle>} Workflow handle
 */
async function startOnboardingWorkflow(params, options = {}) {
  return withRetry(async () => {
    const client = await getClient();
    const workflowId = options.workflowId || `onboarding-${params.employeeId}-${Date.now()}`;

    logger.info('Starting onboarding workflow', {
      workflowId,
      employeeId: params.employeeId,
      onboardingId: params.onboardingId,
      role: params.role
    });

    const handle = await client.workflow.start('onboardingWorkflow', {
      taskQueue: TASK_QUEUES.ONBOARDING,
      workflowId,
      args: [params],
      workflowExecutionTimeout: '180 days', // Max probation period
      workflowRunTimeout: '180 days',
      ...options
    });

    logger.info('Onboarding workflow started', {
      workflowId: handle.workflowId,
      runId: handle.firstExecutionRunId
    });

    return handle;
  });
}

/**
 * Signal onboarding workflow that documents have been submitted
 * @param {string} workflowId - Workflow ID
 * @param {Object} data - Document submission data
 * @param {number} data.verifiedCount - Number of verified documents
 * @param {number} data.pendingCount - Number of pending documents
 */
async function signalDocumentsSubmitted(workflowId, data) {
  return signalWorkflow(workflowId, 'documentsSubmitted', data);
}

/**
 * Signal onboarding workflow that training has been completed
 * @param {string} workflowId - Workflow ID
 * @param {Object} data - Training completion data
 * @param {number} data.sessionsCompleted - Number of completed sessions
 */
async function signalTrainingCompleted(workflowId, data) {
  return signalWorkflow(workflowId, 'trainingCompleted', data);
}

/**
 * Signal onboarding workflow that a review has been completed
 * @param {string} workflowId - Workflow ID
 * @param {Object} data - Review completion data
 * @param {string} data.reviewType - Type of review (30_day, 60_day, etc.)
 * @param {string} data.outcome - Review outcome
 */
async function signalReviewCompleted(workflowId, data) {
  return signalWorkflow(workflowId, 'reviewCompleted', data);
}

/**
 * Signal onboarding workflow to skip a phase
 * @param {string} workflowId - Workflow ID
 * @param {string} phase - Phase to skip (pre_boarding, documentation, training, probation)
 */
async function signalSkipPhase(workflowId, phase) {
  return signalWorkflow(workflowId, 'skipPhase', phase);
}

/**
 * Query onboarding workflow progress
 * @param {string} workflowId - Workflow ID
 * @returns {Promise<Object>} Progress data
 */
async function queryOnboardingProgress(workflowId) {
  return queryWorkflow(workflowId, 'getProgress');
}

/**
 * Query current onboarding phase
 * @param {string} workflowId - Workflow ID
 * @returns {Promise<string>} Current phase
 */
async function queryCurrentPhase(workflowId) {
  return queryWorkflow(workflowId, 'getCurrentPhase');
}

/**
 * Query pending onboarding tasks
 * @param {string} workflowId - Workflow ID
 * @returns {Promise<Array>} Pending tasks
 */
async function queryPendingTasks(workflowId) {
  return queryWorkflow(workflowId, 'getPendingTasks');
}

/**
 * Start an Employee Offboarding workflow
 * @param {Object} params - Workflow parameters
 * @param {string} params.employeeId - Employee ID
 * @param {string} params.reason - Offboarding reason
 * @param {Date} params.lastWorkingDay - Last working day
 * @param {Object} options - Workflow options
 * @returns {Promise<WorkflowHandle>} Workflow handle
 */
async function startOffboardingWorkflow(params, options = {}) {
  return withRetry(async () => {
    const client = await getClient();
    const workflowId = options.workflowId || `offboarding-${params.employeeId}-${Date.now()}`;

    logger.info('Starting offboarding workflow', {
      workflowId,
      employeeId: params.employeeId,
      reason: params.reason
    });

    const handle = await client.workflow.start('employeeOffboardingWorkflow', {
      taskQueue: TASK_QUEUES.OFFBOARDING,
      workflowId,
      args: [params],
      ...options
    });

    logger.info('Offboarding workflow started', {
      workflowId: handle.workflowId,
      runId: handle.firstExecutionRunId
    });

    return handle;
  });
}

/**
 * Start a Case Lifecycle workflow
 * @param {Object} params - Workflow parameters
 * @param {string} params.caseId - Case ID
 * @param {string} params.caseType - Type of case
 * @param {string} params.clientId - Client ID
 * @param {string} params.firmId - Firm ID
 * @param {Object} options - Workflow options
 * @returns {Promise<WorkflowHandle>} Workflow handle
 */
async function startCaseLifecycleWorkflow(params, options = {}) {
  return withRetry(async () => {
    const client = await getClient();
    const workflowId = options.workflowId || `case-lifecycle-${params.caseId}-${Date.now()}`;

    logger.info('Starting case lifecycle workflow', {
      workflowId,
      caseId: params.caseId,
      caseType: params.caseType
    });

    const handle = await client.workflow.start('caseLifecycleWorkflow', {
      taskQueue: TASK_QUEUES.CASE_LIFECYCLE,
      workflowId,
      args: [params],
      ...options
    });

    logger.info('Case lifecycle workflow started', {
      workflowId: handle.workflowId,
      runId: handle.firstExecutionRunId
    });

    return handle;
  });
}

/**
 * Get a workflow handle by ID
 * @param {string} workflowId - Workflow ID
 * @returns {Promise<WorkflowHandle>} Workflow handle
 */
async function getWorkflowHandle(workflowId) {
  const client = await getClient();
  return client.workflow.getHandle(workflowId);
}

/**
 * Signal a workflow
 * @param {string} workflowId - Workflow ID
 * @param {string} signalName - Signal name
 * @param {any[]} args - Signal arguments
 */
async function signalWorkflow(workflowId, signalName, ...args) {
  return withRetry(async () => {
    logger.info('Sending signal to workflow', {
      workflowId,
      signalName
    });

    const handle = await getWorkflowHandle(workflowId);
    await handle.signal(signalName, ...args);

    logger.info('Signal sent successfully', {
      workflowId,
      signalName
    });
  });
}

/**
 * Query a workflow
 * @param {string} workflowId - Workflow ID
 * @param {string} queryName - Query name
 * @param {any[]} args - Query arguments
 * @returns {Promise<any>} Query result
 */
async function queryWorkflow(workflowId, queryName, ...args) {
  return withRetry(async () => {
    logger.debug('Querying workflow', {
      workflowId,
      queryName
    });

    const handle = await getWorkflowHandle(workflowId);
    const result = await handle.query(queryName, ...args);

    logger.debug('Query completed', {
      workflowId,
      queryName
    });

    return result;
  });
}

/**
 * Cancel a workflow
 * @param {string} workflowId - Workflow ID
 */
async function cancelWorkflow(workflowId) {
  return withRetry(async () => {
    logger.info('Cancelling workflow', { workflowId });

    const handle = await getWorkflowHandle(workflowId);
    await handle.cancel();

    logger.info('Workflow cancelled', { workflowId });
  });
}

/**
 * Terminate a workflow
 * @param {string} workflowId - Workflow ID
 * @param {string} reason - Termination reason
 */
async function terminateWorkflow(workflowId, reason = 'Terminated by user') {
  return withRetry(async () => {
    logger.warn('Terminating workflow', { workflowId, reason });

    const handle = await getWorkflowHandle(workflowId);
    await handle.terminate(reason);

    logger.warn('Workflow terminated', { workflowId, reason });
  });
}

/**
 * Get workflow execution description
 * @param {string} workflowId - Workflow ID
 * @returns {Promise<Object>} Workflow description
 */
async function describeWorkflow(workflowId) {
  return withRetry(async () => {
    const handle = await getWorkflowHandle(workflowId);
    return handle.describe();
  });
}

/**
 * Wait for workflow result
 * @param {string} workflowId - Workflow ID
 * @returns {Promise<any>} Workflow result
 */
async function getWorkflowResult(workflowId) {
  return withRetry(async () => {
    logger.info('Waiting for workflow result', { workflowId });

    const handle = await getWorkflowHandle(workflowId);
    const result = await handle.result();

    logger.info('Workflow completed', { workflowId });

    return result;
  });
}

module.exports = {
  // Client management
  getClient,
  closeClient,

  // Workflow starters
  startInvoiceApprovalWorkflow,
  startOnboardingWorkflow,
  startOffboardingWorkflow,
  startCaseLifecycleWorkflow,

  // Onboarding-specific operations
  signalDocumentsSubmitted,
  signalTrainingCompleted,
  signalReviewCompleted,
  signalSkipPhase,
  queryOnboardingProgress,
  queryCurrentPhase,
  queryPendingTasks,

  // Workflow operations
  getWorkflowHandle,
  signalWorkflow,
  queryWorkflow,
  cancelWorkflow,
  terminateWorkflow,
  describeWorkflow,
  getWorkflowResult,

  // Utilities
  withRetry,
};
