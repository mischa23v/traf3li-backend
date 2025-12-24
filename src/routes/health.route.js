/**
 * Health Check Routes
 *
 * Provides multiple health check endpoints:
 * - GET /health - Basic health check for load balancers
 * - GET /health/live - Kubernetes liveness probe
 * - GET /health/ready - Kubernetes readiness probe
 * - GET /health/deep - Deep health check with all service checks (protected)
 * - GET /health/detailed - Comprehensive health check (protected)
 * - GET /health/ping - Simple ping endpoint
 * - GET /health/circuits - Circuit breaker status (protected)
 * - GET /health/cache - Cache performance stats (protected)
 */

const express = require('express');
const authenticate = require('../middlewares/authenticate');
const {
    performHealthCheck,
    checkDatabase,
    checkRedis,
    checkStripe,
    checkDiskSpace,
    checkMemory,
    getSystemInfo,
    measureDbLatency
} = require('../services/health.service');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /health
 * Basic health check endpoint for load balancers
 * Returns minimal response for quick health verification
 */
router.get('/', async (req, res) => {
    try {
        const uptime = Math.floor(process.uptime());

        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

/**
 * GET /health/live
 * Kubernetes liveness probe
 * Checks if the application is running
 * Returns 200 if app is alive, 503 if dead
 */
router.get('/live', async (req, res) => {
    try {
        // Simple check - if we can respond, we're alive
        const uptime = process.uptime();

        if (uptime > 0) {
            res.status(200).json({
                status: 'alive',
                timestamp: new Date().toISOString(),
                uptime: Math.floor(uptime)
            });
        } else {
            res.status(503).json({
                status: 'dead',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        res.status(503).json({
            status: 'dead',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

/**
 * GET /health/ready
 * Kubernetes readiness probe
 * Checks if the application is ready to serve traffic
 * Verifies critical dependencies (database, cache)
 */
router.get('/ready', async (req, res) => {
    try {
        // Check critical dependencies
        const [dbHealth, redisHealth] = await Promise.all([
            checkDatabase(),
            checkRedis()
        ]);

        const isReady = dbHealth.status === 'up' && redisHealth.status === 'up';

        if (isReady) {
            res.status(200).json({
                status: 'ready',
                timestamp: new Date().toISOString(),
                checks: {
                    database: dbHealth.status,
                    redis: redisHealth.status
                }
            });
        } else {
            res.status(503).json({
                status: 'not_ready',
                timestamp: new Date().toISOString(),
                checks: {
                    database: dbHealth.status,
                    redis: redisHealth.status
                },
                reason: 'Critical dependencies not available'
            });
        }
    } catch (error) {
        res.status(503).json({
            status: 'not_ready',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

/**
 * GET /health/detailed
 * Comprehensive health check with all system metrics
 * Protected endpoint - requires authentication
 */
router.get('/detailed', authenticate, async (req, res) => {
    try {
        // Perform comprehensive health check including external services
        const healthStatus = await performHealthCheck(true);
        const systemInfo = getSystemInfo();

        // Determine HTTP status based on health
        let httpStatus = 200;
        if (healthStatus.status === 'unhealthy') {
            httpStatus = 503;
        } else if (healthStatus.status === 'degraded') {
            httpStatus = 200; // Still operational, but degraded
        }

        res.status(httpStatus).json({
            ...healthStatus,
            system: systemInfo
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

/**
 * GET /health/deep
 * Deep health check with detailed service monitoring
 * Checks all dependencies: MongoDB, Redis, Stripe, disk, memory
 * Protected endpoint - requires authentication
 */
router.get('/deep', authenticate, async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
            services: {}
        };

        // Check MongoDB
        try {
            const dbHealth = await checkDatabase();
            health.services.mongodb = {
                status: dbHealth.status === 'up' ? 'healthy' : 'unhealthy',
                responseTime: dbHealth.responseTime || dbHealth.latencyMs,
                database: dbHealth.database,
                collections: dbHealth.collections
            };

            if (dbHealth.status !== 'up') {
                health.status = 'degraded';
                health.services.mongodb.error = dbHealth.message;
            }
        } catch (error) {
            health.services.mongodb = {
                status: 'unhealthy',
                error: error.message
            };
            health.status = 'degraded';
        }

        // Check Redis
        try {
            const redisHealth = await checkRedis();
            health.services.redis = {
                status: redisHealth.status === 'up' ? 'healthy' : 'unhealthy',
                responseTime: redisHealth.responseTime || redisHealth.latencyMs,
                version: redisHealth.version,
                memoryUsed: redisHealth.memoryUsed
            };

            if (redisHealth.status !== 'up') {
                health.status = 'degraded';
                health.services.redis.error = redisHealth.message;
            }
        } catch (error) {
            health.services.redis = {
                status: 'unhealthy',
                error: error.message
            };
            health.status = 'degraded';
        }

        // Check Stripe
        try {
            const stripeHealth = await checkStripe();
            health.services.stripe = {
                status: stripeHealth.status === 'up' ? 'healthy' :
                        stripeHealth.status === 'not_configured' ? 'not_configured' : 'unhealthy'
            };

            if (stripeHealth.status === 'up') {
                health.services.stripe.responseTime = stripeHealth.responseTime || stripeHealth.latencyMs;
            } else if (stripeHealth.status === 'down') {
                health.services.stripe.error = stripeHealth.message;
                // Don't mark as degraded for Stripe - it's optional
            }
        } catch (error) {
            health.services.stripe = {
                status: 'unhealthy',
                error: error.message
            };
        }

        // Check disk space
        try {
            const diskHealth = await checkDiskSpace();
            health.services.disk = {
                status: diskHealth.healthy ? 'healthy' : 'warning',
                total: diskHealth.total,
                free: diskHealth.free,
                used: diskHealth.used,
                usedPercent: diskHealth.usedPercent
            };

            if (!diskHealth.healthy) {
                health.status = 'degraded';
            }
        } catch (error) {
            health.services.disk = {
                status: 'unknown',
                error: error.message
            };
        }

        // Check memory
        try {
            const memoryHealth = checkMemory();
            const memUsage = process.memoryUsage();
            const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

            health.services.memory = {
                status: heapUsedPercent < 90 ? 'healthy' : 'warning',
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
                heapUsedPercent: heapUsedPercent.toFixed(2) + '%',
                systemTotal: memoryHealth.total,
                systemFree: memoryHealth.free,
                systemUsed: memoryHealth.used,
                systemUsedPercent: memoryHealth.usedPercent
            };

            if (heapUsedPercent >= 90) {
                health.status = 'degraded';
            }
        } catch (error) {
            health.services.memory = {
                status: 'unknown',
                error: error.message
            };
        }

        // Determine HTTP status code
        const statusCode = health.status === 'healthy' ? 200 :
                          health.status === 'degraded' ? 200 : 503;

        res.status(statusCode).json(health);
    } catch (error) {
        logger.error('Deep health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

/**
 * GET /health/ping
 * Simple ping endpoint for connectivity tests
 */
router.get('/ping', (req, res) => {
    res.status(200).json({
        message: 'pong',
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /health/circuits
 * Circuit breaker status for external services
 * Shows which services are healthy, degraded, or down
 */
router.get('/circuits', authenticate, async (req, res) => {
    try {
        const { getAllServicesHealth } = require('../utils/externalServiceWrapper');
        const { getAllStats } = require('../utils/circuitBreaker');

        const servicesHealth = getAllServicesHealth();
        const circuitStats = getAllStats();

        // Determine overall status
        const hasOpenCircuit = circuitStats.some(s => s?.state === 'open');
        const hasHalfOpenCircuit = circuitStats.some(s => s?.state === 'halfOpen');

        let overallStatus = 'healthy';
        if (hasOpenCircuit) {
            overallStatus = 'degraded';
        } else if (hasHalfOpenCircuit) {
            overallStatus = 'recovering';
        }

        res.status(200).json({
            status: overallStatus,
            timestamp: new Date().toISOString(),
            services: servicesHealth,
            circuits: circuitStats.filter(s => s !== null)
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

/**
 * GET /health/cache
 * Cache performance statistics
 * Shows hit rate, total requests, and cache type
 */
router.get('/cache', authenticate, async (req, res) => {
    try {
        const { getStats } = require('../services/cache.service');
        const stats = getStats();

        res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            cache: stats
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

/**
 * GET /health/debug-auth
 * Debug endpoint to see what cookies the server receives
 * Helps diagnose cookie/auth issues
 */
router.get('/debug-auth', (req, res) => {
    // Detect same-origin proxy (same logic as auth.controller.js)
    const origin = req.headers.origin || '';
    const referer = req.headers.referer || '';
    const forwardedHost = req.headers['x-forwarded-host'] || '';
    const vercelForwarded = req.headers['x-vercel-forwarded-for'] || '';

    // Multiple detection strategies
    const dashboardPattern = /dashboard\.traf3li\.com/i;
    let isSameOriginProxy = false;
    let detectionMethod = 'none';

    if (dashboardPattern.test(origin) || dashboardPattern.test(referer)) {
        isSameOriginProxy = true;
        detectionMethod = 'origin/referer pattern';
    } else if (vercelForwarded) {
        isSameOriginProxy = true;
        detectionMethod = 'x-vercel-forwarded-for';
    } else if (forwardedHost && origin) {
        try {
            const originHost = new URL(origin).host;
            if (originHost === forwardedHost) {
                isSameOriginProxy = true;
                detectionMethod = 'x-forwarded-host match';
            }
        } catch {
            // ignore
        }
    } else if (dashboardPattern.test(forwardedHost)) {
        isSameOriginProxy = true;
        detectionMethod = 'x-forwarded-host pattern';
    }

    const debugInfo = {
        timestamp: new Date().toISOString(),
        request: {
            origin: origin || 'none',
            referer: referer || 'none',
            host: req.headers.host,
            forwardedHost: forwardedHost || 'none',
            vercelForwarded: vercelForwarded || 'none',
            userAgent: (req.headers['user-agent'] || '').substring(0, 100)
        },
        proxy: {
            isSameOriginProxy,
            detectionMethod,
            willUseSameSiteLax: isSameOriginProxy,
            willSetDomain: !isSameOriginProxy && (origin.includes('traf3li.com'))
        },
        cookies: {
            rawHeader: req.headers.cookie ? 'present' : 'MISSING',
            rawLength: req.headers.cookie ? req.headers.cookie.length : 0,
            parsed: Object.keys(req.cookies || {}),
            hasAccessToken: !!req.cookies?.accessToken,
            hasCsrfToken: !!req.cookies?.['csrf-token'],
            // Don't expose actual token values for security
            accessTokenLength: req.cookies?.accessToken?.length || 0,
            csrfTokenLength: req.cookies?.['csrf-token']?.length || 0
        },
        server: {
            nodeEnv: process.env.NODE_ENV,
            isRender: process.env.RENDER === 'true',
            note: isSameOriginProxy
                ? 'Same-origin proxy detected - using SameSite=Lax, no domain'
                : 'Cross-origin - using SameSite=None, domain=.traf3li.com'
        }
    };

    // Log for server-side debugging
    logger.info('[DEBUG-AUTH]', JSON.stringify(debugInfo, null, 2));

    res.status(200).json(debugInfo);
});

module.exports = router;
