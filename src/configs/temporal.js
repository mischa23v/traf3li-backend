const { Connection, Client } = require('@temporalio/client');
const logger = require('../utils/logger');

let temporalClient = null;

/**
 * Get or create a Temporal client instance
 * @returns {Promise<Client>} Temporal client instance
 */
const getTemporalClient = async () => {
  if (temporalClient) return temporalClient;

  const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  const namespace = process.env.TEMPORAL_NAMESPACE || 'default';

  try {
    const connection = await Connection.connect({ address });
    temporalClient = new Client({
      connection,
      namespace,
    });
    logger.info(`Connected to Temporal at ${address}, namespace: ${namespace}`);
    return temporalClient;
  } catch (error) {
    logger.error('Failed to connect to Temporal:', error);
    throw error;
  }
};

/**
 * Close the Temporal connection
 */
const closeTemporalConnection = async () => {
  if (temporalClient) {
    await temporalClient.connection.close();
    temporalClient = null;
    logger.info('Temporal connection closed');
  }
};

/**
 * Task queue names for different workflow types
 */
const TASK_QUEUES = {
  INVOICE_APPROVAL: 'invoice-approval',
  ONBOARDING: 'employee-onboarding',
  OFFBOARDING: 'employee-offboarding',
  CASE_LIFECYCLE: 'case-lifecycle',
  PAYMENT_PROCESSING: 'payment-processing',
  DOCUMENT_PROCESSING: 'document-processing',
  NOTIFICATION: 'notification',
  BATCH_PROCESSING: 'batch-processing',
};

/**
 * Workflow execution timeouts (in milliseconds)
 */
const WORKFLOW_TIMEOUTS = {
  DEFAULT_EXECUTION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  INVOICE_APPROVAL_TIMEOUT: 7 * 24 * 60 * 60 * 1000, // 7 days
  ONBOARDING_TIMEOUT: 30 * 24 * 60 * 60 * 1000, // 30 days
  OFFBOARDING_TIMEOUT: 14 * 24 * 60 * 60 * 1000, // 14 days
  CASE_LIFECYCLE_TIMEOUT: 90 * 24 * 60 * 60 * 1000, // 90 days
  PAYMENT_PROCESSING_TIMEOUT: 1 * 60 * 60 * 1000, // 1 hour
  DOCUMENT_PROCESSING_TIMEOUT: 2 * 60 * 60 * 1000, // 2 hours
  NOTIFICATION_TIMEOUT: 5 * 60 * 1000, // 5 minutes
  BATCH_PROCESSING_TIMEOUT: 12 * 60 * 60 * 1000, // 12 hours
};

/**
 * Retry policies for different activity types
 */
const RETRY_POLICIES = {
  DEFAULT: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '100s',
    maximumAttempts: 5,
  },
  CRITICAL: {
    initialInterval: '1s',
    backoffCoefficient: 1.5,
    maximumInterval: '30s',
    maximumAttempts: 10,
  },
  NON_CRITICAL: {
    initialInterval: '5s',
    backoffCoefficient: 2,
    maximumInterval: '300s',
    maximumAttempts: 3,
  },
  NETWORK: {
    initialInterval: '2s',
    backoffCoefficient: 2,
    maximumInterval: '60s',
    maximumAttempts: 7,
  },
};

module.exports = {
  getTemporalClient,
  closeTemporalConnection,
  TASK_QUEUES,
  WORKFLOW_TIMEOUTS,
  RETRY_POLICIES,
};
