/**
 * Redis Configuration
 *
 * Singleton Redis client using ioredis.
 * Used for idempotency keys, caching, and session storage.
 */

const Redis = require("ioredis");
const logger = require("../utils/logger");

let redisClient = null;
let isConnected = false;

/**
 * Create Redis client with connection handling
 */
const createRedisClient = () => {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const redisPassword = process.env.REDIS_PASSWORD || null;

  const options = {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 10) {
        logger.error("Redis: Max retries reached, giving up");
        return null;
      }
      const delay = Math.min(times * 100, 3000);
      logger.info(`Redis: Retry attempt ${times}, waiting ${delay}ms`);
      return delay;
    },
    reconnectOnError: (err) => {
      const targetError = "READONLY";
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },
    enableOfflineQueue: true,
    connectTimeout: 10000,
    lazyConnect: true
  };

  if (redisPassword) {
    options.password = redisPassword;
  }

  const client = new Redis(redisUrl, options);

  // Connection event handlers
  client.on("connect", () => {
    logger.info("Redis: Connecting...");
  });

  client.on("ready", () => {
    isConnected = true;
    logger.info("Redis: Connected and ready");
  });

  client.on("error", (err) => {
    logger.error("Redis: Error:", err.message);
  });

  client.on("close", () => {
    isConnected = false;
    logger.info("Redis: Connection closed");
  });

  client.on("reconnecting", () => {
    logger.info("Redis: Reconnecting...");
  });

  client.on("end", () => {
    isConnected = false;
    logger.info("Redis: Connection ended");
  });

  return client;
};

/**
 * Get singleton Redis client
 */
const getRedisClient = () => {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
};

/**
 * Connect to Redis
 */
const connectRedis = async () => {
  const client = getRedisClient();
  if (!isConnected) {
    try {
      await client.connect();
    } catch (error) {
      // Already connected or connecting
      if (!error.message.includes("already")) {
        throw error;
      }
    }
  }
  return client;
};

/**
 * Disconnect from Redis
 */
const disconnectRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
    logger.info("Redis: Disconnected");
  }
};

/**
 * Check if Redis is connected
 */
const isRedisConnected = () => {
  return isConnected;
};

/**
 * Health check for Redis connection
 * @returns {Promise<Object>} Health status
 */
const healthCheck = async () => {
  try {
    const client = getRedisClient();
    const pingResult = await client.ping();
    return {
      status: "healthy",
      connected: isConnected,
      ping: pingResult === "PONG"
    };
  } catch (error) {
    return {
      status: "unhealthy",
      connected: false,
      error: error.message
    };
  }
};

/**
 * Graceful shutdown - close connections properly
 */
const gracefulShutdown = async () => {
  logger.info("Redis: Initiating graceful shutdown...");
  try {
    await disconnectRedis();
    logger.info("Redis: Graceful shutdown completed");
  } catch (error) {
    logger.error("Redis: Error during graceful shutdown:", error.message);
    throw error;
  }
};

/**
 * Set value with expiry
 * @param {string} key - Key
 * @param {string} value - Value (will be JSON stringified if object)
 * @param {number} ttlSeconds - Time to live in seconds
 */
const setWithExpiry = async (key, value, ttlSeconds = 86400) => {
  const client = getRedisClient();
  const stringValue = typeof value === "object" ? JSON.stringify(value) : value;
  await client.setex(key, ttlSeconds, stringValue);
};

/**
 * Get value
 * @param {string} key - Key
 * @param {boolean} parseJson - Whether to parse JSON
 */
const getValue = async (key, parseJson = true) => {
  const client = getRedisClient();
  const value = await client.get(key);
  if (!value) return null;
  if (parseJson) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};

/**
 * Delete key
 * @param {string} key - Key to delete
 */
const deleteKey = async (key) => {
  const client = getRedisClient();
  await client.del(key);
};

/**
 * Check if key exists
 * @param {string} key - Key to check
 */
const keyExists = async (key) => {
  const client = getRedisClient();
  const exists = await client.exists(key);
  return exists === 1;
};

/**
 * Set value only if not exists (for idempotency)
 * @param {string} key - Key
 * @param {string} value - Value
 * @param {number} ttlSeconds - TTL in seconds
 * @returns {boolean} - True if set, false if already exists
 */
const setIfNotExists = async (key, value, ttlSeconds = 86400) => {
  const client = getRedisClient();
  const stringValue = typeof value === "object" ? JSON.stringify(value) : value;
  const result = await client.set(key, stringValue, "EX", ttlSeconds, "NX");
  return result === "OK";
};

// Handle process termination
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

module.exports = {
  getRedisClient,
  connectRedis,
  disconnectRedis,
  isRedisConnected,
  healthCheck,
  gracefulShutdown,
  setWithExpiry,
  getValue,
  deleteKey,
  keyExists,
  setIfNotExists
};
