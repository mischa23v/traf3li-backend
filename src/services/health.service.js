/**
 * Health Check Service
 *
 * Provides comprehensive system health monitoring including:
 * - Database connectivity and performance
 * - Redis connectivity and performance
 * - System resources (memory, disk, CPU)
 * - External service connectivity (S3, Stripe)
 */

const mongoose = require('mongoose');
const { getRedisClient, isRedisConnected } = require('../configs/redis');
const { isS3Configured, s3Client, BUCKETS } = require('../configs/s3');
const { HeadBucketCommand } = require('@aws-sdk/client-s3');
const malwareScanService = require('./malwareScan.service');
const os = require('os');
const fs = require('fs').promises;

/**
 * Check MongoDB database health
 * @returns {Promise<Object>} Database health status
 */
const checkDatabase = async () => {
    try {
        const startTime = Date.now();

        // Check connection state
        if (mongoose.connection.readyState !== 1) {
            return {
                status: 'down',
                message: 'Database not connected',
                readyState: mongoose.connection.readyState
            };
        }

        // Ping database to check latency
        await mongoose.connection.db.admin().ping();
        const latency = Date.now() - startTime;

        // Get database stats
        const stats = await mongoose.connection.db.stats();

        return {
            status: 'up',
            latency: `${latency}ms`,
            latencyMs: latency,
            database: mongoose.connection.db.databaseName,
            collections: stats.collections,
            dataSize: formatBytes(stats.dataSize),
            indexSize: formatBytes(stats.indexSize),
            healthy: latency < 1000 // Warn if latency > 1s
        };
    } catch (error) {
        return {
            status: 'down',
            message: error.message,
            healthy: false
        };
    }
};

/**
 * Check Redis cache health
 * @returns {Promise<Object>} Redis health status
 */
const checkRedis = async () => {
    try {
        const startTime = Date.now();

        // Check if connected
        if (!isRedisConnected()) {
            return {
                status: 'down',
                message: 'Redis not connected',
                healthy: false
            };
        }

        const client = getRedisClient();

        // Ping Redis to check latency
        await client.ping();
        const latency = Date.now() - startTime;

        // Get Redis info
        const info = await client.info('server');
        const memoryInfo = await client.info('memory');

        // Parse Redis version
        const versionMatch = info.match(/redis_version:(\S+)/);
        const version = versionMatch ? versionMatch[1] : 'unknown';

        // Parse memory usage
        const memoryMatch = memoryInfo.match(/used_memory_human:(\S+)/);
        const memoryUsed = memoryMatch ? memoryMatch[1] : 'unknown';

        return {
            status: 'up',
            latency: `${latency}ms`,
            latencyMs: latency,
            version,
            memoryUsed,
            healthy: latency < 500 // Warn if latency > 500ms
        };
    } catch (error) {
        return {
            status: 'down',
            message: error.message,
            healthy: false
        };
    }
};

/**
 * Check disk space
 * @returns {Promise<Object>} Disk space status
 */
const checkDiskSpace = async () => {
    try {
        // For Linux/Unix systems, check root partition
        const stats = await fs.statfs('/');

        const totalSpace = stats.blocks * stats.bsize;
        const freeSpace = stats.bfree * stats.bsize;
        const usedSpace = totalSpace - freeSpace;
        const usedPercent = ((usedSpace / totalSpace) * 100).toFixed(2);

        return {
            status: 'up',
            total: formatBytes(totalSpace),
            free: formatBytes(freeSpace),
            used: formatBytes(usedSpace),
            usedPercent: `${usedPercent}%`,
            healthy: usedPercent < 90 // Warn if > 90% used
        };
    } catch (error) {
        return {
            status: 'unknown',
            message: error.message,
            healthy: true // Don't fail health check on disk monitoring error
        };
    }
};

/**
 * Check memory usage
 * @returns {Object} Memory usage status
 */
const checkMemory = () => {
    try {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const usedPercent = ((usedMemory / totalMemory) * 100).toFixed(2);

        // Process memory usage
        const processMemory = process.memoryUsage();

        return {
            status: 'up',
            total: formatBytes(totalMemory),
            free: formatBytes(freeMemory),
            used: formatBytes(usedMemory),
            usedPercent: `${usedPercent}%`,
            process: {
                heapUsed: formatBytes(processMemory.heapUsed),
                heapTotal: formatBytes(processMemory.heapTotal),
                rss: formatBytes(processMemory.rss),
                external: formatBytes(processMemory.external)
            },
            healthy: usedPercent < 90 // Warn if > 90% used
        };
    } catch (error) {
        return {
            status: 'unknown',
            message: error.message,
            healthy: true
        };
    }
};

/**
 * Check ClamAV malware scanning service
 * @returns {Promise<Object>} ClamAV health status
 */
const checkMalwareScan = async () => {
    try {
        const status = await malwareScanService.getStatus();

        return {
            status: status.healthy ? 'up' : status.enabled ? 'down' : 'disabled',
            enabled: status.enabled,
            healthy: status.healthy || !status.enabled, // Not unhealthy if disabled
            version: status.version,
            initialized: status.initialized,
            config: status.config,
            error: status.error,
            environment: status.environment
        };
    } catch (error) {
        return {
            status: 'unknown',
            message: error.message,
            healthy: false
        };
    }
};

/**
 * Check external services (S3, Stripe, ClamAV)
 * @returns {Promise<Object>} External services status
 */
const checkExternalServices = async () => {
    const services = {};

    // Check S3
    try {
        if (isS3Configured() && s3Client) {
            const startTime = Date.now();

            // Try to head the main bucket
            const command = new HeadBucketCommand({
                Bucket: BUCKETS.general
            });
            await s3Client.send(command);

            const latency = Date.now() - startTime;

            services.s3 = {
                status: 'up',
                latency: `${latency}ms`,
                bucket: BUCKETS.general,
                healthy: true
            };
        } else {
            services.s3 = {
                status: 'not_configured',
                message: 'S3 is not configured',
                healthy: true // Not critical for app
            };
        }
    } catch (error) {
        services.s3 = {
            status: 'down',
            message: error.message,
            healthy: false
        };
    }

    // Check Stripe
    try {
        if (process.env.STRIPE_SECRET_KEY) {
            // Just verify the key is set, don't make actual API calls
            services.stripe = {
                status: 'configured',
                healthy: true
            };
        } else {
            services.stripe = {
                status: 'not_configured',
                healthy: true // Not critical for app
            };
        }
    } catch (error) {
        services.stripe = {
            status: 'unknown',
            message: error.message,
            healthy: true
        };
    }

    // Check ClamAV malware scanning
    services.malwareScan = await checkMalwareScan();

    return services;
};

/**
 * Get system information
 * @returns {Object} System information
 */
const getSystemInfo = () => {
    try {
        return {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            hostname: os.hostname(),
            uptime: formatUptime(process.uptime()),
            uptimeSeconds: Math.floor(process.uptime()),
            cpuCores: os.cpus().length,
            cpuModel: os.cpus()[0]?.model || 'unknown',
            loadAverage: os.loadavg().map(load => load.toFixed(2)),
            pid: process.pid,
            environment: process.env.NODE_ENV || 'development'
        };
    } catch (error) {
        return {
            error: error.message
        };
    }
};

/**
 * Get application version from package.json
 * @returns {string} Application version
 */
const getAppVersion = () => {
    try {
        const packageJson = require('../../package.json');
        return packageJson.version || '1.0.0';
    } catch (error) {
        return '1.0.0';
    }
};

/**
 * Perform comprehensive health check
 * @returns {Promise<Object>} Complete health status
 */
const performHealthCheck = async (includeExternal = false) => {
    const checks = {
        database: await checkDatabase(),
        redis: await checkRedis(),
        disk: await checkDiskSpace(),
        memory: checkMemory()
    };

    // Include external services only in detailed check
    if (includeExternal) {
        checks.externalServices = await checkExternalServices();
    }

    // Determine overall health status
    const allHealthy = Object.values(checks).every(check => {
        if (check.healthy !== undefined) {
            return check.healthy;
        }
        // For external services, check nested services
        if (typeof check === 'object' && !Array.isArray(check)) {
            return Object.values(check).every(service =>
                service.healthy !== undefined ? service.healthy : true
            );
        }
        return true;
    });

    const criticalDown = checks.database.status === 'down' || checks.redis.status === 'down';

    let overallStatus = 'healthy';
    if (criticalDown) {
        overallStatus = 'unhealthy';
    } else if (!allHealthy) {
        overallStatus = 'degraded';
    }

    return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        version: getAppVersion(),
        uptime: Math.floor(process.uptime()),
        checks
    };
};

/**
 * Helper function to format bytes to human readable format
 * @param {number} bytes - Bytes to format
 * @returns {string} Formatted string
 */
const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Helper function to format uptime to human readable format
 * @param {number} seconds - Uptime in seconds
 * @returns {string} Formatted uptime
 */
const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
};

module.exports = {
    checkDatabase,
    checkRedis,
    checkDiskSpace,
    checkMemory,
    checkMalwareScan,
    checkExternalServices,
    getSystemInfo,
    getAppVersion,
    performHealthCheck
};
