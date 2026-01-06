/**
 * Cache Service
 *
 * Provides high-level caching operations with JSON support, TTL management,
 * pattern-based deletion, and cache-aside patterns.
 *
 * OPTIMIZATION: Supports in-memory fallback when DISABLE_REDIS_CACHE=true
 * to avoid hitting Upstash free tier limits (500k requests/month)
 */

const { getRedisClient } = require("../configs/redis");
const logger = require('../utils/logger');

// In-memory cache for when Redis is disabled or unavailable
const memoryCache = new Map();
const memoryCacheExpiry = new Map();

// Check if Redis cache is disabled
const isRedisCacheDisabled = process.env.DISABLE_REDIS_CACHE === 'true';

// Cache hit rate metrics
const cacheMetrics = {
  hits: 0,
  misses: 0,
  errors: 0,
  lastReset: Date.now()
};

/**
 * Escape special regex characters to prevent ReDoS attacks
 */
const escapeRegex = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

if (isRedisCacheDisabled) {
  logger.warn('⚠️  DISABLE_REDIS_CACHE=true - using in-memory cache to save Redis requests');
}

/**
 * Clean expired entries from memory cache
 */
const cleanExpiredMemoryCache = () => {
  const now = Date.now();
  for (const [key, expiry] of memoryCacheExpiry.entries()) {
    if (expiry && expiry < now) {
      memoryCache.delete(key);
      memoryCacheExpiry.delete(key);
    }
  }
};

// Clean memory cache every 5 minutes
setInterval(cleanExpiredMemoryCache, 5 * 60 * 1000);

/**
 * Get cached value
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} - Parsed value or null if not found
 */
const get = async (key) => {
  // Use in-memory cache if Redis is disabled
  if (isRedisCacheDisabled) {
    const expiry = memoryCacheExpiry.get(key);
    if (expiry && expiry < Date.now()) {
      memoryCache.delete(key);
      memoryCacheExpiry.delete(key);
      cacheMetrics.misses++;
      return null;
    }
    const value = memoryCache.get(key);
    if (value !== undefined) {
      cacheMetrics.hits++;
      return value;
    }
    cacheMetrics.misses++;
    return null;
  }

  try {
    const client = getRedisClient();
    const value = await client.get(key);

    if (!value) {
      cacheMetrics.misses++;
      return null;
    }

    cacheMetrics.hits++;
    // Try to parse JSON, return raw string if parsing fails
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch (error) {
    logger.error(`Cache.get error for key "${key}":`, error.message);
    cacheMetrics.errors++;
    cacheMetrics.misses++;
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
  // Use in-memory cache if Redis is disabled
  if (isRedisCacheDisabled) {
    memoryCache.set(key, value);
    if (ttlSeconds > 0) {
      memoryCacheExpiry.set(key, Date.now() + ttlSeconds * 1000);
    }
    return true;
  }

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
    logger.error(`Cache.set error for key "${key}":`, error.message);
    return false;
  }
};

/**
 * Delete cached value
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} - Success status
 */
const del = async (key) => {
  // Use in-memory cache if Redis is disabled
  if (isRedisCacheDisabled) {
    memoryCache.delete(key);
    memoryCacheExpiry.delete(key);
    return true;
  }

  try {
    const client = getRedisClient();
    await client.del(key);
    return true;
  } catch (error) {
    logger.error(`Cache.del error for key "${key}":`, error.message);
    return false;
  }
};

/**
 * Delete keys matching a pattern
 * @param {string} pattern - Pattern to match (e.g., "user:*", "client:123:*")
 * @returns {Promise<number>} - Number of keys deleted
 */
const delPattern = async (pattern) => {
  // Use in-memory cache if Redis is disabled
  if (isRedisCacheDisabled) {
    let deletedCount = 0;
    const regexPattern = new RegExp('^' + escapeRegex(pattern).replace(/\\\*/g, '.*') + '$');
    for (const key of memoryCache.keys()) {
      if (regexPattern.test(key)) {
        memoryCache.delete(key);
        memoryCacheExpiry.delete(key);
        deletedCount++;
      }
    }
    return deletedCount;
  }

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

    logger.info(`Cache.delPattern: Deleted ${deletedCount} keys matching "${pattern}"`);
    return deletedCount;
  } catch (error) {
    logger.error(`Cache.delPattern error for pattern "${pattern}":`, error.message);
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
    logger.error(`Cache.getOrSet error for key "${key}":`, error.message);
    // On error, attempt to fetch without caching
    try {
      return await fetchFn();
    } catch (fetchError) {
      logger.error(`Cache.getOrSet fetchFn error for key "${key}":`, fetchError.message);
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

    logger.info(`Cache.invalidateByTags: Deleted ${totalDeleted} keys for tags:`, tags);
    return totalDeleted;
  } catch (error) {
    logger.error("Cache.invalidateByTags error:", error.message);
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
  // Use in-memory cache if Redis is disabled
  if (isRedisCacheDisabled) {
    const expiry = memoryCacheExpiry.get(key);
    if (expiry && expiry < Date.now()) {
      memoryCache.delete(key);
      memoryCacheExpiry.delete(key);
      return false;
    }
    return memoryCache.has(key);
  }

  try {
    const client = getRedisClient();
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    logger.error(`Cache.exists error for key "${key}":`, error.message);
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
    logger.error(`Cache.ttl error for key "${key}":`, error.message);
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
    logger.error("Cache.setMultiple error:", error.message);
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
    logger.error("Cache.getMultiple error:", error.message);
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
    logger.error(`Cache.increment error for key "${key}":`, error.message);
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
    logger.error(`Cache.decrement error for key "${key}":`, error.message);
    return 0;
  }
};

/**
 * Get cache hit rate statistics
 * @returns {Object} - Cache statistics with hit rate
 */
const getStats = () => {
  const total = cacheMetrics.hits + cacheMetrics.misses;
  const hitRate = total > 0 ? (cacheMetrics.hits / total * 100).toFixed(2) : 0;
  const uptimeSeconds = Math.floor((Date.now() - cacheMetrics.lastReset) / 1000);

  return {
    hits: cacheMetrics.hits,
    misses: cacheMetrics.misses,
    errors: cacheMetrics.errors,
    total,
    hitRate: parseFloat(hitRate),
    hitRatePercent: `${hitRate}%`,
    uptimeSeconds,
    uptimeFormatted: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
    cacheType: isRedisCacheDisabled ? 'memory' : 'redis'
  };
};

/**
 * Reset cache statistics
 */
const resetStats = () => {
  cacheMetrics.hits = 0;
  cacheMetrics.misses = 0;
  cacheMetrics.errors = 0;
  cacheMetrics.lastReset = Date.now();
};

// ============================================
// TENANT-SCOPED CACHE KEY HELPERS
// ============================================

/**
 * Generate a tenant-scoped cache key
 * SECURITY: All tenant-specific data MUST use this helper or equivalent
 *
 * @param {Object} firmQuery - The req.firmQuery object { firmId } or { lawyerId }
 * @param {string} namespace - Cache namespace (e.g., 'settings', 'appointments')
 * @param {string} identifier - Additional identifier (e.g., resource ID, date range)
 * @returns {string|null} - Tenant-scoped cache key or null if no tenant context
 *
 * @example
 * // For firm: "firm:abc123:settings:crm"
 * // For solo lawyer: "lawyer:xyz789:settings:crm"
 * const key = makeTenantKey(req.firmQuery, 'settings', 'crm');
 */
const makeTenantKey = (firmQuery, namespace, identifier = '') => {
  if (!firmQuery) {
    logger.warn('Cache.makeTenantKey: No firmQuery provided');
    return null;
  }

  const identifierPart = identifier ? `:${identifier}` : '';

  if (firmQuery.firmId) {
    return `firm:${firmQuery.firmId}:${namespace}${identifierPart}`;
  }

  if (firmQuery.lawyerId) {
    return `lawyer:${firmQuery.lawyerId}:${namespace}${identifierPart}`;
  }

  logger.warn('Cache.makeTenantKey: firmQuery has neither firmId nor lawyerId');
  return null;
};

/**
 * Generate a pattern for invalidating all tenant cache keys
 * @param {Object} firmQuery - The req.firmQuery object
 * @param {string} namespace - Optional namespace to limit invalidation
 * @returns {string|null} - Pattern for delPattern or null
 *
 * @example
 * // Invalidate all firm cache: "firm:abc123:*"
 * // Invalidate firm settings cache: "firm:abc123:settings:*"
 */
const makeTenantPattern = (firmQuery, namespace = null) => {
  if (!firmQuery) return null;

  const namespacePart = namespace ? `:${namespace}:*` : ':*';

  if (firmQuery.firmId) {
    return `firm:${firmQuery.firmId}${namespacePart}`;
  }

  if (firmQuery.lawyerId) {
    return `lawyer:${firmQuery.lawyerId}${namespacePart}`;
  }

  return null;
};

/**
 * Tenant-scoped get
 * @param {Object} firmQuery - Tenant context
 * @param {string} namespace - Cache namespace
 * @param {string} identifier - Resource identifier
 */
const getTenant = async (firmQuery, namespace, identifier = '') => {
  const key = makeTenantKey(firmQuery, namespace, identifier);
  if (!key) return null;
  return get(key);
};

/**
 * Tenant-scoped set
 * @param {Object} firmQuery - Tenant context
 * @param {string} namespace - Cache namespace
 * @param {string} identifier - Resource identifier
 * @param {any} value - Value to cache
 * @param {number} ttlSeconds - TTL in seconds
 */
const setTenant = async (firmQuery, namespace, identifier, value, ttlSeconds = 300) => {
  const key = makeTenantKey(firmQuery, namespace, identifier);
  if (!key) return false;
  return set(key, value, ttlSeconds);
};

/**
 * Tenant-scoped delete
 * @param {Object} firmQuery - Tenant context
 * @param {string} namespace - Cache namespace
 * @param {string} identifier - Resource identifier
 */
const delTenant = async (firmQuery, namespace, identifier = '') => {
  const key = makeTenantKey(firmQuery, namespace, identifier);
  if (!key) return false;
  return del(key);
};

/**
 * Invalidate all cache for a tenant (or specific namespace)
 * @param {Object} firmQuery - Tenant context
 * @param {string} namespace - Optional namespace to limit invalidation
 */
const invalidateTenant = async (firmQuery, namespace = null) => {
  const pattern = makeTenantPattern(firmQuery, namespace);
  if (!pattern) return 0;
  return delPattern(pattern);
};

/**
 * Tenant-scoped getOrSet (cache-aside pattern)
 * @param {Object} firmQuery - Tenant context
 * @param {string} namespace - Cache namespace
 * @param {string} identifier - Resource identifier
 * @param {Function} fetchFn - Function to fetch data if not cached
 * @param {number} ttl - TTL in seconds
 */
const getOrSetTenant = async (firmQuery, namespace, identifier, fetchFn, ttl = 300) => {
  const key = makeTenantKey(firmQuery, namespace, identifier);
  if (!key) {
    // No tenant context, execute without caching
    return fetchFn();
  }
  return getOrSet(key, fetchFn, ttl);
};

module.exports = {
  // Core cache operations
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
  decrement,
  getStats,
  resetStats,

  // Tenant-scoped cache operations (SECURITY: Use these for multi-tenant data)
  makeTenantKey,
  makeTenantPattern,
  getTenant,
  setTenant,
  delTenant,
  invalidateTenant,
  getOrSetTenant
};
