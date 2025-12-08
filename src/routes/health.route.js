/**
 * Health Check Routes
 *
 * Provides multiple health check endpoints:
 * - Basic health check for load balancers
 * - Kubernetes liveness probe
 * - Kubernetes readiness probe
 * - Detailed health check (protected)
 */

const express = require('express');
const authenticate = require('../middlewares/authenticate');
const {
    performHealthCheck,
    checkDatabase,
    checkRedis,
    getSystemInfo
} = require('../services/health.service');

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
 * GET /health/ping
 * Simple ping endpoint for connectivity tests
 */
router.get('/ping', (req, res) => {
    res.status(200).json({
        message: 'pong',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
