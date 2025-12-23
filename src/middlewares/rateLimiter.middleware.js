const logger = require('../utils/logger');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const MongoStore = require('rate-limit-mongo');

/**
 * Rate limiting middleware to prevent brute force and API abuse
 * 
 * Uses MongoDB to store rate limit data (shared across multiple server instances)
 * Falls back to memory store if MongoDB is not available
 */

/**
 * Create rate limiter with MongoDB store
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
      res.status(429).json(options.message || defaultOptions.message);
    },
  };

  const config = { ...defaultOptions, ...options };

  // Use MongoDB store if URI is available
  if (process.env.MONGODB_URI) {
    config.store = new MongoStore({
      uri: process.env.MONGODB_URI,
      collectionName: 'rateLimits',
      expireTimeMs: config.windowMs,
    });
  }

  return rateLimit(config);
};

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks while allowing reasonable login attempts
 *
 * 15 attempts per 15 minutes rationale:
 * - Allows users who mistype passwords a few times
 * - Still provides brute force protection (max 60 attempts/hour)
 * - skipSuccessfulRequests ensures successful logins don't count against limit
 */
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful logins against limit
  message: {
    success: false,
    error: 'محاولات كثيرة جداً - حاول مرة أخرى بعد 15 دقيقة',
    error_en: 'Too many authentication attempts - Try again after 15 minutes',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Moderate rate limiter for general API endpoints
 */
const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: {
    success: false,
    error: 'طلبات كثيرة جداً - حاول مرة أخرى لاحقاً',
    error_en: 'Too many requests - Please try again later',
    code: 'API_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Lenient rate limiter for public endpoints (browsing, search)
 */
const publicRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 minutes
  message: {
    success: false,
    error: 'طلبات كثيرة جداً',
    error_en: 'Too many requests',
    code: 'PUBLIC_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Very strict rate limiter for sensitive operations
 * (e.g., password reset, account deletion)
 */
const sensitiveRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: {
    success: false,
    error: 'محاولات كثيرة جداً لهذا الإجراء الحساس - حاول مرة أخرى بعد ساعة',
    error_en: 'Too many attempts for this sensitive action - Try again after 1 hour',
    code: 'SENSITIVE_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * File upload rate limiter
 */
const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: {
    success: false,
    error: 'عمليات رفع كثيرة جداً - حاول مرة أخرى لاحقاً',
    error_en: 'Too many uploads - Please try again later',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Payment rate limiter (prevent payment spam)
 */
const paymentRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 payment attempts per hour
  message: {
    success: false,
    error: 'محاولات دفع كثيرة جداً - حاول مرة أخرى لاحقاً',
    error_en: 'Too many payment attempts - Please try again later',
    code: 'PAYMENT_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Search rate limiter
 */
const searchRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: {
    success: false,
    error: 'بحث كثير جداً - أبطئ قليلاً',
    error_en: 'Too many searches - Slow down',
    code: 'SEARCH_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Custom rate limiter by user ID (for authenticated routes)
 * More accurate than IP-based limiting
 */
const userRateLimiter = (options = {}) => {
  return createRateLimiter({
    ...options,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise fall back to IP
      return req.user ? req.user._id.toString() : ipKeyGenerator(req);
    },
  });
};

/**
 * Dynamic rate limiter based on user role
 * Premium users get higher limits
 */
const roleBasedRateLimiter = () => {
  return (req, res, next) => {
    // Define limits per role
    const limits = {
      admin: 1000,      // Admins get highest limit
      lawyer: 500,      // Lawyers get high limit
      client: 200,      // Clients get moderate limit
      guest: 50,        // Unauthenticated get lowest
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

/**
 * Slow down middleware (increases delay with each request)
 * Alternative to hard rate limiting
 */
const slowDown = require('express-slow-down');

/**
 * Speed limiter - Progressive delay after threshold
 * Tuned for SPA usage patterns:
 * - Higher threshold (200 requests) before delays kick in
 * - Lower initial delay (200ms) for better UX
 * - Lower max delay (5s) to avoid blocking legitimate users
 */
const speedLimiter = slowDown({
  windowMs: 1 * 60 * 1000, // 1 minute window (matches rate limiter)
  delayAfter: 200, // Allow 200 requests per minute at full speed
  delayMs: () => 200, // Add 200ms delay per request after limit
  maxDelayMs: 5000, // Max delay of 5 seconds
  skip: (req) => {
    // Skip health checks
    return req.path === '/health' || req.path.startsWith('/health/');
  },
});

/**
 * Check if user has exceeded rate limit (for custom logic)
 */
const checkRateLimit = async (userId, action, limit = 5, windowMs = 15 * 60 * 1000) => {
  try {
    // This would query your rate limit store
    // Implementation depends on your rate limit storage
    // Return true if limit exceeded, false otherwise

    // Placeholder implementation
    return false;
  } catch (error) {
    logger.error('❌ Rate limit check error:', error.message);
    return false;
  }
};

/**
 * Authenticated user rate limiter
 * Uses user ID for authenticated requests, IP for unauthenticated
 * More fair than IP-only limiting for shared networks
 *
 * 400 req/min rationale for SPA:
 * - Page load: ~10-15 requests
 * - Navigation (3 pages/min): ~30 requests
 * - Background refreshes: ~10 requests
 * - Filters/actions: ~50 requests
 * - Buffer for complex operations: ~100 requests
 */
const authenticatedRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 400, // 400 requests per minute for authenticated users
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IP
    // _rateLimitUserId is set by smartRateLimiter from JWT extraction
    return req.userID || req._rateLimitUserId || req.user?._id?.toString() || ipKeyGenerator(req);
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path.startsWith('/health/');
  },
  message: {
    success: false,
    error: 'طلبات كثيرة جداً - حاول مرة أخرى بعد دقيقة',
    error_en: 'Too many requests - Please try again after 1 minute',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Unauthenticated rate limiter (stricter)
 * For public endpoints before authentication
 */
const unauthenticatedRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute for unauthenticated
  message: {
    success: false,
    error: 'طلبات كثيرة جداً - حاول مرة أخرى بعد دقيقة',
    error_en: 'Too many requests - Please try again after 1 minute',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Extract user ID from JWT token without full authentication
 * This allows rate limiting to work correctly before auth middleware runs
 */
const jwt = require('jsonwebtoken');

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
    // Don't log here to avoid noise - auth middleware will handle actual auth errors
    return null;
  }
};

/**
 * Smart rate limiter middleware
 * Applies different limits based on authentication status
 *
 * IMPORTANT: This extracts user ID from JWT BEFORE auth middleware runs,
 * so authenticated users get the correct (higher) rate limit even on first request.
 *
 * NOTE: We do NOT set req.userID here - that would interfere with session timeout
 * middleware which checks req.userID to determine if auth checks should run.
 * The rate limiter only needs the ID for its own key generation.
 *
 * SKIP: Auth routes are skipped because they have their own dedicated rate limiters
 * (authRateLimiter, sensitiveRateLimiter) that are more appropriate for login/register flows.
 */
const smartRateLimiter = (req, res, next) => {
  // Skip rate limiting for auth routes - they have their own dedicated limiters
  // This prevents double rate limiting on login/register/OTP endpoints
  if (req.path.startsWith('/auth/') || req.path.startsWith('/api/auth/')) {
    return next();
  }

  // Check if user is already authenticated (userID set by earlier middleware)
  // OR extract user ID from JWT token to determine auth status
  const userId = req.userID || req.user?._id || extractUserIdFromToken(req);

  if (userId) {
    // Store the extracted user ID for rate limiter key generation ONLY
    // Do NOT set req.userID - that's the auth middleware's job
    // Setting it here would cause sessionTimeout middleware to run auth checks
    // on unauthenticated routes like /login
    req._rateLimitUserId = userId;
    return authenticatedRateLimiter(req, res, next);
  }
  return unauthenticatedRateLimiter(req, res, next);
};

module.exports = {
  // Pre-configured limiters
  authRateLimiter,
  apiRateLimiter,
  publicRateLimiter,
  sensitiveRateLimiter,
  uploadRateLimiter,
  paymentRateLimiter,
  searchRateLimiter,
  speedLimiter,

  // Smart limiters (recommended)
  smartRateLimiter,
  authenticatedRateLimiter,
  unauthenticatedRateLimiter,

  // Custom limiters
  createRateLimiter,
  userRateLimiter,
  roleBasedRateLimiter,

  // Utilities
  checkRateLimit,
};
