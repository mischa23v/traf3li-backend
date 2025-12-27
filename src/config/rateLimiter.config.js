/**
 * Rate Limiter Configuration
 *
 * Centralized rate limiting settings for different endpoint types.
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

// Try to use Redis if available, fallback to memory
let store;
try {
    const redis = require('../services/redis.service');
    if (redis && redis.client) {
        store = new RedisStore({
            sendCommand: (...args) => redis.client.sendCommand(args),
            prefix: 'rl:'
        });
    }
} catch (e) {
    // Redis not available, use memory store
    store = undefined;
}

/**
 * Create rate limiter with custom options
 */
const createLimiter = (options) => {
    return rateLimit({
        windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes default
        max: options.max || 100,
        message: {
            success: false,
            message: options.message || 'Too many requests, please try again later',
            retryAfter: Math.ceil((options.windowMs || 15 * 60 * 1000) / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        store: store,
        keyGenerator: options.keyGenerator || ((req) => {
            // Use user ID if authenticated, IP otherwise
            return req.userId || req.ip;
        }),
        skip: options.skip || (() => false),
        ...options
    });
};

/**
 * Pre-configured rate limiters
 */
const rateLimiters = {
    // Authentication endpoints - strict limits
    auth: createLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10, // 10 attempts per 15 minutes
        message: 'Too many authentication attempts, please try again in 15 minutes',
        keyGenerator: (req) => req.ip // Always use IP for auth
    }),

    // Login specifically - very strict
    login: createLimiter({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 5, // 5 attempts per hour
        message: 'Too many login attempts, please try again in 1 hour',
        keyGenerator: (req) => `login:${req.ip}:${req.body?.email || 'unknown'}`
    }),

    // Password reset - prevent enumeration
    passwordReset: createLimiter({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // 3 attempts per hour
        message: 'Too many password reset attempts',
        keyGenerator: (req) => req.ip
    }),

    // OTP verification
    otp: createLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 attempts per 15 minutes
        message: 'Too many verification attempts'
    }),

    // API endpoints - standard limits
    api: createLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000, // 1000 requests per 15 minutes
        message: 'API rate limit exceeded'
    }),

    // Search endpoints - prevent scraping
    search: createLimiter({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 30, // 30 searches per minute
        message: 'Too many search requests'
    }),

    // Export endpoints - prevent data exfiltration
    export: createLimiter({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10, // 10 exports per hour
        message: 'Too many export requests'
    }),

    // File upload
    upload: createLimiter({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 100, // 100 uploads per hour
        message: 'Too many file uploads'
    }),

    // Webhook endpoints - higher limits
    webhook: createLimiter({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 100, // 100 webhooks per minute per IP
        message: 'Webhook rate limit exceeded',
        keyGenerator: (req) => req.ip
    }),

    // Admin endpoints
    admin: createLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 500, // 500 requests per 15 minutes
        message: 'Admin rate limit exceeded'
    }),

    // Bulk operations
    bulk: createLimiter({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 20, // 20 bulk operations per hour
        message: 'Too many bulk operations'
    }),

    // Email sending
    email: createLimiter({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 50, // 50 emails per hour
        message: 'Email sending limit exceeded'
    }),

    // Report generation
    report: createLimiter({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 20, // 20 reports per hour
        message: 'Report generation limit exceeded'
    })
};

/**
 * Get rate limiter by name
 */
const getRateLimiter = (name) => {
    return rateLimiters[name] || rateLimiters.api;
};

/**
 * Apply rate limiter to specific routes pattern
 */
const applyRateLimiter = (app, pattern, limiterName) => {
    const limiter = getRateLimiter(limiterName);
    app.use(pattern, limiter);
};

module.exports = {
    createLimiter,
    rateLimiters,
    getRateLimiter,
    applyRateLimiter,
    // Export individual limiters for convenience
    authLimiter: rateLimiters.auth,
    loginLimiter: rateLimiters.login,
    apiLimiter: rateLimiters.api,
    searchLimiter: rateLimiters.search,
    exportLimiter: rateLimiters.export,
    webhookLimiter: rateLimiters.webhook
};
