/**
 * Workflow Helpers
 *
 * Common utilities for Temporal workflows:
 * - Retry policies
 * - Timeout configurations
 * - Activity options
 * - Workflow utilities
 *
 * Usage:
 *   const { createRetryPolicy, defaultActivityOptions } = require('./utils/workflowHelpers');
 *
 *   // In a workflow
 *   const result = await proxyActivities(activities, {
 *     ...defaultActivityOptions,
 *     retryPolicy: createRetryPolicy({ maxAttempts: 5 }),
 *   });
 */

/**
 * Create a retry policy with common defaults
 *
 * @param {Object} options - Retry policy options
 * @param {number} options.maxAttempts - Maximum number of attempts (default: 3)
 * @param {string} options.initialInterval - Initial retry interval (default: '1s')
 * @param {number} options.backoffCoefficient - Backoff multiplier (default: 2)
 * @param {string} options.maximumInterval - Maximum interval between retries (default: '1m')
 * @param {string[]} options.nonRetryableErrorTypes - Errors that should not be retried
 * @returns {Object} Retry policy
 */
function createRetryPolicy(options = {}) {
  const {
    maxAttempts = 3,
    initialInterval = '1s',
    backoffCoefficient = 2,
    maximumInterval = '1m',
    nonRetryableErrorTypes = [],
  } = options;

  return {
    maximumAttempts: maxAttempts,
    initialInterval,
    backoffCoefficient,
    maximumInterval,
    nonRetryableErrorTypes,
  };
}

/**
 * Create a retry policy for critical operations that should be retried more aggressively
 *
 * @param {Object} options - Additional options to override defaults
 * @returns {Object} Retry policy
 */
function createCriticalRetryPolicy(options = {}) {
  return createRetryPolicy({
    maxAttempts: 10,
    initialInterval: '500ms',
    backoffCoefficient: 1.5,
    maximumInterval: '30s',
    ...options,
  });
}

/**
 * Create a retry policy for external API calls
 * Uses exponential backoff with longer intervals
 *
 * @param {Object} options - Additional options to override defaults
 * @returns {Object} Retry policy
 */
function createExternalApiRetryPolicy(options = {}) {
  return createRetryPolicy({
    maxAttempts: 5,
    initialInterval: '2s',
    backoffCoefficient: 2,
    maximumInterval: '5m',
    ...options,
  });
}

/**
 * Create a retry policy for database operations
 *
 * @param {Object} options - Additional options to override defaults
 * @returns {Object} Retry policy
 */
function createDatabaseRetryPolicy(options = {}) {
  return createRetryPolicy({
    maxAttempts: 5,
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '30s',
    nonRetryableErrorTypes: [
      'ValidationError',
      'DuplicateKeyError',
      'CastError',
    ],
    ...options,
  });
}

/**
 * Default activity options
 * Provides sensible defaults for most activities
 */
const defaultActivityOptions = {
  startToCloseTimeout: '5m',
  scheduleToCloseTimeout: '10m',
  heartbeatTimeout: '30s',
  retryPolicy: createRetryPolicy(),
};

/**
 * Activity options for quick operations (< 30 seconds)
 */
const quickActivityOptions = {
  startToCloseTimeout: '30s',
  scheduleToCloseTimeout: '1m',
  heartbeatTimeout: '10s',
  retryPolicy: createRetryPolicy({ maxAttempts: 3 }),
};

/**
 * Activity options for long-running operations (up to 1 hour)
 */
const longRunningActivityOptions = {
  startToCloseTimeout: '1h',
  scheduleToCloseTimeout: '2h',
  heartbeatTimeout: '1m',
  retryPolicy: createRetryPolicy({ maxAttempts: 5 }),
};

/**
 * Activity options for external API calls
 */
const externalApiActivityOptions = {
  startToCloseTimeout: '2m',
  scheduleToCloseTimeout: '10m',
  heartbeatTimeout: '30s',
  retryPolicy: createExternalApiRetryPolicy(),
};

/**
 * Activity options for database operations
 */
const databaseActivityOptions = {
  startToCloseTimeout: '1m',
  scheduleToCloseTimeout: '5m',
  heartbeatTimeout: '20s',
  retryPolicy: createDatabaseRetryPolicy(),
};

/**
 * Create a timeout configuration for workflows
 *
 * @param {Object} options - Timeout options
 * @param {string} options.workflowExecutionTimeout - Maximum time for workflow (default: '1 day')
 * @param {string} options.workflowRunTimeout - Maximum time for a single run (default: '12 hours')
 * @param {string} options.workflowTaskTimeout - Maximum time for workflow task (default: '10s')
 * @returns {Object} Timeout configuration
 */
function createWorkflowTimeouts(options = {}) {
  const {
    workflowExecutionTimeout = '1 day',
    workflowRunTimeout = '12 hours',
    workflowTaskTimeout = '10s',
  } = options;

  return {
    workflowExecutionTimeout,
    workflowRunTimeout,
    workflowTaskTimeout,
  };
}

/**
 * Create a cron schedule for periodic workflows
 *
 * Common cron patterns:
 * - Every minute: '* * * * *'
 * - Every hour: '0 * * * *'
 * - Every day at midnight: '0 0 * * *'
 * - Every Monday at 9am: '0 9 * * 1'
 * - First day of month: '0 0 1 * *'
 *
 * @param {string} schedule - Cron expression
 * @returns {Object} Cron schedule configuration
 */
function createCronSchedule(schedule) {
  return {
    cronSchedule: schedule,
  };
}

/**
 * Parse a duration string to milliseconds
 *
 * @param {string} duration - Duration string (e.g., '1s', '5m', '2h', '1d')
 * @returns {number} Duration in milliseconds
 */
function parseDuration(duration) {
  const units = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  const match = duration.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/i);
  if (!match) {
    throw new Error('Invalid duration format: ' + duration);
  }

  const value = match[1];
  const unit = match[2];
  const multiplier = units[unit.toLowerCase()];

  if (!multiplier) {
    throw new Error('Unknown duration unit: ' + unit);
  }

  return parseFloat(value) * multiplier;
}

/**
 * Format duration in milliseconds to a human-readable string
 *
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration (e.g., '5m 30s')
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return days + 'd ' + (hours % 24) + 'h';
  }
  if (hours > 0) {
    return hours + 'h ' + (minutes % 60) + 'm';
  }
  if (minutes > 0) {
    return minutes + 'm ' + (seconds % 60) + 's';
  }
  return seconds + 's';
}

/**
 * Create search attributes for workflow visibility
 *
 * @param {Object} attributes - Custom search attributes
 * @returns {Object} Search attributes configuration
 */
function createSearchAttributes(attributes) {
  return {
    searchAttributes: attributes,
  };
}

/**
 * Helper to create a workflow ID with a prefix and timestamp
 *
 * @param {string} prefix - Workflow ID prefix
 * @param {string} identifier - Unique identifier (e.g., invoice ID, user ID)
 * @returns {string} Workflow ID
 */
function createWorkflowId(prefix, identifier) {
  const timestamp = Date.now();
  return prefix + '-' + identifier + '-' + timestamp;
}

/**
 * Helper to create a unique workflow ID without timestamp (idempotent)
 * Useful when you want to ensure only one workflow exists for a given entity
 *
 * @param {string} prefix - Workflow ID prefix
 * @param {string} identifier - Unique identifier
 * @returns {string} Workflow ID
 */
function createIdempotentWorkflowId(prefix, identifier) {
  return prefix + '-' + identifier;
}

/**
 * Validate workflow parameters
 *
 * @param {Object} params - Parameters to validate
 * @param {string[]} requiredFields - List of required field names
 * @throws {Error} If validation fails
 */
function validateWorkflowParams(params, requiredFields) {
  const missingFields = requiredFields.filter(field => {
    const value = params[field];
    return value === undefined || value === null || value === '';
  });

  if (missingFields.length > 0) {
    throw new Error('Missing required workflow parameters: ' + missingFields.join(', '));
  }
}

/**
 * Create memo for workflow metadata
 * Memos are immutable metadata attached to workflows
 *
 * @param {Object} metadata - Metadata to attach
 * @returns {Object} Memo configuration
 */
function createMemo(metadata) {
  return {
    memo: metadata,
  };
}

module.exports = {
  // Retry policies
  createRetryPolicy,
  createCriticalRetryPolicy,
  createExternalApiRetryPolicy,
  createDatabaseRetryPolicy,

  // Activity options
  defaultActivityOptions,
  quickActivityOptions,
  longRunningActivityOptions,
  externalApiActivityOptions,
  databaseActivityOptions,

  // Workflow configuration
  createWorkflowTimeouts,
  createCronSchedule,
  createSearchAttributes,
  createMemo,

  // Workflow ID helpers
  createWorkflowId,
  createIdempotentWorkflowId,

  // Utilities
  parseDuration,
  formatDuration,
  validateWorkflowParams,
};
