/**
 * Enhanced Rate Limiter Middleware
 *
 * Provides comprehensive rate limiting with:
 * - Global rate limiting
 * - Per-endpoint rate limiting
 * - Per-user rate limiting
 * - Per-firm rate limiting
 * - Burst protection
 * - Tiered limits based on subscription
 * - Adaptive rate limiting
 * - Usage analytics
 *
 * Uses Redis for distributed rate limiting across multiple server instances.
 */

const logger = require('../utils/logger');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { getRedisClient, isRedisConnected } = require('../configs/redis');
const rateLimitingService = require('../services/rateLimiting.service');
const { getTierLimits, getEffectiveLimit } = require('../config/rateLimits');
const { User, Firm } = require('../models');
const jwt = require('jsonwebtoken');

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Extract user ID from JWT token without full authentication
 * This allows rate limiting to work correctly before auth middleware runs
 */
const extractUserIdFromToken = (req) => {
  try {
    // Check for token in cookies first
    let token = req.cookies?.accessToken;

    // If no token in cookies, check Authorization header
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return null;
    }

    // Verify and decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?._id || null;
  } catch (error) {
    // Token is invalid or expired - treat as unauthenticated for rate limiting
    return null;
  }
};

/**
 * Get user tier from database
 */
const getUserTier = async (userId) => {
  try {
    const user = await User.findById(userId).select('firmId').lean();
    if (!user || !user.firmId) return 'free';

    const firm = await Firm.findById(user.firmId).select('subscription').lean();
    return firm?.subscription?.plan || 'free';
  } catch (error) {
    return 'free';
  }
};

/**
 * Get firm tier from database
 */
const getFirmTier = async (firmId) => {
  try {
    const firm = await Firm.findById(firmId).select('subscription').lean();
    return firm?.subscription?.plan || 'free';
  } catch (error) {
    return 'free';
  }
};

// ═══════════════════════════════════════════════════════════════
// LEGACY RATE LIMITERS (for backward compatibility)
// ═══════════════════════════════════════════════════════════════

/**
 * Create rate limiter with Redis store
 * @param {object} options - Rate limit options
 * @returns {Function} - Express middleware
 */
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Max requests per window
    message: {
      success: false,
      error: 'طلبات كثيرة جداً - حاول مرة أخرى لاحقاً',
      error_en: 'Too many requests - Please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    handler: (req, res) => {
      // Track throttled request
      const userId = req.userID || req.user?._id || req._rateLimitUserId;
      if (userId) {
        rateLimitingService.trackRequest(userId.toString(), req.path, true).catch(() => {});
      }

      res.status(429).json(options.message || defaultOptions.message);
    },
  };

  const config = { ...defaultOptions, ...options };

  // Use Redis store if available
  try {
    const redisClient = getRedisClient();
    if (redisClient) {
      config.store = new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
        prefix: 'rate-limit:',
      });
      logger.info('Rate limiter: Using Redis store');
    } else {
      logger.warn('Rate limiter: Redis client not available, using memory store');
    }
  } catch (error) {
    logger.warn('Rate limiter: Failed to initialize Redis store, using memory store:', error.message);
  }

  return rateLimit(config);
};

// Legacy rate limiters
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: 'محاولات كثيرة جداً - حاول مرة أخرى بعد 15 دقيقة',
    error_en: 'Too many authentication attempts - Try again after 15 minutes',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
});

const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'طلبات كثيرة جداً - حاول مرة أخرى لاحقاً',
    error_en: 'Too many requests - Please try again later',
    code: 'API_RATE_LIMIT_EXCEEDED',
  },
});

const publicRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    success: false,
    error: 'طلبات كثيرة جداً',
    error_en: 'Too many requests',
    code: 'PUBLIC_RATE_LIMIT_EXCEEDED',
  },
});

const sensitiveRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    error: 'محاولات كثيرة جداً لهذا الإجراء الحساس - حاول مرة أخرى بعد ساعة',
    error_en: 'Too many attempts for this sensitive action - Try again after 1 hour',
    code: 'SENSITIVE_RATE_LIMIT_EXCEEDED',
  },
});

const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    error: 'عمليات رفع كثيرة جداً - حاول مرة أخرى لاحقاً',
    error_en: 'Too many uploads - Please try again later',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
  },
});

const paymentRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: 'محاولات دفع كثيرة جداً - حاول مرة أخرى لاحقاً',
    error_en: 'Too many payment attempts - Please try again later',
    code: 'PAYMENT_RATE_LIMIT_EXCEEDED',
  },
});

const searchRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: 'بحث كثير جداً - أبطئ قليلاً',
    error_en: 'Too many searches - Slow down',
    code: 'SEARCH_RATE_LIMIT_EXCEEDED',
  },
});

const authenticatedRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000,
  max: 400,
  keyGenerator: (req) => {
    return req.userID || req._rateLimitUserId || req.user?._id?.toString() || ipKeyGenerator(req);
  },
  skip: (req) => {
    return req.path === '/health' || req.path.startsWith('/health/');
  },
  message: {
    success: false,
    error: 'طلبات كثيرة جداً - حاول مرة أخرى بعد دقيقة',
    error_en: 'Too many requests - Please try again after 1 minute',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

const unauthenticatedRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: 'طلبات كثيرة جداً - حاول مرة أخرى بعد دقيقة',
    error_en: 'Too many requests - Please try again after 1 minute',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

const smartRateLimiter = (req, res, next) => {
  // Skip rate limiting for auth routes
  if (req.path.startsWith('/auth/') || req.path.startsWith('/api/auth/')) {
    return next();
  }

  const userId = req.userID || req.user?._id || extractUserIdFromToken(req);

  if (userId) {
    req._rateLimitUserId = userId;
    return authenticatedRateLimiter(req, res, next);
  }
  return unauthenticatedRateLimiter(req, res, next);
};

const slowDown = require('express-slow-down');

const speedLimiter = slowDown({
  windowMs: 1 * 60 * 1000,
  delayAfter: 200,
  delayMs: () => 200,
  maxDelayMs: 5000,
  skip: (req) => {
    return req.path === '/health' || req.path.startsWith('/health/');
  },
});

const userRateLimiter = (options = {}) => {
  return createRateLimiter({
    ...options,
    keyGenerator: (req) => {
      return req.user ? req.user._id.toString() : ipKeyGenerator(req);
    },
  });
};

const roleBasedRateLimiter = () => {
  return (req, res, next) => {
    const limits = {
      admin: 1000,
      lawyer: 500,
      client: 200,
      guest: 50,
    };

    const userRole = req.user?.role || 'guest';
    const maxRequests = limits[userRole];

    const limiter = createRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: maxRequests,
      keyGenerator: (req) => {
        return req.user ? req.user._id.toString() : ipKeyGenerator(req);
      },
    });

    return limiter(req, res, next);
  };
};

const checkRateLimit = async (userId, action, limit = 5, windowMs = 15 * 60 * 1000) => {
  try {
    return false;
  } catch (error) {
    logger.error('Rate limit check error:', error.message);
    return false;
  }
};

// ═══════════════════════════════════════════════════════════════
// ENHANCED RATE LIMITERS
// ═══════════════════════════════════════════════════════════════

/**
 * Global rate limiter middleware
 * Applies rate limits based on IP address
 */
const globalRateLimiter = async (req, res, next) => {
  try {
    // Skip health checks
    if (req.path === '/health' || req.path.startsWith('/health/')) {
      return next();
    }

    const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
    const key = `rate-limit:global:${ip}`;

    // Global limit: 1000 requests per minute
    const limit = 1000;
    const window = 60; // 1 minute

    const result = await rateLimitingService.checkLimit(key, limit, window);

    if (!result.allowed) {
      const headers = await rateLimitingService.getRateLimitHeaders(key, limit, window);
      Object.keys(headers).forEach(headerKey => {
        if (headers[headerKey]) {
          res.setHeader(headerKey, headers[headerKey]);
        }
      });

      return res.status(429).json({
        success: false,
        error: 'معدل الطلبات العالمي متجاوز - حاول مرة أخرى لاحقاً',
        error_en: 'Global rate limit exceeded - Please try again later',
        code: 'GLOBAL_RATE_LIMIT_EXCEEDED',
        resetIn: result.resetIn
      });
    }

    // Increment counter
    await rateLimitingService.incrementCounter(key, window);

    // Add headers
    const headers = await rateLimitingService.getRateLimitHeaders(key, limit, window);
    Object.keys(headers).forEach(headerKey => {
      if (headers[headerKey]) {
        res.setHeader(headerKey, headers[headerKey]);
      }
    });

    next();
  } catch (error) {
    logger.error('Global rate limiter error:', error.message);
    // On error, allow the request
    next();
  }
};

/**
 * Per-endpoint rate limiter middleware
 * Applies different limits based on endpoint category
 */
const endpointRateLimiter = (category = 'api', type = null) => {
  return async (req, res, next) => {
    try {
      const userId = req.userID || req.user?._id || extractUserIdFromToken(req);
      const identifier = userId ? userId.toString() : (req.ip || 'unknown');
      const key = `rate-limit:endpoint:${category}:${type || 'default'}:${identifier}`;

      // Get user's tier
      const tier = userId ? await getUserTier(userId) : 'free';

      // Get effective limit for this tier and endpoint
      const limits = getEffectiveLimit(tier, category, type);
      const limit = limits.requestsPerMinute;
      const window = 60; // 1 minute

      const result = await rateLimitingService.checkLimit(key, limit, window);

      if (!result.allowed) {
        // Track throttled request
        if (userId) {
          await rateLimitingService.trackRequest(identifier, req.path, true);
        }

        const headers = await rateLimitingService.getRateLimitHeaders(key, limit, window);
        Object.keys(headers).forEach(headerKey => {
          if (headers[headerKey]) {
            res.setHeader(headerKey, headers[headerKey]);
          }
        });

        return res.status(429).json({
          success: false,
          error: `حد معدل ${category} متجاوز - حاول مرة أخرى لاحقاً`,
          error_en: `${category} rate limit exceeded - Please try again later`,
          code: 'ENDPOINT_RATE_LIMIT_EXCEEDED',
          resetIn: result.resetIn,
          tier
        });
      }

      // Increment counter
      await rateLimitingService.incrementCounter(key, window);

      // Track request
      if (userId) {
        await rateLimitingService.trackRequest(identifier, req.path, false);
      }

      // Add headers
      const headers = await rateLimitingService.getRateLimitHeaders(key, limit, window);
      Object.keys(headers).forEach(headerKey => {
        if (headers[headerKey]) {
          res.setHeader(headerKey, headers[headerKey]);
        }
      });

      next();
    } catch (error) {
      logger.error('Endpoint rate limiter error:', error.message);
      // On error, allow the request
      next();
    }
  };
};

/**
 * Per-user rate limiter middleware
 * Applies tiered limits based on user's subscription
 */
const perUserRateLimiter = async (req, res, next) => {
  try {
    const userId = req.userID || req.user?._id || extractUserIdFromToken(req);

    if (!userId) {
      // If no user, skip (will be handled by global limiter)
      return next();
    }

    const key = `rate-limit:user:${userId}`;

    // Get user's tier and limits
    const tier = await getUserTier(userId);
    const tierLimits = getTierLimits(tier);

    // Check adaptive limit
    const adaptiveLimit = await rateLimitingService.getAdaptiveLimit(key, tierLimits.requestsPerMinute);
    const limit = adaptiveLimit.adaptiveLimit;
    const window = 60; // 1 minute

    const result = await rateLimitingService.checkLimit(key, limit, window);

    if (!result.allowed) {
      // Track throttled request
      await rateLimitingService.trackRequest(userId.toString(), req.path, true);

      const headers = await rateLimitingService.getRateLimitHeaders(key, limit, window);
      Object.keys(headers).forEach(headerKey => {
        if (headers[headerKey]) {
          res.setHeader(headerKey, headers[headerKey]);
        }
      });

      return res.status(429).json({
        success: false,
        error: 'حد معدل المستخدم متجاوز - حاول مرة أخرى لاحقاً',
        error_en: 'User rate limit exceeded - Please try again later',
        code: 'USER_RATE_LIMIT_EXCEEDED',
        resetIn: result.resetIn,
        tier,
        adaptive: adaptiveLimit.adjusted
      });
    }

    // Increment counter
    await rateLimitingService.incrementCounter(key, window);

    // Track request
    await rateLimitingService.trackRequest(userId.toString(), req.path, false);

    // Add headers
    const headers = await rateLimitingService.getRateLimitHeaders(key, limit, window);
    Object.keys(headers).forEach(headerKey => {
      if (headers[headerKey]) {
        res.setHeader(headerKey, headers[headerKey]);
      }
    });

    // Store tier info for later use
    req.rateLimitTier = tier;

    next();
  } catch (error) {
    logger.error('Per-user rate limiter error:', error.message);
    // On error, allow the request
    next();
  }
};

/**
 * Per-firm rate limiter middleware
 * Applies limits to entire firm
 */
const perFirmRateLimiter = async (req, res, next) => {
  try {
    const userId = req.userID || req.user?._id || extractUserIdFromToken(req);

    if (!userId) {
      return next();
    }

    // Get firm ID
    const user = await User.findById(userId).select('firmId').lean();
    if (!user || !user.firmId) {
      return next();
    }

    const firmId = user.firmId.toString();
    const key = `rate-limit:firm:${firmId}`;

    // Get firm's tier and limits
    const tier = await getFirmTier(firmId);
    const tierLimits = getTierLimits(tier);

    // Firm limit is 10x user limit (shared across all users)
    const limit = tierLimits.requestsPerMinute * 10;
    const window = 60; // 1 minute

    const result = await rateLimitingService.checkLimit(key, limit, window);

    if (!result.allowed) {
      const headers = await rateLimitingService.getRateLimitHeaders(key, limit, window);
      Object.keys(headers).forEach(headerKey => {
        if (headers[headerKey]) {
          res.setHeader(headerKey, headers[headerKey]);
        }
      });

      return res.status(429).json({
        success: false,
        error: 'حد معدل المكتب متجاوز - حاول مرة أخرى لاحقاً',
        error_en: 'Firm rate limit exceeded - Please try again later',
        code: 'FIRM_RATE_LIMIT_EXCEEDED',
        resetIn: result.resetIn,
        tier
      });
    }

    // Increment counter
    await rateLimitingService.incrementCounter(key, window);

    next();
  } catch (error) {
    logger.error('Per-firm rate limiter error:', error.message);
    // On error, allow the request
    next();
  }
};

/**
 * Burst protection middleware
 * Prevents rapid-fire requests
 */
const burstProtectionMiddleware = async (req, res, next) => {
  try {
    const userId = req.userID || req.user?._id || extractUserIdFromToken(req);
    const identifier = userId ? userId.toString() : (req.ip || 'unknown');
    const key = `rate-limit:burst:${identifier}`;

    // Get user's tier
    const tier = userId ? await getUserTier(userId) : 'free';
    const tierLimits = getTierLimits(tier);

    const burstLimit = tierLimits.burstLimit;
    const burstWindow = tierLimits.burstWindow;

    const result = await rateLimitingService.checkBurst(key, burstLimit, burstWindow);

    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        error: 'كثرة الطلبات السريعة - أبطئ قليلاً',
        error_en: 'Burst limit exceeded - Slow down',
        code: 'BURST_LIMIT_EXCEEDED',
        resetIn: result.resetIn
      });
    }

    // Increment burst counter
    await rateLimitingService.incrementBurst(key, burstWindow);

    next();
  } catch (error) {
    logger.error('Burst protection middleware error:', error.message);
    // On error, allow the request
    next();
  }
};

/**
 * Adaptive rate limiting middleware
 * Automatically adjusts limits based on user behavior
 */
const adaptiveRateLimiter = async (req, res, next) => {
  try {
    const userId = req.userID || req.user?._id || extractUserIdFromToken(req);

    if (!userId) {
      return next();
    }

    // Analyze and adapt limit (runs in background, doesn't block request)
    rateLimitingService.analyzeAndAdaptLimit(userId.toString()).catch(error => {
      logger.error('Adaptive rate limiter analysis error:', error.message);
    });

    next();
  } catch (error) {
    logger.error('Adaptive rate limiter error:', error.message);
    next();
  }
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // Legacy limiters (backward compatibility)
  authRateLimiter,
  apiRateLimiter,
  publicRateLimiter,
  sensitiveRateLimiter,
  uploadRateLimiter,
  paymentRateLimiter,
  searchRateLimiter,
  speedLimiter,
  smartRateLimiter,
  authenticatedRateLimiter,
  unauthenticatedRateLimiter,
  createRateLimiter,
  userRateLimiter,
  roleBasedRateLimiter,
  checkRateLimit,

  // Enhanced limiters
  globalRateLimiter,
  endpointRateLimiter,
  perUserRateLimiter,
  perFirmRateLimiter,
  burstProtectionMiddleware,
  adaptiveRateLimiter
};
