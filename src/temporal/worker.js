const { Worker, NativeConnection } = require('@temporalio/worker');
const path = require('path');
const logger = require('../utils/logger');

// Import all activities
const invoiceActivities = require('./activities/invoiceApproval.activities');
const onboardingActivities = require('./activities/onboarding.activities');
const offboardingActivities = require('./activities/offboarding.activities');
const caseActivities = require('./activities/caseLifecycle.activities');

const TASK_QUEUES = {
  INVOICE_APPROVAL: 'invoice-approval',
  ONBOARDING: 'employee-onboarding',
  OFFBOARDING: 'employee-offboarding',
  CASE_LIFECYCLE: 'case-lifecycle',
};

async function createWorker(taskQueue, activities) {
  const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  const namespace = process.env.TEMPORAL_NAMESPACE || 'default';

  const connection = await NativeConnection.connect({ address });

  const worker = await Worker.create({
    connection,
    namespace,
    taskQueue,
    workflowsPath: path.join(__dirname, 'workflows'),
    activities,
  });

  return worker;
}

async function runAllWorkers() {
  logger.info('Starting Temporal workers...');

  const workers = await Promise.all([
    createWorker(TASK_QUEUES.INVOICE_APPROVAL, invoiceActivities),
    createWorker(TASK_QUEUES.ONBOARDING, onboardingActivities),
    createWorker(TASK_QUEUES.OFFBOARDING, offboardingActivities),
    createWorker(TASK_QUEUES.CASE_LIFECYCLE, caseActivities),
  ]);

  logger.info(`Started ${workers.length} Temporal workers`);

  // Run all workers
  await Promise.all(workers.map(w => w.run()));
}

module.exports = { createWorker, runAllWorkers, TASK_QUEUES };
