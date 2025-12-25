/**
 * Rate Limiting Service
 *
 * Provides comprehensive rate limiting functionality including:
 * - Basic rate limiting with Redis
 * - Tiered limits based on subscription
 * - Burst protection
 * - Adaptive rate limiting
 * - Usage analytics
 *
 * Uses Redis for distributed rate limiting across multiple server instances.
 */

const { getRedisClient } = require('../configs/redis');
const { getTierLimits, getEffectiveLimit, ADAPTIVE_CONFIG, WINDOWS } = require('../config/rateLimits');
const { Firm, User } = require('../models');
const logger = require('../utils/logger');

/**
 * Generate Redis key for rate limiting
 * @param {string} prefix - Key prefix
 * @param {string} identifier - User ID, IP, etc.
 * @param {string} window - Time window
 * @returns {string} Redis key
 */
const generateKey = (prefix, identifier, window = 'minute') => {
  const timestamp = Math.floor(Date.now() / (WINDOWS[window] * 1000));
  return `rate-limit:${prefix}:${identifier}:${window}:${timestamp}`;
};

/**
 * Generate stats key
 * @param {string} identifier - User ID, firm ID, etc.
 * @param {string} period - Period (hour, day, week, month)
 * @returns {string} Redis key
 */
const generateStatsKey = (identifier, period) => {
  return `rate-limit:stats:${identifier}:${period}`;
};

// ═══════════════════════════════════════════════════════════════
// CORE RATE LIMITING
// ═══════════════════════════════════════════════════════════════

/**
 * Check if rate limit is exceeded
 * @param {string} key - Rate limit key
 * @param {number} limit - Request limit
 * @param {number} window - Time window in seconds
 * @returns {Promise<object>} Limit check result
 */
const checkLimit = async (key, limit, window) => {
  try {
    const client = getRedisClient();
    const redisKey = `${key}:${Math.floor(Date.now() / (window * 1000))}`;

    // Get current count
    const current = await client.get(redisKey);
    const currentCount = current ? parseInt(current, 10) : 0;

    // Calculate remaining and reset time
    const remaining = Math.max(0, limit - currentCount);
    const resetTime = Math.ceil(Date.now() / (window * 1000)) * (window * 1000);

    return {
      allowed: currentCount < limit,
      current: currentCount,
      limit,
      remaining,
      resetTime,
      resetIn: Math.ceil((resetTime - Date.now()) / 1000), // seconds until reset
      exceeded: currentCount >= limit
    };
  } catch (error) {
    logger.error('Rate limiting checkLimit error:', error.message);
    // On error, allow the request (fail open)
    return {
      allowed: true,
      current: 0,
      limit,
      remaining: limit,
      resetTime: Date.now() + (window * 1000),
      resetIn: window,
      exceeded: false,
      error: true
    };
  }
};

/**
 * Increment rate limit counter
 * @param {string} key - Rate limit key
 * @param {number} window - Time window in seconds
 * @param {number} amount - Amount to increment (default: 1)
 * @returns {Promise<number>} New count
 */
const incrementCounter = async (key, window, amount = 1) => {
  try {
    const client = getRedisClient();
    const redisKey = `${key}:${Math.floor(Date.now() / (window * 1000))}`;

    // Increment counter
    const count = await client.incrby(redisKey, amount);

    // Set expiry if this is the first request in this window
    if (count === amount) {
      await client.expire(redisKey, window * 2); // 2x window for safety
    }

    return count;
  } catch (error) {
    logger.error('Rate limiting incrementCounter error:', error.message);
    return 0;
  }
};

/**
 * Get remaining requests
 * @param {string} key - Rate limit key
 * @param {number} limit - Request limit
 * @param {number} window - Time window in seconds
 * @returns {Promise<number>} Remaining requests
 */
const getRemaining = async (key, limit, window) => {
  const result = await checkLimit(key, limit, window);
  return result.remaining;
};

/**
 * Reset rate limit
 * @param {string} key - Rate limit key
 * @returns {Promise<boolean>} Success status
 */
const resetLimit = async (key) => {
  try {
    const client = getRedisClient();
    // Delete all keys matching the pattern
    const pattern = `${key}:*`;
    let cursor = '0';
    let deletedCount = 0;

    do {
      const [newCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = newCursor;

      if (keys.length > 0) {
        const deleted = await client.del(...keys);
        deletedCount += deleted;
      }
    } while (cursor !== '0');

    logger.info(`Rate limit reset for key: ${key}, deleted ${deletedCount} keys`);
    return true;
  } catch (error) {
    logger.error('Rate limiting resetLimit error:', error.message);
    return false;
  }
};

// ═══════════════════════════════════════════════════════════════
// TIERED RATE LIMITING
// ═══════════════════════════════════════════════════════════════

/**
 * Get rate limit for a specific tier and endpoint
 * @param {string} tier - Subscription tier
 * @param {string} endpoint - Endpoint path or category
 * @returns {object} Rate limits
 */
const getLimitForTier = (tier, endpoint = 'api') => {
  // Parse endpoint to determine category
  let category = 'api';
  let type = 'read';

  if (endpoint.includes('/auth/')) {
    category = 'auth';
    if (endpoint.includes('/login')) type = 'login';
    else if (endpoint.includes('/register')) type = 'register';
    else if (endpoint.includes('/password-reset')) type = 'passwordReset';
    else if (endpoint.includes('/mfa')) type = 'mfa';
  } else if (endpoint.includes('/upload')) {
    category = 'upload';
    type = 'document';
  } else if (endpoint.includes('/export')) {
    category = 'export';
    type = 'pdf';
  } else if (endpoint.includes('/search')) {
    category = 'search';
  } else if (endpoint.includes('/payment')) {
    category = 'payment';
  } else if (endpoint.includes('/admin')) {
    category = 'admin';
  }

  return getEffectiveLimit(tier, category, type);
};

/**
 * Get current limits for a user
 * @param {string} userId - User ID
 * @returns {Promise<object>} User's rate limits
 */
const getLimitForUser = async (userId) => {
  try {
    const user = await User.findById(userId).select('firmId role').lean();
    if (!user) {
      return getTierLimits('free');
    }

    // Get firm to determine tier
    const firm = await Firm.findById(user.firmId).select('subscription').lean();
    const tier = firm?.subscription?.plan || 'free';

    // Get tier limits
    const limits = getTierLimits(tier);

    // Add user-specific info
    return {
      ...limits,
      userId,
      tier,
      role: user.role
    };
  } catch (error) {
    logger.error('Rate limiting getLimitForUser error:', error.message);
    return getTierLimits('free');
  }
};

/**
 * Get current limits for a firm
 * @param {string} firmId - Firm ID
 * @returns {Promise<object>} Firm's rate limits
 */
const getLimitForFirm = async (firmId) => {
  try {
    const firm = await Firm.findById(firmId).select('subscription name').lean();
    if (!firm) {
      return getTierLimits('free');
    }

    const tier = firm.subscription?.plan || 'free';
    const limits = getTierLimits(tier);

    return {
      ...limits,
      firmId,
      firmName: firm.name,
      tier
    };
  } catch (error) {
    logger.error('Rate limiting getLimitForFirm error:', error.message);
    return getTierLimits('free');
  }
};

// ═══════════════════════════════════════════════════════════════
// BURST PROTECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Check burst limit
 * @param {string} key - Rate limit key
 * @param {number} burstLimit - Burst limit
 * @param {number} burstWindow - Burst window in seconds
 * @returns {Promise<object>} Burst check result
 */
const checkBurst = async (key, burstLimit, burstWindow = 10) => {
  const burstKey = `${key}:burst`;
  return await checkLimit(burstKey, burstLimit, burstWindow);
};

/**
 * Check if burst limit is exceeded
 * @param {string} key - Rate limit key
 * @returns {Promise<boolean>} True if exceeded
 */
const isBurstExceeded = async (key) => {
  try {
    const client = getRedisClient();
    const burstKey = `${key}:burst:${Math.floor(Date.now() / 10000)}`; // 10 second window

    const current = await client.get(burstKey);
    const currentCount = current ? parseInt(current, 10) : 0;

    // Default burst limit is 50 requests per 10 seconds
    return currentCount >= 50;
  } catch (error) {
    logger.error('Rate limiting isBurstExceeded error:', error.message);
    return false;
  }
};

/**
 * Increment burst counter
 * @param {string} key - Rate limit key
 * @param {number} burstWindow - Burst window in seconds
 * @returns {Promise<number>} New count
 */
const incrementBurst = async (key, burstWindow = 10) => {
  return await incrementCounter(`${key}:burst`, burstWindow);
};

// ═══════════════════════════════════════════════════════════════
// ADAPTIVE RATE LIMITING
// ═══════════════════════════════════════════════════════════════

/**
 * Adjust rate limit based on user behavior
 * @param {string} key - Rate limit key
 * @param {number} factor - Adjustment factor (e.g., 1.5 = increase by 50%, 0.7 = decrease by 30%)
 * @param {number} duration - Duration in seconds (default: 24 hours)
 * @returns {Promise<boolean>} Success status
 */
const adjustLimit = async (key, factor, duration = 86400) => {
  try {
    const client = getRedisClient();
    const adjustKey = `${key}:adjust`;

    // Store adjustment factor
    await client.setex(adjustKey, duration, factor.toString());

    logger.info(`Rate limit adjusted for key: ${key}, factor: ${factor}, duration: ${duration}s`);
    return true;
  } catch (error) {
    logger.error('Rate limiting adjustLimit error:', error.message);
    return false;
  }
};

/**
 * Get adaptive limit (with adjustment applied)
 * @param {string} key - Rate limit key
 * @param {number} baseLimit - Base limit
 * @returns {Promise<object>} Adaptive limit info
 */
const getAdaptiveLimit = async (key, baseLimit) => {
  try {
    const client = getRedisClient();
    const adjustKey = `${key}:adjust`;

    // Get adjustment factor
    const factor = await client.get(adjustKey);
    const adjustmentFactor = factor ? parseFloat(factor) : 1.0;

    const adaptiveLimit = Math.floor(baseLimit * adjustmentFactor);

    return {
      baseLimit,
      adjustmentFactor,
      adaptiveLimit,
      adjusted: adjustmentFactor !== 1.0
    };
  } catch (error) {
    logger.error('Rate limiting getAdaptiveLimit error:', error.message);
    return {
      baseLimit,
      adjustmentFactor: 1.0,
      adaptiveLimit: baseLimit,
      adjusted: false
    };
  }
};

/**
 * Analyze user behavior and apply adaptive limits
 * @param {string} userId - User ID
 * @returns {Promise<object>} Analysis result
 */
const analyzeAndAdaptLimit = async (userId) => {
  try {
    if (!ADAPTIVE_CONFIG.enabled) {
      return { adjusted: false, reason: 'Adaptive limiting disabled' };
    }

    const statsKey = generateStatsKey(userId, 'day');
    const client = getRedisClient();

    // Get usage stats
    const stats = await client.get(statsKey);
    if (!stats) {
      return { adjusted: false, reason: 'No stats available' };
    }

    const usage = JSON.parse(stats);
    const usagePercent = usage.limit > 0 ? usage.count / usage.limit : 0;

    // Check for good behavior (using less than threshold)
    if (usagePercent < ADAPTIVE_CONFIG.goodBehavior.threshold) {
      const key = `rate-limit:user:${userId}`;
      await adjustLimit(key, ADAPTIVE_CONFIG.goodBehavior.multiplier, ADAPTIVE_CONFIG.goodBehavior.duration);

      logger.info(`Adaptive limit increased for user ${userId} - good behavior (${(usagePercent * 100).toFixed(1)}% usage)`);
      return {
        adjusted: true,
        factor: ADAPTIVE_CONFIG.goodBehavior.multiplier,
        reason: 'Good behavior - limit increased',
        usagePercent
      };
    }

    // Check for suspicious behavior (consistently hitting limit)
    if (usagePercent > ADAPTIVE_CONFIG.suspiciousBehavior.threshold) {
      // Check violation count
      const violationKey = `rate-limit:violations:${userId}`;
      const violations = await client.incr(violationKey);
      await client.expire(violationKey, ADAPTIVE_CONFIG.suspiciousBehavior.duration);

      if (violations >= ADAPTIVE_CONFIG.suspiciousBehavior.minViolations) {
        const key = `rate-limit:user:${userId}`;
        await adjustLimit(key, ADAPTIVE_CONFIG.suspiciousBehavior.multiplier, ADAPTIVE_CONFIG.suspiciousBehavior.duration);

        logger.warn(`Adaptive limit decreased for user ${userId} - suspicious behavior (${violations} violations)`);
        return {
          adjusted: true,
          factor: ADAPTIVE_CONFIG.suspiciousBehavior.multiplier,
          reason: 'Suspicious behavior - limit decreased',
          violations,
          usagePercent
        };
      }
    }

    return { adjusted: false, reason: 'No adjustment needed', usagePercent };
  } catch (error) {
    logger.error('Rate limiting analyzeAndAdaptLimit error:', error.message);
    return { adjusted: false, error: error.message };
  }
};

// ═══════════════════════════════════════════════════════════════
// RATE LIMIT HEADERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get standard rate limit headers
 * @param {string} key - Rate limit key
 * @param {number} limit - Request limit
 * @param {number} window - Time window in seconds
 * @returns {Promise<object>} Headers object
 */
const getRateLimitHeaders = async (key, limit, window) => {
  const result = await checkLimit(key, limit, window);

  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.floor(result.resetTime / 1000).toString(), // Unix timestamp
    'X-RateLimit-Window': `${window}s`,
    'Retry-After': result.exceeded ? result.resetIn.toString() : undefined
  };
};

// ═══════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════

/**
 * Track request for analytics
 * @param {string} identifier - User ID, firm ID, etc.
 * @param {string} endpoint - Endpoint path
 * @param {boolean} throttled - Whether request was throttled
 * @returns {Promise<void>}
 */
const trackRequest = async (identifier, endpoint, throttled = false) => {
  try {
    const client = getRedisClient();
    const date = new Date();

    // Track hourly stats
    const hourKey = `rate-limit:analytics:${identifier}:hour:${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;
    await client.hincrby(hourKey, 'total', 1);
    if (throttled) {
      await client.hincrby(hourKey, 'throttled', 1);
    }
    await client.expire(hourKey, 7 * 24 * 60 * 60); // Keep for 7 days

    // Track daily stats
    const dayKey = `rate-limit:analytics:${identifier}:day:${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    await client.hincrby(dayKey, 'total', 1);
    if (throttled) {
      await client.hincrby(dayKey, 'throttled', 1);
    }
    await client.expire(dayKey, 30 * 24 * 60 * 60); // Keep for 30 days

    // Track endpoint usage
    const endpointKey = `rate-limit:analytics:${identifier}:endpoints`;
    await client.zincrby(endpointKey, 1, endpoint);
    await client.expire(endpointKey, 30 * 24 * 60 * 60);
  } catch (error) {
    // Don't fail the request if analytics tracking fails
    logger.error('Rate limiting trackRequest error:', error.message);
  }
};

/**
 * Get usage statistics
 * @param {string} identifier - User ID, firm ID, etc.
 * @param {string} period - Period (hour, day, week, month)
 * @returns {Promise<object>} Usage statistics
 */
const getUsageStats = async (identifier, period = 'day') => {
  try {
    const client = getRedisClient();
    const date = new Date();
    let key;

    switch (period) {
      case 'hour':
        key = `rate-limit:analytics:${identifier}:hour:${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;
        break;
      case 'day':
        key = `rate-limit:analytics:${identifier}:day:${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        break;
      default:
        key = `rate-limit:analytics:${identifier}:day:${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    }

    const stats = await client.hgetall(key);
    const total = parseInt(stats.total || '0', 10);
    const throttled = parseInt(stats.throttled || '0', 10);

    return {
      period,
      total,
      throttled,
      successful: total - throttled,
      throttleRate: total > 0 ? ((throttled / total) * 100).toFixed(2) : '0.00',
      timestamp: date.toISOString()
    };
  } catch (error) {
    logger.error('Rate limiting getUsageStats error:', error.message);
    return {
      period,
      total: 0,
      throttled: 0,
      successful: 0,
      throttleRate: '0.00',
      error: error.message
    };
  }
};

/**
 * Get top API users for a firm
 * @param {string} firmId - Firm ID
 * @param {string} period - Period (day, week, month)
 * @param {number} limit - Number of users to return
 * @returns {Promise<Array>} Top users
 */
const getTopUsers = async (firmId, period = 'day', limit = 10) => {
  try {
    const client = getRedisClient();

    // Get all firm members
    const firm = await Firm.findById(firmId).select('team').lean();
    if (!firm || !firm.team) {
      return [];
    }

    const userIds = firm.team.map(member => member.userId.toString());

    // Get usage for each user
    const usagePromises = userIds.map(async (userId) => {
      const stats = await getUsageStats(userId, period);
      return {
        userId,
        total: stats.total,
        throttled: stats.throttled
      };
    });

    const usageData = await Promise.all(usagePromises);

    // Sort by total requests and return top N
    return usageData
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  } catch (error) {
    logger.error('Rate limiting getTopUsers error:', error.message);
    return [];
  }
};

/**
 * Get throttled requests for a firm
 * @param {string} firmId - Firm ID
 * @param {string} period - Period (day, week, month)
 * @returns {Promise<object>} Throttled requests stats
 */
const getThrottledRequests = async (firmId, period = 'day') => {
  try {
    const client = getRedisClient();

    // Get all firm members
    const firm = await Firm.findById(firmId).select('team').lean();
    if (!firm || !firm.team) {
      return { total: 0, throttled: 0, users: [] };
    }

    const userIds = firm.team.map(member => member.userId.toString());

    // Get usage for each user
    const usagePromises = userIds.map(async (userId) => {
      const stats = await getUsageStats(userId, period);
      return {
        userId,
        total: stats.total,
        throttled: stats.throttled
      };
    });

    const usageData = await Promise.all(usagePromises);

    // Aggregate
    const aggregate = usageData.reduce((acc, user) => {
      acc.total += user.total;
      acc.throttled += user.throttled;
      if (user.throttled > 0) {
        acc.users.push(user);
      }
      return acc;
    }, { total: 0, throttled: 0, users: [] });

    aggregate.throttleRate = aggregate.total > 0
      ? ((aggregate.throttled / aggregate.total) * 100).toFixed(2)
      : '0.00';

    return aggregate;
  } catch (error) {
    logger.error('Rate limiting getThrottledRequests error:', error.message);
    return { total: 0, throttled: 0, users: [], error: error.message };
  }
};

/**
 * Get most used endpoints
 * @param {string} identifier - User ID or firm ID
 * @param {number} limit - Number of endpoints to return
 * @returns {Promise<Array>} Top endpoints
 */
const getTopEndpoints = async (identifier, limit = 10) => {
  try {
    const client = getRedisClient();
    const key = `rate-limit:analytics:${identifier}:endpoints`;

    // Get top endpoints from sorted set
    const endpoints = await client.zrevrange(key, 0, limit - 1, 'WITHSCORES');

    const result = [];
    for (let i = 0; i < endpoints.length; i += 2) {
      result.push({
        endpoint: endpoints[i],
        count: parseInt(endpoints[i + 1], 10)
      });
    }

    return result;
  } catch (error) {
    logger.error('Rate limiting getTopEndpoints error:', error.message);
    return [];
  }
};

module.exports = {
  // Core rate limiting
  checkLimit,
  incrementCounter,
  getRemaining,
  resetLimit,

  // Tiered rate limiting
  getLimitForTier,
  getLimitForUser,
  getLimitForFirm,

  // Burst protection
  checkBurst,
  isBurstExceeded,
  incrementBurst,

  // Adaptive rate limiting
  adjustLimit,
  getAdaptiveLimit,
  analyzeAndAdaptLimit,

  // Rate limit headers
  getRateLimitHeaders,

  // Analytics
  trackRequest,
  getUsageStats,
  getTopUsers,
  getThrottledRequests,
  getTopEndpoints
};
