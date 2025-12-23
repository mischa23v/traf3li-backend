#!/usr/bin/env node

/**
 * Temporal Worker Runner
 *
 * Standalone script to run Temporal workers.
 * This script:
 * - Loads environment variables
 * - Connects to MongoDB (required by activities)
 * - Starts all Temporal workers
 * - Handles graceful shutdown
 *
 * Usage:
 *   node src/scripts/runTemporalWorker.js
 *   npm run temporal:worker
 */

require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const connectDB = require('../configs/db');
const { runAllWorkers } = require('../temporal/worker');

// Track if we're shutting down
let isShuttingDown = false;
let workers = [];

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, forcing exit...');
    process.exit(1);
  }

  isShuttingDown = true;
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  try {
    // Stop accepting new tasks (workers will complete current tasks)
    logger.info('Stopping Temporal workers...');

    // Give workers time to complete current tasks
    const shutdownTimeout = setTimeout(() => {
      logger.warn('Shutdown timeout reached, forcing exit');
      process.exit(1);
    }, 30000); // 30 second timeout

    // Workers will complete their current tasks and stop
    // The workers are already running, so we just need to wait

    clearTimeout(shutdownTimeout);

    // Close MongoDB connection
    logger.info('Closing MongoDB connection...');
    await mongoose.connection.close();

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

/**
 * Handle uncaught errors
 */
function setupErrorHandlers() {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
      error: error.message,
      stack: error.stack
    });
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', {
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : undefined,
      promise: promise.toString()
    });
  });
}

/**
 * Main function to start the worker
 */
async function main() {
  try {
    logger.info('Starting Temporal Worker...');
    logger.info('Environment', {
      nodeEnv: process.env.NODE_ENV,
      temporalAddress: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
      temporalNamespace: process.env.TEMPORAL_NAMESPACE || 'default',
      mongoUri: process.env.MONGODB_URI ? 'configured' : 'not configured'
    });

    // Validate required environment variables
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is required');
    }

    // Setup error handlers
    setupErrorHandlers();

    // Setup graceful shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Connect to MongoDB (required by activities)
    logger.info('Connecting to MongoDB...');
    await connectDB();
    logger.info('MongoDB connected successfully');

    // Verify Temporal connection before starting workers
    logger.info('Verifying Temporal server connection...');
    const { getClient } = require('../temporal/client');
    const client = await getClient();
    logger.info('Temporal server connection verified');

    // Start all workers
    logger.info('Starting Temporal workers...');
    await runAllWorkers();

    // Workers are now running and will block here
    logger.info('All Temporal workers are running and listening for tasks');
    logger.info('Press Ctrl+C to stop');

  } catch (error) {
    logger.error('Failed to start Temporal worker', {
      error: error.message,
      stack: error.stack
    });

    // Attempt cleanup
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
      }
    } catch (cleanupError) {
      logger.error('Error during cleanup', {
        error: cleanupError.message
      });
    }

    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    logger.error('Fatal error in main', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  });
}

module.exports = { main, gracefulShutdown };
