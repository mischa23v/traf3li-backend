/**
 * Example Temporal Activities
 *
 * Activities are functions that perform side effects like:
 * - Database operations
 * - API calls
 * - Email sending
 * - File operations
 *
 * Activities can fail and be retried according to the retry policy.
 */

const logger = require('../../utils/logger');

/**
 * Example activity that performs some operation
 * @param {Object} params - Activity parameters
 * @param {string} params.userId - User ID
 * @param {string} params.action - Action to perform
 * @returns {Promise<Object>} Activity result
 */
async function exampleActivity({ userId, action }) {
  logger.info(`Executing example activity for user ${userId} with action ${action}`);

  try {
    // Simulate some work (e.g., database query, API call, etc.)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Perform the actual operation here
    const result = {
      processed: true,
      userId,
      action,
      timestamp: new Date().toISOString(),
    };

    logger.info(`Example activity completed successfully for user ${userId}`);
    return result;
  } catch (error) {
    logger.error(`Example activity failed for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Another example activity
 * @param {Object} params - Activity parameters
 * @param {string} params.userId - User ID
 * @param {Object} params.data - Data from previous step
 * @returns {Promise<Object>} Activity result
 */
async function anotherExampleActivity({ userId, data }) {
  logger.info(`Executing another example activity for user ${userId}`);

  try {
    // Simulate some work
    await new Promise((resolve) => setTimeout(resolve, 500));

    const result = {
      processed: true,
      userId,
      previousData: data,
      additionalInfo: 'Additional processing completed',
      timestamp: new Date().toISOString(),
    };

    logger.info(`Another example activity completed successfully for user ${userId}`);
    return result;
  } catch (error) {
    logger.error(`Another example activity failed for user ${userId}:`, error);
    throw error;
  }
}

module.exports = {
  exampleActivity,
  anotherExampleActivity,
};
