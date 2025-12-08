/**
 * Performance Monitoring Middleware
 *
 * Tracks API response times and performance metrics.
 * Frontend targets (from documentation):
 * - First Contentful Paint: < 1.8s
 * - Time to Interactive: < 3.5s
 * - Backend APIs should respond within 300ms
 */

const logger = require('../utils/logger');
const AnalyticsService = require('../services/analytics.service');

// Performance thresholds (in ms)
const THRESHOLDS = {
    EXCELLENT: 100,    // < 100ms - Excellent
    GOOD: 300,         // < 300ms - Good (target)
    ACCEPTABLE: 1000,  // < 1s - Acceptable
    SLOW: 3000,        // < 3s - Slow
    // > 3s - Very Slow
};

// Performance metrics storage (in-memory for quick access)
const metrics = {
    totalRequests: 0,
    totalResponseTime: 0,
    slowRequests: 0,
    errorRequests: 0,
    byEndpoint: {},
    byStatusCode: {},
    recentRequests: [] // Last 100 requests for percentile calculation
};

const MAX_RECENT_REQUESTS = 100;

/**
 * Get performance rating based on response time
 * @param {number} duration - Response time in ms
 * @returns {string} Performance rating
 */
const getPerformanceRating = (duration) => {
    if (duration < THRESHOLDS.EXCELLENT) return 'excellent';
    if (duration < THRESHOLDS.GOOD) return 'good';
    if (duration < THRESHOLDS.ACCEPTABLE) return 'acceptable';
    if (duration < THRESHOLDS.SLOW) return 'slow';
    return 'very_slow';
};

/**
 * Calculate percentile from array of values
 * @param {number[]} values - Array of values
 * @param {number} percentile - Percentile to calculate (0-100)
 * @returns {number} Percentile value
 */
const calculatePercentile = (values, percentile) => {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
};

/**
 * Performance monitoring middleware
 * Tracks request duration and logs slow requests
 */
const performanceMiddleware = (req, res, next) => {
    // Skip static files and health checks
    const skipPaths = ['/health', '/favicon.ico', '/robots.txt'];
    if (skipPaths.some(path => req.path.startsWith(path))) {
        return next();
    }

    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage().heapUsed;

    // Store original end function
    const originalEnd = res.end;

    // Override end function to capture timing
    res.end = function (...args) {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1e6; // Convert to milliseconds
        const endMemory = process.memoryUsage().heapUsed;
        const memoryDelta = endMemory - startMemory;

        // Update metrics
        metrics.totalRequests++;
        metrics.totalResponseTime += duration;

        if (duration > THRESHOLDS.GOOD) {
            metrics.slowRequests++;
        }

        if (res.statusCode >= 400) {
            metrics.errorRequests++;
        }

        // Track by endpoint
        const endpoint = `${req.method} ${req.route?.path || req.path}`;
        if (!metrics.byEndpoint[endpoint]) {
            metrics.byEndpoint[endpoint] = {
                count: 0,
                totalTime: 0,
                minTime: Infinity,
                maxTime: 0,
                errors: 0
            };
        }
        metrics.byEndpoint[endpoint].count++;
        metrics.byEndpoint[endpoint].totalTime += duration;
        metrics.byEndpoint[endpoint].minTime = Math.min(metrics.byEndpoint[endpoint].minTime, duration);
        metrics.byEndpoint[endpoint].maxTime = Math.max(metrics.byEndpoint[endpoint].maxTime, duration);
        if (res.statusCode >= 400) {
            metrics.byEndpoint[endpoint].errors++;
        }

        // Track by status code
        const statusGroup = `${Math.floor(res.statusCode / 100)}xx`;
        metrics.byStatusCode[statusGroup] = (metrics.byStatusCode[statusGroup] || 0) + 1;

        // Add to recent requests for percentile calculation
        metrics.recentRequests.push(duration);
        if (metrics.recentRequests.length > MAX_RECENT_REQUESTS) {
            metrics.recentRequests.shift();
        }

        // Set response time header
        res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);

        // Log performance data
        const rating = getPerformanceRating(duration);
        const logData = {
            requestId: req.id,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration.toFixed(2)}ms`,
            rating,
            memoryDelta: `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`,
            userId: req.userID,
            firmId: req.firmId
        };

        // Log slow requests with warning
        if (rating === 'slow' || rating === 'very_slow') {
            logger.warn('Slow API response detected', logData);
        } else if (process.env.NODE_ENV !== 'production') {
            logger.debug('API performance', logData);
        }

        // Track with analytics service
        AnalyticsService.trackApiCall(
            req.route?.path || req.path,
            req.method,
            res.statusCode,
            duration,
            req
        );

        // Call original end
        return originalEnd.apply(this, args);
    };

    next();
};

/**
 * Get current performance metrics
 * @returns {Object} Performance metrics summary
 */
const getMetrics = () => {
    const avgResponseTime = metrics.totalRequests > 0
        ? metrics.totalResponseTime / metrics.totalRequests
        : 0;

    const p50 = calculatePercentile(metrics.recentRequests, 50);
    const p90 = calculatePercentile(metrics.recentRequests, 90);
    const p99 = calculatePercentile(metrics.recentRequests, 99);

    // Find slowest endpoints
    const slowestEndpoints = Object.entries(metrics.byEndpoint)
        .map(([endpoint, data]) => ({
            endpoint,
            avgTime: data.totalTime / data.count,
            maxTime: data.maxTime,
            count: data.count,
            errorRate: data.errors / data.count
        }))
        .sort((a, b) => b.avgTime - a.avgTime)
        .slice(0, 10);

    return {
        summary: {
            totalRequests: metrics.totalRequests,
            avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
            slowRequestsPercentage: metrics.totalRequests > 0
                ? `${((metrics.slowRequests / metrics.totalRequests) * 100).toFixed(2)}%`
                : '0%',
            errorRate: metrics.totalRequests > 0
                ? `${((metrics.errorRequests / metrics.totalRequests) * 100).toFixed(2)}%`
                : '0%'
        },
        percentiles: {
            p50: `${p50.toFixed(2)}ms`,
            p90: `${p90.toFixed(2)}ms`,
            p99: `${p99.toFixed(2)}ms`
        },
        thresholds: {
            target: `${THRESHOLDS.GOOD}ms`,
            meetsTarget: avgResponseTime <= THRESHOLDS.GOOD
        },
        byStatusCode: metrics.byStatusCode,
        slowestEndpoints,
        timestamp: new Date().toISOString()
    };
};

/**
 * Reset metrics (useful for testing or periodic resets)
 */
const resetMetrics = () => {
    metrics.totalRequests = 0;
    metrics.totalResponseTime = 0;
    metrics.slowRequests = 0;
    metrics.errorRequests = 0;
    metrics.byEndpoint = {};
    metrics.byStatusCode = {};
    metrics.recentRequests = [];
};

/**
 * Performance metrics endpoint handler
 * GET /api/metrics/performance
 */
const performanceMetricsHandler = (req, res) => {
    res.json({
        success: true,
        data: getMetrics()
    });
};

module.exports = performanceMiddleware;
module.exports.getMetrics = getMetrics;
module.exports.resetMetrics = resetMetrics;
module.exports.performanceMetricsHandler = performanceMetricsHandler;
module.exports.THRESHOLDS = THRESHOLDS;
