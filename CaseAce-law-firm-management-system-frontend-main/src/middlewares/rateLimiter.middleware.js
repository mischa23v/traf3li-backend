const rateLimit = require('express-rate-limit');
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
 * Prevents brute force attacks
 */
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: false, // Count all requests
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
      return req.user ? req.user._id.toString() : req.ip;
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
        return req.user ? req.user._id.toString() : req.ip;
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

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per 15 min at full speed
  delayMs: 500, // Add 500ms delay per request after limit
  maxDelayMs: 20000, // Max delay of 20 seconds
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
    console.error('❌ Rate limit check error:', error.message);
    return false;
  }
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
  
  // Custom limiters
  createRateLimiter,
  userRateLimiter,
  roleBasedRateLimiter,
  
  // Utilities
  checkRateLimit,
};
