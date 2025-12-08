/**
 * Cache Service
 *
 * Provides high-level caching operations with JSON support, TTL management,
 * pattern-based deletion, and cache-aside patterns.
 */

const { getRedisClient } = require("../configs/redis");

/**
 * Get cached value
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} - Parsed value or null if not found
 */
const get = async (key) => {
  try {
    const client = getRedisClient();
    const value = await client.get(key);

    if (!value) {
      return null;
    }

    // Try to parse JSON, return raw string if parsing fails
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch (error) {
    console.error(`Cache.get error for key "${key}":`, error.message);
    return null;
  }
};

/**
 * Set cached value with TTL
 * @param {string} key - Cache key
 * @param {any} value - Value to cache (will be JSON stringified if object)
 * @param {number} ttlSeconds - Time to live in seconds (default: 300 = 5 minutes)
 * @returns {Promise<boolean>} - Success status
 */
const set = async (key, value, ttlSeconds = 300) => {
  try {
    const client = getRedisClient();
    const stringValue = typeof value === "object" ? JSON.stringify(value) : String(value);

    if (ttlSeconds > 0) {
      await client.setex(key, ttlSeconds, stringValue);
    } else {
      await client.set(key, stringValue);
    }

    return true;
  } catch (error) {
    console.error(`Cache.set error for key "${key}":`, error.message);
    return false;
  }
};

/**
 * Delete cached value
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} - Success status
 */
const del = async (key) => {
  try {
    const client = getRedisClient();
    await client.del(key);
    return true;
  } catch (error) {
    console.error(`Cache.del error for key "${key}":`, error.message);
    return false;
  }
};

/**
 * Delete keys matching a pattern
 * @param {string} pattern - Pattern to match (e.g., "user:*", "client:123:*")
 * @returns {Promise<number>} - Number of keys deleted
 */
const delPattern = async (pattern) => {
  try {
    const client = getRedisClient();
    let cursor = "0";
    let deletedCount = 0;

    do {
      // Scan with pattern
      const [newCursor, keys] = await client.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = newCursor;

      // Delete matched keys
      if (keys.length > 0) {
        const deleted = await client.del(...keys);
        deletedCount += deleted;
      }
    } while (cursor !== "0");

    console.log(`Cache.delPattern: Deleted ${deletedCount} keys matching "${pattern}"`);
    return deletedCount;
  } catch (error) {
    console.error(`Cache.delPattern error for pattern "${pattern}":`, error.message);
    return 0;
  }
};

/**
 * Cache-aside pattern: Get from cache or fetch and cache
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function to fetch data if not cached
 * @param {number} ttl - TTL in seconds (default: 300)
 * @returns {Promise<any>} - Cached or fetched data
 */
const getOrSet = async (key, fetchFn, ttl = 300) => {
  try {
    // Try to get from cache first
    const cached = await get(key);
    if (cached !== null) {
      return cached;
    }

    // Not in cache, fetch the data
    const data = await fetchFn();

    // Cache the result (even if null/empty to prevent cache stampede)
    if (data !== undefined) {
      await set(key, data, ttl);
    }

    return data;
  } catch (error) {
    console.error(`Cache.getOrSet error for key "${key}":`, error.message);
    // On error, attempt to fetch without caching
    try {
      return await fetchFn();
    } catch (fetchError) {
      console.error(`Cache.getOrSet fetchFn error for key "${key}":`, fetchError.message);
      throw fetchError;
    }
  }
};

/**
 * Invalidate cache by tags
 * @param {string[]} tags - Array of tag prefixes (e.g., ["client:123", "case:456"])
 * @returns {Promise<number>} - Total number of keys deleted
 */
const invalidateByTags = async (tags) => {
  try {
    let totalDeleted = 0;

    for (const tag of tags) {
      const pattern = `${tag}:*`;
      const deleted = await delPattern(pattern);
      totalDeleted += deleted;
    }

    console.log(`Cache.invalidateByTags: Deleted ${totalDeleted} keys for tags:`, tags);
    return totalDeleted;
  } catch (error) {
    console.error("Cache.invalidateByTags error:", error.message);
    return 0;
  }
};

/**
 * Decorator pattern: Wrap a function with caching
 * @param {string} key - Cache key
 * @param {Function} fn - Function to wrap
 * @param {number} ttl - TTL in seconds (default: 300)
 * @returns {Promise<any>} - Function result (cached or fresh)
 */
const wrap = async (key, fn, ttl = 300) => {
  return getOrSet(key, fn, ttl);
};

/**
 * Check if key exists in cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} - True if exists
 */
const exists = async (key) => {
  try {
    const client = getRedisClient();
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    console.error(`Cache.exists error for key "${key}":`, error.message);
    return false;
  }
};

/**
 * Get TTL (time to live) for a key
 * @param {string} key - Cache key
 * @returns {Promise<number>} - TTL in seconds, -1 if no expiry, -2 if key doesn't exist
 */
const ttl = async (key) => {
  try {
    const client = getRedisClient();
    return await client.ttl(key);
  } catch (error) {
    console.error(`Cache.ttl error for key "${key}":`, error.message);
    return -2;
  }
};

/**
 * Set multiple keys at once
 * @param {Object} entries - Object with key-value pairs
 * @param {number} ttlSeconds - TTL for all keys (default: 300)
 * @returns {Promise<boolean>} - Success status
 */
const setMultiple = async (entries, ttlSeconds = 300) => {
  try {
    const promises = Object.entries(entries).map(([key, value]) =>
      set(key, value, ttlSeconds)
    );
    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error("Cache.setMultiple error:", error.message);
    return false;
  }
};

/**
 * Get multiple keys at once
 * @param {string[]} keys - Array of cache keys
 * @returns {Promise<Object>} - Object with key-value pairs
 */
const getMultiple = async (keys) => {
  try {
    const promises = keys.map(key => get(key));
    const values = await Promise.all(promises);

    const result = {};
    keys.forEach((key, index) => {
      result[key] = values[index];
    });

    return result;
  } catch (error) {
    console.error("Cache.getMultiple error:", error.message);
    return {};
  }
};

/**
 * Increment a numeric value
 * @param {string} key - Cache key
 * @param {number} amount - Amount to increment (default: 1)
 * @returns {Promise<number>} - New value after increment
 */
const increment = async (key, amount = 1) => {
  try {
    const client = getRedisClient();
    return await client.incrby(key, amount);
  } catch (error) {
    console.error(`Cache.increment error for key "${key}":`, error.message);
    return 0;
  }
};

/**
 * Decrement a numeric value
 * @param {string} key - Cache key
 * @param {number} amount - Amount to decrement (default: 1)
 * @returns {Promise<number>} - New value after decrement
 */
const decrement = async (key, amount = 1) => {
  try {
    const client = getRedisClient();
    return await client.decrby(key, amount);
  } catch (error) {
    console.error(`Cache.decrement error for key "${key}":`, error.message);
    return 0;
  }
};

module.exports = {
  get,
  set,
  del,
  delPattern,
  getOrSet,
  invalidateByTags,
  wrap,
  exists,
  ttl,
  setMultiple,
  getMultiple,
  increment,
  decrement
};
