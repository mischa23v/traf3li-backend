/**
 * Analytics Middleware - Automatic Event Tracking
 *
 * Middleware for automatically tracking page views, API endpoint usage,
 * and capturing timing metrics.
 *
 * Features:
 * - Automatic page view tracking
 * - API endpoint usage tracking
 * - Request timing metrics
 * - Error tracking
 */

const AnalyticsService = require('../services/analytics.service');
const logger = require('../utils/logger');

/**
 * Track page views automatically
 * Tracks page navigation from frontend
 */
const trackPageView = async (req, res, next) => {
    try {
        const page = req.body.page || req.query.page;
        const userId = req.userID || req.userId;
        const firmId = req.firmId;

        if (page && userId) {
            // Track asynchronously without blocking the request
            setImmediate(() => {
                AnalyticsService.trackPageView(
                    page,
                    userId,
                    firmId,
                    {
                        referrer: req.headers.referer || req.headers.referrer,
                        url: req.originalUrl,
                        userAgent: req.headers['user-agent'],
                        ip: req.ip || req.headers['x-forwarded-for']?.split(',')[0],
                        sessionId: req.sessionID
                    }
                ).catch(error => {
                    logger.error('Analytics.trackPageView failed:', error.message);
                });
            });
        }
    } catch (error) {
        logger.error('Analytics middleware error:', error.message);
    }
    next();
};

/**
 * Track API endpoint usage
 * Tracks all API calls with timing metrics
 */
const trackApiUsage = (req, res, next) => {
    const startTime = Date.now();

    // Capture response finish event
    res.on('finish', () => {
        try {
            const duration = Date.now() - startTime;
            const userId = req.userID || req.userId;
            const firmId = req.firmId;

            // Skip tracking for health checks and static assets
            const skipPaths = ['/health', '/ping', '/favicon.ico', '/robots.txt'];
            if (skipPaths.some(path => req.path.includes(path))) {
                return;
            }

            // Skip tracking for OPTIONS requests (CORS preflight)
            if (req.method === 'OPTIONS') {
                return;
            }

            // Track asynchronously without blocking
            setImmediate(() => {
                AnalyticsService.trackEvent(
                    'api_call',
                    `${req.method} ${req.path}`,
                    userId,
                    firmId,
                    {
                        duration,
                        success: res.statusCode >= 200 && res.statusCode < 400,
                        statusCode: res.statusCode
                    },
                    {
                        method: req.method,
                        endpoint: req.path,
                        url: req.originalUrl,
                        statusCode: res.statusCode,
                        userAgent: req.headers['user-agent'],
                        ip: req.ip || req.headers['x-forwarded-for']?.split(',')[0],
                        sessionId: req.sessionID
                    }
                ).catch(error => {
                    logger.debug('Analytics.trackApiUsage failed:', error.message);
                });
            });
        } catch (error) {
            logger.error('Analytics API tracking error:', error.message);
        }
    });

    next();
};

/**
 * Capture timing metrics
 * Adds request timing information to response headers
 */
const captureTimingMetrics = (req, res, next) => {
    req.startTime = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - req.startTime;

        // Add timing header (useful for debugging)
        res.setHeader('X-Response-Time', `${duration}ms`);

        // Log slow requests (> 1 second)
        if (duration > 1000) {
            logger.warn('Slow request detected', {
                method: req.method,
                path: req.path,
                duration: `${duration}ms`,
                userId: req.userID || req.userId,
                firmId: req.firmId
            });
        }
    });

    next();
};

/**
 * Track user actions
 * Middleware for tracking specific user actions
 */
const trackAction = (actionName) => {
    return async (req, res, next) => {
        try {
            const userId = req.userID || req.userId;
            const firmId = req.firmId;

            if (userId) {
                setImmediate(() => {
                    AnalyticsService.trackEvent(
                        'user_action',
                        actionName,
                        userId,
                        firmId,
                        {
                            method: req.method,
                            path: req.path
                        },
                        {
                            endpoint: req.path,
                            method: req.method,
                            userAgent: req.headers['user-agent'],
                            ip: req.ip || req.headers['x-forwarded-for']?.split(',')[0],
                            sessionId: req.sessionID
                        }
                    ).catch(error => {
                        logger.debug('Analytics.trackAction failed:', error.message);
                    });
                });
            }
        } catch (error) {
            logger.error('Analytics action tracking error:', error.message);
        }
        next();
    };
};

/**
 * Track feature usage
 * Middleware for tracking feature usage
 */
const trackFeature = (featureName) => {
    return async (req, res, next) => {
        try {
            const userId = req.userID || req.userId;
            const firmId = req.firmId;

            if (userId) {
                setImmediate(() => {
                    AnalyticsService.trackFeatureUsage(
                        featureName,
                        userId,
                        firmId,
                        {
                            method: req.method,
                            path: req.path
                        }
                    ).catch(error => {
                        logger.debug('Analytics.trackFeature failed:', error.message);
                    });
                });
            }
        } catch (error) {
            logger.error('Analytics feature tracking error:', error.message);
        }
        next();
    };
};

/**
 * Extract analytics metadata from request
 * Helper function to extract common metadata
 */
const extractMetadata = (req) => {
    return {
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.headers['x-forwarded-for']?.split(',')[0],
        referrer: req.headers.referer || req.headers.referrer,
        url: req.originalUrl,
        method: req.method,
        sessionId: req.sessionID,
        device: extractDeviceType(req.headers['user-agent']),
        browser: extractBrowser(req.headers['user-agent']),
        os: extractOS(req.headers['user-agent'])
    };
};

/**
 * Extract device type from user agent
 * @private
 */
const extractDeviceType = (userAgent = '') => {
    if (/mobile/i.test(userAgent)) return 'mobile';
    if (/tablet|ipad/i.test(userAgent)) return 'tablet';
    return 'desktop';
};

/**
 * Extract browser from user agent
 * @private
 */
const extractBrowser = (userAgent = '') => {
    if (/chrome/i.test(userAgent) && !/edge/i.test(userAgent)) return 'Chrome';
    if (/firefox/i.test(userAgent)) return 'Firefox';
    if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) return 'Safari';
    if (/edge/i.test(userAgent)) return 'Edge';
    if (/msie|trident/i.test(userAgent)) return 'IE';
    return 'Other';
};

/**
 * Extract OS from user agent
 * @private
 */
const extractOS = (userAgent = '') => {
    if (/windows/i.test(userAgent)) return 'Windows';
    if (/macintosh|mac os x/i.test(userAgent)) return 'macOS';
    if (/linux/i.test(userAgent)) return 'Linux';
    if (/android/i.test(userAgent)) return 'Android';
    if (/ios|iphone|ipad/i.test(userAgent)) return 'iOS';
    return 'Other';
};

module.exports = {
    trackPageView,
    trackApiUsage,
    captureTimingMetrics,
    trackAction,
    trackFeature,
    extractMetadata
};
