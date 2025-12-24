/**
 * Bull Queue Configuration
 *
 * Centralized queue factory with Redis connection,
 * default job options, event handlers, and graceful shutdown.
 *
 * OPTIMIZED: Shared Redis connections to prevent memory exhaustion
 */

const Queue = require('bull');
const Redis = require('ioredis');
const logger = require('../utils/logger');

// Store all queue instances for cleanup
const queues = new Map();

// Dead Letter Queue instance
let deadLetterQueue = null;

// Shared Redis clients for all queues (prevents connection explosion)
let sharedClient = null;
let sharedSubscriber = null;

/**
 * Check if Redis is properly configured
 */
const isRedisConfigured = () => {
  // Allow disabling queues entirely via environment variable
  // Set DISABLE_QUEUES=true to save Redis requests on free tier
  if (process.env.DISABLE_QUEUES === 'true') {
    logger.warn('⚠️  DISABLE_QUEUES=true - queues will run in mock mode to save Redis requests');
    return false;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    logger.warn('⚠️  REDIS_URL not set - queues will be disabled');
    return false;
  }
  // Check for valid Redis URL format (redis:// or rediss://)
  if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
    logger.warn('⚠️  REDIS_URL is invalid (must start with redis:// or rediss://) - queues will be disabled');
    return false;
  }
  return true;
};

// Flag to track if Redis is available
let redisAvailable = isRedisConfigured();

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
    age: 3600, // Keep completed jobs for 1 hour (reduced from 24h)
    count: 100 // Keep last 100 completed jobs (reduced from 1000)
  },
  removeOnFail: {
    age: 86400, // Keep failed jobs for 24 hours (reduced from 48h)
    count: 50 // Keep last 50 failed jobs
  }
};

/**
 * Queue configuration settings
 * OPTIMIZED FOR UPSTASH FREE TIER (500k requests/month)
 *
 * Math for 6 queues:
 * - guardInterval: 5min = 6 queues × 12/hr × 24hr × 30days = 51,840/month
 * - stalledInterval: 15min = 6 queues × 4/hr × 24hr × 30days = 17,280/month
 * - Total queue overhead: ~70k requests/month (14% of limit)
 *
 * This leaves ~430k requests/month for actual cache + job operations
 * At 100 users doing 50 actions/day = 150k requests/month
 * Comfortable headroom for growth!
 */
const queueSettings = {
  lockDuration: 120000,       // 2 min (jobs can take time)
  lockRenewTime: 60000,       // 1 min
  stalledInterval: 900000,    // 15 minutes - check for stuck jobs
  maxStalledCount: 2,
  guardInterval: 300000,      // 5 minutes - health check interval
  retryProcessDelay: 60000,   // 1 min before retry
  drainDelay: 5,
  defaultJobOptions
};

/**
 * Create shared Redis client with connection limits
 */
const createRedisClient = (type = 'client') => {
  if (!redisAvailable) {
    return null;
  }

  const redisUrl = process.env.REDIS_URL;

  const options = {
    maxRetriesPerRequest: null, // Bull handles retries
    enableReadyCheck: false,
    enableOfflineQueue: true,
    connectTimeout: 10000,
    // Limit reconnection attempts to prevent memory exhaustion
    retryStrategy: (times) => {
      if (times > 10) {
        logger.error(`Redis ${type}: Max retries (10) reached, stopping reconnection`);
        redisAvailable = false;
        return null; // Stop retrying
      }
      const delay = Math.min(times * 500, 5000);
      return delay;
    },
    // Connection pool settings
    lazyConnect: false,
  };

  const client = new Redis(redisUrl, options);

  client.on('error', (err) => {
    // Only log once per error type to reduce log spam
    if (!client._lastErrorMsg || client._lastErrorMsg !== err.message) {
      client._lastErrorMsg = err.message;
      logger.error(`Redis ${type} error:`, err.message);
    }
  });

  client.on('connect', () => {
    logger.info(`Redis ${type}: Connected`);
  });

  return client;
};

/**
 * Get shared Redis clients for Bull queues
 * This prevents creating 3 connections per queue (18+ connections total)
 */
const getSharedRedisClients = () => {
  if (!sharedClient) {
    sharedClient = createRedisClient('client');
  }
  if (!sharedSubscriber) {
    sharedSubscriber = createRedisClient('subscriber');
  }
  return {
    client: sharedClient,
    subscriber: sharedSubscriber
  };
};

/**
 * Create Redis connection options for Bull (uses shared clients)
 */
const getRedisOptions = () => {
  const { client, subscriber } = getSharedRedisClients();

  return {
    createClient: (type) => {
      switch (type) {
        case 'client':
          return client;
        case 'subscriber':
          return subscriber;
        case 'bclient':
          // bclient needs its own connection for blocking commands
          return createRedisClient('bclient');
        default:
          return client;
      }
    }
  };
};

/**
 * Create a mock queue for when Redis is not available
 * This allows the app to run without Redis, just without queue functionality
 */
const createMockQueue = (name) => {
  logger.warn(`⚠️  Queue "${name}" created in MOCK mode (Redis not available)`);
  return {
    name,
    add: async (data, opts) => {
      logger.warn(`⚠️  Queue "${name}": Job not added (Redis not available)`);
      return { id: `mock-${Date.now()}`, data, opts };
    },
    addBulk: async (jobs) => {
      logger.warn(`⚠️  Queue "${name}": Bulk jobs not added (Redis not available)`);
      return jobs.map((j, i) => ({ id: `mock-${Date.now()}-${i}`, ...j }));
    },
    process: () => {},
    on: () => {},
    close: async () => {},
    pause: async () => {},
    resume: async () => {},
    getJob: async () => null,
    getJobs: async () => [],
    getJobCounts: async () => ({ waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }),
    getWaitingCount: async () => 0,
    getActiveCount: async () => 0,
    getCompletedCount: async () => 0,
    getFailedCount: async () => 0,
    getDelayedCount: async () => 0,
    isPaused: async () => false,
    empty: async () => {},
    clean: async () => []
  };
};

/**
 * Create a new queue instance with event handlers
 * @param {string} name - Queue name
 * @param {Object} options - Additional queue options
 * @returns {Queue} Bull queue instance or mock queue
 */
const createQueue = (name, options = {}) => {
  // Return existing queue if already created
  if (queues.has(name)) {
    return queues.get(name);
  }

  // If Redis is not available, return a mock queue
  if (!redisAvailable) {
    const mockQueue = createMockQueue(name);
    queues.set(name, mockQueue);
    return mockQueue;
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

  // Only log in development or for important events
  const isProduction = process.env.NODE_ENV === 'production';

  // Event: Job completed successfully (only log in dev)
  queue.on('completed', (job, result) => {
    if (!isProduction) {
      logger.info(`✅ Job ${job.id} in queue "${name}" completed`);
    }
  });

  // Event: Job failed (always log failures)
  queue.on('failed', async (job, err) => {
    logger.error(`❌ Job ${job.id} in queue "${name}" failed:`, err.message);
    if (!isProduction && job.stacktrace && job.stacktrace.length > 0) {
      logger.error(`   Stack:`, job.stacktrace[0]);
    }

    // Move to Dead Letter Queue if all retries exhausted
    const maxAttempts = job.opts?.attempts || defaultJobOptions.attempts || 3;
    if (job.attemptsMade >= maxAttempts) {
      try {
        // Import inline to avoid circular dependency
        const dlq = getDeadLetterQueue();
        await dlq.add({
          originalQueue: name,
          originalJobId: job.id,
          jobData: job.data,
          error: err.message,
          stack: err.stack,
          failedAt: new Date().toISOString(),
          attempts: job.attemptsMade,
          opts: {
            priority: job.opts?.priority,
            delay: job.opts?.delay
          }
        }, {
          jobId: `dlq-${name}-${job.id}-${Date.now()}`,
          priority: 1
        });
        logger.warn(`📤 Job ${job.id} from "${name}" moved to Dead Letter Queue after ${job.attemptsMade} attempts`);
      } catch (dlqError) {
        logger.error(`Failed to move job to DLQ:`, dlqError.message);
      }
    }
  });

  // Event: Job stalled (always log - indicates worker issues)
  queue.on('stalled', (job) => {
    logger.warn(`⚠️  Job ${job.id} in queue "${name}" has stalled`);
  });

  // Verbose events - only in development
  if (!isProduction) {
    queue.on('waiting', (jobId) => {
      logger.info(`⏳ Job ${jobId} in queue "${name}" is waiting`);
    });

    queue.on('active', (job) => {
      logger.info(`🔄 Job ${job.id} in queue "${name}" is now active`);
    });

    queue.on('cleaned', (jobs, type) => {
      logger.info(`🧹 Queue "${name}" cleaned ${jobs.length} ${type} jobs`);
    });
  }

  // Event: Queue error - always log but deduplicate
  let lastErrorTime = 0;
  queue.on('error', (error) => {
    const now = Date.now();
    // Only log once per 5 seconds per queue to prevent log spam
    if (now - lastErrorTime > 5000) {
      lastErrorTime = now;
      logger.error(`💥 Queue "${name}" error:`, error.message);
    }
  });

  // Store queue instance
  queues.set(name, queue);

  logger.info(`📦 Queue "${name}" created`);
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
    logger.info(`🔒 Queue "${name}" closed`);
  }
};

/**
 * Graceful shutdown - close all queues and shared Redis connections
 */
const closeAllQueues = async () => {
  logger.info('🛑 Closing all queues...');

  const closePromises = [];
  for (const [name, queue] of queues.entries()) {
    closePromises.push(
      (async () => {
        try {
          await queue.close();
          logger.info(`   ✓ Queue "${name}" closed`);
        } catch (err) {
          logger.error(`   ✗ Error closing queue "${name}":`, err.message);
        }
      })()
    );
  }

  await Promise.all(closePromises);
  queues.clear();

  // Close shared Redis connections
  if (sharedClient) {
    try {
      await sharedClient.quit();
      sharedClient = null;
      logger.info('   ✓ Shared Redis client closed');
    } catch (err) {
      logger.error('   ✗ Error closing shared Redis client:', err.message);
    }
  }

  if (sharedSubscriber) {
    try {
      await sharedSubscriber.quit();
      sharedSubscriber = null;
      logger.info('   ✓ Shared Redis subscriber closed');
    } catch (err) {
      logger.error('   ✗ Error closing shared Redis subscriber:', err.message);
    }
  }

  logger.info('✅ All queues closed');
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
    logger.info(`🧹 Cleaned ${jobs.length} ${type} jobs from queue "${name}"`);
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
    logger.info(`⏸️  Queue "${name}" paused`);
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
    logger.info(`▶️  Queue "${name}" resumed`);
    return true;
  }
  return false;
};

/**
 * Get or create the Dead Letter Queue
 * The DLQ captures jobs that have failed all retry attempts
 * @returns {Queue} Dead Letter Queue instance
 */
const getDeadLetterQueue = () => {
  if (!redisAvailable) {
    return createMockQueue('dead-letter');
  }

  if (!deadLetterQueue) {
    deadLetterQueue = new Queue('dead-letter', {
      ...getRedisOptions(),
      settings: {
        ...queueSettings,
        // DLQ specific settings - keep failed jobs longer for analysis
        stalledInterval: 3600000, // 1 hour
        guardInterval: 600000 // 10 minutes
      },
      defaultJobOptions: {
        attempts: 1, // Don't retry DLQ jobs
        removeOnComplete: {
          age: 604800, // Keep for 7 days
          count: 1000
        },
        removeOnFail: {
          age: 2592000, // Keep for 30 days
          count: 500
        }
      }
    });

    // Log DLQ events
    deadLetterQueue.on('completed', (job) => {
      logger.info(`🗄️ DLQ job ${job.id} processed`, {
        originalQueue: job.data.originalQueue,
        originalJobId: job.data.originalJobId
      });
    });

    deadLetterQueue.on('error', (error) => {
      logger.error('💥 Dead Letter Queue error:', error.message);
    });

    // Process DLQ jobs (alert admins about critical failures)
    deadLetterQueue.process(async (job) => {
      const { originalQueue, originalJobId, error, failedAt, attempts, data } = job.data;

      logger.error('📥 Job moved to Dead Letter Queue', {
        originalQueue,
        originalJobId,
        error,
        failedAt,
        attempts,
        dataKeys: data ? Object.keys(data) : []
      });

      // Here you could add:
      // - Admin email notification
      // - Slack/Discord webhook
      // - Metrics tracking
      // - Automatic retry scheduling for later

      return { processed: true, alertSent: false };
    });

    logger.info('🗄️ Dead Letter Queue initialized');
  }

  return deadLetterQueue;
};

/**
 * Move failed job to Dead Letter Queue
 * @param {Object} job - Failed Bull job
 * @param {Error} error - Error that caused the failure
 * @param {string} queueName - Original queue name
 */
const moveToDeadLetter = async (job, error, queueName) => {
  const dlq = getDeadLetterQueue();

  await dlq.add({
    originalQueue: queueName,
    originalJobId: job.id,
    jobData: job.data,
    error: error.message,
    stack: error.stack,
    failedAt: new Date().toISOString(),
    attempts: job.attemptsMade,
    opts: {
      priority: job.opts?.priority,
      delay: job.opts?.delay
    }
  }, {
    jobId: `dlq-${queueName}-${job.id}`,
    priority: 1 // High priority in DLQ
  });

  logger.warn(`📤 Job ${job.id} from "${queueName}" moved to Dead Letter Queue`);
};

/**
 * Get Dead Letter Queue metrics
 */
const getDLQMetrics = async () => {
  const dlq = getDeadLetterQueue();
  if (!dlq || !dlq.getJobCounts) {
    return { waiting: 0, active: 0, completed: 0, failed: 0 };
  }

  return dlq.getJobCounts();
};

/**
 * Get failed jobs from Dead Letter Queue
 * @param {number} start - Start index
 * @param {number} end - End index
 */
const getDLQJobs = async (start = 0, end = 100) => {
  const dlq = getDeadLetterQueue();
  if (!dlq || !dlq.getJobs) {
    return [];
  }

  const jobs = await dlq.getJobs(['waiting', 'active', 'completed'], start, end);
  return jobs.map(job => ({
    id: job.id,
    originalQueue: job.data.originalQueue,
    originalJobId: job.data.originalJobId,
    error: job.data.error,
    failedAt: job.data.failedAt,
    attempts: job.data.attempts,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn
  }));
};

/**
 * Retry a job from Dead Letter Queue
 * @param {string} dlqJobId - DLQ job ID
 */
const retryDLQJob = async (dlqJobId) => {
  const dlq = getDeadLetterQueue();
  const dlqJob = await dlq.getJob(dlqJobId);

  if (!dlqJob) {
    throw new Error('DLQ job not found');
  }

  const { originalQueue, jobData, opts } = dlqJob.data;
  const originalQ = getQueue(originalQueue);

  if (!originalQ) {
    throw new Error(`Original queue "${originalQueue}" not found`);
  }

  // Re-add job to original queue
  const newJob = await originalQ.add(jobData, {
    ...opts,
    attempts: 3, // Reset attempts
    removeOnComplete: true
  });

  // Remove from DLQ
  await dlqJob.remove();

  logger.info(`🔄 DLQ job ${dlqJobId} retried as job ${newJob.id} in "${originalQueue}"`);

  return newJob;
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
  logger.info('SIGTERM signal received: closing queues');
  await closeAllQueues();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing queues');
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
  defaultJobOptions,
  // Dead Letter Queue functions
  getDeadLetterQueue,
  moveToDeadLetter,
  getDLQMetrics,
  getDLQJobs,
  retryDLQJob
};
