/**
 * Cache Middleware
 *
 * Provides middleware functions for caching HTTP responses and invalidating cache.
 * Includes common cache key generators for various patterns.
 */

const cacheService = require("../services/cache.service");

/**
 * Cache key generators for common patterns
 */
const keyGenerators = {
  /**
   * Generate key based on URL and user/firm
   * Pattern: {prefix}:firm:{firmId}:user:{userId}:url:{url}
   */
  userFirmUrl: (req, prefix = "cache") => {
    const firmId = req.firmId || "none";
    const userId = req.userID || "guest";
    const url = req.originalUrl || req.url;
    return `${prefix}:firm:${firmId}:user:${userId}:url:${url}`;
  },

  /**
   * Generate key based on URL only
   * Pattern: {prefix}:url:{url}
   */
  url: (req, prefix = "cache") => {
    const url = req.originalUrl || req.url;
    return `${prefix}:url:${url}`;
  },

  /**
   * Generate key based on firm only
   * Pattern: {prefix}:firm:{firmId}:url:{url}
   */
  firmUrl: (req, prefix = "cache") => {
    const firmId = req.firmId || "none";
    const url = req.originalUrl || req.url;
    return `${prefix}:firm:${firmId}:url:${url}`;
  },

  /**
   * Generate key based on user only
   * Pattern: {prefix}:user:{userId}:url:{url}
   */
  userUrl: (req, prefix = "cache") => {
    const userId = req.userID || "guest";
    const url = req.originalUrl || req.url;
    return `${prefix}:user:${userId}:url:${url}`;
  },

  /**
   * Generate key for dashboard endpoints
   * Pattern: dashboard:firm:{firmId}:user:{userId}:{endpoint}
   */
  dashboard: (req, endpoint = "") => {
    const firmId = req.firmId || "none";
    const userId = req.userID || "guest";
    const endpointName = endpoint || req.path.split("/").pop() || "stats";
    return `dashboard:firm:${firmId}:user:${userId}:${endpointName}`;
  },

  /**
   * Generate key for client endpoints
   * Pattern: client:firm:{firmId}:{clientId?}:url:{url}
   */
  client: (req) => {
    const firmId = req.firmId || "none";
    const clientId = req.params.id || "list";
    const url = req.originalUrl || req.url;
    return `client:firm:${firmId}:${clientId}:url:${url}`;
  },

  /**
   * Generate key for case endpoints
   * Pattern: case:firm:{firmId}:{caseId?}:url:{url}
   */
  case: (req) => {
    const firmId = req.firmId || "none";
    const caseId = req.params._id || "list";
    const url = req.originalUrl || req.url;
    return `case:firm:${firmId}:${caseId}:url:${url}`;
  },

  /**
   * Custom key generator
   */
  custom: (keyFn) => keyFn
};

/**
 * Cache GET responses middleware
 * @param {number} ttl - Time to live in seconds
 * @param {Function|string} keyGenerator - Function to generate cache key or predefined generator name
 * @returns {Function} Express middleware
 */
const cacheResponse = (ttl = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    try {
      // Generate cache key
      let cacheKey;
      if (typeof keyGenerator === "function") {
        cacheKey = keyGenerator(req);
      } else if (typeof keyGenerator === "string" && keyGenerators[keyGenerator]) {
        cacheKey = keyGenerators[keyGenerator](req);
      } else {
        // Default: use userFirmUrl pattern
        cacheKey = keyGenerators.userFirmUrl(req);
      }

      // Try to get from cache
      const cachedData = await cacheService.get(cacheKey);

      if (cachedData !== null) {
        // Cache hit
        console.log(`Cache HIT: ${cacheKey}`);
        return res.json(cachedData);
      }

      // Cache miss - intercept response
      console.log(`Cache MISS: ${cacheKey}`);

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache the response
      res.json = function (data) {
        // Only cache successful responses (status < 400)
        if (res.statusCode < 400 && data) {
          cacheService.set(cacheKey, data, ttl).catch(err => {
            console.error(`Cache set error for key "${cacheKey}":`, err.message);
          });
        }

        // Call original json method
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error("Cache middleware error:", error.message);
      // On error, proceed without caching
      next();
    }
  };
};

/**
 * Invalidate cache patterns on mutations (POST/PUT/PATCH/DELETE)
 * @param {string[]} patterns - Array of cache key patterns to invalidate
 * @returns {Function} Express middleware
 */
const invalidateCache = (patterns = []) => {
  return async (req, res, next) => {
    // Only invalidate on mutation methods
    const mutationMethods = ["POST", "PUT", "PATCH", "DELETE"];
    if (!mutationMethods.includes(req.method)) {
      return next();
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to invalidate cache after successful response
    res.json = function (data) {
      // Only invalidate on successful responses (status < 400)
      if (res.statusCode < 400) {
        // Process patterns - replace placeholders with actual values
        const processedPatterns = patterns.map(pattern => {
          let processed = pattern;

          // Replace {firmId} placeholder
          if (req.firmId) {
            processed = processed.replace("{firmId}", req.firmId);
          }

          // Replace {userId} placeholder
          if (req.userID) {
            processed = processed.replace("{userId}", req.userID);
          }

          // Replace {id} placeholder (from req.params.id)
          if (req.params.id) {
            processed = processed.replace("{id}", req.params.id);
          }

          // Replace {_id} placeholder (from req.params._id)
          if (req.params._id) {
            processed = processed.replace("{_id}", req.params._id);
          }

          return processed;
        });

        // Invalidate cache patterns asynchronously
        Promise.all(processedPatterns.map(pattern => cacheService.delPattern(pattern)))
          .then(results => {
            const totalDeleted = results.reduce((sum, count) => sum + count, 0);
            console.log(`Cache invalidation: Deleted ${totalDeleted} keys for patterns:`, processedPatterns);
          })
          .catch(err => {
            console.error("Cache invalidation error:", err.message);
          });
      }

      // Call original json method
      return originalJson(data);
    };

    next();
  };
};

/**
 * Invalidate specific cache patterns
 * @param {Object} req - Express request
 * @param {string[]} patterns - Array of patterns to invalidate
 * @returns {Promise<number>} - Total number of keys deleted
 */
const invalidatePatterns = async (req, patterns) => {
  const processedPatterns = patterns.map(pattern => {
    let processed = pattern;

    if (req.firmId) {
      processed = processed.replace("{firmId}", req.firmId);
    }
    if (req.userID) {
      processed = processed.replace("{userId}", req.userID);
    }
    if (req.params.id) {
      processed = processed.replace("{id}", req.params.id);
    }
    if (req.params._id) {
      processed = processed.replace("{_id}", req.params._id);
    }

    return processed;
  });

  const results = await Promise.all(
    processedPatterns.map(pattern => cacheService.delPattern(pattern))
  );

  return results.reduce((sum, count) => sum + count, 0);
};

/**
 * Invalidate all dashboard caches for a firm
 * @param {string} firmId - Firm ID
 * @returns {Promise<number>} - Number of keys deleted
 */
const invalidateDashboardCache = async (firmId) => {
  const pattern = `dashboard:firm:${firmId}:*`;
  return await cacheService.delPattern(pattern);
};

/**
 * Invalidate all client caches for a firm
 * @param {string} firmId - Firm ID
 * @param {string} clientId - Optional specific client ID
 * @returns {Promise<number>} - Number of keys deleted
 */
const invalidateClientCache = async (firmId, clientId = null) => {
  const pattern = clientId
    ? `client:firm:${firmId}:${clientId}:*`
    : `client:firm:${firmId}:*`;
  return await cacheService.delPattern(pattern);
};

/**
 * Invalidate all case caches for a firm
 * @param {string} firmId - Firm ID
 * @param {string} caseId - Optional specific case ID
 * @returns {Promise<number>} - Number of keys deleted
 */
const invalidateCaseCache = async (firmId, caseId = null) => {
  const pattern = caseId
    ? `case:firm:${firmId}:${caseId}:*`
    : `case:firm:${firmId}:*`;
  return await cacheService.delPattern(pattern);
};

module.exports = {
  cacheResponse,
  invalidateCache,
  invalidatePatterns,
  invalidateDashboardCache,
  invalidateClientCache,
  invalidateCaseCache,
  keyGenerators
};
