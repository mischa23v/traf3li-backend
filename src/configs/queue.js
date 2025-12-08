/**
 * Bull Queue Configuration
 *
 * Centralized queue factory with Redis connection,
 * default job options, event handlers, and graceful shutdown.
 */

const Queue = require('bull');
const { getRedisClient } = require('./redis');

// Store all queue instances for cleanup
const queues = new Map();

/**
 * Default job options for all queues
 */
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  },
  removeOnComplete: {
    age: 86400, // Keep completed jobs for 24 hours
    count: 1000 // Keep last 1000 completed jobs
  },
  removeOnFail: {
    age: 172800, // Keep failed jobs for 48 hours
  }
};

/**
 * Queue configuration settings
 */
const queueSettings = {
  lockDuration: 30000,
  lockRenewTime: 15000,
  stalledInterval: 30000,
  maxStalledCount: 2,
  guardInterval: 5000,
  retryProcessDelay: 5000,
  drainDelay: 5,
  defaultJobOptions
};

/**
 * Create Redis connection options for Bull
 */
const getRedisOptions = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redisPassword = process.env.REDIS_PASSWORD || null;

  const options = {
    maxRetriesPerRequest: null, // Bull handles retries
    enableReadyCheck: false,
    enableOfflineQueue: true,
  };

  if (redisPassword) {
    options.password = redisPassword;
  }

  return {
    redis: redisUrl,
    ...options
  };
};

/**
 * Create a new queue instance with event handlers
 * @param {string} name - Queue name
 * @param {Object} options - Additional queue options
 * @returns {Queue} Bull queue instance
 */
const createQueue = (name, options = {}) => {
  // Return existing queue if already created
  if (queues.has(name)) {
    return queues.get(name);
  }

  // Create new queue
  const queue = new Queue(name, {
    ...getRedisOptions(),
    settings: {
      ...queueSettings,
      ...options.settings
    },
    defaultJobOptions: {
      ...defaultJobOptions,
      ...options.defaultJobOptions
    }
  });

  // Event: Job completed successfully
  queue.on('completed', (job, result) => {
    console.log(`✅ Job ${job.id} in queue "${name}" completed`);
    if (result) {
      console.log(`   Result:`, JSON.stringify(result).substring(0, 100));
    }
  });

  // Event: Job failed
  queue.on('failed', (job, err) => {
    console.error(`❌ Job ${job.id} in queue "${name}" failed:`, err.message);
    console.error(`   Attempts: ${job.attemptsMade}/${job.opts.attempts}`);
    if (job.stacktrace && job.stacktrace.length > 0) {
      console.error(`   Last error:`, job.stacktrace[0]);
    }
  });

  // Event: Job stalled (worker crashed or took too long)
  queue.on('stalled', (job) => {
    console.warn(`⚠️  Job ${job.id} in queue "${name}" has stalled`);
    console.warn(`   Stalled count: ${job.opts.maxStalledCount || 'N/A'}`);
  });

  // Event: Job is waiting to be processed
  queue.on('waiting', (jobId) => {
    console.log(`⏳ Job ${jobId} in queue "${name}" is waiting`);
  });

  // Event: Job is now active (being processed)
  queue.on('active', (job, jobPromise) => {
    console.log(`🔄 Job ${job.id} in queue "${name}" is now active`);
  });

  // Event: Job progress updated
  queue.on('progress', (job, progress) => {
    console.log(`📊 Job ${job.id} progress: ${progress}%`);
  });

  // Event: Job removed
  queue.on('removed', (job) => {
    console.log(`🗑️  Job ${job.id} in queue "${name}" was removed`);
  });

  // Event: Queue cleaned (old jobs removed)
  queue.on('cleaned', (jobs, type) => {
    console.log(`🧹 Queue "${name}" cleaned ${jobs.length} ${type} jobs`);
  });

  // Event: Queue drained (all waiting jobs processed)
  queue.on('drained', () => {
    console.log(`✨ Queue "${name}" has been drained`);
  });

  // Event: Queue paused
  queue.on('paused', () => {
    console.log(`⏸️  Queue "${name}" has been paused`);
  });

  // Event: Queue resumed
  queue.on('resumed', () => {
    console.log(`▶️  Queue "${name}" has been resumed`);
  });

  // Event: Queue error
  queue.on('error', (error) => {
    console.error(`💥 Queue "${name}" error:`, error.message);
  });

  // Store queue instance
  queues.set(name, queue);

  console.log(`📦 Queue "${name}" created`);
  return queue;
};

/**
 * Get existing queue instance
 * @param {string} name - Queue name
 * @returns {Queue|null} Queue instance or null if not found
 */
const getQueue = (name) => {
  return queues.get(name) || null;
};

/**
 * Get all queue instances
 * @returns {Map} Map of all queues
 */
const getAllQueues = () => {
  return queues;
};

/**
 * Close a specific queue
 * @param {string} name - Queue name
 */
const closeQueue = async (name) => {
  const queue = queues.get(name);
  if (queue) {
    await queue.close();
    queues.delete(name);
    console.log(`🔒 Queue "${name}" closed`);
  }
};

/**
 * Graceful shutdown - close all queues
 */
const closeAllQueues = async () => {
  console.log('🛑 Closing all queues...');

  const closePromises = [];
  for (const [name, queue] of queues.entries()) {
    closePromises.push(
      queue.close().then(() => {
        console.log(`   ✓ Queue "${name}" closed`);
      }).catch((err) => {
        console.error(`   ✗ Error closing queue "${name}":`, err.message);
      })
    );
  }

  await Promise.all(closePromises);
  queues.clear();
  console.log('✅ All queues closed');
};

/**
 * Clean old jobs from a queue
 * @param {string} name - Queue name
 * @param {number} grace - Grace period in milliseconds
 * @param {string} type - Job type ('completed', 'failed', 'delayed', 'active', 'wait')
 */
const cleanQueue = async (name, grace = 86400000, type = 'completed') => {
  const queue = queues.get(name);
  if (queue) {
    const jobs = await queue.clean(grace, type);
    console.log(`🧹 Cleaned ${jobs.length} ${type} jobs from queue "${name}"`);
    return jobs;
  }
  return [];
};

/**
 * Pause a queue
 * @param {string} name - Queue name
 */
const pauseQueue = async (name) => {
  const queue = queues.get(name);
  if (queue) {
    await queue.pause();
    console.log(`⏸️  Queue "${name}" paused`);
    return true;
  }
  return false;
};

/**
 * Resume a queue
 * @param {string} name - Queue name
 */
const resumeQueue = async (name) => {
  const queue = queues.get(name);
  if (queue) {
    await queue.resume();
    console.log(`▶️  Queue "${name}" resumed`);
    return true;
  }
  return false;
};

/**
 * Get queue metrics
 * @param {string} name - Queue name
 */
const getQueueMetrics = async (name) => {
  const queue = queues.get(name);
  if (!queue) {
    return null;
  }

  const [
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused
  ] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
    queue.isPaused()
  ]);

  return {
    name,
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused
  };
};

// Graceful shutdown on process termination
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing queues');
  await closeAllQueues();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing queues');
  await closeAllQueues();
  process.exit(0);
});

module.exports = {
  createQueue,
  getQueue,
  getAllQueues,
  closeQueue,
  closeAllQueues,
  cleanQueue,
  pauseQueue,
  resumeQueue,
  getQueueMetrics,
  defaultJobOptions
};
