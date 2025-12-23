/**
 * Metrics Routes
 *
 * Provides Prometheus-compatible metrics for monitoring:
 * - HTTP request count and latency
 * - Error rates
 * - System resource usage
 * - Database and cache metrics
 */

const express = require('express');
const authenticate = require('../middlewares/authenticate');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    checkDatabase,
    checkRedis,
    checkMemory,
    checkDiskSpace
} = require('../services/health.service');
const { getMetrics: getPerformanceMetrics, THRESHOLDS } = require('../middlewares/performance.middleware');
const os = require('os');

const router = express.Router();

// Apply rate limiting
router.use(apiRateLimiter);

// Metrics storage (in-memory)
// In production, consider using a proper metrics library like prom-client
let metrics = {
    httpRequestsTotal: 0,
    httpRequestsByStatus: {},
    httpRequestsByMethod: {},
    httpRequestDuration: [],
    errors: 0,
    activeConnections: 0,
    startTime: Date.now()
};

/**
 * Middleware to track HTTP metrics
 * Add this to your Express app to collect metrics
 */
const metricsMiddleware = (req, res, next) => {
    const startTime = Date.now();

    // Track request
    metrics.httpRequestsTotal++;
    metrics.httpRequestsByMethod[req.method] = (metrics.httpRequestsByMethod[req.method] || 0) + 1;
    metrics.activeConnections++;

    // Capture response
    const originalSend = res.send;
    res.send = function (data) {
        const duration = Date.now() - startTime;

        // Track by status code
        const statusCode = res.statusCode;
        metrics.httpRequestsByStatus[statusCode] = (metrics.httpRequestsByStatus[statusCode] || 0) + 1;

        // Track errors
        if (statusCode >= 400) {
            metrics.errors++;
        }

        // Track duration (keep last 1000 requests)
        metrics.httpRequestDuration.push({
            path: req.path,
            method: req.method,
            status: statusCode,
            duration
        });

        if (metrics.httpRequestDuration.length > 1000) {
            metrics.httpRequestDuration.shift();
        }

        metrics.activeConnections--;

        return originalSend.call(this, data);
    };

    next();
};

/**
 * GET /metrics
 * Returns Prometheus-format metrics
 * Protected endpoint - requires authentication
 */
router.get('/', authenticate, async (req, res) => {
    try {
        // Get current system metrics
        const [dbHealth, redisHealth, memory, disk] = await Promise.all([
            checkDatabase(),
            checkRedis(),
            Promise.resolve(checkMemory()),
            checkDiskSpace()
        ]);

        // Calculate uptime
        const uptimeSeconds = Math.floor(process.uptime());

        // Calculate request rate (requests per second)
        const runtimeSeconds = (Date.now() - metrics.startTime) / 1000;
        const requestRate = (metrics.httpRequestsTotal / runtimeSeconds).toFixed(2);

        // Calculate average latency
        const avgLatency = metrics.httpRequestDuration.length > 0
            ? (metrics.httpRequestDuration.reduce((sum, req) => sum + req.duration, 0) / metrics.httpRequestDuration.length).toFixed(2)
            : 0;

        // Calculate percentiles (p50, p95, p99)
        const sortedDurations = [...metrics.httpRequestDuration]
            .map(r => r.duration)
            .sort((a, b) => a - b);

        const p50 = percentile(sortedDurations, 50);
        const p95 = percentile(sortedDurations, 95);
        const p99 = percentile(sortedDurations, 99);

        // Error rate
        const errorRate = metrics.httpRequestsTotal > 0
            ? ((metrics.errors / metrics.httpRequestsTotal) * 100).toFixed(2)
            : 0;

        // Get CPU load
        const loadAverage = os.loadavg();
        const cpuUsage = process.cpuUsage();

        // Build Prometheus format metrics
        const prometheusMetrics = [];

        // Application info
        prometheusMetrics.push('# HELP app_info Application information');
        prometheusMetrics.push('# TYPE app_info gauge');
        prometheusMetrics.push(`app_info{version="${getVersion()}",node_version="${process.version}",platform="${process.platform}"} 1`);

        // Uptime
        prometheusMetrics.push('# HELP app_uptime_seconds Application uptime in seconds');
        prometheusMetrics.push('# TYPE app_uptime_seconds counter');
        prometheusMetrics.push(`app_uptime_seconds ${uptimeSeconds}`);

        // HTTP requests total
        prometheusMetrics.push('# HELP http_requests_total Total HTTP requests');
        prometheusMetrics.push('# TYPE http_requests_total counter');
        prometheusMetrics.push(`http_requests_total ${metrics.httpRequestsTotal}`);

        // HTTP requests by status
        prometheusMetrics.push('# HELP http_requests_by_status_total HTTP requests by status code');
        prometheusMetrics.push('# TYPE http_requests_by_status_total counter');
        Object.entries(metrics.httpRequestsByStatus).forEach(([status, count]) => {
            prometheusMetrics.push(`http_requests_by_status_total{status="${status}"} ${count}`);
        });

        // HTTP requests by method
        prometheusMetrics.push('# HELP http_requests_by_method_total HTTP requests by method');
        prometheusMetrics.push('# TYPE http_requests_by_method_total counter');
        Object.entries(metrics.httpRequestsByMethod).forEach(([method, count]) => {
            prometheusMetrics.push(`http_requests_by_method_total{method="${method}"} ${count}`);
        });

        // Request rate
        prometheusMetrics.push('# HELP http_requests_per_second Request rate');
        prometheusMetrics.push('# TYPE http_requests_per_second gauge');
        prometheusMetrics.push(`http_requests_per_second ${requestRate}`);

        // Latency metrics
        prometheusMetrics.push('# HELP http_request_duration_milliseconds HTTP request latency');
        prometheusMetrics.push('# TYPE http_request_duration_milliseconds summary');
        prometheusMetrics.push(`http_request_duration_milliseconds{quantile="0.5"} ${p50}`);
        prometheusMetrics.push(`http_request_duration_milliseconds{quantile="0.95"} ${p95}`);
        prometheusMetrics.push(`http_request_duration_milliseconds{quantile="0.99"} ${p99}`);
        prometheusMetrics.push(`http_request_duration_milliseconds_sum ${metrics.httpRequestDuration.reduce((sum, r) => sum + r.duration, 0)}`);
        prometheusMetrics.push(`http_request_duration_milliseconds_count ${metrics.httpRequestDuration.length}`);

        // Error metrics
        prometheusMetrics.push('# HELP http_errors_total Total HTTP errors (4xx and 5xx)');
        prometheusMetrics.push('# TYPE http_errors_total counter');
        prometheusMetrics.push(`http_errors_total ${metrics.errors}`);

        prometheusMetrics.push('# HELP http_error_rate Error rate percentage');
        prometheusMetrics.push('# TYPE http_error_rate gauge');
        prometheusMetrics.push(`http_error_rate ${errorRate}`);

        // Active connections
        prometheusMetrics.push('# HELP http_active_connections Currently active connections');
        prometheusMetrics.push('# TYPE http_active_connections gauge');
        prometheusMetrics.push(`http_active_connections ${metrics.activeConnections}`);

        // Database metrics
        prometheusMetrics.push('# HELP database_up Database availability (1 = up, 0 = down)');
        prometheusMetrics.push('# TYPE database_up gauge');
        prometheusMetrics.push(`database_up ${dbHealth.status === 'up' ? 1 : 0}`);

        if (dbHealth.latencyMs !== undefined) {
            prometheusMetrics.push('# HELP database_latency_milliseconds Database ping latency');
            prometheusMetrics.push('# TYPE database_latency_milliseconds gauge');
            prometheusMetrics.push(`database_latency_milliseconds ${dbHealth.latencyMs}`);
        }

        // Redis metrics
        prometheusMetrics.push('# HELP redis_up Redis availability (1 = up, 0 = down)');
        prometheusMetrics.push('# TYPE redis_up gauge');
        prometheusMetrics.push(`redis_up ${redisHealth.status === 'up' ? 1 : 0}`);

        if (redisHealth.latencyMs !== undefined) {
            prometheusMetrics.push('# HELP redis_latency_milliseconds Redis ping latency');
            prometheusMetrics.push('# TYPE redis_latency_milliseconds gauge');
            prometheusMetrics.push(`redis_latency_milliseconds ${redisHealth.latencyMs}`);
        }

        // Memory metrics
        const memUsage = process.memoryUsage();
        prometheusMetrics.push('# HELP process_memory_heap_used_bytes Process heap memory used');
        prometheusMetrics.push('# TYPE process_memory_heap_used_bytes gauge');
        prometheusMetrics.push(`process_memory_heap_used_bytes ${memUsage.heapUsed}`);

        prometheusMetrics.push('# HELP process_memory_heap_total_bytes Process heap memory total');
        prometheusMetrics.push('# TYPE process_memory_heap_total_bytes gauge');
        prometheusMetrics.push(`process_memory_heap_total_bytes ${memUsage.heapTotal}`);

        prometheusMetrics.push('# HELP process_memory_rss_bytes Process resident set size');
        prometheusMetrics.push('# TYPE process_memory_rss_bytes gauge');
        prometheusMetrics.push(`process_memory_rss_bytes ${memUsage.rss}`);

        // System memory
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        prometheusMetrics.push('# HELP system_memory_total_bytes Total system memory');
        prometheusMetrics.push('# TYPE system_memory_total_bytes gauge');
        prometheusMetrics.push(`system_memory_total_bytes ${totalMem}`);

        prometheusMetrics.push('# HELP system_memory_free_bytes Free system memory');
        prometheusMetrics.push('# TYPE system_memory_free_bytes gauge');
        prometheusMetrics.push(`system_memory_free_bytes ${freeMem}`);

        // CPU metrics
        prometheusMetrics.push('# HELP system_cpu_load_average System load average');
        prometheusMetrics.push('# TYPE system_cpu_load_average gauge');
        prometheusMetrics.push(`system_cpu_load_average{period="1m"} ${loadAverage[0]}`);
        prometheusMetrics.push(`system_cpu_load_average{period="5m"} ${loadAverage[1]}`);
        prometheusMetrics.push(`system_cpu_load_average{period="15m"} ${loadAverage[2]}`);

        prometheusMetrics.push('# HELP process_cpu_user_microseconds User CPU time');
        prometheusMetrics.push('# TYPE process_cpu_user_microseconds counter');
        prometheusMetrics.push(`process_cpu_user_microseconds ${cpuUsage.user}`);

        prometheusMetrics.push('# HELP process_cpu_system_microseconds System CPU time');
        prometheusMetrics.push('# TYPE process_cpu_system_microseconds counter');
        prometheusMetrics.push(`process_cpu_system_microseconds ${cpuUsage.system}`);

        // Send as plain text (Prometheus format)
        res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
        res.send(prometheusMetrics.join('\n') + '\n');
    } catch (error) {
        res.status(500).json({
            error: true,
            message: 'Failed to generate metrics',
            details: error.message
        });
    }
});

/**
 * GET /metrics/json
 * Returns metrics in JSON format (easier for custom dashboards)
 * Protected endpoint - requires authentication
 */
router.get('/json', authenticate, async (req, res) => {
    try {
        const [dbHealth, redisHealth, memory, disk] = await Promise.all([
            checkDatabase(),
            checkRedis(),
            Promise.resolve(checkMemory()),
            checkDiskSpace()
        ]);

        const uptimeSeconds = Math.floor(process.uptime());
        const runtimeSeconds = (Date.now() - metrics.startTime) / 1000;
        const requestRate = (metrics.httpRequestsTotal / runtimeSeconds).toFixed(2);

        const sortedDurations = [...metrics.httpRequestDuration]
            .map(r => r.duration)
            .sort((a, b) => a - b);

        const errorRate = metrics.httpRequestsTotal > 0
            ? ((metrics.errors / metrics.httpRequestsTotal) * 100).toFixed(2)
            : 0;

        res.json({
            timestamp: new Date().toISOString(),
            uptime: uptimeSeconds,
            http: {
                requestsTotal: metrics.httpRequestsTotal,
                requestRate: parseFloat(requestRate),
                errorRate: parseFloat(errorRate),
                errors: metrics.errors,
                activeConnections: metrics.activeConnections,
                byStatus: metrics.httpRequestsByStatus,
                byMethod: metrics.httpRequestsByMethod,
                latency: {
                    p50: percentile(sortedDurations, 50),
                    p95: percentile(sortedDurations, 95),
                    p99: percentile(sortedDurations, 99),
                    avg: sortedDurations.length > 0
                        ? (sortedDurations.reduce((sum, d) => sum + d, 0) / sortedDurations.length).toFixed(2)
                        : 0
                }
            },
            database: dbHealth,
            redis: redisHealth,
            memory,
            disk,
            system: {
                platform: process.platform,
                nodeVersion: process.version,
                cpuCores: os.cpus().length,
                loadAverage: os.loadavg().map(l => parseFloat(l.toFixed(2)))
            }
        });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: 'Failed to generate metrics',
            details: error.message
        });
    }
});

/**
 * GET /metrics/performance
 * Returns detailed API performance metrics
 * Tracks response times with target: < 300ms (per frontend requirements)
 * Protected endpoint - requires authentication
 */
router.get('/performance', authenticate, (req, res) => {
    try {
        const performanceMetrics = getPerformanceMetrics();

        res.json({
            success: true,
            data: {
                ...performanceMetrics,
                targets: {
                    description: 'Frontend performance targets',
                    backendApiTarget: `${THRESHOLDS.GOOD}ms`,
                    firstContentfulPaint: '< 1.8s',
                    timeToInteractive: '< 3.5s'
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: 'METRICS_ERROR',
                message: 'Failed to generate performance metrics',
                messageAr: 'فشل في إنشاء مقاييس الأداء'
            }
        });
    }
});

/**
 * POST /metrics/reset
 * Reset metrics counters (useful for testing)
 * Protected endpoint - requires authentication
 */
router.post('/reset', authenticate, (req, res) => {
    metrics = {
        httpRequestsTotal: 0,
        httpRequestsByStatus: {},
        httpRequestsByMethod: {},
        httpRequestDuration: [],
        errors: 0,
        activeConnections: 0,
        startTime: Date.now()
    };

    res.json({
        success: true,
        message: 'Metrics reset successfully'
    });
});

/**
 * Helper function to calculate percentile
 */
function percentile(sortedArray, p) {
    if (sortedArray.length === 0) return 0;

    const index = (p / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (lower === upper) {
        return sortedArray[lower];
    }

    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}

/**
 * Helper function to get app version
 */
function getVersion() {
    try {
        const packageJson = require('../../package.json');
        return packageJson.version || '1.0.0';
    } catch (error) {
        return '1.0.0';
    }
}

module.exports = router;
module.exports.metricsMiddleware = metricsMiddleware;
