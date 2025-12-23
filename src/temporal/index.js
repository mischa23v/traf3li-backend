/**
 * Temporal Module Index
 *
 * Barrel export for all temporal modules.
 * Provides a centralized entry point for Temporal functionality.
 *
 * Usage:
 *   const temporal = require('./temporal');
 *
 *   // Start a workflow
 *   const handle = await temporal.client.startInvoiceApprovalWorkflow({...});
 *
 *   // Access workflow helpers
 *   const retry = temporal.helpers.createRetryPolicy({...});
 */

// Client exports
const client = require('./client');

// Worker exports
const worker = require('./worker');

// Workflow helpers
const helpers = require('./utils/workflowHelpers');

// Re-export all activities (for use in tests or other contexts)
const activities = {
  invoiceApproval: require('./activities/invoiceApproval.activities'),
  onboarding: require('./activities/onboarding.activities'),
  offboarding: require('./activities/offboarding.activities'),
  caseLifecycle: require('./activities/caseLifecycle.activities'),
};

module.exports = {
  // Client functions
  client: {
    ...client,
    // Convenience exports
    start: {
      invoiceApproval: client.startInvoiceApprovalWorkflow,
      onboarding: client.startOnboardingWorkflow,
      offboarding: client.startOffboardingWorkflow,
      caseLifecycle: client.startCaseLifecycleWorkflow,
    },
  },

  // Worker functions
  worker: {
    ...worker,
  },

  // Workflow helpers
  helpers,

  // Activities (mainly for testing)
  activities,

  // Task queues (for reference)
  TASK_QUEUES: worker.TASK_QUEUES,
};
