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

// Store all queue instances for cleanup
const queues = new Map();

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
    console.warn('⚠️  DISABLE_QUEUES=true - queues will run in mock mode to save Redis requests');
    return false;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn('⚠️  REDIS_URL not set - queues will be disabled');
    return false;
  }
  // Check for valid Redis URL format (redis:// or rediss://)
  if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
    console.warn('⚠️  REDIS_URL is invalid (must start with redis:// or rediss://) - queues will be disabled');
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
        console.error(`Redis ${type}: Max retries (10) reached, stopping reconnection`);
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
      console.error(`Redis ${type} error:`, err.message);
    }
  });

  client.on('connect', () => {
    console.log(`Redis ${type}: Connected`);
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
  console.warn(`⚠️  Queue "${name}" created in MOCK mode (Redis not available)`);
  return {
    name,
    add: async (data, opts) => {
      console.warn(`⚠️  Queue "${name}": Job not added (Redis not available)`);
      return { id: `mock-${Date.now()}`, data, opts };
    },
    addBulk: async (jobs) => {
      console.warn(`⚠️  Queue "${name}": Bulk jobs not added (Redis not available)`);
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
      console.log(`✅ Job ${job.id} in queue "${name}" completed`);
    }
  });

  // Event: Job failed (always log failures)
  queue.on('failed', (job, err) => {
    console.error(`❌ Job ${job.id} in queue "${name}" failed:`, err.message);
    if (!isProduction && job.stacktrace && job.stacktrace.length > 0) {
      console.error(`   Stack:`, job.stacktrace[0]);
    }
  });

  // Event: Job stalled (always log - indicates worker issues)
  queue.on('stalled', (job) => {
    console.warn(`⚠️  Job ${job.id} in queue "${name}" has stalled`);
  });

  // Verbose events - only in development
  if (!isProduction) {
    queue.on('waiting', (jobId) => {
      console.log(`⏳ Job ${jobId} in queue "${name}" is waiting`);
    });

    queue.on('active', (job) => {
      console.log(`🔄 Job ${job.id} in queue "${name}" is now active`);
    });

    queue.on('cleaned', (jobs, type) => {
      console.log(`🧹 Queue "${name}" cleaned ${jobs.length} ${type} jobs`);
    });
  }

  // Event: Queue error - always log but deduplicate
  let lastErrorTime = 0;
  queue.on('error', (error) => {
    const now = Date.now();
    // Only log once per 5 seconds per queue to prevent log spam
    if (now - lastErrorTime > 5000) {
      lastErrorTime = now;
      console.error(`💥 Queue "${name}" error:`, error.message);
    }
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
 * Graceful shutdown - close all queues and shared Redis connections
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

  // Close shared Redis connections
  if (sharedClient) {
    try {
      await sharedClient.quit();
      sharedClient = null;
      console.log('   ✓ Shared Redis client closed');
    } catch (err) {
      console.error('   ✗ Error closing shared Redis client:', err.message);
    }
  }

  if (sharedSubscriber) {
    try {
      await sharedSubscriber.quit();
      sharedSubscriber = null;
      console.log('   ✓ Shared Redis subscriber closed');
    } catch (err) {
      console.error('   ✗ Error closing shared Redis subscriber:', err.message);
    }
  }

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
